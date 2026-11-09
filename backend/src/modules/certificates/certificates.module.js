import { Router } from 'express';
import { z } from 'zod';
import { CERTIFICATE_STATUS } from '../../config/constants.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok } from '../../utils/response.js';
import { listQuerySchema } from '../../utils/query.js';
import * as service from './certificates.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const listQuery = listQuerySchema.extend({
  course: objectId.optional(),
  batch: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get('/mine', authorize('student'), asyncHandler(async (req, res) => ok(res, await service.myCertificates(req.user._id))));

router.get('/:id/download', validate({ params: z.object({ id: objectId }) }), asyncHandler(async (req, res) => service.renderPdf(req.params.id, req.user, res)));

router.use(authorize('admin'));

router.get('/summary', asyncHandler(async (_req, res) => ok(res, await service.certificatesSummary())));

router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await service.listCertificates(req.query);
    ok(res, items, meta);
  }),
);

router.post(
  '/',
  validate({ body: z.object({ studentId: objectId, courseId: objectId }) }),
  asyncHandler(async (req, res) => created(res, await service.generateManually(req.user, req.body))),
);

router.post(
  '/bulk',
  validate({ body: z.object({ ids: z.array(objectId).min(1), action: z.enum(['verify', 'revoke']) }) }),
  asyncHandler(async (req, res) => ok(res, await service.bulkUpdate(req.body.ids, req.body.action))),
);

router.patch(
  '/:id/status',
  validate({ params: z.object({ id: objectId }), body: z.object({ status: z.enum(CERTIFICATE_STATUS) }) }),
  asyncHandler(async (req, res) => ok(res, await service.updateStatus(req.params.id, req.body.status))),
);

export default router;
