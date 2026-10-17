import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { battleGroundLayout, battleDressingLayout } from '../.test-build/engine/BattleScenery.js';

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


test('dense battle dressing preserves fighter silhouettes across viewport sizes', () => {
  for (const [w, h] of [[390,550], [1280,540], [1920,770]]) {
    const ground = battleGroundLayout(w,h), props = battleDressingLayout(w,h);
    assert.ok(props.length >= 14, 'arena has layered scenery');
    assert.deepEqual(props, battleDressingLayout(w,h), 'scenery does not flicker between frames');
    const horizon = ground.floorY - (Math.max(4, Math.round(h * .22 / 24)) + 2) * 24 + 12;
    assert.ok(props.every(p => p.y >= horizon + 12), 'rear scenery feet sit on the floor, never in the sky');
    for (const p of props) for (const [x,y] of [[ground.playerX,ground.playerY],[ground.enemyX,ground.enemyY]]) {
      const size = 96*p.scale;
      assert.ok(p.x+size/2<x-76 || p.x-size/2>x+76 || p.y<y-160 || p.y-size>y+26, 'full sprite avoids the fighter');
    }
  }
});
