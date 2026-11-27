import { gradientLabPatterns } from './gradient-lab-presets';

export const backgroundPatterns = Object.fromEntries(gradientLabPatterns.map((pattern) => [pattern.id, pattern]));
export const backgroundPattern = (value) => Object.hasOwn(backgroundPatterns, value?.id)
  ? backgroundPatterns[value.id] : backgroundPatterns['amethyst-wave'];
const backgroundStyle = (template, value) => template.styles.find(({ id }) => id === value?.style);
export function backgroundPatternLabel(value) {
  const template = backgroundPattern(value);
  return backgroundStyle(template, value)?.label ?? template.label;
}

const color = (value, initial) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : initial;
const number = (value, min, max, initial) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : initial;

export function readBackgroundPattern(value) {
  const template = backgroundPattern(value);
  const style = backgroundStyle(template, value);
  const defaults = style?.defaults ?? template.defaults;
  const fields = template.groups.flatMap(({ fields }) => fields.map(({ key, initial, min, max, options }) => {
    const fallback = defaults[key] ?? initial;
    const setting = value?.[key];
    if (options) return [key, Object.hasOwn(options, setting) ? setting : fallback];
    if (typeof initial === 'boolean') return [key, typeof setting === 'boolean' ? setting : fallback];
    return [key, number(setting, min, max, fallback)];
  }));
  return { id: template.id, ...(style && { style: style.id }), ...Object.fromEntries(fields),
    colors: defaults.colors.map((initial, index) => color(value?.colors?.[index], initial)),
    lightOpacity: defaults.colors.slice(1).map((_, index) => number(value?.lightOpacity?.[index], 0, 1, 1)) };
}

export const defaultPattern = readBackgroundPattern();

const vertex = 'attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }';
let gpu;
let fallback;

function createSurface() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return { canvas, gl };
  const surface = { canvas, gl, programs: new Map(), vertices: null };
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => {
    surface.programs.clear();
    surface.vertices = null;
  });
  return surface;
}

function createProgram(gl, fragment) {
  const shaders = [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]].map(([type, code]) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    return shader;
  });
  const program = shaders.every(Boolean) ? gl.createProgram() : null;
  if (program) {
    shaders.forEach((shader) => gl.attachShader(program, shader));
    gl.linkProgram(program);
  }
  shaders.forEach((shader) => { if (shader) gl.deleteShader(shader); });
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (program) gl.deleteProgram(program);
    return null;
  }
  return { program, position: gl.getAttribLocation(program, 'position'), locations: new Map() };
}

function drawPattern(ctx, width, height, template, uniforms) {
  gpu ??= createSurface();
  const { gl, canvas, programs } = gpu;
  if (!gl || gl.isContextLost()) return false;
  if (!programs.has(template.fragment)) programs.set(template.fragment, createProgram(gl, template.fragment));
  const compiled = programs.get(template.fragment);
  if (!compiled) return false;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) return false;
  gl.viewport(0, 0, width, height);
  gl.useProgram(compiled.program);
  if (!gpu.vertices) {
    gpu.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  }
  gl.enableVertexAttribArray(compiled.position);
  gl.vertexAttribPointer(compiled.position, 2, gl.FLOAT, false, 0, 0);
  for (const [name, value] of Object.entries({ ...uniforms, resolution: [width, height] })) {
    if (!compiled.locations.has(name)) compiled.locations.set(name, gl.getUniformLocation(compiled.program, name));
    const location = compiled.locations.get(name);
    if (typeof value === 'number') gl.uniform1f(location, value);
    else gl[`uniform${value.length}fv`](location, value);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  ctx.drawImage(canvas, 0, 0);
  return true;
}

export function paintBackgroundPattern(ctx, width, height, pattern, time) {
  const template = backgroundPattern(pattern);
  const uniforms = template.uniforms(pattern, time);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (drawPattern(ctx, width, height, template, uniforms)) return;

  if (!fallback) {
    const canvas = document.createElement('canvas');
    fallback = { canvas, context: canvas.getContext('2d'), image: null };
  }
  const scale = Math.min(1, 192 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const { canvas, context } = fallback;
  if (!fallback.image || canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    fallback.image = context.createImageData(w, h);
  }
  template.renderFallback(fallback.image.data, w, h, width, height, uniforms);
  context.putImageData(fallback.image, 0, 0);
  ctx.drawImage(canvas, 0, 0, width, height);
}
