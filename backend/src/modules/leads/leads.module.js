import { Router } from 'express';
import { z } from 'zod';
import { Lead } from '../../models/Engagement.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendCsv } from '../../utils/csv.js';
import { dateRangeFilter, escapeRegex, mergeFilters, monthTrend, paginate } from '../../utils/query.js';
import { noContent, ok } from '../../utils/response.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const STATUSES = ['new', 'contacted', 'converted', 'closed'];

const filterQuery = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
const listQuery = filterQuery.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const buildFilter = ({ status, source, search, from, to }) => {
  const regex = search ? new RegExp(escapeRegex(search), 'i') : null;
  return mergeFilters(
    status && status !== 'all' ? { status } : null,
    source && source !== 'all' ? { source } : null,
    regex ? { $or: [{ name: regex }, { email: regex }, { phone: regex }, { message: regex }] } : null,
    dateRangeFilter('createdAt', from, to),
  );
};

const router = Router();
router.use(authenticate, authorize('admin'));

router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const count = (filter = {}) => Lead.countDocuments(filter);
    const [total, fresh, contacted, converted, trend] = await Promise.all([count(), count({ status: 'new' }), count({ status: 'contacted' }), count({ status: 'converted' }), monthTrend(Lead, {})]);
    ok(res, { total: { value: total, trend }, new: { value: fresh }, contacted: { value: contacted }, converted: { value: converted }, closed: { value: total - fresh - contacted - converted } });
  }),
);

router.get(
  '/export',
  validate({ query: filterQuery }),
  asyncHandler(async (req, res) => {
    const rows = await Lead.find(buildFilter(req.query)).sort({ createdAt: -1 }).limit(5000);
    sendCsv(
      res,
      'leads.csv',
      [
        { label: 'Name', value: (l) => l.name },
        { label: 'Email', value: (l) => l.email },
        { label: 'Phone', value: (l) => l.phone },
        { label: 'Source', value: (l) => l.source },
        { label: 'Goal', value: (l) => l.goal },
        { label: 'Message', value: (l) => l.message },
        { label: 'Status', value: (l) => l.status },
        { label: 'Received', value: (l) => l.createdAt.toISOString() },
      ],
      rows,
    );
  }),
);

router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await paginate(Lead, buildFilter(req.query), { page: req.query.page, limit: req.query.limit });
    ok(res, items, meta);
  }),
);

router.patch(
  '/:id',
  validate({ params: idParam, body: z.object({ status: z.enum(STATUSES).optional(), note: z.string().max(500).optional() }) }),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) throw ApiError.notFound('Lead not found');
    ok(res, lead);
  }),
);

router.post(
  '/bulk',
  validate({ body: z.object({ ids: z.array(objectId).min(1), action: z.enum(['contacted', 'converted', 'closed', 'delete']) }) }),
  asyncHandler(async (req, res) => {
    const { ids, action } = req.body;
    const result = action === 'delete' ? await Lead.deleteMany({ _id: { $in: ids } }) : await Lead.updateMany({ _id: { $in: ids } }, { status: action });
    ok(res, { affected: result.deletedCount ?? result.modifiedCount });
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const removed = await Lead.findByIdAndDelete(req.params.id);
    if (!removed) throw ApiError.notFound('Lead not found');
    noContent(res);
  }),
);

export default router;
