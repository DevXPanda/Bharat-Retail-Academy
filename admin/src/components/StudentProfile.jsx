import { useEffect, useState } from 'react';
import { Award, BookOpen, ClipboardList, Download, Headset, KeyRound, Pencil, Star } from 'lucide-react';
import { Avatar, Button, Modal, ProgressBar, Spinner, StatusBadge, Tabs, formatCurrency, formatDate, formatDateTime, formatDuration, progressTone, timeAgo, useAction, useClient, useGet } from './ui.jsx';
import { Block as ActivityBlock, ClassChat, Empty as EmptyNote, LessonProgress, Messages, SignIns } from './ActivityBlocks.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'courses', label: 'Courses' },
  { key: 'payments', label: 'Payments' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'messages', label: 'Messages & chat' },
  { key: 'activity', label: 'Activity' },
];

const Block = ({ icon: Icon, title, children, action }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2.5 text-[14px] font-bold text-ink">{Icon && <Icon className="h-[18px] w-[18px] text-brand-600" />}{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const Field = ({ label, value, wide }) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-0.5 break-words text-[13.5px] font-semibold text-ink">{value || <span className="font-normal text-slate-400">Not added</span>}</p>
  </div>
);

const Empty = ({ children }) => <p className="py-2 text-sm text-slate-400">{children}</p>;

const SOURCE = { payment: 'Purchased', admin: 'Added by admin' };

export function StudentProfile({ student, onClose, onEdit, onManageCourses }) {
  const client = useClient();
  const [tab, setTab] = useState('overview');
  const { data: s, isLoading } = useGet(student ? `/students/${student.id}` : '/students/none', undefined, { enabled: Boolean(student) });
  const invoice = useAction((p) => client.download(`/payments/${p.id}/invoice`, `invoice-${p.invoiceNumber || p.id}.pdf`), { success: 'Invoice downloaded' });

  useEffect(() => setTab('overview'), [student?.id]);

  const activity = s?.activity;
  const enrollments = s?.enrollments || [];
  const avgProgress = enrollments.length ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length) : 0;
  const paid = (activity?.payments || []).filter((p) => ['successful', 'refunded'].includes(p.status));
  const spent = paid.reduce((sum, p) => sum + (p.amount || 0) - (p.refund?.amount || 0), 0);
  const records = activity?.attendanceRecords || [];
  const present = records.filter((r) => ['present', 'late'].includes(r.status)).length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const rate = s?.attendance?.total ? Math.round((s.attendance.attended / s.attendance.total) * 100) : null;

  return (
    <Modal
      open={Boolean(student)}
      onClose={onClose}
      size="xl"
      title="Student profile"
      subtitle="Profile, courses, payments, attendance and activity in one place."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {s && <Button variant="outline" icon={BookOpen} onClick={() => onManageCourses(s)}>Manage courses</Button>}
          {s && <Button icon={Pencil} onClick={() => onEdit(s)}>Edit student</Button>}
        </>
      }
    >
      {isLoading || !s ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5">
            <Avatar name={s.name} src={s.avatar} size={84} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5"><h2 className="text-xl font-extrabold text-ink">{s.name}</h2><StatusBadge status={s.status} /></div>
              <p className="mt-1 text-sm text-slate-500">{s.studentCode} · Joined {formatDate(s.createdAt)}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{s.email}</span>{s.phone && <span>{s.phone}</span>}{s.location && <span>{s.location}</span>}</div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
              {[['Courses', enrollments.length], ['Avg progress', `${avgProgress}%`], ['Attendance', rate === null ? '—' : `${rate}%`], ['Total paid', formatCurrency(spent)]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-4 py-3 text-center"><p className="text-lg font-extrabold text-ink">{v}</p><p className="text-[11px] text-slate-500">{k}</p></div>
              ))}
            </div>
          </div>

          <Tabs tabs={TABS} value={tab} onChange={setTab} />

          {tab === 'overview' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Block title="Personal information">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={s.name} />
                  <Field label="Email address" value={s.email} />
                  <Field label="Mobile number" value={s.phone} />
                  <Field label="Date of birth" value={s.dob && formatDate(s.dob)} />
                  <Field label="Gender" value={s.gender} />
                  <Field label="Location" value={s.location} />
                  <Field label="About" value={s.about} wide />
                </div>
              </Block>
              <Block title="Account">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Student ID" value={s.studentCode} />
                  <Field label="Status" value={<StatusBadge status={s.status} />} />
                  <Field label="Joined" value={formatDateTime(s.createdAt)} />
                  <Field label="Last active" value={s.lastActiveAt ? timeAgo(s.lastActiveAt) : 'Never'} />
                  <Field label="Classes attended" value={s.attendance?.total ? `${s.attendance.attended} of ${s.attendance.total}` : 'No classes yet'} />
                  <Field label="Certificates earned" value={String(activity?.certificates.length ?? 0)} />
                </div>
                {s.mustChangePassword && <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-700"><KeyRound className="h-4 w-4" />Still using the temporary password shared by the admin.</p>}
              </Block>
              <div className="lg:col-span-2"><SignIns rows={activity.logins} /></div>
            </div>
          )}

          {tab === 'courses' && (
            <Block icon={BookOpen} title={`Enrolled courses (${enrollments.length})`}>
              {enrollments.length === 0 ? <Empty>Not enrolled in any course yet.</Empty> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 font-semibold">Course</th><th className="pb-2 font-semibold">Batch</th><th className="pb-2 font-semibold">Progress</th><th className="pb-2 font-semibold">Access</th><th className="pb-2 font-semibold">How</th><th className="pb-2 font-semibold">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrollments.map((e) => (
                      <tr key={e.id}>
                        <td className="py-3 pr-3 font-semibold text-ink">{e.course?.title}</td>
                        <td className="py-3 pr-3 text-slate-600">{e.batch?.name || '—'}</td>
                        <td className="py-3 pr-3"><div className="flex min-w-[110px] items-center gap-2"><ProgressBar value={e.progress} tone={progressTone(e.progress)} /><span className="w-9 text-xs text-slate-600">{e.progress}%</span></div></td>
                        <td className="whitespace-nowrap py-3 pr-3 text-xs text-slate-600">{formatDate(e.accessStart)} → {e.accessEnd ? formatDate(e.accessEnd) : 'No expiry'}</td>
                        <td className="py-3 pr-3 text-xs text-slate-600">{SOURCE[e.source] || e.source}{e.completedAt && <span className="block text-emerald-600">Completed {formatDate(e.completedAt)}</span>}</td>
                        <td className="py-3"><StatusBadge status={e.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
              {activity.lessons.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-bold text-ink">Lesson by lesson</h4>
                  {activity.lessons.map((l) => (
                    <details key={l.enrollmentId} className="group rounded-xl border border-slate-200 px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                        <span>{l.course}</span>
                        <span className="text-xs font-normal text-slate-500">{l.modules.reduce((n, m) => n + m.lessons.filter((x) => x.completed).length, 0)} / {l.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons · click to open</span>
                      </summary>
                      <LessonProgress lessons={l} />
                    </details>
                  ))}
                </div>
              )}
            </Block>
          )}

          {tab === 'payments' && (
            <Block title={`Payments (${activity.payments.length})`}>
              {activity.payments.length === 0 ? <Empty>No payments yet.</Empty> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
                  <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 font-semibold">Course</th><th className="pb-2 font-semibold">Amount</th><th className="pb-2 font-semibold">GST</th><th className="pb-2 font-semibold">Method</th><th className="pb-2 font-semibold">Transaction</th><th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold">Invoice</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {activity.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-3 font-semibold text-ink">{p.course?.title}</td>
                        <td className="py-3 pr-3 font-semibold">{formatCurrency(p.amount)}{p.refund?.amount ? <span className="block text-xs font-normal text-violet-600">Refunded {formatCurrency(p.refund.amount)}</span> : null}</td>
                        <td className="py-3 pr-3 text-slate-600">{p.gstAmount ? `${formatCurrency(p.gstAmount)} (${p.gstPercent}%)` : '—'}</td>
                        <td className="py-3 pr-3 text-slate-600">{p.method}</td>
                        <td className="py-3 pr-3 font-mono text-xs text-slate-500">{p.transactionId || p.razorpayOrderId || '—'}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-xs text-slate-600">{formatDateTime(p.paidAt || p.createdAt)}</td>
                        <td className="py-3 pr-3"><StatusBadge status={p.status} /></td>
                        <td className="py-3">{['successful', 'refunded'].includes(p.status) && p.amount > 0 ? <Button size="sm" variant="outline" icon={Download} loading={invoice.loading} onClick={() => invoice.run(p)}>PDF</Button> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Block>
          )}

          {tab === 'attendance' && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                {[['Classes attended', s.attendance?.attended ?? 0], ['Total classes', s.attendance?.total ?? 0], ['Absent (recent)', absent], ['Attendance rate', rate === null ? '—' : `${rate}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">{k}</p><p className="mt-0.5 text-xl font-extrabold text-ink">{v}</p></div>
                ))}
              </div>
              <Block title="Recent classes">
                {records.length === 0 ? <Empty>No class attendance recorded yet.</Empty> : (
                  <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
                    <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 font-semibold">Class</th><th className="pb-2 font-semibold">Teacher</th><th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Joined</th><th className="pb-2 font-semibold">Time in class</th><th className="pb-2 font-semibold">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 pr-3"><p className="font-semibold text-ink">{r.liveClass.title}{r.liveClass.isFreeDemo && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">FREE DEMO</span>}</p><p className="text-xs text-slate-500">{r.liveClass.course?.title}</p></td>
                          <td className="py-3 pr-3 text-slate-600">{r.liveClass.teacher?.name || '—'}</td>
                          <td className="whitespace-nowrap py-3 pr-3 text-xs text-slate-600">{formatDate(r.liveClass.startsAt)}</td>
                          <td className="whitespace-nowrap py-3 pr-3 text-xs text-slate-600">{r.joinTime ? formatDateTime(r.joinTime) : '—'}</td>
                          <td className="py-3 pr-3 text-slate-600">{r.durationMin ? formatDuration(r.durationMin) : '—'}</td>
                          <td className="py-3"><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
                {present > 0 && <p className="mt-3 text-xs text-slate-400">Showing the latest {records.length} records.</p>}
              </Block>
            </>
          )}

          {tab === 'messages' && (
            <div className="space-y-5">
              <Messages ownerId={s.id} kind="students" rows={activity.conversations} />
              <ClassChat rows={activity.classChat} />
            </div>
          )}

          {tab === 'activity' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Block icon={Award} title={`Certificates (${activity.certificates.length})`}>
                {activity.certificates.length === 0 ? <Empty>No certificates yet.</Empty> : (
                  <ul className="divide-y divide-slate-100">{activity.certificates.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{c.course?.title}</p><p className="font-mono text-xs text-slate-500">{c.certificateId} · {formatDate(c.completionDate)}</p></div><StatusBadge status={c.status} /></li>)}</ul>
                )}
              </Block>
              <Block icon={ClipboardList} title={`Assignments (${activity.assignments.filter((a) => a.submitted).length} of ${activity.assignments.length} submitted)`}>
                {activity.assignments.length === 0 ? <Empty>No assignments for this student's courses.</Empty> : (
                  <ul className="divide-y divide-slate-100">
                    {activity.assignments.map((a) => (
                      <li key={a.id} className="py-2.5 text-sm">
                        <details>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <span className="min-w-0"><span className="block truncate font-semibold text-ink">{a.title}</span><span className="block text-xs text-slate-500">{a.course}{a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ''}{a.submittedAt ? ` · submitted ${formatDate(a.submittedAt)}` : ''}</span></span>
                            <StatusBadge status={a.submitted ? 'completed' : a.status === 'closed' ? 'closed' : 'pending'} label={a.submitted ? 'Submitted' : a.status === 'closed' ? 'Missed' : 'Pending'} />
                          </summary>
                          <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                            {a.description && <p className="text-slate-500"><span className="font-semibold text-slate-600">Task: </span>{a.description}</p>}
                            {a.submitted ? (<><p className="text-slate-700"><span className="font-semibold">Student's answer: </span>{a.note || 'No written note'}</p>{a.fileUrl ? <a href={a.fileUrl} target="_blank" rel="noreferrer" className="inline-block font-semibold text-brand-600 hover:underline">Open submitted file</a> : <p className="text-slate-400">No file attached.</p>}</>) : <p className="text-slate-400">Nothing submitted yet.</p>}
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
              <Block icon={Headset} title={`Support tickets (${activity.tickets.length})`}>
                {activity.tickets.length === 0 ? <Empty>No support tickets.</Empty> : (
                  <ul className="divide-y divide-slate-100">{activity.tickets.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">#{t.ticketNumber} · {t.subject}</p><p className="text-xs text-slate-500">{formatDate(t.lastReplyAt)}</p></div><StatusBadge status={t.status} /></li>)}</ul>
                )}
              </Block>
              <ActivityBlock title={`Recordings watched (${activity.recordingViews.length})`}>
                {activity.recordingViews.length === 0 ? <EmptyNote>No recordings opened yet. Tracking started recently, so older views are not listed.</EmptyNote> : (
                  <ul className="divide-y divide-slate-100">{activity.recordingViews.map((v) => <li key={v.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{v.title}</p><p className="text-xs text-slate-500">{v.course} · last watched {formatDate(v.lastViewedAt)}</p></div><span className="whitespace-nowrap text-xs font-semibold text-slate-600">{v.count}x opened</span></li>)}</ul>
                )}
              </ActivityBlock>
              <ActivityBlock title={`Free previews & demo classes (${activity.previews.length + records.filter((r) => r.liveClass.isFreeDemo).length})`}>
                {activity.previews.length + records.filter((r) => r.liveClass.isFreeDemo).length === 0 ? <EmptyNote>Has not tried a free preview or a free demo class.</EmptyNote> : (
                  <ul className="divide-y divide-slate-100">
                    {activity.previews.map((x) => <li key={x.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{x.classTitle}</p><p className="text-xs text-slate-500">{x.course} · 60-second preview on {formatDateTime(x.startedAt)}</p></div><StatusBadge status="pending" label="Preview" /></li>)}
                    {records.filter((r) => r.liveClass.isFreeDemo).map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{r.liveClass.title}</p><p className="text-xs text-slate-500">{r.liveClass.course?.title} · free demo on {formatDate(r.liveClass.startsAt)}</p></div><StatusBadge status="active" label="Free demo" /></li>)}
                  </ul>
                )}
              </ActivityBlock>
              <Block icon={Star} title={`Reviews (${activity.reviews.length})`}>
                {activity.reviews.length === 0 ? <Empty>No reviews written.</Empty> : (
                  <ul className="space-y-3">{activity.reviews.map((r) => <li key={r.id} className="text-sm"><p className="flex items-center justify-between gap-3 font-semibold text-ink"><span className="truncate">{r.course?.title}</span><span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></p>{r.comment && <p className="mt-0.5 text-slate-600">{r.comment}</p>}</li>)}</ul>
                )}
              </Block>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
