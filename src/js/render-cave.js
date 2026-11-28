// render-cave.js — Drawing for the cave levels and the surfacing cutscene (logic in cave.js).
// The cave is drawn normally, then covered by a darkness mask with holes cut where there is light:
// a faint glow around Cyndraxx, every flame he breathes, and every torch he has lit. The glowing cave
// creatures are drawn over the darkness (only inside the tunnel), so they are always visible.
// Classic script: shares global scope with the other src/js files.

let caveMask = null;
function caveMaskCanvas() {
  if (!caveMask) caveMask = document.createElement('canvas');
  if (caveMask.width !== width || caveMask.height !== height) { caveMask.width = width; caveMask.height = height; }
  return caveMask;
}

function caveTunnelPath(c, C) {
  c.beginPath();
  c.moveTo(-10, caveCeilAt(C.scroll - 10));
  for (let sx = 0; sx <= width + 10; sx += 8) c.lineTo(sx, caveCeilAt(C.scroll + sx));
  for (let sx = width + 10; sx >= -10; sx -= 8) c.lineTo(sx, caveFloorAt(C.scroll + sx));
  c.closePath();
}

// The far side of the cavern, seen through the tunnel: huge, dim rock spires lit only by the glowing life
// growing on them, getting fainter, smaller, bluer and slower the farther away they are (three layers).
const CAVE_DEPTH_LAYERS = [
  { par: 0.08, a: 0.45, sc: 0.45, hue: 205, step: 150 },   // farthest
  { par: 0.18, a: 0.7, sc: 0.65, hue: 190, step: 190 },
  { par: 0.32, a: 1, sc: 0.85, hue: 175, step: 240 }    // nearest of the background
];
function drawCaveDepth(C) {
  const W = width, H = height, t = C.t;
  ctx.save();
  // a faint haze of light hanging in the air of the great cavern
  ctx.globalCompositeOperation = 'lighter';
  const hz = ctx.createLinearGradient(0, 0, 0, H);
  hz.addColorStop(0, 'rgba(10,30,45,0)');
  hz.addColorStop(0.5, 'rgba(14,46,62,0.22)');
  hz.addColorStop(1, 'rgba(10,30,45,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  CAVE_DEPTH_LAYERS.forEach((L, li) => {
    const off = C.scroll * L.par;
    const k0 = Math.floor(off / L.step) - 1, k1 = Math.floor((off + W) / L.step) + 1;
    for (let k = k0; k <= k1; k++) {
      const seed = k * 13 + li * 101;
      const x = k * L.step - off + (hash2(seed, 1) - 0.5) * L.step * 0.6;
      const top = hash2(seed, 2) < 0.5;
      const len = H * (0.42 + hash2(seed, 3) * 0.3);          // long enough to reach into the open tunnel
      const wide = (40 + hash2(seed, 4) * 60) * L.sc;
      const baseY = top ? 0 : H, tipY = top ? len : H - len;
      // the spire: a dark blue-grey silhouette with a faint rim of glow down one side
      ctx.globalAlpha = L.a;
      ctx.fillStyle = 'hsl(' + L.hue + ',40%,' + (10 + li * 4) + '%)';   // added as light, so it never dims what's lit
      ctx.beginPath();
      ctx.moveTo(x - wide, baseY);
      ctx.quadraticCurveTo(x - wide * 0.35, (baseY + tipY) / 2, x, tipY);
      ctx.quadraticCurveTo(x + wide * 0.4, (baseY + tipY) / 2, x + wide, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'hsla(' + (L.hue - 20) + ',90%,60%,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + wide, baseY);
      ctx.quadraticCurveTo(x + wide * 0.4, (baseY + tipY) / 2, x, tipY);
      ctx.stroke();
      // colonies of glowing fungus and glow-worms clinging to it, twinkling
      ctx.globalCompositeOperation = 'lighter';
      const n = 6 + Math.floor(hash2(seed, 5) * 8);
      for (let j = 0; j < n; j++) {
        const u = hash2(seed, 10 + j);
        const py = baseY + (tipY - baseY) * (0.2 + u * 0.75);
        const half = wide * (1 - (py - baseY) / (tipY - baseY)) * 0.8;
        const px = x + (hash2(seed, 30 + j) - 0.5) * 2 * half;
        const hue = [175, 195, 280, 140, 320][Math.floor(hash2(seed, 50 + j) * 5)];
        const tw = 0.5 + 0.5 * Math.sin(t * (0.03 + hash2(seed, 70 + j) * 0.05) + j * 2.1);
        const r = (10 + hash2(seed, 90 + j) * 14) * L.sc;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'hsla(' + hue + ',100%,65%,' + (0.35 + 0.5 * tw) + ')');
        g.addColorStop(1, 'hsla(' + hue + ',100%,50%,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
        ctx.fillStyle = 'hsla(' + hue + ',100%,85%,' + (0.4 + 0.6 * tw) + ')';
        ctx.fillRect(px - 1, py - 1, 2 * L.sc + 1, 2 * L.sc + 1);
      }
      // glowing tendrils hanging from the ceiling spires, beaded with light
      if (top && hash2(seed, 6) < 0.6) {
        const tx = x + (hash2(seed, 7) - 0.5) * wide;
        const tl = (40 + hash2(seed, 8) * 80) * L.sc;
        const ty = Math.max(0, tipY - len * 0.3);
        ctx.strokeStyle = 'hsla(165,100%,60%,' + (0.35 + 0.15 * Math.sin(t * 0.05 + k)) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        for (let s = 1; s <= 8; s++) ctx.lineTo(tx + Math.sin(t * 0.02 + s * 0.7 + k) * 2 * L.sc, ty + tl * s / 8);
        ctx.stroke();
        for (let s = 2; s <= 8; s += 2) {
          ctx.fillStyle = 'hsla(165,100%,80%,' + (0.3 + 0.4 * Math.sin(t * 0.08 + s + k)) + ')';
          ctx.fillRect(tx + Math.sin(t * 0.02 + s * 0.7 + k) * 2 * L.sc - 1, ty + tl * s / 8 - 1, 2, 2);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
    }
    // distant glowing patches out in the dark between the spires
    for (let j = 0; j < 6; j++) {
      const sd = li * 31 + j;
      const span = W * 1.6;
      const px = ((hash2(sd, 81) * span - off) % span + span) % span - W * 0.3;
      const py = H * (0.3 + hash2(sd, 82) * 0.4);
      const r = (16 + hash2(sd, 83) * 22) * L.sc;
      const hue = [180, 200, 270, 150][j % 4];
      const tw = 0.6 + 0.4 * Math.sin(t * 0.02 + sd);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'hsla(' + hue + ',100%,60%,' + 0.22 * tw * L.a + ')');
      g.addColorStop(1, 'hsla(' + hue + ',100%,50%,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    // far-off shoals of tiny glowing creatures drifting slowly across this layer
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 2; s++) {
      const sd = li * 7 + s;
      const span = W * 2.5;
      const cx = ((hash2(sd, 61) * span - off * 0.5 + t * (0.15 + hash2(sd, 62) * 0.25) * L.sc) % span + span) % span - W * 0.4;
      const cy = H * (0.3 + hash2(sd, 63) * 0.4) + Math.sin(t * 0.01 + sd) * 20;
      const hue = hash2(sd, 64) < 0.5 ? 190 : 300;
      for (let f = 0; f < 7; f++) {
        const fx = cx + Math.sin(t * 0.03 + f * 1.7 + sd) * 18 * L.sc + f * 6 * L.sc;
        const fy = cy + Math.cos(t * 0.025 + f * 2.3) * 10 * L.sc;
        ctx.globalAlpha = L.a * (0.6 + 0.4 * Math.sin(t * 0.1 + f));
        ctx.fillStyle = 'hsla(' + hue + ',100%,75%,1)';
        ctx.fillRect(fx, fy, 2 * L.sc + 0.5, 1.2 * L.sc + 0.4);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
  });
  ctx.restore();
}

// jellyfish and glowing flyers drifting through the tunnel (parallax), flashing in neon patterns
function drawCaveLife(C) {
  const W = width, H = height, t = C.t;
  const period = W * 2.2;
  for (let i = 0; i < 4; i++) {
    const x = ((hash2(i, 121) * period - C.scroll * 0.35) % period + period) % period - W * 0.3;
    const y = H * (0.22 + hash2(i, 123) * 0.56) + Math.sin(t * 0.012 + i) * 18;
    const r = 8 + hash2(i, 125) * 14;
    const hue = (hash2(i, 127) * 360 + (Math.floor(t / BF_PATTERN_LEN) % 3 === 2 ? t * 1.5 : 0)) % 360;
    drawJelly(x, y, r, hue, bfNeon(i, y, t), t, i);
  }
  for (let i = 0; i < 7; i++) {
    const x = ((hash2(i, 131) * period - C.scroll * 0.6 + t * (0.4 + hash2(i, 133))) % period + period) % period - W * 0.3;
    const y = H * (0.25 + hash2(i, 135) * 0.5) + Math.sin(t * 0.04 + i * 2) * 24;
    drawGlowFlyer(x, y, Math.floor(hash2(i, 137) * 360), t, i, 0.9);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 36; i++) {
    const x = ((hash2(i, 141) * W - C.scroll * 0.8) % W + W) % W;
    const y = H * 0.15 + hash2(i, 143) * H * 0.7 + Math.sin(t * 0.02 + i) * 10;
    ctx.fillStyle = 'hsla(' + (150 + hash2(i, 145) * 160) + ',100%,75%,' + (0.25 + 0.35 * Math.sin(t * 0.09 + i)) + ')';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

// an unlit torch's pitch head smoulders: a pulsing orange ember and the odd spark jumping off it
function drawTorchEmber(h, tc, t) {
  if (h.x < -40 || h.x > width + 40) return;
  const pulse = 0.6 + 0.4 * Math.sin(t * 0.13 + tc.wx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(h.x, h.y - 2, 0, h.x, h.y - 2, 14);
  g.addColorStop(0, 'rgba(255,170,70,' + 0.55 * pulse + ')');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(h.x - 14, h.y - 16, 28, 28);
  ctx.fillStyle = 'rgba(255,215,140,' + (0.6 + 0.4 * pulse) + ')';
  ctx.fillRect(h.x - 1.5, h.y - 3.5, 3, 3);
  // sparks: each one jumps up and fades over 24 frames, a few times a second
  for (let s = 0; s < 3; s++) {
    const cyc = 24, ph = (t + s * 17 + Math.floor(tc.wx)) % (cyc * 3);
    if (ph >= cyc) continue;
    const u = ph / cyc, n = Math.floor((t + s * 17 + Math.floor(tc.wx)) / (cyc * 3));
    const sx = h.x + (hash2(n, s + Math.floor(tc.wx)) - 0.5) * 10 * u;
    const sy = h.y - 3 - u * 16 + u * u * 6;
    ctx.fillStyle = 'rgba(255,' + (200 - u * 80) + ',90,' + (1 - u) + ')';
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
  ctx.restore();
}

function drawCaveTorch(tc) {
  const h = caveTorchHead(tc);
  if (h.x < -40 || h.x > width + 40) return;
  ctx.save();
  if (tc.kind === 'mid') {
    // a long chain down from the ceiling to an iron hoop that holds the torch
    drawChainLinks(tc.wx - cave.scroll, caveCeilAt(tc.wx), h.x, h.y - 18, 2);
    ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 6, 6, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(h.x - 1, h.y - 18, 2, 12);
  }
  // iron bracket and wooden handle
  ctx.fillStyle = '#3a3a40';
  if (tc.kind === 'top') ctx.fillRect(h.x - 1.5, h.y - 26, 3, 14); else if (tc.kind === 'floor') ctx.fillRect(h.x - 1.5, h.y + 12, 3, 16);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(h.x - 2.5, h.y - 2, 5, 16);
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(h.x - 4, h.y - 4, 8, 5);              // the pitch-soaked head
  ctx.restore();
}

function drawCaveScene() {
  const C = cave;
  const W = width, H = height, t = C.t;

  // 1. the cave as it would look in full light
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  // rock above and below the tunnel
  const rock = (top) => {
    ctx.beginPath();
    ctx.moveTo(-10, top ? -10 : H + 10);
    for (let sx = -10; sx <= W + 10; sx += 8) ctx.lineTo(sx, top ? caveCeilAt(C.scroll + sx) : caveFloorAt(C.scroll + sx));
    ctx.lineTo(W + 10, top ? -10 : H + 10);
    ctx.closePath();
  };
  [true, false].forEach(top => {
    rock(top);
    const g = ctx.createLinearGradient(0, top ? 0 : H, 0, top ? H * 0.5 : H * 0.5);
    g.addColorStop(0, '#1c1714'); g.addColorStop(1, '#4a3c30');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // strata and knobs scrolling with the rock
    for (let k = Math.floor(C.scroll / 30) - 1; k < Math.floor(C.scroll / 30) + W / 30 + 2; k++) {
      const sx = k * 30 - C.scroll;
      const edge = top ? caveCeilAt(C.scroll + sx) : caveFloorAt(C.scroll + sx);
      const d = 8 + hash2(k, top ? 3 : 4) * 40;
      ctx.fillStyle = hash2(k, top ? 5 : 6) < 0.5 ? 'rgba(120,96,70,0.35)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(sx, top ? edge - d : edge + d - 6, 14 + hash2(k, 7) * 12, 5);
    }
    ctx.restore();
    // a lighter rim where the rock meets the tunnel
    ctx.strokeStyle = '#7a6450';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let sx = -10; sx <= W + 10; sx += 8) {
      const y = top ? caveCeilAt(C.scroll + sx) : caveFloorAt(C.scroll + sx);
      if (sx === -10) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
    }
    ctx.stroke();
  });
  C.torches.forEach(drawCaveTorch);

  // Cyndraxx, his flames and sparks (floating score texts are held back and drawn over the darkness)
  drawDragon(dragon.x, dragon.y);
  const texts = floatingTexts;
  floatingTexts = [];
  drawParticles();
  floatingTexts = texts;

  // 2. the darkness, with holes where there is light
  const m = caveMaskCanvas();
  const mc = m.getContext('2d');
  mc.globalCompositeOperation = 'source-over';
  mc.clearRect(0, 0, W, H);
  mc.fillStyle = 'rgba(0,0,0,0.975)';
  mc.fillRect(0, 0, W, H);
  mc.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a) => {
    const g = mc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,' + a + ')');
    g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.6 + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = g;
    mc.fillRect(x - r, y - r, r * 2, r * 2);
  };
  light(dragon.x + 6, dragon.y, 78, 0.9);                       // his own faint glow
  flames.forEach(f => light(f.x, f.y, 70 + f.size * 2.2, Math.min(1, f.life / 60)));
  C.torches.forEach(tc => {
    const h = caveTorchHead(tc);
    if (!tc.lit) {   // the smouldering ember shows a hint of the torch in the dark
      light(h.x, h.y - 2, 30, 0.35 + 0.15 * Math.sin(t * 0.13 + tc.wx));
      return;
    }
    const grow = Math.min(1, tc.litT / 25);
    light(h.x, h.y, (180 + Math.sin(t * 0.25 + tc.wx) * 10) * grow, 1);
  });
  ctx.drawImage(m, 0, 0);

  // 3. what glows by itself: torch flames, the cave creatures (inside the tunnel), score texts
  C.torches.forEach((tc, i) => {
    const h = caveTorchHead(tc);
    if (!tc.lit) { drawTorchEmber(h, tc, t); return; }
    drawFlame(h.x, h.y + 2, 12, 24, tc.wx * 0.01);
  });
  ctx.save();
  caveTunnelPath(ctx, C);
  ctx.clip();
  drawCaveDepth(C);
  drawCaveLife(C);
  ctx.restore();
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = 'bold 24px "Proxima Nova", sans-serif';
    ctx.fillStyle = ft.color || '#2ecc71';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
    ft.y += ft.vy;
    ft.alpha -= 0.015;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }

  // the level's title as it begins
  if (C.title > 0) {
    const a = Math.min(1, C.title / 40, (260 - C.title) / 30);
    const T = CAVE_TITLES[caveLevel] || ['', ''];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fe8ff';
    fitFont('CAVE ' + caveLevel + ': ' + T[0], 26, W - 30);
    ctx.fillText('CAVE ' + caveLevel + ': ' + T[0], W / 2, H * 0.3);
    ctx.font = 'bold 15px "Proxima Nova", sans-serif';
    ctx.fillStyle = '#e8dcc0';
    ctx.fillText(T[1], W / 2, H * 0.3 + 28);
    ctx.restore();
  }
  // fade in, and to black at the end
  const fade = Math.max(0, 1 - C.t / 50, C.ending / 70);
  if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')'; ctx.fillRect(0, 0, W, H); }
}

// ---- the surfacing cutscene: up a shaft toward the light, out of a cave mouth into the night ----
function drawSurfaceScene() {
  const S = surface;
  if (!S) return;
  const W = width, H = height, t = S.t;
  if (t < 270) {
    // climbing the shaft: the walls rush downward, a pale light grows above
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, W, H);
    const up = Math.min(1, t / 230);
    const lg = ctx.createRadialGradient(W / 2, -H * 0.1, 10, W / 2, -H * 0.1, H * (0.4 + up * 0.9));
    lg.addColorStop(0, 'rgba(200,230,255,' + (0.2 + up * 0.7) + ')');
    lg.addColorStop(1, 'rgba(120,160,220,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
    drawCavernWalls(t, -t * 8, 1 - up * 0.3);
    const dx = W / 2 + Math.sin(t * 0.05) * 16, dy = H * 0.62 - up * H * 0.15;
    drawDragon(dx, dy, -1.15);
    const flash = Math.max(0, (t - 230) / 40);
    if (flash > 0) { ctx.fillStyle = 'rgba(225,240,255,' + Math.min(1, flash) + ')'; ctx.fillRect(0, 0, W, H); }
    return;
  }
  // out into the open air (level 4's emerald night sky), bursting from a cave mouth in the hillside
  drawNightSky();
  drawMoon();
  drawGiantClouds();
  drawParallaxCastleBackground();
  const gY = height - groundHeight;
  ctx.fillStyle = '#141a14';
  ctx.beginPath();
  ctx.moveTo(-20, H);
  ctx.quadraticCurveTo(W * 0.15, gY - H * 0.28, W * 0.48, gY);
  ctx.lineTo(W + 20, gY); ctx.lineTo(W + 20, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(W * 0.46, gY, W * 0.6, 6);
  // the cave mouth he came out of: a ragged black opening with a rocky rim
  const mx = W * 0.17, my = gY - H * 0.1, mw = W * 0.09, mh = H * 0.065;
  ctx.fillStyle = '#2a2a24';
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16) + Math.PI;
    const r = 1.18 + hash2(i, 77) * 0.12;
    const x = mx + Math.cos(a) * mw * r, y = my + Math.sin(a) * mh * r * 1.1;
    if (i === 0) ctx.moveTo(x, y + mh * 0.6); else ctx.lineTo(x, y);
  }
  ctx.lineTo(mx + mw * 1.2, my + mh * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#020203';
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16) + Math.PI;
    const r = 0.95 + hash2(i, 79) * 0.08;
    const x = mx + Math.cos(a) * mw * r, y = my + Math.sin(a) * mh * r;
    if (i === 0) ctx.moveTo(x, y + mh * 0.6); else ctx.lineTo(x, y);
  }
  ctx.lineTo(mx + mw, my + mh * 0.6);
  ctx.closePath();
  ctx.fill();
  const u = Math.min(1, (t - 270) / 160);
  const e = 1 - Math.pow(1 - u, 2);
  const dx = W * 0.17 + (W * 0.42 - W * 0.17) * e;
  const dy = gY - H * 0.12 - Math.sin(e * Math.PI * 0.6) * H * 0.3 - e * H * 0.05;
  drawDragon(dx, dy, -0.9 * (1 - e));
  const wf = Math.max(0, 1 - (t - 270) / 40);
  if (wf > 0) { ctx.fillStyle = 'rgba(225,240,255,' + wf + ')'; ctx.fillRect(0, 0, W, H); }
  if (t > 330) drawCathDialogue(SURFACE_LINE, surface);
  const out = Math.max(0, (t - (SURFACE_LEN - 40)) / 40);
  if (out > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, out) + ')'; ctx.fillRect(0, 0, W, H); }
}
