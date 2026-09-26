// Every companion must have a real 64x64 pixel-art model on disk.
//
// The models are generated from src/game/companions.json by
// scripts/generate_companion_sprites.cjs, and the runtime resolves them through the same
// JSON. These tests make "a companion with no model" impossible to merge, which is exactly
// the state the game was in before the models existed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
    hairStyle: ['long', 'twin', 'short', 'bun', 'ponytail'],
    body: ['human', 'slime', 'ghost', 'mech', 'mermaid'],
    ears: ['none', 'goblin', 'dog', 'wolf', 'cat', 'fox', 'elf', 'yeti'],
    horns: ['none', 'dragon', 'imp', 'demon'],
    wings: ['none', 'dragon', 'bat', 'feather'],
    tail: ['none', 'dog', 'fox9', 'cat', 'scorpion', 'mermaid', 'dragon', 'slime'],
    headwear: ['none', 'maid', 'hat', 'crown', 'turban', 'bandana', 'bandage', 'mask', 'flower', 'halo'],
    weapon: ['none', 'dagger', 'sword', 'staff', 'gun', 'fan', 'claw']
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
  }
  assert.deepEqual(problems, []);
});
