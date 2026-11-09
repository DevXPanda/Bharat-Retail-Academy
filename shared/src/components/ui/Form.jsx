import { forwardRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cx } from '../../lib/format.js';

export function Field({ label, required, error, hint, className, children }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cx('field-input', invalid && 'border-red-300', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cx('field-input h-auto resize-y py-2.5', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, compact, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cx('field-input appearance-none pr-9', compact && 'h-10 bg-white font-medium', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
});

export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field-input pl-9" />
    </div>
  );
}

export function Checkbox({ checked, indeterminate, onChange, className, ...props }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => el && (el.indeterminate = Boolean(indeterminate))}
      onChange={(e) => onChange?.(e.target.checked)}
      className={cx('h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-400', className)}
      {...props}
    />
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3">
      <span className={cx('relative h-6 w-11 rounded-full transition', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </button>
  );
}
