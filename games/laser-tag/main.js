import { Game, PLAYER_DEFS, queueDirection, setFacing } from './game.js';
import { updateAI } from './ai.js';
import { drawFrame } from './render.js';

const PREVENT_DEFAULT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageDown',
  'Delete',
]);

const KEY_DIR = { up: 3, left: 2, down: 1, right: 0 };

const dom = {
  canvas: document.getElementById('game-canvas'),
  setupScreen: document.getElementById('setup-screen'),
  playerCount: document.getElementById('player-count'),
  playerSlots: document.getElementById('player-slots'),
  startBtn: document.getElementById('start-btn'),
  countdownOverlay: document.getElementById('countdown-overlay'),
  countdownText: document.getElementById('countdown-text'),
  pauseOverlay: document.getElementById('pause-overlay'),
  hud: document.getElementById('hud'),
  hudPlayers: document.getElementById('hud-players'),
  roundOver: document.getElementById('round-over'),
  roundResult: document.getElementById('round-result'),
  scoreboard: document.getElementById('scoreboard'),
  nextRoundBtn: document.getElementById('next-round-btn'),
  changePlayersBtn: document.getElementById('change-players-btn'),
};

const ctx = dom.canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const game = new Game();
let lastTimestamp = 0;
let rafId = 0;
let playerConfigs = buildDefaultConfigs(2);

function buildDefaultConfigs(count) {
  return PLAYER_DEFS.slice(0, count).map((def, i) => ({
    id: def.id,
    isHuman: i === 0,
  }));
}

function renderPlayerSlots() {
  const count = Number(dom.playerCount.value);
  dom.playerSlots.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const def = PLAYER_DEFS[i];
    const cfg = playerConfigs[i] ?? { id: def.id, isHuman: i === 0 };
    playerConfigs[i] = cfg;

    const slot = document.createElement('div');
    slot.className = 'player-slot';

    const swatch = document.createElement('span');
    swatch.className = 'player-slot__swatch';
    swatch.style.background = def.color;
    swatch.style.color = def.color;

    const name = document.createElement('span');
    name.className = 'player-slot__name';
    name.textContent = def.name;

    const select = document.createElement('select');
    select.innerHTML = '<option value="human">Human</option><option value="cpu">CPU</option>';
    select.value = cfg.isHuman ? 'human' : 'cpu';
    select.addEventListener('change', () => {
      cfg.isHuman = select.value === 'human';
      renderPlayerSlots();
    });

    const keys = document.createElement('span');
    keys.className = 'player-slot__keys';
    keys.textContent = cfg.isHuman ? def.displayKeys : '';

    slot.append(swatch, name, select, keys);
    dom.playerSlots.appendChild(slot);
  }

  playerConfigs = playerConfigs.slice(0, count);
}

function showSetup() {
  game.phase = 'setup';
  game.frozen = true;
  dom.setupScreen.classList.remove('overlay--hidden');
  dom.countdownOverlay.classList.add('overlay--hidden');
  dom.pauseOverlay.classList.add('overlay--hidden');
  dom.hud.classList.add('overlay--hidden');
  dom.roundOver.classList.add('overlay--hidden');
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
}

function showCountdown() {
  dom.setupScreen.classList.add('overlay--hidden');
  dom.roundOver.classList.add('overlay--hidden');
  dom.pauseOverlay.classList.add('overlay--hidden');
  dom.countdownOverlay.classList.remove('overlay--hidden');
  dom.hud.classList.remove('overlay--hidden');
  dom.countdownText.textContent = String(game.countdownValue);
}

function showRoundOver() {
  dom.countdownOverlay.classList.add('overlay--hidden');
  dom.pauseOverlay.classList.add('overlay--hidden');
  game.paused = false;
  dom.roundOver.classList.remove('overlay--hidden');

  if (game.winner) {
    dom.roundResult.textContent = `${game.winner.name.toUpperCase()} WINS!`;
    dom.roundResult.style.color = game.winner.color;
    dom.roundResult.style.textShadow = `0 0 16px ${game.winner.color}`;
  } else {
    dom.roundResult.textContent = 'DRAW!';
    dom.roundResult.style.color = '#ffcc33';
    dom.roundResult.style.textShadow = '0 0 16px #ffcc33';
  }

  dom.scoreboard.innerHTML = '';
  for (const ship of game.ships) {
    const row = document.createElement('div');
    row.className = 'scoreboard__row';

    const swatch = document.createElement('span');
    swatch.className = 'player-slot__swatch';
    swatch.style.background = ship.color;
    swatch.style.color = ship.color;

    const label = document.createElement('span');
    label.textContent = ship.name;

    const wins = document.createElement('span');
    wins.className = 'scoreboard__wins';
    wins.textContent = `${game.roundWins[ship.id]} wins`;

    row.append(swatch, label, wins);
    dom.scoreboard.appendChild(row);
  }
}

function updateHud() {
  dom.hudPlayers.innerHTML = '';
  for (const ship of game.getAliveShips()) {
    const item = document.createElement('div');
    item.className = 'hud__player';

    const dot = document.createElement('span');
    dot.className = 'hud__dot';
    dot.style.background = ship.color;
    dot.style.color = ship.color;

    const label = document.createElement('span');
    label.textContent = ship.name;
    label.style.color = ship.color;

    item.append(dot, label);
    dom.hudPlayers.appendChild(item);
  }
}

function directionFromKey(ship, code) {
  if (code === ship.keys.up) return KEY_DIR.up;
  if (code === ship.keys.left) return KEY_DIR.left;
  if (code === ship.keys.down) return KEY_DIR.down;
  if (code === ship.keys.right) return KEY_DIR.right;
  return null;
}

function onKeyDown(event) {
  if (PREVENT_DEFAULT_KEYS.has(event.code)) {
    event.preventDefault();
  }
  if (event.repeat) {
    return;
  }

  if (game.phase === 'playing' && event.code === 'KeyP') {
    game.paused = !game.paused;
    dom.pauseOverlay.classList.toggle('overlay--hidden', !game.paused);
    return;
  }

  // During countdown, lock in starting direction (pentagon updates immediately).
  if (game.phase === 'countdown') {
    for (const ship of game.ships) {
      if (!ship.alive || !ship.isHuman) continue;
      const dir = directionFromKey(ship, event.code);
      if (dir !== null) {
        setFacing(ship, dir);
      }
    }
    return;
  }

  if (game.phase !== 'playing' || game.paused) {
    return;
  }

  for (const ship of game.ships) {
    if (!ship.alive || !ship.isHuman) continue;
    const dir = directionFromKey(ship, event.code);
    if (dir !== null) {
      queueDirection(ship, dir);
    }
  }
}

function startMatch() {
  const count = Number(dom.playerCount.value);
  playerConfigs = [];
  for (let i = 0; i < count; i++) {
    const select = dom.playerSlots.children[i]?.querySelector('select');
    playerConfigs.push({
      id: PLAYER_DEFS[i].id,
      isHuman: select ? select.value === 'human' : i === 0,
    });
  }

  game.configure(playerConfigs);
  game.beginCountdown();
  showCountdown();
  updateHud();
}

function nextRound() {
  game.beginCountdown();
  showCountdown();
  updateHud();
}

function frame(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  if (game.phase === 'countdown') {
    drawFrame(ctx, game);
    const stillCounting = game.updateCountdown(dt);
    dom.countdownText.textContent = game.countdownValue > 0 ? String(game.countdownValue) : 'GO!';
    if (!stillCounting) {
      dom.countdownOverlay.classList.add('overlay--hidden');
      dom.pauseOverlay.classList.add('overlay--hidden');
    }
  } else if (game.phase === 'playing') {
    if (!game.paused) {
      game.update(dt, updateAI);
    }
    drawFrame(ctx, game);
    updateHud();

    if (game.phase === 'roundOver') {
      showRoundOver();
    }
  } else if (game.phase === 'roundOver') {
    game.updateParticles(dt);
    drawFrame(ctx, game);
  }

  rafId = requestAnimationFrame(frame);
}

function init() {
  renderPlayerSlots();

  dom.playerCount.addEventListener('change', () => {
    const count = Number(dom.playerCount.value);
    playerConfigs = buildDefaultConfigs(count);
    for (let i = 2; i < count; i++) {
      playerConfigs[i].isHuman = false;
    }
    renderPlayerSlots();
  });

  dom.startBtn.addEventListener('click', startMatch);
  dom.nextRoundBtn.addEventListener('click', nextRound);
  dom.changePlayersBtn.addEventListener('click', showSetup);

  window.addEventListener('keydown', onKeyDown);

  lastTimestamp = performance.now();
  rafId = requestAnimationFrame(frame);
}

init();
