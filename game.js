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
// ══════════════════════════════════════════════
//  RELIC SYSTEM
// ══════════════════════════════════════════════
const RELIC_DEFS = {
  ocean_tear:   { name: '海洋之泪',   desc: '蓝色消除时额外+1士兵',             icon: '💧' },
  rb_blind:     { name: '红蓝色盲',   desc: '红/蓝球10%概率变为双色球',         icon: '🔮' },
  dithering:    { name: '三心二意',   desc: '消除时10%额外消除一个相邻球',       icon: '💫' },
  desert:       { name: '沙漠',       desc: '黄色消除后转化2个球为黄色',         icon: '🏜️' },
  iron_wall:    { name: '铁壁',       desc: '受到伤害时15%概率不损失单位',       icon: '🛡️' },
  magnet:       { name: '磁石',       desc: '球的吸附半径增大50%',               icon: '🧲' },
  rapid_fire:   { name: '速射',       desc: '射击间隔缩短25%',                   icon: '🔥' },
  lucky_clover: { name: '四叶草',     desc: '击杀掉球概率提升至35%',             icon: '🍀' },
  phoenix:      { name: '凤凰羽',     desc: '单位归零时复活1次(3单位)',           icon: '🪶' },
  chain_light:  { name: '连锁闪电',   desc: '每次消除后20%概率随机再消一组',     icon: '⚡' },
  golden_ratio: { name: '黄金比例',   desc: '三色各有1球时自动消除奖励+2兵',     icon: '✨' },
  frost_armor:  { name: '寒冰护甲',   desc: '墙壁超时时限延长50%',               icon: '❄️' },
};
const RELIC_IDS = Object.keys(RELIC_DEFS);
function chance(p) { return Math.random() < p; }
function rollRelicChoices(n) {
  const pool = [...RELIC_IDS];
  const picks = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}
function hasRelic(id) { return !!(state.relics && state.relics[id]); }

function isMatchable(a, b) {
  if (a === b) return true;
  if (a === 'dual' && (b === 'red' || b === 'blue')) return true;
  if (b === 'dual' && (a === 'red' || a === 'blue')) return true;
  return false;
}

const COLORS3 = ['red', 'yellow', 'blue'];
function randColor() { return COLORS3[Math.floor(Math.random() * 3)]; }
function randColorExcept(c) { const opts = COLORS3.filter(x => x !== c); return opts[Math.floor(Math.random() * opts.length)]; }
function gateRow() { const l = randColor(); return {type:'gate', left:{color:l}, right:{color:randColorExcept(l)}}; }
function wallRow(hp) { return {type:'wall', hp}; }
const WALL_TIMEOUT_FRAMES = 600; // 10 seconds @60fps to break the wall
const LEVELS = [
  // Level 1 — Tutorial (gentle)
  { rows:[
    gateRow(), {type:'wave', count:8},
    gateRow(), {type:'wave', count:10},
    wallRow(6),
    gateRow(), {type:'wave', count:12},
    gateRow(), {type:'wave', count:10},
    wallRow(10),
  ]},
  // Level 2 — Easy
  { rows:[
    gateRow(), {type:'wave', count:12},
    gateRow(), {type:'wave', count:16},
    gateRow(), {type:'wave', count:18},
    wallRow(14),
    gateRow(), {type:'wave', count:18},
    gateRow(), {type:'wave', count:22},
    wallRow(18),
  ]},
  // Level 3 — Medium
  { rows:[
    gateRow(), {type:'wave', count:20},
    gateRow(), {type:'wave', count:24},
    gateRow(), {type:'wave', count:28},
    wallRow(20),
    gateRow(), {type:'wave', count:28},
    gateRow(), {type:'wave', count:32},
    gateRow(), {type:'wave', count:32},
    wallRow(26),
  ]},
  // Level 4 — Hard
  { rows:[
    gateRow(), {type:'wave', count:28},
    gateRow(), {type:'wave', count:32},
    gateRow(), {type:'wave', count:36},
    wallRow(26),
    gateRow(), {type:'wave', count:36},
    gateRow(), {type:'wave', count:40},
    gateRow(), {type:'wave', count:44},
    gateRow(), {type:'wave', count:48},
    wallRow(35),
  ]},
  // Level 5 — Boss (brutal)
  { rows:[
    gateRow(), {type:'wave', count:36},
    gateRow(), {type:'wave', count:40},
    gateRow(), {type:'wave', count:44},
    wallRow(32),
    gateRow(), {type:'wave', count:48},
    gateRow(), {type:'wave', count:52},
    gateRow(), {type:'wave', count:56},
    gateRow(), {type:'wave', count:60},
    gateRow(), {type:'wave', count:64},
    wallRow(50),
  ]},
];

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const ROAD_WIDTH_BOTTOM = 0.92;  // fraction of W at bottom
const ROAD_WIDTH_TOP    = 0.40;  // fraction of W at top
const ROAD_HORIZON      = 0.18;  // fraction of H for horizon
const SQUAD_Y_FRAC      = 0.78;  // squad sits at this Y fraction
const SCROLL_SPEED      = 2.3;   // world scroll px/frame (slowed ~18%)
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
const ENEMY_CONVERGE    = 0.15;  // px/frame drift toward squad X

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
    stackOrbs: [],                      // ['red'|'blue'|'yellow'|'dual', ...] bottom stack
    soldierColors: [],                  // color per soldier unit
    relics: {},                         // { relic_id: true }
    lastRelicGain: null,                // relic id gained at end of last level
    activeWall: null,                   // { hp, maxHp, scrollPos, timer }
    screenShake: 0,                     // frames remaining for screen shake
    hurtFlash: 0,                       // frames remaining for red hurt vignette
    floatingTexts: [],                  // [{ x, y, text, color, life, maxLife }]
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
  const prevRelics = state.relics || {};
  state = defaultState(levelIdx);
  state.squadX   = W / 2;
  state.squadY   = getEffectiveSquadY();
  state.comboMode = true;
  state.activeBuffs = prevBuffs;
  state.stackOrbs = prevStack;
  state.soldierColors = prevColors.length ? prevColors : Array(state.units).fill('blue');
  state.relics = prevRelics;

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
  overlayBtn.style.display = '';
  overlayBtn.onclick = () => { overlay.classList.add('hidden'); cb(); };
  const rc = document.getElementById('relic-choices');
  if (rc) rc.innerHTML = '';
  overlay.classList.remove('hidden');
}

function gameOver() {
  state.phase = 'dead';
  state.relics = {};
  state.soldierColors = [];
  state.stackOrbs = [];
  state.activeBuffs = [];
  state.activeWall = null;
  showOverlay('💀','全军覆没！',`第 ${state.level+1} 关失败，单位归零。`,'再来一次', () => startLevel(state.level));
}

function levelWin() {
  state.phase = 'win';
  const isLast = state.level + 1 >= LEVELS.length;
  if (isLast) {
    state.relics = {};
    state.soldierColors = [];
    state.stackOrbs = [];
    state.activeBuffs = [];
    state.activeWall = null;
    showOverlay('🏆','全关通关！',`恭喜完成全部 ${LEVELS.length} 关！剩余单位：${state.units}`,'再玩一次', () => startLevel(0));
  } else {
    const choices = rollRelicChoices(3);
    showRelicChoice(choices, state.level);
  }
}

function showRelicChoice(choices, level) {
  overlayIcon.textContent  = '🎉';
  overlayTitle.textContent = `第 ${level+1} 关通关！`;
  overlayMsg.textContent   = `剩余单位：${state.units}\n选择一个遗物：`;
  overlayBtn.style.display = 'none';

  // Build relic choice buttons
  let choiceContainer = document.getElementById('relic-choices');
  if (!choiceContainer) {
    choiceContainer = document.createElement('div');
    choiceContainer.id = 'relic-choices';
    overlayBtn.parentNode.insertBefore(choiceContainer, overlayBtn);
  }
  choiceContainer.innerHTML = '';
  choiceContainer.style.cssText = 'display:flex; flex-direction:column; gap:10px; margin-bottom:16px;';

  for (const relicId of choices) {
    const def = RELIC_DEFS[relicId];
    const btn = document.createElement('button');
    btn.className = 'relic-choice-btn';
    btn.innerHTML = `<span style="font-size:22px;margin-right:8px;">${def.icon}</span><strong>${def.name}</strong><br><span style="font-size:12px;opacity:0.7;">${def.desc}</span>`;
    btn.style.cssText = `
      background: linear-gradient(135deg, #2a3a5e, #1a2a48);
      color: #fff; border: 1px solid rgba(255,255,255,0.2);
      border-radius: 14px; padding: 14px 18px;
      font-size: 15px; cursor: pointer; text-align: left;
      transition: transform 0.12s, border-color 0.12s;
    `;
    btn.onmouseenter = () => { btn.style.borderColor = '#667eea'; btn.style.transform = 'scale(1.03)'; };
    btn.onmouseleave = () => { btn.style.borderColor = 'rgba(255,255,255,0.2)'; btn.style.transform = 'scale(1)'; };
    btn.onclick = () => {
      state.relics[relicId] = true;
      choiceContainer.innerHTML = '';
      overlayBtn.style.display = '';
      overlay.classList.add('hidden');
      startLevel(level + 1);
    };
    choiceContainer.appendChild(btn);
  }

  overlay.classList.remove('hidden');
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
  // rb_blind relic: 10% chance red/blue becomes dual
  if (hasRelic('rb_blind') && (color === 'red' || color === 'blue') && chance(0.1)) {
    color = 'dual';
  }
  state.stackOrbs.push(color);
  spawnTokenParticles(color === 'dual' ? 'blue' : color);
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

    // Scan a sequence of indices for runs of `targetColor`, treating dual as matching
    function scanRuns(indices, targetColor) {
      let s = 0;
      while (s < indices.length) {
        const c = orbs[indices[s]];
        if (c === targetColor || (c === 'dual' && (targetColor === 'red' || targetColor === 'blue'))) {
          let e = s + 1;
          while (e < indices.length) {
            const ce = orbs[indices[e]];
            if (ce === targetColor || (ce === 'dual' && (targetColor === 'red' || targetColor === 'blue'))) {
              e++;
            } else break;
          }
          if (e - s >= 3) {
            for (let k = s; k < e; k++) toRemove.add(indices[k]);
          }
          s = e;
        } else {
          s++;
        }
      }
    }

    const scanColors = ['red', 'blue', 'yellow'];

    // --- Horizontal scan (each row, per color) ---
    for (let r = 0; r < rows; r++) {
      const rowStart = r * cols;
      const rowEnd = Math.min(rowStart + cols, len);
      const indices = [];
      for (let i = rowStart; i < rowEnd; i++) indices.push(i);
      for (const sc of scanColors) scanRuns(indices, sc);
    }

    // --- Vertical scan (each column, per color) ---
    for (let c = 0; c < cols; c++) {
      const colIdx = [];
      for (let r = 0; r < rows; r++) {
        const idx = r * cols + c;
        if (idx < len) colIdx.push(idx);
      }
      for (const sc of scanColors) scanRuns(colIdx, sc);
    }

    if (toRemove.size === 0) break;

    // --- Relic: 三心二意 — 10% chance to also remove one adjacent orb ---
    if (hasRelic('dithering') && chance(0.1)) {
      const candidates = new Set();
      for (const idx of toRemove) {
        const r = Math.floor(idx / cols), c2 = idx % cols;
        const neighbors = [];
        if (c2 > 0) neighbors.push(idx - 1);
        if (c2 < cols - 1 && idx + 1 < len) neighbors.push(idx + 1);
        if (r > 0) neighbors.push(idx - cols);
        if (idx + cols < len) neighbors.push(idx + cols);
        for (const n of neighbors) {
          if (!toRemove.has(n) && n >= 0 && n < len) candidates.add(n);
        }
      }
      if (candidates.size > 0) {
        const arr = [...candidates];
        toRemove.add(arr[Math.floor(Math.random() * arr.length)]);
      }
    }

    // --- Tally removed orbs by color for rewards ---
    const colorCounts = {};
    for (const idx of toRemove) {
      const c = orbs[idx];
      if (c === 'dual') {
        colorCounts['red'] = (colorCounts['red'] || 0) + 1;
        colorCounts['blue'] = (colorCounts['blue'] || 0) + 1;
      } else {
        colorCounts[c] = (colorCounts[c] || 0) + 1;
      }
    }

    // --- Remove in descending index order to keep array consistent ---
    const sorted = [...toRemove].sort((a, b) => b - a);
    for (const idx of sorted) state.stackOrbs.splice(idx, 1);

    // --- Relic: 沙漠 — yellow elimination converts 2 non-yellow orbs to yellow ---
    if (hasRelic('desert') && colorCounts['yellow']) {
      let converted = 0;
      const indices = [];
      for (let i = 0; i < state.stackOrbs.length; i++) {
        if (state.stackOrbs[i] !== 'yellow') indices.push(i);
      }
      for (let t = 0; t < 2 && indices.length > 0; t++) {
        const pick = Math.floor(Math.random() * indices.length);
        state.stackOrbs[indices[pick]] = 'yellow';
        indices.splice(pick, 1);
        converted++;
      }
    }

    // --- Relic: chain_light — 20% chance to randomly remove 3 extra same-color orbs ---
    if (hasRelic('chain_light') && chance(0.2) && state.stackOrbs.length >= 3) {
      const randIdx = Math.floor(Math.random() * state.stackOrbs.length);
      const chainColor = state.stackOrbs[randIdx];
      const chainRemove = [randIdx];
      for (let ci = 0; ci < state.stackOrbs.length && chainRemove.length < 3; ci++) {
        if (ci !== randIdx && isMatchable(state.stackOrbs[ci], chainColor)) chainRemove.push(ci);
      }
      if (chainRemove.length >= 3) {
        chainRemove.sort((a, b) => b - a);
        for (const ci of chainRemove) {
          const cc = state.stackOrbs[ci];
          if (cc === 'dual') {
            colorCounts['red'] = (colorCounts['red'] || 0) + 1;
            colorCounts['blue'] = (colorCounts['blue'] || 0) + 1;
          } else {
            colorCounts[cc] = (colorCounts[cc] || 0) + 1;
          }
          state.stackOrbs.splice(ci, 1);
        }
        spawnFloatingText(state.squadX, state.squadY - 60, '连锁闪电!', '#aaddff', 50);
      }
    }

    // --- Relic: golden_ratio — if stack had all 3 colors removed, bonus +2 ---
    if (hasRelic('golden_ratio') && colorCounts['red'] && colorCounts['blue'] && colorCounts['yellow']) {
      const bonus = 2;
      for (let b = 0; b < bonus; b++) {
        if (state.units < MAX_UNITS) {
          state.units++;
          state.soldierColors.push(['red','blue','yellow'][b % 3]);
        }
      }
      updateHUD();
      buildSoldiers();
      spawnFloatingText(state.squadX, state.squadY - 70, '黄金比例! +2兵', '#ffee44', 60);
    }

    // --- Award buffs: floor(count/3) per color ---
    for (const [color, count] of Object.entries(colorCounts)) {
      const buffs = Math.floor(count / 3);
      for (let b = 0; b < buffs; b++) applyColorBuff(color);
    }

    // --- Relic: 海洋之泪 — extra blue soldier per blue match-3 ---
    if (hasRelic('ocean_tear') && colorCounts['blue']) {
      const extraBlue = Math.floor(colorCounts['blue'] / 3);
      for (let b = 0; b < extraBlue; b++) {
        if (state.units < MAX_UNITS) {
          state.units++;
          state.soldierColors.push('blue');
          updateHUD();
          buildSoldiers();
        }
      }
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
  state.screenShake = 6;
  const label = color === 'red' ? '红' : color === 'yellow' ? '黄' : '蓝';
  spawnFloatingText(state.squadX, state.squadY - 40, '三消! +1 ' + label + '兵', orbTextColor(color), 55);
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
  const speed = 1.2 + Math.random() * 1.3;
  state.colorOrbs.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life: COLOR_ORB_LIFE,
    bounceCount: 0,
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

// Fixed road-bottom Y used as perspective anchor (independent of player movement)
function roadBottomY() { return H * SQUAD_Y_FRAC; }

// Convert an enemy's world position to current screen position
function enemyScreenPos(e) {
  const distAhead = e.waveScrollPos - state.scrollY;
  const t = perspT(distAhead);

  const horizonY = ROAD_HORIZON * H;
  const baseY    = horizonY + t * (roadBottomY() - horizonY);

  const scale    = scaleAtY(baseY);
  const roadHalf = roadHalfAtY(baseY);

  const normalizedX = e.offsetX / (W * ROAD_WIDTH_BOTTOM / 2);
  const sx = W / 2 + normalizedX * roadHalf;
  const sy = baseY + e.offsetY;

  return { x: sx, y: sy, scale };
}

// ══════════════════════════════════════════════
//  FLOATING TEXT
// ══════════════════════════════════════════════
function spawnFloatingText(x, y, text, color, life = 60) {
  state.floatingTexts.push({ x, y, text, color, life, maxLife: life });
}

function orbTextColor(c) {
  return c === 'red' ? '#ff6666' : c === 'yellow' ? '#ffdd44' : '#66aaff';
}

// ══════════════════════════════════════════════
//  COLLECT RING effect
// ══════════════════════════════════════════════
function spawnCollectRing(x, y, color) {
  const c = orbTextColor(color);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      life: 0.7,
      color: c,
      r: 2.5,
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

  if (state.screenShake > 0) state.screenShake--;
  if (state.hurtFlash > 0) state.hurtFlash--;

  // Floating texts
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y -= 1.2;
    ft.life--;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }

  updateWorld();
}

// ── Wall screen position helper ─────────────
function wallScreenPos(wall) {
  const distAhead = wall.scrollPos - state.scrollY;
  const t = perspT(distAhead);
  const horizonY = ROAD_HORIZON * H;
  const sy = horizonY + t * (roadBottomY() - horizonY);
  const scale = scaleAtY(sy);
  const roadHalf = roadHalfAtY(sy);
  const wallH = GATE_H_WORLD * 0.6 * scale;
  return {
    x: W / 2,
    y: sy,
    top: sy - wallH / 2,
    bottom: sy + wallH / 2,
    left: W / 2 - roadHalf,
    right: W / 2 + roadHalf,
    scale,
    roadHalf,
    wallH,
  };
}

// ── Single unified world update ─────────────
function updateWorld() {
  // Clamp squadY if stack pushed the boundary up
  state.squadY = Math.min(state.squadY, getEffectiveSquadY());

  // Pause scrolling while a wall is active; otherwise scroll
  if (!state.activeWall) {
    state.scrollY += SCROLL_SPEED;
  } else {
    state.activeWall.timer--;
    if (state.activeWall.timer <= 0) {
      state.phase = 'dead';
      state.activeWall = null;
      state.relics = {};
      state.soldierColors = [];
      state.stackOrbs = [];
      state.activeBuffs = [];
      showOverlay('🧱','墙壁未击破！',`第 ${state.level+1} 关失败，火力不足！`,'再来一次', () => startLevel(state.level));
      return;
    }
  }

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
      if (distAhead <= ROW_SPACING && !row.spawned) {
        row.spawned = true;
        spawnEnemiesAtScroll(row.count, row.scrollPos);
      }
      if (distAhead <= 0 && !row.passed) {
        row.passed = true;
      }
    } else if (row.type === 'wall') {
      // Activate wall when it reaches the squad zone
      if (distAhead <= ROW_SPACING * 0.35 && !row.passed && !state.activeWall) {
        const wallTime = hasRelic('frost_armor') ? Math.round(WALL_TIMEOUT_FRAMES * 1.5) : WALL_TIMEOUT_FRAMES;
        state.activeWall = {
          hp: row.hp,
          maxHp: row.hp,
          scrollPos: row.scrollPos,
          timer: wallTime,
          maxTimer: wallTime,
          row,
        };
      }
    }
  }

  // ── Shooting ──────────────────────────────
  state.shootTimer++;
  const effectiveShootInterval = hasRelic('rapid_fire') ? Math.round(SHOOT_INTERVAL * 0.75) : SHOOT_INTERVAL;
  const hasTargets = state.enemies.length > 0 || state.activeWall;
  if (state.shootTimer >= effectiveShootInterval && hasTargets) {
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

  // ── Bullet vs Wall ────────────────────────
  if (state.activeWall) {
    const wall = state.activeWall;
    const wScreen = wallScreenPos(wall);
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      if (b.y >= wScreen.top - 10 && b.y <= wScreen.bottom &&
          b.x > wScreen.left && b.x < wScreen.right) {
        wall.hp--;
        spawnParticles(b.x, b.y, '#ffaa33', 5);
        spawnParticles(b.x, b.y, '#ffffff', 3);
        state.bullets.splice(bi, 1);
        if (wall.hp <= 0) {
          // Wall broken
          spawnParticles(W / 2, wScreen.top, '#ff6644', 20);
          spawnParticles(W / 2, wScreen.top, '#ffcc00', 15);
          wall.row.passed = true;
          state.activeWall = null;
          break;
        }
      }
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
        const dropRate = hasRelic('lucky_clover') ? 0.35 : 0.2;
        if (state.comboMode && Math.random() < dropRate) {
          spawnColorOrb(pos.x, pos.y);
          spawnFloatingText(pos.x, pos.y - 25, '+ 球!', '#ffee66', 40);
        }
        state.enemies.splice(ei, 1);
        hit = true;
        break;
      }
    }
    if (hit) state.bullets.splice(bi, 1);
  }

  // ── Enemy convergence toward squad X ────────
  const normSqX = (state.squadX - W / 2) / (W * ROAD_WIDTH_BOTTOM / 2);
  for (const e of state.enemies) {
    const diff = normSqX * (W * ROAD_WIDTH_BOTTOM / 2) - e.offsetX;
    if (Math.abs(diff) > 2) e.offsetX += Math.sign(diff) * ENEMY_CONVERGE;
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
      spawnParticles(pos.x, pos.y, '#ff4757', 14);
      spawnParticles(pos.x, pos.y, '#ff8866', 6);
      spawnParticles(pos.x, pos.y, '#ffffff', 3);
      state.enemies.splice(ei, 1);

      // iron_wall relic: 15% chance to block damage
      if (hasRelic('iron_wall') && chance(0.15)) {
        spawnFloatingText(pos.x, pos.y - 20, '格挡!', '#66ccff');
        state.screenShake = 4;
      } else {
        state.units = Math.max(0, state.units - 1);
        if (state.soldierColors.length > state.units) state.soldierColors.pop();
        state.screenShake = 12;
        state.hurtFlash = 18;
        spawnFloatingText(pos.x, pos.y - 20, '-1', '#ff4444');
      }
      updateHUD();
      buildSoldiers();
      if (state.units <= 0) {
        // phoenix relic: revive once with 3 units
        if (hasRelic('phoenix')) {
          state.relics.phoenix = false;
          state.units = 3;
          state.soldierColors = ['blue','blue','blue'];
          spawnFloatingText(state.squadX, state.squadY - 50, '凤凰复活!', '#ffaa00', 80);
          state.screenShake = 20;
          updateHUD();
          buildSoldiers();
        } else {
          gameOver();
          return;
        }
      }
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
    const magnetMul = hasRelic('magnet') ? 1.5 : 1.0;
    const collectR  = ((getClusterRadius(state.units) + 1) * scale2 * (UNIT_R * 2 + 3) + COLOR_ORB_R + 10) * magnetMul;

    for (let oi = state.colorOrbs.length - 1; oi >= 0; oi--) {
      const orb = state.colorOrbs[oi];
      orb.x  += orb.vx;
      orb.y  += orb.vy;
      orb.vy += 0.025;  // slower gravity
      orb.life--;

      // Wall bounce (left/right road edges at orb height)
      const roadHalfOrb = roadHalfAtY(Math.min(orb.y, H));
      const leftEdge    = W / 2 - roadHalfOrb;
      const rightEdge   = W / 2 + roadHalfOrb;
      if (orb.x - COLOR_ORB_R < leftEdge)  { orb.x = leftEdge  + COLOR_ORB_R; orb.vx = Math.abs(orb.vx) * 0.8; }
      if (orb.x + COLOR_ORB_R > rightEdge) { orb.x = rightEdge - COLOR_ORB_R; orb.vx = -Math.abs(orb.vx) * 0.8; }

      // Bottom bounce — track bounces for cleanup
      if (orb.y + COLOR_ORB_R > H) {
        orb.y = H - COLOR_ORB_R;
        orb.vy = -Math.abs(orb.vy) * 0.5;
        orb.bounceCount = (orb.bounceCount || 0) + 1;
      }

      // Cleanup: remove orbs that lost too much energy to bounce back to player
      const tooSlow = Math.abs(orb.vy) < 0.3 && orb.y > squadSY2 + 80;
      if (orb.life <= 0 || (orb.bounceCount >= 3 && tooSlow)) {
        state.colorOrbs.splice(oi, 1);
        continue;
      }

      // Squad collision — with feedback
      const dx = orb.x - squadSX2, dy = orb.y - squadSY2;
      if (dx * dx + dy * dy < collectR * collectR) {
        spawnCollectRing(orb.x, orb.y, orb.color);
        const colorLabel = orb.color === 'red' ? '红' : orb.color === 'yellow' ? '黄' : '蓝';
        spawnFloatingText(orb.x, orb.y - 15, colorLabel + '球', orbTextColor(orb.color), 45);
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
  const hasEnemies = state.enemies.length > 0;
  const hasWall = !!state.activeWall;
  if (!hasEnemies && !hasWall) return;

  const squadSY = state.squadY;
  const squadSX = state.squadX;
  const scale = scaleAtY(squadSY);
  const spacing = (UNIT_R * 2 + 3) * scale;

  const enemyPositions = hasEnemies ? state.enemies.map(e => enemyScreenPos(e)) : [];
  let wallTarget = null;
  if (hasWall) {
    const ws = wallScreenPos(state.activeWall);
    wallTarget = { x: ws.x + (Math.random() - 0.5) * ws.roadHalf * 0.6, y: ws.top };
  }

  for (const sol of state.soldiers) {
    const sx = squadSX + sol.ox * spacing;
    const sy = squadSY + sol.oy * spacing;

    let target = null;
    let nearestD = Infinity;

    for (let i = 0; i < enemyPositions.length; i++) {
      const ep = enemyPositions[i];
      const dx = ep.x - sx, dy = ep.y - sy;
      const d = dx*dx + dy*dy;
      if (d < nearestD) { nearestD = d; target = ep; }
    }

    // If wall is active and closer (or no enemies), target the wall
    if (wallTarget) {
      const dx = wallTarget.x - sx, dy = wallTarget.y - sy;
      const wd = dx*dx + dy*dy;
      if (!target || wd < nearestD) target = wallTarget;
    }

    if (!target) continue;
    const dx = target.x - sx, dy = target.y - sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    state.bullets.push({ x: sx, y: sy - UNIT_R * scale, vx: dx/len * BULLET_SPEED, vy: dy/len * BULLET_SPEED });
  }
}

// ══════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════
function draw() {
  ctx.save();

  // Screen shake offset
  if (state.screenShake > 0) {
    const mag = state.screenShake * 0.8;
    ctx.translate(
      (Math.random() - 0.5) * mag * 2,
      (Math.random() - 0.5) * mag * 2
    );
  }

  ctx.clearRect(-10, -10, W + 20, H + 20);

  drawBackground();
  drawRoad();
  drawBridgeStructure();

  drawGates();
  drawWalls();
  drawEnemies();
  drawBullets();
  drawColorOrbs();

  drawParticles();
  drawSquad();
  drawBottomStackZone();
  drawGateFlash();
  drawFloatingTexts();

  // Hurt vignette
  if (state.hurtFlash > 0) {
    const t = state.hurtFlash / 18;
    ctx.fillStyle = `rgba(255,0,0,${t * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Health bar (units-based)
  drawHealthBar();

  if (state.comboMode) drawColorComboHUD();
  drawRelicHUD();

  ctx.restore();
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
    const sy = ROAD_HORIZON * H + t * (roadBottomY() - ROAD_HORIZON * H);
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

function drawWalls() {
  // Draw upcoming walls (not yet active)
  for (const row of state.rows) {
    if (row.type !== 'wall' || row.passed) continue;
    if (state.activeWall && state.activeWall.row === row) continue;
    const distAhead = row.scrollPos - state.scrollY;
    if (distAhead < 0 || distAhead > ROW_SPACING * 1.5) continue;
    const t = perspT(distAhead);
    const sy = ROAD_HORIZON * H + t * (roadBottomY() - ROAD_HORIZON * H);
    const scale = scaleAtY(sy);
    const roadHalf = roadHalfAtY(sy);
    const wallH = GATE_H_WORLD * 0.6 * scale;
    drawWallBody(W / 2, sy, roadHalf, wallH, scale, 1, 1);
  }

  // Draw active wall
  if (state.activeWall) {
    const ws = wallScreenPos(state.activeWall);
    const hpFrac = state.activeWall.hp / state.activeWall.maxHp;
    const timeFrac = state.activeWall.timer / (state.activeWall.maxTimer || WALL_TIMEOUT_FRAMES);
    drawWallBody(ws.x, ws.y, ws.roadHalf, ws.wallH, ws.scale, hpFrac, timeFrac);
  }
}

function drawWallBody(cx, cy, roadHalf, wallH, scale, hpFrac, timeFrac) {
  const left = cx - roadHalf;
  const right = cx + roadHalf;
  const top = cy - wallH / 2;
  const width = right - left;

  // Crack overlay: reduce alpha as HP drops
  const crackAlpha = 1 - hpFrac;

  // Main wall bricks
  ctx.save();
  const grad = ctx.createLinearGradient(left, top, left, top + wallH);
  grad.addColorStop(0, '#8B7355');
  grad.addColorStop(0.5, '#A0926B');
  grad.addColorStop(1, '#6B5B45');
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, width, wallH);

  // Brick pattern
  ctx.strokeStyle = `rgba(60,45,30,${0.4 + crackAlpha * 0.4})`;
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  const brickH = Math.max(6, 12 * scale);
  const brickW = Math.max(12, 28 * scale);
  let rowIdx = 0;
  for (let by = top; by < top + wallH; by += brickH) {
    const offset = (rowIdx % 2) * brickW * 0.5;
    for (let bx = left + offset; bx < right; bx += brickW) {
      ctx.strokeRect(bx, by, Math.min(brickW, right - bx), Math.min(brickH, top + wallH - by));
    }
    rowIdx++;
  }

  // Cracks as HP decreases
  if (crackAlpha > 0.1) {
    ctx.strokeStyle = `rgba(30,20,10,${crackAlpha * 0.8})`;
    ctx.lineWidth = Math.max(1, 2 * scale * crackAlpha);
    const cracks = Math.floor(crackAlpha * 6) + 1;
    for (let i = 0; i < cracks; i++) {
      const sx = left + width * (0.15 + 0.7 * ((i * 0.37 + 0.13) % 1));
      const syt = top + wallH * 0.2;
      ctx.beginPath();
      ctx.moveTo(sx, syt);
      ctx.lineTo(sx + width * 0.05 * (i % 2 ? 1 : -1), syt + wallH * 0.3);
      ctx.lineTo(sx - width * 0.03, syt + wallH * 0.6);
      ctx.stroke();
    }
  }

  // Top stone cap
  ctx.fillStyle = '#5A4A3A';
  ctx.fillRect(left - 3 * scale, top - 4 * scale, width + 6 * scale, 6 * scale);

  ctx.restore();

  // HP bar (above wall)
  const barW = width * 0.7;
  const barH = Math.max(5, 8 * scale);
  const barX = cx - barW / 2;
  const barY = top - 14 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = hpFrac > 0.5 ? '#44cc44' : hpFrac > 0.25 ? '#ccaa22' : '#cc3333';
  ctx.fillRect(barX, barY, barW * hpFrac, barH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Timer bar (below HP bar)
  if (timeFrac < 1) {
    const tBarY = barY + barH + 3;
    const tBarH = Math.max(3, 5 * scale);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(barX - 1, tBarY - 1, barW + 2, tBarH + 2);
    ctx.fillStyle = timeFrac > 0.3 ? '#4488ff' : '#ff4444';
    ctx.fillRect(barX, tBarY, barW * timeFrac, tBarH);
  }

  // Wall text
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(10, 16 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💥 BREAK!', cx, cy);
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
  if (state.shootTimer < 6 && (state.enemies.length > 0 || state.activeWall)) {
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

// ── Health bar ───────────────────────────────
function drawHealthBar() {
  const barW = 140;
  const barH = 10;
  const barX = W / 2 - barW / 2;
  const barY = 8;
  const frac = Math.max(0, state.units / MAX_UNITS);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);
  ctx.fill();

  const barColor = frac > 0.5 ? '#44dd55' : frac > 0.25 ? '#ddaa22' : '#dd3333';
  ctx.fillStyle = barColor;
  roundRect(barX, barY, barW * frac, barH, 5);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(barX, barY, barW, barH, 5);
  ctx.stroke();

  // Low-health pulsing warning (only when below 3 units)
  if (state.units <= 2 && state.units > 0) {
    const pulse = 0.12 + Math.sin(frameCount * 0.15) * 0.06;
    ctx.fillStyle = `rgba(255,0,0,${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── Floating texts ───────────────────────────
function drawFloatingTexts() {
  for (const ft of state.floatingTexts) {
    const alpha = Math.min(1, ft.life / (ft.maxLife * 0.3));
    const scale = 0.8 + 0.4 * (1 - ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(16 * scale)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
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
    const isDual = color === 'dual';
    const shadowC = isDual ? '#aa44ff' : color === 'red' ? '#ff0000' : color === 'yellow' ? '#ff9900' : '#0066ff';
    const rimC    = isDual ? '#ddaaff' : color === 'red' ? '#ffaaaa' : color === 'yellow' ? '#ffee88' : '#aaccff';
    const coreC   = isDual ? '#8844cc' : color === 'red' ? '#ff4444' : color === 'yellow' ? '#ffcc00' : '#4488ff';

    // Near-match glow (2 consecutive matchable color, horizontal or vertical)
    let nearMatch = false;
    if (i > 0 && isMatchable(state.stackOrbs[i - 1], color)) nearMatch = true;
    if (i < state.stackOrbs.length - 1 && isMatchable(state.stackOrbs[i + 1], color)) nearMatch = true;
    if (i >= orbsPerRow && isMatchable(state.stackOrbs[i - orbsPerRow], color)) nearMatch = true;
    if (i + orbsPerRow < state.stackOrbs.length && isMatchable(state.stackOrbs[i + orbsPerRow], color)) nearMatch = true;

    ctx.shadowColor = shadowC;
    ctx.shadowBlur = nearMatch ? 18 : 5;

    // Outer rim
    ctx.fillStyle = rimC;
    ctx.beginPath();
    ctx.arc(orbX, orbY, STACK_ORB_R + 2, 0, Math.PI * 2);
    ctx.fill();

    if (isDual) {
      // Split red/blue halves for dual orb
      ctx.save();
      ctx.beginPath();
      ctx.arc(orbX, orbY, STACK_ORB_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(orbX - STACK_ORB_R, orbY - STACK_ORB_R, STACK_ORB_R, STACK_ORB_R * 2);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(orbX, orbY - STACK_ORB_R, STACK_ORB_R, STACK_ORB_R * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = coreC;
      ctx.beginPath();
      ctx.arc(orbX, orbY, STACK_ORB_R, 0, Math.PI * 2);
      ctx.fill();
    }

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

// ── Relic HUD (left side) ────────────────────
function drawRelicHUD() {
  const active = RELIC_IDS.filter(id => state.relics && state.relics[id]);
  if (active.length === 0) return;

  const px = 8, py = 44;
  const lineH = 18;
  const panelH = 10 + active.length * lineH + 6;
  const panelW = 130;

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = 'rgba(10, 14, 30, 0.85)';
  roundRect(px, py, panelW, panelH, 10);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  roundRect(px, py, panelW, panelH, 10);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < active.length; i++) {
    const def = RELIC_DEFS[active[i]];
    ctx.fillStyle = '#ffffff';
    ctx.fillText(def.icon + ' ' + def.name, px + 8, py + 8 + i * lineH);
  }

  ctx.textBaseline = 'alphabetic';
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
