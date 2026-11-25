import { movingBackground, paintBackground } from './background';

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

export function makeScene(canvas, text, settings, background, image) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  const backdrop = document.createElement('canvas');
  backdrop.width = width;
  backdrop.height = height;
  const bg = backdrop.getContext('2d');
  const moving = movingBackground(background);
  if (background) {
    if (!moving) paintBackground(bg, width, height, background, image, 0);
  } else {
    bg.fillStyle = settings.background;
    bg.fillRect(0, 0, width, height);
  }

  if (!background && settings.style === 'ribbons') {
    const gradient = bg.createRadialGradient(width * 0.87, height * 1.04, 0, width * 0.87, height * 1.04, Math.max(width, height) * 0.84);
    gradient.addColorStop(0, '#526d9dbb');
    gradient.addColorStop(0.38, '#3445758f');
    gradient.addColorStop(1, '#080b1600');
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, width, height);
    for (let line = 0; line < 12; line += 1) {
      const offset = line * height * 0.024;
      bg.strokeStyle = `rgba(157, 184, 235, ${0.13 - line * 0.006})`;
      bg.lineWidth = Math.max(0.7, height / 720);
      bg.beginPath();
      bg.moveTo(-width * 0.13, height * 1.13 - offset);
      bg.bezierCurveTo(width * 0.39, height * 1.24 - offset, width * 0.65, height * 0.4 - offset * 0.48, width * 1.14, height * 0.45 - offset);
      bg.stroke();
    }
  }

  const drawBackground = moving
    ? (time) => paintBackground(context, width, height, background, image, time)
    : () => context.drawImage(backdrop, 0, 0);
  if (!text || !text.text.trim()) return drawBackground;

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
    drawBackground(time);
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
