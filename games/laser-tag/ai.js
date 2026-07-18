import { DIRS, GRID_W, GRID_H, queueDirection } from './game.js';

const LOOKAHEAD = 40;
const MIN_ESCAPE = 1;
const FLOOD_CAP = 5000;
// Only start considering a turn when the path ahead is this short.
const DANGER_CELLS = 10;
// Immediate crash next step — must turn if any side is open.
const CRITICAL_CELLS = 2;
const THREAT_RANGE = 8;

function gridIndex(cx, cy) {
  return cy * GRID_W + cx;
}

function inBounds(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

/** Occupancy plus other ships' heads and imminent next cells. */
function buildPlanGrid(occupancy, self, ships) {
  const grid = new Uint8Array(occupancy);
  for (const other of ships) {
    if (!other.alive || other === self) continue;
    grid[gridIndex(other.cx, other.cy)] = 255;
    const d = DIRS[other.dir];
    const nx = other.cx + d.dx;
    const ny = other.cy + d.dy;
    if (inBounds(nx, ny)) {
      grid[gridIndex(nx, ny)] = 255;
    }
  }
  return grid;
}

function countClearCells(grid, cx, cy, dir, maxDist) {
  const { dx, dy } = DIRS[dir];
  let count = 0;
  let x = cx;
  let y = cy;
  for (let i = 0; i < maxDist; i++) {
    x += dx;
    y += dy;
    if (!inBounds(x, y) || grid[gridIndex(x, y)]) break;
    count++;
  }
  return count;
}

function floodFillArea(grid, startX, startY) {
  if (!inBounds(startX, startY) || grid[gridIndex(startX, startY)]) {
    return 0;
  }

  const start = gridIndex(startX, startY);
  const visited = new Uint8Array(GRID_W * GRID_H);
  const queue = new Int32Array(FLOOD_CAP);
  let head = 0;
  let tail = 0;

  visited[start] = 1;
  queue[tail++] = start;
  let count = 0;

  while (head < tail) {
    const cell = queue[head++];
    count++;
    if (count >= FLOOD_CAP) break;

    const cx = cell % GRID_W;
    const cy = (cell / GRID_W) | 0;
    const neighbors = [
      cx > 0 ? cell - 1 : -1,
      cx < GRID_W - 1 ? cell + 1 : -1,
      cy > 0 ? cell - GRID_W : -1,
      cy < GRID_H - 1 ? cell + GRID_W : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && !visited[n] && !grid[n] && tail < FLOOD_CAP) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  return count;
}

function scoreDirection(grid, ship, dir) {
  const d = DIRS[dir];
  const nx = ship.cx + d.dx;
  const ny = ship.cy + d.dy;
  const clear = countClearCells(grid, ship.cx, ship.cy, dir, LOOKAHEAD);
  const area = floodFillArea(grid, nx, ny);
  // Prefer open space; use ray length as a tie-breaker; prefer board center last.
  const centerDist =
    Math.abs(nx - GRID_W / 2) + Math.abs(ny - GRID_H / 2);
  return { dir, clear, area, centerDist };
}

function betterScore(a, b) {
  if (a.area !== b.area) return a.area > b.area;
  if (a.clear !== b.clear) return a.clear > b.clear;
  return a.centerDist < b.centerDist;
}

function pickBest(scores) {
  let best = null;
  for (const s of scores) {
    if (s.clear < MIN_ESCAPE && s.area <= 0) continue;
    if (!best || betterScore(s, best)) best = s;
  }
  return best;
}

function imminentThreat(self, ships, dir) {
  const { dx, dy } = DIRS[dir];
  for (let i = 1; i <= THREAT_RANGE; i++) {
    const x = self.cx + dx * i;
    const y = self.cy + dy * i;
    if (!inBounds(x, y)) break;
    for (const other of ships) {
      if (!other.alive || other === self) continue;
      if (other.cx === x && other.cy === y) return true;
      const od = DIRS[other.dir];
      if (other.cx + od.dx === x && other.cy + od.dy === y) return true;
      if ((other.dir + 2) % 4 === dir) {
        const closing = (other.cx - self.cx) * dx + (other.cy - self.cy) * dy;
        const across = Math.abs((other.cx - self.cx) * dy - (other.cy - self.cy) * dx);
        if (across === 0 && closing > 0 && closing <= THREAT_RANGE * 2) return true;
      }
    }
  }
  return false;
}

/**
 * Survival AI with almost no randomness:
 * go straight unless the path ahead is short / threatened, and only turn when
 * a side has strictly more reachable area than continuing straight (so bots
 * don't wander into smaller pockets).
 */
export function updateAI(ship, occupancy, ships) {
  const grid = buildPlanGrid(occupancy, ship, ships);
  const leftDir = (ship.dir + 3) % 4;
  const rightDir = (ship.dir + 1) % 4;

  const ahead = scoreDirection(grid, ship, ship.dir);
  const left = scoreDirection(grid, ship, leftDir);
  const right = scoreDirection(grid, ship, rightDir);

  const mustTurn = ahead.clear <= CRITICAL_CELLS;
  const shouldConsider =
    mustTurn ||
    ahead.clear <= DANGER_CELLS ||
    imminentThreat(ship, ships, ship.dir);

  if (!shouldConsider) {
    return;
  }

  // Critical: take any escape with the most space (including straight if somehow open).
  if (mustTurn) {
    const best = pickBest([ahead, left, right]);
    if (best && best.dir !== ship.dir) {
      queueDirection(ship, best.dir);
    }
    return;
  }

  // Non-critical: only turn if a side opens MORE space than going straight.
  // This is what stops bots from randomly sealing themselves into traps.
  const sides = [left, right].filter((s) => s.clear >= MIN_ESCAPE);
  if (sides.length === 0) {
    return;
  }

  const bestSide = pickBest(sides);
  if (!bestSide) return;

  if (bestSide.area > ahead.area) {
    queueDirection(ship, bestSide.dir);
  }
}
