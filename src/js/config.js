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

    const khaleesiFrame1 = new Image(); khaleesiFrame1.src = 'assets/images/khaleesi1.png';
    const khaleesiFrame2 = new Image(); khaleesiFrame2.src = 'assets/images/khaleesi2.png';
    const kingFrame1 = new Image(); kingFrame1.src = 'assets/images/king1.png';
    const kingFrame2 = new Image(); kingFrame2.src = 'assets/images/king2.png';
    const queenFrame1 = new Image(); queenFrame1.src = 'assets/images/queen1.png';
    const queenFrame2 = new Image(); queenFrame2.src = 'assets/images/queen2.png';
    const kheadImg = new Image(); kheadImg.src = 'assets/images/khead.png';
    const qheadImg = new Image(); qheadImg.src = 'assets/images/qhead.png';

    const kingFallback1 = createFallbackCanvas(160, 160, '#2c3e50', 'KING 1');
    const kingFallback2 = createFallbackCanvas(160, 160, '#34495e', 'KING 2');
    const queenFallback1 = createFallbackCanvas(160, 160, '#8e44ad', 'QUEEN 1');
    const queenFallback2 = createFallbackCanvas(160, 160, '#9b59b6', 'QUEEN 2');
    const kheadFallback = createFallbackCanvas(160, 160, '#d35400', 'KING HEAD');
    const qheadFallback = createFallbackCanvas(160, 160, '#c0392b', 'QUEEN HEAD');

    const fullStoryText = [
      '"My beloved Syraxx, I have been',
      'captured by the slavers. Burn',
      'their castle to the ground and',
      'find me. You are my heart',
      'and soul. BREAK THE WHEEL!"'
    ];
    let totalCharCount = fullStoryText.join('\n').length;
    let typedCharIndex = 0;
    let textTypingComplete = false;

    let khaleesiBannerTimer = 0;
    let khaleesiBannerText = "";

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
      levelBadge.innerText = `LVL ${currentLevel}`;
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

