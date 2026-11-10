import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { useClient } from '../../context/AppProviders.jsx';
import { useAction, useGet } from '../../hooks/index.js';
import { cx } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Field, Select, Textarea } from '../ui/Form.jsx';
import { Spinner } from '../ui/Display.jsx';
import { Modal } from '../ui/Overlay.jsx';

const RELATED_LABEL = {
  payment: 'Which payment is this about?',
  course: 'Which course is this about?',
  liveClass: 'Which live class is this about?',
  certificate: 'Which certificate is this about?',
  recording: 'Which recording is this about?',
  payout: 'Which payout is this about?',
};

const BLANK = { category: '', issue: '', related: '', message: '' };

/**
 * Guided ticket form shared by students and teachers: pick a category, pick a ready-made issue,
 * attach the exact record it is about, add details. Subject and priority are set by the server,
 * so support receives every ticket in the same structured shape.
 */
export function TicketComposer({ open, onClose, onCreated, overlay: Overlay = Modal }) {
  const client = useClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const options = useGet('/tickets/options', undefined, { enabled: open, staleTime: 5 * 60000 });
  const categories = options.data || [];
  const category = categories.find((c) => c.value === form.category);
  const issue = category?.issues.find((i) => i.value === form.issue);
  const relatedKind = issue?.related;

  const related = useGet('/tickets/related', { kind: relatedKind }, { enabled: open && Boolean(relatedKind) });
  const relatedOptions = related.data || [];

  useEffect(() => { if (!open) { setForm(BLANK); setErrors({}); } }, [open]);

  const create = useAction(() => client.post('/tickets', { category: form.category, issue: form.issue, related: form.related || undefined, message: form.message.trim() }), {
    success: 'Ticket raised. Our team will reply soon.',
    invalidate: ['/tickets'],
    onSuccess: ({ data }) => { onCreated?.(data.id); onClose(); },
  });

  const submit = () => {
    const next = {};
    if (!form.category) next.category = 'Choose what your issue is about';
    else if (!form.issue) next.issue = 'Choose the issue that matches best';
    else if (relatedKind && !form.related) next.related = 'Select the record so we can look it up';
    if (form.message.trim().length < 10) next.message = 'Add a few details so support can help faster';
    setErrors(next);
    if (!Object.keys(next).length) create.run();
  };

  const summary = useMemo(() => (issue ? issue.label : ''), [issue]);

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Raise a support ticket"
      subtitle="Choose your issue and we will review your records and reply inside the platform."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={create.loading} onClick={submit}>Submit ticket</Button></>}
    >
      {options.isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>
      ) : (
        <div className="space-y-5">
          <Field label="What do you need help with?" required error={errors.category}>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set({ category: c.value, issue: '', related: '' })}
                  aria-pressed={form.category === c.value}
                  className={cx('rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition', form.category === c.value ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600' : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-slate-50')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          {category && (
            <Field label="What exactly is the problem?" required error={errors.issue}>
              <Select value={form.issue} onChange={(e) => set({ issue: e.target.value, related: '' })}>
                <option value="">Select an issue…</option>
                {category.issues.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </Select>
            </Field>
          )}

          {relatedKind && (
            <Field label={RELATED_LABEL[relatedKind]} required error={errors.related} hint={!related.isLoading && relatedOptions.length === 0 ? 'No records found on your account for this. Pick another issue or choose "Something else".' : undefined}>
              <Select value={form.related} onChange={(e) => set({ related: e.target.value })} disabled={related.isLoading}>
                <option value="">{related.isLoading ? 'Loading your records…' : 'Select…'}</option>
                {relatedOptions.map((o) => <option key={o.id} value={o.id}>{o.label}{o.hint ? ` (${o.hint})` : ''}</option>)}
              </Select>
            </Field>
          )}

          {issue && (
            <Field label="Add details" required error={errors.message}>
              <Textarea rows={4} value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder="Tell us what happened, when it started and anything you already tried." />
            </Field>
          )}

          {issue && (
            <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span><strong className="text-slate-700">{summary}</strong> - support reviews your records and usually replies within 24 hours. You can track progress here.</span>
            </p>
          )}
        </div>
      )}
    </Overlay>
  );
}
