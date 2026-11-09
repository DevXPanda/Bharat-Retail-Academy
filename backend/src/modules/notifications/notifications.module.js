import { Router } from 'express';
import { z } from 'zod';
import { Notification } from '../../models/Engagement.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { noContent, ok } from '../../utils/response.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    ok(res, items, { unread });
  }),
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    noContent(res);
  }),
);

router.patch(
  '/:id/read',
  validate({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) }),
  asyncHandler(async (req, res) => {
    const doc = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
    if (!doc) throw ApiError.notFound('Notification not found');
    ok(res, doc);
  }),
);

export default router;
