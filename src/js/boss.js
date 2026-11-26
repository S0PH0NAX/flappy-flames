// boss.js — Siege engine boss state, geometry, archer spawning/waves, burn helpers
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    // ==========================================
// SIEGE ENGINE BOSS LOGIC & RENDERING
// ==========================================

function bossBurnNew() {
  return { flames: [], charProgress: 0, charred: false };
}

var bossState = {
  active: false,
  x: 0,
  baseX: 0,
  swayAmp: 0,
  frame: 0,
  bump: 0,
  rumbleY: 0,
  groundScroll: 0,
  roll: 1,
  wheelAngle: 0,
  topHp: 100,
  midHp: 100,
  botHp: 100,
  topTimer: 0,
  botTimer: 0,
  topChainProgress: 0,
  botChainProgress: 0,
  topState: 'IDLE',
  botState: 'IDLE',
  archers: [],
  groupShootTimer: 0,
  speechBubbleTimer: 0,
  spawnTimer: 0,
  clearHold: 0,
  topFlash: 0,
  midFlash: 0,
  botFlash: 0,
  burn: { top: bossBurnNew(), mid: bossBurnNew(), bot: bossBurnNew() }
};

const BOSS_MAX_ARCHERS = 50;
const BOSS_CANNON_RELOAD = 160;   // frames between cannon shots (was 220, then 190)
const BOSS_WINDOW_FRAMES = 300;   // how long the center is open after you clear a wave
const BOSS_ROLL_SPEED = 9.0;      // ground speed under the wheels (px/frame); was 3
const BOSS_BG_SPEED = 2.2;        // sky/castle parallax speed during the chase (normal play is 0.4)
const BOSS_CHASE_AHEAD = 0.14;    // how far (fraction of screen width) the tower can lunge toward the dragon
const BOSS_CHASE_BACK = 0.03;     // how far it can fall back to the right
let bossRocks = [];               // dirt and stones thrown up by the wheels
let bossCinematic = false;        // true while the intro cinematic draws the tower (no HUD bars)
const BOSS_FIRST_WAVE = 14;       // garrison already on the platform
const BOSS_WAVE_GROWTH = 6;       // each later wave brings this many more archers
const BOSS_WAVE_SPAWN_GAP = 22;   // frames between archers coming out of the door during a wave
const BOSS_REINFORCE_FRAMES = 480; // next wave starts this long after the last one finished climbing out, even if it is still alive
const BOSS_REINFORCE_MAX_ALIVE = 30; // ...unless this many archers are already alive
const BOSS_VOLLEY_CYCLE = 155;    // frames between archer volleys (was 180)
const BOSS_KILLS_PER_SHOT = 3;    // one breath (6 flames) can take out at most this many archers

// Archers come in waves: SPAWNING (climbing out) -> FIGHTING (no reinforcements) -> OPEN (center exposed).
function bossWaveSize(wave) {
  return Math.min(BOSS_MAX_ARCHERS, BOSS_FIRST_WAVE + (wave - 1) * BOSS_WAVE_GROWTH);
}

// The center can be burned whenever no archer is standing ready on the platform
// (an empty platform, or a new wave still climbing the ladder).
function bossMidOpen() {
  if (bossState.midHp <= 0) return false;
  for (let i = 0; i < bossState.archers.length; i++) if (bossState.archers[i].phase === 'READY') return false;
  return true;
}

// All boss dimensions in one place. Archer x values are relative to the tower's left edge.
function bossGeom() {
  const bw = width * 0.40;
  const gY = height - groundHeight;
  // the tower rides on a wheeled platform that is wider than the tower itself
  const over = bw * 0.16;                                  // platform overhang on each side
  const wheelR = Math.max(40, Math.min((bw + 2 * over) * 0.235, height * 0.09, 80));
  const deckH = 20;
  const deckTop = gY - 2 * wheelR + 6;                     // deck rides on top of the wheels
  const turretH = height / 3;
  const baseTop = deckTop - 84;                            // stone lower section rests on the deck
  const platY = turretH + (baseTop - turretH) * 0.42;   // upper archer platform
  const platY2 = baseTop - 22;                            // lower archer platform
  const rBall = height / 6.8;
  const ladderX = bw * 0.58;
  const slots = [];
  const rowDy = [0, -6, -12];
  // upper platform: 3 rows; lower platform: 2 rows
  [[platY, 3, 1], [platY2, 2, 2]].forEach(pl => {
    for (let row = 0; row < pl[1]; row++) {
      const off = row * 5;
      for (let sx = 20 + off; sx <= ladderX - 12; sx += 10) slots.push({ x: sx, row: row, dy: rowDy[row], py: pl[0], plat: pl[2] });
      for (let sx = ladderX + 14 + off; sx <= bw - 14; sx += 10) slots.push({ x: sx, row: row, dy: rowDy[row], py: pl[0], plat: pl[2] });
    }
  });
  return {
    bw, gY, wheelR, turretH, baseTop, platY, platY2, rBall, ladderX,
    over, deckTop, deckH,
    wheelXs: [-over + wheelR + 2, bw + over - wheelR - 2],
    sillY: baseTop + 64,
    doorCx: bw * 0.83,
    doorW: Math.max(24, Math.min(34, bw * 0.17)),
    doorH: 38,
    cyTop: rBall + 4,
    cyBot: baseTop + 50,
    barrelLen: 36,
    slots: slots
  };
}

function bossAliveArchers() {
  let n = 0;
  for (let i = 0; i < bossState.archers.length; i++) if (bossState.archers[i].phase !== 'DYING') n++;
  return n;
}

function bossFreeSlot() {
  const g = bossGeom();
  const used = {};
  const perPlat = { 1: 0, 2: 0 };
  bossState.archers.forEach(a => { if (a.slot >= 0 && g.slots[a.slot]) { used[a.slot] = true; perPlat[g.slots[a.slot].plat]++; } });
  // fill whichever platform currently has fewer archers
  const want = perPlat[2] < perPlat[1] ? 2 : 1;
  for (let i = 0; i < g.slots.length; i++) if (!used[i] && g.slots[i].plat === want) return i;
  for (let i = 0; i < g.slots.length; i++) if (!used[i]) return i;
  return -1;
}

function bossSpawnArcher(instant) {
  if (bossAliveArchers() >= BOSS_MAX_ARCHERS) return false;
  const g = bossGeom();
  const slot = bossFreeSlot();
  const a = { slot: slot, anim: Math.random() * 10, phase: 'EMERGE', fade: 0, recoil: 0, aim: false, fireIn: -1, dieT: 0, x: g.doorCx, y: g.sillY };
  if (instant) {
    if (slot < 0) return false;
    a.phase = 'READY';
    a.fade = 1;
    a.x = g.slots[slot].x;
    a.y = g.slots[slot].py + g.slots[slot].dy;
  }
  bossState.archers.push(a);
  return true;
}

function bossKillArcher(a) {
  if (!a || a.phase === 'DYING') return;
  a.phase = 'DYING';
  a.dieT = 0;
  a.slot = -1;
  a.aim = false;
  a.fireIn = -1;
  if (sound.knightHit) sound.knightHit();
}

function bossResetState() {
  bossState.baseX = width;
  bossState.x = width;
  bossState.swayAmp = 0;
  bossState.arrived = false;
  bossState.chaseOff = 0;
  bossState.chaseV = 0;
  bossState.chaseTarget = 0;
  bossState.chaseTimer = 120;
  bossState.frame = 0;
  bossState.bump = 0;
  bossState.rumbleY = 0;
  bossState.groundScroll = 0;
  bossState.roll = 1;
  bossState.wheelAngle = 0;
  bossState.topHp = 100;
  bossState.midHp = 100;
  bossState.botHp = 100;
  bossState.topState = 'IDLE';
  bossState.botState = 'IDLE';
  bossState.topTimer = 100;
  bossState.botTimer = 180;
  bossState.topChainProgress = 0;
  bossState.botChainProgress = 0;
  bossState.groupShootTimer = 0;
  bossState.speechBubbleTimer = 0;
  bossState.spawnTimer = 0;
  bossState.clearHold = 0;
  bossState.wave = 1;
  bossState.waveState = 'FIGHTING';
  bossState.waveToSpawn = 0;
  bossState.fightTimer = 0;
  bossState.shotKills = {};
  bossState.topFlash = 0;
  bossState.midFlash = 0;
  bossState.botFlash = 0;
  bossState.burn = { top: bossBurnNew(), mid: bossBurnNew(), bot: bossBurnNew() };
  invulnerableTimer = 0;

  // A garrison is already on the platform; more keep coming up the ladder.
  bossState.archers = [];
  for (let i = 0; i < BOSS_FIRST_WAVE; i++) bossSpawnArcher(true);
  bossRocks = [];
}

// Clear the level so only the dragon and the tower are left.
function bossClearWorld() {

  obstacles = [];
  battlements = [];
  archers = [];
  knights = [];
  clearLevelExtras();
  trebuchets = [];
  arrows = [];
  trebuchetBoulders = [];
  flames = [];
  groundFlames = [];
  collectableHearts = [];
  khaleesis = [];
  isHoldingAction = false;
  holdTimer = 0;
}

function triggerBossBattle() {
  bossIntro = null;
  bossCinematic = false;
  state = 'BOSS';
  bossState.active = true;
  bossResetState();
  bossClearWorld();
  invulnerableTimer = 0;
  // the beheading music plays during the boss fight; start it from the top
  if (cutsceneMusicAudio.paused) cutsceneMusicAudio.currentTime = 0;
  showKhaleesiBanner('Here it comes! Burn it down, Cyndraxx!', 220);
  updateLevelBadgeUI();
}

// Where a launched sphere is, and how big. Starts small at the cannon mouth, then "swells" as it
// flies at the dragon. Shared by rendering and collision so they always agree.
function bossBall(progress, cy) {
  const g = bossGeom();
  const muzzleX = bossState.x - g.barrelLen;
  const grow = Math.min(1, 0.12 + progress * 4.2);
  const r = Math.max(13, g.rBall * grow);
  return { x: muzzleX - progress * width, y: cy, r: r, rot: -(progress * width) / g.rBall, muzzleX: muzzleX };
}

function bossMuzzleBlast(cy) {
  const g = bossGeom();
  const mx = bossState.x - g.barrelLen;
  sound.boulderLaunch();
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: mx, y: cy,
      vx: -1 - Math.random() * 4, vy: (Math.random() - 0.5) * 3,
      size: 10 + Math.random() * 12, life: 40 + Math.random() * 20,
      color: 'rgba(70,70,80,0.8)', isSmoke: true
    });
  }
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: mx, y: cy,
      vx: -3 - Math.random() * 6, vy: (Math.random() - 0.5) * 6,
      size: 2 + Math.random() * 3, life: 12 + Math.random() * 10,
      color: Math.random() < 0.5 ? '#f1c40f' : '#e67e22'
    });
  }
}

// Same destruction sequence as the castle towers: ignite, a dark char wave sweeps down with
// falling debris and smoke, then the section is charred and the tower-destroyed sound plays.
function bossSectionRange(sec, g) {
  if (sec === 'top') return [0, g.turretH];
  if (sec === 'mid') return [g.turretH, g.baseTop];
  return [g.baseTop, g.gY];
}

function bossUpdateBurn(sec, hp, g) {
  const b = bossState.burn[sec];

  // surface flames grow, drift and eventually die down (unless the section is going down)
  for (let i = b.flames.length - 1; i >= 0; i--) {
    const f = b.flames[i];
    if (f.w < f.mw) f.w += 0.45;
    if (f.h < f.mh) f.h += 0.55;
    f.x += f.spread;
    f.x = Math.max(6, Math.min(g.bw - 6, f.x));
    f.life--;
    if (f.life <= 0 && !(hp <= 0 && !b.charred)) b.flames.splice(i, 1);
  }

  if (hp <= 0 && b.charProgress === 0 && !b.charred) {
    b.charProgress = 0.01;
    sound.score();
  }

  if (b.charProgress > 0 && !b.charred) {
    b.charProgress += 0.007;
    const range = bossSectionRange(sec, g);
    const waveY = range[0] + (range[1] - range[0]) * b.charProgress;

    if (Math.random() < 0.6) {
      blackDebris.push({
        x: bossState.x + Math.random() * g.bw,
        y: waveY,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2,
        gravity: 0.25,
        size: 8 + Math.random() * 8,
        life: 60,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.15
      });
    }
    if (Math.random() < 0.4) {
      particles.push({
        x: bossState.x + Math.random() * g.bw,
        y: waveY - 5,
        vx: (Math.random() - 0.5) * 2.0,
        vy: -Math.random() * 1.5,
        size: 6 + Math.random() * 6,
        life: 60,
        color: 'rgba(10, 10, 15, 0.9)',
        isSmoke: true
      });
    }
    if (b.charProgress >= 1.0) {
      b.charProgress = 1.0;
      b.charred = true;
      b.flames = [];
      gameStats.burnedTowers++;
      sound.towerDestroy();
    }
  }

  // smouldering once it is a burnt-out shell
  if (b.charred && Math.random() < 0.03) {
    const range = bossSectionRange(sec, g);
    particles.push({
      x: bossState.x + Math.random() * g.bw,
      y: range[0] + Math.random() * (range[1] - range[0]),
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.6 - Math.random() * 0.8,
      size: 5 + Math.random() * 5,
      life: 50,
      color: 'rgba(10, 10, 15, 0.7)',
      isSmoke: true
    });
  }
}

function bossAddSurfaceFlame(sec, f, g) {
  const b = bossState.burn[sec];
  if (b.flames.length >= 14 || Math.random() > 0.45) return;
  b.flames.push({
    x: Math.max(8, Math.min(g.bw - 8, f.x - bossState.x)),
    y: f.y,
    w: 12, mw: 28 + Math.random() * 20,
    h: 14, mh: 34 + Math.random() * 22,
    spread: (Math.random() - 0.5) * 0.8,
    life: 240 + Math.random() * 120
  });
}

