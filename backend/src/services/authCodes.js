import crypto from 'node:crypto';
import env from '../config/env.js';
import { AuthCode } from '../models/Mail.js';
import { ApiError } from '../utils/ApiError.js';

export const OTP_MINUTES = 10;
export const RESET_MINUTES = 30;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (value) => crypto.createHmac('sha256', env.JWT_SECRET).update(String(value)).digest('hex');
const safeEqual = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// A fresh six digit code. Older unused codes for the same user are dropped so only the latest one works.
export async function issueOtp(user) {
  const latest = await AuthCode.findOne({ user: user._id, purpose: 'verify', usedAt: null }).sort({ createdAt: -1 });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${wait} seconds before asking for another code`);
  }
  await AuthCode.deleteMany({ user: user._id, purpose: 'verify' });
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await AuthCode.create({ user: user._id, purpose: 'verify', codeHash: hash(`${user.id}:${code}`), expiresAt: new Date(Date.now() + OTP_MINUTES * 60000) });
  return code;
}

export async function checkOtp(user, code) {
  const record = await AuthCode.findOne({ user: user._id, purpose: 'verify', usedAt: null }).sort({ createdAt: -1 });
  if (!record || record.expiresAt < new Date()) throw ApiError.badRequest('This code has expired. Ask for a new one.');
  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    throw ApiError.badRequest('Too many wrong attempts. Ask for a new code.');
  }
  if (!safeEqual(record.codeHash, hash(`${user.id}:${String(code).trim()}`))) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest(`Incorrect code. ${MAX_ATTEMPTS - record.attempts} attempt${MAX_ATTEMPTS - record.attempts === 1 ? '' : 's'} left.`);
  }
  await AuthCode.deleteMany({ user: user._id, purpose: 'verify' });
}

// Reset links carry a random token; only its hash is stored, and it can be used once.
export async function issueResetToken(user) {
  const latest = await AuthCode.findOne({ user: user._id, purpose: 'reset', usedAt: null }).sort({ createdAt: -1 });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return null;
  await AuthCode.deleteMany({ user: user._id, purpose: 'reset' });
  const token = crypto.randomBytes(32).toString('hex');
  await AuthCode.create({ user: user._id, purpose: 'reset', codeHash: hash(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60000) });
  return token;
}

export async function consumeResetToken(token) {
  const record = await AuthCode.findOne({ purpose: 'reset', codeHash: hash(token), usedAt: null });
  if (!record || record.expiresAt < new Date()) throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  await record.deleteOne();
  return record.user;
}
