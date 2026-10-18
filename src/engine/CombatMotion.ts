import type { AttackerAction } from '../game/BattleEngine';
import { JOB_VISUALS } from './JobVisuals';

/** Presentation timings in milliseconds, before the player's speed preference. */
export function combatMotion(job: string, action: AttackerAction) {
  const style = JOB_VISUALS[job]?.style ?? job;
  const caster = ['magician', 'cleric', 'archmage', 'necromancer', 'high_priest', 'saint', 'ranger', 'siren_demoness', 'ghost_maiden', 'kraken_maiden', 'dryad_nymph', 'sphinx_queen', 'dragon_wyrm', 'dragon_princess_ignis'].includes(style);
  const quick = ['thief', 'ninja', 'assassin', 'goblin_girl', 'beast_maiden', 'bandit_pirate', 'arachne_weaver', 'vampire_countess', 'sakura_kitsune'].includes(style);
  const heavy = ['berserker', 'paladin', 'dragon_princess_ignis', 'dragon_wyrm', 'yeti_maiden', 'clockwork_maid'].includes(style);
  if (action === 'burst') return { windup: 360, dash: 300, impact: 540, recovery: 400, ranged: caster };
  if (action === 'magic') return { windup: 280, dash: 180, impact: 480, recovery: 320, ranged: true };
  if (action === 'skill') return { windup: caster ? 320 : quick ? 160 : 260, dash: caster ? 180 : quick ? 180 : 280, impact: 500, recovery: 340, ranged: caster };
  if (action === 'strike') return { windup: quick ? 200 : 280, dash: 300, impact: 460, recovery: 360, ranged: false };
  return { windup: quick ? 80 : heavy ? 150 : 110, dash: quick ? 170 : 230, impact: 340, recovery: 280, ranged: false };
}
