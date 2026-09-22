import { GameState } from '../game/GameState';
import { BattleEngine, AttackerAction, DefenderAction, Combatant } from '../game/BattleEngine';
import { pixelSprites, CharacterAnimState } from '../engine/PixelSpriteGenerator';
import { aiSystem } from '../game/AISystem';
import { audio } from '../engine/AudioSynthesizer';
import { combatVFX } from '../engine/CombatVFXEngine';
import { BoardNode } from '../game/BoardMap';
import { ecosystemSystem } from '../game/EcosystemSystem';
import { customIsometricMonsterRenderer } from '../engine/CustomIsometricMonsterRenderer';

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
  public companionUsedThisBattle = false;

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

    // Companion Summon Assistant
    document.getElementById('btnCmdSummonCompanion')?.addEventListener('click', () => this.handleCompanionSummon());
    document.getElementById('btnDefSummonCompanion')?.addEventListener('click', () => this.handleCompanionSummon());

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
    this.companionUsedThisBattle = false;

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

        const giveUpBtn = document.getElementById('btnCmdGiveUp');
        if (giveUpBtn) {
          if (!b.attacker.playerRef) {
            giveUpBtn.innerHTML = `
              <span class="text-xl mb-0.5">🏃</span>
              <span class="text-xs font-bold">ถอยหนี</span>
              <span class="text-[8px] text-amber-300">สละเงิน 10% หนีฉุกเฉิน</span>
            `;
          } else {
            giveUpBtn.innerHTML = `
              <span class="text-xl mb-0.5">🏳️</span>
              <span class="text-xs font-bold">ยอมแพ้</span>
              <span class="text-[8px] text-slate-400">จ่าย 30% ยุติศึก</span>
            `;
          }
        }
      } else {
        defGroup.classList.add('hidden');
      }
    }

    // Update companion summon assistant visibility
    const activeP = this.game.activePlayer;
    const btnSummonAtk = document.getElementById('btnCmdSummonCompanion');
    const btnSummonDef = document.getElementById('btnDefSummonCompanion');

    if (activeP && activeP.companion && !this.companionUsedThisBattle) {
      if (btnSummonAtk) {
        btnSummonAtk.classList.remove('hidden');
        const iconEl = document.getElementById('battleCompanionIcon');
        if (iconEl) iconEl.innerText = activeP.companion.avatar;
        const nameEl = document.getElementById('battleCompanionName');
        if (nameEl) nameEl.innerText = activeP.companion.name.split(' ')[0] || 'คู่หู';
        const skillEl = document.getElementById('battleCompanionSkill');
        if (skillEl) skillEl.innerText = activeP.companion.skillName.split(' ')[0] || 'ช่วยสู้';
      }
      if (btnSummonDef) {
        btnSummonDef.classList.remove('hidden');
      }
    } else {
      btnSummonAtk?.classList.add('hidden');
      btnSummonDef?.classList.add('hidden');
    }
  }

  public handleCompanionSummon() {
    if (this.companionUsedThisBattle || this.isExecutingRound) return;
    const b = this.game.activeBattle;
    if (!b) return;

    const player = this.game.activePlayer;
    if (!player || !player.companion) return;

    this.companionUsedThisBattle = true;
    document.getElementById('btnCmdSummonCompanion')?.classList.add('hidden');
    document.getElementById('btnDefSummonCompanion')?.classList.add('hidden');

    audio.fanfare();

    const w = this.canvas.width;
    const h = this.canvas.height;
    const arenaCX = w * 0.50;
    const arenaCY = h * 0.56;
    const isPAtk = b.isPlayerAttacking;
    const summonX = isPAtk ? arenaCX - 120 : arenaCX + 120;
    const summonY = arenaCY + 20;
    const enemyX = isPAtk ? arenaCX + 130 : arenaCX - 130;
    const enemyY = arenaCY - 25;

    const companion = player.companion;

    // Spawn magical companion warp portal
    combatVFX.spawnCompanionSummonPortal(summonX, summonY, companion.color || '#ec4899');
    combatVFX.spawnFloatingCombatText(summonX, summonY - 50, `💖 ${companion.name}!`, 'crit');
    combatVFX.triggerSkillCutscene(companion.skillName, summonX, summonY, enemyX, enemyY, 'mage', false);

    const enemy = isPAtk ? b.defender : b.attacker;
    const dmg = 45 + Math.floor(player.getTotalStat('atk') * 0.85);
    enemy.hp = Math.max(0, enemy.hp - dmg);

    setTimeout(() => {
      // Fire companion laser beam & impact!
      combatVFX.spawnMagicLaserBeam(summonX, summonY - 50, enemyX, enemyY - 50, companion.color || '#f43f5e', 22);
      combatVFX.spawnFloatingCombatText(enemyX, enemyY - 60, `-${dmg} HP!`, 'crit');
      audio.strikeHit();
      this.updateUI();

      const logMsg = `💖 [คู่หูเข้าช่วยรบ!] ${companion.name} ปรากฏตัวจากประตูมิติ ร่าย [${companion.skillName}] สร้างความเสียหายรุนแรง ${dmg} แก่ ${enemy.name}!`;
      document.getElementById('battleNarration')!.innerText = logMsg;
      this.game.addLog(logMsg, 'battle');

      if (enemy.hp <= 0) {
        setTimeout(() => {
          this.concludeBattle(b.attacker.hp > 0 ? b.attacker : b.defender, enemy);
        }, 1200);
      }
    }, 450);
  }

  public triggerEmergencyCompanionAssist(playerC: Combatant, enemyC: Combatant, onComplete: () => void) {
    const pRef = playerC.playerRef;
    if (!pRef || !pRef.companion) {
      onComplete();
      return;
    }
    this.companionUsedThisBattle = true;
    const comp = pRef.companion;
    audio.fanfare();

    const w = this.canvas.width;
    const h = this.canvas.height;
    const arenaCX = w * 0.50;
    const arenaCY = h * 0.56;
    const isPAtk = this.game.activeBattle?.isPlayerAttacking ?? true;
    const summonX = isPAtk ? arenaCX - 120 : arenaCX + 120;
    const summonY = arenaCY + 20;
    const enemyX = isPAtk ? arenaCX + 130 : arenaCX - 130;
    const enemyY = arenaCY - 25;

    combatVFX.spawnCompanionSummonPortal(summonX, summonY, comp.color || '#ec4899');
    combatVFX.spawnFloatingCombatText(summonX, summonY - 50, `💖 ${comp.name}!`, 'crit');

    // Heal player
    const healAmt = Math.max(25, Math.floor(playerC.maxHp * 0.35));
    playerC.hp = Math.min(playerC.maxHp, playerC.hp + healAmt);
    if (pRef) pRef.hp = playerC.hp;

    // Counter strike damage
    const assistDmg = 35 + Math.floor((pRef.getTotalStat('atk') + pRef.getTotalStat('mag')) * 0.55);
    enemyC.hp = Math.max(0, enemyC.hp - assistDmg);
    if (enemyC.playerRef) enemyC.playerRef.hp = enemyC.hp;

    const logMsg = `🛡️💖 [คู่หูเข้าช่วยเหลือฉุกเฉิน!] ${comp.name} กระโจนเข้ามาขวางหน้ากางบาเรียคุ้มกัน ฟื้นฟู HP +${healAmt} และร่าย [${comp.skillName || 'Companion Strike'}] สวนกลับสร้างความเสียหาย ${assistDmg} แก่ ${enemyC.name}!`;
    document.getElementById('battleNarration')!.innerText = logMsg;
    this.game.addLog(logMsg, 'battle');

    combatVFX.spawnFloatingCombatText(summonX, summonY - 30, `+${healAmt} HP!`, 'heal');
    combatVFX.spawnMagicLaserBeam(summonX, summonY - 50, enemyX, enemyY - 50, comp.color || '#f43f5e', 22);
    combatVFX.spawnFloatingCombatText(enemyX, enemyY - 60, `-${assistDmg} HP!`, 'crit');

    this.updateUI();

    setTimeout(() => {
      if (enemyC.hp <= 0) {
        this.concludeBattle(playerC, enemyC);
      } else {
        onComplete();
      }
    }, 1400);
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
            atkBaseX + targetAtkDX + (isPAtk ? 25 : -25),
            atkBaseY + targetAtkDY - 80,
            hitX,
            hitY - 60,
            b.attacker.classKey || 'warrior',
            b.attacker.playerRef?.isDarkling || false
          );
        } else if (result.isStrikeSuccess) {
          audio.strikeHit();
          combatVFX.spawnStrikeHit(hitX, hitY - 50);
        } else if (atkAction === 'magic') {
          if (result.isMagicBlocked) {
            audio.magicGuardBlock();
          } else {
            audio.magicHit();
          }
          combatVFX.spawnMagicLaserBeam(
            atkBaseX + targetAtkDX + (isPAtk ? 25 : -25),
            atkBaseY + targetAtkDY - 80,
            hitX,
            hitY - 60,
            b.attacker.classKey === 'cleric' ? '#fde047' : '#c084fc',
            22
          );
          combatVFX.spawnMagicHit(hitX, hitY - 60, b.attacker.classKey === 'cleric');
        } else {
          if (defAction === 'defend') {
            audio.defendBlock();
          } else {
            audio.attackHit();
          }
          if (isPAtk) {
            combatVFX.spawnAttackHit(hitX, hitY - 50);
          } else {
            combatVFX.spawnMonsterAttack(
              atkBaseX + targetAtkDX,
              atkBaseY + targetAtkDY - 50,
              hitX,
              hitY - 50,
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

          // Emergency Companion Assist check:
          const playerC = b.attacker.playerRef ? b.attacker : (b.defender.playerRef ? b.defender : null);
          const enemyC = b.attacker.playerRef ? b.defender : (b.defender.playerRef ? b.attacker : null);
          const pRef = playerC?.playerRef;

          if (
            playerC &&
            enemyC &&
            pRef?.companion &&
            !this.companionUsedThisBattle &&
            playerC.hp > 0 &&
            playerC.hp < playerC.maxHp * 0.40 &&
            Math.random() < 0.65
          ) {
            this.triggerEmergencyCompanionAssist(playerC, enemyC, () => {
              b.swapTurns();
              this.updateUI();
              this.updateCommandMenu();
              this.checkAITurn();
            });
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
    // 1. DYNAMIC LOCATION / BIOME COMBAT ARENA BACKDROP
    // -----------------------------------------------------------------------
    const p = this.game.activePlayer;
    const currentNode = (this.game.allNodes && p)
      ? (this.game.allNodes.find(n => n.id === p.nodeId) || this.game.allNodes[0])
      : null;
    const biome = currentNode?.biome || 'grass';
    const isBoss = !!b.defender.isBoss || !!b.attacker.isBoss;

    this.drawDynamicLocationBackdrop(ctx, w, h, time, currentNode, isBoss);

    // -----------------------------------------------------------------------
    // 2. GRAND EXPANSIVE 2.5D ISOMETRIC ARENA FLOOR THEMED BY BIOME
    // -----------------------------------------------------------------------
    this.drawGrandIsometricColosseumFloor(ctx, arenaCX, arenaCY, arenaW, arenaH, arenaDrop, time, biome);

    const pxCenter = arenaCX - arenaW * 0.22;
    const pyCenter = arenaCY + arenaH * 0.12;
    const exCenter = arenaCX + arenaW * 0.22;
    const eyCenter = arenaCY - arenaH * 0.12;
    const zoneW = arenaW * 0.36;
    const zoneH = arenaH * 0.36;

    // Themed Elevated 2.5D Dais Colors
    const daisColors = this.getBiomeDaisTheme(biome);

    // Player Dais (Cyan/Azure Mystic Rune Trim)
    this.drawIsometricStoneDais(
      ctx,
      pxCenter,
      pyCenter,
      zoneW,
      zoneH,
      18,
      '#06b6d4',
      daisColors.top,
      daisColors.side,
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
      daisColors.top,
      daisColors.side,
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
      enemySprite = customIsometricMonsterRenderer.getMonsterSprite('Dragon Princess Ignis', 'SW', eAnim, pFrame);
      enemyW = 140;
      enemyH = 140;
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
            y: py - 64,
            sprite: heroSprite,
            w: 140,
            h: 140,
            alpha: 0.6,
            decay: 0.045
          });
        } else {
          this.cutscene.ghostTrails.push({
            x: ex,
            y: ey - (enemyCombatant.isBoss ? 67 : 64),
            sprite: enemySprite,
            w: enemyCombatant.isBoss ? 150 : 140,
            h: enemyCombatant.isBoss ? 150 : 140,
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
    // 5. DRAW COMBATANTS (PERFECTLY CENTERED ON DIAMOND DAIS CELLS)
    // -----------------------------------------------------------------------
    // In our 2.5D Isometric projection, the dais top surface is centered at (px, py).
    // The hero and monster sprites are anchored so their ground feet align exactly with dais center!
    const drawHero = () => {
      this.drawUnitTeamRing(ctx, px, py - 14, '#06b6d4', 0.9, true);
      // Hero sprite enlarged to 140x140, centered on dais diamond surface
      ctx.drawImage(heroSprite, px - 70, py - 134, 140, 140);
    };

    const drawEnemy = () => {
      ctx.save();
      if (combatVFX.monsterFlashAlpha > 0) {
        ctx.shadowColor = combatVFX.monsterFlashColor;
        ctx.shadowBlur = 28;
      }

      if (enemyCombatant.isBoss) {
        this.drawUnitTeamRing(ctx, ex, ey - 14, '#ef4444', 1.0, true);
        ctx.drawImage(enemySprite, ex - 75, ey - 142, 150, 150);
      } else if (enemyCombatant.playerRef) {
        this.drawUnitTeamRing(ctx, ex, ey - 14, '#f43f5e', 0.9, true);
        ctx.drawImage(enemySprite, ex - 70, ey - 134, 140, 140);
      } else {
        this.drawUnitTeamRing(ctx, ex, ey - 14, '#f59e0b', 0.9, true);
        ctx.drawImage(enemySprite, ex - 70, ey - 134, 140, 140);
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
  // =========================================================================
  // THEMED DAIS & FLOOR COLOR PALETTES PER BIOME
  // =========================================================================
  private getBiomeDaisTheme(biome: string): { top: string; side: string } {
    switch (biome) {
      case 'castle':
        return { top: '#1e293b', side: '#0f172a' };
      case 'forest':
      case 'grass':
        return { top: '#14291f', side: '#0b1913' };
      case 'fairy_grove':
        return { top: '#2e122b', side: '#190a18' };
      case 'snow':
        return { top: '#1c2d44', side: '#0e1a29' };
      case 'volcano':
        return { top: '#2c120f', side: '#170908' };
      case 'desert':
        return { top: '#2d2214', side: '#18120a' };
      case 'cavern':
      case 'crystal_cavern':
        return { top: '#26173a', side: '#130a1e' };
      case 'coral':
        return { top: '#102936', side: '#07161e' };
      case 'abyss':
        return { top: '#1f0d2c', side: '#0f0517' };
      case 'celestial':
        return { top: '#2b2338', side: '#171120' };
      default:
        return { top: '#1e293b', side: '#0f172a' };
    }
  }

  private getBiomeFloorColors(biome: string): { center: string; mid: string; edge: string; rim: string } {
    switch (biome) {
      case 'castle':
        return { center: '#334155', mid: '#1e293b', edge: '#0f172a', rim: '#f59e0b' };
      case 'forest':
      case 'grass':
        return { center: '#1b3b2b', mid: '#13281e', edge: '#0a1610', rim: '#10b981' };
      case 'fairy_grove':
        return { center: '#3b1d3d', mid: '#281329', edge: '#160a17', rim: '#f472b6' };
      case 'snow':
        return { center: '#2d4460', mid: '#1a2a3d', edge: '#0c1622', rim: '#38bdf8' };
      case 'volcano':
        return { center: '#3b1c14', mid: '#28120c', edge: '#140805', rim: '#ea580c' };
      case 'desert':
        return { center: '#3d311d', mid: '#292012', edge: '#171209', rim: '#eab308' };
      case 'cavern':
      case 'crystal_cavern':
        return { center: '#321c47', mid: '#20122e', edge: '#110919', rim: '#a855f7' };
      case 'coral':
        return { center: '#163847', mid: '#0f2631', edge: '#07141a', rim: '#06b6d4' };
      case 'abyss':
        return { center: '#2b103b', mid: '#1c0926', edge: '#0d0412', rim: '#c084fc' };
      case 'celestial':
        return { center: '#3b324a', mid: '#282133', edge: '#17121f', rim: '#fbbf24' };
      default:
        return { center: '#1f293d', mid: '#161f30', edge: '#0f172a', rim: '#475569' };
    }
  }

  // =========================================================================
  // DYNAMIC LOCATION COMBAT ARENA BACKDROP ROUTER
  // =========================================================================
  private drawDynamicLocationBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    node: BoardNode | null,
    isBoss: boolean
  ) {
    const biome = node?.biome || 'grass';
    const type = node?.type || 'empty';

    if (isBoss || type === 'boss') {
      this.drawBossDragonThroneBackdrop(ctx, w, h, time);
    } else if (type === 'town' || biome === 'castle') {
      this.drawCastlePalaceBackdrop(ctx, w, h, time, node);
    } else if (biome === 'forest' || biome === 'grass') {
      this.drawEnchantedForestBackdrop(ctx, w, h, time, biome === 'forest');
    } else if (biome === 'fairy_grove') {
      this.drawFairyBlossomBackdrop(ctx, w, h, time);
    } else if (biome === 'snow') {
      this.drawFrostpeakSnowBackdrop(ctx, w, h, time);
    } else if (biome === 'volcano') {
      this.drawVolcanicCalderaBackdrop(ctx, w, h, time);
    } else if (biome === 'desert') {
      this.drawDesertDunesBackdrop(ctx, w, h, time);
    } else if (biome === 'cavern' || biome === 'crystal_cavern') {
      this.drawCrystalCavernBackdrop(ctx, w, h, time);
    } else if (biome === 'coral' || type === 'fishing') {
      this.drawCoralOceanBackdrop(ctx, w, h, time);
    } else if (biome === 'abyss' || type === 'dark_gate') {
      this.drawAbyssalVoidBackdrop(ctx, w, h, time);
    } else if (biome === 'celestial') {
      this.drawCelestialSanctumBackdrop(ctx, w, h, time);
    } else {
      this.drawCastlePalaceBackdrop(ctx, w, h, time, node);
    }
  }

  // 1. CASTLE & ROYAL PALACE INTERIOR (ปราสาทและพระราชวังหลวง)
  private drawCastlePalaceBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    node: BoardNode | null
  ) {
    // Royal Deep Midnight Navy to Gothic Slate
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060a17');
    bgGrad.addColorStop(0.4, '#0f172a');
    bgGrad.addColorStop(0.8, '#1e293b');
    bgGrad.addColorStop(1.0, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grand Gothic Arches in Upper Hall
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i++) {
      const ax = (i + 0.5) * (w / 4);
      ctx.beginPath();
      ctx.arc(ax, h * 0.28, w * 0.12, Math.PI, 0);
      ctx.stroke();
    }

    // Grand Stained Glass Window in Center
    const winCX = w * 0.5;
    const winCY = h * 0.22;
    const winR = Math.min(w * 0.14, 80);
    const winPulse = 0.85 + Math.sin(time * 0.003) * 0.15;

    // Glowing Rose Window Backlight
    const winGlow = ctx.createRadialGradient(winCX, winCY, 10, winCX, winCY, winR * 1.5);
    winGlow.addColorStop(0, `rgba(251, 191, 36, ${0.4 * winPulse})`);
    winGlow.addColorStop(0.5, `rgba(56, 189, 248, ${0.25 * winPulse})`);
    winGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = winGlow;
    ctx.beginPath();
    ctx.arc(winCX, winCY, winR * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Rose Window Frame
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(winCX, winCY, winR, 0, Math.PI * 2);
    ctx.stroke();
    // Rose Petal Traceries
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(winCX, winCY);
      ctx.lineTo(winCX + Math.cos(ang) * winR, winCY + Math.sin(ang) * winR);
      ctx.stroke();
    }

    // Carved Marble Pillars with Royal Banners
    const pillarCount = 5;
    for (let i = 0; i < pillarCount; i++) {
      const px = (i + 0.5) * (w / pillarCount);
      // Pillar Shaft
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 18, 0, 36, h * 0.55);
      // Fluting Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 8, 0);
      ctx.lineTo(px - 8, h * 0.55);
      ctx.moveTo(px + 8, 0);
      ctx.lineTo(px + 8, h * 0.55);
      ctx.stroke();

      // Royal Tapestry Banners on alternate pillars
      if (i === 1 || i === 3) {
        const by = h * 0.16;
        ctx.fillStyle = '#881337'; // Royal Crimson
        ctx.beginPath();
        ctx.moveTo(px - 14, by);
        ctx.lineTo(px + 14, by);
        ctx.lineTo(px + 14, by + 65);
        ctx.lineTo(px, by + 80);
        ctx.lineTo(px - 14, by + 65);
        ctx.closePath();
        ctx.fill();

        // Golden Emblem Trim
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px, by + 35, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Torches with Golden Sconces
      if (i === 0 || i === 4 || i === 2) {
        this.drawWallTorch(ctx, px, h * 0.32, time, i);
      }
    }
  }

  // 2. ENCHANTED FOREST (ป่าโบราณเห็ดเรืองแสง)
  private drawEnchantedForestBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    isDeep: boolean
  ) {
    // Mystical Emerald Twilight Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#021810');
    bgGrad.addColorStop(0.4, '#062d1d');
    bgGrad.addColorStop(0.75, '#0b3d27');
    bgGrad.addColorStop(1.0, '#020d07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Sunbeams / Moonbeams Filtering Through Canopy
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.sin(time * 0.002) * 0.03;
    const beamGrad = ctx.createLinearGradient(0, 0, w, h * 0.8);
    beamGrad.addColorStop(0, '#6ee7b7');
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    for (let b = 0; b < 5; b++) {
      const bx = b * (w / 4) - 50;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 90, 0);
      ctx.lineTo(bx + 240, h * 0.6);
      ctx.lineTo(bx + 110, h * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Silhouetted Ancient Trees with Twisted Roots
    const treeCount = 6;
    for (let i = 0; i < treeCount; i++) {
      const tx = (i + 0.3) * (w / (treeCount - 1)) + Math.sin(i * 3) * 20;
      const trunkW = 28 + (i % 3) * 10;
      ctx.fillStyle = '#03170e';
      ctx.beginPath();
      ctx.moveTo(tx - trunkW * 0.4, 0);
      ctx.lineTo(tx + trunkW * 0.4, 0);
      ctx.lineTo(tx + trunkW * 0.7, h * 0.55);
      ctx.lineTo(tx - trunkW * 0.7, h * 0.55);
      ctx.closePath();
      ctx.fill();

      // Hanging Vine Strands
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 2;
      for (let v = 0; v < 3; v++) {
        const vx = tx - trunkW * 0.3 + v * (trunkW * 0.3);
        const vLen = 40 + ((i + v) * 17) % 55;
        ctx.beginPath();
        ctx.moveTo(vx, h * 0.15);
        ctx.quadraticCurveTo(vx + Math.sin(time * 0.003 + v) * 8, h * 0.15 + vLen * 0.5, vx + 4, h * 0.15 + vLen);
        ctx.stroke();
      }
    }

    // Giant Bioluminescent Mushroom Flora in Midground
    for (let m = 0; m < 5; m++) {
      const mx = (m + 0.5) * (w / 5) + Math.cos(m * 2) * 35;
      const my = h * 0.42 + (m % 2) * 25;
      const mR = 24 + (m % 3) * 8;
      const mColor = m % 2 === 0 ? '#10b981' : '#06b6d4';
      const mPulse = 0.8 + Math.sin(time * 0.005 + m * 1.5) * 0.2;

      // Stem
      ctx.fillStyle = '#062d1d';
      ctx.fillRect(mx - 4, my, 8, h * 0.55 - my);

      // Glow Aura
      const mGlow = ctx.createRadialGradient(mx, my, 4, mx, my, mR * 1.4);
      mGlow.addColorStop(0, mColor === '#10b981' ? `rgba(16, 185, 129, ${0.4 * mPulse})` : `rgba(6, 182, 212, ${0.4 * mPulse})`);
      mGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = mGlow;
      ctx.beginPath();
      ctx.arc(mx, my, mR * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Cap
      ctx.fillStyle = mColor;
      ctx.beginPath();
      ctx.ellipse(mx, my, mR, mR * 0.55, 0, Math.PI, 0);
      ctx.fill();

      // Cap Dots
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.arc(mx - mR * 0.4, my - mR * 0.2, 2.5, 0, Math.PI * 2);
      ctx.arc(mx + mR * 0.35, my - mR * 0.25, 2.2, 0, Math.PI * 2);
      ctx.arc(mx, my - mR * 0.35, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drifting Fairy Fireflies / Spores
    for (let s = 0; s < 18; s++) {
      const fx = ((time * 0.03 * (s % 3 + 1) + s * 73) % (w + 40)) - 20;
      const fy = h * 0.2 + ((time * 0.015 + s * 47) % (h * 0.4));
      const fPulse = 0.5 + Math.sin(time * 0.007 + s) * 0.5;
      ctx.fillStyle = s % 2 === 0 ? `rgba(110, 231, 183, ${0.8 * fPulse})` : `rgba(125, 211, 252, ${0.8 * fPulse})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. FAIRY BLOSSOM GLADE (ป่าภูตพฤกษาซากุระมนตรา)
  private drawFairyBlossomBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Dreamy Twilight Sakura Pink to Lavender Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1e0b24');
    bgGrad.addColorStop(0.35, '#3b123f');
    bgGrad.addColorStop(0.7, '#240f28');
    bgGrad.addColorStop(1.0, '#0b040d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Glowing Sacred Moon
    const moonX = w * 0.75;
    const moonY = h * 0.2;
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 70);
    moonGrad.addColorStop(0, 'rgba(253, 230, 138, 0.9)');
    moonGrad.addColorStop(0.3, 'rgba(244, 114, 182, 0.4)');
    moonGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fill();

    // Silhouetted Ancient Sakura Branches
    ctx.strokeStyle = '#18071c';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.1);
    ctx.quadraticCurveTo(w * 0.2, h * 0.18, w * 0.45, h * 0.08);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.17);
    ctx.lineTo(w * 0.28, h * 0.32);
    ctx.stroke();

    // Sakura Blossom Foliage Clouds
    for (let b = 0; b < 7; b++) {
      const bx = b * (w / 6) + 30;
      const by = h * 0.12 + Math.sin(b * 1.7) * 20;
      const bGrad = ctx.createRadialGradient(bx, by, 10, bx, by, 50);
      bGrad.addColorStop(0, 'rgba(244, 114, 182, 0.75)');
      bGrad.addColorStop(0.6, 'rgba(219, 39, 119, 0.4)');
      bGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Falling Sakura Petals & Magic Wisps
    for (let p = 0; p < 24; p++) {
      const px = ((time * 0.05 * (p % 3 + 1) + p * 60) % (w + 60)) - 30;
      const py = ((time * 0.035 * (p % 2 + 1) + p * 45) % (h * 0.8));
      const pSway = Math.sin(time * 0.005 + p) * 12;
      ctx.save();
      ctx.translate(px + pSway, py);
      ctx.rotate(time * 0.004 + p);
      ctx.fillStyle = p % 2 === 0 ? '#fbcfe8' : '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 4. FROSTPEAK SNOW (ยอดเขาหิมะและแสงเหนือ)
  private drawFrostpeakSnowBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Glacial Night to Deep Frost Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#020c1b');
    bgGrad.addColorStop(0.35, '#08213f');
    bgGrad.addColorStop(0.7, '#0e345c');
    bgGrad.addColorStop(1.0, '#030812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Waving Aurora Borealis Curtains
    ctx.save();
    for (let a = 0; a < 3; a++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.08 + a * 20);
      for (let x = 0; x <= w; x += 40) {
        const wave = Math.sin((x * 0.008) + (time * 0.002) + a) * 35 + Math.cos((x * 0.004) + a) * 20;
        ctx.lineTo(x, h * 0.12 + a * 25 + wave);
      }
      ctx.lineTo(w, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      const aGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
      aGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      aGrad.addColorStop(0.4, a % 2 === 0 ? 'rgba(52, 211, 153, 0.22)' : 'rgba(56, 189, 248, 0.25)');
      aGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = aGrad;
      ctx.fill();
    }
    ctx.restore();

    // Silhouetted Jagged Glacial Spun Mountains
    ctx.fillStyle = '#06162d';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.15, h * 0.25);
    ctx.lineTo(w * 0.35, h * 0.45);
    ctx.lineTo(w * 0.55, h * 0.18);
    ctx.lineTo(w * 0.78, h * 0.42);
    ctx.lineTo(w * 0.92, h * 0.28);
    ctx.lineTo(w, h * 0.55);
    ctx.closePath();
    ctx.fill();

    // Frost Pine Silhouettes
    for (let p = 0; p < 8; p++) {
      const px = (p + 0.4) * (w / 8);
      const py = h * 0.45 + (p % 3) * 15;
      ctx.fillStyle = '#030c18';
      ctx.beginPath();
      ctx.moveTo(px, py - 45);
      ctx.lineTo(px + 18, py);
      ctx.lineTo(px - 18, py);
      ctx.closePath();
      ctx.fill();
      // Snow cap
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(px, py - 45);
      ctx.lineTo(px + 7, py - 28);
      ctx.lineTo(px - 7, py - 28);
      ctx.closePath();
      ctx.fill();
    }

    // Falling Snow Particles
    for (let s = 0; s < 30; s++) {
      const sx = ((time * 0.02 * (s % 4 + 1) + s * 45) % (w + 20)) - 10;
      const sy = ((time * 0.04 * (s % 3 + 1) + s * 35) % (h * 0.85));
      ctx.fillStyle = 'rgba(240, 249, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + (s % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. VOLCANIC CALDERA & MAGMA CORE (ภูเขาไฟและธารลาวา)
  private drawVolcanicCalderaBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Dark Basalt to Scorching Orange Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#100503');
    bgGrad.addColorStop(0.35, '#260a04');
    bgGrad.addColorStop(0.7, '#451004');
    bgGrad.addColorStop(1.0, '#080201');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Cascading Molten Lava Falls in Background
    const lavaPulse = 0.85 + Math.sin(time * 0.007) * 0.15;
    for (let l = 0; l < 3; l++) {
      const lx = w * 0.25 + l * (w * 0.25);
      const lGrad = ctx.createLinearGradient(lx, 0, lx, h * 0.55);
      lGrad.addColorStop(0, '#ea580c');
      lGrad.addColorStop(0.5, '#facc15');
      lGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = lGrad;
      ctx.fillRect(lx - 12, 0, 24, h * 0.55);

      // Lava Flow Glow Aura
      const lGlow = ctx.createRadialGradient(lx, h * 0.4, 10, lx, h * 0.4, 80 * lavaPulse);
      lGlow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
      lGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = lGlow;
      ctx.beginPath();
      ctx.arc(lx, h * 0.4, 80 * lavaPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Basalt Rock Formations
    ctx.fillStyle = '#0f0503';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.52);
    ctx.lineTo(w * 0.2, h * 0.32);
    ctx.lineTo(w * 0.38, h * 0.48);
    ctx.lineTo(w * 0.62, h * 0.26);
    ctx.lineTo(w * 0.85, h * 0.50);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.55);
    ctx.closePath();
    ctx.fill();

    // Rising Fiery Embers & Sparks
    for (let e = 0; e < 25; e++) {
      const ex = ((e * 47 + Math.sin(time * 0.004 + e) * 30) % w);
      const ey = h * 0.65 - ((time * 0.06 * (e % 3 + 1) + e * 35) % (h * 0.65));
      ctx.fillStyle = e % 2 === 0 ? '#fbbf24' : '#f97316';
      ctx.fillRect(ex, ey, 2.5, 2.5);
    }
  }

  // 6. DESERT DUNES & ANCIENT RUINS (ทะเลทรายและซากอารยธรรม)
  private drawDesertDunesBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Starry Desert Night to Warm Sand Horizon
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060b1e');
    bgGrad.addColorStop(0.4, '#171a33');
    bgGrad.addColorStop(0.7, '#382b1c');
    bgGrad.addColorStop(1.0, '#0f0c08');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars in Desert Sky
    for (let s = 0; s < 30; s++) {
      const sx = (s * 39 + 17) % w;
      const sy = (s * 27 + 5) % (h * 0.35);
      const sTwinkle = 0.5 + Math.sin(time * 0.006 + s) * 0.5;
      ctx.fillStyle = `rgba(254, 240, 138, ${sTwinkle})`;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Distant Sand Dunes
    ctx.fillStyle = '#453218';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.42);
    ctx.quadraticCurveTo(w * 0.25, h * 0.32, w * 0.5, h * 0.44);
    ctx.quadraticCurveTo(w * 0.75, h * 0.35, w, h * 0.45);
    ctx.lineTo(w, h * 0.55);
    ctx.lineTo(0, h * 0.55);
    ctx.closePath();
    ctx.fill();

    // Ancient Sandstone Obelisks & Ruins
    for (let o = 0; o < 4; o++) {
      const ox = (o + 0.5) * (w / 4) + (o === 1 ? -20 : 30);
      ctx.fillStyle = '#291e10';
      ctx.beginPath();
      ctx.moveTo(ox - 10, h * 0.55);
      ctx.lineTo(ox - 6, h * 0.25);
      ctx.lineTo(ox, h * 0.22); // Pyramidal top
      ctx.lineTo(ox + 6, h * 0.25);
      ctx.lineTo(ox + 10, h * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 7. CRYSTAL CAVERN (ถ้ำคริสตัลอัญมณีประกาย)
  private drawCrystalCavernBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Deep Subterranean Amethyst & Teal Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090312');
    bgGrad.addColorStop(0.35, '#170929');
    bgGrad.addColorStop(0.7, '#24103d');
    bgGrad.addColorStop(1.0, '#05010a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Cavern Ceiling Stalactites
    ctx.fillStyle = '#0c0517';
    for (let s = 0; s < 9; s++) {
      const sx = (s + 0.5) * (w / 9);
      const sLen = 35 + ((s * 23) % 45);
      ctx.beginPath();
      ctx.moveTo(sx - 14, 0);
      ctx.lineTo(sx + 14, 0);
      ctx.lineTo(sx, sLen);
      ctx.closePath();
      ctx.fill();
    }

    // Giant Faceted Crystals (Amethyst & Emerald)
    for (let c = 0; c < 6; c++) {
      const cx = (c + 0.5) * (w / 6) + Math.sin(c) * 20;
      const cy = h * 0.48;
      const cColor = c % 2 === 0 ? '#a855f7' : '#06b6d4';
      const cHeight = 65 + (c % 3) * 25;
      const cWidth = 18 + (c % 2) * 8;
      const cPulse = 0.8 + Math.sin(time * 0.005 + c) * 0.2;

      // Glow
      const cGlow = ctx.createRadialGradient(cx, cy - cHeight * 0.5, 5, cx, cy - cHeight * 0.5, 60 * cPulse);
      cGlow.addColorStop(0, cColor === '#a855f7' ? `rgba(168, 85, 247, ${0.45 * cPulse})` : `rgba(6, 182, 212, ${0.45 * cPulse})`);
      cGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = cGlow;
      ctx.beginPath();
      ctx.arc(cx, cy - cHeight * 0.5, 60 * cPulse, 0, Math.PI * 2);
      ctx.fill();

      // Faceted Crystal Body
      ctx.fillStyle = cColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - cHeight);
      ctx.lineTo(cx + cWidth, cy - cHeight * 0.7);
      ctx.lineTo(cx + cWidth * 0.6, cy);
      ctx.lineTo(cx - cWidth * 0.6, cy);
      ctx.lineTo(cx - cWidth, cy - cHeight * 0.7);
      ctx.closePath();
      ctx.fill();

      // Highlight Edge
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - cHeight);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    // Sparkling Crystal Dust Particles
    for (let d = 0; d < 20; d++) {
      const dx = ((time * 0.02 * (d % 3 + 1) + d * 55) % (w + 20)) - 10;
      const dy = h * 0.25 + ((time * 0.01 + d * 33) % (h * 0.35));
      const dTwinkle = 0.4 + Math.sin(time * 0.008 + d) * 0.6;
      ctx.fillStyle = `rgba(232, 121, 249, ${dTwinkle})`;
      ctx.fillRect(dx, dy, 2, 2);
    }
  }

  // 8. CORAL COAST & OCEAN PIER (ชายฝั่งทะเลและเกาะปะการัง)
  private drawCoralOceanBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Tropical Azure Sky to Sea Horizon
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#082f49');
    bgGrad.addColorStop(0.35, '#0e7490');
    bgGrad.addColorStop(0.65, '#06b6d4');
    bgGrad.addColorStop(1.0, '#021824');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant Tropical Island Silhouette
    ctx.fillStyle = '#083344';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.45);
    ctx.quadraticCurveTo(w * 0.3, h * 0.32, w * 0.5, h * 0.45);
    ctx.closePath();
    ctx.fill();

    // Rolling Animated Ocean Waves
    for (let wave = 0; wave < 4; wave++) {
      const wy = h * 0.38 + wave * 18;
      ctx.beginPath();
      ctx.moveTo(0, wy);
      for (let x = 0; x <= w; x += 30) {
        const yOff = Math.sin((x * 0.015) + (time * 0.004) + wave) * 7;
        ctx.lineTo(x, wy + yOff);
      }
      ctx.lineTo(w, h * 0.55);
      ctx.lineTo(0, h * 0.55);
      ctx.closePath();
      ctx.fillStyle = wave % 2 === 0 ? '#0891b2' : '#06b6d4';
      ctx.fill();

      // White Sea Foam Crests
      ctx.strokeStyle = '#cffafe';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // 9. ABYSSAL VOID GATE (มิติมืดและประตูสู่อเวจี)
  private drawAbyssalVoidBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Cosmic Void Black to Darkling Magenta
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#030005');
    bgGrad.addColorStop(0.4, '#170321');
    bgGrad.addColorStop(0.75, '#2e0840');
    bgGrad.addColorStop(1.0, '#040008');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Swirling Abyssal Vortex in Center
    const vCX = w * 0.5;
    const vCY = h * 0.25;
    ctx.save();
    ctx.translate(vCX, vCY);
    ctx.rotate(time * 0.001);
    for (let r = 0; r < 4; r++) {
      ctx.rotate(Math.PI / 2);
      const vGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
      vGrad.addColorStop(0, '#c084fc');
      vGrad.addColorStop(0.5, '#7e22ce');
      vGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      ctx.ellipse(30, 0, 60, 25, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Floating Shattered Dark Monoliths
    for (let m = 0; m < 5; m++) {
      const mx = (m + 0.5) * (w / 5) + Math.cos(time * 0.002 + m) * 15;
      const my = h * 0.32 + Math.sin(time * 0.003 + m) * 12;
      ctx.fillStyle = '#0f0217';
      ctx.fillRect(mx - 12, my - 25, 24, 50);
      // Glowing Runic Glyphs
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(mx - 8, my - 18, 16, 36);
    }
  }

  // 10. CELESTIAL SANCTUM (เกาะลอยฟ้าวิหารสวรรค์)
  private drawCelestialSanctumBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Divine Golden Dawn to Sky Azure Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.35, '#4338ca');
    bgGrad.addColorStop(0.7, '#6366f1');
    bgGrad.addColorStop(1.0, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Radiant Sunbeams / God-Rays
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(time * 0.003) * 0.04;
    const rayGrad = ctx.createRadialGradient(w * 0.5, 0, 10, w * 0.5, 0, w * 0.7);
    rayGrad.addColorStop(0, '#fde047');
    rayGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, 0, w * 0.7, 0, Math.PI);
    ctx.fill();
    ctx.restore();

    // Floating Greek/Roman White Marble Colonnade
    for (let c = 0; c < 5; c++) {
      const cx = (c + 0.5) * (w / 5);
      // Pillar
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 14, h * 0.1, 28, h * 0.45);
      // Gold Capital & Base
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 18, h * 0.1, 36, 8);
      ctx.fillRect(cx - 18, h * 0.52, 36, 8);
    }
  }

  // 11. BOSS: DRAGON OVERLORD PRINCESS THRONE ROOM
  private drawBossDragonThroneBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    // Crimson Magma to Imperial Gold Throne
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1c0505');
    bgGrad.addColorStop(0.35, '#3b0d0c');
    bgGrad.addColorStop(0.7, '#571310');
    bgGrad.addColorStop(1.0, '#0d0202');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grand Dragon Crest in Center
    const crestCX = w * 0.5;
    const crestCY = h * 0.22;
    const crestPulse = 0.8 + Math.sin(time * 0.006) * 0.2;
    const crestGlow = ctx.createRadialGradient(crestCX, crestCY, 10, crestCX, crestCY, 95 * crestPulse);
    crestGlow.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
    crestGlow.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)');
    crestGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = crestGlow;
    ctx.beginPath();
    ctx.arc(crestCX, crestCY, 95 * crestPulse, 0, Math.PI * 2);
    ctx.fill();

    // Imperial Throne Silhouette
    ctx.fillStyle = '#1e0707';
    ctx.beginPath();
    ctx.moveTo(crestCX - 35, h * 0.52);
    ctx.lineTo(crestCX - 25, h * 0.18);
    ctx.lineTo(crestCX, h * 0.14);
    ctx.lineTo(crestCX + 25, h * 0.18);
    ctx.lineTo(crestCX + 35, h * 0.52);
    ctx.closePath();
    ctx.fill();

    // Massive Dragon Wings Silhouette on Throne
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Flanking Great Pillars with Roaring Dragon Braziers
    this.drawWallTorch(ctx, w * 0.15, h * 0.3, time, 0);
    this.drawWallTorch(ctx, w * 0.85, h * 0.3, time, 1);
  }

  // HELPER: WALL TORCH SCONCE WITH ANIMATED FLAME & PARTICLES
  private drawWallTorch(
    ctx: CanvasRenderingContext2D,
    px: number,
    ty: number,
    time: number,
    seed: number
  ) {
    // Sconce bracket
    ctx.fillStyle = '#334155';
    ctx.fillRect(px - 3, ty, 6, 16);
    ctx.fillRect(px - 8, ty - 2, 16, 5);

    // Flame aura
    const flamePulse = 0.8 + Math.sin(time * 0.008 + seed * 2) * 0.2;
    const flameGrad = ctx.createRadialGradient(px, ty - 8, 2, px, ty - 8, 40 * flamePulse);
    flameGrad.addColorStop(0, 'rgba(251, 146, 60, 0.7)');
    flameGrad.addColorStop(0.4, 'rgba(234, 88, 12, 0.3)');
    flameGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(px, ty - 8, 40 * flamePulse, 0, Math.PI * 2);
    ctx.fill();

    // Core flame
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(px, ty - 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Floating ember sparks
    for (let s = 0; s < 3; s++) {
      const sparkY = ty - 10 - ((time * 0.04 + s * 14) % 45);
      const sparkX = px + Math.sin(time * 0.005 + s + seed) * 7;
      ctx.fillStyle = 'rgba(253, 186, 116, 0.75)';
      ctx.fillRect(sparkX, sparkY, 2, 2);
    }
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
    time: number,
    biome: string = 'grass'
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

    // 4. Main Grand Isometric Flagstone Floor Themed by Biome
    const floorColors = this.getBiomeFloorColors(biome);
    const floorGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, hw * 0.9);
    floorGrad.addColorStop(0, floorColors.center);
    floorGrad.addColorStop(0.5, floorColors.mid);
    floorGrad.addColorStop(1, floorColors.edge);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Chiseled Flagstone Rim Border Themed
    ctx.strokeStyle = floorColors.rim;
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
    const r = pulse ? 30 + Math.sin(Date.now() * 0.006) * 3 : 28;
    ctx.strokeStyle = color;
    ctx.lineWidth = pulse ? 2.5 : 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = pulse ? 12 : 6;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.8, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
