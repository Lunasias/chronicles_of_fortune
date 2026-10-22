import type { AttackerAction, Combatant } from '../game/BattleEngine';
import { defaultCombatPosition, physicalDamage, strikeDamage, magicDamage } from '../game/CombatDamage';

/** Fundamental damage range only. Previewing never resolves a round or draws RNG. */
export function battleForecast(attacker: Combatant, defender: Combatant, action: AttackerAction) {
  const a = { ...attacker, gridPos: attacker.gridPos || defaultCombatPosition(attacker) };
  const d = { ...defender, gridPos: defender.gridPos || defaultCombatPosition(defender) };
  if (a.freezeTurns && !a.playerRef?.relics.includes('dragon_heart')) return { low: 0, high: 0, text: 'แช่แข็ง · ขยับไม่ได้ในรอบนี้', detail: 'เลือกคำสั่งเพื่อผ่านจังหวะที่ถูกแช่แข็ง' };
  if (a.silenceTurns && ['magic', 'skill'].includes(action)) return { low: 0, high: 0, text: 'ใบ้ · เวทนี้จะเสียจังหวะ', detail: 'ใช้การโจมตีกายภาพ หรือรอให้สถานะใบ้สิ้นสุด' };
  if (action === 'skill') return { low: null, high: null, text: 'ท่าเฉพาะอาชีพ', detail: 'ผลขึ้นกับอาชีพ สถานะ และสกิลที่เลือก' };
  if (action === 'burst') return { low: null, high: null, text: 'พลังเกจระเบิด', detail: 'ผลขึ้นกับอาชีพและคู่หูที่พร้อมช่วยโจมตี' };
  const low = action === 'attack' ? physicalDamage(a, d, -2) : action === 'strike' ? strikeDamage(a, d, 0) : magicDamage(a, d, 0);
  const high = action === 'attack' ? physicalDamage(a, d, 2) : action === 'strike' ? strikeDamage(a, d, 11) : magicDamage(a, d, 6);
  const detail = action === 'attack' ? 'ป้องกันลดความเสียหายได้ · ค่านี้ยังไม่รวมการป้องกัน คริติคอล หลบ และเอฟเฟกต์เสริม'
    : action === 'strike' ? 'ทะลุการป้องกัน แต่แพ้สวนกลับ · ยังไม่รวมคริติคอลและเอฟเฟกต์เสริม'
    : 'แพ้ป้องกันเวท · คิดธาตุและแถวยืนแล้ว ยังไม่รวมคริติคอลและเอฟเฟกต์เสริม';
  return { low, high, text: `พื้นฐาน ${low}–${high} HP`, detail };
}
