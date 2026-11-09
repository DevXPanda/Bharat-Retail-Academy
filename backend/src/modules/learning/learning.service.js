import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import Attendance from '../../models/Attendance.js';
import Certificate from '../../models/Certificate.js';
import LiveClass from '../../models/LiveClass.js';
import { Review } from '../../models/Engagement.js';
import { ApiError } from '../../utils/ApiError.js';
import { hasCourseAccess } from '../../services/scope.js';
import { notifyUsers } from '../../services/notify.js';
import User from '../../models/User.js';
import { issueCertificate } from '../certificates/certificates.service.js';
import { upcomingClasses } from '../liveClasses/liveClasses.service.js';

export async function myCourses(student) {
  const enrollments = await Enrollment.find({ student: student._id })
    .sort({ updatedAt: -1 })
    .populate({ path: 'course', select: 'title slug category thumbnail lessonsCount liveClassesCount instructor rating', populate: { path: 'instructor', select: 'name avatar' } })
    .populate('batch', 'name');
  return enrollments.filter((e) => e.course).map((e) => ({ ...e.toJSON(), expired: Boolean(e.accessEnd && e.accessEnd < new Date()) }));
}

export async function courseContent(student, courseId) {
  const enrollment = await hasCourseAccess(student._id, courseId);
  if (!enrollment) throw ApiError.forbidden('You do not have access to this course');
  const course = await Course.findById(courseId).populate('instructor', 'name avatar teacher.designation');
  if (!course) throw ApiError.notFound('Course not found');
  const myReview = await Review.findOne({ course: courseId, student: student._id });
  return { course, enrollment, myReview };
}

export async function updateProgress(student, courseId, { lessonId, completed }) {
  const enrollment = await hasCourseAccess(student._id, courseId);
  if (!enrollment) throw ApiError.forbidden('You do not have access to this course');
  const course = await Course.findById(courseId);
  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => String(l._id)));
  if (!lessonIds.includes(lessonId)) throw ApiError.notFound('Lesson not found');

  const set = new Set(enrollment.completedLessons);
  if (completed) set.add(lessonId);
  else set.delete(lessonId);
  enrollment.completedLessons = [...set].filter((id) => lessonIds.includes(id));
  const logged = new Set((enrollment.lessonLog || []).map((l) => l.lesson));
  enrollment.lessonLog = (enrollment.lessonLog || []).filter((l) => set.has(l.lesson));
  if (completed && !logged.has(lessonId)) enrollment.lessonLog.push({ lesson: lessonId, completedAt: new Date() });
  enrollment.progress = lessonIds.length ? Math.round((enrollment.completedLessons.length / lessonIds.length) * 100) : 0;

  if (enrollment.progress === 100 && enrollment.status !== 'completed') {
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    if (course.settings?.certificate) {
      await issueCertificate({ studentId: student._id, courseId, batchId: enrollment.batch, status: 'pending' });
      const admins = await User.distinct('_id', { role: 'admin' });
      await notifyUsers(admins, { title: 'Certificate awaiting verification', body: `${student.name} completed ${course.title}.`, type: 'certificate' });
    }
    await notifyUsers([student._id], { title: 'Course completed 🎉', body: `You completed ${course.title}. Your certificate will be issued after verification.`, type: 'certificate', link: '/app/certificates' });
  } else if (enrollment.progress < 100 && enrollment.status === 'completed') {
    enrollment.status = 'active';
    enrollment.completedAt = undefined;
  }
  await enrollment.save();
  return { progress: enrollment.progress, completedLessons: enrollment.completedLessons, status: enrollment.status };
}

export async function studentDashboard(student) {
  const [enrollments, certificates, attended, totalAttendance, upcoming] = await Promise.all([
    myCourses(student),
    Certificate.countDocuments({ student: student._id, status: 'verified' }),
    Attendance.countDocuments({ student: student._id, status: { $in: ['present', 'late'] } }),
    Attendance.countDocuments({ student: student._id }),
    upcomingClasses(student, 4),
  ]);
  const liveNow = await LiveClass.countDocuments({ _id: { $in: upcoming.map((u) => u.id) }, status: 'live' });
  return {
    cards: {
      enrolled: { value: enrollments.length },
      completed: { value: enrollments.filter((e) => e.status === 'completed').length },
      certificates: { value: certificates },
      attendanceRate: { value: totalAttendance ? Math.round((attended / totalAttendance) * 100) : 0 },
      liveNow: { value: liveNow },
    },
    continueLearning: enrollments.filter((e) => e.status === 'active').slice(0, 3),
    upcomingClasses: upcoming,
  };
}
