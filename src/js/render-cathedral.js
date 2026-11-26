// render-cathedral.js — Drawing for the level 2 cathedral encounter (logic in cathedral.js):
// the tower with its red tiled roof and great stained-glass window, the cathedral interior (golden vaults,
// rose window, lancet windows, angel statues holding up swords, candelabras, carpeted floor; the static parts
// are painted once into a cached layer three screens tall), Cyndraxx's fall, the dream, the heart container,
// the priest Clement the Simple and his iridescent power, and the dialogue boxes with the REST / FIGHT ON buttons.
// Classic script: shares global scope with the other src/js/*.js files.

const GLASS_COLORS = ['#c0392b', '#e74c3c', '#2e5fb8', '#3b8ee0', '#f1c40f', '#e6a817', '#1e8449', '#27ae60', '#7d3c98', '#a569bd'];
const CATH_STONE = { main: '#8d8371', dark: '#5f5747', light: '#ab9f8a' };
const CATH_STONE_OWNER = { brickStyle: 2, brickSeed: 311 };   // ashlar with quoins (render-masonry.js)

// A pointed (gothic) arch outline: springing line at ys, apex at y, sides down to y + h.
function gothicArchPath(c, x, y, w, h) {
  const ys = y + Math.min(h, w * 0.85);
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, ys);
  c.bezierCurveTo(x, ys - (ys - y) * 0.55, x + w * 0.22, y + (ys - y) * 0.12, x + w / 2, y);
  c.bezierCurveTo(x + w * 0.78, y + (ys - y) * 0.12, x + w, ys - (ys - y) * 0.55, x + w, ys);
  c.lineTo(x + w, y + h);
  c.closePath();
}

// Stained glass in a pointed window: colored panes in a lead grid, a mullion, a glow, a gold frame.
function drawLancet(c, x, y, w, h, seed, frame) {
  const LEAD = '#1b130c';
  c.save();
  gothicArchPath(c, x, y, w, h);
  c.clip();
  // a ruby border around a deep blue ground
  c.fillStyle = '#9e1426';
  c.fillRect(x, y, w, h);
  const bw = Math.max(4, w * 0.1);
  gothicArchPath(c, x + bw, y + bw, w - bw * 2, h - bw);
  c.fillStyle = '#1f3f94';
  c.fill();
  // jewels along the border
  for (let yy = y + w * 0.7; yy < y + h; yy += bw * 2) {
    [x + bw / 2, x + w - bw / 2].forEach((jx, k) => {
      c.fillStyle = (Math.floor(yy / bw) + k) % 2 ? '#f5c542' : '#eaf2ff';
      c.fillRect(jx - bw * 0.25, yy - bw * 0.25, bw * 0.5, bw * 0.5);
    });
  }
  // diamond "quarry" leading over the blue
  c.save();
  gothicArchPath(c, x + bw, y + bw, w - bw * 2, h - bw);
  c.clip();
  c.strokeStyle = 'rgba(10,20,50,0.7)';
  c.lineWidth = 1;
  const q = Math.max(8, w * 0.2);
  for (let d = -h; d < w + h; d += q) {
    c.beginPath(); c.moveTo(x + d, y); c.lineTo(x + d + h, y + h); c.stroke();
    c.beginPath(); c.moveTo(x + d, y); c.lineTo(x + d - h, y + h); c.stroke();
  }
  c.restore();
  // a quatrefoil in the head of the arch
  const qx = x + w / 2, qy = y + w * 0.5, qr = w * 0.11;
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([ox, oy], k) => {
    c.fillStyle = k % 2 ? '#f5c542' : '#d63a2a';
    c.beginPath(); c.arc(qx + ox * qr, qy + oy * qr, qr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = LEAD; c.lineWidth = 1.2; c.stroke();
  });
  // stacked medallions, each with a little robed figure
  const mr = w * 0.27, step = mr * 2.5;
  const robes = ['#c0392b', '#1e8449', '#e6a817', '#7d3c98', '#2e86de'];
  for (let i = 0, my = y + w * 0.5 + step; my + mr < y + h - 4; i++, my += step) {
    c.fillStyle = '#f5c542';
    c.beginPath(); c.arc(qx, my, mr, 0, Math.PI * 2); c.fill();
    c.fillStyle = i % 2 ? '#a3172a' : '#2a7a4a';
    c.beginPath(); c.arc(qx, my, mr * 0.82, 0, Math.PI * 2); c.fill();
    c.fillStyle = robes[(i + Math.floor(seed)) % robes.length];
    c.beginPath(); c.moveTo(qx - mr * 0.38, my + mr * 0.62); c.lineTo(qx, my - mr * 0.2); c.lineTo(qx + mr * 0.38, my + mr * 0.62); c.closePath(); c.fill();
    c.fillStyle = '#f6e7c8';
    c.beginPath(); c.arc(qx, my - mr * 0.34, mr * 0.17, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f5c542'; c.lineWidth = 1;
    c.beginPath(); c.arc(qx, my - mr * 0.38, mr * 0.26, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.strokeStyle = LEAD; c.lineWidth = 1.4;
    c.beginPath(); c.arc(qx, my, mr, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(qx, my, mr * 0.82, 0, Math.PI * 2); c.stroke();
  }
  c.strokeStyle = LEAD;
  c.lineWidth = 1.5;
  gothicArchPath(c, x + bw, y + bw, w - bw * 2, h - bw);
  c.stroke();
  // inner glow
  const gl = c.createRadialGradient(x + w / 2, y + h * 0.45, 2, x + w / 2, y + h * 0.45, h * 0.7);
  gl.addColorStop(0, 'rgba(255,240,200,0.35)');
  gl.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = gl;
  c.fillRect(x, y, w, h);
  c.restore();
  if (frame !== false) {
    gothicArchPath(c, x, y, w, h);
    c.lineWidth = Math.max(3, w * 0.06);
    c.strokeStyle = '#d9a93a';
    c.stroke();
    c.lineWidth = 1.2;
    c.strokeStyle = '#6b4a12';
    c.stroke();
  }
}

// The great rose window
function drawRose(c, cx, cy, r) {
  c.save();
  c.fillStyle = '#1b130c';
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  const petals = 12;
  const ringCols = [['#c0392b', '#e6a817'], ['#1f3f94', '#2e86de'], ['#a3172a', '#1f3f94']];
  for (let ring = 0; ring < 3; ring++) {
    const r0 = r * (0.22 + ring * 0.26), r1 = r * (0.46 + ring * 0.26);
    const n = petals * (ring + 1);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      c.fillStyle = ringCols[ring][i % 2];
      c.beginPath();
      c.arc(cx, cy, r1 - 1, a0, a1);
      c.arc(cx, cy, r0 + 1, a1, a0, true);
      c.closePath();
      c.fill();
    }
  }
  // tracery: radial lead lines and little roundels at the petal tips
  c.strokeStyle = '#1b130c';
  c.lineWidth = 1.5;
  for (let i = 0; i < petals * 3; i++) {
    const a = (i / (petals * 3)) * Math.PI * 2;
    const from = i % 3 === 0 ? 0.22 : (i % 3 === 1 ? 0.72 : 0.48);
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r * from, cy + Math.sin(a) * r * from); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke();
  }
  for (let i = 0; i < petals; i++) {
    const a = ((i + 0.5) / petals) * Math.PI * 2;
    const tx = cx + Math.cos(a) * r * 0.86, ty = cy + Math.sin(a) * r * 0.86;
    c.fillStyle = i % 2 ? '#f5c542' : '#eaf2ff';
    c.beginPath(); c.arc(tx, ty, r * 0.07, 0, Math.PI * 2); c.fill(); c.stroke();
    const mx = cx + Math.cos(a) * r * 0.59, my = cy + Math.sin(a) * r * 0.59;
    c.fillStyle = '#1e8449';
    c.beginPath(); c.arc(mx, my, r * 0.06, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  c.fillStyle = '#f5d76e';
  c.beginPath(); c.arc(cx, cy, r * 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c0392b';
  c.beginPath(); c.arc(cx, cy, r * 0.11, 0, Math.PI * 2); c.fill();
  const gl = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  gl.addColorStop(0, 'rgba(255,245,210,0.45)');
  gl.addColorStop(1, 'rgba(255,245,210,0.05)');
  c.fillStyle = gl;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.lineWidth = Math.max(4, r * 0.07);
  c.strokeStyle = '#d9a93a';
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = '#8a6418';
  c.beginPath(); c.arc(cx, cy, r * 0.48, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx, cy, r * 0.74, 0, Math.PI * 2); c.stroke();
  c.restore();
}

// A marble angel with outstretched wings holding a sword up high. (x, baseY) = feet; h = figure height.
function drawAngelStatue(c, x, baseY, h) {
  const M = '#ddd6c6', S = '#a89f8d', HI = '#f6f2e8', D = '#7d7465';
  c.save();
  c.lineJoin = 'round';
  // wings, behind the body
  [-1, 1].forEach(side => {
    const sx = x + side * h * 0.05, sy = baseY - h * 0.7;
    c.beginPath();
    c.moveTo(sx, sy);
    c.quadraticCurveTo(x + side * h * 0.35, baseY - h * 1.12, x + side * h * 0.66, baseY - h * 1.02);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {   // scalloped feather tips along the lower edge
      const u = i / steps;
      const px = x + side * h * (0.66 - u * 0.5), py = baseY - h * (1.02 - u * 0.62);
      const mx = x + side * h * (0.66 - (u - 0.5 / steps) * 0.5) + side * h * 0.05, my = baseY - h * (1.02 - (u - 0.5 / steps) * 0.62) + h * 0.06;
      c.quadraticCurveTo(mx, my, px, py);
    }
    c.closePath();
    const wg = c.createLinearGradient(sx, sy - h * 0.4, x + side * h * 0.6, sy + h * 0.2);
    wg.addColorStop(0, HI); wg.addColorStop(0.6, M); wg.addColorStop(1, S);
    c.fillStyle = wg;
    c.fill();
    c.strokeStyle = D; c.lineWidth = 1.2; c.stroke();
    // feather rows
    c.strokeStyle = 'rgba(110,100,85,0.6)';
    c.lineWidth = 1;
    for (let row = 1; row <= 3; row++) {
      c.beginPath();
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const px = sx + (x + side * h * (0.62 - row * 0.05) - sx) * u;
        const py = sy - h * 0.12 * row * (1 - u) - h * (0.28 - row * 0.03) * Math.sin(u * Math.PI * 0.9) + h * 0.06 * row;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
    }
  });
  // robe
  c.beginPath();
  c.moveTo(x - h * 0.17, baseY);
  c.lineTo(x - h * 0.08, baseY - h * 0.66);
  c.lineTo(x + h * 0.08, baseY - h * 0.66);
  c.lineTo(x + h * 0.17, baseY);
  c.closePath();
  const rg = c.createLinearGradient(x - h * 0.17, 0, x + h * 0.17, 0);
  rg.addColorStop(0, S); rg.addColorStop(0.4, HI); rg.addColorStop(1, S);
  c.fillStyle = rg; c.fill();
  c.strokeStyle = 'rgba(110,100,85,0.7)'; c.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {     // folds
    c.beginPath(); c.moveTo(x + i * h * 0.02, baseY - h * 0.6); c.lineTo(x + i * h * 0.06, baseY - 2); c.stroke();
  }
  // shoulders and arms raised, hands meeting above the head
  c.fillStyle = M;
  c.fillRect(x - h * 0.09, baseY - h * 0.74, h * 0.18, h * 0.1);
  c.strokeStyle = M; c.lineWidth = h * 0.045; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - h * 0.08, baseY - h * 0.72); c.lineTo(x - h * 0.06, baseY - h * 0.86); c.lineTo(x, baseY - h * 0.97); c.stroke();
  c.beginPath(); c.moveTo(x + h * 0.08, baseY - h * 0.72); c.lineTo(x + h * 0.06, baseY - h * 0.86); c.lineTo(x, baseY - h * 0.97); c.stroke();
  // halo and head
  c.strokeStyle = '#e8c35a'; c.lineWidth = Math.max(2, h * 0.018);
  c.beginPath(); c.ellipse(x, baseY - h * 0.86, h * 0.07, h * 0.025, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = HI;
  c.beginPath(); c.arc(x, baseY - h * 0.8, h * 0.055, 0, Math.PI * 2); c.fill();
  c.fillStyle = S;
  c.beginPath(); c.arc(x + h * 0.015, baseY - h * 0.795, h * 0.04, -0.6, 1.4); c.fill();
  // the sword, held straight up
  c.fillStyle = '#e8eef2';
  c.beginPath();
  c.moveTo(x - h * 0.018, baseY - h * 1.0);
  c.lineTo(x - h * 0.018, baseY - h * 1.36);
  c.lineTo(x, baseY - h * 1.42);
  c.lineTo(x + h * 0.018, baseY - h * 1.36);
  c.lineTo(x + h * 0.018, baseY - h * 1.0);
  c.closePath(); c.fill();
  c.fillStyle = '#b9c3c9';
  c.fillRect(x, baseY - h * 1.36, h * 0.018, h * 0.36);
  c.fillStyle = '#e0b040';
  c.fillRect(x - h * 0.07, baseY - h * 1.0, h * 0.14, h * 0.025);
  c.fillRect(x - h * 0.012, baseY - h * 0.99, h * 0.024, h * 0.05);
  c.restore();
}

// A gold candelabra standing on the floor; returns its candle tips for live flames.
function paintCandelabra(c, x, baseY, h, arms, out) {
  c.save();
  c.fillStyle = '#c9972c';
  c.strokeStyle = '#d9a93a';
  c.lineWidth = Math.max(2, h * 0.025);
  // base
  c.beginPath();
  c.moveTo(x - h * 0.12, baseY); c.lineTo(x + h * 0.12, baseY); c.lineTo(x + h * 0.03, baseY - h * 0.08); c.lineTo(x - h * 0.03, baseY - h * 0.08);
  c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x, baseY - h * 0.08); c.lineTo(x, baseY - h * 0.82); c.stroke();
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x, baseY - h * (0.25 + i * 0.2), h * 0.02, 0, Math.PI * 2); c.fill(); }
  const top = baseY - h * 0.82;
  const spread = h * 0.24;
  for (let i = 0; i < arms; i++) {
    const u = arms === 1 ? 0 : (i / (arms - 1)) * 2 - 1;
    const cx = x + u * spread, cy = top - (1 - Math.abs(u)) * h * 0.08;
    c.beginPath(); c.moveTo(x, top + h * 0.06); c.quadraticCurveTo(cx, top + h * 0.08, cx, cy); c.stroke();
    c.fillStyle = '#c9972c';
    c.fillRect(cx - h * 0.03, cy - h * 0.01, h * 0.06, h * 0.02);
    c.fillStyle = '#f3ead2';                     // the candle
    c.fillRect(cx - h * 0.014, cy - h * 0.1, h * 0.028, h * 0.09);
    out.push({ x: cx, y: cy - h * 0.1, s: Math.max(3, h * 0.03) });
  }
  c.restore();
}

// Everything that doesn't move, laid out for this screen size. Returns { layer, candles, motes }.
const cathLayerCache = {};
function cathInterior() {
  const W = width, H = height, IH = cathInteriorH();
  const key = W + 'x' + H;
  if (cathLayerCache.key === key) return cathLayerCache;
  const candles = [];
  const layer = document.createElement('canvas');
  layer.width = W; layer.height = Math.ceil(IH);
  const c = layer.getContext('2d');
  const hY = IH - H * 0.3;                         // where the floor meets the back wall

  // walls: deep violet up in the vaults to warm candlelit gold below
  const bg = c.createLinearGradient(0, 0, 0, IH);
  bg.addColorStop(0, '#120d22');
  bg.addColorStop(0.35, '#251a2e');
  bg.addColorStop(0.7, '#3a2a24');
  bg.addColorStop(1, '#5a3e22');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, IH);
  // faint stone coursing
  c.strokeStyle = 'rgba(255,230,190,0.05)';
  c.lineWidth = 1;
  for (let y = 0; y < hY; y += 26) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    for (let x = ((y / 26) % 2) * 30; x < W; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 26); c.stroke(); }
  }

  // ---- the vault (top screen): golden ribs meeting at a boss, the rose window below them ----
  const capY = H * 0.62, apexY = H * 0.04;
  const capL = W * 0.035, capR = W * 0.965;
  // the vault web: a blue ceiling scattered with gold stars inside a great pointed arch
  const archCurve = () => {
    c.moveTo(capL, capY);
    c.bezierCurveTo(capL, capY - (capY - apexY) * 0.7, W * 0.3, apexY + 6, W * 0.5, apexY);
    c.bezierCurveTo(W * 0.7, apexY + 6, capR, capY - (capY - apexY) * 0.7, capR, capY);
  };
  c.save();
  c.beginPath(); archCurve(); c.closePath();
  const web = c.createLinearGradient(0, apexY, 0, capY);
  web.addColorStop(0, '#1d2c66'); web.addColorStop(1, '#121838');
  c.fillStyle = web;
  c.fill();
  c.clip();
  c.fillStyle = 'rgba(245,205,95,0.8)';
  for (let i = 0; i < 70; i++) {
    const sx = hash2(i, 3) * W, sy = apexY + hash2(i, 7) * (capY - apexY);
    const s = hash2(i, 11) < 0.25 ? 3 : 2;
    c.fillRect(sx, sy, s, s);
  }
  c.restore();
  // golden ribs fanning up from each capital to the crown of the vault
  c.save();
  c.lineCap = 'round';
  const ribTo = [[0.5, 0], [0.36, 0.06], [0.22, 0.2], [0.64, 0.06], [0.78, 0.2]];
  [capL, capR].forEach(cx0 => {
    ribTo.forEach(([fx, fy]) => {
      const tx = W * fx, ty = apexY + (capY - apexY) * fy;
      c.beginPath();
      c.moveTo(cx0, capY);
      c.quadraticCurveTo(cx0, ty + (capY - ty) * 0.15, tx, ty);
      c.strokeStyle = '#6b4a12'; c.lineWidth = 7; c.stroke();
      c.strokeStyle = '#e2b34a'; c.lineWidth = 3; c.stroke();
    });
  });
  c.beginPath(); archCurve();
  c.strokeStyle = '#6b4a12'; c.lineWidth = 12; c.stroke();
  c.strokeStyle = '#ecc35c'; c.lineWidth = 5; c.stroke();
  c.fillStyle = '#e2b34a';
  c.beginPath(); c.arc(W * 0.5, apexY + 4, 13, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#9a6d16';
  c.beginPath(); c.arc(W * 0.5, apexY + 4, 6, 0, Math.PI * 2); c.fill();
  // gold capitals where the ribs spring
  [capL, capR].forEach(cx0 => {
    c.fillStyle = '#d9a93a';
    c.beginPath(); c.moveTo(cx0 - 16, capY + 10); c.lineTo(cx0 + 16, capY + 10); c.lineTo(cx0 + 9, capY - 4); c.lineTo(cx0 - 9, capY - 4); c.closePath(); c.fill();
  });
  c.restore();
  drawRose(c, W * 0.5, H * 0.75, Math.min(W * 0.28, H * 0.155));

  // clustered columns down both sides, with gold capitals and bands
  [0.035, 0.965].forEach(fx => {
    const cx = W * fx, cw = Math.max(16, W * 0.055);
    const cg = c.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
    cg.addColorStop(0, '#4a3c34'); cg.addColorStop(0.45, '#8c7a66'); cg.addColorStop(1, '#3a2e28');
    c.fillStyle = cg;
    c.fillRect(cx - cw / 2, capY + 8, cw, hY - capY - 8);
    c.fillStyle = '#d9a93a';
    for (let y = H * 0.85; y < hY; y += H * 0.55) c.fillRect(cx - cw / 2 - 3, y, cw + 6, 7);
  });
  // gold string courses between the levels
  [H * 0.92, H * 1.92].forEach(y => {
    c.fillStyle = '#b8862a'; c.fillRect(0, y, W, 6);
    c.fillStyle = '#ecc35c'; c.fillRect(0, y, W, 2);
  });

  // ---- the middle: tall lancet windows with light falling from them, an angel, a chandelier ----
  const lw = W * 0.2, lh = H * 0.62;
  const lancets = [[W * 0.1, H * 1.08], [W * 0.7, H * 1.08], [W * 0.1, H * 2.02], [W * 0.7, H * 2.02]];
  lancets.forEach(([lx, ly], i) => {
    if (ly + lh > hY - H * 0.62 && i >= 2) return;   // the lower pair only if they fit above the arcade
    drawLancet(c, lx, ly, lw, lh, 40 + i * 17);
  });
  // beams of colored light slanting down from the windows
  c.save();
  c.globalCompositeOperation = 'lighter';
  lancets.slice(0, 2).forEach(([lx, ly], i) => {
    const dir = i === 0 ? 1 : -1;
    const gr = c.createLinearGradient(lx, ly, lx + dir * W * 0.4, ly + H * 1.1);
    gr.addColorStop(0, 'rgba(255,220,160,0.16)');
    gr.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(lx + lw * 0.15, ly + lh * 0.3);
    c.lineTo(lx + lw * 0.85, ly + lh * 0.3);
    c.lineTo(lx + lw * 0.85 + dir * W * 0.45, ly + H * 1.3);
    c.lineTo(lx + lw * 0.15 + dir * W * 0.45, ly + H * 1.3);
    c.closePath();
    c.fill();
  });
  c.restore();
  // an angel on a gold corbel between the windows
  const angH = Math.min(H * 0.24, W * 0.36);
  const angY = H * 1.66;
  c.fillStyle = '#b8862a';
  c.beginPath(); c.moveTo(W * 0.5 - angH * 0.28, angY); c.lineTo(W * 0.5 + angH * 0.28, angY); c.lineTo(W * 0.5, angY + angH * 0.3); c.closePath(); c.fill();
  c.fillStyle = '#ecc35c'; c.fillRect(W * 0.5 - angH * 0.28, angY, angH * 0.56, 3);
  drawAngelStatue(c, W * 0.5, angY, angH);
  // wall sconces with candles along the columns
  for (let y = H * 1.25; y < hY - H * 0.2; y += H * 0.42) {
    [W * 0.035, W * 0.965].forEach(sx => {
      c.fillStyle = '#c9972c';
      c.fillRect(sx - 9, y, 18, 4);
      c.fillStyle = '#f3ead2';
      c.fillRect(sx - 3, y - 12, 6, 12);
      candles.push({ x: sx, y: y - 12, s: 4 });
    });
  }
  // ---- the bottom: a golden arcade, angel statues in the side arches, the altar, the carpeted floor ----
  const arcTop = IH - H * 0.98;
  const arches = [[0.03, 0.27], [0.33, 0.34], [0.7, 0.27]];
  arches.forEach(([fx, fw], i) => {
    const ax = W * fx, aw = W * fw;
    gothicArchPath(c, ax, arcTop + (i === 1 ? 0 : H * 0.08), aw, hY - arcTop - (i === 1 ? 0 : H * 0.08));
    c.fillStyle = i === 1 ? '#2a1c16' : '#1d1418';
    c.fill();
    c.lineWidth = Math.max(5, W * 0.014);
    c.strokeStyle = '#d9a93a';
    c.stroke();
    c.lineWidth = 1.5;
    c.strokeStyle = '#6b4a12';
    c.stroke();
  });
  // a window glowing behind the altar
  drawLancet(c, W * 0.42, arcTop + H * 0.08, W * 0.16, H * 0.36, 77);
  // golden pillars between the arches
  [[0.3], [0.67]].forEach(([fx]) => {
    const px = W * fx, pw = Math.max(10, W * 0.03);
    const pg = c.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
    pg.addColorStop(0, '#8a6418'); pg.addColorStop(0.5, '#ecc35c'); pg.addColorStop(1, '#7a5612');
    c.fillStyle = pg;
    c.fillRect(px - pw / 2, arcTop + H * 0.06, pw, hY - arcTop - H * 0.06);
  });
  // the big angels, swords raised, in the side arches
  const bigH = Math.min(H * 0.34, W * 0.3);
  [W * 0.165, W * 0.835].forEach(ax => {
    c.fillStyle = '#6e6252';
    c.fillRect(ax - bigH * 0.22, hY - bigH * 0.16, bigH * 0.44, bigH * 0.16);
    c.fillStyle = '#d9a93a';
    c.fillRect(ax - bigH * 0.24, hY - bigH * 0.16, bigH * 0.48, 3);
    drawAngelStatue(c, ax, hY - bigH * 0.16, bigH);
  });
  // the chandelier: a gold ring on a chain, candles all around
  const chY = IH - H * 0.66, chR = Math.min(W * 0.2, 90);
  c.strokeStyle = '#8a6418'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(W * 0.5, H * 1.95); c.lineTo(W * 0.5, chY - 18); c.stroke();
  c.beginPath(); c.moveTo(W * 0.5, chY - 18); c.lineTo(W * 0.5 - chR, chY); c.moveTo(W * 0.5, chY - 18); c.lineTo(W * 0.5 + chR, chY); c.stroke();
  c.strokeStyle = '#d9a93a'; c.lineWidth = 4;
  c.beginPath(); c.ellipse(W * 0.5, chY, chR, chR * 0.18, 0, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const cx = W * 0.5 + Math.cos(a) * chR, cy = chY + Math.sin(a) * chR * 0.18;
    c.fillStyle = '#f3ead2';
    c.fillRect(cx - 2, cy - 10, 4, 10);
    candles.push({ x: cx, y: cy - 10, s: 3.5 });
  }

  // the altar
  const alW = W * 0.2, alH = H * 0.07;
  c.fillStyle = '#5a4636';
  c.fillRect(W * 0.5 - alW * 0.65, hY - 8, alW * 1.3, 8);
  c.fillStyle = '#e8dcc0';
  c.fillRect(W * 0.5 - alW / 2, hY - 8 - alH, alW, alH);
  c.fillStyle = '#d9a93a';
  c.fillRect(W * 0.5 - alW / 2, hY - 8 - alH, alW, 5);
  c.fillRect(W * 0.5 - alW * 0.12, hY - 8 - alH + 10, alW * 0.24, alH - 14);
  paintCandelabra(c, W * 0.5 - alW * 0.36, hY - 8 - alH, H * 0.09, 1, candles);
  paintCandelabra(c, W * 0.5 + alW * 0.36, hY - 8 - alH, H * 0.09, 1, candles);

  // the marble floor in perspective
  const vpX = W / 2, vpY = hY - H * 0.5;
  const fg = c.createLinearGradient(0, hY, 0, IH);
  fg.addColorStop(0, '#5c4632'); fg.addColorStop(1, '#2e2016');
  c.fillStyle = fg;
  c.fillRect(0, hY, W, IH - hY);
  const rowsY = [];
  for (let i = 0; i <= 8; i++) rowsY.push(hY + (IH - hY) * Math.pow(i / 8, 1.6));
  const colX = [];
  for (let j = -6; j <= 6; j++) colX.push(vpX + j * W * 0.18);
  const atY = (bx, y) => vpX + (bx - vpX) * (y - vpY) / (IH - vpY);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < colX.length - 1; j++) {
      if ((i + j) % 2) continue;
      const y0 = rowsY[i], y1 = rowsY[i + 1];
      c.fillStyle = 'rgba(15,8,4,0.32)';
      c.beginPath();
      c.moveTo(atY(colX[j], y0), y0); c.lineTo(atY(colX[j + 1], y0), y0);
      c.lineTo(atY(colX[j + 1], y1), y1); c.lineTo(atY(colX[j], y1), y1);
      c.closePath(); c.fill();
    }
  }
  // the carpet: deep crimson with gold borders, running to the altar
  const cl = W * 0.1, cr = W * 0.9;
  c.beginPath();
  c.moveTo(atY(cl, hY), hY); c.lineTo(atY(cr, hY), hY); c.lineTo(cr, IH); c.lineTo(cl, IH); c.closePath();
  const cg = c.createLinearGradient(0, hY, 0, IH);
  cg.addColorStop(0, '#6e1018'); cg.addColorStop(1, '#a0202a');
  c.fillStyle = cg;
  c.fill();
  c.strokeStyle = '#e2b34a';
  c.lineWidth = 3;
  [0.06, 0.94].forEach(f => {
    const bx = cl + (cr - cl) * f;
    c.beginPath(); c.moveTo(atY(bx, hY), hY); c.lineTo(bx, IH); c.stroke();
  });
  c.fillStyle = 'rgba(226,179,74,0.75)';
  for (let i = 1; i < 8; i++) {
    const y = rowsY[i], s = 2 + i * 1.3;
    c.beginPath(); c.moveTo(vpX, y - s); c.lineTo(vpX + s * 1.5, y); c.lineTo(vpX, y + s); c.lineTo(vpX - s * 1.5, y); c.closePath(); c.fill();
  }
  // tall floor candelabras at the front
  paintCandelabra(c, W * 0.06, IH - H * 0.04, H * 0.34, 3, candles);
  paintCandelabra(c, W * 0.94, IH - H * 0.04, H * 0.34, 3, candles);

  cathLayerCache.key = key;
  cathLayerCache.layer = layer;
  cathLayerCache.candles = candles;
  return cathLayerCache;
}

// ---- the tower in the level ----
function drawCathedralTower() {
  const c = cathedral;
  if (!c || c.x > width + 40) return;
  const g = cathedralGeom(c);
  const x = c.x, W = CATH_W;
  // stone body
  drawMasonry(x, g.bodyTop, W, g.gY - g.bodyTop, CATH_STONE, CATH_STONE_OWNER);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + W - 10, g.bodyTop, 10, g.gY - g.bodyTop);
  // little buttresses
  ctx.fillStyle = '#6c6354';
  ctx.fillRect(x - 6, g.bodyTop + 40, 8, g.gY - g.bodyTop - 40);
  ctx.fillRect(x + W - 2, g.bodyTop + 40, 8, g.gY - g.bodyTop - 40);
  // the great window
  if (!c.broken) {
    drawLancet(ctx, g.winX, g.winTop, CATH_WIN_W, CATH_WIN_H, 7);
    // a soft shimmer so it catches the eye (without saying anything)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = 0.12 + Math.sin(Date.now() / 400) * 0.06;
    const gl = ctx.createRadialGradient(g.winX + CATH_WIN_W / 2, g.winTop + CATH_WIN_H / 2, 4, g.winX + CATH_WIN_W / 2, g.winTop + CATH_WIN_H / 2, CATH_WIN_H * 0.75);
    gl.addColorStop(0, 'rgba(255,230,170,' + a + ')');
    gl.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(g.winX - 40, g.winTop - 30, CATH_WIN_W + 80, CATH_WIN_H + 60);
    ctx.restore();
  } else {
    // smashed: dark inside, jagged glass left in the frame
    ctx.save();
    gothicArchPath(ctx, g.winX, g.winTop, CATH_WIN_W, CATH_WIN_H);
    ctx.fillStyle = '#140d10';
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = GLASS_COLORS[i % GLASS_COLORS.length];
      const bx = g.winX + (i / 8) * CATH_WIN_W;
      ctx.beginPath();
      ctx.moveTo(bx - 7, g.winBot); ctx.lineTo(bx, g.winBot - 8 - (i * 7) % 15); ctx.lineTo(bx + 7, g.winBot);
      ctx.fill();
    }
    ctx.restore();
    gothicArchPath(ctx, g.winX, g.winTop, CATH_WIN_W, CATH_WIN_H);
    ctx.lineWidth = 4; ctx.strokeStyle = '#d9a93a'; ctx.stroke();
  }
  // red tiled roof
  const ov = 10;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - ov, g.bodyTop + 4);
  ctx.lineTo(x + W / 2, g.roofPeak);
  ctx.lineTo(x + W + ov, g.bodyTop + 4);
  ctx.closePath();
  ctx.fillStyle = '#9e2a1e';
  ctx.fill();
  ctx.clip();
  const rowH = 9;
  for (let y = g.roofPeak; y < g.bodyTop + 6; y += rowH) {
    const r = Math.floor((y - g.roofPeak) / rowH);
    for (let tx = x - ov - 12 + (r % 2) * 6; tx < x + W + ov; tx += 12) {
      ctx.fillStyle = (r + Math.floor(tx / 12)) % 3 === 0 ? '#b8361f' : '#c4442a';
      ctx.beginPath(); ctx.arc(tx + 6, y + rowH - 2, 6, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(60,10,5,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(tx + 6, y + rowH - 2, 6, 0, Math.PI); ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + W / 2, g.roofPeak, W, g.bodyTop - g.roofPeak + 6);
  ctx.restore();
  ctx.strokeStyle = '#5e140c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - ov, g.bodyTop + 4); ctx.lineTo(x + W / 2, g.roofPeak); ctx.lineTo(x + W + ov, g.bodyTop + 4); ctx.stroke();
  // a little gold finial on the peak
  ctx.fillStyle = '#e2b34a';
  ctx.fillRect(x + W / 2 - 1.5, g.roofPeak - 16, 3, 16);
  ctx.beginPath(); ctx.arc(x + W / 2, g.roofPeak - 18, 3.5, 0, Math.PI * 2); ctx.fill();
}

// ---- Cyndraxx in the cathedral (a little bigger than in the level) ----
const CATH_DRAGON_SCALE = 1.4;
function drawCathDragon(x, y, rot, alpha) {
  const S = cathScene;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(CATH_DRAGON_SCALE, CATH_DRAGON_SCALE);
  const breathe = S.asleep ? Math.sin(S.clock * 0.05) * 0.03 : 0;
  ctx.scale(1, 1 + breathe);
  drawDragon(0, 0, rot);
  const p = 2.6;
  if (S.asleep) {               // eyes closed
    ctx.rotate(rot);
    ctx.fillStyle = '#ff793f';
    ctx.fillRect(4 * p, -6 * p, 5 * p, 5 * p);
    ctx.fillStyle = '#7a1d12';
    ctx.fillRect(4 * p, -3 * p, 5 * p, 1 * p);
  }
  ctx.restore();
  if (S.tears && !S.asleep) {   // tears falling from his eye
    ctx.save();
    ctx.fillStyle = 'rgba(160,215,255,0.9)';
    const tx = x + 7.5 * p * CATH_DRAGON_SCALE;
    ctx.fillRect(tx - 1.5, y - 1 * p * CATH_DRAGON_SCALE, 3, 10);          // a wet streak under his eye
    for (let i = 0; i < 4; i++) {
      const f = ((S.clock + i * 18) % 72) / 72;
      const ty = y - 1 * p * CATH_DRAGON_SCALE + 6 + f * 46;
      ctx.globalAlpha = 1 - f * 0.8;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 7); ctx.quadraticCurveTo(tx + 5, ty + 1, tx, ty + 5); ctx.quadraticCurveTo(tx - 5, ty + 1, tx, ty - 7);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---- Clement the Simple: a humble-looking priest in a rough brown robe ----
function drawClement(x, footY, alpha, casting) {
  const S = cathScene;
  const p = 3.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(footY));
  const R = (cx, cy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(cx * p, cy * p, w * p, h * p); };
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 1, 7 * p, 1.6 * p, 0, 0, Math.PI * 2); ctx.fill();
  // robe
  R(-5, -7, 10, 7, '#5b4632');
  R(-4.5, -15, 9, 8, '#5b4632');
  R(1.5, -15, 3, 15, '#47362a');
  R(-4, -2, 1, 2, '#47362a'); R(0, -5, 1, 5, '#47362a');
  // rope belt with a hanging cord
  R(-4.5, -9, 9, 1, '#c9b27a');
  R(-2, -8, 1, 4, '#c9b27a');
  // sandals
  R(-3.5, -0.5, 2.5, 1, '#3a2a1a'); R(1, -0.5, 2.5, 1, '#3a2a1a');
  // hood about the shoulders
  R(-4, -16, 8, 2, '#47362a');
  if (casting) {
    // arms flung up and out
    R(-8, -21, 3, 7, '#5b4632'); R(5, -21, 3, 7, '#5b4632');
    R(-8.5, -23, 2, 2, '#e0b08c'); R(6.5, -23, 2, 2, '#e0b08c');
  } else {
    // hands folded in his sleeves
    R(-3.5, -13, 7, 3, '#47362a');
    R(-1, -12.5, 2, 2, '#e0b08c');
  }
  // head: bald crown (tonsure) with a grey fringe, kind old face
  R(-2.5, -21, 5, 5, '#e0b08c');
  R(-2, -21.5, 4, 1, '#ecc3a0');
  R(-3, -20, 1, 3, '#b9b4ac'); R(2, -20, 1, 3, '#b9b4ac');
  R(-2.5, -20.3, 5, 0.6, '#b9b4ac');
  R(-2, -19, 1.2, 0.5, '#8d8780'); R(0.2, -19, 1.2, 0.5, '#8d8780');      // brows
  // eyes: dark... with a pale, shifting glint now and then
  const glint = (S.clock % 140) < 16 || casting;
  const eyeCol = glint ? 'hsl(' + ((S.clock * 6) % 360) + ', 90%, 85%)' : '#2a2030';
  R(-1.8, -18.2, 1, 0.7, eyeCol); R(0.3, -18.2, 1, 0.7, eyeCol);
  R(-0.5, -17.5, 1, 1.2, '#c7926e');                                       // nose
  R(-1, -16.4, 2, 0.4, '#9b5e4a');                                         // a mild smile
  ctx.restore();
}

// Clement's portrait for the dialogue box, painted once (32x32 blocks)
let clementPortraitCanvas = null;
function clementPortrait() {
  if (clementPortraitCanvas) return clementPortraitCanvas;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const q = 4;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * q, y * q, w * q, h * q); };
  const bg = g.createRadialGradient(30, 40, 4, 64, 64, 100);
  bg.addColorStop(0, '#5a3e1e'); bg.addColorStop(1, '#151020');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  R(3, 25, 26, 7, '#5b4632');            // shoulders
  R(6, 23, 20, 3, '#47362a');
  R(9, 21, 14, 4, '#47362a');            // hood folds
  R(13, 19, 6, 4, '#d9a982');            // neck
  R(10, 7, 12, 14, '#e0b08c');           // head
  R(10, 7, 1, 1, '#5a3e1e'); R(21, 7, 1, 1, '#5a3e1e');
  R(12, 6, 8, 2, '#ecc3a0');             // bald crown
  R(13, 6, 3, 1, '#f6dcc0');
  R(9, 9, 2, 8, '#bdb7ae'); R(21, 9, 2, 8, '#bdb7ae');   // grey fringe
  R(10, 8, 12, 2, '#bdb7ae');
  R(12, 8, 8, 1, '#e0b08c');
  R(12, 12, 3, 1, '#8d8780'); R(17, 12, 3, 1, '#8d8780');   // bushy brows
  R(12, 13, 3, 2, '#f0e6dc'); R(17, 13, 3, 2, '#f0e6dc');   // eyes
  R(13, 13, 2, 2, '#2a2030'); R(18, 13, 2, 2, '#2a2030');
  R(12, 12.8, 3, 0.6, '#c7926e'); R(17, 12.8, 3, 0.6, '#c7926e');   // heavy lids
  R(15, 14, 2, 4, '#c7926e');            // nose
  R(16, 15, 1, 3, '#b07e5c');
  R(11, 16, 1, 1, '#d79b84'); R(20, 16, 1, 1, '#d79b84');   // rosy cheeks
  R(13, 19, 6, 1, '#9b5e4a');            // a gentle smile
  R(12, 18, 1, 1, '#9b5e4a'); R(19, 18, 1, 1, '#9b5e4a');
  R(11, 15, 1, 2, '#c7926e'); R(20, 15, 1, 2, '#c7926e');   // wrinkles
  R(14, 26, 4, 1, '#c9b27a');            // the rope at his collar
  clementPortraitCanvas = c;
  return c;
}

// ---- the iridescent power ----
function iriColor(k, a, light) { return 'hsla(' + (k % 360) + ', 95%, ' + (light || 78) + '%, ' + a + ')'; }

function drawClementSphere(cx, cy, R, f, t) {
  if (f <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // tendrils rising out of his body and curling up around him
  const n = 9;
  for (let i = 0; i < n; i++) {
    const base = (i / n) * Math.PI * 2;
    ctx.beginPath();
    const steps = 22, reach = Math.min(1, f * 1.4);
    for (let k = 0; k <= steps; k++) {
      const u = (k / steps) * reach;
      const ang = base + u * 2.6 + t * 0.03;
      const rr = R * Math.min(1, u * 1.6) + Math.sin(t * 0.1 + i + u * 6) * 3;
      const px = cx + Math.cos(ang) * rr * (0.4 + u * 0.6);
      const py = cy + 34 - u * 66 + Math.sin(ang) * rr * 0.6 * u;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = iriColor(t * 4 + i * 40, 0.75 * f);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.5 * f + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // the shimmering sphere
  const sf = Math.max(0, (f - 0.35) / 0.65);
  if (sf > 0) {
    const gl = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.08);
    gl.addColorStop(0, 'rgba(255,255,255,0)');
    gl.addColorStop(0.75, 'rgba(220,235,255,' + 0.08 * sf + ')');
    gl.addColorStop(0.95, 'rgba(255,255,255,' + 0.3 * sf + ')');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = iriColor(t * 3 + k * 72, 0.55 * sf);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, R, R * (0.25 + 0.15 * k), t * 0.02 + k * 0.63, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = iriColor(t * 5, 0.8 * sf, 85);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, R + Math.sin(t * 0.12) * 1.5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ribbons of light reaching out from Clement and winding around Cyndraxx, then a blinding flash
function drawTeleportSpell(from, to, t, frames) {
  const p = Math.min(1, t / 90);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // great tendrils rising out of him, high into the vaults
  const rise = Math.min(1, t / 50);
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    const steps = 26;
    for (let k = 0; k <= steps; k++) {
      const u = (k / steps) * rise;
      const spread = (i - 5.5) / 5.5;
      const px = from.x + spread * u * width * 0.55 + Math.sin(u * 9 + t * 0.12 + i) * 18 * u;
      const py = from.y - CATH_CLEM_MID - u * height * 0.85;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = iriColor(t * 4 + i * 30, 0.55);
    ctx.lineWidth = 5 - Math.abs(i - 5.5) * 0.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // rings of light rippling out from him
  for (let k = 0; k < 3; k++) {
    const rr = ((t * 3 + k * 60) % 180);
    ctx.strokeStyle = iriColor(t * 5 + k * 120, 0.6 * (1 - rr / 180));
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(from.x, from.y - 4, rr, rr * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    const steps = 30;
    for (let k = 0; k <= steps; k++) {
      const u = (k / steps) * p;
      const bx = from.x + (to.x - from.x) * u, by = from.y - CATH_CLEM_MID + (to.y - (from.y - CATH_CLEM_MID)) * u;
      const off = Math.sin(u * 12 + t * 0.15 + i) * 28 * Math.sin(u * Math.PI) + (i - 3) * 6 * (1 - u);
      const px = bx, py = by + off;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = iriColor(t * 5 + i * 50, 0.8);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // rings closing around the dragon
  if (t > 50) {
    const q = Math.min(1, (t - 50) / 60);
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = iriColor(t * 6 + k * 60, 0.7 * q);
      ctx.lineWidth = 3;
      const r = 90 - q * 40 + k * 4;
      ctx.beginPath(); ctx.ellipse(to.x, to.y, r, r * 0.4, t * 0.08 + k * 0.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
  // the flash that carries him away
  const fl = Math.max(0, (t - (frames - 60)) / 45);
  if (fl > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, fl) + ')';
    ctx.fillRect(0, 0, width, height);
  }
}

// ---- dialogue ----
function cathWrap(text, maxW) {
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

function drawCathDialogue(s) {
  const S = cathScene;
  const who = s.say;
  const W = width, H = height;
  const P = who === 'NARR' ? 0 : Math.min(78, W * 0.19);
  const margin = 12;
  const boxW = W - margin * 2;
  const italic = who === 'NARR';                  // Cyndraxx's lines (spoken or thought) are plain text
  const font = (italic ? 'italic ' : '') + 'bold 15px "Proxima Nova", sans-serif';
  ctx.font = font;
  const textX = margin + (P ? P + 22 : 18);
  const maxW = boxW - (P ? P + 34 : 36);
  const full = who === 'CLEM' ? '"' + s.text + '"' : s.text;
  const lines = cathWrap(full, maxW);
  const nameH = who === 'NARR' ? 0 : 22;
  const boxH = Math.max(P + 20, nameH + lines.length * 20 + 24);
  const boxY = 16;                                // at the top: Cyndraxx and Clement stand on the floor below

  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(margin, boxY, boxW, boxH, 12); else ctx.rect(margin, boxY, boxW, boxH);
  ctx.fillStyle = who === 'NARR' ? 'rgba(12,8,22,0.88)' : '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = who === 'CLEM' ? '#9b8cc4' : '#d9a93a';
  ctx.stroke();
  if (P) {
    const px = margin + 10, py = boxY + 10;
    ctx.fillStyle = '#11161d';
    ctx.fillRect(px, py, P, P);
    if (who === 'CLEM') {
      ctx.drawImage(clementPortrait(), px, py, P, P);
      if ((S.clock % 140) < 16) {          // the same pale glint in his eyes
        ctx.fillStyle = 'hsla(' + ((S.clock * 6) % 360) + ', 90%, 85%, 0.9)';
        ctx.fillRect(px + P * 13 / 32, py + P * 13 / 32, P * 2 / 32, P * 2 / 32);
        ctx.fillRect(px + P * 18 / 32, py + P * 13 / 32, P * 2 / 32, P * 2 / 32);
      }
    } else if (cynPortrait.complete && cynPortrait.naturalWidth) {
      ctx.drawImage(cynPortrait, px, py, P, P);
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = who === 'CLEM' ? '#9b8cc4' : '#f1c40f';
    ctx.strokeRect(px, py, P, P);
  }
  ctx.textAlign = 'left';
  if (nameH) {
    ctx.font = 'bold 13px "Proxima Nova", sans-serif';
    ctx.fillStyle = who === 'CLEM' ? '#5b4a8c' : '#b5651d';
    ctx.fillText(who === 'CLEM' ? 'CLEMENT THE SIMPLE' : 'CYNDRAXX', textX, boxY + 22);
  }
  ctx.font = font;
  ctx.fillStyle = who === 'NARR' ? '#f3e6d0' : '#111111';
  let left = S.typed >= s.text.length ? Infinity : Math.floor(S.typed) + (who === 'CLEM' ? 1 : 0);
  lines.forEach((ln, i) => {
    const part = left >= ln.length ? ln : ln.slice(0, Math.max(0, left));
    left -= ln.length + 1;
    ctx.fillText(part, textX, boxY + nameH + 26 + i * 20);
  });
  const done = S.typed >= s.text.length;
  if (done && !s.choice && Math.floor(S.clock / 20) % 2 === 0) {
    ctx.fillStyle = who === 'NARR' ? '#f1c40f' : '#b5651d';
    ctx.beginPath();
    const ax = margin + boxW - 18, ay = boxY + boxH - 14;
    ctx.moveTo(ax - 6, ay - 4); ctx.lineTo(ax + 6, ay - 4); ctx.lineTo(ax, ay + 3); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // REST / FIGHT ON
  if (s.choice && done) {
    const bw = Math.min(160, (W - 36) / 2), bh = 48, gap = 12;
    const by = boxY + boxH + 16;
    const bx = (W - bw * 2 - gap) / 2;
    S.buttons = [
      { id: 'rest', x: bx, y: by, w: bw, h: bh, label: 'REST', col: '#27ae60', edge: '#1b7a43' },
      { id: 'fight', x: bx + bw + gap, y: by, w: bw, h: bh, label: 'FIGHT ON', col: '#c0392b', edge: '#7f241b' }
    ];
    const pulse = 1 + Math.sin(S.clock * 0.08) * 0.02;
    S.buttons.forEach(b => {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = b.edge;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-b.w / 2, -b.h / 2 + 4, b.w, b.h, 10); else ctx.rect(-b.w / 2, -b.h / 2 + 4, b.w, b.h);
      ctx.fill();
      ctx.fillStyle = b.col;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 10); else ctx.rect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, 0, 7);
      ctx.restore();
    });
  }
}

// a heart shape centered on (cx, cy), about s wide
function heartPath(cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.05, cx - s * 0.5, cy - s * 0.5, cx - s * 0.25, cy - s * 0.5);
  ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.5, cx, cy - s * 0.4, cx, cy - s * 0.28);
  ctx.bezierCurveTo(cx, cy - s * 0.4, cx + s * 0.1, cy - s * 0.5, cx + s * 0.25, cy - s * 0.5);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.5, cx + s * 0.55, cy - s * 0.05, cx, cy + s * 0.35);
  ctx.closePath();
}

function drawHeartContainer(t) {
  const W = width, H = height;
  const a = Math.min(1, t / 20);
  ctx.fillStyle = 'rgba(20,6,10,' + 0.65 * a + ')';
  ctx.fillRect(0, 0, W, H);
  const u = Math.min(1, t / 45);
  const grow = 1 + 1.6 * Math.pow(1 - u, 3) * Math.sin(u * Math.PI * 2.5) * 0.25;   // overshoot and settle
  const s = Math.min(W * 0.92, H * 0.6) * u * grow * (1 + Math.sin(t * 0.12) * 0.03);
  const cx = W / 2, cy = H * 0.42;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.1);
  gl.addColorStop(0, 'rgba(255,120,140,' + 0.5 * a + ')');
  gl.addColorStop(1, 'rgba(255,60,90,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (s > 2) {
    heartPath(cx, cy, s);
    const hg = ctx.createLinearGradient(0, cy - s * 0.5, 0, cy + s * 0.35);
    hg.addColorStop(0, '#ff6b81'); hg.addColorStop(1, '#c0182c');
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.lineWidth = Math.max(3, s * 0.03);
    ctx.strokeStyle = '#ffd1d8';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.22, cy - s * 0.3, s * 0.08, s * 0.05, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  const ta = Math.max(0, Math.min(1, (t - 40) / 20));
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = ta;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1c40f';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    fitFont('HEART CONTAINER!', 32, W - 30);
    ctx.strokeText('HEART CONTAINER!', W / 2, cy + s * 0.5 + 34);
    ctx.fillText('HEART CONTAINER!', W / 2, cy + s * 0.5 + 34);
    ctx.font = 'bold 16px "Proxima Nova", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Cyndraxx awakens refreshed.', W / 2, cy + s * 0.5 + 60);
    let row = '';
    for (let i = 0; i < maxLives; i++) row += '❤️';
    ctx.font = '26px sans-serif';
    ctx.fillText(row, W / 2, cy + s * 0.5 + 96);
    ctx.restore();
  }
}

// ---- the whole cutscene ----
function drawCathedralScene() {
  const S = cathScene;
  const s = cathStep();
  if (!S || !s) return;
  const W = width, H = height;

  if (s.act === 'crash') {
    // still outside: the flash of breaking glass
    const a = Math.max(0, (S.t - 14) / 30);
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a) + ')';
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const L = cathInterior();
  const IH = cathInteriorH();
  const spot = cathDragonSpot();
  let dx = spot.x, dy = spot.y, camY = IH - H;
  if (s.act === 'fall') {
    const u = Math.min(1, S.t / s.frames);
    dx = W * 0.5 + (spot.x - W * 0.5) * Math.max(0, (u - 0.6) / 0.4);
    camY = Math.max(0, Math.min(IH - H, S.dragonY - H * 0.42));
    dy = S.dragonY - camY;
  }
  ctx.drawImage(L.layer, 0, camY, W, H, 0, 0, W, H);

  // candle flames (live)
  ctx.save();
  L.candles.forEach((cd, i) => {
    const y = cd.y - camY;
    if (y < -30 || y > H + 30) return;
    const fl = 1 + Math.sin(S.clock * 0.3 + i * 1.7) * 0.15 + Math.sin(S.clock * 0.71 + i) * 0.08;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(cd.x, y - cd.s, 0, cd.x, y - cd.s, cd.s * 7);
    gr.addColorStop(0, 'rgba(255,190,90,0.35)');
    gr.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(cd.x - cd.s * 7, y - cd.s * 8, cd.s * 14, cd.s * 14);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath();
    ctx.moveTo(cd.x, y - cd.s * 2.4 * fl);
    ctx.quadraticCurveTo(cd.x + cd.s * 0.8, y - cd.s * 0.6, cd.x, y);
    ctx.quadraticCurveTo(cd.x - cd.s * 0.8, y - cd.s * 0.6, cd.x, y - cd.s * 2.4 * fl);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.fillRect(cd.x - 0.8, y - cd.s * 1.1, 1.6, cd.s * 0.8);
  });
  // dust motes drifting in the light
  ctx.fillStyle = 'rgba(255,235,190,0.5)';
  for (let i = 0; i < 26; i++) {
    const mx = (hash2(i, 41) * W + Math.sin(S.clock * 0.01 + i) * 20 + W) % W;
    const my = ((hash2(i, 43) * H * 1.2 - S.clock * 0.15 * (0.5 + hash2(i, 5))) % (H * 1.2) + H * 1.2) % (H * 1.2);
    ctx.fillRect(mx, my, 1.5, 1.5);
  }
  ctx.restore();

  // glass shards falling with him (gone once he has landed)
  if (s.act === 'fall' || s.act === 'land') S.shards.forEach(sh => {
    const y = Math.min(H - 20, (s.act === 'fall' ? S.dragonY - camY : dy) + sh.off);
    if (y < -20 || y > H + 20) return;
    ctx.save();
    ctx.translate(sh.x, y);
    ctx.rotate(sh.rot);
    ctx.globalAlpha = s.act === 'land' ? 0.85 * Math.max(0, 1 - S.t / 40) : 0.85;
    ctx.fillStyle = sh.color;
    ctx.beginPath(); ctx.moveTo(0, -sh.s); ctx.lineTo(sh.s * 0.7, sh.s * 0.5); ctx.lineTo(-sh.s * 0.6, sh.s * 0.7); ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // Clement and his sphere
  const cl = cathClementSpot();
  const casting = s.act === 'teleport';
  if (S.clement > 0) drawClement(cl.x, cl.y, S.clement, casting);
  if (S.sphere > 0) drawClementSphere(cl.x, cl.y - CATH_CLEM_MID, CATH_SPHERE_R, S.sphere, S.clock);

  // Cyndraxx
  const telA = s.act === 'teleport' ? Math.max(0, 1 - Math.max(0, S.t - 90) / 40) : 1;
  const pitch = s.act === 'fall' ? S.rot : (s.act === 'land' ? S.rot : 0);
  if (s.act !== 'dream') drawCathDragon(dx, dy, pitch, telA);

  // the giant breath and anything bouncing off the sphere
  ctx.save();
  S.fx.forEach(f => {
    if (f.kind === 'dust') {
      ctx.fillStyle = 'rgba(200,170,140,' + Math.min(0.6, f.life / 60) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (60 - f.life) * 0.08, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'fire') {
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.min(1, f.life / 30);
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
      gr.addColorStop(0, 'rgba(255,230,150,' + 0.8 * a + ')');
      gr.addColorStop(0.35, 'rgba(255,120,30,' + 0.7 * a + ')');
      gr.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (f.kind === 'spark') {
      ctx.fillStyle = iriColor(S.clock * 8 + f.life * 10, Math.min(1, f.life / 15), 85);
      ctx.fillRect(f.x, f.y, 3, 3);
    }
  });
  ctx.restore();

  if (s.act === 'teleport') drawTeleportSpell(cl, { x: dx, y: dy }, S.t, s.frames);

  // falling asleep: the light dims, Zzz drifts up
  if (s.act === 'sleep' || s.act === 'dream' || s.act === 'wake') {
    let dim = 0;
    if (s.act === 'sleep') dim = Math.min(0.7, S.t / 140 * 0.7);
    else if (s.act === 'wake') dim = 0.7 * Math.max(0, 1 - S.t / 50);
    if (s.act !== 'dream') {
      ctx.fillStyle = 'rgba(8,8,30,' + dim + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (s.act === 'sleep') {
      ctx.save();
      ctx.font = 'bold 20px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const f = ((S.t + i * 30) % 90) / 90;
        ctx.globalAlpha = Math.sin(f * Math.PI);
        ctx.fillStyle = '#dfe8ff';
        ctx.fillText('Z', dx + 30 + f * 30 + i * 4, dy - 40 - f * 50);
      }
      ctx.restore();
      const toDream = Math.max(0, (S.t - (s.frames - 30)) / 30);
      if (toDream > 0) { ctx.fillStyle = 'rgba(255,248,235,' + toDream + ')'; ctx.fillRect(0, 0, W, H); }
    }
    if (s.act === 'wake') {
      const fromDream = Math.max(0, 1 - S.t / 30);
      if (fromDream > 0) { ctx.fillStyle = 'rgba(255,248,235,' + fromDream + ')'; ctx.fillRect(0, 0, W, H); }
    }
  }

  if (s.act === 'dream') drawCathDream(S.t);
  if (s.act === 'heart') drawHeartContainer(S.t);
  if (s.say) drawCathDialogue(s);

  // white at the start of the fall (coming in through the window), black when fighting on
  if (s.act === 'fall' && S.t < 30) {
    ctx.fillStyle = 'rgba(255,255,255,' + (1 - S.t / 30) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (s.act === 'fade') {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, S.t / (s.frames - 8)) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

// the dream: soft, glowing memories of the spring festival with Sarai
function drawCathDream(t) {
  const second = t >= CATH_DREAM;
  const f = t - (second ? CATH_DREAM : 0);
  drawStoryPicture(second ? danceImg2 : danceImg1, 'Cyndraxx dreams of the spring festival, singing with Queen Sarai...', f, CATH_DREAM);
  const W = width, H = height;
  ctx.save();
  // a warm, hazy glow and soft white edges
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(255,250,240,0)');
  v.addColorStop(1, 'rgba(255,248,235,0.75)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,200,150,0.08)';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) {      // drifting sparkles
    const sx = hash2(i, 61) * W, sy = (hash2(i, 67) * H - t * (0.3 + hash2(i, 3) * 0.4) + H * 2) % H;
    ctx.fillStyle = 'rgba(255,240,200,' + (0.4 + 0.4 * Math.sin(t * 0.1 + i)) + ')';
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.restore();
  // fade in from the white of sleep, and back to white at the end
  const edge = Math.max(0, 1 - f / 30, (f - (CATH_DREAM - 30)) / 30 * (second ? 1 : 0));
  if (edge > 0) { ctx.fillStyle = 'rgba(255,248,235,' + Math.min(1, edge) + ')'; ctx.fillRect(0, 0, W, H); }
}

// back in the level: the dread, the lingering thought, the fade back in
function drawCathedralHUD() {
  if (cathDread && currentLevel === 2 && state === 'PLAYING') {
    const W = width, H = height;
    const a = 0.32 + Math.sin(Date.now() / 900) * 0.06;
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, 'rgba(20,0,30,0)');
    v.addColorStop(1, 'rgba(20,0,30,' + a + ')');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  if (cathAfter && khaleesiBannerTimer <= 0 && !khaleesiMounted) {
    const pSize = 64, pX = 15, pY = 15;
    const a = Math.min(1, cathAfter.t / 20, (cathAfter.dur - cathAfter.t) / 20);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#11161d';
    ctx.fillRect(pX, pY, pSize, pSize);
    if (cynPortrait.complete && cynPortrait.naturalWidth) ctx.drawImage(cynPortrait, pX, pY, pSize, pSize);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f1c40f';
    ctx.strokeRect(pX, pY, pSize, pSize);
    ctx.font = 'bold 15px "Proxima Nova", sans-serif';
    const lines = cathWrap(cathAfter.text, width * 0.76);
    let longest = 0;
    lines.forEach(l => { longest = Math.max(longest, ctx.measureText(l).width); });
    const bW = longest + 28, bH = lines.length * 20 + 20;
    const bX = Math.min(width - bW - 15, pX), bY = pY + pSize + 14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 10); else ctx.rect(bX, bY, bW, bH);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bX + bW / 2, bY + 24 + i * 20));
    ctx.restore();
    hudBubbleBottom = bY + bH;
  }
  if (cathFadeIn) {
    ctx.fillStyle = 'rgba(' + cathFadeIn.color + ',' + Math.max(0, 1 - cathFadeIn.t / cathFadeIn.dur) + ')';
    ctx.fillRect(0, 0, width, height);
  }
}
