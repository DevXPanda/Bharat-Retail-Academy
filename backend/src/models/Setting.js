import mongoose from 'mongoose';
import { jsonPlugin } from './plugins.js';

const { Schema } = mongoose;

// A single document holding the settings an admin can change without touching .env.
const settingSchema = new Schema(
  {
    key: { type: String, default: 'platform', unique: true },
    gstPercent: { type: Number, default: 18, min: 0, max: 50 },
    gstMode: { type: String, enum: ['inclusive', 'exclusive'], default: 'inclusive' },
    platformFeePercent: { type: Number, default: 10, min: 0, max: 90 },
    businessName: { type: String, default: 'Bharat Retail Academy' },
    gstin: { type: String, default: '' },
    supportEmail: { type: String, default: 'support@ecomedu.in' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    supportHours: { type: String, default: 'Mon - Sat, 10:00 AM - 7:00 PM IST' },
    address: { type: String, default: 'Connaught Place, New Delhi - 110001, India' },
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    invoicePrefix: { type: String, default: 'INV' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

settingSchema.plugin(jsonPlugin);

export default mongoose.model('Setting', settingSchema);
