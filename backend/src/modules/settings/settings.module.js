import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { getSettings, updateSettings } from '../../services/settings.js';

const url = z.string().trim().max(300).refine((v) => !v || /^https?:\/\//i.test(v), 'Enter a full link starting with https://');

const body = z
  .object({
    gstPercent: z.coerce.number().min(0).max(50),
    gstMode: z.enum(['inclusive', 'exclusive']),
    platformFeePercent: z.coerce.number().min(0).max(90),
    businessName: z.string().trim().min(2).max(120),
    gstin: z.string().trim().toUpperCase().max(20).refine((v) => !v || /^[0-9A-Z]{15}$/.test(v), 'GSTIN must be 15 letters/digits'),
    supportEmail: z.string().trim().email(),
    supportPhone: z.string().trim().max(30),
    supportHours: z.string().trim().max(80),
    address: z.string().trim().max(250),
    invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, 'Use 2-8 letters or digits'),
    social: z.object({ facebook: url, instagram: url, linkedin: url, youtube: url }).partial(),
  })
  .partial();

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', asyncHandler(async (_req, res) => ok(res, await getSettings())));
router.put('/', validate({ body }), asyncHandler(async (req, res) => ok(res, await updateSettings(req.body, req.user._id))));

export default router;
