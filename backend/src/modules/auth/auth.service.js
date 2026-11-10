import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/token.js';
import { ROLES } from '../../config/constants.js';
import { recordLogin } from '../../services/userActivity.js';
import env from '../../config/env.js';
import { queueAdminMail, queueMail, mailUser } from '../../services/mail/index.js';
import { OTP_MINUTES, RESET_MINUTES, checkOtp, consumeResetToken, issueOtp, issueResetToken } from '../../services/authCodes.js';

// Per-account lockout: too many wrong passwords in a row pauses sign-in for a while, whatever the IP.
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map();
const lockedFor = (email) => {
  const row = fails.get(email);
  if (!row || row.until <= Date.now()) return 0;
  return Math.ceil((row.until - Date.now()) / 60000);
};
const recordFail = (email) => {
  const row = fails.get(email) || { count: 0, until: 0 };
  row.count = row.until && row.until <= Date.now() ? 1 : row.count + 1;
  if (row.count >= MAX_FAILS) row.until = Date.now() + LOCK_MS;
  fails.set(email, row);
};

const PORTAL_ROLE = { admin: ROLES.ADMIN, teacher: ROLES.TEACHER, student: ROLES.STUDENT };

// Sends a fresh verification code. In development without an email key the code is printed to the server console.
async function sendOtp(user) {
  const code = await issueOtp(user);
  if (!env.mailEnabled && !env.isProd) console.log(`[dev] Email verification code for ${user.email}: ${code}`);
  const result = await mailUser(user, 'verifyOtp', { code, minutes: OTP_MINUTES }, { force: true });
  if (!result.ok && !result.skipped) throw new ApiError(502, 'We could not send the verification email. Please try again in a moment.');
  if (result.skipped && env.isProd) throw new ApiError(503, 'Email service is not configured. Please contact support.');
}

// New accounts must prove they own the email address before they can sign in.
export async function registerStudent(payload) {
  const email = payload.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing && existing.emailVerified !== false) throw ApiError.conflict('An account with this email already exists');
  // An abandoned, unverified sign up can be retried with the same email: the details are refreshed.
  const user = existing || new User();
  Object.assign(user, { name: payload.name, email, phone: payload.phone, password: payload.password, role: ROLES.STUDENT, status: 'pending', emailVerified: false });
  await user.save();
  await sendOtp(user);
  return { email: user.email, minutes: OTP_MINUTES };
}

export async function resendOtp(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Same answer whether or not the account exists, so this cannot be used to look up emails.
  if (user && user.role === ROLES.STUDENT && user.emailVerified === false) await sendOtp(user);
  return { sent: true };
}

export async function verifyEmail({ email, code }, meta = {}) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.role !== ROLES.STUDENT) throw ApiError.badRequest('Incorrect code. Please check and try again.');
  if (user.emailVerified !== false) throw ApiError.conflict('This email is already verified. Please sign in.');
  await checkOtp(user, code);
  user.emailVerified = true;
  if (user.status === 'pending') user.status = 'active'; // verifying the email is all the approval a student needs
  user.lastActiveAt = new Date();
  await user.save();
  await recordLogin(user, 'student', meta);
  queueMail(user, 'studentWelcome');
  queueAdminMail('adminNewStudent', { id: user.id, name: user.name, email: user.email, phone: user.phone, studentCode: user.studentCode, at: new Date() });
  return { user, token: signToken(user) };
}

// Students and admins only (teachers are reset by an admin). Always answers the same way so it cannot be used to discover which emails have accounts.
const RESETTABLE = [ROLES.STUDENT, ROLES.ADMIN];
const resetBase = (role) => (role === ROLES.ADMIN ? env.adminUrl : env.siteUrl);
export async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && RESETTABLE.includes(user.role) && user.status !== 'inactive') {
    const token = await issueResetToken(user);
    if (token) {
      const link = `${resetBase(user.role)}/reset-password?token=${token}`;
      if (!env.mailEnabled && !env.isProd) console.log(`[dev] Password reset link for ${user.email}: ${link}`);
      queueMail(user, 'passwordReset', { link, minutes: RESET_MINUTES });
    }
  }
  return { sent: true };
}

export async function resetPassword({ token, password }) {
  const userId = await consumeResetToken(token);
  const user = await User.findById(userId).select('+password');
  if (!user || !RESETTABLE.includes(user.role)) throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  user.password = password;
  user.mustChangePassword = false;
  if (user.role === ROLES.STUDENT) user.emailVerified = true; // they just proved they own the mailbox
  await user.save();
  queueMail(user, 'passwordChanged');
  return { reset: true };
}

export async function login({ email, password, portal }, meta = {}) {
  const key = email.toLowerCase();
  const wait = lockedFor(key);
  if (wait) throw new ApiError(429, `Too many failed attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.`);
  const user = await User.findOne({ email: key }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    recordFail(key);
    throw ApiError.unauthorized('Invalid email or password');
  }
  fails.delete(key);
  if (user.status === 'inactive') throw ApiError.forbidden('Your account is deactivated. Contact support.');
  if (user.role === ROLES.STUDENT && user.emailVerified === false) {
    throw new ApiError(403, 'Please verify your email address to sign in.', [{ field: 'email', code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address to sign in.' }]);
  }
  if (portal && PORTAL_ROLE[portal] !== user.role) {
    throw ApiError.forbidden(`This account cannot sign in to the ${portal} portal`);
  }
  if (user.role === ROLES.TEACHER && user.status === 'pending') throw ApiError.forbidden('Your teacher account is awaiting approval');

  user.lastActiveAt = new Date();
  await user.save();
  await recordLogin(user, portal || user.role, meta);
  return { user, token: signToken(user) };
}

export async function updateProfile(user, payload) {
  const { teacher, ...base } = payload;
  Object.assign(user, base);

  if (teacher && user.role === ROLES.TEACHER) {
    const { bank, social, ...rest } = teacher;
    user.teacher = user.teacher || {};
    Object.entries(rest).forEach(([key, value]) => {
      user.teacher[key] = value;
    });
    if (bank) Object.entries(bank).forEach(([key, value]) => (user.teacher.bank[key] = value));
    if (social) Object.entries(social).forEach(([key, value]) => (user.teacher.social[key] = value));
    user.markModified('teacher');
  }
  await user.save();
  return user;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
}
