import mongoose from 'mongoose';
import { CATEGORIES, COURSE_BADGES, COURSE_LEVELS, COURSE_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const lessonSchema = new Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['video', 'pdf', 'text'], default: 'video' },
  url: String,
  durationMin: { type: Number, default: 0 },
  isPreview: { type: Boolean, default: false },
});

const moduleSchema = new Schema({
  title: { type: String, required: true, trim: true },
  lessons: [lessonSchema],
});

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    shortDescription: { type: String, required: true, trim: true },
    description: String,
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    thumbnail: String,
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    level: { type: String, enum: COURSE_LEVELS, default: 'Beginner' },
    language: { type: String, default: 'Hindi, English' },
    modules: [moduleSchema],
    lessonsCount: { type: Number, default: 0 },
    liveClassesCount: { type: Number, default: 0 },
    badge: { type: String, enum: [...COURSE_BADGES, ''], default: '' },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    teachers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    status: { type: String, enum: COURSE_STATUS, default: 'draft', index: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    settings: {
      certificate: { type: Boolean, default: true },
      accessDays: { type: Number, default: 365 },
    },
  },
  { timestamps: true },
);

courseSchema.virtual('discountPercent').get(function discountPercent() {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

courseSchema.pre('save', function countLessons(next) {
  if (this.isModified('modules')) {
    this.lessonsCount = this.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  }
  next();
});

courseSchema.plugin(jsonPlugin);

export default mongoose.model('Course', courseSchema);
