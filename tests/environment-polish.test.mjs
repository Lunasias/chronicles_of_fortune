import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawPixelRidge, drawDungeonRoom, drawGroundClusters, drawRegionalProps } from '../.test-build/engine/EnvironmentArt.js';
import { drawPromotionSilhouette } from '../.test-build/engine/PromotionSilhouette.js';
import { JOB_VISUALS } from '../.test-build/engine/JobVisuals.js';
import { dungeonSceneGroup } from '../.test-build/game/DungeonLocations.js';

function recordingContext() {
  const marks = [];
  const ctx = { fillStyle: '', globalAlpha: 1, fillRect(...rect) {
    assert.ok(rect.every(Number.isInteger), `fractional scenery pixel: ${rect}`);
    assert.ok(rect[2] >= 0 && rect[3] >= 0);
    marks.push([this.fillStyle, ...rect]);
  } };
  return { ctx, marks };
}

test('environment layers use integer pixel clusters at phone and desktop dimensions', () => {
  for (const [w, h] of [[390, 550], [1280, 540], [1920, 770]]) {
    const { ctx, marks } = recordingContext();
    drawPixelRidge(ctx, w, h, '#456789', 13);
    for (const biome of ['snow', 'volcano', 'abyss']) drawDungeonRoom(ctx, w, h, biome);
    drawGroundClusters(ctx, w, h, Math.round(h * .4), '#456789', '#345678');
    for (const biome of ['castle', 'steampunk', 'snow', 'desert', 'forest']) drawRegionalProps(ctx, w, 220, biome);
    assert.ok(marks.length > 100);
    assert.equal(ctx.globalAlpha, 1);
  }
});

test('every promotion tier gains an actual outer silhouette, rather than just recoloring', () => {
  for (const job of Object.keys(JOB_VISUALS)) {
    const { ctx, marks } = recordingContext();
    drawPromotionSilhouette(ctx, 72, 72, job, false);
    assert.ok(marks.length >= 4, job);
    const extent = Math.max(...marks.map(m => m[1] + m[3])) - Math.min(...marks.map(m => m[1]));
    assert.ok(extent >= 30, job);
    if (JOB_VISUALS[job].tier === 3) {
      const base = Object.keys(JOB_VISUALS).find(k => JOB_VISUALS[k].style === JOB_VISUALS[job].style && JOB_VISUALS[k].tier === 2);
      const other = recordingContext();
      drawPromotionSilhouette(other.ctx, 72, 72, base, false);
      assert.notDeepEqual(marks.map(m => m.slice(1)), other.marks.map(m => m.slice(1)), job);
    }
  }
});

test('dungeon scene boundaries isolate each route and leave the surface separate', () => {
  for (const start of [1000, 1100, 1200]) {
    for (let i = 0; i < 36; i++) assert.equal(dungeonSceneGroup(start + i), start);
    assert.equal(dungeonSceneGroup(start + 36), 0);
  }
  for (const id of [0, 18, 311, 999]) assert.equal(dungeonSceneGroup(id), 0);
});
