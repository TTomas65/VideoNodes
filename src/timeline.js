export function makeTimeline(texts, { fps, duration }) {
  let contentFrames = 0;
  const scenes = texts.map((text) => {
    const start = contentFrames;
    contentFrames += Math.ceil(text.seconds * fps);
    return { text, start, end: contentFrames };
  });
  const frameCount = Math.max(contentFrames, Math.ceil(duration * fps));
  return { scenes, fps, frameCount, contentFrames, duration: frameCount / fps };
}

export function sceneAt(timeline, time) {
  const frame = Math.max(0, Math.min(timeline.frameCount - 1, Math.floor(time * timeline.fps + 1e-7)));
  const index = timeline.scenes.findIndex(({ end }) => frame < end);
  return index === -1 ? timeline.scenes.length - 1 : index;
}

export function sceneTime(scene, fps, time) {
  const local = Math.max(0, time - scene.start / fps);
  if (local + 1e-7 >= (scene.end - scene.start - 1) / fps) return scene.text.seconds;
  return local;
}
