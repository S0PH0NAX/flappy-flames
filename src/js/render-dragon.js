// render-dragon.js — The player dragon (drawDragon): the original blocky sprite from khaleesi0900.html,
// plus the gold-shield look (gold colors, glow, shield held across the belly).
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function drawDragon(x, y, customPitch = null) {
      if (invulnerableTimer % 6 > 3) return;

      ctx.save();
      ctx.translate(x, y);
      const pitch = customPitch !== null ? customPitch : Math.min(Math.max(dragon.velocity * 0.05, -0.4), 0.6);
      ctx.rotate(pitch);
      const p = 2.6;

      const rainbowColors = ['#00d2d3', '#ff7675', '#f1c40f', '#2ecc71', '#a29bfe', '#ffffff'];
      const strobeColor = rainbowColors[Math.floor(Date.now() / 50) % rainbowColors.length];
      const shielded = goldShield.held && !khaleesiMounted;

      if (khaleesiMounted) {
        const auraRadius = 42 + Math.sin(Date.now() / 60) * 8;
        const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, auraRadius);
        aura.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        aura.addColorStop(0.5, strobeColor);
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (shielded) {
        // golden glow while carrying the gold knight's shield
        const r = 50 + Math.sin(Date.now() / 120) * 6;
        const aura = ctx.createRadialGradient(0, 4, 8, 0, 4, r);
        aura.addColorStop(0, 'rgba(255, 236, 150, 0.55)');
        aura.addColorStop(0.6, 'rgba(255, 200, 60, 0.22)');
        aura.addColorStop(1, 'rgba(255, 200, 60, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 4, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const mainOrange = khaleesiMounted ? strobeColor : (shielded ? '#f8c030' : '#ff793f');
      const darkOrange = khaleesiMounted ? '#ffffff' : (shielded ? '#c07c10' : '#d63031');
      const bellyYellow = shielded ? '#fff6d0' : '#f1c40f';
      const spikeRed = shielded ? '#f08020' : '#c0392b';
      const hornCream = '#f5e6d3';

      const cyanWing = khaleesiMounted ? strobeColor : (shielded ? '#fff0a0' : '#00d2d3');
      const navyBone = '#222f3e';

      ctx.fillStyle = darkOrange;
      ctx.fillRect(-12 * p, 1 * p, 4 * p, 3 * p);
      ctx.fillRect(-15 * p, -1 * p, 4 * p, 3 * p);
      ctx.fillStyle = spikeRed;
      ctx.fillRect(-10 * p, -3 * p, 2 * p, 3 * p);
      ctx.fillRect(-5 * p, -6 * p, 2 * p, 3 * p);

      ctx.fillStyle = darkOrange;
      ctx.fillRect(-7 * p, 5 * p, 4 * p, 4 * p);

      ctx.fillStyle = mainOrange;
      ctx.fillRect(-9 * p, -3 * p, 13 * p, 10 * p);

      ctx.fillStyle = bellyYellow;
      ctx.fillRect(-3 * p, 1 * p, 7 * p, 6 * p);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(-1 * p, 2 * p, 4 * p, 1 * p);
      ctx.fillRect(0 * p, 4 * p, 3 * p, 1 * p);

      ctx.fillStyle = mainOrange;
      ctx.fillRect(0 * p, -7 * p, 12 * p, 8 * p);
      ctx.fillRect(7 * p, -4 * p, 7 * p, 6 * p);
      ctx.fillStyle = darkOrange;
      ctx.fillRect(12 * p, -3 * p, 1 * p, 1 * p);

      ctx.fillStyle = '#ff7675';
      ctx.fillRect(5 * p, 0 * p, 3 * p, 2 * p);

      ctx.fillStyle = hornCream;
      ctx.fillRect(-1 * p, -10 * p, 3 * p, 4 * p);
      ctx.fillRect(3 * p, -9 * p, 2 * p, 3 * p);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4 * p, -6 * p, 5 * p, 5 * p);
      ctx.fillStyle = '#2d3436';
      ctx.fillRect(6 * p, -5 * p, 3 * p, 4 * p);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6 * p, -5 * p, 1 * p, 1 * p);

      dragon.wingState *= 0.84;
      const flapY = Math.round(dragon.wingState * 10) * p;

      ctx.save();
      ctx.translate(0, flapY);

      ctx.fillStyle = cyanWing;
      ctx.fillRect(-12 * p, -13 * p, 10 * p, 10 * p);
      ctx.fillRect(-8 * p, -8 * p, 8 * p, 7 * p);
      ctx.fillRect(-4 * p, -4 * p, 6 * p, 5 * p);

      ctx.fillStyle = navyBone;
      ctx.fillRect(-14 * p, -15 * p, 4 * p, 4 * p);
      ctx.fillRect(-10 * p, -13 * p, 4 * p, 2 * p);
      ctx.fillRect(-6 * p, -11 * p, 4 * p, 2 * p);
      ctx.fillRect(-2 * p, -9 * p, 4 * p, 2 * p);

      ctx.fillRect(-14 * p, -11 * p, 2 * p, 6 * p);
      ctx.fillRect(-10 * p, -5 * p, 2 * p, 4 * p);
      ctx.fillRect(-5 * p, -1 * p, 2 * p, 3 * p);

      ctx.restore();

      if (goldShield.held) drawHeldShield(Date.now(), p);

      if (khaleesiMounted || khaleesiRidingNow()) {
        drawKhaleesiSprite(-2.5 * p, -6.4 * p, 0.85);   // seated on his back (prologue ride and invincible ride alike)
      }

      ctx.restore();
    }


    // The gold knight's shield, held flat (long side horizontal) across the belly.
    function drawHeldShield(now, p) {
      ctx.save();
      ctx.translate(0.5 * p, 8 * p);
      ctx.rotate(-Math.PI / 2 + Math.sin(now / 300) * 0.04);
      ctx.scale(0.85, 1.25);
      ctx.translate(-15, -4);
      drawGoldShieldShape({ mode: 'WALK' }, '#f4c430', '#a87a10', '#fff1a8', '#2a1c05', 0);
      ctx.restore();
    }

    // Where the dragon's mouth is relative to (dragon.x, dragon.y); fire comes out of here.
    function dragonMouthOffset() {
      return { x: 39, y: -4 };
    }
