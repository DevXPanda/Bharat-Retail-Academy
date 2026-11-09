import { useState } from 'react';
import { Link2, MessageCircle, Megaphone, PenSquare, Send, Users, UserSquare2, CalendarClock } from 'lucide-react';
import {
  Avatar, Badge, Button, ChatCenter, Field, Input, Modal, PageHeader, Select, StatCard, StatGrid, StatusBadge, Textarea, formatDate, formatDateTime, formatNumber, useAction, useClient, useGet,
} from '../components/ui.jsx';

function AnnouncementModal({ open, onClose }) {
  const client = useClient();
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', scheduledAt: '' });
  const send = useAction(
    () => client.post('/announcements', { title: form.title, body: form.body, audience: form.audience, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined }),
    { success: form.scheduledAt ? 'Announcement scheduled' : 'Announcement sent', invalidate: ['/announcements', '/conversations'], onSuccess: () => { setForm({ title: '', body: '', audience: 'all', scheduledAt: '' }); onClose(); } },
  );
  const valid = form.title.trim().length >= 3 && form.body.trim().length >= 3;
  return (
    <Modal open={open} onClose={onClose} title="Send announcement" subtitle="Shown in every selected user's notifications." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Send} disabled={!valid} loading={send.loading} onClick={() => send.run()}>{form.scheduledAt ? 'Schedule' : 'Send now'}</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Diwali special batch" /></Field>
        <Field label="Message" required><Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your announcement..." /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Audience"><Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}><option value="all">Students & teachers</option><option value="students">Students only</option><option value="teachers">Teachers only</option></Select></Field>
          <Field label="Schedule (optional)"><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function Announcements() {
  const { data = [] } = useGet('/announcements');
  return (
    <ul className="divide-y divide-slate-100">
      {data.length === 0 && <li className="p-10 text-center text-sm text-slate-500">No announcements yet.</li>}
      {data.map((a) => (
        <li key={a.id} className="flex items-start gap-4 px-6 py-4">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Megaphone className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{a.title}</p>
            <p className="mt-0.5 text-sm text-slate-600">{a.body}</p>
            <p className="mt-1.5 text-xs text-slate-400">By {a.createdBy?.name} · {a.sentAt ? `Sent ${formatDateTime(a.sentAt)}` : `Scheduled for ${formatDateTime(a.scheduledAt)}`}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5"><Badge tone="blue" className="capitalize">{a.audience}</Badge><StatusBadge status={a.sentAt ? 'completed' : 'pending'} label={a.sentAt ? 'Sent' : 'Scheduled'} /></div>
        </li>
      ))}
    </ul>
  );
}

function Details({ conversation, details, loading }) {
  const user = details?.user || conversation.other;
  const first = details?.enrollments?.[0];
  const rows = [
    ['Student ID', user?.studentCode],
    ['Course Enrolled', first?.course?.title],
    ['Batch', first?.batch?.name],
    ['Phone', user?.phone],
    ['Joined On', user?.createdAt ? formatDate(user.createdAt) : undefined],
  ].filter(([, v]) => v);
  return (
    <div className="p-5">
      <h3 className="text-[15px] font-bold text-ink">{user?.role === 'student' ? 'Student Details' : 'Contact Details'}</h3>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={user?.name} src={user?.avatar} size={56} />
        <div className="min-w-0"><p className="truncate font-bold text-ink">{user?.name}</p><p className="truncate text-xs text-slate-500">{user?.email}</p>{user?.status && <StatusBadge status={user.status} className="mt-1" />}</div>
      </div>
      {loading ? <p className="mt-6 text-sm text-slate-400">Loading...</p> : (
        <dl className="mt-6 space-y-3.5 text-[13px]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>)}
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Role</dt><dd className="font-semibold capitalize text-ink">{user?.role}</dd></div>
        </dl>
      )}
    </div>
  );
}

export default function Messages() {
  const [announce, setAnnounce] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const summary = useGet('/conversations/summary', undefined, { refetchInterval: 30000 }).data;

  const tabs = [
    { key: 'all', label: 'All', countKey: 'all' },
    { key: 'students', label: 'Students', countKey: 'students' },
    { key: 'teachers', label: 'Teachers', countKey: 'teachers' },
    { key: 'announcements', label: 'Announcements', count: summary?.announcements.value },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Conversations and announcements."
        actions={<><Button variant="outline" size="lg" icon={Megaphone} onClick={() => setAnnounce(true)}>Send Announcement</Button><Button size="lg" icon={PenSquare} onClick={() => setNewChat(true)}>New Message</Button></>}
      />
      <StatGrid cols={5}>
        <StatCard icon={MessageCircle} tone="blue" label="Total Messages" value={formatNumber(summary?.total.value)} />
        <StatCard icon={MessageCircle} tone="green" label="Unread Messages" value={formatNumber(summary?.unread.value)} />
        <StatCard icon={Users} tone="orange" label="Student Messages" value={formatNumber(summary?.students.value)} sub={`${summary?.students.unread ?? 0} unread`} />
        <StatCard icon={UserSquare2} tone="purple" label="Teacher Messages" value={formatNumber(summary?.teachers.value)} sub={`${summary?.teachers.unread ?? 0} unread`} />
        <StatCard icon={Megaphone} tone="blue" label="Announcements" value={formatNumber(summary?.announcements.value)} sub={`${summary?.announcements.scheduled ?? 0} scheduled`} />
      </StatGrid>
      <div className="mt-6">
        <ChatCenter tabs={tabs} renderDetails={(props) => <Details {...props} />} newChatOpen={newChat} onNewChatClose={() => setNewChat(false)} customTabs={{ announcements: () => <Announcements /> }} />
      </div>
      <AnnouncementModal open={announce} onClose={() => setAnnounce(false)} />
    </>
  );
}
