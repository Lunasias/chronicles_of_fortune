// Lossless delivery copies preserve original authoring PNGs and exact visible pixels.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../public/assets/art-v2');
(async () => {
  const files = fs.readdirSync(path.join(root, 'backdrops-v1')).filter(f => f.endsWith('.png')).map(f => path.join('backdrops-v1', f));
  files.push(...fs.readdirSync(root).filter(f => /(?:warrior|magician|cleric|thief|spellblade|ranger)-(?:motion|actions)-atlas\.png$/.test(f)));
  const report = { encoding: 'lossless WebP', files: [], originalBytes: 0, deliveryBytes: 0 };
  for (const relative of files) {
    const source = path.join(root, relative), destination = source.replace(/\.png$/, '.webp');
    await sharp(source).webp({ lossless: true, effort: 6 }).toFile(destination);
    const a = await sharp(source).ensureAlpha().raw().toBuffer(), b = await sharp(destination).ensureAlpha().raw().toBuffer();
    if (a.length !== b.length) throw new Error('Image dimensions changed: ' + relative);
    for (let i = 0; i < a.length; i += 4) if (a[i + 3] !== b[i + 3] || a[i + 3] && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) throw new Error('Visible pixels changed: ' + relative);
    const original = fs.statSync(source).size, delivery = fs.statSync(destination).size;
    report.files.push({ file: relative.replaceAll('\\', '/'), original, delivery, visiblePixelsIdentical: true });
    report.originalBytes += original; report.deliveryBytes += delivery;
  }
  report.reductionPercent = +(100 * (1 - report.deliveryBytes / report.originalBytes)).toFixed(1);
  fs.mkdirSync(path.resolve(__dirname, '../docs/quality-v3'), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, '../docs/quality-v3/asset-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ files: report.files.length, originalBytes: report.originalBytes, deliveryBytes: report.deliveryBytes, reductionPercent: report.reductionPercent }));
})().catch(error => { console.error(error); process.exitCode = 1; });
