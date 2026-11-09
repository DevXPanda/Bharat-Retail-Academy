import { useState } from 'react';
import { Clock, MessageCircle, PenSquare, Users } from 'lucide-react';
import { Avatar, Button, ChatCenter, PageHeader, ProgressBar, StatCard, StatGrid, StatusBadge, ViewAll, chatTime, formatDate, formatNumber, progressTone, useGet, CourseMark } from '../components/ui.jsx';

const minutesLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

function RecentMessages({ currentId }) {
  const recent = (useGet('/conversations', { tab: 'all' }).data || []).filter((c) => c.lastMessage?.text && c.id !== currentId).slice(0, 3);
  if (!recent.length) return null;
  return (
    <div>
      <h3 className="text-[15px] font-bold text-ink">Recent Messages</h3>
      <ul className="mt-3 space-y-3">
        {recent.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5 text-[13px]">
            <Avatar name={c.other?.name} src={c.other?.avatar} size={24} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{c.lastMessage.text}</span>
            <span className="shrink-0 text-xs text-slate-400">{chatTime(c.lastMessageAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Details({ conversation, details, loading }) {
  const user = details?.user || conversation.other;
  const isStudent = user?.role === 'student';
  const rows = [
    ['Student ID', user?.studentCode],
    ['Joined On', user?.createdAt ? formatDate(user.createdAt) : undefined],
    ['Total Courses', isStudent ? details?.enrollments?.length : undefined],
    ['Completed Classes', isStudent ? details?.completedClasses : undefined],
    ['Support Tickets', isStudent ? details?.supportTickets : undefined],
  ].filter(([, v]) => v !== undefined && v !== null);
  return (
    <div className="space-y-6 p-5">
      <div>
        <h3 className="text-[15px] font-bold text-ink">{isStudent ? 'Student Details' : 'Contact Details'}</h3>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={user?.name} src={user?.avatar} size={56} />
          <div className="min-w-0"><p className="truncate font-bold text-ink">{user?.name}</p><p className="truncate text-xs text-slate-500">{user?.email}</p>{user?.phone && <p className="text-xs text-slate-500">{user.phone}</p>}</div>
          {user?.status && <StatusBadge status={user.status} className="ml-auto" />}
        </div>
        {loading ? <p className="mt-5 text-sm text-slate-400">Loading...</p> : (
          <dl className="mt-5 space-y-3.5 text-[13px]">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>)}
          </dl>
        )}
      </div>
      {isStudent && details?.enrollments?.length > 0 && (
        <div>
          <h3 className="text-[15px] font-bold text-ink">Enrolled Courses</h3>
          <ul className="mt-3 space-y-3.5">
            {details.enrollments.slice(0, 4).map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <CourseMark category={e.course?.category} src={e.course?.thumbnail} size={36} />
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-[13px]"><span className="truncate font-semibold text-ink">{e.course?.title}</span><span className="text-slate-500">{e.progress}%</span></div><ProgressBar value={e.progress} tone={progressTone(e.progress)} className="mt-1" /></div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <RecentMessages currentId={conversation.id} />
    </div>
  );
}

export default function Messages() {
  const [newChat, setNewChat] = useState(false);
  const summary = useGet('/conversations/summary', undefined, { refetchInterval: 30000 }).data;
  const tabs = [
    { key: 'all', label: 'All', countKey: 'all' },
    { key: 'unread', label: 'Unread', countKey: 'unread' },
    { key: 'starred', label: 'Starred', countKey: 'starred' },
    { key: 'archived', label: 'Archived', countKey: 'archived' },
  ];
  return (
    <>
      <PageHeader title="Messages" subtitle="Student conversations and questions." actions={<Button size="lg" icon={PenSquare} onClick={() => setNewChat(true)}>New message</Button>} />
      <StatGrid cols={4}>
        <StatCard icon={MessageCircle} tone="blue" label="Total Messages" value={formatNumber(summary?.total.value)} />
        <StatCard icon={MessageCircle} tone="red" label="Unread Messages" value={formatNumber(summary?.unread.value)} />
        <StatCard icon={Users} tone="orange" label="Active Students" value={formatNumber(summary?.activeStudents.value)} />
        <StatCard icon={Clock} tone="purple" label="Avg. Response Time" value={summary ? minutesLabel(summary.avgResponseMinutes.value) : '—'} />
      </StatGrid>
      <div className="mt-6">
        <ChatCenter tabs={tabs} renderDetails={(props) => <Details {...props} />} newChatOpen={newChat} onNewChatClose={() => setNewChat(false)} />
      </div>
    </>
  );
}
