import { WorldState, bindWorld } from './WorldState';
import { movementRoutes, isLegalMovementPath } from './Movement';
import { evaluateMatch, matchObjective } from './MatchRules';
import { worldCalamitySystem } from './WorldCalamitySystem';
import { dungeonSystem } from './DungeonSystem';
import { Player, FIELD_SPELLS } from './Player';
import { IsoDirection } from '../engine/PixelSpriteGenerator';
import { BoardNode, DOKAPON_NODES } from './BoardMap';
import { BattleEngine, Combatant } from './BattleEngine';
import { townManager } from './TownManager';
import { darklingSystem } from './DarklingSystem';
import { aiSystem } from './AISystem';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';
import { escapeHtml } from '../util/Html';
import { weatherSystem } from './WeatherSystem';
import { ecosystemSystem } from './EcosystemSystem';

export type GamePhase =
  | 'TITLE'
  | 'BOARD_TURN'
  | 'DICE_ROLLING'
  | 'WAITING_FOR_DESTINATION'
  | 'MOVING'
  | 'CHOOSING_PATH'
  | 'TILE_EVENT'
  | 'BATTLE'
  | 'TOWN_MODAL'
  | 'SHOP_MODAL'
  | 'PVP_SPOILS'
  | 'DARKLING_PACT'
  | 'WEEKLY_REPORT'
  | 'VICTORY';

export type GameModeType = 'standard' | 'blitz' | 'coop_raid' | 'endless_spire' | 'roguelike_draft';

export interface RoguelikeModifier {
  id: string;
  name: string;
  icon: string;
  desc: string;
  atkMultiplier: number;
  defMultiplier: number;
  magMultiplier?: number;
  tollMultiplier: number;
  diceBonus: number;
}

export const ROGUELIKE_MODIFIERS: RoguelikeModifier[] = [
  {
    id: 'blood_frenzy',
    name: 'Blood Moon Frenzy (คลั่งจันทราโลหิต)',
    icon: '🩸',
    desc: 'พลังโจมตี ATK ทั่วกระดาน +35% แต่พลังป้องกัน DEF ลดลง 20%!',
    atkMultiplier: 1.35,
    defMultiplier: 0.80,
    tollMultiplier: 1.0,
    diceBonus: 0
  },
  {
    id: 'midas_gold',
    name: 'Midas Prosperity (พรแห่งไมดาส)',
    icon: '✨',
    desc: 'ค่าผ่านทางและภาษีเมืองเพิ่มขึ้น 50% ทุกการก้าวเดินมีค่าดั่งทอง!',
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    tollMultiplier: 1.5,
    diceBonus: 0
  },
  {
    id: 'gale_stride',
    name: 'Tempest Stride (วายุพาจร)',
    icon: '🌪️',
    desc: 'สายลมหนุนหลัง! ผลทอยลูกเต๋าเพิ่มขึ้น +2 ช่องสำหรับทุกคน!',
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    tollMultiplier: 1.0,
    diceBonus: 2
  },
  {
    id: 'arcane_surge',
    name: 'Arcane Surge (คลื่นมนตราเอ่อล้น)',
    icon: '🔮',
    desc: 'สมาธิด้านเวทมนตร์เพิ่มพูน พลังเวทและสกิลรุนแรงขึ้น!',
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    magMultiplier: 1.3,
    tollMultiplier: 1.0,
    diceBonus: 0
  }
];

export class GameState {
  public world = new WorldState();
  constructor() { bindWorld(this.world); }
  get objective(): string { return matchObjective(this); }

  public phase: GamePhase = 'TITLE';
  public players: Player[] = [];
  public activePlayerIdx = 0;
  public allNodes: BoardNode[] = [...DOKAPON_NODES];

  public dayCounter = 1;
  public weekCounter = 1;
  public winGoal = 'networth';

  public remainingMoves = 0;
  public highlightedNodes: number[] = [];
  public activePreviewPath: number[] = [];
  public gameSpeed = 1;

  // Game Mode & House Rules
  get gameMode(): GameModeType { return this.world.mode; }
  set gameMode(mode: GameModeType) { this.world.mode = mode; }
  get activeRoguelikeModifier(): RoguelikeModifier | null { return this.world.modifier; }
  set activeRoguelikeModifier(modifier: RoguelikeModifier | null) { this.world.modifier = modifier; }
  public blitzDayLimit: number = 20;
  public coopRaidDayLimit: number = 30;
  public allowDarkling: boolean = true;
  public aiDifficulty: 'casual' | 'tactical' | 'ruthless' = 'tactical';

  // Field Traps placed by players
  public placedTraps: Array<{ nodeId: number; ownerId: number; damage: number; type?: 'damage' | 'pitfall' | 'greed' | 'rust' }> = [];

  // Active sub-states
  public activeBattle: BattleEngine | null = null;
  public activeBattleEnemyCombatant: Combatant | null = null;
  public pendingTileNode: BoardNode | null = null;
  public pendingPvPVictim: Player | null = null;

  // Log drawer messages
  public logs: Array<{ text: string; type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' }> = [];
  public onLogAdded?: (entry: { text: string; type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' }) => void;

  get activePlayer(): Player {
    return this.players[this.activePlayerIdx] || this.players[0];
  }

  addLog(text: string, type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' = 'info') {
    const entry = { text, type };
    this.logs.unshift(entry);
    if (this.logs.length > 60) this.logs.pop();

    if (this.onLogAdded) {
      this.onLogAdded(entry);
      return;
    }

    // Stream into Live Game Event Feed Window (Middle-Left of screen)
    if (typeof document !== 'undefined') {
      const list = document.getElementById('gameEventFeedList');
      if (list) {
        // Remove empty state message if present
        if (list.children.length === 1 && list.children[0].classList.contains('italic')) {
          list.innerHTML = '';
        }

        const row = document.createElement('div');
        row.className = 'py-1 px-1.5 border flex items-start gap-1.5 bg-slate-950/60';

        // Log lines embed hero names and prank nicknames, both of which come from
        // free-text input, so the interpolated text is escaped before it reaches innerHTML.
        const safeText = escapeHtml(text);

        if (type === 'gold') {
          row.className += ' border-amber-500/30 text-amber-300';
          row.innerHTML = `<span class="shrink-0 text-xs">🪙</span><span class="break-words leading-tight">${safeText}</span>`;
        } else if (type === 'battle') {
          row.className += ' border-rose-500/30 text-rose-300';
          row.innerHTML = `<span class="shrink-0 text-xs">⚔️</span><span class="break-words leading-tight">${safeText}</span>`;
        } else if (type === 'darkling') {
          row.className += ' border-purple-500/40 text-purple-300';
          row.innerHTML = `<span class="shrink-0 text-xs">😈</span><span class="break-words leading-tight">${safeText}</span>`;
        } else if (type === 'level') {
          row.className += ' border-emerald-500/30 text-emerald-300';
          row.innerHTML = `<span class="shrink-0 text-xs">⭐</span><span class="break-words leading-tight">${safeText}</span>`;
        } else {
          row.className += ' border-slate-700/40 text-slate-200';
          row.innerHTML = `<span class="shrink-0 text-xs">💬</span><span class="break-words leading-tight">${safeText}</span>`;
        }

        list.insertBefore(row, list.firstChild);
        if (list.children.length > 40) {
          list.removeChild(list.lastChild!);
        }

        // Trigger ephemeral floating toast
        this.triggerFloatingToast(text, type);
      }
    }
  }

  private toastTimer?: any;
  private triggerFloatingToast(text: string, type: string) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('floatingEventToast');
    const toastText = document.getElementById('floatingToastText');
    const toastIcon = document.getElementById('floatingToastIcon');
    if (!toast || !toastText || !toastIcon) return;

    let icon = '💬';
    if (type === 'gold') icon = '🪙';
    else if (type === 'battle') icon = '⚔️';
    else if (type === 'darkling') icon = '😈';
    else if (type === 'level') icon = '⭐';

    toastIcon.innerText = icon;
    toastText.innerText = text;

    toast.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
    }, 2800);
  }

  clearLogs(): void {
    this.logs = [];
    if (typeof document !== 'undefined') {
      const list = document.getElementById('gameEventFeedList');
      if (list) list.innerHTML = '';
    }
  }

  /**
   * Rebuilds the board from the pristine map data.
   *
   * `DOKAPON_NODES` is a module-level constant and `[...DOKAPON_NODES]` only copies the
   * array, not the node objects. Town ownership, town levels, conquered monsters and
   * player-built homes are all mutated in place during play, so without a deep clone a
   * second game in the same page session would inherit the previous game's entire board
   * state (towns still owned by old player ids, monsters already defeated, inflated town
   * levels, and houses named after the previous hero).
   */
  resetBoard() {
    this.allNodes = structuredClone(DOKAPON_NODES);

    // Defensive fallback for data that predates the monsterMaxHp field.
    this.allNodes.forEach(n => {
      if (n.townData && n.townData.isOccupiedByMonster && !n.townData.monsterMaxHp) {
        n.townData.monsterMaxHp = n.townData.monsterHp;
      }
    });
  }

  initGame(partyConfig: Array<{ name: string; classKey: string; isAI: boolean; skinVariant?: number }>, winGoal = 'networth') {
    this.resetBoard();
    const mode = this.gameMode;
    this.world = new WorldState(); this.world.mode = mode; bindWorld(this.world);
    this.placedTraps = [];
    aiSystem.grudgeMatrix = {}; aiSystem.moveHistory = {};
    worldCalamitySystem.reset(); royalDecreeSystem.reset(); dungeonSystem.reset();
    this.world.raidTargets = ['solaria', 'sunfire', 'frostpeak'].map(realm => this.allNodes.find(n => n.type === 'boss' && n.realmId === realm)?.id).filter((id): id is number => id !== undefined);
    this.world.campaignBossId = this.allNodes.find(n => n.type === 'boss' && n.realmId === 'abyss')?.id ?? null;
    this.players = partyConfig.map((cfg, idx) => new Player(idx + 1, cfg.name, cfg.classKey, cfg.isAI, 0, cfg.skinVariant || 0));
    this.winGoal = winGoal;
    this.activePlayerIdx = 0;
    this.dayCounter = 1;
    this.weekCounter = 1;
    this.phase = 'BOARD_TURN';

    // Clear every transient field so a new game can never render or resume leftovers
    // from the previous session (a stale activeBattle would keep drawing the old arena).
    this.remainingMoves = 0;
    this.highlightedNodes = [];
    this.activePreviewPath = [];
    this.activeBattle = null;
    this.activeBattleEnemyCombatant = null;
    this.pendingTileNode = null;
    this.pendingPvPVictim = null;
    this.logs = [];

    this.addLog(`⚔️ The Grand Dokapon Expedition เริ่มต้นขึ้นแล้วทั้ง ${this.getTownCount()} เมือง!`, 'level');

    this.activeRoguelikeModifier = this.gameMode === 'roguelike_draft' ? this.world.pick(ROGUELIKE_MODIFIERS) : null;
    this.addLog(this.objective, 'level');

    this.startTurn();
  }

  /** Towns the player can actually liberate, i.e. nodes that carry town data AND
   *  route into the town-liberation branch of tile arrival. */
  getTownCount(): number {
    return this.allNodes.filter(n => n.townData).length;
  }

  startTurn() {
    const p = this.activePlayer;
    this.world.focusPlayerId = p.id;
    this.world.focusRealm = this.allNodes.find(n => n.id === p.nodeId)?.realmId ?? 'solaria';
    this.checkWinConditions();
    if (this.world.result) return;

    // Check Sleep Status: Skips turn if sleeping!
    if (p.sleepTurns > 0) {
      p.sleepTurns--;
      this.addLog(`💤 ${p.displayName} กำลังหลับใหลอย่างลึกซึ้งจากมนตรา Sleepy Slumber! จึงข้ามเทิร์นนี้ไป!`, 'battle');
      this.endTurn();
      return;
    }

    this.phase = 'BOARD_TURN';

    // Start overworld chiptune music if not active
    if (audio.getCurrentTrack() !== 'overworld') {
      audio.playBgm('overworld');
    }

    const memory = this.world.memory(p.id);
    if (memory.flags.farmPayments > 0) { p.gold += 20; p.matchStats.goldEarnedTotal += 20; memory.flags.farmPayments--; this.addLog('ส่วนแบ่งจากกังหันชาวนา +20G', 'gold'); }
    if (p.activeGuildQuest && (p.activeGuildQuest.expiresDay ?? Infinity) < this.dayCounter) { this.addLog('เควสต์หมดเวลา: ' + p.activeGuildQuest.title); p.activeGuildQuest = null; }
    // Collect daily town tax
    const taxEarned = townManager.collectTurnRevenue(p, this.allNodes);
    if (taxEarned > 0) {
      this.addLog(`🚩 ${p.displayName} ได้รับภาษี ${taxEarned}G จากเมืองที่ปกครอง!`, 'gold');
    }

    this.addLog(`ถึงเทิร์นของ ${p.displayName} แล้ว (${p.isAI ? 'AI Bot' : 'Player'}).`);
  }

  // Cast Field Magic Grimoire Spell on the board
  castFieldSpell(
    caster: Player,
    spellKey: string,
    targetPlayerId?: number
  ): { success: boolean; message: string } {
    const spell = FIELD_SPELLS[spellKey];
    if (!spell) return { success: false, message: 'Unknown spell scroll.' };

    // MAG Stat Bonus: High MAG grants MP cost discount for field spells!
    const playerMag = caster.getTotalStat('mag');
    const mpDiscount = Math.floor(playerMag / 8);
    const actualMpCost = Math.max(5, spell.mpCost - mpDiscount);

    if (caster.mp < actualMpCost) {
      return { success: false, message: `Not enough MP! Requires ${actualMpCost} MP (ลดลงจาก ${spell.mpCost} MP ด้วยพลังเวท MAG ${playerMag}).` };
    }

    let target: Player | undefined;
    if (spell.requiresTarget) {
      if (targetPlayerId === undefined) {
        return { success: false, message: 'Select a target player first!' };
      }
      target = this.players.find(p => p.id === targetPlayerId);
      if (!target || target.id === caster.id) {
        return { success: false, message: 'Invalid target player.' };
      }
    }

    // Deduct MP
    caster.mp -= actualMpCost;
    audio.fieldSpellCast();

    if (spellKey === 'zap' && target) {
      const dmg = Math.round(25 + caster.getTotalStat('mag') * 1.5);
      target.hp = Math.max(1, target.hp - dmg);
      this.addLog(`⚡ ${caster.displayName} ร่ายเวท Thunderbolt ใส่ ${target.displayName} โดนดาเมจ ${dmg}!`, 'battle');
      return { success: true, message: `⚡ Thunderbolt ฟาดใส่ ${target.displayName} โดนดาเมจ ${dmg}!` };
    }

    if (spellKey === 'swap' && target) {
      const tempNodeId = caster.nodeId;
      const tempGx = caster.gridX;
      const tempGy = caster.gridY;
      const tempGz = caster.gridZ;

      caster.nodeId = target.nodeId;
      caster.gridX = target.gridX;
      caster.gridY = target.gridY;
      caster.gridZ = target.gridZ;

      target.nodeId = tempNodeId;
      target.gridX = tempGx;
      target.gridY = tempGy;
      target.gridZ = tempGz;

      this.addLog(`🔄 ${caster.displayName} ร่ายเวท Dimension Swap สลับตำแหน่งกับ ${target.displayName}!`, 'level');
      return { success: true, message: `🔄 สลับตำแหน่งกับ ${target.displayName}!` };
    }

    if (spellKey === 'tax_audit' && target) {
      const stolen = Math.floor(target.gold * 0.25);
      target.gold -= stolen;
      caster.gold += stolen;
      audio.coin();
      this.addLog(`🧲 ${caster.displayName} ตรวจสอบบัญชี ${target.displayName} ยึดเงิน ${stolen}G!`, 'gold');
      return { success: true, message: `🧲 Royal Audit ยึดเงิน ${stolen}G จาก ${target.displayName}!` };
    }

    if (spellKey === 'curse_rust' && target) {
      target.rustTurns = 3;
      this.addLog(`🩸 ${caster.displayName} สาป Curse of Rust ใส่ ${target.displayName}! (ATK & DEF ลดลง 30% เป็นเวลา 3 เทิร์น)`, 'darkling');
      return { success: true, message: `🩸 อุปกรณ์ของ ${target.displayName} ขึ้นสนิม! ATK & DEF ลดลง 30% เป็นเวลา 3 เทิร์น` };
    }

    if (spellKey === 'poison_dart' && target) {
      target.poisonTurns = 4;
      this.addLog(`☠️ ${caster.displayName} ยิงลูกดอกพิษใส่ ${target.displayName}! (ติดสถานะ Poison 4 เทิร์น)`, 'battle');
      return { success: true, message: `☠️ ยิงลูกดอกพิษใส่ ${target.displayName}! เสียเลือดทุกช่องที่ก้าวเดิน` };
    }

    if (spellKey === 'frost_freeze' && target) {
      target.freezeTurns = 2;
      this.addLog(`❄️ ${caster.displayName} ร่ายพายุ Frost Freeze แช่แข็ง ${target.displayName}! (ติดสถานะ Freeze 2 เทิร์น ทอยเต๋าได้แค่ 1 แต้ม)`, 'battle');
      return { success: true, message: `❄️ แช่แข็ง ${target.displayName}! ทอยเต๋าได้แค่ 1 แต้ม` };
    }

    if (spellKey === 'flash_blind' && target) {
      target.blindTurns = 3;
      this.addLog(`👁️ ${caster.displayName} ร่ายเวท Flash Blind สาดแสงจ้าใส่ ${target.displayName}! (ติดสถานะ Blind ตาบอด 3 เทิร์น โจมตีพลาด 40%)`, 'battle');
      return { success: true, message: `👁️ สาดแสงจ้าใส่ ${target.displayName}! ตาบอด 3 เทิร์น` };
    }

    if (spellKey === 'sleepy' && target) {
      target.sleepTurns = 1;
      this.addLog(`💤 ${caster.displayName} ร่ายมนตรา Sleepy Slumber สะกดให้ ${target.displayName} หลับใหล (ข้ามเทิร์นถัดไป 1 เทิร์น)!`, 'battle');
      return { success: true, message: `💤 มนตราสะกดสำเร็จ! ${target.displayName} จะหลับข้ามเทิร์นถัดไป!` };
    }

    if (spellKey === 'squid_ink' && target) {
      target.squidInkTurns = 1;
      this.addLog(`🦑 ${caster.displayName} พ่นหมึกมืดมนใส่ ${target.displayName} บดบังวิสัยทัศน์บนแผนที่ 1 เทิร์น!`, 'battle');
      return { success: true, message: `🦑 พ่นหมึกสีดำปิดบังหน้าจอของ ${target.displayName} สำเร็จ!` };
    }

    if (spellKey === 'downer' && target) {
      target.downerTurns = 3;
      this.addLog(`📉 ${caster.displayName} ร่ายคำสาป Downer Curse ใส่ ${target.displayName}! (ทุกสเตตัสลดลง 25% เป็นเวลา 3 เทิร์น)`, 'darkling');
      return { success: true, message: `📉 สาปแช่งลดพลังทุกสเตตัสของ ${target.displayName} ลง 25% (3 เทิร์น)!` };
    }

    if (spellKey === 'banish' && target) {
      const farNodes = this.allNodes.filter(n => Math.hypot(n.gx - target!.gridX, n.gy - target!.gridY) > 40);
      const destNode = farNodes.length > 0 ? farNodes[Math.floor(this.world.random() * farNodes.length)] : this.allNodes[Math.floor(this.world.random() * this.allNodes.length)];
      target.nodeId = destNode.id;
      target.gridX = destNode.gx;
      target.gridY = destNode.gy;
      target.gridZ = destNode.gz;
      this.addLog(`🌀 ${caster.displayName} ร่ายมหาเนรเทศ Banishment ส่ง ${target.displayName} กระเด็นไปทวีปห่างไกลที่ [${destNode.name}]!`, 'darkling');
      return { success: true, message: `🌀 มหาเนรเทศสำเร็จ! ผลัก ${target.displayName} ปลิวไปที่ ${destNode.name}!` };
    }

    if (spellKey === 'bounty_hunt' && target) {
      target.bountyReward = 350;
      royalDecreeSystem.issueWantedBounty(target, 2000, `ถูกตั้งค่าหัวโดย ${caster.displayName}!`);
      this.addLog(`📜 ${caster.displayName} ประกาศตั้งค่าหัวนำจับ ${target.displayName} 2,000G! ใครสังหารได้รับเงินทันที!`, 'gold');
      return { success: true, message: `📜 ส่งหมายจับหลวงตั้งค่าหัว ${target.displayName} 2,000G สำเร็จ!` };
    }

    if (spellKey === 'assassin_hit' && target) {
      const stolen = Math.floor(target.gold * 0.35);
      target.gold -= stolen;
      caster.gold += stolen;
      const homeNode = target.homeNodeId !== null ? this.allNodes.find(n => n.id === target.homeNodeId) : null;
      const respawnNode = homeNode || this.allNodes.find(n => n.id === 0) || this.allNodes[0];
      target.nodeId = respawnNode.id;
      target.gridX = respawnNode.gx;
      target.gridY = respawnNode.gy;
      target.gridZ = respawnNode.gz;
      audio.hurt();
      this.addLog(`🥷 มือสังหารของ ${caster.displayName} ลอบสังหาร ${target.displayName}! ชิงเงิน ${stolen}G และส่งกลับรักษาตัวที่ ${respawnNode.name}!`, 'battle');
      return { success: true, message: `🥷 สัญญาจ้างนักฆ่าสำเร็จ! ปล้น ${stolen}G และส่ง ${target.displayName} กลับไปรักษาตัว!` };
    }

    if (spellKey === 'dark_calamity') {
      const otherTowns = this.allNodes.filter(n => n.townData && n.townData.ownerId !== null && n.townData.ownerId !== caster.id);
      const affected: string[] = [];
      for (let i = 0; i < Math.min(2, otherTowns.length); i++) {
        const picked = otherTowns[Math.floor(this.world.random() * otherTowns.length)];
        if (picked && picked.townData) {
          picked.townData.ownerId = null;
          picked.townData.isOccupiedByMonster = true;
          picked.townData.monsterName = 'Demonic Abomination';
          picked.townData.monsterHp = 180;
          picked.townData.monsterMaxHp = 180;
          picked.townData.monsterAtk = 22;
          picked.townData.monsterDef = 14;
          affected.push(picked.name);
        }
      }
      this.addLog(`☄️ จอมมาร ${caster.displayName} ปลดปล่อย Demonic Calamity! ทำลายเมือง [${affected.join(', ') || 'ไม่มีเมืองให้ทำลาย'}] ให้มอนสเตอร์ยึดครอง!`, 'darkling');
      return { success: true, message: `☄️ ถล่มเมือง ${affected.join(', ') || 'ไม่มีเมือง'} คืนสู่ความมืดมิดสำเร็จ!` };
    }

    if (spellKey === 'oblivion_slash' && target) {
      const dmg = Math.max(30, Math.floor(target.hp * 0.5));
      target.hp = Math.max(1, target.hp - dmg);
      target.curseTurns = 3;
      audio.strikeHit();
      audio.curseExplosion();
      this.addLog(`🗡️💥 จอมมารสาย Destroyer ${caster.displayName} วาดดาบผ่าพิภพอเวจี Oblivion Slash ใส่ ${target.displayName}! ฟันลด HP ${dmg} หน่วย และสาปแช่ง 3 เทิร์น!`, 'darkling');
      return { success: true, message: `🗡️💥 ดาบผ่าพิภพอเวจีผ่าร่าง ${target.displayName} ลด HP ${dmg}!` };
    }

    if (spellKey === 'dark_plague') {
      const rivals = this.players.filter(p => p.id !== caster.id);
      rivals.forEach(r => {
        r.poisonTurns = 4;
        r.curseTurns = 5;
      });
      this.addLog(`🌪️ จอมมาร ${caster.displayName} ปลดปล่อย Plague Cloud! คู่แข่งทุกคนติดพิษและคำสาปมรณะ!`, 'darkling');
      return { success: true, message: `🌪️ หมอกมรณะกลืนวิญญาณแผ่ขยาย! สาปคู่แข่งทุกคนสำเร็จ!` };
    }

    if (spellKey === 'holy_sanctuary') {
      caster.hp = caster.maxHp;
      caster.cleanseAilments();
      this.addLog(`🕊️ ${caster.displayName} ร่ายเวท Holy Sanctuary! ฟื้นฟู HP เต็มและลบล้างสถานะผิดปกติทั้งหมด!`, 'level');
      return { success: true, message: `🕊️ ร่าย Holy Sanctuary! ฟื้นฟู HP เต็มและลบล้างดีบัฟทั้งหมด` };
    }

    if (spellKey === 'castle_warp') {
      const castleNode = this.allNodes.find(n => n.id === 0) || this.allNodes[0];
      caster.nodeId = 0;
      caster.gridX = castleNode.gx;
      caster.gridY = castleNode.gy;
      caster.gridZ = castleNode.gz;
      this.addLog(`🚪 ${caster.displayName} ร่ายเวท Castle Recall วาร์ปกลับไปยัง Dokapon Castle!`, 'level');
      return { success: true, message: `🚪 วาร์ปกลับไปยัง Dokapon Castle อย่างปลอดภัย!` };
    }

    return { success: false, message: 'Spell effect failed.' };
  }

  // Roll 1 die, or 2-3 dice if using spinner, or max 3 if in Darkling form
  rollMovementDice(): number {
    if (this.phase !== 'BOARD_TURN') return 0;
    this.phase = 'DICE_ROLLING';

    const p = this.activePlayer;
    let totalRoll = 0;

    if (p.isDarkling) {
      // Darkling rolls multi-dice (2d6 standard)
      totalRoll = Math.floor(this.world.random() * 6) + 1 + Math.floor(this.world.random() * 6) + 1;
      this.addLog(`😈 พลังจอมมารคลั่ง! ทอยลูกเต๋าคู่มรณะ ก้าวเดินได้ถึง ${totalRoll} ก้าว!`, 'darkling');
    } else {
      const numDice = Math.max(1, p.activeSpinnerMultiplier);
      for (let i = 0; i < numDice; i++) {
        totalRoll += Math.floor(this.world.random() * 6) + 1;
      }

      // SPD Stat Overworld Bonus: High speed heroines sprint faster!
      const playerSpd = p.getTotalStat('spd');
      if (playerSpd >= 15 && this.world.random() < Math.min(0.55, playerSpd * 0.022)) {
        const bonusStep = playerSpd >= 25 ? 2 : 1;
        totalRoll += bonusStep;
        this.addLog(`👟 ฝีเท้าคล่องตัวสูง! (SPD ${playerSpd}) มอบโบนัสการก้าวเดินเพิ่ม +${bonusStep} ก้าว!`, 'level');
      }
    }

    if (p.freezeTurns > 0) {
      totalRoll = 1;
      this.addLog(`❄️ ร่างกายของ ${p.displayName} ถูกแช่แข็ง (Frozen)! ก้าวเดินได้เพียง 1 ก้าวเท่านั้น!`, 'battle');
    } else if (p.polymorphTurns > 0) {
      totalRoll = 1;
      this.addLog(`🐷 ${p.displayName} อยู่ในร่าง${p.polymorphType === 'mole' ? 'ตัวตุ่น' : 'หมู'}! ก้าวเดินต้วมเตี้ยมได้เพียง 1 ก้าวเท่านั้น!`, 'darkling');
    } else if (p.relics.includes('windstrider_horseshoe') && totalRoll < 3) {
      totalRoll = 3;
      this.addLog(`🐎💨 เกือกม้าวายุทำงาน! ปรับแต้มลูกเต๋าขั้นต่ำเป็น 3 ก้าว!`, 'info');
    }

    const hereNode = this.allNodes.find(n => n.id === p.nodeId);
    const ward = this.world.memory(p.id).flags.weatherWard ?? 0;
    const localWeather = hereNode ? this.world.weatherAt(hereNode) : 'sunny';
    const weatherMod = ward > 0 ? 0 : localWeather === 'snow' || localWeather === 'sandstorm' ? -1 : 0;
    if (ward > 0) this.world.memory(p.id).flags.weatherWard--;
    if (weatherMod < 0 && totalRoll > 1) {
      totalRoll = Math.max(1, totalRoll + weatherMod);
      this.addLog(`❄️ ลมพายุหิมะพัดต้านอย่างรุนแรง! ลดการก้าวเดินลง 1 ก้าว (เหลือ ${totalRoll} ก้าว)`, 'info');
    }

    if (this.activeRoguelikeModifier) totalRoll += this.activeRoguelikeModifier.diceBonus;
    if (p.freezeTurns > 0 || p.polymorphTurns > 0) totalRoll = 1;
    totalRoll = Math.max(1, totalRoll);

    p.activeSpinnerMultiplier = 1;
    this.remainingMoves = totalRoll;
    return totalRoll;
  }

  // Highlighting and execution use the same rules, including reversing between turns.
  updateReachableHighlights() {
    this.highlightedNodes = [...movementRoutes(
      this.allNodes, this.activePlayer.nodeId, this.remainingMoves, !!this.activePlayer.hasFlexibleMovement
    ).keys()];
  }

  findPathToTarget(targetNodeId: number): number[] | null {
    if (!this.highlightedNodes.includes(targetNodeId)) return null;
    return movementRoutes(
      this.allNodes, this.activePlayer.nodeId, this.remainingMoves, !!this.activePlayer.hasFlexibleMovement
    ).get(targetNodeId) ?? null;
  }

  // Execute full sequential path chosen by the player (Click-to-Move!)
  executePath(
    path: number[],
    onStepCallback: () => void,
    onArrivalCallback: (tile: BoardNode) => void
  ) {
    if (this.phase !== 'CHOOSING_PATH' || !isLegalMovementPath(
      this.allNodes, this.activePlayer.nodeId, this.remainingMoves, !!this.activePlayer.hasFlexibleMovement, path
    )) return;
    this.phase = 'MOVING';
    this.activePreviewPath = path;

    const remainingSteps = [...path.slice(1)];

    const stepNext = () => {
      if (remainingSteps.length === 0) {
        this.remainingMoves = 0;
        this.highlightedNodes = [];
        this.activePreviewPath = [];
        this.phase = 'TILE_EVENT';
        const finalNode = this.allNodes.find(n => n.id === this.activePlayer.nodeId) || this.allNodes[0];
        onArrivalCallback(finalNode);
        return;
      }

      const nextNodeId = remainingSteps.shift()!;
      this.executeSingleStep(nextNodeId, onStepCallback, () => {
        stepNext();
      });
    };

    stepNext();
  }

  // Single step animation
  executeSingleStep(nextNodeId: number, onStepCallback: () => void, onArrivalCallback: (tile: BoardNode) => void) {
    this.phase = 'MOVING';
    const p = this.activePlayer;
    const targetNode = this.allNodes.find(n => n.id === nextNodeId) || this.allNodes[0];

    // Determine 2.5D Isometric direction (8 directions: SE, SW, NE, NW, S, N, E, W).
    // p.facing is passed as the fallback so a purely vertical step (same gx/gy, different gz)
    // keeps the current facing instead of snapping to an arbitrary one.
    const dgx = targetNode.gx - p.gridX;
    const dgy = targetNode.gy - p.gridY;
    p.facing = this.calculateIsoDirection(dgx, dgy, p.facing);

    p.prevNodeId = p.nodeId;
    p.nodeId = nextNodeId;
    this.world.focusRealm = targetNode.realmId;
    if (dungeonSystem.isInDungeon(nextNodeId)) dungeonSystem.recordStep(p, nextNodeId);
    audio.step();

    const startGX = p.gridX;
    const startGY = p.gridY;
    const startGZ = p.gridZ;
    const startTime = Date.now();
    const duration = Math.max(60, Math.round((150 + Math.hypot(dgx, dgy) * 30) / this.gameSpeed));

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      p.gridX = startGX + (targetNode.gx - startGX) * t;
      p.gridY = startGY + (targetNode.gy - startGY) * t;
      p.gridZ = startGZ + (targetNode.gz - startGZ) * t;
      p.walkFrame = (Math.floor(elapsed / Math.max(10, Math.round(30 / this.gameSpeed))) % 8) + 1;

      onStepCallback();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        p.gridX = targetNode.gx;
        p.gridY = targetNode.gy;
        p.gridZ = targetNode.gz;
        p.walkFrame = 0;

        // Poison tick per step
        if (p.poisonTurns > 0) {
          const stepPoison = Math.max(1, Math.round(p.maxHp * 0.02));
          p.hp = Math.max(1, p.hp - stepPoison);
        }

        // Slime Companion: Extra 10G on stepping through own town!
        if (targetNode.townData && targetNode.townData.ownerId === p.id && p.companion && (p.companion.role === 'slime' || p.companion.spriteKey === 'slime')) {
          p.gold += 10;
          p.matchStats.goldEarnedTotal += 10;
        }

        onArrivalCallback(targetNode);
      }
    };

    animate();
  }

  // End turn & advance round / check week
  endTurn(onWeeklyReportCallback?: () => void) {
    this.checkWinConditions();
    if (this.phase === 'VICTORY') return;

    // Process active player end-of-turn effects
    const prevP = this.activePlayer;
    prevP.hasFlexibleMovement = false;
    if (prevP.foodBuff && --prevP.foodBuff.turnsRemaining <= 0) prevP.foodBuff = null;
    const tickRes = prevP.tickTurn();
    if (tickRes.poisonDamage) {
      this.addLog(`☠️ พิษแล่นเข้าสู่หัวใจ! ${prevP.displayName} เสียเลือด ${tickRes.poisonDamage} HP!`, 'battle');
    }
    if (tickRes.curseTriggered) {
      audio.darklingRoar();
      this.addLog(`💀 คำสาปมรณะ (Doom Curse) ทำงาน! เลือดของ ${prevP.displayName} ลดฮวบเหลือ 1 HP!`, 'darkling');
    }
    if (tickRes.hpHealed) {
      this.addLog(`✨ พลังฟื้นฟูเยียวยา! ${prevP.displayName} ฟื้นฟู HP +${tickRes.hpHealed}!`, 'level');
    }
    if (tickRes.mpHealed) {
      this.addLog(`🔮 ออร่าคู่หูจอมเวท! ${prevP.displayName} ฟื้นฟู MP +${tickRes.mpHealed}!`, 'level');
    }
    if (tickRes.companionDeparted) {
      this.addLog(`👋 สัญญาจ้างของคู่หู ${tickRes.companionDeparted} สิ้นสุดลงแล้ว แยกย้ายกลับสู่กิลด์`, 'info');
    }

    this.activePlayerIdx = (this.activePlayerIdx + 1) % this.players.length;

    if (this.activePlayerIdx === 0) {
      this.dayCounter++;
      this.world.advanceRound(this.dayCounter);

      // Advance dynamic atmospheric weather
      const weatherChange = weatherSystem.advanceDay(this.dayCounter);
      if (weatherChange.changed) {
        this.addLog(`${weatherChange.newWeather.icon} สภาพอากาศเปลี่ยนแปลง: ${weatherChange.newWeather.name} - ${weatherChange.newWeather.desc}`, 'level');
      }

      // Weekly Report Ceremony every 7 days!
      if (this.dayCounter % 7 === 1 && this.dayCounter > 1) {
        this.weekCounter++;
        royalDecreeSystem.generateWeeklyDecree(this.weekCounter, this.allNodes, this.players);
        this.addLog(`📜 พระราชกฤษฎีกา: ${royalDecreeSystem.activeDecree.headline}`, 'gold');

        if (this.gameMode === 'roguelike_draft') {
          this.activeRoguelikeModifier = this.world.pick(ROGUELIKE_MODIFIERS.filter(m => m.id !== this.activeRoguelikeModifier?.id));
          this.addLog(`🎲 ROGUELIKE REALM MUTATION: ${this.activeRoguelikeModifier.icon} ${this.activeRoguelikeModifier.name} - ${this.activeRoguelikeModifier.desc}`, 'level');
        }

        this.phase = 'WEEKLY_REPORT';
        if (onWeeklyReportCallback) {
          onWeeklyReportCallback();
          return;
        }
      }
    }

    this.startTurn();
  }

  checkWinConditions() {
    const result = evaluateMatch(this);
    if (result) { this.world.result = result; this.phase = 'VICTORY'; }
  }

  public calculateIsoDirection(dgx: number, dgy: number, fallback: IsoDirection = 'SE'): IsoDirection {
    // Convert 2.5D Isometric grid step to screen vector
    // Screen X = (dgx - dgy) * 48, Screen Y = (dgx + dgy) * 24
    const screenDx = (dgx - dgy) * 48;
    const screenDy = (dgx + dgy) * 24;

    // Two nodes can legitimately share a tile and differ only in elevation (a cliff, bridge or
    // multi-level island). Stepping between them has no on-screen bearing at all, and this
    // used to return a hard-coded 'SE', which froze the hero's facing. The caller's current
    // facing is kept instead so the hero simply climbs without turning.
    if (Math.abs(screenDx) < 0.001 && Math.abs(screenDy) < 0.001) {
      return fallback;
    }

    const angleDeg = Math.atan2(screenDy, screenDx) * (180 / Math.PI);

    // 8-directional sectors: 45° sectors
    if (angleDeg >= -22.5 && angleDeg < 22.5) return 'E';
    if (angleDeg >= 22.5 && angleDeg < 67.5) return 'SE';
    if (angleDeg >= 67.5 && angleDeg < 112.5) return 'S';
    if (angleDeg >= 112.5 && angleDeg < 157.5) return 'SW';
    if (angleDeg >= 157.5 || angleDeg < -157.5) return 'W';
    if (angleDeg >= -157.5 && angleDeg < -112.5) return 'NW';
    if (angleDeg >= -112.5 && angleDeg < -67.5) return 'N';
    return 'NE';
  }
}

