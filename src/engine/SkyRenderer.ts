import {
  SKY_TILE_W,
  paintCelestial,
  paintCloud,
  paintSky
} from './SkyPainter';

/**
 * Serves cached canvases for the sky, the clouds and the celestial bodies.
 *
 * The drawing lives in `SkyPainter`, which works on plain RGBA buffers so the same art can be
 * encoded to PNG off-line (see `scripts/generate_sky_sprites.cjs`) and re-painted
 * byte-for-byte by `tests/sky.test.mjs`. This class only converts a buffer into a canvas and
 * caches it.
 *
 * Every sprite is blitted 1:1. Nothing in the background is ever rescaled: the sky strip is
 * stretched vertically only because every row of it is a single flat colour, which stretching
 * cannot blur.
 */
export class SkyRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  private toCanvas(surface: { w: number; h: number; data: Uint8ClampedArray }, key: string): HTMLCanvasElement {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = surface.w;
    canvas.height = surface.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      // Copy into a canvas-owned ImageData rather than constructing one around the painter's
      // buffer, which keeps this independent of the Uint8ClampedArray generic variance rules.
      const imageData = ctx.createImageData(surface.w, surface.h);
      imageData.data.set(surface.data);
      ctx.putImageData(imageData, 0, 0);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  /**
   * The sky strip for a viewport height.
   *
   * Fifty-pixel height buckets: a sky regenerated on every one-pixel resize is wasted work, and
   * a strip that is a few pixels off is stretched in whole rows, which is invisible.
   */
  public getSky(timeOfDay: string, height: number): HTMLCanvasElement {
    const bucket = Math.max(64, Math.ceil(height / 50) * 50);
    const key = `sky_${timeOfDay}_${bucket}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    return this.toCanvas(paintSky(timeOfDay, bucket), key);
  }

  public getCloud(
    kind: 'sky' | 'sea',
    variant: number,
    sizeIndex: number,
    timeOfDay: string
  ): HTMLCanvasElement {
    const key = `cloud_${kind}_${variant}_${sizeIndex}_${timeOfDay}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    return this.toCanvas(paintCloud(kind, variant, sizeIndex, timeOfDay), key);
  }

  public getCelestial(radius: number, timeOfDay: string, crescent: boolean): HTMLCanvasElement {
    const r = Math.max(4, Math.round(radius));
    const key = `cel_${r}_${timeOfDay}_${crescent ? 'moon' : 'sun'}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    return this.toCanvas(paintCelestial(r, timeOfDay, crescent), key);
  }

  /** Clears cached sprites, e.g. after a palette change during development. */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const skyRenderer = new SkyRenderer();
export { SKY_TILE_W };
