// The board floor tiles.
//
// The ground used to be the one part of the game drawn with canvas vector calls
// (createLinearGradient, beginPath/stroke, arc/ellipse), all of which antialias. It is now
// painted from a plain RGBA buffer like the structures, trees and characters standing on it, so
// this suite treats the exported PNGs in public/assets/terrain as the canonical art and
// re-paints every tile to compare byte-for-byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import {
  TERRAIN_BIOMES,
  TERRAIN_BLIT_X,
  TERRAIN_BLIT_Y,
  TERRAIN_CLIFF_H,
  TERRAIN_CX,
  TERRAIN_CY,
  TERRAIN_HH,
  TERRAIN_HW,
  TERRAIN_SPRITE_H,
  TERRAIN_SPRITE_W,
  TERRAIN_VARIANTS,
  paintTerrainTile,
  resolveBiome,
  terrainPalette
} from '../.test-build/engine/IsometricTerrainPainter.js';
import png from '../scripts/lib/png.cjs';

const { encodePNG } = png;
const MODEL_DIR = path.join('public', 'assets', 'terrain');

/** All four variants are drawn by the game: interior tiles, edge tiles, and day/night. */
const VARIANTS = [
  { suffix: 'flat_day', options: { cliffs: false, night: false } },
  { suffix: 'cliff_day', options: { cliffs: true, night: false } },
  { suffix: 'flat_night', options: { cliffs: false, night: true } },
  { suffix: 'cliff_night', options: { cliffs: true, night: true } }
];

const SOLID_ALPHA = 200;
const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;

const key = (biome, suffix) => `${biome}_${suffix}`;
const optionsOf = suffix => VARIANTS.find(v => v.suffix === suffix).options;

const cells = [];
for (const biome of TERRAIN_BIOMES) {
  for (const v of VARIANTS) {
    cells.push({ label: key(biome, v.suffix), biome, suffix: v.suffix, surface: paintTerrainTile(biome, v.options) });
  }
}
const painted = new Map(cells.map(c => [c.label, c.surface]));

/** Whether a point is on the top-face rhombus. */
const onDiamond = (x, y) => Math.abs(x - TERRAIN_CX) / TERRAIN_HW + Math.abs(y - TERRAIN_CY) / TERRAIN_HH <= 1;

/** The exact painted colour at a pixel, as a comparable string. */
const keyOf = (surface, x, y) => {
  const i = (y * surface.w + x) * 4;
  return `${surface.data[i]},${surface.data[i + 1]},${surface.data[i + 2]}`;
};

const alphaAt = (surface, x, y) => {
  if (x < 0 || y < 0 || x >= surface.w || y >= surface.h) return 0;
  return surface.data[(y * surface.w + x) * 4 + 3];
};

function boundingBox(surface) {
  let minX = surface.w;
  let maxX = -1;
  let minY = surface.h;
  let maxY = -1;
  for (let y = 0; y < surface.h; y++) {
    for (let x = 0; x < surface.w; x++) {
      if (alphaAt(surface, x, y) <= SOLID_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Mean luminance of the solid pixels in one half of a tile.
 *
 * For a cliffed tile the whole sprite is measured, because the two cliff faces are half the art
 * and must agree with the top face. For a flat tile only the top-face rhombus is measured: the
 * sprite's rectangular padding would otherwise contribute empty rows to both halves and dilute
 * the bevel and dither signal that carries the light direction.
 */
function halfLuminance(surface, wanted, topFaceOnly) {
  const left = wanted === 'left';
  let sum = 0;
  let count = 0;
  for (let y = 0; y < surface.h; y++) {
    for (let x = 0; x < surface.w; x++) {
      if (topFaceOnly && !onDiamond(x, y)) continue;
      const i = (y * surface.w + x) * 4;
      if (surface.data[i + 3] <= SOLID_ALPHA) continue;
      if (left ? x > TERRAIN_CX : x <= TERRAIN_CX) continue;
      sum += luminance(surface.data[i], surface.data[i + 1], surface.data[i + 2]);
      count++;
    }
  }
  return count ? sum / count : 0;
}

test('every biome paints at the sprite size in all four variants', () => {
  assert.equal(TERRAIN_BIOMES.length, 15);
  assert.equal(cells.length, 60);
  for (const c of cells) {
    assert.equal(c.surface.w, TERRAIN_SPRITE_W, `${c.label} width`);
    assert.equal(c.surface.h, TERRAIN_SPRITE_H, `${c.label} height`);
  }
});

test('the tile geometry matches the 2:1 board projection', () => {
  // The renderer blits at (x - TERRAIN_BLIT_X, y - TERRAIN_BLIT_Y), so if these drift the whole
  // floor slides off the grid. The engine imports these constants rather than repeating them.
  assert.equal(TERRAIN_HW * 2, 96, 'tile is 96 wide');
  assert.equal(TERRAIN_HH * 2, 48, 'tile is 48 tall');
  assert.equal(TERRAIN_HW, TERRAIN_HH * 2, '2:1 dimetric');
  assert.equal(TERRAIN_BLIT_X, TERRAIN_CX);
  assert.equal(TERRAIN_BLIT_Y, TERRAIN_CY);
  // The rhombus must be centred horizontally and leave room below for both cliff faces.
  assert.equal(TERRAIN_CX, TERRAIN_SPRITE_W / 2);
  assert.ok(
    TERRAIN_CY + TERRAIN_HH + TERRAIN_CLIFF_H + 6 <= TERRAIN_SPRITE_H,
    'the sprite is too short for the cliff faces plus their foot shadow'
  );
  assert.ok(TERRAIN_CY - TERRAIN_HH >= 2, 'the north vertex is clipped by the sprite edge');
});

test('every tile has an exported model at the sprite size', () => {
  const missing = [];
  const wrongSize = [];
  for (const c of cells) {
    const file = path.join(MODEL_DIR, `${c.label}.png`);
    if (!existsSync(file)) {
      missing.push(c.label);
      continue;
    }
    const buf = readFileSync(file);
    assert.equal(buf.toString('ascii', 12, 16), 'IHDR', `${c.label}.png has no IHDR`);
    if (buf.readUInt32BE(16) !== TERRAIN_SPRITE_W || buf.readUInt32BE(20) !== TERRAIN_SPRITE_H) {
      wrongSize.push(`${c.label} is ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(wrongSize, []);
});

test('the exported tiles match what the painter draws', () => {
  for (const c of cells) {
    const expected = encodePNG(c.surface.w, c.surface.h, Buffer.from(c.surface.data.buffer));
    const actual = readFileSync(path.join(MODEL_DIR, `${c.label}.png`));
    assert.ok(expected.equals(actual), `${c.label}.png is stale - re-run \`npm run gen:terrain\``);
  }
});

test('no orphaned tile models are left behind', () => {
  const known = new Set(cells.map(c => `${c.label}.png`));
  const orphans = readdirSync(MODEL_DIR).filter(f => f.endsWith('.png') && !known.has(f));
  assert.deepEqual(orphans, []);
});

test('an unknown biome falls back instead of painting nothing', () => {
  for (const biome of TERRAIN_BIOMES) assert.equal(resolveBiome(biome), biome);
  assert.equal(resolveBiome('not_a_biome'), 'grass');
  assert.equal(resolveBiome(''), 'grass');
  const fallback = paintTerrainTile('not_a_biome', { cliffs: true });
  const grass = paintTerrainTile('grass', { cliffs: true });
  assert.ok(Buffer.from(fallback.data.buffer).equals(Buffer.from(grass.data.buffer)));
});

test('the top face is solid, so the sky never shows through the ground', () => {
  // A single missing pixel in the floor is a hole straight through the board.
  for (const c of cells) {
    let holes = 0;
    let firstHole = null;
    for (let y = TERRAIN_CY - TERRAIN_HH; y <= TERRAIN_CY + TERRAIN_HH; y++) {
      for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW; x++) {
        if (!onDiamond(x, y)) continue;
        if (alphaAt(c.surface, x, y) > SOLID_ALPHA) continue;
        holes++;
        if (!firstHole) firstHole = `${x},${y}`;
      }
    }
    assert.equal(holes, 0, `${c.label} has ${holes} transparent pixels on its top face (first at ${firstHole})`);
  }
});

test('a flat tile has no cliff and a cliffed tile does', () => {
  const southVertex = TERRAIN_CY + TERRAIN_HH;
  for (const biome of TERRAIN_BIOMES) {
    const flat = painted.get(key(biome, 'flat_day'));
    const cliff = painted.get(key(biome, 'cliff_day'));

    // A flat tile must stop at the south vertex, or two stacked tiles would overlap.
    const flatBox = boundingBox(flat);
    assert.ok(
      flatBox.maxY <= southVertex + 2,
      `${biome} flat reaches y=${flatBox.maxY}, past the south vertex at ${southVertex}`
    );

    // A cliffed tile must extend well below it, spanning the full width at the crest.
    const cliffBox = boundingBox(cliff);
    assert.ok(
      cliffBox.maxY >= southVertex + TERRAIN_CLIFF_H,
      `${biome} cliff only reaches y=${cliffBox.maxY}, expected at least ${southVertex + TERRAIN_CLIFF_H}`
    );
    // The faces are widest at their own bottom edge (the west and east vertices dropped by the
    // cliff height), and taper to the south vertex, so that is where the full width shows.
    const faceBottom = TERRAIN_CY + TERRAIN_CLIFF_H;
    let widest = 0;
    for (let x = 0; x < TERRAIN_SPRITE_W; x++) {
      if (alphaAt(cliff, x, faceBottom - 1) > SOLID_ALPHA) widest++;
    }
    assert.ok(widest > 80, `${biome} cliff face is only ${widest}px wide at its bottom edge`);
    // And it must taper: a cliff that stayed full width to the bottom would be a rectangle.
    let tip = 0;
    for (let x = 0; x < TERRAIN_SPRITE_W; x++) {
      if (alphaAt(cliff, x, southVertex + TERRAIN_CLIFF_H - 2) > SOLID_ALPHA) tip++;
    }
    assert.ok(tip < widest / 2, `${biome} cliff does not taper toward its foot`);
  }
});

test('nothing spills outside the sprite or above the north vertex', () => {
  for (const c of cells) {
    const box = boundingBox(c.surface);
    assert.ok(box.minX >= 2 && box.maxX <= TERRAIN_SPRITE_W - 3, `${c.label} is clipped horizontally`);
    assert.ok(box.minY >= 2 && box.maxY <= TERRAIN_SPRITE_H - 2, `${c.label} is clipped vertically`);
    // No opaque pixel may sit in the corner padding: the tiles have to abut exactly.
    for (const [x, y] of [
      [0, 0],
      [TERRAIN_SPRITE_W - 1, 0],
      [0, TERRAIN_SPRITE_H - 1],
      [TERRAIN_SPRITE_W - 1, TERRAIN_SPRITE_H - 1]
    ]) {
      assert.ok(alphaAt(c.surface, x, y) <= SOLID_ALPHA, `${c.label} paints the sprite corner at ${x},${y}`);
    }
  }
});

test('every tile is shaded, not a flat colour fill', () => {
  for (const c of cells) {
    const colours = new Set();
    let brightest = 0;
    let darkest = 1;
    for (let i = 0; i < c.surface.w * c.surface.h; i++) {
      if (c.surface.data[i * 4 + 3] <= SOLID_ALPHA) continue;
      colours.add(`${c.surface.data[i * 4]},${c.surface.data[i * 4 + 1]},${c.surface.data[i * 4 + 2]}`);
      const l = luminance(c.surface.data[i * 4], c.surface.data[i * 4 + 1], c.surface.data[i * 4 + 2]);
      if (l > brightest) brightest = l;
      if (l < darkest) darkest = l;
    }
    // A calmed floor has a deliberately tight palette - the grasslands use seven tones - so the
    // floor is only a guard against a single flat fill. The tonal-range check below is the real
    // "is it shaded" assertion.
    assert.ok(colours.size >= 6, `${c.label} uses only ${colours.size} colours`);
    // A calmed floor is deliberately low-contrast - a night flat tile spans about 0.19 - so the
    // threshold is per variant. A cliffed tile carries two rock faces and must span more.
    const minimum = c.suffix.startsWith('cliff') ? 0.25 : 0.15;
    assert.ok(
      brightest - darkest > minimum,
      `${c.label} only spans ${(brightest - darkest).toFixed(3)} of tonal range`
    );
  }
});

test('flat ground is neutral, so a run of tiles reads as one surface', () => {
  // This replaced a "flat tiles are lit from the left" assertion, and the reason is worth
  // recording: satisfying that assertion required a dither RAMP across every tile, up to 58%
  // density of the lit tone on the west side falling to the shaded tone on the east. Tiled 312
  // times that is a sawtooth repeating every 96 pixels - a biome looked like a stamped pattern
  // instead of like ground, which is exactly the complaint the change addresses.
  //
  // A floor's light direction belongs to the scene, not to each tile. It lives in the cliff faces
  // (asserted separately, and only drawn where the ground changes height) and in the ambient
  // occlusion under every object standing on the ground. So the correct property for a flat tile
  // is that it carries no systematic left-right bias at all.
  for (const c of cells) {
    if (!c.suffix.startsWith('flat')) continue;
    const left = halfLuminance(c.surface, 'left', true);
    const right = halfLuminance(c.surface, 'right', true);
    assert.ok(
      Math.abs(left - right) < 0.02,
      `${c.label}: left half ${left.toFixed(3)} vs right half ${right.toFixed(3)} - flat ground must be neutral`
    );
  }
});

test('a cliffed tile is lit from the left, where the light actually is', () => {
  // The west cliff face is the mid tone and the east face the dark one, so a raised tile reads as
  // raised. This is the tile-level light assertion that replaced the flat-tile one.
  for (const c of cells) {
    if (!c.suffix.startsWith('cliff')) continue;
    const left = halfLuminance(c.surface, 'left', false);
    const right = halfLuminance(c.surface, 'right', false);
    assert.ok(
      left > right + 0.02,
      `${c.label}: left half ${left.toFixed(3)} vs right half ${right.toFixed(3)}`
    );
  }
});

test('the ground speckle is even and cannot show a seam', () => {
  // The top face uses a fixed-density 4x4 Bayer mask. Two properties together are what make a
  // field of tiles read as one continuous surface:
  //
  //   * the mask's period divides the tile dimensions, so it lines up exactly across a tile
  //     boundary instead of restarting there. That is the seam guarantee, and it is arithmetic.
  //   * the density is the same in every quadrant, so there is no gradient to band.
  //
  // Measured on the bare ground, with the biome detail switched off. An earlier version measured
  // the tile with its detail on and had to accept a 0.06 density spread because the scatter - a
  // grass tuft sitting on four speckle pixels - is indistinguishable from a speckle that moved.
  // That threshold was loose enough to pass almost anything.
  assert.equal((TERRAIN_HW * 2) % 4, 0, 'the tile width must be a multiple of the speckle period');
  assert.equal((TERRAIN_HH * 2) % 4, 0, 'the tile height must be a multiple of the speckle period');

  const lum = k => {
    const [r, g, b] = k.split(',').map(Number);
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  };

  for (const biome of TERRAIN_BIOMES) {
    const s = paintTerrainTile(biome, { cliffs: false, detail: false });

    // The mask is a function of (x mod 4, y mod 4) alone. Scanned on an inset rhombus, because the
    // outermost pixels of every row are the grid contour, which is not part of the speckle.
    const inset = (x, y) =>
      Math.abs(x - TERRAIN_CX) / TERRAIN_HW + Math.abs(y - TERRAIN_CY) / TERRAIN_HH <= 0.93;
    for (let y = TERRAIN_CY - TERRAIN_HH; y <= TERRAIN_CY + TERRAIN_HH; y++) {
      for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW - 4; x++) {
        if (!inset(x, y) || !inset(x + 4, y)) continue;
        assert.equal(keyOf(s, x, y), keyOf(s, x + 4, y), `${biome} speckle is not periodic at ${x},${y}`);
      }
    }

    const counts = new Map();
    let area = 0;
    for (let y = TERRAIN_CY - TERRAIN_HH; y <= TERRAIN_CY + TERRAIN_HH; y++) {
      for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW; x++) {
        if (!inset(x, y)) continue;
        area++;
        const k = keyOf(s, x, y);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    let body = null;
    let fleck = null;
    let best = -1;
    let worst = Infinity;
    for (const [k, n] of counts) {
      if (n > best) {
        best = n;
        body = k;
      }
      if (n < worst) {
        worst = n;
        fleck = k;
      }
    }

    // Exactly two tones on the bare ground, and the body has to dominate it.
    assert.equal(counts.size, 2, `${biome}'s bare ground uses ${counts.size} tones, expected 2`);
    assert.ok(best / area > 0.6, `${biome}'s ground body covers only ${(best / area).toFixed(2)} of the bare ground`);

    // Low contrast, so the speckle reads as texture rather than as a pattern.
    assert.ok(
      Math.abs(lum(body) - lum(fleck)) < 0.16,
      `${biome}'s speckle contrast is ${Math.abs(lum(body) - lum(fleck)).toFixed(3)}`
    );

    const shares = [0, 0, 0, 0];
    const totals = [0, 0, 0, 0];
    for (let y = TERRAIN_CY - TERRAIN_HH; y <= TERRAIN_CY + TERRAIN_HH; y++) {
      for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW; x++) {
        if (!inset(x, y)) continue;
        const q = (x < TERRAIN_CX ? 0 : 1) + (y < TERRAIN_CY ? 0 : 2);
        totals[q]++;
        if (keyOf(s, x, y) === body) shares[q]++;
      }
    }
    const values = shares.map((v, i) => v / Math.max(1, totals[i]));
    const spread = Math.max(...values) - Math.min(...values);
    // The mask is exactly periodic, so the residual spread is the rhombus clipping the 4x4
    // pattern at its edges rather than a gradient. A gradient is caught decisively by the
    // flat-ground neutrality test above, which bounds the left-right luminance difference.
    assert.ok(spread < 0.05, `${biome} body-tone density varies by ${spread.toFixed(3)} across the tile`);
  }
});

test('every biome actually paints its own surface detail', () => {
  // The `detail` switch exists for the test above, so this proves it is a real switch rather than
  // a way to make the speckle test pass against a blank tile.
  for (const biome of TERRAIN_BIOMES) {
    const bare = Buffer.from(paintTerrainTile(biome, { cliffs: false, detail: false }).data.buffer);
    const full = Buffer.from(paintTerrainTile(biome, { cliffs: false }).data.buffer);
    assert.ok(!bare.equals(full), `${biome} paints no surface detail at all`);
  }
});

test('every biome scatters its detail differently from tile to tile', () => {
  // One layout per biome is what produced the stamped-pattern look: the same grass tuft at the
  // same spot on every tile, in a perfect grid.
  assert.ok(TERRAIN_VARIANTS >= 3, 'a variant count of 1 or 2 would still visibly repeat');
  for (const biome of TERRAIN_BIOMES) {
    const seen = new Map();
    for (let v = 0; v < TERRAIN_VARIANTS; v++) {
      const bytes = Buffer.from(
        paintTerrainTile(biome, { cliffs: false, variant: v }).data.buffer
      ).toString('base64');
      assert.ok(!seen.has(bytes), `${biome} variant ${v} is identical to variant ${seen.get(bytes)}`);
      seen.set(bytes, v);
    }
  }
  // And an out-of-range variant must normalise rather than index off the table.
  // Normalisation is by absolute value, so -1 selects the same layout as 1.
  const a = Buffer.from(paintTerrainTile('grass', { variant: -1 }).data.buffer);
  const b = Buffer.from(paintTerrainTile('grass', { variant: 1 }).data.buffer);
  assert.ok(a.equals(b), 'a negative variant should normalise into range');
});

test('the two cliff faces agree with the top face about the light', () => {
  // A tile whose top face is lit from the left but whose cliffs are lit from the right is worse
  // than either mistake alone, because the two halves of the same tile disagree.
  for (const biome of TERRAIN_BIOMES) {
    for (const night of [false, true]) {
      const surface = paintTerrainTile(biome, { cliffs: true, night });
      let west = 0;
      let westN = 0;
      let east = 0;
      let eastN = 0;
      for (let y = TERRAIN_CY; y < TERRAIN_SPRITE_H; y++) {
        for (let x = 0; x < TERRAIN_SPRITE_W; x++) {
          const i = (y * surface.w + x) * 4;
          if (surface.data[i + 3] <= SOLID_ALPHA) continue;
          if (onDiamond(x, y)) continue;
          const l = luminance(surface.data[i], surface.data[i + 1], surface.data[i + 2]);
          if (x < TERRAIN_CX) {
            west += l;
            westN++;
          } else {
            east += l;
            eastN++;
          }
        }
      }
      assert.ok(westN > 100 && eastN > 100, `${biome} has no cliff faces to measure`);
      assert.ok(
        west / westN > east / eastN + 0.02,
        `${biome}${night ? ' night' : ''}: west cliff ${(west / westN).toFixed(3)} vs east cliff ${(east / eastN).toFixed(3)}`
      );
    }
  }
});

test('every biome is a distinct colour and day differs from night', () => {
  const signatures = new Map();
  const clashes = [];
  const identical = [];

  for (const biome of TERRAIN_BIOMES) {
    const day = painted.get(key(biome, 'cliff_day'));
    const night = painted.get(key(biome, 'cliff_night'));

    // A coarse 3x3 mean-colour signature: enough to catch two biomes that render the same tile,
    // which would make the board unreadable because the ground is how players navigate.
    const signature = surface => {
      const out = [];
      for (let gy = 0; gy < 3; gy++) {
        for (let gx = 0; gx < 3; gx++) {
          let r = 0;
          let g = 0;
          let b = 0;
          let n = 0;
          for (let y = Math.floor((gy * surface.h) / 3); y < Math.floor(((gy + 1) * surface.h) / 3); y++) {
            for (let x = Math.floor((gx * surface.w) / 3); x < Math.floor(((gx + 1) * surface.w) / 3); x++) {
              const i = (y * surface.w + x) * 4;
              if (surface.data[i + 3] <= SOLID_ALPHA) continue;
              r += surface.data[i];
              g += surface.data[i + 1];
              b += surface.data[i + 2];
              n++;
            }
          }
          out.push(n ? [r / n, g / n, b / n] : [0, 0, 0]);
        }
      }
      return out;
    };

    const daySig = signature(day);
    const nightSig = signature(night);
    const distance = (a, b) => a.reduce((acc, c, i) => acc + Math.abs(c[0] - b[i][0]) + Math.abs(c[1] - b[i][1]) + Math.abs(c[2] - b[i][2]), 0);

    if (distance(daySig, nightSig) < 40) identical.push(`${biome} day and night look the same`);

    for (const [other, otherSig] of signatures) {
      if (distance(daySig, otherSig) < 40) clashes.push(`${biome} and ${other} paint the same floor`);
    }
    signatures.set(biome, daySig);
  }

  assert.deepEqual(identical, []);
  assert.deepEqual(clashes, []);
});

test('the day and night palettes are authored for every biome', () => {
  // A biome missing from either table would silently fall back to grass, which is exactly the bug
  // a new biome added to BoardMap would otherwise introduce.
  for (const biome of TERRAIN_BIOMES) {
    for (const night of [false, true]) {
      const palette = terrainPalette(biome, night);
      for (const field of ['top', 'accent', 'cliffLeft', 'cliffRight', 'border']) {
        assert.match(palette[field], /^#[0-9a-f]{6}$/i, `${biome} ${night ? 'night' : 'day'} ${field}`);
      }
    }
    assert.notEqual(
      terrainPalette(biome, false).top,
      terrainPalette(biome, true).top,
      `${biome} has no night palette`
    );
  }
});

test('no two biomes share a tile', () => {
  const seen = new Map();
  const duplicates = [];
  for (const c of cells) {
    const bytes = Buffer.from(c.surface.data.buffer).toString('base64');
    if (seen.has(bytes)) duplicates.push(`${c.label} == ${seen.get(bytes)}`);
    else seen.set(bytes, c.label);
  }
  assert.deepEqual(duplicates, []);
});
