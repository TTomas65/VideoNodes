import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const source = new URL('../node_modules/@ffmpeg/core/dist/esm/', import.meta.url);
const target = new URL('../public/ffmpeg/', import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(new URL('ffmpeg-core.js', source), new URL('ffmpeg-core.js', target));

// Keep each static asset below the hosting provider's per-file size limit.
const wasm = await readFile(new URL('ffmpeg-core.wasm', source));
const midpoint = Math.ceil(wasm.length / 2);
await Promise.all([
  writeFile(new URL('ffmpeg-core.1', target), wasm.subarray(0, midpoint)),
  writeFile(new URL('ffmpeg-core.2', target), wasm.subarray(midpoint)),
]);

const vp9Source = new URL('../node_modules/@libav.js/variant-webm-vp9-cli/dist/', import.meta.url);
const vp9Target = new URL('vp9/', target);
await mkdir(vp9Target, { recursive: true });
const vp9Entry = (await readdir(vp9Source)).find((name) => /^libav-\d[\d.]*-webm-vp9-cli\.mjs$/.test(name));
if (!vp9Entry) throw new Error('The LibAV.js VP9 build is incomplete.');
const vp9Stem = vp9Entry.slice(0, -4);
const vp9Files = [vp9Entry, `${vp9Stem}.wasm.mjs`, `${vp9Stem}.wasm.wasm`];
await Promise.all(vp9Files.map((name) => copyFile(new URL(name, vp9Source), new URL(name, vp9Target))));
await writeFile(new URL('index.mjs', vp9Target), `export { default } from './${vp9Entry}';\n`);
