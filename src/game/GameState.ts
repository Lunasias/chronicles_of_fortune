import { Player, FIELD_SPELLS } from './Player';
import { IsoDirection } from '../engine/PixelSpriteGenerator';
import { BoardNode, DOKAPON_NODES } from './BoardMap';
import { BattleEngine, Combatant } from './BattleEngine';
import { townManager } from './TownManager';
import { darklingSystem } from './DarklingSystem';
import { aiSystem } from './AISystem';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';

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
        row.className = 'py-1 px-1.5 rounded border transition-all duration-200 flex items-start gap-1.5 bg-slate-950/60 shadow-sm';

        if (type === 'gold') {
          row.className += ' border-amber-500/30 text-amber-300';
          row.innerHTML = `<span class="shrink-0 text-xs">🪙</span><span class="break-words leading-tight">${text}</span>`;
        } else if (type === 'battle') {
          row.className += ' border-rose-500/30 text-rose-300';
          row.innerHTML = `<span class="shrink-0 text-xs">⚔️</span><span class="break-words leading-tight">${text}</span>`;
        } else if (type === 'darkling') {
          row.className += ' border-purple-500/40 text-purple-300';
          row.innerHTML = `<span class="shrink-0 text-xs">😈</span><span class="break-words leading-tight">${text}</span>`;
        } else if (type === 'level') {
          row.className += ' border-emerald-500/30 text-emerald-300';
          row.innerHTML = `<span class="shrink-0 text-xs">⭐</span><span class="break-words leading-tight">${text}</span>`;
        } else {
          row.className += ' border-slate-700/40 text-slate-200';
          row.innerHTML = `<span class="shrink-0 text-xs">💬</span><span class="break-words leading-tight">${text}</span>`;
        }

        list.insertBefore(row, list.firstChild);
        if (list.children.length > 40) {
          list.removeChild(list.lastChild!);
        }
      }
    }
  }

  initGame(partyConfig: Array<{ name: string; classKey: string; isAI: boolean; skinVariant?: number }>, winGoal = 'networth') {
    this.players = partyConfig.map((cfg, idx) => new Player(idx + 1, cfg.name, cfg.classKey, cfg.isAI, 0, cfg.skinVariant || 0));
    this.winGoal = winGoal;
    this.activePlayerIdx = 0;
    this.dayCounter = 1;
    this.weekCounter = 1;
    this.phase = 'BOARD_TURN';

    this.allNodes.forEach(n => {
      if (n.townData && n.townData.isOccupiedByMonster) {
        if (!n.townData.monsterMaxHp) {
          n.townData.monsterMaxHp = n.townData.monsterHp;
        }
      }
    });

    this.addLog(`⚔️ The Grand Dokapon Expedition เริ่มต้นขึ้นแล้วทั้ง 52 จังหวัด!`, 'level');
    this.startTurn();
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

    if (spellKey === 'holy_sanctuary') {
      caster.hp = caster.maxHp;
      caster.rustTurns = 0;
      this.addLog(`🕊️ ${caster.displayName} ร่ายเวท Holy Sanctuary! ฟื้นฟู HP เต็มและล้างคำสาปทั้งหมด!`, 'level');
      return { success: true, message: `🕊️ ร่าย Holy Sanctuary! ฟื้นฟู HP เต็มและล้างดีบัฟทั้งหมด` };
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
      // Darkling dice is strictly capped at maximum 3 (1, 2, or 3)
      totalRoll = Math.floor(Math.random() * 3) + 1;
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

    p.activeSpinnerMultiplier = 1;
    this.remainingMoves = totalRoll;
    return totalRoll;
  }

  // Calculate all reachable destination nodes: Requires EXACT dice count landing (or Castle node 0 stop)
  updateReachableHighlights() {
    if (this.remainingMoves <= 0) {
      this.highlightedNodes = [];
      return;
    }

    const reachable = new Set<number>();
    const queue: Array<{ nodeId: number; movesLeft: number; prevId: number | null }> = [
      { nodeId: this.activePlayer.nodeId, movesLeft: this.remainingMoves, prevId: this.activePlayer.prevNodeId }
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.nodeId !== this.activePlayer.nodeId && (curr.movesLeft === 0 || curr.nodeId === 0)) {
        reachable.add(curr.nodeId);
      }

      if (curr.movesLeft === 0) {
        continue;
      }

      const node = this.allNodes.find(n => n.id === curr.nodeId);
      if (!node) continue;

      let neighbors = node.neighbors;
      if (curr.prevId !== null && neighbors.length > 1) {
        neighbors = neighbors.filter(id => id !== curr.prevId);
      }

      neighbors.forEach(nextId => {
        queue.push({ nodeId: nextId, movesLeft: curr.movesLeft - 1, prevId: curr.nodeId });
      });
    }

    this.highlightedNodes = Array.from(reachable);
  }

  // Pathfinding: Find shortest valid route from current position to target node with length === remainingMoves (or stopping at Castle 0)
  findPathToTarget(targetNodeId: number): number[] | null {
    if (!this.highlightedNodes.includes(targetNodeId)) return null;

    const queue: Array<{ path: number[]; prevId: number | null }> = [
      { path: [this.activePlayer.nodeId], prevId: this.activePlayer.prevNodeId }
    ];

    while (queue.length > 0) {
      const { path, prevId } = queue.shift()!;
      const currentId = path[path.length - 1];

      // Reached target: exact roll required, unless reaching Dokapon Castle (node 0)
      if (currentId === targetNodeId && path.length > 1) {
        const steps = path.length - 1;
        if (steps === this.remainingMoves || targetNodeId === 0) {
          return path;
        }
      }

      if (path.length - 1 >= this.remainingMoves) {
        continue;
      }

      const node = this.allNodes.find(n => n.id === currentId);
      if (!node) continue;

      let neighbors = node.neighbors;
      if (prevId !== null && neighbors.length > 1) {
        neighbors = neighbors.filter(id => id !== prevId);
      }

      for (const nextId of neighbors) {
        queue.push({ path: [...path, nextId], prevId: currentId });
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

    // Determine 2.5D Isometric direction (8 directions: SE, SW, NE, NW, S, N, E, W)
    const dgx = targetNode.gx - p.gridX;
    const dgy = targetNode.gy - p.gridY;
    p.facing = this.calculateIsoDirection(dgx, dgy);

    p.prevNodeId = p.nodeId;
    p.nodeId = nextNodeId;
    audio.step();

    const startGX = p.gridX;
    const startGY = p.gridY;
    const startGZ = p.gridZ;
    const startTime = Date.now();
    const duration = 180;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      p.gridX = startGX + (targetNode.gx - startGX) * t;
      p.gridY = startGY + (targetNode.gy - startGY) * t;
      p.gridZ = startGZ + (targetNode.gz - startGZ) * t;
      p.walkFrame = (Math.floor(elapsed / 30) % 6) + 1; // 6-frame run

      onStepCallback();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        p.gridX = targetNode.gx;
        p.gridY = targetNode.gy;
        p.gridZ = targetNode.gz;
        p.walkFrame = 0;
        onArrivalCallback(targetNode);
      }
    };

    animate();
  }

  // End turn & advance round / check week
  endTurn(onWeeklyReportCallback?: () => void) {
    this.checkWinConditions();
    if (this.phase === 'VICTORY') return;

    this.activePlayerIdx = (this.activePlayerIdx + 1) % this.players.length;

    if (this.activePlayerIdx === 0) {
      this.dayCounter++;

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

  public calculateIsoDirection(dgx: number, dgy: number): IsoDirection {
    // Convert 2.5D Isometric grid step to screen vector
    // Screen X = (dgx - dgy) * 48, Screen Y = (dgx + dgy) * 24
    const screenDx = (dgx - dgy) * 48;
    const screenDy = (dgx + dgy) * 24;

    if (Math.abs(screenDx) < 0.001 && Math.abs(screenDy) < 0.001) {
      return 'SE';
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

