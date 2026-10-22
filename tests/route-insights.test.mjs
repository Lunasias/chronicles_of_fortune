import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteInsight, cycleRouteDestination, filterRouteDestinations, recommendRouteDestination, routeCombatAdvice } from '../.test-build/ui/RouteInsights.js';

const hero = { name: 'Hero', hp: 150, maxHp: 150, mp: 30, maxMp: 30, atk: 18, def: 16, mag: 20, spd: 10, luk: 5 };
const monster = { name: 'Monster', hp: 100, maxHp: 100, mp: 20, maxMp: 20, atk: 12, def: 10, mag: 12, spd: 8, luk: 4 };
const node = (id, type = 'empty', extra = {}) => ({ id, type, name: `Destination ${id}`, biome: 'grass', realmId: 'solaria', gx: id, gy: 0, gz: 0, neighbors: [], ...extra });
const preview = (chance = 0, enemy) => ({ encounterChancePercent: chance, threatLevel: chance ? 'MEDIUM' : 'SAFE', threatColor: '#fff', threatDescription: '', typeLabel: '', roster: enemy ? [enemy] : [], featuredMonster: enemy });
const insight = (destination, index, chance = 0, extra = {}) => buildRouteInsight(destination, preview(chance, chance ? monster : undefined), hero, { playerId: 1, originalIndex: index, steps: 4, ...extra });

test('service filters never mark a rival-occupied stop as free of battles', () => {
  const calm = insight(node(7, 'church'), 0);
  const duel = insight(node(9, 'church'), 1, 0, { rivalName: 'Rival', rival: monster });
  assert.deepEqual(filterRouteDestinations([calm, duel], 'safe').map(stop => stop.id), [7]);
  assert.deepEqual(filterRouteDestinations([calm, duel], 'services').map(stop => stop.id), [7, 9]);
  assert.equal(duel.encounterChance, 100);
  assert.ok(duel.categories.includes('challenge'));
  assert.notEqual(duel.advice.risk, 'none');
});

test('occupied towns and exhausted treasure have distinct useful route categories', () => {
  const occupied = insight(node(12, 'town', { townData: { isOccupiedByMonster: true, ownerId: null } }), 0, 100);
  const treasure = insight(node(18, 'mystery_chest'), 1);
  const opened = insight(node(19, 'mystery_chest'), 2, 0, { treasureClaimed: true });
  assert.ok(occupied.categories.includes('towns') && occupied.categories.includes('challenge'));
  assert.match(occupied.benefit, /ปลดปล่อย/);
  assert.deepEqual(filterRouteDestinations([occupied, treasure, opened], 'treasure').map(stop => stop.id), [18]);
  assert.match(opened.benefit, /ถูกเก็บแล้ว/);
});

test('sorting and filtered cycling keep exact node identities and leave the original board order intact', () => {
  const stops = [insight(node(80), 0, 25), insight(node(5, 'church'), 1), insight(node(206, 'blue'), 2)];
  const order = stops.map(stop => stop.id);
  const sorted = filterRouteDestinations(stops, 'all', 'risk');
  assert.deepEqual(sorted.map(stop => stop.id), [5, 206, 80]);
  assert.deepEqual(stops.map(stop => stop.id), order);
  assert.equal(sorted.find(stop => stop.id === 80).originalIndex, 0);
  const services = filterRouteDestinations(stops, 'services');
  assert.equal(cycleRouteDestination(services, 80, 1), 5);
  assert.equal(cycleRouteDestination(services, 5, -1), 5);
  assert.equal(cycleRouteDestination([], 80, 1), null);
  assert.equal(cycleRouteDestination(sorted, 80, 1), 5);
  assert.equal(cycleRouteDestination(sorted, null, -1), 80);
});

test('combat advice accounts for finite MP, silence and enemy magic rather than ATK alone', () => {
  const caster = { ...hero, atk: 4, mag: 50, mp: 10 };
  const tank = { ...monster, hp: 400, maxHp: 400, mag: 2 };
  const finite = routeCombatAdvice(caster, tank, 100);
  const unlimited = routeCombatAdvice({ ...caster, mp: 1000 }, tank, 100);
  const silenced = routeCombatAdvice({ ...caster, silenceTurns: 1 }, tank, 100);
  const empty = routeCombatAdvice({ ...caster, mp: 0 }, tank, 100);
  assert.ok(finite.actionsToDefeat > unlimited.actionsToDefeat);
  assert.equal(silenced.actionsToDefeat, empty.actionsToDefeat);
  const mage = { ...monster, atk: 1, mag: 80, mp: 30 };
  const magical = routeCombatAdvice(hero, mage, 100);
  const dry = routeCombatAdvice(hero, { ...mage, mp: 0 }, 100);
  assert.ok(magical.incomingDamage > dry.incomingDamage);
  assert.equal(magical.risk, 'danger');
  assert.match(magical.description, /หนึ่งครั้ง/);
});

test('advice does not fabricate a safe verdict when encounter data is unavailable', () => {
  assert.equal(routeCombatAdvice(hero, undefined, 35).risk, 'caution');
  assert.equal(routeCombatAdvice(hero, monster, 0).risk, 'none');
  const before = structuredClone({ hero, monster });
  routeCombatAdvice(hero, monster, 100);
  assert.deepEqual({ hero, monster }, before);
});

test('low HP prioritizes a reachable recovery service over treasure and never recommends a rival stop', () => {
  const treasure = insight(node(2, 'blue'), 0);
  const rest = insight(node(3, 'tavern'), 1);
  const rival = insight(node(4, 'church'), 2, 0, { rivalName: 'Rival', rival: monster });
  assert.equal(recommendRouteDestination([treasure, rival, rest], 20, 100).id, 3);
  assert.equal(recommendRouteDestination([treasure, rest], 100, 100).id, 2);
  assert.equal(recommendRouteDestination([rival], 20, 100), null);
});
