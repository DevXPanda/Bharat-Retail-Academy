import { Router } from 'express';
import { z } from 'zod';
import { Review } from '../../models/Engagement.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { dateRangeFilter, escapeRegex, mergeFilters, paginate } from '../../utils/query.js';
import { ok } from '../../utils/response.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  course: objectId.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const router = Router();
router.use(authenticate, authorize('admin'));

router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const rows = await Review.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]);
    const total = rows.reduce((s, r) => s + r.count, 0);
    const sum = rows.reduce((s, r) => s + r._id * r.count, 0);
    const byRating = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: rows.find((r) => r._id === rating)?.count || 0 }));
    ok(res, { total: { value: total }, average: { value: total ? Math.round((sum / total) * 10) / 10 : 0 }, byRating });
  }),
);

router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, limit, course, rating, search, from, to } = req.query;
    const filter = mergeFilters(course ? { course } : null, rating ? { rating } : null, search ? { comment: new RegExp(escapeRegex(search), 'i') } : null, dateRangeFilter('createdAt', from, to));
    const { items, meta } = await paginate(Review, filter, {
      page,
      limit,
      populate: [{ path: 'student', select: 'name email avatar studentCode' }, { path: 'course', select: 'title category thumbnail' }],
    });
    ok(res, items, meta);
  }),
);

export default router;
