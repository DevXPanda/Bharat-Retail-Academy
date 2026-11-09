import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    liveClass: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUS, default: 'not_marked' },
    joinTime: Date,
    sessionStart: Date,
    leaveTime: Date,
    durationMin: { type: Number, default: 0 },
  },
  { timestamps: true },
);

attendanceSchema.index({ liveClass: 1, student: 1 }, { unique: true });

attendanceSchema.plugin(jsonPlugin);

export default mongoose.model('Attendance', attendanceSchema);
