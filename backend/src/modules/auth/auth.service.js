import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/token.js';
import { ROLES } from '../../config/constants.js';
import { recordLogin } from '../../services/userActivity.js';

const PORTAL_ROLE = { admin: ROLES.ADMIN, teacher: ROLES.TEACHER, student: ROLES.STUDENT };

export async function registerStudent(payload) {
  const exists = await User.exists({ email: payload.email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');
  const user = await User.create({ ...payload, role: ROLES.STUDENT, status: 'pending' });
  return { user, token: signToken(user) };
}

export async function login({ email, password, portal }, meta = {}) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (user.status === 'inactive') throw ApiError.forbidden('Your account is deactivated. Contact support.');
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
