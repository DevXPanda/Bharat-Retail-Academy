import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { BRAND, BrandMark, Button, Field, Input, PasswordInput, useAuth, useClient } from '@ecomedu/ui';

// Sign in, sign up, email code, forgot and reset password all live in one popup that can open over any page.
const AuthModalContext = createContext(null);
export const useAuthModal = () => useContext(AuthModalContext);

const CODE_COOLDOWN = 60;

const TITLES = {
  login: ['Welcome back', 'Sign in to pick up where you left off.'],
  signup: ['Join the academy', 'Create an account to explore courses and join classes.'],
  verify: ['Check your email', null],
  forgot: ['Forgot your password?', 'Enter your email and we will send you a link to choose a new one.'],
  reset: ['Choose a new password', 'Pick something you have not used before.'],
};

const ErrorNote = ({ children }) => <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{children}</p>;
const InfoNote = ({ children }) => <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">{children}</p>;
const linkClass = 'font-semibold text-brand-700 hover:underline';

function LoginForm({ go, finish, notice }) {
  const { login } = useAuth();
  const client = useClient();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      finish();
    } catch (err) {
      if (err.errors?.[0]?.code === 'EMAIL_NOT_VERIFIED') {
        client.post('/auth/resend-otp', { email: form.email.trim() }).catch(() => {});
        go('verify', { email: form.email.trim() });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {notice && <InfoNote>{notice}</InfoNote>}
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Email address" required><Input type="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="username" /></Field>
      <Field label="Password" required><PasswordInput required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
      <div className="-mt-1 text-right"><button type="button" onClick={() => go('forgot', { email: form.email })} className="text-sm font-medium text-brand-700 hover:underline">Forgot password?</button></div>
      <Button type="submit" size="lg" loading={loading} className="w-full">Sign in</Button>
      <p className="auth-switch">New here? <button type="button" onClick={() => go('signup')} className={linkClass}>Create an account</button></p>
      
    </form>
  );
}

function SignupForm({ go }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const { email } = await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      go('verify', { email });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      {serverError && <ErrorNote>{serverError}</ErrorNote>}
      <Field label="Full name" required error={errors.name}><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" autoComplete="name" /></Field>
      <div className="space-y-3.5">
        <Field label="Email address" required error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></Field>
        <Field label="Mobile number" required error={errors.phone}><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" autoComplete="tel" /></Field>
      </div>
      <Field label="Password" required error={errors.password}><PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" placeholder="At least 8 characters" /></Field>
      <Button type="submit" size="lg" loading={loading} className="w-full">Create account</Button>
      <p className="auth-switch">Already have an account? <button type="button" onClick={() => go('login')} className={linkClass}>Sign in</button></p>
    </form>
  );
}

function VerifyForm({ email, go, finish }) {
  const { verifyEmail } = useAuth();
  const client = useClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(CODE_COOLDOWN);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
      finish();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      await client.post('/auth/resend-otp', { email });
      setInfo('A new code is on its way.');
      setWait(CODE_COOLDOWN);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      {info && <InfoNote>{info}</InfoNote>}
      <Field label="Verification code" required>
        <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="text-center font-mono text-2xl tracking-[0.5em]" autoFocus />
      </Field>
      <Button type="submit" size="lg" loading={loading} disabled={code.length !== 6} className="w-full">Verify and continue</Button>
      <p className="text-center text-xs text-slate-400">Cannot see it? Check your Spam and Promotions folders, and mark it as Not spam.</p>
      <p className="text-center text-sm text-slate-500">
        Did not get it? {wait > 0 ? <span className="text-slate-400">Resend in {wait}s</span> : <button type="button" onClick={resend} className={linkClass}>Resend code</button>}
        {' '}&middot; <button type="button" onClick={() => go('signup')} className={linkClass}>Wrong email?</button>
      </p>
    </form>
  );
}

function ForgotForm({ go, initialEmail }) {
  const client = useClient();
  const [email, setEmail] = useState(initialEmail || '');
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

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-700" />
          If a student account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. It works for 30 minutes.
        </div>
        <button type="button" onClick={() => go('login')} className={`${linkClass} block w-full text-center text-sm`}>Back to sign in</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Email address" required><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
      <Button type="submit" size="lg" loading={loading} className="w-full">Send reset link</Button>
      <p className="text-center text-sm text-slate-500">Remembered it? <button type="button" onClick={() => go('login')} className={linkClass}>Back to sign in</button></p>
    </form>
  );
}

function ResetForm({ token, go }) {
  const client = useClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters');
    if (password !== confirm) return setError('The two passwords do not match');
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/reset-password', { token, password });
      go('login', { notice: 'Your password has been changed. Sign in with the new one.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  if (!token) return <div className="space-y-4"><ErrorNote>This reset link is incomplete. Request a new one.</ErrorNote><button type="button" onClick={() => go('forgot')} className={`${linkClass} block w-full text-center text-sm`}>Send me a new link</button></div>;
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="New password" required><PasswordInput autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></Field>
      <Field label="Confirm new password" required><PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
      <Button type="submit" size="lg" loading={loading} className="w-full">Change password</Button>
    </form>
  );
}

function AuthDialog({ state, setState, close }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { view } = state;
  const dialogRef = useRef(null);
  const [returnFocus] = useState(() => document.activeElement);
  const [title, subtitle] = TITLES[view] || TITLES.login;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      returnFocus?.focus();
    };
  }, [close, returnFocus]);

  const go = useCallback((next, extra = {}) => setState((s) => ({ ...s, ...extra, view: next, notice: extra.notice })), [setState]);
  const finish = useCallback(() => {
    const target = state.next;
    close();
    if (target) navigate(target);
  }, [state.next, close, navigate]);

  useEffect(() => {
    if (user && view !== 'reset') finish();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description" className="auth-dialog">
        <div className="auth-main">
          <div className="auth-brand"><BrandMark size={52} /><span>{BRAND.name}</span></div>
          <button type="button" aria-label="Close" onClick={close} className="auth-close"><X className="h-5 w-5" /></button>
          <h2 id="auth-title" className="auth-title">{title}</h2>
          <p id="auth-description" className="auth-description">{view === 'verify' ? <>We sent a 6 digit code to <span className="font-semibold text-ink">{state.email}</span>.</> : subtitle}</p>
          <div className="mt-6">
            {view === 'login' && <LoginForm key="login" go={go} finish={finish} notice={state.notice} />}
            {view === 'signup' && <SignupForm key="signup" go={go} />}
            {view === 'verify' && <VerifyForm key="verify" email={state.email} go={go} finish={finish} />}
            {view === 'forgot' && <ForgotForm key="forgot" go={go} initialEmail={state.email} />}
            {view === 'reset' && <ResetForm key="reset" token={state.token} go={go} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AuthModalProvider({ children }) {
  const [state, setState] = useState(null);
  const open = useCallback((view = 'login', options = {}) => setState({ view, ...options }), []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ open, close, isOpen: Boolean(state) }), [open, close, state]);
  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {state && <AuthDialog state={state} setState={setState} close={close} />}
    </AuthModalContext.Provider>
  );
}
