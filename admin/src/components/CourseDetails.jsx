import { useState } from 'react';
import { Award, BookOpen, CheckCircle2, Clock, FileText, GraduationCap, IndianRupee, Layers, PlayCircle, Radio, Search, Star, Users } from 'lucide-react';
import { Avatar, Badge, Button, CourseMark, ExpertiseTag, Modal, Spinner, StatusBadge, formatCurrency, formatDate, useGet } from './ui.jsx';

const Block = ({ icon: Icon, title, right, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2.5 text-[14px] font-bold text-ink"><Icon className="h-[18px] w-[18px] text-brand-600" />{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const Fact = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-0.5 break-words text-[13.5px] font-semibold text-ink">{value || <span className="font-normal text-slate-400">Not added</span>}</p>
  </div>
);

const Tile = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2 text-xs text-slate-500"><Icon className="h-4 w-4 text-brand-600" />{label}</div>
    <p className="mt-1.5 text-2xl font-extrabold text-ink">{value}</p>
  </div>
);

const LESSON_ICON = { video: PlayCircle, pdf: FileText, text: FileText };

function Progress({ value = 0 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, value)}%` }} /></div>
      <span className="text-xs tabular-nums text-slate-600">{value}%</span>
    </div>
  );
}

function StudentsTable({ students }) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const rows = term ? students.filter((s) => [s.student.name, s.student.email, s.student.phone, s.student.studentCode, s.batch?.name].some((v) => String(v || '').toLowerCase().includes(term))) : students;

  return (
    <>
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="field-input !h-10 pl-9" />
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{students.length ? 'No student matches your search.' : 'No students are enrolled in this course yet.'}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-50">
              <tr>{['Student', 'Contact', 'Batch', 'Progress', 'Status', 'Enrolled', 'Access until', 'Paid'].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.student.name} src={r.student.avatar} size={32} />
                      <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{r.student.name}</p><p className="text-xs text-slate-400">{r.student.studentCode}</p></div>
                    </div>
                  </td>
                  <td className="td"><p className="text-[13px]">{r.student.email}</p><p className="text-xs text-slate-400">{r.student.phone}</p></td>
                  <td className="td whitespace-nowrap">{r.batch?.name || <span className="text-slate-400">No batch</span>}</td>
                  <td className="td"><Progress value={r.progress} /></td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                  <td className="td whitespace-nowrap">{formatDate(r.enrolledAt)}<p className="text-xs text-slate-400">{r.source === 'payment' ? 'Bought online' : 'Added by admin'}</p></td>
                  <td className="td whitespace-nowrap">{r.accessEnd ? formatDate(r.accessEnd) : 'Lifetime'}</td>
                  <td className="td whitespace-nowrap font-semibold">{r.amountPaid ? formatCurrency(r.amountPaid) : <span className="font-normal text-slate-400">{r.source === 'admin' ? 'Free (admin)' : '-'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Opens from the eye icon on the Courses table: everything about the course and who is studying it.
export function CourseDetails({ course, onClose, onEdit, onToggle }) {
  const enabled = Boolean(course);
  const { data: c, isLoading } = useGet(enabled ? `/courses/${course.id}` : '/courses/none', undefined, { enabled });
  const { data: roster } = useGet(enabled ? `/courses/${course.id}/students` : '/courses/none/students', undefined, { enabled });
  const live = c || course;
  const published = live?.status === 'published';
  const modules = c?.modules || [];
  const summary = roster?.summary;

  return (
    <Modal
      open={enabled}
      onClose={onClose}
      size="xl"
      title="Course details"
      subtitle="Content, settings and every student enrolled in this course."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {c && <Button variant="outline" onClick={() => onToggle(c)}>{published ? 'Move to draft' : 'Publish course'}</Button>}
          {c && <Button onClick={() => onEdit(c)}>Edit course</Button>}
        </>
      }
    >
      {isLoading || !c ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5">
            <CourseMark category={c.category} src={c.thumbnail} size={84} className="!rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-ink">{c.title}</h2>
                <StatusBadge status={c.status} />
                {c.badge && <Badge tone="amber">{c.badge}</Badge>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500"><ExpertiseTag value={c.category} /><span>{c.level}</span><span>&middot;</span><span>{c.language}</span></div>
              <p className="mt-2 text-sm text-slate-600">{c.shortDescription}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-ink">{formatCurrency(c.price)}</p>
              {c.mrp > c.price && <p className="text-xs text-slate-400"><span className="line-through">{formatCurrency(c.mrp)}</span> &middot; {c.discountPercent}% off</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Tile icon={Users} label="Students enrolled" value={summary?.enrolled ?? c.enrolledCount ?? 0} />
            <Tile icon={CheckCircle2} label="Active" value={summary?.active ?? '-'} />
            <Tile icon={GraduationCap} label="Completed" value={summary?.completed ?? '-'} />
            <Tile icon={Layers} label="Average progress" value={summary ? `${summary.averageProgress}%` : '-'} />
            <Tile icon={IndianRupee} label="Revenue" value={summary ? formatCurrency(summary.revenue ?? 0) : '-'} />
          </div>

          <Block icon={BookOpen} title="Course information">
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Main instructor" value={c.instructor?.name} />
              <Fact label="All teachers" value={(c.teachers || []).map((t) => t.name).join(', ')} />
              <Fact label="Lessons" value={`${c.lessonsCount} in ${modules.length} module${modules.length === 1 ? '' : 's'}`} />
              <Fact label="Live classes" value={c.liveClassesCount} />
              <Fact label="Access period" value={c.settings?.accessDays ? `${c.settings.accessDays} days` : 'Lifetime'} />
              <Fact label="Certificate" value={c.settings?.certificate ? 'Issued on completion' : 'Not issued'} />
              <Fact label="Rating" value={c.ratingCount ? `${c.rating} (${c.ratingCount} reviews)` : 'No reviews yet'} />
              <Fact label="Created" value={formatDate(c.createdAt)} />
            </div>
            {c.description && <p className="mt-5 whitespace-pre-line border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600">{c.description}</p>}
          </Block>

          <Block icon={Layers} title={`Curriculum (${c.lessonsCount} lessons)`}>
            {modules.length === 0 ? (
              <p className="text-sm text-slate-400">No modules added yet.</p>
            ) : (
              <div className="space-y-3">
                {modules.map((m, i) => (
                  <div key={m.id || i} className="rounded-xl border border-slate-200">
                    <p className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-[13px] font-bold text-ink"><span>{i + 1}. {m.title}</span><span className="text-xs font-normal text-slate-500">{m.lessons.length} lessons</span></p>
                    <ul className="divide-y divide-slate-100">
                      {m.lessons.map((l, li) => {
                        const Icon = LESSON_ICON[l.type] || PlayCircle;
                        return (
                          <li key={l.id || li} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700">
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                            {l.isPreview && <Badge tone="green">Free preview</Badge>}
                            {!l.url && l.type === 'video' && <Badge tone="amber">No video</Badge>}
                            <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" />{l.durationMin} min</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Block>

          <Block icon={Users} title={`Enrolled students (${summary?.enrolled ?? 0})`} right={summary && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Radio className="h-3.5 w-3.5" />{summary.active} active &middot; {summary.completed} completed &middot; {summary.inactive} inactive</span>}>
            {roster ? <StudentsTable students={roster.students} /> : <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>}
          </Block>
        </div>
      )}
    </Modal>
  );
}
