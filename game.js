// ─────────────────────────────────────────────
//  数字门大作战  v2  -  game.js
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const unitCountEl      = document.getElementById('unit-count');
const levelNumEl       = document.getElementById('level-num');
const overlay          = document.getElementById('overlay');
const overlayIcon      = document.getElementById('overlay-icon');
const overlayTitle     = document.getElementById('overlay-title');
const overlayMsg       = document.getElementById('overlay-message');
const overlayBtn       = document.getElementById('overlay-btn');
const comboModeCheckbox= document.getElementById('combo-mode-checkbox');

// ── Canvas resize ────────────────────────────
let W, H;
function resize() {
  W = canvas.width  = 402;
  H = canvas.height = 874;
}
resize();
window.addEventListener('resize', resize);

// ── Combo mode toggle (live) ─────────────────
comboModeCheckbox.addEventListener('change', () => {
  state.comboMode = comboModeCheckbox.checked;
  if (!state.comboMode) {
    state.colorOrbs = [];
    state.stackOrbs = [];
  }
});

// ══════════════════════════════════════════════
//  LEVEL DATA
//  Each level: array of rows (gate or wave)
//  gate: { type:'gate', left:{color}, right:{color} }
//    color: 'red'|'yellow'|'blue' — passing gives 1 floating orb of that color
//  wave: { type:'wave', count:N }
// ══════════════════════════════════════════════
const COLORS3 = ['red', 'yellow', 'blue'];
function randColor() { return COLORS3[Math.floor(Math.random() * 3)]; }
function gateRow() { return {type:'gate', left:{color:randColor()}, right:{color:randColor()}}; }
const LEVELS = [
  // Level 1
  { rows:[
    gateRow(), {type:'wave', count:4},
    gateRow(), {type:'wave', count:6},
    gateRow(), {type:'wave', count:8},
    gateRow(), {type:'wave', count:6},
    gateRow(), {type:'wave', count:8},
    gateRow(), {type:'wave', count:10},
  ]},
  // Level 2
  { rows:[
    gateRow(), {type:'wave', count:8},
    gateRow(), {type:'wave', count:10},
    gateRow(), {type:'wave', count:10},
    gateRow(), {type:'wave', count:12},
    gateRow(), {type:'wave', count:14},
    gateRow(), {type:'wave', count:14},
    gateRow(), {type:'wave', count:16},
  ]},
  // Level 3
  { rows:[
    gateRow(), {type:'wave', count:12},
    gateRow(), {type:'wave', count:14},
    gateRow(), {type:'wave', count:14},
    gateRow(), {type:'wave', count:16},
    gateRow(), {type:'wave', count:16},
    gateRow(), {type:'wave', count:18},
    gateRow(), {type:'wave', count:18},
    gateRow(), {type:'wave', count:20},
  ]},
  // Level 4
  { rows:[
    gateRow(), {type:'wave', count:16},
    gateRow(), {type:'wave', count:18},
    gateRow(), {type:'wave', count:18},
    gateRow(), {type:'wave', count:20},
    gateRow(), {type:'wave', count:22},
    gateRow(), {type:'wave', count:22},
    gateRow(), {type:'wave', count:24},
    gateRow(), {type:'wave', count:26},
    gateRow(), {type:'wave', count:28},
  ]},
  // Level 5 — Boss
  { rows:[
    gateRow(), {type:'wave', count:20},
    gateRow(), {type:'wave', count:22},
    gateRow(), {type:'wave', count:24},
    gateRow(), {type:'wave', count:26},
    gateRow(), {type:'wave', count:28},
    gateRow(), {type:'wave', count:30},
    gateRow(), {type:'wave', count:32},
    gateRow(), {type:'wave', count:34},
    gateRow(), {type:'wave', count:36},
    gateRow(), {type:'wave', count:40},
  ]},
];

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const ROAD_WIDTH_BOTTOM = 0.92;  // fraction of W at bottom
const ROAD_WIDTH_TOP    = 0.40;  // fraction of W at top
const ROAD_HORIZON      = 0.18;  // fraction of H for horizon
const SQUAD_Y_FRAC      = 0.78;  // squad sits at this Y fraction
const SCROLL_SPEED      = 3.5;   // world scroll px/frame
const UNIT_R            = 7;     // soldier body radius
const HEAD_R            = 4.5;
const ENEMY_R           = 9;
const ENEMY_HEAD_R      = 5.5;
const BULLET_R          = 3.5;
const BULLET_SPEED      = 9;
const SHOOT_INTERVAL    = 18;    // frames
const ENEMY_ADVANCE     = 0.9;   // px/frame
const GATE_H_WORLD      = 110;   // gate height in world units
const GATE_PASS_ZONE    = 30;    // px tolerance for gate passage
const MAX_UNITS         = 20;

// ── Bottom stack constants ──────────────────
const STACK_ORB_R       = 16;    // radius of orbs in the bottom stack
const STACK_ORB_GAP     = 4;     // gap between stacked orbs
const STACK_MAX_HEIGHT_FRAC = 0.55; // max fraction of H the stack can push up

// ══════════════════════════════════════════════
//  PERSPECTIVE HELPERS
//  World Y = 0 at horizon, increases downward.
//  We map worldY → screenY and compute road X bounds.
// ══════════════════════════════════════════════
function worldToScreen(worldX, worldY) {
  // worldY: 0=horizon, 1=bottom of screen
  const sy = ROAD_HORIZON * H + worldY * (H - ROAD_HORIZON * H);
  const roadHalfW = (ROAD_WIDTH_BOTTOM + (ROAD_WIDTH_TOP - ROAD_WIDTH_BOTTOM) * (1 - worldY)) * W / 2;
  const sx = W / 2 + worldX * roadHalfW;
  return { x: sx, y: sy };
}

// Road half-width in screen pixels at a given screenY
function roadHalfAtY(sy) {
  const t = (sy - ROAD_HORIZON * H) / (H - ROAD_HORIZON * H);
  return (ROAD_WIDTH_BOTTOM + (ROAD_WIDTH_TOP - ROAD_WIDTH_BOTTOM) * (1 - t)) * W / 2;
}

// Scale factor at screenY (for sizing objects)
function scaleAtY(sy) {
  const t = Math.max(0, (sy - ROAD_HORIZON * H) / (H - ROAD_HORIZON * H));
  return 0.25 + 0.75 * t;
}

// ── Bottom stack helpers ─────────────────────
function getStackOrbsPerRow() {
  const roadW = ROAD_WIDTH_BOTTOM * W / 1.25;
  return Math.max(1, Math.floor(roadW / (STACK_ORB_R * 2 + STACK_ORB_GAP)));
}

function getStackHeightPx() {
  const orbsPerRow = getStackOrbsPerRow();
  const rows = Math.ceil(state.stackOrbs.length / orbsPerRow);
  return rows * (STACK_ORB_R * 2 + STACK_ORB_GAP);
}

function getEffectiveSquadY() {
  const penalty = Math.min(getStackHeightPx(), H * STACK_MAX_HEIGHT_FRAC);
  return Math.max(H * 0.22, H * SQUAD_Y_FRAC - penalty);
}

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let state = {};

function defaultState(levelIdx) {
  return {
    phase: 'gate',       // 'gate' | 'battle' | 'dead' | 'win'
    level: levelIdx,
    units: 5,
    squadX: 0,           // screen pixel X of squad center (set in startLevel)
    squadY: 0,           // screen pixel Y of squad center (set in startLevel)
    scrollY: 0,          // total scroll distance
    rows: [],            // built from level data
    rowIdx: 0,
    bullets: [],
    enemies: [],
    shootTimer: 0,
    particles: [],
    soldiers: [],        // animated soldier positions (screen)
    gateFlash: null,     // { color, timer }
    waveLabel: null,     // { text, timer }
    // ── Combo mode ──────────────────────────
    comboMode: true,
    colorTokens: { red: 0, blue: 0 },  // pending tokens 0-2
    activeBuffs: [],                    // [{ color, label }]
    colorOrbs: [],                      // [{ x, y, vx, vy, color, life }]
    stackOrbs: [],                      // ['red'|'blue', ...] bottom stack
    soldierColors: [],                  // color per soldier unit
  };
}

// ══════════════════════════════════════════════
//  LEVEL SETUP
// ══════════════════════════════════════════════
const ROW_SPACING = 420;  // world-scroll units between rows

function startLevel(levelIdx) {
  const prevBuffs = state.activeBuffs || [];
  const prevStack = state.stackOrbs || [];
  const prevColors = state.soldierColors || [];
  state = defaultState(levelIdx);
  state.squadX   = W / 2;
  state.squadY   = getEffectiveSquadY();
  state.comboMode = true;
  // Carry buffs and stack across levels for progression feel
  state.activeBuffs = prevBuffs;
  state.stackOrbs = prevStack;
  state.soldierColors = prevColors.length ? prevColors : Array(state.units).fill('blue');

  const def = LEVELS[levelIdx];
  state.rows = def.rows.map((row, i) => ({
    ...row,
    scrollPos: (i + 1) * ROW_SPACING,
    passed: false,
  }));

  levelNumEl.textContent = levelIdx + 1;
  updateHUD();
  buildSoldiers();
}

// ══════════════════════════════════════════════
//  SOLDIERS  (visual formation)
// ══════════════════════════════════════════════
function buildSoldiers() {
  // Arrange N soldiers in a tight circular cluster
  const n = state.units;
  const squadSY = state.squadY;
  const scale   = scaleAtY(squadSY);
  const spacing = (UNIT_R * 2 + 3) * scale;

  state.soldiers = [];
  if (n === 0) return;

  // Place in concentric rings
  const positions = circleFormation(n);
  for (let i = 0; i < n; i++) {
    state.soldiers.push({
      ox: positions[i].x,
      oy: positions[i].y,
      color: state.soldierColors[i] || 'blue',
      bobPhase: Math.random() * Math.PI * 2,
    });
  }
}

function circleFormation(n) {
  if (n === 1) return [{x:0, y:0}];
  const positions = [];
  // Ring sizes: 1, 6, 12, ...
  const rings = [1, 6, 12, 20];
  let remaining = n;
  let ringIdx = 0;
  let r = 0;
  while (remaining > 0) {
    const count = Math.min(rings[ringIdx] || 20, remaining);
    if (r === 0) {
      positions.push({x:0, y:0});
    } else {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        positions.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
    }
    remaining -= count;
    ringIdx++;
    r += 1;
  }
  return positions;
}

// ══════════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════════
function updateHUD() {
  unitCountEl.textContent = state.units;
  unitCountEl.classList.remove('bump');
  void unitCountEl.offsetWidth;
  unitCountEl.classList.add('bump');
  setTimeout(() => unitCountEl.classList.remove('bump'), 200);
}

// ══════════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════════
let dragActive = false;
let lastDragX  = 0;
let lastDragY  = 0;

function clampSquadPos(dx, dy) {
  const margin = 60;
  state.squadX = Math.max(margin, Math.min(W - margin, state.squadX + dx));
  const topLimit = H * 0.30;
  const botLimit = getEffectiveSquadY();
  state.squadY = Math.max(topLimit, Math.min(botLimit, state.squadY + dy));
}

canvas.addEventListener('mousedown', e => { dragActive = true; lastDragX = e.clientX; lastDragY = e.clientY; });
window.addEventListener('mouseup',   () => { dragActive = false; });
window.addEventListener('mousemove', e => {
  if (!dragActive || state.phase === 'dead' || state.phase === 'win') return;
  const dx = e.clientX - lastDragX;
  const dy = e.clientY - lastDragY;
  lastDragX = e.clientX;
  lastDragY = e.clientY;
  clampSquadPos(dx, dy);
});

canvas.addEventListener('touchstart', e => {
  dragActive = true;
  lastDragX = e.touches[0].clientX;
  lastDragY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', () => { dragActive = false; });
window.addEventListener('touchmove', e => {
  if (!dragActive || state.phase === 'dead' || state.phase === 'win') return;
  const dx = e.touches[0].clientX - lastDragX;
  const dy = e.touches[0].clientY - lastDragY;
  lastDragX = e.touches[0].clientX;
  lastDragY = e.touches[0].clientY;
  clampSquadPos(dx, dy);
}, { passive: true });

// ══════════════════════════════════════════════
//  OVERLAY
// ══════════════════════════════════════════════
function showOverlay(icon, title, msg, btnText, cb) {
  overlayIcon.textContent  = icon;
  overlayTitle.textContent = title;
  overlayMsg.textContent   = msg;
  overlayBtn.textContent   = btnText;
  overlayBtn.onclick = () => { overlay.classList.add('hidden'); cb(); };
  overlay.classList.remove('hidden');
}

function gameOver() {
  state.phase = 'dead';
  showOverlay('💀','全军覆没！',`第 ${state.level+1} 关失败，单位归零。`,'再来一次', () => startLevel(state.level));
}

function levelWin() {
  state.phase = 'win';
  const isLast = state.level + 1 >= LEVELS.length;
  if (isLast) {
    showOverlay('🏆','全关通关！',`恭喜完成全部 ${LEVELS.length} 关！剩余单位：${state.units}`,'再玩一次', () => startLevel(0));
  } else {
    showOverlay('🎉',`第 ${state.level+1} 关通关！`,`剩余单位：${state.units}`,'下一关', () => startLevel(state.level+1));
  }
}

// ══════════════════════════════════════════════
//  APPLY GATE EFFECT — spawn 1 floating orb of the gate's color
// ══════════════════════════════════════════════
function applyGate(side) {
  const color = side.color;
  state.gateFlash = { color, timer: 18 };
  const sy = state.squadY;
  spawnColorOrbAt(state.squadX, sy - 20, color);
}

// ══════════════════════════════════════════════
//  COLOR COMBO SYSTEM
// ══════════════════════════════════════════════
const COLOR_ORB_R    = 9;
const COLOR_ORB_LIFE = 600;  // frames before orb fades (~10s @60fps)

function awardColorToken(color) {
  collectToStack(color);
}

function collectToStack(color) {
  state.stackOrbs.push(color);
  spawnTokenParticles(color);
  resolveStackMatches();
}

function resolveStackMatches() {
  const cols = getStackOrbsPerRow();
  let looping = true;

  while (looping) {
    looping = false;
    const orbs = state.stackOrbs;
    const len = orbs.length;
    if (len < 3) break;

    const rows = Math.ceil(len / cols);
    const toRemove = new Set();

    // --- Horizontal scan (each row) ---
    for (let r = 0; r < rows; r++) {
      const rowStart = r * cols;
      const rowEnd = Math.min(rowStart + cols, len);
      let s = rowStart;
      while (s < rowEnd) {
        let e = s + 1;
        while (e < rowEnd && orbs[e] === orbs[s]) e++;
        if (e - s >= 3) {
          for (let k = s; k < e; k++) toRemove.add(k);
        }
        s = e;
      }
    }

    // --- Vertical scan (each column) ---
    for (let c = 0; c < cols; c++) {
      const colIdx = [];
      for (let r = 0; r < rows; r++) {
        const idx = r * cols + c;
        if (idx < len) colIdx.push(idx);
      }
      let s = 0;
      while (s < colIdx.length) {
        let e = s + 1;
        while (e < colIdx.length && orbs[colIdx[e]] === orbs[colIdx[s]]) e++;
        if (e - s >= 3) {
          for (let k = s; k < e; k++) toRemove.add(colIdx[k]);
        }
        s = e;
      }
    }

    if (toRemove.size === 0) break;

    // --- Tally removed orbs by color for rewards ---
    const colorCounts = {};
    for (const idx of toRemove) {
      const c = orbs[idx];
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }

    // --- Remove in descending index order to keep array consistent ---
    const sorted = [...toRemove].sort((a, b) => b - a);
    for (const idx of sorted) state.stackOrbs.splice(idx, 1);

    // --- Award buffs: floor(count/3) per color ---
    for (const [color, count] of Object.entries(colorCounts)) {
      const buffs = Math.floor(count / 3);
      for (let b = 0; b < buffs; b++) applyColorBuff(color);
    }

    looping = true;
  }
}

function applyColorBuff(color) {
  if (state.units < MAX_UNITS) {
    state.units++;
    state.soldierColors.push(color);
  }
  state.activeBuffs.push({ color, label: '+1' });
  updateHUD();
  buildSoldiers();
  state.gateFlash = { color, timer: 24 };
}

function spawnTokenParticles(color) {
  const cx = state.squadX;
  const cy = state.squadY - 30;
  const c  = color === 'red' ? '#ff5555' : color === 'yellow' ? '#ffcc44' : '#5599ff';
  spawnParticles(cx, cy, c, 8);
}

function spawnColorOrb(x, y) {
  const r = Math.random();
  const color = r < 0.33 ? 'red' : r < 0.66 ? 'blue' : 'yellow';
  spawnColorOrbAt(x, y, color);
}

function spawnColorOrbAt(x, y, color) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
  const speed = 2 + Math.random() * 2;
  state.colorOrbs.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life: COLOR_ORB_LIFE,
  });
}

// ══════════════════════════════════════════════
//  SPAWN ENEMIES at a world scroll position
// ══════════════════════════════════════════════
function spawnEnemiesAtScroll(count, scrollPos) {
  // Enemies are stored with a worldOffset relative to their spawn scrollPos
  // Their screen Y = rowScreenY(scrollPos) + grid offsets, scrolling with the world
  const cols = Math.ceil(Math.sqrt(count * 1.6));
  const spacingX = 36;
  const spacingY = 32;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    state.enemies.push({
      // world-space offsets from the wave's scroll position
      col, row,
      cols,
      waveScrollPos: scrollPos,
      offsetX: (col - (cols - 1) / 2) * spacingX + (Math.random() - 0.5) * 8,
      offsetY: -row * spacingY,  // negative = toward horizon (screen up)
      alive: true,
      flashTimer: 0,
    });
  }
}

// Perspective t: maps distAhead (world units) → t in [0,1]
// t=0 at horizon, t=1 at squad level.
// Linear mapping so objects scroll at uniform speed on screen.
function perspT(distAhead) {
  const d = Math.max(0, distAhead / ROW_SPACING);
  return Math.max(0, Math.min(1.2, 1 - d));
}

// Convert an enemy's world position to current screen position
function enemyScreenPos(e) {
  const distAhead = e.waveScrollPos - state.scrollY;
  const t = perspT(distAhead);

  const horizonY = ROAD_HORIZON * H;
  const sqY      = state.squadY;
  const baseY    = horizonY + t * (sqY - horizonY);

  const scale    = scaleAtY(baseY);
  const roadHalf = roadHalfAtY(baseY);

  const normalizedX = e.offsetX / (W * ROAD_WIDTH_BOTTOM / 2);
  const sx = W / 2 + normalizedX * roadHalf;
  const sy = baseY + e.offsetY;

  return { x: sx, y: sy, scale };
}

// ══════════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════════
function spawnParticles(x, y, color, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      r: 2 + Math.random() * 3,
    });
  }
}

// ══════════════════════════════════════════════
//  UPDATE
// ══════════════════════════════════════════════
let frameCount = 0;

function update() {
  if (state.phase === 'dead' || state.phase === 'win') return;
  frameCount++;

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08;
    p.life -= 0.035;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (state.gateFlash) {
    state.gateFlash.timer--;
    if (state.gateFlash.timer <= 0) state.gateFlash = null;
  }

  updateWorld();
}

// ── Single unified world update ─────────────
function updateWorld() {
  // Clamp squadY if stack pushed the boundary up
  state.squadY = Math.min(state.squadY, getEffectiveSquadY());

  // Always scroll
  state.scrollY += SCROLL_SPEED;

  // ── Spawn waves when their scrollPos is reached ──
  for (const row of state.rows) {
    if (row.passed) continue;
    const distAhead = row.scrollPos - state.scrollY;

    if (row.type === 'gate') {
      if (distAhead <= 0 && distAhead > -GATE_PASS_ZONE) {
        row.passed = true;
        const side = state.squadX < W / 2 ? row.left : row.right;
        applyGate(side);
      }
    } else if (row.type === 'wave') {
      // Pre-spawn enemies when they are one ROW_SPACING ahead (near horizon)
      // so they scroll in naturally from the distance
      if (distAhead <= ROW_SPACING && !row.spawned) {
        row.spawned = true;
        spawnEnemiesAtScroll(row.count, row.scrollPos);
      }
      // Mark passed once wave has reached the squad
      if (distAhead <= 0 && !row.passed) {
        row.passed = true;
      }
    }
  }

  // ── Shooting ──────────────────────────────
  state.shootTimer++;
  if (state.shootTimer >= SHOOT_INTERVAL && state.enemies.length > 0) {
    state.shootTimer = 0;
    fireFromSquad();
  }

  // ── Move bullets ──────────────────────────
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.y < H * ROAD_HORIZON - 20 || b.x < 0 || b.x > W) {
      state.bullets.splice(i, 1);
    }
  }

  // ── Bullet vs Enemy ───────────────────────
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    let hit = false;
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      const pos = enemyScreenPos(e);
      const er = ENEMY_R * pos.scale;
      const dx = b.x - pos.x, dy = b.y - pos.y;
      if (dx*dx + dy*dy < (BULLET_R + er) ** 2) {
        spawnParticles(pos.x, pos.y, '#ff6b35', 8);
        spawnParticles(pos.x, pos.y, '#ffcc44', 4);
        spawnParticles(pos.x, pos.y, '#ffffff', 2);
        if (state.comboMode && Math.random() < 0.2) {
          spawnColorOrb(pos.x, pos.y);
        }
        state.enemies.splice(ei, 1);
        hit = true;
        break;
      }
    }
    if (hit) state.bullets.splice(bi, 1);
  }

  // ── Enemy vs Squad collision ───────────────
  const squadSY = state.squadY;
  const squadSX = state.squadX;
  const scale   = scaleAtY(squadSY);
  const clusterR = getClusterRadius(state.units) * scale * (UNIT_R * 2 + 3);

  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    const pos = enemyScreenPos(e);
    const er = ENEMY_R * pos.scale;
    const dx = pos.x - squadSX, dy = pos.y - squadSY;
    if (dx*dx + dy*dy < (clusterR + er) ** 2) {
      spawnParticles(pos.x, pos.y, '#ff4757', 10);
      spawnParticles(pos.x, pos.y, '#ff8866', 4);
      state.enemies.splice(ei, 1);
      state.units = Math.max(0, state.units - 1);
      if (state.soldierColors.length > state.units) state.soldierColors.pop();
      updateHUD();
      buildSoldiers();
      if (state.units <= 0) { gameOver(); return; }
    }
  }

  // ── Remove enemies that scrolled past the squad ──
  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const pos = enemyScreenPos(state.enemies[ei]);
    if (pos.y > H + 60) state.enemies.splice(ei, 1);
  }

  // ── Color orbs (combo mode) ───────────────
  if (state.comboMode) {
    const squadSY2  = state.squadY;
    const squadSX2  = state.squadX;
    const scale2    = scaleAtY(squadSY2);
    const collectR  = (getClusterRadius(state.units) + 1) * scale2 * (UNIT_R * 2 + 3) + COLOR_ORB_R + 10;

    for (let oi = state.colorOrbs.length - 1; oi >= 0; oi--) {
      const orb = state.colorOrbs[oi];
      orb.x  += orb.vx;
      orb.y  += orb.vy;
      orb.vy += 0.04;  // gentle gravity
      orb.life--;

      // Wall bounce (left/right road edges at orb height)
      const roadHalfOrb = roadHalfAtY(Math.min(orb.y, H));
      const leftEdge    = W / 2 - roadHalfOrb;
      const rightEdge   = W / 2 + roadHalfOrb;
      if (orb.x - COLOR_ORB_R < leftEdge)  { orb.x = leftEdge  + COLOR_ORB_R; orb.vx = Math.abs(orb.vx); }
      if (orb.x + COLOR_ORB_R > rightEdge) { orb.x = rightEdge - COLOR_ORB_R; orb.vx = -Math.abs(orb.vx); }

      // Bottom bounce
      if (orb.y + COLOR_ORB_R > H) {
        orb.y = H - COLOR_ORB_R;
        orb.vy = -Math.abs(orb.vy) * 0.7;
      }

      // Remove only when life expires
      if (orb.life <= 0) {
        state.colorOrbs.splice(oi, 1);
        continue;
      }

      // Squad collision
      const dx = orb.x - squadSX2, dy = orb.y - squadSY2;
      if (dx * dx + dy * dy < collectR * collectR) {
        awardColorToken(orb.color);
        state.colorOrbs.splice(oi, 1);
      }
    }
  }

  // ── Level complete when all rows passed and no enemies left ──
  if (state.rows.every(r => r.passed) && state.enemies.length === 0) {
    levelWin();
  }
}

function getClusterRadius(n) {
  if (n <= 1) return 0.5;
  if (n <= 7) return 1;
  if (n <= 13) return 2;
  return 3;
}

// ── Fire ────────────────────────────────────
function fireFromSquad() {
  if (state.enemies.length === 0) return;
  const squadSY = state.squadY;
  const squadSX = state.squadX;
  const scale = scaleAtY(squadSY);
  const spacing = (UNIT_R * 2 + 3) * scale;

  // Pre-compute enemy screen positions
  const enemyPositions = state.enemies.map(e => enemyScreenPos(e));

  for (const sol of state.soldiers) {
    const sx = squadSX + sol.ox * spacing;
    const sy = squadSY + sol.oy * spacing;

    let nearest = null, nearestD = Infinity;
    for (let i = 0; i < enemyPositions.length; i++) {
      const ep = enemyPositions[i];
      const dx = ep.x - sx, dy = ep.y - sy;
      const d = dx*dx + dy*dy;
      if (d < nearestD) { nearestD = d; nearest = ep; }
    }
    if (!nearest) continue;
    const dx = nearest.x - sx, dy = nearest.y - sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    state.bullets.push({ x: sx, y: sy - UNIT_R * scale, vx: dx/len * BULLET_SPEED, vy: dy/len * BULLET_SPEED });
  }
}

// ══════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, W, H);

  drawBackground();
  drawRoad();
  drawBridgeStructure();

  drawGates();
  drawEnemies();
  drawBullets();
  drawColorOrbs();

  drawParticles();
  drawSquad();
  drawBottomStackZone();
  drawGateFlash();

  if (state.comboMode) drawColorComboHUD();
}

// ── Background (winter / Last War style) ────
function drawBackground() {
  const horizY = H * ROAD_HORIZON;

  // Cold winter sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizY + 10);
  sky.addColorStop(0, '#7e94ab');
  sky.addColorStop(0.5, '#9ab0c4');
  sky.addColorStop(1, '#c4d2de');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizY + 10);

  // Snowy ground
  const ground = ctx.createLinearGradient(0, horizY, 0, H);
  ground.addColorStop(0, '#b8c4a8');
  ground.addColorStop(0.4, '#ccd8c0');
  ground.addColorStop(1, '#dce6d0');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizY, W, H);

  // Back mountain layer (blue-gray)
  const mpts = [
    0,0.06, 0.06,0.22, 0.12,0.12, 0.18,0.30, 0.26,0.16,
    0.34,0.28, 0.42,0.11, 0.50,0.26, 0.58,0.14, 0.65,0.24,
    0.72,0.10, 0.78,0.28, 0.86,0.15, 0.92,0.24, 1.0,0.08
  ];
  ctx.fillStyle = 'rgba(130,150,180,0.45)';
  ctx.beginPath();
  ctx.moveTo(0, horizY);
  for (let i = 0; i < mpts.length; i += 2) {
    ctx.lineTo(mpts[i] * W, horizY - mpts[i + 1] * H * 0.24);
  }
  ctx.lineTo(W, horizY);
  ctx.closePath();
  ctx.fill();

  // Snow caps on taller peaks
  ctx.fillStyle = 'rgba(235,242,252,0.55)';
  for (let i = 0; i < mpts.length; i += 2) {
    if (mpts[i + 1] > 0.18) {
      const px = mpts[i] * W;
      const peakY = horizY - mpts[i + 1] * H * 0.24;
      const capH = mpts[i + 1] * H * 0.24 * 0.35;
      ctx.beginPath();
      ctx.moveTo(px, peakY);
      ctx.lineTo(px - capH * 0.7, peakY + capH);
      ctx.lineTo(px + capH * 0.7, peakY + capH);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Horizon mist
  const mist = ctx.createLinearGradient(0, horizY - 15, 0, horizY + 12);
  mist.addColorStop(0, 'rgba(190,200,212,0)');
  mist.addColorStop(0.5, 'rgba(190,200,212,0.35)');
  mist.addColorStop(1, 'rgba(190,200,212,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, horizY - 15, W, 27);

  drawTrees();
}

function drawTrees() {
  const depthData = [0.72, 0.56, 0.66, 0.48, 0.74, 0.42, 0.62];
  const treeData = [];
  for (const depth of depthData) {
    const sy = H * ROAD_HORIZON + depth * (H - H * ROAD_HORIZON) * 0.85;
    const roadEdge = roadHalfAtY(sy);
    const margin = 28;
    treeData.push({ sx: W / 2 - roadEdge - margin, sy });
    treeData.push({ sx: W / 2 + roadEdge + margin, sy });
  }
  for (const t of treeData) {
    const sy = t.sy;
    const s = scaleAtY(sy) * 28;
    const sx = t.sx;
    // Trunk
    ctx.fillStyle = '#4a2e12';
    ctx.fillRect(sx - s * 0.08, sy - s * 0.2, s * 0.16, s * 0.2);
    // Lower foliage
    ctx.fillStyle = '#1a5528';
    ctx.beginPath();
    ctx.moveTo(sx, sy - s * 1.1);
    ctx.lineTo(sx - s * 0.48, sy - s * 0.15);
    ctx.lineTo(sx + s * 0.48, sy - s * 0.15);
    ctx.closePath();
    ctx.fill();
    // Upper foliage
    ctx.fillStyle = '#227a32';
    ctx.beginPath();
    ctx.moveTo(sx, sy - s * 1.6);
    ctx.lineTo(sx - s * 0.35, sy - s * 0.7);
    ctx.lineTo(sx + s * 0.35, sy - s * 0.7);
    ctx.closePath();
    ctx.fill();
    // Snow cap
    ctx.fillStyle = 'rgba(235,242,255,0.72)';
    ctx.beginPath();
    ctx.moveTo(sx, sy - s * 1.6);
    ctx.lineTo(sx - s * 0.20, sy - s * 1.15);
    ctx.lineTo(sx + s * 0.20, sy - s * 1.15);
    ctx.closePath();
    ctx.fill();
    // Snow patches on lower foliage
    ctx.fillStyle = 'rgba(225,235,248,0.4)';
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.12, sy - s * 0.8);
    ctx.lineTo(sx - s * 0.36, sy - s * 0.42);
    ctx.lineTo(sx + s * 0.06, sy - s * 0.55);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Road ────────────────────────────────────
function drawRoad() {
  const horizY = H * ROAD_HORIZON;
  const roadL_top = W / 2 - ROAD_WIDTH_TOP / 2 * W;
  const roadR_top = W / 2 + ROAD_WIDTH_TOP / 2 * W;
  const roadL_bot = W / 2 - ROAD_WIDTH_BOTTOM / 2 * W;
  const roadR_bot = W / 2 + ROAD_WIDTH_BOTTOM / 2 * W;

  // Road surface
  const roadGrad = ctx.createLinearGradient(0, horizY, 0, H);
  roadGrad.addColorStop(0, '#a8b0b8');
  roadGrad.addColorStop(1, '#c8d0d8');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(roadL_top, horizY);
  ctx.lineTo(roadR_top, horizY);
  ctx.lineTo(roadR_bot, H);
  ctx.lineTo(roadL_bot, H);
  ctx.closePath();
  ctx.fill();

  // Red railing barriers (thick edges)
  ctx.strokeStyle = '#cc2222';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(roadL_top, horizY); ctx.lineTo(roadL_bot, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(roadR_top, horizY); ctx.lineTo(roadR_bot, H); ctx.stroke();

  // Center dashed line (scrolling)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 18]);
  ctx.lineDashOffset = -(state.scrollY % 38);
  ctx.beginPath();
  ctx.moveTo(W / 2, horizY);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Road shadow at horizon
  const shadowGrad = ctx.createLinearGradient(0, horizY, 0, horizY + 30);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(0, horizY, W, 30);
}

// ── Bridge Structure (towers, cables, railing posts) ──
function drawBridgeStructure() {
  const horizY = H * ROAD_HORIZON;

  // ── Railing posts along road edges ──
  for (let i = 0; i < 14; i++) {
    const t = 0.04 + i * 0.07;
    const postY = horizY + t * (H - horizY);
    const s = scaleAtY(postY);
    const rh = roadHalfAtY(postY);
    const pw = Math.max(3, 5 * s);
    const ph = Math.max(8, 22 * s);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(W / 2 - rh - pw / 2, postY - ph, pw, ph);
    ctx.fillRect(W / 2 + rh - pw / 2, postY - ph, pw, ph);
  }

  // Horizontal railing bar (follows perspective curve above road edge)
  ctx.strokeStyle = '#cc2222';
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const y = horizY + t * (H - horizY);
      const rh = roadHalfAtY(y);
      const railH = 18 * scaleAtY(y);
      const x = W / 2 + side * rh;
      if (i === 0) ctx.moveTo(x, y - railH);
      else ctx.lineTo(x, y - railH);
    }
    ctx.stroke();
  }

  // ── Near tower pair (t ≈ 0.40) ──
  const nearT = 0.40;
  const nearY = horizY + nearT * (H - horizY);
  const ns = scaleAtY(nearY);
  const nrh = roadHalfAtY(nearY);
  const ncw = Math.max(10, 22 * ns);
  const nth = Math.max(80, 210 * ns);
  const nty = nearY - nth;
  const nlx = W / 2 - nrh;
  const nrx = W / 2 + nrh;

  // Tower shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(nlx - ncw / 2 + 3, nty + 3, ncw, nth);
  ctx.fillRect(nrx - ncw / 2 + 3, nty + 3, ncw, nth);

  // Tower columns with gradient
  for (const tx of [nlx, nrx]) {
    const tg = ctx.createLinearGradient(tx - ncw / 2, 0, tx + ncw / 2, 0);
    tg.addColorStop(0, '#a01818');
    tg.addColorStop(0.3, '#dd3333');
    tg.addColorStop(0.7, '#cc2222');
    tg.addColorStop(1, '#901212');
    ctx.fillStyle = tg;
    ctx.fillRect(tx - ncw / 2, nty, ncw, nth);
  }

  // Cross beam
  const nbh = Math.max(5, 10 * ns);
  ctx.fillStyle = '#b81818';
  ctx.fillRect(nlx - ncw / 2, nty, nrx - nlx + ncw, nbh);

  // ── Far tower pair (t ≈ 0.12) ──
  const farT = 0.12;
  const farY = horizY + farT * (H - horizY);
  const fs = scaleAtY(farY);
  const frh = roadHalfAtY(farY);
  const fcw = Math.max(5, 14 * fs);
  const fth = Math.max(45, 150 * fs);
  const fty = farY - fth;
  const flx = W / 2 - frh;
  const frx = W / 2 + frh;

  ctx.fillStyle = '#bb2020';
  ctx.fillRect(flx - fcw / 2, fty, fcw, fth);
  ctx.fillRect(frx - fcw / 2, fty, fcw, fth);
  const fbh = Math.max(3, 6 * fs);
  ctx.fillStyle = '#a81818';
  ctx.fillRect(flx - fcw / 2, fty, frx - flx + fcw, fbh);

  // ── Suspension cables ──
  // Main cable between tower tops (catenary)
  ctx.strokeStyle = '#cc3333';
  ctx.lineWidth = Math.max(2, 4 * ns);
  const midY = Math.max(nty, fty) + 45 * ns;
  for (const [nx, fx] of [[nlx, flx], [nrx, frx]]) {
    ctx.beginPath();
    ctx.moveTo(nx, nty + nbh / 2);
    ctx.quadraticCurveTo((nx + fx) / 2, midY, fx, fty + fbh / 2);
    ctx.stroke();
  }

  // Fan cables from near tower toward viewer
  ctx.lineWidth = Math.max(1, 1.5 * ns);
  ctx.globalAlpha = 0.6;
  for (let i = 1; i <= 6; i++) {
    const ct = nearT + (1 - nearT) * (i / 6);
    const cy = horizY + ct * (H - horizY);
    const crh = roadHalfAtY(cy);
    ctx.beginPath(); ctx.moveTo(nlx, nty + nbh); ctx.lineTo(W / 2 - crh, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nrx, nty + nbh); ctx.lineTo(W / 2 + crh, cy); ctx.stroke();
  }

  // Fan cables between towers
  for (let i = 1; i <= 3; i++) {
    const ct = farT + (nearT - farT) * (i / 4);
    const cy = horizY + ct * (H - horizY);
    const crh = roadHalfAtY(cy);
    ctx.beginPath(); ctx.moveTo(nlx, nty + nbh); ctx.lineTo(W / 2 - crh, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nrx, nty + nbh); ctx.lineTo(W / 2 + crh, cy); ctx.stroke();
  }

  // Fan cables from far tower toward horizon
  for (let i = 1; i <= 2; i++) {
    const ct = farT * (1 - i / 3);
    const cy = horizY + ct * (H - horizY);
    const crh = roadHalfAtY(cy);
    ctx.beginPath(); ctx.moveTo(flx, fty + fbh); ctx.lineTo(W / 2 - crh, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(frx, fty + fbh); ctx.lineTo(W / 2 + crh, cy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Gates ───────────────────────────────────
function drawGates() {
  for (const row of state.rows) {
    if (row.type !== 'gate' || row.passed) continue;

    const distAhead = row.scrollPos - state.scrollY;
    if (distAhead < -GATE_PASS_ZONE || distAhead > ROW_SPACING * 1.5) continue;

    // Use perspective mapping — same as enemyScreenPos
    const t  = perspT(distAhead);
    const sy = ROAD_HORIZON * H + t * (state.squadY - ROAD_HORIZON * H);
    const scale = scaleAtY(sy);
    const roadHalf = roadHalfAtY(sy);

    // Gate spans the full road width, split in middle
    const gateH = GATE_H_WORLD * scale;
    const gateTop = sy - gateH * 0.5;
    const gateBot = sy + gateH * 0.5;
    const centerX = W / 2;

    // Left gate
    drawGatePanel(row.left,  centerX - roadHalf, centerX, gateTop, gateBot, scale);
    // Right gate
    drawGatePanel(row.right, centerX, centerX + roadHalf, gateTop, gateBot, scale);

    // Center divider pillar
    const pillarW = Math.max(6, 10 * scale);
    const pillarExt = Math.max(8, 16 * scale);
    ctx.fillStyle = '#555';
    ctx.fillRect(centerX - pillarW / 2, gateTop - pillarExt, pillarW, gateH + pillarExt * 2);
    ctx.fillStyle = '#888';
    ctx.fillRect(centerX - pillarW / 2 + 1, gateTop - pillarExt, pillarW * 0.35, gateH + pillarExt * 2);
    // Pillar cap
    ctx.fillStyle = '#44aacc';
    ctx.fillRect(centerX - pillarW * 0.8, gateTop - pillarExt, pillarW * 1.6, Math.max(4, 6 * scale));
  }
}

function drawGatePanel(side, x1, x2, y1, y2, scale) {
  const gc = side.color;
  const w = x2 - x1;
  const h = y2 - y1;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  const palette = gc === 'red'
    ? { bg0:'rgba(220,30,50,0.82)', bg1:'rgba(200,25,40,0.75)', bg2:'rgba(180,20,35,0.82)',
        glow0:'rgba(255,80,100,0)', glow1:'rgba(255,100,120,0.25)',
        bar:'#cc1a2a', dark:'#8a1520', hi:'rgba(255,120,140,0.3)',
        orb:'#ff4444', orbGlow:'#ff0000', orbRim:'#ffaaaa' }
    : gc === 'yellow'
    ? { bg0:'rgba(210,170,20,0.82)', bg1:'rgba(190,150,15,0.75)', bg2:'rgba(170,130,10,0.82)',
        glow0:'rgba(255,220,80,0)', glow1:'rgba(255,230,100,0.25)',
        bar:'#cc9a1a', dark:'#8a6a10', hi:'rgba(255,220,120,0.3)',
        orb:'#ffcc00', orbGlow:'#ff9900', orbRim:'#ffee88' }
    : { bg0:'rgba(30,100,220,0.82)', bg1:'rgba(25,90,200,0.75)', bg2:'rgba(20,80,180,0.82)',
        glow0:'rgba(80,150,255,0)', glow1:'rgba(100,170,255,0.25)',
        bar:'#1a5acc', dark:'#12408a', hi:'rgba(120,180,255,0.3)',
        orb:'#4488ff', orbGlow:'#0055ff', orbRim:'#aaccff' };

  // Panel background
  const panelGrad = ctx.createLinearGradient(x1, y1, x1, y2);
  panelGrad.addColorStop(0, palette.bg0);
  panelGrad.addColorStop(0.5, palette.bg1);
  panelGrad.addColorStop(1, palette.bg2);
  ctx.fillStyle = panelGrad;
  ctx.fillRect(x1, y1, w, h);

  // Inner glow
  const glowGrad = ctx.createLinearGradient(x1, y1, x2, y1);
  glowGrad.addColorStop(0, palette.glow0);
  glowGrad.addColorStop(0.5, palette.glow1);
  glowGrad.addColorStop(1, palette.glow0);
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x1, y1, w, h);

  // Top / bottom bars
  const barH = Math.max(6, 12 * scale);
  ctx.fillStyle = palette.bar;
  ctx.fillRect(x1, y1, w, barH);
  ctx.fillRect(x1, y2 - barH, w, barH);

  // Side pillars
  const postW = Math.max(5, 10 * scale);
  ctx.fillStyle = palette.dark;
  ctx.fillRect(x1, y1, postW, h);
  ctx.fillRect(x2 - postW, y1, postW, h);
  ctx.fillStyle = palette.hi;
  ctx.fillRect(x1 + 1, y1, postW * 0.4, h);
  ctx.fillRect(x2 - postW + 1, y1, postW * 0.4, h);

  // Orb icon in center
  const orbR = Math.max(10, 20 * scale);
  ctx.shadowColor = palette.orbGlow;
  ctx.shadowBlur = 16 * scale;
  ctx.fillStyle = palette.orbRim;
  ctx.beginPath();
  ctx.arc(cx, cy, orbR + 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.orb;
  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Orb highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(cx - orbR * 0.3, cy - orbR * 0.3, orbR * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// ── Enemies ─────────────────────────────────
function drawEnemies() {
  if (state.enemies.length === 0) return;

  const withPos = state.enemies.map(e => ({ e, pos: enemyScreenPos(e) }));
  withPos.sort((a, b) => a.pos.y - b.pos.y);
  for (const { e, pos } of withPos) {
    drawEnemyFigure(pos.x, pos.y, pos.scale, e.flashTimer > 0);
  }

  // Enemy count badge above the group center
  let sumX = 0, minY = Infinity;
  for (const { pos } of withPos) {
    sumX += pos.x;
    if (pos.y < minY) minY = pos.y;
  }
  const avgX = sumX / withPos.length;
  const badgeY = minY - 22;
  const count = state.enemies.length;

  // Badge text setup (must be set before measureText)
  ctx.font = '800 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Badge background
  const badgeW = Math.max(32, 14 + ctx.measureText(String(count)).width);
  ctx.fillStyle = 'rgba(180,30,30,0.85)';
  roundRect(avgX - badgeW / 2, badgeY - 14, badgeW, 26, 8);
  ctx.fill();

  // Badge number
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(count), avgX, badgeY);
}

function drawEnemyFigure(x, y, s, flash) {
  if (s === undefined) { s = scaleAtY(y); flash = false; }
  const br = ENEMY_R * s;
  const hr = ENEMY_HEAD_R * s;

  ctx.shadowColor = flash ? '#fff' : '#e84393';
  ctx.shadowBlur = flash ? 18 : 6;

  // Body
  ctx.fillStyle = flash ? '#fff' : '#b8312a';
  ctx.beginPath();
  ctx.ellipse(x, y + br * 0.3, br * 0.65, br * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body highlight
  if (!flash) {
    ctx.fillStyle = 'rgba(255,100,80,0.25)';
    ctx.beginPath();
    ctx.ellipse(x - br * 0.15, y + br * 0.1, br * 0.3, br * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head
  ctx.fillStyle = flash ? '#fff' : '#e0c8a0';
  ctx.beginPath();
  ctx.arc(x, y - br * 0.6, hr, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = flash ? '#fff' : '#8b0000';
  ctx.beginPath();
  ctx.ellipse(x, y - br * 0.6 - hr * 0.3, hr * 0.95, hr * 0.58, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Helmet shine
  if (!flash) {
    ctx.fillStyle = 'rgba(255,80,80,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - hr * 0.2, y - br * 0.6 - hr * 0.45, hr * 0.3, hr * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

// ── Bullets ─────────────────────────────────
function drawBullets() {
  for (const b of state.bullets) {
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── Squad ────────────────────────────────────
function drawSquad() {
  if (state.units <= 0) return;

  const squadSY = state.squadY;
  const squadSX = state.squadX;
  const scale   = scaleAtY(squadSY);
  const spacing = (UNIT_R * 2 + 3) * scale;

  // Selection circle under squad
  ctx.strokeStyle = 'rgba(100,220,255,0.5)';
  ctx.lineWidth = 2;
  const clusterR = (getClusterRadius(state.units) + 0.8) * spacing;
  ctx.beginPath();
  ctx.ellipse(squadSX, squadSY + UNIT_R * scale * 0.5, clusterR, clusterR * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Draw soldiers
  for (const sol of state.soldiers) {
    const bob = Math.sin(frameCount * 0.12 + sol.bobPhase) * 1.5 * scale;
    const sx = squadSX + sol.ox * spacing;
    const sy = squadSY + sol.oy * spacing + bob;
    drawSoldierFigure(sx, sy, scale, sol.color);
  }
}

const SOLDIER_PALETTE = {
  red:    { body: '#c02020', helmet: '#d43030', shadow: '#ff6666', highlight: 'rgba(255,120,120,0.25)', shine: 'rgba(255,180,180,0.3)' },
  blue:   { body: '#1565c0', helmet: '#1976d2', shadow: '#4fc3f7', highlight: 'rgba(100,180,255,0.2)',  shine: 'rgba(100,200,255,0.3)' },
  yellow: { body: '#b8860b', helmet: '#cc9a10', shadow: '#f7d34f', highlight: 'rgba(255,220,100,0.25)', shine: 'rgba(255,240,150,0.3)' },
};

function drawSoldierFigure(x, y, scale, color) {
  const br = UNIT_R * scale;
  const hr = HEAD_R * scale;
  const pal = SOLDIER_PALETTE[color] || SOLDIER_PALETTE.blue;

  ctx.shadowColor = pal.shadow;
  ctx.shadowBlur = 8;

  // Body
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(x, y + br * 0.3, br * 0.65, br * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body highlight
  ctx.fillStyle = pal.highlight;
  ctx.beginPath();
  ctx.ellipse(x - br * 0.15, y + br * 0.1, br * 0.3, br * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(x, y - br * 0.6, hr, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = pal.helmet;
  ctx.beginPath();
  ctx.ellipse(x, y - br * 0.6 - hr * 0.3, hr * 0.95, hr * 0.58, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Helmet shine
  ctx.fillStyle = pal.shine;
  ctx.beginPath();
  ctx.ellipse(x - hr * 0.2, y - br * 0.6 - hr * 0.45, hr * 0.3, hr * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle flash (pulsing)
  if (state.shootTimer < 6 && state.enemies.length > 0) {
    const flashAlpha = 1 - state.shootTimer / 6;
    ctx.fillStyle = `rgba(255,230,100,${flashAlpha * 0.9})`;
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 10 * flashAlpha;
    ctx.beginPath();
    ctx.arc(x, y - br * 1.2, br * 0.3 * (1 + flashAlpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

// ── Particles ────────────────────────────────
function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Gate flash overlay ───────────────────────
function drawGateFlash() {
  if (!state.gateFlash) return;
  const t = state.gateFlash.timer / 18;
  const fc = state.gateFlash.color;
  const color = fc === 'red' ? `rgba(255,60,60,${t * 0.28})`
    : fc === 'yellow' ? `rgba(255,200,40,${t * 0.28})`
    : `rgba(60,120,255,${t * 0.28})`;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

// ── Color Orbs ───────────────────────────────
function drawColorOrbs() {
  if (!state.comboMode) return;
  for (const orb of state.colorOrbs) {
    const alpha = Math.min(1, orb.life / 60);
    const innerColor = orb.color === 'red' ? '#ff4444' : orb.color === 'yellow' ? '#ffcc00' : '#4488ff';
    const glowColor  = orb.color === 'red' ? '#ff0000' : orb.color === 'yellow' ? '#ff9900' : '#0066ff';
    const rimColor   = orb.color === 'red' ? '#ffaaaa' : orb.color === 'yellow' ? '#ffee88' : '#aaccff';

    ctx.globalAlpha = alpha;

    // Glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = 18;

    // Outer rim
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, COLOR_ORB_R + 2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, COLOR_ORB_R, 0, Math.PI * 2);
    ctx.fill();

    // Shine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(orb.x - COLOR_ORB_R * 0.3, orb.y - COLOR_ORB_R * 0.3, COLOR_ORB_R * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }
}

// ── Bottom stack zone (below squad) ──────────
function drawBottomStackZone() {
  if (state.stackOrbs.length === 0) return;

  const stackH = getStackHeightPx();
  const cappedH = Math.min(stackH, H * STACK_MAX_HEIGHT_FRAC);
  const zoneTop = H - cappedH;

  const stackW = ROAD_WIDTH_BOTTOM * W / 1.25;
  const stackL = W / 2 - stackW / 2;
  const stackR = W / 2 + stackW / 2;

  // Dark background
  const zoneGrad = ctx.createLinearGradient(0, zoneTop - 12, 0, H);
  zoneGrad.addColorStop(0, 'rgba(10,10,30,0)');
  zoneGrad.addColorStop(0.08, 'rgba(10,10,30,0.6)');
  zoneGrad.addColorStop(1, 'rgba(10,10,30,0.82)');
  ctx.fillStyle = zoneGrad;
  ctx.fillRect(stackL - 6, zoneTop - 12, stackW + 12, cappedH + 12);

  // Top divider
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(stackL, zoneTop);
  ctx.lineTo(stackR, zoneTop);
  ctx.stroke();

  // Draw stacked orbs
  const orbsPerRow = getStackOrbsPerRow();
  const orbDiam = STACK_ORB_R * 2 + STACK_ORB_GAP;
  const rowWidth = orbsPerRow * orbDiam;
  const startX = W / 2 - rowWidth / 2 + STACK_ORB_R + STACK_ORB_GAP / 2;

  for (let i = 0; i < state.stackOrbs.length; i++) {
    const col = i % orbsPerRow;
    const row = Math.floor(i / orbsPerRow);
    const orbX = startX + col * orbDiam;
    const orbY = H - STACK_ORB_R - STACK_ORB_GAP - row * orbDiam;

    if (orbY < zoneTop - STACK_ORB_R) continue;

    const color = state.stackOrbs[i];
    const shadowC = color === 'red' ? '#ff0000' : color === 'yellow' ? '#ff9900' : '#0066ff';
    const rimC    = color === 'red' ? '#ffaaaa' : color === 'yellow' ? '#ffee88' : '#aaccff';
    const coreC   = color === 'red' ? '#ff4444' : color === 'yellow' ? '#ffcc00' : '#4488ff';

    // Near-match glow (2 consecutive same color, horizontal or vertical)
    let nearMatch = false;
    if (i > 0 && state.stackOrbs[i - 1] === color) nearMatch = true;
    if (i < state.stackOrbs.length - 1 && state.stackOrbs[i + 1] === color) nearMatch = true;
    if (i >= orbsPerRow && state.stackOrbs[i - orbsPerRow] === color) nearMatch = true;
    if (i + orbsPerRow < state.stackOrbs.length && state.stackOrbs[i + orbsPerRow] === color) nearMatch = true;

    ctx.shadowColor = shadowC;
    ctx.shadowBlur = nearMatch ? 18 : 5;

    // Outer rim
    ctx.fillStyle = rimC;
    ctx.beginPath();
    ctx.arc(orbX, orbY, STACK_ORB_R + 2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = coreC;
    ctx.beginPath();
    ctx.arc(orbX, orbY, STACK_ORB_R, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(orbX - STACK_ORB_R * 0.3, orbY - STACK_ORB_R * 0.3, STACK_ORB_R * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Stack count label
  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`堆栈 ${state.stackOrbs.length}`, W / 2, zoneTop - 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Color Combo HUD (bottom-right) ───────────
function drawColorComboHUD() {
  const PAD     = 14;
  const BUFF_R  = 12;
  const BUFF_GAP = 6;

  const buffCount = state.activeBuffs.length;
  if (buffCount === 0) return;

  const step = BUFF_R * 2 + BUFF_GAP;
  const panelW = PAD * 2 + Math.min(buffCount, 5) * step;
  const rows = Math.ceil(buffCount / 5);
  const panelH = PAD + 16 + rows * step + PAD;

  const px = W - panelW - 12;
  const py = 44;

  // Panel background
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';
  roundRect(px, py, panelW, panelH, 12);
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  roundRect(px, py, panelW, panelH, 12);
  ctx.stroke();

  ctx.globalAlpha = 1;

  // Title
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('三消加成', px + PAD, py + PAD - 2);

  // Buff orbs
  const startY = py + PAD + 16 + BUFF_R;
  for (let i = 0; i < buffCount; i++) {
    const buff  = state.activeBuffs[i];
    const core  = buff.color === 'red' ? '#ff4444' : buff.color === 'yellow' ? '#ffcc00' : '#4488ff';
    const glow  = buff.color === 'red' ? '#ff0000' : buff.color === 'yellow' ? '#ff9900' : '#0055ff';
    const rim   = buff.color === 'red' ? '#ffaaaa' : buff.color === 'yellow' ? '#ffee88' : '#aaccff';

    const col = i % 5;
    const row = Math.floor(i / 5);
    const bx  = px + PAD + BUFF_R + col * step;
    const by  = startY + row * step;

    ctx.shadowColor = glow;
    ctx.shadowBlur  = 14;
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(bx, by, BUFF_R + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(bx, by, BUFF_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(bx - BUFF_R * 0.3, by - BUFF_R * 0.3, BUFF_R * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Buff label
    ctx.font = '800 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(buff.label, bx, by);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Helper: draw a rounded rectangle path
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Wave label ───────────────────────────────
function drawWaveLabel() {
  const t = Math.min(1, state.waveLabel.timer / 30);
  ctx.globalAlpha = t;
  ctx.fillStyle = '#ff4757';
  ctx.font = `bold ${Math.round(W * 0.045)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 20;
  ctx.fillText(state.waveLabel.text, W / 2, H * 0.42);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════════
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

startLevel(0);
loop();
