import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { Link } from 'react-router-dom';
import { BookOpen, Clock } from 'lucide-react';
import { useRowHighlight } from '@ecomedu/ui';
import { Button, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatusBadge, brandGradient, cx, formatDate, progressTone, useGet } from './ui.js';

export default function MyCourses() {
  const { data = [], isLoading, error, refetch } = useGet('/learning/courses');
  const { isUnread, markRead } = useRowHighlight('courses');
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="My Courses" subtitle="All the courses you are enrolled in." actions={<Link to="/courses"><Button size="lg" variant="outline">Browse courses</Button></Link>} />
      {data.length === 0 ? <div className="card"><EmptyState icon={BookOpen} title="You have not enrolled in any course yet" description="Pick a course to get started with live classes and recordings." action={<Link to="/courses"><Button>Explore courses</Button></Link>} /></div> : (
        <div className="student-course-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.map((e) => (
            <article key={e.id} onClick={() => markRead(e.course.id)} className={cx('card overflow-hidden', isUnread(e.course.id) && 'is-new-card')}>
              <div className={cx('flex h-28 items-center gap-4 bg-gradient-to-br px-5', brandGradient(e.course.category))}><PlatformLogo category={e.course.category} src={e.course.thumbnail} size={60}  /><StatusBadge status={e.expired ? 'expired' : e.status} className="ml-auto" /></div>
              <div className="student-course-body p-5">
                <h3 className="text-[16px] font-extrabold leading-snug text-ink">{e.course.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{e.course.instructor?.name} · {e.batch?.name || 'Self-paced'}</p>
                <div className="mt-4 flex items-center gap-2"><ProgressBar value={e.progress} tone={progressTone(e.progress)} /><span className="w-10 text-right text-xs font-semibold text-slate-600">{e.progress}%</span></div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />Access until {formatDate(e.accessEnd)}</p>
                <Link to={`/app/courses/${e.course.id}`}><Button className="mt-4 w-full" disabled={e.expired}>{e.progress === 0 ? 'Start learning' : e.status === 'completed' ? 'Review course' : 'Continue'}</Button></Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
