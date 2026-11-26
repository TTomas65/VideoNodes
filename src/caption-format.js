import { hexColor, range } from './background';
import { readCaptionFont } from './caption-fonts';

export const maxCaptionLength = 20000;
export const captionSize = { min: 20, max: 320, default: 171 };
export const captionWeight = 650;
export const basePlacement = { anchor: 'center', x: 0, y: 0, rotation: 0 };
export const offsetLimit = 40;
export const rotationLimit = 380;
export const tiltLimit = 80;
export const captionAlignments = { left: 'Balra igazítás', center: 'Középre igazítás', right: 'Jobbra igazítás', justify: 'Sorkitöltés' };

export const readAlignment = (value) => Object.hasOwn(captionAlignments, value) ? value : null;

export function readCaptionAlignments(value, lineCount) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([index, align]) =>
    /^(0|[1-9]\d*)$/.test(index) && Number(index) < lineCount && readAlignment(align)));
}

export function rebaseCaptionAlignments(previous, next, alignments) {
  if (!alignments || previous === next) return alignments;
  const before = previous.split('\n');
  const after = next.split('\n');
  let start = 0;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (start < Math.min(oldEnd, newEnd) && before[start] === after[start]) start += 1;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  return Object.fromEntries(after.flatMap((_, index) => {
    const source = index < start ? index : index >= newEnd ? oldEnd + index - newEnd : Math.min(index, oldEnd - 1);
    const align = alignments[source];
    return align ? [[index, align]] : [];
  }));
}

export const captionAnchors = {
  'top-left': { label: 'Bal felső', align: -1, vertical: -1 },
  top: { label: 'Felül középen', align: 0, vertical: -1 },
  'top-right': { label: 'Jobb felső', align: 1, vertical: -1 },
  left: { label: 'Bal közép', align: -1, vertical: 0 },
  center: { label: 'Középen', align: 0, vertical: 0 },
  right: { label: 'Jobb közép', align: 1, vertical: 0 },
  'bottom-left': { label: 'Bal alsó', align: -1, vertical: 1 },
  bottom: { label: 'Alul középen', align: 0, vertical: 1 },
  'bottom-right': { label: 'Jobb alsó', align: 1, vertical: 1 },
};

const segmenter = new Intl.Segmenter('hu', { granularity: 'grapheme' });
export const graphemeSegments = (text) => segmenter.segment(text);

export function readRunStyle(value) {
  const style = {};
  if (!value || typeof value !== 'object') return style;
  const font = readCaptionFont(value.font);
  if (font) style.font = font;
  const color = hexColor(value.color, null);
  if (color) style.color = color;
  if (Number.isFinite(value.size)) style.size = Math.round(range(value.size, captionSize.min, captionSize.max, captionSize.default));
  if (Number.isFinite(value.weight)) style.weight = Math.round(range(value.weight, 400, 900, captionWeight));
  if (value.italic === true) style.italic = true;
  if (value.uppercase === true) style.uppercase = true;
  return style;
}

function sameStyle(first, second) {
  return ['font', 'color', 'size', 'weight', 'italic', 'uppercase'].every((key) => first[key] === second[key]);
}

export function readTextRuns(value, length) {
  if (!Array.isArray(value) || !length) return [];
  const runs = [];
  const candidates = value.slice(0, maxCaptionLength * 2)
    .filter((item) => Number.isInteger(item?.start) && Number.isInteger(item.end))
    .sort((a, b) => a.start - b.start);
  for (const item of candidates) {
    const previous = runs.at(-1);
    const start = Math.max(0, item.start, previous?.end ?? 0);
    const end = Math.min(length, item.end);
    const style = readRunStyle(item);
    if (start >= end || !Object.keys(style).length) continue;
    if (previous?.end === start && sameStyle(previous, style)) previous.end = end;
    else runs.push({ start, end, ...style });
  }
  return runs;
}

export function readPlacement(value) {
  if (!value) return null;
  const anchor = Object.hasOwn(captionAnchors, value.anchor) ? value.anchor : basePlacement.anchor;
  const x = range(value.x, -offsetLimit, offsetLimit, 0);
  const y = range(value.y, -offsetLimit, offsetLimit, 0);
  const rotation = range(value.rotation, -rotationLimit, rotationLimit, 0);
  const tilt = range(value.tilt, -tiltLimit, tiltLimit, 0);
  return anchor === basePlacement.anchor && x === 0 && y === 0 && rotation === 0 && !tilt
    ? null : { anchor, x, y, rotation, ...(tilt && { tilt }) };
}

export function rebaseTextRuns(previous, next, runs) {
  if (!runs?.length || previous === next) return runs;
  let start = 0;
  const common = Math.min(previous.length, next.length);
  while (start < common && previous[start] === next[start]) start += 1;
  let oldEnd = previous.length;
  let newEnd = next.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const delta = newEnd - oldEnd;
  const updated = [];
  for (const run of runs) {
    if (run.start < start) updated.push({ ...run, end: Math.min(run.end, start) });
    if (run.end > oldEnd) updated.push({ ...run, start: Math.max(run.start, oldEnd) + delta, end: run.end + delta });
  }
  const inherited = runs.find((run) => run.start <= start && start < run.end)
    ?? runs.find((run) => run.start < start && start === run.end);
  if (inherited && newEnd > start) updated.push({ ...inherited, start, end: newEnd });
  return readTextRuns(updated, next.length);
}
