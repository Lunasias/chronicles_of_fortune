import { worldBackground } from './WorldBackground';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { isometricFoliageRenderer } from './IsometricFoliageRenderer';
import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import type { TimeOfDay } from '../game/EcosystemSystem';

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
  const floorY = Math.round(h * .55), night = timeOfDay === 'NIGHT';
  for (let depth = -8; depth <= 8; depth++) for (let gx = -4; gx <= 4; gx++) {
    const gy = depth - gx;
    if (gy < -4 || gy > 4) continue;
    const x = Math.round(w / 2 + (gx - gy) * 48), y = floorY + (gx + gy) * 24;
    const tile = isometricTerrainRenderer.getTileSprite(biome, { cliffs: gx === 4 || gy === 4, night, variant: Math.abs(gx * 7 + gy * 13) % 4 });
    ctx.drawImage(tile, x - 52, y - 28);
  }
  const species = biome === 'snow' ? 'frost_pine' : ['volcano', 'desert', 'steampunk'].includes(biome) ? 'ash_thorn' : biome === 'sakura_shrine' ? 'blood_willow' : ['fairy_grove', 'cavern', 'crystal_cavern', 'abyss'].includes(biome) ? 'gloom_spore' : 'dark_oak';
  if (biome !== 'coral' && biome !== 'celestial') for (let i = 0; i < 6; i++) {
    const offset = i % 3;
    const spread = Math.min(350, w * .39), step = Math.min(40, w * .045);
    const x = Math.round(i < 3 ? w / 2 - spread + offset * step : w / 2 + spread - offset * step);
    const y = Math.round(floorY - 24 - offset * 20);
    const tree = isometricFoliageRenderer.getTreeSprite(species, i % 4);
    const scale = w >= 760 ? 2 : 1;
    const size = tree.width * scale;
    ctx.drawImage(tree, x - size / 2, y - Number(tree.dataset.footY || 54) * scale, size, size);
  }
  const landmark = boss ? 'dark_gate' : town ? 'capital' : biome === 'sakura_shrine' ? 'isekai_event' : biome === 'coral' ? 'fishing' : biome === 'celestial' ? 'monument' : null;
  if (landmark) {
    const building = isometricBuildingRenderer.getBuildingSprite(landmark), size = building.width * 2;
    ctx.drawImage(building, Math.round(w / 2 - size / 2), Math.round(h * .27 - size * .84), size, size);
  }
}
