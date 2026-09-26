import {
  TERRAIN_SPRITE_H,
  TERRAIN_SPRITE_W,
  paintTerrainTile,
  type TerrainPaintOptions
} from './IsometricTerrainPainter';

/**
 * Serves the 104x82 pixel-art sprite for every board floor tile.
 *
 * The drawing lives in `IsometricTerrainPainter`, which works on a plain RGBA buffer so the same
 * tile can be encoded to PNG off-line (see `scripts/generate_terrain_sprites.cjs`) and re-painted
 * byte-for-byte by `tests/terrain.test.js`. This class only converts a painted buffer into a
 * canvas and caches it per biome / cliff / time-of-day combination.
 */
export class IsometricTerrainRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  public getTileSprite(biome: string, options: TerrainPaintOptions = {}): HTMLCanvasElement {
    const key = `${biome}_${options.cliffs ? 'c' : 'f'}_${options.night ? 'n' : 'd'}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const surface = paintTerrainTile(biome, options);
    const canvas = document.createElement('canvas');
    canvas.width = TERRAIN_SPRITE_W;
    canvas.height = TERRAIN_SPRITE_H;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      // Copy into a canvas-owned ImageData rather than constructing one around the painter's
      // buffer, which keeps this independent of the Uint8ClampedArray generic variance rules.
      const imageData = ctx.createImageData(TERRAIN_SPRITE_W, TERRAIN_SPRITE_H);
      imageData.data.set(surface.data);
      ctx.putImageData(imageData, 0, 0);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  /** Clears cached sprites, e.g. after a palette change during development. */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const isometricTerrainRenderer = new IsometricTerrainRenderer();
