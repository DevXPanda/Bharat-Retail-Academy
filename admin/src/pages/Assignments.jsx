import { useState } from 'react';
import { CheckCircle2, ClipboardList, FileCheck2, Lock } from 'lucide-react';
import {
  Avatar, Button, CourseMark, DataTable, EmptyState, FilterBar, FilterSelect, Modal, PageHeader, PersonCell, ProgressBar, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs,
  formatDate, formatDateTime, indexColumn, useGet, useListState,
} from '../components/ui.jsx';

function SubmissionsModal({ assignment, onClose }) {
  const submissions = assignment?.submissions || [];
  return (
    <Modal open={Boolean(assignment)} onClose={onClose} size="lg" title={assignment?.title} subtitle={assignment && `${assignment.course?.title} · ${assignment.teacher?.name}`} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {assignment?.description && <p className="mb-4 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600">{assignment.description}</p>}
      <h4 className="mb-3 text-sm font-bold text-ink">Submissions ({submissions.length} of {assignment?.enrolledCount})</h4>
      {submissions.length === 0 ? <EmptyState icon={FileCheck2} title="No submissions yet" /> : (
        <ul className="divide-y divide-slate-100">
          {submissions.map((s) => (
            <li key={s.id || s.student?.id} className="flex items-start gap-3 py-3">
              <Avatar name={s.student?.name} src={s.student?.avatar} size={34} />
              <div className="min-w-0 flex-1 text-sm"><p className="font-semibold text-ink">{s.student?.name} <span className="text-xs font-normal text-slate-400">{s.student?.studentCode}</span></p>{s.note && <p className="mt-0.5 text-slate-600">{s.note}</p>}{s.fileUrl && <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">Open file</a>}</div>
              <span className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(s.submittedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function Assignments() {
  const list = useListState({ status: 'all', course: 'all', teacher: 'all' }, { limit: 8 });
  const [viewing, setViewing] = useState(null);

  const summary = useGet('/assignments/summary').data;
  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100 }).data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/assignments', list.params, { keepPrevious: true });

  const tabs = [
    { key: 'all', label: 'All Assignments', count: summary?.total.value },
    { key: 'active', label: 'Active', count: summary?.active.value },
    { key: 'closed', label: 'Closed', count: summary?.closed.value },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'title', header: 'Assignment', render: (a) => <p className="line-clamp-2 min-w-[170px] text-[13px] font-bold text-ink">{a.title}</p> },
    { key: 'course', header: 'Course', render: (a) => <div className="flex min-w-[150px] items-center gap-2.5"><CourseMark category={a.course?.category} src={a.course?.thumbnail} size={32} /><span className="line-clamp-2 text-xs text-slate-600">{a.course?.title}</span></div> },
    { key: 'teacher', header: 'Teacher', render: (a) => <PersonCell name={a.teacher?.name} src={a.teacher?.avatar} size={30} /> },
    { key: 'due', header: 'Due Date', render: (a) => <span className="whitespace-nowrap">{a.dueDate ? formatDate(a.dueDate) : '—'}</span> },
    {
      key: 'subs',
      header: 'Submissions',
      render: (a) => (
        <div className="flex min-w-[120px] items-center gap-2"><ProgressBar value={a.enrolledCount ? Math.round((a.submissionsCount / a.enrolledCount) * 100) : 0} tone="blue" /><span className="whitespace-nowrap text-xs text-slate-600">{a.submissionsCount}/{a.enrolledCount}</span></div>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status === 'active' ? 'active' : 'closed'} /> },
    { key: 'action', header: 'Action', render: (a) => <Button size="sm" variant="soft" onClick={() => setViewing(a)}>View</Button> },
  ];

  return (
    <>
      <PageHeader title="Assignments" subtitle="Assignments and student submissions." />

      <StatGrid cols={4}>
        <StatCard icon={ClipboardList} tone="blue" label="Total Assignments" value={summary?.total.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="green" label="Active" value={summary?.active.value ?? '—'} sub="Accepting submissions" />
        <StatCard icon={Lock} tone="slate" label="Closed" value={summary?.closed.value ?? '—'} />
        <StatCard icon={FileCheck2} tone="purple" label="Total Submissions" value={summary?.submissions.value ?? '—'} sub="From all students" />
      </StatGrid>

      <TableCard className="mt-6" tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
        <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by assignment title..." onReset={list.reset}>
          <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-48" />
          <FilterSelect value={list.filters.teacher} onChange={(v) => list.setFilter('teacher', v)} allLabel="All Teachers" options={teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-44" />
        </FilterBar>
        <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} onRowClick={setViewing} minWidth={900} />
        <TableFooter meta={meta} noun="assignments" onPage={list.setPage} />
      </TableCard>

      <SubmissionsModal assignment={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
