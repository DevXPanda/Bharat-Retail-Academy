import Payment from '../../models/Payment.js';
import Payout from '../../models/Payout.js';
import Certificate from '../../models/Certificate.js';
import Recording from '../../models/Recording.js';
import Enrollment from '../../models/Enrollment.js';
import LiveClass from '../../models/LiveClass.js';
import Course from '../../models/Course.js';
import { teacherCourseIds } from '../../services/scope.js';

/**
 * Structured support catalog. Users pick a category and a ready-made issue (no free-typed subjects),
 * and attach the exact record the problem is about, so support can resolve it without back-and-forth.
 * `related` = which of the user's own records must/may be attached.
 */
const issue = (value, label, related = null, priority = 'medium') => ({ value, label, related, priority });

export const CATALOG = {
  student: [
    { value: 'payment', label: 'Payment & Refund', issues: [
      issue('payment_deducted', 'Money deducted but course not unlocked', 'payment', 'high'),
      issue('payment_failed', 'Payment failed or stuck', 'payment', 'high'),
      issue('wrong_amount', 'Charged a wrong amount', 'payment', 'high'),
      issue('refund_request', 'I want a refund', 'payment'),
      issue('invoice_needed', 'Need invoice / GST bill', 'payment', 'low'),
    ] },
    { value: 'course_access', label: 'Course Access', issues: [
      issue('cannot_access_course', 'Cannot open my course', 'course', 'high'),
      issue('access_expiry', 'Course access expiry / extension', 'course'),
      issue('wrong_batch', 'Wrong batch or course assigned', 'course'),
      issue('lesson_not_loading', 'Lesson or video not loading', 'course'),
    ] },
    { value: 'live_class', label: 'Live Class', issues: [
      issue('cannot_join_class', 'Cannot join the live class', 'liveClass', 'high'),
      issue('class_not_started', 'Teacher has not started the class', 'liveClass', 'high'),
      issue('audio_video_issue', 'Audio / video problem in class', 'liveClass'),
      issue('reschedule_request', 'Class timing / reschedule query', 'liveClass', 'low'),
    ] },
    { value: 'recording', label: 'Class Recordings', issues: [
      issue('recording_not_playing', 'Recording is not playing', 'recording'),
      issue('recording_missing', 'Recording is missing', 'liveClass'),
    ] },
    { value: 'certificate', label: 'Certificate', issues: [
      issue('certificate_not_received', 'Completed the course but no certificate', 'course'),
      issue('certificate_correction', 'Name / detail correction on certificate', 'certificate'),
      issue('certificate_download', 'Cannot download certificate', 'certificate', 'low'),
    ] },
    { value: 'technical', label: 'Technical Problem', issues: [
      issue('login_issue', 'Cannot log in / password reset not working'),
      issue('site_slow', 'Website is slow or showing errors'),
      issue('other_technical', 'Something else is not working'),
    ] },
    { value: 'account', label: 'Profile & Account', issues: [
      issue('update_contact', 'Change my email or phone number', null, 'low'),
      issue('update_name', 'Correct my name', null, 'low'),
      issue('delete_account', 'Close / delete my account', null, 'low'),
    ] },
    { value: 'other', label: 'Something Else', issues: [issue('general_query', 'General question', null, 'low')] },
  ],
  teacher: [
    { value: 'payout', label: 'Payout & Earnings', issues: [
      issue('payout_delayed', 'Payout not received', 'payout', 'high'),
      issue('payout_wrong_amount', 'Payout amount looks wrong', 'payout', 'high'),
      issue('bank_details', 'Update bank / UPI details', null),
      issue('earnings_query', 'Earnings or deductions query', 'payout', 'low'),
    ] },
    { value: 'live_class', label: 'Live Class', issues: [
      issue('cannot_start_class', 'Cannot start my class', 'liveClass', 'high'),
      issue('students_cannot_join', 'Students are unable to join', 'liveClass', 'high'),
      issue('reschedule_class', 'Need to reschedule / cancel a class', 'liveClass'),
      issue('class_earning_missing', 'Class not counted in my earnings', 'liveClass'),
    ] },
    { value: 'recording', label: 'Class Recordings', issues: [
      issue('recording_not_uploaded', 'Recording not available after class', 'recording'),
      issue('recording_correction', 'Wrong recording attached to a class', 'recording', 'low'),
    ] },
    { value: 'course_content', label: 'Course & Content', issues: [
      issue('course_not_assigned', 'Course or batch not assigned to me', 'course'),
      issue('content_update', 'Course content needs an update', 'course', 'low'),
      issue('upload_issue', 'Upload failing (video, file or assignment)', 'course'),
    ] },
    { value: 'students', label: 'Students & Attendance', issues: [
      issue('attendance_correction', 'Attendance needs correction', 'liveClass'),
      issue('student_complaint', 'Report a student issue', 'course', 'low'),
    ] },
    { value: 'technical', label: 'Technical Problem', issues: [
      issue('login_issue', 'Cannot log in / password reset not working'),
      issue('portal_error', 'Portal is slow or showing errors'),
    ] },
    { value: 'account', label: 'Profile & Account', issues: [issue('update_profile', 'Update my profile details', null, 'low')] },
    { value: 'other', label: 'Something Else', issues: [issue('general_query', 'General question', null, 'low')] },
  ],
};

export const RELATED_KINDS = ['payment', 'course', 'liveClass', 'certificate', 'recording', 'payout'];

export const catalogFor = (role) => CATALOG[role === 'teacher' ? 'teacher' : 'student'];

export function findIssue(role, category, issueValue) {
  const cat = catalogFor(role).find((c) => c.value === category);
  const found = cat?.issues.find((i) => i.value === issueValue);
  return cat && found ? { category: cat, issue: found } : null;
}

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** The user's own records of a given kind, as dropdown options. Ownership is enforced here. */
export async function listRelated(user, kind) {
  const isTeacher = user.role === 'teacher';
  switch (kind) {
    case 'payment': {
      if (isTeacher) return [];
      const rows = await Payment.find({ student: user._id, status: { $ne: 'created' } }).sort({ createdAt: -1 }).limit(25).populate('course', 'title');
      return rows.map((p) => ({ id: p.id, label: `${p.course?.title || 'Course'} · ${money(p.amount)} · ${day(p.paidAt || p.createdAt)}`, hint: p.status }));
    }
    case 'payout': {
      if (!isTeacher) return [];
      const rows = await Payout.find({ teacher: user._id }).sort({ createdAt: -1 }).limit(25);
      return rows.map((p) => ({ id: p.id, label: `${p.periodLabel || day(p.periodTo)} · ${money(p.amount)}`, hint: p.status }));
    }
    case 'course': {
      if (isTeacher) {
        const ids = await teacherCourseIds(user._id);
        const courses = await Course.find({ _id: { $in: ids } }).select('title').limit(50);
        return courses.map((c) => ({ id: c.id, label: c.title }));
      }
      const rows = await Enrollment.find({ student: user._id }).sort({ createdAt: -1 }).limit(50).populate('course', 'title');
      return rows.filter((e) => e.course).map((e) => ({ id: e.course.id, label: e.course.title, hint: e.status }));
    }
    case 'liveClass': {
      const since = new Date(Date.now() - 45 * 86400000);
      const filter = isTeacher ? { teacher: user._id } : { course: { $in: await Enrollment.distinct('course', { student: user._id }) } };
      const rows = await LiveClass.find({ ...filter, startsAt: { $gte: since } }).sort({ startsAt: -1 }).limit(30);
      return rows.map((c) => ({ id: c.id, label: `${c.title} · ${day(c.startsAt)}`, hint: c.status }));
    }
    case 'certificate': {
      if (isTeacher) return [];
      const rows = await Certificate.find({ student: user._id }).populate('course', 'title').limit(25);
      return rows.map((c) => ({ id: c.id, label: `${c.course?.title || 'Course'} · ${c.certificateId}`, hint: c.status }));
    }
    case 'recording': {
      const filter = isTeacher ? { teacher: user._id } : { course: { $in: await Enrollment.distinct('course', { student: user._id }) } };
      const rows = await Recording.find(filter).sort({ classDate: -1 }).limit(30);
      return rows.map((r) => ({ id: r.id, label: `${r.title} · ${day(r.classDate)}`, hint: r.status }));
    }
    default:
      return [];
  }
}

/** Verifies the record belongs to the user and returns the snapshot stored on the ticket. */
export async function resolveRelated(user, kind, id) {
  const options = await listRelated(user, kind);
  const match = options.find((o) => String(o.id) === String(id));
  if (!match) return null;
  let course;
  if (kind === 'course') course = match.id;
  else if (kind === 'payment') course = (await Payment.findById(id).select('course'))?.course;
  else if (kind === 'liveClass') course = (await LiveClass.findById(id).select('course'))?.course;
  else if (kind === 'certificate') course = (await Certificate.findById(id).select('course'))?.course;
  else if (kind === 'recording') course = (await Recording.findById(id).select('course'))?.course;
  return { kind, ref: id, label: match.label, course };
}

/** What support sees next to the conversation: the exact record plus the requester's recent history. */
export async function buildContext(ticket) {
  const requester = ticket.student;
  const requesterId = requester._id || requester;
  const isTeacher = ticket.requesterRole === 'teacher';
  const context = { record: null, history: [] };

  const rel = ticket.related;
  if (rel?.ref) {
    try {
      if (rel.kind === 'payment') {
        const p = await Payment.findById(rel.ref).populate('course', 'title');
        if (p) {
          const enrolled = await Enrollment.exists({ student: requesterId, course: p.course?._id });
          context.record = { kind: 'Payment', rows: [
            ['Course', p.course?.title], ['Amount', money(p.amount)], ['Status', p.status], ['Method', p.method],
            ['Paid on', day(p.paidAt)], ['Razorpay payment ID', p.razorpayPaymentId], ['Invoice', p.invoiceNumber],
            ['Failure reason', p.failureReason], ['Refunded', p.refund?.amount ? money(p.refund.amount) : null],
            ['Course unlocked', enrolled ? 'Yes - enrolled' : 'No - not enrolled'],
          ] };
        }
      } else if (rel.kind === 'course') {
        const [course, enrollment] = await Promise.all([Course.findById(rel.ref).select('title'), isTeacher ? null : Enrollment.findOne({ student: requesterId, course: rel.ref })]);
        context.record = { kind: 'Course', rows: [['Course', course?.title], ...(enrollment ? [['Enrollment', enrollment.status], ['Progress', `${enrollment.progress}%`], ['Access until', day(enrollment.accessEnd) || 'No expiry']] : [])] };
      } else if (rel.kind === 'liveClass') {
        const c = await LiveClass.findById(rel.ref).populate('teacher', 'name').populate('course', 'title');
        if (c) context.record = { kind: 'Live class', rows: [['Class', c.title], ['Course', c.course?.title], ['Teacher', c.teacher?.name], ['When', `${day(c.startsAt)} ${new Date(c.startsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`], ['Status', c.status], ['Platform', c.platform]] };
      } else if (rel.kind === 'certificate') {
        const c = await Certificate.findById(rel.ref).populate('course', 'title');
        if (c) context.record = { kind: 'Certificate', rows: [['Certificate ID', c.certificateId], ['Course', c.course?.title], ['Status', c.status], ['Downloads', String(c.downloads)]] };
      } else if (rel.kind === 'recording') {
        const r = await Recording.findById(rel.ref).populate('course', 'title');
        if (r) context.record = { kind: 'Recording', rows: [['Title', r.title], ['Course', r.course?.title], ['Status', r.status], ['Processing', `${r.processingProgress}%`]] };
      } else if (rel.kind === 'payout') {
        const p = await Payout.findById(rel.ref);
        if (p) context.record = { kind: 'Payout', rows: [['Period', p.periodLabel], ['Classes', String(p.classesConducted)], ['Earnings', money(p.earnings)], ['Deductions', money(p.deductions)], ['Net amount', money(p.amount)], ['Status', p.status], ['Paid on', day(p.payoutDate)], ['Failure reason', p.failureReason]] };
      }
    } catch {
      /* the record may have been deleted; the label stored on the ticket is still shown */
    }
  }

  if (isTeacher) {
    const payouts = await Payout.find({ teacher: requesterId }).sort({ createdAt: -1 }).limit(3);
    context.history = [{ title: 'Recent payouts', items: payouts.map((p) => `${p.periodLabel || day(p.periodTo)} · ${money(p.amount)} · ${p.status}`) }];
  } else {
    const [enrollments, payments] = await Promise.all([
      Enrollment.find({ student: requesterId }).sort({ createdAt: -1 }).limit(4).populate('course', 'title'),
      Payment.find({ student: requesterId }).sort({ createdAt: -1 }).limit(4).populate('course', 'title'),
    ]);
    context.history = [
      { title: 'Enrolled courses', items: enrollments.map((e) => `${e.course?.title || 'Course'} · ${e.status} · ${e.progress}%`) },
      { title: 'Recent payments', items: payments.map((p) => `${p.course?.title || 'Course'} · ${money(p.amount)} · ${p.status}`) },
    ];
  }
  context.history = context.history.filter((h) => h.items.length);
  context.record?.rows && (context.record.rows = context.record.rows.filter(([, v]) => v));
  return context;
}
