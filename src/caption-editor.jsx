import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, RotateCcw, Type, X } from 'lucide-react';
import { defaultBackground } from './background';
import { basePlacement, captionAnchors, offsetLimit, readPlacement, rotationLimit } from './caption-format';
import { CaptionContent } from './caption-content';
import { Seconds } from './fields';
import { PlaybackButtons, usePlayback } from './playback';
import { Preview } from './preview';
import { defaults, effects, resolutions } from './project';

const previews = {
  ...defaultBackground,
  gradient: { ...defaultBackground.gradient, angle: 27, stops: [
    { color: '#192536', at: 0 }, { color: '#253d55', at: 55 }, { color: '#3c3250', at: 100 },
  ] },
};

const templates = [
  { id: 'reporter', label: 'Tudósító', sample: 'KOVÁCS ANNA\nHelyszíni riporter', anchor: 'bottom-left',
    title: { font: 'Inter', size: 88, color: '#f7fbff', weight: 800, uppercase: true }, subtitle: { font: 'Arial', size: 45, color: '#96e4d6', weight: 400 } },
  { id: 'location', label: 'Helyszín', sample: 'BUDAPEST\nMagyarország', anchor: 'top-left',
    title: { font: 'Verdana', size: 81, color: '#f7db9b', weight: 800, uppercase: true }, subtitle: { font: 'Inter', size: 43, color: '#f3f5ff', weight: 400 } },
  { id: 'chapter', label: 'Fejezetcím', sample: 'ÚJ FEJEZET\nEgy új kezdet', anchor: 'center',
    title: { font: 'Georgia', size: 156, color: '#ffffff', weight: 800, uppercase: true }, subtitle: { font: 'Inter', size: 62, color: '#b9cbff', weight: 400 } },
  { id: 'quote', label: 'Idézet', sample: '„A részletek számítanak.”\nKovács Anna', anchor: 'center',
    title: { font: 'Georgia', size: 106, color: '#fff1d7', italic: true, weight: 400 }, subtitle: { font: 'Inter', size: 51, color: '#eab0bd' } },
  { id: 'news', label: 'Hírfelirat', sample: 'FRISS HÍREK\nA mai nap eseményei', anchor: 'bottom-right',
    title: { font: 'Arial', size: 91, color: '#cce9ff', weight: 800, uppercase: true }, subtitle: { font: 'Inter', size: 44, color: '#f7fbff', weight: 400 } },
  { id: 'subtitle', label: 'Képaláírás', sample: 'A város fényei\nÉjszakai felvétel', anchor: 'bottom',
    title: { font: 'Trebuchet MS', size: 73, color: '#f7f8fc', weight: 800 }, subtitle: { font: 'Trebuchet MS', size: 45, color: '#bfc5dd', italic: true, weight: 400 } },
];

function applyTemplate(template, content) {
  const text = content.trim() ? content : template.sample;
  const runs = [];
  let start = 0;
  for (const [index, line] of text.split('\n').entries()) {
    const end = start + line.length;
    if (line) runs.push({ start, end, ...(index === 0 ? template.title : template.subtitle) });
    start = end + 1;
  }
  return { text, runs, placement: { ...basePlacement, anchor: template.anchor } };
}

const samples = templates.map((template) => ({ ...template,
  caption: { ...defaults.text, ...applyTemplate(template, '') },
}));
const motionSamples = Object.entries(effects).map(([id, name]) => ({
  id, name, caption: { ...defaults.text, text: 'Minta', effect: id, seconds: 1 },
}));
const tabs = [{ key: 'templates', label: 'Sablonok' }, { key: 'motion', label: 'Mozgás' }, { key: 'placement', label: 'Pozíció' }];

function MotionPane({ effect, duration, onEffect, onDuration }) {
  const clock = usePlayback(2.2, true, () => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const time = Math.max(0, Math.min(1, clock.time - 0.16));
  return <>
    <div className="caption-panel-bar"><h3>Animációminták</h3>
      <button type="button" className="icon-button" aria-label={clock.playing ? 'Mozgásminták szüneteltetése' : 'Mozgásminták lejátszása'}
        onClick={clock.toggle}>{clock.playing ? <Pause size={15} /> : <Play size={15} />}</button>
    </div>
    <div className="caption-sample-grid">
      {motionSamples.map(({ id, name, caption }) => <button type="button" key={id} aria-label={name} aria-pressed={effect === id}
        onClick={() => onEffect(id)}>
        <div aria-hidden="true"><Preview text={caption} settings={defaults.render} background={previews} size={208} time={time} /></div>
        <span>{name}</span>
      </button>)}
    </div>
    <label className="field field-inline caption-motion-duration">Animáció ideje<Seconds label="Animáció ideje" value={duration} max={10} onChange={onDuration} /></label>
  </>;
}

function PositionSlider({ label, value, limit, unit, onChange }) {
  return <label className="background-slider">
    <span>{label}<span>{value}{unit}</span></span>
    <input type="range" aria-label={label} min={-limit} max={limit} step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

function PlacementPane({ placement, update, reset }) {
  return <div className="caption-position">
    <div className="caption-panel-bar"><h3>Igazítás a képen</h3>
      <button type="button" className="icon-button" aria-label="Pozíció alaphelyzetbe" title="Pozíció alaphelyzetbe" onClick={reset}><RotateCcw size={15} /></button>
    </div>
    <div className="caption-anchor-grid" role="group" aria-label="Képernyőpozíció">
      {Object.entries(captionAnchors).map(([anchor, { label, align, vertical }]) => <button type="button" key={anchor} aria-label={label} title={label}
        aria-pressed={placement.anchor === anchor} onClick={() => update({ anchor })}
        style={{ '--anchor-x': `${50 + align * 32}%`, '--anchor-y': `${50 + vertical * 29}%` }}>
        <span className="caption-anchor-frame" aria-hidden="true" />
        <span>{label}</span>
      </button>)}
    </div>
    <PositionSlider label="Vízszintes eltolás" value={placement.x} limit={offsetLimit} unit="%" onChange={(x) => update({ x })} />
    <PositionSlider label="Függőleges eltolás" value={placement.y} limit={offsetLimit} unit="%" onChange={(y) => update({ y })} />
    <PositionSlider label="Elforgatás" value={placement.rotation} limit={rotationLimit} unit="°" onChange={(rotation) => update({ rotation })} />
  </div>;
}

const displaySeconds = (time) => time.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export default function CaptionEditor({ text, settings, background, onApply, onClose }) {
  const dialog = useRef(null);
  const editor = useRef(null);
  const title = useId();
  const [tab, setTab] = useState('templates');
  const [draft, setDraft] = useState(() => ({ ...text, runs: text.runs ?? [], placement: text.placement ?? basePlacement }));
  const playback = usePlayback(draft.seconds, false, false, draft.seconds);
  const caption = useMemo(() => ({ ...draft, placement: readPlacement(draft.placement) }), [draft]);
  const resolution = resolutions[settings.resolution];

  useEffect(() => { dialog.current.showModal(); }, []);

  function setTemplate(template) {
    const next = applyTemplate(template, draft.text);
    editor.current?.replace(next.text, next.runs);
    setDraft((current) => ({ ...current, placement: next.placement }));
  }

  function updatePlacement(patch) {
    setDraft((current) => ({ ...current, placement: { ...current.placement, ...patch } }));
  }

  function updateEffect(effect) {
    setDraft((current) => ({ ...current, effect }));
    playback.restart();
  }

  function updateDuration(seconds) {
    setDraft((current) => ({ ...current, seconds }));
    playback.restart();
  }

  function tabKeys(event) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = tabs.findIndex(({ key }) => key === tab);
    const next = step ? (index + step + tabs.length) % tabs.length : event.key === 'Home' ? 0 : tabs.length - 1;
    setTab(tabs[next].key);
    event.currentTarget.querySelectorAll('button')[next].focus();
  }

  return createPortal(<dialog ref={dialog} className="gradient-dialog caption-editor" aria-labelledby={title}
    onClose={onClose} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header className="gradient-header">
      <Type size={19} /><h2 id={title}>Szövegek szerkesztése</h2>
      <button type="button" className="icon-button" aria-label="Szövegszerkesztő bezárása" onClick={() => dialog.current.close()}><X size={18} /></button>
    </header>
    <div className="gradient-workspace caption-workspace">
      <div className="caption-main">
        <section className="caption-monitor" aria-label="Felirat előnézete">
          <div className="gradient-preview-bar"><strong>Felirat előnézete</strong><span>{resolution.width} × {resolution.height}</span></div>
          <div className="gradient-surface caption-stage">
            <Preview text={caption} settings={settings} time={playback.time} background={background} size={976} label="Felirat a videóban" />
          </div>
          <div className="gradient-preview-footer caption-playback">
            <PlaybackButtons playback={playback} />
            <input type="range" aria-label="Felirat-előnézet pozíciója" min="0" max={draft.seconds} step="0.001" value={playback.time}
              onChange={(event) => { playback.setPlaying(false); playback.seek(Number(event.target.value)); }} />
            <span className="transition-time">{displaySeconds(playback.time)} / {displaySeconds(draft.seconds)} mp</span>
          </div>
        </section>
        <CaptionContent value={draft} controller={editor} onChange={(content) => setDraft((current) => ({ ...current, ...content }))} />
      </div>
      <aside className="caption-sidebar">
        <div className="caption-tabs" role="tablist" aria-label="Felirat beállításai" onKeyDown={tabKeys}>
          {tabs.map(({ key, label }) => <button key={key} id={`${title}-${key}`} role="tab" type="button" tabIndex={tab === key ? 0 : -1}
            aria-selected={tab === key} aria-controls={`${title}-panel`} onClick={() => setTab(key)}>{label}</button>)}
        </div>
        <div className="caption-panel" id={`${title}-panel`} role="tabpanel" aria-labelledby={`${title}-${tab}`} tabIndex={0}>
          {tab === 'templates' && <div className="caption-sample-grid">
            {samples.map((template) => <button type="button" key={template.id} aria-label={template.label} onClick={() => setTemplate(template)}>
              <div aria-hidden="true"><Preview text={template.caption} settings={defaults.render} background={previews} size={240} time={template.caption.seconds} /></div>
              <span>{template.label}</span>
            </button>)}
          </div>}
          {tab === 'motion' && <MotionPane effect={draft.effect} duration={draft.seconds} onEffect={updateEffect} onDuration={updateDuration} />}
          {tab === 'placement' && <PlacementPane placement={draft.placement} update={updatePlacement}
            reset={() => setDraft((current) => ({ ...current, placement: basePlacement }))} />}
        </div>
      </aside>
    </div>
    <footer className="gradient-footer">
      <button type="button" className="button" onClick={() => dialog.current.close()}>Mégse</button>
      <button type="button" className="button primary" onClick={() => { onApply(caption); dialog.current.close(); }}>Alkalmazás</button>
    </footer>
  </dialog>, document.body);
}
