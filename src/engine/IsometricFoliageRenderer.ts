import { FOLIAGE_SIZE, paintFoliage } from './IsometricFoliagePainter';

/**
 * Serves the 64x64 isometric model for every map tree.
 *
 * The drawing lives in `IsometricFoliagePainter`, which works on a plain RGBA buffer so the same
 * art can be encoded to PNG off-line (see `scripts/generate_foliage_sprites.cjs`) and re-painted
 * byte-for-byte in the test suite. This class only converts a painted buffer into a canvas and
 * caches it per species/variant.
 */
export class IsometricFoliageRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  public getTreeSprite(type: string = 'dark_oak', variant = 0): HTMLCanvasElement {
    const v = Math.abs(Math.floor(variant)) % 4;
    const cacheKey = `${type}_v${v}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const surface = paintFoliage(type, v);
    const canvas = document.createElement('canvas');
    canvas.width = FOLIAGE_SIZE;
    canvas.height = FOLIAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      // Copy into a canvas-owned ImageData rather than constructing one around the painter's
      // buffer, which keeps this independent of the Uint8ClampedArray generic variance rules.
      const imageData = ctx.createImageData(FOLIAGE_SIZE, FOLIAGE_SIZE);
      imageData.data.set(surface.data);
      ctx.putImageData(imageData, 0, 0);
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  /** Clears cached sprites, e.g. after a palette change during development. */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const isometricFoliageRenderer = new IsometricFoliageRenderer();
