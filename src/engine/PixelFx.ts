// ===========================================================================
// PIXEL FX — hard-edged canvas primitives for effects and overlays
// ===========================================================================
//
// The board overlays, the battle VFX and the cached glow sprites were the last code still
// drawing soft shapes: `createRadialGradient` halos, `ctx.arc` circles, `ctx.ellipse` shadows
// and fourteen `shadowBlur` passes in the combat effects alone. A Gaussian blur cannot exist in
// pixel art - it is the one operation that produces colours no palette contains.
//
// These helpers replace them. Every shape is emitted as integer `fillRect` scanlines, so nothing
// antialiases, and every glow is a set of stepped rings rather than a falloff, so the colour count
// stays bounded.
//
// They take a context and draw immediately rather than returning buffers, because effects are
// per-frame and short-lived: pre-painting each one into a sprite would cost a canvas allocation
// per frame for no correctness gain.

/**
 * Anything a canvas will accept as a fill or stroke style.
 *
 * The helpers take this rather than `string` because it has to describe what the canvas accepts.
 * The handful of call sites that were passing a `CanvasGradient` have had their gradient removed
 * rather than papered over here - a gradient fill is exactly the soft ramp these helpers exist to
 * replace.
 */
export type PixelPaint = string | CanvasGradient | CanvasPattern;

/** A hard-edged filled circle. Scanline per integer row, so the rim is a staircase. */
export function pixelDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: PixelPaint,
  alpha = 1
): void {
  if (r <= 0) return;
  const rows = Math.ceil(r);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let dy = -rows; dy <= rows; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - w, Math.round(cy) + dy, w * 2 + 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * A 2:1 isometric ring: a diamond-equivalent outline, drawn as integer 2x1 blocks per column.
 *
 * `dashed` with a `phase` produces the marching segment pattern used for reachable-tile borders
 * and sonar pulses. Scanning columns rather than stepping an angle is what keeps the ring
 * gapless at every radius; an angle-stepped ring has visible holes at large radii.
 */
export function pixelRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: PixelPaint,
  thickness = 2,
  dashed = false,
  phase = 0
): void {
  if (rx <= 0 || ry <= 0) return;
  const x0 = Math.round(cx - rx);
  const x1 = Math.round(cx + rx);
  ctx.fillStyle = color;
  for (let x = x0; x <= x1; x += thickness) {
    const t = (x - cx) / rx;
    if (t < -1 || t > 1) continue;
    if (dashed && (Math.floor((x - x0) / thickness) + Math.round(phase)) % 6 < 2) continue;
    const dy = ry * Math.sqrt(Math.max(0, 1 - t * t));
    ctx.fillRect(x, Math.round(cy - dy), thickness, 1);
    ctx.fillRect(x, Math.round(cy + dy), thickness, 1);
  }
}

/** A filled axis-aligned ellipse. The isometric look comes from the caller passing ry = rx / 2. */
export function pixelEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: PixelPaint,
  alpha = 1
): void {
  if (rx <= 0 || ry <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const t = dy / ry;
    const w = rx * Math.sqrt(Math.max(0, 1 - t * t));
    ctx.fillRect(Math.round(cx - w), Math.round(cy) + dy, Math.round(w * 2) + 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * A stepped glow: `layers` concentric 2:1 rings with decreasing alpha.
 *
 * This is the replacement for `createRadialGradient`. The falloff is implied by the ring spacing
 * rather than interpolated, which is exactly how a pixel artist draws a glow, and it means the
 * effect uses one colour instead of a few hundred.
 */
export function pixelGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: PixelPaint,
  strength = 0.5,
  layers = 4,
  dashed = false,
  phase = 0
): void {
  if (r <= 0) return;
  for (let i = layers; i >= 1; i--) {
    const k = i / layers;
    ctx.globalAlpha = strength * (1 - k) * (1 - k);
    pixelRing(ctx, cx, cy, r * k, (r * k) / 2, color, Math.max(1, Math.round(2 * (1 - k) + 1)), dashed, phase + i);
  }
  ctx.globalAlpha = 1;
}

/**
 * A stepped screen vignette: hard bands drawn inward from the screen edge.
 *
 * `createRadialGradient` at screen size is the single most expensive soft draw in the frame and
 * the most out of place in a pixel game; banded edges read as a CRT bezel instead.
 */
export function pixelVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: PixelPaint,
  steps = 7,
  maxAlpha = 0.75
): void {
  ctx.fillStyle = color;
  const bandX = Math.ceil(w * 0.06 / steps);
  const bandY = Math.ceil(h * 0.06 / steps);
  for (let i = 0; i < steps; i++) {
    const k = i / steps;
    ctx.globalAlpha = maxAlpha * k * k;
    const insetX = i * bandX;
    const insetY = i * bandY;
    ctx.fillRect(0, insetY, w, bandY);
    ctx.fillRect(0, h - insetY - bandY, w, bandY);
    ctx.fillRect(insetX, 0, bandX, h);
    ctx.fillRect(w - insetX - bandX, 0, bandX, h);
  }
  ctx.globalAlpha = 1;
}

/**
 * A tapered hard-edged stroke between two points, with an optional staircase.
 *
 * The replacement for a `lineWidth` stroke plus `shadowBlur`, which is how the slash and beam
 * effects used to be drawn.
 */
export function pixelStroke(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  color: PixelPaint,
  alpha = 1,
  taper = 0
): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const w = Math.max(1, Math.round(width * (1 - taper * t)));
    // Integer block per step, centred on the path, so the stroke has a pixel staircase rather
    // than a resampled edge.
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), w, 1);
    if (w > 2) ctx.fillRect(Math.round(x - w / 2), Math.round(y) + 1, w - 2, 1);
  }
  ctx.globalAlpha = 1;
}

/** A four-pixel plus: the pixel-art spark, used for hit flashes and pickup glints. */
export function pixelSpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: PixelPaint,
  alpha = 1
): void {
  const s = Math.max(1, Math.round(size));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) - s, Math.round(y), s * 2 + 1, 1);
  ctx.fillRect(Math.round(x), Math.round(y) - s, 1, s * 2 + 1);
  ctx.globalAlpha = 1;
}

/** An integer block. The plainest primitive, and the one most effects should reach for first. */
export function pixelBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: PixelPaint,
  alpha = 1
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  ctx.globalAlpha = 1;
}

/** Parses `#rgb`, `#rrggbb`, `rgb(...)` and `rgba(...)` into components. */
function parseColour(value: string): [number, number, number, number] {
  const text = value.trim();
  if (text.startsWith('#')) {
    const h = text.slice(1);
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
      1
    ];
  }
  const nums = text.match(/-?[\d.]+/g);
  if (!nums || nums.length < 3) return [0, 0, 0, 1];
  return [Number(nums[0]), Number(nums[1]), Number(nums[2]), nums.length > 3 ? Number(nums[3]) : 1];
}

/** Samples a stop list at `t`, returning an `rgba(...)` string. */
function sampleStops(stops: Array<[number, string]>, t: number): string {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];
  for (let k = 0; k < sorted.length - 1; k++) {
    if (t >= sorted[k][0] && t <= sorted[k + 1][0]) {
      lower = sorted[k];
      upper = sorted[k + 1];
      break;
    }
  }
  const span = upper[0] - lower[0];
  const k = span === 0 ? 0 : Math.max(0, Math.min(1, (t - lower[0]) / span));
  const a = parseColour(lower[1]);
  const b = parseColour(upper[1]);
  return `rgba(${Math.round(a[0] + (b[0] - a[0]) * k)}, ${Math.round(a[1] + (b[1] - a[1]) * k)}, ${Math.round(
    a[2] + (b[2] - a[2]) * k
  )}, ${(a[3] + (b[3] - a[3]) * k).toFixed(3)})`;
}

/**
 * A vertical ramp painted as hard horizontal bands.
 *
 * The replacement for `createLinearGradient(0, 0, 0, h)` plus a full-rect fill, which is how every
 * one of the battle arena backdrops was painted. The authored stops are kept - they are the
 * biome's identity - but the space between them is quantised into whole bands rather than
 * interpolated per pixel, which is the difference between a pixel-art sky and a CSS background.
 */
export function pixelVerticalRamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: Array<[number, string]>,
  bandHeight = 18
): void {
  if (stops.length === 0 || w <= 0 || h <= 0) return;
  const bands = Math.max(2, Math.round(h / Math.max(4, bandHeight)));
  ctx.globalAlpha = 1;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = sampleStops(stops, bands === 1 ? 0 : i / (bands - 1));
    const y0 = Math.round((h * i) / bands);
    const y1 = Math.round((h * (i + 1)) / bands);
    ctx.fillRect(Math.round(x), Math.round(y) + y0, Math.round(w), Math.max(1, y1 - y0));
  }
}

/**
 * A radial glow painted as stepped rings rather than a radial gradient.
 *
 * The replacement for `createRadialGradient(...)` plus a full-disc fill. `squash` gives the 2:1
 * isometric ground ellipse when the glow is lying on the floor rather than floating.
 *
 * Currently unused: the remaining radial glows in the battle arenas still pass their
 * `CanvasGradient` straight to `pixelDisc`, so only the rim of those is pixelised. This is the
 * helper for finishing them, and it is kept so the technique is written down rather than
 * rediscovered.
 */
export function pixelRadialGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stops: Array<[number, string]>,
  layers = 5,
  squash = 1
): void {
  if (stops.length === 0 || radius <= 0) return;
  // Outermost first, so the bright core is painted last and stays on top.
  const sorted = [...stops].sort((a, b) => b[0] - a[0]);
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 1 : i / (layers - 1);
    const colour = sampleStops(sorted, t);
    const alpha = parseColour(colour)[3];
    if (alpha <= 0.01) continue;
    const k = 1 - t;
    pixelEllipse(ctx, cx, cy, radius * k, radius * k * squash, colour, alpha);
  }
}
