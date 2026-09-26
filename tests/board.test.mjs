// Board data integrity tests.
//
// DOKAPON_NODES is hand-maintained (and rewritten by scripts/fix_board_connections.cjs and
// scripts/rebalance_town_monsters.cjs), so these tests lock in the invariants that a
// generated map silently violated before: two pairs of nodes shared a grid position, five
// nodes carried orphaned town data whose type did not match, and the graph had to be
// repaired by hand. None of those are visible to the type checker.
//
// The module under test is compiled by `npm run pretest` (tsconfig.test.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DOKAPON_NODES } from '../.test-build/game/BoardMap.js';

const nodes = DOKAPON_NODES;
const byId = new Map(nodes.map(n => [n.id, n]));
const positionKey = n => `${n.gx},${n.gy},${n.gz}`;

/** Longest road link the board generator treats as a valid edge. */
const MAX_ROAD_DISTANCE = 5.5;

test('exports a non-empty node array', () => {
  assert.ok(Array.isArray(nodes), 'DOKAPON_NODES must be an array');
  assert.ok(nodes.length > 0, 'DOKAPON_NODES must not be empty');
});

test('node ids are unique and form a contiguous 0..N-1 range', () => {
  const ids = nodes.map(n => n.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate node ids');

  for (const id of ids) {
    assert.ok(Number.isInteger(id) && id >= 0, `node id ${id} must be a non-negative integer`);
  }

  const missing = [];
  for (let i = 0; i < nodes.length; i++) {
    if (!byId.has(i)) missing.push(i);
  }
  assert.deepEqual(missing, [], `ids must be contiguous from 0; missing ${missing.join(', ')}`);
});

test('no two nodes occupy the same grid position', () => {
  const seen = new Map();
  const collisions = [];
  for (const n of nodes) {
    const key = positionKey(n);
    if (seen.has(key)) collisions.push(`${key} used by #${seen.get(key)} and #${n.id}`);
    else seen.set(key, n.id);
  }
  assert.deepEqual(collisions, [], 'two nodes sharing a tile make one of them unclickable');
});

test('every node has a finite grid position', () => {
  for (const n of nodes) {
    for (const axis of ['gx', 'gy', 'gz']) {
      assert.ok(Number.isFinite(n[axis]), `#${n.id} has a non-finite ${axis}`);
    }
  }
});

test('neighbour links are symmetric', () => {
  const broken = [];
  for (const n of nodes) {
    for (const nb of n.neighbors) {
      const other = byId.get(nb);
      if (other && !other.neighbors.includes(n.id)) broken.push(`#${n.id} -> #${nb} is one-way`);
    }
  }
  assert.deepEqual(broken, [], 'asymmetric road links break pathfinding');
});

test('neighbour links never dangle outside the map', () => {
  const dangling = [];
  for (const n of nodes) {
    for (const nb of n.neighbors) {
      if (!byId.has(nb)) dangling.push(`#${n.id} -> #${nb}`);
    }
  }
  assert.deepEqual(dangling, [], 'dangling neighbour references');
});

test('no node links to itself or repeats a neighbour', () => {
  const bad = [];
  for (const n of nodes) {
    if (n.neighbors.includes(n.id)) bad.push(`#${n.id} links to itself`);
    if (new Set(n.neighbors).size !== n.neighbors.length) bad.push(`#${n.id} repeats a neighbour`);
  }
  assert.deepEqual(bad, []);
});

test('every road edge spans a sane distance', () => {
  const tooLong = [];
  for (const n of nodes) {
    for (const nb of n.neighbors) {
      const other = byId.get(nb);
      if (!other) continue;
      const dist = Math.hypot(other.gx - n.gx, other.gy - n.gy);
      if (dist > MAX_ROAD_DISTANCE) {
        tooLong.push(`#${n.id} -> #${nb} = ${dist.toFixed(2)} (max ${MAX_ROAD_DISTANCE})`);
      }
    }
  }
  assert.deepEqual(tooLong, [], 'over-long edges are dropped by scripts/fix_board_connections.cjs');
});

test('the whole board is reachable from node 0', () => {
  const start = nodes[0].id;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    for (const nb of byId.get(current).neighbors) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  const unreachable = nodes.map(n => n.id).filter(id => !seen.has(id));
  assert.deepEqual(unreachable, [], 'unreachable nodes strand the player');
});

test('no node is isolated', () => {
  const isolated = nodes.filter(n => n.neighbors.length === 0).map(n => n.id);
  assert.deepEqual(isolated, [], 'isolated nodes can never be stepped on');
});

test('townData is present exactly when the node type is town', () => {
  const withData = nodes.filter(n => n.townData).map(n => n.id);
  const typedTown = nodes.filter(n => n.type === 'town').map(n => n.id).sort((a, b) => a - b);

  assert.deepEqual(
    withData.slice().sort((a, b) => a - b),
    typedTown,
    'town logic keys off `type`, while save/net-worth/tax code keys off `townData`; ' +
      'if the two sets differ, town totals disagree between systems and the extra data is unreachable'
  );
});

test('every occupied town has complete and consistent monster stats', () => {
  const problems = [];
  for (const n of nodes.filter(n => n.townData)) {
    const t = n.townData;
    if (!t.isOccupiedByMonster) continue;

    if (typeof t.monsterName !== 'string' || t.monsterName.length === 0) {
      problems.push(`#${n.id} has no monsterName`);
    }
    for (const field of ['monsterHp', 'monsterMaxHp', 'monsterAtk', 'monsterDef']) {
      if (!Number.isFinite(t[field]) || t[field] <= 0) {
        problems.push(`#${n.id} has an invalid ${field} (${t[field]})`);
      }
    }
    if (t.monsterMaxHp !== t.monsterHp) {
      problems.push(`#${n.id} starts damaged: hp ${t.monsterHp} / max ${t.monsterMaxHp}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every town starts unowned and monster-occupied', () => {
  const problems = [];
  for (const n of nodes.filter(n => n.townData)) {
    if (n.townData.ownerId !== null) problems.push(`#${n.id} starts owned by ${n.townData.ownerId}`);
    if (n.townData.isOccupiedByMonster !== true) problems.push(`#${n.id} starts already liberated`);
    if (!Number.isFinite(n.townData.baseValue) || n.townData.baseValue <= 0) {
      problems.push(`#${n.id} has an invalid baseValue`);
    }
    if (!Number.isFinite(n.townData.taxYield) || n.townData.taxYield <= 0) {
      problems.push(`#${n.id} has an invalid taxYield`);
    }
  }
  assert.deepEqual(problems, []);
});

test('pre-built home plots are vacant land', () => {
  // BoardMap ships a few 'home' nodes whose ownerId 0 is the "vacant, for sale" sentinel.
  // HomeUI relies on that sentinel to offer the plot for purchase.
  const problems = [];
  for (const n of nodes.filter(n => n.type === 'home')) {
    if (!n.homeData) {
      problems.push(`#${n.id} is type 'home' but has no homeData`);
      continue;
    }
    if (n.homeData.ownerId) problems.push(`#${n.id} starts owned by ${n.homeData.ownerId}`);
  }
  assert.deepEqual(problems, []);
});

test('type, biome and realm values are all declared in their unions', () => {
  const source = readFileSync(new URL('../src/game/BoardMap.ts', import.meta.url), 'utf8');

  const unionMembers = name => {
    const match = source.match(new RegExp(`export type ${name}\\s*=([\\s\\S]*?);`));
    assert.ok(match, `could not find export type ${name}`);
    return new Set([...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
  };

  const declaredTypes = unionMembers('SpaceType');
  const declaredBiomes = unionMembers('BiomeType');
  const declaredRealms = unionMembers('RealmId');

  const undeclared = (field, declared) =>
    [...new Set(nodes.map(n => n[field]))].filter(v => !declared.has(v)).map(v => `${field}=${v}`);

  assert.deepEqual(
    [
      ...undeclared('type', declaredTypes),
      ...undeclared('biome', declaredBiomes),
      ...undeclared('realmId', declaredRealms)
    ],
    []
  );

  // ...and every declared value is actually used, so the unions cannot drift out of date.
  const usedTypes = new Set(nodes.map(n => n.type));
  const usedBiomes = new Set(nodes.map(n => n.biome));
  assert.deepEqual([...declaredTypes].filter(v => !usedTypes.has(v)), [], 'unused SpaceType members');
  assert.deepEqual([...declaredBiomes].filter(v => !usedBiomes.has(v)), [], 'unused BiomeType members');
});

test('every node carries the fields the renderer reads', () => {
  const required = ['name', 'realmId', 'realmName', 'subRegionName', 'weather'];
  const problems = [];
  for (const n of nodes) {
    for (const field of required) {
      const value = n[field];
      if (typeof value !== 'string' || value.length === 0) {
        problems.push(`#${n.id} is missing ${field}`);
      }
    }
    if (typeof n.isGrandBridge !== 'boolean' && n.isGrandBridge !== undefined) {
      problems.push(`#${n.id} has a non-boolean isGrandBridge`);
    }
  }
  assert.deepEqual(problems, []);
});
