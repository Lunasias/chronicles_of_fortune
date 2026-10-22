import type { GameState } from './GameState';
import type { Player } from './Player';

export interface RoyalContractLedger {
  completed: string[];
  bossVictories?: number;
  active: { id: string; baseline: number; startedDay: number } | null;
}
export interface RoyalContract {
  id: string; name: string; description: string; metric: 'monsters' | 'income' | 'towns' | 'bosses' | 'duels';
  target: number; minimumLevel: number; gold: number; xp: number;
}
export const ROYAL_CONTRACTS: readonly RoyalContract[] = [
  { id: 'road_warden', name: 'ผู้พิทักษ์เส้นทาง', description: 'ชนะมอนสเตอร์ 3 ศึกหลังรับภารกิจ', metric: 'monsters', target: 3, minimumLevel: 1, gold: 180, xp: 60 },
  { id: 'town_liberator', name: 'แสงแรกของเมืองอิสระ', description: 'ยึดครองเมืองเพิ่ม 1 แห่งหลังรับภารกิจ', metric: 'towns', target: 1, minimumLevel: 2, gold: 220, xp: 100 },
  { id: 'trade_patron', name: 'เส้นทางการค้าที่รุ่งเรือง', description: 'ทำรายได้สะสมเพิ่ม 1,000G หลังรับภารกิจ', metric: 'income', target: 1000, minimumLevel: 2, gold: 200, xp: 80 },
  { id: 'duel_champion', name: 'เกียรติแห่งลานประลอง', description: 'ชนะคู่แข่งในการดวล PvP 1 ครั้งหลังรับภารกิจ', metric: 'duels', target: 1, minimumLevel: 3, gold: 250, xp: 100 },
  { id: 'guardian_slayer', name: 'ตำนานผู้พิชิตผู้พิทักษ์', description: 'เป็นผู้ปราบผู้พิทักษ์ 1 ตนหลังรับภารกิจ', metric: 'bosses', target: 1, minimumLevel: 4, gold: 400, xp: 150 },
];

function metric(game: GameState, player: Player, kind: RoyalContract['metric']): number {
  if (kind === 'bosses') return game.world.royalContracts?.[player.id]?.bossVictories ?? 0;
  const key = ({ monsters: 'monstersKilled', income: 'goldEarnedTotal', towns: 'townsCapturedTotal', duels: 'pvpWins' } as const)[kind];
  return Math.max(0, player.matchStats[key] || 0);
}
export function royalContractViews(game: GameState, player: Player) {
  const ledger = game.world.royalContracts?.[player.id];
  return ROYAL_CONTRACTS.map(contract => {
    const active = ledger?.active?.id === contract.id;
    const progress = active ? Math.max(0, metric(game, player, contract.metric) - ledger!.active!.baseline) : 0;
    const completed = !!ledger?.completed.includes(contract.id);
    const locked = player.level < contract.minimumLevel || contract.metric === 'duels' && (game.gameMode === 'coop_raid' || game.players.length < 2);
    return { ...contract, progress: Math.min(contract.target, progress), active, completed, locked, ready: active && progress >= contract.target };
  });
}
export type ContractResult = { success: boolean; error?: string; gold?: number; xp?: number; leveledUp?: boolean };
export function recordRoyalBossVictory(game: GameState, player: Player) {
  const ledger = game.world.royalContracts[player.id];
  if (ledger) ledger.bossVictories = (ledger.bossVictories ?? 0) + 1;
}
function canManage(game: GameState, player: Player) {
  return game.phase === 'BOARD_TURN' && game.activePlayer?.id === player.id && !game.world.result;
}
export function startRoyalContract(game: GameState, player: Player, id: string): ContractResult {
  if (!canManage(game, player)) return { success: false, error: 'รับภารกิจได้เมื่อเริ่มเทิร์นของตัวเอง ก่อนทอยลูกเต๋า' };
  const view = royalContractViews(game, player).find(contract => contract.id === id);
  if (!view || view.locked || view.completed) return { success: false, error: 'ยังรับภารกิจนี้ไม่ได้ หรือส่งภารกิจแล้ว' };
  if (game.world.royalContracts[player.id]?.active) return { success: false, error: 'ทำภารกิจปัจจุบันให้เสร็จ หรือยกเลิกก่อนรับภารกิจใหม่' };
  const ledger = game.world.royalContracts[player.id] ??= { active: null, completed: [] };
  ledger.active = { id, baseline: metric(game, player, view.metric), startedDay: game.dayCounter };
  return { success: true };
}
export function abandonRoyalContract(game: GameState, player: Player): ContractResult {
  if (!canManage(game, player)) return { success: false, error: 'เปลี่ยนภารกิจได้เมื่อเริ่มเทิร์นของตัวเอง' };
  const ledger = game.world.royalContracts[player.id];
  if (ledger) ledger.active = null;
  return { success: true };
}
export function claimRoyalContract(game: GameState, player: Player): ContractResult {
  if (!canManage(game, player)) return { success: false, error: 'รับรางวัลได้เมื่อเริ่มเทิร์นของตัวเอง' };
  const view = royalContractViews(game, player).find(contract => contract.ready && !contract.completed);
  if (!view) return { success: false, error: 'เงื่อนไขภารกิจยังไม่ครบ หรือรับรางวัลไปแล้ว' };
  const ledger = game.world.royalContracts[player.id];
  ledger.completed.push(view.id); ledger.active = null;
  player.gold += view.gold; player.matchStats.goldEarnedTotal += view.gold;
  const leveledUp = player.gainXP(view.xp);
  game.checkWinConditions();
  return { success: true, gold: view.gold, xp: view.xp, leveledUp };
}

/** Additive v2 save field: missing means an older campaign with no contracts. */
export function validRoyalContractState(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(ledger => {
    if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) return false;
    const row = ledger as RoyalContractLedger;
    if (row.bossVictories !== undefined && (!Number.isInteger(row.bossVictories) || row.bossVictories < 0)) return false;
    if (!Array.isArray(row.completed) || new Set(row.completed).size !== row.completed.length || row.completed.some(id => !ROYAL_CONTRACTS.some(c => c.id === id))) return false;
    return row.active === null || !!row.active && typeof row.active === 'object' && ROYAL_CONTRACTS.some(c => c.id === row.active!.id)
      && !row.completed.includes(row.active.id) && Number.isFinite(row.active.baseline) && row.active.baseline >= 0
      && Number.isInteger(row.active.startedDay) && row.active.startedDay >= 1;
  });
}
