// Every companion must have a real 64x64 pixel-art model on disk.
//
// The models are generated from src/game/companions.json by
// scripts/generate_companion_sprites.cjs, and the runtime resolves them through the same
// JSON. These tests make "a companion with no model" impossible to merge, which is exactly
// the state the game was in before the models existed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import path from 'node:path';

import {
  COMPANION_SPRITE_SIZE,
  allCompanionKeys,
  companionKeyForDefeatedMonster,
  companionSpritePath,
  createCompanion,
  getCompanionProfile,
  listCompanionProfiles,
  resolveCompanionKey
} from '../.test-build/game/CompanionDatabase.js';

const MODEL_DIR = path.join('public', 'assets', 'companions');

/** Reads width/height straight out of the PNG IHDR chunk. */
function readPngSize(file) {
  const buf = readFileSync(file);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    assert.equal(buf[i], signature[i], `${file} is not a PNG`);
  }
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR', `${file} has no IHDR`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * Decodes an 8-bit RGBA PNG written by this project's generator (all rows use filter 0, and
 * compressed data is stored in a single IDAT that zlib can inflate).
 */
function readPixels(file) {
  const buf = readFileSync(file);
  const { width, height } = readPngSize(file);
  let pos = 8;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.equal(filter, 0, `${file} uses an unsupported PNG filter`);
    raw.copy(pixels, y * stride, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
  }
  return { width, height, pixels };
}

/**
 * Alpha above which a pixel counts as solid character rather than the translucent aura ring.
 * The aura is deliberately semi-transparent, and including it would let a symmetric glow dilute
 * any measurement of the sprite's own shading.
 */
const SOLID_ALPHA = 200;

const luminance = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;

/** Mean luminance of the solid pixels in one half of a sprite's bounding box. */
function regionLuminance({ width, height, pixels }, box, wanted) {
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;
  let sum = 0;
  let count = 0;
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] <= SOLID_ALPHA) continue;
      const upperLeft = x <= midX && y <= midY;
      if (wanted === 'upperLeft' ? !upperLeft : upperLeft) continue;
      sum += luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      count++;
    }
  }
  return count ? sum / count : 0;
}

function boundingBox({ width, height, pixels }) {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] <= SOLID_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

const profiles = listCompanionProfiles();

test('the companion catalogue is populated', () => {
  assert.ok(profiles.length >= 20, `expected a full roster, got ${profiles.length}`);
  const keys = allCompanionKeys();
  assert.equal(new Set(keys).size, keys.length, 'companion keys must be unique');
});

test('every companion has a 64x64 model on disk', () => {
  const missing = [];
  const wrongSize = [];

  for (const profile of profiles) {
    const file = path.join(MODEL_DIR, `${profile.key}.png`);
    if (!existsSync(file)) {
      missing.push(profile.key);
      continue;
    }
    const { width, height } = readPngSize(file);
    if (width !== COMPANION_SPRITE_SIZE || height !== COMPANION_SPRITE_SIZE) {
      wrongSize.push(`${profile.key} is ${width}x${height}`);
    }
  }

  assert.deepEqual(missing, [], 'these companions have no generated model');
  assert.deepEqual(
    wrongSize,
    [],
    `models must be ${COMPANION_SPRITE_SIZE}x${COMPANION_SPRITE_SIZE}`
  );
});

test('no orphaned models are left behind', () => {
  const known = new Set(profiles.map(p => `${p.key}.png`));
  const orphans = readdirSync(MODEL_DIR).filter(f => f.endsWith('.png') && !known.has(f));
  assert.deepEqual(orphans, [], 'these model files belong to no companion');
});

test('every model is visually distinct', () => {
  // A copy-paste mistake in the art descriptors would silently give two companions the same
  // sprite, which is the kind of thing no type checker can catch.
  const seen = new Map();
  const duplicates = [];

  for (const profile of profiles) {
    const bytes = readFileSync(path.join(MODEL_DIR, `${profile.key}.png`));
    const hash = bytes.toString('base64');
    if (seen.has(hash)) duplicates.push(`${profile.key} == ${seen.get(hash)}`);
    else seen.set(hash, profile.key);
  }

  assert.deepEqual(duplicates, []);
});

test('every model actually contains pixels', () => {
  // A blank sprite is worse than a missing one because it fails silently on screen.
  for (const profile of profiles) {
    const bytes = readFileSync(path.join(MODEL_DIR, `${profile.key}.png`));
    assert.ok(
      bytes.length > 250,
      `${profile.key}.png is only ${bytes.length} bytes, which suggests an empty sprite`
    );
  }
});

test('every model is shaded, not a flat silhouette', () => {
  // A properly shaded 64x64 sprite carries a five-stage ramp per material, so it has far more
  // distinct colours than a flat fill would. This is the guard against the generator regressing
  // into a single-tone blob.
  for (const profile of profiles) {
    const { width, height, pixels } = readPixels(path.join(MODEL_DIR, `${profile.key}.png`));
    const colours = new Set();
    for (let i = 0; i < width * height; i++) {
      if (pixels[i * 4 + 3] <= SOLID_ALPHA) continue;
      colours.add(`${pixels[i * 4]},${pixels[i * 4 + 1]},${pixels[i * 4 + 2]}`);
    }
    assert.ok(
      colours.size >= 60,
      `${profile.key} uses only ${colours.size} colours, which means it is not shaded`
    );
  }
});

test('every model is lit from the top-left', () => {
  // The single most important pixel-art rule: one light source, and shadows opposite it. If the
  // upper-left half of a sprite is not brighter than the lower-right half, the light map has
  // broken (or the sprite has been pillow shaded into a uniform dark rim).
  for (const profile of profiles) {
    const image = readPixels(path.join(MODEL_DIR, `${profile.key}.png`));
    const box = boundingBox(image);
    const upperLeft = regionLuminance(image, box, 'upperLeft');
    const lowerRight = regionLuminance(image, box, 'lowerRight');
    assert.ok(
      upperLeft > lowerRight + 0.02,
      `${profile.key}: upper-left is ${upperLeft.toFixed(3)} and lower-right is ` +
        `${lowerRight.toFixed(3)} - the light direction is not readable`
    );
  }
});

test('the sprite path helper points at the generated files', () => {
  for (const profile of profiles) {
    const url = companionSpritePath(profile.key);
    assert.match(url, /^\/assets\/companions\/[a-z_]+\.png$/);
    const file = path.join('public', url.replace(/^\//, ''));
    assert.ok(existsSync(file), `${url} does not exist`);
  }
});

test('every monster in the recruitment roster maps to a real companion', () => {
  const raw = JSON.parse(readFileSync(path.join('src', 'game', 'companions.json'), 'utf8'));
  const monsterNames = Object.keys(raw.roster);
  assert.ok(monsterNames.length >= 20, `expected a full roster, got ${monsterNames.length}`);

  for (const monster of monsterNames) {
    const key = companionKeyForDefeatedMonster(monster);
    assert.notEqual(key, raw.fallbackKey, `"${monster}" falls through to the generic companion`);
    assert.ok(
      profiles.some(p => p.key === key),
      `"${monster}" maps to unknown companion "${key}"`
    );
  }
});

test('an unknown monster still yields a usable companion', () => {
  const profile = getCompanionProfile(companionKeyForDefeatedMonster('Some Unlisted Monster'));
  assert.ok(profile.key);
  assert.ok(profile.name.length > 0);
});

test('createCompanion fills in every field the UI reads', () => {
  for (const profile of profiles) {
    const companion = createCompanion(profile.key);
    assert.equal(companion.spriteKey, profile.key);
    assert.ok(companion.id.length > 0);
    assert.ok(companion.name.length > 0);
    assert.ok(companion.avatar.length > 0, `${profile.key} has no emoji fallback`);
    assert.ok(['striker', 'healer', 'guardian', 'mage'].includes(companion.role));
    assert.ok(companion.skillName.length > 0);
    assert.ok(companion.skillDesc.length > 0);
    assert.ok(companion.dialogue.length > 0);
    assert.match(companion.color ?? '', /^#[0-9a-f]{6}$/i);
    assert.equal(companion.contractTurnsRemaining, undefined, 'permanent companions have no contract');
  }
});

test('hired companions carry a contract length', () => {
  const hired = createCompanion('mia', { contractTurnsRemaining: 3 });
  assert.equal(hired.contractTurnsRemaining, 3);
});

test('older save ids still resolve to the right model', () => {
  // The two guild hires were saved as comp_hired_* before every companion had a key.
  assert.equal(resolveCompanionKey({ id: 'comp_hired_mia', name: 'สาวหูแมวนักล่า มิอา' }), 'mia');
  assert.equal(
    resolveCompanionKey({ id: 'comp_hired_sylphira', name: 'เจ้าหญิงเอลฟ์ ซิลฟิรา' }),
    'sylphira'
  );
});

test('a companion from an unrecognised save falls back instead of breaking', () => {
  const key = resolveCompanionKey({ id: 'comp_unknown_xyz', name: 'ไม่มีในระบบ' });
  assert.ok(key.length > 0);
  assert.ok(profiles.some(p => p.key === key));
});

test('every art descriptor uses vocabulary the generator understands', () => {
  const raw = JSON.parse(readFileSync(path.join('src', 'game', 'companions.json'), 'utf8'));

  const allowed = {
    hairStyle: ['long', 'twin', 'short', 'bun', 'ponytail', 'wavy'],
    body: ['human', 'slime', 'ghost', 'mech', 'mermaid'],
    ears: ['none', 'goblin', 'dog', 'wolf', 'cat', 'fox', 'elf', 'yeti'],
    horns: ['none', 'dragon', 'imp', 'demon', 'curled'],
    wings: ['none', 'dragon', 'bat', 'feather', 'insect'],
    tail: ['none', 'dog', 'fox9', 'cat', 'scorpion', 'mermaid', 'dragon', 'slime', 'flame'],
    headwear: [
      'none', 'maid', 'hat', 'tophat', 'goggles', 'crown', 'tiara', 'turban', 'bandana',
      'hood', 'bandage', 'nemes', 'mask', 'foxmask', 'flower', 'halo'
    ],
    weapon: [
      'none', 'dagger', 'sword', 'scimitar', 'staff', 'gun', 'fan', 'claw', 'scythe', 'bow',
      'shield', 'tray', 'gohei', 'pickaxe', 'rapier'
    ],
    outfitStyle: ['tunic', 'armor', 'plate', 'robe', 'dress', 'kimono', 'corset', 'apron', 'cloak', 'shells', 'bandage', 'fur'],
    pattern: ['none', 'stripes', 'scales', 'cracks', 'stars', 'runes'],
    auraStyle: ['glow', 'flame', 'frost', 'void', 'water', 'petals', 'sparks']
  };

  const problems = [];
  for (const companion of raw.companions) {
    for (const [field, values] of Object.entries(allowed)) {
      if (!values.includes(companion.art[field])) {
        problems.push(`${companion.key}.${field} = "${companion.art[field]}"`);
      }
    }
    for (const color of ['skin', 'hair', 'outfit', 'accent', 'eyes']) {
      if (!/^#[0-9a-f]{6}$/i.test(companion.art[color])) {
        problems.push(`${companion.key}.${color} = "${companion.art[color]}"`);
      }
    }
    if (companion.art.cape !== null && !/^#[0-9a-f]{6}$/i.test(companion.art.cape)) {
      problems.push(`${companion.key}.cape = "${companion.art.cape}"`);
    }
    if (companion.art.aura !== null && !/^#[0-9a-f]{6}$/i.test(companion.art.aura)) {
      problems.push(`${companion.key}.aura = "${companion.art.aura}"`);
    }
    // Optional effect fields.
    if (companion.art.bladeGradient !== undefined) {
      const g = companion.art.bladeGradient;
      if (!Array.isArray(g) || g.length !== 2 || g.some(c => !/^#[0-9a-f]{6}$/i.test(c))) {
        problems.push(`${companion.key}.bladeGradient = ${JSON.stringify(g)}`);
      }
    }
    if (companion.art.bubbleColor !== undefined && !/^#[0-9a-f]{6}$/i.test(companion.art.bubbleColor)) {
      problems.push(`${companion.key}.bubbleColor = "${companion.art.bubbleColor}"`);
    }
    if (companion.art.bubbleBurst !== undefined) {
      const n = companion.art.bubbleBurst;
      if (!Number.isInteger(n) || n < 0 || n > 6) {
        problems.push(`${companion.key}.bubbleBurst = ${n}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('only weapons that actually use a gel blade declare a gradient', () => {
  const raw = JSON.parse(readFileSync(path.join('src', 'game', 'companions.json'), 'utf8'));
  const wrong = [];
  for (const companion of raw.companions) {
    if (companion.art.bladeGradient && companion.art.weapon !== 'rapier') {
      wrong.push(`${companion.key} has a bladeGradient but wields a ${companion.art.weapon}`);
    }
  }
  assert.deepEqual(wrong, []);
});

test('the Slime Princess matches her brief', () => {
  // "ดาบเรเปียร์เจลกรดสีเขียวมรกต-ฟ้าคราม พร้อมฟองสบู่กรดแรงดันสูงแตกกระจาย 4 ลูก"
  const raw = JSON.parse(readFileSync(path.join('src', 'game', 'companions.json'), 'utf8'));
  const princess = raw.companions.find(c => c.key === 'slime_princess');
  assert.ok(princess, 'the Slime Princess companion must exist');
  assert.equal(princess.art.weapon, 'rapier', 'she is defined by her rapier');
  assert.equal(princess.art.body, 'slime', 'she is a slime');
  assert.deepEqual(
    princess.art.bladeGradient,
    ['#34d399', '#38bdf8'],
    'the gel blade must grade emerald -> sapphire'
  );
  assert.equal(princess.art.bubbleBurst, 4, 'her brief specifies exactly four bursting bubbles');
  assert.equal(raw.roster['Slime Princess Aurelia'], 'slime_princess', 'the town boss recurs as her');
});

test('each companion has a silhouette of its own', () => {
  // Names promise specific characters, so two companions must never share the same accessory
  // combination. This catches a copy-pasted art recipe.
  const signatures = new Map();
  const clashes = [];
  for (const profile of profiles) {
    const a = profile.art;
    const signature = [a.body, a.ears, a.horns, a.wings, a.tail, a.headwear, a.weapon, a.outfitStyle, a.pattern].join('|');
    if (signatures.has(signature)) clashes.push(`${profile.key} == ${signatures.get(signature)}`);
    else signatures.set(signature, profile.key);
  }
  assert.deepEqual(clashes, []);
});
