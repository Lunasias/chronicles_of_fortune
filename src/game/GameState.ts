import { Player } from './Player';
import { BoardNode, DOKAPON_NODES } from './BoardMap';
import { BattleEngine, Combatant } from './BattleEngine';
import { townManager } from './TownManager';
import { darklingSystem } from './DarklingSystem';
import { aiSystem } from './AISystem';
import { audio } from '../engine/AudioSynthesizer';

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
    if (this.logs.length > 50) this.logs.pop();
  }

  initGame(partyConfig: Array<{ name: string; classKey: string; isAI: boolean }>, winGoal = 'networth') {
    this.players = partyConfig.map((cfg, idx) => new Player(idx + 1, cfg.name, cfg.classKey, cfg.isAI, 0));
    this.winGoal = winGoal;
    this.activePlayerIdx = 0;
    this.dayCounter = 1;
    this.weekCounter = 1;
    this.phase = 'BOARD_TURN';

    this.addLog(`⚔️ The Grand Dokapon Expedition begins across 52 provinces!`, 'level');
    this.startTurn();
  }

  startTurn() {
    const p = this.activePlayer;
    this.phase = 'BOARD_TURN';
    p.tickTurn();

    // Collect daily town tax
    const taxEarned = townManager.collectTurnRevenue(p, this.allNodes);
    if (taxEarned > 0) {
      this.addLog(`🚩 ${p.displayName} received ${taxEarned}G tax from governed territories!`, 'gold');
    }

    this.addLog(`It is now ${p.displayName}'s turn (${p.isAI ? 'AI Bot' : 'Player'}).`);
  }

  // Roll 1 die, or 2-3 dice if using spinner or in Darkling form
  rollMovementDice(): number {
    if (this.phase !== 'BOARD_TURN') return 0;
    this.phase = 'DICE_ROLLING';

    const p = this.activePlayer;
    let numDice = p.activeSpinnerMultiplier;
    if (p.isDarkling) numDice = 3;

    let totalRoll = 0;
    for (let i = 0; i < numDice; i++) {
      totalRoll += Math.floor(Math.random() * 6) + 1;
    }

    p.activeSpinnerMultiplier = 1;
    this.remainingMoves = totalRoll;
    return totalRoll;
  }

  // Calculate all reachable destination nodes for the exact roll
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
      if (curr.movesLeft === 0) {
        reachable.add(curr.nodeId);
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

  // Pathfinding: Find exact route from current position to target node of length 'steps'
  findPathToTarget(targetNodeId: number): number[] | null {
    if (!this.highlightedNodes.includes(targetNodeId)) return null;

    const queue: Array<{ path: number[]; prevId: number | null }> = [
      { path: [this.activePlayer.nodeId], prevId: this.activePlayer.prevNodeId }
    ];

    while (queue.length > 0) {
      const { path, prevId } = queue.shift()!;
      const currentId = path[path.length - 1];

      if (path.length - 1 === this.remainingMoves) {
        if (currentId === targetNodeId) {
          return path;
        }
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

    // Determine 2.5D Isometric direction
    const dgx = targetNode.gx - p.gridX;
    const dgy = targetNode.gy - p.gridY;

    if (dgx > 0 && dgy >= 0) p.facing = 'SE';
    else if (dgy > 0 && dgy <= 0) p.facing = 'SW';
    else if (dgx < 0 && dgy <= 0) p.facing = 'NW';
    else p.facing = 'NE';

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
}
