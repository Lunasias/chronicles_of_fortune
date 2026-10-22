import type { BoardNode } from './BoardMap';

export function roadDistances(nodes: readonly BoardNode[], origin: number): Map<number, number> {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const distances = new Map<number, number>();
  if (!byId.has(origin)) return distances;
  distances.set(origin, 0); const queue = [origin];
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head], distance = distances.get(id)!;
    for (const next of byId.get(id)!.neighbors) if (byId.has(next) && !distances.has(next)) {
      distances.set(next, distance + 1); queue.push(next);
    }
  }
  return distances;
}
export function waypointDestination(nodes: readonly BoardNode[], targetId: number, reachable: readonly number[]): number | null {
  const distances = roadDistances(nodes, targetId);
  let best: number | null = null, steps = Infinity;
  for (const id of reachable) {
    const distance = distances.get(id);
    if (distance !== undefined && distance < steps) { best = id; steps = distance; }
  }
  return best;
}
export const LOCATION_TYPES: Record<string, string> = { town: 'เมือง', shop_item: 'ร้านไอเทม', shop_weapon: 'ร้านอาวุธ', shop_magic: 'ร้านเวท', church: 'โบสถ์', tavern: 'โรงเตี๊ยม', guild: 'กิลด์', boss: 'ผู้พิทักษ์ บอส', dark_gate: 'ดันเจี้ยน', mystery_chest: 'สมบัติ หีบ', vault: 'ธนาคาร', fishing: 'ตกปลา', home: 'บ้าน', blue: 'โชคดี', red: 'อันตราย', isekai_event: 'ต่างโลก', empty: 'เส้นทาง' };
export function findLocations(nodes: readonly BoardNode[], query: string, category = 'all', distances = new Map<number, number>()): BoardNode[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const services = ['shop_item', 'shop_weapon', 'shop_magic', 'church', 'tavern', 'guild', 'vault'];
  return nodes.filter(node => {
    if (category === 'services' && !services.includes(node.type) || category === 'towns' && node.type !== 'town' || category === 'treasure' && !['mystery_chest', 'blue'].includes(node.type) || category === 'bosses' && !['boss', 'dark_gate'].includes(node.type)) return false;
    if (category === 'all' && !query.trim() && ['empty', 'red'].includes(node.type)) return false;
    const text = `${node.name} ${node.subRegionName} ${node.realmName} ${node.biome} ${LOCATION_TYPES[node.type] || ''}`.toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  }).sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity) || a.id - b.id);
}
