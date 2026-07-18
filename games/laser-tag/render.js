import { GRID_W, GRID_H, CELL_SIZE, CANVAS_W, CANVAS_H, PLAYER_DEFS } from './game.js';

const BG_COLOR = '#0a0a12';

// Pentagon head (local 0–7) facing RIGHT: thick square body, short pointed tip.
// ######..
// #######.
// ########
// ########
// ########
// ########
// #######.
// ######..
const PENTAGON_RIGHT = [
  [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7],
];

function rotatePixel(x, y, dir) {
  switch (dir) {
    case 0:
      return [x, y];
    case 1:
      return [CELL_SIZE - 1 - y, x];
    case 2:
      return [CELL_SIZE - 1 - x, CELL_SIZE - 1 - y];
    case 3:
      return [y, CELL_SIZE - 1 - x];
    default:
      return [x, y];
  }
}

function pentagonPixels(dir) {
  return PENTAGON_RIGHT.map(([x, y]) => rotatePixel(x, y, dir));
}

export function drawFrame(ctx, game) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Skip living ships' head cells so the same-colored pentagon isn't buried under a solid square.
  const headKeys = new Set();
  for (const ship of game.ships) {
    if (ship.alive) {
      headKeys.add(`${ship.cx},${ship.cy}`);
    }
  }

  drawTrails(ctx, game.occupancy, headKeys);

  for (const ship of game.ships) {
    if (ship.alive) {
      drawShip(ctx, ship);
    }
  }

  for (const p of game.particles) {
    drawParticle(ctx, p);
  }
}

function drawTrails(ctx, occupancy, headKeys) {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const owner = occupancy[y * GRID_W + x];
      if (owner === 0) continue;
      if (headKeys.has(`${x},${y}`)) continue;
      ctx.fillStyle = PLAYER_DEFS[owner - 1].color;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawShip(ctx, ship) {
  ctx.fillStyle = ship.color;
  const originX = ship.cx * CELL_SIZE;
  const originY = ship.cy * CELL_SIZE;
  for (const [px, py] of pentagonPixels(ship.dir)) {
    ctx.fillRect(originX + px, originY + py, 1, 1);
  }
}

function drawParticle(ctx, particle) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;
  const px = Math.floor(particle.x * CELL_SIZE);
  const py = Math.floor(particle.y * CELL_SIZE);
  ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
  ctx.globalAlpha = 1;
}
