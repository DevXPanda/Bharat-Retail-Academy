import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Radio } from 'lucide-react';
import { Avatar, BRAND, Badge, EmptyState, Spinner, formatDate, formatTime, startsInLabel, useGet } from '@ecomedu/ui';
import { RatingStars } from '../components/CourseCard.jsx';

function Page({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <header className="mb-8"><h1 className="text-4xl font-extrabold tracking-tight text-ink">{title}</h1>{subtitle && <p className="mt-2 max-w-2xl text-slate-500">{subtitle}</p>}</header>
      {children}
    </div>
  );
}

export function PublicLiveClasses() {
  const { data = [], isLoading } = useGet('/public/live-classes');
  return (
    <Page title="Live Classes" subtitle="View the schedule. Enrolled students can join from their account.">
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div> : data.length === 0 ? <EmptyState icon={Radio} title="No live classes scheduled" description="Check back soon." /> : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Badge tone={c.status === 'live' ? 'red' : 'blue'}>{c.status === 'live' ? 'Live now' : startsInLabel(Math.round((new Date(c.startsAt) - Date.now()) / 60000))}</Badge>{c.isFreeDemo && <Badge tone="amber">Free demo</Badge>}</span><span className="text-xs text-slate-400">{c.course?.category}</span></div>
              <h3 className="mt-3 text-[17px] font-extrabold leading-snug text-ink">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.course?.title}</p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(c.startsAt)}</span><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(c.startsAt)} · {c.durationMin} min</span></p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2.5 text-sm font-semibold text-ink"><Avatar name={c.teacher?.name} src={c.teacher?.avatar} size={30} />{c.teacher?.name}</span>{c.isFreeDemo ? <Link to={`/join/${c.id}`} className="text-sm font-semibold text-brand-600 hover:underline">Join free →</Link> : <Link to={`/courses/${c.course?.slug}`} className="text-sm font-semibold text-brand-600 hover:underline">View course →</Link>}</div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}

export function Teachers() {
  const { data = [], isLoading } = useGet('/public/teachers');
  return (
    <Page title="Our Teachers" subtitle="Meet the people teaching your courses.">
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div> : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((t) => (
            <Link key={t.id} to={`/teachers/${t.id}`} className="block rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card transition hover:-translate-y-0.5 hover:border-brand-300">
              <Avatar name={t.name} src={t.avatar} size={88} className="mx-auto" />
              <h3 className="mt-4 text-lg font-extrabold text-ink">{t.name}</h3>
              <p className="text-sm text-slate-500">{t.teacher?.designation}</p>
              <div className="mt-3 flex justify-center"><Badge tone="blue">{t.teacher?.expertise}</Badge></div>
              <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span>{t.teacher?.experienceYears}+ yrs</span><span>{t.coursesCount} courses</span>{t.rating > 0 && <RatingStars value={t.rating} />}</div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

export function About() {
  return (
    <Page title={`About ${BRAND.name}`} subtitle="E-commerce courses in Hindi and English.">
      <div className="grid gap-6 md:grid-cols-3">
        {[['Course lessons', 'Learn about listings, pricing, orders and advertising.'], ['Live and recorded', 'Join scheduled classes and watch published recordings from your account.'], ['Certificates', 'Complete your course to receive a certificate after verification.']].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"><h3 className="text-lg font-extrabold text-ink">{t}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p></div>
        ))}
      </div>
    </Page>
  );
}
