import { Game, PLAYER_DEFS, CANVAS_W, CANVAS_H } from './game.js?v=olive-tilt';
import { drawFrame } from './render.js?v=olive-tilt';
import { ChaseMusic } from './music.js?v=olive-tilt';

const SPRITE_FILES = {
  olive_green: 'sprites/olive_green.png',
  olive_black: 'sprites/olive_black.png',
  pimento: 'sprites/pimento.png',
  broccoli: 'sprites/broccoli.png',
  mushroom: 'sprites/mushroom.png',
  tomato: 'sprites/tomato.png',
  eggplant: 'sprites/eggplant.png',
  explosion: 'sprites/explosion.png',
};

const dom = {
  canvas: document.getElementById('game-canvas'),
  setupScreen: document.getElementById('setup-screen'),
  playerCount: document.getElementById('player-count'),
  controlHints: document.getElementById('control-hints'),
  startBtn: document.getElementById('start-btn'),
  pauseOverlay: document.getElementById('pause-overlay'),
  gameOver: document.getElementById('game-over'),
  finalScore: document.getElementById('final-score'),
  gameOverMsg: document.getElementById('game-over-msg'),
  playAgainBtn: document.getElementById('play-again-btn'),
  changePlayersBtn: document.getElementById('change-players-btn'),
};

const ctx = dom.canvas.getContext('2d');
const game = new Game();
const music = new ChaseMusic();
const keysDown = new Set();
let sprites = {};
let lastTimestamp = 0;
let rafId = 0;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadSprites() {
  const entries = await Promise.all(
    Object.entries(SPRITE_FILES).map(async ([key, path]) => [key, await loadImage(path)]),
  );
  sprites = Object.fromEntries(entries);
}

function renderControlHints() {
  const count = Number(dom.playerCount.value);
  dom.controlHints.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const def = PLAYER_DEFS[i];
    const row = document.createElement('div');
    row.className = 'control-hint';
    row.innerHTML = `
      <span class="control-hint__swatch" style="background:${def.color}"></span>
      <span class="control-hint__name">${def.name}</span>
      <span class="control-hint__keys">${def.displayKeys}</span>
    `;
    dom.controlHints.appendChild(row);
  }
}

function showSetup() {
  game.phase = 'setup';
  music.stop();
  keysDown.clear();
  dom.setupScreen.classList.remove('overlay--hidden');
  dom.pauseOverlay.classList.add('overlay--hidden');
  dom.gameOver.classList.add('overlay--hidden');
  renderControlHints();
}

function showGameOver() {
  keysDown.clear();
  dom.setupScreen.classList.add('overlay--hidden');
  dom.pauseOverlay.classList.add('overlay--hidden');
  dom.gameOver.classList.remove('overlay--hidden');
  dom.finalScore.textContent = String(game.score);
  if (game.hitOlive) {
    dom.gameOverMsg.textContent = `${game.hitOlive.name} got smooshed!`;
  } else {
    dom.gameOverMsg.textContent = 'Splattered!';
  }
}

function startMatch() {
  const count = Number(dom.playerCount.value);
  keysDown.clear();
  game.configure(count);
  game.beginPlay();
  dom.setupScreen.classList.add('overlay--hidden');
  dom.gameOver.classList.add('overlay--hidden');
  dom.pauseOverlay.classList.add('overlay--hidden');
  music.start();
  // Keep keyboard focus on the page after clicking Start.
  window.focus();
  dom.canvas.focus({ preventScroll: true });
}

/** Sync held keys onto olive control flags every frame (robust vs missed keyups). */
function applyHeldInput() {
  if (game.phase !== 'playing' || game.paused) {
    for (const olive of game.olives) {
      olive.moveLeft = false;
      olive.moveRight = false;
      olive.aimUp = false;
      olive.aimDown = false;
    }
    return;
  }

  for (const olive of game.olives) {
    if (!olive.alive) {
      olive.moveLeft = false;
      olive.moveRight = false;
      olive.aimUp = false;
      olive.aimDown = false;
      continue;
    }
    olive.moveLeft = keysDown.has(olive.keys.left);
    olive.moveRight = keysDown.has(olive.keys.right);
    olive.aimUp = keysDown.has(olive.keys.aimUp);
    olive.aimDown = keysDown.has(olive.keys.aimDown);
  }
}

function onKeyDown(event) {
  if (event.code === 'Space' || event.code.startsWith('Arrow')) {
    event.preventDefault();
  }

  keysDown.add(event.code);

  if (event.repeat) return;

  if (game.phase === 'playing' && event.code === 'KeyP') {
    game.paused = !game.paused;
    dom.pauseOverlay.classList.toggle('overlay--hidden', !game.paused);
    if (game.paused) keysDown.clear();
    return;
  }

  if (game.phase !== 'playing' || game.paused) return;

  for (const olive of game.olives) {
    if (!olive.alive) continue;
    if (event.code === olive.keys.shoot) game.tryShoot(olive);
  }
}

function onKeyUp(event) {
  keysDown.delete(event.code);
}

function frame(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  applyHeldInput();

  const prevPhase = game.phase;
  game.update(dt);
  drawFrame(ctx, game, sprites);

  if (prevPhase === 'playing' && game.phase === 'gameOver') {
    showGameOver();
  }

  rafId = requestAnimationFrame(frame);
}

async function init() {
  dom.canvas.width = CANVAS_W;
  dom.canvas.height = CANVAS_H;
  dom.canvas.tabIndex = 0; // allow focusing the canvas for keyboard play

  await loadSprites();
  renderControlHints();

  dom.playerCount.addEventListener('change', renderControlHints);
  dom.startBtn.addEventListener('click', startMatch);
  dom.playAgainBtn.addEventListener('click', startMatch);
  dom.changePlayersBtn.addEventListener('click', showSetup);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keysDown.clear());

  lastTimestamp = performance.now();
  drawFrame(ctx, game, sprites);
  rafId = requestAnimationFrame(frame);
}

init().catch((err) => {
  console.error(err);
  alert('Failed to load Olive Wars assets. Check the console.');
});
