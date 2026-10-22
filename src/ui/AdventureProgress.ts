import type { GameState } from '../game/GameState';
import type { BoardNode } from '../game/BoardMap';
import { RULES } from '../game/Rules';

export interface AdventureProgress {
  title: string;
  detail: string;
  value: number;
  maximum: number | null;
  daysRemaining: number | null;
  standings: Array<{ id: number; name: string; worth: number; towns: number; level: number; active: boolean }>;
}

/** The journal follows the same mode goals and tie breaks as match resolution. */
export function adventureProgress(game: GameState): AdventureProgress {
  const player = game.players[game.activePlayerIdx];
  const standings = [...game.players].sort((a, b) =>
    b.getNetWorth(game.allNodes) - a.getNetWorth(game.allNodes)
    || b.matchStats.monstersKilled - a.matchStats.monstersKilled || a.id - b.id
  ).map(p => ({ id: p.id, name: p.displayName, worth: p.getNetWorth(game.allNodes), towns: p.townsControlled, level: p.level, active: p.id === player?.id }));
  let deadline: number | null = RULES.campaignDays;
  let title = 'การแข่งขันแห่งโชคชะตา', detail = game.objective;
  let value = Math.max(0, game.dayCounter - 1), maximum: number | null = deadline;
  if (game.gameMode === 'coop_raid') {
    deadline = game.coopRaidDayLimit;
    title = 'ร่วมมือพิชิตผู้พิทักษ์';
    maximum = game.world.raidTargets.length || 1;
    value = game.world.raidTargets.filter(id => game.world.defeatedBosses.includes(id)).length;
  } else if (game.gameMode === 'endless_spire') {
    deadline = null; maximum = null; value = game.world.spireFloor;
    title = `หอคอยชั้น ${value}`;
    detail = 'เตรียมอุปกรณ์และคบเพลิงก่อนท้าผู้พิทักษ์ชั้นถัดไป';
  } else if (game.gameMode === 'blitz' || game.gameMode === 'roguelike_draft') {
    deadline = game.gameMode === 'blitz' ? game.blitzDayLimit : 28;
    maximum = deadline;
    title = game.gameMode === 'blitz' ? 'การแข่งขันสายฟ้าแลบ' : 'ฤดูกาลดราฟต์';
  } else if (game.winGoal === 'gold') {
    title = 'สะสมเงินให้ถึงเป้าหมาย'; value = player?.gold ?? 0; maximum = RULES.goldGoal;
  } else if (game.winGoal === 'towns') {
    title = 'สร้างอาณาจักรของคุณ'; value = player?.townsControlled ?? 0; maximum = RULES.townGoal;
  } else if (game.winGoal === 'boss') {
    title = 'พิชิตผู้พิทักษ์แห่งหุบเหว'; maximum = 1;
    value = game.world.campaignBossId !== null && game.world.defeatedBosses.includes(game.world.campaignBossId) ? 1 : 0;
  }
  return { title, detail, value: Math.max(0, value), maximum,
    daysRemaining: deadline === null ? null : Math.max(0, deadline - game.dayCounter + 1), standings };
}

/** Graph distance helps planning; it does not promise a legal stop on this roll. */
export function nearbyServices(game: GameState): Array<{ node: BoardNode; distance: number; label: string }> {
  const start = game.players[game.activePlayerIdx]?.nodeId;
  if (start === undefined) return [];
  const nodes = new Map(game.allNodes.map(node => [node.id, node]));
  const queue = [{ id: start, distance: 0 }], visited = new Set([start]);
  const found = new Set<string>();
  const result: Array<{ node: BoardNode; distance: number; label: string }> = [];
  const labels: Record<string, string> = { tavern: 'โรงเตี๊ยม', church: 'โบสถ์', shop_item: 'ร้านไอเทม', shop_weapon: 'ร้านอาวุธ', guild: 'กิลด์' };
  for (let head = 0; head < queue.length && result.length < 4; head++) {
    const step = queue[head], node = nodes.get(step.id);
    if (!node) continue;
    const label = labels[node.type];
    if (label && !found.has(node.type)) { result.push({ node, distance: step.distance, label }); found.add(node.type); }
    for (const id of node.neighbors) if (!visited.has(id) && nodes.has(id)) {
      visited.add(id); queue.push({ id, distance: step.distance + 1 });
    }
  }
  return result;
}

export function adventureNextAction(game: GameState): { title: string; detail: string } {
  const player = game.players[game.activePlayerIdx];
  if (!player) return { title: 'เริ่มตำนานบทใหม่', detail: 'เลือกอาชีพและตั้งค่าปาร์ตี้ แล้วเริ่มการผจญภัย' };
  if (player.isAI) return { title: `เทิร์นของ ${player.displayName}`, detail: 'ระหว่างรอ คุณสามารถดูอันดับ เป้าหมาย และศึกษากฎการต่อสู้ได้' };
  if (game.phase === 'CHOOSING_PATH' || game.phase === 'WAITING_FOR_DESTINATION') return {
    title: `เลือกปลายทาง ${game.remainingMoves} ก้าว`, detail: 'กรองปลายทาง ดูโอกาสปะทะและความเสี่ยง แล้วกดเดินไปที่นี่เพื่อยืนยัน' };
  if (game.phase === 'BATTLE') return { title: 'อ่านจังหวะคู่ต่อสู้', detail: 'โจมตีหนักแพ้สวนกลับ เวทแพ้ป้องกันเวท เลือกคำสั่งตาม MP และเลือดที่เหลือ' };
  if (game.phase === 'BOARD_TURN' && player.hp <= player.maxHp * .35) return {
    title: 'ฟื้นตัวก่อนออกเดินทาง', detail: 'เลือดเหลือน้อย เปิดกระเป๋าเพื่อใช้ยา หรือวางแผนไปโรงเตี๊ยมก่อนท้าพื้นที่อันตราย' };
  if (game.phase === 'MOVING') return { title: 'กำลังเดินทาง', detail: 'เมื่อถึงปลายทางจะเกิดเหตุการณ์ของช่องนั้น แล้วจึงส่งต่อเทิร์น' };
  return { title: 'เตรียมพร้อมแล้วทอยลูกเต๋า', detail: 'ตรวจอุปกรณ์และเป้าหมาย เลือกเส้นทางที่ช่วยให้เข้าใกล้ชัยชนะในเทิร์นนี้' };
}
