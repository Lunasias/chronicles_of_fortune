/** Shared nature identity for the board, its clustered groves and tactical arenas. */
export function foliageForBiome(biome: string): string | null {
  if (biome === 'coral' || biome === 'celestial') return null;
  if (biome === 'snow') return 'frost_pine';
  if (biome === 'sakura_shrine') return 'blood_willow';
  if (['cavern', 'crystal_cavern', 'abyss', 'fairy_grove'].includes(biome)) return 'gloom_spore';
  if (['volcano', 'desert', 'steampunk'].includes(biome)) return 'ash_thorn';
  return 'dark_oak';
}
