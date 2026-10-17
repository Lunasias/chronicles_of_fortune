import { createArtworkImage } from './ArtworkLoading';
import {
  COMPANION_SPRITE_SIZE,
  allCompanionKeys,
  companionSpritePath,
  getCompanionProfile,
  resolveCompanionKey
} from '../game/CompanionDatabase';
import type { CompanionData } from '../game/Player';
import { atlasSprite } from './AtlasSprites';

/** Native companion/host atlas, loaded before its first visible appearance. */
export class CompanionSpriteRenderer {
  private images = new Map<string, HTMLImageElement>();
  private cache = new Map<string, HTMLCanvasElement>();
  private readyNotified = false;
  private atlas: HTMLImageElement | null = null;
  private atlasReady = false;
  private portraits = new Map<HTMLCanvasElement, {
    companion: Pick<CompanionData, 'id' | 'spriteKey' | 'name'>;
    fallback: HTMLElement | null;
  }>();

  constructor() {
    if (typeof window !== 'undefined') window.addEventListener('companion-assets-loaded', () => {
      for (const [canvas, entry] of this.portraits) {
        if (!canvas.isConnected) { this.portraits.delete(canvas); continue; }
        const painted = this.paintInto(canvas, entry.companion, entry.fallback);
        canvas.classList.toggle('hidden', !painted);
        entry.fallback?.classList.toggle('hidden', painted);
      }
    });
  }

  private ensureAtlas() {
    if (this.atlas) return;
    this.atlas = createArtworkImage();
    this.atlas.onload = () => {
      this.atlasReady = true; this.cache.clear();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('companion-assets-loaded'));
    };
    this.atlas.src = '/assets/art-v2/companions-atlas.png';
  }

  private ensureFallback(key: string) {
    if (this.images.has(key)) return;
    const image = createArtworkImage(); this.images.set(key, image);
    image.onload = () => {
      this.readyNotified = true; this.cache.delete(key);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('companion-assets-loaded'));
    };
    image.src = companionSpritePath(key);
  }

  /** True once a production atlas or requested fallback is available. */
  public get isReady(): boolean {
    return this.atlasReady || this.readyNotified;
  }

  /** The last three cells are the kingdom's hosts, separate from collectible companions. */
  public getHostSprite(role: 'king' | 'innkeeper' | 'blacksmith'): HTMLCanvasElement | null {
    this.ensureAtlas();
    if (!this.atlasReady || !this.atlas) return null;
    const key = `host_${role}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const col = role === 'king' ? 3 : role === 'innkeeper' ? 4 : 5;
    const sprite = atlasSprite(this.atlas, col, 4, 6, 5, 64);
    this.cache.set(key, sprite);
    return sprite;
  }

  /**
   * The 64x64 model for a companion, or null while its file is still loading. Callers should
   * treat null as "draw the emoji fallback" rather than a failure.
   */
  public getCompanionSprite(companion: Pick<CompanionData, 'id' | 'spriteKey' | 'name'>): HTMLCanvasElement | null {
    return this.getSpriteByKey(resolveCompanionKey(companion));
  }

  public getSpriteByKey(key: string): HTMLCanvasElement | null {
    this.ensureAtlas();
    const resolved = getCompanionProfile(key).key;
    const cached = this.cache.get(resolved);
    if (cached) return cached;

    const index = allCompanionKeys().indexOf(resolved);
    if (this.atlasReady && this.atlas && index >= 0) {
      const canvas = atlasSprite(this.atlas, index % 6, Math.floor(index / 6), 6, 5, 64);
      this.cache.set(resolved, canvas);
      return canvas;
    }

    return null;
  }

  /**
   * Draws a companion into a DOM canvas element, keeping the pixel grid crisp. Used by the
   * home-estate panel and the in-battle companion button.
   */
  public paintInto(target: HTMLCanvasElement, companion: Pick<CompanionData, 'id' | 'spriteKey' | 'name'>, fallback: HTMLElement | null = null): boolean {
    this.portraits.set(target, { companion, fallback });
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
