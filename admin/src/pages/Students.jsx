import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, BookOpen, CheckCircle2, Copy, Download, Eye, GraduationCap, Pencil, Plus, Trash2, UserCheck, UserPlus, UserX, Clock } from 'lucide-react';
import {
  Button, ConfirmDialog, DataTable, DateRangeField, Field, FilterBar, FilterSelect, IconButton, Input, Modal, PageHeader, PersonCell, RowMenu, Select, SidePanel,
  Drawer, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, formatDate, indexColumn, useAction, useClient, useGet, useListState, useToast,
} from '../components/ui.jsx';
import { StudentProfile } from '../components/StudentProfile.jsx';

const BLANK = { name: '', email: '', phone: '', courseId: '', accessStart: '', accessEnd: '', status: 'active' };

function StudentForm({ open, editing, onDone, courses }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [credentials, setCredentials] = useState(null);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(editing ? { ...BLANK, name: editing.name, email: editing.email, phone: editing.phone || '', status: editing.status } : BLANK);
    setErrors({});
  }, [editing]);

  const save = useAction(
    () => {
      if (editing) return client.patch(`/students/${editing.id}`, { name: form.name, email: form.email, phone: form.phone || undefined, status: form.status });
      return client.post('/students', { ...form, phone: form.phone || undefined });
    },
    {
      success: editing ? 'Student updated' : 'Student created',
      invalidate: ['/students', '/dashboard'],
      onSuccess: ({ data }) => {
        if (!editing) {
          setCredentials({ email: form.email, password: data.tempPassword });
          setForm(BLANK);
        }
        onDone?.();
      },
    },
  );

  const submit = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter the full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!editing && !form.courseId) next.courseId = 'Select a course';
    setErrors(next);
    if (!Object.keys(next).length) save.run();
  };

  return (
    <>
      <Drawer open={open} onClose={onDone} title={editing ? 'Edit student' : 'Add student'}>
      <SidePanel
        title={editing ? 'Edit Student' : 'Add New Student'}
        footer={
          <>
            {editing && <Button variant="secondary" onClick={onDone}>Cancel</Button>}
            <Button className={editing ? '' : 'w-full'} size="lg" loading={save.loading} onClick={submit}>{editing ? 'Update Student' : 'Create Student'}</Button>
          </>
        }
      >
        <Field label="Full Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter full name" />
        </Field>
        <Field label="Email Address" required error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Enter email address" />
        </Field>
        <Field label="Phone Number">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Enter phone number" />
        </Field>
        {!editing && (
          <>
            <Field label="Select Course" required error={errors.courseId}>
              <Select value={form.courseId} onChange={(e) => set('courseId', e.target.value)}>
                <option value="">Choose course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
            <Field label="Access Start Date">
              <Input type="date" value={form.accessStart} onChange={(e) => set('accessStart', e.target.value)} />
            </Field>
            <Field label="Access Expiry Date">
              <Input type="date" value={form.accessEnd} min={form.accessStart || undefined} onChange={(e) => set('accessEnd', e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </SidePanel>
      </Drawer>

      <Modal open={Boolean(credentials)} onClose={() => setCredentials(null)} size="sm" title="Student created" subtitle="Share these sign-in details with the student. The password is shown only once." footer={<Button onClick={() => setCredentials(null)}>Done</Button>}>
        {credentials && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <p><span className="text-slate-500">Email:</span> <strong>{credentials.email}</strong></p>
            <p className="flex items-center justify-between gap-3">
              <span><span className="text-slate-500">Temporary password:</span> <strong className="font-mono">{credentials.password}</strong></span>
              <IconButton icon={Copy} label="Copy password" onClick={() => { navigator.clipboard?.writeText(credentials.password); toast.success('Password copied'); }} />
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

function EnrollModal({ student, onClose, courses }) {
  const client = useClient();
  const [courseId, setCourseId] = useState('');
  const [accessEnd, setAccessEnd] = useState('');
  const add = useAction(() => client.post(`/students/${student.id}/enrollments`, { courseId, accessEnd: accessEnd || undefined }), {
    success: 'Course access granted',
    invalidate: ['/students', '/dashboard'],
    onSuccess: onClose,
  });
  const remove = useAction((enrollmentId) => client.delete(`/students/${student.id}/enrollments/${enrollmentId}`), { success: 'Access removed', invalidate: ['/students'], onSuccess: onClose });

  return (
    <Modal open={Boolean(student)} onClose={onClose} title="Manage course access" subtitle={student?.name} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {student && (
        <div className="space-y-5">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {student.enrollments.length === 0 && <li className="p-4 text-sm text-slate-500">No courses assigned yet.</li>}
            {student.enrollments.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{e.course?.title}</p>
                  <p className="text-xs text-slate-500">Progress {e.progress}% · Expires {formatDate(e.accessEnd)}</p>
                </div>
                <StatusBadge status={e.status} />
                <IconButton icon={Trash2} label="Remove access" onClick={() => remove.run(e.id)} />
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto]">
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Add a course...</option>
              {courses.filter((c) => !student.enrollments.some((e) => e.course?.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Input type="date" value={accessEnd} onChange={(e) => setAccessEnd(e.target.value)} title="Access expiry" />
            <Button icon={Plus} disabled={!courseId} loading={add.loading} onClick={() => add.run()}>Add</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Students() {
  const client = useClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useListState({ status: 'all', course: 'all', from: '', to: '' });
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useGet('/students/summary').data;
  const courses = useGet('/courses/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/students', { ...list.params, joinedFrom: list.filters.from, joinedTo: list.filters.to, from: undefined, to: undefined }, { keepPrevious: true });

  useEffect(() => {
    if (searchParams.get('new')) {
      setEditing(null);
      setEditorOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const setStatus = useAction((s, status) => client.patch(`/students/${s.id}`, { status }), { success: 'Status updated', invalidate: ['/students', '/dashboard'] });
  const remove = useAction((s) => client.delete(`/students/${s.id}`), { success: 'Student deleted', invalidate: ['/students', '/dashboard'], onSuccess: () => setDeleting(null) });
  const exportCsv = useAction(() => client.download('/students/export', 'students.csv', { status: list.filters.status === 'all' ? undefined : list.filters.status, search: list.params.search || undefined }), { success: 'Export started' });

  const tabs = [
    { key: 'all', label: 'All Students', count: summary?.total.value },
    { key: 'active', label: 'Active', count: summary?.active.value },
    { key: 'pending', label: 'Pending', count: summary?.pending.value },
    { key: 'inactive', label: 'Inactive', count: summary?.inactive.value },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'name', header: 'Name', render: (s) => <PersonCell name={s.name} src={s.avatar} size={36} /> },
    { key: 'email', header: 'Email', render: (s) => <span className="text-slate-600">{s.email}</span> },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
    {
      key: 'course',
      header: 'Course Assigned',
      render: (s) => (
        <span className="line-clamp-2 min-w-[110px]">
          {s.enrollments[0]?.course?.title || '—'}
          {s.enrollments.length > 1 && <span className="ml-1 text-xs font-semibold text-brand-600">+{s.enrollments.length - 1}</span>}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'joined', header: 'Joined Date', render: (s) => formatDate(s.createdAt) },
    {
      key: 'action',
      header: 'Action',
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <IconButton icon={Pencil} label="Edit" onClick={() => { setEditing(s); setEditorOpen(true); }} />
          <IconButton icon={Eye} label="View" onClick={() => setViewing(s)} />
          <RowMenu
            items={[
              { label: 'Manage courses', icon: BookOpen, onClick: () => setEnrolling(s) },
              s.status !== 'active' && { label: 'Activate', icon: UserCheck, onClick: () => setStatus.run(s, 'active') },
              s.status !== 'inactive' && { label: 'Deactivate', icon: Ban, onClick: () => setStatus.run(s, 'inactive') },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(s) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Students" subtitle="Student details and course access." breadcrumb={['Dashboard', 'Students']} actions={<><Button size="lg" variant="outline" icon={Download} loading={exportCsv.loading} onClick={() => exportCsv.run()}>Export</Button><Button size="lg" icon={Plus} onClick={() => { setEditing(null); setEditorOpen(true); }}>Add student</Button></>} />

      <StatGrid cols={4}>
        <StatCard icon={GraduationCap} tone="blue" label="Total Students" value={summary?.total.value ?? '—'} trend={summary?.total.trend} trendSuffix="from last month" />
        <StatCard icon={UserCheck} tone="green" label="Active Students" value={summary?.active.value ?? '—'} trend={summary?.active.trend} trendSuffix="from last month" />
        <StatCard icon={Clock} tone="orange" label="Pending Access" value={summary?.pending.value ?? '—'} trend={summary?.pending.trend} trendSuffix="from last month" />
        <StatCard icon={UserX} tone="purple" label="Inactive Students" value={summary?.inactive.value ?? '—'} trend={summary?.inactive.trend} trendSuffix="from last month" />
      </StatGrid>

      <div className="portal-workspace"><TableCard
          tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}
        >
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by name, email, phone..." onReset={list.reset}>
            <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-44" />
            <FilterSelect value={list.filters.status} onChange={(v) => list.setFilter('status', v)} allLabel="All Status" options={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'inactive', label: 'Inactive' }]} className="w-36" />
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="Joined Date" className="w-44" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={900} />
          <TableFooter meta={meta} noun="students" onPage={list.setPage} />
        </TableCard></div>
<StudentForm open={editorOpen} editing={editing} courses={courses} onDone={() => { setEditorOpen(false); setEditing(null); }} />

      <StudentProfile student={viewing} onClose={() => setViewing(null)} onEdit={(st) => { setViewing(null); setEditing(st); setEditorOpen(true); }} onManageCourses={(st) => { setViewing(null); setEnrolling(st); }} />

      <EnrollModal student={enrolling} courses={courses} onClose={() => setEnrolling(null)} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete student" confirmLabel="Delete" message={`This permanently removes ${deleting?.name} and their course access. Payment records are kept. This cannot be undone.`} />
    </>
  );
}
