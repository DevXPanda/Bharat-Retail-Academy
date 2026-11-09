import { PortalWorkspace } from '@ecomedu/ui';
import { useState } from 'react';
import { Archive, CheckCircle2, Clock, EyeOff, Pencil, Play, PlayCircle, Plus, Trash2, XCircle } from 'lucide-react';
import {
  BulkActions, Button, Card, ConfirmDialog, DataTable, DateRangeField, Field, FileUpload, FilterBar, FilterSelect, IconButton, Input, Modal, PageHeader, PersonCell, ProgressBar, RowMenu,
  Select, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, ViewAll, formatDate, formatTime, formatVideoLength, indexColumn, toInputDate, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';
import { CourseMark } from '../components/ui.jsx';

const BLANK = { title: '', course: '', batch: '', teacher: '', classDate: toInputDate(new Date()), videoUrl: '', thumbnail: '', durationSec: 0, status: 'published' };

function Thumb({ rec, size = 'md' }) {
  const small = size === 'sm';
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-navy-800 ${small ? 'h-10 w-14' : 'h-12 w-[72px]'}`}>
      {rec.thumbnail ? <img src={rec.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><CourseMark category={rec.course?.category} size={small ? 24 : 30} /></div>}
      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">{formatVideoLength(rec.durationSec)}</span>
    </div>
  );
}

function RecordingModal({ open, recording, onClose }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [lastId, setLastId] = useState(null);
  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const batches = useGet('/batches/options', { course: form.course }, { enabled: Boolean(form.course) }).data || [];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (open && (recording?.id || 'new') !== lastId) {
    setLastId(recording?.id || 'new');
    setErrors({});
    setForm(recording ? { title: recording.title, course: recording.course?.id, batch: recording.batch?.id || '', teacher: recording.teacher?.id, classDate: toInputDate(recording.classDate), videoUrl: recording.videoUrl || '', thumbnail: recording.thumbnail || '', durationSec: recording.durationSec, status: recording.status } : BLANK);
  }
  if (!open && lastId) setLastId(null);

  const save = useAction(
    () => {
      const body = { ...form, batch: form.batch || undefined, thumbnail: form.thumbnail || undefined, durationSec: Number(form.durationSec) || 0 };
      return recording ? client.patch(`/recordings/${recording.id}`, body) : client.post('/recordings', body);
    },
    { success: recording ? 'Recording updated' : 'Recording uploaded', invalidate: ['/recordings', '/dashboard'], onSuccess: onClose },
  );

  const submit = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Enter a title';
    if (!form.course) next.course = 'Select a course';
    if (!form.teacher) next.teacher = 'Select a teacher';
    if (!form.videoUrl) next.videoUrl = 'Upload a video or paste a link';
    setErrors(next);
    if (!Object.keys(next).length) save.run();
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={recording ? 'Edit recording' : 'Upload recording'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.loading} onClick={submit}>{recording ? 'Save changes' : 'Upload'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title} className="sm:col-span-2"><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Amazon Product Research" /></Field>
        <Field label="Course" required error={errors.course}><Select value={form.course} onChange={(e) => { set('course', e.target.value); set('batch', ''); }}><option value="">Select course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
        <Field label="Batch"><Select value={form.batch} onChange={(e) => set('batch', e.target.value)} disabled={!form.course}><option value="">All batches</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Teacher" required error={errors.teacher}><Select value={form.teacher} onChange={(e) => set('teacher', e.target.value)}><option value="">Select teacher</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Class date"><Input type="date" value={form.classDate} onChange={(e) => set('classDate', e.target.value)} /></Field>
        <div className="sm:col-span-2 space-y-3">
          <FileUpload label="Video file" kind="video" value={form.videoUrl} onChange={(url) => set('videoUrl', url)} title="Upload recording video" hint="MP4 or WebM, up to 1 GB" required />
          <Field label="...or video URL" error={errors.videoUrl}><Input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://" /></Field>
        </div>
        <FileUpload label="Thumbnail" kind="image" value={form.thumbnail} onChange={(url) => set('thumbnail', url)} title="Upload thumbnail" hint="Optional" />
        <div className="space-y-4">
          <Field label="Duration (seconds)"><Input type="number" min={0} value={form.durationSec} onChange={(e) => set('durationSec', e.target.value)} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="processing">Processing</option><option value="archived">Archived</option></Select></Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Recordings() {
  const client = useClient();
  const list = useListState({ status: 'all', course: 'all', batch: 'all', teacher: 'all', from: '', to: '' });
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const summary = useGet('/recordings/summary').data;
  const sidebar = useGet('/recordings/sidebar').data;
  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const batches = useGet('/batches/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/recordings', list.params, { keepPrevious: true });

  const setStatus = useAction((r, status) => client.patch(`/recordings/${r.id}/status`, { status }), { success: 'Recording updated', invalidate: ['/recordings'] });
  const remove = useAction((r) => client.delete(`/recordings/${r.id}`), { success: 'Recording deleted', invalidate: ['/recordings', '/dashboard'], onSuccess: () => setDeleting(null) });
  const bulk = useAction((action) => client.post('/recordings/bulk', { ids: selected, action }), { success: (r) => `${r.data.affected} recording(s) updated`, invalidate: ['/recordings', '/dashboard'], onSuccess: () => setSelected([]) });

  const tabs = [
    { key: 'all', label: 'All Recordings', count: summary?.total.value },
    { key: 'published', label: 'Published', count: summary?.published.value },
    { key: 'processing', label: 'Processing', count: summary?.processing.value },
    { key: 'unpublished', label: 'Unpublished', count: summary?.unpublished.value },
    { key: 'archived', label: 'Archived', count: summary?.archived.value },
  ];

  const play = (r) => { setPlaying(r); client.post(`/recordings/${r.id}/view`).catch(() => {}); };

  const columns = [
    indexColumn(meta),
    { key: 'thumb', header: 'Thumbnail', render: (r) => <Thumb rec={r} /> },
    { key: 'title', header: 'Title & Details', render: (r) => <div className="min-w-[160px]"><p className="line-clamp-2 text-[13px] font-bold text-ink">{r.title}</p><p className="text-xs text-slate-500">Live Class Recording</p></div> },
    { key: 'course', header: 'Course / Batch', render: (r) => <div className="min-w-[100px] text-xs"><p className="line-clamp-1 text-slate-700">{r.course?.title}</p><p className="text-slate-500">{r.batch?.name || 'All batches'}</p></div> },
    { key: 'teacher', header: 'Teacher', render: (r) => <PersonCell name={r.teacher?.name} src={r.teacher?.avatar} size={30} /> },
    { key: 'date', header: 'Class Date', render: (r) => <div className="text-xs"><p className="font-medium text-slate-700">{formatDate(r.classDate)}</p><p className="text-slate-500">{formatTime(r.classDate)}</p></div> },
    { key: 'duration', header: 'Duration', render: (r) => formatVideoLength(r.durationSec) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'views', header: 'Views', align: 'center', render: (r) => r.views },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <IconButton icon={Play} label="Play" disabled={!r.videoUrl} onClick={() => play(r)} className="!border-brand-200 !bg-brand-50 !text-brand-600" />
          <IconButton icon={Pencil} label="Edit" onClick={() => setModal({ recording: r })} />
          <RowMenu
            items={[
              r.status !== 'published' && { label: 'Publish', icon: CheckCircle2, onClick: () => setStatus.run(r, 'published') },
              r.status === 'published' && { label: 'Unpublish', icon: EyeOff, onClick: () => setStatus.run(r, 'unpublished') },
              r.status !== 'archived' && { label: 'Archive', icon: Archive, onClick: () => setStatus.run(r, 'archived') },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(r) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Class Recordings" subtitle="Upload and manage class recordings." actions={<Button size="lg" icon={Plus} onClick={() => setModal({})}>Upload Recording</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={PlayCircle} tone="blue" label="Total Recordings" value={summary?.total.value ?? '—'} sub="All uploaded recordings" />
        <StatCard icon={CheckCircle2} tone="green" label="Published" value={summary?.published.value ?? '—'} sub="Available for students" />
        <StatCard icon={Clock} tone="orange" label="Processing" value={summary?.processing.value ?? '—'} sub="Video is being processed" />
        <StatCard icon={XCircle} tone="red" label="Unpublished" value={summary?.unpublished.value ?? '—'} sub="Not visible to students" />
      </StatGrid>

      <PortalWorkspace insights={<>
          <Card title="Recent Uploads" action={<ViewAll onClick={() => list.setFilter('status', 'all')} />}>
            <ul className="space-y-4">
              {(sidebar?.recent || []).map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <Thumb rec={r} size="sm" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{r.title}</p><p className="text-xs text-slate-500">{formatDate(r.classDate)} • {formatVideoLength(r.durationSec)}</p></div>
                  {r.status === 'published' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <StatusBadge status={r.status} />}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Video Processing" action={<ViewAll onClick={() => list.setFilter('status', 'processing')} />}>
            <ul className="space-y-5">
              {(sidebar?.processing || []).length === 0 && <li className="text-sm text-slate-500">Nothing is processing right now.</li>}
              {(sidebar?.processing || []).map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <Thumb rec={r} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-[13px]"><p className="truncate font-semibold text-ink">{r.title}</p><span className="font-semibold text-slate-600">{r.processingProgress}%</span></div>
                    <p className="mb-1.5 text-xs text-slate-500">{formatDate(r.classDate)} • {formatVideoLength(r.durationSec)}</p>
                    <ProgressBar value={r.processingProgress} tone="purple" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>}><TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by title, course, teacher or batch..." onReset={list.reset}>
            <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-40" />
            <FilterSelect value={list.filters.batch} onChange={(v) => list.setFilter('batch', v)} allLabel="All Batches" options={batches.map((b) => ({ value: b.id, label: b.name }))} className="w-36" />
            <FilterSelect value={list.filters.teacher} onChange={(v) => list.setFilter('teacher', v)} allLabel="All Teachers" options={teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-36" />
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="Date Range" className="w-44" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} selectable selected={selected} onSelectedChange={setSelected} loading={isLoading} error={error} onRetry={refetch} minWidth={1050} />
          <TableFooter meta={meta} noun="recordings" onPage={list.setPage} left={<BulkActions selected={selected} loading={bulk.loading} onApply={(a) => bulk.run(a)} actions={[{ value: 'publish', label: 'Publish' }, { value: 'unpublish', label: 'Unpublish' }, { value: 'archive', label: 'Archive' }, { value: 'delete', label: 'Delete' }]} />} />
        </TableCard></PortalWorkspace>

      <RecordingModal open={Boolean(modal)} recording={modal?.recording} onClose={() => setModal(null)} />
      <Modal open={Boolean(playing)} onClose={() => setPlaying(null)} size="xl" title={playing?.title} subtitle={playing?.course?.title}>
        {playing && <video src={playing.videoUrl} controls autoPlay className="aspect-video w-full rounded-xl bg-black" />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete recording" confirmLabel="Delete" message={`Delete "${deleting?.title}"? Students will lose access to this recording.`} />
    </>
  );
}
