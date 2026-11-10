import PageFrame from '../components/PageFrame.jsx';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, Lock, LogIn, Radio, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { Avatar, Badge, EmptyState, Spinner, formatCurrency, formatDateLong, formatTime, startsInLabel, useAuth, useGet } from '@ecomedu/ui';

function Shell({ children }) {
  return <PageFrame className="join-class-page">{children}</PageFrame>;
}

function Cta({ to, children, tone = 'primary' }) {
  const styles = tone === 'primary' ? 'bg-brand-600 text-white hover:bg-brand-700' : tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-slate-300 text-ink hover:border-brand-400';
  return <Link to={to} className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition ${styles}`}>{children}</Link>;
}

export default function JoinClass() {
  const { id } = useParams();
  const { user } = useAuth();
  const here = `/join/${id}`;
  const { data: cls, isLoading, error } = useGet(`/public/live-classes/${id}`, undefined, { refetchInterval: 15000 });
  const access = useGet(`/live-classes/${id}/access`, undefined, { enabled: Boolean(user && cls), refetchInterval: 15000 }).data;

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (error || !cls) return <Shell><EmptyState title="Class not found" description="This join link is not valid. Ask your teacher for a fresh link." action={<Link to="/courses" className="text-sm font-semibold text-brand-600 hover:underline">Browse courses →</Link>} /></Shell>;

  const over = ['completed', 'cancelled'].includes(cls.status);
  const live = cls.status === 'live';
  const minutes = Math.round((new Date(cls.startsAt) - Date.now()) / 60000);
  const course = cls.course;

  let action;
  let note;
  if (over) {
    action = <Cta to="/courses" tone="outline">Browse courses</Cta>;
    note = cls.status === 'cancelled' ? 'This class was cancelled.' : 'This class has ended. Recordings, if available, appear in your dashboard.';
  } else if (!user) {
    action = (<><Cta to={`/login?next=${encodeURIComponent(here)}`}><LogIn className="h-4 w-4" />Log in to join</Cta><Cta to={`/signup?next=${encodeURIComponent(here)}`} tone="outline">Create account</Cta></>);
    note = cls.isFreeDemo ? 'This is a free demo class. Create a free account or log in to join.' : 'Log in with the account that is enrolled in this course.';
  } else if (!access) {
    action = <div className="flex flex-1 justify-center py-3"><Spinner /></div>;
  } else if (access.allowed) {
    action = live
      ? <Cta to={`/app/live-classes?class=${id}`} tone="danger"><Radio className="h-4 w-4" />Join class now</Cta>
      : <Cta to="/app/live-classes" tone="outline">Open my live classes</Cta>;
    note = live ? 'The class is live. Allow camera and microphone when your browser asks.' : `Not started yet. This page updates automatically and the Join button appears when ${cls.teacher?.name || 'the teacher'} starts the class.`;
  } else if (access.reason === 'expired') {
    action = <Cta to={`/courses/${course?.slug}`}>Renew course access</Cta>;
    note = 'Your access to this course has expired. Renew it to join live classes.';
  } else {
    const preview = access.preview;
    const canPreview = access.reason === 'not_enrolled' || access.reason === 'expired';
    action = (
      <>
        {canPreview && preview?.available && <Cta to={`/app/live-classes?class=${id}`} tone="danger"><Radio className="h-4 w-4" />Watch free for {preview.secondsLeft} seconds</Cta>}
        <Cta to={`/courses/${course?.slug}`} tone={canPreview && preview?.available ? 'outline' : 'primary'}><Lock className="h-4 w-4" />Enroll to join · {formatCurrency(course?.price)}</Cta>
      </>
    );
    note = preview?.available
      ? `You are not enrolled in "${course?.title}", so you can watch a free ${preview.totalSeconds}-second preview. Enroll to stay for the full class.`
      : preview?.started && preview.secondsLeft <= 0
        ? 'Your free preview of this class is over. Enroll in the course to watch the full class and join all live sessions.'
        : `This class is for students enrolled in "${course?.title}". You can preview ${preview?.totalSeconds || 60} seconds once it is live, or enroll to join fully.`;
  }

  return (
    <Shell>
      <div className="public-panel overflow-hidden">
        <div className="join-class-header">
          <div className="flex flex-wrap items-center gap-2">
            {live ? <Badge tone="red" className="!bg-red-500 !text-white">● Live now</Badge> : over ? <Badge tone="slate">{cls.status === 'cancelled' ? 'Cancelled' : 'Ended'}</Badge> : <Badge tone="blue" className="!bg-white/70 !text-brand-800">{minutes > 0 ? startsInLabel(minutes) : 'Starting soon'}</Badge>}
            {cls.isFreeDemo && <Badge tone="amber"><Sparkles className="mr-1 h-3 w-3" />Free demo</Badge>}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">{cls.title}</h1>
          {cls.topic && <p className="mt-1 text-white/80">{cls.topic}</p>}
          <p className="mt-2 text-sm text-white/70">{course?.title}</p>
        </div>

        <div className="space-y-5 p-7">
          <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <li className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDateLong(cls.startsAt)}</li>
            <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-slate-400" />{formatTime(cls.startsAt)} · {cls.durationMin} min</li>
            <li className="flex items-center gap-2.5"><Video className="h-4 w-4 text-slate-400" />Live in your browser</li>
            <li className="flex items-center gap-2.5"><Avatar name={cls.teacher?.name} src={cls.teacher?.avatar} size={24} />{cls.teacher?.name}</li>
          </ul>
          {cls.description && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{cls.description}</p>}

          {user && <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-brand-600" />Signed in as <span className="font-semibold text-ink">{user.name}</span></p>}
          <div className="join-class-actions flex flex-wrap gap-3">{action}</div>
          {note && <p className="text-center text-xs leading-relaxed text-slate-500">{note}</p>}
        </div>
      </div>
    </Shell>
  );
}
