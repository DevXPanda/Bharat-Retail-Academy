import mongoose from 'mongoose';
import { RECORDING_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const recordingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    liveClass: { type: Schema.Types.ObjectId, ref: 'LiveClass' },
    videoUrl: String,
    thumbnail: String,
    durationSec: { type: Number, default: 0 },
    classDate: { type: Date, default: Date.now },
    status: { type: String, enum: RECORDING_STATUS, default: 'unpublished', index: true },
    processingProgress: { type: Number, default: 0, min: 0, max: 100 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

recordingSchema.plugin(jsonPlugin);

export default mongoose.model('Recording', recordingSchema);
