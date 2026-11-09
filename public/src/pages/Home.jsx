import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, LayoutGrid, CirclePlay, CalendarDays, Clock, Headset, Radio } from 'lucide-react';
import { Avatar, Button, EmptyState, ErrorState, Field, Input, Modal, Select, Spinner, formatDate, formatNumber, formatTime, useAction, useAuth, useClient, useGet } from '@ecomedu/ui';
import CourseCard from '../components/CourseCard.jsx';
import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { GOALS } from '../config.js';

function LeadForm() {
  const client = useClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', goal: '' });
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const send = useAction(() => client.post('/public/leads', { ...form, goal: form.goal || undefined, source: 'hero' }), {
    success: 'Thank you. Our team will contact you.',
    onSuccess: () => setForm({ name: '', email: '', phone: '', goal: '' }),
  });
  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone)) next.phone = 'Enter a valid mobile number';
    setErrors(next);
    if (!Object.keys(next).length) send.run();
  };
  return (
    <form onSubmit={submit} noValidate className="enquiry-card">
      <div className="mb-5"><span className="section-kicker">Course enquiry</span><h2 className="mt-2 text-xl font-bold text-ink">Need help choosing?</h2><p className="mt-1 text-sm text-slate-500">Leave your details. We will call you.</p></div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} className="sm:col-span-2"><Input autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your full name" /></Field>
        <Field label="Email" required error={errors.email}><Input type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" /></Field>
        <Field label="Mobile" required error={errors.phone}><Input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" /></Field>
        <Field label="Interested in" className="sm:col-span-2"><Select value={form.goal} onChange={(e) => set('goal', e.target.value)}><option value="">Select a topic</option>{GOALS.map((goal) => <option key={goal}>{goal}</option>)}</Select></Field>
      </div>
      <Button type="submit" loading={send.loading} className="mt-5 w-full" icon={ArrowRight}>Request a callback</Button>
    </form>
  );
}

function WelcomeCard({ user }) {
  const links = [[LayoutGrid, 'My courses', '/app/courses'], [Radio, 'Live classes', '/app/live-classes'], [Award, 'Certificates', '/app/certificates'], [Headset, 'Support', '/app/support']];
  return <div className="enquiry-card"><div className="flex items-center gap-3"><Avatar name={user.name} src={user.avatar} size={48} /><div><span className="section-kicker">My learning</span><h2 className="mt-1 text-xl font-bold">Hello, {user.name.split(' ')[0]}</h2></div></div><div className="my-5 grid grid-cols-2 gap-3">{links.map(([Icon, label, to]) => <Link key={to} to={to} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium hover:border-brand-400"><Icon className="h-4 w-4 text-brand-600" />{label}</Link>)}</div><Link to="/app/recordings" className="mb-5 block text-sm text-slate-500 hover:text-brand-600">View class recordings</Link><Link to="/app" className="public-primary w-full">Continue learning <ArrowRight className="h-4 w-4" /></Link></div>;
}

function Hero() {
  const { user } = useAuth();
  const { data: stats } = useGet('/public/stats');
  return <section className="home-hero"><div className="public-container hero-grid"><div className="hero-copy"><span className="section-kicker">E-commerce courses | Hindi & English</span><h1>Learn to sell.<br /><span>One course at a time.</span></h1><p>Amazon, Flipkart, Meesho or your own store. Learn the basics, join live classes and revisit each lesson when you need it.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/courses" className="public-primary">Explore courses <ArrowRight className="h-4 w-4" /></Link><Link to="/live-classes" className="public-secondary">View live classes</Link></div><div className="hero-features">{[[Radio, 'Live classes'], [CirclePlay, 'Recorded lessons'], [Award, 'Course certificates']].map(([Icon, label]) => <span key={label}><Icon className="h-4 w-4" />{label}</span>)}</div>{stats && <div className="hero-stats">{[[stats.courses, 'Courses'], [stats.instructors, 'Teachers'], [stats.learners, 'Learners']].map(([value, label]) => <span key={label}><strong>{formatNumber(value)}</strong>{label}</span>)}</div>}</div>{user ? <WelcomeCard user={user} /> : <LeadForm />}</div></section>;
}

function CourseCatalog() {
  const [category, setCategory] = useState('all');
  const categories = useGet('/public/categories').data || [];
  const courses = useGet('/public/courses', { limit: 6, category, sort: 'popular' });
  return <section className="public-container public-section" id="courses"><div className="section-heading"><div><span className="section-kicker">Find your course</span><h2>What would you like to learn?</h2></div><Link to="/courses" className="text-link">All courses <ArrowRight className="h-4 w-4" /></Link></div><div className="platform-filters" aria-label="Filter courses by platform"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')} className={category === 'all' ? 'selected' : ''}><LayoutGrid className="h-5 w-5" /><span>All courses</span></button>{categories.map((c) => <button key={c.name} type="button" aria-pressed={category === c.name} onClick={() => setCategory(c.name)} className={category === c.name ? 'selected' : ''}><PlatformLogo category={c.name} size={30} /><span>{c.name}</span><small>{c.count}</small></button>)}</div>{courses.isLoading ? <div className="flex justify-center py-14"><Spinner /></div> : courses.error ? <ErrorState message={courses.error} onRetry={courses.refetch} /> : !courses.data?.length ? <EmptyState title="No courses in this category yet" /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{courses.data.map((course) => <CourseCard key={course.id} course={course} />)}</div>}</section>;
}

function Sessions() {
  const { data = [] } = useGet('/public/live-classes');
  if (!data.length) return null;
  return <section className="public-container public-section"><div className="section-heading"><div><span className="section-kicker">On the schedule</span><h2>Upcoming live classes</h2></div><Link to="/live-classes" className="text-link">Full schedule <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 md:grid-cols-3">{data.slice(0, 3).map((c) => <Link key={c.id} to={`/courses/${c.course?.slug}`} className="session-card"><div className="flex items-center justify-between"><PlatformLogo category={c.course?.category} size={42} /><span className={c.status === 'live' ? 'session-live' : 'section-kicker'}>{c.status === 'live' ? 'Live now' : 'Scheduled'}</span></div><h3 className="mt-4 text-base font-bold leading-snug">{c.title}</h3><p className="mt-1 text-xs text-slate-500">{c.teacher?.name}</p><div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(c.startsAt)}</span><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(c.startsAt)}</span></div></Link>)}</div></section>;
}

function Certificate() {
  const [open, setOpen] = useState(false);
  return <section className="public-container public-section"><div className="certificate-strip"><div className="flex items-center gap-4"><span className="certificate-icon"><Award className="h-7 w-7" /></span><div><h2 className="text-xl font-bold">A certificate for your completed course.</h2><p className="mt-1 text-sm text-slate-500">Download it from your account. Verify it online using its ID.</p></div></div><div className="flex shrink-0 items-center gap-5"><button type="button" onClick={() => setOpen(true)} className="text-link">View sample <ArrowRight className="h-4 w-4" /></button><Link to="/verify" className="text-sm text-slate-500 hover:text-brand-600">Verify certificate</Link></div></div><Modal open={open} onClose={() => setOpen(false)} size="lg" title="Sample certificate"><div className="sample-certificate"><Award className="mx-auto h-10 w-10 text-brand-600" /><p className="mt-3 text-sm font-semibold">EcomClass</p><h3 className="mt-5 text-3xl font-bold">Certificate of Completion</h3><p className="mt-6 text-sm text-slate-500">Awarded to</p><p className="mt-2 text-2xl font-semibold">Your name</p><p className="mt-4 text-sm text-slate-500">for completing</p><p className="mt-2 text-lg font-semibold">Amazon Seller Mastery</p><p className="mt-8 text-xs text-slate-400">Sample only | Certificate ID issued on completion</p></div></Modal></section>;
}

export default function Home() {
  return <><Hero /><CourseCatalog /><Sessions /><Certificate /></>;
}
