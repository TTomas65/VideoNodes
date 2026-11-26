export const entranceEffects = {
  slide: 'Beúsztatás', fog: 'Ködből előtűnés', bounce: 'Bepattogás',
  fade: 'Halványból éles', zoom: 'Közelítés', type: 'Írógép', wipe: 'Sávos felfedés', credits: 'Stábfelirat-görgetés',
};
export const middleEffects = {
  none: 'Nincs', still: 'Statikus', wave: 'Hullámzás', lens: 'Nagyítólencse',
  lines: 'Soronkénti kiemelés', shimmer: 'Fényfutás', breathe: 'Lélegzés', float: 'Lebegés',
};
export const exitEffects = {
  none: 'Nincs', fade: 'Elhalványulás', slide: 'Kiúsztatás', fog: 'Ködbe veszés',
  zoom: 'Összezsugorodás', lift: 'Felfelé elsuhanás', wipe: 'Sávos eltűnés', credits: 'Kigörgetés',
};
export const captionPhases = {
  entrance: { label: 'Animáció megjelenés', effects: entranceEffects },
  middle: { label: 'Animáció-köztes', effects: middleEffects },
  exit: { label: 'Animáció-eltűnés', effects: exitEffects },
};
export const maxPhaseSeconds = 180;
export const defaultSceneSeconds = 4;
const emptyCaptionPhase = { effect: 'none', seconds: 0 };
const emptyMiddle = { ...emptyCaptionPhase, totalSeconds: 0 };
const newPhaseSeconds = 1;

const amount = { label: 'Intenzitás', min: 20, max: 180, initial: 100, unit: '%' };
const dynamics = { label: 'Dinamika', min: -100, max: 100, initial: 0, unit: '%' };
const angle = (initial) => ({ label: 'Irány', min: 0, max: 359, initial, unit: '°' });
const cycles = (label, initial, max) => ({ label, min: 1, max, initial });
const extras = {
  entrance: { slide: angle(180), bounce: cycles('Pattanások', 3, 7), wipe: angle(0), credits: { ...amount, label: 'Betűméret' } },
  middle: {
    wave: cycles('Hullámok', 3, 8), lens: { label: 'Lencse szélessége', min: 2, max: 14, initial: 4, unit: ' betű' },
    shimmer: { label: 'Fénysáv szélessége', min: 2, max: 14, initial: 4, unit: ' betű' },
    lines: { label: 'Kiemelés szélessége', min: 30, max: 180, initial: 80, unit: '%' },
    breathe: cycles('Lélegzetek', 1, 6), float: cycles('Lebegések', 1, 6),
  },
  exit: { slide: angle(0), lift: angle(270), wipe: angle(0), credits: { ...amount, label: 'Betűméret' } },
};

export function captionMotionFields(phase, effect) {
  if (effect === 'none') return {};
  if (effect === 'still') return {
    intensity: { label: 'Átlátszatlanság', min: 0, max: 100, initial: 100, unit: '%' },
    detail: { ...amount, label: 'Méret', min: 60, max: 140 },
  };
  const detail = extras[phase][effect];
  return { intensity: effect === 'credits' ? { ...amount, label: 'Görgetés távolsága' } : amount, dynamics, ...(detail && { detail }) };
}

export function captionMotionOptions(tuning, phase, effect) {
  const saved = tuning?.[phase]?.[effect];
  return Object.fromEntries(Object.entries(captionMotionFields(phase, effect)).map(([key, { min, max, initial }]) =>
    [key, Number.isFinite(saved?.[key]) ? Math.round(Math.max(min, Math.min(max, saved[key]))) : initial]));
}

export function readMotionTuning(value) {
  const tuning = {};
  for (const [phase, { effects }] of Object.entries(captionPhases)) {
    const phaseOptions = {};
    for (const effect of Object.keys(effects)) {
      const fallback = captionMotionOptions(null, phase, effect);
      const options = captionMotionOptions(value, phase, effect);
      const overrides = Object.fromEntries(Object.entries(options).filter(([key, setting]) => setting !== fallback[key]));
      if (Object.keys(overrides).length) phaseOptions[effect] = overrides;
    }
    if (Object.keys(phaseOptions).length) tuning[phase] = phaseOptions;
  }
  return Object.keys(tuning).length ? tuning : undefined;
}

export function motionProgress(value, dynamics = 0) {
  if (dynamics === 0) return value;
  const exponent = 1 + Math.abs(dynamics) / 40;
  return dynamics > 0 ? 1 - (1 - value) ** exponent : value ** exponent;
}

export function readCaptionPhase(phase, value) {
  if (!value) return undefined;
  const effect = Object.hasOwn(captionPhases[phase].effects, value.effect) ? value.effect : 'none';
  if (effect === 'none') return undefined;
  const seconds = Number.isFinite(value.seconds) && value.seconds > 0
    ? Math.max(0.1, Math.min(maxPhaseSeconds, value.seconds))
    : newPhaseSeconds;
  if (phase !== 'middle') return { effect, seconds };
  const totalSeconds = Number.isFinite(value.totalSeconds) ? Math.max(seconds, Math.min(maxPhaseSeconds, value.totalSeconds)) : seconds;
  return { effect, seconds, totalSeconds };
}

export const phaseFor = (text, phase) => phase === 'entrance'
  ? { effect: text.effect, seconds: text.seconds }
  : text[phase] ?? (phase === 'middle' ? emptyMiddle : emptyCaptionPhase);

export function phasePatch(text, phase, patch) {
  if (phase === 'entrance') return patch;
  return { [phase]: readCaptionPhase(phase, { ...phaseFor(text, phase), ...patch }) };
}

const hasEffect = (phase) => Boolean(phase?.effect && phase.effect !== 'none');

export function captionDuration(text) {
  if (!text) return 0;
  const seconds = text.seconds + middleDuration(text.middle) + (hasEffect(text.exit) ? text.exit.seconds : 0);
  return Math.round(seconds * 1e8) / 1e8;
}

const middleDuration = (middle) => hasEffect(middle) ? Math.max(middle.seconds, middle.totalSeconds ?? middle.seconds) : 0;

export const captionSceneDuration = (text, minimum = text ? 0 : defaultSceneSeconds) => Math.max(minimum, captionDuration(text));

export function captionTiming(text, clipDuration = captionDuration(text)) {
  const withMiddle = hasEffect(text.middle);
  const withExit = hasEffect(text.exit);
  const adaptive = withMiddle || withExit || text.effect === 'credits';
  const entrance = text.seconds;
  const middle = withMiddle ? text.middle.seconds : 0;
  const middleTotal = middleDuration(text.middle);
  const exit = withExit ? text.exit.seconds : 0;
  return { entrance, middle, middleTotal, exit, exitStart: Math.max(entrance + middleTotal, clipDuration - exit),
    duration: clipDuration, adaptive };
}

export const captionPosterTime = (text, timing = captionTiming(text)) =>
  Math.min(timing.duration, timing.entrance * (text.effect === 'credits' ? 0.5 : 1));

export function captionPhaseRange(timing, phase) {
  if (phase === 'middle') return { start: timing.entrance, end: timing.entrance + timing.middle };
  if (phase === 'exit') return { start: timing.exitStart, end: timing.duration };
  return { start: 0, end: timing.entrance };
}

