/** Promotion identity is explicit; substring matching loses jobs such as lich_king. */
export const JOB_VISUALS: Record<string, { base: string; style: string; tier: number }> = {
  paladin: { base: 'warrior', style: 'paladin', tier: 2 }, crusader: { base: 'warrior', style: 'paladin', tier: 3 },
  berserker: { base: 'warrior', style: 'berserker', tier: 2 }, warlord: { base: 'warrior', style: 'berserker', tier: 3 },
  archmage: { base: 'magician', style: 'archmage', tier: 2 }, grand_arcanist: { base: 'magician', style: 'archmage', tier: 3 },
  necromancer: { base: 'magician', style: 'necromancer', tier: 2 }, lich_king: { base: 'magician', style: 'necromancer', tier: 3 },
  ninja: { base: 'thief', style: 'ninja', tier: 2 }, phantom_shinobi: { base: 'thief', style: 'ninja', tier: 3 },
  assassin: { base: 'thief', style: 'assassin', tier: 2 }, shadow_reaper: { base: 'thief', style: 'assassin', tier: 3 },
  high_priest: { base: 'cleric', style: 'high_priest', tier: 2 }, radiant_archon: { base: 'cleric', style: 'high_priest', tier: 3 },
  saint: { base: 'cleric', style: 'saint', tier: 2 }, seraphic_saint: { base: 'cleric', style: 'saint', tier: 3 },
  rune_master: { base: 'spellblade', style: 'rune_master', tier: 2 }, rune_sovereign: { base: 'spellblade', style: 'rune_master', tier: 3 }
};
