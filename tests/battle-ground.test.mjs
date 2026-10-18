import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { battleGroundLayout, drawBattleScenery } from '../.test-build/engine/BattleScenery.js';
import { backdropCover, generatedBackdrops } from '../.test-build/engine/GeneratedBackdrops.js';

test('battle contact points stay on the authored foreground on phones and desktop', () => {
  for (const [w, h] of [[390, 550], [1280, 540], [1920, 770], [2560, 600]]) {
    const ground = battleGroundLayout(w, h);
    for (const v of Object.values(ground)) assert.equal(Number.isInteger(v), true);
    assert.ok(ground.playerX > 28 && ground.enemyX < w - 28);
    assert.ok(ground.enemyY >= h * .70 && ground.playerY < h - 24);
    assert.ok(ground.playerY > ground.enemyY);
    assert.equal(ground.playerX + ground.enemyX, Math.round(w / 2) * 2);
  }
});

test('battle framing keeps the full foreground at every aspect ratio without stretching', () => {
  for (const [w,h] of [[390,550], [1280,540], [1920,770], [2560,600]]) {
    const crop = backdropCover(1536,1024,w,h,1);
    assert.ok(Math.abs(crop.sy + crop.sh - 1024) <= 1, 'bottom of authored scene stays visible');
    assert.ok(Math.abs(crop.sw / crop.sh - w / h) < .02);
    const ground = battleGroundLayout(w,h);
    // Every backdrop reserves the lower quarter for a walkable foreground.
    const groundTop = Math.max(0, (.75 * 1024 - crop.sy) / crop.sh * h);
    assert.ok(ground.enemyY > groundTop && ground.playerY > groundTop);
  }
});

test('battle uses the authored scene without board-floor or miniature-prop overlays', () => {
  const original = generatedBackdrops.draw;
  const calls = [];
  generatedBackdrops.draw = (...args) => calls.push(args);
  const ctx = new Proxy({}, { get: (_,name) => { throw new Error('Unexpected scenery overlay: ' + String(name)); } });
  try {
    drawBattleScenery(ctx,1280,540,'castle',0,'DAY',false,true);
    drawBattleScenery(ctx,1280,540,'snow',0,'NIGHT',false,false,1206);
    assert.equal(calls.length,2);
    assert.equal(calls[0][3],'castle');
    assert.equal(calls[1][3],'dungeon_ice');
    assert.equal(calls[0][5],1);
    assert.equal(calls[1][5],1);
  } finally { generatedBackdrops.draw = original; }
});
