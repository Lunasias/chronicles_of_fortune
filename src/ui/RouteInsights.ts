import type { BoardNode } from '../game/BoardMap';
import type { Combatant } from '../game/BattleEngine';
import type { NodeEncounterPreview } from '../game/MonsterDatabase';
import { previewCombatDamage } from '../game/CombatDamage';

export const ROUTE_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' }, { id: 'safe', label: 'ไม่มีศึก' },
  { id: 'services', label: 'บริการ' }, { id: 'towns', label: 'เมือง' },
  { id: 'treasure', label: 'สมบัติ' }, { id: 'challenge', label: 'ท้าทาย' },
] as const;
export type RouteFilter = typeof ROUTE_FILTERS[number]['id'];
export type RouteSort = 'route' | 'risk' | 'steps';
export type RouteRisk = 'none' | 'favorable' | 'caution' | 'danger';

export interface RouteCombatAdvice {
  risk: RouteRisk;
  label: string;
  description: string;
  incomingDamage: number;
  outgoingDamage: number;
  actionsToDefeat: number;
  hitsUntilDefeat: number;
}

/** Opening estimate using the battle formulas and finite MP. No world RNG advances. */
export function routeCombatAdvice(hero: Combatant, enemy?: Combatant, encounterChance = 0): RouteCombatAdvice {
  const empty = { incomingDamage: 0, outgoingDamage: 0, actionsToDefeat: 0, hitsUntilDefeat: 0 };
  if (encounterChance <= 0) return { ...empty, risk: 'none', label: 'ไม่สุ่มปะทะ', description: 'ไม่มีการสุ่มต่อสู้ประจำช่องนี้' };
  if (!enemy) return { ...empty, risk: 'caution', label: 'ประเมินศัตรูไม่ได้', description: 'พื้นที่นี้อาจมีการต่อสู้ เตรียม HP และอุปกรณ์ให้พร้อม' };
  const outgoing = previewCombatDamage(hero, enemy), incoming = previewCombatDamage(enemy, hero);
  const canCast = hero.mp >= 10 && !hero.silenceTurns;
  const enemyCanCast = enemy.mp >= 10 && !enemy.silenceTurns;
  const outgoingDamage = Math.max(outgoing.physical, canCast ? outgoing.magic : 0);
  const incomingDamage = Math.max(incoming.physical, incoming.strike, enemyCanCast ? incoming.magic : 0);
  let hp = Math.max(1, enemy.hp), mp = hero.mp, actionsToDefeat = 0;
  while (hp > 0 && actionsToDefeat < 10000) {
    const magic = mp >= 10 && !hero.silenceTurns && outgoing.magic > outgoing.physical;
    hp -= magic ? outgoing.magic : outgoing.physical;
    if (magic) mp -= 10;
    actionsToDefeat++;
  }
  const hitsUntilDefeat = Math.max(1, Math.ceil(Math.max(0, hero.hp) / Math.max(1, incomingDamage)));
  const risk: RouteRisk = hero.hp <= incomingDamage || actionsToDefeat >= hitsUntilDefeat ? 'danger' : actionsToDefeat * 2 >= hitsUntilDefeat ? 'caution' : 'favorable';
  const label = risk === 'danger' ? 'เสี่ยงหมดสติ' : risk === 'caution' ? 'ต้องวางแผนรับมือ' : 'พอรับมือได้';
  const description = hero.hp <= incomingDamage
    ? 'การโจมตีแรงหนึ่งครั้งอาจทำให้หมดสติ ควรฟื้น HP หรือเลือกบริการก่อน'
    : `ประมาณ ${actionsToDefeat} การโจมตีเพื่อชนะ · อาจหมดสติเมื่อถูกโจมตีแรงราว ${hitsUntilDefeat} ครั้ง`;
  return { risk, label, description, incomingDamage, outgoingDamage, actionsToDefeat, hitsUntilDefeat };
}

export interface RouteDestinationInsight {
  id: number;
  name: string;
  originalIndex: number;
  steps: number;
  categories: RouteFilter[];
  benefit: string;
  encounterChance: number;
  rivalName?: string;
  enemyName?: string;
  advice: RouteCombatAdvice;
}

const SERVICES = new Set(['shop_item', 'shop_weapon', 'shop_magic', 'church', 'tavern', 'guild', 'vault', 'home']);

export function routeBenefit(node: BoardNode, playerId: number, treasureClaimed = false): string {
  if (node.type === 'town') return node.townData?.isOccupiedByMonster ? 'ปลดปล่อยเมืองเพื่อรับสิทธิ์ครอบครอง' : node.townData?.ownerId === playerId ? 'เมืองของคุณ · จัดการเมืองและเก็บภาษี' : node.townData?.ownerId == null ? 'เมืองอิสระ · โอกาสขยายอาณาเขต' : 'เมืองของคู่แข่ง · ตรวจค่าใช้จ่ายก่อนเข้า';
  if (node.type === 'mystery_chest') return treasureClaimed ? 'สมบัติแห่งนี้ถูกเก็บแล้ว' : 'หีบปริศนา · ลุ้นสมบัติและอุปกรณ์';
  if (node.type === 'home') return node.homeData?.ownerId === playerId ? 'บ้านของคุณ · พักและดูแลบ้าน' : node.homeData ? 'บ้านของคู่แข่ง · อาจมีค่าผ่านทาง' : 'ที่ดินว่าง · สร้างบ้านพัก';
  return ({ shop_item: 'ร้านไอเทม · เติมเสบียง', shop_weapon: 'ร้านอาวุธ · เตรียมอุปกรณ์', shop_magic: 'ร้านเวทมนตร์ · ซื้อคาถา', church: 'วิหาร · ฟื้นฟูและรักษา', tavern: 'โรงเตี๊ยม · พักฟื้น', guild: 'กิลด์ · งานและความก้าวหน้า', vault: 'ธนาคาร · จัดการทรัพย์สิน', blue: 'ช่องโชคดี · รับของรางวัล', red: 'ช่องอันตราย · ระวังการต่อสู้และเหตุร้าย', boss: 'ผู้พิทักษ์ · ศึกใหญ่และรางวัล', dark_gate: 'ทางเข้าดันเจี้ยน · เตรียมตัวก่อนสำรวจ', fishing: 'แหล่งตกปลา · หาเสบียง', isekai_event: 'ประตูต่างโลก · เหตุการณ์พิเศษ', empty: 'เส้นทางป่า · อาจพบการต่อสู้หรือเหตุการณ์' } as Record<string, string>)[node.type] || 'สำรวจจุดหมาย';
}

export function buildRouteInsight(node: BoardNode, preview: NodeEncounterPreview, hero: Combatant, options: { playerId: number; originalIndex: number; steps: number; rivalName?: string; rival?: Combatant; treasureClaimed?: boolean }): RouteDestinationInsight {
  const hasRival = !!(options.rival || options.rivalName);
  const encounterChance = hasRival ? 100 : preview.encounterChancePercent;
  const enemy = options.rival || preview.featuredMonster;
  const advice = routeCombatAdvice(hero, enemy, encounterChance);
  const categories: RouteFilter[] = ['all'];
  if (preview.encounterChancePercent === 0 && !hasRival) categories.push('safe');
  if (SERVICES.has(node.type)) categories.push('services');
  if (node.type === 'town') categories.push('towns');
  if (node.type === 'blue' || (node.type === 'mystery_chest' && !options.treasureClaimed)) categories.push('treasure');
  if (hasRival || node.type === 'boss' || node.type === 'red' || node.townData?.isOccupiedByMonster || advice.risk === 'danger') categories.push('challenge');
  return { id: node.id, name: node.name, originalIndex: options.originalIndex, steps: options.steps, categories, benefit: routeBenefit(node, options.playerId, options.treasureClaimed), encounterChance, rivalName: options.rivalName, enemyName: enemy?.name, advice };
}

/** Sorting never changes destination IDs, legal paths or the original board order. */
export function filterRouteDestinations(destinations: RouteDestinationInsight[], filter: RouteFilter, sort: RouteSort = 'route'): RouteDestinationInsight[] {
  const risk = { none: 0, favorable: 1, caution: 2, danger: 3 };
  return destinations.filter(destination => destination.categories.includes(filter)).sort((a, b) =>
    (sort === 'risk' ? risk[a.advice.risk] - risk[b.advice.risk] || a.encounterChance - b.encounterChance : sort === 'steps' ? a.steps - b.steps : 0) || a.originalIndex - b.originalIndex);
}

export function cycleRouteDestination(destinations: RouteDestinationInsight[], selectedId: number | null, direction: number): number | null {
  if (!destinations.length) return null;
  const current = destinations.findIndex(destination => destination.id === selectedId);
  if (current < 0) return destinations[direction < 0 ? destinations.length - 1 : 0].id;
  return destinations[(current + (direction < 0 ? -1 : 1) + destinations.length) % destinations.length].id;
}

export function recommendRouteDestination(destinations: RouteDestinationInsight[], hp: number, maxHp: number): { id: number; reason: string } | null {
  if (hp / Math.max(1, maxHp) <= .4) {
    const rest = destinations.find(destination => destination.categories.includes('services') && /ฟื้น|รักษา/.test(destination.benefit) && !destination.rivalName);
    if (rest) return { id: rest.id, reason: 'HP เหลือน้อย · แวะพักฟื้นก่อนออกผจญภัย' };
  }
  const treasure = destinations.find(destination => destination.categories.includes('treasure') && destination.categories.includes('safe'));
  if (treasure) return { id: treasure.id, reason: 'มีจุดรับสมบัติที่ไม่มีการสุ่มต่อสู้' };
  const calm = destinations.find(destination => destination.categories.includes('safe'));
  return calm ? { id: calm.id, reason: 'จุดแวะที่ไม่มีการสุ่มต่อสู้' } : null;
}
