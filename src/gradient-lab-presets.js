import { gradientLabFragment, gradientLabUniforms, renderGradientLabFallback } from './gradient-lab';
import { newGradientLabPatterns, newGradientLabStyles } from './gradient-lab-library';

const number = (key, label, initial, min, max, step, unit = '') => ({ key, label, initial, min, max, step, unit });
const groups = [
  { label: 'Mozgás', fields: [
    { key: 'animated', label: 'Lejátszási mód', initial: true, type: 'motion' },
    number('speed', 'Sebesség', 0.55, 0.05, 3, 0.05, '×'),
    number('phase', 'Kezdőfázis', 136.345, 0, 1200, 0.001),
  ] },
  { label: 'Forma', fields: [
    number('scale', 'Minta léptéke', 1.2, 0.2, 4, 0.05),
    number('warp', 'Minta torzítása', 1.6, 0, 4, 0.05),
    number('rotation', 'Elforgatás', 0, -180, 180, 1, '°'),
    { key: 'flipX', label: 'Vízszintes tükrözés', initial: false, type: 'toggle' },
    { key: 'flipY', label: 'Függőleges tükrözés', initial: false, type: 'toggle' },
    number('seed', 'Mintamag', 9.4, 0, 100, 0.1),
  ] },
  { label: 'Fénytörés', toggle: 'refraction', fields: [
    { key: 'refraction', label: 'Fénytörés bekapcsolása', initial: false, type: 'toggle' },
    { key: 'bandStyle', label: 'Fénytörés típusa', initial: 'parallel', type: 'options',
      options: { parallel: 'Párhuzamos sávok', radial: 'Koncentrikus gyűrűk', wave: 'Hullámos sávok', shards: 'Szilánkok' } },
    number('bands', 'Sávok sűrűsége', 14, 1, 120, 1),
    number('bandStrength', 'Fénytörés erőssége', 0.14, 0, 0.65, 0.01),
    number('bandAngle', 'Sávok iránya', 0, -180, 180, 1, '°'),
    number('bandSpeed', 'Sávok mozgása', 0, -3, 3, 0.05, '×'),
    number('bandShade', 'Sávok árnyalása', 0, 0, 1, 0.01),
    number('dispersion', 'Színszétválás', 0, 0, 0.5, 0.005),
    number('softness', 'Sávszélek lágysága', 0, 0, 1, 0.01),
    number('focusRadius', 'Hatósugár', 1, 0.05, 1, 0.01),
    number('focusX', 'Fókusz vízszintesen', 0.5, -1, 2, 0.01),
    number('focusY', 'Fókusz függőlegesen', 0.5, -1, 2, 0.01),
  ] },
  { label: 'Fény és textúra', fields: [
    number('intensity', 'Fényerő', 1.1, 0, 2, 0.05),
    number('contrast', 'Kontraszt', 1, 0.4, 2.4, 0.05),
    number('vignette', 'Peremsötétítés', 0.35, 0, 1, 0.01),
    number('grain', 'Szemcsézettség', 0.09, 0, 0.4, 0.01),
    number('grainSize', 'Szemcseméret', 1, 1, 8, 0.5, ' px'),
    number('opacity', 'Minta fedettsége', 1, 0, 1, 0.01),
  ] },
];

const colorLabels = ['Alapszín', 'Első fény', 'Második fény', 'Harmadik fény', 'Csúcsfény'];
const green = ['#03100b', '#14b37a', '#0b6a73', '#b8ff6a', '#e8fff4'];
const greenStripes = {
  colors: green, speed: 0.5, scale: 1.1, warp: 1.8, seed: 4.1,
  refraction: true, bands: 86, bandShade: 0.4, bandStrength: 0.1,
};

const presets = [
  {
    id: 'amethyst-wave', label: 'Ametiszt hullám', shape: 1,
    defaults: { colors: ['#08040f', '#8a2be2', '#ff4fd8', '#3b2bff', '#ffd6f7'] },
    styles: [
      {
        id: 'blue-prism', label: 'Kék prizma',
        defaults: { colors: ['#18181b', '#3b82f6', '#a5b4fc', '#93c5fd', '#ddd6fe'],
          speed: 0.3, scale: 0.9, grain: 0.06, vignette: 0.3, seed: 8.6, phase: 260.438,
          refraction: true, bands: 14, bandStrength: 0.12, bandAngle: 10 },
      },
      { id: 'green-stripes', label: 'Zöld fénycsíkok', defaults: { ...greenStripes, phase: 445.252 } },
    ],
  },
  {
    id: 'golden-mist', label: 'Arany köd', shape: 2,
    defaults: { colors: ['#0c0802', '#f5b301', '#ff6a00', '#fff1c1', '#ffffff'], scale: 1.1, seed: 3.3, phase: 449.112 },
  },
  {
    id: 'northern-curtain', label: 'Északi fényfüggöny', shape: 11,
    defaults: { ...greenStripes, phase: 457.605 },
  },
  {
    id: 'red-plasma', label: 'Vörös plazma', shape: 12,
    defaults: { colors: ['#050607', '#f0122e', '#2f8696', '#ff2038', '#f7909f'],
      speed: 0.35, scale: 0.8, warp: 1.7, grain: 0.1, intensity: 1.4, vignette: 0, seed: 2.1, phase: 329.226,
      refraction: true, bands: 10, bandStyle: 'shards', bandShade: 0.35, dispersion: 0.1, softness: 0.1, bandStrength: 0.34, bandAngle: 42 },
  },
  {
    id: 'violet-vortex', label: 'Ibolya örvény', shape: 8,
    defaults: { colors: ['#06040d', '#6a3cf0', '#a06bff', '#3a2bd6', '#f1e6ff'],
      speed: 0.4, scale: 0.85, warp: 2.1, grain: 0.07, intensity: 1.25, vignette: 0.15, seed: 3.6, phase: 383.978,
      refraction: true, bands: 18, bandStyle: 'radial', dispersion: 0.175, softness: 1, bandStrength: 0.18, focusY: -0.55 },
  },
  {
    id: 'pastel-veil', label: 'Pasztell ködfátyol', shape: 3,
    defaults: { colors: ['#f4f1ff', '#ff8fd8', '#8b7bff', '#7fe3ff', '#ffffff'],
      speed: 0.45, scale: 1, grain: 0.06, intensity: 1.05, vignette: 0.08, seed: 4.6, phase: 442.751 },
  },
];

export const gradientLabPatterns = [...presets, ...newGradientLabPatterns].map(({ shape, styles = [], ...preset }) => ({
  ...preset, styles: [...styles, ...(newGradientLabStyles[shape] ?? [])], colorLabels, groups,
  fragment: gradientLabFragment, renderFallback: renderGradientLabFallback,
  uniforms: (pattern, time) => gradientLabUniforms(pattern, time, shape),
}));
