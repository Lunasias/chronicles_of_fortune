/* Package generated source artwork; no image generation happens in this script.
 * Run npm run pretest first. Set NODE_PATH to a directory containing sharp.
 * First run: node scripts/package-map-completion.cjs <generated-image-directory>
 * Later runs reuse the versioned sources stored with the assets. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public/assets/map-completion-v1');
const sources = path.join(output, 'sources');
const ui = path.join(root, 'public/assets/generated');
const inputs = {
  'world-loading.png': 'exec-978774ac-fdc7-48e9-b616-c956fa27e2c6.png',
  'fortune-ui-frame.png': 'exec-5b3076fa-0c26-4b33-a0fe-54cc2f8e368b.png',
  'nature-one.png': 'exec-e3a14292-6327-495e-b1c0-8fe01802240e.png',
  'nature-two.png': 'exec-8f5cb2d3-78c6-49b3-8f3d-d87da1d71768.png',
  'scenery.png': 'exec-195cea6e-1936-4cde-97c6-61bd6407d755.png',
};
const sheets = [
  { file: 'nature-one.png', columns: 3, rows: 3, keys: ['grass','forest','waterfall_forest','snow','desert','volcano','cavern','coral','abyss'].map(theme => `${theme}-nature_large`) },
  { file: 'nature-two.png', columns: 3, rows: 3, keys: ['castle','fairy_grove','crystal_cavern','celestial','steampunk','sakura_shrine','dungeon_catacombs','dungeon_volcano','dungeon_ice'].map(theme => `${theme}-nature_large`) },
  { file: 'scenery.png', columns: 3, rows: 2, keys: ['abyss-capital','abyss-tavern','dungeon_volcano-landmark','dungeon_volcano-isekai_event','volcano-capital','volcano-bridge'] },
];
async function main() {
  fs.mkdirSync(sources, { recursive: true }); fs.mkdirSync(ui, { recursive: true });
  if (process.argv[2]) for (const [name, original] of Object.entries(inputs)) fs.copyFileSync(path.join(process.argv[2], original), path.join(sources, name));
  const { splitRegionalAtlas, regionalSpriteFit } = await import('../.test-build/engine/RegionalSpriteExtraction.js');
  const inventory = [];
  for (const sheet of sheets) {
    const { data, info } = await sharp(path.join(sources, sheet.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const regions = splitRegionalAtlas(new Uint8ClampedArray(data), info.width, info.height, sheet.columns, sheet.rows);
    for (const [index, name] of sheet.keys.entries()) {
      const region = regions[index];
      if (!region) throw new Error(`Missing generated subject: ${name}`);
      const fit = regionalSpriteFit(region.width, region.height, 256, 12);
      const image = await sharp(Buffer.from(region.pixels), { raw: { width: region.width, height: region.height, channels: 4 } })
        .resize(fit.width, fit.height, { kernel: 'nearest' }).png().toBuffer();
      const destination = path.join(output, `${name}.png`);
      await sharp({ create: { width: 256, height: 256, channels: 4, background: '#00000000' } })
        .composite([{ input: image, left: fit.x, top: fit.y }]).png().toFile(destination);
      const { data: pixels } = await sharp(destination).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let solid = 0, edge = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] >= 80) { solid++; if (!x || !y || x === 255 || y === 255) edge++; }
      if (solid < 800 || edge) throw new Error(`Invalid full-object export: ${name}, solid=${solid}, edge=${edge}`);
      inventory.push({ file: `${name}.png`, source: sheet.file, cell: index, sourceBounds: [region.width, region.height], width: 256, height: 256, solid, edge, sha256: crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') });
    }
  }
  await sharp(path.join(sources, 'world-loading.png')).webp({ quality: 90 }).toFile(path.join(ui, 'world-loading-v1.webp'));
  await sharp(path.join(sources, 'fortune-ui-frame.png')).resize(1024, 1024, { kernel: 'nearest' }).webp({ lossless: true }).toFile(path.join(ui, 'fortune-ui-frame-v1.webp'));
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ generated: '2026-10-22', tool: 'built-in image_gen', sources: inputs, assets: inventory }, null, 2) + '\n');
  const layers = [];
  for (const [index, asset] of inventory.entries()) {
    const x = index % 6 * 192, y = Math.floor(index / 6) * 211;
    layers.push({ input: await sharp(path.join(output, asset.file)).resize(176, 176, { kernel: 'nearest' }).png().toBuffer(), left: x + 8, top: y });
    const label = asset.file.replace('.png', '').replace('-nature_large', '');
    layers.push({ input: Buffer.from(`<svg width="192" height="32"><text x="96" y="13" fill="#e5d6ad" font-family="sans-serif" font-size="10" text-anchor="middle">${label}</text></svg>`), left: x, top: y + 179 });
  }
  const review = path.join(root, 'docs/art-review/map-completion-v1');
  fs.mkdirSync(review, { recursive: true });
  await sharp({ create: { width: 1152, height: 844, channels: 4, background: '#14232b' } }).composite(layers).png().toFile(path.join(review, 'new-art-contact-sheet.png'));
  console.log(`Packaged ${inventory.length} complete map sprites and 2 UI/loading images.`);
  console.log(inventory.map(item => `${item.file}: ${item.sourceBounds.join('x')}, ${item.solid} solid pixels, ${item.edge} edge pixels`).join('\n'));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
