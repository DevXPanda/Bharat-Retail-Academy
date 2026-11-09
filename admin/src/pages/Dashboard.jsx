import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, CheckCircle2, CreditCard, Layers, PlayCircle, Plus, RotateCcw, ShieldCheck, UserCheck, Users, Video, Wallet, GraduationCap, Clock, Banknote } from 'lucide-react';
import {
  Button, ClassCell, DataTable, DateTimeCell, EmptyState, ErrorState, ExpertiseTag, PageHeader, PageLoader, PersonCell, SeatsCell, StatCard, StatGrid, StatusBadge, TableCard,
  ViewAll, formatCurrency, formatDateLong, formatDuration, formatNumber, indexColumn, useGet,
} from '../components/ui.jsx';

const CARDS = [
  ['students', 'Total Students', Users, 'blue'],
  ['courses', 'Total Courses', BookOpen, 'green'],
  ['activeStudents', 'Active Students', UserCheck, 'orange'],
  ['revenue', 'Total Payments', CreditCard, 'green', 'currency'],
  ['pendingAccess', 'Pending Access', Clock, 'purple'],
  ['teachers', 'Total Teachers', GraduationCap, 'blue'],
  ['payoutsPaid', 'Teacher Payouts', Wallet, 'green', 'currency'],
  ['activeCourses', 'Active Courses', ShieldCheck, 'orange'],
  ['refunds', 'Total Refunds', RotateCcw, 'red', 'currency'],
  ['pendingPayouts', 'Pending Payouts', Banknote, 'orange', 'currency'],
  ['liveClasses', 'Live Classes', Video, 'blue'],
  ['completedCourses', 'Completed Courses', CheckCircle2, 'green'],
  ['upcomingClasses', 'Upcoming Classes', CalendarDays, 'orange'],
  ['recordings', 'Class Recordings', PlayCircle, 'purple'],
  ['batches', 'Total Batches', Layers, 'orange'],
];

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const now = useNow();
  const { data, isLoading, error, refetch } = useGet('/dashboard/admin', undefined, { refetchInterval: 60000 });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const classColumns = [
    indexColumn(),
    { key: 'title', header: 'Class Title', render: (c) => <ClassCell cls={c} /> },
    { key: 'course', header: 'Course', render: (c) => <span className="line-clamp-2 min-w-[100px] text-[13px] text-slate-600">{c.course?.title}</span> },
    { key: 'startsAt', header: 'Date & Time', render: (c) => <DateTimeCell value={c.startsAt} /> },
    { key: 'duration', header: 'Duration', render: (c) => formatDuration(c.durationMin) },
    { key: 'students', header: 'Students', render: (c) => <SeatsCell value={c.enrolledCount} max={c.maxStudents} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'action',
      header: 'Action',
      render: (c) => (
        <Button size="sm" variant={c.status === 'live' ? 'danger' : 'primary'} onClick={() => navigate(`/live-classes?class=${c.id}`)}>
          {c.status === 'live' ? 'Enter' : 'Start'}
        </Button>
      ),
    },
  ];

  const attendanceColumns = [
    indexColumn(),
    { key: 'date', header: 'Date', render: (r) => <DateTimeCell value={r.date} /> },
    { key: 'course', header: 'Course', render: (r) => <span className="line-clamp-2 min-w-[110px]">{r.course}</span> },
    { key: 'teacher', header: 'Teacher', render: (r) => r.teacher },
    { key: 'duration', header: 'Duration', render: (r) => formatDuration(r.durationMin) },
    { key: 'total', header: 'Total Students', align: 'center', render: (r) => r.totalStudents },
    { key: 'attended', header: 'Attended', align: 'center', render: (r) => r.attended },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const studentColumns = [
    indexColumn(),
    { key: 'name', header: 'Name', render: (s) => <PersonCell name={s.name} src={s.avatar} size={32} /> },
    { key: 'email', header: 'Email', render: (s) => <span className="text-slate-600">{s.email}</span> },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '—' },
    { key: 'course', header: 'Course Assigned', render: (s) => s.enrollments?.[0]?.course?.title || '—' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ];

  const teacherColumns = [
    indexColumn(),
    { key: 'teacher', header: 'Teacher Details', render: (t) => <PersonCell name={t.name} sub={t.email} src={t.avatar} size={34} /> },
    { key: 'expertise', header: 'Expertise', render: (t) => <ExpertiseTag value={t.teacher?.expertise} /> },
    { key: 'courses', header: 'Assigned Courses', render: (t) => `${t.assignedCourses.length} Course${t.assignedCourses.length === 1 ? '' : 's'}` },
    { key: 'classes', header: 'Classes', align: 'center', render: (t) => t.classesCount },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Students, classes and academy activity."
        actions={
          <>
            <span className="admin-dashboard-date"><CalendarDays size={15} />{formatDateLong(now)}</span>
            <Button size="lg" icon={Plus} onClick={() => navigate('/students?new=1')}>Add student</Button>
          </>
        }
      />

      <StatGrid cols={5}>
        {CARDS.map(([key, label, icon, tone, kind]) => (
          <StatCard key={key} icon={icon} tone={tone} label={label} value={kind === 'currency' ? formatCurrency(data.cards[key].value) : formatNumber(data.cards[key].value)} />
        ))}
      </StatGrid>

      <div className="admin-dashboard-tables">
        <TableCard title="Scheduled classes" action={<ViewAll to="/live-classes" />}>
          <DataTable columns={classColumns} rows={data.scheduledClasses} minWidth={900} empty={<EmptyState icon={CalendarDays} title="No classes scheduled" description="Scheduled classes will appear here." action={<ViewAll to="/live-classes" label="Schedule a class" />} />} />
        </TableCard>
        <TableCard title="Class attendance" action={<ViewAll to="/attendance" />}>
          <DataTable columns={attendanceColumns} rows={data.attendance} minWidth={900} empty={<EmptyState icon={UserCheck} title="No attendance yet" description="Attendance will appear after classes are completed." />} />
        </TableCard>
      </div>

      <div className="admin-dashboard-people">
        <TableCard title="Students" action={<ViewAll to="/students" />}>
          <DataTable columns={studentColumns} rows={data.students} minWidth={640} />
        </TableCard>
        <TableCard title="Teachers" action={<ViewAll to="/teachers" />}>
          <DataTable columns={teacherColumns} rows={data.teachers} minWidth={640} />
        </TableCard>
      </div>
    </>
  );
}
