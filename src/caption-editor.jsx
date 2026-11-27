import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Pause, Play, RotateCcw, Type, X } from 'lucide-react';
import { defaultBackground } from './background';
import { basePlacement, captionAnchors, offsetLimit, readPlacement, rotationLimit, tiltLimit } from './caption-format';
import { CaptionContent } from './caption-content';
import { captionMotionFields, captionMotionOptions, captionPhaseRange, captionPhases, captionPosterTime, captionTiming, maxPhaseSeconds, phaseFor, phasePatch, readMotionTuning } from './caption-motion';
import { PalettePanel } from './color-palette';
import { Seconds } from './fields';
import { FontPanel } from './font-picker';
import { PlaybackButtons, usePlayback } from './playback';
import { Preview } from './preview';
import { defaults, resolutions } from './project';
import { TextPresetPane } from './text-preset-pane';
import { applyStylePreset } from './text-presets';

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
const phaseTabs = { entrance: 'Megjelenés', middle: 'Köztes', exit: 'Eltűnés' };
const motionSamples = Object.fromEntries(Object.entries(captionPhases).map(([phase, { effects }]) => [
  phase, Object.entries(effects).map(([id, name]) => {
    const base = { ...defaults.text, text: id === 'lines' ? 'Első sor\nMásodik sor' : id === 'credits' ? 'Stábfelirat\nVideó · Zene' : 'Mintaszöveg',
      effect: 'fade', seconds: 0.15 };
    const caption = { ...base, ...phasePatch(base, phase, { effect: id, seconds: 1 }) };
    return { id, name, caption };
  }),
]));
const tabs = [{ key: 'templates', label: 'Sablonok' }, { key: 'motion', label: 'Mozgás' }, { key: 'placement', label: 'Pozíció' }];

function MotionPane({ text, onChange, onTune, onPlayFull, onPlayEffect, clipTiming }) {
  const [phase, setPhase] = useState('entrance');
  const { effect, seconds, totalSeconds } = phaseFor(text, phase);
  const clock = usePlayback(2.2, true, true);
  const time = Math.max(0, Math.min(1, clock.time - 0.16));
  const fields = captionMotionFields(phase, effect);
  const options = captionMotionOptions(text.motionTuning, phase, effect);
  const playable = Boolean(text.text.trim());
  const captions = useMemo(() => motionSamples[phase].map((sample) => ({
    ...sample, caption: { ...sample.caption, motionTuning: text.motionTuning },
  })), [phase, text.motionTuning]);
  return <>
    <div className="caption-phase-tabs" role="group" aria-label="Animációs fázis">
      {Object.entries(phaseTabs).map(([key, name]) => <button type="button" key={key} className="button" aria-pressed={phase === key}
        onClick={() => { if (key !== phase) { setPhase(key); clock.restart(); } }}>{name}</button>)}
    </div>
    <div className="caption-panel-bar"><h3>Animációminták</h3>
      <button type="button" className="icon-button" aria-label={clock.playing ? 'Mozgásminták szüneteltetése' : 'Mozgásminták lejátszása'}
        onClick={clock.toggle}>{clock.playing ? <Pause size={15} /> : <Play size={15} />}</button>
    </div>
    <div className="caption-effect-controls">
      <label className="field field-inline">Effekt hossza<Seconds label={`${captionPhases[phase].label} időtartama`}
        value={seconds} max={maxPhaseSeconds} min={effect === 'none' ? 0 : 0.1} disabled={effect === 'none'}
        onChange={(next) => { if (next !== seconds) onChange(phase, { seconds: next }); }} /></label>
      {phase === 'middle' && <label className="field field-inline">Köztes teljes ideje
        <Seconds label="Köztes teljes ideje" value={totalSeconds} min={seconds} max={maxPhaseSeconds} disabled={effect === 'none'}
          onChange={(next) => { if (next !== totalSeconds) onChange(phase, { totalSeconds: next }); }} />
      </label>}
      {phase === 'middle' && totalSeconds > seconds &&
        <p className="caption-timing-note">{displaySeconds(totalSeconds - seconds)} mp mozdulatlanul az effekt után</p>}
      {Object.entries(fields).map(([key, { label, min, max, unit }]) => <label className="background-slider" key={key}>
        <span>{label}<span>{options[key]}{unit}</span></span>
        <input type="range" min={min} max={max} value={options[key]} aria-label={label}
          onChange={(event) => onTune(phase, effect, key, Number(event.target.value))} />
      </label>)}
      <div className="caption-effect-actions">
        <button type="button" className="button" disabled={!playable} onClick={onPlayFull}>
          <Play size={14} fill="currentColor" aria-hidden="true" /> Teljes animáció
        </button>
        <button type="button" className="button" disabled={!playable || effect === 'none'} onClick={() => onPlayEffect(phase)}>
          <Play size={14} fill="currentColor" aria-hidden="true" /> Effekt animáció
        </button>
      </div>
      <p className="caption-timing-note">Teljes előnézet {displaySeconds(clipTiming.duration)} mp</p>
    </div>
    <div className="caption-sample-grid">
      {captions.map(({ id, name, caption }) => <button type="button" key={`${phase}-${id}`} aria-label={name} aria-pressed={effect === id}
        onClick={() => onChange(phase, { effect: id })}>
        <div aria-hidden="true"><Preview text={caption} settings={defaults.render} background={previews} size={208}
          time={phase === 'entrance' ? time : 0.15 + time} /></div>
        <span>{name}</span>
      </button>)}
    </div>
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
    <div className="caption-panel-bar"><h3>Igazítás a képen</h3></div>
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
    <PositionSlider label="Perspektíva" value={placement.tilt ?? 0} limit={tiltLimit} unit="°" onChange={(tilt) => update({ tilt })} />
    <button type="button" className="button" onClick={reset}><RotateCcw size={15} /> Alaphelyzetbe állítás</button>
  </div>;
}

const displaySeconds = (time) => time.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export default function CaptionEditor({ text, width, settings, background, onApply, onClose }) {
  const dialog = useRef(null);
  const editor = useRef(null);
  const title = useId();
  const [tab, setTab] = useState('templates');
  const [formatEdit, setFormatEdit] = useState(null);
  const [effectPhase, setEffectPhase] = useState(null);
  const pickerHeading = useRef(null);
  const [draft, setDraft] = useState(() => ({ ...text, runs: text.runs ?? [], placement: text.placement ?? basePlacement }));
  const [draftWidth, setDraftWidth] = useState(width);
  const timing = captionTiming(draft);
  const effectRange = effectPhase ? captionPhaseRange(timing, effectPhase) : null;
  const playback = usePlayback(timing.duration, false, false, captionPosterTime(draft, timing), effectRange);
  const playbackStart = effectRange?.start ?? 0;
  const playbackEnd = effectRange?.end ?? timing.duration;
  const caption = useMemo(() => ({ ...draft, placement: readPlacement(draft.placement) }), [draft]);
  const previewCaption = useMemo(() => formatEdit?.runs ? { ...caption, runs: formatEdit.runs } : caption, [caption, formatEdit]);
  const resolution = resolutions[settings.resolution];

  useEffect(() => { dialog.current.showModal(); }, []);

  function setTemplate(template) {
    const next = applyTemplate(template, draft.text);
    editor.current?.replace(next.text, next.runs, draft.alignments);
    setDraft((current) => ({ ...current, placement: next.placement }));
  }

  function loadPreset(preset) {
    const next = preset.kind === 'style' ? applyStylePreset(preset.caption, draft) : preset.caption;
    const runs = next.runs ?? [];
    editor.current?.replace(next.text, runs, next.alignments);
    setDraft({ ...next, runs, placement: next.placement ?? basePlacement });
    if (preset.kind === 'card') setDraftWidth(preset.width);
    setEffectPhase(null);
    playback.setPlaying(false);
    playback.seek(captionPosterTime(next), captionTiming(next).duration);
  }

  function updatePlacement(patch) {
    setDraft((current) => ({ ...current, placement: { ...current.placement, ...patch } }));
  }

  function chooseTab(next) {
    if (formatEdit) finishFormat(null, false);
    setTab(next);
    if (next === 'placement' && !playback.playing && playback.time === timing.duration && (timing.exit || draft.effect === 'credits')) {
      playback.seek(captionPosterTime(draft, timing));
    }
  }

  function openFormat(property, initial) {
    setTab('templates');
    setFormatEdit({ property, initial });
    setEffectPhase(null);
    playback.setPlaying(false);
    if (draft.effect === 'credits' || playback.time < timing.entrance || timing.exit && playback.time >= timing.exitStart) {
      playback.seek(captionPosterTime(draft, timing));
    }
    requestAnimationFrame(() => {
      const panel = pickerHeading.current;
      panel?.focus({ preventScroll: true });
      if (matchMedia('(max-width: 850px)').matches) panel?.scrollIntoView({ block: 'nearest' });
    });
  }

  function previewFormat(candidate) {
    const runs = editor.current?.previewFormat(candidate);
    setFormatEdit((current) => current && { ...current, candidate, runs });
  }

  function finishFormat(value, restoreFocus = true) {
    editor.current?.finishFormat(value, restoreFocus);
    setFormatEdit(null);
    setTab('templates');
  }

  function playFull() {
    setEffectPhase(null);
    playback.seek(0);
    playback.setPlaying(true);
  }

  function playEffect(phase) {
    setEffectPhase(phase);
    playback.seek(captionPhaseRange(timing, phase).start);
    playback.setPlaying(true);
  }

  function updatePhase(phase, patch) {
    const next = { ...draft, ...phasePatch(draft, phase, patch) };
    setDraft(next);
    setEffectPhase(null);
    const timing = captionTiming(next);
    const { start } = captionPhaseRange(timing, phase);
    playback.seek(phaseFor(next, phase).effect === 'none' ? captionPosterTime(next, timing) : start, timing.duration);
    playback.setPlaying(phaseFor(next, phase).effect !== 'none');
  }

  function updateTuning(phase, effect, key, value) {
    setDraft((current) => {
      const options = current.motionTuning ?? {};
      const group = options[phase] ?? {};
      const motionTuning = readMotionTuning({ ...options, [phase]: { ...group, [effect]: { ...group[effect], [key]: value } } });
      return { ...current, motionTuning };
    });
  }

  function tabKeys(event) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = tabs.findIndex(({ key }) => key === tab);
    const next = step ? (index + step + tabs.length) % tabs.length : event.key === 'Home' ? 0 : tabs.length - 1;
    chooseTab(tabs[next].key);
    event.currentTarget.querySelectorAll('button')[next].focus();
  }

  return createPortal(<dialog ref={dialog} className="gradient-dialog caption-editor" aria-labelledby={title}
    onCancel={(event) => { if (formatEdit) { event.preventDefault(); finishFormat(null); } }}
    onClose={onClose} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header className="gradient-header">
      <Type size={19} /><h2 id={title}>Szövegek szerkesztése</h2>
      <button type="button" className="icon-button" aria-label="Szövegszerkesztő bezárása" onClick={() => dialog.current.close()}><X size={18} /></button>
    </header>
    <div className={`gradient-workspace caption-workspace${formatEdit ? ' caption-format-active' : ''}`}>
      <div className="caption-main">
        <section className="caption-monitor" aria-label="Felirat előnézete">
          <div className="gradient-preview-bar"><strong>{effectPhase ? captionPhases[effectPhase].effects[phaseFor(draft, effectPhase).effect] : 'Felirat előnézete'}</strong>
            <span>{resolution.width} × {resolution.height}</span></div>
          <div className="gradient-surface caption-stage">
            <Preview text={previewCaption} settings={settings} time={playback.time} duration={timing.duration} background={background} size={976} label="Felirat a videóban" />
          </div>
          <div className="gradient-preview-footer caption-playback">
            <PlaybackButtons playback={playback} />
            <input type="range" aria-label="Felirat-előnézet pozíciója" min={playbackStart} max={playbackEnd} step="any" value={playback.time}
              onChange={(event) => { playback.setPlaying(false); playback.seek(Number(event.target.value)); }} />
            <span className="transition-time">{displaySeconds(playback.time - playbackStart)} / {displaySeconds(playbackEnd - playbackStart)} mp</span>
          </div>
        </section>
        <CaptionContent value={draft} controller={editor} formatEdit={formatEdit} pickerId={`${title}-picker`}
          onFormatOpen={openFormat} onChange={(content) => setDraft((current) => ({ ...current, ...content }))} />
      </div>
      <aside className="caption-sidebar">
        <div className="caption-tabs" role="tablist" aria-label="Felirat beállításai" onKeyDown={tabKeys}>
          {tabs.map(({ key, label }) => <button key={key} id={`${title}-${key}`} role="tab" type="button" tabIndex={tab === key ? 0 : -1}
            aria-selected={tab === key} aria-controls={`${title}-panel`} onClick={() => chooseTab(key)}>{label}</button>)}
        </div>
        <div className={formatEdit ? `caption-picker ${formatEdit.property === 'font' ? 'caption-font-panel' : 'caption-palette'}` : 'caption-panel'}
          id={`${title}-panel`} role="tabpanel" aria-labelledby={`${title}-${tab}`} tabIndex={0}>
          {formatEdit?.property === 'font' && <>
            <h3 id={`${title}-picker`} ref={pickerHeading} tabIndex={-1}><Type size={15} /> Betűtípus</h3>
            <FontPanel value={formatEdit.initial} selectedValue={formatEdit.candidate ?? formatEdit.initial}
              onPreview={previewFormat} onApply={() => finishFormat(formatEdit.candidate)} onCancel={() => finishFormat(null)} />
          </>}
          {formatEdit?.property === 'color' && <>
            <h3 id={`${title}-picker`} ref={pickerHeading} tabIndex={-1}><Palette size={15} /> Színpaletta</h3>
            <PalettePanel value={formatEdit.initial} onPreview={previewFormat} onApply={finishFormat} onCancel={() => finishFormat(null)} />
          </>}
          {!formatEdit && tab === 'templates' && <TextPresetPane caption={caption} width={draftWidth} onLoad={loadPreset}>
            <div className="caption-sample-grid">
              {samples.map((template) => <button type="button" key={template.id} aria-label={template.label} onClick={() => setTemplate(template)}>
                <div aria-hidden="true"><Preview text={template.caption} settings={defaults.render} background={previews} size={240} time={template.caption.seconds} /></div>
                <span>{template.label}</span>
              </button>)}
            </div>
          </TextPresetPane>}
          {tab === 'motion' && <MotionPane text={draft} onChange={updatePhase} onTune={updateTuning} clipTiming={timing}
            onPlayFull={playFull} onPlayEffect={playEffect} />}
          {tab === 'placement' && <PlacementPane placement={draft.placement} update={updatePlacement}
            reset={() => updatePlacement({ x: 0, y: 0, rotation: 0, tilt: 0 })} />}
        </div>
      </aside>
    </div>
    {!formatEdit && <footer className="gradient-footer">
      <button type="button" className="button" onClick={() => dialog.current.close()}>Mégse</button>
      <button type="button" className="button primary" onClick={() => { onApply(caption, draftWidth); dialog.current.close(); }}>Alkalmazás</button>
    </footer>}
  </dialog>, document.body);
}
