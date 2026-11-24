// config.js — Constants, global state, DOM references, canvas setup, image loading
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }

    function createFallbackCanvas(width, height, color, label) {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const x = c.getContext('2d');
      x.fillStyle = color;
      x.fillRect(0, 0, width, height);
      x.fillStyle = '#ffffff';
      x.font = 'bold 12px sans-serif';
      x.textAlign = 'center';
      x.fillText(label, width / 2, height / 2);
      const img = new Image();
      img.src = c.toDataURL();
      return img;
    }

    const bgMusicAudio = document.getElementById('bgMusic');
    const uiMusicAudio = document.getElementById('uiMusic');
    const cutsceneMusicAudio = document.getElementById('cutsceneMusic');

    const sfxBoost = document.getElementById('sfxBoost');
    const sfxRockBreak = document.getElementById('sfxRockBreak');
    const sfxArrow = document.getElementById('sfxArrow');
    const sfxBoulder = document.getElementById('sfxBoulder');
    const sfxQueenEntrance = document.getElementById('sfxQueenEntrance');
    const sfxKingEntrance = document.getElementById('sfxKingEntrance');
    const sfxFireworks = document.getElementById('sfxFireworks');

    bgMusicAudio.volume = 0.25;
    uiMusicAudio.volume = 0.25;
    cutsceneMusicAudio.volume = 0.25;

    const khaleesiFrame1 = new Image(); khaleesiFrame1.src = 'assets/images/sarai1.jpg';
    const khaleesiFrame2 = new Image(); khaleesiFrame2.src = 'assets/images/sarai2.jpg';
    // Noble portraits for the beheading screen and the severed-head inventory.
    // face = [centerX, centerY, size] of the head crop; full = [x, y, size] of the square portrait crop (720px images).
    const NOBLES = [
      { src: 'noble1.jpg', face: [290, 140, 150], full: [0, 0, 535], female: false },
      { src: 'noble2.jpg', face: [235, 105, 140], full: [0, 0, 501], female: false },
      { src: 'noble3.jpg', face: [330, 140, 260], full: [0, 0, 580], female: false },
      { src: 'noble4.jpg', face: [287, 270, 300], full: [0, 60, 573], female: true },
      { src: 'noble5.jpg', face: [320, 345, 320], full: [0, 0, 720], female: true },
      { src: 'noble6.jpg', face: [245, 360, 300], full: [0, 60, 550], female: true },
      { src: 'noble7.jpg', face: [203, 215, 260], full: [0, 20, 378], female: false }
    ];
    const nobleImgs = NOBLES.map(n => { const im = new Image(); im.src = 'assets/images/' + n.src; return im; });
    // type 'QUEEN' picks a woman's portrait, anything else a man's.
    function randomNoble(type) {
      const want = type === 'QUEEN';
      const pool = NOBLES.map((n, i) => i).filter(i => NOBLES[i].female === want);
      return pool[Math.floor(Math.random() * pool.length)];
    }
    // Draw noble i into the square (x, y, s). zoom 0 = the whole portrait, 1 = just the head.
    function drawNoble(i, x, y, s, zoom = 1) {
      const n = NOBLES[i] || NOBLES[0], im = nobleImgs[i] || nobleImgs[0];
      if (!im.complete || !im.naturalWidth) {
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x, y, s, s);
        return;
      }
      const f = n.face, p = n.full;
      const fx = f[0] - f[2] / 2, fy = f[1] - f[2] / 2;
      const sx = p[0] + (fx - p[0]) * zoom, sy = p[1] + (fy - p[1]) * zoom, ss = p[2] + (f[2] - p[2]) * zoom;
      ctx.drawImage(im, sx, sy, ss, ss, x, y, s, s);
    }


    // Set a bold font of up to px pixels, shrunk so text fits in maxW.
    function fitFont(text, px, maxW) {
      ctx.font = 'bold ' + px + 'px "Proxima Nova", sans-serif';
      const w = ctx.measureText(text).width;
      if (w > maxW) ctx.font = 'bold ' + Math.floor(px * maxW / w) + 'px "Proxima Nova", sans-serif';
    }

    // Speech bubbles sized to their text: as wide as the longest line plus padding, as tall as the lines.
    const SPEECH_PAD_X = 18, SPEECH_PAD_Y = 13;
    function speechBoxHeight(n, px, lineH) { return SPEECH_PAD_Y * 2 + (n - 1) * lineH + px; }
    // Draws a white rounded bubble centred on cx with its top at y. `shown` (optional) limits how many
    // characters are typed out so far; the box is always sized for the full text so it doesn't grow.
    function drawSpeechBox(lines, cx, y, px, lineH, color, shown) {
      ctx.font = 'bold ' + px + 'px "Proxima Nova", sans-serif';
      let longest = 0;
      lines.forEach(l => { longest = Math.max(longest, ctx.measureText(l).width); });
      const w = Math.min(width - 24, Math.ceil(longest) + SPEECH_PAD_X * 2);
      const h = speechBoxHeight(lines.length, px, lineH);
      const x = cx - w / 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12); else ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.fillStyle = color || '#000000';
      ctx.textAlign = 'center';
      let left = shown == null ? Infinity : shown;
      lines.forEach((l, i) => {
        const part = left >= l.length ? l : l.slice(0, Math.max(0, left));
        left -= l.length + 1;
        ctx.fillText(part, cx, y + SPEECH_PAD_Y + px * 0.8 + i * lineH);
      });
      return { x: x, y: y, w: w, h: h };
    }

    const fullStoryText = [
      '"My beloved Cyndraxx, I have been',
      'captured by the slavers. Burn',
      'their castle to the ground and',
      'find me. You are my heart',
      'and soul. BREAK EVERY CHAIN!"'
    ];
    let totalCharCount = fullStoryText.join('\n').length;
    let typedCharIndex = 0;
    let textTypingComplete = false;

    let khaleesiBannerTimer = 0;
    let khaleesiBannerText = "";
    let hudBubbleBottom = 0;   // bottom of Khaleesi's speech bubble this frame (0 = none), so HUD extras can sit below it

    let currentLevel = 1;
    let levelTimerSeconds = 0;
    const LEVEL_DURATIONS = {
      1: 90,
      2: 180,
      3: 150,   // shortened; the end of level 3 starts the siege-tower boss
      4: 240,
      5: 240
    };
    const FINAL_LEVEL = 5;

    let level2KhaleesiSpawned = false;
    let level2RoyalSpawned = false;

    let celebrationTimer = 0;
    let celebrationAngle = 0;
    let celebrationFadeAlpha = 0;

    const gameStats = {
      burnedTowers: 0,
      villagersKilled: 0,
      archersKilled: 0,
      trebuchetsDestroyed: 0,
      kingsBeheaded: 0,
      queensBeheaded: 0,
      khaleesiRescues: 0
    };

    function showKhaleesiBanner(text, duration = 200) {
      khaleesiBannerText = text;
      khaleesiBannerTimer = duration;
    }

    function updateLevelBadgeUI() {
      const progressBarFill = document.getElementById('progressBarFill');
      if (state === "BOSS") {
        levelBadge.innerText = "BOSS";
        if (progressBarFill) progressBarFill.style.width = "100%";
        return;
      }
      if (currentLevel > FINAL_LEVEL) {
        levelBadge.innerText = "VICTORY!";
        if (progressBarFill) progressBarFill.style.width = '100%';
        return;
      }
      levelBadge.innerText = currentLevel <= 0 ? proLevelName(currentLevel) : `LVL ${currentLevel}`;
      const maxSecs = LEVEL_DURATIONS[currentLevel] || 90;
      const progressPercent = Math.min(100, Math.max(0, (levelTimerSeconds / maxSecs) * 100));
      if (progressBarFill) {
        progressBarFill.style.width = `${progressPercent}%`;
      }
    }


    const container = document.getElementById('game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const levelBadge = document.getElementById('levelBadge');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const heartsDisplay = document.getElementById('heartsDisplay');
    const heartsText = document.getElementById('heartsText');
    const headsText = document.getElementById('headsText');

    const bottomControlsBar = document.getElementById('bottomControlsBar');
    const toggleFireModeBtn = document.getElementById('toggleFireModeBtn');
    const manualFireBtn = document.getElementById('manualFireBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const soundBtn = document.getElementById('soundBtn');

    const pauseModal = document.getElementById('pauseModal');
    const saveCodeDisplay = document.getElementById('saveCodeDisplay');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const closeSaveModalBtn = document.getElementById('closeSaveModalBtn');

    const shareModal = document.getElementById('shareModal');
    const shareCanvas = document.getElementById('shareCanvas');
    const downloadShareBtn = document.getElementById('downloadShareBtn');
    const closeShareModalBtn = document.getElementById('closeShareModalBtn');

    const loadModal = document.getElementById('loadModal');
    const loadCodeInput = document.getElementById('loadCodeInput');
    const confirmLoadBtn = document.getElementById('confirmLoadBtn');
    const cancelLoadBtn = document.getElementById('cancelLoadBtn');

    let state = 'SPLASH';
    let levelDialogueType = 'INTRO';
    let score = 0;
    let lives = 3;
    let royalHeads = 0;
    let royalHeadTypes = [];
    let royalHeadNobles = [];   // which noble portrait (NOBLES index) each collected head shows
    let cutsceneNoble = 0;      // the noble shown on the beheading screen
    let invulnerableTimer = 0;
    let isHoldingAction = false;

    let isFlapLockActive = true;
    let isControlFlipped = false;

    let holdTimer = 0;
    let backgroundParallaxX = 0;
    let lastSpawnedBattlementHeight = 0;

    let khaleesiMounted = false;
    let khaleesiTimer = 0;
    let khaleesiCombo = 0;
    const KHALEESI_MAX_TIME = 600;

    let cutsceneTarget = 'KING';
    let cutsceneTimer = 0;
    let noHeadContinuePopupTimer = 0;
    let headFadingIndex = -1;
    let headFadeTimer = 0;

    const activeTouches = new Map();

    let width, height;
    function resize() {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    const dragon = {
      x: 80,
      targetX: 80,
      baseX: 80,
      y: 300,
      velocity: 0,
      vx: 0,
      gravity: 0.24,
      jump: -5.4,
      size: 44,
      wingState: 0
    };

    const stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 400,
      size: Math.random() < 0.2 ? 3 : 1,
      speed: 0.1 + Math.random() * 0.2,
      alpha: 0.3 + Math.random() * 0.7
    }));

    let obstacles = [];
    let battlements = [];
    let archers = [];
    let arrows = [];
    let particles = [];
    let flames = [];
    let knights = [];
    let khaleesis = [];
    let trebuchets = [];
    let trebuchetBoulders = [];
    let collectableHearts = [];
    let floatingTexts = [];
    let groundFlames = [];
    let blackDebris = [];
    const groundHeight = 80;

    const stonePalette = { main: '#2c3e50', dark: '#1a252f', light: '#3e5871' };
    const charPalette = { main: '#11161d', dark: '#080b0e', light: '#222f3d' };

    const peasantCostumes = [
      { tunic: '#e67e22', pants: '#7f8c8d', hair: '#d35400' },
      { tunic: '#2ecc71', pants: '#34495e', hair: '#f39c12' },
      { tunic: '#9b59b6', pants: '#2c3e50', hair: '#e74c3c' },
      { tunic: '#f1c40f', pants: '#7f8c8d', hair: '#8e44ad' },
      { tunic: '#1abc9c', pants: '#34495e', hair: '#d35400' }
    ];

