import mongoose from 'mongoose';

const { Schema } = mongoose;

// One-time codes: email verification OTPs and password reset links. Only a hash is stored, never the code itself.
const authCodeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['verify', 'reset'], required: true },
    codeHash: { type: String, required: true, index: true },
    attempts: { type: Number, default: 0 },
    usedAt: Date,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

// A record of every email the platform tried to send, for debugging delivery problems.
const emailLogSchema = new Schema(
  {
    to: { type: String, required: true, index: true },
    role: String,
    template: { type: String, required: true, index: true },
    subject: String,
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    providerId: String,
    error: String,
    createdAt: { type: Date, default: Date.now, index: { expireAfterSeconds: 90 * 24 * 3600 } },
  },
  { versionKey: false },
);

export const AuthCode = mongoose.model('AuthCode', authCodeSchema);
export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
