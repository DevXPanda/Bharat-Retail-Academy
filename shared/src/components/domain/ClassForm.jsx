import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Link2, Users } from 'lucide-react';
import { useClient } from '../../context/AppProviders.jsx';
import { useAction, useGet } from '../../hooks/index.js';
import { combineDateTime, toInputDate, toInputTime } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Select, Switch, Textarea } from '../ui/Form.jsx';
import { Tabs } from '../data/Filters.jsx';

const DURATIONS = [30, 45, 60, 90, 120, 180];
const PLATFORMS = [
  { value: 'jitsi', label: 'In-app Live Classroom' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
];

const blank = () => ({
  title: '',
  topic: '',
  course: '',
  teacher: '',
  batch: '',
  date: toInputDate(new Date(Date.now() + 86400000)),
  time: '16:00',
  durationMin: 60,
  maxStudents: 100,
  platform: 'jitsi',
  meetingLink: '',
  description: '',
  notifyStudents: true,
  isFreeDemo: false,
});

const fromClass = (c) => ({
  title: c.title,
  topic: c.topic || '',
  course: c.course?.id || c.course,
  teacher: c.teacher?.id || c.teacher,
  batch: c.batch?.id || '',
  date: toInputDate(c.startsAt),
  time: toInputTime(c.startsAt),
  durationMin: c.durationMin,
  maxStudents: c.maxStudents,
  platform: c.platform,
  meetingLink: c.meetingLink || '',
  description: c.description || '',
  notifyStudents: true,
  isFreeDemo: Boolean(c.isFreeDemo),
});

export function ClassForm({ role, initial, onSaved, onCancel, submitLabel }) {
  const client = useClient();
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState(() => (initial ? fromClass(initial) : blank()));
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const editing = Boolean(initial);

  useEffect(() => setForm(initial ? fromClass(initial) : blank()), [initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const courses = useGet('/courses/options').data || [];
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }, { enabled: role === 'admin' }).data || [];
  const batches = useGet('/batches/options', { course: form.course }, { enabled: Boolean(form.course) }).data || [];

  const courseTeachers = useMemo(() => teachers, [teachers]);

  const save = useAction(
    () => {
      const body = {
        title: form.title.trim(),
        topic: form.topic.trim() || undefined,
        course: form.course,
        batch: form.batch || (editing ? null : undefined),
        startsAt: combineDateTime(form.date, form.time),
        durationMin: Number(form.durationMin),
        maxStudents: Number(form.maxStudents),
        platform: form.platform,
        meetingLink: form.platform === 'jitsi' ? '' : form.meetingLink.trim(),
        description: form.description.trim() || undefined,
        isFreeDemo: form.isFreeDemo,
      };
      if (role === 'admin') body.teacher = form.teacher;
      if (editing) return client.patch(`/live-classes/${initial.id}`, body);
      return client.post('/live-classes', { ...body, notifyStudents: form.notifyStudents });
    },
    { success: editing ? 'Class updated' : 'Class scheduled', invalidate: ['/live-classes', '/dashboard'], onSuccess: ({ data }) => onSaved?.(data) },
  );

  const submit = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Enter a class title';
    if (!form.course) next.course = 'Select a course';
    if (role === 'admin' && !form.teacher) next.teacher = 'Select a teacher';
    if (!form.date || !form.time) next.date = 'Pick a date and time';
    if (form.platform !== 'jitsi' && !/^https?:\/\//.test(form.meetingLink)) next.meetingLink = 'Enter a valid meeting link';
    setErrors(next);
    if (Object.keys(next).length) return setTab('basic');
    return save.run();
  };

  return (
    <div>
      <Tabs
        tabs={[{ key: 'basic', label: 'Basic Information' }, { key: 'settings', label: 'Class Settings' }, { key: 'notify', label: 'Notifications' }]}
        value={tab}
        onChange={setTab}
        className="-mx-5 mb-4 !gap-5"
      />
      <div className="space-y-4">
        {tab === 'basic' && (
          <>
            <Field label="Class Title" required error={errors.title}>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Enter class title" />
            </Field>
            <div className={role === 'admin' ? 'grid gap-4 sm:grid-cols-2' : ''}>
              <Field label="Select Course" required error={errors.course}>
                <Select value={form.course} onChange={(e) => { set('course', e.target.value); set('batch', ''); }}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </Field>
              {role === 'admin' && (
                <Field label="Select Teacher" required error={errors.teacher}>
                  <Select value={form.teacher} onChange={(e) => set('teacher', e.target.value)}>
                    <option value="">Select teacher</option>
                    {courseTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </Field>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" required error={errors.date}>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="pl-9" />
                </div>
              </Field>
              <Field label="Time" required>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} className="pl-9" />
                </div>
              </Field>
              <Field label="Duration" required>
                <Select value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d >= 60 ? `${d / 60} Hour${d > 60 ? 's' : ''}` : `${d} Min`}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max Students" required>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input type="number" min={1} value={form.maxStudents} onChange={(e) => set('maxStudents', e.target.value)} className="pl-9" />
                </div>
              </Field>
              <Field label="Meeting Platform" required>
                <Select value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Meeting Link" error={errors.meetingLink} hint={form.platform === 'jitsi' ? 'Auto generated - students join inside the platform.' : undefined}>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={form.meetingLink} disabled={form.platform === 'jitsi'} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://" className="pl-9" />
              </div>
            </Field>
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Add class description, topics to be covered..." />
            </Field>
          </>
        )}
        {tab === 'settings' && (
          <>
            <Field label="Topic">
              <Input value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. Product Listing Best Practices" />
            </Field>
            <Field label="Batch" hint="Leave empty to open the class to every enrolled student of the course.">
              <Select value={form.batch} onChange={(e) => set('batch', e.target.value)} disabled={!form.course}>
                <option value="">All students of the course</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <div className="rounded-xl bg-slate-50 p-4">
              <Switch checked={form.isFreeDemo} onChange={(v) => set('isFreeDemo', v)} label="Free demo class" />
              <p className="mt-2 text-xs text-slate-500">When on, any student with an account can join through the shared link without buying the course. When off, only enrolled students can join.</p>
            </div>
          </>
        )}
        {tab === 'notify' && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <Switch checked={form.notifyStudents} onChange={(v) => set('notifyStudents', v)} label="Notify enrolled students" />
            <p className="text-xs text-slate-500">Students get an in-app notification when the class is scheduled, when it goes live and if it is cancelled.</p>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button onClick={submit} loading={save.loading}>{submitLabel || (editing ? 'Save Changes' : 'Schedule Class')}</Button>
      </div>
    </div>
  );
}
