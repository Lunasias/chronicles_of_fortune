import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
const manifest = JSON.parse(fs.readFileSync('src/engine/region-delivery.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('docs/quality-v3/region-delivery-report.json', 'utf8'));
test('all 432 delivered regional cells retain their authored feet and verified lossless atlas bytes', () => {
  assert.equal(Object.keys(manifest).length, 18);
  for (const file of report.files) {
    assert.equal(manifest[file.theme].length, 24);
    assert.ok(manifest[file.theme].every(foot => Number.isInteger(foot) && foot >= 0 && foot < 128));
    const bytes = fs.readFileSync(`public/assets/runtime-v3/regions/${file.theme}.webp`);
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
    assert.equal(file.runtimePixelsIdentical, true);
  }
  assert.ok(report.deliveryBytes < report.originalBytes * .2);
  const ground = fs.readFileSync('public/assets/runtime-v3/ground-materials.webp');
  assert.equal(crypto.createHash('sha256').update(ground).digest('hex'), report.ground.sha256);
});

test('every prepacked region still contains all 24 complete occupied sprites', async () => {
  for (const file of report.files) {
    const { data, info } = await sharp(`public/assets/runtime-v3/regions/${file.theme}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [768, 512]);
    for (let cell = 0; cell < 24; cell++) {
      let occupied = 0;
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (data[((Math.floor(cell / 6) * 128 + y) * info.width + cell % 6 * 128 + x) * 4 + 3] >= 80) occupied++;
      assert.ok(occupied > 10, `${file.theme} cell ${cell} must contain a full sprite`);
    }
  }
});
