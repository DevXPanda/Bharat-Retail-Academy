import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/format.js';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-300',
  outline: 'border border-slate-200 bg-white text-brand-700 hover:bg-brand-50 disabled:text-slate-400',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:text-slate-400',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

const SIZES = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-11 px-6 text-sm' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={loading || props.disabled}
      className={cx('inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition disabled:cursor-not-allowed', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});

export function IconButton({ icon: Icon, label, className, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-40', className)} {...props}>
      <Icon className="h-4 w-4" />
    </button>
  );
}
