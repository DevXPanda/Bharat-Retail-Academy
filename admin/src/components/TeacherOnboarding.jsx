import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, MessageCircle, RefreshCw, UserCheck } from 'lucide-react';
import {
  BRAND, Button, CATEGORY_OPTIONS, Checkbox, Field, FileUpload, Input, Modal, PasswordInput, RowsEditor, Select, StatusBadge, Switch, TagInput, Textarea, cx, toInputDate, useAction, useClient, useToast,
} from './ui.jsx';

const STEPS = [
  { key: 'account', label: 'Account' },
  { key: 'personal', label: 'Personal' },
  { key: 'professional', label: 'Professional' },
  { key: 'education', label: 'Education & skills' },
  { key: 'bank', label: 'Bank & payout' },
  { key: 'availability', label: 'Availability & social' },
  { key: 'access', label: 'Courses & access' },
];

const PERMISSIONS = [
  ['scheduleClasses', 'Schedule live classes', 'Create and edit classes for assigned courses'],
  ['uploadRecordings', 'Upload recordings', 'Add class recordings for students'],
  ['messageStudents', 'Message students', 'Chat with students enrolled in their courses'],
  ['viewEarnings', 'View earnings', 'See earnings and payout history'],
];

const TEACHER_URL = (import.meta.env.VITE_TEACHER_URL || 'http://localhost:5175').replace(/\/$/, '');

const BLANK = {
  name: '', email: '', phone: '', password: '', avatar: '', status: 'active',
  gender: '', dob: '', location: '', about: '',
  designation: '', expertise: '', experienceYears: 0, company: '', languages: [], workExperience: '', bio: '',
  education: [], certifications: [], skills: [],
  bank: { holderName: '', bankName: '', accountNumber: '', ifsc: '', accountType: 'Savings Account', upiId: '', verified: false },
  ratePerClass: 1000,
  availability: [{ day: 'Mon - Fri', from: '10:00', to: '18:00' }],
  social: { linkedin: '', youtube: '', instagram: '', website: '' },
  courseIds: [],
  permissions: { scheduleClasses: true, uploadRecordings: true, messageStudents: true, viewEarnings: true },
};

function fromTeacher(t) {
  const p = t.teacher || {};
  return {
    ...BLANK,
    name: t.name, email: t.email, phone: t.phone || '', avatar: t.avatar || '', status: t.status,
    gender: t.gender || '', dob: t.dob ? toInputDate(t.dob) : '', location: t.location || '', about: t.about || '',
    designation: p.designation || '', expertise: p.expertise || '', experienceYears: p.experienceYears ?? 0, company: p.company || '', languages: p.languages || [], workExperience: p.workExperience || '', bio: p.bio || '',
    education: (p.education || []).map(({ title, institute, year }) => ({ title, institute, year })),
    certifications: (p.certifications || []).map(({ title, issuer, year }) => ({ title, issuer, year })),
    skills: p.skills || [],
    bank: { ...BLANK.bank, ...(p.bank || {}) },
    ratePerClass: p.ratePerClass ?? 1000,
    availability: (p.availability || []).map(({ day, from, to }) => ({ day, from, to })),
    social: { ...BLANK.social, ...(p.social || {}) },
    courseIds: (t.assignedCourses || []).map((c) => c.id),
    permissions: { ...BLANK.permissions, ...(p.permissions || {}) },
  };
}

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const pick = (n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => chars[v % chars.length]).join('');
  return `${pick(6)}@${Math.floor(10 + Math.random() * 90)}${pick(2)}`;
};

const trim = (v) => (typeof v === 'string' ? v.trim() : v);

function toBody(form, editing) {
  const bank = { ...form.bank, holderName: trim(form.bank.holderName), bankName: trim(form.bank.bankName), ifsc: trim(form.bank.ifsc).toUpperCase(), accountNumber: trim(form.bank.accountNumber), upiId: trim(form.bank.upiId) };
  if (!bank.accountNumber) delete bank.accountNumber;
  const body = {
    name: trim(form.name), email: trim(form.email), phone: trim(form.phone) || undefined, avatar: form.avatar || undefined, status: form.status,
    gender: form.gender, dob: form.dob || undefined, location: trim(form.location), about: trim(form.about),
    designation: trim(form.designation) || undefined, expertise: form.expertise, experienceYears: Number(form.experienceYears) || 0, company: trim(form.company), languages: form.languages, workExperience: trim(form.workExperience), bio: trim(form.bio) || undefined,
    education: form.education.filter((r) => trim(r.title)), certifications: form.certifications.filter((r) => trim(r.title)), skills: form.skills,
    bank, ratePerClass: Number(form.ratePerClass) || 0,
    availability: form.availability.filter((r) => trim(r.day)), social: form.social,
    courseIds: form.courseIds, permissions: form.permissions,
  };
  if (form.password) body.password = form.password;
  return body;
}

function validateStep(index, form, editing) {
  const e = {};
  if (index === 0) {
    if (trim(form.name).length < 2) e.name = 'Enter the teacher name';
    if (!/^\S+@\S+\.\S+$/.test(trim(form.email))) e.email = 'Enter a valid email address';
    if (trim(form.phone) && !/^[0-9+\-\s]{10,15}$/.test(trim(form.phone))) e.phone = 'Enter a valid phone number';
    if (!editing && form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (editing && form.password && form.password.length < 8) e.password = 'Password must be at least 8 characters';
  }
  if (index === 2 && !form.expertise) e.expertise = 'Select an expertise area';
  if (index === 4) {
    const acct = trim(form.bank.accountNumber);
    if (acct && !/^[0-9]{6,30}$/.test(acct) && !/^[X*]+\d{0,4}$/i.test(acct)) e.accountNumber = 'Account number must be 6-30 digits';
    if (trim(form.bank.ifsc) && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(trim(form.bank.ifsc))) e.ifsc = 'Enter a valid IFSC (e.g. HDFC0001234)';
    if (Number(form.ratePerClass) < 0) e.ratePerClass = 'Cannot be negative';
  }
  if (index === 5) Object.entries(form.social).forEach(([k, v]) => { if (trim(v) && !/^https?:\/\//i.test(trim(v))) e[`social_${k}`] = 'Start with https://'; });
  return e;
}

function Credentials({ created, onDone }) {
  const toast = useToast();
  const text = `Welcome to ${BRAND.name}, ${created.name}!\nYour teacher account is ready.\nLogin: ${TEACHER_URL}\nEmail: ${created.email}\nTemporary password: ${created.password}\nPlease change your password after your first login.`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success('Login details copied'); } catch { toast.error('Could not copy'); }
  };
  return (
    <div className="mx-auto max-w-xl space-y-5 py-6 text-center">
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><UserCheck className="h-8 w-8" /></span>
      <div><h3 className="text-xl font-extrabold text-ink">Teacher onboarded</h3><p className="mt-1 text-sm text-slate-500">{created.name}'s account is active. Share these login details with them.</p></div>
      <dl className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm">
        {[['Login page', TEACHER_URL], ['Email', created.email], ['Temporary password', created.password]].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="break-all font-mono text-[13px] font-semibold text-ink">{v}</dd></div>
        ))}
      </dl>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" icon={Copy} onClick={copy}>Copy details</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white hover:bg-emerald-600"><MessageCircle className="h-4 w-4" />Share on WhatsApp</a>
        <Button onClick={onDone}>Done</Button>
      </div>
      <p className="text-xs text-slate-400">The password is shown only now. Use the Edit option later to set a new one.</p>
    </div>
  );
}

export function TeacherOnboarding({ open, editing, courses, onClose }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));
  const [created, setCreated] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setIn = (group, k, v) => setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromTeacher(editing) : { ...BLANK, password: generatePassword() });
    setErrors({});
    setStep(0);
    setVisited(new Set([0]));
    setCreated(null);
  }, [open, editing]);

  const save = useAction(
    () => {
      const body = toBody(form, editing);
      return editing ? client.patch(`/teachers/${editing.id}`, body) : client.post('/teachers', body);
    },
    {
      success: editing ? 'Teacher updated' : 'Teacher onboarded',
      invalidate: ['/teachers', '/courses', '/dashboard'],
      onSuccess: () => {
        if (editing) onClose();
        else setCreated({ name: form.name, email: form.email, password: form.password });
      },
    },
  );

  const goTo = (index) => { setStep(index); setVisited((v) => new Set(v).add(index)); };
  const stepErrors = useMemo(() => STEPS.map((_, i) => Object.keys(validateStep(i, form, editing)).length > 0), [form, editing]);

  const next = () => {
    const found = validateStep(step, form, editing);
    setErrors(found);
    if (Object.keys(found).length) return;
    goTo(step + 1);
  };

  const submit = () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const found = validateStep(i, form, editing);
      if (Object.keys(found).length) { setErrors(found); goTo(i); return; }
    }
    setErrors({});
    save.run();
  };

  const last = step === STEPS.length - 1;

  const footer = created ? null : (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <div className="ml-auto flex gap-3">
        {step > 0 && <Button variant="outline" icon={ChevronLeft} onClick={() => goTo(step - 1)}>Back</Button>}
        {!last && <Button variant={editing ? 'outline' : 'primary'} onClick={next}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>}
        {(last || editing) && <Button loading={save.loading} onClick={submit}>{editing ? 'Save changes' : 'Create teacher'}</Button>}
      </div>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} size="xl" title={editing ? `Edit ${editing.name}` : 'Onboard a new teacher'} subtitle={editing ? 'Update any part of the teacher profile.' : 'Fill in the teacher profile step by step. They can edit most of it later from their own portal.'} footer={footer}>
      {created ? <Credentials created={created} onDone={onClose} /> : (
        <div>
          <ol className="mb-6 flex flex-wrap gap-2" aria-label="Onboarding steps">
            {STEPS.map((s, i) => {
              const done = visited.has(i) && i !== step && !stepErrors[i];
              return (
                <li key={s.key}>
                  <button type="button" onClick={() => (editing || visited.has(i) ? goTo(i) : undefined)} disabled={!editing && !visited.has(i)} className={cx('flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition', i === step ? 'border-brand-600 bg-brand-600 text-white' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 disabled:opacity-60')}>
                    <span className={cx('inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]', i === step ? 'bg-white/25' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100')}>{done ? <Check className="h-3 w-3" /> : i + 1}</span>{s.label}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="grid gap-5 sm:grid-cols-2">
            {step === 0 && (
              <>
                <Field label="Full name" required error={errors.name}><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter teacher name" /></Field>
                <Field label="Email address" required error={errors.email} hint="This is the teacher's login."><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="teacher@example.com" /></Field>
                <Field label="Mobile number" error={errors.phone}><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Enter phone number" /></Field>
                <Field label={editing ? 'New password' : 'Temporary password'} required={!editing} error={errors.password} hint={editing ? 'Leave empty to keep the current password.' : 'Auto-generated. Share it with the teacher, they can change it after signing in.'}>
                  <div className="flex gap-2">
                    <PasswordInput value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Set password" autoComplete="new-password" />
                    <Button variant="outline" icon={RefreshCw} aria-label="Generate password" onClick={() => set('password', generatePassword())} />
                  </div>
                </Field>
                <div className="sm:col-span-2"><FileUpload label="Profile photo" kind="image" value={form.avatar} onChange={(url) => set('avatar', url)} title="Upload profile photo" hint="JPG, PNG or WebP. It is compressed automatically." /></div>
                <Field label="Account status" hint="Pending teachers cannot sign in until approved.">
                  <Select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="active">Active</option><option value="pending">Pending approval</option><option value="inactive">Inactive</option></Select>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Date of birth"><Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} max={toInputDate(new Date())} /></Field>
                <Field label="Gender"><Select value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></Select></Field>
                <Field label="Location" className="sm:col-span-2"><Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, Country" /></Field>
                <Field label="About the teacher" className="sm:col-span-2"><Textarea rows={5} value={form.about} onChange={(e) => set('about', e.target.value)} placeholder="A few lines about the teacher, shown on their profile." /></Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Expertise area" required error={errors.expertise}>
                  <Select value={form.expertise} onChange={(e) => set('expertise', e.target.value)}><option value="">Select expertise</option>{CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</Select>
                </Field>
                <Field label="Designation / title"><Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. E-Commerce Expert & Mentor" /></Field>
                <Field label="Experience (years)"><Input type="number" min={0} max={60} value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
                <Field label="Company / business"><Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Optional" /></Field>
                <Field label="Languages they teach in" className="sm:col-span-2"><TagInput value={form.languages} onChange={(v) => set('languages', v)} placeholder="Type a language and press Enter" /></Field>
                <Field label="Short bio" className="sm:col-span-2" hint="One or two lines, shown on the teacher cards."><Textarea rows={2} value={form.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
                <Field label="Work experience" className="sm:col-span-2"><Textarea rows={3} value={form.workExperience} onChange={(e) => set('workExperience', e.target.value)} placeholder="Brands worked with, students trained, results..." /></Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Education" className="sm:col-span-2"><RowsEditor rows={form.education} onChange={(v) => set('education', v)} blank={{ title: '', institute: '', year: '' }} addLabel="Add education" fields={[{ key: 'title', label: 'Degree' }, { key: 'institute', label: 'Institute' }, { key: 'year', label: 'Year' }]} /></Field>
                <Field label="Certifications" className="sm:col-span-2"><RowsEditor rows={form.certifications} onChange={(v) => set('certifications', v)} blank={{ title: '', issuer: '', year: '' }} addLabel="Add certification" fields={[{ key: 'title', label: 'Certification' }, { key: 'issuer', label: 'Issued by' }, { key: 'year', label: 'Year' }]} /></Field>
                <Field label="Specialization & skills" className="sm:col-span-2"><TagInput value={form.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Product Listing, PPC Ads - press Enter" /></Field>
              </>
            )}

            {step === 4 && (
              <>
                <Field label="Account holder name"><Input value={form.bank.holderName} onChange={(e) => setIn('bank', 'holderName', e.target.value)} /></Field>
                <Field label="Bank name"><Input value={form.bank.bankName} onChange={(e) => setIn('bank', 'bankName', e.target.value)} /></Field>
                <Field label="Account number" error={errors.accountNumber} hint={editing ? 'Shown masked. Type a new number only to change it.' : undefined}><Input value={form.bank.accountNumber} onChange={(e) => setIn('bank', 'accountNumber', e.target.value)} inputMode="numeric" /></Field>
                <Field label="IFSC code" error={errors.ifsc}><Input value={form.bank.ifsc} onChange={(e) => setIn('bank', 'ifsc', e.target.value.toUpperCase())} maxLength={11} placeholder="HDFC0001234" /></Field>
                <Field label="Account type"><Select value={form.bank.accountType} onChange={(e) => setIn('bank', 'accountType', e.target.value)}><option>Savings Account</option><option>Current Account</option></Select></Field>
                <Field label="UPI ID (optional)"><Input value={form.bank.upiId} onChange={(e) => setIn('bank', 'upiId', e.target.value)} placeholder="name@bank" /></Field>
                <Field label="Payout per class (₹)" error={errors.ratePerClass} hint="Credited to the teacher's earnings every time a class is completed."><Input type="number" min={0} value={form.ratePerClass} onChange={(e) => set('ratePerClass', e.target.value)} /></Field>
                <div className="flex items-center rounded-xl border border-slate-200 p-4">
                  <Switch checked={Boolean(form.bank.verified)} onChange={(v) => setIn('bank', 'verified', v)} label="Mark bank details as verified" />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <Field label="Weekly availability" className="sm:col-span-2"><RowsEditor rows={form.availability} onChange={(v) => set('availability', v)} blank={{ day: 'Mon - Fri', from: '10:00', to: '18:00' }} addLabel="Add time slot" fields={[{ key: 'day', label: 'Days' }, { key: 'from', label: 'From', type: 'time' }, { key: 'to', label: 'To', type: 'time' }]} /></Field>
                {['linkedin', 'youtube', 'instagram', 'website'].map((k) => (
                  <Field key={k} label={k[0].toUpperCase() + k.slice(1)} error={errors[`social_${k}`]}><Input value={form.social[k]} onChange={(e) => setIn('social', k, e.target.value)} placeholder="https://" /></Field>
                ))}
              </>
            )}

            {step === 6 && (
              <>
                <Field label="Assigned courses" className="sm:col-span-2" hint="Teachers can schedule classes only for assigned courses.">
                  <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {courses.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-slate-50">
                          <Checkbox checked={form.courseIds.includes(c.id)} onChange={(checked) => set('courseIds', checked ? [...form.courseIds, c.id] : form.courseIds.filter((id) => id !== c.id))} />
                          <span className="flex-1 truncate">{c.title}</span>
                          <StatusBadge status={c.status} />
                        </label>
                      </li>
                    ))}
                  </ul>
                </Field>
                <div className="space-y-3 sm:col-span-2">
                  <p className="text-sm font-semibold text-ink">What the teacher can do</p>
                  {PERMISSIONS.map(([key, label, hint]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50">
                      <Checkbox className="mt-0.5" checked={form.permissions[key]} onChange={(checked) => setIn('permissions', key, checked)} />
                      <span><span className="block text-sm font-semibold text-ink">{label}</span><span className="text-xs text-slate-500">{hint}</span></span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
