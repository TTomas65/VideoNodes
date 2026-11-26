import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Pause, Play, RotateCcw, Settings2, Shuffle, X } from 'lucide-react';
import { Color, Seconds, Select } from './fields';
import { Preview } from './preview';
import { defaults, linkedBackground, outgoingRender, renderSources, scenePorts, upstream } from './project';
import { makeTimeline } from './timeline';
import { curveField, drawTransition, maxTransitionSeconds, transitionEffects, transitionFields, transitionOptions } from './transitions';

const seconds = (value) => value.toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const hold = 0.6;

function usePlayback(duration, loop, autoplay) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const position = useRef(0);

  function seek(value) {
    position.current = Math.max(0, Math.min(duration, value));
    setTime(position.current);
  }

  useEffect(() => {
    if (!playing) return;
    let frame;
    let previous;
    function tick(now) {
      previous ??= now;
      const elapsed = position.current + (now - previous) / 1000;
      previous = now;
      const next = loop ? elapsed % duration : Math.min(duration, elapsed);
      seek(next);
      if (next < duration) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, loop, playing]);

  function toggle() {
    if (!playing && position.current >= duration) seek(0);
    setPlaying(!playing);
  }

  function restart() {
    seek(0);
    setPlaying(true);
  }

  return { time: Math.min(time, duration), playing, setPlaying, seek, toggle, restart };
}

function PlaybackButtons({ playback }) {
  return <div className="transition-playback-buttons">
    <button type="button" className="icon-button" aria-label={playback.playing ? 'Szünet' : 'Lejátszás'} onClick={playback.toggle}>
      {playback.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
    </button>
    <button type="button" className="icon-button" aria-label="Újrajátszás" onClick={playback.restart}><RotateCcw size={15} /></button>
  </div>;
}

function previewClip(id, nodes, edges) {
  const render = outgoingRender(id, nodes, edges);
  const port = render ? scenePorts.findIndex(({ id: handle }) =>
    edges.some((edge) => edge.source === id && edge.target === render.id && edge.targetHandle === handle)) : -1;
  if (port === -1) {
    const text = upstream(id, nodes, edges);
    const settings = { ...defaults.render, sceneDurations: [] };
    const timeline = makeTimeline([{ text: text?.data, background: linkedBackground(text?.id, nodes, edges) }], settings);
    return { timeline, settings, start: 0, duration: timeline.duration, label: 'Szövegjelenet' };
  }

  const { inputs, background } = renderSources(render.id, nodes, edges);
  const settings = render.data;
  const timeline = makeTimeline(inputs, settings, background);
  const index = timeline.scenes.findIndex((scene) => scene.port === port);
  if (index === -1) return { duration: 0 };
  const first = timeline.scenes[index];
  const next = timeline.scenes[index + 1];
  const scenes = next ? [first, { ...next, transition: undefined }] : [first];
  const end = scenes.at(-1).end;
  return {
    timeline: { ...timeline, scenes, frameCount: end }, settings,
    start: first.start / timeline.fps,
    duration: (end - first.start) / timeline.fps,
    label: next ? `${scenePorts[port].label} → ${scenePorts[next.port].label}` : scenePorts[port].label,
  };
}

function TransitionPreviewDialog({ id, nodes, edges, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const clip = useMemo(() => previewClip(id, nodes, edges), [id, nodes, edges]);
  const playback = usePlayback(clip.duration, false, clip.duration > 0);

  useEffect(() => { dialog.current.showModal(); }, []);

  return createPortal(<dialog ref={dialog} className="text-preview-dialog transition-preview-dialog" aria-labelledby={title}
    onClose={onClose} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header>
      <Eye size={17} /><h2 id={title}>Átmenet előnézete</h2>
      <button type="button" className="icon-button" aria-label="Előnézet bezárása" onClick={() => dialog.current.close()}><X size={17} /></button>
    </header>
    {clip.duration > 0 ? <>
      <div className="text-preview-stage"><Preview timeline={clip.timeline} settings={clip.settings} time={clip.start + playback.time} size={960} label="Jelenetváltás előnézete" /></div>
      <footer className="transition-preview-footer">
        <PlaybackButtons playback={playback} />
        <input type="range" min={0} max={clip.duration} step="0.001" aria-label="Jelenet-előnézet pozíciója" value={playback.time}
          onChange={(event) => { playback.setPlaying(false); playback.seek(Number(event.target.value)); }} />
        <span className="transition-time">{seconds(playback.time)} / {seconds(clip.duration)} mp</span>
        <span className="transition-preview-label">{clip.label}</span>
      </footer>
    </> : <p className="transition-empty">Köss egy kitöltött Szöveg kártyát az Átmenet bemenetére.</p>}
  </dialog>, document.body);
}

function makeSample(width, letter) {
  const canvas = document.createElement('canvas');
  const height = Math.round(width * 9 / 16);
  Object.assign(canvas, { width, height });
  const ctx = canvas.getContext('2d');
  const cool = letter === 'A';
  const base = ctx.createLinearGradient(0, height, width, 0);
  base.addColorStop(0, cool ? '#101a36' : '#361c4c');
  base.addColorStop(1, cool ? '#287d80' : '#a64c61');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * (cool ? 0.28 : 0.75), height * 0.24, 0,
    width * (cool ? 0.28 : 0.75), height * 0.24, width * 0.62);
  glow.addColorStop(0, cool ? '#92f9db83' : '#ffbd977e');
  glow.addColorStop(1, '#0000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = Math.max(1, width * 0.003);
  ctx.strokeStyle = cool ? '#c7fff55b' : '#ffd9b75e';
  for (let index = 1; index < 7; index += 1) {
    ctx.beginPath();
    if (cool) ctx.ellipse(width * 0.4, height * 0.54, width * index * 0.083, height * index * 0.089, -0.24, 0, Math.PI * 2);
    else {
      const x = width * index * 0.19;
      ctx.moveTo(x, 0);
      ctx.lineTo(x - width * 0.35, height);
    }
    ctx.stroke();
  }
  const inset = width * 0.06;
  ctx.strokeStyle = '#ffffff76';
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  ctx.fillStyle = '#f8fbff';
  ctx.font = `750 ${Math.round(height * 0.56)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#09101b82';
  ctx.shadowBlur = width * 0.04;
  ctx.fillText(letter, width / 2, height * 0.52);
  return canvas;
}

function TransitionSample({ frames, effect, options, progress, label }) {
  const canvas = useRef(null);
  useEffect(() => {
    drawTransition(canvas.current.getContext('2d'), effect, frames[0], frames[1], progress, options);
  }, [frames, effect, options, progress]);
  return <canvas ref={canvas} width={frames[0].width} height={frames[0].height} aria-label={label} aria-hidden={!label || undefined} />;
}

function TuningField({ field, value, onChange }) {
  if (field.choices) return <label className="field">{field.label}
    <Select aria-label={field.label} value={value} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(field.choices).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </Select>
  </label>;
  if (field.color) return <label className="field">{field.label}<Color label={field.label} value={value} onChange={onChange} /></label>;
  return <label className="background-slider">
    <span>{field.label}<span>{value}{field.unit}</span></span>
    <input type="range" min={field.min} max={field.max} step="1" value={value} aria-label={field.label} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

function TransitionEditorDialog({ data, onApply, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const [draft, setDraft] = useState(() => ({ ...data, tuning: data.tuning ?? {} }));
  const { effect, tuning } = draft;
  const options = transitionOptions(effect, tuning[effect]);
  const large = useMemo(() => ['A', 'B'].map((letter) => makeSample(864, letter)), []);
  const thumbnails = useMemo(() => ['A', 'B'].map((letter) => makeSample(192, letter)), []);
  const playback = usePlayback(draft.seconds + hold * 2, true, () => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const progress = Math.max(0, Math.min(1, (playback.time - hold) / draft.seconds));

  useEffect(() => { dialog.current.showModal(); }, []);

  function tune(key, value) {
    setDraft((current) => ({ ...current, tuning: { ...current.tuning, [effect]: { ...current.tuning[effect], [key]: value } } }));
  }

  function reset() {
    setDraft((current) => {
      const next = { ...current.tuning };
      delete next[effect];
      return { ...current, tuning: next };
    });
  }

  return createPortal(<dialog ref={dialog} className="gradient-dialog transition-editor" aria-labelledby={title}
    onClose={onClose} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <header className="gradient-header">
      <Shuffle size={19} /><h2 id={title}>Átmenetek szerkesztése</h2>
      <button type="button" className="icon-button" aria-label="Átmenetszerkesztő bezárása" onClick={() => dialog.current.close()}><X size={18} /></button>
    </header>
    <div className="gradient-workspace transition-workspace">
      <div className="gradient-preview transition-workspace-preview">
        <div className="gradient-preview-bar"><strong>{transitionEffects[effect]}</strong><span>A → B</span></div>
        <div className="gradient-surface transition-surface">
          <TransitionSample frames={large} effect={effect} options={tuning[effect]} progress={progress} label="Váltási minta A és B között" />
        </div>
        <div className="gradient-preview-footer transition-stage-controls">
          <PlaybackButtons playback={playback} />
          <input type="range" min="0" max="1" step="0.001" value={progress} aria-label="Váltási minta pozíciója"
            onChange={(event) => { playback.setPlaying(false); playback.seek(hold + Number(event.target.value) * draft.seconds); }} />
          <span className="transition-time">{Math.round(progress * 100)}%</span>
        </div>
      </div>
      <div className="gradient-controls transition-settings">
        <section>
          <h3>Váltási effektek</h3>
          <div className="transition-effect-grid">
            {Object.entries(transitionEffects).map(([id, name]) => <button type="button" key={id} aria-pressed={effect === id} onClick={() => setDraft((current) => ({ ...current, effect: id }))}>
              <TransitionSample frames={thumbnails} effect={id} options={tuning[id]} progress={progress} />
              <span>{name}</span>
            </button>)}
          </div>
        </section>
        <section className="transition-tuning">
          <div className="transition-tuning-title"><Settings2 size={15} /><h3>{transitionEffects[effect]}</h3>
            <button type="button" className="icon-button" aria-label="Effekt alapértékei" title="Effekt alapértékei" onClick={reset}><RotateCcw size={14} /></button>
          </div>
          <label className="field field-inline">Időtartam<Seconds label="Átmenet időtartama" value={draft.seconds} max={maxTransitionSeconds}
            onChange={(value) => setDraft((current) => ({ ...current, seconds: value }))} /></label>
          {[curveField, ...transitionFields[effect]].map((field) =>
            <TuningField key={field.key} field={field} value={options[field.key]} onChange={(value) => tune(field.key, value)} />)}
        </section>
      </div>
    </div>
    <footer className="gradient-footer">
      <button type="button" className="button" onClick={() => dialog.current.close()}>Mégse</button>
      <button type="button" className="button primary" onClick={() => { onApply(draft); dialog.current.close(); }}>Alkalmazás</button>
    </footer>
  </dialog>, document.body);
}

export default function TransitionDialog({ mode, ...props }) {
  return mode === 'editor' ? <TransitionEditorDialog {...props} /> : <TransitionPreviewDialog {...props} />;
}
