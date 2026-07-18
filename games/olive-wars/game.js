export const CANVAS_W = 720;
export const CANVAS_H = 480;
export const GROUND_Y = 430;
export const GROUND_HEIGHT = 50;

export const PLAYER_DEFS = [
  {
    id: 0,
    name: 'Player 1',
    sprite: 'olive_green',
    keys: { left: 'ArrowLeft', right: 'ArrowRight', shoot: 'Space' },
    displayKeys: '← →  SPACE',
    color: '#6db33f',
  },
  {
    id: 1,
    name: 'Player 2',
    sprite: 'olive_black',
    keys: { left: 'KeyA', right: 'KeyD', shoot: 'KeyF' },
    displayKeys: 'A D  F',
    color: '#3a2048',
  },
];

export const VEGGIE_TYPES = [
  { id: 'broccoli', w: 52, h: 48, points: 1 },
  { id: 'mushroom', w: 44, h: 44, points: 1 },
  { id: 'tomato', w: 56, h: 36, points: 1 },
  { id: 'eggplant', w: 40, h: 52, points: 1 },
];

const OLIVE_W = 48;
const OLIVE_H = 54;
const PIMENTO_W = 14;
const PIMENTO_H = 12;
const OLIVE_SPEED = 260;
const PIMENTO_SPEED = 420;
const SHOOT_COOLDOWN = 0.28;
const FALL_GRAVITY = 520;
const EXPLOSION_LIFE = 0.55;
const EXPLOSION_RADIUS = 48;
const BASE_SPAWN = 1.35;
const MIN_SPAWN = 0.45;

function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export class Game {
  constructor() {
    this.phase = 'setup';
    this.playerCount = 1;
    this.olives = [];
    this.pimentos = [];
    this.veggies = [];
    this.explosions = [];
    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0.8;
    this.paused = false;
    this.hitOlive = null;
  }

  configure(playerCount) {
    this.playerCount = playerCount;
    this.olives = [];
    const spacing = CANVAS_W / (playerCount + 1);
    for (let i = 0; i < playerCount; i++) {
      const def = PLAYER_DEFS[i];
      this.olives.push({
        id: def.id,
        name: def.name,
        sprite: def.sprite,
        keys: def.keys,
        color: def.color,
        x: spacing * (i + 1) - OLIVE_W / 2,
        y: GROUND_Y - OLIVE_H,
        w: OLIVE_W,
        h: OLIVE_H,
        vx: 0,
        facing: 1,
        shootCd: 0,
        alive: true,
        moveLeft: false,
        moveRight: false,
      });
    }
  }

  beginPlay() {
    this.phase = 'playing';
    this.pimentos = [];
    this.veggies = [];
    this.explosions = [];
    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0.9;
    this.paused = false;
    this.hitOlive = null;
    for (const o of this.olives) {
      o.alive = true;
      o.vx = 0;
      o.shootCd = 0;
      o.moveLeft = false;
      o.moveRight = false;
    }
  }

  endGame(hitOlive) {
    this.phase = 'gameOver';
    this.hitOlive = hitOlive;
    this.paused = false;
  }

  tryShoot(olive) {
    if (this.phase !== 'playing' || this.paused || !olive.alive) return;
    if (olive.shootCd > 0) return;
    olive.shootCd = SHOOT_COOLDOWN;
    this.pimentos.push({
      x: olive.x + olive.w / 2 - PIMENTO_W / 2,
      y: olive.y - 4,
      w: PIMENTO_W,
      h: PIMENTO_H,
      vy: -PIMENTO_SPEED,
      ownerId: olive.id,
    });
  }

  spawnVeggie() {
    const type = VEGGIE_TYPES[(Math.random() * VEGGIE_TYPES.length) | 0];
    const difficulty = Math.min(1, this.elapsed / 90);
    const speed = 70 + Math.random() * 50 + difficulty * 80;
    const minY = 36;
    const maxY = GROUND_Y - 160;
    const y = minY + Math.random() * (maxY - minY);
    const bobAmp = 8 + Math.random() * 10;
    const bobSpeed = 1.5 + Math.random() * 2;
    this.veggies.push({
      type: type.id,
      x: -type.w - 8,
      y,
      w: type.w,
      h: type.h,
      vx: speed,
      vy: 0,
      baseY: y,
      bobAmp,
      bobSpeed,
      bobPhase: Math.random() * Math.PI * 2,
      falling: false,
      alive: true,
      points: type.points,
    });
  }

  update(dt) {
    if (this.phase !== 'playing' || this.paused) {
      this.updateExplosions(dt);
      return;
    }

    this.elapsed += dt;

    for (const olive of this.olives) {
      if (!olive.alive) continue;
      let dir = 0;
      if (olive.moveLeft) dir -= 1;
      if (olive.moveRight) dir += 1;
      olive.vx = dir * OLIVE_SPEED;
      if (dir !== 0) olive.facing = dir;
      olive.x += olive.vx * dt;
      olive.x = Math.max(4, Math.min(CANVAS_W - olive.w - 4, olive.x));
      olive.y = GROUND_Y - olive.h;
      if (olive.shootCd > 0) olive.shootCd -= dt;
    }

    for (const p of this.pimentos) {
      p.y += p.vy * dt;
    }
    this.pimentos = this.pimentos.filter((p) => p.y + p.h > -20);

    const spawnInterval = Math.max(MIN_SPAWN, BASE_SPAWN - this.elapsed * 0.012 - this.score * 0.015);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnVeggie();
      this.spawnTimer = spawnInterval * (0.75 + Math.random() * 0.5);
    }

    for (const v of this.veggies) {
      if (!v.alive) continue;
      if (v.falling) {
        v.vy += FALL_GRAVITY * dt;
        v.y += v.vy * dt;
        v.x += v.vx * 0.15 * dt;
        if (v.y + v.h >= GROUND_Y) {
          v.alive = false;
          const cx = v.x + v.w / 2;
          const cy = GROUND_Y - 8;
          this.explosions.push({
            x: cx,
            y: cy,
            life: EXPLOSION_LIFE,
            maxLife: EXPLOSION_LIFE,
            radius: EXPLOSION_RADIUS,
          });
          for (const olive of this.olives) {
            if (!olive.alive) continue;
            const hitPad = 6;
            if (
              circleRect(
                cx,
                cy,
                EXPLOSION_RADIUS * 0.72,
                olive.x + hitPad,
                olive.y + hitPad,
                olive.w - hitPad * 2,
                olive.h - hitPad * 2,
              )
            ) {
              olive.alive = false;
              this.endGame(olive);
              break;
            }
          }
        }
      } else {
        v.x += v.vx * dt;
        v.bobPhase += v.bobSpeed * dt;
        v.y = v.baseY + Math.sin(v.bobPhase) * v.bobAmp;
        if (v.x > CANVAS_W + 40) {
          v.alive = false;
        }
      }
    }

    // Pimento ↔ flying veggie
    for (const p of this.pimentos) {
      p._dead = false;
    }
    for (const p of this.pimentos) {
      if (p._dead) continue;
      for (const v of this.veggies) {
        if (!v.alive || v.falling) continue;
        const pad = 4;
        if (aabb(p.x, p.y, p.w, p.h, v.x + pad, v.y + pad, v.w - pad * 2, v.h - pad * 2)) {
          v.falling = true;
          v.vy = 40;
          v.vx *= 0.25;
          this.score += v.points;
          p._dead = true;
          break;
        }
      }
    }
    this.pimentos = this.pimentos.filter((p) => !p._dead);
    this.veggies = this.veggies.filter((v) => v.alive);

    this.updateExplosions(dt);
  }

  updateExplosions(dt) {
    for (const e of this.explosions) {
      e.life -= dt;
    }
    this.explosions = this.explosions.filter((e) => e.life > 0);
  }
}
