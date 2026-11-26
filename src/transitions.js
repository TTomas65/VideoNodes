import { hexColor, range } from './background';

export const transitionEffects = {
  dissolve: 'Áttűnés',
  spin: 'Kipördülés',
  shatter: 'Darabokra esés',
  page: 'Lapozás',
  push: 'Oldalirányú tolás',
  wipe: 'Átlós törlés',
  iris: 'Körkörös nyitás',
  zoom: 'Nagyításos váltás',
  dip: 'Elsötétítés',
};
export const maxTransitionSeconds = 5;

const horizontal = { left: 'Balra', right: 'Jobbra' };
export const curveField = { key: 'curve', label: 'Időgörbe', value: 'smooth', choices: {
  smooth: 'Simított', linear: 'Egyenletes', 'ease-in': 'Gyorsuló', 'ease-out': 'Lassuló',
} };
export const transitionFields = {
  dissolve: [{ key: 'midpoint', label: 'Keverési középpont', min: 20, max: 80, value: 50, unit: '%' }],
  spin: [{ key: 'angle', label: 'Fordulat', min: 45, max: 540, value: 153, unit: '°' },
    { key: 'direction', label: 'Forgásirány', value: 'clockwise', choices: { clockwise: 'Óramutató szerint', counterclockwise: 'Óramutatóval szemben' } }],
  shatter: [{ key: 'columns', label: 'Oszlopok száma', min: 3, max: 10, value: 6 },
    { key: 'spread', label: 'Szóródás', min: 40, max: 180, value: 100, unit: '%' }],
  page: [{ key: 'curl', label: 'Hajtás szélessége', min: 5, max: 35, value: 18, unit: '%' },
    { key: 'direction', label: 'Lapozás iránya', value: 'left', choices: horizontal }],
  push: [{ key: 'direction', label: 'Tolás iránya', value: 'left', choices: { ...horizontal, up: 'Felfelé', down: 'Lefelé' } }],
  wipe: [{ key: 'tilt', label: 'Dőlés', min: 0, max: 65, value: 30, unit: '%' },
    { key: 'direction', label: 'Törlés iránya', value: 'right', choices: horizontal }],
  iris: [{ key: 'centerX', label: 'Középpont vízszintesen', min: 0, max: 100, value: 50, unit: '%' },
    { key: 'centerY', label: 'Középpont függőlegesen', min: 0, max: 100, value: 50, unit: '%' }],
  zoom: [{ key: 'strength', label: 'Nagyítás mértéke', min: 20, max: 160, value: 85, unit: '%' }],
  dip: [{ key: 'color', label: 'Köztes szín', value: '#000000', color: true }],
};

const optionDefaults = Object.fromEntries(Object.entries(transitionFields).map(([effect, fields]) =>
  [effect, Object.fromEntries([curveField, ...fields].map(({ key, value }) => [key, value]))]));
export const transitionOptions = (effect, options) => ({ ...optionDefaults[effect], ...options });

export function readTransitionTuning(value) {
  const tuning = {};
  for (const [effect, fields] of Object.entries(transitionFields)) {
    const saved = value?.[effect];
    if (!saved || typeof saved !== 'object') continue;
    tuning[effect] = Object.fromEntries([curveField, ...fields].map(({ key, value, min, max, color, choices }) => [key,
      choices ? (Object.hasOwn(choices, saved[key]) ? saved[key] : value)
        : color ? hexColor(saved[key], value) : Math.round(range(saved[key], min, max, value)),
    ]));
  }
  return tuning;
}

function drawPieces(ctx, image, width, height, progress, { columns, spread }) {
  const rows = Math.round(columns * 2 / 3);
  const tileWidth = width / columns;
  const tileHeight = height / rows;
  const travel = progress * spread / 100;
  ctx.globalAlpha = 1 - progress;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tile = row * columns + column;
      const x = column * tileWidth;
      const y = row * tileHeight;
      ctx.save();
      ctx.translate(x + tileWidth / 2 + (column - (columns - 1) / 2) * tileWidth * travel * 0.7,
        y + tileHeight / 2 + height * progress * travel * (0.4 + (tile % 5) * 0.1));
      ctx.rotate(((tile % 7) - 3) * progress * 0.48);
      ctx.drawImage(image, x, y, tileWidth, tileHeight, -tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);
      ctx.restore();
    }
  }
}

function drawPage(ctx, image, width, height, progress, settings) {
  const fold = width * (1 - progress);
  const curl = Math.min(width * settings.curl / 100, fold, width - fold);
  const reverse = settings.direction === 'right';
  const edge = reverse ? width - fold : fold;
  const sheet = reverse ? edge : 0;
  if (fold > 0) ctx.drawImage(image, sheet, 0, fold, height, sheet, 0, fold, height);
  if (curl <= 0) return;
  const flap = reverse ? edge - curl : edge;
  ctx.save();
  ctx.translate(flap + curl, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, reverse ? edge : edge - curl, 0, curl, height, 0, 0, curl, height);
  ctx.restore();
  const shade = ctx.createLinearGradient(edge + curl * (reverse ? 0.4 : -0.4), 0, edge + curl * (reverse ? -1 : 1), 0);
  shade.addColorStop(0, 'transparent');
  shade.addColorStop(0.28, '#0008');
  shade.addColorStop(0.57, '#fff6');
  shade.addColorStop(1, '#0005');
  ctx.fillStyle = shade;
  ctx.fillRect(reverse ? flap : edge - curl * 0.4, 0, curl * 1.4, height);
}

const directions = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export function drawTransition(ctx, effect, outgoing, incoming, progress, options) {
  const { width, height } = outgoing;
  const amount = Math.max(0, Math.min(1, progress));
  if (amount === 0 || amount === 1) {
    ctx.drawImage(amount === 0 ? outgoing : incoming, 0, 0);
    return;
  }
  const settings = transitionOptions(effect, options);
  const eased = settings.curve === 'linear' ? amount
    : settings.curve === 'ease-in' ? amount ** 2 : settings.curve === 'ease-out' ? 1 - (1 - amount) ** 2
      : amount * amount * (3 - 2 * amount);
  ctx.save();
  switch (effect) {
    case 'spin': {
      ctx.drawImage(incoming, 0, 0);
      ctx.translate(width / 2, height / 2);
      ctx.rotate(eased * settings.angle * Math.PI / 180 * (settings.direction === 'counterclockwise' ? -1 : 1));
      const scale = 1 - eased * 0.92;
      ctx.scale(scale, scale);
      ctx.globalAlpha = 1 - eased;
      ctx.drawImage(outgoing, -width / 2, -height / 2);
      break;
    }
    case 'shatter':
      ctx.drawImage(incoming, 0, 0);
      drawPieces(ctx, outgoing, width, height, eased, settings);
      break;
    case 'page':
      ctx.drawImage(incoming, 0, 0);
      drawPage(ctx, outgoing, width, height, eased, settings);
      break;
    case 'push': {
      const [dx, dy] = directions[settings.direction];
      const x = Math.round(width * eased);
      const y = Math.round(height * eased);
      ctx.drawImage(outgoing, dx * x, dy * y);
      ctx.drawImage(incoming, dx * (x - width), dy * (y - height));
      break;
    }
    case 'wipe': {
      ctx.drawImage(outgoing, 0, 0);
      const tilt = width * settings.tilt / 100;
      const x = (width + tilt) * eased - tilt;
      const orient = (value) => settings.direction === 'left' ? width - value : value;
      ctx.beginPath();
      ctx.moveTo(orient(0), 0);
      ctx.lineTo(orient(x + tilt), 0);
      ctx.lineTo(orient(x), height);
      ctx.lineTo(orient(0), height);
      ctx.clip();
      ctx.drawImage(incoming, 0, 0);
      break;
    }
    case 'iris': {
      ctx.drawImage(outgoing, 0, 0);
      const x = width * settings.centerX / 100;
      const y = height * settings.centerY / 100;
      const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
      ctx.beginPath();
      ctx.arc(x, y, radius * eased, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(incoming, 0, 0);
      break;
    }
    case 'zoom': {
      ctx.drawImage(incoming, 0, 0);
      const scale = 1 + eased * settings.strength / 100;
      ctx.globalAlpha = 1 - eased;
      ctx.drawImage(outgoing, width * (1 - scale) / 2, height * (1 - scale) / 2, width * scale, height * scale);
      break;
    }
    case 'dip':
      ctx.fillStyle = settings.color;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = Math.abs(2 * eased - 1);
      ctx.drawImage(eased < 0.5 ? outgoing : incoming, 0, 0);
      break;
    default: {
      ctx.drawImage(outgoing, 0, 0);
      const midpoint = (settings.midpoint ?? 50) / 100;
      ctx.globalAlpha = eased < midpoint ? 0.5 * eased / midpoint : 0.5 + 0.5 * (eased - midpoint) / (1 - midpoint);
      ctx.drawImage(incoming, 0, 0);
      break;
    }
  }
  ctx.restore();
}
