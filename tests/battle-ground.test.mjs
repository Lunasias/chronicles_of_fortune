import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { battleGroundLayout } from '../.test-build/engine/BattleScenery.js';

test('battle contact points stay inside the shared floor on phones and desktop', () => {
  for (const [w, h] of [[390, 550], [1280, 540], [1920, 770]]) {
    const ground = battleGroundLayout(w, h);
    for (const v of Object.values(ground)) assert.equal(Number.isInteger(v), true);
    assert.ok(ground.playerX > 28 && ground.enemyX < w - 28);
    assert.ok(ground.enemyY > h * .42 && ground.playerY < h - 24);
    assert.ok(ground.playerY > ground.enemyY);
    assert.equal(ground.playerX + ground.enemyX, Math.round(w / 2) * 2);
  }
});
