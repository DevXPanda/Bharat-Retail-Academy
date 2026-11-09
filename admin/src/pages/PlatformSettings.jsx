import { useEffect, useState } from 'react';
import { Building2, Globe, Percent, RotateCcw, Save, Wallet } from 'lucide-react';
import { Button, Card, ErrorState, Field, Input, PageHeader, PageLoader, Textarea, computePrice, cx, feeSplit, formatCurrency, useAction, useClient, useGet } from '@ecomedu/ui';

const MODES = [
  { value: 'inclusive', title: 'Price includes GST', text: 'The course price is what the student pays. GST is calculated inside it.' },
  { value: 'exclusive', title: 'Add GST on top', text: 'GST is added to the course price at checkout, so the student pays more than the listed price.' },
];

const toForm = (s) => ({
  gstPercent: String(s.gstPercent),
  gstMode: s.gstMode,
  platformFeePercent: String(s.platformFeePercent),
  businessName: s.businessName || '',
  gstin: s.gstin || '',
  invoicePrefix: s.invoicePrefix || 'INV',
  address: s.address || '',
  supportEmail: s.supportEmail || '',
  supportPhone: s.supportPhone || '',
  supportHours: s.supportHours || '',
  social: { facebook: s.social?.facebook || '', instagram: s.social?.instagram || '', linkedin: s.social?.linkedin || '', youtube: s.social?.youtube || '' },
});

function Row({ label, value, strong }) {
  return <div className={cx('flex justify-between gap-4 text-sm', strong ? 'font-bold text-ink' : 'text-slate-600')}><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

export default function PlatformSettings() {
  const client = useClient();
  const { data, isLoading, error, refetch } = useGet('/settings');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const save = useAction(
    () =>
      client.put('/settings', {
        ...form,
        gstPercent: Number(form.gstPercent),
        platformFeePercent: Number(form.platformFeePercent),
        businessName: form.businessName.trim(),
      }),
    { success: 'Settings saved. They apply to new purchases and payouts right away.', invalidate: ['/settings', '/public/settings', '/payouts', '/reports'] },
  );

  if (isLoading || !form) return error ? <ErrorState message={error} onRetry={refetch} /> : <PageLoader />;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setSocial = (key, value) => setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(data));

  const gst = Number(form.gstPercent) || 0;
  const fee = Number(form.platformFeePercent) || 0;
  const sample = computePrice(1499, { gstPercent: gst, gstMode: form.gstMode });
  const split = feeSplit(10000, fee);

  const submit = () => {
    const next = {};
    if (form.gstPercent === '' || gst < 0 || gst > 50) next.gstPercent = 'Enter a value between 0 and 50';
    if (form.platformFeePercent === '' || fee < 0 || fee > 90) next.platformFeePercent = 'Enter a value between 0 and 90';
    if (form.businessName.trim().length < 2) next.businessName = 'Enter your business name';
    if (form.gstin && !/^[0-9A-Za-z]{15}$/.test(form.gstin)) next.gstin = 'GSTIN has 15 letters/digits';
    if (!/^[A-Za-z0-9]{2,8}$/.test(form.invoicePrefix)) next.invoicePrefix = 'Use 2-8 letters or digits';
    if (!/^\S+@\S+\.\S+$/.test(form.supportEmail)) next.supportEmail = 'Enter a valid email';
    Object.entries(form.social).forEach(([k, v]) => { if (v && !/^https?:\/\//i.test(v)) next[`social_${k}`] = 'Start with https://'; });
    setErrors(next);
    if (!Object.keys(next).length) save.run();
  };

  return (
    <>
      <PageHeader
        title="Platform Settings"
        subtitle="GST, platform fee and business details. Changes apply to the whole platform, no .env edit needed."
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" icon={RotateCcw} disabled={!dirty} onClick={() => { setForm(toForm(data)); setErrors({}); }}>Reset</Button>
            <Button size="lg" icon={Save} disabled={!dirty} loading={save.loading} onClick={submit}>Save Changes</Button>
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card title={<span className="flex items-center gap-2 text-[15px] font-bold text-ink"><Percent className="h-4 w-4 text-brand-600" />GST on course purchases</span>}>
          <div className="space-y-5">
            <Field label="GST percentage" error={errors.gstPercent} hint="Set 0 if you do not charge GST.">
              <div className="relative w-40"><Input type="number" min={0} max={50} step="0.01" value={form.gstPercent} onChange={(e) => set('gstPercent', e.target.value)} className="pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODES.map((m) => (
                <button key={m.value} type="button" onClick={() => set('gstMode', m.value)} className={cx('rounded-xl border p-4 text-left transition', form.gstMode === m.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-brand-300')}>
                  <p className="text-sm font-bold text-ink">{m.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.text}</p>
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Example: a course priced {formatCurrency(1499)}</p>
              <div className="space-y-1.5">
                <Row label="Taxable value" value={formatCurrency(sample.baseAmount)} />
                <Row label={`GST (${gst}%)`} value={formatCurrency(sample.gstAmount)} />
                <div className="my-2 border-t border-slate-200" />
                <Row label="Student pays at checkout" value={formatCurrency(sample.total)} strong />
              </div>
            </div>
            <p className="text-xs text-slate-500">New purchases use these values. Payments already made keep the GST they were charged, and invoices show the same breakdown.</p>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2 text-[15px] font-bold text-ink"><Wallet className="h-4 w-4 text-brand-600" />Platform fee on teacher payouts</span>}>
          <div className="space-y-5">
            <Field label="Platform fee" error={errors.platformFeePercent} hint="Deducted from a teacher's class earnings when a payout is generated.">
              <div className="relative w-40"><Input type="number" min={0} max={90} step="0.01" value={form.platformFeePercent} onChange={(e) => set('platformFeePercent', e.target.value)} className="pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div>
            </Field>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Example: teacher earns {formatCurrency(10000)}</p>
              <div className="space-y-1.5">
                <Row label={`Platform keeps (${fee}%)`} value={formatCurrency(split.fee)} />
                <div className="my-2 border-t border-slate-200" />
                <Row label="Teacher receives" value={formatCurrency(split.net)} strong />
              </div>
            </div>
            <p className="text-xs text-slate-500">Applies to payouts generated from now on, and to the earnings and payout summaries.</p>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2 text-[15px] font-bold text-ink"><Building2 className="h-4 w-4 text-brand-600" />Business &amp; invoice details</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" required error={errors.businessName} className="sm:col-span-2"><Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} /></Field>
            <Field label="GSTIN" error={errors.gstin} hint="15 characters. Shown on invoices."><Input value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} maxLength={15} placeholder="22AAAAA0000A1Z5" /></Field>
            <Field label="Invoice prefix" error={errors.invoicePrefix} hint="e.g. INV-2026-00001"><Input value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} maxLength={8} /></Field>
            <Field label="Business address" className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2 text-[15px] font-bold text-ink"><Globe className="h-4 w-4 text-brand-600" />Support &amp; social links (public website footer)</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support email" required error={errors.supportEmail}><Input type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
            <Field label="Support phone"><Input value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} /></Field>
            <Field label="Support hours" className="sm:col-span-2"><Input value={form.supportHours} onChange={(e) => set('supportHours', e.target.value)} /></Field>
            {['facebook', 'instagram', 'linkedin', 'youtube'].map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} error={errors[`social_${k}`]}><Input value={form.social[k]} onChange={(e) => setSocial(k, e.target.value)} placeholder="https://" /></Field>
            ))}
            <p className="text-xs text-slate-500 sm:col-span-2">Leave a social link empty to hide its icon from the website footer.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
