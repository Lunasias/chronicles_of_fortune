import test from 'node:test';
import assert from 'node:assert/strict';
import png from '../scripts/lib/png.cjs';
import { regionalSpriteFit, splitRegionalAtlas } from '../.test-build/engine/RegionalSpriteExtraction.js';

test('regional extraction recovers branches crossing grid lines without stealing the neighboring object', () => {
  const width = 20, height = 20, data = new Uint8ClampedArray(width * height * 4);
  const paint = (left, top, w, h, red) => {
    for (let y = top; y < top + h; y++) for (let x = left; x < left + w; x++) {
      const i = (y * width + x) * 4; data[i] = red; data[i + 3] = 255;
    }
  };
  paint(3, 2, 7, 5, 120); paint(9, 3, 3, 2, 120); // canopy crosses into column two
  paint(6, 6, 2, 6, 120); // root crosses into row two
  paint(15, 3, 3, 5, 220); // neighboring sprite remains separate
  const sprites = splitRegionalAtlas(data, width, height, 2, 2);
  const reds = sprite => Array.from(sprite.pixels).filter((_, i) => i % 4 === 0);
  assert.equal(sprites[0].pixels.filter((_, i) => i % 4 === 3 && sprites[0].pixels[i] === 255).length, 49);
  assert.ok(reds(sprites[0]).includes(120)); assert.ok(!reds(sprites[0]).includes(220));
  assert.ok(reds(sprites[1]).includes(220)); assert.ok(!reds(sprites[1]).includes(120));
});

test('the production meadow oak retains canopy pixels beyond its old 256px cell', () => {
  const source = png.decodePNG('public/assets/art-v2/world-rebuild-v1/grass.png');
  const oak = splitRegionalAtlas(new Uint8ClampedArray(source.pixels), source.width, source.height)[0];
  assert.ok(oak.width > 256, 'full crown must span more than one nominal atlas cell');
  let solid = 0;
  for (let i = 3; i < oak.pixels.length; i += 4) if (oak.pixels[i] >= 100) solid++;
  assert.ok(solid > 40000, 'retain the complete connected crown and roots');
});

test('regional sprite fitting preserves proportions, a root anchor, and room around every edge', () => {
  for (const [width, height] of [[300, 240], [120, 320], [256, 256]]) {
    const fit = regionalSpriteFit(width, height);
    assert.ok(fit.x >= 4 && fit.y >= 4);
    assert.ok(fit.x + fit.width <= 124 && fit.y + fit.height <= 124);
    assert.ok(Math.abs(fit.width / fit.height - width / height) < .02);
    assert.equal(fit.footY, 123);
  }
  assert.equal(regionalSpriteFit(100, 60, 128, 4, .5).width, 50, 'small undergrowth must retain its native size');
});
