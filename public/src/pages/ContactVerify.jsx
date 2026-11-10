import PageFrame from '../components/PageFrame.jsx';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Phone, ShieldCheck, ShieldX } from 'lucide-react';
import { Button, Field, Input, Textarea, formatDate, useAction, useClient, useGet } from '@ecomedu/ui';
import { SUPPORT_EMAIL as DEFAULT_EMAIL } from '../config.js';

export function Contact() {
  const settings = useGet('/public/settings').data;
  const SUPPORT_EMAIL = settings?.supportEmail || DEFAULT_EMAIL;
  const client = useClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const send = useAction(() => client.post('/public/leads', { ...form, source: 'contact' }), { success: 'Message sent. We will get back to you soon.', onSuccess: () => setForm({ name: '', email: '', phone: '', message: '' }) });

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone)) next.phone = 'Enter a valid mobile number';
    if (form.message.trim().length < 5) next.message = 'Tell us how we can help';
    setErrors(next);
    if (!Object.keys(next).length) send.run();
  };

  return (
    <PageFrame title="Let's talk." description="Questions about a course, your account or a payment? We're here to help.">
      <div className="contact-layout">
      <div className="contact-details">
        <h2>Find your next step.</h2>
        <p className="mt-4">Tell us what you're working on and where you need a hand. Include your course name or order reference if you have one.</p>
        <a href={`mailto:${SUPPORT_EMAIL}`}><Mail aria-hidden="true" />{SUPPORT_EMAIL}</a>
        {settings?.supportPhone && <a href={`tel:${settings.supportPhone.replace(/\s/g, '')}`}><Phone aria-hidden="true" />{settings.supportPhone}</a>}
        {settings?.supportHours && <small>{settings.supportHours}</small>}
      </div>
      <form onSubmit={submit} noValidate className="public-panel contact-form space-y-4">
        <Field label="Full name" required error={errors.name}><Input autoComplete="name" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required error={errors.email}><Input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Mobile" required error={errors.phone}><Input type="tel" autoComplete="tel" placeholder="Mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="Message" required error={errors.message}><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        <Button type="submit" size="lg" loading={send.loading}>Send message</Button>
      </form>
      </div>
    </PageFrame>
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
    <PageFrame title="Verify a certificate." description="Enter the ID printed on a certificate to check its details and status." className="academy-verify">
      <form className="verify-search" onSubmit={(event) => { event.preventDefault(); if (id.trim()) check(); }}><Input aria-label="Certificate ID" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. EC-2026-AMA-ABC123" /><Button type="submit" loading={loading} disabled={!id.trim()}>Verify certificate</Button></form>
      {error && <p role="alert" className="mt-5 flex items-center gap-2.5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600"><ShieldX className="h-5 w-5" />{error}</p>}
      {result && (
        <div aria-live="polite" className={`certificate-result mt-6 rounded-md border p-6 ${valid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`flex items-center gap-2.5 text-lg font-extrabold ${valid ? 'text-emerald-700' : 'text-amber-700'}`}>{valid ? <ShieldCheck className="h-6 w-6" /> : <ShieldX className="h-6 w-6" />}{valid ? 'Valid certificate' : `Certificate is ${result.status}`}</p>
          <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Awarded to</dt><dd className="font-semibold text-ink">{result.studentName}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Course</dt><dd className="font-semibold text-ink">{result.course}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Completed on</dt><dd className="font-semibold text-ink">{formatDate(result.completionDate)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Certificate ID</dt><dd className="font-mono text-xs font-semibold text-ink">{result.certificateId}</dd></div></dl>
        </div>
      )}
    </PageFrame>
  );
}
