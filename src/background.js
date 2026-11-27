import { defaultPattern, paintBackgroundPattern, readBackgroundPattern } from './background-patterns';

export const gradientShapes = { linear: 'Lineáris', radial: 'Radiális', lights: 'Fényfoltok' };
export const gradientMotion = { still: 'Statikus', rotate: 'Forgatás', drift: 'Sodródás', pulse: 'Pulzálás' };
export const imageFits = { cover: 'Kitöltés', contain: 'Teljes kép', stretch: 'Nyújtás' };
export const maxImageData = 4_200_000;
export const maxProjectImageData = 36_000_000;

const palette = (...colors) => colors.map((color, index) => ({ color, at: Math.round(index * 100 / (colors.length - 1)) }));
export const presets = [
  { label: 'Alkony', shape: 'linear', stops: palette('#211637', '#7a3d83', '#eeb1a6') },
  { label: 'Óceán', shape: 'radial', stops: palette('#79e3d1', '#208baa', '#142447') },
  { label: 'Északi fény', shape: 'lights', stops: palette('#101730', '#4dc5b5', '#5864d8', '#b876df') },
  { label: 'Réz', shape: 'linear', stops: palette('#2e1920', '#a95846', '#f1bd80') },
];

export const defaultGradient = { shape: 'linear', stops: presets[0].stops, angle: 31, scale: 100, motion: 'still', period: 6, intensity: 65 };
export const defaultBackground = { mode: 'gradient', gradient: defaultGradient, image: null, fit: 'cover', x: 50, y: 50, zoom: 100, opacity: 100, matte: '#111520' };

export const range = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(min, Math.min(max, value)) : fallback;
export const hexColor = (value, fallback) => typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value) ? value : fallback;

function readGradient(value = {}) {
  const gradient = value ?? {};
  return {
    shape: Object.hasOwn(gradientShapes, gradient.shape) ? gradient.shape : defaultGradient.shape,
    stops: Array.isArray(gradient.stops) && gradient.stops.length >= 2 && gradient.stops.length <= 5
      ? gradient.stops.map((stop, index) => ({ color: hexColor(stop?.color, '#808080'), at: range(stop?.at, 0, 100, Math.round(index * 100 / (gradient.stops.length - 1))) }))
      : defaultGradient.stops,
    angle: range(gradient.angle, 0, 359, defaultGradient.angle),
    scale: range(gradient.scale, 50, 160, defaultGradient.scale),
    motion: Object.hasOwn(gradientMotion, gradient.motion) ? gradient.motion : defaultGradient.motion,
    period: range(gradient.period, 0.5, 20, defaultGradient.period),
    intensity: range(gradient.intensity, 0, 100, defaultGradient.intensity),
  };
}

export function readBackground(value) {
  const image = value.image;
  if (image != null && (typeof image.src !== 'string' || image.src.length > maxImageData || !/^data:image\/(?:webp|png|jpeg);base64,[\w+/=]+$/.test(image.src))) {
    throw new Error('A projekt érvénytelen háttérképet tartalmaz.');
  }
  return {
    mode: value.mode === 'image' || value.mode === 'pattern' ? value.mode : 'gradient',
    gradient: readGradient(value.gradient),
    ...(value.mode === 'pattern' || value.pattern ? { pattern: readBackgroundPattern(value.pattern) } : {}),
    image: image ? { src: image.src, name: typeof image.name === 'string' ? image.name.slice(0, 120) : 'Háttérkép' } : null,
    fit: Object.hasOwn(imageFits, value.fit) ? value.fit : defaultBackground.fit,
    x: range(value.x, 0, 100, defaultBackground.x), y: range(value.y, 0, 100, defaultBackground.y),
    zoom: range(value.zoom, 100, 220, defaultBackground.zoom), opacity: range(value.opacity, 0, 100, defaultBackground.opacity),
    matte: hexColor(value.matte, defaultBackground.matte),
  };
}

export function loadImage(src) {
  const image = new Image();
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A kép nem nyitható meg. Válassz a böngésző által támogatott képfájlt.'));
    image.src = src;
  });
}

export async function prepareImage(file) {
  if (file.size > 25 * 1024 ** 2) throw new Error('A képfájl legfeljebb 25 MB lehet.');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    let scale = Math.min(1, 3840 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL('image/webp', 0.92);
      if (src.length <= maxImageData && src !== 'data:,') return { src, name: file.name.slice(0, 120) };
      scale *= 0.75;
    }
    throw new Error('A háttérképet nem sikerült menthető méretre alakítani.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const movingBackground = (background) => background?.mode === 'pattern'
  ? (background.pattern ?? defaultPattern).animated
  : background?.mode === 'gradient' && background.gradient.motion !== 'still';
export const usableBackground = (background) => background && (background.mode !== 'image' || Boolean(background.image));
export const backgroundImageSources = (backgrounds) => [...new Set(backgrounds.flatMap((background) =>
  background?.mode === 'image' && background.image ? [background.image.src] : []))];

export function paintBackground(ctx, width, height, background, image, time) {
  if (background.mode === 'pattern') {
    paintBackgroundPattern(ctx, width, height, background.pattern ?? defaultPattern, time);
    return;
  }
  if (background.mode === 'image') {
    ctx.fillStyle = background.matte;
    ctx.fillRect(0, 0, width, height);
    if (!image) return;
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const ratios = [width / iw, height / ih];
    const fit = background.fit === 'contain' ? Math.min(...ratios) : Math.max(...ratios);
    const zoom = background.zoom / 100;
    const w = (background.fit === 'stretch' ? width : iw * fit) * zoom;
    const h = (background.fit === 'stretch' ? height : ih * fit) * zoom;
    ctx.save();
    ctx.globalAlpha = background.opacity / 100;
    ctx.drawImage(image, (width - w) * background.x / 100, (height - h) * background.y / 100, w, h);
    ctx.restore();
    return;
  }

  const gradient = background.gradient;
  const phase = time / gradient.period * Math.PI * 2;
  const strength = gradient.intensity / 100;
  const rotate = gradient.motion === 'rotate' ? Math.sin(phase) * Math.PI * strength : 0;
  const drift = gradient.motion === 'drift' ? Math.sin(phase) * 0.23 * strength : 0;
  const lift = gradient.motion === 'drift' ? Math.sin(phase * 2) * 0.18 * strength : 0;
  const pulse = gradient.motion === 'pulse' ? 1 + Math.sin(phase) * 0.42 * strength : 1;
  const angle = gradient.angle * Math.PI / 180 + rotate;
  const scale = gradient.scale / 100 * pulse;
  const x = width * (0.5 + drift);
  const y = height * (0.5 + lift);
  const cx = Math.cos(angle);
  const cy = Math.sin(angle);

  if (gradient.shape === 'lights') {
    const [base, ...lights] = gradient.stops;
    ctx.fillStyle = base.color;
    ctx.fillRect(0, 0, width, height);
    lights.forEach((stop, index) => {
      const direction = angle + index * Math.PI * 2 / lights.length;
      const px = x + Math.cos(direction) * width * (0.26 + drift * (index % 2 ? 1 : -1));
      const py = y + Math.sin(direction) * height * 0.32;
      const radius = Math.hypot(width, height) * (0.22 + stop.at * 0.004) * scale;
      const spot = ctx.createRadialGradient(px, py, 0, px, py, radius);
      spot.addColorStop(0, stop.color);
      spot.addColorStop(0.36, `${stop.color}9c`);
      spot.addColorStop(1, `${stop.color}00`);
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, width, height);
    });
    return;
  }

  const reach = (Math.abs(width * cx) + Math.abs(height * cy)) / 2 * scale;
  const radialX = x + cx * width * 0.13;
  const radialY = y + cy * height * 0.15;
  const paint = gradient.shape === 'radial'
    ? ctx.createRadialGradient(radialX, radialY, 0, radialX, radialY, Math.hypot(width, height) * 0.53 * scale)
    : ctx.createLinearGradient(x - cx * reach, y - cy * reach, x + cx * reach, y + cy * reach);
  gradient.stops.forEach(({ color, at }) => paint.addColorStop(at / 100, color));
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, width, height);
}
