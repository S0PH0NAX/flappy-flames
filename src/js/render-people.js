// render-people.js — Villager and royal sprites (used by drawKnights in render-enemies.js)
// Classic script: shares global scope with the other src/js files. Load order matters (see index.html).

    // ==========================================
    // VILLAGER & ROYAL SPRITES
    // Drawn in a 22 x 34 box: x 0..22, y -8..26 (feet on y = 26), facing right.
    // ==========================================
    const SKIN_TONES = ['#f8c291', '#e0a878', '#c68642', '#8d5524', '#f1d0b0'];

    function shadeHex(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, Math.min(255, (n >> 16) + amt));
      const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
      const b = Math.max(0, Math.min(255, (n & 255) + amt));
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    }

    function villagerLook(k) {
      if (!k.look) {
        k.look = {
          hat: Math.floor(Math.random() * 4),          // 0 hair, 1 straw hat, 2 hood, 3 bandana
          beard: Math.random() < 0.35,
          skin: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
          apron: Math.random() < 0.3
        };
      }
      return k.look;
    }

    function drawVillagerSprite(k, legMove, armSwing) {
      const c = k.costume || peasantCostumes[0];
      const L = villagerLook(k);
      const out = '#1b1410';
      const tunicDark = shadeHex(c.tunic, -45);
      const pantsDark = shadeHex(c.pants, -35);

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(11, 26, 9, 2.2, 0, 0, Math.PI * 2); ctx.fill();

      // back arm
      ctx.fillStyle = tunicDark;
      ctx.fillRect(5 - armSwing * 0.5, 7, 3, 8);
      ctx.fillStyle = L.skin;
      ctx.fillRect(5 - armSwing * 0.5, 14, 3, 2);

      // legs + boots
      ctx.fillStyle = pantsDark;
      ctx.fillRect(7 - legMove, 17, 4, 6);
      ctx.fillStyle = c.pants;
      ctx.fillRect(11 + legMove, 17, 4, 6);
      ctx.fillStyle = '#3b2616';
      ctx.fillRect(6 - legMove, 23, 5, 3);
      ctx.fillRect(11 + legMove, 23, 6, 3);
      ctx.fillStyle = '#5a3c24';
      ctx.fillRect(12 + legMove, 23, 4, 1);

      // tunic with shading, collar and belt
      ctx.fillStyle = out;
      ctx.fillRect(5, 5, 12, 14);
      ctx.fillStyle = c.tunic;
      ctx.fillRect(6, 6, 10, 12);
      ctx.fillStyle = tunicDark;
      ctx.fillRect(6, 6, 3, 12);
      ctx.fillRect(6, 17, 10, 1);
      ctx.fillStyle = shadeHex(c.tunic, 35);
      ctx.fillRect(13, 6, 2, 8);
      if (L.apron) {
        ctx.fillStyle = '#d9d2bf';
        ctx.fillRect(9, 12, 7, 6);
        ctx.fillStyle = '#b3aa92';
        ctx.fillRect(9, 17, 7, 1);
      }
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(6, 13, 10, 2);
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(12, 13, 2, 2);
      // long skirt (women in the prologue crowds)
      if (k.dress) {
        ctx.fillStyle = out;
        ctx.beginPath(); ctx.moveTo(5, 13); ctx.lineTo(17, 13); ctx.lineTo(20, 24); ctx.lineTo(2, 24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.tunic;
        ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(16, 14); ctx.lineTo(19, 23); ctx.lineTo(3, 23); ctx.closePath(); ctx.fill();
        ctx.fillStyle = tunicDark;
        ctx.fillRect(3, 21, 16, 2);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(6, 13, 10, 2);
      }
      // neckline
      ctx.fillStyle = L.skin;
      ctx.fillRect(10, 5, 3, 2);

      // head
      ctx.fillStyle = out;
      ctx.fillRect(6, -4, 11, 10);
      ctx.fillStyle = L.skin;
      ctx.fillRect(7, -3, 9, 8);
      ctx.fillRect(16, 0, 1, 2);                  // nose
      ctx.fillStyle = shadeHex(L.skin, -30);
      ctx.fillRect(7, 3, 2, 2);                   // cheek shade
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(13, -1, 2, 2);                 // eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(13, -1, 1, 1);
      ctx.fillStyle = shadeHex(L.skin, -60);
      ctx.fillRect(13, 3, 3, 1);                  // mouth

      if (L.beard) {
        ctx.fillStyle = c.hair;
        ctx.fillRect(8, 2, 9, 4);
        ctx.fillRect(10, 5, 5, 2);
        ctx.fillStyle = L.skin;
        ctx.fillRect(13, 3, 3, 1);
      }

      // hair / headwear
      if (L.hat === 1) {
        ctx.fillStyle = '#c9a54a';
        ctx.fillRect(3, -5, 17, 2);
        ctx.fillStyle = '#e3c26a';
        ctx.fillRect(7, -9, 10, 5);
        ctx.fillStyle = '#9c2a2a';
        ctx.fillRect(7, -6, 10, 1);
        ctx.fillStyle = '#a8862f';
        ctx.fillRect(3, -4, 17, 1);
      } else if (L.hat === 2) {
        ctx.fillStyle = tunicDark;
        ctx.fillRect(5, -6, 11, 4);
        ctx.fillRect(5, -6, 4, 11);
        ctx.fillStyle = shadeHex(c.tunic, -20);
        ctx.fillRect(7, -6, 8, 2);
      } else if (L.hat === 3) {
        ctx.fillStyle = c.hair;
        ctx.fillRect(6, -2, 3, 5);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(6, -6, 11, 4);
        ctx.fillRect(3, -4, 4, 2);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(10, -5, 1, 1); ctx.fillRect(14, -5, 1, 1);
      } else {
        ctx.fillStyle = c.hair;
        ctx.fillRect(6, -6, 11, 4);
        ctx.fillRect(6, -3, 3, 6);
        ctx.fillRect(15, -3, 2, 1);
        ctx.fillStyle = shadeHex(c.hair, 40);
        ctx.fillRect(9, -6, 5, 1);
      }

      // front arm + tool
      const handY = 12 + armSwing * 0.5;
      if (k.wave) {
        // arm raised, waving (prologue crowds and dancers)
        const sway = Math.sin(Date.now() / 110 + (k.phase || 0)) * 2;
        ctx.fillStyle = c.tunic;
        ctx.fillRect(14, 1, 3, 7);
        ctx.fillStyle = L.skin;
        ctx.fillRect(15 + sway, -4, 3, 5);
        if (k.tool && k.tool !== 'none') drawVillagerTool(k, L, handY);
        return;
      }
      ctx.fillStyle = c.tunic;
      ctx.fillRect(14, 7, 3, 6);
      ctx.fillStyle = L.skin;
      ctx.fillRect(16, handY - 1, 3, 3);

      if (k.hasPitchfork) {
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(18, -2, 2, 26);
        ctx.fillStyle = '#8a5a30';
        ctx.fillRect(18, -2, 1, 26);
        ctx.fillStyle = '#9aa4ad';
        ctx.fillRect(15, -4, 8, 2);
        ctx.fillRect(15, -10, 2, 6);
        ctx.fillRect(18, -11, 2, 7);
        ctx.fillRect(21, -10, 2, 6);
        ctx.fillStyle = '#d5dde3';
        ctx.fillRect(15, -10, 1, 1); ctx.fillRect(18, -11, 1, 1); ctx.fillRect(21, -10, 1, 1);
      } else if (k.tool) {
        drawVillagerTool(k, L, handY);   // prologue: crook, basket, lute or nothing
      } else {
        ctx.fillStyle = '#5a3a1e';
        ctx.fillRect(18, 0, 2, 16);
        ctx.fillStyle = '#3d2a1a';
        ctx.fillRect(17, -1, 4, 3);
        drawFlame(19, 0, 9, 16, (k.relX || 0) * 0.3 + 1.7, 1);
      }
      ctx.fillStyle = L.skin;
      ctx.fillRect(17, handY - 1, 2, 3);
    }

    function drawRoyalSprite(k, bob) {
      const isKing = k.royalType === 'KING';
      const out = '#1b1410';
      const robe = isKing ? '#6a2c91' : '#b3172e';
      const robeDark = shadeHex(robe, -45);
      const robeLight = shadeHex(robe, 40);
      const gold = '#f4c430';
      const goldDark = '#b8860b';
      const skin = '#f3c79e';

      ctx.save();
      ctx.translate(0, bob);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(11, 26 - bob, 11, 2.4, 0, 0, Math.PI * 2); ctx.fill();

      // long robe / gown, flared at the hem
      ctx.fillStyle = out;
      ctx.beginPath();
      ctx.moveTo(5, 2); ctx.lineTo(17, 2); ctx.lineTo(isKing ? 20 : 22, 26); ctx.lineTo(isKing ? 2 : 0, 26);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = robe;
      ctx.beginPath();
      ctx.moveTo(6, 3); ctx.lineTo(16, 3); ctx.lineTo(isKing ? 19 : 21, 25); ctx.lineTo(isKing ? 3 : 1, 25);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = robeDark;
      ctx.beginPath();
      ctx.moveTo(6, 3); ctx.lineTo(9, 3); ctx.lineTo(7, 25); ctx.lineTo(isKing ? 3 : 1, 25);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = robeLight;
      ctx.fillRect(13, 6, 2, 16);
      // gold hem + center trim
      ctx.fillStyle = gold;
      ctx.fillRect(isKing ? 3 : 1, 23, isKing ? 16 : 20, 2);
      ctx.fillRect(10, 8, 2, 15);
      ctx.fillStyle = goldDark;
      for (let i = 0; i < 4; i++) ctx.fillRect(isKing ? 5 + i * 4 : 3 + i * 5, 24, 1, 1);

      // ermine cape / collar: white with black tail spots
      ctx.fillStyle = out;
      ctx.fillRect(3, 1, 16, 7);
      ctx.fillStyle = '#f7f3ea';
      ctx.fillRect(4, 2, 14, 5);
      ctx.fillStyle = '#d8d0bf';
      ctx.fillRect(4, 6, 14, 1);
      ctx.fillStyle = '#111';
      [[6, 3], [10, 4], [14, 3], [8, 5], [16, 5]].forEach(p => ctx.fillRect(p[0], p[1], 1, 2));
      if (!isKing) {
        // necklace
        ctx.fillStyle = gold;
        ctx.fillRect(8, 7, 6, 1);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(10, 8, 2, 2);
      }

      // head
      ctx.fillStyle = out;
      ctx.fillRect(6, -9, 11, 11);
      ctx.fillStyle = skin;
      ctx.fillRect(7, -8, 9, 9);
      ctx.fillRect(16, -5, 1, 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(13, -6, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(13, -6, 1, 1);
      ctx.fillStyle = '#e58e8e';
      ctx.fillRect(12, -3, 2, 1);

      if (isKing) {
        // grey beard + moustache, hair at the back
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(7, -9, 4, 8);
        ctx.fillRect(8, -3, 9, 5);
        ctx.fillRect(10, 1, 6, 3);
        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(12, -3, 4, 1);
        ctx.fillRect(8, 1, 2, 1);
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(16, -2, 1, 2);
      } else {
        // long auburn hair falling down the back
        ctx.fillStyle = '#8e3b1f';
        ctx.fillRect(5, -9, 6, 4);
        ctx.fillRect(5, -9, 4, 18);
        ctx.fillRect(7, -10, 9, 3);
        ctx.fillStyle = '#b65530';
        ctx.fillRect(6, -6, 1, 12);
        ctx.fillRect(9, -10, 5, 1);
      }

      // crown with gems
      ctx.fillStyle = out;
      if (isKing) {
        ctx.fillRect(5, -14, 13, 6);
        ctx.fillStyle = gold;
        ctx.fillRect(6, -12, 11, 3);
        ctx.fillRect(6, -15, 2, 3); ctx.fillRect(10, -16, 3, 4); ctx.fillRect(15, -15, 2, 3);
        ctx.fillStyle = goldDark;
        ctx.fillRect(6, -10, 11, 1);
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(11, -11, 1, 1);
        ctx.fillStyle = '#3498db'; ctx.fillRect(8, -11, 1, 1); ctx.fillRect(14, -11, 1, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(11, -16, 1, 1);
      } else {
        ctx.fillRect(7, -14, 9, 5);
        ctx.fillStyle = gold;
        ctx.fillRect(8, -12, 7, 2);
        ctx.fillRect(8, -15, 1, 3); ctx.fillRect(11, -17, 1, 5); ctx.fillRect(14, -15, 1, 3);
        ctx.fillStyle = '#e84393'; ctx.fillRect(11, -12, 1, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(11, -18, 1, 1); ctx.fillRect(8, -16, 1, 1); ctx.fillRect(14, -16, 1, 1);
      }

      // arm + scepter
      ctx.fillStyle = robe;
      ctx.fillRect(15, 6, 3, 7);
      ctx.fillStyle = skin;
      ctx.fillRect(17, 10, 3, 3);
      ctx.fillStyle = goldDark;
      ctx.fillRect(19, -6, 2, 22);
      ctx.fillStyle = gold;
      ctx.fillRect(19, -6, 1, 22);
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(20, -8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isKing ? '#3498db' : '#e84393';
      ctx.fillRect(19, -9, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(19, -10, 1, 1);
      // a little sparkle so royals stand out from villagers
      const sp = (Date.now() / 300 + (k.relX || 0)) % 6;
      if (sp < 1) {
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - sp) + ')';
        ctx.fillRect(10, -20, 3, 1); ctx.fillRect(11, -21, 1, 3);
      }
      ctx.restore();
    }

    // draw a sprite mirrored when the person walks left
    function withFacing(kx, ky, dir, fn) {
      ctx.save();
      ctx.translate(kx, ky);
      if (dir < 0) { ctx.translate(22, 0); ctx.scale(-1, 1); }
      fn();
      ctx.restore();
    }

