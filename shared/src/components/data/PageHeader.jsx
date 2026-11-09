import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cx } from '../../lib/format.js';

export function PageHeader({ title, subtitle, actions, breadcrumb, className }) {
  return (
    <div className={cx('mb-5 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {breadcrumb && (
          <nav className="mb-1.5 flex items-center gap-1.5 text-[13px] text-slate-500" aria-label="Breadcrumb">
            <Link to="/" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
              <Home className="h-3.5 w-3.5" />
              {breadcrumb[0]}
            </Link>
            {breadcrumb.slice(1).map((crumb) => (
              <span key={crumb} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                {crumb}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function TableCard({ title, action, tabs, children, className }) {
  return (
    <section className={cx('card overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          {action}
        </header>
      )}
      {tabs}
      {children}
    </section>
  );
}

export function SidePanel({ title, tabs, children, footer, className }) {
  return (
    <aside className={cx('card flex flex-col', className)}>
      <header className="px-5 pt-5">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
      </header>
      {tabs}
      <div className="flex-1 space-y-4 p-5">{children}</div>
      {footer && <footer className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">{footer}</footer>}
    </aside>
  );
}

export function ViewAll({ to, onClick, label = 'View All' }) {
  const cls = 'inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline';
  if (to) {
    return (
      <Link to={to} className={cls}>
        {label} →
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label} →
    </button>
  );
}
