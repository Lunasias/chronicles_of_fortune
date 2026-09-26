// The board's scattered floor clutter.
//
// Props are the only art in the game that is never loaded from disk - the renderer paints them
// into a canvas cache at runtime - so there is no committed PNG for a byte-for-byte test to
// protect. These cases assert the properties that matter instead: that every one of the 1800
// type / biome / variant / size / time-of-day combinations paints at the right size, is shaded,
// lit from the left, sits in a cast shadow and lands on its anchor.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROP_BASE_X,
  PROP_BASE_Y,
  PROP_SIZES,
  PROP_SIZE,
  PROP_TYPES,
  PROP_VARIANTS,
  paintProp,
  propSizeBucket
} from '../.test-build/engine/IsometricPropPainter.js';
import { TERRAIN_BIOMES } from '../.test-build/engine/IsometricTerrainPainter.js';

const SOLID_ALPHA = 200;
const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;

const combos = [];
for (const type of PROP_TYPES) {
  for (const biome of TERRAIN_BIOMES) {
    for (let variant = 0; variant < PROP_VARIANTS; variant++) {
      for (let size = 0; size < PROP_SIZES; size++) {
        for (const night of [false, true]) {
          combos.push({ type, biome, variant, size, night });
        }
      }
    }
  }
}

const label = c => `${c.type}/${c.biome}/v${c.variant}/s${c.size}/${c.night ? 'night' : 'day'}`;
const alphaAt = (s, x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? 0 : s.data[(y * s.w + x) * 4 + 3]);

/** Mean luminance of the solid pixels in one half; `wanted` is 'left' or 'right'. */
function halfLuminance(s, wanted) {
  const left = wanted === 'left';
  let sum = 0;
  let count = 0;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const i = (y * s.w + x) * 4;
      if (s.data[i + 3] <= SOLID_ALPHA) continue;
      if (left ? x > PROP_BASE_X : x <= PROP_BASE_X) continue;
      sum += luminance(s.data[i], s.data[i + 1], s.data[i + 2]);
      count++;
    }
  }
  return count ? sum / count : 0;
}

test('every prop combination paints at the sprite size', () => {
  assert.equal(combos.length, 5 * 15 * 4 * 3 * 2);
  for (const c of combos) {
    const s = paintProp(c.type, c);
    assert.equal(s.w, PROP_SIZE, `${label(c)} width`);
    assert.equal(s.h, PROP_SIZE, `${label(c)} height`);
  }
});

test('the generator scale maps onto the baked size buckets', () => {
  // The prop generator picks 0.85 + rand * 0.35, so bucket 0 must cover the bottom of that range
  // and bucket 2 the top, or every prop would come out the same size.
  assert.equal(propSizeBucket(0.85), 0);
  assert.equal(propSizeBucket(0.94), 0);
  assert.equal(propSizeBucket(0.95), 1);
  assert.equal(propSizeBucket(1.09), 1);
  assert.equal(propSizeBucket(1.1), 2);
  assert.equal(propSizeBucket(1.2), 2);
  // Out-of-range and non-finite input must not index off the end of the size table.
  assert.equal(propSizeBucket(0.1), 0);
  assert.equal(propSizeBucket(9), 2);
  assert.equal(propSizeBucket(Number.NaN), 1);
});

test('every prop is shaded, not a flat silhouette', () => {
  for (const c of combos) {
    const s = paintProp(c.type, c);
    const colours = new Set();
    let brightest = 0;
    let darkest = 1;
    for (let i = 0; i < s.w * s.h; i++) {
      if (s.data[i * 4 + 3] <= SOLID_ALPHA) continue;
      colours.add(`${s.data[i * 4]},${s.data[i * 4 + 1]},${s.data[i * 4 + 2]}`);
      const l = luminance(s.data[i * 4], s.data[i * 4 + 1], s.data[i * 4 + 2]);
      if (l > brightest) brightest = l;
      if (l < darkest) darkest = l;
    }
    assert.ok(colours.size >= 4, `${label(c)} uses only ${colours.size} colours`);
    assert.ok(
      brightest - darkest > 0.15,
      `${label(c)} only spans ${(brightest - darkest).toFixed(3)} of tonal range`
    );
  }
});

test('every prop is lit from the left', () => {
  // The vector code this replaced lit the boulders from the right while the tiles under them were
  // lit from the left, so this is the case that would have caught it.
  for (const c of combos) {
    const s = paintProp(c.type, c);
    const left = halfLuminance(s, 'left');
    const right = halfLuminance(s, 'right');
    assert.ok(
      left > right + 0.02,
      `${label(c)}: left half ${left.toFixed(3)} vs right half ${right.toFixed(3)}`
    );
  }
});

test('every prop sits in a cast shadow', () => {
  // A prop with no shadow floats above the tile. The shadow is painted at partial alpha, so it
  // is invisible to every other assertion in this file.
  for (const c of combos) {
    const s = paintProp(c.type, c);
    let shadow = 0;
    for (let i = 0; i < s.w * s.h; i++) {
      const a = s.data[i * 4 + 3];
      if (a > 0 && a <= SOLID_ALPHA) shadow++;
    }
    assert.ok(shadow >= 20, `${label(c)} has only ${shadow} shadow pixels`);
  }
});

test('every prop has substance and fits inside its sprite', () => {
  for (const c of combos) {
    const s = paintProp(c.type, c);
    let opaque = 0;
    let minX = s.w;
    let maxX = -1;
    let minY = s.h;
    let maxY = -1;
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        if (alphaAt(s, x, y) <= SOLID_ALPHA) continue;
        opaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    assert.ok(opaque >= 25, `${label(c)} has only ${opaque} solid pixels`);
    // Clipping would show up as a flat edge on the sprite boundary.
    assert.ok(minX >= 1 && maxX <= s.w - 2, `${label(c)} is clipped horizontally (x ${minX}..${maxX})`);
    assert.ok(minY >= 1 && maxY <= s.h - 2, `${label(c)} is clipped vertically (y ${minY}..${maxY})`);
    // The anchor is where the prop meets the ground. Its lowest pixels must straddle it: a prop
    // that ends well above the anchor floats, and one that reaches far below is drawn into the
    // tile in front. A rounded boulder legitimately bulges a few pixels past its contact point.
    assert.ok(
      maxY <= PROP_BASE_Y + 6 && maxY >= PROP_BASE_Y - 3,
      `${label(c)} base reaches y=${maxY}, which will not seat on the anchor at ${PROP_BASE_Y}`
    );
    assert.ok(
      minX <= PROP_BASE_X && maxX >= PROP_BASE_X,
      `${label(c)} spans x ${minX}..${maxX}, so it is drawn off its ground point`
    );
  }
});

test('the five prop types are distinguishable', () => {
  // A 4x4 coverage grid: a boulder, a tuft, a flower patch, a shrub and a crystal all have to be
  // tellable apart at board scale, where a prop is a handful of pixels.
  const profile = s => {
    let minX = s.w;
    let maxX = -1;
    let minY = s.h;
    let maxY = -1;
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        if (alphaAt(s, x, y) <= SOLID_ALPHA) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const bw = (maxX - minX + 1) / 4;
    const bh = (maxY - minY + 1) / 4;
    const cells = [];
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        let solid = 0;
        let total = 0;
        for (let y = Math.floor(minY + gy * bh); y < Math.ceil(minY + (gy + 1) * bh); y++) {
          for (let x = Math.floor(minX + gx * bw); x < Math.ceil(minX + (gx + 1) * bw); x++) {
            total++;
            if (alphaAt(s, x, y) > SOLID_ALPHA) solid++;
          }
        }
        cells.push(total ? solid / total : 0);
      }
    }
    return cells;
  };

  const profiles = PROP_TYPES.map(type => ({
    type,
    cells: profile(paintProp(type, { biome: 'grass', variant: 0, size: 1 }))
  }));

  const clashes = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      let distance = 0;
      for (let k = 0; k < 16; k++) distance += Math.abs(profiles[i].cells[k] - profiles[j].cells[k]);
      if (distance < 1) clashes.push(`${profiles[i].type} and ${profiles[j].type} look the same (${distance.toFixed(2)})`);
    }
  }
  assert.deepEqual(clashes, []);
});

test('every variant of a type is a different shape', () => {
  for (const type of PROP_TYPES) {
    const seen = new Map();
    for (let variant = 0; variant < PROP_VARIANTS; variant++) {
      // Rocks and shrubs vary in size as well as shape, flowers in colour, grass in height, so
      // compare the whole painted buffer rather than the silhouette.
      const bytes = Buffer.from(paintProp(type, { biome: 'grass', variant, size: 1 }).data.buffer).toString('base64');
      if (seen.has(bytes)) {
        assert.fail(`${type} variant ${variant} is identical to variant ${seen.get(bytes)}`);
      }
      seen.set(bytes, variant);
    }
  }
});

test('a biome changes how its clutter looks, and night dims it', () => {
  for (const type of PROP_TYPES) {
    // Props take their colours from the biome's floor palette, so this also proves the derived
    // palette is actually wired up rather than falling back to one hard-coded set.
    const signatures = new Set();
    for (const biome of TERRAIN_BIOMES) {
      const s = paintProp(type, { biome, variant: 0, size: 1 });
      signatures.add(Buffer.from(s.data.buffer).toString('base64'));
    }
    assert.ok(
      signatures.size >= TERRAIN_BIOMES.length - 1,
      `${type} only produces ${signatures.size} distinct sprites across ${TERRAIN_BIOMES.length} biomes`
    );

    for (const biome of TERRAIN_BIOMES) {
      const day = Buffer.from(paintProp(type, { biome, variant: 0, size: 1 }).data.buffer);
      const night = Buffer.from(paintProp(type, { biome, variant: 0, size: 1, night: true }).data.buffer);
      assert.ok(!day.equals(night), `${type} on ${biome} looks identical day and night`);
    }
  }
});

test('the crystal shimmers and the matte props ignore the pulse', () => {
  // The shimmer is four baked frames rather than a fade, so that it stays hard-edged. A matte
  // prop must not produce four identical cached frames for nothing.
  const frames = new Set();
  for (let pulse = 0; pulse < 4; pulse++) {
    const s = paintProp('crystal', { biome: 'crystal_cavern', variant: 0, size: 1, pulse });
    frames.add(Buffer.from(s.data.buffer).toString('base64'));
  }
  assert.equal(frames.size, 4, 'the crystal must have four distinct shimmer frames');

  for (const type of ['rock', 'grass', 'flower', 'shrub']) {
    const a = Buffer.from(paintProp(type, { biome: 'grass', variant: 0, size: 1, pulse: 0 }).data.buffer);
    const b = Buffer.from(paintProp(type, { biome: 'grass', variant: 0, size: 1, pulse: 3 }).data.buffer);
    assert.ok(a.equals(b), `${type} must not react to the crystal pulse`);
  }
});

test('an unknown biome falls back instead of throwing', () => {
  for (const type of PROP_TYPES) {
    const s = paintProp(type, { biome: 'not_a_biome', variant: 0, size: 1 });
    assert.equal(s.w, PROP_SIZE);
    const grass = paintProp(type, { biome: 'grass', variant: 0, size: 1 });
    assert.ok(
      Buffer.from(s.data.buffer).equals(Buffer.from(grass.data.buffer)),
      `${type} with an unknown biome should paint as grassland`
    );
  }
});
