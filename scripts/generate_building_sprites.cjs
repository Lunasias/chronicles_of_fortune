// Exports the 64x64 isometric structure models to PNG.
//
// The game paints these at runtime (they take an owner colour for towns and homes, which a
// fixed PNG cannot carry), so the PNGs are the canonical exported art: tests/buildings.test.mjs
// re-paints every structure and compares it byte-for-byte against the committed file, which
// makes drift between the code and the exported images impossible.
//
// Requires the compiled painter, so run it through `npm run gen:buildings`, which compiles
// tsconfig.test.json first.
//
// Usage:
//   npm run gen:buildings
//   node scripts/generate_building_sprites.cjs --sheet        # also write a review sheet
//   node scripts/generate_building_sprites.cjs --sheet --scale=4
const fs = require('fs');
const path = require('path');
const { exportModels, writeContactSheet } = require('./lib/contact_sheet.cjs');

const OUT_DIR = path.join('public', 'assets', 'buildings');
const BUILD = path.join('.test-build', 'engine', 'IsometricBuildingPainter.js');

/**
 * Canonical structures. `capital` and `boss` are aliases that paint identically to `town` and
 * `dark_gate`, so exporting them separately would only create duplicate files.
 */
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

async function main() {
  if (!fs.existsSync(BUILD)) {
    console.error(`${BUILD} not found - run \`npm run gen:buildings\` (it compiles first).`);
    process.exit(1);
  }

  const { paintBuilding, BUILDING_SIZE } = await import(`../${BUILD.replace(/\\/g, '/')}`);

  const cells = KINDS.map(kind => {
    const surface = paintBuilding(kind, null);
    if (surface.w !== BUILDING_SIZE || surface.h !== BUILDING_SIZE) {
      throw new Error(`${kind} painted at ${surface.w}x${surface.h}, expected ${BUILDING_SIZE}`);
    }
    return { label: kind, surface };
  });

  exportModels({ outDir: OUT_DIR, cells, noun: 'structure models' });

  if (process.argv.includes('--sheet')) {
    const scaleArg = process.argv.find(a => a.startsWith('--scale='));
    const scale = scaleArg ? Math.max(1, Math.min(8, Number(scaleArg.split('=')[1]) || 4)) : 4;
    writeContactSheet({
      outFile: '.building-sheet.png',
      cells,
      scale,
      cols: 5,
      title: 'models',
      note: '  every structure is lit from the top-left: left face mid, right face dark.'
    });
  }
}

main();
