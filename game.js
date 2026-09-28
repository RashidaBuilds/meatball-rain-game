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

const GAMEPAD_CONFIG = {
  deadzone: 0.18,
  stickAxisIndex: 0,      // Left analog stick horizontal
  dpadLeftBtnIndex: 14,   // Standard D-pad left
  dpadRightBtnIndex: 15,  // Standard D-pad right
  actionBtnIndex: 0,      // 'A' / Cross button
  startBtnIndex: 9        // Start / Options button
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
  touchLeftPressed: false,
  touchRightPressed: false,
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
  btnArrowLeft: document.getElementById('btn-arrow-left'),
  btnArrowRight: document.getElementById('btn-arrow-right'),
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

  // Mobile arrow buttons (press & hold)
  setupArrowButtons();

  // Gamepad controller support
  setupGamepadSupport();

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
  state.touchLeftPressed = false;
  state.touchRightPressed = false;
  isPointerDragging = false;
  if (dom.btnArrowLeft) dom.btnArrowLeft.classList.remove('active');
  if (dom.btnArrowRight) dom.btnArrowRight.classList.remove('active');

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

  // Resume polling gamepad buttons for restart
  pollMenuGamepad();
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

// 7. Touch-Drag and Pointer Controls
let isPointerDragging = false;
let lastPointerX = 0;

function setupPointerControls() {
  const arena = dom.gameArena;

  const onPointerDown = (e) => {
    if (state.screen !== 'PLAYING') return;
    // Don't drag if tapping arrow buttons or HUD
    if (e.target.closest('#btn-arrow-left, #btn-arrow-right, .game-hud')) return;

    isPointerDragging = true;
    lastPointerX = e.clientX;
    state.dogTargetX = null;
  };

  const onPointerMove = (e) => {
    if (state.screen !== 'PLAYING' || !isPointerDragging) return;

    if (e.cancelable) {
      e.preventDefault(); // Prevent unwanted page scrolling during gameplay
    }

    const currentX = e.clientX;
    const deltaX = currentX - lastPointerX;
    lastPointerX = currentX;

    if (Math.abs(deltaX) > 0.2) {
      state.dogX += deltaX;

      // Update orientation based on horizontal drag direction
      if (deltaX < -0.2 && state.dogFacing !== 'left') {
        state.dogFacing = 'left';
        dom.playerDog.classList.add('facing-left');
      } else if (deltaX > 0.2 && state.dogFacing !== 'right') {
        state.dogFacing = 'right';
        dom.playerDog.classList.remove('facing-left');
      }

      // Clamp within arena boundaries immediately
      const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
      const halfDog = window.innerWidth <= 600 ? 60 : 65;
      state.dogX = Math.max(halfDog, Math.min(arenaWidth - halfDog, state.dogX));
      applyDogPosition();
    }
  };

  const onPointerUp = () => {
    isPointerDragging = false;
  };

  arena.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Dedicated touch listeners for guaranteed mobile touch drag
  arena.addEventListener('touchstart', (e) => {
    if (state.screen !== 'PLAYING') return;
    if (e.target.closest('#btn-arrow-left, #btn-arrow-right, .game-hud')) return;
    if (e.touches && e.touches.length > 0) {
      isPointerDragging = true;
      lastPointerX = e.touches[0].clientX;
      state.dogTargetX = null;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (state.screen !== 'PLAYING' || !isPointerDragging) return;
    if (e.cancelable) {
      e.preventDefault(); // Prevent unwanted mobile page scroll
    }
    if (e.touches && e.touches.length > 0) {
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - lastPointerX;
      lastPointerX = currentX;

      if (Math.abs(deltaX) > 0.2) {
        state.dogX += deltaX;

        if (deltaX < -0.2 && state.dogFacing !== 'left') {
          state.dogFacing = 'left';
          dom.playerDog.classList.add('facing-left');
        } else if (deltaX > 0.2 && state.dogFacing !== 'right') {
          state.dogFacing = 'right';
          dom.playerDog.classList.remove('facing-left');
        }

        const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
        const halfDog = window.innerWidth <= 600 ? 60 : 65;
        state.dogX = Math.max(halfDog, Math.min(arenaWidth - halfDog, state.dogX));
        applyDogPosition();
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', onPointerUp);
  window.addEventListener('touchcancel', onPointerUp);
}

// 8. Mobile Arrow Buttons (Press & Hold Support)
function setupArrowButtons() {
  if (!dom.btnArrowLeft || !dom.btnArrowRight) return;

  const bindArrowButton = (button, isLeft) => {
    const handleDown = (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (isLeft) {
        state.touchLeftPressed = true;
        button.classList.add('active');
      } else {
        state.touchRightPressed = true;
        button.classList.add('active');
      }
    };

    const handleUp = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (isLeft) {
        state.touchLeftPressed = false;
        button.classList.remove('active');
      } else {
        state.touchRightPressed = false;
        button.classList.remove('active');
      }
    };

    // Pointer events (handles mouse click/hold and touch)
    button.addEventListener('pointerdown', handleDown);
    button.addEventListener('pointerup', handleUp);
    button.addEventListener('pointercancel', handleUp);
    button.addEventListener('pointerleave', handleUp);

    // Native touch events for mobile hold stability
    button.addEventListener('touchstart', handleDown, { passive: false });
    button.addEventListener('touchend', handleUp, { passive: false });
    button.addEventListener('touchcancel', handleUp, { passive: false });

    // Prevent context menu on long-press
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  bindArrowButton(dom.btnArrowLeft, true);
  bindArrowButton(dom.btnArrowRight, false);
}

// 8. Gamepad Controller Support
function setupGamepadSupport() {
  window.addEventListener('gamepadconnected', (e) => {
    const gp = e.gamepad;
    if (gp) {
      console.log(`[Gamepad] Connected at index ${gp.index}: ${gp.id}`);
    } else {
      console.log('[Gamepad] Connected event received');
    }
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    const gp = e.gamepad;
    if (gp) {
      console.log(`[Gamepad] Disconnected from index ${gp.index}: ${gp.id}`);
    } else {
      console.log('[Gamepad] Disconnected event received');
    }
  });

  // Start polling gamepad menu buttons
  pollMenuGamepad();
}

let prevGamepadActionState = false;

function pollMenuGamepad() {
  if (state.screen !== 'PLAYING') {
    checkGamepadMenuButtons();
    requestAnimationFrame(pollMenuGamepad);
  }
}

function checkGamepadMenuButtons() {
  if (typeof navigator.getGamepads !== 'function') return;
  const gamepads = navigator.getGamepads();
  if (!gamepads) return;

  let isActionPressed = false;

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp || !gp.connected || !gp.buttons) continue;

    const btnA = gp.buttons[GAMEPAD_CONFIG.actionBtnIndex];
    const btnStart = gp.buttons[GAMEPAD_CONFIG.startBtnIndex];

    if ((btnA && (btnA.pressed || btnA.value > 0.5)) ||
        (btnStart && (btnStart.pressed || btnStart.value > 0.5))) {
      isActionPressed = true;
      break;
    }
  }

  // Trigger on button press edge
  if (isActionPressed && !prevGamepadActionState) {
    if (state.screen === 'START') {
      startGame();
    } else if (state.screen === 'GAME_OVER') {
      restartGame();
    }
  }

  prevGamepadActionState = isActionPressed;
}

function getControllerHorizontalInput() {
  if (typeof navigator.getGamepads !== 'function') return 0;
  const gamepads = navigator.getGamepads();
  if (!gamepads) return 0;

  let totalInput = 0;

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp || !gp.connected) continue;

    // 1. Left Analog Stick (Axis 0)
    let stickVal = 0;
    if (gp.axes && gp.axes.length > GAMEPAD_CONFIG.stickAxisIndex) {
      const rawAxis = gp.axes[GAMEPAD_CONFIG.stickAxisIndex];
      if (Math.abs(rawAxis) > GAMEPAD_CONFIG.deadzone) {
        const sign = Math.sign(rawAxis);
        stickVal = sign * ((Math.abs(rawAxis) - GAMEPAD_CONFIG.deadzone) / (1 - GAMEPAD_CONFIG.deadzone));
      }
    }

    // 2. D-Pad Left / Right Buttons
    let dpadVal = 0;
    if (gp.buttons) {
      const btnLeft = gp.buttons[GAMEPAD_CONFIG.dpadLeftBtnIndex];
      const btnRight = gp.buttons[GAMEPAD_CONFIG.dpadRightBtnIndex];

      const leftPressed = btnLeft && (btnLeft.pressed || btnLeft.value > 0.5);
      const rightPressed = btnRight && (btnRight.pressed || btnRight.value > 0.5);

      if (leftPressed && !rightPressed) dpadVal = -1;
      else if (rightPressed && !leftPressed) dpadVal = 1;
    }

    // Prefer D-pad if active, otherwise use analog stick value
    const gpInput = dpadVal !== 0 ? dpadVal : stickVal;

    if (Math.abs(gpInput) > Math.abs(totalInput)) {
      totalInput = gpInput;
    }
  }

  return Math.max(-1, Math.min(1, totalInput));
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
  state.touchLeftPressed = false;
  state.touchRightPressed = false;
  isPointerDragging = false;
  if (dom.btnArrowLeft) dom.btnArrowLeft.classList.remove('active');
  if (dom.btnArrowRight) dom.btnArrowRight.classList.remove('active');
  applyDogPosition();
}

function clampDogPosition() {
  const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
  const halfDog = window.innerWidth <= 600 ? 60 : 70;
  state.dogX = Math.max(halfDog, Math.min(arenaWidth - halfDog, state.dogX));
  applyDogPosition();
}

// 9. Main Game Loop
function gameLoop(timestamp) {
  if (state.screen !== 'PLAYING') return;

  const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.1); // cap dt at 100ms
  state.lastFrameTime = timestamp;

  updatePlayer(dt);
  updateMeatballs(timestamp, dt);
  checkCollisions();

  state.animationFrameId = requestAnimationFrame(gameLoop);
}

// 10. Update Player Movement
function updatePlayer(dt) {
  const arenaWidth = dom.gameArena.clientWidth || window.innerWidth;
  const halfDog = window.innerWidth <= 600 ? 60 : 65;

  // 1. Keyboard & On-screen arrow buttons directional input (-1, 0, 1)
  let buttonDir = 0;
  if (state.keysPressed.ArrowLeft || state.keysPressed.KeyA || state.touchLeftPressed) {
    buttonDir -= 1;
  }
  if (state.keysPressed.ArrowRight || state.keysPressed.KeyD || state.touchRightPressed) {
    buttonDir += 1;
  }

  // 2. Controller directional / analog input (-1.0 to 1.0)
  const controllerDir = getControllerHorizontalInput();

  // Combine keyboard/buttons and controller seamlessly
  let moveAmount = 0;
  if (buttonDir !== 0 || controllerDir !== 0) {
    state.dogTargetX = null; // Clear pointer target when using direct directional input
    moveAmount = Math.max(-1, Math.min(1, buttonDir + controllerDir));
  }

  if (moveAmount !== 0) {
    state.dogX += moveAmount * CONFIG.dogMoveSpeed * dt;
    if (moveAmount < -0.05 && state.dogFacing !== 'left') {
      state.dogFacing = 'left';
      dom.playerDog.classList.add('facing-left');
    } else if (moveAmount > 0.05 && state.dogFacing !== 'right') {
      state.dogFacing = 'right';
      dom.playerDog.classList.remove('facing-left');
    }
  } else if (state.dogTargetX !== null) {
    // 3. Pointer follow target if set
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
