import type { Combatant } from './BattleEngine';
import type { BoardNode } from './BoardMap';
import { WorldState } from './WorldState';
import type { Player } from './Player';

/** One equipment/buff snapshot for scouting, initiative and the actual fight. */
export function createPlayerCombatant(player: Player, isPvP = false): Combatant {
  return {
    name: player.displayName, hp: player.hp, maxHp: player.maxHp, mp: player.mp, maxMp: player.maxMp,
    atk: player.getTotalStat('atk'), def: player.getTotalStat('def'), mag: player.getTotalStat('mag'),
    spd: player.getTotalStat('spd'), luk: player.getTotalStat('luk'),
    isPvP, playerRef: player, classKey: player.classKey, skillName: player.skillName, avatar: player.avatar,
  };
}

/** The same transformation is used by scouting and battle creation. No hero gear feedback. */
export function prepareCombatant(source: Combatant, node: BoardNode, world: WorldState, enemy = false): Combatant {
  const key = `${world.day}:${node.id}:${world.weatherAt(node)}:${world.modifier?.id}:${world.spireFloor}:${world.focusPlayerId}:${enemy}`;
  if (source.environmentKey === key) return source;
  const c = { ...source, environmentKey: key };
  if (source.playerRef) {
    if (source.playerRef.relics.includes('dragon_heart')) {
      source.playerRef.freezeTurns = 0;
      c.freezeTurns = 0;
      c.burnTurns = 0;
    } else {
      c.freezeTurns = source.playerRef.freezeTurns;
    }
    c.blindTurns = source.playerRef.blindTurns;
  }
  const weather = world.weatherAt(node);
  const baseClass = source.playerRef?.originalClassKey ?? source.classKey ?? '';
  if (!c.element) c.element = ({ magician: 'fire', cleric: 'holy', spellblade: 'lightning', thief: 'dark', warrior: 'earth' } as const)[baseClass as 'magician'] ?? (node.biome === 'snow' ? 'ice' : node.biome === 'volcano' ? 'fire' : node.biome === 'abyss' ? 'dark' : node.biome === 'coral' || node.biome === 'waterfall_forest' ? 'water' : 'earth');
  if (enemy && !source.isPvP) {
    c.resistanceElement = c.element;
    c.weaknessElement = ({ fire: 'water', water: 'lightning', ice: 'fire', lightning: 'earth', earth: 'ice', dark: 'holy', holy: 'dark' } as const)[c.element];
  }
  if (weather === 'rain') { c.mag = Math.round(c.mag * 1.15); c.isWet = true; }
  if (weather === 'snow') { c.def = Math.round(c.def * 1.1); c.spd = Math.max(1, Math.round(c.spd * 0.9)); }
  if (weather === 'heatwave') c.atk = Math.round(c.atk * 1.1);
  if (weather === 'sandstorm') c.spd = Math.max(1, Math.round(c.spd * 0.85));
  if (weather === 'miasma') c.mag = Math.round(c.mag * 1.1);
  if (enemy && weather === 'blood_moon') { c.atk = Math.round(c.atk * 1.2); c.mag = Math.round(c.mag * 1.2); }
  if (enemy && node.id >= 1000) {
    const expedition = world.expeditions[world.focusPlayerId];
    const depth = expedition?.depth ?? 1;
    const factor = 1 + (depth - 1) * 0.2 + ((expedition?.torch ?? 100) <= 20 ? 0.2 : 0);
    c.maxHp = Math.round(c.maxHp * factor); c.hp = Math.round(c.hp * factor);
    c.atk = Math.round(c.atk * factor); c.mag = Math.round(c.mag * factor);
  }
  if (enemy && node.type === 'boss' && node.id < 1000 && world.mode === 'endless_spire') {
    const factor = 1 + (world.spireFloor - 1) * 0.2;
    c.hp = Math.round(c.hp * factor); c.maxHp = Math.round(c.maxHp * factor);
    c.atk = Math.round(c.atk * factor); c.mag = Math.round(c.mag * factor);
  }
  if (world.modifier) {
    c.atk = Math.round(c.atk * world.modifier.atkMultiplier);
    c.def = Math.round(c.def * world.modifier.defMultiplier);
    c.mag = Math.round(c.mag * (world.modifier.magMultiplier ?? 1));
  }
  return c;
}
