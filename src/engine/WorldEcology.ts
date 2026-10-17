import type { BoardNode } from '../game/BoardMap';
import type { WorldDetailName } from './WorldDetails';

export function worldNoise(x: number, y: number, salt = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export interface RoadSegment { a: { x: number; y: number }; b: { x: number; y: number } }
export function roadPoint(x: number, y: number, dx: number, dy: number, t: number) {
  const length = Math.max(1,Math.hypot(dx,dy)), bend = Math.sin(t*Math.PI)*Math.min(14,length*.06);
  return {x:Math.round(x+dx*t-dy/length*bend),y:Math.round(y+dy*t+dx/length*bend)};
}
export function roadField(nodes: BoardNode[], project: (x: number, y: number, z: number) => { x: number; y: number }) {
  const buckets = new Map<string, RoadSegment[]>(), size = 384;
  const byId = new Map(nodes.map(n => [n.id, n]));
  for (const n of nodes) for (const id of n.neighbors) {
    const other = byId.get(id); if (!other || id < n.id) continue;
    const edge = { a: project(n.gx, n.gy, n.gz), b: project(other.gx, other.gy, other.gz) };
    for (let x = Math.floor((Math.min(edge.a.x, edge.b.x) - 120) / size); x <= Math.floor((Math.max(edge.a.x, edge.b.x) + 120) / size); x++)
      for (let y = Math.floor((Math.min(edge.a.y, edge.b.y) - 120) / size); y <= Math.floor((Math.max(edge.a.y, edge.b.y) + 120) / size); y++) {
        const key = `${x},${y}`; const list = buckets.get(key) || []; list.push(edge); buckets.set(key, list);
      }
  }
  return (x: number, y: number) => {
    let distance = Infinity;
    for (const { a, b } of buckets.get(`${Math.floor(x / size)},${Math.floor(y / size)}`) || []) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / Math.max(1, dx * dx + dy * dy)));
      distance = Math.min(distance, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
    }
    return distance;
  };
}

export const BIOME_DRESSING: Record<string, readonly WorldDetailName[]> = {
  grass: ['fern', 'berry_thicket', 'moss_boulder', 'fallen_log'],
  forest: ['fern', 'berry_thicket', 'fallen_log', 'moss_boulder', 'ruined_arch'],
  waterfall_forest: ['fern', 'moss_boulder', 'waterfall', 'fallen_log', 'mountain_crag'],
  snow: ['ice_crag', 'crystal_geode', 'ivy_pillar'], desert: ['cactus', 'cactus', 'ruined_arch'],
  volcano: ['lava_crag', 'obsidian_thorns', 'lava_crag'], cavern: ['mushrooms', 'moss_boulder', 'crystal_geode'],
  abyss: ['obsidian_thorns', 'mushrooms', 'ivy_pillar'], crystal_cavern: ['crystal_geode', 'mushrooms', 'ice_crag'],
  coral: ['coral_reef', 'coral_reef', 'moss_boulder'], celestial: ['celestial_ruin', 'ivy_pillar', 'shrine_garden'],
  fairy_grove: ['mushrooms', 'berry_thicket', 'fern', 'ruined_arch'], castle: ['ivy_pillar', 'shrine_garden', 'ruined_arch'],
  steampunk: ['gearworks', 'gearworks', 'moss_boulder', 'camp'], sakura_shrine: ['shrine_garden', 'berry_thicket', 'ivy_pillar']
};

export const SETTLEMENT_DRESSING: Record<string, readonly WorldDetailName[]> = {
  snow: ['camp','well','fence','lantern_sign','ice_crag'],
  desert: ['camp','well','market','cactus','lantern_sign'],
  volcano: ['camp','gearworks','lava_crag','lantern_sign'],
  cavern: ['camp','mushrooms','ivy_pillar'], abyss: ['obsidian_thorns','ivy_pillar','mushrooms'],
  crystal_cavern: ['camp','crystal_geode','ivy_pillar'], celestial: ['celestial_ruin','well','ivy_pillar'],
  coral: ['market','well','coral_reef','lantern_sign'], steampunk: ['gearworks','market','camp','lantern_sign']
};

export interface WorldDressing { x: number; y: number; depth: number; kind: WorldDetailName; biome: string; roadDistance: number }

export function canopyDensity(biome: string, cluster: number): number {
  if (['forest', 'waterfall_forest', 'fairy_grove'].includes(biome)) return cluster > .2 ? .82 : .38;
  if (biome === 'snow') return cluster > .35 ? .62 : .16;
  if (biome === 'grass' || biome === 'sakura_shrine') return cluster > .35 ? .5 : .13;
  if (['abyss', 'cavern', 'crystal_cavern'].includes(biome)) return cluster > .5 ? .32 : .1;
  return 0;
}
