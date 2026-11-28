// boss-fall.js — The siege tower boss's ending (state 'BOSS_FALL'): the burned-out tower stops, the ground
// gives way and it sinks, burning, into a huge pit. A lone archer climbs out of the turret and fires an arrow
// trailing a chain; it pierces Cyndraxx's heart and the chain drags him down into the pit after the tower.
// He falls through the dark, chained to the burning tower below as it breaks apart, fire and wreckage streaming past, while
// glowing mushrooms and jellyfish-like creatures slowly appear. He lands on the cavern floor among the burning
// wreckage, bleeding, dreams of Sarai, and dies; in the dark that follows Brown Jenkins (a possum with a human
// face and hands) offers to save him for Nyarlathotep's price: ACCEPT (healed, +1 heart container, the debt
// explained, then the cave levels in cave.js) or REJECT (game over; CONTINUE goes straight to level 4).
// Classic script: shares global scope with the other src/js files.

const BF_ARCHER_AT = 170;        // the lone archer climbs out of the turret
const BF_DRAW_AT = 205;          // ...draws his bow
const BF_FIRE_AT = 245;          // ...and fires
const BF_STORY_DELAY = 20;       // frames after the arrow strikes before the storybook picture comes up
const BF_STORY_FRAMES = 300;     // how long the picture stays (the scene behind it is paused; can't be skipped)
const BF_STORY_CAPTION = 'The arrow found his heart, and the chain held fast.';
const deathArrowImg = new Image(); deathArrowImg.src = 'assets/images/deatharrow.jpg';

let bossFall = null;

// the storybook picture of the arrow striking him (drawn by render() in place of the scene)
function bossFallStory() { return bossFallCinematic() && bossFall.story; }
function drawBossFallStory() {
  drawStoryPicture(deathArrowImg, BF_STORY_CAPTION, bossFall.story.t, BF_STORY_FRAMES);
}

function bossFallCinematic() { return state === 'BOSS_FALL' && !!bossFall; }

function startBossFall() {
  const g = bossGeom();
  bossState.active = false;
  bossState.archers = [];
  bossState.rumbleY = 0;
  bossState.swayAmp = 0;
  bossState.roll = 0;
  bossRocks = [];
  khaleesiMounted = false;
  khaleesiBannerTimer = 0;
  invulnerableTimer = 0;
  isHoldingAction = false;
  state = 'BOSS_FALL';
  bossFall = {
    t: 0, phase: 'collapse', sink: 0, tilt: 0, pit: 0, shake: 4, rumble: 0.6,
    archer: null, arrow: null, hitT: -1, fade: 0,
    from: { x: dragon.x, y: dragon.y },
    bx: bossState.x, cave: null
  };
  sound.collapseBoom();
  sound.towerDestroy();
}

// Where the pit is: under the whole wheeled base, opening out from the middle.
function bfPit() {
  const g = bossGeom();
  const cx = bossFall.bx + g.bw / 2;
  const half = (g.bw / 2 + g.over + 26) * bossFall.pit;
  return { l: cx - half, r: cx + half, cx: cx, gY: g.gY };
}

// The lone archer stands on the turret roof, which sinks with the tower.
function bfArcherPos() {
  const g = bossGeom();
  return { x: bossFall.bx + g.bw * 0.22, feetY: bossFall.sink };
}
// a point on the sinking, tilting tower (tower coordinates: turret roof at y = 0) -> screen
function bfTowerToScreen(x, y) {
  const g = bossGeom();
  const cx = bossFall.bx + g.bw / 2, gY = g.gY;
  const lx = x - cx, ly = y - gY + bossFall.sink;
  const c = Math.cos(bossFall.tilt), s = Math.sin(bossFall.tilt);
  return { x: cx + lx * c - ly * s, y: gY + lx * s + ly * c };
}
function bfArcherHand() {
  const a = bfArcherPos();
  return bfTowerToScreen(a.x - 11, -20);
}
function bfChest() {
  const rot = bossFall.drot || 0;
  const ox = 5, oy = 9;
  const c = Math.cos(rot), s = Math.sin(rot);
  return { x: dragon.x + ox * c - oy * s, y: dragon.y + ox * s + oy * c };
}

function updateBossFall() {
  const B = bossFall;
  if (!B) return;
  // the storybook picture: everything else waits (B.t stands still, so the drag picks up where it left off)
  if (B.story) {
    B.story.t++;
    if (B.story.t >= BF_STORY_FRAMES) { B.story = null; B.storyDone = true; }
    return;
  }
  if (B.hitT >= 0 && !B.storyDone && B.t >= B.hitT + BF_STORY_DELAY) { B.story = { t: 0 }; B.rumble = 0; return; }
  B.t++;
  const g = bossGeom();
  const t = B.t;
  B.shake *= 0.96;

  if (B.phase === 'collapse' || B.phase === 'drag') {
    // the ground opens, the tower sinks: quickly at first, slowly while the archer shoots, then it plunges
    B.pit = Math.min(1, Math.max(0, (t - 30) / 50));
    let target;
    if (t < BF_ARCHER_AT) target = height * 0.32 * Math.pow(Math.max(0, (t - 50) / (BF_ARCHER_AT - 50)), 1.4);
    else if (B.hitT < 0 || t < B.hitT + 30) target = height * 0.32 + (t - BF_ARCHER_AT) * 0.12;
    else target = B.sink + Math.min(6, (t - B.hitT - 30) * 0.12);   // the plunge, slow enough that the chain hauls him down after it
    B.sink = Math.max(B.sink, target);
    B.tilt = Math.min(0.07, B.sink / height * 0.09);
    B.rumble = t < BF_ARCHER_AT ? 0.6 : (B.hitT > 0 && t > B.hitT + 30 ? 0.7 : 0.3);
    if (t % 40 === 0 && t < 400) { B.shake = Math.max(B.shake, 5); sound.towerDestroy(); }
    // stones breaking off and tumbling into the pit, smoke pouring up
    if (B.pit > 0.2 && Math.random() < 0.5) {
      const P = bfPit();
      blackDebris.push({
        x: P.l + Math.random() * (P.r - P.l), y: g.gY - 10 - Math.random() * height * 0.5,
        vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, gravity: 0.3,
        rotation: Math.random() * 6, rotSpeed: (Math.random() - 0.5) * 0.3, size: 5 + Math.random() * 9
      });
    }
    if (B.pit > 0.1 && Math.random() < 0.7) {
      const P = bfPit();
      particles.push({
        x: P.l + Math.random() * (P.r - P.l), y: g.gY,
        vx: (Math.random() - 0.5) * 1.5, vy: -1.2 - Math.random() * 1.8,
        size: 10 + Math.random() * 16, life: 50 + Math.random() * 30,
        color: Math.random() < 0.3 ? 'rgba(60,40,30,0.5)' : 'rgba(40,40,45,0.55)', isSmoke: true
      });
    }
  }

  // Cyndraxx hovers, watching, until the arrow strikes
  if (B.hitT < 0) {
    const hx = width * 0.24, hy = height * 0.33;
    dragon.x += (hx - dragon.x) * 0.03;
    dragon.y += (hy + Math.sin(t * 0.06) * 8 - dragon.y) * 0.05;
    dragon.velocity = 0;
    if (t % 22 === 0) { dragon.wingState = 1; sound.flap(); }
  }

  // the lone archer
  if (t === BF_ARCHER_AT) B.archer = { t: 0 };
  if (B.archer) B.archer.t++;
  if (t === BF_FIRE_AT) {
    const h = bfArcherHand();
    B.arrow = { x: h.x, y: h.y, ang: Math.PI, stuck: false };
    sound.arrowLaunch();
    sound.chainRattle(0.7);
  }
  if (B.arrow && !B.arrow.stuck) {
    const c = bfChest();
    const dx = c.x - B.arrow.x, dy = c.y - B.arrow.y, d = Math.hypot(dx, dy);
    B.arrow.ang = Math.atan2(dy, dx);
    if (d < 16) {
      B.arrow.stuck = true;
      B.hitT = t;
      B.phase = 'drag';
      B.shake = 9;
      sound.pierceHit();
      dragon.wingState = 0;
      for (let i = 0; i < 26; i++) {
        particles.push({
          x: c.x, y: c.y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.7) * 6,
          size: 2 + Math.random() * 3, life: 20 + Math.random() * 20, color: Math.random() < 0.6 ? '#c0182c' : '#ff6b6b'
        });
      }
    } else {
      B.arrow.x += dx / d * 17;
      B.arrow.y += dy / d * 17;
    }
  }

  // pulled down after the tower
  if (B.phase === 'drag') {
    const since = t - B.hitT;
    B.drot = (B.drot || 0) + (since < 30 ? 0.01 : 0.05);
    if (since === 30) sound.chainRattle(1.2);
    if (since > 30) {
      const h = bfArcherHand();
      const reach = Math.max(40, 180 - (since - 30) * 2.2);   // the chain reels him in
      const dx = h.x - dragon.x, dy = h.y - dragon.y, d = Math.hypot(dx, dy);
      if (d > reach) {
        dragon.x += dx / d * Math.min(d - reach, 9);
        dragon.y += dy / d * Math.min(d - reach, 9);
      }
      if (since % 18 === 0) dragon.wingState = 0.6;   // a weak, useless flap
    } else {
      dragon.y += Math.sin(since * 0.5) * 0.8;        // the shock of it
    }
    if (dragon.y > g.gY + 30 || since > 200) {
      B.fade = Math.min(1, B.fade + 1 / 30);
      if (B.fade >= 1) {
        B.phase = 'cavern';
        B.cave = { t: 0, fall: 0, bio: 0, stream: [], cells: bfTowerCells(), pieces: [] };
        dragon.wingState = 0;
      }
    }
  }

  if (B.phase === 'cavern') updateBfCavern(B);
  else if (B.phase === 'floor') updateBfFloor(B);
}

// ---- falling through the cavern, anchored by the chain to the burning tower below ----
const BF_FALL_LEN = 600;         // frames of the fall
const BF_IMPACT_LEN = 80;        // the tower hits the cavern floor, then Cyndraxx does
const BF_TOWER_SCALE = 0.6;      // the tower is drawn a little smaller in the cavern

// The tower breaks apart on the way down: it is cut into a grid of blocks (tower coordinates, turret roof
// at y = 0) that tear loose one by one and drift up past him. The block holding the chain's anchor ring
// never breaks off, so he is always visibly chained to what is left of the tower.
const BF_BREAK_FIRST = 70;       // cavern frame of the first break
const BF_BREAK_LAST = BF_FALL_LEN - 70;
const BF_PIECE_LIFE = 150;
function bfAnchorLocal() {       // the iron ring on the turret roof the chain is fastened to
  const g = bossGeom();
  return { x: bossFall.bx + g.bw * 0.22, y: -10 };
}
function bfTowerCells() {
  const g = bossGeom(), bx = bossFall.bx;
  const xs = [bx - g.over - 50, bx + g.bw * 0.36, bx + g.bw * 0.68, bx + g.bw + g.over + 50];
  const ys = [-160, g.turretH, (g.turretH + g.baseTop) / 2, g.deckTop - 8, g.gY + 16];
  const an = bfAnchorLocal();
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const cell = { x: xs[c], y: ys[r], w: xs[c + 1] - xs[c], h: ys[r + 1] - ys[r], r: r, c: c, loose: false };
    cell.anchor = an.x >= cell.x && an.x < cell.x + cell.w && an.y >= cell.y && an.y < cell.y + cell.h;
    cells.push(cell);
  }
  // break order: the wheels and deck first, working up; the anchor block never goes
  const order = cells.filter(k => !k.anchor).sort((a, b) => (b.r - a.r) || (hash2(a.c, a.r * 7 + 3) - hash2(b.c, b.r * 7 + 3)));
  order.forEach((k, i) => { k.breakAt = Math.round(BF_BREAK_FIRST + (BF_BREAK_LAST - BF_BREAK_FIRST) * i / Math.max(1, order.length - 1)); });
  return cells;
}
function updateBfPieces(B, X) {
  const C = B.cave;
  C.cells.forEach(k => {
    if (k.loose || k.breakAt === undefined || C.t !== k.breakAt) return;
    k.loose = true;
    const away = k.c === 1 ? (hash2(k.r, 5) < 0.5 ? -1 : 1) : (k.c === 0 ? -1 : 1);
    C.pieces.push({ cell: k, dx: 0, dy: 0, vx: away * (0.6 + Math.random() * 1.4), vy: -0.5 - Math.random(), rot: 0, vr: away * (0.01 + Math.random() * 0.025), age: 0 });
    B.shake = Math.max(B.shake, 3);
    if (k.r === 3 || k.r === 0) sound.towerDestroy(); else sound.knightHit();
    // a burst of embers and fire where it tore loose
    const p = bfCavernToScreen(X, k.x + k.w / 2, k.y + k.h / 2);
    for (let i = 0; i < 14; i++) {
      C.stream.push({ k: i % 4 ? 'ember' : 'flame', x: p.x + (Math.random() - 0.5) * k.w * X.sc, y: p.y + (Math.random() - 0.5) * k.h * X.sc,
        vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 5, s: i % 4 ? 2 : 10 + Math.random() * 10, life: 50 });
    }
  });
  for (let i = C.pieces.length - 1; i >= 0; i--) {
    const p = C.pieces[i];
    p.age++;
    p.vy -= 0.11;                // it falls slower than the tower, so it drifts up past him
    p.dx += p.vx; p.dy += p.vy; p.rot += p.vr;
    if (p.age > BF_PIECE_LIFE) C.pieces.splice(i, 1);
  }
}

function bfCavernDragonSpot(t) {
  return { x: width * 0.5 + Math.sin(t * 0.017) * 22, y: height * 0.27 + Math.sin(t * 0.03) * 8 };
}

function updateBfCavern(B) {
  const C = B.cave;
  C.t++;
  B.rumble = 0;
  const falling = C.t < BF_FALL_LEN;
  C.fall += falling ? 7 : Math.max(0, 7 - (C.t - BF_FALL_LEN) * 0.3);
  C.bio = Math.max(0, Math.min(1, (C.t - 160) / 320));      // the glow creeps in out of the darkness
  B.drot = Math.sin(C.t * 0.02) * 0.25 + 0.35;
  if (C.t % 130 === 70 && C.bio > 0.2) sound.magicShimmer(0.9, 0.12 * C.bio);
  const spot = bfCavernDragonSpot(C.t);
  if (C.cells) updateBfPieces(B, bfCavernTowerXform(bfCavernDragonSpot(Math.min(C.t, BF_FALL_LEN)), C.t));
  // fire, embers, burning timbers and stones streaming up past him from the tower below
  if (falling) {
    const tx = spot.x, ty = spot.y + 120;
    for (let i = 0; i < 4; i++) C.stream.push({ k: 'ember', x: tx + (Math.random() - 0.5) * width * 0.55, y: ty + 20 + Math.random() * height * 0.7, vx: (Math.random() - 0.5) * 1.2, vy: -7 - Math.random() * 8, s: 1.5 + Math.random() * 2, life: 120 });
    if (Math.random() < 0.45) C.stream.push({ k: 'flame', x: tx + (Math.random() - 0.5) * width * 0.4, y: ty + 30 + Math.random() * 60, vx: (Math.random() - 0.5) * 1.5, vy: -3 - Math.random() * 4, s: 10 + Math.random() * 14, life: 70 });
    if (Math.random() < 0.12) C.stream.push({ k: 'chunk', x: tx + (Math.random() - 0.5) * width * 0.6, y: height + 30, vx: (Math.random() - 0.5) * 1.5, vy: -4 - Math.random() * 5, s: 7 + Math.random() * 10, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, life: 260 });
    if (Math.random() < 0.3) C.stream.push({ k: 'smoke', x: tx + (Math.random() - 0.5) * width * 0.5, y: ty + 40, vx: (Math.random() - 0.5), vy: -2.5 - Math.random() * 2, s: 18 + Math.random() * 20, life: 90 });
  }
  for (let i = C.stream.length - 1; i >= 0; i--) {
    const p = C.stream[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.rot !== undefined) p.rot += p.vr;
    if (!falling) { p.vy *= 0.93; p.vx *= 0.95; }
    if (p.life <= 0 || p.y < -60) C.stream.splice(i, 1);
  }
  // the floor: the tower smashes into it, then Cyndraxx slams down among the wreckage
  if (C.t === BF_FALL_LEN) {
    B.shake = 14;
    sound.collapseBoom();
    sound.towerDestroy();
    for (let i = 0; i < 40; i++) {
      C.stream.push({ k: i % 3 ? 'ember' : 'flame', x: spot.x + (Math.random() - 0.5) * width * 0.8, y: height * 0.85, vx: (Math.random() - 0.5) * 9, vy: -3 - Math.random() * 9, s: i % 3 ? 2 : 14 + Math.random() * 14, life: 60 });
    }
  }
  if (C.t === BF_FALL_LEN + 62) { B.shake = 8; sound.hit(); sound.knightHit(); }
  if (C.t >= BF_FALL_LEN + BF_IMPACT_LEN) startBfFloor(B);
}

// ---- on the cavern floor: his last dream, his death, the dark, Brown Jenkins ----
const BF_DREAM_FRAMES = 360;
const BF_DREAM_CAPTION = 'Cyndraxx dreams of Sarai...';
const BF_DEATH_FRAMES = 680;
// his heart in the death scene: frame of each beat and how loud (they slow and fade, then stop)
const BF_BEATS = [[0, 1], [52, 0.92], [110, 0.82], [178, 0.7], [258, 0.56], [352, 0.4], [466, 0.24]];
const BF_SPASMS = [128, 214];         // his body convulses
const BF_RATTLE_AT = 300;             // the last breath leaves him
const BF_DEAD_AT = 330;               // his eye goes dull: he is gone
const BF_ZOOM_AT = 400;               // the view sinks slowly in on the dead eye...
const BF_IRIS_AT = 540;               // ...and the dark closes in on it
function bossFallSilent() {           // no music while he dies (audio.js)
  const s = bossFall && bossFall.phase === 'floor' && bfStep();
  return !!(s && (s.act === 'death' || s.act === 'black'));
}
const BF_JENK_ACCEPT = { id: 'accept', label: 'ACCEPT', col: '#6c3fa0', edge: '#3f2266' };
const BF_JENK_REJECT = { id: 'reject', label: 'REJECT', col: '#c0392b', edge: '#7f241b' };
const BF_LINES = {
  failed: 'I have failed you, Sarai.',
  die: 'I am going to die down here in the dark. I will never see you again.',
  fly: 'If only I could fly free with you once more, over the fields of wildflowers...',
  sarai: 'Sarai...',
  j1: 'Brown Jenkins is here to help you, dragon. Brown Jenkins is the adjudicator of Nyarlathotep.',
  j2: 'Brown Jenkins will save you, but there is a price. Nyarlathotep\'s price.',
  j3: 'Now you owe Nyarlathotep, little dragon. You owe a debt.',
  c1: 'What must I do?',
  j4: 'The Great Old Ones seek entrance to your plane. They require worshippers, supplicants.',
  j5: 'They feed on their fear and call it sin and forgiveness. They call it purity.',
  j6: 'Nyarlathotep has an undying enemy, a mindless predator that calls itself the Angel that Weeps.',
  c2: 'The Angel that Weeps?',
  j7: 'That creature is no angel. It is a mask, a deception. It is a gibbering horror that seeks only to devour, and implant its seed in mortals.',   // Brown Jenkins never uses contractions
  j8: 'It grows inside of Clement the Simple.',
  c3: 'Clement the Simple. That priest. He offers forgiveness for sins, but he\'s just finding new hosts for the seed of the Angel that Weeps.',
  c4: 'He\'s too powerful. How do I kill him?',
  j9: 'Nyarlathotep will grant you power when the time comes. You made a deal, Cyndraxx.'
};

function bfFloorSteps() {
  return [
    { act: 'lie', frames: 110 },
    { say: 'CYN', text: BF_LINES.failed },
    { say: 'CYN', text: BF_LINES.die },
    { say: 'CYN', text: BF_LINES.fly },
    { say: 'CYN', text: BF_LINES.sarai },
    { act: 'dream', frames: BF_DREAM_FRAMES },   // his last dream: Sarai, in the soft circle of memory
    { act: 'death', frames: BF_DEATH_FRAMES },   // torn out of it; his heart slows and stops
    { act: 'black', frames: 170 },
    { act: 'dimIn', frames: 150 },               // the cave again: he lies dead
    { act: 'jenkins', frames: 170 },
    { say: 'JENK', text: BF_LINES.j1 },
    { say: 'JENK', text: BF_LINES.j2, choice: [BF_JENK_ACCEPT, BF_JENK_REJECT] }
  ];
}
function bfAcceptSteps() {
  return [
    { act: 'heal', frames: 220 },
    { act: 'heart', frames: 230 },
    { say: 'JENK', text: BF_LINES.j3 },
    { say: 'CYN', text: BF_LINES.c1 },
    { say: 'JENK', text: BF_LINES.j4 },
    { say: 'JENK', text: BF_LINES.j5 },
    { say: 'JENK', text: BF_LINES.j6 },
    { say: 'CYN', text: BF_LINES.c2 },
    { say: 'JENK', text: BF_LINES.j7 },
    { say: 'JENK', text: BF_LINES.j8 },
    { say: 'CYN', text: BF_LINES.c3 },
    { say: 'CYN', text: BF_LINES.c4 },
    { say: 'JENK', text: BF_LINES.j9 },
    { act: 'leave', frames: 110 },
    { act: 'toCave', frames: 70 },
    { act: 'startCave', frames: 1 }
  ];
}
function bfRejectSteps() {
  return [
    { act: 'rejectFade', frames: 100 },
    { act: 'gameOver', frames: 1 }
  ];
}

function startBfFloor(B) {
  B.phase = 'floor';
  const W = width, H = height;
  const floorY = H * 0.8;
  B.floor = {
    steps: bfFloorSteps(), i: 0, t: 0, clock: 0, typed: 0, buttons: null,
    floorY: floorY, blood: 0, fire: 1, asleep: false, arrowA: 1, jx: W + 40, jPose: 'walk', jA: 1, wing: 0,
    dragon: { x: W * 0.4, y: floorY - 12, rot: 0.22 },
    wreck: []
  };
  // the burning wreckage of the tower all around him
  const kinds = [[0.1, 'timber'], [0.22, 'stone'], [0.6, 'stone'], [0.7, 'timber'], [0.9, 'stone'], [0.04, 'stone']];
  kinds.forEach(([fx, k], i) => B.floor.wreck.push({ x: W * fx, k: k, s: 12 + (i * 7) % 12, rot: (i * 1.3) % 1 - 0.5, seed: i * 2.1 }));
  B.floor.wreck.push({ x: W * 0.82, k: 'turret', s: 40, rot: -0.25, seed: 9 });
  dragon.wingState = 0;
}

function bfStep() { return bossFall && bossFall.floor && bossFall.floor.steps[bossFall.floor.i]; }

function bfNext() {
  const F = bossFall.floor;
  F.i++; F.t = 0; F.typed = 0; F.buttons = null;
  const s = bfStep();
  if (!s) return;
  if (s.act === 'heal') { sound.magicShimmer(2.4, 0.3); sound.teleportWhoosh(); }
  else if (s.act === 'heart') {
    maxLives = Math.min(CATH_MAX_LIVES, maxLives + 1);
    lives = maxLives;
    updateHeartsDisplay();
    sound.powerup(); sound.heartPickup();
  }
  else if (s.act === 'startCave') { bossFall = null; startCaveLevel(1); }
  else if (s.act === 'gameOver') {
    bossFall = null;
    jenkinsRejected = true;
    lives = 0;
    updateHeartsDisplay();
    state = 'GAMEOVER';
    updateLevelBadgeUI();
  }
}

function updateBfFloor(B) {
  const F = B.floor;
  const s = bfStep();
  if (!s) return;
  F.t++; F.clock++;
  if (s.say) F.typed = Math.min(s.text.length, F.typed + 1.15);
  if (s.act === 'lie' || (s.say && F.i < 5)) F.blood = Math.min(1, F.blood + 0.006);
  if (s.act === 'death') {
    const T = F.t;
    F.blood = Math.min(1.6, F.blood + 0.0012);
    BF_BEATS.forEach(([at, v]) => { if (T === at) sound.heartbeat(v); });
    if (BF_SPASMS.indexOf(T) >= 0) { F.spasm = 14; F.wing = 1; F.spurt = 1; sound.hit(); }
    if (T === BF_RATTLE_AT) sound.deathRattle();
    if (T === BF_DEAD_AT) F.dead = true;
    if (T > 200) F.fire = Math.max(0.2, F.fire - 0.0022);          // the fires gutter
    F.lifeDim = Math.min(0.85, Math.max(0, (T - 260) / 300));     // the glow above dies away
  }
  if (F.spasm > 0) F.spasm--;
  if (F.spurt > 0) F.spurt = Math.max(0, F.spurt - 0.03);
  if (s.act === 'black') { F.fire = 0.25; F.blood = 1.6; F.dead = true; F.lifeDim = 0.85; }
  if (s.act === 'dimIn') F.lifeDim = Math.max(0.35, 0.85 - F.t / 150 * 0.5);
  if (s.act === 'jenkins') {
    const target = width * 0.7;
    if (F.jx > target) { F.jx = Math.max(target, F.jx - 2.2); F.jPose = 'walk'; }
    else F.jPose = 'sit';
  }
  if (s.act === 'heal') {
    F.arrowA = Math.max(0, 1 - F.t / 140);
    F.blood = Math.max(0, F.blood - 0.008);
    if (F.t === 90) F.dead = false;                                  // life comes back into his eye
    F.lifeDim = Math.max(0, (F.lifeDim || 0) - 0.01);
    F.fire = Math.min(1, F.fire + 0.006);
    if (F.t === 150) { F.wing = 1; sound.flap(); }
  }
  if (s.act === 'heart') F.dragonUp = Math.min(1, (F.dragonUp || 0) + 0.04);
  if (s.act === 'leave') { F.jPose = 'walk'; F.jx += 2.6; F.jA = Math.max(0, 1 - F.t / 90); }
  F.wing *= 0.9;
  if (!s.say && F.t >= s.frames) bfNext();
}

function bossFallTap(x, y) {
  const B = bossFall;
  if (!B) return;
  // the collapse, the chain arrow, the drag and the fall through the cavern can't be skipped
  if (B.phase !== 'floor') return;
  const F = B.floor, s = bfStep();
  if (!s) return;
  if (s.say) {
    if (F.typed < s.text.length) { F.typed = s.text.length; return; }
    if (s.choice) {
      if (x === undefined || !F.buttons) return;
      const hit = F.buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (!hit) return;
      sound.score();
      F.steps = F.steps.slice(0, F.i + 1).concat(hit.id === 'accept' ? bfAcceptSteps() : bfRejectSteps());
      bfNext();
      return;
    }
    bfNext();
    return;
  }
  // (his last dream, his death and the black after it can't be skipped)
  const skippable = { lie: 30, dimIn: 60, jenkins: 40, heal: 60, heart: 70, leave: 30 };
  if (skippable[s.act] !== undefined && F.t > skippable[s.act]) {
    if (s.act === 'jenkins') { F.jx = width * 0.7; F.jPose = 'sit'; }
    if (s.act === 'heal') { F.arrowA = 0; F.blood = 0; F.dead = false; F.lifeDim = 0; F.fire = 1; }
    bfNext();
  }
}

// keys at the choice: A = accept, R = reject
function bossFallKey(code) {
  const s = bfStep();
  if (!s || !s.choice || bossFall.floor.typed < s.text.length) return false;
  if (code !== 'KeyA' && code !== 'KeyR') return false;
  const F = bossFall.floor;
  F.steps = F.steps.slice(0, F.i + 1).concat(code === 'KeyA' ? bfAcceptSteps() : bfRejectSteps());
  bfNext();
  return true;
}

// Rejecting Brown Jenkins: the game-over screen's CONTINUE goes straight to level 4 (no caves).
let jenkinsRejected = false;
function finishBossFall() {
  bossFall = null;
  jenkinsRejected = false;
  blackDebris = [];
  particles = [];
  flames = [];
  arrows = [];
  dragon.x = dragon.baseX;
  dragon.y = height * 0.4;
  dragon.velocity = 0;
  dragon.wingState = 0;
  currentLevel = 4;
  levelTimerSeconds = 0;
  lives = maxLives;
  updateHeartsDisplay();
  updateLevelBadgeUI();
  levelDialogueType = 'BOSS_CLEAR';
  state = 'LEVEL_DIALOGUE';
}

function bossFallRumble() { return bossFall ? bossFall.rumble : 0; }
function bossFallShake() {
  if (!bossFall || bossFall.story || bossFall.phase === 'cavern' || bossFall.shake < 0.3) return null;
  const s = bossFall.shake;
  return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
}

// ================= drawing =================

// A chain of steel links along a sagging curve from (x1,y1) to (x2,y2).
function drawChainLinks(x1, y1, x2, y2, sag) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
  const len = Math.hypot(x2 - x1, y2 - y1) + Math.abs(sag);
  const n = Math.max(2, Math.floor(len / 6));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const u = i / n, u2 = (i + 1) / n;
    const px = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2;
    const py = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2;
    const qx = (1 - u2) * (1 - u2) * x1 + 2 * (1 - u2) * u2 * mx + u2 * u2 * x2;
    const qy = (1 - u2) * (1 - u2) * y1 + 2 * (1 - u2) * u2 * my + u2 * u2 * y2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(qy - py, qx - px));
    ctx.strokeStyle = '#2a2d33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (i % 2) ctx.ellipse(3, 0, 4, 2.2, 0, 0, Math.PI * 2); else ctx.ellipse(3, 0, 4, 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#9aa3ad';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// The arrow: shaft, iron head, fletching. (x, y) is the tip; `inside` hides the part buried in his chest.
function drawChainArrow(x, y, ang, inside) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const shaft = 30;
  ctx.fillStyle = '#2a1a0c';
  ctx.fillRect(-shaft - 1, -2.4, shaft - (inside ? 10 : 0) + 2, 4.8);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(-shaft, -1.6, shaft - (inside ? 10 : 0), 3.2);
  if (!inside) {
    ctx.fillStyle = '#c9d0d6';
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#f4f0e4';
  ctx.beginPath(); ctx.moveTo(-shaft + 2, 0); ctx.lineTo(-shaft - 9, -6); ctx.lineTo(-shaft + 5, 0); ctx.lineTo(-shaft - 9, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7f8790';                     // iron ring the chain is fastened to
  ctx.fillRect(-shaft - 2, -2, 4, 4);
  ctx.restore();
}
function bfArrowTail(arrow) {
  return { x: arrow.x - Math.cos(arrow.ang) * 32, y: arrow.y - Math.sin(arrow.ang) * 32 };
}

// Everything above ground, plus the pit (called from render() in place of renderBoss).
function drawBossFallScene() {
  const B = bossFall;
  if (!B || B.phase === 'cavern') return;
  const g = bossGeom();
  const P = bfPit();
  const gY = g.gY;
  const t = B.t;

  // the pit: a ragged black hole torn in the ground
  if (B.pit > 0) {
    ctx.fillStyle = '#050304';
    ctx.beginPath();
    ctx.moveTo(P.l, height);
    for (let x = P.l; x <= P.r; x += 8) ctx.lineTo(x, gY - 2 + hash2(Math.floor(x / 8), 9) * 6);
    ctx.lineTo(P.r, height);
    ctx.closePath();
    ctx.fill();
  }

  // the tower sinking (clipped so what's below ground only shows inside the pit)
  const clip = () => {
    ctx.beginPath();
    ctx.rect(0, 0, width, gY + 2);
    if (B.pit > 0) ctx.rect(P.l, gY, P.r - P.l, height - gY);
    ctx.clip();
  };
  ctx.save();
  clip();
  ctx.save();
  ctx.translate(P.cx, gY);
  ctx.rotate(B.tilt);
  ctx.translate(-P.cx, -gY + B.sink);
  bossState.x = B.bx;
  renderBoss();
  // the whole tower is ablaze as it goes down
  for (let i = 0; i < 7; i++) {
    const fx = B.bx + g.bw * (0.1 + i * 0.13);
    const fy = g.turretH * (0.4 + (i % 3) * 0.7);
    drawFlame(fx, fy, 26 + (i % 2) * 10, 46 + (i % 3) * 14, i * 1.7);
  }
  // the lone archer climbs out of the turret hatch
  if (B.archer) {
    const a = bfArcherPos();
    const k = Math.min(1, B.archer.t / 30);
    const feet = 0 + (1 - k) * 26;            // in tower coordinates the turret roof is y = 0
    ctx.save();
    ctx.beginPath(); ctx.rect(a.x - 30, -80, 60, 80); ctx.clip();
    const pose = t >= BF_FIRE_AT ? 'ready' : (t >= BF_DRAW_AT ? 'draw' : 'walk');
    bossArcherSprite(a.x, feet, pose, t * 0.2, 1.5, 1);
    ctx.restore();
  }
  ctx.restore();

  // the chain and arrow
  if (B.arrow) {
    const h = bfArcherHand();
    const tail = bfArrowTail(B.arrow);
    const taut = B.phase === 'drag' && t - B.hitT > 30;
    drawChainLinks(h.x, h.y, tail.x, tail.y, taut ? 4 : 26);
    if (!B.arrow.stuck) drawChainArrow(B.arrow.x, B.arrow.y, B.arrow.ang, false);
  }

  // Cyndraxx (from here on he can disappear into the pit too)
  const rot = B.drot || 0;
  drawDragon(dragon.x, dragon.y, rot);
  if (B.arrow && B.arrow.stuck) {
    const c = bfChest();
    B.arrow.x = c.x + Math.cos(B.arrow.ang) * 6;
    B.arrow.y = c.y + Math.sin(B.arrow.ang) * 6;
    drawChainArrow(B.arrow.x, B.arrow.y, B.arrow.ang, true);
  }
  ctx.restore();

  // the depths of the pit swallow everything
  if (B.pit > 0) {
    const gr = ctx.createLinearGradient(0, gY, 0, height);
    gr.addColorStop(0, 'rgba(5,3,4,0.15)');
    gr.addColorStop(0.5, 'rgba(5,3,4,0.85)');
    gr.addColorStop(1, 'rgba(5,3,4,1)');
    ctx.fillStyle = gr;
    ctx.fillRect(P.l, gY, P.r - P.l, height - gY);
    // fire licking up around the rim
    for (let i = 0; i < 6; i++) {
      const fx = P.l + (P.r - P.l) * (i + 0.5) / 6;
      drawFlame(fx, gY + 6, 30, 38 + Math.sin(t * 0.1 + i) * 10, i * 2.3, Math.min(1, B.pit * 1.5));
    }
    // crumbling lip
    ctx.fillStyle = '#3a2a1e';
    for (let x = P.l - 10; x < P.r + 10; x += 9) {
      if (hash2(Math.floor(x), 4) < 0.5) ctx.fillRect(x, gY - 3 + hash2(Math.floor(x), 6) * 4, 5, 4);
    }
  }

  // the moment the arrow strikes: a red flash and a cracked heart
  if (B.hitT >= 0) {
    const since = t - B.hitT;
    if (since < 24) {
      ctx.fillStyle = 'rgba(170,0,20,' + (0.45 * (1 - since / 24)) + ')';
      ctx.fillRect(0, 0, width, height);
    }
    if (since < 90) {
      const a = since < 15 ? since / 15 : Math.max(0, 1 - (since - 50) / 40);
      const c = bfChest();
      const s = 34 + since * 0.3;
      const hx = c.x, hy = c.y - 54 - since * 0.4;
      ctx.save();
      ctx.globalAlpha = a;
      heartPath(hx, hy, s);
      ctx.fillStyle = '#d61f3a';
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffd1d8'; ctx.stroke();
      ctx.strokeStyle = '#2a0508';
      ctx.lineWidth = 3;
      ctx.beginPath();                                  // the crack
      ctx.moveTo(hx, hy - s * 0.3); ctx.lineTo(hx - 5, hy - s * 0.1); ctx.lineTo(hx + 4, hy + s * 0.05); ctx.lineTo(hx - 3, hy + s * 0.25);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (B.fade > 0) {
    ctx.fillStyle = 'rgba(0,0,0,' + B.fade + ')';
    ctx.fillRect(0, 0, width, height);
  }
}

// ---- the cavern ----
const BF_JELLIES = 5;
const BF_PATTERN_LEN = 300;     // frames per neon pattern (wave, chase, rainbow)

function bfNeon(i, y, t) {
  // three flashing patterns that take turns: a wave rolling down, a chase from creature to creature, a rainbow pulse
  const pat = Math.floor(t / BF_PATTERN_LEN) % 3;
  if (pat === 0) return 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.09 - y * 0.012));
  if (pat === 1) return ((Math.floor(t / 7) % BF_JELLIES) === i || (Math.floor(t / 7) + 5) % BF_JELLIES === i) ? 1 : 0.3;
  return 0.5 + 0.5 * Math.sin(t * 0.06 + i * 0.9);
}

function drawJelly(x, y, r, hue, glow, t, i) {
  const pulse = 1 + Math.sin(t * 0.07 + i) * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  aura.addColorStop(0, 'hsla(' + hue + ',100%,60%,' + 0.35 * glow + ')');
  aura.addColorStop(1, 'hsla(' + hue + ',100%,50%,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  // tentacles drifting below
  ctx.strokeStyle = 'hsla(' + ((hue + 30) % 360) + ',100%,70%,' + (0.25 + 0.45 * glow) + ')';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    const sx = x - r * 0.75 + (k / 5) * r * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    for (let s = 1; s <= 10; s++) {
      ctx.lineTo(sx + Math.sin(t * 0.05 + s * 0.6 + k) * (2 + s * 0.6), y + s * r * 0.22);
    }
    ctx.stroke();
  }
  // the bell
  ctx.beginPath();
  ctx.ellipse(x, y, r * pulse, r * 0.75 / pulse, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(x, y + r * 0.25, x - r * pulse, y);
  const bell = ctx.createRadialGradient(x, y - r * 0.4, 1, x, y - r * 0.2, r * 1.1);
  bell.addColorStop(0, 'hsla(' + hue + ',100%,85%,' + (0.5 + 0.5 * glow) + ')');
  bell.addColorStop(1, 'hsla(' + hue + ',100%,45%,' + 0.25 * glow + ')');
  ctx.fillStyle = bell;
  ctx.fill();
  // glowing spots on the bell
  ctx.fillStyle = 'hsla(' + ((hue + 180) % 360) + ',100%,80%,' + glow + ')';
  for (let k = 0; k < 4; k++) ctx.fillRect(x - r * 0.5 + k * r * 0.33, y - r * 0.35 - (k % 2) * r * 0.15, 2, 2);
  ctx.restore();
}

function drawMushroom(x, y, s, hue, glow, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.rotate(flip ? 0.25 : 0.25);
  ctx.fillStyle = 'hsla(' + hue + ',60%,' + (35 + 25 * glow) + '%,1)';
  ctx.fillRect(-s * 0.12, -s, s * 0.24, s);                        // stem
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(0, -s, 0, 0, -s, s * 2.2);
  gl.addColorStop(0, 'hsla(' + hue + ',100%,60%,' + 0.45 * glow + ')');
  gl.addColorStop(1, 'hsla(' + hue + ',100%,50%,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-s * 2.2, -s * 3.2, s * 4.4, s * 4.4);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();                                                 // cap
  ctx.ellipse(0, -s, s * 0.6, s * 0.38, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = 'hsla(' + hue + ',100%,' + (45 + 30 * glow) + '%,1)';
  ctx.fill();
  ctx.fillStyle = 'hsla(' + ((hue + 60) % 360) + ',100%,90%,' + (0.6 + 0.4 * glow) + ')';
  ctx.fillRect(-s * 0.3, -s * 1.2, 2, 2);
  ctx.fillRect(s * 0.1, -s * 1.28, 2, 2);
  ctx.fillRect(s * 0.32, -s * 1.12, 2, 2);
  ctx.restore();
}

// a rock wall down one side, its edge wandering in and out; mushrooms grow on its ledges
function bfWallEdge(side, worldY) {
  const n = Math.sin(worldY * 0.008 + side * 3) * 0.5 + Math.sin(worldY * 0.021 + side) * 0.3 + hash2(Math.floor(worldY / 40), side * 7) * 0.2;
  return width * (0.1 + 0.08 * n);
}

// a glowing winged creature flitting through the dark
function drawGlowFlyer(x, y, hue, t, i, a) {
  const flap = Math.sin(t * 0.4 + i) * 0.8;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(x, y, 0, x, y, 22);
  gl.addColorStop(0, 'hsla(' + hue + ',100%,70%,0.6)');
  gl.addColorStop(1, 'hsla(' + hue + ',100%,50%,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(x - 22, y - 22, 44, 44);
  ctx.fillStyle = 'hsla(' + hue + ',100%,75%,0.75)';
  [-1, 1].forEach(sd => {
    ctx.beginPath();
    ctx.ellipse(x + sd * 6, y - 2, 7, 3 + flap * 2, sd * (0.5 + flap * 0.4), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'hsla(' + ((hue + 40) % 360) + ',100%,90%,1)';
  ctx.fillRect(x - 1.5, y - 4, 3, 8);
  ctx.restore();
}

// the bioluminescent life of the cavern, fading in with `bio` (0..1)
function drawCavernLife(t, scroll, bio, flyers) {
  if (bio <= 0) return;
  const W = width, H = height;
  const period = H * 1.6;
  ctx.save();
  ctx.globalAlpha = bio;
  for (let i = 0; i < BF_JELLIES; i++) {
    const baseY = hash2(i, 21) * period;
    const y = ((baseY - scroll * 0.22) % period + period) % period - H * 0.2;
    const x = W * (0.12 + hash2(i, 23) * 0.76) + Math.sin(t * 0.01 + i) * 14;
    const r = 9 + hash2(i, 25) * 16;
    const hue = (hash2(i, 27) * 360 + (Math.floor(t / BF_PATTERN_LEN) % 3 === 2 ? t * 1.5 : 0)) % 360;
    drawJelly(x, y, r, hue, bfNeon(i, y, t), t, i);
  }
  ctx.restore();
  for (let i = 0; i < (flyers || 0); i++) {
    const x = ((hash2(i, 51) * W + t * (0.6 + hash2(i, 53))) % (W + 60)) - 30;
    const y = H * (0.08 + hash2(i, 55) * 0.5) + Math.sin(t * 0.03 + i * 2) * 26;
    drawGlowFlyer(x, y, Math.floor(hash2(i, 57) * 360), t, i, bio);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const y = ((hash2(i, 31) * H - scroll * 0.6) % H + H) % H;
    const x = hash2(i, 33) * W + Math.sin(t * 0.02 + i) * 8;
    ctx.fillStyle = 'hsla(' + (160 + hash2(i, 35) * 140) + ',100%,75%,' + bio * (0.3 + 0.4 * Math.sin(t * 0.1 + i)) + ')';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

// rock walls down both sides with glowing mushrooms on their ledges (alpha a)
function drawCavernWalls(t, fall, a) {
  if (a <= 0) return;
  const W = width, H = height;
  ctx.save();
  ctx.globalAlpha = a;
  [0, 1].forEach(side => {
    const edgeX = sy => side === 0 ? bfWallEdge(0, sy + fall) : W - bfWallEdge(1, sy + fall);
    ctx.beginPath();
    ctx.moveTo(side === 0 ? 0 : W, -10);
    for (let sy = -10; sy <= H + 10; sy += 10) ctx.lineTo(edgeX(sy), sy);
    ctx.lineTo(side === 0 ? 0 : W, H + 10);
    ctx.closePath();
    const wg = ctx.createLinearGradient(side === 0 ? 0 : W, 0, side === 0 ? W * 0.2 : W * 0.8, 0);
    wg.addColorStop(0, '#07080f');
    wg.addColorStop(1, '#1b2236');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let k = Math.floor(fall / 26) - 1; k < Math.floor(fall / 26) + H / 26 + 2; k++) {
      const sy = k * 26 - fall;
      const ex = edgeX(sy);
      const inset = 6 + hash2(k, side + 90) * W * 0.07;
      const rx = side === 0 ? ex - inset : ex + inset;
      ctx.fillStyle = hash2(k, side + 91) < 0.5 ? 'rgba(60,75,110,0.35)' : 'rgba(0,0,0,0.45)';
      ctx.fillRect(rx - 9, sy, 18, 4 + hash2(k, side + 92) * 6);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(110,140,200,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let sy = -10; sy <= H + 10; sy += 10) { if (sy === -10) ctx.moveTo(edgeX(sy), sy); else ctx.lineTo(edgeX(sy), sy); }
    ctx.stroke();
    const step = 70;
    const first = Math.floor(fall / step) - 1;
    for (let k = first; k < first + H / step + 3; k++) {
      if (hash2(k, side + 40) < 0.35) continue;
      const wy = k * step;
      const sy = wy - fall;
      const ex = edgeX(sy);
      const hue = [180, 300, 110, 200, 330][Math.floor(hash2(k, side + 50) * 5)];
      const glow = 0.45 + 0.55 * Math.max(0, Math.sin(t * 0.08 - wy * 0.01));
      const n = 2 + Math.floor(hash2(k, side + 60) * 3);
      for (let m = 0; m < n; m++) {
        const s = 9 + hash2(k * 3 + m, side + 70) * 12;
        drawMushroom(ex + (side === 0 ? 2 : -2) + (side === 0 ? -m * 6 : m * 6), sy + m * 7, s, (hue + m * 12) % 360, glow, side === 1);
      }
    }
  });
  ctx.restore();
}

function drawBfStream(C, front) {
  C.stream.forEach((p, i) => {
    if ((i % 3 === 0) !== front) return;
    if (p.k === 'ember') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,' + (140 + (i * 13) % 100) + ',60,' + Math.min(1, p.life / 40) + ')';
      ctx.fillRect(p.x, p.y, p.s, p.s * 3);
      ctx.restore();
    } else if (p.k === 'flame') {
      drawFlame(p.x, p.y, p.s, p.s * 1.8, i * 0.7, Math.min(1, p.life / 30));
    } else if (p.k === 'smoke') {
      ctx.fillStyle = 'rgba(30,26,28,' + Math.min(0.35, p.life / 200) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.6 - p.life / 90), 0, Math.PI * 2); ctx.fill();
    } else if (p.k === 'chunk') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = '#1c1512';
      ctx.fillRect(-p.s, -p.s * 0.55, p.s * 2, p.s * 1.1);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(-p.s, -p.s * 0.55, p.s * 2, 3);
      ctx.restore();
      drawFlame(p.x, p.y - p.s * 0.3, p.s * 1.2, p.s * 2, i * 1.3, 0.9);
    }
  });
}

// the burning siege tower falling just below him (tower coordinates: turret roof at y = 0)
function bfCavernTowerXform(spot, t) {
  const g = bossGeom();
  return { tx: spot.x, ty: spot.y + 120, rot: Math.sin(t * 0.02) * 0.05, sc: BF_TOWER_SCALE, cx: bossFall.bx + g.bw / 2 };
}
function bfCavernToScreen(X, x, y) {
  const lx = (x - X.cx) * X.sc, ly = y * X.sc;
  const c = Math.cos(X.rot), s = Math.sin(X.rot);
  return { x: X.tx + lx * c - ly * s, y: X.ty + lx * s + ly * c };
}

function drawBossFallCavern() {
  const B = bossFall;
  if (B.phase === 'floor') { drawBfFloor(); return; }
  const C = B.cave;
  const t = C.t, fall = C.fall;
  const W = width, H = height;
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  bg.addColorStop(0, '#080a16');
  bg.addColorStop(0.6, '#03040a');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawCavernLife(t, fall, C.bio, 0);
  drawCavernWalls(t, fall, C.bio);

  const impact = Math.max(0, t - BF_FALL_LEN);
  const spot = bfCavernDragonSpot(Math.min(t, BF_FALL_LEN));
  const X = bfCavernTowerXform(spot, t);

  // firelight from the burning tower
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.35 + Math.sin(t * 0.3) * 0.04 + Math.sin(t * 0.77) * 0.03;
  const lg = ctx.createRadialGradient(X.tx, X.ty + 60, 10, X.tx, X.ty + 60, H * 0.6);
  lg.addColorStop(0, 'rgba(255,120,40,' + fl + ')');
  lg.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  drawBfStream(C, false);

  // the tower (until it smashes into the floor)
  const smash = Math.min(1, impact / 26);
  const g = bossGeom();
  const cells = C.cells || [];
  const towerFlames = [];
  for (let i = 0; i < 7; i++) towerFlames.push({ x: B.bx + g.bw * (0.1 + i * 0.13), y: g.turretH * (0.3 + (i % 3) * 0.6), w: 34, h: 64 + (i % 3) * 16, seed: i * 1.7 });
  const inCell = (k, x, y) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h;
  bossState.x = B.bx;
  // pieces that have torn loose, tumbling and drifting up past him, fading into the dark
  (C.pieces || []).forEach(p => {
    const k = p.cell, kx = k.x + k.w / 2, ky = k.y + k.h / 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (BF_PIECE_LIFE - p.age) / 50));
    ctx.translate(X.tx, X.ty);
    ctx.rotate(X.rot);
    ctx.scale(X.sc, X.sc);
    ctx.translate(-X.cx + kx + p.dx, ky + p.dy);   // tower coordinates, moved and turned about the block's middle
    ctx.rotate(p.rot);
    ctx.translate(-kx, -ky);
    ctx.beginPath(); ctx.rect(k.x, k.y, k.w, k.h); ctx.clip();
    renderBoss();
    drawFlame(kx, ky, 30, 50, k.r * 3 + k.c, 0.9);
    ctx.restore();
  });
  // what is still in one piece (until it smashes into the floor)
  if (smash < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - smash;
    ctx.translate(X.tx, X.ty + smash * 80);
    ctx.rotate(X.rot);
    ctx.scale(X.sc, X.sc * (1 - smash * 0.6));
    ctx.translate(-X.cx, 0);
    ctx.save();
    if (cells.length) {
      ctx.beginPath();
      cells.forEach(k => { if (!k.loose) ctx.rect(k.x, k.y, k.w, k.h); });
      ctx.clip();
    }
    renderBoss();
    ctx.restore();
    towerFlames.forEach(f => {
      if (cells.some(k => !k.loose && inCell(k, f.x, f.y))) drawFlame(f.x, f.y, f.w, f.h, f.seed);
    });
    // the iron ring bolted to the turret roof that the chain is fastened to
    const an = bfAnchorLocal();
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(an.x - 15, an.y + 8, 30, 9);
    ctx.fillStyle = '#7f8790';
    ctx.fillRect(an.x - 12, an.y + 10, 3, 3); ctx.fillRect(an.x + 9, an.y + 10, 3, 3);   // bolt heads
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(an.x, an.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#b8c0c8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(an.x, an.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // the floor coming up out of the dark
  let dragonY = spot.y, dragonX = spot.x;
  const floorY = H * 0.8;
  if (impact > 0) {
    const u = Math.min(1, (impact - 10) / 50);
    const fy = H + 40 - (H + 40 - floorY) * Math.max(0, 1 - Math.pow(1 - Math.max(0, u), 3));
    ctx.fillStyle = '#0e0b0c';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, fy + Math.sin(x * 0.05) * 4 + hash2(x, 3) * 5);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    const d = Math.min(1, impact / 62);
    dragonY = spot.y + (floorY - 12 - spot.y) * d * d;
    dragonX = spot.x + (W * 0.4 - spot.x) * d;
  }

  // Cyndraxx, limp; the chain from his heart pulled taut down to the tower
  dragon.x = dragonX; dragon.y = dragonY;
  const rot = B.drot || 0;
  const c = bfChest();
  if (smash < 1) {
    const an = bfAnchorLocal();
    const ring = bfCavernToScreen(X, an.x, an.y);
    drawChainLinks(c.x, c.y, ring.x, ring.y, 3);
  }
  if (t % 70 < 2) dragon.wingState = 0.5;
  drawDragon(dragonX, dragonY, rot);
  drawChainArrow(c.x + 4, c.y + 6, Math.PI / 2 + 0.4, true);

  drawBfStream(C, true);

  if (impact > 0 && impact < 20) {
    ctx.fillStyle = 'rgba(255,200,140,' + (0.5 * (1 - impact / 20)) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  const a = Math.max(0, 1 - t / 40);
  if (a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, W, H); }
}

// ---- the cavern floor ----
function bfLyingChest(D, sc) {
  const c = Math.cos(D.rot), s = Math.sin(D.rot);
  return { x: D.x + (5 * c - 9 * s) * sc, y: D.y + (5 * s + 9 * c) * sc };
}

// where his eye is on screen as he lies on the floor (the death scene sinks in on it)
function bfLyingEye(F) {
  const D = F.dragon, sc = 1.3, p = 2.6;
  const lx = 6.5 * p, ly = -3.5 * p, c = Math.cos(D.rot), s = Math.sin(D.rot);
  return { x: D.x + (lx * c - ly * s) * sc, y: D.y + (lx * s + ly * c) * sc };
}
function bfReached(F, act) { const i = F.steps.findIndex(x => x.act === act); return i >= 0 && F.i >= i; }

// his last dream: Sarai's portrait in the soft, fading circle of memory (the cathedral dream's look)
function drawBfDream(F, s) {
  const W = width, H = height, f = F.t;
  ctx.fillStyle = 'rgb(255,248,235)';
  ctx.fillRect(0, 0, W, H);
  if (khaleesiFrame1.complete && khaleesiFrame1.naturalWidth) {
    const ps = Math.min(W, H * 0.8) * (0.95 + 0.06 * f / s.frames);
    ctx.drawImage(saraiMemory(), (W - ps) / 2, H * 0.44 - ps / 2, ps, ps);
  }
  drawDreamGlow(f);
  const ca = Math.max(0, Math.min(1, (f - 40) / 30));
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca;
    ctx.fillStyle = '#6a5238';
    ctx.font = 'bold 16px "Proxima Nova", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(BF_DREAM_CAPTION, W / 2, H * 0.86);
    ctx.restore();
  }
  // out of the dark at the start; at the end the dream tears: it flickers, bleeds red, and is gone
  const tail = s.frames - f;
  let black = Math.max(0, 1 - f / 45);
  if (tail < 40) {
    const flick = (Math.floor(f / 3) % 2) ? 0.55 : 0.1;
    ctx.fillStyle = 'rgba(120,0,10,' + (1 - tail / 40) * 0.6 + ')';
    ctx.fillRect(0, 0, W, H);
    black = Math.max(black, (1 - tail / 40) * 0.7 + flick * (1 - tail / 40));
  }
  if (black > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, black) + ')'; ctx.fillRect(0, 0, W, H); }
}

function drawBfFloor() {
  const B = bossFall, F = B.floor, s = bfStep();
  const W = width, H = height, t = F.clock;
  const fy = F.floorY;
  if (s && s.act === 'dream') { drawBfDream(F, s); return; }
  const dying = s && s.act === 'death';
  const T = dying ? F.t : 0;
  // the death scene sinks slowly in on his dead eye
  const eye = bfLyingEye(F);
  const zk = dying ? Math.max(0, Math.min(1, (T - BF_ZOOM_AT) / (BF_DEATH_FRAMES - BF_ZOOM_AT))) : 0;
  const zoom = 1 + 1.8 * zk * zk * (3 - 2 * zk);
  ctx.save();
  if (zoom > 1) {
    ctx.translate(eye.x, eye.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-eye.x, -eye.y);
  }
  // the dark cave
  ctx.fillStyle = '#04040a';
  ctx.fillRect(-W, -H, W * 3, H * 3);
  const after = bfReached(F, 'dimIn');
  const bioUp = after ? 1 : 0.45;
  drawCavernLife(t, t * 0.3, 0.55 * bioUp * (1 - (F.lifeDim || 0)), bfReached(F, 'jenkins') ? 9 : 3);
  // back wall shapes
  ctx.fillStyle = '#0b0a12';
  ctx.beginPath();
  ctx.moveTo(0, fy);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, fy - 60 - Math.sin(x * 0.02) * 30 - hash2(x, 8) * 20);
  ctx.lineTo(W, fy);
  ctx.closePath();
  ctx.fill();
  // the floor
  const fg = ctx.createLinearGradient(0, fy, 0, H);
  fg.addColorStop(0, '#1a1418'); fg.addColorStop(1, '#070508');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, fy + Math.sin(x * 0.05) * 3 + hash2(x, 3) * 4);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // firelight from the wreckage
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  F.wreck.forEach((w, i) => {
    const r = (w.k === 'turret' ? 170 : 90) * (0.6 + 0.4 * F.fire);
    const fl = (0.22 + Math.sin(t * 0.3 + i) * 0.03) * F.fire;
    const lg = ctx.createRadialGradient(w.x, fy - 10, 4, w.x, fy - 10, r);
    lg.addColorStop(0, 'rgba(255,120,40,' + fl + ')');
    lg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(w.x - r, fy - 10 - r, r * 2, r * 2);
  });
  ctx.restore();

  // the blood pool spreading under him (it shrinks away when he is healed)
  const D = F.dragon;
  const sc = 1.3;
  const chest = bfLyingChest(D, sc);
  if (F.blood > 0) {
    const r = 70 * F.blood;
    ctx.fillStyle = 'rgba(110,8,16,0.9)';
    ctx.beginPath(); ctx.ellipse(chest.x + 6, fy + 3, r, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(170,30,40,0.5)';
    ctx.beginPath(); ctx.ellipse(chest.x - r * 0.2, fy + 1, r * 0.4, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  }

  // wreckage, burning
  F.wreck.forEach((w, i) => {
    ctx.save();
    ctx.translate(w.x, fy - w.s * 0.4);
    ctx.rotate(w.rot);
    if (w.k === 'timber') {
      ctx.fillStyle = '#20140c'; ctx.fillRect(-w.s * 2.2, -w.s * 0.35, w.s * 4.4, w.s * 0.7);
      ctx.fillStyle = '#4a2c16'; ctx.fillRect(-w.s * 2.2, -w.s * 0.35, w.s * 4.4, 3);
    } else if (w.k === 'stone') {
      ctx.fillStyle = '#1e1d22'; ctx.fillRect(-w.s, -w.s * 0.8, w.s * 2, w.s * 1.4);
      ctx.fillStyle = '#34323a'; ctx.fillRect(-w.s, -w.s * 0.8, w.s * 2, 3);
    } else {
      // a broken piece of the turret, its battlement still on it
      ctx.fillStyle = '#16151a'; ctx.fillRect(-w.s * 1.6, -w.s * 1.6, w.s * 3.2, w.s * 1.9);
      ctx.fillStyle = '#26252c';
      for (let k = 0; k < 4; k++) ctx.fillRect(-w.s * 1.6 + k * w.s * 0.85, -w.s * 2.1, w.s * 0.5, w.s * 0.5);
      ctx.fillStyle = '#0a0a0c'; ctx.fillRect(-w.s * 0.3, -w.s * 1.2, w.s * 0.25, w.s * 0.8);
    }
    ctx.restore();
    const fh = (w.k === 'turret' ? 70 : 34 + w.s) * (0.4 + 0.6 * F.fire);
    drawFlame(w.x + Math.sin(w.seed) * 6, fy - w.s * (w.k === 'turret' ? 1.6 : 0.6), (w.k === 'turret' ? 44 : 22) * (0.5 + 0.5 * F.fire), fh, w.seed);
  });

  // the chain lying slack from his chest to the turret
  if (F.arrowA > 0) {
    ctx.save();
    ctx.globalAlpha = F.arrowA;
    const tur = F.wreck[F.wreck.length - 1];
    drawChainLinks(chest.x, chest.y, tur.x - 30, fy - 30, 40);
    ctx.restore();
  }

  // Cyndraxx lying on the cave floor
  ctx.save();
  const jerk = F.spasm > 0 ? F.spasm / 14 : 0;
  ctx.translate(D.x + (Math.random() - 0.5) * 5 * jerk, D.y - (F.dragonUp || 0) * 6 - Math.sin(jerk * Math.PI) * 6);
  ctx.scale(sc, sc);
  dragon.wingState = Math.max(dragon.wingState * 0.9, F.wing * 0.6);
  const lieRot = D.rot * (1 - (F.dragonUp || 0)) + (Math.random() - 0.5) * 0.12 * jerk;
  drawDragon(0, 0, lieRot);
  const p = 2.6;
  ctx.rotate(lieRot);
  if (F.dead) {
    // the eye stays open, glassy and grey, the pupil rolled away: there is no one behind it
    ctx.fillStyle = '#b4b9bd';
    ctx.fillRect(4 * p, -6 * p, 5 * p, 5 * p);
    ctx.fillStyle = 'rgba(120,128,134,0.6)';
    ctx.fillRect(4 * p, -6 * p, 5 * p, 1.5 * p);           // a dull film over it
    ctx.fillStyle = '#6e7377';
    ctx.fillRect(5 * p, -2.6 * p, 2 * p, 1.6 * p);
    ctx.fillStyle = '#7a1d12';
    ctx.fillRect(4 * p, -1 * p, 5 * p, 0.6 * p);
    // the jaw hangs slack
    ctx.fillStyle = '#2a0a08';
    ctx.fillRect(9 * p, 1 * p, 5 * p, 1 * p);
  } else if (F.asleep) {
    ctx.fillStyle = '#ff793f';
    ctx.fillRect(4 * p, -6 * p, 5 * p, 5 * p);
    ctx.fillStyle = '#7a1d12';
    ctx.fillRect(4 * p, -3 * p, 5 * p, 1 * p);
  } else if (dying) {
    // the light going out of his eye before the end
    ctx.fillStyle = 'rgba(30,20,20,' + Math.min(0.55, T / BF_DEAD_AT * 0.55) + ')';
    ctx.fillRect(4 * p, -6 * p, 5 * p, 5 * p);
  }
  // blood running from his mouth
  const mouthBlood = dying ? Math.min(1, Math.max(0, (T - 150) / 200)) : (F.dead ? 1 : 0);
  if (mouthBlood > 0 && (F.arrowA > 0.3)) {
    ctx.fillStyle = '#7c0a14';
    ctx.fillRect(13 * p, 1.2 * p, 1.2 * p, (1 + mouthBlood * 5) * p);
    ctx.fillRect(12 * p, 2 * p, 1 * p, mouthBlood * 3 * p);
  }
  ctx.restore();
  // blood pumping from the wound when he convulses
  if (F.spurt > 0) {
    ctx.fillStyle = 'rgba(170,12,24,' + F.spurt + ')';
    for (let k = 0; k < 7; k++) {
      const u = 1 - F.spurt;
      ctx.fillRect(chest.x + 4 + k * 4 * u * 3, chest.y - 6 - Math.sin(k) * 10 * u + u * u * 30, 3, 3);
    }
  }
  // his last breath: a pale wisp leaves his mouth and drifts away into the dark
  if (dying && T >= BF_RATTLE_AT && T < BF_RATTLE_AT + 220) {
    const c = Math.cos(D.rot), sn = Math.sin(D.rot);
    const mx = D.x + (14 * p * c - 1 * p * sn) * sc, my = D.y + (14 * p * sn + 1 * p * c) * sc;
    const u = (T - BF_RATTLE_AT) / 220;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) {
      const v = Math.max(0, Math.min(1, u * 1.4 - k * 0.06));
      if (v <= 0 || v >= 1) continue;
      const wx = mx + 8 + v * 50 + Math.sin(v * 7 + k) * 8;
      const wy = my - v * 120 - k * 3;
      const r = 4 + v * 16;
      const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, r);
      g.addColorStop(0, 'rgba(200,215,230,' + 0.22 * (1 - v) + ')');
      g.addColorStop(1, 'rgba(200,215,230,0)');
      ctx.fillStyle = g;
      ctx.fillRect(wx - r, wy - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  if (F.arrowA > 0) {
    ctx.save();
    ctx.globalAlpha = F.arrowA;
    drawChainArrow(chest.x + 6, chest.y + 4, -0.5, true);
    ctx.restore();
  }

  // Brown Jenkins
  if (bfReached(F, 'jenkins') && F.jA > 0) drawJenkins(F.jx, fy + 2, F.jPose, t, F.jA);

  // Nyarlathotep's price: sickly light pouring from his little hands into the dragon's wound
  if (s && s.act === 'heal') drawJenkinsHeal(F, chest, t);

  ctx.restore();   // end of the death scene's zoom

  // his death: torn from the dream with a red flash; the world darkens around him; then the dark closes in on his eye
  if (dying) {
    if (T < 26) { ctx.fillStyle = 'rgba(150,0,14,' + (0.7 * (1 - T / 26)) + ')'; ctx.fillRect(0, 0, W, H); }
    const gloom = Math.min(0.55, T / BF_DEATH_FRAMES * 0.7);
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.12, W / 2, H / 2, Math.max(W, H) * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,' + (0.35 + gloom) + ')');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    if (T >= BF_IRIS_AT) {
      const k = (T - BF_IRIS_AT) / (BF_DEATH_FRAMES - BF_IRIS_AT);
      const r = Math.max(0, Math.hypot(W, H) * (1 - k) * (1 - k));
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    }
  }
  if (s && s.act === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  if (s && s.act === 'dimIn') {
    const a = Math.max(0, 1 - F.t / 130);
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (s && s.act === 'heart') drawHeartContainer(F.t, 'Nyarlathotep\'s gift. Cyndraxx is healed.');
  if (s && s.say) drawCathDialogue(s, F);
  if (s && (s.act === 'toCave' || s.act === 'rejectFade' || s.act === 'startCave' || s.act === 'gameOver')) {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, F.t / (s.frames - 5)) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  // a dark vignette over everything
  const v = ctx.createRadialGradient(W / 2, H * 0.6, Math.min(W, H) * 0.3, W / 2, H * 0.6, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// Sarai's portrait fading softly out at the edges, like a memory
let saraiMemoryCanvas = null;
function saraiMemory() {
  if (saraiMemoryCanvas) return saraiMemoryCanvas;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.drawImage(khaleesiFrame1, 0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(128, 118, 40, 128, 128, 128);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, 256, 256);
  saraiMemoryCanvas = c;
  return c;
}

function drawJenkinsHeal(F, chest, t) {
  const hx = F.jx - 14, hy = F.floorY - 30;
  const k = Math.min(1, F.t / 40) * Math.min(1, (220 - F.t) / 40);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    for (let u = 0; u <= 1.001; u += 0.05) {
      const x = hx + (chest.x - hx) * u;
      const y = hy + (chest.y - hy) * u + Math.sin(u * 10 + t * 0.2 + i) * 16 * Math.sin(u * Math.PI);
      if (u === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = i % 2 ? 'rgba(160,90,255,' + 0.6 * k + ')' : 'rgba(80,255,160,' + 0.55 * k + ')';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // a turning ring of strange marks around the dragon
  const R = 70;
  ctx.strokeStyle = 'rgba(150,100,255,' + 0.6 * k + ')';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(chest.x, chest.y, R, R * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + t * 0.03;
    const x = chest.x + Math.cos(a) * R, y = chest.y + Math.sin(a) * R * 0.4;
    ctx.fillStyle = 'rgba(120,255,180,' + 0.8 * k + ')';
    ctx.fillRect(x - 2, y - 4, 4, 2); ctx.fillRect(x - 1, y - 2, 2, 6);
  }
  const gl = ctx.createRadialGradient(chest.x, chest.y, 0, chest.x, chest.y, 60);
  gl.addColorStop(0, 'rgba(180,140,255,' + 0.5 * k + ')');
  gl.addColorStop(1, 'rgba(120,60,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(chest.x - 60, chest.y - 60, 120, 120);
  ctx.restore();
}

// ---- Brown Jenkins: a possum with a human face and tiny human hands ----
function drawJenkins(x, footY, pose, t, alpha) {
  const p = 3.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(footY));
  const R = (cx, cy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(cx * p, cy * p, w * p, h * p); };
  const FUR = '#7a6c60', FUR_D = '#584c43', FUR_L = '#a69888', SKIN = '#d9b59a', SKIN_D = '#b48e74', PINK = '#d9a1a4';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 1, 9 * p, 1.6 * p, 0, 0, Math.PI * 2); ctx.fill();
  // the long, bare, pink tail curling out behind him
  ctx.strokeStyle = PINK; ctx.lineWidth = p * 0.9; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(3 * p, -2 * p);
  ctx.bezierCurveTo(12 * p, -1 * p, 14 * p, -8 * p + Math.sin(t * 0.08) * p, 10 * p, -9 * p);
  ctx.stroke();
  if (pose === 'walk') {
    const step = Math.floor(t / 5) % 2;
    R(-6, -6, 11, 5, FUR); R(-6, -2, 11, 1, FUR_D); R(-5, -6, 9, 1, FUR_L);
    // little human hands for front feet, back paws
    R(-5 + step, -1, 1.5, 1, SKIN); R(-3 - step, -1, 1.5, 1, SKIN);
    R(2 + step, -1, 1.5, 1, FUR_D); R(4 - step, -1, 1.5, 1, FUR_D);
    // head out in front: fur ruff, pointed ears, a man's face
    R(-10, -9, 5, 5, FUR);
    R(-10, -11, 1.5, 2, FUR); R(-6.5, -11, 1.5, 2, FUR); R(-9.7, -10.5, 0.8, 1, PINK); R(-6.2, -10.5, 0.8, 1, PINK);
    R(-9.5, -8, 3.5, 3.5, SKIN); R(-9.5, -5.5, 3.5, 0.8, SKIN_D);
    R(-9, -7.3, 0.8, 0.8, '#0a0a0a'); R(-7.2, -7.3, 0.8, 0.8, '#0a0a0a');
    R(-9, -5.5, 2.5, 0.5, '#e8e0a8');
  } else {
    // sitting up on his haunches, hands folded, grinning
    R(-4, -10, 8, 10, FUR); R(-3, -9, 6, 8, FUR_L); R(2.5, -10, 1.5, 10, FUR_D);
    R(-5, -1, 3, 1, FUR_D); R(2, -1, 3, 1, FUR_D);
    R(-2.5, -7, 5, 1.5, SKIN); R(-2.5, -7.5, 1, 0.5, SKIN_D); R(-0.5, -7.5, 1, 0.5, SKIN_D); R(1.5, -7.5, 1, 0.5, SKIN_D);   // little fingers
    R(-4, -16, 8, 6.5, FUR);
    R(-4.2, -18.5, 2, 3, FUR); R(2.2, -18.5, 2, 3, FUR); R(-3.7, -17.8, 1, 1.6, PINK); R(2.7, -17.8, 1, 1.6, PINK);
    R(-3, -15.5, 6, 5, SKIN); R(-3, -11, 6, 0.6, SKIN_D);
    R(-2.4, -14.5, 1.8, 0.4, '#5a4a40'); R(0.6, -14.5, 1.8, 0.4, '#5a4a40');
    const glint = (t % 110) < 10;
    R(-2.2, -13.8, 1.2, 1.2, '#0a0a0a'); R(0.9, -13.8, 1.2, 1.2, '#0a0a0a');
    if (glint) { R(-2, -13.7, 0.4, 0.4, '#dfffb0'); R(1.1, -13.7, 0.4, 0.4, '#dfffb0'); }
    R(-0.5, -12.5, 1, 1.4, SKIN_D);
    R(-2, -11.6, 4, 0.8, '#3a1a14'); R(-1.6, -11.6, 0.6, 0.6, '#efe6b0'); R(-0.4, -11.6, 0.6, 0.6, '#efe6b0'); R(0.8, -11.6, 0.6, 0.6, '#efe6b0');
    R(-3, -11.2, 6, 1.2, '#6b5a4c');     // scraggly beard
  }
  ctx.restore();
}

let jenkinsPortraitCanvas = null;
function jenkinsPortrait() {
  if (jenkinsPortraitCanvas) return jenkinsPortraitCanvas;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const q = 4;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * q, y * q, w * q, h * q); };
  const bg = g.createRadialGradient(64, 60, 4, 64, 64, 100);
  bg.addColorStop(0, '#203a1c'); bg.addColorStop(1, '#05080a');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  const FUR = '#7a6c60', FUR_D = '#584c43', FUR_L = '#a69888', SKIN = '#d9b59a', SKIN_D = '#b48e74', PINK = '#d9a1a4';
  R(4, 3, 6, 9, FUR); R(22, 3, 6, 9, FUR);              // pointed possum ears
  R(6, 5, 2, 5, PINK); R(24, 5, 2, 5, PINK);
  R(5, 8, 22, 18, FUR); R(7, 24, 18, 6, FUR_D);         // fur all around the face
  R(6, 9, 2, 14, FUR_L); R(24, 9, 2, 14, FUR_L);
  R(9, 9, 14, 15, SKIN);                                // a man's face
  R(9, 9, 14, 1, SKIN_D); R(10, 12, 4, 1, '#5a4a40'); R(18, 12, 4, 1, '#5a4a40');   // brows
  R(11, 13, 3, 3, '#0a0a0a'); R(18, 13, 3, 3, '#0a0a0a');   // beady eyes
  R(10, 16, 4, 1, SKIN_D); R(18, 16, 4, 1, SKIN_D);       // bags under them
  R(15, 14, 2, 5, SKIN_D);                              // long nose
  R(11, 20, 10, 2, '#3a1a14');                          // a wide grin...
  R(12, 20, 1, 1, '#efe6b0'); R(14, 20, 1, 2, '#efe6b0'); R(16, 20, 1, 1, '#efe6b0'); R(18, 20, 1, 2, '#efe6b0');   // ...sharp teeth
  R(10, 22, 12, 3, '#6b5a4c'); R(11, 25, 10, 1, '#6b5a4c');   // scraggly beard
  R(9, 17, 1, 2, SKIN_D); R(22, 17, 1, 2, SKIN_D);
  // two tiny human hands, fingertips together
  R(8, 27, 6, 4, SKIN); R(18, 27, 6, 4, SKIN);
  R(13, 26, 2, 3, SKIN); R(17, 26, 2, 3, SKIN);
  R(9, 27, 1, 1, SKIN_D); R(11, 27, 1, 1, SKIN_D); R(20, 27, 1, 1, SKIN_D); R(22, 27, 1, 1, SKIN_D);
  jenkinsPortraitCanvas = c;
  return c;
}
