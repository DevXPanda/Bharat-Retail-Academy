import { PortalWorkspace } from '@ecomedu/ui';
import { useState } from 'react';
import { CalendarDays, CreditCard, Download, IndianRupee, RefreshCcw, Timer, XCircle, CheckCircle2, Wallet } from 'lucide-react';
import {
  Button, Card, CourseMark, DataTable, DateRangeField, DateTimeCell, Field, FilterBar, FilterSelect, Input, Modal, PageHeader, PersonCell, ProgressBar, RowMenu, StatCard, StatGrid, StatusBadge,
  TableCard, TableFooter, Tabs, Trend, ViewAll, formatCurrency, formatDate, formatDateTime, formatNumber, indexColumn, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';

const METHODS = ['Razorpay', 'Cashfree', 'PayU', 'Free'];

function PaymentModal({ payment, onClose }) {
  const client = useClient();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const refund = useAction(() => client.post(`/payments/${payment.id}/refund`, { amount: amount ? Number(amount) : undefined, reason: reason || undefined }), {
    success: 'Refund initiated',
    invalidate: ['/payments', '/students', '/dashboard'],
    onSuccess: onClose,
  });
  const invoice = useAction(() => client.download(`/payments/${payment?.id}/invoice`, `invoice-${payment?.invoiceNumber || payment?.id}.pdf`), { success: 'Invoice downloaded' });
  if (!payment) return null;
  const rows = [
    ['Student', payment.student?.name],
    ['Email', payment.student?.email],
    ['Course', payment.course?.title],
    ['Batch', payment.batch?.name || '—'],
    ['Course price', formatCurrency(payment.coursePrice ?? payment.amount)],
    ...(payment.gstAmount != null ? [['Taxable value', formatCurrency(payment.baseAmount)], [`GST (${payment.gstPercent}%${payment.gstMode === 'exclusive' ? ', added on top' : ', included'})`, formatCurrency(payment.gstAmount)]] : []),
    ['Amount paid', formatCurrency(payment.amount)],
    ...(payment.invoiceNumber ? [['Invoice no', payment.invoiceNumber]] : []),
    ['Method', payment.method],
    ['Transaction ID', payment.transactionId || payment.razorpayOrderId || '—'],
    ['Date', formatDateTime(payment.paidAt || payment.createdAt)],
    ['Status', <StatusBadge key="s" status={payment.status} />],
  ];
  return (
    <Modal open onClose={onClose} title="Payment details" size="md" footer={<>{['successful', 'refunded'].includes(payment.status) && payment.amount > 0 && <Button variant="outline" icon={Download} loading={invoice.loading} onClick={() => invoice.run()}>Download invoice</Button>}<Button variant="secondary" onClick={onClose}>Close</Button></>}>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-500">{k}</p><div className="mt-0.5 break-all font-semibold text-ink">{v}</div></div>)}
        {payment.failureReason && <p className="sm:col-span-2 rounded-xl bg-red-50 p-3.5 text-red-600">{payment.failureReason}</p>}
        {payment.refund?.amount && <p className="sm:col-span-2 rounded-xl bg-violet-50 p-3.5 text-violet-700">Refunded {formatCurrency(payment.refund.amount)} on {formatDate(payment.refund.refundedAt)}{payment.refund.reason ? ` · ${payment.refund.reason}` : ''}</p>}
      </div>
      {payment.status === 'successful' && payment.amount > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <h4 className="text-sm font-bold text-ink">Issue a refund</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr_auto]">
            <Input type="number" min={1} max={payment.amount} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Full ₹${payment.amount}`} />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
            <Button variant="danger" icon={RefreshCcw} loading={refund.loading} onClick={() => refund.run()}>Refund</Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">A full refund also removes the student's course access.</p>
        </div>
      )}
    </Modal>
  );
}

export default function Payments() {
  const client = useClient();
  const list = useListState({ status: 'all', course: 'all', method: 'all', from: '', to: '' });
  const [viewing, setViewing] = useState(null);

  const summary = useGet('/payments/summary').data;
  const courseWise = useGet('/payments/course-wise').data || [];
  const refunds = useGet('/payments/refunds/recent').data || [];
  const courses = useGet('/courses/options').data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/payments', list.params, { keepPrevious: true });

  const exportCsv = useAction(() => client.download('/payments/export', 'payments.csv', { status: list.filters.status === 'all' ? undefined : list.filters.status, from: list.filters.from || undefined, to: list.filters.to || undefined }), { success: 'Export started' });

  const tabs = [
    { key: 'all', label: 'All Transactions' },
    { key: 'successful', label: 'Successful', count: summary?.successful.value },
    { key: 'pending', label: 'Pending', count: summary?.pending.value },
    { key: 'failed', label: 'Failed', count: summary?.failed.value },
    { key: 'refunded', label: 'Refunds', count: summary?.refunds.value },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'student', header: 'Student Name', render: (p) => <PersonCell name={p.student?.name} sub={p.student?.email} src={p.student?.avatar} size={36} /> },
    { key: 'course', header: 'Course / Plan', render: (p) => <div className="min-w-[130px] text-xs"><p className="line-clamp-2 font-medium text-slate-700">{p.course?.title}</p><p className="text-slate-500">{p.batch?.name || '—'}</p></div> },
    { key: 'amount', header: 'Amount', render: (p) => <span className="font-semibold text-ink">{formatCurrency(p.amount)}</span> },
    { key: 'method', header: 'Payment Method', render: (p) => <span className="inline-flex items-center gap-1.5 text-[13px] font-medium"><Wallet className="h-4 w-4 text-brand-500" />{p.method}</span> },
    { key: 'txn', header: 'Transaction ID', render: (p) => <span className="font-mono text-xs text-slate-600">{p.transactionId || p.razorpayOrderId || '—'}</span> },
    { key: 'date', header: 'Date & Time', render: (p) => <DateTimeCell value={p.paidAt || p.createdAt} /> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'action', header: 'Actions', render: (p) => <Button size="sm" variant="outline" onClick={() => setViewing(p)}>View</Button> },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Payments, refunds and transaction history."
        actions={
          <>
            <Button variant="outline" size="lg" icon={Download} loading={exportCsv.loading} onClick={() => exportCsv.run()}>Export</Button>
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="Filter by date" className="h-11 w-60" />
          </>
        }
      />

      <StatGrid cols={5}>
        <StatCard icon={IndianRupee} tone="green" label="Total Revenue" value={formatCurrency(summary?.revenue.value)} trend={summary?.revenue.trend} trendSuffix="vs last month" />
        <StatCard icon={CreditCard} tone="blue" label="Successful Payments" value={formatNumber(summary?.successful.value)} trend={summary?.successful.trend} trendSuffix="vs last month" />
        <StatCard icon={Timer} tone="orange" label="Pending Payments" value={formatNumber(summary?.pending.value)} trend={summary?.pending.trend} trendSuffix="vs last month" />
        <StatCard icon={XCircle} tone="red" label="Failed Payments" value={formatNumber(summary?.failed.value)} trend={summary?.failed.trend} trendSuffix="vs last month" />
        <StatCard icon={RefreshCcw} tone="purple" label="Refunds" value={formatNumber(summary?.refunds.value)} trend={summary?.refunds.trend} trendSuffix="vs last month" />
      </StatGrid>

      <PortalWorkspace insights={<>
          <Card title="Course-wise Revenue">
            <ul className="space-y-4">
              {courseWise.length === 0 && <li className="text-sm text-slate-500">No revenue yet.</li>}
              {courseWise.map((r) => (
                <li key={r.course?.id} className="flex items-center gap-3">
                  <CourseMark category={r.course?.category} src={r.course?.thumbnail} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[13px]"><span className="truncate font-semibold text-ink">{r.course?.title}</span><span className="shrink-0 font-semibold text-ink">{formatCurrency(r.revenue)}</span></div>
                    <div className="mt-1.5 flex items-center gap-2"><ProgressBar value={r.share} tone="blue" /><span className="text-xs text-slate-500">{r.share}%</span></div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Recent Refunds" action={<ViewAll onClick={() => list.setFilter('status', 'refunded')} />}>
            <ul className="space-y-4">
              {refunds.length === 0 && <li className="text-sm text-slate-500">No refunds issued.</li>}
              {refunds.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <PersonCell name={p.student?.name} sub={`${p.course?.title} · ${formatDate(p.refund?.refundedAt)}`} src={p.student?.avatar} size={38} />
                  <div className="ml-auto text-right"><p className="text-[13px] font-bold text-ink">{formatCurrency(p.refund?.amount)}</p><StatusBadge status="refunded" className="!px-2 !py-0.5 !text-[10px]" /></div>
                </li>
              ))}
            </ul>
          </Card>
        </>}><TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by student name, order ID, transaction ID..." onReset={list.reset}>
            <FilterSelect value={list.filters.course} onChange={(v) => list.setFilter('course', v)} allLabel="All Courses" options={courses.map((c) => ({ value: c.id, label: c.title }))} className="w-40" />
            <FilterSelect value={list.filters.method} onChange={(v) => list.setFilter('method', v)} allLabel="All Payment Methods" options={METHODS} className="w-48" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={1000} />
          <TableFooter meta={meta} noun="transactions" onPage={list.setPage} />
        </TableCard></PortalWorkspace>

      <PaymentModal payment={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
