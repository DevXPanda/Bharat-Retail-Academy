import { Router } from 'express';
import { z } from 'zod';
import { PAYOUT_METHODS } from '../../config/constants.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok } from '../../utils/response.js';
import { collectPages, listQuerySchema } from '../../utils/query.js';
import { sendExcel } from '../../utils/excel.js';
import { formatDate } from '../../utils/format.js';
import * as service from './payouts.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const listQuery = listQuerySchema.extend({
  teacher: objectId.optional(),
  method: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const generateBody = z
  .object({ from: z.coerce.date(), to: z.coerce.date(), teacherId: objectId.optional(), method: z.enum(PAYOUT_METHODS).optional() })
  .refine((v) => v.to >= v.from, { path: ['to'], message: 'End date must be after start date' });

const processBody = z.object({
  status: z.enum(['processing', 'paid', 'failed']),
  method: z.enum(PAYOUT_METHODS).optional(),
  transactionId: z.string().trim().max(80).optional(),
  failureReason: z.string().max(200).optional(),
});

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'teacher'),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await service.listPayouts(req.user, req.query);
    ok(res, items, meta);
  }),
);

router.get('/me/overview', authorize('teacher'), validate({ query: z.object({ period: z.enum(['month', 'last_month', 'year', 'all']).default('month') }) }), asyncHandler(async (req, res) => ok(res, await service.teacherOverview(req.user._id, req.query.period))));
router.get('/me/earnings', authorize('teacher'), validate({ query: z.object({ view: z.enum(['details', 'course', 'monthly']).default('details') }) }), asyncHandler(async (req, res) => ok(res, await service.teacherEarningRows(req.user._id, req.query.view))));

router.use(authorize('admin'));

router.get('/summary', asyncHandler(async (_req, res) => ok(res, await service.payoutsSummary())));
router.get('/top-teachers', asyncHandler(async (_req, res) => ok(res, await service.topTeachers())));

router.get(
  '/export',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const items = await collectPages((page, limit) => service.listPayouts(req.user, { ...req.query, page, limit }));
    await sendExcel(res, {
      filename: 'payouts.xlsx',
      title: 'Teacher payouts report',
      rows: items,
      columns: [
        { label: 'Teacher', value: (p) => p.teacher?.name },
        { label: 'Email', value: (p) => p.teacher?.email },
        { label: 'Period', value: (p) => p.periodLabel },
        { label: 'Classes', value: (p) => p.classesConducted },
        { label: 'Earnings', value: (p) => p.earnings, format: 'currency', total: true },
        { label: 'Payout Amount', value: (p) => p.amount, format: 'currency', total: true },
        { label: 'Method', value: (p) => p.method },
        { label: 'Status', value: (p) => p.status },
        { label: 'Payout Date', value: (p) => formatDate(p.payoutDate) },
      ],
    });
  }),
);

router.post('/generate', validate({ body: generateBody }), asyncHandler(async (req, res) => created(res, await service.generatePayouts(req.body))));
router.patch('/:id/process', validate({ params: z.object({ id: objectId }), body: processBody }), asyncHandler(async (req, res) => ok(res, await service.processPayout(req.params.id, req.body))));
router.post('/:id/retry', validate({ params: z.object({ id: objectId }) }), asyncHandler(async (req, res) => ok(res, await service.retryPayout(req.params.id))));

export default router;
