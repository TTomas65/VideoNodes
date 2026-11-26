import { readFile, writeFile } from 'node:fs/promises';

const source = 'https://fonts.google.com/metadata/fonts';
const response = process.argv[2] ? await readFile(process.argv[2], 'utf8') : await fetch(source).then((result) => {
  if (!result.ok) throw new Error(`Google Fonts HTTP ${result.status}`);
  return result.text();
});

const { familyMetadataList } = JSON.parse(response);
if (!Array.isArray(familyMetadataList) || !familyMetadataList.length) throw new Error('Hiányos Google Fonts katalógus.');

function variants({ fonts = {}, axes = [] }) {
  const weight = axes.find(({ tag }) => tag === 'wght');
  const keys = Object.keys(fonts).filter((key) => /^\d+i?$/.test(key));
  const weights = (italic) => {
    const values = keys.filter((key) => key.endsWith('i') === italic).map((key) => parseInt(key, 10)).sort((a, b) => a - b);
    return weight && values.length > 1 && values[0] === weight.min && values.at(-1) === weight.max
      ? [`${weight.min}..${weight.max}`] : values;
  };
  const normal = weights(false);
  const italic = weights(true);
  if (italic.length) return `:ital,wght@${[...normal.map((value) => `0,${value}`), ...italic.map((value) => `1,${value}`)].join(';')}`;
  return normal.length && (normal.length !== 1 || normal[0] !== 400) ? `:wght@${normal.join(';')}` : '';
}

const rows = familyMetadataList.filter(({ family }) => typeof family === 'string' && family.trim())
  .map((font) => `  ${JSON.stringify(font.family)}: ${JSON.stringify(variants(font))}`).sort();
await writeFile(new URL('../src/google-fonts.json', import.meta.url), `{\n${rows.join(',\n')}\n}\n`);
