import { useState } from 'react';
import { CheckCircle2, Download, Eye, Inbox, PhoneCall, Trash2, UserPlus, XCircle } from 'lucide-react';
import {
  Badge, BulkActions, Button, ConfirmDialog, DataTable, DateRangeField, Field, FilterBar, FilterSelect, Modal, PageHeader, RowMenu, Select, StatCard, StatGrid, StatusBadge, TableCard,
  TableFooter, Tabs, Textarea, formatDate, formatDateTime, indexColumn, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';

const SOURCES = [{ value: 'hero', label: 'Home page form' }, { value: 'contact', label: 'Contact form' }, { value: 'newsletter', label: 'Newsletter' }];
const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.value, s.label]));
const SOURCE_TONE = { hero: 'blue', contact: 'purple', newsletter: 'green' };
const STATUS_OPTIONS = [['new', 'New'], ['contacted', 'Contacted'], ['converted', 'Converted'], ['closed', 'Closed']];

const STATUS_STYLE = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700', converted: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-600' };

function LeadModal({ lead, onClose }) {
  const client = useClient();
  const [note, setNote] = useState(lead?.note || '');
  const save = useAction(() => client.patch(`/leads/${lead.id}`, { note }), { success: 'Note saved', invalidate: ['/leads'], onSuccess: onClose });
  return (
    <Modal open={Boolean(lead)} onClose={onClose} title={lead?.name} subtitle={lead && `${SOURCE_LABEL[lead.source]} · ${formatDateTime(lead.createdAt)}`} footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button loading={save.loading} onClick={() => save.run()}>Save note</Button></>}>
      {lead && (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {[['Email', lead.email], ['Phone', lead.phone || '—'], ['Goal', lead.goal || '—'], ['Status', STATUS_OPTIONS.find(([v]) => v === lead.status)?.[1]]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-500">{k}</p><p className="mt-0.5 break-all font-semibold text-ink">{v}</p></div>
            ))}
          </div>
          {lead.message && <div className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-500">Message</p><p className="mt-1 whitespace-pre-wrap text-ink">{lead.message}</p></div>}
          <Field label="Internal note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called on Monday, interested in Amazon course" /></Field>
        </div>
      )}
    </Modal>
  );
}

export default function Leads() {
  const client = useClient();
  const list = useListState({ status: 'all', source: 'all', from: '', to: '' });
  const [selected, setSelected] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useGet('/leads/summary').data;
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/leads', list.params, { keepPrevious: true });

  const setStatus = useAction((lead, status) => client.patch(`/leads/${lead.id}`, { status }), { success: 'Lead updated', invalidate: ['/leads'] });
  const remove = useAction((lead) => client.delete(`/leads/${lead.id}`), { success: 'Lead deleted', invalidate: ['/leads'], onSuccess: () => setDeleting(null) });
  const bulk = useAction((action) => client.post('/leads/bulk', { ids: selected, action }), { success: (r) => `${r.data.affected} lead(s) updated`, invalidate: ['/leads'], onSuccess: () => setSelected([]) });
  const exportCsv = useAction(() => client.download('/leads/export', 'leads.xlsx', { status: list.filters.status === 'all' ? undefined : list.filters.status, source: list.filters.source === 'all' ? undefined : list.filters.source, search: list.filters.search || undefined, from: list.filters.from || undefined, to: list.filters.to || undefined }));

  const tabs = [
    { key: 'all', label: 'All Leads', count: summary?.total.value },
    { key: 'new', label: 'New', count: summary?.new.value },
    { key: 'contacted', label: 'Contacted', count: summary?.contacted.value },
    { key: 'converted', label: 'Converted', count: summary?.converted.value },
    { key: 'closed', label: 'Closed', count: summary?.closed.value },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'name', header: 'Name', render: (l) => <div className="min-w-[150px]"><p className="text-[13px] font-semibold text-ink">{l.name}</p><p className="text-xs text-slate-500">{l.email}</p></div> },
    { key: 'phone', header: 'Phone', render: (l) => l.phone || <span className="text-slate-400">—</span> },
    { key: 'source', header: 'Source', render: (l) => <Badge tone={SOURCE_TONE[l.source]}>{SOURCE_LABEL[l.source]}</Badge> },
    { key: 'goal', header: 'Goal / Message', render: (l) => <p className="line-clamp-2 min-w-[160px] max-w-[260px] text-xs text-slate-600">{l.goal || l.message || '—'}</p> },
    { key: 'date', header: 'Received', render: (l) => <span className="whitespace-nowrap">{formatDate(l.createdAt)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <select value={l.status} onChange={(e) => setStatus.run(l, e.target.value)} className={`rounded-md border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[l.status]}`}>
          {STATUS_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <RowMenu items={[{ label: 'View details', icon: Eye, onClick: () => setViewing(l) }, { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(l) }]} />
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Leads & Enquiries" subtitle="Enquiries and website subscriptions." actions={<Button size="lg" variant="outline" icon={Download} loading={exportCsv.loading} onClick={() => exportCsv.run()}>Export</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={Inbox} tone="blue" label="Total Leads" value={summary?.total.value ?? '—'} trend={summary?.total.trend} />
        <StatCard icon={UserPlus} tone="orange" label="New" value={summary?.new.value ?? '—'} sub="Not contacted yet" />
        <StatCard icon={PhoneCall} tone="purple" label="Contacted" value={summary?.contacted.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="green" label="Converted" value={summary?.converted.value ?? '—'} sub="Became students" />
      </StatGrid>

      <TableCard className="mt-6" tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
        <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by name, email, phone or message..." onReset={list.reset}>
          <FilterSelect value={list.filters.source} onChange={(v) => list.setFilter('source', v)} allLabel="All Sources" options={SOURCES} className="w-44" />
          <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="Date Range" className="w-48" />
        </FilterBar>
        <DataTable columns={columns} rows={rows} selectable selected={selected} onSelectedChange={setSelected} loading={isLoading} error={error} onRetry={refetch} onRowClick={setViewing} minWidth={960} />
        <TableFooter meta={meta} noun="leads" onPage={list.setPage} left={<BulkActions selected={selected} loading={bulk.loading} onApply={(a) => bulk.run(a)} actions={[{ value: 'contacted', label: 'Mark contacted' }, { value: 'converted', label: 'Mark converted' }, { value: 'closed', label: 'Mark closed' }, { value: 'delete', label: 'Delete' }]} />} />
      </TableCard>

      <LeadModal key={viewing?.id} lead={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete lead" confirmLabel="Delete" message={`Delete the enquiry from ${deleting?.name}?`} />
    </>
  );
}
