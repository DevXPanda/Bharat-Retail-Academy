import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth, useClient } from '../../context/AppProviders.jsx';
import { BrandMark, BrandName } from './Brand.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Form.jsx';

export function ProtectedRoute({ redirectTo = '/login' }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PasswordInput({ value, onChange, placeholder = 'Enter your password', autoComplete = 'current-password', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} className="pr-10" {...props} />
      <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StaffLogin({ brand, heading, tagline, points = [], redirectTo = '/', forgotPath }) {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={location.state?.from || redirectTo} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BrandMark size={46} />
          <BrandName name={brand.name} caption={brand.caption} dark />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">{heading}</h2>
          <p className="mt-4 text-base text-slate-300">{tagline}</p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-5">
          <div className="mb-2 flex items-center gap-3 lg:hidden">
            <BrandMark size={42} />
            <BrandName name={brand.name} caption={brand.caption} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-ink">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to the {brand.caption?.toLowerCase() || 'portal'}.</p>
          </div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600" role="alert">{error}</p>}
          <Field label="Email address" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="username" className="pl-9" />
            </div>
          </Field>
          <Field label="Password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="pl-9" />
            </div>
          </Field>
          {forgotPath && <div className="-mt-2 text-right"><Link to={forgotPath} className="text-sm font-medium text-brand-700 hover:underline">Forgot password?</Link></div>}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

function StaffCard({ brand, title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={42} />
          <BrandName name={brand.name} caption={brand.caption} />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      </div>
    </div>
  );
}

const errorBox = (message) => <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{message}</p>;

// Admin "forgot password": asks for the email and always answers the same way.
export function StaffForgotPassword({ brand, loginPath = '/login' }) {
  const client = useClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffCard brand={brand} title="Forgot your password?" subtitle="Enter your email and we will send you a link to choose a new one." footer={<Link to={loginPath} className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}>
      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-700" />
          If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. It works for 30 minutes.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && errorBox(error)}
          <Field label="Email address" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="pl-9" />
            </div>
          </Field>
          <Button type="submit" size="lg" loading={loading} className="w-full">Send reset link</Button>
        </form>
      )}
    </StaffCard>
  );
}

export function StaffResetPassword({ brand, loginPath = '/login' }) {
  const client = useClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters');
    if (password !== confirm) return setError('The two passwords do not match');
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate(loginPath, { replace: true }), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  return (
    <StaffCard brand={brand} title="Choose a new password" subtitle="Pick something you have not used before." footer={<Link to={loginPath} className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}>
      {!token ? (
        errorBox('This reset link is incomplete. Request a new one from the forgot password page.')
      ) : done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-700" />
          Your password has been changed. Taking you to sign in...
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && errorBox(error)}
          <Field label="New password" required>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
          </Field>
          <Field label="Confirm new password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-9" autoComplete="new-password" />
            </div>
          </Field>
          <Button type="submit" size="lg" loading={loading} className="w-full">Change password</Button>
        </form>
      )}
    </StaffCard>
  );
}
