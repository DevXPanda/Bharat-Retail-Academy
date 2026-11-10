import mongoose from 'mongoose';
import { CLASS_PLATFORMS, CLASS_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const liveClassSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    topic: String,
    description: String,
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startsAt: { type: Date, required: true, index: true },
    durationMin: { type: Number, default: 60, min: 5 },
    maxStudents: { type: Number, default: 100, min: 1 },
    platform: { type: String, enum: CLASS_PLATFORMS, default: 'jitsi' },
    meetingLink: String,
    roomName: { type: String, index: true },
    status: { type: String, enum: CLASS_STATUS, default: 'upcoming', index: true },
    startedAt: Date,
    endedAt: Date,
    earning: { type: Number, default: 0 },
    payout: { type: Schema.Types.ObjectId, ref: 'Payout', index: true },
    notifyStudents: { type: Boolean, default: true },
    reminderSentAt: Date,
    isFreeDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

liveClassSchema.virtual('endsAt').get(function endsAt() {
  return new Date(this.startsAt.getTime() + this.durationMin * 60000);
});

liveClassSchema.plugin(jsonPlugin);

export default mongoose.model('LiveClass', liveClassSchema);
