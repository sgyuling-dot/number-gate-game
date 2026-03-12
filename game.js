// ─────────────────────────────────────────────
//  Gate Rush  v2  -  game.js
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
    state.slotQueue = [];
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
  // ═══ A — Match Ease (7) ═══
  color_storm:  { name: 'Color Storm',      desc: 'Red/Blue orbs 20% become dual-color',           cat: 'A', icon: '🔮' },
  greedy_hand:  { name: 'Greedy Hand',      desc: 'Gates produce extra orbs',                      cat: 'A', icon: '🤲' },
  purify:       { name: 'Purify',           desc: 'Auto-clear leftmost slot when full',             cat: 'A', icon: '✨' },
  chain_react:  { name: 'Chain Reaction',   desc: '25% to convert a random orb to matched color',  cat: 'A', icon: '⚡' },
  wild_card:    { name: 'Wild Card',        desc: 'Kill drops 30% chance to become dual-color',     cat: 'A', icon: '🃏' },
  echo:         { name: 'Echo',             desc: '30% extra orb injection after match-3',          cat: 'A', icon: '🔔' },
  gold_rush:    { name: 'Gold Rush',        desc: 'Yellow orbs 30% chance to inject extra yellow',  cat: 'A', icon: '⛏️' },
  // ═══ B — Weapon Boost (14) ═══
  red_core:     { name: 'Inferno Core',     desc: 'Giant size x3, explode chance 20%',             cat: 'B', icon: '🌋' },
  prism:        { name: 'Prism Refract',    desc: 'Laser 20% chance to refract to 2nd enemy',      cat: 'B', icon: '💎' },
  barrage:      { name: 'Barrage Storm',    desc: 'Split chance 25%, 7 trajectories',               cat: 'B', icon: '🌪️' },
  armor_pierce: { name: 'Armor Pierce',     desc: 'Bullet damage +1, one-shot kills',               cat: 'B', icon: '🔫' },
  speed_shot:   { name: 'Rapid Fire',       desc: 'Fire rate +30%, drop rate up to 28%',            cat: 'B', icon: '🔥' },
  overcharge:   { name: 'Overcharge Lens',  desc: 'Laser damage x2 (2->4), width +50%',             cat: 'B', icon: '🔭' },
  ricochet:     { name: 'Ricochet',         desc: 'Bullets bounce to nearest enemy on kill',         cat: 'B', icon: '🎯' },
  sniper:       { name: 'Sniper Protocol',  desc: 'Bullet speed +60%, range +50%',                  cat: 'B', icon: '🔫' },
  inferno:      { name: 'Inferno Ember',    desc: 'Explosion kills trigger chain explosions',        cat: 'B', icon: '💥' },
  thorns:       { name: 'Thorns',           desc: 'Reflect 3 damage to nearby enemies when hit',    cat: 'B', icon: '🌿' },
  berserker:    { name: 'Berserker',        desc: 'Attack speed scales up as units decrease',        cat: 'B', icon: '⚔️' },
  time_warp:    { name: 'Time Warp',        desc: 'Freeze duration doubled',                         cat: 'B', icon: '⏳' },
  homing_bolt:  { name: 'Homing Bolt',      desc: 'Bullets slightly track nearest enemy',            cat: 'B', icon: '🧭' },
  shrapnel:     { name: 'Shrapnel',         desc: 'Bullets split into 3 fragments on hit',           cat: 'B', icon: '💣' },
  // ═══ C — Soldier Base (3) ═══
  elite:        { name: 'Elite Draft',      desc: 'Match-3 spawns double units',                     cat: 'C', icon: '👑' },
  veteran:      { name: 'Veteran',          desc: 'Unit cap +10 (20->30)',                           cat: 'C', icon: '🎖️' },
  undying:      { name: 'Phoenix',          desc: 'Revive once per level (5 units + freeze)',        cat: 'C', icon: '🔱' },
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
function gateRow() {
  const l = randColor(); const r = randColorExcept(l);
  return {type:'gate', left:{color:l}, right:{color:r}};
}
function wallRow(hp) { return {type:'wall', hp}; }
const WALL_TIMEOUT_FRAMES = 600; // 10 seconds @60fps to break the wall
const LEVELS = [
  // Level 1 — Tutorial (gentle)
  { rows:[
    gateRow(), {type:'wave', count:16},
    gateRow(), {type:'wave', count:20},
    wallRow(6),
    gateRow(), {type:'wave', count:24},
    gateRow(), {type:'wave', count:20},
    wallRow(10),
  ]},
  // Level 2 — Easy
  { rows:[
    gateRow(), {type:'wave', count:24},
    gateRow(), {type:'wave', count:32},
    gateRow(), {type:'wave', count:36},
    wallRow(14),
    gateRow(), {type:'wave', count:36},
    gateRow(), {type:'wave', count:44},
    wallRow(18),
  ]},
  // Level 3 — Medium
  { rows:[
    gateRow(), {type:'wave', count:40},
    gateRow(), {type:'wave', count:48},
    gateRow(), {type:'wave', count:56},
    wallRow(20),
    gateRow(), {type:'wave', count:56},
    gateRow(), {type:'wave', count:64},
    gateRow(), {type:'wave', count:64},
    wallRow(26),
  ]},
  // Level 4 — Hard
  { rows:[
    gateRow(), {type:'wave', count:56},
    gateRow(), {type:'wave', count:64},
    gateRow(), {type:'wave', count:72},
    wallRow(26),
    gateRow(), {type:'wave', count:72},
    gateRow(), {type:'wave', count:80},
    gateRow(), {type:'wave', count:88},
    gateRow(), {type:'wave', count:96},
    wallRow(35),
  ]},
  // Level 5 — Boss (brutal)
  { rows:[
    gateRow(), {type:'wave', count:72},
    gateRow(), {type:'wave', count:80},
    gateRow(), {type:'wave', count:88},
    wallRow(32),
    gateRow(), {type:'wave', count:96},
    gateRow(), {type:'wave', count:104},
    gateRow(), {type:'wave', count:112},
    gateRow(), {type:'wave', count:120},
    gateRow(), {type:'wave', count:128},
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
let   MAX_UNITS         = 20;
const ENEMY_CONVERGE    = 0.15;  // px/frame drift toward squad X

// ── 7-slot queue constants ──────────────────
const SLOT_COUNT  = 7;
const SLOT_SIZE   = 40;
const SLOT_GAP    = 6;
const SLOT_BAR_Y_OFFSET = 48;  // distance from canvas bottom to slot bar center

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

// ── 7-slot queue helpers ─────────────────────
function slotBarY() { return H - SLOT_BAR_Y_OFFSET; }

function slotScreenX(idx) {
  const totalW = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
  const startX = (W - totalW) / 2;
  return startX + idx * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
}

function getSquadClusterOffset() {
  const scale = scaleAtY(H * SQUAD_Y_FRAC);
  const spacing = (UNIT_R * 2 + 3) * scale;
  return (getClusterRadius(state.units) + 0.8) * spacing;
}

function getEffectiveSquadY() {
  return Math.max(H * 0.22, slotBarY() - SLOT_SIZE / 2 - 12 - getSquadClusterOffset());
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
    colorOrbs: [],                      // [{ x, y, vx, vy, color, life }]
    slotQueue: [],                      // 7-slot queue: ['red'|'blue'|'yellow'|'dual', ...]
    slotFlash: new Array(SLOT_COUNT).fill(0),  // per-slot flash timer
    slotSkillDecay: { red:0, blue:0, yellow:0 },
    freezeTimer: 0,                     // frames remaining for enemy freeze
    soldierColors: [],                  // color per soldier unit
    soldierTraits: [],                  // per-soldier: {splitChance, explodeChance, sizeMul}
    relics: {},                         // { relic_id: true }
    lastRelicGain: null,                // relic id gained at end of last level
    activeWall: null,                   // { hp, maxHp, scrollPos, timer }
    screenShake: 0,                     // frames remaining for screen shake
    hurtFlash: 0,                       // frames remaining for red hurt vignette
    floatingTexts: [],                  // [{ x, y, text, color, life, maxLife }]
    lasers: [],                         // [{ x1, y1, x2, y2, life }]
    waveHpMul: 1.0,                     // resets each level, +20% per wave cleared
    levelHpBase: 2,                     // base enemy HP, +50% between levels
  };
}

// ══════════════════════════════════════════════
//  LEVEL SETUP
// ══════════════════════════════════════════════
const ROW_SPACING = 420;  // world-scroll units between rows

function startLevel(levelIdx) {
  const prevSlots = state.slotQueue || [];
  const prevColors = state.soldierColors || [];
  const prevTraits = state.soldierTraits || [];
  const prevRelics = state.relics || {};
  const prevUnits = state.units || 0;
  const prevLevelHpBase = state.levelHpBase || 2;
  state = defaultState(levelIdx);
  state.levelHpBase = levelIdx === 0 ? 2 : Math.round(prevLevelHpBase * 1.5);
  state.squadX   = W / 2;
  state.squadY   = getEffectiveSquadY();
  state.comboMode = true;
  state.slotQueue = prevSlots;
  if (prevUnits > 0 && prevColors.length > 0) {
    state.units = prevUnits;
    state.soldierColors = prevColors;
    state.soldierTraits = prevTraits;
  } else {
    state.soldierColors = Array(state.units).fill('blue');
    state.soldierTraits = Array(state.units).fill(null).map(() => defaultTrait());
  }
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
    const trait = state.soldierTraits[i] || {splitChance:0, explodeChance:0, sizeMul:1};
    state.soldiers.push({
      ox: positions[i].x,
      oy: positions[i].y,
      color: state.soldierColors[i] || 'blue',
      bobPhase: Math.random() * Math.PI * 2,
      trait,
    });
  }
}

function defaultTrait() { return {splitChance:0, explodeChance:0, sizeMul:1, laserChance:0}; }

function getMaxUnits() { return hasRelic('veteran') ? 30 : 20; }

function addUnit(color, trait) {
  if (state.units >= getMaxUnits()) return;
  state.units++;
  state.soldierColors.push(color);
  state.soldierTraits.push(trait || defaultTrait());
}

function removeUnit() {
  if (state.units <= 0) return;
  state.units = Math.max(0, state.units - 1);
  if (state.soldierColors.length > state.units) state.soldierColors.pop();
  if (state.soldierTraits.length > state.units) state.soldierTraits.pop();
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
  state.screenShake = 0;
  state.hurtFlash = 0;
  state.relics = {};
  state.soldierColors = [];
  state.soldierTraits = [];
  state.slotQueue = [];
  state.activeWall = null;
  showOverlay('💀','Defeated!',`Level ${state.level+1} failed — all units lost.`,'Retry', () => startLevel(state.level));
}

function levelWin() {
  state.phase = 'win';
  state.screenShake = 0;
  state.hurtFlash = 0;
  const isLast = state.level + 1 >= LEVELS.length;
  if (isLast) {
    state.relics = {};
    state.soldierColors = [];
    state.soldierTraits = [];
    state.slotQueue = [];
    state.activeWall = null;
    showOverlay('🏆','Victory!',`All ${LEVELS.length} levels cleared! Units remaining: ${state.units}`,'Play Again', () => startLevel(0));
  } else {
    const choices = rollRelicChoices(3);
    showRelicChoice(choices, state.level);
  }
}

function showRelicChoice(choices, level) {
  overlayIcon.textContent  = '🎉';
  overlayTitle.textContent = `Level ${level+1} Clear!`;
  overlayMsg.textContent   = `Units remaining: ${state.units}\nChoose a relic:`;
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
    const catLabel = def.cat === 'A' ? 'Match' : def.cat === 'B' ? 'Weapon' : 'Soldier';
    const catColor = def.cat === 'A' ? '#66dd99' : def.cat === 'B' ? '#ff7766' : '#66aaff';
    btn.innerHTML = `<span style="font-size:22px;margin-right:8px;">${def.icon}</span><strong>${def.name}</strong> <span style="font-size:10px;padding:2px 6px;border-radius:6px;background:${catColor};color:#000;font-weight:bold;">${catLabel}</span><br><span style="font-size:12px;opacity:0.7;">${def.desc}</span>`;
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
//  APPLY GATE EFFECT — color orb injection
// ══════════════════════════════════════════════
function applyGate(side) {
  const color = side.color;
  metrics.gateChoices++;
  state.gateFlash = { color, timer: 18 };
  const GATE_ORB_IMMUNE = 60;
  const baseCount = Math.round(2 * state.waveHpMul);
  for (let i = 0; i < baseCount; i++) {
    const ox = (Math.random() - 0.5) * 50;
    const oy = -15 - Math.random() * 25;
    spawnColorOrbAt(state.squadX + ox, state.squadY + oy, color, GATE_ORB_IMMUNE);
  }
  if (hasRelic('greedy_hand')) {
    const extraCount = Math.max(2, Math.round(baseCount * 0.5));
    for (let i = 0; i < extraCount; i++) {
      const ox = (Math.random() - 0.5) * 50;
      const oy = -20 - Math.random() * 30;
      spawnColorOrbAt(state.squadX + ox, state.squadY + oy, color, GATE_ORB_IMMUNE);
    }
    spawnFloatingText(state.squadX, state.squadY - 55, 'Greedy!', '#ffcc44', 30);
  }
  metrics.gateChosenForColor++;
}

// ══════════════════════════════════════════════
//  7-SLOT AUTO-MATCH SYSTEM
// ══════════════════════════════════════════════
const COLOR_ORB_R    = 9;
const COLOR_ORB_LIFE = 600;

function awardColorToken(color) {
  injectSlot(color);
}

function slotColorMatches(orbColor, targetColor) {
  if (orbColor === targetColor) return true;
  if (orbColor === 'dual' && (targetColor === 'red' || targetColor === 'blue')) return true;
  return false;
}

function injectSlot(color) {
  if (hasRelic('color_storm') && (color === 'red' || color === 'blue') && chance(0.2)) {
    color = 'dual';
  }

  const q = state.slotQueue;
  if (q.length >= SLOT_COUNT) {
    if (hasRelic('purify')) {
      q.shift();
      spawnFloatingText(slotScreenX(0), slotBarY() - 20, 'Purify!', '#eedd44', 35);
    } else {
      return;
    }
  }
  q.push(color);
  state.slotFlash[q.length - 1] = 14;
  spawnTokenParticles(color === 'dual' ? 'blue' : color);
  resolveSlotMatches();

  if (hasRelic('gold_rush') && color === 'yellow' && chance(0.3) && q.length < SLOT_COUNT) {
    q.push('yellow');
    state.slotFlash[q.length - 1] = 14;
    spawnFloatingText(slotScreenX(q.length - 1), slotBarY() - 20, 'Gold!', '#ffcc00', 35);
    spawnTokenParticles('yellow');
    resolveSlotMatches();
  }
}

function resolveSlotMatches() {
  const q = state.slotQueue;
  let didMatch = true;

  while (didMatch) {
    didMatch = false;

    // --- Phase 1: consecutive 3+ same color ---
    if (q.length >= 3) {
      let bestRun = null;
      for (const tc of COLORS3) {
        let s = 0;
        while (s < q.length) {
          if (slotColorMatches(q[s], tc)) {
            let e = s + 1;
            while (e < q.length && slotColorMatches(q[e], tc)) e++;
            if (e - s >= 3 && (!bestRun || e - s > bestRun.len)) {
              bestRun = { start: s, len: e - s, color: tc };
            }
            s = e;
          } else { s++; }
        }
      }
      if (bestRun) {
        q.splice(bestRun.start, bestRun.len);
        fireMatchFeedback(bestRun.color, bestRun.len, bestRun.start);
        didMatch = true;
        continue;
      }
    }

    // --- Phase 2: queue full (7) → find any 3 same color (non-consecutive) ---
    if (q.length >= SLOT_COUNT) {
      const counts = {};
      for (const c of q) {
        const keys = c === 'dual' ? ['red', 'blue'] : [c];
        for (const k of keys) counts[k] = (counts[k] || 0) + 1;
      }
      let pickColor = null, pickMax = 0;
      for (const tc of COLORS3) {
        if ((counts[tc] || 0) >= 3 && (counts[tc] || 0) > pickMax) {
          pickMax = counts[tc]; pickColor = tc;
        }
      }
      if (pickColor) {
        const indices = [];
        for (let i = 0; i < q.length && indices.length < 3; i++) {
          if (slotColorMatches(q[i], pickColor)) indices.push(i);
        }
        for (let i = indices.length - 1; i >= 0; i--) q.splice(indices[i], 1);
        fireMatchFeedback(pickColor, 3, indices[0]);
        didMatch = true;
        continue;
      }
    }
  }
}

function fireMatchFeedback(matchColor, matchCount, startIdx) {
  const q = state.slotQueue;
  for (let i = 0; i < q.length; i++) state.slotFlash[i] = 8;

  const midIdx = startIdx + Math.floor(matchCount / 2);
  const sx = slotScreenX(Math.min(midIdx, SLOT_COUNT - 1));
  const sy = slotBarY();
  const skillLabel = matchColor === 'red' ? 'Giant!' : matchColor === 'blue' ? 'Laser!' : 'Splitter!';
  spawnFloatingText(sx, sy - 35, skillLabel, orbTextColor(matchColor), 55);
  spawnParticles(sx, sy, orbTextColor(matchColor), 14);
  state.screenShake = 8;
  state.gateFlash = { color: matchColor, timer: 20 };

  metrics.matchTriggered++;
  triggerSlotSkill(matchColor, matchCount);

  if (hasRelic('echo') && chance(0.3)) {
    const q2 = state.slotQueue;
    if (q2.length < SLOT_COUNT) {
      q2.push(matchColor);
      state.slotFlash[q2.length - 1] = 14;
      spawnFloatingText(sx, sy - 70, 'Echo!', '#ddbbff', 40);
      spawnParticles(sx, sy, orbTextColor(matchColor), 6);
    }
  }

  // Relic: chain_react — 25% chance to convert 1 random orb to the matched color
  if (hasRelic('chain_react') && chance(0.25) && q.length > 0) {
    const candidates = [];
    for (let i = 0; i < q.length; i++) {
      if (!slotColorMatches(q[i], matchColor)) candidates.push(i);
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      q[pick] = matchColor;
      state.slotFlash[pick] = 14;
      spawnFloatingText(sx, sy - 55, 'Chain!', '#aaddff', 45);
    }
  }

  if (hasRelic('heal_pulse') && state.units < getMaxUnits()) {
    addUnit('blue', defaultTrait());
    updateHUD(); buildSoldiers();
    spawnFloatingText(sx, sy - 85, 'Heal!', '#44ff88', 40);
    spawnParticles(sx, sy, '#44ff88', 6);
  }
}

function triggerSlotSkill(color, count) {
  metrics.skillsFired++;
  const sd = state.slotSkillDecay;
  const prev = sd[color] || 0;
  const decayMul = [1.0, 0.7, 0.5][Math.min(prev, 2)];
  for (const c of COLORS3) sd[c] = 0;
  sd[color] = prev + 1;

  const spawnCount = hasRelic('elite') ? 2 : 1;

  if (color === 'red') {
    if (state.activeWall) {
      const dmg = Math.round(8 * decayMul);
      state.activeWall.hp = Math.max(0, state.activeWall.hp - dmg);
      spawnParticles(W / 2, slotBarY() - 100, '#ff4444', 15);
      spawnFloatingText(W / 2, state.squadY - 80, `Clear -${dmg}HP`, '#ff6666', 50);
      if (state.activeWall.hp <= 0) {
        const ws = wallScreenPos(state.activeWall);
        spawnParticles(W / 2, ws.top, '#ff6644', 20);
        spawnParticles(W / 2, ws.top, '#ffcc00', 15);
        state.activeWall.row.passed = true;
        state.activeWall = null;
      }
    } else {
      const killCount = Math.round(5 * decayMul);
      let killed = 0;
      for (let i = state.enemies.length - 1; i >= 0 && killed < killCount; i--) {
        const pos = enemyScreenPos(state.enemies[i]);
        spawnParticles(pos.x, pos.y, '#ff4444', 8);
        state.enemies.splice(i, 1);
        killed++;
      }
    }
    const rSizeMul = hasRelic('red_core') ? 3 : 2;
    const rExplode = hasRelic('red_core') ? 0.2 : 0.1;
    for (let i = 0; i < spawnCount; i++) {
      addUnit('red', {splitChance:0, explodeChance:rExplode, sizeMul:rSizeMul, laserChance:0});
    }
    updateHUD(); buildSoldiers();
    spawnFloatingText(state.squadX, state.squadY - 60, `+${spawnCount} Giant!`, '#ff6666', 50);
  } else if (color === 'blue') {
    const baseFreezeFrames = Math.round(120 * decayMul);
    const freezeFrames = hasRelic('time_warp') ? baseFreezeFrames * 2 : baseFreezeFrames;
    state.freezeTimer = Math.max(state.freezeTimer || 0, freezeFrames);
    spawnParticles(W / 2, state.squadY - 60, '#66ccff', 12);
    for (let i = 0; i < spawnCount; i++) {
      addUnit('blue', {splitChance:0, explodeChance:0, sizeMul:1, laserChance:0.12});
    }
    updateHUD(); buildSoldiers();
    spawnFloatingText(state.squadX, state.squadY - 60, `+${spawnCount} Laser!`, '#66aaff', 50);
  } else if (color === 'yellow') {
    const ySplit = hasRelic('barrage') ? 0.25 : 0.1;
    for (let i = 0; i < spawnCount; i++) {
      addUnit('yellow', {splitChance:ySplit, explodeChance:0, sizeMul:1, laserChance:0});
    }
    updateHUD(); buildSoldiers();
    spawnFloatingText(state.squadX, state.squadY - 60, `+${spawnCount} Splitter!`, '#ffcc00', 50);
  }
}

function spawnTokenParticles(color) {
  const cx = state.squadX;
  const cy = state.squadY - 30;
  const c  = color === 'red' ? '#ff5555' : color === 'yellow' ? '#ffcc44' : '#5599ff';
  spawnParticles(cx, cy, c, 8);
}

function spawnColorOrb(x, y) {
  const q = state.slotQueue;
  let color;
  if (hasRelic('wild_card') && chance(0.3)) {
    color = 'dual';
  } else if (q.length >= 2 && chance(0.4)) {
    const tail = q[q.length - 1];
    const prev = q[q.length - 2];
    if (tail === prev && tail !== 'dual') { color = tail; }
    else { color = randColor(); }
  } else {
    color = randColor();
  }
  spawnColorOrbAt(x, y, color);
}

function spawnColorOrbAt(x, y, color, immuneFrames) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
  const speed = 1.2 + Math.random() * 1.3;
  state.colorOrbs.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life: COLOR_ORB_LIFE,
    bounceCount: 0,
    immune: immuneFrames || 0,
  });
}

// ══════════════════════════════════════════════
//  SPAWN ENEMIES at a world scroll position
// ══════════════════════════════════════════════
function spawnEnemiesAtScroll(count, scrollPos) {
  const cols = Math.ceil(Math.sqrt(count * 1.6));
  const spacingX = 36;
  const spacingY = 32;
  const enemyHp = Math.round(state.levelHpBase * state.waveHpMul);

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    state.enemies.push({
      col, row,
      cols,
      waveScrollPos: scrollPos,
      offsetX: (col - (cols - 1) / 2) * spacingX + (Math.random() - 0.5) * 8,
      offsetY: -row * spacingY,
      alive: true,
      hp: Math.max(1, enemyHp),
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
//  SESSION METRICS (for design validation)
// ══════════════════════════════════════════════
const metrics = {
  gateChoices: 0,           // total gate passages
  matchTriggered: 0,        // total auto-match-3 triggers
  skillsFired: 0,           // total skill activations
  gateChosenForColor: 0,    // times player chose lower-bonus side (inferred)
  overflows: 0,             // slot overflow count
};

// ══════════════════════════════════════════════
//  UPDATE
// ══════════════════════════════════════════════
let frameCount = 0;

function update(ts) {
  if (state.phase === 'dead' || state.phase === 'win') return;
  frameCount += ts;

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * ts; p.y += p.vy * ts; p.vy += 0.08 * ts;
    p.life -= 0.035 * ts;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (state.gateFlash) {
    state.gateFlash.timer -= ts;
    if (state.gateFlash.timer <= 0) state.gateFlash = null;
  }

  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - ts);
  if (state.hurtFlash > 0) state.hurtFlash = Math.max(0, state.hurtFlash - ts);
  if (state.freezeTimer > 0) state.freezeTimer = Math.max(0, state.freezeTimer - ts);
  for (let i = 0; i < SLOT_COUNT; i++) { if (state.slotFlash[i] > 0) state.slotFlash[i] = Math.max(0, state.slotFlash[i] - ts); }
  for (let i = state.lasers.length - 1; i >= 0; i--) {
    state.lasers[i].life -= ts;
    if (state.lasers[i].life <= 0) state.lasers.splice(i, 1);
  }
  for (const e of state.enemies) { if (e.flashTimer > 0) e.flashTimer = Math.max(0, e.flashTimer - ts); }

  // Floating texts
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y -= 1.2 * ts;
    ft.life -= ts;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }

  updateWorld(ts);
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
function updateWorld(ts) {
  // Clamp squadY if stack pushed the boundary up
  state.squadY = Math.min(state.squadY, getEffectiveSquadY());

  // Pause scrolling while a wall is active; otherwise scroll
  if (!state.activeWall) {
    state.scrollY += SCROLL_SPEED * ts;
  } else {
    state.activeWall.timer -= ts;
    if (state.activeWall.timer <= 0) {
      state.phase = 'dead';
      state.activeWall = null;
      state.relics = {};
      state.soldierColors = [];
      state.soldierTraits = [];
      state.slotQueue = [];
      showOverlay('🧱','Wall Not Broken!',`Level ${state.level+1} failed — not enough firepower!`,'Retry', () => startLevel(state.level));
      return;
    }
  }

  // ── Spawn waves when their scrollPos is reached ──
  for (const row of state.rows) {
    if (row.passed) continue;
    const distAhead = row.scrollPos - state.scrollY;

    if (row.type === 'gate') {
      const gateT = perspT(distAhead);
      const gateSY = ROAD_HORIZON * H + gateT * (roadBottomY() - ROAD_HORIZON * H);
      if (gateSY >= state.squadY && !row.passed) {
        row.passed = true;
        const side = state.squadX < W / 2 ? row.left : row.right;
        applyGate(side);
      }
    } else if (row.type === 'wave') {
      if (distAhead <= ROW_SPACING && !row.spawned) {
        row.spawned = true;
        spawnEnemiesAtScroll(row.count, row.scrollPos);
        state.waveHpMul *= 1.2;
      }
      if (distAhead <= 0 && !row.passed) {
        row.passed = true;
      }
    } else if (row.type === 'wall') {
      // Activate wall when it reaches the squad zone
      if (distAhead <= ROW_SPACING * 0.8 && !row.passed && !state.activeWall) {
        const wallTime = WALL_TIMEOUT_FRAMES;
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

  // ── Shooting (accumulator pattern) ────────
  state.shootTimer += ts;
  let effectiveShootInterval = hasRelic('speed_shot') ? SHOOT_INTERVAL * 0.70 : SHOOT_INTERVAL;
  if (hasRelic('berserker')) {
    const maxU = getMaxUnits();
    const ratio = Math.max(0.5, state.units / maxU);
    effectiveShootInterval = Math.max(4, effectiveShootInterval * ratio);
  }
  const hasTargets = state.enemies.length > 0 || state.activeWall;
  if (state.shootTimer >= effectiveShootInterval && hasTargets) {
    state.shootTimer -= effectiveShootInterval;
    fireFromSquad();
  }

  // ── Move bullets ──────────────────────────
  const doHoming = hasRelic('homing_bolt') && state.enemies.length > 0;
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (doHoming) {
      let nearE = null, nearD = Infinity;
      for (const e of state.enemies) {
        const ep = enemyScreenPos(e);
        const d = (ep.x - b.x) ** 2 + (ep.y - b.y) ** 2;
        if (d < nearD) { nearD = d; nearE = ep; }
      }
      if (nearE) {
        const dx = nearE.x - b.x, dy = nearE.y - b.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const steer = 0.08 * ts;
        b.vx += (dx / len) * steer * BULLET_SPEED;
        b.vy += (dy / len) * steer * BULLET_SPEED;
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const maxSpd = hasRelic('sniper') ? BULLET_SPEED * 1.6 : BULLET_SPEED;
        if (spd > maxSpd) { b.vx = b.vx / spd * maxSpd; b.vy = b.vy / spd * maxSpd; }
      }
    }
    b.x += b.vx * ts; b.y += b.vy * ts;
    const bulletOOB = hasRelic('sniper') ? (H * ROAD_HORIZON - 50) : (H * ROAD_HORIZON - 20);
    if (b.y < bulletOOB || b.x < -30 || b.x > W + 30) {
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
        let wallDmg = 1;
        if ((b.explodeChance || 0) > 0 && Math.random() < b.explodeChance) {
          wallDmg = 5;
          spawnParticles(b.x, b.y, '#ff4400', 14);
          spawnFloatingText(b.x, b.y - 20, 'BOOM!', '#ff6600', 35);
          state.screenShake = Math.max(state.screenShake, 8);
        }
        wall.hp = Math.max(0, wall.hp - wallDmg);
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
        const bulletDmg = hasRelic('armor_pierce') ? 2 : 1;
        e.hp = (e.hp || 1) - bulletDmg;
        e.flashTimer = 6;
        spawnParticles(pos.x, pos.y, '#ff6b35', 4);
        const dropRate = hasRelic('speed_shot') ? 0.28 : 0.15;

        if (e.hp <= 0) {
          spawnParticles(pos.x, pos.y, '#ffcc44', 4);
          spawnParticles(pos.x, pos.y, '#ffffff', 2);
          if (state.comboMode && Math.random() < dropRate) {
            spawnColorOrb(pos.x, pos.y);
            spawnFloatingText(pos.x, pos.y - 25, '+ Orb!', '#ffee66', 40);
          }
          state.enemies.splice(ei, 1);

          if (hasRelic('ricochet') && state.enemies.length > 0) {
            let nearE = null, nearD = Infinity;
            for (const ne of state.enemies) {
              const np = enemyScreenPos(ne);
              const nd = (np.x - pos.x) ** 2 + (np.y - pos.y) ** 2;
              if (nd < nearD) { nearD = nd; nearE = np; }
            }
            if (nearE) {
              const rdx = nearE.x - pos.x, rdy = nearE.y - pos.y;
              const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
              const bSpd = hasRelic('sniper') ? BULLET_SPEED * 1.6 : BULLET_SPEED;
              state.bullets.push({ x: pos.x, y: pos.y,
                vx: rdx / rlen * bSpd, vy: rdy / rlen * bSpd,
                explodeChance: b.explodeChance || 0, splitChance: 0 });
              spawnFloatingText(pos.x, pos.y - 15, 'Ricochet!', '#ffdd55', 30);
            }
          }
        }
        hit = true;

        if (hasRelic('shrapnel') && !(b.isFragment)) {
          const fragAngles = [-0.6, 0, 0.6];
          for (const a of fragAngles) {
            const fSpd = BULLET_SPEED * 0.7;
            const baseAngle = Math.atan2(b.vy, b.vx) + a;
            state.bullets.push({ x: pos.x, y: pos.y,
              vx: Math.cos(baseAngle) * fSpd, vy: Math.sin(baseAngle) * fSpd,
              explodeChance: 0, splitChance: 0, isFragment: true });
          }
          spawnParticles(pos.x, pos.y, '#ffaa44', 6);
        }

        if ((b.explodeChance || 0) > 0 && Math.random() < b.explodeChance) {
          const AOE_R = 60;
          spawnParticles(pos.x, pos.y, '#ff4400', 18);
          spawnParticles(pos.x, pos.y, '#ffaa00', 12);
          spawnFloatingText(pos.x, pos.y - 30, 'BOOM!', '#ff6600', 40);
          state.screenShake = Math.max(state.screenShake, 10);
          const chainExplode = hasRelic('inferno') ? [] : null;
          for (let aei = state.enemies.length - 1; aei >= 0; aei--) {
            const ae = state.enemies[aei];
            const ap = enemyScreenPos(ae);
            const adx = ap.x - pos.x, ady = ap.y - pos.y;
            if (adx*adx + ady*ady < AOE_R * AOE_R) {
              ae.hp = (ae.hp || 1) - 2;
              ae.flashTimer = 6;
              spawnParticles(ap.x, ap.y, '#ff6b35', 5);
              if (ae.hp <= 0) {
                if (state.comboMode && Math.random() < dropRate) {
                  spawnColorOrb(ap.x, ap.y);
                }
                if (chainExplode) chainExplode.push({x: ap.x, y: ap.y});
                state.enemies.splice(aei, 1);
              }
            }
          }
          if (chainExplode && chainExplode.length > 0) {
            for (const cp of chainExplode) {
              spawnParticles(cp.x, cp.y, '#ff2200', 12);
              spawnParticles(cp.x, cp.y, '#ffcc00', 8);
              spawnFloatingText(cp.x, cp.y - 20, 'Inferno!', '#ff4400', 35);
              for (let aei2 = state.enemies.length - 1; aei2 >= 0; aei2--) {
                const ae2 = state.enemies[aei2];
                const ap2 = enemyScreenPos(ae2);
                const d2 = (ap2.x - cp.x) ** 2 + (ap2.y - cp.y) ** 2;
                if (d2 < AOE_R * AOE_R * 0.64) {
                  ae2.hp = (ae2.hp || 1) - 2;
                  ae2.flashTimer = 6;
                  if (ae2.hp <= 0) {
                    spawnParticles(ap2.x, ap2.y, '#ff6b35', 4);
                    if (state.comboMode && Math.random() < dropRate) spawnColorOrb(ap2.x, ap2.y);
                    state.enemies.splice(aei2, 1);
                  }
                }
              }
            }
            state.screenShake = Math.max(state.screenShake, 16);
          }
        }
        break;
      }
    }
    if (hit) state.bullets.splice(bi, 1);
  }

  // ── Enemy convergence toward squad X (skip if frozen) ──
  const frozen = state.freezeTimer > 0;
  if (!frozen) {
    const normSqX = (state.squadX - W / 2) / (W * ROAD_WIDTH_BOTTOM / 2);
    for (const e of state.enemies) {
      const diff = normSqX * (W * ROAD_WIDTH_BOTTOM / 2) - e.offsetX;
      if (Math.abs(diff) > 2) e.offsetX += Math.sign(diff) * ENEMY_CONVERGE * ts;
    }
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

      if (hasRelic('thorns')) {
        const thornDmg = 3;
        for (let ti = state.enemies.length - 1; ti >= 0 && ti !== ei; ti--) {
          const te = state.enemies[ti];
          const tp = enemyScreenPos(te);
          const td = (tp.x - pos.x) ** 2 + (tp.y - pos.y) ** 2;
          if (td < 80 * 80) {
            te.hp = (te.hp || 1) - thornDmg;
            te.flashTimer = 8;
            spawnParticles(tp.x, tp.y, '#44ff88', 5);
            if (te.hp <= 0) {
              state.enemies.splice(ti, 1);
              if (ti < ei) ei--;
            }
          }
        }
        spawnFloatingText(pos.x, pos.y - 30, 'Thorns!', '#44ff88', 35);
        spawnParticles(pos.x, pos.y, '#44ff88', 10);
      }

      state.enemies.splice(ei, 1);

      if (hasRelic('mag_shield') && chance(0.20)) {
        spawnFloatingText(pos.x, pos.y - 20, 'Block!', '#66ccff');
        state.screenShake = 4;
      } else {
        removeUnit();
        state.screenShake = 12;
        state.hurtFlash = 18;
        spawnFloatingText(pos.x, pos.y - 20, '-1', '#ff4444');
      }
      updateHUD();
      buildSoldiers();
      if (state.units <= 0) {
        if (hasRelic('undying')) {
          state.relics.undying = false;
          state.units = 5;
          state.soldierColors = ['blue','blue','blue','blue','blue'];
          state.soldierTraits = Array(5).fill(null).map(() => defaultTrait());
          state.freezeTimer = Math.max(state.freezeTimer || 0, hasRelic('time_warp') ? 360 : 180);
          spawnFloatingText(state.squadX, state.squadY - 50, 'Phoenix Revive!', '#ffaa00', 80);
          spawnParticles(state.squadX, state.squadY, '#ffaa00', 20);
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
    const magnetMul = hasRelic('mag_shield') ? 1.8 : 1.0;
    const collectR  = ((getClusterRadius(state.units) + 1) * scale2 * (UNIT_R * 2 + 3) + COLOR_ORB_R + 10) * magnetMul;

    for (let oi = state.colorOrbs.length - 1; oi >= 0; oi--) {
      const orb = state.colorOrbs[oi];
      orb.x  += orb.vx * ts;
      orb.y  += orb.vy * ts;
      orb.vy += 0.025 * ts;
      orb.life -= ts;
      if (orb.immune > 0) orb.immune -= ts;

      // Playable area bounds
      const topBound    = H * 0.30;
      const bottomBound = getEffectiveSquadY();

      // Wall bounce (left/right road edges at orb height)
      const clampedY    = Math.max(topBound, Math.min(orb.y, bottomBound));
      const roadHalfOrb = roadHalfAtY(clampedY);
      const leftEdge    = W / 2 - roadHalfOrb;
      const rightEdge   = W / 2 + roadHalfOrb;
      if (orb.x - COLOR_ORB_R < leftEdge)  { orb.x = leftEdge  + COLOR_ORB_R; orb.vx = Math.abs(orb.vx) * 0.8; }
      if (orb.x + COLOR_ORB_R > rightEdge) { orb.x = rightEdge - COLOR_ORB_R; orb.vx = -Math.abs(orb.vx) * 0.8; }

      // Top bounce
      if (orb.y - COLOR_ORB_R < topBound) {
        orb.y = topBound + COLOR_ORB_R;
        orb.vy = Math.abs(orb.vy) * 0.5;
      }

      // Bottom bounce — track bounces for cleanup
      if (orb.y + COLOR_ORB_R > bottomBound) {
        orb.y = bottomBound - COLOR_ORB_R;
        orb.vy = -Math.abs(orb.vy) * 0.5;
        orb.bounceCount = (orb.bounceCount || 0) + 1;
      }

      // Cleanup: remove orbs that lost too much energy to bounce back to player
      const tooSlow = Math.abs(orb.vy) < 0.3 && orb.y > bottomBound - 30;
      if (orb.life <= 0 || (orb.bounceCount >= 3 && tooSlow)) {
        state.colorOrbs.splice(oi, 1);
        continue;
      }

      // Squad collision — with feedback (skip if immune)
      if (orb.immune > 0) continue;
      const dx = orb.x - squadSX2, dy = orb.y - squadSY2;
      if (dx * dx + dy * dy < collectR * collectR) {
        spawnCollectRing(orb.x, orb.y, orb.color);
        const colorLabel = orb.color === 'red' ? 'Red' : orb.color === 'yellow' ? 'Yellow' : 'Blue';
        spawnFloatingText(orb.x, orb.y - 15, colorLabel + ' Orb', orbTextColor(orb.color), 45);
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

// ── Laser beam (blue soldier AOE) ─────────────
function fireLaser(x, y, dirX, dirY) {
  const beamLen = H;
  const x2 = x + dirX * beamLen;
  const y2 = y + dirY * beamLen;
  state.lasers.push({ x1: x, y1: y, x2, y2, dirX, dirY, life: 12 });

  const LASER_HALF_W = hasRelic('overcharge') ? 27 : 18;
  const laserDmg = hasRelic('overcharge') ? 4 : 2;
  const dropRate = hasRelic('speed_shot') ? 0.28 : 0.15;
  let refractTarget = null;
  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    const pos = enemyScreenPos(e);
    const ex = pos.x - x, ey = pos.y - y;
    const proj = ex * dirX + ey * dirY;
    if (proj < 0) continue;
    const perpDist = Math.abs(ex * (-dirY) + ey * dirX);
    if (perpDist < LASER_HALF_W) {
      e.hp = (e.hp || 1) - laserDmg;
      e.flashTimer = 8;
      spawnParticles(pos.x, pos.y, '#66ccff', 4);
      if (e.hp <= 0) {
        spawnParticles(pos.x, pos.y, '#88ddff', 6);
        if (state.comboMode && Math.random() < dropRate) {
          spawnColorOrb(pos.x, pos.y);
        }
        state.enemies.splice(ei, 1);
      } else if (!refractTarget) {
        refractTarget = pos;
      }
    }
  }

  if (hasRelic('prism') && refractTarget && chance(0.2)) {
    let nearest = null, nd = Infinity;
    for (const e2 of state.enemies) {
      const p2 = enemyScreenPos(e2);
      const d = (p2.x - refractTarget.x) ** 2 + (p2.y - refractTarget.y) ** 2;
      if (d > 100 && d < nd) { nd = d; nearest = p2; }
    }
    if (nearest) {
      const rdx = nearest.x - refractTarget.x, rdy = nearest.y - refractTarget.y;
      const rlen = Math.sqrt(rdx * rdx + rdy * rdy);
      state.lasers.push({ x1: refractTarget.x, y1: refractTarget.y,
        x2: refractTarget.x + (rdx / rlen) * H * 0.5,
        y2: refractTarget.y + (rdy / rlen) * H * 0.5,
        dirX: rdx / rlen, dirY: rdy / rlen, life: 10 });
      spawnFloatingText(refractTarget.x, refractTarget.y - 20, 'Refract!', '#88eeff', 35);
      for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
        const e = state.enemies[ei];
        const p = enemyScreenPos(e);
        const ex2 = p.x - refractTarget.x, ey2 = p.y - refractTarget.y;
        const proj2 = ex2 * (rdx / rlen) + ey2 * (rdy / rlen);
        if (proj2 < 0 || proj2 > H * 0.5) continue;
        const perp2 = Math.abs(ex2 * (-(rdy / rlen)) + ey2 * (rdx / rlen));
        if (perp2 < LASER_HALF_W) {
          e.hp = (e.hp || 1) - 1;
          e.flashTimer = 6;
          spawnParticles(p.x, p.y, '#66ccff', 3);
          if (e.hp <= 0) {
            spawnParticles(p.x, p.y, '#88ddff', 4);
            state.enemies.splice(ei, 1);
          }
        }
      }
    }
  }

  if (state.activeWall) {
    const ws = wallScreenPos(state.activeWall);
    const wx = ws.x - x, wy = ws.top - y;
    const proj = wx * dirX + wy * dirY;
    if (proj > 0) {
      const laserWallDmg = hasRelic('overcharge') ? 6 : 3;
      state.activeWall.hp = Math.max(0, state.activeWall.hp - laserWallDmg);
      spawnParticles(ws.x, ws.top, '#66ccff', 8);
      if (state.activeWall.hp <= 0) {
        spawnParticles(W / 2, ws.top, '#ff6644', 20);
        state.activeWall.row.passed = true;
        state.activeWall = null;
      }
    }
  }
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
    const bSpd = hasRelic('sniper') ? BULLET_SPEED * 1.6 : BULLET_SPEED;
    const bvx = dx/len * bSpd;
    const bvy = dy/len * bSpd;
    const trait = sol.trait || defaultTrait();

    if (trait.laserChance > 0 && Math.random() < trait.laserChance) {
      fireLaser(sx, sy - UNIT_R * scale, dx / len, dy / len);
    } else {
      state.bullets.push({ x: sx, y: sy - UNIT_R * scale, vx: bvx, vy: bvy,
        explodeChance: trait.explodeChance, splitChance: trait.splitChance });

      if (trait.splitChance > 0 && Math.random() < trait.splitChance) {
        const splitAngles = hasRelic('barrage')
          ? [-0.35, -0.23, -0.12, 0.12, 0.23, 0.35]
          : [-0.25, -0.08, 0.08, 0.25];
        for (const a of splitAngles) {
          const ca = Math.cos(a), sa = Math.sin(a);
          state.bullets.push({ x: sx, y: sy - UNIT_R * scale,
            vx: bvx * ca - bvy * sa, vy: bvx * sa + bvy * ca,
            explodeChance: 0, splitChance: 0 });
        }
      }
    }
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
  drawLasers();
  drawColorOrbs();

  drawParticles();
  drawSquad();
  drawSlotBar();
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

  // Color orb icon (centered)
  const orbR = Math.max(8, 18 * scale);
  const orbCy = cy;
  ctx.shadowColor = palette.orbGlow;
  ctx.shadowBlur = 10 * scale;
  ctx.fillStyle = palette.orbRim;
  ctx.beginPath();
  ctx.arc(cx, orbCy, orbR + 2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.orb;
  ctx.beginPath();
  ctx.arc(cx, orbCy, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(cx - orbR * 0.3, orbCy - orbR * 0.3, orbR * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Enemies ─────────────────────────────────
function drawEnemies() {
  if (state.enemies.length === 0) return;

  const withPos = state.enemies.map(e => ({ e, pos: enemyScreenPos(e) }));
  withPos.sort((a, b) => a.pos.y - b.pos.y);
  for (const { e, pos } of withPos) {
    drawEnemyFigure(pos.x, pos.y, pos.scale, e.flashTimer > 0);
    if (state.freezeTimer > 0) {
      ctx.globalAlpha = Math.min(0.45, state.freezeTimer / 60);
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ENEMY_R * pos.scale * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
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
    const isExplosive = (b.explodeChance || 0) > 0;
    const isSplit = (b.splitChance || 0) > 0;
    ctx.fillStyle = isExplosive ? '#ff6644' : isSplit ? '#66ffaa' : '#ffe066';
    ctx.shadowColor = isExplosive ? '#ff3300' : isSplit ? '#00ff66' : '#ffcc00';
    ctx.shadowBlur  = isExplosive ? 14 : 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, isExplosive ? BULLET_R * 1.4 : BULLET_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── Lasers ──────────────────────────────────
function drawLasers() {
  const laserWidth = hasRelic('overcharge') ? 9 : 6;
  const coreWidth = hasRelic('overcharge') ? 3 : 2;
  for (const l of state.lasers) {
    const alpha = l.life / 12;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = laserWidth;
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = hasRelic('overcharge') ? 30 : 20;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = coreWidth;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.restore();
  }
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
    drawSoldierFigure(sx, sy, scale, sol.color, sol.trait);
  }
}

const SOLDIER_PALETTE = {
  red:    { body: '#c02020', helmet: '#d43030', shadow: '#ff6666', highlight: 'rgba(255,120,120,0.25)', shine: 'rgba(255,180,180,0.3)' },
  blue:   { body: '#1565c0', helmet: '#1976d2', shadow: '#4fc3f7', highlight: 'rgba(100,180,255,0.2)',  shine: 'rgba(100,200,255,0.3)' },
  yellow: { body: '#b8860b', helmet: '#cc9a10', shadow: '#f7d34f', highlight: 'rgba(255,220,100,0.25)', shine: 'rgba(255,240,150,0.3)' },
};

function drawSoldierFigure(x, y, scale, color, trait) {
  const t = trait || defaultTrait();
  const sm = t.sizeMul || 1;
  const br = UNIT_R * scale * sm;
  const hr = HEAD_R * scale * sm;
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

  // Trait aura for special soldiers
  if (sm > 1) {
    ctx.strokeStyle = 'rgba(255,60,60,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, br * 1.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t.laserChance > 0) {
    ctx.strokeStyle = 'rgba(60,180,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, br * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t.splitChance > 0) {
    ctx.strokeStyle = 'rgba(100,255,150,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, br * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

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
  const frac = Math.max(0, state.units / getMaxUnits());

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
function drawSlotBar() {
  const totalW = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
  const startX = (W - totalW) / 2;
  const cy = slotBarY();
  const halfS = SLOT_SIZE / 2;

  // Bar background
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';
  roundRect(startX - 10, cy - halfS - 10, totalW + 20, SLOT_SIZE + 20, 14);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  roundRect(startX - 10, cy - halfS - 10, totalW + 20, SLOT_SIZE + 20, 14);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const q = state.slotQueue;

  for (let i = 0; i < SLOT_COUNT; i++) {
    const cx = startX + i * (SLOT_SIZE + SLOT_GAP) + halfS;
    const color = i < q.length ? q[i] : null;
    const flashing = state.slotFlash[i] > 0;

    if (color) {
      const isDual = color === 'dual';
      const coreC = isDual ? '#8844cc' : color === 'red' ? '#ff4444' : color === 'yellow' ? '#ffcc00' : '#4488ff';
      const glowC = isDual ? '#aa44ff' : color === 'red' ? '#ff0000' : color === 'yellow' ? '#ff9900' : '#0066ff';
      const rimC  = isDual ? '#ddaaff' : color === 'red' ? '#ffaaaa' : color === 'yellow' ? '#ffee88' : '#aaccff';

      ctx.shadowColor = glowC;
      ctx.shadowBlur = flashing ? 24 : 8;

      // Rim
      ctx.fillStyle = rimC;
      roundRect(cx - halfS, cy - halfS, SLOT_SIZE, SLOT_SIZE, 8);
      ctx.fill();

      // Core (or dual split)
      if (isDual) {
        ctx.save();
        roundRect(cx - halfS + 2, cy - halfS + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 6);
        ctx.clip();
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(cx - halfS, cy - halfS, halfS, SLOT_SIZE);
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(cx, cy - halfS, halfS, SLOT_SIZE);
        ctx.restore();
      } else {
        ctx.fillStyle = coreC;
        roundRect(cx - halfS + 2, cy - halfS + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 6);
        ctx.fill();
      }

      // Near-match glow indicator (2 consecutive same color)
      let nearMatch = false;
      if (i > 0 && i - 1 < q.length && isMatchable(q[i - 1], color)) nearMatch = true;
      if (i + 1 < q.length && isMatchable(q[i + 1], color)) nearMatch = true;
      if (nearMatch) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        roundRect(cx - halfS + 1, cy - halfS + 1, SLOT_SIZE - 2, SLOT_SIZE - 2, 8);
        ctx.stroke();
      }

      // Shine
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(cx - halfS * 0.3, cy - halfS * 0.3, halfS * 0.28, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Empty slot
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRect(cx - halfS, cy - halfS, SLOT_SIZE, SLOT_SIZE, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      roundRect(cx - halfS, cy - halfS, SLOT_SIZE, SLOT_SIZE, 8);
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;

  // Direction arrow indicator (right = newest)
  ctx.font = '700 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('◂Old', startX - 14, cy);
  ctx.textAlign = 'left';
  ctx.fillText('New▸', startX + totalW + 14, cy);
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
//  MAIN LOOP  (deltaTime-based)
// ══════════════════════════════════════════════
let lastTime = performance.now();

function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(rawDt, 0.1);
  const ts = dt * 60;

  update(ts);
  draw();
  requestAnimationFrame(loop);
}

startLevel(0);
requestAnimationFrame(loop);
