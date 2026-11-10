import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useClient } from '../../context/AppProviders.jsx';
import { useAction, useGet } from '../../hooks/index.js';
import { useRowHighlight } from '../../hooks/notifications.js';
import { cx, formatDateTime } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Select, Textarea } from '../ui/Form.jsx';
import { Avatar, Badge, EmptyState, Spinner } from '../ui/Display.jsx';
import { StatusBadge } from '../ui/Display.jsx';

export const TICKET_CATEGORY_LABELS = {
  payment: 'Payment',
  course_access: 'Course Access',
  live_class: 'Live Class',
  recording: 'Recordings',
  certificate: 'Certificate',
  technical: 'Technical',
  account: 'Account',
  payout: 'Payout',
  course_content: 'Course & Content',
  students: 'Students',
  other: 'Other',
};

export const TICKET_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STEPS = [
  { key: 'open', label: 'Submitted' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_NOTE = {
  open: 'Received. Our support team is reviewing your records and will reply within 24 hours.',
  in_progress: 'Support is working on this. You will be notified as soon as there is an update.',
  resolved: 'Marked as resolved. If the problem is still there, reply below and the ticket will reopen.',
  closed: 'This ticket is closed.',
};

function StatusTracker({ status }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <div className="mt-4">
      <ol className="flex items-center" aria-label="Ticket progress">
        {STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <li key={step.key} className={cx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
              <span className="flex flex-col items-center gap-1">
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold', done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500')}>{done && i < current ? '✓' : i + 1}</span>
                <span className={cx('whitespace-nowrap text-[10px] font-semibold', i === current ? 'text-emerald-700' : 'text-slate-400')}>{step.label}</span>
              </span>
              {i < STEPS.length - 1 && <span className={cx('mx-1.5 mb-4 h-0.5 flex-1 rounded', i < current ? 'bg-emerald-600' : 'bg-slate-200')} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-500">{STATUS_NOTE[status]}</p>
    </div>
  );
}

// Support-only: the exact record the ticket is about plus the requester's recent history, so it can be resolved without asking.
function SupportContext({ context }) {
  if (!context || (!context.record && !context.history?.length)) return null;
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      {context.record && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{context.record.kind} details</p>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            {context.record.rows.map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="break-all font-semibold text-ink">{v}</dd></div>
            ))}
          </dl>
        </div>
      )}
      {context.history?.map((h) => (
        <div key={h.title}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{h.title}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{h.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

const PRIORITY_TONE = { low: 'slate', medium: 'amber', high: 'red' };

export function PriorityBadge({ value }) {
  return <Badge tone={PRIORITY_TONE[value] || 'slate'} className="capitalize">{value}</Badge>;
}

export function TicketThread({ ticketId, role }) {
  const client = useClient();
  const [text, setText] = useState('');
  const { data: ticket, isLoading } = useGet(ticketId ? `/tickets/${ticketId}` : '/tickets/none', undefined, { enabled: Boolean(ticketId), refetchInterval: 20000 });

  const reply = useAction(() => client.post(`/tickets/${ticketId}/replies`, { text: text.trim() }), { success: 'Reply sent', invalidate: ['/tickets'], onSuccess: () => setText('') });
  const changeStatus = useAction((status) => client.patch(`/tickets/${ticketId}/status`, { status }), { success: 'Ticket updated', invalidate: ['/tickets'] });

  const { markRead } = useRowHighlight('support');
  useEffect(() => { if (ticketId && ticket) markRead(ticketId); }, [ticketId, ticket?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view: scroll the thread to the bottom on open and whenever a reply arrives.
  const listRef = useRef(null);
  const replyCount = ticket?.replies?.length ?? 0;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ticketId, replyCount, isLoading]);

  if (!ticketId) return <EmptyState title="Select a ticket" description="Pick a ticket from the list to read the conversation." />;
  if (isLoading || !ticket) return <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>;

  const closed = ticket.status === 'closed';
  const isAdmin = role === 'admin';

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400">Ticket #{ticket.ticketNumber}</p>
            <h3 className="mt-0.5 text-[16px] font-extrabold leading-snug text-ink">{ticket.subject}</h3>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        {!isAdmin && <StatusTracker status={ticket.status} />}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Badge tone="blue">{TICKET_CATEGORY_LABELS[ticket.category] || ticket.category}</Badge>
          <PriorityBadge value={ticket.priority} />
          {ticket.related?.label ? <span className="truncate">Regarding: {ticket.related.label}</span> : ticket.course?.title && <span className="truncate">Course: {ticket.course.title}</span>}
          <span>Opened {formatDateTime(ticket.createdAt)}</span>
        </div>
        {isAdmin && <SupportContext context={ticket.context} />}
        {isAdmin && ticket.student && (
          <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
            <Avatar name={ticket.student.name} src={ticket.student.avatar} size={30} />
            <div className="min-w-0 text-xs"><p className="truncate font-semibold text-ink">{ticket.student.name} <span className="font-normal capitalize text-slate-400">{ticket.requesterRole === 'teacher' ? 'Teacher' : ticket.student.studentCode}</span></p><p className="truncate text-slate-500">{ticket.student.email}</p></div>
          </div>
        )}
      </header>

      <ul ref={listRef} className="min-h-[220px] flex-1 space-y-4 overflow-y-auto py-4" style={{ maxHeight: 380 }}>
        {ticket.replies.map((r) => {
          const mine = r.role === role;
          return (
            <li key={r.id || r._id || r.createdAt} className={cx('flex gap-2.5', mine && 'flex-row-reverse')}>
              <Avatar name={r.author?.name} src={r.author?.avatar} size={30} />
              <div className={cx('max-w-[82%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed', mine ? 'rounded-tr-sm bg-brand-50 text-ink' : 'rounded-tl-sm bg-slate-100 text-slate-700')}>
                <p className="mb-0.5 text-[11px] font-semibold text-slate-500">{r.role === 'admin' ? `${r.author?.name || 'Support'} (Support)` : `${r.author?.name || ''}${r.role === 'teacher' ? ' (Teacher)' : ''}`}</p>
                <p className="whitespace-pre-wrap break-words">{r.text}</p>
                <p className="mt-1 text-right text-[10px] text-slate-400">{formatDateTime(r.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="border-t border-slate-100 pt-4">
        {closed ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">This ticket is closed. {role === 'student' && 'Raise a new ticket if you still need help.'}</p>
        ) : (
          <>
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={isAdmin ? 'Write a reply to the student...' : 'Add more details or reply to support...'} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Status</span>
                  <div className="w-36"><Select compact value={ticket.status} onChange={(e) => changeStatus.run(e.target.value)} disabled={changeStatus.loading}>{TICKET_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></div>
                </div>
              ) : (
                <Button variant="outline" icon={CheckCircle2} loading={changeStatus.loading} onClick={() => changeStatus.run('closed')}>Mark as resolved &amp; close</Button>
              )}
              <Button icon={Send} loading={reply.loading} disabled={!text.trim()} onClick={() => reply.run()}>Send reply</Button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
