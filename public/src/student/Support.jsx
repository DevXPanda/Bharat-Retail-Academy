import { StudentTable as DataTable } from './components/StudentTable.jsx';
import { useState } from 'react';
import { CheckCircle2, Headset, Inbox, Loader, Plus } from 'lucide-react';
import {
  Button, Card, Modal, PageHeader, PriorityBadge, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, TicketComposer, TicketThread,
  TICKET_CATEGORY_LABELS, formatDate, useGet, useListState,
} from './ui.js';

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
      <PageHeader title="Support" subtitle="Pick your issue, we check your records and resolve it. Track every ticket's progress here." actions={<Button size="lg" icon={Plus} onClick={() => setCreating(true)}>New Ticket</Button>} />

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

      <TicketComposer open={creating} onClose={() => setCreating(false)} onCreated={setSelectedId} overlay={Modal} />
    </>
  );
}
