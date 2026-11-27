import { basePlacement, captionAnchors, captionSize, captionWeight, graphemeSegments } from './caption-format';
import { captionFontFamily } from './caption-fonts';

function groupGlyphs(glyphs, getKey) {
  const groups = [];
  for (const glyph of glyphs) {
    const key = getKey(glyph);
    const previous = groups.at(-1);
    if (previous?.key === key) previous.glyphs.push(glyph);
    else groups.push({ key, glyphs: [glyph] });
  }
  return groups;
}

function styledParagraphs(data, size) {
  const normal = { font: data.font, color: data.color, size, weight: captionWeight, italic: false };
  const runs = data.runs ?? [];
  const styleForRun = runs.map((run) => ({ ...normal, ...run, size: run.size ? run.size * size / captionSize.default : size }));
  let offset = 0;
  let runIndex = 0;
  const paragraphs = data.text.split('\n').map((line, index) => {
    const glyphs = Array.from(graphemeSegments(line), ({ segment, index }) => {
      const position = offset + index;
      while (runIndex < runs.length && runs[runIndex].end <= position) runIndex += 1;
      const style = runs[runIndex] && runs[runIndex].start <= position ? styleForRun[runIndex] : normal;
      return { letter: style.uppercase ? segment.toLocaleUpperCase('hu') : segment, style };
    });
    offset += line.length + 1;
    return { alignment: data.alignments?.[index], chunks: groupGlyphs(glyphs, (glyph) => /^\s+$/u.test(glyph.letter)) };
  });
  return { normal, paragraphs };
}

function fontString(style, scale) {
  return `${style.italic ? 'italic ' : ''}${style.weight} ${style.size * scale}px ${captionFontFamily(style.font)}`;
}

function lineMetrics(ctx, glyphs, normal, scale) {
  let width = 0;
  let ascent = 0;
  let descent = 0;
  let size = 0;
  const groups = glyphs.length ? groupGlyphs(glyphs, (glyph) => glyph.style) : [{ key: normal, glyphs: [] }];
  const parts = groups.map(({ key: style, glyphs }) => {
    ctx.font = fontString(style, scale);
    const text = glyphs.map(({ letter }) => letter).join('');
    const metrics = ctx.measureText(text || 'Ág');
    const fontSize = style.size * scale;
    const part = { at: width, text, glyphs, color: style.color, font: ctx.font };
    if (glyphs.length) width += metrics.width;
    ascent = Math.max(ascent, metrics.fontBoundingBoxAscent || fontSize * 0.82);
    descent = Math.max(descent, metrics.fontBoundingBoxDescent || fontSize * 0.23);
    size = Math.max(size, fontSize);
    return part;
  });
  return { width, ascent, height: ascent + descent + size * 0.08, size, parts };
}

function wrapParagraph(ctx, paragraph, normal, scale, maxWidth) {
  const lines = [];
  const measure = (glyphs) => lineMetrics(ctx, glyphs, normal, scale);
  let line = [];
  for (const { key: space, glyphs } of paragraph) {
    const next = [...line, ...glyphs];
    if (measure(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line.length) lines.push(measure(line));
    line = [];
    if (space) continue;
    if (measure(glyphs).width <= maxWidth) {
      line = glyphs;
      continue;
    }
    for (const glyph of glyphs) {
      if (line.length && measure([...line, glyph]).width > maxWidth) {
        lines.push(measure(line));
        line = [];
      }
      line.push(glyph);
    }
  }
  lines.push(measure(line));
  return lines;
}

const pulse = (distance, span) => Math.max(0, 1 - Math.abs(distance) / span) ** 2;

function spaceGlyphs(ctx, parts) {
  for (const part of parts) {
    ctx.font = part.font;
    const width = ctx.measureText(part.text).width;
    const widths = part.glyphs.map(({ letter }) => ctx.measureText(letter).width);
    const scale = width / (widths.reduce((sum, advance) => sum + advance, 0) || 1);
    let x = 0;
    part.advances = widths.map((advance) => {
      const center = x + advance * scale / 2;
      x += advance * scale;
      return center;
    });
  }
}

function justifyLine(line, width) {
  const glyphs = line.parts.flatMap((part) => part.glyphs);
  const first = glyphs.findIndex(({ letter }) => letter.trim());
  const last = glyphs.findLastIndex(({ letter }) => letter.trim());
  let index = 0;
  let gaps = 0;
  for (const part of line.parts) {
    part.spaces = part.glyphs.map(({ letter }) => {
      const before = gaps;
      if (first < index && index < last && !letter.trim()) gaps += 1;
      index += 1;
      return before;
    });
  }
  return gaps ? Math.max(0, width - line.width) / gaps : 0;
}

const alignOffset = { left: 0, center: 0.5, right: 1, justify: 0 };

function paintLine(ctx, line, offset, baseline, visible, fill) {
  for (const part of line.parts) {
    if (visible <= 0) break;
    ctx.font = part.font;
    ctx.fillStyle = fill ?? part.color;
    if (line.gap) {
      ctx.textAlign = 'center';
      for (let index = 0; index < Math.min(visible, part.glyphs.length); index += 1) {
        const x = offset + part.at + part.advances[index] + line.gap * part.spaces[index];
        ctx.fillText(part.glyphs[index].letter, x, baseline);
      }
      ctx.textAlign = 'left';
    } else {
      const text = visible >= part.glyphs.length ? part.text : part.glyphs.slice(0, visible).map(({ letter }) => letter).join('');
      if (text) ctx.fillText(text, offset + part.at, baseline);
    }
    visible -= part.glyphs.length;
  }
}

function shimmerHighlights(ctx, lines) {
  const letters = lines.flatMap((line) => line.parts.flatMap((part) =>
    part.glyphs.flatMap(({ letter }, index) => letter.trim() ? [{ line, part, index }] : [])));
  for (const time of [0.25, 0.5, 0.75]) {
    const spot = letters[Math.round((letters.length - 1) * time)];
    if (!spot) break;
    const { line, part, index } = spot;
    ctx.font = part.font;
    const glyph = ctx.measureText(part.glyphs[index].letter);
    const prefix = part.glyphs.slice(0, index + 1).map(({ letter }) => letter).join('');
    const center = line.gap ? part.advances[index] + line.gap * part.spaces[index]
      : ctx.measureText(prefix).width - glyph.width / 2;
    (line.highlights ??= []).push({ time, x: part.at + center, y: -glyph.actualBoundingBoxAscent * 0.78 });
  }
}

function paintGlint(ctx, x, y, size, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= opacity;
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  glow.addColorStop(0, '#eaf5ff');
  glow.addColorStop(0.3, '#badbff8c');
  glow.addColorStop(1, '#badbff00');
  ctx.fillStyle = glow;
  ctx.fillRect(-size, -size, size * 2, size * 2);
  ctx.fillStyle = '#fff';
  const core = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(core, -core);
  ctx.lineTo(size * 0.76, 0);
  ctx.lineTo(core, core);
  ctx.lineTo(0, size);
  ctx.lineTo(-core, core);
  ctx.lineTo(-size * 0.76, 0);
  ctx.lineTo(-core, -core);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function layoutCaption(ctx, data, width, height, scrolling = false, scrollFontScale = 1) {
  const baseSize = Math.min(width * 0.092, height * 0.158) * (scrolling ? 0.42 * scrollFontScale : 1);
  const { normal, paragraphs } = styledParagraphs(data, baseSize);
  let scale = 1;
  let lines;
  let blockHeight;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    lines = paragraphs.flatMap(({ chunks, alignment }) =>
      wrapParagraph(ctx, chunks, normal, scale, width * 0.82).map((line) => ({ ...line, alignment })));
    blockHeight = lines.reduce((sum, line) => sum + line.height, 0);
    if (scrolling || blockHeight <= height * 0.76) break;
    scale *= Math.min(0.83, (height * 0.76 / blockHeight) ** 0.75);
  }
  const maxWidth = lines.some(({ alignment }) => alignment) ? width * 0.82 : Math.max(...lines.map((line) => line.width));
  const fontSize = Math.max(...lines.map((line) => line.size));
  let count = 0;
  const wave = data.middle?.effect === 'wave';
  for (const line of lines) {
    line.start = count;
    line.glyphCount = line.parts.reduce((sum, part) => sum + part.glyphs.length, 0);
    count += line.glyphCount;
    if (line.alignment === 'justify') line.gap = justifyLine(line, maxWidth);
    line.renderWidth = line.gap ? maxWidth : line.width;
    if (wave || line.gap) spaceGlyphs(ctx, line.parts);
  }
  if (data.middle?.effect === 'shimmer') shimmerHighlights(ctx, lines);
  const placement = data.placement ?? basePlacement;
  const { align, vertical } = captionAnchors[placement.anchor];
  const x = width * (0.5 + align * 0.42 + placement.x / 100);
  const y = height * (0.5 + vertical * 0.4 + placement.y / 100);
  const top = -blockHeight * (vertical + 1) / 2;
  const left = -maxWidth * (align + 1) / 2;
  const pad = fontSize * 0.16;
  const pivot = [left + maxWidth / 2, top + blockHeight / 2];
  const tilt = (placement.tilt ?? 0) * Math.PI / 180;
  const foreshorten = Math.cos(tilt);
  const rotation = placement.rotation * Math.PI / 180;
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  const viewportY = [0, width].flatMap((screenX) => [0, height].map((screenY) =>
    -(screenX - x - pivot[0]) * sin + (screenY - y - pivot[1]) * cos));
  const visibleTop = Math.min(...viewportY) - fontSize * 2;
  const visibleBottom = Math.max(...viewportY) + fontSize * 2;
  const travelDepth = scrolling ? (Math.max(Math.abs(visibleTop), Math.abs(visibleBottom)) + fontSize) * Math.abs(Math.tan(tilt)) * 1.3 : 0;
  const depth = Math.max(height * 0.8, blockHeight * 0.9, travelDepth);
  const perspective = Math.sin(tilt) / depth;
  const projectY = (delta) => delta * foreshorten / (1 + delta * perspective);
  const toPlaneY = (screenY) => screenY / (foreshorten - screenY * perspective);
  const planeTop = toPlaneY(visibleTop);
  const planeBottom = toPlaneY(visibleBottom);
  const corners = [top - pad, top + blockHeight + pad].flatMap((at) => {
    const dy = at - pivot[1];
    const distance = 1 + dy * perspective;
    return [-maxWidth / 2 - pad, maxWidth / 2 + pad].map((dx) => [dx / distance, dy * foreshorten / distance]);
  });
  const projectedX = corners.map(([dx]) => pivot[0] + dx);
  const projectedY = corners.map(([, dy]) => pivot[1] + dy);
  const minX = Math.min(...projectedX);
  const minY = Math.min(...projectedY);
  let lensCanvas;

  function paintLens(line, offset, baseline, visible, center, radius, amount) {
    const pad = line.size * 0.45;
    const start = Math.floor(Math.max(center - radius, offset - pad));
    const end = Math.ceil(Math.min(center + radius, offset + line.renderWidth + pad));
    // Capture the shaped line only in the affected band, then stretch it around the moving focus.
    lensCanvas ??= document.createElement('canvas');
    const height = Math.ceil(line.height + pad * 2);
    if (lensCanvas.width !== end - start) lensCanvas.width = end - start;
    if (lensCanvas.height !== height) lensCanvas.height = height;
    const lensContext = lensCanvas.getContext('2d');
    lensContext.clearRect(0, 0, lensCanvas.width, height);
    lensContext.textAlign = 'left';
    lensContext.textBaseline = 'alphabetic';
    const sourceBaseline = line.ascent + pad;
    paintLine(lensContext, line, offset - start, sourceBaseline, visible);

    const top = baseline - sourceBaseline * (1 + amount);
    const paintedHeight = height * (1 + amount);
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.min(offset - pad, start), top, Math.max(0, start - offset + pad), paintedHeight);
    ctx.rect(end, top, Math.max(0, offset + line.renderWidth + pad - end), paintedHeight);
    ctx.clip();
    paintLine(ctx, line, offset, baseline, visible);
    ctx.restore();

    const stretch = (x) => {
      const relative = x - center;
      return x + relative * amount * Math.max(0, 1 - Math.abs(relative) / radius) ** 3;
    };
    const step = Math.max(1, Math.ceil((end - start) / 42));
    for (let x = start; x < end; x += step) {
      const next = Math.min(x + step, end);
      const enlarged = 1 + amount * pulse((x + next) / 2 - center, radius);
      ctx.drawImage(lensCanvas, x - start, 0, next - x, lensCanvas.height,
        stretch(x), baseline - sourceBaseline * enlarged, stretch(next) - stretch(x), lensCanvas.height * enlarged);
    }
  }

  function paintWave(line, offset, baseline, visible, motion, intensity, envelope, cycles) {
    let glyphIndex = line.start;
    ctx.textAlign = 'center';
    for (const part of line.parts) {
      if (visible <= 0) break;
      ctx.font = part.font;
      ctx.fillStyle = part.color;
      for (let index = 0; index < Math.min(visible, part.glyphs.length); index += 1) {
        const x = offset + part.at + part.advances[index] + (line.gap ? line.gap * part.spaces[index] : 0);
        const y = Math.sin(glyphIndex * 0.55 - motion * Math.PI * 2 * cycles) * line.size * 0.23 * envelope * intensity;
        ctx.fillText(part.glyphs[index].letter, x, baseline + y);
        glyphIndex += 1;
      }
      visible -= part.glyphs.length;
    }
    ctx.textAlign = 'left';
  }

  function paintShimmer(line, offset, baseline, visible, center, radius, intensity, envelope, motion) {
    if (center + radius > offset && center - radius < offset + line.renderWidth) {
      const lean = radius * 0.16;
      const band = ctx.createLinearGradient(center - radius, baseline - lean, center + radius, baseline + lean);
      const brightness = Math.min(0.94, intensity * envelope * 0.77);
      band.addColorStop(0, '#d8ebff00');
      band.addColorStop(0.5, `rgba(216, 235, 255, ${brightness})`);
      band.addColorStop(1, '#d8ebff00');
      ctx.save();
      ctx.shadowColor = '#a6cdff';
      ctx.shadowBlur = line.size * 0.24;
      paintLine(ctx, line, offset, baseline, visible, band);
      ctx.restore();
    }
    for (const { time, x, y } of line.highlights ?? []) {
      const flash = pulse(motion - time, 0.075);
      if (flash <= 0) continue;
      const size = line.size * (0.12 + 0.11 * Math.sqrt(flash));
      paintGlint(ctx, offset + x, baseline + y, size, Math.min(1, flash * intensity * 1.15));
    }
  }

  return {
    x, y, rotation, fontSize,
    pivot,
    wipe: [minX, minY, Math.max(...projectedX) - minX, Math.max(...projectedY) - minY],
    roll(progress, mode, intensity) {
      const first = top - pivot[1];
      const last = first + blockHeight;
      const padding = (intensity - 1) * fontSize;
      const from = mode === 'out' ? projectY(last) : visibleBottom + padding;
      const to = mode === 'in' ? projectY(first) : visibleTop - padding;
      // Follow the visible part of the list across the frame while moving every line in the same tilted plane.
      const reference = mode === 'in' ? first : mode === 'out' ? last : first + blockHeight * progress;
      return toPlaneY(from + (to - from) * progress) - reference;
    },
    draw(progress, middle, motion, options, scrollOffset = 0) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      let visible = data.effect === 'type' ? Math.floor(progress * count) : count;
      let lineTop = top;
      const envelope = Math.sin(Math.PI * motion) ** 0.7;
      const intensity = (options?.intensity ?? 100) / 100;
      const span = options?.detail ?? 4;
      const travel = motion * (count + 2 * span) - span;
      for (const [index, line] of lines.entries()) {
        if (visible <= 0) return;
        const baseline = lineTop + line.ascent;
        const delta = baseline + scrollOffset - pivot[1];
        const distance = 1 + delta * perspective;
        const projected = pivot[1] + delta * foreshorten / distance;
        lineTop += line.height;
        if (scrolling && (distance <= 0 || delta + line.height < planeTop || delta - line.height > planeBottom)) {
          visible -= line.glyphCount;
          continue;
        }
        ctx.save();
        if (tilt || scrollOffset) {
          ctx.translate(pivot[0], projected);
          ctx.scale(1 / distance, foreshorten / (distance * distance));
          ctx.translate(-pivot[0], -baseline);
        }
        if (middle === 'lines') {
          const strength = pulse(index - (motion * (lines.length + 1) - 0.5), options.detail / 100) * envelope * intensity;
          ctx.shadowColor = '#83baff';
          ctx.shadowBlur = line.size * 0.42 * strength;
          ctx.scale(1 + 0.10 * strength, 1);
        }
        const offset = left + (maxWidth - line.width) * (alignOffset[line.alignment] ?? (align + 1) / 2);
        const advance = line.renderWidth / Math.max(1, line.glyphCount);
        const center = offset + (travel - line.start + 0.5) * advance;
        const radius = span * advance;
        const withinLens = middle === 'lens' && envelope > 0.001 && radius >= 1
          && center + radius > offset && center - radius < offset + line.renderWidth;
        if (withinLens) paintLens(line, offset, baseline, visible, center, radius, intensity * envelope * 0.55);
        else if (middle === 'wave') paintWave(line, offset, baseline, visible, motion, intensity, envelope, span);
        else paintLine(ctx, line, offset, baseline, visible);
        if (middle === 'shimmer' && radius > 0) paintShimmer(line, offset, baseline, visible, center, radius, intensity, envelope, motion);
        visible -= line.glyphCount;
        ctx.restore();
      }
    },
  };
}
