import { StudentTable as DataTable } from './components/StudentTable.jsx';
import { useState } from 'react';
import { CheckCircle2, Headset, Inbox, Loader, Plus } from 'lucide-react';
import {
  Button, Card, Field, Input, Modal, PageHeader, PriorityBadge, Select, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, Textarea, TicketThread,
  TICKET_CATEGORY_LABELS, formatDate, useAction, useClient, useGet, useListState,
} from './ui.js';

const BLANK = { subject: '', category: 'other', priority: 'medium', message: '' };

function NewTicketModal({ open, onClose, onCreated }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = useAction(() => client.post('/tickets', { ...form, subject: form.subject.trim(), message: form.message.trim() }), {
    success: 'Ticket raised. Our team will reply soon.',
    invalidate: ['/tickets'],
    onSuccess: ({ data }) => { setForm(BLANK); onCreated(data.id); onClose(); },
  });

  const submit = () => {
    const next = {};
    if (form.subject.trim().length < 5) next.subject = 'Enter a short subject (min 5 characters)';
    if (form.message.trim().length < 10) next.message = 'Describe the issue in a few words';
    setErrors(next);
    if (!Object.keys(next).length) create.run();
  };

  return (
    <Modal open={open} onClose={onClose} title="Raise a support ticket" subtitle="Tell us what went wrong and we will get back to you inside the platform." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.loading} onClick={submit}>Submit ticket</Button></>}>
      <div className="space-y-4">
        <Field label="Subject" required error={errors.subject}><Input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="e.g. Payment deducted but course not unlocked" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Select value={form.category} onChange={(e) => set('category', e.target.value)}>{Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => set('priority', e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
        </div>
        <Field label="Describe the issue" required error={errors.message}><Textarea rows={5} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Share order ID, class name or any detail that helps us resolve it faster." /></Field>
      </div>
    </Modal>
  );
}

export default function Support() {
  const list = useListState({ status: 'all' }, { limit: 8 });
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const summary = useGet('/tickets/summary', undefined, { refetchInterval: 30000 }).data;
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/tickets', list.params, { keepPrevious: true, refetchInterval: 30000 });

  const tabs = [
    { key: 'all', label: 'All Tickets', count: summary?.total.value },
    { key: 'open', label: 'Open', count: summary?.open.value },
    { key: 'in_progress', label: 'In Progress', count: summary?.inProgress.value },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  const columns = [
    { key: 'number', header: 'Ticket', render: (t) => <span className="font-semibold text-brand-600">#{t.ticketNumber}</span> },
    { key: 'subject', header: 'Subject', render: (t) => <p className="line-clamp-2 min-w-[160px] text-[13px] font-semibold text-ink">{t.subject}</p> },
    { key: 'category', header: 'Category', render: (t) => <span className="text-xs text-slate-600">{TICKET_CATEGORY_LABELS[t.category] || t.category}</span> },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge value={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'updated', header: 'Updated', render: (t) => formatDate(t.lastReplyAt) },
  ];

  return (
    <>
      <PageHeader title="Support" subtitle="Raise a ticket for payments, course access, live classes or certificates." actions={<Button size="lg" icon={Plus} onClick={() => setCreating(true)}>New Ticket</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={Headset} tone="blue" label="My Tickets" value={summary?.total.value ?? '—'} />
        <StatCard icon={Inbox} tone="red" label="Open" value={summary?.open.value ?? '—'} />
        <StatCard icon={Loader} tone="orange" label="In Progress" value={summary?.inProgress.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="green" label="Resolved" value={summary?.resolved.value ?? '—'} />
      </StatGrid>

      <div className="student-equal-panels mt-6 grid gap-6 xl:grid-cols-2">
        <TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} onRowClick={(t) => setSelectedId(t.id)} minWidth={640} empty={<p className="py-12 text-center text-sm text-slate-500">No tickets yet. Use "New Ticket" if you need help.</p>} />
          <TableFooter meta={meta} noun="tickets" onPage={list.setPage} />
        </TableCard>

        <Card title="Conversation" >
          <TicketThread key={selectedId} ticketId={selectedId} role="student" />
        </Card>
      </div>

      <NewTicketModal open={creating} onClose={() => setCreating(false)} onCreated={setSelectedId} />
    </>
  );
}
