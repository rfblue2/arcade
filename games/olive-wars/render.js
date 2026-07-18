import {
  CANVAS_W,
  CANVAS_H,
  GROUND_Y,
  GROUND_HEIGHT,
  aimRadians,
  muzzlePoint,
} from './game.js';

export function createSpriteMap(images) {
  return images;
}

/** Soft late-90s sky + ground backdrop (drawn procedurally). */
function drawBackdrop(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#7ec8e8');
  sky.addColorStop(0.55, '#b8dff0');
  sky.addColorStop(1, '#d9eef7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // Soft cloud blobs
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  drawCloud(ctx, 80, 70, 1.1);
  drawCloud(ctx, 280, 40, 0.85);
  drawCloud(ctx, 520, 90, 1.25);
  drawCloud(ctx, 640, 50, 0.7);

  // Distant hills
  ctx.fillStyle = '#8fbc6a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(120, GROUND_Y - 55, 240, GROUND_Y - 20);
  ctx.quadraticCurveTo(360, GROUND_Y - 70, 480, GROUND_Y - 18);
  ctx.quadraticCurveTo(600, GROUND_Y - 50, 720, GROUND_Y - 28);
  ctx.lineTo(720, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7aaa58';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(160, GROUND_Y - 30, 320, GROUND_Y - 8);
  ctx.quadraticCurveTo(500, GROUND_Y - 40, 720, GROUND_Y - 12);
  ctx.lineTo(720, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Ground strip
  const dirt = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  dirt.addColorStop(0, '#8b5a2b');
  dirt.addColorStop(0.2, '#a06a35');
  dirt.addColorStop(1, '#6e4420');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, GROUND_HEIGHT);

  // Grass fringe
  ctx.fillStyle = '#5a9a3a';
  ctx.fillRect(0, GROUND_Y - 6, CANVAS_W, 10);
  ctx.fillStyle = '#6db33f';
  for (let x = 0; x < CANVAS_W; x += 10) {
    const h = 4 + ((x * 17) % 7);
    ctx.fillRect(x, GROUND_Y - 6 - h, 3, h + 2);
  }
}

function drawCloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, 36 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 28 * s, y - 6 * s, 28 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 50 * s, y + 2 * s, 32 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 22 * s, y + 8 * s, 30 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSprite(ctx, img, x, y, w, h, facing = 1) {
  if (!img) return;
  ctx.save();
  if (facing < 0) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

export function drawFrame(ctx, game, sprites) {
  // Soften a touch — late-90s prerender feel, not hard pixels
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';

  drawBackdrop(ctx);

  for (const v of game.veggies) {
    const img = sprites[v.type];
    if (v.falling) {
      ctx.save();
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const tilt = Math.min(0.9, v.vy / 400);
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.drawImage(img, -v.w / 2, -v.h / 2, v.w, v.h);
      ctx.restore();
    } else {
      drawSprite(ctx, img, v.x, v.y, v.w, v.h, 1);
    }
  }

  for (const p of game.pimentos) {
    drawPimento(ctx, sprites.pimento, p);
  }

  for (const olive of game.olives) {
    if (!olive.alive) continue;
    if (game.phase === 'playing') {
      drawAimGuide(ctx, olive);
    }
    drawSprite(ctx, sprites[olive.sprite], olive.x, olive.y, olive.w, olive.h, olive.facing);
  }

  for (const e of game.explosions) {
    const t = 1 - e.life / e.maxLife;
    const scale = 0.55 + t * 0.9;
    const alpha = Math.max(0, e.life / e.maxLife);
    const size = e.radius * 2 * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      sprites.explosion,
      e.x - size / 2,
      e.y - size / 2 - 10,
      size,
      size,
    );
    ctx.restore();
  }

  // Score plaque
  if (game.phase === 'playing' || game.phase === 'gameOver') {
    ctx.fillStyle = 'rgba(20, 12, 8, 0.55)';
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.7)';
    ctx.lineWidth = 2;
    roundRect(ctx, 12, 12, 150, 36, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe28a';
    ctx.font = 'bold 18px "Trebuchet MS", "Comic Sans MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE  ${game.score}`, 24, 36);
  }
}

function drawPimento(ctx, img, p) {
  if (!img) return;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  // Sprite points "up" by default; rotate by aim angle from vertical.
  ctx.rotate(p.angle || 0);
  ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();
}

function drawAimGuide(ctx, olive) {
  const ang = aimRadians(olive);
  const muzzle = muzzlePoint(olive);
  const len = 54 + olive.aimDeg * 0.35;
  const ex = muzzle.x + Math.sin(ang) * len;
  const ey = muzzle.y - Math.cos(ang) * len;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 80, 70, 0.75)';
  ctx.fillStyle = 'rgba(255, 80, 70, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(muzzle.x, muzzle.y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow tip
  ctx.beginPath();
  ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Tiny angle readout near olive when not straight up
  if (olive.aimDeg > 0.5) {
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(40, 20, 10, 0.7)';
    ctx.textAlign = 'center';
    const label = `${Math.round(olive.aimDeg)}°`;
    ctx.fillText(label, olive.x + olive.w / 2, olive.y - 6);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
