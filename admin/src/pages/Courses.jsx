import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Eye, FilePlus2, GripVertical, Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  Drawer, Button, CATEGORY_OPTIONS, Checkbox, ConfirmDialog, CourseMark, DataTable, ExpertiseTag, Field, FileUpload, FilterBar, FilterSelect, IconButton, Input, Modal, PageHeader, RowMenu,
  Select, SidePanel, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, Textarea, Badge, formatCurrency, indexColumn, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';
import { CourseDetails } from '../components/CourseDetails.jsx';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Beginner to Advanced', 'Beginner to Intermediate', 'All Levels'];
const BADGES = ['', 'Bestseller', 'Popular', 'New', 'Trending', 'Most Enrolled'];

const BLANK = { title: '', shortDescription: '', description: '', category: '', thumbnail: '', status: 'draft', price: '', mrp: '', level: 'Beginner', badge: '', instructor: '', liveClassesCount: 8, certificate: true, accessDays: 365, modules: [] };

const fromCourse = (c) => ({
  title: c.title,
  shortDescription: c.shortDescription,
  description: c.description || '',
  category: c.category,
  thumbnail: c.thumbnail || '',
  status: c.status,
  price: c.price,
  mrp: c.mrp || '',
  level: c.level,
  badge: c.badge || '',
  instructor: c.instructor?.id || '',
  liveClassesCount: c.liveClassesCount,
  certificate: c.settings?.certificate ?? true,
  accessDays: c.settings?.accessDays ?? 365,
  modules: c.modules.map((m) => ({ title: m.title, lessons: m.lessons.map((l) => ({ title: l.title, type: l.type, url: l.url || '', durationMin: l.durationMin, isPreview: l.isPreview })) })),
});

function ModulesEditor({ modules, onChange }) {
  const updateModule = (i, patch) => onChange(modules.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const updateLesson = (mi, li, patch) => updateModule(mi, { lessons: modules[mi].lessons.map((l, idx) => (idx === li ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-4">
      {modules.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No modules yet. Add the first module to start building the curriculum.</p>}
      {modules.map((m, mi) => (
        <div key={mi} className="rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
            <Input value={m.title} onChange={(e) => updateModule(mi, { title: e.target.value })} placeholder={`Module ${mi + 1} title`} className="font-semibold" />
            <IconButton icon={Trash2} label="Remove module" onClick={() => onChange(modules.filter((_, idx) => idx !== mi))} />
          </div>
          <ul className="mt-3 space-y-3">
            {m.lessons.map((l, li) => (
              <li key={li} className="space-y-2 rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <Input value={l.title} onChange={(e) => updateLesson(mi, li, { title: e.target.value })} placeholder="Lesson title" />
                  <Input type="number" min={0} value={l.durationMin} onChange={(e) => updateLesson(mi, li, { durationMin: Number(e.target.value) })} className="w-20" title="Duration (min)" />
                  <IconButton icon={Trash2} label="Remove lesson" onClick={() => updateModule(mi, { lessons: m.lessons.filter((_, idx) => idx !== li) })} />
                </div>
                <FileUpload kind="video" value={l.url} onChange={(url) => updateLesson(mi, li, { url })} title="Upload lesson video" hint="MP4 or WebM" />
                <Input value={l.url} onChange={(e) => updateLesson(mi, li, { url: e.target.value })} placeholder="...or paste a video URL" />
                <label className="flex items-center gap-2 text-xs text-slate-600"><Checkbox checked={l.isPreview} onChange={(c) => updateLesson(mi, li, { isPreview: c })} /> Free preview lesson</label>
              </li>
            ))}
          </ul>
          <Button variant="soft" size="sm" icon={FilePlus2} className="mt-3" onClick={() => updateModule(mi, { lessons: [...m.lessons, { title: '', type: 'video', url: '', durationMin: 10, isPreview: false }] })}>Add lesson</Button>
        </div>
      ))}
      <Button variant="outline" icon={Plus} onClick={() => onChange([...modules, { title: '', lessons: [] }])}>Add module</Button>
    </div>
  );
}

function CourseForm({ editing, onDone, teachers }) {
  const client = useClient();
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const detail = useGet(editing ? `/courses/${editing.id}` : '/courses/none', undefined, { enabled: Boolean(editing) }).data;

  useEffect(() => {
    if (!editing) {
      setForm(BLANK);
    } else if (detail) {
      setForm(fromCourse(detail));
    }
    setErrors({});
    setTab('basic');
  }, [editing?.id, detail?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useAction(
    () => {
      const body = {
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description || undefined,
        category: form.category,
        thumbnail: form.thumbnail || undefined,
        status: form.status,
        price: Number(form.price),
        mrp: form.mrp ? Number(form.mrp) : undefined,
        level: form.level,
        badge: form.badge,
        instructor: form.instructor || undefined,
        liveClassesCount: Number(form.liveClassesCount),
        settings: { certificate: form.certificate, accessDays: Number(form.accessDays) },
        modules: form.modules.filter((m) => m.title.trim()).map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.title.trim()) })),
      };
      return editing ? client.patch(`/courses/${editing.id}`, body) : client.post('/courses', body);
    },
    { success: editing ? 'Course updated' : 'Course created', invalidate: ['/courses', '/dashboard'], onSuccess: () => { setForm(BLANK); onDone?.(); } },
  );

  const submit = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Enter the course title';
    if (form.shortDescription.trim().length < 10) next.shortDescription = 'Add a short description (10+ characters)';
    if (!form.category) next.category = 'Select a category';
    if (form.price === '' || Number(form.price) < 0) next.price = 'Enter the course price';
    setErrors(next);
    if (Object.keys(next).length) return setTab(next.price ? 'settings' : 'basic');
    return save.run();
  };

  return (
    <SidePanel
      title={editing ? 'Edit course' : 'Create course'}
      tabs={<Tabs tabs={[{ key: 'basic', label: 'Basic Information' }, { key: 'content', label: 'Course Content' }, { key: 'settings', label: 'Settings' }]} value={tab} onChange={setTab} className="mt-2 !gap-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setForm(BLANK); onDone?.(); }}>Cancel</Button>
          <Button loading={save.loading} onClick={submit}>Save Course</Button>
        </>
      }
    >
      {tab === 'basic' && (
        <>
          <Field label="Course Title" required error={errors.title}><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter course title" /></Field>
          <Field label="Short Description" required error={errors.shortDescription}><Textarea value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Enter short description about this course" rows={3} /></Field>
          <Field label="Category" required error={errors.category}>
            <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <FileUpload label="Course Thumbnail" kind="image" value={form.thumbnail} onChange={(url) => set('thumbnail', url)} title="Upload Course Thumbnail" hint="JPG, PNG (Max 2MB)" required />
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
        </>
      )}
      {tab === 'content' && (
        <>
          <Field label="Detailed description"><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} placeholder="What will students learn?" /></Field>
          <ModulesEditor modules={form.modules} onChange={(modules) => set('modules', modules)} />
        </>
      )}
      {tab === 'settings' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)" required error={errors.price}><Input type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
            <Field label="MRP (₹)" hint="Shown as the striked price"><Input type="number" min={0} value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></Field>
          </div>
          <Field label="Level">
            <Select value={form.level} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select>
          </Field>
          <Field label="Badge">
            <Select value={form.badge} onChange={(e) => set('badge', e.target.value)}>{BADGES.map((b) => <option key={b} value={b}>{b || 'No badge'}</option>)}</Select>
          </Field>
          <Field label="Primary instructor">
            <Select value={form.instructor} onChange={(e) => set('instructor', e.target.value)}>
              <option value="">Select instructor</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Live classes (count)"><Input type="number" min={0} value={form.liveClassesCount} onChange={(e) => set('liveClassesCount', e.target.value)} /></Field>
            <Field label="Access (days)"><Input type="number" min={1} value={form.accessDays} onChange={(e) => set('accessDays', e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700"><Checkbox checked={form.certificate} onChange={(c) => set('certificate', c)} /> Issue completion certificate</label>
        </>
      )}
    </SidePanel>
  );
}

export default function Courses() {
  const client = useClient();
  const list = useListState({ category: 'all', status: 'all' });
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const summary = useGet('/courses/summary').data;
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/courses', list.params, { keepPrevious: true });

  const toggle = useAction((c) => client.patch(`/courses/${c.id}`, { status: c.status === 'published' ? 'draft' : 'published' }), { success: 'Course status updated', invalidate: ['/courses'] });
  const remove = useAction((c) => client.delete(`/courses/${c.id}`), { success: 'Course deleted', invalidate: ['/courses'], onSuccess: () => setDeleting(null), onError: () => setDeleting(null) });

  const columns = [
    indexColumn(meta),
    {
      key: 'course',
      header: 'Course Details',
      render: (c) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <CourseMark category={c.category} src={c.thumbnail} size={52} className="!rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-ink">{c.title}</p>
            <p className="line-clamp-2 text-xs text-slate-500">{c.shortDescription}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (c) => <ExpertiseTag value={c.category} /> },
    { key: 'lessons', header: 'Lessons', align: 'center', render: (c) => c.lessonsCount },
    { key: 'students', header: 'Students', align: 'center', render: (c) => c.enrolledCount },
    { key: 'price', header: 'Price', render: (c) => formatCurrency(c.price) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <IconButton icon={Eye} label="View details and students" onClick={() => setViewing(c)} />
          <IconButton icon={Pencil} label="Edit" onClick={() => { setEditing(c); setEditorOpen(true); }} />
          <RowMenu items={[{ label: c.status === 'published' ? 'Move to draft' : 'Publish', icon: CheckCircle2, onClick: () => toggle.run(c) }, { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(c) }]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Courses" subtitle="Courses, lessons and study materials." actions={<Button size="lg" icon={Plus} onClick={() => { setEditing(null); setEditorOpen(true); }}>Create New Course</Button>} />

      <StatGrid cols={4}>
        <StatCard icon={BookOpen} tone="blue" label="Total Courses" value={summary?.total.value ?? '—'} />
        <StatCard icon={CheckCircle2} tone="green" label="Published" value={summary?.published.value ?? '—'} />
        <StatCard icon={Clock} tone="orange" label="Drafts" value={summary?.drafts.value ?? '—'} />
        <StatCard icon={Users} tone="blue" label="Total Enrolled Students" value={summary?.enrolled.value ?? '—'} />
      </StatGrid>

      <div className="portal-workspace"><TableCard title="All Courses">
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search courses..." onReset={list.reset}>
            <FilterSelect value={list.filters.category} onChange={(v) => list.setFilter('category', v)} allLabel="All Categories" options={CATEGORY_OPTIONS} className="w-44" />
            <FilterSelect value={list.filters.status} onChange={(v) => list.setFilter('status', v)} allLabel="All Status" options={[{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} className="w-36" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={820} />
          <TableFooter meta={meta} noun="courses" onPage={list.setPage} />
        </TableCard></div>
<Drawer open={editorOpen} onClose={() => { setEditorOpen(false); setEditing(null); }} title={editing ? 'Edit course' : 'Create course'}><CourseForm editing={editing} teachers={teachers} onDone={() => { setEditorOpen(false); setEditing(null); }} /></Drawer>

      <CourseDetails course={viewing} onClose={() => setViewing(null)} onEdit={(c) => { setViewing(null); setEditing(c); setEditorOpen(true); }} onToggle={(c) => toggle.run(c)} />

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} loading={remove.loading} onConfirm={() => remove.run(deleting)} title="Delete course" confirmLabel="Delete" message={`Delete "${deleting?.title}"? Courses with enrolled students cannot be deleted - move them to draft instead.`} />
    </>
  );
}
