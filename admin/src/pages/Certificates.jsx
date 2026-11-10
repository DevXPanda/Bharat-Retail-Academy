import { PortalWorkspace } from '@ecomedu/ui';
import { useState } from 'react';
import { Award, CheckCircle2, ChevronDown, Clock, Download, Eye, FileBadge, Plus, ShieldX, TimerOff } from 'lucide-react';
import {
  BulkActions, Button, Card, DataTable, DateRangeField, DonutWithLegend, Field, FilterBar, FilterSelect, IconButton, Modal, PageHeader, PersonCell, RowMenu, Select, SearchInput, StatCard,
  StatGrid, StatusBadge, TableCard, TableFooter, Tabs, ViewAll, formatDate, indexColumn, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';

function GenerateModal({ open, onClose }) {
  const client = useClient();
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const students = useGet('/students', { search, limit: 20 }, { enabled: open }).data || [];
  const student = students.find((s) => s.id === studentId);
  const courseOptions = student?.enrollments || [];

  const generate = useAction(() => client.post('/certificates', { studentId, courseId }), {
    success: 'Certificate generated',
    invalidate: ['/certificates'],
    onSuccess: () => { setStudentId(''); setCourseId(''); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} title="Generate certificate" subtitle="Issue a verified certificate to a student for an enrolled course." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Award} disabled={!studentId || !courseId} loading={generate.loading} onClick={() => generate.run()}>Generate</Button></>}>
      <div className="space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search student by name or email..." />
        <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {students.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => { setStudentId(s.id); setCourseId(''); }} className={`flex w-full items-center px-3.5 py-2.5 text-left hover:bg-slate-50 ${studentId === s.id ? 'bg-brand-50' : ''}`}>
                <PersonCell name={s.name} sub={s.email} size={32} />
              </button>
            </li>
          ))}
        </ul>
        <Field label="Course">
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!student}>
            <option value="">{student ? 'Select course' : 'Select a student first'}</option>
            {courseOptions.map((e) => <option key={e.id} value={e.course.id}>{e.course.title} ({e.progress}%)</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export default function Certificates() {
  const client = useClient();
  const list = useListState({ status: 'all', course: 'all', batch: 'all', from: '', to: '' });
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing] = useState(null);

  const summary = useGet('/certificates/summary').data;
  const courses = useGet('/courses/options').data || [];
  const batches = useGet('/batches/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/certificates', list.params, { keepPrevious: true });

  const setStatus = useAction((c, status) => client.patch(`/certificates/${c.id}/status`, { status }), { success: 'Certificate updated', invalidate: ['/certificates'] });
  const download = useAction((c) => client.download(`/certificates/${c.id}/download`, `${c.certificateId}.pdf`), { success: 'Download started' });
  const bulk = useAction((action) => client.post('/certificates/bulk', { ids: selected, action }), { success: (r) => `${r.data.affected} certificate(s) updated`, invalidate: ['/certificates'], onSuccess: () => setSelected([]) });

  const tabs = [
    { key: 'all', label: 'All Certificates', count: summary?.total.value },
    { key: 'verified', label: 'Verified', count: summary?.verified.value },
    { key: 'pending', label: 'Pending', count: summary?.pending.value },
    { key: 'revoked', label: 'Revoked', count: summary?.revoked.value },
    { key: 'expired', label: 'Expired', count: summary?.expired.value },
  ];

  const display = (c) => (c.status === 'verified' && c.downloads > 0 ? 'downloaded' : c.status);

  const columns = [
    indexColumn(meta),
    { key: 'student', header: 'Student Name', render: (c) => <PersonCell name={c.student?.name} sub={c.student?.email} src={c.student?.avatar} size={36} /> },
    { key: 'course', header: 'Course', render: (c) => <span className="line-clamp-2 min-w-[110px] text-slate-700">{c.course?.title}</span> },
    { key: 'batch', header: 'Batch', render: (c) => c.batch?.name || '—' },
    { key: 'date', header: 'Completion Date', render: (c) => formatDate(c.completionDate) },
    { key: 'id', header: 'Certificate ID', render: (c) => <span className="font-mono text-xs text-slate-600">{c.certificateId}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={display(c)} /> },
    {
      key: 'action',
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <IconButton icon={Eye} label="View details" onClick={() => setViewing(c)} />
          <IconButton icon={Download} label="Download PDF" disabled={c.status === 'pending'} onClick={() => download.run(c)} className="!text-brand-600" />
          <RowMenu
            items={[
              c.status !== 'verified' && { label: 'Verify', icon: CheckCircle2, onClick: () => setStatus.run(c, 'verified') },
              c.status !== 'revoked' && { label: 'Revoke', icon: ShieldX, danger: true, onClick: () => setStatus.run(c, 'revoked') },
              c.status !== 'expired' && { label: 'Mark expired', icon: TimerOff, onClick: () => setStatus.run(c, 'expired') },
            ]}
          />
        </div>
      ),
    },
  ];

  const donut = [
    { name: 'Verified', value: summary?.verified.value || 0, color: '#2d725e' },
    { name: 'Pending', value: summary?.pending.value || 0, color: '#f59e0b' },
    { name: 'Revoked', value: summary?.revoked.value || 0, color: '#ef4444' },
    { name: 'Expired', value: summary?.expired.value || 0, color: '#94a3b8' },
  ];

  return (
    <>
      <PageHeader title="Certificates" subtitle="Issue and verify course certificates." actions={<Button size="lg" icon={Plus} onClick={() => setGenerating(true)}>Generate Certificate</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={FileBadge} tone="blue" label="Total Certificates" value={summary?.total.value ?? '—'} sub="All generated certificates" />
        <StatCard icon={CheckCircle2} tone="green" label="Verified Certificates" value={summary?.verified.value ?? '—'} sub="Verified by admin" />
        <StatCard icon={Download} tone="purple" label="Downloaded" value={summary?.downloaded.value ?? '—'} sub="Downloaded by students" />
        <StatCard icon={Clock} tone="orange" label="Pending Certificates" value={summary?.pending.value ?? '—'} sub="Awaiting verification" />
      </StatGrid>

      <PortalWorkspace insights={<>
          <Card title="Certificate Overview">
            <DonutWithLegend data={donut} centerValue={summary?.total.value ?? 0} centerLabel="Total" size={132} />
          </Card>
          <Card title="Recent Certificates" action={<ViewAll onClick={() => list.setFilter('status', 'verified')} />}>
            <ul className="space-y-4">
              {(summary?.recent || []).map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <PersonCell name={c.student?.name} sub={`${c.course?.title} · ${formatDate(c.completionDate)}`} src={c.student?.avatar} size={40} />
                  <StatusBadge status={display(c)} className="ml-auto" />
                </li>
              ))}
            </ul>
          </Card>
        </>}><TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by student name, course or certificate ID..." onReset={list.reset}>
            <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-40" />
            <FilterSelect value={list.filters.batch} onChange={(v) => list.setFilter('batch', v)} allLabel="All Batches" options={batches.map((b) => ({ value: b.id, label: b.name }))} className="w-36" />
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} className="w-48" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} selectable selected={selected} onSelectedChange={setSelected} loading={isLoading} error={error} onRetry={refetch} minWidth={980} />
          <TableFooter meta={meta} noun="certificates" onPage={list.setPage} left={<BulkActions selected={selected} loading={bulk.loading} onApply={(a) => bulk.run(a)} actions={[{ value: 'verify', label: 'Verify selected' }, { value: 'revoke', label: 'Revoke selected' }]} />} />
        </TableCard></PortalWorkspace>

      <GenerateModal open={generating} onClose={() => setGenerating(false)} />
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Certificate details" footer={<><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>{viewing && viewing.status !== 'pending' && <Button icon={Download} onClick={() => download.run(viewing)}>Download PDF</Button>}</>}>
        {viewing && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {[['Student', viewing.student?.name], ['Email', viewing.student?.email], ['Course', viewing.course?.title], ['Batch', viewing.batch?.name || '—'], ['Completed on', formatDate(viewing.completionDate)], ['Certificate ID', viewing.certificateId], ['Downloads', viewing.downloads], ['Status', <StatusBadge key="s" status={viewing.status} />]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-500">{k}</p><div className="mt-0.5 break-all font-semibold text-ink">{v}</div></div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
