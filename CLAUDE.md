# Flappy Dragon Conqueror

Single-page canvas game. Open `index.html` directly (double-click / `file:///` works).

## Layout

- `index.html` — HTML shell: `<audio>` tags, HUD, buttons, modals; loads the CSS and JS below.
- `src/style.css` — all styles. Reference images from here as `../assets/images/<file>`.
- `src/js/` — game code (see below).
- `assets/images/` — only the images the game loads, plus `icon.png`. Big paintings and portraits are JPEGs: storybook pictures (`capture1/2`, `dance1/2`) at 848×1264, king/queen portraits and heads at 512×512, quality 82–85, made with macOS `sips` (e.g. `sips -Z 512 -s format jpeg -s formatOptions 85 in.png --out out.jpg`). The original PNGs are in `archive/source-art/`.
- `assets/audio/` — only the music/SFX the game loads (MP3/WAV/OGG/FLAC), plus the CC0 license note for the wing flap.
- `khaleesi0900.html` — untouched pre-refactor backup.
- `khaleesi0900-bundle.html` — generated single-file build. Don't edit it by hand.
- `archive/` — not used by the game:
  - `old-versions/` — earlier builds and snippets. They expect assets in the root folder, so they won't play sound or show art.
  - `google-play-package/` — the old Android build (.aab/.apk), **including `signing.keystore`**. Keep it: you need that key to publish updates.
  - `store-listing/` — store screenshots.
  - `source-packs/` — downloaded SFX packs, extracted folders, source art (.psd).
  - `source-art/` — full-size original PNGs of the storybook pictures and royal portraits.
  - `unused-assets/` — images and sounds the game doesn't reference. Move one back into `assets/` if you start using it.

## JS files (load order = `<script>` order in index.html)

They're plain classic scripts sharing one global scope. **Don't use ES modules** (`import`/`export`/`type="module"`); they break `file:///`.
Top-level code runs in load order, so anything a file uses *immediately* at load time must already be defined in an earlier file. Function bodies can reference anything.

1. `config.js`: constants, global state variables, DOM element refs, canvas + `resize()`, image loading, dragon/entity arrays
2. `audio.js`: `SoundEngine` class and the `sound` instance
3. `ui.js`: HUD updates, pause, level progression, score/hearts, save codes, share graphic, `resetGame()`
4. `entities.js`: `spawnObstacle()` (castles, archers, knights, trebuchets, Khaleesis, hearts), `triggerBeheadingCutscene()`
5. `input.js`: touch/mouse/keyboard input, menu click handling, button listeners
6. `render-sky.js`: sky gradient, starfield band, twinkling stars, full moon with the real near-side maria and Tycho rays, two cloud layers, far and near parallax castles. Static layers are cached offscreen per size and level (`bgLayer`); `hash2()` gives flicker-free noise.
7. `render-world.js`: ground, ground flames, battlements, archers and arrows
8. `render-characters.js`: Khaleesi, mounted HUD, castle walls (obstacles) with arched wooden doors (`drawWoodenDoor`), collectable hearts
9. `render-dragon.js`: `drawDragon()`, the original blocky sprite from khaleesi0900.html. While the gold shield is held it turns gold, glows, and holds the shield across its belly (`drawHeldShield`).
10. `render-enemies.js`: trebuchets, boulders, `drawKnights()` (villager and royal movement and states)
11. `render-people.js`: villager sprite (random headwear, beard, apron, skin tone; pitchfork or torch) and king/queen sprites
12. `render-masonry.js`: `drawMasonry()`, with 4 cached stone styles (brick, fieldstone, ashlar with quoins, Flemish bond) plus weathering; charred versions get soot and embers
13. `effects.js`: flame renderer, breath, archer detail, particles, debris, floating text
14. `screens.js`: level dialogue, beheading cutscene, game-over screens
15. `boss.js`: siege-engine boss state, geometry, archer spawning, wave helpers and tuning constants, burn helpers
16. `boss-update.js`: `updateBossLogic()`, covering movement, wheels, cannons, archer waves and flame hits
17. `boss-render.js`: boss drawing helpers (open-spoked wheels, the wide wheeled platform `bossChassis`, rear timber-and-steel scaffolding with a crane arm `bossRearScaffold`, stone gargoyles with glowing eyes `bossGargoyle`, etc.), wheel debris (`bossRocks`), and `renderBoss()`
18. `boss-intro.js`: the cinematic between the level 3 fireworks and the boss (state `BOSS_INTRO`): the tower smashes through a distant wall, then the dragon and Khaleesi react. Tap skips it. Also `currentRumbleLevel()` (wheel rumble sound) and `sceneShake()` (camera shake).
19. `knights.js`: small armored knights (level 4+: fire-heat timer, spear thrust), gold knights (level 5: protect/attack actions, grab and drop) and the gold shield the dragon carries (`obstacleHit()`, `dragonShielded()`). The shield also blocks small-knight spears and gold-knight swords, and the dragon turns gold and glows while holding it. Gold knights always act in the order `GK_ACTION_ORDER` (sword swing, shield, charge). Shield blocks call `shieldDeflect()` (clang sound, flash, sparks); arrows bounce off.
20. `treasure.js`: treasure chests (open, locked, smashed treasure), the treasure score multiplier, `clearLevelExtras()`, and the `updateLevelExtras()` / `drawLevelExtras()` / `drawDragonCarried()` hooks that main.js calls
21. `prologue.js`: the two peaceful levels before L1 (meadow `PRO_MEADOW` = -1, village `PRO_VILLAGE` = 0, so `inPrologue()` is `currentLevel <= 0`), Khaleesi's scripted lines (`PRO_SCRIPT`), sheep snatching and the gold pouch, the ballista capture (state `CAPTURE`, timings `CAP_*`) and the "captured" message (state `CAPTURED_MSG`). Also `sunnyScene()`, `fireDisabled()`, `khaleesiRidingNow()`.
22. `render-prologue.js`: sunny sky, sun, clouds, rolling hills (cached tiles), wildflower ground, birds, sheep, shepherds (sitting with a lute or standing with a crook), maypole dancers, thatched huts, wells, hens, village crowds, the slavers' castle with its ballista and knight crew, the capture overlay, and `drawStoryMessage()` (the typed message screens)
23. `main.js`: `triggerHit()`, level celebration, `update()` (physics and collisions), `render()`, `loop()` (starts the game; must stay last)

## Level flow

Opening screen (sunny; Khaleesi invites Syraxx to fly) → start menu → Meadow (100s+) → Village (95s) → ballista capture → "captured by the slavers" message → L1 (90s) → L2 (180s) → L3 (150s) → fireworks → siege-tower cinematic → boss → L4 (240s) → L5 (240s) → victory. Durations are in `LEVEL_DURATIONS` (config.js); the transitions are in `checkLevelProgression()` (ui.js).

- **Prologue (prologue.js):** sunny daytime, rolling ground (`proTerrainH()` / `proGroundY()`, up to `PRO_TERRAIN_MAX` 100px above the flat ground line, lower in the village; sheep, people, huts and the lane follow it), opening-screen music (`uiMusic`) until the net drags them over the wall, then the beheading music (`captureSadMusic()`) for the fall, the story images and the "captured" message, fire disabled (the FIRE button is greyed out), Khaleesi rides on Syraxx's back with no invincibility. Hitting the rolling ground still costs a heart; the top of the screen just stops you. Dying restarts the same prologue level.
  - **Meadow:** sheep, shepherds, birds, maypole dancers. At 66s Khaleesi asks for a sheep; fly low over one to grab it (`PRO_SNATCH_DX`/`DY`). She drops a gold pouch to the nearest shepherd. Eating the sheep refills any lost hearts. The meadow ends after 100s, once the sheep has been eaten, then fades into the village.
  - **Village:** solid thatched huts (touching one costs a heart), crowds that wave at the dragon, children, hens, lute players. At 32s the **spring festival** arrives (`proSpawnFestival()`): a great thatched hall beside a town square with the maypole, bunting and dancing townsfolk, on levelled ground (`proFlats`). Khaleesi suggests landing on the roof and a LAND HERE arrow appears. Touching the hall lands Syraxx on the ridge (no damage); the world stops, the view glides so the hall and square fit, they sing with the crowd, and the FIRE button turns into a blue SING button (`festSing()`: a hop and flap, a burst of notes and hearts, the crowd jumps, a random pentatonic chime from `playSingChime()`), then the storybook shows `dance1.jpg` and `dance2.jpg` (tap to advance), then Khaleesi says they should journey on and Syraxx takes off. The level clock pauses from the festival's arrival until take-off. Missing the roof brings the festival round again. At 95s the slavers' castle rolls in and the capture plays with no player control: the ballista fires a big square net (`drawSquareNet()`) that wraps Syraxx and Khaleesi together, the rope drags them over the wall, then a close-up shows them tumbling through the sky bound in the net (`drawCaptureFall()`), then `assets/images/capture1.png` (Khaleesi cut out of the net and dragged away) and `capture2.png` (Syraxx wakes and escapes), about 4.5s each (`CAP_IMG_FRAMES`) with captions; a tap moves to the next image. The HUD and controls are hidden from the close-up on (`.cinematic`). It ends on the old splash text (`fullStoryText`), then the level 1 intro dialogue.
- **Music:** levels 2 and 5 play the beheading music (`cutsceneMusic`) instead of the normal level music (`updateMusicState()`, audio.js).
- **Small knights** appear from L2 (25% of towers in L2-3, 40% in L4, 60% in L5) and never share a tower with peasants. They need `SK_BURN_FRAMES` (120) of unbroken fire contact to die.
- **L4:** level 3 rules with more small knights. Emerald sky, violet torches, deep red archways.
- **L5:** only the longest towers, no trebuchets, peasants or royals, 3-4 archers per battlement, firing in synchronized "LOOSE!" volleys (`ARCHER_VOLLEY` in render-world.js), small knights plus one gold knight at a time. Golden dusk theme. Khaleesi explains gold knights and the shield on the first encounter, then only 15% of the time (`goldKnightTalk()`, knights.js).
- **Chests** can appear on any level (`CHEST_*` constants in treasure.js). A dropped locked chest breaks from any height: on a tower it leaves a treasure pile to grab, and on a battlement or the ground it pays out at once. They are drawn at `CHEST_SCALE` (2.2x). Every break or pickup plays `showTreasureFX()`. Chests are drawn before archers, peasants, royals and knights (`drawLevelChests()`, called right after the battlements), so a guard next to a treasure is always in front of it. During the level-clear celebration `chestsFollowWorld()` keeps chests on their towers and battlements (and a carried chest with the dragon).
- **Debug keys:** `1`–`5` warp to that level, `6` village just before the festival, `7` meadow, `8` village, `9` ballista capture, `B` starts the boss, `I` plays the boss intro cinematic, `C` plays the level-clear celebration.

## Boss tuning (boss.js / boss-update.js)

- The tower holds its spot on screen but lunges toward the dragon (up to `BOSS_CHASE_AHEAD` of the screen width) and falls back (`BOSS_CHASE_BACK`). The ground scrolls at `BOSS_ROLL_SPEED` (9) and the sky at `BOSS_BG_SPEED` (2.2). The wheels judder, throw dirt and stones, and play a low rumble (`sound.setRumble()`).
- The boss fight plays the beheading music (`cutsceneMusic`).
- Archers come in waves. The first wave is 14 (`BOSS_FIRST_WAVE`), and each later wave adds `BOSS_WAVE_GROWTH` (max `BOSS_MAX_ARCHERS`). The next wave marches out `BOSS_REINFORCE_FRAMES` (8s) after the last one finished climbing, even if it is still alive (unless `BOSS_REINFORCE_MAX_ALIVE` are alive). Wiping out a wave opens the center for `BOSS_WINDOW_FRAMES` before the next wave. Volleys every `BOSS_VOLLEY_CYCLE` frames.
- The center opens while no archer is standing ready on the platform: after a wave is cleared (for `BOSS_WINDOW_FRAMES`), and while the next wave is still climbing.
- Each flame kills one archer, and one breath kills at most `BOSS_KILLS_PER_SHOT` (flames carry a `shotId` set in `shootFire()`).
- Damage per flame is `FLAME_DAMAGE` (0.6, top and bottom cannons) and `MID_DAMAGE` (1.2, center) in `boss-update.js`. Each section has 100 HP. Cannons reload every `BOSS_CANNON_RELOAD` (160) frames.

## Build

```bash
./build.sh
```

This inlines `src/style.css` and `src/js/*.js` (in `index.html` order) into `khaleesi0900-bundle.html` for GitHub Pages and PWABuilder. It uses only stock macOS bash and sed; this Mac has no system Python 3. The bundle still loads media from `assets/`, so deploy it alongside that folder.

## Other behaviors

- **Invincible (Khaleesi riding):** reaching her plays `showKhaleesiSplash()` (render-characters.js), a one-second splash that freezes the game on a snapshot of the last frame. Touching villagers, small knights or gold knights kills them.
- **Hearts refill** to 3 whenever a level is cleared (`startLevelCelebration()`, ui.js, which also covers the boss) and when the meadow ends.
- **Background:** switching to another app or tab (`visibilitychange`/`pagehide`, end of audio.js) pauses all music and sound (`sound.hidden`, AudioContext suspended) and pauses PLAYING or BOSS. Coming back resumes the music for the current screen; the game stays on the pause menu.
- **Resume:** `resumeFromPause()` (ui.js) restores PLAYING or BOSS and gives a free flap.
- **Pause menu:** the save-code modal's RETURN button goes back to the pause menu. The beheading cutscene's RETURN TO GAME button appears only after the animation finishes (`CUTSCENE_BUTTON_FRAME`).
- **Save codes:** 12 characters shown as `XXXX-XXXX-XXXX` (ui.js): score (5 chars, up to 60,466,175), kings (1), queens (1), villagers (3), level (1), check character (1, catches typos). Dashes, spaces and lowercase are ignored when loading, and old 6- and 7-character codes still load. While in the boss fight (or paused in it) the level character is `B` (`SAVE_CODE_BOSS`), and loading that code starts the boss fight. In the prologue the level character is `M` (meadow) or `V` (village). Continues come from the beheaded kings and queens stored in the code.
- **Boss chassis:** the tower rides on a deck wider than the tower (`over` in `bossGeom()`, 16% of the tower width per side) on two big wheels. The stone lower section ends at `deckTop`. The deck and its spiked front beam count as part of the lower section for hits and collisions.
- **Boss:** two archer platforms (`platY` with 3 rows, `platY2` with 2 rows in `bossGeom()`). New archers fill whichever platform has fewer.

## Git / deploy

- Repo: `S0PH0NAX/flappy-flames` (public), branch `main`. GitHub Pages serves `index.html` from the repo root at https://s0ph0nax.github.io/flappy-flames/.
- Commit identity is set per repo to the GitHub noreply address. Don't use a personal email.
- `.gitignore` keeps out `*.keystore`/`*.jks`, `archive/`, `.claude/` and `.DS_Store`. Never commit a signing key; the repo is public.
- PWA files at the root: `manifest.json` (icon is `assets/images/icon.png`), `sw.js` (network-first, cache `flappy-flame-v2`), `screenshot1-4.png`, `.well-known/assetlinks.json` (holds the old signing-key fingerprint; replace it when a new keystore is made).
