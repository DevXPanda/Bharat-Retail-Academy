import LoginEvent from '../models/LoginEvent.js';
import { Conversation, Message } from '../models/Message.js';
import { ClassChat } from '../models/Engagement.js';
import { ApiError } from '../utils/ApiError.js';

// Turns a raw user-agent string into "Chrome on Windows" for the admin screens.
export function describeAgent(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ua ? 'Browser' : 'Unknown';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

export const recordLogin = (user, portal, meta = {}) => LoginEvent.create({ user: user._id, portal, ip: meta.ip, userAgent: meta.userAgent }).catch(() => {});

export async function loginsFor(userId, limit = 20) {
  const rows = await LoginEvent.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
  return rows.map((r) => ({ id: r.id, at: r.createdAt, portal: r.portal, ip: r.ip, device: describeAgent(r.userAgent) }));
}

// Every conversation the user is part of, with who they spoke to and how many messages.
export async function conversationsFor(userId) {
  const conversations = await Conversation.find({ participants: userId }).sort({ lastMessageAt: -1 }).limit(40).populate('participants', 'name avatar role email');
  const counts = await Message.aggregate([{ $match: { conversation: { $in: conversations.map((c) => c._id) } } }, { $group: { _id: '$conversation', count: { $sum: 1 } } }]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  return conversations
    .filter((c) => c.lastMessage?.text || byId.get(String(c._id)))
    .map((c) => ({
      id: c.id,
      with: c.participants.find((p) => String(p._id) !== String(userId))?.toJSON() || null,
      lastMessage: c.lastMessage?.text,
      lastMessageAt: c.lastMessageAt,
      messageCount: byId.get(String(c._id)) || 0,
    }));
}

// The full thread, only for a conversation this user actually took part in.
export async function threadFor(userId, conversationId) {
  const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).populate('participants', 'name avatar role');
  if (!conversation) throw ApiError.notFound('Conversation not found');
  const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 }).limit(300).populate('sender', 'name avatar role');
  return { participants: conversation.participants.map((p) => p.toJSON()), messages: messages.map((m) => m.toJSON()) };
}

// Messages the user wrote in live-class chat and Q&A.
export async function classChatFor(userId, limit = 100) {
  const rows = await ClassChat.find({ sender: userId }).sort({ createdAt: -1 }).limit(limit).populate({ path: 'liveClass', select: 'title startsAt course', populate: { path: 'course', select: 'title' } });
  return rows.filter((r) => r.liveClass).map((r) => ({ id: r.id, text: r.text, kind: r.kind, at: r.createdAt, classTitle: r.liveClass.title, course: r.liveClass.course?.title, classDate: r.liveClass.startsAt }));
}
