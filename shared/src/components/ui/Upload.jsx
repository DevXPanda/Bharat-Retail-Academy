import { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Video, X } from 'lucide-react';
import { useClient } from '../../context/AppProviders.jsx';
import { cx } from '../../lib/format.js';
import { Field } from './Form.jsx';

export function FileUpload({ label, kind = 'image', value, onChange, hint, accept, required, title }) {
  const client = useClient();
  const input = useRef(null);
  const [state, setState] = useState({ loading: false, progress: 0, error: '' });
  const isVideo = kind === 'video';
  const Icon = isVideo ? Video : ImageIcon;

  const pick = async (file) => {
    if (!file) return;
    setState({ loading: true, progress: 0, error: '' });
    try {
      const uploaded = await client.upload(kind, file, (progress) => setState((s) => ({ ...s, progress })));
      onChange(uploaded.url, uploaded);
      setState({ loading: false, progress: 0, error: '' });
    } catch (err) {
      setState({ loading: false, progress: 0, error: err.message });
    }
  };

  return (
    <Field label={label} required={required} error={state.error}>
      <div
        className={cx('flex items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 transition hover:border-brand-300', state.loading && 'opacity-80')}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <button type="button" onClick={() => input.current?.click()} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-slate-400 shadow-sm">
            {state.loading ? <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> : value && !isVideo ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{state.loading ? `Uploading ${state.progress}%` : value ? 'Change file' : title || 'Upload file'}</span>
            <span className="block truncate text-xs text-slate-500">{value && isVideo ? value.split('/').pop() : hint}</span>
          </span>
        </button>
        {value && !state.loading && (
          <button type="button" aria-label="Remove file" onClick={() => onChange('')} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        )}
        <input ref={input} type="file" hidden accept={accept || (isVideo ? 'video/*' : 'image/png,image/jpeg,image/webp')} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </Field>
  );
}
