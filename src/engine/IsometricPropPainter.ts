// ===========================================================================
// ISOMETRIC PROP PAINTER — 34x34 pixel-art floor clutter
// ===========================================================================
//
// The board's scattered clutter - boulders, grass tufts, wildflower patches, shrubs and magic
// crystals - was drawn with ctx.arc, ctx.ellipse and moveTo/lineTo paths, one call per prop per
// frame. Those antialias, so a rock in the middle of a pixel-art meadow had soft edges, and none
// of it was cached.
//
// This painter produces a fixed 34x34 RGBA buffer per prop, so the clutter is hard-edged pixel
// art like everything else and the renderer can blit a cached canvas instead of issuing a dozen
// path calls per prop per frame.
//
// Palettes are derived from the biome's own floor palette (`terrainPalette`) rather than a second
// hand-written table, so a boulder can never drift out of the biome it is sitting on, and every
// prop gets a night variant for free - which the vector version did not have at all, leaving
// bright green grass blades glowing on a darkened night floor.
//
// Size is a discrete bucket, not a scale factor. The prop generator picks a continuous 0.85-1.2
// scale; smoothly scaling a pixel-art sprite would either blur it or give uneven pixel sizes, so
// the scale is quantised to three baked sizes instead.

import { IsoSurface, lightnessOf, rockLevels, shift, toneRamp } from './IsometricBuildingPainter';
import { luma, resolveBiome, terrainPalette } from './IsometricTerrainPainter';
import type { BiomeType } from '../game/BoardMap';

export const PROP_SIZE = 34;
/** Base anchor: the point where the prop meets the ground. Blit at (px - 17, py - 28). */
export const PROP_BASE_X = 17;
export const PROP_BASE_Y = 28;

export type PropType = 'rock' | 'grass' | 'flower' | 'shrub' | 'crystal';

export const PROP_TYPES: PropType[] = ['rock', 'grass', 'flower', 'shrub', 'crystal'];
/** Alpha at or above which a pixel counts as part of the prop rather than its cast shadow. */
const SOLID = 200;
/** How many shapes each type has. Mirrors the prop generator's `Math.floor(rand * 4)`. */
export const PROP_VARIANTS = 4;
/** Discrete size buckets, replacing the generator's continuous 0.85-1.2 scale. */
export const PROP_SIZES = 3;

/** Maps the generator's continuous scale onto a baked size bucket. */
export function propSizeBucket(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  if (scale < 0.95) return 0;
  if (scale < 1.1) return 1;
  return 2;
}

interface PropTones {
  leafHi: string;
  leaf: string;
  leafLo: string;
  bloom: string;
  bloomLo: string;
  rockHi: string;
  rockMid: string;
  rockLo: string;
  crystal: string;
  /** The crystal's halo. Emissive, so it is never dimmed and brightens at night. */
  crystalGlow: string;
  /** Moss or snow cap colour, or null in a biome where nothing grows on the rocks. */
  cap: string | null;
  /** Wind-sway anchor: how far up the sprite the blades are allowed to lean from. */
  ink: string;
}

const CAPPED: BiomeType[] = [
  'grass',
  'forest',
  'waterfall_forest',
  'fairy_grove',
  'sakura_shrine',
  'snow',
  'celestial'
];

/**
 * Derives every prop colour from the biome's floor palette.
 *
 * One source of truth: a biome added to `TERRAIN_BIOMES` gets matching clutter automatically.
 *
 * Night is applied here rather than left to the palette table. Several biomes author the same
 * cliff colour for day and night (volcano and abyss both do), so a boulder painted only from
 * `cliffLeft`/`cliffRight` would sit unchanged and bright on a darkened night floor. The
 * emissive tones are deliberately excluded: a crystal and a glowing bloom should read brighter at
 * night, not dimmer.
 */
function propTones(biome: BiomeType, night: boolean): PropTones {
  const kind = resolveBiome(biome);
  const p = terrainPalette(kind, night);
  const rock = luma(p.cliffLeft) <= luma(p.cliffRight) ? p.cliffLeft : p.cliffRight;
  const bloom = p.glow ?? shift(p.accent, 0.5, -0.05, 40, 10);
  const dim = (color: string) => (night ? shift(color, -0.3, 0.05, 240, 12) : color);
  // Absolute-lightness ramp: a relative one collapses the two darkest steps for volcanic
  // obsidian, which is how a boulder ended up with three colours and no crack.
  const [rockHi, rockMid, rockLo, ink] = toneRamp(rock, rockLevels(lightnessOf(rock)), 0.04, 0.4);

  return {
    leafHi: dim(shift(p.accent, 0.35, -0.05, 60, 8)),
    leaf: dim(shift(p.accent, -0.05, 0.04, 240, 8)),
    leafLo: dim(shift(p.accent, -0.42, 0.08, 240, 16)),
    bloom,
    bloomLo: shift(bloom, -0.34, 0.06, 240, 12),
    rockHi: dim(rockHi),
    rockMid: dim(rockMid),
    rockLo: dim(rockLo),
    // A crystal takes the biome's glow when it has one and a bright form of its accent when it
    // does not. Falling back to one shared blue made five biomes - grass, desert, castle, cavern
    // and the crystal cavern - grow identical crystals.
    crystal: dim(p.glow ?? shift(p.accent, 0.45, -0.05, 40, 10)),
    // The halo is exempt from the night dimming: several biomes author the same glow for day and
    // night, so a crystal lit only by its glow would be byte-identical at both times of day.
    crystalGlow: night ? shift(p.glow ?? shift(p.accent, 0.45, -0.05, 40, 10), 0.18) : p.glow ?? shift(p.accent, 0.45, -0.05, 40, 10),
    cap:
      kind === 'snow' ? '#f8fafc' : CAPPED.includes(kind) ? dim(shift(p.accent, 0.3, -0.02, 60, 8)) : null,
    ink: dim(ink)
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function noise2(x: number, y: number, seed: number): number {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** A quantised 2:1 ground shadow. Every prop sits in one, which is what grounds it on the tile. */
function groundShadow(s: IsoSurface, cx: number, cy: number, rx: number, ry: number, alpha = 0.42): void {
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      s.px(x, y, '#0a1020', alpha * (1 - d) * (1 - d));
    }
  }
}

/** A one-pixel staircase line. */
function line(s: IsoSurface, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    s.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color);
  }
}

/** A rounded leaf mass shaded by a top-left light, the same rule the trees use. */
function disc(s: IsoSurface, cx: number, cy: number, rx: number, ry: number, tones: PropTones, seed: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y - cy) / ry;
    if (dy < -1 || dy > 1) continue;
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      if (dx * dx + dy * dy > 1) continue;
      const l = -dx * 0.62 - dy * 0.78;
      s.px(x, y, l > 0.36 ? tones.leafHi : l > -0.08 ? tones.leaf : l > -0.55 ? tones.leafLo : tones.ink);
    }
  }
  s.px(Math.round(cx - rx * 0.3), Math.round(cy - ry * 0.45), tones.leafHi);
  if (noise2(cx, cy, seed) > 0.5) s.px(Math.round(cx + rx * 0.2), Math.round(cy + ry * 0.3), tones.ink);
}

// ---------------------------------------------------------------------------
// the five prop types
// ---------------------------------------------------------------------------
/** A faceted boulder: shaded left facet, mid right facet, lit crest, and a cap in green biomes. */
function paintRock(s: IsoSurface, v: number, size: number, t: PropTones): void {
  const cx = PROP_BASE_X;
  const cy = PROP_BASE_Y;
  // Four distinct rock shapes rather than four sizes: a board strewn with the same boulder at
  // four scales reads as a bug.
  const w = 7 + v * 1.6 + size * 2.2;
  const h = 5.5 + ((v + 1) % 3) * 1.4 + size * 1.8;
  const lean = (v - 1.5) * 0.8;

  groundShadow(s, cx, cy + 1, w * 1.15, h * 0.55);

  const apex: [number, number] = [cx + lean, cy - h * 1.35];
  const leftBase: [number, number] = [cx - w, cy + h * 0.15];
  const rightBase: [number, number] = [cx + w * 0.95, cy + h * 0.1];
  const belly: [number, number] = [cx - w * 0.1, cy + h * 0.4];

  // West facet mid, east facet dark. The vector code this replaced had them the other way round,
  // which lit every boulder from the right while the tiles under it were lit from the left.
  s.poly([apex, leftBase, belly], t.rockMid);
  s.poly([apex, rightBase, belly], t.rockLo);
  // Lit crest, biased to the upper-left shoulder: a centred crest on a pale biome reads as a
  // bright lozenge and can out-weigh the whole east facet.
  s.poly(
    [
      apex,
      [cx + w * 0.16 + lean, cy - h * 0.62],
      [cx - w * 0.12 + lean, cy - h * 0.52],
      [cx - w * 0.52 + lean, cy - h * 0.8]
    ],
    t.rockHi
  );
  // A crack and a couple of chips, so the facets do not read as a folded paper shape.
  line(s, cx - w * 0.55 + lean, cy - h * 0.3, cx + w * 0.15, cy - h * 0.05, t.ink);
  s.px(cx + w * 0.5, cy - h * 0.75, t.rockHi);
  s.px(cx - w * 0.7, cy - h * 0.1, t.ink);

  // A lit rim along the top of the silhouette. The crest facet alone collapses on the small and
  // heavily leaning variants, which leaves a boulder with three tones and no readable top; a rim
  // derived from the silhouette cannot collapse. It is biased to the west, because the sun is.
  for (let x = 0; x < PROP_SIZE; x++) {
    for (let y = 0; y < PROP_SIZE; y++) {
      if (s.data[(y * s.w + x) * 4 + 3] <= SOLID) continue;
      s.px(x, y, x <= cx + w * 0.3 ? t.rockHi : t.rockMid);
      break;
    }
  }

  if (t.cap) {
    // Moss or snow sitting on the shoulders of the boulder.
    for (let i = 0; i <= Math.round(w * 0.7); i++) {
      const x = Math.round(cx - w * 0.4 + lean) + i;
      for (let y = Math.round(cy - h * 1.32); y <= Math.round(cy - h * 0.9); y++) {
        if (s.data[(y * s.w + x) * 4 + 3] <= 60) continue;
        s.px(x, y, t.cap);
        break;
      }
    }
  }
}

/** A tuft of blades, shaded as one mass rather than blade by blade. */
function paintGrass(s: IsoSurface, v: number, size: number, t: PropTones): void {
  const cx = PROP_BASE_X;
  const cy = PROP_BASE_Y;
  const h = 7 + v * 1.5 + size * 3.5;

  groundShadow(s, cx, cy + 1, 6 + size, 3 + size * 0.5, 0.32);

  // Five blades, spread and leaning deterministically per variant. Each is drawn two pixels wide
  // in the body tone; a one-pixel blade has no surface to shade.
  const blades: Array<[number, number, number]> = [
    [-6, -0.55, 0.72],
    [-2.5, -0.18, 1.0],
    [1.5, 0.24, 0.86],
    [5, 0.66, 0.62],
    [0.5, -0.86, 0.5]
  ];
  const tips: Array<[number, number]> = [];
  for (const [foot, lean, tall] of blades) {
    const height = h * tall;
    const tipX = Math.round(cx + foot + lean * height);
    const tipY = Math.round(cy - height);
    line(s, cx + foot, cy, tipX, tipY, t.leaf);
    line(s, cx + foot + 1, cy, tipX + 1, tipY, t.leaf);
    tips.push([tipX, tipY]);
  }

  // Positional shading over the whole tuft. Pixel-art vegetation is shaded as one mass: each
  // blade is far too thin to carry a lit face and a shaded one, so the light direction is
  // expressed across the clump. Shading per blade instead leaves a tuft with no readable light
  // at all, which is what a left-versus-right measurement catches immediately.
  for (let y = 0; y < PROP_SIZE; y++) {
    for (let x = 0; x < PROP_SIZE; x++) {
      if (s.data[(y * s.w + x) * 4 + 3] <= SOLID) continue;
      const dx = x - cx;
      if (dx <= -2) s.px(x, y, t.leafHi);
      else if (dx >= 2) s.px(x, y, t.leafLo);
    }
  }

  // Tips and buds last, so the shading pass does not repaint them.
  tips.forEach(([tipX, tipY], i) => {
    s.px(tipX, tipY, t.leafHi);
    s.px(tipX + 1, tipY, t.leafHi);
    if (i % 2 === 0) s.px(tipX, tipY - 1, t.bloom);
  });
}

/** A wildflower patch: a leaf rosette carrying three blossoms. */
function paintFlower(s: IsoSurface, v: number, size: number, t: PropTones): void {
  const cx = PROP_BASE_X;
  const cy = PROP_BASE_Y;
  const r = (5.5 + size * 1.6) * (1 + (v - 1.5) * 0.06);

  groundShadow(s, cx, cy + 1, r * 1.3, r * 0.66, 0.34);

  // Rosette: three flat overlapping leaf masses, read as a clump rather than a ball. The west
  // mass is the largest so the clump itself carries the light direction.
  disc(s, cx - r * 0.5, cy - 1.5, r * 0.95, r * 0.56, t, 1);
  disc(s, cx + r * 0.42, cy - 0.5, r * 0.72, r * 0.44, t, 2);
  disc(s, cx - r * 0.05, cy - 3, r * 0.8, r * 0.5, t, 3);

  // Positional shading over the rosette, drawn before the blossoms so they are not repainted.
  // A flat disc normalises its own aspect, so on a wide, shallow leaf mass the vertical term of
  // the light dot product dominates and the clump ends up lit from above with no left-right
  // direction at all - which a left-versus-right measurement reads as no light.
  for (let y = 0; y < PROP_SIZE; y++) {
    for (let x = 0; x < PROP_SIZE; x++) {
      if (s.data[(y * s.w + x) * 4 + 3] <= SOLID) continue;
      const dx = x - cx;
      if (dx <= -3) s.px(x, y, t.leafHi);
      else if (dx >= 3) s.px(x, y, t.leafLo);
    }
  }

  // Four distinct arrangements, not just four colours: two variants that differ only in hue
  // still read as the same plant, and the board scatters these by shape. Every layout is biased
  // to the west, because a symmetric arrangement of discs and blossoms measures as lit from
  // nowhere however well each disc is individually shaded.
  const layouts: Array<Array<[number, number, number]>> = [
    [
      [-0.68, -7, 2.2],
      [0.38, -4.5, 1.5],
      [-0.1, -10, 1.7]
    ],
    [
      [-0.82, -7.5, 2.3],
      [0.55, -5, 1.5],
      [-0.15, -11, 1.5]
    ],
    [
      [-0.48, -8.5, 2.2],
      [0.5, -4, 1.4],
      [-0.9, -10.5, 1.6]
    ],
    [
      [-0.12, -7.5, 2.3],
      [-0.88, -10, 1.6],
      [0.62, -9, 1.3]
    ]
  ];
  const blossoms = layouts[v];
  const scale = size * 0.9;

  blossoms.forEach(([ox, oy, br], i) => {
    const bx = Math.round(cx + ox * r);
    const by = Math.round(cy + oy - scale);
    const radius = br + size * 0.25;
    // Alternating petal colours per blossom, so a patch reads as a mixed meadow.
    const color = (i + v) % 2 === 0 ? t.bloom : t.bloomLo;
    for (let y = -Math.ceil(radius); y <= Math.ceil(radius); y++) {
      for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
        if (x * x + y * y > radius * radius + 0.6) continue;
        s.px(bx + x, by + y, x < 0 ? color : shift(color, -0.2, 0.03, 240, 10));
      }
    }
    s.px(bx, by - 1, '#ffffff');
    // Stems, so the blossoms are attached to the clump rather than floating.
    line(s, cx, cy - 3, bx, by, t.leafLo);
  });
}

/** A shrub: three overlapping leaf masses with the sun on the upper-left one. */
function paintShrub(s: IsoSurface, v: number, size: number, t: PropTones): void {
  const cx = PROP_BASE_X;
  const cy = PROP_BASE_Y;
  const w = 6.5 + v * 1.2 + size * 2.2;
  const h = 5 + v + size * 1.8;

  groundShadow(s, cx, cy + 1, w * 1.25, h * 0.62);

  disc(s, cx - w * 0.5, cy - h * 0.55, w * 0.62, h * 0.72, t, 4);
  disc(s, cx + w * 0.5, cy - h * 0.5, w * 0.58, h * 0.68, t, 5);
  disc(s, cx + w * 0.1, cy - h * 0.95, w * 0.7, h * 0.82, t, 6);

  // Berries in the biomes that have a glow, so a fairy glade shrub is not the same as a hedge.
  if (t.cap && v % 2 === 1) {
    s.px(Math.round(cx - w * 0.35), Math.round(cy - h * 0.6), t.bloom);
    s.px(Math.round(cx + w * 0.45), Math.round(cy - h * 0.75), t.bloom);
  }
}

/** A cluster of crystal shards, each with a lit facet and a white specular tip. */
function paintCrystal(s: IsoSurface, v: number, size: number, t: PropTones, pulse: number): void {
  const cx = PROP_BASE_X;
  const cy = PROP_BASE_Y;
  const glow = 0.3 + pulse * 0.14;

  groundShadow(s, cx, cy + 1, 7 + size * 1.4, 3.5 + size * 0.7, 0.4);

  // The tallest shard sits left of centre and carries the glow. With it on the right the cluster
  // reads as lit from the right however well each individual shard is faceted, because the mass
  // and the halo both end up east of the anchor.
  const shards: Array<[number, number, number]> = [
    [-6, 0, 11 + v * 0.8 + size * 4],
    [0.5, 0, 8 + v + size * 3.5],
    [6, 0, 6 + ((v + 2) % 3) + size * 2.5]
  ];
  shards.forEach(([ox, oy, ch], i) => {
    const bx = cx + ox;
    const by = cy + oy;
    for (let k = 0; k <= ch; k++) {
      const w = Math.max(0, Math.round((ch - k) * 0.24));
      for (let x = -w; x <= w; x++) s.px(bx + x, by - k, x < 0 ? t.crystal : shift(t.crystal, -0.34, 0.06, 240, 12));
    }
    // Specular tip and a bright edge down the lit side.
    s.px(bx, by - ch, '#ffffff');
    s.px(bx - 1, by - ch + 1, '#ffffff');
    if (i === 0) s.glowDisc(bx, by - ch / 2, 6 + size, ch * 0.7, t.crystalGlow, glow);
  });
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export interface PropPaintOptions {
  biome: string;
  variant?: number;
  /** Baked size bucket 0..2, from `propSizeBucket`. */
  size?: number;
  night?: boolean;
  /** Crystal shimmer phase 0..3. Ignored by the matte props. */
  pulse?: number;
}

/**
 * Paints one prop into a fresh 34x34 RGBA buffer.
 *
 * Deterministic in every argument, so the renderer's cache key and the exported review sheet
 * always agree.
 */
export function paintProp(type: PropType, options: PropPaintOptions): IsoSurface {
  const s = new IsoSurface(PROP_SIZE, PROP_SIZE);
  const t = propTones(options.biome as BiomeType, options.night === true);
  const v = Math.abs(Math.floor(options.variant ?? 0)) % PROP_VARIANTS;
  const size = Math.max(0, Math.min(PROP_SIZES - 1, Math.floor(options.size ?? 1)));
  const pulse = Math.abs(Math.floor(options.pulse ?? 0)) % 4;

  switch (type) {
    case 'grass':
      paintGrass(s, v, size, t);
      break;
    case 'flower':
      paintFlower(s, v, size, t);
      break;
    case 'shrub':
      paintShrub(s, v, size, t);
      break;
    case 'crystal':
      paintCrystal(s, v, size, t, pulse);
      break;
    default:
      paintRock(s, v, size, t);
  }
  return s;
}
