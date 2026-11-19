// render-world.js — Ground, ground flames, battlements, archers & arrows
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function drawGround() {
      const gY = height - groundHeight;
      const scrollSpeed = getLevelScrollSpeed();

      ctx.fillStyle = '#181e28';
      ctx.fillRect(0, gY, width, groundHeight);
      
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(0, gY, width, 8);
      const gScroll = (state === 'BOSS' && bossState.active) ? bossState.groundScroll : 0;
      ctx.fillStyle = '#2ecc71';
      for (let x = -(gScroll % 12); x < width; x += 12) {
        ctx.fillRect(x, gY - 2, 6, 4);
      }
      if (gScroll > 0) {
        // stones and dirt streaks rushing past in the foreground
        for (let k = 0; k < 9; k++) {
          const px = (((k * 61 - gScroll * 1.5) % (width + 60)) + (width + 60)) % (width + 60) - 30;
          ctx.fillStyle = '#232c3a';
          ctx.fillRect(px, gY + 14 + (k % 3) * 16, 16 + (k % 4) * 6, 3);
          ctx.fillStyle = '#2c3748';
          ctx.fillRect(px + 2, gY + 11 + (k % 3) * 16, 8, 3);
        }
      }

      const t = Date.now() / 150;
      groundFlames.forEach((gf) => {
        gf.x -= scrollSpeed * (khaleesiMounted ? 2.2 : 1.0);
        gf.life--;

        const boostMult = gf.boostIntensity || 1.0;
        const flick = Math.sin(t * 2 + gf.x) * (4 * boostMult);

        drawFlame(gf.x, gY, 20 * boostMult, 30 * boostMult, gf.x * 0.07, Math.min(1, gf.life / 30));

        if (gf.boostIntensity > 1.0) gf.boostIntensity *= 0.98;
      });

      groundFlames = groundFlames.filter(gf => gf.life > 0 && gf.x > -20);
    }

    function drawBattlements() {
      const gY = height - groundHeight;

      battlements.forEach(b => {
        const bX = b.x;
        const bY = gY - b.height;
        const bW = b.width;

        if (bW <= 0 || bX + bW < -40 || bX > width + 40) return;

        const useP = (b.isCrushed || b.isCharred) ? charPalette : stonePalette;

        drawMasonry(bX, bY, bW, b.height, useP, b);

        ctx.fillStyle = useP.light;
        ctx.fillRect(bX, bY, bW, 3);

        const crenelW = 28;
        const crenelH = 20;
        const crenelGap = 16;
        const step = crenelW + crenelGap;

        for (let relX = 4; relX <= bW - crenelW - 4; relX += step) {
          const x = bX + relX;
          drawMasonry(x, bY - crenelH, crenelW, crenelH, useP, b);

          ctx.fillStyle = useP.light;
          ctx.fillRect(x, bY - crenelH, crenelW, 3);
          ctx.fillRect(x, bY - crenelH, 3, crenelH);

          ctx.fillStyle = useP.dark;
          ctx.fillRect(x + crenelW - 3, bY - crenelH, 3, crenelH);
        }
      });
    }

    // Level 5: every archer on screen follows one shared clock, like the siege tower's archers:
    // they rise, draw together, a "LOOSE!" shout goes up, and they all fire at once.
    const ARCHER_VOLLEY_CYCLE = 240;
    const ARCHER_VOLLEY = { reveal: 100, draw: 150, shout: 192, fire: 210, hide: 235 };
    let archerVolleyT = 0;

    function archerVolleyState(t) {
      if (t < ARCHER_VOLLEY.reveal || t >= ARCHER_VOLLEY.hide) return 'HIDDEN';
      if (t < ARCHER_VOLLEY.draw) return 'REVEALED';
      if (t < ARCHER_VOLLEY.fire) return 'GLOWING';
      return 'HOLDING';
    }

    function fireArcherArrow(archerX, bY) {
      const archerY = bY - 14;
      const dx = dragon.x - archerX;
      const dy = dragon.y - archerY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 4.2;
      arrows.push({ x: archerX, y: archerY, vx: (dx / dist) * speed, vy: (dy / dist) * speed, angle: Math.atan2(dy, dx), life: 180 });
    }

    function drawArchersAndArrows() {
      const gY = height - groundHeight;
      const volley = currentLevel >= 5;
      let volleyPhase = -1;
      if (volley) {
        if (state === 'PLAYING') archerVolleyT++;
        volleyPhase = archerVolleyT % ARCHER_VOLLEY_CYCLE;
        if (state === 'PLAYING' && volleyPhase === ARCHER_VOLLEY.fire && archers.some(a => !a.destroyed && a.battlementRef && a.battlementRef.x + a.relX > 0 && a.battlementRef.x + a.relX < width)) sound.arrowLaunch();
      }
      const shouters = [];

      archers.forEach(a => {
        const b = a.battlementRef;
        if (!b || a.destroyed) return;

        const bX = b.x;
        const bY = gY - b.height;
        const archerX = bX + a.relX;

        if (archerX < -40 || (bX + b.width) < -40) {
          a.destroyed = true;
          return;
        }

        if (state === 'PLAYING' && volley) {
          a.state = archerVolleyState(volleyPhase);
          a.isExposed = a.state !== 'HIDDEN';
          if (volleyPhase === ARCHER_VOLLEY.fire && archerX > 0 && archerX < width) fireArcherArrow(archerX, bY);
          if (volleyPhase >= ARCHER_VOLLEY.shout && volleyPhase < ARCHER_VOLLEY.hide && archerX > 10 && archerX < width - 10 && !shouters.some(s => s.b === b)) shouters.push({ b: b, x: archerX, y: bY - 14 });
        } else if (state === 'PLAYING') {
          a.timer++;
          a.cycleTimer++;

          switch (a.state) {
            case 'HIDDEN':
              a.isExposed = false;
              if (a.cycleTimer >= 220) {
                a.state = 'REVEALED';
                a.timer = 0;
                a.isExposed = true;
              }
              break;
            case 'REVEALED':
              a.isExposed = true;
              if (a.timer >= 50) {
                a.state = 'GLOWING';
                a.timer = 0;
              }
              break;
            case 'GLOWING':
              a.isExposed = true;
              if (a.timer >= 60) {
                a.state = 'HOLDING';
                a.timer = 0;
              }
              break;
            case 'HOLDING':
              a.isExposed = true;
              if (a.timer >= 25 && !a.isFiring) {
                a.isFiring = true;
                sound.arrowLaunch();

                const archerY = bY - 14;
                const dx = dragon.x - archerX;
                const dy = dragon.y - archerY;
                const dist = Math.hypot(dx, dy) || 1;
                const speed = 4.2;

                arrows.push({
                  x: archerX,
                  y: archerY,
                  vx: (dx / dist) * speed,
                  vy: (dy / dist) * speed,
                  angle: Math.atan2(dy, dx),
                  life: 180
                });
              }
              if (a.timer >= 35) {
                a.state = 'HIDDEN';
                a.timer = 0;
                a.cycleTimer = 0;
                a.isExposed = false;
                a.isFiring = false;
              }
              break;
          }
        }

        if (a.isExposed && !a.archerAwarded) {
          const archerY = bY - 14;

          flames.forEach(f => {
            if (Math.hypot(f.x - archerX, f.y - archerY) < 24) {
              a.destroyed = true;
              a.archerAwarded = true;
              gameStats.villagersKilled++;
              gameStats.archersKilled++;
              sound.knightHit();
              const scoreResult = addScore(20);
              floatingTexts.push({ x: archerX - 15, y: archerY - 20, text: 'ARCHER! +' + scoreResult.totalPts, color: '#f1c40f', alpha: 1.0, vy: -1.5 });
              
              for (let p = 0; p < 12; p++) {
                particles.push({
                  x: archerX,
                  y: archerY,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  size: 3 + Math.random() * 3,
                  life: 25,
                  color: '#e74c3c'
                });
              }
            }
          });
        }

        if (a.destroyed) return;

        ctx.save();
        ctx.translate(archerX, bY - 14);

        {
          let pose = 'hidden';
          if (a.isExposed) pose = a.state === 'REVEALED' ? 'alert' : (a.state === 'GLOWING' ? 'draw' : 'hold');
          if (pose === 'hidden') ctx.translate(0, -10);
          drawArcherDetail(pose, Date.now() / 16, false);
        }

        ctx.restore();
      });

      archers = archers.filter(a => !a.destroyed);

      // one "LOOSE!" shout per battlement during a level 5 volley
      shouters.forEach(s => drawLooseBubble(s.x, s.y));

      arrows.forEach(arr => {
        if (state === 'PLAYING') {
          arr.x += arr.vx;
          arr.y += arr.vy;
          arr.life--;

          if (arr.bounced) {
            // deflected arrow tumbles away under gravity
            arr.vy += 0.3;
            arr.angle += arr.spin;
          } else {
            const distToDragon = Math.hypot(dragon.x - arr.x, dragon.y - arr.y);
            if (distToDragon < dragon.size / 2 + 4) {
              if (dragonShielded()) {
                shieldDeflect(arr.x, arr.y);
                arr.bounced = true;
                arr.vx = Math.abs(arr.vx) * 0.5 + 2;
                arr.vy = -3.5 - Math.random() * 2.5;
                arr.spin = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.3);
                arr.life = Math.max(arr.life, 60);
              } else {
                if (!khaleesiMounted) triggerHit();
                arr.life = 0;
              }
            }
          }
        }

        ctx.save();
        ctx.translate(arr.x, arr.y);
        ctx.rotate(arr.angle);

        ctx.strokeStyle = '#784e24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();

        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath();
        ctx.moveTo(6, -3);
        ctx.lineTo(12, 0);
        ctx.lineTo(6, 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-10, -2, 3, 4);

        ctx.restore();
      });

      arrows = arrows.filter(arr => arr.life > 0 && arr.x > -40 && arr.x < width + 40 && arr.y > -40 && arr.y < height + 40);
    }


    // speech bubble matching the siege tower's "LOOSE!" shout
    function drawLooseBubble(ax, ay) {
      const bwid = 62, bh = 26;
      const bubX = Math.max(4, Math.min(width - bwid - 4, ax - bwid / 2 + 14)), bubY = ay - 64;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(bubX, bubY, bwid, bh); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + 4, bubY + bh);
      ctx.lineTo(ax, bubY + bh + 12);
      ctx.lineTo(ax + 16, bubY + bh);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax + 5, bubY + bh - 2, 10, 3);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOOSE!', bubX + bwid / 2, bubY + 18);
      ctx.restore();
    }
