import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { BRAND, BrandMark, BrandName, Button, Field, Input, PasswordInput, useAuth } from '@ecomedu/ui';

function AuthFrame({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[620px] lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-brand-900 p-14 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative max-w-md">
          <BrandMark size={64} />
          <h2 className="mt-8 text-4xl font-extrabold leading-tight">Your courses, in one place.</h2>
          <p className="mt-4 text-slate-300">Sign in to access your lessons, live classes and assignments.</p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">{['Scheduled live classes', 'Published class recordings', 'Verified completion certificates'].map((t) => <li key={t} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-brand-400" />{t}</li>)}</ul>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}

const withIcon = (Icon, child) => (
  <div className="relative"><Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />{child}</div>
);

export function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = params.get('next') || '/app';
  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to continue learning." footer={<>New to {BRAND.name}? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-600 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>}
        <Field label="Email address" required>{withIcon(Mail, <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="pl-9" autoComplete="username" />)}</Field>
        <Field label="Password" required>{withIcon(Lock, <PasswordInput required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-9" />)}</Field>
        <Button type="submit" size="lg" loading={loading} className="w-full">Sign in</Button>
        <p className="text-center text-xs text-slate-400">Teacher or admin? Use your dedicated portal.</p>
      </form>
    </AuthFrame>
  );
}

export function Signup() {
  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = params.get('next') || '/app';
  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email';
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone)) found.phone = 'Enter a valid mobile number';
    if (form.password.length < 8) found.password = 'Use at least 8 characters';
    setErrors(found);
    if (Object.keys(found).length) return;
    setServerError('');
    setLoading(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      navigate(next, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame title="Create your account" subtitle="Enter your details to get started." footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{serverError}</p>}
        <Field label="Full name" required error={errors.name}>{withIcon(User, <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" className="pl-9" autoComplete="name" />)}</Field>
        <Field label="Email address" required error={errors.email}>{withIcon(Mail, <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="pl-9" autoComplete="email" />)}</Field>
        <Field label="Mobile number" required error={errors.phone}>{withIcon(Phone, <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" className="pl-9" autoComplete="tel" />)}</Field>
        <Field label="Password" required error={errors.password}>{withIcon(Lock, <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-9" autoComplete="new-password" placeholder="At least 8 characters" />)}</Field>
        <Button type="submit" size="lg" loading={loading} className="w-full">Create account</Button>
      </form>
    </AuthFrame>
  );
}
