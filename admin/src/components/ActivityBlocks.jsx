import { useState } from 'react';
import { Check, Circle, MessageSquare, MonitorSmartphone } from 'lucide-react';
import { Avatar, Badge, Spinner, cx, formatDate, formatDateTime, timeAgo, useGet } from './ui.jsx';

export const Block = ({ icon: Icon, title, children, className }) => (
  <section className={cx('rounded-2xl border border-slate-200 bg-white p-5', className)}>
    <h3 className="mb-4 flex items-center gap-2.5 text-[14px] font-bold text-ink">{Icon && <Icon className="h-[18px] w-[18px] text-brand-600" />}{title}</h3>
    {children}
  </section>
);

export const Empty = ({ children }) => <p className="py-2 text-sm text-slate-400">{children}</p>;

export function SignIns({ rows = [] }) {
  return (
    <Block icon={MonitorSmartphone} title={`Recent sign-ins (${rows.length})`}>
      {rows.length === 0 ? <Empty>No sign-ins recorded yet. History starts from the next login.</Empty> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0"><p className="font-semibold text-ink">{r.device}</p><p className="text-xs text-slate-500">{r.ip || 'IP unknown'} · {r.portal} portal</p></div>
              <span className="whitespace-nowrap text-xs text-slate-500" title={formatDateTime(r.at)}>{timeAgo(r.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

// Conversation list on the left, the selected thread on the right. Read-only.
export function Messages({ ownerId, kind, rows = [] }) {
  const [selected, setSelected] = useState(null);
  const thread = useGet(selected ? `/${kind}/${ownerId}/conversations/${selected}` : `/${kind}/none/conversations/none`, undefined, { enabled: Boolean(selected) }).data;

  return (
    <Block icon={MessageSquare} title={`Messages (${rows.length} conversations)`}>
      {rows.length === 0 ? <Empty>No conversations yet.</Empty> : (
        <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {rows.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(c.id)} className={cx('flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50', selected === c.id && 'bg-brand-50')}>
                  <Avatar name={c.with?.name} src={c.with?.avatar} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-ink">{c.with?.name || 'Unknown'}</span><Badge tone="slate" className="!px-1.5 !py-0 !text-[10px] capitalize">{c.with?.role}</Badge></span>
                    <span className="block truncate text-xs text-slate-500">{c.lastMessage || 'No messages'}</span>
                    <span className="block text-[11px] text-slate-400">{c.messageCount} messages · {timeAgo(c.lastMessageAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="min-h-[200px] rounded-xl border border-slate-200 bg-slate-50 p-4">
            {!selected ? <p className="py-16 text-center text-sm text-slate-400">Select a conversation to read it.</p> : !thread ? <div className="flex justify-center py-16"><Spinner /></div> : (
              <ul className="max-h-[388px] space-y-3 overflow-y-auto pr-1">
                {thread.messages.map((m) => {
                  const mine = String(m.sender?.id) === String(ownerId);
                  return (
                    <li key={m.id} className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
                      <div className={cx('max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed', mine ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm bg-white text-slate-700 shadow-sm')}>
                        <p className={cx('mb-0.5 text-[10.5px] font-semibold', mine ? 'text-white/70' : 'text-slate-400')}>{m.sender?.name}</p>
                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        {(m.attachments || []).map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className={cx('mt-1 block text-xs underline', mine ? 'text-white' : 'text-brand-600')}>{a.name}</a>)}
                      </div>
                      <span className="mt-0.5 text-[10px] text-slate-400">{formatDateTime(m.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Block>
  );
}

export function ClassChat({ rows = [] }) {
  return (
    <Block title={`Live class chat & Q&A (${rows.length})`}>
      {rows.length === 0 ? <Empty>Has not written in any live class chat.</Empty> : (
        <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="py-2.5 text-sm">
              <p className="text-ink">{r.text}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500"><Badge tone={r.kind === 'qa' ? 'purple' : 'blue'} className="!px-1.5 !py-0 !text-[10px]">{r.kind === 'qa' ? 'Q&A' : 'Chat'}</Badge>{r.classTitle} · {formatDate(r.classDate)} · {formatDateTime(r.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

// Lesson by lesson: which lessons are done, with the date where we have it.
export function LessonProgress({ lessons }) {
  if (!lessons) return null;
  const total = lessons.modules.reduce((n, m) => n + m.lessons.length, 0);
  const done = lessons.modules.reduce((n, m) => n + m.lessons.filter((l) => l.completed).length, 0);
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-600">{done} of {total} lessons completed</p>
      <div className="space-y-4">
        {lessons.modules.map((m, i) => (
          <div key={i}>
            <p className="mb-1.5 text-[13px] font-bold text-ink">{m.title}</p>
            <ul className="space-y-1">
              {m.lessons.map((l) => (
                <li key={l.id} className="flex items-center gap-2.5 text-[13px]">
                  {l.completed ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  <span className={cx('flex-1', l.completed ? 'text-ink' : 'text-slate-400')}>{l.title}</span>
                  <span className="text-[11px] text-slate-400">{l.type}{l.durationMin ? ` · ${l.durationMin} min` : ''}</span>
                  {l.completed && <span className="whitespace-nowrap text-[11px] text-emerald-600">{l.completedAt ? formatDate(l.completedAt) : 'done'}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
