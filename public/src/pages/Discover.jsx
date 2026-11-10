import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, CalendarDays, Clock, Radio } from 'lucide-react';
import { Avatar, BRAND, Badge, EmptyState, ErrorState, Spinner, formatDate, formatTime, startsInLabel, useGet } from '@ecomedu/ui';
import PageFrame from '../components/PageFrame.jsx';
import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { RatingStars } from '../components/CourseCard.jsx';

export function PublicLiveClasses() {
  const { data = [], isLoading, error, refetch } = useGet('/public/live-classes');
  return (
    <PageFrame title="Learn together, live." description="Find your next class. Ask questions, work through the lesson and revisit the recording later.">
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div> : error ? <ErrorState message={error} onRetry={refetch} /> : data.length === 0 ? <EmptyState icon={Radio} title="No live classes scheduled" description="Check back soon." /> : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <article key={c.id} className="public-panel public-live-card">
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Badge tone={c.status === 'live' ? 'red' : 'blue'}>{c.status === 'live' ? 'Live now' : startsInLabel(Math.round((new Date(c.startsAt) - Date.now()) / 60000))}</Badge>{c.isFreeDemo && <Badge tone="amber">Free demo</Badge>}</span><PlatformLogo category={c.course?.category} size={36} /></div>
              <h3 className="mt-3 text-[17px] font-extrabold leading-snug text-ink">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.course?.title}</p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(c.startsAt)}</span><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(c.startsAt)} · {c.durationMin} min</span></p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2.5 text-sm font-semibold text-ink"><Avatar name={c.teacher?.name} src={c.teacher?.avatar} size={30} />{c.teacher?.name}</span>{c.isFreeDemo ? <Link to={`/join/${c.id}`} className="text-sm font-semibold text-brand-600 hover:underline">Join free →</Link> : <Link to={`/courses/${c.course?.slug}`} className="text-sm font-semibold text-brand-600 hover:underline">View course →</Link>}</div>
            </article>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

export function Teachers() {
  const { data = [], isLoading, error, refetch } = useGet('/public/teachers');
  return (
    <PageFrame title="Meet your teachers." description="Get to know the people behind the lessons, their experience and what they teach.">
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div> : error ? <ErrorState message={error} onRetry={refetch} /> : !data.length ? <EmptyState title="Teacher profiles are on their way" description="Check back soon to meet your teachers." /> : (
        <div className="public-teacher-grid">
          {data.map((t) => <Link key={t.id} to={`/teachers/${t.id}`} className="public-panel public-teacher">
            <Avatar name={t.name} src={t.avatar} size={78} />
            <h3>{t.name}</h3>
            <p>{t.teacher?.designation || 'E-commerce educator'}</p>
            {t.teacher?.expertise && <p>{t.teacher.expertise}</p>}
            <div className="teacher-facts">{t.teacher?.experienceYears > 0 && <span>{t.teacher.experienceYears}+ years experience</span>}<span>{t.coursesCount} {t.coursesCount === 1 ? 'course' : 'courses'}</span>{t.rating > 0 && <RatingStars value={t.rating} />}</div>
            <span className="teacher-view-profile">View profile <ArrowUpRight size={15} aria-hidden="true" /></span>
          </Link>)}
        </div>
      )}
    </PageFrame>
  );
}

export function About() {
  return (
    <PageFrame title="Learning for the business you want to build." description={`${BRAND.name} brings practical e-commerce courses to learners in Hindi and English.`}>
      <div className="about-intro">
        <div><h2>Start with a question.<br />Leave with something you can use.</h2><p>How do I list my first product? What should I charge? Where do I find customers? These are the everyday questions our courses help you work through.</p><p>Choose your platform, learn with a teacher and practise as you go. Your lessons, class recordings and course materials stay together in your account.</p></div>
        <div className="about-note"><p>A new skill is a practical step towards a business of your own.</p><span>Learn at Bharat Retail Academy</span></div>
      </div>
      <div className="about-principles">{[
        ['01', 'Lessons you can put to work', 'Build skills in product listings, pricing, orders and advertising. Review the curriculum before choosing your course.'],
        ['02', 'A teacher to learn with', 'Join scheduled live classes and ask questions. When a recording is published, revisit it from your account.'],
        ['03', 'A record of your learning', 'Courses with certificates issue a verifiable completion certificate once you meet their requirements.'],
      ].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      <div className="public-callout"><p>Have a platform or a skill in mind? Find a course that fits your next step.</p><Link to="/courses" className="public-primary">Explore courses <ArrowRight size={16} /></Link></div>
    </PageFrame>
  );
}
