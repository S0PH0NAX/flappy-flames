// cave.js — The two cave levels after Brown Jenkins' bargain (boss-fall.js), and the climb back to the surface.
// A long, winding tunnel with an irregular ceiling and floor, no towers, enemies, nobles, Sarai or treasure.
// It is dark: only Cyndraxx's own faint glow, his flames and the torches he lights show the walls.
// Touching rock costs a heart. After CAVE 2, the surfacing cutscene (state 'SURFACE') leads to level 4.
// caveLevel is 1 or 2 while in the caves (currentLevel stays 4, so level 4 follows). Drawing: render-cave.js.
// Classic script: shares global scope with the other src/js files.

const CAVE_DURATIONS = { 1: 80, 2: 90 };
const CAVE_TITLES = { 1: ['THE CAVERNS BELOW', 'Your flame lights the way. Light the torches.'], 2: ['DEEPER STILL', 'The tunnel narrows...'] };
const CAVE_CODES = { 1: 12, 2: 13 };   // save-code level characters "C" and "D"
const SURFACE_LEN = 560;

let caveLevel = 0;
let cave = null;
let surface = null;

// the cave is on screen (playing, paused or game over in it)
function caveView() {
  return caveLevel > 0 && !!cave && (state === 'PLAYING' || state === 'PAUSED' || state === 'GAMEOVER');
}

function resetCave() { caveLevel = 0; cave = null; surface = null; }

function startCaveLevel(n) {
  obstacles = []; battlements = []; archers = []; arrows = []; knights = []; khaleesis = [];
  trebuchets = []; trebuchetBoulders = []; collectableHearts = []; groundFlames = []; flames = [];
  particles = []; floatingTexts = []; blackDebris = [];
  clearLevelExtras();
  if (bossState) bossState.active = false;
  khaleesiMounted = false;
  khaleesiBannerTimer = 0;
  currentLevel = 4;
  levelTimerSeconds = 0;
  caveLevel = n;
  cave = { scroll: 0, t: 0, torches: [], nextTorch: 520, ending: 0, distAcc: 0, title: 260 };
  dragon.x = dragon.baseX; dragon.targetX = dragon.baseX; dragon.vx = 0;
  dragon.y = height * 0.5; dragon.velocity = dragon.jump; dragon.wingState = 1;
  invulnerableTimer = 0;
  isHoldingAction = false;
  state = 'PLAYING';
  updateLevelBadgeUI();
  updateHeartsDisplay();
}

// ---- the tunnel: smooth noise for the middle line and the gap, a little jaggedness on each wall ----
function caveNoise(x, seed) {
  const i = Math.floor(x), f = x - i;
  const a = hash2(i, seed), b = hash2(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
function caveGap(wx) {
  const base = caveLevel === 2 ? 250 : 292;
  const open = Math.max(0, 700 - wx) * 0.3;          // a roomy start
  return Math.min(height * 0.66, base + (caveNoise(wx / 650, 5) - 0.5) * 70 + open);
}
function caveMid(wx) {
  const H = height;
  const amp = H * (caveLevel === 2 ? 0.22 : 0.16) * Math.min(1, wx / 1100);
  return H * 0.5 + (caveNoise(wx / 430, 11) - 0.5) * 2 * amp + (caveNoise(wx / 160, 13) - 0.5) * amp * 0.45;
}
function caveCeilAt(wx) { return Math.max(16, caveMid(wx) - caveGap(wx) / 2 + (caveNoise(wx / 34, 17) - 0.5) * 16); }
function caveFloorAt(wx) { return Math.min(height - 16, caveMid(wx) + caveGap(wx) / 2 + (caveNoise(wx / 34, 19) - 0.5) * 16); }

// where a torch's flame burns: hanging from the ceiling, standing on the floor, or swinging on a long
// chain in the middle of the tunnel (tc.kind 'top', 'floor' or 'mid')
function caveTorchHead(tc) {
  const x = tc.wx - cave.scroll;
  if (tc.kind === 'mid') return { x: x + Math.sin(cave.t * 0.025 + tc.wx) * 6, y: caveMid(tc.wx) + (hash2(Math.floor(tc.wx), 11) - 0.5) * caveGap(tc.wx) * 0.3 };
  return tc.kind === 'top' ? { x: x, y: caveCeilAt(tc.wx) + 26 } : { x: x, y: caveFloorAt(tc.wx) - 28 };
}

function updateCave() {
  const C = cave;
  C.t++;
  if (C.title > 0) C.title--;
  const speed = getLevelScrollSpeed();
  C.scroll += speed;
  groundFlames = [];                                  // there is no ground strip down here
  if (!C.ending) {
    levelTimerSeconds += 1 / 60;
    updateLevelBadgeUI();
  }

  // flight (same as the main game)
  dragon.velocity += dragon.gravity;
  dragon.y += dragon.velocity;
  if (isHoldingAction) {
    holdTimer++;
    if (holdTimer > 4 && holdTimer < 45) {
      dragon.vx += 0.95;
      dragon.wingState = 0.8;
      sound.whoosh();
    }
  }
  dragon.x += dragon.vx;
  dragon.vx *= 0.90;
  const thirty = width * 0.30;
  if (dragon.x > dragon.baseX) {
    let back = 1.2;
    if (dragon.x > thirty) back = 3.5 + (dragon.x - thirty) / (width - thirty) * 9.0;
    dragon.x = Math.max(dragon.baseX, dragon.x - back);
  }

  // the rock: a knock costs a heart and puts him back in the middle of the tunnel
  const pad = 7, half = dragon.size / 2 - pad;
  let hit = false;
  [-half, 0, half].forEach(ox => {
    const wx = C.scroll + dragon.x + ox;
    if (dragon.y - half < caveCeilAt(wx) || dragon.y + half > caveFloorAt(wx)) hit = true;
  });
  const cwx = C.scroll + dragon.x;
  if (hit) {
    if (invulnerableTimer <= 0) {
      triggerHit();
      if (lives > 0) {
        dragon.y = (caveCeilAt(cwx) + caveFloorAt(cwx)) / 2;
        dragon.velocity = 0;
      }
    } else {
      // still blinking from the last knock: don't let him sink into the rock
      dragon.y = Math.max(caveCeilAt(cwx) + half + 1, Math.min(caveFloorAt(cwx) - half - 1, dragon.y));
      if (dragon.velocity > 0 && dragon.y >= caveFloorAt(cwx) - half - 1) dragon.velocity = 0;
    }
  }

  // flames die against the rock; a flame near an unlit torch lights it
  flames.forEach(f => {
    const wx = C.scroll + f.x;
    if (f.y < caveCeilAt(wx) || f.y > caveFloorAt(wx)) { f.life = Math.min(f.life, 5); f.vx *= 0.4; }
  });
  while (C.nextTorch < C.scroll + width + 120) {
    const kr = hash2(Math.floor(C.nextTorch), 7);
    C.torches.push({ wx: C.nextTorch, kind: kr < 0.36 ? 'top' : (kr < 0.72 ? 'floor' : 'mid'), lit: false, litT: 0 });
    C.nextTorch += (caveLevel === 2 ? 460 : 380) + hash2(Math.floor(C.nextTorch), 9) * 340;
  }
  C.torches.forEach(tc => {
    if (tc.lit) { tc.litT++; return; }
    const h = caveTorchHead(tc);
    if (flames.some(f => Math.abs(f.x - h.x) < 30 && Math.abs(f.y - h.y) < 30)) {
      tc.lit = true;
      sound.fireRoar();
      const r = addScore(10);
      floatingTexts.push({ x: h.x - 30, y: h.y - 20, text: 'TORCH LIT +' + r.totalPts, color: '#ffcf5a', alpha: 1.0, vy: -1.2 });
      for (let i = 0; i < 12; i++) {
        particles.push({ x: h.x, y: h.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, size: 2 + Math.random() * 2, life: 20 + Math.random() * 15, color: Math.random() < 0.5 ? '#ffcf5a' : '#ff793f' });
      }
    }
  });
  C.torches = C.torches.filter(tc => tc.wx - C.scroll > -120);

  // a point for every stretch of tunnel survived
  C.distAcc += speed;
  if (C.distAcc >= 240) { C.distAcc -= 240; addScore(1); }

  // the end of the level: fade to black, then CAVE 2 or the way up
  if (!C.ending && levelTimerSeconds >= (CAVE_DURATIONS[caveLevel] || 80)) C.ending = 1;
  if (C.ending) {
    C.ending++;
    if (C.ending > 80) {
      if (caveLevel === 1) startCaveLevel(2);
      else startSurfaceScene();
    }
  }
}

// ---- climbing back to the surface ----
function startSurfaceScene() {
  resetCave();
  flames = []; particles = []; floatingTexts = [];
  currentLevel = 4;
  levelTimerSeconds = 0;
  state = 'SURFACE';
  surface = { t: 0, typed: 0, clock: 0 };
  dragon.wingState = 1;
  invulnerableTimer = 0;
}

const SURFACE_LINE = { say: 'CYN', text: 'The surface at last. Hold on, Sarai. I\'m coming.' };

function updateSurface() {
  const S = surface;
  if (!S) return;
  S.t++; S.clock++;
  if (S.t > 330) S.typed = Math.min(SURFACE_LINE.text.length, S.typed + 1.15);
  if (S.t % 11 === 0) { dragon.wingState = 1; if (S.t < 300) sound.flap(); }
  if (S.t > 260) backgroundParallaxX += 1.2;
  if (S.t >= SURFACE_LEN) finishSurface();
}

function surfaceTap() {
  if (!surface || surface.t < 60) return;
  if (surface.t < 330) { surface.t = 330; return; }
  if (surface.typed < SURFACE_LINE.text.length) { surface.typed = SURFACE_LINE.text.length; return; }
  finishSurface();
}

function finishSurface() {
  surface = null;
  dragon.x = dragon.baseX;
  dragon.y = height * 0.4;
  dragon.velocity = 0;
  currentLevel = 4;
  levelTimerSeconds = 0;
  lives = maxLives;
  updateHeartsDisplay();
  updateLevelBadgeUI();
  levelDialogueType = 'CAVE_CLEAR';
  state = 'LEVEL_DIALOGUE';
}
