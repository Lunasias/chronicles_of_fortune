import { HERO_CLASSES, Player } from './Player';
import type { Combatant } from './BattleEngine';

/**
 * Enemy power scaling.
 *
 * Every monster stat authored in `BoardMap` and in the encounter tables was tuned for a
 * level-1 hero with no equipment: a starting warrior trades roughly three blows to fell a
 * tier-1 monster and survives about five in return. Nothing ever re-scaled those numbers,
 * so as soon as the hero gained a few levels (+2..4 ATK each) the damage formula
 *
 *     damage = ATK * 2.1 - DEF * 0.75
 *
 * outran every monster's fixed HP and fights collapsed into a single hit.
 *
 * This module treats the authored numbers as the balance point for a fresh hero and scales
 * them by how much stronger the hero has actually become, so the *shape* of a fight is
 * preserved: a tier-1 encounter stays a short skirmish and a tier-4 encounter stays lethal,
 * but neither is trivialised by levelling.
 *
 * The scaling is intentionally applied at battle time rather than written back into the
 * board, so the authored data remains the readable, hand-tuned reference.
 */

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

/**
 * Average authored stats per tier, measured from the encounter tables in `main.ts`.
 * These are the numbers a fresh hero is expected to face, so they act as the reference
 * point the scaling multiplies away from.
 */
const TIER_REFERENCE: Record<ThreatTier, { hp: number; atk: number; def: number; mag: number; spd: number }> = {
  1: { hp: 67, atk: 13.5, def: 8.5, mag: 8.5, spd: 8.5 },
  2: { hp: 132, atk: 22.5, def: 16, mag: 18, spd: 14 },
  3: { hp: 265, atk: 36, def: 27, mag: 30, spd: 21 },
  4: { hp: 480, atk: 54, def: 39, mag: 47, spd: 28 },
  5: { hp: 720, atk: 70, def: 50, mag: 62, spd: 34 },
  6: { hp: 1000, atk: 88, def: 62, mag: 78, spd: 40 }
};

/** Highest multiplier applied to monster HP/ATK, so late-game numbers stay readable. */
const MAX_SCALE = 12;

/** A monster's DEF may never absorb more than this share of the hero's raw attack. */
const MAX_DEF_ABSORPTION = 0.55;

/**
 * Floor on the authored fight length, in rounds, for any class.
 *
 * A magician's opening magic lands around 54 damage against the authored 67 HP of a tier-1
 * monster, so that encounter was a two-round fight - and a critical (x1.5) killed it outright
 * in one. A 2.5-round floor stops a single lucky hit from ending an encounter while leaving
 * the burst classes' identity intact. The floor does not bind for the martial classes, whose
 * authored encounters are already longer.
 */
const MIN_AUTHORED_ROUNDS = 2.5;

/** Headroom kept above the hero's worst-case single exchange when sizing a monster's HP. */
const SINGLE_HIT_SAFETY = 1.15;

/** Multiplier for the luckiest possible exchange: critical, then an agile follow-up. */
const CRIT_MULTIPLIER = 1.5;
const DOUBLE_STRIKE_MULTIPLIER = 1.4;

/**
 * The largest single exchange the hero can land: best attack, critical, plus the agile
 * follow-up strike BattleEngine can append when SPD leads by 8 or more.
 */
export function estimateHeroMaxSingleHit(player: Player): number {
  const base = HERO_CLASSES[player.classKey] || HERO_CLASSES.warrior;
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
  const base = HERO_CLASSES[player.classKey] || HERO_CLASSES.warrior;
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

/**
 * Builds the combatant a hero actually fights.
 *
 * `player` is the hero that will face the monster. When it is omitted the authored stats are
 * returned untouched, which keeps boss/preview paths without a hero working as before.
 */
export function scaleMonster(seed: MonsterSeed, player?: Player | null): Combatant {
  const tier = seed.tier ?? 1;
  const ref = TIER_REFERENCE[tier];

  const baseHp = Math.max(1, seed.baseHp ?? ref.hp);
  const baseAtk = Math.max(1, seed.baseAtk ?? ref.atk);
  const baseDef = Math.max(0, seed.baseDef ?? ref.def);
  const baseMag = Math.max(0, seed.baseMag ?? ref.mag);
  const baseSpd = Math.max(1, seed.baseSpd ?? ref.spd);
  const baseLuk = Math.max(1, seed.baseLuk ?? 5);

  if (!player) {
    return {
      name: seed.name,
      hp: Math.round(baseHp),
      maxHp: Math.round(baseHp),
      mp: seed.mp ?? 30,
      maxMp: seed.mp ?? 30,
      atk: Math.round(baseAtk),
      def: Math.round(baseDef),
      mag: Math.round(baseMag),
      spd: Math.round(baseSpd),
      luk: Math.round(baseLuk),
      isBoss: seed.isBoss,
      classKey: seed.classKey,
      skillName: seed.skillName
    };
  }

  const power = measurePlayerPower(player);
  const offenseRatio = clamp(power.offense / power.baselineOffense, 0.75, MAX_SCALE);
  // A small "progression dividend": by late game the same tier of monster takes slightly
  // fewer rounds, so levelling feels rewarding. It is deliberately capped and only applied
  // to HP - applying it to damage as well would make fights longer AND deadlier at once.
  const easing = 1 - Math.min(0.15, Math.max(0, power.level - 1) * 0.01);

  const rawAttack = power.offense * 2.1;

  // --- DEF ------------------------------------------------------------------
  // Grows with the hero's offence so armour keeps mattering, but is capped so it can never
  // grind the fight down to the minimum-damage floor.
  const defExact = Math.min(baseDef * offenseRatio, (rawAttack * MAX_DEF_ABSORPTION) / 0.75);
  const def = Math.floor(defExact);

  // --- HP -------------------------------------------------------------------
  // The authored HP is the number of rounds the map author intended a level-1 hero to need,
  // so that round count is measured at baseline and then re-applied to the hero's current
  // damage per round. This keeps the length of a fight constant as the hero grows instead of
  // collapsing to a single hit, and it reproduces the authored HP exactly at level 1.
  const heroDamage = estimateHeroDamagePerRound(player);
  const baselineDamage = estimateHeroDamagePerRound(player, true);
  const heroEffective = Math.max(6, heroDamage - defExact * 0.75);
  const baselineEffective = Math.max(6, baselineDamage - baseDef * 0.75);

  // Guarantee that no single lucky exchange can delete the monster. BattleEngine can stack a
  // critical (x1.5) with an agile follow-up strike (x1.4) and a botched counter (x1.25), so
  // the fight length is floored against that worst case rather than against average damage.
  const worstCaseExchange = estimateHeroMaxSingleHit(player);
  const guaranteedRounds = (worstCaseExchange * SINGLE_HIT_SAFETY) / Math.max(1, heroEffective * easing);

  const authoredRounds = Math.max(
    baseHp / baselineEffective,
    MIN_AUTHORED_ROUNDS,
    guaranteedRounds
  );
  const hp = Math.max(1, Math.round(heroEffective * authoredRounds * easing));

  // --- ATK ------------------------------------------------------------------
  // Solved so a single hit costs the hero the same share of its health pool as it did at
  // level 1. Because the denominator is solved out exactly, incoming damage works out to
  // `authoredShare * maxHp` and the hero survives the same number of hits at every level.
  const authoredShare = Math.max(
    0.06,
    (baseAtk * 2.1 - baselineDefenseFor(player) * 0.75) / power.baselineMaxHp
  );
  const targetDamage = authoredShare * power.maxHp;
  // Floored, not rounded: rounding 13.5 up to 14 was enough to cost the hero one whole hit of
  // survivability, making a monster stronger than the authored threat it is derived from.
  const atk = Math.max(1, Math.floor((targetDamage + power.defense * 0.75) / 2.1));

  // --- the rest -------------------------------------------------------------
  const mag = Math.round(Math.min(baseMag * offenseRatio, atk * 1.15));
  // Speed and luck grow gently. Player.levelUp() never raises SPD or LUK, so scaling these
  // as hard as the offence stats would eventually make every monster act first and crit
  // more often than the hero, which reads as unfair rather than difficult.
  const spd = Math.round(baseSpd + power.level * 0.4);
  const luk = Math.round(baseLuk + power.level * 0.2);

  return {
    name: seed.name,
    hp,
    maxHp: hp,
    mp: seed.mp ?? 30 + power.level * 3,
    maxMp: seed.mp ?? 30 + power.level * 3,
    atk,
    def,
    mag,
    spd,
    luk,
    isBoss: seed.isBoss,
    classKey: seed.classKey,
    skillName: seed.skillName
  };
}

/** Best-case single-target damage the hero can produce in one round. */
export function estimateHeroDamagePerRound(player: Player, atBaseline = false): number {
  const base = HERO_CLASSES[player.classKey] || HERO_CLASSES.warrior;
  const atk = atBaseline ? base.atk : player.getTotalStat('atk');
  const mag = atBaseline ? base.mag : player.getTotalStat('mag');
  const luk = atBaseline ? base.luk : player.getTotalStat('luk');

  // Mirrors BattleEngine: physical uses ATK * 2.1, magic uses MAG * 2.6 + 12 with an
  // extra elemental term once MAG reaches 20.
  const physical = Math.max(6, atk * 2.1);
  const magic = Math.max(12, mag * 2.6 + 12 + (mag >= 20 ? mag * 0.35 : 0));

  // Average critical contribution, capped the same way the engine caps it.
  const critChance = Math.min(0.4, luk * 0.015);
  const best = Math.max(physical, magic);
  return Math.max(1, best * (1 + critChance * 0.5));
}

function baselineDefenseFor(player: Player): number {
  const base = HERO_CLASSES[player.classKey] || HERO_CLASSES.warrior;
  return base.def;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * How many rounds a fight against this monster is expected to last for this hero.
 * Used by the scouting UI so the warning it shows matches the fight that will happen.
 */
export function estimateRoundsToKill(monster: Combatant, player: Player): number {
  const perRound = estimateHeroDamagePerRound(player);
  const absorbed = Math.max(0, monster.def || 0) * 0.75;
  const effective = Math.max(6, perRound - absorbed);
  return Math.max(1, Math.ceil((monster.hp || 1) / effective));
}

/** How many of the monster's hits the hero can absorb. */
export function estimateRoundsToSurvive(monster: Combatant, player: Player): number {
  const incoming = Math.max(4, (monster.atk || 1) * 2.1 - player.getTotalStat('def') * 0.75);
  return Math.max(1, Math.floor(player.maxHp / incoming));
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
