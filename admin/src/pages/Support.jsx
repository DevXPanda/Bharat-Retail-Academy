import { useState } from 'react';
import { CheckCircle2, Headset, Inbox, Loader } from 'lucide-react';
import {
  Button, Drawer, DataTable, FilterBar, FilterSelect, PageHeader, PersonCell, PriorityBadge, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, TicketThread,
  TICKET_CATEGORY_LABELS, formatDate, indexColumn, useGet, useListState,
} from '../components/ui.jsx';

export default function Support() {
  const list = useListState({ status: 'all', category: 'all' }, { limit: 8 });
  const [selectedId, setSelectedId] = useState(null);

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
    indexColumn(meta),
    { key: 'student', header: 'Student', render: (t) => <PersonCell name={t.student?.name} src={t.student?.avatar} sub={`#${t.ticketNumber}`} size={34} /> },
    {
      key: 'subject',
      header: 'Subject',
      render: (t) => <div className="min-w-[150px]"><p className="line-clamp-2 text-[13px] font-semibold text-ink">{t.subject}</p><p className="text-xs text-slate-500">{TICKET_CATEGORY_LABELS[t.category] || t.category} · {formatDate(t.lastReplyAt)}</p></div>,
    },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge value={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'action', header: 'Action', render: (t) => <Button size="sm" variant={selectedId === t.id ? 'primary' : 'soft'} onClick={() => setSelectedId(t.id)}>{t.status === 'closed' ? 'View' : 'Reply'}</Button> },
  ];

  return (
    <>
      <PageHeader title="Support Tickets" subtitle="Answer student questions about payments, access, classes and certificates." />

      <StatGrid cols={4}>
        <StatCard icon={Headset} tone="blue" label="Total Tickets" value={summary?.total.value ?? '—'} trend={summary?.total.trend} />
        <StatCard icon={Inbox} tone="red" label="Open" value={summary?.open.value ?? '—'} sub="Waiting for a reply" />
        <StatCard icon={Loader} tone="orange" label="In Progress" value={summary?.inProgress.value ?? '—'} sub="Being handled" />
        <StatCard icon={CheckCircle2} tone="green" label="Resolved" value={summary?.resolved.value ?? '—'} sub="Resolved or closed" />
      </StatGrid>

      <div className="portal-workspace">
        <TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by subject or ticket number..." onReset={list.reset}>
            <FilterSelect value={list.filters.category} onChange={(v) => list.setFilter('category', v)} allLabel="All Categories" options={Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} className="w-44" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} onRowClick={(t) => setSelectedId(t.id)} minWidth={640} />
          <TableFooter meta={meta} noun="tickets" onPage={list.setPage} />
        </TableCard>

        <Drawer open={Boolean(selectedId)} title="Conversation" onClose={() => setSelectedId(null)}>
          <TicketThread key={selectedId} ticketId={selectedId} role="admin" />
        </Drawer>
      </div>
    </>
  );
}
