import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const assignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dueDate: Date,
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    submissions: [
      {
        student: { type: Schema.Types.ObjectId, ref: 'User' },
        fileUrl: String,
        note: String,
        submittedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

assignmentSchema.plugin(jsonPlugin);

export default mongoose.model('Assignment', assignmentSchema);
