import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Minus, Palette, Plus, X } from 'lucide-react';
import { clamp, hsvHex, inkFor, makeRamp, makeShades, readHex, toHex, toHsv, toRgb } from './palette';
import './palette.css';

function PaletteSlider({ label, value, max, track, onChange, unit = '' }) {
  return <label className="palette-slider">
    <span>{label}<output>{value}{unit}</output></span>
    <input type="range" aria-label={label} min="0" max={max} value={value} style={{ '--track': track }}
      onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

function Counter({ label, value, min, max, onChange }) {
  return <div className="palette-count" role="group" aria-label={label}>
    <span>{label}</span>
    <div><button type="button" aria-label={`${label} csökkentése`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={16} /></button>
      <output>{value}</output>
      <button type="button" aria-label={`${label} növelése`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={16} /></button></div>
  </div>;
}

function ColorWheel({ hsv, update }) {
  const radians = hsv.h * Math.PI / 180;
  const color = hsvHex(hsv);

  function drag(change) {
    const sample = (event) => {
      const box = event.currentTarget.getBoundingClientRect();
      change((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
    };
    return {
      onPointerDown(event) {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        sample(event);
      },
      onPointerMove(event) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) sample(event);
      },
    };
  }

  return <div className="palette-wheel" style={{ '--wheel-hue': hsvHex({ h: hsv.h, s: 1, v: 1 }), '--wheel-value': color }}>
    <div className="palette-hue-ring" aria-hidden="true" {...drag((x, y) => {
      const h = (Math.atan2(x - 0.5, 0.5 - y) * 180 / Math.PI + 360) % 360;
      update({ ...hsv, h, s: hsv.s || 1, v: hsv.v || 1 });
    })}>
      <span className="palette-wheel-cursor" style={{ left: `${50 + Math.sin(radians) * 44}%`, top: `${50 - Math.cos(radians) * 44}%` }} />
    </div>
    <div className="palette-wheel-disc" aria-hidden="true" {...drag((x, y) =>
      update({ ...hsv, s: clamp((x - 0.1465) / 0.707, 0, 1), v: clamp((0.8535 - y) / 0.707, 0, 1) }))}>
      <span className="palette-wheel-cursor" style={{ left: `${14.65 + hsv.s * 70.7}%`, top: `${85.35 - hsv.v * 70.7}%` }} />
    </div>
  </div>;
}

function Swatches({ colors, labels, selected, onChange }) {
  return <div className="palette-swatches">
    {colors.map((color, index) => <button type="button" key={index} aria-pressed={color === selected}
      aria-label={`${labels[index]} · ${color.toUpperCase()}`} style={{ '--sample': color, '--ink': inkFor(color) }}
      onClick={() => onChange(color)}>
      <span>{labels[index]}</span><strong>{color.toUpperCase()}</strong>
    </button>)}
  </div>;
}

const scaleLabels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export function PalettePanel({ value, onApply, onCancel, onPreview, onGradient, initialGradient }) {
  const [tab, setTab] = useState(onGradient ? 'gradient' : 'colors');
  const [base, setBase] = useState(() => toHsv(value));
  const [picked, setPicked] = useState(value.toLowerCase());
  const [ends, setEnds] = useState(() => [
    toHsv(initialGradient?.stops.at(0)?.color ?? value),
    toHsv(initialGradient?.stops.at(-1)?.color ?? '#ce8bd9'),
  ]);
  const [endpoint, setEndpoint] = useState(0);
  const [angle, setAngle] = useState(initialGradient?.angle ?? 0);
  const [steps, setSteps] = useState(initialGradient?.stops.length ?? 3);
  const [shadeCount, setShadeCount] = useState(11);
  const [numbered, setNumbered] = useState(false);
  const [hexDraft, setHexDraft] = useState(null);
  const [notice, setNotice] = useState('');
  const gradient = tab === 'gradient';
  const baseColor = hsvHex(base);
  const hsv = gradient ? ends[endpoint] : picked === baseColor ? base : toHsv(picked, base.h);
  const color = hsvHex(hsv);
  const rgb = toRgb(color);
  const shadeColors = makeShades(baseColor, shadeCount);
  const ramp = makeRamp(hsvHex(ends[0]), hsvHex(ends[1]), steps);
  const css = `linear-gradient(${(angle + 90) % 360}deg, ${ramp.map(({ color, at }) => `${color} ${at}%`).join(', ')})`;

  function setColor(next) {
    setHexDraft(null);
    if (gradient) setEnds((colors) => colors.map((color, index) => index === endpoint ? next : color));
    else setBase(next);
    choose(hsvHex(next));
  }

  function setChannel(index, value) {
    const channels = [...rgb];
    channels[index] = clamp(value, 0, 255);
    setColor(toHsv(toHex(channels), hsv.h));
  }

  function commitHex() {
    if (hexDraft === null) return;
    const next = readHex(hexDraft);
    if (next) setColor(toHsv(next, hsv.h));
  }

  function choose(color) {
    setHexDraft(null);
    setPicked(color);
    onPreview?.(color);
  }

  function chooseTab(next) {
    setTab(next);
    choose(hsvHex(next === 'colors' ? base : ends[endpoint]));
    setNotice('');
  }

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(css);
      setNotice('A CSS színátmenet a vágólapra került.');
    } catch {
      setNotice('Jelöld ki és másold a CSS mező tartalmát.');
    }
  }

  const invalidHex = hexDraft !== null && !readHex(hexDraft);

  return <>
    <div className="palette-body">
      <div className="palette-tabs" role="group" aria-label="Színpaletta módja">
        <button type="button" className="button" aria-pressed={!gradient} onClick={() => chooseTab('colors')}>Árnyalatok</button>
        <button type="button" className="button" aria-pressed={gradient} onClick={() => chooseTab('gradient')}>Színátmenet</button>
      </div>
      <div className="palette-controls">
        <div className="palette-channels">
          <div className="palette-hex-row">
            <label className="palette-hex"><span style={{ background: picked }} /><span>HEX</span>
              <input aria-label="Hexadecimális szín" value={hexDraft ?? picked.toUpperCase()} maxLength={7} spellCheck={false} autoComplete="off"
                aria-invalid={invalidHex} onChange={(event) => setHexDraft(event.target.value)}
                onBlur={commitHex} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitHex(); } }} />
            </label>
            <button type="button" className="button palette-hex-apply" disabled={invalidHex} onClick={commitHex}>Alkalmaz</button>
          </div>
          <div className="palette-rgb" role="group" aria-label="RGB">
            {['R', 'G', 'B'].map((label, index) => <label key={label}>{label}
              <input type="number" aria-label={label} min="0" max="255" value={rgb[index]}
                onChange={(event) => setChannel(index, Number(event.target.value))} /></label>)}
          </div>
          {['Piros', 'Zöld', 'Kék'].map((label, index) => {
            const channelAt = (next) => toHex(rgb.map((value, current) => current === index ? next : value));
            return <PaletteSlider key={label} label={label} value={rgb[index]} max={255}
              track={`linear-gradient(90deg, ${channelAt(0)}, ${channelAt(255)})`} onChange={(value) => setChannel(index, value)} />;
          })}
        </div>
        <ColorWheel hsv={hsv} update={setColor} />
        <div className="palette-tuning">
          <PaletteSlider label="Színárnyalat" value={Math.floor(hsv.h)} max={359} unit="°"
            track="linear-gradient(90deg, red, #ff0, #0f0, cyan, blue, magenta, red)"
            onChange={(h) => setColor({ ...hsv, h, s: hsv.s || 1, v: hsv.v || 1 })} />
          <PaletteSlider label="Telítettség" value={Math.round(hsv.s * 100)} max={100} unit="%"
            track={`linear-gradient(90deg, ${hsvHex({ ...hsv, s: 0 })}, ${hsvHex({ ...hsv, s: 1 })})`}
            onChange={(s) => setColor({ ...hsv, s: s / 100 })} />
          <PaletteSlider label="Világosság" value={Math.round(hsv.v * 100)} max={100} unit="%"
            track={`linear-gradient(90deg, #000, ${hsvHex({ ...hsv, v: 1 })})`}
            onChange={(v) => setColor({ ...hsv, v: v / 100 })} />
        </div>
      </div>
      {gradient ? <section className="palette-result" aria-label="Színátmenet-generátor">
        <div className="palette-result-tools">
          <div className="palette-endpoints" role="group" aria-label="Végpont szerkesztése">
            {ends.map((color, index) => <button type="button" className="button" key={index} aria-pressed={endpoint === index}
              onClick={() => { setEndpoint(index); choose(hsvHex(color)); }}>
              <span style={{ background: hsvHex(color) }} />{index === 0 ? 'Kezdőszín' : 'Végszín'}</button>)}
          </div>
          <PaletteSlider label="Átmenet iránya" value={angle} max={359} unit="°" onChange={setAngle} />
          <Counter label="Színpontok" value={steps} min={2} max={5} onChange={setSteps} />
        </div>
        <div className="palette-ramp" style={{ background: css }} />
        <Swatches colors={ramp.map(({ color }) => color)} labels={ramp.map(({ at }) => `${at}%`)} selected={picked} onChange={choose} />
        <div className="palette-copy"><input aria-label="Színátmenet CSS-kódja" readOnly value={css} onFocus={(event) => event.target.select()} />
          <button type="button" className="button" onClick={copyCss}><Copy size={14} /> CSS másolása</button></div>
        {notice && <p className="palette-notice" role="status">{notice}</p>}
      </section> : <section className="palette-result" aria-label="Árnyalatskála">
        <div className="palette-result-tools">
          <label className="palette-pattern">Jelölés<select value={numbered ? 'numbered' : 'scale'} onChange={(event) => setNumbered(event.target.value === 'numbered')}>
            <option value="scale">50, 100 … 950</option><option value="numbered">1, 2, 3 …</option>
          </select></label>
          <Counter label="Árnyalatok száma" min={3} max={15} value={shadeCount} onChange={setShadeCount} />
        </div>
        <Swatches colors={shadeColors} selected={picked} onChange={choose}
          labels={shadeColors.map((_, index) => numbered ? index + 1 : shadeCount === 11 ? scaleLabels[index] : Math.round((50 + 900 * index / (shadeCount - 1)) / 10) * 10)} />
      </section>}
    </div>
    <footer className="gradient-footer palette-footer">
      <span className="palette-selection" aria-label="Kiválasztott szín"><i style={{ background: picked }} />{picked.toUpperCase()}</span>
      <button type="button" className="button" onClick={onCancel}>Mégse</button>
      {gradient && onGradient
        ? <button type="button" className="button primary" disabled={invalidHex} onClick={() => onGradient({ angle, stops: ramp })}><Check size={15} /> Átmenet alkalmazása</button>
        : <button type="button" className="button primary" disabled={invalidHex} onClick={() => onApply(readHex(hexDraft ?? '') ?? picked)}><Check size={15} /> Szín alkalmazása</button>}
    </footer>
  </>;
}

export default function ColorPalette({ onClose, onApply, onGradient, ...props }) {
  const dialog = useRef(null);
  const title = useId();
  const close = () => dialog.current.close();
  useEffect(() => { dialog.current.showModal(); }, []);
  return createPortal(<dialog ref={dialog} className="gradient-dialog palette-dialog" aria-labelledby={title}
    onClose={(event) => { event.stopPropagation(); onClose(); }}
    onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header className="gradient-header"><Palette size={19} /><h2 id={title}>Színpaletta</h2>
      <button type="button" className="icon-button" aria-label="Színpaletta bezárása" onClick={close}><X size={18} /></button>
    </header>
    <PalettePanel {...props} onApply={(color) => { onApply(color); close(); }} onCancel={close}
      onGradient={onGradient && ((gradient) => { onGradient(gradient); close(); })} />
  </dialog>, document.body);
}
