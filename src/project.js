export const effects = {
  slide: 'Beúsztatás', fog: 'Ködből előtűnés', bounce: 'Bepattogás',
  fade: 'Halványból éles', zoom: 'Közelítés', type: 'Írógép', wipe: 'Sávos felfedés',
};

export const fonts = ['Inter', 'Arial', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS'];
export const resolutions = {
  '1280x720': { label: 'HD', width: 1280, height: 720 },
  '1920x1080': { label: 'Full HD', width: 1920, height: 1080 },
  '1080x1920': { label: 'Álló', width: 1080, height: 1920 },
  '1080x1080': { label: 'Négyzetes', width: 1080, height: 1080 },
};
export const defaults = {
  text: { text: 'A történet\nitt kezdődik.', font: 'Inter', color: '#f2f3fa', effect: 'slide', seconds: 1.2 },
  render: { resolution: '1920x1080', fps: 30, duration: 4, background: '#111520', style: 'ribbons' },
  video: {},
};

export const label = { text: 'Szöveg', render: 'FFmpeg render', video: 'Videólejátszó' };
export const edgeType = 'signal';
export const storageKey = 'present-fflow-v1';

export const makeNode = (type, position, id = crypto.randomUUID()) => ({
  id, type, position, data: { ...defaults[type] }, dragHandle: '.node-header',
});

export const example = {
  name: 'Nyitó animáció',
  nodes: [makeNode('text', { x: 0, y: 0 }, 'text-1'), makeNode('render', { x: 306, y: 51 }, 'render-1'), makeNode('video', { x: 612, y: 24 }, 'video-1')],
  edges: [
    { id: 'edge-1', source: 'text-1', target: 'render-1', type: edgeType },
    { id: 'edge-2', source: 'render-1', target: 'video-1', type: edgeType },
  ],
};

export function canConnect({ source, target }, nodes, edges) {
  const from = nodes.find((node) => node.id === source);
  const to = nodes.find((node) => node.id === target);
  if (!from || !to || edges.some((edge) => edge.target === target)) return false;
  return (from.type === 'text' && to.type === 'render') || (from.type === 'render' && to.type === 'video');
}

export const upstream = (target, nodes, edges) => nodes.find((node) => node.id === edges.find((edge) => edge.target === target)?.source);

export function serialize(name, nodes, edges, viewport) {
  return { version: 1, name, viewport, nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: edges.map(({ id, source, target }) => ({ id, source, target })) };
}

const clamp = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(min, Math.min(max, value)) : fallback;
const color = (value, fallback) => /^#[a-f\d]{6}$/i.test(value ?? '') ? value : fallback;

export function readProject(value) {
  if (value?.version !== 1 || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || value.nodes.length > 100) {
    throw new Error('A fájl nem érvényes Present Fflow projekt.');
  }
  const ids = new Set();
  const nodes = value.nodes.map((item) => {
    if (!item || !Object.hasOwn(defaults, item.type) || typeof item.id !== 'string' || !item.id || ids.has(item.id)) {
      throw new Error('A projekt hibás vagy ismétlődő kártyát tartalmaz.');
    }
    ids.add(item.id);
    const node = makeNode(item.type, {
      x: clamp(item.position?.x, -50000, 50000, 0), y: clamp(item.position?.y, -50000, 50000, 0),
    }, item.id);
    const data = item.data ?? {};
    if (item.type === 'text') Object.assign(node.data, {
      text: typeof data.text === 'string' ? data.text.slice(0, 360) : defaults.text.text,
      font: fonts.includes(data.font) ? data.font : defaults.text.font,
      color: color(data.color, defaults.text.color),
      effect: Object.hasOwn(effects, data.effect) ? data.effect : defaults.text.effect,
      seconds: clamp(data.seconds, 0.1, 10, defaults.text.seconds),
    });
    if (item.type === 'render') Object.assign(node.data, {
      resolution: Object.hasOwn(resolutions, data.resolution) ? data.resolution : defaults.render.resolution,
      fps: [24, 25, 30, 60].includes(data.fps) ? data.fps : defaults.render.fps,
      duration: clamp(data.duration, 0.1, 20, defaults.render.duration),
      background: color(data.background, defaults.render.background),
      style: data.style === 'solid' ? 'solid' : defaults.render.style,
    });
    return node;
  });
  const edges = [];
  for (const item of value.edges) {
    if (!item || !canConnect(item, nodes, edges)) throw new Error('A projekt érvénytelen összekötést tartalmaz.');
    edges.push({ id: crypto.randomUUID(), source: item.source, target: item.target, type: edgeType });
  }
  const viewport = value.viewport ? {
    x: clamp(value.viewport.x, -150000, 150000, 0), y: clamp(value.viewport.y, -150000, 150000, 0),
    zoom: clamp(value.viewport.zoom, 0.22, 2, 1),
  } : undefined;
  return { name: typeof value.name === 'string' ? value.name.trim().slice(0, 64) || example.name : example.name, nodes, edges, viewport };
}

export function getInitialProject() {
  try {
    const data = localStorage.getItem(storageKey);
    if (data) return { ...readProject(JSON.parse(data)), saved: true };
  } catch { /* If storage is disabled or corrupt, open the sample. */ }
  return example;
}
