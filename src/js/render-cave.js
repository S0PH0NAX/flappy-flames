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

// jellyfish and glowing flyers drifting through the tunnel (parallax), flashing in neon patterns
function drawCaveLife(C) {
  const W = width, H = height, t = C.t;
  const period = W * 2.2;
  for (let i = 0; i < 10; i++) {
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

function drawCaveTorch(tc) {
  const h = caveTorchHead(tc);
  if (h.x < -40 || h.x > width + 40) return;
  ctx.save();
  // iron bracket and wooden handle
  ctx.fillStyle = '#3a3a40';
  if (tc.top) ctx.fillRect(h.x - 1.5, h.y - 26, 3, 14); else ctx.fillRect(h.x - 1.5, h.y + 12, 3, 16);
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
    if (!tc.lit) return;
    const h = caveTorchHead(tc);
    const grow = Math.min(1, tc.litT / 25);
    light(h.x, h.y, (180 + Math.sin(t * 0.25 + tc.wx) * 10) * grow, 1);
  });
  ctx.drawImage(m, 0, 0);

  // 3. what glows by itself: torch flames, the cave creatures (inside the tunnel), score texts
  C.torches.forEach((tc, i) => {
    if (!tc.lit) return;
    const h = caveTorchHead(tc);
    drawFlame(h.x, h.y + 2, 12, 24, tc.wx * 0.01);
  });
  ctx.save();
  caveTunnelPath(ctx, C);
  ctx.clip();
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
