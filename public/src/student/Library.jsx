import { PlatformLogo } from '../components/PlatformLogo.jsx';
import { StudentTable as DataTable } from './components/StudentTable.jsx';
import { useState } from 'react';
import { Award, Download, Play, PlayCircle, CreditCard } from 'lucide-react';
import {
  Avatar, Button, EmptyState, ErrorState, FilterSelect, Modal, PageHeader, PageLoader, StatusBadge, TableCard, TableFooter, brandGradient, cx, formatCurrency, formatDate,
  formatDateTime, formatVideoLength, indexColumn, useAction, useClient, useGet, useListState, Select,
} from './ui.js';

export function Recordings() {
  const client = useClient();
  const [course, setCourse] = useState('all');
  const [playing, setPlaying] = useState(null);
  const courses = useGet('/learning/courses').data || [];
  const { data = [], isLoading, error, refetch } = useGet('/recordings', { course, limit: 30 });

  const play = (r) => { setPlaying(r); client.post(`/recordings/${r.id}/view`).catch(() => {}); };

  return (
    <>
      <PageHeader title="Class Recordings" subtitle="Watch any class again, at your own pace." actions={<div className="w-56"><Select value={course} onChange={(e) => setCourse(e.target.value)} compact><option value="all">All courses</option>{courses.map((e) => <option key={e.course.id} value={e.course.id}>{e.course.title}</option>)}</Select></div>} />
      {isLoading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={refetch} /> : data.length === 0 ? <div className="card"><EmptyState icon={PlayCircle} title="No recordings yet" description="Recordings appear here after your teacher publishes them." /></div> : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((r) => (
            <button key={r.id} type="button" onClick={() => play(r)} className="card overflow-hidden text-left transition hover:-translate-y-1">
              <div className={cx('relative flex h-40 items-center justify-center bg-gradient-to-br', brandGradient(r.course?.category))}>
                {r.thumbnail ? <img src={r.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <PlatformLogo category={r.course?.category} size={64}  />}
                <span className="absolute inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white"><Play className="h-5 w-5 fill-white" /></span>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{formatVideoLength(r.durationSec)}</span>
              </div>
              <div className="p-4"><p className="line-clamp-2 text-[14px] font-bold leading-snug text-ink">{r.title}</p><p className="mt-1 text-xs text-slate-500">{r.course?.title}</p><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-2"><Avatar name={r.teacher?.name} src={r.teacher?.avatar} size={22} />{r.teacher?.name}</span><span>{formatDate(r.classDate)}</span></div></div>
            </button>
          ))}
        </div>
      )}
      <Modal open={Boolean(playing)} onClose={() => setPlaying(null)} size="xl" title={playing?.title} subtitle={playing?.course?.title}>{playing && <video src={playing.videoUrl} controls autoPlay className="aspect-video w-full rounded-xl bg-black" />}</Modal>
    </>
  );
}

export function Certificates() {
  const client = useClient();
  const { data = [], isLoading, error, refetch } = useGet('/certificates/mine');
  const download = useAction((c) => client.download(`/certificates/${c.id}/download`, `${c.certificateId}.pdf`), { success: 'Download started', invalidate: ['/certificates'] });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  return (
    <>
      <PageHeader title="Certificates" subtitle="Certificates you have earned. Anyone can verify them online with the certificate ID." />
      {data.length === 0 ? <div className="card"><EmptyState icon={Award} title="No certificates yet" description="Complete a course to earn your certificate." /></div> : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <article key={c.id} className="card p-6">
              <div className="flex items-start justify-between"><span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Award className="h-6 w-6" /></span><StatusBadge status={c.status} label={c.status === 'pending' ? 'Awaiting verification' : undefined} /></div>
              <h3 className="mt-4 text-[16px] font-extrabold leading-snug text-ink">{c.course?.title}</h3>
              <p className="mt-1 text-xs text-slate-500">Completed on {formatDate(c.completionDate)}</p>
              <p className="mt-3 font-mono text-xs text-slate-500">{c.certificateId}</p>
              <Button className="mt-5 w-full" icon={Download} disabled={c.status !== 'verified'} loading={download.loading} onClick={() => download.run(c)}>Download PDF</Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function Payments() {
  const client = useClient();
  const list = useListState({ status: 'all' }, { limit: 10 });
  const invoice = useAction((p) => client.download(`/payments/${p.id}/invoice`, `invoice-${p.invoiceNumber || p.id}.pdf`), { success: 'Invoice downloaded', invalidate: ['/payments'] });
  const { data = [], meta, isLoading, error, refetch } = useGet('/payments', list.params, { keepPrevious: true });
  const columns = [
    indexColumn(meta),
    { key: 'course', header: 'Course', render: (p) => <span className="font-semibold text-ink">{p.course?.title}</span> },
    { key: 'amount', header: 'Amount', render: (p) => <div><p className="font-semibold text-ink">{formatCurrency(p.amount)}</p>{p.gstAmount > 0 && <p className="text-[11px] text-slate-500">incl. GST {formatCurrency(p.gstAmount)}</p>}</div> },
    { key: 'method', header: 'Method', render: (p) => p.method },
    { key: 'txn', header: 'Transaction ID', render: (p) => <span className="font-mono text-xs text-slate-600">{p.transactionId || p.razorpayOrderId || '—'}</span> },
    { key: 'date', header: 'Date', render: (p) => formatDateTime(p.paidAt || p.createdAt) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'invoice', header: 'Invoice', render: (p) => (['successful', 'refunded'].includes(p.status) && p.amount > 0 ? <Button size="sm" variant="outline" icon={Download} loading={invoice.loading} onClick={() => invoice.run(p)}>Invoice</Button> : <span className="text-slate-400">—</span>) },
  ];
  return (
    <>
      <PageHeader title="Payments" subtitle="Your payment and refund history." />
      <TableCard>
        <DataTable columns={columns} rows={data} loading={isLoading} error={error} onRetry={refetch} minWidth={760} empty={<EmptyState icon={CreditCard} title="No payments yet" />} />
        <TableFooter meta={meta} noun="payments" onPage={list.setPage} />
      </TableCard>
    </>
  );
}
