import { BattleEngine, type Combatant } from '../game/BattleEngine';
import type { GameState } from '../game/GameState';
import type { Player } from '../game/Player';

type BattleActor = Omit<Combatant, 'playerRef'> & {
  playerIndex?: number;
  visual?: Pick<Player, 'classKey' | 'skinVariant' | 'equipment' | 'companion' | 'isDarkling' | 'prank' | 'burstGauge'>;
};
export interface BattleSnapshot {
  attacker: BattleActor;
  defender: BattleActor;
  isPlayerAttacking: boolean;
  biome: string;
  playerHazards: BattleEngine['playerHazards'];
  enemyHazards: BattleEngine['enemyHazards'];
}

export function captureBattle(battle: BattleEngine, players: Player[]): BattleSnapshot {
  const actor = (combatant: Combatant): BattleActor => {
    const { playerRef, ...data } = combatant;
    if (!playerRef) return data;
    const { classKey, skinVariant, equipment, companion, isDarkling, prank, burstGauge } = playerRef;
    return { ...data, playerIndex: players.indexOf(playerRef), visual: { classKey, skinVariant, equipment, companion, isDarkling, prank, burstGauge } };
  };
  return { attacker: actor(battle.attacker), defender: actor(battle.defender),
    isPlayerAttacking: battle.isPlayerAttacking, biome: battle.biome,
    playerHazards: { ...battle.playerHazards }, enemyHazards: { ...battle.enemyHazards } };
}

/** Restore presentation without initiative, hazards, RNG, or combat resolution. */
export function restoreBattle(snapshot: BattleSnapshot, game: GameState): BattleEngine | null {
  const valid = (actor: BattleActor) => actor && typeof actor.name === 'string' &&
    ['hp', 'maxHp', 'mp', 'maxMp', 'atk', 'def', 'mag', 'spd', 'luk'].every(key => Number.isFinite((actor as any)[key]));
  if (!snapshot || !valid(snapshot.attacker) || !valid(snapshot.defender) || typeof snapshot.isPlayerAttacking !== 'boolean') return null;
  const actor = (data: BattleActor): Combatant => {
    const { playerIndex, visual, ...combatant } = data;
    const source = typeof playerIndex === 'number' ? game.players[playerIndex] : undefined;
    // Render-only player copies keep incoming combat stats out of board simulation.
    const playerRef = source ? Object.assign(Object.create(Object.getPrototypeOf(source)), source, visual) as Player : undefined;
    return { ...combatant, playerRef };
  };
  return Object.assign(Object.create(BattleEngine.prototype), snapshot, {
    attacker: actor(snapshot.attacker), defender: actor(snapshot.defender)
  }) as BattleEngine;
}
