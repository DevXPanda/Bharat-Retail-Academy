import { PortalWorkspace } from '@ecomedu/ui';
import { useState } from 'react';
import { BookOpen, Download, FileSpreadsheet, IndianRupee, PlayCircle, TrendingUp, Users, Wallet, Eye, UserCheck } from 'lucide-react';
import {
  BarsChart, Button, Card, CourseMark, DataTable, DonutWithLegend, EmptyState, PageHeader, PersonCell, ProgressBar, Select, StatCard, StatGrid, TableCard, Tabs, TrendChart, ViewAll,
  formatCurrency, formatNumber, useAction, useClient, useGet, Trend,
} from '../components/ui.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'monthly', label: 'Monthly Report' },
  { key: 'yearly', label: 'Yearly Report' },
  { key: 'students', label: 'Student Reports' },
  { key: 'teachers', label: 'Teacher Reports' },
  { key: 'courses', label: 'Course Reports' },
  { key: 'payments', label: 'Payment Reports' },
  { key: 'revenue', label: 'Revenue Reports' },
];

const money = (key, bold) => ({ render: (r) => <span className={bold ? 'font-semibold text-brand-600' : ''}>{formatCurrency(r[key])}</span> });
const MONTHLY_COLUMNS = (label, key) => [
  { key, header: label, width: 120, render: (r) => <span className="font-semibold text-ink">{r[key]}</span> },
  { key: 'newStudents', header: 'New Students', align: 'center', render: (r) => r.newStudents },
  { key: 'topCourse', header: 'Top Course', render: (r) => r.topCourse || '—' },
  { key: 'payments', header: 'Payment (₹)', ...money('payments', true) },
  { key: 'gst', header: 'GST (₹)', render: (r) => formatCurrency(r.gst) },
  { key: 'classes', header: 'Total Classes', align: 'center', render: (r) => <span className="font-semibold text-violet-600">{r.classes}</span> },
  { key: 'teacherPayouts', header: 'Teacher Payouts (₹)', render: (r) => formatCurrency(r.teacherPayouts) },
  { key: 'refunds', header: 'Refunds (₹)', render: (r) => <span className={r.refunds ? 'text-red-500' : ''}>{formatCurrency(r.refunds)}</span> },
  { key: 'net', header: 'Net Revenue (₹)', render: (r) => <span className="font-semibold text-emerald-600">{formatCurrency(r.net)}</span> },
];

function TotalsRow({ totals, label }) {
  return (
    <div className="m-4 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl bg-brand-50 px-5 py-3.5 text-sm font-bold text-ink">
      <span>{label}</span>
      <span>Payments <span className="text-brand-600">{formatCurrency(totals.payments)}</span></span>
      <span>GST {formatCurrency(totals.gst)}</span>
      <span>Classes <span className="text-violet-600">{totals.classes}</span></span>
      <span>Payouts {formatCurrency(totals.teacherPayouts)}</span>
      <span>Refunds <span className="text-red-500">{formatCurrency(totals.refunds)}</span></span>
      <span>Net <span className="text-emerald-600">{formatCurrency(totals.net)}</span></span>
    </div>
  );
}

function SeriesTab({ type, year }) {
  const { data } = useGet('/reports/series', { type, year });
  if (!data) return <p className="p-10 text-center text-sm text-slate-500">Loading report...</p>;
  if (type === 'students') {
    return (
      <div className="grid gap-6 p-5 lg:grid-cols-[2fr_1fr]">
        <div><h4 className="mb-3 text-sm font-bold text-ink">New students per month</h4><BarsChart data={data.monthly} xKey="month" series={[{ key: 'value', label: 'New students', color: '#2f6df3' }]} /></div>
        <div><h4 className="mb-3 text-sm font-bold text-ink">Student status</h4><DonutWithLegend data={data.distribution.map((d) => ({ ...d, name: d.name[0].toUpperCase() + d.name.slice(1), color: { active: '#22c55e', pending: '#f59e0b', inactive: '#ef4444' }[d.name] }))} centerValue={data.distribution.reduce((s, d) => s + d.value, 0)} centerLabel="Students" size={140} /></div>
      </div>
    );
  }
  if (type === 'teachers') {
    return <div className="p-5"><h4 className="mb-3 text-sm font-bold text-ink">Completed classes & earnings per teacher</h4><BarsChart data={data.rows} xKey="name" series={[{ key: 'classes', label: 'Classes', color: '#8b5cf6' }]} /></div>;
  }
  if (type === 'courses') {
    return (
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div><h4 className="mb-3 text-sm font-bold text-ink">Enrollments vs completions</h4><BarsChart data={data.rows} xKey="name" layout="vertical" height={360} series={[{ key: 'enrolled', label: 'Enrolled', color: '#2f6df3' }, { key: 'completed', label: 'Completed', color: '#22c55e' }]} /></div>
        <div><h4 className="mb-3 text-sm font-bold text-ink">Revenue by course</h4><BarsChart data={data.rows} xKey="name" layout="vertical" height={360} currency series={[{ key: 'revenue', label: 'Revenue', color: '#f59e0b' }]} /></div>
      </div>
    );
  }
  if (type === 'payments') {
    return (
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div><h4 className="mb-3 text-sm font-bold text-ink">Transactions by status</h4><DonutWithLegend data={data.status.map((d) => ({ ...d, name: d.name[0].toUpperCase() + d.name.slice(1), color: { successful: '#22c55e', pending: '#f59e0b', failed: '#ef4444', refunded: '#8b5cf6' }[d.name] }))} centerValue={data.status.reduce((s, d) => s + d.value, 0)} centerLabel="Transactions" size={150} /></div>
        <div><h4 className="mb-3 text-sm font-bold text-ink">Revenue by payment method</h4><DonutWithLegend data={data.methods} format={formatCurrency} centerValue={formatCurrency(data.methods.reduce((s, d) => s + d.value, 0))} size={150} /></div>
      </div>
    );
  }
  return <div className="p-5"><h4 className="mb-3 text-sm font-bold text-ink">Revenue, payouts and net revenue</h4><TrendChart data={data.monthly} xKey="month" currency height={320} series={[{ key: 'revenue', label: 'Revenue', color: '#2f6df3' }, { key: 'payouts', label: 'Payouts', color: '#f59e0b' }, { key: 'net', label: 'Net', color: '#22c55e' }]} /></div>;
}

export default function Reports() {
  const client = useClient();
  const thisYear = new Date().getFullYear();
  const [tab, setTab] = useState('overview');
  const [year, setYear] = useState(thisYear);

  const overview = useGet('/reports/overview', { year }).data;
  const monthly = useGet('/reports/monthly', { year }, { enabled: ['overview', 'monthly', 'yearly'].includes(tab) }).data;
  const yearly = useGet('/reports/yearly', { from: thisYear - 5, to: thisYear }, { enabled: tab === 'yearly' }).data;
  const topCourses = useGet('/reports/top-courses').data || [];
  const topTeachers = useGet('/reports/top-teachers').data || [];

  const download = useAction((type) => client.download('/reports/export', `${type}-report-${type === 'monthly' ? year : 'yearly'}.csv`, { type, year, from: thisYear - 5, to: thisYear }), { success: 'Report download started' });

  const cards = overview?.cards;
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);
  const trendData = (monthly?.rows || []).map((r) => ({ label: r.month.slice(0, 3), payments: r.payments, net: r.net }));

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Enrollment, teaching and revenue reports."
        actions={
          <>
            <div className="w-28"><Select aria-label="Report year" value={year} onChange={(e) => setYear(Number(e.target.value))} compact>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Select></div>
            <Button variant="outline" size="lg" icon={Download} loading={download.loading} onClick={() => download.run('monthly')}>Monthly CSV</Button>
            <Button variant="outline" size="lg" icon={Download} loading={download.loading} onClick={() => download.run('yearly')}>Yearly CSV</Button>
          </>
        }
      />

      <StatGrid cols={6} className="!gap-3">
                <StatCard icon={IndianRupee} tone="green" label="Total Payments" value={formatCurrency(cards?.payments.value)} trend={cards?.payments.trend} trendSuffix="vs last year" />
                <StatCard icon={Users} tone="blue" label="New Students" value={formatNumber(cards?.newStudents.value)} trend={cards?.newStudents.trend} trendSuffix="vs last year" />
                <StatCard icon={BookOpen} tone="orange" label="Courses Sold" value={formatNumber(cards?.coursesSold.value)} trend={cards?.coursesSold.trend} trendSuffix="vs last year" />
                <StatCard icon={PlayCircle} tone="purple" label="Total Classes" value={formatNumber(cards?.classes.value)} trend={cards?.classes.trend} trendSuffix="vs last year" />
                <StatCard icon={Wallet} tone="red" label="Teacher Payouts" value={formatCurrency(cards?.teacherPayouts.value)} trend={cards?.teacherPayouts.trend} trendSuffix="vs last year" />
                <StatCard icon={TrendingUp} tone="orange" label="Net Revenue" value={formatCurrency(cards?.net.value)} trend={cards?.net.trend} trendSuffix="vs last year" />
              </StatGrid>

<PortalWorkspace insights={<>
          <Card title="Top Performing Courses">
            <ul className="space-y-4">
              {topCourses.length === 0 && <li className="text-xs text-slate-500">No course activity yet.</li>}
              {topCourses.map((c, i) => (
                <li key={c.course?.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                  <CourseMark category={c.course?.category} src={c.course?.thumbnail} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-[13px]"><span className="truncate font-semibold text-ink">{c.course?.title}</span><span className="font-semibold text-slate-600">{c.students}</span></div>
                    <ProgressBar value={c.share} tone={['blue', 'green', 'orange', 'purple', 'red'][i % 5]} className="mt-1.5" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Top Teachers">
            <ul className="space-y-4">
              {topTeachers.length === 0 && <li className="text-xs text-slate-500">No completed classes yet.</li>}
              {topTeachers.map((t, i) => (
                <li key={t.teacher?.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                  <PersonCell name={t.teacher?.name} sub={`${t.classes} Classes`} src={t.teacher?.avatar} size={38} />
                  {t.rating > 0 && <span className="ml-auto text-sm font-bold text-ink">{t.rating} <span className="text-amber-400">★</span></span>}
                </li>
              ))}
            </ul>
          </Card>
        </>}><div className="min-w-0 space-y-6">
          <TableCard tabs={<Tabs tabs={TABS} value={tab} onChange={setTab} />} className="!overflow-visible">
            

            {tab === 'overview' && trendData.length === 0 && <EmptyState icon={TrendingUp} title="No report data yet" description={`Revenue and enrollment activity for ${year} will appear here.`} />}
            {tab === 'overview' && trendData.length > 0 && (
              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <div><h4 className="mb-3 text-sm font-bold text-ink">Revenue trend - {year}</h4><TrendChart data={trendData} currency series={[{ key: 'payments', label: 'Payments', color: '#2f6df3' }, { key: 'net', label: 'Net revenue', color: '#22c55e' }]} /></div>
                <div><h4 className="mb-3 text-sm font-bold text-ink">New students - {year}</h4><BarsChart data={(monthly?.rows || []).map((r) => ({ label: r.month.slice(0, 3), students: r.newStudents }))} series={[{ key: 'students', label: 'New students', color: '#8b5cf6' }]} /></div>
              </div>
            )}

            {['monthly', 'yearly'].includes(tab) && monthly && (
              <>
                <h3 className="px-5 pt-5 text-[15px] font-bold text-ink">Monthly Payment & Revenue Summary</h3>
                <p className="px-5 text-xs text-slate-500">Month wise payments, GST ({'incl. in price'}), teacher payouts, refunds and net revenue for {year}.</p>
                <DataTable columns={MONTHLY_COLUMNS('Month', 'month')} rows={monthly.rows} rowKey={(r) => r.month} minWidth={980} className="mt-3" />
                <TotalsRow totals={monthly.totals} label="Total" />
              </>
            )}

            {tab === 'yearly' && yearly && (
              <>
                <h3 className="px-5 pt-3 text-[15px] font-bold text-ink">Yearly Payment & Revenue Summary</h3>
                <DataTable
                  columns={[
                    ...MONTHLY_COLUMNS('Year', 'year'),
                    { key: 'growth', header: 'Growth', render: (r) => (r.growth === null ? '—' : <Trend value={r.growth} suffix="" />) },
                  ]}
                  rows={yearly.rows}
                  rowKey={(r) => r.year}
                  minWidth={1050}
                  className="mt-3"
                />
                <TotalsRow totals={yearly.totals} label="Total" />
              </>
            )}

            {['students', 'teachers', 'courses', 'payments', 'revenue'].includes(tab) && <SeriesTab type={tab} year={year} />}
          </TableCard>
        </div></PortalWorkspace>
    </>
  );
}
