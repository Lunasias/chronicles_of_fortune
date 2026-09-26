// Exports the 64x64 isometric tree models to PNG.
//
// The map's foliage used to be smooth vector art on a 68x88 canvas, resampled into a 64x84 blit.
// It is now painted from a plain RGBA buffer like every other model in the game, so the same art
// can be exported here and re-painted byte-for-byte by tests/foliage.test.mjs.
//
// Requires the compiled painter, so run it through `npm run gen:foliage`, which compiles
// tsconfig.test.json first.
//
// Usage:
//   npm run gen:foliage
//   node scripts/generate_foliage_sprites.cjs --sheet
//   node scripts/generate_foliage_sprites.cjs --sheet --scale=5
const fs = require('fs');
const path = require('path');
const { exportModels, writeContactSheet } = require('./lib/contact_sheet.cjs');

const OUT_DIR = path.join('public', 'assets', 'foliage');
const BUILD = path.join('.test-build', 'engine', 'IsometricFoliagePainter.js');

/** How many silhouette variants each species exports, matching the renderer's `node.id % 4`. */
const VARIANTS = 4;

async function main() {
  if (!fs.existsSync(BUILD)) {
    console.error(`${BUILD} not found - run \`npm run gen:foliage\` (it compiles first).`);
    process.exit(1);
  }

  const { paintFoliage, FOLIAGE_KINDS, FOLIAGE_SIZE } = await import(`../${BUILD.replace(/\\/g, '/')}`);

  const cells = [];
  for (const kind of FOLIAGE_KINDS) {
    for (let v = 0; v < VARIANTS; v++) {
      const surface = paintFoliage(kind, v);
      if (surface.w !== FOLIAGE_SIZE || surface.h !== FOLIAGE_SIZE) {
        throw new Error(`${kind} v${v} painted at ${surface.w}x${surface.h}, expected ${FOLIAGE_SIZE}`);
      }
      cells.push({ label: `${kind}_v${v}`, surface, kind, variant: v });
    }
  }

  exportModels({ outDir: OUT_DIR, cells, noun: 'tree models' });

  if (process.argv.includes('--sheet')) {
    const scaleArg = process.argv.find(a => a.startsWith('--scale='));
    const scale = scaleArg ? Math.max(1, Math.min(8, Number(scaleArg.split('=')[1]) || 4)) : 4;
    writeContactSheet({
      outFile: '.foliage-sheet.png',
      cells,
      scale,
      // One row per species, one column per silhouette variant.
      cols: VARIANTS,
      title: 'tree models',
      note: `  ${FOLIAGE_KINDS.length} species x ${VARIANTS} silhouettes; each row is one species.`
    });
  }
}

main();
