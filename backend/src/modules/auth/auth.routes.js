import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './auth.controller.js';
import { publicFormLimiter } from '../../middleware/security.js';
import { changePasswordSchema, emailOnlySchema, loginSchema, registerSchema, resetPasswordSchema, updateProfileSchema, verifyEmailSchema } from './auth.validation.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), controller.verifyEmail);
router.post('/resend-otp', publicFormLimiter, validate({ body: emailOnlySchema }), controller.resendOtp);
router.post('/forgot-password', publicFormLimiter, validate({ body: emailOnlySchema }), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.get('/me', authenticate, controller.me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), controller.updateMe);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword);

export default router;
