// Generates a 64x64 pixel-art model for every companion in src/game/companions.json.
//
// The drawing follows the standard pixel-art discipline for this size:
//
//   * One light source, top-left, applied through a light map rather than by hand, so every
//     sprite is lit consistently and never "pillow shaded" (a uniform dark rim reads as flat).
//   * Five-stage ramps per material (bright highlight, highlight, base, shadow, deep shadow)
//     built by hue shifting: shadows rotate toward blue and gain saturation, highlights move
//     toward warm and lose it. Materials get their own contrast - metal and gems are hard and
//     specular, cloth is matte, skin and fur are soft.
//   * Selective outlining: a dark tinted line only where the shape meets the background on the
//     shaded side, a lighter inner edge on the lit side. Never pure black.
//   * Faces and highlights are drawn on a detail layer after shading so they stay crisp.
//
// Silhouette comes first: weapons, hats, wings and tails are part of the outline, because a
// 64x64 character has to be identifiable as a solid black shape.
//
// Usage:
//   node scripts/generate_companion_sprites.cjs
//   node scripts/generate_companion_sprites.cjs --contact-sheet
const fs = require('fs');
const path = require('path');
const { encodePNG } = require('./lib/png.cjs');

const SIZE = 64;
const DATA = path.join('src', 'game', 'companions.json');
const OUT_DIR = path.join('public', 'assets', 'companions');

// ---------------------------------------------------------------------------
// colour
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  const f = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = t => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

/** Rotates a hue toward `target` along the shorter arc, by at most `amount` degrees. */
function rotateHueToward(h, target, amount) {
  let delta = ((target - h + 540) % 360) - 180;
  const step = Math.max(-amount, Math.min(amount, delta));
  return h + step;
}

/**
 * Builds a five-stage ramp by hue shifting: shadows cool down and saturate, highlights warm up
 * and desaturate. This is what stops shadows from looking like flat grey mud.
 */
function ramp(hex, kind = 'cloth') {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  const profile = {
    skin: { sh: 0.16, sh2: 0.32, hi: 0.16, hi2: 0.34, satUp: 0.10, satDown: 0.05, cool: 14, warm: 6 },
    hair: { sh: 0.24, sh2: 0.44, hi: 0.26, hi2: 0.50, satUp: 0.14, satDown: 0.06, cool: 18, warm: 8 },
    cloth: { sh: 0.24, sh2: 0.44, hi: 0.15, hi2: 0.30, satUp: 0.16, satDown: 0.04, cool: 20, warm: 6 },
    leather: { sh: 0.22, sh2: 0.40, hi: 0.16, hi2: 0.32, satUp: 0.14, satDown: 0.05, cool: 16, warm: 8 },
    metal: { sh: 0.30, sh2: 0.55, hi: 0.34, hi2: 0.66, satUp: 0.20, satDown: 0.10, cool: 24, warm: 10 },
    gem: { sh: 0.30, sh2: 0.52, hi: 0.42, hi2: 0.78, satUp: 0.24, satDown: 0.08, cool: 22, warm: 8 },
    fur: { sh: 0.19, sh2: 0.35, hi: 0.17, hi2: 0.32, satUp: 0.12, satDown: 0.04, cool: 14, warm: 6 },
    paper: { sh: 0.17, sh2: 0.33, hi: 0.12, hi2: 0.24, satUp: 0.12, satDown: 0.05, cool: 12, warm: 6 },
    liquid: { sh: 0.20, sh2: 0.38, hi: 0.26, hi2: 0.50, satUp: 0.10, satDown: 0.06, cool: 16, warm: 6 }
  }[kind] || { sh: 0.24, sh2: 0.44, hi: 0.16, hi2: 0.32, satUp: 0.14, satDown: 0.05, cool: 18, warm: 6 };

  // Lightness moves multiplicatively: down by a fraction of the current value, up by a fraction
  // of the remaining headroom. A fixed additive step barely separates a pale hair colour such as
  // #fda4af, so a pastel character came out looking unshaded while a dark one looked crushed.
  // The floor keeps near-black outfits (an obsidian maid, a void slime) from losing all detail.
  const shadeStage = k => Math.max(0.08, Math.min(1, l * (1 - k)));
  const lightStage = k => Math.max(0, Math.min(1, l + (1 - l) * k));

  const stage = (newL, ds, dh) =>
    rgbToHex(...hslToRgb(h + dh, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, newL))));

  return {
    sh2: stage(shadeStage(profile.sh2), profile.satUp, rotateHueToward(h, 240, profile.cool) - h),
    sh: stage(shadeStage(profile.sh), profile.satUp * 0.7, rotateHueToward(h, 240, profile.cool * 0.7) - h),
    base: hex,
    hi: stage(lightStage(profile.hi), -profile.satDown, rotateHueToward(h, 45, profile.warm) - h),
    hi2: stage(lightStage(profile.hi2), -profile.satDown * 1.6, rotateHueToward(h, 45, profile.warm * 1.4) - h)
  };
}

/** A stepped grey ramp for bone, bandages and porcelain. */
function neutralRamp(hex, kind = 'paper') {
  return ramp(hex, kind);
}

/** Linear blend between two hex colours, used for the gel gradient on a rapier blade. */
function lerpHex(from, to, t) {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}

/**
 * Shifts a colour in HSL, optionally rotating its hue toward a target. Used for the derived
 * tones the face and accents need (lash line, iris rim, eyelid, mouth, dark trim).
 */
function adjust(hex, dl = 0, ds = 0, hueTarget = null, hueAmount = 0) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const hh = hueTarget === null ? h : rotateHueToward(h, hueTarget, hueAmount);
  return rgbToHex(...hslToRgb(hh, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, l + dl))));
}

// ---------------------------------------------------------------------------
// pixel buffers
// ---------------------------------------------------------------------------
function createPaint(size) {
  return {
    size,
    color: new Array(size * size).fill(null),
    mat: new Array(size * size).fill(null),
    /** Detail pixels are drawn after shading so eyes and sparkles stay crisp. */
    detail: new Array(size * size).fill(null),
    detailMat: new Array(size * size).fill(null)
  };
}

function setPixel(p, x, y, color, mat = 'cloth') {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= p.size || yi >= p.size) return;
  const i = yi * p.size + xi;
  p.color[i] = color;
  p.mat[i] = mat;
}

function setDetail(p, x, y, color, mat = 'gem') {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= p.size || yi >= p.size) return;
  const i = yi * p.size + xi;
  p.detail[i] = color;
  p.detailMat[i] = mat;
}

function fill(p, x, y, w, h, color, mat = 'cloth') {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) setPixel(p, x + dx, y + dy, color, mat);
  }
}

function fillDetail(p, x, y, w, h, color, mat = 'gem') {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) setDetail(p, x + dx, y + dy, color, mat);
  }
}

/** Draws a symmetric horizontal span centred on cx (inclusive of both ends). */
function span(p, cx, y, halfWidth, color, mat = 'cloth') {
  const hw = Math.round(halfWidth);
  fill(p, cx - hw, y, hw * 2 + 1, 1, color, mat);
}

/** Draws a filled ellipse. */
function ellipse(p, cx, cy, rx, ry, color, mat = 'cloth') {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const t = (y - cy) / (ry || 1);
    const w = Math.sqrt(Math.max(0, 1 - t * t)) * rx;
    if (w < 0.4) continue;
    span(p, cx, y, w, color, mat);
  }
}

/** Draws a tapered limb: a quad from (x0,y0)->(x1,y1) with the given start/end radii. */
function limb(p, x0, y0, x1, y1, r0, r1, color, mat = 'cloth') {
  const steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const r = r0 + (r1 - r0) * t;
    ellipse(p, x, y, r, r * 0.85, color, mat);
  }
}

// ---------------------------------------------------------------------------
// light map + shading + selective outline
// ---------------------------------------------------------------------------
/**
 * Applies a top-left light map over the flat paint layer.
 *
 * The map is derived from the shape itself: pixels on the upper/left rim catch the light,
 * pixels on the lower/right rim fall into the deep shadow, and the interior follows a
 * directional gradient. Because the rim treatment is directional rather than uniform this
 * avoids pillow shading - the light source is readable from the result.
 */
function shade(p) {
  const n = p.size;
  const filled = i => p.color[i] !== null;

  // Distance to the nearest empty pixel, 1 or 2, for rim detection.
  const nearEdge = (x, y, radius) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) return true;
        if (dx * dx + dy * dy <= radius * radius && !filled(ny * n + nx)) return true;
      }
    }
    return false;
  };

  let minX = n, maxX = -1, minY = n, maxY = -1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!filled(y * n + x)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const out = Buffer.alloc(n * n * 4);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const color = p.color[i];
      if (!color) continue;

      // Down-right bias: the light comes from the top-left, so brightness falls off as a pixel
      // moves down and to the right. The vertical term is curved so the upper two-thirds of the
      // sprite (head and chest) stay near the base tone and the falloff concentrates on the
      // legs; a linear term darkened the face because the head sits high in a tall bounding box.
      const depth = Math.pow(Math.max(0, (y - minY) / spanY), 1.5);
      let light = 1.12 - ((x - minX) / spanX) * 0.34 - depth * 0.62;
      if (nearEdge(x, y, 1)) {
        // On the rim: which side of the shape are we on?
        const litRim = !filled((y - 1) * n + x) || !filled(y * n + (x - 1));
        const darkRim = !filled((y + 1) * n + x) || !filled(y * n + (x + 1));
        if (litRim) light += 0.3;
        if (darkRim) light -= 0.3;
      }

      const table = ramp(color, p.mat[i] || 'cloth');
      let stage;
      if (light >= 1.3) stage = table.hi2;
      else if (light >= 1.12) stage = table.hi;
      else if (light >= 0.82) stage = table.base;
      else if (light >= 0.52) stage = table.sh;
      else stage = table.sh2;

      const [r, g, b] = hexToRgb(stage);
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
  }

  return out;
}

/**
 * Selective outline (sel-out): a dark tinted line only where the sprite meets the background on
 * the shaded side, and a lighter tinted line on the lit side. Pure black is avoided because it
 * detaches the character from the diorama behind it.
 */
function selectiveOutline(p, rgba) {
  const n = p.size;
  const alphaAt = (x, y) => {
    if (x < 0 || y < 0 || x >= n || y >= n) return 0;
    return rgba[(y * n + x) * 4 + 3];
  };
  const colorAt = (x, y) => {
    const i = (y * n + x) * 4;
    return [rgba[i], rgba[i + 1], rgba[i + 2]];
  };

  const writes = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (alphaAt(x, y) > 0) continue;

      const up = alphaAt(x, y - 1) > 0;
      const down = alphaAt(x, y + 1) > 0;
      const left = alphaAt(x - 1, y) > 0;
      const right = alphaAt(x + 1, y) > 0;
      if (!up && !down && !left && !right) continue;

      // Find a neighbouring body colour to tint from.
      let src = null;
      for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (alphaAt(nx, ny) > 0) {
          src = colorAt(nx, ny);
          break;
        }
      }
      if (!src) continue;

      // The outline pixel sits on the lower/right of the shape when it touches from above or
      // the left, which means it is on the shaded side.
      const litSide = up || left;
      const [h, s, l] = rgbToHsl(src[0], src[1], src[2]);
      const shadeHue = rotateHueToward(h, 240, 18);
      const outline = litSide
        ? rgbToHex(...hslToRgb(shadeHue, Math.min(1, s * 0.9), Math.max(0.1, l * 0.62)))
        : rgbToHex(...hslToRgb(shadeHue, Math.min(1, s * 1.05), Math.max(0.05, l * 0.34)));

      writes.push([x, y, outline]);
    }
  }

  for (const [x, y, col] of writes) {
    const [r, g, b] = hexToRgb(col);
    const i = (y * n + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = 255;
  }
}

/** Composites the unshaded detail layer on top of the shaded result. */
function compositeDetail(p, rgba) {
  const n = p.size;
  for (let i = 0; i < n * n; i++) {
    const col = p.detail[i];
    if (!col) continue;
    const [r, g, b] = hexToRgb(col);
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }
}

// ---------------------------------------------------------------------------
// character construction (64x64, roughly 2.4 heads tall)
// ---------------------------------------------------------------------------
const CX = 32;

/**
 * Head silhouette rows: [y, halfWidth]. The widest point sits above the eyes and the shape
 * tapers into a chin, which is what makes the face read as a face rather than a block.
 */
const HEAD_ROWS = [
  [10, 6], [11, 8], [12, 9], [13, 10], [14, 10], [15, 11], [16, 11], [17, 11],
  [18, 11], [19, 11], [20, 11], [21, 10], [22, 10], [23, 10], [24, 9], [25, 9],
  [26, 8], [27, 8], [28, 7], [29, 6], [30, 5], [31, 3]
];
const HEAD_TOP = 10;
const HEAD_BOTTOM = 31;
const NECK_Y = 31;
const TORSO_TOP = 33;
const EYE_Y = 21;

function drawAura(p, art) {
  // The aura is applied as a translucent overlay after shading; see overlayAura().
  void p;
  void art;
}

function drawShadow(p) {
  for (let y = 57; y < 62; y++) {
    const w = 18 - Math.abs(y - 59) * 5;
    if (w <= 0) continue;
    span(p, CX, y, w, '#0a1020', 'cloth');
  }
}

function drawWings(p, art) {
  if (art.wings === 'none') return;
  const membrane = art.accent;
  const frame = art.outfit;

  if (art.wings === 'dragon') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 15; i++) {
        const x = CX + side * (10 + i);
        const top = 26 + Math.round(i * 0.7);
        const height = 13 - Math.round(i * 0.62);
        if (height <= 1) break;
        fill(p, x, top, 1, height, i % 4 === 0 ? frame : membrane, 'cloth');
      }
      // wing finger tips
      for (let i = 0; i < 4; i++) {
        const x = CX + side * (12 + i * 4);
        fill(p, x, 26 + Math.round(i * 0.7) - 1, 2, 2, frame, 'cloth');
      }
    }
    return;
  }
  if (art.wings === 'bat') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const x = CX + side * (10 + i);
        const top = 29 + Math.round(Math.sin(i / 3) * 3);
        fill(p, x, top, 1, 10 - Math.round(i * 0.4), i % 3 === 0 ? frame : membrane, 'cloth');
      }
    }
    return;
  }
  if (art.wings === 'feather') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        const x = CX + side * (10 + i);
        const top = 28 + Math.round(i * 0.8);
        fill(p, x, top, 2, 6 + Math.round(i * 0.4), i % 2 === 0 ? membrane : frame, 'cloth');
      }
    }
    return;
  }
  if (art.wings === 'insect') {
    for (const side of [-1, 1]) {
      ellipse(p, CX + side * 17, 32, 8, 5, membrane, 'gem');
      ellipse(p, CX + side * 15, 40, 6, 4, membrane, 'gem');
    }
  }
}

function drawTail(p, art) {
  if (art.tail === 'none') return;
  const base = art.hair;
  const tip = art.accent;

  if (art.tail === 'cat' || art.tail === 'dog' || art.tail === 'dragon') {
    const len = art.tail === 'dragon' ? 20 : 14;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const x = CX + 8 + Math.round(i * (art.tail === 'dragon' ? 0.85 : 0.9));
      const y = 49 - Math.round(Math.sin(t * 2.2) * 4) - Math.round(i * 0.5);
      const r = Math.max(1, 3 - i * 0.12);
      ellipse(p, x, y, r, r, base, 'fur');
    }
    ellipse(p, CX + 8 + Math.round(len * 0.9), 49 - Math.round(len * 0.5) - 2, art.tail === 'dragon' ? 3 : 2, 2, tip, 'gem');
    return;
  }
  if (art.tail === 'fox9') {
    // Nine separate tails: narrower brushes and a wider fan so they read as a fan of tails
    // rather than one solid mass.
    for (let t = 0; t < 9; t++) {
      const spread = (t - 4) * 2.4;
      for (let i = 0; i < 13; i++) {
        const x = CX + 6 + i * 0.9 + spread * (i / 13) * 0.7;
        const y = 48 - i + Math.sin(i / 2.2) * 1.6 - Math.abs(spread) * 0.3;
        const r = Math.max(1, 1.9 - i * 0.06);
        ellipse(p, x, y, r, r, i > 9 ? tip : base, 'fur');
      }
    }
    return;
  }
  if (art.tail === 'scorpion') {
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const x = CX + 9 + Math.round(Math.sin(t * 2.6) * 8);
      const y = 50 - i;
      ellipse(p, x, y, 2.2, 1.8, i % 3 === 0 ? tip : base, 'metal');
    }
    ellipse(p, CX + 9 + Math.round(Math.sin(2.6) * 8), 34, 2.5, 2.5, tip, 'gem');
    return;
  }
  if (art.tail === 'mermaid') {
    for (let i = 0; i < 16; i++) {
      const y = 47 + i;
      ellipse(p, CX, y, 11 - i * 0.45, 1.6, i % 4 === 0 ? tip : base, 'gem');
    }
    for (const side of [-1, 1]) {
      ellipse(p, CX + side * 12, 59, 6, 3.5, tip, 'gem');
    }
    return;
  }
  if (art.tail === 'flame') {
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      const x = CX + 9 + Math.round(Math.sin(t * 3) * 5);
      const y = 52 - i * 1.1;
      ellipse(p, x, y, 3 - t * 1.6, 3.4 - t * 1.8, i > 9 ? tip : base, 'gem');
    }
    return;
  }
  if (art.tail === 'slime') {
    for (let i = 0; i < 11; i++) {
      ellipse(p, CX + 9 + i, 50 + Math.round(Math.sin(i / 2) * 3), 2.2, 2, base, 'liquid');
    }
  }
}

function drawLegs(p, art) {
  const style = art.outfitStyle;

  if (art.body === 'slime') {
    for (let y = 45; y < 59; y++) {
      const t = (y - 45) / 14;
      ellipse(p, CX, y, 8 + Math.sin(t * Math.PI) * 10, 1.4, art.outfit, 'liquid');
    }
    ellipse(p, CX - 7, 50, 3, 2, art.accent, 'liquid');
    return;
  }
  if (art.body === 'ghost') {
    for (let y = 45; y < 60; y++) {
      ellipse(p, CX, y, 11 - (y - 45) * 0.2, 1.4, art.outfit, 'cloth');
    }
    for (const dx of [-9, -3, 3, 9]) {
      ellipse(p, CX + dx, 58 + (Math.abs(dx) % 3), 2.5, 3, art.outfit, 'cloth');
    }
    return;
  }
  if (art.body === 'mermaid') {
    ellipse(p, CX - 5, 49, 4, 4, art.outfit, 'cloth');
    ellipse(p, CX + 5, 49, 4, 4, art.outfit, 'cloth');
    return;
  }

  // Human / mech: skirt, then legs, then boots.
  const skirted = ['dress', 'robe', 'kimono', 'cloak', 'plate', 'armor', 'apron', 'corset', 'fur'];
  if (skirted.includes(style)) {
    for (let y = 45; y < 57; y++) {
      const t = (y - 45) / 12;
      ellipse(p, CX, y, 11 + t * 3.4, 1.4, art.outfit, 'cloth');
    }
    ellipse(p, CX, 56, 14, 1.6, art.accent, 'cloth');
  }

  const legColor = style === 'shells' || style === 'bandage' ? art.skin : art.outfit;
  const boot = art.accent;
  for (const side of [-1, 1]) {
    limb(p, CX + side * 4, 49, CX + side * 5, 58, 3, 2.6, legColor, 'cloth');
    ellipse(p, CX + side * 5, 58, 3.6, 2.2, boot, 'leather');
  }
}

function drawTorso(p, art) {
  const style = art.outfitStyle;
  const outfit = art.outfit;

  if (art.body === 'slime') {
    for (let y = 33; y < 46; y++) {
      const t = (y - 33) / 13;
      ellipse(p, CX, y, 8 + Math.sin(t * Math.PI) * 6, 1.4, outfit, 'liquid');
    }
    // Inner core, visible through the gel.
    setDetail(p, CX, 40, art.accent, 'gem');
    setDetail(p, CX - 1, 39, art.accent, 'gem');
    return;
  }

  // Shared torso silhouette with a narrow waist.
  const torsoRows = [
    [33, 7], [34, 8], [35, 8], [36, 8], [37, 7], [38, 7], [39, 6], [40, 6],
    [41, 6], [42, 7], [43, 7], [44, 8], [45, 8]
  ];
  for (const [y, hw] of torsoRows) span(p, CX, y, hw, outfit, 'cloth');

  // Collar
  if (style === 'kimono') {
    // A kimono is a robe in the outfit colour with a narrow contrasting trim, not a wide block
    // of the accent colour - a broad pale panel here visually flattens the whole sprite.
    fill(p, CX - 7, 33, 6, 8, outfit, 'cloth');
    fill(p, CX + 1, 33, 6, 8, outfit, 'cloth');
    fill(p, CX - 7, 33, 1, 8, art.accent, 'cloth');
    fill(p, CX + 6, 33, 1, 8, art.accent, 'cloth');
    fill(p, CX - 1, 34, 2, 9, art.skin, 'skin');
  } else if (style === 'armor' || style === 'plate') {
    fill(p, CX - 8, 33, 16, 2, art.accent, 'metal');
    for (const side of [-1, 1]) {
      ellipse(p, CX + side * 8, 36, 2.5, 3, art.accent, 'metal');
    }
  } else {
    fill(p, CX - 6, 33, 12, 1, art.accent, 'cloth');
  }

  // Bodice trim and belt
  if (style === 'corset' || style === 'dress' || style === 'apron') {
    fill(p, CX - 6, 40, 12, 1, art.accent, 'leather');
  }
  fill(p, CX - 7, 43, 14, 2, art.accent, 'leather');
  setDetail(p, CX, 43, art.eyes, 'metal');

  // Apron for maid outfits
  if (style === 'apron') {
    fill(p, CX - 5, 36, 10, 10, '#f8fafc', 'paper');
    fill(p, CX - 5, 36, 10, 1, art.accent, 'cloth');
  }

  // Bandage wrappings over a mummy
  if (style === 'bandage') {
    for (let y = 34; y < 45; y += 3) fill(p, CX - 9, y, 18, 1, '#e7e5e4', 'paper');
  }

  // Fur trim for yeti-style outfits
  if (style === 'fur') {
    fill(p, CX - 9, 33, 18, 2, art.accent, 'fur');
    for (const side of [-1, 1]) ellipse(p, CX + side * 9, 35, 3, 3, art.accent, 'fur');
  }

  // Cape / cloak behind the shoulders
  if (art.cape) {
    for (let y = 31; y < 55; y++) {
      const t = (y - 31) / 24;
      ellipse(p, CX, y + 1, 10 + t * 7, 1.5, art.cape, 'cloth');
    }
  }

  // Pattern overlay
  drawPattern(p, art);
}

function drawPattern(p, art) {
  if (!art.pattern || art.pattern === 'none') return;
  const accent = art.accent;

  if (art.pattern === 'stripes') {
    for (let y = 35; y < 45; y += 3) fill(p, CX - 8, y, 16, 1, accent, 'cloth');
    return;
  }
  if (art.pattern === 'scales') {
    for (let y = 36; y < 45; y += 3) {
      for (let x = -7; x <= 7; x += 3) {
        setDetail(p, CX + x + (y % 6 === 0 ? 1 : 0), y, accent, 'gem');
      }
    }
    return;
  }
  if (art.pattern === 'cracks') {
    const seeds = [[-5, 38], [-1, 41], [3, 37], [6, 43], [-7, 43]];
    for (const [dx, y] of seeds) {
      setDetail(p, CX + dx, y, accent, 'gem');
      setDetail(p, CX + dx + 1, y + 1, accent, 'gem');
    }
    return;
  }
  if (art.pattern === 'stars') {
    for (const [dx, y] of [[-5, 38], [4, 36], [0, 42], [6, 41]]) {
      setDetail(p, CX + dx, y, accent, 'gem');
      setDetail(p, CX + dx - 1, y, accent, 'gem');
      setDetail(p, CX + dx + 1, y, accent, 'gem');
      setDetail(p, CX + dx, y - 1, accent, 'gem');
      setDetail(p, CX + dx, y + 1, accent, 'gem');
    }
    return;
  }
  if (art.pattern === 'runes') {
    for (const [dx, y] of [[-4, 37], [3, 40], [-2, 43]]) {
      fillDetail(p, CX + dx, y, 2, 3, accent, 'gem');
    }
  }
}

function drawArms(p, art) {
  const skin = art.skin;
  const sleeve = art.outfit;
  const cuff = art.accent;

  for (const side of [-1, 1]) {
    const sx = CX + side * 9;
    const ex = CX + side * 12;
    // Upper sleeve
    limb(p, sx, 34, ex, 40, 2.8, 2.4, sleeve, 'cloth');
    // Cuff
    ellipse(p, ex, 40, 2.6, 1.8, cuff, 'cloth');
    // Forearm and hand
    limb(p, ex, 41, ex + side * 1, 46, 2.1, 1.9, skin, 'skin');
    ellipse(p, ex + side, 47, 2.2, 2, skin, 'skin');
  }
}

function drawHead(p, art) {
  const skin = art.skin;
  for (const [y, hw] of HEAD_ROWS) span(p, CX, y, hw, skin, 'skin');
  // Neck
  fill(p, CX - 3, 31, 6, 2, skin, 'skin');
}

function drawHairBack(p, art) {
  const hair = art.hair;
  const style = art.hairStyle;

  // Volume behind the head, always slightly wider than the skull.
  for (let y = 9; y < 32; y++) {
    const t = (y - 9) / 21;
    const hw = 12 - Math.abs(t - 0.3) * 2.4;
    span(p, CX, y, Math.max(8, hw), hair, 'hair');
  }

  if (style === 'long' || style === 'wavy') {
    for (let y = 30; y < 57; y++) {
      const t = (y - 30) / 27;
      const wobble = style === 'wavy' ? Math.sin(t * 7) * 2 : 0;
      for (const side of [-1, 1]) {
        ellipse(p, CX + side * (12 + wobble + t * 1.5), y, 3.4 - t * 1.1, 1.6, hair, 'hair');
      }
    }
  }
  if (style === 'twin') {
    for (const side of [-1, 1]) {
      ellipse(p, CX + side * 17, 22, 5, 6, hair, 'hair');
      for (let y = 31; y < 47; y++) {
        ellipse(p, CX + side * (17 + (y - 31) * 0.12), y, 3.6, 1.5, hair, 'hair');
      }
    }
  }
  if (style === 'ponytail') {
    for (let i = 0; i < 22; i++) {
      const t = i / 22;
      const x = CX + 11 + Math.sin(t * 3) * 3 + t * 3;
      const y = 18 + i * 1.4;
      ellipse(p, x, y, Math.max(1.4, 3.6 - t * 1.6), 2.2, hair, 'hair');
    }
  }
  if (style === 'bun') {
    ellipse(p, CX, 5, 7, 6, hair, 'hair');
  }
}

function drawHairFront(p, art) {
  const hair = art.hair;
  const style = art.hairStyle;

  // Skull cap
  for (let y = 8; y < 18; y++) {
    const t = (y - 8) / 10;
    span(p, CX, y, Math.round(12 - t * 1.5), hair, 'hair');
  }

  // Bangs with pointed tips, which is what makes the silhouette read as anime hair.
  // The centre strands are kept short so the fringe frames the eyes instead of covering them.
  const bangs = [
    [-10, 5], [-7, 4], [-4, 3], [-1, 2], [2, 3], [5, 4], [8, 5]
  ];
  for (const [dx, len] of bangs) {
    for (let i = 0; i < len; i++) {
      fill(p, CX + dx + (dx > 0 ? 1 : -1), 16 + i, 2, 1, hair, 'hair');
    }
  }

  // Side locks framing the face.
  for (const side of [-1, 1]) {
    for (let y = 16; y < 33; y++) {
      const w = 2.6 - Math.abs(y - 24) * 0.08;
      ellipse(p, CX + side * (11 + (y > 25 ? 0.6 : 0)), y, Math.max(1, w), 1.4, hair, 'hair');
    }
  }

  // Crown highlight band - the classic anime hair shine.
  for (let x = -7; x <= 7; x++) {
    const y = 10 + Math.round(Math.abs(x) * 0.22);
    setDetail(p, CX + x, y, '#ffffff', 'hair');
    setDetail(p, CX + x, y + 1, '#ffffff', 'hair');
  }
}

function drawEars(p, art) {
  if (art.ears === 'none') return;
  const hair = art.hair;
  const inner = art.accent;

  const pointed = (side, rows, baseY, baseSpread, mat) => {
    for (let i = 0; i < rows; i++) {
      const w = Math.max(2, 4 - Math.floor(i / 2));
      const x = CX + side * baseSpread - (side < 0 ? w - 1 : 0);
      fill(p, x, baseY - i, w, 1, hair, mat);
      if (i > 0 && i < rows - 1) setPixel(p, x + (side < 0 ? 1 : w - 2), baseY - i, inner, mat);
    }
  };

  switch (art.ears) {
    case 'cat':
      pointed(-1, 6, 12, 7, 'fur');
      pointed(1, 6, 12, 4, 'fur');
      break;
    case 'fox':
      pointed(-1, 7, 12, 8, 'fur');
      pointed(1, 7, 12, 3, 'fur');
      break;
    case 'wolf':
    case 'dog':
      pointed(-1, 6, 13, 9, 'fur');
      pointed(1, 6, 13, 4, 'fur');
      break;
    case 'goblin':
      for (let i = 0; i < 6; i++) {
        ellipse(p, CX - 11 - i, 18 + i * 1.1, 2.2, 1.7, art.skin, 'skin');
        ellipse(p, CX + 11 + i, 18 + i * 1.1, 2.2, 1.7, art.skin, 'skin');
      }
      break;
    case 'elf':
      for (let i = 0; i < 6; i++) {
        ellipse(p, CX - 11 - i, 18 + i * 0.8, 2.2, 1.5, art.skin, 'skin');
        ellipse(p, CX + 11 + i, 18 + i * 0.8, 2.2, 1.5, art.skin, 'skin');
      }
      break;
    case 'yeti':
      ellipse(p, CX - 8, 8, 5, 4, hair, 'fur');
      ellipse(p, CX + 8, 8, 5, 4, hair, 'fur');
      break;
    default:
      break;
  }
}

function drawHorns(p, art) {
  if (art.horns === 'none') return;
  const horn = art.accent;

  if (art.horns === 'dragon' || art.horns === 'curled') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const curve = art.horns === 'curled' ? Math.sin(i / 9 * Math.PI) * 3 : 0;
        const x = CX + side * (6 + i * 0.85 + curve);
        const y = 9 - i * 0.95;
        ellipse(p, x, y, Math.max(1, 2.2 - i * 0.1), Math.max(1, 2 - i * 0.1), horn, 'metal');
      }
    }
    return;
  }
  if (art.horns === 'imp') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        ellipse(p, CX + side * (6 + i * 0.5), 10 - i, Math.max(1, 2 - i * 0.25), 1.6, horn, 'metal');
      }
    }
    return;
  }
  if (art.horns === 'demon') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        ellipse(p, CX + side * (5 + i * 0.9), 10 - i * 1.1, Math.max(1, 2.1 - i * 0.15), 1.8, horn, 'metal');
      }
    }
  }
}

function drawFace(p, art) {
  const eye = art.eyes;
  const lash = adjust(art.hair, -0.62, -0.15, 240, 18);
  const irisRim = adjust(eye, -0.22, 0.08, 240, 20);
  const lid = adjust(art.skin, -0.24, 0.16, 240, 16);
  const brow = adjust(art.hair, -0.14, -0.06);
  const mouth = adjust(art.skin, -0.34, 0.36, 350, 18);

  const drawEye = (side) => {
    const ex = CX + side * 5;
    const top = EYE_Y;
    // Sclera: 5 wide, 5 tall, corners clipped for a rounded anime eye.
    for (let y = 0; y < 5; y++) {
      const w = y === 0 || y === 4 ? 3 : 5;
      const x0 = ex - Math.floor(w / 2);
      fillDetail(p, x0, top + y, w, 1, '#ffffff', 'gem');
    }
    // Upper lash line, thicker at the outer corner.
    fillDetail(p, ex - 3, top, 6, 1, lash, 'gem');
    fillDetail(p, ex + side * 2 - (side > 0 ? 1 : 0), top + 1, 2, 1, lash, 'gem');
    // Iris with a darker lower rim for depth
    fillDetail(p, ex - 1, top + 1, 3, 3, eye, 'gem');
    fillDetail(p, ex - 1, top + 3, 3, 1, irisRim, 'gem');
    // Pupil
    fillDetail(p, ex, top + 2, 1, 2, '#0b1020', 'gem');
    // Specular highlight, top-left of the iris
    fillDetail(p, ex - 1, top + 1, 1, 1, '#ffffff', 'gem');
    // Lower lid
    fillDetail(p, ex - 2, top + 4, 4, 1, lid, 'gem');
  };

  drawEye(-1);
  drawEye(1);

  // Eyebrows
  fillDetail(p, CX - 7, EYE_Y - 2, 4, 1, brow, 'gem');
  fillDetail(p, CX + 4, EYE_Y - 2, 4, 1, brow, 'gem');

  // Mouth
  fillDetail(p, CX - 1, 28, 2, 1, mouth, 'gem');

  // Blush
  for (const side of [-1, 1]) {
    fillDetail(p, CX + side * 8 - (side > 0 ? 2 : 0), 26, 3, 1, '#f87171', 'gem');
  }
}

function drawHeadwear(p, art) {
  const accent = art.accent;
  const white = '#f1f5f9';
  const dark = adjust(accent, -0.5, 0.06, 240, 20);

  switch (art.headwear) {
    case 'maid':
      fill(p, CX - 9, 8, 18, 2, white, 'paper');
      fill(p, CX - 12, 9, 6, 4, white, 'paper');
      fill(p, CX + 6, 9, 6, 4, white, 'paper');
      fill(p, CX - 2, 9, 4, 2, accent, 'cloth');
      break;
    case 'hat':
    case 'tophat':
      fill(p, CX - 13, 9, 26, 2, dark, 'cloth');
      fill(p, CX - 7, 0, 14, 9, dark, 'cloth');
      fill(p, CX - 7, 6, 14, 2, accent, 'cloth');
      break;
    case 'goggles':
      for (const side of [-1, 1]) {
        ellipse(p, CX + side * 5, 11, 4, 3.4, accent, 'metal');
        ellipse(p, CX + side * 5, 11, 2.6, 2.2, '#a5f3fc', 'gem');
        setDetail(p, CX + side * 5 - 2, 10, '#ffffff', 'gem');
      }
      fill(p, CX - 9, 10, 18, 1, '#57534e', 'leather');
      break;
    case 'crown':
      fill(p, CX - 8, 7, 16, 2, accent, 'metal');
      for (const dx of [-8, -3, 3, 8]) fill(p, CX + dx - 1, 3, 2, 5, accent, 'metal');
      for (const dx of [-8, -3, 3, 8]) setDetail(p, CX + dx, 3, '#ffffff', 'gem');
      fill(p, CX - 8, 8, 16, 1, dark, 'metal');
      break;
    case 'tiara':
      fill(p, CX - 8, 8, 16, 1, accent, 'metal');
      setDetail(p, CX, 6, accent, 'gem');
      setDetail(p, CX - 5, 7, accent, 'gem');
      setDetail(p, CX + 5, 7, accent, 'gem');
      setDetail(p, CX, 5, '#ffffff', 'gem');
      break;
    case 'turban':
      ellipse(p, CX, 9, 11, 5, accent, 'cloth');
      fill(p, CX - 11, 11, 22, 2, dark, 'cloth');
      ellipse(p, CX + 9, 16, 3, 5, accent, 'cloth');
      setDetail(p, CX, 6, '#ffffff', 'gem');
      break;
    case 'bandana':
      fill(p, CX - 9, 10, 18, 3, accent, 'cloth');
      fill(p, CX + 7, 12, 7, 2, dark, 'cloth');
      break;
    case 'hood':
      ellipse(p, CX, 14, 13, 10, accent, 'cloth');
      for (let y = 12; y < 26; y++) {
        ellipse(p, CX - 13, y, 3, 1.6, accent, 'cloth');
        ellipse(p, CX + 13, y, 3, 1.6, accent, 'cloth');
      }
      break;
    case 'bandage':
      for (let y = 10; y < 30; y += 3) fill(p, CX - 11, y, 22, 1, '#e7e5e4', 'paper');
      break;
    case 'nemes':
      // Egyptian striped headdress: wide, falling in lappets either side of the face.
      fill(p, CX - 12, 8, 24, 3, accent, 'cloth');
      for (const side of [-1, 1]) {
        for (let y = 11; y < 28; y++) {
          ellipse(p, CX + side * 12, y, 3.4, 1.6, y % 4 < 2 ? accent : '#1e40af', 'cloth');
        }
      }
      setDetail(p, CX - 1, 6, '#facc15', 'gem');
      setDetail(p, CX, 6, '#facc15', 'gem');
      setDetail(p, CX + 1, 6, '#facc15', 'gem');
      break;
    case 'mask':
      fill(p, CX - 9, 7, 18, 4, accent, 'cloth');
      fill(p, CX - 4, 3, 8, 5, accent, 'cloth');
      fill(p, CX - 4, 4, 8, 1, dark, 'cloth');
      break;
    case 'foxmask':
      // Fox mask pushed up onto the side of the head.
      ellipse(p, CX + 11, 9, 5, 5, '#f8fafc', 'paper');
      fill(p, CX + 11, 7, 2, 4, accent, 'cloth');
      setDetail(p, CX + 9, 9, '#0b1020', 'gem');
      setDetail(p, CX + 13, 9, '#0b1020', 'gem');
      break;
    case 'flower':
      for (const [dx, dy, col] of [[7, 9, accent], [-7, 10, '#ffffff'], [-9, 14, accent]]) {
        ellipse(p, CX + dx, dy, 2.6, 2.2, col, 'gem');
        setDetail(p, CX + dx, dy, '#ffffff', 'gem');
      }
      break;
    case 'halo':
      for (let x = -9; x <= 9; x++) {
        const y = 3 + Math.round(x * x * 0.02);
        setDetail(p, CX + x, y, accent, 'gem');
        setDetail(p, CX + x, y + 1, accent, 'gem');
      }
      break;
    default:
      break;
  }
}

/**
 * A rapier: a slender thrusting blade on a swept guard, held in the right hand.
 *
 * The blade is drawn as a gel that runs from `bladeGradient[0]` at the guard to
 * `bladeGradient[1]` at the tip, which is what gives the acid rapier its emerald-to-sapphire
 * read. A 1px specular line down the lit edge and a few acid droplets make it look wet.
 */
function drawRapier(p, art) {
  const from = (art.bladeGradient && art.bladeGradient[0]) || art.accent;
  const to = (art.bladeGradient && art.bladeGradient[1]) || art.accent;
  const metal = '#e2e8f0';
  const grip = '#4a2f1a';

  const TIP_X = 57;
  const TIP_Y = 17;
  const GUARD_X = CX + 11;
  const GUARD_Y = 45;
  const steps = 32;

  // Gel blade, tapering to a point.
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = GUARD_X + (TIP_X - GUARD_X) * t;
    const y = GUARD_Y + (TIP_Y - GUARD_Y) * t;
    const w = Math.max(0.5, 1.7 - t * 1.15);
    ellipse(p, x, y, w, w * 0.85, lerpHex(from, to, t), 'gem');
  }

  // Specular edge on the lit (upper-left) side of the blade.
  for (let i = 3; i <= steps - 2; i++) {
    const t = i / steps;
    const x = GUARD_X + (TIP_X - GUARD_X) * t - 1;
    const y = GUARD_Y + (TIP_Y - GUARD_Y) * t;
    setDetail(p, x, y, '#ffffff', 'gem');
  }

  // Acid droplets clinging to the blade.
  for (const t of [0.22, 0.5, 0.76]) {
    const x = GUARD_X + (TIP_X - GUARD_X) * t;
    const y = GUARD_Y + (TIP_Y - GUARD_Y) * t;
    setDetail(p, x + 2, y + 1, lerpHex(from, to, t + 0.15), 'gem');
  }

  // Swept guard: a shallow cup over the hand plus a crossbar.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + (i / 8) * 0.7);
    ellipse(p, GUARD_X - 4 + i, GUARD_Y + 1 + Math.sin(a) * 1.6, 1.3, 1.2, metal, 'metal');
  }
  fill(p, GUARD_X - 5, GUARD_Y + 2, 9, 1, metal, 'metal');

  // Grip and pommel.
  for (let i = 0; i < 6; i++) {
    ellipse(p, GUARD_X - 3 + i * 0.5, GUARD_Y + 4 + i, 1.4, 1.3, i % 2 === 0 ? grip : '#6b4423', 'leather');
  }
  ellipse(p, GUARD_X, GUARD_Y + 11, 2.1, 2, metal, 'metal');
}

/**
 * High-pressure acid bubbles bursting around the character.
 *
 * Drawn on the detail layer so the film stays crisp. Each bubble is a wobbled film ring, a
 * shaded lower rim, a short acid pool inside, a specular arc on the lit side, and a few radial
 * burst spikes. Positions are deliberately pulled inward: an earlier version placed them at the
 * canvas edge, where the spikes were clipped and the sprite read as static rather than as
 * bubbles popping.
 */
function drawBubbleBurst(p, art) {
  const count = Math.max(0, Number(art.bubbleBurst) || 0);
  if (!count) return;

  const film = art.bubbleColor || art.accent;
  const acid = art.accent;
  const rim = adjust(film, -0.22, 0.14, 240, 18);

  // Deterministic placement so the sprite is reproducible. The rapier runs diagonally through
  // the upper right, so the bubbles fan down the free left side plus one clear of the blade -
  // an earlier layout put a bubble straight on top of the blade and the two read as noise.
  const spots = [
    { cx: CX - 19, cy: 13, r: 5.0 },
    { cx: CX - 20, cy: 31, r: 4.4 },
    { cx: CX - 18, cy: 49, r: 4.8 },
    { cx: CX + 23, cy: 44, r: 4.0 },
    { cx: CX - 13, cy: 4, r: 3.2 },
    { cx: CX + 20, cy: 6, r: 3.0 }
  ];

  for (let b = 0; b < Math.min(count, spots.length); b++) {
    const { cx, cy, r } = spots[b];

    // Film ring, wobbled like a pressurised membrane. The lower-right arc uses the shaded rim
    // tone so the bubble reads as a sphere lit from the same top-left as everything else.
    for (let a = 0; a < 360; a += 4) {
      const rad = (a * Math.PI) / 180;
      const wobble = 1 + Math.sin(a * 0.09 + b) * 0.12;
      const x = Math.round(cx + Math.cos(rad) * r * wobble);
      const y = Math.round(cy + Math.sin(rad) * r * wobble);
      const shaded = a > 20 && a < 200;
      setDetail(p, x, y, shaded ? rim : film, 'gem');
    }

    // A little acid pooled along the inside of the lower rim.
    for (let a = 30; a <= 150; a += 6) {
      const rad = (a * Math.PI) / 180;
      setDetail(p, Math.round(cx + Math.cos(rad) * (r - 2)), Math.round(cy + Math.sin(rad) * (r - 2.2)), acid, 'gem');
    }

    // Specular arc on the upper-left of the film.
    for (let a = 200; a <= 250; a += 5) {
      const rad = (a * Math.PI) / 180;
      setDetail(p, Math.round(cx + Math.cos(rad) * (r - 1.4)), Math.round(cy + Math.sin(rad) * (r - 1.4)), '#ffffff', 'gem');
    }

    // Burst spikes radiating outward, kept short so nothing reaches the canvas edge.
    for (let k = 0; k < 5; k++) {
      const a = -50 + k * 32 + b * 11;
      const rad = (a * Math.PI) / 180;
      for (let d = r + 1; d <= r + 2.6; d++) {
        setDetail(p, Math.round(cx + Math.cos(rad) * d), Math.round(cy + Math.sin(rad) * d), film, 'gem');
      }
      // A single flung droplet at the tip of every other spike.
      if (k % 2 === 0) {
        setDetail(p, Math.round(cx + Math.cos(rad) * (r + 4)), Math.round(cy + Math.sin(rad) * (r + 4)), acid, 'gem');
      }
    }
  }
}
function drawWeapon(p, art) {
  if (art.weapon === 'none') return;
  if (art.weapon === 'rapier') {
    drawRapier(p, art);
    return;
  }
  const metal = '#cbd5e1';
  const grip = '#6b4423';
  const glow = art.accent;

  switch (art.weapon) {
    case 'dagger': {
      const x = 48, y = 42;
      for (let i = 0; i < 9; i++) ellipse(p, x + i * 0.7, y - i, Math.max(1, 2 - i * 0.1), 1.5, metal, 'metal');
      ellipse(p, x - 2, y + 2, 2, 2, grip, 'leather');
      setDetail(p, x + 1, y - 2, '#ffffff', 'gem');
      break;
    }
    case 'sword': {
      for (let i = 0; i < 18; i++) ellipse(p, 47 + i * 0.5, 48 - i, 2, 1.7, metal, 'metal');
      fill(p, 44, 46, 7, 2, glow, 'metal');
      fill(p, 42, 47, 3, 6, grip, 'leather');
      setDetail(p, 49, 38, '#ffffff', 'gem');
      break;
    }
    case 'scimitar': {
      for (let i = 0; i < 16; i++) {
        const t = i / 16;
        ellipse(p, 46 + i * 0.9 - t * t * 6, 50 - i * 1.15, 2.2, 1.7, metal, 'metal');
      }
      fill(p, 42, 51, 5, 2, glow, 'metal');
      setDetail(p, 52, 40, '#ffffff', 'gem');
      break;
    }
    case 'staff': {
      for (let i = 0; i < 26; i++) ellipse(p, 50, 18 + i, 1.6, 1.2, grip, 'leather');
      ellipse(p, 50, 15, 4, 4, glow, 'gem');
      setDetail(p, 49, 13, '#ffffff', 'gem');
      break;
    }
    case 'gun': {
      fill(p, 44, 40, 14, 3, '#57534e', 'metal');
      fill(p, 44, 43, 5, 5, grip, 'leather');
      fill(p, 56, 41, 3, 1, glow, 'metal');
      ellipse(p, 46, 40, 3, 3, '#78716c', 'metal');
      setDetail(p, 50, 40, '#ffffff', 'gem');
      break;
    }
    case 'fan': {
      for (let i = 0; i < 9; i++) {
        const a = (-0.85 + i * 0.21);
        for (let r = 1; r < 9; r++) {
          ellipse(p, 45 + Math.cos(a) * r, 42 + Math.sin(a) * r, 1.4, 1.4, i % 2 === 0 ? glow : '#f8fafc', 'cloth');
        }
      }
      ellipse(p, 45, 42, 2, 2, grip, 'leather');
      break;
    }
    case 'claw': {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) ellipse(p, 44 + i * 2.2, 42 + j, 1.3, 1.2, metal, 'metal');
      }
      break;
    }
    case 'scythe': {
      for (let i = 0; i < 24; i++) ellipse(p, 50, 20 + i, 1.6, 1.2, grip, 'leather');
      for (let i = 0; i < 10; i++) {
        ellipse(p, 50 - i * 1.4, 18 + Math.round(Math.sin(i / 10 * Math.PI) * 5), 2, 1.7, metal, 'metal');
      }
      break;
    }
    case 'bow': {
      for (let i = 0; i < 18; i++) {
        const t = i / 18;
        ellipse(p, 51 + Math.sin(t * Math.PI) * 4, 25 + i * 1.6, 1.5, 1.4, grip, 'leather');
      }
      for (let i = 0; i < 28; i++) setDetail(p, 51 + Math.sin((i / 28) * Math.PI) * 4 - 3, 26 + i * 1.02, '#e2e8f0', 'gem');
      break;
    }
    case 'shield': {
      ellipse(p, 47, 41, 7, 9, art.outfit, 'metal');
      ellipse(p, 47, 41, 5, 7, art.accent, 'metal');
      setDetail(p, 47, 39, '#ffffff', 'gem');
      break;
    }
    case 'tray': {
      ellipse(p, 47, 42, 8, 2.6, '#a16207', 'metal');
      ellipse(p, 45, 40, 2, 2, '#f8fafc', 'paper');
      ellipse(p, 49, 40, 2, 2, '#f8fafc', 'paper');
      setDetail(p, 47, 39, art.accent, 'gem');
      break;
    }
    case 'gohei': {
      for (let i = 0; i < 24; i++) ellipse(p, 49, 20 + i, 1.5, 1.2, '#e7e5e4', 'paper');
      for (let i = 0; i < 5; i++) {
        fill(p, 46 + i * 2, 14, 2, 6, '#ffffff', 'paper');
      }
      setDetail(p, 49, 13, art.accent, 'gem');
      break;
    }
    case 'pickaxe': {
      for (let i = 0; i < 20; i++) ellipse(p, 49, 22 + i, 1.6, 1.2, grip, 'leather');
      for (let i = 0; i < 9; i++) ellipse(p, 49 - 5 + i * 1.3, 21 - Math.abs(i - 4) * 0.4, 1.6, 1.5, metal, 'metal');
      break;
    }
    default:
      break;
  }
}

/**
 * Blends the aura ring over the finished sprite. It is applied last, at low alpha, so it reads
 * as light around the character instead of being shaded and outlined like a solid object.
 */
function overlayAura(rgba, art) {
  if (!art.aura) return;
  const style = art.auraStyle || 'glow';
  const [ar, ag, ab] = hexToRgb(art.aura);

  for (let y = 6; y < 62; y++) {
    for (let x = 2; x < 62; x++) {
      const dx = (x - CX) / 24;
      const dy = (y - 38) / 27;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 0.7 || d >= 1.08) continue;
      if (style === 'petals' && (x * 3 + y * 5) % 7 !== 0) continue;
      if (style === 'sparks' && (x * 7 + y * 13) % 17 !== 0) continue;
      if (style === 'water' && (x + y) % 5 !== 0) continue;
      if (style === 'frost' && (x * 5 + y * 3) % 13 !== 0) continue;
      if (style === 'void' && (x * 11 + y * 7) % 23 !== 0) continue;
      if (style === 'flame' && y < 20) continue;

      // Falloff: brighter right at the ring.
      const t = 1 - Math.abs(d - 0.88) / 0.2;
      const alpha = Math.max(0, Math.min(1, t)) * 0.42;
      const i = (y * SIZE + x) * 4;
      const dstA = rgba[i + 3] / 255;
      const outA = alpha + dstA * (1 - alpha);
      rgba[i] = Math.round((ar * alpha + rgba[i] * dstA * (1 - alpha)) / outA);
      rgba[i + 1] = Math.round((ag * alpha + rgba[i + 1] * dstA * (1 - alpha)) / outA);
      rgba[i + 2] = Math.round((ab * alpha + rgba[i + 2] * dstA * (1 - alpha)) / outA);
      rgba[i + 3] = Math.round(outA * 255);
    }
  }
}

function renderCompanion(art) {
  const p = createPaint(SIZE);
  drawShadow(p);
  drawWings(p, art);
  drawTail(p, art);
  drawHairBack(p, art);
  drawLegs(p, art);
  drawTorso(p, art);
  drawArms(p, art);
  drawHead(p, art);
  drawHairFront(p, art);
  drawEars(p, art);
  drawHorns(p, art);
  drawWeapon(p, art);
  drawFace(p, art);
  drawHeadwear(p, art);
  drawBubbleBurst(p, art);

  const rgba = shade(p);
  selectiveOutline(p, rgba);
  compositeDetail(p, rgba);
  overlayAura(rgba, art);
  return rgba;
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
    const rgba = renderCompanion(companion.art);
    fs.writeFileSync(path.join(OUT_DIR, `${companion.key}.png`), encodePNG(SIZE, SIZE, rgba));
    rendered.push({ key: companion.key, rgba });
  }

  const valid = new Set(file.companions.map(c => `${c.key}.png`));
  for (const existing of fs.readdirSync(OUT_DIR)) {
    if (!valid.has(existing)) {
      fs.unlinkSync(path.join(OUT_DIR, existing));
      console.log(`  removed stale sprite ${existing}`);
    }
  }

  console.log(`generated ${rendered.length} companion sprites at ${SIZE}x${SIZE} in ${OUT_DIR}`);

  if (wantsSheet) {
    // --scale=N enlarges the sheet (default 2). --only=<key> limits it to one companion, which
    // is how a single large showcase image is produced for review.
    const scaleArg = process.argv.find(a => a.startsWith('--scale='));
    const scale = scaleArg ? Math.max(1, Math.min(8, Number(scaleArg.split('=')[1]) || 2)) : 2;
    const onlyArg = process.argv.find(a => a.startsWith('--only='));
    const only = onlyArg ? onlyArg.split('=')[1] : null;

    const sheetItems = only ? rendered.filter(r => r.key === only) : rendered;
    if (only && sheetItems.length === 0) throw new Error(`--only=${only} matched no companion`);

    const cols = only ? 1 : 7;
    const rows = Math.ceil(sheetItems.length / cols);
    const cw = SIZE * scale;
    const w = cw * cols;
    const h = cw * rows;
    const sheet = Buffer.alloc(w * h * 4);
    sheetItems.forEach((r, i) => {
      const ox = (i % cols) * cw;
      const oy = Math.floor(i / cols) * cw;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const si = (y * SIZE + x) * 4;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const di = ((oy + y * scale + sy) * w + (ox + x * scale + sx)) * 4;
              sheet[di] = r.rgba[si];
              sheet[di + 1] = r.rgba[si + 1];
              sheet[di + 2] = r.rgba[si + 2];
              sheet[di + 3] = r.rgba[si + 3];
            }
          }
        }
      }
    });
    const sheetName = only ? `.companion-showcase-${only}.png` : '.companion-sheet.png';
    fs.writeFileSync(sheetName, encodePNG(w, h, sheet));
    console.log(`sheet: ${sheetName} (${w}x${h}, scale ${scale}x, ${sheetItems.length} sprite(s))`);
  }
}

main();
