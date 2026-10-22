import type { Player } from './Player';
type Stat = 'atk' | 'def' | 'mag' | 'spd' | 'luk';
export const TALENTS = [
  { id: 'blade', branch: 'blade', name: 'วิถีดาบ', detail: 'ATK +2', requires: '', stat: 'atk', bonus: 2 },
  { id: 'fury', branch: 'blade', name: 'ใจนักสู้', detail: 'เมื่อ HP ต่ำกว่า 40% ได้ ATK เพิ่ม 4', requires: 'blade', stat: 'atk', bonus: 4 },
  { id: 'vampiric', branch: 'blade', name: 'ลมหายใจแห่งชัยชนะ', detail: 'ชนะมอนสเตอร์แล้วฟื้น HP 8', requires: 'blade', stat: '', bonus: 0 },
  { id: 'arcane', branch: 'arcane', name: 'วิถีมนตรา', detail: 'MAG +2', requires: '', stat: 'mag', bonus: 2 },
  { id: 'focus', branch: 'arcane', name: 'ร่ายอย่างแม่นยำ', detail: 'เวทบนกระดานใช้ MP ลดลงอีก 2', requires: 'arcane', stat: '', bonus: 0 },
  { id: 'meditation', branch: 'arcane', name: 'สมาธิใต้แสงดาว', detail: 'ฟื้น MP 3 เมื่อเริ่มเทิร์น', requires: 'arcane', stat: '', bonus: 0 },
  { id: 'warden', branch: 'warden', name: 'วิถีผู้พิทักษ์', detail: 'DEF +2', requires: '', stat: 'def', bonus: 2 },
  { id: 'bastion', branch: 'warden', name: 'ยืนหยัด', detail: 'เมื่อ HP ต่ำกว่า 40% ได้ DEF เพิ่ม 5', requires: 'warden', stat: 'def', bonus: 5 },
  { id: 'steward', branch: 'warden', name: 'ผู้ดูแลอาณาจักร', detail: 'รายได้เมืองเพิ่ม 15% สูงสุด 30G ต่อเทิร์น', requires: 'warden', stat: '', bonus: 0 },
] as const;
export function talentPoints(player: Pick<Player, 'level' | 'talents'>): number { return Math.max(0, Math.min(4, Math.floor(player.level / 2)) - player.talents.length); }
export function canLearnTalent(player: Pick<Player, 'level' | 'talents'>, id: string): boolean {
  const talent = TALENTS.find(t => t.id === id);
  if (!talent || talentPoints(player) < 1 || player.talents.includes(id)) return false;
  if (talent.requires && !player.talents.includes(talent.requires)) return false;
  // Each branch forks: its two advanced talents are mutually exclusive.
  return !talent.requires || !TALENTS.some(t => t.requires === talent.requires && player.talents.includes(t.id));
}
export function learnTalent(player: Player, id: string): boolean { if (!canLearnTalent(player, id)) return false; player.talents.push(id); return true; }
export function talentBonus(player: Pick<Player, 'talents' | 'hp' | 'maxHp'>, stat: Stat): number {
  return TALENTS.reduce((sum, talent) => sum + (player.talents.includes(talent.id) && talent.stat === stat && (!['fury', 'bastion'].includes(talent.id) || player.hp < player.maxHp * .4) ? talent.bonus : 0), 0);
}
export function validTalents(value: unknown, level: number): value is string[] {
  if (!Array.isArray(value) || value.length > Math.min(4, Math.floor(level / 2)) || new Set(value).size !== value.length) return false;
  const probe = { level, talents: [] as string[] };
  for (const id of value) { if (typeof id !== 'string' || !canLearnTalent(probe, id)) return false; probe.talents.push(id); }
  return true;
}
