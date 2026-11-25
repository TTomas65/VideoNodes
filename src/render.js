import { FFmpeg } from '@ffmpeg/ffmpeg';
import { makeScene } from './scene';
import { resolutions } from './project';

const ffmpeg = new FFmpeg();

async function loadEngine() {
  if (ffmpeg.loaded) return;
  const base = new URL(`${import.meta.env.BASE_URL}ffmpeg/`, document.baseURI);
  const chunks = await Promise.all(['ffmpeg-core.1', 'ffmpeg-core.2'].map(async (part) => {
    const response = await fetch(new URL(part, base));
    if (!response.ok) throw new Error('Az FFmpeg motor letöltése sikertelen.');
    return response.blob();
  }));
  const wasmURL = URL.createObjectURL(new Blob(chunks, { type: 'application/wasm' }));
  try {
    await ffmpeg.load({ coreURL: new URL('ffmpeg-core.js', base).href, wasmURL });
  } catch (error) {
    ffmpeg.terminate();
    throw error;
  } finally {
    URL.revokeObjectURL(wasmURL);
  }
}

const capture = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('A képkocka előállítása sikertelen.')), 'image/jpeg', 0.95);
});

export async function renderVideo(text, settings, report) {
  await loadEngine();
  await document.fonts.ready;
  const { width, height } = resolutions[settings.resolution];
  const canvas = document.createElement('canvas');
  Object.assign(canvas, { width, height });
  const draw = makeScene(canvas, text, settings);
  const frameCount = Math.ceil(settings.fps * settings.duration);
  const animatedFrames = Math.min(frameCount, Math.ceil(settings.fps * text.seconds) + 1);
  const frames = [];
  let inputWritten = false;
  const progress = ({ time }) => report(53 + Math.min(0.98, Math.max(0, time / (settings.duration * 1e6))) * 44, 'MP4 kódolása');

  try {
    for (let index = 0; index < animatedFrames; index += 1) {
      draw(index / settings.fps);
      frames.push(await capture(canvas));
      if (index % 4 === 0) report(7 + 44 * (index + 1) / animatedFrames, 'Képkockák előállítása');
    }
    await ffmpeg.writeFile('frames.mjpg', new Uint8Array(await new Blob(frames).arrayBuffer()));
    frames.length = 0;
    inputWritten = true;
    report(53, 'MP4 kódolása');
    ffmpeg.on('progress', progress);
    const result = await ffmpeg.exec([
      '-f', 'image2pipe', '-framerate', String(settings.fps), '-vcodec', 'mjpeg', '-i', 'frames.mjpg',
      '-vf', `tpad=stop_mode=clone:stop=${frameCount - animatedFrames}`, '-frames:v', String(frameCount),
      '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-threads', '1', '-movflags', '+faststart', 'present-fflow.mp4',
    ]);
    if (result !== 0) throw new Error('Az FFmpeg nem tudta elkészíteni az MP4 fájlt.');
    return new Blob([await ffmpeg.readFile('present-fflow.mp4')], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progress);
    await Promise.allSettled([
      inputWritten && ffmpeg.deleteFile('frames.mjpg'),
      ffmpeg.deleteFile('present-fflow.mp4'),
    ]);
  }
}
