// render-enemies.js — Trebuchets, boulders, knights
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function drawTrebuchetsAndBoulders() {
      const gY = height - groundHeight;
      const scrollSpeed = getLevelScrollSpeed();

      trebuchets.forEach(t => {
        if (state === 'PLAYING') {
          t.x -= scrollSpeed * (khaleesiMounted ? 2.2 : 1.0);

          t.shootCooldown--;
          if (t.shootCooldown <= 0 && t.x > 50 && t.x < width - 10) {
            t.shootCooldown = 80 + Math.random() * 50;
            t.isFiringAnim = true;
            sound.boulderLaunch();

            const launchX = t.x - 20;
            const launchY = gY - 45;
            const targetY = dragon.y;
            const dy = targetY - launchY;
            const dx = dragon.x - launchX;

            const vx = Math.min(-4.0, Math.max(-7.5, dx * 0.025));
            const vy = Math.min(-4.5, Math.max(-9.0, dy * 0.025 - 4.0));

            trebuchetBoulders.push({
              x: launchX,
              y: launchY,
              vx: vx,
              vy: vy,
              gravity: 0.16,
              radius: 9,
              life: 160
            });
          }

          if (t.isFiringAnim) {
            t.armAngle += 0.25;
            if (t.armAngle >= 1.2) {
              t.armAngle = -0.4;
              t.isFiringAnim = false;
            }
          }

          obstacles.forEach(obs => {
            if (obs.isCharred || obs.charProgress > 0) {
              const obsRight = obs.x + obs.width;
              const obsLeft = obs.x;
              if (Math.abs(t.x - obsRight) < 120 || Math.abs(t.x - obsLeft) < 120) {
                t.destroyed = true;
                gameStats.trebuchetsDestroyed++;
                sound.knightHit();
                const scoreResult = addScore(10);
                floatingTexts.push({ x: t.x - 10, y: gY - 50, text: '+' + scoreResult.totalPts + (khaleesiMounted ? ' (' + scoreResult.multiplier + 'x)' : ''), color: '#ff9f43', alpha: 1.0, vy: -1.5 });

                for (let p = 0; p < 16; p++) {
                  particles.push({
                    x: t.x,
                    y: gY - 20,
                    vx: (Math.random() - 0.5) * 10,
                    vy: -Math.random() * 8,
                    size: 4 + Math.random() * 5,
                    life: 35,
                    color: Math.random() < 0.5 ? '#5c3d1e' : '#ff7675'
                  });
                }
              }
            }
          });

          flames.forEach(f => {
            const dist = Math.hypot(f.x - t.x, f.y - (gY - 25));
            if (dist < 34) {
              sound.knightHit();
              t.destroyed = true;
              gameStats.trebuchetsDestroyed++;
              const scoreResult = addScore(10);
              floatingTexts.push({ x: t.x - 10, y: gY - 50, text: '+' + scoreResult.totalPts + (khaleesiMounted ? ' (' + scoreResult.multiplier + 'x)' : ''), color: '#ff9f43', alpha: 1.0, vy: -1.5 });

              for (let p = 0; p < 16; p++) {
                particles.push({
                  x: t.x,
                  y: gY - 20,
                  vx: (Math.random() - 0.5) * 10,
                  vy: -Math.random() * 8,
                  size: 4 + Math.random() * 5,
                  life: 35,
                  color: Math.random() < 0.5 ? '#5c3d1e' : '#ff7675'
                });
              }
            }
          });
        }

        if (t.destroyed) return;

        ctx.save();
        ctx.translate(t.x, gY);

        const wheelRot = -t.x * 0.08;
        const drawWheel = (wx) => {
          ctx.save();
          ctx.translate(wx, -10);
          ctx.rotate(wheelRot);

          ctx.fillStyle = '#2c3e50';
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#7f8c8d';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#7f8c8d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
          ctx.moveTo(0, -9); ctx.lineTo(0, 9);
          ctx.stroke();

          ctx.restore();
        };

        drawWheel(-22);
        drawWheel(22);

        ctx.fillStyle = '#5c3d1e';
        ctx.fillRect(-28, -20, 56, 10);
        ctx.fillStyle = '#3d2612';
        ctx.fillRect(-24, -18, 48, 6);

        ctx.fillStyle = '#784e24';
        ctx.beginPath();
        ctx.moveTo(-22, -20);
        ctx.lineTo(-4, -48);
        ctx.lineTo(4, -48);
        ctx.lineTo(22, -20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4a2f13';
        ctx.fillRect(-4, -48, 8, 28);

        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.arc(0, -46, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(0, -46);
        ctx.rotate(t.armAngle);

        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(-8, -4, 46, 8);
        ctx.fillRect(-24, -6, 18, 12);

        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-32, 2, 18, 18);

        if (!t.isFiringAnim) {
          ctx.strokeStyle = '#bdc3c7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(38, 0);
          ctx.lineTo(48, 10);
          ctx.stroke();

          ctx.fillStyle = '#7f8c8d';
          ctx.beginPath();
          ctx.arc(48, 10, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        ctx.restore();
      });

      trebuchets = trebuchets.filter(t => !t.destroyed && t.x > -60);

      trebuchetBoulders.forEach(b => {
        if (state === 'PLAYING') {
          b.x += b.vx;
          b.y += b.vy;
          b.vy += b.gravity;
          b.life--;

          if (Math.random() < 0.4) {
            particles.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              size: 3 + Math.random() * 3,
              life: 15,
              color: '#e74c3c'
            });
          }
        }

        ctx.save();
        ctx.translate(b.x, b.y);

        const glowRadius = b.radius + 6;
        const radial = ctx.createRadialGradient(0, 0, 2, 0, 0, glowRadius);
        radial.addColorStop(0, 'rgba(241, 196, 15, 0.8)');
        radial.addColorStop(0.6, 'rgba(231, 76, 60, 0.4)');
        radial.addColorStop(1, 'rgba(231, 76, 60, 0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(-2, -2, b.radius * 0.4, 0, Math.PI * 2);
        ctx.arc(3, 2, b.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      trebuchetBoulders = trebuchetBoulders.filter(b => b.life > 0 && b.y < gY + 10 && b.x > -50);
    }

    function drawKnights() {
      const time = Date.now() / 900;
      const gY = height - groundHeight;

      knights.forEach((k) => {
        const obs = k.obsRef;
        // a royal you missed scrolls off the left edge: silence their entrance sound
        if (k.isRoyal && k.state === 'ALIVE' && !k.soundStopped && (!obs || obs.x + k.relX < -24)) {
          k.soundStopped = true;
          sound.stopRoyalSounds();
        }
        if (!obs || obs.x + obs.baseWidth < -50) return;

        if (k.state === 'FALLING') {
          k.fallVelocityY += 0.48;
          k.fallYOffset += k.fallVelocityY;
          k.relX += k.knockbackVelocity;
          k.rotation += 0.12 * Math.sign(k.knockbackVelocity || 1);

          const currentY = obs.bottomY - 26 + k.fallYOffset;
          if (currentY >= gY - 26) {
            if (!k.pointAwarded) {
              k.pointAwarded = true;
              gameStats.villagersKilled++;
              const scoreResult = addScore(2);
              sound.knightHit();
              floatingTexts.push({ x: obs.x + k.relX, y: gY - 10, text: '+' + scoreResult.totalPts + (khaleesiMounted ? ' (' + scoreResult.multiplier + 'x)' : ''), alpha: 1.0, vy: -1.2 });
            }
            k.state = 'DEAD_ON_GROUND';
          }
        } else {
          if (Math.abs(k.knockbackVelocity) > 0.05) {
            k.relX += k.knockbackVelocity;
            k.knockbackVelocity *= 0.88;

            if (k.relX < -12 || k.relX > obs.width + 12) {
              k.state = 'FALLING';
              k.fallVelocityY = -2.5;
            }
          } else if (k.stunTimer > 0) {
            k.stunTimer--;
          } else if (k.state === 'ALIVE') {
            k.relX += k.direction * 0.2;
            if (k.relX < 6) { k.relX = 6; k.direction = 1; }
            if (k.relX > obs.width - 26) { k.relX = obs.width - 26; k.direction = -1; }
          }
        }

        const kx = obs.x + k.relX;
        const ky = obs.bottomY - 26 + k.fallYOffset;

        if (k.state === 'ALIVE' && k.isRoyal && state === 'PLAYING') {
          const dist = Math.hypot(dragon.x - kx, dragon.y - ky);
          if (dist < dragon.size / 2 + 18) {
            k.state = 'BEHEADED';
            triggerBeheadingCutscene(k.royalType);
            return;
          }
        }

        // invincible (Khaleesi riding): villagers touched by the dragon go flying
        if (k.state === 'ALIVE' && !k.isRoyal && khaleesiMounted && state === 'PLAYING' &&
            Math.hypot(dragon.x - (kx + 11), dragon.y - (ky + 10)) < dragon.size / 2 + 14) {
          k.state = 'FALLING';
          k.fallVelocityY = -4;
          k.knockbackVelocity = (kx + 11 >= dragon.x ? 1 : -1) * 7;
          sound.bonk();
        }

        const hasFireOnKnight = k.state === 'ALIVE' && (obs.isCharred || obs.charProgress > 0 || obs.surfaceFlames.some(sf => Math.abs((obs.x + sf.relX) - kx) < 24));

        if (hasFireOnKnight) {
          k.state = 'BURNING';
          if (k.isRoyal) {
            sound.stopRoyalSounds();
            resetScoreToZero();
          } else if (!k.pointAwarded) {
            k.pointAwarded = true;
            gameStats.villagersKilled++;
            const scoreResult = addScore(2);
            sound.knightHit();
            floatingTexts.push({ x: kx + 4, y: ky - 8, text: '+' + scoreResult.totalPts + (khaleesiMounted ? ' (' + scoreResult.multiplier + 'x)' : ''), alpha: 1.0, vy: -1.2 });
          }
        }

        if (k.state === 'FALLING') {
          ctx.save();
          ctx.translate(kx + 10, ky + 14);
          ctx.rotate(k.rotation);
          ctx.translate(-11, -10);
          if (k.isRoyal) drawRoyalSprite(k, 0);
          else drawVillagerSprite(k, 2, -3);
          ctx.restore();
          return;
        }

        if (k.state === 'DEAD_ON_GROUND') {
          // body lying on its back in the grass
          ctx.save();
          ctx.translate(kx + 10, gY - 6);
          ctx.rotate(-Math.PI / 2);
          ctx.scale(0.75, 0.75);
          ctx.translate(-11, -9);
          ctx.globalAlpha = 0.85;
          if (k.isRoyal) drawRoyalSprite(k, 0);
          else drawVillagerSprite(k, 0, 0);
          ctx.restore();
          return;
        }

        if (k.state === 'ALIVE') {
          const isStunned = k.stunTimer > 0;
          const isRoyal = k.isRoyal;

          if (isRoyal) {
            const bob = isStunned ? 0 : Math.abs(Math.sin(time * 2 + kx * 0.1)) * -1;
            withFacing(kx, ky, k.direction, () => drawRoyalSprite(k, bob));
          } else {
            const legMove = isStunned ? 0 : Math.sin(time * 2 + kx) * 1.5;
            const armSwing = isStunned ? 0 : Math.sin(time * 2 + kx + 1.2) * 1.5;
            withFacing(kx, ky, k.direction, () => drawVillagerSprite(k, legMove, armSwing));
          }
        } else if (k.state === 'BURNING') {
          k.burnTimer++;
          ctx.fillStyle = 'rgba(18,22,28,' + Math.max(0, 0.9 - k.burnTimer / 45) + ')';
          ctx.fillRect(kx, ky - 2, 22, 28);
          const grow = Math.min(1, 0.4 + k.burnTimer / 20);
          drawFlame(kx + 11, ky + 26, 28 * grow, 50 * grow, kx * 0.2);
          drawFlame(kx + 2, ky + 26, 14 * grow, 26 * grow, kx * 0.2 + 2);
          drawFlame(kx + 20, ky + 26, 14 * grow, 30 * grow, kx * 0.2 + 4);
          if (k.burnTimer > 35) k.state = 'ASH';
        } else if (k.state === 'ASH') {
          ctx.fillStyle = '#34495e';
          ctx.fillRect(kx, ky + 20, 22, 5);
        }
      });
    }

    // ==========================================
    // BETTER FLAMES (shared by the whole game)
    // Layered teardrop tongues, additive blending, per-flame flicker/sway, soft glow, rising embers.
    // ==========================================
