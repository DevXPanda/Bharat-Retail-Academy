import { Router } from 'express';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import Batch from '../../models/Batch.js';
import Enrollment from '../../models/Enrollment.js';
import LiveClass from '../../models/LiveClass.js';
import Recording from '../../models/Recording.js';
import Payment from '../../models/Payment.js';
import Payout from '../../models/Payout.js';
import Attendance from '../../models/Attendance.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { monthBounds, monthTrend, percentChange } from '../../utils/query.js';
import { ok } from '../../utils/response.js';
import { listClasses, todaySchedule, upcomingClasses } from '../liveClasses/liveClasses.service.js';
import { listStudents, roster } from '../students/students.service.js';
import { listTeachers } from '../teachers/teachers.service.js';
import { teacherStudentIds } from '../../services/scope.js';
import { teacherOverview } from '../payouts/payouts.service.js';
import Assignment from '../../models/Assignment.js';

const sum = async (model, match, field) => (await model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }]))[0]?.total || 0;

async function adminDashboard(actor) {
  const [
    students, courses, activeStudents, revenue, pendingAccess, teachers, payoutsPaid, activeCourses, refunds, pendingPayouts,
    liveClasses, completedCourses, upcomingCount, recorded, batches, studentsTrend,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Course.countDocuments(),
    User.countDocuments({ role: 'student', status: 'active' }),
    sum(Payment, { status: 'successful' }, 'amount'),
    User.countDocuments({ role: 'student', status: 'pending' }),
    User.countDocuments({ role: 'teacher' }),
    sum(Payout, { status: 'paid' }, 'amount'),
    Course.countDocuments({ status: 'published' }),
    sum(Payment, { status: 'refunded' }, 'amount'),
    sum(Payout, { status: { $in: ['pending', 'processing', 'failed'] } }, 'amount'),
    LiveClass.countDocuments(),
    Enrollment.countDocuments({ status: 'completed' }),
    LiveClass.countDocuments({ status: 'upcoming' }),
    Recording.countDocuments(),
    Batch.countDocuments(),
    monthTrend(User, { role: 'student' }),
  ]);

  const [scheduled, attendance, studentRows, teacherRows] = await Promise.all([
    listClasses(actor, { page: 1, limit: 5, status: 'upcoming', sort: 'startsAt' }).then((r) => r.items),
    attendanceTable(),
    listStudents(actor, { page: 1, limit: 4 }).then((r) => r.items),
    listTeachers({ page: 1, limit: 3 }).then((r) => r.items),
  ]);

  return {
    cards: {
      students: { value: students, trend: studentsTrend },
      courses: { value: courses },
      activeStudents: { value: activeStudents },
      revenue: { value: revenue },
      pendingAccess: { value: pendingAccess },
      teachers: { value: teachers },
      payoutsPaid: { value: payoutsPaid },
      activeCourses: { value: activeCourses },
      refunds: { value: refunds },
      pendingPayouts: { value: pendingPayouts },
      liveClasses: { value: liveClasses },
      completedCourses: { value: completedCourses },
      upcomingClasses: { value: upcomingCount },
      recordings: { value: recorded },
      batches: { value: batches },
    },
    scheduledClasses: scheduled,
    attendance,
    students: studentRows,
    teachers: teacherRows,
  };
}

async function attendanceTable() {
  const classes = await LiveClass.find({ status: 'completed' }).sort({ endedAt: -1 }).limit(5).populate('course', 'title').populate('teacher', 'name');
  const rows = await Promise.all(
    classes.map(async (c) => {
      const [attended, total] = await Promise.all([
        Attendance.countDocuments({ liveClass: c._id, status: { $in: ['present', 'late'] } }),
        Attendance.countDocuments({ liveClass: c._id }),
      ]);
      return { id: c.id, date: c.startsAt, durationMin: c.durationMin, course: c.course?.title, title: c.title, teacher: c.teacher?.name, totalStudents: total, attended, status: 'completed' };
    }),
  );
  return rows;
}

async function teacherDashboard(actor) {
  const [classTotal, completed, upcomingCount, students, overview, upcoming, today, rosterRows, assignments, lastMonthClasses] = await Promise.all([
    LiveClass.countDocuments({ teacher: actor._id }),
    LiveClass.countDocuments({ teacher: actor._id, status: 'completed' }),
    LiveClass.countDocuments({ teacher: actor._id, status: { $in: ['upcoming', 'live'] } }),
    teacherStudentIds(actor._id),
    teacherOverview(actor._id, 'month'),
    upcomingClasses(actor, 3),
    todaySchedule(actor),
    roster(actor, { page: 1, limit: 5 }),
    Assignment.find({ teacher: actor._id }).sort({ createdAt: -1 }).limit(5).populate('course', 'title'),
    LiveClass.countDocuments({ teacher: actor._id, createdAt: { $gte: monthBounds(-1).start, $lt: monthBounds(0).start } }),
  ]);
  const thisMonthClasses = await LiveClass.countDocuments({ teacher: actor._id, createdAt: { $gte: monthBounds(0).start } });
  const enrolled = await Promise.all(assignments.map((a) => Enrollment.countDocuments({ course: a.course._id, status: { $in: ['active', 'completed'] } })));

  return {
    cards: {
      totalClasses: { value: classTotal, trend: percentChange(thisMonthClasses, lastMonthClasses) },
      totalStudents: { value: students.length, trend: await monthTrend(Enrollment, { student: { $in: students } }) },
      upcoming: { value: upcomingCount },
      completed: { value: completed },
      earnings: { value: overview.cards.totalEarnings.value, trend: overview.cards.totalEarnings.trend },
    },
    upcomingClasses: upcoming,
    todaySchedule: today,
    students: await Promise.all(
      rosterRows.items.map(async (e) => ({ id: e.id, name: e.student.name, avatar: e.student.avatar, course: e.course.title, progress: e.progress, lastActive: (await User.findById(e.student.id).select('lastActiveAt'))?.lastActiveAt })),
    ),
    assignments: assignments.map((a, i) => ({ id: a.id, title: a.title, course: a.course?.title, submissions: a.submissions.length, enrolled: enrolled[i], status: a.status })),
  };
}

const router = Router();
router.use(authenticate);

router.get('/admin', authorize('admin'), asyncHandler(async (req, res) => ok(res, await adminDashboard(req.user))));
router.get('/teacher', authorize('teacher'), asyncHandler(async (req, res) => ok(res, await teacherDashboard(req.user))));

export default router;
