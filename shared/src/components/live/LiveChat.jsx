import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { useClient, useSocket } from '../../context/AppProviders.jsx';
import { useAction, useGet, useInvalidate } from '../../hooks/index.js';
import { cx, formatTime } from '../../lib/format.js';
import { Avatar, EmptyState, Spinner } from '../ui/Display.jsx';
import { Select } from '../ui/Form.jsx';
import { Tabs } from '../data/Filters.jsx';

export const LiveChat = forwardRef(function LiveChat({ classId, disabled }, ref) {
  const client = useClient();
  const socket = useSocket();
  const invalidate = useInvalidate();
  const [tab, setTab] = useState('chat');
  const [audience, setAudience] = useState('everyone');
  const [text, setText] = useState('');
  const input = useRef(null);
  const scroller = useRef(null);

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const history = useGet(classId ? `/live-classes/${classId}/chat` : '/live-classes/none/chat', undefined, { enabled: Boolean(classId) });
  const messages = (history.data || []).filter((m) => (tab === 'qa' ? m.kind === 'qa' : m.kind === 'chat'));

  useEffect(() => {
    if (!socket || !classId) return undefined;
    const onChat = () => invalidate(`/live-classes/${classId}/chat`);
    socket.on('class:chat', onChat);
    return () => socket.off('class:chat', onChat);
  }, [socket, classId, invalidate]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, tab]);

  const send = useAction(
    async () => {
      const value = text.trim();
      setText('');
      return client.post(`/live-classes/${classId}/chat`, { text: value, kind: tab === 'qa' ? 'qa' : 'chat' });
    },
    { invalidate: [`/live-classes/${classId}/chat`] },
  );

  if (history.error) return <EmptyState title="Chat is for enrolled students" description="Enroll in this course to join the class chat and Q&A." />;

  return (
    <div className="flex h-full min-h-[360px] flex-col">
      <div className="flex items-center justify-between pr-1">
        <Tabs tabs={[{ key: 'chat', label: 'Chat' }, { key: 'qa', label: 'Q&A' }]} value={tab} onChange={setTab} className="!px-0 border-b-0" />
        <div className="w-32">
          <Select value={audience} onChange={(e) => setAudience(e.target.value)} compact>
            <option value="everyone">Everyone</option>
          </Select>
        </div>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3">
        {history.isLoading && <div className="flex justify-center py-6"><Spinner /></div>}
        {!history.isLoading && messages.length === 0 && <EmptyState title={tab === 'qa' ? 'No questions yet' : 'No messages yet'} description="Messages sent here are visible to everyone in the class." />}
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-3">
            <Avatar name={m.sender?.name} src={m.sender?.avatar} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[13px]">
                <span className="font-semibold text-ink">{m.sender?.name}</span>
                {m.sender?.role !== 'student' && <span className="rounded bg-brand-100 px-1.5 text-[10px] font-semibold capitalize text-brand-700">{m.sender?.role}</span>}
                <span className="text-[11px] text-slate-400">{formatTime(m.createdAt)}</span>
              </p>
              <p className="mt-0.5 break-words text-[14px] text-slate-700">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() && !disabled) send.run();
        }}
      >
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} disabled={disabled} maxLength={1000} placeholder={tab === 'qa' ? 'Ask a question...' : 'Type a message...'} className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        <Paperclip className="h-4 w-4 text-slate-300" />
        <button type="submit" aria-label="Send" disabled={!text.trim() || disabled} className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-40')}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
});
