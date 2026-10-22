import type { GameState } from '../game/GameState';
import { recordTutorialAction, tutorialHint } from '../game/Tutorial';
export class InteractiveTutorial {
  private panel = document.createElement('aside');
  private target: Element | null = null;
  private signature = '';
  private checkedAt = 0;
  constructor(private game: GameState) {
    this.panel.id = 'interactiveTutorial'; this.panel.hidden = true; this.panel.setAttribute('aria-label', 'ฝึกเล่นสามเทิร์นแรก');
    this.panel.innerHTML = '<div><strong></strong><p></p></div><button type="button" class="pixel-btn" aria-label="ข้ามการฝึกเล่น">✕</button>';
    this.panel.querySelector('button')!.addEventListener('click', () => { const state = this.game.world.tutorial[this.game.activePlayer.id]; if (state) state.enabled = false; this.update(performance.now() + 300, false); });
    document.body.append(this.panel);
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.closest('#btnInspectHero')) recordTutorialAction(this.game, 'stats');
      if (target.closest('[data-nav-pin]')) recordTutorialAction(this.game, 'waypoint');
      if (target.closest('#btnMoveConfirm')) recordTutorialAction(this.game, 'travel');
      if (target.closest('#btnRollDice')) recordTutorialAction(this.game, 'roll');
    });
  }
  update(time: number, visible: boolean) {
    if (time - this.checkedAt < 200) return; this.checkedAt = time;
    const hint = visible ? tutorialHint(this.game) : null;
    this.panel.hidden = !hint;
    let target = hint?.target ? Array.from(document.querySelectorAll(hint.target)).find(element => !element.closest('.hidden, [hidden]') && element.getClientRects().length > 0) ?? null : null;
    if (!target && hint?.target === '#btnFindDestination') target = document.querySelector('#hudSystemMenu summary');
    const signature = `${hint?.text}:${hint?.target}:${target?.id || target?.tagName}`;
    if (signature === this.signature) return; this.signature = signature;
    this.target?.classList.remove('tutorial-target'); this.target = null;
    if (!hint) return;
    const training = this.game.world.tutorial[this.game.activePlayer.id];
    this.panel.querySelector('strong')!.textContent = `ฝึกเล่น · เทิร์น ${training.turns + 1}/3`;
    this.panel.querySelector('p')!.textContent = hint.text;
    this.target = target; this.target?.classList.add('tutorial-target');
  }
}
