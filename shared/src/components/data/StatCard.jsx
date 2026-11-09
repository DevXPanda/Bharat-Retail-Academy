import { ArrowDown, ArrowUp } from 'lucide-react';
import { cx } from '../../lib/format.js';
import { TONES } from '../../lib/tones.js';

export function Trend({ value, suffix = 'vs last month' }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs">
      <span className={cx('inline-flex items-center gap-0.5 font-semibold', up ? 'text-emerald-600' : 'text-red-500')}>
        <Icon className="h-3 w-3" />
        {up ? '' : '-'}
        {Math.abs(value)}%
      </span>
      {suffix && <span className="text-slate-400">{suffix}</span>}
    </p>
  );
}

export function StatCard({ icon: Icon, tone = 'blue', label, value, trend, trendSuffix, sub, className, onClick }) {
  const t = TONES[tone] || TONES.blue;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cx('card flex min-w-0 items-center gap-3.5 bg-gradient-to-br px-4 py-4 text-left', t.card, onClick && 'transition hover:-translate-y-0.5', className)}
    >
      {Icon && (
        <span className={cx('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', t.tile)}>
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-600">{label}</p>
        <p className="truncate text-[26px] font-extrabold leading-tight tracking-tight text-ink">{value}</p>
        {trend !== undefined && <Trend value={trend} suffix={trendSuffix} />}
        {sub && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{sub}</p>}
      </div>
    </Comp>
  );
}

const COLS = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };

export function StatGrid({ cols = 4, className, children }) {
  return <div className={cx('grid grid-cols-1 gap-4 sm:grid-cols-2', COLS[cols], className)}>{children}</div>;
}
