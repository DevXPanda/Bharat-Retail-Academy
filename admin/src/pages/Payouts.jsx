import { PortalWorkspace } from '@ecomedu/ui';
import { useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, CreditCard, Download, IndianRupee, Plus, Wallet } from 'lucide-react';
import {
  Button, Card, DataTable, DateRangeField, Field, FilterBar, FilterSelect, Input, Modal, PageHeader, PersonCell, Select, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, ViewAll,
  formatCurrency, formatDate, formatNumber, indexColumn, toInputDate, useAction, useClient, useGet, useListState,
} from '../components/ui.jsx';

const METHODS = ['Bank Transfer', 'Razorpay', 'Cashfree', 'PayU', 'UPI'];

function GenerateModal({ open, onClose }) {
  const client = useClient();
  const now = new Date();
  const [form, setForm] = useState({ from: toInputDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toInputDate(new Date(now.getFullYear(), now.getMonth(), 0)), teacherId: '' });
  const teachers = useGet('/teachers', { limit: 100, status: 'active' }).data || [];
  const generate = useAction(
    () => client.post('/payouts/generate', { from: new Date(form.from).toISOString(), to: new Date(`${form.to}T23:59:59`).toISOString(), teacherId: form.teacherId || undefined }),
    { success: (r) => (r.data.length ? `${r.data.length} payout(s) created` : 'No unpaid completed classes in this period'), invalidate: ['/payouts'], onSuccess: onClose },
  );
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Process payout" subtitle="Creates pending payouts from completed, unbilled classes in the period." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={generate.loading} onClick={() => generate.run()}>Generate payouts</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
          <Field label="To"><Input type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
        </div>
        <Field label="Teacher" hint="Leave empty to include every teacher.">
          <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">All teachers</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        </Field>
      </div>
    </Modal>
  );
}

function ProcessModal({ payout, onClose }) {
  const client = useClient();
  const [form, setForm] = useState({ status: 'paid', method: payout?.method || 'Bank Transfer', transactionId: '' });
  const process = useAction(() => client.patch(`/payouts/${payout.id}/process`, form), { success: 'Payout updated', invalidate: ['/payouts'], onSuccess: onClose });
  if (!payout) return null;
  const bank = payout.teacher?.teacher?.bank;
  return (
    <Modal open onClose={onClose} size="sm" title="Process payout" subtitle={`${payout.teacher?.name} · ${formatCurrency(payout.amount)}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={process.loading} onClick={() => process.run()}>{form.status === 'paid' ? 'Mark as paid' : 'Save'}</Button></>}>
      <div className="space-y-4">
        {bank?.accountNumber ? (
          <p className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">{bank.bankName} · A/C {bank.accountNumber} · IFSC {bank.ifsc}{bank.upiId ? ` · UPI ${bank.upiId}` : ''}</p>
        ) : <p className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-700">The teacher has not added bank details yet.</p>}
        <Field label="Outcome"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="paid">Paid</option><option value="processing">Processing</option><option value="failed">Failed</option></Select></Field>
        <Field label="Payment method"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        {form.status === 'paid' && <Field label="Transaction / UTR ID" required><Input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder="e.g. UTR1234567890" /></Field>}
      </div>
    </Modal>
  );
}

export default function Payouts() {
  const client = useClient();
  const list = useListState({ status: 'all', teacher: 'all', method: 'all', from: '', to: '' });
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const summary = useGet('/payouts/summary').data;
  const top = useGet('/payouts/top-teachers').data || [];
  const teachers = useGet('/teachers', { limit: 100 }).data || [];
  const { data: rows = [], meta, isLoading, error, refetch } = useGet('/payouts', list.params, { keepPrevious: true });

  const retry = useAction((p) => client.post(`/payouts/${p.id}/retry`), { success: 'Payout moved back to pending', invalidate: ['/payouts'] });
  const exportCsv = useAction(() => client.download('/payouts/export', 'payouts.xlsx', { status: list.filters.status === 'all' ? undefined : list.filters.status }), { success: 'Export started' });

  const tabs = [
    { key: 'all', label: 'All Payouts', count: meta && list.filters.status === 'all' ? meta.total : undefined },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'paid', label: 'Paid' },
    { key: 'failed', label: 'Failed' },
  ];

  const columns = [
    indexColumn(meta),
    { key: 'teacher', header: 'Teacher', render: (p) => <PersonCell name={p.teacher?.name} src={p.teacher?.avatar} size={36} /> },
    { key: 'email', header: 'Email', render: (p) => <span className="text-slate-600">{p.teacher?.email}</span> },
    { key: 'classes', header: 'Classes Conducted', align: 'center', render: (p) => p.classesConducted },
    { key: 'earnings', header: 'Earnings (₹)', render: (p) => formatCurrency(p.earnings) },
    { key: 'amount', header: 'Payout Amount (₹)', render: (p) => <span className="font-semibold text-ink">{formatCurrency(p.amount)}</span> },
    { key: 'method', header: 'Payment Method', render: (p) => p.method },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'date', header: 'Payout Date', render: (p) => (p.payoutDate ? formatDate(p.payoutDate) : '-') },
    {
      key: 'action',
      header: 'Actions',
      render: (p) =>
        p.status === 'pending' || p.status === 'processing' ? <Button size="sm" variant="outline" onClick={() => setProcessing(p)}>Process</Button>
        : p.status === 'failed' ? <Button size="sm" variant="outline" onClick={() => retry.run(p)}>Retry</Button>
        : <Button size="sm" variant="outline" onClick={() => setViewing(p)}>View</Button>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Teacher Payouts"
        subtitle="Teacher earnings and payout history."
        actions={
          <>
            <Button size="lg" icon={Plus} onClick={() => setGenerating(true)}>Process Payout</Button>
            <Button size="lg" variant="outline" icon={Download} loading={exportCsv.loading} onClick={() => exportCsv.run()}>Export</Button>
            <DateRangeField from={list.filters.from} to={list.filters.to} onChange={({ from, to }) => { list.setFilter('from', from); list.setFilter('to', to); }} placeholder="Filter by period" className="w-56" />
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard icon={Wallet} tone="blue" label="Total Earnings" value={formatCurrency(summary?.totalEarnings.value)} sub="All teachers (this month)" trend={summary?.totalEarnings.trend} trendSuffix="vs last month" />
        <StatCard icon={CheckCircle2} tone="green" label="Total Paid" value={formatCurrency(summary?.totalPaid.value)} sub="Sent to teachers" trend={summary?.totalPaid.trend} trendSuffix="vs last month" />
        <StatCard icon={Clock} tone="orange" label="Pending Payouts" value={formatCurrency(summary?.pending.value)} sub="To be processed" />
        <StatCard icon={CreditCard} tone="purple" label="Teachers Paid" value={formatNumber(summary?.teachersPaid.value)} sub="Received payout this month" />
      </StatGrid>

      <PortalWorkspace insights={<><Card title="Top Teachers by Earnings">
          <ul className="space-y-4">
            {top.length === 0 && <li className="text-sm text-slate-500">No completed classes yet.</li>}
            {top.map((t, i) => (
              <li key={t.teacher?.id} className="flex items-center gap-3">
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${['bg-amber-100 text-amber-600', 'bg-slate-200 text-slate-600', 'bg-orange-100 text-orange-600'][i] || 'text-slate-500'}`}>{i + 1}</span>
                <PersonCell name={t.teacher?.name} sub={`${t.classes} Classes`} src={t.teacher?.avatar} size={38} />
                <span className="ml-auto text-sm font-bold text-ink">{formatCurrency(t.earnings)}</span>
              </li>
            ))}
          </ul>
        </Card></>}><TableCard tabs={<Tabs tabs={tabs} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} />}>
          <FilterBar search={list.filters.search} onSearch={(v) => list.setFilter('search', v)} searchPlaceholder="Search by teacher name, email or payout ID..." onReset={list.reset}>
            <FilterSelect value={list.filters.teacher} onChange={(v) => list.setFilter('teacher', v)} allLabel="All Teachers" options={teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-40" />
            <FilterSelect value={list.filters.method} onChange={(v) => list.setFilter('method', v)} allLabel="All Payment Methods" options={METHODS} className="w-48" />
          </FilterBar>
          <DataTable columns={columns} rows={rows} loading={isLoading} error={error} onRetry={refetch} minWidth={1050} />
          <TableFooter meta={meta} noun="payouts" onPage={list.setPage} />
        </TableCard></PortalWorkspace>

      <GenerateModal open={generating} onClose={() => setGenerating(false)} />
      <ProcessModal key={processing?.id} payout={processing} onClose={() => setProcessing(null)} />
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} size="sm" title="Payout details" footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="grid gap-3 text-sm">
            {[['Teacher', viewing.teacher?.name], ['Period', viewing.periodLabel], ['Classes', viewing.classesConducted], ['Earnings', formatCurrency(viewing.earnings)], ['Deductions', formatCurrency(viewing.deductions)], ['Payout amount', formatCurrency(viewing.amount)], ['Method', viewing.method], ['Transaction ID', viewing.transactionId || '—'], ['Paid on', viewing.payoutDate ? formatDate(viewing.payoutDate) : '—']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-500">{k}</span><span className="font-semibold text-ink">{v}</span></div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
