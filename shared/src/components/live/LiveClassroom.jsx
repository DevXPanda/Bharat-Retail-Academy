import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ExternalLink, Lock, MessageCircle, Mic, MicOff, MonitorUp, MoreHorizontal, Radio, Users, Video } from 'lucide-react';
import { useClient, useSocket } from '../../context/AppProviders.jsx';
import { useAction, useGet, useInvalidate } from '../../hooks/index.js';
import { cx, formatCurrency, formatDateTime, startsInLabel } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { EmptyState, Spinner } from '../ui/Display.jsx';
import { useToast } from '../ui/Overlay.jsx';
import { Popover } from '../ui/Popover.jsx';

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`) && window.JitsiMeetExternalAPI) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the video service'));
    document.body.appendChild(script);
    return undefined;
  });

function useElapsed(startedAt, active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!startedAt || !active) return '00:00:00';
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

const mmss = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

// Shown to an unpaid student once the free preview runs out.
function PaywallPanel({ course, paywall }) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-300"><Lock className="h-7 w-7" /></span>
      <p className="text-xl font-extrabold">Your free preview has ended</p>
      <p className="text-sm leading-relaxed text-slate-300">Enroll in <span className="font-semibold text-white">{course?.title || 'this course'}</span> to keep watching this class, join every live session, get recordings and a certificate.</p>
      {paywall ? paywall({ course }) : course?.slug && <a href={`/courses/${course.slug}`} className="inline-flex h-11 items-center rounded-lg bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700">Enroll now{course.price ? ` · ${formatCurrency(course.price)}` : ''}</a>}
    </div>
  );
}

function ControlButton({ icon: Icon, label, active, danger, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} className={cx('flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/10', danger && 'text-red-400')}>
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge !== undefined && <span className="absolute -right-3 -top-1 text-[10px] font-bold text-white">{badge}</span>}
      </span>
      <span className={cx(active === false && 'text-red-300')}>{label}</span>
    </button>
  );
}

export function LiveClassroom({ classId, isStaff, onChatFocus, onClosed, paywall }) {
  const client = useClient();
  const toast = useToast();
  const invalidate = useInvalidate();
  const socket = useSocket();
  const container = useRef(null);
  const apiRef = useRef(null);
  const [session, setSession] = useState(null);
  const [joining, setJoining] = useState(false);
  const [media, setMedia] = useState({ audio: true, video: true, recording: false });
  const [participants, setParticipants] = useState(1);
  const [preview, setPreview] = useState(null);
  const [left, setLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const cls = useGet(classId ? `/live-classes/${classId}` : '/live-classes/none', undefined, { enabled: Boolean(classId), refetchInterval: 15000 });
  const data = cls.data;
  const elapsed = useElapsed(data?.startedAt, data?.status === 'live');

  // Free-preview clock: counts down locally; the server remembers the start so a refresh cannot reset it.
  useEffect(() => {
    if (!preview || !session) return undefined;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((preview.endsAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining > 0) return;
      clearInterval(timer);
      client.post(`/live-classes/${classId}/leave`).catch(() => {});
      apiRef.current?.executeCommand?.('hangup');
      teardown();
      setPreview(null);
      setExpired(true);
    }, 250);
    return () => clearInterval(timer);
  }, [preview, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const teardown = useCallback(() => {
    apiRef.current?.dispose?.();
    apiRef.current = null;
    setSession(null);
  }, []);

  useEffect(() => () => {
    if (apiRef.current) client.post(`/live-classes/${classId}/leave`).catch(() => {});
    teardown();
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !classId) return undefined;
    socket.emit('class:join', classId);
    const onEnded = () => {
      teardown();
      invalidate('/live-classes');
      onClosed?.();
    };
    const onParticipant = () => invalidate(`/live-classes/${classId}/students`);
    socket.on('class:ended', onEnded);
    socket.on('class:participant', onParticipant);
    return () => {
      socket.emit('class:leave', classId);
      socket.off('class:ended', onEnded);
      socket.off('class:participant', onParticipant);
    };
  }, [socket, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useAction(() => client.post(`/live-classes/${classId}/start`), { invalidate: ['/live-classes'], success: 'Class is live' });
  const end = useAction(() => client.post(`/live-classes/${classId}/end`), {
    invalidate: ['/live-classes', '/attendance', '/payouts'],
    success: 'Class ended',
    onSuccess: () => {
      teardown();
      onClosed?.();
    },
  });

  const join = async () => {
    setJoining(true);
    try {
      const { data: info } = await client.post(`/live-classes/${classId}/join`);
      if (info.provider === 'external') {
        window.open(info.url, '_blank', 'noopener');
        return;
      }
      const { jitsi } = info;
      await loadScript(jitsi.scriptUrl);
      if (info.preview) {
        setPreview({ endsAt: Date.now() + info.preview.secondsLeft * 1000, total: info.preview.totalSeconds });
        setLeft(info.preview.secondsLeft);
      } else {
        setPreview(null);
      }
      setSession(info);
      requestAnimationFrame(() => {
        const api = new window.JitsiMeetExternalAPI(jitsi.domain, {
          roomName: jitsi.roomName,
          parentNode: container.current,
          jwt: jitsi.jwt || undefined,
          width: '100%',
          height: '100%',
          userInfo: { displayName: jitsi.displayName, email: jitsi.email },
          configOverwrite: { prejoinPageEnabled: false, prejoinConfig: { enabled: false }, disableDeepLinking: true, startWithAudioMuted: !jitsi.moderator, toolbarButtons: [], disableInviteFunctions: true, subject: info.title },
          interfaceConfigOverwrite: { TOOLBAR_BUTTONS: [], MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false, SHOW_BRAND_WATERMARK: false },
        });
        apiRef.current = api;
        const count = () => setParticipants(api.getNumberOfParticipants?.() || 1);
        api.addListener('participantJoined', count);
        api.addListener('participantLeft', count);
        api.addListener('videoConferenceJoined', count);
        api.addListener('audioMuteStatusChanged', ({ muted }) => setMedia((m) => ({ ...m, audio: !muted })));
        api.addListener('videoMuteStatusChanged', ({ muted }) => setMedia((m) => ({ ...m, video: !muted })));
        api.addListener('recordingStatusChanged', ({ on }) => setMedia((m) => ({ ...m, recording: on })));
        api.addListener('readyToClose', () => {
          client.post(`/live-classes/${classId}/leave`).catch(() => {});
          teardown();
        });
      });
    } catch (err) {
      if (err.status === 402) setExpired(true);
      else toast.error(err.message);
    } finally {
      setJoining(false);
    }
  };

  const command = (name, ...args) => apiRef.current?.executeCommand(name, ...args);

  const toggleRecord = () => {
    if (media.recording) command('stopRecording', 'file');
    else command('startRecording', { mode: 'file' });
    toast.info('Recording needs a Jitsi deployment with recording enabled (JaaS or self-hosted Jibri).');
  };

  const leave = async () => {
    await client.post(`/live-classes/${classId}/leave`).catch(() => {});
    command('hangup');
    teardown();
  };

  if (!classId) return <EmptyState icon={Video} title="No class selected" description="Pick a class from the list to open the classroom." />;
  if (cls.isLoading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <EmptyState icon={Video} title="Class not found" />;

  const isLive = data.status === 'live';
  const external = data.platform !== 'jitsi';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="truncate text-[15px] font-bold text-ink">Live Classroom - {data.title}</h3>
        {isLive ? (
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-red-600"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Live</span>
            <span className="tabular-nums text-slate-600">{elapsed}</span>
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold capitalize text-slate-500">{data.status}</span>
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-navy-900">
        <div ref={container} className={cx('absolute inset-0', !session && 'hidden')} />
        {session && preview && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 w-56 rounded-xl bg-navy-900/85 p-3 text-white shadow-xl backdrop-blur">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-amber-300"><span>Free preview</span><span className="text-base tabular-nums text-white">{mmss(left)}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-amber-400 transition-[width] duration-300" style={{ width: `${(left / preview.total) * 100}%` }} /></div>
            <p className="mt-2 text-[11px] text-slate-300">Enroll to keep watching after this ends.</p>
          </div>
        )}
        {!session && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
            {expired || (data.preview && data.preview.started && data.preview.secondsLeft <= 0) ? (
              <PaywallPanel course={data.course} paywall={paywall} />
            ) : data.preview && !isStaff ? (
              data.preview.available ? (
                <>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400"><Radio className="h-7 w-7" /></span>
                  <p className="text-lg font-bold">The class is live</p>
                  <p className="max-w-xs text-sm text-slate-300">You are not enrolled in this course yet. Watch for free for {data.preview.secondsLeft} seconds, then enroll to continue.</p>
                  <Button size="lg" onClick={join} loading={joining} icon={Video}>Watch free for {data.preview.secondsLeft} seconds</Button>
                  {paywall?.({ course: data.course, compact: true })}
                </>
              ) : (
                <>
                  <p className="text-lg font-bold">{data.status === 'upcoming' ? startsInLabel(data.startsInMinutes) : `This class is ${data.status}`}</p>
                  <p className="max-w-xs text-sm text-slate-300">You are not enrolled in this course. When the teacher starts, you can watch a free {data.preview.totalSeconds}-second preview.</p>
                  {paywall?.({ course: data.course, compact: true })}
                </>
              )
            ) : isLive ? (
              <>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400"><Radio className="h-7 w-7" /></span>
                <p className="text-lg font-bold">The class is live</p>
                <Button size="lg" onClick={join} loading={joining} icon={external ? ExternalLink : Video}>
                  {external ? 'Open meeting link' : 'Join classroom'}
                </Button>
              </>
            ) : data.status === 'upcoming' ? (
              <>
                <p className="text-lg font-bold">{startsInLabel(data.startsInMinutes)}</p>
                <p className="text-sm text-slate-300">{formatDateTime(data.startsAt)}</p>
                {isStaff ? (
                  <Button size="lg" onClick={() => start.run()} loading={start.loading} icon={Radio}>Go live now</Button>
                ) : data.canJoin ? (
                  <Button size="lg" onClick={join} loading={joining} icon={ExternalLink}>Open meeting link</Button>
                ) : (
                  <p className="text-sm text-slate-400">You can join when the teacher starts the class.</p>
                )}
              </>
            ) : (
              <p className="text-lg font-bold capitalize">This class is {data.status}</p>
            )}
          </div>
        )}

        {session && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
            {preview ? (
              <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-navy-900/90 px-4 py-2 shadow-xl backdrop-blur">
                <span className="text-xs font-semibold text-amber-300">Preview mode</span>
                <button type="button" onClick={leave} className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Leave</button>
              </div>
            ) : (
            <div className="pointer-events-auto flex items-center gap-1 rounded-2xl bg-navy-900/90 px-3 py-1.5 shadow-xl backdrop-blur">
              <ControlButton icon={media.audio ? Mic : MicOff} label="Mic" active={media.audio} onClick={() => command('toggleAudio')} />
              <ControlButton icon={media.video ? Camera : CameraOff} label="Camera" active={media.video} onClick={() => command('toggleVideo')} />
              <ControlButton icon={MonitorUp} label="Share Screen" onClick={() => command('toggleShareScreen')} />
              <ControlButton icon={Users} label="Participants" badge={participants} onClick={() => command('toggleTileView')} />
              <ControlButton icon={MessageCircle} label="Chat" onClick={onChatFocus} />
              {isStaff && <ControlButton icon={Radio} label={media.recording ? 'Stop' : 'Record'} danger={media.recording} onClick={toggleRecord} />}
              <Popover
                width={170}
                trigger={<span><ControlButton icon={MoreHorizontal} label="More" /></span>}
              >
                {(close) => (
                  <ul className="py-1.5 text-[13px]">
                    <li><button type="button" className="w-full px-4 py-2 text-left hover:bg-slate-50" onClick={() => { close(); container.current?.requestFullscreen?.(); }}>Full screen</button></li>
                    <li><button type="button" className="w-full px-4 py-2 text-left hover:bg-slate-50" onClick={() => { close(); command('toggleTileView'); }}>Toggle tile view</button></li>
                    <li><button type="button" className="w-full px-4 py-2 text-left hover:bg-slate-50" onClick={() => { close(); leave(); }}>Leave class</button></li>
                  </ul>
                )}
              </Popover>
              {isStaff && (
                <button type="button" onClick={() => end.run()} disabled={end.loading} className="ml-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  End Class
                </button>
              )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
