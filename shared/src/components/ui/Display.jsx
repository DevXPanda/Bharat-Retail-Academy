import { Loader2, Inbox } from 'lucide-react';
import { cx, initials } from '../../lib/format.js';
import { badgeClass, statusMeta } from '../../lib/tones.js';

export function Badge({ tone = 'slate', children, className }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold', badgeClass(tone), className)}>{children}</span>;
}

export function StatusBadge({ status, tone, label, className }) {
  const meta = statusMeta(status, tone);
  return <Badge tone={meta.tone} className={className}>{label || meta.label}</Badge>;
}

const AVATAR_TONES = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700'];

export function Avatar({ name = '', src, size = 36, className }) {
  const tone = AVATAR_TONES[(name.charCodeAt(0) + name.length) % AVATAR_TONES.length] || AVATAR_TONES[0];
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };
  if (src) return <img src={src} alt={name} style={style} className={cx('shrink-0 rounded-full object-cover', className)} />;
  return (
    <span style={style} className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', tone, className)}>
      {initials(name) || '?'}
    </span>
  );
}

export function PersonCell({ name, sub, src, size = 36 }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} src={src} size={size} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
        {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0, tone = 'blue', className, showLabel }) {
  const colors = { blue: 'bg-blue-500', green: 'bg-emerald-500', purple: 'bg-violet-500', orange: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full min-w-[60px] overflow-hidden rounded-full bg-slate-100">
        <div className={cx('h-full rounded-full transition-all', colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-600">{Math.round(value)}%</span>}
    </div>
  );
}

export function progressTone(value) {
  if (value >= 80) return 'green';
  if (value >= 60) return 'blue';
  if (value >= 40) return 'purple';
  return 'orange';
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-brand-600', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-semibold text-red-600">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-brand-600 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Card({ title, action, className, bodyClassName, children }) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          {typeof title === 'string' ? <h3 className="text-[15px] font-bold text-ink">{title}</h3> : title}
          {action}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
