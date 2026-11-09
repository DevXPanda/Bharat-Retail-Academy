import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { cx } from '../../lib/format.js';
import { Checkbox, Select } from '../ui/Form.jsx';
import { EmptyState, ErrorState, Spinner } from '../ui/Display.jsx';
import { Popover } from '../ui/Popover.jsx';

export function DataTable({ columns, rows = [], rowKey = (r) => r.id, selectable, selected = [], onSelectedChange, loading, error, onRetry, empty, onRowClick, className, minWidth = 760 }) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(rowKey(r)));
  const toggleAll = (checked) => onSelectedChange?.(checked ? rows.map(rowKey) : []);
  const toggleOne = (id, checked) => onSelectedChange?.(checked ? [...selected, id] : selected.filter((s) => s !== id));

  return (
    <div className={cx('relative overflow-x-auto', className)}>
      <table className="w-full border-collapse" style={{ minWidth: Math.min(minWidth, 700) }}>
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/70">
            {selectable && (
              <th className="w-10 px-3 py-3">
                <Checkbox checked={allSelected} indeterminate={!allSelected && selected.length > 0} onChange={toggleAll} aria-label="Select all" />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className={cx('th', col.align === 'center' && 'text-center', col.align === 'right' && 'text-right')} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!loading &&
            !error &&
            rows.map((row, index) => {
              const id = rowKey(row);
              return (
                <tr key={id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cx('border-b border-slate-100 last:border-0 transition hover:bg-slate-50/70', onRowClick && 'cursor-pointer', selected.includes(id) && 'bg-brand-50/50')}>
                  {selectable && (
                    <td className="w-10 px-3">
                      <Checkbox checked={selected.includes(id)} onChange={(c) => toggleOne(id, c)} aria-label="Select row" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cx('td', col.align === 'center' && 'text-center', col.align === 'right' && 'text-right', col.className)}>
                      {col.render ? col.render(row, index) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      {loading && (
        <div className="flex items-center justify-center py-14">
          <Spinner className="h-7 w-7" />
        </div>
      )}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && rows.length === 0 && (empty || <EmptyState title="No records found" description="Try changing your filters or search." />)}
    </div>
  );
}

export const indexColumn = (meta) => ({ key: '#', header: '#', width: 44, render: (_row, i) => ((meta?.page || 1) - 1) * (meta?.limit || 10) + i + 1 });

export function RowMenu({ items }) {
  const visible = items.filter(Boolean);
  return (
    <Popover
      width={190}
      trigger={
        <button type="button" aria-label="More actions" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <MoreVertical className="h-4 w-4" />
        </button>
      }
    >
      {(close) => (
        <ul className="py-1.5">
          {visible.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onClick?.();
                }}
                className={cx('flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] hover:bg-slate-50 disabled:opacity-40', item.danger ? 'text-red-600' : 'text-slate-700')}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const items = [];
  const add = (n) => items.push(n);
  if (pages <= 7) for (let i = 1; i <= pages; i += 1) add(i);
  else {
    add(1);
    if (page > 3) add('…l');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i += 1) add(i);
    if (page < pages - 2) add('…r');
    add(pages);
  }
  const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition';
  return (
    <nav className="flex items-center gap-1.5" aria-label="Pagination">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={cx(base, 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 disabled:opacity-40')}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((n) =>
        typeof n === 'string' ? (
          <span key={n} className="px-1 text-slate-400">…</span>
        ) : (
          <button key={n} type="button" onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} className={cx(base, n === page ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300')}>
            {n}
          </button>
        ),
      )}
      <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className={cx(base, 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 disabled:opacity-40')}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export function TableFooter({ meta, noun = 'records', onPage, left, pageSize, onPageSize }) {
  const total = meta?.total || 0;
  const from = total ? (meta.page - 1) * meta.limit + 1 : 0;
  const to = Math.min(total, meta?.page * meta?.limit || 0);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
      <div className="flex items-center gap-3">
        {left}
        <p className="text-[13px] text-slate-500">{total ? `Showing ${from} to ${to} of ${total} ${noun}` : `No ${noun}`}</p>
      </div>
      <div className="flex items-center gap-3">
        <Pagination page={meta?.page || 1} pages={meta?.pages || 1} onChange={onPage} />
        {onPageSize && (
          <div className="w-28">
            <Select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} compact>
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export function BulkActions({ selected, actions, onApply, loading }) {
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const action = new FormData(e.currentTarget).get('action');
        if (action) onApply(action);
      }}
    >
      <div className="w-36">
        <Select name="action" defaultValue="" compact>
          <option value="">Bulk Actions</option>
          {actions.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </Select>
      </div>
      <button type="submit" disabled={!selected.length || loading} className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-600 enabled:bg-brand-600 enabled:text-white disabled:cursor-not-allowed">
        Apply
      </button>
    </form>
  );
}
