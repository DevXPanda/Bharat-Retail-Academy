import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useGet, useInvalidate } from '../../hooks/index.js';
import { useClient, useSocket } from '../../context/AppProviders.jsx';
import { timeAgo } from '../../lib/format.js';
import { Popover } from '../ui/Popover.jsx';
import { EmptyState } from '../ui/Display.jsx';
import { useToast } from '../ui/Overlay.jsx';

export function NotificationBell() {
  const client = useClient();
  const socket = useSocket();
  const navigate = useNavigate();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { data = [], meta } = useGet('/notifications', undefined, { refetchInterval: 60000 });
  const unread = meta?.unread || 0;

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (n) => {
      toast.info(n.body || n.title, n.title);
      invalidate('/notifications');
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket, toast, invalidate]);

  const open = async (n, close) => {
    close();
    if (!n.read) {
      await client.patch(`/notifications/${n.id}/read`);
      invalidate('/notifications');
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await client.patch('/notifications/read-all');
    invalidate('/notifications');
  };

  return (
    <Popover
      width={360}
      trigger={
        <button type="button" aria-label="Notifications" className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
        </button>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.length === 0 && <EmptyState icon={Bell} title="You're all caught up" description="New notifications will appear here." />}
            {data.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => open(n, close)} className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{n.title}</span>
                    {n.body && <span className="line-clamp-2 text-xs text-slate-500">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}
