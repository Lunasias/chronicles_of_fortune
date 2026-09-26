import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { BoardNode } from '../game/BoardMap';
import { fantasyEventManager, FantasyEventData } from '../game/FantasyEventManager';
import { audio } from '../engine/AudioSynthesizer';

export class FantasyEventUI {
  private game: GameState;

  constructor(game: GameState) {
    this.game = game;
  }

  openEvent(player: Player, node: BoardNode, onFinished: () => void) {
    const modal = document.getElementById('fantasyEventModal');
    if (!modal) {
      onFinished();
      return;
    }

    const event = fantasyEventManager.getRandomEvent(node);

    // Setup modal header
    const titleEl = document.getElementById('feModalTitle');
    const subtitleEl = document.getElementById('feModalSubtitle');
    const badgeEl = document.getElementById('feModalBadge');
    const descEl = document.getElementById('feModalDesc');
    const iconEl = document.getElementById('feModalIcon');

    if (titleEl) titleEl.innerText = event.title;
    if (subtitleEl) subtitleEl.innerText = event.subtitle;
    if (badgeEl) {
      badgeEl.innerText = event.badge;
      badgeEl.style.borderColor = event.bannerColor;
      badgeEl.style.color = event.bannerColor;
    }
    if (descEl) descEl.innerText = event.description;
    if (iconEl) iconEl.innerText = event.icon;

    // View panels
    const choicesContainer = document.getElementById('feChoicesContainer')!;
    const outcomeContainer = document.getElementById('feOutcomeContainer')!;
    choicesContainer.classList.remove('hidden');
    outcomeContainer.classList.add('hidden');

    // Render 3 choices
    choicesContainer.innerHTML = event.choices.map((choice, idx) => `
      <button class="fe-choice-btn pixel-btn p-3 bg-slate-900/90 border border-slate-700 hover:border-amber-400 flex items-center gap-3 text-left group" data-choice-idx="${idx}">
        <span class="text-2xl">${choice.icon}</span>
        <div class="flex-1">
          <div class="text-xs font-bold text-amber-300 group-hover:text-amber-200">${choice.text}</div>
          <div class="text-[10px] text-slate-400 group-hover:text-slate-300">${choice.subtext}</div>
        </div>
        <span class="text-xs text-amber-500 font-bold opacity-0 group-hover:opacity-100">➔</span>
      </button>
    `).join('');

    const handleChoiceSelection = (choiceIdx: number) => {
      const selectedChoice = event.choices[choiceIdx];
      if (!selectedChoice) return;

      const outcome = selectedChoice.resolve(player, node);

      // Play audio based on outcome
      if (outcome.soundType === 'fanfare') audio.fanfare();
      else if (outcome.soundType === 'coin') audio.coin();
      else if (outcome.soundType === 'level') audio.levelUp();
      else if (outcome.soundType === 'hurt') audio.hurt();
      else if (outcome.soundType === 'magic') audio.click();

      // Show outcome panel
      choicesContainer.classList.add('hidden');
      outcomeContainer.classList.remove('hidden');

      const outcomeTitleEl = document.getElementById('feOutcomeTitle')!;
      const outcomeTextEl = document.getElementById('feOutcomeText')!;
      const outcomeIconEl = document.getElementById('feOutcomeIcon')!;

      outcomeTitleEl.innerText = outcome.outcomeTitle;
      outcomeTextEl.innerText = outcome.outcomeText;
      outcomeIconEl.innerText = outcome.icon;

      this.game.addLog(`✨ [อีเวนต์แฟนตาซี: ${event.title}] ${outcome.outcomeTitle} - ${outcome.outcomeText}`, 'level');

      // Dismiss Button
      const btnDismiss = document.getElementById('btnFeDismiss')!;
      btnDismiss.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        onFinished();
      };
    };

    choicesContainer.querySelectorAll('.fe-choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-choice-idx') || '0', 10);
        handleChoiceSelection(idx);
      });
    });

    modal.classList.remove('hidden');

    // Bot AI choice
    if (player.isAI) {
      setTimeout(() => {
        // AI chooses choice 0 or 1 with higher probability
        const aiIdx = Math.random() > 0.3 ? 0 : (Math.random() > 0.5 ? 1 : 2);
        handleChoiceSelection(aiIdx);
        setTimeout(() => {
          document.getElementById('btnFeDismiss')?.click();
        }, 1500);
      }, 1000);
    }
  }
}
