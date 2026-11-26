export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function readHex(value) {
  const match = value.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].toLowerCase();
  return '#' + (hex.length === 3 ? [...hex].map((digit) => digit.repeat(2)).join('') : hex);
}

export const toRgb = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
export const toHex = (rgb) => '#' + rgb.map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('');

export function toHsv(hex, hue = 0) {
  const [r, g, b] = toRgb(hex).map((value) => value / 255);
  const v = Math.max(r, g, b);
  const chroma = v - Math.min(r, g, b);
  let h = hue;
  if (chroma) {
    const turn = v === r ? (g - b) / chroma : v === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    h = (60 * turn + 360) % 360;
  }
  return { h, s: v ? chroma / v : 0, v };
}

export function hsvHex({ h, s, v }) {
  return toHex([5, 3, 1].map((offset) => {
    const sector = (offset + h / 60) % 6;
    return 255 * (v - v * s * Math.max(0, Math.min(sector, 4 - sector, 1)));
  }));
}

export function mixColor(left, right, ratio) {
  const start = toRgb(left);
  return toHex(toRgb(right).map((value, index) => start[index] + (value - start[index]) * ratio));
}

export const inkFor = (color) => {
  const [r, g, b] = toRgb(color).map((value) => {
    const srgb = value / 255;
    return srgb < 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000' : '#fff';
};

export function makeShades(color, count) {
  const middle = Math.floor(count / 2);
  return Array.from({ length: count }, (_, index) => index <= middle
    ? mixColor('#ffffff', color, 0.08 + 0.92 * index / middle)
    : mixColor(color, '#000000', 0.9 * (index - middle) / (count - middle - 1)));
}

export function makeRamp(left, right, count) {
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    return { color: mixColor(left, right, ratio), at: Math.round(100 * ratio) };
  });
}
