import mongoose from 'mongoose';
import User from '../../models/User.js';
import Course from '../../models/Course.js';
import LiveClass from '../../models/LiveClass.js';
import Payout from '../../models/Payout.js';
import Recording from '../../models/Recording.js';
import Assignment from '../../models/Assignment.js';
import { classChatFor, conversationsFor, loginsFor, threadFor } from '../../services/userActivity.js';
import { ApiError } from '../../utils/ApiError.js';
import { mergeFilters, monthTrend, paginate, searchFilter } from '../../utils/query.js';
import { teacherStudentIds } from '../../services/scope.js';
import { queueMail } from '../../services/mail/index.js';

const maskAccount = (n) => (n ? `${'X'.repeat(Math.max(0, n.length - 4))}${n.slice(-4)}` : n);
const isMasked = (n) => /^[X*]+\d{0,4}$/i.test(n || '');

// The full account number never leaves the server: admins see it masked and re-enter it only to change it.
function safeJson(teacher) {
  const json = teacher.toJSON();
  if (json.teacher?.bank?.accountNumber) json.teacher.bank.accountNumber = maskAccount(json.teacher.bank.accountNumber);
  return json;
}

// Splits the incoming body into fields on the user document and fields on the teacher profile.
function splitProfile(payload) {
  const { courseIds, permissions, password, bank, expertise, bio, designation, ratePerClass, experienceYears, company, languages, workExperience, skills, education, certifications, availability, social, ...base } = payload;
  const profile = { expertise, bio, designation, ratePerClass, experienceYears, company, languages, workExperience, skills, education, certifications, availability, social };
  Object.keys(profile).forEach((key) => profile[key] === undefined && delete profile[key]);
  return { courseIds, permissions, password, bank, base, profile };
}

async function decorate(teachers) {
  const ids = teachers.map((t) => t._id);
  const [courses, classCounts] = await Promise.all([
    Course.find({ $or: [{ teachers: { $in: ids } }, { instructor: { $in: ids } }] }).select('title teachers instructor'),
    LiveClass.aggregate([{ $match: { teacher: { $in: ids } } }, { $group: { _id: '$teacher', count: { $sum: 1 } } }]),
  ]);
  const counts = new Map(classCounts.map((c) => [String(c._id), c.count]));
  return teachers.map((teacher) => {
    const assigned = courses.filter(
      (c) => String(c.instructor) === String(teacher._id) || c.teachers.some((t) => String(t) === String(teacher._id)),
    );
    return {
      ...safeJson(teacher),
      assignedCourses: assigned.map((c) => ({ id: c.id, title: c.title })),
      classesCount: counts.get(String(teacher._id)) || 0,
    };
  });
}

async function assignCourses(teacherId, courseIds = []) {
  await Course.updateMany({ teachers: teacherId, _id: { $nin: courseIds } }, { $pull: { teachers: teacherId } });
  if (!courseIds.length) return;
  await Course.updateMany({ _id: { $in: courseIds } }, { $addToSet: { teachers: teacherId } });
  await Course.updateMany({ _id: { $in: courseIds }, instructor: { $exists: false } }, { instructor: teacherId });
  await Course.updateMany({ _id: { $in: courseIds }, instructor: null }, { instructor: teacherId });
}

export async function listTeachers(query) {
  const filter = mergeFilters(
    { role: 'teacher' },
    query.status && query.status !== 'all' ? { status: query.status } : null,
    query.expertise ? { 'teacher.expertise': query.expertise } : null,
    searchFilter(['name', 'email', 'phone'], query.search),
  );
  const { items, meta } = await paginate(User, filter, { page: query.page, limit: query.limit, sort: { createdAt: -1 } });
  return { items: await decorate(items), meta };
}

export async function teachersSummary() {
  const [total, active, pending, inactive] = await Promise.all(
    [{}, { status: 'active' }, { status: 'pending' }, { status: 'inactive' }].map((f) => User.countDocuments({ role: 'teacher', ...f })),
  );
  return { total: { value: total, trend: await monthTrend(User, { role: 'teacher' }) }, active: { value: active }, pending: { value: pending }, inactive: { value: inactive } };
}

export async function createTeacher(payload) {
  const email = payload.email.toLowerCase();
  if (await User.exists({ email })) throw ApiError.conflict('A user with this email already exists');
  const { courseIds, permissions, password, bank, base, profile } = splitProfile(payload);

  const teacher = await User.create({
    ...base,
    email,
    password,
    role: 'teacher',
    mustChangePassword: true,
    teacher: {
      ...profile,
      designation: profile.designation || 'E-Commerce Expert',
      ratePerClass: profile.ratePerClass ?? 1000,
      permissions,
      bank: { accountType: 'Savings Account', verified: false, ...(bank || {}) },
    },
  });
  await assignCourses(teacher._id, courseIds);
  queueMail(teacher, 'teacherCredentials', { email, password });
  return (await decorate([teacher]))[0];
}

export async function getTeacher(id) {
  const teacher = await User.findOne({ _id: id, role: 'teacher' });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  const [decorated] = await decorate([teacher]);
  const teacherId = new mongoose.Types.ObjectId(id);
  const [students, completed, classes, payouts, earned, paid, pending, recordings] = await Promise.all([
    teacherStudentIds(teacher._id),
    LiveClass.countDocuments({ teacher: teacher._id, status: 'completed' }),
    LiveClass.find({ teacher: teacher._id }).sort({ startsAt: -1 }).limit(10).populate('course', 'title'),
    Payout.find({ teacher: teacher._id }).sort({ createdAt: -1 }).limit(10),
    LiveClass.aggregate([{ $match: { teacher: teacherId, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$earning' } } }]),
    Payout.aggregate([{ $match: { teacher: teacherId, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payout.aggregate([{ $match: { teacher: teacherId, status: { $in: ['pending', 'processing'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Recording.countDocuments({ teacher: teacher._id }),
  ]);
  const [loginHistory, conversations, classChat, uploads, assignments] = await Promise.all([
    loginsFor(teacher._id),
    conversationsFor(teacher._id),
    classChatFor(teacher._id),
    Recording.find({ teacher: teacher._id }).sort({ createdAt: -1 }).limit(10).populate('course', 'title'),
    Assignment.find({ teacher: teacher._id }).sort({ createdAt: -1 }).limit(10).populate('course', 'title'),
  ]);
  const rated = await Course.find({ $or: [{ instructor: teacher._id }, { teachers: teacher._id }], ratingCount: { $gt: 0 } }).select('rating');
  return {
    ...decorated,
    stats: { students: students.length, completedClasses: completed, totalPaid: paid[0]?.total || 0, totalEarned: earned[0]?.total || 0, pendingPayout: pending[0]?.total || 0, recordings, rating: rated.length ? Math.round((rated.reduce((sum, c) => sum + c.rating, 0) / rated.length) * 10) / 10 : 0 },
    recentClasses: classes.map((c) => ({ id: c.id, title: c.title, course: c.course?.title, startsAt: c.startsAt, durationMin: c.durationMin, status: c.status, earning: c.earning })),
    payouts: payouts.map((p) => p.toJSON()),
    activity: {
      logins: loginHistory,
      conversations,
      classChat,
      recordings: uploads.map((r) => ({ id: r.id, title: r.title, course: r.course?.title, status: r.status, views: r.views, classDate: r.classDate, durationSec: r.durationSec })),
      assignments: assignments.map((a) => ({ id: a.id, title: a.title, course: a.course?.title, dueDate: a.dueDate, status: a.status, submissions: a.submissions.length })),
    },
  };
}

export async function updateTeacher(id, payload) {
  const teacher = await User.findOne({ _id: id, role: 'teacher' });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  const { courseIds, permissions, password, bank, base, profile } = splitProfile(payload);

  if (base.email && base.email.toLowerCase() !== teacher.email) {
    if (await User.exists({ email: base.email.toLowerCase(), _id: { $ne: id } })) throw ApiError.conflict('Email already in use');
  }
  Object.assign(teacher, base);
  if (password) teacher.password = password;
  teacher.teacher = teacher.teacher || {};
  Object.assign(teacher.teacher, profile);
  if (permissions) teacher.teacher.permissions = { ...teacher.teacher.permissions?.toObject?.(), ...permissions };
  if (bank) {
    const current = teacher.teacher.bank?.toObject?.() || {};
    const next = { ...current, ...bank };
    if (isMasked(bank.accountNumber)) next.accountNumber = current.accountNumber;
    // Changed payout details need to be verified again unless the admin sets the flag explicitly.
    const changed = ['holderName', 'bankName', 'accountNumber', 'ifsc', 'upiId'].some((key) => bank[key] !== undefined && next[key] !== current[key]);
    if (changed && bank.verified === undefined) next.verified = false;
    teacher.teacher.bank = next;
  }
  teacher.markModified('teacher');
  await teacher.save();
  if (courseIds) await assignCourses(teacher._id, courseIds);
  return (await decorate([teacher]))[0];
}

export async function deleteTeacher(id) {
  const [classes, batches] = await Promise.all([LiveClass.countDocuments({ teacher: id }), mongoose.model('Batch').countDocuments({ teacher: id })]);
  if (classes || batches) throw ApiError.conflict('Teacher has classes or batches. Deactivate the account instead.');
  const teacher = await User.findOneAndDelete({ _id: id, role: 'teacher' });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  await Course.updateMany({ teachers: id }, { $pull: { teachers: id } });
  await Course.updateMany({ instructor: id }, { $unset: { instructor: '' } });
}

export const teacherConversation = (teacherId, conversationId) => threadFor(teacherId, conversationId);
