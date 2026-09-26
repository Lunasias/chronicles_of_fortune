// ===========================================================================
// PIXEL SCALE — the rules that keep the board's pixel grid regular
// ===========================================================================
//
// These three functions are the whole anti-shimmer policy for the board, kept pure and separate so
// they can be tested without a canvas.
//
// Why they matter. Hard-edged pixel art has no tolerance for irregular sampling. If world pixels do
// not land on whole screen pixels, some source pixels cover two screen pixels and their neighbours
// cover one, and the grid the art was drawn on stops existing. While the camera moves that
// irregular grid crawls, and if the art also contains a regular micro-pattern - an ordered dither,
// say - the two interfere and produce MOIRE: large slow-moving bands across the screen. That is
// genuinely uncomfortable to look at, and it read as "the pixels are making me dizzy".
//
// So: the scale is always a whole number of pixels per world pixel (or its reciprocal), and the
// camera is always snapped so world blits land on whole pixels.

/**
 * The nearest scale at which every world pixel lands on a whole number of screen pixels.
 *
 * Magnification uses a whole number of screen pixels per world pixel (1x, 2x, 3x). Minification
 * uses the reciprocal, so a whole number of world pixels collapses onto one screen pixel. Nothing
 * in between is allowed: at 1.5x, two world pixels land on three screen pixels, which alternates
 * between one and two screen pixels per source pixel.
 */
export function snapZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  if (zoom >= 1) return Math.max(1, Math.round(zoom));
  return 1 / Math.max(1, Math.round(1 / zoom));
}

/**
 * Snaps a world coordinate so its on-screen position is a whole pixel.
 *
 * `pixelsPerWorld` is the snapped scale from `snapZoom`. A world coordinate times a whole number of
 * pixels is a whole number when the coordinate is, and world coordinates are integers, so this puts
 * every blit exactly on the grid.
 */
export function snapWorld(value: number, pixelsPerWorld: number): number {
  if (!Number.isFinite(pixelsPerWorld) || pixelsPerWorld <= 0) return value;
  return Math.round(value * pixelsPerWorld) / pixelsPerWorld;
}

/**
 * The default zoom for a viewport width, always an even scale.
 *
 * A narrow viewport wants the board smaller, and the smallest even minification above 1-in-4 is
 * one half; anything else would put the board back on an irregular grid to gain a little framing.
 */
export function defaultZoomFor(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 1;
  if (viewportWidth < 480) return snapZoom(0.5);
  if (viewportWidth < 768) return snapZoom(0.6);
  return snapZoom(1);
}

/** The reachable zoom ladder, for documentation and for tests. */
export const ZOOM_LADDER = [1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4] as const;
