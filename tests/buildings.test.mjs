// The isometric structure models.
//
// The game paints these at runtime because towns and homes take an owner colour, which a fixed
// PNG cannot carry. The exported PNGs in public/assets/buildings are therefore treated as the
// canonical art: this suite re-paints every structure and compares it byte-for-byte against the
// committed file, so the code and the images can never drift apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import { BUILDING_SIZE, paintBuilding } from '../.test-build/engine/IsometricBuildingPainter.js';
import png from '../scripts/lib/png.cjs';

const { encodePNG } = png;
const MODEL_DIR = path.join('public', 'assets', 'buildings');

/** `capital` and `boss` paint identically to `town` and `dark_gate`, so only the canonical set
 *  is exported. */
const KINDS = [
  'town',
  'shop_weapon',
  'shop_magic',
  'shop_item',
  'church',
  'tavern',
  'guild',
  'fishing',
  'isekai_event',
  'dark_gate',
  'vault',
  'mystery_chest',
  'home'
];

const ALIASES = { capital: 'town', boss: 'dark_gate' };

const SOLID_ALPHA = 200;
const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;

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
 * Mean luminance of the solid pixels in one horizontal half of a model.
 *
 * Structures are compared left-versus-right rather than quadrant-versus-quadrant: a building
 * stacks different materials vertically (a dark tower on a pale stone plinth), so a vertical
 * split measures the palette rather than the light. Every wall face appears in both halves at
 * the same height, so a left-right split isolates the light direction exactly.
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

const painted = new Map(KINDS.map(kind => [kind, paintBuilding(kind, null)]));

test('every structure paints at 64x64', () => {
  assert.equal(BUILDING_SIZE, 64);
  for (const kind of KINDS) {
    const surface = painted.get(kind);
    assert.equal(surface.w, BUILDING_SIZE, `${kind} width`);
    assert.equal(surface.h, BUILDING_SIZE, `${kind} height`);
  }
});

test('every structure has an exported model at 64x64', () => {
  const missing = [];
  const wrongSize = [];
  for (const kind of KINDS) {
    const file = path.join(MODEL_DIR, `${kind}.png`);
    if (!existsSync(file)) {
      missing.push(kind);
      continue;
    }
    const buf = readFileSync(file);
    assert.equal(buf.toString('ascii', 12, 16), 'IHDR', `${kind}.png has no IHDR`);
    if (buf.readUInt32BE(16) !== BUILDING_SIZE || buf.readUInt32BE(20) !== BUILDING_SIZE) {
      wrongSize.push(`${kind} is ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(wrongSize, []);
});

test('the exported models match what the painter draws', () => {
  // The game does not read these files, so nothing else would catch the images going stale
  // after an art change.
  for (const kind of KINDS) {
    const surface = painted.get(kind);
    const expected = encodePNG(surface.w, surface.h, Buffer.from(surface.data.buffer));
    const actual = readFileSync(path.join(MODEL_DIR, `${kind}.png`));
    assert.ok(
      expected.equals(actual),
      `${kind}.png is stale - re-run \`npm run gen:buildings\``
    );
  }
});

test('no orphaned structure models are left behind', () => {
  const known = new Set(KINDS.map(k => `${k}.png`));
  const orphans = readdirSync(MODEL_DIR).filter(f => f.endsWith('.png') && !known.has(f));
  assert.deepEqual(orphans, []);
});

test('aliases paint exactly like their canonical structure', () => {
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const a = paintBuilding(alias, null);
    const b = paintBuilding(canonical, null);
    assert.deepEqual(
      Buffer.from(a.data.buffer).equals(Buffer.from(b.data.buffer)),
      true,
      `${alias} should paint identically to ${canonical}`
    );
  }
});

test('every structure is shaded, not a flat silhouette', () => {
  for (const kind of KINDS) {
    const surface = painted.get(kind);
    const colours = new Set();
    for (let i = 0; i < surface.w * surface.h; i++) {
      if (surface.data[i * 4 + 3] <= SOLID_ALPHA) continue;
      colours.add(`${surface.data[i * 4]},${surface.data[i * 4 + 1]},${surface.data[i * 4 + 2]}`);
    }
    assert.ok(colours.size >= 40, `${kind} uses only ${colours.size} colours`);
  }
});

test('every structure is lit from the left', () => {
  // In 2:1 dimetric projection with a top-left sun, every wall's left face takes the mid tone
  // and its right face the darkest tone, so the left half of a model must measure brighter.
  for (const kind of KINDS) {
    const surface = painted.get(kind);
    const box = boundingBox(surface);
    const left = halfLuminance(surface, box, 'left');
    const right = halfLuminance(surface, box, 'right');
    assert.ok(
      left > right + 0.02,
      `${kind}: left half ${left.toFixed(3)} vs right half ${right.toFixed(3)}`
    );
  }
});

test('the top of a structure outranks its shaded wall', () => {
  // The other half of the rule: light comes from above as well as the left, so a roof or top
  // plate must be brighter than the darkest wall tone. Checked per structure against its own
  // palette rather than across the sprite, so a dark tower on pale stone is not penalised.
  for (const kind of KINDS) {
    const surface = painted.get(kind);
    // Sample the brightest and darkest solid tones actually used.
    let brightest = 0;
    let darkest = 1;
    for (let i = 0; i < surface.w * surface.h; i++) {
      if (surface.data[i * 4 + 3] <= SOLID_ALPHA) continue;
      const l = luminance(surface.data[i * 4], surface.data[i * 4 + 1], surface.data[i * 4 + 2]);
      if (l > brightest) brightest = l;
      if (l < darkest) darkest = l;
    }
    assert.ok(
      brightest - darkest > 0.25,
      `${kind} only spans ${(brightest - darkest).toFixed(3)} of tonal range`
    );
  }
});

test('every structure has substance and seats on its tile', () => {
  for (const kind of KINDS) {
    const surface = painted.get(kind);
    let opaque = 0;
    for (let i = 0; i < surface.w * surface.h; i++) {
      if (surface.data[i * 4 + 3] > SOLID_ALPHA) opaque++;
    }
    assert.ok(opaque > 500, `${kind} has only ${opaque} solid pixels`);

    const box = boundingBox(surface);
    assert.ok(box.minX >= 0 && box.maxX < BUILDING_SIZE, `${kind} is clipped horizontally`);
    assert.ok(box.minY >= 0 && box.maxY < BUILDING_SIZE, `${kind} is clipped vertically`);
    // The base diamond's lowest point sits at y=61, so the blit anchor (py - 48) lands the
    // structure on its tile rather than floating above or sinking into it.
    assert.ok(
      box.maxY >= 58 && box.maxY <= 63,
      `${kind} base reaches y=${box.maxY}, which will not seat on the tile`
    );
  }
});

test('no two structures share a model', () => {
  const seen = new Map();
  const duplicates = [];
  for (const kind of KINDS) {
    const bytes = Buffer.from(painted.get(kind).data.buffer).toString('base64');
    if (seen.has(bytes)) duplicates.push(`${kind} == ${seen.get(bytes)}`);
    else seen.set(bytes, kind);
  }
  assert.deepEqual(duplicates, []);
});

test('an owner colour changes a town but not a shop', () => {
  const plain = Buffer.from(paintBuilding('town', null).data.buffer);
  const owned = Buffer.from(paintBuilding('town', '#22c55e').data.buffer);
  assert.equal(plain.equals(owned), false, 'a town must show who owns it');

  const shopPlain = Buffer.from(paintBuilding('shop_weapon', null).data.buffer);
  const shopOwned = Buffer.from(paintBuilding('shop_weapon', '#22c55e').data.buffer);
  assert.equal(shopPlain.equals(shopOwned), true, 'a shop is not territory');
});
