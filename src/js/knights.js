// knights.js — Small armored knights (level 4+), gold knights (level 5+) and the gold shield the dragon can win
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

let smallKnights = [];
let goldKnights = [];
const goldShield = { held: false, drop: null };   // drop: falling shield animation after a collision

// ---- small knight tuning ----
const SK_BURN_FRAMES = 120;       // continuous fire contact needed to kill one (resets when contact breaks)
const SK_THRUST_RANGE = 120;      // starts a spear thrust when the dragon is this close
const SK_THRUST_FRAMES = 24;
const SK_THRUST_COOLDOWN = 100;
const SK_POINTS = 25;

// ---- gold knight tuning ----
const GK_TRIGGER_RANGE = 300;     // acts while the dragon is still far away
const GK_PREP_FRAMES = 45;        // glowing wind-up before each action
const GK_PROTECT_FRAMES = 80;
const GK_ATTACK_FRAMES = 34;
const GK_COOLDOWN = 170;          // frames before it can act again
const GK_CARRY_FRAMES = 70;       // how long the dragon carries a grabbed knight
const GK_POINTS = 100;
const GK_SWORD_LEN = 42;
const GK_ACTION_ORDER = ['ATTACK', 'PROTECT', 'CHARGE'];   // always swing first, shield second (easier to grab)
const GK_CHARGE_PREP_FRAMES = 32;
const GK_CHARGE_FRAMES = 60;
const GK_CHARGE_SPEED = 3.4;

// Is fire touching this spot on a tower top? (burning/charred tower, surface flames, or breath flames)
function fireTouching(obs, x, y) {
  if (!obs) return false;
  if (obs.isCharred || obs.charProgress > 0) return true;
  for (let i = 0; i < obs.surfaceFlames.length; i++) {
    const sf = obs.surfaceFlames[i];
    if (Math.abs(obs.x + sf.relX - x) < 12 + sf.width * 0.35) return true;
  }
  for (let i = 0; i < flames.length; i++) {
    const f = flames[i];
    if (Math.abs(f.x - x) < 16 && Math.abs(f.y - y) < 22) return true;
  }
  return false;
}

function heatSmoke(x, y, amount) {
  if (Math.random() < amount) {
    particles.push({
      x: x + (Math.random() - 0.5) * 14, y: y,
      vx: (Math.random() - 0.5) * 0.8, vy: -0.8 - Math.random() * 1.2,
      size: 3 + Math.random() * 4, life: 40,
      color: 'rgba(60,60,66,0.75)', isSmoke: true
    });
  }
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t));
  const g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t));
  const bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * t));
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

// =====================================================================
// SMALL KNIGHTS
// =====================================================================
function spawnSmallKnights(obs) {
  // small and medium towers hold one; the longest towers hold 1-3
  const count = obs.type === 'mega' ? 1 + Math.floor(Math.random() * 3) : 1;
  for (let i = 0; i < count; i++) {
    smallKnights.push({
      obsRef: obs,
      relX: count === 1 ? 8 + Math.random() * Math.max(4, obs.width - 34) : 20 + (i + Math.random() * 0.6) * ((obs.width - 60) / count),
      direction: Math.random() < 0.5 ? 1 : -1,
      state: 'ALIVE',
      heat: 0,
      thrustT: 0,
      cooldown: 30 + Math.random() * 60,
      aim: -Math.PI / 2,
      deathT: 0
    });
  }
}

function killSmallKnight(k, how) {
  if (k.state !== 'ALIVE') return;
  k.state = how === 'crush' ? 'CRUSHED' : 'DYING';
  k.deathT = 0;
  gameStats.villagersKilled++;
  sound.knightHit();
  const kx = k.obsRef.x + k.relX + 11;
  const r = addScore(SK_POINTS);
  floatingTexts.push({ x: kx - 20, y: k.obsRef.bottomY - 40, text: 'KNIGHT! +' + r.totalPts, color: '#ff9f43', alpha: 1.0, vy: -1.4 });
}

function updateSmallKnights() {
  for (let i = smallKnights.length - 1; i >= 0; i--) {
    const k = smallKnights[i];
    const obs = k.obsRef;
    if (!obs || obs.x + obs.width < -80) { smallKnights.splice(i, 1); continue; }
    if (k.state !== 'ALIVE') { k.deathT++; continue; }

    const kx = obs.x + k.relX + 11;
    const ky = obs.bottomY - 14;
    const dx = dragon.x - kx, dy = dragon.y - (ky - 6);
    const dist = Math.hypot(dx, dy);

    // invincible (Khaleesi riding): crushed on touch
    if (khaleesiMounted && state === 'PLAYING' && Math.hypot(dragon.x - kx, dragon.y - (ky - 4)) < dragon.size / 2 + 14) {
      killSmallKnight(k, 'crush');
      continue;
    }

    // armor heats while fire touches it; cools instantly when it doesn't
    if (fireTouching(obs, kx, ky)) {
      k.heat++;
      heatSmoke(kx, ky - 14, 0.15 + 0.6 * (k.heat / SK_BURN_FRAMES));
      if (k.heat >= SK_BURN_FRAMES) { killSmallKnight(k, 'fire'); continue; }
    } else {
      k.heat = 0;
    }

    if (k.cooldown > 0) k.cooldown--;
    if (k.deflectT > 0) k.deflectT--;
    if (dist < SK_THRUST_RANGE * 1.6) k.direction = dx >= 0 ? 1 : -1;

    if (k.thrustT > 0) {
      // track the dragon while thrusting (only upward / sideways)
      const target = Math.atan2(dy, dx);
      k.aim = Math.max(-Math.PI + 0.1, Math.min(-0.1, target > Math.PI / 2 ? -Math.PI + 0.1 : (target > 0 ? -0.1 : target)));
      k.thrustT--;
      const tip = smallKnightSpearTip(k, kx, ky);
      if (!khaleesiMounted && Math.hypot(dragon.x - tip.x, dragon.y - tip.y) < dragon.size / 2 - 4) {
        if (dragonShielded()) {
          // the spear glances off the shield and is knocked away
          shieldDeflect(tip.x, tip.y);
          k.deflectT = 18;
          k.thrustT = 0;
        } else triggerHit();
      }
      if (k.thrustT === 0) k.cooldown = SK_THRUST_COOLDOWN;
    } else {
      if (dist < SK_THRUST_RANGE && k.cooldown <= 0) {
        k.thrustT = SK_THRUST_FRAMES;
        k.blocked = false;
        sound.whoosh();
      } else {
        k.relX += k.direction * 0.25;
        if (k.relX < 4) { k.relX = 4; k.direction = 1; }
        if (k.relX > obs.width - 26) { k.relX = obs.width - 26; k.direction = -1; }
      }
      const target = Math.atan2(dy, dx);
      k.aim = Math.max(-Math.PI + 0.3, Math.min(-0.3, target > Math.PI / 2 ? -Math.PI + 0.3 : (target > 0 ? -0.3 : target)));
    }
  }
}

function smallKnightSpearTip(k, kx, ky) {
  const ext = k.thrustT > 0 ? Math.sin((1 - k.thrustT / SK_THRUST_FRAMES) * Math.PI) * 26 : 0;
  const sx = kx + k.direction * 3, sy = ky - 8;
  const len = 22 + ext;
  return { x: sx + Math.cos(k.aim) * len, y: sy + Math.sin(k.aim) * len, sx: sx, sy: sy, ext: ext };
}

function drawSmallKnight(k) {
  const obs = k.obsRef;
  const kx0 = obs.x + k.relX;                 // left of the 22px box
  const ky0 = obs.bottomY - 26;               // feet at ky0 + 26
  const gY = height - groundHeight;

  if (k.state === 'DYING' || k.state === 'CRUSHED') {
    // glowing slag that cools into a dark heap
    const t = Math.min(1, k.deathT / 40);
    ctx.fillStyle = lerpColor('#ff5a1f', '#3a3f45', t);
    ctx.beginPath(); ctx.ellipse(kx0 + 11, ky0 + 24, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lerpColor('#ffb347', '#59616a', t);
    ctx.fillRect(kx0 + 5, ky0 + 18, 6, 5);
    ctx.beginPath(); ctx.arc(kx0 + 16, ky0 + 20, 4, 0, Math.PI * 2); ctx.fill();
    if (k.state === 'DYING' && k.deathT < 30) heatSmoke(kx0 + 11, ky0 + 16, 0.4);
    return;
  }

  const heatT = Math.min(1, k.heat / SK_BURN_FRAMES);
  const steel = lerpColor('#a7b1ba', '#ff3b1f', heatT);
  const steelDark = lerpColor('#5d6770', '#a01a0a', heatT);
  const steelLight = lerpColor('#e3e9ee', '#ffd27a', heatT);
  const out = '#15181c';
  const walk = Math.sin(Date.now() / 160 + k.relX) * (k.thrustT > 0 ? 0 : 1.4);

  if (heatT > 0) {
    const glow = ctx.createRadialGradient(kx0 + 11, ky0 + 10, 2, kx0 + 11, ky0 + 10, 24);
    glow.addColorStop(0, 'rgba(255,90,30,' + (0.45 * heatT) + ')');
    glow.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(kx0 - 14, ky0 - 14, 50, 50);
  }

  withFacing(kx0, ky0, k.direction, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(11, 26, 9, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    // legs (greaves + sabatons)
    ctx.fillStyle = out;
    ctx.fillRect(6 - walk, 16, 5, 10); ctx.fillRect(11 + walk, 16, 5, 10);
    ctx.fillStyle = steelDark; ctx.fillRect(7 - walk, 17, 3, 8);
    ctx.fillStyle = steel; ctx.fillRect(12 + walk, 17, 3, 8);
    ctx.fillStyle = steelLight; ctx.fillRect(12 + walk, 17, 1, 6);
    // breastplate + tabard stripe + fauld
    ctx.fillStyle = out; ctx.fillRect(5, 4, 13, 14);
    ctx.fillStyle = steel; ctx.fillRect(6, 5, 11, 12);
    ctx.fillStyle = steelDark; ctx.fillRect(6, 5, 3, 12); ctx.fillRect(6, 14, 11, 1);
    ctx.fillStyle = steelLight; ctx.fillRect(13, 6, 2, 6);
    ctx.fillStyle = '#8e1b1b'; ctx.fillRect(10, 5, 3, 12);
    // pauldrons
    ctx.fillStyle = steelLight; ctx.fillRect(4, 4, 4, 3); ctx.fillRect(15, 4, 4, 3);
    // great helm with visor slit and plume
    ctx.fillStyle = out; ctx.fillRect(6, -6, 11, 11);
    ctx.fillStyle = steel; ctx.fillRect(7, -5, 9, 9);
    ctx.fillStyle = steelDark; ctx.fillRect(7, -5, 2, 9);
    ctx.fillStyle = steelLight; ctx.fillRect(13, -5, 2, 4);
    ctx.fillStyle = '#0b0d10'; ctx.fillRect(10, -2, 7, 2);
    ctx.fillStyle = heatT > 0.4 ? '#ffdd66' : '#0b0d10'; ctx.fillRect(14, 1, 1, 2);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(9, -9, 4, 3); ctx.fillRect(7, -8, 3, 2);
    // round shield on the near arm: boss, rim and a cross
    const sx = 6, sy = 11;
    ctx.fillStyle = out; ctx.beginPath(); ctx.arc(sx, sy, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lerpColor('#2c5aa0', '#c0392b', heatT); ctx.beginPath(); ctx.arc(sx, sy, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = steelLight; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(sx - 0.5, sy - 5, 1, 10); ctx.fillRect(sx - 5, sy - 0.5, 10, 1);
    ctx.fillStyle = steelLight; ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
  });

  // spear in world space so it can track the dragon; after a shield block it is knocked back and wobbles
  const realAim = k.aim;
  if (k.deflectT > 0) {
    const d = k.deflectT / 18;
    k.aim = realAim - k.direction * 0.9 * d + Math.sin(k.deflectT * 1.7) * 0.25 * d;
  }
  const tip = smallKnightSpearTip(k, kx0 + 11, ky0 + 14);
  k.aim = realAim;
  const drawAim = Math.atan2(tip.y - tip.sy, tip.x - tip.sx);
  const back = { x: tip.sx - Math.cos(drawAim) * 12, y: tip.sy - Math.sin(drawAim) * 12 };
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(drawAim);
  ctx.fillStyle = steelLight;
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-2, -2.6); ctx.lineTo(-2, 2.6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // gauntlet on the shaft
  ctx.fillStyle = steelDark;
  ctx.fillRect(tip.sx - 2, tip.sy - 2, 4, 4);
  if (k.thrustT > 0 && tip.ext > 12) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tip.x - Math.cos(k.aim) * 10, tip.y - Math.sin(k.aim) * 10 - 3); ctx.lineTo(tip.x, tip.y - 3); ctx.stroke();
  }
}

// =====================================================================
// GOLD KNIGHTS
// =====================================================================
// Khaleesi explains gold knights and the shield on the first encounter, then only now and then.
const GK_TALK_REPEAT_CHANCE = 0.15;
let gkTalkSeen = { spot: false, shield: false };
function goldKnightTalk(key, text, dur) {
  if (gkTalkSeen[key] && Math.random() > GK_TALK_REPEAT_CHANCE) return;
  gkTalkSeen[key] = true;
  showKhaleesiBanner(text, dur);
}

function maybeSpawnGoldKnight(obs) {
  if (goldKnights.some(g => g.state === 'ON_TOWER' || g.state === 'CARRIED' || g.state === 'FALLING')) return;
  if (Math.random() > 0.4) return;
  goldKnights.push({
    obsRef: obs,
    relX: obs.width * (0.35 + Math.random() * 0.3),
    direction: Math.random() < 0.5 ? 1 : -1,
    state: 'ON_TOWER',
    mode: 'WALK',            // WALK | PREP_PROTECT | PROTECT | PREP_ATTACK | ATTACK
    t: 0,
    cooldown: 60,
    heat: 0,
    x: 0, y: 0, vy: 0, rot: 0, deathT: 0, landObs: null, landRel: 0
  });
  goldKnightTalk('spot', 'A golden knight! Grab it when its guard is down!', 200);
}

function goldKnightBusy(g) { return g.mode !== 'WALK'; }

function goldKnightSwordAngle(g) {
  // ATTACK: swing from behind the back, over the head, down in front
  const p = Math.min(1, g.t / GK_ATTACK_FRAMES);
  return -Math.PI * 0.95 + p * Math.PI * 1.05;
}

function updateGoldKnights(worldShift) {
  const gY = height - groundHeight;
  for (let i = goldKnights.length - 1; i >= 0; i--) {
    const g = goldKnights[i];

    if (g.state === 'ON_TOWER') {
      const obs = g.obsRef;
      if (!obs || obs.x + obs.width < -80) { goldKnights.splice(i, 1); continue; }
      const kx = obs.x + g.relX + 11, ky = obs.bottomY - 18;
      const dx = dragon.x - kx;

      if (fireTouching(obs, kx, ky)) { g.heat = Math.min(1, g.heat + 0.04); heatSmoke(kx, ky - 22, 0.35); }
      else g.heat = Math.max(0, g.heat - 0.08);

      // invincible (Khaleesi riding): even a gold knight is knocked off its tower on touch
      if (khaleesiMounted && state === 'PLAYING' && Math.hypot(dragon.x - kx, dragon.y - (ky - 6)) < dragon.size / 2 + 18) {
        g.state = 'FALLING'; g.x = kx; g.y = ky; g.vy = -5; g.rot = 0;
        sound.knightHit();
        continue;
      }

      if (g.cooldown > 0) g.cooldown--;
      g.t++;
      switch (g.mode) {
        case 'WALK':
          g.relX += g.direction * 0.3;
          if (g.relX < 6) { g.relX = 6; g.direction = 1; }
          if (g.relX > obs.width - 30) { g.relX = obs.width - 30; g.direction = -1; }
          if (g.cooldown <= 0 && Math.abs(dx) < GK_TRIGGER_RANGE && dragon.x < kx + 60) {
            // fixed order: sword swing first, shield second, then a charge, and repeat
            g.direction = dx >= 0 ? 1 : -1;
            g.mode = 'PREP_' + GK_ACTION_ORDER[(g.actionIdx || 0) % GK_ACTION_ORDER.length];
            g.actionIdx = (g.actionIdx || 0) + 1;
            g.t = 0;
          }
          break;
        case 'PREP_PROTECT':
          if (g.t >= GK_PREP_FRAMES) { g.mode = 'PROTECT'; g.t = 0; }
          break;
        case 'PREP_ATTACK':
          g.direction = dx >= 0 ? 1 : -1;
          if (g.t >= GK_PREP_FRAMES) { g.mode = 'ATTACK'; g.t = 0; g.blocked = false; sound.whoosh(); }
          break;
        case 'PREP_CHARGE':
          g.direction = dx >= 0 ? 1 : -1;
          if (g.t % 6 === 0) particles.push({ x: kx - g.direction * 10, y: obs.bottomY - 2, vx: -g.direction * (1 + Math.random()), vy: -0.6, size: 3 + Math.random() * 3, life: 20, color: 'rgba(150,140,120,0.7)', isSmoke: true });
          if (g.t >= GK_CHARGE_PREP_FRAMES) { g.mode = 'CHARGE'; g.t = 0; g.blocked = false; sound.whoosh(); }
          break;
        case 'PROTECT':
          if (g.t >= GK_PROTECT_FRAMES) { g.mode = 'WALK'; g.t = 0; g.cooldown = GK_COOLDOWN; }
          break;
        case 'ATTACK': {
          // the blade hurts the dragon anywhere along its arc
          const a = goldKnightSwordAngle(g);
          const hx = kx + g.direction * 2, hy = ky - 14;
          const dirX = Math.cos(a) * g.direction, dirY = Math.sin(a);
          for (let s = 10; s <= GK_SWORD_LEN; s += 8) {
            if (!khaleesiMounted && Math.hypot(dragon.x - (hx + dirX * s), dragon.y - (hy + dirY * s)) < dragon.size / 2 - 2) {
              if (dragonShielded()) { if (!g.blocked) { g.blocked = true; shieldDeflect(hx + dirX * s, hy + dirY * s); } }
              else triggerHit();
              break;
            }
          }
          if (g.t >= GK_ATTACK_FRAMES) { g.mode = 'WALK'; g.t = 0; g.cooldown = GK_COOLDOWN; }
          break;
        }
        case 'CHARGE': {
          // sprint along the tower top with the sword thrust forward
          g.relX += g.direction * GK_CHARGE_SPEED;
          let stop = g.t >= GK_CHARGE_FRAMES;
          if (g.relX < 6) { g.relX = 6; stop = true; }
          if (g.relX > obs.width - 30) { g.relX = obs.width - 30; stop = true; }
          if (g.t % 3 === 0) particles.push({ x: kx - g.direction * 8, y: obs.bottomY - 2, vx: -g.direction * 1.5, vy: -0.5, size: 3 + Math.random() * 3, life: 18, color: 'rgba(150,140,120,0.7)', isSmoke: true });
          const hx = kx + g.direction * 4, hy = ky - 10;
          for (let s = 8; s <= GK_SWORD_LEN; s += 8) {
            const px = hx + g.direction * s, py = hy - s * 0.1;
            if (!khaleesiMounted && Math.hypot(dragon.x - px, dragon.y - py) < dragon.size / 2) {
              if (dragonShielded()) {
                if (!g.blocked) { g.blocked = true; shieldDeflect(px, py); g.relX -= g.direction * 14; stop = true; }
              } else triggerHit();
              break;
            }
          }
          if (stop) { g.mode = 'WALK'; g.t = 0; g.cooldown = GK_COOLDOWN; }
          break;
        }
      }

      // grab: only while it is not winding up or performing an action
      if (!goldKnightBusy(g) && state === 'PLAYING' && Math.hypot(dragon.x - kx, dragon.y - (ky - 6)) < dragon.size / 2 + 16) {
        g.state = 'CARRIED';
        g.t = 0;
        goldShield.held = true;
        goldShield.drop = null;
        sound.powerup();
        floatingTexts.push({ x: dragon.x - 30, y: dragon.y - 40, text: 'GOLD SHIELD!', color: '#f1c40f', alpha: 1.0, vy: -1.2 });
        goldKnightTalk('shield', 'That golden shield protects you, Cyndraxx! Arrows and spears can\'t hurt you now!', 260);
      }
    } else if (g.state === 'CARRIED') {
      g.t++;
      g.x = dragon.x;
      g.y = dragon.y + 34;
      if (g.t >= GK_CARRY_FRAMES) { g.state = 'FALLING'; g.vy = 1; g.rot = 0; }
    } else if (g.state === 'FALLING') {
      const prevY = g.y;
      g.x -= worldShift;
      g.vy += 0.42;
      g.y += g.vy;
      g.rot += 0.08;
      let landed = g.y >= gY - 4;
      let landY = gY - 4;
      for (let o = 0; o < obstacles.length && !landed; o++) {
        const obs = obstacles[o];
        if (g.x > obs.x && g.x < obs.x + obs.width && prevY <= obs.bottomY && g.y >= obs.bottomY) { landed = true; landY = obs.bottomY; g.landObs = obs; g.landRel = g.x - obs.x; }
      }
      if (landed) {
        g.y = landY;
        g.state = 'DEAD';
        g.deathT = 0;
        sound.towerDestroy();
        const r = addScore(GK_POINTS);
        floatingTexts.push({ x: g.x - 30, y: landY - 30, text: 'GOLD KNIGHT! +' + r.totalPts, color: '#f1c40f', alpha: 1.0, vy: -1.4 });
        for (let p = 0; p < 18; p++) {
          particles.push({ x: g.x, y: landY - 6, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, size: 2 + Math.random() * 3, life: 30, color: Math.random() < 0.6 ? '#f1c40f' : '#ffffff' });
        }
      }
    } else if (g.state === 'DEAD') {
      g.deathT++;
      if (g.landObs) g.x = g.landObs.x + g.landRel; else g.x -= worldShift;
      if (g.x < -80) goldKnights.splice(i, 1);
    }
  }
}

// The gold knight drawn in a 22 x 44 box (feet at y = 26), facing right, shield optional.
function drawGoldKnightFigure(g, withShield) {
  const heat = g.heat || 0;
  const gold = lerpColor('#f4c430', '#ff6a2a', heat);
  const goldDark = lerpColor('#a87a10', '#9e2a0e', heat);
  const goldLight = lerpColor('#fff1a8', '#ffd2a0', heat);
  const out = '#2a1c05';
  const crouch = g.mode === 'PROTECT' ? 6 : 0;
  const charging = g.mode === 'CHARGE' && g.state === 'ON_TOWER';
  const walk = g.state !== 'ON_TOWER' ? 0 : (charging ? Math.sin(Date.now() / 55) * 3 : (g.mode === 'WALK' ? Math.sin(Date.now() / 180 + g.relX) * 1.4 : 0));

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(11, 26, 12, 2.6, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(0, crouch);
  // legs
  ctx.fillStyle = out; ctx.fillRect(5 - walk, 12, 6, 14 - crouch); ctx.fillRect(12 + walk, 12, 6, 14 - crouch);
  ctx.fillStyle = goldDark; ctx.fillRect(6 - walk, 13, 4, 12 - crouch);
  ctx.fillStyle = gold; ctx.fillRect(13 + walk, 13, 4, 12 - crouch);
  // body: cuirass with engraved chevron
  ctx.fillStyle = out; ctx.fillRect(3, -4, 17, 18);
  ctx.fillStyle = gold; ctx.fillRect(4, -3, 15, 16);
  ctx.fillStyle = goldDark; ctx.fillRect(4, -3, 4, 16); ctx.fillRect(4, 10, 15, 2);
  ctx.fillStyle = goldLight; ctx.fillRect(13, -2, 3, 8);
  ctx.strokeStyle = goldDark; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(7, 1); ctx.lineTo(11.5, 5); ctx.lineTo(16, 1); ctx.stroke();
  // big pauldrons
  ctx.fillStyle = out; ctx.fillRect(1, -6, 7, 6); ctx.fillRect(15, -6, 7, 6);
  ctx.fillStyle = goldLight; ctx.fillRect(2, -5, 5, 4); ctx.fillRect(16, -5, 5, 4);
  // helm with crest
  ctx.fillStyle = out; ctx.fillRect(5, -18, 13, 13);
  ctx.fillStyle = gold; ctx.fillRect(6, -17, 11, 11);
  ctx.fillStyle = goldDark; ctx.fillRect(6, -17, 3, 11);
  ctx.fillStyle = goldLight; ctx.fillRect(13, -16, 2, 5);
  ctx.fillStyle = '#120c02'; ctx.fillRect(10, -13, 7, 2); ctx.fillRect(13, -11, 2, 3);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(9, -23, 5, 6); ctx.fillRect(6, -22, 4, 3);
  ctx.restore();

  if (withShield) drawGoldShieldShape(g, gold, goldDark, goldLight, out, crouch);
}

function drawGoldShieldShape(g, gold, goldDark, goldLight, out, crouch) {
  // shield position depends on the action
  let sx = 15, sy = 4, rot = 0, glow = 0;
  if (g.mode === 'PREP_PROTECT') { sx = 17; sy = -6; glow = 0.5 + 0.5 * Math.sin(Date.now() / 60); }
  else if (g.mode === 'PROTECT') { sx = 11; sy = -16 + crouch; rot = -Math.PI / 2; }
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rot);
  if (glow > 0) {
    const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    gl.addColorStop(0, 'rgba(255,240,150,' + (0.7 * glow) + ')');
    gl.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(-30, -30, 60, 60);
  }
  // large kite shield
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-9, -13); ctx.lineTo(9, -13); ctx.lineTo(9, 2);
    ctx.quadraticCurveTo(8, 12, 0, 18); ctx.quadraticCurveTo(-8, 12, -9, 2); ctx.closePath();
  };
  shape(); ctx.fillStyle = out; ctx.lineWidth = 3; ctx.strokeStyle = out; ctx.stroke();
  shape(); ctx.fillStyle = gold; ctx.fill();
  ctx.fillStyle = goldDark; ctx.fillRect(-9, -13, 4, 15);
  ctx.fillStyle = goldLight; ctx.fillRect(2, -11, 3, 10);
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = goldLight; ctx.fillRect(-0.6, -11, 1.2, 26); ctx.fillRect(-7, -0.6, 14, 1.2);
  ctx.restore();
}

function drawGoldKnightSword(g, kx0, ky0) {
  // two-handed greatsword, drawn in world space
  const crouch = g.mode === 'PROTECT' ? 6 : 0;
  const hx = kx0 + 11 + g.direction * 4, hy = ky0 + 8 + crouch;
  let a, glow = 0;
  if (g.mode === 'ATTACK') a = goldKnightSwordAngle(g);
  else if (g.mode === 'PREP_ATTACK') { a = -0.15; glow = 0.5 + 0.5 * Math.sin(Date.now() / 60); }
  else if (g.mode === 'PREP_CHARGE') { a = 0.12; glow = 0.5 + 0.5 * Math.sin(Date.now() / 45); }
  else if (g.mode === 'CHARGE') a = -0.1;
  else if (g.mode === 'PROTECT' || g.mode === 'PREP_PROTECT') a = 0.44;   // sword lowered, tip resting at its feet
  else a = -Math.PI * 0.62;                                                         // resting on the shoulder
  const dirX = Math.cos(a) * g.direction, dirY = Math.sin(a);
  const tipX = hx + dirX * GK_SWORD_LEN, tipY = hy + dirY * GK_SWORD_LEN;
  if (glow > 0) {
    ctx.strokeStyle = 'rgba(255,240,150,' + (0.5 * glow) + ')';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(hx + dirX * 8, hy + dirY * 8); ctx.lineTo(tipX, tipY); ctx.stroke();
  }
  if (g.mode === 'ATTACK') {
    // motion trail along the arc
    ctx.strokeStyle = 'rgba(255,230,140,0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    const a0 = -Math.PI * 0.95, steps = 8;
    for (let s = 0; s <= steps; s++) {
      const aa = a0 + (a - a0) * (s / steps);
      const px = hx + Math.cos(aa) * g.direction * (GK_SWORD_LEN - 4), py = hy + Math.sin(aa) * (GK_SWORD_LEN - 4);
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a1c05'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(hx + dirX * 6, hy + dirY * 6); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#f7d65a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(hx + dirX * 6, hy + dirY * 6); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(hx + dirX * 8, hy + dirY * 8 - 1); ctx.lineTo(tipX, tipY - 1); ctx.stroke();
  // crossguard + grip
  const px = -dirY, py = dirX;
  ctx.strokeStyle = '#a87a10'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(hx + dirX * 6 + px * 6, hy + dirY * 6 + py * 6); ctx.lineTo(hx + dirX * 6 - px * 6, hy + dirY * 6 - py * 6); ctx.stroke();
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(hx - dirX * 4, hy - dirY * 4); ctx.lineTo(hx + dirX * 5, hy + dirY * 5); ctx.stroke();
}

function drawGoldKnight(g) {
  if (g.state === 'ON_TOWER') {
    const obs = g.obsRef;
    const kx0 = obs.x + g.relX, ky0 = obs.bottomY - 26;
    if (g.heat > 0) {
      const gl = ctx.createRadialGradient(kx0 + 11, ky0, 2, kx0 + 11, ky0, 30);
      gl.addColorStop(0, 'rgba(255,110,40,' + (0.45 * g.heat) + ')');
      gl.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(kx0 - 20, ky0 - 30, 62, 62);
    }
    if (g.mode === 'CHARGE') {
      ctx.strokeStyle = 'rgba(255,240,180,0.45)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const ly = ky0 - 14 + i * 9, lx = kx0 + 11 - g.direction * (16 + (i % 2) * 8);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - g.direction * (14 + i * 3), ly); ctx.stroke();
      }
    }
    withFacing(kx0, ky0, g.direction, () => {
      if (g.mode === 'CHARGE') { ctx.translate(11, 26); ctx.rotate(0.18); ctx.translate(-11, -26); }
      else if (g.mode === 'PREP_CHARGE') { ctx.translate(0, 3); }
      drawGoldKnightFigure(g, true);
    });
    drawGoldKnightSword(g, kx0, ky0);
  } else if (g.state === 'CARRIED' || g.state === 'FALLING') {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.state === 'FALLING' ? g.rot : Math.sin(Date.now() / 90) * 0.2);
    ctx.translate(-11, -8);
    drawGoldKnightFigure(g, false);
    ctx.restore();
  } else if (g.state === 'DEAD') {
    ctx.save();
    ctx.translate(g.x, g.y - 6);
    ctx.rotate(Math.PI / 2);
    ctx.scale(0.8, 0.8);
    ctx.translate(-11, -10);
    ctx.globalAlpha = 0.9;
    drawGoldKnightFigure(g, false);
    ctx.restore();
  }
}

// =====================================================================
// GOLD SHIELD carried by the dragon: blocks arrows, boulders, spears and swords until the next obstacle hit
// =====================================================================
function dragonShielded() { return goldShield.held; }

// Use instead of triggerHit() for tower/battlement collisions: the shield takes the blow.
function obstacleHit() {
  if (goldShield.held && !khaleesiMounted) {
    if (invulnerableTimer > 0) return;
    goldShield.held = false;
    goldShield.drop = { x: dragon.x + 30, y: dragon.y + 6, vx: -2, vy: -3, rot: 0 };
    invulnerableTimer = 50;
    sound.knightHit();
    floatingTexts.push({ x: dragon.x - 30, y: dragon.y - 36, text: 'SHIELD LOST', color: '#f1c40f', alpha: 1.0, vy: -1.2 });
    return;
  }
  triggerHit();
}

function shieldBlockSpark(x, y) {
  for (let p = 0; p < 8; p++) {
    particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, size: 2 + Math.random() * 2, life: 16, color: Math.random() < 0.5 ? '#fff6c8' : '#f1c40f' });
  }
}

function drawGoldShieldOnDragon() {
  drawClangFX();
  // the held shield is drawn by drawDragon(); this only animates a dropped one
  const out = '#2a1c05';
  const d = goldShield.drop;
  if (d) {
    d.vy += 0.35; d.x += d.vx; d.y += d.vy; d.rot += 0.15;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.translate(-15, -4);
    drawGoldShieldShape({ mode: 'WALK' }, '#f4c430', '#a87a10', '#fff1a8', out, 0);
    ctx.restore();
    if (d.y > height + 40) goldShield.drop = null;
  }
}

// ---------------------------------------------------------------------
// Shield deflections: clang sound + starburst flash + sparks
// ---------------------------------------------------------------------
const clangFX = [];

function playShieldClang() {
  if (sound.muted) return;
  try {
    sound.init();
    const ac = sound.ctx, t = ac.currentTime;
    // bright metallic ring: a few inharmonic partials with a fast decay
    [[1250, 'triangle', 0.18], [1890, 'sine', 0.10], [2730, 'sine', 0.06], [420, 'square', 0.05]].forEach((p, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = p[1];
      o.frequency.setValueAtTime(p[0], t);
      o.frequency.exponentialRampToValueAtTime(p[0] * 0.94, t + 0.4);
      g.gain.setValueAtTime(p[2], t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (i === 3 ? 0.06 : 0.38 + i * 0.05));
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.5);
    });
  } catch (e) {}
}

function shieldDeflect(x, y) {
  playShieldClang();
  shieldBlockSpark(x, y);
  clangFX.push({ x: x, y: y, t: 0 });
}

function drawClangFX() {
  for (let i = clangFX.length - 1; i >= 0; i--) {
    const f = clangFX[i];
    f.t++;
    const p = f.t / 16;
    if (p >= 1) { clangFX.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#fff6c8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y, 4 + p * 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    const len = 6 + p * 14;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a); ctx.fillRect(0, -1, len, 2); ctx.restore();
    }
    ctx.restore();
  }
}
