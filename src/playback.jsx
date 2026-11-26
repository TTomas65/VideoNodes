import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

export function usePlayback(duration, loop, autoplay, initialTime = 0) {
  const [time, setTime] = useState(initialTime);
  const [playing, setPlaying] = useState(autoplay);
  const position = useRef(initialTime);

  function seek(value) {
    position.current = Math.max(0, Math.min(duration, value));
    setTime(position.current);
  }

  useEffect(() => {
    if (!playing) return;
    let frame;
    let previous;
    function tick(now) {
      previous ??= now;
      const elapsed = position.current + (now - previous) / 1000;
      previous = now;
      const next = loop ? elapsed % duration : Math.min(duration, elapsed);
      seek(next);
      if (next < duration) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, loop, playing]);

  function toggle() {
    if (!playing && position.current >= duration) seek(0);
    setPlaying(!playing);
  }

  function restart() {
    seek(0);
    setPlaying(true);
  }

  return { time: Math.min(time, duration), playing, setPlaying, seek, toggle, restart };
}

export function PlaybackButtons({ playback }) {
  return <div className="transition-playback-buttons">
    <button type="button" className="icon-button" aria-label={playback.playing ? 'Szünet' : 'Lejátszás'} onClick={playback.toggle}>
      {playback.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
    </button>
    <button type="button" className="icon-button" aria-label="Újrajátszás" onClick={playback.restart}><RotateCcw size={15} /></button>
  </div>;
}
