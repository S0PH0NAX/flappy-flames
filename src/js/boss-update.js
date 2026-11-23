// boss-update.js — Siege engine boss per-frame logic: movement, cannons, archer waves, flame hits
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

function updateBossLogic() {
  const g = bossGeom();
  bossState.frame++;

  // ---- roll in, then chase: the tower keeps its spot on screen but lunges toward the dragon
  //      and falls back again, so it feels like it's running you down ----
  const restX = width - g.bw;
  const prevX = bossState.x;
  if (!bossState.arrived) {
    bossState.baseX = Math.max(restX, bossState.baseX - 2.4);
    if (bossState.baseX <= restX) bossState.arrived = true;
  } else {
    bossState.chaseTimer--;
    if (bossState.chaseTimer <= 0) {
      const lunge = Math.random() < 0.6;
      bossState.chaseTarget = lunge
        ? -width * BOSS_CHASE_AHEAD * (0.45 + Math.random() * 0.55)
        : width * BOSS_CHASE_BACK * Math.random();
      bossState.chaseTimer = 140 + Math.random() * 160;
    }
    // a stopped (wrecked) base can't chase any more
    const target = bossState.roll > 0.3 ? bossState.chaseTarget : 0;
    bossState.chaseV += (target - bossState.chaseOff) * 0.0022;
    bossState.chaseV *= 0.94;
    bossState.chaseOff += bossState.chaseV;
    bossState.baseX = restX + bossState.chaseOff;
  }
  bossState.swayAmp += ((bossState.arrived ? 1 : 0) - bossState.swayAmp) * 0.02;
  bossState.x = bossState.baseX + Math.sin(bossState.frame * 0.05) * 3 * bossState.swayAmp;
  const moved = prevX - bossState.x;   // + when it moves left on screen

  // heavy rumble: constant judder plus bumps over rough ground
  const rollNow = Math.max(0, bossState.roll);
  if (Math.random() < 0.035 * rollNow) bossState.bump = 2.5 + Math.random() * 3.5;
  bossState.bump *= 0.82;
  bossState.rumbleY = -(Math.abs(Math.sin(bossState.frame * 1.1)) * 1.6 * rollNow + bossState.bump);

  // tower and dragon travel together: the world scrolls past fast, wheels turn with the ground
  const rollTarget = bossState.botHp > 0 ? 1 : 0;
  bossState.roll += (rollTarget - bossState.roll) * 0.02;
  const groundSpeed = BOSS_ROLL_SPEED * bossState.roll;
  bossState.groundScroll += groundSpeed;
  bossState.wheelAngle += (groundSpeed - moved) / g.wheelR;
  backgroundParallaxX += BOSS_BG_SPEED * Math.max(0.15, bossState.roll);

  // wheels kick up dust clouds, dirt clods and stones
  if (bossState.roll > 0.15) {
    g.wheelXs.forEach(wx => {
      const cx = bossState.x + wx;
      if (Math.random() < 0.7 * rollNow) {
        particles.push({
          x: cx - g.wheelR * (0.2 + Math.random() * 0.6), y: g.gY - 4,
          vx: -(2 + Math.random() * 4) * rollNow, vy: -0.4 - Math.random() * 1.4,
          size: 6 + Math.random() * 10, life: 26 + Math.random() * 20,
          color: 'rgba(150,130,100,0.55)', isSmoke: true
        });
      }
      if (Math.random() < 0.5 * rollNow) {
        bossRocks.push({
          x: cx - g.wheelR * (0.1 + Math.random() * 0.5), y: g.gY - 3,
          vx: -(1.5 + Math.random() * 5) * rollNow, vy: -(2.5 + Math.random() * 5.5),
          size: 2 + Math.random() * 4.5, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4,
          color: ['#6b5a44', '#8a7a62', '#5a4a38', '#9a9286', '#4b4038'][Math.floor(Math.random() * 5)],
          bounced: false, life: 90
        });
      }
    });
  }
  for (let i = bossRocks.length - 1; i >= 0; i--) {
    const r = bossRocks[i];
    r.vy += 0.38;
    r.x += r.vx;
    r.y += r.vy;
    r.rot += r.spin;
    r.life--;
    if (r.y >= g.gY - r.size / 2) {
      r.y = g.gY - r.size / 2;
      if (!r.bounced && r.vy > 2) { r.vy *= -0.35; r.bounced = true; }
      else { r.vy = 0; r.vx = -groundSpeed; }   // lands and is carried off with the ground
    }
    if (r.life <= 0 || r.x < -20) bossRocks.splice(i, 1);
  }

  if (bossState.topFlash > 0) bossState.topFlash--;
  if (bossState.midFlash > 0) bossState.midFlash--;
  if (bossState.botFlash > 0) bossState.botFlash--;

  // These normally live in update() AFTER the BOSS early-return, so they never ran:
  if (invulnerableTimer > 0) invulnerableTimer--;

  if (khaleesiMounted) {
    khaleesiTimer--;
    if (khaleesiTimer <= 0) {
      khaleesiMounted = false;
      khaleesiCombo = 0;
      showKhaleesiBanner('"I LOVE YOU ALWAYS, SYRAXX!"', 240);
    }
  }

  // Hold-to-boost (was only implemented for PLAYING)
  if (isHoldingAction) {
    holdTimer++;
    if (holdTimer > 4 && holdTimer < 45) {
      dragon.vx += 0.95;
      dragon.wingState = 0.8;
      sound.whoosh();
    }
  }

  // ----------------------------------------------------
  // DRAGON FLIGHT, GRAVITY & SCREEN BOUNDS IN BOSS MODE
  // ----------------------------------------------------
  dragon.velocity += dragon.gravity;
  dragon.y += dragon.velocity;

  const gY = height - groundHeight;

  // The top of the screen is just a ceiling: stop there, no damage, no recentering.
  if (dragon.y - dragon.size / 2 < 0) {
    dragon.y = dragon.size / 2;
    if (dragon.velocity < 0) dragon.velocity = 0;
  }

  if (dragon.y + dragon.size / 2 >= gY) {
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

  // ----------------------------------------------------
  // CANNONS (top & bottom): wind up, fire a metal sphere
  // ----------------------------------------------------
  if (bossState.topHp <= 0) { bossState.topState = 'IDLE'; bossState.topChainProgress = 0; }
  if (bossState.botHp <= 0) { bossState.botState = 'IDLE'; bossState.botChainProgress = 0; }

  if (bossState.topHp > 0) {
    bossState.topTimer--;
    if (bossState.topTimer <= 0) {
      if (bossState.topState !== 'LAUNCHING') bossMuzzleBlast(g.cyTop);
      bossState.topState = 'LAUNCHING';
      bossState.topChainProgress += 0.02;
      if (bossState.topChainProgress >= 1) {
        bossState.topState = 'IDLE';
        bossState.topChainProgress = 0;
        bossState.topTimer = BOSS_CANNON_RELOAD;
      }
    }
  }

  if (bossState.botHp > 0) {
    bossState.botTimer--;
    if (bossState.botTimer <= 0) {
      if (bossState.botState !== 'LAUNCHING') bossMuzzleBlast(g.cyBot);
      bossState.botState = 'LAUNCHING';
      bossState.botChainProgress += 0.02;
      if (bossState.botChainProgress >= 1) {
        bossState.botState = 'IDLE';
        bossState.botChainProgress = 0;
        bossState.botTimer = BOSS_CANNON_RELOAD;
      }
    }
  }

  const ballHit = (st, progress, cy) => {
    if (st !== 'LAUNCHING' || khaleesiMounted) return;
    const b = bossBall(progress, cy);
    if (Math.hypot(dragon.x - b.x, dragon.y - b.y) < b.r + dragon.size / 2 - 8) triggerHit();
  };
  ballHit(bossState.topState, bossState.topChainProgress, g.cyTop);
  ballHit(bossState.botState, bossState.botChainProgress, g.cyBot);

  // Flying into the tower body hurts too
  if (!khaleesiMounted && dragon.x + dragon.size / 2 - 6 > bossState.x) triggerHit();
  if (!khaleesiMounted && dragon.y + dragon.size / 2 > g.deckTop && dragon.x + dragon.size / 2 - 6 > bossState.x - g.over) triggerHit();

  // ----------------------------------------------------
  // ARCHERS: climb out of the door, up the ladder, onto the platform (up to 50)
  // ----------------------------------------------------
  if (bossState.midHp > 0) {
    const aliveN = bossAliveArchers();
    if (bossState.waveState === 'SPAWNING') {
      bossState.spawnTimer++;
      if (bossState.spawnTimer >= BOSS_WAVE_SPAWN_GAP) {
        bossState.spawnTimer = 0;
        if (bossState.waveToSpawn > 0 && bossSpawnArcher(false)) bossState.waveToSpawn--;
        else bossState.waveToSpawn = 0;
        if (bossState.waveToSpawn <= 0) { bossState.waveState = 'FIGHTING'; bossState.fightTimer = 0; }
      }
    } else if (bossState.waveState === 'FIGHTING') {
      // reinforcements march out after a while even if this wave is still alive;
      // wipe a wave out before they arrive and the center opens up
      bossState.fightTimer = (bossState.fightTimer || 0) + 1;
      if (aliveN > 0 && bossState.fightTimer >= BOSS_REINFORCE_FRAMES && aliveN < BOSS_REINFORCE_MAX_ALIVE) {
        bossState.wave++;
        bossState.waveState = 'SPAWNING';
        bossState.waveToSpawn = bossWaveSize(bossState.wave);
        bossState.spawnTimer = BOSS_WAVE_SPAWN_GAP;
        showKhaleesiBanner('"More archers are coming up the ladder!"', 140);
      } else if (aliveN === 0) {
        bossState.waveState = 'OPEN';
        bossState.clearHold = 0;
        showKhaleesiBanner('"The archers are down! Burn the center, Syraxx!"', 160);
      }
    } else if (bossState.waveState === 'OPEN') {
      bossState.clearHold++;
      if (bossState.clearHold >= BOSS_WINDOW_FRAMES) {
        bossState.wave++;
        bossState.waveState = 'SPAWNING';
        bossState.waveToSpawn = bossWaveSize(bossState.wave);
        bossState.spawnTimer = BOSS_WAVE_SPAWN_GAP;
      }
    }
  } else {
    bossState.archers.forEach(a => bossKillArcher(a));
  }

  const speed = 1.1;
  bossState.archers.forEach(a => {
    a.anim += 1;
    if (a.recoil > 0) a.recoil--;
    if (a.phase === 'DYING') { a.dieT++; return; }

    switch (a.phase) {
      case 'EMERGE':
        a.fade = Math.min(1, a.fade + 0.05);
        a.x -= 0.5;
        if (a.fade >= 1) a.phase = 'TO_LADDER';
        break;
      case 'TO_LADDER':
        a.x -= speed;
        if (a.x <= g.ladderX) { a.x = g.ladderX; a.phase = 'CLIMB'; }
        break;
      case 'CLIMB': {
        if (a.slot < 0) a.slot = bossFreeSlot();
        // queue on the ladder: don't climb into the archer above
        let blocked = false;
        for (let i = 0; i < bossState.archers.length; i++) {
          const b = bossState.archers[i];
          if (b !== a && b.phase === 'CLIMB' && b.y < a.y && a.y - b.y < 17) { blocked = true; break; }
        }
        if (a.slot < 0 && a.y <= g.platY2 + 20) blocked = true;   // no room on either platform yet
        if (!blocked) a.y -= 1.5;
        const climbTo = a.slot >= 0 && g.slots[a.slot] ? g.slots[a.slot].py : g.platY;
        if (a.slot >= 0 && a.y <= climbTo) { a.y = climbTo; a.phase = 'TO_SLOT'; }
        break;
      }
      case 'TO_SLOT': {
        if (a.slot < 0) a.slot = bossFreeSlot();
        if (a.slot < 0) break;
        const s = g.slots[a.slot];
        const ty = s.py + s.dy;
        if (a.y > ty) a.y = Math.max(ty, a.y - 0.5);
        const dir = s.x > a.x ? 1 : -1;
        if (Math.abs(s.x - a.x) > speed) a.x += dir * speed; else a.x = s.x;
        if (a.x === s.x && a.y === ty) a.phase = 'READY';
        break;
      }
    }
  });

  for (let i = bossState.archers.length - 1; i >= 0; i--) {
    const a = bossState.archers[i];
    if (a.phase === 'DYING' && a.dieT >= 24) {
      const colors = ['#2980b9', '#f8c291', '#27ae60', '#e74c3c'];
      for (let p = 0; p < 6; p++) {
        particles.push({
          x: bossState.x + a.x, y: a.y - 12,
          vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3,
          size: 2 + Math.random() * 2, life: 14 + Math.random() * 10,
          color: colors[p % colors.length]
        });
      }
      bossState.archers.splice(i, 1);
    }
  }

  // volleys: a selection of the ready archers draws (glows), then looses with a little stagger
  if (bossState.midHp > 0) {
    bossState.groupShootTimer++;
    const ready = bossState.archers.filter(a => a.phase === 'READY');
    if (bossState.groupShootTimer === BOSS_VOLLEY_CYCLE - 30) {
      const pool = ready.slice().sort(() => Math.random() - 0.5);
      const n = Math.min(pool.length, Math.min(16, 6 + Math.floor(pool.length * 0.25)));
      for (let i = 0; i < n; i++) pool[i].aim = true;
    }
    if (bossState.groupShootTimer >= BOSS_VOLLEY_CYCLE) {
      bossState.groupShootTimer = 0;
      const shooters = bossState.archers.filter(a => a.aim);
      if (shooters.length > 0) {
        bossState.speechBubbleTimer = 60;
        sound.arrowLaunch();
        shooters.forEach(a => { a.fireIn = Math.floor(Math.random() * 26); });
      }
    }
    bossState.archers.forEach(a => {
      if (a.phase !== 'READY' || a.fireIn < 0) return;
      a.fireIn--;
      if (a.fireIn < 0) {
        a.aim = false;
        a.recoil = 8;
        arrows.push({
          x: bossState.x + a.x - 12,
          y: a.y - 14,
          vx: -7.5,
          vy: (Math.random() - 0.5) * 1.5,
          angle: Math.PI,
          life: 180
        });
      }
    });
    if (bossState.speechBubbleTimer > 0) bossState.speechBubbleTimer--;
  }

  // Active arrows travel toward the dragon and trigger damage hits
  arrows.forEach((arr) => {
    arr.x += arr.vx;
    arr.y += arr.vy;
    arr.life--;

    const distToDragon = Math.hypot(dragon.x - arr.x, dragon.y - arr.y);
    if (distToDragon < dragon.size / 2 + 4) {
      if (!khaleesiMounted) {
        triggerHit();
      }
      arr.life = 0;
    }
  });
  arrows = arrows.filter(arr => arr.life > 0 && arr.x > -40 && arr.x < width + 40);

  // ----------------------------------------------------
  // PLAYER FLAMES: shoot archers in the open middle; damage sections otherwise
  // ----------------------------------------------------
  const FLAME_DAMAGE = 0.6;       // top / bottom cannon, per flame hit (was 1.5, 0.85, 0.72)
  const MID_DAMAGE = 1.2;         // center, while no archer is standing ready
  const laneA = g.turretH;
  const laneB = g.baseTop;
  const midOpen = bossMidOpen();

  flames.forEach(f => {
    if (f.hitBoss) return;

    // flames fly through the open timbers; each flame burns exactly one archer,
    // and one breath can only take out a few of them
    if (bossState.midHp > 0 && f.x > bossState.x - 8 && f.y >= laneA && f.y < laneB) {
      const shot = f.shotId || 0;
      const shotUsed = bossState.shotKills[shot] || 0;
      let victim = null, best = 9999;
      bossState.archers.forEach(a => {
        if (a.phase === 'DYING') return;
        const d = Math.hypot(f.x - (bossState.x + a.x), f.y - (a.y - 14));
        if (d < best) { best = d; victim = a; }
      });
      if (victim && best < 16 + f.size * 0.25) {
        if (shotUsed < BOSS_KILLS_PER_SHOT) {
          bossKillArcher(victim);
          bossState.shotKills[shot] = shotUsed + 1;
        }
        f.hitBoss = true;
        f.life = 0;
        bossState.midFlash = 3;
        return;
      }
    }

    // the wide wheeled platform sticks out in front of the tower
    if (f.x <= (f.y >= g.deckTop ? bossState.x - g.over : bossState.x)) return;

    let sec = null, dmg = 0;
    if (f.y < laneA) {
      if (bossState.topHp > 0) { sec = 'top'; dmg = FLAME_DAMAGE; }
    } else if (f.y < laneB) {
      // the center cannot be hurt while archers are standing ready on the platform
      if (midOpen) { sec = 'mid'; dmg = MID_DAMAGE; }
    } else {
      if (bossState.botHp > 0) { sec = 'bot'; dmg = FLAME_DAMAGE; }
    }
    if (!sec) return;

    if (sec === 'top') { bossState.topHp = Math.max(0, bossState.topHp - dmg); bossState.topFlash = 6; }
    else if (sec === 'mid') { bossState.midHp = Math.max(0, bossState.midHp - dmg); bossState.midFlash = 6; }
    else { bossState.botHp = Math.max(0, bossState.botHp - dmg); bossState.botFlash = 6; }

    bossAddSurfaceFlame(sec, f, g);
    f.hitBoss = true;
    f.life = 0;
    for (let p = 0; p < 4; p++) {
      particles.push({
        x: f.x, y: f.y,
        vx: -2 - Math.random() * 4, vy: (Math.random() - 0.5) * 5,
        size: 2 + Math.random() * 3, life: 14 + Math.random() * 8,
        color: Math.random() < 0.5 ? '#f1c40f' : '#e67e22'
      });
    }
  });

  // castle-style burn / char / destroy for each section
  bossUpdateBurn('top', bossState.topHp, g);
  bossUpdateBurn('mid', bossState.midHp, g);
  bossUpdateBurn('bot', bossState.botHp, g);

  if (bossState.burn.top.charred && bossState.burn.mid.charred && bossState.burn.bot.charred) {
    bossState.active = false;
    startLevelCelebration(4, 'BOSS_CLEAR');
  }
}

