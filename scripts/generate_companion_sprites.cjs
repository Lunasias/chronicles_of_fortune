// Generates the 64x64 pixel-art model for every companion listed in
// src/game/companions.json, writing one PNG per companion into public/assets/companions/.
//
// The art descriptors in that JSON are a palette plus a set of silhouette features (ears,
// horns, wings, tail, headwear, weapon, body type). This script turns each descriptor into a
// chibi character sprite, then runs an automatic dark outline pass so the result reads like
// the rest of the project's sprite work against a busy diorama background.
//
// Usage:
//   node scripts/generate_companion_sprites.cjs                 # regenerate all sprites
//   node scripts/generate_companion_sprites.cjs --contact-sheet # also emit a review sheet
//
// The contact sheet is written to .companion-sheet.png at the repo root for inspection and is
// not part of the game.
const fs = require('fs');
const path = require('path');
const { encodePNG } = require('./lib/png.cjs');

const SIZE = 64;
const DATA = path.join('src', 'game', 'companions.json');
const OUT_DIR = path.join('public', 'assets', 'companions');

// ---------------------------------------------------------------------------
// tiny pixel canvas
// ---------------------------------------------------------------------------
function makeCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

function px(canvas, x, y, color, alpha = 1) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= canvas.size || yi >= canvas.size) return;
  const i = (yi * canvas.size + xi) * 4;
  const [r, g, b] = hexToRgb(color);
  const srcA = Math.max(0, Math.min(1, alpha));
  if (srcA >= 1) {
    canvas.data[i] = r;
    canvas.data[i + 1] = g;
    canvas.data[i + 2] = b;
    canvas.data[i + 3] = 255;
    return;
  }
  // Source-over blend against whatever is already there.
  const dstA = canvas.data[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  canvas.data[i] = Math.round((r * srcA + canvas.data[i] * dstA * (1 - srcA)) / outA);
  canvas.data[i + 1] = Math.round((g * srcA + canvas.data[i + 1] * dstA * (1 - srcA)) / outA);
  canvas.data[i + 2] = Math.round((b * srcA + canvas.data[i + 2] * dstA * (1 - srcA)) / outA);
  canvas.data[i + 3] = Math.round(outA * 255);
}

function rect(canvas, x, y, w, h, color, alpha = 1) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) px(canvas, x + dx, y + dy, color, alpha);
  }
}

/** Symmetric horizontal span: draws mirrored around the centre axis. */
function mirrorSpan(canvas, cx, y, halfWidth, color, alpha = 1) {
  rect(canvas, cx - halfWidth, y, halfWidth * 2, 1, color, alpha);
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ];
}

function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `#${[f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// character construction
// ---------------------------------------------------------------------------
const CX = 32;

function drawAura(c, art) {
  if (!art.aura) return;
  for (let y = 20; y < 60; y++) {
    for (let x = 10; x < 54; x++) {
      const dx = (x - CX) / 22;
      const dy = (y - 40) / 24;
      const d = dx * dx + dy * dy;
      if (d > 0.55 && d < 1) px(c, x, y, art.aura, 0.10);
    }
  }
}

function drawShadow(c) {
  for (let y = 55; y < 60; y++) {
    const w = 16 - Math.abs(y - 57) * 4;
    mirrorSpan(c, CX, y, w, '#0b1220', 0.30);
  }
}

function drawWings(c, art) {
  const outline = shade(art.outfit, -30);
  const fill = art.accent;
  if (art.wings === 'none') return;

  if (art.wings === 'dragon' || art.wings === 'bat') {
    // Two swept wings behind the shoulders.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        const x = CX + side * (9 + i);
        const y = 26 + Math.round(i * 0.55);
        const h = 10 - Math.round(i * 0.5);
        rect(c, x, y, 2, Math.max(2, h), i % 3 === 0 ? outline : fill, 0.92);
      }
      if (art.wings === 'bat') {
        rect(c, CX + side * 22, 32, 3, 8, outline, 0.95);
      }
    }
  } else if (art.wings === 'feather') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const x = CX + side * (10 + i);
        const y = 28 + Math.round(i * 0.75);
        rect(c, x, y, 2, 4 + Math.round(i * 0.3), i % 2 === 0 ? fill : shade(fill, 25), 0.9);
      }
    }
  }
}

function drawTail(c, art) {
  if (art.tail === 'none') return;
  const fill = shade(art.hair, 10);
  const outline = shade(art.outfit, -35);
  const flow = shade(fill, 30);

  if (art.tail === 'cat' || art.tail === 'dog' || art.tail === 'dragon') {
    const len = art.tail === 'dragon' ? 16 : 12;
    for (let i = 0; i < len; i++) {
      const x = CX + 7 + Math.round(i * 0.9);
      const y = 46 - Math.round(Math.sin(i / 3) * 3) - Math.round(i * 0.2);
      rect(c, x, y, 2, 3, i > len - 4 ? flow : fill, 0.95);
    }
    rect(c, CX + 7 + len, 46 - len * 0.2 - 1, 2, 2, outline, 0.9);
    return;
  }

  if (art.tail === 'fox9') {
    for (let t = 0; t < 9; t++) {
      const spread = (t - 4) * 1.7;
      for (let i = 0; i < 12; i++) {
        const x = CX + 6 + i + spread * (i / 12);
        const y = 44 - i - Math.abs(spread) * 0.4 + Math.sin(i / 2) * 1.2;
        rect(c, x, y, 2, 3, i > 8 ? flow : fill, 0.9);
      }
    }
    return;
  }

  if (art.tail === 'scorpion') {
    for (let i = 0; i < 13; i++) {
      const t = i / 12;
      const x = CX + 8 + Math.round(Math.sin(t * Math.PI) * 7);
      const y = 46 - i;
      rect(c, x, y, 3, 2, i % 2 === 0 ? outline : fill, 0.95);
    }
    rect(c, CX + 8, 31, 3, 3, art.accent, 1);
    return;
  }

  if (art.tail === 'mermaid') {
    for (let i = 0; i < 14; i++) {
      const y = 44 + i;
      const w = 10 - Math.round(i * 0.4);
      mirrorSpan(c, CX, y, w, i % 3 === 0 ? flow : fill, 0.95);
    }
    // Fin
    rect(c, CX - 14, 53, 8, 2, outline, 0.9);
    rect(c, CX + 6, 53, 8, 2, outline, 0.9);
    return;
  }

  if (art.tail === 'slime') {
    for (let i = 0; i < 9; i++) {
      rect(c, CX + 8 + i, 48 + Math.round(Math.sin(i / 2) * 2), 2, 2, fill, 0.55);
    }
  }
}

function drawLegs(c, art) {
  const legColor = art.body === 'mech' ? shade(art.outfit, -15) : shade(art.outfit, -25);
  const boot = shade(art.outfit, -50);

  if (art.body === 'slime') {
    // No legs: a rounded gelatin base.
    for (let y = 44; y < 57; y++) {
      const t = (y - 44) / 12;
      const w = Math.round(6 + Math.sin(t * Math.PI) * 9);
      mirrorSpan(c, CX, y, w, art.outfit, 0.82);
    }
    rect(c, CX - 9, 47, 4, 3, art.accent, 0.5);
    return;
  }

  if (art.body === 'ghost') {
    // A wispy trailing hem instead of feet.
    for (let y = 44; y < 58; y++) {
      const w = 11 - Math.round((y - 44) * 0.15);
      mirrorSpan(c, CX, y, w, art.outfit, 0.72);
    }
    for (let x = -10; x <= 10; x += 4) {
      rect(c, CX + x, 56 + (Math.abs(x) % 3), 2, 3, art.outfit, 0.45);
    }
    return;
  }

  if (art.body === 'mermaid') {
    rect(c, CX - 7, 44, 6, 6, art.outfit, 1);
    rect(c, CX + 1, 44, 6, 6, art.outfit, 1);
    return;
  }

  rect(c, CX - 7, 46, 6, 10, legColor, 1);
  rect(c, CX + 1, 46, 6, 10, legColor, 1);
  rect(c, CX - 8, 54, 7, 3, boot, 1);
  rect(c, CX + 1, 54, 7, 3, boot, 1);
}

function drawTorso(c, art) {
  const outfit = art.outfit;
  const trim = art.accent;
  const dark = shade(outfit, -40);

  if (art.body === 'slime') {
    for (let y = 30; y < 46; y++) {
      const t = (y - 30) / 16;
      const w = Math.round(8 + Math.sin(t * Math.PI) * 6);
      mirrorSpan(c, CX, y, w, outfit, 0.8);
    }
    rect(c, CX - 5, 35, 10, 3, trim, 0.55);
    return;
  }

  // Human / ghost / mech / mermaid share a torso silhouette.
  for (let y = 30; y < 47; y++) {
    const t = (y - 30) / 17;
    const w = Math.round(9 - t * 2.5);
    mirrorSpan(c, CX, y, w, outfit, art.body === 'ghost' ? 0.8 : 1);
  }

  // Chest highlight and belt
  mirrorSpan(c, CX, 32, 6, shade(outfit, 22), 0.9);
  rect(c, CX - 8, 43, 16, 3, dark, 1);
  rect(c, CX - 3, 43, 6, 3, trim, 1);

  if (art.body === 'mech') {
    rect(c, CX - 9, 34, 3, 7, trim, 0.9);
    rect(c, CX + 6, 34, 3, 7, trim, 0.9);
    rect(c, CX - 6, 47, 12, 2, shade(outfit, -60), 1);
  }
}

function drawArms(c, art) {
  const skin = art.skin;
  const sleeve = shade(art.outfit, 10);

  for (const side of [-1, 1]) {
    const x = side < 0 ? CX - 12 : CX + 9;
    rect(c, x, 32, 3, 7, sleeve, 1);
    rect(c, x, 39, 3, 5, skin, 1);
  }
}

function drawHead(c, art) {
  const skin = art.skin;
  const shadeSkin = shade(skin, -22);

  // Rounded 16 wide x 15 tall head.
  rect(c, CX - 8, 16, 16, 13, skin, art.body === 'ghost' ? 0.85 : 1);
  rect(c, CX - 7, 15, 14, 1, skin, art.body === 'ghost' ? 0.85 : 1);
  rect(c, CX - 7, 29, 14, 1, shadeSkin, art.body === 'ghost' ? 0.85 : 1);
  // Neck
  rect(c, CX - 3, 29, 6, 2, shadeSkin, 1);
}

function drawHair(c, art) {
  const hair = art.hair;
  const hi = shade(hair, 34);
  const lo = shade(hair, -30);

  // Cap over the skull
  rect(c, CX - 9, 13, 18, 6, hair, 1);
  rect(c, CX - 8, 12, 16, 2, hair, 1);
  rect(c, CX - 8, 18, 3, 6, hair, 1);
  rect(c, CX + 6, 18, 3, 6, hair, 1);
  rect(c, CX - 5, 12, 8, 2, hi, 0.75);

  switch (art.hairStyle) {
    case 'twin':
      rect(c, CX - 14, 20, 5, 12, hair, 1);
      rect(c, CX + 10, 20, 5, 12, hair, 1);
      rect(c, CX - 14, 30, 5, 2, lo, 1);
      rect(c, CX + 10, 30, 5, 2, lo, 1);
      break;
    case 'short':
      rect(c, CX - 9, 18, 2, 6, lo, 0.9);
      rect(c, CX + 8, 18, 2, 6, lo, 0.9);
      break;
    case 'bun':
      rect(c, CX - 5, 6, 10, 7, hair, 1);
      rect(c, CX - 3, 5, 6, 2, hi, 0.8);
      rect(c, CX - 9, 18, 2, 8, lo, 0.9);
      rect(c, CX + 8, 18, 2, 8, lo, 0.9);
      break;
    case 'ponytail':
      for (let i = 0; i < 16; i++) {
        rect(c, CX + 9 + Math.round(i * 0.25), 18 + i, 4, 2, i > 11 ? lo : hair, 1);
      }
      rect(c, CX - 9, 18, 2, 9, lo, 0.9);
      break;
    case 'long':
    default:
      rect(c, CX - 11, 20, 4, 20, hair, 1);
      rect(c, CX + 7, 20, 4, 20, hair, 1);
      rect(c, CX - 11, 38, 4, 3, lo, 1);
      rect(c, CX + 7, 38, 4, 3, lo, 1);
      break;
  }
}

function drawEars(c, art) {
  if (art.ears === 'none') return;
  const hair = art.hair;
  const inner = art.accent;

  const ear = (side, height, spread, kind) => {
    const baseX = CX + side * spread;
    for (let i = 0; i < height; i++) {
      const w = kind === 'elongated' ? 3 : 4;
      rect(c, baseX - (side < 0 ? w - 1 : 0), 13 - i, w, 1, hair, 1);
    }
    if (kind !== 'none') {
      rect(c, baseX - (side < 0 ? 2 : -1), 11 - Math.floor(height / 2), 2, 2, inner, 0.8);
    }
  };

  switch (art.ears) {
    case 'cat':
      ear(-1, 5, 8, 'triangle');
      ear(1, 5, 4, 'triangle');
      break;
    case 'fox':
      ear(-1, 6, 8, 'elongated');
      ear(1, 6, 3, 'elongated');
      break;
    case 'wolf':
    case 'dog':
      ear(-1, 5, 9, 'triangle');
      ear(1, 5, 4, 'triangle');
      break;
    case 'goblin':
      for (let i = 0; i < 5; i++) {
        rect(c, CX - 11 - i, 19 + i, 3, 2, art.skin, 1);
        rect(c, CX + 9 + i, 19 + i, 3, 2, art.skin, 1);
      }
      break;
    case 'elf':
      for (let i = 0; i < 4; i++) {
        rect(c, CX - 11 - i, 20 + i, 3, 1, art.skin, 1);
        rect(c, CX + 9 + i, 20 + i, 3, 1, art.skin, 1);
      }
      break;
    case 'yeti':
      rect(c, CX - 11, 10, 22, 5, shade(art.hair, 10), 1);
      rect(c, CX - 8, 8, 6, 3, shade(art.hair, 25), 1);
      rect(c, CX + 2, 8, 6, 3, shade(art.hair, 25), 1);
      break;
    default:
      break;
  }
}

function drawHorns(c, art) {
  if (art.horns === 'none') return;
  const horn = shade(art.accent, -20);

  if (art.horns === 'dragon') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        rect(c, CX + side * (6 + Math.round(i * 0.9)), 12 - i, 2, 2, i > 4 ? shade(horn, 40) : horn, 1);
      }
    }
    return;
  }
  if (art.horns === 'imp') {
    for (const side of [-1, 1]) {
      rect(c, CX + side * 6, 9, 2, 4, horn, 1);
      rect(c, CX + side * 7, 7, 2, 3, horn, 1);
    }
    return;
  }
  if (art.horns === 'demon') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        rect(c, CX + side * (5 + i), 11 - Math.round(i * 1.1), 2, 2, horn, 1);
      }
    }
  }
}

function drawHeadwear(c, art) {
  const accent = art.accent;
  const dark = shade(accent, -60);

  switch (art.headwear) {
    case 'maid':
      rect(c, CX - 9, 9, 18, 3, '#f8fafc', 1);
      rect(c, CX - 12, 11, 5, 4, '#f8fafc', 1);
      rect(c, CX + 7, 11, 5, 4, '#f8fafc', 1);
      rect(c, CX - 2, 11, 4, 2, accent, 1);
      break;
    case 'hat':
      rect(c, CX - 12, 9, 24, 2, dark, 1);
      rect(c, CX - 7, 1, 14, 8, dark, 1);
      rect(c, CX - 7, 6, 14, 2, accent, 1);
      break;
    case 'crown':
      rect(c, CX - 8, 8, 16, 3, accent, 1);
      for (const dx of [-7, -2, 3]) {
        rect(c, CX + dx, 4, 3, 4, accent, 1);
      }
      rect(c, CX - 8, 10, 16, 1, dark, 1);
      break;
    case 'turban':
      rect(c, CX - 10, 8, 20, 5, accent, 1);
      rect(c, CX - 10, 12, 20, 2, shade(accent, -40), 1);
      rect(c, CX + 6, 13, 4, 8, shade(accent, -20), 1);
      break;
    case 'bandana':
      rect(c, CX - 9, 10, 18, 3, accent, 1);
      rect(c, CX + 8, 11, 6, 2, shade(accent, -20), 1);
      break;
    case 'bandage':
      for (let y = 12; y < 30; y += 3) {
        rect(c, CX - 9, y, 18, 1, '#e7e5e4', 0.7);
      }
      break;
    case 'mask':
      rect(c, CX - 9, 8, 18, 4, accent, 1);
      rect(c, CX - 4, 5, 8, 4, accent, 1);
      rect(c, CX - 4, 6, 8, 1, dark, 1);
      break;
    case 'flower':
      rect(c, CX + 6, 10, 4, 4, accent, 1);
      rect(c, CX + 7, 9, 2, 2, shade(accent, 40), 1);
      rect(c, CX - 10, 11, 3, 3, shade(accent, 20), 1);
      break;
    case 'halo':
      for (let x = -8; x <= 8; x++) {
        const y = 4 + Math.round(Math.abs(x) * 0.12);
        px(c, CX + x, y, accent, 0.85);
      }
      break;
    default:
      break;
  }
}

function drawFace(c, art) {
  const eye = art.eyes;
  const lash = shade(art.skin, -90);

  // Eyes
  rect(c, CX - 6, 21, 3, 3, '#ffffff', 0.9);
  rect(c, CX + 3, 21, 3, 3, '#ffffff', 0.9);
  rect(c, CX - 5, 22, 2, 2, eye, 1);
  rect(c, CX + 4, 22, 2, 2, eye, 1);
  rect(c, CX - 5, 22, 1, 1, '#ffffff', 1);
  rect(c, CX + 4, 22, 1, 1, '#ffffff', 1);
  // Lash line
  rect(c, CX - 7, 20, 4, 1, lash, 0.85);
  rect(c, CX + 3, 20, 4, 1, lash, 0.85);
  // Mouth
  rect(c, CX - 1, 26, 3, 1, shade(art.skin, -60), 0.9);
  // Blush
  rect(c, CX - 8, 25, 2, 1, '#f87171', 0.45);
  rect(c, CX + 6, 25, 2, 1, '#f87171', 0.45);
}

function drawWeapon(c, art) {
  if (art.weapon === 'none') return;
  const metal = '#e2e8f0';
  const grip = '#78350f';

  switch (art.weapon) {
    case 'dagger':
      for (let i = 0; i < 7; i++) rect(c, 48 + i, 44 - i, 2, 2, metal, 1);
      rect(c, 46, 45, 3, 3, grip, 1);
      break;
    case 'sword':
      for (let i = 0; i < 14; i++) rect(c, 48 + Math.round(i * 0.55), 46 - i, 2, 2, metal, 1);
      rect(c, 46, 45, 5, 2, art.accent, 1);
      break;
    case 'staff':
      for (let i = 0; i < 22; i++) rect(c, 50, 20 + i, 2, 1, grip, 1);
      rect(c, 48, 15, 6, 6, art.accent, 1);
      rect(c, 50, 17, 2, 2, '#ffffff', 0.8);
      break;
    case 'gun':
      rect(c, 45, 38, 12, 4, shade(art.outfit, -30), 1);
      rect(c, 45, 42, 5, 5, grip, 1);
      rect(c, 55, 39, 4, 2, art.accent, 1);
      break;
    case 'fan':
      for (let i = 0; i < 8; i++) {
        rect(c, 44 + i, 34 - Math.round(i * 0.5), 2, 10, art.accent, 0.92);
      }
      rect(c, 43, 43, 3, 4, grip, 1);
      break;
    case 'claw':
      for (let i = 0; i < 3; i++) {
        rect(c, 44 + i, 40 + i * 2, 2, 4, metal, 1);
      }
      break;
    default:
      break;
  }
}

/**
 * Adds a 1px dark outline around every opaque pixel. This is what makes the chibi read
 * clearly against the busy isometric dioramas.
 */
function outlinePass(c, color = 'rgba(4,8,18)') {
  const src = Buffer.from(c.data);
  const alphaAt = (x, y) => {
    if (x < 0 || y < 0 || x >= c.size || y >= c.size) return 0;
    return src[(y * c.size + x) * 4 + 3];
  };
  for (let y = 0; y < c.size; y++) {
    for (let x = 0; x < c.size; x++) {
      if (alphaAt(x, y) > 40) continue;
      const touching =
        alphaAt(x - 1, y) > 40 ||
        alphaAt(x + 1, y) > 40 ||
        alphaAt(x, y - 1) > 40 ||
        alphaAt(x, y + 1) > 40;
      if (touching) px(c, x, y, color, 0.55);
    }
  }
}

function renderCompanion(art) {
  const c = makeCanvas(SIZE);
  drawAura(c, art);
  drawShadow(c);
  drawWings(c, art);
  drawTail(c, art);
  drawLegs(c, art);
  drawArms(c, art);
  drawTorso(c, art);
  drawHead(c, art);
  drawHair(c, art);
  drawEars(c, art);
  drawHorns(c, art);
  drawWeapon(c, art);
  drawFace(c, art);
  drawHeadwear(c, art);
  outlinePass(c);
  return c;
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
function main() {
  const wantsSheet = process.argv.includes('--contact-sheet');
  const file = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const rendered = [];
  for (const companion of file.companions) {
    const canvas = renderCompanion(companion.art);
    const outPath = path.join(OUT_DIR, `${companion.key}.png`);
    fs.writeFileSync(outPath, encodePNG(SIZE, SIZE, canvas.data));
    rendered.push({ key: companion.key, canvas });
  }

  // Remove sprites for companions that no longer exist in the data.
  const valid = new Set(file.companions.map(c => `${c.key}.png`));
  for (const existing of fs.readdirSync(OUT_DIR)) {
    if (!valid.has(existing)) {
      fs.unlinkSync(path.join(OUT_DIR, existing));
      console.log(`  removed stale sprite ${existing}`);
    }
  }

  console.log(`generated ${rendered.length} companion sprites at ${SIZE}x${SIZE} in ${OUT_DIR}`);
  for (const r of rendered) console.log(`  ${r.key}`);

  if (wantsSheet) {
    const scale = 2;
    const cols = 7;
    const rows = Math.ceil(rendered.length / cols);
    const cw = SIZE * scale;
    const sheet = makeCanvas(cw * cols);
    // The sheet canvas helper assumes a square; build it manually instead.
    const sheetData = Buffer.alloc(cw * cols * cw * rows * 4);
    const sheetObj = { size: cw * cols, data: sheetData };
    for (let i = 0; i < rendered.length; i++) {
      const cx = (i % cols) * cw;
      const cy = Math.floor(i / cols) * cw;
      const src = rendered[i].canvas;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const si = (y * SIZE + x) * 4;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const dx = cx + x * scale + sx;
              const dy = cy + y * scale + sy;
              const di = (dy * sheetObj.size + dx) * 4;
              sheetData[di] = src.data[si];
              sheetData[di + 1] = src.data[si + 1];
              sheetData[di + 2] = src.data[si + 2];
              sheetData[di + 3] = src.data[si + 3];
            }
          }
        }
      }
    }
    fs.writeFileSync('.companion-sheet.png', encodePNG(sheetObj.size, cw * rows, sheetData));
    console.log(`contact sheet: .companion-sheet.png (${sheetObj.size}x${cw * rows}, ${rendered.length} sprites)`);
    void sheet;
  }
}

main();
