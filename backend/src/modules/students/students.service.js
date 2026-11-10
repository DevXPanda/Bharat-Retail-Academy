import mongoose from 'mongoose';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import Batch from '../../models/Batch.js';
import Enrollment from '../../models/Enrollment.js';
import LiveClass from '../../models/LiveClass.js';
import Attendance from '../../models/Attendance.js';
import Payment from '../../models/Payment.js';
import Certificate from '../../models/Certificate.js';
import Assignment from '../../models/Assignment.js';
import Ticket from '../../models/Ticket.js';
import { Review } from '../../models/Engagement.js';
import RecordingView from '../../models/RecordingView.js';
import ClassPreview from '../../models/ClassPreview.js';
import { classChatFor, conversationsFor, loginsFor, threadFor } from '../../services/userActivity.js';
import { ApiError } from '../../utils/ApiError.js';
import { generatePassword } from '../../utils/slug.js';
import { dateRangeFilter, mergeFilters, monthTrend, paginate, searchFilter } from '../../utils/query.js';
import { teacherCourseIds, teacherStudentIds } from '../../services/scope.js';
import { queueMail } from '../../services/mail/index.js';
import { enrollStudent, refreshStudentStatus } from '../enrollments/enrollment.service.js';

const toIds = (list) => list.map((id) => new mongoose.Types.ObjectId(String(id)));

async function attachEnrollments(students) {
  const ids = students.map((s) => s._id);
  const enrollments = await Enrollment.find({ student: { $in: ids } })
    .populate('course', 'title category thumbnail')
    .populate('batch', 'name')
    .sort({ createdAt: -1 });
  const grouped = new Map();
  enrollments.forEach((e) => {
    const key = String(e.student);
    grouped.set(key, [...(grouped.get(key) || []), e]);
  });
  return students.map((student) => {
    const list = grouped.get(String(student._id)) || [];
    return { ...student.toJSON(), enrollments: list.map((e) => e.toJSON()) };
  });
}

export async function listStudents(actor, query) {
  const enrollmentFilter = {};
  if (query.course) enrollmentFilter.course = query.course;
  if (query.batch) enrollmentFilter.batch = query.batch;

  let idFilter = null;
  if (Object.keys(enrollmentFilter).length) {
    idFilter = { _id: { $in: await Enrollment.distinct('student', enrollmentFilter) } };
  }
  if (actor.role === 'teacher') {
    const own = await teacherStudentIds(actor._id);
    idFilter = mergeFilters(idFilter, { _id: { $in: own } });
  }

  const filter = mergeFilters(
    { role: 'student' },
    idFilter,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    searchFilter(['name', 'email', 'phone', 'studentCode'], query.search),
    dateRangeFilter('createdAt', query.joinedFrom, query.joinedTo),
  );

  const { items, meta } = await paginate(User, filter, { page: query.page, limit: query.limit, sort: { createdAt: -1 } });
  return { items: await attachEnrollments(items), meta };
}

export async function studentsSummary() {
  const [total, active, pending, inactive, trend] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'student', status: 'pending' }),
    User.countDocuments({ role: 'student', status: 'inactive' }),
    monthTrend(User, { role: 'student' }),
  ]);
  const activeTrend = await monthTrend(User, { role: 'student', status: 'active' });
  const pendingTrend = await monthTrend(User, { role: 'student', status: 'pending' });
  const inactiveTrend = await monthTrend(User, { role: 'student', status: 'inactive' });
  return {
    total: { value: total, trend },
    active: { value: active, trend: activeTrend },
    pending: { value: pending, trend: pendingTrend },
    inactive: { value: inactive, trend: inactiveTrend },
  };
}

export async function createStudent(payload, actor) {
  const email = payload.email.toLowerCase();
  if (await User.exists({ email })) throw ApiError.conflict('A user with this email already exists');

  const tempPassword = generatePassword();
  const student = await User.create({
    name: payload.name,
    email,
    phone: payload.phone || undefined,
    password: tempPassword,
    role: 'student',
    status: payload.status,
    mustChangePassword: true,
  });

  if (payload.courseId) {
    await enrollStudent({
      studentId: student._id,
      courseId: payload.courseId,
      accessStart: payload.accessStart,
      accessEnd: payload.accessEnd,
      source: 'admin',
      status: payload.status === 'inactive' ? 'inactive' : 'active',
    });
    if (payload.status === 'pending') await User.updateOne({ _id: student._id }, { status: 'pending' });
  }

  queueMail(student, 'studentCredentials', { email, password: tempPassword });

  const [full] = await attachEnrollments([await User.findById(student._id)]);
  return { student: full, tempPassword, createdBy: actor.id };
}

export async function getStudent(id, actor) {
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) throw ApiError.notFound('Student not found');
  if (actor.role === 'teacher') {
    const own = await teacherStudentIds(actor._id);
    if (!own.some((sid) => String(sid) === String(student._id))) throw ApiError.forbidden();
  }
  const [full] = await attachEnrollments([student]);
  const [payments, attended, total] = await Promise.all([
    Payment.find({ student: student._id, status: { $in: ['successful', 'refunded'] } }).populate('course', 'title').sort({ createdAt: -1 }).limit(10),
    Attendance.countDocuments({ student: student._id, status: { $in: ['present', 'late'] } }),
    Attendance.countDocuments({ student: student._id }),
  ]);
  if (actor.role !== 'admin') return { ...full, payments: undefined, attendance: { attended, total } };
  return { ...full, payments, attendance: { attended, total }, activity: await studentActivity(student, full.enrollments) };
}

// Everything an admin may want to know about one student, in one place.
async function studentActivity(student, enrollments) {
  const courseIds = enrollments.map((e) => e.course?.id || e.course?._id).filter(Boolean);
  const [allPayments, records, certificates, assignments, tickets, reviews, courses, conversations, classChat, logins, recordingViews, previews] = await Promise.all([
    Payment.find({ student: student._id }).populate('course', 'title').sort({ createdAt: -1 }).limit(50),
    Attendance.find({ student: student._id })
      .sort({ updatedAt: -1 })
      .limit(25)
      .populate({ path: 'liveClass', select: 'title startsAt durationMin status isFreeDemo course teacher', populate: [{ path: 'course', select: 'title' }, { path: 'teacher', select: 'name' }] }),
    Certificate.find({ student: student._id }).populate('course', 'title').sort({ createdAt: -1 }),
    Assignment.find({ course: { $in: courseIds } }).populate('course', 'title').select('title description course dueDate status submissions').sort({ createdAt: -1 }).limit(40),
    Ticket.find({ student: student._id }).select('-replies').sort({ lastReplyAt: -1 }).limit(20),
    Review.find({ student: student._id }).populate('course', 'title').sort({ createdAt: -1 }),
    Course.find({ _id: { $in: courseIds } }).select('title modules'),
    conversationsFor(student._id),
    classChatFor(student._id),
    loginsFor(student._id),
    RecordingView.find({ student: student._id })
      .sort({ lastViewedAt: -1 })
      .limit(50)
      .populate({ path: 'recording', select: 'title durationSec classDate course', populate: { path: 'course', select: 'title' } }),
    ClassPreview.find({ student: student._id })
      .sort({ startedAt: -1 })
      .limit(30)
      .populate({ path: 'liveClass', select: 'title startsAt course', populate: { path: 'course', select: 'title' } }),
  ]);

  // Lesson by lesson: which lessons are done and, where we have it, when.
  const courseById = new Map(courses.map((c) => [String(c._id), c]));
  const lessons = enrollments
    .map((e) => {
      const course = courseById.get(String(e.course?.id || e.course?._id));
      if (!course) return null;
      const done = new Set(e.completedLessons || []);
      const when = new Map((e.lessonLog || []).map((l) => [l.lesson, l.completedAt]));
      return {
        enrollmentId: e.id,
        course: course.title,
        modules: course.modules.map((m) => ({
          title: m.title,
          lessons: m.lessons.map((l) => ({ id: String(l._id), title: l.title, type: l.type, durationMin: l.durationMin, completed: done.has(String(l._id)), completedAt: when.get(String(l._id)) })),
        })),
      };
    })
    .filter(Boolean);

  return {
    payments: allPayments.map((p) => p.toJSON()),
    attendanceRecords: records.filter((r) => r.liveClass).map((r) => ({ ...r.toJSON(), liveClass: r.liveClass.toJSON() })),
    certificates: certificates.map((c) => c.toJSON()),
    assignments: assignments.map((a) => {
      const mine = a.submissions.find((x) => String(x.student) === String(student._id));
      return { id: a.id, title: a.title, description: a.description, course: a.course?.title, dueDate: a.dueDate, status: a.status, submitted: Boolean(mine), submittedAt: mine?.submittedAt, note: mine?.note, fileUrl: mine?.fileUrl };
    }),
    tickets: tickets.map((t) => t.toJSON()),
    reviews: reviews.map((r) => r.toJSON()),
    lessons,
    conversations,
    classChat,
    logins,
    recordingViews: recordingViews
      .filter((v) => v.recording)
      .map((v) => ({ id: v.id, title: v.recording.title, course: v.recording.course?.title, classDate: v.recording.classDate, durationSec: v.recording.durationSec, count: v.count, firstViewedAt: v.firstViewedAt, lastViewedAt: v.lastViewedAt })),
    previews: previews.filter((x) => x.liveClass).map((x) => ({ id: x.id, classTitle: x.liveClass.title, course: x.liveClass.course?.title, classDate: x.liveClass.startsAt, startedAt: x.startedAt })),
  };
}

export const studentConversation = (studentId, conversationId) => threadFor(studentId, conversationId);

export async function updateStudent(id, payload) {
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) throw ApiError.notFound('Student not found');
  if (payload.email && payload.email.toLowerCase() !== student.email) {
    if (await User.exists({ email: payload.email.toLowerCase(), _id: { $ne: id } })) throw ApiError.conflict('Email already in use');
  }
  Object.assign(student, payload);
  await student.save();
  if (payload.status === 'inactive') await Enrollment.updateMany({ student: id, status: 'active' }, { status: 'inactive' });
  if (payload.status === 'active') await Enrollment.updateMany({ student: id, status: 'inactive' }, { status: 'active' });
  return student;
}

export async function deleteStudent(id) {
  const student = await User.findOneAndDelete({ _id: id, role: 'student' });
  if (!student) throw ApiError.notFound('Student not found');
  await Promise.all([Enrollment.deleteMany({ student: id }), Attendance.deleteMany({ student: id })]);
}

export async function addEnrollment(studentId, payload) {
  await enrollStudent({ studentId, ...payload, source: 'admin' });
  const student = await User.findById(studentId);
  const [full] = await attachEnrollments([student]);
  return full;
}

export async function removeEnrollment(studentId, enrollmentId) {
  const removed = await Enrollment.findOneAndDelete({ _id: enrollmentId, student: studentId });
  if (!removed) throw ApiError.notFound('Enrollment not found');
  await refreshStudentStatus(studentId);
}

async function rosterScope(actor) {
  if (actor.role === 'admin') return {};
  const [courseIds, batchIds] = await Promise.all([teacherCourseIds(actor._id), Batch.distinct('_id', { teacher: actor._id })]);
  return { $or: [{ course: { $in: courseIds } }, { batch: { $in: batchIds } }] };
}

async function classStatsFor(enrollments) {
  const courseIds = [...new Set(enrollments.map((e) => String(e.course._id)))];
  const studentIds = enrollments.map((e) => e.student._id);
  const classes = await LiveClass.find({ course: { $in: courseIds }, status: 'completed' }).select('course batch');
  const attendance = await Attendance.find({
    student: { $in: studentIds },
    liveClass: { $in: classes.map((c) => c._id) },
    status: { $in: ['present', 'late'] },
  }).select('student liveClass');
  const classById = new Map(classes.map((c) => [String(c._id), c]));
  return enrollments.map((e) => {
    const relevant = classes.filter(
      (c) => String(c.course) === String(e.course._id) && (!e.batch || !c.batch || String(c.batch) === String(e.batch._id)),
    );
    const attended = attendance.filter((a) => String(a.student) === String(e.student._id) && String(classById.get(String(a.liveClass))?.course) === String(e.course._id)).length;
    return { attended, total: relevant.length };
  });
}

export async function roster(actor, query) {
  const filter = mergeFilters(
    await rosterScope(actor),
    query.course ? { course: query.course } : null,
    query.batch ? { batch: query.batch } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    dateRangeFilter('createdAt', query.from, query.to),
  );

  let studentFilter = null;
  if (query.search) {
    const ids = await User.distinct('_id', { role: 'student', ...searchFilter(['name', 'email', 'phone', 'studentCode'], query.search) });
    studentFilter = { student: { $in: ids } };
  }

  const { items, meta } = await paginate(Enrollment, mergeFilters(filter, studentFilter), {
    page: query.page,
    limit: query.limit,
    sort: { createdAt: -1 },
    populate: [
      { path: 'student', select: 'name email phone avatar studentCode status' },
      { path: 'course', select: 'title category' },
      { path: 'batch', select: 'name' },
    ],
  });
  const valid = items.filter((e) => e.student && e.course);
  const stats = await classStatsFor(valid);
  return { items: valid.map((e, i) => ({ ...e.toJSON(), classes: stats[i] })), meta };
}

// Enrollment rows for the chosen ids, limited to what this teacher (or admin) is allowed to see.
export async function rosterByIds(actor, ids) {
  const valid = ids.filter((id) => /^[a-f\d]{24}$/i.test(id));
  const items = await Enrollment.find(mergeFilters(await rosterScope(actor), { _id: { $in: valid } }))
    .populate('student', 'name email phone studentCode')
    .populate('course', 'title')
    .populate('batch', 'name');
  const rows = items.filter((e) => e.student && e.course);
  const stats = await classStatsFor(rows);
  return rows.map((e, i) => ({ ...e.toJSON(), classes: stats[i] }));
}

export async function rosterSummary(actor) {
  const scope = await rosterScope(actor);
  const [students, enrolled, completed, pending, courses, batches] = await Promise.all([
    Enrollment.distinct('student', scope),
    Enrollment.countDocuments({ ...scope, status: { $in: ['active', 'completed'] } }),
    Enrollment.countDocuments({ ...scope, status: 'completed' }),
    Enrollment.countDocuments({ ...scope, status: 'pending' }),
    actor.role === 'admin' ? Course.countDocuments() : teacherCourseIds(actor._id).then((ids) => ids.length),
    actor.role === 'admin' ? Batch.countDocuments() : Batch.countDocuments({ teacher: actor._id }),
  ]);
  const trend = await monthTrend(Enrollment, scope);
  return {
    totalStudents: { value: students.length, trend },
    enrolled: { value: enrolled, trend: await monthTrend(Enrollment, { ...scope, status: { $in: ['active', 'completed'] } }) },
    courses: { value: courses },
    batches: { value: batches, trend: 0 },
    completed: { value: completed, trend: await monthTrend(Enrollment, { ...scope, status: 'completed' }, 'completedAt') },
    pending: { value: pending, trend: await monthTrend(Enrollment, { ...scope, status: 'pending' }) },
  };
}

export async function rosterGroups(actor, by) {
  const scope = await rosterScope(actor);
  const field = by === 'batch' ? '$batch' : '$course';
  const rows = await Enrollment.aggregate([
    { $match: { ...scope, ...(by === 'batch' ? { batch: { $ne: null } } : {}) } },
    {
      $group: {
        _id: field,
        students: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        avgProgress: { $avg: '$progress' },
      },
    },
    { $sort: { students: -1 } },
  ]);
  const Model = by === 'batch' ? Batch : Course;
  const docs = await Model.find({ _id: { $in: toIds(rows.map((r) => r._id)) } }).select('name title category');
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return rows.map((r) => {
    const doc = byId.get(String(r._id));
    return { id: String(r._id), name: doc?.name || doc?.title || 'Unknown', category: doc?.category, students: r.students, completed: r.completed, active: r.active, avgProgress: Math.round(r.avgProgress || 0) };
  });
}
