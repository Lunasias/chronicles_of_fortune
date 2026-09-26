// ===========================================================================
// ISOMETRIC TERRAIN PAINTER — 96x48 pixel-art floor tiles, 15 biomes
// ===========================================================================
//
// The board floor used to be drawn with canvas vector calls: createLinearGradient for the top
// face, beginPath/stroke for the cliffs, arc/ellipse for the surface detail. Every one of those
// antialiases, so the ground was the only part of the game with soft edges while the structures,
// trees and characters on top of it were hard-edged pixel art.
//
// This painter produces a plain RGBA buffer instead, using the same IsoSurface primitives as
// IsometricBuildingPainter, so the floor obeys the same rules as everything standing on it.
//
// Geometry. The projection is 2:1 dimetric with a 96x48 tile, so the top face is a rhombus whose
// diagonals are exactly horizontal and vertical: half-width 48, half-height 24. A 96x48 tile is
// not negotiable — it is what makes adjacent tiles tile the plane exactly — so unlike the
// structures (64x64) and trees (64x64) the floor sprite is 104x82 with the diamond centred at
// (52, 28) and two 18px cliff faces below it.
//
// Style rules:
//
//   * One light source, top-left. On a horizontal top face that means the NORTH-WEST edge is the
//     lit one and the SOUTH-EAST edge is the shaded one; the west cliff face is the mid tone and
//     the east face is the darkest, exactly as with a building's two walls.
//   * The top face stays essentially flat with lit and shaded edge bands rather than a gradient.
//     A gradient across a floor tile repeated 312 times reads as vertical banding; edge lighting
//     reads as a grid of tiles, which is what a board game floor should look like.
//   * Surface detail is clipped to the diamond, drawn at integer coordinates with a deterministic
//     hash, and kept low-contrast except where a biome is meant to glow.
//   * Glowing biomes (magma, runes, crystals, blossoms, starlight) glow harder at night, which is
//     how the board tells the player the time of day without reading the clock.

import { IsoSurface, shift } from './IsometricBuildingPainter';
import type { BiomeType } from '../game/BoardMap';

// ---------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------
export const TERRAIN_SPRITE_W = 104;
export const TERRAIN_SPRITE_H = 82;
/** Half-width of the top-face rhombus. */
export const TERRAIN_HW = 48;
/** Half-height of the top-face rhombus. */
export const TERRAIN_HH = 24;
/** Top-face centre inside the sprite; the renderer blits at (x - 52, y - 28). */
export const TERRAIN_CX = 52;
export const TERRAIN_CY = 28;
/** Depth of the exposed cliff faces below the top face. */
export const TERRAIN_CLIFF_H = 18;

/** The renderer blits the sprite at this offset from the tile's world position. */
export const TERRAIN_BLIT_X = TERRAIN_CX;
export const TERRAIN_BLIT_Y = TERRAIN_CY;

// ---------------------------------------------------------------------------
// deterministic noise
// ---------------------------------------------------------------------------
/** An integer hash in [0, 1): the floor must be identical every frame and every export. */
function noise2(x: number, y: number, seed: number): number {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// ---------------------------------------------------------------------------
// palettes
// ---------------------------------------------------------------------------
/**
 * The authored colour identity of a biome.
 *
 * These are the project's own palettes, not new ones: the ground is what players navigate by, so
 * its hues are kept. What changes is how they are used - each one is expanded into a proper ramp
 * and painted as pixels instead of gradients.
 */
interface BiomePalette {
  /** Top face base. */
  top: string;
  /** Detail ink, also the crest lip. */
  accent: string;
  /** West cliff face: the lit one. */
  cliffLeft: string;
  /** East cliff face: the shaded one. */
  cliffRight: string;
  /** Grid contour along the front edges. */
  border: string;
  /** Emissive colour for magma, runes, crystal, blossom and starlight. Matte biomes omit it. */
  glow?: string;
}

const DAY: Record<BiomeType, BiomePalette> = {
  grass: { top: '#276239', accent: '#39834e', cliffLeft: '#382012', cliffRight: '#4d2d19', border: '#1b4327' },
  forest: {
    top: '#174728',
    accent: '#226038',
    cliffLeft: '#2a1a10',
    cliffRight: '#3b2516',
    border: '#11331c',
    glow: '#6ee7b7'
  },
  snow: {
    top: '#e2e8f0',
    accent: '#f8fafc',
    cliffLeft: '#475569',
    cliffRight: '#64748b',
    border: '#cbd5e1',
    glow: '#ffffff'
  },
  desert: { top: '#d97706', accent: '#f59e0b', cliffLeft: '#652b09', cliffRight: '#883b0c', border: '#b45309' },
  volcano: {
    top: '#27272a',
    accent: '#ea580c',
    cliffLeft: '#09090b',
    cliffRight: '#18181b',
    border: '#450a0a',
    glow: '#f97316'
  },
  cavern: {
    top: '#334155',
    accent: '#475569',
    cliffLeft: '#090d16',
    cliffRight: '#1e293b',
    border: '#1e293b',
    glow: '#38bdf8'
  },
  coral: {
    top: '#0891b2',
    accent: '#22d3ee',
    cliffLeft: '#042f2e',
    cliffRight: '#0d9488',
    border: '#0891b2',
    glow: '#22d3ee'
  },
  celestial: {
    top: '#fef08a',
    accent: '#ffffff',
    cliffLeft: '#cbd5e1',
    cliffRight: '#e2e8f0',
    border: '#f59e0b',
    glow: '#fef08a'
  },
  fairy_grove: {
    top: '#ec4899',
    accent: '#f472b6',
    cliffLeft: '#831843',
    cliffRight: '#9d174d',
    border: '#db2777',
    glow: '#f472b6'
  },
  crystal_cavern: {
    top: '#0284c7',
    accent: '#38bdf8',
    cliffLeft: '#0369a1',
    cliffRight: '#075985',
    border: '#0ea5e9',
    glow: '#38bdf8'
  },
  castle: { top: '#475569', accent: '#64748b', cliffLeft: '#1e293b', cliffRight: '#334155', border: '#334155' },
  steampunk: {
    top: '#78350f',
    accent: '#fbbf24',
    cliffLeft: '#451a03',
    cliffRight: '#5b2204',
    border: '#d97706',
    glow: '#fbbf24'
  },
  waterfall_forest: {
    top: '#047857',
    accent: '#10b981',
    cliffLeft: '#065f46',
    cliffRight: '#047857',
    border: '#34d399',
    glow: '#67e8f9'
  },
  sakura_shrine: {
    top: '#831843',
    accent: '#fbcfe8',
    cliffLeft: '#500724',
    cliffRight: '#700c35',
    border: '#f43f5e',
    glow: '#fbcfe8'
  },
  abyss: {
    top: '#250e4f',
    accent: '#a855f7',
    cliffLeft: '#090214',
    cliffRight: '#180527',
    border: '#4c1d95',
    glow: '#a855f7'
  }
};

const NIGHT: Record<BiomeType, BiomePalette> = {
  grass: { top: '#0e2917', accent: '#164324', cliffLeft: '#141210', cliffRight: '#1d1917', border: '#0a1d10' },
  forest: {
    top: '#081f12',
    accent: '#10301c',
    cliffLeft: '#0f141f',
    cliffRight: '#17202e',
    border: '#06160d',
    glow: '#6ee7b7'
  },
  snow: {
    top: '#1e293b',
    accent: '#38bdf8',
    cliffLeft: '#090d16',
    cliffRight: '#0f172a',
    border: '#38bdf8',
    glow: '#7dd3fc'
  },
  desert: { top: '#3f2512', accent: '#78350f', cliffLeft: '#261205', cliffRight: '#451a03', border: '#78350f' },
  volcano: {
    top: '#18181b',
    accent: '#ea580c',
    cliffLeft: '#09090b',
    cliffRight: '#18181b',
    border: '#450a0a',
    glow: '#f97316'
  },
  cavern: {
    top: '#0f172a',
    accent: '#38bdf8',
    cliffLeft: '#090d16',
    cliffRight: '#1e293b',
    border: '#1e293b',
    glow: '#38bdf8'
  },
  coral: {
    top: '#083344',
    accent: '#0e7490',
    cliffLeft: '#042f2e',
    cliffRight: '#0d9488',
    border: '#0891b2',
    glow: '#22d3ee'
  },
  celestial: {
    top: '#1e1b4b',
    accent: '#818cf8',
    cliffLeft: '#0f172a',
    cliffRight: '#1e293b',
    border: '#4338ca',
    glow: '#a5b4fc'
  },
  fairy_grove: {
    top: '#2e1065',
    accent: '#d946ef',
    cliffLeft: '#1e1b4b',
    cliffRight: '#312e81',
    border: '#a21caf',
    glow: '#e879f9'
  },
  crystal_cavern: {
    top: '#083344',
    accent: '#06b6d4',
    cliffLeft: '#082f49',
    cliffRight: '#0c4a6e',
    border: '#0284c7',
    glow: '#22d3ee'
  },
  castle: { top: '#1e293b', accent: '#334155', cliffLeft: '#0f172a', cliffRight: '#1e293b', border: '#0f172a' },
  steampunk: {
    top: '#29180b',
    accent: '#d97706',
    cliffLeft: '#170c05',
    cliffRight: '#261205',
    border: '#b45309',
    glow: '#fbbf24'
  },
  waterfall_forest: {
    top: '#064e3b',
    accent: '#34d399',
    cliffLeft: '#022c22',
    cliffRight: '#064e3b',
    border: '#059669',
    glow: '#67e8f9'
  },
  sakura_shrine: {
    top: '#2e1026',
    accent: '#f472b6',
    cliffLeft: '#1a0815',
    cliffRight: '#240a1d',
    border: '#db2777',
    glow: '#f9a8d4'
  },
  abyss: {
    top: '#150624',
    accent: '#a855f7',
    cliffLeft: '#090214',
    cliffRight: '#180527',
    border: '#4c1d95',
    glow: '#c084fc'
  }
};

/** The single source of truth for the day/night palette of a biome. */
export function terrainPalette(biome: BiomeType, night: boolean): BiomePalette {
  return (night ? NIGHT : DAY)[biome] ?? DAY.grass;
}

// ---------------------------------------------------------------------------
// ramps
// ---------------------------------------------------------------------------
interface TerrainTones {
  /** Bright lip along the north-west top edge. */
  hi: string;
  /** The top face body. */
  top: string;
  /** Shaded band along the south-east top edge. */
  lo: string;
  /** Dither speckle, one step above the body. */
  fleck: string;
  /** West cliff face, banded into light / mid / dark. */
  cliffLight: string;
  cliffMid: string;
  cliffDark: string;
  /** Ambient occlusion at the foot of the cliffs. */
  cliffFoot: string;
  accent: string;
  accentLo: string;
  border: string;
  glow: string | null;
}

/** Relative luminance of a hex colour, used to order authored colour pairs. */
function luma(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

/**
 * Expands an authored palette into a painted ramp.
 *
 * The authored `cliffLeft` / `cliffRight` pair cannot be used as light and shade directly: for
 * snow, coral, cavern, castle and celestial the palette gives the RIGHT face the lighter colour,
 * so painting them literally would light those biomes from the wrong side. The pair is instead
 * read as the biome's rock colour family - the darker member is the body - and the two faces are
 * derived from it so the west face is always the lit one. The biome's hue is preserved because
 * every tone is a shift of an authored colour rather than a new one.
 *
 * Lightness moves multiplicatively and shadows rotate toward blue, the same rule the structures
 * use, so a near-white marble cliff and a near-black obsidian one both separate into readable
 * steps instead of one clipping to white and the other to black.
 */
function tonesFor(p: BiomePalette): TerrainTones {
  const rock = luma(p.cliffLeft) <= luma(p.cliffRight) ? p.cliffLeft : p.cliffRight;
  return {
    hi: shift(p.top, 0.24, -0.02, 60, 8),
    top: p.top,
    lo: shift(p.top, -0.28, 0.05, 240, 12),
    fleck: shift(p.top, 0.12, -0.01, 40, 6),
    cliffLight: shift(rock, 0.5, -0.05, 40, 8),
    cliffMid: shift(rock, 0.28, -0.03, 45, 8),
    cliffDark: shift(rock, -0.2, 0.06, 240, 12),
    cliffFoot: shift(rock, -0.52, 0.08, 240, 16),
    accent: p.accent,
    accentLo: shift(p.accent, -0.34, 0.06, 240, 12),
    border: p.border,
    glow: p.glow ?? null
  };
}

// ---------------------------------------------------------------------------
// painting helpers
// ---------------------------------------------------------------------------
/** A one-pixel staircase line: the pixel-art primitive for a sloped edge. */
function isoLine(s: IsoSurface, x0: number, y0: number, x1: number, y1: number, color: string, alpha = 1): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    s.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color, alpha);
  }
}

/** Whether a point lies inside the top-face rhombus. Surface detail must never spill off it. */
function onTile(x: number, y: number): boolean {
  return Math.abs(x - TERRAIN_CX) / TERRAIN_HW + Math.abs(y - TERRAIN_CY) / TERRAIN_HH <= 1;
}

/** Paints only if the point is on the top face. */
function tpx(s: IsoSurface, x: number, y: number, color: string, alpha = 1): void {
  if (onTile(x, y)) s.px(x, y, color, alpha);
}

/**
 * The four top-face edges as functions of x, so bands and detail can follow the tile's slope
 * instead of being laid out in screen axes.
 */
const edgeNW = (x: number) => TERRAIN_CY - (x - (TERRAIN_CX - TERRAIN_HW)) / 2;
const edgeNE = (x: number) => TERRAIN_CY - TERRAIN_HH + (x - TERRAIN_CX) / 2;
const edgeSE = (x: number) => TERRAIN_CY + (TERRAIN_CX + TERRAIN_HW - x) / 2;
const edgeSW = (x: number) => TERRAIN_CY + TERRAIN_HH - (TERRAIN_CX - x) / 2;

// ---------------------------------------------------------------------------
// passes
// ---------------------------------------------------------------------------
/**
 * The two exposed cliff faces, drawn before the top face so the crest overlaps them cleanly.
 *
 * Each face is banded into strata that follow the crest slope. Banding is what makes a cliff read
 * as rock rather than as a flat extruded wall, and following the slope rather than using screen-
 * horizontal bands is what makes it read as isometric rock.
 */
function drawCliffs(s: IsoSurface, t: TerrainTones, seed: number): void {
  const { CX, CY, HW, HH, CH } = {
    CX: TERRAIN_CX,
    CY: TERRAIN_CY,
    HW: TERRAIN_HW,
    HH: TERRAIN_HH,
    CH: TERRAIN_CLIFF_H
  };
  const W: [number, number] = [CX - HW, CY];
  const S: [number, number] = [CX, CY + HH];
  const E: [number, number] = [CX + HW, CY];

  const west: Array<[number, number]> = [W, S, [S[0], S[1] + CH], [W[0], W[1] + CH]];
  const east: Array<[number, number]> = [S, E, [E[0], E[1] + CH], [S[0], S[1] + CH]];

  s.poly(west, t.cliffMid);
  s.poly(east, t.cliffDark);

  // Strata: three bands per face. The boundary follows the crest, so the seam is an iso line.
  const bands: Array<[number, string, number]> = [
    [CH * 0.3, t.cliffLight, 0.9],
    [CH * 0.62, t.cliffDark, 0.85],
    [CH * 0.86, t.cliffFoot, 0.9]
  ];
  for (const [drop, color, alpha] of bands) {
    isoLine(s, W[0], W[1] + drop, S[0], S[1] + drop, color, alpha);
    isoLine(s, S[0], S[1] + drop, E[0], E[1] + drop, color, alpha);
  }

  // A lit lip where the crest meets the face: the accent of the biome, which is also what makes
  // a raised tile readable as raised at a glance.
  for (let x = CX - HW; x <= CX; x++) s.px(x, edgeSW(x) + 1, t.accent, 0.85);
  for (let x = CX; x <= CX + HW; x++) s.px(x, edgeSE(x) + 1, t.accentLo, 0.7);

  // Vertical weathering cracks, kept short and sparse so the face does not turn into corduroy.
  for (let x = CX - HW + 4; x <= CX + HW - 4; x += 7) {
    if (noise2(x, 3, seed) > 0.55) continue;
    const face = x <= CX ? [W, S] : [S, E];
    const t0 = (x - face[0][0]) / (face[1][0] - face[0][0] || 1);
    const top = Math.round(face[0][1] + (face[1][1] - face[0][1]) * t0);
    const len = 5 + Math.round(noise2(x, 11, seed) * 7);
    for (let i = 0; i < len; i++) s.px(x, top + 2 + i, t.cliffFoot, 0.55);
  }

  // Ambient occlusion at the foot, so the cliff sits on the ground instead of ending abruptly.
  isoLine(s, W[0], W[1] + CH + 1, S[0], S[1] + CH + 1, t.cliffFoot, 0.75);
  isoLine(s, S[0], S[1] + CH + 1, E[0], E[1] + CH + 1, t.cliffFoot, 0.75);
  isoLine(s, W[0] + 1, W[1] + CH, S[0], S[1] + CH + 2, t.cliffFoot, 0.3);
  isoLine(s, E[0] - 1, E[1] + CH, S[0], S[1] + CH + 2, t.cliffFoot, 0.42);
}

/**
 * A 4x4 Bayer matrix: the ordered dither used to shade a large flat surface.
 *
 * A gradient across a floor tile repeated 312 times reads as vertical banding, and a flat fill
 * reads as a colour swatch. An ordered dither ramp between them is the pixel-art answer, and it
 * is what gives the whole top face a left-bright / right-dark read instead of leaving the light
 * direction visible only in the two bevels.
 */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * The top face: flat body, bevels on all four edges, ordered-dither shading, sparse fleck.
 *
 * A horizontal face has no wall normal, so its light direction has to come from bevels. The two
 * WEST edges (north-west and south-west) face the light and take `hi`; the two EAST edges take
 * `lo`. Bevelling only the top two edges instead would light the tile from the north vertex,
 * which reads as top-down light and contradicts every wall and roof standing on it.
 */
function drawTopFace(s: IsoSurface, t: TerrainTones, seed: number): void {
  const { CX, CY, HW, HH } = { CX: TERRAIN_CX, CY: TERRAIN_CY, HW: TERRAIN_HW, HH: TERRAIN_HH };
  s.diamond(CX, CY, HW, HH, t.top);

  // Ordered-dither ramp: `hi` thins out from the west edge, `lo` thickens toward the east one.
  for (let y = CY - HH; y <= CY + HH; y++) {
    for (let x = CX - HW; x <= CX + HW; x++) {
      if (!onTile(x, y)) continue;
      const u = (x - (CX - HW)) / (2 * HW);
      const threshold = BAYER4[(y & 3) * 4 + (x & 3)] / 16;
      const lit = Math.max(0, 0.58 - u * 1.25);
      const shade = Math.max(0, u * 1.25 - 0.72);
      if (threshold < lit) s.px(x, y, t.hi);
      else if (threshold < shade) s.px(x, y, t.lo);
      else if (noise2(x, y, seed) > 0.975) s.px(x, y, t.fleck, 0.7);
    }
  }

  // Bevels last, so they sit cleanly on top of the dither.
  for (let x = CX - HW; x <= CX + HW; x++) {
    const west = x <= CX;
    const upper = west ? edgeNW(x) : edgeNE(x);
    const lower = west ? edgeSW(x) : edgeSE(x);
    const near = west ? t.hi : t.lo;
    for (const [edge, inward] of [
      [upper, 1],
      [lower, -1]
    ] as Array<[number, number]>) {
      s.px(x, edge, near);
      s.px(x, edge + inward, near);
      // The third pixel is dithered, so the band ends as a pixel-art transition rather than a
      // razor line.
      s.px(x, edge + inward * 2, noise2(x, inward + 4, seed) > 0.4 ? near : t.top);
    }
  }
}

/** The front edges: a grid contour, so 312 tiles still read as a board rather than a smear. */
function drawContour(s: IsoSurface, t: TerrainTones): void {
  const { CX, CY, HW, HH } = { CX: TERRAIN_CX, CY: TERRAIN_CY, HW: TERRAIN_HW, HH: TERRAIN_HH };
  for (let x = CX - HW; x <= CX + HW; x++) {
    const edge = x <= CX ? edgeSW(x) : edgeSE(x);
    s.px(x, edge, t.border, 0.55);
  }
}

// ---------------------------------------------------------------------------
// biome surface detail
// ---------------------------------------------------------------------------
/**
 * Scatters an organic cluster: a small blob of `body` pixels with a lit top-left pixel.
 *
 * Every biome's detail is built from this so the surface reads as ground texture rather than as
 * stickers placed on the tile, and so the light direction is consistent inside the detail too.
 */
function cluster(
  s: IsoSurface,
  cx: number,
  cy: number,
  w: number,
  h: number,
  body: string,
  lit: string,
  seed: number,
  skip = 0.3
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (noise2(cx + x, cy + y, seed) < skip) continue;
      const px = cx + x - Math.floor(w / 2);
      const py = cy + y - Math.floor(h / 2);
      tpx(s, px, py, y === 0 && x < Math.ceil(w / 2) ? lit : body);
    }
  }
}

/** A 4-point star: the pixel-art idiom for a sparkle, and legible at board zoom. */
function sparkle(s: IsoSurface, x: number, y: number, color: string, core = '#ffffff'): void {
  tpx(s, x, y, core);
  tpx(s, x - 1, y, color);
  tpx(s, x + 1, y, color);
  tpx(s, x, y - 1, color);
  tpx(s, x, y + 1, color);
}

/** A two-pixel-wide ripple arc that follows the iso slope of the tile. */
function ripple(s: IsoSurface, x0: number, y0: number, len: number, color: string, dir = 1): void {
  for (let i = 0; i < len; i++) {
    const x = x0 + i;
    const y = y0 + Math.round((dir * i) / 2);
    tpx(s, x, y, color, 0.85);
    if (i % 3 === 0) tpx(s, x, y + 1, color, 0.5);
  }
}

function drawSurface(s: IsoSurface, biome: BiomeType, t: TerrainTones, night: boolean, seed: number): void {
  const glowStrength = night ? 0.72 : 0.42;

  switch (biome) {
    case 'grass':
    case 'forest': {
      // Grass tufts: three blades leaning into the light, over dark soil pebbles.
      for (const [ox, oy] of [
        [-18, -6],
        [10, 4],
        [-4, 8],
        [20, -8],
        [-26, 2]
      ]) {
        const x = TERRAIN_CX + ox;
        const y = TERRAIN_CY + oy;
        tpx(s, x, y, t.accent);
        tpx(s, x - 1, y - 1, t.accent);
        tpx(s, x + 1, y - 2, t.accent);
        tpx(s, x, y - 2, t.accentLo);
      }
      cluster(s, TERRAIN_CX - 12, TERRAIN_CY + 5, 3, 2, t.accentLo, t.cliffFoot, seed + 1, 0.2);
      cluster(s, TERRAIN_CX + 16, TERRAIN_CY + 7, 4, 2, t.accentLo, t.cliffFoot, seed + 2, 0.2);
      if (biome === 'forest' && t.glow) {
        // A pair of glowing spores, which is what distinguishes the Gloomwood from the meadow.
        s.glowDisc(TERRAIN_CX - 22, TERRAIN_CY + 6, 3, 3, t.glow, glowStrength * 0.5);
        tpx(s, TERRAIN_CX - 22, TERRAIN_CY + 6, t.glow);
        tpx(s, TERRAIN_CX + 24, TERRAIN_CY - 4, t.glow);
      }
      break;
    }

    case 'snow': {
      // Drift ripples follow the slope; sparkles are pure white so they survive the night palette.
      ripple(s, TERRAIN_CX - 30, TERRAIN_CY - 8, 18, t.accent, 1);
      ripple(s, TERRAIN_CX + 2, TERRAIN_CY + 10, 20, t.accent, -1);
      ripple(s, TERRAIN_CX - 10, TERRAIN_CY + 14, 12, t.accentLo, 1);
      cluster(s, TERRAIN_CX - 20, TERRAIN_CY + 12, 5, 2, t.accentLo, t.accent, seed + 3, 0.25);
      if (t.glow) {
        sparkle(s, TERRAIN_CX + 16, TERRAIN_CY - 6, t.glow);
        sparkle(s, TERRAIN_CX - 6, TERRAIN_CY + 2, t.glow);
      }
      break;
    }

    case 'desert': {
      // Long wind ripples, all leaning the same way: dunes are directional.
      for (const [ox, oy, len] of [
        [-34, -6, 22],
        [-18, 2, 26],
        [-2, 10, 20],
        [12, -10, 18],
        [22, -2, 14]
      ]) {
        ripple(s, TERRAIN_CX + ox, TERRAIN_CY + oy, len, t.accent, 1);
      }
      cluster(s, TERRAIN_CX + 4, TERRAIN_CY + 4, 2, 2, t.accentLo, t.cliffFoot, seed + 4, 0.15);
      break;
    }

    case 'volcano': {
      // Basalt plates, then a magma fissure. The fissure is the only bright thing on the tile, so
      // it reads instantly as a hazard.
      cluster(s, TERRAIN_CX - 24, TERRAIN_CY + 4, 5, 3, t.cliffDark, t.cliffMid, seed + 5, 0.25);
      cluster(s, TERRAIN_CX + 18, TERRAIN_CY - 6, 6, 3, t.cliffDark, t.cliffMid, seed + 6, 0.25);
      isoLine(s, TERRAIN_CX - 20, TERRAIN_CY - 6, TERRAIN_CX - 4, TERRAIN_CY + 2, t.cliffFoot);
      isoLine(s, TERRAIN_CX - 4, TERRAIN_CY + 2, TERRAIN_CX + 14, TERRAIN_CY - 4, t.cliffFoot);
      if (t.glow) {
        for (let i = 0; i <= 34; i++) {
          const t0 = i / 34;
          const x = TERRAIN_CX - 20 + t0 * 34;
          const y = t0 < 0.41 ? TERRAIN_CY - 6 + (t0 / 0.41) * 8 : TERRAIN_CY + 2 - ((t0 - 0.41) / 0.59) * 6;
          s.glowDisc(x, y, 3, 2.5, t.glow, glowStrength * 0.5);
          tpx(s, x, y, i % 8 === 0 ? '#fef08a' : t.glow);
        }
      }
      break;
    }

    case 'cavern': {
      // Angular slate facets: two per tile, each a hard-edged polygon rather than a blob.
      s.poly(
        [
          [TERRAIN_CX - 20, TERRAIN_CY + 2],
          [TERRAIN_CX - 12, TERRAIN_CY - 2],
          [TERRAIN_CX - 8, TERRAIN_CY + 3],
          [TERRAIN_CX - 17, TERRAIN_CY + 6]
        ],
        t.cliffDark
      );
      s.poly(
        [
          [TERRAIN_CX + 8, TERRAIN_CY - 2],
          [TERRAIN_CX + 18, TERRAIN_CY - 6],
          [TERRAIN_CX + 22, TERRAIN_CY],
          [TERRAIN_CX + 12, TERRAIN_CY + 3]
        ],
        t.cliffMid
      );
      if (t.glow) {
        sparkle(s, TERRAIN_CX - 14, TERRAIN_CY + 1, t.glow);
        tpx(s, TERRAIN_CX + 20, TERRAIN_CY - 3, t.glow);
      }
      break;
    }

    case 'coral': {
      // Shallow water: ripple arcs plus a couple of coral nubs breaking the surface.
      for (const [ox, oy, dir] of [
        [-26, -2, 1],
        [-6, 8, -1],
        [14, -6, 1]
      ]) {
        ripple(s, TERRAIN_CX + ox, TERRAIN_CY + oy, 16, t.accent, dir);
      }
      cluster(s, TERRAIN_CX - 10, TERRAIN_CY - 6, 3, 3, t.accentLo, t.accent, seed + 7, 0.2);
      cluster(s, TERRAIN_CX + 16, TERRAIN_CY + 6, 3, 4, t.accentLo, t.accent, seed + 8, 0.2);
      if (t.glow) sparkle(s, TERRAIN_CX + 4, TERRAIN_CY - 2, t.glow);
      break;
    }

    case 'celestial': {
      // A holy sigil in the middle, with starlight around it.
      s.poly(
        [
          [TERRAIN_CX, TERRAIN_CY - 9],
          [TERRAIN_CX + 7, TERRAIN_CY],
          [TERRAIN_CX, TERRAIN_CY + 9],
          [TERRAIN_CX - 7, TERRAIN_CY]
        ],
        t.accentLo,
        0.9
      );
      s.poly(
        [
          [TERRAIN_CX, TERRAIN_CY - 5],
          [TERRAIN_CX + 4, TERRAIN_CY],
          [TERRAIN_CX, TERRAIN_CY + 5],
          [TERRAIN_CX - 4, TERRAIN_CY]
        ],
        t.hi
      );
      for (const [ox, oy] of [
        [-26, -4],
        [24, 4],
        [-12, 10],
        [16, -8],
        [-4, -12]
      ]) {
        sparkle(s, TERRAIN_CX + ox, TERRAIN_CY + oy, t.accent);
      }
      break;
    }

    case 'fairy_grove': {
      // Blossom clusters and glowing spores. Round and soft, unlike the angular biomes.
      for (const [ox, oy] of [
        [-22, 2],
        [10, 6],
        [22, -6],
        [-6, -8]
      ]) {
        cluster(s, TERRAIN_CX + ox, TERRAIN_CY + oy, 4, 3, t.accent, t.hi, seed + ox, 0.28);
      }
      if (t.glow) {
        for (const [ox, oy] of [
          [-16, 8],
          [4, -4],
          [26, 2]
        ]) {
          s.glowDisc(TERRAIN_CX + ox, TERRAIN_CY + oy, 4, 3.5, t.glow, glowStrength * 0.55);
          tpx(s, TERRAIN_CX + ox, TERRAIN_CY + oy, '#ffffff');
        }
      }
      break;
    }

    case 'crystal_cavern': {
      // Three faceted shards with white specular tips: the tip is what makes them read as crystal.
      for (const [ox, oy, h] of [
        [-18, 6, 10],
        [2, -4, 14],
        [20, 6, 8]
      ]) {
        const x = TERRAIN_CX + ox;
        const y = TERRAIN_CY + oy;
        for (let i = 0; i <= h; i++) {
          const w = Math.max(0, Math.round((h - i) * 0.28));
          for (let dx = -w; dx <= w; dx++) tpx(s, x + dx, y - i, dx < 0 ? t.accent : t.accentLo);
        }
        tpx(s, x, y - h, '#ffffff');
        if (t.glow) s.glowDisc(x, y - h / 2, 5, 8, t.glow, glowStrength * 0.35);
      }
      break;
    }

    case 'castle': {
      // Flagstones: two seams each way, following the iso axes so the paving is square in world
      // space rather than on screen.
      for (const step of [-8, 10]) {
        for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW; x++) {
          tpx(s, x, edgeNW(x) + 14 + step, t.cliffFoot, 0.5);
        }
      }
      for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW; x += 16) {
        for (let y = TERRAIN_CY - TERRAIN_HH; y <= TERRAIN_CY + TERRAIN_HH; y++) {
          if (!onTile(x, y)) continue;
          s.px(x, y, t.cliffFoot, 0.4);
        }
      }
      cluster(s, TERRAIN_CX - 6, TERRAIN_CY + 8, 4, 2, t.cliffMid, t.accent, seed + 9, 0.3);
      break;
    }

    case 'steampunk': {
      // Riveted brass plates: a plate with a darker inset and a rivet at each corner.
      for (const [ox, oy] of [
        [-20, 2],
        [12, -2]
      ]) {
        const x = TERRAIN_CX + ox;
        const y = TERRAIN_CY + oy;
        s.poly(
          [
            [x - 8, y],
            [x, y - 4],
            [x + 8, y],
            [x, y + 4]
          ],
          t.accentLo,
          0.85
        );
        s.poly(
          [
            [x - 5, y],
            [x, y - 2.5],
            [x + 5, y],
            [x, y + 2.5]
          ],
          t.cliffDark,
          0.5
        );
        tpx(s, x - 6, y, t.accent);
        tpx(s, x + 6, y, t.accent);
        tpx(s, x, y - 3, t.accent);
        tpx(s, x, y + 3, t.cliffFoot);
      }
      if (t.glow) s.glowDisc(TERRAIN_CX - 20, TERRAIN_CY + 2, 6, 4, t.glow, glowStrength * 0.25);
      break;
    }

    case 'waterfall_forest': {
      // A stream crossing the tile, with riffles and dew.
      for (let x = TERRAIN_CX - TERRAIN_HW; x <= TERRAIN_CX + TERRAIN_HW; x++) {
        const y = edgeNW(x) + 22;
        if (!onTile(x, y)) continue;
        s.px(x, y, t.accent, 0.55);
        s.px(x, y + 1, t.accentLo, 0.4);
      }
      ripple(s, TERRAIN_CX - 24, TERRAIN_CY - 2, 16, t.glow ?? t.accent, 1);
      ripple(s, TERRAIN_CX + 4, TERRAIN_CY + 6, 14, t.hi, -1);
      cluster(s, TERRAIN_CX - 30, TERRAIN_CY + 8, 3, 2, t.accentLo, t.accent, seed + 10, 0.2);
      sparkle(s, TERRAIN_CX + 2, TERRAIN_CY - 8, t.hi);
      break;
    }

    case 'sakura_shrine': {
      // A vermilion earth tile strewn with blossom. Petals are three pixels: two body, one lit.
      for (const [ox, oy] of [
        [-22, -2],
        [-10, 8],
        [6, -6],
        [18, 4],
        [26, -8],
        [-2, 2]
      ]) {
        const x = TERRAIN_CX + ox;
        const y = TERRAIN_CY + oy;
        tpx(s, x, y, t.accent);
        tpx(s, x + 1, y, t.accentLo);
        tpx(s, x, y - 1, t.glow ?? t.hi);
      }
      ripple(s, TERRAIN_CX - 20, TERRAIN_CY + 12, 18, t.cliffMid, 1);
      break;
    }

    case 'abyss':
    default: {
      // Arcane rune veins through obsidian. The sigil is what makes the Void tile unmistakable.
      isoLine(s, TERRAIN_CX - 26, TERRAIN_CY + 4, TERRAIN_CX - 8, TERRAIN_CY - 4, t.cliffMid);
      isoLine(s, TERRAIN_CX - 8, TERRAIN_CY - 4, TERRAIN_CX + 10, TERRAIN_CY + 5, t.cliffMid);
      isoLine(s, TERRAIN_CX + 10, TERRAIN_CY + 5, TERRAIN_CX + 26, TERRAIN_CY - 3, t.cliffDark);
      s.poly(
        [
          [TERRAIN_CX, TERRAIN_CY - 7],
          [TERRAIN_CX + 6, TERRAIN_CY],
          [TERRAIN_CX, TERRAIN_CY + 7],
          [TERRAIN_CX - 6, TERRAIN_CY]
        ],
        t.glow ?? t.accent,
        0.55
      );
      tpx(s, TERRAIN_CX, TERRAIN_CY, '#f3e8ff');
      for (const [ox, oy] of [
        [-16, -6],
        [18, 6],
        [-4, 10]
      ]) {
        s.glowDisc(TERRAIN_CX + ox, TERRAIN_CY + oy, 4, 3, t.glow ?? t.accent, glowStrength * 0.5);
        tpx(s, TERRAIN_CX + ox, TERRAIN_CY + oy, t.glow ?? t.accent);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export interface TerrainPaintOptions {
  /** Draw the two exposed cliff faces. False for a tile hemmed in by neighbours. */
  cliffs?: boolean;
  night?: boolean;
}

/** Every biome the painter understands, in board order. */
export const TERRAIN_BIOMES: BiomeType[] = [
  'grass',
  'forest',
  'waterfall_forest',
  'snow',
  'desert',
  'volcano',
  'cavern',
  'coral',
  'abyss',
  'castle',
  'fairy_grove',
  'crystal_cavern',
  'celestial',
  'steampunk',
  'sakura_shrine'
];

/** Maps any biome name onto a painted palette, defaulting to the grasslands. */
export function resolveBiome(biome: string): BiomeType {
  return (TERRAIN_BIOMES as string[]).includes(biome) ? (biome as BiomeType) : 'grass';
}

/**
 * Paints one floor tile into a fresh 104x82 RGBA buffer.
 *
 * `seed` varies the weathering and the surface scatter; the renderer always passes 0 so a tile
 * looks the same wherever it appears, and the exporter passes 0 too so the PNG matches.
 */
export function paintTerrainTile(biome: string, options: TerrainPaintOptions = {}, seed = 0): IsoSurface {
  const kind = resolveBiome(biome);
  const night = options.night === true;
  const t = tonesFor(terrainPalette(kind, night));
  const s = new IsoSurface(TERRAIN_SPRITE_W, TERRAIN_SPRITE_H);

  if (options.cliffs) drawCliffs(s, t, seed);
  drawTopFace(s, t, seed);
  drawSurface(s, kind, t, night, seed);
  drawContour(s, t);
  return s;
}
