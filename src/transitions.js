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

function drawPieces(ctx, image, width, height, progress) {
  const columns = 6;
  const rows = 4;
  const tileWidth = width / columns;
  const tileHeight = height / rows;
  ctx.globalAlpha = 1 - progress;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tile = row * columns + column;
      const x = column * tileWidth;
      const y = row * tileHeight;
      ctx.save();
      ctx.translate(x + tileWidth / 2 + (column - (columns - 1) / 2) * tileWidth * progress * 0.7,
        y + tileHeight / 2 + height * progress ** 2 * (0.4 + (tile % 5) * 0.1));
      ctx.rotate(((tile % 7) - 3) * progress * 0.48);
      ctx.drawImage(image, x, y, tileWidth, tileHeight, -tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);
      ctx.restore();
    }
  }
}

function drawPage(ctx, image, width, height, progress) {
  const fold = width * (1 - progress);
  const curl = Math.min(width * 0.18, fold, width - fold);
  if (fold > 0) ctx.drawImage(image, 0, 0, fold, height, 0, 0, fold, height);
  if (curl <= 0) return;
  ctx.save();
  ctx.translate(fold + curl, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, fold - curl, 0, curl, height, 0, 0, curl, height);
  ctx.restore();
  const shade = ctx.createLinearGradient(fold - curl * 0.4, 0, fold + curl, 0);
  shade.addColorStop(0, 'transparent');
  shade.addColorStop(0.28, '#0008');
  shade.addColorStop(0.57, '#fff6');
  shade.addColorStop(1, '#0005');
  ctx.fillStyle = shade;
  ctx.fillRect(fold - curl * 0.4, 0, curl * 1.4, height);
}

export function drawTransition(ctx, effect, outgoing, incoming, progress) {
  const { width, height } = outgoing;
  const amount = Math.max(0, Math.min(1, progress));
  if (amount === 0 || amount === 1) {
    ctx.drawImage(amount === 0 ? outgoing : incoming, 0, 0);
    return;
  }
  const eased = amount * amount * (3 - 2 * amount);
  ctx.save();
  switch (effect) {
    case 'spin': {
      ctx.drawImage(incoming, 0, 0);
      ctx.translate(width / 2, height / 2);
      ctx.rotate(eased * Math.PI * 0.85);
      const scale = 1 - eased * 0.92;
      ctx.scale(scale, scale);
      ctx.globalAlpha = 1 - eased;
      ctx.drawImage(outgoing, -width / 2, -height / 2);
      break;
    }
    case 'shatter':
      ctx.drawImage(incoming, 0, 0);
      drawPieces(ctx, outgoing, width, height, eased);
      break;
    case 'page':
      ctx.drawImage(incoming, 0, 0);
      drawPage(ctx, outgoing, width, height, eased);
      break;
    case 'push': {
      const offset = Math.round(width * eased);
      ctx.drawImage(outgoing, -offset, 0);
      ctx.drawImage(incoming, width - offset, 0);
      break;
    }
    case 'wipe': {
      ctx.drawImage(outgoing, 0, 0);
      const tilt = width * 0.3;
      const x = (width + tilt) * eased - tilt;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x + tilt, 0);
      ctx.lineTo(x, height);
      ctx.lineTo(0, height);
      ctx.clip();
      ctx.drawImage(incoming, 0, 0);
      break;
    }
    case 'iris':
      ctx.drawImage(outgoing, 0, 0);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.hypot(width, height) * eased / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(incoming, 0, 0);
      break;
    case 'zoom': {
      ctx.drawImage(incoming, 0, 0);
      const scale = 1 + eased * 0.85;
      ctx.globalAlpha = 1 - eased;
      ctx.drawImage(outgoing, width * (1 - scale) / 2, height * (1 - scale) / 2, width * scale, height * scale);
      break;
    }
    case 'dip':
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = Math.abs(2 * eased - 1);
      ctx.drawImage(eased < 0.5 ? outgoing : incoming, 0, 0);
      break;
    default:
      ctx.drawImage(outgoing, 0, 0);
      ctx.globalAlpha = eased;
      ctx.drawImage(incoming, 0, 0);
      break;
  }
  ctx.restore();
}
