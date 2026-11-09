import { Link } from 'react-router-dom';
import { ArrowRight, Award, CalendarCheck2, CheckCircle2, CirclePlay, LayoutGrid, Radio } from 'lucide-react';
import { EmptyState, ErrorState, PageLoader, StatCard, StatGrid, StatusBadge, formatDate, formatDuration, formatTime, useAuth, useGet } from './ui.js';
import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { StudentTable } from './components/StudentTable.jsx';

function SectionHeading({ title, subtitle, to, linkLabel }) {
  return <div className="student-section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><Link to={to}>{linkLabel}<ArrowRight className="h-4 w-4" /></Link></div>;
}

function CourseCell({ course, sub }) {
  return <div className="student-course-cell"><PlatformLogo category={course?.category} src={course?.thumbnail} size={38} /><div><p>{course?.title}</p>{sub && <span>{sub}</span>}</div></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useGet('/learning/dashboard', undefined, { refetchInterval: 60000 });
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error || 'Unable to load your dashboard'} onRetry={refetch} />;

  const { cards, continueLearning = [], upcomingClasses = [] } = data;
  const live = upcomingClasses.find((cls) => cls.status === 'live');
  const stats = [
    [LayoutGrid, 'My courses', cards.enrolled.value, '/app/courses', 'blue'],
    [CheckCircle2, 'Completed', cards.completed.value, '/app/courses', 'green'],
    [Award, 'Certificates', cards.certificates.value, '/app/certificates', 'purple'],
    [CalendarCheck2, 'Attendance', `${cards.attendanceRate.value}%`, '/app/live-classes', 'amber'],
    [Radio, 'Live now', cards.liveNow.value, '/app/live-classes', 'red'],
  ];

  const courseColumns = [
    { key: 'course', header: 'Course', width: '36%', render: (enrollment) => <CourseCell course={enrollment.course} sub={enrollment.course.instructor?.name} /> },
    { key: 'batch', header: 'Batch', render: (enrollment) => <span className="student-muted">{enrollment.batch?.name || 'Self-paced'}</span> },
    { key: 'progress', header: 'Progress', width: 180, render: (enrollment) => <div className="student-progress"><div role="progressbar" aria-label={`${enrollment.course.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={enrollment.progress}><span style={{ width: `${Math.min(100, Math.max(0, enrollment.progress))}%` }} /></div><span>{enrollment.progress}%</span></div> },
    { key: 'access', header: 'Access until', render: (enrollment) => <span className="student-nowrap">{formatDate(enrollment.accessEnd)}</span> },
    { key: 'action', header: 'Action', align: 'right', render: (enrollment) => <Link to={`/app/courses/${enrollment.course.id}`} className="student-row-action"><CirclePlay className="h-3.5 w-3.5" />{enrollment.progress ? 'Continue' : 'Start'}</Link> },
  ];
  const classColumns = [
    { key: 'class', header: 'Class', width: '32%', render: (cls) => <div className="student-course-cell"><PlatformLogo category={cls.course?.category} size={38} /><div><p>{cls.title}</p><span>{cls.course?.title}</span></div></div> },
    { key: 'teacher', header: 'Teacher', render: (cls) => <span className="student-muted">{cls.teacher?.name || '-'}</span> },
    { key: 'schedule', header: 'Date & time', render: (cls) => <div className="student-date"><span>{formatDate(cls.startsAt)}</span><small>{formatTime(cls.startsAt)}</small></div> },
    { key: 'duration', header: 'Duration', render: (cls) => <span className="student-nowrap">{formatDuration(cls.durationMin)}</span> },
    { key: 'status', header: 'Status', render: (cls) => <StatusBadge status={cls.status} /> },
    { key: 'action', header: 'Action', align: 'right', render: (cls) => <Link to={`/app/live-classes?class=${cls.id}`} className={cls.status === 'live' ? 'student-row-action student-action-live' : 'student-row-action'}>{cls.status === 'live' ? 'Join class' : 'View class'}<ArrowRight className="h-3.5 w-3.5" /></Link> },
  ];

  return (
    <div className="student-dashboard">
      <header className="student-page-heading"><div><p className="student-eyebrow">My learning / Overview</p><h1>Hello, {user.name.split(' ')[0]}</h1><p>Your courses, progress and class schedule.</p></div><Link to="/courses" className="student-browse">Browse courses<ArrowRight className="h-4 w-4" /></Link></header>
      <StatGrid cols={5}>{stats.map(([icon, label, value, to, tone]) => <StatCard key={label} icon={icon} label={label} value={value} to={to} tone={tone} />)}</StatGrid>
      {live && <div className="student-live-banner"><span className="student-live-dot" /><div><span>Live now</span><p>{live.title}</p></div><Link to={`/app/live-classes?class=${live.id}`}>Join class<ArrowRight className="h-4 w-4" /></Link></div>}
      <section className="student-panel"><SectionHeading title="Continue learning" subtitle="Your active courses and current progress." to="/app/courses" linkLabel="All my courses" /><StudentTable label="Active course progress" columns={courseColumns} rows={continueLearning} minWidth={780} empty={<EmptyState icon={LayoutGrid} title="No active courses" description="Your courses will appear here after enrollment." action={<Link to="/courses" className="text-link">Browse courses<ArrowRight className="h-4 w-4" /></Link>} />} /></section>
      <section className="student-panel"><SectionHeading title="Class schedule" subtitle="Upcoming sessions for your enrolled courses." to="/app/live-classes" linkLabel="Full schedule" /><StudentTable label="Upcoming live class schedule" columns={classColumns} rows={upcomingClasses} minWidth={860} empty={<EmptyState icon={CalendarCheck2} title="No classes scheduled" description="Your next sessions will appear here." />} /></section>
    </div>
  );
}
