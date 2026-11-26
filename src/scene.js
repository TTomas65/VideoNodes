import { movingBackground, paintBackground, usableBackground } from './background';
import { sceneAt, sceneTime } from './timeline';
import { drawTransition } from './transitions';

const segmenter = new Intl.Segmenter('hu', { granularity: 'grapheme' });
const graphemes = (text) => Array.from(segmenter.segment(text), ({ segment }) => segment);
const ease = (value) => 1 - (1 - value) ** 3;

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      line = '';
      for (const char of graphemes(word)) {
        if (line && ctx.measureText(line + char).width > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

function prepareBackdrop(canvas, background, image) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  if (!usableBackground(background)) return () => {
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
  };
  if (movingBackground(background)) return (time) => paintBackground(context, width, height, background, image, time);
  const backdrop = document.createElement('canvas');
  backdrop.width = width;
  backdrop.height = height;
  const bg = backdrop.getContext('2d');
  paintBackground(bg, width, height, background, image, 0);

  return () => context.drawImage(backdrop, 0, 0);
}

function prepareText(canvas, text) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');

  const family = text.font === 'Inter' ? '"Inter Variable", sans-serif' : `"${text.font}", sans-serif`;
  const font = (size) => `650 ${size}px ${family}`;
  let size = Math.min(width * 0.092, height * 0.158);
  let lines;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    context.font = font(size);
    lines = wrap(context, text.text.trim(), width * 0.82);
    if (lines.length * size * 1.15 <= height * 0.76) break;
    size *= 0.83;
  }
  const clusters = text.effect === 'type' ? lines.map(graphemes) : [];
  const count = clusters.reduce((sum, line) => sum + line.length, 0);
  const lineHeight = size * 1.15;

  return (time) => {
    const progress = Math.max(0, Math.min(1, time / text.seconds));
    const remaining = 1 - ease(progress);
    context.save();
    context.translate(width / 2, height / 2);
    switch (text.effect) {
      case 'slide':
        context.translate(-width * 0.34 * remaining, 0);
        context.globalAlpha = 1 - remaining;
        break;
      case 'fog':
        context.filter = `blur(${size * 0.37 * remaining}px)`;
        context.globalAlpha = progress ** 1.3;
        break;
      case 'bounce':
        context.translate(0, -height * 0.43 * Math.abs(Math.cos(progress * Math.PI * 2.5)) * (1 - progress) ** 1.55);
        context.globalAlpha = Math.min(1, progress * 5);
        break;
      case 'fade':
        context.globalAlpha = progress ** 2 * (3 - 2 * progress);
        break;
      case 'zoom': {
        const scale = 1 - 0.48 * remaining;
        context.scale(scale, scale);
        context.globalAlpha = 1 - remaining;
        break;
      }
      case 'wipe':
        context.beginPath();
        context.rect(-width * 0.415, -height / 2, width * 0.83 * ease(progress), height);
        context.clip();
        break;
    }
    context.font = font(size);
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = text.color;
    let visible = Math.floor(progress * count);
    lines.forEach((line, index) => {
      const fragment = text.effect === 'type' ? clusters[index].slice(0, Math.max(0, visible)).join('') : line;
      if (text.effect === 'type') visible -= clusters[index].length;
      context.fillText(fragment, -context.measureText(line).width / 2, (index - (lines.length - 1) / 2) * lineHeight);
    });
    context.restore();
  };
}

export function makeScene(canvas, text, background, image) {
  const drawBackground = prepareBackdrop(canvas, background, image);
  const drawText = text?.text.trim() ? prepareText(canvas, text) : null;
  return (time) => {
    drawBackground(time);
    drawText?.(time);
  };
}

function makeTimelinePainter(canvas, timeline, images) {
  const titles = timeline.scenes.map(({ text }) => text ? prepareText(canvas, text) : null);
  let activeBackground;
  let drawBackground;
  return (index, time) => {
    const scene = timeline.scenes[index];
    if (!drawBackground || activeBackground !== scene.background) {
      activeBackground = scene.background;
      drawBackground = prepareBackdrop(canvas, activeBackground, images.get(activeBackground?.image?.src));
    }
    drawBackground(Math.max(0, time - scene.backgroundStart / timeline.fps));
    if (titles[index]) titles[index](sceneTime(scene, timeline.fps, time));
  };
}

export function makeTimelineScene(canvas, timeline, images) {
  const draw = makeTimelinePainter(canvas, timeline, images);
  const context = canvas.getContext('2d');
  let layers;
  return (time) => {
    const index = sceneAt(timeline, time);
    const scene = timeline.scenes[index];
    if (!scene) return;
    const frame = time * timeline.fps;
    const transition = scene.transition;
    if (!transition || frame + 1e-7 < transition.start) {
      draw(index, time);
      return;
    }
    layers ??= [index, index + 1].map(() => {
      const layer = document.createElement('canvas');
      Object.assign(layer, { width: canvas.width, height: canvas.height });
      return { canvas: layer, draw: makeTimelinePainter(layer, timeline, images) };
    });
    const [outgoing, incoming] = layers;
    outgoing.draw(index, time);
    incoming.draw(index + 1, time);
    drawTransition(context, transition.effect, outgoing.canvas, incoming.canvas,
      (frame - transition.start) / (transition.end - transition.start));
  };
}
