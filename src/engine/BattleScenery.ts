import { worldBackground } from './WorldBackground';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { isometricFoliageRenderer } from './IsometricFoliageRenderer';
import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import type { TimeOfDay } from '../game/EcosystemSystem';
import { foliageForBiome } from './BiomeArt';
import { resolveBiome, terrainPalette } from './IsometricTerrainPainter';
import { drawDungeonRoom, drawGroundClusters } from './EnvironmentArt';
import { worldDetails } from './WorldDetails';
import { BIOME_DRESSING, SETTLEMENT_DRESSING, worldNoise } from './WorldEcology';
import type { WorldDetailName } from './WorldDetails';

/** All scenery and combatants share this ground plane, without separate raised platforms. */
export function battleGroundLayout(w: number, h: number) {
  const floorY = Math.round(h * .64);
  const spread = Math.round(Math.min(220, w * .23));
  const depth = Math.round(Math.min(48, w * .055));
  return { floorY, playerX: Math.round(w / 2) - spread, playerY: floorY + depth,
    enemyX: Math.round(w / 2) + spread, enemyY: floorY - depth };
}

/** Dense scenery surrounds a clearing; full sprite bounds avoid combat silhouettes. */
export function battleDressingLayout(w: number, h: number) {
  const ground = battleGroundLayout(w, h);
  const horizon = ground.floorY - (Math.max(4, Math.round(h * .22 / 24)) + 2) * 24 + 12;
  const scale = w >= 760 ? 2 : 1;
  const placements: { x: number; y: number; scale: number; tree: boolean; seed: number }[] = [];
  const clear = (x: number, y: number, size: number) =>
    [[ground.playerX, ground.playerY], [ground.enemyX, ground.enemyY]].every(([fx, fy]) =>
      x + size / 2 < fx - 76 || x - size / 2 > fx + 76 || y < fy - 160 || y - size > fy + 26) &&
    (x + size / 2 < ground.playerX - 76 || x - size / 2 > ground.enemyX + 76 ||
      y < ground.enemyY - 60 || y - size > ground.playerY + 32);
  for (let row = 0; row < 3; row++) {
    const size = row === 0 ? 1 : scale, step = row === 0 ? 70 : 96 * scale * .62;
    for (let i = -1; i <= Math.ceil(w / step); i++) {
      const x = Math.round(i * step + (row % 2) * step / 2);
      const y = Math.round(horizon + 12 + row * 28 + worldNoise(i, row, 4) * 18);
      if (clear(x, y, 96 * size)) placements.push({ x, y, scale: size, tree: (i + row) % 3 === 0, seed: i + row * 29 });
    }
  }
  for (let row = 0; row < 5; row++) {
    const y = Math.round(horizon + 90 + row * (h - horizon - 70) / 4);
    // Narrow screens keep partial edge clusters rather than crowding the fighters.
    if (w < 760) for (const x of [-24, w + 24]) {
      if (clear(x, y, 96)) placements.push({ x, y, scale: 1, tree: row < 3, seed: row * 17 + x });
    }
    for (let i = 0; i < Math.ceil(w / (78 * scale)); i++) {
      const x = Math.round((i + .3 + worldNoise(i, row, 8) * .5) * 78 * scale);
      if (clear(x, y, 96 * scale)) placements.push({ x, y, scale, tree: row < 3 && i % 3 === 0, seed: i + row * 37 + 100 });
    }
  }
  return placements.sort((a, b) => a.y - b.y);
}

const sceneryFeet = new WeakMap<HTMLCanvasElement, number>();
/** Anchor visible pixels rather than transparent canvas padding, with a tight contact shadow. */
function drawGroundedScenery(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, y: number, scale: number, night: boolean) {
  let foot = Number(image.dataset.footY);
  if (!Number.isFinite(foot)) {
    foot = sceneryFeet.get(image) ?? -1;
    if (foot < 0) {
      const data = image.getContext('2d')!.getImageData(0, 0, image.width, image.height).data;
      foot = image.height - 1;
      findFoot: for (let row = image.height - 1; row >= 0; row--) for (let col = 0; col < image.width; col++) {
        if (data[(row * image.width + col) * 4 + 3] >= 80) { foot = row; break findFoot; }
      }
      sceneryFeet.set(image, foot);
    }
  }
  ctx.save();
  ctx.fillStyle = night ? '#101923' : '#20271e';
  ctx.globalAlpha = .32;
  const rx = Math.max(5, image.width * scale * .23), ry = Math.max(2, Math.round(scale * 4));
  for (let row = -ry; row <= ry; row++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (row / (ry + 1)) ** 2)));
    ctx.fillRect(Math.round(x - half), Math.round(y + row), half * 2, 1);
  }
  ctx.restore();
  ctx.drawImage(image, Math.round(x - image.width * scale / 2), Math.round(y - foot * scale), image.width * scale, image.height * scale);
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
  const rearDepth = -(Math.max(4, Math.round(h * .22 / 24)) + 2);
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
  drawGroundClusters(ctx, w, h, horizon, palette.top, palette.cliffLeft);
  // A worn approach links architecture to the arena, leaving the center clear.
  for (let i = 0; i < 14; i++) {
    const x = Math.round(w * .5 - 90 + i * 13), y = horizon + 24 + i * 5;
    ctx.fillStyle = palette.cliffLeft; ctx.globalAlpha = .3;
    ctx.fillRect(x, y, 38 + i % 3 * 4, 6); ctx.fillRect(x + 8, y + 6, 22, 3);
  }
  ctx.globalAlpha = 1;
  const dressing = BIOME_DRESSING[biome] || BIOME_DRESSING.grass;
  const settlement = SETTLEMENT_DRESSING[biome] || ['fence', 'lantern_sign', 'well'] as const;
  const ground = battleGroundLayout(w, h);
  // Low plants and debris interrupt the floor without concealing contact shadows.
  for (let i = 0; i < Math.ceil(w * h / 7000); i++) {
    const x = Math.round(worldNoise(i, 1, 31) * w);
    const y = Math.round(horizon + 35 + worldNoise(i, 2, 31) * (h - horizon - 35));
    if ([[ground.playerX, ground.playerY], [ground.enemyX, ground.enemyY]].some(([fx, fy]) => Math.abs(x - fx) < 92 && Math.abs(y - fy) < 62)) continue;
    const image = worldDetails.get(dressing[i % dressing.length], night);
    if (!image) continue;
    const size = 32 + (i % 3) * 8, scale = size / 96;
    drawGroundedScenery(ctx, image, x, y, scale, night);
  }
  const species = foliageForBiome(biome);
  for (const placement of battleDressingLayout(w, h)) {
    const { x, y, scale, seed } = placement;
    const index = Math.abs(seed);
    const kind: WorldDetailName = index % 5 === 0 ? settlement[index % settlement.length] : dressing[index % dressing.length];
    const image = placement.tree && species ? isometricFoliageRenderer.getTreeSprite(species, index % 4) : worldDetails.get(kind, night);
    if (!image) continue;
    drawGroundedScenery(ctx, image, x, y, scale, night);
  }
  const landmark = boss ? 'dark_gate' : town ? 'capital' : biome === 'castle' ? 'town' : biome === 'steampunk' ? 'shop_weapon' : biome === 'sakura_shrine' ? 'isekai_event' : biome === 'coral' ? 'fishing' : biome === 'celestial' ? 'monument' : null;
  if (landmark) {
    const building = isometricBuildingRenderer.getBuildingSprite(landmark);
    // Foundation sits on the same tiled plane behind the fighters.
    drawGroundedScenery(ctx, building, w / 2, horizon + 24, 2, night);
  }
}
