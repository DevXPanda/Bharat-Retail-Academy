import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { useClient } from '../../context/AppProviders.jsx';
import { useAction, useDebounce, useGet } from '../../hooks/index.js';
import { formatDate, formatDuration, formatTime } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input, SearchInput, Select } from '../ui/Form.jsx';
import { PersonCell } from '../ui/Display.jsx';
import { BulkActions, TableFooter, indexColumn } from '../data/DataTable.jsx';
import { DateRangeField } from '../data/Filters.jsx';
import { PortalDataTable as DataTable, PortalPageHeader as PageHeader, PortalTableCard as TableCard, PortalStatCard as StatCard, PortalStatGrid as StatGrid } from '../data/PortalUI.jsx';

const OPTIONS = [['present', 'Present'], ['late', 'Late'], ['absent', 'Absent'], ['not_marked', 'Not Marked']];

export function AttendanceManager({ isAdmin = false }) {
  const client = useClient();
  const [filters, setFilters] = useState({ course: '', teacher: '', batch: '', date: '', liveClass: '' });
  const [range, setRange] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [edits, setEdits] = useState({});
  const debounced = useDebounce(search);

  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100 }, { enabled: isAdmin }).data || [];
  const batches = useGet('/batches/options', { course: filters.course }, { enabled: Boolean(filters.course) }).data || [];
  const classes = useGet('/live-classes', { course: filters.course || undefined, teacher: filters.teacher || undefined, batch: filters.batch || undefined, from: filters.date || range.from || undefined, to: filters.date || range.to || undefined, limit: 50, status: 'completed' }, { enabled: isAdmin || Boolean(filters.course) }).data || [];
  const summary = useGet('/attendance/summary', { course: filters.course || undefined, teacher: filters.teacher || undefined, batch: filters.batch || undefined, liveClass: filters.liveClass, from: range.from, to: range.to }).data;
  const { data: rows = [], meta, isLoading } = useGet('/attendance', { liveClass: filters.liveClass, search: debounced, page, limit: 10 }, { enabled: Boolean(filters.liveClass), keepPrevious: true });

  useEffect(() => {
    if (!isAdmin && !filters.course && courses.length) setFilters((f) => ({ ...f, course: courses[0].id }));
  }, [courses, filters.course, isAdmin]);

  useEffect(() => {
    if (classes.length && !classes.some((c) => c.id === filters.liveClass)) setFilters((f) => ({ ...f, liveClass: classes[0].id }));
    if (!classes.length && filters.liveClass) setFilters((f) => ({ ...f, liveClass: '' }));
  }, [classes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setEdits({});
    setSelected([]);
    setPage(1);
  }, [filters.liveClass]);

  const statusOf = (row) => edits[row.student.id] || row.attendance?.status || 'not_marked';
  const dirty = Object.keys(edits).length;
  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value, ...(key === 'course' ? { batch: '', liveClass: '' } : {}), ...(key === 'teacher' ? { liveClass: '' } : {}) }));

  const save = useAction(() => client.put(`/attendance/${filters.liveClass}`, { records: Object.entries(edits).map(([student, status]) => ({ student, status })) }), {
    success: 'Attendance saved',
    invalidate: ['/attendance', '/students', '/dashboard'],
    onSuccess: () => setEdits({}),
  });

  const applyBulk = (status) => setEdits((e) => ({ ...e, ...Object.fromEntries(selected.map((id) => [id, status])) }));

  const columns = useMemo(
    () => [
      indexColumn(meta),
      { key: 'id', header: 'ID', render: (r) => <span className="text-xs text-slate-500">{r.student.studentCode?.replace('STU', '#') || ''}</span> },
      { key: 'name', header: 'Student Name', render: (r) => <PersonCell name={r.student.name} src={r.student.avatar} size={38} /> },
      { key: 'email', header: 'Email / Phone', render: (r) => <span className="text-slate-600">{r.student.email}</span> },
      {
        key: 'attendance',
        header: 'Attendance',
        render: (r) => (
          <select value={statusOf(r)} onChange={(e) => setEdits((prev) => ({ ...prev, [r.student.id]: e.target.value }))} className={`rounded-md border-0 px-2.5 py-1 text-xs font-semibold ${{ present: 'bg-emerald-100 text-emerald-700', late: 'bg-amber-100 text-amber-700', absent: 'bg-red-100 text-red-600', not_marked: 'bg-slate-100 text-slate-600' }[statusOf(r)]}`}>
            {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ),
      },
      { key: 'join', header: 'Join Time', render: (r) => (r.attendance?.joinTime ? formatTime(r.attendance.joinTime) : '—') },
      { key: 'leave', header: 'Leave Time', render: (r) => (r.attendance?.leaveTime ? formatTime(r.attendance.leaveTime) : '—') },
      { key: 'duration', header: 'Total Duration', render: (r) => (r.attendance?.durationMin ? formatDuration(r.attendance.durationMin) : '—') },
    ],
    [meta, edits], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <>
      <PageHeader title="Attendance" subtitle={isAdmin ? 'Review and correct student attendance across all live classes.' : 'Mark and manage student attendance for your live classes.'} actions={<DateRangeField from={range.from} to={range.to} onChange={setRange} placeholder="All time" className="w-60" />} />

      <StatGrid cols={4}>
        <StatCard icon={Users} tone="blue" label="Total Students" value={summary?.total.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="green" label="Present" value={summary?.present.value ?? '—'} sub={`${summary?.present.rate ?? 0}% attendance rate`} />
        <StatCard icon={XCircle} tone="red" label="Absent" value={summary?.absent.value ?? '—'} sub={`${summary?.absent.rate ?? 0}%`} />
        <StatCard icon={Clock} tone="orange" label="Not Marked" value={summary?.notMarked.value ?? '—'} sub={`${summary?.notMarked.rate ?? 0}%`} />
      </StatGrid>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Field label="Course" className="w-56"><Select value={filters.course} onChange={(e) => set('course', e.target.value)}>{isAdmin && <option value="">All courses</option>}{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
        {isAdmin && <Field label="Teacher" className="w-48"><Select value={filters.teacher} onChange={(e) => set('teacher', e.target.value)}><option value="">All teachers</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>}
        <Field label="Batch" className="w-48"><Select value={filters.batch} onChange={(e) => set('batch', e.target.value)}><option value="">All batches</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Date" className="w-44"><Input type="date" value={filters.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Class" className="w-64"><Select value={filters.liveClass} onChange={(e) => set('liveClass', e.target.value)}>{classes.length === 0 && <option value="">No completed classes</option>}{classes.map((c) => <option key={c.id} value={c.id}>{c.topic || c.title} · {formatDate(c.startsAt)}</option>)}</Select></Field>
        <Button size="lg" icon={CalendarCheck} className="ml-auto" disabled={!dirty} loading={save.loading} onClick={() => save.run()}>Mark Attendance{dirty ? ` (${dirty})` : ''}</Button>
      </div>

      <TableCard className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h3 className="text-[15px] font-bold text-ink">Student List ({meta?.total ?? 0})</h3>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by student name, email or phone..." className="w-80" />
          </div>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.student.id} selectable selected={selected} onSelectedChange={setSelected} loading={isLoading && Boolean(filters.liveClass)} empty={<p className="py-12 text-center text-sm text-slate-500">{filters.liveClass ? 'No students found for this class.' : isAdmin ? 'No completed classes match these filters.' : 'Pick a course and a completed class to mark attendance.'}</p>} minWidth={900} />
        <TableFooter
          meta={meta}
          noun="students"
          onPage={setPage}
          left={
            <div className="flex items-center gap-2">
              <BulkActions selected={selected} actions={[{ value: 'present', label: 'Mark present' }, { value: 'absent', label: 'Mark absent' }, { value: 'late', label: 'Mark late' }]} onApply={applyBulk} />
            </div>
          }
        />
      </TableCard>
    </>
  );
}
