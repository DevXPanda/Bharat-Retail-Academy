import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Filter, MessageSquarePlus, MoreVertical, Paperclip, Phone, Send, Smile, Star, Video } from 'lucide-react';
import { useAuth, useClient, useSocket } from '../../context/AppProviders.jsx';
import { useAction, useGet, useInvalidate } from '../../hooks/index.js';
import { useRowHighlight } from '../../hooks/notifications.js';
import { chatTime, cx, formatTime } from '../../lib/format.js';
import { Avatar, Badge, EmptyState, Spinner } from '../ui/Display.jsx';
import { SearchInput } from '../ui/Form.jsx';
import { Modal, useToast } from '../ui/Overlay.jsx';
import { Popover } from '../ui/Popover.jsx';
import { Tabs } from '../data/Filters.jsx';

const EMOJIS = ['😀', '😊', '👍', '🙏', '🎉', '🔥', '❤️', '😂', '👏', '✅'];

const roleTone = { student: 'blue', teacher: 'purple', admin: 'orange' };

function ConversationItem({ conversation, active, fresh, onClick }) {
  const { other } = conversation;
  return (
    <button type="button" onClick={onClick} className={cx('flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50', active && 'bg-brand-50/70', fresh && !active && 'is-new')}>
      <div className="relative">
        <Avatar name={other?.name} src={other?.avatar} size={44} />
        {other?.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-ink">{other?.name}</p>
          {conversation.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
          <Badge tone={roleTone[other?.role]} className="!px-1.5 !py-0 !text-[10px] capitalize">{other?.role}</Badge>
          <span className="ml-auto shrink-0 text-[11px] text-slate-400">{conversation.lastMessage?.text ? chatTime(conversation.lastMessageAt) : ''}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-[13px] text-slate-500">{conversation.lastMessage?.text || 'Start the conversation'}</p>
          {conversation.unreadCount > 0 && <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{conversation.unreadCount}</span>}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, mine }) {
  const readByOther = message.readBy?.length > 1;
  return (
    <div className={cx('flex items-end gap-2', mine && 'justify-end')}>
      <div className={cx('max-w-[78%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm', mine ? 'rounded-br-md bg-brand-100 text-ink' : 'rounded-bl-md bg-white text-slate-800')}>
        {message.attachments?.map((a) => (
          <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="mb-1.5 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-[13px] font-medium text-brand-700 hover:underline">
            <Paperclip className="h-4 w-4" /> {a.name}
          </a>
        ))}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        <p className={cx('mt-1 flex items-center gap-1 text-[11px] text-slate-400', mine && 'justify-end')}>
          {formatTime(message.createdAt)}
          {mine && (readByOther ? <CheckCheck className="h-3.5 w-3.5 text-brand-500" /> : <Check className="h-3.5 w-3.5" />)}
        </p>
      </div>
    </div>
  );
}

function NewChatModal({ open, onClose, onPick, overlay: Overlay = Modal }) {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useGet('/conversations/contacts', { search }, { enabled: open });
  return (
    <Overlay open={open} onClose={onClose} title="New message" subtitle="Choose someone to start a conversation with" size="sm">
      <SearchInput value={search} onChange={setSearch} placeholder="Search people..." />
      <ul className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto">
        {isLoading && <div className="flex justify-center py-6"><Spinner /></div>}
        {!isLoading && data.length === 0 && <EmptyState title="No contacts found" />}
        {data.map((person) => (
          <li key={person.id}>
            <button type="button" onClick={() => onPick(person)} className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-slate-50">
              <Avatar name={person.name} src={person.avatar} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{person.name}</span>
                <span className="block truncate text-xs capitalize text-slate-500">{person.role}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Overlay>
  );
}

export function ChatCenter({ tabs, renderDetails, newChatOpen, onNewChatClose, customTabs = {}, height = 'calc(100vh - 360px)', overlay }) {
  const client = useClient();
  const socket = useSocket();
  const { user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const { isUnread, markRead } = useRowHighlight('messages');
  const [tab, setTab] = useState(tabs[0].key);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const scroller = useRef(null);

  const custom = customTabs[tab];
  const list = useGet('/conversations', { tab: custom ? 'all' : tab, search }, { keepPrevious: true });
  const conversations = list.data || [];
  const counts = list.meta?.counts || {};
  const active = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const thread = useGet(selectedId ? `/conversations/${selectedId}/messages` : '/conversations/none/messages', undefined, { enabled: Boolean(selectedId) && !custom });
  const messages = thread.data?.messages || [];
  // A conversation you are looking at is read, including messages that arrive while it is open.
  const lastIncoming = messages[messages.length - 1]?.id;
  useEffect(() => { if (selectedId && thread.data) markRead(selectedId); }, [selectedId, lastIncoming, thread.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const details = useGet(selectedId ? `/conversations/${selectedId}/participant` : '/conversations/none/participant', undefined, { enabled: Boolean(selectedId) && Boolean(renderDetails) && !custom });

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = ({ conversationId }) => {
      invalidate('/conversations');
      if (conversationId === selectedId) invalidate(`/conversations/${selectedId}`);
    };
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [socket, selectedId, invalidate]);

  // Keep the newest message in view: jump to the bottom when a chat opens and whenever a message is added.
  const lastMessageId = messages[messages.length - 1]?.id;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMessageId, selectedId, thread.isLoading, Boolean(active)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId && thread.data) queryClient.invalidateQueries({ queryKey: ['/conversations'] });
  }, [thread.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useAction(
    async () => {
      const payload = { text: text.trim(), attachments: attachment ? [attachment] : [] };
      setText('');
      setAttachment(null);
      return client.post(`/conversations/${selectedId}/messages`, payload);
    },
    { invalidate: ['/conversations'] },
  );

  const toggle = useAction((kind) => client.patch(`/conversations/${selectedId}/${kind}`), { invalidate: ['/conversations'] });

  const startChat = useAction((person) => client.post('/conversations', { userId: person.id }), {
    invalidate: ['/conversations'],
    onSuccess: ({ data }) => {
      onNewChatClose?.();
      setTab(tabs[0].key);
      setSelectedId(data.id);
    },
  });

  const pickFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      setAttachment(await client.upload('file', file));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const callUrl = useMemo(() => (selectedId ? `https://meet.jit.si/ecomedu-chat-${selectedId}` : null), [selectedId]);
  const canSend = (text.trim() || attachment) && !send.loading;

  const grouped = useMemo(() => {
    const out = [];
    let lastDay = '';
    messages.forEach((m) => {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        out.push({ divider: day === new Date().toDateString() ? 'Today' : new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), key: `d-${day}` });
        lastDay = day;
      }
      out.push({ message: m, key: m.id });
    });
    return out;
  }, [messages]);

  const tabsWithCounts = tabs.map((t) => ({ ...t, count: t.countKey ? counts[t.countKey] : t.count }));

  return (
    <div className="card overflow-hidden">
      <Tabs tabs={tabsWithCounts} value={tab} onChange={setTab} />
      {custom ? (
        custom()
      ) : (
        <div className={cx('grid lg:grid-cols-[340px_minmax(0,1fr)]', renderDetails && 'xl:grid-cols-[340px_minmax(0,1fr)_300px]')} style={{ minHeight: 520, height }}>
          <div className="flex min-h-0 flex-col border-r border-slate-100">
            <div className="flex items-center gap-2 p-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name or message..." className="flex-1" />
              <button type="button" onClick={() => setTab(tab === 'unread' ? tabs[0].key : 'unread')} aria-label="Toggle unread filter" className={cx('inline-flex h-10 w-10 items-center justify-center rounded-lg border', tab === 'unread' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500')}>
                <Filter className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {list.isLoading && <div className="flex justify-center py-10"><Spinner /></div>}
              {!list.isLoading && conversations.length === 0 && <EmptyState icon={MessageSquarePlus} title="No conversations" description="Start a new message to get going." />}
              {conversations.map((c) => (
                <ConversationItem key={c.id} conversation={c} active={c.id === selectedId} fresh={isUnread(c.id)} onClick={() => { markRead(c.id); setSelectedId(c.id); }} />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-slate-50/50">
            {!active ? (
              <EmptyState icon={MessageSquarePlus} title="Select a conversation" description="Pick someone from the list to read and reply." />
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3">
                  <Avatar name={active.other?.name} src={active.other?.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">{active.other?.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={cx('h-2 w-2 rounded-full', active.other?.online ? 'bg-emerald-500' : 'bg-slate-300')} />
                      {active.other?.online ? 'Online' : 'Offline'} · <span className="capitalize">{active.other?.role}</span>
                    </p>
                  </div>
                  <button type="button" aria-label="Star conversation" onClick={() => toggle.run('star')} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                    <Star className={cx('h-4 w-4', active.starred && 'fill-amber-400 text-amber-400')} />
                  </button>
                  <a href={`${callUrl}#config.startWithVideoMuted=true`} target="_blank" rel="noreferrer" aria-label="Voice call" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a href={callUrl} target="_blank" rel="noreferrer" aria-label="Video call" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                    <Video className="h-4 w-4" />
                  </a>
                  <Popover
                    width={170}
                    trigger={
                      <button type="button" aria-label="More" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                  >
                    {(close) => (
                      <button type="button" onClick={() => { close(); toggle.run('archive'); }} className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50">
                        {active.archived ? 'Unarchive' : 'Archive'} conversation
                      </button>
                    )}
                  </Popover>
                </header>

                <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  {thread.isLoading && <div className="flex justify-center py-10"><Spinner /></div>}
                  {grouped.map((item) =>
                    item.divider ? (
                      <div key={item.key} className="text-center">
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">{item.divider}</span>
                      </div>
                    ) : (
                      <MessageBubble key={item.key} message={item.message} mine={String(item.message.sender?.id || item.message.sender) === user.id} />
                    ),
                  )}
                  {!thread.isLoading && messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>}
                </div>

                <form
                  className="border-t border-slate-100 bg-white p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canSend) send.run();
                  }}
                >
                  {attachment && (
                    <p className="mb-2 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                      <Paperclip className="h-3.5 w-3.5" /> {attachment.name}
                      <button type="button" onClick={() => setAttachment(null)} className="ml-auto text-slate-400 hover:text-red-500">remove</button>
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Attach file" onClick={() => fileInput.current?.click()} className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100">
                      {uploading ? <Spinner className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
                    </button>
                    <input ref={fileInput} type="file" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                    <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm focus:border-brand-400" />
                    <Popover
                      width={220}
                      align="right"
                      trigger={
                        <button type="button" aria-label="Emoji" className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100">
                          <Smile className="h-5 w-5" />
                        </button>
                      }
                    >
                      {(close) => (
                        <div className="grid grid-cols-5 gap-1 p-2">
                          {EMOJIS.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => { setText((t) => t + emoji); close(); }} className="rounded-lg p-2 text-xl hover:bg-slate-100">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </Popover>
                    <button type="submit" disabled={!canSend} aria-label="Send message" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                      <Send className="h-4 w-4" /> Send
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {renderDetails && <div className="hidden min-h-0 overflow-y-auto border-l border-slate-100 xl:block">{active && renderDetails({ conversation: active, details: details.data, loading: details.isLoading })}</div>}
        </div>
      )}
      <NewChatModal open={Boolean(newChatOpen)} onClose={onNewChatClose} onPick={(person) => startChat.run(person)} overlay={overlay} />
    </div>
  );
}
