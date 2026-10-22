import type { GameState } from './GameState';
export interface MatchConfig { days: number; startingGold: number; startingLevel: number; goldGoal: number; townGoal: number; rewardRate: number; }
export function normalizeMatchConfig(value: Partial<MatchConfig> = {}): MatchConfig {
  const bounded = (n: unknown, fallback: number, min: number, max: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n as number))) : fallback;
  return { days: bounded(value.days, 42, 8, 84), startingGold: bounded(value.startingGold, 300, 100, 1000), startingLevel: bounded(value.startingLevel, 1, 1, 3), goldGoal: bounded(value.goldGoal, 12000, 2000, 50000), townGoal: bounded(value.townGoal, 8, 2, 15), rewardRate: [1, 1.25, 1.5].includes(value.rewardRate || 0) ? value.rewardRate! : 1 };
}
export function configureMatch(game: GameState, input: Partial<MatchConfig>) {
  game.world.matchConfig = normalizeMatchConfig(input);
  if (game.gameMode === 'blitz') game.blitzDayLimit = game.world.matchConfig.days;
  for (const player of game.players) { player.gold = game.world.matchConfig.startingGold; player.matchStats.goldEarnedTotal = player.gold; while (player.level < game.world.matchConfig.startingLevel) player.gainXP(player.xpNeeded - player.xp); }
}
