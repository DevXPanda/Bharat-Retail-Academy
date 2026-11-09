import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    participantKey: { type: String, unique: true, index: true },
    lastMessage: { text: String, sender: { type: Schema.Types.ObjectId, ref: 'User' } },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unread: { type: Map, of: Number, default: {} },
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });
conversationSchema.plugin(jsonPlugin);

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, default: '' },
    attachments: [{ name: String, url: String, size: Number, mime: String }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

messageSchema.plugin(jsonPlugin);

export const Conversation = mongoose.model('Conversation', conversationSchema);
export const Message = mongoose.model('Message', messageSchema);
