import { createArtworkImage } from './ArtworkLoading';
import { FOLIAGE_SIZE, paintFoliage } from './IsometricFoliagePainter';
import { atlasSprite } from './AtlasSprites';

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
  private atlas: HTMLImageElement | null = null;
  private atlasReady = false;
  private ensureAtlas() {
    if (this.atlas) return;
    if (typeof Image === 'undefined') return;
    this.atlas = createArtworkImage();
    this.atlas.onload = () => { this.atlasReady = true; this.cache.clear(); };
    this.atlas.src = '/assets/art-v2/kingdom-foliage-atlas.png';
  }

  public getTreeSprite(type: string = 'dark_oak', variant = 0): HTMLCanvasElement {
    this.ensureAtlas();
    const v = Math.abs(Math.floor(variant)) % 4;
    const cacheKey = `${type}_v${v}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const rows: Record<string, number> = { dark_oak: 0, oak: 0, tree: 0, frost_pine: 1, pine: 1, gloom_spore: 2, mushroom: 2, ash_thorn: 3, dead_tree: 3, blood_willow: 4 };
    const row = rows[type];
    if (this.atlasReady && this.atlas && row !== undefined) {
      const canvas = atlasSprite(this.atlas, v, row, 4, 5, 96);
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, 96, 96).data;
      let baseY = 0;
      for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (pixels[(y * 96 + x) * 4 + 3]) baseY = y;
      canvas.dataset.footY = String(baseY);
      this.cache.set(cacheKey, canvas);
      return canvas;
    }

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
