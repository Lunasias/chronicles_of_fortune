// The isometric tree models.
//
// The map's foliage used to be smooth vector art (ctx.ellipse and gradients) painted on a 68x88
// canvas and blitted into a 64x84 box, so it was both a non-integer resample and a different
// visual language from every structure. It is now painted from a plain RGBA buffer like the rest
// of the game. These PNGs in public/assets/foliage are the canonical exported art: this suite
// re-paints every model and compares it byte-for-byte, so the code and the images cannot drift.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import {
  FOLIAGE_KINDS,
  FOLIAGE_SIZE,
  paintFoliage,
  resolveFoliageKind
} from '../.test-build/engine/IsometricFoliagePainter.js';
import png from '../scripts/lib/png.cjs';

const { encodePNG } = png;
const MODEL_DIR = path.join('public', 'assets', 'foliage');

/** The renderer asks for `node.id % 4`, so four silhouettes exist per species. */
const VARIANTS = 4;

/** Every alias the renderer may pass, and the species it must land on. */
const ALIASES = {
  oak: 'dark_oak',
  tree: 'dark_oak',
  dark_oak: 'dark_oak',
  snow_pine: 'frost_pine',
  frost_pine: 'frost_pine',
  pine: 'frost_pine',
  magic: 'gloom_spore',
  gloom_spore: 'gloom_spore',
  mushroom: 'gloom_spore',
  ash_thorn: 'ash_thorn',
  ash: 'ash_thorn',
  blood_willow: 'blood_willow',
  willow: 'blood_willow'
};

const SOLID_ALPHA = 200;
const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;

const key = (kind, variant) => `${kind}_v${variant}`;

const cells = [];
for (const kind of FOLIAGE_KINDS) {
  for (let v = 0; v < VARIANTS; v++) {
    cells.push({ label: key(kind, v), kind, variant: v, surface: paintFoliage(kind, v) });
  }
}
const painted = new Map(cells.map(c => [c.label, c.surface]));

function boundingBox(surface) {
  let minX = surface.w;
  let maxX = -1;
  let minY = surface.h;
  let maxY = -1;
  for (let y = 0; y < surface.h; y++) {
    for (let x = 0; x < surface.w; x++) {
      if (surface.data[(y * surface.w + x) * 4 + 3] <= SOLID_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Mean luminance of the solid pixels in one half of a model.
 *
 * A tree has one dominant material, so unlike a structure — which stacks a dark tower on a pale
 * plinth and would measure its palette rather than its light under a horizontal split — a
 * left-right split is a clean light test here too, and keeping the same metric as
 * tests/buildings.test.mjs means the whole map is held to one lighting rule.
 */
function halfLuminance(surface, box, wanted) {
  const midX = (box.minX + box.maxX) / 2;
  let sum = 0;
  let count = 0;
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const i = (y * surface.w + x) * 4;
      if (surface.data[i + 3] <= SOLID_ALPHA) continue;
      const onLeft = x <= midX;
      if (wanted === 'left' ? !onLeft : onLeft) continue;
      sum += luminance(surface.data[i], surface.data[i + 1], surface.data[i + 2]);
      count++;
    }
  }
  return count ? sum / count : 0;
}

test('every tree paints at 64x64', () => {
  assert.equal(FOLIAGE_SIZE, 64);
  for (const c of cells) {
    assert.equal(c.surface.w, FOLIAGE_SIZE, `${c.label} width`);
    assert.equal(c.surface.h, FOLIAGE_SIZE, `${c.label} height`);
  }
});

test('every tree has an exported model at 64x64', () => {
  assert.deepEqual(FOLIAGE_KINDS.length, 5);
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
    if (buf.readUInt32BE(16) !== FOLIAGE_SIZE || buf.readUInt32BE(20) !== FOLIAGE_SIZE) {
      wrongSize.push(`${c.label} is ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(wrongSize, []);
});

test('the exported models match what the painter draws', () => {
  // The game does not read these files, so nothing else would catch the images going stale.
  for (const c of cells) {
    const expected = encodePNG(c.surface.w, c.surface.h, Buffer.from(c.surface.data.buffer));
    const actual = readFileSync(path.join(MODEL_DIR, `${c.label}.png`));
    assert.ok(expected.equals(actual), `${c.label}.png is stale - re-run \`npm run gen:foliage\``);
  }
});

test('no orphaned tree models are left behind', () => {
  const known = new Set(cells.map(c => `${c.label}.png`));
  const orphans = readdirSync(MODEL_DIR).filter(f => f.endsWith('.png') && !known.has(f));
  assert.deepEqual(orphans, []);
});

test('every renderer tree name resolves to a painted species', () => {
  for (const [alias, species] of Object.entries(ALIASES)) {
    assert.equal(resolveFoliageKind(alias), species, `${alias} should paint as ${species}`);
  }
  // Anything the renderer invents falls back to the default broadleaf rather than throwing.
  assert.equal(resolveFoliageKind('something_new'), 'dark_oak');
});

test('aliases paint exactly like their canonical species', () => {
  for (const [alias, species] of Object.entries(ALIASES)) {
    if (alias === species) continue;
    for (let v = 0; v < VARIANTS; v++) {
      const a = paintFoliage(alias, v);
      const b = paintFoliage(species, v);
      assert.ok(
        Buffer.from(a.data.buffer).equals(Buffer.from(b.data.buffer)),
        `${alias} v${v} should paint identically to ${species}`
      );
    }
  }
});

test('a variant is normalised, so any integer is accepted', () => {
  // The renderer passes `node.id % 4`, which is already in range, but a save file or a future
  // caller must not be able to index out of the variant table and crash the map.
  for (const n of [-7, 4, 9, 100]) {
    const surface = paintFoliage('dark_oak', n);
    assert.equal(surface.w, FOLIAGE_SIZE);
    assert.ok(surface.data.some((_, i) => i % 4 === 3 && surface.data[i] > SOLID_ALPHA));
  }
  const a = paintFoliage('dark_oak', -7);
  const b = paintFoliage('dark_oak', 3);
  assert.ok(Buffer.from(a.data.buffer).equals(Buffer.from(b.data.buffer)), '-7 should map to v3');
});

test('every tree is shaded, not a flat silhouette', () => {
  // A tight palette is a virtue in pixel art, so the colour count is only a floor against a
  // model accidentally painted in one flat fill. The real check is that the ramp spans a wide
  // tonal range: lit shoulder to deep shadow.
  for (const c of cells) {
    const colours = new Set();
    let brightest = 0;
    let darkest = 1;
    for (let i = 0; i < c.surface.w * c.surface.h; i++) {
      if (c.surface.data[i * 4 + 3] <= SOLID_ALPHA) continue;
      colours.add(
        `${c.surface.data[i * 4]},${c.surface.data[i * 4 + 1]},${c.surface.data[i * 4 + 2]}`
      );
      const l = luminance(c.surface.data[i * 4], c.surface.data[i * 4 + 1], c.surface.data[i * 4 + 2]);
      if (l > brightest) brightest = l;
      if (l < darkest) darkest = l;
    }
    assert.ok(colours.size >= 18, `${c.label} uses only ${colours.size} colours`);
    assert.ok(
      brightest - darkest > 0.5,
      `${c.label} only spans ${(brightest - darkest).toFixed(3)} of tonal range`
    );
  }
});

test('every tree is lit from the left', () => {
  // Same rule as the structures: a top-left sun puts the lit shoulder of every leaf mass on the
  // left, so the left half of a model must measure brighter than the right half.
  for (const c of cells) {
    const surface = painted.get(c.label);
    const box = boundingBox(surface);
    const left = halfLuminance(surface, box, 'left');
    const right = halfLuminance(surface, box, 'right');
    assert.ok(
      left > right + 0.02,
      `${c.label}: left half ${left.toFixed(3)} vs right half ${right.toFixed(3)}`
    );
  }
});

test('every tree is lit from above as well as the left', () => {
  // The other half of the rule. A canopy shaded only left-versus-right with no vertical falloff
  // reads as a flat disc, so the upper-left quadrant must outrank the lower-right.
  for (const c of cells) {
    const surface = painted.get(c.label);
    const box = boundingBox(surface);
    const midX = (box.minX + box.maxX) / 2;
    const midY = (box.minY + box.maxY) / 2;
    let ul = 0;
    let uln = 0;
    let lr = 0;
    let lrn = 0;
    for (let y = box.minY; y <= box.maxY; y++) {
      for (let x = box.minX; x <= box.maxX; x++) {
        const i = (y * surface.w + x) * 4;
        if (surface.data[i + 3] <= SOLID_ALPHA) continue;
        const l = luminance(surface.data[i], surface.data[i + 1], surface.data[i + 2]);
        if (x <= midX && y <= midY) {
          ul += l;
          uln++;
        } else if (x > midX && y > midY) {
          lr += l;
          lrn++;
        }
      }
    }
    assert.ok(uln > 0 && lrn > 0, `${c.label} is missing a quadrant`);
    assert.ok(
      ul / uln > lr / lrn + 0.02,
      `${c.label}: upper-left ${(ul / uln).toFixed(3)} vs lower-right ${(lr / lrn).toFixed(3)}`
    );
  }
});

test('every tree has substance and its trunk base sits on the anchor', () => {
  for (const c of cells) {
    const surface = painted.get(c.label);
    let opaque = 0;
    for (let i = 0; i < surface.w * surface.h; i++) {
      if (surface.data[i * 4 + 3] > SOLID_ALPHA) opaque++;
    }
    assert.ok(opaque > 300, `${c.label} has only ${opaque} solid pixels`);

    const box = boundingBox(surface);
    assert.ok(box.minX >= 0 && box.maxX < FOLIAGE_SIZE, `${c.label} is clipped horizontally`);
    assert.ok(box.minY >= 0 && box.maxY < FOLIAGE_SIZE, `${c.label} is clipped vertically`);

    // The renderer blits at (px - 32, py - 54), so the root collar must straddle x=32 and the
    // lowest solid pixel must land in the bottom band, or the tree floats off its tile.
    assert.ok(
      box.minX <= 32 && box.maxX >= 32,
      `${c.label} spans x ${box.minX}..${box.maxX}, so its trunk is off the tile centre`
    );
    assert.ok(
      box.maxY >= 54 && box.maxY <= 63,
      `${c.label} base reaches y=${box.maxY}, which will not seat on the tile`
    );
  }
});

test('no two tree models share a sprite', () => {
  const seen = new Map();
  const duplicates = [];
  for (const c of cells) {
    const bytes = Buffer.from(c.surface.data.buffer).toString('base64');
    if (seen.has(bytes)) duplicates.push(`${c.label} == ${seen.get(bytes)}`);
    else seen.set(bytes, c.label);
  }
  assert.deepEqual(duplicates, []);
});

/**
 * A 4x4 grid of solid-pixel coverage across a model's bounding box.
 *
 * At board scale a forest is a row of tiny silhouettes, so two species that put their mass in
 * the same places read as the same tree no matter how different their palettes are. A coverage
 * grid captures where the mass actually sits — a round crown, a narrow cone, a flat cap, a
 * bare fork, a hanging fringe — which bounding-box aspect and fill alone cannot.
 */
function coverageProfile(surface, n = 4) {
  const box = boundingBox(surface);
  const bw = (box.maxX - box.minX + 1) / n;
  const bh = (box.maxY - box.minY + 1) / n;
  const cells = [];
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const x0 = Math.floor(box.minX + gx * bw);
      const x1 = Math.ceil(box.minX + (gx + 1) * bw) - 1;
      const y0 = Math.floor(box.minY + gy * bh);
      const y1 = Math.ceil(box.minY + (gy + 1) * bh) - 1;
      let solid = 0;
      let total = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          total++;
          if (surface.data[(y * surface.w + x) * 4 + 3] > SOLID_ALPHA) solid++;
        }
      }
      cells.push(total ? solid / total : 0);
    }
  }
  return cells;
}

test('the species are distinguishable by silhouette', () => {
  const profiles = FOLIAGE_KINDS.map(kind => ({
    kind,
    cells: coverageProfile(painted.get(key(kind, 0)))
  }));

  const clashes = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i];
      const b = profiles[j];
      let distance = 0;
      for (let c = 0; c < a.cells.length; c++) distance += Math.abs(a.cells[c] - b.cells[c]);
      // The closest real pair measures 2.18, so 1.2 still leaves room for art changes.
      if (distance < 1.2) {
        clashes.push(`${a.kind} and ${b.kind} put their mass in the same places (${distance.toFixed(2)})`);
      }
    }
  }
  assert.deepEqual(clashes, []);
});
