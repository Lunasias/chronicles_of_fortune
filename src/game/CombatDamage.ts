import type { Combatant, CombatGridPosition } from './BattleEngine';

export function defaultCombatPosition(c: Combatant): CombatGridPosition {
  const cls = (c.classKey || c.playerRef?.classKey || '').toLowerCase();
  if (['warrior', 'paladin', 'crusader', 'dark_knight', 'berserker', 'warlord'].includes(cls) || c.isBoss) return 'front';
  if (['magician', 'archmage', 'grand_arcanist', 'necromancer', 'lich_king', 'spellblade', 'rune_master', 'rune_sovereign', 'ninja', 'phantom_shinobi', 'cleric', 'high_priest', 'radiant_archon', 'saint', 'seraphic_saint'].includes(cls)) return 'back';
  return 'mid';
}
function physicalFormation(damage: number, a: Combatant, d: Combatant): number {
  if ((a.gridPos || 'mid') === 'front') damage = Math.round(damage * 1.15);
  if ((d.gridPos || 'mid') === 'front') damage = Math.round(damage * 1.10);
  else if ((d.gridPos || 'mid') === 'mid') damage = Math.round(damage * .90);
  else if ((d.gridPos || 'mid') === 'back') damage = Math.round(damage * .85);
  return damage;
}
export function physicalDamage(a: Combatant, d: Combatant, variation = 0): number {
  return physicalFormation(Math.round(Math.max(6, Math.round(a.atk * 2.1 - (d.def || 5) * .75) + variation)), a, d);
}
export function strikeDamage(a: Combatant, d: Combatant, variation = 0): number {
  return Math.max(20, physicalFormation(Math.round(a.atk * 2.6 + variation), a, d));
}
export function magicDamage(a: Combatant, d: Combatant, variation = 0): number {
  let damage = a.mag * 2.6 + 12 - (d.mag || 5) * .85 + variation;
  if (a.element && a.element === d.weaknessElement) damage *= 1.25;
  if (a.element && a.element === d.resistanceElement) damage *= .8;
  if (a.mag >= 20) damage += Math.floor(a.mag * .35);
  if (a.gridPos === 'back') damage = Math.round(damage * 1.20);
  if (d.gridPos === 'back') damage = Math.round(damage * 1.20);
  return Math.round(Math.max(12, damage));
}
/** Opening damage only: no critical, defensive command, relic or companion procs. */
export function previewCombatDamage(attacker: Combatant, defender: Combatant) {
  const a = { ...attacker, gridPos: attacker.gridPos || defaultCombatPosition(attacker) };
  const d = { ...defender, gridPos: defender.gridPos || defaultCombatPosition(defender) };
  return { physical: physicalDamage(a, d), strike: strikeDamage(a, d, 5), magic: magicDamage(a, d, 3) };
}
