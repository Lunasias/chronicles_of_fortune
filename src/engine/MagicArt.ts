export type MagicElement = 'arcane' | 'flame' | 'frost' | 'storm' | 'shadow' | 'holy' | 'nature';
export const MAGIC_PALETTES: Record<MagicElement, readonly [string, string, string]> = {
  arcane: ['#67618c', '#b79ad2', '#d5e0cf'],
  flame: ['#994d51', '#db9560', '#f1d693'],
  frost: ['#426c82', '#8ebac2', '#daebd8'],
  storm: ['#657ba3', '#a5c5ce', '#f1de9a'],
  shadow: ['#44374f', '#927298', '#c2a5b4'],
  holy: ['#8b795a', '#d4bd80', '#f4e9c2'],
  nature: ['#4c786c', '#91be97', '#d3dfab']
};
export function magicElementForJob(job = ''): MagicElement {
  if (/necromancer|lich|assassin|reaper/.test(job)) return 'shadow';
  if (/cleric|priest|saint|archon|paladin|crusader/.test(job)) return 'holy';
  if (/spellblade|rune|shinobi|ninja/.test(job)) return 'storm';
  if (job === 'ranger') return 'nature';
  if (/berserker|warlord/.test(job)) return 'flame';
  return 'arcane';
}
