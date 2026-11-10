import { PortalWorkspace } from '../components/ui.jsx';
import { useState } from 'react';
import { Banknote, Building2, CalendarDays, Clock, Coins, FileText, IndianRupee, Wallet, Pencil } from 'lucide-react';
import { Button, Card, DataTable, DonutWithLegend, PageHeader, Select, StatCard, StatGrid, StatusBadge, TableCard, TableFooter, Tabs, formatCurrency, formatDate, indexColumn, useAuth, useGet, useListState, Modal, formatDateTime, BarsChart } from '../components/ui.jsx';
import { useNavigate } from 'react-router-dom';

const PERIODS = [['month', 'This Month'], ['last_month', 'Last Month'], ['year', 'This Year'], ['all', 'All Time']];
const TABS = [{ key: 'history', label: 'Payout History' }, { key: 'details', label: 'Earnings Details' }, { key: 'course', label: 'Course-wise Earnings' }, { key: 'monthly', label: 'Monthly Report' }];

export default function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [tab, setTab] = useState('history');
  const [viewing, setViewing] = useState(null);
  const list = useListState({}, { limit: 10 });

  const overview = useGet('/payouts/me/overview', { period }).data;
  const payouts = useGet('/payouts', { page: list.page, limit: list.pageSize }, { enabled: tab === 'history', keepPrevious: true });
  const rows = useGet('/payouts/me/earnings', { view: tab }, { enabled: tab !== 'history' }).data || [];
  const bank = user.teacher?.bank;
  const cards = overview?.cards;

  const historyColumns = [
    indexColumn(payouts.meta),
    { key: 'date', header: 'Payout Date', render: (p) => (p.payoutDate ? formatDate(p.payoutDate) : '—') },
    { key: 'period', header: 'Period', render: (p) => p.periodLabel },
    { key: 'earn', header: 'Total Earnings (₹)', render: (p) => formatCurrency(p.earnings) },
    { key: 'ded', header: 'Deductions', render: (p) => `${formatCurrency(p.deductions)} (${p.earnings ? Math.round((p.deductions / p.earnings) * 100) : 0}%)` },
    { key: 'amt', header: 'Payout Amount (₹)', render: (p) => <span className="font-semibold text-ink">{formatCurrency(p.amount)}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'txn', header: 'Transaction ID', render: (p) => <span className="font-mono text-xs text-slate-600">{p.transactionId || '—'}</span> },
    { key: 'a', header: 'Actions', render: (p) => <Button size="sm" variant="soft" onClick={() => setViewing(p)}>View</Button> },
  ];

  const detailColumns = [
    indexColumn(),
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'title', header: 'Class', render: (r) => <span className="font-medium text-ink">{r.title}</span> },
    { key: 'course', header: 'Course', render: (r) => r.course },
    { key: 'earning', header: 'Earning (₹)', render: (r) => formatCurrency(r.earning) },
    { key: 'status', header: 'Payout', render: (r) => <StatusBadge status={r.payoutStatus === 'unbilled' ? 'unbilled' : r.payoutStatus} /> },
  ];
  const courseColumns = [indexColumn(), { key: 'course', header: 'Course', render: (r) => <span className="font-medium text-ink">{r.course}</span> }, { key: 'classes', header: 'Classes', align: 'center', render: (r) => r.classes }, { key: 'earnings', header: 'Earnings (₹)', render: (r) => formatCurrency(r.earnings) }];
  const monthlyColumns = [{ key: 'month', header: 'Month', render: (r) => <span className="font-medium text-ink">{r.month}</span> }, { key: 'classes', header: 'Classes', align: 'center', render: (r) => r.classes }, { key: 'earnings', header: 'Earnings (₹)', render: (r) => formatCurrency(r.earnings) }, { key: 'ded', header: 'Deductions (₹)', render: (r) => formatCurrency(r.deductions) }, { key: 'net', header: 'Net (₹)', render: (r) => <span className="font-semibold text-emerald-600">{formatCurrency(r.net)}</span> }];

  const breakdown = (overview?.breakdown || []).map((b) => ({ name: b.title, value: b.earnings, extra: `${b.share}%` }));

  return (
    <>
      <PageHeader title="Earnings & Payouts" subtitle="Earnings, payout history and payment details." />

      <StatGrid cols={4}>
        <StatCard icon={Wallet} tone="green" label="Total Earnings" value={formatCurrency(cards?.totalEarnings.value)} trend={cards?.totalEarnings.trend} />
        <StatCard icon={Coins} tone="blue" label="Total Payouts" value={formatCurrency(cards?.totalPayouts.value)} />
        <StatCard icon={Clock} tone="orange" label="Pending Payout" value={formatCurrency(cards?.pendingPayout.value)} />
        <StatCard icon={FileText} tone="purple" label="This Month Earnings" value={formatCurrency(cards?.thisMonth.value)} trend={cards?.thisMonth.trend} />
      </StatGrid>

      <PortalWorkspace className="teacher-earnings-workspace" insights={<>
<Card
          title="Earning Summary"
          action={<div className="w-36"><Select value={period} onChange={(e) => setPeriod(e.target.value)} compact>{PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>}
        >
          <div className="grid grid-cols-2 gap-5">
            {[['Total Classes', overview?.summary.classes, Clock, 'bg-blue-100 text-blue-600'], ['Total Earnings', formatCurrency(overview?.summary.earnings), Banknote, 'bg-emerald-100 text-emerald-600'], ['Paid Amount', formatCurrency(overview?.summary.paid), Wallet, 'bg-violet-100 text-violet-600'], ['Pending Amount', formatCurrency(overview?.summary.pending), Clock, 'bg-amber-100 text-amber-600']].map(([label, value, Icon, tone]) => (
              <div key={label} className="text-center"><p className="text-xs font-medium text-slate-500">{label}</p><span className={`mx-auto mt-2 inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-2 text-xl font-extrabold text-ink">{value ?? '—'}</p></div>
            ))}
          </div>
        </Card>
<Card title="Earnings Breakdown">
          {breakdown.length ? <DonutWithLegend data={breakdown} format={formatCurrency} centerValue={formatCurrency(overview?.summary.earnings)} centerLabel="Total Earnings" size={150} /> : <p className="py-8 text-center text-sm text-slate-500">No earnings in this period yet. Earnings are credited when you complete a live class.</p>}
        </Card>
<Card title="Payout Settings" action={<Button size="sm" variant="outline" icon={Pencil} onClick={() => navigate('/profile#bank')}>Edit</Button>}>
            {bank?.accountNumber ? (
              <>
                <div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Building2 className="h-5 w-5" /></span><div className="min-w-0"><p className="font-bold text-ink">{bank.bankName}</p><p className="text-xs text-slate-500">{bank.accountType} •••• {bank.accountNumber.slice(-4)}</p></div>{bank.verified && <StatusBadge status="default" className="ml-auto" />}</div>
                <dl className="mt-4 space-y-2.5 text-[13px]">{[['Account Holder Name', bank.holderName], ['IFSC Code', bank.ifsc], ['Account Number', bank.accountNumber], ['UPI ID', bank.upiId]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>)}</dl>
              </>
            ) : <p className="text-sm text-slate-500">Add your bank details so the admin team can send your payouts.</p>}
          </Card>
<Card title="Upcoming Payout">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CalendarDays className="h-6 w-6" /></span>
              <div><p className="text-xl font-extrabold text-ink">{formatCurrency(overview?.upcoming.amount)}</p><p className="text-xs text-slate-500">Estimated Payout</p></div>
              <div className="ml-auto text-right"><p className="text-sm font-bold text-ink">{overview ? formatDate(overview.upcoming.expectedDate) : '—'}</p><p className="text-xs text-slate-500">Expected Date</p></div>
            </div>
          </Card>
</>}>
<TableCard tabs={<Tabs tabs={TABS} value={tab} onChange={setTab} />}>
          {tab === 'history' && (<><DataTable columns={historyColumns} rows={payouts.data || []} loading={payouts.isLoading} minWidth={900} empty={<p className="py-10 text-center text-sm text-slate-500">No payouts yet.</p>} /><TableFooter meta={payouts.meta} noun="payouts" onPage={list.setPage} pageSize={list.pageSize} onPageSize={list.setPageSize} /></>)}
          {tab === 'details' && <DataTable columns={detailColumns} rows={rows} minWidth={760} empty={<p className="py-10 text-center text-sm text-slate-500">No completed classes yet.</p>} />}
          {tab === 'course' && <DataTable columns={courseColumns} rows={rows} minWidth={520} />}
          {tab === 'monthly' && (<><DataTable columns={monthlyColumns} rows={rows} rowKey={(r) => r.id} minWidth={640} /><div className="p-5"><BarsChart data={[...rows].reverse()} xKey="month" currency series={[{ key: 'earnings', label: 'Earnings', color: '#2563eb' }, { key: 'net', label: 'Net', color: '#2d725e' }]} /></div></>)}
        </TableCard>
</PortalWorkspace>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} size="sm" title="Payout details" footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && <div className="grid gap-3 text-sm">{[['Period', viewing.periodLabel], ['Classes', viewing.classesConducted], ['Earnings', formatCurrency(viewing.earnings)], ['Deductions', formatCurrency(viewing.deductions)], ['Payout amount', formatCurrency(viewing.amount)], ['Method', viewing.method], ['Transaction ID', viewing.transactionId || '—'], ['Status', <StatusBadge key="s" status={viewing.status} />]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-slate-500">{k}</span><span className="font-semibold text-ink">{v}</span></div>)}</div>}
      </Modal>
    </>
  );
}
