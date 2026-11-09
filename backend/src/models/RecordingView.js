import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

// How many times each student opened each recording (the recording itself only keeps a total).
const recordingViewSchema = new Schema(
  {
    recording: { type: Schema.Types.ObjectId, ref: 'Recording', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    count: { type: Number, default: 1 },
    firstViewedAt: { type: Date, default: Date.now },
    lastViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

recordingViewSchema.index({ recording: 1, student: 1 }, { unique: true });
recordingViewSchema.plugin(jsonPlugin);

export default mongoose.model('RecordingView', recordingViewSchema);
