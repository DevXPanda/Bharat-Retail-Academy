import Setting from '../models/Setting.js';
import { round2 } from '../utils/format.js';

const TTL_MS = 10000;
let cache = { value: null, at: 0 };

// Reads the settings document (created from .env defaults the first time) with a short cache.
export async function getSettings() {
  if (cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  let doc = await Setting.findOne({ key: 'platform' });
  if (!doc) doc = await Setting.create({ key: 'platform' });
  cache = { value: doc.toJSON(), at: Date.now() };
  return cache.value;
}

export async function updateSettings(patch, userId) {
  const doc = (await Setting.findOne({ key: 'platform' })) || new Setting({ key: 'platform' });
  const { social, ...rest } = patch;
  Object.assign(doc, rest, { updatedBy: userId });
  if (social) Object.assign(doc.social, social);
  await doc.save();
  cache = { value: null, at: 0 };
  return getSettings();
}

// What a student is charged for a course price, and how much of it is GST.
export function computePrice(price, { gstPercent, gstMode }) {
  const base = round2(Number(price) || 0);
  if (!base || !gstPercent) return { coursePrice: base, baseAmount: base, gstAmount: 0, gstPercent: gstPercent || 0, gstMode, total: base };
  if (gstMode === 'exclusive') {
    const gstAmount = round2((base * gstPercent) / 100);
    return { coursePrice: base, baseAmount: base, gstAmount, gstPercent, gstMode, total: round2(base + gstAmount) };
  }
  const gstAmount = round2((base * gstPercent) / (100 + gstPercent));
  return { coursePrice: base, baseAmount: round2(base - gstAmount), gstAmount, gstPercent, gstMode, total: base };
}

// Only what the public website needs (never the internal fee %).
export const publicSettings = (s) => ({
  gstPercent: s.gstPercent,
  gstMode: s.gstMode,
  businessName: s.businessName,
  gstin: s.gstin,
  supportEmail: s.supportEmail,
  supportPhone: s.supportPhone,
  supportHours: s.supportHours,
  address: s.address,
  social: s.social,
});
