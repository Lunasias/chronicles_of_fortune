import { atlasSprite } from './AtlasSprites';

export const WORLD_DETAIL_NAMES = ['fern', 'berry_thicket', 'fallen_log', 'moss_boulder', 'ruined_arch', 'ivy_pillar', 'woodland_cottage', 'camp', 'fence', 'well', 'market', 'lantern_sign', 'ice_crag', 'crystal_geode', 'mushrooms', 'obsidian_thorns', 'cactus', 'lava_crag', 'coral_reef', 'celestial_ruin', 'gearworks', 'shrine_garden', 'waterfall', 'mountain_crag'] as const;
export type WorldDetailName = typeof WORLD_DETAIL_NAMES[number];

class WorldDetails {
  private image: HTMLImageElement | null = null;
  private ready = false;
  private cache = new Map<string, HTMLCanvasElement>();
  get(kind: WorldDetailName, night = false): HTMLCanvasElement | null {
    if (!this.image) {
      this.image = new Image();
      this.image.onload = () => { this.ready = true; this.cache.clear(); window.dispatchEvent(new CustomEvent('world-art-loaded')); };
      this.image.src = '/assets/art-v2/world-details-atlas.png';
    }
    if (!this.ready) return null;
    const key = `${kind}_${night}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const index = WORLD_DETAIL_NAMES.indexOf(kind);
    const canvas = atlasSprite(this.image, index % 6, Math.floor(index / 6), 6, 4, 96);
    const ctx = canvas.getContext('2d')!, data = ctx.getImageData(0, 0, 96, 96);
    let foot = 0;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
      const i = (y * 96 + x) * 4;
      if (data.data[i + 3]) { foot = y; if (night) { data.data[i] *= .56; data.data[i + 1] *= .65; data.data[i + 2] *= .82; } }
    }
    if (night) ctx.putImageData(data, 0, 0);
    canvas.dataset.footY = String(foot); this.cache.set(key, canvas);
    return canvas;
  }
}
export const worldDetails = new WorldDetails();
