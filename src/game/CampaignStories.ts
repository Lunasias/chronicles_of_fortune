import type { GameState } from './GameState';
import type { Player } from './Player';
import type { BoardNode } from './BoardMap';

export interface StoryLedger { stage: number; relationship: number; baseline: number; visited: number[]; lastVisit: string; path?: 'help' | 'trade'; }
export const STORYLINES = [
  { id: 'mira', name: 'มิราแห่งกิลด์', type: 'guild', intro: 'คาราวานหายไปในป่า ช่วยปราบมอนสเตอร์อีก 2 ตัว แล้วกลับมาหาข้าที่กิลด์', goal: 2, gold: 160, xp: 80 },
  { id: 'elowen', name: 'เอโลเวนผู้เยียวยา', type: 'church', intro: 'ขาดเสบียงยาสำหรับนักเดินทาง ช่วยไปเยือนสถานบริการต่างกัน 3 แห่ง แล้วกลับมาที่วิหาร', goal: 3, gold: 90, xp: 100 },
  { id: 'bran', name: 'บรานเจ้าของโรงเตี๊ยม', type: 'tavern', intro: 'จดหมายของข้าไปไม่ถึงสหาย ช่วยเดินทางเยือนสถานบริการต่างกัน 3 แห่ง แล้วกลับมาที่โรงเตี๊ยม', goal: 3, gold: 120, xp: 80 },
] as const;
export function storyLedger(game: GameState, player: Player, id: string): StoryLedger {
  return (game.world.storylines[player.id] ??= {})[id] ??= { stage: 0, relationship: 0, baseline: 0, visited: [], lastVisit: '' };
}
export function recordStoryVisit(game: GameState, player: Player, node: BoardNode) {
  if (!['guild', 'church', 'tavern', 'shop_item', 'shop_magic', 'shop_weapon', 'town'].includes(node.type)) return;
  for (const story of STORYLINES) {
    const ledger = storyLedger(game, player, story.id);
    if (ledger.stage === 1 && !ledger.visited.includes(node.id)) ledger.visited.push(node.id);
  }
}
export function storyProgress(game: GameState, player: Player, id: string): number {
  const ledger = storyLedger(game, player, id);
  return Math.min(3, id === 'mira' ? Math.max(0, player.matchStats.monstersKilled - ledger.baseline) : ledger.visited.length);
}
export function acceptStory(game: GameState, player: Player, id: string, path: 'help' | 'trade'): boolean {
  const story = STORYLINES.find(s => s.id === id); if (!story) return false;
  const ledger = storyLedger(game, player, id);
  if (ledger.stage !== 0) return false;
  ledger.stage = 1; ledger.path = path; ledger.baseline = player.matchStats.monstersKilled; ledger.relationship = path === 'help' ? 1 : 0;
  return true;
}
export function claimStory(game: GameState, player: Player, id: string): boolean {
  const story = STORYLINES.find(s => s.id === id); if (!story) return false;
  const ledger = storyLedger(game, player, id);
  const node = game.allNodes.find(n => n.id === player.nodeId);
  if (ledger.stage !== 1 || node?.type !== story.type || storyProgress(game, player, id) < story.goal) return false;
  ledger.stage = 2; ledger.relationship += ledger.path === 'help' ? 2 : 1;
  const reward = story.gold + (ledger.path === 'trade' ? 40 : 0);
  player.gold += reward; player.matchStats.goldEarnedTotal += reward; player.gainXP(story.xp);
  if (ledger.path === 'help') { player.hp = Math.min(player.maxHp, player.hp + 25); player.mp = Math.min(player.maxMp, player.mp + 15); }
  game.addLog(`${story.name}: ส่งต่อความหวังสำเร็จ · +${reward}G / +${story.xp} XP`, 'gold'); return true;
}

export interface MatchMoment { key: string; day: number; playerId: number; nodeId: number; gold: number; hp: number; level: number; towns: number; kills: number; }
export function recordMatchMoment(game: GameState) {
  const p = game.activePlayer; if (!p) return;
  const key = `${game.dayCounter}:${p.id}`;
  if (game.world.matchHistory.some(moment => moment.key === key)) return;
  game.world.matchHistory.push({ key, day: game.dayCounter, playerId: p.id, nodeId: p.nodeId, gold: p.gold, hp: p.hp, level: p.level, towns: p.townsControlled, kills: p.matchStats.monstersKilled });
  if (game.world.matchHistory.length > 336) game.world.matchHistory.shift();
}
