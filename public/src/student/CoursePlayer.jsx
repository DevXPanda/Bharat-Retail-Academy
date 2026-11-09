import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, FileText, PlayCircle, Star } from 'lucide-react';
import { Button, Card, ErrorState, Field, Modal, PageLoader, ProgressBar, Tabs, Textarea, cx, formatDate, progressTone, useAction, useClient, useGet, StatusBadge } from './ui.js';

function ReviewModal({ open, onClose, courseId, existing }) {
  const client = useClient();
  const [rating, setRating] = useState(existing?.rating || 5);
  const [comment, setComment] = useState(existing?.comment || '');
  const save = useAction(() => client.post(`/courses/${courseId}/reviews`, { rating, comment: comment || undefined }), { success: 'Thanks for your feedback!', invalidate: ['/learning', '/public'], onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Rate this course" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.loading} onClick={() => save.run()}>Submit</Button></>}>
      <div className="space-y-4">
        <div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)}><Star className={cx('h-9 w-9', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} /></button>)}</div>
        <Field label="Your review (optional)"><Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like about this course?" /></Field>
      </div>
    </Modal>
  );
}

function Assignments({ courseId }) {
  const client = useClient();
  const { data = [] } = useGet('/assignments', { course: courseId });
  const [note, setNote] = useState({});
  const submit = useAction((id) => client.post(`/assignments/${id}/submit`, { note: note[id] || 'Submitted' }), { success: 'Assignment submitted', invalidate: ['/assignments'] });
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">No assignments for this course yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {data.map((a) => (
        <li key={a.id} className="space-y-3 py-5 first:pt-0">
          <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[15px] font-bold text-ink"><FileText className="h-4 w-4 text-brand-600" />{a.title}</p>{a.description && <p className="mt-1 text-sm text-slate-600">{a.description}</p>}{a.dueDate && <p className="mt-1 text-xs text-slate-400">Due {formatDate(a.dueDate)}</p>}</div><StatusBadge status={a.mySubmission ? 'completed' : a.status} label={a.mySubmission ? 'Submitted' : undefined} /></div>
          {a.status === 'active' && (
            <div className="flex gap-3"><input value={note[a.id] ?? a.mySubmission?.note ?? ''} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} placeholder="Add a note or paste a link to your work" className="field-input" /><Button loading={submit.loading} onClick={() => submit.run(a.id)}>{a.mySubmission ? 'Resubmit' : 'Submit'}</Button></div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CoursePlayer() {
  const { courseId } = useParams();
  const client = useClient();
  const { data, isLoading, error, refetch } = useGet(`/learning/courses/${courseId}`);
  const [tab, setTab] = useState('lessons');
  const [current, setCurrent] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const lessons = useMemo(() => (data ? data.course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.title }))) : []), [data]);
  useEffect(() => {
    if (!data || current) return;
    const done = new Set(data.enrollment.completedLessons);
    setCurrent((lessons.find((l) => !done.has(l.id)) || lessons[0])?.id || null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useAction((lessonId, completed) => client.post(`/learning/courses/${courseId}/progress`, { lessonId, completed }), { invalidate: [`/learning`] });

  if (isLoading) return <PageLoader />;
  if (error) return <div className="py-16"><ErrorState message={error} onRetry={refetch} /><p className="text-center"><Link to="/app/courses" className="text-sm font-semibold text-brand-600">← Back to my courses</Link></p></div>;

  const { course, enrollment, myReview } = data;
  const done = new Set(enrollment.completedLessons);
  const lesson = lessons.find((l) => l.id === current);
  const index = lessons.findIndex((l) => l.id === current);
  const next = lessons[index + 1];

  return (
    <>
      <Link to="/app/courses" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />My courses</Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-[26px] font-extrabold leading-tight text-ink">{course.title}</h1><p className="mt-1 text-sm text-slate-500">{course.instructor?.name}</p></div>
        <div className="flex items-center gap-4"><div className="w-48"><p className="mb-1 text-xs font-semibold text-slate-600">Progress · {enrollment.progress}%</p><ProgressBar value={enrollment.progress} tone={progressTone(enrollment.progress)} /></div><Button variant="outline" icon={Star} onClick={() => setReviewing(true)}>{myReview ? 'Edit review' : 'Rate course'}</Button></div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card overflow-hidden">
          <div className="aspect-video bg-black">
            {lesson?.url ? <video key={lesson.id} src={lesson.url} controls className="h-full w-full" onEnded={() => !done.has(lesson.id) && toggle.run(lesson.id, true)} /> : <div className="flex h-full items-center justify-center text-slate-400">Select a lesson to start</div>}
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{lesson?.module}</p><h2 className="text-lg font-extrabold text-ink">{lesson?.title}</h2></div>
              <div className="flex gap-2">
                {lesson && <Button variant={done.has(lesson.id) ? 'secondary' : 'primary'} icon={Check} loading={toggle.loading} onClick={() => toggle.run(lesson.id, !done.has(lesson.id))}>{done.has(lesson.id) ? 'Completed' : 'Mark complete'}</Button>}
                {next && <Button variant="outline" onClick={() => setCurrent(next.id)}>Next lesson</Button>}
              </div>
            </div>
          </div>
          <Tabs tabs={[{ key: 'lessons', label: 'About' }, { key: 'assignments', label: 'Assignments' }]} value={tab} onChange={setTab} className="border-t" />
          <div className="p-5">{tab === 'lessons' ? <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{course.description || course.shortDescription}</p> : <Assignments courseId={courseId} />}</div>
        </div>

        <Card title="Course content" bodyClassName="!p-0">
          <div className="mt-3 max-h-[640px] divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
            {course.modules.map((m, mi) => (
              <details key={m.id} open={mi === 0 || m.lessons.some((l) => l.id === current)} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-ink hover:bg-slate-50"><ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />{m.title}<span className="ml-auto text-xs font-normal text-slate-400">{m.lessons.filter((l) => done.has(l.id)).length}/{m.lessons.length}</span></summary>
                <ul>{m.lessons.map((l) => (
                  <li key={l.id}><button type="button" onClick={() => setCurrent(l.id)} className={cx('flex w-full items-center gap-3 px-5 py-3 text-left text-[13px] hover:bg-slate-50', l.id === current && 'bg-brand-50')}>
                    <span className={cx('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', done.has(l.id) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300')}>{done.has(l.id) && <Check className="h-3 w-3" />}</span>
                    <span className="flex-1">{l.title}</span><span className="flex items-center gap-1 text-xs text-slate-400"><PlayCircle className="h-3.5 w-3.5" />{l.durationMin}m</span>
                  </button></li>
                ))}</ul>
              </details>
            ))}
          </div>
        </Card>
      </div>
      <ReviewModal open={reviewing} onClose={() => setReviewing(false)} courseId={courseId} existing={myReview} />
    </>
  );
}
