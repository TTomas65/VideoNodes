import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { BaseEdge, getBezierPath, Handle, Position } from '@xyflow/react';
import { Blend, ChevronDown, Clapperboard, Cog, Download, FastForward, Maximize, Pause, Play, Type, X } from 'lucide-react';
import { defaults, effects, fonts, label, resolutions, upstream } from './project';
import { makeScene } from './scene';

export const GraphContext = createContext(null);
export const typeIcons = { text: Type, render: Cog, video: Clapperboard };
export const descriptions = { text: 'Címek és animációk', render: 'MP4 videó készítése', video: 'Előnézet és lejátszás' };

export function NodeIcon({ type }) {
  const Icon = typeIcons[type];
  return <span className={`node-icon ${type}`}><Icon size={16} strokeWidth={2} /></span>;
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
    <header className="node-header"><NodeIcon type={type} /><strong>{label[type]}</strong>
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
  const { updateNode } = useContext(GraphContext);
  const set = (key, value) => updateNode(id, key, value);
  return <Card id={id} type="text" selected={selected} output="Szöveg">
    <label className="field">Tartalom<textarea rows={2} maxLength={360} value={data.text} placeholder="Írd be a szöveget…" onChange={(event) => set('text', event.target.value)} /></label>
    <div className="fields-two text-style-fields">
      <label className="field">Betűtípus<Select value={data.font} onChange={(event) => set('font', event.target.value)}>{fonts.map((font) => <option key={font}>{font}</option>)}</Select></label>
      <label className="field">Szín<Color value={data.color} onChange={(value) => set('color', value)} /></label>
    </div>
    <div className="field-divider" />
    <label className="field"><span className="field-with-icon"><Blend size={13} /> Animáció</span><Select aria-label="Animáció" value={data.effect} onChange={(event) => set('effect', event.target.value)}>{Object.entries(effects).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select></label>
    <label className="field field-inline">Animáció ideje<Seconds value={data.seconds} max={10} onChange={(value) => set('seconds', value)} /></label>
  </Card>;
}

function RenderNode({ id, data, selected }) {
  const { updateNode, runRender, rendering } = useContext(GraphContext);
  const set = (key, value) => updateNode(id, key, value);
  const active = rendering?.id === id;
  return <Card id={id} type="render" selected={selected} input="Jelenet" output="MP4">
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
    <div className="format-row"><span>Kimenet</span><span>H.264 <span className="format-dot">·</span> MP4</span></div>
    <button type="button" className="render-button" disabled={Boolean(rendering)} onClick={() => runRender(id)}>
      <Play size={13} fill="currentColor" /> {active ? `${Math.round(rendering.progress)}% · Renderelés` : 'Renderelés indítása'}
    </button>
  </Card>;
}

const stamp = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function Preview({ text, settings, time }) {
  const canvas = useRef(null);
  const draw = useRef(null);
  const latestTime = useRef(time);
  const resolution = resolutions[settings.resolution];
  const width = Math.round(480 * Math.min(1, resolution.width / resolution.height));
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
  }, [text, settings]);
  useEffect(() => { latestTime.current = time; draw.current?.(time); }, [time]);
  return <canvas ref={canvas} width={width} height={height} aria-label="Animáció előnézete" />;
}

function VideoNode({ id, selected }) {
  const { nodes, edges, outputs, download } = useContext(GraphContext);
  const render = upstream(id, nodes, edges);
  const text = render && upstream(render.id, nodes, edges);
  const output = render && outputs[render.id];
  const settings = render?.data ?? defaults.render;
  const duration = output?.duration ?? settings.duration;
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
      const next = Math.min(duration, position.current + (now - previous) / 1000);
      previous = now;
      setPosition(next);
      if (next < duration) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, output, playing]);

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
      {output ? <video key={output.url} ref={video} src={output.url} playsInline onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} />
        : text ? <Preview text={text.data} settings={settings} time={showPoster ? text.data.seconds : time} /> : <div className="empty-screen"><Clapperboard size={23} /><span>Köss be egy renderkártyát</span></div>}
      <span className="screen-label"><span />{output ? 'RENDERELT VIDEÓ' : 'ELŐNÉZET'}</span>
    </div>
    <input className="scrubber" type="range" min={0} max={duration} step={0.01} value={Math.min(time, duration)} disabled={!playable}
      aria-label="Lejátszási pozíció" onChange={(event) => seek(Number(event.target.value))} style={{ '--played': `${Math.min(100, time / duration * 100)}%` }} />
    <div className="player-controls">
      <button className="icon-button player-play" type="button" title={playing ? 'Szünet' : 'Lejátszás'} aria-label={playing ? 'Szünet' : 'Lejátszás'} disabled={!playable} onClick={toggle}>{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>
      <button className="icon-button" type="button" title="Ugrás a végére" aria-label="Ugrás a végére" disabled={!playable} onClick={() => seek(duration)}><FastForward size={13} /></button>
      <span className="timecode">{stamp(time)} <span>/</span> {stamp(playable ? duration : 0)}</span>
      <button className="icon-button" type="button" title="Teljes képernyő" aria-label="Teljes képernyő" disabled={!playable} onClick={() => screen.current.requestFullscreen?.().catch(() => {})}><Maximize size={13} /></button>
      {output && <button className="icon-button" type="button" title="Videó letöltése" aria-label="Videó letöltése" onClick={() => download(output)}><Download size={14} /></button>}
    </div>
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
