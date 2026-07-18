export const GRID_W = 72;
export const GRID_H = 48;
export const CELL_SIZE = 8;
export const CANVAS_W = GRID_W * CELL_SIZE;
export const CANVAS_H = GRID_H * CELL_SIZE;
export const STEP_RATE = 12;
export const STEP_DT = 1 / STEP_RATE;

// Axis-aligned directions (0 = right, 1 = down, 2 = left, 3 = up).
export const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
];

export const MAX_PENDING_TURNS = 2;

export function effectiveDir(ship) {
  let dir = ship.dir;
  for (const pending of ship.pendingTurns) {
    dir = pending;
  }
  return dir;
}

export function queueDirection(ship, newDir) {
  const current = effectiveDir(ship);
  if (newDir === current || newDir === (current + 2) % 4) {
    return;
  }
  if (ship.pendingTurns.length < MAX_PENDING_TURNS) {
    ship.pendingTurns.push(newDir);
  }
}

/** Face a direction immediately (countdown pre-start). 180s allowed — no trail yet. */
export function setFacing(ship, newDir) {
  ship.dir = newDir;
  ship.heading = newDir * (Math.PI / 2);
  ship.pendingTurns = [];
}

export const PLAYER_DEFS = [
  {
    id: 0,
    name: 'Player 1',
    color: '#ff3355',
    keys: { up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight' },
    displayKeys: '↑ ← ↓ →',
  },
  {
    id: 1,
    name: 'Player 2',
    color: '#3388ff',
    keys: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' },
    displayKeys: 'W A S D',
  },
  {
    id: 2,
    name: 'Player 3',
    color: '#33ff77',
    keys: { up: 'KeyI', left: 'KeyJ', down: 'KeyK', right: 'KeyL' },
    displayKeys: 'I J K L',
  },
  {
    id: 3,
    name: 'Player 4',
    color: '#ffcc33',
    keys: { up: 'KeyT', left: 'KeyF', down: 'KeyG', right: 'KeyH' },
    displayKeys: 'T F G H',
  },
  {
    id: 4,
    name: 'Player 5',
    color: '#ff44ff',
    keys: { up: 'Numpad8', left: 'Numpad4', down: 'Numpad5', right: 'Numpad6' },
    displayKeys: 'NUM 8456',
  },
  {
    id: 5,
    name: 'Player 6',
    color: '#33eeff',
    keys: { up: 'Home', left: 'Delete', down: 'End', right: 'PageDown' },
    displayKeys: 'HOME DEL END PGDN',
  },
];

export function createShip(def, isHuman) {
  return {
    id: def.id,
    name: def.name,
    color: def.color,
    keys: def.keys,
    isHuman,
    cx: 0,
    cy: 0,
    dir: 0,
    heading: 0,
    alive: true,
    pendingTurns: [],
    aiState: null,
  };
}

function gridIndex(cx, cy) {
  return cy * GRID_W + cx;
}

export function spawnShips(ships, occupancy) {
  const centerX = GRID_W / 2;
  const centerY = GRID_H / 2;
  const radius = Math.min(GRID_W, GRID_H) * 0.35;
  const count = ships.length;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const ship = ships[i];
    ship.cx = Math.round(centerX + Math.cos(angle) * radius);
    ship.cy = Math.round(centerY + Math.sin(angle) * radius);
    const tangential = angle + Math.PI / 2;
    ship.dir = ((Math.round(tangential / (Math.PI / 2)) % 4) + 4) % 4;
    ship.heading = ship.dir * (Math.PI / 2);
    ship.alive = true;
    ship.pendingTurns = [];
    ship.aiState = null;
    occupancy[gridIndex(ship.cx, ship.cy)] = ship.id + 1;
  }
}

export function createParticleBurst(cx, cy, color) {
  const particles = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.2,
      maxLife: 0.55,
      color,
    });
  }
  return particles;
}

export class Game {
  constructor() {
    this.ships = [];
    this.occupancy = new Uint8Array(GRID_W * GRID_H);
    this.particles = [];
    this.accumulator = 0;
    this.phase = 'setup';
    this.winner = null;
    this.roundWins = [0, 0, 0, 0, 0, 0];
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.frozen = false;
    this.paused = false;
  }

  configure(playerConfigs) {
    this.ships = playerConfigs.map((cfg) => createShip(PLAYER_DEFS[cfg.id], cfg.isHuman));
    this.roundWins = this.roundWins.map(() => 0);
  }

  resetOccupancy() {
    this.occupancy.fill(0);
  }

  beginCountdown() {
    this.phase = 'countdown';
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.frozen = true;
    this.paused = false;
    this.winner = undefined;
    this.particles = [];
    this.accumulator = 0;
    this.resetOccupancy();
    spawnShips(this.ships, this.occupancy);
  }

  beginRound() {
    this.phase = 'playing';
    this.frozen = false;
    this.paused = false;
    this.winner = undefined;
  }

  endRound(winner) {
    this.phase = 'roundOver';
    this.frozen = true;
    this.winner = winner;
    if (winner) {
      this.roundWins[winner.id] += 1;
    }
  }

  update(dt, updateAI) {
    if (this.frozen) {
      this.updateParticles(dt);
      return;
    }

    this.accumulator += dt;
    while (this.accumulator >= STEP_DT) {
      this.step(updateAI);
      this.accumulator -= STEP_DT;
    }

    this.updateParticles(dt);
  }

  step(updateAI) {
    const { occupancy, ships } = this;

    for (const ship of ships) {
      if (!ship.alive || ship.isHuman) continue;
      if (ship.pendingTurns.length === 0) {
        updateAI(ship, occupancy, ships);
      }
    }

    // (1) Apply at most one queued turn per living ship.
    for (const ship of ships) {
      if (!ship.alive) continue;
      if (ship.pendingTurns.length > 0) {
        ship.dir = ship.pendingTurns.shift();
        ship.heading = ship.dir * (Math.PI / 2);
      }
    }

    // (2) Compute each ship's next cell.
    const moves = [];
    for (const ship of ships) {
      if (!ship.alive) continue;
      const d = DIRS[ship.dir];
      moves.push({
        ship,
        nx: ship.cx + d.dx,
        ny: ship.cy + d.dy,
      });
    }

    // (3) Resolve deaths: out of bounds, occupied, or head-on same cell.
    const targetCounts = new Map();
    for (const move of moves) {
      const key = `${move.nx},${move.ny}`;
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }

    const dying = new Set();
    for (const move of moves) {
      const { ship, nx, ny } = move;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) {
        dying.add(ship);
        continue;
      }
      if (occupancy[gridIndex(nx, ny)] !== 0) {
        dying.add(ship);
        continue;
      }
      if (targetCounts.get(`${nx},${ny}`) > 1) {
        dying.add(ship);
      }
    }

    const deaths = [...dying];
    for (const ship of deaths) {
      ship.alive = false;
      this.particles.push(...createParticleBurst(ship.cx, ship.cy, ship.color));
    }

    // (4) Survivors move and mark their new cell occupied.
    for (const move of moves) {
      const { ship, nx, ny } = move;
      if (!ship.alive || dying.has(ship)) continue;
      ship.cx = nx;
      ship.cy = ny;
      occupancy[gridIndex(nx, ny)] = ship.id + 1;
    }

    if (deaths.length > 0) {
      const alive = ships.filter((s) => s.alive);
      if (alive.length <= 1) {
        this.endRound(alive.length === 1 ? alive[0] : null);
      }
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateCountdown(dt) {
    this.countdownTimer += dt;
    if (this.countdownTimer >= 1) {
      this.countdownTimer -= 1;
      this.countdownValue -= 1;
      if (this.countdownValue <= 0) {
        this.beginRound();
        return false;
      }
    }
    return true;
  }

  getAliveShips() {
    return this.ships.filter((s) => s.alive);
  }
}
