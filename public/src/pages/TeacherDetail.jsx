import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Globe, Instagram, Linkedin, MapPin, Youtube } from 'lucide-react';
import { Avatar, Badge, EmptyState, Spinner, useGet } from '@ecomedu/ui';
import CourseCard, { RatingStars } from '../components/CourseCard.jsx';

const SOCIALS = [['linkedin', Linkedin], ['youtube', Youtube], ['instagram', Instagram], ['website', Globe]];

export default function TeacherDetail() {
  const { id } = useParams();
  const { data: t, isLoading, error } = useGet(`/public/teachers/${id}`);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (error || !t) return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Teacher not found" description="This profile is not available." action={<Link to="/teachers" className="text-sm font-semibold text-brand-600 hover:underline">All teachers →</Link>} /></div>;

  const info = t.teacher || {};
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <Link to="/teachers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" />All teachers</Link>

      <section className="mt-5 flex flex-wrap items-center gap-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
        <Avatar name={t.name} src={t.avatar} size={120} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t.name}</h1>
          <p className="mt-1 font-medium text-slate-600">{info.designation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">{info.expertise && <Badge tone="blue">{info.expertise}</Badge>}{t.location && <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{t.location}</span>}</div>
          <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            {[[`${info.experienceYears ?? 0}+ yrs`, 'Experience'], [t.courses.length, 'Courses'], [t.studentsCount, 'Students'], [t.rating > 0 ? <RatingStars value={t.rating} /> : '—', 'Rating']].map(([value, label]) => (
              <div key={label}><p className="text-lg font-extrabold text-ink">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5 self-start">
          {SOCIALS.filter(([k]) => info.social?.[k]).map(([k, Icon]) => <a key={k} href={info.social[k]} target="_blank" rel="noreferrer" aria-label={k} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-600"><Icon className="h-4 w-4" /></a>)}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {(t.about || info.bio) && (<><h2 className="text-xl font-extrabold text-ink">About</h2><p className="mt-3 leading-relaxed text-slate-600">{t.about || info.bio}</p></>)}
          <h2 className="mt-9 text-xl font-extrabold text-ink">Courses by {t.name.split(' ')[0]}</h2>
          {t.courses.length === 0 ? <p className="mt-3 text-sm text-slate-500">No published courses yet.</p> : <div className="mt-4 grid gap-6 sm:grid-cols-2">{t.courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>}
        </div>
        <aside className="space-y-6">
          {info.skills?.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><h3 className="font-extrabold text-ink">Skills</h3><div className="mt-3 flex flex-wrap gap-2">{info.skills.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</div></div>}
          {info.languages?.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><h3 className="font-extrabold text-ink">Teaches in</h3><p className="mt-2 text-sm text-slate-600">{info.languages.join(', ')}</p></div>}
          {(info.education?.length > 0 || info.certifications?.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="font-extrabold text-ink">Education &amp; certifications</h3>
              <ul className="mt-3 space-y-3 text-sm">{[...(info.education || []).map((e) => [e.title, [e.institute, e.year]]), ...(info.certifications || []).map((e) => [e.title, [e.issuer, e.year]])].map(([title, meta]) => <li key={title}><p className="font-semibold text-ink">{title}</p><p className="text-xs text-slate-500">{meta.filter(Boolean).join(' | ')}</p></li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
