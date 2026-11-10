import { Router } from 'express';
import { z } from 'zod';
import Assignment from '../../models/Assignment.js';
import Enrollment from '../../models/Enrollment.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { created, ok } from '../../utils/response.js';
import { escapeRegex, mergeFilters, paginate } from '../../utils/query.js';
import { notifyUsers } from '../../services/notify.js';
import { studentCourseIds, teacherCourseIds } from '../../services/scope.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

const createBody = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().max(2000).optional(),
  course: objectId,
  dueDate: z.coerce.date().optional(),
});

const shape = async (assignments, actor) => {
  const enrolledCounts = await Promise.all(assignments.map((a) => Enrollment.countDocuments({ course: a.course._id || a.course, status: { $in: ['active', 'completed'] } })));
  return assignments.map((a, i) => ({
    ...a.toJSON(),
    submissionsCount: a.submissions.length,
    enrolledCount: enrolledCounts[i],
    submissions: actor.role === 'student' ? undefined : a.submissions,
    mySubmission: actor.role === 'student' ? a.submissions.find((s) => String(s.student) === String(actor._id)) || null : undefined,
  }));
};

const router = Router();
router.use(authenticate);

router.get(
  '/',
  validate({
    query: z.object({
      limit: z.coerce.number().int().min(1).max(50).default(10),
      page: z.coerce.number().int().min(1).default(1),
      course: objectId.optional(),
      teacher: objectId.optional(),
      status: z.string().optional(),
      search: z.string().trim().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { limit, page, course, teacher, status, search } = req.query;
    let scope = {};
    if (req.user.role === 'teacher') scope = { teacher: req.user._id };
    if (req.user.role === 'student') scope = { course: { $in: await studentCourseIds(req.user._id) } };
    const filter = mergeFilters(
      scope,
      course ? { course } : null,
      teacher && req.user.role === 'admin' ? { teacher } : null,
      status && status !== 'all' ? { status } : null,
      search ? { title: new RegExp(escapeRegex(search), 'i') } : null,
    );
    const populate = [{ path: 'course', select: 'title category thumbnail' }, { path: 'teacher', select: 'name avatar' }];
    if (req.user.role === 'admin') populate.push({ path: 'submissions.student', select: 'name email avatar studentCode' });
    const { items, meta } = await paginate(Assignment, filter, { page, limit, populate });
    ok(res, await shape(items, req.user), meta);
  }),
);

router.get(
  '/summary',
  authorize('admin'),
  asyncHandler(async (_req, res) => {
    const [total, active, closed, agg] = await Promise.all([
      Assignment.countDocuments(),
      Assignment.countDocuments({ status: 'active' }),
      Assignment.countDocuments({ status: 'closed' }),
      Assignment.aggregate([{ $group: { _id: null, submissions: { $sum: { $size: '$submissions' } } } }]),
    ]);
    ok(res, { total: { value: total }, active: { value: active }, closed: { value: closed }, submissions: { value: agg[0]?.submissions || 0 } });
  }),
);

router.post(
  '/',
  authorize('teacher'),
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const own = await teacherCourseIds(req.user._id);
    if (!own.some((id) => String(id) === req.body.course)) throw ApiError.forbidden('You are not assigned to this course');
    const assignment = await Assignment.create({ ...req.body, teacher: req.user._id });
    const students = await Enrollment.distinct('student', { course: assignment.course, status: { $in: ['active', 'completed'] } });
    await notifyUsers(students, { title: 'New assignment', body: assignment.title, type: 'assignment', link: '/app/courses', section: 'courses', ref: assignment.course });
    created(res, (await shape([await assignment.populate('course', 'title')], req.user))[0]);
  }),
);

router.patch(
  '/:id/close',
  authorize('teacher'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOneAndUpdate({ _id: req.params.id, teacher: req.user._id }, { status: 'closed' }, { new: true });
    if (!assignment) throw ApiError.notFound('Assignment not found');
    ok(res, assignment);
  }),
);

router.post(
  '/:id/submit',
  authorize('student'),
  validate({ params: idParam, body: z.object({ fileUrl: z.string().optional(), note: z.string().max(1000).optional() }) }),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || assignment.status !== 'active') throw ApiError.notFound('Assignment is not open');
    if (!(await studentCourseIds(req.user._id)).some((id) => String(id) === String(assignment.course))) throw ApiError.forbidden();
    assignment.submissions = assignment.submissions.filter((s) => String(s.student) !== String(req.user._id));
    assignment.submissions.push({ student: req.user._id, ...req.body });
    await assignment.save();
    ok(res, { submitted: true });
  }),
);

export default router;
