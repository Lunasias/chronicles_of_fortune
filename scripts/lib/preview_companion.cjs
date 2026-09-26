// Terminal preview + quantitative checks for generated companion sprites.
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png.cjs');

const dir = path.join('public', 'assets', 'companions');
const DATA = path.join('src', 'game', 'companions.json');

// Default to every companion so a bare run is a full regression check.
const requested = process.argv.slice(2).filter(a => !a.startsWith('--'));
const keys = requested.length
  ? requested
  : JSON.parse(fs.readFileSync(DATA, 'utf8')).companions.map(c => c.key);

const RAMP = ' .:-=+*#%@';

function preview(key) {
  const { width, height, pixels } = decodePNG(path.join(dir, `${key}.png`));
  const opaque = [];
  let minX = 99, maxX = -1, minY = 99, maxY = -1, opaqueCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = pixels[(y * width + x) * 4 + 3];
      if (a > 40) {
        opaqueCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (process.argv.includes('--quiet')) {
    console.log(
      `${key.padEnd(16)} opaque=${String(opaqueCount).padStart(4)} box=(${minX},${minY})-(${maxX},${maxY}) ` +
        `size=${maxX - minX + 1}x${maxY - minY + 1}`
    );
    return;
  }

  console.log(`\n=== ${key}  ${width}x${height}  opaque=${opaqueCount}  box=(${minX},${minY})-(${maxX},${maxY}) ===`);
  // 2x2 -> 1 char, alpha coverage mapped through a brightness ramp.
  for (let by = 0; by < height; by += 2) {
    let line = '';
    for (let bx = 0; bx < width; bx += 2) {
      let alphaSum = 0;
      let lumSum = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((by + dy) * width + (bx + dx)) * 4;
          const a = pixels[i + 3] / 255;
          alphaSum += a;
          const lum = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
          lumSum += lum * a;
        }
      }
      const coverage = alphaSum / 4;
      if (coverage < 0.15) { line += ' '; continue; }
      const lum = lumSum / Math.max(0.001, alphaSum);
      const idx = Math.max(1, Math.min(RAMP.length - 1, Math.round(lum * (RAMP.length - 1) * coverage + 1)));
      line += RAMP[idx];
    }
    console.log(line.replace(/\s+$/, ''));
  }
}

for (const key of keys) preview(key);
