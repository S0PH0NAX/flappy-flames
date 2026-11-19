// boss-render.js — Siege engine boss drawing
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

// ------------------------------------------------------------------
// DRAWING HELPERS
// ------------------------------------------------------------------
function bossStoneWall(x, y, w, h, charred) {
  const rowH = 14, brickW = 28;
  const pal = charred ? ['#2a2d31', '#202327', '#34373c'] : ['#7d838b', '#6c727a', '#8e949c'];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = charred ? '#121416' : '#3b3f45';
  ctx.fillRect(x, y, w, h);
  for (let r = 0, yy = y; yy < y + h; r++, yy += rowH) {
    const off = (r % 2) * (brickW / 2);
    for (let i = 0, xx = x - off; xx < x + w; i++, xx += brickW) {
      ctx.fillStyle = pal[(r * 5 + i * 7 + r * i) % 3];
      ctx.fillRect(xx + 1, yy + 1, brickW - 2, rowH - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(xx + 1, yy + 1, brickW - 2, 2);
    }
  }
  ctx.restore();
}

function bossWood(x, y, w, h, vertical, charred) {
  ctx.fillStyle = charred ? '#3a2616' : '#8b5a2b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = charred ? '#241608' : '#6b4320';
  if (vertical) { for (let i = 5; i < w; i += 6) ctx.fillRect(x + i, y, 1, h); }
  else { for (let j = 6; j < h; j += 7) ctx.fillRect(x, y + j, w, 1); }
  ctx.fillStyle = charred ? 'rgba(255,200,140,0.06)' : 'rgba(255,220,160,0.18)';
  if (vertical) ctx.fillRect(x, y, 2, h); else ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  if (vertical) ctx.fillRect(x + w - 2, y, 2, h); else ctx.fillRect(x, y + h - 2, w, 2);
}

function bossIron(x, y, w, h) {
  ctx.fillStyle = '#2b3138';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = '#9aa7b0';
  if (w >= 8) {
    ctx.fillRect(x + 2, y + Math.floor(h / 2) - 1, 2, 2);
    ctx.fillRect(x + w - 4, y + Math.floor(h / 2) - 1, 2, 2);
  }
}

function bossBrace(x1, y1, x2, y2, th, charred) {
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = charred ? '#1d1209' : '#3a2410';
  ctx.lineWidth = th + 3;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = charred ? '#3a2616' : '#8b5a2b';
  ctx.lineWidth = th;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

// Timber-and-steel scaffolding bolted onto the back (right side) of the tower, so the tower
// has depth instead of ending in a flat wall. Drawn behind the tower body.
function bossRearScaffold(bx, g, woodDead, topDead) {
  const right = bx + g.bw;
  const sw = Math.max(46, g.bw * 0.24);
  const xIn = right - 6, xMid = right + sw * 0.5, xOut = right + sw;
  const topIn = g.turretH * 0.18, topOut = g.turretH * 0.62;
  const bot = g.baseTop + 6;
  const now = bossState.frame;

  // steel back-frame: thin riveted girders behind the timbers
  ctx.save();
  ctx.strokeStyle = '#1e2329';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xIn, topIn + 10); ctx.lineTo(xOut - 4, topOut + 6);
  ctx.moveTo(xIn, bot - 4); ctx.lineTo(xOut - 4, topOut + 6);
  ctx.stroke();
  ctx.restore();

  // vertical posts (outer one shorter: the frame steps down)
  bossWood(xMid - 4, topIn + 20, 8, bot - topIn - 20, true, woodDead);
  bossWood(xOut - 8, topOut, 8, bot - topOut, true, woodDead);
  // cap beams
  bossWood(xIn - 4, topIn + 16, xMid - xIn + 10, 6, false, woodDead);
  bossWood(xMid - 4, topOut - 4, xOut - xMid + 6, 6, false, woodDead);

  // ledgers with X bracing in each bay
  const step = 46;
  for (let y = topIn + 16 + step; y < bot - 10; y += step) {
    const outer = y >= topOut;
    const x1 = outer ? xOut : xMid + 4;
    bossWood(xIn - 2, y, x1 - xIn, 5, false, woodDead);
    const yPrev = y - step;
    // left bay
    if (yPrev >= topIn + 16) {
      bossBrace(xIn + 2, yPrev + 5, xMid - 4, y, 3, woodDead);
      bossBrace(xMid - 4, yPrev + 5, xIn + 2, y, 3, woodDead);
    }
    // right bay
    if (outer && yPrev >= topOut - 4) {
      bossBrace(xMid + 4, yPrev + 5, xOut - 8, y, 3, woodDead);
      bossBrace(xOut - 8, yPrev + 5, xMid + 4, y, 3, woodDead);
    }
    bossIron(xMid - 6, y - 1, 12, 7);
    if (outer) bossIron(xOut - 10, y - 1, 12, 7);
  }

  // steel walkway with a railing partway up
  const wy = Math.round((topOut + bot) / 2);
  ctx.fillStyle = '#3a414a';
  ctx.fillRect(xIn, wy - 4, xOut - xIn + 8, 5);
  ctx.fillStyle = '#6d7883';
  ctx.fillRect(xIn, wy - 4, xOut - xIn + 8, 1);
  ctx.fillStyle = '#2b3138';
  for (let rx = xIn + 6; rx <= xOut + 6; rx += 10) ctx.fillRect(rx, wy - 18, 2, 14);
  ctx.fillRect(xIn, wy - 19, xOut - xIn + 8, 2);

  // kicker struts down to the axle: the frame rides on the wagon
  bossBrace(xOut - 4, bot - 2, right + g.over * 0.7, g.deckTop, 6, woodDead);
  bossBrace(xMid, bot - 2, right - 2, g.baseTop + 34, 4, woodDead);
  bossIron(xOut - 10, bot - 6, 12, 8);

  // crane arm off the top with a swinging hook and rope
  const armY = topIn + 4;
  bossWood(xMid - 4, armY - 2, 8, 22, true, woodDead);
  bossBrace(xIn, armY + 10, xOut + 18, armY, 5, woodDead);
  ctx.fillStyle = '#2b3138';
  ctx.beginPath(); ctx.arc(xOut + 16, armY + 1, 4, 0, Math.PI * 2); ctx.fill();
  const sway = Math.sin(now * 0.06) * 0.18 + bossState.bump * 0.03;
  const ropeL = 44;
  const hx = xOut + 16 + Math.sin(sway) * ropeL, hy = armY + 1 + Math.cos(sway) * ropeL;
  ctx.strokeStyle = '#c9b28a';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xOut + 16, armY + 1); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = '#5f6973';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(hx, hy + 5, 4, -Math.PI * 0.1, Math.PI * 1.1); ctx.stroke();

  // shade it back so the tower face reads in front
  ctx.fillStyle = 'rgba(8,10,16,0.28)';
  ctx.fillRect(right - 6, 0, sw + 40, g.gY);
}

// Crouching stone gargoyle on a corbel. dir = -1 faces left (toward the dragon), 1 faces right.
function bossGargoyle(x, y, dir, s, dead) {
  const stone = dead ? '#24272b' : '#8a9099';
  const dark = dead ? '#16181b' : '#5b616a';
  const light = dead ? '#30343a' : '#b4bac2';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-dir * s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowOffsetX = 2 * dir;
  ctx.shadowOffsetY = 2;
  // corbel
  ctx.fillStyle = dark;
  ctx.fillRect(-4, 0, 14, 5);
  ctx.fillRect(-1, 5, 9, 4);
  // folded wing
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(4, -6); ctx.lineTo(13, -20); ctx.lineTo(12, -12); ctx.lineTo(16, -14); ctx.lineTo(10, -2);
  ctx.closePath(); ctx.fill();
  // haunches and body
  ctx.fillStyle = stone;
  ctx.fillRect(-2, -8, 12, 8);
  ctx.fillRect(-8, -12, 10, 8);
  // front legs and claws gripping the edge
  ctx.fillRect(-9, -4, 3, 4);
  ctx.fillRect(-4, -4, 3, 4);
  ctx.fillStyle = light;
  ctx.fillRect(-10, -1, 2, 1); ctx.fillRect(-5, -1, 2, 1);
  // head jutting out, open jaws
  ctx.fillStyle = stone;
  ctx.fillRect(-16, -17, 10, 8);
  ctx.fillStyle = dark;
  ctx.fillRect(-18, -12, 6, 3);       // lower jaw
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(-17, -14, 5, 2);       // mouth
  ctx.fillStyle = light;
  ctx.fillRect(-16, -14, 1, 1); ctx.fillRect(-14, -14, 1, 1);   // fangs
  // horns and brow
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(-5, -23); ctx.lineTo(-7, -16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-13, -17); ctx.lineTo(-12, -22); ctx.lineTo(-11, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = light;
  ctx.fillRect(-16, -17, 10, 1);
  // glowing eye
  if (!dead) {
    const glow = 0.6 + 0.4 * Math.sin(bossState.frame * 0.08 + x);
    ctx.fillStyle = 'rgba(255,60,30,' + glow + ')';
    ctx.fillRect(-14, -16, 2, 2);
    ctx.fillStyle = 'rgba(255,80,40,' + (glow * 0.25) + ')';
    ctx.fillRect(-16, -18, 6, 6);
  }
  ctx.restore();
}

// The wheeled platform the tower rides on: an axle frame, a heavy timber deck wider than the
// tower, iron straps and corner plates, and a spiked iron-shod front beam. Wheels are drawn after.
function bossChassis(bx, g, dead) {
  const x0 = bx - g.over, x1 = bx + g.bw + g.over, w = x1 - x0;
  const top = g.deckTop, axY = g.gY - g.wheelR;
  // axle beam between the wheel hubs (behind the wheels)
  ctx.fillStyle = dead ? '#140c06' : '#2a1b10';
  ctx.fillRect(bx + g.wheelXs[0], axY - 4, g.wheelXs[1] - g.wheelXs[0], 8);
  // iron hangers from the deck down to each hub, and bracing between the axles
  const midX = bx + g.bw / 2;
  g.wheelXs.forEach(wx => {
    bossBrace(bx + wx - g.wheelR * 0.55, top + g.deckH - 2, bx + wx, axY, 6, dead);
    bossBrace(bx + wx + g.wheelR * 0.55, top + g.deckH - 2, bx + wx, axY, 6, dead);
  });
  bossBrace(bx + g.wheelXs[0], axY, midX, top + g.deckH, 5, dead);
  bossBrace(bx + g.wheelXs[1], axY, midX, top + g.deckH, 5, dead);

  // wheels: each judders on its own over the rough ground
  const wheelDy = -bossState.rumbleY * 0.7;
  const wr = Math.max(0, bossState.roll);
  g.wheelXs.forEach((wx, i) => {
    const jig = -Math.abs(Math.sin(bossState.frame * 1.45 + i * 2.1)) * 1.8 * wr;
    bossWheel(bx + wx + Math.sin(bossState.frame * 2.3 + i) * 0.6 * wr, g.gY - g.wheelR + wheelDy + jig, g.wheelR, bossState.wheelAngle, dead);
  });

  // deck: thick top plank + darker lower beam
  bossWood(x0, top, w, 11, false, dead);
  bossWood(x0 + 4, top + 11, w - 8, g.deckH - 11, false, true);
  // plank ends visible on the deck face
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let px = x0 + 18; px < x1 - 6; px += 22) ctx.fillRect(px, top + 1, 1, 9);
  // iron straps and end plates
  ctx.fillStyle = '#2b3138';
  for (let sx = x0 + 30; sx < x1 - 20; sx += Math.max(48, w / 6)) ctx.fillRect(sx, top, 5, g.deckH);
  bossIron(x0 - 2, top - 2, 14, g.deckH + 2);
  bossIron(x1 - 12, top - 2, 14, g.deckH + 2);
  ctx.fillStyle = '#9aa7b0';
  for (let sx = x0 + 32; sx < x1 - 20; sx += Math.max(48, w / 6)) {
    ctx.fillRect(sx + 1, top + 3, 2, 2);
    ctx.fillRect(sx + 1, top + g.deckH - 5, 2, 2);
  }
  // spiked ram beam on the front
  ctx.fillStyle = '#2b3138';
  ctx.fillRect(x0 - 10, top + 3, 10, g.deckH - 6);
  ctx.fillStyle = '#7d8890';
  for (let i = 0; i < 3; i++) {
    const sy = top + 4 + i * ((g.deckH - 8) / 2);
    ctx.beginPath(); ctx.moveTo(x0 - 10, sy - 3); ctx.lineTo(x0 - 20, sy); ctx.lineTo(x0 - 10, sy + 3); ctx.closePath(); ctx.fill();
  }
  // gussets tying the stone base down to the deck
  bossBrace(bx - g.over * 0.55, top, bx + 2, top - 26, 5, dead);
  bossBrace(bx + g.bw + g.over * 0.55, top, bx + g.bw - 2, top - 26, 5, dead);
  bossIron(bx - 4, top - 8, 10, 8);
  bossIron(bx + g.bw - 6, top - 8, 10, 8);
}

// Open-spoked siege wheel: the gaps between spokes make the rotation easy to see.
function bossWheel(cx, cy, R, angle, charred) {
  const wood = charred ? '#2e1d10' : '#7a4a22';
  const woodLight = charred ? '#4a3220' : '#b07a3e';
  const woodDark = charred ? '#1a0f08' : '#4a2a10';
  ctx.save();
  ctx.translate(cx, cy);

  // shadow on the ground behind the wheel
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, R - 2, R * 0.9, 5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.rotate(angle);

  // spokes (8 thick wooden spokes with a lit edge and a dark edge)
  const spokeW = Math.max(5, R * 0.14);
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.fillStyle = woodDark;
    ctx.fillRect(R * 0.18, -spokeW / 2 - 1, R * 0.66, spokeW + 2);
    ctx.fillStyle = wood;
    ctx.fillRect(R * 0.18, -spokeW / 2, R * 0.66, spokeW);
    ctx.fillStyle = woodLight;
    ctx.fillRect(R * 0.18, -spokeW / 2, R * 0.66, 2);
    // wood grain notch
    ctx.fillStyle = woodDark;
    ctx.fillRect(R * 0.45, -1, R * 0.12, 1);
    ctx.restore();
  }

  // felloe (wooden rim) made of 8 curved segments with visible joints
  const rimIn = R - 13, rimOut = R - 4;
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.arc(0, 0, rimOut, 0, Math.PI * 2);
  ctx.arc(0, 0, rimIn, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.strokeStyle = woodLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, rimIn + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rimIn, Math.sin(a) * rimIn);
    ctx.lineTo(Math.cos(a) * rimOut, Math.sin(a) * rimOut);
    ctx.stroke();
  }

  // iron tyre with rivets
  ctx.strokeStyle = '#262c33';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#7d8a96';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, R - 1, -2.6, -0.6); ctx.stroke();
  ctx.fillStyle = '#b8c2c9';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.fillRect(Math.cos(a) * (R - 3) - 1.5, Math.sin(a) * (R - 3) - 1.5, 3, 3);
  }

  // hub with iron cap and bolts (bolts rotate, so they show the turning too)
  ctx.fillStyle = woodDark;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b3138';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8795a0';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9d2d8';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // fixed lighting: top-left highlight / bottom-right shade on the tyre (doesn't rotate)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(255,230,190,0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, R - 8, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(0, 0, R - 8, Math.PI * 0.05, Math.PI * 0.55); ctx.stroke();
  ctx.restore();
}

// Heavy iron ball: rotating riveted straps under fixed lighting so it reads as polished metal.
function bossMetalBall(cx, cy, r, rot) {
  if (r < 1) return;
  for (let i = 1; i <= 3; i++) {
    ctx.fillStyle = 'rgba(200,210,220,' + (0.10 - i * 0.025) + ')';
    ctx.beginPath(); ctx.arc(cx + r * 0.45 * i, cy, r * (1 - i * 0.06), 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const base = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
  base.addColorStop(0, '#ffffff');
  base.addColorStop(0.2, '#cfd8dc');
  base.addColorStop(0.55, '#78909c');
  base.addColorStop(1, '#263238');
  ctx.fillStyle = base;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  ctx.save();
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(28,36,42,0.78)';
  ctx.fillRect(-r, -r * 0.1, r * 2, r * 0.2);
  ctx.fillRect(-r * 0.1, -r, r * 0.2, r * 2);
  ctx.strokeStyle = 'rgba(28,36,42,0.7)';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  const rv = Math.max(1.5, r * 0.04);
  [-0.82, -0.5, 0.5, 0.82].forEach(k => {
    [[k * r, 0], [0, k * r]].forEach(p => {
      ctx.fillStyle = '#0f1417';
      ctx.beginPath(); ctx.arc(p[0], p[1], rv + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath(); ctx.arc(p[0], p[1], rv, 0, Math.PI * 2); ctx.fill();
    });
  });
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.arc(r * 0.35, r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.5, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const spec = ctx.createRadialGradient(-r * 0.4, -r * 0.45, 0, -r * 0.4, -r * 0.45, r * 0.6);
  spec.addColorStop(0, 'rgba(255,255,255,0.75)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  const edge = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = edge;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();

  ctx.strokeStyle = '#11181c';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

function bossCannon(bx, cy, g, alive, warn, blast) {
  const x0 = bx - g.barrelLen;      // muzzle
  const x1 = bx + 70;               // breech
  const th = 30;
  ctx.fillStyle = '#2b2f35';
  ctx.beginPath(); ctx.arc(bx + 2, cy, th / 2 + 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8e949c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(bx + 2, cy, th / 2 + 9, 0, Math.PI * 2); ctx.stroke();

  if (!alive) {
    ctx.fillStyle = '#15181b';
    ctx.fillRect(bx - 6, cy - 9, 30, 18);
    return;
  }
  bossWood(bx + 6, cy + th / 2 - 2, 60, 9, false, false);
  bossIron(bx + 12, cy + th / 2 - 2, 6, 9);
  bossIron(bx + 52, cy + th / 2 - 2, 6, 9);
  const grad = ctx.createLinearGradient(0, cy - th / 2, 0, cy + th / 2);
  grad.addColorStop(0, '#90a4ae');
  grad.addColorStop(0.35, '#546e7a');
  grad.addColorStop(1, '#1c262b');
  ctx.fillStyle = grad;
  ctx.fillRect(x0, cy - th / 2, x1 - x0, th);
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x0 - 5, cy - th / 2 - 4, 10, th + 8);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x0 - 5, cy - th / 2 - 4, 10, 2);
  ctx.fillStyle = '#05080a';
  ctx.beginPath(); ctx.ellipse(x0 - 4, cy, 4, th / 2 - 3, 0, 0, Math.PI * 2); ctx.fill();
  [x0 + 26, x0 + 58, x0 + 88].forEach(rx => {
    ctx.fillStyle = '#263238';
    ctx.fillRect(rx, cy - th / 2 - 2, 7, th + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(rx, cy - th / 2 - 2, 7, 2);
  });
  ctx.fillStyle = '#263238';
  ctx.beginPath(); ctx.arc(x1, cy, th / 2, -Math.PI / 2, Math.PI / 2); ctx.fill();

  if (warn > 0) {
    const rg = ctx.createRadialGradient(x0 - 4, cy, 2, x0 - 4, cy, 34);
    rg.addColorStop(0, 'rgba(255,190,60,' + (0.25 + 0.55 * warn) + ')');
    rg.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x0 - 4, cy, 34, 0, Math.PI * 2); ctx.fill();
  }
  if (blast > 0) {
    drawFlame(x0 - 8, cy + 14, 34 * blast + 8, 52 * blast + 10, 3.1, blast);
    ctx.fillStyle = 'rgba(255,243,196,' + (0.9 * blast) + ')';
    ctx.beginPath(); ctx.arc(x0 - 6, cy, 18 * blast, 0, Math.PI * 2); ctx.fill();
  }
}

function bossHpBar(x, y, w, hp, label, shielded, open) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x, y, w, 11);
  ctx.fillStyle = '#3a0f0f';
  ctx.fillRect(x + 1, y + 1, w - 2, 9);
  const pct = Math.max(0, hp) / 100;
  if (shielded) {
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x + 1, y + 1, (w - 2) * pct, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let sx = x + 1; sx < x + 1 + (w - 2) * pct; sx += 8) ctx.fillRect(sx, y + 1, 3, 9);
  } else {
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : (pct > 0.25 ? '#f1c40f' : '#e74c3c');
    ctx.fillRect(x + 1, y + 1, (w - 2) * pct, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 1, y + 1, (w - 2) * pct, 2);
  }
  if (open) {
    ctx.strokeStyle = 'rgba(241,196,15,' + (0.5 + 0.5 * Math.sin(Date.now() / 120)) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, 13);
  }
  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 2, y - 2);
}

function bossArcherSprite(x, feetY, pose, anim, scale, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, feetY - 11 * scale);
  ctx.scale(scale, scale);
  drawArcherDetail(pose, anim, true);
  ctx.restore();
}

function renderBoss() {
  const g = bossGeom();
  const bw = g.bw;
  const bx = Math.round(bossState.x);
  const gY = g.gY;
  const tH = g.turretH;
  const bT = g.baseTop;
  const pY = Math.round(g.platY);
  const pY2Back = Math.round(g.platY2);
  const now = Date.now();
  const B = bossState.burn;
  const topDead = B.top.charred;
  const midDead = B.mid.charred;
  const botDead = B.bot.charred;

  // ground shadow (stays on the ground)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(bx - g.over - 10, gY - 3, bw + 2 * g.over + 20, 7);

  // the whole tower rumbles over the ground
  const shakeX = Math.sin(bossState.frame * 1.7) * 0.6 * bossState.swayAmp;
  ctx.save();
  ctx.translate(shakeX, bossState.rumbleY);

  // ============ REAR SCAFFOLDING (behind the tower) ============
  bossRearScaffold(bx, g, midDead, topDead);

  // ============ STONE BASE ============
  bossStoneWall(bx, bT + 8, bw, g.deckTop - bT - 8, botDead);
  ctx.fillStyle = botDead ? '#15181b' : '#2b2f35';                // plinth course where it sits on the deck
  ctx.fillRect(bx - 3, g.deckTop - 7, bw + 6, 7);
  bossWood(bx - 2, bT, bw + 4, 8, false, botDead);
  bossIron(bx - 2, bT, 12, 8);
  bossIron(bx + bw - 10, bT, 12, 8);

  // ============ TOP STONE TURRET ============
  bossStoneWall(bx, 0, bw, tH - 12, topDead);
  ctx.fillStyle = topDead ? '#15181b' : '#2b2f35';
  ctx.fillRect(bx, 0, bw, 8);
  ctx.fillStyle = topDead ? '#2a2d31' : '#9aa0a8';
  ctx.fillRect(bx, 8, bw, 2);
  ctx.fillStyle = '#0a0c0e';
  ctx.fillRect(bx + bw * 0.55, 34, 5, 26);
  ctx.fillRect(bx + bw * 0.80, 34, 5, 26);
  bossIron(bx, tH - 40, bw, 8);
  bossWood(bx - 2, tH - 12, bw + 4, 16, false, midDead);
  bossIron(bx - 2, tH - 12, 14, 16);
  bossIron(bx + bw - 12, tH - 12, 14, 16);

  // gargoyles on the turret corners
  bossGargoyle(bx + 2, tH - 40, -1, 1.9, topDead);
  bossGargoyle(bx + bw - 2, tH - 40, 1, 1.9, topDead);

  // ============ OPEN TIMBER MIDDLE ============
  const midTop = tH + 4;
  ctx.fillStyle = midDead ? 'rgba(10,6,4,0.9)' : 'rgba(22,13,8,0.82)';
  ctx.fillRect(bx + 14, midTop, bw - 28, bT - midTop);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let px = bx + 20; px < bx + bw - 16; px += 14) ctx.fillRect(px, midTop, 1, bT - midTop);
  // timber and steel framing at the back of the open middle, so it isn't a flat wall
  ctx.save();
  ctx.globalAlpha = 0.55;
  const bayW = (bw - 28) / 3;
  for (let b = 0; b < 3; b++) {
    const x0 = bx + 14 + b * bayW, x1 = x0 + bayW;
    bossBrace(x0 + 3, midTop + 6, x1 - 3, pY - 44, 3, midDead);
    bossBrace(x1 - 3, midTop + 6, x0 + 3, pY - 44, 3, midDead);
    bossBrace(x0 + 3, pY + 20, x1 - 3, pY2Back - 38, 3, midDead);
    bossBrace(x1 - 3, pY + 20, x0 + 3, pY2Back - 38, 3, midDead);
    if (b > 0) bossWood(x0 - 3, midTop, 6, bT - midTop, true, midDead);
  }
  ctx.strokeStyle = '#2b3138';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + 14, midTop + 4); ctx.lineTo(bx + bw - 14, midTop + 4);
  ctx.moveTo(bx + 14, (midTop + pY) / 2 - 10); ctx.lineTo(bx + bw - 14, (midTop + pY) / 2 - 10);
  ctx.stroke();
  ctx.restore();

  bossWood(bx + 2, midTop, 14, bT - midTop, true, midDead);
  bossWood(bx + bw - 16, midTop, 14, bT - midTop, true, midDead);
  bossIron(bx + 1, (midTop + pY) / 2, 16, 6);
  bossIron(bx + bw - 17, (midTop + pY) / 2, 16, 6);
  bossIron(bx + 1, bT - 30, 16, 6);
  bossIron(bx + bw - 17, bT - 30, 16, 6);

  bossBrace(bx + 16, midTop + 38, bx + 44, midTop + 4, 6, midDead);
  bossBrace(bx + bw - 16, midTop + 38, bx + bw - 44, midTop + 4, 6, midDead);
  bossBrace(bx + 16, bT - 4, bx + 60, pY + 14, 7, midDead);
  bossBrace(bx + bw - 16, bT - 4, bx + bw - 56, pY + 14, 7, midDead);
  bossBrace(bx + 16, pY + 14, bx + 60, bT - 4, 5, midDead);

  // back railing (behind the archers)
  bossWood(bx + 14, pY - 40, bw - 28, 4, false, midDead);
  for (let rx = bx + 20; rx < bx + bw - 18; rx += 26) bossWood(rx, pY - 40, 4, 40, true, midDead);

  // platform: top surface (three rows of archers stand on it) + front face + joists
  ctx.fillStyle = midDead ? '#2e1d10' : '#a8743a';
  ctx.fillRect(bx + 4, pY - 14, bw - 8, 14);
  ctx.fillStyle = midDead ? '#1d1209' : '#7a4c22';
  ctx.fillRect(bx + 4, pY - 9, bw - 8, 1);
  ctx.fillRect(bx + 4, pY - 4, bw - 8, 1);
  bossWood(bx + 4, pY, bw - 8, 9, false, midDead);
  bossWood(bx + 4, pY + 9, bw - 8, 7, false, true);
  for (let jx = bx + 12; jx < bx + bw - 12; jx += 22) bossWood(jx, pY + 16, 6, 8, true, true);
  bossIron(bx + 2, pY - 2, 10, 18);
  bossIron(bx + bw - 12, pY - 2, 10, 18);
  ctx.fillStyle = '#080503';
  ctx.fillRect(bx + g.ladderX - 9, pY - 14, 18, 4);

  // lower platform: second firing line of archers below the first
  const pY2 = Math.round(g.platY2);
  bossWood(bx + 14, pY2 - 34, bw - 28, 4, false, midDead);
  for (let rx = bx + 20; rx < bx + bw - 18; rx += 26) bossWood(rx, pY2 - 34, 4, 34, true, midDead);
  ctx.fillStyle = midDead ? '#2e1d10' : '#a8743a';
  ctx.fillRect(bx + 4, pY2 - 10, bw - 8, 10);
  ctx.fillStyle = midDead ? '#1d1209' : '#7a4c22';
  ctx.fillRect(bx + 4, pY2 - 5, bw - 8, 1);
  bossWood(bx + 4, pY2, bw - 8, 8, false, midDead);
  for (let jx = bx + 12; jx < bx + bw - 12; jx += 22) bossWood(jx, pY2 + 8, 6, Math.max(2, bT - pY2 - 8), true, true);
  bossIron(bx + 2, pY2 - 2, 10, 12);
  bossIron(bx + bw - 12, pY2 - 2, 10, 12);
  ctx.fillStyle = '#080503';
  ctx.fillRect(bx + g.ladderX - 9, pY2 - 10, 18, 4);

  // ladder: from the door's stoop up to the platform
  const lx = bx + g.ladderX;
  const ladderTop = pY - 40;
  ctx.fillStyle = midDead ? '#3a2616' : '#7a4c22';
  ctx.fillRect(lx - 9, ladderTop, 4, g.sillY - ladderTop);
  ctx.fillRect(lx + 5, ladderTop, 4, g.sillY - ladderTop);
  ctx.fillStyle = 'rgba(255,220,160,0.2)';
  ctx.fillRect(lx - 9, ladderTop, 1, g.sillY - ladderTop);
  ctx.fillRect(lx + 5, ladderTop, 1, g.sillY - ladderTop);
  ctx.fillStyle = midDead ? '#4a3220' : '#a8743a';
  for (let ry = g.sillY - 8; ry > ladderTop; ry -= 10) ctx.fillRect(lx - 5, ry, 10, 3);

  // ============ DOOR + STOOP the archers come out of ============
  const dX = bx + g.doorCx - g.doorW / 2;
  const dTop = g.sillY - g.doorH;
  ctx.fillStyle = botDead ? '#2a2d31' : '#8e949c';
  ctx.fillRect(dX - 4, dTop - 4, g.doorW + 8, g.doorH + 4);
  ctx.fillStyle = '#0a0705';
  ctx.beginPath();
  ctx.moveTo(dX, g.sillY);
  ctx.lineTo(dX, dTop + g.doorW / 2);
  ctx.arc(dX + g.doorW / 2, dTop + g.doorW / 2, g.doorW / 2, Math.PI, 0);
  ctx.lineTo(dX + g.doorW, g.sillY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6b4320';
  ctx.beginPath();
  ctx.moveTo(dX - 1, dTop + 6); ctx.lineTo(dX - 9, dTop + 12);
  ctx.lineTo(dX - 9, g.sillY - 2); ctx.lineTo(dX - 1, g.sillY);
  ctx.closePath(); ctx.fill();
  bossIron(dX - 9, dTop + 14, 8, 3);
  const stoopX = bx + g.ladderX - 14;
  bossWood(stoopX, g.sillY, (dX + g.doorW + 4) - stoopX, 5, false, botDead);
  bossBrace(stoopX + 6, g.sillY + 5, stoopX + 22, g.sillY + 22, 4, botDead);

  // gargoyles on the base corners
  bossGargoyle(bx + 2, bT, -1, 1.6, botDead);
  bossGargoyle(bx + bw - 2, bT, 1, 1.6, botDead);

  // ============ WHEELED PLATFORM (big rolling wheels under a wide deck) ============
  bossChassis(bx, g, botDead);

  // ============ CANNONS ============
  const topWarn = (bossState.topHp > 0 && bossState.topState === 'IDLE' && bossState.topTimer > 0 && bossState.topTimer < 45) ? 1 - bossState.topTimer / 45 : 0;
  const botWarn = (bossState.botHp > 0 && bossState.botState === 'IDLE' && bossState.botTimer > 0 && bossState.botTimer < 45) ? 1 - bossState.botTimer / 45 : 0;
  const topBlast = (bossState.topState === 'LAUNCHING' && bossState.topChainProgress < 0.12) ? 1 - bossState.topChainProgress / 0.12 : 0;
  const botBlast = (bossState.botState === 'LAUNCHING' && bossState.botChainProgress < 0.12) ? 1 - bossState.botChainProgress / 0.12 : 0;
  bossCannon(bx, g.cyTop, g, !topDead, topWarn, topBlast);
  bossCannon(bx, g.cyBot, g, !botDead, botWarn, botBlast);

  // ============ ARCHERS (back rows first) ============
  const drawOrder = bossState.archers.slice().sort((a, b) => a.y - b.y);
  drawOrder.forEach(a => {
    if (a.phase === 'DYING') {
      const k = Math.min(1, a.dieT / 24);
      bossArcherSprite(bx + a.x, a.y, 'ready', a.anim, 1.25, 1 - k * 0.85);
      drawFlame(bx + a.x, a.y, 16 + 6 * (1 - k), 30 + 14 * (1 - k), a.x * 0.7, 1 - k * 0.5);
      return;
    }
    let pose = 'ready';
    if (a.phase === 'EMERGE' || a.phase === 'TO_LADDER' || a.phase === 'TO_SLOT') pose = 'walk';
    else if (a.phase === 'CLIMB') pose = 'climb';
    else if (a.phase === 'READY' && a.aim) pose = 'draw';
    const recoilX = a.recoil > 0 ? a.recoil * 0.5 : 0;
    bossArcherSprite(bx + a.x + recoilX, a.y, pose, a.anim, 1.25, a.fade);
  });

  // ============ DAMAGE FLASH + FIRE ============
  const flashRect = (y0, y1, f) => {
    if (f > 0) { ctx.fillStyle = 'rgba(255,220,160,' + (0.4 * f / 6) + ')'; ctx.fillRect(bx, y0, bw, y1 - y0); }
  };
  flashRect(0, tH, bossState.topFlash);
  flashRect(tH, bT, bossState.midFlash);
  flashRect(bT, gY, bossState.botFlash);

  ['top', 'mid', 'bot'].forEach(sec => {
    const b = B[sec];
    const range = bossSectionRange(sec, g);
    // dark char wave sweeping down, with flames along its front (same look as the castle towers)
    if (b.charProgress > 0 && !b.charred) {
      const waveY = range[0] + (range[1] - range[0]) * b.charProgress;
      ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
      ctx.fillRect(bx - 6, range[0], bw + 12, waveY - range[0]);
      const n = Math.floor(bw / 34);
      for (let i = 0; i <= n; i++) {
        drawFlame(bx + 6 + i * 34 + Math.sin(i * 7) * 6, waveY, 32, 48, i * 1.7 + range[0]);
      }
    }
    // flames burning where the dragon hit
    b.flames.forEach(f => drawFlame(bx + f.x, f.y, f.w, f.h, f.x * 0.37 + f.y * 0.11));
  });

  // ============ HEALTH BARS ============
  if (!bossCinematic) {
  if (!topDead) bossHpBar(bx + 12, g.cyTop + 40, bw - 24, bossState.topHp, 'TOP CANNON', false, false);
  if (!midDead) {
    const aliveN = bossAliveArchers();
    const open = bossMidOpen();
    const midLabel = open ? 'CENTER — OPEN! BURN IT!'
      : (bossState.waveState === 'SPAWNING' ? 'WAVE ' + bossState.wave + ' — ARCHERS: ' + aliveN
      : 'CENTER — ARCHERS LEFT: ' + aliveN);
    bossHpBar(bx + 20, tH + 20, bw - 40, bossState.midHp, midLabel, !open, open);
  }
  if (!botDead) bossHpBar(bx + 12, bT + 14, bw - 24, bossState.botHp, 'LOWER CANNON', false, false);
  }

  // ============ METAL SPHERES ============
  if (bossState.topState === 'LAUNCHING') {
    const b = bossBall(bossState.topChainProgress, g.cyTop);
    bossMetalBall(b.x, b.y, b.r, b.rot);
  }
  if (bossState.botState === 'LAUNCHING') {
    const b = bossBall(bossState.botChainProgress, g.cyBot);
    bossMetalBall(b.x, b.y, b.r, b.rot);
  }

  ctx.restore();

  // ============ "LOOSE!" BUBBLE ============
  if (bossCinematic) return;

  // ============ DIRT AND STONES FROM THE WHEELS ============
  bossRocks.forEach(r => {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.globalAlpha = Math.min(1, r.life / 20);
    ctx.fillStyle = r.color;
    ctx.fillRect(-r.size / 2, -r.size / 2, r.size, r.size * 0.8);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-r.size / 2, r.size * 0.1, r.size, r.size * 0.2);
    ctx.restore();
  });

  if (bossState.speechBubbleTimer > 0 && !midDead) {
    const bwid = 62, bh = 26;
    const bubX = bx - bwid - 10, bubY = pY - 74;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(bubX, bubY, bwid, bh);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bubX + bwid - 12, bubY + bh);
    ctx.lineTo(bubX + bwid + 6, bubY + bh + 12);
    ctx.lineTo(bubX + bwid - 28, bubY + bh);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOOSE!', bubX + bwid / 2, bubY + 18);
    ctx.textAlign = 'left';
  }

  // Draw fired arrows on top of the tower so they are visible during the boss fight
  drawArchersAndArrows();
}

