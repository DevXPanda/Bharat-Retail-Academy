import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Form.jsx';
import { Badge } from '../ui/Display.jsx';

// Chips with an input: type a value and press Enter (or Add).
export function TagInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((t) => (
            <Badge key={t} tone="blue" className="gap-1.5">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button></Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder} />
        <Button variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

// A small repeating form: one row of inputs per item (education, certifications, availability slots).
export function RowsEditor({ rows = [], onChange, fields, blank, addLabel }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3" style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) auto` }}>
          {fields.map((f) => (
            <Input key={f.key} type={f.type || 'text'} value={row[f.key] || ''} onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [f.key]: e.target.value } : r)))} placeholder={f.label} aria-label={f.label} />
          ))}
          <button type="button" aria-label="Remove" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="px-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" icon={Plus} onClick={() => onChange([...rows, blank])}>{addLabel}</Button>
    </div>
  );
}
