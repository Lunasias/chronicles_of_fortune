import { HERO_CLASSES, Player } from './Player';
import type { Combatant } from './BattleEngine';

/** Regional difficulty is authored. Equipment and HP upgrades never strengthen the enemy. */

/** Regional threat. Derived from the realm / biome a node belongs to. */
export type ThreatTier = 1 | 2 | 3 | 4 | 5 | 6;

export const THREAT_TIER_LABELS: Record<ThreatTier, string> = {
  1: 'เขตชายแดน',
  2: 'เขตพัฒนาการ',
  3: 'เขตอันตราย',
  4: 'เขตมรณะ',
  5: 'เขตต้องห้าม',
  6: 'เขตบรรพกาล'
};

/** Default regional seeds, used only when an encounter has no authored stat. */
const TIER_REFERENCE: Record<ThreatTier, { hp: number; atk: number; def: number; mag: number; spd: number }> = {
  1: { hp: 67, atk: 13.5, def: 8.5, mag: 8.5, spd: 8.5 },
  2: { hp: 132, atk: 22.5, def: 16, mag: 18, spd: 14 },
  3: { hp: 265, atk: 36, def: 27, mag: 30, spd: 21 },
  4: { hp: 480, atk: 54, def: 39, mag: 47, spd: 28 },
  5: { hp: 720, atk: 70, def: 50, mag: 62, spd: 34 },
  6: { hp: 1000, atk: 88, def: 62, mag: 78, spd: 40 }
};

/** Multiplier for the luckiest possible exchange: critical, then an agile follow-up. */
const CRIT_MULTIPLIER = 1.5;
const DOUBLE_STRIKE_MULTIPLIER = 1.4;

/**
 * The largest single exchange the hero can land: best attack, critical, plus the agile
 * follow-up strike BattleEngine can append when SPD leads by 8 or more.
 */
export function estimateHeroMaxSingleHit(player: Player): number {
  const base = HERO_CLASSES[player.originalClassKey || player.classKey] || HERO_CLASSES.warrior;
  const atk = player.getTotalStat('atk');
  const mag = player.getTotalStat('mag');
  const physical = Math.max(6, atk * 2.1);
  const magic = Math.max(12, mag * 2.6 + 12 + (mag >= 20 ? mag * 0.35 : 0));
  return Math.max(physical, magic) * CRIT_MULTIPLIER * DOUBLE_STRIKE_MULTIPLIER;
}

export interface PlayerPower {
  level: number;
  /** The hero's strongest offensive stat (physical or magical). */
  offense: number;
  /** Same stat for this class at level 1 with no equipment - the authored reference. */
  baselineOffense: number;
  maxHp: number;
  baselineMaxHp: number;
  defense: number;
}

/** Reads the combat-relevant power of a hero, including its level-1 reference point. */
export function measurePlayerPower(player: Player): PlayerPower {
  const base = HERO_CLASSES[player.originalClassKey || player.classKey] || HERO_CLASSES.warrior;
  const atk = player.getTotalStat('atk');
  const mag = player.getTotalStat('mag');

  return {
    level: player.level,
    offense: Math.max(atk, mag, 1),
    baselineOffense: Math.max(base.atk, base.mag, 1),
    maxHp: Math.max(1, player.maxHp),
    baselineMaxHp: Math.max(1, base.baseHp),
    defense: player.getTotalStat('def')
  };
}

export interface MonsterSeed {
  name: string;
  tier?: ThreatTier;
  /** Bosses are meant to be endurance fights, not skirmishes. */
  isBoss?: boolean;
  /** Authored level-1 stats. Omit any of them to fall back to the tier reference. */
  baseHp?: number;
  baseAtk?: number;
  baseDef?: number;
  baseMag?: number;
  baseSpd?: number;
  baseLuk?: number;
  mp?: number;
  skillName?: string;
  classKey?: string;
  icon?: string;
}

/** Picks the threat tier for a board node from its realm and biome. */
export function tierForNode(realmId: string | undefined, biome: string | undefined, isBossNode = false): ThreatTier {
  if (isBossNode) return 6;
  if (realmId === 'abyss' || biome === 'abyss') return 4;
  if (realmId === 'frostpeak' || biome === 'snow' || biome === 'volcano') return 3;
  if (realmId === 'celestial') return 5;
  if (realmId === 'sunfire' || biome === 'desert' || biome === 'steampunk' || biome === 'sakura_shrine' || biome === 'cavern') {
    return 2;
  }
  if (realmId === 'emerald' || biome === 'waterfall_forest' || biome === 'fairy_grove' || biome === 'crystal_cavern') {
    return 2;
  }
  return 1;
}

/** Authored enemies retain regional strength regardless of the challenger. */
export function scaleMonster(seed: MonsterSeed, player?: Player | null): Combatant {
  const ref = TIER_REFERENCE[seed.tier ?? 1];
  // The region defines the challenge. Returning to an earlier region rewards progression.
  return {
    name: seed.name, hp: Math.round(seed.baseHp ?? ref.hp), maxHp: Math.round(seed.baseHp ?? ref.hp),
    mp: seed.mp ?? 30, maxMp: seed.mp ?? 30,
    atk: Math.round(seed.baseAtk ?? ref.atk), def: Math.round(seed.baseDef ?? ref.def),
    mag: Math.round(seed.baseMag ?? ref.mag), spd: Math.round(seed.baseSpd ?? ref.spd), luk: Math.round(seed.baseLuk ?? 5),
    isBoss: seed.isBoss, classKey: seed.classKey, skillName: seed.skillName
  };
}

/** Best-case single-target damage the hero can produce in one round. */
export function estimateHeroDamagePerRound(player: Player, atBaseline = false): number {
  const base = HERO_CLASSES[player.originalClassKey || player.classKey] || HERO_CLASSES.warrior;
  const atk = atBaseline ? base.atk : player.getTotalStat('atk');
  const mag = atBaseline ? base.mag : player.getTotalStat('mag');
  const luk = atBaseline ? base.luk : player.getTotalStat('luk');

  // Mirrors BattleEngine: physical uses ATK * 2.1, magic uses MAG * 2.6 + 12 with an
  // extra elemental term once MAG reaches 20.
  const physical = Math.max(6, atk * 2.1);
  const magic = Math.max(12, mag * 2.6 + 12 + (mag >= 20 ? mag * 0.35 : 0));

  // Average critical contribution, capped the same way the engine caps it.
  const critChance = Math.min(0.4, luk * 0.015);
  const best = atBaseline || player.mp >= 10 ? Math.max(physical, magic) : physical;
  return Math.max(1, best * (1 + critChance * 0.5));
}

/**
 * How many rounds a fight against this monster is expected to last for this hero.
 * Used by the scouting UI so the warning it shows matches the fight that will happen.
 */
export function estimateRoundsToKill(monster: Combatant, player: Player): number {
  const physical = Math.max(6, player.getTotalStat('atk') * 2.1 - monster.def * 0.75);
  const magic = player.mp >= 10 ? Math.max(6, player.getTotalStat('mag') * 2.6 + 12 + (player.getTotalStat('mag') >= 20 ? player.getTotalStat('mag') * 0.35 : 0) - monster.mag * 0.85) : 0;
  const effective = Math.max(physical, magic);
  return Math.max(1, Math.ceil((monster.hp || 1) / effective));
}

/** How many of the monster's hits the hero can absorb. */
export function estimateRoundsToSurvive(monster: Combatant, player: Player): number {
  const incoming = Math.max(4, (monster.atk || 1) * 2.1 - player.getTotalStat('def') * 0.75);
  return Math.max(0, Math.floor(player.hp / incoming));
}

export type ThreatVerdict = 'TRIVIAL' | 'EASY' | 'FAIR' | 'HARD' | 'DEADLY';

/**
 * Reads the two round estimates together into a single verdict, which is what the scouting
 * tooltip shows instead of a hand-written threat label that can drift from the real fight.
 */
export function judgeThreat(monster: Combatant, player: Player): {
  verdict: ThreatVerdict;
  roundsToKill: number;
  roundsToSurvive: number;
  color: string;
  description: string;
} {
  const roundsToKill = estimateRoundsToKill(monster, player);
  const roundsToSurvive = estimateRoundsToSurvive(monster, player);
  const margin = roundsToSurvive / roundsToKill;

  let verdict: ThreatVerdict;
  let color: string;
  let description: string;

  if (margin >= 3) {
    verdict = 'TRIVIAL';
    color = '#64748b';
    description = `อ่อนกว่ามาก — ชนะใน ~${roundsToKill} เทิร์นโดยแทบไม่เสียเลือด`;
  } else if (margin >= 1.8) {
    verdict = 'EASY';
    color = '#38bdf8';
    description = `ได้เปรียบชัด — ชนะใน ~${roundsToKill} เทิร์น รับความเสียหายไม่มาก`;
  } else if (margin >= 1.15) {
    verdict = 'FAIR';
    color = '#34d399';
    description = `สูสี — ต้องราว ~${roundsToKill} เทิร์น และทนได้ราว ${roundsToSurvive} ครั้ง`;
  } else if (margin >= 0.85) {
    verdict = 'HARD';
    color = '#fbbf24';
    description = `อันตราย — ต้องราว ~${roundsToKill} เทิร์น แต่ทนได้เพียง ~${roundsToSurvive} ครั้ง`;
  } else {
    verdict = 'DEADLY';
    color = '#ef4444';
    description = `อันตรายถึงตาย — ตายก่อนฆ่ามันได้ (ต้อง ~${roundsToKill} เทิร์น แต่ทนได้แค่ ~${roundsToSurvive} ครั้ง)`;
  }

  return { verdict, roundsToKill, roundsToSurvive, color, description };
}
