import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../.test-build/game/Player.js';
import { scaleMonster, estimateRoundsToKill, estimateRoundsToSurvive, judgeThreat, tierForNode } from '../.test-build/game/BalanceSystem.js';
const seed = { name: 'Goblin', tier: 1, baseHp: 67, baseAtk: 14, baseDef: 9, baseMag: 9, baseSpd: 8 };
const hero = () => new Player(1, 'Tester', 'warrior', false, 0);

test('regional monsters do not grow in response to equipment, HP or level', () => {
  const p = hero(); const before = scaleMonster(seed, p);
  p.level = 30; p.atk += 90; p.def += 70; p.mag += 80; p.maxHp += 800;
  assert.deepEqual(scaleMonster(seed, p), before);
});
test('returning to an early region rewards character progression', () => {
  const p = hero(); const monster = scaleMonster(seed, p);
  const initial = estimateRoundsToKill(monster, p);
  p.atk += 100; p.mag += 100;
  assert.ok(estimateRoundsToKill(monster, p) < initial);
  assert.equal(estimateRoundsToKill(monster, p), 1);
});
test('armor and maximum health upgrades improve survivability without compensation', () => {
  const p = hero(); const monster = scaleMonster(seed, p);
  const initial = estimateRoundsToSurvive(monster, p);
  p.def += 50; p.maxHp += 100; p.hp = p.maxHp;
  assert.ok(estimateRoundsToSurvive(monster, p) > initial);
  assert.equal(scaleMonster(seed, p).atk, monster.atk);
});
test('scouting survival uses current wounds rather than maximum health', () => {
  const p = hero(); const monster = scaleMonster(seed, p);
  const full = estimateRoundsToSurvive(monster, p); p.hp = 1;
  assert.ok(estimateRoundsToSurvive(monster, p) < full);
  assert.equal(estimateRoundsToSurvive(monster, p), 0);
});
test('scouting does not assume an unlimited supply of free magic', () => {
  const p = hero(); p.mag = 80; p.mp = 30;
  const monster = scaleMonster({ name: 'Golem', baseHp: 200, baseDef: 20, baseMag: 5 });
  const charged = estimateRoundsToKill(monster, p); p.mp = 0;
  assert.ok(estimateRoundsToKill(monster, p) > charged);
});
test('higher regional tiers remain dangerous for an unprepared traveler', () => {
  const p = hero();
  const easy = scaleMonster(seed, p); const hard = scaleMonster({ name: 'Abyss guardian', tier: 4 }, p);
  assert.ok(hard.hp > easy.hp); assert.ok(hard.atk > easy.atk);
  assert.equal(judgeThreat(hard, p).verdict, 'DEADLY');
});
test('authored stats and all regional tier mappings remain explicit', () => {
  assert.equal(scaleMonster(seed).hp, 67);
  assert.equal(tierForNode('solaria', 'grass'), 1);
  assert.equal(tierForNode('sunfire', 'desert'), 2);
  assert.equal(tierForNode('frostpeak', 'snow'), 3);
  assert.equal(tierForNode('abyss', 'abyss'), 4);
  assert.equal(tierForNode('celestial', 'celestial'), 5);
  assert.equal(tierForNode('solaria', 'grass', true), 6);
});
