// Run with Vite serving the repository; export the same 128px canvases used in game.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { chromium } = require('playwright'), sharp = require('sharp');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.goto(process.env.FORTUNA_REVIEW_URL || 'http://localhost:5173');
    const themes = ['grass', 'forest', 'waterfall_forest', 'snow', 'desert', 'volcano', 'cavern', 'coral', 'abyss', 'castle', 'fairy_grove', 'crystal_cavern', 'celestial', 'steampunk', 'sakura_shrine', 'dungeon_catacombs', 'dungeon_volcano', 'dungeon_ice'];
    const manifest = {}, report = { method: 'pre-extracted original runtime sprites, lossless WebP', files: [], originalBytes: 0, deliveryBytes: 0 };
    const out = path.resolve(__dirname, '../public/assets/runtime-v3/regions'); fs.mkdirSync(out, { recursive: true });
    for (const theme of themes) {
      const data = await page.evaluate(async theme => {
        const { packageRegionalArt } = await import('/src/engine/PackageRegionalArt.ts');
        const slots = ['nature_large','nature_alternate','undergrowth','rocks','town','shop_item','shop_weapon','shop_magic','church','dark_gate','vault','boss','tavern','guild','fishing','isekai_event','mystery_chest','home','capital','bridge','cliff','landmark','wall','stairs'];
        return packageRegionalArt(theme, slots);
      }, theme);
      const png = Buffer.from(data.png, 'base64'), file = path.join(out, `${theme}.webp`);
      await sharp(png).webp({ lossless: true, effort: 6 }).toFile(file);
      const a = await sharp(png).ensureAlpha().raw().toBuffer(), b = await sharp(file).ensureAlpha().raw().toBuffer();
      if (a.length !== b.length) throw new Error('Packed sprite dimensions changed: ' + theme);
      for (let i = 0; i < a.length; i += 4) if (a[i + 3] !== b[i + 3] || a[i + 3] && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) throw new Error('Packed visible pixels changed: ' + theme);
      manifest[theme] = data.feet;
      const original = fs.statSync(path.resolve(__dirname, `../public/assets/art-v2/world-rebuild-v1/${theme}.png`)).size, delivery = fs.statSync(file).size;
      report.files.push({ theme, original, delivery, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), runtimePixelsIdentical: true });
      report.originalBytes += original; report.deliveryBytes += delivery;
    }
    fs.writeFileSync(path.resolve(__dirname, '../src/engine/region-delivery.json'), JSON.stringify(manifest, null, 2));
    const groundPng = Buffer.from(await page.evaluate(async () => (await import('/src/engine/PackageRegionalArt.ts')).packageGroundMaterials()), 'base64');
    const groundPath = path.join(out, '../ground-materials.webp'); await sharp(groundPng).webp({ lossless: true, effort: 6 }).toFile(groundPath);
    const before = await sharp(groundPng).ensureAlpha().raw().toBuffer(), after = await sharp(groundPath).ensureAlpha().raw().toBuffer();
    if (!before.equals(after)) throw new Error('Ground material pixels changed');
    report.ground = { original: fs.statSync(path.resolve(__dirname, '../public/assets/art-v2/world-rebuild-v1/ground-materials.png')).size, delivery: fs.statSync(groundPath).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(groundPath)).digest('hex'), runtimePixelsIdentical: true };
    report.originalBytes += report.ground.original; report.deliveryBytes += report.ground.delivery;
    report.reductionPercent = +(100 * (1 - report.deliveryBytes / report.originalBytes)).toFixed(1);
    fs.writeFileSync(path.resolve(__dirname, '../docs/quality-v3/region-delivery-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ originalBytes: report.originalBytes, deliveryBytes: report.deliveryBytes, reductionPercent: report.reductionPercent }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
