// render-masonry.js — Stone/brick textures for castle obstacles and battlements
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).
//
// Each obstacle gets a random masonry style the first time it is drawn. Textures are painted once
// into offscreen canvases (cached by size/style/palette/seed) so scrolling stays cheap.
//   0 running-bond brick   1 rough fieldstone   2 big ashlar blocks with quoins + string courses
//   3 Flemish bond (stretchers + dark headers make a diamond pattern)

const MASONRY_STYLES = 4;
const masonryCache = new Map();

function masonryStyleOf(o) {
  if (o.brickStyle === undefined) {
    o.brickStyle = Math.floor(Math.random() * MASONRY_STYLES);
    o.brickSeed = Math.floor(Math.random() * 1000);
  }
  return o.brickStyle;
}

function masonryRoundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// one stone with a lit top edge and a shadowed bottom/right edge
function masonryBrick(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,0.11)';
  c.fillRect(x, y, w, 1.5);
  c.fillRect(x, y, 1, h);
  c.fillStyle = 'rgba(0,0,0,0.24)';
  c.fillRect(x, y + h - 1.5, w, 1.5);
  c.fillRect(x + w - 1, y, 1, h);
}

function paintMasonry(c, w, h, pal, style, seed, charred) {
  const tone = (i, j, spread) => shadeHex(pal.main, Math.round((hash2(i + seed * 31, j + seed * 17) - 0.5) * (spread || 26)));
  c.fillStyle = pal.dark;   // mortar
  c.fillRect(0, 0, w, h);

  if (h <= 14) {
    // cornice / ledge: lit top band, dentil blocks underneath
    c.fillStyle = pal.main;
    c.fillRect(0, 0, w, h);
    c.fillStyle = pal.light;
    c.fillRect(0, 0, w, 3);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(0, 3, w, 2);
    c.fillStyle = pal.dark;
    for (let x = 3; x < w; x += 9) c.fillRect(x, h - 5, 4, 5);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, h - 1, w, 1);
    return;
  }

  if (style === 0) {
    const bh = 14, bw = 26;
    for (let r = 0, y = 0; y < h; r++, y += bh) {
      const off = (r % 2) * (bw / 2);
      for (let q = -1, x = -off; x < w; q++, x += bw) masonryBrick(c, x + 1, y + 1, bw - 2, bh - 2, tone(q, r));
    }
  } else if (style === 1) {
    // irregular fieldstone laid in uneven courses
    let y = 0, r = 0;
    while (y < h) {
      const rowH = 11 + Math.floor(hash2(r, seed) * 9);
      let x = -Math.floor(hash2(seed, r) * 14), q = 0;
      while (x < w) {
        const sw = 12 + Math.floor(hash2(q + r * 13, seed + 5) * 20);
        const inset = 1 + hash2(q, r + 99) * 1.5;
        c.fillStyle = tone(q, r, 34);
        masonryRoundRect(c, x + inset, y + inset, sw - inset * 2, rowH - inset * 2, 4);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.12)';
        masonryRoundRect(c, x + inset + 1, y + inset, sw - inset * 2 - 3, 3, 2);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.22)';
        masonryRoundRect(c, x + inset + 2, y + rowH - inset - 3, sw - inset * 2 - 3, 2, 1);
        c.fill();
        x += sw; q++;
      }
      y += rowH; r++;
    }
  } else if (style === 2) {
    // large ashlar blocks, quoin stones on the corners, string course every few rows
    const bh = 22, bw = 42;
    for (let r = 0, y = 0; y < h; r++, y += bh) {
      if (r % 6 === 5) {
        c.fillStyle = pal.light;
        c.fillRect(0, y + 1, w, 6);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(0, y + 7, w, 2);
        masonryBrick(c, 0, y + 9, w, bh - 10, tone(0, r, 10));
        continue;
      }
      const off = (r % 2) * (bw / 2);
      for (let q = -1, x = -off; x < w; q++, x += bw) masonryBrick(c, x + 1, y + 1, bw - 2, bh - 2, tone(q, r, 18));
      // quoins: alternating long/short pale corner stones
      const qw = r % 2 ? 16 : 26;
      const qc = shadeHex(pal.main, 22);
      masonryBrick(c, 0, y + 1, qw, bh - 2, qc);
      masonryBrick(c, w - qw, y + 1, qw, bh - 2, qc);
    }
  } else {
    // Flemish bond: stretcher + header alternate; offset rows line headers up into diamonds
    const bh = 12, sw = 24, hw = 12;
    for (let r = 0, y = 0; y < h; r++, y += bh) {
      let x = (r % 2) ? -18 : 0, q = 0;
      while (x < w) {
        const header = q % 2 === 1;
        const bw2 = header ? hw : sw;
        const col = header ? shadeHex(pal.main, -22 + Math.round((hash2(q, r + seed) - 0.5) * 10)) : tone(q, r, 20);
        masonryBrick(c, x + 1, y + 1, bw2 - 2, bh - 2, col);
        x += bw2; q++;
      }
    }
  }

  // weathering: cracks, chipped stones, moss (or soot + embers when charred)
  const area = w * h;
  const cracks = Math.max(1, Math.floor(area / 9000));
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.lineWidth = 1;
  for (let i = 0; i < cracks; i++) {
    let cx = hash2(i, seed + 1) * w, cy = hash2(seed + 2, i) * h;
    c.beginPath();
    c.moveTo(cx, cy);
    for (let s = 0; s < 4; s++) {
      cx += (hash2(i * 7 + s, seed) - 0.5) * 10;
      cy += 4 + hash2(s, i + seed) * 6;
      c.lineTo(cx, cy);
    }
    c.stroke();
  }
  const chips = Math.floor(area / 2500);
  for (let i = 0; i < chips; i++) {
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(Math.floor(hash2(i + 50, seed) * w), Math.floor(hash2(seed, i + 50) * h), 2 + Math.floor(hash2(i, 3) * 3), 2);
  }

  if (!charred) {
    const moss = Math.floor(area / 6000);
    for (let i = 0; i < moss; i++) {
      const mx = hash2(i + 200, seed) * w;
      const my = h * (0.5 + hash2(seed, i + 200) * 0.5);
      const mr = 4 + hash2(i, seed + 9) * 8;
      const g = c.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, 'rgba(70,120,60,0.45)');
      g.addColorStop(1, 'rgba(70,120,60,0)');
      c.fillStyle = g;
      c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    }
    // moss along the base
    const base = c.createLinearGradient(0, h - 18, 0, h);
    base.addColorStop(0, 'rgba(60,100,50,0)');
    base.addColorStop(1, 'rgba(60,100,50,0.22)');
    c.fillStyle = base;
    c.fillRect(0, h - 18, w, 18);
  } else {
    const streaks = Math.floor(w / 14);
    for (let i = 0; i < streaks; i++) {
      const sx = hash2(i, seed + 40) * w;
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(sx, 0, 3 + hash2(seed, i) * 5, h * (0.3 + hash2(i, i) * 0.6));
    }
    const embers = Math.floor(area / 3000);
    for (let i = 0; i < embers; i++) {
      c.fillStyle = hash2(i, 77) < 0.5 ? 'rgba(255,120,40,0.55)' : 'rgba(255,190,80,0.45)';
      c.fillRect(Math.floor(hash2(i + 9, seed) * w), Math.floor(hash2(seed, i + 9) * h), 1.5, 1.5);
    }
  }

  // ambient occlusion toward the bottom
  const ao = c.createLinearGradient(0, 0, 0, h);
  ao.addColorStop(0, 'rgba(0,0,0,0)');
  ao.addColorStop(1, 'rgba(0,0,0,0.18)');
  c.fillStyle = ao;
  c.fillRect(0, 0, w, h);
}

// Draw a textured masonry rectangle at (rx, ry). `owner` (obstacle/battlement) supplies style + seed.
function drawMasonry(rx, ry, rw, rh, pal, owner) {
  const w = Math.round(rw), h = Math.round(rh);
  if (w <= 0 || h <= 0) return;
  const style = masonryStyleOf(owner);
  const charred = pal === charPalette;
  const key = w + '|' + h + '|' + style + '|' + (charred ? 'c' : 's') + '|' + owner.brickSeed;
  let tex = masonryCache.get(key);
  if (!tex) {
    tex = document.createElement('canvas');
    tex.width = w;
    tex.height = h;
    paintMasonry(tex.getContext('2d'), w, h, pal, style, owner.brickSeed, charred);
    masonryCache.set(key, tex);
    if (masonryCache.size > 70) masonryCache.delete(masonryCache.keys().next().value);
  }
  ctx.drawImage(tex, Math.round(rx), Math.round(ry));
}
