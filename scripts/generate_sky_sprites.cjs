// Exports the sky strips and celestial bodies, and writes a review sheet for the clouds.
//
// The background used to be canvas gradients and arcs, so there was nothing to export. It is now
// painted from plain RGBA buffers, which means the sky and the sun/moon can be committed as
// canonical art and re-painted byte-for-byte by tests/sky.test.mjs.
//
// Clouds are exported to the review sheet only. There are 72 of them (2 kinds x 3 shapes x 3
// sizes x 4 times of day) and, like the floor props, they are the sort of art a structural test
// covers better than a golden file.
//
// Requires the compiled painter, so run it through `npm run gen:sky`, which compiles
// tsconfig.test.json first.
//
// Usage:
//   npm run gen:sky
//   node scripts/generate_sky_sprites.cjs --scale=2
const fs = require('fs');
const path = require('path');
const { exportModels, writeContactSheet } = require('./lib/contact_sheet.cjs');

const OUT_DIR = path.join('public', 'assets', 'sky');
const BUILD = path.join('.test-build', 'engine', 'SkyPainter.js');

/** Height the committed sky strips are painted at. The game stretches them per viewport. */
const SKY_EXPORT_H = 512;
const SUN_RADIUS = 40;
const MOON_RADIUS = 34;

async function main() {
  if (!fs.existsSync(BUILD)) {
    console.error(`${BUILD} not found - run \`npm run gen:sky\` (it compiles first).`);
    process.exit(1);
  }

  const { paintSky, paintCloud, paintCelestial, SKY_TIMES, SKY_TILE_W, CLOUD_SIZES, CLOUD_VARIANTS } =
    await import(`../${BUILD.replace(/\\/g, '/')}`);

  // 1. The canonical exported art: the four skies and the celestial bodies.
  const skies = [];
  const bodies = [];
  for (const t of SKY_TIMES) {
    skies.push({ label: `sky_${t.toLowerCase()}`, surface: paintSky(t, SKY_EXPORT_H) });
    bodies.push({ label: `sun_${t.toLowerCase()}`, surface: paintCelestial(SUN_RADIUS, t, false) });
  }
  bodies.push({ label: 'moon', surface: paintCelestial(MOON_RADIUS, 'NIGHT', true) });

  exportModels({ outDir: OUT_DIR, cells: [...skies, ...bodies], noun: 'sky models' });
  const scaleArg = process.argv.find(a => a.startsWith('--scale='));
  const scale = scaleArg ? Math.max(1, Math.min(8, Number(scaleArg.split('=')[1]) || 2)) : 2;

  // 2. Review sheets. A contact sheet needs uniform cells, and a 64x512 sky strip and a 244x244
  // sun cannot share a grid, so they get one sheet each.
  writeContactSheet({
    outFile: '.sky-sheet.png',
    cells: skies,
    scale,
    cols: SKY_TIMES.length,
    title: 'sky strips',
    note: `  ${SKY_TIMES.length} skies at ${SKY_TILE_W}x${SKY_EXPORT_H}, one per time of day.`
  });

  writeContactSheet({
    outFile: '.celestial-sheet.png',
    // A contact sheet needs uniform cells, and the moon is painted at a smaller radius than the
    // sun, so the sheet shows it at the sun's radius. The committed sprite keeps its own size.
    cells: [
      ...SKY_TIMES.map(t => ({ label: `sun_${t.toLowerCase()}`, surface: paintCelestial(SUN_RADIUS, t, false) })),
      { label: 'moon', surface: paintCelestial(SUN_RADIUS, 'NIGHT', true) }
    ],
    scale: 1,
    cols: SKY_TIMES.length + 1,
    title: 'celestial bodies',
    note: '  sun per time of day, then the crescent moon.'
  });

  // 3. Review sheet: every cloud. One row per time of day, sky shapes then sea shapes. The three
  // size buckets differ, so the sheet uses a fixed cell and centres each cloud in it.
  const clouds = [];
  for (const t of SKY_TIMES) {
    for (const kind of ['sky', 'sea']) {
      for (let v = 0; v < CLOUD_VARIANTS; v++) {
        for (let sz = 0; sz < CLOUD_SIZES.length; sz++) {
          clouds.push({ label: `${kind}_${t}_v${v}_s${sz}`, surface: paintCloud(kind, v, sz, t) });
        }
      }
    }
  }
  const maxW = CLOUD_SIZES[CLOUD_SIZES.length - 1];
  writeContactSheet({
    outFile: '.cloud-sheet.png',
    cells: clouds,
    scale: 1,
    cols: CLOUD_VARIANTS * CLOUD_SIZES.length * 2,
    cellW: maxW,
    cellH: Math.round(maxW * 0.4),
    title: 'clouds',
    note: `  ${clouds.length} clouds: rows are time of day (sky shapes then sea shapes), columns are shape x size (${CLOUD_SIZES.join('/')}px).`
  });
}

main();
