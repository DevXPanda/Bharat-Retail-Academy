import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { StudentTable as DataTable } from './components/StudentTable.jsx';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock } from 'lucide-react';
import { useCheckout } from '../lib/checkout.js';
import { Badge, Button, Card, DateTimeCell, LiveChat, LiveClassroom, PageHeader, PersonCell, StatusBadge, TableCard, TableFooter, Tabs, formatDuration, indexColumn, startsInLabel, useGet, useListState } from './ui.js';

function EnrollNow({ course }) {
  const { buy, loading } = useCheckout();
  if (!course?.id) return null;
  return <Button size="lg" loading={loading} onClick={() => buy(course)}>Enroll now{course.price ? ` · ₹${Number(course.price).toLocaleString('en-IN')}` : ''}</Button>;
}

export default function LiveClasses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useListState({ status: 'upcoming' }, { limit: 6 });
  const [selectedId, setSelectedId] = useState(searchParams.get('class'));
  const chat = useRef(null);

  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/live-classes', { ...list.params, status: list.filters.status === 'upcoming' ? undefined : list.filters.status, sort: list.filters.status === 'upcoming' ? 'startsAt' : undefined, ...(list.filters.status === 'upcoming' ? {} : {}) }, { keepPrevious: true, refetchInterval: 20000 });
  const liveNow = useGet('/live-classes', { status: 'live', limit: 1 }, { refetchInterval: 20000 }).data?.[0];

  useEffect(() => {
    if (searchParams.get('class')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId && liveNow) setSelectedId(liveNow.id);
  }, [liveNow, selectedId]);

  const tabs = [{ key: 'upcoming', label: 'Upcoming & Live' }, { key: 'completed', label: 'Past Classes' }, { key: 'all', label: 'All' }];
  const visible = list.filters.status === 'upcoming' ? rows.filter((c) => ['upcoming', 'live'].includes(c.status)) : rows;

  const columns = [
    indexColumn(meta),
    { key: 'title', header: 'Class', render: (c) => <div className="student-course-cell"><PlatformLogo category={c.course?.category} size={36} /><div><p>{c.title}</p><span>{c.course?.title}</span></div></div> },
    { key: 'teacher', header: 'Teacher', render: (c) => <PersonCell name={c.teacher?.name} src={c.teacher?.avatar} size={30} /> },
    { key: 'startsAt', header: 'Date & Time', render: (c) => <DateTimeCell value={c.startsAt} /> },
    { key: 'duration', header: 'Duration', render: (c) => formatDuration(c.durationMin) },
    { key: 'status', header: 'Status', render: (c) => (c.status === 'upcoming' ? <Badge tone="blue">{startsInLabel(c.startsInMinutes)}</Badge> : <StatusBadge status={c.status} />) },
    { key: 'att', header: 'My Attendance', render: (c) => (c.myAttendance ? <StatusBadge status={c.myAttendance.status} /> : <span className="text-slate-400">—</span>) },
    { key: 'action', header: 'Action', render: (c) => (c.status === 'live' ? <Button size="sm" variant="danger" onClick={() => setSelectedId(c.id)}>Join</Button> : c.status === 'upcoming' ? <Button size="sm" variant="outline" onClick={() => setSelectedId(c.id)}>Details</Button> : <span className="text-xs text-slate-400">—</span>) },
  ];

  return (
    <>
      <PageHeader title="Live Classes" subtitle="Join your scheduled classes and revisit past sessions." />
      <div className="grid items-start gap-6">
        <TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <DataTable columns={columns} rows={visible} loading={isLoading} error={error} onRetry={refetch} onRowClick={(c) => setSelectedId(c.id)} minWidth={820} empty={<p className="py-12 text-center text-sm text-slate-500">No classes to show.</p>} />
          <TableFooter meta={meta} noun="classes" onPage={list.setPage} />
        </TableCard>
        <div className="student-live-grid grid gap-6 xl:grid-cols-2">
          <Card className="student-classroom-panel"><LiveClassroom key={selectedId} classId={selectedId} isStaff={false} onChatFocus={() => chat.current?.focus()} paywall={(p) => <EnrollNow {...p} />} /></Card>
          <Card title="Live Chat" className="student-chat-panel" bodyClassName="!pt-2"><LiveChat ref={chat} classId={selectedId} disabled={!selectedId} /></Card>
        </div>
      </div>
    </>
  );
}
