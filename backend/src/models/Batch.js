import mongoose from 'mongoose';
import { BATCH_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const batchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    timing: { type: String, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    capacity: { type: Number, default: 50, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: BATCH_STATUS, default: 'upcoming', index: true },
  },
  { timestamps: true },
);

export const deriveBatchStatus = (batch, now = new Date()) => {
  if (batch.status === 'draft') return 'draft';
  if (now < batch.startDate) return 'upcoming';
  if (now > batch.endDate) return 'completed';
  return 'active';
};

batchSchema.plugin(jsonPlugin);

export default mongoose.model('Batch', batchSchema);
