import type { GameState, GameModeType } from '../game/GameState';

export const CAMPAIGN_PRESETS: ReadonlyArray<{ id: string; name: string; subtitle: string; description: string; mode: GameModeType; players: number; difficulty: 'casual' | 'tactical' | 'ruthless'; darkling: boolean }> = [
  { id: 'first_steps', name: 'การผจญภัยครั้งแรก', subtitle: '42 วัน · 1 คน + AI 1', description: 'คู่แข่งผ่อนคลาย เรียนรู้เส้นทาง สะสมอุปกรณ์ และรับราชภารกิจ', mode: 'standard', players: 2, difficulty: 'casual', darkling: false },
  { id: 'crown_rivals', name: 'ศึกชิงอาณาจักร', subtitle: '42 วัน · 4 นักผจญภัย', description: 'ชิงเมือง อ่านใจคู่แข่ง และเปลี่ยนชะตาด้วยพลังจอมมาร', mode: 'standard', players: 4, difficulty: 'tactical', darkling: true },
  { id: 'twenty_days', name: 'เทศกาลยี่สิบวัน', subtitle: '20 วัน · จังหวะกระชับ', description: 'ตัดสินใจให้คุ้มทุกเทิร์น แข่งสร้างทรัพย์สินก่อนหมดฤดูกาล', mode: 'blitz', players: 2, difficulty: 'tactical', darkling: false },
  { id: 'guardian_alliance', name: 'พันธมิตรผู้พิทักษ์', subtitle: '30 วัน · ร่วมมือปราบ 3 บอส', description: 'แบ่งหน้าที่ เตรียมเสบียง และพิชิตผู้พิทักษ์ด้วยกัน', mode: 'coop_raid', players: 2, difficulty: 'tactical', darkling: false },
  { id: 'spire', name: 'ตำนานไร้สิ้นสุด', subtitle: 'ไม่จำกัดวัน · บอสแข็งแกร่งขึ้น', description: 'วางแผนการเติบโตระยะยาว ท้าทายผู้พิทักษ์ชั้นแล้วชั้นเล่า', mode: 'endless_spire', players: 2, difficulty: 'tactical', darkling: true },
];

/** Presets configure the existing game controls, so setup and match rules cannot diverge. */
export function installCampaignLauncher(game: GameState) {
  const panel = document.getElementById('playerSetupBlock'), roster = document.getElementById('playerSetupRoster');
  if (!panel || !roster) return;
  const mount = document.createElement('section'); mount.id = 'campaignLauncher'; mount.setAttribute('aria-label', 'เลือกแนวการผจญภัย');
  mount.innerHTML = `<div class="campaign-launcher-heading"><h3>เลือกเรื่องราวของคุณ</h3><p>เปลี่ยนผู้เล่น อาชีพ และกฎเพิ่มเติมได้ทุกแบบ</p></div><div class="campaign-preset-grid">${CAMPAIGN_PRESETS.map(preset => `<button type="button" class="campaign-preset" data-campaign-preset="${preset.id}" aria-pressed="false"><strong>${preset.name}</strong><span>${preset.subtitle}</span><p>${preset.description}</p></button>`).join('')}</div><p id="campaignSetupSummary" class="campaign-setup-summary" role="status" aria-live="polite"></p>`;
  roster.before(mount);
  const advanced = document.createElement('details'); advanced.className = 'campaign-advanced';
  advanced.innerHTML = '<summary>ปรับเป้าหมาย ระดับ AI และกฎเพิ่มเติม</summary><div class="campaign-advanced-fields"></div>';
  let row = roster.nextElementSibling;
  const actions = document.getElementById('btnBeginGame')?.parentElement;
  while (row && row !== actions && !row.contains(document.getElementById('btnBeginGame'))) {
    const next = row.nextElementSibling; advanced.lastElementChild!.append(row); row = next;
  }
  roster.after(advanced);
  actions?.classList.add('campaign-start-actions');
  const summary = () => {
    const cards = Array.from(document.querySelectorAll('#playerSetupRoster .player-setup-card'));
    const bots = cards.filter(card => card.querySelector<HTMLInputElement>('.is-ai-check')?.checked).length;
    const humans = cards.length - bots;
    const mode = game.gameMode, names: Record<string, string> = { standard: 'แคมเปญ 42 วัน', blitz: 'แข่งขัน 20 วัน', coop_raid: 'ร่วมมือปราบผู้พิทักษ์', endless_spire: 'หอคอยไร้สิ้นสุด', roguelike_draft: 'ฤดูกาลดราฟต์ 28 วัน' };
    const difficulty = (document.getElementById('selectAIDifficulty') as HTMLSelectElement).value;
    mount.querySelector('#campaignSetupSummary')!.textContent = `${names[mode]} · ผู้เล่น ${humans} คน + AI ${bots} · ${difficulty === 'casual' ? 'AI ผ่อนคลาย' : difficulty === 'ruthless' ? 'AI เหี้ยมโหด' : 'AI สมดุล'}`;
    const darkling = (document.getElementById('checkAllowDarkling') as HTMLInputElement).checked;
    for (const button of mount.querySelectorAll<HTMLButtonElement>('[data-campaign-preset]')) {
      const preset = CAMPAIGN_PRESETS.find(p => p.id === button.dataset.campaignPreset)!;
      button.setAttribute('aria-pressed', String(preset.mode === mode && preset.players === cards.length && preset.difficulty === difficulty && preset.darkling === darkling));
    }
  };
  const apply = (id: string) => {
    const preset = CAMPAIGN_PRESETS.find(p => p.id === id); if (!preset) return;
    panel.querySelector<HTMLButtonElement>(`.player-count-btn[data-count="${preset.players}"]`)?.click();
    panel.querySelector<HTMLButtonElement>(`.game-mode-btn[data-mode="${preset.mode}"]`)?.click();
    const difficulty = document.getElementById('selectAIDifficulty') as HTMLSelectElement;
    difficulty.value = preset.difficulty;
    const darkling = document.getElementById('checkAllowDarkling') as HTMLInputElement;
    darkling.checked = preset.darkling; darkling.dispatchEvent(new Event('change', { bubbles: true }));
    (document.getElementById('selectWinGoal') as HTMLSelectElement).value = 'networth';
    summary();
  };
  mount.addEventListener('click', event => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-campaign-preset]'); if (button) apply(button.dataset.campaignPreset!); });
  panel.addEventListener('change', summary);
  panel.addEventListener('click', event => { if ((event.target as HTMLElement).closest('.player-count-btn, .game-mode-btn')) queueMicrotask(summary); });
  apply('first_steps');
}
