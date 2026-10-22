import type { GamepadCallbacks } from '../engine/GamepadController';

/** A top-layer dialog owns every controller button until it closes. */
export function withDialogControls(callbacks: GamepadCallbacks): GamepadCallbacks {
  const result: GamepadCallbacks = {};
  for (const [name, callback] of Object.entries(callbacks)) {
    (result as Record<string, (...args: number[]) => void>)[name] = (...args: number[]) => {
      const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (!dialog) { callback?.(...args); return; }
      if (name === 'onCancel') { dialog.close('cancel'); return; }
      const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(button => !button.hidden && !button.closest('[hidden]'));
      if (name === 'onConfirm') {
        if (document.activeElement instanceof HTMLButtonElement && buttons.includes(document.activeElement)) document.activeElement.click();
      } else if (name.startsWith('onDpad') || name === 'onPrev' || name === 'onNext') {
        const direction = ['onDpadLeft', 'onDpadUp', 'onPrev'].includes(name) ? -1 : 1;
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + direction + buttons.length) % buttons.length]?.focus();
      }
    };
  }
  return result;
}
