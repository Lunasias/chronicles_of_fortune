export interface DialogOptions {
  title: string; message: string; kind?: 'message' | 'confirm' | 'text' | 'code';
  value?: string; confirmLabel?: string; destructive?: boolean;
}

/** Queued, accessible in-game dialogs. User-entered save codes never become HTML. */
class GameDialogs {
  private queue = Promise.resolve();

  request(options: DialogOptions): Promise<string | null> {
    const task = this.queue.then(() => this.present(options));
    this.queue = task.then(() => undefined, () => undefined);
    return task;
  }

  message(title: string, message: string) { return this.request({ title, message }); }
  async confirm(title: string, message: string, destructive = false) {
    return await this.request({ title, message, kind: 'confirm', destructive, confirmLabel: destructive ? 'ลบข้อมูลช่องนี้' : 'ยืนยัน' }) !== null;
  }
  text(title: string, message: string) { return this.request({ title, message, kind: 'text', confirmLabel: 'นำเข้าข้อมูล' }); }
  code(title: string, message: string, value: string) { return this.request({ title, message, value, kind: 'code' }); }

  private present(options: DialogOptions): Promise<string | null> {
    return new Promise(resolve => {
      const previous = document.activeElement as HTMLElement | null;
      const dialog = document.createElement('dialog');
      dialog.className = 'game-dialog'; dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'gameDialogTitle');
      dialog.innerHTML = `<form method="dialog"><header><span class="adventure-eyebrow">CHRONICLES OF FORTUNE</span><h2 id="gameDialogTitle"></h2></header><p class="game-dialog-message"></p><label class="game-dialog-field" hidden><span>รหัสบันทึกความคืบหน้า</span><textarea spellcheck="false" rows="6" aria-label="รหัสบันทึกความคืบหน้า"></textarea></label><p class="game-dialog-status" role="status" aria-live="polite"></p><footer><button type="button" class="pixel-btn" data-dialog-cancel>ยกเลิก</button><button type="button" class="pixel-btn" data-dialog-copy hidden>คัดลอกรหัส</button><button type="submit" class="pixel-btn pixel-btn-gold" data-dialog-confirm></button></footer></form>`;
      dialog.querySelector('h2')!.textContent = options.title;
      dialog.querySelector('.game-dialog-message')!.textContent = options.message;
      const input = dialog.querySelector('textarea')!, field = dialog.querySelector<HTMLElement>('.game-dialog-field')!;
      const status = dialog.querySelector<HTMLElement>('.game-dialog-status')!;
      const cancel = dialog.querySelector<HTMLButtonElement>('[data-dialog-cancel]')!;
      const confirm = dialog.querySelector<HTMLButtonElement>('[data-dialog-confirm]')!;
      const copy = dialog.querySelector<HTMLButtonElement>('[data-dialog-copy]')!;
      const kind = options.kind || 'message';
      cancel.hidden = kind === 'message' || kind === 'code';
      confirm.textContent = options.confirmLabel || 'เข้าใจแล้ว';
      if (options.destructive) confirm.dataset.danger = 'true';
      field.hidden = !['text', 'code'].includes(kind);
      input.value = options.value || ''; input.readOnly = kind === 'code';
      copy.hidden = kind !== 'code';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(input.value); status.textContent = 'คัดลอกรหัสเรียบร้อยแล้ว'; }
        catch { input.focus(); input.select(); status.textContent = 'เลือกรหัสไว้แล้ว ใช้คำสั่งคัดลอกของอุปกรณ์เพื่อเก็บรหัส'; }
      });
      let accepted = false;
      dialog.querySelector('form')!.addEventListener('submit', event => {
        event.preventDefault();
        if (kind === 'text' && !input.value.trim()) { status.textContent = 'วางรหัสบันทึกก่อนนำเข้า'; input.focus(); return; }
        accepted = true; dialog.close('confirm');
      });
      cancel.addEventListener('click', () => dialog.close('cancel'));
      dialog.addEventListener('keydown', event => { event.stopPropagation(); });
      dialog.addEventListener('close', () => {
        dialog.hidden = true; dialog.remove();
        const menu = previous?.closest('details');
        if (menu && !menu.open) menu.querySelector('summary')?.focus();
        else if (previous?.isConnected) previous.focus();
        resolve(accepted ? kind === 'text' ? input.value.trim() : 'ok' : null);
      }, { once: true });
      document.body.append(dialog); dialog.showModal();
      if (kind === 'text') input.focus(); else confirm.focus();
    });
  }
}
export const gameDialogs = new GameDialogs();
