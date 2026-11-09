import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
    amount: { type: Number, required: true, min: 0 },
    coursePrice: Number,
    baseAmount: Number,
    gstPercent: Number,
    gstAmount: Number,
    gstMode: { type: String, enum: ['inclusive', 'exclusive'] },
    invoiceNumber: { type: String, index: true, sparse: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, default: 'Razorpay' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'created', index: true },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: String,
    transactionId: String,
    failureReason: String,
    paidAt: Date,
    refund: {
      amount: Number,
      razorpayRefundId: String,
      reason: String,
      refundedAt: Date,
    },
  },
  { timestamps: true },
);

paymentSchema.plugin(jsonPlugin);

export default mongoose.model('Payment', paymentSchema);
