import { PortalWorkspace } from '@ecomedu/ui';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CalendarClock, CheckCircle2, Layers, PlayCircle, Plus, Trash2, UserPlus, UserRoundCog, Users, Pencil, Clock3 } from 'lucide-react';
import {
  Button, BulkActions, Card, Checkbox, ConfirmDialog, CourseMark, DataTable, DateRangeField, DonutWithLegend, Field, FilterBar, FilterSelect, Input, Modal, PageHeader, PersonCell,
  RowMenu, Select, SearchInput, SeatsCell, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, ViewAll, Badge, formatDate, indexColumn, toInputDate, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';

const TIMINGS = ['Morning Batch', 'Afternoon Batch', 'Evening Batch', 'Weekend Batch'];
const BLANK = { name: '', timing: 'Morning Batch', course: '', teacher: '', capacity: 50, startDate: '', endDate: '', status: 'upcoming' };

function BatchModal({ open, batch, onClose }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const [lastId, setLastId] = useState(null);
  if (open && (batch?.id || 'new') !== lastId) {
    setLastId(batch?.id || 'new');
    setErrors({});
    setForm(batch ? { name: batch.name, timing: batch.timing || 'Morning Batch', course: batch.course?.id, teacher: batch.teacher?.id, capacity: batch.capacity, startDate: toInputDate(batch.startDate), endDate: toInputDate(batch.endDate), status: batch.status === 'draft' ? 'draft' : 'upcoming' } : BLANK);
  }
  if (!open && lastId) setLastId(null);

  const save = useAction(
    () => {
      const body = { ...form, capacity: Number(form.capacity) };
      return batch ? client.patch(`/batches/${batch.id}`, body) : client.post('/batches', body);
    },
    { success: batch ? 'Batch updated' : 'Batch created', invalidate: ['/batches', '/dashboard'], onSuccess: onClose },
  );

  const submit = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter a batch name';
    if (!form.course) next.course = 'Select a course';
    if (!form.teacher) next.teacher = 'Select a teacher';
    if (!form.startDate) next.startDate = 'Pick a start date';
    if (!form.endDate) next.endDate = 'Pick an end date';
    else if (form.startDate && form.endDate <= form.startDate) next.endDate = 'End date must be after the start date';
    setErrors(next);
    if (!Object.keys(next).length) save.run();
  };

  return (
    <Modal open={open} onClose={onClose} title={batch ? 'Edit batch' : 'Create new batch'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.loading} onClick={submit}>{batch ? 'Save changes' : 'Create batch'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch name" required error={errors.name} className="sm:col-span-2"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Amazon Batch 03" /></Field>
        <Field label="Course" required error={errors.course}>
          <Select value={form.course} onChange={(e) => set('course', e.target.value)}><option value="">Select course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>
        </Field>
        <Field label="Teacher" required error={errors.teacher}>
          <Select value={form.teacher} onChange={(e) => set('teacher', e.target.value)}><option value="">Select teacher</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        </Field>
        <Field label="Timing"><Select value={form.timing} onChange={(e) => set('timing', e.target.value)}>{TIMINGS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Capacity"><Input type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
        <Field label="Start date" required error={errors.startDate}><Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="End date" required error={errors.endDate}><Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} /></Field>
        <Field label="Publish state" className="sm:col-span-2">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="upcoming">Published (status follows dates)</option><option value="draft">Draft</option></Select>
        </Field>
      </div>
    </Modal>
  );
}

function AssignStudentsModal({ open, onClose, preselect }) {
  const client = useClient();
  const [batchId, setBatchId] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState([]);
  const batches = useGet('/batches/options').data || [];
  const batch = batches.find((b) => b.id === (batchId || preselect?.id));
  const activeBatch = batchId || preselect?.id || '';
  const students = useGet('/students', { search, limit: 30, status: 'active' }, { enabled: open }).data || [];

  const assign = useAction(() => client.post(`/batches/${activeBatch}/students`, { studentIds: picked }), {
    invalidate: ['/batches', '/students'],
    success: (r) => `${r.data.added} student(s) added${r.data.failed.length ? `, ${r.data.failed.length} skipped` : ''}`,
    onSuccess: () => { setPicked([]); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Assign students to batch" subtitle="Students are enrolled in the batch's course automatically." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={UserPlus} disabled={!activeBatch || !picked.length} loading={assign.loading} onClick={() => assign.run()}>Assign {picked.length || ''}</Button></>}>
      <div className="space-y-4">
        <Field label="Batch">
          <Select value={activeBatch} onChange={(e) => setBatchId(e.target.value)}><option value="">Select batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
        </Field>
        <SearchInput value={search} onChange={setSearch} placeholder="Search students..." />
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {students.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50">
                <Checkbox checked={picked.includes(s.id)} onChange={(c) => setPicked(c ? [...picked, s.id] : picked.filter((id) => id !== s.id))} />
                <PersonCell name={s.name} sub={s.email} size={32} />
              </label>
            </li>
          ))}
        </ul>
        {batch && <p className="text-xs text-slate-500">Adding to <strong>{batch.name}</strong></p>}
      </div>
    </Modal>
  );
}

function AssignTeacherModal({ open, onClose }) {
  const client = useClient();
  const [batchId, setBatchId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const batches = useGet('/batches/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const save = useAction(() => client.patch(`/batches/${batchId}`, { teacher: teacherId }), { success: 'Teacher assigned', invalidate: ['/batches', '/live-classes'], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Assign teacher" subtitle="Upcoming classes of the batch move to the new teacher." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!batchId || !teacherId} loading={save.loading} onClick={() => save.run()}>Assign</Button></>}>
      <div className="space-y-4">
        <Field label="Batch"><Select value={batchId} onChange={(e) => setBatchId(e.target.value)}><option value="">Select batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Teacher"><Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">Select teacher</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}

const QUICK = [
  { key: 'create', label: 'Create Batch', icon: Plus, tone: 'text-brand-600 bg-brand-50' },
  { key: 'students', label: 'Assign Students', icon: UserPlus, tone: 'text-emerald-600 bg-emerald-50' },
  { key: 'teacher', label: 'Assign Teacher', icon: UserRoundCog, tone: 'text-violet-600 bg-violet-50' },
  { key: 'schedule', label: 'Manage Schedule', icon: CalendarClock, tone: 'text-amber-600 bg-amber-50' },
];

export default function Batches() {
  const client = useClient();
  const navigate = useNavigate();
  const list = useListState({ status: 'all', course: 'all', teacher: 'all', from: '', to: '' });
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useGet('/batches/summary').data;
  const upcoming = useGet('/batches/upcoming').data || [];
  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/batches', list.params, { keepPrevious: true });

  const remove = useAction((b) => client.delete(`/batches/${b.id}`), { success: 'Batch deleted', invalidate: ['/batches', '/dashboard'], onSuccess: () => setDeleting(null), onError: () => setDeleting(null) });
  const bulk = useAction((action) => client.post('/batches/bulk', { ids: selected, action }), {
    invalidate: ['/batches', '/dashboard'],
    success: (r) => `${r.data.affected} batch(es) updated${r.data.skipped ? `, ${r.data.skipped} skipped (have students)` : ''}`,
    onSuccess: () => setSelected([]),
  });

  const quick = (key) => (key === 'create' ? setModal({ type: 'batch' }) : key === 'students' ? setModal({ type: 'students' }) : key === 'teacher' ? setModal({ type: 'teacher' }) : navigate('/live-classes'));

  const tabs = [
    { key: 'all', label: 'All Batches', count: summary?.total.value },
    { key: 'active', label: 'Active', count: summary?.active.value },
    { key: 'upcoming', label: 'Upcoming', count: summary?.upcoming.value },
    { key: 'completed', label: 'Completed', count: summary?.completed.value },
    { key: 'draft', label: 'Draft', count: summary?.draft.value },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'name', header: 'Batch Name', render: (b) => <div><p className="text-[13px] font-bold text-ink">{b.name}</p><p className="text-xs text-slate-500">{b.timing}</p></div> },
    { key: 'course', header: 'Course', render: (b) => <div className="flex items-center gap-2.5"><CourseMark category={b.course?.category} src={b.course?.thumbnail} size={34} /><span className="line-clamp-2 min-w-[90px] text-[13px] text-slate-700">{b.course?.title}</span></div> },
    { key: 'teacher', header: 'Teacher', render: (b) => <PersonCell name={b.teacher?.name} src={b.teacher?.avatar} size={30} /> },
    { key: 'students', header: 'Students', render: (b) => <SeatsCell value={b.studentsCount} max={b.capacity} /> },
    { key: 'start', header: 'Start Date', render: (b) => formatDate(b.startDate) },
    { key: 'end', header: 'End Date', render: (b) => formatDate(b.endDate) },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} tone={b.status === 'completed' ? 'purple' : undefined} /> },
    {
      key: 'action',
      header: 'Actions',
      render: (b) => (
        <RowMenu
          items={[
            { label: 'Edit batch', icon: Pencil, onClick: () => setModal({ type: 'batch', batch: b }) },
            { label: 'Assign students', icon: UserPlus, onClick: () => setModal({ type: 'students', batch: b }) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(b) },
          ]}
        />
      ),
    },
  ];

  const donut = [
    { name: 'Active', value: summary?.active.value || 0, color: '#2d725e' },
    { name: 'Upcoming', value: summary?.upcoming.value || 0, color: '#2563eb' },
    { name: 'Completed', value: summary?.completed.value || 0, color: '#44597a' },
    { name: 'Draft', value: summary?.draft.value || 0, color: '#f59e0b' },
  ];

  return (
    <>
      <PageHeader title="Batches" subtitle="Batches, teachers and class schedules." actions={<Button size="lg" icon={Plus} onClick={() => setModal({ type: 'batch' })}>Create New Batch</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={Users} tone="blue" label="Total Batches" value={summary?.total.value ?? '—'} sub="All batches created" />
        <StatCard icon={PlayCircle} tone="green" label="Active Batches" value={summary?.active.value ?? '—'} sub="Currently running" />
        <StatCard icon={Clock3} tone="orange" label="Upcoming Batches" value={summary?.upcoming.value ?? '—'} sub="Scheduled to start" />
        <StatCard icon={CheckCircle2} tone="purple" label="Completed Batches" value={summary?.completed.value ?? '—'} sub="Finished successfully" />
      </StatGrid>

      <PortalWorkspace insights={<>
          <Card title="Batch Overview">
            <DonutWithLegend data={donut} centerValue={summary?.total.value ?? 0} centerLabel="Total" size={132} />
          </Card>
          <Card title="Upcoming Batches" action={<ViewAll onClick={() => list.setFilter('status', 'upcoming')} />}>
            <ul className="space-y-4">
              {upcoming.length === 0 && <li className="text-sm text-slate-500">No upcoming batches.</li>}
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <CourseMark category={b.course?.category} src={b.course?.thumbnail} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{b.name}</p>
                    <p className="text-xs text-slate-500">Starts on {formatDate(b.startDate)}</p>
                  </div>
                  <Badge tone="blue" className="flex-col !gap-0 !px-3 !py-1.5 text-center leading-tight"><span className="text-sm font-extrabold">{b.studentsCount}</span><span className="text-[10px] font-medium">Students</span></Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              {QUICK.map((q) => (
                <button key={q.key} type="button" onClick={() => quick(q.key)} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-300">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${q.tone}`}><q.icon className="h-5 w-5" /></span>
                  {q.label}
                </button>
              ))}
            </div>
          </Card>
        </>}><TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search batches by name..." onReset={list.reset}>
            <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-40" />
            <FilterSelect value={list.filters.teacher} onChange={(v) => list.setFilter('teacher', v)} allLabel="All Teachers" options={teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-40" />
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} className="w-48" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} selectable selected={selected} onSelectedChange={setSelected} loading={isLoading} error={error} onRetry={refetch} minWidth={980} />
          <TableFooter meta={meta} noun="batches" onPage={list.setPage} left={<BulkActions selected={selected} loading={bulk.loading} onApply={(a) => bulk.run(a)} actions={[{ value: 'publish', label: 'Publish' }, { value: 'draft', label: 'Move to draft' }, { value: 'delete', label: 'Delete' }]} />} />
        </TableCard></PortalWorkspace>

      <BatchModal open={modal?.type === 'batch'} batch={modal?.batch} onClose={() => setModal(null)} />
      <AssignStudentsModal open={modal?.type === 'students'} preselect={modal?.batch} onClose={() => setModal(null)} />
      <AssignTeacherModal open={modal?.type === 'teacher'} onClose={() => setModal(null)} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete batch" confirmLabel="Delete" message={`Delete ${deleting?.name}? Batches that still have students cannot be deleted.`} />
    </>
  );
}
