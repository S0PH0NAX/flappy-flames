// audio.js — SoundEngine (Web Audio synth + <audio> element playback)
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.muted = false;
        this.isBoostPlaying = false;
        this.hidden = false;   // true while the app is in the background
      }
      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended' && !this.hidden) {
          this.ctx.resume();
        }
      }

      playSoundEffect(audioElem, volume = 0.8) {
        if (this.muted || this.hidden) return;
        if (audioElem && audioElem.src) {
          try {
            audioElem.currentTime = 0;
            audioElem.volume = volume;
            audioElem.play().catch(() => {});
          } catch(e) {}
        }
      }

      stopRoyalSounds() {
        if (sfxQueenEntrance) {
          sfxQueenEntrance.pause();
          sfxQueenEntrance.currentTime = 0;
        }
        if (sfxKingEntrance) {
          sfxKingEntrance.pause();
          sfxKingEntrance.currentTime = 0;
        }
      }

      playFlapSound() {
        if (this.muted || this.hidden || this.isBoostPlaying) return;
        
        if (sfxBoost && sfxBoost.src) {
          this.isBoostPlaying = true;
          sfxBoost.currentTime = 0;
          sfxBoost.volume = 0.4;
          
          const handleEnded = () => {
            this.isBoostPlaying = false;
            sfxBoost.removeEventListener('ended', handleEnded);
          };
          
          sfxBoost.addEventListener('ended', handleEnded);
          
          sfxBoost.play().catch(() => {
            this.isBoostPlaying = false;
          });
        }
      }

      whoosh() {
        this.playFlapSound();
      }

      flap() {
        this.playFlapSound();
      }

      fireRoar() {
    if (this.muted) return;
    this.init();
    
    // Create a low frequency pitch sweep for the fire roar core
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Pitch drop simulation (fire release crackle into low rumble)
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.35);
    
    // Volume envelope (quick attack, smooth decay)
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
}

      towerDestroy() {
        this.playSoundEffect(sfxRockBreak, 0.15);
      }

      boulderLaunch() {
        this.playSoundEffect(sfxBoulder, 0.8);
      }

      arrowLaunch() {
        this.playSoundEffect(sfxArrow, 0.8);
      }

      fireworks() {
        this.playSoundEffect(sfxFireworks, 0.8);
      }

score() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // High two-note chime (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
    osc.frequency.setValueAtTime(880.00, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
}

heartPickup() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Ascending arpeggio chime (C5 -> E5 -> G5)
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.06);
    osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.28);
}

powerup() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Rising pitch sweep
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(950, this.ctx.currentTime + 0.22);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
}

hit() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Low pitch impact drop
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.16);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
}

knightHit() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // High metallic crunch
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
}
      queenEntrance() {
        this.playSoundEffect(sfxQueenEntrance, 0.85);
      }
      kingEntrance() {
        this.playSoundEffect(sfxKingEntrance, 0.85);
      }

      // Low rumbling noise for the siege tower's wheels. level 0..1; 0 fades it out.
      setRumble(level) {
        if (!this.ctx) return;
        if (this.muted) level = 0;
        if (!this.rumbleGain) {
          if (level <= 0) return;
          const sr = this.ctx.sampleRate;
          const buf = this.ctx.createBuffer(1, sr * 2, sr);
          const d = buf.getChannelData(0);
          let last = 0;
          for (let i = 0; i < d.length; i++) {            // brown noise: deep and rolling
            last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
            d[i] = last * 3.5;
          }
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const lp = this.ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 160;
          const throb = this.ctx.createGain();          // wheels thudding over the ground
          throb.gain.value = 0.7;
          const lfo = this.ctx.createOscillator();
          lfo.frequency.value = 6;
          const lfoAmt = this.ctx.createGain();
          lfoAmt.gain.value = 0.3;
          lfo.connect(lfoAmt).connect(throb.gain);
          this.rumbleGain = this.ctx.createGain();
          this.rumbleGain.gain.value = 0;
          src.connect(lp).connect(throb).connect(this.rumbleGain).connect(this.ctx.destination);
          src.start();
          lfo.start();
          this.rumbleLevel = 0;
        }
        if (Math.abs(level - this.rumbleLevel) < 0.01) return;
        this.rumbleLevel = level;
        this.rumbleGain.gain.setTargetAtTime(level * 0.9, this.ctx.currentTime, 0.15);
      }

      updateMusicState(gameState) {
        if (this.muted || this.hidden) {
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!uiMusicAudio.paused) uiMusicAudio.pause();
          if (!cutsceneMusicAudio.paused) cutsceneMusicAudio.pause();
          return;
        }

        // the beheading music: the capture's fall, story images and "captured" message, and levels 2 and 5
        const sadMusic = captureSadMusic() || (gameState === 'PLAYING' && (currentLevel === 2 || currentLevel === 5));
        // the prologue keeps the opening-screen music until the net drags them over the wall
        const prologueMusic = !sadMusic && (gameState === 'START' || gameState === 'CAPTURE' ||
          (inPrologue() && (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAMEOVER')));
        if (sadMusic) {
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!uiMusicAudio.paused) uiMusicAudio.pause();
          if (cutsceneMusicAudio.paused) cutsceneMusicAudio.play().catch(() => {});
        }
        else if (prologueMusic) {
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!cutsceneMusicAudio.paused) cutsceneMusicAudio.pause();
          if (uiMusicAudio.paused) uiMusicAudio.play().catch(() => {});
        }
        else if (gameState === 'BOSS_INTRO') {
          // silence, then the boss music kicks in when the tower smashes through the wall
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!uiMusicAudio.paused) uiMusicAudio.pause();
          if (bossIntroMusicOn() && cutsceneMusicAudio.paused) cutsceneMusicAudio.play().catch(() => {});
        }
        else if (gameState === 'PLAYING' || gameState === 'LEVEL_CELEBRATE') {
          if (!uiMusicAudio.paused) uiMusicAudio.pause();
          if (!cutsceneMusicAudio.paused) cutsceneMusicAudio.pause();
          if (bgMusicAudio.paused) {
            bgMusicAudio.play().catch(() => {});
          }
        } 
        else if (gameState === 'PAUSED' || gameState === 'GAMEOVER' || gameState === 'SPLASH' || gameState === 'LEVEL_DIALOGUE') {
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!cutsceneMusicAudio.paused) cutsceneMusicAudio.pause();
          if (uiMusicAudio.paused) {
            uiMusicAudio.play().catch(() => {});
          }
        } 
        else if (gameState === 'CUTSCENE' || gameState === 'BOSS') {   // the boss fight uses the beheading music
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!uiMusicAudio.paused) uiMusicAudio.pause();
          if (cutsceneMusicAudio.paused) {
            cutsceneMusicAudio.play().catch(() => {});
          }
        }
      }
    }

    const sound = new SoundEngine();

    // Go quiet when the player switches to another app or tab (like a native phone app), and pause the game.
    function onAppHidden() {
      if (sound.hidden) return;
      sound.hidden = true;
      document.querySelectorAll('audio').forEach(a => { if (!a.paused) a.pause(); });
      if (sound.ctx && sound.ctx.state === 'running') sound.ctx.suspend().catch(() => {});
      if (state === 'PLAYING' || state === 'BOSS') togglePauseGame();
    }
    function onAppShown() {
      if (!sound.hidden) return;
      sound.hidden = false;
      if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume().catch(() => {});
      sound.updateMusicState(state);   // music picks back up for the current screen
    }
    document.addEventListener('visibilitychange', () => { document.hidden ? onAppHidden() : onAppShown(); });
    window.addEventListener('pagehide', onAppHidden);
    window.addEventListener('pageshow', () => { if (!document.hidden) onAppShown(); });
