import { useEffect, useMemo, useRef, useState } from 'react';
import { backgroundImageSources, loadImage } from './background';
import { resolutions } from './project';
import { makeScene, makeTimelineScene } from './scene';

const emptyImages = new Map();

export function Preview({ text, timeline, settings, background, time, size, label = 'Animáció előnézete' }) {
  const canvas = useRef(null);
  const draw = useRef(null);
  const latestTime = useRef(time);
  const [images, setImages] = useState(emptyImages);
  const sources = useMemo(() => backgroundImageSources(timeline ? timeline.scenes.map(({ background }) => background) : [background]), [timeline, background]);
  const resolution = resolutions[settings.resolution];
  const width = Math.round(size * Math.min(1, resolution.width / resolution.height));
  const height = Math.round(width * resolution.height / resolution.width);

  useEffect(() => {
    if (!sources.length) { setImages(emptyImages); return; }
    let alive = true;
    Promise.all(sources.map(async (src) => [src, await loadImage(src).catch(() => null)])).then((entries) => {
      if (alive) setImages(new Map(entries));
    });
    return () => { alive = false; };
  }, [sources]);

  useEffect(() => {
    const update = () => {
      draw.current = timeline
        ? makeTimelineScene(canvas.current, timeline, images)
        : makeScene(canvas.current, text, background, images.get(background?.image?.src));
      draw.current(latestTime.current);
    };
    update();
    if (!text && !timeline?.scenes.length) return;
    let alive = true;
    document.fonts.ready.then(() => { if (alive) update(); });
    return () => { alive = false; };
  }, [text, timeline, settings, background, images, width, height]);

  useEffect(() => { latestTime.current = time; draw.current?.(time); }, [time]);
  return <canvas ref={canvas} width={width} height={height} aria-label={label} />;
}
