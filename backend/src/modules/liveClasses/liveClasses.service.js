import LiveClass from '../../models/LiveClass.js';
import Enrollment from '../../models/Enrollment.js';
import Attendance from '../../models/Attendance.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import { ClassChat } from '../../models/Engagement.js';
import { ApiError } from '../../utils/ApiError.js';
import { dateRangeFilter, mergeFilters, paginate, searchFilter } from '../../utils/query.js';
import { randomId, slugify } from '../../utils/slug.js';
import { JOIN_WINDOW_MINUTES, LATE_AFTER_MINUTES, PREVIEW_SECONDS } from '../../config/constants.js';
import ClassPreview from '../../models/ClassPreview.js';
import { notifyUsers } from '../../services/notify.js';
import { emitToRoom } from '../../services/realtime.js';
import { buildJitsiJoin } from '../../services/jitsi.js';
import { teacherCourseIds } from '../../services/scope.js';

const POPULATE = [
  { path: 'course', select: 'title category thumbnail slug price' },
  { path: 'teacher', select: 'name avatar' },
  { path: 'batch', select: 'name' },
];

const MINUTE = 60000;

const eligibleFilter = (cls) => ({
  course: cls.course._id || cls.course,
  status: { $in: ['active', 'completed'] },
  ...(cls.batch ? { batch: cls.batch._id || cls.batch } : {}),
});

const activeAccess = () => ({ $or: [{ accessEnd: null }, { accessEnd: { $exists: false } }, { accessEnd: { $gt: new Date() } }] });

async function studentScope(studentId) {
  const enrollments = await Enrollment.find({ student: studentId, status: { $in: ['active', 'completed'] }, ...activeAccess() });
  if (!enrollments.length) return { _id: null };
  return {
    $or: enrollments.map((e) => ({
      course: e.course,
      $or: [{ batch: null }, { batch: { $exists: false } }, ...(e.batch ? [{ batch: e.batch }] : [])],
    })),
  };
}

async function actorScope(actor) {
  if (actor.role === 'admin') return null;
  if (actor.role === 'teacher') return { teacher: actor._id };
  return studentScope(actor._id);
}

async function decorate(classes, actor) {
  const ids = classes.map((c) => c._id);
  const [counts, attendance] = await Promise.all([
    Promise.all(classes.map((c) => Enrollment.countDocuments(eligibleFilter(c)))),
    actor.role === 'student' ? Attendance.find({ liveClass: { $in: ids }, student: actor._id }) : [],
  ]);
  const myAttendance = new Map(attendance.map((a) => [String(a.liveClass), a]));
  const now = Date.now();

  return classes.map((c, i) => {
    const json = c.toJSON();
    const opensAt = c.startsAt.getTime() - JOIN_WINDOW_MINUTES * MINUTE;
    return {
      ...json,
      enrolledCount: counts[i],
      startsInMinutes: Math.round((c.startsAt.getTime() - now) / MINUTE),
      canJoin: c.status === 'live' || (c.status === 'upcoming' && actor.role === 'student' && c.platform !== 'jitsi' && now >= opensAt && now <= c.endsAt.getTime()),
      myAttendance: myAttendance.get(String(c._id))?.toJSON() || null,
    };
  });
}

export async function listClasses(actor, query) {
  const filter = mergeFilters(
    await actorScope(actor),
    query.course ? { course: query.course } : null,
    query.batch ? { batch: query.batch } : null,
    actor.role === 'admin' && query.teacher ? { teacher: query.teacher } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    dateRangeFilter('startsAt', query.from, query.to),
    searchFilter(['title', 'topic'], query.search),
  );
  const sort = query.sort === 'startsAt' ? { startsAt: 1 } : { startsAt: -1 };
  const { items, meta } = await paginate(LiveClass, filter, { page: query.page, limit: query.limit, sort, populate: POPULATE });
  return { items: await decorate(items, actor), meta };
}

export async function classesSummary(actor) {
  const scope = (await actorScope(actor)) || {};
  const [total, upcoming, live, completed, cancelled] = await Promise.all(
    [{}, { status: 'upcoming' }, { status: 'live' }, { status: 'completed' }, { status: 'cancelled' }].map((f) => LiveClass.countDocuments({ ...scope, ...f })),
  );
  const classIds = await LiveClass.distinct('_id', scope);
  const attended = await Attendance.countDocuments({ liveClass: { $in: classIds }, status: { $in: ['present', 'late'] } });
  return { total: { value: total }, upcoming: { value: upcoming }, live: { value: live }, completed: { value: completed }, cancelled: { value: cancelled }, attended: { value: attended } };
}

export async function upcomingClasses(actor, limit = 3) {
  const scope = await actorScope(actor);
  const classes = await LiveClass.find(mergeFilters(scope, { status: { $in: ['upcoming', 'live'] }, startsAt: { $gte: new Date(Date.now() - 4 * 3600000) } }))
    .sort({ startsAt: 1 })
    .limit(limit)
    .populate(POPULATE);
  return decorate(classes, actor);
}

export async function todaySchedule(actor) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 3600000);
  const scope = await actorScope(actor);
  const classes = await LiveClass.find(mergeFilters(scope, { startsAt: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } }))
    .sort({ startsAt: 1 })
    .populate(POPULATE);
  return decorate(classes, actor);
}

async function loadClass(id) {
  const cls = await LiveClass.findById(id).populate(POPULATE);
  if (!cls) throw ApiError.notFound('Class not found');
  return cls;
}

// Who may use this class: staff, an enrolled/paid student, anyone for a free demo, or nobody (null).
async function entitlement(cls, actor) {
  if (actor.role === 'admin') return 'staff';
  if (actor.role === 'teacher') return String(cls.teacher._id) === String(actor._id) ? 'staff' : null;
  if (cls.isFreeDemo) return 'free';
  const allowed = await Enrollment.exists({ ...eligibleFilter(cls), student: actor._id, ...activeAccess() });
  const batchless = await Enrollment.exists({ course: cls.course._id, student: actor._id, status: { $in: ['active', 'completed'] }, ...activeAccess() });
  return allowed || (batchless && !cls.batch) ? 'enrolled' : null;
}

// Unpaid students may open a live in-app class for a short preview only; everything else needs access.
async function assertCanView(cls, actor, { allowPreview = false } = {}) {
  const access = await entitlement(cls, actor);
  if (access) return access;
  if (actor.role === 'student' && allowPreview && cls.platform === 'jitsi') return null;
  throw actor.role === 'student' ? ApiError.forbidden('You are not enrolled in this class') : ApiError.forbidden();
}

async function previewState(cls, actor) {
  const trial = await ClassPreview.findOne({ liveClass: cls._id, student: actor._id });
  const used = trial ? Math.floor((Date.now() - trial.startedAt.getTime()) / 1000) : 0;
  const secondsLeft = Math.max(0, PREVIEW_SECONDS - used);
  return { totalSeconds: PREVIEW_SECONDS, secondsLeft, started: Boolean(trial), available: cls.platform === 'jitsi' && cls.status === 'live' && secondsLeft > 0 };
}

export async function getClass(id, actor) {
  const cls = await loadClass(id);
  const access = await assertCanView(cls, actor, { allowPreview: true });
  const [decorated] = await decorate([cls], actor);
  if (actor.role === 'student' && decorated.platform !== 'jitsi' && !decorated.canJoin) delete decorated.meetingLink;
  if (actor.role === 'student' && !access) {
    decorated.preview = await previewState(cls, actor);
    decorated.canJoin = decorated.preview.available;
  }
  return decorated;
}

export async function classStudents(id, actor) {
  const cls = await loadClass(id);
  await assertCanView(cls, actor);
  if (actor.role === 'student') throw ApiError.forbidden();
  const enrollments = await Enrollment.find(eligibleFilter(cls)).populate('student', 'name email phone avatar studentCode');
  const attendance = await Attendance.find({ liveClass: id });
  const byStudent = new Map(attendance.map((a) => [String(a.student), a]));
  const rows = enrollments
    .filter((e) => e.student)
    .map((e) => {
      const a = byStudent.get(String(e.student._id));
      return { student: e.student.toJSON(), attendance: a?.toJSON() || null, joined: Boolean(a?.joinTime && !a?.leaveTime) };
    });

  // Free demo guests are not enrolled, so list them from their attendance records.
  const enrolledIds = new Set(rows.map((r) => r.student.id));
  const guestIds = attendance.map((a) => String(a.student)).filter((sid) => !enrolledIds.has(sid));
  if (cls.isFreeDemo && guestIds.length) {
    const guests = await User.find({ _id: { $in: guestIds } }).select('name email phone avatar studentCode');
    guests.forEach((g) => {
      const a = byStudent.get(String(g._id));
      rows.push({ student: g.toJSON(), attendance: a?.toJSON() || null, joined: Boolean(a?.joinTime && !a?.leaveTime), guest: true });
    });
  }
  return rows;
}

export async function classAccess(id, actor) {
  const cls = await loadClass(id);
  const course = await Course.findById(cls.course._id).select('title slug price mrp');
  const base = { classId: cls.id, status: cls.status, isFreeDemo: Boolean(cls.isFreeDemo), course: course?.toJSON() };
  try {
    await assertCanView(cls, actor);
    return { ...base, allowed: true, reason: actor.role !== 'student' ? 'staff' : cls.isFreeDemo ? 'free' : 'enrolled' };
  } catch (err) {
    if (err.status !== 403) throw err;
    const everEnrolled = actor.role === 'student' && (await Enrollment.exists({ student: actor._id, course: cls.course._id, status: { $in: ['active', 'completed'] } }));
    const preview = actor.role === 'student' ? await previewState(cls, actor) : undefined;
    return { ...base, allowed: false, reason: everEnrolled ? 'expired' : 'not_enrolled', preview };
  }
}

async function assertNoOverlap({ teacher, startsAt, durationMin, ignoreId }) {
  const end = new Date(startsAt.getTime() + durationMin * MINUTE);
  const dayStart = new Date(startsAt.getTime() - 8 * 3600000);
  const nearby = await LiveClass.find({
    teacher,
    status: { $in: ['upcoming', 'live'] },
    startsAt: { $gte: dayStart, $lt: end },
    ...(ignoreId ? { _id: { $ne: ignoreId } } : {}),
  });
  const clash = nearby.find((c) => c.startsAt < end && c.endsAt > startsAt);
  if (clash) throw ApiError.conflict(`Teacher already has "${clash.title}" scheduled at that time`);
}

async function assertTeachesCourse(teacherId, courseId) {
  const own = await teacherCourseIds(teacherId);
  if (!own.some((id) => String(id) === String(courseId))) throw ApiError.forbidden('You are not assigned to this course');
}

export async function createClass(actor, payload) {
  const teacherId = actor.role === 'teacher' ? actor._id : payload.teacher;
  if (!teacherId) throw ApiError.badRequest('Select a teacher');
  const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  if (actor.role === 'teacher') {
    if (teacher.teacher?.permissions?.scheduleClasses === false) throw ApiError.forbidden('You are not allowed to schedule classes');
    await assertTeachesCourse(teacherId, payload.course);
  }
  const course = await Course.findById(payload.course);
  if (!course) throw ApiError.notFound('Course not found');
  await assertNoOverlap({ teacher: teacherId, startsAt: payload.startsAt, durationMin: payload.durationMin });

  const cls = await LiveClass.create({
    ...payload,
    teacher: teacherId,
    roomName: payload.platform === 'jitsi' ? `ecomedu-${slugify(payload.title).slice(0, 30)}-${randomId(6)}` : undefined,
    meetingLink: payload.platform === 'jitsi' ? undefined : payload.meetingLink,
  });
  await Course.updateOne({ _id: course._id }, { $inc: { liveClassesCount: 1 } });

  if (payload.notifyStudents) {
    const students = await Enrollment.distinct('student', eligibleFilter({ course: course._id, batch: payload.batch }));
    await notifyUsers(students, {
      title: 'New live class scheduled',
      body: `${cls.title} on ${cls.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
      type: 'live-class',
      link: `/app/live-classes?class=${cls.id}`,
      section: 'live-classes',
      ref: cls.id,
    });
  }
  return getClass(cls.id, actor);
}

export async function updateClass(id, actor, payload) {
  const cls = await loadClass(id);
  await assertCanView(cls, actor);
  if (actor.role === 'student') throw ApiError.forbidden();
  if (['completed', 'cancelled'].includes(cls.status)) throw ApiError.conflict(`A ${cls.status} class cannot be edited`);
  if (actor.role === 'teacher') delete payload.teacher;

  const next = { ...payload };
  if (next.startsAt || next.durationMin) {
    await assertNoOverlap({
      teacher: next.teacher || cls.teacher._id,
      startsAt: next.startsAt || cls.startsAt,
      durationMin: next.durationMin || cls.durationMin,
      ignoreId: id,
    });
  }
  Object.assign(cls, next);
  if (next.batch === null) cls.batch = undefined;
  await cls.save();

  if (next.status === 'cancelled') {
    const students = await Enrollment.distinct('student', eligibleFilter(cls));
    await notifyUsers(students, { title: 'Class cancelled', body: `${cls.title} has been cancelled.`, type: 'live-class', link: '/app/live-classes', section: 'live-classes', ref: id });
    emitToRoom(`class:${id}`, 'class:ended', { id, status: 'cancelled' });
  }
  return getClass(id, actor);
}

export async function startClass(id, actor) {
  const cls = await loadClass(id);
  await assertCanView(cls, actor);
  if (actor.role === 'student') throw ApiError.forbidden();
  if (cls.status === 'live') return getClass(id, actor);
  if (cls.status !== 'upcoming') throw ApiError.conflict(`A ${cls.status} class cannot be started`);

  cls.status = 'live';
  cls.startedAt = new Date();
  if (cls.platform === 'jitsi' && !cls.roomName) cls.roomName = `ecomedu-${randomId(10)}`;
  await cls.save();

  const students = await Enrollment.distinct('student', eligibleFilter(cls));
  await notifyUsers(students, { title: 'Class is live now', body: `${cls.title} has started. Join now!`, type: 'live-class', link: `/app/live-classes?class=${id}`, section: 'live-classes', ref: id });
  emitToRoom(`course:${cls.course._id}`, 'class:live', { id });
  return getClass(id, actor);
}

export async function endClass(id, actor) {
  const cls = await loadClass(id);
  await assertCanView(cls, actor);
  if (actor.role === 'student') throw ApiError.forbidden();
  if (cls.status !== 'live') throw ApiError.conflict('Only a live class can be ended');

  const endedAt = new Date();
  cls.status = 'completed';
  cls.endedAt = endedAt;
  const teacher = await User.findById(cls.teacher._id);
  cls.earning = teacher?.teacher?.ratePerClass || 0;
  await cls.save();

  const open = await Attendance.find({ liveClass: id, sessionStart: { $exists: true }, leaveTime: { $exists: false } });
  await Promise.all(
    open.map((a) => {
      a.leaveTime = endedAt;
      a.durationMin += Math.round((endedAt - a.sessionStart) / MINUTE);
      return a.save();
    }),
  );

  const eligible = await Enrollment.distinct('student', eligibleFilter(cls));
  const recorded = new Set((await Attendance.distinct('student', { liveClass: id })).map(String));
  const missing = eligible.filter((s) => !recorded.has(String(s)));
  if (missing.length) await Attendance.insertMany(missing.map((student) => ({ liveClass: id, student, status: 'absent' })));

  emitToRoom(`class:${id}`, 'class:ended', { id, status: 'completed' });
  return getClass(id, actor);
}

export async function joinClass(id, actor) {
  const cls = await loadClass(id);
  const access = await assertCanView(cls, actor, { allowPreview: true });
  const isStaff = actor.role !== 'student';

  if (cls.status === 'cancelled' || cls.status === 'completed') throw ApiError.conflict(`This class is ${cls.status}`);

  // Unpaid student: a short, view-only preview whose clock survives refreshes.
  if (actor.role === 'student' && !access) {
    if (cls.status !== 'live') throw ApiError.conflict('The class has not started yet');
    await ClassPreview.updateOne({ liveClass: cls._id, student: actor._id }, { $setOnInsert: { startedAt: new Date() } }, { upsert: true });
    const preview = await previewState(cls, actor);
    if (preview.secondsLeft <= 0) throw new ApiError(402, 'Your free preview is over. Enroll in the course to keep watching.');
    return {
      classId: id,
      provider: 'jitsi',
      title: cls.title,
      status: cls.status,
      preview,
      course: cls.course.toJSON(),
      jitsi: buildJitsiJoin({ roomName: cls.roomName, user: actor, moderator: false, ttlSeconds: preview.secondsLeft + 20 }),
    };
  }

  if (actor.role === 'student') {
    const opensAt = cls.startsAt.getTime() - JOIN_WINDOW_MINUTES * MINUTE;
    const external = cls.platform !== 'jitsi';
    if (cls.status !== 'live' && !(external && Date.now() >= opensAt)) throw ApiError.conflict('The class has not started yet');
    const returning = await Attendance.exists({ liveClass: id, student: actor._id, sessionStart: { $exists: true } });
    const seated = await Attendance.countDocuments({ liveClass: id, sessionStart: { $exists: true } });
    if (!returning && seated >= cls.maxStudents) throw ApiError.conflict(cls.isFreeDemo ? 'This free demo class is full' : 'This class is full');

    const now = new Date();
    const reference = cls.startedAt || cls.startsAt;
    const status = now.getTime() - reference.getTime() > LATE_AFTER_MINUTES * MINUTE ? 'late' : 'present';
    const record = (await Attendance.findOne({ liveClass: id, student: actor._id })) || new Attendance({ liveClass: id, student: actor._id });
    if (!record.joinTime) record.joinTime = now;
    if (['absent', 'not_marked'].includes(record.status)) record.status = status;
    record.sessionStart = now;
    record.leaveTime = undefined;
    await record.save();
    emitToRoom(`class:${id}`, 'class:participant', { studentId: actor.id, name: actor.name, joined: true });
  }

  if (cls.platform !== 'jitsi') return { classId: id, provider: 'external', url: cls.meetingLink, title: cls.title };
  return { classId: id, provider: 'jitsi', title: cls.title, status: cls.status, jitsi: buildJitsiJoin({ roomName: cls.roomName, user: actor, moderator: isStaff }) };
}

export async function leaveClass(id, actor) {
  if (actor.role !== 'student') return;
  const attendance = await Attendance.findOne({ liveClass: id, student: actor._id, leaveTime: { $exists: false }, sessionStart: { $exists: true } });
  if (!attendance) return;
  const now = new Date();
  attendance.leaveTime = now;
  attendance.durationMin += Math.max(0, Math.round((now - attendance.sessionStart) / MINUTE));
  await attendance.save();
  emitToRoom(`class:${id}`, 'class:participant', { studentId: actor.id, name: actor.name, joined: false });
}

export async function chatHistory(id, actor) {
  const cls = await loadClass(id);
  await assertCanView(cls, actor);
  const messages = await ClassChat.find({ liveClass: id }).sort({ createdAt: 1 }).limit(200).populate('sender', 'name avatar role');
  return messages;
}

export async function postChat(id, actor, { text, kind }) {
  const cls = await loadClass(id);
  await assertCanView(cls, actor);
  const message = await ClassChat.create({ liveClass: id, sender: actor._id, text, kind });
  const populated = await message.populate('sender', 'name avatar role');
  emitToRoom(`class:${id}`, 'class:chat', populated.toJSON());
  return populated;
}
