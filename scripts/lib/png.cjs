// Minimal PNG codec built on Node's zlib, shared by the sprite generator scripts.
//
// Extracted verbatim from scripts/generate_all_sprites.cjs so new generators do not have to
// copy it. `decodePNG` returns `{ width, height, pixels }` with `pixels` as raw RGBA.
const zlib = require('zlib');
const fs = require('fs');

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  const idatBuffers = [];
  let width = 0;
  let height = 0;
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
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  let srcPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < scanline; x++) {
      const byte = decompressed[srcPos++];
      const left = x >= bpp ? pixels[y * scanline + (x - bpp)] : 0;
      const up = y > 0 ? pixels[(y - 1) * scanline + x] : 0;
      const upLeft = y > 0 && x >= bpp ? pixels[(y - 1) * scanline + (x - bpp)] : 0;
      let val = 0;
      if (filter === 0) val = byte;
      else if (filter === 1) val = (byte + left) & 0xff;
      else if (filter === 2) val = (byte + up) & 0xff;
      else if (filter === 3) val = (byte + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) val = (byte + paeth(left, up, upLeft)) & 0xff;
      pixels[y * scanline + x] = val;
    }
  }
  return { width, height, pixels };
}

function crc32(buf) {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function encodePNG(width, height, rgbaBuffer) {
  const scanline = width * 4;
  const raw = Buffer.alloc(height * (scanline + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (scanline + 1)] = 0; // Filter 0 (None)
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

module.exports = { crc32, encodePNG, decodePNG };
