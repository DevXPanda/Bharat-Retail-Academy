export const TONES = {
  blue: { tile: 'bg-blue-100 text-blue-600', card: 'from-white to-blue-50/70', bar: 'bg-blue-500', hex: '#2f6df3' },
  green: { tile: 'bg-emerald-100 text-emerald-600', card: 'from-white to-emerald-50/70', bar: 'bg-emerald-500', hex: '#22c55e' },
  orange: { tile: 'bg-amber-100 text-amber-600', card: 'from-white to-amber-50/70', bar: 'bg-amber-500', hex: '#f59e0b' },
  purple: { tile: 'bg-violet-100 text-violet-600', card: 'from-white to-violet-50/70', bar: 'bg-violet-500', hex: '#8b5cf6' },
  red: { tile: 'bg-red-100 text-red-500', card: 'from-white to-red-50/70', bar: 'bg-red-500', hex: '#ef4444' },
  pink: { tile: 'bg-pink-100 text-pink-500', card: 'from-white to-pink-50/70', bar: 'bg-pink-500', hex: '#ec4899' },
  slate: { tile: 'bg-slate-100 text-slate-500', card: 'from-white to-slate-50', bar: 'bg-slate-400', hex: '#94a3b8' },
};

export const CHART_COLORS = ['#2f6df3', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#94a3b8'];

const BADGES = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-violet-100 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
};

export const badgeClass = (tone) => BADGES[tone] || BADGES.slate;

const STATUS = {
  active: ['green', 'Active'],
  pending: ['amber', 'Pending'],
  inactive: ['red', 'Inactive'],
  upcoming: ['blue', 'Upcoming'],
  live: ['red', 'Live Now'],
  completed: ['green', 'Completed'],
  cancelled: ['slate', 'Cancelled'],
  published: ['green', 'Published'],
  draft: ['orange', 'Draft'],
  unpublished: ['red', 'Unpublished'],
  processing: ['amber', 'Processing'],
  archived: ['slate', 'Archived'],
  verified: ['green', 'Verified'],
  downloaded: ['blue', 'Downloaded'],
  revoked: ['red', 'Revoked'],
  expired: ['slate', 'Expired'],
  successful: ['green', 'Successful'],
  failed: ['red', 'Failed'],
  refunded: ['purple', 'Refunded'],
  paid: ['green', 'Paid'],
  present: ['green', 'Present'],
  absent: ['red', 'Absent'],
  late: ['amber', 'Late'],
  not_marked: ['slate', 'Not Marked'],
  enrolled: ['green', 'Enrolled'],
  joined: ['green', 'Joined'],
  waiting: ['amber', 'Waiting'],
  closed: ['slate', 'Closed'],
  open: ['blue', 'Open'],
  in_progress: ['amber', 'In Progress'],
  resolved: ['green', 'Resolved'],
  unbilled: ['slate', 'Unbilled'],
  default: ['green', 'Default'],
};

export const statusMeta = (status, tone) => {
  const [defaultTone, label] = STATUS[status] || ['slate', String(status || '—')];
  return { tone: tone || defaultTone, label };
};
