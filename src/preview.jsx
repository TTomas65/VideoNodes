import { useEffect, useRef, useState } from 'react';
import { loadImage } from './background';
import { resolutions } from './project';
import { makeScene, makeTimelineScene } from './scene';

export function Preview({ text, timeline, settings, background, time, size, label = 'Animáció előnézete' }) {
  const canvas = useRef(null);
  const draw = useRef(null);
  const latestTime = useRef(time);
  const [loaded, setLoaded] = useState(null);
  const src = background?.mode === 'image' ? background.image?.src : null;
  const image = loaded?.src === src ? loaded?.image : null;
  const resolution = resolutions[settings.resolution];
  const width = Math.round(size * Math.min(1, resolution.width / resolution.height));
  const height = Math.round(width * resolution.height / resolution.width);

  useEffect(() => {
    if (!src) { setLoaded(null); return; }
    let alive = true;
    loadImage(src).then((decoded) => { if (alive) setLoaded({ src, image: decoded }); }, () => {});
    return () => { alive = false; };
  }, [src]);

  useEffect(() => {
    const update = () => {
      draw.current = timeline
        ? makeTimelineScene(canvas.current, timeline, settings, background, image)
        : makeScene(canvas.current, text, settings, background, image);
      draw.current(latestTime.current);
    };
    update();
    if (!text && !timeline?.scenes.length) return;
    let alive = true;
    document.fonts.ready.then(() => { if (alive) update(); });
    return () => { alive = false; };
  }, [text, timeline, settings, background, image, width, height]);

  useEffect(() => { latestTime.current = time; draw.current?.(time); }, [time]);
  return <canvas ref={canvas} width={width} height={height} aria-label={label} />;
}
