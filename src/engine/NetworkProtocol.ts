import type { GameState } from '../game/GameState';
import type { NetworkPacket } from './NetworkRoomManager';

export const TURN_PACKETS = new Set(['DICE_ROLL', 'MOVE_PATH', 'BATTLE_VIEW', 'SYNC_STATE', 'USE_SPELL', 'USE_SPINNER', 'ADVANCE_TURN']);
const PACKETS = new Set([...TURN_PACKETS, 'ROOM_ERROR', 'ROOM_ADMITTED', 'HEARTBEAT', 'BATTLE_PROMPT', 'BATTLE_ACTION', 'JOIN_ROOM', 'REJOIN_ROOM', 'REJOIN_ACK', 'PEER_CONNECTED', 'PEER_RECONNECTED', 'PLAYER_UPDATE', 'START_GAME', 'CHAT_MSG', 'LEAVE_ROOM']);

export function validNetworkPacket(value: unknown): value is NetworkPacket {
  if (!value || typeof value !== 'object') return false;
  const p = value as NetworkPacket;
  if (!PACKETS.has(p.type) || typeof p.packetId !== 'string' || !p.packetId || p.packetId.length > 160 || typeof p.senderId !== 'string' || p.senderId.length > 100 || typeof p.roomCode !== 'string' || !p.payload || typeof p.payload !== 'object' || !Number.isFinite(p.timestamp)) return false;
  try {
    const raw = JSON.stringify(p);
    return raw.length <= 512 * 1024 && !/"(?:__proto__|constructor|prototype)"\s*:/.test(raw);
  } catch { return false; }
}

export function networkTurnId(game: GameState): string { return `${game.world.seed}:${game.dayCounter}:${game.activePlayerIdx}`; }

/** Sanity limits supplement seat authentication; a P2P turn owner is still trusted to resolve RNG. */
export function validTurnSnapshot(game: GameState, payload: NetworkPacket['payload']): boolean {
  const state = payload?.state;
  if (!state || state.world?.seed !== game.world.seed || state.gameMode !== game.gameMode || !Array.isArray(state.players) || state.players.length !== game.players.length) return false;
  if (state.winGoal !== game.winGoal || state.allowDarkling !== game.allowDarkling || state.blitzDayLimit !== game.blitzDayLimit || state.coopRaidDayLimit !== game.coopRaidDayLimit || JSON.stringify(state.world.matchConfig) !== JSON.stringify(game.world.matchConfig)) return false;
  if (!Number.isInteger(state.dayCounter) || state.dayCounter < game.dayCounter || state.dayCounter > game.dayCounter + 1) return false;
  // Sleeping players can be skipped by startTurn; permit one forward round, never a rewind.
  if (!Number.isInteger(state.activePlayerIdx) || state.activePlayerIdx < 0 || state.activePlayerIdx >= game.players.length) return false;
  const advance = (state.dayCounter - game.dayCounter) * game.players.length + state.activePlayerIdx - game.activePlayerIdx;
  if (advance < 0 || advance > game.players.length) return false;
  return state.players.every((p: any, index: number) => {
    const prior = game.players[index];
    if (p.id !== prior.id || p.isAI !== prior.isAI || p.name !== prior.name) return false;
    return ['hp', 'maxHp', 'mp', 'maxMp', 'atk', 'def', 'mag', 'spd', 'luk', 'gold', 'level', 'xp'].every(key => Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= (key === 'gold' || key === 'xp' ? 10000000 : key === 'level' ? 100 : 100000)) && p.hp <= p.maxHp && p.mp <= p.maxMp && p.level >= prior.level && p.level <= prior.level + 5;
  });
}
