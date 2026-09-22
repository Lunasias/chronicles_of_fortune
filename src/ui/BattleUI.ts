import { GameState } from '../game/GameState';
import { BattleEngine, AttackerAction, DefenderAction, Combatant } from '../game/BattleEngine';
import { pixelSprites, CharacterAnimState } from '../engine/PixelSpriteGenerator';
import { aiSystem } from '../game/AISystem';
import { audio } from '../engine/AudioSynthesizer';
import { combatVFX } from '../engine/CombatVFXEngine';

export class BattleUI {
  private game: GameState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onBattleEndCallback?: (winner: Combatant, loser: Combatant) => void;

  // Combat Animation States
  public attackerAnim: CharacterAnimState = 'idle';
  public defenderAnim: CharacterAnimState = 'idle';
  public isExecutingRound = false;
  public isScoutOpen = false;
  public pendingAttackerAction: AttackerAction | null = null;

  // Cinematic Combat Cutscene State
  public cutscene = {
    active: false,
    phase: 'idle' as 'idle' | 'dash' | 'impact' | 'leap_back',
    phaseStartTime: 0,
    phaseDuration: 0,
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
    attackerOffsetX: 0,
    attackerOffsetY: 0,
    defenderStartX: 0,
    defenderStartY: 0,
    defenderTargetX: 0,
    defenderTargetY: 0,
    defenderOffsetX: 0,
    defenderOffsetY: 0,
    zoomFactor: 1.0,
    targetZoom: 1.0,
    ghostTrails: [] as Array<{
      x: number;
      y: number;
      sprite: HTMLCanvasElement;
      w: number;
      h: number;
      alpha: number;
      decay: number;
    }>,
    lastGhostTime: 0,
    bannerText: '',
    bannerSubtext: '',
    bannerColor: '#f59e0b',
    bannerAlpha: 0,
    targetBannerAlpha: 0
  };

  startCutscenePhase(
    phase: 'dash' | 'impact' | 'leap_back',
    durationMs: number,
    targetOffsetX: number = 0,
    targetOffsetY: number = 0,
    defenderTargetOffsetX: number = 0,
    defenderTargetOffsetY: number = 0
  ) {
    this.cutscene.active = true;
    this.cutscene.phase = phase;
    this.cutscene.phaseStartTime = performance.now();
    this.cutscene.phaseDuration = durationMs;
    this.cutscene.startX = this.cutscene.attackerOffsetX;
    this.cutscene.startY = this.cutscene.attackerOffsetY;
    this.cutscene.targetX = targetOffsetX;
    this.cutscene.targetY = targetOffsetY;
    this.cutscene.defenderStartX = this.cutscene.defenderOffsetX;
    this.cutscene.defenderStartY = this.cutscene.defenderOffsetY;
    this.cutscene.defenderTargetX = defenderTargetOffsetX;
    this.cutscene.defenderTargetY = defenderTargetOffsetY;
  }

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

    // Tactical Scout & Intel ("2" button / Spy System)
    document.getElementById('btnBattleScout')?.addEventListener('click', () => this.toggleScoutDrawer());
    document.getElementById('btnCloseScout')?.addEventListener('click', () => this.toggleScoutDrawer());
    window.addEventListener('keydown', (e) => {
      if (e.key === '2' && !document.getElementById('battleScreen')?.classList.contains('hidden')) {
        this.toggleScoutDrawer();
      }
    });
  }

  toggleScoutDrawer() {
    this.isScoutOpen = !this.isScoutOpen;
    audio.click();
    const modal = document.getElementById('battleScoutModal');
    if (!modal) return;

    if (this.isScoutOpen) {
      const b = this.game.activeBattle;
      if (!b) return;
      const enemy = b.isPlayerAttacking ? b.defender : b.attacker;
      const intel = BattleEngine.getCombatantIntel(enemy);

      const nameEl = document.getElementById('scoutEnemyName');
      if (nameEl) nameEl.innerText = intel.name;
      const typeEl = document.getElementById('scoutEnemyType');
      if (typeEl) typeEl.innerText = intel.classOrType;

      const atkEl = document.getElementById('scoutAtkPct');
      if (atkEl) atkEl.innerText = `${intel.tendencies.attack}%`;
      const strEl = document.getElementById('scoutStrikePct');
      if (strEl) strEl.innerText = `${intel.tendencies.strike}%`;
      const magEl = document.getElementById('scoutMagicPct');
      if (magEl) magEl.innerText = `${intel.tendencies.magic}%`;
      const sklEl = document.getElementById('scoutSkillPct');
      if (sklEl) sklEl.innerText = `${intel.tendencies.skill}%`;

      const weakEl = document.getElementById('scoutWeakness');
      if (weakEl) weakEl.innerText = intel.weakness;
      const resEl = document.getElementById('scoutResistance');
      if (resEl) resEl.innerText = intel.resistance;
      const recEl = document.getElementById('scoutRecommended');
      if (recEl) recEl.innerText = intel.recommendedCounter;
      const tipEl = document.getElementById('scoutLoreTip');
      if (tipEl) tipEl.innerText = intel.tacticalTip;

      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
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
      isPvP: enemy.isPvP || false,
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
    this.isScoutOpen = false;

    // Switch to battle chiptune theme
    if (enemy.isBoss) {
      audio.playBgm('boss');
    } else {
      audio.playBgm('battle');
    }

    document.getElementById('battleScreen')?.classList.remove('hidden');
    document.getElementById('battleScoutModal')?.classList.add('hidden');
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
    document.getElementById('battlePlayerRoleBadge')!.innerText = isPAtk ? 'ฝ่ายโจมตี (ATTACKER)' : 'ฝ่ายตั้งรับ (DEFENDER)';
    document.getElementById('battlePlayerRoleBadge')!.className = isPAtk
      ? 'text-[10px] bg-blue-900 px-1.5 py-0.5 rounded text-cyan-300 font-bold'
      : 'text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-bold';

    const curPHP = Math.max(0, Math.ceil(pCombatant.hp));
    const maxPHP = Math.max(1, Math.ceil(pCombatant.maxHp));
    const curPMP = Math.max(0, Math.ceil(pCombatant.mp));
    const maxPMP = Math.max(1, Math.ceil(pCombatant.maxMp));

    const pHpPct = Math.min(100, Math.max(0, (curPHP / maxPHP) * 100));
    const pMpPct = Math.min(100, Math.max(0, (curPMP / maxPMP) * 100));
    document.getElementById('battlePlayerHP')!.style.width = `${pHpPct}%`;
    document.getElementById('battlePlayerHPText')!.innerText = `${curPHP}/${maxPHP}`;
    document.getElementById('battlePlayerMP')!.style.width = `${pMpPct}%`;
    document.getElementById('battlePlayerMPText')!.innerText = `${curPMP}/${maxPMP}`;

    document.getElementById('battleEnemyName')!.innerText = eCombatant.name;
    document.getElementById('battleEnemyRoleBadge')!.innerText = !isPAtk ? 'ฝ่ายโจมตี (ATTACKER)' : 'ฝ่ายตั้งรับ (DEFENDER)';
    document.getElementById('battleEnemyRoleBadge')!.className = !isPAtk
      ? 'text-[10px] bg-red-900 px-1.5 py-0.5 rounded text-rose-300 font-bold'
      : 'text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-bold';

    const curEHP = Math.max(0, Math.ceil(eCombatant.hp));
    const maxEHP = Math.max(1, Math.ceil(eCombatant.maxHp));
    const eHpPct = Math.min(100, Math.max(0, (curEHP / maxEHP) * 100));
    document.getElementById('battleEnemyHP')!.style.width = `${eHpPct}%`;
    document.getElementById('battleEnemyHPText')!.innerText = `${curEHP}/${maxEHP}`;
  }

  private updateCommandMenu() {
    const b = this.game.activeBattle;
    if (!b) return;

    this.pendingAttackerAction = null;
    const atkGroup = document.getElementById('attackerCommandGroup')!;
    const defGroup = document.getElementById('defenderCommandGroup')!;

    // Check if the current Attacker is a human player
    const isAttackerHuman = b.attacker.playerRef ? !b.attacker.playerRef.isAI : b.isPlayerAttacking;

    if (isAttackerHuman) {
      atkGroup.classList.remove('hidden');
      defGroup.classList.add('hidden');
      document.getElementById('battleTurnText')!.innerText = `⚔️ ${b.attacker.name} (ฝ่ายโจมตี): เลือกคำสั่งรุกของคุณ!`;
    } else {
      // Attacker is AI / Monster: Attacker AI chooses, and if Defender is human, prompt Defender
      atkGroup.classList.add('hidden');
      const isDefenderHuman = b.defender.playerRef ? !b.defender.playerRef.isAI : !b.isPlayerAttacking;
      if (isDefenderHuman) {
        defGroup.classList.remove('hidden');
        document.getElementById('battleTurnText')!.innerText = `🛡️ ${b.defender.name} (ฝ่ายตั้งรับ): คาดเดาและเลือกคำสั่งรับ!`;
      } else {
        defGroup.classList.add('hidden');
        document.getElementById('battleTurnText')!.innerText = `⚔️ กำลังประมวลผลการต่อสู้...`;
      }
    }
  }

  private checkAITurn() {
    const b = this.game.activeBattle;
    if (!b || this.isExecutingRound) return;

    const isAttackerHuman = b.attacker.playerRef ? !b.attacker.playerRef.isAI : b.isPlayerAttacking;

    if (!isAttackerHuman) {
      // AI or Monster is Attacking!
      setTimeout(() => {
        const action = b.attacker.playerRef
          ? aiSystem.chooseAttackerAction(b.attacker.playerRef, b.defender)
          : (Math.random() < 0.45 ? 'attack' : Math.random() < 0.75 ? 'strike' : 'magic');
        this.pendingAttackerAction = action;

        const isDefenderHuman = b.defender.playerRef ? !b.defender.playerRef.isAI : !b.isPlayerAttacking;
        if (!isDefenderHuman) {
          // Both are AI
          const defAct = b.defender.playerRef
            ? aiSystem.chooseDefenderAction(b.defender.playerRef, b.attacker)
            : 'defend';
          this.executeRoundWithAnimation(action, defAct);
        } else {
          // Human defender: show defender buttons so human can choose!
          const atkGroup = document.getElementById('attackerCommandGroup')!;
          const defGroup = document.getElementById('defenderCommandGroup')!;
          atkGroup.classList.add('hidden');
          defGroup.classList.remove('hidden');
          document.getElementById('battleTurnText')!.innerText = `🛡️ ${b.defender.name} (ฝ่ายตั้งรับ): ศัตรูเตรียมจู่โจม! เลือกคำสั่งป้องกัน!`;
        }
      }, 700);
    }
  }

  private handleAttackerInput(atkAction: AttackerAction) {
    const b = this.game.activeBattle;
    if (!b || this.isExecutingRound) return;

    audio.click();

    // Check if Defender is a human player (PvP duel or human-controlled defending player)
    const isDefenderHuman = b.defender.playerRef && !b.defender.playerRef.isAI;

    if (isDefenderHuman) {
      // PvP mode: Save attacker choice and prompt human defender to choose!
      this.pendingAttackerAction = atkAction;
      const atkGroup = document.getElementById('attackerCommandGroup')!;
      const defGroup = document.getElementById('defenderCommandGroup')!;
      atkGroup.classList.add('hidden');
      defGroup.classList.remove('hidden');
      document.getElementById('battleTurnText')!.innerText = `🛡️ ${b.defender.name} (ฝ่ายตั้งรับ): ศัตรูเตรียมจู่โจม! เลือกคำสั่งป้องกันของคุณ!`;
      return;
    }

    // AI or Monster Defender: choose immediately
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
    if (!b || this.isExecutingRound) return;

    audio.click();

    let atkAction: AttackerAction = this.pendingAttackerAction || 'attack';
    this.pendingAttackerAction = null;

    if (!this.pendingAttackerAction && b.attacker.playerRef && b.attacker.playerRef.isAI) {
      atkAction = aiSystem.chooseAttackerAction(b.attacker.playerRef, b.defender);
    } else if (!this.pendingAttackerAction && !b.isPlayerAttacking) {
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

    const w = this.canvas.width;
    const h = this.canvas.height;
    const arenaCX = w * 0.50;
    const arenaCY = h * 0.56;
    const arenaW = Math.min(w * 0.88, 880);
    const arenaH = arenaW * 0.48;

    const pxCenter = arenaCX - arenaW * 0.22;
    const pyCenter = arenaCY + arenaH * 0.12;
    const exCenter = arenaCX + arenaW * 0.22;
    const eyCenter = arenaCY - arenaH * 0.12;

    const isPAtk = b.isPlayerAttacking;

    // Vector from Attacker to Defender
    const atkBaseX = isPAtk ? pxCenter : exCenter;
    const atkBaseY = isPAtk ? pyCenter : eyCenter;
    const defBaseX = isPAtk ? exCenter : pxCenter;
    const defBaseY = isPAtk ? eyCenter : pyCenter;

    const fullDX = defBaseX - atkBaseX;
    const fullDY = defBaseY - atkBaseY;

    // 1. Setup Cutscene Banner
    let actionTitle = '';
    let actionSub = '';
    let bannerColor = '#f59e0b';

    if (atkAction === 'strike') {
      actionTitle = '⚡ ชาร์จฟันทะลวงเกราะ! ⚡';
      actionSub = `${b.attacker.name} ชาร์จพลังทำลายล้างทะลวงการป้องกัน!`;
      bannerColor = '#ef4444';
    } else if (atkAction === 'magic') {
      actionTitle = '🔮 ร่ายมหาเวทมนตร์! 🔮';
      actionSub = `${b.attacker.name} บริกรรมคาถาเพลิงเวทมนตร์โบราณ!`;
      bannerColor = '#a855f7';
    } else if (atkAction === 'skill') {
      actionTitle = `🌟 ท่าไม้ตาย: ${b.attacker.skillName || 'สกิลเฉพาะ'} 🌟`;
      actionSub = `${b.attacker.name} ปลดปล่อยวิชาลับเฉพาะคลาส!`;
      bannerColor = '#ec4899';
    } else {
      actionTitle = '⚔️ บุกโจมตีประชิด! ⚔️';
      actionSub = `${b.attacker.name} พุ่งทะยานฟันด้วยอาวุธคู่กาย!`;
      bannerColor = '#3b82f6';
    }

    if (defAction === 'counter') {
      actionSub += ` ⚡ ${b.defender.name} prepares PARRY COUNTER!`;
    } else if (defAction === 'magic_guard') {
      actionSub += ` 🛡️ Magic Barrier erected!`;
    }

    this.cutscene.bannerText = actionTitle;
    this.cutscene.bannerSubtext = actionSub;
    this.cutscene.bannerColor = bannerColor;
    this.cutscene.targetBannerAlpha = 1.0;

    // 2. Determine target dash positions
    let targetAtkDX = 0;
    let targetAtkDY = 0;
    let targetDefDX = 0;
    let targetDefDY = 0;

    const isCounterStrikeClash = atkAction === 'strike' && defAction === 'counter';

    if (isCounterStrikeClash) {
      // DRAMATIC MID-FIELD CLASH! Both surge forward to meet at the center!
      targetAtkDX = fullDX * 0.48;
      targetAtkDY = fullDY * 0.48;
      targetDefDX = -fullDX * 0.48;
      targetDefDY = -fullDY * 0.48;
    } else if (atkAction === 'magic') {
      targetAtkDX = fullDX * 0.22;
      targetAtkDY = fullDY * 0.22;
    } else {
      // Dash directly into defender's face
      const margin = isPAtk ? 55 : -55;
      targetAtkDX = fullDX - margin;
      targetAtkDY = fullDY - (isPAtk ? 15 : -15);
    }

    // Set dash animation pose
    this.attackerAnim = atkAction === 'strike' ? 'strike' : atkAction === 'magic' ? 'magic' : 'run';
    this.defenderAnim = defAction === 'counter' ? 'counter' : 'idle';

    // Start Phase 1: Dash forward across the arena! (340ms)
    this.startCutscenePhase('dash', 340, targetAtkDX, targetAtkDY, targetDefDX, targetDefDY);

    // Trigger Anime Speed Lines for rapid dash movement!
    if (atkAction === 'strike' || isCounterStrikeClash) {
      combatVFX.triggerSpeedLines('rgba(239, 68, 68, 0.75)', 24);
    } else if (atkAction === 'magic') {
      combatVFX.triggerSpeedLines('rgba(168, 85, 247, 0.75)', 22);
    } else if (atkAction === 'skill') {
      combatVFX.triggerSpeedLines('rgba(236, 72, 153, 0.85)', 28);
    } else {
      combatVFX.triggerSpeedLines('rgba(59, 130, 246, 0.65)', 18);
    }

    if (atkAction === 'skill') {
      audio.skillCast();
    } else if (atkAction === 'strike' || isCounterStrikeClash) {
      audio.strikeHit();
    } else if (atkAction === 'magic') {
      audio.magicCast();
    } else {
      audio.attackHit();
    }

    // Phase 2: Impact & Combat Resolution (after dash completes at 340ms)
    setTimeout(() => {
      const result = b.resolveRound(atkAction, defAction);
      document.getElementById('battleNarration')!.innerText = result.narration;

      // Micro-zoom punch
      this.cutscene.targetZoom = 1.14;
      this.attackerAnim = atkAction === 'strike' ? 'strike' : atkAction === 'magic' ? 'magic' : 'attack';

      if (result.isCounterSuccess) {
        // Counter parry successful!
        audio.counterParry();
        this.defenderAnim = 'counter';
        this.attackerAnim = 'hurt';
        combatVFX.triggerScreenShake(20);
        combatVFX.triggerHitstop(8);
        combatVFX.triggerSpeedLines('rgba(234, 179, 8, 0.9)', 28);
        combatVFX.spawnCounterHit(
          atkBaseX + this.cutscene.attackerOffsetX,
          atkBaseY + this.cutscene.attackerOffsetY,
          atkBaseX,
          atkBaseY
        );
        this.startCutscenePhase('impact', 480, targetAtkDX - (isPAtk ? 35 : -35), targetAtkDY, targetDefDX, targetDefDY);
      } else {
        if (result.damageToDefender > 0) {
          this.defenderAnim = 'hurt';
          targetDefDX += isPAtk ? 30 : -30;
          targetDefDY -= 8;
        }
        combatVFX.triggerScreenShake(atkAction === 'strike' ? 22 : 14);
        combatVFX.triggerHitstop(atkAction === 'strike' ? 9 : 6);
        if (atkAction === 'strike') {
          combatVFX.triggerSpeedLines('rgba(239, 68, 68, 0.9)', 30);
        } else if (atkAction === 'magic') {
          combatVFX.triggerSpeedLines('rgba(168, 85, 247, 0.85)', 25);
        } else if (atkAction === 'skill') {
          combatVFX.triggerSpeedLines('rgba(236, 72, 153, 0.9)', 32);
        }
        this.startCutscenePhase('impact', 480, targetAtkDX, targetAtkDY, targetDefDX, targetDefDY);

        const hitX = defBaseX + targetDefDX;
        const hitY = defBaseY + targetDefDY;

        if (atkAction === 'skill') {
          audio.skillCast();
          combatVFX.triggerSkillCutscene(
            b.attacker.skillName || 'DARK CLEAVE',
            atkBaseX + targetAtkDX,
            atkBaseY + targetAtkDY,
            hitX,
            hitY,
            b.attacker.classKey || 'warrior',
            b.attacker.playerRef?.isDarkling || false
          );
        } else if (result.isStrikeSuccess) {
          audio.strikeHit();
          combatVFX.spawnStrikeHit(hitX, hitY);
        } else if (atkAction === 'magic') {
          if (result.isMagicBlocked) {
            audio.magicGuardBlock();
          } else {
            audio.magicHit();
          }
          combatVFX.spawnMagicHit(hitX, hitY, b.attacker.classKey === 'cleric');
        } else {
          if (defAction === 'defend') {
            audio.defendBlock();
          } else {
            audio.attackHit();
          }
          if (isPAtk) {
            combatVFX.spawnAttackHit(hitX, hitY);
          } else {
            combatVFX.spawnMonsterAttack(
              atkBaseX + targetAtkDX,
              atkBaseY + targetAtkDY,
              hitX,
              hitY,
              b.attacker.name,
              atkAction
            );
          }
        }

        if (result.damageToDefender > 0) {
          audio.hurt();
        }
      }

      // Sync HP
      if (b.attacker.playerRef) b.attacker.playerRef.hp = b.attacker.hp;
      if (b.defender.playerRef) b.defender.playerRef.hp = b.defender.hp;

      // Floating Combat Text
      const defFloatX = defBaseX + targetDefDX;
      const defFloatY = defBaseY + targetDefDY - 45;
      const atkFloatX = atkBaseX + targetAtkDX;
      const atkFloatY = atkBaseY + targetAtkDY - 45;

      if (result.isCounterSuccess) {
        combatVFX.spawnFloatingCombatText(atkFloatX, atkFloatY, `⚡ PARRY COUNTER!! -${result.damageToAttacker}`, 'counter');
      } else if (result.isStrikeSuccess) {
        combatVFX.spawnFloatingCombatText(defFloatX, defFloatY, `💥 CRITICAL SMASH!! -${result.damageToDefender}`, 'crit');
      } else if (atkAction === 'magic') {
        if (result.isMagicBlocked) {
          combatVFX.spawnFloatingCombatText(defFloatX, defFloatY, `🛡️ BARRIER BLOCKED! -${result.damageToDefender}`, 'magic');
        } else {
          combatVFX.spawnFloatingCombatText(defFloatX, defFloatY, `🔮 ARCANE BURST!! -${result.damageToDefender}`, 'magic');
        }
      } else if (result.damageToDefender > 0) {
        combatVFX.spawnFloatingCombatText(defFloatX, defFloatY, `-${result.damageToDefender}`, 'normal');
      }

      this.updateUI();

      // Phase 3: Airborne backdash leap returning to dais (after 480ms impact)
      setTimeout(() => {
        this.cutscene.targetZoom = 1.0;
        this.cutscene.targetBannerAlpha = 0;
        this.attackerAnim = 'run';
        this.startCutscenePhase('leap_back', 450, 0, 0, 0, 0);

        // Phase 4: Settle & Turn Swap (after 450ms leap)
        setTimeout(() => {
          this.cutscene.active = false;
          this.cutscene.phase = 'idle';
          this.attackerAnim = 'idle';
          this.defenderAnim = 'idle';
          this.isExecutingRound = false;

          // Check for Battle Conclusion
          if (b.defender.hp <= 0 || result.isGiveUp) {
            setTimeout(() => this.concludeBattle(b.attacker, b.defender), 600);
            return;
          }
          if (b.attacker.hp <= 0) {
            setTimeout(() => this.concludeBattle(b.defender, b.attacker), 600);
            return;
          }

          // Swap turns for next round
          b.swapTurns();
          this.updateUI();
          this.updateCommandMenu();
          this.checkAITurn();
        }, 460);
      }, 480);
    }, 340);
  }

  private concludeBattle(winner: Combatant, loser: Combatant) {
    if (winner.playerRef && !winner.playerRef.isAI) {
      audio.victory();
    } else if (loser.playerRef && !loser.playerRef.isAI) {
      audio.defeat();
    } else {
      audio.fanfare();
    }
    document.getElementById('battleScreen')?.classList.add('hidden');
    document.getElementById('battleScoutModal')?.classList.add('hidden');
    this.isScoutOpen = false;
    audio.playBgm('overworld');

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

    // -----------------------------------------------------------------------
    // Update Cutscene Tweens (60 FPS Silky Smooth)
    // -----------------------------------------------------------------------
    const now = performance.now();
    if (this.cutscene.active) {
      const elapsed = now - this.cutscene.phaseStartTime;
      const p = Math.min(1.0, Math.max(0, elapsed / Math.max(1, this.cutscene.phaseDuration)));

      if (this.cutscene.phase === 'dash') {
        const ease = 1 - Math.pow(1 - p, 3);
        this.cutscene.attackerOffsetX = this.cutscene.startX + (this.cutscene.targetX - this.cutscene.startX) * ease;
        this.cutscene.attackerOffsetY = this.cutscene.startY + (this.cutscene.targetY - this.cutscene.startY) * ease;
        this.cutscene.defenderOffsetX = this.cutscene.defenderStartX + (this.cutscene.defenderTargetX - this.cutscene.defenderStartX) * ease;
        this.cutscene.defenderOffsetY = this.cutscene.defenderStartY + (this.cutscene.defenderTargetY - this.cutscene.defenderStartY) * ease;
      } else if (this.cutscene.phase === 'impact') {
        this.cutscene.attackerOffsetX = this.cutscene.targetX + (Math.random() - 0.5) * 2;
        this.cutscene.attackerOffsetY = this.cutscene.targetY + (Math.random() - 0.5) * 2;
      } else if (this.cutscene.phase === 'leap_back') {
        const arc = Math.sin(p * Math.PI) * -35;
        this.cutscene.attackerOffsetX = this.cutscene.startX + (0 - this.cutscene.startX) * p;
        this.cutscene.attackerOffsetY = this.cutscene.startY + (0 - this.cutscene.startY) * p + arc;
        this.cutscene.defenderOffsetX += (0 - this.cutscene.defenderOffsetX) * 0.15;
        this.cutscene.defenderOffsetY += (0 - this.cutscene.defenderOffsetY) * 0.15;
      }

      this.cutscene.zoomFactor += (this.cutscene.targetZoom - this.cutscene.zoomFactor) * 0.12;
      this.cutscene.bannerAlpha += (this.cutscene.targetBannerAlpha - this.cutscene.bannerAlpha) * 0.15;
    } else {
      this.cutscene.attackerOffsetX = 0;
      this.cutscene.attackerOffsetY = 0;
      this.cutscene.defenderOffsetX = 0;
      this.cutscene.defenderOffsetY = 0;
      this.cutscene.zoomFactor += (1.0 - this.cutscene.zoomFactor) * 0.1;
      this.cutscene.bannerAlpha += (0 - this.cutscene.bannerAlpha) * 0.15;
    }

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Dynamic Screen Shake on Heavy Impacts
    ctx.translate(combatVFX.screenShakeX, combatVFX.screenShakeY);

    const arenaCX = w * 0.50;
    const arenaCY = h * 0.56;
    const arenaW = Math.min(w * 0.88, 880);
    const arenaH = arenaW * 0.48;
    const arenaDrop = 36;

    // Camera micro-zoom punch around arena center during impact
    if (Math.abs(this.cutscene.zoomFactor - 1.0) > 0.005) {
      ctx.translate(arenaCX, arenaCY);
      ctx.scale(this.cutscene.zoomFactor, this.cutscene.zoomFactor);
      ctx.translate(-arenaCX, -arenaCY);
    }

    // -----------------------------------------------------------------------
    // 1. DARK FANTASY GOTHIC ISOMETRIC ARENA BACKDROP
    // -----------------------------------------------------------------------
    this.drawDarkFantasyArenaBackdrop(ctx, w, h, time);

    // -----------------------------------------------------------------------
    // 2. GRAND EXPANSIVE 2.5D ISOMETRIC COLOSSEUM ARENA FLOOR
    // -----------------------------------------------------------------------
    this.drawGrandIsometricColosseumFloor(ctx, arenaCX, arenaCY, arenaW, arenaH, arenaDrop, time);

    const pxCenter = arenaCX - arenaW * 0.22;
    const pyCenter = arenaCY + arenaH * 0.12;
    const exCenter = arenaCX + arenaW * 0.22;
    const eyCenter = arenaCY - arenaH * 0.12;
    const zoneW = arenaW * 0.36;
    const zoneH = arenaH * 0.36;

    // Elevated 2.5D Isometric Stone Slabs with glowing runic borders
    // Player Dais (Cyan/Azure Mystic Rune Trim)
    this.drawIsometricStoneDais(
      ctx,
      pxCenter,
      pyCenter,
      zoneW,
      zoneH,
      18,
      '#06b6d4',
      '#1e293b',
      '#0f172a',
      '#38bdf8'
    );

    // Enemy Dais (Crimson/Abyssal Flame Rune Trim)
    this.drawIsometricStoneDais(
      ctx,
      exCenter,
      eyCenter,
      zoneW,
      zoneH,
      18,
      '#f43f5e',
      '#1f1722',
      '#110c14',
      '#fb7185'
    );

    // -----------------------------------------------------------------------
    // 3. PREPARE DYNAMIC COMBATANT COORDINATES & SPRITES
    // -----------------------------------------------------------------------
    const isPlayerAtk = b.isPlayerAttacking;

    const px =
      pxCenter +
      (isPlayerAtk ? this.cutscene.attackerOffsetX : this.cutscene.defenderOffsetX) +
      combatVFX.heroStaggerX;
    const py =
      pyCenter +
      (isPlayerAtk ? this.cutscene.attackerOffsetY : this.cutscene.defenderOffsetY) +
      Math.sin(time * 0.005) * 3;

    const ex =
      exCenter +
      (!isPlayerAtk ? this.cutscene.attackerOffsetX : this.cutscene.defenderOffsetX) +
      combatVFX.monsterStaggerX;
    const ey =
      eyCenter +
      (!isPlayerAtk ? this.cutscene.attackerOffsetY : this.cutscene.defenderOffsetY) +
      combatVFX.monsterStaggerY +
      Math.sin(time * 0.005 + 1) * 3;

    const p = this.game.activePlayer;
    const pAnim = isPlayerAtk ? this.attackerAnim : this.defenderAnim;
    const pFrame = Math.floor(time * 0.005);

    const heroSprite = pixelSprites.getHeroSprite(
      p.classKey,
      'NE',
      pAnim,
      pFrame,
      p.equipment,
      p.isDarkling,
      p.prank,
      p.skinVariant
    );

    const enemyCombatant = isPlayerAtk ? b.defender : b.attacker;
    const eAnim = isPlayerAtk ? this.defenderAnim : this.attackerAnim;

    let enemySprite: HTMLCanvasElement;
    let enemyW = 140;
    let enemyH = 140;

    if (enemyCombatant.isBoss) {
      enemySprite = pixelSprites.getDragonOverlordSprite(Math.floor(time * 0.003));
      enemyW = 240;
      enemyH = 240;
    } else if (enemyCombatant.playerRef) {
      enemySprite = pixelSprites.getHeroSprite(
        enemyCombatant.playerRef.classKey,
        'SW',
        eAnim,
        pFrame,
        enemyCombatant.playerRef.equipment,
        enemyCombatant.playerRef.isDarkling,
        enemyCombatant.playerRef.prank,
        enemyCombatant.playerRef.skinVariant
      );
      enemyW = 120;
      enemyH = 120;
    } else {
      enemySprite = pixelSprites.getMonsterSprite(enemyCombatant.name, 'SW', eAnim, pFrame);
    }

    // -----------------------------------------------------------------------
    // 4. MOTION GHOST AFTERIMAGE TRAILS
    // -----------------------------------------------------------------------
    if (this.cutscene.active && (this.cutscene.phase === 'dash' || this.cutscene.phase === 'leap_back')) {
      if (now - this.cutscene.lastGhostTime > 40) {
        this.cutscene.lastGhostTime = now;
        if (isPlayerAtk) {
          this.cutscene.ghostTrails.push({
            x: px,
            y: py,
            sprite: heroSprite,
            w: 120,
            h: 120,
            alpha: 0.6,
            decay: 0.045
          });
        } else {
          this.cutscene.ghostTrails.push({
            x: ex,
            y: ey,
            sprite: enemySprite,
            w: enemyW,
            h: enemyH,
            alpha: 0.6,
            decay: 0.045
          });
        }
      }
    }

    for (let i = this.cutscene.ghostTrails.length - 1; i >= 0; i--) {
      const gt = this.cutscene.ghostTrails[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, gt.alpha);
      ctx.drawImage(gt.sprite, gt.x - gt.w / 2, gt.y - gt.h / 2, gt.w, gt.h);
      ctx.restore();
      gt.alpha -= gt.decay;
      if (gt.alpha <= 0) {
        this.cutscene.ghostTrails.splice(i, 1);
      }
    }

    // -----------------------------------------------------------------------
    // 5. DRAW COMBATANTS (DEPTH-SORTED SO FOREGROUND UNIT OVERLAPS ACCURATELY)
    // -----------------------------------------------------------------------
    const drawHero = () => {
      this.drawUnitTeamRing(ctx, px, py, '#06b6d4', 0.9, true);
      ctx.drawImage(heroSprite, px - 60, py - 70, 120, 120);
    };

    const drawEnemy = () => {
      ctx.save();
      if (combatVFX.monsterFlashAlpha > 0) {
        ctx.shadowColor = combatVFX.monsterFlashColor;
        ctx.shadowBlur = 28;
      }

      if (enemyCombatant.isBoss) {
        this.drawUnitTeamRing(ctx, ex, ey, '#ef4444', 1.0, true);
        ctx.drawImage(enemySprite, ex - 120, ey - 118, 240, 240);
      } else if (enemyCombatant.playerRef) {
        this.drawUnitTeamRing(ctx, ex, ey, '#f43f5e', 0.9, true);
        ctx.drawImage(enemySprite, ex - 60, ey - 70, 120, 120);
      } else {
        this.drawUnitTeamRing(ctx, ex, ey, '#f59e0b', 0.9, true);
        ctx.drawImage(enemySprite, ex - 70, ey - 70, 140, 140);
      }
      ctx.restore();
    };

    // Isometric Depth sorting: smaller Y drawn first (background), larger Y drawn second (foreground)
    if (py <= ey) {
      drawHero();
      drawEnemy();
    } else {
      drawEnemy();
      drawHero();
    }

    // -----------------------------------------------------------------------
    // 6. RENDER COMBAT VFX (Arcs, Runic Circles, Craters, Skill Cutscenes)
    // -----------------------------------------------------------------------
    combatVFX.render(ctx, w, h);

    // -----------------------------------------------------------------------
    // 7. CINEMATIC ACTION CUTSCENE BANNER
    // -----------------------------------------------------------------------
    if (this.cutscene.bannerAlpha > 0.01) {
      this.drawCinematicCutsceneBanner(ctx, w, h);
    }

    ctx.restore();
  }

  // =========================================================================
  // HELPER: CINEMATIC COMBAT ACTION CUTSCENE BANNER
  // =========================================================================
  private drawCinematicCutsceneBanner(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const alpha = Math.min(1.0, Math.max(0, this.cutscene.bannerAlpha));
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const by = h * 0.13;
    const bh = 54;
    const bw = Math.min(w * 0.74, 580);
    const bx = (w - bw) / 2;

    // Dark gothic translucent box
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();

    // Glowing border in bannerColor
    ctx.strokeStyle = this.cutscene.bannerColor;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = this.cutscene.bannerColor;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Speed-lines / slash accent ribbons
    ctx.fillStyle = this.cutscene.bannerColor;
    ctx.fillRect(bx + 12, by + 10, 4, bh - 20);
    ctx.fillRect(bx + bw - 16, by + 10, 4, bh - 20);

    // Title text
    ctx.font = 'bold 13px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.cutscene.bannerColor;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.cutscene.bannerText, w / 2, by + 24);

    // Subtitle text
    ctx.font = '9px Silkscreen';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(this.cutscene.bannerSubtext, w / 2, by + 42);

    ctx.restore();
  }

  // =========================================================================
  // HELPER: DARK FANTASY GOTHIC ARENA BACKDROP WITH TORCHES & MIST
  // =========================================================================
  private drawDarkFantasyArenaBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    // 1. Abyssal Atmospheric Vignette Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#030712');    // Abyssal black
    bgGrad.addColorStop(0.35, '#0b1329'); // Deep midnight gothic slate
    bgGrad.addColorStop(0.70, '#111827'); // Chiseled stone arena floor
    bgGrad.addColorStop(1.0, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Distant Gothic Stone Pillars & Wall Buttresses
    const pillarCount = 5;
    const pWidth = 34;
    ctx.fillStyle = '#090d1a';
    for (let i = 0; i < pillarCount; i++) {
      const px = (i + 0.5) * (w / pillarCount);
      // Main pillar shaft
      ctx.fillRect(px - pWidth / 2, 0, pWidth, h * 0.52);

      // Capital & base moulding
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - pWidth / 2 - 4, h * 0.50, pWidth + 8, 8);
      ctx.fillRect(px - pWidth / 2 - 3, 0, pWidth + 6, 8);

      // Iron Torch Sconce on alternate pillars
      if (i % 2 === 1) {
        const ty = h * 0.28;
        // Iron bracket
        ctx.fillStyle = '#334155';
        ctx.fillRect(px - 2, ty, 4, 12);
        ctx.fillRect(px - 6, ty - 2, 12, 4);

        // Torch flame glow aura
        const flamePulse = 0.8 + Math.sin(time * 0.008 + i * 2) * 0.2;
        const flameGrad = ctx.createRadialGradient(px, ty - 6, 2, px, ty - 6, 36 * flamePulse);
        flameGrad.addColorStop(0, 'rgba(251, 146, 60, 0.7)');
        flameGrad.addColorStop(0.4, 'rgba(234, 88, 12, 0.3)');
        flameGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(px, ty - 6, 36 * flamePulse, 0, Math.PI * 2);
        ctx.fill();

        // Core flame
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(px, ty - 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // Floating sparks / embers drifting upward
        for (let s = 0; s < 3; s++) {
          const sparkY = ty - 8 - ((time * 0.04 + s * 14) % 40);
          const sparkX = px + Math.sin(time * 0.005 + s + i) * 6;
          ctx.fillStyle = 'rgba(253, 186, 116, 0.7)';
          ctx.fillRect(sparkX, sparkY, 1.8, 1.8);
        }
      }
      ctx.fillStyle = '#090d1a';
    }

    // 3. Low Creeping Arena Fog / Ground Mist
    ctx.save();
    for (let f = 0; f < 6; f++) {
      const fogX = ((time * 0.02 * (f + 1) * 8 + f * 140) % (w + 200)) - 100;
      const fogY = h * 0.65 + (f % 3) * 22;
      const fogGrad = ctx.createRadialGradient(fogX, fogY, 10, fogX, fogY, 110);
      fogGrad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
      fogGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.07)');
      fogGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = fogGrad;
      ctx.beginPath();
      ctx.ellipse(fogX, fogY, 110, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // =========================================================================
  // HELPER: GRAND EXPANSIVE 2.5D ISOMETRIC COLOSSEUM ARENA FLOOR
  // =========================================================================
  private drawGrandIsometricColosseumFloor(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    drop: number,
    time: number
  ) {
    ctx.save();
    const hw = w / 2;
    const hh = h / 2;

    // 1. Massive Colosseum Shadow Base
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + drop + 16, hw + 24, (hh + drop) * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Foundation Cliff Wall - Left Shaded Face
    const leftGrad = ctx.createLinearGradient(cx - hw, cy, cx, cy + hh + drop);
    leftGrad.addColorStop(0, '#090d16');
    leftGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh + drop);
    ctx.lineTo(cx - hw, cy + drop);
    ctx.closePath();
    ctx.fill();

    // Left Foundation Masonry Courses (Horizontal brick seams)
    ctx.strokeStyle = '#020408';
    ctx.lineWidth = 1.5;
    for (let l = 1; l <= 3; l++) {
      const frac = l / 4;
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy + drop * frac);
      ctx.lineTo(cx, cy + hh + drop * frac);
      ctx.stroke();
    }

    // 3. Foundation Cliff Wall - Right Lit Face
    const rightGrad = ctx.createLinearGradient(cx, cy + hh, cx + hw, cy + drop);
    rightGrad.addColorStop(0, '#111827');
    rightGrad.addColorStop(1, '#0b1120');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy + drop);
    ctx.lineTo(cx, cy + hh + drop);
    ctx.closePath();
    ctx.fill();

    // Right Foundation Masonry Courses
    ctx.strokeStyle = '#030712';
    ctx.lineWidth = 1.5;
    for (let l = 1; l <= 3; l++) {
      const frac = l / 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy + hh + drop * frac);
      ctx.lineTo(cx + hw, cy + drop * frac);
      ctx.stroke();
    }

    // Bottom Base Trim (Chiseled Rock Edge)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + drop);
    ctx.lineTo(cx, cy + hh + drop);
    ctx.lineTo(cx + hw, cy + drop);
    ctx.stroke();

    // 4. Main Grand Isometric Flagstone Floor (Terraria-style dark slate flagstones)
    const floorGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, hw * 0.9);
    floorGrad.addColorStop(0, '#1f293d');
    floorGrad.addColorStop(0.5, '#161f30');
    floorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Chiseled Flagstone Rim Border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 5. Authentic Isometric Flagstone Paving Grid
    const gridSteps = 6;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.lineWidth = 1.2;

    // NW-to-SE lines
    for (let i = 1; i < gridSteps; i++) {
      const t = i / gridSteps;
      const x1 = (cx - hw) + (cx - (cx - hw)) * t;
      const y1 = cy + (cy - hh - cy) * t;
      const x2 = cx + ((cx + hw) - cx) * t;
      const y2 = (cy + hh) + (cy - (cy + hh)) * t;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // SW-to-NE lines
    for (let i = 1; i < gridSteps; i++) {
      const t = i / gridSteps;
      const x1 = (cx - hw) + (cx - (cx - hw)) * t;
      const y1 = cy + (cy + hh - cy) * t;
      const x2 = cx + ((cx + hw) - cx) * t;
      const y2 = (cy - hh) + (cy - (cy - hh)) * t;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 6. Central Dueling Arena Ring & Golden Arcane Seal
    const sealR = Math.min(w * 0.16, 95);
    const sealPulse = 0.8 + Math.sin(time * 0.004) * 0.2;

    // Outer faint rune ring
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.35 * sealPulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sealR, sealR * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glowing ring
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 * sealPulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sealR * 0.65, sealR * 0.65 * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Central Dueling Cross / Star of Fortuna
    ctx.strokeStyle = `rgba(253, 224, 71, ${0.4 * sealPulse})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - sealR * 0.45, cy);
    ctx.lineTo(cx + sealR * 0.45, cy);
    ctx.moveTo(cx, cy - sealR * 0.22);
    ctx.lineTo(cx, cy + sealR * 0.22);
    ctx.stroke();

    // 7. Flanking Stone Torch Braziers on the Arena Wings
    this.drawStoneTorchPillar(ctx, cx - hw * 0.82, cy - hh * 0.08, time, 0);
    this.drawStoneTorchPillar(ctx, cx + hw * 0.82, cy - hh * 0.08, time, 2.5);

    ctx.restore();
  }

  // =========================================================================
  // HELPER: ISOMETRIC CARVED STONE TORCH BRAZIER PILLAR
  // =========================================================================
  private drawStoneTorchPillar(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    time: number,
    phase: number = 0
  ) {
    ctx.save();

    // Pillar Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 10, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Isometric Stepped Stone Plinth (Base)
    const baseW = 26;
    const baseH = 12;
    // Base Left Face
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(bx - baseW / 2, by);
    ctx.lineTo(bx, by + baseH / 2);
    ctx.lineTo(bx, by + baseH / 2 + 8);
    ctx.lineTo(bx - baseW / 2, by + 8);
    ctx.closePath();
    ctx.fill();

    // Base Right Face
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(bx, by + baseH / 2);
    ctx.lineTo(bx + baseW / 2, by);
    ctx.lineTo(bx + baseW / 2, by + 8);
    ctx.lineTo(bx, by + baseH / 2 + 8);
    ctx.closePath();
    ctx.fill();

    // Base Top Rhombus
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(bx, by - baseH / 2);
    ctx.lineTo(bx + baseW / 2, by);
    ctx.lineTo(bx, by + baseH / 2);
    ctx.lineTo(bx - baseW / 2, by);
    ctx.closePath();
    ctx.fill();

    // Vertical Pillar Shaft
    const pWidth = 14;
    const pHeight = 36;
    const py = by - pHeight;
    // Left Shaded Side of shaft
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx - pWidth / 2, py, pWidth / 2, pHeight);
    // Right Lit Side of shaft
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, py, pWidth / 2, pHeight);

    // Shaft Mortar seam
    ctx.fillStyle = '#020617';
    ctx.fillRect(bx - pWidth / 2, py + pHeight * 0.5, pWidth, 1.5);

    // Iron Brazier Basin / Sconce at top
    const bowlY = py - 4;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(bx - 12, bowlY);
    ctx.lineTo(bx + 12, bowlY);
    ctx.lineTo(bx + 8, bowlY + 8);
    ctx.lineTo(bx - 8, bowlY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glowing Charcoal Ember Bed
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(bx - 8, bowlY - 1, 16, 3);

    // Roaring Brazier Fire (Terraria-style multi-tone pixel flame)
    const flameFlicker = Math.sin(time * 0.012 + phase) * 4 + Math.cos(time * 0.018 + phase * 2) * 2;
    const flameH = 22 + flameFlicker;

    // Ambient Flame Radial Glow
    const glowGrad = ctx.createRadialGradient(bx, bowlY - 8, 2, bx, bowlY - 8, 48);
    glowGrad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
    glowGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.20)');
    glowGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(bx, bowlY - 8, 48, 0, Math.PI * 2);
    ctx.fill();

    // Outer Crimson Fire Tongue
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(bx - 7, bowlY);
    ctx.quadraticCurveTo(bx - 6, bowlY - flameH * 0.6, bx, bowlY - flameH);
    ctx.quadraticCurveTo(bx + 6, bowlY - flameH * 0.6, bx + 7, bowlY);
    ctx.closePath();
    ctx.fill();

    // Mid Orange Flame
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(bx - 5, bowlY);
    ctx.quadraticCurveTo(bx - 4, bowlY - flameH * 0.5, bx, bowlY - flameH * 0.85);
    ctx.quadraticCurveTo(bx + 4, bowlY - flameH * 0.5, bx + 5, bowlY);
    ctx.closePath();
    ctx.fill();

    // Core Bright Yellow Flame
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(bx - 3, bowlY);
    ctx.quadraticCurveTo(bx - 2, bowlY - flameH * 0.4, bx, bowlY - flameH * 0.65);
    ctx.quadraticCurveTo(bx + 2, bowlY - flameH * 0.4, bx + 3, bowlY);
    ctx.closePath();
    ctx.fill();

    // Rising Embers / Sparks
    for (let s = 0; s < 3; s++) {
      const sparkY = bowlY - 12 - ((time * 0.05 + s * 16 + phase * 10) % 35);
      const sparkX = bx + Math.sin(time * 0.007 + s + phase) * 8;
      ctx.fillStyle = s % 2 === 0 ? '#fed7aa' : '#fb923c';
      ctx.fillRect(sparkX, sparkY, 2, 2);
    }

    ctx.restore();
  }

  // =========================================================================
  // HELPER: 2.5D ISOMETRIC CARVED STONE DUELING DAIS WITH RUNIC TRIM
  // =========================================================================
  private drawIsometricStoneDais(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    height: number,
    dropHeight: number,
    runeColor: string,
    topColor: string,
    sideColor: string,
    rimColor: string
  ) {
    ctx.save();
    const hw = width / 2;
    const hh = height / 2;

    // 1. Drop Shadow under Dais
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + dropHeight + 8, hw + 14, (hh + dropHeight) * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Left Cliff Drop Face (Shadowed)
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh + dropHeight);
    ctx.lineTo(cx - hw, cy + dropHeight);
    ctx.closePath();
    ctx.fill();

    // Left Masonry Texture Lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + dropHeight * 0.5);
    ctx.lineTo(cx, cy + hh + dropHeight * 0.5);
    ctx.stroke();

    // 3. Right Cliff Drop Face (Lighted side)
    const rightSideGrad = ctx.createLinearGradient(cx, cy, cx + hw, cy + dropHeight);
    rightSideGrad.addColorStop(0, sideColor);
    rightSideGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = rightSideGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy + dropHeight);
    ctx.lineTo(cx, cy + hh + dropHeight);
    ctx.closePath();
    ctx.fill();

    // Right Masonry Texture Lines
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh + dropHeight * 0.5);
    ctx.lineTo(cx + hw, cy + dropHeight * 0.5);
    ctx.stroke();

    // 4. Stepped Lower Border Rim (Drop Depth accent)
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + dropHeight);
    ctx.lineTo(cx, cy + hh + dropHeight);
    ctx.lineTo(cx + hw, cy + dropHeight);
    ctx.stroke();

    // 5. Top Diamond Stone Flagstone Surface
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Top Flagstone Grid Chisel Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Diagonal seams
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx, cy + hh);
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx + hw, cy);
    ctx.stroke();

    // 6. Glowing Inner Runic Diamond Border
    const runePulse = 0.75 + Math.sin(Date.now() * 0.005) * 0.25;
    ctx.save();
    ctx.strokeStyle = runeColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = runeColor;
    ctx.shadowBlur = 10 * runePulse;
    ctx.globalAlpha = 0.85 * runePulse;

    const innerHw = hw - 10;
    const innerHh = hh - 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - innerHh);
    ctx.lineTo(cx + innerHw, cy);
    ctx.lineTo(cx, cy + innerHh);
    ctx.lineTo(cx - innerHw, cy);
    ctx.closePath();
    ctx.stroke();

    // 4 Corner Runic Sigils
    ctx.fillStyle = runeColor;
    ctx.fillRect(cx - 2, cy - innerHh - 2, 4, 4);
    ctx.fillRect(cx + innerHw - 2, cy - 2, 4, 4);
    ctx.fillRect(cx - 2, cy + innerHh - 2, 4, 4);
    ctx.fillRect(cx - innerHw - 2, cy - 2, 4, 4);
    ctx.restore();

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
}
