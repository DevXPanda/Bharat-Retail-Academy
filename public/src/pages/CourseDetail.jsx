import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, BookOpen, CheckCircle2, ChevronDown, Clock, FileText, Globe, Infinity as InfinityIcon, PlayCircle, Radio, Star, Users } from 'lucide-react';
import { Avatar, Button, ErrorState, Modal, PageLoader, brandGradient, cx, formatCompact, formatCurrency, formatDate, formatDuration, computePrice, useAuth } from '@ecomedu/ui';
import { useGet } from '@ecomedu/ui';
import { RatingStars } from '../components/CourseCard.jsx';
import { useCheckout } from '../lib/checkout.js';

function Curriculum({ modules }) {
  const [open, setOpen] = useState(modules[0]?.id);
  const [preview, setPreview] = useState(null);
  return (
    <div id="curriculum" className="scroll-mt-24">
      <h2 className="text-2xl font-extrabold text-ink">Course curriculum</h2>
      <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {modules.map((m, i) => {
          const minutes = m.lessons.reduce((s, l) => s + (l.durationMin || 0), 0);
          const isOpen = open === m.id;
          return (
            <div key={m.id || i}>
              <button type="button" onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50">
                <ChevronDown className={cx('h-4 w-4 text-slate-500 transition', isOpen && 'rotate-180')} />
                <span className="flex-1 text-[15px] font-bold text-ink">Module {i + 1}: {m.title}</span>
                <span className="text-xs text-slate-500">{m.lessons.length} lessons · {formatDuration(minutes)}</span>
              </button>
              {isOpen && (
                <ul className="border-t border-slate-100 bg-slate-50/60">
                  {m.lessons.map((l, li) => (
                    <li key={l.id || li} className="flex items-center gap-3 px-5 py-3 pl-12 text-sm text-slate-700">
                      <PlayCircle className="h-4 w-4 text-brand-500" />
                      <span className="flex-1">{l.title}</span>
                      {l.isPreview && l.url && <button type="button" onClick={() => setPreview(l)} className="text-xs font-semibold text-brand-600 hover:underline">Preview</button>}
                      <span className="text-xs text-slate-400">{l.durationMin}m</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} size="lg" title={preview?.title}>{preview && <video src={preview.url} controls autoPlay className="aspect-video w-full rounded-xl bg-black" />}</Modal>
    </div>
  );
}

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { buy, loading } = useCheckout();
  const { data: course, isLoading, error, refetch } = useGet(`/public/courses/${slug}`);
  const taxSettings = useGet('/public/settings').data;
  const pricing = course && taxSettings && course.price > 0 ? computePrice(course.price, taxSettings) : null;

  useEffect(() => {
    if (course && window.location.hash === '#curriculum') setTimeout(() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [course]);

  if (isLoading) return <PageLoader />;
  if (error || !course) return <div className="py-20"><ErrorState message={error || 'Course not found'} onRetry={refetch} /></div>;

  const totalMinutes = course.modules.reduce((s, m) => s + m.lessons.reduce((a, l) => a + (l.durationMin || 0), 0), 0);
  const includes = [
    [PlayCircle, `${course.lessonsCount} recorded lessons (${formatDuration(totalMinutes)})`],
    [Radio, `${course.liveClassesCount} live classes with doubt clearing`],
    [FileText, 'Assignments & practical tasks'],
    [Award, course.settings?.certificate ? 'Verified completion certificate' : 'Course completion'],
    [InfinityIcon, `${course.settings?.accessDays || 365} days access`],
  ];

  return (
    <>
      <section className={cx('bg-gradient-to-br', brandGradient(course.category))}>
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-center gap-3"><PlatformLogo category={course.category} src={course.thumbnail} size={52} /><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-brand-700">{course.category}</span>{course.badge && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{course.badge}</span>}</div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-slate-600">{course.shortDescription}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <RatingStars value={course.rating} count={course.ratingCount} />
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{formatCompact(course.enrolledCount)} enrolled</span>
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" />{course.language}</span>
              <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" />{course.level}</span>
            </div>
            {course.instructor && <div className="mt-6 flex items-center gap-3"><Avatar name={course.instructor.name} src={course.instructor.avatar} size={44} /><div><p className="text-xs text-slate-500">Instructor</p><p className="text-sm font-bold text-ink">{course.instructor.name} <span className="font-normal text-slate-500">· {course.instructor.teacher?.designation}</span></p></div></div>}
          </div>

          <aside className="self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-pop lg:sticky lg:top-24">
            <div className="flex items-end gap-3"><span className="text-3xl font-extrabold text-ink">{formatCurrency(course.price)}</span>{course.mrp > course.price && <span className="pb-1 text-slate-400 line-through">{formatCurrency(course.mrp)}</span>}{course.discountPercent > 0 && <span className="mb-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{course.discountPercent}% off</span>}</div>
            {pricing && pricing.gstAmount > 0 && (
              pricing.gstMode === 'exclusive' ? (
                <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Course price</span><span>{formatCurrency(pricing.coursePrice)}</span></div>
                  <div className="flex justify-between"><span>GST ({pricing.gstPercent}%)</span><span>+ {formatCurrency(pricing.gstAmount)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-ink"><span>You pay</span><span>{formatCurrency(pricing.total)}</span></div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Inclusive of {pricing.gstPercent}% GST</p>
              )
            )}
            {course.enrolled ? (
              <Link to="/app/courses" className="mt-5 flex h-12 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700">Go to my course</Link>
            ) : (
              <Button size="lg" className="mt-5 h-12 w-full text-[15px]" loading={loading} onClick={() => buy(course)}>{user ? 'Enroll now' : 'Login to enroll'}</Button>
            )}
            <p className="mt-3 text-center text-xs text-slate-500">Secure payment via Razorpay · UPI, cards, netbanking</p>
            <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-700">{includes.map(([Icon, text]) => <li key={text} className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{text}</li>)}</ul>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-12 px-4 py-12 sm:px-6 lg:max-w-[1280px] lg:pr-[440px]">
        {course.description && <section><h2 className="text-2xl font-extrabold text-ink">About this course</h2><div className="mt-4 space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{course.description}</div></section>}
        <section><h2 className="text-2xl font-extrabold text-ink">Included with this course</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{['Recorded course lessons', 'Live classes', 'Course assignments', 'Teacher messaging'].map((t) => <li key={t} className="flex items-center gap-2.5 text-[14px] text-slate-700"><CheckCircle2 className="h-5 w-5 text-emerald-500" />{t}</li>)}</ul></section>
        {course.modules.length > 0 && <Curriculum modules={course.modules} />}
        {course.instructor && (
          <section><h2 className="text-2xl font-extrabold text-ink">Instructor</h2>
            <div className="mt-4 flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5"><Avatar name={course.instructor.name} src={course.instructor.avatar} size={72} /><div><p className="text-lg font-bold text-ink">{course.instructor.name}</p><p className="text-sm text-slate-500">{course.instructor.teacher?.designation}</p><p className="mt-1 text-sm text-slate-600">{course.instructor.teacher?.experienceYears}+ years of experience · {course.instructor.teacher?.expertise}</p></div></div></section>
        )}
        {course.reviews?.length > 0 && (
          <section><h2 className="text-2xl font-extrabold text-ink">Student reviews</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">{course.reviews.map((r) => <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><Avatar name={r.student?.name} size={36} /><div><p className="text-sm font-bold text-ink">{r.student?.name}</p><p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p></div><span className="ml-auto flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</span></div>{r.comment && <p className="mt-3 text-sm text-slate-600">{r.comment}</p>}</li>)}</ul></section>
        )}
      </div>
    </>
  );
}
