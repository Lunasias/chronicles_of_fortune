import { GameState } from '../game/GameState';
import { audio } from '../engine/AudioSynthesizer';
import { darklingSystem } from '../game/DarklingSystem';
import { escapeHtml } from '../util/Html';
import { companionSprites } from '../engine/CompanionSpriteRenderer';

export class WeeklyReportUI {
  private game: GameState;
  private onDismissCallback?: () => void;

  constructor(game: GameState) {
    this.game = game;
    this.bindButtons();
    window.addEventListener('companion-assets-loaded', () => {
      if (!document.getElementById('weeklyReportModal')?.classList.contains('hidden')) this.paintKing();
    });
  }

  private paintKing() {
    const canvas = document.getElementById('weeklyKingPortrait') as HTMLCanvasElement | null;
    const sprite = companionSprites.getHostSprite('king');
    const ctx = canvas?.getContext('2d');
    if (ctx && sprite) { ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 64, 64); ctx.drawImage(sprite, 0, 0); }
  }

  private bindButtons() {
    document.getElementById('btnDismissWeeklyReport')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('weeklyReportModal')?.classList.add('hidden');
      if (this.onDismissCallback) {
        this.onDismissCallback();
      }
    });

    const handleAcceptPact = (spec: 'destroyer' | 'reaper' | 'tormentor' = 'destroyer') => {
      audio.darklingRoar();
      document.getElementById('darklingPactModal')?.classList.add('hidden');
      const sorted = [...this.game.players].sort((a, b) => a.getNetWorth(this.game.allNodes) - b.getNetWorth(this.game.allNodes));
      const trailing = sorted[0]; // Last place
      darklingSystem.acceptPact(trailing, this.game.allNodes, spec);
      this.game.addLog(`😈 APOCALYPSE! ${trailing.displayName} สละวิญญาณทำสัญญาเป็น THE DARKLING (${spec.toUpperCase()})!`, 'darkling');
    };

    document.getElementById('btnAcceptDarklingDestroyer')?.addEventListener('click', () => handleAcceptPact('destroyer'));
    document.getElementById('btnAcceptDarklingReaper')?.addEventListener('click', () => handleAcceptPact('reaper'));
    document.getElementById('btnAcceptDarklingTormentor')?.addEventListener('click', () => handleAcceptPact('tormentor'));
    document.getElementById('btnAcceptDarkling')?.addEventListener('click', () => handleAcceptPact('destroyer'));

    document.getElementById('btnRejectDarkling')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('darklingPactModal')?.classList.add('hidden');
    });
  }

  open(onDismiss: () => void) {
    this.onDismissCallback = onDismiss;
    audio.fanfare();

    const modal = document.getElementById('weeklyReportModal')!;
    this.paintKing();
    document.getElementById('weeklyWeekTitle')!.innerText = `End of Week ${this.game.weekCounter} Royal Ceremony`;

    // Sort players by Net Worth
    const sorted = [...this.game.players].sort(
      (a, b) => b.getNetWorth(this.game.allNodes) - a.getNetWorth(this.game.allNodes)
    );

    const table = document.getElementById('weeklyRankingsTable')!;
    table.innerHTML = '';

    sorted.forEach((p, idx) => {
      const netWorth = p.getNetWorth(this.game.allNodes);
      const isFirst = idx === 0;
      const isLast = idx === sorted.length - 1;

      const row = document.createElement('div');
      row.className = `p-2 border flex items-center justify-between ${ isFirst ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-300' }`;

      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm">${isFirst ? '👑 1st' : `${idx + 1}th`}</span>
          <span class="font-bold" style="color: ${p.color}">${escapeHtml(p.displayName)} (${escapeHtml(p.className)})</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span>🪙 ${p.gold}G</span>
          <span>🚩 ${p.townsControlled} Towns</span>
          <strong class="text-emerald-400">💎 ${netWorth}G Net</strong>
        </div>
      `;

      table.appendChild(row);

      // Reward 1st place with royal stipend
      if (isFirst) {
        p.gold += 150;
      }

      // Check if last place gets offered Darkling Contract!
      if (isLast && sorted.length >= 2 && !p.isDarkling) {
        const gap = sorted[0].getNetWorth(this.game.allNodes) - netWorth;
        if (gap >= 250) {
          const speed = this.game.gameSpeed || 1;
          setTimeout(() => {
            document.getElementById('darklingPactModal')?.classList.remove('hidden');
            if (p.isAI) {
              setTimeout(() => {
                document.getElementById('btnAcceptDarkling')?.click();
              }, Math.max(150, Math.round(1200 / speed)));
            }
          }, Math.max(150, Math.round(1500 / speed)));
        }
      }
    });

    modal.classList.remove('hidden');
  }
}
