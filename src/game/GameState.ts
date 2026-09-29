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

export class GameState {
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
  public gameMode: 'standard' | 'blitz' = 'standard';
  public blitzDayLimit: number = 20;
  public allowDarkling: boolean = true;
  public aiDifficulty: 'casual' | 'tactical' | 'ruthless' = 'tactical';

  // Field Traps placed by players
  public placedTraps: Array<{ nodeId: number; ownerId: number; damage: number }> = [];

  // Active sub-states
  public activeBattle: BattleEngine | null = null;
  public activeBattleEnemyCombatant: Combatant | null = null;
  public pendingTileNode: BoardNode | null = null;
  public pendingPvPVictim: Player | null = null;

  // Log drawer messages
  public logs: Array<{ text: string; type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' }> = [];

  get activePlayer(): Player {
    return this.players[this.activePlayerIdx] || this.players[0];
  }

  addLog(text: string, type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' = 'info') {
    this.logs.unshift({ text, type });
    if (this.logs.length > 60) this.logs.pop();

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
      }
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
    this.startTurn();
  }

  /** Towns the player can actually liberate, i.e. nodes that carry town data AND
   *  route into the town-liberation branch of tile arrival. */
  getTownCount(): number {
    return this.allNodes.filter(n => n.townData).length;
  }

  startTurn() {
    const p = this.activePlayer;
    this.phase = 'BOARD_TURN';
    const turnRes = p.tickTurn();
    if (turnRes?.companionDeparted) {
      this.addLog(`⌛ สัญญาจ้างคู่หู ${turnRes.companionDeparted} สิ้นสุดลงแล้ว (ครบ 3 เทิร์น) เธอโบกมือลาและเดินทางกลับกิลด์!`, 'level');
    }

    // Start overworld chiptune music if not active
    if (audio.getCurrentTrack() !== 'overworld') {
      audio.playBgm('overworld');
    }

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
        const picked = otherTowns[Math.floor(Math.random() * otherTowns.length)];
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
      totalRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      this.addLog(`😈 พลังจอมมารคลั่ง! ทอยลูกเต๋าคู่มรณะ ก้าวเดินได้ถึง ${totalRoll} ก้าว!`, 'darkling');
    } else {
      const numDice = Math.max(1, p.activeSpinnerMultiplier);
      for (let i = 0; i < numDice; i++) {
        totalRoll += Math.floor(Math.random() * 6) + 1;
      }

      // SPD Stat Overworld Bonus: High speed heroines sprint faster!
      const playerSpd = p.getTotalStat('spd');
      if (playerSpd >= 15 && Math.random() < Math.min(0.55, playerSpd * 0.022)) {
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
    const weatherMod = weatherSystem.getMovementDiceModifier(hereNode?.biome || '');
    if (weatherMod < 0 && totalRoll > 1) {
      totalRoll = Math.max(1, totalRoll + weatherMod);
      this.addLog(`❄️ ลมพายุหิมะพัดต้านอย่างรุนแรง! ลดการก้าวเดินลง 1 ก้าว (เหลือ ${totalRoll} ก้าว)`, 'info');
    }

    p.activeSpinnerMultiplier = 1;
    this.remainingMoves = totalRoll;
    return totalRoll;
  }

  // Calculate all reachable destination nodes:
  // Core Dokapon rules: Destination MUST match exact rolled steps, UNLESS flexible step item is active!
  updateReachableHighlights() {
    if (this.remainingMoves <= 0) {
      this.highlightedNodes = [];
      return;
    }

    const reachable = new Set<number>();
    const allowFlexible = !!this.activePlayer.hasFlexibleMovement;
    const visited = new Set<string>();
    // BFS tracking path history to avoid immediate 180-degree reversals in the same turn
    const queue: Array<{ nodeId: number; prevId: number | null; steps: number }> = [
      { nodeId: this.activePlayer.nodeId, prevId: this.activePlayer.prevNodeId ?? null, steps: 0 }
    ];
    let head = 0;

    while (head < queue.length) {
      const { nodeId, prevId, steps } = queue[head++];
      const stateKey = `${nodeId}_${prevId ?? 'none'}_${steps}`;
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);

      // Valid landing destinations:
      // Exact steps required by default, or flexible if special crystal item used
      if (allowFlexible) {
        if (steps >= 1 && steps <= this.remainingMoves && nodeId !== this.activePlayer.nodeId) {
          reachable.add(nodeId);
        }
      } else {
        if (steps === this.remainingMoves && nodeId !== this.activePlayer.nodeId) {
          reachable.add(nodeId);
        }
      }

      if (steps >= this.remainingMoves) {
        continue;
      }

      const node = this.allNodes.find(n => n.id === nodeId);
      if (!node) continue;

      for (const nextId of node.neighbors) {
        // Prevent immediate 180-degree reversal if other path choices exist
        if (prevId !== null && nextId === prevId && node.neighbors.length > 1) {
          continue;
        }
        queue.push({ nodeId: nextId, prevId: nodeId, steps: steps + 1 });
      }
    }

    this.highlightedNodes = Array.from(reachable);
  }

  // Pathfinding: Find valid directional route from current position to chosen target node
  findPathToTarget(targetNodeId: number): number[] | null {
    if (!this.highlightedNodes.includes(targetNodeId)) return null;
    const allowFlexible = !!this.activePlayer.hasFlexibleMovement;

    const visited = new Set<string>();
    const queue: Array<{ path: number[] }> = [{ path: [this.activePlayer.nodeId] }];
    let head = 0;

    while (head < queue.length) {
      const { path } = queue[head++];
      const currentId = path[path.length - 1];
      const steps = path.length - 1;

      const matchesTarget = allowFlexible
        ? (currentId === targetNodeId && steps >= 1 && steps <= this.remainingMoves)
        : (currentId === targetNodeId && steps === this.remainingMoves);

      if (matchesTarget) {
        return path;
      }

      if (steps >= this.remainingMoves) {
        continue;
      }

      const prevId = path.length >= 2 ? path[path.length - 2] : (this.activePlayer.prevNodeId ?? null);
      const stateKey = `${currentId}_${prevId ?? 'none'}_${steps}`;
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);

      const node = this.allNodes.find(n => n.id === currentId);
      if (!node) continue;

      for (const nextId of node.neighbors) {
        if (prevId !== null && nextId === prevId && node.neighbors.length > 1) {
          continue;
        }
        queue.push({ path: [...path, nextId] });
      }
    }

    return null;
  }

  // Execute full sequential path chosen by the player (Click-to-Move!)
  executePath(
    path: number[],
    onStepCallback: () => void,
    onArrivalCallback: (tile: BoardNode) => void
  ) {
    if (path.length <= 1) return;
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
    audio.step();

    const startGX = p.gridX;
    const startGY = p.gridY;
    const startGZ = p.gridZ;
    const startTime = Date.now();
    const duration = Math.max(45, Math.round(180 / this.gameSpeed));

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      p.gridX = startGX + (targetNode.gx - startGX) * t;
      p.gridY = startGY + (targetNode.gy - startGY) * t;
      p.gridZ = startGZ + (targetNode.gz - startGZ) * t;
      p.walkFrame = (Math.floor(elapsed / Math.max(10, Math.round(30 / this.gameSpeed))) % 6) + 1; // 6-frame run

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
    // Blitz Mode: Match concludes when blitzDayLimit is reached (highest net worth wins!)
    if (this.gameMode === 'blitz' && this.dayCounter >= this.blitzDayLimit) {
      this.phase = 'VICTORY';
      return;
    }

    this.players.forEach(p => {
      if (this.winGoal === 'gold' && p.gold >= 3000) {
        this.phase = 'VICTORY';
      } else if (this.winGoal === 'towns' && p.townsControlled >= 4) {
        this.phase = 'VICTORY';
      } else if (this.winGoal === 'networth' && this.weekCounter > 4) {
        this.phase = 'VICTORY';
      }
    });
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

