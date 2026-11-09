import Batch from '../../models/Batch.js';
import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { notifyUsers } from '../../services/notify.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function batchSeatsLeft(batch) {
  const taken = await Enrollment.countDocuments({ batch: batch._id, status: { $in: ['active', 'pending', 'completed'] } });
  return batch.capacity - taken;
}

export async function pickBatch(courseId) {
  const batches = await Batch.find({ course: courseId, status: { $in: ['active', 'upcoming'] } }).sort({ startDate: 1 });
  for (const batch of batches) {
    if ((await batchSeatsLeft(batch)) > 0) return batch;
  }
  return null;
}

export async function enrollStudent({ studentId, courseId, batchId, accessStart, accessEnd, source = 'admin', paymentId, status = 'active' }) {
  const [student, course] = await Promise.all([User.findById(studentId), Course.findById(courseId)]);
  if (!student || student.role !== 'student') throw ApiError.notFound('Student not found');
  if (!course) throw ApiError.notFound('Course not found');

  let batch = null;
  if (batchId) {
    batch = await Batch.findById(batchId);
    if (!batch || String(batch.course) !== String(course._id)) throw ApiError.badRequest('Batch does not belong to this course');
  } else {
    batch = await pickBatch(course._id);
  }

  const existing = await Enrollment.findOne({ student: student._id, course: course._id });
  if (!existing && batch && (await batchSeatsLeft(batch)) <= 0) throw ApiError.conflict('Selected batch is full');

  const start = accessStart ? new Date(accessStart) : new Date();
  const end = accessEnd ? new Date(accessEnd) : new Date(start.getTime() + (course.settings?.accessDays || 365) * DAY_MS);

  const enrollment = await Enrollment.findOneAndUpdate(
    { student: student._id, course: course._id },
    {
      $set: { status, accessStart: start, accessEnd: end, source, ...(paymentId ? { payment: paymentId } : {}), ...(batch ? { batch: batch._id } : {}) },
      $setOnInsert: { progress: 0 },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  if (status === 'active' && student.status !== 'active') {
    student.status = 'active';
    await student.save();
  }

  if (!existing) {
    await notifyUsers([student._id], {
      title: 'Course access granted',
      body: `You now have access to ${course.title}.`,
      type: 'enrollment',
      link: `/app/courses/${course._id}`,
    });
  }

  return enrollment;
}

export async function refreshStudentStatus(studentId) {
  const hasAccess = await Enrollment.exists({ student: studentId, status: { $in: ['active', 'completed'] } });
  await User.updateOne({ _id: studentId, status: { $ne: 'inactive' } }, { status: hasAccess ? 'active' : 'pending' });
}
