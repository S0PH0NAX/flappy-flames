// entities.js — Obstacle/enemy/pickup spawning, beheading cutscene trigger
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function spawnObstacle() {
      if (state === 'LEVEL_CELEBRATE') return;

      const prevObs = obstacles[obstacles.length - 1];
      
      let minGapDistance = 260;
      if (currentLevel === 1) minGapDistance = 380;
      else if (currentLevel === 2) minGapDistance = 320;

      if (prevObs && (width - prevObs.x) < (prevObs.baseWidth + minGapDistance)) {
        return;
      }

      const gY = height - groundHeight;
      const minGap = 250;
      const maxGap = 310;
      const gapHeight = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;

      const minVisualTowerHeight = Math.max(30, lastSpawnedBattlementHeight);

      const minTop = 40;
      const maxTopFromGaps = Math.max(40, height - groundHeight - gapHeight - 40);
      const maxTopFromTowerHeight = Math.max(40, gY - gapHeight - minVisualTowerHeight);
      const finalMaxTop = Math.min(maxTopFromGaps, maxTopFromTowerHeight);
      
      const topHeight = Math.floor(Math.random() * (finalMaxTop - minTop + 1)) + minTop;

      let type = Math.random() < 0.2 ? 'mega' : (Math.random() < 0.5 ? 'wide' : 'normal');
      if (currentLevel >= 5) type = 'mega';   // level 5: only the longest towers
      let obsWidth = type === 'wide' ? 140 : (type === 'mega' ? 560 : 80);

      const isLarge = obsWidth >= 120;
      const hasLargeArch = isLarge && Math.random() < 0.8;
      const hasRubble = Math.random() < 0.6;

      const newObs = {
        x: width,
        width: obsWidth,
        baseWidth: type === 'mega' ? 580 : (type === 'wide' ? 150 : 96),
        topHeight: topHeight,
        bottomY: topHeight + gapHeight,
        passed: false,
        type: type,
        surfaceFlames: [],
        hasLargeArch: hasLargeArch,
        hasRubble: hasRubble,

        burnFullTimer: 0,
        charProgress: 0,
        isCharred: false,
        topIsCharred: false,
        charredAwarded: false
      };

      obstacles.push(newObs);

      lastSpawnedBattlementHeight = 0;

      let hasBattlement = false;
      if (Math.random() < 0.50) {
        const towerVisualHeight = gY - newObs.bottomY;
        if (towerVisualHeight > 35) {
          hasBattlement = true;
          const heightMultiplier = 0.35 + Math.random() * 0.40;
          const battlementHeight = Math.max(35, Math.min(65, towerVisualHeight * heightMultiplier));
          lastSpawnedBattlementHeight = battlementHeight;
          const battlementWidth = minGapDistance + 40;

          const newBattlement = {
            x: width + obsWidth,
            width: battlementWidth,
            height: battlementHeight,
            topY: gY - battlementHeight,
            surfaceFlames: [],
            isCharred: false,
            isCrushed: false,
            charProgress: 0
          };

          battlements.push(newBattlement);

          // level 5 has twice the archers: every battlement is manned by 3-4, spread out
          const archerCount = currentLevel >= 5 ? (Math.random() < 0.4 ? 4 : 3) : ((currentLevel >= 3 && Math.random() < 0.85) ? 1 : 0);
          for (let ai = 0; ai < archerCount; ai++) {
            archers.push({
              battlementRef: newBattlement,
              relX: archerCount > 1 ? battlementWidth * ((ai + 0.5) / archerCount + (Math.random() - 0.5) * 0.06) : battlementWidth * (0.3 + Math.random() * 0.4),
              state: 'HIDDEN',
              timer: 0,
              cycleTimer: Math.floor(Math.random() * 120),
              isExposed: false,
              isFiring: false,
              hp: 1,
              destroyed: false,
              archerAwarded: false
            });
          }
        }
      }

      let hasKhaleesiOnTower = false;

      let allowKhaleesi = false;
      if (currentLevel === 2 && !level2KhaleesiSpawned && Math.random() < 0.15) {
        allowKhaleesi = true;
        level2KhaleesiSpawned = true;
      } else if (currentLevel >= 3 && Math.random() < 0.05) {
        allowKhaleesi = true;
      }

      if (allowKhaleesi && (height - groundHeight - newObs.bottomY) > 30) {
        hasKhaleesiOnTower = true;
        khaleesis.push({
          obsRef: newObs,
          relX: 10 + Math.random() * Math.max(10, obsWidth - 26),
          direction: Math.random() < 0.5 ? 1 : -1,
          rescued: false
        });
        showKhaleesiBanner('"I\'M HERE CYNDRAXX! COME TO ME!"', 200);
      }

      const heartChance = 0.10;
      if (Math.random() < heartChance) {
        const skyY = topHeight + (gapHeight / 2) + (Math.random() - 0.5) * (gapHeight * 0.4);
        collectableHearts.push({
          x: width + (obsWidth / 2),
          y: Math.max(50, Math.min(height - groundHeight - 50, skyY)),
          baseY: skyY,
          bobPhase: Math.random() * Math.PI * 2,
          radius: 18,
          collected: false
        });
      }

      if (currentLevel >= 2 && currentLevel < 5 && !hasBattlement && Math.random() < 0.35) {
        trebuchets.push({
          x: width + obsWidth + 40 + Math.random() * 80,
          shootCooldown: 80 + Math.random() * 60,
          armAngle: -0.4,
          isFiringAnim: false
        });
      }

      if (!hasKhaleesiOnTower && (height - groundHeight - newObs.bottomY) > 30) {
        let allowRoyal = false;
        if (currentLevel === 2 && !level2RoyalSpawned && Math.random() < 0.12) {
          allowRoyal = true;
          level2RoyalSpawned = true;
        } else if (currentLevel >= 3 && currentLevel < 5 && Math.random() < 0.04) {
          allowRoyal = true;   // no royals in level 5
        }

        if (allowRoyal && !khaleesiMounted) {
          const isKing = Math.random() < 0.5;
          const royalType = isKing ? 'KING' : 'QUEEN';

          knights.push({
            obsRef: newObs,
            relX: 10 + Math.random() * Math.max(10, obsWidth - 36),
            direction: Math.random() < 0.5 ? 1 : -1,
            state: 'ALIVE',
            isRoyal: true,
            royalType: royalType,
            burnTimer: 0,
            knockbackVelocity: 0,
            stunTimer: 0,
            fallYOffset: 0,
            fallVelocityY: 0,
            rotation: 0,
            pointAwarded: false
          });

          if (isKing) {
            sound.kingEntrance();
          } else {
            sound.queenEntrance();
          }

          showKhaleesiBanner('"Look Cyndraxx, a noble. Don\'t burn them, bring me their head!"', 240);
        } else if (currentLevel >= 2 && Math.random() < (currentLevel >= 5 ? 0.6 : (currentLevel >= 4 ? 0.4 : 0.25))) {
          // armored knights never share a tower with peasants
          spawnSmallKnights(newObs);
        } else if (currentLevel < 5 && Math.random() < 0.85) {
          const peasantCount = Math.floor(Math.random() * 5) + 1;
          for (let p = 0; p < peasantCount; p++) {
            knights.push({
              obsRef: newObs,
              relX: 8 + (p * 22) % Math.max(10, obsWidth - 28),
              direction: Math.random() < 0.5 ? 1 : -1,
              state: 'ALIVE',
              isRoyal: false,
              costume: peasantCostumes[Math.floor(Math.random() * peasantCostumes.length)],
              hasPitchfork: Math.random() < 0.5,
              burnTimer: 0,
              knockbackVelocity: 0,
              stunTimer: 0,
              fallYOffset: 0,
              fallVelocityY: 0,
              rotation: 0,
              pointAwarded: false
            });
          }
        }
      }

      const towerTall = (height - groundHeight - newObs.bottomY) > 30;
      if (towerTall && !hasKhaleesiOnTower) {
        if (currentLevel >= 5) maybeSpawnGoldKnight(newObs);
        maybeSpawnChest(newObs);
      }
    }

    // ✅ CORRECT: Only return if state is NOT 'PLAYING' AND NOT 'BOSS'
let fireShotCounter = 0;   // tags each breath so the boss can cap kills per shot

function shootFire() {
  if (state !== 'PLAYING' && state !== 'BOSS') return;
  if (fireDisabled()) return;       // no fire in the prologue
  if (chestHandlesFire()) return;   // holding a chest: FIRE means DROP
  sound.fireRoar();
  fireShotCounter++;
  if (bossState.shotKills) delete bossState.shotKills[fireShotCounter - 20];

     
      const fireworkColors = ['#f1c40f', '#e74c3c', '#ff7675', '#ff9f43', '#ffffff'];

      for (let i = 0; i < 6; i++) {
        const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
        flames.push({
          x: dragon.x + dragonMouthOffset().x - 4,
          y: dragon.y + dragonMouthOffset().y + (Math.random() - 0.5) * 10,
          vx: 16.0 + Math.random() * 8.0,
          vy: 1.0 + (Math.random() - 0.4) * 3.0,
          dragX: 0.985,
          gravity: 0.12,
          size: 14 + Math.random() * 10,
          life: 110,
          maxLife: 110,
          color: color,
          shotId: fireShotCounter
        });
      }
    }


    function triggerBeheadingCutscene(royalType) {
      sound.stopRoyalSounds();

      cutsceneTarget = royalType;
      cutsceneTimer = 0;
      state = 'CUTSCENE';
      
      royalHeads++;
      royalHeadTypes.push(royalType);
      cutsceneNoble = randomNoble(royalType);
      royalHeadNobles.push(cutsceneNoble);

      if (royalType === 'KING') gameStats.kingsBeheaded++;
      else gameStats.queensBeheaded++;

      updateHeartsDisplay();

      const scoreResult = addScore(5000);

      floatingTexts.push({
        x: width / 2 - 50,
        y: height / 2 - 60,
        text: 'BEHEADED! +' + scoreResult.totalPts,
        color: '#f1c40f',
        alpha: 1.0,
        vy: -1.5
      });
    }

