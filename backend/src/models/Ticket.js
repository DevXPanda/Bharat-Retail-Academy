import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

export const TICKET_CATEGORIES = ['payment', 'course_access', 'live_class', 'certificate', 'technical', 'other'];
export const TICKET_STATUS = ['open', 'in_progress', 'resolved', 'closed'];

const ticketSchema = new Schema(
  {
    ticketNumber: { type: Number, unique: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'other' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: TICKET_STATUS, default: 'open', index: true },
    replies: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['student', 'admin'], required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastReplyAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  { timestamps: true },
);

ticketSchema.plugin(jsonPlugin);

export default mongoose.model('Ticket', ticketSchema);
