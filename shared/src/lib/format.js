export const cx = (...parts) => parts.flat().filter(Boolean).join(' ');

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');

export const formatCurrency = (value = 0) => inr.format(value || 0);
export const formatNumber = (value = 0) => num.format(value || 0);

export const formatCompact = (value = 0) => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
};

const toDate = (value) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value) => (value ? toDate(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export const formatDateLong = (value) =>
  value ? toDate(value).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatTime = (value) => (value ? toDate(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '—');

export const formatDateTime = (value) => (value ? `${formatDate(value)} ${formatTime(value)}` : '—');

export const formatDuration = (minutes = 0) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

export const formatVideoLength = (seconds = 0) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const timeAgo = (value) => {
  if (!value) return '—';
  const diff = Date.now() - toDate(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
};

export const chatTime = (value) => {
  const date = toDate(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(date);
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const startsInLabel = (minutes) => {
  if (minutes <= 0) return 'Starting now';
  if (minutes < 60) return `Starts in ${minutes}m`;
  if (minutes < 1440) return `Starts in ${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / 1440);
  return days === 1 ? 'Tomorrow' : `Starts in ${days} days`;
};

export const toInputDate = (value) => (value ? toDate(value).toISOString().slice(0, 10) : '');

export const toInputTime = (value) => {
  if (!value) return '';
  const d = toDate(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const combineDateTime = (date, time) => (date && time ? new Date(`${date}T${time}`).toISOString() : undefined);

export const assetUrl = (path) => path || '';
