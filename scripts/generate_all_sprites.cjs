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
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// =============================================================================
// HELPER PIXEL & COLOR UTILITIES
// =============================================================================

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function clonePixels(srcBuf) {
  const dest = Buffer.alloc(srcBuf.length);
  srcBuf.copy(dest);
  return dest;
}

function setPixel(buf, w, h, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  buf[idx] = r;
  buf[idx + 1] = g;
  buf[idx + 2] = b;
  buf[idx + 3] = a;
}

function getPixel(buf, w, h, x, y) {
  if (x < 0 || x >= w || y < 0 || y >= h) return [0, 0, 0, 0];
  const idx = (y * w + x) * 4;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// =============================================================================
// LOAD BASE SPRITE FRAMES (from 'ดาบเวทสาว')
// =============================================================================

const BASE_DIR = 'public/assets/ดาบเวทสาว';
const DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

console.log('Loading base reference frames from:', BASE_DIR);

const baseIdle = {};
for (const dir of DIRECTIONS) {
  const p = path.join(BASE_DIR, 'Idle/rotations', `${dir}.png`);
  baseIdle[dir] = decodePNG(p);
}

const baseRun = {};
for (const dir of DIRECTIONS) {
  baseRun[dir] = [];
  for (let f = 0; f < 4; f++) {
    const p = path.join(BASE_DIR, 'Run/rotations', `${dir}_${f}.png`);
    baseRun[dir].push(decodePNG(p));
  }
}

const baseAttack = {};
for (const dir of DIRECTIONS) {
  baseAttack[dir] = [];
  for (let f = 0; f < 4; f++) {
    const p = path.join(BASE_DIR, 'Attack/rotations', `${dir}_${f}.png`);
    baseAttack[dir].push(decodePNG(p));
  }
}

console.log('Loaded all base frames: 8 Idle, 32 Run, 32 Attack = 72 base frames.');

function isSpriteHair(r, g, b, a, x, y) {
  if (a < 15) return false;
  // Exclude skin tones (warm peach / flesh)
  if (r > 190 && g > 130 && r > b + 25) return false;
  // Exclude glowing blue magic sword (strict check so cool-toned hair isn't mistaken for sword)
  if (b > r + 45 && b > g + 30 && a > 80) return false;
  // Exclude wings (outer side regions)
  if (y >= 8 && y <= 28 && (x < 17 || x > 31) && r > 185 && g > 185 && b > 195) return false;
  // Lavender / platinum / silver hair highlights and shadows across entire head and body flow
  const isPale = (r > 90 && g > 85 && b > 95);
  const isDark = (r > 35 && g > 30 && b > 45 && b >= r - 15 && b >= g - 15);
  const isSheen = (r > 140 && g > 135 && b > 135 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
  return isPale || isDark || isSheen;
}

function isSpriteWing(r, g, b, a, x, y) {
  if (a < 15) return false;
  return (y >= 8 && y <= 28 && (x < 17 || x > 31) && r > 185 && g > 185 && b > 195);
}

// Identity function for base spellblade heroine (wings, angelic hair, glowing sword)
function transformSpellblade(pixels, w, h, dir, animType, frameIdx) {
  return clonePixels(pixels);
}

// =============================================================================
// TRANSFORMATION FUNCTIONS FOR 5 HERO CLASSES
// =============================================================================

function transformWarrior(pixels, w, h, dir, animType, frameIdx) {
  const out = clonePixels(pixels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let r = out[idx], g = out[idx + 1], b = out[idx + 2], a = out[idx + 3];
      if (a < 15) continue;

      if (isSpriteWing(r, g, b, a, x, y)) {
        // WARRIOR HAS NO WINGS! Remove wing pixels!
        out[idx + 3] = 0;
        continue;
      }

      const isHair = isSpriteHair(r, g, b, a, x, y);
      const isAzureBlade = (b > r + 30 && b > g + 15 && a > 80);
      const isSilverPlate = !isHair && (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 130 && r < 210 && y >= 18);

      if (isHair) {
        // Golden blonde hair (warm amber and rich gold)
        const [hVal, sVal, lVal] = rgbToHsl(r, g, b);
        const [nr, ng, nb] = hslToRgb(0.12, 0.85, Math.max(0.35, Math.min(0.75, lVal)));
        out[idx] = nr;
        out[idx + 1] = ng;
        out[idx + 2] = nb;
      } else if (isAzureBlade) {
        // Heavy Forged Steel Claymore: Burnished silver steel with gold guard & ruby gem
        const avg = Math.round((r + g + b) / 3);
        out[idx] = Math.min(255, avg + 30);
        out[idx + 1] = Math.min(255, avg + 25);
        out[idx + 2] = Math.min(255, avg + 20);
      } else if (isSilverPlate) {
        // Knight Steel Plate Bikini with gilded edges
        out[idx] = Math.round(r * 0.9 + 25);
        out[idx + 1] = Math.round(g * 0.85 + 20);
        out[idx + 2] = Math.round(b * 0.7);
      }
    }
  }

  // Add Heavy Knight Pauldrons (Spike/rivet steel shoulder armor)
  if (dir.includes('south') || dir === 'east' || dir === 'west') {
    // Left & Right shoulder plate accents
    setPixel(out, w, h, 18, 19, 218, 165, 32); // Gold trim
    setPixel(out, w, h, 19, 19, 226, 232, 240); // Steel shine
    setPixel(out, w, h, 29, 19, 226, 232, 240);
    setPixel(out, w, h, 30, 19, 218, 165, 32);
    setPixel(out, w, h, 18, 20, 148, 163, 184); // Steel shadow
    setPixel(out, w, h, 30, 20, 148, 163, 184);
  }

  return out;
}

function transformMagician(pixels, w, h, dir, animType, frameIdx) {
  const out = clonePixels(pixels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let r = out[idx], g = out[idx + 1], b = out[idx + 2], a = out[idx + 3];
      if (a < 15) continue;

      if (isSpriteWing(r, g, b, a, x, y)) {
        // Magicians don't have wings, remove
        out[idx + 3] = 0;
        continue;
      }

      const isHair = isSpriteHair(r, g, b, a, x, y);
      const isBlade = (b > r + 25 && b > g + 10);
      const isArmor = !isHair && (y >= 18 && y <= 32);

      if (isHair) {
        // Vivid Violet / Amethyst purple hair
        const [hVal, sVal, lVal] = rgbToHsl(r, g, b);
        const [nr, ng, nb] = hslToRgb(0.77, 0.75, Math.max(0.3, Math.min(0.7, lVal)));
        out[idx] = nr;
        out[idx + 1] = ng;
        out[idx + 2] = nb;
      } else if (isBlade) {
        // Arcane Staff with Magenta Crystal Core
        out[idx] = 236; // Hot magenta / pink
        out[idx + 1] = 72;
        out[idx + 2] = 153;
      } else if (isArmor) {
        // Arcane Robe / indigo magic corset
        out[idx] = Math.round(r * 0.4 + 40);
        out[idx + 1] = Math.round(g * 0.2 + 10);
        out[idx + 2] = Math.round(b * 0.8 + 80);
      }
    }
  }

  // Draw Witch Hat on head (wide brim at y: 11-12, conical tip at y: 3-10)
  if (dir.includes('south') || dir === 'east' || dir === 'west') {
    // Hat brim
    for (let hx = 16; hx <= 32; hx++) {
      setPixel(out, w, h, hx, 11, 45, 10, 75);
    }
    // Conical hat body
    for (let hy = 4; hy <= 10; hy++) {
      const hw = Math.floor((10 - hy) * 0.9);
      for (let hx = 24 - hw; hx <= 24 + hw; hx++) {
        setPixel(out, w, h, hx, hy, 88, 28, 135);
      }
    }
    // Hat gold buckle & star tip
    setPixel(out, w, h, 24, 10, 251, 191, 36);
    setPixel(out, w, h, 24, 3, 244, 114, 182);
  }

  return out;
}

function transformThief(pixels, w, h, dir, animType, frameIdx) {
  const out = clonePixels(pixels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let r = out[idx], g = out[idx + 1], b = out[idx + 2], a = out[idx + 3];
      if (a < 15) continue;

      if (isSpriteWing(r, g, b, a, x, y)) {
        // Thief has no wings
        out[idx + 3] = 0;
        continue;
      }

      const isHair = isSpriteHair(r, g, b, a, x, y);
      const isBlade = (b > r + 25 && b > g + 10);
      const isArmor = !isHair && (y >= 18 && y <= 35);

      if (isHair) {
        // Midnight Jet Black hair with subtle dark navy sheen
        out[idx] = Math.round(r * 0.12 + 15);
        out[idx + 1] = Math.round(g * 0.12 + 18);
        out[idx + 2] = Math.round(b * 0.18 + 30);
      } else if (isBlade) {
        // Venomous Emerald Dagger edge
        out[idx] = 16;
        out[idx + 1] = 185;
        out[idx + 2] = 129;
      } else if (isArmor) {
        // Obsidian studded leather bikini armor
        out[idx] = Math.round(r * 0.15 + 20);
        out[idx + 1] = Math.round(g * 0.15 + 22);
        out[idx + 2] = Math.round(b * 0.2 + 30);
      }
    }
  }

  // Draw Assassin Headband & Cowl Ribbon
  for (let hx = 19; hx <= 29; hx++) {
    setPixel(out, w, h, hx, 12, 16, 185, 129); // Emerald headband
  }
  // Mask covering lower face
  if (dir.includes('south')) {
    setPixel(out, w, h, 23, 17, 30, 41, 59);
    setPixel(out, w, h, 24, 17, 30, 41, 59);
    setPixel(out, w, h, 25, 17, 30, 41, 59);
  }

  return out;
}

function transformCleric(pixels, w, h, dir, animType, frameIdx) {
  const out = clonePixels(pixels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let r = out[idx], g = out[idx + 1], b = out[idx + 2], a = out[idx + 3];
      if (a < 15) continue;

      if (isSpriteWing(r, g, b, a, x, y)) {
        // Cleric has no wings
        out[idx + 3] = 0;
        continue;
      }

      const isHair = isSpriteHair(r, g, b, a, x, y);
      const isBlade = (b > r + 25 && b > g + 10);
      const isArmor = !isHair && (y >= 18 && y <= 35);

      if (isHair) {
        // Champagne Platinum Blonde hair
        out[idx] = Math.min(255, Math.round(r * 1.05 + 20));
        out[idx + 1] = Math.min(255, Math.round(g * 1.02 + 15));
        out[idx + 2] = Math.round(b * 0.75 + 40);
      } else if (isBlade) {
        // Holy Sunlight Scepter / Cruciform Mace
        out[idx] = 250;
        out[idx + 1] = 204;
        out[idx + 2] = 21;
      } else if (isArmor) {
        // Pure White Silk vestments with gold stole
        out[idx] = Math.min(255, Math.round(r * 1.2 + 40));
        out[idx + 1] = Math.min(255, Math.round(g * 1.2 + 40));
        out[idx + 2] = Math.min(255, Math.round(b * 1.2 + 40));
      }
    }
  }

  // Draw Radiant Floating Golden Halo above head (y: 4-6, x: 20-28)
  for (let hx = 21; hx <= 27; hx++) {
    setPixel(out, w, h, hx, 5, 253, 224, 71, 240); // Bright gold
    setPixel(out, w, h, hx, 6, 234, 179, 8, 200);
  }
  setPixel(out, w, h, 20, 5, 245, 158, 11, 220);
  setPixel(out, w, h, 28, 5, 245, 158, 11, 220);

  return out;
}

// =============================================================================
// TRANSFORMATION FUNCTIONS FOR 18 MONSTER ARCHETYPES
// =============================================================================

const MONSTER_TRANSFORMS = {
  slime_princess: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Translucent emerald/cyan slime gelatin
      out[i] = Math.round(out[i] * 0.2 + 20);
      out[i + 1] = Math.round(out[i + 1] * 0.8 + 100);
      out[i + 2] = Math.round(out[i + 2] * 0.8 + 90);
      out[i + 3] = Math.round(out[i + 3] * 0.82); // Soft gelatin transparency
    }
    // Slime Crown
    setPixel(out, w, h, 24, 7, 250, 204, 21);
    setPixel(out, w, h, 22, 8, 34, 197, 94);
    setPixel(out, w, h, 26, 8, 34, 197, 94);
    return out;
  },

  goblin_girl: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (out[idx + 3] < 15) continue;
        const isSkin = (out[idx] > 180 && out[idx + 1] > 140 && out[idx + 2] > 120);
        if (isSkin) {
          // Olive / emerald goblin skin
          out[idx] = Math.round(out[idx] * 0.45 + 30);
          out[idx + 1] = Math.round(out[idx + 1] * 0.85 + 50);
          out[idx + 2] = Math.round(out[idx + 2] * 0.3 + 20);
        } else {
          // Ragged leather armor
          out[idx] = Math.round(out[idx] * 0.6 + 40);
          out[idx + 1] = Math.round(out[idx + 1] * 0.45 + 25);
          out[idx + 2] = Math.round(out[idx + 2] * 0.25 + 15);
        }
      }
    }
    // Pointed goblin ears
    setPixel(out, w, h, 17, 13, 74, 222, 128);
    setPixel(out, w, h, 16, 12, 34, 197, 94);
    setPixel(out, w, h, 31, 13, 74, 222, 128);
    setPixel(out, w, h, 32, 12, 34, 197, 94);
    return out;
  },

  beast_maiden: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Warm feline / leopard fur tones
      out[i] = Math.min(255, Math.round(out[i] * 1.1 + 35));
      out[i + 1] = Math.round(out[i + 1] * 0.85 + 20);
      out[i + 2] = Math.round(out[i + 2] * 0.5);
    }
    // Leopard animal ears
    setPixel(out, w, h, 19, 8, 245, 158, 11);
    setPixel(out, w, h, 19, 7, 120, 53, 15);
    setPixel(out, w, h, 29, 8, 245, 158, 11);
    setPixel(out, w, h, 29, 7, 120, 53, 15);
    // Fluffy tail behind
    setPixel(out, w, h, 16, 32, 245, 158, 11);
    setPixel(out, w, h, 15, 33, 120, 53, 15);
    return out;
  },

  dark_knightress: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Obsidian blackened plate with cursed crimson runes
      out[i] = Math.round(out[i] * 0.25 + 30);
      out[i + 1] = Math.round(out[i + 1] * 0.2 + 10);
      out[i + 2] = Math.round(out[i + 2] * 0.3 + 35);
    }
    // Curved demon horns & glowing red visor slit
    setPixel(out, w, h, 18, 9, 185, 28, 28);
    setPixel(out, w, h, 17, 8, 127, 29, 29);
    setPixel(out, w, h, 30, 9, 185, 28, 28);
    setPixel(out, w, h, 31, 8, 127, 29, 29);
    setPixel(out, w, h, 23, 15, 239, 68, 68);
    setPixel(out, w, h, 24, 15, 239, 68, 68);
    setPixel(out, w, h, 25, 15, 239, 68, 68);
    return out;
  },

  dragon_princess_ignis: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Blazing Crimson dragon scales & magma gold
      out[i] = Math.min(255, Math.round(out[i] * 1.25 + 60));
      out[i + 1] = Math.round(out[i + 1] * 0.5 + 15);
      out[i + 2] = Math.round(out[i + 2] * 0.3);
    }
    // Dragon horns
    setPixel(out, w, h, 19, 7, 239, 68, 68);
    setPixel(out, w, h, 18, 6, 185, 28, 28);
    setPixel(out, w, h, 29, 7, 239, 68, 68);
    setPixel(out, w, h, 30, 6, 185, 28, 28);
    // Fiery tail
    setPixel(out, w, h, 15, 33, 249, 115, 22);
    setPixel(out, w, h, 14, 32, 239, 68, 68);
    return out;
  },

  sakura_kitsune: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Pure white & cherry blossom pink / vermilion
      out[i] = Math.min(255, Math.round(out[i] * 1.1 + 45));
      out[i + 1] = Math.round(out[i + 1] * 0.8 + 20);
      out[i + 2] = Math.round(out[i + 2] * 0.85 + 30);
    }
    // Fox ears with red ribbons
    setPixel(out, w, h, 19, 8, 254, 205, 211);
    setPixel(out, w, h, 19, 7, 225, 29, 72);
    setPixel(out, w, h, 29, 8, 254, 205, 211);
    setPixel(out, w, h, 29, 7, 225, 29, 72);
    // Multiple bushy kitsune tails behind
    setPixel(out, w, h, 14, 30, 253, 230, 138);
    setPixel(out, w, h, 13, 31, 245, 158, 11);
    setPixel(out, w, h, 34, 30, 253, 230, 138);
    setPixel(out, w, h, 35, 31, 245, 158, 11);
    return out;
  },

  skeletal_maid: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Monochrome bleached bone & gothic black
      const gray = Math.round(out[i] * 0.3 + out[i + 1] * 0.59 + out[i + 2] * 0.11);
      out[i] = gray > 140 ? Math.min(255, gray + 40) : Math.round(gray * 0.35);
      out[i + 1] = gray > 140 ? Math.min(255, gray + 40) : Math.round(gray * 0.35);
      out[i + 2] = gray > 140 ? Math.min(255, gray + 40) : Math.round(gray * 0.4);
    }
    // Skull brooch on maid headdress
    setPixel(out, w, h, 24, 9, 241, 245, 249);
    setPixel(out, w, h, 24, 10, 15, 23, 42);
    return out;
  },

  yeti_maiden: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Frost blue skin and snow white fur
      out[i] = Math.round(out[i] * 0.7 + 60);
      out[i + 1] = Math.round(out[i + 1] * 0.85 + 90);
      out[i + 2] = Math.min(255, Math.round(out[i + 2] * 1.1 + 100));
    }
    // Fur ear tufts & ice horns
    setPixel(out, w, h, 18, 8, 56, 189, 248);
    setPixel(out, w, h, 17, 7, 240, 249, 255);
    setPixel(out, w, h, 30, 8, 56, 189, 248);
    setPixel(out, w, h, 31, 7, 240, 249, 255);
    return out;
  },

  siren_demoness: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Succubus dark violet & magenta
      out[i] = Math.round(out[i] * 0.7 + 70);
      out[i + 1] = Math.round(out[i + 1] * 0.3 + 15);
      out[i + 2] = Math.min(255, Math.round(out[i + 2] * 1.05 + 80));
    }
    // Succubus curved horns
    setPixel(out, w, h, 19, 7, 168, 85, 247);
    setPixel(out, w, h, 18, 6, 88, 28, 135);
    setPixel(out, w, h, 29, 7, 168, 85, 247);
    setPixel(out, w, h, 30, 6, 88, 28, 135);
    // Arrow-tip demon tail
    setPixel(out, w, h, 15, 33, 219, 39, 119);
    setPixel(out, w, h, 14, 34, 157, 23, 77);
    return out;
  },

  clockwork_maid: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Brass, copper & steamwork bronze
      out[i] = Math.min(255, Math.round(out[i] * 1.1 + 60));
      out[i + 1] = Math.round(out[i + 1] * 0.8 + 35);
      out[i + 2] = Math.round(out[i + 2] * 0.4);
    }
    // Glowing brass gear on back/head
    setPixel(out, w, h, 24, 6, 251, 191, 36);
    setPixel(out, w, h, 23, 7, 180, 83, 9);
    setPixel(out, w, h, 25, 7, 180, 83, 9);
    return out;
  },

  bandit_pirate: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Pirate red bandana & sun-bronzed skin
      out[i] = Math.min(255, Math.round(out[i] * 1.1 + 40));
      out[i + 1] = Math.round(out[i + 1] * 0.75 + 15);
      out[i + 2] = Math.round(out[i + 2] * 0.6);
    }
    // Red bandana wrap
    for (let hx = 19; hx <= 29; hx++) {
      setPixel(out, w, h, hx, 11, 220, 38, 38);
    }
    // Leather eyepatch
    if (dir.includes('south')) {
      setPixel(out, w, h, 22, 14, 15, 23, 42);
    }
    return out;
  },

  dragon_wyrm: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Deep sapphire & sea wyrm cyan scales
      out[i] = Math.round(out[i] * 0.35 + 15);
      out[i + 1] = Math.round(out[i + 1] * 0.7 + 45);
      out[i + 2] = Math.min(255, Math.round(out[i + 2] * 1.2 + 80));
    }
    // Draconic crest
    setPixel(out, w, h, 24, 6, 14, 165, 233);
    setPixel(out, w, h, 24, 7, 3, 105, 161);
    return out;
  },

  kraken_maiden: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Aquatic turquoise & deep trench purple
      out[i] = Math.round(out[i] * 0.4 + 20);
      out[i + 1] = Math.round(out[i + 1] * 0.9 + 60);
      out[i + 2] = Math.min(255, Math.round(out[i + 2] * 1.05 + 75));
    }
    // Tentacle limbs curling from hips
    setPixel(out, w, h, 16, 28, 147, 51, 234);
    setPixel(out, w, h, 15, 29, 6, 182, 212);
    setPixel(out, w, h, 32, 28, 147, 51, 234);
    setPixel(out, w, h, 33, 29, 6, 182, 212);
    return out;
  },

  sphinx_queen: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Desert sun gold & lapis lazuli royal blue
      out[i] = Math.min(255, Math.round(out[i] * 1.15 + 50));
      out[i + 1] = Math.round(out[i + 1] * 0.9 + 30);
      out[i + 2] = Math.round(out[i + 2] * 0.4);
    }
    // Pharaoh nemes crown
    for (let hx = 20; hx <= 28; hx++) {
      setPixel(out, w, h, hx, 9, 234, 179, 8);
      setPixel(out, w, h, hx, 10, 30, 58, 138); // Lapis blue stripe
    }
    return out;
  },

  dryad_nymph: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Forest flora green & wood bark tones
      out[i] = Math.round(out[i] * 0.5 + 25);
      out[i + 1] = Math.min(255, Math.round(out[i + 1] * 1.1 + 55));
      out[i + 2] = Math.round(out[i + 2] * 0.4 + 15);
    }
    // Flower crown on head
    setPixel(out, w, h, 21, 10, 244, 114, 182); // Pink blossom
    setPixel(out, w, h, 24, 9, 251, 191, 36);  // Gold pistil
    setPixel(out, w, h, 27, 10, 244, 114, 182);
    return out;
  },

  arachne_weaver: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Chitinous dark spider violet & silk white
      out[i] = Math.round(out[i] * 0.45 + 35);
      out[i + 1] = Math.round(out[i + 1] * 0.35 + 20);
      out[i + 2] = Math.round(out[i + 2] * 0.8 + 55);
    }
    // 4 Articulated spider legs from waist/back
    setPixel(out, w, h, 14, 22, 67, 56, 202);
    setPixel(out, w, h, 12, 20, 99, 102, 241);
    setPixel(out, w, h, 13, 26, 67, 56, 202);
    setPixel(out, w, h, 11, 28, 99, 102, 241);
    setPixel(out, w, h, 34, 22, 67, 56, 202);
    setPixel(out, w, h, 36, 20, 99, 102, 241);
    setPixel(out, w, h, 35, 26, 67, 56, 202);
    setPixel(out, w, h, 37, 28, 99, 102, 241);
    return out;
  },

  vampire_countess: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Midnight scarlet & pale gothic porcelain
      out[i] = Math.min(255, Math.round(out[i] * 1.15 + 50));
      out[i + 1] = Math.round(out[i + 1] * 0.35);
      out[i + 2] = Math.round(out[i + 2] * 0.5 + 20);
    }
    // Gothic vampire collar & red bat wings
    setPixel(out, w, h, 19, 17, 159, 18, 57);
    setPixel(out, w, h, 29, 17, 159, 18, 57);
    setPixel(out, w, h, 16, 12, 136, 19, 55);
    setPixel(out, w, h, 32, 12, 136, 19, 55);
    return out;
  },

  ghost_maiden: (pixels, w, h, dir) => {
    const out = clonePixels(pixels);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] < 15) continue;
      // Spectral ethereal cyan with floating ghost translucency
      out[i] = Math.round(out[i] * 0.5 + 80);
      out[i + 1] = Math.min(255, Math.round(out[i + 1] * 0.9 + 110));
      out[i + 2] = Math.min(255, Math.round(out[i + 2] * 1.1 + 120));
      out[i + 3] = Math.round(out[i + 3] * 0.68); // Translucent ghostly body
    }
    // Spirit soul wisp
    setPixel(out, w, h, 17, 10, 103, 232, 249, 220);
    setPixel(out, w, h, 31, 10, 103, 232, 249, 220);
    return out;
  }
};

// Pad 48x48 to 64x64 HD sprite canvas
function pad48to64(pixels, srcW, srcH) {
  const TARGET = 64;
  const out = Buffer.alloc(TARGET * TARGET * 4);
  const offsetX = Math.floor((TARGET - srcW) / 2);
  const offsetY = Math.floor((TARGET - srcH) / 2);
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const srcIdx = (y * srcW + x) * 4;
      const destIdx = ((y + offsetY) * TARGET + (x + offsetX)) * 4;
      out[destIdx] = pixels[srcIdx];
      out[destIdx + 1] = pixels[srcIdx + 1];
      out[destIdx + 2] = pixels[srcIdx + 2];
      out[destIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return out;
}

// =============================================================================
// RUN FULL GENERATION FOR ALL 5 CLASSES
// =============================================================================

function generateClassSprites(className, folderName, transformFn) {
  console.log(`\nGenerating sprites for Class: ${className} -> public/assets/${folderName}`);
  const baseTarget = path.join('public/assets', folderName);
  ['Idle/rotations', 'Run/rotations', 'Attack/rotations'].forEach(sub => {
    fs.mkdirSync(path.join(baseTarget, sub), { recursive: true });
  });

  // 1. Idle (8 directions)
  for (const dir of DIRECTIONS) {
    const raw = baseIdle[dir];
    const transformed = transformFn(raw.pixels, raw.width, raw.height, dir, 'idle', 0);
    const padded = pad48to64(transformed, raw.width, raw.height);
    const png = encodePNG(64, 64, padded);
    fs.writeFileSync(path.join(baseTarget, 'Idle/rotations', `${dir}.png`), png);
  }

  // 2. Run (32 frames)
  for (const dir of DIRECTIONS) {
    for (let f = 0; f < 4; f++) {
      const raw = baseRun[dir][f];
      const transformed = transformFn(raw.pixels, raw.width, raw.height, dir, 'run', f);
      const padded = pad48to64(transformed, raw.width, raw.height);
      const png = encodePNG(64, 64, padded);
      fs.writeFileSync(path.join(baseTarget, 'Run/rotations', `${dir}_${f}.png`), png);
    }
  }

  // 3. Attack (32 frames)
  for (const dir of DIRECTIONS) {
    for (let f = 0; f < 4; f++) {
      const raw = baseAttack[dir][f];
      const transformed = transformFn(raw.pixels, raw.width, raw.height, dir, 'attack', f);
      const padded = pad48to64(transformed, raw.width, raw.height);
      const png = encodePNG(64, 64, padded);
      fs.writeFileSync(path.join(baseTarget, 'Attack/rotations', `${dir}_${f}.png`), png);
    }
  }

  console.log(`  -> Completed ${className}: 8 Idle + 32 Run + 32 Attack = 72 frames generated.`);
}

// =============================================================================
// RUN FULL GENERATION FOR ALL 18 MONSTERS
// =============================================================================

function generateMonsterSprites(archKey, transformFn) {
  const baseTarget = path.join('public/assets/monsters', archKey);
  ['Idle/rotations', 'Run/rotations', 'Attack/rotations'].forEach(sub => {
    fs.mkdirSync(path.join(baseTarget, sub), { recursive: true });
  });

  // 1. Idle (8 directions)
  for (const dir of DIRECTIONS) {
    const raw = baseIdle[dir];
    const transformed = transformFn(raw.pixels, raw.width, raw.height, dir, 'idle', 0);
    const padded = pad48to64(transformed, raw.width, raw.height);
    const png = encodePNG(64, 64, padded);
    fs.writeFileSync(path.join(baseTarget, 'Idle/rotations', `${dir}.png`), png);
  }

  // 2. Run (32 frames)
  for (const dir of DIRECTIONS) {
    for (let f = 0; f < 4; f++) {
      const raw = baseRun[dir][f];
      const transformed = transformFn(raw.pixels, raw.width, raw.height, dir, 'run', f);
      const padded = pad48to64(transformed, raw.width, raw.height);
      const png = encodePNG(64, 64, padded);
      fs.writeFileSync(path.join(baseTarget, 'Run/rotations', `${dir}_${f}.png`), png);
    }
  }

  // 3. Attack (32 frames)
  for (const dir of DIRECTIONS) {
    for (let f = 0; f < 4; f++) {
      const raw = baseAttack[dir][f];
      const transformed = transformFn(raw.pixels, raw.width, raw.height, dir, 'attack', f);
      const padded = pad48to64(transformed, raw.width, raw.height);
      const png = encodePNG(64, 64, padded);
      fs.writeFileSync(path.join(baseTarget, 'Attack/rotations', `${dir}_${f}.png`), png);
    }
  }

  // 4. Portrait Preview: /assets/monsters/${archKey}.png
  const southIdle = fs.readFileSync(path.join(baseTarget, 'Idle/rotations', 'south.png'));
  fs.writeFileSync(path.join('public/assets/monsters', `${archKey}.png`), southIdle);
}

// -----------------------------------------------------------------------------
// EXECUTION
// -----------------------------------------------------------------------------

console.log('=== GENERATING ALL 5 HEROINE CLASSES (64x64) ===');
generateClassSprites('Warrior (นักรบ)', 'A_female_warrior_knight', transformWarrior);
generateClassSprites('Spellblade (ดาบเวท)', 'A_female_magic_swordsman_with', transformSpellblade);
generateClassSprites('Magician (จอมเวท)', 'A_fair-skinned_sorceress_with_long', transformMagician);
generateClassSprites('Thief (จอมโจร)', 'A_fair-skinned_female_assassin_wearing', transformThief);
generateClassSprites('Cleric (นักบวช)', 'A_young_priestess_with_blonde', transformCleric);

console.log('\n=== GENERATING ALL 18 MONSTER ARCHETYPES (64x64) ===');
fs.mkdirSync('public/assets/monsters', { recursive: true });
const archetypes = Object.keys(MONSTER_TRANSFORMS);
for (const arch of archetypes) {
  generateMonsterSprites(arch, MONSTER_TRANSFORMS[arch]);
  console.log(`  -> Monster [${arch}]: 72 frames + portrait generated.`);
}

console.log('\n[SUCCESS] Generated all 5 Classes & 18 Monsters with 8-directional Idle, Run, and Attack animations!');
