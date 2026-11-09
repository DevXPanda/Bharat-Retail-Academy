import { PortalInsights } from '../components/ui.jsx';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, Pause, Play, Plus, Users, Video, IndianRupee } from 'lucide-react';
import {
  Avatar, Button, Card, ClassForm, CourseMark, DataTable, ErrorState, Modal, PageHeader, PageLoader, ProgressBar, StatCard, StatGrid, StatusBadge, TableCard, ViewAll,
  formatCurrency, formatDate, formatDateLong, formatTime, indexColumn, initials, progressTone, startsInLabel, timeAgo, useAuth, useGet,
} from '../components/ui.jsx';

function StartsPill({ cls }) {
  if (cls.status === 'live') return <span className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">Live now</span>;
  return <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">{startsInLabel(cls.startsInMinutes)}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scheduling, setScheduling] = useState(false);
  const { data, isLoading, error, refetch } = useGet('/dashboard/teacher', undefined, { refetchInterval: 60000 });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const studentColumns = [
    indexColumn(),
    { key: 'name', header: 'Student Name', render: (s) => <div className="flex items-center gap-2.5"><Avatar name={s.name} src={s.avatar} size={28} /><span className="font-medium text-ink">{s.name}</span></div> },
    { key: 'course', header: 'Course', render: (s) => <span className="text-slate-600">{s.course}</span> },
    { key: 'progress', header: 'Progress', render: (s) => <div className="flex min-w-[110px] items-center gap-2"><ProgressBar value={s.progress} tone={progressTone(s.progress)} /><span className="w-9 text-xs text-slate-600">{s.progress}%</span></div> },
    { key: 'last', header: 'Last Active', render: (s) => (s.lastActive ? formatDate(s.lastActive) : '—') },
    { key: 'a', header: 'Action', render: () => <Button size="sm" variant="soft" onClick={() => navigate('/students')}>View</Button> },
  ];

  const assignmentColumns = [
    indexColumn(),
    { key: 'title', header: 'Title', render: (a) => <span className="font-medium text-ink">{a.title}</span> },
    { key: 'course', header: 'Course', render: (a) => <span className="text-slate-600">{a.course}</span> },
    { key: 'sub', header: 'Submissions', render: (a) => `${a.submissions}/${a.enrolled}` },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  const schedule = data.todaySchedule;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle="Your classes, students and teaching schedule."
        actions={
          <>
            <div className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex"><CalendarDays className="h-4 w-4" />{formatDateLong(new Date())}</div>
            <Button size="lg" icon={Plus} onClick={() => setScheduling(true)}>Schedule New Class</Button>
          </>
        }
      />

      <StatGrid cols={5}>
        <StatCard icon={Video} tone="blue" label="Total Classes" value={data.cards.totalClasses.value} trend={data.cards.totalClasses.trend} />
        <StatCard icon={Users} tone="green" label="Total Students" value={data.cards.totalStudents.value} trend={data.cards.totalStudents.trend} />
        <StatCard icon={Play} tone="orange" label="Upcoming Classes" value={data.cards.upcoming.value} sub={<Link to="/live-classes" className="font-semibold text-brand-600 hover:underline">View Schedule →</Link>} />
        <StatCard icon={CheckCircle2} tone="purple" label="Completed Classes" value={data.cards.completed.value} trend={undefined} />
        <StatCard icon={IndianRupee} tone="red" label="Total Earnings" value={formatCurrency(data.cards.earnings.value)} trend={data.cards.earnings.trend} />
      </StatGrid>

      <PortalInsights className="mt-6">
        <Card title="Upcoming Live Classes" action={<ViewAll to="/classes" />}>
          <ul className="divide-y divide-slate-100">
            {data.upcomingClasses.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No upcoming classes. Schedule one to get started.</li>}
            {data.upcomingClasses.map((c) => (
              <li key={c.id} className="teacher-schedule-row flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <CourseMark category={c.course?.category} src={c.course?.thumbnail} size={52} className="!rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.course?.title}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-5 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(c.startsAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(c.startsAt)} - {formatTime(new Date(new Date(c.startsAt).getTime() + c.durationMin * 60000))}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StartsPill cls={c} />
                  <Button size="sm" variant={c.status === 'live' || c.startsInMinutes < 180 ? 'primary' : 'soft'} onClick={() => navigate(`/live-classes?class=${c.id}`)}>{c.status === 'live' || c.startsInMinutes < 180 ? 'Join Class' : 'View Details'}</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Today's Schedule" action={<ViewAll to="/classes" label="View Calendar" />}>
          <ol className="relative space-y-5 border-l border-slate-200 pl-6">
            {schedule.length === 0 && <li className="text-sm text-slate-500">No classes scheduled for today.</li>}
            {schedule.map((c) => {
              const done = c.status === 'completed';
              const live = c.status === 'live';
              return (
                <li key={c.id} className="relative flex items-center gap-3">
                  <span className={`absolute -left-[31px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${done ? 'bg-emerald-500' : live ? 'bg-red-500' : 'bg-brand-500'}`} />
                  <div className="w-[88px] shrink-0 text-xs text-slate-500"><p className="font-semibold text-slate-700">{formatTime(c.startsAt)}</p><p>- {formatTime(new Date(new Date(c.startsAt).getTime() + c.durationMin * 60000))}</p></div>
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-ink">{c.title}</p><p className="truncate text-xs text-slate-500">{c.course?.title}</p></div>
                  <StatusBadge status={done ? 'completed' : live ? 'live' : 'upcoming'} label={done ? 'Completed' : live ? 'Live Now' : 'Scheduled'} />
                </li>
              );
            })}
          </ol>
        </Card>
      </PortalInsights>

      <div className="teacher-table-stack">
        <TableCard title="My Students" action={<ViewAll to="/students" />}><DataTable columns={studentColumns} rows={data.students} minWidth={620} empty={<p className="py-10 text-center text-sm text-slate-500">No students enrolled yet.</p>} /></TableCard>
        <TableCard title="Recent Assignments" action={<ViewAll to="/assignments" />}><DataTable columns={assignmentColumns} rows={data.assignments} minWidth={560} empty={<p className="py-10 text-center text-sm text-slate-500">No assignments yet.</p>} /></TableCard>
      </div>

      <Modal open={scheduling} onClose={() => setScheduling(false)} size="lg" title="Schedule New Class" subtitle="Students of the selected course are notified automatically.">
        <ClassForm role="teacher" onSaved={() => setScheduling(false)} onCancel={() => setScheduling(false)} />
      </Modal>
    </>
  );
}
