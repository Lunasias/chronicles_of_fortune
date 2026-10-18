import type { GameState } from './GameState';
import type { MatchResult } from './WorldState';
import { RULES } from './Rules';

export function evaluateMatch(game: GameState): MatchResult | null {
  const { world, players, dayCounter, gameMode } = game;
  if (world.result) return world.result;
  if (!players.length) return null;
  const leader = [...players].sort((a, b) => b.getNetWorth(game.allNodes) - a.getNetWorth(game.allNodes) || b.matchStats.monstersKilled - a.matchStats.monstersKilled || a.id - b.id)[0];
  if (gameMode === 'coop_raid') {
    if (world.raidTargets.length && world.raidTargets.every(id => world.defeatedBosses.includes(id))) return { teamVictory: true, reason: 'ร่วมมือพิชิตผู้พิทักษ์ทั้งสามภูมิภาคสำเร็จ' };
    if (dayCounter > game.coopRaidDayLimit) return { teamVictory: false, reason: 'หมดเวลาก่อนปราบผู้พิทักษ์ครบทั้งสามภูมิภาค' };
    return null;
  }
  if (gameMode === 'endless_spire') return null;
  if (gameMode === 'blitz') return dayCounter > game.blitzDayLimit ? { winnerId: leader.id, reason: 'มูลค่าทรัพย์สินสูงสุดเมื่อจบการแข่งขันสายฟ้าแลบ' } : null;
  if (gameMode === 'roguelike_draft') return dayCounter > 28 ? { winnerId: leader.id, reason: 'มูลค่าทรัพย์สินสูงสุดหลังจบฤดูกาลดราฟต์' } : null;
  if (game.winGoal === 'boss' && world.campaignBossId !== null && world.defeatedBosses.includes(world.campaignBossId)) return { winnerId: world.bossKillers[world.campaignBossId], reason: 'พิชิตผู้พิทักษ์แห่งหุบเหวสำเร็จ' };
  const winner = players.find(p => game.winGoal === 'gold' ? p.gold >= RULES.goldGoal : game.winGoal === 'towns' ? p.townsControlled >= RULES.townGoal : false);
  if (winner) return { winnerId: winner.id, reason: game.winGoal === 'gold' ? `สะสมเงินครบ ${RULES.goldGoal}G` : `ครองเมืองครบ ${RULES.townGoal} แห่ง` };
  if (dayCounter > RULES.campaignDays) return { winnerId: leader.id, reason: 'มูลค่าทรัพย์สินสูงสุดเมื่อสิ้นสุดแคมเปญ 42 วัน' };
  return null;
}

export function matchObjective(game: GameState): string {
  if (game.gameMode === 'coop_raid') return `ร่วมมือปราบผู้พิทักษ์ ${game.world.raidTargets.filter(id => game.world.defeatedBosses.includes(id)).length}/${game.world.raidTargets.length} • ภายใน ${game.coopRaidDayLimit} วัน`;
  if (game.gameMode === 'endless_spire') return `หอคอยไร้สิ้นสุด • ชั้น ${game.world.spireFloor} • พิชิตบอสเพื่อขึ้นชั้นต่อไป`;
  if (game.gameMode === 'blitz') return `ทรัพย์สินสูงสุดเมื่อจบวันที่ ${game.blitzDayLimit}`;
  if (game.gameMode === 'roguelike_draft') return 'เลือกพรทุกสัปดาห์ • แข่งขันทรัพย์สิน 28 วัน';
  if (game.winGoal === 'boss') return `พิชิตผู้พิทักษ์แห่งหุบเหว • จุดหมาย #${game.world.campaignBossId}`;
  return game.winGoal === 'gold' ? `สะสมเงิน ${RULES.goldGoal}G` : game.winGoal === 'towns' ? `ครองเมือง ${RULES.townGoal} แห่ง` : 'แข่งขันทรัพย์สิน 42 วัน';
}
