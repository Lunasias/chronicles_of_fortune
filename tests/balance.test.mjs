// Enemy scaling rules.
//
// Every monster stat authored in BoardMap and the encounter tables was tuned for a level-1
// hero. Nothing re-scaled them, so once a hero gained a few levels the damage formula
// (ATK * 2.1 - DEF * 0.75) outran every fixed HP pool and fights collapsed into one hit.
// These tests pin the contract that fixes that.
import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { Player, HERO_CLASSES } from '../.test-build/game/Player.js';
import {
  estimateHeroMaxSingleHit,
  estimateRoundsToKill,
  estimateRoundsToSurvive,
  judgeThreat,
  scaleMonster,
  tierForNode
} from '../.test-build/game/BalanceSystem.js';

/** Average per-level gains, matching the midpoint of Player.levelUp()'s ranges. */
const PER_LEVEL = { atk: 3, def: 2.5, mag: 3, hp: 23 };

/**
 * Builds a hero at an "average" level without relying on levelUp()'s random rolls.
 */
function heroAtLevel(classKey, level) {
  const base = HERO_CLASSES[classKey];
  const p = new Player(1, 'Tester', classKey, false, 0, 0);
  const steps = level - 1;
  p.level = level;
  p.maxHp = base.baseHp + PER_LEVEL.hp * steps;
  p.hp = p.maxHp;
  p.atk = base.atk + PER_LEVEL.atk * steps;
  p.def = base.def + PER_LEVEL.def * steps;
  p.mag = base.mag + PER_LEVEL.mag * steps;
  return p;
}

const TIER1 = { name: 'Forest Goblin Marauder', tier: 1, baseHp: 67, baseAtk: 13.5, baseDef: 8.5, baseMag: 8.5, baseSpd: 8.5, baseLuk: 5 };
const TIER4 = { name: 'Void Bat', tier: 4, baseHp: 480, baseAtk: 54, baseDef: 39, baseMag: 47, baseSpd: 28, baseLuk: 11 };

test('without a hero the authored stats pass through untouched', () => {
  const monster = scaleMonster(TIER1);
  assert.equal(monster.hp, 67);
  assert.equal(monster.atk, 14, '13.5 rounds to 14');
  assert.equal(monster.def, 9, '8.5 rounds to 9');
});

test('a level-1 hero faces the authored stats, bar the documented minimum-fight floor', () => {
  // The authored numbers ARE the level-1 balance point. The one deliberate departure is the
  // minimum-fight floor, which only binds for a burst class whose opening magic would
  // otherwise two-tap the authored 67 HP.
  for (const classKey of Object.keys(HERO_CLASSES)) {
    const hero = heroAtLevel(classKey, 1);
    const monster = scaleMonster(TIER1, hero);
    assert.ok(
      monster.hp >= 67,
      `${classKey}: level-1 HP ${monster.hp} should never be below the authored 67`
    );
    assert.ok(
      monster.hp <= 67 * 2,
      `${classKey}: level-1 HP ${monster.hp} drifted too far from the authored 67`
    );
    assert.ok(
      Math.abs(monster.def - 9) <= 1,
      `${classKey}: DEF should stay near the authored 8.5, got ${monster.def}`
    );
  }
});

test('no single hit, not even a critical, can delete a tier-1 monster', () => {
  // BattleEngine can stack a critical (x1.5) with an agile follow-up strike (x1.4), so a
  // two-round fight can still be a one-exchange kill. scaleMonster() floors the fight length
  // against exactly this number.
  for (const classKey of Object.keys(HERO_CLASSES)) {
    for (const level of [1, 3, 6, 10, 15, 20, 25, 30]) {
      const hero = heroAtLevel(classKey, level);
      const monster = scaleMonster(TIER1, hero);
      const worstCase = estimateHeroMaxSingleHit(hero);

      assert.ok(
        worstCase < monster.hp,
        `${classKey} Lv.${level}: a critical exchange deals ${Math.round(worstCase)} ` +
          `against ${monster.hp} HP`
      );
    }
  }
});

test('a levelled hero never one-shots a tier-1 encounter', () => {
  // This is the regression the whole module exists for.
  for (const classKey of Object.keys(HERO_CLASSES)) {
    for (const level of [1, 3, 5, 8, 12, 16, 20, 25]) {
      const hero = heroAtLevel(classKey, level);
      const monster = scaleMonster(TIER1, hero);
      const rounds = estimateRoundsToKill(monster, hero);
      assert.ok(
        rounds >= 3,
        `${classKey} Lv.${level} would kill a tier-1 monster in ${rounds} round(s) ` +
          `(monster hp ${monster.hp}, hero atk ${hero.getTotalStat('atk')})`
      );
    }
  }
});

test('fights stay in a sensible band as the hero levels', () => {
  for (const classKey of Object.keys(HERO_CLASSES)) {
    for (const level of [1, 5, 10, 15, 20, 25]) {
      const hero = heroAtLevel(classKey, level);
      const monster = scaleMonster(TIER1, hero);
      const rounds = estimateRoundsToKill(monster, hero);
      assert.ok(rounds <= 10, `${classKey} Lv.${level}: tier-1 fight lasts ${rounds} rounds, too long`);
    }
  }
});

test('a levelled hero still takes real damage from a tier-1 monster', () => {
  // If only HP scaled and not ATK, levelling would make the hero untouchable.
  for (const level of [1, 5, 10, 20]) {
    const hero = heroAtLevel('warrior', level);
    const monster = scaleMonster(TIER1, hero);
    const incoming = Math.max(4, monster.atk * 2.1 - hero.getTotalStat('def') * 0.75);
    const share = incoming / hero.maxHp;
    assert.ok(
      share > 0.10,
      `at Lv.${level} a tier-1 hit costs only ${(share * 100).toFixed(1)}% of the health pool`
    );
    assert.ok(
      share < 0.45,
      `at Lv.${level} a tier-1 hit costs ${(share * 100).toFixed(1)}% of the health pool, too punishing`
    );
  }
});

test('the hero can survive several hits at every level', () => {
  for (const level of [1, 5, 10, 20]) {
    const hero = heroAtLevel('warrior', level);
    const monster = scaleMonster(TIER1, hero);
    assert.ok(
      estimateRoundsToSurvive(monster, hero) >= 3,
      `at Lv.${level} the hero survives only ${estimateRoundsToSurvive(monster, hero)} hits`
    );
  }
});

test('higher threat tiers stay harder than lower ones for the same hero', () => {
  const hero = heroAtLevel('warrior', 12);
  const easy = scaleMonster(TIER1, hero);
  const deadly = scaleMonster(TIER4, hero);
  assert.ok(deadly.hp > easy.hp, 'tier 4 must have more health than tier 1');
  assert.ok(
    estimateRoundsToKill(deadly, hero) > estimateRoundsToKill(easy, hero),
    'tier 4 must take longer to kill than tier 1'
  );
  assert.equal(judgeThreat(deadly, hero).verdict === 'TRIVIAL', false, 'tier 4 must never read as trivial');
});

test('scaled stats stay finite, positive and readable', () => {
  for (const classKey of Object.keys(HERO_CLASSES)) {
    for (const level of [1, 10, 30, 60]) {
      const hero = heroAtLevel(classKey, level);
      for (const seed of [TIER1, TIER4]) {
        const monster = scaleMonster(seed, hero);
        for (const field of ['hp', 'maxHp', 'mp', 'maxMp', 'atk', 'def', 'mag', 'spd', 'luk']) {
          assert.ok(
            Number.isFinite(monster[field]) && monster[field] >= 0,
            `${classKey} Lv.${level} ${seed.name}: ${field} = ${monster[field]}`
          );
        }
        assert.ok(monster.hp === monster.maxHp);
        assert.ok(monster.hp < 200000, `${seed.name} at Lv.${level} has an unreadable HP total`);
      }
    }
  }
});

test('monster DEF can never grind a fight to the minimum-damage floor', () => {
  for (const level of [1, 10, 20, 40]) {
    const hero = heroAtLevel('warrior', level);
    const monster = scaleMonster(TIER4, hero);
    const rawHeroDamage = hero.getTotalStat('atk') * 2.1;
    const absorbed = monster.def * 0.75;
    assert.ok(
      absorbed <= rawHeroDamage * 0.56,
      `at Lv.${level} the monster absorbs ${((absorbed / rawHeroDamage) * 100).toFixed(0)}% of the hero's attack`
    );
  }
});

test('judgeThreat reports a coherent verdict', () => {
  const weakHero = heroAtLevel('warrior', 1);
  const strongHero = heroAtLevel('warrior', 25);
  const easy = scaleMonster(TIER1, strongHero);
  const hard = scaleMonster(TIER4, weakHero);

  const verdict = judgeThreat(easy, strongHero);
  assert.ok(['TRIVIAL', 'EASY', 'FAIR'].includes(verdict.verdict), `expected an easy read, got ${verdict.verdict}`);
  assert.ok(verdict.roundsToKill >= 1 && verdict.description.length > 0);

  assert.equal(judgeThreat(hard, weakHero).verdict, 'DEADLY', 'a fresh hero walking into tier 4 should be warned');
});

test('tierForNode maps realms to a rising difficulty', () => {
  assert.equal(tierForNode('solaria', 'grass'), 1);
  assert.equal(tierForNode('sunfire', 'desert'), 2);
  assert.equal(tierForNode('frostpeak', 'snow'), 3);
  assert.equal(tierForNode('abyss', 'abyss'), 4);
  assert.equal(tierForNode('celestial', 'celestial'), 5);
  assert.equal(tierForNode('solaria', 'grass', true), 6, 'boss lairs are always the top tier');
});
