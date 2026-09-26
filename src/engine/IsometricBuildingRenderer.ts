import { BUILDING_SIZE, paintBuilding } from './IsometricBuildingPainter';

/**
 * Serves the 64x64 isometric model for every map structure.
 *
 * The drawing itself lives in `IsometricBuildingPainter`, which works on a plain RGBA buffer so
 * the same art can be encoded to PNG off-line (see `scripts/generate_building_sheet.cjs`). This
 * class only converts a painted buffer into a canvas and caches it per type/owner.
 */
export class IsometricBuildingRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  public getBuildingSprite(type: string, ownerColor: string | null = null): HTMLCanvasElement {
    const cacheKey = `${type}_${ownerColor || 'none'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const surface = paintBuilding(type, ownerColor);
    const canvas = document.createElement('canvas');
    canvas.width = BUILDING_SIZE;
    canvas.height = BUILDING_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      // Copy into a canvas-owned ImageData rather than constructing one around the painter's
      // buffer, which keeps this independent of the Uint8ClampedArray generic variance rules.
      const imageData = ctx.createImageData(BUILDING_SIZE, BUILDING_SIZE);
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

export const isometricBuildingRenderer = new IsometricBuildingRenderer();
