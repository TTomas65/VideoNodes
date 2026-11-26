import { defaultBackground, hexColor, maxProjectImageData, range, readBackground } from './background';
import { defaultSceneSeconds, framesFor, maxSceneSeconds } from './timeline';
import { maxTransitionSeconds, readTransitionTuning, transitionEffects } from './transitions';
import { maxCaptionLength, readCaptionAlignments, readPlacement, readTextRuns } from './caption-format';
import { readCaptionFont } from './caption-fonts';
import { captionDuration, entranceEffects, maxPhaseSeconds, readCaptionPhase, readMotionTuning } from './caption-motion';
import starter from '../backups/starter.json';

export const resolutions = {
  '1280x720': { label: 'HD', width: 1280, height: 720 },
  '1920x1080': { label: 'Full HD', width: 1920, height: 1080 },
  '3840x2160': { label: '4K UHD', width: 3840, height: 2160 },
  '1080x1920': { label: 'Álló', width: 1080, height: 1920 },
  '1080x1080': { label: 'Négyzetes', width: 1080, height: 1080 },
};
export const formats = {
  mp4: { container: 'MP4', codec: 'H.264', mime: 'video/mp4' },
  webm: { container: 'WebM', codec: 'VP9', mime: 'video/webm' },
};
export const qualities = [
  { crf: 26, label: 'Gyors előnézet' },
  { crf: 20, label: 'Kiegyensúlyozott' },
  { crf: 15, label: 'Stúdió minőség' },
];
export const cardWidths = { text: 296, background: 294, transition: 280, render: 404, video: 572 };
export const minCardWidths = { text: 246, background: 246, transition: 246, render: 246, video: 264 };
export const maxCardWidth = 920;

export const label = { text: 'Szöveg', background: 'Háttér', transition: 'Átmenet', render: 'FFmpeg render', video: 'Videólejátszó' };
export const edgeType = 'signal';
export const storageKey = 'present-fflow-v1';
export const backgroundPort = 'background';
export const scenePorts = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return { id: `scene-${number}`, label: `Jelenet ${number}` };
});

export const defaults = {
  text: { text: 'A történet\nitt kezdődik.', font: 'Inter', color: '#f2f3fa', effect: 'slide', seconds: 1.2 },
  render: { resolution: '1920x1080', fps: 30, sceneDurations: scenePorts.map(() => null), format: 'mp4', crf: 20 },
  video: { loop: false },
  background: defaultBackground,
  transition: { effect: 'dissolve', seconds: 0.8, tuning: {} },
};

export const makeNode = (type, position, id = crypto.randomUUID()) => ({
  id, type, position, data: { ...defaults[type] }, dragHandle: '.node-header',
  width: cardWidths[type],
});

export const makeExample = () => readProject(starter);

export function isLegacyExample(project) {
  if (project?.name !== starter.name || project.nodes.length !== 3 || project.edges.length !== 2) return false;
  const cardAt = (type, x, y) => project.nodes.find((node) => node.id === `${type}-1` && node.type === type
    && node.position.x === x && node.position.y === y);
  const text = cardAt('text', 0, 0);
  if (!text || text.data.runs?.length || text.data.placement || text.data.middle || text.data.exit || text.data.alignments || text.data.motionTuning
    || !cardAt('render', 306, 51) || !cardAt('video', 612, 24)) return false;
  return Object.entries(defaults.text).every(([key, value]) => text.data[key] === value)
    && project.edges.some(({ source, target, targetHandle }) => source === 'text-1' && target === 'render-1' && targetHandle === scenePorts[0].id)
    && project.edges.some(({ source, target, targetHandle }) => source === 'render-1' && target === 'video-1' && targetHandle == null);
}

export function canConnect({ source, target, targetHandle = null }, nodes, edges) {
  const from = nodes.find((node) => node.id === source);
  const to = nodes.find((node) => node.id === target);
  if (!from || !to || edges.some((edge) => edge.target === target && (edge.targetHandle ?? null) === targetHandle)) return false;
  if (targetHandle === backgroundPort) return from.type === 'background' && (to.type === 'render' || to.type === 'text');
  if (targetHandle === null) return (from.type === 'render' && to.type === 'video') || (from.type === 'text' && to.type === 'transition');
  return (from.type === 'text' || from.type === 'transition') && to.type === 'render' && scenePorts.some(({ id }) => id === targetHandle);
}

export const upstream = (target, nodes, edges, handle = null) => nodes.find((node) => node.id === edges.find((edge) => edge.target === target && (edge.targetHandle ?? null) === handle)?.source);
const sceneInputs = (target, nodes, edges) => scenePorts.map(({ id }) => upstream(target, nodes, edges, id));
export const linkedBackground = (target, nodes, edges) => upstream(target, nodes, edges, backgroundPort)?.data;

export function renderSources(target, nodes, edges) {
  return {
    background: linkedBackground(target, nodes, edges),
    inputs: sceneInputs(target, nodes, edges).map((node) => {
      const transition = node?.type === 'transition' ? node.data : undefined;
      const text = transition ? upstream(node.id, nodes, edges) : node;
      return { text: text?.data, background: text && linkedBackground(text.id, nodes, edges), transition };
    }),
  };
}

export function outgoingRender(source, nodes, edges) {
  const pending = [source];
  const visited = new Set(pending);
  for (const id of pending) {
    for (const edge of edges) {
      if (edge.source !== id || visited.has(edge.target)) continue;
      const node = nodes.find((node) => node.id === edge.target);
      if (node?.type === 'render') return node;
      visited.add(edge.target);
      pending.push(edge.target);
    }
  }
}

export const imageDataSize = (nodes, except) => nodes.reduce((size, node) => size + (node.type === 'background' && node.id !== except ? node.data.image?.src.length ?? 0 : 0), 0);

export function serialize(name, nodes, edges, viewport) {
  return { version: 1, name, viewport, nodes: nodes.map(({ id, type, position, data, width }) => ({
    id, type, position, data, width,
  })),
    edges: edges.map(({ id, source, target, targetHandle }) => ({ id, source, target, ...(targetHandle && { targetHandle }) })) };
}

export function readProject(value) {
  if (value?.version !== 1 || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || value.nodes.length > 100) {
    throw new Error('A fájl nem érvényes VideoNodes-projekt.');
  }
  const ids = new Set();
  const legacyLengths = new Map();
  const nodes = value.nodes.map((item) => {
    if (!item || !Object.hasOwn(defaults, item.type) || typeof item.id !== 'string' || !item.id || ids.has(item.id)) {
      throw new Error('A projekt hibás vagy ismétlődő kártyát tartalmaz.');
    }
    ids.add(item.id);
    const node = makeNode(item.type, {
      x: range(item.position?.x, -50000, 50000, 0), y: range(item.position?.y, -50000, 50000, 0),
    }, item.id);
    node.width = range(item.width, minCardWidths[item.type], maxCardWidth, cardWidths[item.type]);
    const data = item.data ?? {};
    if (item.type === 'text') {
      const text = typeof data.text === 'string' ? data.text.slice(0, maxCaptionLength) : defaults.text.text;
      const runs = readTextRuns(data.runs, text.length);
      const alignments = readCaptionAlignments(data.alignments, text.split('\n').length);
      const placement = readPlacement(data.placement);
      const middle = readCaptionPhase('middle', data.middle);
      const exit = readCaptionPhase('exit', data.exit);
      const motionTuning = readMotionTuning(data.motionTuning);
      Object.assign(node.data, {
        text,
        font: readCaptionFont(data.font) ?? defaults.text.font,
        color: hexColor(data.color, defaults.text.color),
        effect: Object.hasOwn(entranceEffects, data.effect) ? data.effect : defaults.text.effect,
        seconds: range(data.seconds, 0.1, maxPhaseSeconds, defaults.text.seconds),
        ...(middle && { middle }),
        ...(exit && { exit }),
        ...(motionTuning && { motionTuning }),
        ...(runs.length && { runs }),
        ...(Object.keys(alignments).length && { alignments }),
        ...(placement && { placement }),
      });
    }
    if (item.type === 'render') Object.assign(node.data, {
      resolution: Object.hasOwn(resolutions, data.resolution) ? data.resolution : defaults.render.resolution,
      fps: [24, 25, 30, 60].includes(data.fps) ? data.fps : defaults.render.fps,
      sceneDurations: scenePorts.map((_, index) => range(data.sceneDurations?.[index], 0.1, maxSceneSeconds, null)),
      format: Object.hasOwn(formats, data.format) ? data.format : defaults.render.format,
      crf: qualities.some(({ crf }) => crf === data.crf) ? data.crf : defaults.render.crf,
    });
    if (item.type === 'render' && !Array.isArray(data.sceneDurations)) {
      legacyLengths.set(node.id, range(data.duration, 0.1, maxSceneSeconds, defaultSceneSeconds));
    }
    if (item.type === 'video') node.data.loop = data.loop === true;
    if (item.type === 'background') node.data = readBackground(data);
    if (item.type === 'transition') Object.assign(node.data, {
      effect: Object.hasOwn(transitionEffects, data.effect) ? data.effect : defaults.transition.effect,
      seconds: range(data.seconds, 0.1, maxTransitionSeconds, defaults.transition.seconds),
      tuning: readTransitionTuning(data.tuning),
    });
    return node;
  });
  if (imageDataSize(nodes) > maxProjectImageData) throw new Error('A projekt háttérképei túl nagyok.');
  const edges = [];
  const nodeTypes = new Map(nodes.map(({ id, type }) => [id, type]));
  for (const item of value.edges) {
    if (!item) throw new Error('A projekt érvénytelen összekötést tartalmaz.');
    const isLegacyScene = item.targetHandle == null && nodeTypes.get(item.source) === 'text' && nodeTypes.get(item.target) === 'render';
    const connection = { source: item.source, target: item.target, targetHandle: isLegacyScene ? scenePorts[0].id : item.targetHandle ?? null };
    if (!canConnect(connection, nodes, edges)) throw new Error('A projekt érvénytelen összekötést tartalmaz.');
    edges.push({ ...connection, id: crypto.randomUUID(), type: edgeType });
  }
  for (const node of nodes) {
    if (!legacyLengths.has(node.id)) continue;
    const { fps, sceneDurations } = node.data;
    const minimum = framesFor(legacyLengths.get(node.id), fps);
    const lengths = renderSources(node.id, nodes, edges).inputs.map(({ text }) => text?.text.trim() ? framesFor(captionDuration(text), fps) : 0);
    const last = lengths.findLastIndex(Boolean);
    const hold = minimum - lengths.reduce((sum, frames) => sum + frames, 0);
    if (last === -1) sceneDurations[0] = minimum / fps;
    else lengths.forEach((length, index) => {
      if (length) sceneDurations[index] = (length + (index === last ? Math.max(0, hold) : 0)) / fps;
    });
  }
  const viewport = value.viewport ? {
    x: range(value.viewport.x, -150000, 150000, 0), y: range(value.viewport.y, -150000, 150000, 0),
    zoom: range(value.viewport.zoom, 0.22, 2, 1),
  } : undefined;
  return { name: typeof value.name === 'string' ? value.name.trim().slice(0, 64) || starter.name : starter.name, nodes, edges, viewport };
}

