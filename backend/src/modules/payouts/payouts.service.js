import mongoose from 'mongoose';
import Payout from '../../models/Payout.js';
import LiveClass from '../../models/LiveClass.js';
import User from '../../models/User.js';
import { getSettings } from '../../services/settings.js';
import { ApiError } from '../../utils/ApiError.js';
import { dateRangeFilter, escapeRegex, mergeFilters, monthBounds, paginate, percentChange } from '../../utils/query.js';
import { round2 } from '../../utils/format.js';
import { notifyUsers } from '../../services/notify.js';
import { queueMail } from '../../services/mail/index.js';

const POPULATE = [{ path: 'teacher', select: 'name email avatar teacher.bank' }];

const monthLabel = (date) => date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

export async function listPayouts(actor, query) {
  let teacherSearch = null;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    const teachers = await User.distinct('_id', { role: 'teacher', $or: [{ name: regex }, { email: regex }] });
    teacherSearch = { $or: [{ teacher: { $in: teachers } }, { transactionId: regex }] };
  }
  const filter = mergeFilters(
    actor.role === 'teacher' ? { teacher: actor._id } : null,
    actor.role === 'admin' && query.teacher ? { teacher: query.teacher } : null,
    query.method ? { method: query.method } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    dateRangeFilter('periodTo', query.from, query.to),
    teacherSearch,
  );
  return paginate(Payout, filter, { page: query.page, limit: query.limit, sort: { periodTo: -1, createdAt: -1 }, populate: POPULATE });
}

async function monthSums(match, field, start, end, dateField = 'createdAt') {
  const [row] = await Payout.aggregate([{ $match: { ...match, [dateField]: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: `$${field}` }, count: { $sum: 1 } } }]);
  return row || { total: 0, count: 0 };
}

async function classEarnings(start, end, extra = {}) {
  const [row] = await LiveClass.aggregate([
    { $match: { status: 'completed', endedAt: { $gte: start, $lt: end }, ...extra } },
    { $group: { _id: null, total: { $sum: '$earning' }, count: { $sum: 1 } } },
  ]);
  return row || { total: 0, count: 0 };
}

export async function payoutsSummary() {
  const { platformFeePercent: feePercent } = await getSettings();
  const cur = monthBounds(0);
  const prev = monthBounds(-1);
  const [earnCur, earnPrev, paidCur, paidPrev, teachersPaid, unpaid, openPayouts] = await Promise.all([
    classEarnings(cur.start, cur.end),
    classEarnings(prev.start, prev.end),
    monthSums({ status: 'paid' }, 'amount', cur.start, cur.end, 'payoutDate'),
    monthSums({ status: 'paid' }, 'amount', prev.start, prev.end, 'payoutDate'),
    Payout.distinct('teacher', { status: 'paid', payoutDate: { $gte: cur.start, $lt: cur.end } }),
    LiveClass.aggregate([{ $match: { status: 'completed', payout: { $exists: false } } }, { $group: { _id: null, total: { $sum: '$earning' } } }]),
    Payout.aggregate([{ $match: { status: { $in: ['pending', 'processing', 'failed'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  const unpaidNet = round2((unpaid[0]?.total || 0) * (1 - feePercent / 100));
  const pending = round2((openPayouts[0]?.total || 0) + unpaidNet);
  return {
    totalEarnings: { value: earnCur.total, trend: percentChange(earnCur.total, earnPrev.total) },
    totalPaid: { value: paidCur.total, trend: percentChange(paidCur.total, paidPrev.total) },
    pending: { value: pending },
    teachersPaid: { value: teachersPaid.length },
  };
}

export async function topTeachers(limit = 5) {
  const rows = await LiveClass.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$teacher', earnings: { $sum: '$earning' }, classes: { $sum: 1 } } },
    { $sort: { earnings: -1 } },
    { $limit: limit },
  ]);
  const teachers = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name avatar');
  const byId = new Map(teachers.map((t) => [String(t._id), t]));
  return rows.map((r) => ({ teacher: byId.get(String(r._id))?.toJSON(), earnings: r.earnings, classes: r.classes }));
}

export async function generatePayouts({ from, to, teacherId, method = 'Bank Transfer' }) {
  const { platformFeePercent: feePercent } = await getSettings();
  const created = [];
  const teacherFilter = teacherId ? { teacher: toObjectId(teacherId) } : {};
  const groups = await LiveClass.aggregate([
    { $match: { status: 'completed', payout: { $exists: false }, endedAt: { $gte: from, $lte: to }, earning: { $gt: 0 }, ...teacherFilter } },
    { $group: { _id: '$teacher', classes: { $push: '$_id' }, earnings: { $sum: '$earning' } } },
  ]);
  for (const group of groups) {
    const deductions = round2((group.earnings * feePercent) / 100);
    const payout = await Payout.create({
      teacher: group._id,
      periodFrom: from,
      periodTo: to,
      periodLabel: monthLabel(to),
      classesConducted: group.classes.length,
      earnings: group.earnings,
      deductions,
      amount: round2(group.earnings - deductions),
      method,
      status: 'pending',
    });
    await LiveClass.updateMany({ _id: { $in: group.classes } }, { payout: payout._id });
    created.push(payout);
  }
  return created;
}

export async function processPayout(id, { status, method, transactionId, failureReason }) {
  const payout = await Payout.findById(id);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status === 'paid') throw ApiError.conflict('This payout is already paid');
  if (status === 'paid' && !transactionId) throw ApiError.badRequest('Transaction / UTR id is required to mark a payout as paid');

  payout.status = status;
  if (method) payout.method = method;
  if (transactionId) payout.transactionId = transactionId;
  if (status === 'paid') payout.payoutDate = new Date();
  if (status === 'failed') payout.failureReason = failureReason || 'Payout failed';
  await payout.save();

  if (status === 'paid') {
    await notifyUsers([payout.teacher], { title: 'Payout sent', body: `₹${payout.amount} for ${payout.periodLabel} has been paid.`, type: 'payout', link: '/earnings', section: 'earnings', ref: payout.id });
  }
  if (status === 'paid' || status === 'failed') {
    const teacher = await User.findById(payout.teacher).select('name email role status');
    const info = { period: payout.periodLabel, amount: payout.amount, classes: payout.classesConducted, method: payout.method, transactionId: payout.transactionId, paidAt: payout.payoutDate, reason: payout.failureReason };
    if (teacher) queueMail(teacher, status === 'paid' ? 'payoutPaid' : 'payoutFailed', info);
  }
  return payout.populate(POPULATE);
}

export async function retryPayout(id) {
  const payout = await Payout.findById(id);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status !== 'failed') throw ApiError.conflict('Only failed payouts can be retried');
  payout.status = 'pending';
  payout.failureReason = undefined;
  await payout.save();
  return payout.populate(POPULATE);
}

function periodRange(period) {
  const now = new Date();
  if (period === 'last_month') return monthBounds(-1);
  if (period === 'year') return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
  if (period === 'all') return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  return monthBounds(0);
}

export async function teacherOverview(teacherId, period = 'month') {
  const { platformFeePercent: feePercent } = await getSettings();
  const id = toObjectId(teacherId);
  const cur = monthBounds(0);
  const prev = monthBounds(-1);
  const range = periodRange(period);

  const [allTime, paidAll, unpaid, openPayouts, thisMonth, lastMonth, inPeriod, byCourse, paidInPeriod, nextPayout] = await Promise.all([
    LiveClass.aggregate([{ $match: { teacher: id, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$earning' }, count: { $sum: 1 } } }]),
    Payout.aggregate([{ $match: { teacher: id, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    LiveClass.aggregate([{ $match: { teacher: id, status: 'completed', payout: { $exists: false } } }, { $group: { _id: null, total: { $sum: '$earning' } } }]),
    Payout.aggregate([{ $match: { teacher: id, status: { $in: ['pending', 'processing', 'failed'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    classEarnings(cur.start, cur.end, { teacher: id }),
    classEarnings(prev.start, prev.end, { teacher: id }),
    classEarnings(range.start, range.end, { teacher: id }),
    LiveClass.aggregate([
      { $match: { teacher: id, status: 'completed', endedAt: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: '$course', earnings: { $sum: '$earning' }, classes: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
    ]),
    Payout.aggregate([{ $match: { teacher: id, status: 'paid', payoutDate: { $gte: range.start, $lt: range.end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payout.findOne({ teacher: id, status: { $in: ['pending', 'processing'] } }).sort({ periodTo: 1 }),
  ]);

  const unpaidNet = round2((unpaid[0]?.total || 0) * (1 - feePercent / 100));
  const pendingAmount = round2((openPayouts[0]?.total || 0) + unpaidNet);
  const courses = await mongoose.model('Course').find({ _id: { $in: byCourse.map((c) => c._id) } }).select('title');
  const courseTitle = new Map(courses.map((c) => [String(c._id), c.title]));
  const nextMonth = new Date(cur.end.getFullYear(), cur.end.getMonth(), 5);

  return {
    cards: {
      totalEarnings: { value: allTime[0]?.total || 0, trend: percentChange(thisMonth.total, lastMonth.total) },
      totalPayouts: { value: paidAll[0]?.total || 0, trend: 0 },
      pendingPayout: { value: pendingAmount },
      thisMonth: { value: thisMonth.total, trend: percentChange(thisMonth.total, lastMonth.total) },
      completedClasses: { value: allTime[0]?.count || 0 },
    },
    summary: { classes: inPeriod.count, earnings: inPeriod.total, paid: paidInPeriod[0]?.total || 0, pending: round2(Math.max(0, inPeriod.total - (paidInPeriod[0]?.total || 0))) },
    breakdown: byCourse.map((c) => ({
      courseId: String(c._id),
      title: courseTitle.get(String(c._id)) || 'Course',
      earnings: c.earnings,
      classes: c.classes,
      share: inPeriod.total ? Math.round((c.earnings / inPeriod.total) * 100) : 0,
    })),
    upcoming: { amount: pendingAmount, expectedDate: nextPayout?.periodTo ? new Date(nextPayout.periodTo.getFullYear(), nextPayout.periodTo.getMonth() + 1, 5) : nextMonth },
  };
}

export async function teacherEarningRows(teacherId, view) {
  const { platformFeePercent: feePercent } = await getSettings();
  const id = toObjectId(teacherId);
  if (view === 'course') {
    const rows = await LiveClass.aggregate([
      { $match: { teacher: id, status: 'completed' } },
      { $group: { _id: '$course', earnings: { $sum: '$earning' }, classes: { $sum: 1 } } },
      { $sort: { earnings: -1 } },
    ]);
    const courses = await mongoose.model('Course').find({ _id: { $in: rows.map((r) => r._id) } }).select('title');
    const titles = new Map(courses.map((c) => [String(c._id), c.title]));
    return rows.map((r) => ({ id: String(r._id), course: titles.get(String(r._id)), classes: r.classes, earnings: r.earnings }));
  }
  if (view === 'monthly') {
    const rows = await LiveClass.aggregate([
      { $match: { teacher: id, status: 'completed' } },
      { $group: { _id: { y: { $year: '$endedAt' }, m: { $month: '$endedAt' } }, earnings: { $sum: '$earning' }, classes: { $sum: 1 } } },
      { $sort: { '_id.y': -1, '_id.m': -1 } },
      { $limit: 12 },
    ]);
    return rows.map((r) => {
      const gross = r.earnings;
      const fee = round2((gross * feePercent) / 100);
      return { id: `${r._id.y}-${r._id.m}`, month: monthLabel(new Date(r._id.y, r._id.m - 1, 1)), classes: r.classes, earnings: gross, deductions: fee, net: round2(gross - fee) };
    });
  }
  const classes = await LiveClass.find({ teacher: id, status: 'completed' }).sort({ endedAt: -1 }).limit(50).populate('course', 'title').populate('payout', 'status');
  return classes.map((c) => ({ id: c.id, title: c.title, course: c.course?.title, date: c.endedAt || c.startsAt, earning: c.earning, payoutStatus: c.payout?.status || 'unbilled' }));
}
