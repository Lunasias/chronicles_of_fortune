// Exports the pixel-art board floor tiles to PNG.
//
// The floor was previously drawn with canvas vector calls (createLinearGradient, beginPath,
// stroke, ellipse), which antialiased and left the ground as the only soft-edged art in a game
// built from hard-edged pixel art. It is now painted from a plain RGBA buffer like every other
// model, so the same art can be exported here and re-painted byte-for-byte by
// tests/terrain.test.mjs.
//
// Requires the compiled painter, so run it through `npm run gen:terrain`, which compiles
// tsconfig.test.json first.
//
// Usage:
//   npm run gen:terrain
//   node scripts/generate_terrain_sprites.cjs --sheet
//   node scripts/generate_terrain_sprites.cjs --sheet --scale=3
const fs = require('fs');
const path = require('path');
const { exportModels, writeContactSheet } = require('./lib/contact_sheet.cjs');

const OUT_DIR = path.join('public', 'assets', 'terrain');
const BUILD = path.join('.test-build', 'engine', 'IsometricTerrainPainter.js');

/**
 * The four variants of every biome.
 *
 * All four are exported because all four are actually drawn: interior tiles use the flat sprite
 * and edge tiles the cliffed one, and every tile has a day and a night palette.
 */
const VARIANTS = [
  { suffix: 'flat_day', options: { cliffs: false, night: false } },
  { suffix: 'cliff_day', options: { cliffs: true, night: false } },
  { suffix: 'flat_night', options: { cliffs: false, night: true } },
  { suffix: 'cliff_night', options: { cliffs: true, night: true } }
];

async function main() {
  if (!fs.existsSync(BUILD)) {
    console.error(`${BUILD} not found - run \`npm run gen:terrain\` (it compiles first).`);
    process.exit(1);
  }

  const { paintTerrainTile, TERRAIN_BIOMES, TERRAIN_SPRITE_W, TERRAIN_SPRITE_H } =
    await import(`../${BUILD.replace(/\\/g, '/')}`);

  const cells = [];
  for (const biome of TERRAIN_BIOMES) {
    for (const v of VARIANTS) {
      const surface = paintTerrainTile(biome, v.options);
      if (surface.w !== TERRAIN_SPRITE_W || surface.h !== TERRAIN_SPRITE_H) {
        throw new Error(
          `${biome} ${v.suffix} painted at ${surface.w}x${surface.h}, expected ${TERRAIN_SPRITE_W}x${TERRAIN_SPRITE_H}`
        );
      }
      cells.push({ label: `${biome}_${v.suffix}`, surface, biome });
    }
  }

  exportModels({ outDir: OUT_DIR, cells, noun: 'floor tiles' });

  if (process.argv.includes('--sheet')) {
    const scaleArg = process.argv.find(a => a.startsWith('--scale='));
    const scale = scaleArg ? Math.max(1, Math.min(8, Number(scaleArg.split('=')[1]) || 3)) : 3;
    writeContactSheet({
      outFile: '.terrain-sheet.png',
      cells,
      scale,
      // One row per biome: flat day, cliff day, flat night, cliff night.
      cols: VARIANTS.length,
      title: 'floor tiles',
      note: `  ${TERRAIN_BIOMES.length} biomes; each row is flat-day, cliff-day, flat-night, cliff-night.`
    });
  }
}

main();
