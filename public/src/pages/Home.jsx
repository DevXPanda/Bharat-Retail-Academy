import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Clock, LayoutGrid, Mail, Phone, Star } from 'lucide-react';
import { Avatar, Button, EmptyState, ErrorState, Field, Input, Modal, Select, Spinner, formatDate, formatTime, useAction, useAuth, useClient, useGet, BRAND, BrandMark } from '@ecomedu/ui';
import CourseCard from '../components/CourseCard.jsx';
import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { useAuthModal } from '../components/AuthModal.jsx';
import { GOALS } from '../config.js';
import '../home-page.css';

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
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Your name" required error={errors.name} className="sm:col-span-2"><Input autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" /></Field>
        <Field label="Email" required error={errors.email}><Input type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" /></Field>
        <Field label="Mobile" required error={errors.phone}><Input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" /></Field>
        <Field label="What do you want to learn?" className="sm:col-span-2"><Select value={form.goal} onChange={(e) => set('goal', e.target.value)}><option value="">Select a topic</option>{GOALS.map((goal) => <option key={goal}>{goal}</option>)}</Select></Field>
      </div>
      <Button type="submit" loading={send.loading} className="mt-5 w-full" icon={ArrowRight}>Call me back</Button>
    </form>
  );
}

function Hero() {
  const { user } = useAuth();
  const { open } = useAuthModal();
  return (
    <section className="home-hero2" aria-labelledby="home-title">
      <div className="public-container hero2-grid">
        <div className="hero2-copy">
          <h1 id="home-title"><span className="hero2-headline">Your business. Your next chapter.</span><span className="hero2-mark">Start learning.</span></h1>
          <p>Take your first step into selling online. Learn Amazon, Flipkart, Meesho and Shopify with teachers who know the business.</p>
          <div className="hero2-actions mt-7 flex flex-wrap gap-3">
            <Link to="/courses" className="public-primary hero2-cta">Explore courses <ArrowRight className="h-4 w-4" /></Link>
            {user ? <Link to="/app" className="hero-text-cta">My learning <ArrowUpRight className="h-4 w-4" /></Link> : <button type="button" onClick={() => open('signup')} className="hero-text-cta">Join the academy <ArrowUpRight className="h-4 w-4" /></button>}
          </div>
          <div className="hero2-notes"><span>Hindi &amp; English</span><span>Live lessons + recordings</span></div>
        </div>
      </div>
    </section>
  );
}

function PlatformStrip() {
  const categories = useGet('/public/categories').data || [];
  if (!categories.length) return null;
  const platforms = Array.from({ length: Math.ceil(10 / categories.length) }, () => categories).flat();
  return (
    <section className="platform-strip" aria-label="Course platforms">
      <div className="public-container platform-slider">
        <div className="platform-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="platform-slide-group" aria-hidden={copy === 1 ? true : undefined}>
              {platforms.map((category, index) => <Link key={`${category.name}-${index}`} to={`/courses?category=${encodeURIComponent(category.name)}`} tabIndex={copy === 1 ? -1 : undefined}><PlatformLogo category={category.name} size={30} /><span>{category.name}</span></Link>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CourseCatalog() {
  const [category, setCategory] = useState('all');
  const categories = useGet('/public/categories').data || [];
  const courses = useGet('/public/courses', { limit: 6, category, sort: 'popular' });
  return (
    <section className="public-container home-block" id="courses">
      <div className="section-heading"><div><h2>A new skill. A good place to start.</h2><p className="section-description">Choose what you want to work on. Take it one lesson at a time.</p></div><Link to="/courses" className="text-link">Browse all courses <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="platform-filters" aria-label="Filter courses by platform">
        <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')} className={category === 'all' ? 'selected' : ''}><LayoutGrid className="h-5 w-5" /><span>All courses</span></button>
        {categories.map((c) => <button key={c.name} type="button" aria-pressed={category === c.name} onClick={() => setCategory(c.name)} className={category === c.name ? 'selected' : ''}><PlatformLogo category={c.name} size={26} /><span>{c.name}</span><small>{c.count}</small></button>)}
      </div>
      {courses.isLoading ? <div className="flex justify-center py-14"><Spinner /></div> : courses.error ? <ErrorState message={courses.error} onRetry={courses.refetch} /> : !courses.data?.length ? <EmptyState title="No courses in this category yet" /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{courses.data.map((course) => <CourseCard key={course.id} course={course} />)}</div>}
    </section>
  );
}

const STEPS = [
  ['Pick a course', 'Choose a platform or skill. Every course lists its lessons, live classes and price up front, so there are no surprises.'],
  ['Learn live, rewatch anytime', 'Join scheduled classes with your teacher and ask questions as they happen. Missed one? The recording is waiting in your dashboard.'],
  ['Practise and get certified', 'Finish the lessons and assignments, then download a completion certificate that anyone can verify online.'],
];

function HowItWorks() {
  return (
    <section className="how-band">
      <div className="public-container">
        <div className="how-head"><h2>Make room for<br />your next step.</h2><p>You don't need to know it all to get started.</p></div>
        <ol className="how-steps">{STEPS.map(([title, text], i) => <li key={title}><span className="how-num">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      </div>
    </section>
  );
}

function Teachers() {
  const { data = [] } = useGet('/public/teachers');
  const shown = data.slice(0, 4);
  if (!shown.length) return null;
  return (
    <section className="public-container home-block">
      <div className="section-heading"><div><h2>Learn from people who sell for a living</h2></div><Link to="/teachers" className="text-link">Meet all teachers <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((t) => (
          <Link key={t.id} to={`/teachers/${t.id}`} className="teacher-card">
            <Avatar name={t.name} src={t.avatar} size={84} />
            <h3>{t.name}</h3>
            <p>{t.teacher?.designation || t.teacher?.expertise || 'E-commerce expert'}</p>
            <div className="teacher-meta">
              {t.rating > 0 && <span><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{t.rating}</span>}
              <span>{t.coursesCount} {t.coursesCount === 1 ? 'course' : 'courses'}</span>
            </div>
            <span className="teacher-profile-link">Meet your teacher <ArrowUpRight size={14} aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Sessions() {
  const { data = [] } = useGet('/public/live-classes');
  if (!data.length) return null;
  return (
    <section className="public-container home-block">
      <div className="section-heading"><div><h2>Upcoming live classes</h2></div><Link to="/live-classes" className="text-link">Full schedule <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.slice(0, 3).map((c) => (
          <Link key={c.id} to={`/courses/${c.course?.slug}`} className="session-card">
            <div className="flex items-center justify-between"><PlatformLogo category={c.course?.category} size={42} /><span className={c.status === 'live' ? 'session-live' : 'section-kicker'}>{c.status === 'live' ? 'Live now' : c.isFreeDemo ? 'Free demo' : 'Scheduled'}</span></div>
            <h3 className="mt-4 text-base font-bold leading-snug">{c.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{c.teacher?.name}</p>
            <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(c.startsAt)}</span><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(c.startsAt)}</span></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  ['How do the live classes work?', 'Open the class from your dashboard and it starts right in your browser. There is nothing to install. You can talk to the teacher and use the chat.'],
  ['What if I miss a class?', 'Teachers publish the recording after class, and it appears under Class Recordings in your dashboard. You can watch it whenever you like.'],
  ['Can I try a course before I buy it?', 'Yes. Many courses have free preview lessons, and you can sit in a live class for a minute before deciding. Free demo classes are open to any registered student.'],
  ['How long will I have access?', 'Each course page shows its access period before you pay, and your dashboard shows the exact date your access runs until.'],
  ['Will I get a certificate?', 'Courses that include one issue a completion certificate once you finish. Anyone can check it is genuine on our Verify certificate page.'],
  ['How do I pay, and do I get an invoice?', 'You pay online through Razorpay. A GST invoice for every purchase is available to download from the Payments page in your dashboard.'],
];

function Faq() {
  return (
    <section className="public-container home-block faq-grid">
      <div>
        <h2>A few things<br />you might be wondering.</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Cannot find your answer? Use the form on this page and we will call you, or write to our support team.</p>
      </div>
      <div className="faq-list">{FAQS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>
  );
}

function Counselling() {
  const site = useGet('/public/settings').data;
  return (
    <section className="public-container home-block">
      <div className="counsel">
        <div className="counsel-copy">
          <h2>Let's find your<br />starting point.</h2>
          <p>New to selling? Already running a store? Tell us a little about your plans and we'll help you choose a course.</p>
          <ul>
            {site?.supportPhone && <li><Phone className="h-4 w-4" /><span><a href={`tel:${site.supportPhone.replace(/\s/g, '')}`}>{site.supportPhone}</a>{site.supportHours && <small>{site.supportHours}</small>}</span></li>}
            {site?.supportEmail && <li><Mail className="h-4 w-4" /><a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></li>}
          </ul>
        </div>
        <LeadForm />
      </div>
    </section>
  );
}

function Certificate() {
  const [open, setOpen] = useState(false);
  return (
    <section className="public-container home-block">
      <div className="certificate-strip">
        <div className="flex items-center gap-4"><span className="certificate-icon"><Award className="h-7 w-7" /></span><div><h2 className="text-xl">A certificate for your completed course.</h2><p className="mt-1 text-sm text-slate-500">Download it from your account. Verify it online using its ID.</p></div></div>
        <div className="flex shrink-0 items-center gap-5"><button type="button" onClick={() => setOpen(true)} className="text-link">View sample <ArrowRight className="h-4 w-4" /></button><Link to="/verify" className="text-sm text-slate-500 hover:text-brand-600">Verify certificate</Link></div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title="Sample certificate"><div className="sample-certificate"><BrandMark size={64} className="mx-auto" /><p className="mt-3 text-sm font-semibold">{BRAND.name}</p><h3 className="mt-5 text-3xl font-bold">Certificate of Completion</h3><p className="mt-6 text-sm text-slate-500">Awarded to</p><p className="mt-2 text-2xl font-semibold">Your name</p><p className="mt-4 text-sm text-slate-500">for completing</p><p className="mt-2 text-lg font-semibold">Amazon Seller Mastery</p><p className="mt-8 text-xs text-slate-400">Sample only | Certificate ID issued on completion</p></div></Modal>
    </section>
  );
}

export default function Home() {
  return <div className="academy-home"><Hero /><PlatformStrip /><CourseCatalog /><HowItWorks /><Teachers /><Sessions /><Certificate /><Faq /><Counselling /></div>;
}
