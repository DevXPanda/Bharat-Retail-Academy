import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ['all', 'students', 'teachers'], default: 'all' },
    scheduledAt: Date,
    sentAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: String,
    type: { type: String, default: 'info' },
    link: String,
    read: { type: Boolean, default: false, index: true },
    // Sidebar section this belongs to (matches the portal route segment) and the row it points at.
    section: { type: String, index: true },
    ref: String,
    // seen = the user has opened the sidebar section (clears the sidebar count); read = they opened the row itself.
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const reviewSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true },
);
reviewSchema.index({ course: 1, student: 1 }, { unique: true });

const classChatSchema = new Schema(
  {
    liveClass: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['chat', 'qa'], default: 'chat' },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required() { return this.source !== 'newsletter'; }, trim: true },
    goal: String,
    message: String,
    source: { type: String, enum: ['hero', 'contact', 'newsletter'], default: 'hero', index: true },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new', index: true },
    note: String,
  },
  { timestamps: true },
);

[announcementSchema, notificationSchema, reviewSchema, classChatSchema, leadSchema].forEach((s) => s.plugin(jsonPlugin));

export const Announcement = mongoose.model('Announcement', announcementSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const ClassChat = mongoose.model('ClassChat', classChatSchema);
export const Lead = mongoose.model('Lead', leadSchema);
