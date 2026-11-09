import Payment from '../../models/Payment.js';
import Payout from '../../models/Payout.js';
import User from '../../models/User.js';
import LiveClass from '../../models/LiveClass.js';
import Enrollment from '../../models/Enrollment.js';
import Course from '../../models/Course.js';
import { getSettings } from '../../services/settings.js';
import { percentChange } from '../../utils/query.js';
import { round2 } from '../../utils/format.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function topCourseIn(start, end) {
  const [row] = await Payment.aggregate([
    { $match: { status: { $in: ['successful', 'refunded'] }, paidAt: { $gte: start, $lt: end } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);
  if (!row) return null;
  return (await Course.findById(row._id).select('title'))?.title || null;
}

export async function periodStats(start, end) {
  const { gstPercent } = await getSettings();
  // Payments made before GST was stored have no gstAmount, so fall back to the inclusive formula.
  const legacyGst = { $divide: [{ $multiply: ['$amount', gstPercent] }, 100 + gstPercent] };
  const [paid, refunded, payouts, classes, newStudents, topCourse, courseSales] = await Promise.all([
    Payment.aggregate([{ $match: { status: { $in: ['successful', 'refunded'] }, paidAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$amount' }, gst: { $sum: { $ifNull: ['$gstAmount', legacyGst] } }, count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'refunded', 'refund.refundedAt': { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$refund.amount' } } }]),
    Payout.aggregate([{ $match: { status: 'paid', payoutDate: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    LiveClass.countDocuments({ status: 'completed', endedAt: { $gte: start, $lt: end } }),
    User.countDocuments({ role: 'student', createdAt: { $gte: start, $lt: end } }),
    topCourseIn(start, end),
    Payment.countDocuments({ status: { $in: ['successful', 'refunded'] }, paidAt: { $gte: start, $lt: end } }),
  ]);
  const payments = paid[0]?.total || 0;
  const refunds = refunded[0]?.total || 0;
  const teacherPayouts = payouts[0]?.total || 0;
  const gst = round2(paid[0]?.gst || 0);
  return {
    payments,
    gst,
    classes,
    teacherPayouts,
    refunds,
    net: round2(payments - gst - teacherPayouts - refunds),
    newStudents,
    topCourse,
    coursesSold: courseSales,
  };
}

export async function monthlyReport(year) {
  const rows = await Promise.all(
    MONTHS.map(async (month, index) => ({ month, ...(await periodStats(new Date(year, index, 1), new Date(year, index + 1, 1))) })),
  );
  const totals = rows.reduce(
    (acc, r) => ({
      payments: acc.payments + r.payments,
      gst: round2(acc.gst + r.gst),
      classes: acc.classes + r.classes,
      teacherPayouts: acc.teacherPayouts + r.teacherPayouts,
      refunds: acc.refunds + r.refunds,
      net: round2(acc.net + r.net),
      newStudents: acc.newStudents + r.newStudents,
    }),
    { payments: 0, gst: 0, classes: 0, teacherPayouts: 0, refunds: 0, net: 0, newStudents: 0 },
  );
  return { rows, totals };
}

export async function yearlyReport(fromYear, toYear) {
  const years = [];
  for (let y = fromYear; y <= toYear; y += 1) years.push(y);
  const rows = await Promise.all(years.map(async (year) => ({ year, ...(await periodStats(new Date(year, 0, 1), new Date(year + 1, 0, 1))) })));
  const withGrowth = rows.map((row, i) => ({ ...row, growth: i === 0 ? null : percentChange(row.net, rows[i - 1].net) }));
  const totals = rows.reduce(
    (acc, r) => ({ payments: acc.payments + r.payments, gst: round2(acc.gst + r.gst), classes: acc.classes + r.classes, teacherPayouts: acc.teacherPayouts + r.teacherPayouts, refunds: acc.refunds + r.refunds, net: round2(acc.net + r.net), newStudents: acc.newStudents + r.newStudents }),
    { payments: 0, gst: 0, classes: 0, teacherPayouts: 0, refunds: 0, net: 0, newStudents: 0 },
  );
  return { rows: withGrowth, totals };
}

export async function overview(year) {
  const [current, previous] = await Promise.all([
    periodStats(new Date(year, 0, 1), new Date(year + 1, 0, 1)),
    periodStats(new Date(year - 1, 0, 1), new Date(year, 0, 1)),
  ]);
  const card = (key) => ({ value: current[key], trend: percentChange(current[key], previous[key]) });
  return {
    year,
    cards: { payments: card('payments'), newStudents: card('newStudents'), coursesSold: card('coursesSold'), classes: card('classes'), teacherPayouts: card('teacherPayouts'), net: card('net') },
  };
}

export async function topCourses(limit = 5) {
  const rows = await Enrollment.aggregate([{ $group: { _id: '$course', students: { $sum: 1 } } }, { $sort: { students: -1 } }, { $limit: limit }]);
  const courses = await Course.find({ _id: { $in: rows.map((r) => r._id) } }).select('title thumbnail category');
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  const max = rows[0]?.students || 1;
  return rows.map((r) => ({ course: byId.get(String(r._id))?.toJSON(), students: r.students, share: Math.round((r.students / max) * 100) }));
}

export async function topTeachersReport(limit = 5) {
  const rows = await LiveClass.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$teacher', classes: { $sum: 1 } } }, { $sort: { classes: -1 } }, { $limit: limit }]);
  const teachers = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name avatar');
  const courses = await Course.find({ instructor: { $in: rows.map((r) => r._id) }, ratingCount: { $gt: 0 } }).select('instructor rating');
  const byId = new Map(teachers.map((t) => [String(t._id), t]));
  const max = rows[0]?.classes || 1;
  return rows.map((r) => {
    const rated = courses.filter((c) => String(c.instructor) === String(r._id));
    const rating = rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : 0;
    return { teacher: byId.get(String(r._id))?.toJSON(), classes: r.classes, rating, share: Math.round((r.classes / max) * 100) };
  });
}

export async function seriesReport(type, year) {
  if (type === 'students') {
    const monthly = await Promise.all(MONTHS.map(async (m, i) => ({ month: m.slice(0, 3), value: await User.countDocuments({ role: 'student', createdAt: { $gte: new Date(year, i, 1), $lt: new Date(year, i + 1, 1) } }) })));
    const status = await User.aggregate([{ $match: { role: 'student' } }, { $group: { _id: '$status', value: { $sum: 1 } } }]);
    return { monthly, distribution: status.map((s) => ({ name: s._id, value: s.value })) };
  }
  if (type === 'teachers') {
    const rows = await LiveClass.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$teacher', classes: { $sum: 1 }, earnings: { $sum: '$earning' } } },
      { $sort: { classes: -1 } },
    ]);
    const teachers = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name');
    const byId = new Map(teachers.map((t) => [String(t._id), t.name]));
    return { rows: rows.map((r) => ({ name: byId.get(String(r._id)), classes: r.classes, earnings: r.earnings })) };
  }
  if (type === 'courses') {
    const rows = await Enrollment.aggregate([
      { $group: { _id: '$course', enrolled: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, avgProgress: { $avg: '$progress' } } },
      { $sort: { enrolled: -1 } },
    ]);
    const revenue = await Payment.aggregate([{ $match: { status: 'successful' } }, { $group: { _id: '$course', revenue: { $sum: '$amount' } } }]);
    const courses = await Course.find({ _id: { $in: rows.map((r) => r._id) } }).select('title');
    const titleById = new Map(courses.map((c) => [String(c._id), c.title]));
    const revById = new Map(revenue.map((r) => [String(r._id), r.revenue]));
    return { rows: rows.map((r) => ({ name: titleById.get(String(r._id)), enrolled: r.enrolled, completed: r.completed, avgProgress: Math.round(r.avgProgress || 0), revenue: revById.get(String(r._id)) || 0 })) };
  }
  if (type === 'payments') {
    const byStatus = await Payment.aggregate([{ $group: { _id: '$status', value: { $sum: 1 } } }]);
    const byMethod = await Payment.aggregate([{ $match: { status: 'successful' } }, { $group: { _id: '$method', value: { $sum: '$amount' } } }]);
    return { status: byStatus.map((s) => ({ name: s._id, value: s.value })), methods: byMethod.map((s) => ({ name: s._id, value: s.value })) };
  }
  const monthly = await monthlyReport(year);
  return { monthly: monthly.rows.map((r) => ({ month: r.month.slice(0, 3), revenue: r.payments, payouts: r.teacherPayouts, net: r.net })) };
}
