import { movingBackground, paintBackground, usableBackground } from './background';
import { sceneAt, sceneTime } from './timeline';
import { drawTransition } from './transitions';
import { graphemeSegments } from './caption-format';
import { layoutCaption } from './caption-layout';
import { captionMotionOptions, captionTiming, motionProgress } from './caption-motion';
import { captionFontFamily } from './caption-fonts';

const graphemes = (text) => Array.from(graphemeSegments(text), ({ segment }) => segment);
const ease = (value) => 1 - (1 - value) ** 3;

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      line = '';
      for (const char of graphemes(word)) {
        if (line && ctx.measureText(line + char).width > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

function prepareBackdrop(canvas, background, image) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  if (!usableBackground(background)) return () => {
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
  };
  if (movingBackground(background)) return (time) => paintBackground(context, width, height, background, image, time);
  const backdrop = document.createElement('canvas');
  backdrop.width = width;
  backdrop.height = height;
  const bg = backdrop.getContext('2d');
  paintBackground(bg, width, height, background, image, 0);

  return () => context.drawImage(backdrop, 0, 0);
}

function layoutPlainText(context, text, width, height) {
  const family = captionFontFamily(text.font);
  const font = (size) => `650 ${size}px ${family}`;
  let size = Math.min(width * 0.092, height * 0.158);
  let lines;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    context.font = font(size);
    lines = wrap(context, text.text.trim(), width * 0.82);
    if (lines.length * size * 1.15 <= height * 0.76) break;
    size *= 0.83;
  }
  const clusters = text.effect === 'type' ? lines.map(graphemes) : [];
  const count = clusters.reduce((sum, line) => sum + line.length, 0);
  const lineHeight = size * 1.15;
  context.font = font(size);
  const centers = lines.map((line) => -context.measureText(line).width / 2);
  return {
    x: width / 2, y: height / 2, rotation: 0, fontSize: size,
    wipe: [-width * 0.415, -height / 2, width * 0.83, height],
    draw(progress) {
      context.font = font(size);
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillStyle = text.color;
      let visible = Math.floor(progress * count);
      lines.forEach((line, index) => {
        const fragment = text.effect === 'type' ? clusters[index].slice(0, Math.max(0, visible)).join('') : line;
        if (text.effect === 'type') visible -= clusters[index].length;
        context.fillText(fragment, centers[index], (index - (lines.length - 1) / 2) * lineHeight);
      });
    },
  };
}

const fraction = (time, duration) => Math.max(0, Math.min(1, time / duration));

function prepareText(canvas, text, timing = captionTiming(text)) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  const scrolling = text.effect === 'credits' || text.exit?.effect === 'credits';
  const entrance = captionMotionOptions(text.motionTuning, 'entrance', text.effect);
  const middle = captionMotionOptions(text.motionTuning, 'middle', text.middle?.effect ?? 'none');
  const outgoing = captionMotionOptions(text.motionTuning, 'exit', text.exit?.effect ?? 'none');
  const entryAmount = entrance.intensity / 100;
  const centerAmount = (middle.intensity ?? 100) / 100;
  const exitAmount = (outgoing.intensity ?? 100) / 100;
  const scrollScale = scrolling ? (text.effect === 'credits' ? entrance.detail : outgoing.detail) / 100 : 1;
  const rich = scrolling || text.runs?.length || text.alignments || text.placement || timing.middle && text.middle.effect !== 'still';
  const layout = rich ? layoutCaption(context, text, width, height, scrolling, scrollScale) : layoutPlainText(context, text, width, height);
  const [left, top, extent, blockHeight] = layout.wipe;
  const [pivotX, pivotY] = layout.pivot ?? [0, 0];
  const rollThrough = text.effect === 'credits' && !timing.middle && !timing.exit;
  const still = timing.middle && text.middle.effect === 'still';

  return (time) => {
    const linear = fraction(time, timing.entrance);
    const progress = motionProgress(linear, entrance.dynamics);
    if (rollThrough && progress === 1) return;
    const remaining = 1 - ease(progress);
    const exit = timing.exit && time >= timing.exitStart
      ? motionProgress(fraction(time - timing.exitStart + 1e-9, timing.exit), outgoing.dynamics) : 0;
    if (exit === 1) return;
    const animation = timing.middle && time > timing.entrance && time < timing.entrance + timing.middle
      ? text.middle.effect : undefined;
    const motion = animation ? motionProgress((time - timing.entrance) / timing.middle, middle.dynamics) : 0;
    context.save();
    let scrollOffset = text.effect === 'credits' ? layout.roll(progress, rollThrough ? 'through' : 'in', entryAmount) : 0;
    if (text.exit?.effect === 'credits' && exit) scrollOffset += layout.roll(exit, 'out', exitAmount);
    context.translate(layout.x, layout.y);
    if (layout.rotation) {
      context.translate(pivotX, pivotY);
      context.rotate(layout.rotation);
      context.translate(-pivotX, -pivotY);
    }
    switch (text.effect) {
      case 'slide':
        move(width * 0.34 * remaining * entryAmount, entrance.detail);
        context.globalAlpha = 1 - remaining;
        break;
      case 'fog':
        if (remaining) context.filter = `blur(${layout.fontSize * 0.37 * remaining * entryAmount}px)`;
        context.globalAlpha = progress ** 1.3;
        break;
      case 'bounce':
        context.translate(0, -height * 0.43 * Math.abs(Math.cos(progress * Math.PI * (entrance.detail - 0.5))) * (1 - progress) ** 1.55 * entryAmount);
        context.globalAlpha = Math.min(1, progress * 5);
        break;
      case 'fade':
        context.globalAlpha = (progress ** 2 * (3 - 2 * progress)) ** entryAmount;
        break;
      case 'zoom': {
        const scale = 1 - 0.48 * remaining * entryAmount;
        context.scale(scale, scale);
        context.globalAlpha = 1 - remaining;
        break;
      }
      case 'wipe': {
        if (progress < 1) clipWipe(0, ease(progress) ** entryAmount, entrance.detail);
        break;
      }
    }
    if (animation === 'float') context.translate(0, -layout.fontSize * 0.2 * Math.sin(motion * Math.PI * 2 * middle.detail) * centerAmount);
    if (animation === 'breathe') {
      scaleAroundPivot(1 + Math.sin(motion * Math.PI * middle.detail) ** 2 * 0.12 * centerAmount);
    }
    if (exit) {
      const easing = exit ** 2 * (3 - 2 * exit);
      const effect = text.exit.effect;
      if (effect === 'slide') move(width * 0.44 * easing * exitAmount, outgoing.detail);
      if (effect === 'lift') move(height * 0.49 * easing * exitAmount, outgoing.detail);
      if (effect === 'zoom') scaleAroundPivot(Math.max(0.04, 1 - easing * exitAmount));
      if (effect === 'fog') context.filter = `blur(${layout.fontSize * 0.42 * easing * exitAmount}px)`;
      if (effect === 'wipe') {
        const covered = 1 - (1 - easing) ** exitAmount;
        clipWipe(covered, 1 - covered, outgoing.detail);
      } else if (effect !== 'credits' && effect !== 'zoom-blur') {
        context.globalAlpha = (1 - easing) ** (effect === 'fade' ? exitAmount : 1);
      }
    }
    if (still) {
      context.globalAlpha *= centerAmount;
      if (middle.detail !== 100) scaleAroundPivot(middle.detail / 100);
    }
    const draw = () => layout.draw(text.effect === 'type' ? progress ** entryAmount : progress, animation, motion, middle, scrollOffset);
    if (text.effect === 'zoom-blur' && linear < 1) drawZoomBlur(motionProgress(1 - linear, entrance.dynamics), entrance, draw);
    else if (text.exit?.effect === 'zoom-blur' && exit) drawZoomBlur(exit, outgoing, draw);
    else draw();
    context.restore();
  };

  function drawZoomBlur(progress, options, draw) {
    if (progress === 1) return;
    const amount = options.intensity / 100;
    const scale = 1 + (0.13 * progress + 1.04 * progress ** 3.4) * amount;
    const fade = fraction(progress - 0.56, 0.44);
    const opacity = context.globalAlpha * (1 - fade ** 2 * (3 - 2 * fade));
    const blur = fraction(progress - 0.38, 0.62);
    const strength = blur ** 2 * (3 - 2 * blur) * options.detail / 100;

    if (strength > 0.01) {
      // Smaller exposures trail the growing caption around its own pivot.
      const count = 8;
      const spread = Math.min(scale - 1, strength * amount * 0.82);
      context.filter = `blur(${layout.fontSize * strength * 0.12}px)`;
      for (let step = count; step >= 1; step -= 1) {
        const distance = step / count;
        context.save();
        context.globalAlpha = opacity * Math.min(1, strength) * (1 - distance * 0.65) * 0.26;
        scaleAroundPivot(scale - spread * distance);
        draw();
        context.restore();
      }
      context.filter = `blur(${layout.fontSize * strength * 0.065}px)`;
    }
    context.globalAlpha = opacity * (1 - Math.min(1, strength) * 0.84);
    scaleAroundPivot(scale);
    draw();
  }

  function scaleAroundPivot(scale) {
    context.translate(pivotX, pivotY);
    context.scale(scale, scale);
    context.translate(-pivotX, -pivotY);
  }

  function move(distance, direction) {
    const angle = direction * Math.PI / 180;
    context.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }

  function clipWipe(start, width, direction) {
    context.beginPath();
    if (!direction) context.rect(left + extent * start, top, extent * width, blockHeight);
    else {
      const angle = direction * Math.PI / 180;
      const span = extent * Math.abs(Math.cos(angle)) + blockHeight * Math.abs(Math.sin(angle));
      const reserve = Math.hypot(extent, blockHeight);
      context.save();
      context.translate(left + extent / 2, top + blockHeight / 2);
      context.rotate(angle);
      context.rect(span * (start - 0.5), -reserve, span * width, reserve * 2);
      context.restore();
    }
    context.clip();
  }
}

export function makeScene(canvas, text, background, image, duration) {
  const drawBackground = prepareBackdrop(canvas, background, image);
  const drawText = text?.text.trim() ? prepareText(canvas, text, captionTiming(text, duration)) : null;
  return (time) => {
    drawBackground(time);
    drawText?.(time);
  };
}

function makeTimelinePainter(canvas, timeline, images) {
  const titles = timeline.scenes.map(({ text, timing }) => text ? prepareText(canvas, text, timing) : null);
  let activeBackground;
  let drawBackground;
  return (index, time) => {
    const scene = timeline.scenes[index];
    if (!drawBackground || activeBackground !== scene.background) {
      activeBackground = scene.background;
      drawBackground = prepareBackdrop(canvas, activeBackground, images.get(activeBackground?.image?.src));
    }
    drawBackground(Math.max(0, time - scene.backgroundStart / timeline.fps));
    if (titles[index]) titles[index](sceneTime(scene, timeline.fps, time));
  };
}

export function makeTimelineScene(canvas, timeline, images) {
  const draw = makeTimelinePainter(canvas, timeline, images);
  const context = canvas.getContext('2d');
  let layers;
  return (time) => {
    const index = sceneAt(timeline, time);
    const scene = timeline.scenes[index];
    if (!scene) return;
    const frame = time * timeline.fps;
    const transition = scene.transition;
    if (!transition || frame + 1e-7 < transition.start) {
      draw(index, time);
      return;
    }
    layers ??= [index, index + 1].map(() => {
      const layer = document.createElement('canvas');
      Object.assign(layer, { width: canvas.width, height: canvas.height });
      return { canvas: layer, draw: makeTimelinePainter(layer, timeline, images) };
    });
    const [outgoing, incoming] = layers;
    outgoing.draw(index, time);
    incoming.draw(index + 1, time);
    drawTransition(context, transition.effect, outgoing.canvas, incoming.canvas,
      (frame - transition.start) / (transition.end - transition.start), transition.options);
  };
}
