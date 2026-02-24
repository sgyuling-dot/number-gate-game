// ─────────────────────────────────────────────
//  数字门大作战  v2  -  game.js
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const unitCountEl = document.getElementById('unit-count');
const levelNumEl  = document.getElementById('level-num');
const overlay     = document.getElementById('overlay');
const overlayIcon = document.getElementById('overlay-icon');
const overlayTitle= document.getElementById('overlay-title');
const overlayMsg  = document.getElementById('overlay-message');
const overlayBtn  = document.getElementById('overlay-btn');

// ── Canvas resize ────────────────────────────
let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

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
    squadX: 0,           // -1..1 normalized road X
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
  };
}

// ══════════════════════════════════════════════
//  LEVEL SETUP
// ══════════════════════════════════════════════
const ROW_SPACING = 420;  // world-scroll units between rows

function startLevel(levelIdx) {
  state = defaultState(levelIdx);
  const def = LEVELS[levelIdx];

  // Assign scroll positions to each row
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
  if (!dragActive || state.phase === 'battle' || state.phase === 'dead' || state.phase === 'win') return;
  const dx = e.clientX - lastDragX;
  lastDragX = e.clientX;
  // Move squad: 1px drag = move 2px on screen, converted to normalized -1..1
  state.squadX = Math.max(-0.9, Math.min(0.9, state.squadX + (dx * 2) / W));
});

canvas.addEventListener('touchstart', e => {
  dragActive = true;
  lastDragX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener('touchend', () => { dragActive = false; });
window.addEventListener('touchmove', e => {
  if (!dragActive || state.phase === 'battle' || state.phase === 'dead' || state.phase === 'win') return;
  const dx = e.touches[0].clientX - lastDragX;
  lastDragX = e.touches[0].clientX;
  state.squadX = Math.max(-0.9, Math.min(0.9, state.squadX + (dx * 2) / W));
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

  if (state.units <= 0) {
    setTimeout(gameOver, 300);
  }
}

// ══════════════════════════════════════════════
//  SPAWN ENEMIES
// ══════════════════════════════════════════════
function spawnEnemies(count) {
  state.enemies = [];
  const cols = Math.ceil(Math.sqrt(count * 1.6));
  const spacingX = 38;
  const spacingY = 36;
  const startX = W / 2 - (cols - 1) * spacingX / 2;
  const startY = H * ROAD_HORIZON + 30;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    state.enemies.push({
      x: startX + col * spacingX + (Math.random() - 0.5) * 10,
      y: startY + row * spacingY,
      alive: true,
      flashTimer: 0,
    });
  }
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

  if (state.phase === 'gate') updateGate();
  else if (state.phase === 'battle') updateBattle();
}

// ── Gate phase ─────────────────────────────
function updateGate() {
  state.scrollY += SCROLL_SPEED;

  // If a wave intro label is counting down, pause row processing but keep scrolling
  if (state.waveLabel) {
    state.waveLabel.timer--;
    if (state.waveLabel.timer <= 0) {
      const count = state.waveLabel.pendingCount;
      state.waveLabel = null;
      state.phase = 'battle';
      spawnEnemies(count);
      state.bullets = [];
      state.shootTimer = 0;
    }
    return;
  }

  // Check rows
  for (const row of state.rows) {
    if (row.passed) continue;

    // Row appears when scrollY reaches its scrollPos
    // Row screen position: starts far (top of road) and scrolls toward player
    const distAhead = row.scrollPos - state.scrollY;

    if (row.type === 'gate') {
      // Gate passes the squad when distAhead <= 0
      if (distAhead <= 0 && distAhead > -GATE_PASS_ZONE) {
        row.passed = true;
        // Determine which side squad is on
        const side = state.squadX < 0 ? row.left : row.right;
        applyGate(side);
        if (state.units <= 0) return;
      }
    } else if (row.type === 'wave') {
      if (distAhead <= 0) {
        row.passed = true;
        // Show intro label first; battle starts after label fades
        state.waveLabel = { text: `敌军来袭！${row.count} 人`, timer: 70, pendingCount: row.count };
        return;
      }
    }
  }

  // All rows done
  if (state.rows.every(r => r.passed)) levelWin();
}

// ── Battle phase ────────────────────────────
function updateBattle() {
  state.shootTimer++;

  // Enemies advance
  for (const e of state.enemies) {
    if (!e.alive) continue;
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
    b.x += b.vx; b.y += b.vy;
    if (b.y < H * ROAD_HORIZON - 20 || b.x < 0 || b.x > W) {
      state.bullets.splice(i, 1);
    }
  }

  // Bullet vs Enemy
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    let hit = false;
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      if (!e.alive) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx*dx + dy*dy < (BULLET_R + ENEMY_R) ** 2) {
        spawnParticles(e.x, e.y, '#ff6b35', 6);
        state.enemies.splice(ei, 1);
        hit = true;
        break;
      }
    }
    if (hit) state.bullets.splice(bi, 1);
  }

  // Enemy vs Squad
  const squadSY = H * SQUAD_Y_FRAC;
  const squadSX = W / 2 + state.squadX * roadHalfAtY(squadSY);
  const scale   = scaleAtY(squadSY);
  const clusterR = getClusterRadius(state.units) * scale * (UNIT_R * 2 + 3);

  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    if (!e.alive) continue;
    const dx = e.x - squadSX, dy = e.y - squadSY;
    if (dx*dx + dy*dy < (clusterR + ENEMY_R) ** 2) {
      spawnParticles(e.x, e.y, '#ff4757', 8);
      state.enemies.splice(ei, 1);
      state.units = Math.max(0, state.units - 1);
      updateHUD();
      buildSoldiers();
      if (state.units <= 0) { gameOver(); return; }
    }
  }

  // Win wave
  if (state.enemies.length === 0) {
    state.phase = 'gate';
    // Check if more rows remain
    const remaining = state.rows.filter(r => !r.passed);
    if (remaining.length === 0) {
      levelWin();
    }
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
  const squadSX = W / 2 + state.squadX * roadHalfAtY(squadSY);

  // Each soldier fires at nearest enemy
  const scale = scaleAtY(squadSY);
  const spacing = (UNIT_R * 2 + 3) * scale;

  for (const sol of state.soldiers) {
    const sx = squadSX + sol.ox * spacing;
    const sy = squadSY + sol.oy * spacing;

    let nearest = null, nearestD = Infinity;
    for (const e of state.enemies) {
      const dx = e.x - sx, dy = e.y - sy;
      const d = dx*dx + dy*dy;
      if (d < nearestD) { nearestD = d; nearest = e; }
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

  if (state.phase === 'gate') {
    drawGates();
  } else if (state.phase === 'battle') {
    drawEnemies();
    drawBullets();
  }

  drawParticles();
  drawSquad();
  drawGateFlash();
  if (state.waveLabel) drawWaveLabel();
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
  // Sort by y so closer enemies draw on top
  const sorted = [...state.enemies].sort((a,b) => a.y - b.y);
  for (const e of sorted) {
    drawEnemyFigure(e.x, e.y, e.flashTimer > 0);
  }
}

function drawEnemyFigure(x, y, flash) {
  const s = scaleAtY(y);
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
  const squadSX = W / 2 + state.squadX * roadHalfAtY(squadSY);
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
