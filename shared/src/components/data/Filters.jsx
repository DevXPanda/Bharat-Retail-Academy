import { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { cx, formatDate } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Input, SearchInput, Select } from '../ui/Form.jsx';
import { Popover } from '../ui/Popover.jsx';

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('flex gap-6 overflow-x-auto border-b border-slate-100 px-5', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={cx('-mb-px whitespace-nowrap border-b-2 py-3.5 text-sm font-semibold transition', value === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800')}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function DateRangeField({ from, to, onChange, placeholder = 'Select Date Range', className }) {
  const [draft, setDraft] = useState({ from: from || '', to: to || '' });
  const label = from || to ? `${from ? formatDate(from) : '…'} - ${to ? formatDate(to) : '…'}` : placeholder;
  return (
    <Popover
      align="left"
      width={300}
      onOpenChange={(open) => open && setDraft({ from: from || '', to: to || '' })}
      trigger={
        <button type="button" className={cx('field-input flex items-center gap-2 text-left', !(from || to) && 'text-slate-400', className)}>
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{label}</span>
          {(from || to) && (
            <span
              role="button"
              aria-label="Clear dates"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ from: '', to: '' });
              }}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      }
    >
      {(close) => (
        <div className="space-y-3 p-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">From</p>
            <Input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">To</p>
            <Input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => { onChange({ from: '', to: '' }); close(); }}>Clear</Button>
            <Button size="sm" onClick={() => { onChange(draft); close(); }}>Apply</Button>
          </div>
        </div>
      )}
    </Popover>
  );
}

export function FilterSelect({ value, onChange, allLabel, options = [], className }) {
  return (
    <div className={className}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} compact>
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function FilterBar({ search, onSearch, searchPlaceholder, children, onReset, className }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-3 px-5 py-4', className)}>
      {onSearch && <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} className="min-w-[220px] flex-1" />}
      {children}
      {onReset && (
        <Button variant="secondary" onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
}
