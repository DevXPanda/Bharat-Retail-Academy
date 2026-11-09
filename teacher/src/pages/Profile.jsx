import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Briefcase, Building2, Camera, Loader2, Clock, Eye, GraduationCap, Globe, KeyRound, Lock, Pencil, Plus, Settings, Star, Trash2, User, Users, BookOpen } from 'lucide-react';
import {
  StatCard, StatGrid, Avatar, Badge, Button, ChangePasswordModal, Field, Input, Modal, PageHeader, Select, StatusBadge, Textarea, formatDate, useAction, useAuth, useClient, useGet, Tabs,
} from '../components/ui.jsx';

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173';

const SECTIONS = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'professional', label: 'Professional Details' },
  { key: 'education', label: 'Education & Certifications' },
  { key: 'skills', label: 'Specialization & Skills' },
  { key: 'bank', label: 'Bank & Payout Details' },
  { key: 'availability', label: 'Availability' },
  { key: 'social', label: 'Social Links' },
  { key: 'account', label: 'Account Settings' },
];

function SectionCard({ id, icon: Icon, title, onEdit, children, className }) {
  return (
    <section id={id} className={`card scroll-mt-24 p-5 ${className || ''}`}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 text-[15px] font-bold text-ink"><Icon className="h-5 w-5 text-brand-600" />{title}</h3>
        {onEdit && <Button size="sm" variant="outline" icon={Pencil} onClick={onEdit}>Edit</Button>}
      </header>
      {children}
    </section>
  );
}

const KV = ({ label, value }) => (
  <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 break-words text-[14px] font-semibold text-ink">{value || <span className="font-normal text-slate-400">Not added</span>}</p></div>
);

function TagInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">{value.map((t) => <Badge key={t} tone="blue" className="gap-1.5">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button></Badge>)}</div>
      <div className="flex gap-2"><Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder} /><Button variant="outline" onClick={add}>Add</Button></div>
    </div>
  );
}

function RowsEditor({ rows, onChange, fields, blank, addLabel }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="teacher-profile-form-row grid gap-2 rounded-xl bg-slate-50 p-3" style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) auto` }}>
          {fields.map((f) => <Input key={f.key} type={f.type || 'text'} value={row[f.key] || ''} onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [f.key]: e.target.value } : r)))} placeholder={f.label} aria-label={f.label} />)}
          <button type="button" aria-label="Remove" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="px-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" icon={Plus} onClick={() => onChange([...rows, blank])}>{addLabel}</Button>
    </div>
  );
}

export default function Profile() {
  const client = useClient();
  const { user, refreshUser } = useAuth();
  const { hash } = useLocation();
  const [editing, setEditing] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const t = user.teacher || {};

  const courses = useGet('/courses', { limit: 100 }).data || [];
  const roster = useGet('/students/roster/summary').data;
  const rated = courses.filter((c) => c.ratingCount > 0);
  const rating = rated.length ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) : '—';

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const save = useAction((body) => client.patch('/auth/me', body), { success: 'Profile updated', onSuccess: async () => { await refreshUser(); setEditing(null); } });

  const open = (key) => {
    const forms = {
      personal: { name: user.name, phone: user.phone || '', gender: user.gender || '', dob: user.dob ? user.dob.slice(0, 10) : '', location: user.location || '', about: user.about || '', avatar: user.avatar || '' },
      professional: { designation: t.designation || '', experienceYears: t.experienceYears ?? 0, company: t.company || '', languages: t.languages || [], workExperience: t.workExperience || '' },
      education: { education: t.education || [], certifications: t.certifications || [] },
      skills: { skills: t.skills || [] },
      bank: { holderName: t.bank?.holderName || '', bankName: t.bank?.bankName || '', accountNumber: t.bank?.accountNumber || '', ifsc: t.bank?.ifsc || '', accountType: t.bank?.accountType || 'Savings Account', upiId: t.bank?.upiId || '' },
      availability: { availability: t.availability || [] },
      social: { linkedin: t.social?.linkedin || '', youtube: t.social?.youtube || '', instagram: t.social?.instagram || '', website: t.social?.website || '' },
    };
    setDraft(forms[key]);
    setEditing(key);
  };
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const base = ['name', 'phone', 'gender', 'dob', 'location', 'about', 'avatar'];
    if (editing === 'personal') {
      const body = {};
      base.forEach((k) => { if (draft[k] !== '' && draft[k] !== undefined) body[k] = draft[k]; });
      return save.run(body);
    }
    if (editing === 'professional') return save.run({ teacher: { ...draft, experienceYears: Number(draft.experienceYears) } });
    if (editing === 'bank') return save.run({ teacher: { bank: draft } });
    if (editing === 'social') return save.run({ teacher: { social: draft } });
    return save.run({ teacher: draft });
  };

  const photoInput = useRef(null);
  const [photoUpload, setPhotoUpload] = useState({ loading: false, error: '' });
  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setPhotoUpload({ loading: false, error: 'Choose a JPG, PNG or WebP image smaller than 2 MB.' });
      return;
    }
    setPhotoUpload({ loading: true, error: '' });
    try {
      const photo = await client.upload('image', file);
      await save.run({ avatar: photo.url });
      setPhotoUpload({ loading: false, error: '' });
    } catch (error) {
      setPhotoUpload({ loading: false, error: error.message || 'Photo upload failed. Please try again.' });
    }
  };

  return (
    <>
      <PageHeader title="My Profile" subtitle="Personal details, teaching profile and account settings." actions={<Button size="lg" icon={Eye} onClick={() => window.open(`${PUBLIC_URL}/teachers/${user.id}`, '_blank', 'noopener')}>Preview profile</Button>} />
      <div className="card teacher-profile-identity">
        <div className="relative shrink-0">
          <Avatar name={user.name} src={user.avatar} size={72} />
          <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={changePhoto} />
          <button type="button" aria-label="Change photo" title="Change photo (max 2 MB)" disabled={photoUpload.loading || save.loading} onClick={() => photoInput.current?.click()} className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white">
            {photoUpload.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3"><h2>{user.name}</h2><StatusBadge status={user.status} /></div>
          <p className="mt-1 text-xs text-slate-500">{t.designation || 'Teacher'}</p>
          {t.bio && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">{t.bio}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Pencil} onClick={() => open('personal')}>Edit profile</Button>
          <Button variant="outline" icon={Lock} onClick={() => setPasswordOpen(true)}>Change password</Button>
        </div>
      </div>
      {photoUpload.error && <p role="alert" className="mt-3 text-xs text-red-600">{photoUpload.error}</p>}
      <StatGrid cols={4} className="teacher-profile-stats">
        <StatCard icon={GraduationCap} label="Teaching experience" value={`${t.experienceYears ?? 0}+ years`} />
        <StatCard icon={BookOpen} tone="green" label="Courses" value={courses.length} />
        <StatCard icon={Users} tone="purple" label="Students taught" value={roster?.totalStudents.value ?? '—'} />
        <StatCard icon={Star} tone="orange" label="Average rating" value={rating} />
      </StatGrid>
      <Tabs tabs={SECTIONS.map((section) => ({ key: section.key, label: section.label }))} value="" onChange={(key) => document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="card mt-6 !px-4" />
      <div className="card teacher-profile-sections mt-6">
        <SectionCard id="personal" icon={User} title="Personal information" onEdit={() => open('personal')}>
          <div className="grid gap-5 sm:grid-cols-3"><KV label="Full name" value={user.name} /><KV label="Email" value={user.email} /><KV label="Mobile number" value={user.phone} /><KV label="Date of birth" value={user.dob && formatDate(user.dob)} /><KV label="Gender" value={user.gender} /><KV label="Location" value={user.location} /></div>
          <div className="mt-5"><KV label="About" value={user.about} /></div>
        </SectionCard>
        <SectionCard id="professional" icon={Briefcase} title="Professional details" onEdit={() => open('professional')}>
          <div className="grid gap-5 sm:grid-cols-2"><KV label="Designation" value={t.designation} /><KV label="Experience" value={`${t.experienceYears ?? 0}+ years`} /><KV label="Company / business" value={t.company} /><KV label="Teaching languages" value={(t.languages || []).join(', ')} /></div>
          <div className="mt-5"><KV label="Work experience" value={t.workExperience} /></div>
        </SectionCard>
        <SectionCard id="education" icon={GraduationCap} title="Education & certifications" onEdit={() => open('education')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <ul className="space-y-3">{(t.education || []).map((item) => <li key={item.title}><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{[item.institute, item.year].filter(Boolean).join(' | ')}</p></li>)}{!t.education?.length && <li className="text-xs text-slate-400">No education added</li>}</ul>
            <ul className="space-y-3">{(t.certifications || []).map((item) => <li key={item.title}><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{[item.issuer, item.year].filter(Boolean).join(' | ')}</p></li>)}{!t.certifications?.length && <li className="text-xs text-slate-400">No certifications added</li>}</ul>
          </div>
        </SectionCard>
        <SectionCard id="skills" icon={Settings} title="Specialization & skills" onEdit={() => open('skills')}>
          <div className="flex flex-wrap gap-2">{(t.skills || []).map((skill) => <Badge key={skill} tone="blue">{skill}</Badge>)}{!t.skills?.length && <p className="text-xs text-slate-400">No skills added</p>}</div>
        </SectionCard>
        <SectionCard id="bank" icon={Building2} title="Bank & payout details" onEdit={() => open('bank')}>
          <div className="grid gap-5 sm:grid-cols-3"><KV label="Account holder" value={t.bank?.holderName} /><KV label="Bank name" value={t.bank?.bankName} /><KV label="Account number" value={t.bank?.accountNumber && `${'X'.repeat(Math.max(0, t.bank.accountNumber.length - 4))}${t.bank.accountNumber.slice(-4)}`} /><KV label="IFSC code" value={t.bank?.ifsc} /><KV label="Account type" value={t.bank?.accountType} /><KV label="UPI ID" value={t.bank?.upiId} /></div>
          {t.bank?.verified && <p className="mt-4 text-xs text-emerald-600">Bank details verified</p>}
        </SectionCard>
        <SectionCard id="availability" icon={Clock} title="Availability" onEdit={() => open('availability')}>
          <ul className="space-y-2.5 text-xs">{(t.availability || []).map((slot, index) => <li key={index} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2.5"><span>{slot.day}</span><span className="text-slate-500">{slot.from} – {slot.to}</span></li>)}{!t.availability?.length && <li className="text-slate-400">No availability added</li>}</ul>
        </SectionCard>
        <SectionCard id="social" icon={Globe} title="Social links" onEdit={() => open('social')}>
          <div className="grid gap-5 sm:grid-cols-2">{['linkedin', 'youtube', 'instagram', 'website'].map((key) => <KV key={key} label={key[0].toUpperCase() + key.slice(1)} value={t.social?.[key]} />)}</div>
        </SectionCard>
        <SectionCard id="account" icon={KeyRound} title="Account settings"><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-xs text-slate-500">Update your sign-in password.</p><Button variant="outline" onClick={() => setPasswordOpen(true)}>Change password</Button></div></SectionCard>
      </div>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={SECTIONS.find((section) => section.key === editing)?.label} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button loading={save.loading} onClick={submit}>Save changes</Button></>}>
        <div className="space-y-4">
          {editing === 'personal' && <>
            <Field label="Full name" required><Input value={draft.name} onChange={(event) => set('name', event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Mobile number"><Input value={draft.phone} onChange={(event) => set('phone', event.target.value)} /></Field><Field label="Date of birth"><Input type="date" value={draft.dob} onChange={(event) => set('dob', event.target.value)} /></Field><Field label="Gender"><Select value={draft.gender} onChange={(event) => set('gender', event.target.value)}><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></Select></Field><Field label="Location"><Input value={draft.location} onChange={(event) => set('location', event.target.value)} /></Field></div>
            <Field label="About"><Textarea rows={4} value={draft.about} onChange={(event) => set('about', event.target.value)} /></Field>
          </>}
          {editing === 'professional' && <>
            <Field label="Designation"><Input value={draft.designation} onChange={(event) => set('designation', event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Experience (years)"><Input type="number" min={0} value={draft.experienceYears} onChange={(event) => set('experienceYears', event.target.value)} /></Field><Field label="Company / business"><Input value={draft.company} onChange={(event) => set('company', event.target.value)} /></Field></div>
            <Field label="Teaching languages"><TagInput value={draft.languages} onChange={(value) => set('languages', value)} placeholder="Add a language and press Enter" /></Field><Field label="Work experience"><Textarea rows={4} value={draft.workExperience} onChange={(event) => set('workExperience', event.target.value)} /></Field>
          </>}
          {editing === 'education' && <><Field label="Education"><RowsEditor rows={draft.education} onChange={(value) => set('education', value)} blank={{ title: '', institute: '', year: '' }} addLabel="Add education" fields={[{ key: 'title', label: 'Degree' }, { key: 'institute', label: 'Institute' }, { key: 'year', label: 'Year' }]} /></Field><Field label="Certifications"><RowsEditor rows={draft.certifications} onChange={(value) => set('certifications', value)} blank={{ title: '', issuer: '', year: '' }} addLabel="Add certification" fields={[{ key: 'title', label: 'Certification' }, { key: 'issuer', label: 'Issuer' }, { key: 'year', label: 'Year' }]} /></Field></>}
          {editing === 'skills' && <Field label="Skills"><TagInput value={draft.skills} onChange={(value) => set('skills', value)} placeholder="Add a skill and press Enter" /></Field>}
          {editing === 'bank' && <div className="grid gap-4 sm:grid-cols-2">{[['holderName', 'Account holder name'], ['bankName', 'Bank name'], ['accountNumber', 'Account number'], ['ifsc', 'IFSC code']].map(([key, label]) => <Field key={key} label={label}><Input value={draft[key]} inputMode={key === 'accountNumber' ? 'numeric' : undefined} onChange={(event) => set(key, key === 'ifsc' ? event.target.value.toUpperCase() : event.target.value)} /></Field>)}<Field label="Account type"><Select value={draft.accountType} onChange={(event) => set('accountType', event.target.value)}><option>Savings Account</option><option>Current Account</option></Select></Field><Field label="UPI ID (optional)"><Input value={draft.upiId} onChange={(event) => set('upiId', event.target.value)} /></Field></div>}
          {editing === 'availability' && <RowsEditor rows={draft.availability} onChange={(value) => set('availability', value)} blank={{ day: 'Mon - Fri', from: '10:00', to: '18:00' }} addLabel="Add slot" fields={[{ key: 'day', label: 'Days' }, { key: 'from', label: 'From', type: 'time' }, { key: 'to', label: 'To', type: 'time' }]} />}
          {editing === 'social' && ['linkedin', 'youtube', 'instagram', 'website'].map((key) => <Field key={key} label={key[0].toUpperCase() + key.slice(1)}><Input value={draft[key]} onChange={(event) => set(key, event.target.value)} placeholder="https://" /></Field>)}
        </div>
      </Modal>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
