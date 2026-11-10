import { Router } from 'express';
import { z } from 'zod';
import Ticket, { TICKET_CATEGORIES, TICKET_STATUS } from '../../models/Ticket.js';
import User from '../../models/User.js';
import { nextSequence } from '../../models/Counter.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escapeRegex, mergeFilters, monthTrend, paginate } from '../../utils/query.js';
import { created, ok } from '../../utils/response.js';
import { notifyUsers } from '../../services/notify.js';
import { queueAdminMail } from '../../services/mail/index.js';
import { RELATED_KINDS, buildContext, catalogFor, findIssue, listRelated, resolveRelated } from './ticketCatalog.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
  category: z.string().optional(),
  from: z.enum(['all', 'student', 'teacher']).optional(),
  search: z.string().trim().optional(),
});

const createBody = z.object({
  category: z.enum(TICKET_CATEGORIES),
  issue: z.string().trim().min(2).max(60),
  related: objectId.optional().or(z.literal('').transform(() => undefined)),
  message: z.string().trim().min(10, 'Add a few details so support can help faster').max(2000),
});

const replyBody = z.object({ text: z.string().trim().min(1).max(2000) });
const statusBody = z.object({ status: z.enum(TICKET_STATUS) });

const STUDENT_FIELDS = 'name email phone avatar studentCode';
const scopeFor = (user) => (user.role === 'admin' ? {} : { student: user._id });

async function loadTicket(id, user) {
  const ticket = await Ticket.findOne({ _id: id, ...scopeFor(user) })
    .populate('student', STUDENT_FIELDS)
    .populate('course', 'title')
    .populate('replies.author', 'name avatar role');
  if (!ticket) throw ApiError.notFound('Ticket not found');
  return ticket;
}

const supportLink = (ticket) => (ticket.requesterRole === 'teacher' ? '/support' : '/app/support');

const router = Router();
router.use(authenticate, authorize('student', 'teacher', 'admin'));

// Admin sees the requester's own records next to the conversation; everyone else gets the plain ticket.
async function present(ticket, user) {
  const json = ticket.toJSON();
  if (user.role === 'admin') json.context = await buildContext(ticket);
  return json;
}

router.get('/options', (req, res) => ok(res, catalogFor(req.user.role).map((c) => ({ ...c, issues: c.issues.map(({ priority, ...rest }) => rest) }))));

router.get(
  '/related',
  validate({ query: z.object({ kind: z.enum(RELATED_KINDS) }) }),
  asyncHandler(async (req, res) => ok(res, await listRelated(req.user, req.query.kind))),
);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req.user);
    const count = (status) => Ticket.countDocuments({ ...scope, ...(status ? { status } : {}) });
    const [total, open, inProgress, resolved, trend] = await Promise.all([
      count(),
      count('open'),
      count('in_progress'),
      Ticket.countDocuments({ ...scope, status: { $in: ['resolved', 'closed'] } }),
      monthTrend(Ticket, scope),
    ]);
    ok(res, { total: { value: total, trend }, open: { value: open }, inProgress: { value: inProgress }, resolved: { value: resolved } });
  }),
);

router.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, limit, status, category, search, from } = req.query;
    const number = Number(search?.replace('#', ''));
    const filter = mergeFilters(
      scopeFor(req.user),
      status && status !== 'all' ? { status } : null,
      category && category !== 'all' ? { category } : null,
      from && from !== 'all' ? { requesterRole: from } : null,
      search ? { $or: [{ subject: new RegExp(escapeRegex(search), 'i') }, ...(Number.isFinite(number) && search ? [{ ticketNumber: number }] : [])] } : null,
    );
    const { items, meta } = await paginate(Ticket, filter, {
      page,
      limit,
      sort: { lastReplyAt: -1 },
      select: '-replies',
      populate: [{ path: 'student', select: STUDENT_FIELDS }, { path: 'course', select: 'title' }],
    });
    ok(res, items, meta);
  }),
);

router.post(
  '/',
  authorize('student'),
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    if (req.user.role === 'admin') throw ApiError.forbidden('Admins cannot raise tickets');
    const { message, category, issue: issueValue, related: relatedId } = req.body;
    const match = findIssue(req.user.role, category, issueValue);
    if (!match) throw ApiError.badRequest('Please choose a valid issue from the list');
    let related;
    if (match.issue.related) {
      if (!relatedId) throw ApiError.badRequest('Please select the record this issue is about');
      related = await resolveRelated(req.user, match.issue.related, relatedId);
      if (!related) throw ApiError.badRequest('That record was not found on your account');
    }
    const subject = related ? `${match.issue.label} - ${related.label}`.slice(0, 140) : match.issue.label;
    const ticketNumber = 1000 + (await nextSequence('ticket'));
    const ticket = await Ticket.create({
      ticketNumber, subject, category, issue: issueValue, priority: match.issue.priority, student: req.user._id, requesterRole: req.user.role,
      course: related?.course, related: related ? { kind: related.kind, ref: related.ref, label: related.label } : undefined,
      replies: [{ author: req.user._id, role: req.user.role, text: message }],
    });
    const admins = await User.distinct('_id', { role: 'admin', status: 'active' });
    await notifyUsers(admins, { title: `New ${req.user.role} ticket #${ticketNumber}`, body: `${req.user.name}: ${ticket.subject}`, type: 'support', link: '/support', section: 'support', ref: ticket.id });
    queueAdminMail('adminTicket', { student: `${req.user.name} (${req.user.role})`, subject: ticket.subject, category: category.replace(/_/g, ' '), priority: ticket.priority, message });
    created(res, await present(await loadTicket(ticket._id, req.user), req.user));
  }),
);

router.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => ok(res, await present(await loadTicket(req.params.id, req.user), req.user))));

router.post(
  '/:id/replies',
  validate({ params: idParam, body: replyBody }),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req.params.id, req.user);
    if (ticket.status === 'closed') throw ApiError.badRequest('This ticket is closed');
    const isAdmin = req.user.role === 'admin';
    ticket.replies.push({ author: req.user._id, role: req.user.role, text: req.body.text });
    ticket.lastReplyAt = new Date();
    if (isAdmin && ticket.status === 'open') ticket.status = 'in_progress';
    if (!isAdmin && ticket.status === 'resolved') ticket.status = 'open';
    await ticket.save();
    if (isAdmin) await notifyUsers([ticket.student._id], { title: `Ticket #${ticket.ticketNumber} has a new reply`, body: req.body.text.slice(0, 120), type: 'support', link: supportLink(ticket), section: 'support', ref: ticket.id });
    else await notifyUsers(await User.distinct('_id', { role: 'admin', status: 'active' }), { title: `Ticket #${ticket.ticketNumber} has a new reply`, body: `${req.user.name}: ${req.body.text.slice(0, 120)}`, type: 'support', link: '/support', section: 'support', ref: ticket.id });
    ok(res, await present(await loadTicket(ticket._id, req.user), req.user));
  }),
);

router.patch(
  '/:id/status',
  validate({ params: idParam, body: statusBody }),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req.params.id, req.user);
    const { status } = req.body;
    if (req.user.role !== 'admin' && status !== 'closed') throw ApiError.forbidden('You can only close your own ticket');
    ticket.status = status;
    ticket.resolvedAt = ['resolved', 'closed'].includes(status) ? new Date() : undefined;
    await ticket.save();
    if (req.user.role === 'admin') await notifyUsers([ticket.student._id], { title: `Ticket #${ticket.ticketNumber} updated`, body: `Status changed to ${status.replace('_', ' ')}`, type: 'support', link: supportLink(ticket), section: 'support', ref: ticket.id });
    ok(res, await present(await loadTicket(ticket._id, req.user), req.user));
  }),
);

export default router;
