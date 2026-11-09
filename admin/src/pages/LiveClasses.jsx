import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, CalendarClock, CheckCircle2, Clock, Link2, Pencil, PlayCircle, Plus, Radio, Users, Video } from 'lucide-react';
import {
  Button, Card, ClassCell, ClassForm, ClassJoinLink, useCopyJoinLink, ConfirmDialog, CourseCell, DataTable, DateRangeField, DateTimeCell, FilterBar, FilterSelect, LiveClassroom, Modal, PageHeader,
  PersonCell, RowMenu, SeatsCell, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, ViewAll, formatDate, formatDuration, formatTime, indexColumn,
  startsInLabel, useAction, useClient, useGet, useListState, Badge, CourseMark, Drawer, PortalWorkspace,
} from '../components/ui.jsx';

function UpcomingCard({ cls, onOpen }) {
  const tone = cls.status === 'live' ? 'red' : cls.startsInMinutes <= 240 ? 'blue' : 'purple';
  return (
    <button type="button" onClick={() => onOpen(cls)} className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300">
      <div className="flex items-start gap-3">
        <CourseMark category={cls.course?.category} src={cls.course?.thumbnail} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-ink">{cls.course?.title}</p>
          <p className="truncate text-xs text-slate-500">{cls.topic || cls.title}</p>
        </div>
      </div>
      <div className="space-y-1 text-xs text-slate-600">
        <p className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" /> {formatDate(cls.startsAt)}</p>
        <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {formatTime(cls.startsAt)} - {formatTime(new Date(new Date(cls.startsAt).getTime() + cls.durationMin * 60000))}</p>
      </div>
      <div className="flex items-center justify-between">
        <PersonCell name={cls.teacher?.name} src={cls.teacher?.avatar} size={28} />
        <Badge tone={tone}>{cls.status === 'live' ? 'Live now' : startsInLabel(cls.startsInMinutes).replace('Starts in ', 'In ')}</Badge>
      </div>
    </button>
  );
}

export default function LiveClasses() {
  const client = useClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useListState({ status: 'all', course: 'all', teacher: 'all', from: '', to: '' }, { limit: 8 });
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(searchParams.get('class'));
  const [detail, setDetail] = useState(null);
  const copyJoinLink = useCopyJoinLink();
  const [cancelling, setCancelling] = useState(null);

  const summary = useGet('/live-classes/summary').data;
  const upcoming = useGet('/live-classes/upcoming', undefined, { refetchInterval: 30000 }).data || [];
  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/live-classes', { ...list.params, sort: list.filters.status === 'upcoming' ? 'startsAt' : undefined }, { keepPrevious: true, refetchInterval: 30000 });
  const liveNow = useGet('/live-classes', { status: 'live', limit: 1 }).data?.[0];

  useEffect(() => {
    if (!selectedId && liveNow) setSelectedId(liveNow.id);
  }, [liveNow, selectedId]);

  useEffect(() => {
    if (searchParams.get('class')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useAction((c) => client.patch(`/live-classes/${c.id}`, { status: 'cancelled' }), { success: 'Class cancelled', invalidate: ['/live-classes', '/dashboard'], onSuccess: () => setCancelling(null) });

  const tabs = [
    { key: 'all', label: 'All Classes' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'live', label: 'Live Now' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const open = (c) => {
    setSelectedId(c.id);
    requestAnimationFrame(() => document.getElementById('classroom')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const columns = [
    indexColumn(meta),
    { key: 'title', header: 'Class Title', render: (c) => <ClassCell cls={c} /> },
    { key: 'course', header: 'Course', render: (c) => <span className="line-clamp-2 min-w-[90px] text-xs text-slate-600">{c.course?.title}</span> },
    { key: 'teacher', header: 'Teacher', render: (c) => <PersonCell name={c.teacher?.name} src={c.teacher?.avatar} size={30} /> },
    { key: 'startsAt', header: 'Date & Time', render: (c) => <DateTimeCell value={c.startsAt} /> },
    { key: 'duration', header: 'Duration', render: (c) => formatDuration(c.durationMin) },
    { key: 'students', header: 'Students', render: (c) => <SeatsCell value={c.enrolledCount} max={c.maxStudents} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {c.status === 'live' && <Button size="sm" variant="danger" onClick={() => open(c)}>Enter</Button>}
          {c.status === 'upcoming' && <Button size="sm" onClick={() => open(c)}>Join</Button>}
          {['completed', 'cancelled'].includes(c.status) && <Button size="sm" variant="soft" onClick={() => setDetail(c)}>View</Button>}
          <RowMenu
            items={[
              ['upcoming', 'live'].includes(c.status) && c.status === 'upcoming' && { label: 'Edit class', icon: Pencil, onClick: () => { setEditing(c); setEditorOpen(true); } },
              { label: 'View details', icon: Video, onClick: () => setDetail(c) },
              ['upcoming', 'live'].includes(c.status) && { label: 'Copy student join link', icon: Link2, onClick: () => copyJoinLink(c) },
              c.status === 'upcoming' && { label: 'Cancel class', icon: Ban, danger: true, onClick: () => setCancelling(c) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Live Classes" subtitle="Class schedules and live sessions." breadcrumb={['Home', 'Live Classes']} actions={<Button size="lg" icon={Plus} onClick={() => { setEditing(null); setEditorOpen(true); }}>Schedule class</Button>} />

      <StatGrid cols={5}>
        <StatCard icon={Video} tone="purple" label="Total Live Classes" value={summary?.total.value ?? '—'} />
        <StatCard icon={PlayCircle} tone="green" label="Upcoming Classes" value={summary?.upcoming.value ?? '—'} />
        <StatCard icon={Radio} tone="red" label="Live Now" value={summary?.live.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="blue" label="Completed Classes" value={summary?.completed.value ?? '—'} />
        <StatCard icon={Users} tone="orange" label="Total Students Attended" value={summary?.attended.value ?? '—'} />
      </StatGrid>

      <PortalWorkspace insights={<Card title="Upcoming classes" action={<ViewAll onClick={() => list.setFilter('status', 'upcoming')} />}>
              {upcoming.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nothing scheduled. Use "Schedule New Class" to add one.</p> : (
                <div className="grid gap-4 md:grid-cols-3">{upcoming.map((c) => <UpcomingCard key={c.id} cls={c} onOpen={open} />)}</div>
              )}
      </Card>}>
          <TableCard title="All classes" tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
            <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by class title, teacher or course..." onReset={list.reset}>
              <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-40" />
              <FilterSelect value={list.filters.teacher} onChange={(v) => list.setFilter('teacher', v)} allLabel="All Teachers" options={teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-40" />
              <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} className="w-48" />
            </FilterBar>
            <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={1000} />
            <TableFooter meta={meta} noun="classes" onPage={list.setPage} />
          </TableCard>
      </PortalWorkspace>
      <Drawer open={editorOpen} title={editing ? 'Edit class' : 'Schedule class'} onClose={() => { setEditorOpen(false); setEditing(null); }}>
        <ClassForm key={editing?.id || 'new'} role="admin" initial={editing} onSaved={() => { setEditing(null); setEditorOpen(false); }} onCancel={() => { setEditing(null); setEditorOpen(false); }} />
      </Drawer>
          {selectedId && <Card className="mt-6" title={<span className="text-[15px] font-bold text-ink">Live Class Preview</span>}>
            <div id="classroom">
              <LiveClassroom key={selectedId} classId={selectedId} isStaff onClosed={() => setSelectedId(null)} />
            </div>
          </Card>}

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail?.course?.title} footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}>
        {detail && (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            {[
              ['Teacher', detail.teacher?.name],
              ['Batch', detail.batch?.name || 'All students'],
              ['Date', formatDate(detail.startsAt)],
              ['Time', `${formatTime(detail.startsAt)} · ${formatDuration(detail.durationMin)}`],
              ['Platform', detail.platform === 'jitsi' ? 'In-app Live Classroom' : detail.platform],
              ['Enrolled', `${detail.enrolledCount} / ${detail.maxStudents}`],
              ['Status', <StatusBadge key="s" status={detail.status} />],
              ['Teacher earning', detail.earning ? `₹${detail.earning}` : '—'],
            ].map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-500">{k}</p><div className="mt-0.5 font-semibold capitalize text-ink">{v}</div></div>)}
          </div>
        )}
        {detail && <div className="mt-4"><ClassJoinLink cls={detail} /></div>}
      </Modal>
      <ConfirmDialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} loading={cancel.loading} onConfirm={() => cancel.run(cancelling)} title="Cancel class" confirmLabel="Cancel class" message={`Cancel "${cancelling?.title}"? Enrolled students will be notified.`} />
    </>
  );
}
