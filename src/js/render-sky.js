// render-sky.js — Night sky, stars, moon, clouds, parallax castle backdrop (cached layers)
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    // ==========================================
    // BACKGROUND: sky, moon, clouds, castle parallax
    // Static layers are painted once into cached offscreen canvases (keyed by size + level)
    // and blitted each frame; only twinkles, window glows and scrolling are per-frame.
    // ==========================================
    const bgCache = {};
    let bgCacheCount = 0;
    function bgLayer(key, w, h, paint) {
      let c = bgCache[key];
      if (!c) {
        if (bgCacheCount > 40) { for (const k in bgCache) delete bgCache[k]; bgCacheCount = 0; }
        c = document.createElement('canvas');
        c.width = Math.max(1, Math.ceil(w));
        c.height = Math.max(1, Math.ceil(h));
        paint(c.getContext('2d'), c.width, c.height);
        bgCache[key] = c;
        bgCacheCount++;
      }
      return c;
    }

    // deterministic 0..1 noise so cached art and per-brick shading never flicker
    function hash2(x, y) {
      let h = (x * 374761393 + y * 668265263) | 0;
      h = (h ^ (h >>> 13)) * 1274126177 | 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }

    function skyTheme() {
      if (currentLevel === 1) return {
        top: '#030817', mid: '#0b1d3d', low: '#1d3f63', horizon: '#3d6b8c',
        haze: '120,170,220', band: '160,190,255', cloudLit: '205,220,245', cloudBody: '60,78,110',
        castleFar: '#16233a', castleNear: '#0c121c', rim: 'rgba(170,200,240,', window: '255,214,140',
        moonTint: null
      };
      if (currentLevel === 2) return {
        top: '#05030f', mid: '#170f35', low: '#34204f', horizon: '#6a3a64',
        haze: '200,130,190', band: '210,170,255', cloudLit: '225,200,240', cloudBody: '70,52,100',
        castleFar: '#221a38', castleNear: '#100b1c', rim: 'rgba(210,180,240,', window: '255,200,130',
        moonTint: null
      };
      if (currentLevel === 4) return {
        // emerald aurora night
        top: '#01080a', mid: '#062a2a', low: '#0f4a44', horizon: '#3d8a6e',
        haze: '90,220,170', band: '140,255,210', cloudLit: '190,240,225', cloudBody: '30,70,72',
        castleFar: '#0f2a2c', castleNear: '#071416', rim: 'rgba(150,255,210,', window: '255,90,90',
        moonTint: 'rgba(90,220,170,0.12)'
      };
      if (currentLevel >= 5) return {
        // golden storm dusk
        top: '#0a0610', mid: '#2a1636', low: '#6e3426', horizon: '#d98a3a',
        haze: '255,190,90', band: '255,220,160', cloudLit: '255,215,160', cloudBody: '78,48,58',
        castleFar: '#2c1a26', castleNear: '#140b12', rim: 'rgba(255,205,120,', window: '255,230,140',
        moonTint: 'rgba(255,190,90,0.18)'
      };
      return {
        top: '#0d0204', mid: '#2c0910', low: '#5a1616', horizon: '#a1421f',
        haze: '255,120,60', band: '255,170,140', cloudLit: '255,190,150', cloudBody: '80,30,32',
        castleFar: '#2a0f14', castleNear: '#140709', rim: 'rgba(255,150,110,', window: '255,170,90',
        moonTint: 'rgba(200,60,30,0.38)'
      };
    }

    function drawNightSky() {
      const th = skyTheme();
      const sky = bgLayer('sky|' + width + 'x' + height + '|' + currentLevel, width, height, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, th.top);
        g.addColorStop(0.45, th.mid);
        g.addColorStop(0.8, th.low);
        g.addColorStop(1, th.horizon);
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);

        // faint galactic band sweeping diagonally across the sky
        c.save();
        c.translate(w * 0.5, h * 0.3);
        c.rotate(-0.42);
        for (let i = 0; i < 26; i++) {
          const bx = (hash2(i, 1) - 0.5) * w * 1.6;
          const by = (hash2(i, 2) - 0.5) * 70;
          const br = 40 + hash2(i, 3) * 90;
          const rg = c.createRadialGradient(bx, by, 0, bx, by, br);
          rg.addColorStop(0, 'rgba(' + th.band + ',0.07)');
          rg.addColorStop(1, 'rgba(' + th.band + ',0)');
          c.fillStyle = rg;
          c.fillRect(bx - br, by - br, br * 2, br * 2);
        }
        for (let i = 0; i < 380; i++) {
          const sx = (hash2(i, 7) - 0.5) * w * 1.7;
          const sy = (hash2(i, 8) - 0.5) * (hash2(i, 9) < 0.7 ? 60 : 160);
          c.fillStyle = 'rgba(255,255,255,' + (0.08 + hash2(i, 10) * 0.35) + ')';
          c.fillRect(sx, sy, 1, 1);
        }
        c.restore();

        // tiny static background stars
        for (let i = 0; i < 160; i++) {
          c.fillStyle = 'rgba(255,255,255,' + (0.1 + hash2(i, 21) * 0.3) + ')';
          c.fillRect(hash2(i, 22) * w, hash2(i, 23) * h * 0.75, 1, 1);
        }

        // warm/cool haze rising off the horizon
        const hz = c.createLinearGradient(0, h * 0.55, 0, h);
        hz.addColorStop(0, 'rgba(' + th.haze + ',0)');
        hz.addColorStop(1, 'rgba(' + th.haze + ',0.28)');
        c.fillStyle = hz;
        c.fillRect(0, h * 0.55, w, h * 0.45);
      });
      ctx.drawImage(sky, 0, 0);

      // moving, twinkling stars (movement unchanged)
      const tw = Date.now() / 400;
      ctx.fillStyle = '#ffffff';
      stars.forEach((s, i) => {
        const twinkle = 0.65 + 0.35 * Math.sin(tw * (1 + (i % 5) * 0.37) + i * 1.7);
        ctx.globalAlpha = s.alpha * twinkle;
        if (s.size >= 3) {
          ctx.fillRect(s.x, s.y, 2, 2);
          ctx.globalAlpha = s.alpha * twinkle * 0.45;
          ctx.fillRect(s.x - 2, s.y + 0.5, 6, 1);
          ctx.fillRect(s.x + 0.5, s.y - 2, 1, 6);
        } else {
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        if (state === 'PLAYING' || state === 'LEVEL_CELEBRATE') {
          s.x -= s.speed * (khaleesiMounted ? 2.2 : 1.0);
          if (s.x < 0) s.x = width;
        }
      });
      ctx.globalAlpha = 1.0;
    }

    function drawMoon() {
      const moonX = width * 0.72;
      const moonY = height * 0.22;
      const R = 54;
      const th = skyTheme();

      // soft layered halo
      const glow = ctx.createRadialGradient(moonX, moonY, R * 0.8, moonX, moonY, R * 3.4);
      const haloCol = currentLevel === 3 ? '255,150,110' : (currentLevel >= 5 ? '255,215,150' : '255,243,205');
      glow.addColorStop(0, 'rgba(' + haloCol + ',0.42)');
      glow.addColorStop(0.35, 'rgba(' + haloCol + ',0.12)');
      glow.addColorStop(1, 'rgba(' + haloCol + ',0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, R * 3.4, 0, Math.PI * 2);
      ctx.fill();

      const moon = bgLayer('moon2|' + currentLevel, R * 2 + 8, R * 2 + 8, (c, w, h) => {
        const cx = w / 2, cy = h / 2;
        c.save();
        c.beginPath();
        c.arc(cx, cy, R, 0, Math.PI * 2);
        c.clip();

        // bright cratered highlands
        c.fillStyle = '#ecebe2';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
          const a = hash2(i, 31) * Math.PI * 2, rr = Math.sqrt(hash2(i, 32)) * R;
          c.fillStyle = hash2(i, 33) < 0.5 ? 'rgba(200,198,186,0.35)' : 'rgba(255,255,250,0.35)';
          c.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1 + hash2(i, 34) * 2, 1 + hash2(i, 35) * 2);
        }

        // maria (the dark "seas"), placed like the real near side at full moon (north up)
        const mare = (u, v, ru, rv, rot, alpha) => {
          const x = cx + u * R, y = cy + v * R;
          c.save();
          c.translate(x, y); c.rotate(rot || 0); c.scale(1, rv / ru);
          const g = c.createRadialGradient(0, 0, 0, 0, 0, ru * R);
          g.addColorStop(0, 'rgba(118,120,116,' + alpha + ')');
          g.addColorStop(0.7, 'rgba(126,128,122,' + (alpha * 0.85) + ')');
          g.addColorStop(1, 'rgba(126,128,122,0)');
          c.fillStyle = g;
          c.beginPath(); c.arc(0, 0, ru * R, 0, Math.PI * 2); c.fill();
          c.restore();
        };
        // Oceanus Procellarum: the huge western sea
        mare(-0.58, -0.05, 0.30, 0.48, 0.15, 0.75);
        mare(-0.50, -0.32, 0.22, 0.20, 0, 0.7);
        mare(-0.55, 0.28, 0.24, 0.20, 0, 0.7);
        mare(-0.70, 0.05, 0.16, 0.30, 0, 0.6);
        // Mare Imbrium (big round sea, upper left)
        mare(-0.24, -0.36, 0.30, 0.25, 0, 0.85);
        // Mare Frigoris (thin band across the north)
        mare(-0.18, -0.70, 0.36, 0.07, -0.08, 0.7);
        mare(0.18, -0.66, 0.20, 0.06, 0.1, 0.6);
        // Mare Serenitatis and Mare Vaporum
        mare(0.16, -0.33, 0.17, 0.16, 0, 0.85);
        mare(-0.02, -0.16, 0.10, 0.08, 0, 0.7);
        // Mare Tranquillitatis
        mare(0.30, -0.04, 0.21, 0.16, 0.3, 0.85);
        mare(0.20, 0.08, 0.12, 0.10, 0, 0.75);
        // Mare Crisium (isolated oval near the eastern limb)
        mare(0.64, -0.27, 0.12, 0.10, 0, 0.9);
        // Mare Fecunditatis and Mare Nectaris
        mare(0.56, 0.14, 0.12, 0.19, 0.2, 0.75);
        mare(0.36, 0.30, 0.09, 0.09, 0, 0.75);
        // Mare Nubium, Mare Cognitum and Mare Humorum
        mare(-0.14, 0.34, 0.18, 0.14, 0, 0.75);
        mare(-0.30, 0.18, 0.12, 0.09, 0, 0.65);
        mare(-0.48, 0.44, 0.10, 0.09, 0, 0.8);

        // Tycho: bright young crater in the south with long rays
        const tx = cx - 0.12 * R, ty = cy + 0.70 * R;
        c.strokeStyle = 'rgba(255,255,250,0.11)';
        c.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + hash2(i, 41) * 0.3;
          const len = R * (0.4 + hash2(i, 42) * 0.9);
          c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + Math.cos(a) * len, ty + Math.sin(a) * len); c.stroke();
        }
        const tg = c.createRadialGradient(tx, ty, 0, tx, ty, 6);
        tg.addColorStop(0, 'rgba(255,255,255,1)');
        tg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = tg; c.fillRect(tx - 6, ty - 6, 12, 12);
        c.fillStyle = 'rgba(150,148,140,0.8)'; c.beginPath(); c.arc(tx, ty, 1.6, 0, Math.PI * 2); c.fill();
        // Copernicus and Kepler: small bright ray craters in the western seas
        [[-0.30, -0.08, 4.5], [-0.62, -0.06, 3.2], [-0.36, -0.52, 2.4]].forEach(k => {
          const kx = cx + k[0] * R, ky = cy + k[1] * R;
          const kg = c.createRadialGradient(kx, ky, 0, kx, ky, k[2]);
          kg.addColorStop(0, 'rgba(255,255,250,0.95)');
          kg.addColorStop(1, 'rgba(255,255,250,0)');
          c.fillStyle = kg; c.fillRect(kx - k[2], ky - k[2], k[2] * 2, k[2] * 2);
        });
        // a few small craters in the highlands
        [[0.42, 0.55, 2.2], [0.10, 0.58, 1.8], [0.55, 0.42, 1.6], [-0.30, 0.62, 1.6], [0.70, 0.10, 1.4]].forEach(k => {
          c.fillStyle = 'rgba(170,168,158,0.6)';
          c.beginPath(); c.arc(cx + k[0] * R, cy + k[1] * R, k[2], 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(255,255,250,0.6)';
          c.beginPath(); c.arc(cx + k[0] * R + 0.6, cy + k[1] * R + 0.6, k[2] * 0.6, 0, Math.PI * 2); c.fill();
        });

        // gentle limb darkening (a full moon has no hard terminator)
        const limb = c.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
        limb.addColorStop(0, 'rgba(40,40,60,0)');
        limb.addColorStop(1, 'rgba(40,40,60,0.28)');
        c.fillStyle = limb;
        c.fillRect(0, 0, w, h);

        if (th.moonTint) {
          c.fillStyle = th.moonTint;
          c.fillRect(0, 0, w, h);
        }
        c.restore();

      });
      ctx.drawImage(moon, moonX - moon.width / 2, moonY - moon.height / 2);
    }

    // a soft cumulus: overlapping puffs, moon-lit tops, darker bellies
    function paintCloud(c, x, y, scale, th, alpha) {
      const puffs = [[-70, 10, 34], [-40, -8, 44], [0, -22, 56], [44, -10, 46], [80, 8, 32], [-20, 14, 38], [26, 14, 40]];
      c.save();
      c.globalAlpha = alpha;
      // body
      puffs.forEach(p => {
        const px = x + p[0] * scale, py = y + p[1] * scale, r = p[2] * scale;
        const g = c.createRadialGradient(px, py - r * 0.4, r * 0.2, px, py, r);
        g.addColorStop(0, 'rgba(' + th.cloudLit + ',0.9)');
        g.addColorStop(0.55, 'rgba(' + th.cloudBody + ',0.85)');
        g.addColorStop(1, 'rgba(' + th.cloudBody + ',0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
      });
      // flat, darker underside
      const ub = c.createLinearGradient(0, y, 0, y + 40 * scale);
      ub.addColorStop(0, 'rgba(' + th.cloudBody + ',0)');
      ub.addColorStop(1, 'rgba(' + th.cloudBody + ',0.55)');
      c.fillStyle = ub;
      c.beginPath();
      c.ellipse(x, y + 18 * scale, 100 * scale, 22 * scale, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    function drawGiantClouds() {
      const th = skyTheme();
      const layers = [
        { speed: 0.08, tile: 1400, alpha: 0.35, key: 'far',
          clouds: [[160, 0.10, 0.9], [620, 0.20, 0.7], [1080, 0.06, 1.1]] },
        { speed: 0.15, tile: 1200, alpha: 0.55, key: 'near',
          clouds: [[120, 0.16, 1.15], [550, 0.28, 0.95], [900, 0.09, 1.35]] }
      ];
      layers.forEach(L => {
        const tileH = Math.ceil(height * 0.5);
        const tile = bgLayer('clouds|' + L.key + '|' + height + '|' + currentLevel, L.tile, tileH, (c, w, h) => {
          L.clouds.forEach(cl => {
            const cx = cl[0], cy = height * cl[1] + 40, s = cl[2];
            paintCloud(c, cx, cy, s, th, 1);
            // wrap clouds that straddle the tile edge so the strip tiles seamlessly
            if (cx + 130 * s > w) paintCloud(c, cx - w, cy, s, th, 1);
            if (cx - 130 * s < 0) paintCloud(c, cx + w, cy, s, th, 1);
          });
        });
        const scroll = backgroundParallaxX * L.speed;
        const startX = -(scroll % L.tile);
        ctx.globalAlpha = L.alpha;
        for (let offset = startX - L.tile; offset < width + L.tile; offset += L.tile) {
          ctx.drawImage(tile, Math.round(offset), -40);
        }
        ctx.globalAlpha = 1.0;
      });
    }

    // One castle silhouette tile. towers: [x, w, hFrac, roof], walls: [x, w, hFrac]
    function paintCastleTile(c, w, h, baseY, maxH, color, rim, detail) {
      c.fillStyle = color;
      const crenels = (x, top, ww, cw, gap) => {
        for (let bx = x; bx < x + ww - cw + 1; bx += cw + gap) c.fillRect(bx, top - cw * 0.8, cw, cw * 0.8);
      };
      const towers = detail
        ? [[20, 50, 1.0, 'cone'], [190, 110, 0.88, 'flat'], [400, 60, 0.95, 'cone'], [520, 40, 0.7, 'cone']]
        : [[60, 70, 0.85, 'cone'], [300, 50, 1.0, 'cone'], [470, 90, 0.75, 'flat']];
      const walls = detail
        ? [[70, 120, 0.65], [300, 100, 0.58], [460, 140, 0.45]]
        : [[0, 60, 0.5], [130, 170, 0.55], [350, 120, 0.6], [560, 40, 0.5]];

      walls.forEach(wl => {
        const top = baseY - maxH * wl[2];
        c.fillRect(wl[0], top, wl[1], baseY - top);
        crenels(wl[0], top, wl[1], detail ? 8 : 6, detail ? 8 : 6);
      });

      towers.forEach(t => {
        const tx = t[0], tw = t[1], top = baseY - maxH * t[2];
        c.fillStyle = color;
        c.fillRect(tx, top, tw, baseY - top);
        if (t[3] === 'cone') {
          c.beginPath();
          c.moveTo(tx - 6, top);
          c.lineTo(tx + tw / 2, top - tw * 0.95);
          c.lineTo(tx + tw + 6, top);
          c.closePath();
          c.fill();
          // pennant
          c.fillRect(tx + tw / 2 - 1, top - tw * 0.95 - 14, 2, 14);
          c.beginPath();
          c.moveTo(tx + tw / 2 + 1, top - tw * 0.95 - 14);
          c.lineTo(tx + tw / 2 + 14, top - tw * 0.95 - 10);
          c.lineTo(tx + tw / 2 + 1, top - tw * 0.95 - 6);
          c.fill();
        } else {
          c.fillRect(tx - 4, top - 6, tw + 8, 6);
          crenels(tx - 4, top - 6, tw + 8, 10, 8);
        }

        if (detail) {
          // moonlit right edge and roof edge
          c.fillStyle = rim + '0.16)';
          c.fillRect(tx + tw - 3, top, 3, baseY - top);
          if (t[3] === 'cone') {
            c.strokeStyle = rim + '0.25)';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(tx + tw / 2, top - tw * 0.95);
            c.lineTo(tx + tw + 6, top);
            c.stroke();
          }
          // dark arrow slits
          c.fillStyle = 'rgba(0,0,0,0.45)';
          for (let sy = top + 40; sy < baseY - 40; sy += 46) c.fillRect(tx + tw / 2 - 2, sy, 4, 14);
          // faint stone courses
          c.fillStyle = 'rgba(255,255,255,0.025)';
          for (let sy = top + 8; sy < baseY; sy += 10) c.fillRect(tx, sy, tw, 1);
          c.fillStyle = color;
        }
      });

      if (detail) {
        // great gate on the big tower
        c.fillStyle = 'rgba(0,0,0,0.55)';
        c.beginPath();
        c.arc(245, baseY - 40, 24, Math.PI, 0);
        c.rect(221, baseY - 40, 48, 40);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.5)';
        c.lineWidth = 1;
        for (let gx = 225; gx < 268; gx += 6) { c.beginPath(); c.moveTo(gx, baseY - 60); c.lineTo(gx, baseY); c.stroke(); }
        // moonlit wall tops
        c.fillStyle = rim + '0.12)';
        walls.forEach(wl => c.fillRect(wl[0], baseY - maxH * wl[2], wl[1], 2));
      }
    }

    // window positions (relative to the near tile) that glow and flicker
    const CASTLE_WINDOWS = [
      [45, 0.92], [105, 0.58], [155, 0.58], [215, 0.80], [275, 0.80], [245, 0.70],
      [350, 0.52], [430, 0.86], [490, 0.38], [540, 0.62]
    ];

    function drawParallaxCastleBackground() {
      const gY = height - groundHeight;
      const maxCastleH = height * 0.40;
      const th = skyTheme();
      const tileH = Math.ceil(maxCastleH * 1.6 + 40);
      const tileBase = tileH;   // ground line inside the tile

      // far hills + distant castle (slower)
      const farTile = bgLayer('castleFar|' + height + '|' + currentLevel, 640, tileH, (c, w, h) => {
        c.fillStyle = th.castleFar;
        c.beginPath();
        c.moveTo(0, h);
        for (let x = 0; x <= w; x += 16) {
          const y = h - maxCastleH * 0.32 - Math.sin(x / w * Math.PI * 2) * 18 - Math.sin(x / w * Math.PI * 6 + 1) * 8;
          c.lineTo(x, y);
        }
        c.lineTo(w, h);
        c.closePath();
        c.fill();
        paintCastleTile(c, w, h, h - maxCastleH * 0.25, maxCastleH * 0.55, th.castleFar, th.rim, false);
        // distance haze over the far layer
        const hz = c.createLinearGradient(0, h - maxCastleH, 0, h);
        hz.addColorStop(0, 'rgba(' + th.haze + ',0.10)');
        hz.addColorStop(1, 'rgba(' + th.haze + ',0.22)');
        c.fillStyle = hz;
        c.globalCompositeOperation = 'source-atop';
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'source-over';
      });
      const farScroll = backgroundParallaxX * 0.45;
      const farStart = -(farScroll % 640);
      for (let offset = farStart - 640; offset < width + 640; offset += 640) {
        ctx.drawImage(farTile, Math.round(offset), gY - tileBase);
      }

      // tiny far windows
      const t = Date.now();
      ctx.fillStyle = 'rgba(' + th.window + ',0.55)';
      for (let offset = farStart - 640; offset < width + 640; offset += 640) {
        [[90, 0.62], [200, 0.6], [330, 0.78], [505, 0.55]].forEach(wd => {
          const wx = offset + wd[0];
          if (wx < -10 || wx > width + 10) return;
          ctx.fillRect(Math.round(wx), Math.round(gY - maxCastleH * 0.25 - maxCastleH * 0.55 * wd[1] + 12), 2, 3);
        });
      }

      // near castle (same 600px pattern and speed as before)
      const nearTile = bgLayer('castleNear|' + height + '|' + currentLevel, 600, tileH, (c, w, h) => {
        paintCastleTile(c, w, h, h, maxCastleH, th.castleNear, th.rim, true);
      });
      const patternWidth = 600;
      const startX = -(backgroundParallaxX % patternWidth);
      for (let offset = startX - patternWidth; offset < width + patternWidth; offset += patternWidth) {
        ctx.drawImage(nearTile, Math.round(offset), gY - tileBase);

        CASTLE_WINDOWS.forEach((wd, i) => {
          const lx = offset + wd[0];
          if (lx < -20 || lx > width + 20) return;
          const ly = gY - maxCastleH * wd[1] + 14;
          const flick = 0.75 + 0.25 * Math.sin(t / 230 + i * 2.1) * Math.sin(t / 97 + i);
          const r = 9 + flick * 3;
          const radial = ctx.createRadialGradient(lx, ly, 1, lx, ly, r);
          radial.addColorStop(0, 'rgba(' + th.window + ',' + (0.55 * flick) + ')');
          radial.addColorStop(1, 'rgba(' + th.window + ',0)');
          ctx.fillStyle = radial;
          ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
          // arched window pane with a mullion
          ctx.fillStyle = 'rgba(' + th.window + ',' + (0.75 + 0.25 * flick) + ')';
          ctx.fillRect(lx - 3, ly - 3, 6, 8);
          ctx.beginPath(); ctx.arc(lx, ly - 3, 3, Math.PI, 0); ctx.fill();
          ctx.fillStyle = th.castleNear;
          ctx.fillRect(lx - 0.5, ly - 5, 1, 10);
        });
      }

      // low ground mist in front of the backdrop
      const mist = ctx.createLinearGradient(0, gY - 50, 0, gY);
      mist.addColorStop(0, 'rgba(' + th.haze + ',0)');
      mist.addColorStop(1, 'rgba(' + th.haze + ',0.18)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, gY - 50, width, 50);
    }

