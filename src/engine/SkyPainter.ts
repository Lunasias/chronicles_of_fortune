// ===========================================================================
// SKY PAINTER — banded skies, pixel clouds and celestial bodies
// ===========================================================================
//
// The world background was drawn entirely with canvas gradients and arcs: a
// createLinearGradient sky, createRadialGradient suns and moons, two mist gradients, a
// shadowBlur rim light on the mountain ridges, ctx.ellipse triples for every cloud and ctx.arc
// for every star and mote. Smooth gradients and blur halos are the two things that most reliably
// break a pixel-art look, and the sky is the largest surface on screen.
//
// This painter builds the sky, the clouds and the celestial bodies as plain RGBA buffers, so the
// background is hard-edged like everything in front of it.
//
//   * The sky is a set of DISCRETE BANDS, not a gradient. That is the period-correct way to
//     paint a sky in pixel art: a banded ramp reads as deliberate, a smooth ramp reads as a
//     modern gradient. Band edges are joined with a 4x4 ordered dither so the ramp still looks
//     continuous without any interpolation.
//   * The sky buffer is 64 pixels wide and tiles horizontally. A 4x4 Bayer dither has a period
//     of 4, so a 64-wide tile is seamless, and the bands are per-row so vertical stretching is
//     exact. That keeps a full-height sky at a few hundred kilobytes instead of a screen-sized
//     buffer per time of day.
//   * Clouds are quantised puff clusters with a lit top and a shaded flat base, drawn at a fixed
//     native size and blitted 1:1. A cloud is never resampled.
//   * Celestial halos are dithered discs, not radial gradients.

import { IsoSurface, shift } from './IsometricBuildingPainter';

/** Width of the horizontally-tiling sky buffer. Must be a multiple of 4 for the Bayer dither. */
export const SKY_TILE_W = 64;

/** The four times of day, in the order the game cycles them. */
export const SKY_TIMES = ['DAWN', 'DAY', 'DUSK', 'NIGHT'] as const;
export type SkyTime = (typeof SKY_TIMES)[number];

// ---------------------------------------------------------------------------
// sky
// ---------------------------------------------------------------------------
/** The authored sky ramp per time of day, zenith first. Kept from the gradient the game used. */
const SKY_STOPS: Record<SkyTime, Array<[number, string]>> = {
  DAWN: [
    [0.0, '#1e1b4b'],
    [0.28, '#4338ca'],
    [0.55, '#818cf8'],
    [0.76, '#f472b6'],
    [0.92, '#fb923c'],
    [1.0, '#fef08a']
  ],
  DAY: [
    [0.0, '#0284c7'],
    [0.28, '#0ea5e9'],
    [0.6, '#38bdf8'],
    [0.85, '#7dd3fc'],
    [1.0, '#bae6fd']
  ],
  DUSK: [
    [0.0, '#0f172a'],
    [0.25, '#312e81'],
    [0.52, '#6b21a8'],
    [0.74, '#c026d3'],
    [0.88, '#ea580c'],
    [1.0, '#fde047']
  ],
  NIGHT: [
    [0.0, '#030712'],
    [0.24, '#09152e'],
    [0.55, '#0f274a'],
    [0.82, '#173b6a'],
    [1.0, '#1e4b85']
  ]
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** Linear RGB interpolation between the authored stops, at position t in [0, 1]. */
function sampleSky(stops: Array<[number, string]>, t: number): [number, number, number] {
  if (t <= stops[0][0]) return hexToRgb(stops[0][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t > p1) continue;
    const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
    const a = hexToRgb(c0);
    const b = hexToRgb(c1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  return hexToRgb(stops[stops.length - 1][1]);
}

/** How many discrete bands the sky is quantised into. Fewer bands read more retro. */
export const SKY_BANDS = 18;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Paints a horizontally-tiling sky strip `height` pixels tall.
 *
 * The ramp is quantised to `SKY_BANDS` steps and consecutive steps are joined by a 4x4 ordered
 * dither, which is what lets a banded sky read as a smooth sky at a glance without a single
 * interpolated pixel.
 */
export function paintSky(timeOfDay: string, height: number): IsoSurface {
  const kind = resolveSkyTime(timeOfDay);
  const stops = SKY_STOPS[kind];
  const h = Math.max(1, Math.round(height));
  const s = new IsoSurface(SKY_TILE_W, h);

  const bands: string[] = [];
  for (let i = 0; i < SKY_BANDS; i++) {
    const t = i / (SKY_BANDS - 1);
    bands.push(rgbToHex(...sampleSky(stops, t)));
  }

  for (let y = 0; y < h; y++) {
    const t = h === 1 ? 0 : y / (h - 1);
    const exact = t * (SKY_BANDS - 1);
    const lower = Math.min(SKY_BANDS - 1, Math.floor(exact));
    const upper = Math.min(SKY_BANDS - 1, lower + 1);
    const frac = exact - lower;
    for (let x = 0; x < SKY_TILE_W; x++) {
      // Ordered dither between the two neighbouring bands.
      const threshold = BAYER4[(y & 3) * 4 + (x & 3)] / 16;
      s.px(x, y, threshold < frac ? bands[upper] : bands[lower]);
    }
  }
  return s;
}

/** Maps any time-of-day string onto a painted sky, defaulting to day. */
export function resolveSkyTime(timeOfDay: string): SkyTime {
  return (SKY_TIMES as readonly string[]).includes(timeOfDay) ? (timeOfDay as SkyTime) : 'DAY';
}

// ---------------------------------------------------------------------------
// celestial bodies
// ---------------------------------------------------------------------------
const SUN_CORE: Record<SkyTime, string> = {
  DAWN: '#fde68a',
  DAY: '#fef9c3',
  DUSK: '#fdba74',
  NIGHT: '#e0e7ff'
};
const SUN_HALO: Record<SkyTime, string> = {
  DAWN: '#fb923c',
  DAY: '#fde047',
  DUSK: '#f97316',
  NIGHT: '#a5b4fc'
};

/**
 * A sun or moon disc with a dithered halo.
 *
 * The halo is a set of ordered-dither rings rather than a radial gradient, which is how a pixel
 * artist draws a glow: the further out, the sparser the dither, so the falloff is implied.
 */
export function paintCelestial(radius: number, timeOfDay: string, crescent: boolean): IsoSurface {
  const kind = resolveSkyTime(timeOfDay);
  const r = Math.max(4, Math.round(radius));
  const size = r * 6 + 4;
  const s = new IsoSurface(size, size);
  const cx = size / 2;
  const cy = size / 2;
  const core = SUN_CORE[kind];
  const halo = SUN_HALO[kind];

  // Halo: five dithered rings, each sparser than the last.
  for (let ring = 5; ring >= 1; ring--) {
    const rr = r + ring * (r * 0.34);
    const density = 1 - ring / 6;
    for (let y = Math.floor(cy - rr); y <= Math.ceil(cy + rr); y++) {
      for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > rr || d < r * 0.9) continue;
        const threshold = BAYER4[(y & 3) * 4 + (x & 3)] / 16;
        if (threshold > density * 0.55) continue;
        s.px(x, y, halo);
      }
    }
  }

  // The disc itself, lit from the upper-left so it has a form rather than reading as a sticker.
  const lit = shift(core, 0.3);
  const shaded = shift(core, -0.22, 0.04, 240, 10);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      if (dx * dx + dy * dy > 1) continue;
      // A crescent moon is the disc minus an offset disc, which is the pixel-art way to draw one.
      if (crescent) {
        const mx = (x - (cx - r * 0.62)) / (r * 0.94);
        const my = (y - (cy - r * 0.1)) / (r * 0.94);
        if (mx * mx + my * my <= 1) continue;
      }
      s.px(x, y, -dx * 0.6 - dy * 0.8 > 0.15 ? lit : shaded);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// clouds
// ---------------------------------------------------------------------------
/** The three cloud widths the renderer's cloud list maps onto, so nothing is ever rescaled. */
export const CLOUD_SIZES = [96, 144, 208];
export const CLOUD_VARIANTS = 3;

interface CloudTones {
  lit: string;
  mid: string;
  shade: string;
  deep: string;
  rim: string;
}

function cloudTones(timeOfDay: string): CloudTones {
  switch (resolveSkyTime(timeOfDay)) {
    case 'DAWN':
      return { lit: '#fde8f3', mid: '#f6c9dd', shade: '#c98cb0', deep: '#8d5c81', rim: '#fde68a' };
    case 'DUSK':
      return { lit: '#f3d9f7', mid: '#c79bd8', shade: '#8a5aa8', deep: '#4c3070', rim: '#fb923c' };
    case 'NIGHT':
      return { lit: '#93a9c9', mid: '#5b7290', shade: '#33415a', deep: '#1b2438', rim: '#bae6fd' };
    default:
      return { lit: '#ffffff', mid: '#e6f2fb', shade: '#a9c8dd', deep: '#6f92ab', rim: '#fef9c3' };
  }
}

/**
 * A cloud: overlapping puff clusters with a lit top, a shaded base and a flat bottom edge.
 *
 * `kind` selects the layer. `sky` clouds are round and float in the air; `sea` clouds are wider,
 * flatter and carry a bright top rim, because they are the cloud sea the floating continent rises
 * out of and they are always seen from above.
 */
export function paintCloud(kind: 'sky' | 'sea', variant: number, sizeIndex: number, timeOfDay: string): IsoSurface {
  const width = CLOUD_SIZES[Math.max(0, Math.min(CLOUD_SIZES.length - 1, Math.floor(sizeIndex)))];
  const v = Math.abs(Math.floor(variant)) % CLOUD_VARIANTS;
  const t = cloudTones(timeOfDay);
  const height = kind === 'sea' ? Math.round(width * 0.26) : Math.round(width * 0.4);
  const s = new IsoSurface(width, height);
  const baseY = kind === 'sea' ? height - 3 : height - 2;

  // Puff layout per variant. Widths are fractions of the cloud so every size bucket keeps the
  // same silhouette, and every layout is asymmetric so a cloud never reads as a scallop.
  const layouts: Array<Array<[number, number, number]>> = [
    [
      [0.3, 0.42, 0.3],
      [0.55, 0.3, 0.34],
      [0.78, 0.46, 0.26],
      [0.44, 0.62, 0.26]
    ],
    [
      [0.24, 0.5, 0.26],
      [0.46, 0.34, 0.36],
      [0.68, 0.42, 0.28],
      [0.86, 0.58, 0.2],
      [0.36, 0.64, 0.22]
    ],
    [
      [0.36, 0.38, 0.34],
      [0.62, 0.48, 0.3],
      [0.16, 0.6, 0.22],
      [0.84, 0.6, 0.22]
    ]
  ];

  const puffs = layouts[v];
  const flat = kind === 'sea' ? 0.5 : 0.62;

  for (const [fx, fy, fr] of puffs) {
    const cx = fx * width;
    const cy = fy * height;
    const rx = fr * width * (kind === 'sea' ? 1.35 : 1);
    const ry = fr * height * flat;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        // Ragged rim, so the silhouette is cloud-like rather than a row of ellipses.
        const edge = 0.86 + ((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) % 100) / 400;
        if (d > edge) continue;
        const lit = -dx * 0.55 - dy * 0.84;
        s.px(x, y, lit > 0.42 ? t.lit : lit > -0.05 ? t.mid : lit > -0.55 ? t.shade : t.deep);
      }
    }
  }

  // Flat bottom and bright top rim: the two things that make a cloud read as a cloud. The bottom
  // pass runs first because it can reach the rim on a cloud only a few pixels tall, so the rim has
  // to be painted last to survive.
  for (let x = 0; x < width; x++) {
    let top = -1;
    let bottom = -1;
    for (let y = 0; y < height; y++) {
      if (s.data[(y * s.w + x) * 4 + 3] <= 60) continue;
      if (top < 0) top = y;
      bottom = y;
    }
    if (top < 0) continue;
    for (let y = baseY; y <= Math.min(height - 1, bottom); y++) s.px(x, y, t.shade);
    s.px(x, Math.min(height - 1, bottom), t.deep);
    s.px(x, top, t.rim);
  }
  return s;
}
