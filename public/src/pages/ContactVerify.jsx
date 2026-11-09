import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Mail, ShieldCheck, ShieldX } from 'lucide-react';
import { Button, Field, Input, Textarea, formatDate, useAction, useClient } from '@ecomedu/ui';
import { SUPPORT_EMAIL } from '../config.js';

export function Contact() {
  const client = useClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const send = useAction(() => client.post('/public/leads', { ...form, source: 'contact' }), { success: 'Message sent. We will get back to you soon.', onSuccess: () => setForm({ name: '', email: '', phone: '', message: '' }) });

  const submit = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone)) next.phone = 'Enter a valid mobile number';
    if (form.message.trim().length < 5) next.message = 'Tell us how we can help';
    setErrors(next);
    if (!Object.keys(next).length) send.run();
  };

  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">Contact us</h1>
        <p className="mt-3 text-slate-500">Questions about a course, payment or certificate? Send us a message and we will reply within one working day.</p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-6 inline-flex items-center gap-2.5 text-sm font-semibold text-brand-600"><Mail className="h-4 w-4" />{SUPPORT_EMAIL}</a>
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <Field label="Full name" required error={errors.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Mobile" required error={errors.phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="Message" required error={errors.message}><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        <Button size="lg" loading={send.loading} onClick={submit}>Send message</Button>
      </div>
    </div>
  );
}

export function VerifyCertificate() {
  const params = useParams();
  const navigate = useNavigate();
  const client = useClient();
  const [id, setId] = useState(params.id || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await client.get(`/public/certificates/${encodeURIComponent(id.trim())}`);
      setResult(data);
      navigate(`/verify/${encodeURIComponent(id.trim())}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const valid = result?.status === 'verified';
  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">Verify a certificate</h1>
      <p className="mt-3 text-slate-500">Enter the certificate ID printed on the certificate to confirm it is genuine.</p>
      <div className="mt-6 flex gap-3"><Input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. EC-2026-AMA-ABC123" onKeyDown={(e) => e.key === 'Enter' && id && check()} /><Button loading={loading} disabled={!id.trim()} onClick={check}>Verify</Button></div>
      {error && <p className="mt-5 flex items-center gap-2.5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600"><ShieldX className="h-5 w-5" />{error}</p>}
      {result && (
        <div className={`mt-6 rounded-2xl border p-6 ${valid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`flex items-center gap-2.5 text-lg font-extrabold ${valid ? 'text-emerald-700' : 'text-amber-700'}`}>{valid ? <ShieldCheck className="h-6 w-6" /> : <ShieldX className="h-6 w-6" />}{valid ? 'Valid certificate' : `Certificate is ${result.status}`}</p>
          <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Awarded to</dt><dd className="font-semibold text-ink">{result.studentName}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Course</dt><dd className="font-semibold text-ink">{result.course}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Completed on</dt><dd className="font-semibold text-ink">{formatDate(result.completionDate)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Certificate ID</dt><dd className="font-mono text-xs font-semibold text-ink">{result.certificateId}</dd></div></dl>
        </div>
      )}
    </div>
  );
}
