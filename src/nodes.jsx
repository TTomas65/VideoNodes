import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Handle, NodeResizeControl, Position } from '@xyflow/react';
import { Blend, Clapperboard, Cog, Download, Eye, FastForward, Image, Maximize, Pause, Play, Repeat2, RotateCcw, Trash2, Type, X } from 'lucide-react';
import { backgroundPort, cardWidths, defaults, effects, fonts, formats, label, maxCardWidth, outgoingRender, qualities, resolutions, sceneInputs, scenePorts, upstream } from './project';
import { usableBackground } from './background';
import { BackgroundFields } from './background-node';
import { Color, Seconds, Select } from './fields';
import { Preview } from './preview';
import { durationFor, makeTimeline, maxSceneSeconds } from './timeline';

export const GraphContext = createContext(null);
export const typeIcons = { text: Type, background: Image, render: Cog, video: Clapperboard };
export const descriptions = { text: 'Címek és animációk', background: 'Kép és színátmenet', render: 'MP4 és WebM videó', video: 'Előnézet és lejátszás' };

export function NodeIcon({ type }) {
  const Icon = typeIcons[type];
  return <span className={`node-icon ${type}`}><Icon size={16} strokeWidth={2} /></span>;
}

function ChromeIcon({ type }) {
  return <span className={`chrome-icon chrome-${type}`} aria-hidden="true"><span /><span /><span /></span>;
}

function Card({ id, type, selected, children, input, output, sceneControls }) {
  const { deleteNode, resizeNode, nodes, edges } = useContext(GraphContext);
  const incoming = new Set(edges.filter((edge) => edge.target === id).map((edge) => edge.targetHandle ?? null));
  const outgoing = edges.some((edge) => edge.source === id);
  const isRender = type === 'render';
  const inputs = isRender ? scenePorts : [{ id: null, label: input }];
  const outputPort = output && <span className={`port port-out${isRender ? ' blue' : ''}${type === 'background' ? ' port-background' : ''}`}>{output}<Handle type="source" position={Position.Right} className={outgoing ? 'is-wired' : ''} /></span>;
  const minWidth = cardWidths[type];
  const width = nodes.find((node) => node.id === id)?.width ?? minWidth;
  return <article className={`node-card node-${type}${selected ? ' is-selected' : ''}`} aria-label={label[type]}>
    <header className="node-header"><ChromeIcon type={type} /><strong>{label[type]}</strong>
      <button type="button" className="icon-button node-close nodrag" title={`${label[type]} törlése`} aria-label={`${label[type]} törlése`} onClick={() => deleteNode(id)}><X size={15} /></button>
    </header>
    {inputs.map(({ id: handle, label: name }, index) => <div key={handle ?? 'main'} className={`port-row${isRender ? ' scene-port' : ''}`}>
      {name ? <span className={`port port-in${type === 'video' ? ' blue' : ''}`}><Handle type="target" id={handle} position={Position.Left} className={incoming.has(handle) ? 'is-wired' : ''} />{name}</span> : <span />}
      {isRender ? sceneControls(index, name) : outputPort}
    </div>)}
    {isRender && <div className="port-row secondary-port"><span className="port port-in port-background"><Handle type="target" id={backgroundPort} position={Position.Left} className={incoming.has(backgroundPort) ? 'is-wired' : ''} />Háttér</span>{outputPort}</div>}
    <div className="node-body nodrag nowheel">{children}</div>
    <NodeResizeControl className="card-resize nodrag" position="bottom-right" resizeDirection="horizontal" minWidth={minWidth} maxWidth={maxCardWidth} autoScale={false}>
      <button type="button" className="resize-grip" aria-label={type === 'video' ? 'Videókártya méretezése' : `${label[type]} kártya méretezése`}
        title="Húzd a kártya méretezéséhez, vagy használd a nyílbillentyűket" onKeyDown={(event) => {
          const step = { ArrowLeft: -24, ArrowDown: -24, ArrowRight: 24, ArrowUp: 24 }[event.key];
          if (!step && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          event.stopPropagation();
          resizeNode(id, step ? width + step : event.key === 'Home' ? minWidth : maxCardWidth);
        }} />
    </NodeResizeControl>
  </article>;
}

function TextNode({ id, data, selected }) {
  const { updateNode, nodes, edges } = useContext(GraphContext);
  const [previewOpen, setPreviewOpen] = useState(false);
  const set = (key, value) => updateNode(id, key, value);
  const linkedRender = previewOpen && outgoingRender(id, nodes, edges);
  const linkedBackground = linkedRender && upstream(linkedRender.id, nodes, edges, backgroundPort)?.data;
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
    {previewOpen && <TextPreviewDialog text={data} settings={linkedRender?.data ?? defaults.render} background={usableBackground(linkedBackground) ? linkedBackground : undefined} onClose={() => setPreviewOpen(false)} />}
  </Card>;
}

function BackgroundNode({ id, data, selected }) {
  const { nodes, edges, updateNode, updateImage } = useContext(GraphContext);
  const settings = outgoingRender(id, nodes, edges)?.data ?? defaults.render;
  return <Card id={id} type="background" selected={selected} output="Háttér">
    <BackgroundFields data={data} settings={settings} set={(key, value) => updateNode(id, key, value)} onImage={(image) => updateImage(id, image)} />
  </Card>;
}

function RenderNode({ id, data, selected }) {
  const { nodes, edges, updateNode, runRender, rendering, outputs } = useContext(GraphContext);
  const set = (key, value) => updateNode(id, key, value);
  const active = rendering?.id === id;
  const texts = sceneInputs(id, nodes, edges).map((node) => node?.data);
  const background = upstream(id, nodes, edges, backgroundPort)?.data;
  const { scenes, duration } = makeTimeline(texts, data, usableBackground(background));
  const sceneProgress = active ? rendering.scenes : outputs[id]?.scenes;

  function setSceneDuration(index, value) {
    if ((data.sceneDurations[index] ?? null) === value) return;
    const lengths = [...data.sceneDurations];
    lengths[index] = value;
    set('sceneDurations', lengths);
  }

  function sceneControls(index, name) {
    const progress = sceneProgress?.[index];
    const placeholder = durationFor(data, index, texts[index]);
    return <>
      <div className="scene-timing nodrag nowheel">
        {sceneProgress && <span className="scene-percent" aria-hidden="true">{progress === undefined ? '–' : `${progress}%`}</span>}
        <Seconds value={data.sceneDurations[index]} placeholder={placeholder.toLocaleString('hu-HU', { maximumFractionDigits: 2 })}
          label={`${name} hossza`} max={maxSceneSeconds} onChange={(value) => setSceneDuration(index, value)} />
      </div>
      {sceneProgress && (progress === undefined ? <span className="scene-progress-track inactive" aria-hidden="true" />
        : <div className="scene-progress-track" role="progressbar" aria-label={`${name} renderelése`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>)}
    </>;
  }

  return <Card id={id} type="render" selected={selected} output={formats[data.format].container} sceneControls={sceneControls}>
    <label className="field">Felbontás<Select value={data.resolution} onChange={(event) => set('resolution', event.target.value)}>
      {Object.entries(resolutions).map(([key, { label: name, width, height }]) => <option value={key} key={key}>{width} × {height} · {name}</option>)}
    </Select></label>
    <label className="field">Képkocka/mp<Select value={data.fps} onChange={(event) => set('fps', Number(event.target.value))}>{[24, 25, 30, 60].map((fps) => <option key={fps}>{fps}</option>)}</Select></label>
    <label className="field">Kimeneti formátum<Select aria-label="Kimeneti formátum" value={data.format} onChange={(event) => set('format', event.target.value)}>
      {Object.entries(formats).map(([key, { container, codec }]) => <option key={key} value={key}>{container} ({codec})</option>)}
    </Select></label>
    <label className="field">Renderelési minőség<Select aria-label="Renderelési minőség" value={data.crf} onChange={(event) => set('crf', Number(event.target.value))}>
      {qualities.map(({ crf, label: name }) => <option key={crf} value={crf}>{name} (CRF {crf})</option>)}
    </Select></label>
    <div className="background-summary render-summary"><span>{scenes.length} jelenet</span><span>{duration.toLocaleString('hu-HU', { maximumFractionDigits: 2 })} mp teljes hossz</span></div>
    <button type="button" className="render-button" disabled={Boolean(rendering)} onClick={() => runRender(id)}>
      <Play size={13} fill="currentColor" /> {active ? `${Math.round(rendering.progress)}% · Renderelés` : 'Renderelés indítása'}
    </button>
  </Card>;
}

const stamp = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function TextPreviewDialog({ text, settings, background, onClose }) {
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
    <div className="text-preview-stage"><Preview text={text} settings={settings} background={background} time={time} size={960} /></div>
    <progress className="text-preview-progress" aria-label="Animáció előrehaladása" max={text.seconds} value={time} />
    <footer>
      <span>{effects[text.effect]} · {text.seconds.toLocaleString('hu-HU')} mp</span>
      <button type="button" className="button" onClick={() => { setTime(0); setReplay((value) => value + 1); }}><RotateCcw size={14} /> Újrajátszás</button>
    </footer>
  </dialog>, document.body);
}

function VideoNode({ id, data, selected, width }) {
  const { nodes, edges, outputs, download, updateNode } = useContext(GraphContext);
  const render = upstream(id, nodes, edges);
  const linkedBackground = render && upstream(render.id, nodes, edges, backgroundPort)?.data;
  const background = usableBackground(linkedBackground) ? linkedBackground : undefined;
  const output = render && outputs[render.id];
  const settings = render?.data ?? defaults.render;
  const texts = sceneInputs(render?.id, nodes, edges).map((node) => node?.data);
  const hasBackground = Boolean(background);
  const timeline = useMemo(() => makeTimeline(texts, settings, hasBackground), [settings, hasBackground, ...texts]);
  const duration = output?.duration ?? timeline.duration;
  const firstScene = timeline.scenes[0];
  const posterTime = firstScene?.text ? (Math.min(firstScene.end, firstScene.animationEnd) - 1) / timeline.fps : 0;
  const previewSize = Math.max(480, Math.ceil((width ?? cardWidths.video) / 128) * 128);
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
  }, [output, timeline, background]);

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

  const playable = Boolean(output || timeline.scenes.length || background);
  return <Card id={id} type="video" selected={selected} input="Videó">
    <div className="video-screen" ref={screen}>
      {output ? <video key={output.url} ref={video} src={output.url} playsInline loop={data.loop} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} />
        : playable ? <Preview timeline={timeline} settings={settings} background={background} time={showPoster ? posterTime : time} size={previewSize} /> : <div className="empty-screen"><Clapperboard size={23} /><span>Köss be egy renderkártyát</span></div>}
      <span className="screen-label"><span />{output ? 'RENDERELT VIDEÓ' : 'ELŐNÉZET'}</span>
    </div>
    <input className="scrubber" type="range" min={0} max={duration} step={0.01} value={Math.min(time, duration)} disabled={!playable}
      aria-label="Lejátszási pozíció" onChange={(event) => seek(Number(event.target.value))} style={{ '--played': `${duration ? Math.min(100, time / duration * 100) : 0}%` }} />
    <div className="player-controls">
      <button className="icon-button player-play" type="button" title={playing ? 'Szünet' : 'Lejátszás'} aria-label={playing ? 'Szünet' : 'Lejátszás'} disabled={!playable} onClick={toggle}>{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>
      <button className="icon-button" type="button" title="Ugrás a végére" aria-label="Ugrás a végére" disabled={!playable} onClick={() => seek(duration)}><FastForward size={13} /></button>
      <span className="timecode">{stamp(time)} <span>/</span> {stamp(playable ? duration : 0)}</span>
      <button className="icon-button loop-button" type="button" title={data.loop ? 'Ismétlés kikapcsolása' : 'Ismétlés bekapcsolása'} aria-label="Ismétlés" aria-pressed={data.loop} onClick={() => updateNode(id, 'loop', !data.loop)}><Repeat2 size={15} /></button>
      <button className="icon-button" type="button" title="Teljes képernyő" aria-label="Teljes képernyő" disabled={!playable} onClick={() => screen.current.requestFullscreen?.().catch(() => {})}><Maximize size={13} /></button>
      {output && <button className="icon-button" type="button" title="Videó letöltése" aria-label="Videó letöltése" onClick={() => download(output)}><Download size={14} /></button>}
    </div>
  </Card>;
}

export function SignalEdge(props) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, id, selected } = props;
  const [path, middleX, middleY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.33 });
  const { nodes, selectEdge, deleteEdge } = useContext(GraphContext);
  const type = nodes.find((node) => node.id === props.source)?.type;
  return <><g className={`signal-edge ${type === 'render' ? 'signal-blue' : type === 'background' ? 'signal-background' : ''} ${selected ? 'signal-selected' : ''}`}>
    <path d={path} className="signal-halo" fill="none" />
    <BaseEdge id={id} path={path} interactionWidth={22} />
    <circle className="signal-light" cx={middleX} cy={middleY} r="2.3" />
  </g><EdgeLabelRenderer><div className="edge-controls nodrag nopan" style={{ left: middleX, top: middleY }}>
    <button type="button" className="edge-point" aria-label="Kapcsolat műveletei" aria-expanded={selected} title="Kapcsolat műveletei"
      onClick={(event) => { event.stopPropagation(); selectEdge(id); }} />
    {selected && <button type="button" className="edge-delete" onClick={(event) => { event.stopPropagation(); deleteEdge(id); }}><Trash2 size={13} /> Törlés</button>}
  </div></EdgeLabelRenderer></>;
}

export const nodeTypes = { text: TextNode, background: BackgroundNode, render: RenderNode, video: VideoNode };
export const edgeTypes = { signal: SignalEdge };
