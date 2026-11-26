// audio.js — SoundEngine (Web Audio synth + <audio> element playback)
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    const BONK_MIN_GAP = 0.22;   // seconds between peasant bonks
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

      // one second of white noise, made once and reused by the fire and bonk sounds
      noiseBuffer() {
        if (!this._noise) {
          const sr = this.ctx.sampleRate;
          this._noise = this.ctx.createBuffer(1, sr, sr);
          const d = this._noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        return this._noise;
      }

      // Dragon fire: a breathy "fwoosh" (noise swept from bright to dark), a low rumble under it,
      // and a few random crackles. Rapid shots get a lighter version so auto-fire doesn't pile up.
      fireRoar() {
        if (this.muted || this.hidden) return;
        this.init();
        const c = this.ctx;
        if (!c) return;
        const now = c.currentTime;
        const rapid = this._lastFire != null && now - this._lastFire < 0.12;
        this._lastFire = now;
        const vol = rapid ? 0.55 : 1;
        const len = rapid ? 0.32 : 0.5;
        const out = c.createGain();
        out.gain.value = 0.38 * vol;   // kept below the music and other effects
        out.connect(c.destination);

        // the rush of flame
        const src = c.createBufferSource();
        src.buffer = this.noiseBuffer();
        src.playbackRate.value = 0.9 + Math.random() * 0.2;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.7;
        bp.frequency.setValueAtTime(2600, now);
        bp.frequency.exponentialRampToValueAtTime(420, now + len);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 5200;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.22, now + len * 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, now + len);
        src.connect(bp).connect(lp).connect(g).connect(out);
        src.start(now, Math.random() * 0.4);
        src.stop(now + len + 0.05);

        // low body underneath
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(110, now);
        o.frequency.exponentialRampToValueAtTime(48, now + len);
        const og = c.createGain();
        og.gain.setValueAtTime(0.0001, now);
        og.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
        og.gain.exponentialRampToValueAtTime(0.0001, now + len * 0.9);
        o.connect(og).connect(out);
        o.start(now);
        o.stop(now + len);

        // crackles
        if (!rapid) {
          for (let i = 0; i < 5; i++) {
            const t = now + 0.05 + Math.random() * (len - 0.1);
            const cs = c.createBufferSource();
            cs.buffer = this.noiseBuffer();
            const hp = c.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 2500 + Math.random() * 2500;
            const cg = c.createGain();
            cg.gain.setValueAtTime(0.0001, t);
            cg.gain.exponentialRampToValueAtTime(0.12 + Math.random() * 0.1, t + 0.003);
            cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
            cs.connect(hp).connect(cg).connect(out);
            cs.start(t, Math.random() * 0.8);
            cs.stop(t + 0.03);
          }
        }
      }

      // Cartoon "bonk" for peasants knocked flying: a quick falling boing with a woody knock and a click.
      // Pitch varies a little each time. At most one plays every BONK_MIN_GAP seconds.
      bonk() {
        if (this.muted || this.hidden) return;
        this.init();
        const c = this.ctx;
        if (!c) return;
        const now = c.currentTime;
        // one bonk per wing beat: a crowd hit at once (or fast flapping) plays a single bonk, not a trill
        if (this._lastBonk != null && now - this._lastBonk < BONK_MIN_GAP) return;
        this._lastBonk = now;
        const pitch = 0.85 + Math.random() * 0.35;
        const out = c.createGain();
        out.gain.value = 0.6;
        out.connect(c.destination);

        const o = c.createOscillator();             // the boing
        o.type = 'sine';
        o.frequency.setValueAtTime(620 * pitch, now);
        o.frequency.exponentialRampToValueAtTime(150 * pitch, now + 0.13);
        const og = c.createGain();
        og.gain.setValueAtTime(0.0001, now);
        og.gain.exponentialRampToValueAtTime(0.42, now + 0.004);
        og.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        o.connect(og).connect(out);
        o.start(now); o.stop(now + 0.22);

        const w = c.createOscillator();             // woody knock
        w.type = 'triangle';
        w.frequency.setValueAtTime(980 * pitch, now);
        w.frequency.exponentialRampToValueAtTime(420 * pitch, now + 0.05);
        const wg = c.createGain();
        wg.gain.setValueAtTime(0.0001, now);
        wg.gain.exponentialRampToValueAtTime(0.18, now + 0.002);
        wg.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        w.connect(wg).connect(out);
        w.start(now); w.stop(now + 0.08);

        const n = c.createBufferSource();           // impact click
        n.buffer = this.noiseBuffer();
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2200;
        bp.Q.value = 1.2;
        const ng = c.createGain();
        ng.gain.setValueAtTime(0.0001, now);
        ng.gain.exponentialRampToValueAtTime(0.3, now + 0.002);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        n.connect(bp).connect(ng).connect(out);
        n.start(now, Math.random() * 0.8); n.stop(now + 0.04);
      }

      // ---- cathedral encounter (cathedral.js) ----
      // a short ringing tone; used for glass tinkles and the priest's shimmering magic
      _ping(t, freq, vol, dur, type, out) {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + dur + 0.02);
      }

      // the great stained-glass window shattering: a bright crash and a shower of tinkles
      glassShatter() {
        if (this.muted || this.hidden) return;
        this.init();
        const c = this.ctx;
        if (!c) return;
        const now = c.currentTime;
        const out = c.createGain();
        out.gain.value = 0.5;
        out.connect(c.destination);
        const n = c.createBufferSource();
        n.buffer = this.noiseBuffer();
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2400;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.7, now + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        n.connect(hp).connect(g).connect(out);
        n.start(now); n.stop(now + 0.5);
        for (let i = 0; i < 18; i++) {
          this._ping(now + 0.02 + Math.random() * 0.7, 2200 + Math.random() * 4200, 0.05 + Math.random() * 0.08, 0.12 + Math.random() * 0.25, 'sine', out);
        }
      }

      // Cyndraxx's giant breath of flame: a long, deep roar
      bigBreath() {
        if (this.muted || this.hidden) return;
        this.init();
        const c = this.ctx;
        if (!c) return;
        const now = c.currentTime, len = 1.8;
        const out = c.createGain();
        out.gain.value = 0.5;
        out.connect(c.destination);
        const src = c.createBufferSource();
        src.buffer = this.noiseBuffer();
        src.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.6;
        bp.frequency.setValueAtTime(900, now);
        bp.frequency.linearRampToValueAtTime(2200, now + 0.25);
        bp.frequency.exponentialRampToValueAtTime(380, now + len);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.6, now + 0.08);
        g.gain.setValueAtTime(0.5, now + len * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, now + len);
        src.connect(bp).connect(g).connect(out);
        src.start(now); src.stop(now + len + 0.05);
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(70, now);
        o.frequency.exponentialRampToValueAtTime(40, now + len);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 260;
        const og = c.createGain();
        og.gain.setValueAtTime(0.0001, now);
        og.gain.exponentialRampToValueAtTime(0.35, now + 0.1);
        og.gain.exponentialRampToValueAtTime(0.0001, now + len);
        o.connect(lp).connect(og).connect(out);
        o.start(now); o.stop(now + len);
      }

      // the priest's strange power: a glassy, rising shimmer of bell tones
      magicShimmer(dur = 1.6) {
        if (this.muted || this.hidden) return;
        this.init();
        const c = this.ctx;
        if (!c) return;
        const now = c.currentTime;
        const out = c.createGain();
        out.gain.value = 0.35;
        out.connect(c.destination);
        const notes = [1046.5, 1174.7, 1396.9, 1568, 1760, 2093, 2349.3, 2793.8];
        const count = Math.round(dur * 14);
        for (let i = 0; i < count; i++) {
          const t = now + (i / count) * dur;
          const f = notes[Math.floor(Math.random() * notes.length)] * (Math.random() < 0.3 ? 0.5 : 1);
          this._ping(t, f, 0.07, 0.5 + Math.random() * 0.5, 'sine', out);
          this._ping(t, f * 1.003, 0.03, 0.6, 'triangle', out);
        }
      }

      // the teleportation spell: a rushing sweep upward into a bright ring
      teleportWhoosh() {
        if (this.muted || this.hidden) return;
        this.init();
        const c = this.ctx;
        if (!c) return;
        const now = c.currentTime, len = 1.6;
        const out = c.createGain();
        out.gain.value = 0.45;
        out.connect(c.destination);
        const src = c.createBufferSource();
        src.buffer = this.noiseBuffer();
        src.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 2.5;
        bp.frequency.setValueAtTime(250, now);
        bp.frequency.exponentialRampToValueAtTime(6000, now + len);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.6, now + len * 0.8);
        g.gain.exponentialRampToValueAtTime(0.0001, now + len + 0.3);
        src.connect(bp).connect(g).connect(out);
        src.start(now); src.stop(now + len + 0.35);
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(180, now);
        o.frequency.exponentialRampToValueAtTime(1800, now + len);
        const og = c.createGain();
        og.gain.setValueAtTime(0.0001, now);
        og.gain.exponentialRampToValueAtTime(0.18, now + len * 0.7);
        og.gain.exponentialRampToValueAtTime(0.0001, now + len + 0.2);
        o.connect(og).connect(out);
        o.start(now); o.stop(now + len + 0.25);
        this._ping(now + len, 2093, 0.15, 1.2, 'sine', out);
        this._ping(now + len, 3136, 0.08, 1.0, 'sine', out);
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
        if (this.muted || this.hidden || gameState === 'PAUSED') {   // the pause menu is silent
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
        else if (gameState === 'CATHEDRAL') {   // the cathedral cutscene plays the village music
          if (!bgMusicAudio.paused) bgMusicAudio.pause();
          if (!cutsceneMusicAudio.paused) cutsceneMusicAudio.pause();
          if (uiMusicAudio.paused) uiMusicAudio.play().catch(() => {});
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
