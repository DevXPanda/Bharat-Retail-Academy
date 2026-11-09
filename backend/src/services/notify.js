import { Notification } from '../models/Engagement.js';
import { emitToUser } from './realtime.js';

export async function notifyUsers(userIds, { title, body, type = 'info', link }) {
  const unique = [...new Set(userIds.map(String))];
  if (!unique.length) return [];
  const docs = await Notification.insertMany(unique.map((user) => ({ user, title, body, type, link })));
  docs.forEach((doc) => emitToUser(doc.user, 'notification:new', doc.toJSON()));
  return docs;
}
