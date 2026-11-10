
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, ChevronRight, Home, Inbox, PackageSearch, Store } from 'lucide-react';
import { Checkbox } from '../ui/Form.jsx';
import { Badge, EmptyState, ErrorState, Spinner } from '../ui/Display.jsx';
import { Trend } from './StatCard.jsx';
import { cx } from '../../lib/format.js';
import { useRowHighlight } from '../../hooks/notifications.js';
import { ChatCenter } from '../chat/ChatCenter.jsx';
import { PortalDrawer } from '../layout/PortalDrawer.jsx';

export function PortalChatCenter(props) {
  return <ChatCenter {...props} overlay={PortalDrawer} />;
}

export function PortalPageHeader({ title, subtitle, actions, breadcrumb, className }) {
  return <div className={cx('portal-page-header', className)}>
    <div className="min-w-0">
      {breadcrumb && <nav className="portal-breadcrumb" aria-label="Breadcrumb"><Link to="/"><Home size={12} />{breadcrumb[0]}</Link>{breadcrumb.slice(1).map((crumb) => <span key={crumb}><ChevronRight size={12} />{crumb}</span>)}</nav>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="portal-page-actions">{actions}</div>}
  </div>;
}

export function PortalStatCard({ icon: Icon, tone = 'blue', label, value, trend, trendSuffix, sub, className, onClick, to }) {
  const Component = to ? Link : onClick ? 'button' : 'div';
  return <Component to={to} type={onClick && !to ? 'button' : undefined} onClick={onClick} className={cx('card portal-stat', `portal-tone-${tone}`, className)}>
    <div className="portal-stat-top"><p>{label}</p>{Icon && <Icon size={18} aria-hidden="true" />}</div>
    <strong title={String(value ?? '')}>{value}</strong>
    {trend !== undefined && <Trend value={trend} suffix={trendSuffix} />}
    {sub && <p className="portal-stat-sub">{sub}</p>}
  </Component>;
}

export function PortalStatGrid({ cols = 4, className, children }) {
  return <div className={cx('portal-stat-grid', className)} style={{ '--stat-columns': cols }}>{children}</div>;
}

export function PortalTableCard({ title, action, tabs, children, className }) {
  return <section className={cx('card portal-table-card', className)}>
    {(title || action) && <header className="portal-panel-heading"><h3>{title}</h3>{action}</header>}
    {tabs}{children}
  </section>;
}

export function PortalSidePanel({ title, tabs, children, footer, className }) {
  return <aside className={cx('card portal-side-panel', className)}>
    <header className="portal-panel-heading"><h3>{title}</h3></header>
    {tabs}
    <div className="portal-side-content">{children}</div>
    {footer && <footer className="portal-side-footer">{footer}</footer>}
  </aside>;
}

export function PortalViewAll({ to, onClick, label = 'View all' }) {
  const content = <>{label}<ArrowRight size={14} aria-hidden="true" /></>;
  return to ? <Link className="portal-view-all" to={to}>{content}</Link> : <button type="button" className="portal-view-all" onClick={onClick}>{content}</button>;
}

export function PortalDataTable({ columns, rows = [], rowKey = (row) => row.id, selectable, selected = [], onSelectedChange, loading, error, onRetry, empty, onRowClick, className, minWidth = 760, label = 'Data table, scroll horizontally for more columns' }) {
  const { isUnread, markRead } = useRowHighlight();
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(rowKey(row)));
  return <div className={cx('portal-table-wrap', className)}>
    <div className="portal-table-scroll" tabIndex={0} role="region" aria-label={label}>
      <table style={{ minWidth }}>
        <caption className="sr-only">{label}</caption>
        <thead><tr>
          {selectable && <th className="portal-table-check"><Checkbox checked={allSelected} indeterminate={!allSelected && selected.length > 0} onChange={(checked) => onSelectedChange?.(checked ? rows.map(rowKey) : [])} aria-label="Select all" /></th>}
          {columns.map((column) => <th key={column.key} scope="col" className={cx(column.align === 'center' && 'text-center', column.align === 'right' && 'text-right')} style={{ width: column.width }}>{column.header}</th>)}
        </tr></thead>
        <tbody>{!loading && !error && rows.map((row, index) => {
          const id = rowKey(row);
          const fresh = isUnread(id);
          return <tr key={id} className={cx(selected.includes(id) && 'is-selected', onRowClick && 'is-clickable', fresh && 'is-new')} onClick={onRowClick || fresh ? (event) => { if (fresh) markRead(id); if (onRowClick && !event.target.closest('a, button, input, select, textarea')) onRowClick(row); } : undefined} tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? (event) => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onRowClick(row); } } : undefined}>
            {selectable && <td className="portal-table-check" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.includes(id)} onChange={(checked) => onSelectedChange?.(checked ? [...selected, id] : selected.filter((item) => item !== id))} aria-label="Select row" /></td>}
            {columns.map((column) => <td key={column.key} className={cx(column.align === 'center' && 'text-center', column.align === 'right' && 'text-right', column.className)}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {loading && <div className="portal-table-loading"><Spinner /></div>}
    {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
    {!loading && !error && rows.length === 0 && (empty || <EmptyState icon={Inbox} title="No records found" description="Try another search or filter." />)}
  </div>;
}

export function PortalInsights({ children, className }) {
  return <div className={cx('portal-insights', className)}>{children}</div>;
}

export function PortalWorkspace({ insights, children, className }) {
  return <div className={cx('portal-workspace', className)}>
    {insights && <PortalInsights>{insights}</PortalInsights>}
    <div className="portal-workspace-main">{children}</div>
  </div>;
}

const LOGOS = { Amazon: 'amazon.svg', Flipkart: 'flipkart.svg', Meesho: 'meesho.ico', Shopify: 'shopify.svg', 'WhatsApp Marketing': 'whatsapp.svg', 'Digital Marketing': 'googleads.svg' };

export function PortalCourseMark({ category, src, size = 44, className }) {
  const logo = LOGOS[category];
  const Icon = category === 'Product Sourcing' ? PackageSearch : category === 'Business Skills' ? BriefcaseBusiness : Store;
  return <span className={cx('portal-course-mark', className)} style={{ width: size, height: size }}>
    {src ? <img src={src} alt="" className="portal-course-thumbnail" /> : logo ? <img src={`/brands/${logo}`} alt={category} /> : <Icon aria-hidden="true" size={size * .66} />}
  </span>;
}

export function PortalClassCell({ cls }) {
  return <div className="portal-course-cell"><PortalCourseMark category={cls.course?.category} src={cls.course?.thumbnail} size={38} /><div><p>{cls.title}</p>{cls.isFreeDemo && <Badge tone="amber" className="mt-1 !px-1.5 !py-0.5 !text-[10px]">Free demo</Badge>}</div></div>;
}

export function PortalCourseCell({ course, sub }) {
  return <div className="portal-course-cell"><PortalCourseMark category={course?.category} src={course?.thumbnail} size={40} /><div><p>{course?.title}</p>{sub && <small>{sub}</small>}</div></div>;
}
