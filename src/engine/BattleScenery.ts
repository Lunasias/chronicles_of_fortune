import { worldBackground } from './WorldBackground';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { isometricFoliageRenderer } from './IsometricFoliageRenderer';
import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import type { TimeOfDay } from '../game/EcosystemSystem';
import { foliageForBiome } from './BiomeArt';
import { resolveBiome, terrainPalette } from './IsometricTerrainPainter';
import { drawDungeonRoom, drawGroundClusters, drawRegionalProps } from './EnvironmentArt';

/** All scenery and combatants share this ground plane, without separate raised platforms. */
export function battleGroundLayout(w: number, h: number) {
  const floorY = Math.round(h * .64);
  const spread = Math.round(Math.min(220, w * .23));
  const depth = Math.round(Math.min(48, w * .055));
  return { floorY, playerX: Math.round(w / 2) - spread, playerY: floorY + depth,
    enemyX: Math.round(w / 2) + spread, enemyY: floorY - depth };
}

/** Arena scenery shares the board's pixels, materials, light and vegetation. */
export function drawBattleScenery(ctx: CanvasRenderingContext2D, w: number, h: number, biome: string, time: number, timeOfDay: TimeOfDay, boss = false, town = false) {
  ctx.imageSmoothingEnabled = false;
  const cave = ['cavern', 'crystal_cavern', 'abyss'].includes(biome);
  if (cave) {
    drawDungeonRoom(ctx, w, h, biome);
  } else {
    worldBackground.renderSky(ctx, { x: 0, y: 0, zoom: 1 }, w, Math.round(h * .62), time, boss ? 'DUSK' : timeOfDay);
  }
  const { floorY } = battleGroundLayout(w, h), night = timeOfDay === 'NIGHT';
  // Extend the floor beyond the viewport. A visible diamond edge makes the arena look airborne.
  const columns = Math.ceil(w / 96) + 2;
  const rearDepth = -Math.max(4, Math.round(h * .22 / 24));
  const frontDepth = Math.ceil((h - floorY) / 24) + 2;
  const horizon = floorY + rearDepth * 24 + 12;
  const palette = terrainPalette(resolveBiome(biome), night);
  ctx.save(); ctx.beginPath(); ctx.rect(0, horizon, w, h - horizon); ctx.clip();
  ctx.fillStyle = palette.top; ctx.fillRect(0, horizon, w, h - horizon);
  for (let depth = rearDepth; depth <= frontDepth; depth++) for (let column = -columns; column <= columns; column++) {
    const x = Math.round(w / 2 + column * 96 + (Math.abs(depth) % 2) * 48), y = floorY + depth * 24;
    const tile = isometricTerrainRenderer.getTileSprite(biome, { cliffs: false, night, variant: Math.abs(column * 7 + depth * 13) % 4 });
    ctx.drawImage(tile, x - 52, y - 28);
  }
  // Quiet the repeating board texture so fighters remain the visual focus.
  ctx.fillStyle = palette.top; ctx.globalAlpha = .48; ctx.fillRect(0, horizon, w, h - horizon);
  ctx.restore();
  drawGroundClusters(ctx, w, h, horizon, palette.top, palette.cliffLeft);
  // A worn approach links architecture to the arena, leaving the center clear.
  for (let i = 0; i < 14; i++) {
    const x = Math.round(w * .5 - 90 + i * 13), y = horizon + 24 + i * 5;
    ctx.fillStyle = palette.cliffLeft; ctx.globalAlpha = .3;
    ctx.fillRect(x, y, 38 + i % 3 * 4, 6); ctx.fillRect(x + 8, y + 6, 22, 3);
  }
  ctx.globalAlpha = 1;
  drawRegionalProps(ctx, w, horizon, biome);
  drawRegionalProps(ctx, w, h + 8, biome);
  const species = foliageForBiome(biome);
  const treeCount = ['castle', 'steampunk', 'volcano', 'desert'].includes(biome) ? 0 : biome === 'snow' ? 2 : 4;
  if (species) for (let i = 0; i < treeCount; i++) {
    const offset = i % 3;
    const spread = Math.min(350, w * .39), step = Math.min(40, w * .045);
    const x = Math.round(i % 2 === 0 ? w / 2 - spread - offset * step * .3 : w / 2 + spread + offset * step * .3);
    const y = horizon + 12 + offset * 10;
    const tree = isometricFoliageRenderer.getTreeSprite(species, i % 4);
    const scale = w >= 760 ? 2 : 1;
    const size = tree.width * scale;
    ctx.drawImage(tree, x - size / 2, y - Number(tree.dataset.footY || 54) * scale, size, size);
  }
  const landmark = boss ? 'dark_gate' : town ? 'capital' : biome === 'castle' ? 'town' : biome === 'steampunk' ? 'shop_weapon' : biome === 'sakura_shrine' ? 'isekai_event' : biome === 'coral' ? 'fishing' : biome === 'celestial' ? 'monument' : null;
  if (landmark) {
    const building = isometricBuildingRenderer.getBuildingSprite(landmark), size = building.width * 2;
    // Foundation sits on the same tiled plane behind the fighters.
    const foot = building.width >= 96 ? 80 : 48;
    ctx.drawImage(building, Math.round(w / 2 - size / 2), Math.round(horizon + 24 - foot * 2), size, size);
  }
}
