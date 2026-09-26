// ===========================================================================
// ISOMETRIC BUILDING PAINTER — 64x64 fantasy isekai models
// ===========================================================================
//
// Produces a raw RGBA buffer for every map structure, so the same art can be rendered at
// runtime and encoded to PNG off-line for review (see scripts/generate_building_sheet.cjs).
// Nothing here touches the DOM.
//
// Style rules applied throughout, following standard isometric pixel-art practice:
//
//   * One light source, top-left. In 2:1 dimetric projection that means the TOP face is
//     brightest, the LEFT face is the mid tone and the RIGHT face is the darkest.
//   * Three tones per material (lit / mid / shaded) plus a fourth for concave "valley"
//     corners, which take a tone 10-15% darker than the shaded face - using the lit tone in an
//     inner corner is the single most common giveaway of amateur isometric art.
//   * Selective outlining: the silhouette is closed with a tinted dark line, but the lit
//     top-left edges use a lighter inner line and pure black is avoided.
//   * Textures (roof tiles, wall planks, brick courses) are drawn at low contrast so they read
//     as surface, not as structure.
//   * A warm glow is placed on every building - lit windows, a furnace, a magic core, lanterns -
//     which is what gives the set its fantasy-isekai evening mood rather than a flat daylight
//     look.

export const BUILDING_SIZE = 64;

/** Base footprint: a 2:1 diamond centred here, so the blit anchor is (x - 32, y - 48). */
export const BUILDING_BASE_X = 32;
export const BUILDING_BASE_Y = 48;
const HW = 26;
const HH = 13;

// ---------------------------------------------------------------------------
// colour
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

function rotateHueToward(h: number, target: number, amount: number): number {
  const delta = ((target - h + 540) % 360) - 180;
  return h + Math.max(-amount, Math.min(amount, delta));
}

/**
 * Shifts a colour in HSL. Shadows cool down and saturate, highlights warm up and desaturate,
 * and lightness moves multiplicatively so dark and pale materials both separate properly.
 */
export function shift(hex: string, dl: number, ds = 0, hueTarget: number | null = null, hueAmount = 0): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const hh = hueTarget === null ? h : rotateHueToward(h, hueTarget, hueAmount);
  const nl = dl >= 0 ? l + (1 - l) * dl : Math.max(0.06, l * (1 + dl));
  return rgbToHex(...hslToRgb(hh, Math.max(0, Math.min(1, s + ds)), nl));
}

// ---------------------------------------------------------------------------
// iso surface
// ---------------------------------------------------------------------------
export class IsoSurface {
  public readonly w: number;
  public readonly h: number;
  public readonly data: Uint8ClampedArray;

  constructor(w = BUILDING_SIZE, h = BUILDING_SIZE) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  px(x: number, y: number, color: string, alpha = 1): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 4;
    const [r, g, b] = hexToRgb(color);
    const a = Math.max(0, Math.min(1, alpha));
    const dstA = this.data[i + 3] / 255;
    const outA = a + dstA * (1 - a);
    if (outA <= 0) return;
    this.data[i] = Math.round((r * a + this.data[i] * dstA * (1 - a)) / outA);
    this.data[i + 1] = Math.round((g * a + this.data[i + 1] * dstA * (1 - a)) / outA);
    this.data[i + 2] = Math.round((b * a + this.data[i + 2] * dstA * (1 - a)) / outA);
    this.data[i + 3] = Math.round(outA * 255);
  }

  /** Adds light rather than painting over, used for glows. */
  glow(x: number, y: number, color: string, alpha: number): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 4;
    const [r, g, b] = hexToRgb(color);
    const a = Math.max(0, Math.min(1, alpha));
    const base = this.data[i + 3] / 255;
    this.data[i] = Math.min(255, this.data[i] + r * a);
    this.data[i + 1] = Math.min(255, this.data[i + 1] + g * a);
    this.data[i + 2] = Math.min(255, this.data[i + 2] + b * a);
    this.data[i + 3] = Math.max(this.data[i + 3], Math.round(Math.min(1, base + a) * 255));
  }

  /** Radial falloff glow, drawn behind a bright core. */
  glowDisc(cx: number, cy: number, rx: number, ry: number, color: string, strength = 0.5): void {
    for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
      for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        this.glow(x, y, color, strength * (1 - d) * (1 - d));
      }
    }
  }

  /** Even-odd scanline fill of a convex or concave polygon. */
  poly(points: Array<[number, number]>, color: string, alpha = 1): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(this.h - 1, Math.ceil(maxY));

    for (let y = y0; y <= y1; y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if (ay === by) continue;
        const lo = Math.min(ay, by);
        const hi = Math.max(ay, by);
        if (y < lo || y >= hi) continue;
        xs.push(ax + ((bx - ax) * (y - ay)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k]);
        const xb = Math.round(xs[k + 1]);
        for (let x = xa; x <= xb; x++) this.px(x, y, color, alpha);
      }
    }
  }

  diamond(cx: number, cy: number, hw: number, hh: number, color: string, alpha = 1): void {
    this.poly(
      [
        [cx, cy - hh],
        [cx + hw, cy],
        [cx, cy + hh],
        [cx - hw, cy]
      ],
      color,
      alpha
    );
  }

  /** Horizontal span with a straight edge, used for trim lines. */
  span(y: number, xa: number, xb: number, color: string, alpha = 1): void {
    for (let x = Math.round(xa); x <= Math.round(xb); x++) this.px(x, y, color, alpha);
  }

  outline(): void {
    const before = new Uint8ClampedArray(this.data);
    const alphaAt = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
      return before[(y * this.w + x) * 4 + 3];
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (alphaAt(x, y) > 40) continue;
        const up = alphaAt(x, y - 1) > 40;
        const down = alphaAt(x, y + 1) > 40;
        const left = alphaAt(x - 1, y) > 40;
        const right = alphaAt(x + 1, y) > 40;
        if (!up && !down && !left && !right) continue;

        let src: [number, number, number] | null = null;
        for (const [dx, dy] of [
          [0, -1],
          [-1, 0],
          [0, 1],
          [1, 0]
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (alphaAt(nx, ny) <= 40) continue;
          const i = (ny * this.w + nx) * 4;
          src = [before[i], before[i + 1], before[i + 2]];
          break;
        }
        if (!src) continue;

        const [h, s, l] = rgbToHsl(src[0], src[1], src[2]);
        const hue = rotateHueToward(h, 240, 16);
        const lit = up || left;
        const col = lit
          ? rgbToHex(...hslToRgb(hue, Math.min(1, s * 0.9), Math.max(0.12, l * 0.66)))
          : rgbToHex(...hslToRgb(hue, Math.min(1, s * 1.05), Math.max(0.05, l * 0.3)));
        this.px(x, y, col, 1);
      }
    }
  }
}

export interface IsoColors {
  top: string;
  left: string;
  right: string;
  /** Concave inner corner: darker than `right`, per the valley-corner rule. */
  valley: string;
  /**
   * A floor surface seen from above: just below the top plate, because a horizontal surface
   * facing the sky catches the light. Used for courtyards, so the interior of a battlemented
   * roof does not invert the model's light direction.
   */
  floor: string;
  /**
   * The top of a low ground slab (a plinth or terrace). Deliberately mid-toned rather than the
   * bright roof tone: a wide bright slab at the bottom of a model drags the whole sprite's
   * light direction downward and makes the building read as lit from below.
   */
  terrace: string;
}

/** Builds the three-face tone set plus the valley, floor and terrace tones. */
export function faceTones(base: string, lit = 1, mid = 0.74, dark = 0.5, valley = 0.38): IsoColors {
  return {
    top: shift(base, lit > 0 ? lit * 0.5 : lit, -0.04, 45, 6),
    left: shift(base, -(1 - mid), 0.06, 240, 12),
    right: shift(base, -(1 - dark), 0.12, 240, 18),
    valley: shift(base, -(1 - valley), 0.16, 240, 22),
    floor: shift(base, -0.12, -0.02, 240, 8),
    terrace: shift(base, -0.3, 0.04, 240, 14)
  };
}

// ---------------------------------------------------------------------------
// shared primitives
// ---------------------------------------------------------------------------
/**
 * An isometric box: two walls plus the top face.
 *
 * The faces are painted left, right, then top so the top plate covers the seam. `inset` pulls
 * the footprint in, which is how smaller blocks stack on larger ones.
 */
export function isoBox(
  s: IsoSurface,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  height: number,
  c: IsoColors,
  inset = 0,
  /** Overrides the top plate tone - useful for ground slabs, which are not roofs. */
  topTone?: string
): void {
  const w = hw - inset;
  const h2 = hh - inset * 0.5;

  // Left wall: eave edge (cx-w,cy) -> (cx,cy+h2), raised by `height`.
  s.poly(
    [
      [cx - w, cy],
      [cx, cy + h2],
      [cx, cy + h2 - height],
      [cx - w, cy - height]
    ],
    c.left
  );
  // Right wall.
  s.poly(
    [
      [cx, cy + h2],
      [cx + w, cy],
      [cx + w, cy - height],
      [cx, cy + h2 - height]
    ],
    c.right
  );
  // Top plate.
  s.diamond(cx, cy - height, w, h2, topTone || c.top);
}

/**
 * A low ground slab (plinth or terrace) for a structure to stand on. Its top uses the terrace
 * tone rather than the roof tone, so a wide bright surface is not left at the bottom of the
 * model where it would fight the light direction.
 */
export function isoPlinth(
  s: IsoSurface,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  height: number,
  c: IsoColors
): void {
  isoBox(s, cx, cy, hw, hh, height, c, 0, c.terrace);
}

/** A gable roof: two planes meeting at a ridge that runs along the top-bottom diamond axis. */
export function isoGableRoof(
  s: IsoSurface,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  rise: number,
  c: IsoColors,
  overhang = 3
): void {
  const w = hw + overhang;
  const h2 = hh + overhang * 0.5;
  const ridgeTop: [number, number] = [cx, cy - h2 - rise];
  const ridgeBottom: [number, number] = [cx, cy + h2 - rise];

  // Left plane.
  s.poly([[cx, cy - h2], [cx - w, cy], [cx, cy + h2], ridgeBottom, ridgeTop], c.left);
  // Right plane.
  s.poly([ridgeTop, [cx, cy - h2], [cx + w, cy], [cx, cy + h2], ridgeBottom], c.right);
  // Ridge highlight: the lit edge of the roof.
  for (let y = Math.round(cy - h2 - rise); y <= Math.round(cy + h2 - rise); y++) {
    s.px(cx, y, c.top);
    s.px(cx - 1, y, c.top);
  }
}

/** A cylinder: top ellipse, graded body, base ellipse. Used for towers and chimneys. */
export function isoCylinder(
  s: IsoSurface,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  height: number,
  c: IsoColors
): void {
  // Body, shaded across its width so it reads as round.
  for (let y = Math.round(cy - height); y <= Math.round(cy); y++) {
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      const t = (x - (cx - rx)) / (rx * 2);
      // Light from the left: brighter at t=0.25, darkest at the right edge.
      const shade = t < 0.35 ? c.left : t < 0.72 ? c.right : c.valley;
      s.px(x, y, shade);
    }
  }
  // Base ellipse in the darkest tone, top ellipse in the lit tone.
  for (let a = 0; a < 360; a += 6) {
    const rad = (a * Math.PI) / 180;
    s.px(cx + Math.cos(rad) * rx, cy + Math.sin(rad) * ry, c.valley);
  }
  for (let y = Math.round(cy - height - ry); y <= Math.round(cy - height + ry); y++) {
    const dy = (y - (cy - height)) / ry;
    const w = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    if (w < 0.5) continue;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const t = (x - (cx - w)) / Math.max(1, w * 2);
      s.px(x, y, t < 0.45 ? c.top : c.left);
    }
  }
}

/** A conical spire roof. */
export function isoCone(s: IsoSurface, cx: number, cy: number, rx: number, ry: number, height: number, c: IsoColors): void {
  for (let y = Math.round(cy - height); y <= Math.round(cy); y++) {
    const t = (y - (cy - height)) / height;
    const w = rx * t;
    const h2 = ry * t;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const u = (x - (cx - w)) / Math.max(1, w * 2);
      s.px(x, y, u < 0.42 ? c.left : c.right);
    }
    if (h2 >= 1) {
      s.px(cx - w, y, c.left);
      s.px(cx + w, y, c.right);
    }
  }
  s.span(Math.round(cy), cx - rx, cx + rx, c.valley);
}

/** A rectangular doorway with an arched head, recessed into the wall. */
export function isoDoor(s: IsoSurface, cx: number, baseY: number, w: number, h: number, frame: string, inner: string): void {
  const halfW = Math.floor(w / 2);
  for (let y = baseY - h; y <= baseY; y++) {
    const arch = y < baseY - h + 3 ? halfW - 1 : halfW;
    for (let x = cx - arch; x <= cx + arch; x++) s.px(x, y, inner);
  }
  // Frame
  for (let y = baseY - h - 1; y <= baseY; y++) {
    s.px(cx - halfW - 1, y, frame);
    s.px(cx + halfW + 1, y, frame);
  }
  s.span(baseY - h - 1, cx - halfW - 1, cx + halfW + 1, frame);
  s.span(baseY, cx - halfW - 1, cx + halfW + 1, frame);
  // Handle, at roughly elbow height
  s.px(cx + halfW - 1, baseY - Math.max(2, Math.floor(h * 0.45)), '#facc15');
}

/** A lit window: white frame, low-saturation glass, warm glow, reflection line. */
export function isoWindow(
  s: IsoSurface,
  cx: number,
  cy: number,
  w: number,
  h: number,
  frame: string,
  glass: string,
  lit = true
): void {
  const halfW = Math.floor(w / 2);
  for (let y = cy; y < cy + h; y++) {
    for (let x = cx - halfW; x <= cx - halfW + w - 1; x++) s.px(x, y, glass);
  }
  // Frame
  for (let y = cy - 1; y <= cy + h; y++) {
    s.px(cx - halfW - 1, y, frame);
    s.px(cx - halfW + w, y, frame);
  }
  s.span(cy - 1, cx - halfW - 1, cx - halfW + w, frame);
  s.span(cy + h, cx - halfW - 1, cx - halfW + w, frame);
  // Mullion
  s.px(cx, cy, frame);
  s.px(cx, cy + h - 1, frame);
  // Reflection
  s.px(cx - halfW, cy + 1, '#ffffff', 0.5);
  s.px(cx - halfW + 1, cy + 1, '#ffffff', 0.35);
  if (lit) {
    s.glowDisc(cx, cy + h / 2, w + 3, h + 2, '#fbbf24', 0.34);
    s.px(cx - halfW, cy + h - 2, '#fde68a', 0.6);
  }
}

/** Roof tiles: slightly rounded rows, offset like brickwork, at low contrast. */
export function roofTiles(s: IsoSurface, cx: number, cy: number, hw: number, hh: number, rise: number, tint: string): void {
  const w = hw + 3;
  const h2 = hh + 1.5;
  for (let row = 0; row < 4; row++) {
    const t = row / 4;
    const yL = cy - h2 * (1 - t) - rise * t;
    const yR = cy + h2 * (1 - t) - rise * t;
    const edge = Math.min(yL, yR);
    for (let x = Math.round(cx - w * (1 - t)); x <= Math.round(cx + w * (1 - t)); x += 3) {
      s.px(x + (row % 2), edge + 1, tint, 0.2);
      s.px(x + 1 + (row % 2), edge + 2, tint, 0.12);
    }
  }
}

/** Horizontal plank or brick courses on a wall face at low contrast. */
export function wallCourses(s: IsoSurface, x0: number, x1: number, yTop: number, yBottom: number, tint: string, step = 4): void {
  for (let y = yTop + step; y < yBottom; y += step) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) s.px(x, y, tint, 0.18);
  }
}

/**
 * Crenellated battlement ring around the rim of a top diamond.
 *
 * The top face of a box is the brightest tone, so leaving it bare makes a structure read as a
 * bright lozenge. Painting the rim with merlons - and the interior with the darkest "courtyard"
 * tone - turns that plate into a walled roof terrace instead.
 */
export function battlements(
  s: IsoSurface,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  c: IsoColors,
  courtyard = true
): void {
  if (courtyard) {
    // A paved floor, not a void: it faces the sky, so it must stay brighter than the walls or
    // the model's light direction reads as inverted.
    s.diamond(cx, cy, hw, hh, c.floor);
    // Paving joints, drawn at low contrast.
    for (let i = -Math.round(hw); i <= Math.round(hw); i += 4) {
      s.px(cx + i, cy + Math.abs(i) * 0.5, shift(c.floor, -0.2), 0.35);
    }
  }

  const corners: Array<[number, number]> = [
    [cx, cy - hh],
    [cx + hw, cy],
    [cx, cy + hh],
    [cx - hw, cy]
  ];

  for (let e = 0; e < 4; e++) {
    const [ax, ay] = corners[e];
    const [bx, by] = corners[(e + 1) % 4];
    const steps = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay)));
    // Edges running to the left corner face the light, the others fall away from it.
    const tone = e === 2 || e === 3 ? c.left : c.right;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(ax + (bx - ax) * t);
      const y = Math.round(ay + (by - ay) * t);
      const merlon = i % 5 < 3 ? 3 : 1;
      for (let k = 1; k <= merlon; k++) s.px(x, y - k, tone);
      s.px(x, y - merlon - 1, c.top);
    }
  }
}

/** Vertical timber framing, the classic fantasy-isekai inn look. */
export function timberFrame(s: IsoSurface, x0: number, x1: number, yTop: number, yBottom: number, color: string): void {
  for (let y = yTop; y <= yBottom; y++) {
    s.px(x0, y, color);
    s.px(x1, y, color);
  }
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    s.px(x, yTop, color);
    s.px(x, yBottom, color);
  }
}

// ---------------------------------------------------------------------------
// shared palette (warm fantasy-isekai evening set)
// ---------------------------------------------------------------------------
const STONE = '#b9b2a6';
const STONE_LIGHT = '#d6cfc2';
const TIMBER = '#8a5a34';
const ROOF_RED = '#b4553f';
const ROOF_SLATE = '#5b6472';
const ROOF_GOLD = '#c9a24a';
const GOLD = '#e0b34a';
const IRON = '#5c6470';
const GLASS = '#7fa8bd';
const WARM = '#fbbf24';
const MAGIC = '#a855f7';
const WATER = '#2f7fa8';

function flag(s: IsoSurface, x: number, yTop: number, yBottom: number, color: string): void {
  for (let y = yTop; y <= yBottom; y++) s.px(x, y, IRON);
  for (let y = yTop + 1; y <= yTop + 5; y++) {
    for (let i = 0; i <= 5; i++) s.px(x + 1 + i, y, shift(color, i > 3 ? -0.2 : 0, 0.05, 240, 10));
  }
  s.px(x, yTop, GOLD);
}

function barrel(s: IsoSurface, cx: number, cy: number): void {
  const c = faceTones(TIMBER, 0.42, 0.78, 0.52, 0.4);
  isoCylinder(s, cx, cy, 3.2, 2, 6, c);
  s.span(cy - 4, cx - 3, cx + 3, IRON);
  s.span(cy - 1, cx - 3, cx + 3, IRON);
}

function crate(s: IsoSurface, cx: number, cy: number, size = 5): void {
  const c = faceTones('#9c6b3f', 0.4, 0.76, 0.5, 0.38);
  isoBox(s, cx, cy, size, size / 2, size, c);
  timberFrame(s, cx - size, cx, cy - size + 1, cy, shift('#9c6b3f', -0.35));
}

function smoke(s: IsoSurface, cx: number, cy: number): void {
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 2.4, 0.3],
    [-1, -3, 3.0, 0.24],
    [1, -6, 3.4, 0.18],
    [-1, -9, 3.8, 0.12]
  ];
  for (const [dx, dy, r, a] of puffs) {
    for (let y = Math.round(cy + dy - r); y <= Math.round(cy + dy + r); y++) {
      for (let x = Math.round(cx + dx - r); x <= Math.round(cx + dx + r); x++) {
        const d = Math.hypot(x - (cx + dx), y - (cy + dy)) / r;
        if (d <= 1) s.px(x, y, '#cbd5e1', a * (1 - d * 0.7));
      }
    }
  }
}

function crystal(s: IsoSurface, cx: number, cy: number, h: number, color: string): void {
  const c = faceTones(color, 0.5, 0.8, 0.55, 0.42);
  for (let i = 0; i <= h; i++) {
    const w = Math.max(0.6, (h - i) * 0.36);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      s.px(x, cy - i, x < cx ? c.left : c.right);
    }
  }
  s.px(cx, cy - h, c.top);
  s.glowDisc(cx, cy - h / 2, h * 0.9, h * 0.9, color, 0.3);
}

function coinPile(s: IsoSurface, cx: number, cy: number, color = GOLD): void {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 2 + (i % 4);
    const x = cx + Math.cos(a) * r * 1.4;
    const y = cy + Math.sin(a) * r * 0.7;
    s.px(x, y, color);
    s.px(x + 1, y, shift(color, -0.25));
  }
  s.glowDisc(cx, cy - 1, 7, 5, WARM, 0.28);
}

// ---------------------------------------------------------------------------
// buildings
// ---------------------------------------------------------------------------
function castleCitadel(s: IsoSurface, owner: string | null): void {
  const stone = faceTones(STONE, 0.5, 0.74, 0.5, 0.38);
  const keep = faceTones(STONE_LIGHT, 0.46, 0.72, 0.48, 0.36);
  const tower = faceTones('#c9c1b2', 0.48, 0.73, 0.49, 0.37);
  const roof = faceTones(ROOF_SLATE, 0.42, 0.7, 0.46, 0.34);

  // Ground plinth, curtain wall, then the walled courtyard roof terrace.
  isoPlinth(s, 32, 52, HW, HH, 4, stone);
  isoBox(s, 32, 49, 19, 9.5, 17, stone);
  battlements(s, 32, 49 - 17, 19, 9.5, stone);
  wallCourses(s, 22, 30, 40, 48, shift(STONE, -0.35), 3);

  // Corner towers, shorter than before so the silhouette stays wider than it is tall.
  for (const dx of [-16, 16]) {
    const cx = 32 + dx;
    const cy = 46 + (dx < 0 ? 3 : -3);
    isoCylinder(s, cx, cy, 6, 3, 22, tower);
    battlements(s, cx, cy - 22, 6, 3, tower);
    isoCone(s, cx, cy - 25, 7, 3.6, 9, roof);
    flag(s, cx, cy - 35, cy - 29, owner || GOLD);
  }

  // Gatehouse at the front of the curtain wall.
  isoBox(s, 32, 57, 6.5, 3.2, 9, keep);
  battlements(s, 32, 48, 6.5, 3.2, keep, false);
  isoDoor(s, 32, 57, 6, 8, shift(STONE, -0.5), '#161014');

  // Arched windows along the wall.
  isoWindow(s, 21, 40, 4, 5, shift(STONE_LIGHT, 0.18), GLASS);
  isoWindow(s, 43, 40, 4, 5, shift(STONE_LIGHT, 0.18), GLASS);
  isoWindow(s, 32, 33, 5, 5, shift(STONE_LIGHT, 0.18), '#c9b7ea');

  // Owner banner hanging over the gatehouse.
  if (owner) {
    for (let y = 48; y <= 55; y++) s.px(32, y, shift(owner, -0.28));
    for (let y = 48; y <= 55; y++) s.px(31, y, owner);
    for (let x = 26; x <= 38; x++) s.px(x, 48, GOLD);
  }
  s.glowDisc(32, 42, 14, 11, WARM, 0.24);
  s.glowDisc(32, 36, 9, 8, MAGIC, 0.18);
}

function blacksmithForge(s: IsoSurface): void {
  const stone = faceTones('#9a8f80', 0.48, 0.72, 0.48, 0.36);
  const roof = faceTones(ROOF_GOLD, 0.4, 0.7, 0.46, 0.34);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoBox(s, 32, 47, 18, 9, 15, stone);
  isoGableRoof(s, 32, 47, 18, 9, 8, roof);
  roofTiles(s, 32, 47, 18, 9, 8, shift(ROOF_GOLD, -0.4));

  // Chimney and its smoke.
  isoBox(s, 46, 40, 5, 2.5, 22, stone);
  s.span(16, 41, 51, shift('#9a8f80', -0.5));
  smoke(s, 46, 12);

  // Glowing furnace mouth on the front-left wall.
  for (let y = 40; y <= 45; y++) {
    const w = 3 + (45 - y) * 0.3;
    for (let x = Math.round(22 - w); x <= Math.round(22 + w); x++) s.px(x, y, '#ff8c1a');
  }
  s.glowDisc(22, 43, 9, 7, '#ff8c1a', 0.5);

  isoDoor(s, 36, 47, 5, 8, shift(TIMBER, -0.35), '#241812');
  isoWindow(s, 40, 37, 4, 4, shift(ROOF_GOLD, 0.2), '#ffb347');

  // Anvil out front and a blade on the wall.
  isoBox(s, 20, 55, 3.4, 1.7, 2.4, faceTones(IRON, 0.5, 0.76, 0.5, 0.38));
  for (let i = 0; i < 7; i++) s.px(48 + i * 0.5, 32 - i, i % 2 === 0 ? '#dfe6ee' : '#9aa7b4');
  s.px(48, 33, TIMBER);
}

function arcaneSpire(s: IsoSurface): void {
  const stone = faceTones('#8e86a8', 0.46, 0.72, 0.46, 0.34);
  const tower = faceTones('#a79ec4', 0.5, 0.74, 0.5, 0.38);
  const roof = faceTones('#5b3f8f', 0.42, 0.7, 0.46, 0.34);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoCylinder(s, 32, 48, 13, 6.5, 12, stone);
  isoCylinder(s, 32, 48, 7.5, 3.8, 30, tower);
  isoCone(s, 32, 18, 10, 5, 15, roof);

  // Stained glass and lit arrow slits.
  isoWindow(s, 24, 34, 4, 6, shift('#a79ec4', 0.2), '#c9a7ff');
  isoWindow(s, 30, 36, 3, 4, shift('#a79ec4', 0.2), '#8fd8ff');
  isoDoor(s, 36, 48, 5, 8, shift('#8e86a8', -0.4), '#1e1630');

  // Floating crystals and the core orb.
  for (let a = 0; a < 360; a += 72) {
    const rad = (a * Math.PI) / 180;
    crystal(s, 32 + Math.cos(rad) * 15, 30 + Math.sin(rad) * 8, 5, '#c084fc');
  }
  s.px(32, 17, '#ffffff');
  s.glowDisc(32, 18, 8, 7, MAGIC, 0.65);
  s.glowDisc(24, 36, 9, 9, MAGIC, 0.28);
}

function cathedral(s: IsoSurface): void {
  const stone = faceTones('#cfc8ba', 0.48, 0.74, 0.48, 0.36);
  const roof = faceTones('#4a5568', 0.4, 0.68, 0.44, 0.32);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoBox(s, 32, 47, 14, 7, 22, stone);
  isoGableRoof(s, 32, 47, 14, 7, 15, roof);
  roofTiles(s, 32, 47, 14, 7, 15, shift('#4a5568', -0.45));

  // Rose window with warm light behind it.
  for (let y = 28; y <= 38; y++) {
    for (let x = 24; x <= 32; x++) {
      const d = Math.hypot((x - 28) / 4.5, (y - 33) / 5);
      if (d > 1) continue;
      const spoke = ((x - 28 + y - 33) % 4 + 4) % 4;
      s.px(x, y, d > 0.78 ? shift('#cfc8ba', 0.16) : spoke < 2 ? '#ffd479' : '#7fb0d6');
    }
  }
  s.glowDisc(28, 33, 10, 11, WARM, 0.42);

  // Buttresses and a cross spire.
  for (const dx of [-11, 11]) {
    isoBox(s, 32 + dx, 49 + (dx < 0 ? 1 : -1), 2.4, 1.2, 14, stone);
    isoCone(s, 32 + dx, 36 + (dx < 0 ? 1 : -1), 3, 1.6, 5, roof);
  }
  for (let y = 8; y <= 16; y++) s.px(32, y, GOLD);
  for (let x = 28; x <= 36; x++) s.px(x, 11, GOLD);
  s.glowDisc(32, 12, 7, 6, WARM, 0.35);

  isoDoor(s, 32, 47, 6, 10, shift('#cfc8ba', -0.35), '#2a1c14');
  isoWindow(s, 42, 38, 3, 5, shift('#cfc8ba', 0.18), '#8fb7c9');
}

function generalGoods(s: IsoSurface): void {
  const wall = faceTones('#c8ab84', 0.46, 0.74, 0.48, 0.36);
  const roof = faceTones(ROOF_RED, 0.42, 0.7, 0.46, 0.34);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoBox(s, 32, 47, 17, 8.5, 14, wall);
  isoGableRoof(s, 32, 47, 17, 8.5, 9, roof);
  roofTiles(s, 32, 47, 17, 8.5, 9, shift(ROOF_RED, -0.4));

  // Striped awning over the shopfront.
  for (let i = 0; i <= 20; i++) {
    const y = 34 + Math.round(i * 0.35);
    const a = 40 - i;
    const b = 24 + i;
    for (let x = a; x <= b; x++) {
      s.px(x, y, Math.floor((x - 24) / 3) % 2 === 0 ? '#e8dfd0' : '#c0453c');
    }
  }
  s.span(34, 20, 40, shift(ROOF_RED, -0.45));

  isoDoor(s, 30, 46, 6, 9, shift(TIMBER, -0.3), '#20160f');
  isoWindow(s, 40, 36, 4, 5, shift('#c8ab84', 0.2), '#ffcf70');
  s.glowDisc(30, 40, 12, 9, WARM, 0.34);

  crate(s, 18, 55, 5);
  crate(s, 23, 58, 4);
  barrel(s, 45, 55);
  // Hanging trade sign.
  flag(s, 46, 28, 33, '#3b82f6');
}

function tavernInn(s: IsoSurface): void {
  const wall = faceTones('#d8c39b', 0.46, 0.74, 0.48, 0.36);
  const roof = faceTones('#8a5a2b', 0.4, 0.7, 0.46, 0.34);
  const beam = shift(TIMBER, -0.28);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoBox(s, 32, 47, 16, 8, 20, wall);
  // Timber framing on both visible walls.
  for (let i = -3; i <= 3; i++) {
    timberFrame(s, 32 + i * 5, 32 + i * 5, 28, 47, beam);
  }
  s.span(38, 16, 31, beam);
  isoGableRoof(s, 32, 47, 16, 8, 11, roof);
  roofTiles(s, 32, 47, 16, 8, 11, shift('#8a5a2b', -0.4));

  isoBox(s, 45, 38, 4.5, 2.2, 24, wall);
  s.span(14, 41, 49, shift('#d8c39b', -0.45));
  smoke(s, 45, 10);

  isoDoor(s, 28, 46, 6, 9, beam, '#241812');
  // Warm upper and lower windows.
  isoWindow(s, 38, 33, 4, 4, beam, '#ffcf70');
  isoWindow(s, 22, 33, 4, 4, beam, '#ffcf70');
  isoWindow(s, 33, 27, 3, 3, beam, '#ffb347');
  s.glowDisc(30, 36, 16, 12, WARM, 0.32);

  // Hanging inn sign and a barrel by the door.
  flag(s, 12, 30, 36, '#b4553f');
  barrel(s, 44, 54);
  for (let x = 16; x <= 24; x++) s.px(x, 57, TIMBER);
  for (let x = 16; x <= 24; x++) s.px(x, 59, shift(TIMBER, -0.3));
}

function guildHall(s: IsoSurface): void {
  const wall = faceTones('#a9967a', 0.46, 0.74, 0.48, 0.36);
  const roof = faceTones('#4f5b6b', 0.4, 0.68, 0.44, 0.32);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoBox(s, 32, 47, 18, 9, 17, wall);
  isoGableRoof(s, 32, 47, 18, 9, 10, roof);
  roofTiles(s, 32, 47, 18, 9, 10, shift('#4f5b6b', -0.45));

  // Grand banner over the entrance.
  for (let y = 30; y <= 44; y++) {
    const w = 6;
    for (let x = 32 - w; x <= 32 + w; x++) {
      s.px(x, y, (y - 30) % 6 < 3 ? '#1d4ed8' : '#e2e8f0');
    }
  }
  s.px(32, 32, GOLD);
  s.px(32, 33, GOLD);
  s.glowDisc(32, 37, 12, 10, WARM, 0.22);

  isoDoor(s, 34, 46, 6, 9, shift(TIMBER, -0.3), '#1c1410');
  isoWindow(s, 22, 34, 4, 5, shift('#a9967a', 0.2), '#ffcf70');

  // Shields on the wall and a notice board on the ground.
  for (const [dx, dy] of [[20, 30], [24, 27], [44, 38]]) {
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 3; j++) {
        if (Math.abs(i) === 2 && j > 0) continue;
        s.px(dx + i, dy + j, j < 0 ? GOLD : '#7f1d1d');
      }
    }
  }
  isoBox(s, 16, 55, 4, 2, 5, faceTones('#7a5a38', 0.4, 0.74, 0.48, 0.36));
  for (let y = 50; y <= 53; y++) for (let x = 12; x <= 20; x++) s.px(x, y, '#e8dfd0', 0.9);
}

function fishingPier(s: IsoSurface): void {
  const wood = faceTones('#9c7040', 0.46, 0.74, 0.48, 0.36);
  const woodTop = faceTones('#b98a52', 0.44, 0.72, 0.46, 0.34);

  // Water pool, then the deck on posts.
  s.diamond(32, 52, 24, 12, WATER, 0.85);
  s.diamond(32, 51, 20, 10, shift(WATER, 0.2), 0.5);
  for (const [dx, dy] of [[-14, 0], [14, 0], [0, 8], [0, -8]]) {
    isoBox(s, 32 + dx, 52 + dy * 0.5, 1.2, 0.6, 6, faceTones('#6b4a28', 0.4, 0.72, 0.46, 0.34));
  }
  isoBox(s, 32, 52, 22, 11, 3, wood, 0, shift(wood.top, -0.22));
  s.diamond(32, 52 - 3, 22, 11, woodTop.top);
  // Plank lines.
  for (let i = -18; i <= 18; i += 4) s.px(32 + i, 52 - 3 + Math.abs(i) * 0.5, shift('#b98a52', -0.3), 0.35);

  // A hut with a fish sign, a rod and a bucket.
  isoBox(s, 36, 44, 8, 4, 10, faceTones('#c8ab84', 0.44, 0.72, 0.46, 0.34));
  isoGableRoof(s, 36, 44, 8, 4, 6, faceTones('#7a5230', 0.4, 0.7, 0.46, 0.34));
  isoWindow(s, 32, 36, 3, 3, shift('#c8ab84', 0.2), '#ffcf70');

  for (let i = 0; i < 16; i++) s.px(16 + i * 0.7, 40 - i, i % 3 === 0 ? '#e8dfd0' : '#8a6b45');
  for (let i = 0; i < 10; i++) s.px(17 + i * 0.9, 24 + i, '#cfd8e3', 0.7);
  barrel(s, 20, 56);
  s.px(22, 54, '#5fb0d8');
  s.px(23, 54, '#8fd0ea');
  // Ripples.
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    s.px(32 + Math.cos(rad) * 26, 52 + Math.sin(rad) * 13, '#bfe6f5', 0.4);
  }
}

function isekaiShrine(s: IsoSurface): void {
  const vermilion = faceTones('#c0392b', 0.44, 0.72, 0.46, 0.34);
  const dark = faceTones('#3f2a1d', 0.4, 0.7, 0.44, 0.32);

  // Stone steps and a glowing summoning circle.
  isoPlinth(s, 32, 52, 20, 10, 3, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  for (let a = 0; a < 360; a += 8) {
    const rad = (a * Math.PI) / 180;
    s.px(32 + Math.cos(rad) * 15, 50 + Math.sin(rad) * 7.5, '#7dd3fc');
  }
  s.glowDisc(32, 50, 16, 8, '#38bdf8', 0.4);

  // Torii gate.
  for (const dx of [-10, 10]) isoCylinder(s, 32 + dx, 48 + (dx < 0 ? 1 : -1), 2.4, 1.4, 30, vermilion);
  for (let x = 18; x <= 46; x++) s.px(x, 17, shift('#c0392b', 0.2));
  for (let x = 17; x <= 47; x++) s.px(x, 18, shift('#c0392b', -0.2));
  for (let x = 16; x <= 48; x++) s.px(x, 21, '#8f2b20');
  for (let x = 20; x <= 44; x++) s.px(x, 24, '#8f2b20');

  // Floating runes and a stone lantern.
  for (const [x, y] of [[16, 28], [48, 30], [22, 38], [44, 40]]) {
    s.px(x, y, '#a5f3fc');
    s.px(x + 1, y, '#67e8f9');
    s.px(x, y + 1, '#67e8f9');
    s.glowDisc(x, y, 4, 4, '#22d3ee', 0.4);
  }
  isoBox(s, 14, 56, 2.6, 1.3, 6, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  s.px(14, 49, GOLD);
  s.glowDisc(14, 49, 5, 5, WARM, 0.45);
}

function darkPortal(s: IsoSurface): void {
  const obsidian = faceTones('#3b3550', 0.4, 0.7, 0.44, 0.3);
  const obsidianDark = faceTones('#241f38', 0.36, 0.66, 0.4, 0.28);

  isoPlinth(s, 32, 52, 20, 10, 3, obsidianDark);
  // Pillars and lintel.
  for (const dx of [-11, 11]) isoBox(s, 32 + dx, 48 + (dx < 0 ? 1 : -1), 4, 2, 26, obsidian);
  for (let x = 17; x <= 47; x++) for (let y = 18; y <= 22; y++) s.px(x, y, obsidian.right);
  for (let x = 17; x <= 47; x++) s.px(x, 18, obsidian.left);

  // Skull on the lintel.
  for (let y = 15; y <= 19; y++) {
    for (let x = 29; x <= 35; x++) {
      const d = Math.hypot((x - 32) / 3.4, (y - 17) / 2.6);
      if (d > 1) continue;
      s.px(x, y, '#e8e4d8');
    }
  }
  s.px(31, 17, '#0b0a12');
  s.px(33, 17, '#0b0a12');

  // Void rift.
  for (let y = 24; y <= 46; y++) {
    const t = (y - 24) / 22;
    const w = 7 * Math.sin(t * Math.PI) * 1.1;
    for (let x = Math.round(32 - w); x <= Math.round(32 + w); x++) {
      const d = Math.abs(x - 32) / Math.max(1, w);
      s.px(x, y, d > 0.6 ? '#7c3aed' : d > 0.3 ? '#a855f7' : '#e9d5ff');
    }
  }
  s.glowDisc(32, 35, 15, 16, MAGIC, 0.55);
  // Ground cracks.
  for (const [x, y, len] of [[20, 55, 6], [44, 55, 5], [26, 58, 4]]) {
    for (let i = 0; i < len; i++) s.px(x + i, y + Math.round(i * 0.4), '#6d28d9', 0.7);
  }
}

function treasureVault(s: IsoSurface): void {
  const stone = faceTones('#8d8577', 0.46, 0.74, 0.48, 0.36);
  const roof = faceTones('#4b5262', 0.4, 0.68, 0.44, 0.32);

  isoPlinth(s, 32, 50, HW, HH, 4, faceTones(STONE, 0.5, 0.74, 0.5, 0.38));
  isoBox(s, 32, 47, 16, 8, 16, stone);
  isoGableRoof(s, 32, 47, 16, 8, 9, roof);
  roofTiles(s, 32, 47, 16, 8, 9, shift('#4b5262', -0.45));

  // Iron door with a wheel lock.
  for (let y = 30; y <= 46; y++) {
    for (let x = 26; x <= 38; x++) s.px(x, y, IRON);
  }
  for (let y = 30; y <= 46; y += 4) s.span(y, 26, 38, shift(IRON, -0.3));
  for (let a = 0; a < 360; a += 18) {
    const rad = (a * Math.PI) / 180;
    s.px(32 + Math.cos(rad) * 4, 38 + Math.sin(rad) * 4, '#8b93a1');
  }
  s.px(32, 38, GOLD);
  s.glowDisc(32, 38, 9, 9, WARM, 0.24);

  isoWindow(s, 20, 34, 3, 4, shift('#8d8577', 0.2), '#c9a7ff');
  isoWindow(s, 44, 34, 3, 4, shift('#8d8577', 0.2), '#c9a7ff');

  coinPile(s, 18, 55, GOLD);
  coinPile(s, 46, 53, '#e8c766');
  // Padlock motif above the door.
  for (let y = 24; y <= 28; y++) for (let x = 30; x <= 34; x++) s.px(x, y, y < 26 ? GOLD : shift(GOLD, -0.3));
}

function wonderChest(s: IsoSurface): void {
  const wood = faceTones('#a3653a', 0.46, 0.74, 0.48, 0.36);
  const lid = faceTones('#bf7a45', 0.44, 0.72, 0.46, 0.34);

  // Chest body.
  isoBox(s, 32, 50, 15, 7.5, 12, wood);
  // Curved lid: stacked ellipses.
  for (let i = 0; i <= 7; i++) {
    const rx = 15 - i * 0.5;
    const ry = 7.5 - i * 0.25;
    for (let x = Math.round(32 - rx); x <= Math.round(32 + rx); x++) {
      const u = (x - (32 - rx)) / (rx * 2);
      s.px(x, 38 - i, u < 0.45 ? lid.left : u < 0.8 ? lid.right : lid.valley);
    }
    void ry;
  }
  s.glowDisc(32, 36, 18, 12, WARM, 0.3);

  // Gold bands, lock and trim.
  for (let y = 26; y <= 50; y++) s.px(32, y, GOLD);
  s.span(38, 18, 46, shift(GOLD, -0.25));
  s.span(50, 18, 46, shift(GOLD, -0.25));
  for (let y = 38; y <= 44; y++) for (let x = 30; x <= 34; x++) s.px(x, y, y < 40 ? '#e8c766' : GOLD);
  s.px(32, 41, '#4a2f1a');

  // Sparkles around it.
  for (const [x, y] of [[14, 30], [50, 28], [18, 20], [46, 44], [12, 44]]) {
    s.px(x, y, '#ffffff');
    s.px(x - 1, y, '#fde68a', 0.7);
    s.px(x + 1, y, '#fde68a', 0.7);
    s.px(x, y - 1, '#fde68a', 0.7);
    s.px(x, y + 1, '#fde68a', 0.7);
    s.glowDisc(x, y, 5, 5, WARM, 0.4);
  }
}

function cozyHome(s: IsoSurface, owner: string | null): void {
  const wall = faceTones('#e0d3b8', 0.46, 0.74, 0.48, 0.36);
  const roof = faceTones('#a04a3a', 0.42, 0.7, 0.46, 0.34);
  const beam = shift(TIMBER, -0.24);

  isoBox(s, 32, 49, 15, 7.5, 13, wall);
  for (const i of [-2, 0, 2]) timberFrame(s, 32 + i * 5, 32 + i * 5, 36, 49, beam);
  s.span(42, 17, 30, beam);
  isoGableRoof(s, 32, 49, 15, 7.5, 11, roof);
  roofTiles(s, 32, 49, 15, 7.5, 11, shift('#a04a3a', -0.4));

  // Chimney on the left slope. A chimney reads best on the lit side: it is the tallest mass on
  // the model, so putting it on the right would drag the sprite's light direction rightward.
  isoBox(s, 20, 46, 3.6, 1.8, 19, wall);
  s.span(26, 16, 24, shift('#e0d3b8', -0.45));
  smoke(s, 20, 22);

  isoDoor(s, 30, 48, 5, 8, beam, '#2a1c12');
  isoWindow(s, 39, 40, 4, 4, beam, '#ffcf70');
  s.glowDisc(31, 44, 14, 11, WARM, 0.36);

  // Window box with flowers and a little fence.
  for (let x = 37; x <= 42; x++) s.px(x, 45, '#3d5f2e');
  for (let x = 37; x <= 42; x += 2) s.px(x, 44, '#e07ba8');
  // The fence is a lit wooden rail, so it takes a light wood tone: a dark stripe on the left
  // of the model would fight the light direction the rest of the structure follows.
  for (let x = 14; x <= 24; x++) s.px(x, 56, '#cfa871');
  for (let x = 14; x <= 24; x++) s.px(x, 55, '#e6c795');
  for (const x of [14, 18, 22]) for (let y = 52; y <= 56; y++) s.px(x, y, '#b38c5a');

  if (owner) {
    for (let y = 34; y <= 40; y++) s.px(32, y, shift(owner, -0.25));
    s.px(32, 35, GOLD);
  }
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export type BuildingKind =
  | 'town'
  | 'capital'
  | 'shop_weapon'
  | 'shop_magic'
  | 'shop_item'
  | 'church'
  | 'tavern'
  | 'guild'
  | 'fishing'
  | 'isekai_event'
  | 'dark_gate'
  | 'boss'
  | 'vault'
  | 'mystery_chest'
  | 'home';

/** Every painted structure, for tooling and tests. */
export const BUILDING_KINDS: BuildingKind[] = [
  'town',
  'capital',
  'shop_weapon',
  'shop_magic',
  'shop_item',
  'church',
  'tavern',
  'guild',
  'fishing',
  'isekai_event',
  'dark_gate',
  'boss',
  'vault',
  'mystery_chest',
  'home'
];

/**
 * Paints a 64x64 isometric structure.
 *
 * `ownerColor` tints the banner of a town/capital/home so territory is readable at a glance.
 */
export function paintBuilding(kind: string, ownerColor: string | null = null): IsoSurface {
  const s = new IsoSurface(BUILDING_SIZE, BUILDING_SIZE);

  switch (kind) {
    case 'capital':
    case 'town':
      castleCitadel(s, ownerColor);
      break;
    case 'shop_weapon':
      blacksmithForge(s);
      break;
    case 'shop_magic':
      arcaneSpire(s);
      break;
    case 'shop_item':
      generalGoods(s);
      break;
    case 'church':
      cathedral(s);
      break;
    case 'tavern':
      tavernInn(s);
      break;
    case 'guild':
      guildHall(s);
      break;
    case 'fishing':
      fishingPier(s);
      break;
    case 'isekai_event':
      isekaiShrine(s);
      break;
    case 'dark_gate':
    case 'boss':
      darkPortal(s);
      break;
    case 'vault':
      treasureVault(s);
      break;
    case 'mystery_chest':
      wonderChest(s);
      break;
    case 'home':
      cozyHome(s, ownerColor);
      break;
    default:
      castleCitadel(s, ownerColor);
      break;
  }

  // Soft contact shadow, then close the silhouette.
  for (let y = 56; y <= 62; y++) {
    const w = Math.round(22 - Math.abs(y - 59) * 7);
    if (w <= 0) continue;
    for (let x = 32 - w; x <= 32 + w; x++) s.px(x, y, '#050810', 0.18);
  }
  s.outline();
  return s;
}

