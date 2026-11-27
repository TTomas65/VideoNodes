// Adapted from the Gradient Lab "Copy animated" exports supplied for these presets.
// https://www.thesmallsquare.com/tools/gradient-lab
export const gradientLabFragment = `
precision highp float;
uniform vec2 resolution;
uniform float phase;
uniform vec3 base, light1, light2, light3, highlight;
uniform vec2 flip;
uniform float rotation, scale, warp, seed, grain, grainSize, intensity, vignette, contrast;
uniform vec4 lightOpacity;
uniform float opacity;
uniform float shape, bands, bandStyle, bandAngle, bandSpeed, bandStrength, bandShade, dispersion, softness, focusRadius;
uniform vec2 focus;

float hashNoise(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 ease = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashNoise(cell), hashNoise(cell + vec2(1, 0)), ease.x),
             mix(hashNoise(cell + vec2(0, 1)), hashNoise(cell + vec2(1, 1)), ease.x), ease.y);
}

float fractal(vec2 p) {
  float value = 0.0, weight = 0.5;
  for (int i = 0; i < 4; i++) {
    value += weight * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    weight *= 0.5;
  }
  return value;
}

float grainHash(vec2 p) {
  vec3 v = fract(vec3(p.xyx) * 0.1031);
  v += dot(v, v.yzx + 33.33);
  return fract((v.x + v.y) * v.z);
}

vec2 swirl(vec2 point, float power, int rounds) {
  for (int i = 1; i < 5; i++) {
    if (i > rounds) break;
    float k = float(i);
    point += power / k * vec2(sin(k * point.y * scale * 1.9 + phase * 0.21 + seed * k),
                              cos(k * point.x * scale * 1.6 - phase * 0.17 + seed * 1.3 * k));
  }
  return point;
}

vec3 sampleGradient(vec2 position, float side) {
  float c = cos(rotation), s = sin(rotation);
  vec2 p = mat2(c, s, -s, c) * (position * flip);
  vec2 uv = p * side / resolution + 0.5;
  vec2 q = p * scale + seed;
  vec2 first = vec2(fractal(q + vec2(0.0, phase * 0.07)), fractal(q + vec2(5.2, 1.3) - phase * 0.05));
  vec2 warped = vec2(fractal(q + warp * first + vec2(1.7, 9.2) + phase * 0.09),
                      fractal(q + warp * first + vec2(8.3, 2.8) - phase * 0.06));
  float detail = fractal(q + warp * warped);
  float mask = 0.0, core = -1.0, split = 0.0;
  if (shape < 0.5 || (shape > 6.5 && shape < 7.5)) {
    float vertical = shape < 0.5 ? uv.y : 1.0 - uv.y;
    vec2 glow = vec2(uv.x - 0.5, (vertical + 0.06 + 0.04 * sin(phase * 0.3)) * 2.0);
    mask = 1.0 - smoothstep(0.0, 1.15, length(glow) + (0.45 - detail) * 0.75);
  } else if (shape < 1.5) {
    float height = uv.y - 0.5 + 0.18 * sin(uv.x * 3.0 + phase * 0.25 + detail * 3.0) + (detail - 0.5) * 0.45;
    float ridge = height * 3.2, halo = (height + 0.28) * 5.0;
    mask = exp(-ridge * ridge) * 1.15 + 0.35 * exp(-halo * halo);
  } else if (shape < 2.5) {
    mask = smoothstep(0.36, 0.78, detail + 0.12 * sin(phase * 0.2));
  } else if (shape < 3.5) {
    mask = 0.55 + 0.45 * detail;
  } else if (shape < 4.5) {
    float band = dot(uv - 0.5, normalize(vec2(1.0, 0.55))) + (detail - 0.5) * 0.4 + 0.06 * sin(phase * 0.3);
    float distance = band * 4.2;
    mask = exp(-distance * distance) * 1.25;
  } else if (shape < 5.5) {
    vec2 center = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
    mask = 1.0 - smoothstep(0.0, 0.78, length(center) + (0.45 - detail) * 0.6);
  } else if (shape < 6.5) {
    for (int i = 0; i < 3; i++) {
      float k = float(i);
      float band = uv.y - (0.25 + k * 0.22) + 0.06 * sin(uv.x * (2.0 + k) + phase * (0.2 + k * 0.07) + detail * 2.5);
      float distance = band * 9.0;
      mask += exp(-distance * distance) * (1.0 - k * 0.18);
    }
    mask *= 1.1;
  } else if (shape < 8.5) {
    vec2 point = swirl(p + (warped - 0.5) * warp * 0.12, warp * 0.24, 4) - swirl(vec2(0.0), warp * 0.24, 4);
    mask = 1.0 - smoothstep(0.05, 1.05, length(point * vec2(0.78, 1.0)));
    mask *= mask;
    core = (1.0 - smoothstep(0.02, 0.5, length(point - vec2(-0.04, -0.1)))) * 1.15 * intensity;
  } else if (shape < 9.5) {
    mask = 0.93;
    core = 0.0;
  } else if (shape < 10.5) {
    vec2 ring = p * vec2(1.0, 1.28);
    float angle = atan(ring.y, ring.x);
    float radius = length(ring) + (detail - 0.5) * 0.07 * warp;
    float distance = radius - 0.44;
    float light = 0.5 + 0.5 * cos(angle + 0.9 + phase * 0.15);
    float halo = distance * 5.5, rim = distance * 30.0;
    mask = exp(-halo * halo) * (0.25 + 0.75 * light)
         + 0.22 * (1.0 - smoothstep(0.0, 0.5, radius)) * (1.0 - light * 0.6);
    core = exp(-rim * rim) * (0.08 + 1.25 * light * light) * intensity;
  } else if (shape < 11.5) {
    vec2 ray = p - vec2(0.0, 0.78);
    float angle = atan(ray.x, -ray.y);
    float rays = fractal(vec2(angle * 2.4 * scale + seed, phase * 0.11 + seed)) * 0.62
               + fractal(vec2(angle * 6.5 * scale - seed, phase * 0.19 + 3.0)) * 0.38;
    mask = smoothstep(0.3, 0.76, rays + (detail - 0.5) * 0.12)
         * exp(-length(ray) * 0.5) * 2.1 * (1.0 - smoothstep(0.3, 1.5, abs(angle)));
    core = 0.0;
  } else {
    vec2 point = swirl(p + (warped - 0.5) * warp * 0.1, warp * 0.11, 3) - swirl(vec2(0.0), warp * 0.11, 3);
    vec2 center = point - vec2(-0.12, -0.06);
    vec2 secondary = point - vec2(0.62, 0.4);
    vec2 bright = point - vec2(0.1, 0.16);
    float firstGlow = 1.0 - smoothstep(0.14, 0.56, length(center * vec2(0.9, 1.0)));
    firstGlow *= firstGlow * (3.0 - 2.0 * firstGlow);
    float secondGlow = (1.0 - smoothstep(0.04, 0.46, length(secondary))) * 0.7;
    mask = firstGlow + secondGlow;
    split = secondGlow / (mask + 0.001);
    core = exp(-dot(bright, bright) / 0.05) * 0.85 * intensity;
  }
  float amount = clamp(mask * intensity, 0.0, 1.5);
  vec3 a = mix(base, light1, lightOpacity.x);
  vec3 b = mix(base, light2, lightOpacity.y);
  vec3 d = mix(base, light3, lightOpacity.z);
  vec3 peak = mix(base, highlight, lightOpacity.w);
  vec3 tint = mix(mix(a, b, smoothstep(0.2, 0.8, warped.x)), d, smoothstep(0.45, 0.95, warped.y));
  if (shape > 8.5 && shape < 9.5) {
    vec2 corners = smoothstep(-0.12, 1.12, uv + (warped - 0.5) * warp * 0.55);
    tint = mix(mix(d, peak, corners.x), mix(a, b, corners.x), corners.y);
  }
  if (shape > 11.5) tint = mix(mix(a, d, smoothstep(0.25, 0.75, warped.x)), b, split);
  vec3 color = mix(base, tint, min(amount, 1.0));
  float glow = core < 0.0 ? smoothstep(0.55, 1.0, min(amount, 1.0) * detail * 1.25) * 0.85 : smoothstep(0.3, 1.0, core) * 0.94;
  color = mix(color, peak, glow);
  color += tint * max(amount - 1.0, 0.0) * 0.5;
  color = pow(max(color, 0.0), vec3(contrast));
  vec2 edge = (uv - 0.5) * vec2(min(resolution.x / resolution.y, 1.0), 1.0) * 1.4;
  color *= 1.0 - vignette * dot(edge, edge);
  return color;
}

void main() {
  float side = min(resolution.x, resolution.y);
  vec2 position = (gl_FragCoord.xy - 0.5 * resolution) / side;
  vec2 bend = vec2(0.0);
  float bandShadePhase = 0.0;
  if (bands > 0.5) {
    vec2 fromFocus = position - (focus - 0.5) * resolution / side;
    float distance = length(fromFocus);
    vec2 direction = vec2(cos(bandAngle), sin(bandAngle));
    vec2 normal = vec2(-direction.y, direction.x);
    float edge = mix(clamp(1.5 * bands / side, 0.0005, 0.3), 0.5, softness);
    float fade = focusRadius > 0.995 ? 1.0 : clamp(1.0 - distance / (focusRadius * 1.6), 0.0, 1.0);
    float travel = phase * bandSpeed;
    float coordinate = dot(position, direction);
    if (bandStyle > 0.5 && bandStyle < 1.5) {
      coordinate = distance;
      direction = fromFocus / max(distance, 0.0001);
    } else if (bandStyle > 1.5 && bandStyle < 2.5) {
      coordinate += 0.045 * sin(dot(position, normal) * 5.5 + travel * 0.5);
    }
    float band = coordinate * bands + travel;
    float fraction = fract(band);
    float seam = smoothstep(1.0 - edge, 1.0, fraction);
    float step = fraction - seam - 0.5 + edge * 0.5;
    bend = direction * step * bandStrength * fade;
    bandShadePhase = step * fade;
    if (bandStyle > 2.5) {
      float variation = mix(hashNoise(vec2(floor(band), 7.3)), hashNoise(vec2(floor(band) + 1.0, 7.3)), seam);
      bend = (normal * (variation - 0.5) * 2.0 + direction * step * 0.22) * bandStrength * fade;
    }
  }
  vec3 color = sampleGradient(position + bend, side);
  if (bands > 0.5 && dispersion > 0.004) {
    color.r = sampleGradient(position + bend * (1.0 - dispersion), side).r;
    color.b = sampleGradient(position + bend * (1.0 + dispersion), side).b;
  }
  if (bands > 0.5) color *= (1.0 + bandShade * 0.55) * (1.0 - bandShade * (0.5 - bandShadePhase));
  vec2 samplePoint = floor(gl_FragCoord.xy / grainSize) + floor(fract(phase * 8.0) * 64.0) * vec2(17.0, 43.0);
  float texture = (grainHash(samplePoint) + grainHash(samplePoint + vec2(53.0, 97.0)) - 1.0) * 0.75;
  color += texture * grain * (1.0 - 0.4 * dot(color, vec3(0.299, 0.587, 0.114)));
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), opacity);
}
`;

const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
const fract = (value) => value - Math.floor(value);
const f32 = Math.fround;
const mix = (first, second, amount) => first + (second - first) * amount;
const smooth = (value) => {
  const amount = Math.max(0, Math.min(1, value));
  return amount * amount * (3 - 2 * amount);
};

function hash(x, y) {
  // Keep the shader's rounding before taking fractional parts of the hash.
  const px = fract(f32(x * f32(123.34)));
  const py = fract(f32(y * f32(456.21)));
  const salt = f32(45.32);
  const offset = f32(f32(px * f32(px + salt)) + f32(py * f32(py + salt)));
  return fract(f32(f32(px + offset) * f32(py + offset)));
}

function fractal(x, y) {
  let value = 0;
  let weight = 0.5;
  for (let octave = 0; octave < 4; octave += 1) {
    const col = Math.floor(x), row = Math.floor(y);
    const u = smooth(x - col), v = smooth(y - row);
    value += weight * mix(mix(hash(col, row), hash(col + 1, row), u), mix(hash(col, row + 1), hash(col + 1, row + 1), u), v);
    const nextX = x * 1.6 - y * 1.2;
    y = x * 1.2 + y * 1.6;
    x = nextX;
    weight *= 0.5;
  }
  return value;
}

function grainHash(x, y) {
  const a = fract(f32(x * f32(0.1031))), b = fract(f32(y * f32(0.1031)));
  const salt = f32(33.33);
  const biasA = f32(a + salt), biasB = f32(b + salt);
  const offset = f32(f32(f32(a * biasB) + f32(b * biasA)) + f32(a * biasA));
  const ax = f32(a + offset), by = f32(b + offset);
  return fract(f32(f32(ax + by) * ax));
}

export function renderGradientLabFallback(pixels, width, height, outputWidth, outputHeight, settings) {
  const { base, light1, light2, light3, highlight, lightOpacity, flip, phase, rotation, seed, scale, warp,
    intensity, vignette, contrast, opacity, grain, grainSize, shape, bands, bandStyle, bandAngle, bandSpeed,
    bandStrength, bandShade, dispersion, softness, focusRadius, focus } = settings;
  const [firstLight, secondLight, thirdLight, peakLight] = [light1, light2, light3, highlight].map((light, index) =>
    light.map((value, channel) => mix(base[channel], value, lightOpacity[index])));
  const cosine = Math.cos(rotation), sine = Math.sin(rotation);
  const side = Math.min(outputWidth, outputHeight);
  const aspect = outputWidth / outputHeight;
  const vignetteAspect = Math.min(aspect, 1);
  const diagonalNormal = Math.hypot(1, 0.55);
  const grainPhase = Math.floor(fract(f32(phase * 8)) * 64);
  const bandCos = Math.cos(bandAngle), bandSin = Math.sin(bandAngle);
  const bandEdge = mix(Math.max(0.0005, Math.min(0.3, 1.5 * bands / side)), 0.5, softness);
  const focusX = (focus[0] - 0.5) * outputWidth / side;
  const focusY = (focus[1] - 0.5) * outputHeight / side;
  const bandTravel = phase * bandSpeed;
  const color = [0, 0, 0], fringe = [0, 0, 0];
  const warpedPoint = shape === 8 || shape === 12 ? [0, 0] : null;
  const origin = warpedPoint && [0, 0];
  if (origin) swirl(origin, 0, 0);
  for (let row = 0; row < height; row += 1) {
    const coordY = (1 - (row + 0.5) / height) * outputHeight;
    const y = (coordY - outputHeight / 2) / side;
    const grainY = Math.floor(coordY / grainSize) + grainPhase * 43;
    for (let col = 0; col < width; col += 1) {
      const coordX = (col + 0.5) / width * outputWidth;
      const x = (coordX - outputWidth / 2) / side;
      let bendX = 0, bendY = 0, shade = 1;
      if (bands) {
        const dx = x - focusX, dy = y - focusY;
        const distance = Math.hypot(dx, dy);
        const fade = focusRadius > 0.995 ? 1 : Math.max(0, 1 - distance / (focusRadius * 1.6));
        let along = x * bandCos + y * bandSin;
        if (bandStyle === 1) along = distance;
        else if (bandStyle === 2) along += 0.045 * Math.sin((-x * bandSin + y * bandCos) * 5.5 + bandTravel * 0.5);
        const band = along * bands + bandTravel;
        const fraction = fract(band);
        const seam = smooth((fraction - 1 + bandEdge) / bandEdge);
        const step = fraction - seam - 0.5 + bandEdge * 0.5;
        if (bandStyle === 3) {
          const lane = Math.floor(band);
          const shift = (mix(hash(lane, 7.3), hash(lane + 1, 7.3), seam) - 0.5) * 2;
          bendX = -bandSin * shift + bandCos * step * 0.22;
          bendY = bandCos * shift + bandSin * step * 0.22;
        } else if (bandStyle === 1) {
          const safe = Math.max(distance, 0.0001);
          bendX = dx / safe * step;
          bendY = dy / safe * step;
        } else {
          bendX = bandCos * step;
          bendY = bandSin * step;
        }
        bendX *= bandStrength * fade;
        bendY *= bandStrength * fade;
        shade = (1 + bandShade * 0.55) * (1 - bandShade * (0.5 - step * fade));
      }
      sample(x + bendX, y + bendY, color);
      if (bands && dispersion > 0.004) {
        sample(x + bendX * (1 - dispersion), y + bendY * (1 - dispersion), fringe);
        color[0] = fringe[0];
        sample(x + bendX * (1 + dispersion), y + bendY * (1 + dispersion), fringe);
        color[2] = fringe[2];
      }
      const grainX = Math.floor(coordX / grainSize) + grainPhase * 17;
      const texture = (grainHash(grainX, grainY) + grainHash(grainX + 53, grainY + 97) - 1) * 0.75 * grain;
      const pixel = (row * width + col) * 4;
      const red = color[0] * shade, green = color[1] * shade, blue = color[2] * shade;
      const noise = texture * (1 - 0.4 * (red * 0.299 + green * 0.587 + blue * 0.114));
      pixels[pixel] = (red + noise) * 255;
      pixels[pixel + 1] = (green + noise) * 255;
      pixels[pixel + 2] = (blue + noise) * 255;
      pixels[pixel + 3] = opacity * 255;
    }
  }

  function swirl(out, x, y) {
    const power = warp * (shape === 8 ? 0.24 : 0.11);
    const rounds = shape === 8 ? 4 : 3;
    for (let step = 1; step <= rounds; step += 1) {
      const nextX = x + power / step * Math.sin(step * y * scale * 1.9 + phase * 0.21 + seed * step);
      y += power / step * Math.cos(step * x * scale * 1.6 - phase * 0.17 + seed * 1.3 * step);
      x = nextX;
    }
    out[0] = x;
    out[1] = y;
  }

  function sample(x, y, out) {
    x *= flip[0];
    y *= flip[1];
    const px = x * cosine - y * sine, py = x * sine + y * cosine;
    const u = px * side / outputWidth, v = py * side / outputHeight;
    const qx = px * scale + seed, qy = py * scale + seed;
    const fx = qx + warp * fractal(qx, qy + phase * 0.07);
    const fy = qy + warp * fractal(qx + 5.2 - phase * 0.05, qy + 1.3 - phase * 0.05);
    const zx = fractal(fx + 1.7 + phase * 0.09, fy + 9.2 + phase * 0.09);
    const zy = fractal(fx + 8.3 - phase * 0.06, fy + 2.8 - phase * 0.06);
    const detail = fractal(qx + warp * zx, qy + warp * zy);
    let mask, core = -1, split = 0;
    if (shape === 0 || shape === 7) {
      const vertical = shape === 0 ? v + 0.5 : 0.5 - v;
      const distance = Math.hypot(u, (vertical + 0.06 + 0.04 * Math.sin(phase * 0.3)) * 2);
      mask = 1 - smooth((distance + (0.45 - detail) * 0.75) / 1.15);
    } else if (shape === 1) {
      const ridge = v + 0.18 * Math.sin((u + 0.5) * 3 + phase * 0.25 + detail * 3) + (detail - 0.5) * 0.45;
      mask = Math.exp(-((ridge * 3.2) ** 2)) * 1.15 + 0.35 * Math.exp(-(((ridge + 0.28) * 5) ** 2));
    } else if (shape === 2) {
      mask = smooth((detail + 0.12 * Math.sin(phase * 0.2) - 0.36) / 0.42);
    } else if (shape === 3) {
      mask = 0.55 + 0.45 * detail;
    } else if (shape === 4) {
      const band = (u + v * 0.55) / diagonalNormal + (detail - 0.5) * 0.4 + 0.06 * Math.sin(phase * 0.3);
      mask = Math.exp(-((band * 4.2) ** 2)) * 1.25;
    } else if (shape === 5) {
      mask = 1 - smooth((Math.hypot(u * aspect, v) + (0.45 - detail) * 0.6) / 0.78);
    } else if (shape === 6) {
      mask = 0;
      for (let band = 0; band < 3; band += 1) {
        const distance = v + 0.5 - (0.25 + band * 0.22)
          + 0.06 * Math.sin((u + 0.5) * (2 + band) + phase * (0.2 + band * 0.07) + detail * 2.5);
        mask += Math.exp(-((distance * 9) ** 2)) * (1 - band * 0.18);
      }
      mask *= 1.1;
    } else if (shape === 9) {
      mask = 0.93;
      core = 0;
    } else if (shape === 10) {
      const ringY = py * 1.28;
      const angle = Math.atan2(ringY, px);
      const radius = Math.hypot(px, ringY) + (detail - 0.5) * 0.07 * warp;
      const distance = radius - 0.44;
      const light = 0.5 + 0.5 * Math.cos(angle + 0.9 + phase * 0.15);
      mask = Math.exp(-((distance * 5.5) ** 2)) * (0.25 + 0.75 * light)
        + 0.22 * (1 - smooth(radius / 0.5)) * (1 - light * 0.6);
      core = Math.exp(-((distance * 30) ** 2)) * (0.08 + 1.25 * light * light) * intensity;
    } else if (shape === 11) {
      const ry = py - 0.78;
      const angle = Math.atan2(px, -ry);
      const rays = fractal(angle * 2.4 * scale + seed, phase * 0.11 + seed) * 0.62
        + fractal(angle * 6.5 * scale - seed, phase * 0.19 + 3) * 0.38;
      mask = smooth((rays + (detail - 0.5) * 0.12 - 0.3) / 0.46)
        * Math.exp(-Math.hypot(px, ry) * 0.5) * 2.1 * (1 - smooth((Math.abs(angle) - 0.3) / 1.2));
      core = 0;
    } else {
      const warpScale = warp * (shape === 8 ? 0.12 : 0.1);
      swirl(warpedPoint, px + (zx - 0.5) * warpScale, py + (zy - 0.5) * warpScale);
      const dx = warpedPoint[0] - origin[0], dy = warpedPoint[1] - origin[1];
      if (shape === 8) {
        mask = (1 - smooth(Math.hypot(dx * 0.78, dy) - 0.05)) ** 2;
        core = (1 - smooth((Math.hypot(dx + 0.04, dy + 0.1) - 0.02) / 0.48)) * 1.15 * intensity;
      } else {
        const center = 1 - smooth((Math.hypot((dx + 0.12) * 0.9, dy + 0.06) - 0.14) / 0.42);
        const secondary = (1 - smooth((Math.hypot(dx - 0.62, dy - 0.4) - 0.04) / 0.42)) * 0.7;
        mask = center ** 2 * (3 - 2 * center) + secondary;
        split = secondary / (mask + 0.001);
        core = Math.exp(-(((dx - 0.1) ** 2 + (dy - 0.16) ** 2) / 0.05)) * 0.85 * intensity;
      }
    }
    const amount = Math.min(1.5, mask * intensity);
    const strength = Math.min(amount, 1);
    const glow = core < 0 ? smooth((strength * detail * 1.25 - 0.55) / 0.45) * 0.85 : smooth((core - 0.3) / 0.7) * 0.94;
    const edge = 1 - vignette * ((u * vignetteAspect) ** 2 + v ** 2) * 1.96;
    const tintX = shape === 12 ? smooth((zx - 0.25) / 0.5) : smooth((zx - 0.2) / 0.6);
    const tintY = smooth((zy - 0.45) / 0.5);
    const cornerX = shape === 9 ? smooth((u + 0.62 + (zx - 0.5) * warp * 0.55) / 1.24) : 0;
    const cornerY = shape === 9 ? smooth((v + 0.62 + (zy - 0.5) * warp * 0.55) / 1.24) : 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const first = firstLight[channel], second = secondLight[channel], third = thirdLight[channel], peak = peakLight[channel];
      let tint = mix(mix(first, second, tintX), third, tintY);
      if (shape === 9) tint = mix(mix(third, peak, cornerX), mix(first, second, cornerX), cornerY);
      if (shape === 12) tint = mix(mix(first, third, tintX), second, split);
      out[channel] = Math.max(0, mix(mix(base[channel], tint, strength), peak, glow) + tint * (amount - strength) * 0.5) ** contrast * edge;
    }
  }
}

const bandStyles = { parallel: 0, radial: 1, wave: 2, shards: 3 };

export function gradientLabUniforms(pattern, time, shape) {
  const [base, light1, light2, light3, highlight] = pattern.colors.map(rgb);
  const { scale, warp, seed, grain, grainSize, intensity, vignette, contrast, opacity,
    bands, bandStyle, bandAngle, bandStrength, bandSpeed, bandShade, dispersion, softness, focusRadius, focusX, focusY } = pattern;
  return { base, light1, light2, light3, highlight, scale, warp, seed, grain, grainSize, intensity, vignette, contrast, opacity, shape,
    phase: pattern.phase + (pattern.animated ? time * pattern.speed : 0),
    flip: [pattern.flipX ? -1 : 1, pattern.flipY ? -1 : 1],
    rotation: pattern.rotation * Math.PI / 180, lightOpacity: pattern.lightOpacity,
    bands: pattern.refraction ? bands : 0, bandStyle: bandStyles[bandStyle], bandAngle: bandAngle * Math.PI / 180,
    bandStrength, bandSpeed, bandShade, dispersion, softness, focusRadius, focus: [focusX, focusY] };
}
