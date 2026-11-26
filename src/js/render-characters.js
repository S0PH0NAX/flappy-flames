// render-characters.js — Khaleesi, mounted HUD, castle walls, collectable hearts
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function drawKhaleesiSprite(kx, ky, scale = 1.0) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.scale(scale, scale);

      // Dragon Queen Sarai: copper hair, gold circlet, green dragon-scale dress (matches sarai1/2.png)
      ctx.fillStyle = '#b8431f';
      ctx.fillRect(-6, -16, 12, 10);
      ctx.fillRect(-8, -12, 16, 6);
      ctx.fillRect(-4, -6, 8, 12);
      ctx.fillStyle = '#8a2e16';
      ctx.fillRect(-8, -8, 3, 4);

      ctx.fillStyle = '#e2a77e';
      ctx.fillRect(-4, -12, 8, 8);

      ctx.fillStyle = '#e8b33a';          // circlet with a ruby
      ctx.fillRect(-5, -13, 10, 1);
      ctx.fillStyle = '#d41f3a';
      ctx.fillRect(-1, -14, 2, 2);

      ctx.fillStyle = '#1d5c33';
      ctx.fillRect(1, -10, 2, 2);

      ctx.fillStyle = '#2f7a4f';
      ctx.fillRect(-5, -4, 10, 14);
      ctx.fillStyle = '#1f5536';
      ctx.fillRect(-6, 2, 12, 8);

      ctx.fillStyle = '#e8b33a';
      ctx.fillRect(-5, -1, 10, 2);

      ctx.restore();
    }

    function drawKhaleesis() {
      khaleesis.forEach(k => {
        if (k.rescued) return;
        const obs = k.obsRef;
        if (!obs || obs.x + obs.baseWidth < -50) return;

        if (state === 'PLAYING') {
          k.relX += k.direction * 0.15;
          if (k.relX < 4) { k.relX = 4; k.direction = 1; }
          if (k.relX > obs.width - 20) { k.relX = obs.width - 20; k.direction = -1; }

          const kx = obs.x + k.relX;
          const ky = obs.bottomY - 14;
          const dist = Math.hypot(dragon.x - kx, dragon.y - ky);

          if (dist < dragon.size / 2 + 18) {
            k.rescued = true;
            khaleesiMounted = true;
            showKhaleesiSplash();
            khaleesiTimer = KHALEESI_MAX_TIME;
            gameStats.khaleesiRescues++;
            
            lives = maxLives;
            updateHeartsDisplay();
            const scoreResult = addScore(500);

            sound.powerup();

            floatingTexts.push({
              x: Math.max(8, dragon.x - 30),
              y: dragon.y - 60,
              text: 'DRAGON QUEEN SARAI!',
              color: '#f6b93b',
              alpha: 1.0,
              vy: -1.8
            });
            floatingTexts.push({
              x: Math.max(8, dragon.x - 30),
              y: dragon.y - 32,
              text: '+' + scoreResult.totalPts + ' (' + scoreResult.multiplier + 'x Combo!)',
              color: '#f6b93b',
              alpha: 1.0,
              vy: -1.8
            });
          }
        }

        const kx = obs.x + k.relX;
        const ky = obs.bottomY - 14;

        // a bright, pulsing white-gold halo so her red hair stands out against the stone
        const now = Date.now();
        const glowRadius = 30 + Math.sin(now / 150) * 6;
        const radial = ctx.createRadialGradient(kx, ky - 6, 2, kx, ky - 6, glowRadius);
        radial.addColorStop(0, 'rgba(255, 252, 230, 0.95)');
        radial.addColorStop(0.35, 'rgba(255, 220, 120, 0.7)');
        radial.addColorStop(0.7, 'rgba(246, 185, 59, 0.3)');
        radial.addColorStop(1, 'rgba(246, 185, 59, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';   // additive, so it really lights up the dark stone
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(kx, ky - 6, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // twinkling sparkles circling her
        for (let s = 0; s < 4; s++) {
          const a = now / 600 + s * Math.PI / 2;
          const tw = 0.5 + 0.5 * Math.sin(now / 90 + s * 1.7);
          const sx = kx + Math.cos(a) * 20, sy = ky - 8 + Math.sin(a) * 14;
          const r = 1.5 + tw * 2.5;
          ctx.fillStyle = `rgba(255, 255, 240, ${0.4 + tw * 0.6})`;
          ctx.fillRect(sx - r, sy - 0.75, r * 2, 1.5);
          ctx.fillRect(sx - 0.75, sy - r, 1.5, r * 2);
        }

        drawKhaleesiSprite(kx, ky);
      });

      khaleesis = khaleesis.filter(k => !k.rescued && k.obsRef && k.obsRef.x + k.obsRef.width > -50);
    }

    function renderMountedKhaleesiHUD() {
      hudBubbleBottom = 0;
      const pSize = 64;
      const pX = 15;
      const pY = 15;

      const renderBubbleBelow = (textString, isMountedSubtitle = false) => {
        ctx.save();
        ctx.font = 'bold 15px "Proxima Nova", sans-serif';
        
        const rawWords = textString.replace(/"/g, '').split(' ');
        const lines = [];
        let currentLine = '';
        const maxTextWidth = width * 0.76;

        for (let i = 0; i < rawWords.length; i++) {
          let testLine = currentLine ? (currentLine + ' ' + rawWords[i]) : rawWords[i];
          if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
            lines.push(currentLine);
            currentLine = rawWords[i];
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        let longestLineW = 0;
        lines.forEach(l => {
          const w = ctx.measureText(l).width;
          if (w > longestLineW) longestLineW = w;
        });

        const bPaddingX = 14;
        const bPaddingY = 10;
        const lineH = 20;
        const bW = Math.max(160, longestLineW + (bPaddingX * 2));
        const bH = (lines.length * lineH) + (bPaddingY * 2);

        const bX = Math.min(width - bW - 15, pX);
        const bY = pY + pSize + 14;
        hudBubbleBottom = bY + bH;

        ctx.fillStyle = '#ffffff';

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bX, bY, bW, bH, 10);
        } else {
          ctx.fillRect(bX, bY, bW, bH);
        }
        ctx.fill();

        ctx.fillStyle = isMountedSubtitle ? '#d63031' : '#000000';
        ctx.font = 'bold 15px "Proxima Nova", sans-serif';
        ctx.textAlign = 'center';

        lines.forEach((l, idx) => {
          ctx.fillText(l, bX + (bW / 2), bY + bPaddingY + 14 + (idx * lineH));
        });

        ctx.restore();
      };

      if (khaleesiMounted) {
        const activeFrame = (Math.floor(Date.now() / 5000) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;

        ctx.fillStyle = '#11161d';
        ctx.fillRect(pX, pY, pSize, pSize);

        if (activeFrame.complete && activeFrame.naturalWidth !== 0) {
          ctx.drawImage(activeFrame, pX, pY, pSize, pSize);
        }

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f1c40f';
        ctx.strokeRect(pX, pY, pSize, pSize);

        renderBubbleBelow('BREAK EVERY CHAIN!', true);
      } else if (khaleesiBannerTimer > 0) {
        khaleesiBannerTimer--;
        const activeFrame = (Math.floor(Date.now() / 300) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;

        ctx.fillStyle = '#11161d';
        ctx.fillRect(pX, pY, pSize, pSize);

        if (activeFrame.complete && activeFrame.naturalWidth !== 0) {
          ctx.drawImage(activeFrame, pX, pY, pSize, pSize);
        }

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f1c40f';
        ctx.strokeRect(pX, pY, pSize, pSize);

        renderBubbleBelow(khaleesiBannerText, false);
      }
    }

    function drawCastleWalls(obs) {
      const gY = height - groundHeight;
      
      let pBottom;
      if (obs.isCharred || obs.charProgress > 0) { pBottom = charPalette; }
      else { pBottom = stonePalette; }

      let pTop;
      if (obs.topIsCharred) { pTop = charPalette; }
      else { pTop = stonePalette; }

      const drawStoneRect = (rx, ry, rw, rh, useP) => {
        drawMasonry(rx, ry, rw, rh, useP, obs);

        ctx.fillStyle = useP.light;
        ctx.fillRect(rx, ry, rw, 3);
        ctx.fillRect(rx, ry, 3, rh);

        ctx.fillStyle = useP.dark;
        ctx.fillRect(rx + rw - 3, ry, 3, rh);
      };

      const drawLevelTorch = (tx, ty) => {
        ctx.fillStyle = '#111';
        ctx.fillRect(tx - 3, ty + 6, 6, 8);
        ctx.fillRect(tx - 1, ty + 14, 2, 6);

        let glowColor = 'rgba(46, 204, 113, 0.45)';
        let flameMain = '#2ecc71';
        let flameCore = '#abebc6';

        if (currentLevel === 1) {
          glowColor = 'rgba(52, 152, 219, 0.45)';
          flameMain = '#3498db';
          flameCore = '#a9cce3';
        } else if (currentLevel === 4) {
          glowColor = 'rgba(155, 89, 230, 0.5)';
        } else if (currentLevel >= 5) {
          glowColor = 'rgba(255, 215, 120, 0.5)';
        } else if (currentLevel >= 3) {
          glowColor = 'rgba(231, 76, 60, 0.45)';
          flameMain = '#e74c3c';
          flameCore = '#f9e79f';
        }

        const glow = ctx.createRadialGradient(tx, ty, 2, tx, ty, 26);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(tx, ty, 26, 0, Math.PI * 2);
        ctx.fill();

        const torchPal = currentLevel === 1 ? FLAME_PAL_BLUE : (currentLevel === 2 ? FLAME_PAL_GREEN : (currentLevel === 4 ? FLAME_PAL_VIOLET : (currentLevel >= 5 ? FLAME_PAL_GOLD : FLAME_PAL_FIRE)));
        drawFlame(tx, ty + 6, 14, 26, tx * 0.31, 1, torchPal);
      };

      const drawArchedWindow = (wx, wy) => {
        const ww = 32;
        const wh = 54;

        ctx.fillStyle = '#e67e22';
        ctx.fillRect(wx, wy + 14, ww, wh - 14);
        ctx.beginPath();
        ctx.arc(wx + ww / 2, wy + 14, ww / 2, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(wx + 3, wy + 16, ww - 6, wh - 18);

        ctx.strokeStyle = '#141d26';
        ctx.lineWidth = 3;
        ctx.strokeRect(wx, wy + 14, ww, wh - 14);
        ctx.beginPath();
        ctx.arc(wx + ww / 2, wy + 14, ww / 2, Math.PI, 0);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e2b37';
        
        ctx.beginPath();
        ctx.arc(wx + 8, wy + 26, 8, Math.PI, 0);
        ctx.arc(wx + 24, wy + 26, 8, Math.PI, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy + 6);
        ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx + 3, wy + 34);
        ctx.lineTo(wx + ww - 3, wy + 34);
        ctx.stroke();

        ctx.fillStyle = '#1e2b37';
        ctx.beginPath();
        ctx.arc(wx + ww / 2, wy + 14, 3, 0, Math.PI * 2);
        ctx.fill();
      };

      drawStoneRect(obs.x, 0, obs.width, obs.topHeight - 12, pTop);
      drawStoneRect(obs.x - 6, obs.topHeight - 12, obs.width + 12, 12, pTop);
      if (obs.topHeight > 90) {
        drawArchedWindow(obs.x + obs.width / 2 - 16, obs.topHeight / 2 - 28);
        if (obs.width > 80) {
          drawLevelTorch(obs.x + 10, obs.topHeight / 2);
          drawLevelTorch(obs.x + obs.width - 10, obs.topHeight / 2);
        }
      }

      const bHeight = gY - obs.bottomY;
      if (bHeight > 0) {
        drawStoneRect(obs.x - 6, obs.bottomY, obs.width + 12, 12, pBottom);
        drawStoneRect(obs.x, obs.bottomY + 12, obs.width, bHeight - 12, pBottom);
        
        if (obs.charProgress > 0 && !obs.isCharred) {
          ctx.save();
          const charredH = bHeight * obs.charProgress;
          
          ctx.beginPath();
          ctx.rect(obs.x - 6, obs.bottomY, obs.width + 12, bHeight);
          ctx.clip();
          
          ctx.fillStyle = 'rgba(5, 7, 10, 0.75)';
          ctx.fillRect(obs.x - 6, obs.bottomY, obs.width + 12, charredH);
          ctx.restore();
        }

        let archTopY = 9999;
        if (obs.hasLargeArch && bHeight > 60) {
          const maxArchWidth = obs.width * 0.5;
          const archWidth = Math.min(maxArchWidth, 110);
          const archRadius = archWidth / 2;
          const archX = obs.x + obs.width / 2 - archRadius;

          const maxAllowedHeight = bHeight * 0.75;
          const desiredArchHeight = 120;
          const archHeight = Math.min(desiredArchHeight, maxAllowedHeight - archRadius, bHeight - 20);

          if (archHeight > 10) {
            const archCenterY = obs.bottomY + bHeight - archHeight;
            archTopY = archCenterY - archRadius;

            drawWoodenDoor(archX, archCenterY, archWidth, archRadius, archHeight, pBottom === charPalette, obs);
          }
        }

        if (bHeight > 90) {
          const winY = obs.bottomY + 28;
          if (winY + 54 < archTopY - 10) {
            drawArchedWindow(obs.x + obs.width / 2 - 16, winY);
            if (obs.width > 80) {
              drawLevelTorch(obs.x + 10, obs.bottomY + bHeight / 2);
              drawLevelTorch(obs.x + obs.width - 10, obs.bottomY + bHeight / 2);
            }
          }
        }

        if (obs.hasRubble) {
          ctx.fillStyle = pBottom.dark;

          ctx.beginPath();
          ctx.moveTo(obs.x - 45, gY);
          ctx.lineTo(obs.x - 8, gY - 42);
          ctx.lineTo(obs.x + 32, gY);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width - 28, gY);
          ctx.lineTo(obs.x + obs.width + 12, gY - 48);
          ctx.lineTo(obs.x + obs.width + 50, gY);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = pBottom.main;
          ctx.fillRect(obs.x - 36, gY - 20, 22, 16);
          ctx.fillRect(obs.x - 18, gY - 12, 18, 12);
          ctx.fillRect(obs.x + obs.width + 14, gY - 24, 24, 18);
          ctx.fillRect(obs.x + obs.width + 30, gY - 12, 16, 12);

          ctx.fillStyle = '#0f171e';
          ctx.fillRect(obs.x - 30, gY - 18, 10, 2);
          ctx.fillRect(obs.x + obs.width + 20, gY - 20, 12, 2);
        }

        const t = Date.now() / 180;
        
        obs.surfaceFlames.forEach(sf => {
          if (sf.width < sf.maxWidth) sf.width += 0.45;
          if (sf.height < sf.maxHeight) sf.height += 0.55;
          sf.relX += sf.spreadSpeed;

          if (sf.relX < 0) sf.relX = 0;
          if (sf.relX > obs.width) sf.relX = obs.width;

          const baseFx = obs.x + sf.relX;
          const currentFlameY = obs.bottomY + (bHeight * obs.charProgress);

          drawFlame(baseFx, currentFlameY, sf.width, sf.height, baseFx * 0.37);
        });
      }
    }

    const HEART_DRIFT_DELAY = 240;   // frames before a floating heart starts drifting up like a balloon

    function drawCollectableHearts() {
      const now = Date.now();
      const scrollSpeed = getLevelScrollSpeed();

      collectableHearts.forEach((h) => {
        if (h.collected) return;

        const worldStep = scrollSpeed * (khaleesiMounted ? 2.2 : 1.0);
        h.x -= worldStep;
        h.bobPhase += 0.05;
        // after a while the heart slips its mooring and floats up through the castle like a balloon
        h.age = (h.age || 0) + 1;
        const drifting = h.age > HEART_DRIFT_DELAY;
        if (drifting && (state === 'PLAYING' || state === 'LEVEL_CELEBRATE')) {
          const ease = Math.min(1, (h.age - HEART_DRIFT_DELAY) / 90);
          h.x += worldStep * 0.55 * ease;            // lags behind the scrolling towers
          h.baseY -= 0.5 * ease;                     // rises slowly
        }
        h.y = h.baseY + Math.sin(h.bobPhase) * (drifting ? 4 : 8);
        const swayX = drifting ? Math.sin(h.bobPhase * 0.7) * 3 : 0;

        ctx.save();
        ctx.translate(h.x + swayX, h.y);
        if (drifting) ctx.rotate(Math.sin(h.bobPhase * 0.7) * 0.12);

        const glowRadius = 24 + Math.sin(now / 150) * 4;
        const radial = ctx.createRadialGradient(0, 0, 4, 0, 0, glowRadius);
        radial.addColorStop(0, 'rgba(235, 77, 75, 0.85)');
        radial.addColorStop(0.5, 'rgba(235, 77, 75, 0.35)');
        radial.addColorStop(1, 'rgba(235, 77, 75, 0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        const hSize = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, -5 * hSize);
        ctx.bezierCurveTo(-6 * hSize, -15 * hSize, -16 * hSize, -6 * hSize, -14 * hSize, 2 * hSize);
        ctx.bezierCurveTo(-12 * hSize, 10 * hSize, -4 * hSize, 16 * hSize, 0, 20 * hSize);
        ctx.bezierCurveTo(4 * hSize, 16 * hSize, 12 * hSize, 10 * hSize, 14 * hSize, 2 * hSize);
        ctx.bezierCurveTo(16 * hSize, -6 * hSize, 6 * hSize, -15 * hSize, 0, -5 * hSize);
        ctx.closePath();

        ctx.fillStyle = '#ff2052';
        ctx.fill();

        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#a40021';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-7 * hSize, -5 * hSize, 3 * hSize, 4 * hSize);
        ctx.fillRect(-4 * hSize, -8 * hSize, 3 * hSize, 3 * hSize);

        ctx.restore();
      });

      collectableHearts = collectableHearts.filter(h => !h.collected && h.x > -40 && h.y > -60);
    }


    // Arched wooden castle door in a stone frame (replaces the old open archways).
    function drawWoodenDoor(x, archCenterY, w, r, archHeight, charred, owner) {
      const top = archCenterY - r, bottom = archCenterY + archHeight;
      const cxm = x + r;
      const base = charred ? '#2a1a10' : (currentLevel === 4 ? '#7a1220' : '#6b4423');
      const seed = owner && owner.brickSeed !== undefined ? owner.brickSeed : 7;
      const doorPath = () => {
        ctx.beginPath();
        ctx.arc(cxm, archCenterY, r, Math.PI, 0);
        ctx.lineTo(x + w, bottom);
        ctx.lineTo(x, bottom);
        ctx.closePath();
      };

      // stone surround: voussoirs around the arch and blocks down the jambs
      ctx.save();
      const frame = 7;
      for (let i = 0; i < 9; i++) {
        const a0 = Math.PI + (i / 9) * Math.PI, a1 = Math.PI + ((i + 1) / 9) * Math.PI;
        ctx.beginPath();
        ctx.arc(cxm, archCenterY, r + frame, a0, a1);
        ctx.arc(cxm, archCenterY, r, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = charred ? (i % 2 ? '#141a20' : '#1b232b') : (i === 4 ? '#5c7690' : (i % 2 ? '#3e5871' : '#4a6580'));
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      }
      for (let y = archCenterY, j = 0; y < bottom; y += 12, j++) {
        const hh = Math.min(12, bottom - y);
        ctx.fillStyle = charred ? '#161d24' : (j % 2 ? '#3e5871' : '#4a6580');
        ctx.fillRect(x - frame, y, frame - 1, hh - 1);
        ctx.fillRect(x + w + 1, y, frame - 1, hh - 1);
      }

      // the door itself
      doorPath();
      ctx.save();
      ctx.clip();
      const wg = ctx.createLinearGradient(x, 0, x + w, 0);
      wg.addColorStop(0, shadeHex(base, -30));
      wg.addColorStop(0.5, base);
      wg.addColorStop(1, shadeHex(base, -40));
      ctx.fillStyle = wg;
      ctx.fillRect(x, top, w, bottom - top);
      // planks with seams and grain
      const plankW = Math.max(8, w / Math.max(3, Math.round(w / 11)));
      for (let px = x, i = 0; px < x + w; px += plankW, i++) {
        ctx.fillStyle = 'rgba(' + (hash2(i, seed) < 0.5 ? '255,220,170,' : '0,0,0,') + (0.04 + hash2(seed, i) * 0.07) + ')';
        ctx.fillRect(px, top, plankW, bottom - top);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(px, top, 1.5, bottom - top);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let gy = top + 6 + hash2(i, 3) * 10; gy < bottom; gy += 14 + hash2(i, gy | 0) * 10) ctx.fillRect(px + 3, gy, plankW - 6, 1);
      }
      // shadow under the arch
      const sg = ctx.createLinearGradient(0, top, 0, top + r * 0.9);
      sg.addColorStop(0, 'rgba(0,0,0,0.45)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(x, top, w, r);
      ctx.restore();

      // iron straps with strap hinges and rivets
      const iron = charred ? '#0c0f12' : '#2b3138';
      const strapYs = [archCenterY + 4, archCenterY + archHeight * 0.45, bottom - 12].filter(y => y < bottom - 4);
      strapYs.forEach((sy, i) => {
        ctx.fillStyle = iron;
        ctx.fillRect(x, sy, w * (i === 1 ? 1 : 0.72), 5);
        ctx.beginPath(); ctx.arc(x + w * (i === 1 ? 1 : 0.72), sy + 2.5, 3.5, -Math.PI / 2, Math.PI / 2); ctx.fill();
        ctx.fillStyle = '#7d8a96';
        for (let rx = x + 4; rx < x + w * (i === 1 ? 1 : 0.72) - 2; rx += 9) ctx.fillRect(rx, sy + 1.5, 2, 2);
      });
      // barred peephole near the top
      if (r > 18) {
        ctx.fillStyle = '#0b0b0f';
        ctx.fillRect(cxm - 6, archCenterY - r * 0.45, 12, 9);
        ctx.fillStyle = iron;
        ctx.fillRect(cxm - 2.5, archCenterY - r * 0.45, 1.5, 9); ctx.fillRect(cxm + 1, archCenterY - r * 0.45, 1.5, 9);
      }
      // ring handle
      const hy = archCenterY + archHeight * 0.62;
      ctx.strokeStyle = charred ? '#2a2f34' : '#c9a54a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + w * 0.78, hy, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = iron;
      ctx.fillRect(x + w * 0.78 - 2, hy - 6, 4, 3);

      // outline of the opening
      doorPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (charred && Math.random() < 0.05) {
        particles.push({ x: x + Math.random() * w, y: archCenterY + Math.random() * archHeight, vx: 0, vy: -0.6, size: 1.5, life: 20, color: '#ff8a3a' });
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------------
    // Splash when the dragon reaches Khaleesi and becomes invincible (~1.7 s)
    // ---------------------------------------------------------------------
    const KHALEESI_SPLASH_FRAMES = 60;   // one second; the game is frozen while it shows
    let khaleesiSplash = null;

    function showKhaleesiSplash() { khaleesiSplash = { t: 0, frozen: null }; }

    // snapshot of the game screen taken the frame the splash starts, shown underneath it
    function freezeFrameForSplash() {
      if (!khaleesiSplash || khaleesiSplash.frozen || logicOnlyPass) return;   // snapshot a frame that was really drawn
      const c = document.createElement('canvas');
      c.width = canvas.width; c.height = canvas.height;
      c.getContext('2d').drawImage(canvas, 0, 0);
      khaleesiSplash.frozen = c;
    }

    function drawKhaleesiSplash() {
      const s = khaleesiSplash;
      if (!s) return;
      s.t++;
      const p = s.t / KHALEESI_SPLASH_FRAMES;
      if (p >= 1) { khaleesiSplash = null; return; }
      const fade = p < 0.1 ? p / 0.1 : (p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1);
      const cx = width / 2, cy = height * 0.42;
      const rainbow = ['#ff5e5e', '#ffb84d', '#fff35e', '#5eff8a', '#5ed6ff', '#b45eff'];
      ctx.save();
      ctx.globalAlpha = fade;

      // dark backdrop with spinning rainbow rays
      ctx.fillStyle = 'rgba(8, 6, 20, 0.72)';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI / 9 + s.t * 0.025;
        ctx.fillStyle = rainbow[i % rainbow.length];
        ctx.globalAlpha = fade * 0.22;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a - 0.08) * height, cy + Math.sin(a - 0.08) * height);
        ctx.lineTo(cx + Math.cos(a + 0.08) * height, cy + Math.sin(a + 0.08) * height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = fade;

      // portrait zooms in, alternating between her two frames
      const zoom = p < 0.15 ? 0.6 + (p / 0.15) * 0.48 : (p < 0.25 ? 1.08 - ((p - 0.15) / 0.1) * 0.08 : 1);
      const size = Math.min(width * 0.5, height * 0.3) * zoom;
      const img = khaleesiFrame1;
      const glow = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 0.95);
      glow.addColorStop(0, 'rgba(255,255,255,0.55)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
      ctx.fillStyle = '#11161d';
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      if (img.complete && img.naturalWidth !== 0) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      ctx.lineWidth = 6;
      ctx.strokeStyle = rainbow[Math.floor(s.t / 4) % rainbow.length];
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f1c40f';
      ctx.strokeRect(cx - size / 2 - 6, cy - size / 2 - 6, size + 12, size + 12);

      // titles
      ctx.textAlign = 'center';
      fitFont('DRAGON QUEEN SARAI RIDES!', 30, width - 24);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#2a0a3a';
      ctx.strokeText('DRAGON QUEEN SARAI RIDES!', cx, cy - size / 2 - 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('DRAGON QUEEN SARAI RIDES!', cx, cy - size / 2 - 22);
      const bounce = Math.sin(s.t * 0.3) * 3;
      ctx.font = 'bold 36px "Proxima Nova", sans-serif';
      const tg = ctx.createLinearGradient(cx - 120, 0, cx + 120, 0);
      rainbow.forEach((c, i) => tg.addColorStop(i / (rainbow.length - 1), c));
      ctx.strokeText('INVINCIBLE!', cx, cy + size / 2 + 46 + bounce);
      ctx.fillStyle = tg;
      ctx.fillText('INVINCIBLE!', cx, cy + size / 2 + 46 + bounce);
      ctx.font = 'bold 15px "Proxima Nova", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Smash everything in your path!', cx, cy + size / 2 + 72 + bounce);
      ctx.restore();
    }
