import { basePlacement, captionAnchors, captionFontFamily, captionSize, captionWeight, graphemeSegments } from './caption-format';

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
  const paragraphs = data.text.split('\n').map((line) => {
    const glyphs = Array.from(graphemeSegments(line), ({ segment, index }) => {
      const position = offset + index;
      while (runIndex < runs.length && runs[runIndex].end <= position) runIndex += 1;
      const style = runs[runIndex] && runs[runIndex].start <= position ? styleForRun[runIndex] : normal;
      return { letter: style.uppercase ? segment.toLocaleUpperCase('hu') : segment, style };
    });
    offset += line.length + 1;
    return groupGlyphs(glyphs, (glyph) => /^\s+$/u.test(glyph.letter));
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

export function layoutCaption(ctx, data, width, height) {
  const baseSize = Math.min(width * 0.092, height * 0.158);
  const { normal, paragraphs } = styledParagraphs(data, baseSize);
  let scale = 1;
  let lines;
  let blockHeight;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    lines = paragraphs.flatMap((paragraph) => wrapParagraph(ctx, paragraph, normal, scale, width * 0.82));
    blockHeight = lines.reduce((sum, line) => sum + line.height, 0);
    if (blockHeight <= height * 0.76) break;
    scale *= 0.83;
  }
  const maxWidth = Math.max(...lines.map((line) => line.width));
  const fontSize = Math.max(...lines.map((line) => line.size));
  const count = lines.reduce((sum, line) => sum + line.parts.reduce((partSum, part) => partSum + part.glyphs.length, 0), 0);
  const placement = data.placement ?? basePlacement;
  const { align, vertical } = captionAnchors[placement.anchor];
  const x = width * (0.5 + align * 0.42 + placement.x / 100);
  const y = height * (0.5 + vertical * 0.4 + placement.y / 100);
  const top = -blockHeight * (vertical + 1) / 2;
  const left = -maxWidth * (align + 1) / 2;
  const pad = fontSize * 0.16;

  return {
    x, y, rotation: placement.rotation * Math.PI / 180, fontSize,
    pivot: [left + maxWidth / 2, top + blockHeight / 2],
    wipe: [left - pad, top - pad, maxWidth + pad * 2, blockHeight + pad * 2],
    draw(progress) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      let visible = data.effect === 'type' ? Math.floor(progress * count) : count;
      let lineTop = top;
      for (const line of lines) {
        const offset = -line.width * (align + 1) / 2;
        for (const part of line.parts) {
          if (visible <= 0) return;
          ctx.font = part.font;
          ctx.fillStyle = part.color;
          const text = visible >= part.glyphs.length ? part.text : part.glyphs.slice(0, visible).map(({ letter }) => letter).join('');
          if (text) ctx.fillText(text, offset + part.at, lineTop + line.ascent);
          visible -= part.glyphs.length;
        }
        lineTop += line.height;
      }
    },
  };
}
