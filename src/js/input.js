// input.js — Click/touch/mouse input, button listeners, modal touch isolation
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    function checkLevelDialogueClick(clientX, clientY) {
      if (state !== 'LEVEL_DIALOGUE') return false;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const pSize = 140;
      const pY = LEVEL_DIALOGUE_PY;
      const isIntroStyle = !!LEVEL_SPEECH[levelDialogueType];
      const statsBoxY = isIntroStyle ? (pY + pSize + 20) : (pY + pSize + 40);
      const statsBoxH = isIntroStyle ? levelSpeechHeight(levelDialogueType) : 175;

      const btnW = 220;
      const btnH = 46;
      const btnX = (width - btnW) / 2;
      const btnY = statsBoxY + statsBoxH + 20;

      if (canvasX >= btnX && canvasX <= btnX + btnW && canvasY >= btnY && canvasY <= btnY + btnH) {
        if (levelDialogueType === 'VICTORY') {
          resetGame();
          state = 'PLAYING';
        } else {
          state = 'PLAYING';
          dragon.velocity = dragon.jump;
          dragon.wingState = 1.0;
          sound.flap();
          announceLevelStart();
        }
        return true;
      }
      return false;
    }

    function checkCutsceneReturnClick(clientX, clientY) {
      if (state !== 'CUTSCENE' || cutsceneTimer < CUTSCENE_BUTTON_FRAME) return false;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const boxSize = 240;
      const bY = height / 2 - 80;
      const btnW = 200;
      const btnH = 44;
      const btnX = (width - btnW) / 2;
      const btnY = bY + boxSize + 45;

      if (canvasX >= btnX && canvasX <= btnX + btnW && canvasY >= btnY && canvasY <= btnY + btnH) {
        state = 'PLAYING';
        dragon.velocity = dragon.jump;
        dragon.wingState = 1.0;
        sound.flap();
        return true;
      }
      return false;
    }

  function checkPauseScreenClick(clickX, clickY) {
      if (state !== 'PAUSED') return false;

      const btnW = 240;
      const btnH = 56;
      const btnGap = 14;
      const btnX = (width - btnW) / 2;

      const resumeBtnY = height / 2 - 80;
      const saveBtnY = resumeBtnY + btnH + btnGap;
      const loadBtnY = saveBtnY + btnH + btnGap;
      const flipBtnY = loadBtnY + btnH + btnGap;
      const shareBtnY = flipBtnY + btnH + btnGap;

      if (clickX >= btnX && clickX <= btnX + btnW) {
        if (clickY >= resumeBtnY && clickY <= resumeBtnY + btnH) {
          resumeFromPause();
          return true;
        }

        if (clickY >= saveBtnY && clickY <= saveBtnY + btnH) {
          saveGame();
          pauseModal.style.display = 'flex';
          return true;
        }

        if (clickY >= loadBtnY && clickY <= loadBtnY + btnH) {
          openLoadGameModal();
          return true;
        }

        if (clickY >= flipBtnY && clickY <= flipBtnY + btnH) {
          isControlFlipped = !isControlFlipped;
          bottomControlsBar.classList.toggle('flipped', isControlFlipped);
          return true;
        }

        if (clickY >= shareBtnY && clickY <= shareBtnY + btnH) {
          generateSharePostGraphic();
          return true;
        }
      }
      return false;
    }
    function checkGameOverClick(clickX, clickY) {
      if (state !== 'GAMEOVER') return false;

      if (noHeadContinuePopupTimer > 0) {
        noHeadContinuePopupTimer = 0;
        return true;
      }

      const btnW = 200;
      const btnH = 44;
      const btnX = (width - btnW) / 2;

      const continueBtnY = height / 2 - 40;
      const restartBtnY = continueBtnY + 54;
      const loadBtnY = restartBtnY + 54;

      if (clickX >= btnX && clickX <= btnX + btnW) {
        if (clickY >= continueBtnY && clickY <= continueBtnY + btnH) {
          if (royalHeads > 0 && headFadingIndex < 0) {
            headFadingIndex = royalHeads - 1;
            headFadeTimer = 35;
          } else if (royalHeads === 0) {
            noHeadContinuePopupTimer = 240;
          }
          return true;
        }

        if (clickY >= restartBtnY && clickY <= restartBtnY + btnH) {
          const proLvl = inPrologue() ? currentLevel : null;   // dying in the prologue restarts that prologue level
          resetGame();
          if (proLvl !== null) startPrologueLevel(proLvl);
          else state = 'PLAYING';
          return true;
        }

        if (clickY >= loadBtnY && clickY <= loadBtnY + btnH) {
          openLoadGameModal();
          return true;
        }
      }
      return false;
    }

    function handleActionPress(clientX, clientY) {
      if (khaleesiSplash) return;   // ignore taps while the Khaleesi splash is up
      sound.init();

      if (state === 'BOSS_INTRO') { skipBossIntro(); return; }
      if (state === 'CAPTURE') { captureTap(); return; }   // no control during the capture; taps only move through the story images

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (clientX !== undefined) ? (clientX - rect.left) * scaleX : undefined;
      const clickY = (clientY !== undefined) ? (clientY - rect.top) * scaleY : undefined;

      if (state === 'CATHEDRAL') { cathedralTap(clickX, clickY); return; }   // cathedral cutscene: advance, REST / FIGHT ON

      if (state === 'LEVEL_DIALOGUE') {
        if (clientX !== undefined && clientY !== undefined) {
          checkLevelDialogueClick(clientX, clientY);
        }
        return;
      }

      if (state === 'CUTSCENE') {
        if (clientX !== undefined && clientY !== undefined) {
          checkCutsceneReturnClick(clientX, clientY);
        }
        return;
      }

      if (state === 'PAUSED') {
        if (clickX !== undefined && clickY !== undefined) {
          checkPauseScreenClick(clickX, clickY);
        }
        return;
      }

      if (state === 'SPLASH') {
        if (!textTypingComplete) {
          typedCharIndex = totalCharCount;
          textTypingComplete = true;
        } else {
          state = 'START';
        }
        return;
      }

      if (state === 'CAPTURED_MSG') {
        if (!textTypingComplete) {
          typedCharIndex = totalCharCount;
          textTypingComplete = true;
        } else {
          levelDialogueType = 'INTRO';
          state = 'LEVEL_DIALOGUE';
        }
        return;
      }

      const btnW = 200;
      const btnX = (width - btnW) / 2;

      if (state === 'START') {
        const startBtnY = height / 2 - 10;
        const loadBtnY = startBtnY + 58;

        if (clickX !== undefined && clickY !== undefined && clickX >= btnX && clickX <= btnX + btnW) {
          if (clickY >= loadBtnY && clickY <= loadBtnY + 44) {
            openLoadGameModal();
            return;
          }
          if (clickY >= startBtnY && clickY <= startBtnY + 44) {
            resetGame();
            startPrologueLevel(PRO_MEADOW);
            return;
          }
        }
        resetGame();
        startPrologueLevel(PRO_MEADOW);
        return;
      }

      if (state === 'GAMEOVER') {
        if (clickX !== undefined && clickY !== undefined) {
          checkGameOverClick(clickX, clickY);
        }
        return;
      }

      if (state === 'PLAYING' && festBusy()) { festTap(); return; }   // resting on the festival roof

      if (state === 'PLAYING' || state === 'BOSS'){
        dragon.velocity = dragon.jump;
        dragon.wingState = 1.0;
        sound.flap();
        if (!isFlapLockActive) {
          shootFire();
        }
        isHoldingAction = true;
        holdTimer = 0;
      }
    }

    function handleActionRelease() {
      isHoldingAction = false;
      holdTimer = 0;
    }

    container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      handleActionPress(touch.clientX, touch.clientY);
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (activeTouches.size === 0) {
        handleActionRelease();
      }
    });

    container.addEventListener('touchcancel', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (activeTouches.size === 0) {
        handleActionRelease();
      }
    });

    container.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      handleActionPress(e.clientX, e.clientY);
    });

    container.addEventListener('mouseup', (e) => {
      handleActionRelease();
    });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1' || e.code === 'Numpad1') {
    debugWarpToLevel(1);
  }
  if (e.code === 'Digit2' || e.code === 'Numpad2') {
    debugWarpToLevel(2);
  }
  if (e.code === 'Digit3' || e.code === 'Numpad3') {
    debugWarpToLevel(3);
  }
  if (e.code === 'Digit4' || e.code === 'Numpad4') {
    debugWarpToLevel(4);
  }
  if (e.code === 'Digit5' || e.code === 'Numpad5') {
    debugWarpToLevel(5);
  }
  if ((e.code === 'Digit6' || e.code === 'Numpad6') && !e.repeat) debugStartFestival();                               // debug: spring festival
  if ((e.code === 'Digit7' || e.code === 'Numpad7') && !e.repeat) { resetGame(); startPrologueLevel(PRO_MEADOW); }   // debug: prologue meadow
  if ((e.code === 'Digit8' || e.code === 'Numpad8') && !e.repeat) { resetGame(); startPrologueLevel(PRO_VILLAGE); }  // debug: prologue village
  if ((e.code === 'Digit9' || e.code === 'Numpad9') && !e.repeat) debugStartCapture();                                // debug: ballista capture
  if (e.code === 'KeyB') triggerBossBattle();
  if (e.code === 'KeyK' && !e.repeat) { debugWarpToLevel(2); levelTimerSeconds = CATH_AT - 4; }   // debug: level 2 just before the cathedral
  if (state === 'CATHEDRAL' && !e.repeat && cathedralKey(e.code)) return;   // R = rest, F = fight on
  if (e.code === 'KeyI' && !e.repeat) { currentLevel = 3; updateLevelBadgeUI(); startBossIntro(); }   // debug: boss intro cinematic

  if (e.code === 'KeyC' && !e.repeat) {
    if (state === 'PLAYING' || state === 'BOSS') {
      startLevelCelebration(currentLevel, 'LEVEL1_CLEAR');
      showKhaleesiBanner('CELEBRATION ANIMATION TRIGGERED!', 180);
    }
  }

  // Allow Flap / Boost in both PLAYING and BOSS modes
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    handleActionPress();
  }

  // Allow Manual Firing in both PLAYING and BOSS modes when Flap-Lock is active
  if (e.code === 'KeyF' && !e.repeat) {
    e.preventDefault();
    sound.init();
    if (festCanSing()) { festSing(); return; }
    if ((state === 'PLAYING' || state === 'BOSS') && isFlapLockActive) {
      shootFire();
    }
  }

  // Allow Mode Toggle in PLAYING and BOSS modes
  if (e.code === 'KeyM' && !e.repeat) {
    e.preventDefault();
    toggleModeSwitch();
  }

  // Allow Pause in PLAYING and BOSS modes
  if (e.code === 'KeyP' && !e.repeat) {
    e.preventDefault();
    togglePauseGame();
  }
});

    function isolateBtnTouch(btn, callback) {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        callback(e);
      }, { passive: false });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        callback(e);
      });
    }

    isolateBtnTouch(toggleFireModeBtn, () => {
      toggleModeSwitch();
    });

    isolateBtnTouch(manualFireBtn, () => {
      sound.init();
      if (festCanSing()) { festSing(); return; }   // on the festival roof the button sings
      if (state === 'PLAYING' || state === 'BOSS') {
        shootFire();
      }
    });

    isolateBtnTouch(pauseBtn, () => {
      togglePauseGame();
    });

    isolateBtnTouch(closeSaveModalBtn, () => {
      pauseModal.style.display = 'none';
      // back to the pause menu, not straight into the game
    });

    isolateBtnTouch(closeShareModalBtn, () => {
      shareModal.style.display = 'none';
    });

    isolateBtnTouch(copyCodeBtn, () => {
      const textToCopy = saveCodeDisplay.innerText.trim();
      if (!textToCopy || textToCopy === '-------') return;

      const setCopySuccessVisual = () => {
        const origText = copyCodeBtn.innerText;
        copyCodeBtn.innerText = 'COPIED!';
        copyCodeBtn.style.background = '#2ecc71';
        setTimeout(() => {
          copyCodeBtn.innerText = origText;
          copyCodeBtn.style.background = '';
        }, 1500);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(setCopySuccessVisual).catch(() => {
          fallbackCopyText(textToCopy, setCopySuccessVisual);
        });
      } else {
        fallbackCopyText(textToCopy, setCopySuccessVisual);
      }
    });

    function fallbackCopyText(text, successCallback) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        if (successCallback) successCallback();
      } catch (err) {
        alert("Copy failed. Please manually select and copy: " + text);
      }
      document.body.removeChild(textArea);
    }

    isolateBtnTouch(downloadShareBtn, () => {
      if (!shareCanvas) return;

      shareCanvas.toBlob((blob) => {
        if (!blob) return;

        const blobUrl = URL.createObjectURL(blob);

        if (navigator.canShare && navigator.share) {
          const file = new File([blob], 'conqueror.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: 'Flappy Dragon Conqueror',
              text: `I scored ${score} pts in Flappy Dragon Conqueror!`
            }).catch(() => {});
          }
        }

        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = blobUrl;
        downloadAnchor.download = 'conqueror.png';
        downloadAnchor.target = '_blank';
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);

        setTimeout(() => {
          window.open(blobUrl, '_blank');
        }, 100);

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 10000);
      }, 'image/png');
    });

    isolateBtnTouch(soundBtn, () => {
      sound.muted = !sound.muted;
      soundBtn.innerText = sound.muted ? '🔇' : '🔊';
      sound.updateMusicState(state);
    });

    isolateBtnTouch(confirmLoadBtn, () => {
      const code = loadCodeInput.value.trim();
      if (code && loadSaveCode(code)) {
        loadModal.style.display = 'none';
        pauseModal.style.display = 'none';
        state = 'PLAYING';
        if (saveCodeBoss) triggerBossBattle();   // a boss code drops you straight into the siege-tower fight
        else if (inPrologue()) startPrologueLevel(currentLevel);
      } else {
        alert("Invalid save code!");
      }
    });

    isolateBtnTouch(cancelLoadBtn, () => {
      loadModal.style.display = 'none';
    });

    pauseModal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    pauseModal.addEventListener('touchend', (e) => e.stopPropagation(), { passive: false });
    pauseModal.addEventListener('mousedown', (e) => e.stopPropagation());

    shareModal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    shareModal.addEventListener('touchend', (e) => e.stopPropagation(), { passive: false });
    shareModal.addEventListener('mousedown', (e) => e.stopPropagation());

    loadModal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    loadModal.addEventListener('touchend', (e) => e.stopPropagation(), { passive: false });
    loadModal.addEventListener('mousedown', (e) => e.stopPropagation());

