import { Router } from 'express';
import { z } from 'zod';
import LiveClass from '../../models/LiveClass.js';
import Enrollment from '../../models/Enrollment.js';
import Attendance from '../../models/Attendance.js';
import { ATTENDANCE_STATUS } from '../../config/constants.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { dateRangeFilter, escapeRegex, mergeFilters } from '../../utils/query.js';
import { ok } from '../../utils/response.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const listQuery = z.object({
  liveClass: objectId,
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const summaryQuery = z.object({
  course: objectId.optional(),
  teacher: objectId.optional(),
  batch: objectId.optional(),
  liveClass: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const markBody = z.object({
  records: z.array(z.object({ student: objectId, status: z.enum(ATTENDANCE_STATUS) })).min(1),
});

async function loadOwnedClass(id, actor) {
  const cls = await LiveClass.findById(id);
  if (!cls) throw ApiError.notFound('Class not found');
  if (actor.role === 'teacher' && String(cls.teacher) !== String(actor._id)) throw ApiError.forbidden();
  return cls;
}

const router = Router();
router.use(authenticate, authorize('admin', 'teacher'));

router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { liveClass, search, page, limit } = req.query;
    const cls = await loadOwnedClass(liveClass, req.user);
    const enrollments = await Enrollment.find({
      course: cls.course,
      status: { $in: ['active', 'completed'] },
      ...(cls.batch ? { batch: cls.batch } : {}),
    }).populate('student', 'name email phone avatar studentCode');
    const records = new Map((await Attendance.find({ liveClass })).map((a) => [String(a.student), a]));

    let rows = enrollments
      .filter((e) => e.student)
      .map((e) => ({ student: e.student.toJSON(), attendance: records.get(String(e.student._id))?.toJSON() || { status: 'not_marked' } }));
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      rows = rows.filter((r) => regex.test(r.student.name) || regex.test(r.student.email) || regex.test(r.student.phone || ''));
    }
    const total = rows.length;
    ok(res, rows.slice((page - 1) * limit, page * limit), { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

router.get(
  '/summary',
  validate({ query: summaryQuery }),
  asyncHandler(async (req, res) => {
    const { course, teacher, batch, liveClass, from, to } = req.query;
    const classFilter = mergeFilters(
      req.user.role === 'teacher' ? { teacher: req.user._id } : teacher ? { teacher } : null,
      course ? { course } : null,
      batch ? { batch } : null,
      liveClass ? { _id: liveClass } : null,
      dateRangeFilter('startsAt', from, to),
    );
    const classIds = await LiveClass.distinct('_id', mergeFilters(classFilter, { status: { $in: ['completed', 'live'] } }));
    const counts = await Attendance.aggregate([{ $match: { liveClass: { $in: classIds } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
    const get = (status) => counts.find((c) => c._id === status)?.count || 0;
    const present = get('present') + get('late');
    const absent = get('absent');
    const notMarked = get('not_marked');
    const total = present + absent + notMarked;
    ok(res, {
      total: { value: total },
      present: { value: present, rate: total ? Math.round((present / total) * 100) : 0 },
      absent: { value: absent, rate: total ? Math.round((absent / total) * 100) : 0 },
      notMarked: { value: notMarked, rate: total ? Math.round((notMarked / total) * 100) : 0 },
    });
  }),
);

router.put(
  '/:liveClass',
  validate({ params: z.object({ liveClass: objectId }), body: markBody }),
  asyncHandler(async (req, res) => {
    const cls = await loadOwnedClass(req.params.liveClass, req.user);
    await Attendance.bulkWrite(
      req.body.records.map(({ student, status }) => ({
        updateOne: { filter: { liveClass: cls._id, student }, update: { $set: { status } }, upsert: true },
      })),
    );
    ok(res, { updated: req.body.records.length });
  }),
);

export default router;
