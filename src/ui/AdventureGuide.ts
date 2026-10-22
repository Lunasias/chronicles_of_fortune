import type { GameState } from '../game/GameState';
import type { BoardNode } from '../game/BoardMap';
import { escapeHtml } from '../util/Html';
import { adventureNextAction, adventureProgress, nearbyServices } from './AdventureProgress';

type GuideTab = 'journey' | 'combat' | 'controls';

/** A live campaign journal, plus help that can be opened without leaving play. */
export class AdventureGuide {
  private modal = document.createElement('section');
  private coach = document.createElement('aside');
  private content: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private tab: GuideTab = 'journey';
  private dismissed = false;
  private refreshedAt = 0;

  constructor(private game: GameState, private onFocus: (node: BoardNode) => void) {
    try { this.dismissed = localStorage.getItem('fortuna_guide_v1') === 'dismissed'; } catch { /* Help still works without storage. */ }
    this.modal.id = 'adventureGuideModal';
    this.modal.hidden = true;
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'adventureGuideTitle');
    this.modal.innerHTML = `<div class="adventure-guide-dialog pixel-box-gold">
      <header class="adventure-guide-header"><div><span class="adventure-eyebrow">THE ADVENTURER'S JOURNAL</span><h2 id="adventureGuideTitle">สมุดนักผจญภัย</h2></div><button type="button" id="btnCloseAdventureGuide" class="pixel-btn" aria-label="ปิดสมุดนักผจญภัย">✕ ปิด</button></header>
      <nav class="adventure-guide-tabs" aria-label="หมวดคู่มือ"><button type="button" class="pixel-btn" data-guide-tab="journey">การเดินทาง</button><button type="button" class="pixel-btn" data-guide-tab="combat">การต่อสู้</button><button type="button" class="pixel-btn" data-guide-tab="controls">วิธีควบคุม</button></nav>
      <div class="adventure-guide-content" id="adventureGuideContent"></div>
    </div>`;
    this.content = this.modal.querySelector('#adventureGuideContent')!;
    this.modal.querySelector('#btnCloseAdventureGuide')!.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target === this.modal) { this.close(); return; }
      const tab = target.closest<HTMLButtonElement>('[data-guide-tab]');
      if (tab) { this.tab = tab.dataset.guideTab as GuideTab; this.render(); return; }
      const service = target.closest<HTMLButtonElement>('[data-guide-node]');
      if (service) {
        const node = this.game.allNodes.find(n => n.id === Number(service.dataset.guideNode));
        if (node) { this.close(); this.onFocus(node); }
      }
    });
    this.modal.addEventListener('keydown', event => {
      // Modal keys must never also roll dice or issue a battle command underneath.
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(this.modal.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    this.coach.id = 'adventureCoach';
    this.coach.hidden = true;
    this.coach.setAttribute('aria-label', 'คำแนะนำเริ่มต้น');
    this.coach.innerHTML = `<div><strong>ตำนานของคุณเริ่มที่นี่</strong><p>ทอยเต๋า → เปรียบเทียบปลายทาง → ยืนยันเดิน</p></div><button type="button" class="pixel-btn" data-open-guide>ดูคู่มือ</button><button type="button" class="adventure-coach-close" aria-label="ซ่อนคำแนะนำเริ่มต้น">✕</button>`;
    this.coach.querySelector('[data-open-guide]')!.addEventListener('click', () => this.open());
    this.coach.querySelector('.adventure-coach-close')!.addEventListener('click', () => {
      this.dismissed = true; this.coach.hidden = true;
      try { localStorage.setItem('fortuna_guide_v1', 'dismissed'); } catch { /* Session dismissal is enough. */ }
    });
    document.body.append(this.modal, this.coach);
    document.getElementById('btnAdventureGuide')?.addEventListener('click', () => this.open());
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.key !== '?' || event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (this.modal.hidden && Array.from(document.querySelectorAll('[role="dialog"]')).some(panel => !panel.closest('.hidden, [hidden]'))) return;
      event.preventDefault(); this.modal.hidden ? this.open() : this.close();
    });
  }

  open() {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.modal.hidden = false; this.coach.hidden = true;
    document.body.classList.add('adventure-guide-open');
    this.render();
    this.modal.querySelector<HTMLButtonElement>('#btnCloseAdventureGuide')?.focus();
  }

  close() {
    this.modal.hidden = true; document.body.classList.remove('adventure-guide-open');
    if (this.previousFocus?.isConnected) {
      const menu = this.previousFocus.closest('details');
      if (menu && !menu.open) menu.querySelector('summary')?.focus();
      else this.previousFocus.focus();
    }
  }

  get isOpen() { return !this.modal.hidden; }

  moveFocus(direction: number) {
    const buttons = Array.from(this.modal.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + direction + buttons.length) % buttons.length].focus();
  }

  update(time: number, showCoach: boolean) {
    if (time - this.refreshedAt < 300) return;
    this.refreshedAt = time;
    const blocking = Array.from(document.querySelectorAll('[role="dialog"]')).some(panel => !panel.closest('.hidden, [hidden]'));
    this.coach.hidden = this.dismissed || !showCoach || blocking || this.game.dayCounter > 2 || this.game.phase !== 'BOARD_TURN' || !!this.game.activePlayer?.isAI;
  }

  private render() {
    for (const button of this.modal.querySelectorAll<HTMLButtonElement>('[data-guide-tab]')) button.setAttribute('aria-pressed', String(button.dataset.guideTab === this.tab));
    if (this.tab === 'combat') {
      this.content.innerHTML = `<section class="adventure-guide-intro"><h3>ทุกคำสั่งมีจังหวะได้เปรียบ</h3><p>อ่านเลือด MP และอุปกรณ์ของทั้งสองฝ่ายก่อนตัดสินใจ คำเตือนในหน้าส่องศัตรูคำนวณจากตัวละครและสภาพพื้นที่ปัจจุบัน</p></section>
        <div class="adventure-combat-grid"><article><h4>โจมตีธรรมดา</h4><p>คำสั่งพื้นฐานเมื่ออยากเก็บ MP ฝ่ายรับใช้ป้องกันเพื่อลดความเสียหายได้</p></article><article><h4>โจมตีหนัก ↔ สวนกลับ</h4><p>โจมตีหนักทะลวงการป้องกัน แต่ถ้าคู่ต่อสู้สวนกลับ คุณจะเป็นฝ่ายเสียเปรียบ</p></article><article><h4>เวทมนตร์ ↔ ป้องกันเวท</h4><p>ตรวจค่า MP และธาตุที่ศัตรูแพ้ ป้องกันเวทช่วยรับมือการโจมตีด้วยเวท</p></article><article><h4>สกิลและคู่หู</h4><p>สกิลอาชีพและการเรียกคู่หูมีข้อจำกัดต่อการต่อสู้ เก็บไว้ใช้ในจังหวะที่เปลี่ยนผลการดวลได้</p></article></div>
        <section class="adventure-guide-intro"><h3>เตรียมตัวก่อนเสี่ยง</h3><p>ยาฟื้นพลัง อาวุธ และเกราะช่วยให้ผ่านภูมิภาคที่ยากขึ้น ศัตรูในภูมิภาคเดิมไม่เพิ่มพลังตามอุปกรณ์ของคุณ ใช้พื้นที่คุ้นเคยสร้างความพร้อมก่อนท้าบอส</p></section>`;
    } else if (this.tab === 'controls') {
      this.content.innerHTML = `<section class="adventure-guide-intro"><h3>เล่นได้ด้วยเมาส์ สัมผัส คีย์บอร์ด และจอย</h3><p>เลือกปลายทางเพื่อดูรายละเอียดก่อน แล้วใช้ปุ่มเดินไปที่นี่เพื่อยืนยัน</p></section><dl class="adventure-control-list"><dt>Space</dt><dd>ทอยลูกเต๋าเมื่อถึงเทิร์นและไม่มีหน้าต่างอื่นเปิดอยู่</dd><dt>← → / WASD</dt><dd>ดูปลายทางก่อนหน้าและถัดไป</dd><dt>Enter</dt><dd>ยืนยันปลายทางที่เลือก</dd><dt>F</dt><dd>กลับไปดูตัวละครระหว่างเลือกทาง</dd><dt>M</dt><dd>เปิดหรือปิดแผนที่โลก</dd><dt>?</dt><dd>เปิดสมุดนักผจญภัย</dd><dt>Escape</dt><dd>ปิดสมุดหรือหน้าต่างที่เปิดอยู่</dd><dt>สัมผัส / เมาส์</dt><dd>ลากเพื่อเลื่อนแผนที่ บีบสองนิ้วหรือใช้ล้อเมาส์เพื่อซูม</dd><dt>จอย</dt><dd>D-pad เลือกปลายทาง ปุ่มยืนยันเพื่อเดิน</dd></dl><section class="adventure-guide-intro"><h3>เก็บความคืบหน้า</h3><p>เกมบันทึกอัตโนมัติแยกจากช่องบันทึกเอง ใช้เมนูตั้งค่าเพื่อเลือกช่อง ส่งออกรหัสเซฟ หรือนำเข้าเซฟบนอุปกรณ์อื่น หากพื้นที่เก็บข้อมูลเต็ม เกมจะแจ้งให้ทราบ</p></section>`;
    } else {
      const progress = adventureProgress(this.game), next = adventureNextAction(this.game);
      const services = nearbyServices(this.game);
      const saved = this.game.players.length > 0;
      this.content.innerHTML = `<section class="adventure-objective"><span class="adventure-eyebrow">${saved ? 'เป้าหมายแคมเปญของคุณ' : 'ก่อนออกเดินทาง'}</span><h3>${escapeHtml(progress.title)}</h3><p>${escapeHtml(progress.detail)}</p>${saved && progress.maximum !== null ? `<progress max="${progress.maximum}" value="${Math.min(progress.maximum, progress.value)}" aria-label="ความคืบหน้าเป้าหมาย"></progress><div class="adventure-progress-meta"><span>${progress.value.toLocaleString('th-TH')} / ${progress.maximum.toLocaleString('th-TH')}</span><span>เหลือ ${progress.daysRemaining} วัน</span></div>` : ''}</section>
        <section class="adventure-next-step"><h3>${escapeHtml(next.title)}</h3><p>${escapeHtml(next.detail)}</p></section>
        ${saved ? `<section><h3>อันดับทรัพย์สินปัจจุบัน</h3><ol class="adventure-standings">${progress.standings.map((p, index) => `<li${p.active ? ' data-active="true"' : ''}><span class="adventure-rank">${index + 1}</span><div><strong>${escapeHtml(p.name)}</strong><small>Lv.${p.level} · ${p.towns} เมือง</small></div><strong>${p.worth.toLocaleString('th-TH')} G</strong></li>`).join('')}</ol></section>` : '<section class="adventure-guide-intro"><h3>สามก้าวแรก</h3><p>1. เลือกอาชีพและจำนวนผู้เล่น<br>2. ทอยเต๋าแล้วดูปลายทางที่ไปถึงได้<br>3. ยึดเมือง ซื้ออุปกรณ์ และสะสมทรัพย์สินตามเป้าหมายของโหมดที่เลือก</p></section>'}
        ${services.length ? `<section><h3>บริการใกล้เส้นทาง</h3><p class="adventure-muted">ระยะตามถนนจากจุดที่ยืน ต้องทอยแต้มให้ถึงปลายทาง · กดเพื่อดูตำแหน่ง</p><div class="adventure-service-list">${services.map(({ node, distance, label }) => `<button type="button" class="pixel-btn" data-guide-node="${node.id}"><strong>${label} · ${distance} ก้าว</strong><span>${escapeHtml(node.subRegionName || node.realmName)}</span></button>`).join('')}</div></section>` : ''}`;
    }
    this.content.scrollTop = 0;
  }
}
