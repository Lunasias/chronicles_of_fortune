import type { GameState } from '../game/GameState';
import { getNodeEncounterPreview } from '../game/MonsterDatabase';

/** A persistent destination preview for touch, keyboard and controller players. */
export class MovementUI {
  private panel = document.createElement('section');
  private key = '';
  private title: HTMLElement;
  private detail: HTMLElement;
  private status: HTMLElement;
  private confirm: HTMLButtonElement;

  constructor(onCycle: (direction: number) => void, onConfirm: () => void, onCenter: () => void) {
    this.panel.id = 'movementNavigator';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'เลือกเส้นทางเดิน');
    this.panel.innerHTML = `
      <div class="movement-heading"><strong>เลือกทางเดิน</strong><span id="movementStatus"></span></div>
      <div id="movementDestination" role="status" aria-live="polite" aria-atomic="true">
        <strong id="movementTitle"></strong><p id="movementDetail"></p>
      </div>
      <div class="movement-actions">
        <button type="button" id="btnMovePrevious" class="pixel-btn" aria-label="ปลายทางก่อนหน้า">← ก่อนหน้า</button>
        <button type="button" id="btnMoveNext" class="pixel-btn" aria-label="ปลายทางถัดไป">ถัดไป →</button>
        <button type="button" id="btnMoveConfirm" class="pixel-btn pixel-btn-gold">เดินไปที่นี่</button>
        <button type="button" id="btnMoveCenter" class="pixel-btn" aria-label="กลับไปดูตัวละคร">◎ ตัวละคร</button>
      </div>
      <p class="movement-help">เดินหน้า–ย้อนทางได้ทุกเทิร์น • ← → / WASD เลือก • Enter เดิน • F ดูตัวละคร</p>`;
    document.body.appendChild(this.panel);
    this.title = this.panel.querySelector('#movementTitle')!;
    this.detail = this.panel.querySelector('#movementDetail')!;
    this.status = this.panel.querySelector('#movementStatus')!;
    this.confirm = this.panel.querySelector('#btnMoveConfirm')!;
    this.panel.querySelector('#btnMovePrevious')!.addEventListener('click', () => onCycle(-1));
    this.panel.querySelector('#btnMoveNext')!.addEventListener('click', () => onCycle(1));
    this.confirm.addEventListener('click', onConfirm);
    this.panel.querySelector('#btnMoveCenter')!.addEventListener('click', onCenter);
  }

  update(game: GameState, selectedId: number | null, visible: boolean) {
    this.panel.hidden = !visible;
    document.body.classList.toggle('movement-open', visible);
    if (!visible) { this.key = ''; return; }
    // Keep floating notices above the destination dock instead of on top of its buttons.
    const clearance = Math.max(0, Math.round(window.innerHeight - this.panel.getBoundingClientRect().top + 8));
    document.body.style.setProperty('--movement-clearance', `${clearance}px`);
    const key = `${game.activePlayer.id}:${game.activePlayer.nodeId}:${game.remainingMoves}:${selectedId}:${game.highlightedNodes.join(',')}`;
    if (key === this.key) return;
    this.key = key;
    const node = game.highlightedNodes.includes(selectedId ?? -1) ? game.allNodes.find(n => n.id === selectedId) : undefined;
    this.status.textContent = `${game.remainingMoves} ก้าว · ${game.highlightedNodes.length} ปลายทาง`;
    this.confirm.disabled = !node;
    if (!node) {
      this.title.textContent = 'เลือกปลายทางบนแผนที่ หรือกดก่อนหน้า / ถัดไป';
      this.detail.textContent = game.activePlayer.hasFlexibleMovement
        ? `ผลึกอิสระ: หยุดได้ตั้งแต่ 1 ถึง ${game.remainingMoves} ก้าว`
        : `เดินครบ ${game.remainingMoves} ก้าว • เริ่มเดินได้ทั้งสองทิศทาง`;
      return;
    }
    const preview = getNodeEncounterPreview(node, game.activePlayer);
    const path = game.findPathToTarget(node.id);
    this.confirm.disabled = !path;
    const steps = path ? path.length - 1 : 0;
    const rival = game.players.find(p => p.id !== game.activePlayer.id && p.nodeId === node.id && p.hp > 0);
    this.title.textContent = `${game.highlightedNodes.indexOf(node.id) + 1}/${game.highlightedNodes.length} · ${node.name}`;
    this.detail.textContent = `${steps} ก้าว · ${node.subRegionName || node.realmName} · ${rival ? `พบ ${rival.displayName} — อาจดวล PvP` : `โอกาสปะทะ ${preview.encounterChancePercent}% · ${preview.threatLevel}`}`;
    this.detail.style.color = rival ? '#fbbf24' : preview.threatColor;
  }
}
