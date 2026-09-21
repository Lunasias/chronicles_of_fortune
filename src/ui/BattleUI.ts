import { GameState } from '../game/GameState';
import { BattleEngine, AttackerAction, DefenderAction, Combatant } from '../game/BattleEngine';
import { pixelSprites, CharacterAnimState } from '../engine/PixelSpriteGenerator';
import { aiSystem } from '../game/AISystem';
import { audio } from '../engine/AudioSynthesizer';
import { combatVFX } from '../engine/CombatVFXEngine';
import { trpgAssets } from '../engine/TRPGAssetLoader';

export class BattleUI {
  private game: GameState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onBattleEndCallback?: (winner: Combatant, loser: Combatant) => void;

  // Combat Animation States
  public attackerAnim: CharacterAnimState = 'idle';
  public defenderAnim: CharacterAnimState = 'idle';
  public isExecutingRound = false;

  constructor(game: GameState) {
    this.game = game;
    this.canvas = document.getElementById('battleCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.bindButtons();
  }

  private bindButtons() {
    // Attacker cards
    document.getElementById('btnCmdAttack')?.addEventListener('click', () => this.handleAttackerInput('attack'));
    document.getElementById('btnCmdStrike')?.addEventListener('click', () => this.handleAttackerInput('strike'));
    document.getElementById('btnCmdMagic')?.addEventListener('click', () => this.handleAttackerInput('magic'));
    document.getElementById('btnCmdSkill')?.addEventListener('click', () => this.handleAttackerInput('skill'));

    // Defender cards
    document.getElementById('btnCmdDefend')?.addEventListener('click', () => this.handleDefenderInput('defend'));
    document.getElementById('btnCmdCounter')?.addEventListener('click', () => this.handleDefenderInput('counter'));
    document.getElementById('btnCmdMagicGuard')?.addEventListener('click', () => this.handleDefenderInput('magic_guard'));
    document.getElementById('btnCmdGiveUp')?.addEventListener('click', () => this.handleDefenderInput('give_up'));
  }

  startBattle(
    enemy: Combatant,
    onBattleEnd: (winner: Combatant, loser: Combatant) => void
  ) {
    const p = this.game.activePlayer;
    const playerCombatant: Combatant = {
      name: p.displayName,
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      atk: p.getTotalStat('atk'),
      def: p.getTotalStat('def'),
      mag: p.getTotalStat('mag'),
      spd: p.getTotalStat('spd'),
      luk: p.getTotalStat('luk'),
      isPvP: false,
      playerRef: p,
      classKey: p.classKey,
      skillName: p.skillName
    };

    this.game.activeBattle = new BattleEngine(playerCombatant, enemy);
    this.game.activeBattleEnemyCombatant = enemy;
    this.onBattleEndCallback = onBattleEnd;

    this.attackerAnim = 'idle';
    this.defenderAnim = 'idle';
    this.isExecutingRound = false;

    document.getElementById('battleScreen')?.classList.remove('hidden');
    if (this.canvas.parentElement) {
      this.canvas.width = this.canvas.parentElement.clientWidth || 800;
      this.canvas.height = this.canvas.parentElement.clientHeight || 450;
    }
    document.getElementById('battleSkillLabel')!.innerText = (p.skillName || 'SKILL').toUpperCase();

    this.updateUI();
    this.updateCommandMenu();

    this.checkAITurn();
  }

  private updateUI() {
    const b = this.game.activeBattle;
    if (!b) return;

    const isPAtk = b.isPlayerAttacking;
    const pCombatant = isPAtk ? b.attacker : b.defender;
    const eCombatant = isPAtk ? b.defender : b.attacker;

    document.getElementById('battlePlayerName')!.innerText = pCombatant.name;
    document.getElementById('battlePlayerRoleBadge')!.innerText = isPAtk ? 'ATTACKER' : 'DEFENDER';
    document.getElementById('battlePlayerRoleBadge')!.className = isPAtk
      ? 'text-[10px] bg-blue-900 px-1 rounded text-cyan-300'
      : 'text-[10px] bg-slate-800 px-1 rounded text-slate-300';

    const pHpPct = Math.max(0, (pCombatant.hp / pCombatant.maxHp) * 100);
    const pMpPct = Math.max(0, (pCombatant.mp / pCombatant.maxMp) * 100);
    document.getElementById('battlePlayerHP')!.style.width = `${pHpPct}%`;
    document.getElementById('battlePlayerHPText')!.innerText = `${pCombatant.hp}/${pCombatant.maxHp}`;
    document.getElementById('battlePlayerMP')!.style.width = `${pMpPct}%`;
    document.getElementById('battlePlayerMPText')!.innerText = `${pCombatant.mp}/${pCombatant.maxMp}`;

    document.getElementById('battleEnemyName')!.innerText = eCombatant.name;
    document.getElementById('battleEnemyRoleBadge')!.innerText = !isPAtk ? 'ATTACKER' : 'DEFENDER';
    document.getElementById('battleEnemyRoleBadge')!.className = !isPAtk
      ? 'text-[10px] bg-red-900 px-1 rounded text-rose-300'
      : 'text-[10px] bg-slate-800 px-1 rounded text-slate-300';

    const eHpPct = Math.max(0, (eCombatant.hp / eCombatant.maxHp) * 100);
    document.getElementById('battleEnemyHP')!.style.width = `${eHpPct}%`;
    document.getElementById('battleEnemyHPText')!.innerText = `${eCombatant.hp}/${eCombatant.maxHp}`;
  }

  private updateCommandMenu() {
    const b = this.game.activeBattle;
    if (!b) return;

    const atkGroup = document.getElementById('attackerCommandGroup')!;
    const defGroup = document.getElementById('defenderCommandGroup')!;

    if (b.isPlayerAttacking) {
      atkGroup.classList.remove('hidden');
      defGroup.classList.add('hidden');
      document.getElementById('battleTurnText')!.innerText = 'YOU ARE ATTACKING! CHOOSE YOUR STRIKE!';
    } else {
      atkGroup.classList.add('hidden');
      defGroup.classList.remove('hidden');
      document.getElementById('battleTurnText')!.innerText = 'YOU ARE DEFENDING! PREDICT ENEMY ATTACK!';
    }
  }

  private checkAITurn() {
    const b = this.game.activeBattle;
    if (!b || this.isExecutingRound) return;

    const p = this.game.activePlayer;

    if (p.isAI) {
      setTimeout(() => {
        if (b.isPlayerAttacking) {
          const action = aiSystem.chooseAttackerAction(p, b.defender);
          this.handleAttackerInput(action);
        } else {
          const action = aiSystem.chooseDefenderAction(p, b.attacker);
          this.handleDefenderInput(action);
        }
      }, 800);
    }
  }

  private handleAttackerInput(atkAction: AttackerAction) {
    const b = this.game.activeBattle;
    if (!b || !b.isPlayerAttacking || this.isExecutingRound) return;

    audio.click();

    let defAction: DefenderAction = 'defend';
    if (b.defender.playerRef && b.defender.playerRef.isAI) {
      defAction = aiSystem.chooseDefenderAction(b.defender.playerRef, b.attacker);
    } else {
      const roll = Math.random();
      if (roll < 0.45) defAction = 'defend';
      else if (roll < 0.75) defAction = 'counter';
      else defAction = 'magic_guard';
    }

    this.executeRoundWithAnimation(atkAction, defAction);
  }

  private handleDefenderInput(defAction: DefenderAction) {
    const b = this.game.activeBattle;
    if (!b || b.isPlayerAttacking || this.isExecutingRound) return;

    audio.click();

    let atkAction: AttackerAction = 'attack';
    if (b.attacker.playerRef && b.attacker.playerRef.isAI) {
      atkAction = aiSystem.chooseAttackerAction(b.attacker.playerRef, b.defender);
    } else {
      const roll = Math.random();
      if (roll < 0.45) atkAction = 'attack';
      else if (roll < 0.75) atkAction = 'strike';
      else atkAction = 'magic';
    }

    this.executeRoundWithAnimation(atkAction, defAction);
  }

  private executeRoundWithAnimation(atkAction: AttackerAction, defAction: DefenderAction) {
    const b = this.game.activeBattle;
    if (!b) return;

    this.isExecutingRound = true;

    // Trigger animated action pose
    this.attackerAnim = atkAction === 'strike' ? 'strike' : atkAction === 'magic' ? 'magic' : 'attack';
    this.defenderAnim = defAction === 'counter' ? 'counter' : 'idle';

    // Center positions for 3x3 tactical grid dioramas
    const w = this.canvas.width;
    const h = this.canvas.height;
    const px = w * 0.29;
    const py = h * 0.62;
    const ex = w * 0.71;
    const ey = h * 0.46;

    // Spawn Dynamic Combat VFX on Monster / Defender!
    setTimeout(() => {
      const result = b.resolveRound(atkAction, defAction);
      document.getElementById('battleNarration')!.innerText = result.narration;

      if (b.isPlayerAttacking) {
        if (result.isCounterSuccess) {
          // Counter parry clash & reverse damage to player
          combatVFX.spawnCounterHit((px + ex) / 2, (py + ey) / 2, px, py);
        } else if (atkAction === 'skill') {
          // Trigger Cinematic Isometric Skill Cutscene
          combatVFX.triggerSkillCutscene(
            b.attacker.skillName || 'DARK CLEAVE',
            px, py, ex, ey,
            b.attacker.classKey || 'warrior',
            b.attacker.playerRef?.isDarkling || false
          );
        } else if (result.isStrikeSuccess) {
          // Earth-Shatter Ground Crater & Flying Debris on Monster
          combatVFX.spawnStrikeHit(ex, ey);
        } else if (atkAction === 'magic') {
          // Runic Summoning Ring & Elemental Explosion on Monster
          combatVFX.spawnMagicHit(ex, ey, this.game.activePlayer.classKey === 'cleric');
        } else {
          // Luminous Slash Arc & Spark Burst on Monster
          combatVFX.spawnAttackHit(ex, ey);
        }
      } else {
        // Monster is attacking the player!
        if (result.isCounterSuccess) {
          // Player counter parries and slashes the monster!
          combatVFX.spawnCounterHit((px + ex) / 2, (py + ey) / 2, ex, ey);
        } else {
          // Monster strikes player with ferocious claws, spells, or breath!
          combatVFX.spawnMonsterAttack(ex, ey, px, py, b.attacker.name, atkAction);
        }
      }

      // Sync HP
      if (b.attacker.playerRef) b.attacker.playerRef.hp = b.attacker.hp;
      if (b.defender.playerRef) b.defender.playerRef.hp = b.defender.hp;

      // Hurt reactions
      if (result.damageToDefender > 0) {
        this.defenderAnim = 'hurt';
      }
      if (result.damageToAttacker > 0) {
        this.attackerAnim = 'hurt';
      }

      this.updateUI();

      setTimeout(() => {
        this.attackerAnim = 'idle';
        this.defenderAnim = 'idle';
        this.isExecutingRound = false;

        // Check for Battle Conclusion
        if (b.defender.hp <= 0 || result.isGiveUp) {
          setTimeout(() => this.concludeBattle(b.attacker, b.defender), 800);
          return;
        }
        if (b.attacker.hp <= 0) {
          setTimeout(() => this.concludeBattle(b.defender, b.attacker), 800);
          return;
        }

        // Swap turns for next round
        b.swapTurns();
        this.updateUI();
        this.updateCommandMenu();
        this.checkAITurn();
      }, 950);
    }, 450);
  }

  private concludeBattle(winner: Combatant, loser: Combatant) {
    audio.fanfare();
    document.getElementById('battleScreen')?.classList.add('hidden');

    if (this.onBattleEndCallback) {
      this.onBattleEndCallback(winner, loser);
    }
  }

  // =========================================================================
  // BROWN DUST 2 ENCHANTED MUSHROOM FOREST & 3x3 TACTICAL ISOMETRIC DIORAMA
  // =========================================================================
  renderArena(time: number) {
    const b = this.game.activeBattle;
    if (!b) return;

    const ctx = this.ctx;

    // Keep battle canvas strictly synchronized with its container size
    if (this.canvas.parentElement) {
      const pw = this.canvas.parentElement.clientWidth;
      const ph = this.canvas.parentElement.clientHeight;
      if (pw > 0 && ph > 0 && (this.canvas.width !== pw || this.canvas.height !== ph)) {
        this.canvas.width = pw;
        this.canvas.height = ph;
      }
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    // Update VFX Engine
    combatVFX.update();

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Dynamic Screen Shake on Heavy Impacts
    ctx.translate(combatVFX.screenShakeX, combatVFX.screenShakeY);

    // -----------------------------------------------------------------------
    // 1. LUSH ENCHANTED MUSHROOM FOREST BACKDROP (Brown Dust 2 Aesthetic)
    // -----------------------------------------------------------------------
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#04160e');     // Deep emerald twilight canopy
    bgGrad.addColorStop(0.35, '#0b291a');  // Mystical woodland green
    bgGrad.addColorStop(0.70, '#153822');  // Vibrant mossy forest bank
    bgGrad.addColorStop(1, '#0e2014');     // Rich dark loam soil
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant Ancient Enchanted Tree Trunks & Hanging Foliage
    ctx.fillStyle = 'rgba(7, 26, 17, 0.75)';
    const trunkWidth = 38;
    for (let i = 0; i < 5; i++) {
      const tx = i * (w / 4) + 20;
      ctx.fillRect(tx - trunkWidth / 2, 0, trunkWidth, h * 0.45);
      // Flared mossy root bases
      ctx.beginPath();
      ctx.moveTo(tx - trunkWidth / 2 - 14, h * 0.45);
      ctx.lineTo(tx + trunkWidth / 2 + 14, h * 0.45);
      ctx.lineTo(tx + trunkWidth / 2, h * 0.28);
      ctx.lineTo(tx - trunkWidth / 2, h * 0.28);
      ctx.closePath();
      ctx.fill();
    }

    // Distant Hanging Vine Tendrils
    ctx.strokeStyle = 'rgba(21, 128, 61, 0.4)';
    ctx.lineWidth = 2;
    for (let v = 0; v < 8; v++) {
      const vx = v * (w / 7) + 30;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.bezierCurveTo(vx + 10, h * 0.12, vx - 10, h * 0.22, vx + 4, h * 0.32);
      ctx.stroke();
    }

    // -----------------------------------------------------------------------
    // 2. GIANT FANTASY MUSHROOMS (Red Fly Agaric, Blue, Yellow, Purple)
    // -----------------------------------------------------------------------
    // Upper-Left: Iconic Red Polka-Dot Fly Agaric Mushroom (Exact match from screenshot!)
    const giantRedShroom = pixelSprites.getGiantMushroom('red', 200, 170);
    ctx.drawImage(giantRedShroom, w * 0.04, h * 0.12);

    // Mid-Left: Sapphire Blue Spore Mushroom
    const giantBlueShroom = pixelSprites.getGiantMushroom('blue', 125, 110);
    ctx.drawImage(giantBlueShroom, -10, h * 0.36);

    // Upper-Right: Golden Yellow Ochre Mushroom
    const giantYellowShroom = pixelSprites.getGiantMushroom('yellow', 140, 125);
    ctx.drawImage(giantYellowShroom, w * 0.79, h * 0.14);

    // Mid-Right: Royal Violet Glowing Mushroom
    const giantPurpleShroom = pixelSprites.getGiantMushroom('purple', 105, 95);
    ctx.drawImage(giantPurpleShroom, w * 0.89, h * 0.36);

    // -----------------------------------------------------------------------
    // 3. DIAGONAL PRISMATIC GOD-RAY RAINBOW BEAM & FLOATING SPORES
    // -----------------------------------------------------------------------
    this.drawPrismaticGodRay(ctx, w, h, time);
    this.drawFloatingSpores(ctx, w, h, time);

    // -----------------------------------------------------------------------
    // 4. 2.5D ISOMETRIC 3x3 TACTICAL DIORAMA PLATFORMS
    // -----------------------------------------------------------------------
    const pxCenter = w * 0.29;
    const pyCenter = h * 0.62;
    const exCenter = w * 0.71;
    const eyCenter = h * 0.46;
    const tileW = 56;
    const tileH = 28;

    // 4a. 3D Diorama Earthen Platform Slabs (Mossy turf + stone drop edge + roots)
    this.drawDioramaPlatform(ctx, pxCenter, pyCenter, 210, 108, 22, '#15803d', '#14532d', '#1c1917');
    this.drawDioramaPlatform(ctx, exCenter, eyCenter, 210, 108, 22, '#166534', '#14532d', '#1c1917');

    // 4b. Render 3x3 Tactical Grids with Crisp White Corner Brackets [ ]
    this.drawTacticalGrid(ctx, pxCenter, pyCenter, tileW, tileH, true);
    this.drawTacticalGrid(ctx, exCenter, eyCenter, tileW, tileH, false);

    // -----------------------------------------------------------------------
    // 5. PLAYER PARTY FORMATION ON 3x3 GRID (Facing NE towards Enemy)
    // -----------------------------------------------------------------------
    const p = this.game.activePlayer;
    const pAnim = b.isPlayerAttacking ? this.attackerAnim : this.defenderAnim;
    const pFrame = Math.floor(time * 0.005);

    // Companion 1: Priestess / Cleric (Back row: col 0, row 1)
    const c1x = pxCenter - tileW / 2;
    const c1y = pyCenter;
    this.drawUnitTeamRing(ctx, c1x, c1y, '#38bdf8', 0.5);
    const priestessSprite = pixelSprites.getHeroSprite('cleric', 'NE', 'idle', pFrame);
    ctx.drawImage(priestessSprite, c1x - 45, c1y - 52, 90, 90);

    // Companion 2: Ranger / Archer (Front row: col 2, row 1)
    const c2x = pxCenter + tileW / 2;
    const c2y = pyCenter;
    this.drawUnitTeamRing(ctx, c2x, c2y, '#4ade80', 0.5);
    const rangerSprite = pixelSprites.getHeroSprite('ranger', 'NE', 'idle', pFrame);
    ctx.drawImage(rangerSprite, c2x - 45, c2y - 52, 90, 90);

    // Companion 3: Mage (Flank row: col 1, row 0)
    const c3x = pxCenter;
    const c3y = pyCenter - tileH;
    this.drawUnitTeamRing(ctx, c3x, c3y, '#c084fc', 0.5);
    const mageSprite = pixelSprites.getHeroSprite('mage', 'NE', 'idle', pFrame);
    ctx.drawImage(mageSprite, c3x - 45, c3y - 52, 90, 90);

    // Active Player Hero (Center tile: col 1, row 1)
    const px = pxCenter + combatVFX.heroStaggerX;
    const py = pyCenter + Math.sin(time * 0.005) * 3;
    this.drawUnitTeamRing(ctx, px, py, '#06b6d4', 0.9, true);

    const heroSprite = pixelSprites.getHeroSprite(
      p.classKey,
      'NE', // Facing up-right along isometric diagonal
      pAnim,
      pFrame,
      p.equipment,
      p.isDarkling,
      p.prank
    );
    ctx.drawImage(heroSprite, px - 55, py - 62, 110, 110);

    // -----------------------------------------------------------------------
    // 6. ENEMY SQUAD FORMATION ON 3x3 GRID (Facing SW towards Player)
    // -----------------------------------------------------------------------
    const enemyCombatant = b.isPlayerAttacking ? b.defender : b.attacker;
    const eAnim = b.isPlayerAttacking ? this.defenderAnim : this.attackerAnim;
    const ex = exCenter + combatVFX.monsterStaggerX;
    const ey = eyCenter + combatVFX.monsterStaggerY + Math.sin(time * 0.005 + 1) * 3;

    ctx.save();
    if (combatVFX.monsterFlashAlpha > 0) {
      ctx.shadowColor = combatVFX.monsterFlashColor;
      ctx.shadowBlur = 28;
    }

    if (enemyCombatant.isBoss) {
      // Massive Boss Dragon Overlord dominating the platform
      this.drawUnitTeamRing(ctx, ex, ey, '#ef4444', 1.0, true);
      const boss = pixelSprites.getDragonOverlordSprite(Math.floor(time * 0.003));
      ctx.drawImage(boss, ex - 120, ey - 118, 240, 240);
    } else if (enemyCombatant.playerRef) {
      // Rival Player & Mercenaries
      const rivalSprite = pixelSprites.getHeroSprite(
        enemyCombatant.playerRef.classKey,
        'SW', // Facing down-left along isometric diagonal
        eAnim,
        pFrame,
        enemyCombatant.playerRef.equipment,
        enemyCombatant.playerRef.isDarkling,
        enemyCombatant.playerRef.prank
      );
      this.drawUnitTeamRing(ctx, ex, ey, '#f43f5e', 0.9, true);
      ctx.drawImage(rivalSprite, ex - 55, ey - 62, 110, 110);

      // Rival companion
      const rComp = pixelSprites.getHeroSprite('warrior', 'SW', 'idle', pFrame);
      ctx.drawImage(rComp, ex + tileW / 2 - 45, ey - 52, 90, 90);
    } else {
      const eName = enemyCombatant.name.toLowerCase();
      const isGoblin = eName.includes('goblin');
      const isUndead = eName.includes('spider') || eName.includes('bat') || eName.includes('ghost') || eName.includes('skeleton');

      // Enemy Minion 1 (Tile col 0, row 1)
      const ec1x = exCenter - tileW / 2;
      const ec1y = eyCenter;
      const m1Key = isGoblin ? 'goblin_mage' : isUndead ? 'spider' : 'slime';
      const m1 = trpgAssets.isLoaded
        ? trpgAssets.getEntitySprite(m1Key, 'SW', 'idle', pFrame, 95, 100)
        : pixelSprites.getBrownDust2Slime('ice', pFrame, 'SW');
      ctx.drawImage(m1, ec1x - 48, ec1y - 50, 96, 100);

      // Enemy Minion 2 (Tile col 2, row 1)
      const ec2x = exCenter + tileW / 2;
      const ec2y = eyCenter;
      const m2Key = isGoblin ? 'goblin_spear' : isUndead ? 'bat' : 'slime';
      const m2 = trpgAssets.isLoaded
        ? trpgAssets.getEntitySprite(m2Key, 'SW', 'idle', pFrame, 95, 100)
        : pixelSprites.getBrownDust2Slime('sun', pFrame, 'SW');
      ctx.drawImage(m2, ec2x - 48, ec2y - 50, 96, 100);

      // Enemy Minion 3 (Tile col 1, row 0)
      const ec3x = exCenter;
      const ec3y = eyCenter - tileH;
      const m3Key = isGoblin ? 'goblin_archer' : isUndead ? 'ghost' : 'slime';
      const m3 = trpgAssets.isLoaded
        ? trpgAssets.getEntitySprite(m3Key, 'SW', 'idle', pFrame, 95, 100)
        : pixelSprites.getBrownDust2Slime('blossom', pFrame, 'SW');
      ctx.drawImage(m3, ec3x - 48, ec3y - 50, 96, 100);

      // Enemy Minion 4 (Tile col 1, row 2)
      const ec4x = exCenter;
      const ec4y = eyCenter + tileH;
      const m4Key = isGoblin ? 'goblin' : isUndead ? 'skeleton' : 'slime';
      const m4 = trpgAssets.isLoaded
        ? trpgAssets.getEntitySprite(m4Key, 'SW', 'idle', pFrame, 95, 100)
        : pixelSprites.getBrownDust2Slime('gold', pFrame, 'SW');
      ctx.drawImage(m4, ec4x - 48, ec4y - 50, 96, 100);

      // Primary Target Enemy (Center tile col 1, row 1)
      this.drawUnitTeamRing(ctx, ex, ey, '#f59e0b', 0.9, true);
      const monster = pixelSprites.getMonsterSprite(enemyCombatant.name, 'SW', eAnim, pFrame);
      ctx.drawImage(monster, ex - 65, ey - 65, 130, 130);
    }
    ctx.restore();

    // -----------------------------------------------------------------------
    // 7. RENDER COMBAT VFX (Arcs, Runic Circles, Craters, Skill Cutscenes)
    // -----------------------------------------------------------------------
    combatVFX.render(ctx, w, h);

    // -----------------------------------------------------------------------
    // 8. BROWN DUST 2 SIDE QUEUE HUD & TACTICAL BUTTONS
    // -----------------------------------------------------------------------
    this.drawBrownDust2HUD(ctx, w, h, b, time);

    ctx.restore();
  }

  // =========================================================================
  // HELPER: PRISMATIC RAINBOW GOD-RAY LIGHT BEAM
  // =========================================================================
  private drawPrismaticGodRay(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const x1 = w * 0.06;
    const y1 = -50;
    const x2 = w * 0.94;
    const y2 = h + 50;
    const beamWidth = 220;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;

    const gx1 = w * 0.45 - nx * (beamWidth / 2);
    const gy1 = h * 0.45 - ny * (beamWidth / 2);
    const gx2 = w * 0.45 + nx * (beamWidth / 2);
    const gy2 = h * 0.45 + ny * (beamWidth / 2);

    const pulse = 0.85 + Math.sin(time * 0.002) * 0.15;
    const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    grad.addColorStop(0.00, 'rgba(244, 63, 94, 0)');
    grad.addColorStop(0.14, `rgba(244, 63, 94, ${0.09 * pulse})`);  // Rose
    grad.addColorStop(0.30, `rgba(249, 115, 22, ${0.11 * pulse})`);  // Orange
    grad.addColorStop(0.48, `rgba(234, 179, 8, ${0.14 * pulse})`);   // Sun Gold
    grad.addColorStop(0.66, `rgba(34, 197, 94, ${0.12 * pulse})`);   // Emerald
    grad.addColorStop(0.82, `rgba(6, 182, 212, ${0.12 * pulse})`);   // Cyan
    grad.addColorStop(0.93, `rgba(168, 85, 247, ${0.09 * pulse})`);  // Violet
    grad.addColorStop(1.00, 'rgba(168, 85, 247, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x1 - nx * (beamWidth / 2), y1 - ny * (beamWidth / 2));
    ctx.lineTo(x1 + nx * (beamWidth / 2), y1 + ny * (beamWidth / 2));
    ctx.lineTo(x2 + nx * (beamWidth / 2), y2 + ny * (beamWidth / 2));
    ctx.lineTo(x2 - nx * (beamWidth / 2), y2 - ny * (beamWidth / 2));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // HELPER: FLOATING GOLDEN-GREEN SPORES & FIREFLIES
  // =========================================================================
  private drawFloatingSpores(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    ctx.save();
    const count = 28;
    for (let i = 0; i < count; i++) {
      const seed = i * 137.5;
      const speed = 0.025 + (i % 5) * 0.008;
      const sx = (seed * 37 + Math.sin(time * 0.0018 + i) * 32) % w;
      const sy = (h + 40) - ((time * speed * 26 + seed * 19) % (h + 80));
      const size = 2 + (i % 3) * 1.6;
      const alpha = 0.35 + Math.sin(time * 0.003 + i) * 0.35;

      const isFirefly = i % 4 === 0;
      if (isFirefly) {
        ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
        ctx.shadowColor = '#84cc16';
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = i % 2 === 0 ? `rgba(187, 247, 208, ${alpha * 0.7})` : `rgba(254, 240, 138, ${alpha * 0.7})`;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // =========================================================================
  // HELPER: 3D VOLUMETRIC DIORAMA PLATFORM SLAB
  // =========================================================================
  private drawDioramaPlatform(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    height: number,
    dropHeight: number,
    mossColor: string,
    cliffFaceColor: string,
    bedrockColor: string
  ) {
    ctx.save();
    const hw = width / 2;
    const hh = height / 2;

    // 1. 3D Cliff Foundation Drop Skirt
    ctx.fillStyle = bedrockColor;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh + dropHeight);
    ctx.lineTo(cx - hw, cy + dropHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cliffFaceColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy + dropHeight);
    ctx.lineTo(cx, cy + hh + dropHeight);
    ctx.closePath();
    ctx.fill();

    // Hanging Vine Tendrils along the platform cliff
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    for (let r = -3; r <= 3; r++) {
      const rx = cx + r * 24;
      const ry = cy + hh + (r % 2 === 0 ? 4 : -2);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + (r > 0 ? 4 : -4), ry + 12, rx + (r % 2), ry + 18);
      ctx.stroke();
    }

    // 2. Top Mossy Turf Flagstone Surface
    ctx.fillStyle = mossColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Soft Turf Border
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // HELPER: 3x3 TACTICAL ISOMETRIC GRID WITH WHITE CORNER BRACKETS [ ]
  // =========================================================================
  private drawTacticalGrid(
    ctx: CanvasRenderingContext2D,
    gridCX: number,
    gridCY: number,
    tileW: number,
    tileH: number,
    isPlayerGrid: boolean
  ) {
    ctx.save();

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        // Tile center relative to grid center (col 1, row 1 is center)
        const tcx = gridCX + (col - row) * (tileW / 2);
        const tcy = gridCY + (col + row - 2) * (tileH / 2);

        // Tile Rhombus Polygon
        ctx.beginPath();
        ctx.moveTo(tcx, tcy - tileH / 2);
        ctx.lineTo(tcx + tileW / 2, tcy);
        ctx.lineTo(tcx, tcy + tileH / 2);
        ctx.lineTo(tcx - tileW / 2, tcy);
        ctx.closePath();

        // Translucent Tile Fill
        ctx.fillStyle = isPlayerGrid
          ? 'rgba(56, 189, 248, 0.12)'  // Luminous cyan tint
          : 'rgba(244, 63, 94, 0.12)';  // Luminous rose tint
        ctx.fill();

        // Subtle Tile Grid Line
        ctx.strokeStyle = isPlayerGrid ? 'rgba(186, 230, 253, 0.28)' : 'rgba(254, 205, 211, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Signature White Corner Brackets [ ] at 4 diamond vertices
        this.drawTileCornerBrackets(ctx, tcx, tcy, tileW, tileH);
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // HELPER: SIGNATURE BROWN DUST 2 CORNER BRACKET MARKERS [ ] ON TILE
  // =========================================================================
  private drawTileCornerBrackets(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    tw: number,
    th: number
  ) {
    const hw = tw / 2;
    const hh = th / 2;
    const arm = 6.5; // Bracket arm length

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;

    // Top Vertex Bracket ∧
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - hh + arm * 0.5);
    ctx.lineTo(cx, cy - hh);
    ctx.lineTo(cx + arm, cy - hh + arm * 0.5);
    ctx.stroke();

    // Bottom Vertex Bracket ∨
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy + hh - arm * 0.5);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx + arm, cy + hh - arm * 0.5);
    ctx.stroke();

    // Left Vertex Bracket <
    ctx.beginPath();
    ctx.moveTo(cx - hw + arm, cy - arm * 0.5);
    ctx.lineTo(cx - hw, cy);
    ctx.lineTo(cx - hw + arm, cy + arm * 0.5);
    ctx.stroke();

    // Right Vertex Bracket >
    ctx.beginPath();
    ctx.moveTo(cx + hw - arm, cy - arm * 0.5);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw - arm, cy + arm * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // HELPER: TEAM / ACTIVE UNIT AURA RING UNDER FEET
  // =========================================================================
  private drawUnitTeamRing(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string,
    alpha = 0.8,
    pulse = false
  ) {
    ctx.save();
    const r = pulse ? 28 + Math.sin(Date.now() * 0.006) * 3 : 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = pulse ? 2.5 : 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = pulse ? 12 : 6;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, r, r * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // HELPER: BROWN DUST 2 SIDE QUEUE HUD & TACTICAL PILL BUTTONS
  // =========================================================================
  private drawBrownDust2HUD(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    b: BattleEngine,
    time: number
  ) {
    // Only render canvas HUD if width is comfortable
    if (w < 600) return;

    ctx.save();
    const isPAtk = b.isPlayerAttacking;
    const pCombatant = isPAtk ? b.attacker : b.defender;
    const eCombatant = isPAtk ? b.defender : b.attacker;

    // 1. Left Side: Player Party Queue (Vertical stack)
    const partyMembers = [
      { name: pCombatant.name, role: '⚔️ LEADER', hp: `${pCombatant.hp}/${pCombatant.maxHp}`, turn: '1st', active: true },
      { name: 'Sylvia (Ranger)', role: '🏹 ARCHER', hp: '340/340', turn: '2nd', active: false },
      { name: 'Celia (Cleric)', role: '✨ PRIEST', hp: '290/290', turn: '3rd', active: false },
    ];

    const cardW = 135;
    const cardH = 34;
    const qStartY = 75;

    partyMembers.forEach((mem, idx) => {
      const qy = qStartY + idx * (cardH + 6);

      // Card Backing
      ctx.fillStyle = mem.active ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.72)';
      ctx.strokeStyle = mem.active ? '#38bdf8' : 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = mem.active ? 1.8 : 1;
      ctx.beginPath();
      ctx.roundRect(14, qy, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();

      // Turn Order Badge
      ctx.fillStyle = mem.active ? '#0284c7' : '#334155';
      ctx.beginPath();
      ctx.roundRect(18, qy + 6, 26, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Silkscreen, sans-serif';
      ctx.fillText(mem.turn, 21, qy + 15);

      // Unit Name & Role
      ctx.fillStyle = mem.active ? '#f8fafc' : '#94a3b8';
      ctx.font = 'bold 9px Silkscreen, sans-serif';
      ctx.fillText(mem.name.slice(0, 10), 48, qy + 14);

      // HP Text
      ctx.fillStyle = '#4ade80';
      ctx.font = '8px Silkscreen, sans-serif';
      ctx.fillText(mem.hp, 48, qy + 26);
    });

    // 2. Right Side: Enemy Target Queue (Vertical stack)
    const enemyTargets = [
      { name: eCombatant.name, role: '👾 TARGET', hp: `${eCombatant.hp}/${eCombatant.maxHp}`, active: true },
      { name: 'Frost Slime', role: '❄️ MINION', hp: '280/280', active: false },
      { name: 'Sun Slime', role: '⚡ MINION', hp: '310/310', active: false }
    ];

    enemyTargets.forEach((tgt, idx) => {
      const eqy = qStartY + idx * (cardH + 6);
      const eqx = w - cardW - 14;

      ctx.fillStyle = tgt.active ? 'rgba(30, 10, 15, 0.92)' : 'rgba(20, 10, 12, 0.72)';
      ctx.strokeStyle = tgt.active ? '#f43f5e' : 'rgba(120, 53, 60, 0.5)';
      ctx.lineWidth = tgt.active ? 1.8 : 1;
      ctx.beginPath();
      ctx.roundRect(eqx, eqy, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();

      // Badge
      ctx.fillStyle = tgt.active ? '#be123c' : '#450a0a';
      ctx.beginPath();
      ctx.roundRect(eqx + cardW - 38, eqy + 6, 32, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Silkscreen, sans-serif';
      ctx.fillText('ENEMY', eqx + cardW - 35, eqy + 15);

      // Name & HP
      ctx.fillStyle = tgt.active ? '#fff1f2' : '#fca5a5';
      ctx.font = 'bold 9px Silkscreen, sans-serif';
      ctx.fillText(tgt.name.slice(0, 10), eqx + 8, eqy + 14);

      ctx.fillStyle = '#fb7185';
      ctx.font = '8px Silkscreen, sans-serif';
      ctx.fillText(tgt.hp, eqx + 8, eqy + 26);
    });

    // 3. Bottom Right: "BATTLE START >>" Tactical Pill Button (Exact match from screenshot!)
    const btnW = 145;
    const btnH = 32;
    const bx = w - btnW - 18;
    const by = h - btnH - 14;

    const btnGrad = ctx.createLinearGradient(bx, by, bx + btnW, by + btnH);
    btnGrad.addColorStop(0, '#dc2626'); // Crimson
    btnGrad.addColorStop(0.5, '#ea580c'); // Flame orange
    btnGrad.addColorStop(1, '#f59e0b'); // Amber gold

    ctx.fillStyle = btnGrad;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(bx, by, btnW, btnH, 16);
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Silkscreen, sans-serif';
    ctx.fillText('BATTLE START', bx + 16, by + 20);

    // Animated Chevrons >>
    const chevronPulse = Math.sin(time * 0.008) * 3;
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('>>', bx + 115 + chevronPulse, by + 21);

    ctx.restore();
  }
}
