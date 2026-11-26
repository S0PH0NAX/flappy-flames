// boss-fall.js — The siege tower boss's ending (state 'BOSS_FALL'): the burned-out tower stops, the ground
// gives way and it sinks, burning, into a huge pit. A lone archer climbs out of the turret and fires an arrow
// trailing a chain; it pierces Cyndraxx's heart and the chain drags him down into the pit after the tower.
// Then he falls through a dark cavern full of glowing mushrooms and jellyfish-like creatures flashing in neon
// patterns. It ends on a fade to black, then the "SIEGE TOWER DESTROYED" dialogue (level 4 follows).
// Classic script: shares global scope with the other src/js files.

const BF_ARCHER_AT = 170;        // the lone archer climbs out of the turret
const BF_DRAW_AT = 205;          // ...draws his bow
const BF_FIRE_AT = 245;          // ...and fires
const BF_CAVERN_LEN = 540;       // frames falling through the cavern
const BF_SKIP_AFTER = 240;       // taps can skip once this much has played (so fire-button taps at the kill don't)

let bossFall = null;

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
        B.cave = { t: 0, fall: 0 };
        dragon.wingState = 0;
      }
    }
  }

  if (B.phase === 'cavern') {
    const C = B.cave;
    C.t++;
    C.fall += 6.5;
    B.rumble = 0;
    B.drot = (B.drot || 0) + 0.012;
    if (C.t % 130 === 40) sound.magicShimmer(0.9, 0.16);
    if (C.t >= BF_CAVERN_LEN) finishBossFall();
  }
}

function bossFallTap() {
  if (!bossFall || bossFall.t < BF_SKIP_AFTER) return;
  finishBossFall();
}

// Fade out of the cavern into the level-clear dialogue (as if the level-clear celebration had played).
function finishBossFall() {
  bossFall = null;
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
  if (!bossFall || bossFall.phase === 'cavern' || bossFall.shake < 0.3) return null;
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
const BF_JELLIES = 11;
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

function drawBossFallCavern() {
  const B = bossFall;
  const C = B.cave;
  const t = C.t, fall = C.fall;
  const W = width, H = height;
  // the dark
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, Math.max(W, H) * 0.8);
  bg.addColorStop(0, '#0b1024');
  bg.addColorStop(0.6, '#05060f');
  bg.addColorStop(1, '#010103');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // far away: jellyfish-like creatures drifting in the black, flashing in neon patterns
  const period = H * 1.6;
  for (let i = 0; i < BF_JELLIES; i++) {
    const baseY = hash2(i, 21) * period;
    const y = ((baseY - fall * 0.22) % period + period) % period - H * 0.2;
    const x = W * (0.12 + hash2(i, 23) * 0.76) + Math.sin(t * 0.01 + i) * 14;
    const r = 9 + hash2(i, 25) * 16;
    const hue = (hash2(i, 27) * 360 + (Math.floor(t / BF_PATTERN_LEN) % 3 === 2 ? t * 1.5 : 0)) % 360;
    drawJelly(x, y, r, hue, bfNeon(i, y, t), t, i);
  }

  // drifting spores
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const y = ((hash2(i, 31) * H - fall * 0.6) % H + H) % H;
    const x = hash2(i, 33) * W + Math.sin(t * 0.02 + i) * 8;
    ctx.fillStyle = 'hsla(' + (160 + hash2(i, 35) * 140) + ',100%,75%,' + (0.3 + 0.4 * Math.sin(t * 0.1 + i)) + ')';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  // the cavern walls rushing up past him, with glowing mushrooms on every ledge
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
    // rough rock: dark cracks and lighter knobs that scroll with the wall
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
    // mushrooms: clusters every so often down the wall, pulsing with a glow that ripples downward
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

  // the burning wreck of the tower tumbling down with him
  for (let i = 0; i < 6; i++) {
    const y = ((hash2(i, 81) * H * 1.4 - t * (1.2 + hash2(i, 83) * 1.5)) % (H * 1.4) + H * 1.4) % (H * 1.4) - H * 0.2;
    const x = W * (0.25 + hash2(i, 85) * 0.5);
    const s = 8 + hash2(i, 87) * 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.02 * (i % 2 ? 1 : -1) + i);
    ctx.fillStyle = '#1a1412';
    ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(-s, -s * 0.6, s * 2, 3);
    ctx.restore();
    drawFlame(x, y - s * 0.4, s * 1.3, s * 2.2, i * 3.1, 0.9);
  }

  // Cyndraxx, limp, the arrow in his heart and the chain trailing up into the dark
  const dx = W * 0.5 + Math.sin(t * 0.017) * 34, dy = H * 0.42 + Math.sin(t * 0.03) * 10;
  dragon.x = dx; dragon.y = dy;
  const rot = B.drot || 0;
  const c = bfChest();
  const tail = { x: c.x - Math.cos(-Math.PI / 2 + Math.sin(t * 0.05) * 0.2) * 30, y: c.y - 34 };
  drawChainLinks(tail.x, tail.y, dx + Math.sin(t * 0.04) * 30, -20, -10);
  if (t % 70 < 2) dragon.wingState = 0.5;          // a twitch
  drawDragon(dx, dy, rot);
  drawChainArrow(c.x + 4, c.y + 6, Math.atan2(c.y + 6 - tail.y, c.x + 4 - tail.x), true);

  // fade in from the pit's black, fade out at the end
  const a = Math.max(0, 1 - t / 40, (t - (BF_CAVERN_LEN - 70)) / 70);
  if (a > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, a) + ')'; ctx.fillRect(0, 0, W, H); }
}
