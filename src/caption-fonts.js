import catalog from './google-fonts.json';

const localPrefix = 'local:';
const legacyFonts = new Set(['Arial', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS']);
const namePattern = /^[^\x00-\x1f\x7f]{1,140}$/u;
const interFamily = '"Inter Variable"';
const retriesAfter = 12_000;
const requests = new Map();
export const googleFontNames = Object.keys(catalog);
export const commonGoogleFonts = ['Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Oswald', 'Playfair Display', 'Merriweather', 'Source Sans 3'];
export const sampleText = 'Árvíztűrő tükörfúrógép';

export function readCaptionFont(value) {
  if (typeof value !== 'string') return undefined;
  if (Object.hasOwn(catalog, value) || legacyFonts.has(value)) return value;
  if (!value.startsWith(localPrefix)) return undefined;
  const name = value.slice(localPrefix.length).trim();
  return namePattern.test(name) ? localPrefix + name : undefined;
}

export const fontName = (font) => font?.startsWith(localPrefix) ? font.slice(localPrefix.length) : font;
export const fontSource = (font) => font?.startsWith(localPrefix) || legacyFonts.has(font) ? 'local' : 'google';
export const fontChoice = (source, name) => source === 'local' ? localPrefix + name : name;

function googleAlias(font) {
  return font === 'Inter' ? 'Inter Variable' : `VideoNodes Web ${font}`;
}

export function captionFontFamily(font) {
  const name = fontName(font) || 'Inter';
  if (fontSource(font) === 'local') return `${JSON.stringify(name)}, ${interFamily}, sans-serif`;
  if (name === 'Inter') return `${interFamily}, sans-serif`;
  return `${JSON.stringify(googleAlias(name))}, ${interFamily}, sans-serif`;
}

async function fetchStyles(font, variants) {
  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', font + variants);
  url.searchParams.set('display', 'swap');
  const response = await fetch(url, { referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(7500) });
  if (response.status === 400 && variants) return fetchStyles(font, '');
  if (!response.ok) throw new Error(`Google Fonts HTTP ${response.status}`);
  return response.text();
}

function registerGoogleFont(font) {
  const cached = requests.get(font);
  if (cached && (!cached.retryAt || cached.retryAt > Date.now())) return cached.promise;
  const entry = {};
  entry.promise = fetchStyles(font, catalog[font]).then((css) => {
    const faces = [];
    for (const [, rules] of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      const source = rules.match(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[\w./-]+)['"]?\)/)?.[1];
      if (!source) continue;
      const setting = (name) => rules.match(new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+)`))?.[1].trim();
      const face = new FontFace(googleAlias(font), `url("${source}")`, {
        style: setting('font-style') ?? 'normal',
        weight: setting('font-weight') ?? '400',
        unicodeRange: setting('unicode-range') ?? 'U+0-10FFFF',
      });
      faces.push(face);
    }
    if (!faces.length) throw new Error('A webfont nem tartalmaz betölthető változatot.');
    faces.forEach((face) => document.fonts.add(face));
    return true;
  }).catch(() => {
    entry.retryAt = Date.now() + retriesAfter;
    return false;
  });
  requests.set(font, entry);
  return entry.promise;
}

export async function loadCaptionFont(font = 'Inter', sample = sampleText, weight = 650, italic = false) {
  if (fontSource(font) === 'local') return true;
  if (font !== 'Inter' && !(await registerGoogleFont(font))) return false;
  try {
    await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 24px ${JSON.stringify(googleAlias(font))}`, sample);
    return true;
  } catch {
    return false;
  }
}

export async function loadCaptionFonts(captions) {
  const samples = new Map();
  function add(font, text, weight = 650, italic = false) {
    if (!text || fontSource(font) === 'local') return;
    const key = JSON.stringify([font, weight, italic]);
    if (!samples.has(key)) samples.set(key, { font, weight, italic, letters: new Set() });
    const { letters } = samples.get(key);
    for (const letter of text) letters.add(letter);
  }
  for (const caption of captions) {
    if (!caption?.text) continue;
    add('Inter', caption.text);
    add(caption.font, caption.text);
    for (const run of caption.runs ?? []) {
      const text = caption.text.slice(run.start, run.end);
      add(run.font ?? caption.font, run.uppercase ? text.toLocaleUpperCase('hu') : text, run.weight, run.italic);
    }
  }
  await Promise.all([...samples.values()].map(({ font, letters, weight, italic }) => loadCaptionFont(font, [...letters].join(''), weight, italic)));
}
