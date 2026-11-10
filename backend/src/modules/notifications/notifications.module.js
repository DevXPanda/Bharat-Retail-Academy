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

// Per-section sidebar state. `counts` drives the sidebar badges (cleared when the section is opened);
// `unread` lists the row refs still waiting to be opened (shown as green rows until the user views them).
router.get(
  '/sections',
  asyncHandler(async (req, res) => {
    const rows = await Notification.find({ user: req.user._id, section: { $exists: true, $ne: null }, read: false }).select('section ref seen').limit(500).lean();
    const counts = {};
    const unread = {};
    rows.forEach((n) => {
      if (!n.seen) counts[n.section] = (counts[n.section] || 0) + 1;
      if (n.ref) (unread[n.section] ||= []).push(n.ref);
    });
    ok(res, { counts, unread });
  }),
);

const sectionParam = z.object({ section: z.string().regex(/^[a-z-]{2,40}$/) });

router.patch(
  '/sections/:section/seen',
  validate({ params: sectionParam }),
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, section: req.params.section, seen: false }, { seen: true });
    noContent(res);
  }),
);

router.patch(
  '/sections/:section/read',
  validate({ params: sectionParam, body: z.object({ ref: z.string().min(1).max(64) }) }),
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, section: req.params.section, ref: req.body.ref, read: false }, { read: true, seen: true });
    noContent(res);
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
