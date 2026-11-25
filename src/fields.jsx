import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({ children, ...props }) {
  return <span className="select-field"><select {...props}>{children}</select><ChevronDown size={13} /></span>;
}

export function Color({ value, onChange, label }) {
  return <span className="color-field"><input type="color" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /><span aria-hidden="true">{value.toUpperCase()}</span></span>;
}

export function Seconds({ value, onChange, max, min = 0.1 }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const valueAsNumber = Number(draft);
    const next = draft !== '' && Number.isFinite(valueAsNumber) ? Math.max(min, Math.min(max, valueAsNumber)) : value;
    setDraft(String(next));
    onChange(next);
  }
  return <span className="unit-field"><input inputMode="decimal" type="number" min={min} max={max} step="0.1" value={draft}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><span>mp</span></span>;
}
