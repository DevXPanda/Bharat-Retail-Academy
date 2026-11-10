import env from '../../config/env.js';
import User from '../../models/User.js';
import { EmailLog } from '../../models/Mail.js';
import { brandInfo } from '../brand.js';
import { TEMPLATES } from './templates.js';


async function record(entry) {
  try {
    await EmailLog.create(entry);
  } catch {
    // logging must never break the request that triggered the email
  }
}

// Resend allows about 2 requests a second, so bulk mail (class reminders) is spaced out; one-off mail goes straight through.
const BULK_GAP_MS = 600;
let bulkChain = Promise.resolve();
const bulkGate = () => {
  const turn = bulkChain.then(() => new Promise((resolve) => setTimeout(resolve, BULK_GAP_MS)));
  bulkChain = turn;
  return turn;
};

// Sends through Resend. Never throws: returns { ok, id, error } so callers can decide what a failure means.
async function deliver({ to, subject, html, text }) {
  if (!env.mailEnabled) return { ok: false, skipped: true, error: 'Email is not configured (RESEND_API_KEY missing)' };
  try {
    const res = await fetch(env.RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html, text, ...(env.MAIL_REPLY_TO ? { reply_to: env.MAIL_REPLY_TO } : {}) }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.message || `Resend responded ${res.status}` };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Sends one template to one user. The template's audience must match the user's role, so a student email can never
// reach a teacher or admin and vice versa. Inactive accounts get nothing.
export async function mailUser(user, templateKey, data = {}, { force = false, bulk = false } = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown email template: ${templateKey}`);
  if (!user?.email) return { ok: false, skipped: true, error: 'No recipient' };

  const base = { to: user.email, role: user.role, template: templateKey };
  const audience = [].concat(template.audience);
  if (!audience.includes(user.role)) {
    await record({ ...base, status: 'skipped', error: `Template is for ${audience.join(' / ')}, recipient is a ${user.role}` });
    return { ok: false, skipped: true, error: 'Audience mismatch' };
  }
  // Demo and placeholder addresses would only bounce, and bounces hurt the sender reputation of the real domain.
  if (env.mailEnabled && env.mailBlockedDomains.includes(user.email.split('@')[1]?.toLowerCase())) {
    await record({ ...base, status: 'skipped', error: 'Placeholder domain (would bounce)' });
    return { ok: false, skipped: true, error: 'Placeholder domain' };
  }
  if (user.status === 'inactive' && !force) {
    await record({ ...base, status: 'skipped', error: 'Account is inactive' });
    return { ok: false, skipped: true, error: 'Inactive account' };
  }

  const brand = await brandInfo();
  const built = template.build(brand, { name: user.name?.split(' ')[0] || 'there', ...data });
  if (bulk) await bulkGate();
  let result = await deliver({ to: user.email, ...built });
  if (!result.ok && /rate|too many|429/i.test(result.error || '')) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    result = await deliver({ to: user.email, ...built });
  }
  if (result.ok) await record({ ...base, subject: built.subject, status: 'sent', providerId: result.id });
  else {
    await record({ ...base, subject: built.subject, status: result.skipped ? 'skipped' : 'failed', error: result.error });
    if (!result.skipped) console.error(`Email "${templateKey}" to ${user.email} failed: ${result.error}`);
  }
  return result;
}

// Fire and forget: for emails that should never slow down or fail the request that caused them.
export const queueMail = (user, templateKey, data, options) => {
  mailUser(user, templateKey, data, options).catch((err) => console.error(`Email "${templateKey}" crashed:`, err.message));
};

// Admin templates go to every active admin account.
export async function mailAdmins(templateKey, data = {}) {
  const admins = await User.find({ role: 'admin', status: { $ne: 'inactive' } }).select('name email role status');
  await Promise.all(admins.map((admin) => mailUser(admin, templateKey, data)));
}

export const queueAdminMail = (templateKey, data) => {
  mailAdmins(templateKey, data).catch((err) => console.error(`Admin email "${templateKey}" crashed:`, err.message));
};
