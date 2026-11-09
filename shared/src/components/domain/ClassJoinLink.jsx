import { Copy, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDateLong, formatTime } from '../../lib/format.js';
import { BRAND } from '../layout/Brand.jsx';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/Overlay.jsx';

const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');

export const joinLinkFor = (classId) => `${PUBLIC_URL}/join/${classId}`;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand('copy');
    field.remove();
    return done;
  }
}

export function useCopyJoinLink() {
  const toast = useToast();
  return async (cls) => {
    if (await copyText(joinLinkFor(cls.id))) toast.success('Student join link copied');
    else toast.error('Could not copy the link');
  };
}

export function shareMessage(cls) {
  return `Join my live class "${cls.title}" on ${formatDateLong(cls.startsAt)} at ${formatTime(cls.startsAt)}.\nLog in to your ${BRAND.name} account and join here: ${joinLinkFor(cls.id)}`;
}

export function ClassJoinLink({ cls }) {
  const copy = useCopyJoinLink();
  if (!cls) return null;
  const link = joinLinkFor(cls.id);
  const closed = ['completed', 'cancelled'].includes(cls.status);

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
      <p className="text-[13px] font-bold text-ink">Student join link</p>
      <div className="mt-2 flex items-center gap-2">
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Student join link" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600" />
        <Button size="sm" variant="outline" icon={Copy} onClick={() => copy(cls)}>Copy</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage(cls))}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600"><MessageCircle className="h-4 w-4" />Share</a>
      </div>
      <p className="mt-2.5 flex gap-2 text-xs leading-relaxed text-slate-600">
        {cls.isFreeDemo ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />}
        {closed
          ? 'This class is over, so the link no longer lets anyone join.'
          : cls.isFreeDemo
            ? 'Free demo: any student with an account can join using this link, no payment needed.'
            : 'Only students enrolled in this course can join. Others will be asked to enroll first.'}
      </p>
    </div>
  );
}
