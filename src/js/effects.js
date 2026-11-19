// effects.js — Flame renderer, breath blobs, archer detail, particles/debris/floating text
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    let flameDrawCount = 0;
    const FLAME_PAL_FIRE  = { outer: [231, 76, 60],  mid: [243, 156, 18],  inner: [241, 196, 15],  core: [255, 248, 214] };
    const FLAME_PAL_VIOLET = { outer: [142, 68, 173], mid: [187, 107, 230], inner: [222, 180, 255], core: [250, 240, 255] };
    const FLAME_PAL_GOLD   = { outer: [214, 137, 16], mid: [245, 196, 48],  inner: [255, 230, 140], core: [255, 252, 235] };
    const FLAME_PAL_BLUE  = { outer: [41, 128, 185], mid: [93, 173, 226],  inner: [169, 204, 227], core: [235, 245, 255] };
    const FLAME_PAL_GREEN = { outer: [30, 168, 90],  mid: [88, 214, 141],  inner: [171, 235, 198], core: [240, 255, 245] };

    function hexToRgb(hex) {
      if (typeof hex !== 'string' || hex[0] !== '#') return [255, 136, 0];
      let h = hex.slice(1);
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16);
      if (isNaN(n)) return [255, 136, 0];
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rgbaStr(c, a) {
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }

    // x,y = centre of the flame's base; w = base width; h = height; seed = per-flame phase offset
    function drawFlame(x, y, w, h, seed, alpha, pal) {
      if (w < 1 || h < 1) return;
      const a = (alpha === undefined) ? 1 : alpha;
      if (a <= 0.01) return;
      const P = pal || FLAME_PAL_FIRE;
      const cheap = ++flameDrawCount > 40;      // keep the frame rate up when lots of fire is on screen
      const t = Date.now() / 1000;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (!cheap) {
        const gy = y - h * 0.35;
        const gr = Math.max(w, h * 0.7) * 1.15;
        const glow = ctx.createRadialGradient(x, gy, 1, x, gy, gr);
        glow.addColorStop(0, rgbaStr(P.outer, 0.30 * a));
        glow.addColorStop(1, rgbaStr(P.outer, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(x - gr, gy - gr, gr * 2, gr * 2);
      }

      const tongues = cheap
        ? [{ dx: 0, wk: 1.0, hk: 1.0, ph: 0 }]
        : [{ dx: -0.28, wk: 0.62, hk: 0.68, ph: 1.9 }, { dx: 0.30, wk: 0.58, hk: 0.74, ph: 3.7 }, { dx: 0, wk: 1.0, hk: 1.0, ph: 0 }];
      const layers = [
        { c: P.outer, s: 1.00, a: 0.55, grad: true },
        { c: P.mid,   s: 0.72, a: 0.60, grad: true },
        { c: P.inner, s: 0.46, a: 0.70, grad: false },
        { c: P.core,  s: 0.24, a: 0.80, grad: false }
      ];

      for (let li = 0; li < layers.length; li++) {
        const L = layers[li];
        for (let ti = 0; ti < tongues.length; ti++) {
          const T = tongues[ti];
          const flick = 1 + Math.sin(t * 11 + seed * 2 + T.ph) * 0.10 + Math.sin(t * 5.3 + seed + T.ph) * 0.08;
          const sway = (Math.sin(t * 8 + seed + T.ph) * 0.5 + Math.sin(t * 13.7 + seed * 1.7 + T.ph) * 0.3) * w * 0.35;
          const px = x + T.dx * w;
          const bw = w * 0.5 * T.wk * L.s;
          const th = h * T.hk * L.s * flick;
          const tipX = px + sway * (0.5 + 0.5 * L.s);
          const tipY = y - th;

          ctx.beginPath();
          ctx.moveTo(px - bw, y);
          ctx.bezierCurveTo(px - bw * 1.1, y - th * 0.35, px - bw * 0.35 + sway * 0.4, y - th * 0.72, tipX, tipY);
          ctx.bezierCurveTo(px + bw * 0.35 + sway * 0.2, y - th * 0.66, px + bw * 1.1, y - th * 0.30, px + bw, y);
          ctx.quadraticCurveTo(px, y + bw * 0.35, px - bw, y);
          ctx.closePath();

          const aa = L.a * a;
          if (L.grad && !cheap) {
            const g = ctx.createLinearGradient(0, y, 0, tipY);
            g.addColorStop(0, rgbaStr(L.c, aa));
            g.addColorStop(0.55, rgbaStr(L.c, aa * 0.7));
            g.addColorStop(1, rgbaStr(L.c, 0));
            ctx.fillStyle = g;
          } else {
            ctx.fillStyle = rgbaStr(L.c, aa * 0.8);
          }
          ctx.fill();
        }
      }
      ctx.restore();

      // rising embers
      if (Math.random() < 0.06 * a && particles.length < 500) {
        particles.push({
          x: x + (Math.random() - 0.5) * w * 0.6,
          y: y - h * 0.5 * Math.random(),
          vx: (Math.random() - 0.5) * 0.9,
          vy: -0.8 - Math.random() * 1.4,
          size: 1.5 + Math.random() * 1.5,
          life: 22 + Math.random() * 18,
          color: Math.random() < 0.5 ? '#ffb347' : '#ffd966'
        });
      }
    }

    // The dragon's breath: a soft, additive, motion-stretched fireball instead of a hard square.
    function drawBreathBlob(f, lifeRatio, size) {
      const c = hexToRgb(f.color);
      const flick = 1 + Math.sin(Date.now() / 45 + f.x * 0.13 + f.y) * 0.1;
      const r = Math.max(3, size * 0.95 * flick);
      const a = Math.min(1, 0.15 + lifeRatio * 0.95);
      const hot = lifeRatio > 0.55;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(f.x + size / 2, f.y + size / 2);
      ctx.rotate(Math.atan2(f.vy, f.vx));
      ctx.translate(-r * 0.7, 0);
      ctx.scale(2.0, 1);
      const g = ctx.createRadialGradient(r * 0.15, 0, 0, 0, 0, r);
      g.addColorStop(0, hot ? rgbaStr([255, 255, 236], a) : rgbaStr(c, a));
      g.addColorStop(0.3, rgbaStr(c, a * 0.85));
      g.addColorStop(0.65, rgbaStr(c, a * 0.35));
      g.addColorStop(1, rgbaStr(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ==========================================
    // DETAILED ARCHER (used by wall archers AND the siege-tower archers)
    // Origin = centre of the body; the old sprite's footprint (10 wide, ~20 tall, bow on the left).
    // poses: hidden, alert, draw (glowing), hold (aiming), ready, walk, climb
    // ==========================================
    function drawArcherDetail(pose, anim, legs) {
      if (pose === 'hidden') {
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-5, 0, 10, 5);
        ctx.fillRect(-3, -3, 6, 3);
        ctx.fillStyle = '#58d68d';
        ctx.fillRect(-3, -3, 4, 1);
        ctx.fillStyle = '#1e8449';
        ctx.fillRect(-5, 4, 10, 1);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(1, -6, 1, 3);
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(2, -5, 1, 2);
        return;
      }

      const glowing = pose === 'draw';
      const drawn = pose === 'draw' || pose === 'hold';
      const walking = pose === 'walk';
      const climbing = pose === 'climb';
      const alert = pose === 'alert';
      const step = Math.sin((anim || 0) * 0.4);

      if (glowing) {
        const glowFactor = Math.sin(Date.now() / 30) * 0.5 + 0.5;
        const radialGlow = ctx.createRadialGradient(0, -6, 2, 0, -6, 26);
        radialGlow.addColorStop(0, 'rgba(241, 196, 15, ' + (0.4 + glowFactor * 0.4) + ')');
        radialGlow.addColorStop(1, 'rgba(241, 196, 15, 0)');
        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(0, -6, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // quiver on the back, fletchings poking out
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(3, -5, 3, 11);
      ctx.fillStyle = '#3e2713';
      ctx.fillRect(3, 4, 3, 2);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(3, -7, 1, 2);
      ctx.fillRect(5, -7, 1, 2);
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(4, -8, 1, 3);

      // legs (boss archers walk and climb; wall archers are cut off by the parapet)
      if (legs) {
        const l1 = walking ? step * 2 : (climbing ? (step > 0 ? -2 : 0) : 0);
        const l2 = walking ? -step * 2 : (climbing ? (step > 0 ? 0 : -2) : 0);
        ctx.fillStyle = '#3d4a5c';
        ctx.fillRect(-4 + (walking ? l1 : 0), 8 + (climbing ? l1 : 0), 3, 3);
        ctx.fillRect(1 + (walking ? l2 : 0), 8 + (climbing ? l2 : 0), 3, 3);
        ctx.fillStyle = '#2c1c10';
        ctx.fillRect(-4 + (walking ? l1 : 0), 10 + (climbing ? l1 : 0), 3, 1);
        ctx.fillRect(1 + (walking ? l2 : 0), 10 + (climbing ? l2 : 0), 3, 1);
      }

      // tunic with shading, belt, buckle and quiver strap
      const tunic = glowing ? '#f1c40f' : '#2980b9';
      ctx.fillStyle = tunic;
      ctx.fillRect(-5, -2, 10, 10);
      ctx.fillStyle = glowing ? '#d4ac0d' : '#1f6391';
      ctx.fillRect(3, -2, 2, 10);
      ctx.fillStyle = glowing ? '#f7dc6f' : '#3498db';
      ctx.fillRect(-5, -2, 10, 1);
      ctx.fillRect(-5, -2, 1, 8);
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(-5, 5, 10, 2);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-1, 5, 2, 2);
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(-4, -2, 1, 1); ctx.fillRect(-3, -1, 1, 1); ctx.fillRect(-2, 0, 1, 1);
      ctx.fillRect(-1, 1, 1, 1);  ctx.fillRect(0, 2, 1, 1);  ctx.fillRect(1, 3, 1, 1);

      // scarf
      const tail = (walking || climbing) ? Math.round(step) : 0;
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-5, -3, 10, 2);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-5, -3, 10, 1);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(4 + tail, -1, 2, 4);

      // arms
      if (climbing) {
        ctx.fillStyle = tunic;
        ctx.fillRect(-7, -4 + (step > 0 ? 0 : 3), 2, 3);
        ctx.fillRect(5, -4 + (step > 0 ? 3 : 0), 2, 3);
        ctx.fillStyle = '#f8c291';
        ctx.fillRect(-7, -5 + (step > 0 ? 0 : 3), 2, 1);
        ctx.fillRect(5, -5 + (step > 0 ? 3 : 0), 2, 1);
      } else if (!walking) {
        ctx.fillStyle = tunic;
        ctx.fillRect(-8, -2, 3, 2);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(-6, -2, 1, 2);
        ctx.fillStyle = '#f8c291';
        ctx.fillRect(-10, -2, 2, 2);
        if (drawn) {
          ctx.fillStyle = '#f8c291';
          ctx.fillRect(-3, -4, 2, 2);
        }
      }

      // head: face, eye, nose, brow, jaw shadow
      ctx.fillStyle = '#f8c291';
      ctx.fillRect(-4, -7, 8, 5);
      ctx.fillStyle = '#e0a878';
      ctx.fillRect(-4, -3, 8, 1);
      ctx.fillRect(-5, -5, 1, 2);
      ctx.fillStyle = '#3e2713';
      ctx.fillRect(-4, -6, 3, 1);
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(-3, -5, 1, 1);

      // hood with brim, highlight and feather
      ctx.fillStyle = glowing ? '#f39c12' : '#27ae60';
      ctx.fillRect(-5, -12, 10, 5);
      ctx.fillStyle = glowing ? '#f8c471' : '#58d68d';
      ctx.fillRect(-4, -12, 6, 1);
      ctx.fillStyle = glowing ? '#ca6f1e' : '#1e8449';
      ctx.fillRect(-6, -8, 12, 1);
      ctx.fillRect(3, -11, 2, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(2, -15, 1, 4);
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(3, -14, 1, 3);

      // bow
      if (walking || climbing) {
        ctx.strokeStyle = '#784e24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(5, -2, 8, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
      } else {
        const R = glowing ? 9 : 8;
        ctx.strokeStyle = glowing ? '#3498db' : (alert ? '#c0392b' : '#784e24');
        ctx.lineWidth = glowing ? 3 : 2;
        ctx.beginPath();
        ctx.arc(-6, -2, R, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.fillStyle = '#d4a76a';
        ctx.fillRect(-4, -10, 2, 1);
        ctx.fillRect(-4, 5, 2, 1);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-6 - R - 1, -3, 2, 3);

        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (drawn) {
          ctx.moveTo(-3.5, -9.6);
          ctx.lineTo(-1, -2);
          ctx.lineTo(-3.5, 5.6);
        } else {
          ctx.moveTo(-6, -9);
          ctx.lineTo(-6, 5);
        }
        ctx.stroke();

        if (drawn) {
          ctx.fillStyle = '#d5b07a';
          ctx.fillRect(-16, -3, 15, 1);
          ctx.fillStyle = '#bdc3c7';
          ctx.fillRect(-19, -3, 3, 1);
          ctx.fillRect(-18, -4, 1, 3);
          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(-3, -4, 2, 1);
          ctx.fillRect(-3, -2, 2, 1);
        }
      }
    }

    function drawParticles() {
  const gY = height - groundHeight;
  
  for (let i = blackDebris.length - 1; i >= 0; i--) {
    const d = blackDebris[i];
    d.x += d.vx;
    d.y += d.vy;
    d.vy += d.gravity;
    d.rotation += d.rotSpeed;

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    
    ctx.fillStyle = '#11161d';
    const halfSize = d.size / 2;
    ctx.beginPath();
    ctx.moveTo(0, -halfSize);
    ctx.lineTo(halfSize, -halfSize * 0.6);
    ctx.lineTo(halfSize * 0.8, halfSize);
    ctx.lineTo(-halfSize * 0.8, halfSize);
    ctx.lineTo(-halfSize, -halfSize * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (d.y >= gY) {
      for (let s = 0; s < 5; s++) {
         particles.push({
            x: d.x,
            y: gY,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.7) * 4,
            size: 2 + Math.random() * 2,
            life: 15 + Math.random() * 10,
            color: '#e74c3c'
          });
      }
      blackDebris.splice(i, 1);
    }
  }

  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i];

    // Physics update runs in both PLAYING and BOSS states
    f.vx *= f.dragX;
    f.vy += f.gravity;
    f.x += f.vx;
    f.y += f.vy;
    f.life--;

    const lifeRatio = f.life / f.maxLife;
    const curSize = f.size * lifeRatio;

    if (Math.random() < 0.25) {
      particles.push({
        x: f.x + (Math.random() - 0.5) * 6,
        y: f.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: 2 + Math.random() * 2,
        life: 15,
        color: f.color
      });
    }

    drawBreathBlob(f, lifeRatio, curSize);

    if (f.y >= gY - 4) {
      if (Math.random() < 0.35) {
        groundFlames.push({
          x: f.x,
          life: 80 + Math.random() * 60,
          boostIntensity: 1.0
        });
      }
      flames.splice(i, 1);
      continue;
    }

    obstacles.forEach(obs => {
      if (f.x >= obs.x - 10 && f.x <= obs.x + obs.width + 10 && f.y >= obs.bottomY - 14 && f.y <= obs.bottomY + 20) {
        if (Math.random() < 0.45) {
          obs.surfaceFlames.push({
            relX: f.x - obs.x,
            width: 12,
            maxWidth: 32 + Math.random() * 22,
            height: 14,
            maxHeight: 38 + Math.random() * 24,
            spreadSpeed: (Math.random() - 0.5) * 1.4
          });
        }
      }
    });

    if (f.life <= 0) flames.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    ctx.fillStyle = p.color;
    
    if (p.isSmoke) {
      ctx.globalAlpha = p.life / 60.0;
      ctx.beginPath();
      const halfSize = p.size / 2;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.arc(p.x - halfSize, p.y + halfSize * 0.7, p.size * 0.8, 0, Math.PI * 2);
      ctx.arc(p.x + halfSize, p.y - halfSize * 0.3, p.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.font = 'bold 24px "Proxima Nova", sans-serif';
    ctx.fillStyle = ft.color || '#2ecc71';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();

    ft.y += ft.vy;
    ft.alpha -= 0.015;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

