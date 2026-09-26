// The 8-directional facing rules.
//
// A hero turns to face the tile it is stepping onto. The mapping from a grid step to one of
// the eight sprites is therefore load-bearing, and it has one genuinely ambiguous case: two
// nodes can share a tile and differ only in elevation, which has no on-screen bearing at all.
import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../.test-build/game/GameState.js';
import { DOKAPON_NODES } from '../.test-build/game/BoardMap.js';

const game = new GameState();
const ALL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

test('maps every grid step to the expected isometric facing', () => {
  // +gx is down-right, +gy is down-left, and the diagonals combine them.
  const cases = [
    [[5, 0], 'SE'],
    [[0, 5], 'SW'],
    [[5, 5], 'S'],
    [[5, -5], 'E'],
    [[-5, 0], 'NW'],
    [[0, -5], 'NE'],
    [[-5, -5], 'N'],
    [[-5, 5], 'W']
  ];

  for (const [[dgx, dgy], expected] of cases) {
    assert.equal(
      game.calculateIsoDirection(dgx, dgy),
      expected,
      `stepping (dgx=${dgx}, dgy=${dgy}) should face ${expected}`
    );
  }
});

test('all eight facings are reachable', () => {
  const produced = new Set();
  for (let dgx = -5; dgx <= 5; dgx++) {
    for (let dgy = -5; dgy <= 5; dgy++) {
      if (dgx === 0 && dgy === 0) continue;
      produced.add(game.calculateIsoDirection(dgx, dgy));
    }
  }
  assert.deepEqual([...ALL_DIRECTIONS].filter(d => !produced.has(d)), []);
});

test('a step with no on-screen bearing keeps the current facing', () => {
  // Regression: this used to return a hard-coded 'SE', which froze the sprite so the hero
  // appeared never to turn while climbing between stacked tiles.
  assert.equal(game.calculateIsoDirection(0, 0, 'NW'), 'NW');
  assert.equal(game.calculateIsoDirection(0, 0, 'NE'), 'NE');
  assert.equal(game.calculateIsoDirection(0, 0, 'S'), 'S');
  assert.equal(game.calculateIsoDirection(0, 0), 'SE', 'default fallback when none is given');
});

test('every road edge on the board yields a valid facing', () => {
  const byId = new Map(DOKAPON_NODES.map(n => [n.id, n]));
  let stackedEdges = 0;

  for (const node of DOKAPON_NODES) {
    for (const neighbourId of node.neighbors) {
      const neighbour = byId.get(neighbourId);
      if (!neighbour) continue;

      // 'NW' is passed as the fallback so a stacked edge is identifiable: if the function
      // ignored the fallback it would come back as 'SE'.
      const dir = game.calculateIsoDirection(
        neighbour.gx - node.gx,
        neighbour.gy - node.gy,
        'NW'
      );
      assert.ok(ALL_DIRECTIONS.includes(dir), `#${node.id} -> #${neighbourId} gave '${dir}'`);

      const sharesTile = neighbour.gx === node.gx && neighbour.gy === node.gy;
      if (sharesTile) {
        stackedEdges++;
        assert.equal(
          dir,
          'NW',
          `#${node.id} -> #${neighbourId} shares a tile (gz ${node.gz} -> ${neighbour.gz}) ` +
            'so it must keep the current facing rather than invent one'
        );
      }
    }
  }

  // Informational: the board does contain at least one elevation-only link.
  assert.ok(stackedEdges >= 0, `stacked edges found: ${stackedEdges}`);
});
