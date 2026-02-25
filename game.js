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
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Combo mode toggle (live) ─────────────────
comboModeCheckbox.addEventListener('change', () => {
  state.comboMode = comboModeCheckbox.checked;
  if (!state.comboMode) {
    state.colorOrbs = [];
  }
});

// ══════════════════════════════════════════════
//  LEVEL DATA
//  Each level: array of rows (gate or wave)
//  gate: { type:'gate', left:{op,val}, right:{op,val} }
//    op: 'add'|'sub'|'mul'  (add=+N, sub=-N, mul=×N)
//  wave: { type:'wave', count:N }
// ══════════════════════════════════════════════
const LEVELS = [
  // Level 1 — tutorial, 6 waves
  { rows:[
    {type:'gate', left:{op:'sub',val:1}, right:{op:'add',val:2}},
    {type:'wave', count:3},
    {type:'gate', left:{op:'add',val:3}, right:{op:'sub',val:1}},
    {type:'wave', count:4},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:2}},
    {type:'wave', count:5},
    {type:'gate', left:{op:'sub',val:2}, right:{op:'add',val:4}},
    {type:'wave', count:6},
    {type:'gate', left:{op:'add',val:5}, right:{op:'sub',val:3}},
    {type:'wave', count:7},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:4}},
    {type:'wave', count:8},
  ]},
  // Level 2 — 7 waves
  { rows:[
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:3}},
    {type:'wave', count:6},
    {type:'gate', left:{op:'sub',val:4}, right:{op:'add',val:5}},
    {type:'wave', count:8},
    {type:'gate', left:{op:'add',val:6}, right:{op:'sub',val:5}},
    {type:'wave', count:10},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:6}},
    {type:'wave', count:10},
    {type:'gate', left:{op:'sub',val:3}, right:{op:'mul',val:3}},
    {type:'wave', count:12},
    {type:'gate', left:{op:'add',val:7}, right:{op:'sub',val:6}},
    {type:'wave', count:12},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:8}},
    {type:'wave', count:14},
  ]},
  // Level 3 — 8 waves
  { rows:[
    {type:'gate', left:{op:'mul',val:3}, right:{op:'sub',val:5}},
    {type:'wave', count:10},
    {type:'gate', left:{op:'sub',val:6}, right:{op:'add',val:8}},
    {type:'wave', count:12},
    {type:'gate', left:{op:'add',val:8}, right:{op:'sub',val:7}},
    {type:'wave', count:14},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:8}},
    {type:'wave', count:14},
    {type:'gate', left:{op:'sub',val:5}, right:{op:'mul',val:2}},
    {type:'wave', count:16},
    {type:'gate', left:{op:'add',val:10}, right:{op:'sub',val:9}},
    {type:'wave', count:16},
    {type:'gate', left:{op:'mul',val:3}, right:{op:'sub',val:10}},
    {type:'wave', count:18},
    {type:'gate', left:{op:'sub',val:8}, right:{op:'add',val:12}},
    {type:'wave', count:20},
  ]},
  // Level 4 — 9 waves
  { rows:[
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:8}},
    {type:'wave', count:14},
    {type:'gate', left:{op:'sub',val:10}, right:{op:'add',val:10}},
    {type:'wave', count:16},
    {type:'gate', left:{op:'mul',val:3}, right:{op:'sub',val:12}},
    {type:'wave', count:18},
    {type:'gate', left:{op:'add',val:12}, right:{op:'sub',val:10}},
    {type:'wave', count:18},
    {type:'gate', left:{op:'sub',val:8}, right:{op:'mul',val:2}},
    {type:'wave', count:20},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:14}},
    {type:'wave', count:22},
    {type:'gate', left:{op:'add',val:15}, right:{op:'sub',val:12}},
    {type:'wave', count:22},
    {type:'gate', left:{op:'sub',val:10}, right:{op:'mul',val:3}},
    {type:'wave', count:24},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:15}},
    {type:'wave', count:28},
  ]},
  // Level 5 — 10 waves (Boss)
  { rows:[
    {type:'gate', left:{op:'mul',val:3}, right:{op:'sub',val:10}},
    {type:'wave', count:18},
    {type:'gate', left:{op:'sub',val:12}, right:{op:'add',val:15}},
    {type:'wave', count:20},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:15}},
    {type:'wave', count:22},
    {type:'gate', left:{op:'add',val:18}, right:{op:'sub',val:14}},
    {type:'wave', count:24},
    {type:'gate', left:{op:'sub',val:10}, right:{op:'mul',val:3}},
    {type:'wave', count:26},
    {type:'gate', left:{op:'mul',val:2}, right:{op:'sub',val:18}},
    {type:'wave', count:28},
    {type:'gate', left:{op:'add',val:20}, right:{op:'sub',val:16}},
    {type:'wave', count:30},
    {type:'gate', left:{op:'sub',val:15}, right:{op:'mul',val:2}},
    {type:'wave', count:32},
    {type:'gate', left:{op:'mul',val:3}, right:{op:'sub',val:20}},
    {type:'wave', count:36},
    {type:'gate', left:{op:'sub',val:18}, right:{op:'add',val:25}},
    {type:'wave', count:40},
  ]},
];

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const ROAD_WIDTH_BOTTOM = 0.44;  // fraction of W at bottom
const ROAD_WIDTH_TOP    = 0.14;  // fraction of W at top
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

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let state = {};

function defaultState(levelIdx) {
  return {
    phase: 'gate',       // 'gate' | 'battle' | 'dead' | 'win'
    level: levelIdx,
    units: 1,
    squadX: 0,           // screen pixel X of squad center (set in startLevel)
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
    comboMode: false,
    colorTokens: { red: 0, blue: 0 },  // pending tokens 0-2
    activeBuffs: [],                    // [{ color, label }]
    colorOrbs: [],                      // [{ x, y, vx, vy, color, life }]
  };
}

// ══════════════════════════════════════════════
//  LEVEL SETUP
// ══════════════════════════════════════════════
const ROW_SPACING = 420;  // world-scroll units between rows

function startLevel(levelIdx) {
  const prevBuffs = state.activeBuffs || [];
  state = defaultState(levelIdx);
  state.squadX   = W / 2;
  state.comboMode = comboModeCheckbox.checked;
  // Carry stacked buffs across levels for progression feel
  state.activeBuffs = state.comboMode ? prevBuffs : [];

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
  const squadSY = H * SQUAD_Y_FRAC;
  const scale   = scaleAtY(squadSY);
  const spacing = (UNIT_R * 2 + 3) * scale;

  state.soldiers = [];
  if (n === 0) return;

  // Place in concentric rings
  const positions = circleFormation(n);
  for (let i = 0; i < n; i++) {
    state.soldiers.push({
      ox: positions[i].x,  // offset from squad center (normalized)
      oy: positions[i].y,
      // animation
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

canvas.addEventListener('mousedown', e => { dragActive = true; lastDragX = e.clientX; });
window.addEventListener('mouseup',   () => { dragActive = false; });
window.addEventListener('mousemove', e => {
  if (!dragActive || state.phase === 'dead' || state.phase === 'win') return;
  const dx = e.clientX - lastDragX;
  lastDragX = e.clientX;
  const margin = 60;
  state.squadX = Math.max(margin, Math.min(W - margin, state.squadX + dx));
});

canvas.addEventListener('touchstart', e => {
  dragActive = true;
  lastDragX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchend', () => { dragActive = false; });
window.addEventListener('touchmove', e => {
  if (!dragActive || state.phase === 'dead' || state.phase === 'win') return;
  const dx = e.touches[0].clientX - lastDragX;
  lastDragX = e.touches[0].clientX;
  const margin = 60;
  state.squadX = Math.max(margin, Math.min(W - margin, state.squadX + dx));
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
//  APPLY GATE EFFECT
// ══════════════════════════════════════════════
function applyGate(side) {
  const color = side.op === 'sub' ? 'red' : 'blue';
  state.gateFlash = { color, timer: 18 };

  if (side.op === 'add') {
    state.units = Math.min(MAX_UNITS, state.units + side.val);
  } else if (side.op === 'sub') {
    state.units = Math.max(0, state.units - side.val);
  } else if (side.op === 'mul') {
    state.units = Math.min(MAX_UNITS, state.units * side.val);
  }

  updateHUD();
  buildSoldiers();

  if (state.comboMode) {
    awardColorToken(color);
  }

  if (state.units <= 0) {
    setTimeout(gameOver, 300);
  }
}

// ══════════════════════════════════════════════
//  COLOR COMBO SYSTEM
// ══════════════════════════════════════════════
const COLOR_ORB_R    = 9;
const COLOR_ORB_LIFE = 300;  // frames before orb fades

function awardColorToken(color) {
  state.colorTokens[color]++;
  spawnTokenParticles(color);
  if (state.colorTokens[color] >= 3) {
    state.colorTokens[color] = 0;
    applyColorBuff(color);
  }
}

function applyColorBuff(color) {
  if (color === 'red') {
    state.units = Math.min(MAX_UNITS, state.units + 5);
    state.activeBuffs.push({ color: 'red', label: '+5' });
  } else {
    state.units = Math.min(MAX_UNITS, state.units * 2);
    state.activeBuffs.push({ color: 'blue', label: '×2' });
  }
  updateHUD();
  buildSoldiers();
  // Flash the screen briefly with combo color
  state.gateFlash = { color, timer: 24 };
}

function spawnTokenParticles(color) {
  const cx = state.squadX;
  const cy = H * SQUAD_Y_FRAC - 30;
  const c  = color === 'red' ? '#ff5555' : '#5599ff';
  spawnParticles(cx, cy, c, 8);
}

function spawnColorOrb(x, y) {
  const color = Math.random() < 0.5 ? 'red' : 'blue';
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

// Convert an enemy's world position to current screen position
function enemyScreenPos(e) {
  // distAhead > 0 means enemy is ahead of (above) the squad
  // distAhead = ROW_SPACING  → near horizon
  // distAhead = 0            → at squad level
  // distAhead < 0            → behind/below squad (should be removed)
  const distAhead = e.waveScrollPos - state.scrollY;

  // t: 0 = at horizon, 1 = at squad screen Y
  // When distAhead = ROW_SPACING → t = 0 (horizon)
  // When distAhead = 0           → t = 1 (squad level)
  const t = Math.max(0, Math.min(1.2, 1 - distAhead / ROW_SPACING));

  const horizonY = ROAD_HORIZON * H;
  const squadY   = SQUAD_Y_FRAC * H;
  const baseY    = horizonY + t * (squadY - horizonY);

  const scale    = scaleAtY(baseY);
  const roadHalf = roadHalfAtY(baseY);

  // offsetX is in pixels at squad level; scale it by perspective
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
        if (state.units <= 0) return;
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
        spawnParticles(pos.x, pos.y, '#ff6b35', 6);
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
  const squadSY = H * SQUAD_Y_FRAC;
  const squadSX = state.squadX;
  const scale   = scaleAtY(squadSY);
  const clusterR = getClusterRadius(state.units) * scale * (UNIT_R * 2 + 3);

  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    const pos = enemyScreenPos(e);
    const er = ENEMY_R * pos.scale;
    const dx = pos.x - squadSX, dy = pos.y - squadSY;
    if (dx*dx + dy*dy < (clusterR + er) ** 2) {
      spawnParticles(pos.x, pos.y, '#ff4757', 8);
      state.enemies.splice(ei, 1);
      state.units = Math.max(0, state.units - 1);
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
    const squadSY2  = H * SQUAD_Y_FRAC;
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
      const roadHalfOrb = roadHalfAtY(orb.y);
      const leftEdge    = W / 2 - roadHalfOrb;
      const rightEdge   = W / 2 + roadHalfOrb;
      if (orb.x - COLOR_ORB_R < leftEdge)  { orb.x = leftEdge  + COLOR_ORB_R; orb.vx = Math.abs(orb.vx); }
      if (orb.x + COLOR_ORB_R > rightEdge) { orb.x = rightEdge - COLOR_ORB_R; orb.vx = -Math.abs(orb.vx); }

      // Remove if expired or fell below screen
      if (orb.life <= 0 || orb.y > H + 60) {
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
  const squadSY = H * SQUAD_Y_FRAC;
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

  drawGates();
  drawEnemies();
  drawBullets();
  drawColorOrbs();

  drawParticles();
  drawSquad();
  drawGateFlash();

  if (state.comboMode) drawColorComboHUD();
}

// ── Background ──────────────────────────────
function drawBackground() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * ROAD_HORIZON);
  sky.addColorStop(0, '#b8d4f0');
  sky.addColorStop(1, '#ddeeff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * ROAD_HORIZON);

  // Ground below horizon
  const ground = ctx.createLinearGradient(0, H * ROAD_HORIZON, 0, H);
  ground.addColorStop(0, '#c8d8b0');
  ground.addColorStop(1, '#a0b880');
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * ROAD_HORIZON, W, H - H * ROAD_HORIZON);

  // Distant mountains silhouette
  ctx.fillStyle = 'rgba(100,130,160,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, H * ROAD_HORIZON);
  const mpts = [0.05,0.18,0.12,0.28,0.22,0.14,0.38,0.25,0.5,0.10,0.62,0.22,0.72,0.13,0.85,0.24,0.92,0.16,1.0,0.20,1.0];
  for (let i = 0; i < mpts.length - 1; i += 2) {
    ctx.lineTo(mpts[i] * W, H * ROAD_HORIZON - mpts[i+1] * H * 0.18);
  }
  ctx.lineTo(W, H * ROAD_HORIZON);
  ctx.closePath();
  ctx.fill();

  // Trees on sides
  drawTrees();
}

function drawTrees() {
  // Place trees just outside the road edges at each depth
  const depthData = [0.70, 0.55, 0.65, 0.50, 0.72];
  const treeData = [];
  for (const depth of depthData) {
    const sy = H * ROAD_HORIZON + depth * (H - H * ROAD_HORIZON) * 0.85;
    const roadEdge = roadHalfAtY(sy);
    const margin = 18 + Math.random() * 0;
    // left side
    treeData.push({ sx: W/2 - roadEdge - margin, sy, depth });
    // right side
    treeData.push({ sx: W/2 + roadEdge + margin, sy, depth });
  }
  for (const t of treeData) {
    const sy = t.sy;
    const s  = scaleAtY(sy) * 28;
    const sx = t.sx;
    // Trunk
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(sx - s*0.12, sy - s*0.3, s*0.24, s*0.3);
    // Foliage
    ctx.fillStyle = '#2d6a2d';
    ctx.beginPath();
    ctx.moveTo(sx, sy - s * 1.4);
    ctx.lineTo(sx - s * 0.55, sy - s * 0.3);
    ctx.lineTo(sx + s * 0.55, sy - s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a8a3a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - s * 1.8);
    ctx.lineTo(sx - s * 0.42, sy - s * 0.9);
    ctx.lineTo(sx + s * 0.42, sy - s * 0.9);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Road ────────────────────────────────────
function drawRoad() {
  const horizY = H * ROAD_HORIZON;
  const roadL_top  = W/2 - ROAD_WIDTH_TOP/2  * W;
  const roadR_top  = W/2 + ROAD_WIDTH_TOP/2  * W;
  const roadL_bot  = W/2 - ROAD_WIDTH_BOTTOM/2 * W;
  const roadR_bot  = W/2 + ROAD_WIDTH_BOTTOM/2 * W;

  // Road surface
  const roadGrad = ctx.createLinearGradient(0, horizY, 0, H);
  roadGrad.addColorStop(0, '#b0b8c0');
  roadGrad.addColorStop(1, '#d0d8e0');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(roadL_top, horizY);
  ctx.lineTo(roadR_top, horizY);
  ctx.lineTo(roadR_bot, H);
  ctx.lineTo(roadL_bot, H);
  ctx.closePath();
  ctx.fill();

  // Road edges (red railings like bridge)
  ctx.strokeStyle = '#cc2222';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(roadL_top, horizY); ctx.lineTo(roadL_bot, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(roadR_top, horizY); ctx.lineTo(roadR_bot, H); ctx.stroke();

  // Center dashed line (scrolling)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 18]);
  ctx.lineDashOffset = -(state.scrollY % 38);
  ctx.beginPath();
  ctx.moveTo(W/2, horizY);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Road shadow at horizon
  const shadowGrad = ctx.createLinearGradient(0, horizY, 0, horizY + 30);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(0, horizY, W, 30);
}

// ── Gates ───────────────────────────────────
function drawGates() {
  for (const row of state.rows) {
    if (row.type !== 'gate' || row.passed) continue;

    const distAhead = row.scrollPos - state.scrollY;
    if (distAhead < -GATE_PASS_ZONE || distAhead > ROW_SPACING * 1.5) continue;

    // Map distAhead to a worldY fraction (0=horizon, 1=bottom)
    // distAhead=0 means at squad level, distAhead=ROW_SPACING means far ahead
    const worldYFrac = Math.max(0, Math.min(1,
      SQUAD_Y_FRAC - (distAhead / ROW_SPACING) * (SQUAD_Y_FRAC - ROAD_HORIZON - 0.05)
    ));

    const sy = ROAD_HORIZON * H + worldYFrac * (H - ROAD_HORIZON * H);
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

    // Vertical divider post
    ctx.fillStyle = '#aaa';
    ctx.fillRect(centerX - 3 * scale, gateTop, 6 * scale, gateH);
  }
}

function drawGatePanel(side, x1, x2, y1, y2, scale) {
  const isRed = side.op === 'sub';
  const mainColor = isRed ? '#e8293a' : '#2979e8';
  const lightColor= isRed ? 'rgba(255,80,100,0.85)' : 'rgba(60,140,255,0.85)';
  const darkColor = isRed ? '#9b1a25' : '#1a4e9b';

  // Semi-transparent fill
  ctx.fillStyle = isRed ? 'rgba(232,41,58,0.22)' : 'rgba(41,121,232,0.22)';
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

  // Top/bottom bars
  const barH = Math.max(6, 10 * scale);
  ctx.fillStyle = mainColor;
  ctx.fillRect(x1, y1, x2 - x1, barH);
  ctx.fillRect(x1, y2 - barH, x2 - x1, barH);

  // Side posts
  const postW = Math.max(5, 8 * scale);
  ctx.fillStyle = darkColor;
  ctx.fillRect(x1, y1, postW, y2 - y1);
  ctx.fillRect(x2 - postW, y1, postW, y2 - y1);

  // Label
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  let label = '';
  if (side.op === 'add') label = `+${side.val}`;
  else if (side.op === 'sub') label = `-${side.val}`;
  else if (side.op === 'mul') label = `×${side.val}`;

  const fontSize = Math.max(14, 28 * scale);
  ctx.font = `900 ${fontSize}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(label, cx + 2, cy + 2);

  // Main text
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = isRed ? '#ff8888' : '#88aaff';
  ctx.shadowBlur = 8 * scale;
  ctx.fillText(label, cx, cy);
  ctx.shadowBlur = 0;
}

// ── Enemies ─────────────────────────────────
function drawEnemies() {
  // Compute screen positions and sort by y (far → near)
  const withPos = state.enemies.map(e => ({ e, pos: enemyScreenPos(e) }));
  withPos.sort((a, b) => a.pos.y - b.pos.y);
  for (const { e, pos } of withPos) {
    drawEnemyFigure(pos.x, pos.y, pos.scale, e.flashTimer > 0);
  }
}

function drawEnemyFigure(x, y, s, flash) {
  if (s === undefined) { s = scaleAtY(y); flash = false; }
  const br = ENEMY_R * s;
  const hr = ENEMY_HEAD_R * s;

  ctx.shadowColor = flash ? '#fff' : '#e84393';
  ctx.shadowBlur  = flash ? 16 : 8;

  // Body
  ctx.fillStyle = flash ? '#fff' : '#c0392b';
  ctx.beginPath();
  ctx.ellipse(x, y + br * 0.3, br * 0.65, br * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = flash ? '#fff' : '#e84393';
  ctx.beginPath();
  ctx.arc(x, y - br * 0.6, hr, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = flash ? '#fff' : '#8b0000';
  ctx.beginPath();
  ctx.ellipse(x, y - br * 0.6 - hr * 0.3, hr * 0.9, hr * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.fill();

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

  const squadSY = H * SQUAD_Y_FRAC;
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
    drawSoldierFigure(sx, sy, scale);
  }
}

function drawSoldierFigure(x, y, scale) {
  const br = UNIT_R * scale;
  const hr = HEAD_R * scale;

  ctx.shadowColor = '#4fc3f7';
  ctx.shadowBlur  = 10;

  // Body
  ctx.fillStyle = '#1565c0';
  ctx.beginPath();
  ctx.ellipse(x, y + br * 0.3, br * 0.65, br * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.arc(x, y - br * 0.6, hr, 0, Math.PI * 2);
  ctx.fill();

  // Helmet (blue)
  ctx.fillStyle = '#1976d2';
  ctx.beginPath();
  ctx.ellipse(x, y - br * 0.6 - hr * 0.3, hr * 0.95, hr * 0.58, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Gun flash
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.arc(x, y - br * 0.1, br * 0.18, 0, Math.PI * 2);
  ctx.fill();

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
  const color = state.gateFlash.color === 'red'
    ? `rgba(255,60,60,${t * 0.28})`
    : `rgba(60,120,255,${t * 0.28})`;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

// ── Color Orbs ───────────────────────────────
function drawColorOrbs() {
  if (!state.comboMode) return;
  for (const orb of state.colorOrbs) {
    const alpha = Math.min(1, orb.life / 60);
    const isRed = orb.color === 'red';
    const innerColor = isRed ? '#ff4444' : '#4488ff';
    const glowColor  = isRed ? '#ff0000' : '#0066ff';
    const rimColor   = isRed ? '#ffaaaa' : '#aaccff';

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

// ── Color Combo HUD (bottom-right) ───────────
function drawColorComboHUD() {
  const PAD    = 14;
  const SLOT_R = 9;
  const SLOT_GAP = 6;
  const ROW_H  = 28;
  const panelW = 140;
  const colors = ['red', 'blue'];

  // Height: 2 token rows + buff rows
  const buffCount = state.activeBuffs.length;
  const panelH = PAD + colors.length * ROW_H + (buffCount > 0 ? 8 + buffCount * 22 : 0) + PAD;

  const px = W - panelW - 12;
  const py = H - panelH - 12;

  // Panel background
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';
  roundRect(px, py, panelW, panelH, 12);
  ctx.fill();

  // Border
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
  ctx.fillText('颜色组合', px + PAD, py + PAD - 2);

  // Token pip rows
  let rowY = py + PAD + 14;
  for (const color of colors) {
    const count  = state.colorTokens[color];
    const isRed  = color === 'red';
    const filled = isRed ? '#ff4444' : '#4488ff';
    const empty  = isRed ? 'rgba(255,80,80,0.2)' : 'rgba(60,130,255,0.2)';
    const label  = isRed ? '红' : '蓝';

    // Color label
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = filled;
    ctx.fillText(label, px + PAD, rowY + ROW_H / 2);

    // 3 pips
    for (let i = 0; i < 3; i++) {
      const cx = px + PAD + 22 + i * (SLOT_R * 2 + SLOT_GAP);
      const cy = rowY + ROW_H / 2;
      ctx.shadowColor = filled;
      ctx.shadowBlur  = i < count ? 8 : 0;
      ctx.fillStyle   = i < count ? filled : empty;
      ctx.beginPath();
      ctx.arc(cx, cy, SLOT_R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    rowY += ROW_H;
  }

  // Divider before buff list
  if (buffCount > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + PAD, rowY + 4);
    ctx.lineTo(px + panelW - PAD, rowY + 4);
    ctx.stroke();
    rowY += 12;

    // Stacked buffs list
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < buffCount; i++) {
      const buff  = state.activeBuffs[i];
      const isRed = buff.color === 'red';
      const dotColor = isRed ? '#ff4444' : '#4488ff';
      const cy = rowY + 10;

      // Dot indicator
      ctx.fillStyle = dotColor;
      ctx.shadowColor = dotColor;
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(px + PAD + 6, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Buff label
      ctx.fillStyle = '#ffffff';
      ctx.fillText(buff.label, px + PAD + 16, cy);

      rowY += 22;
    }
  }

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
