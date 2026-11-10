import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

export const TICKET_CATEGORIES = ['payment', 'course_access', 'live_class', 'recording', 'certificate', 'technical', 'account', 'payout', 'course_content', 'students', 'other'];
export const TICKET_STATUS = ['open', 'in_progress', 'resolved', 'closed'];

const ticketSchema = new Schema(
  {
    ticketNumber: { type: Number, unique: true, index: true },
    // The person who raised the ticket (a student or a teacher).
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requesterRole: { type: String, enum: ['student', 'teacher'], default: 'student', index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'other' },
    issue: String,
    // Exact record the issue is about (payment, class, payout...), verified to belong to the requester.
    related: { kind: String, ref: Schema.Types.ObjectId, label: String, _id: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: TICKET_STATUS, default: 'open', index: true },
    replies: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
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
