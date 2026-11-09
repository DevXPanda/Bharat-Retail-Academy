import Enrollment from '../models/Enrollment.js';
import LiveClass from '../models/LiveClass.js';
import { syncBatchStatuses } from '../modules/batches/batches.service.js';
import { sendDueAnnouncements } from '../modules/messages/messages.service.js';
import { refreshStudentStatus } from '../modules/enrollments/enrollment.service.js';

async function expireEnrollments() {
  const expired = await Enrollment.find({ status: 'active', accessEnd: { $lt: new Date() } }).select('student');
  if (!expired.length) return;
  await Enrollment.updateMany({ _id: { $in: expired.map((e) => e._id) } }, { status: 'inactive' });
  await Promise.all([...new Set(expired.map((e) => String(e.student)))].map(refreshStudentStatus));
}

async function closeAbandonedClasses() {
  const cutoff = new Date(Date.now() - 6 * 3600000);
  await LiveClass.updateMany({ status: 'upcoming', startsAt: { $lt: cutoff }, startedAt: { $exists: false } }, { status: 'cancelled' });
}

const tasks = [syncBatchStatuses, sendDueAnnouncements, expireEnrollments, closeAbandonedClasses];

async function runAll() {
  for (const task of tasks) {
    try {
      await task();
    } catch (err) {
      console.error(`Scheduler task ${task.name} failed:`, err.message);
    }
  }
}

export function startScheduler(intervalMs = 5 * 60 * 1000) {
  runAll();
  const timer = setInterval(runAll, intervalMs);
  timer.unref();
  return timer;
}
