import { BUILDING_SIZE, paintBuilding } from './IsometricBuildingPainter';
import { atlasSprite } from './AtlasSprites';

/**
 * Serves the 64x64 isometric model for every map structure.
 *
 * The drawing itself lives in `IsometricBuildingPainter`, which works on a plain RGBA buffer so
 * the same art can be encoded to PNG off-line (see `scripts/generate_building_sheet.cjs`). This
 * class only converts a painted buffer into a canvas and caches it per type/owner.
 */
export class IsometricBuildingRenderer {
  private cache = new Map<string, HTMLCanvasElement>();
  private atlas: HTMLImageElement | null = null;
  private atlasReady = false;
  private static readonly ATLAS_CELLS: Record<string, number> = {
    capital: 0, town: 1, shop_weapon: 2, shop_item: 3, shop_magic: 4, church: 5,
    tavern: 6, guild: 7, fishing: 8, isekai_event: 9, dark_gate: 10, boss: 10,
    vault: 11, mystery_chest: 12, home: 13, monument: 14, bridge: 15
  };

  private ensureAtlas() {
    if (this.atlas) return;
    if (typeof Image === 'undefined') return;
    this.atlas = new Image();
    this.atlas.onload = () => {
      this.atlasReady = true;
      this.cache.clear();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('world-art-loaded'));
    };
    this.atlas.onerror = () => { this.atlasReady = false; };
    this.atlas.src = '/assets/art-v2/kingdom-buildings-atlas.png';
  }

  public getBuildingSprite(type: string, ownerColor: string | null = null): HTMLCanvasElement {
    this.ensureAtlas();
    const cacheKey = `${type}_${ownerColor || 'none'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const cell = IsometricBuildingRenderer.ATLAS_CELLS[type];
    if (this.atlasReady && this.atlas && cell !== undefined) {
      const canvas = atlasSprite(this.atlas, cell % 4, Math.floor(cell / 4), 4, 4, 96);
      const ctx = canvas.getContext('2d')!;
      if (ownerColor && ['town', 'capital', 'home'].includes(type)) {
        ctx.fillStyle = '#34424a'; ctx.fillRect(81, 40, 2, 20);
        ctx.fillStyle = ownerColor; ctx.fillRect(83, 40, 10, 6);
        ctx.fillStyle = '#f0deb1'; ctx.fillRect(83, 40, 8, 1);
      }
      this.cache.set(cacheKey, canvas);
      return canvas;
    }

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
