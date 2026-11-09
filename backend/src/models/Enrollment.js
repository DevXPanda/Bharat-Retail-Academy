import mongoose from 'mongoose';
import { ENROLLMENT_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const enrollmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    status: { type: String, enum: ENROLLMENT_STATUS, default: 'active', index: true },
    accessStart: { type: Date, default: Date.now },
    accessEnd: Date,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [String],
    lessonLog: [{ _id: false, lesson: String, completedAt: { type: Date, default: Date.now } }],
    source: { type: String, enum: ['payment', 'admin'], default: 'admin' },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    completedAt: Date,
  },
  { timestamps: true },
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

enrollmentSchema.plugin(jsonPlugin);

export default mongoose.model('Enrollment', enrollmentSchema);
