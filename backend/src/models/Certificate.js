import mongoose from 'mongoose';
import { CERTIFICATE_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const certificateSchema = new Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
    completionDate: { type: Date, default: Date.now },
    status: { type: String, enum: CERTIFICATE_STATUS, default: 'pending', index: true },
    downloads: { type: Number, default: 0 },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

certificateSchema.index({ student: 1, course: 1 }, { unique: true });

certificateSchema.plugin(jsonPlugin);

export default mongoose.model('Certificate', certificateSchema);
