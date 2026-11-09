import { Link } from 'react-router-dom';
import { ArrowUpRight, CirclePlay, Radio, Star } from 'lucide-react';
import { Avatar, formatCompact, formatCurrency } from '@ecomedu/ui';
import { PlatformLogo } from './PlatformLogo.jsx';

export function RatingStars({ value, count }) {
  return <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{value ? Number(value).toFixed(1) : 'New'}{count > 0 && <span className="font-normal text-slate-400">({formatCompact(count)})</span>}</span>;
}

export default function CourseCard({ course }) {
  return (
    <article className="course-card">
      <Link to={`/courses/${course.slug}`} className={`course-cover platform-${(course.category || '').toLowerCase().replace(/\W+/g, '-')}`} aria-label={`View ${course.title}`}>
        {course.thumbnail ? <img src={course.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <><PlatformLogo category={course.category} size={68} /><span className="course-cover-label">{course.category}</span></>}
        <span className="course-level">{course.level}</span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{course.category}</span><RatingStars value={course.rating} count={course.ratingCount} /></div>
        <h3 className="text-[18px] font-bold leading-snug tracking-tight text-ink"><Link to={`/courses/${course.slug}`} className="hover:text-brand-600">{course.title}</Link></h3>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><CirclePlay className="h-3.5 w-3.5" />{course.lessonsCount} lessons</span><span className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" />{course.liveClassesCount} live classes</span></div>
        {course.instructor && <div className="mt-4 flex items-center gap-2 text-xs text-slate-600"><Avatar name={course.instructor.name} src={course.instructor.avatar} size={24} />{course.instructor.name}</div>}
        <div className="mt-auto pt-5"><div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><span className="text-xl font-bold text-ink">{formatCurrency(course.price)}</span>{course.mrp > course.price && <span className="ml-2 text-xs text-slate-400 line-through">{formatCurrency(course.mrp)}</span>}</div><Link to={`/courses/${course.slug}`} className="course-link">View course <ArrowUpRight className="h-4 w-4" /></Link></div><Link to={`/courses/${course.slug}#curriculum`} className="mt-3 inline-block text-xs text-slate-500 hover:text-brand-600">See curriculum</Link></div>
      </div>
    </article>
  );
}
