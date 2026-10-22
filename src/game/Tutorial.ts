import type { GameState } from './GameState';
export interface TutorialState { enabled: boolean; turns: number; actions: string[]; }
export function recordTutorialAction(game: GameState, action: string) {
  const p = game.activePlayer, state = p && game.world.tutorial[p.id];
  if (state?.enabled && state.turns < 3 && !state.actions.includes(action)) state.actions.push(action);
}
export function tutorialHint(game: GameState): { text: string; target: string } | null {
  const p = game.activePlayer, state = p && game.world.tutorial[p.id];
  if (!state?.enabled || state.turns >= 3 || p.isAI) return null;
  if (game.phase === 'BATTLE') return { text: 'เลือกโจมตีเมื่อบุก และป้องกันเมื่อรับ ดูค่า HP ที่คาดว่าจะเสียก่อนเลือก', target: '#btnCmdAttack:not(:disabled), #btnCmdDefend:not(:disabled)' };
  if (game.phase === 'CHOOSING_PATH') return { text: 'กดถัดไปเพื่อดูทางกับความเสี่ยง แล้วกดยืนยันเมื่อพร้อม', target: '#btnMoveNext' };
  if (game.phase !== 'BOARD_TURN') return { text: 'อ่านผลของช่องนี้ เลือกบริการหรือเหตุการณ์ให้เหมาะกับ HP และทอง', target: '' };
  if (state.turns === 1 && !state.actions.includes('stats')) return { text: 'เทิร์นที่ 2: เปิดสถานะเพื่อดูจุดแข็งของอาชีพ แล้วกลับมาทอยเต๋า', target: '#btnInspectHero' };
  if (state.turns === 2 && !state.actions.includes('waypoint')) return { text: 'เทิร์นที่ 3: เปิดค้นหาจุดหมาย ปักหมุดบริการ แล้ววางแผนจากผลเต๋าจริง', target: '#btnFindDestination' };
  return { text: state.turns === 0 ? 'เทิร์นที่ 1: ทอยเต๋าเพื่อเปิดปลายทางที่เดินได้จริง' : 'เตรียมพร้อมแล้ว ทอยเต๋าและเลือกเส้นทางด้วยตัวเอง', target: '#btnRollDice' };
}
