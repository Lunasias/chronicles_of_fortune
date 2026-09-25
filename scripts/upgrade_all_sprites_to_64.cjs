const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// =============================================================================
// PNG DECODER & ENCODER (Pure Node.js with built-in zlib)
// =============================================================================

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let idatBuffers = [];
  let width = 0, height = 0;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatBuffers.push(buf.slice(pos + 8, pos + 8 + len));
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatBuffers));
  const bpp = 4;
  const scanline = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }

  let srcPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < scanline; x++) {
      const byte = decompressed[srcPos++];
      const left = x >= bpp ? pixels[y * scanline + (x - bpp)] : 0;
      const up = y > 0 ? pixels[(y - 1) * scanline + x] : 0;
      const upLeft = (y > 0 && x >= bpp) ? pixels[(y - 1) * scanline + (x - bpp)] : 0;
      let val = 0;
      if (filter === 0) val = byte;
      else if (filter === 1) val = (byte + left) & 0xFF;
      else if (filter === 2) val = (byte + up) & 0xFF;
      else if (filter === 3) val = (byte + Math.floor((left + up) / 2)) & 0xFF;
      else if (filter === 4) val = (byte + paeth(left, up, upLeft)) & 0xFF;
      pixels[y * scanline + x] = val;
    }
  }
  return { width, height, pixels };
}

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function encodePNG(width, height, rgbaBuffer) {
  const scanline = width * 4;
  const raw = Buffer.alloc(height * (scanline + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (scanline + 1)] = 0;
    rgbaBuffer.copy(raw, y * (scanline + 1) + 1, y * scanline, (y + 1) * scanline);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function makeChunk(type, data) {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0);
    b.write(type, 4, 4, 'ascii');
    data.copy(b, 8);
    const crcVal = crc32(b.slice(4, 8 + data.length));
    b.writeUInt32BE(crcVal, 8 + data.length);
    return b;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Convert 48x48 sprite to 64x64 pixel art sprite centered
// Offset X = (64 - 48)/2 = 8, Offset Y = (64 - 48)/2 = 8
// This preserves 100% pixel-perfect sharpness while standardizing all models to 64x64
function convert48to64(img) {
  const TARGET = 64;
  const out = Buffer.alloc(TARGET * TARGET * 4);
  const offsetX = Math.floor((TARGET - img.width) / 2);
  const offsetY = Math.floor((TARGET - img.height) / 2);

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const destIdx = ((y + offsetY) * TARGET + (x + offsetX)) * 4;
      out[destIdx] = img.pixels[srcIdx];
      out[destIdx + 1] = img.pixels[srcIdx + 1];
      out[destIdx + 2] = img.pixels[srcIdx + 2];
      out[destIdx + 3] = img.pixels[srcIdx + 3];
    }
  }

  return { width: TARGET, height: TARGET, pixels: out };
}

function processDirectory(dirPath) {
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const ent of entries) {
    const fullPath = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      count += processDirectory(fullPath);
    } else if (ent.name.endsWith('.png')) {
      const img = decodePNG(fullPath);
      if (img.width === 48 && img.height === 48) {
        const upgraded = convert48to64(img);
        const encoded = encodePNG(upgraded.width, upgraded.height, upgraded.pixels);
        fs.writeFileSync(fullPath, encoded);
        count++;
      }
    }
  }

  return count;
}

console.log('=== UPGRADING ALL 48x48 PIXEL ART SPRITES TO 64x64 HD STANDARD ===');
const rootAssets = path.join(__dirname, '..', 'public', 'assets');
const converted = processDirectory(rootAssets);
console.log(`\nSuccessfully converted and saved ${converted} sprites to 64x64 pixel art!`);
