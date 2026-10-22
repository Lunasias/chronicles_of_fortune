import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { IsometricRenderer } from '../.test-build/engine/IsometricRenderer.js';
import { isometricTerrainRenderer } from '../.test-build/engine/IsometricTerrainRenderer.js';
import { DOKAPON_NODES } from '../.test-build/game/BoardMap.js';

test('roads reuse prepared winding geometry during camera redraw and rebuild after a board replacement', t => {
  const calls = [], ctx = { fillRect(...args) { calls.push(args); } };
  const renderer = new IsometricRenderer({ width: 1280, height: 720, getContext: () => ctx });
  const nodes = DOKAPON_NODES.slice(0, 2).map((node, index) => ({ ...node, neighbors: [DOKAPON_NODES[1 - index].id] }));
  renderer.initBoardCache(nodes);
  const segment = renderer.roadwaySegments[0];
  assert.ok(segment.points.length > 4);
  assert.deepEqual([...segment.points.slice(0, 2)], [segment.x1, segment.y1]);
  assert.deepEqual([...segment.points.slice(-2)], [segment.x2, segment.y2]);
  const savedPattern = isometricTerrainRenderer.roadPattern, savedSin = Math.sin;
  isometricTerrainRenderer.roadPattern = () => null;
  Math.sin = () => { throw new Error('road geometry must be prepared before frame drawing'); };
  t.after(() => { isometricTerrainRenderer.roadPattern = savedPattern; Math.sin = savedSin; });
  renderer.renderIsometricRoads(ctx, -100000, 100000, -100000, 100000);
  const first = calls.slice(); calls.length = 0;
  renderer.renderIsometricRoads(ctx, -100000, 100000, -100000, 100000);
  assert.deepEqual(calls, first); calls.length = 0;
  renderer.renderIsometricRoads(ctx, 90000, 100000, 90000, 100000); assert.equal(calls.length, 0);
  Math.sin = savedSin;
  renderer.initBoardCache(nodes.map(node => ({ ...node, gx: node.gx + 5 })));
  assert.notEqual(renderer.roadwaySegments[0].points[0], segment.points[0]);
});
