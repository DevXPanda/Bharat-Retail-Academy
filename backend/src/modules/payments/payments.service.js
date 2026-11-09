import Payment from '../../models/Payment.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import Enrollment from '../../models/Enrollment.js';
import env from '../../config/env.js';
import { getRazorpay } from '../../config/razorpay.js';
import { ApiError } from '../../utils/ApiError.js';
import { dateRangeFilter, escapeRegex, mergeFilters, monthBounds, paginate, percentChange } from '../../utils/query.js';
import { randomId } from '../../utils/slug.js';
import { nextSequence } from '../../models/Counter.js';
import { computePrice, getSettings } from '../../services/settings.js';
import { notifyUsers } from '../../services/notify.js';
import { enrollStudent, refreshStudentStatus } from '../enrollments/enrollment.service.js';
import PDFDocument from 'pdfkit';
import { verifyCheckoutSignature, verifyWebhookSignature } from './razorpay.signature.js';

const POPULATE = [
  { path: 'student', select: 'name email avatar' },
  { path: 'course', select: 'title category thumbnail' },
  { path: 'batch', select: 'name' },
];

export async function createOrder(student, courseId) {
  const course = await Course.findById(courseId);
  if (!course || course.status !== 'published') throw ApiError.notFound('Course not available');
  const existing = await Enrollment.findOne({ student: student._id, course: course._id, status: { $in: ['active', 'completed'] } });
  if (existing) throw ApiError.conflict('You are already enrolled in this course');

  if (course.price === 0) {
    const payment = await Payment.create({ student: student._id, course: course._id, amount: 0, coursePrice: 0, baseAmount: 0, gstAmount: 0, gstPercent: 0, status: 'successful', method: 'Free', paidAt: new Date(), transactionId: `free_${randomId(8)}` });
    await enrollStudent({ studentId: student._id, courseId: course._id, source: 'payment', paymentId: payment._id });
    return { free: true, paymentId: payment.id };
  }

  const razorpay = getRazorpay();
  const pricing = computePrice(course.price, await getSettings());
  const payment = new Payment({ student: student._id, course: course._id, amount: pricing.total, coursePrice: pricing.coursePrice, baseAmount: pricing.baseAmount, gstPercent: pricing.gstPercent, gstAmount: pricing.gstAmount, gstMode: pricing.gstMode, status: 'pending' });
  const order = await razorpay.orders.create({
    amount: Math.round(pricing.total * 100),
    currency: 'INR',
    receipt: `rcpt_${payment.id.slice(-10)}`,
    notes: { paymentId: payment.id, courseId: String(course._id), studentId: String(student._id) },
  });
  payment.razorpayOrderId = order.id;
  await payment.save();

  return {
    free: false,
    paymentId: payment.id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    course: { id: course.id, title: course.title },
    pricing,
    prefill: { name: student.name, email: student.email, contact: student.phone || '' },
  };
}

async function nextInvoiceNumber() {
  const { invoicePrefix } = await getSettings();
  const seq = await nextSequence('invoice');
  return `${invoicePrefix}-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
}

export async function markSuccessful(payment, razorpayPaymentId, signature) {
  if (payment.status === 'successful' || payment.status === 'refunded') return payment;
  payment.status = 'successful';
  payment.razorpayPaymentId = razorpayPaymentId;
  if (signature) payment.razorpaySignature = signature;
  payment.transactionId = razorpayPaymentId;
  payment.paidAt = new Date();
  payment.failureReason = undefined;
  if (!payment.invoiceNumber) payment.invoiceNumber = await nextInvoiceNumber();
  await payment.save();

  const enrollment = await enrollStudent({ studentId: payment.student, courseId: payment.course, batchId: payment.batch, source: 'payment', paymentId: payment._id });
  if (!payment.batch && enrollment.batch) {
    payment.batch = enrollment.batch;
    await payment.save();
  }
  await notifyUsers([payment.student], { title: 'Payment successful', body: 'Your course is now unlocked. Happy learning!', type: 'payment', link: '/app/courses' });
  const admins = await User.distinct('_id', { role: 'admin' });
  await notifyUsers(admins, { title: 'New enrollment', body: `Payment of ₹${payment.amount} received.`, type: 'payment' });
  return payment;
}

export async function verifyPayment(student, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId, student: student._id });
  if (!payment) throw ApiError.notFound('Order not found');
  if (!verifyCheckoutSignature({ orderId, paymentId, signature, secret: env.RAZORPAY_KEY_SECRET })) {
    payment.status = 'failed';
    payment.failureReason = 'Signature verification failed';
    await payment.save();
    throw ApiError.badRequest('Payment verification failed');
  }
  await markSuccessful(payment, paymentId, signature);
  return payment.populate(POPULATE);
}

export async function reportFailure(student, orderId, reason) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId, student: student._id });
  if (!payment || payment.status === 'successful') return;
  payment.status = 'failed';
  payment.failureReason = reason || 'Payment failed';
  await payment.save();
}

export async function handleWebhook(rawBody, signature) {
  if (!verifyWebhookSignature({ rawBody, signature, secret: env.RAZORPAY_WEBHOOK_SECRET })) throw ApiError.unauthorized('Invalid webhook signature');
  const event = JSON.parse(rawBody);
  const entity = event.payload?.payment?.entity;
  const refundEntity = event.payload?.refund?.entity;

  if (['payment.captured', 'order.paid'].includes(event.event) && entity) {
    const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
    if (payment) await markSuccessful(payment, entity.id);
  } else if (event.event === 'payment.failed' && entity) {
    const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
    if (payment && payment.status !== 'successful') {
      payment.status = 'failed';
      payment.failureReason = entity.error_description || 'Payment failed';
      await payment.save();
    }
  } else if (event.event === 'refund.processed' && refundEntity) {
    const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id });
    if (payment && payment.status !== 'refunded') await applyRefund(payment, { amount: refundEntity.amount / 100, razorpayRefundId: refundEntity.id });
  }
  return { received: true };
}

async function applyRefund(payment, { amount, razorpayRefundId, reason }) {
  payment.status = 'refunded';
  payment.refund = { amount, razorpayRefundId, reason, refundedAt: new Date() };
  await payment.save();
  if (amount >= payment.amount) {
    await Enrollment.updateOne({ student: payment.student, course: payment.course }, { status: 'inactive' });
    await refreshStudentStatus(payment.student);
  }
  await notifyUsers([payment.student], { title: 'Refund processed', body: `₹${amount} will reach your account in 5-7 working days.`, type: 'payment' });
}

export async function refundPayment(id, { amount, reason }) {
  const payment = await Payment.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status !== 'successful') throw ApiError.conflict('Only successful payments can be refunded');
  const refundAmount = amount ?? payment.amount;
  if (refundAmount > payment.amount) throw ApiError.badRequest('Refund exceeds the payment amount');

  let refundId = `manual_${randomId(8)}`;
  if (payment.razorpayPaymentId) {
    const refund = await getRazorpay().payments.refund(payment.razorpayPaymentId, { amount: Math.round(refundAmount * 100), notes: { reason: reason || 'Admin refund' } });
    refundId = refund.id;
  }
  await applyRefund(payment, { amount: refundAmount, razorpayRefundId: refundId, reason });
  return payment.populate(POPULATE);
}

export async function listPayments(actor, query) {
  let searchFilterDoc = null;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    const students = await User.distinct('_id', { role: 'student', $or: [{ name: regex }, { email: regex }] });
    searchFilterDoc = { $or: [{ student: { $in: students } }, { transactionId: regex }, { razorpayOrderId: regex }] };
  }
  const filter = mergeFilters(
    actor.role === 'student' ? { student: actor._id } : null,
    query.course ? { course: query.course } : null,
    query.method ? { method: query.method } : null,
    query.status && query.status !== 'all' ? { status: query.status } : null,
    dateRangeFilter('createdAt', query.from, query.to),
    searchFilterDoc,
  );
  return paginate(Payment, filter, { page: query.page, limit: query.limit, sort: { createdAt: -1 }, populate: POPULATE });
}

async function sumAndCount(status, start, end) {
  const [row] = await Payment.aggregate([
    { $match: { status, createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { total: row?.total || 0, count: row?.count || 0 };
}

export async function paymentsSummary() {
  const cur = monthBounds(0);
  const prev = monthBounds(-1);
  const statuses = ['successful', 'pending', 'failed', 'refunded'];
  const [current, previous] = await Promise.all([
    Promise.all(statuses.map((s) => sumAndCount(s, cur.start, cur.end))),
    Promise.all(statuses.map((s) => sumAndCount(s, prev.start, prev.end))),
  ]);
  const [allSuccess, allPending, allFailed, allRefunded] = await Promise.all(statuses.map((status) => Payment.aggregate([{ $match: { status } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }])));
  const totals = (row) => ({ total: row[0]?.total || 0, count: row[0]?.count || 0 });
  const s = totals(allSuccess);
  return {
    revenue: { value: s.total, trend: percentChange(current[0].total, previous[0].total) },
    successful: { value: s.count, trend: percentChange(current[0].count, previous[0].count) },
    pending: { value: totals(allPending).count, trend: percentChange(current[1].count, previous[1].count) },
    failed: { value: totals(allFailed).count, trend: percentChange(current[2].count, previous[2].count) },
    refunds: { value: totals(allRefunded).count, trend: percentChange(current[3].count, previous[3].count) },
  };
}

export async function courseWiseRevenue(limit = 5) {
  const rows = await Payment.aggregate([
    { $match: { status: 'successful' } },
    { $group: { _id: '$course', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);
  const grand = (await Payment.aggregate([{ $match: { status: 'successful' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]))[0]?.total || 0;
  const courses = await Course.find({ _id: { $in: rows.map((r) => r._id) } }).select('title category thumbnail');
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  return rows.map((r) => ({ course: byId.get(String(r._id))?.toJSON(), revenue: r.revenue, count: r.count, share: grand ? Math.round((r.revenue / grand) * 100) : 0 }));
}

export async function recentRefunds(limit = 3) {
  return Payment.find({ status: 'refunded' }).sort({ 'refund.refundedAt': -1 }).limit(limit).populate(POPULATE);
}

const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Streams a GST invoice PDF for a paid order. Only the buyer or an admin may download it.
export async function streamInvoice(id, actor, res) {
  const payment = await Payment.findById(id).populate('student', 'name email phone').populate('course', 'title');
  if (!payment || (actor.role === 'student' && String(payment.student._id) !== String(actor._id))) throw ApiError.notFound('Invoice not found');
  if (!['successful', 'refunded'].includes(payment.status)) throw ApiError.badRequest('An invoice is available once the payment is successful');

  const settings = await getSettings();
  if (!payment.invoiceNumber) {
    payment.invoiceNumber = await nextInvoiceNumber();
    await payment.save();
  }
  // Older payments were stored before GST was tracked: treat their amount as GST inclusive.
  const legacy = payment.gstAmount === undefined || payment.gstAmount === null;
  const pricing = legacy ? computePrice(payment.amount, { gstPercent: settings.gstPercent, gstMode: 'inclusive' }) : { baseAmount: payment.baseAmount, gstAmount: payment.gstAmount, gstPercent: payment.gstPercent, total: payment.amount };

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${payment.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor('#0b1b3f').text(settings.businessName, 50, 50);
  doc.fontSize(9).fillColor('#555').text([settings.address, settings.gstin && `GSTIN: ${settings.gstin}`, settings.supportEmail, settings.supportPhone].filter(Boolean).join('\n'), 50, 78);
  doc.fontSize(22).fillColor('#1a5ce6').text(pricing.gstPercent ? 'TAX INVOICE' : 'INVOICE', 350, 50, { width: 195, align: 'right' });
  doc.fontSize(9).fillColor('#333').text(`Invoice no: ${payment.invoiceNumber}
Date: ${(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
Payment ID: ${payment.transactionId || '-'}
Method: ${payment.method}`, 350, 82, { width: 195, align: 'right' });

  doc.moveTo(50, 150).lineTo(545, 150).strokeColor('#dde3ee').stroke();
  doc.fontSize(9).fillColor('#777').text('BILLED TO', 50, 165);
  doc.fontSize(11).fillColor('#111').text(payment.student.name, 50, 180);
  doc.fontSize(9).fillColor('#555').text([payment.student.email, payment.student.phone].filter(Boolean).join('\n'), 50, 197);

  const top = 250;
  doc.rect(50, top, 495, 24).fill('#f1f5fb');
  doc.fillColor('#333').fontSize(9).text('Description', 60, top + 8).text('Taxable value', 300, top + 8, { width: 80, align: 'right' }).text(`GST ${pricing.gstPercent || 0}%`, 385, top + 8, { width: 60, align: 'right' }).text('Total', 450, top + 8, { width: 85, align: 'right' });
  doc.fillColor('#111').fontSize(10).text(payment.course.title, 60, top + 38, { width: 230 }).text(inr(pricing.baseAmount), 300, top + 38, { width: 80, align: 'right' }).text(inr(pricing.gstAmount), 385, top + 38, { width: 60, align: 'right' }).text(inr(pricing.total), 450, top + 38, { width: 85, align: 'right' });
  doc.moveTo(50, top + 70).lineTo(545, top + 70).strokeColor('#dde3ee').stroke();

  doc.fontSize(9).fillColor('#555').text('Taxable value', 360, top + 90, { width: 90, align: 'right' }).text(inr(pricing.baseAmount), 455, top + 90, { width: 80, align: 'right' });
  doc.text(`GST (${pricing.gstPercent || 0}%)`, 360, top + 108, { width: 90, align: 'right' }).text(inr(pricing.gstAmount), 455, top + 108, { width: 80, align: 'right' });
  doc.fontSize(12).fillColor('#0b1b3f').text('Total paid', 340, top + 132, { width: 110, align: 'right' }).text(inr(pricing.total), 455, top + 132, { width: 80, align: 'right' });
  if (payment.status === 'refunded') doc.fontSize(9).fillColor('#c0392b').text(`Refunded: ${inr(payment.refund?.amount)}`, 340, top + 156, { width: 195, align: 'right' });

  doc.fontSize(8).fillColor('#888').text('This is a computer generated invoice and does not need a signature.', 50, 760, { width: 495, align: 'center' });
  doc.end();
}
