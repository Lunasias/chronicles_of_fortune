import { GameState } from '../game/GameState';
import { audio } from '../engine/AudioSynthesizer';
import { darklingSystem } from '../game/DarklingSystem';
import { escapeHtml } from '../util/Html';
import { companionSprites } from '../engine/CompanionSpriteRenderer';

export class WeeklyReportUI {
  private game: GameState;
  private onDismissCallback?: () => void;
  private autoCloseTimeout: number | null = null;
  private countdownInterval: number | null = null;
  private reportDismissed = true;
  private autoCloseDurationMs = 18_000;

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
      this.dismissReport();
    });

    const handleAcceptPact = (spec: 'destroyer' | 'reaper' | 'tormentor' = 'destroyer') => {
      audio.darklingRoar();
      document.getElementById('darklingPactModal')?.classList.add('hidden');
      const sorted = [...this.game.players].sort((a, b) => a.getNetWorth(this.game.allNodes) - b.getNetWorth(this.game.allNodes));
      const trailing = sorted[0]; // Last place
      if (!this.game.allowDarkling || this.game.gameMode === 'coop_raid' || !darklingSystem.canTransform(trailing, this.game.players, this.game.allNodes)) return;
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

  private clearAutoCloseTimers() {
    if (this.autoCloseTimeout !== null) window.clearTimeout(this.autoCloseTimeout);
    if (this.countdownInterval !== null) window.clearInterval(this.countdownInterval);
    this.autoCloseTimeout = null;
    this.countdownInterval = null;
  }

  private dismissReport() {
    if (this.reportDismissed) return;
    this.reportDismissed = true;
    this.clearAutoCloseTimers();
    document.getElementById('weeklyReportModal')?.classList.add('hidden');
    const onDismiss = this.onDismissCallback;
    this.onDismissCallback = undefined;
    onDismiss?.();
  }

  private startAutoCloseCountdown() {
    this.clearAutoCloseTimers();
    const label = document.getElementById('weeklyAutoCloseLabel');
    const secondsLabel = document.getElementById('weeklyAutoCloseSeconds');
    const progress = document.getElementById('weeklyAutoCloseProgress');
    const track = progress?.parentElement;
    const deadline = performance.now() + this.autoCloseDurationMs;
    let lastAnnouncedSeconds = -1;
    const update = () => {
      const remaining = Math.max(0, deadline - performance.now());
      const seconds = Math.ceil(remaining / 1000);
      if (progress) progress.style.transform = `scaleX(${remaining / this.autoCloseDurationMs})`;
      if (seconds !== lastAnnouncedSeconds) {
        if (label) label.textContent = `ไปสัปดาห์ถัดไปอัตโนมัติใน ${seconds} วินาที`;
        if (secondsLabel) secondsLabel.textContent = `${seconds}s`;
        track?.setAttribute('aria-valuenow', String(seconds));
        lastAnnouncedSeconds = seconds;
      }
      if (remaining <= 0) this.dismissReport();
    };
    update();
    this.countdownInterval = window.setInterval(update, 100);
    this.autoCloseTimeout = window.setTimeout(() => this.dismissReport(), this.autoCloseDurationMs);
  }

  open(onDismiss: () => void) {
    this.clearAutoCloseTimers();
    this.reportDismissed = false;
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

    const payRewards = this.game.world.memory(0).flags.reportPaidWeek !== this.game.weekCounter;
    this.game.world.memory(0).flags.reportPaidWeek = this.game.weekCounter;
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
      if (isFirst && payRewards) {
        p.gold += 150; p.matchStats.goldEarnedTotal += 150;
      }

      // Trailing players receive a modest recovery grant; Darkling remains a gate decision.
      if (isLast && !isFirst && payRewards) { p.gold += 100; p.matchStats.goldEarnedTotal += 100; }

    });

    // Give players enough time to read the standings; longer rosters get a little more time.
    this.autoCloseDurationMs = Math.min(30_000, Math.max(15_000, 8_000 + this.game.players.length * 2_500));
    const countdownTrack = document.querySelector<HTMLElement>('#weeklyAutoClose .weekly-auto-close-track');
    if (countdownTrack) countdownTrack.setAttribute('aria-valuemax', String(Math.ceil(this.autoCloseDurationMs / 1000)));
    modal.classList.remove('hidden');
    this.startAutoCloseCountdown();
  }
}
