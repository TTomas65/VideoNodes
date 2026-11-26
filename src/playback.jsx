import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

export function usePlayback(duration, loop, autoplay, initialTime = 0, range = null) {
  const [time, setTime] = useState(initialTime);
  const [playing, setPlaying] = useState(autoplay);
  const position = useRef(initialTime);
  const start = range?.start ?? 0;
  const end = Math.min(duration, range?.end ?? duration);

  function seek(value, limit = duration) {
    position.current = Math.max(0, Math.min(limit, value));
    setTime(position.current);
  }

  useEffect(() => {
    if (!playing || end <= start) return;
    let frame;
    let previous;
    function tick(now) {
      previous ??= now;
      const elapsed = Math.max(start, position.current) + (now - previous) / 1000;
      previous = now;
      const next = loop ? start + (elapsed - start) % (end - start) : Math.min(end, elapsed);
      seek(next);
      if (next < end) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, start, end, loop, playing]);

  function toggle() {
    if (!playing && (position.current < start || position.current >= end)) seek(start);
    setPlaying(!playing);
  }

  function restart() {
    seek(start);
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
