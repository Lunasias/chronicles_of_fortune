// ===========================================================================
// ISOMETRIC FOLIAGE PAINTER — 64x64 fantasy isekai trees
// ===========================================================================
//
// The map's trees used to be smooth vector art (ctx.ellipse, gradients) painted on a 68x88
// canvas and then blitted into a 64x84 box — a non-integer resample that threw away the crisp
// edges every other model in the game has, and a different visual language from the isometric
// structures. This painter replaces them with true 64x64 pixel-art models built from the same
// surface primitives and the same style rules, so the whole map reads as one set.
//
// Style rules, identical to IsometricBuildingPainter:
//
//   * One light source, top-left. Every leaf mass is brightest on its upper-left shoulder and
//     deepest on its lower-right, so a canopy of overlapping puffs still reads as one volume.
//   * Three tones per material plus a valley tone, shifted multiplicatively in HSL rather than
//     additively, so saturated crimson and pale snow both separate properly.
//   * Selective outlining: the silhouette is closed with a tinted dark line, never pure black,
//     and the lit top-left edges keep a lighter inner line.
//   * Silhouette first: each species must be identifiable from its outline alone — a rounded
//     crown, a stacked conifer, a flat mushroom cap, a bare thorn, a weeping willow.
//
// Nothing here touches the DOM, so the same art can be encoded to PNG off-line
// (see scripts/generate_foliage_sprites.cjs) and re-painted byte-for-byte in a test.

import { IsoSurface, faceTones, shift, type IsoColors } from './IsometricBuildingPainter';

export const FOLIAGE_SIZE = 64;
/**
 * Root diamond centre. The renderer blits at `(px - 32, py - 54)`, which puts the trunk base on
 * the tile centre exactly like a structure's footprint diamond.
 */
export const FOLIAGE_BASE_X = 32;
export const FOLIAGE_BASE_Y = 54;

/** The three shaded tones plus a bright speckle and a cast-shadow colour. */
interface PuffTones extends IsoColors {
  /** One-pixel highlight for a leaf catching the light. Not part of the ramp. */
  hi: string;
}

function tones(base: string, lit: number, mid: number, dark: number, valley: number, hiShift = 0.62): PuffTones {
  return { ...faceTones(base, lit, mid, dark, valley), hi: shift(base, hiShift, -0.1, 60, 8) };
}

// ---------------------------------------------------------------------------
// deterministic noise
// ---------------------------------------------------------------------------
/**
 * A cheap integer hash in [0, 1). Foliage needs an irregular rim, but the art has to be
 * reproducible: Math.random would make the exported PNG and the runtime sprite disagree, and
 * the test suite compares them byte-for-byte.
 */
function noise2(x: number, y: number, seed: number): number {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Reads a painted pixel's alpha, so routines can follow a shape they did not draw. */
function alphaAt(s: IsoSurface, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return 0;
  return s.data[(y * s.w + x) * 4 + 3];
}

// ---------------------------------------------------------------------------
// shape primitives
// ---------------------------------------------------------------------------
/**
 * A leaf mass: a slightly squashed disc shaded by a top-left light.
 *
 * The lighting term is the dot product of the surface normal with the light direction,
 * approximated by the pixel's offset from the disc centre. That is what makes a cluster of these
 * read as one rounded canopy instead of a pile of flat circles.
 */
function puff(
  s: IsoSurface,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  c: PuffTones,
  seed: number,
  ragged = 0.2
): void {
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
    const dy = (y - cy) / ry;
    if (dy < -1.2 || dy > 1.2) continue;
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
      const dx = (x - cx) / rx;
      const d = Math.sqrt(dx * dx + dy * dy);
      // The ragged rim breaks the perfect circle, which is the difference between a leaf mass
      // and a balloon. Interior pixels are never dropped, so no holes open up.
      if (d > 1 - ragged * noise2(x, y, seed)) continue;
      const l = -dx * 0.62 - dy * 0.78;
      s.px(x, y, l > 0.36 ? c.top : l > -0.08 ? c.left : l > -0.52 ? c.right : c.valley);
    }
  }
  // Two speckles on the lit shoulder: a single pixel reads as noise, a pair reads as a leaf.
  const hx = Math.round(cx - rx * 0.36);
  const hy = Math.round(cy - ry * 0.46);
  s.px(hx, hy, c.hi);
  s.px(hx + 1, hy, c.hi);
}

/** A tapered trunk or twig. `lean` offsets the tip horizontally. */
function trunk(
  s: IsoSurface,
  cx: number,
  yBase: number,
  yTop: number,
  wBase: number,
  wTop: number,
  c: PuffTones,
  lean = 0
): void {
  const span = Math.max(1, yBase - yTop);
  for (let y = yTop; y <= yBase; y++) {
    const t = (y - yTop) / span;
    const ax = cx + lean * (1 - t);
    const w = wTop + (wBase - wTop) * t;
    for (let x = Math.round(ax - w); x <= Math.round(ax + w); x++) {
      const rel = (x - (ax - w)) / Math.max(1, 2 * w);
      // A vertical cylinder shows no top face, so the lit edge takes the top tone and the
      // shaded side walks down to the valley tone.
      s.px(x, y, rel < 0.26 ? c.top : rel < 0.58 ? c.left : rel < 0.84 ? c.right : c.valley);
    }
  }
}

/** A branch or root claw: a straight tapered tube, used for bare and twisted species. */
function stroke(
  s: IsoSurface,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  c: PuffTones
): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const w = w0 + (w1 - w0) * t;
    for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
      const rel = (dx + w) / Math.max(1, 2 * w);
      s.px(x + dx, y, rel < 0.34 ? c.top : rel < 0.74 ? c.left : c.right);
    }
    // A dark under-edge keeps a thin twig from reading as a flat line.
    if (w >= 0.9) s.px(x, y + 1, c.valley);
  }
}

/** Soft elliptical cast shadow. Drawn first so the trunk paints over it. */
function groundShadow(s: IsoSurface, cx: number, cy: number, rx: number, ry: number, strength = 0.42): void {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      s.px(x, y, '#0a1020', strength * (1 - d) * (1 - d));
    }
  }
}

/** A splayed root collar so the trunk does not appear to be stuck into the ground. */
function rootFlare(s: IsoSurface, cx: number, y: number, hw: number, c: PuffTones): void {
  for (let i = 0; i <= hw; i++) {
    const t = i / hw;
    const y1 = y + i * 0.5;
    for (const dir of [-1, 1]) {
      const x = cx + dir * i;
      s.px(x, y1, dir < 0 ? c.left : c.right);
      s.px(x, y1 - 1, dir < 0 ? c.top : c.left);
    }
    if (t >= 1) break;
  }
}

/**
 * Paints a snow line along the top edge of whatever has already been drawn in a column range.
 *
 * A snow-laden conifer is mostly read from its snow, so this follows the silhouette instead of
 * being placed at fixed coordinates. The `band` argument is what makes it work on a stack of
 * boughs: only columns whose topmost solid pixel falls inside this bough's own crown get snow,
 * so a lower bough never paints over the underside of the one above it.
 */
function snowCap(
  s: IsoSurface,
  cx: number,
  rx: number,
  yTop: number,
  band: number,
  snow: string
): void {
  const cold = shift(snow, -0.24, 0.04, 220, 10);
  const lip = shift(snow, -0.42, 0.05, 220, 12);
  for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
    let found = -1;
    for (let y = Math.max(0, yTop - 1); y <= yTop + band; y++) {
      if (alphaAt(s, x, y) > 40) {
        found = y;
        break;
      }
    }
    if (found < 0) continue;
    // Snow on the shaded right side of the bough is cooler and darker, not the same white.
    s.px(x, found, x < cx ? snow : cold);
    s.px(x, found + 1, lip);
  }
}

/**
 * Darkens the bottom-most pixel of every column across a band: the rolled edge of a mushroom
 * cap, where the gills show. Following the silhouette keeps the rim exactly one pixel thick at
 * every width instead of relying on a hard-coded ellipse.
 */
function underShade(s: IsoSurface, cx: number, rx: number, yTop: number, yBottom: number, c: PuffTones): void {
  for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
    for (let y = Math.min(s.h - 1, yBottom); y >= yTop; y--) {
      if (alphaAt(s, x, y) <= 40) continue;
      s.px(x, y, c.valley);
      s.px(x, y - 1, c.right);
      break;
    }
  }
}

/** A hanging willow strand: a one-pixel tube with a lit tip. */
function frond(s: IsoSurface, x: number, yTop: number, len: number, c: PuffTones): void {
  for (let i = 0; i < len; i++) {
    const y = yTop + i;
    s.px(x - 1, y, c.left);
    s.px(x, y, c.right);
    if (i % 3 === 1) s.px(x + 1, y, c.valley);
  }
  s.px(x, yTop + len - 1, c.left);
  s.px(x, yTop + len, c.hi);
}

// ---------------------------------------------------------------------------
// variation
// ---------------------------------------------------------------------------
interface Variant {
  dx: number;
  dy: number;
  scale: number;
  seed: number;
}

/**
 * Four silhouettes per species. The renderer asks for `node.id % 4`, so a forest never shows the
 * same tree twice in a row without four distinct buffers being cached.
 */
const VARIANTS: Variant[] = [
  { dx: 0, dy: 0, scale: 1, seed: 0 },
  { dx: -2, dy: 1, scale: 0.92, seed: 17 },
  { dx: 2, dy: -1, scale: 1.08, seed: 91 },
  { dx: -1, dy: 2, scale: 0.84, seed: 203 }
];

interface PuffSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
  tones: PuffTones;
}

/** Draws leaf masses back to front, so the highest (furthest back) puff is never on top. */
function drawCrown(s: IsoSurface, specs: PuffSpec[], v: Variant, ragged = 0.2): void {
  const ordered = [...specs].sort((a, b) => a.y - b.y);
  for (const p of ordered) {
    puff(s, p.x + v.dx, p.y + v.dy, p.rx * v.scale, p.ry * v.scale, p.tones, v.seed, ragged);
  }
}

// ---------------------------------------------------------------------------
// palettes
// ---------------------------------------------------------------------------
const OAK_LEAF = tones('#4c8f46', 1, 0.8, 0.6, 0.46);
const OAK_BARK = tones('#6b4a33', 1, 0.82, 0.62, 0.48);
const PINE_LEAF = tones('#2f6b63', 0.9, 0.78, 0.58, 0.44);
const PINE_BARK = tones('#5a4436', 0.95, 0.8, 0.6, 0.46);
const SPORE_CAP = tones('#7b45b5', 1, 0.82, 0.6, 0.46);
const SPORE_STEM = tones('#cbb9e2', 1, 0.86, 0.68, 0.54);
const ASH_BARK = tones('#4a3830', 0.85, 0.72, 0.5, 0.36);
const WILLOW_LEAF = tones('#a8303c', 1, 0.8, 0.58, 0.44);
const WILLOW_BARK = tones('#46302f', 0.8, 0.72, 0.5, 0.36);
const SNOW = '#e6f2fb';

// ---------------------------------------------------------------------------
// species
// ---------------------------------------------------------------------------
/** Ancient dark oak: the default broadleaf of the grasslands and forests. */
function paintDarkOak(s: IsoSurface, v: Variant): void {
  groundShadow(s, 32, 54, 15, 7);
  rootFlare(s, 32, 54, 6, OAK_BARK);
  trunk(s, 32, 53, 28, 4.4, 2.6, OAK_BARK, v.dx * 0.4);
  // Two limbs breaking out under the crown, so the trunk does not vanish into it.
  stroke(s, 32, 34, 24, 28, 1.6, 1, OAK_BARK);
  stroke(s, 32, 32, 41, 26, 1.6, 1, OAK_BARK);
  drawCrown(
    s,
    [
      { x: 32, y: 20, rx: 12.5, ry: 10.5, tones: OAK_LEAF },
      { x: 22, y: 27, rx: 10.5, ry: 8.5, tones: OAK_LEAF },
      { x: 42, y: 27, rx: 10.5, ry: 8.5, tones: OAK_LEAF },
      { x: 32, y: 29, rx: 13.5, ry: 11, tones: OAK_LEAF },
      { x: 24, y: 37, rx: 10, ry: 8, tones: OAK_LEAF },
      { x: 40, y: 37, rx: 10, ry: 8, tones: OAK_LEAF },
      { x: 32, y: 41, rx: 11, ry: 8.5, tones: OAK_LEAF }
    ],
    v
  );
  // A few leaves scattered past the canopy edge, which sells the volume.
  for (const [x, y] of [
    [16, 34],
    [48, 33],
    [19, 45]
  ]) {
    s.px(x, y, OAK_LEAF.left);
    s.px(x + 1, y, OAK_LEAF.right);
  }
}

/** Frost crypt pine: a stacked conifer under snow. */
function paintFrostPine(s: IsoSurface, v: Variant): void {
  groundShadow(s, 32, 54, 14, 6.5);
  trunk(s, 32, 53, 34, 3.2, 2, PINE_BARK);
  // Five overlapping skirts. Uniform 8px spacing with `ry` close to a full step is what makes
  // the stack read as one triangular tree rather than a totem pole of separate discs, and the
  // widths taper hard so the outline is a cone.
  const boughs: Array<[number, number, number]> = [
    [44, 16, 6],
    [36, 14, 5.5],
    [28, 11.5, 5],
    [20, 9, 4.5],
    [13, 6, 4]
  ];
  for (const [cy, rx, ry] of boughs) {
    const y = cy + v.dy * 0.5;
    const x = 32 + v.dx * 0.5;
    const sx = rx * v.scale;
    const sy = ry * v.scale;
    puff(s, x, y, sx, sy, PINE_LEAF, v.seed, 0.26);
    // The snow line is laid on after each bough, so a lower bough's snow is never buried by the
    // one above it.
    snowCap(s, x, sx, Math.round(y - sy), Math.round(sy * 0.7), SNOW);
  }
  // A short leader spike, not a bare pole: the conifer tip is foliage, not trunk.
  s.px(32 + v.dx * 0.5, Math.round(9 + v.dy * 0.5), PINE_LEAF.left);
  s.px(32 + v.dx * 0.5, Math.round(8 + v.dy * 0.5), SNOW);
}

/** Gloomspore: a bioluminescent mushroom tree for the abyss, caverns and deep forest. */
function paintGloomSpore(s: IsoSurface, v: Variant): void {
  groundShadow(s, 32, 54, 14, 6.5, 0.5);
  rootFlare(s, 32, 54, 8, SPORE_STEM);
  // A mushroom stem is a stalk, not a pillar: it tapers, leans a little, and carries a ring.
  // An even unbroken column under a cap is the classic failed mushroom tree.
  trunk(s, 32, 53, 38, 4.2, 2.8, SPORE_STEM, 1.5 + v.dx * 0.5);
  // The ring, at the point where the stalk leaves the ground shadow of the cap.
  for (let x = 27; x <= 37; x++) s.px(x, 42, SPORE_STEM.left);
  for (let x = 28; x <= 36; x++) s.px(x, 41, SPORE_STEM.top);
  for (let x = 29; x <= 35; x++) s.px(x, 43, SPORE_STEM.valley);
  const capY = 28 + v.dy;
  const capX = 32 + v.dx;
  const capRx = 17 * v.scale;
  const capRy = 10 * v.scale;
  puff(s, capX, capY, capRx, capRy, SPORE_CAP, v.seed, 0.14);
  // The rolled gill edge, following the cap's own silhouette.
  underShade(s, capX, capRx, Math.round(capY + capRy - 2), Math.round(capY + capRy), SPORE_CAP);
  // Luminous pores. Each gets a small halo, which is what makes the species glow at night.
  for (const [x, y] of [
    [23, 24],
    [31, 21],
    [40, 25],
    [27, 30],
    [38, 30]
  ]) {
    const px = x + v.dx;
    const py = y + v.dy;
    s.glowDisc(px, py, 4, 3.5, '#c084fc', 0.5);
    s.px(px, py, '#f3e8ff');
  }
  // Drifting spores above the cap.
  for (const [x, y] of [
    [20, 12],
    [33, 6],
    [44, 13],
    [27, 3]
  ]) {
    s.glowDisc(x + v.dx, y + v.dy, 3, 3, '#a855f7', 0.4);
    s.px(x + v.dx, y + v.dy, '#e9d5ff');
  }
}

/** Ash thorn: a charred dead tree for volcanic and desert biomes, with embers in its cracks. */
function paintAshThorn(s: IsoSurface, v: Variant): void {
  groundShadow(s, 32, 54, 14, 6.5);
  rootFlare(s, 32, 54, 7, ASH_BARK);
  trunk(s, 32, 53, 30, 4.8, 2.8, ASH_BARK, -2 + v.dx * 0.4);
  // Bare limbs. A dead tree is read entirely from its branches, so they fork twice and stay
  // chunky: a spiderweb of one-pixel twigs disappears against the ground at board scale.
  stroke(s, 30, 40, 18, 28, 2.6, 1.6, ASH_BARK);
  stroke(s, 18, 28, 11, 19, 1.6, 0.8, ASH_BARK);
  stroke(s, 19, 29, 15, 17, 1.6, 0.8, ASH_BARK);
  stroke(s, 31, 36, 43, 26, 2.6, 1.6, ASH_BARK);
  stroke(s, 43, 26, 50, 17, 1.6, 0.8, ASH_BARK);
  stroke(s, 43, 27, 46, 14, 1.6, 0.8, ASH_BARK);
  stroke(s, 32, 34, 35, 19, 2, 1, ASH_BARK);
  stroke(s, 35, 19, 40, 12, 1.2, 0.6, ASH_BARK);
  // Charred cracks, the darkest tone, so the bark does not read as smooth brown wood.
  for (const [x, y, len] of [
    [29, 47, 5],
    [35, 44, 4],
    [30, 39, 4],
    [34, 34, 4]
  ]) {
    for (let i = 0; i < len; i++) s.px(x + (i % 2), y - i, ASH_BARK.valley);
  }
  // Embers: glowing cracks near the base, where the fire is still in the wood. Two halo passes
  // and a white-hot core, so they still read at board scale.
  for (const [x, y] of [
    [30, 48],
    [35, 43],
    [29, 38],
    [36, 51],
    [33, 36]
  ]) {
    s.glowDisc(x, y, 5, 4.5, '#c2410c', 0.5);
    s.glowDisc(x, y, 3, 2.6, '#ff7a2f', 0.6);
    s.px(x, y, '#ffe6b0');
  }
  // A little ash-dusted scrub at the foot, so the base is not two bare lines.
  for (const x of [22, 41]) {
    s.px(x, 53, ASH_BARK.left);
    s.px(x, 52, ASH_BARK.right);
    s.px(x + 1, 53, ASH_BARK.right);
  }
}

/** Blood willow: a weeping crimson blight-wood with clawed roots. */
function paintBloodWillow(s: IsoSurface, v: Variant): void {
  groundShadow(s, 32, 54, 16, 7.5, 0.5);
  // Clawed roots clutching the earth.
  stroke(s, 32, 52, 18, 59, 2, 0.8, WILLOW_BARK);
  stroke(s, 32, 52, 46, 59, 2, 0.8, WILLOW_BARK);
  stroke(s, 32, 52, 26, 61, 1.6, 0.6, WILLOW_BARK);
  stroke(s, 32, 52, 39, 61, 1.6, 0.6, WILLOW_BARK);
  trunk(s, 32, 52, 22, 4.4, 2.6, WILLOW_BARK, v.dx * 0.4);
  drawCrown(
    s,
    [
      { x: 32, y: 18, rx: 12, ry: 8.5, tones: WILLOW_LEAF },
      { x: 21, y: 24, rx: 10, ry: 7.5, tones: WILLOW_LEAF },
      { x: 43, y: 24, rx: 10, ry: 7.5, tones: WILLOW_LEAF },
      { x: 32, y: 24, rx: 14, ry: 9, tones: WILLOW_LEAF }
    ],
    v
  );
  // Weeping strands. Varied lengths and irregular spacing are essential: evenly spaced strands
  // of equal length read as a woven curtain rather than as hanging foliage. The fringe stops
  // short of the roots so a stretch of trunk stays visible and the tree keeps its structure.
  const strands: Array<[number, number]> = [
    [15, 9],
    [19, 17],
    [23, 12],
    [27, 20],
    [31, 11],
    [37, 15],
    [41, 8],
    [45, 18],
    [49, 12]
  ];
  for (const [x, len] of strands) {
    frond(s, x + v.dx, Math.round(26 + v.dy), len, WILLOW_LEAF);
  }
  // Two strands hanging in front of the canopy, which places the crown in front of the bark.
  frond(s, 29 + v.dx, Math.round(30 + v.dy), 13, WILLOW_LEAF);
  frond(s, 35 + v.dx, Math.round(30 + v.dy), 16, WILLOW_LEAF);
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export type FoliageKind = 'dark_oak' | 'frost_pine' | 'gloom_spore' | 'ash_thorn' | 'blood_willow';

/** Every name the renderer may pass, mapped onto the five painted species. */
const ALIASES: Record<string, FoliageKind> = {
  oak: 'dark_oak',
  tree: 'dark_oak',
  dark_oak: 'dark_oak',
  snow_pine: 'frost_pine',
  frost_pine: 'frost_pine',
  pine: 'frost_pine',
  magic: 'gloom_spore',
  gloom_spore: 'gloom_spore',
  mushroom: 'gloom_spore',
  ash_thorn: 'ash_thorn',
  ash: 'ash_thorn',
  blood_willow: 'blood_willow',
  willow: 'blood_willow'
};

/** Canonical species, in the order the exported contact sheet uses. */
export const FOLIAGE_KINDS: FoliageKind[] = [
  'dark_oak',
  'frost_pine',
  'gloom_spore',
  'ash_thorn',
  'blood_willow'
];

/** Maps any renderer-facing tree name onto a painted species, defaulting to the dark oak. */
export function resolveFoliageKind(kind: string): FoliageKind {
  return ALIASES[kind] ?? 'dark_oak';
}

/**
 * Paints one tree into a fresh 64x64 RGBA buffer.
 *
 * `variant` selects one of four silhouettes; it is normalised, so any integer is accepted.
 */
export function paintFoliage(kind: string, variant = 0): IsoSurface {
  const s = new IsoSurface(FOLIAGE_SIZE, FOLIAGE_SIZE);
  const v = VARIANTS[Math.abs(Math.floor(variant)) % VARIANTS.length];
  switch (resolveFoliageKind(kind)) {
    case 'frost_pine':
      paintFrostPine(s, v);
      break;
    case 'gloom_spore':
      paintGloomSpore(s, v);
      break;
    case 'ash_thorn':
      paintAshThorn(s, v);
      break;
    case 'blood_willow':
      paintBloodWillow(s, v);
      break;
    default:
      paintDarkOak(s, v);
  }
  s.outline();
  return s;
}
