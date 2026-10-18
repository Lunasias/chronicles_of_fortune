import { syncFeedPanelClass } from '../util/PanelFocus';
import type { GameState } from '../game/GameState';
import type { Player } from '../game/Player';
import { escapeHtml } from '../util/Html';

export interface JourneyChoice { label: string; detail: string; score?: number; run: () => void; }
/** Short decision panels shared by expeditions and weekly drafts. */
export function chooseJourney(player: Player, title: string, description: string, choices: JourneyChoice[]): void {
  if (player.isAI) { [...choices].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0].run(); return; }
  let modal = document.getElementById('journeyDecision');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'journeyDecision';
    modal.className = 'fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
  }
  modal.setAttribute('aria-label', title);
  modal.innerHTML = `<div class="pixel-box p-4 w-full max-w-md"><h2 class="text-sm text-amber-300 font-bold">${escapeHtml(title)}</h2><p class="text-xs text-slate-300 my-3">${escapeHtml(description)}</p><div class="flex flex-col gap-2">${choices.map((c, i) => `<button class="pixel-btn p-3 text-left" data-choice="${i}"><strong class="text-xs">${escapeHtml(c.label)}</strong><span class="block text-xs text-slate-300">${escapeHtml(c.detail)}</span></button>`).join('')}</div></div>`;
  modal.classList.remove('hidden'); syncFeedPanelClass();
  let finished = false;
  modal.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.onclick = () => {
    if (finished) return; finished = true; modal!.classList.add('hidden'); syncFeedPanelClass(); choices[Number(button.dataset.choice)].run();
  });
  modal.querySelector<HTMLButtonElement>('button')?.focus();
}

export function offerWeeklyDraft(game: GameState): void {
  const player = game.activePlayer;
  const memory = game.world.memory(player.id);
  if (game.gameMode !== 'roguelike_draft' || memory.flags.draftedWeek === game.weekCounter) return;
  const pool = [
    { id: 'phoenix_amulet', name: 'ขนนกผู้พิทักษ์', detail: 'Relic คืนชีพ ช่วยรับมือพื้นที่อันตราย', score: player.hp < player.maxHp * 0.5 ? 10 : 4 },
    { id: 'thief_band', name: 'สายรัดจอมโจร', detail: 'ลดค่าผ่านทาง เหมาะกับการเดินผ่านเมืองคู่แข่ง', score: player.aiPersonality === 'economist' ? 9 : 4 },
    { id: 'windstrider_horseshoe', name: 'รองเท้าวายุ', detail: 'ปรับผลทอยลูกเต๋าขั้นต่ำเป็น 3', score: player.aiPersonality === 'hunter' ? 9 : 5 },
    { id: 'aegis_crest', name: 'แหวนพิทักษ์', detail: 'เกราะแสงดูดซับความเสียหาย 25 หน่วยแรก', score: 6 }
  ].filter(relic => !player.relics.includes(relic.id));
  const selected = [];
  while (pool.length && selected.length < 3) selected.push(pool.splice(Math.floor(game.world.random() * pool.length), 1)[0]);
  const finish = (text: string) => { game.phase = 'BOARD_TURN'; memory.flags.draftedWeek = game.weekCounter; game.addLog(player.displayName + ' เลือกพร: ' + text, 'level'); };
  const choices: JourneyChoice[] = selected.map(relic => ({ label: relic.name, detail: relic.detail, score: relic.score, run: () => { player.relics.push(relic.id); finish(relic.name); } }));
  choices.push({ label: 'เสบียงนักเดินทาง', detail: 'รับ 100G ฟื้น HP/MP เต็ม', score: player.hp < player.maxHp * 0.4 ? 12 : 2, run: () => { player.gold += 100; player.hp = player.maxHp; player.mp = player.maxMp; finish('เสบียงนักเดินทาง'); } });
  game.phase = 'TILE_EVENT';
  chooseJourney(player, 'เลือกพรประจำสัปดาห์ ' + game.weekCounter, 'เลือกหนึ่งอย่างสำหรับแผนการเดินทางของคุณ', choices);
}
