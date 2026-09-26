// Writes a review sheet for the board's floor clutter.
//
// Unlike the structures, trees and floor tiles, the props are never loaded from disk - the game
// paints them into a canvas cache at runtime - so there is nothing for a byte-for-byte PNG test
// to protect. Exporting 600-odd prop PNGs would add a lot of binary noise for no coverage that
// tests/props.test.mjs does not already provide, so this script writes one contact sheet for
// review and nothing else.
//
// Usage:
//   npm run gen:props
//   node scripts/generate_prop_sprites.cjs --scale=4
const fs = require('fs');
const path = require('path');
const { writeContactSheet } = require('./lib/contact_sheet.cjs');

const BUILD = path.join('.test-build', 'engine', 'IsometricPropPainter.js');

async function main() {
  if (!fs.existsSync(BUILD)) {
    console.error(`${BUILD} not found - run \`npm run gen:props\` (it compiles first).`);
    process.exit(1);
  }

  const { paintProp, PROP_TYPES, PROP_VARIANTS, PROP_SIZES, PROP_SIZE } = await import(
    `../${BUILD.replace(/\\/g, '/')}`
  );
  const { TERRAIN_BIOMES } = await import('../.test-build/engine/IsometricTerrainPainter.js');

  const scaleArg = process.argv.find(a => a.startsWith('--scale='));
  const scale = scaleArg ? Math.max(1, Math.min(8, Number(scaleArg.split('=')[1]) || 3)) : 3;

  // One row per (type, time of day), one column per biome. Variant and size are held at 0 and 1
  // so the sheet stays readable; they are exercised by the test suite instead.
  const cells = [];
  let bad = 0;
  for (const night of [false, true]) {
    for (const type of PROP_TYPES) {
      for (const biome of TERRAIN_BIOMES) {
        const surface = paintProp(type, { biome, variant: 0, size: 1, night, pulse: 1 });
        if (surface.w !== PROP_SIZE || surface.h !== PROP_SIZE) bad++;
        cells.push({
          label: `${type}_${biome}_${night ? 'night' : 'day'}`,
          surface
        });
      }
    }
  }
  if (bad) throw new Error(`${bad} props painted at the wrong size`);

  writeContactSheet({
    outFile: '.prop-sheet.png',
    cells,
    scale,
    cols: TERRAIN_BIOMES.length,
    title: 'floor props',
    note: `  rows: ${PROP_TYPES.length} prop types x day/night; columns: ${TERRAIN_BIOMES.length} biomes.`
  });

  const variants = [];
  for (const type of PROP_TYPES) {
    for (let v = 0; v < PROP_VARIANTS; v++) {
      for (let sz = 0; sz < PROP_SIZES; sz++) {
        variants.push({ label: `${type}_v${v}_s${sz}`, surface: paintProp(type, { biome: 'grass', variant: v, size: sz }) });
      }
    }
  }
  writeContactSheet({
    outFile: '.prop-variants-sheet.png',
    cells: variants,
    scale,
    cols: PROP_VARIANTS * PROP_SIZES,
    title: 'prop variants',
    note: `  every ${PROP_TYPES.length} types x ${PROP_VARIANTS} variants x ${PROP_SIZES} sizes, on grassland.`
  });
}

main();
