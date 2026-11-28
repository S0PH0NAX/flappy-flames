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
  cave = { scroll: 0, t: 0, torches: [], nextTorch: 520, ending: 0, distAcc: 0, title: 260,
    spiders: [], nextSpider: 1100, webs: [], nextWeb: 1700 };
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

  updateCaveSpiders(C, speed);
  updateCaveWebs(C);

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

// ---- cave spiders: they crawl along the ceiling and floor and leap at him when he comes close ----
// (wx is in world coordinates like the torches; y is on screen). A flame kills one; touching one costs a heart.
const SPIDER_GAP = { 1: [950, 700], 2: [620, 480] };   // world px between spiders: base + random
const SPIDER_PTS = 25;
const SPIDER_LEAP_RANGE = 220;
const SPIDER_LEAP_FRAMES = 26;
const SPIDER_GRAVITY = 0.3;
function caveSpiderRest(sp) {
  return sp.surf === 'top' ? caveCeilAt(sp.wx) + sp.r * 0.7 : caveFloorAt(sp.wx) - sp.r * 0.7;
}
function updateCaveSpiders(C, speed) {
  const gap = SPIDER_GAP[caveLevel] || SPIDER_GAP[1];
  while (C.nextSpider < C.scroll + width + 160) {
    const h = hash2(Math.floor(C.nextSpider), 21);
    const sp = { wx: C.nextSpider, surf: h < 0.5 ? 'top' : 'floor', state: 'crawl', r: 11 + hash2(Math.floor(C.nextSpider), 23) * (caveLevel === 2 ? 8 : 5),
      dir: hash2(Math.floor(C.nextSpider), 25) < 0.7 ? -1 : 1, crawl: 0.6 + hash2(Math.floor(C.nextSpider), 27) * 0.9,
      vx: 0, vy: 0, leapT: 0, cool: 40, legT: 0, rot: 0, seed: Math.floor(C.nextSpider) };
    sp.y = caveSpiderRest(sp);
    C.spiders.push(sp);
    C.nextSpider += gap[0] + hash2(Math.floor(C.nextSpider), 29) * gap[1];
  }
  C.spiders.forEach(sp => {
    const sx = sp.wx - C.scroll;
    sp.legT++;
    if (sp.cool > 0) sp.cool--;
    if (sp.state === 'crawl') {
      // skitter along the rock, now and then stopping and turning
      if (hash2(sp.seed, Math.floor(sp.legT / 50)) < 0.12) { sp.moving = false; }
      else { sp.moving = true; sp.wx += sp.dir * sp.crawl; }
      if (sp.legT % 140 === 0 && hash2(sp.seed, sp.legT) < 0.35) sp.dir = -sp.dir;
      sp.y = caveSpiderRest(sp);
      const dx = sx - dragon.x;
      if (sp.cool <= 0 && dx > -10 && dx < SPIDER_LEAP_RANGE && !C.ending) {
        // leap: aim at where he will be, allowing for the scroll
        const T = SPIDER_LEAP_FRAMES;
        const tx = dragon.x + 10, ty = dragon.y;
        sp.vx = (tx - sx) / T + speed;
        sp.vy = (ty - sp.y) / T - 0.5 * SPIDER_GRAVITY * T;
        sp.state = 'leap'; sp.leapT = 0;
        sound.spiderHiss();
      }
    } else if (sp.state === 'leap') {
      sp.leapT++;
      sp.wx += sp.vx;
      sp.vy += SPIDER_GRAVITY;
      sp.y += sp.vy;
      sp.rot += 0.12 * Math.sign(sp.vx - speed || 1);
      const ceil = caveCeilAt(sp.wx), floor = caveFloorAt(sp.wx);
      if (sp.leapT > 6 && (sp.y < ceil + sp.r * 0.7 || sp.y > floor - sp.r * 0.7)) {
        sp.surf = sp.y < (ceil + floor) / 2 ? 'top' : 'floor';
        sp.state = 'crawl'; sp.rot = 0; sp.cool = 130; sp.dir = -1;
        sp.y = caveSpiderRest(sp);
      }
    } else if (sp.state === 'dead') {
      sp.vy += 0.35; sp.y += sp.vy; sp.wx += sp.vx; sp.rot += 0.15;
    }
    if (sp.state === 'dead') return;
    const nsx = sp.wx - C.scroll;
    // burned by his flame
    if (flames.some(f => Math.hypot(f.x - nsx, f.y - sp.y) < sp.r + 12)) {
      sp.state = 'dead'; sp.vx = speed * 0.5; sp.vy = sp.surf === 'top' ? 0 : -3;
      sound.spiderSquish();
      const r = addScore(SPIDER_PTS);
      floatingTexts.push({ x: nsx - 30, y: sp.y - 20, text: 'SPIDER +' + r.totalPts, color: '#ff6b6b', alpha: 1.0, vy: -1.2 });
      for (let i = 0; i < 14; i++) particles.push({ x: nsx, y: sp.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.7) * 4, size: 2 + Math.random() * 3, life: 20 + Math.random() * 20, color: i % 3 ? '#ff9f43' : '#6a8f2a' });
      return;
    }
    // it gets him
    if (Math.hypot(nsx - dragon.x, sp.y - dragon.y) < sp.r + dragon.size * 0.32) {
      if (invulnerableTimer <= 0) triggerHit();
      sp.state = 'leap'; sp.leapT = 0; sp.vx = speed + 3; sp.vy = sp.y < dragon.y ? -2 : 2; sp.cool = 200;   // it springs off him
    }
  });
  C.spiders = C.spiders.filter(sp => sp.wx - C.scroll > -80 && sp.y < height + 60 && sp.y > -60);
}

// ---- webs strung across the whole tunnel: burn through them, or fly into them and lose a heart ----
const WEB_GAP = { 1: [1800, 900], 2: [1300, 700] };
const WEB_HP = 100;
const WEB_BURN_PER_FLAME = 9;    // per flame, per frame it touches the web
const WEB_BURN_FRAMES = 45;
const WEB_PTS = 15;
function updateCaveWebs(C) {
  const gap = WEB_GAP[caveLevel] || WEB_GAP[1];
  while (C.nextWeb < C.scroll + width + 200) {
    // keep webs clear of torches so a torch is never trapped behind one
    let wx = C.nextWeb;
    if (C.torches.some(tc => Math.abs(tc.wx - wx) < 90)) wx += 120;
    C.webs.push({ wx: wx, hp: WEB_HP, state: 'whole', burnT: 0, spots: [], seed: Math.floor(wx) });
    C.nextWeb = wx + gap[0] + hash2(Math.floor(wx), 31) * gap[1];
  }
  C.webs.forEach(wb => {
    const sx = wb.wx - C.scroll;
    wb.spots.forEach(sp => sp.t++);
    wb.spots = wb.spots.filter(sp => sp.t < 70);
    if (wb.state === 'whole') {
      const ceil = caveCeilAt(wb.wx), floor = caveFloorAt(wb.wx);
      flames.forEach(f => {
        if (Math.abs(f.x - sx) < 16 && f.y > ceil && f.y < floor) {
          wb.hp -= WEB_BURN_PER_FLAME;
          if (wb.spots.length < 24 && Math.random() < 0.5) wb.spots.push({ y: f.y, t: 0 });
        }
      });
      if (wb.hp <= 0) {
        wb.state = 'burning'; wb.burnT = 0;
        sound.fireRoar();
        const r = addScore(WEB_PTS);
        floatingTexts.push({ x: sx - 40, y: (ceil + floor) / 2 - 30, text: 'WEB BURNED +' + r.totalPts, color: '#ffcf5a', alpha: 1.0, vy: -1.2 });
      }
      // flying into it
      if (wb.state === 'whole' && Math.abs(dragon.x + dragon.size * 0.25 - sx) < 12) {
        if (invulnerableTimer <= 0) triggerHit();
        wb.state = 'torn'; wb.burnT = 0;
        dragon.vx = -3;
        sound.spiderHiss();
        for (let i = 0; i < 16; i++) particles.push({ x: sx, y: dragon.y + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.3) * 4, vy: (Math.random() - 0.5) * 3, size: 1.5 + Math.random() * 2, life: 25 + Math.random() * 20, color: '#dfe6ee' });
      }
    } else {
      wb.burnT++;
      if (wb.state === 'burning' && wb.burnT % 3 === 0) {
        const ceil = caveCeilAt(wb.wx), floor = caveFloorAt(wb.wx);
        particles.push({ x: sx + (Math.random() - 0.5) * 20, y: ceil + Math.random() * (floor - ceil), vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 2, size: 2 + Math.random() * 2, life: 18 + Math.random() * 14, color: Math.random() < 0.5 ? '#ffcf5a' : '#ff793f' });
      }
    }
  });
  C.webs = C.webs.filter(wb => wb.wx - C.scroll > -80 && !(wb.state !== 'whole' && wb.burnT > WEB_BURN_FRAMES + 40));
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
