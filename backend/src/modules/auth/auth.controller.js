import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import * as service from './auth.service.js';

export const register = asyncHandler(async (req, res) => created(res, { needsVerification: true, ...(await service.registerStudent(req.body)) }));

export const resendOtp = asyncHandler(async (req, res) => ok(res, await service.resendOtp(req.body.email)));

export const verifyEmail = asyncHandler(async (req, res) => {
  const { user, token } = await service.verifyEmail(req.body, { ip: req.ip, userAgent: req.get('user-agent') });
  ok(res, { user, token });
});

export const forgotPassword = asyncHandler(async (req, res) => ok(res, await service.forgotPassword(req.body.email)));

export const resetPassword = asyncHandler(async (req, res) => ok(res, await service.resetPassword(req.body)));

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await service.login(req.body, { ip: req.ip, userAgent: req.get('user-agent') });
  ok(res, { user, token });
});

export const me = asyncHandler(async (req, res) => ok(res, req.user));

export const updateMe = asyncHandler(async (req, res) => {
  const user = await service.updateProfile(req.user, req.body);
  ok(res, user);
});

export const changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user.id, req.body);
  noContent(res);
});
