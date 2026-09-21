const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG parser to get width, height, and raw RGBA pixels
function readPngRgba(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 1, 4) !== 'PNG') return null;

  let width = buf.readUInt32BE(16);
  let height = buf.readUInt32BE(20);
  let bitDepth = buf[24];
  let colorType = buf[25]; // 6 is RGBA, 2 is RGB, 3 is palette

  // Let's find IDAT chunks
  let pos = 8;
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idats.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const compressed = Buffer.concat(idats);
  try {
    const uncompressed = zlib.inflateSync(compressed);
    return { width, height, bitDepth, colorType, raw: uncompressed };
  } catch (e) {
    return { width, height, error: e.message };
  }
}

const testFiles = [
  { name: 'Slime blue', path: 'public/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime blue.png' },
  { name: 'Doggy', path: 'public/assets/GandalfHardcore Pet companion/GandalfHardcore Pet companion/GandalfHardcore doggy sheet.png' },
  { name: 'Fox', path: 'public/assets/GandalfHardcore Pet companion/GandalfHardcore Pet companion/GandalfHardcore fox.png' },
  { name: 'Effects curved', path: 'public/assets/GandalfHardcore character effects/GandalfHardcore character effects/Character effects curved lines.png' },
  { name: 'Effects blood', path: 'public/assets/GandalfHardcore character effects/GandalfHardcore character effects/Character effects blood.png' },
  { name: 'Effects buff', path: 'public/assets/GandalfHardcore character effects/GandalfHardcore character effects/Character effects buff.png' },
  { name: 'HP bar', path: 'public/assets/GandalfHardcore Hp bar/GandalfHardcore Hp bar/Hp bar.png' }
];

testFiles.forEach(t => {
  const res = readPngRgba(t.path);
  if (res) {
    console.log(`${t.name}: ${res.width}x${res.height}, colorType=${res.colorType}, rawLen=${res.raw ? res.raw.length : 'none'}`);
  }
});
