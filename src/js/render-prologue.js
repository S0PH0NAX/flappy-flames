// render-prologue.js — Art for the sunny prologue (see prologue.js): sky, sun, clouds, rolling hills,
// wildflower meadow, birds, sheep, shepherds with lutes, maypole dancers, thatched huts, village crowds,
// the castle wall with its ballista, the capture cutscene overlay and the story-message screens.
// Static layers are cached with bgLayer() (render-sky.js).
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

const SUNNY_CLOUD_THEME = { cloudLit: '255,255,255', cloudBody: '222,234,248' };
const FLOWER_COLORS = ['#ff5d8f', '#ffd93b', '#ffffff', '#b07cff', '#ff6b3d', '#7ec8ff', '#ff9ad5'];

// ---------- backdrop ----------
function drawSunnyBackdrop() {
  const sky = bgLayer('sunsky|' + width + 'x' + height, width, height, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3d93e0');
    g.addColorStop(0.45, '#7cc4f2');
    g.addColorStop(0.75, '#c4e8fb');
    g.addColorStop(1, '#f2fbff');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  ctx.drawImage(sky, 0, 0);
  drawSunnySun();
  drawSunnyClouds();
  drawSunnyHills();
  drawSunnyBirds();
}

function drawSunnySun() {
  const sx = width * 0.8, sy = height * 0.13, R = 30;
  const t = Date.now() / 6000;
  ctx.save();
  const glow = ctx.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 5);
  glow.addColorStop(0, 'rgba(255,250,210,0.85)');
  glow.addColorStop(0.3, 'rgba(255,240,170,0.35)');
  glow.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - R * 5, sy - R * 5, R * 10, R * 10);
  // slow, soft rays
  ctx.translate(sx, sy);
  ctx.rotate(t);
  ctx.fillStyle = 'rgba(255,248,200,0.16)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(R * 1.1, -5);
    ctx.lineTo(R * 3.4, -13);
    ctx.lineTo(R * 3.4, 13);
    ctx.lineTo(R * 1.1, 5);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#fff7c2';
  ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf0';
  ctx.beginPath(); ctx.arc(sx - 4, sy - 4, R * 0.7, 0, Math.PI * 2); ctx.fill();
}

function drawSunnyClouds() {
  const layers = [
    { speed: 0.10, tile: 1400, alpha: 0.75, key: 'far', clouds: [[160, 0.05, 0.6], [640, 0.13, 0.5], [1100, 0.02, 0.75]] },
    { speed: 0.22, tile: 1200, alpha: 0.95, key: 'near', clouds: [[120, 0.10, 0.85], [560, 0.20, 0.7], [930, 0.05, 1.0]] }
  ];
  layers.forEach(L => {
    const tileH = Math.ceil(height * 0.45);
    const tile = bgLayer('sunclouds|' + L.key + '|' + height, L.tile, tileH, (c, w) => {
      L.clouds.forEach(cl => {
        const cx = cl[0], cy = height * cl[1] + 50, s = cl[2];
        paintCloud(c, cx, cy, s, SUNNY_CLOUD_THEME, 1);
        if (cx + 130 * s > w) paintCloud(c, cx - w, cy, s, SUNNY_CLOUD_THEME, 1);
        if (cx - 130 * s < 0) paintCloud(c, cx + w, cy, s, SUNNY_CLOUD_THEME, 1);
      });
    });
    const scroll = backgroundParallaxX * L.speed;
    const startX = -(scroll % L.tile);
    ctx.globalAlpha = L.alpha;
    for (let x = startX - L.tile; x < width + L.tile; x += L.tile) ctx.drawImage(tile, Math.round(x), -30);
    ctx.globalAlpha = 1;
  });
}

// One seamless strip of rolling hills. waves: [amplitude, cycles per tile, phase]
function paintHillTile(c, w, h, base, waves, top, bottom, detail) {
  const yAt = x => {
    let y = base;
    waves.forEach(wv => { y += wv[0] * Math.sin((x / w) * Math.PI * 2 * wv[1] + wv[2]); });
    return y;
  };
  const g = c.createLinearGradient(0, base - 60, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) c.lineTo(x, yAt(x));
  c.lineTo(w, h);
  c.closePath();
  c.fill();
  // sunlit rim along the crest
  c.strokeStyle = 'rgba(255,255,220,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x <= w; x += 8) { if (x === 0) c.moveTo(x, yAt(x) + 1); else c.lineTo(x, yAt(x) + 1); }
  c.stroke();
  if (detail) detail(c, w, h, yAt);
}

function drawSunnyHills() {
  const gY = height - groundHeight;
  const top0 = Math.floor(height * 0.38);
  const th = gY - top0 + 4;
  const village = currentLevel === PRO_VILLAGE && state !== 'SPLASH' && state !== 'START';
  const layers = [
    { key: 'far', speed: 0.06, tile: 1600, base: th * 0.32, waves: [[26, 2, 0.3], [14, 5, 1.7], [6, 11, 0.9]],
      top: '#9fcfb2', bottom: '#b9dcc6', detail: (c, w, h, yAt) => {
        // distant flower haze
        for (let i = 0; i < 260; i++) {
          const x = hash2(i, 11) * w, y = yAt(x) + 6 + hash2(i, 12) * (h - yAt(x));
          c.fillStyle = 'rgba(255,' + (150 + Math.floor(hash2(i, 13) * 100)) + ',200,0.35)';
          c.fillRect(x, y, 2, 1);
        }
      } },
    { key: 'mid', speed: 0.14, tile: 1600, base: th * 0.5, waves: [[30, 3, 2.1], [16, 7, 0.4], [7, 13, 2.8]],
      top: '#7cc35f', bottom: '#93cf6c', detail: (c, w, h, yAt) => {
        for (let i = 0; i < 700; i++) {
          const x = hash2(i, 21) * w, y = yAt(x) + 4 + Math.pow(hash2(i, 22), 0.8) * (h - yAt(x));
          c.fillStyle = FLOWER_COLORS[Math.floor(hash2(i, 23) * FLOWER_COLORS.length)];
          c.globalAlpha = 0.55;
          c.fillRect(x, y, 2, 2);
        }
        c.globalAlpha = 1;
        // little trees
        for (let i = 0; i < 14; i++) {
          const x = hash2(i, 24) * w, y = yAt(x) + 6 + hash2(i, 25) * 20;
          c.fillStyle = '#5b3d22'; c.fillRect(x - 1, y - 6, 2, 7);
          c.fillStyle = '#3f8a3a'; c.beginPath(); c.arc(x, y - 10, 7, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#5aa84a'; c.beginPath(); c.arc(x - 2, y - 12, 4, 0, Math.PI * 2); c.fill();
        }
        if (village) {
          // a distant village of thatched roofs
          for (let i = 0; i < 26; i++) {
            const x = hash2(i, 26) * w, y = yAt(x) + 10 + hash2(i, 27) * 26;
            const hw = 9 + hash2(i, 28) * 6;
            c.fillStyle = '#e6d6b0'; c.fillRect(x - hw / 2, y - 6, hw, 6);
            c.fillStyle = '#c49a45';
            c.beginPath(); c.moveTo(x - hw / 2 - 2, y - 5); c.lineTo(x, y - 13); c.lineTo(x + hw / 2 + 2, y - 5); c.fill();
          }
        } else {
          // grazing sheep dots
          for (let i = 0; i < 40; i++) {
            const x = hash2(i, 29) * w, y = yAt(x) + 8 + hash2(i, 30) * 30;
            c.fillStyle = '#fbfbf5'; c.beginPath(); c.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#333'; c.fillRect(x + 2, y - 1, 1.5, 1.5);
          }
        }
      } },
    { key: 'near', speed: 0.3, tile: 1600, base: th * 0.72, waves: [[24, 4, 1.2], [12, 9, 2.4], [5, 17, 0.2]],
      top: '#5fb24a', bottom: '#4fa13f', detail: (c, w, h, yAt) => {
        for (let i = 0; i < 1300; i++) {
          const x = hash2(i, 31) * w, y = yAt(x) + 3 + Math.pow(hash2(i, 32), 0.7) * (h - yAt(x));
          const col = FLOWER_COLORS[Math.floor(hash2(i, 33) * FLOWER_COLORS.length)];
          c.fillStyle = col;
          const s = 2 + Math.floor(hash2(i, 34) * 2);
          c.fillRect(x, y, s, s);
        }
        for (let i = 0; i < 6; i++) {
          const x = hash2(i, 35) * w, y = yAt(x) + 4;
          c.fillStyle = '#5b3d22'; c.fillRect(x - 2, y - 14, 4, 15);
          c.fillStyle = '#2f7a34'; c.beginPath(); c.arc(x, y - 22, 13, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#4c9d45'; c.beginPath(); c.arc(x - 4, y - 26, 8, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#6dbb58'; c.beginPath(); c.arc(x - 6, y - 29, 4, 0, Math.PI * 2); c.fill();
        }
      } }
  ];
  layers.forEach(L => {
    const tile = bgLayer('sunhill|' + L.key + '|' + width + 'x' + height + '|' + (village ? 'v' : 'm'), L.tile, th, (c, w, h) => {
      paintHillTile(c, w, h, L.base, L.waves, L.top, L.bottom, L.detail);
    });
    const scroll = sunnyScroll * L.speed;
    const startX = -(scroll % L.tile);
    for (let x = startX; x < width; x += L.tile) ctx.drawImage(tile, Math.round(x), top0);
  });
}

function drawSunnyBirds() {
  ctx.strokeStyle = '#2b3a4a';
  ctx.lineCap = 'round';
  sunnyBirds.forEach(b => {
    const f = Math.sin(b.phase) * b.size * 0.7;
    ctx.lineWidth = Math.max(1, b.size * 0.3);
    ctx.globalAlpha = 0.5 + b.depth * 0.4;
    ctx.beginPath();
    ctx.moveTo(b.x - b.size, b.y - f);
    ctx.quadraticCurveTo(b.x - b.size * 0.4, b.y - b.size * 0.4, b.x, b.y);
    ctx.quadraticCurveTo(b.x + b.size * 0.4, b.y - b.size * 0.4, b.x + b.size, b.y - f);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

// ---------- ground: rolling wildflower meadow (and a dirt lane in the village) ----------
function drawSunnyGround() {
  const gY = height - groundHeight;
  const village = currentLevel === PRO_VILLAGE && state !== 'SPLASH' && state !== 'START';
  const TW = 640;
  const tileH = groundHeight + PRO_TERRAIN_MAX + 20;
  const top = gY - PRO_TERRAIN_MAX - 12;
  const tile = bgLayer('sunground|' + tileH + '|' + (village ? 'v' : 'm'), TW, tileH, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3f9a35');
    g.addColorStop(0.4, '#358a2e');
    g.addColorStop(1, '#2a7426');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const n = village ? 380 : 900;
    for (let i = 0; i < n; i++) {
      const x = hash2(i, 45) * w;
      const y = hash2(i, 46) * (h - 4);
      const col = FLOWER_COLORS[Math.floor(hash2(i, 47) * FLOWER_COLORS.length)];
      c.fillStyle = '#2f7a2c';
      c.fillRect(x + 1, y + 2, 1, 4);
      c.fillStyle = col;
      c.fillRect(x, y, 3, 3);
      c.fillStyle = '#fff6a8';
      c.fillRect(x + 1, y + 1, 1, 1);
    }
  });
  // the surface line across the screen
  const pts = [];
  for (let x = -6; x <= width + 12; x += 6) pts.push([x, proGroundY(x)]);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-6, height + 10);
  pts.forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.lineTo(width + 12, height + 10);
  ctx.closePath();
  ctx.clip();
  const startX = -(sunnyScroll % TW);
  for (let x = startX; x < width; x += TW) ctx.drawImage(tile, Math.round(x), top);
  // soft shading: crests catch the sun, hollows sit in shade
  for (let i = 0; i < pts.length - 1; i++) {
    const slope = (pts[i + 1][1] - pts[i][1]) / 6;
    if (Math.abs(slope) < 0.05) continue;
    ctx.fillStyle = slope > 0 ? 'rgba(20,60,20,' + Math.min(0.18, slope * 0.4) + ')' : 'rgba(255,255,200,' + Math.min(0.12, -slope * 0.3) + ')';
    ctx.fillRect(pts[i][0], pts[i][1], 6, 46);
  }
  // the village lane follows the hills
  if (village) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#b28f57';
    ctx.lineWidth = 24;
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1] + 34); else ctx.lineTo(p[0], p[1] + 34); });
    ctx.stroke();
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = 19;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(221,191,134,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1] + 25); else ctx.lineTo(p[0], p[1] + 25); });
    ctx.stroke();
  }
  ctx.restore();
  // a soft shadow line under the crest separates the ground from the hills behind
  ctx.strokeStyle = 'rgba(25,70,20,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1] - 1); else ctx.lineTo(p[0], p[1] - 1); });
  ctx.stroke();
  // sunlit rim and grass blades along the surface
  ctx.strokeStyle = 'rgba(190,240,140,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1] + 1); else ctx.lineTo(p[0], p[1] + 1); });
  ctx.stroke();
  const off = sunnyScroll % 3;
  for (let x = -off; x < width; x += 3) {
    const wx = Math.round((x + sunnyScroll) / 3);
    const bh = 4 + hash2(wx, 43) * 7;
    ctx.fillStyle = hash2(wx, 44) < 0.5 ? '#6cc453' : '#57ad44';
    ctx.fillRect(x, proGroundY(x) - bh + 2, 2, bh);
  }
}

// ---------- villager extras used by render-people.js ----------
function drawVillagerTool(k, L, handY) {
  if (k.tool === 'crook') {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(18, -4, 2, 30);
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(21, -4, 3, Math.PI, Math.PI * 2.2); ctx.stroke();
  } else if (k.tool === 'basket') {
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(15, handY + 1, 8, 6);
    ctx.fillStyle = '#b07a3e';
    ctx.fillRect(15, handY + 2, 8, 1); ctx.fillRect(15, handY + 4, 8, 1);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(16, handY, 2, 2);
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(19, handY - 1, 2, 2);
  } else if (k.tool === 'lute') {
    drawLute(12, 13, 1);
  }
}

// a lute held across the body, strummed
function drawLute(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(-0.55);
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(-14, -1.5, 12, 3);                 // neck
  ctx.fillRect(-17, -2.5, 4, 5);                  // pegbox
  ctx.fillStyle = '#b06a2c';
  ctx.beginPath(); ctx.ellipse(2, 0, 6.5, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a4f1e';
  ctx.beginPath(); ctx.ellipse(3, 1, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1608';
  ctx.beginPath(); ctx.arc(1, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.7)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(6, 0); ctx.stroke();
  ctx.restore();
}

// draw a villager (render-people.js) standing at feet (x, gY), with scale and facing
function drawProPerson(p, x, footY, legMove, armSwing) {
  ctx.save();
  ctx.translate(x, footY);
  ctx.scale(p.scale || 1, p.scale || 1);
  ctx.translate(-11, -26);
  if (p.dir < 0) { ctx.translate(22, 0); ctx.scale(-1, 1); }
  drawVillagerSprite(p, legMove, armSwing);
  ctx.restore();
}

// ---------- ground scenery ----------
function drawSheep(e, gY) {
  const s = e.lamb ? 0.72 : 1;
  const hop = e.scared > 0 ? Math.abs(Math.sin(e.phase * 0.4)) * 6 : 0;
  const graze = !e.walk && !(e.scared > 0) && Math.sin(e.phase * 0.02 + e.x * 0.1) > 0;
  ctx.save();
  ctx.translate(e.x, gY - hop);
  ctx.scale(e.dir * s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
  const leg = (e.walk || e.scared > 0) ? Math.sin(e.phase * 0.25) * 2 : 0;
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-9 + leg, -8, 3, 8); ctx.fillRect(-4 - leg, -8, 3, 8);
  ctx.fillRect(4 + leg, -8, 3, 8); ctx.fillRect(8 - leg, -8, 3, 8);
  // wool
  ctx.fillStyle = '#d9d6cb';
  ctx.beginPath(); ctx.ellipse(0, -13, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbfaf3';
  [[-9, -15, 6], [-3, -18, 7], [4, -17, 7], [10, -14, 5], [-6, -11, 6], [3, -11, 6]].forEach(b => {
    ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, Math.PI * 2); ctx.fill();
  });
  // head
  const hx = 13, hy = graze ? -6 : -17;
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.ellipse(hx, hy, 5, 4, graze ? 0.9 : 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(hx - 6, hy - 3, 3, 2);           // ear
  ctx.fillStyle = '#fbfaf3';
  ctx.beginPath(); ctx.arc(hx - 2, hy - 3, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hx + 1, hy - 1, 1.5, 1.5);
  ctx.restore();
}

function drawShepherd(e, gY) {
  const p = e.person;
  const jump = e.joy > 0 ? Math.abs(Math.sin(e.joy * 0.25)) * 10 : 0;
  if (e.sitting && e.joy <= 0) {
    // seated on a rock, playing the lute
    ctx.fillStyle = '#8f9499';
    ctx.beginPath(); ctx.ellipse(e.x + 10, gY - 4, 12, 6, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a9aeb3';
    ctx.beginPath(); ctx.ellipse(e.x + 8, gY - 7, 7, 3, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(e.x - 1, gY - 34);
    ctx.scale(-1, 1);
    ctx.translate(-22, 0);
    const c = p.costume, L = p.look;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(11, 33, 12, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    // legs out in front
    ctx.fillStyle = shadeHex(c.pants, -20);
    ctx.fillRect(10, 20, 13, 5);
    ctx.fillStyle = '#3b2616';
    ctx.fillRect(21, 20, 4, 9);
    ctx.fillStyle = c.pants;
    ctx.fillRect(21, 24, 3, 5);
    // body, head, hair/hat
    ctx.fillStyle = '#1b1410'; ctx.fillRect(5, 5, 12, 17);
    ctx.fillStyle = c.tunic; ctx.fillRect(6, 6, 10, 15);
    ctx.fillStyle = shadeHex(c.tunic, -45); ctx.fillRect(6, 6, 3, 15);
    ctx.fillStyle = '#1b1410'; ctx.fillRect(6, -4, 11, 10);
    ctx.fillStyle = L.skin; ctx.fillRect(7, -3, 9, 8);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(13, 0, 2, 1);          // eyes closed, enjoying the tune
    ctx.fillStyle = shadeHex(L.skin, -60); ctx.fillRect(13, 3, 3, 1);
    if (L.beard) { ctx.fillStyle = c.hair; ctx.fillRect(8, 2, 9, 4); }
    ctx.fillStyle = '#c9a54a'; ctx.fillRect(3, -5, 17, 2);
    ctx.fillStyle = '#e3c26a'; ctx.fillRect(7, -9, 10, 5);
    // lute and strumming hand
    drawLute(15, 15, 1.05);
    const strum = Math.sin(Date.now() / 90 + e.x) * 1.5;
    ctx.fillStyle = L.skin;
    ctx.fillRect(16, 14 + strum, 3, 3);
    ctx.fillRect(6, 8, 3, 3);
    ctx.restore();
  } else {
    p.dir = -1;
    const wave = e.joy > 0;
    p.wave = wave;
    drawProPerson(p, e.x + 11, gY - jump, 0, 0);
    p.wave = false;
  }
}

function drawMaypole(e, gY) {
  const t = Date.now() / 1000;
  const top = { x: e.x, y: gY - 86 };
  const R = 36;
  const ds = e.dancers.map((d, i) => {
    const a = t * 0.9 + d.phase;
    return { d: d, a: a, x: e.x + Math.cos(a) * R, depth: Math.sin(a), i: i };
  });
  const drawDancer = q => {
    const d = q.d;
    const hop = Math.abs(Math.sin(t * 6 + q.i)) * 4;
    d.dir = -Math.sin(q.a) >= 0 ? 1 : -1;
    d.wave = true;
    const sc = 0.88 + q.depth * 0.1;
    d.scale = sc;
    const fy = proGroundY(q.x) - 2 + q.depth * 4 - hop;
    drawProPerson(d, q.x, fy, Math.sin(t * 12 + q.i) * 2, 0);
    d.wave = false;
    // ribbon to the top of the pole
    ctx.strokeStyle = e.ribbon[q.i % e.ribbon.length];
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + 4);
    ctx.quadraticCurveTo((top.x + q.x) / 2, (top.y + fy - 30) / 2 + 10, q.x + d.dir * 5 * sc, fy - 30 * sc);
    ctx.stroke();
  };
  ds.filter(q => q.depth < 0).sort((a, b) => a.depth - b.depth).forEach(drawDancer);
  // the pole with a flower crown
  ctx.fillStyle = '#7a5230'; ctx.fillRect(e.x - 2.5, top.y, 5, gY - top.y);
  ctx.fillStyle = '#9a6a40'; ctx.fillRect(e.x - 2.5, top.y, 2, gY - top.y);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = e.ribbon[i % e.ribbon.length];
    ctx.beginPath(); ctx.arc(top.x + Math.cos(a) * 7, top.y + 4 + Math.sin(a) * 3, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath(); ctx.arc(top.x, top.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  ds.filter(q => q.depth >= 0).sort((a, b) => a.depth - b.depth).forEach(drawDancer);
}

function drawHut(e, gY) {
  const x = e.x, w = e.w, wy = gY - e.wallH;
  // stone footing down to the lower side of the slope
  const low = Math.max(proGroundY(x), proGroundY(x + w));
  if (low > gY) {
    ctx.fillStyle = '#8f9499';
    ctx.fillRect(x - 2, gY - 2, w + 4, low - gY + 6);
    ctx.fillStyle = '#a9aeb3';
    for (let sx = x; sx < x + w; sx += 9) ctx.fillRect(sx, gY + 1, 7, Math.max(2, low - gY));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - 4, gY - 3, w + 8, 4);
  // wattle-and-daub walls with a timber frame
  ctx.fillStyle = '#ead9b4';
  ctx.fillRect(x, wy, w, e.wallH);
  ctx.fillStyle = '#d8c497';
  ctx.fillRect(x, gY - 6, w, 6);
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x, wy, 4, e.wallH); ctx.fillRect(x + w - 4, wy, 4, e.wallH);
  ctx.fillRect(x, wy, w, 3);
  ctx.fillRect(x + w * 0.5 - 2, wy, 4, e.wallH);
  ctx.save();
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (e.doorLeft) { ctx.moveTo(x + w * 0.5, wy + 3); ctx.lineTo(x + w - 4, gY); }
  else { ctx.moveTo(x + 4, wy + 3); ctx.lineTo(x + w * 0.5, gY); }
  ctx.stroke();
  ctx.restore();
  // door and window
  const dx = e.doorLeft ? x + w * 0.16 : x + w * 0.6;
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.moveTo(dx, gY); ctx.lineTo(dx, gY - 16); ctx.arc(dx + 7, gY - 16, 7, Math.PI, 0); ctx.lineTo(dx + 14, gY); ctx.fill();
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(dx + 6, gY - 22, 2, 22);
  ctx.fillStyle = '#d4a017'; ctx.fillRect(dx + 10, gY - 11, 2, 2);
  const wx = e.doorLeft ? x + w * 0.66 : x + w * 0.2;
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(wx, wy + 8, 11, 9);
  ctx.fillStyle = '#ffd98a'; ctx.fillRect(wx + 1, wy + 9, 9, 7);
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(wx + 5, wy + 8, 1, 9); ctx.fillRect(wx, wy + 12, 11, 1);
  ctx.fillStyle = '#4c9d45'; ctx.fillRect(wx - 1, wy + 17, 13, 3);
  ctx.fillStyle = '#ff5d8f'; ctx.fillRect(wx + 1, wy + 16, 2, 2); ctx.fillRect(wx + 7, wy + 16, 2, 2);
  // thatched roof
  const rTop = wy - e.roofH;
  ctx.fillStyle = '#a77e34';
  ctx.beginPath();
  ctx.moveTo(x - 9, wy + 5);
  ctx.quadraticCurveTo(x + w * 0.12, rTop + 4, x + w * 0.32, rTop);
  ctx.lineTo(x + w * 0.68, rTop);
  ctx.quadraticCurveTo(x + w * 0.88, rTop + 4, x + w + 9, wy + 5);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(x - 10, rTop, w + 20, e.roofH + 6);
  for (let r = 0; r < 4; r++) {
    const ry = rTop + 6 + r * (e.roofH / 4);
    ctx.fillStyle = '#a77e34';
    ctx.fillRect(x - 10, ry + e.roofH / 4 - 3, w + 20, 2);
    ctx.fillStyle = '#ddb85e';
    ctx.fillRect(x - 10, ry, w + 20, 1);
  }
  ctx.strokeStyle = 'rgba(120,85,30,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < w + 20; i += 4) {
    const sx = x - 10 + i;
    const len = 4 + hash2(e.seed + i, 7) * 6;
    const sy = rTop + hash2(e.seed, i) * e.roofH;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 1, sy + len); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#8f6a2a';
  ctx.fillRect(x + w * 0.3, rTop - 2, w * 0.4, 4);
  // ragged eave
  ctx.fillStyle = '#b58c3c';
  for (let i = -9; i < w + 9; i += 4) ctx.fillRect(x + i, wy + 3 + hash2(e.seed, i + 50) * 4, 3, 3);
  // chimney smoke
  if (e.smoke) {
    const sx = x + w * 0.62, sy = rTop - 2;
    const t = Date.now() / 1000;
    for (let i = 0; i < 5; i++) {
      const k = ((t * 0.5 + i / 5 + e.seed * 0.01) % 1);
      ctx.fillStyle = 'rgba(240,240,240,' + (0.45 * (1 - k)) + ')';
      ctx.beginPath(); ctx.arc(sx - k * 18 + Math.sin(k * 6 + i) * 3, sy - k * 50, 4 + k * 8, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawWell(e, gY) {
  const x = e.x;
  ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 14, gY - 40, 3, 30); ctx.fillRect(x + 11, gY - 40, 3, 30);
  ctx.fillStyle = '#a0522d';
  ctx.beginPath(); ctx.moveTo(x - 20, gY - 38); ctx.lineTo(x, gY - 52); ctx.lineTo(x + 20, gY - 38); ctx.fill();
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 12, gY - 34, 24, 2);
  ctx.strokeStyle = '#d8c497'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, gY - 33); ctx.lineTo(x + 2, gY - 24); ctx.stroke();
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 1, gY - 24, 6, 5);
  ctx.fillStyle = '#8f9499'; ctx.fillRect(x - 16, gY - 16, 32, 16);
  ctx.fillStyle = '#a9aeb3';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ctx.fillRect(x - 16 + c * 8 + (r % 2) * 4, gY - 16 + r * 5, 6, 4);
  ctx.fillStyle = '#6d7277'; ctx.fillRect(x - 17, gY - 18, 34, 3);
}

function drawHen(h, x, gY) {
  const peck = Math.sin(Date.now() / 200 + h.phase) > 0.6;
  ctx.save();
  ctx.translate(x, gY);
  ctx.scale(h.dir, 1);
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.ellipse(0, -6, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-7, -9, 3, 4);
  const hy = peck ? -3 : -10;
  ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.arc(5, hy, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(4, hy - 4, 2, 2);
  ctx.fillStyle = '#f39c12'; ctx.fillRect(7, hy - 0.5, 2, 1.5);
  ctx.fillStyle = '#f39c12'; ctx.fillRect(-1, -2, 1, 2); ctx.fillRect(1, -2, 1, 2);
  ctx.restore();
}

function drawCrowd(e, gY) {
  const t = Date.now() / 1000;
  const cheer = e.cheer > 0 ? e.cheer / 40 : 0;   // the crowd jumps when Cyndraxx sings
  e.hens.forEach(h => {
    h.dx += h.dir * 0.08;
    if (Math.random() < 0.005) h.dir *= -1;
    drawHen(h, e.x + h.dx, proGroundY(e.x + h.dx));
  });
  e.people.forEach(p => {
    let legMove = 0, arm = 0, bob = 0;
    const px = e.x + p.dx;
    if (p.act === 'walk' || p.act === 'run' || p.act === 'basket') {
      if (p.speed) {
        p.dx += p.dir * p.speed;
        if (p.dx < -30 || p.dx > e.w) p.dir *= -1;
        legMove = Math.sin(t * (p.act === 'run' ? 16 : 9) + p.phase) * 2;
        arm = legMove;
        if (p.act === 'run') bob = Math.abs(Math.sin(t * 16 + p.phase)) * 2;
      }
    } else if (p.act === 'dance') {
      bob = Math.abs(Math.sin(t * 6 + p.phase)) * 4;
      legMove = Math.sin(t * 12 + p.phase) * 2;
      p.dir = Math.sin(t * 1.5 + p.phase) > 0 ? 1 : -1;
    } else if (p.act === 'talk') {
      bob = Math.abs(Math.sin(t * 3 + p.phase)) * 1;
      arm = Math.sin(t * 4 + p.phase) * 2;
    } else if (p.act === 'lute') {
      p.dir = 1;
      bob = Math.abs(Math.sin(t * 4 + p.phase)) * 1;
    }
    // everyone looks up and waves when the dragon flies over
    const near = Math.abs(dragon.x - px) < 200;
    p.wave = (p.act === 'wave' && near) || p.act === 'dance' || (p.act === 'run' && near && Math.sin(t + p.phase) > 0);
    if (p.act === 'wave' && near) p.dir = dragon.x < px ? -1 : 1;
    if (cheer) { bob += Math.abs(Math.sin(t * 14 + p.phase)) * 7 * cheer; p.wave = true; }
    drawProPerson(p, px, proGroundY(px) - bob, legMove, arm);
    p.wave = false;
  });
}

// the slavers' castle at the end of the village, with its ballista and knight crew
function drawProCastle(e, gY) {
  const W = e.ref;
  const x = W.x;
  const wallH = proWallHeight();
  const wallTop = gY - wallH;
  const wallW = Math.ceil(width * 0.5 + 260);
  if (!W.owner) W.owner = { brickStyle: 2, brickSeed: 77 };
  // foundation down past the rolling ground
  ctx.fillStyle = stonePalette.dark;
  ctx.fillRect(x, gY, wallW, groundHeight);
  drawMasonry(x, wallTop, wallW, wallH, stonePalette, W.owner);
  // shade + crenellations
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, wallTop, 6, wallH);
  for (let mx = x; mx < x + wallW; mx += 24) {
    drawMasonry(mx, wallTop - 14, 14, 14, stonePalette, W.owner);
  }
  ctx.fillStyle = stonePalette.dark;
  ctx.fillRect(x, wallTop - 2, wallW, 3);
  // gatehouse with a portcullis
  const gx = x + 120, gw = 64;
  ctx.fillStyle = '#0b0f14';
  ctx.beginPath(); ctx.moveTo(gx, gY); ctx.lineTo(gx, gY - 50); ctx.arc(gx + gw / 2, gY - 50, gw / 2, Math.PI, 0); ctx.lineTo(gx + gw, gY); ctx.fill();
  ctx.strokeStyle = '#3d4650'; ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(gx + i * gw / 6, gY - 78); ctx.lineTo(gx + i * gw / 6, gY); ctx.stroke(); }
  for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(gx, gY - 10 - j * 15); ctx.lineTo(gx + gw, gY - 10 - j * 15); ctx.stroke(); }
  // slavers' banners: a golden wheel on black
  [x + 70, x + 220].forEach((bx, i) => {
    const sway = Math.sin(Date.now() / 500 + i) * 2;
    ctx.fillStyle = '#1c1014';
    ctx.beginPath(); ctx.moveTo(bx, wallTop + 10); ctx.lineTo(bx + 30, wallTop + 10); ctx.lineTo(bx + 30 + sway, wallTop + 80); ctx.lineTo(bx + 15 + sway, wallTop + 70); ctx.lineTo(bx + sway, wallTop + 80); ctx.fill();
    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2;
    const cx = bx + 15 + sway * 0.5, cy = wallTop + 38;
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 9, cy - Math.sin(a) * 9); ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); ctx.stroke();
    }
  });
  drawProBallista(x, wallTop);
  // the crew
  if (!W.crew) {
    W.crew = [
      { relX: 0, direction: -1, state: 'ALIVE', heat: 0, thrustT: 0, deflectT: 0, aim: -Math.PI / 2 - 0.25 },
      { relX: 86, direction: -1, state: 'ALIVE', heat: 0, thrustT: 0, deflectT: 0, aim: -Math.PI / 2 - 0.15 },
      { relX: 150, direction: -1, state: 'ALIVE', heat: 0, thrustT: 0, deflectT: 0, aim: -Math.PI / 2 - 0.2 }
    ];
  }
  const obsRef = { x: x, bottomY: wallTop - 2 };
  W.crew.forEach(k => { k.obsRef = obsRef; drawSmallKnight(k); });
}

function proBallistaAim(bx, by) {
  return Math.atan2(dragon.y - by, dragon.x - bx);
}

function drawProBallista(x, wallTop) {
  const bx = x + 46, by = wallTop - 22;
  const C = pro && pro.cap;
  const t = C ? C.t : 0;
  // keep pointing at the dragon until the net leaves, then hold
  let aim = proBallistaAim(bx, by);
  if (C && t >= CAP_FIRE) aim = C.aimHold !== undefined ? C.aimHold : (C.aimHold = aim);
  aim = Math.max(Math.PI * 0.8, Math.min(Math.PI * 1.15, aim < 0 ? aim + Math.PI * 2 : aim));
  // stand
  ctx.fillStyle = '#5b3d22';
  ctx.fillRect(bx - 12, by + 4, 4, 18); ctx.fillRect(bx + 8, by + 4, 4, 18);
  ctx.fillRect(bx - 14, by + 18, 28, 4);
  // winch drum
  const spin = C && t >= CAP_DRAG && t < CAP_OVER ? t * 0.4 : 0;
  ctx.fillStyle = '#7a5230';
  ctx.beginPath(); ctx.arc(bx + 18, by + 10, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3d2a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx + 18 + Math.cos(spin) * 7, by + 10 + Math.sin(spin) * 7); ctx.lineTo(bx + 18 - Math.cos(spin) * 7, by + 10 - Math.sin(spin) * 7); ctx.stroke();
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(aim);
  // stock
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-18, -3, 40, 6);
  ctx.fillStyle = '#9a6a40';
  ctx.fillRect(-18, -3, 40, 2);
  // bow arms and string
  const drawn = !C || t < CAP_FIRE;
  const pull = drawn ? (C ? Math.min(1, t / 50) : 0.6) : 0;
  ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(16, -22 + pull * 4); ctx.quadraticCurveTo(24, 0, 16, 22 - pull * 4); ctx.stroke();
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, -21 + pull * 4); ctx.lineTo(16 - pull * 22, 0); ctx.lineTo(16, 21 - pull * 4); ctx.stroke();
  ctx.fillStyle = '#9aa4ad';
  ctx.fillRect(18, -4, 6, 8);
  // the loaded net bundle
  if (drawn) {
    ctx.fillStyle = '#8c8471';
    ctx.beginPath(); ctx.arc(24, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5e5747'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(19, -3); ctx.lineTo(29, 3); ctx.moveTo(19, 3); ctx.lineTo(29, -3); ctx.stroke();
  }
  ctx.restore();
}

function drawProEnts() {
  if (!pro || !(state === 'PLAYING' || state === 'PAUSED' || state === 'GAMEOVER' || state === 'CAPTURE')) return;
  const gY = height - groundHeight;
  const order = { castle: 0, hut: 1, festival: 1, well: 2, maypole: 3, sheep: 4, shepherd: 5, crowd: 6 };
  const ents = pro.ents.slice().sort((a, b) => (order[a.type] - order[b.type]));
  ents.forEach(e => {
    if (e.type !== 'castle' && (e.x + (e.w || 0) < -140 || e.x > width + 160)) return;
    if (e.type === 'sheep') drawSheep(e, proGroundY(e.x));
    else if (e.type === 'shepherd') drawShepherd(e, proGroundY(e.x + 10));
    else if (e.type === 'maypole') drawMaypole(e, proGroundY(e.x));
    else if (e.type === 'hut') drawHut(e, proGroundY(e.x + e.w / 2));
    else if (e.type === 'well') drawWell(e, proGroundY(e.x));
    else if (e.type === 'crowd') drawCrowd(e, gY);
    else if (e.type === 'castle') drawProCastle(e, gY);
    else if (e.type === 'festival') drawFestival(e);
  });
  // music notes
  ctx.font = 'bold 14px "Proxima Nova", sans-serif';
  ctx.textAlign = 'center';
  pro.notes.forEach(n => {
    ctx.globalAlpha = Math.min(1, n.life / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillText(n.glyph, n.x + 1, n.y + 1);
    ctx.fillStyle = n.color;
    ctx.fillText(n.glyph, n.x, n.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  // the sheep in Cyndraxx's claws
  if (pro.carried) {
    const s = { x: dragon.x + 4, dir: 1, phase: pro.carried.t * 3, scared: 1, lamb: pro.carried.lamb };
    drawSheep(s, dragon.y + 46);
  }
  // Khaleesi's gold pouch and its trail of coins
  pro.coins.forEach(c => {
    ctx.globalAlpha = c.life / 20;
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(c.x, c.y, 2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  const pch = pro.pouch;
  if (pch) {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.ellipse(pch.x, pch.y, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4423'; ctx.fillRect(pch.x - 3, pch.y - 9, 6, 3);
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(pch.x - 2, pch.y - 2, 4, 4);
    ctx.fillStyle = '#fff3a0'; ctx.fillRect(pch.x - 1, pch.y - 1, 1, 1);
  }
}

// title card and fades during the prologue levels
function drawProOverlay() {
  if (!pro) return;
  if (festStory()) { drawFestStory(); return; }
  if (pro.title > 0) {
    const t = PRO_TITLE_FRAMES - pro.title;
    const a = Math.min(1, t / 30, pro.title / 40);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Proxima Nova", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const title = currentLevel === PRO_MEADOW ? 'THE VALLEY OF PEACE' : 'THE VILLAGE';
    const sub = currentLevel === PRO_MEADOW ? 'PROLOGUE  ·  PART I' : 'PROLOGUE  ·  PART II';
    ctx.fillText(sub, width / 2 + 1, height * 0.3 - 33);
    ctx.fillStyle = '#fffbe6';
    ctx.fillText(sub, width / 2, height * 0.3 - 34);
    ctx.font = 'bold 28px "Proxima Nova", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(title, width / 2 + 2, height * 0.3 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, width / 2, height * 0.3);
    ctx.restore();
  }
  let fade = 0;
  if (pro.fadeIn > 0) fade = pro.fadeIn / 40;
  if (pro.ending > 0) fade = Math.min(1, pro.ending / PRO_END_FADE);
  if (fade > 0) {
    ctx.fillStyle = 'rgba(255,250,235,' + fade + ')';
    ctx.fillRect(-20, -20, width + 40, height + 40);
  }
}

// ---------- the capture ----------
// A big square net: a rope grid with a thick border and stone weights at the corners.
// (cx, cy) is the centre, s the side length; `drape` bends the edges down around whatever is inside.
function drawSquareNet(cx, cy, s, rot, drape, thin) {
  const lw = thin || 1;   // rope thickness multiplier (the close-up is drawn scaled up, so it uses thinner ropes)
  const h = s / 2;
  const d = drape || 0;
  const N = 8;
  // a point on the net: u, v in -1..1; the sides sag downward when draped
  const pt = (u, v) => {
    let x = u * h, y = v * h;
    if (d) {
      const edge = Math.max(Math.abs(u), Math.abs(v));
      y += d * edge * edge * h * 0.55;          // the edges hang down
      x *= 1 - d * 0.12 * (1 - Math.abs(v));     // and pull in a little at the middle
    }
    return [x, y];
  };
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);
  ctx.fillStyle = 'rgba(110,100,80,0.14)';
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const p = pt(-1 + 2 * i / N, -1); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
  for (let i = 0; i <= N; i++) { const p = pt(1, -1 + 2 * i / N); ctx.lineTo(p[0], p[1]); }
  for (let i = N; i >= 0; i--) { const p = pt(-1 + 2 * i / N, 1); ctx.lineTo(p[0], p[1]); }
  for (let i = N; i >= 0; i--) { const p = pt(-1, -1 + 2 * i / N); ctx.lineTo(p[0], p[1]); }
  ctx.fill();
  const line = (fixed, horiz) => {
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const k = -1 + 2 * i / 16;
      const p = horiz ? pt(k, fixed) : pt(fixed, k);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2e2a22';
  ctx.lineWidth = (Math.max(1.6, s / 70) + 1.2) * lw;
  for (let i = 0; i <= N; i++) { line(-1 + 2 * i / N, true); line(-1 + 2 * i / N, false); }
  ctx.strokeStyle = '#7d735c';
  ctx.lineWidth = Math.max(1, s / 70) * lw;
  for (let i = 0; i <= N; i++) { line(-1 + 2 * i / N, true); line(-1 + 2 * i / N, false); }
  // heavy border rope
  ctx.strokeStyle = '#4a4232';
  ctx.lineWidth = Math.max(2.5, s / 40) * lw;
  line(-1, true); line(1, true); line(-1, false); line(1, false);
  // knots
  ctx.fillStyle = '#5a5141';
  const kr = Math.max(1.2, s / 90) * lw;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const p = pt(-1 + 2 * i / N, -1 + 2 * j / N);
    ctx.fillRect(p[0] - kr, p[1] - kr, kr * 2, kr * 2);
  }
  // stone weights on the corners
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => {
    const p = pt(c[0], c[1]);
    const r = Math.max(3, s / 26) * Math.max(0.7, lw);
    ctx.fillStyle = '#6d7277';
    ctx.beginPath(); ctx.arc(p[0], p[1] + r * 0.6, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath(); ctx.arc(p[0] - r * 0.3, p[1] + r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  ctx.lineCap = 'butt';
}

function drawCaptureOverlay() {
  const C = pro && pro.cap;
  if (!C) return;
  const t = C.t;
  if (t >= CAP_IMG1) { drawCaptureImages(t); return; }
  if (t >= CAP_CLOSE) { drawCaptureFall(t - CAP_CLOSE); return; }
  const B = proBallista();

  // the rope from the ballista winch to the net
  if (C.net && t >= CAP_FIRE) {
    const nx = t < CAP_HIT ? C.net.x : dragon.x, ny = t < CAP_HIT ? C.net.y : dragon.y - 20;
    const sag = t < CAP_DRAG ? 40 : 6;
    ctx.strokeStyle = '#d8cfb4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(B.x + 18, B.y + 10);
    ctx.quadraticCurveTo((B.x + nx) / 2, Math.max(B.y, ny) + sag, nx, ny);
    ctx.stroke();
  }

  // once they go over the battlements, only the part above the wall shows
  ctx.save();
  if (t >= CAP_OVER) { ctx.beginPath(); ctx.rect(-50, -50, width + 100, B.wallTop - 14 + 50); ctx.clip(); }
  const pitch = t >= CAP_HIT ? Math.sin(t * 0.35) * (0.25 + C.tumble * 0.6) : null;
  drawDragon(dragon.x, dragon.y, pitch);
  if (C.net && t >= CAP_FIRE && t < CAP_HIT) {
    // flying open, spinning
    drawSquareNet(C.net.x, C.net.y, 10 + C.net.open * 104, C.net.spin, 0);
  } else if (t >= CAP_HIT) {
    // draped over both of them
    const wrap = Math.min(1, (t - CAP_HIT) / 10);
    drawSquareNet(dragon.x + 4, dragon.y - 18, 114 - wrap * 6, (pitch || 0) * 0.8, 0.35 + wrap * 0.45);
  }
  ctx.restore();

  // letterbox, Khaleesi's lines, then a flash into the close-up
  const barH = height * 0.07 * Math.min(1, t / 25);
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -20, width + 40, barH + 20);
  ctx.fillRect(-20, height - barH, width + 40, barH + 20);
  renderMountedKhaleesiHUD();
  if (t >= CAP_CLOSE - 18) {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, (t - (CAP_CLOSE - 18)) / 16) + ')';
    ctx.fillRect(-20, -20, width + 40, height + 40);
  }
}

// Close-up: Cyndraxx and Khaleesi bound together in the net, tumbling through the dusk sky.
// The slavers' wall seen from inside the fall: stone courses scrolling up the right side of the screen,
// with its battlements rushing past at the start. f = frame of the fall.
function drawFallWall(f) {
  const wx = Math.round(width * 0.74);
  const top = Math.round(height * 0.3 - f * 5);      // top of the wall (battlements above it)
  const y0 = Math.max(top, 0);
  ctx.fillStyle = '#4a3f45';
  ctx.fillRect(wx, y0, width - wx, height - y0);
  const rowH = 18, brickW = 34;
  const first = Math.floor((y0 - top) / rowH);
  for (let r = first; top + r * rowH < height; r++) {
    const y = top + r * rowH;
    const off = (r % 2) * (brickW / 2);
    for (let x = wx - off; x < width; x += brickW) {
      const n = hash2(Math.floor((x - wx + off) / brickW) + 7, r);
      ctx.fillStyle = n < 0.33 ? '#564a50' : (n < 0.66 ? '#4f444a' : '#5c4f53');
      ctx.fillRect(Math.max(x, wx) + 1, y + 1, Math.min(brickW - 2, x + brickW - 1 - Math.max(x, wx)), rowH - 2);
    }
    // a lit arrow slit now and then
    if (r > 2 && hash2(r, 41) < 0.12) {
      const sx = wx + 14 + Math.floor(hash2(r, 42) * Math.max(1, width - wx - 34));
      ctx.fillStyle = '#1a1014'; ctx.fillRect(sx, y + 2, 6, rowH * 2 - 4);
      ctx.fillStyle = 'rgba(255,170,90,0.55)'; ctx.fillRect(sx + 2, y + 4, 2, rowH * 2 - 8);
    }
  }
  // battlements on top
  if (top > -30) {
    ctx.fillStyle = '#4a3f45';
    for (let x = wx; x < width; x += 28) ctx.fillRect(x, top - 16, 16, 16);
    ctx.fillStyle = '#6a5c60';
    for (let x = wx; x < width; x += 28) ctx.fillRect(x, top - 16, 16, 3);
  }
  // shadow along the wall's edge, so it reads as a face turned away from the light
  const sh = ctx.createLinearGradient(wx, 0, wx + 26, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.45)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(wx, y0, 26, height - y0);
  ctx.fillStyle = 'rgba(20,10,30,0.25)';   // dusk haze over the stone
  ctx.fillRect(wx, y0, width - wx, height - y0);
}

function drawCaptureFall(f) {
  const t = f / 60;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#120c24');
  g.addColorStop(0.55, '#3b1f45');
  g.addColorStop(1, '#7a3a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // clouds and wind streaks rushing up past them
  for (let i = 0; i < 7; i++) {
    const y = height + 120 - ((f * (2.2 + (i % 3) * 0.8) + i * 170) % (height + 260));
    const x = hash2(i, 3) * width;
    ctx.fillStyle = 'rgba(200,170,210,' + (0.06 + (i % 3) * 0.03) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, 90 + (i % 3) * 40, 26 + (i % 2) * 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const x = hash2(i, 9) * width;
    const len = 40 + hash2(i, 10) * 90;
    const y = height + len - ((f * (9 + hash2(i, 11) * 10) + hash2(i, 12) * 900) % (height + len * 2));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
  }
  // the inside face of the slavers' wall, rushing up past them (its battlements pass at the start)
  drawFallWall(f);
  // the two of them at their normal size, tumbling slowly down the screen
  const k0 = Math.min(1, f / CAP_FALL_FRAMES);
  const cx = width * 0.42 + Math.sin(t * 0.9) * 14;
  const cy = height * (0.2 + 0.32 * k0) + Math.sin(t * 1.3) * 6;
  const rot = Math.sin(t * 0.7) * 0.4 + 0.15;
  const glow = ctx.createRadialGradient(cx, cy - 12, 4, cx, cy - 12, 80);
  glow.addColorStop(0, 'rgba(255,200,150,0.28)');
  glow.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  dragon.wingState = 0.12 + Math.abs(Math.sin(f * 0.07)) * 0.08;   // wings pinned, barely moving
  drawDragon(0, 0, -0.15);
  ctx.globalAlpha = 0.8;                // the game's net wrapped around them, a little see-through so they still read
  drawSquareNet(3, -14, 92, 0, 0.75);
  ctx.globalAlpha = 1;
  ctx.restore();
  // a tear-shaped heart rising between them
  if (f > 70) {
    const k = ((f - 70) % 150) / 150;
    const hx = cx + 4, hy = cy - 40 - k * 40;
    ctx.save();
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.85;
    ctx.fillStyle = '#ff6b8a';
    ctx.translate(hx, hy);
    ctx.scale(1.4, 1.4);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-7, -2, -4, -8, 0, -4);
    ctx.bezierCurveTo(4, -8, 7, -2, 0, 4);
    ctx.fill();
    ctx.restore();
  }
  // her words, typed slowly
  if (f > 40) {
    ctx.font = 'bold 15px "Proxima Nova", sans-serif';
    ctx.textAlign = 'center';
    const shown = CAP_FALL_LINE.slice(0, Math.floor((f - 40) * 0.55));
    const lines = biWrap(CAP_FALL_LINE, width - 60);
    let left = shown.length;
    lines.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left));
      left -= ln.length + 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(part, width / 2 + 1, height * 0.78 + i * 21 + 1);
      ctx.fillStyle = '#ffe9f0';
      ctx.fillText(part, width / 2, height * 0.78 + i * 21);
    });
    ctx.textAlign = 'left';
  }
  // letterbox and fades
  const barH = height * 0.07;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, barH);
  ctx.fillRect(0, height - barH, width, barH);
  let fade = 0;
  if (f < 30) fade = 1 - f / 30;
  if (f > CAP_FALL_FRAMES - 45) fade = Math.min(1, (f - (CAP_FALL_FRAMES - 45)) / 40);
  if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, width, height); }
}

// The two story paintings, each fading in and out with a slow push-in and a caption.
function drawCaptureImages(t) {
  const second = t >= CAP_IMG2;
  drawStoryPicture(second ? captureImg2 : captureImg1, CAP_IMG_CAPTIONS[second ? 1 : 0], t - (second ? CAP_IMG2 : CAP_IMG1), CAP_IMG_FRAMES);
}

// One full-screen storybook picture: fade in, slow push-in, caption, fade out. f = frame within it.
function drawStoryPicture(img, cap, f, frames) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (img.complete && img.naturalWidth) {
    const zoom = 1 + (f / frames) * 0.06;
    const sc = Math.min(width / img.naturalWidth, height / img.naturalHeight) * zoom;
    const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  }
  // caption on a dark band at the bottom
  const ca = Math.max(0, Math.min(1, (f - 30) / 25));
  if (ca > 0) {
    const bandH = 54;
    const gr = ctx.createLinearGradient(0, height - bandH - 30, 0, height);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.4, 'rgba(0,0,0,' + 0.75 * ca + ')');
    gr.addColorStop(1, 'rgba(0,0,0,' + 0.85 * ca + ')');
    ctx.fillStyle = gr;
    ctx.fillRect(0, height - bandH - 30, width, bandH + 30);
    ctx.globalAlpha = ca;
    ctx.fillStyle = '#f3e6d0';
    ctx.font = 'bold 15px "Proxima Nova", sans-serif';
    ctx.textAlign = 'center';
    biWrap(cap, width - 40).forEach((ln, i) => ctx.fillText(ln, width / 2, height - bandH + 14 + i * 19));
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  let fade = 0;
  if (f < 25) fade = 1 - f / 25;
  if (f > frames - 25) fade = (f - (frames - 25)) / 25;
  if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')'; ctx.fillRect(0, 0, width, height); }
}

// ---------- the spring festival ----------
// the great hall: plank walls, flower garlands, a big thatched roof with crossed gable timbers
function drawFestHall(x, base, seed) {
  const w = FEST_HALL_W, wy = base - FEST_WALL_H, rTop = wy - FEST_ROOF_H;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x - 6, base - 3, w + 12, 5);
  // plank walls
  ctx.fillStyle = '#9a6a3c';
  ctx.fillRect(x, wy, w, FEST_WALL_H);
  for (let px = x; px < x + w; px += 9) {
    ctx.fillStyle = hash2(seed, px) < 0.5 ? '#8a5c32' : '#a8774a';
    ctx.fillRect(px, wy, 8, FEST_WALL_H);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(px + 8, wy, 1, FEST_WALL_H);
  }
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x, wy, 5, FEST_WALL_H); ctx.fillRect(x + w - 5, wy, 5, FEST_WALL_H);
  ctx.fillRect(x, wy + FEST_WALL_H * 0.45, w, 3);
  // big double doors, open, with warm light inside
  const dx = x + w * 0.62, dw = 40;
  ctx.fillStyle = '#ffcf7a';
  ctx.fillRect(dx, base - 38, dw, 38);
  ctx.fillStyle = '#e8a64a';
  ctx.fillRect(dx, base - 12, dw, 12);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(dx - 4, base - 42, dw + 8, 4);
  ctx.fillRect(dx - 10, base - 38, 8, 38); ctx.fillRect(dx + dw + 2, base - 38, 8, 38);
  // windows
  [x + w * 0.12, x + w * 0.34].forEach(wx => {
    ctx.fillStyle = '#3a2410'; ctx.fillRect(wx, wy + 9, 16, 13);
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(wx + 2, wy + 11, 12, 9);
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(wx + 7, wy + 9, 2, 13);
  });
  // thatched roof
  ctx.fillStyle = '#a77e34';
  ctx.beginPath();
  ctx.moveTo(x - 16, wy + 8);
  ctx.quadraticCurveTo(x + w * 0.06, rTop + 10, x + w * 0.2, rTop);
  ctx.lineTo(x + w * 0.8, rTop);
  ctx.quadraticCurveTo(x + w * 0.94, rTop + 10, x + w + 16, wy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#d4ad55';
  ctx.fillRect(x - 20, rTop, w + 40, FEST_ROOF_H + 10);
  for (let r = 0; r < 5; r++) {
    const ry = rTop + 8 + r * (FEST_ROOF_H / 5);
    ctx.fillStyle = '#b08636'; ctx.fillRect(x - 20, ry + FEST_ROOF_H / 5 - 3, w + 40, 2);
    ctx.fillStyle = '#e6c46e'; ctx.fillRect(x - 20, ry, w + 40, 1);
  }
  ctx.strokeStyle = 'rgba(120,85,30,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < w + 40; i += 4) {
    const sx = x - 20 + i, sy = rTop + hash2(seed, i) * FEST_ROOF_H, len = 4 + hash2(seed + i, 3) * 7;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 1, sy + len); ctx.stroke();
  }
  // flower petals scattered on the thatch
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = FLOWER_COLORS[Math.floor(hash2(seed + i, 9) * FLOWER_COLORS.length)];
    ctx.fillRect(x + hash2(seed, i + 70) * w, rTop + 6 + hash2(seed, i + 140) * (FEST_ROOF_H - 10), 2, 2);
  }
  ctx.restore();
  // ridge and crossed gable timbers
  ctx.fillStyle = '#8f6a2a';
  ctx.fillRect(x + w * 0.2, rTop - 3, w * 0.6, 5);
  [[x + w * 0.2, -1], [x + w * 0.8, 1]].forEach(g => {
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g[0] - 10, rTop + 6); ctx.lineTo(g[0] + 10, rTop - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g[0] + 10, rTop + 6); ctx.lineTo(g[0] - 10, rTop - 16); ctx.stroke();
    ctx.lineCap = 'butt';
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = FLOWER_COLORS[(i + (g[1] > 0 ? 2 : 0)) % FLOWER_COLORS.length];
      ctx.beginPath(); ctx.arc(g[0] - 8 + i * 4, rTop - 1 + (i % 2) * 2, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  });
  // ragged eave and a flower garland under it
  ctx.fillStyle = '#b58c3c';
  for (let i = -16; i < w + 16; i += 4) ctx.fillRect(x + i, wy + 5 + hash2(seed, i + 300) * 5, 3, 4);
  for (let s = 0; s < 4; s++) {
    const gx = x + 6 + s * (w - 12) / 4, gw = (w - 12) / 4;
    for (let i = 0; i <= 8; i++) {
      const px = gx + gw * i / 8, py = wy + 14 + Math.sin(Math.PI * i / 8) * 9;
      ctx.fillStyle = i % 2 ? '#3f8a3a' : FLOWER_COLORS[(i + s) % FLOWER_COLORS.length];
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFestival(e) {
  const hallBase = proGroundY(e.x + FEST_HALL_W / 2);
  const sqX = e.x + FEST_HALL_W + FEST_GAP;
  // packed-earth square
  const sqY = proGroundY(sqX + FEST_SQUARE_W / 2);
  ctx.fillStyle = 'rgba(201,166,107,0.85)';
  ctx.beginPath(); ctx.ellipse(sqX + FEST_SQUARE_W / 2, sqY + 6, FEST_SQUARE_W / 2 + 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  drawFestHall(e.x, hallBase, e.seed);
  // bunting from the hall roof to the maypole and on to a post
  const poleX = sqX + FEST_POLE_DX;
  const topY = proGroundY(poleX) - 86;
  const post = { x: sqX + FEST_SQUARE_W - 6, y: proGroundY(sqX + FEST_SQUARE_W - 6) - 52 };
  ctx.fillStyle = '#7a5230'; ctx.fillRect(post.x - 2, post.y, 4, 52);
  const hang = (ax, ay, bx, by) => {
    ctx.strokeStyle = '#efe3c8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 20, bx, by); ctx.stroke();
    for (let i = 1; i < 12; i++) {
      const u = i / 12;
      const px = ax + (bx - ax) * u;
      const py = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * (Math.max(ay, by) + 20) + u * u * by;
      ctx.fillStyle = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#ff7fbf', '#9b59b6'][i % 6];
      ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 8); ctx.fill();
    }
  };
  hang(e.x + FEST_HALL_W * 0.8 + 8, hallBase - FEST_WALL_H - FEST_ROOF_H + 4, poleX, topY + 6);
  hang(poleX, topY + 6, post.x, post.y);
  // the maypole ring and the crowd
  e.pole.x = poleX;
  drawMaypole(e.pole, proGroundY(poleX));
  e.crowd.x = sqX;
  drawCrowd(e.crowd);
  // "land here" marker while flying in
  const F = pro.fest;
  if (F && F.ent === e && F.phase === 'approach' && F.announced) {
    const ax = e.x + FEST_HALL_W * 0.45;
    const ay = hallBase - FEST_WALL_H - FEST_ROOF_H - 40 - Math.abs(Math.sin(Date.now() / 220)) * 10;
    ctx.save();
    ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#5a3a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax - 12, ay); ctx.lineTo(ax + 12, ay); ctx.lineTo(ax + 12, ay + 10); ctx.lineTo(ax + 20, ay + 10);
    ctx.lineTo(ax, ay + 28); ctx.lineTo(ax - 20, ay + 10); ctx.lineTo(ax - 12, ay + 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.font = 'bold 13px "Proxima Nova", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeText('LAND HERE', ax, ay - 6); ctx.fillText('LAND HERE', ax, ay - 6);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// the festival storybook (dance1, dance2), drawn over everything
function drawFestStory() {
  const F = pro && pro.fest;
  if (!F || F.phase !== 'story') return;
  const second = F.t >= FEST_IMG_FRAMES;
  drawStoryPicture(second ? danceImg2 : danceImg1, FEST_CAPTIONS[second ? 1 : 0], F.t - (second ? FEST_IMG_FRAMES : 0), FEST_IMG_FRAMES);
}

// ---------- story message screens (opening invitation and the capture letter) ----------
function drawStoryMessage(lines, donePrompt, nameTag) {
  const portraitSize = 180;
  const pX = (width - portraitSize) / 2;
  const pY = height / 2 - 10;
  const activeFrame = (Math.floor(Date.now() / 5000) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;
  const bH = speechBoxHeight(lines.length, 13, 18);
  drawSpeechBox(lines, width / 2, pY - 20 - bH, 13, 18, '#000000', Math.floor(typedCharIndex));

  ctx.fillStyle = '#11161d';
  ctx.fillRect(pX, pY, portraitSize, portraitSize);
  if (activeFrame.complete && activeFrame.naturalWidth !== 0) ctx.drawImage(activeFrame, pX, pY, portraitSize, portraitSize);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f1c40f';
  ctx.strokeRect(pX, pY, portraitSize, portraitSize);

  let promptY = pY + portraitSize + 35;
  if (nameTag) {   // who is speaking, on a gold plate under the portrait
    fitFont(nameTag, 20, width - 40);
    const tw = ctx.measureText(nameTag).width + 28, ty = pY + portraitSize + 8;
    ctx.fillStyle = '#5a1a12';
    ctx.fillRect((width - tw) / 2, ty, tw, 30);
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect((width - tw) / 2, ty, tw, 30);
    ctx.fillStyle = '#f1c40f';
    ctx.textAlign = 'center';
    ctx.fillText(nameTag, width / 2, ty + 22);
    promptY += 34;
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Proxima Nova", sans-serif';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  const prompt = textTypingComplete ? donePrompt : 'TAP TO SHOW FULL MESSAGE';
  ctx.strokeText(prompt, width / 2, promptY);
  ctx.fillText(prompt, width / 2, promptY);
}

function drawCapturedMessage() {
  ctx.fillStyle = 'rgba(5, 5, 12, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#e74c3c';
  fitFont('DRAGON QUEEN SARAI HAS BEEN TAKEN', 24, width - 24);
  ctx.textAlign = 'center';
  ctx.fillText('DRAGON QUEEN SARAI HAS BEEN TAKEN', width / 2, height / 2 - 185);
  drawStoryMessage(fullStoryText, 'TAP TO CONTINUE');
}
