import { createArtworkImage } from './ArtworkLoading';
import { dungeonSceneGroup } from '../game/DungeonLocations';
import type { TimeOfDay } from '../game/EcosystemSystem';

export const BACKDROP_KEYS = ['grass', 'forest', 'waterfall_forest', 'snow', 'desert', 'volcano', 'cavern', 'coral', 'abyss', 'castle', 'fairy_grove', 'crystal_cavern', 'celestial', 'steampunk', 'sakura_shrine', 'dungeon_catacombs', 'dungeon_volcano', 'dungeon_ice'] as const;
export type BackdropKey = typeof BACKDROP_KEYS[number];

export function backdropKey(biome: string, nodeId = 0): BackdropKey {
  const group = dungeonSceneGroup(nodeId);
  if (group) return group === 1000 ? 'dungeon_catacombs' : group === 1100 ? 'dungeon_volcano' : 'dungeon_ice';
  return BACKDROP_KEYS.includes(biome as BackdropKey) ? biome as BackdropKey : 'grass';
}

export function backdropCover(sourceW: number, sourceH: number, width: number, height: number) {
  const scale = Math.max(width / sourceW, height / sourceH);
  const sw = width / scale, sh = height / scale;
  return { sx: Math.round((sourceW-sw)/2), sy: Math.round((sourceH-sh)/2), sw: Math.round(sw), sh: Math.round(sh) };
}

class GeneratedBackdrops {
  private images = new Map<BackdropKey, HTMLImageElement>();
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, key: BackdropKey, timeOfDay: TimeOfDay) {
    let image = this.images.get(key);
    if (!image) {
      image = createArtworkImage();
      this.images.set(key, image);
      image.src = `/assets/art-v2/backdrops-v1/${key}.png`;
    }
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#152636'; ctx.fillRect(0, 0, w, h);
    if (image.complete && image.naturalWidth) {
      const crop = backdropCover(image.naturalWidth, image.naturalHeight, w, h);
      ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
      // Local artwork lighting follows the world clock without filtering the UI or sprites.
      const interior = key.startsWith('dungeon_') || ['cavern','crystal_cavern','coral','abyss'].includes(key);
      if (!interior && timeOfDay !== 'DAY') {
        ctx.globalAlpha = timeOfDay === 'NIGHT' ? .32 : .12;
        ctx.fillStyle = timeOfDay === 'NIGHT' ? '#12204f' : timeOfDay === 'DUSK' ? '#b04458' : '#ffce88';
        ctx.fillRect(0, 0, w, h);
      }
    }
    ctx.restore();
  }
}

export const generatedBackdrops = new GeneratedBackdrops();
