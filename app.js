// ── Canvas Setup ──
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const p2ScoreDisplay = document.getElementById('p2-score-display');
const levelDisplay = document.getElementById('level-display');
const livesDisplay = document.getElementById('lives-display');
const p2LivesDisplay = document.getElementById('p2-lives-display');
const hudRight = document.getElementById('hud-right');
const finalScoreEl = document.getElementById('final-score');

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Game State ──
const STATE = { MODE_SELECT: 0, PLAYING: 1, GAME_OVER: 2 };
let state = STATE.MODE_SELECT;
let numPlayers = 1;
let p1Score = 0;
let p2Score = 0;
let level = 1;
let p1Lives = 3;
let p2Lives = 3;
let player1, player2, aliens, playerBullets, alienBullets;
let alienDir, alienShootTimer;
let frameCount = 0;

// ── Input ──
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (state === STATE.MODE_SELECT) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') { numPlayers = 1; startGame(); }
    if (e.code === 'Digit2' || e.code === 'Numpad2') { numPlayers = 2; startGame(); }
  } else if (state === STATE.GAME_OVER && e.code === 'Enter') {
    state = STATE.MODE_SELECT;
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
  }
  if (['ArrowLeft','ArrowRight','Space','Enter','KeyA','KeyD','KeyX'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ── Constants ──
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ALIEN_BULLET_SPEED = 4;
const PX = 4; // pixel size for sprites

// ── Pixel Sprites (2D arrays: 1 = filled, 0 = empty) ──
const SHIP_P1 = [
  [0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,1,1,1,1,1,1,0,1],
];

const SHIP_P2 = [
  [0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,1,0,1,0,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,0,1,1,1,1,1,0,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [0,0,1,0,0,0,0,0,1,0,0],
];

const ALIEN_A1 = [
  [0,0,1,0,0,0,0,0,1,0,0],
  [0,0,0,1,0,0,0,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,0,1,1,1,0,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [0,0,0,1,1,0,1,1,0,0,0],
];

const ALIEN_A2 = [
  [0,0,1,0,0,0,0,0,1,0,0],
  [0,0,0,1,0,0,0,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,0,1,1,1,0,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [0,1,0,0,0,0,0,0,0,1,0],
];

const ALIEN_B1 = [
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,0,0,1,0,0,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,1,0,0,0,1,0,0,0],
  [0,0,1,0,1,0,1,0,1,0,0],
  [1,1,0,0,0,0,0,0,0,1,1],
];

const ALIEN_B2 = [
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,0,0,1,0,0,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [0,0,1,0,1,0,1,0,1,0,0],
  [0,1,0,1,0,0,0,1,0,1,0],
  [0,0,1,0,0,0,0,0,1,0,0],
];

const EXPLODE_FRAMES = [
  // Frame 0: small spark
  [
    [0,0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,1,0,1,0,0,0],
    [0,0,0,0,1,0,0,0,0],
    [0,0,0,1,0,1,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,0,0,0,0],
  ],
  // Frame 1: expanding
  [
    [1,0,0,0,0,0,0,0,1],
    [0,0,0,0,1,0,0,0,0],
    [0,0,1,0,0,0,1,0,0],
    [0,0,0,0,1,0,0,0,0],
    [0,0,1,0,0,0,1,0,0],
    [0,0,0,0,1,0,0,0,0],
    [1,0,0,0,0,0,0,0,1],
  ],
  // Frame 2: full burst
  [
    [1,0,0,1,0,1,0,0,1],
    [0,0,1,0,0,0,1,0,0],
    [0,1,0,0,1,0,0,1,0],
    [1,0,0,1,0,1,0,0,1],
    [0,1,0,0,1,0,0,1,0],
    [0,0,1,0,0,0,1,0,0],
    [1,0,0,1,0,1,0,0,1],
  ],
  // Frame 3: fading dots
  [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,0,0,0,0],
    [0,0,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
  ]
];

// Sprite dimensions (in pixels, for collision boxes)
const SHIP_W = SHIP_P1[0].length * PX;
const SHIP_H = SHIP_P1.length * PX;
const ALIEN_W = ALIEN_A1[0].length * PX;
const ALIEN_H = ALIEN_A1.length * PX;

// ── Entity Factories ──
function createPlayer(playerNum) {
  const offset = numPlayers === 2
    ? (playerNum === 1 ? canvas.width / 3 : canvas.width * 2 / 3)
    : canvas.width / 2;
  return {
    x: offset - (SHIP_W / 2),
    y: canvas.height - 70,
    w: SHIP_W,
    h: SHIP_H,
    cooldown: 0,
    alive: true,
    exploding: 0,
    num: playerNum
  };
}

function createAlienGrid() {
  const grid = [];
  const cols = 8;
  const rows = 4;
  const spacingX = ALIEN_W + 24;
  const spacingY = ALIEN_H + 20;
  const startX = (canvas.width - cols * spacingX) / 2 + spacingX / 2;
  const startY = 60;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        w: ALIEN_W,
        h: ALIEN_H,
        alive: true,
        type: r < 2 ? 'A' : 'B',
        points: r < 2 ? 20 : 10,
        exploding: 0
      });
    }
  }
  return grid;
}

// ── Game Init ──
function startGame() {
  p1Score = 0;
  p2Score = 0;
  p1Lives = 3;
  p2Lives = numPlayers === 2 ? 3 : 0;
  level = 1;
  state = STATE.PLAYING;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  if (numPlayers === 2) {
    hudRight.classList.remove('hidden');
  } else {
    hudRight.classList.add('hidden');
  }
  initLevel();
}

function initLevel() {
  player1 = createPlayer(1);
  player1.alive = p1Lives > 0;
  player2 = numPlayers === 2 ? createPlayer(2) : null;
  if (player2) player2.alive = p2Lives > 0;
  aliens = createAlienGrid();
  playerBullets = [];
  alienBullets = [];
  alienDir = 1;
  alienShootTimer = 0;
  updateHUD();
}

function updateHUD() {
  if (numPlayers === 2) {
    scoreDisplay.textContent = 'P1 Score: ' + p1Score;
    livesDisplay.textContent = 'P1 Lives: ' + p1Lives;
    p2ScoreDisplay.textContent = 'P2 Score: ' + p2Score;
    p2LivesDisplay.textContent = 'P2 Lives: ' + p2Lives;
  } else {
    scoreDisplay.textContent = 'Score: ' + p1Score;
    livesDisplay.textContent = 'Lives: ' + p1Lives;
  }
  levelDisplay.textContent = 'Level: ' + level;
}

// ── Collision ──
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Player Update Helper ──
function updatePlayer(p, leftKey, rightKey, shootKey, bullets) {
  if (!p || !p.alive) return;
  // If exploding, count down and skip input
  if (p.exploding > 0) {
    p.exploding--;
    if (p.exploding === 0) {
      // Respawn if lives remain
      if ((p.num === 1 && p1Lives > 0) || (p.num === 2 && p2Lives > 0)) {
        const offset = numPlayers === 2
          ? (p.num === 1 ? canvas.width / 3 : canvas.width * 2 / 3)
          : canvas.width / 2;
        p.x = offset - (SHIP_W / 2);
      } else {
        p.alive = false;
      }
    }
    return;
  }
  if (keys[leftKey]) p.x -= PLAYER_SPEED;
  if (keys[rightKey]) p.x += PLAYER_SPEED;
  p.x = Math.max(0, Math.min(canvas.width - p.w, p.x));

  if (p.cooldown > 0) p.cooldown--;
  if (keys[shootKey] && p.cooldown === 0) {
    bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 4, w: 4, h: 10, owner: p.num });
    p.cooldown = 15;
  }
}

// ── Update ──
function update() {
  if (state !== STATE.PLAYING) return;

  // Player movement & shooting
  updatePlayer(player1, 'ArrowLeft', 'ArrowRight', 'Space', playerBullets);
  updatePlayer(player2, 'KeyA', 'KeyD', 'KeyX', playerBullets);

  // Move player bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    playerBullets[i].y -= BULLET_SPEED;
    if (playerBullets[i].y + playerBullets[i].h < 0) playerBullets.splice(i, 1);
  }

  // Alien movement
  const aliveAliens = aliens.filter(a => a.alive);
  const alienSpeed = 1 + level * 0.5;
  let hitEdge = false;

  for (const a of aliveAliens) {
    a.x += alienDir * alienSpeed;
    if (a.x <= 0 || a.x + a.w >= canvas.width) hitEdge = true;
  }

  if (hitEdge) {
    alienDir *= -1;
    for (const a of aliveAliens) {
      a.y += ALIEN_H;
    }
  }

  // Alien shooting
  alienShootTimer++;
  const shootInterval = Math.max(30, 90 - level * 10);
  if (alienShootTimer >= shootInterval && aliveAliens.length > 0) {
    alienShootTimer = 0;
    const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
    alienBullets.push({ x: shooter.x + shooter.w / 2 - 2, y: shooter.y + shooter.h, w: 4, h: 10 });
  }

  // Move alien bullets
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    alienBullets[i].y += ALIEN_BULLET_SPEED;
    if (alienBullets[i].y > canvas.height) alienBullets.splice(i, 1);
  }

  // Player bullet vs alien collision
  for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
    for (const a of aliens) {
      if (a.alive && a.exploding === 0 && rectsOverlap(playerBullets[bi], a)) {
        a.alive = false;
        a.exploding = 20;
        if (playerBullets[bi].owner === 2) {
          p2Score += a.points;
        } else {
          p1Score += a.points;
        }
        playerBullets.splice(bi, 1);
        updateHUD();
        break;
      }
    }
  }

  // Alien bullet vs players collision
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    let hit = false;
    if (player1 && player1.alive && player1.exploding === 0 && rectsOverlap(alienBullets[i], player1)) {
      p1Lives--;
      player1.exploding = 120; // ~2 seconds at 60fps
      if (p1Lives <= 0) {
        // Will be set to not alive after explosion finishes
      }
      hit = true;
    }
    if (!hit && player2 && player2.alive && player2.exploding === 0 && rectsOverlap(alienBullets[i], player2)) {
      p2Lives--;
      player2.exploding = 120;
      if (p2Lives <= 0) {
        // Will be set to not alive after explosion finishes
      }
      hit = true;
    }
    if (hit) {
      alienBullets.splice(i, 1);
      updateHUD();
    }
  }

  // Check game over (all players dead — not just exploding)
  if (!anyPlayerAlive()) { gameOver(); return; }

  // Aliens reach bottom
  const lowestPlayerY = getLowestPlayerY();
  for (const a of aliveAliens) {
    if (a.y + a.h >= lowestPlayerY) {
      gameOver();
      return;
    }
  }

  // Explosion timers
  for (const a of aliens) {
    if (a.exploding > 0) a.exploding--;
  }

  // Level clear
  if (aliveAliens.length === 0 && aliens.every(a => a.exploding === 0)) {
    level++;
    initLevel();
  }
}

function anyPlayerAlive() {
  if (player1 && player1.alive && (player1.exploding === 0 || p1Lives > 0)) return true;
  if (player2 && player2.alive && (player2.exploding === 0 || p2Lives > 0)) return true;
  return false;
}

function getLowestPlayerY() {
  let y = 0;
  if (player1 && player1.alive) y = player1.y;
  if (player2 && player2.alive) y = Math.max(y, player2.y) || player2.y;
  return y || canvas.height - 70;
}

function gameOver() {
  state = STATE.GAME_OVER;
  if (numPlayers === 2) {
    finalScoreEl.textContent = 'P1: ' + p1Score + '  P2: ' + p2Score;
  } else {
    finalScoreEl.textContent = 'Final Score: ' + p1Score;
  }
  gameOverScreen.classList.remove('hidden');
}

// ── Render ──
function drawSprite(sprite, x, y, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c]) {
        ctx.fillRect(x + c * PX, y + r * PX, PX, PX);
      }
    }
  }
}

function getExplosionFrame(timer, maxTimer) {
  const progress = 1 - (timer / maxTimer);
  const idx = Math.min(Math.floor(progress * EXPLODE_FRAMES.length), EXPLODE_FRAMES.length - 1);
  return EXPLODE_FRAMES[idx];
}

function getAlienSprite(type) {
  const frame = Math.floor(frameCount / 20) % 2;
  if (type === 'A') return frame === 0 ? ALIEN_A1 : ALIEN_A2;
  return frame === 0 ? ALIEN_B1 : ALIEN_B2;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state !== STATE.PLAYING) return;

  // Draw Player 1
  if (player1 && player1.alive) {
    if (player1.exploding > 0) {
      drawSprite(getExplosionFrame(player1.exploding, 120), player1.x, player1.y, '#f80');
    } else {
      drawSprite(SHIP_P1, player1.x, player1.y, '#0f0');
    }
  }

  // Draw Player 2
  if (player2 && player2.alive) {
    if (player2.exploding > 0) {
      drawSprite(getExplosionFrame(player2.exploding, 120), player2.x, player2.y, '#f80');
    } else {
      drawSprite(SHIP_P2, player2.x, player2.y, '#0ff');
    }
  }

  // Draw aliens
  for (const a of aliens) {
    if (a.exploding > 0) {
      drawSprite(getExplosionFrame(a.exploding, 20), a.x, a.y, '#f80');
    } else if (a.alive) {
      drawSprite(getAlienSprite(a.type), a.x, a.y, a.type === 'A' ? '#f0f' : '#ff0');
    }
  }

  // Draw player bullets
  ctx.fillStyle = '#0f0';
  for (const b of playerBullets) {
    ctx.fillRect(b.x, b.y, 3, 10);
  }

  // Draw alien bullets
  ctx.fillStyle = '#f44';
  for (const b of alienBullets) {
    ctx.fillRect(b.x, b.y, 3, 10);
  }
}

// ── Game Loop ──
function loop() {
  frameCount++;
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
