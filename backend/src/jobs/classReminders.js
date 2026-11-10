import env from '../config/env.js';
import Enrollment from '../models/Enrollment.js';
import LiveClass from '../models/LiveClass.js';
import { mailUser } from '../services/mail/index.js';

const REMINDER_MINUTES = 30;

// About half an hour before a class, the teacher and every enrolled student get a reminder with the join link.
// Each class is claimed atomically first, so it is reminded once even if the job overlaps.
export async function sendClassReminders() {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_MINUTES * 60000);
  const due = await LiveClass.find({ status: 'upcoming', startsAt: { $gt: now, $lte: horizon }, reminderSentAt: { $exists: false } }).select('_id');

  for (const { _id } of due) {
    const cls = await LiveClass.findOneAndUpdate({ _id, reminderSentAt: { $exists: false }, status: 'upcoming' }, { reminderSentAt: now }, { new: true })
      .populate('teacher', 'name email role status')
      .populate('course', 'title');
    if (!cls) continue;

    const enrollments = await Enrollment.find({
      course: cls.course._id,
      status: { $in: ['active', 'completed'] },
      ...(cls.batch ? { batch: cls.batch } : {}),
      $or: [{ accessEnd: null }, { accessEnd: { $exists: false } }, { accessEnd: { $gt: now } }],
    }).populate('student', 'name email role status');

    const minutes = Math.max(1, Math.round((cls.startsAt.getTime() - now.getTime()) / 60000));
    const base = { title: cls.title, course: cls.course.title, startsAt: cls.startsAt, durationMin: cls.durationMin, minutes };
    const students = enrollments.map((e) => e.student).filter((s) => s && s.role === 'student');

    if (cls.teacher) {
      await mailUser(cls.teacher, 'classReminderTeacher', { ...base, students: students.length, startUrl: `${env.teacherUrl}/live-classes?class=${cls.id}` }, { bulk: true });
    }
    if (cls.notifyStudents) {
      for (const student of students) {
        await mailUser(student, 'classReminderStudent', { ...base, teacher: cls.teacher?.name, joinUrl: `${env.siteUrl}/join/${cls.id}` }, { bulk: true });
      }
    }
  }
}
