import { useState } from 'react';
import { CheckCircle2, Clock, Eye, Pencil, Plus, Trash2, UserCheck, UserX, Users, XCircle } from 'lucide-react';
import {
  Button, CATEGORY_OPTIONS, ConfirmDialog, DataTable, ExpertiseTag, FilterBar, FilterSelect, IconButton, PageHeader, PersonCell, RowMenu, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs,
  indexColumn, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';
import { TeacherOnboarding } from '../components/TeacherOnboarding.jsx';
import { TeacherProfile } from '../components/TeacherProfile.jsx';

export default function Teachers() {
  const client = useClient();
  const list = useListState({ status: 'all', expertise: 'all' });
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useGet('/teachers/summary').data;
  const courses = useGet('/courses/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/teachers', list.params, { keepPrevious: true });

  const setStatus = useAction((t, status) => client.patch(`/teachers/${t.id}`, { status }), { success: 'Status updated', invalidate: ['/teachers', '/dashboard'] });
  const remove = useAction((t) => client.delete(`/teachers/${t.id}`), { success: 'Teacher deleted', invalidate: ['/teachers', '/dashboard'], onSuccess: () => setDeleting(null), onError: () => setDeleting(null) });

  const tabs = [
    { key: 'all', label: 'All Teachers' },
    { key: 'pending', label: 'Pending Approval' },
    { key: 'inactive', label: 'Inactive Teachers' },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'teacher', header: 'Teacher Details', render: (t) => <PersonCell name={t.name} sub={t.email} src={t.avatar} size={42} /> },
    { key: 'expertise', header: 'Expertise', render: (t) => <ExpertiseTag value={t.teacher?.expertise} /> },
    { key: 'courses', header: 'Assigned Courses', render: (t) => `${t.assignedCourses.length} Course${t.assignedCourses.length === 1 ? '' : 's'}` },
    { key: 'classes', header: 'Classes', align: 'center', render: (t) => t.classesCount },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <IconButton icon={Eye} label="View" onClick={() => setViewing(t)} />
          <IconButton icon={Pencil} label="Edit" onClick={() => { setEditing(t); setEditorOpen(true); }} />
          <RowMenu
            items={[
              t.status === 'pending' && { label: 'Approve', icon: CheckCircle2, onClick: () => setStatus.run(t, 'active') },
              t.status === 'active' && { label: 'Deactivate', icon: XCircle, onClick: () => setStatus.run(t, 'inactive') },
              t.status === 'inactive' && { label: 'Activate', icon: UserCheck, onClick: () => setStatus.run(t, 'active') },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(t) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Teachers" subtitle="Teacher accounts, classes and course access." actions={<Button size="lg" icon={Plus} onClick={() => { setEditing(null); setEditorOpen(true); }}>Onboard New Teacher</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={Users} tone="blue" label="Total Teachers" value={summary?.total.value ?? '—'} />
        <StatCard icon={UserCheck} tone="green" label="Active Teachers" value={summary?.active.value ?? '—'} />
        <StatCard icon={Clock} tone="orange" label="Pending Approval" value={summary?.pending.value ?? '—'} />
        <StatCard icon={UserX} tone="red" label="Inactive Teachers" value={summary?.inactive.value ?? '—'} />
      </StatGrid>

      <div className="portal-workspace"><TableCard tabs={<Tabs tabs={tabs} value={list.filters.status === 'active' ? 'all' : list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by name, email or phone..." onReset={list.reset}>
            <FilterSelect value={list.filters.status} onChange={(v) => list.setFilter('status', v)} allLabel="All Status" options={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'inactive', label: 'Inactive' }]} className="w-36" />
            <FilterSelect value={list.filters.expertise} onChange={(v) => list.setFilter('expertise', v)} allLabel="All Expertise" options={CATEGORY_OPTIONS} className="w-44" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={760} />
          <TableFooter meta={meta} noun="teachers" onPage={list.setPage} />
        </TableCard></div>
<TeacherOnboarding open={editorOpen} editing={editing} courses={courses} onClose={() => { setEditorOpen(false); setEditing(null); }} />

      <TeacherProfile teacher={viewing} onClose={() => setViewing(null)} onEdit={(t) => { setViewing(null); setEditing(t); setEditorOpen(true); }} />

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete teacher" confirmLabel="Delete" message={`Delete ${deleting?.name}? Teachers with classes or batches cannot be deleted - deactivate them instead.`} />
    </>
  );
}
