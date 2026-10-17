import { worldBackground } from './WorldBackground';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { isometricFoliageRenderer } from './IsometricFoliageRenderer';
import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import type { TimeOfDay } from '../game/EcosystemSystem';
import { foliageForBiome } from './BiomeArt';
import { resolveBiome, terrainPalette } from './IsometricTerrainPainter';

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
    ctx.fillStyle = biome === 'abyss' ? '#192035' : '#233a43'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 13; i++) {
      const x = Math.round(i * w / 12), height = 80 + (i * 73 % 120);
      ctx.fillStyle = i % 2 ? '#293f4b' : '#304956'; ctx.fillRect(x - 36, 0, 72, height);
      ctx.fillStyle = '#45636a'; ctx.fillRect(x - 36, 0, 4, height - 12);
    }
  } else {
    worldBackground.renderSky(ctx, { x: 0, y: 0, zoom: 1 }, w, h, time, boss ? 'DUSK' : timeOfDay);
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
  ctx.fillStyle = palette.top; ctx.globalAlpha = .22; ctx.fillRect(0, horizon, w, h - horizon);
  ctx.restore();
  const species = foliageForBiome(biome);
  if (species) for (let i = 0; i < 6; i++) {
    const offset = i % 3;
    const spread = Math.min(350, w * .39), step = Math.min(40, w * .045);
    const x = Math.round(i < 3 ? w / 2 - spread + offset * step : w / 2 + spread - offset * step);
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
