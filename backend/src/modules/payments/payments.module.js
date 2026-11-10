import { Router } from 'express';
import { orderLimiter } from '../../middleware/security.js';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, noContent, ok } from '../../utils/response.js';
import { collectPages, listQuerySchema } from '../../utils/query.js';
import { sendExcel } from '../../utils/excel.js';
import { formatDateTime } from '../../utils/format.js';
import * as service from './payments.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const listQuery = listQuerySchema.extend({
  course: objectId.optional(),
  method: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const verifyBody = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const webhookHandler = asyncHandler(async (req, res) => {
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
  ok(res, await service.handleWebhook(raw, req.headers['x-razorpay-signature']));
});

const router = Router();
router.use(authenticate);

router.post('/orders', authorize('student'), orderLimiter, validate({ body: z.object({ courseId: objectId }) }), asyncHandler(async (req, res) => created(res, await service.createOrder(req.user, req.body.courseId))));
router.post('/verify', authorize('student'), validate({ body: verifyBody }), asyncHandler(async (req, res) => ok(res, await service.verifyPayment(req.user, req.body))));
router.post(
  '/failed',
  authorize('student'),
  validate({ body: z.object({ orderId: z.string(), reason: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    await service.reportFailure(req.user, req.body.orderId, req.body.reason);
    noContent(res);
  }),
);

router.get('/:id/invoice', authorize('student', 'admin'), validate({ params: z.object({ id: objectId }) }), asyncHandler(async (req, res) => service.streamInvoice(req.params.id, req.user, res)));

router.get(
  '/',
  authorize('student', 'admin'),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await service.listPayments(req.user, req.query);
    ok(res, items, meta);
  }),
);

router.use(authorize('admin'));

router.get('/summary', asyncHandler(async (_req, res) => ok(res, await service.paymentsSummary())));
router.get('/course-wise', asyncHandler(async (_req, res) => ok(res, await service.courseWiseRevenue())));
router.get('/refunds/recent', asyncHandler(async (_req, res) => ok(res, await service.recentRefunds())));

router.get(
  '/export',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const items = await collectPages((page, limit) => service.listPayments(req.user, { ...req.query, page, limit }));
    await sendExcel(res, {
      filename: 'payments.xlsx',
      title: 'Payments report',
      rows: items,
      columns: [
        { label: 'Student', value: (p) => p.student?.name },
        { label: 'Email', value: (p) => p.student?.email },
        { label: 'Course', value: (p) => p.course?.title },
        { label: 'Amount', value: (p) => p.amount, format: 'currency', total: true },
        { label: 'GST', value: (p) => p.gstAmount ?? 0, format: 'currency', total: true },
        { label: 'Invoice No', value: (p) => p.invoiceNumber },
        { label: 'Method', value: (p) => p.method },
        { label: 'Transaction ID', value: (p) => p.transactionId || p.razorpayOrderId },
        { label: 'Status', value: (p) => p.status },
        { label: 'Date', value: (p) => formatDateTime(p.createdAt) },
      ],
    });
  }),
);

router.post(
  '/:id/refund',
  validate({ params: z.object({ id: objectId }), body: z.object({ amount: z.coerce.number().positive().optional(), reason: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => ok(res, await service.refundPayment(req.params.id, req.body))),
);

export default router;
