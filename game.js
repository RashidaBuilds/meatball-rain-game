/**
 * Meatball Rain Game — Core Game Engine
 * Hand-drawn aesthetic, high responsiveness, tactile arcade physics.
 */

import dogSvg from './assets/dog.svg';
import meatball28 from './assets/meatball-28.svg';
import meatball40 from './assets/meatball-40.svg';
import meatball50 from './assets/meatball-50.svg';

// 1. Asset & Configuration Constants
const ASSETS = {
  dog: dogSvg,
  meatballs: [
    { src: meatball28, size: 28, speedMult: 1.2, points: 15, name: 'small' },
    { src: meatball40, size: 40, speedMult: 1.0, points: 10, name: 'medium' },
    { src: meatball50, size: 50, speedMult: 0.85, points: 5, name: 'large' },
  ]
};

const CONFIG = {
  maxLives: 3,
  baseFallSpeed: 240,       // px per second
  speedRampPerScore: 1.5,   // speed increase per point
  maxFallSpeed: 650,
  baseSpawnInterval: 1200,  // ms between spawns
  minSpawnInterval: 450,
  dogMoveSpeed: 520,        // px per second keyboard
};

// 2. Game State
const state = {
  screen: 'START', // 'START' | 'PLAYING' | 'GAME_OVER'
  score: 0,
  bestScore: parseInt(localStorage.getItem('meatball_best_score') || '0', 10),
  lives: CONFIG.maxLives,
  lastFrameTime: 0,
  lastSpawnTime: 0,
  dogX: 0,                  // current X center in arena
  dogTargetX: null,         // target X from pointer
  dogFacing: 'right',
  keysPressed: {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false
  },
  activeMeatballs: [],      // array of meatball objects
  animationFrameId: null
};

// 3. DOM Elements
const dom = {
  startScreen: document.getElementById('start-screen'),
  gameScreen: document.getElementById('game-screen'),
  gameOverScreen: document.getElementById('game-over-screen'),
  btnStart: document.getElementById('btn-start'),
  btnRestart: document.getElementById('btn-restart'),
  gameArena: document.getElementById('game-arena'),
  playerDog: document.getElementById('player-dog'),
  scoreValue: document.getElementById('score-value'),
  livesContainer: document.getElementById('lives-container'),
  finalScore: document.getElementById('final-score'),
  bestScore: document.getElementById('best-score')
};

// 4. Initialization
function init() {
  // Update initial high score display
  if (dom.bestScore) {
    dom.bestScore.textContent = state.bestScore;
  }

  // Event Listeners
  dom.btnStart.addEventListener('click', startGame);
  dom.btnRestart.addEventListener('click', restartGame);

  // Keyboard navigation
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Pointer / Mouse / Touch interaction on the game arena
  setupPointerControls();

  // Resize handler
  window.addEventListener('resize', handleResize);
}

// 5. Start / Restart Controls
function startGame() {
  state.screen = 'PLAYING';
  state.score = 0;
  state.lives = CONFIG.maxLives;
  state.activeMeatballs = [];
  state.lastSpawnTime = performance.now();

  dom.startScreen.style.display = 'none';
  dom.gameOverScreen.style.display = 'none';
  dom.gameScreen.style.display = 'flex';

  updateHUD();
  resetDogPosition();
  clearAllActiveMeatballs();

  state.lastFrameTime = performance.now();
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  state.animationFrameId = requestAnimationFrame(gameLoop);
}

function restartGame() {
  startGame();
}

function gameOver() {
  state.screen = 'GAME_OVER';
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  // Update Best Score
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('meatball_best_score', state.bestScore.toString());
  }

  dom.finalScore.textContent = state.score;
  dom.bestScore.textContent = state.bestScore;

  // Show Game Over Modal
  dom.gameOverScreen.style.display = 'flex';
}

// 6. Keyboard Handling
function handleKeyDown(e) {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
    state.keysPressed[e.code] = true;
    state.dogTargetX = null; // clear pointer target when using keyboard
  }
}

function handleKeyUp(e) {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
    state.keysPressed[e.code] = false;
  }
}

// 7. Pointer (Mouse & Touch) Controls
function setupPointerControls() {
  let isPointerDown = false;

  const updateTargetFromPointer = (clientX) => {
    if (state.screen !== 'PLAYING') return;
    const arenaRect = dom.gameArena.getBoundingClientRect();
    const relativeX = clientX - arenaRect.left;
    state.dogTargetX = Math.max(70, Math.min(arenaRect.width - 70, relativeX));
  };

  dom.gameArena.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    updateTargetFromPointer(e.clientX);
  });

  window.addEventListener('pointermove', (e) => {
    if (isPointerDown || state.screen === 'PLAYING') {
      updateTargetFromPointer(e.clientX);
    }
  });

  window.addEventListener('pointerup', () => {
    isPointerDown = false;
  });

  window.addEventListener('pointercancel', () => {
    isPointerDown = false;
  });
}

function handleResize() {
  if (state.screen === 'PLAYING') {
    clampDogPosition();
  }
}

function resetDogPosition() {
  const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
  state.dogX = arenaWidth / 2;
  state.dogTargetX = null;
  state.dogFacing = 'right';
  applyDogPosition();
}

function clampDogPosition() {
  const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
  const halfDog = 70;
  state.dogX = Math.max(halfDog, Math.min(arenaWidth - halfDog, state.dogX));
  applyDogPosition();
}

// 8. Main Game Loop
function gameLoop(timestamp) {
  if (state.screen !== 'PLAYING') return;

  const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1); // cap dt at 100ms
  state.lastFrameTime = timestamp;

  updatePlayer(dt);
  updateMeatballs(timestamp, dt);
  checkCollisions();

  state.animationFrameId = requestAnimationFrame(gameLoop);
}

// 9. Update Player Movement
function updatePlayer(dt) {
  const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
  const halfDog = 65;
  let moveDir = 0;

  // Check keyboard input
  if (state.keysPressed.ArrowLeft || state.keysPressed.KeyA) {
    moveDir -= 1;
  }
  if (state.keysPressed.ArrowRight || state.keysPressed.KeyD) {
    moveDir += 1;
  }

  if (moveDir !== 0) {
    state.dogX += moveDir * CONFIG.dogMoveSpeed * dt;
    if (moveDir < 0 && state.dogFacing !== 'left') {
      state.dogFacing = 'left';
      dom.playerDog.classList.add('facing-left');
    } else if (moveDir > 0 && state.dogFacing !== 'right') {
      state.dogFacing = 'right';
      dom.playerDog.classList.remove('facing-left');
    }
  } else if (state.dogTargetX !== null) {
    // Smoothly follow pointer/touch
    const dx = state.dogTargetX - state.dogX;
    const distance = Math.abs(dx);
    if (distance > 2) {
      const step = Math.sign(dx) * Math.min(distance, CONFIG.dogMoveSpeed * 1.5 * dt);
      state.dogX += step;
      if (dx < -5 && state.dogFacing !== 'left') {
        state.dogFacing = 'left';
        dom.playerDog.classList.add('facing-left');
      } else if (dx > 5 && state.dogFacing !== 'right') {
        state.dogFacing = 'right';
        dom.playerDog.classList.remove('facing-left');
      }
    }
  }

  // Keep within arena bounds
  state.dogX = Math.max(halfDog, Math.min(arenaWidth - halfDog, state.dogX));
  applyDogPosition();
}

function applyDogPosition() {
  dom.playerDog.style.left = `${state.dogX}px`;
}

// 10. Meatball Rain Spawner & Physics
function updateMeatballs(timestamp, dt) {
  const arenaRect = dom.gameArena.getBoundingClientRect();
  const groundOffset = window.innerWidth <= 600 ? 60 : 80;
  const groundY = arenaRect.height - groundOffset;

  // Progressive difficulty scaling
  const currentSpeed = Math.min(
    CONFIG.maxFallSpeed,
    CONFIG.baseFallSpeed + state.score * CONFIG.speedRampPerScore
  );

  const currentInterval = Math.max(
    CONFIG.minSpawnInterval,
    CONFIG.baseSpawnInterval - state.score * 12
  );

  // Spawning
  if (timestamp - state.lastSpawnTime > currentInterval) {
    spawnMeatball(arenaRect.width);
    state.lastSpawnTime = timestamp;
  }

  // Update existing meatballs
  for (let i = state.activeMeatballs.length - 1; i >= 0; i--) {
    const mb = state.activeMeatballs[i];
    mb.y += currentSpeed * mb.type.speedMult * dt;
    mb.rotation += mb.rotSpeed * dt;

    // Apply CSS transform
    mb.element.style.top = `${mb.y}px`;
    mb.element.style.transform = `rotate(${mb.rotation}deg)`;

    // Check if meatball reached the ground (Miss!)
    if (mb.y + mb.type.size >= groundY) {
      handleMeatballMiss(mb, i, groundY);
    }
  }
}

function spawnMeatball(arenaWidth) {
  // Random meatball size variant
  const typeIndex = Math.floor(Math.random() * ASSETS.meatballs.length);
  const type = ASSETS.meatballs[typeIndex];

  const margin = type.size + 20;
  const x = margin + Math.random() * (arenaWidth - margin * 2);
  const y = -type.size - 10;
  const rotSpeed = (Math.random() - 0.5) * 120; // degrees per sec

  const el = document.createElement('img');
  el.src = type.src;
  el.className = 'falling-meatball';
  el.style.width = `${type.size}px`;
  el.style.height = `${type.size}px`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.setAttribute('aria-hidden', 'true');

  dom.gameArena.appendChild(el);

  state.activeMeatballs.push({
    element: el,
    type: type,
    x: x,
    y: y,
    rotation: 0,
    rotSpeed: rotSpeed
  });
}

// 11. Collisions (Catch & Miss)
function checkCollisions() {
  const arenaRect = dom.gameArena.getBoundingClientRect();
  const groundOffset = window.innerWidth <= 600 ? 60 : 80;
  const dogWidth = window.innerWidth <= 600 ? 120 : 140;
  const dogHeight = window.innerWidth <= 600 ? 111 : 130;

  // Dog catch hitbox around head/mouth:
  // Dog is positioned with bottom at groundOffset
  const dogTopY = arenaRect.height - groundOffset - dogHeight;
  const dogCatchZoneTop = dogTopY + 15;
  const dogCatchZoneBottom = dogTopY + 80;
  const dogCatchRadius = dogWidth * 0.42;

  for (let i = state.activeMeatballs.length - 1; i >= 0; i--) {
    const mb = state.activeMeatballs[i];
    const mbCenterX = mb.x + mb.type.size / 2;
    const mbCenterY = mb.y + mb.type.size / 2;

    // Check vertical overlap with dog head
    if (mbCenterY >= dogCatchZoneTop && mbCenterY <= dogCatchZoneBottom) {
      // Check horizontal distance to dog center
      const distX = Math.abs(mbCenterX - state.dogX);
      if (distX <= dogCatchRadius) {
        handleMeatballCatch(mb, i);
      }
    }
  }
}

function handleMeatballCatch(mb, index) {
  // 1. Remove from array and DOM
  mb.element.remove();
  state.activeMeatballs.splice(index, 1);

  // 2. Score Increment
  state.score += mb.type.points;
  updateHUD();

  // 3. Floating Score Popup Effect
  spawnScorePopup(mb.x, mb.y, `+${mb.type.points}`);

  // 4. Trigger Dog Hop Animation
  dom.playerDog.classList.add('catching');
  setTimeout(() => {
    dom.playerDog.classList.remove('catching');
  }, 200);
}

function handleMeatballMiss(mb, index, groundY) {
  // 1. Spawn ground splat
  spawnGroundSplat(mb.x + mb.type.size / 2, mb.type.size);

  // 2. Remove meatball
  mb.element.remove();
  state.activeMeatballs.splice(index, 1);

  // 3. Decrement Lives
  state.lives -= 1;
  updateHUD();

  // 4. Check for Game Over
  if (state.lives <= 0) {
    gameOver();
  }
}

// 12. Visual Effects & Feedback
function spawnScorePopup(x, y, text) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  dom.gameArena.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 700);
}

function spawnGroundSplat(centerX, size) {
  const splat = document.createElement('div');
  splat.className = 'meatball-splat';
  splat.style.left = `${centerX - size * 0.7}px`;
  splat.style.width = `${size * 1.4}px`;
  dom.gameArena.appendChild(splat);

  setTimeout(() => {
    splat.remove();
  }, 900);
}

function updateHUD() {
  dom.scoreValue.textContent = state.score;

  // Update Hearts
  const hearts = dom.livesContainer.querySelectorAll('.heart-icon');
  hearts.forEach((heart, idx) => {
    if (idx < state.lives) {
      heart.classList.remove('lost');
    } else {
      heart.classList.add('lost');
    }
  });
}

function clearAllActiveMeatballs() {
  state.activeMeatballs.forEach(mb => mb.element.remove());
  state.activeMeatballs = [];
}

// Start listener on window load
window.addEventListener('DOMContentLoaded', init);
