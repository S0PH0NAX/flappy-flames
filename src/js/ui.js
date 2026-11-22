// ui.js — HUD, pause, level progression, score/hearts, save codes, share graphic, reset
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function getLevelScrollSpeed() {
      return 2.5;
    }

    function toggleModeSwitch() {
      isFlapLockActive = !isFlapLockActive;
      toggleFireModeBtn.classList.toggle('active', isFlapLockActive);
      manualFireBtn.style.display = isFlapLockActive ? 'inline-block' : 'none';
    }

    let statePrePause = 'PLAYING';
    function togglePauseGame() {
      if (state === 'PLAYING' || state === 'BOSS') {
        statePrePause = state;
        state = 'PAUSED';
      } else if (state === 'PAUSED') {
        resumeFromPause();
      }
    }

    // Leave the pause screen with a free flap so the dragon doesn't drop straight down.
    function resumeFromPause() {
      if (state !== 'PAUSED') return;
      state = statePrePause || 'PLAYING';
      dragon.velocity = dragon.jump;
      dragon.wingState = 1.0;
      sound.flap();
    }

    function startLevelCelebration(nextLvl, targetDialogueType) {
      currentLevel = nextLvl;
      levelTimerSeconds = 0;
      levelDialogueType = targetDialogueType;
      celebrationTimer = 0;
      celebrationAngle = 0;
      celebrationFadeAlpha = 0;
      state = 'LEVEL_CELEBRATE';
      lives = 3;                 // clearing a level refills every heart
      updateHeartsDisplay();
      sound.powerup();
      updateLevelBadgeUI();
    }

    function checkLevelProgression() {
      if (state !== 'PLAYING' || inPrologue()) return;   // prologue.js ends its own levels

      const targetDuration = LEVEL_DURATIONS[currentLevel] || 90;

      if (levelTimerSeconds >= targetDuration) {
        if (currentLevel === 1) {
          startLevelCelebration(2, 'LEVEL1_CLEAR');
        } else if (currentLevel === 2) {
          startLevelCelebration(3, 'LEVEL2_CLEAR');
        } else if (currentLevel === 3) {
          // level 3 ends with fireworks, then the siege-tower cinematic and boss; beating it leads to level 4
          startLevelCelebration(3, 'BOSS_INTRO');
        } else if (currentLevel === 4) {
          startLevelCelebration(5, 'LEVEL4_CLEAR');
        } else if (currentLevel === 5) {
          startLevelCelebration(FINAL_LEVEL + 1, 'VICTORY');
        }
      }
    }

    // Banner shown when a level starts, introducing that level's new threat.
    function announceLevelStart() {
      if (currentLevel === 2) setTimeout(() => showKhaleesiBanner('"Beware the armored knights, Syraxx! Keep your fire on them until their armor melts!"', 260), 4500);
      else if (currentLevel === 4) showKhaleesiBanner('"The armored knights are everywhere now, Syraxx! Burn them down!"', 260);
      else if (currentLevel === 5) { showKhaleesiBanner('"Golden knights! Snatch one while its guard is down and take its shield!"', 280); gkTalkSeen.spot = true; }
    }

    function debugWarpToLevel(targetLvl) {
      currentLevel = targetLvl;
      levelTimerSeconds = 0;

      obstacles = [];
      battlements = [];
      archers = [];
      knights = [];
      trebuchets = [];
      arrows = [];
      trebuchetBoulders = [];
      clearLevelExtras();
      if (bossState) bossState.active = false;

      level2KhaleesiSpawned = false;
      level2RoyalSpawned = false;

      state = 'PLAYING';
      updateLevelBadgeUI();
      sound.powerup();
      showKhaleesiBanner(`"Warped to Level ${currentLevel}! Progress reset."`, 150);
      if (targetLvl >= 2) setTimeout(announceLevelStart, 2600);
    }

    function addScore(pts) {
      let activeMultiplier = 1;
      if (khaleesiMounted) {
        khaleesiCombo += 2;
        activeMultiplier = khaleesiCombo;
      } else {
        khaleesiCombo = 0;
      }
      
      activeMultiplier *= treasureMultiplier();
      const totalPts = pts * activeMultiplier;
      score += totalPts;
      scoreDisplay.innerText = score;
      return { totalPts, multiplier: activeMultiplier };
    }

    function resetScoreToZero() {
      score = 0;
      scoreDisplay.innerText = '0';
      showKhaleesiBanner('"Syraxx, you mustn\'t burn the royals. Take their heads. Score reset to zero."', 240);
      floatingTexts.push({
        x: width / 2 - 80,
        y: height / 2 - 40,
        text: 'ROYAL BURNED! SCORE RESET TO 0',
        color: '#e74c3c',
        alpha: 1.0,
        vy: -1.0
      });
    }

    function updateHeartsDisplay() {
      let str = '';
      for (let i = 0; i < 3; i++) {
        str += i < lives ? '❤️' : '🖤';
      }
      heartsText.innerText = str;
      headsText.innerText = '👑 ' + royalHeads;
    }

    const CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const SAVE_CODE_BOSS = 11;   // level character "B": the code starts the siege-tower boss
    let saveCodeBoss = false;    // set by loadSaveCode() when the code is a boss code

    function atBossFight() {
      if (state === 'BOSS_INTRO') return true;
      if (!bossState.active) return false;
      return state === 'BOSS' || (state === 'PAUSED' && statePrePause === 'BOSS');
    }
    
    // Save code: 12 characters, shown as XXXX-XXXX-XXXX.
    //   score (5) · kings (1) · queens (1) · villagers (3) · level (1, "B" = boss) · check (1)
    // Old 6- and 7-character codes still load.
    function codeEncode(n, len) {
      let s = '';
      for (let i = 0; i < len; i++) { s = CODE_CHARS[n % 36] + s; n = Math.floor(n / 36); }
      return s;
    }
    function codeDecode(str) {
      let n = 0;
      for (let i = 0; i < str.length; i++) {
        const v = CODE_CHARS.indexOf(str[i]);
        if (v < 0) return -1;
        n = n * 36 + v;
      }
      return n;
    }
    function codeCheckChar(body) {
      let sum = 0;
      for (let i = 0; i < body.length; i++) sum += CODE_CHARS.indexOf(body[i]) * (i + 3);
      return CODE_CHARS[sum % 36];
    }

    function generateSaveCode() {
      const p = Math.min(Math.max(0, Math.floor(score)), 36 ** 5 - 1);
      const k = Math.min(gameStats.kingsBeheaded, 35);
      const q = Math.min(gameStats.queensBeheaded, 35);
      const v = Math.min(gameStats.villagersKilled, 36 ** 3 - 1);
      let lvl = atBossFight() ? SAVE_CODE_BOSS : Math.min(currentLevel, FINAL_LEVEL);
      if (inPrologue() || state === 'CAPTURE') lvl = currentLevel === PRO_MEADOW ? PRO_CODE_MEADOW : PRO_CODE_VILLAGE;
      const body = codeEncode(p, 5) + CODE_CHARS[k] + CODE_CHARS[q] + codeEncode(v, 3) + CODE_CHARS[lvl];
      const code = body + codeCheckChar(body);
      return code.slice(0, 4) + '-' + code.slice(4, 8) + '-' + code.slice(8);
    }

    function loadSaveCode(codeStr) {
      if (!codeStr) return false;
      const clean = codeStr.toUpperCase().replace(/[^0-9A-Z]/g, '');
      let savedScore, savedKings, savedQueens, savedVillagers, lvlVal;

      if (clean.length === 12) {
        const body = clean.slice(0, 11);
        if (codeCheckChar(body) !== clean[11]) return false;   // typo
        savedScore = codeDecode(body.slice(0, 5));
        savedKings = codeDecode(body[5]);
        savedQueens = codeDecode(body[6]);
        savedVillagers = codeDecode(body.slice(7, 10));
        lvlVal = codeDecode(body[10]);
      } else if (clean.length === 6 || clean.length === 7) {
        // old short format: score (2) kings queens villagers (2) [level]
        savedScore = codeDecode(clean.slice(0, 2));
        savedKings = codeDecode(clean[2]);
        savedQueens = codeDecode(clean[3]);
        savedVillagers = codeDecode(clean.slice(4, 6));
        lvlVal = clean.length === 7 ? codeDecode(clean[6]) : Math.min(3, Math.max(1, Math.floor(savedScore / 1000) + 1));
      } else return false;

      if ([savedScore, savedKings, savedQueens, savedVillagers, lvlVal].some(x => x < 0)) return false;

      const isBoss = lvlVal === SAVE_CODE_BOSS;
      let savedLvl = isBoss ? 3 : Math.max(1, Math.min(FINAL_LEVEL, lvlVal));
      if (clean.length === 12 && isPrologueCode(lvlVal)) savedLvl = lvlVal === PRO_CODE_MEADOW ? PRO_MEADOW : PRO_VILLAGE;

      resetGame();
      score = savedScore;
      currentLevel = savedLvl;
      levelTimerSeconds = 0;
      gameStats.kingsBeheaded = savedKings;
      gameStats.queensBeheaded = savedQueens;
      gameStats.villagersKilled = savedVillagers;
      gameStats.burnedTowers = Math.floor(savedScore / 25);

      royalHeads = savedKings + savedQueens;
      royalHeadTypes = [
        ...Array(savedKings).fill('KING'),
        ...Array(savedQueens).fill('QUEEN')
      ];
      royalHeadNobles = royalHeadTypes.map(() => randomNoble());

      updateLevelBadgeUI();
      scoreDisplay.innerText = score;
      updateHeartsDisplay();
      saveCodeBoss = isBoss;
      return true;
    }

    function saveGame() {
      const code = generateSaveCode();
      localStorage.setItem('flappyFlameSaveShort', code);
      if (typeof saveCodeDisplay !== 'undefined' && saveCodeDisplay) {
        saveCodeDisplay.innerText = code;
      }
    }

    function openLoadGameModal() {
      loadCodeInput.value = '';
      loadModal.style.display = 'flex';
    }

    function generateSharePostGraphic() {
      if (!shareCanvas) return;
      shareCanvas.width = 800;
      shareCanvas.height = 800;

      const sCtx = shareCanvas.getContext('2d');
      const sw = 800;
      const sh = 800;

      sCtx.clearRect(0, 0, sw, sh);

      const skyGradient = sCtx.createLinearGradient(0, 0, 0, sh);
      skyGradient.addColorStop(0, '#0d0d26');
      skyGradient.addColorStop(0.7, '#241738');
      skyGradient.addColorStop(1, '#3a1c40');
      sCtx.fillStyle = skyGradient;
      sCtx.fillRect(0, 0, sw, sh);

      sCtx.strokeStyle = '#f1c40f';
      sCtx.lineWidth = 10;
      sCtx.strokeRect(20, 20, sw - 40, sh - 40);

      sCtx.strokeStyle = '#e74c3c';
      sCtx.lineWidth = 4;
      sCtx.strokeRect(30, 30, sw - 60, sh - 60);

      sCtx.fillStyle = '#f1c40f';
      sCtx.font = 'bold 36px "Proxima Nova", sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText("FLAPPY DRAGON CONQUEROR", sw / 2, 85);

      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 24px "Proxima Nova", sans-serif';
      sCtx.fillText(`SYRAXX'S VICTORY STATS (LEVEL ${Math.min(FINAL_LEVEL, currentLevel)})`, sw / 2, 125);

      const cardX = 60, cardY = 160, cardW = 680, cardH = 340;
      sCtx.fillStyle = '#11161d';
      sCtx.fillRect(cardX, cardY, cardW, cardH);
      sCtx.strokeStyle = '#f1c40f';
      sCtx.lineWidth = 3;
      sCtx.strokeRect(cardX, cardY, cardW, cardH);

      const pX = 90, pY = 190, pSize = 120;
      const kImg = (Math.floor(Date.now() / 5000) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;
      sCtx.fillStyle = '#1e272e';
      sCtx.fillRect(pX, pY, pSize, pSize);
      if (kImg.complete && kImg.naturalWidth !== 0) {
        sCtx.drawImage(kImg, pX, pY, pSize, pSize);
      }
      sCtx.strokeStyle = '#f1c40f';
      sCtx.lineWidth = 3;
      sCtx.strokeRect(pX, pY, pSize, pSize);

      const kingsTxt = gameStats.kingsBeheaded === 1 ? '1 king' : `${gameStats.kingsBeheaded} kings`;
      const queensTxt = gameStats.queensBeheaded === 1 ? '1 queen' : `${gameStats.queensBeheaded} queens`;
      
      sCtx.fillStyle = '#2ecc71';
      sCtx.font = 'bold 22px "Proxima Nova", sans-serif';
      sCtx.textAlign = 'left';
      sCtx.fillText(`"I'm so proud of my Syraxx.`, 240, 215);
      sCtx.fillText(`Syraxx earned ${score} points, burned`, 240, 248);
      sCtx.fillText(`${gameStats.burnedTowers} towers, killed ${gameStats.villagersKilled} villagers,`, 240, 281);
      sCtx.fillText(`and beheaded ${kingsTxt} and ${queensTxt}!"`, 240, 314);

      sCtx.strokeStyle = '#e74c3c';
      sCtx.lineWidth = 2;
      sCtx.beginPath();
      sCtx.moveTo(90, 345);
      sCtx.lineTo(710, 345);
      sCtx.stroke();

      const statsY = 380;
      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 22px "Proxima Nova", sans-serif';

      sCtx.fillText(`🔥 SCORE EARNED:`, 110, statsY);
      sCtx.fillStyle = '#f1c40f';
      sCtx.textAlign = 'right';
      sCtx.fillText(`${score} PTS`, 690, statsY);

      sCtx.fillStyle = '#ffffff';
      sCtx.textAlign = 'left';
      sCtx.fillText(`🏰 TOWERS BURNED:`, 110, statsY + 38);
      sCtx.fillStyle = '#f1c40f';
      sCtx.textAlign = 'right';
      sCtx.fillText(`${gameStats.burnedTowers} TOWERS`, 690, statsY + 38);

      sCtx.fillStyle = '#ffffff';
      sCtx.textAlign = 'left';
      sCtx.fillText(`⚔️ VILLAGERS SLAIN:`, 110, statsY + 76);
      sCtx.fillStyle = '#f1c40f';
      sCtx.textAlign = 'right';
      sCtx.fillText(`${gameStats.villagersKilled} VILLAGERS`, 690, statsY + 76);

      const ctaY = 540;
      sCtx.fillStyle = '#161d27';
      sCtx.fillRect(60, ctaY, 680, 180);
      sCtx.strokeStyle = '#3498db';
      sCtx.lineWidth = 2;
      sCtx.strokeRect(60, ctaY, 680, 180);

      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 28px "Proxima Nova", sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText("🐉 CAN YOU BEAT THIS RUN?", sw / 2, ctaY + 75);
      sCtx.fillStyle = '#f1c40f';
      sCtx.font = 'bold 20px "Proxima Nova", sans-serif';
      sCtx.fillText("FLAPPY DRAGON CONQUEROR", sw / 2, ctaY + 120);

      shareModal.style.display = 'flex';
    }

    function resetGame() {
      bossIntro = null;
      pro = null;
      gkTalkSeen = { spot: false, shield: false };
      dragon.x = 80;
      dragon.targetX = 80;
      dragon.vx = 0;
      dragon.y = height * 0.4;
      dragon.velocity = 0;
      dragon.wingState = 0;
      score = 0;
      lives = 3;
      royalHeads = 0;
      royalHeadTypes = [];
      royalHeadNobles = [];
      invulnerableTimer = 0;
      khaleesiMounted = false;
      khaleesiTimer = 0;
      khaleesiCombo = 0;
      khaleesiBannerTimer = 0;
      khaleesiBannerText = "";
      lastSpawnedBattlementHeight = 0;
      noHeadContinuePopupTimer = 0;
      headFadingIndex = -1;
      headFadeTimer = 0;

      currentLevel = 1;
      levelTimerSeconds = 0;
      level2KhaleesiSpawned = false;
      level2RoyalSpawned = false;

      gameStats.burnedTowers = 0;
      gameStats.villagersKilled = 0;
      gameStats.archersKilled = 0;
      gameStats.trebuchetsDestroyed = 0;
      gameStats.kingsBeheaded = 0;
      gameStats.queensBeheaded = 0;
      gameStats.khaleesiRescues = 0;

      obstacles = [];
      battlements = [];
      archers = [];
      arrows = [];
      particles = [];
      flames = [];
      knights = [];
      khaleesis = [];
      trebuchets = [];
      trebuchetBoulders = [];
      collectableHearts = [];
      floatingTexts = [];
      groundFlames = [];
      blackDebris = [];
      isHoldingAction = false;
      holdTimer = 0;
      clearLevelExtras();
      if (bossState) bossState.active = false;
      backgroundParallaxX = 0;
      scoreDisplay.innerText = '0';
      updateLevelBadgeUI();
      updateHeartsDisplay();
    }

