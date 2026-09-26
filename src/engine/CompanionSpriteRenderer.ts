import {
  COMPANION_SPRITE_SIZE,
  allCompanionKeys,
  companionSpritePath,
  getCompanionProfile,
  resolveCompanionKey
} from '../game/CompanionDatabase';
import type { CompanionData } from '../game/Player';

/**
 * Serves the 64x64 pixel-art models for the companions defined in `companions.json`.
 *
 * The PNGs are produced by `scripts/generate_companion_sprites.cjs`, which reads the same
 * JSON, so a companion cannot exist in the game without a model. Loading follows the same
 * pattern as the hero and monster renderers: preload once, clear the canvas cache a single
 * time when the whole set has settled, and hand out a cached canvas after that.
 */
export class CompanionSpriteRenderer {
  private images = new Map<string, HTMLImageElement>();
  private cache = new Map<string, HTMLCanvasElement>();
  private loadedCount = 0;
  private totalToLoad = 0;
  private readyNotified = false;

  constructor() {
    this.preload();
  }

  private preload() {
    const keys = allCompanionKeys();
    this.totalToLoad = keys.length;

    for (const key of keys) {
      const img = new Image();
      img.onload = () => this.markSettled();
      img.onerror = () => {
        console.warn(`[CompanionRenderer] Failed to load model: ${companionSpritePath(key)}`);
        // Count failures too so one missing file cannot stall the ready notification.
        this.markSettled();
      };
      img.src = companionSpritePath(key);
      this.images.set(key, img);
    }
  }

  private markSettled() {
    this.loadedCount++;
    if (this.loadedCount < this.totalToLoad || this.readyNotified) return;
    this.readyNotified = true;
    this.cache.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('companion-assets-loaded'));
    }
  }

  /** True once every model has finished loading or failed. */
  public get isReady(): boolean {
    return this.readyNotified;
  }

  /**
   * The 64x64 model for a companion, or null while its file is still loading. Callers should
   * treat null as "draw the emoji fallback" rather than a failure.
   */
  public getCompanionSprite(companion: Pick<CompanionData, 'id' | 'spriteKey' | 'name'>): HTMLCanvasElement | null {
    return this.getSpriteByKey(resolveCompanionKey(companion));
  }

  public getSpriteByKey(key: string): HTMLCanvasElement | null {
    const resolved = getCompanionProfile(key).key;
    const cached = this.cache.get(resolved);
    if (cached) return cached;

    const img = this.images.get(resolved);
    if (!img || !img.complete || img.naturalWidth === 0) return null;

    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = COMPANION_SPRITE_SIZE;
    canvas.height = COMPANION_SPRITE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, COMPANION_SPRITE_SIZE, COMPANION_SPRITE_SIZE);
    this.cache.set(resolved, canvas);
    return canvas;
  }

  /**
   * Draws a companion into a DOM canvas element, keeping the pixel grid crisp. Used by the
   * home-estate panel and the in-battle companion button.
   */
  public paintInto(target: HTMLCanvasElement, companion: Pick<CompanionData, 'id' | 'spriteKey' | 'name'>): boolean {
    const sprite = this.getCompanionSprite(companion);
    if (!sprite) return false;

    const ctx = target.getContext('2d');
    if (!ctx) return false;

    if (target.width !== COMPANION_SPRITE_SIZE) target.width = COMPANION_SPRITE_SIZE;
    if (target.height !== COMPANION_SPRITE_SIZE) target.height = COMPANION_SPRITE_SIZE;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(sprite, 0, 0, target.width, target.height);
    return true;
  }
}

export const companionSprites = new CompanionSpriteRenderer();
