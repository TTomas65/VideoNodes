export const maxSceneSeconds = 20;
const defaultSceneSeconds = 4;

export const framesFor = (seconds, fps) => Math.max(1, Math.ceil(seconds * fps - 1e-8));
export const durationFor = (settings, port, text) => settings.sceneDurations[port] ?? text?.seconds ?? defaultSceneSeconds;

export function makeTimeline(inputs, settings, background) {
  const { fps } = settings;
  const scenes = [];
  let frameCount = 0;

  function addScene(port, text, sceneBackground) {
    const start = frameCount;
    frameCount += framesFor(durationFor(settings, port, text), fps);
    const animationEnd = start + (text ? framesFor(text.seconds, fps) : 1);
    scenes.push({ port, text, start, end: frameCount, animationEnd,
      background: sceneBackground ?? background, backgroundStart: sceneBackground ? start : 0 });
  }

  inputs.forEach(({ text, background: sceneBackground }, port) => {
    if (text?.text.trim()) addScene(port, text, sceneBackground);
  });
  if (!scenes.length && background) addScene(0, null);
  return { scenes, fps, frameCount, duration: frameCount / fps };
}

export function sceneAt(timeline, time) {
  const frame = Math.max(0, Math.min(timeline.frameCount - 1, Math.floor(time * timeline.fps + 1e-7)));
  const index = timeline.scenes.findIndex(({ end }) => frame < end);
  return index === -1 ? timeline.scenes.length - 1 : index;
}

export function sceneTime(scene, fps, time) {
  const local = Math.max(0, time - scene.start / fps);
  if (local + 1e-7 >= (scene.animationEnd - scene.start - 1) / fps) return scene.text.seconds;
  return local;
}

export function renderSceneProgress(timeline, prepared, encoded) {
  const progress = [];
  for (const { port, start, end } of timeline.scenes) {
    const frames = end - start;
    const part = (count) => Math.max(0, Math.min(1, (count - start) / frames));
    progress[port] = Math.floor(45 * part(prepared) + 55 * part(encoded));
  }
  return progress;
}
