import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as service from './learning.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const router = Router();
router.use(authenticate, authorize('student'));

router.get('/dashboard', asyncHandler(async (req, res) => ok(res, await service.studentDashboard(req.user))));
router.get('/courses', asyncHandler(async (req, res) => ok(res, await service.myCourses(req.user))));
router.get('/courses/:courseId', validate({ params: z.object({ courseId: objectId }) }), asyncHandler(async (req, res) => ok(res, await service.courseContent(req.user, req.params.courseId))));
router.post(
  '/courses/:courseId/progress',
  validate({ params: z.object({ courseId: objectId }), body: z.object({ lessonId: z.string(), completed: z.boolean() }) }),
  asyncHandler(async (req, res) => ok(res, await service.updateProgress(req.user, req.params.courseId, req.body))),
);

export default router;
