import { Conversation, Message } from '../../models/Message.js';
import { Announcement, Notification } from '../../models/Engagement.js';
import Enrollment from '../../models/Enrollment.js';
import Attendance from '../../models/Attendance.js';
import Batch from '../../models/Batch.js';
import Course from '../../models/Course.js';
import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { escapeRegex } from '../../utils/query.js';
import { emitToUser, isOnline } from '../../services/realtime.js';
import { notifyUsers } from '../../services/notify.js';
import { teacherStudentIds } from '../../services/scope.js';

// Students only get public profile fields of staff; email and phone stay private to staff and admins.
const STAFF_FIELDS = 'name email avatar role phone studentCode teacher.designation';
const STUDENT_FIELDS = 'name avatar role teacher.designation';
const fieldsFor = (actor) => (actor.role === 'student' ? STUDENT_FIELDS : STAFF_FIELDS);

const keyFor = (a, b) => [String(a), String(b)].sort().join(':');
const idOf = (doc) => String(doc._id || doc);

async function allowedContactIds(actor) {
  const admins = await User.distinct('_id', { role: 'admin' });
  if (actor.role === 'admin') return null;
  if (actor.role === 'teacher') return [...admins, ...(await teacherStudentIds(actor._id))];

  const enrollments = await Enrollment.find({ student: actor._id, status: { $in: ['active', 'completed'] } });
  const courseIds = enrollments.map((e) => e.course);
  const batchIds = enrollments.map((e) => e.batch).filter(Boolean);
  const [direct, viaBatch] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).select('instructor teachers'),
    Batch.distinct('teacher', { _id: { $in: batchIds } }),
  ]);
  const teachers = direct.flatMap((c) => [c.instructor, ...c.teachers]).filter(Boolean);
  return [...admins, ...teachers, ...viaBatch];
}

async function assertCanMessage(actor, otherId) {
  if (idOf(actor) === String(otherId)) throw ApiError.badRequest('You cannot message yourself');
  const other = await User.findById(otherId);
  if (!other || other.status === 'inactive') throw ApiError.notFound('User not found');
  const allowed = await allowedContactIds(actor);
  if (allowed && !allowed.some((id) => String(id) === String(otherId))) throw ApiError.forbidden('You cannot message this user');
  return other;
}

export async function contacts(actor, search) {
  const allowed = await allowedContactIds(actor);
  const filter = { _id: { $ne: actor._id }, status: { $ne: 'inactive' } };
  if (allowed) filter._id = { $in: allowed.filter((id) => String(id) !== String(actor._id)) };
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');
  return User.find(filter).select(fieldsFor(actor)).sort({ name: 1 }).limit(30);
}

function shape(conversation, actor) {
  const json = conversation.toJSON();
  const other = conversation.participants.find((p) => idOf(p) !== idOf(actor));
  const unreadMap = conversation.unread instanceof Map ? conversation.unread : new Map(Object.entries(conversation.unread || {}));
  return {
    ...json,
    other: other ? { ...other.toJSON(), online: isOnline(other._id) } : null,
    unreadCount: unreadMap.get(idOf(actor)) || 0,
    starred: conversation.starredBy.some((u) => idOf(u) === idOf(actor)),
    archived: conversation.archivedBy.some((u) => idOf(u) === idOf(actor)),
    participants: undefined,
    unread: undefined,
  };
}

export async function listConversations(actor, { tab = 'all', search }) {
  const conversations = await Conversation.find({ participants: actor._id }).sort({ lastMessageAt: -1 }).limit(200).populate('participants', fieldsFor(actor));
  let rows = conversations.map((c) => shape(c, actor));

  const counts = {
    all: rows.filter((r) => !r.archived).length,
    unread: rows.filter((r) => r.unreadCount > 0 && !r.archived).length,
    starred: rows.filter((r) => r.starred && !r.archived).length,
    archived: rows.filter((r) => r.archived).length,
    students: rows.filter((r) => r.other?.role === 'student' && !r.archived).length,
    teachers: rows.filter((r) => r.other?.role === 'teacher' && !r.archived).length,
  };

  if (tab === 'archived') rows = rows.filter((r) => r.archived);
  else rows = rows.filter((r) => !r.archived);
  if (tab === 'unread') rows = rows.filter((r) => r.unreadCount > 0);
  if (tab === 'starred') rows = rows.filter((r) => r.starred);
  if (tab === 'students') rows = rows.filter((r) => r.other?.role === 'student');
  if (tab === 'teachers') rows = rows.filter((r) => r.other?.role === 'teacher');
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    rows = rows.filter((r) => regex.test(r.other?.name || '') || regex.test(r.lastMessage?.text || ''));
  }
  return { rows, counts };
}

async function averageResponseMinutes(actor) {
  const conversations = await Conversation.find({ participants: actor._id }).select('_id').limit(100);
  const messages = await Message.find({ conversation: { $in: conversations.map((c) => c._id) } })
    .sort({ conversation: 1, createdAt: 1 })
    .select('conversation sender createdAt')
    .limit(2000);
  let total = 0;
  let count = 0;
  let waitingSince = null;
  let current = null;
  messages.forEach((m) => {
    if (String(m.conversation) !== current) {
      current = String(m.conversation);
      waitingSince = null;
    }
    if (idOf(m.sender) === idOf(actor)) {
      if (waitingSince) {
        total += m.createdAt - waitingSince;
        count += 1;
        waitingSince = null;
      }
    } else if (!waitingSince) {
      waitingSince = m.createdAt;
    }
  });
  return count ? Math.round(total / count / 60000) : 0;
}

export async function messagesSummary(actor) {
  const conversations = await Conversation.find({ participants: actor._id }).populate('participants', 'role');
  let unread = 0;
  const roleStats = { student: { total: 0, unread: 0 }, teacher: { total: 0, unread: 0 } };
  const ids = conversations.map((c) => c._id);
  const sentByOthers = await Message.aggregate([
    { $match: { conversation: { $in: ids }, sender: { $ne: actor._id } } },
    { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 's' } },
    { $unwind: '$s' },
    { $group: { _id: '$s.role', count: { $sum: 1 } } },
  ]);
  const total = await Message.countDocuments({ conversation: { $in: ids } });
  conversations.forEach((c) => {
    const other = c.participants.find((p) => idOf(p) !== idOf(actor));
    const count = c.unread?.get(idOf(actor)) || 0;
    unread += count;
    if (other && roleStats[other.role]) roleStats[other.role].unread += count;
  });
  sentByOthers.forEach((row) => {
    if (roleStats[row._id]) roleStats[row._id].total = row.count;
  });
  const [announcements, scheduled, activeStudents] = await Promise.all([
    Announcement.countDocuments(),
    Announcement.countDocuments({ sentAt: { $exists: false } }),
    actor.role === 'teacher' ? teacherStudentIds(actor._id).then((ids2) => ids2.length) : Promise.resolve(0),
  ]);
  return {
    total: { value: total },
    unread: { value: unread },
    students: { value: roleStats.student.total, unread: roleStats.student.unread },
    teachers: { value: roleStats.teacher.total, unread: roleStats.teacher.unread },
    announcements: { value: announcements, scheduled },
    activeStudents: { value: activeStudents },
    avgResponseMinutes: { value: await averageResponseMinutes(actor) },
  };
}

async function loadConversation(id, actor) {
  const conversation = await Conversation.findById(id).populate('participants', fieldsFor(actor));
  if (!conversation || !conversation.participants.some((p) => idOf(p) === idOf(actor))) throw ApiError.notFound('Conversation not found');
  return conversation;
}

export async function getMessages(id, actor, { before, limit = 50 }) {
  const conversation = await loadConversation(id, actor);
  const filter = { conversation: id, ...(before ? { createdAt: { $lt: new Date(before) } } : {}) };
  const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).populate('sender', 'name avatar');
  conversation.unread.set(idOf(actor), 0);
  await conversation.save();
  await Message.updateMany({ conversation: id, sender: { $ne: actor._id }, readBy: { $ne: actor._id } }, { $addToSet: { readBy: actor._id } });
  return { conversation: shape(conversation, actor), messages: messages.reverse() };
}

export async function startConversation(actor, userId) {
  await assertCanMessage(actor, userId);
  let conversation = await Conversation.findOne({ participantKey: keyFor(actor._id, userId) });
  if (!conversation) {
    conversation = await Conversation.create({ participants: [actor._id, userId], participantKey: keyFor(actor._id, userId), lastMessageAt: new Date(0) });
  }
  await conversation.populate('participants', fieldsFor(actor));
  return shape(conversation, actor);
}

export async function sendMessage(actor, conversationId, { text, attachments = [] }) {
  if (!text?.trim() && !attachments.length) throw ApiError.badRequest('Message cannot be empty');
  const conversation = await loadConversation(conversationId, actor);
  const other = conversation.participants.find((p) => idOf(p) !== idOf(actor));
  await assertCanMessage(actor, other._id);

  const message = await Message.create({ conversation: conversation._id, sender: actor._id, text: text?.trim() || '', attachments, readBy: [actor._id] });
  conversation.lastMessage = { text: text?.trim() || attachments[0]?.name || 'Attachment', sender: actor._id };
  conversation.lastMessageAt = message.createdAt;
  conversation.unread.set(idOf(other), (conversation.unread.get(idOf(other)) || 0) + 1);
  conversation.archivedBy = conversation.archivedBy.filter((u) => idOf(u) !== idOf(other));
  await conversation.save();

  const populated = await message.populate('sender', 'name avatar');
  const payload = { conversationId: idOf(conversation), message: populated.toJSON() };
  emitToUser(idOf(other), 'message:new', payload);
  emitToUser(idOf(actor), 'message:new', payload);

  // One rolling notification per conversation, so a busy chat does not flood the bell.
  const preview = (text?.trim() || attachments[0]?.name || 'Sent an attachment').slice(0, 120);
  await Notification.deleteMany({ user: other._id, section: 'messages', ref: idOf(conversation), read: false });
  const note = await Notification.create({ user: other._id, title: `New message from ${actor.name}`, body: preview, type: 'message', link: other.role === 'student' ? '/app/messages' : '/messages', section: 'messages', ref: idOf(conversation) });
  emitToUser(idOf(other), 'notification:new', note.toJSON());
  return populated;
}

export async function toggleFlag(id, actor, field) {
  const conversation = await loadConversation(id, actor);
  const key = field === 'star' ? 'starredBy' : 'archivedBy';
  const has = conversation[key].some((u) => idOf(u) === idOf(actor));
  conversation[key] = has ? conversation[key].filter((u) => idOf(u) !== idOf(actor)) : [...conversation[key], actor._id];
  await conversation.save();
  return shape(conversation, actor);
}

// A teacher only sees the student's enrollments in their own courses.
async function staffEnrollmentScope(actor) {
  if (actor.role !== 'teacher') return {};
  const courseIds = await Course.distinct('_id', { $or: [{ instructor: actor._id }, { teachers: actor._id }] });
  return { course: { $in: courseIds } };
}

export async function participantDetails(id, actor) {
  const conversation = await loadConversation(id, actor);
  const other = conversation.participants.find((p) => idOf(p) !== idOf(actor));
  if (other.role !== 'student') return { user: other.toJSON(), enrollments: [], completedClasses: 0, supportTickets: 0 };
  const [enrollments, completedClasses, supportTickets] = await Promise.all([
    Enrollment.find({ student: other._id, ...(await staffEnrollmentScope(actor)) }).populate('course', 'title thumbnail category').populate('batch', 'name startDate'),
    Attendance.countDocuments({ student: other._id, status: { $in: ['present', 'late'] } }),
    Ticket.countDocuments({ student: other._id }),
  ]);
  return { user: { ...other.toJSON(), online: isOnline(other._id) }, enrollments: enrollments.map((e) => e.toJSON()), completedClasses, supportTickets };
}

export async function listAnnouncements() {
  return Announcement.find().sort({ createdAt: -1 }).limit(50).populate('createdBy', 'name');
}

export async function deliverAnnouncement(announcement) {
  const roleFilter = announcement.audience === 'students' ? { role: 'student' } : announcement.audience === 'teachers' ? { role: 'teacher' } : { role: { $in: ['student', 'teacher'] } };
  const userIds = await User.distinct('_id', { ...roleFilter, status: { $ne: 'inactive' } });
  await notifyUsers(userIds, { title: announcement.title, body: announcement.body, type: 'announcement' });
  announcement.sentAt = new Date();
  await announcement.save();
}

export async function createAnnouncement(actor, payload) {
  const announcement = await Announcement.create({ ...payload, createdBy: actor._id });
  if (!payload.scheduledAt || payload.scheduledAt <= new Date()) await deliverAnnouncement(announcement);
  return announcement;
}

export async function sendDueAnnouncements() {
  const due = await Announcement.find({ sentAt: { $exists: false }, scheduledAt: { $lte: new Date() } });
  for (const announcement of due) await deliverAnnouncement(announcement);
}
