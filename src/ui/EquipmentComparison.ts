import type { EquipmentItem } from '../engine/PixelSpriteGenerator';
import type { Player } from '../game/Player';
import { escapeHtml } from '../util/Html';

const STATS = ['atk', 'def', 'mag', 'spd', 'luk'] as const;
const PASSIVES: Record<NonNullable<EquipmentItem['passive']>, string> = {
  vampiric: 'ดูดเลือด', burn: 'เผาไหม้', gold_steal: 'ขโมยทอง', curse_strike: 'โจมตีติดคำสาป',
  hp_regen: 'ฟื้น HP', mp_regen: 'ฟื้น MP', counter_boost: 'เสริมการสวนกลับ'
};
export function equipmentComparison(player: Player, item: EquipmentItem): string {
  if (!['weapon', 'shield', 'armor', 'accessory'].includes(item.type)) return '';
  const slot = item.type as keyof Player['equipment'];
  const current = player.equipment[slot];
  const changes = STATS.map(stat => ({ stat, delta: (item[stat] ?? 0) - (current?.[stat] ?? 0) })).filter(change => change.delta !== 0);
  const chips = changes.length ? changes.map(({ stat, delta }) => `<span class="equipment-delta" data-change="${delta > 0 ? 'up' : 'down'}">${stat.toUpperCase()} ${delta > 0 ? '+' : ''}${delta}</span>`).join('') : '<span class="equipment-delta">ค่าสถานะเท่าเดิม</span>';
  return `<div class="equipment-comparison"><span class="equipment-baseline">เทียบกับ ${escapeHtml(current?.name ?? 'ช่องว่าง')}</span><div class="equipment-deltas">${chips}</div>${item.passive ? `<span class="equipment-passive">คุณสมบัติ: ${PASSIVES[item.passive]}</span>` : ''}</div>`;
}
