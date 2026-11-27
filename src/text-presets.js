import { defaultBackground, range } from './background';
import { loadCaptionFonts } from './caption-fonts';
import { graphemeSegments, readTextRuns } from './caption-format';
import { inkFor } from './palette';
import { cardWidths, defaults, maxCardWidth, minCardWidths, readTextSettings } from './project';
import { makeScene } from './scene';

const api = `${import.meta.env.BASE_URL}api/text-presets`;
const requestHeaders = { 'Content-Type': 'application/json' };

async function request(path = '', options) {
  const response = await fetch(api + path, options);
  const data = await response.json().catch(() => null);
  if (!data) throw new Error('A sablonmappa a VideoNodes helyi szerverén érhető el.');
  if (!response.ok) throw new Error(data.error ?? 'A sablonmappa művelete sikertelen.');
  return data;
}

export const presetPreviewUrl = (id) => `${api}/${id}/preview.jpg`;

export async function listTextPresets(signal) {
  const data = await request('', { signal });
  if (data.localPresets !== true || !Array.isArray(data.entries)) throw new Error('A helyi sablonmappa nem olvasható.');
  return data.entries;
}

export async function openTextPreset(id) {
  const preset = await request(`/${id}/preset.json`);
  if (preset.version !== 1 || !['style', 'card'].includes(preset.kind) || typeof preset.caption?.text !== 'string') {
    throw new Error('Ez a fájl nem érvényes szövegsablon.');
  }
  return { ...preset, caption: readTextSettings(preset.caption),
    width: range(preset.width, minCardWidths.text, maxCardWidth, cardWidths.text) };
}

export const setTextPresetHidden = (id, hidden) => request(`/${id}/visibility`, {
  method: 'PATCH', headers: requestHeaders, body: JSON.stringify({ hidden }),
});

async function capturePreset(caption) {
  const canvas = document.createElement('canvas');
  Object.assign(canvas, { width: 480, height: 270 });
  const text = {
    ...caption, text: caption.text.trim() ? caption.text : defaults.text.text,
    effect: 'fade', seconds: 1, middle: undefined, exit: undefined, motionTuning: undefined,
  };
  const palette = inkFor(text.color) === '#fff' ? ['#eff3fa', '#b9c7d9'] : ['#161e2e', '#38465c'];
  const backdrop = {
    ...defaultBackground,
    gradient: { ...defaultBackground.gradient, angle: 25, stops: palette.map((color, index) => ({ color, at: index * 100 })) },
  };
  await loadCaptionFonts([text]);
  makeScene(canvas, text, backdrop)(1);
  return canvas.toDataURL('image/jpeg', 0.88);
}

export async function saveTextPreset(name, kind, caption, width) {
  const normalized = readTextSettings(caption);
  const { text, font, color, runs, alignments, placement } = normalized;
  const preset = { version: 1, name: name.trim().slice(0, 64), kind,
    caption: kind === 'card' ? normalized : { text, font, color, runs, alignments, placement },
    ...(kind === 'card' && { width }),
  };
  const preview = await capturePreset(normalized);
  return request('', {
    method: 'POST', headers: requestHeaders, body: JSON.stringify({ id: crypto.randomUUID(), preset, preview }),
  });
}

function linesOf(text) {
  let offset = 0;
  return text.split('\n').map((line) => {
    const stops = Array.from(graphemeSegments(line), ({ index }) => offset + index);
    stops.push(offset + line.length);
    offset += line.length + 1;
    return stops;
  });
}

function styleAt(runs, offset) {
  let low = 0;
  let high = runs.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (runs[middle].end <= offset) low = middle + 1;
    else high = middle;
  }
  return runs[low]?.start <= offset ? runs[low] : undefined;
}

export function applyStylePreset(sample, current) {
  const text = current.text.trim() ? current.text : sample.text;
  const settings = { ...current, text, font: sample.font, color: sample.color, placement: sample.placement };
  if (text === sample.text) return { ...settings, runs: sample.runs, alignments: sample.alignments };

  const source = linesOf(sample.text);
  const runs = [];
  const alignments = {};
  for (const [row, stops] of linesOf(text).entries()) {
    const index = Math.min(row, source.length - 1);
    const from = source[index];
    const alignment = sample.alignments?.[index];
    if (alignment) alignments[row] = alignment;
    if (from.length < 2 || !sample.runs?.length) continue;
    const count = stops.length - 1;
    for (let glyph = 0; glyph < count; glyph += 1) {
      const start = Math.floor((glyph + 0.5) * (from.length - 1) / count);
      const style = styleAt(sample.runs, from[start]);
      if (style) runs.push({ ...style, start: stops[glyph], end: stops[glyph + 1] });
    }
  }
  return { ...settings, runs: readTextRuns(runs, text.length), alignments };
}
