import env from '../../config/env.js';

// Every email the platform sends. `audience` is enforced when sending: a student template can only reach a student,
// a teacher template only a teacher, an admin template only an admin.

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const day = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });

const COLORS = { navy: '#14243a', sage: '#2d725e', soft: '#eef4f0', canvas: '#f8fafc', text: '#14243a', muted: '#64748b', border: '#e2e8f0' };

const button = (label, url) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px"><tr><td style="border-radius:10px;background:${COLORS.sage}"><a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font:600 15px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a></td></tr></table>`;

const rows = (items) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid ${COLORS.border};border-radius:12px;border-collapse:separate;overflow:hidden">${items
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v], i) => `<tr><td style="padding:11px 16px;font:13px Arial,sans-serif;color:${COLORS.muted};background:${i % 2 ? '#ffffff' : COLORS.canvas};width:42%">${esc(k)}</td><td style="padding:11px 16px;font:600 14px Arial,sans-serif;color:${COLORS.text};background:${i % 2 ? '#ffffff' : COLORS.canvas}">${esc(v)}</td></tr>`)
  .join('')}</table>`;

const para = (text) => `<p style="margin:0 0 14px;font:15px/1.6 Arial,Helvetica,sans-serif;color:${COLORS.text}">${text}</p>`;

function layout({ brand, preheader, heading, body, note }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.canvas}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || heading)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.canvas};padding:28px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden">
<tr><td style="background:${COLORS.navy};padding:22px 28px"><span style="font:700 18px Arial,Helvetica,sans-serif;color:#ffffff">${esc(brand.name)}</span><br><span style="font:12px Arial,sans-serif;color:#9db0c8">${esc(brand.tagline)}</span></td></tr>
<tr><td style="padding:30px 28px 26px">
<h1 style="margin:0 0 16px;font:700 22px/1.3 Arial,Helvetica,sans-serif;color:${COLORS.navy}">${esc(heading)}</h1>
${body}
${note ? `<p style="margin:20px 0 0;font:13px/1.55 Arial,sans-serif;color:${COLORS.muted}">${note}</p>` : ''}
</td></tr>
<tr><td style="background:${COLORS.soft};padding:18px 28px;font:12px/1.6 Arial,sans-serif;color:${COLORS.muted}">${esc(brand.name)}${brand.email ? ` &middot; <a href="mailto:${esc(brand.email)}" style="color:${COLORS.sage};text-decoration:none">${esc(brand.email)}</a>` : ''}${brand.phone ? ` &middot; ${esc(brand.phone)}` : ''}<br>You are receiving this because of your account with us.</td></tr>
</table></td></tr></table></body></html>`;
}

const stripTags = (html) => html.replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '$2: $1').replace(/<(br|\/p|\/tr|\/h1)\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

const make = (brand, { subject, preheader, heading, body, note }) => {
  const html = layout({ brand, preheader, heading, body, note });
  return { subject, html, text: stripTags(`${heading}\n\n${body}\n\n${note || ''}`) };
};

const url = {
  site: (path = '') => `${env.siteUrl}${path}`,
  teacher: (path = '') => `${env.teacherUrl}${path}`,
  admin: (path = '') => `${env.adminUrl}${path}`,
};

export const TEMPLATES = {
  // ---------- student ----------
  verifyOtp: {
    audience: 'student',
    build: (b, { name, code, minutes }) => make(b, {
      subject: `${code} is your ${b.name} verification code`,
      preheader: 'Use this code to verify your email address.',
      heading: 'Verify your email',
      body: `${para(`Hi ${esc(name)}, use this code to finish creating your account:`)}<p style="margin:18px 0;text-align:center;font:700 34px/1 'Courier New',monospace;letter-spacing:10px;color:${COLORS.sage}">${esc(code)}</p>${para(`The code expires in ${minutes} minutes.`)}`,
      note: 'If you did not create an account, you can ignore this email.',
    }),
  },
  studentWelcome: {
    audience: 'student',
    build: (b, { name }) => make(b, {
      subject: `Welcome to ${b.name}`,
      preheader: 'Your account is ready.',
      heading: `Welcome, ${name}!`,
      body: `${para('Your email is verified and your account is ready. Browse courses, join live classes and learn at your own pace.')}${button('Explore courses', url.site('/courses'))}`,
      note: `Need help? Write to ${esc(b.email || 'our support team')} or raise a ticket from your dashboard.`,
    }),
  },
  studentCredentials: {
    audience: 'student',
    build: (b, { name, email, password }) => make(b, {
      subject: `Your ${b.name} student account`,
      preheader: 'Your login details are inside.',
      heading: `Welcome, ${name}!`,
      body: `${para('An account has been created for you. Use these details to sign in:')}${rows([['Login email', email], ['Temporary password', password]])}${button('Sign in', url.site('/login'))}`,
      note: 'For your security, please change this password after your first sign in (Profile, then Change password).',
    }),
  },
  passwordReset: {
    audience: ['student', 'admin'],
    build: (b, { name, link, minutes }) => make(b, {
      subject: `Reset your ${b.name} password`,
      preheader: 'Use this link to choose a new password.',
      heading: 'Reset your password',
      body: `${para(`Hi ${esc(name)}, we received a request to reset your password. This link works for ${minutes} minutes and can be used once.`)}${button('Choose a new password', link)}`,
      note: 'If you did not ask for this, ignore this email. Your password will not change.',
    }),
  },
  passwordChanged: {
    audience: ['student', 'admin'],
    build: (b, { name }) => make(b, {
      subject: 'Your password was changed',
      preheader: 'Your password has just been changed.',
      heading: 'Password changed',
      body: para(`Hi ${esc(name)}, the password on your ${esc(b.name)} account was just changed. You have been signed out everywhere.`),
      note: `If this was not you, reset your password right away or contact ${esc(b.email || 'support')}.`,
    }),
  },
  paymentReceipt: {
    audience: 'student',
    build: (b, d) => make(b, {
      subject: `Payment received: ${d.course}`,
      preheader: `We received your payment of ${inr(d.amount)}.`,
      heading: 'Payment successful',
      body: `${para(`Hi ${esc(d.name)}, thank you! Your payment was received and your course is unlocked.`)}${rows([
        ['Course', d.course],
        ['Amount paid', inr(d.amount)],
        d.gstAmount ? [`GST (${d.gstPercent}%)`, inr(d.gstAmount)] : ['GST', ''],
        ['Invoice number', d.invoiceNumber],
        ['Payment ID', d.transactionId],
        ['Date', when(d.paidAt)],
      ])}${button('Start learning', url.site('/app/courses'))}`,
      note: 'You can download your GST invoice any time from Dashboard, then Payments.',
    }),
  },
  refundProcessed: {
    audience: 'student',
    build: (b, d) => make(b, {
      subject: `Refund processed: ${d.course}`,
      preheader: `A refund of ${inr(d.amount)} has been issued.`,
      heading: 'Refund processed',
      body: `${para(`Hi ${esc(d.name)}, a refund has been issued for your payment.`)}${rows([['Course', d.course], ['Refund amount', inr(d.amount)], ['Reference', d.reference]])}${para('It usually reaches your account in 5 to 7 working days.')}`,
    }),
  },
  classReminderStudent: {
    audience: 'student',
    build: (b, d) => make(b, {
      subject: `Starting soon: ${d.title}`,
      preheader: `${d.title} begins at ${when(d.startsAt)}.`,
      heading: 'Your class starts soon',
      body: `${para(`Hi ${esc(d.name)}, your live class begins in about ${d.minutes} minutes.`)}${rows([['Class', d.title], ['Course', d.course], ['Teacher', d.teacher], ['Starts', when(d.startsAt)], ['Duration', `${d.durationMin} minutes`]])}${button('Join class', d.joinUrl)}`,
      note: 'Sign in with your student account to join. The room opens when your teacher starts the class.',
    }),
  },

  // ---------- teacher ----------
  teacherCredentials: {
    audience: 'teacher',
    build: (b, { name, email, password }) => make(b, {
      subject: `Your ${b.name} teacher account`,
      preheader: 'Your teacher portal login details.',
      heading: `Welcome aboard, ${name}!`,
      body: `${para('Your teacher account is ready. Sign in to the teacher portal with:')}${rows([['Login email', email], ['Temporary password', password], ['Portal', env.teacherUrl]])}${button('Open teacher portal', url.teacher('/login'))}`,
      note: 'Please change this temporary password after signing in (Profile, then Change password) and complete your profile and payout details.',
    }),
  },
  classReminderTeacher: {
    audience: 'teacher',
    build: (b, d) => make(b, {
      subject: `Your class starts soon: ${d.title}`,
      preheader: `${d.title} begins at ${when(d.startsAt)}.`,
      heading: 'Time to get ready',
      body: `${para(`Hi ${esc(d.name)}, your class begins in about ${d.minutes} minutes.`)}${rows([['Class', d.title], ['Course', d.course], ['Starts', when(d.startsAt)], ['Duration', `${d.durationMin} minutes`], ['Enrolled students', d.students]])}${button('Open class', d.startUrl)}`,
      note: 'Start the class from the Live Classes page when you are ready.',
    }),
  },
  payoutPaid: {
    audience: 'teacher',
    build: (b, d) => make(b, {
      subject: `Payout sent: ${inr(d.amount)}`,
      preheader: `${inr(d.amount)} for ${d.period} has been paid.`,
      heading: 'Your payout has been sent',
      body: `${para(`Hi ${esc(d.name)}, your payout has been processed.`)}${rows([['Period', d.period], ['Classes conducted', d.classes], ['Amount', inr(d.amount)], ['Method', d.method], ['Transaction / UTR', d.transactionId], ['Paid on', day(d.paidAt)]])}${button('View earnings', url.teacher('/earnings'))}`,
    }),
  },
  payoutFailed: {
    audience: 'teacher',
    build: (b, d) => make(b, {
      subject: `Action needed: payout for ${d.period}`,
      preheader: 'We could not complete your payout.',
      heading: 'We could not send your payout',
      body: `${para(`Hi ${esc(d.name)}, the payout of ${inr(d.amount)} for ${esc(d.period)} could not be completed.`)}${rows([['Reason', d.reason]])}${para('Please check your bank details in your profile. We will retry once they are correct.')}${button('Check payout details', url.teacher('/profile'))}`,
    }),
  },

  // ---------- admin ----------
  adminNewStudent: {
    audience: 'admin',
    build: (b, d) => make(b, {
      subject: `New student: ${d.name}`,
      preheader: `${d.name} just joined.`,
      heading: 'A new student signed up',
      body: `${rows([['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Student ID', d.studentCode], ['Joined', when(d.at)]])}${button('Open student', url.admin(`/students/${d.id}`))}`,
    }),
  },
  adminPayment: {
    audience: 'admin',
    build: (b, d) => make(b, {
      subject: `Payment received: ${inr(d.amount)}`,
      preheader: `${d.student} paid ${inr(d.amount)} for ${d.course}.`,
      heading: 'New payment received',
      body: `${rows([['Student', d.student], ['Course', d.course], ['Amount', inr(d.amount)], ['Invoice', d.invoiceNumber], ['Payment ID', d.transactionId], ['Time', when(d.paidAt)]])}${button('View payments', url.admin('/payments'))}`,
    }),
  },
  adminTicket: {
    audience: 'admin',
    build: (b, d) => make(b, {
      subject: `New support ticket: ${d.subject}`,
      preheader: `${d.student} opened a ticket.`,
      heading: 'New support ticket',
      body: `${rows([['Student', d.student], ['Subject', d.subject], ['Category', d.category], ['Priority', d.priority]])}${d.message ? para(esc(d.message).slice(0, 500)) : ''}${button('Open ticket', url.admin('/support'))}`,
    }),
  },
  adminLead: {
    audience: 'admin',
    build: (b, d) => make(b, {
      subject: `New enquiry: ${d.name}`,
      preheader: `${d.name} wants to know more.`,
      heading: 'New enquiry received',
      body: `${rows([['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Interested in', d.goal], ['Source', d.source]])}${button('Open leads', url.admin('/leads'))}`,
    }),
  },
};
