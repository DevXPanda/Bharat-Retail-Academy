import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plus, Radio, Users, PlayCircle } from 'lucide-react';
import {
  Button, Card, ClassCell, ClassForm, DataTable, DateRangeField, DateTimeCell, FilterBar, LiveChat, LiveClassroom, Modal, PageHeader, PersonCell, SeatsCell, StatCard, StatGrid, StatusBadge,
  TableCard, TableFooter, Tabs, formatDuration, formatTime, indexColumn, useGet, useListState, SearchInput, Badge,
} from '../components/ui.jsx';
import { ClassDetailsPanel } from './MyClasses.jsx';

function EnrolledPanel({ classId }) {
  const [search, setSearch] = useState('');
  const students = useGet(classId ? `/live-classes/${classId}/students` : '/live-classes/none/students', undefined, { enabled: Boolean(classId), refetchInterval: 15000 }).data || [];
  const rows = students.filter(({ student }) => student.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Card title={`Enrolled Students (${students.length})`}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search students..." className="mb-3" />
      <DataTable
        minWidth={420}
        rows={rows}
        rowKey={(r) => r.student.id}
        columns={[
          indexColumn(),
          { key: 'name', header: 'Student Name', render: (r) => <PersonCell name={r.student.name} src={r.student.avatar} size={28} /> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.joined ? 'joined' : r.attendance?.leaveTime ? 'completed' : 'waiting'} label={r.joined ? 'Joined' : r.attendance?.leaveTime ? 'Left' : 'Waiting'} /> },
          { key: 'join', header: 'Join Time', render: (r) => (r.attendance?.joinTime ? formatTime(r.attendance.joinTime) : '-') },
        ]}
      />
    </Card>
  );
}

export default function LiveClasses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useListState({ status: 'all', from: '', to: '' }, { limit: 6 });
  const [selectedId, setSelectedId] = useState(searchParams.get('class'));
  const [form, setForm] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const chat = useRef(null);

  const summary = useGet('/live-classes/summary').data;
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/live-classes', { ...list.params, sort: list.filters.status === 'upcoming' ? 'startsAt' : undefined }, { keepPrevious: true, refetchInterval: 30000 });
  const liveNow = useGet('/live-classes', { status: 'live', limit: 1 }).data?.[0];

  useEffect(() => {
    if (searchParams.get('class')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId && liveNow) setSelectedId(liveNow.id);
  }, [liveNow, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) || (liveNow?.id === selectedId ? liveNow : null) || null;
  const tabs = [{ key: 'all', label: 'All Classes' }, { key: 'upcoming', label: 'Upcoming' }, { key: 'live', label: 'Live Now' }, { key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }];

  const columns = [
    indexColumn(meta),
    { key: 'title', header: 'Class Title', render: (c) => <ClassCell cls={c} /> },
    { key: 'course', header: 'Course', render: (c) => <span className="line-clamp-2 min-w-[80px] text-xs text-slate-600">{c.course?.title}</span> },
    { key: 'startsAt', header: 'Date & Time', render: (c) => <DateTimeCell value={c.startsAt} /> },
    { key: 'students', header: 'Students', render: (c) => <SeatsCell value={c.enrolledCount} max={c.maxStudents} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (c) =>
        c.status === 'live' ? <Button size="sm" variant="danger" onClick={() => setSelectedId(c.id)}>Enter</Button>
        : c.status === 'upcoming' ? <Button size="sm" onClick={() => setSelectedId(c.id)}>Start</Button>
        : <Button size="sm" variant="soft" onClick={() => setSelectedId(c.id)}>View</Button>,
    },
  ];

  return (
    <>
      <PageHeader title="Live Classes" subtitle="Your classroom, students and live chat." actions={<Button size="lg" icon={Plus} onClick={() => setForm({})}>Schedule class</Button>} />
      <StatGrid cols={4}>
        <StatCard icon={Radio} tone="red" label="Live Now" value={summary?.live.value ?? '—'} />
        <StatCard icon={PlayCircle} tone="green" label="Upcoming Classes" value={summary?.upcoming.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="purple" label="Completed Classes" value={summary?.completed.value ?? '—'} />
        <StatCard icon={Users} tone="orange" label="Total Students Attended" value={summary?.attended.value ?? '—'} />
      </StatGrid>

      <div className="portal-workspace">
          <TableCard title="All Scheduled Classes" tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} className="mt-2" />}>
            <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by class title or course..." onReset={list.reset}>
              <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} className="w-48" />
            </FilterBar>
            <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} onRowClick={(c) => setSelectedId(c.id)} minWidth={820} />
            <TableFooter meta={meta} noun="classes" onPage={list.setPage} />
          </TableCard>
      </div>
        <div className="teacher-live-panels">
          <Card title="Classroom" action={selected && <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>Class details</Button>}><LiveClassroom key={selectedId} classId={selectedId} isStaff onChatFocus={() => chat.current?.focus()} onClosed={() => refetch()} /></Card>
          <Card title="Live Chat" bodyClassName="!pt-2"><LiveChat ref={chat} classId={selectedId} disabled={!selectedId} /></Card>
        </div>
      {selectedId && <div className="mt-6"><EnrolledPanel classId={selectedId} /></div>}

      <Modal open={detailsOpen && Boolean(selected)} onClose={() => setDetailsOpen(false)} title={selected?.title}>
        <ClassDetailsPanel cls={selected} showStudents={false} onEdit={(cls) => { setDetailsOpen(false); setForm(cls); }} />
      </Modal>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} size="lg" title={form?.id ? 'Edit class' : 'Schedule New Class'}>
        {form && <ClassForm key={form.id || 'new'} role="teacher" initial={form.id ? form : undefined} onSaved={() => setForm(null)} onCancel={() => setForm(null)} />}
      </Modal>
    </>
  );
}
