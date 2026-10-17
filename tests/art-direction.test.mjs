import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isolateAtlasCell } from '../.test-build/engine/AtlasSprites.js';
import { atlasRowCuts, classPoseRow } from '../.test-build/engine/ClassArtAtlas.js';
import { normalizeGraphicsPreferences, animationPoseIndex, actorScaleForViewport, EffectClock } from '../.test-build/engine/ArtDirection.js';
import { customIsometricHeroRenderer } from '../.test-build/engine/CustomIsometricHeroRenderer.js';
import { JOB_PROMOTIONS, TIER3_PROMOTIONS } from '../.test-build/game/Player.js';
import png from '../scripts/lib/png.cjs';
import { MAGIC_PALETTES, magicElementForJob } from '../.test-build/engine/MagicArt.js';
import { generatedCombatArt } from '../.test-build/engine/GeneratedCombatArt.js';
import { CombatVFXEngine, fitEffectText } from '../.test-build/engine/CombatVFXEngine.js';
import { foliageForBiome } from '../.test-build/engine/BiomeArt.js';

test('atlas extraction discards detached neighbor fragments and retains the full main sprite', () => {
  const pixels = new Uint8ClampedArray(10 * 10 * 4);
  const fill = (x, y) => { pixels[(y * 10 + x) * 4 + 3] = 255; };
  for (let y = 3; y < 9; y++) for (let x = 2; x < 8; x++) fill(x, y);
  fill(0, 0); fill(1, 0);
  isolateAtlasCell(pixels, 10, 10);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[(8 * 10 + 7) * 4 + 3], 255);
  assert.equal([...pixels].filter((value, i) => i % 4 === 3 && value === 255).length, 36);
});

test('graphics preferences tolerate damaged storage and retain valid accessibility choices', () => {
  assert.deepEqual(normalizeGraphicsPreferences(null), { quality: 'high', reducedMotion: false, labels: 'hover' });
  assert.deepEqual(normalizeGraphicsPreferences({ quality: 'ultra', reducedMotion: 'false', labels: 'unknown' }), normalizeGraphicsPreferences(null));
  assert.deepEqual(normalizeGraphicsPreferences({ quality: 'balanced', reducedMotion: true, labels: 'all' }), { quality: 'balanced', reducedMotion: true, labels: 'all' });
});

test('attack timing reaches impact and recovery without repeating the wind-up', () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, i) => animationPoseIndex('attack', i)), [0, 0, 1, 2, 2, 3, 3, 3]);
  assert.equal(animationPoseIndex('idle', NaN), 0);
  assert.equal(classPoseRow('attack', 5), 6);
  assert.equal(classPoseRow('attack', 5, true), 5);
  for (const [w, h] of [[390, 844], [768, 600], [1280, 720], [1920, 1080]]) assert.equal(Number.isInteger(actorScaleForViewport(w, h)), true);
  assert.equal(actorScaleForViewport(1920, 770), 3);
  assert.equal(actorScaleForViewport(1920, 350), 1);
});

test('effect duration is consistent at 30, 60, 144 and 240 Hz and bounds resume catch-up', () => {
  for (const hz of [30, 60, 144, 240]) {
    const clock = new EffectClock();
    clock.reset(0);
    let total = 0;
    for (let frame = 1; frame <= hz; frame++) total += clock.advance(frame * 1000 / hz);
    assert.equal(total, 60, `${hz} Hz`);
    assert.equal(clock.advance(11000), 6);
    clock.reset(12000);
    assert.equal(clock.advance(12000), 0);
  }
});

test('job rendering preserves ranger identity and maps promoted knight bases', () => {
  assert.equal(customIsometricHeroRenderer.normalizeClassKey('ranger'), 'ranger');
  assert.equal(customIsometricHeroRenderer.normalizeClassKey('paladin'), 'warrior');
  assert.equal(customIsometricHeroRenderer.normalizeClassKey('berserker'), 'warrior');
});

test('every promoted job keeps the silhouette of its original playable class', () => {
  const roots = new Map();
  for (const [base, promotions] of Object.entries(JOB_PROMOTIONS)) for (const promotion of promotions) {
    roots.set(promotion.tier2Key, base);
    assert.equal(customIsometricHeroRenderer.normalizeClassKey(promotion.tier2Key), base, promotion.tier2Key);
  }
  for (const [parent, promotions] of Object.entries(TIER3_PROMOTIONS)) for (const promotion of promotions) {
    assert.equal(customIsometricHeroRenderer.normalizeClassKey(promotion.tier2Key), roots.get(parent), promotion.tier2Key);
  }
});

test('the cleric run cycle never picks the prayer or casting row', () => {
  for (let frame = 0; frame < 8; frame++) assert.ok(classPoseRow('run', frame, true) <= 2);
});

test('world and battle vegetation preserve the identity of special realms', () => {
  for (const realm of ['abyss', 'cavern', 'crystal_cavern', 'fairy_grove']) assert.equal(foliageForBiome(realm), 'gloom_spore');
  for (const realm of ['coral', 'celestial']) assert.equal(foliageForBiome(realm), null);
  assert.equal(foliageForBiome('sakura_shrine'), 'blood_willow');
  assert.equal(foliageForBiome('snow'), 'frost_pine');
  assert.equal(foliageForBiome('forest'), 'dark_oak');
});

test('all shipped class atlases contain an occupied sprite in every direction and pose cell', () => {
  for (const job of ['warrior', 'magician', 'thief', 'cleric', 'spellblade', 'ranger']) {
    const file = `public/assets/art-v2/${job}-motion-atlas.png`;
    assert.equal(readFileSync(file)[25], 6, `${job}: RGBA source required`);
    const { width, height, pixels } = png.decodePNG(file);
    const rows = job === 'cleric' ? 6 : 7;
    const cuts = atlasRowCuts(pixels, width, height, rows);
    for (let row = 0; row < rows; row++) for (let col = 0; col < 8; col++) {
      let solid = 0;
      for (let y = cuts[row]; y < cuts[row + 1]; y++) for (let x = Math.round(col * width / 8); x < Math.round((col + 1) * width / 8); x++) {
        if (pixels[(y * width + x) * 4 + 3] >= 80) solid++;
      }
      assert.ok(solid > 500, `${job} row ${row} direction ${col}: missing body`);
    }
  }
});

test('supplemental actions, monsters and companions have no empty production cells', () => {
  const sheets = [
    ...['warrior', 'magician', 'thief', 'cleric', 'spellblade', 'ranger'].map(job => [`${job}-actions`, 8, 6]),
    ...['wild', 'frontier', 'mythic'].map(group => [`monsters-${group}`, 4, 6]),
    ...['wild', 'frontier', 'mythic'].map(group => [`monsters-${group}-actions`, 4, 6]),
    ['companions', 6, 5], ['kingdom-buildings', 4, 4], ['kingdom-foliage', 4, 5]
  ];
  for (const [name, cols, rows] of sheets) {
    const { width, height, pixels } = png.decodePNG(`public/assets/art-v2/${name}-atlas.png`);
    const cuts = atlasRowCuts(pixels, width, height, rows);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      let solid = 0;
      for (let y = cuts[row]; y < cuts[row + 1]; y++) for (let x = Math.round(col * width / cols); x < Math.round((col + 1) * width / cols); x++) {
        if (pixels[(y * width + x) * 4 + 3] >= 80) solid++;
      }
      assert.ok(solid > 300, `${name} / row ${row} / col ${col}: empty or damaged cell`);
    }
  }
});

test('promoted magic retains its elemental identity and each element has a distinct ramp', () => {
  assert.equal(magicElementForJob('lich_king'), 'shadow');
  assert.equal(magicElementForJob('seraphic_saint'), 'holy');
  assert.equal(magicElementForJob('rune_sovereign'), 'storm');
  assert.equal(magicElementForJob('ranger'), 'nature');
  assert.equal(magicElementForJob(undefined), 'arcane');
  assert.equal(new Set(Object.values(MAGIC_PALETTES).map(ramp => ramp.join())).size, 7);
});

test('combat spells use generated image frames and preserve the caller canvas state', () => {
  const fx=new CombatVFXEngine();fx.spawnMagicHit(100,120,false,'frost');fx.spawnCompanionSummonPortal(450,190);for(let i=0;i<20;i++)fx.update();
  let depth=0,draws=0;const original=generatedCombatArt.frame;generatedCombatArt.frame=()=>({width:128,height:128});
  const ctx=new Proxy({}, {get:(t,k)=>k==='save'?()=>depth++:k==='restore'?()=>{assert.ok(depth>0);depth--;}:k==='drawImage'?()=>draws++:k==='fillRect'?()=>assert.fail('procedural spell art must not be drawn'):t[k]??(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
  try{fx.render(ctx,800,450);assert.equal(depth,0);assert.equal(draws,2);}finally{generatedCombatArt.frame=original;}
});

test('long combat announcements fit a narrow phone without stretching the text', () => {
  const ctx = { font: '', measureText(text) { return { width: Array.from(text).length * Number(this.font.match(/(\d+)px/)[1]) * .65 }; } };
  for (const width of [120, 240, 366]) {
    const text = fitEffectText(ctx, 'สไลม์สาวใสบริสุทธิ์ พุดดิ้ง (Slime Girl Pudding) Gelatin Shield Blast', width, 28);
    assert.ok(ctx.measureText(text).width <= width);
    assert.ok(Number.isInteger(Number(ctx.font.match(/(\d+)px/)[1])));
  }
});
