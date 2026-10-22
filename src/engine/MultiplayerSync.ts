import type { GameState } from '../game/GameState';
import { SaveManager } from '../game/SaveManager';
import type { NetworkPacket, RoomInfo } from './NetworkRoomManager';
import { isLegalMovementPath } from '../game/Movement';
import { networkTurnId } from './NetworkProtocol';

/** A move carries its dice budget, so it does not depend on a separate dice packet. */
export function acceptNetworkMovement(game: GameState, room: RoomInfo | null, packet: NetworkPacket): number[] | null {
  if (!canAcceptTurnPacket(game, room, packet) || !['BOARD_TURN', 'DICE_ROLLING', 'CHOOSING_PATH'].includes(game.phase)) return null;
  const moves = packet.payload?.remainingMoves ?? game.remainingMoves;
  const path = packet.payload?.path;
  if (!Number.isInteger(moves) || moves < 1 || moves > 32 || !Array.isArray(path) ||
    !isLegalMovementPath(game.allNodes, game.activePlayer.nodeId, moves, !!game.activePlayer.hasFlexibleMovement, path)) return null;
  game.remainingMoves = moves;
  return path;
}

/** Visual playback only: remote turns must never execute tile rules or consume RNG. */
export class RemoteMovementPlayback {
  private frame: number | null = null;
  private generation = 0;
  private movingPlayer: GameState['activePlayer'] | null = null;

  cancel(): void {
    this.generation++;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (this.movingPlayer) this.movingPlayer.walkFrame = 0;
    this.movingPlayer = null;
  }

  play(game: GameState, path: number[], onStep: () => void, speed = game.gameSpeed): void {
    this.cancel();
    const generation = this.generation;
    const player = game.activePlayer;
    const nodes = path.slice(1).map(id => game.allNodes.find(node => node.id === id));
    if (!nodes.length || nodes.some(node => !node)) return;
    this.movingPlayer = player;
    game.phase = 'MOVING';
    game.highlightedNodes = [];
    game.activePreviewPath = [...path];
    let index = 0;
    const startStep = () => {
      const target = nodes[index]!;
      const start = { x: player.gridX, y: player.gridY, z: player.gridZ };
      const dx = target.gx - start.x, dy = target.gy - start.y;
      player.facing = game.calculateIsoDirection(dx, dy, player.facing);
      const playbackSpeed = Number.isFinite(speed) ? Math.max(0.25, Math.min(8, speed)) : 1;
      const duration = Math.max(60, Math.round((150 + Math.hypot(dx, dy) * 30) / playbackSpeed));
      const started = Date.now();
      const animate = () => {
        if (generation !== this.generation || game.activePlayer !== player) return;
        const elapsed = Date.now() - started;
        const progress = Math.min(1, elapsed / duration);
        player.gridX = start.x + dx * progress;
        player.gridY = start.y + dy * progress;
        player.gridZ = start.z + (target.gz - start.z) * progress;
        player.walkFrame = progress < 1 ? (Math.floor(elapsed / Math.max(10, Math.round(30 / playbackSpeed))) % 8) + 1 : 0;
        if (progress === 1) {
          player.prevNodeId = player.nodeId;
          player.nodeId = target.id;
        }
        onStep();
        if (progress < 1) this.frame = requestAnimationFrame(animate);
        else if (++index < nodes.length) startStep();
        else {
          this.frame = null;
          this.movingPlayer = null;
          game.activePreviewPath = [];
          game.remainingMoves = 0;
          game.phase = 'TILE_EVENT';
        }
      };
      animate();
    };
    startStep();
  }
}

/** The active human simulates their turn; only the host simulates AI turns. */
export function canAcceptTurnPacket(game: GameState, room: RoomInfo | null, packet: NetworkPacket): boolean {
  if (!room || packet.roomCode !== room.code || packet.payload?.playerIdx !== game.activePlayerIdx || packet.turnId && packet.turnId !== networkTurnId(game)) return false;
  const owner = room.connectedPeers.find(peer => peer.playerIndex === game.activePlayerIdx);
  return packet.senderId === (game.activePlayer.isAI ? 'host' : owner?.id);
}

/** Disk saves resume at a board turn. Live replication must preserve movement state. */
export function applyNetworkState(game: GameState, payload: any) {
  const phases = ['BOARD_TURN', 'DICE_ROLLING', 'CHOOSING_PATH', 'TILE_EVENT', 'VICTORY'];
  if (!payload?.state || !phases.includes(payload.phase)) return { success: false };
  const result = SaveManager.applySaveData(game, payload.state, false);
  if (!result.success) return result;
  const savedPlayers = Array.isArray(payload.state?.players) ? payload.state.players : Array.isArray(payload.players) ? payload.players : null;
  if (savedPlayers) {
    const extKeys = ['originalClassKey', 'promotionTier', 'weaponUpgradeLevel', 'weaponRune', 'fieldSpells', 'activeGuildQuest', 'foodBuff', 'relics', 'companion', 'rustTurns', 'freezeTurns', 'curseTurns', 'squidInkTurns', 'downerTurns', 'polymorphTurns', 'polymorphType', 'cursedBoxTurns', 'dungeonReturnNodeId', 'homeNodeId', 'burstGauge', 'hasFlexibleMovement', 'skillName'] as const;
    game.players.forEach((player, idx) => {
      const src = savedPlayers[idx];
      if (!src) return;
      for (const key of extKeys) {
        if (src[key] !== undefined) {
          (player as any)[key] = typeof structuredClone === 'function' ? structuredClone(src[key]) : src[key];
        }
      }
    });
  }
  game.phase = payload.phase;
  game.remainingMoves = Math.max(0, Math.min(32, Number(payload.remainingMoves) || 0));
  if (game.phase === 'CHOOSING_PATH') game.updateReachableHighlights();
  return result;
}
