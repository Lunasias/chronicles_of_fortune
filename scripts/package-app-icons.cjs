// Rasterize the native vector emblem. Requires sharp via package resolution/NODE_PATH.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const publicDir = path.resolve(__dirname, '../public');
(async () => {
  const input = path.join(publicDir, 'favicon.svg');
  for (const size of [192, 512]) await sharp(input).resize(size, size, { kernel: 'nearest' }).png().toFile(path.join(publicDir, `icon-${size}.png`));
  const png = await sharp(input).resize(256, 256).png().toBuffer();
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([ico, png]));
  console.log('Packaged 192/512px install icons and favicon.ico from favicon.svg.');
})().catch(error => { console.error(error); process.exitCode = 1; });
