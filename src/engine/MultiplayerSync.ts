import type { GameState } from '../game/GameState';
import { SaveManager } from '../game/SaveManager';
import type { NetworkPacket, RoomInfo } from './NetworkRoomManager';

/** The active human simulates their turn; only the host simulates AI turns. */
export function canAcceptTurnPacket(game: GameState, room: RoomInfo | null, packet: NetworkPacket): boolean {
  if (!room || packet.roomCode !== room.code || packet.payload?.playerIdx !== game.activePlayerIdx) return false;
  const owner = room.connectedPeers.find(peer => peer.playerIndex === game.activePlayerIdx);
  return packet.senderId === (game.activePlayer.isAI ? 'host' : owner?.id);
}

/** Disk saves resume at a board turn. Live replication must preserve movement state. */
export function applyNetworkState(game: GameState, payload: any) {
  const phases = ['BOARD_TURN', 'DICE_ROLLING', 'CHOOSING_PATH', 'TILE_EVENT', 'VICTORY'];
  if (!payload?.state || !phases.includes(payload.phase)) return { success: false };
  const result = SaveManager.applySaveData(game, payload.state, false);
  if (!result.success) return result;
  game.phase = payload.phase;
  game.remainingMoves = Math.max(0, Math.min(32, Number(payload.remainingMoves) || 0));
  if (game.phase === 'CHOOSING_PATH') game.updateReachableHighlights();
  return result;
}
