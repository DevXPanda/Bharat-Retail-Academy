import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth, useClient } from '../../context/AppProviders.jsx';
import { BrandMark, BrandName } from './Brand.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Form.jsx';
import teacherIllustration from '../../illustrations/teacher-login.svg';
import adminIllustration from '../../illustrations/admin-login.svg';
import '../../styles/staff-auth.css';

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

export function StaffLogin({ brand, heading, tagline, points = [], redirectTo = '/', forgotPath, illustration = 'teacher' }) {
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

  const isAdmin = illustration === 'admin';
  return (
    <div className={`staff-login staff-login-${illustration}`}>
      <aside className="staff-login-aside">
        <div className="staff-login-scene">
          <img src={isAdmin ? adminIllustration : teacherIllustration} alt={isAdmin ? 'An academy coordinator organising courses and class schedules at a desk.' : 'A teacher explaining a lesson beside a classroom board.'} width="620" height="460" />
          <div className="staff-login-intro"><h2>{isAdmin ? 'Your academy, in good order.' : 'Make room for good teaching.'}</h2><p>{tagline}</p></div>
          {points.length > 0 && <ul className="staff-login-features">{points.map((point) => <li key={point}>{point}</li>)}</ul>}
        </div>
        <p className="staff-login-copyright">&copy; {new Date().getFullYear()} {brand.name}</p>
      </aside>
      <main className="staff-login-main">
        <div className="staff-login-card">
          <div className="staff-login-brand"><BrandMark size={64} /><span>{brand.name}</span></div>
          <div className="staff-login-heading"><h1>{heading || 'Welcome back'}</h1><p>Sign in with your academy account.</p></div>
          <form onSubmit={submit} className="staff-login-form">
            {error && <p className="staff-login-error" role="alert">{error}</p>}
            <Field label="Email address" required><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="username" /></Field>
            <Field label="Password" required><PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
            {forgotPath && <div className="staff-login-forgot"><Link to={forgotPath}>Forgot password?</Link></div>}
            <Button type="submit" size="lg" loading={loading} className="staff-login-submit">Sign in</Button>
          </form>
          <p className="staff-login-note">{isAdmin ? 'For authorised academy administrators.' : 'Your classes, students and teaching resources.'}</p>
        </div>
      </main>
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
