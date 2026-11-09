import { formatDate, formatTime, cx } from '../../lib/format.js';
import { Badge, PersonCell, ProgressBar } from '../ui/Display.jsx';
import { CourseMark } from './Brands.jsx';

const EXPERTISE_TONE = {
  Amazon: 'orange',
  Flipkart: 'blue',
  Shopify: 'green',
  Meesho: 'pink',
  'Digital Marketing': 'purple',
  'E-Commerce': 'pink',
  'Product Sourcing': 'orange',
  'WhatsApp Marketing': 'green',
  'Business Skills': 'blue',
};

export const ExpertiseTag = ({ value }) => (value ? <Badge tone={EXPERTISE_TONE[value] || 'slate'}>{value}</Badge> : <span className="text-slate-400">—</span>);

export function ClassCell({ cls }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CourseMark category={cls.course?.category} src={cls.course?.thumbnail} size={38} />
      <div className="min-w-[140px]"><p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{cls.title}</p>{cls.isFreeDemo && <Badge tone="amber" className="mt-1 !px-1.5 !py-0.5 !text-[10px]">Free Demo</Badge>}</div>
    </div>
  );
}

export function CourseCell({ course, sub }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CourseMark category={course?.category} src={course?.thumbnail} size={40} />
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{course?.title}</p>
        {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function DateTimeCell({ value, className }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <div className={cx('text-[13px] leading-snug', className)}>
      <p className="font-medium text-slate-700">{formatDate(value)}</p>
      <p className="text-xs text-slate-500">{formatTime(value)}</p>
    </div>
  );
}

export function SeatsCell({ value, max, withBar }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="min-w-[70px]">
      <p className="text-[13px] font-medium text-slate-700">{value}/{max}</p>
      {withBar && <ProgressBar value={pct} tone={pct >= 100 ? 'green' : 'blue'} className="mt-1" />}
    </div>
  );
}

export const TeacherCell = ({ teacher }) => (teacher ? <PersonCell name={teacher.name} src={teacher.avatar} size={32} /> : <span className="text-slate-400">—</span>);
