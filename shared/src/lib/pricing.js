const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Mirrors the server: what a student pays for a course price and how much of it is GST.
export function computePrice(price, { gstPercent = 0, gstMode = 'inclusive' } = {}) {
  const base = round2(price || 0);
  if (!base || !gstPercent) return { coursePrice: base, baseAmount: base, gstAmount: 0, gstPercent, gstMode, total: base };
  if (gstMode === 'exclusive') {
    const gstAmount = round2((base * gstPercent) / 100);
    return { coursePrice: base, baseAmount: base, gstAmount, gstPercent, gstMode, total: round2(base + gstAmount) };
  }
  const gstAmount = round2((base * gstPercent) / (100 + gstPercent));
  return { coursePrice: base, baseAmount: round2(base - gstAmount), gstAmount, gstPercent, gstMode, total: base };
}

export const feeSplit = (earnings, feePercent = 0) => {
  const fee = round2((earnings * feePercent) / 100);
  return { fee, net: round2(earnings - fee) };
};
