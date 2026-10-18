import { generatedBackdrops, backdropKey } from './GeneratedBackdrops';
import type { TimeOfDay } from '../game/EcosystemSystem';

/** Both fighters stand on the authored foreground, including on tall phone viewports. */
export function battleGroundLayout(w: number, h: number) {
  const floorY = Math.round(h * (w / h < 1.3 ? .82 : .77));
  const spread = Math.round(Math.min(220, w * .23));
  const depth = Math.round(Math.min(32, h * .045, w * .055));
  return { floorY, playerX: Math.round(w / 2) - spread, playerY: floorY + depth,
    enemyX: Math.round(w / 2) + spread, enemyY: floorY - depth };
}

/** Preserve the generated scene's own floor, architecture and vegetation as one coherent space. */
export function drawBattleScenery(ctx: CanvasRenderingContext2D, w: number, h: number, biome: string, _time: number, timeOfDay: TimeOfDay, boss = false, _town = false, nodeId = 0) {
  ctx.imageSmoothingEnabled = false;
  // Bottom-aligned cover retains the walkable foreground instead of cropping it out.
  // No board tiles or miniature map props are painted over the authored battle scene.
  generatedBackdrops.draw(ctx, w, h, backdropKey(biome, nodeId), boss ? 'DUSK' : timeOfDay, 1);
}
