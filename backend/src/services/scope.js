import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Enrollment from '../models/Enrollment.js';

export async function teacherCourseIds(teacherId) {
  const [direct, viaBatch] = await Promise.all([
    Course.distinct('_id', { $or: [{ instructor: teacherId }, { teachers: teacherId }] }),
    Batch.distinct('course', { teacher: teacherId }),
  ]);
  const map = new Map([...direct, ...viaBatch].map((id) => [String(id), id]));
  return [...map.values()];
}

export async function teacherStudentIds(teacherId) {
  const [courseIds, batchIds] = await Promise.all([teacherCourseIds(teacherId), Batch.distinct('_id', { teacher: teacherId })]);
  return Enrollment.distinct('student', { $or: [{ course: { $in: courseIds } }, { batch: { $in: batchIds } }] });
}

export async function studentCourseIds(studentId) {
  return Enrollment.distinct('course', { student: studentId, status: { $in: ['active', 'completed'] } });
}

export async function hasCourseAccess(studentId, courseId) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId, status: { $in: ['active', 'completed'] } });
  if (!enrollment) return null;
  if (enrollment.accessEnd && enrollment.accessEnd < new Date()) return null;
  return enrollment;
}
