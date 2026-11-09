import mongoose from 'mongoose';
import { PAYOUT_METHODS, PAYOUT_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const payoutSchema = new Schema(
  {
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    periodLabel: String,
    classesConducted: { type: Number, default: 0 },
    earnings: { type: Number, required: true, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYOUT_METHODS, default: 'Bank Transfer' },
    status: { type: String, enum: PAYOUT_STATUS, default: 'pending', index: true },
    payoutDate: Date,
    transactionId: String,
    failureReason: String,
  },
  { timestamps: true },
);

payoutSchema.plugin(jsonPlugin);

export default mongoose.model('Payout', payoutSchema);
