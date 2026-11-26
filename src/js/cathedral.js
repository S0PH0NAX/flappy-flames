// cathedral.js — Level 2's optional cathedral encounter: a tall tower with a red tiled roof and a great
// stained-glass window appears 3/4 of the way through level 2. No one mentions it. Flying into the window
// (no damage) starts a cutscene (state 'CATHEDRAL'): Cyndraxx falls through a vast golden cathedral, lands
// on the carpet and may REST (dream of the festival, gain a heart container, then doubt, guilt, and the
// priest Clement the Simple, whose strange power sends him back) or FIGHT ON (back to the level at once).
// Drawing is in render-cathedral.js. Classic script: shares global scope with the other src/js files.

const CATH_AT = 135;                    // seconds into level 2 (3/4 of its 180s) when the tower comes
const CATH_W = 150;                     // tower width
const CATH_WIN_W = 70, CATH_WIN_H = 120;  // the great stained-glass window, centered at mid-screen height
const CATH_ROOF_H = 78;                 // red tiled roof above the tower body
const CATH_FALL = 330;                  // frames of the fall through the cathedral
const CATH_DREAM = 270;                 // frames per dream picture (dance1, dance2); a tap moves on
const CATH_MAX_LIVES = 5;
const CATH_CLEM_MID = 36;               // Clement's sphere is centered this far above his feet
const CATH_SPHERE_R = 60;

let cathedral = null;        // the tower in the level { x, broken, noHit }
let cathedralSpawned = false;
let cathScene = null;        // the cutscene while state === 'CATHEDRAL'
let cathDread = false;       // after Clement: a faint dark vignette for the rest of level 2
let cathAfter = null;        // a thought shown back in the level { text, t, dur }
let cathFadeIn = null;       // fading back into the level { color, t, dur }

const cynPortrait = new Image(); cynPortrait.src = 'assets/images/cyndraxx1.jpg';

function resetCathedral() {
  cathedral = null;
  cathedralSpawned = false;
  cathScene = null;
  cathDread = false;
  cathAfter = null;
  cathFadeIn = null;
}

// ---- the tower in level 2 ----
function cathedralGeom(c) {
  const gY = height - groundHeight;
  const winTop = height * 0.5 - CATH_WIN_H / 2;
  const bodyTop = winTop - 34;
  return {
    gY: gY,
    winTop: winTop,
    winBot: winTop + CATH_WIN_H,
    winX: c.x + (CATH_W - CATH_WIN_W) / 2,
    bodyTop: bodyTop,
    roofPeak: bodyTop - CATH_ROOF_H
  };
}

// Is this point inside the tower's stone or roof? (The band at window height is open: that's the way in.)
function cathSolidAt(c, g, px, py) {
  if (px < c.x - 10 || px > c.x + CATH_W + 10 || py > g.gY) return false;
  if (py >= g.winTop && py <= g.winBot) return false;
  if (py >= g.bodyTop) return px >= c.x && px <= c.x + CATH_W;
  if (py < g.roofPeak) return false;
  const half = CATH_W / 2 + 10;          // the roof overhangs a little
  const k = (py - g.roofPeak) / (g.bodyTop - g.roofPeak);
  return Math.abs(px - (c.x + CATH_W / 2)) <= half * k;
}

// Normal towers hold back so the cathedral has the sky to itself.
function cathedralBlocksSpawn() {
  if (currentLevel !== 2 || inPrologue()) return false;
  if (!cathedralSpawned && levelTimerSeconds >= CATH_AT) return true;
  return !!cathedral && cathedral.x + CATH_W > width - 340;
}

// Called every game step while playing (from updateLevelExtras).
function updateCathedralTower(shift) {
  if (cathAfter && ++cathAfter.t >= cathAfter.dur) cathAfter = null;
  if (cathFadeIn && ++cathFadeIn.t >= cathFadeIn.dur) cathFadeIn = null;
  if (currentLevel !== 2) { cathDread = false; return; }
  if (!cathedralSpawned && levelTimerSeconds >= CATH_AT) {
    const last = obstacles[obstacles.length - 1];
    if (!last || width - last.x > last.baseWidth + 400) {
      cathedral = { x: width + 20, broken: false, noHit: false };
      cathedralSpawned = true;
    }
  }
  const c = cathedral;
  if (!c) return;
  c.x -= shift;
  if (c.x + CATH_W < -160) { cathedral = null; return; }
  if (c.broken || khaleesiMounted) return;

  const g = cathedralGeom(c);
  const pad = 7;
  const L = dragon.x - dragon.size / 2 + pad, R = dragon.x + dragon.size / 2 - pad;
  const T = dragon.y - dragon.size / 2 + pad, B = dragon.y + dragon.size / 2 - pad;
  // into the window: no damage, the cutscene begins
  if (R > g.winX + 6 && L < g.winX + CATH_WIN_W && dragon.y > g.winTop + 4 && dragon.y < g.winBot - 4) {
    startCathedralScene();
    return;
  }
  if (c.noHit) return;
  const pts = [[L, T], [R, T], [L, B], [R, B], [dragon.x, T], [dragon.x, B], [L, dragon.y], [R, dragon.y]];
  if (pts.some(p => cathSolidAt(c, g, p[0], p[1]))) {
    obstacleHit();
    c.noHit = true;             // like a normal tower: one knock, then it lets you go
  }
}

// ---- the cutscene ----
const CATH_LINES = {
  rest: 'I think I might be able to rest here for a little while.',
  think1: 'In the beauty of this place I wonder... why do the peasants serve such a cruel king?',
  think2: 'Why do they go to the towers to die? Why give their lives in the name of cruelty?',
  think3: 'Sarai has promised to liberate these people. How can I kill those Sarai would liberate?',
  priestIntro: 'A priest steps out of the shadows: Clement the Simple. He seems to hear Cyndraxx\'s questions, though not one was spoken aloud.',
  clement1: 'They serve to redeem their sins. They give their lives to purify their souls. Nothing matters in this sinful world. This is their path to redemption.',
  think4: 'This man holds some horrible power over the people of the castle...',
  fire: 'If that\'s what you believe, Clement, I can offer you a great gift. For nothing is more purifying than fire!',
  power: 'There is some greater power here I don\'t understand. This priest is much more than he seems.',
  begone: 'Begone, foul beast of fire!',
  dread: 'An extra heart beats in my chest... yet a strange dread follows me.'
};

function cathStartSteps() {
  return [
    { act: 'crash', frames: 44 },
    { act: 'fall', frames: CATH_FALL },
    { act: 'land', frames: 50 },
    { say: 'CYN', text: CATH_LINES.rest, choice: true }
  ];
}

function cathRestSteps() {
  return [
    { act: 'sleep', frames: 170 },
    { act: 'dream', frames: CATH_DREAM * 2 },
    { act: 'wake', frames: 80 },
    { act: 'heart', frames: 230 },
    { say: 'THINK', text: CATH_LINES.think1 },
    { say: 'THINK', text: CATH_LINES.think2 },
    { say: 'THINK', text: CATH_LINES.think3 },
    { act: 'cry', frames: 150 },
    { act: 'priest', frames: 90 },
    { say: 'NARR', text: CATH_LINES.priestIntro },
    { say: 'CLEM', text: CATH_LINES.clement1 },
    { say: 'THINK', text: CATH_LINES.think4 },
    { say: 'CYN', text: CATH_LINES.fire },
    { act: 'breath', frames: 230 },
    { say: 'CYN', text: CATH_LINES.power },
    { say: 'CLEM', text: CATH_LINES.begone },
    { act: 'teleport', frames: 160 },
    { act: 'return', frames: 1 }
  ];
}

function cathFightSteps() {
  return [
    { act: 'fade', frames: 55 },
    { act: 'returnPlain', frames: 1 }
  ];
}

function startCathedralScene() {
  const c = cathedral;
  c.broken = true;
  const g = cathedralGeom(c);
  state = 'CATHEDRAL';
  isHoldingAction = false;
  holdTimer = 0;
  khaleesiBannerTimer = 0;
  invulnerableTimer = 0;
  sound.glassShatter();
  // a burst of colored glass where the window was
  const glass = ['#e74c3c', '#2e86de', '#f1c40f', '#27ae60', '#9b59b6', '#ffffff'];
  for (let i = 0; i < 46; i++) {
    particles.push({
      x: g.winX + Math.random() * CATH_WIN_W,
      y: g.winTop + Math.random() * CATH_WIN_H,
      vx: (Math.random() - 0.3) * 7,
      vy: (Math.random() - 0.7) * 6,
      size: 2 + Math.random() * 4,
      life: 30 + Math.random() * 25,
      color: glass[i % glass.length]
    });
  }
  cathScene = {
    steps: cathStartSteps(), i: 0, t: 0, typed: 0,
    clock: 0, dragonY: -60, rot: 0, tears: false, asleep: false, clement: 0, sphere: 0,
    fx: [], shards: [], buttons: null, crash: { x: g.winX + CATH_WIN_W / 2, y: height * 0.5 }
  };
  // glass falling with him through the cathedral
  for (let i = 0; i < 38; i++) {
    cathScene.shards.push({
      x: width * (0.25 + Math.random() * 0.5), off: -220 + Math.random() * 300,   // height relative to Cyndraxx
      vx: (Math.random() - 0.5) * 1.2, vo: -0.3 + Math.random() * 1.1,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      s: 3 + Math.random() * 6, color: glass[i % glass.length]
    });
  }
}

function cathStep() { return cathScene && cathScene.steps[cathScene.i]; }

// HUD and buttons hide once we are inside (prologue.js updateFireButtonLock reads this)
function cathCinematic() {
  const s = cathStep();
  return state === 'CATHEDRAL' && !!s && s.act !== 'crash';
}

function cathNext() {
  const S = cathScene;
  S.i++;
  S.t = 0;
  S.typed = 0;
  S.buttons = null;
  const s = cathStep();
  if (!s) return;
  if (s.act === 'heart') {
    maxLives = Math.min(CATH_MAX_LIVES, maxLives + 1);
    lives = maxLives;
    updateHeartsDisplay();
    sound.powerup();
    sound.heartPickup();
  } else if (s.act === 'priest') {
    sound.magicShimmer(1.2);
  } else if (s.act === 'breath') {
    sound.bigBreath();
  } else if (s.act === 'teleport') {
    sound.teleportWhoosh();
    sound.magicShimmer(1.8);
  } else if (s.act === 'sleep') {
    S.asleep = true;
  } else if (s.act === 'cry') {
    S.tears = true;
  } else if (s.say === 'CYN' && s.text === CATH_LINES.fire) {
    S.tears = false;
  } else if (s.act === 'return' || s.act === 'returnPlain') {
    cathReturnToLevel(s.act === 'return');
  }
}

// Where Cyndraxx and Clement stand once he has landed (in screen coordinates; the camera rests on the floor).
function cathDragonSpot() { return { x: width * 0.34, y: height - Math.max(70, height * 0.16) }; }
function cathClementSpot() { return { x: width * 0.74, y: height - Math.max(70, height * 0.16) + 8 }; }
function cathInteriorH() { return height * 3; }

function updateCathedralScene() {
  const S = cathScene;
  const s = cathStep();
  if (!S || !s) return;
  S.t++;
  S.clock++;

  // glass shards tumble down with him
  S.shards.forEach(sh => { sh.x += sh.vx; sh.off += sh.vo; sh.rot += sh.vr; });

  if (s.say) {
    S.typed = Math.min(s.text.length, S.typed + 1.15);
  } else if (s.act === 'fall') {
    const IH = cathInteriorH();
    const floorY = IH - (height - cathDragonSpot().y);
    const u = Math.min(1, S.t / s.frames);
    // he drops faster and faster, then flaps hard near the floor and settles
    const k = u < 0.8 ? Math.pow(u / 0.8, 1.7) * 0.93 : 0.93 + (1 - Math.pow(1 - (u - 0.8) / 0.2, 2)) * 0.07;
    S.dragonY = -60 + (floorY + 60) * k;
    S.rot = u < 0.75 ? Math.sin(S.t * 0.09) * 1.1 * (1 - u) + S.t * 0.04 * (1 - u / 0.75) : S.rot * 0.85;
    if (u > 0.78 && S.t % 9 === 0) { dragon.wingState = 1; sound.flap(); }
  } else if (s.act === 'land') {
    S.rot *= 0.8;
    if (S.t === 1) {
      const d = cathDragonSpot();
      for (let i = 0; i < 18; i++) {
        S.fx.push({ kind: 'dust', x: d.x + (Math.random() - 0.5) * 60, y: d.y + 24, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.4, life: 40 + Math.random() * 20 });
      }
    }
  } else if (s.act === 'wake') {
    if (S.t === 30) S.asleep = false;
  } else if (s.act === 'priest') {
    S.clement = Math.min(1, S.t / 70);
  } else if (s.act === 'breath') {
    S.sphere = Math.min(1, Math.max(0, (S.t - 14) / 50));
    const d = cathDragonSpot(), cl = cathClementSpot();
    if (S.t < 150) {
      const mx = d.x + 39 * 1.4, my = d.y - 6;
      for (let i = 0; i < 5; i++) {
        const sp = 7 + Math.random() * 4;
        const ang = Math.atan2(cl.y - CATH_CLEM_MID - my, cl.x - mx) + (Math.random() - 0.5) * 0.28;
        S.fx.push({ kind: 'fire', x: mx, y: my, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 60, size: 16 + Math.random() * 22 });
      }
    }
  } else if (s.act === 'teleport') {
    S.sphere = Math.max(0, 1 - S.t / 40);
  }

  // effect particles (dust, fire that splashes off Clement's sphere)
  const cl = cathClementSpot();
  const R = CATH_SPHERE_R;
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i];
    f.x += f.vx; f.y += f.vy; f.life--;
    if (f.kind === 'dust') { f.vx *= 0.95; f.vy *= 0.95; }
    if (f.kind === 'fire') {
      f.size *= 1.012;
      const dx = f.x - cl.x, dy = f.y - (cl.y - CATH_CLEM_MID), dist = Math.hypot(dx, dy);
      if (S.clement > 0 && dist < R + f.size * 0.3 && !f.bounced) {
        // deflected along the sphere: the fire can't touch him
        f.bounced = true;
        const nx = dx / dist, ny = dy / dist;
        const dot = f.vx * nx + f.vy * ny;
        f.vx = (f.vx - 2 * dot * nx) * 0.45 + ny * (Math.random() < 0.5 ? 3 : -3);
        f.vy = (f.vy - 2 * dot * ny) * 0.45 - 1.5;
        f.life = Math.min(f.life, 26);
        if (Math.random() < 0.25) S.fx.push({ kind: 'spark', x: f.x, y: f.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 22 });
      }
    }
    if (f.life <= 0) S.fx.splice(i, 1);
  }

  if (!s.say && S.t >= s.frames) cathNext();
}

// Tap / click during the cutscene (clickX/Y are canvas coordinates, undefined for the keyboard).
function cathedralTap(x, y) {
  const S = cathScene;
  const s = cathStep();
  if (!S || !s) return;
  if (s.say) {
    if (S.typed < s.text.length) { S.typed = s.text.length; return; }
    if (s.choice) {
      if (x === undefined || !S.buttons) return;
      const hit = S.buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (!hit) return;
      sound.score();
      S.steps = S.steps.slice(0, S.i + 1).concat(hit.id === 'rest' ? cathRestSteps() : cathFightSteps());
      cathNext();
      return;
    }
    cathNext();
    return;
  }
  if (s.act === 'dream') {
    // jump to the next picture, or wake up
    if (S.t < CATH_DREAM) S.t = CATH_DREAM; else cathNext();
  } else if (s.act === 'heart' && S.t > 70) {
    cathNext();
  }
}

// Keys for the choice: R = rest, F = fight on
function cathedralKey(code) {
  const s = cathStep();
  if (!s || !s.choice || cathScene.typed < s.text.length) return false;
  if (code !== 'KeyR' && code !== 'KeyF') return false;
  cathScene.steps = cathScene.steps.slice(0, cathScene.i + 1).concat(code === 'KeyR' ? cathRestSteps() : cathFightSteps());
  cathNext();
  return true;
}

function cathReturnToLevel(changed) {
  state = 'PLAYING';
  cathScene = null;
  dragon.x = dragon.baseX;
  dragon.y = height * 0.4;
  dragon.vx = 0;
  dragon.velocity = dragon.jump;
  dragon.wingState = 1;
  invulnerableTimer = 120;     // a moment to get his bearings
  cathedral = null;            // he comes back in open sky (the fade hides the tower going)
  isHoldingAction = false;
  cathFadeIn = { color: changed ? '255,255,255' : '0,0,0', t: 0, dur: 45 };
  if (changed) {
    cathDread = true;
    cathAfter = { text: CATH_LINES.dread, t: 0, dur: 360 };
    // the last of Clement's shimmer clings to him
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 30;
      particles.push({
        x: dragon.x + Math.cos(a) * r, y: dragon.y + Math.sin(a) * r,
        vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5 - 0.5,
        size: 2 + Math.random() * 3, life: 30 + Math.random() * 30,
        color: 'hsl(' + Math.floor(Math.random() * 360) + ', 90%, 85%)'
      });
    }
  }
}
