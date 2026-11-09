import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CheckCircle2, Copy, Link2, Pencil, Plus, Radio, Users, Video, PlayCircle, CalendarDays, Clock, UserSquare2, Info } from 'lucide-react';
import {
  Badge, Button, Card, ClassCell, ClassForm, ClassJoinLink, ConfirmDialog, CourseMark, DataTable, DateRangeField, DateTimeCell, FilterBar, FilterSelect, Modal, PageHeader, PersonCell, ProgressBar,
  RowMenu, SeatsCell, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, formatDate, formatDateLong, formatDuration, formatTime, indexColumn, useAction, useClient, useGet, useListState, useToast,
} from '../components/ui.jsx';

export function ClassDetailsPanel({ cls, onEdit, showStudents = true }) {
  const toast = useToast();
  const students = useGet(cls ? `/live-classes/${cls.id}/students` : '/live-classes/none/students', undefined, { enabled: Boolean(cls) && showStudents }).data || [];
  const navigate = useNavigate();
  if (!cls) return <Card title="Class Details"><p className="py-8 text-center text-sm text-slate-500">Select a class to see its details.</p></Card>;
  const end = new Date(new Date(cls.startsAt).getTime() + cls.durationMin * 60000);

  return (
    <>
      <Card title="Class Details" action={cls.status === 'upcoming' ? <Button size="sm" variant="outline" icon={Pencil} onClick={() => onEdit?.(cls)}>Edit Class</Button> : null}>
        <div className="flex items-start gap-3">
          <CourseMark category={cls.course?.category} src={cls.course?.thumbnail} size={50} />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-ink">{cls.title}</p><p className="text-xs text-slate-500">{cls.course?.title}</p></div>
          <StatusBadge status={cls.status} />
        </div>
        <ul className="mt-4 space-y-3 text-[13px] text-slate-700">
          <li className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDateLong(cls.startsAt)}</li>
          <li className="flex items-center gap-3"><Clock className="h-4 w-4 text-slate-400" />{formatTime(cls.startsAt)} - {formatTime(end)} ({formatDuration(cls.durationMin)})</li>
          <li className="flex items-center gap-3"><UserSquare2 className="h-4 w-4 text-slate-400" />{cls.teacher?.name} (You)</li>
          <li className="flex items-center gap-3"><Users className="h-4 w-4 text-slate-400" />{cls.enrolledCount} / {cls.maxStudents} Students Enrolled</li>
          <li className="flex items-center gap-3"><Video className="h-4 w-4 text-slate-400" />{cls.platform === 'jitsi' ? 'In-app Live Classroom' : cls.platform === 'zoom' ? 'Zoom Meeting' : 'Google Meet'}</li>
          {cls.platform !== 'jitsi' && cls.meetingLink && (
            <li className="flex items-center gap-3">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-brand-600">{cls.meetingLink}</span>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(cls.meetingLink); toast.success('Meeting link copied'); }}>Copy</Button>
            </li>
          )}
        </ul>
        {!['completed', 'cancelled'].includes(cls.status) && <div className="mt-4"><ClassJoinLink cls={cls} /></div>}
        <p className="mt-4 flex gap-2.5 rounded-xl bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-700"><Info className="mt-0.5 h-4 w-4 shrink-0" />{cls.platform === 'jitsi' ? 'Students can join from their dashboard as soon as you start the class.' : 'Meeting link will be visible to enrolled students 15 minutes before the class start time.'}</p>
      </Card>

      {showStudents && (
        <Card title={`Enrolled Students (${students.length})`} className="mt-6" action={<Button size="sm" variant="ghost" onClick={() => navigate('/students')}>View All</Button>}>
          <ul className="divide-y divide-slate-100">
            {students.slice(0, 5).map(({ student, attendance }) => (
              <li key={student.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <PersonCell name={student.name} src={student.avatar} size={32} />
                <StatusBadge status={attendance?.joinTime ? 'joined' : 'enrolled'} className="ml-auto" />
              </li>
            ))}
            {students.length === 0 && <li className="py-4 text-sm text-slate-500">No students enrolled yet.</li>}
          </ul>
          <Button variant="soft" icon={Users} className="mt-4 w-full" onClick={() => navigate('/students')}>View All Students</Button>
        </Card>
      )}
    </>
  );
}

export default function MyClasses() {
  const client = useClient();
  const navigate = useNavigate();
  const list = useListState({ status: 'all', course: 'all', from: '', to: '' }, { limit: 8 });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const summary = useGet('/live-classes/summary').data;
  const courses = useGet('/courses/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/live-classes', list.params, { keepPrevious: true });
  const active = selected ? rows.find((r) => r.id === selected) || null : null;

  const cancel = useAction((c) => client.patch(`/live-classes/${c.id}`, { status: 'cancelled' }), { success: 'Class cancelled', invalidate: ['/live-classes'], onSuccess: () => setCancelling(null) });

  const tabs = [{ key: 'all', label: 'All Classes' }, { key: 'upcoming', label: 'Upcoming' }, { key: 'live', label: 'Live Now' }, { key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }];

  const columns = [
    indexColumn(meta),
    { key: 'title', header: 'Class Details', render: (c) => <ClassCell cls={c} /> },
    { key: 'course', header: 'Course', render: (c) => <span className="line-clamp-2 min-w-[90px] text-xs text-slate-600">{c.course?.title}</span> },
    { key: 'startsAt', header: 'Date & Time', render: (c) => <DateTimeCell value={c.startsAt} /> },
    { key: 'duration', header: 'Duration', render: (c) => formatDuration(c.durationMin) },
    { key: 'students', header: 'Students', render: (c) => <SeatsCell value={c.enrolledCount} max={c.maxStudents} withBar /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (c) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {c.status === 'live' && <Button size="sm" variant="danger" onClick={() => navigate(`/live-classes?class=${c.id}`)}>Enter</Button>}
          {c.status === 'upcoming' && <Button size="sm" onClick={() => navigate(`/live-classes?class=${c.id}`)}>Start</Button>}
          {['completed', 'cancelled'].includes(c.status) && <Button size="sm" variant="soft" onClick={() => setSelected(c.id)}>View</Button>}
          <RowMenu items={[c.status === 'upcoming' && { label: 'Edit class', icon: Pencil, onClick: () => setForm(c) }, c.status === 'upcoming' && { label: 'Cancel class', icon: Ban, danger: true, onClick: () => setCancelling(c) }, { label: 'View details', icon: Info, onClick: () => setSelected(c.id) }]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="My Classes" subtitle="Upcoming, live and completed classes." actions={<Button size="lg" icon={Plus} onClick={() => setForm({})}>Schedule class</Button>} />
      <StatGrid cols={4}>
        <StatCard icon={Video} tone="blue" label="Total Classes" value={summary?.total.value ?? '—'} />
        <StatCard icon={PlayCircle} tone="green" label="Upcoming Classes" value={summary?.upcoming.value ?? '—'} />
        <StatCard icon={Radio} tone="red" label="Live Now" value={summary?.live.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="purple" label="Completed Classes" value={summary?.completed.value ?? '—'} />
      </StatGrid>

      <div className="portal-workspace">
        <TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by class title or course..." onReset={list.reset}>
            <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-40" />
            <FilterSelect value={list.filters.status} onChange={(v) => list.setFilter('status', v)} allLabel="All Status" options={['upcoming', 'live', 'completed', 'cancelled'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} className="w-36" />
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} className="w-48" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(c) => setSelected(c.id)} loading={isLoading} error={error} onRetry={refetch} minWidth={900} />
          <TableFooter meta={meta} noun="classes" onPage={list.setPage} />
        </TableCard>
      </div>
      <Modal open={Boolean(active)} onClose={() => setSelected(null)} title={active?.title}>
        <ClassDetailsPanel cls={active} onEdit={(cls) => { setSelected(null); setForm(cls); }} />
      </Modal>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} size="lg" title={form?.id ? 'Edit class' : 'Schedule New Class'}>
        {form && <ClassForm key={form.id || 'new'} role="teacher" initial={form.id ? form : undefined} onSaved={() => setForm(null)} onCancel={() => setForm(null)} />}
      </Modal>
      <ConfirmDialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} loading={cancel.loading} onConfirm={() => cancel.run(cancelling)} title="Cancel class" confirmLabel="Cancel class" message={`Cancel "${cancelling?.title}"? Enrolled students will be notified.`} />
    </>
  );
}
