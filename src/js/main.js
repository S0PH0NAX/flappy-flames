// main.js — Hit handling, level celebration, update() (physics/collisions), render(), main loop
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function triggerHit() {
      if (invulnerableTimer > 0 || khaleesiMounted || state === 'LEVEL_CELEBRATE') return;
      lives--;
      updateHeartsDisplay();
      sound.hit();
      invulnerableTimer = 50;

      if (lives <= 0) {
        state = 'GAMEOVER';
        showKhaleesiBanner('"DO NOT FAIL ME, SYRAXX! TRY AGAIN!"', 300);
      }
    }

    function updateLevelCelebration() {
      celebrationTimer++;
      const worldSpeedMult = 1.2;
      const scrollSpeed = getLevelScrollSpeed();
      backgroundParallaxX += 0.4 * worldSpeedMult;

      for (let i = battlements.length - 1; i >= 0; i--) {
        battlements[i].x -= scrollSpeed * worldSpeedMult;
        if (battlements[i].x + battlements[i].width < -100) battlements.splice(i, 1);
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= scrollSpeed * worldSpeedMult;
        if (obstacles[i].x + obstacles[i].width < -100) obstacles.splice(i, 1);
      }

      for (let i = trebuchets.length - 1; i >= 0; i--) {
        trebuchets[i].x -= scrollSpeed * worldSpeedMult;
        if (trebuchets[i].x < -60) trebuchets.splice(i, 1);
      }
      chestsFollowWorld(scrollSpeed * worldSpeedMult);

      celebrationAngle += 0.035;

      const centerX = width * 0.50;
      const centerY = height * 0.32;
      const loopRadiusX = 140;
      const loopRadiusY = 90;

      dragon.x = centerX + Math.cos(celebrationAngle) * loopRadiusX;
      dragon.y = centerY + Math.sin(celebrationAngle) * loopRadiusY;
      dragon.wingState = 0.9;

      const nextX = centerX + Math.cos(celebrationAngle + 0.035) * loopRadiusX;
      const nextY = centerY + Math.sin(celebrationAngle + 0.035) * loopRadiusY;

      if (celebrationTimer % 20 === 0) {
        sound.fireworks();
        sound.fireRoar();
        const fireColors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];
        const burstX = dragon.x + (Math.random() - 0.5) * 50;
        const burstY = dragon.y + (Math.random() - 0.5) * 50;

        for (let f = 0; f < 20; f++) {
          const color = fireColors[Math.floor(Math.random() * fireColors.length)];
          const angle = Math.random() * Math.PI * 2;
          const spd = 3.5 + Math.random() * 8.5;
          flames.push({
            x: burstX,
            y: burstY,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            dragX: 0.965,
            gravity: 0.07,
            size: 11 + Math.random() * 11,
            life: 90,
            maxLife: 90,
            color: color
          });
        }
      }

      if (celebrationTimer > 270) {
        celebrationFadeAlpha = Math.min(1.0, (celebrationTimer - 270) / 50.0);
      }

      if (celebrationTimer >= 330) {
        // Stop the looping fireworks sound effect
        if (sfxFireworks) {
          sfxFireworks.pause();
          sfxFireworks.currentTime = 0;
        }

        celebrationFadeAlpha = 0;
        if (levelDialogueType === 'BOSS_INTRO') { startBossIntro(); return; }
        state = 'LEVEL_DIALOGUE';
      }
    }

    function update() {
      sound.updateMusicState(state);
      sound.setRumble(currentRumbleLevel());
      updateFireButtonLock();
      updateSunnyAmbient();

      // the Khaleesi splash freezes all action until it finishes
      if (khaleesiSplash) return;

      if (state === 'PAUSED' || state === 'CUTSCENE' || state === 'LEVEL_DIALOGUE') return;

      if (state === 'CAPTURE') { updateCapture(); return; }
      if (state === 'BOSS_INTRO') { updateBossIntro(); return; }
      if (state === 'BOSS') { updateBossLogic(); return; }

      if (state === 'LEVEL_CELEBRATE') {
        updateLevelCelebration();
        return;
      }

      if (invulnerableTimer > 0) invulnerableTimer--;

      if (khaleesiMounted) {
        khaleesiTimer--;
        if (khaleesiTimer <= 0) {
          khaleesiMounted = false;
          khaleesiCombo = 0;
          showKhaleesiBanner('"I LOVE YOU ALWAYS, SYRAXX!"', 240);
        }
      }

      if (state === 'GAMEOVER') {
        if (headFadingIndex >= 0) {
          headFadeTimer--;
          if (headFadeTimer <= 0) {
            royalHeads = Math.max(0, royalHeads - 1);
            if (royalHeadTypes.length > 0) royalHeadTypes.pop();
            headFadingIndex = -1;
            lives = 3;
            updateHeartsDisplay();

            dragon.velocity = dragon.jump;
            dragon.wingState = 1.0;
            sound.flap();

            invulnerableTimer = 120;

            state = (bossState && bossState.active) ? 'BOSS' : 'PLAYING';
            sound.powerup();
          }
        }
      }

      if ((state === 'SPLASH' || state === 'CAPTURED_MSG') && !textTypingComplete) {
        typedCharIndex += 0.45;
        if (typedCharIndex >= totalCharCount) {
          typedCharIndex = totalCharCount;
          textTypingComplete = true;
        }
      }

      if (state === 'PLAYING' && inPrologue()) { updatePrologue(); return; }

      if (state === 'PLAYING') {
        levelTimerSeconds += (1 / 60);
        updateLevelBadgeUI();
        checkLevelProgression();

        const worldSpeedMult = khaleesiMounted ? 2.2 : 1.0;
        const scrollSpeed = getLevelScrollSpeed();
        backgroundParallaxX += 0.4 * worldSpeedMult;

        dragon.velocity += dragon.gravity;
        dragon.y += dragon.velocity;

        const gY = height - groundHeight;

        for (let i = battlements.length - 1; i >= 0; i--) {
          const b = battlements[i];
          b.x -= scrollSpeed * worldSpeedMult;
          if (b.x + b.width < -100) {
            battlements.splice(i, 1);
          }
        }

        battlements.forEach(b => {
          const bX = b.x;
          const bY = gY - b.height;
          const bW = b.width;

          const padding = 6;
          const dLeft = dragon.x - dragon.size / 2 + padding;
          const dRight = dragon.x + dragon.size / 2 - padding;
          const dBottom = dragon.y + dragon.size / 2 - padding;

          if (dRight > bX && dLeft < bX + bW && dBottom > bY) {
            if (khaleesiMounted) {
              if (!b.isCrushed) {
                b.isCrushed = true;
                sound.towerDestroy();
                const scoreResult = addScore(15);
                floatingTexts.push({ x: bX + bW / 2 - 20, y: bY - 15, text: 'CRUSH! +' + scoreResult.totalPts, color: '#f1c40f', alpha: 1.0, vy: -1.5 });
              }
            } else {
              obstacleHit();
            }
          }
        });

        trebuchetBoulders.forEach((boulder, idx) => {
          const dist = Math.hypot(dragon.x - boulder.x, dragon.y - boulder.y);
          if (dist < dragon.size / 2 + boulder.radius) {
            if (dragonShielded()) {
              shieldDeflect(boulder.x, boulder.y);
            } else if (!khaleesiMounted) {
              triggerHit();
            }
            for (let p = 0; p < 12; p++) {
              particles.push({
                x: boulder.x,
                y: boulder.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: 3 + Math.random() * 4,
                life: 20,
                color: Math.random() < 0.5 ? '#7f8c8d' : '#f1c40f'
              });
            }
            trebuchetBoulders.splice(idx, 1);
          }
        });

        collectableHearts.forEach(h => {
          if (!h.collected) {
            const dist = Math.hypot(dragon.x - h.x, dragon.y - h.y);
            if (dist < dragon.size / 2 + h.radius) {
              h.collected = true;
              sound.heartPickup();

              if (lives < 3) {
                lives++;
                updateHeartsDisplay();
              }

              const scoreResult = addScore(20);

              for (let p = 0; p < 12; p++) {
                particles.push({
                  x: h.x,
                  y: h.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  size: 3 + Math.random() * 3,
                  life: 25,
                  color: '#ff3838'
                });
              }

              floatingTexts.push({
                x: h.x - 20,
                y: h.y - 15,
                text: '+1 ❤️ (+' + scoreResult.totalPts + ')',
                color: '#ff4d4d',
                alpha: 1.0,
                vy: -1.6
              });
            }
          }
        });

        obstacles.forEach(obs => {
          if (!obs.isCharred && obs.surfaceFlames.length > 0) {
            let intervals = obs.surfaceFlames.map(sf => [
              Math.max(0, sf.relX - sf.width / 2),
              Math.min(obs.width, sf.relX + sf.width / 2)
            ]).sort((a, b) => a[0] - b[0]);

            let merged = [];
            intervals.forEach(curr => {
              if (!merged.length || merged[merged.length - 1][1] < curr[0]) {
                merged.push(curr);
              } else {
                merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], curr[1]);
              }
            });

            let coveredLength = merged.reduce((acc, curr) => acc + (curr[1] - curr[0]), 0);
            let isFull = coveredLength >= obs.width * 0.85;

            if (isFull) {
              obs.burnFullTimer++;
              if (obs.burnFullTimer >= 60 && !obs.isFullyIgnited) {
                obs.isFullyIgnited = true;
                sound.score();
              }
            } else {
              obs.burnFullTimer = Math.max(0, obs.burnFullTimer - 1);
            }
          }

          if (obs.charProgress > 0 && !obs.isCharred) {
              obs.charProgress += 0.006 * worldSpeedMult; 
              
              const bHeight = gY - obs.bottomY;
              const waveY = obs.bottomY + (bHeight * obs.charProgress);

              if (Math.random() < 0.6) {
                blackDebris.push({
                    x: obs.x + Math.random() * obs.width,
                    y: waveY,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 2,
                    gravity: 0.25,
                    size: 8 + Math.random() * 8,
                    life: 60,
                    rotation: Math.random() * Math.PI,
                    rotSpeed: (Math.random() - 0.5) * 0.15
                });
              }

              if (Math.random() < 0.4) {
                particles.push({
                  x: obs.x + Math.random() * obs.width,
                  y: waveY - 5,
                  vx: (Math.random() - 0.5) * 2.0,
                  vy: -Math.random() * 1.5,
                  size: 6 + Math.random() * 6,
                  life: 60,
                  color: 'rgba(10, 10, 15, 0.9)',
                  isSmoke: true
                });
              }

              if (obs.charProgress >= 1.0) {
                  obs.charProgress = 1.0;
                  obs.isCharred = true;
                  gameStats.burnedTowers++;
                  sound.towerDestroy();
              }
          }
        });

        if (isHoldingAction) {
          holdTimer++;
          if (holdTimer > 4 && holdTimer < 45) {
            dragon.vx += 0.95;
            dragon.wingState = 0.8;
            sound.whoosh();

            const shockwaveRadius = 150;

            obstacles.forEach(obs => {
              const obsCenterX = obs.x + obs.width / 2;
              const obsCenterY = obs.bottomY;
              const dist = Math.hypot(dragon.x - obsCenterX, dragon.y - obsCenterY);
              
              if (obs.isFullyIgnited && dist <= shockwaveRadius + 100 && !obs.isCharred && obs.charProgress === 0) {
                obs.charProgress = 0.01;
                sound.towerDestroy();
                
                const scoreResult = addScore(Math.round((obs.width / 80) * 20));
                floatingTexts.push({ x: obs.x + obs.width / 2 - 30, y: obs.bottomY - 30, text: '+' + scoreResult.totalPts + (khaleesiMounted ? ' (' + scoreResult.multiplier + 'x)' : ''), alpha: 1.0, vy: -1.8 });
              }

              obs.surfaceFlames.forEach(sf => {
                const sfx = obs.x + sf.relX;
                const sfy = obs.bottomY;
                const sfDist = Math.hypot(dragon.x - sfx, dragon.y - sfy);

                if (sfDist <= shockwaveRadius) {
                  sf.maxWidth = Math.min(sf.maxWidth + 1.2, 70);
                  sf.maxHeight = Math.min(sf.maxHeight + 1.8, 85);
                  sf.height = Math.min(sf.height + 2.0, sf.maxHeight);
                  sf.width = Math.min(sf.width + 1.5, sf.maxWidth);
                }
              });
            });

            knights.forEach(k => {
              if (k.state === 'ALIVE' && !k.isRoyal) {
                const obs = k.obsRef;
                const kx = obs.x + k.relX;
                const ky = obs.bottomY - 12;
                const dist = Math.hypot(dragon.x - kx, dragon.y - ky);

                if (dist <= shockwaveRadius) {
                  const pushDir = kx >= dragon.x ? 1 : -1;
                  k.knockbackVelocity = pushDir * (12.0 + Math.random() * 6.0);
                  k.stunTimer = 22;
                  sound.knightHit();
                }
              }
            });

            groundFlames.forEach(gf => {
              const dist = Math.hypot(dragon.x - gf.x, dragon.y - gY);
              if (dist <= shockwaveRadius) {
                gf.boostIntensity = Math.min((gf.boostIntensity || 1.0) + 0.15, 2.8);
                gf.life += 2;
              }
            });

            if (Math.random() < 0.6) {
              particles.push({
                x: dragon.x - 14,
                y: dragon.y + (Math.random() - 0.5) * 16,
                vx: -3 - Math.random() * 3,
                vy: (Math.random() - 0.5) * 2,
                size: 4 + Math.random() * 4,
                life: 20,
                color: '#f39c12'
              });
            }
          }
        }

        dragon.x += dragon.vx;
        dragon.vx *= 0.90;

        const thirtyPercentWidth = width * 0.30;
        if (dragon.x > dragon.baseX) {
          let returnSpeed = 1.2;
          if (dragon.x > thirtyPercentWidth) {
            const extraRatio = (dragon.x - thirtyPercentWidth) / (width - thirtyPercentWidth);
            returnSpeed = 3.5 + extraRatio * 9.0;
          }
          dragon.x -= returnSpeed;
          if (dragon.x < dragon.baseX) dragon.x = dragon.baseX;
        }

        if (dragon.y + dragon.size / 2 >= gY || dragon.y - dragon.size / 2 <= 0) {
          if (!khaleesiMounted) {
            triggerHit();
            if (lives > 0) {
              dragon.y = height * 0.4;
              dragon.velocity = 0;
            }
          } else {
            dragon.y = Math.max(dragon.size / 2, Math.min(gY - dragon.size / 2, dragon.y));
          }
        }

        if (obstacles.length === 0 || (width - obstacles[obstacles.length - 1].x) > 200) {
          spawnObstacle();
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          obs.x -= scrollSpeed * worldSpeedMult;

          if (!obs.passed && obs.x + obs.width < dragon.x) {
            obs.passed = true;
            addScore(1);
            sound.score();
          }

          const padding = 6;
          const dLeft = dragon.x - dragon.size / 2 + padding;
          const dRight = dragon.x + dragon.size / 2 - padding;
          const dTop = dragon.y - dragon.size / 2 + padding;
          const dBottom = dragon.y + dragon.size / 2 - padding;

          if (dRight > obs.x && dLeft < obs.x + obs.width) {
            if (dTop < obs.topHeight) {
              if (khaleesiMounted) {
                if (!obs.topIsCharred) {
                  obs.topIsCharred = true;
                  sound.towerDestroy();
                  const scoreResult = addScore(15);
                  floatingTexts.push({ x: obs.x + obs.width / 2 - 20, y: obs.topHeight + 10, text: 'CRUSH! +' + scoreResult.totalPts + ' (' + scoreResult.multiplier + 'x)', color: '#f1c40f', alpha: 1.0, vy: 1.5 });

                  for (let f = 0; f < 12; f++) {
                    flames.push({
                      x: dragon.x + (Math.random() - 0.5) * 30,
                      y: obs.topHeight + (Math.random() - 0.5) * 20,
                      vx: (Math.random() - 0.5) * 12,
                      vy: (Math.random() - 0.2) * 8,
                      dragX: 0.96,
                      gravity: 0.15,
                      size: 16 + Math.random() * 12,
                      life: 90,
                      maxLife: 90,
                      color: Math.random() < 0.5 ? '#ff793f' : '#f1c40f'
                    });
                  }
                }
              } else {
                obstacleHit();
                if (lives > 0) obs.passed = true;
              }
            }

            if (dBottom > obs.bottomY) {
              if (khaleesiMounted) {
                if (!obs.isCharred && obs.charProgress === 0) {
                  obs.charProgress = 0.01;
                  sound.towerDestroy();
                  const scoreResult = addScore(15);
                  floatingTexts.push({ x: obs.x + obs.width / 2 - 20, y: obs.bottomY - 20, text: 'CRUSH! +' + scoreResult.totalPts + ' (' + scoreResult.multiplier + 'x)', color: '#f1c40f', alpha: 1.0, vy: -1.8 });

                  for (let f = 0; f < 12; f++) {
                    flames.push({
                      x: dragon.x + (Math.random() - 0.5) * 30,
                      y: obs.bottomY + (Math.random() - 0.5) * 20,
                      vx: (Math.random() - 0.5) * 12,
                      vy: -(Math.random() * 8 + 2),
                      dragX: 0.96,
                      gravity: 0.15,
                      size: 16 + Math.random() * 12,
                      life: 90,
                      maxLife: 90,
                      color: Math.random() < 0.5 ? '#ff793f' : '#ee5253'
                    });
                  }
                }
              } else {
                obstacleHit();
                if (lives > 0) obs.passed = true;
              }
            }
          }

          if (obs.x + obs.width < -100) {
            obstacles.splice(i, 1);
          }
        }

        updateLevelExtras(scrollSpeed * worldSpeedMult);
      }
    }


    function render() {
      if (khaleesiSplash && khaleesiSplash.frozen) {
        ctx.drawImage(khaleesiSplash.frozen, 0, 0);
        drawKhaleesiSplash();
        ctx.textAlign = 'left';
        return;
      }
      ctx.clearRect(0, 0, width, height);
      flameDrawCount = 0;
      const shake = sceneShake();
      ctx.save();
      if (shake) ctx.translate(shake.x, shake.y);

      if (sunnyScene()) {
        // prologue, opening screen and start menu: sunny valley
        drawSunnyBackdrop();
        drawSunnyGround();
        drawProEnts();
      } else {
        drawNightSky();
        drawMoon();
        drawGiantClouds();
        drawParallaxCastleBackground();
        if (state === 'BOSS_INTRO') drawBossIntroScene();
        obstacles.forEach(drawCastleWalls);
        drawBattlements();
        drawLevelChests();      // behind archers, peasants and knights
        drawArchersAndArrows();
        drawKhaleesis();
        drawCollectableHearts();
        drawTrebuchetsAndBoulders();
        drawKnights();
        drawLevelExtras();
        drawGround();
      }
      drawParticles();
      if (state === 'BOSS') renderBoss();

      if (state === 'SPLASH') {
        drawStoryMessage(PRO_INVITE_TEXT, 'TAP TO START GAME');
      } else if (state === 'CAPTURED_MSG') {
        drawCapturedMessage();
      } else if (state === 'CAPTURE') {
        drawCaptureOverlay();
      } else if (state === 'LEVEL_CELEBRATE') {
        drawDragon(dragon.x, dragon.y);
        drawDragonCarried();

        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 28px "Proxima Nova", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("LEVEL CLEARED!", width / 2, height * 0.18);

        if (celebrationFadeAlpha > 0) {
          ctx.fillStyle = `rgba(10, 10, 20, ${celebrationFadeAlpha})`;
          ctx.fillRect(0, 0, width, height);
        }

      } else if (state === 'LEVEL_DIALOGUE') {
        renderLevelDialogue();
      } else if (state === 'CUTSCENE') {
        renderCutscene();
      } else if (state === 'PAUSED') {
        renderPauseScreen();
      } else if (state === 'GAMEOVER') {
        renderGameOverScreen();
      } else if (state === 'BOSS_INTRO') {
        drawBossIntroOverlay();
      } else if (state === 'BOSS') {
        drawDragon(dragon.x, dragon.y);
        renderMountedKhaleesiHUD();
      } else {
        drawDragon(dragon.x, dragon.y);
        renderMountedKhaleesiHUD();
        drawDragonCarried();
        drawExtrasHUD();
        if (inPrologue()) drawProOverlay();
      }

      if (state === 'START') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px "Proxima Nova", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText('TAP TO FLAP', width / 2, height / 2 - 80);
        ctx.font = 'bold 14px "Proxima Nova", sans-serif';
        ctx.fillText('Hold: Boost Forward', width / 2, height / 2 - 50);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        const btnW = 200;
        const btnH = 44;
        const btnX = (width - btnW) / 2;
        const startBtnY = height / 2 - 10;
        const loadBtnY = startBtnY + 58;

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(btnX, startBtnY, btnW, btnH);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(btnX, startBtnY, btnW, btnH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Proxima Nova", sans-serif';
        ctx.fillText('START GAME', width / 2, startBtnY + 27);

        ctx.fillStyle = '#2980b9';
        ctx.fillRect(btnX, loadBtnY, btnW, btnH);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(btnX, loadBtnY, btnW, btnH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Proxima Nova", sans-serif';
        ctx.fillText('LOAD GAME', width / 2, loadBtnY + 27);

      }

      ctx.restore();
      drawTreasureFX();
      freezeFrameForSplash();
      drawKhaleesiSplash();

      ctx.textAlign = 'left';
    }


    function loop() {
      update();
      render();
      requestAnimationFrame(loop);
    }

    loop();
