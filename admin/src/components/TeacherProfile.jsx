import { Briefcase, Building2, CalendarClock, CheckCircle2, Clock, Globe, GraduationCap, KeyRound, Link2, Pencil, ShieldCheck, Sparkles, User, XCircle } from 'lucide-react';
import { Avatar, Badge, Button, ExpertiseTag, Modal, Spinner, StatusBadge, formatCurrency, formatDate, timeAgo, useGet } from './ui.jsx';
import { Block as ActivityBlock, ClassChat, Empty as EmptyNote, Messages, SignIns } from './ActivityBlocks.jsx';

const PERMISSION_LABELS = {
  scheduleClasses: 'Schedule live classes',
  uploadRecordings: 'Upload recordings',
  messageStudents: 'Message students',
  viewEarnings: 'View earnings',
};

const Block = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h3 className="mb-4 flex items-center gap-2.5 text-[14px] font-bold text-ink"><Icon className="h-[18px] w-[18px] text-brand-600" />{title}</h3>
    {children}
  </section>
);

const Field = ({ label, value, wide }) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-0.5 break-words text-[13.5px] font-semibold text-ink">{value || <span className="font-normal text-slate-400">Not added</span>}</p>
  </div>
);

const Empty = ({ children }) => <p className="text-sm text-slate-400">{children}</p>;

export function TeacherProfile({ teacher, onClose, onEdit }) {
  const { data: t, isLoading } = useGet(teacher ? `/teachers/${teacher.id}` : '/teachers/none', undefined, { enabled: Boolean(teacher) });
  const profile = t?.teacher || {};
  const bank = profile.bank || {};
  const permissions = Object.entries(PERMISSION_LABELS).map(([key, label]) => [label, profile.permissions?.[key] !== false]);

  return (
    <Modal
      open={Boolean(teacher)}
      onClose={onClose}
      size="xl"
      title="Teacher profile"
      subtitle="Everything the teacher has on file, as they see it in their portal."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {t && <Button icon={Pencil} onClick={() => onEdit(t)}>Edit teacher</Button>}
        </>
      }
    >
      {isLoading || !t ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5">
            <Avatar name={t.name} src={t.avatar} size={84} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-ink">{t.name}</h2>
                <StatusBadge status={t.status} />
                {bank.verified && <StatusBadge status="verified" label="Bank verified" />}
              </div>
              <p className="mt-0.5 font-medium text-slate-600">{profile.designation || 'E-Commerce Expert'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <ExpertiseTag value={profile.expertise} />
                <span>{t.email}</span>
                {t.phone && <span>{t.phone}</span>}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Experience', `${profile.experienceYears ?? 0}+ yrs`], ['Students', t.stats.students], ['Classes done', t.stats.completedClasses], ['Rating', t.stats.rating ? `${t.stats.rating} ★` : '—'], ['Total earned', formatCurrency(t.stats.totalEarned)], ['Paid out', formatCurrency(t.stats.totalPaid)], ['Payout pending', formatCurrency(t.stats.pendingPayout)], ['Recordings', t.stats.recordings]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-4 py-3 text-center"><p className="text-lg font-extrabold text-ink">{v}</p><p className="text-[11px] text-slate-500">{k}</p></div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Block icon={User} title="Personal information">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={t.name} />
                <Field label="Email address" value={t.email} />
                <Field label="Mobile number" value={t.phone} />
                <Field label="Date of birth" value={t.dob && formatDate(t.dob)} />
                <Field label="Gender" value={t.gender} />
                <Field label="Location" value={t.location} />
                <Field label="About" value={t.about} wide />
              </div>
            </Block>

            <Block icon={Briefcase} title="Professional details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Designation" value={profile.designation} />
                <Field label="Experience" value={`${profile.experienceYears ?? 0}+ years`} />
                <Field label="Company / business" value={profile.company} />
                <Field label="Teaching languages" value={(profile.languages || []).join(', ')} />
                <Field label="Short bio" value={profile.bio} wide />
                <Field label="Work experience" value={profile.workExperience} wide />
              </div>
            </Block>

            <Block icon={GraduationCap} title="Education & certifications">
              {!(profile.education?.length || profile.certifications?.length) ? <Empty>No education or certifications added.</Empty> : (
                <div className="space-y-4">
                  {(profile.education || []).map((e, i) => <div key={`e${i}`}><p className="text-[13.5px] font-semibold text-ink">{e.title}</p><p className="text-xs text-slate-500">{[e.institute, e.year].filter(Boolean).join(' | ')}</p></div>)}
                  {(profile.certifications || []).map((c, i) => <div key={`c${i}`} className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" /><div><p className="text-[13.5px] font-semibold text-ink">{c.title}</p><p className="text-xs text-slate-500">{[c.issuer, c.year].filter(Boolean).join(' | ')}</p></div></div>)}
                </div>
              )}
            </Block>

            <Block icon={Sparkles} title="Specialization & skills">
              {(profile.skills || []).length === 0 ? <Empty>No skills added.</Empty> : <div className="flex flex-wrap gap-2">{profile.skills.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</div>}
            </Block>

            <Block icon={Building2} title="Bank & payout details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account holder" value={bank.holderName} />
                <Field label="Bank name" value={bank.bankName} />
                <Field label="Account number" value={bank.accountNumber} />
                <Field label="IFSC code" value={bank.ifsc} />
                <Field label="Account type" value={bank.accountType} />
                <Field label="UPI ID" value={bank.upiId} />
                <Field label="Payout per class" value={formatCurrency(profile.ratePerClass)} />
              </div>
              <p className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${bank.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {bank.verified ? <><CheckCircle2 className="h-4 w-4" />Bank details verified. Payouts can be released.</> : <><XCircle className="h-4 w-4" />Bank details not verified yet. Verify them before releasing a payout.</>}
              </p>
            </Block>

            <Block icon={CalendarClock} title="Availability">
              {(profile.availability || []).length === 0 ? <Empty>No availability added.</Empty> : (
                <ul className="space-y-2">{profile.availability.map((a, i) => <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3.5 py-2 text-sm"><span className="font-semibold text-ink">{a.day}</span><span className="text-slate-600">{a.from} - {a.to}</span></li>)}</ul>
              )}
            </Block>

            <Block icon={Globe} title="Social links">
              <div className="grid gap-4 sm:grid-cols-2">
                {['linkedin', 'youtube', 'instagram', 'website'].map((k) => (
                  <Field key={k} label={k[0].toUpperCase() + k.slice(1)} value={profile.social?.[k] && <a href={profile.social[k]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline"><Link2 className="h-3.5 w-3.5" />Open link</a>} />
                ))}
              </div>
            </Block>

            <Block icon={Clock} title="Assigned courses">
              {t.assignedCourses.length === 0 ? <Empty>No courses assigned yet. The teacher cannot schedule classes until a course is assigned.</Empty> : <ul className="space-y-1.5 text-sm text-slate-700">{t.assignedCourses.map((c) => <li key={c.id}>• {c.title}</li>)}</ul>}
            </Block>

            <Block icon={CalendarClock} title={`Recent classes (${t.recentClasses.length})`}>
              {t.recentClasses.length === 0 ? <Empty>No classes scheduled yet.</Empty> : (
                <ul className="divide-y divide-slate-100">{t.recentClasses.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{c.title}</p><p className="text-xs text-slate-500">{c.course} · {formatDate(c.startsAt)}{c.status === 'completed' ? ` · earned ${formatCurrency(c.earning)}` : ''}</p></div><StatusBadge status={c.status} /></li>)}</ul>
              )}
            </Block>

            <Block icon={Building2} title={`Payout history (${t.payouts.length})`}>
              {t.payouts.length === 0 ? <Empty>No payouts generated yet.</Empty> : (
                <ul className="divide-y divide-slate-100">{t.payouts.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="font-semibold text-ink">{p.periodLabel} · {formatCurrency(p.amount)}</p><p className="text-xs text-slate-500">{p.classesConducted} classes · earned {formatCurrency(p.earnings)}, fee {formatCurrency(p.deductions)}{p.payoutDate ? ` · paid ${formatDate(p.payoutDate)}` : ''}</p></div><StatusBadge status={p.status} /></li>)}</ul>
              )}
            </Block>

            <Block icon={ShieldCheck} title="Permissions & account">
              <ul className="grid gap-2 sm:grid-cols-2">
                {permissions.map(([label, on]) => (
                  <li key={label} className={`flex items-center gap-2 text-sm ${on ? 'text-ink' : 'text-slate-400 line-through'}`}>{on ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}{label}</li>
                ))}
              </ul>
              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <Field label="Joined" value={formatDate(t.createdAt)} />
                <Field label="Last active" value={t.lastActiveAt ? timeAgo(t.lastActiveAt) : 'Never'} />
              </div>
              {t.mustChangePassword && <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-700"><KeyRound className="h-4 w-4" />Still using the temporary password given at onboarding.</p>}
            </Block>
          </div>

          <div className="space-y-5">
            <SignIns rows={t.activity.logins} />
            <Messages ownerId={t.id} kind="teachers" rows={t.activity.conversations} />
            <div className="grid gap-5 lg:grid-cols-2">
              <ActivityBlock title={`Recordings uploaded (${t.activity.recordings.length})`}>
                {t.activity.recordings.length === 0 ? <EmptyNote>No recordings uploaded.</EmptyNote> : (
                  <ul className="divide-y divide-slate-100">{t.activity.recordings.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{r.title}</p><p className="text-xs text-slate-500">{r.course} · {r.views} views{r.classDate ? ` · ${formatDate(r.classDate)}` : ''}</p></div><StatusBadge status={r.status} /></li>)}</ul>
                )}
              </ActivityBlock>
              <ActivityBlock title={`Assignments created (${t.activity.assignments.length})`}>
                {t.activity.assignments.length === 0 ? <EmptyNote>No assignments created.</EmptyNote> : (
                  <ul className="divide-y divide-slate-100">{t.activity.assignments.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-ink">{a.title}</p><p className="text-xs text-slate-500">{a.course}{a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ''} · {a.submissions} submissions</p></div><StatusBadge status={a.status === 'closed' ? 'closed' : 'active'} /></li>)}</ul>
                )}
              </ActivityBlock>
            </div>
            <ClassChat rows={t.activity.classChat} />
          </div>
        </div>
      )}
    </Modal>
  );
}
