import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Clock, Layers, MoreVertical, Users, GraduationCap, LayoutList } from 'lucide-react';
import {
  Avatar, Badge, BarsChart, BulkActions, Button, Card, DataTable, DateRangeField, Field, FilterBar, FilterSelect, PageHeader, ProgressBar, RowMenu, StatCard, StatGrid, StatusBadge, TableCard, TableFooter,
  Tabs, Textarea, formatDate, progressTone, useAction, useClient, useGet, useListState, indexColumn, Modal, PersonCell, formatNumber,
} from '../components/ui.jsx';

const TABS = [
  { key: 'all', label: 'All Students' },
  { key: 'course', label: 'Course-wise Students' },
  { key: 'batch', label: 'Batch-wise Students' },
  { key: 'enrolled', label: 'Enrolled Courses' },
  { key: 'overview', label: 'Course Overview' },
];

const STATUS_LABEL = { completed: 'Completed', pending: 'Pending', active: 'Active', inactive: 'Inactive' };

export default function MyStudents() {
  const [tab, setTab] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [messaging, setMessaging] = useState(false);
  const [text, setText] = useState('');
  const client = useClient();
  const list = useListState({ status: 'all', course: 'all', batch: 'all', from: '', to: '' });

  const summary = useGet('/students/roster/summary').data;
  const courses = useGet('/courses/options').data || [];
  const batches = useGet('/batches/options').data || [];
  const rosterParams = { ...list.params, status: tab === 'enrolled' ? 'active' : list.filters.status };
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/students/roster', rosterParams, { enabled: ['all', 'enrolled'].includes(tab), keepPrevious: true });
  const groups = useGet('/students/roster/groups', { by: tab === 'batch' ? 'batch' : 'course' }, { enabled: ['course', 'batch', 'overview'].includes(tab) }).data || [];

  useEffect(() => setSelected([]), [tab, list.filters, list.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = rows.filter((e) => selected.includes(e.id));

  const sendMessage = useAction(
    async () => {
      const students = [...new Map(chosen.map((e) => [e.student.id, e.student])).values()];
      await Promise.all(
        students.map(async (student) => {
          const { data } = await client.post('/conversations', { userId: student.id });
          await client.post(`/conversations/${data.id}/messages`, { text: text.trim() });
        }),
      );
      return students.length;
    },
    { success: (n) => `Message sent to ${n} student${n === 1 ? '' : 's'}`, invalidate: ['/conversations'], onSuccess: () => { setMessaging(false); setText(''); setSelected([]); } },
  );

  const applyBulk = (action) => {
    if (action === 'message') return setMessaging(true);
    const head = ['Student ID', 'Name', 'Email', 'Phone', 'Course', 'Batch', 'Joined', 'Progress %', 'Classes attended', 'Status'];
    const body = chosen.map((e) => [e.student.studentCode, e.student.name, e.student.email, e.student.phone, e.course.title, e.batch?.name, formatDate(e.createdAt), e.progress, `${e.classes.attended}/${e.classes.total}`, e.status]);
    const csv = [head, ...body].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'my-students.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    return undefined;
  };

  const rosterColumns = [
    { key: 'id', header: '#', render: (e) => <span className="text-xs text-slate-500">{e.student.studentCode?.replace('STU', '#') || '—'}</span> },
    { key: 'name', header: 'Student Name', render: (e) => <PersonCell name={e.student.name} src={e.student.avatar} size={38} /> },
    { key: 'email', header: 'Email / Phone', render: (e) => <div className="text-xs"><p className="text-slate-700">{e.student.email}</p><p className="text-slate-500">{e.student.phone}</p></div> },
    { key: 'course', header: 'Enrolled Course', render: (e) => <span className="line-clamp-2 min-w-[110px] text-slate-700">{e.course.title}</span> },
    { key: 'batch', header: 'Batch', render: (e) => (e.batch ? <Badge tone="purple">{e.batch.name}</Badge> : <span className="text-slate-400">—</span>) },
    { key: 'joined', header: 'Join Date', render: (e) => formatDate(e.createdAt) },
    { key: 'progress', header: 'Progress', render: (e) => <div className="flex min-w-[120px] items-center gap-2"><ProgressBar value={e.progress} tone={progressTone(e.progress)} /><span className="w-9 text-xs font-medium text-slate-600">{e.progress}%</span></div> },
    { key: 'classes', header: 'Classes Attended', align: 'center', render: (e) => `${e.classes.attended} / ${e.classes.total}` },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status === 'completed' ? 'completed' : e.status} tone={e.status === 'completed' ? 'purple' : undefined} label={STATUS_LABEL[e.status]} /> },
    { key: 'action', header: 'Actions', render: (e) => <RowMenu items={[{ label: 'View profile', icon: Users, onClick: () => setViewing(e) }]} /> },
  ];

  const groupColumns = [
    { key: 'name', header: tab === 'batch' ? 'Batch' : 'Course', render: (g) => <span className="font-semibold text-ink">{g.name}</span> },
    { key: 'students', header: 'Students', align: 'center', render: (g) => g.students },
    { key: 'active', header: 'Active', align: 'center', render: (g) => g.active },
    { key: 'completed', header: 'Completed', align: 'center', render: (g) => g.completed },
    { key: 'progress', header: 'Avg. Progress', render: (g) => <div className="flex min-w-[140px] items-center gap-2"><ProgressBar value={g.avgProgress} tone={progressTone(g.avgProgress)} /><span className="w-9 text-xs text-slate-600">{g.avgProgress}%</span></div> },
  ];

  return (
    <>
      <PageHeader
        title="My Students"
        subtitle="Student enrollment, progress and attendance."
        actions={<DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="All time" className="w-64" />}
      />

      <StatGrid cols={6} className="!gap-3">
        <StatCard icon={Users} tone="blue" label="Total Students" value={formatNumber(summary?.totalStudents.value)} trend={summary?.totalStudents.trend} />
        <StatCard icon={BookOpen} tone="green" label="Enrolled Courses" value={formatNumber(summary?.enrolled.value)} trend={summary?.enrolled.trend} />
        <StatCard icon={GraduationCap} tone="purple" label="Total Courses" value={formatNumber(summary?.courses.value)} sub="(You are teaching)" />
        <StatCard icon={Layers} tone="orange" label="Total Batches" value={formatNumber(summary?.batches.value)} />
        <StatCard icon={CheckCircle2} tone="red" label="Completed Students" value={formatNumber(summary?.completed.value)} trend={summary?.completed.trend} />
        <StatCard icon={Clock} tone="orange" label="Pending Students" value={formatNumber(summary?.pending.value)} trend={summary?.pending.trend} />
      </StatGrid>

      <TableCard className="mt-6" tabs={<Tabs tabs={TABS} value={tab} onChange={setTab} />}>
        {['all', 'enrolled'].includes(tab) && (
          <>
            <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by student name, email or phone..." className="!pb-2">
              <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-44" />
              <FilterSelect value={list.filters.batch} onChange={(v) => list.setFilter('batch', v)} allLabel="All Batches" options={batches.map((b) => ({ value: b.id, label: b.name }))} className="w-40" />
              {tab === 'all' && <FilterSelect value={list.filters.status} onChange={(v) => list.setFilter('status', v)} allLabel="All Status" options={['active', 'completed', 'pending', 'inactive'].map((s) => ({ value: s, label: STATUS_LABEL[s] }))} className="w-36" />}
              <Button variant="secondary" onClick={list.reset}>Reset</Button>
            </FilterBar>
            <div className="teacher-roster-actions flex items-center justify-between gap-3 px-5 pb-3">
              <h3 className="text-[15px] font-bold text-ink">Student List ({meta?.total ?? 0})</h3>
              <BulkActions selected={selected} actions={[{ value: 'message', label: 'Send message' }, { value: 'export', label: 'Export selected' }]} onApply={applyBulk} />
            </div>
            <DataTable columns={rosterColumns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={1100} selectable selected={selected} onSelectedChange={setSelected} />
            <TableFooter meta={meta} noun="students" onPage={list.setPage} pageSize={list.pageSize} onPageSize={list.setPageSize} />
          </>
        )}
        {['course', 'batch'].includes(tab) && <DataTable columns={groupColumns} rows={groups} minWidth={640} className="mt-2" />}
        {tab === 'overview' && (
          <div className="p-5">
            <h4 className="mb-3 text-sm font-bold text-ink">Students per course</h4>
            <BarsChart data={groups} xKey="name" layout="vertical" height={Math.max(220, groups.length * 54)} series={[{ key: 'students', label: 'Students', color: '#2f6df3' }, { key: 'completed', label: 'Completed', color: '#22c55e' }]} />
          </div>
        )}
      </TableCard>

      <Modal
        open={messaging}
        onClose={() => setMessaging(false)}
        title="Send message"
        subtitle={`${new Set(chosen.map((e) => e.student.id)).size} selected student(s)`}
        footer={<><Button variant="secondary" onClick={() => setMessaging(false)}>Cancel</Button><Button loading={sendMessage.loading} disabled={text.trim().length < 1} onClick={() => sendMessage.run()}>Send</Button></>}
      >
        <Field label="Message"><Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message to the selected students..." /></Field>
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.student.name} subtitle={viewing?.course.title} footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {[['Student ID', viewing.student.studentCode], ['Email', viewing.student.email], ['Phone', viewing.student.phone || '—'], ['Batch', viewing.batch?.name || '—'], ['Progress', `${viewing.progress}%`], ['Classes attended', `${viewing.classes.attended} / ${viewing.classes.total}`]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-500">{k}</p><p className="mt-0.5 break-all font-semibold text-ink">{v}</p></div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
