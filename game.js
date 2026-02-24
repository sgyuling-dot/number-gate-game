// ─────────────────────────────────────────────
//  数字门大作战  -  game.js
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── DOM refs ──────────────────────────────────
const unitCountEl = document.getElementById('unit-count');
const levelNumEl  = document.getElementById('level-num');
const overlay     = document.getElementById('overlay');
const overlayIcon = document.getElementById('overlay-icon');
const overlayTitle= document.getElementById('overlay-title');
const overlayMsg  = document.getElementById('overlay-message');
const overlayBtn  = document.getElementById('overlay-btn');

// ── Resize canvas to window ───────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ══════════════════════════════════════════════
//  LEVEL DATA
// ══════════════════════════════════════════════
// Each level: array of "rows" spaced evenly.
// A row is either a door pair or an enemy wave.
// Door pair: { type:'doors', left:{color,value}, right:{color,value} }
//   color:'red' → subtract value  |  color:'blue' → multiply value
// Enemy wave: { type:'enemies', count:N }

const LEVELS = [
  // ── Level 1 ────────────────────────────────
  {
    rows: [
      { type:'doors',  left:{color:'red',  value:1}, right:{color:'blue', value:2} },
      { type:'enemies', count:6 },
    ]
  },
  // ── Level 2 ────────────────────────────────
  {
    rows: [
      { type:'doors',  left:{color:'blue', value:2}, right:{color:'red',  value:3} },
      { type:'doors',  left:{color:'red',  value:2}, right:{color:'blue', value:3} },
      { type:'enemies', count:12 },
    ]
  },
  // ── Level 3 ────────────────────────────────
  {
    rows: [
      { type:'doors',  left:{color:'blue', value:2}, right:{color:'red',  value:5} },
      { type:'doors',  left:{color:'red',  value:3}, right:{color:'blue', value:3} },
      { type:'enemies', count:20 },
    ]
  },
  // ── Level 4 ────────────────────────────────
  {
    rows: [
      { type:'doors',  left:{color:'red',  value:4}, right:{color:'blue', value:2} },
      { type:'doors',  left:{color:'blue', value:2}, right:{color:'red',  value:8} },
      { type:'doors',  left:{color:'red',  value:3}, right:{color:'blue', value:3} },
      { type:'enemies', count:30 },
    ]
  },
  // ── Level 5 (Boss) ─────────────────────────
  {
    rows: [
      { type:'doors',  left:{color:'blue', value:3}, right:{color:'red',  value:10} },
      { type:'doors',  left:{color:'red',  value:5}, right:{color:'blue', value:2}  },
      { type:'doors',  left:{color:'blue', value:2}, right:{color:'red',  value:8}  },
      { type:'enemies', count:50 },
    ]
  },
];

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const UNIT_RADIUS    = 10;
const ENEMY_RADIUS   = 12;
const BULLET_RADIUS  = 4;
const BULLET_SPEED   = 7;
const SQUAD_SPEED    = 2;        // pixels per frame (forward/upward)
const DOOR_HEIGHT    = 90;
const DOOR_WIDTH     = 80;
const DOOR_GAP       = 40;       // gap between two doors
const ROW_SPACING    = 320;      // vertical distance between rows
const ENEMY_ROWS     = 3;        // enemies arranged in grid rows
const SHOOT_INTERVAL = 25;       // frames between shots
const UNIT_SPREAD    = 22;       // spacing between units in formation
const ENEMY_ADVANCE  = 0.6;      // px/frame enemies move toward player

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let state = {};   // populated by startLevel()

function defaultState() {
  return {
    phase: 'gate',      // 'gate' | 'battle' | 'dead' | 'win'
    level: 0,
    units: 10,
    squadX: 0,          // logical center X of squad (set in startLevel)
    worldY: 0,          // how many pixels the world has scrolled
    rows: [],           // processed row objects with worldY position
    currentRowIdx: 0,
    bullets: [],
    enemies: [],
    shootTimer: 0,
    particles: [],
    transitioning: false,
  };
}

// ══════════════════════════════════════════════
//  LEVEL SETUP
// ══════════════════════════════════════════════
function startLevel(levelIdx) {
  state = defaultState();
  state.level = levelIdx;
  state.squadX = canvas.width / 2;

  const levelDef = LEVELS[levelIdx];

  // Build row objects.  We lay them out from y = -ROW_SPACING upward
  // (negative = above the screen; world scrolls upward so they appear from bottom).
  // Row 0 is closest (lowest on the world), row N is farthest (highest).
  const totalRows = levelDef.rows.length;
  state.rows = levelDef.rows.map((rowDef, i) => {
    const worldY = -(i + 1) * ROW_SPACING;
    return { ...rowDef, worldY, passed: false };
  });

  levelNumEl.textContent = levelIdx + 1;
  updateHUD();
}

// ══════════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════════
function updateHUD() {
  unitCountEl.textContent = state.units;
  // Brief scale bump animation
  unitCountEl.classList.remove('bump');
  void unitCountEl.offsetWidth; // reflow
  unitCountEl.classList.add('bump');
  setTimeout(() => unitCountEl.classList.remove('bump'), 200);
}

// ══════════════════════════════════════════════
//  INPUT  (mouse + touch drag)
// ══════════════════════════════════════════════
let dragActive = false;
let lastDragX  = 0;

canvas.addEventListener('mousedown', e => { dragActive = true; lastDragX = e.clientX; });
window.addEventListener('mouseup',   () => { dragActive = false; });
window.addEventListener('mousemove', e => {
  if (!dragActive) return;
  const dx = e.clientX - lastDragX;
  lastDragX = e.clientX;
  moveSquad(dx);
});

canvas.addEventListener('touchstart', e => {
  dragActive = true;
  lastDragX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchend', () => { dragActive = false; });
window.addEventListener('touchmove', e => {
  if (!dragActive) return;
  const dx = e.touches[0].clientX - lastDragX;
  lastDragX = e.touches[0].clientX;
  moveSquad(dx);
}, { passive: true });

function moveSquad(dx) {
  if (state.phase !== 'gate') return;
  const margin = 60;
  state.squadX = Math.max(margin, Math.min(canvas.width - margin, state.squadX + dx));
}

// ══════════════════════════════════════════════
//  OVERLAY helpers
// ══════════════════════════════════════════════
function showOverlay(icon, title, msg, btnText, callback) {
  overlayIcon.textContent  = icon;
  overlayTitle.textContent = title;
  overlayMsg.textContent   = msg;
  overlayBtn.textContent   = btnText;
  overlayBtn.onclick       = () => { overlay.classList.add('hidden'); callback(); };
  overlay.classList.remove('hidden');
}

function gameOver() {
  state.phase = 'dead';
  showOverlay(
    '💀',
    '全军覆没！',
    `第 ${state.level + 1} 关失败，单位归零。\n快重新来过！`,
    '再来一次',
    () => startLevel(state.level)
  );
}

function levelWin() {
  state.phase = 'win';
  if (state.level + 1 >= LEVELS.length) {
    showOverlay(
      '🏆',
      '全关通关！',
      `恭喜你完成了全部 ${LEVELS.length} 关！\n你是真正的数字门大师！`,
      '再玩一次',
      () => startLevel(0)
    );
  } else {
    showOverlay(
      '🎉',
      `第 ${state.level + 1} 关通关！`,
      `剩余单位：${state.units}`,
      '下一关',
      () => startLevel(state.level + 1)
    );
  }
}

// ══════════════════════════════════════════════
//  SPAWN ENEMIES  (for battle phase)
// ══════════════════════════════════════════════
function spawnEnemies(count) {
  state.enemies = [];
  const cols = Math.ceil(Math.sqrt(count * 1.5));
  const rows = Math.ceil(count / cols);
  const spacingX = 36;
  const spacingY = 34;
  const startX = canvas.width / 2 - (cols - 1) * spacingX / 2;
  const startY = 80;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    state.enemies.push({
      x: startX + col * spacingX + (Math.random() - 0.5) * 8,
      y: startY  + row * spacingY,
      hp: 1,
      radius: ENEMY_RADIUS,
      flashTimer: 0,
    });
  }
}

// ══════════════════════════════════════════════
//  PARTICLE helper
// ══════════════════════════════════════════════
function spawnParticles(x, y, color, n = 6) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      radius: 3 + Math.random() * 3,
    });
  }
}

// ══════════════════════════════════════════════
//  APPLY DOOR EFFECT
// ══════════════════════════════════════════════
function applyDoor(door) {
  if (door.color === 'red') {
    state.units = Math.max(0, state.units - door.value);
  } else {
    state.units = Math.floor(state.units * door.value);
  }
  updateHUD();
  if (state.units <= 0) {
    gameOver();
  }
}

// ══════════════════════════════════════════════
//  UPDATE  (called each frame)
// ══════════════════════════════════════════════
function update() {
  if (state.phase === 'dead' || state.phase === 'win') return;

  // ── particles ──────────────────────────────
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (state.phase === 'gate') {
    updateGatePhase();
  } else if (state.phase === 'battle') {
    updateBattlePhase();
  }
}

// ── Gate phase ─────────────────────────────
function updateGatePhase() {
  state.worldY += SQUAD_SPEED;

  // Check each unprocessed row
  for (let i = 0; i < state.rows.length; i++) {
    const row = state.rows[i];
    if (row.passed) continue;

    // Screen Y of this row = canvas.height * 0.72 is where squad sits visually
    // Row appears at: rowScreenY = canvas.height * 0.72 + (row.worldY + state.worldY)
    const rowScreenY = canvas.height * 0.72 + row.worldY + state.worldY;

    if (row.type === 'doors') {
      // Detect passage: squad center crosses door row
      if (rowScreenY <= canvas.height * 0.72) {
        row.passed = true;

        // Determine which door the squad passed through
        const cw = canvas.width;
        const doorTotalW = DOOR_WIDTH * 2 + DOOR_GAP;
        const leftDoorCenterX  = cw / 2 - DOOR_GAP / 2 - DOOR_WIDTH / 2;
        const rightDoorCenterX = cw / 2 + DOOR_GAP / 2 + DOOR_WIDTH / 2;

        const distToLeft  = Math.abs(state.squadX - leftDoorCenterX);
        const distToRight = Math.abs(state.squadX - rightDoorCenterX);
        const chosenDoor  = distToLeft < distToRight ? row.left : row.right;

        applyDoor(chosenDoor);
        if (state.phase !== 'gate') return; // game over triggered
        spawnParticles(state.squadX, canvas.height * 0.72, chosenDoor.color === 'red' ? '#ff4757' : '#2ed573', 12);
      }
    } else if (row.type === 'enemies') {
      if (rowScreenY <= canvas.height * 0.72) {
        row.passed = true;
        // Transition to battle
        state.phase = 'battle';
        spawnEnemies(row.count);
        state.bullets = [];
        state.shootTimer = 0;
        return;
      }
    }
  }

  // If all rows passed without enemies (shouldn't happen with proper level data)
  const allPassed = state.rows.every(r => r.passed);
  if (allPassed) levelWin();
}

// ── Battle phase ────────────────────────────
function updateBattlePhase() {
  state.shootTimer++;

  // Enemies advance toward player squad
  for (const e of state.enemies) {
    e.y += ENEMY_ADVANCE;
    if (e.flashTimer > 0) e.flashTimer--;
  }

  // Shoot
  if (state.shootTimer >= SHOOT_INTERVAL) {
    state.shootTimer = 0;
    fireFromSquad();
  }

  // Move bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    // Remove off-screen
    if (b.y < -20 || b.x < -20 || b.x > canvas.width + 20) {
      state.bullets.splice(i, 1);
    }
  }

  // Bullet vs Enemy collision
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    let hit = false;
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      if (dx * dx + dy * dy < (BULLET_RADIUS + e.radius) ** 2) {
        spawnParticles(e.x, e.y, '#ff6b35', 5);
        state.enemies.splice(ei, 1);
        hit = true;
        break;
      }
    }
    if (hit) state.bullets.splice(bi, 1);
  }

  // Enemy vs Squad collision
  const squadPositions = getSquadPositions();
  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    // Check if any enemy reached squad Y band
    if (e.y + e.radius >= canvas.height * 0.72 - UNIT_RADIUS) {
      // Kill one unit per colliding enemy
      spawnParticles(e.x, e.y, '#ff4757', 10);
      state.enemies.splice(ei, 1);
      state.units = Math.max(0, state.units - 1);
      updateHUD();
      if (state.units <= 0) { gameOver(); return; }
    }
  }

  // Check win condition
  if (state.enemies.length === 0) {
    levelWin();
  }
}

// ── Fire bullets toward nearest enemies ────
function fireFromSquad() {
  if (state.enemies.length === 0) return;
  const positions = getSquadPositions();
  // Each unit fires at nearest enemy
  for (const pos of positions) {
    // Find nearest alive enemy
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of state.enemies) {
      const dx = e.x - pos.x;
      const dy = e.y - pos.y;
      const d  = dx * dx + dy * dy;
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }
    if (!nearest) continue;
    const dx = nearest.x - pos.x;
    const dy = nearest.y - pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    state.bullets.push({
      x: pos.x,
      y: pos.y - UNIT_RADIUS,
      vx: (dx / len) * BULLET_SPEED,
      vy: (dy / len) * BULLET_SPEED,
    });
  }
}

// ── Squad unit positions ─────────────────────
function getSquadPositions() {
  const n = state.units;
  const squadY = canvas.height * 0.72;
  const positions = [];
  const cols = Math.min(n, Math.floor(canvas.width / (UNIT_SPREAD * 1.2)));
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const totalCols = Math.min(n - row * cols, cols);
    const startX = state.squadX - (totalCols - 1) * UNIT_SPREAD / 2;
    positions.push({
      x: startX + col * UNIT_SPREAD,
      y: squadY + row * UNIT_SPREAD,
    });
  }
  return positions;
}

// ══════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════
function draw() {
  const W = canvas.width;
  const H = canvas.height;

  // ── Background ─────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f0c29');
  grad.addColorStop(1, '#302b63');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Faint lane lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  const laneW = W / 6;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * laneW, 0);
    ctx.lineTo(i * laneW, H);
    ctx.stroke();
  }

  // Road center line (dashed, scrolls)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([24, 20]);
  ctx.lineDashOffset = -(state.worldY % 44);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Particles ──────────────────────────────
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (state.phase === 'gate') {
    drawGateScene();
  } else if (state.phase === 'battle') {
    drawBattleScene();
  }

  // ── Squad (always drawn in both phases) ────
  drawSquad();
}

// ── Gate scene ─────────────────────────────
function drawGateScene() {
  const W = canvas.width;
  for (const row of state.rows) {
    if (row.passed && row.type !== 'enemies') continue;
    const screenY = canvas.height * 0.72 + row.worldY + state.worldY;
    if (screenY > canvas.height + 100 || screenY < -200) continue;

    if (row.type === 'doors') {
      drawDoorPair(row, screenY, W);
    } else if (row.type === 'enemies' && !row.passed) {
      drawEnemyPreview(row, screenY, W);
    }
  }
}

function drawDoorPair(row, screenY, W) {
  const leftCX  = W / 2 - DOOR_GAP / 2 - DOOR_WIDTH / 2;
  const rightCX = W / 2 + DOOR_GAP / 2 + DOOR_WIDTH / 2;

  drawSingleDoor(row.left,  leftCX,  screenY);
  drawSingleDoor(row.right, rightCX, screenY);
}

function drawSingleDoor(door, cx, cy) {
  const w = DOOR_WIDTH;
  const h = DOOR_HEIGHT;
  const x = cx - w / 2;
  const y = cy - h / 2;

  const isRed = door.color === 'red';
  const mainColor  = isRed ? '#ff4757' : '#2ed573';
  const glowColor  = isRed ? 'rgba(255,71,87,0.35)' : 'rgba(46,213,115,0.35)';
  const darkColor  = isRed ? '#c0392b' : '#1e9e54';

  // Glow
  ctx.shadowColor = mainColor;
  ctx.shadowBlur  = 20;

  // Door frame
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 10);
  ctx.fill();

  // Door body
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGrad.addColorStop(0, mainColor);
  bodyGrad.addColorStop(1, darkColor);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Text label
  const label = isRed
    ? `-${door.value}`
    : `×${door.value}`;

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${door.value >= 10 ? 22 : 26}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur  = 6;
  ctx.fillText(label, cx, cy);
  ctx.shadowBlur = 0;
}

function drawEnemyPreview(row, screenY, W) {
  // Show a small cluster silhouette as "incoming wave" warning
  ctx.fillStyle = 'rgba(255,100,100,0.15)';
  ctx.fillRect(0, screenY - 30, W, 60);

  ctx.fillStyle = 'rgba(255,100,100,0.7)';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⚠ 敌军 ${row.count} 人 即将来袭`, W / 2, screenY);
}

// ── Battle scene ────────────────────────────
function drawBattleScene() {
  // Draw enemies
  for (const e of state.enemies) {
    drawEnemy(e);
  }

  // Draw bullets
  for (const b of state.bullets) {
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawEnemy(e) {
  const flash = e.flashTimer > 0;
  const bodyColor = flash ? '#fff' : '#e84393';
  const headColor = flash ? '#fff' : '#c0392b';

  ctx.shadowColor = '#e84393';
  ctx.shadowBlur  = 10;

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + 4, e.radius * 0.6, e.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.arc(e.x, e.y - e.radius * 0.55, e.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

// ── Squad draw ─────────────────────────────
function drawSquad() {
  if (state.units <= 0) return;
  const positions = getSquadPositions();
  for (const pos of positions) {
    drawUnit(pos.x, pos.y);
  }
}

function drawUnit(x, y) {
  ctx.shadowColor = '#4fc3f7';
  ctx.shadowBlur  = 12;

  // Body
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, UNIT_RADIUS * 0.6, UNIT_RADIUS * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#81d4fa';
  ctx.beginPath();
  ctx.arc(x, y - UNIT_RADIUS * 0.55, UNIT_RADIUS * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

// ══════════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════════
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ── Start ─────────────────────────────────
startLevel(0);
loop();
