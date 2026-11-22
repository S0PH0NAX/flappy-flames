// screens.js — Level dialogue, beheading cutscene, game-over screens
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function renderLevelDialogue() {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
      ctx.fillRect(0, 0, width, height);

      const pSize = 140;
      const pX = (width - pSize) / 2;
      const pY = 120;
      const activeFrame = (Math.floor(Date.now() / 5000) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;

      ctx.fillStyle = '#11161d';
      ctx.fillRect(pX, pY, pSize, pSize);
      if (activeFrame.complete && activeFrame.naturalWidth !== 0) {
        ctx.drawImage(activeFrame, pX, pY, pSize, pSize);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f1c40f';
      ctx.strokeRect(pX, pY, pSize, pSize);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 22px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';

      let title = "LEVEL 1: THE SIEGE BEGINS!";
      let buttonText = "BEGIN CONQUEST";

      if (levelDialogueType === 'LEVEL1_CLEAR') {
        title = "LEVEL 1 CONQUERED!";
        buttonText = "START LEVEL 2";
      } else if (levelDialogueType === 'LEVEL2_CLEAR') {
        title = "LEVEL 2 CONQUERED!";
        buttonText = "START LEVEL 3";
      } else if (levelDialogueType === 'BOSS_CLEAR') {
        title = "SIEGE TOWER DESTROYED!";
        buttonText = "START LEVEL 4";
      } else if (levelDialogueType === 'LEVEL4_CLEAR') {
        title = "LEVEL 4 CONQUERED!";
        buttonText = "START LEVEL 5";
      } else if (levelDialogueType === 'VICTORY') {
        title = "SLAVERS DEFEATED! VICTORY!";
        buttonText = "PLAY AGAIN";
      }

      ctx.fillText(title, width / 2, pY - 25);

      let statsBoxY, statsBoxH;

      if (levelDialogueType === 'INTRO') {
        const speechLines = [
          '"My brave Syraxx, burn their',
          'towers, slay the slavers, and bring',
          'me to victory. I love you!"'
        ];

        const bW = width - 60;
        bH = 90;
        const bX = 30;
        bY = pY + pSize + 20;
        statsBoxY = bY;
        statsBoxH = bH;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 12);
        else ctx.fillRect(bX, bY, bW, bH);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px "Proxima Nova", sans-serif';
        ctx.textAlign = 'center';

        speechLines.forEach((l, idx) => {
          ctx.fillText(l, width / 2, bY + 26 + (idx * 22));
        });

      } else if (levelDialogueType === 'LEVEL1_CLEAR') {
        const speechLines = [
          '"My beloved Syraxx, you will now',
          'encounter the royals. DO NOT BURN',
          'THE ROYALS! Bring me their heads to',
          'mount on the city walls!"'
        ];

        const bW = width - 60;
        bH = 110;
        const bX = 30;
        bY = pY + pSize + 20;
        statsBoxY = bY;
        statsBoxH = bH;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 12);
        else ctx.fillRect(bX, bY, bW, bH);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px "Proxima Nova", sans-serif';
        ctx.textAlign = 'center';

        speechLines.forEach((l, idx) => {
          ctx.fillText(l, width / 2, bY + 24 + (idx * 21));
        });

      } else {
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 15px "Proxima Nova", sans-serif';
        ctx.fillText('"I LOVE YOU SO MUCH SYRAXX!"', width / 2, pY + pSize + 25);

        statsBoxY = pY + pSize + 40;
        const statsBoxW = width - 60;
        statsBoxH = 175;
        const statsBoxX = 30;

        ctx.fillStyle = '#11161d';
        ctx.fillRect(statsBoxX, statsBoxY, statsBoxW, statsBoxH);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f1c40f';
        ctx.strokeRect(statsBoxX, statsBoxY, statsBoxW, statsBoxH);

        const lMargin = statsBoxX + 18;
        const rMargin = statsBoxX + statsBoxW - 18;

        const lines = [
          { label: "🏰 Towers Burned:", val: `${gameStats.burnedTowers}` },
          { label: "⚔️ Peasants Slain:", val: `${gameStats.villagersKilled}` },
          { label: "🏹 Archers Defeated:", val: `${gameStats.archersKilled}` },
          { label: "💥 Trebuchets Wrecked:", val: `${gameStats.trebuchetsDestroyed}` },
          { label: "👑 Royals Beheaded:", val: `${gameStats.kingsBeheaded + gameStats.queensBeheaded}` },
          { label: "👸 Khaleesi Rescues:", val: `${gameStats.khaleesiRescues}` }
        ];

        lines.forEach((item, idx) => {
          const curY = statsBoxY + 24 + (idx * 24);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px "Proxima Nova", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(item.label, lMargin, curY);

          ctx.fillStyle = '#f1c40f';
          ctx.textAlign = 'right';
          ctx.fillText(item.val, rMargin, curY);
        });
      }

      const btnW = 220;
      const btnH = 46;
      const btnX = (width - btnW) / 2;
      const btnY = statsBoxY + statsBoxH + 20;

      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(buttonText, width / 2, btnY + 28);
    }

    const CUTSCENE_BUTTON_FRAME = 270;   // head shows at 200; button appears a moment later

    function renderCutscene() {
      cutsceneTimer++;
      
      ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
      ctx.fillRect(0, 0, width, height);

      const pSize = 54;
      const pX = 15;
      const pY = 65;
      const khaleesiImg = (Math.floor(Date.now() / 5000) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;

      ctx.fillStyle = '#11161d';
      ctx.fillRect(pX, pY, pSize, pSize);
      if (khaleesiImg.complete && khaleesiImg.naturalWidth !== 0) {
        ctx.drawImage(khaleesiImg, pX, pY, pSize, pSize);
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f1c40f';
      ctx.strokeRect(pX, pY, pSize, pSize);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Proxima Nova", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('"Death to tyrants, gods and masters!"', pX, pY + pSize + 18);

      const boxSize = 240;
      const bX = (width - boxSize) / 2;
      const bY = height / 2 - 80;

      // a random noble's portrait, which slowly closes in on the head
      const zt = Math.max(0, Math.min(1, (cutsceneTimer - 110) / 90));
      const zoom = zt * zt * (3 - 2 * zt);
      ctx.save();
      ctx.beginPath(); ctx.rect(bX, bY, boxSize, boxSize); ctx.clip();
      drawNoble(cutsceneNoble, bX, bY, boxSize, zoom);
      ctx.restore();

      ctx.lineWidth = 4;
      ctx.strokeStyle = '#e74c3c';
      ctx.strokeRect(bX, bY, boxSize, boxSize);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 20px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("YOU'VE TAKEN A NOBLE!", width / 2, bY - 20);

      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 16px "Proxima Nova", sans-serif';
      ctx.fillText('+5,000 POINTS!', width / 2, bY + boxSize + 25);

      const btnW = 200;
      const btnH = 44;
      const btnX = (width - btnW) / 2;
      const btnY = bY + boxSize + 45;

      // the button only appears once the whole animation has played
      if (cutsceneTimer < CUTSCENE_BUTTON_FRAME) return;
      ctx.globalAlpha = Math.min(1, (cutsceneTimer - CUTSCENE_BUTTON_FRAME) / 15);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Proxima Nova", sans-serif';
      ctx.fillText('RETURN TO GAME', width / 2, btnY + 27);
      ctx.globalAlpha = 1;
    }

   function renderPauseScreen() {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.88)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 34px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME PAUSED', width / 2, height / 2 - 210);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Proxima Nova", sans-serif';
      ctx.fillText("NOBLE HEADS: " + royalHeads, width / 2, height / 2 - 175);

      const headIconSize = 48;
      const headGap = 10;
      const totalHeadsWidth = (royalHeads * headIconSize) + (Math.max(0, royalHeads - 1) * headGap);
      const startHeadX = (width - Math.min(totalHeadsWidth, width - 40)) / 2;
      const headsY = height / 2 - 160;

      for (let h = 0; h < royalHeads; h++) {
        const hx = startHeadX + (h * (headIconSize + headGap));
        if (hx + headIconSize > width - 10) break;

        ctx.save();
        drawNoble(royalHeadNobles[h] || 0, hx, headsY, headIconSize);
        ctx.lineWidth = 2; ctx.strokeStyle = "#8a1a1a"; ctx.strokeRect(hx, headsY, headIconSize, headIconSize);
        ctx.restore();
      }

      // Enlarged Canvas Buttons
      const btnW = 240;
      const btnH = 56;
      const btnGap = 14;
      const btnX = (width - btnW) / 2;

      const resumeBtnY = height / 2 - 80;
      const saveBtnY = resumeBtnY + btnH + btnGap;
      const loadBtnY = saveBtnY + btnH + btnGap;
      const flipBtnY = loadBtnY + btnH + btnGap;
      const shareBtnY = flipBtnY + btnH + btnGap;

      // RESUME
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(btnX, resumeBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, resumeBtnY, btnW, btnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Proxima Nova", sans-serif';
      ctx.fillText('RESUME GAME', width / 2, resumeBtnY + 34);

      // SAVE
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(btnX, saveBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, saveBtnY, btnW, btnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Proxima Nova", sans-serif';
      ctx.fillText('SAVE CODE', width / 2, saveBtnY + 34);

      // LOAD
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(btnX, loadBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, loadBtnY, btnW, btnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Proxima Nova", sans-serif';
      ctx.fillText('LOAD GAME', width / 2, loadBtnY + 34);

      // FLIP
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(btnX, flipBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, flipBtnY, btnW, btnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Proxima Nova", sans-serif';
      ctx.fillText('CONTROL FLIP', width / 2, flipBtnY + 34);

      // SHARE
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(btnX, shareBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, shareBtnY, btnW, btnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Proxima Nova", sans-serif';
      ctx.fillText('SHARE POST 📸', width / 2, shareBtnY + 34);
    }

    
    function renderGameOverScreen() {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.88)';
      ctx.fillRect(0, 0, width, height);

      if (noHeadContinuePopupTimer > 0) {
        noHeadContinuePopupTimer--;
        const portraitSize = 160;
        const pX = (width - portraitSize) / 2;
        const pY = height / 2 - 140;

        const activeFrame = (Math.floor(Date.now() / 5000) % 2 === 0) ? khaleesiFrame1 : khaleesiFrame2;

        ctx.fillStyle = '#11161d';
        ctx.fillRect(pX, pY, portraitSize, portraitSize);
        if (activeFrame.complete && activeFrame.naturalWidth !== 0) {
          ctx.drawImage(activeFrame, pX, pY, portraitSize, portraitSize);
        }
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#f1c40f';
        ctx.strokeRect(pX, pY, portraitSize, portraitSize);

        const bMargin = 20;
        const bX = bMargin;
        const bY = pY + portraitSize + 20;
        const bW = width - (bMargin * 2);
        const bH = 110;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 12);
        else ctx.fillRect(bX, bY, bW, bH);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px "Proxima Nova", sans-serif';
        ctx.textAlign = 'center';

        const lines = [
          '"I\'m sorry beloved, you can\'t',
          'continue without the severed',
          'head of a royal."'
        ];
        lines.forEach((l, idx) => {
          ctx.fillText(l, width / 2, bY + 32 + (idx * 24));
        });

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px "Proxima Nova", sans-serif';
        ctx.fillText('(Tap anywhere to close)', width / 2, bY + bH + 25);
        return;
      }

      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 34px "Proxima Nova", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', width / 2, height / 2 - 170);

      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 15px "Proxima Nova", sans-serif';
      ctx.fillText("NOBLE HEAD CONTINUES: " + royalHeads, width / 2, height / 2 - 135);

      const headIconSize = 56;
      const headGap = 12;
      const totalHeadsWidth = (royalHeads * headIconSize) + (Math.max(0, royalHeads - 1) * headGap);
      const startHeadX = (width - Math.min(totalHeadsWidth, width - 40)) / 2;
      const headsY = height / 2 - 110;

      for (let h = 0; h < royalHeads; h++) {
        const hx = startHeadX + (h * (headIconSize + headGap));
        if (hx + headIconSize > width - 10) break;

        ctx.save();
        if (h === headFadingIndex) {
          const glow = Math.sin(Date.now() / 40) * 0.5 + 0.5;
          ctx.globalAlpha = headFadeTimer / 35.0;
          ctx.shadowColor = '#f1c40f';
          ctx.shadowBlur = 20 * glow;
        }

        drawNoble(royalHeadNobles[h] || 0, hx, headsY, headIconSize);
        ctx.lineWidth = 2; ctx.strokeStyle = "#8a1a1a"; ctx.strokeRect(hx, headsY, headIconSize, headIconSize);
        ctx.restore();
      }

      const btnW = 200;
      const btnH = 44;
      const btnX = (width - btnW) / 2;

      const continueBtnY = height / 2 - 35;
      const restartBtnY = continueBtnY + 54;
      const loadBtnY = restartBtnY + 54;

      ctx.fillStyle = royalHeads > 0 ? '#2ecc71' : '#7f8c8d';
      ctx.fillRect(btnX, continueBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, continueBtnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Proxima Nova", sans-serif';
      ctx.fillText("CONTINUE (1 NOBLE HEAD)", width / 2, continueBtnY + 27);

      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(btnX, restartBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, restartBtnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Proxima Nova", sans-serif';
      ctx.fillText('RESTART GAME', width / 2, restartBtnY + 27);

      ctx.fillStyle = '#2980b9';
      ctx.fillRect(btnX, loadBtnY, btnW, btnH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(btnX, loadBtnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Proxima Nova", sans-serif';
      ctx.fillText('LOAD GAME', width / 2, loadBtnY + 27);
    }

