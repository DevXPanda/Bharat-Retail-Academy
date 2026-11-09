import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, DataTable, Field, Input, Modal, PageHeader, Select, StatusBadge, TableCard, Textarea, formatDate, indexColumn, useAction, useClient, useGet } from '../components/ui.jsx';

export default function Assignments() {
  const client = useClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', course: '', dueDate: '' });
  const courses = useGet('/courses/options').data || [];
  const { data: rows = [], isLoading } = useGet('/assignments', { limit: 50 });

  const create = useAction(() => client.post('/assignments', { ...form, dueDate: form.dueDate || undefined }), {
    success: 'Assignment created',
    invalidate: ['/assignments', '/dashboard'],
    onSuccess: () => { setOpen(false); setForm({ title: '', description: '', course: '', dueDate: '' }); },
  });
  const close = useAction((a) => client.patch(`/assignments/${a.id}/close`), { success: 'Assignment closed', invalidate: ['/assignments', '/dashboard'] });

  const columns = [
    indexColumn(),
    { key: 'title', header: 'Title', render: (a) => <span className="font-semibold text-ink">{a.title}</span> },
    { key: 'course', header: 'Course', render: (a) => a.course?.title },
    { key: 'due', header: 'Due Date', render: (a) => (a.dueDate ? formatDate(a.dueDate) : '—') },
    { key: 'sub', header: 'Submissions', render: (a) => `${a.submissionsCount}/${a.enrolledCount}` },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'a', header: 'Action', render: (a) => (a.status === 'active' ? <Button size="sm" variant="outline" onClick={() => close.run(a)}>Close</Button> : null) },
  ];

  return (
    <>
      <PageHeader title="Assignments" subtitle="Create assignments for your courses and track student submissions." breadcrumb={['Dashboard', 'Assignments']} actions={<Button size="lg" icon={Plus} onClick={() => setOpen(true)}>New Assignment</Button>} />
      <TableCard><DataTable columns={columns} rows={rows} loading={isLoading} minWidth={720} empty={<p className="py-12 text-center text-sm text-slate-500">No assignments yet.</p>} /></TableCard>
      <Modal open={open} onClose={() => setOpen(false)} title="New assignment" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={create.loading} disabled={!form.title || !form.course} onClick={() => create.run()}>Create</Button></>}>
        <div className="space-y-4">
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Course" required><Select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}><option value="">Select course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
          <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <Field label="Instructions"><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}
