// boss-intro.js — Cinematic between the level 3 fireworks and the siege-tower boss:
// the tower rumbles up behind a distant castle wall, smashes through it, and the dragon
// and Khaleesi react in alarm. Then triggerBossBattle() starts the fight. Tap to skip.
// Classic script: shares global scope with the other src/js/*.js files. Load order matters (see index.html).

const BI_FADE_IN = 30;     // fade in from the fireworks' black
const BI_SHAKE = 105;      // the wall starts shaking and cracking
const BI_BREAK = 160;      // the tower smashes through
const BI_ALARM = 215;      // "!" over the dragon, roar
const BI_TALK = 245;       // Khaleesi speaks
const BI_FADE_OUT = 420;   // fade to black...
const BI_END = 450;        // ...and the fight begins
const BI_LINE = '"By the gods... it smashed right through the wall! FLY, SYRAXX!"';

let bossIntro = null;

function startBossIntro() {
  bossClearWorld();
  bossResetState();
  bossState.active = false;
  particles = [];
  blackDebris = [];
  floatingTexts = [];
  khaleesiBannerTimer = 0;
  state = 'BOSS_INTRO';
  bossIntro = { t: 0, stones: [], shake: 0, homeX: width * 0.24, homeY: height * 0.42 };
  dragon.x = bossIntro.homeX;
  dragon.y = bossIntro.homeY;
  dragon.velocity = 0;
  dragon.vx = 0;
}

function skipBossIntro() {
  if (!bossIntro || bossIntro.t < 20) return;
  triggerBossBattle();
}

function bossIntroMusicOn() {
  return !!bossIntro && bossIntro.t >= BI_BREAK;
}

// How loud the wheel rumble should be right now (0..1). Called every frame from update().
function currentRumbleLevel() {
  if (khaleesiSplash) return 0;
  if (state === 'BOSS' && bossState.active) return 0.5 * Math.max(0, bossState.roll);
  if (state === 'BOSS_INTRO' && bossIntro) {
    const t = bossIntro.t;
    if (t < BI_FADE_IN) return 0;
    if (t < BI_BREAK) return 0.08 + 0.4 * (t - BI_FADE_IN) / (BI_BREAK - BI_FADE_IN);
    return Math.max(0.3, 0.7 - (t - BI_BREAK) * 0.004);
  }
  return 0;
}

// Camera shake for the whole scene, in px.
function sceneShake() {
  if (state === 'BOSS_INTRO' && bossIntro && bossIntro.shake > 0.3) {
    const s = bossIntro.shake;
    return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
  }
  if (state === 'BOSS' && bossState.active && bossState.bump > 1) {
    const s = bossState.bump * 0.4;
    return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
  }
  return null;
}

// ---- layout of the distant scene ----
function biLayout() {
  const gY = height - groundHeight;
  const g = bossGeom();
  const t = bossIntro.t;
  let s, cx;
  if (t < BI_BREAK) {
    // rolls in from the right behind the wall
    const p = Math.min(1, Math.max(0, (t - 20) / (BI_BREAK - 40)));
    const e = 1 - Math.pow(1 - p, 2);
    s = 0.28;
    cx = width * (1.12 - 0.42 * e);
  } else {
    // bursts through and keeps coming
    const p = Math.min(1, (t - BI_BREAK) / 160);
    const e = 1 - Math.pow(1 - p, 3);
    s = 0.28 + 0.12 * e;
    cx = width * (0.70 - 0.06 * e);
  }
  const wallH = height * 0.105;
  return {
    gY, g, s, cx,
    towerW: g.bw * s,
    wallX0: width * 0.40, wallX1: width + 10,
    wallTop: gY - wallH, wallH,
    gapX: width * 0.70
  };
}

function updateBossIntro() {
  const B = bossIntro;
  if (!B) return;
  B.t++;
  const t = B.t;
  const L = biLayout();

  backgroundParallaxX += 0.25;
  bossState.frame++;
  bossState.wheelAngle += (t < BI_BREAK ? 0.05 : 0.08);
  bossState.rumbleY = -Math.abs(Math.sin(t * 1.1)) * 1.4;
  B.shake *= 0.9;

  // the wall shakes as the tower hits it
  if (t >= BI_SHAKE && t < BI_BREAK) {
    B.shake = Math.max(B.shake, 1 + 4 * (t - BI_SHAKE) / (BI_BREAK - BI_SHAKE));
    if (t % 18 === 0) sound.hit();
    if (Math.random() < 0.35) {
      particles.push({
        x: L.gapX + (Math.random() - 0.5) * L.towerW * 1.2, y: L.wallTop + Math.random() * L.wallH,
        vx: (Math.random() - 0.5) * 0.8, vy: -0.3 - Math.random() * 0.6,
        size: 4 + Math.random() * 5, life: 30, color: 'rgba(150,140,120,0.5)', isSmoke: true
      });
    }
  }

  // CRASH
  if (t === BI_BREAK) {
    B.shake = 16;
    sound.towerDestroy();
    sound.boulderLaunch();
    cutsceneMusicAudio.currentTime = 0;
    for (let i = 0; i < 46; i++) {
      B.stones.push({
        x: L.gapX + (Math.random() - 0.5) * L.towerW * 1.1,
        y: L.wallTop + Math.random() * L.wallH,
        vx: -1 - Math.random() * 6 + (Math.random() < 0.25 ? 6 : 0),
        vy: -2 - Math.random() * 6,
        size: 3 + Math.random() * 7, grow: 1.004 + Math.random() * 0.01,
        rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.3,
        color: ['#5d6270', '#6e7380', '#4d525e', '#7d8290'][i % 4], landed: false, life: 200
      });
    }
    for (let i = 0; i < 26; i++) {
      particles.push({
        x: L.gapX + (Math.random() - 0.5) * L.towerW * 1.4, y: L.wallTop + Math.random() * L.wallH,
        vx: (Math.random() - 0.6) * 3, vy: -0.5 - Math.random() * 1.5,
        size: 10 + Math.random() * 16, life: 50 + Math.random() * 30,
        color: 'rgba(140,130,115,0.6)', isSmoke: true
      });
    }
  }

  // dust from the wheels once it's through
  if (t > BI_BREAK && Math.random() < 0.5) {
    particles.push({
      x: L.cx + (Math.random() - 0.5) * L.towerW, y: L.gY - 3,
      vx: -1 - Math.random() * 2, vy: -0.3 - Math.random() * 0.6,
      size: 4 + Math.random() * 6, life: 24, color: 'rgba(150,130,100,0.5)', isSmoke: true
    });
  }

  for (let i = B.stones.length - 1; i >= 0; i--) {
    const st = B.stones[i];
    st.life--;
    if (!st.landed) {
      st.vy += 0.3;
      st.x += st.vx;
      st.y += st.vy;
      st.rot += st.spin;
      st.size *= st.grow;
      if (st.y >= L.gY - st.size / 2 && st.vy > 0) { st.y = L.gY - st.size / 2; st.landed = true; }
    }
    if (st.life <= 0) B.stones.splice(i, 1);
  }

  // the dragon hovers; at the alarm it jolts back and flaps hard
  const alarmed = t >= BI_ALARM;
  if (t === BI_ALARM) {
    sound.fireRoar();
    dragon.wingState = 1;
  }
  const flapEvery = alarmed ? 12 : 26;
  if (t % flapEvery === 0) dragon.wingState = 1;
  const jolt = alarmed ? Math.max(0, 1 - (t - BI_ALARM) / 20) : 0;
  const backX = alarmed ? -width * 0.05 * Math.min(1, (t - BI_ALARM) / 25) : 0;
  dragon.x = B.homeX + backX;
  dragon.y = B.homeY + Math.sin(t * (alarmed ? 0.22 : 0.07)) * (alarmed ? 4 : 7) - jolt * 22;

  if (t >= BI_END) triggerBossBattle();
}

// A distant curtain wall, stone by stone. broken = gap where the tower came through.
function biDrawWall(L, broken) {
  const t = bossIntro.t;
  const wob = (t >= BI_SHAKE && t < BI_BREAK) ? (Math.random() - 0.5) * 2.5 : 0;
  const top = L.wallTop, h = L.wallH;
  const gapHalf = L.towerW * 0.62;
  const merlonW = Math.max(8, h * 0.18), merlonH = h * 0.2;

  const drawSpan = (x0, x1, jagLeft, jagRight) => {
    if (x1 <= x0) return;
    ctx.save();
    ctx.beginPath();
    // body with crenellations; jagged broken edges toward the gap
    ctx.moveTo(x0, L.gY);
    if (jagLeft) {
      for (let i = 0; i <= 6; i++) ctx.lineTo(x0 + hash2(i, 7) * 10 - 5 + (i % 2) * 6, L.gY - (h + merlonH) * i / 6);
    } else ctx.lineTo(x0, top);
    for (let x = x0; x < x1; x += merlonW * 2) {
      ctx.lineTo(x, top - merlonH);
      ctx.lineTo(Math.min(x1, x + merlonW), top - merlonH);
      ctx.lineTo(Math.min(x1, x + merlonW), top);
      ctx.lineTo(Math.min(x1, x + merlonW * 2), top);
    }
    if (jagRight) {
      for (let i = 6; i >= 0; i--) ctx.lineTo(x1 + hash2(i, 13) * 10 - 5 - (i % 2) * 6, L.gY - (h + merlonH) * i / 6);
    } else ctx.lineTo(x1, L.gY);
    ctx.closePath();
    ctx.fillStyle = '#4a4e5a';
    ctx.fill();
    ctx.clip();
    // stone courses
    const rowH = Math.max(5, h / 9);
    ctx.strokeStyle = 'rgba(20,22,30,0.55)';
    ctx.lineWidth = 1;
    for (let r = 0, y = L.gY; y > top - merlonH; r++, y -= rowH) {
      ctx.beginPath(); ctx.moveTo(x0 - 10, y); ctx.lineTo(x1 + 10, y); ctx.stroke();
      const sw = rowH * 2.2;
      for (let x = x0 - 10 + (r % 2) * sw / 2; x < x1 + 10; x += sw) {
        ctx.fillStyle = hash2(Math.round(x), r) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
        ctx.fillRect(x, y - rowH, sw, rowH);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - rowH); ctx.stroke();
      }
    }
    // a lit top edge and a few torch-lit windows
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x0 - 10, top, x1 - x0 + 20, 2);
    ctx.restore();
  };

  ctx.save();
  ctx.translate(wob, 0);
  if (!broken) {
    drawSpan(L.wallX0, L.wallX1, false, false);
    // cracks spread from where the tower is hitting
    if (t >= BI_SHAKE) {
      const p = (t - BI_SHAKE) / (BI_BREAK - BI_SHAKE);
      ctx.strokeStyle = 'rgba(10,10,15,0.85)';
      ctx.lineWidth = 1.5;
      for (let c = 0; c < 7; c++) {
        let x = L.gapX + (hash2(c, 3) - 0.5) * gapHalf, y = top + h * (0.3 + hash2(c, 5) * 0.5);
        ctx.beginPath(); ctx.moveTo(x, y);
        const segs = Math.ceil(5 * p);
        for (let sgi = 0; sgi < segs; sgi++) {
          x += (hash2(c, sgi + 9) - 0.5) * 18;
          y += (hash2(c, sgi + 21) - 0.5) * 16;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  } else {
    drawSpan(L.wallX0, L.gapX - gapHalf, false, true);
    drawSpan(L.gapX + gapHalf, L.wallX1, true, false);
    // rubble heap in the breach
    ctx.fillStyle = '#3e424d';
    for (let i = 0; i < 14; i++) {
      const rx = L.gapX - gapHalf - 6 + hash2(i, 31) * (gapHalf * 2 + 12);
      const rs = 4 + hash2(i, 37) * 8;
      ctx.fillRect(rx, L.gY - rs * (0.5 + hash2(i, 41) * 0.6), rs * 1.3, rs);
    }
  }
  ctx.restore();
}

function biDrawTower(L) {
  const oldX = bossState.x;
  bossState.x = 0;
  bossCinematic = true;
  ctx.save();
  ctx.translate(L.cx - L.towerW / 2, L.gY * (1 - L.s));
  ctx.scale(L.s, L.s);
  renderBoss();
  ctx.restore();
  bossCinematic = false;
  bossState.x = oldX;
}

// Background part: drawn after the parallax castles, before the ground.
function drawBossIntroScene() {
  if (!bossIntro) return;
  const L = biLayout();
  const broken = bossIntro.t >= BI_BREAK;
  if (!broken) { biDrawTower(L); biDrawWall(L, false); }
  else { biDrawWall(L, true); biDrawTower(L); }
  // distance haze
  ctx.fillStyle = 'rgba(30,34,50,0.22)';
  ctx.fillRect(L.wallX0 - 20, 0, width - L.wallX0 + 40, L.gY);
}

function biWrap(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

// Foreground part: flying stones, the dragon, alarm, Khaleesi, letterbox, fades.
function drawBossIntroOverlay() {
  const B = bossIntro;
  if (!B) return;
  const t = B.t;

  // stones flying out of the breach
  B.stones.forEach(st => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, st.life / 30);
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.fillStyle = st.color;
    ctx.fillRect(-st.size / 2, -st.size / 2, st.size, st.size * 0.75);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-st.size / 2, st.size * 0.1, st.size, st.size * 0.15);
    ctx.restore();
  });

  drawDragon(dragon.x, dragon.y);

  // "!" over the dragon
  if (t >= BI_ALARM) {
    const a = t - BI_ALARM;
    const pop = a < 8 ? 0.4 + a * 0.12 : 1 + Math.max(0, 0.15 - (a - 8) * 0.02);
    const ex = dragon.x + 6, ey = dragon.y - dragon.size * 0.9 - 14;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 30px "Proxima Nova", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 2);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
    // shock lines
    if (a < 30) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - a / 30) + ')';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const ang = -Math.PI / 2 + (i - 2.5) * 0.45;
        const r0 = 28 + a * 0.6, r1 = r0 + 10;
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(ang) * r0, ey + Math.sin(ang) * r0);
        ctx.lineTo(ex + Math.cos(ang) * r1, ey + Math.sin(ang) * r1);
        ctx.stroke();
      }
    }
  }

  const barH = height * 0.075 * Math.min(1, t / 25);

  // Khaleesi's alarmed portrait and line
  if (t >= BI_TALK) {
    const a = t - BI_TALK;
    const ps = 64;
    const shakeP = a < 30 ? (Math.random() - 0.5) * 3 : 0;
    const px = 14 + shakeP, py = height - barH - ps - 14;
    const slide = Math.min(1, a / 10);
    ctx.save();
    ctx.globalAlpha = slide;
    ctx.fillStyle = '#11161d';
    ctx.fillRect(px, py, ps, ps);
    if (khaleesiFrame1.complete && khaleesiFrame1.naturalWidth !== 0) ctx.drawImage(khaleesiFrame1, px, py, ps, ps);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e74c3c';
    ctx.strokeRect(px, py, ps, ps);

    ctx.font = 'bold 13px "Proxima Nova", sans-serif';
    const bx = px + ps + 12, bwid = Math.min(width - bx - 14, 320);
    const shown = BI_LINE.slice(0, Math.floor(a * 1.4));
    const lines = biWrap(BI_LINE, bwid - 20);
    const bh = lines.length * 17 + 16;
    const by = py + ps / 2 - bh / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bwid, bh, 10); else ctx.rect(bx, by, bwid, bh);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 1, by + bh / 2 - 7);
    ctx.lineTo(bx - 10, by + bh / 2);
    ctx.lineTo(bx + 1, by + bh / 2 + 7);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    let left = shown.length;
    lines.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left));
      left -= ln.length + 1;
      ctx.fillText(part, bx + 10, by + 22 + i * 17);
    });
    ctx.restore();
  }

  // letterbox bars
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -20, width + 40, barH + 20);
  ctx.fillRect(-20, height - barH, width + 40, barH + 20);
  if (t > 40 && t < BI_FADE_OUT) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px "Proxima Nova", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('TAP TO SKIP', width - 12, height - barH / 2 + 4);
    ctx.textAlign = 'left';
  }

  // white flash on impact
  if (t >= BI_BREAK && t < BI_BREAK + 8) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - (t - BI_BREAK) / 8)) + ')';
    ctx.fillRect(-20, -20, width + 40, height + 40);
  }

  // fades
  let fade = 0;
  if (t < BI_FADE_IN) fade = 1 - t / BI_FADE_IN;
  if (t >= BI_FADE_OUT) fade = Math.min(1, (t - BI_FADE_OUT) / (BI_END - BI_FADE_OUT));
  if (fade > 0) {
    ctx.fillStyle = 'rgba(10,10,20,' + fade + ')';
    ctx.fillRect(-20, -20, width + 40, height + 40);
  }
}
