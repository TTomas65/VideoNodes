import { lazy, Suspense, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ColorPalette = lazy(() => import('./color-palette'));

export function Select({ children, ...props }) {
  return <span className="select-field"><select {...props}>{children}</select><ChevronDown size={13} /></span>;
}

export function Color({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="color-field" aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="color-field-swatch" style={{ background: value }} /><span aria-hidden="true">{value.toUpperCase()}</span>
    </button>
    {open && <Suspense fallback={null}>
      <ColorPalette value={value} onApply={onChange} onClose={() => setOpen(false)} />
    </Suspense>}
  </>;
}

export function GradientPalette({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="button add-gradient-color" aria-haspopup="dialog" onClick={() => setOpen(true)}>Színátmenet generálása</button>
    {open && <Suspense fallback={null}>
      <ColorPalette value={value.stops[0].color} initialGradient={value} onApply={(color) => onChange({
        stops: value.stops.map((stop, index) => index ? stop : { ...stop, color }),
      })} onGradient={(gradient) => onChange({ ...gradient, shape: 'linear' })} onClose={() => setOpen(false)} />
    </Suspense>}
  </>;
}

export function Seconds({ value, onChange, max, min = 0.1, label, placeholder, title, disabled }) {
  const [draft, setDraft] = useState(null);
  function commit(event) {
    const raw = event.currentTarget.value;
    setDraft(null);
    if (raw === '' && placeholder !== undefined) { onChange(null); return; }
    const number = Number(raw);
    const next = raw !== '' && Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : value;
    onChange(next);
  }
  return <span className="unit-field"><input inputMode="decimal" type="number" min={min} max={max} step="0.1" value={draft ?? String(value ?? '')} aria-label={label} placeholder={placeholder} title={title} disabled={disabled}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><span>mp</span></span>;
}
