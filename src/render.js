import { FFmpeg } from '@ffmpeg/ffmpeg';
import { makeTimelineScene } from './scene';
import { formats, resolutions } from './project';
import { backgroundImageSources, loadImage, movingBackground } from './background';

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

export async function renderVideo(timeline, settings, report) {
  const sources = backgroundImageSources(timeline.scenes.map(({ background }) => background));
  const [imageEntries] = await Promise.all([
    Promise.all(sources.map(async (src) => [src, await loadImage(src)])),
    document.fonts.ready,
  ]);
  const { width, height } = resolutions[settings.resolution];
  const { container, mime } = formats[settings.format];
  const outputFile = `present-fflow.${settings.format}`;
  const canvas = document.createElement('canvas');
  Object.assign(canvas, { width, height });
  const draw = makeTimelineScene(canvas, timeline, new Map(imageEntries));
  const { frameCount } = timeline;
  const frameRanges = timeline.scenes.map(({ start, end, animationEnd, background }) => ({
    start, end: movingBackground(background) ? end : Math.min(end, animationEnd),
  }));
  for (const { transition } of timeline.scenes) {
    if (transition) frameRanges.push({ start: transition.start, end: transition.end + 1 });
  }
  const needsFrame = (index) => frameRanges.some(({ start, end }) => start <= index && index < end);
  if (settings.format === 'webm') {
    const { encodeWebm } = await import('./webm');
    return encodeWebm({ canvas, draw, frameCount, needsFrame, settings, report });
  }
  await loadEngine();
  const captureFrames = Math.max(...frameRanges.map(({ end }) => end));
  const frames = [];
  const encoding = `${container} kódolása`;
  let inputMount;
  let mounted = false;
  let encoded = 0;
  const progress = ({ time }) => {
    if (!Number.isFinite(time)) return;
    encoded = Math.max(encoded, Math.min(frameCount, Math.floor(time * timeline.fps / 1e6 + 1e-4)));
    report({ progress: 53 + (encoded / frameCount) * 44, phase: encoding, prepared: frameCount, encoded });
  };

  try {
    let lastFrame;
    for (let index = 0; index < captureFrames; index += 1) {
      if (needsFrame(index)) {
        draw(index / settings.fps);
        lastFrame = await capture(canvas);
      }
      frames.push(lastFrame);
      if (index % 4 === 0) report({ progress: 7 + 44 * (index + 1) / captureFrames, phase: 'Képkockák előállítása', prepared: index + 1 });
    }
    // WORKERFS reads the JPEG stream from a Blob without copying all frames into the FFmpeg heap.
    inputMount = `/frames-${crypto.randomUUID()}`;
    await ffmpeg.createDir(inputMount);
    mounted = await ffmpeg.mount('WORKERFS', { blobs: [{ name: 'frames.mjpg', data: new Blob(frames) }] }, inputMount);
    if (!mounted) throw new Error('Az FFmpeg nem tudta megnyitni a képkockákat.');
    frames.length = 0;
    report({ progress: 53, phase: encoding, prepared: frameCount });
    ffmpeg.on('progress', progress);
    const result = await ffmpeg.exec([
      '-stats_period', '0.15', '-f', 'image2pipe', '-framerate', String(settings.fps), '-vcodec', 'mjpeg', '-i', `${inputMount}/frames.mjpg`,
      '-vf', `tpad=stop_mode=clone:stop=${frameCount - captureFrames}`, '-frames:v', String(frameCount),
      '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', String(settings.crf),
      '-pix_fmt', 'yuv420p', '-threads', '1', '-movflags', '+faststart', outputFile,
    ]).catch((error) => {
      ffmpeg.terminate();
      throw error;
    });
    if (result !== 0) throw new Error(`Az FFmpeg nem tudta elkészíteni a(z) ${container} fájlt.`);
    return new Blob([await ffmpeg.readFile(outputFile)], { type: mime });
  } finally {
    ffmpeg.off('progress', progress);
    if (ffmpeg.loaded) await Promise.allSettled([
      inputMount && (async () => {
        if (mounted) await ffmpeg.unmount(inputMount);
        await ffmpeg.deleteDir(inputMount);
      })(),
      ffmpeg.deleteFile(outputFile),
    ]);
  }
}
