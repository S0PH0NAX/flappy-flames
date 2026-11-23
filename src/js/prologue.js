// prologue.js — The two peaceful levels before level 1, and the ballista capture that ends them.
//   Meadow (currentLevel PRO_MEADOW = -1): sunny rolling hills, wildflowers, sheep and shepherds, birds,
//     maypole dancers. Khaleesi talks about peace; later she asks Syraxx to snatch a sheep and pays the shepherd.
//   Village (currentLevel PRO_VILLAGE = 0): thatched huts and crowds of peasants. At the end a castle wall
//     rolls in and its ballista nets Syraxx and Khaleesi (state CAPTURE, no player control). Khaleesi is
//     dragged inside, then the old "captured by the slavers" message plays (state CAPTURED_MSG) and level 1 starts.
// Khaleesi rides the whole time (no invincibility), fire is disabled, ground hits still cost hearts.
// Art lives in render-prologue.js.
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

const PRO_MEADOW = -1, PRO_VILLAGE = 0;
const PRO_CODE_MEADOW = 22, PRO_CODE_VILLAGE = 31;   // save-code level characters "M" and "V"
LEVEL_DURATIONS[PRO_MEADOW] = 100;
LEVEL_DURATIONS[PRO_VILLAGE] = 95;
const PRO_SPEED = 2.5;                // world scroll, px per frame
const FEST_APPROACH_SPEED = 1.1;      // slower scroll while the festival hall comes in, so the roof is easier to land on
const PRO_PTS_SHEEP = 250, PRO_PTS_ROOF = 500, PRO_PTS_SING = 50;
// current world scroll: eases down to FEST_APPROACH_SPEED as the festival hall approaches
function proSpeed() {
  const F = pro && pro.fest;
  if (!F || F.phase !== 'approach') return PRO_SPEED;
  const k = Math.max(0, Math.min(1, (width + 260 - F.ent.x) / 260));
  return PRO_SPEED + (FEST_APPROACH_SPEED - PRO_SPEED) * k;
}
// score points with a floating label
function proScore(pts, label, x, y, color) {
  const r = addScore(pts);
  floatingTexts.push({ x: x, y: y, text: label + ' +' + r.totalPts, color: color, alpha: 1.0, vy: -1.3 });
}
const PRO_SNATCH_DX = 30;             // how close (horizontally) the dragon must be to grab a sheep
const PRO_SNATCH_DY = 44;             // ...and how far above the ground its feet may be
const PRO_CARRY_FRAMES = 80;          // the sheep dangles this long before Syraxx eats it
const PRO_POUCH_FRAMES = 55;          // flight time of Khaleesi's gold pouch
const PRO_END_FADE = 50;              // fade out at the end of the meadow
const PRO_TITLE_FRAMES = 200;

const PRO_INVITE_TEXT = [
  '"Good morning, my sweet Syraxx!',
  'The sun is shining and the whole',
  'valley is in bloom. Come, my love,',
  'let us take to the skies together',
  'and see our beautiful home!"'
];
totalCharCount = PRO_INVITE_TEXT.join('\n').length;   // the opening screen types this message

const PRO_SCRIPT = {};
PRO_SCRIPT[PRO_MEADOW] = [
  { at: 2,  dur: 240, text: '"Feel the sun on your wings, Syraxx! Isn\'t our valley beautiful?"' },
  { at: 13, dur: 260, text: '"Wildflowers as far as the eye can see... I never tire of this view."' },
  { at: 25, dur: 300, text: '"This valley was meant to live in peace, my love. Every shepherd, every lamb, every child."' },
  { at: 38, dur: 340, text: '"The only reason ever to go to war is to protect the innocent and the vulnerable. Never forget that, Syraxx."' },
  { at: 50, fn: () => { pro.forceNext = 'maypole'; } },
  { at: 54, dur: 260, text: '"Listen! They\'re singing! Look at them dance around the maypole!"' },
  { at: 66, dur: 320, text: '"You must be getting hungry, my love. Go on, swoop down and snatch up a sheep!"',
    fn: () => { pro.hungry = true; pro.forceNext = 'flock'; pro.hungryAt = pro.t; } }
];
PRO_SCRIPT[PRO_VILLAGE] = [
  { at: 2,  dur: 260, text: '"Look down there, Syraxx... the village! Fly gently, let\'s not frighten anyone."' },
  { at: 14, dur: 320, text: '"See how everything fits together? The farmer grows the wheat, the miller grinds it, the baker feeds them all."' },
  { at: 28, dur: 280, text: '"The smith, the weaver, the shepherd... each one needs the others. Like you and me."' },
  { at: 32, fn: () => { pro.forceNext = 'festival'; pro.spawnGap = Math.min(pro.spawnGap, 60); } },
  { at: 42, dur: 260, text: '"Hear that? Their songs, their laughter... the music of their lives."' },
  { at: 56, dur: 300, text: '"Children chasing hens, grandmothers telling stories by the door. I could watch them forever."' },
  { at: 70, dur: 260, text: '"This is why we fly, Syraxx. Not for glory. For them."' },
  { at: 85, dur: 300, text: '"What\'s that up ahead? A castle... I don\'t like the look of those walls."' }
];

// Rolling ground: height above the flat ground line at world position wx (screen x + sunnyScroll).
const PRO_TERRAIN_MAX = 100;
function proTerrainH(wx) {
  let h = proTerrainBase(wx);
  // level ground under the festival hall and square
  for (const f of proFlats) {
    const d = wx < f.a ? f.a - wx : (wx > f.b ? wx - f.b : 0);
    if (d < 160) { const k = 1 - d / 160; h += (f.h - h) * k * k * (3 - 2 * k); }
  }
  return h;
}
function proTerrainBase(wx) {
  const v = 0.55 * Math.sin(wx * 0.0038 + 1.3) + 0.3 * Math.sin(wx * 0.009 + 0.4) + 0.15 * Math.sin(wx * 0.022 + 2.2);
  const amp = (currentLevel === PRO_VILLAGE && state !== 'SPLASH' && state !== 'START') ? 0.65 : 1;
  return PRO_TERRAIN_MAX * amp * (0.5 + 0.5 * v);
}
// screen y of the ground surface at screen x
function proGroundY(sx) { return height - groundHeight - proTerrainH(sunnyScroll + sx); }

let pro = null;          // state of the current prologue level (null outside the prologue)
let sunnyScroll = 0;     // foreground scroll of the sunny scenes, in px
let sunnyBirds = [];
let fireBtnDisabledShown = false;
let cinematicShown = false;

function inPrologue() { return currentLevel <= 0; }

function isPrologueCode(v) { return v === PRO_CODE_MEADOW || v === PRO_CODE_VILLAGE; }

// Screens that use the sunny daytime backdrop instead of the night sky.
function sunnyScene() {
  if (state === 'SPLASH' || state === 'START' || state === 'CAPTURE') return true;
  return inPrologue() && (state === 'PLAYING' || state === 'PAUSED' || state === 'GAMEOVER');
}

function fireDisabled() {
  return state === 'SPLASH' || state === 'START' || state === 'CAPTURE' || state === 'CAPTURED_MSG' || inPrologue();
}

// Khaleesi sits on Syraxx's back (drawn by drawDragon) without the invincible rainbow mode.
function khaleesiRidingNow() {
  if (khaleesiMounted) return false;
  if (state === 'START') return true;
  if (state === 'CAPTURE') return true;   // bound in the net together
  return inPrologue() && (state === 'PLAYING' || state === 'PAUSED' || state === 'GAMEOVER');
}

function updateFireButtonLock() {
  const cine = (state === 'CAPTURE' && !!(pro && pro.cap && pro.cap.t >= CAP_CLOSE)) || festStory();
  if (cine !== cinematicShown) { cinematicShown = cine; container.classList.toggle('cinematic', cine); }
  updateSingButton();
  const off = fireDisabled() && !singBtnShown;
  if (off !== fireBtnDisabledShown) {
    fireBtnDisabledShown = off;
    manualFireBtn.classList.toggle('disabled', off);
  }
}

function proLevelName(lvl) { return lvl === PRO_MEADOW ? 'MEADOW' : 'VILLAGE'; }

function startPrologueLevel(lvl) {
  currentLevel = lvl;
  levelTimerSeconds = 0;
  obstacles = []; battlements = []; archers = []; arrows = []; knights = []; khaleesis = [];
  trebuchets = []; trebuchetBoulders = []; collectableHearts = []; groundFlames = []; flames = [];
  clearLevelExtras();
  if (bossState) bossState.active = false;
  khaleesiMounted = false;
  floatingTexts = []; particles = [];
  proFlats = [];
  khaleesiBannerTimer = 0;
  pro = {
    t: 0, line: 0, ents: [], notes: [], coins: [],
    spawnGap: 120, forceNext: lvl === PRO_MEADOW ? 'flock' : 'hut',
    hungry: false, hungryAt: 0, sheepEaten: false, eatenAt: 0, lastNag: 0,
    carried: null, pouch: null,
    fadeIn: 40, ending: 0, wall: null, cap: null,
    title: PRO_TITLE_FRAMES
  };
  // a few things already on screen so the level doesn't start empty
  if (lvl === PRO_MEADOW) {
    proSpawn('flock', width * 0.55);
  } else {
    proSpawn('hut', width * 0.35);
    proSpawn('crowd', width * 0.62);
    proSpawn('hut', width * 0.85);
  }
  dragon.x = dragon.baseX; dragon.targetX = dragon.baseX; dragon.vx = 0;
  dragon.y = height * 0.4; dragon.velocity = dragon.jump; dragon.wingState = 1;
  state = 'PLAYING';
  updateLevelBadgeUI();
}

// ---------- spawning ----------
function proRand(a, b) { return a + Math.random() * (b - a); }
function proPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function proPerson(opts) {
  const female = Math.random() < 0.5;
  const p = {
    costume: proPick(peasantCostumes),
    look: {
      hat: proPick(female ? [0, 2, 3] : [0, 1, 1, 2, 3]),
      beard: !female && Math.random() < 0.4,
      skin: proPick(SKIN_TONES),
      apron: Math.random() < 0.35
    },
    dress: female,
    tool: 'none',
    phase: Math.random() * Math.PI * 2,
    dir: Math.random() < 0.5 ? -1 : 1,
    scale: 1
  };
  return Object.assign(p, opts || {});
}

function proSpawn(kind, x) {
  const ents = pro.ents;
  if (kind === 'flock') {
    const n = 3 + Math.floor(Math.random() * 4);
    let w = 0;
    for (let i = 0; i < n; i++) {
      ents.push({ type: 'sheep', x: x + w, dir: Math.random() < 0.7 ? -1 : 1, phase: Math.random() * 100,
                  walk: Math.random() < 0.3, lamb: Math.random() < 0.25 });
      w += proRand(26, 46);
    }
    // after Khaleesi asks for a sheep, every flock has a shepherd to pay
    if (pro.hungry || Math.random() < 0.7) {
      const sitting = Math.random() < 0.65;
      ents.push({ type: 'shepherd', x: x + w + proRand(10, 30), sitting: sitting,
                  person: proPerson({ dress: false, tool: sitting ? 'lute' : 'crook' }), joy: 0 });
      w += 50;
    }
    return w;
  }
  if (kind === 'maypole') {
    const n = 5 + Math.floor(Math.random() * 3);
    const dancers = [];
    for (let i = 0; i < n; i++) dancers.push(proPerson({ phase: (i / n) * Math.PI * 2 }));
    ents.push({ type: 'maypole', x: x + 50, dancers: dancers, ribbon: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71', '#ff7fbf', '#ffffff'] });
    return 120;
  }
  if (kind === 'hut') {
    const w = proRand(70, 104);
    ents.push({ type: 'hut', x: x, w: w, wallH: proRand(26, 34), roofH: proRand(30, 40), seed: Math.floor(Math.random() * 1000),
                doorLeft: Math.random() < 0.5, smoke: Math.random() < 0.6 });
    return w;
  }
  if (kind === 'crowd') {
    const n = 4 + Math.floor(Math.random() * 5);
    const people = [];
    let dx = 0;
    for (let i = 0; i < n; i++) {
      const child = Math.random() < 0.25;
      const act = proPick(child ? ['run', 'run', 'wave'] : ['wave', 'wave', 'talk', 'walk', 'dance', 'basket']);
      people.push(proPerson({ dx: dx, act: act, scale: child ? 0.7 : 1, tool: act === 'basket' ? 'basket' : 'none',
                              speed: act === 'walk' ? proRand(0.2, 0.5) : (act === 'run' ? proRand(0.6, 1.1) : 0) }));
      dx += proRand(14, 26);
    }
    if (Math.random() < 0.5) people.push(proPerson({ dx: dx + 8, act: 'lute', tool: 'lute', dress: false }));
    const hens = [];
    if (Math.random() < 0.6) for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) hens.push({ dx: proRand(0, dx), phase: Math.random() * 10, dir: Math.random() < 0.5 ? -1 : 1 });
    ents.push({ type: 'crowd', x: x, people: people, hens: hens, w: dx + 30 });
    return dx + 30;
  }
  if (kind === 'festival') return proSpawnFestival(x);
  if (kind === 'well') {
    ents.push({ type: 'well', x: x });
    return 40;
  }
  return 0;
}

function proNextKind() {
  if (pro.forceNext) { const k = pro.forceNext; pro.forceNext = null; return k; }
  if (currentLevel === PRO_MEADOW) {
    if (pro.hungry) return 'flock';
    const r = Math.random();
    if (pro.t > 50 * 60 && r < 0.25) return 'maypole';
    return 'flock';
  }
  const r = Math.random();
  if (r < 0.5) return 'hut';
  if (r < 0.9) return 'crowd';
  return 'well';
}

// ---------- update ----------
// Ambient motion on every sunny screen: birds, foreground scroll, the dragon bobbing on the start screen.
function updateSunnyAmbient() {
  if (!sunnyScene()) return;
  const moving = state === 'SPLASH' || state === 'START' || (state === 'PLAYING' && inPrologue() && !(pro && pro.wall && pro.wall.stopped) && !festBusy());
  if (moving) {
    const s = (state === 'PLAYING') ? proSpeed() : 1.2;
    sunnyScroll += s;
    if (state !== 'PLAYING') backgroundParallaxX += 0.25;
  }
  if (sunnyBirds.length < 7 && Math.random() < 0.012) {
    const flock = 1 + Math.floor(Math.random() * 4);
    const by = proRand(height * 0.08, height * 0.42);
    const bs = proRand(0.6, 1.2);
    for (let i = 0; i < flock; i++) {
      sunnyBirds.push({ x: width + 20 + i * 18, y: by + (i % 2) * 10 + i * 4, vx: -proRand(0.8, 1.6) * bs, size: 5 * bs,
                        phase: Math.random() * 6, depth: bs });
    }
  }
  sunnyBirds.forEach(b => {
    b.x += b.vx - (moving ? 0.6 * b.depth : 0);
    b.y += Math.sin(b.phase * 0.5) * 0.15;
    b.phase += 0.22;
  });
  sunnyBirds = sunnyBirds.filter(b => b.x > -40);
  if (state === 'START') {
    dragon.x = width * 0.5;
    dragon.y = height / 2 - 150 + Math.sin(Date.now() / 400) * 8;
    dragon.velocity = Math.cos(Date.now() / 400) * -2;
    if (Math.floor(Date.now() / 700) % 2 === 0 && dragon.wingState < 0.2) dragon.wingState = 1;
  }
}

function updatePrologue() {
  const P = pro;
  if (!P) return;
  P.t++;
  if (P.fadeIn > 0) P.fadeIn--;
  if (P.title > 0) P.title--;
  if (!(P.fest && !P.fest.done)) levelTimerSeconds += 1 / 60;   // the clock waits while the festival is on
  updateLevelBadgeUI();
  if (P.fest && P.fest.halted) { updateFestival(); return; }

  const gY = height - groundHeight;
  const stopped = P.wall && P.wall.stopped;
  const shift = stopped ? 0 : proSpeed();
  if (!stopped) backgroundParallaxX += 0.4;

  // flight physics (same as the main game)
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
  // no overhead obstacles: the top of the screen just stops you
  if (dragon.y - dragon.size / 2 < 4) { dragon.y = dragon.size / 2 + 4; dragon.velocity = Math.max(0, dragon.velocity); }
  // the ground still hurts
  const groundHere = Math.min(proGroundY(dragon.x - 10), proGroundY(dragon.x + 12));
  if (dragon.y + dragon.size / 2 - 4 >= groundHere && P.ending === 0) {
    triggerHit();
    if (lives > 0) { dragon.y = height * 0.4; dragon.velocity = 0; }
    if (state !== 'PLAYING') return;
  }

  // scroll and spawn the ground scenery
  P.ents.forEach(e => { e.x -= shift; });
  P.ents = P.ents.filter(e => e.x + (e.w || 0) > -260 && !e.gone);
  if (!P.wall) {
    P.spawnGap -= shift;
    if (P.spawnGap <= 0) {
      const w = proSpawn(proNextKind(), width + 30);
      P.spawnGap = w + (currentLevel === PRO_MEADOW ? proRand(160, 340) : proRand(20, 90));
    }
  }

  // huts are solid
  if (currentLevel === PRO_VILLAGE) {
    P.ents.forEach(e => {
      if (e.type !== 'hut') return;
      const top = proGroundY(e.x + e.w / 2) - e.wallH - e.roofH * 0.55;
      if (dragon.x + dragon.size / 2 - 8 > e.x + 6 && dragon.x - dragon.size / 2 + 8 < e.x + e.w - 6 && dragon.y + dragon.size / 2 - 6 > top) triggerHit();
    });
  }

  if (P.fest && P.fest.phase === 'approach') festApproach();

  proUpdateScript();
  proUpdateSheep(gY);
  proUpdateNotes(shift);

  // end of the meadow: fade out into the village
  if (currentLevel === PRO_MEADOW) {
    const done = levelTimerSeconds >= LEVEL_DURATIONS[PRO_MEADOW] && P.sheepEaten && P.t - P.eatenAt > 360 && !P.pouch && !P.carried;
    if (done && P.ending === 0) P.ending = 1;
    if (P.ending > 0) {
      P.ending++;
      dragon.y += (height * 0.35 - dragon.y) * 0.03;
      dragon.velocity *= 0.9;
      if (P.ending >= PRO_END_FADE) {
        lives = 3;                 // finishing the meadow refills every heart
        updateHeartsDisplay();
        startPrologueLevel(PRO_VILLAGE);
        return;
      }
    }
  }

  // end of the village: the castle wall rolls in and the capture starts
  if (currentLevel === PRO_VILLAGE) {
    if (!P.wall && levelTimerSeconds >= LEVEL_DURATIONS[PRO_VILLAGE]) {
      const lastX = P.ents.reduce((m, e) => Math.max(m, e.x + (e.w || 40)), 0);
      P.wall = { x: Math.max(width + 40, lastX + 80), stopped: false };
      P.ents.push({ type: 'castle', x: P.wall.x, ref: P.wall });
    }
    if (P.wall && !P.wall.stopped) {
      P.wall.x -= shift;
      if (P.wall.x <= width * 0.6) { P.wall.x = width * 0.6; P.wall.stopped = true; startCapture(); }
    }
  }
}

function proUpdateScript() {
  const P = pro;
  const script = PRO_SCRIPT[currentLevel] || [];
  while (P.line < script.length && levelTimerSeconds >= script[P.line].at) {
    const L = script[P.line++];
    if (L.text) showKhaleesiBanner(L.text, L.dur || 260);
    if (L.fn) L.fn();
  }
  if (currentLevel === PRO_MEADOW) {
    if (P.sheepEaten && !P.saidLove && P.t - P.eatenAt > 420) {
      P.saidLove = true;
      showKhaleesiBanner('"I love these days with you, Syraxx. I wish they would never end."', 280);
    }
    // gentle reminder if Syraxx still hasn't eaten
    if (P.hungry && !P.carried && P.t - P.hungryAt > 900 && P.t - P.lastNag > 900 && khaleesiBannerTimer <= 0) {
      P.lastNag = P.t;
      showKhaleesiBanner('"Don\'t be shy, Syraxx! Fly down low and grab a sheep!"', 220);
    }
  }
}

function proUpdateSheep(gY) {
  const P = pro;
  P.ents.forEach(e => {
    if (e.type === 'sheep') {
      e.phase += 1;
      if (e.walk) e.x += e.dir * 0.18;
      if (e.scared > 0) { e.scared--; e.x += e.dir * 1.2; }
    }
    if (e.type === 'shepherd' && e.joy > 0) e.joy--;
  });

  // snatch a sheep once Khaleesi has asked
  if (P.hungry && !P.carried) {
    const feet = dragon.y + dragon.size / 2;
    for (const e of P.ents) {
      if (e.type !== 'sheep' || e.gone) continue;
      if (Math.abs(dragon.x + 6 - e.x) < PRO_SNATCH_DX && feet > proGroundY(e.x) - PRO_SNATCH_DY) {
        e.gone = true;
        P.hungry = false;
        P.carried = { t: 0, lamb: e.lamb };
        dragon.velocity = Math.min(dragon.velocity, dragon.jump * 0.8);
        dragon.wingState = 1;
        proBaa();
        sound.powerup();
        // the rest of the flock scatters
        P.ents.forEach(o => { if (o.type === 'sheep' && Math.abs(o.x - e.x) < 160) { o.scared = 50; o.dir = o.x < e.x ? -1 : 1; } });
        proDropGold(e.x);
        showKhaleesiBanner('"Good boy! And a few gold coins for the shepherd. We never take without paying."', 300);
        break;
      }
    }
  }

  if (P.carried) {
    P.carried.t++;
    if (P.carried.t === 30) proBaa();
    if (P.carried.t >= PRO_CARRY_FRAMES) {
      // CHOMP
      for (let i = 0; i < 18; i++) {
        particles.push({ x: dragon.x + 30, y: dragon.y + 4, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.8) * 4,
                         size: 3 + Math.random() * 4, life: 30 + Math.random() * 20, color: Math.random() < 0.8 ? '#ffffff' : '#e8e2d0' });
      }
      proScore(PRO_PTS_SHEEP, 'CHOMP!', dragon.x + 10, dragon.y - 30, '#ffffff');
      sound.knightHit();
      if (lives < 3) {   // a good meal heals Syraxx
        lives = 3;
        updateHeartsDisplay();
        sound.heartPickup();
        floatingTexts.push({ x: dragon.x - 10, y: dragon.y - 52, text: 'HEARTS REFILLED!', color: '#ff6b8a', alpha: 1.0, vy: -1.1 });
      }
      P.carried = null;
      P.sheepEaten = true;
      P.eatenAt = P.t;
    }
  }

  // Khaleesi's gold pouch flies to the shepherd
  const pch = P.pouch;
  if (pch) {
    pch.t++;
    const tgt = pch.shepherd && !pch.shepherd.gone ? pch.shepherd.x + 10 : pch.tx;
    if (!pch.shepherd) pch.tx -= proSpeed();
    const u = Math.min(1, pch.t / PRO_POUCH_FRAMES);
    const ty = proGroundY(tgt) - 18;
    pch.x = pch.sx + (tgt - pch.sx) * u;
    pch.y = pch.sy + (ty - pch.sy) * u - Math.sin(u * Math.PI) * 70;
    if (pch.t % 3 === 0) P.coins.push({ x: pch.x, y: pch.y, life: 20 });
    if (u >= 1) {
      for (let i = 0; i < 16; i++) {
        particles.push({ x: pch.x, y: pch.y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4,
                         size: 2 + Math.random() * 3, life: 30, color: Math.random() < 0.6 ? '#f1c40f' : '#fff3a0' });
      }
      sound.heartPickup();
      if (pch.shepherd) {
        pch.shepherd.joy = 150;
        floatingTexts.push({ x: pch.x - 50, y: pch.y - 46, text: 'Bless you, m\'lady!', color: '#fff3a0', alpha: 1.0, vy: -0.8 });
      }
      else floatingTexts.push({ x: pch.x - 50, y: pch.y - 46, text: 'For the shepherd!', color: '#fff3a0', alpha: 1.0, vy: -0.8 });
      floatingTexts.push({ x: pch.x - 12, y: pch.y - 24, text: '+GOLD', color: '#f1c40f', alpha: 1.0, vy: -1.0 });
      P.pouch = null;
    }
  }
  P.coins.forEach(c => { c.life--; c.x -= proSpeed() * 0.5; });
  P.coins = P.coins.filter(c => c.life > 0);
}

function proDropGold(sheepX) {
  // the nearest shepherd still on screen gets paid
  let best = null, bd = 1e9;
  pro.ents.forEach(e => {
    if (e.type !== 'shepherd') return;
    const d = Math.abs(e.x - sheepX);
    if (e.x > -30 && e.x < width + 160 && d < bd) { bd = d; best = e; }
  });
  pro.pouch = { t: 0, sx: dragon.x + 6, sy: dragon.y - 34, x: dragon.x, y: dragon.y - 34, shepherd: best, tx: sheepX + 40 };
}

// music notes from lutes and singing dancers
function proUpdateNotes(shift) {
  const P = pro;
  const gY = height - groundHeight;
  P.ents.forEach(e => {
    let sx = null, sy = null, chance = 0;
    if (e.type === 'shepherd' && e.sitting) { sx = e.x + 14; sy = proGroundY(sx) - 26; chance = 0.04; }
    if (e.type === 'festival') { sx = e.x + FEST_HALL_W + FEST_GAP + proRand(0, FEST_SQUARE_W); sy = proGroundY(sx) - 44; chance = 0.14; }
    if (e.type === 'maypole') { sx = e.x + proRand(-30, 30); sy = proGroundY(e.x) - 40; chance = 0.08; }
    if (e.type === 'crowd') {
      const lute = e.people.find(p => p.act === 'lute');
      if (lute) { sx = e.x + lute.dx + 12; sy = proGroundY(sx) - 30; chance = 0.04; }
      else if (Math.random() < 0.3) { sx = e.x + proRand(0, e.w); sy = proGroundY(sx) - 36; chance = 0.04; }
    }
    if (sx !== null && sx > -10 && sx < width + 10 && Math.random() < chance) {
      P.notes.push({ x: sx, y: sy, vx: proRand(-0.3, 0.3), vy: -proRand(0.4, 0.8), life: 90, glyph: proPick(['♪', '♫', '♩']),
                     color: proPick(['#ffffff', '#fff3a0', '#ffd1e8', '#d6f5ff']) });
    }
  });
  P.notes.forEach(n => { n.x += n.vx - shift * 0.8; n.y += n.vy; n.life--; });
  P.notes = P.notes.filter(n => n.life > 0);
}

// a short synthesized "baa"
function proBaa() {
  if (sound.muted) return;
  sound.init();
  const c = sound.ctx;
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const vib = c.createOscillator();
  const vibGain = c.createGain();
  const filt = c.createBiquadFilter();
  const g = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.linearRampToValueAtTime(430, now + 0.45);
  vib.frequency.value = 28;
  vibGain.gain.value = 30;
  vib.connect(vibGain); vibGain.connect(osc.frequency);
  filt.type = 'bandpass'; filt.frequency.value = 1100; filt.Q.value = 2;
  osc.connect(filt); filt.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.start(now); vib.start(now);
  osc.stop(now + 0.52); vib.stop(now + 0.52);
}

// ---------- the spring festival (village) ----------
// A great thatched hall beside the town square, where the village dances round the maypole.
// Khaleesi suggests landing on the hall's roof; touching the hall lands Syraxx there (no damage).
// The world stops, they sing with the townsfolk, then a storybook (dance1, dance2), then they fly on.
// (it appears 32 s into the village; see PRO_SCRIPT)
const FEST_HALL_W = 206, FEST_WALL_H = 48, FEST_ROOF_H = 58, FEST_SQUARE_W = 244, FEST_GAP = 18;
const FEST_POLE_DX = 112;           // maypole position within the square
const FEST_W = FEST_HALL_W + FEST_GAP + FEST_SQUARE_W;
const FEST_LAND_FRAMES = 40, FEST_SING_FRAMES = 480, FEST_IMG_FRAMES = 270, FEST_AFTER_FRAMES = 230;
const FEST_CAPTIONS = [
  'The whole village sang together, and Dragon Queen Sarai sang loudest of all...',
  '...while Syraxx spread his great wings and flapped along to the music.'
];
const danceImg1 = new Image(); danceImg1.src = 'assets/images/dance1.jpg';
const danceImg2 = new Image(); danceImg2.src = 'assets/images/dance2.jpg';

// stretches of flattened ground (world x) so the hall and square sit level
let proFlats = [];

function proSpawnFestival(x) {
  const wx = sunnyScroll + x;
  const mid = wx + FEST_W / 2;
  proFlats = proFlats.filter(f => f.b > sunnyScroll - 400);
  proFlats.push({ a: wx - 30, b: wx + FEST_W + 30, h: proTerrainBase(mid) });
  const dancers = [];
  for (let i = 0; i < 8; i++) dancers.push(proPerson({ phase: (i / 8) * Math.PI * 2 }));
  // townsfolk on both sides of the maypole ring, with two lute players
  const people = [];
  const spots = [6, 26, 46, 66, 160, 178, 196, 214, 232];
  spots.forEach((dx, i) => {
    const child = Math.random() < 0.2;
    const lute = i === 1 || i === 7;
    people.push(proPerson({ dx: dx, act: lute ? 'lute' : proPick(['dance', 'dance', 'wave', 'talk']),
                            tool: lute ? 'lute' : 'none', dress: lute ? false : undefined, scale: child && !lute ? 0.7 : 1 }));
  });
  people.forEach(p => { if (p.dress === undefined) p.dress = Math.random() < 0.5; });
  const dx = 240;
  const e = {
    type: 'festival', x: x, w: FEST_W, seed: Math.floor(Math.random() * 1000),
    pole: { x: 0, dancers: dancers, ribbon: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71', '#ff7fbf', '#ffffff', '#ff9f43'] },
    crowd: { x: 0, people: people, hens: [{ dx: 20, phase: 1, dir: 1 }, { dx: 200, phase: 4, dir: -1 }], w: dx }
  };
  pro.ents.push(e);
  pro.fest = { phase: 'approach', t: 0, ent: e, announced: false, halted: false, done: false };
  return FEST_W;
}

function festHallTop(e) {        // the roof ridge, where Syraxx perches
  return proGroundY(e.x + FEST_HALL_W / 2) - FEST_WALL_H - FEST_ROOF_H;
}

function festBusy() { return !!(pro && pro.fest && pro.fest.halted); }
function festStory() { return !!(pro && pro.fest && pro.fest.phase === 'story'); }

function festTap() {
  const F = pro.fest;
  if (F.phase !== 'story') return;
  if (F.t >= 40 && F.t < FEST_IMG_FRAMES) F.t = FEST_IMG_FRAMES;
  else if (F.t >= FEST_IMG_FRAMES + 40) F.t = FEST_IMG_FRAMES * 2 - 1;
}

// while flying toward the hall: announce it, land on touch, or go round again if missed
function festApproach() {
  const F = pro.fest, e = F.ent;
  if (!F.announced && e.x < width - 40) {
    F.announced = true;
    showKhaleesiBanner('"Syraxx, look! The spring festival! Let\'s land on that big roof and join them!"', 300);
  }
  const top = festHallTop(e) + 6;
  const L = dragon.x - dragon.size / 2 + 6, R = dragon.x + dragon.size / 2 - 6;
  if (R > e.x + 8 && L < e.x + FEST_HALL_W - 8 && dragon.y + dragon.size / 2 > top) {
    F.phase = 'land'; F.t = 0; F.halted = true;
    F.from = { x: dragon.x, y: dragon.y };
    isHoldingAction = false; dragon.vx = 0;
    sound.powerup();
    proScore(PRO_PTS_ROOF, 'NICE LANDING!', dragon.x - 30, dragon.y - 40, '#fff3a0');
    return;
  }
  if (e.x + FEST_HALL_W < dragon.x - dragon.size) {
    // flew past: the next village festival comes round again
    showKhaleesiBanner('"Oh! We flew right past it! Let\'s circle round and try again!"', 220);
    pro.fest = null;
    pro.forceNext = 'festival';
    pro.spawnGap = 420;
  }
}

function updateFestival() {
  const F = pro.fest, e = F.ent;
  F.t++;
  if (F.singCool > 0) F.singCool--;
  if (F.singT > 0) F.singT--;
  if (e.crowd.cheer > 0) e.crowd.cheer--;
  // glide the view so the hall and the whole square fit on screen while they rest
  const want = Math.max(8, Math.min(40, width - FEST_W - 8));
  if (e.x > want + 0.3) {
    const s = Math.min(PRO_SPEED * 1.6, (e.x - want) * 0.06 + 0.3);
    pro.ents.forEach(o => { o.x -= s; });
    pro.notes.forEach(n => { n.x -= s; });
    sunnyScroll += s;
    backgroundParallaxX += s * 0.16;
  }
  const perchX = e.x + FEST_HALL_W * 0.42;
  const perchY = festHallTop(e) - 16;
  dragon.velocity = 0;
  if (F.phase === 'land') {
    const u = Math.min(1, F.t / FEST_LAND_FRAMES);
    const k = u * u * (3 - 2 * u);
    dragon.x = F.from.x + (perchX - F.from.x) * k;
    dragon.y = F.from.y + (perchY - F.from.y) * k - Math.sin(k * Math.PI) * 18;
    if (F.t % 8 === 0) { dragon.wingState = 1; sound.flap(); }
    if (u >= 1) {
      F.phase = 'sing'; F.t = 0;
      showKhaleesiBanner('"Ha! Sing with us, Syraxx! Everyone, sing!"', 200);
      e.crowd.people.forEach(p => { if (p.act !== 'lute') p.act = Math.random() < 0.7 ? 'dance' : 'wave'; });
    }
  } else if (F.phase === 'sing') {
    // perched on the ridge, bobbing to the music and flapping happily
    dragon.x = perchX;
    dragon.y = perchY - Math.abs(Math.sin(F.t * 0.12)) * 4;
    if (F.singT > 0) dragon.y -= Math.sin((F.singT / 30) * Math.PI) * 12;   // the SING hop
    if (F.t % 36 === 0) { dragon.wingState = 1; sound.flap(); }
    if (Math.random() < 0.16) {
      pro.notes.push({ x: dragon.x + proRand(-10, 30), y: dragon.y - 40, vx: proRand(-0.5, 0.5), vy: -proRand(0.6, 1.1), life: 90,
                       glyph: proPick(['♪', '♫', '♩']), color: proPick(['#ffffff', '#fff3a0', '#ffd1e8']) });
    }
    if (F.t === 210) showKhaleesiBanner('"♪ The frost is gone, the swallows sing, come dance with us, it\'s spring, it\'s spring! ♪"', 250);
    if (F.t >= FEST_SING_FRAMES) { F.phase = 'story'; F.t = 0; khaleesiBannerTimer = 0; }
  } else if (F.phase === 'story') {
    dragon.x = perchX; dragon.y = perchY;
    if (F.t >= FEST_IMG_FRAMES * 2) {
      F.phase = 'after'; F.t = 0;
      showKhaleesiBanner('"We should journey on, my love, and leave the townsfolk to their revels."', FEST_AFTER_FRAMES);
    }
  } else if (F.phase === 'after') {
    dragon.x = perchX;
    dragon.y = perchY - Math.abs(Math.sin(F.t * 0.08)) * 2;
    if (F.t >= FEST_AFTER_FRAMES) {
      // take off and fly on
      F.phase = 'done'; F.halted = false; F.done = true;
      dragon.velocity = dragon.jump * 1.3;
      dragon.wingState = 1;
      sound.flap();
      e.crowd.people.forEach(p => { if (p.act !== 'lute') p.act = 'wave'; });
    }
  }
  proUpdateNotes(0);
}

// ---------- singing on the festival roof ----------
// While Syraxx is perched (before the storybook), the FIRE button becomes a blue SING button.
let singBtnShown = false;
const SING_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];   // C major pentatonic, two octaves

function festCanSing() {
  const F = pro && pro.fest;
  return state === 'PLAYING' && !!F && (F.phase === 'land' || F.phase === 'sing');
}

function updateSingButton() {
  const on = festCanSing();
  if (on === singBtnShown) return;
  singBtnShown = on;
  manualFireBtn.classList.toggle('sing-btn', on);
  manualFireBtn.innerHTML = on ? 'SING <span class="btn-symbol">🎵</span>' : FIRE_BTN_HTML;
  manualFireBtn.style.display = (on || isFlapLockActive) ? 'inline-block' : 'none';
}

// a short, bright three-note chime, a little different every time
function playSingChime() {
  if (sound.muted) return;
  sound.init();
  const c = sound.ctx;
  if (!c) return;
  const start = Math.floor(Math.random() * 3);
  const step = Math.random() < 0.5 ? 1 : 2;
  const now = c.currentTime;
  [0, 1, 2].forEach(i => {
    const f = SING_SCALE[Math.min(SING_SCALE.length - 1, start + i * step)];
    const t0 = now + i * 0.09;
    ['sine', 'triangle'].forEach((type, j) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f * (j ? 2 : 1), t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(j ? 0.035 : 0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + 0.6);
    });
  });
}

// press SING: a happy hop and wing flap, a burst of notes and hearts, the crowd cheers
function festSing() {
  const F = pro.fest;
  if (F.singCool > 0) return;
  F.singCool = 14;
  F.singT = 30;
  playSingChime();
  proScore(PRO_PTS_SING, '♪', dragon.x + proRand(-10, 20), dragon.y - 50, '#bfe6ff');
  dragon.wingState = 1;
  F.ent.crowd.cheer = 40;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.28;
    const sp = 1.2 + Math.random() * 1.2;
    pro.notes.push({ x: dragon.x + 18, y: dragon.y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 80,
                     glyph: i % 4 === 2 ? '♥' : proPick(['♪', '♫', '♩']),
                     color: i % 4 === 2 ? '#ff6b8a' : proPick(['#ffffff', '#fff3a0', '#bfe6ff', '#ffd1e8']) });
  }
}

// ---------- the ballista capture (state CAPTURE) ----------
// 1. aim and fire: a big square net unfolds in flight
// 2. it wraps Syraxx and Khaleesi together; the rope drags them over the wall and they fall inside
// 3. close-up: the two of them tumbling through the sky, bound in the net (beheading music starts)
// 4. capture1.png (Khaleesi cut out of the net and dragged away), then capture2.png (Syraxx wakes and escapes)
const CAP_FIRE = 70, CAP_HIT = 98, CAP_DRAG = 135, CAP_OVER = 215, CAP_CLOSE = 250;
const CAP_FALL_FRAMES = 330;                       // close-up of the fall
const CAP_IMG_FRAMES = 270;                        // each story image (about 4.5 s)
const CAP_IMG1 = CAP_CLOSE + CAP_FALL_FRAMES;
const CAP_IMG2 = CAP_IMG1 + CAP_IMG_FRAMES;
const CAP_END = CAP_IMG2 + CAP_IMG_FRAMES;
const CAP_FALL_LINE = '"Hold on to me, Syraxx... whatever they do to us, I will find you again."';
const CAP_IMG_CAPTIONS = [
  'They cut Dragon Queen Sarai from the net and dragged her away...',
  '...but Syraxx woke, and broke free.'
];
const captureImg1 = new Image(); captureImg1.src = 'assets/images/capture1.jpg';
const captureImg2 = new Image(); captureImg2.src = 'assets/images/capture2.jpg';

function proBallista() {
  // muzzle of the ballista on top of the wall (matches drawProCastle)
  const gY = height - groundHeight;
  const wallTop = gY - proWallHeight();
  return { x: pro.wall.x + 46, y: wallTop - 22, wallTop: wallTop };
}
function proWallHeight() { return Math.min(height * 0.42, 300); }

// the beheading music plays from the close-up of the fall through the "captured" message
function captureSadMusic() {
  if (state === 'CAPTURED_MSG') return true;
  return state === 'CAPTURE' && !!(pro && pro.cap && pro.cap.t >= CAP_CLOSE);
}

function startCapture() {
  state = 'CAPTURE';
  isHoldingAction = false;
  invulnerableTimer = 0;
  pro.cap = { t: 0, net: null, hoverY: Math.min(Math.max(dragon.y, height * 0.3), height * 0.5), tumble: 0, from: null };
  showKhaleesiBanner('"Syraxx... the knights are aiming something at us! Pull up!"', 120);
}

// taps during the story images move on to the next one
function captureTap() {
  const C = pro && pro.cap;
  if (!C) return;
  if (C.t >= CAP_IMG1 + 40 && C.t < CAP_IMG2) C.t = CAP_IMG2;
  else if (C.t >= CAP_IMG2 + 40) C.t = CAP_END - 1;
}

function updateCapture() {
  const C = pro.cap;
  const t = ++C.t;
  pro.t++;
  const B = proBallista();
  const hoverX = width * 0.3;

  if (t < CAP_HIT) {
    // Syraxx is no longer under the player's control
    dragon.x += (hoverX - dragon.x) * 0.05;
    dragon.y += (C.hoverY + Math.sin(t / 12) * 6 - dragon.y) * 0.06;
    dragon.velocity = Math.sin(t / 12) * -1.5;
    if (t % 22 === 0) { dragon.wingState = 1; sound.flap(); }
  } else if (t < CAP_DRAG) {
    // tangled together: thrashing and sinking
    dragon.y += 0.5;
    dragon.x += Math.sin(t * 0.9) * 1.4;
    dragon.velocity = Math.sin(t * 0.7) * 5;
    dragon.wingState = 0.15;
  } else if (t < CAP_OVER) {
    // the rope drags them both up to the battlements
    if (!C.from) C.from = { x: dragon.x, y: dragon.y };
    const u = (t - CAP_DRAG) / (CAP_OVER - CAP_DRAG);
    const e = u * u * (3 - 2 * u);
    dragon.x = C.from.x + (B.x + 10 - C.from.x) * e + Math.sin(t * 0.8) * 1.5;
    dragon.y = C.from.y + (B.wallTop - 55 - C.from.y) * e - Math.sin(e * Math.PI) * 40;
    dragon.velocity = Math.sin(t * 0.5) * 4;
    C.tumble = 0.4;
  } else if (t < CAP_CLOSE) {
    // over the wall and down inside the castle
    const u = (t - CAP_OVER) / (CAP_CLOSE - CAP_OVER);
    dragon.x = B.x + 10 + u * 50;
    dragon.y = B.wallTop - 55 + u * u * 160;
    C.tumble = 1;
  }

  if (t === CAP_FIRE) {
    sound.arrowLaunch();
    sound.boulderLaunch();
    C.net = { x: B.x, y: B.y, open: 0, spin: 0 };
  }
  if (C.net && t < CAP_HIT) {
    const u = (t - CAP_FIRE) / (CAP_HIT - CAP_FIRE);
    C.net.x = B.x + (dragon.x - B.x) * u;
    C.net.y = B.y + (dragon.y - 14 - B.y) * u - Math.sin(u * Math.PI) * 40;
    C.net.open = u;
    C.net.spin = (1 - u) * 2.5;
  }
  if (t === CAP_HIT) {
    sound.hit();
    sound.knightHit();
    showKhaleesiBanner('"A net! Syraxx, we\'re caught!"', 110);
  }
  if (t === CAP_DRAG) { sound.boulderLaunch(); showKhaleesiBanner('"They\'re pulling us in! SYRAXX!"', 120); }
  if (t === CAP_OVER) sound.towerDestroy();
  if (t === CAP_CLOSE) {
    khaleesiBannerTimer = 0;
    cutsceneMusicAudio.currentTime = 0;
  }
  if (t >= CAP_END) startCapturedMessage();
}

function startCapturedMessage() {
  pro = null;
  currentLevel = 1;
  levelTimerSeconds = 0;
  lives = 3;
  updateHeartsDisplay();
  typedCharIndex = 0;
  textTypingComplete = false;
  totalCharCount = fullStoryText.join('\n').length;
  dragon.x = dragon.baseX; dragon.y = height * 0.4; dragon.velocity = 0; dragon.vx = 0;
  state = 'CAPTURED_MSG';
  updateLevelBadgeUI();
}

// debug key 6: the village, just before the spring festival
function debugStartFestival() {
  resetGame();
  startPrologueLevel(PRO_VILLAGE);
  pro.title = 0; pro.fadeIn = 0;
  pro.line = 3;
  levelTimerSeconds = 31.9;
}

// debug key 9: jump to the end of the village and watch the capture
function debugStartCapture() {
  resetGame();
  startPrologueLevel(PRO_VILLAGE);
  pro.ents = [];
  pro.line = PRO_SCRIPT[PRO_VILLAGE].length;
  levelTimerSeconds = LEVEL_DURATIONS[PRO_VILLAGE];
  pro.wall = { x: width * 0.6, stopped: true };
  pro.ents.push({ type: 'castle', x: pro.wall.x, ref: pro.wall });
  pro.title = 0; pro.fadeIn = 0;
  startCapture();
}
