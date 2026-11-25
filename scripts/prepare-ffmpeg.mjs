import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

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
