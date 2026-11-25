import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BaseEdge, getBezierPath, Handle, NodeResizeControl, Position } from '@xyflow/react';
import { Blend, ChevronDown, Clapperboard, Cog, Download, Eye, FastForward, Maximize, Pause, Play, Repeat2, RotateCcw, Type, X } from 'lucide-react';
import { defaults, effects, fonts, formats, label, qualities, resolutions, upstream, videoSize } from './project';
import { makeScene } from './scene';

export const GraphContext = createContext(null);
export const typeIcons = { text: Type, render: Cog, video: Clapperboard };
export const descriptions = { text: 'Címek és animációk', render: 'MP4 és WebM videó', video: 'Előnézet és lejátszás' };

export function NodeIcon({ type }) {
  const Icon = typeIcons[type];
  return <span className={`node-icon ${type}`}><Icon size={16} strokeWidth={2} /></span>;
}

function ChromeIcon({ type }) {
  return <span className={`chrome-icon chrome-${type}`} aria-hidden="true"><span /><span /><span /></span>;
}

export function Select({ children, ...props }) {
  return <span className="select-field"><select {...props}>{children}</select><ChevronDown size={13} /></span>;
}

export function Color({ value, onChange }) {
  return <span className="color-field"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><span aria-hidden="true">{value.toUpperCase()}</span></span>;
}

export function Seconds({ value, onChange, max }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const valueAsNumber = Number(draft);
    const next = draft !== '' && Number.isFinite(valueAsNumber) ? Math.max(0.1, Math.min(max, valueAsNumber)) : value;
    setDraft(String(next));
    onChange(next);
  }
  return <span className="unit-field"><input inputMode="decimal" type="number" min="0.1" max={max} step="0.1" value={draft}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><span>mp</span></span>;
}

function Card({ id, type, selected, children, input, output }) {
  const { deleteNode, nodes, edges } = useContext(GraphContext);
  const target = edges.find((edge) => edge.target === id);
  const source = edges.find((edge) => edge.source === id);
  const inputType = nodes.find((node) => node.id === target?.source)?.type;
  return <article className={`node-card node-${type}${selected ? ' is-selected' : ''}`} aria-label={label[type]}>
    <header className="node-header"><ChromeIcon type={type} /><strong>{label[type]}</strong>
      <button type="button" className="icon-button node-close nodrag" title={`${label[type]} törlése`} aria-label={`${label[type]} törlése`} onClick={() => deleteNode(id)}><X size={15} /></button>
    </header>
    <div className="port-row">
      {input ? <span className={`port port-in ${inputType === 'render' ? 'blue' : ''}`}><Handle type="target" position={Position.Left} className={target ? 'is-wired' : ''} />{input}</span> : <span />}
      {output && <span className={`port port-out ${type === 'render' ? 'blue' : ''}`}>{output}<Handle type="source" position={Position.Right} className={source ? 'is-wired' : ''} /></span>}
    </div>
    <div className="node-body nodrag nowheel">{children}</div>
  </article>;
}

function TextNode({ id, data, selected }) {
  const { updateNode, nodes, edges } = useContext(GraphContext);
  const [previewOpen, setPreviewOpen] = useState(false);
  const set = (key, value) => updateNode(id, key, value);
  const linkedRender = previewOpen && nodes.find((node) => node.id === edges.find((edge) => edge.source === id)?.target);
  return <Card id={id} type="text" selected={selected} output="Szöveg">
    <label className="field">Tartalom<textarea rows={2} maxLength={360} value={data.text} placeholder="Írd be a szöveget…" onChange={(event) => set('text', event.target.value)} /></label>
    <div className="fields-two text-style-fields">
      <label className="field">Betűtípus<Select value={data.font} onChange={(event) => set('font', event.target.value)}>{fonts.map((font) => <option key={font}>{font}</option>)}</Select></label>
      <label className="field">Szín<Color value={data.color} onChange={(value) => set('color', value)} /></label>
    </div>
    <div className="field-divider" />
    <label className="field"><span className="field-with-icon"><Blend size={13} /> Animáció</span><Select aria-label="Animáció" value={data.effect} onChange={(event) => set('effect', event.target.value)}>{Object.entries(effects).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select></label>
    <label className="field field-inline">Animáció ideje<Seconds value={data.seconds} max={10} onChange={(value) => set('seconds', value)} /></label>
    <button type="button" className="button text-preview-button" aria-haspopup="dialog" disabled={!data.text.trim()} onClick={() => setPreviewOpen(true)}>
      <Eye size={15} /> Előnézet
    </button>
    {previewOpen && <TextPreviewDialog text={data} settings={linkedRender?.data ?? defaults.render} onClose={() => setPreviewOpen(false)} />}
  </Card>;
}

function RenderNode({ id, data, selected }) {
  const { updateNode, runRender, rendering } = useContext(GraphContext);
  const set = (key, value) => updateNode(id, key, value);
  const active = rendering?.id === id;
  return <Card id={id} type="render" selected={selected} input="Jelenet" output={formats[data.format].container}>
    <label className="field">Felbontás<Select value={data.resolution} onChange={(event) => set('resolution', event.target.value)}>
      {Object.entries(resolutions).map(([key, { label: name, width, height }]) => <option value={key} key={key}>{width} × {height} · {name}</option>)}
    </Select></label>
    <div className="fields-two">
      <label className="field">Képkocka/mp<Select value={data.fps} onChange={(event) => set('fps', Number(event.target.value))}>{[24, 25, 30, 60].map((fps) => <option key={fps}>{fps}</option>)}</Select></label>
      <label className="field">Videó hossza<Seconds value={data.duration} max={20} onChange={(value) => set('duration', value)} /></label>
    </div>
    <div className="fields-two text-style-fields">
      <label className="field">Háttér<Select value={data.style} onChange={(event) => set('style', event.target.value)}><option value="ribbons">Fényívek</option><option value="solid">Egyszínű</option></Select></label>
      <label className="field">Szín<Color value={data.background} onChange={(value) => set('background', value)} /></label>
    </div>
    <label className="field">Kimeneti formátum<Select aria-label="Kimeneti formátum" value={data.format} onChange={(event) => set('format', event.target.value)}>
      {Object.entries(formats).map(([key, { container, codec }]) => <option key={key} value={key}>{container} ({codec})</option>)}
    </Select></label>
    <label className="field">Renderelési minőség<Select aria-label="Renderelési minőség" value={data.crf} onChange={(event) => set('crf', Number(event.target.value))}>
      {qualities.map(({ crf, label: name }) => <option key={crf} value={crf}>{name} (CRF {crf})</option>)}
    </Select></label>
    <button type="button" className="render-button" disabled={Boolean(rendering)} onClick={() => runRender(id)}>
      <Play size={13} fill="currentColor" /> {active ? `${Math.round(rendering.progress)}% · Renderelés` : 'Renderelés indítása'}
    </button>
  </Card>;
}

const stamp = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function Preview({ text, settings, time, size }) {
  const canvas = useRef(null);
  const draw = useRef(null);
  const latestTime = useRef(time);
  const resolution = resolutions[settings.resolution];
  const width = Math.round(size * Math.min(1, resolution.width / resolution.height));
  const height = Math.round(width * resolution.height / resolution.width);
  useEffect(() => {
    const update = () => {
      draw.current = makeScene(canvas.current, text, settings);
      draw.current(latestTime.current);
    };
    update();
    let alive = true;
    document.fonts.ready.then(() => { if (alive) update(); });
    return () => { alive = false; };
  }, [text, settings, width, height]);
  useEffect(() => { latestTime.current = time; draw.current?.(time); }, [time]);
  return <canvas ref={canvas} width={width} height={height} aria-label="Animáció előnézete" />;
}

function TextPreviewDialog({ text, settings, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const [time, setTime] = useState(0);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    dialog.current.showModal();
  }, []);

  useEffect(() => {
    let frame;
    let start;
    const tick = (now) => {
      start ??= now;
      const elapsed = Math.min(text.seconds, (now - start) / 1000);
      setTime(elapsed);
      if (elapsed < text.seconds) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [replay, text.seconds]);

  return createPortal(<dialog ref={dialog} className="text-preview-dialog" aria-labelledby={title} onClose={onClose} onKeyDown={(event) => event.stopPropagation()}>
    <header>
      <Eye size={17} />
      <h2 id={title}>Szöveg előnézete</h2>
      <button type="button" className="icon-button" aria-label="Előnézet bezárása" onClick={() => dialog.current.close()}><X size={17} /></button>
    </header>
    <div className="text-preview-stage"><Preview text={text} settings={settings} time={time} size={960} /></div>
    <progress className="text-preview-progress" aria-label="Animáció előrehaladása" max={text.seconds} value={time} />
    <footer>
      <span>{effects[text.effect]} · {text.seconds.toLocaleString('hu-HU')} mp</span>
      <button type="button" className="button" onClick={() => { setTime(0); setReplay((value) => value + 1); }}><RotateCcw size={14} /> Újrajátszás</button>
    </footer>
  </dialog>, document.body);
}

function VideoNode({ id, data, selected, width }) {
  const { nodes, edges, outputs, download, updateNode, resizeVideo } = useContext(GraphContext);
  const render = upstream(id, nodes, edges);
  const text = render && upstream(render.id, nodes, edges);
  const output = render && outputs[render.id];
  const settings = render?.data ?? defaults.render;
  const duration = output?.duration ?? settings.duration;
  const previewSize = Math.max(480, Math.ceil((width ?? videoSize.min) / 128) * 128);
  const video = useRef(null);
  const screen = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [showPoster, setShowPoster] = useState(true);
  const position = useRef(time);
  const setPosition = (value) => { position.current = value; setTime(value); };

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setShowPoster(!output);
  }, [output, duration, text?.data]);

  useEffect(() => {
    if (output || !playing) return;
    let frame;
    let previous = performance.now();
    const tick = (now) => {
      const elapsed = position.current + (now - previous) / 1000;
      const next = data.loop ? elapsed % duration : Math.min(duration, elapsed);
      previous = now;
      setPosition(next);
      if (next < duration) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [data.loop, duration, output, playing]);

  function toggle() {
    if (output) {
      if (video.current.paused) video.current.play().catch(() => setPlaying(false));
      else video.current.pause();
      return;
    }
    setShowPoster(false);
    if (!playing && time >= duration) setPosition(0);
    setPlaying(!playing);
  }

  function seek(value) {
    setShowPoster(false);
    if (output && video.current.readyState > 0) video.current.currentTime = value;
    setPosition(value);
  }

  const playable = Boolean(output || text);
  return <Card id={id} type="video" selected={selected} input="Videó">
    <div className="video-screen" ref={screen}>
      {output ? <video key={output.url} ref={video} src={output.url} playsInline loop={data.loop} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} />
        : text ? <Preview text={text.data} settings={settings} time={showPoster ? text.data.seconds : time} size={previewSize} /> : <div className="empty-screen"><Clapperboard size={23} /><span>Köss be egy renderkártyát</span></div>}
      <span className="screen-label"><span />{output ? 'RENDERELT VIDEÓ' : 'ELŐNÉZET'}</span>
    </div>
    <input className="scrubber" type="range" min={0} max={duration} step={0.01} value={Math.min(time, duration)} disabled={!playable}
      aria-label="Lejátszási pozíció" onChange={(event) => seek(Number(event.target.value))} style={{ '--played': `${Math.min(100, time / duration * 100)}%` }} />
    <div className="player-controls">
      <button className="icon-button player-play" type="button" title={playing ? 'Szünet' : 'Lejátszás'} aria-label={playing ? 'Szünet' : 'Lejátszás'} disabled={!playable} onClick={toggle}>{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>
      <button className="icon-button" type="button" title="Ugrás a végére" aria-label="Ugrás a végére" disabled={!playable} onClick={() => seek(duration)}><FastForward size={13} /></button>
      <span className="timecode">{stamp(time)} <span>/</span> {stamp(playable ? duration : 0)}</span>
      <button className="icon-button loop-button" type="button" title={data.loop ? 'Ismétlés kikapcsolása' : 'Ismétlés bekapcsolása'} aria-label="Ismétlés" aria-pressed={data.loop} onClick={() => updateNode(id, 'loop', !data.loop)}><Repeat2 size={15} /></button>
      <button className="icon-button" type="button" title="Teljes képernyő" aria-label="Teljes képernyő" disabled={!playable} onClick={() => screen.current.requestFullscreen?.().catch(() => {})}><Maximize size={13} /></button>
      {output && <button className="icon-button" type="button" title="Videó letöltése" aria-label="Videó letöltése" onClick={() => download(output)}><Download size={14} /></button>}
    </div>
    <NodeResizeControl className="video-resize nodrag" position="bottom-right" resizeDirection="horizontal" minWidth={videoSize.min} maxWidth={videoSize.max} autoScale={false}>
      <button type="button" className="resize-grip" aria-label="Videókártya méretezése" title="Húzd a kártya méretezéséhez, vagy használd a nyílbillentyűket" onKeyDown={(event) => {
        const step = { ArrowLeft: -24, ArrowDown: -24, ArrowRight: 24, ArrowUp: 24 }[event.key];
        if (!step && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        event.stopPropagation();
        resizeVideo(id, step ? (width ?? videoSize.min) + step : event.key === 'Home' ? videoSize.min : videoSize.max);
      }} />
    </NodeResizeControl>
  </Card>;
}

export function SignalEdge(props) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, id, selected } = props;
  const [path, middleX, middleY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.33 });
  const { nodes } = useContext(GraphContext);
  const blue = nodes.find((node) => node.id === props.source)?.type === 'render';
  return <g className={`signal-edge ${blue ? 'signal-blue' : ''} ${selected ? 'signal-selected' : ''}`}>
    <path d={path} className="signal-halo" fill="none" />
    <BaseEdge id={id} path={path} interactionWidth={22} />
    <circle className="signal-light" cx={middleX} cy={middleY} r="2.3" />
  </g>;
}

export const nodeTypes = { text: TextNode, render: RenderNode, video: VideoNode };
export const edgeTypes = { signal: SignalEdge };
