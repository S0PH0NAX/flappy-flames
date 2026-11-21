// treasure.js — Treasure chests (open / locked / smashed treasure), the treasure score multiplier,
// and the per-frame hooks that run all the newer level extras (knights, chests, gold shield).
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

let chests = [];
let carriedChest = null;
let treasureMult = 1;
let treasureMultTimer = 0;        // frames left on the treasure multiplier

const CHEST_SPAWN_CHANCE = 0.07;  // per tower
const CHEST_LOCKED_CHANCE = 0.45;
const CHEST_BREAK_HEIGHT = 0;     // minimum drop height to smash a locked chest (0 = any height)
const CHEST_AUTO_DROP = 150;      // one-tap control mode: frames before a carried chest falls on its own
const CHEST_FLASH_FRAMES = 60;    // ...and it flashes for this long before it goes
const OPEN_CHEST_BONUS = 1000, OPEN_CHEST_MULT = 5, OPEN_CHEST_SECS = 10;
const TREASURE_BONUS = 3000, TREASURE_MULT = 10, TREASURE_SECS = 12;
const CHEST_SCALE = 2.2;            // chests are drawn this much bigger than the base art
const CHEST_BASE_W = 24, CHEST_BASE_H = 18;
const CHEST_W = CHEST_BASE_W * CHEST_SCALE, CHEST_H = CHEST_BASE_H * CHEST_SCALE;

const FIRE_BTN_HTML = manualFireBtn.innerHTML;
let fireBtnShowsDrop = false;

function maybeSpawnChest(obs) {
  if (Math.random() > CHEST_SPAWN_CHANCE) return;
  chests.push({
    kind: Math.random() < CHEST_LOCKED_CHANCE ? 'LOCKED' : 'OPEN',
    place: 'TOWER',
    obsRef: obs, battRef: null,
    relX: obs.width * (0.2 + Math.random() * 0.6),
    x: 0, y: 0, vy: 0, dropY: 0, carryT: 0, gone: false
  });
}

function clearLevelExtras() {
  smallKnights = [];
  goldKnights = [];
  chests = [];
  carriedChest = null;
  goldShield.held = false;
  goldShield.drop = null;
  treasureMultTimer = 0;
  treasureMult = 1;
  setFireButtonDrop(false);
}

function setFireButtonDrop(on) {
  if (on === fireBtnShowsDrop) return;
  fireBtnShowsDrop = on;
  manualFireBtn.innerHTML = on ? 'DROP <span class="btn-symbol">📦</span>' : FIRE_BTN_HTML;
}

// multiplier applied on top of the Khaleesi combo inside addScore()
function treasureMultiplier() { return treasureMultTimer > 0 ? treasureMult : 1; }

function grantTreasure(bonus, mult, secs, x, y, label) {
  score += bonus;
  scoreDisplay.innerText = score;
  if (mult >= treasureMult || treasureMultTimer <= 0) treasureMult = mult;
  treasureMultTimer = Math.max(treasureMultTimer, secs * 60);
  sound.powerup();
  floatingTexts.push({ x: x - 40, y: y - 30, text: label + ' +' + bonus + '  ' + mult + 'x!', color: '#f1c40f', alpha: 1.0, vy: -1.3 });
  showTreasureFX(label + '!', '+' + bonus + '   ' + mult + 'x POINTS');
  for (let p = 0; p < 26; p++) {
    particles.push({ x: x, y: y - 8, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7, size: 2 + Math.random() * 3, life: 35, color: Math.random() < 0.7 ? '#f1c40f' : '#ffffff' });
  }
}

// Fire button / tap while holding a chest. Returns true when the press was used up by the chest.
function chestHandlesFire() {
  if (!carriedChest) return false;
  if (isFlapLockActive) dropCarriedChest();   // separate fire button: FIRE becomes DROP
  return true;                                // one-tap mode: no fire while carrying; it drops on a timer
}

function chestBreakBurst(c) {
  sound.towerDestroy();
  for (let p = 0; p < 20; p++) particles.push({ x: c.x, y: c.y - 8, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, size: 3 + Math.random() * 3, life: 30, color: Math.random() < 0.5 ? '#6b4423' : '#f1c40f' });
}

function dropCarriedChest() {
  const c = carriedChest;
  if (!c) return;
  carriedChest = null;
  c.place = 'FALLING';
  c.vy = Math.max(0, dragon.velocity * 0.4);
  c.dropY = c.y;
  setFireButtonDrop(false);
  sound.whoosh();
}

function chestKillsBelow(c) {
  const left = c.x - CHEST_W / 2, right = c.x + CHEST_W / 2, top = c.y - CHEST_H, bottom = c.y;
  const gY = height - groundHeight;
  const hit = (x, y, w, h) => right > x && left < x + w && bottom > y && top < y + h;

  knights.forEach(k => {
    if (k.state !== 'ALIVE' || k.isRoyal || !k.obsRef) return;
    const kx = k.obsRef.x + k.relX, ky = k.obsRef.bottomY - 32;
    if (hit(kx, ky, 22, 32)) {
      k.state = 'FALLING'; k.fallVelocityY = 1; k.knockbackVelocity = (Math.random() - 0.5) * 6;
    }
  });
  smallKnights.forEach(k => {
    if (k.state !== 'ALIVE') return;
    const kx = k.obsRef.x + k.relX, ky = k.obsRef.bottomY - 32;
    if (hit(kx, ky, 22, 32)) killSmallKnight(k, 'crush');
  });
  archers.forEach(a => {
    const b = a.battlementRef;
    if (!b || a.destroyed) return;
    const ax = b.x + a.relX, ay = gY - b.height;
    if (hit(ax - 10, ay - 30, 20, 32)) {
      a.destroyed = true; a.archerAwarded = true;
      gameStats.archersKilled++;
      sound.knightHit();
      const r = addScore(20);
      floatingTexts.push({ x: ax - 15, y: ay - 30, text: 'SQUASH! +' + r.totalPts, color: '#f1c40f', alpha: 1.0, vy: -1.5 });
    }
  });
  trebuchets.forEach(t => {
    if (t.destroyed) return;
    if (hit(t.x - 30, gY - 60, 60, 60)) {
      t.destroyed = true;
      gameStats.trebuchetsDestroyed++;
      sound.knightHit();
      const r = addScore(10);
      floatingTexts.push({ x: t.x - 10, y: gY - 60, text: 'SMASH! +' + r.totalPts, color: '#ff9f43', alpha: 1.0, vy: -1.5 });
    }
  });
}

function updateChests(worldShift) {
  const gY = height - groundHeight;
  for (let i = chests.length - 1; i >= 0; i--) {
    const c = chests[i];
    if (c.gone) { chests.splice(i, 1); continue; }

    if (c.place === 'TOWER') {
      if (!c.obsRef) { chests.splice(i, 1); continue; }
      c.x = c.obsRef.x + c.relX; c.y = c.obsRef.bottomY;
    } else if (c.place === 'BATTLEMENT') {
      c.x = c.battRef.x + c.relX; c.y = gY - c.battRef.height;
    } else if (c.place === 'GROUND') {
      c.x -= worldShift; c.y = gY;
    } else if (c.place === 'CARRIED') {
      c.x = dragon.x + 2; c.y = dragon.y + 64;
      c.carryT++;
      if (!isFlapLockActive && c.carryT >= CHEST_AUTO_DROP) dropCarriedChest();
      continue;
    } else if (c.place === 'FALLING') {
      const prevY = c.y;
      c.x -= worldShift;
      c.vy += 0.38;
      c.y += c.vy;
      chestKillsBelow(c);
      // tower tops
      for (let o = 0; o < obstacles.length; o++) {
        const obs = obstacles[o];
        if (c.x > obs.x && c.x < obs.x + obs.width && prevY <= obs.bottomY && c.y >= obs.bottomY) {
          c.y = obs.bottomY; c.place = 'TOWER'; c.obsRef = obs; c.relX = c.x - obs.x;
          if (c.kind === 'LOCKED' && obs.bottomY - c.dropY >= CHEST_BREAK_HEIGHT) {
            c.kind = 'TREASURE';
            sound.towerDestroy();
            for (let p = 0; p < 20; p++) particles.push({ x: c.x, y: c.y - 8, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, size: 3 + Math.random() * 3, life: 30, color: Math.random() < 0.5 ? '#6b4423' : '#f1c40f' });
            floatingTexts.push({ x: c.x - 40, y: c.y - 40, text: 'CHEST SMASHED!', color: '#f1c40f', alpha: 1.0, vy: -1.2 });
            showTreasureFX('CHEST SMASHED!', 'GRAB THE TREASURE!');
          } else {
            sound.knightHit();
            if (c.kind === 'LOCKED') floatingTexts.push({ x: c.x - 40, y: c.y - 36, text: 'TOO LOW!', color: '#bdc3c7', alpha: 1.0, vy: -1.0 });
          }
          break;
        }
      }
      if (c.place === 'FALLING') {
        for (let b = 0; b < battlements.length; b++) {
          const bt = battlements[b];
          const top = gY - bt.height;
          if (c.x > bt.x && c.x < bt.x + bt.width && prevY <= top && c.y >= top) {
            c.y = top;
            if (c.kind === 'LOCKED') {
              // a locked chest bursts open on a battlement and pays out right away
              chestBreakBurst(c);
              grantTreasure(TREASURE_BONUS, TREASURE_MULT, TREASURE_SECS, c.x, c.y, 'CHEST BROKEN');
              c.gone = true;
            } else {
              c.place = 'BATTLEMENT'; c.battRef = bt; c.relX = c.x - bt.x;
              sound.knightHit();
            }
            break;
          }
        }
      }
      if (c.place === 'FALLING' && c.y >= gY) {
        c.y = gY;
        if (c.kind === 'LOCKED') {
          // a locked chest that hits the ground bursts open and pays out right away
          chestBreakBurst(c);
          grantTreasure(TREASURE_BONUS, TREASURE_MULT, TREASURE_SECS, c.x, c.y, 'CHEST BROKEN');
          chests.splice(i, 1);
          continue;
        }
        c.place = 'GROUND';
        sound.knightHit();
      }
    }

    if (c.x < -60) { chests.splice(i, 1); continue; }

    // the dragon touches a chest that is resting somewhere
    if (state === 'PLAYING' && c.place !== 'FALLING' && Math.hypot(dragon.x - c.x, dragon.y - (c.y - CHEST_H / 2)) < dragon.size / 2 + CHEST_W * 0.4) {
      if (c.kind === 'OPEN') {
        grantTreasure(OPEN_CHEST_BONUS, OPEN_CHEST_MULT, OPEN_CHEST_SECS, c.x, c.y, 'TREASURE');
        chests.splice(i, 1);
      } else if (c.kind === 'TREASURE') {
        grantTreasure(TREASURE_BONUS, TREASURE_MULT, TREASURE_SECS, c.x, c.y, 'JACKPOT');
        chests.splice(i, 1);
      } else if (c.kind === 'LOCKED' && !carriedChest) {
        c.place = 'CARRIED'; c.carryT = 0; c.obsRef = null; c.battRef = null;
        carriedChest = c;
        setFireButtonDrop(true);
        sound.flap();
        floatingTexts.push({ x: dragon.x - 40, y: dragon.y - 40, text: isFlapLockActive ? 'PRESS DROP!' : 'DROP IT HIGH!', color: '#f1c40f', alpha: 1.0, vy: -1.2 });
      }
    }
  }
}

function drawChest(c) {
  if (c.place === 'CARRIED' && !isFlapLockActive && c.carryT > CHEST_AUTO_DROP - CHEST_FLASH_FRAMES) {
    if (Math.floor(c.carryT / 4) % 2 === 0) return;   // flash before it falls
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(CHEST_SCALE, CHEST_SCALE);
  const cx = 0, cy = 0;
  const x = -CHEST_BASE_W / 2, y = -CHEST_BASE_H;
  if (c.kind === 'TREASURE') {
    // smashed planks and a heap of gold
    ctx.fillStyle = '#6b4423';
    ctx.save(); ctx.translate(x + 3, cy - 3); ctx.rotate(-0.4); ctx.fillRect(0, 0, 12, 3); ctx.restore();
    ctx.save(); ctx.translate(x + 15, cy - 2); ctx.rotate(0.5); ctx.fillRect(0, 0, 12, 3); ctx.restore();
    const shine = 0.5 + 0.5 * Math.sin(Date.now() / 150);
    const gl = ctx.createRadialGradient(cx, cy - 8, 2, cx, cy - 8, 30);
    gl.addColorStop(0, 'rgba(255,220,90,' + (0.5 + 0.3 * shine) + ')');
    gl.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - 30, cy - 38, 60, 40);
    ctx.fillStyle = '#d4a017';
    ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.quadraticCurveTo(cx, cy - 22, cx + 14, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7d65a';
    for (let i = 0; i < 9; i++) { const a = i * 2.4; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (3 + i), cy - 4 - (i % 3) * 3, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(cx - 3, cy - 12, 3, 3);
    ctx.fillStyle = '#3498db'; ctx.fillRect(cx + 4, cy - 8, 3, 3);
    ctx.fillStyle = '#ffffff'; if (shine > 0.8) { ctx.fillRect(cx + 1, cy - 16, 1, 4); ctx.fillRect(cx - 1, cy - 14, 5, 1); }
    ctx.restore();
    return;
  }

  // chest body
  ctx.fillStyle = '#2a1608'; ctx.fillRect(x - 1, y + 5, CHEST_BASE_W + 2, CHEST_BASE_H - 4);
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(x, y + 6, CHEST_BASE_W, CHEST_BASE_H - 6);
  ctx.fillStyle = '#5a3416'; ctx.fillRect(x, y + 11, CHEST_BASE_W, 1); ctx.fillRect(x, y + 15, CHEST_BASE_W, 1);
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(x + 3, y + 6, 2, CHEST_BASE_H - 6); ctx.fillRect(x + CHEST_BASE_W - 5, y + 6, 2, CHEST_BASE_H - 6);

  if (c.kind === 'OPEN') {
    // lid flipped open, gold spilling over the front
    ctx.fillStyle = '#2a1608'; ctx.fillRect(x - 1, y - 6, CHEST_BASE_W + 2, 8);
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x, y - 5, CHEST_BASE_W, 6);
    const shine = 0.5 + 0.5 * Math.sin(Date.now() / 160);
    const gl = ctx.createRadialGradient(cx, y + 6, 2, cx, y + 6, 22);
    gl.addColorStop(0, 'rgba(255,220,90,' + (0.45 + 0.3 * shine) + ')');
    gl.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - 22, y - 16, 44, 36);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.ellipse(cx, y + 6, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7d65a';
    [[-6, 5], [-1, 3], [5, 5], [9, 8], [11, 12], [12, 16], [-9, 8]].forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0], y + p[1], 1.8, 0, Math.PI * 2); ctx.fill(); });
  } else {
    // closed, banded lid with a padlock
    ctx.fillStyle = '#2a1608'; ctx.fillRect(x - 1, y - 1, CHEST_BASE_W + 2, 8);
    ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.quadraticCurveTo(cx, y - 3, x + CHEST_BASE_W, y + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8b8b8'; ctx.fillRect(x + 3, y + 1, 2, 5); ctx.fillRect(x + CHEST_BASE_W - 5, y + 1, 2, 5);
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(cx - 3, y + 7, 6, 6);
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, y + 7, 2.2, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#2a1608'; ctx.fillRect(cx - 0.5, y + 9, 1, 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// hooks called from main.js
// ---------------------------------------------------------------------
// During the level-clear celebration only the positions are kept in step with the scrolling world
// (no payouts or knight kills): chests stay on their towers and battlements, a carried one stays with the dragon.
function chestsFollowWorld(shift) {
  const gY = height - groundHeight;
  chests.forEach(c => {
    if (c.place === 'TOWER' && c.obsRef) { c.x = c.obsRef.x + c.relX; c.y = c.obsRef.bottomY; }
    else if (c.place === 'BATTLEMENT' && c.battRef) { c.x = c.battRef.x + c.relX; c.y = gY - c.battRef.height; }
    else if (c.place === 'CARRIED') { c.x = dragon.x + 2; c.y = dragon.y + 64; }
    else if (c.place === 'FALLING') {
      c.x -= shift; c.vy += 0.38; c.y += c.vy;
      if (c.y >= gY) { c.y = gY; c.vy = 0; c.place = 'GROUND'; }
    }
    else c.x -= shift;
  });
}

function updateLevelExtras(worldShift) {
  if (treasureMultTimer > 0) treasureMultTimer--;
  updateSmallKnights();
  updateGoldKnights(worldShift);
  updateChests(worldShift);
}

// Chests are drawn before everyone standing near them (main.js calls this right after the battlements),
// so a guard next to a treasure is always visible in front of it.
function drawLevelChests() {
  chests.forEach(c => { if (c.place !== 'CARRIED') drawChest(c); });
}

function drawLevelExtras() {
  smallKnights.forEach(drawSmallKnight);
  goldKnights.forEach(g => { if (g.state === 'ON_TOWER' || g.state === 'DEAD' || g.state === 'FALLING') drawGoldKnight(g); });
}

// things hanging from / held by the dragon, drawn after it
function drawDragonCarried() {
  goldKnights.forEach(g => { if (g.state === 'CARRIED') drawGoldKnight(g); });
  if (carriedChest) drawChest(carriedChest);
  drawGoldShieldOnDragon();
}

function drawExtrasHUD() {
  if (treasureMultTimer <= 0) return;
  const secs = Math.ceil(treasureMultTimer / 60);
  const pulse = treasureMultTimer < 180 && Math.floor(treasureMultTimer / 10) % 2 === 0;
  ctx.save();
  ctx.font = 'bold 18px "Proxima Nova", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(width / 2 - 70, 64, 140, 26);
  ctx.fillStyle = pulse ? '#ffffff' : '#f1c40f';
  ctx.fillText('💰 ' + treasureMult + 'x  ' + secs + 's', width / 2, 83);
  ctx.restore();
}

// ---------------------------------------------------------------------
// Full-screen treasure celebration (about one second)
// ---------------------------------------------------------------------
const TREASURE_FX_FRAMES = 66;
let treasureFX = null;

function showTreasureFX(title, sub) {
  const coins = [];
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
    coins.push({ x: width / 2, y: height * 0.42, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, spin: Math.random() * 6, r: 4 + Math.random() * 4, gem: Math.random() < 0.15 ? (Math.random() < 0.5 ? '#e74c3c' : '#3498db') : null });
  }
  treasureFX = { t: 0, title: title, sub: sub, coins: coins };
}

function drawTreasureFX() {
  const fx = treasureFX;
  if (!fx) return;
  fx.t++;
  const p = fx.t / TREASURE_FX_FRAMES;
  if (p >= 1) { treasureFX = null; return; }
  const fade = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
  ctx.save();

  // golden flash + rays from the center
  const cx = width / 2, cy = height * 0.42;
  ctx.globalAlpha = 0.35 * fade * (1 - p * 0.6);
  const gl = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.7);
  gl.addColorStop(0, 'rgba(255,230,120,0.9)');
  gl.addColorStop(1, 'rgba(255,190,40,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.25 * fade;
  ctx.fillStyle = '#fff3b0';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + fx.t * 0.02;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - 0.07) * width, cy + Math.sin(a - 0.07) * width);
    ctx.lineTo(cx + Math.cos(a + 0.07) * width, cy + Math.sin(a + 0.07) * width);
    ctx.closePath();
    ctx.fill();
  }

  // spinning coins and gems bursting out and falling
  ctx.globalAlpha = fade;
  fx.coins.forEach(c => {
    c.x += c.vx; c.y += c.vy; c.vy += 0.35; c.vx *= 0.99; c.spin += 0.3;
    const sx = Math.abs(Math.cos(c.spin));
    if (c.gem) {
      ctx.fillStyle = c.gem;
      ctx.beginPath(); ctx.moveTo(c.x, c.y - c.r); ctx.lineTo(c.x + c.r * 0.8, c.y); ctx.lineTo(c.x, c.y + c.r); ctx.lineTo(c.x - c.r * 0.8, c.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(c.x - 1, c.y - c.r * 0.6, 2, 2);
    } else {
      ctx.fillStyle = '#b8860b';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * sx + 0.8, c.r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7d65a';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, Math.max(0.3, c.r * sx - 0.6), c.r - 1, 0, 0, Math.PI * 2); ctx.fill();
      if (sx > 0.6) { ctx.fillStyle = '#fff6c8'; ctx.fillRect(c.x - c.r * 0.3, c.y - c.r * 0.5, 1.5, c.r * 0.6); }
    }
  });

  // title pops in, then settles
  const pop = p < 0.18 ? 0.4 + (p / 0.18) * 0.8 : (p < 0.3 ? 1.2 - ((p - 0.18) / 0.12) * 0.2 : 1);
  ctx.translate(cx, cy);
  ctx.scale(pop, pop);
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px "Proxima Nova", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#5a3a00';
  ctx.strokeText(fx.title, 0, 0);
  const tg = ctx.createLinearGradient(0, -30, 0, 6);
  tg.addColorStop(0, '#fff6c8');
  tg.addColorStop(0.5, '#f7d65a');
  tg.addColorStop(1, '#d48a10');
  ctx.fillStyle = tg;
  ctx.fillText(fx.title, 0, 0);
  ctx.font = 'bold 20px "Proxima Nova", sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeText(fx.sub, 0, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(fx.sub, 0, 32);
  ctx.restore();
}
