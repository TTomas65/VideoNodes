import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image, ImagePlus, Palette, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { gradientMotion, gradientShapes, imageFits, prepareImage, presets } from './background';
import { backgroundPattern, backgroundPatternLabel, backgroundPatterns, defaultPattern, readBackgroundPattern } from './background-patterns';
import { Color, GradientPalette, Seconds, Select } from './fields';
import { Preview } from './preview';
import { resolutions } from './project';

function Slider({ label, unit = '%', min = 0, max = 100, step = 1, value, onChange, disabled }) {
  return <label className="background-slider">
    <span>{label}<span>{value}{unit}</span></span>
    <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

export function BackgroundFields({ data, settings, set, onImage }) {
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const imageMode = data.mode === 'image';
  const patternMode = data.mode === 'pattern';
  const pattern = data.pattern ?? defaultPattern;

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      onImage(await prepareImage(file));
    } catch (issue) {
      setError(issue.message);
    } finally {
      setUploading(false);
    }
  }

  return <>
    <label className="field">Háttér típusa<Select aria-label="Háttér típusa" value={data.mode} onChange={(event) => set('mode', event.target.value)}>
      <option value="gradient">Színátmenet és animáció</option><option value="pattern">Generált minták</option><option value="image">Képfeltöltés</option>
    </Select></label>
    {(!imageMode || data.image) && <div className="background-thumbnail"><Preview settings={settings} background={data} time={0} size={320} label="Háttér bélyegképe" /></div>}
    {imageMode ? <>
      <input type="file" hidden ref={input} accept="image/*,.avif,.webp,.svg,.bmp" onChange={upload} />
      {data.image && <div className="background-image-name"><Image size={14} /><span title={data.image.name}>{data.image.name}</span>
        <button type="button" className="icon-button" title="Háttérkép eltávolítása" aria-label="Háttérkép eltávolítása" disabled={uploading} onClick={() => { onImage(null); setError(''); }}><Trash2 size={14} /></button>
      </div>}
      <button type="button" className="button" disabled={uploading} onClick={() => input.current.click()}><ImagePlus size={15} /> {uploading ? 'Kép előkészítése…' : data.image ? 'Kép cseréje' : 'Kép feltöltése'}</button>
      {error && <p className="background-error" role="alert">{error}</p>}
      {data.image && <>
        <label className="field">Illesztés<Select aria-label="Kép illesztése" value={data.fit} onChange={(event) => set('fit', event.target.value)}>
          {Object.entries(imageFits).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </Select></label>
        <div className="fields-two">
          <Slider label="Vízszintes" value={data.x} onChange={(value) => set('x', value)} />
          <Slider label="Függőleges" value={data.y} onChange={(value) => set('y', value)} />
        </div>
        <Slider label="Nagyítás" min={100} max={220} value={data.zoom} onChange={(value) => set('zoom', value)} />
        <Slider label="Átlátszatlanság" value={data.opacity} onChange={(value) => set('opacity', value)} />
        <label className="field field-inline">Alapszín<Color label="Kép alapszíne" value={data.matte} onChange={(value) => set('matte', value)} /></label>
      </>}
    </> : <>
      <div className="background-summary">
        <span>{patternMode ? backgroundPatternLabel(pattern) : gradientShapes[data.gradient.shape]}</span>
        <span>{patternMode ? (pattern.animated ? 'Animált' : 'Statikus') : gradientMotion[data.gradient.motion]}</span>
      </div>
      <button type="button" className="button" aria-haspopup="dialog" onClick={() => setEditing(true)}><Palette size={15} /> Háttér szerkesztése</button>
      {editing && (patternMode
        ? <PatternDialog value={pattern} settings={settings} onApply={(next) => set('pattern', next)} onClose={() => setEditing(false)} />
        : <GradientDialog value={data.gradient} settings={settings} onApply={(gradient) => set('gradient', gradient)} onClose={() => setEditing(false)} />)}
    </>}
  </>;
}

function GradientMonitor({ background, settings, running, size }) {
  const [time, setTime] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now() - elapsed.current * 1000;
    let animation;
    function tick(now) {
      elapsed.current = Math.max(0, (now - start) / 1000);
      setTime(elapsed.current);
      animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [running]);
  return <Preview settings={settings} background={background} time={time} size={size} label="Háttér élő előnézete" />;
}

function BackgroundDialog({ background, summary, moving, size = 960, settings, onApply, onClose, children }) {
  const dialog = useRef(null);
  const title = useId();
  const [paused, setPaused] = useState(false);
  const { width, height } = resolutions[settings.resolution];
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => { setPaused(false); }, [moving, background.gradient?.motion, background.pattern?.id, background.pattern?.style]);

  return createPortal(<dialog ref={dialog} className="gradient-dialog" aria-labelledby={title} onClose={onClose}
    onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header className="gradient-header"><Palette size={19} /><h2 id={title}>Háttérszerkesztő</h2>
      <button type="button" className="icon-button" aria-label="Háttérszerkesztő bezárása" onClick={() => dialog.current.close()}><X size={18} /></button>
    </header>
    <div className="gradient-workspace">
      <div className="gradient-preview">
        <div className="gradient-preview-bar"><strong>Élő előnézet</strong><span>{width} × {height}</span></div>
        <div className="gradient-surface"><GradientMonitor background={background} settings={settings} running={moving && !paused} size={size} /></div>
        <div className="gradient-preview-footer"><span>{summary}</span>
          <button type="button" className="icon-button" disabled={!moving} aria-label={paused ? 'Animáció folytatása' : 'Animáció szüneteltetése'} title={paused ? 'Folytatás' : 'Szünet'} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
        </div>
      </div>
      <div className="gradient-controls">{children}</div>
    </div>
    <footer className="gradient-footer"><button type="button" className="button" onClick={() => dialog.current.close()}>Mégse</button>
      <button type="button" className="button primary" onClick={() => { onApply(); dialog.current.close(); }}>Alkalmazás</button></footer>
  </dialog>, document.body);
}

function GradientDialog({ value, settings, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  const set = (key, next) => setDraft((old) => ({ ...old, [key]: next }));
  const moving = draft.motion !== 'still';
  const ramp = [...draft.stops].sort((a, b) => a.at - b.at).map(({ color, at }) => `${color} ${at}%`).join(', ');

  function editStop(index, key, next) {
    setDraft((old) => ({ ...old, stops: old.stops.map((stop, i) => i === index ? { ...stop, [key]: next } : stop) }));
  }

  function addStop() {
    const positions = [0, ...draft.stops.map(({ at }) => at).sort((a, b) => a - b), 100];
    let start = 0;
    let largest = 0;
    for (let index = 1; index < positions.length; index += 1) {
      const gap = positions[index] - positions[index - 1];
      if (gap > largest) { largest = gap; start = positions[index - 1]; }
    }
    set('stops', [...draft.stops, { color: '#f0b8b5', at: Math.round(start + largest / 2) }]);
  }

  return <BackgroundDialog background={{ mode: 'gradient', gradient: draft }} settings={settings} moving={moving}
    summary={`${gradientShapes[draft.shape]} · ${gradientMotion[draft.motion]}`} onApply={() => onApply(draft)} onClose={onClose}>
        <section><h3>Minták</h3><div className="gradient-presets">{presets.map(({ label, shape, stops }) => <button type="button" key={label} onClick={() => setDraft((old) => ({ ...old, shape, stops }))}>
          <span style={{ background: `linear-gradient(125deg, ${stops.map(({ color }) => color).join(', ')})` }} />{label}
        </button>)}</div></section>
        <section><h3>Színek</h3><div className="gradient-ramp" style={{ background: `linear-gradient(90deg, ${ramp})` }} />
          {draft.stops.map(({ color, at }, index) => <div className="gradient-stop" key={index}>
            <Color label={`${index + 1}. szín`} value={color} onChange={(next) => editStop(index, 'color', next)} />
            {draft.shape === 'lights' && index === 0 ? <span className="gradient-base-label">Alapszín</span>
              : <Slider label={draft.shape === 'lights' ? `${index}. fény mérete` : `${index + 1}. szín helye`} value={at} onChange={(next) => editStop(index, 'at', next)} />}
            <button type="button" className="icon-button" aria-label={`${index + 1}. szín törlése`} disabled={draft.stops.length <= 2} onClick={() => set('stops', draft.stops.filter((_, i) => i !== index))}><X size={14} /></button>
          </div>)}
          <div className="gradient-color-actions">
            <button type="button" className="button add-gradient-color" disabled={draft.stops.length >= 5} onClick={addStop}><Plus size={14} /> Szín hozzáadása</button>
            <GradientPalette value={{ ...draft, stops: [...draft.stops].sort((a, b) => a.at - b.at) }}
              onChange={(next) => setDraft((old) => ({ ...old, ...next }))} />
          </div>
        </section>
        <section><h3>Forma</h3>
          <label className="field">Színátmenet típusa<Select aria-label="Színátmenet típusa" value={draft.shape} onChange={(event) => set('shape', event.target.value)}>
            {Object.entries(gradientShapes).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </Select></label>
          <Slider label="Irány" unit="°" max={359} value={draft.angle} onChange={(next) => set('angle', next)} />
          <Slider label="Méret" min={50} max={160} value={draft.scale} onChange={(next) => set('scale', next)} />
        </section>
        <section><h3>Mozgás</h3>
          <label className="field">Animáció<Select aria-label="Háttér animációja" value={draft.motion} onChange={(event) => set('motion', event.target.value)}>
            {Object.entries(gradientMotion).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </Select></label>
          {moving && <><label className="field field-inline">Ciklus hossza<Seconds value={draft.period} min={0.5} max={20} onChange={(next) => set('period', next)} /></label>
            <Slider label="Intenzitás" value={draft.intensity} onChange={(next) => set('intensity', next)} /></>}
        </section>
  </BackgroundDialog>;
}

const templateTiles = Object.values(backgroundPatterns).map(({ id, label, styles }) => {
  const background = { mode: 'pattern', pattern: readBackgroundPattern({ id }) };
  return { id, label, background, styles: styles.length ? [
    { id: 'original', label: 'Eredeti beállítás', background },
    ...styles.map(({ id: style, label }) => ({
      id: style, label, background: { mode: 'pattern', pattern: readBackgroundPattern({ id, style }) },
    })),
  ] : [] };
});

function PatternTiles({ items, selected, settings, onSelect }) {
  return <div className="pattern-library">
    {items.map(({ id, label, background }) => <button key={id} type="button" className="button"
      aria-label={label} aria-pressed={selected === id} onClick={() => { if (selected !== id) onSelect(background.pattern); }}>
      <Preview settings={settings} background={background} time={0} size={144} />
      <span>{label}</span>
    </button>)}
  </div>;
}

function PatternDialog({ value, settings, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  const template = backgroundPattern(draft);
  const styles = templateTiles.find(({ id }) => id === template.id).styles;
  const set = (key, next) => setDraft((old) => ({ ...old, [key]: next }));

  function setColor(key, index, next) {
    setDraft((old) => ({ ...old, [key]: old[key].map((item, i) => i === index ? next : item) }));
  }

  return <BackgroundDialog background={{ mode: 'pattern', pattern: draft }} settings={settings} moving={draft.animated} size={640}
    summary={`${backgroundPatternLabel(draft)} · ${draft.animated ? 'Animált' : 'Statikus'}`} onApply={() => onApply(draft)} onClose={onClose}>
    <section><h3>Generált minták</h3>
      <PatternTiles items={templateTiles} selected={draft.id} settings={settings} onSelect={setDraft} />
    </section>
    {styles.length > 0 && <section><h3>Stílusok</h3>
      <PatternTiles items={styles} selected={draft.style ?? 'original'} settings={settings} onSelect={setDraft} />
    </section>}
    <section><h3>Színek</h3>
      {template.colorLabels.map((label, index) => <div key={label} className="pattern-color">
        <Color label={label} value={draft.colors[index]} onChange={(next) => setColor('colors', index, next)} />
        {index === 0 ? <span>{label}</span> : <Slider label={label + ' erőssége'} min={0} max={1} step={0.01} unit=""
          value={draft.lightOpacity[index - 1]} onChange={(next) => setColor('lightOpacity', index - 1, next)} />}
      </div>)}
    </section>
    {template.groups.map(({ label, fields, toggle }) => <section key={label}><h3>{label}</h3>
      {fields.filter(({ key }) => !toggle || draft[toggle] || key === toggle).map(({ key, label, type, min, max, step, unit, options }) => {
        if (type === 'motion') return <label className="field" key={key}>{label}
          <Select aria-label={label} value={draft[key] ? 'animated' : 'still'} onChange={(event) => set(key, event.target.value === 'animated')}>
            <option value="animated">Animált</option><option value="still">Statikus</option>
          </Select>
        </label>;
        if (type === 'toggle') return <label key={key} className="pattern-toggle">
          <input type="checkbox" checked={draft[key]} onChange={(event) => set(key, event.target.checked)} />{label}
        </label>;
        if (type === 'options') return <label className="field" key={key}>{label}
          <Select aria-label={label} value={draft[key]} onChange={(event) => set(key, event.target.value)}>
            {Object.entries(options).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
          </Select>
        </label>;
        return <Slider key={key} label={label} value={draft[key]} min={min} max={max} step={step} unit={unit}
          disabled={key === 'speed' && !draft.animated} onChange={(next) => set(key, next)} />;
      })}
    </section>)}
    <section><button type="button" className="button" onClick={() => setDraft(readBackgroundPattern({ id: draft.id, style: draft.style }))}>Minta alaphelyzetbe állítása</button></section>
  </BackgroundDialog>;
}
