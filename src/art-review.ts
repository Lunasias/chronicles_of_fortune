import { customIsometricHeroRenderer as heroes } from './engine/CustomIsometricHeroRenderer';
import { customIsometricMonsterRenderer as monsters } from './engine/CustomIsometricMonsterRenderer';
import { isometricBuildingRenderer as buildings } from './engine/IsometricBuildingRenderer';
import { isometricTerrainRenderer as terrain } from './engine/IsometricTerrainRenderer';
import { isometricFoliageRenderer as foliage } from './engine/IsometricFoliageRenderer';
import { companionSprites } from './engine/CompanionSpriteRenderer';
import { allCompanionKeys } from './game/CompanionDatabase';
import { IsometricRenderer } from './engine/IsometricRenderer';
import { DOKAPON_NODES, type BoardNode, type BiomeType } from './game/BoardMap';
import { Player } from './game/Player';
import { JOB_VISUALS } from './engine/JobVisuals';
import { drawSettlementScenery } from './engine/SettlementScenery';
import { CombatVFXEngine } from './engine/CombatVFXEngine';
import { MAGIC_PALETTES, type MagicElement } from './engine/MagicArt';
import { ecosystemSystem, type TimeOfDay } from './game/EcosystemSystem';
import type { IsoDirection, CharacterAnimState } from './engine/PixelSpriteGenerator';

const canvas = document.querySelector<HTMLCanvasElement>('#reviewCanvas')!;
const ctx = canvas.getContext('2d')!;
const category = document.querySelector<HTMLSelectElement>('#reviewCategory')!;
const animation = document.querySelector<HTMLSelectElement>('#reviewAnimation')!;
const timeSelect = document.querySelector<HTMLSelectElement>('#reviewTime')!;
const frameSlider = document.querySelector<HTMLInputElement>('#reviewFrame')!;
const status = document.querySelector<HTMLDivElement>('#reviewStatus')!;
if (import.meta.env.DEV) document.querySelector<HTMLAnchorElement>('#reviewBattleLink')!.hidden = false;
const dirs: IsoDirection[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const jobs = ['warrior', 'magician', 'thief', 'cleric', 'spellblade', 'ranger'];
const promotions = Object.keys(JOB_VISUALS);
const effectPreviews = Object.keys(MAGIC_PALETTES).map(element => ({ element: element as MagicElement, fx: new CombatVFXEngine() }));
const settlementPreviews = ['town', 'shop_weapon', 'shop_item', 'shop_magic'].map(kind => {
  const canvas = document.createElement('canvas'); canvas.width = 560; canvas.height = 120;
  return { kind, canvas };
});
const biomes = ['grass', 'forest', 'snow', 'desert', 'volcano', 'cavern', 'coral', 'celestial', 'abyss', 'fairy_grove', 'crystal_cavern', 'castle', 'steampunk', 'waterfall_forest', 'sakura_shrine'];
const structureKinds = ['capital', 'town', 'shop_weapon', 'shop_item', 'shop_magic', 'church', 'tavern', 'guild', 'fishing', 'isekai_event', 'dark_gate', 'vault', 'mystery_chest', 'home'];
const monsterGroups: Record<string, string[]> = {
  wild: ['Slime Princess Aurelia', 'Goblin Girl', 'Beast Maiden', 'Dark Knightress', 'Dragon Princess Ignis', 'Sakura Kitsune'],
  frontier: ['Skeleton Maid', 'Yeti Maiden', 'Siren Demoness', 'Clockwork Maid', 'Bandit Pirate', 'Dragon Wyrm'],
  mythic: ['Kraken Maiden', 'Sphinx Queen', 'Dryad Nymph', 'Arachne Weaver', 'Vampire Countess', 'Ghost Maiden']
};
const types: BoardNode['type'][] = ['town', 'shop_weapon', 'church', 'tavern', 'blue', 'shop_magic', 'guild', 'fishing'];
const positions = [[0, 0], [3, 0], [6, 0], [0, 3], [3, 3], [6, 3], [0, 6], [3, 6]];
const nodes: BoardNode[] = types.map((type, id) => {
  const template = structuredClone(DOKAPON_NODES.find(n => n.type === type) || DOKAPON_NODES[0]);
  const [gx, gy] = positions[id];
  return { ...template, id, gx, gy, gz: 0, type, biome: 'grass', neighbors: positions.flatMap(([x, y], j) => Math.abs(x - gx) + Math.abs(y - gy) === 3 ? [j] : []) };
});
const actor = new Player(1, 'Valeria', 'warrior', false);
actor.gridX = 3; actor.gridY = 3; actor.gridZ = 0;
const reference = new IsometricRenderer(canvas);
reference.camera.x = reference.camera.targetX = 0;
reference.camera.y = reference.camera.targetY = 110;
reference.camera.zoom = reference.camera.targetZoom = 1;
let paused = false;
let frame = 0;
let previousPaint = -Infinity;
let referenceBiome = 'grass';
const biomeSelect = document.querySelector<HTMLSelectElement>('#reviewBiome')!;
for (const biome of biomes) { const option = document.createElement('option'); option.value = biome; option.textContent = biome; biomeSelect.append(option); }

document.querySelector('#reviewPause')!.addEventListener('click', event => {
  paused = !paused; (event.target as HTMLButtonElement).textContent = paused ? 'เล่นภาพต่อ' : 'หยุดภาพ';
});
frameSlider.addEventListener('input', () => { paused = true; frame = Number(frameSlider.value); document.querySelector('#reviewPause')!.textContent = 'เล่นภาพต่อ'; });
document.querySelector('#reviewExport')!.addEventListener('click', () => {
  canvas.toBlob(blob => {
    if (!blob) return;
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `fortuna-${category.value}-${timeSelect.value.toLowerCase()}-frame-${frame}.png`;
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
});

function label(text: string, x: number, y: number) {
  ctx.fillStyle = '#c9d5c1'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText(text, x, y);
}
function paint(now: number) {
  requestAnimationFrame(paint);
  if (now - previousPaint < 100) return;
  previousPaint = now;
  if (!paused) { frame = Math.floor(now / 140) % 8; frameSlider.value = String(frame); }
  const state = animation.value as CharacterAnimState;
  document.querySelector<HTMLLabelElement>('#reviewMonsterGroupLabel')!.hidden = category.value !== 'monsters';
  const night = timeSelect.value === 'NIGHT';
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#172b38'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (category.value === 'reference') {
    if (referenceBiome !== biomeSelect.value) {
      referenceBiome = biomeSelect.value;
      for (const node of nodes) node.biome = referenceBiome as BiomeType;
      reference.hasInitializedBoardCache = false;
    }
    ecosystemSystem.timeOfDay = timeSelect.value as TimeOfDay;
    reference.render(nodes, [actor], actor, [], [], paused ? frame * 140 : now);
  } else if (category.value === 'heroes' || category.value === 'monsters') {
    const rows = category.value === 'heroes' ? jobs : monsterGroups[document.querySelector<HTMLSelectElement>('#reviewMonsterGroup')!.value];
    rows.forEach((name, row) => dirs.forEach((dir, col) => {
      const x = col * 144, y = row * 118;
      const image = category.value === 'heroes' ? heroes.getHeroSprite(name, dir, state, frame) : monsters.getMonsterSprite(name, dir, state, frame);
      ctx.drawImage(image, x, y);
      label(`${name.split(' ')[0]} / ${dir}`, x + 72, y + 117);
    }));
  } else if (category.value === 'promotions') {
    promotions.forEach((job, i) => {
      const x = (i % 6) * 192 + 24, y = Math.floor(i / 6) * 232;
      ctx.drawImage(heroes.getHeroSprite(job, 'SE', state, frame), x, y);
      label(job, x + 72, y + 156);
    });
  } else if (category.value === 'skins') {
    jobs.forEach((job, row) => {
      for (let skin = 0; skin < 5; skin++) {
        const x = skin * 220 + 16, y = row * 118;
        ctx.drawImage(heroes.getHeroSprite(job, 'SE', state, frame, {}, skin === 4, undefined, skin % 4), x, y);
        label(`${job} / ${skin === 4 ? 'Darkling' : skin}`, x + 72, y + 117);
      }
    });
  } else if (category.value === 'effects') {
    effectPreviews.forEach(({ element, fx }, i) => {
      const x = 150 + (i % 4) * 280, y = 190 + Math.floor(i / 4) * 300;
      if (!paused && (!fx.particles.length || fx.particles.every(p => p.alpha < .15))) fx.spawnMagicHit(x, y, false, element);
      if (!paused) for (let step = 0; step < 3; step++) fx.update();
      fx.render(ctx, canvas.width, canvas.height);
      label(element, x, y + 120);
    });
  } else if (category.value === 'settlements') {
    settlementPreviews.forEach(({ kind, canvas: scene }, i) => {
      drawSettlementScenery(scene, kind);
      const x = 10 + i % 2 * 576, y = 60 + Math.floor(i / 2) * 320;
      ctx.drawImage(scene, x, y); label(kind, x + 280, y + 150);
    });
  } else if (category.value === 'buildings') {
    structureKinds.forEach((kind, i) => {
      const x = 40 + (i % 5) * 220, y = 30 + Math.floor(i / 5) * 220;
      ctx.drawImage(buildings.getBuildingSprite(kind), x, y, 192, 192);
      label(kind, x + 96, y + 204);
    });
  } else if (category.value === 'terrain') {
    biomes.forEach((biome, i) => {
      const x = 30 + (i % 5) * 225, y = 30 + Math.floor(i / 5) * 220;
      ctx.drawImage(terrain.getTileSprite(biome, { cliffs: true, night }), x, y, 208, 192);
      label(biome, x + 104, y + 208);
    });
  } else if (category.value === 'foliage') {
    ['dark_oak', 'frost_pine', 'gloom_spore', 'ash_thorn', 'blood_willow'].forEach((species, row) => {
      for (let col = 0; col < 4; col++) {
        const x = 120 + col * 240, y = row * 140;
        const sprite = foliage.getTreeSprite(species, col);
        ctx.drawImage(sprite, x, y, sprite.width, sprite.height);
        label(`${species} ${col + 1}`, x + sprite.width / 2, y + 128);
      }
    });
  } else {
    allCompanionKeys().forEach((key, i) => {
      const sprite = companionSprites.getSpriteByKey(key);
      const x = 14 + (i % 9) * 126, y = 20 + Math.floor(i / 9) * 210;
      if (sprite) ctx.drawImage(sprite, x, y, 128, 128);
      label(key.slice(0, 16), x + 64, y + 154);
    });
  }
  status.textContent = `${category.value.toUpperCase()} · ${timeSelect.value} · FRAME ${frame + 1}/8 · NATIVE PIXELS · ${paused ? 'PAUSED' : 'PLAYING'}`;
  document.querySelector<HTMLAnchorElement>('#reviewBattleLink')!.href = `/?art-scene=battle&biome=${encodeURIComponent(biomeSelect.value)}`;
}
requestAnimationFrame(paint);
