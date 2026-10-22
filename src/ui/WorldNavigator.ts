import type { GameState } from '../game/GameState';
import type { BoardNode } from '../game/BoardMap';
import { dungeonSceneGroup } from '../game/DungeonLocations';
import { roadDistances, waypointDestination, findLocations, LOCATION_TYPES } from '../game/WorldNavigation';
import { escapeHtml } from '../util/Html';

export class WorldNavigator {
  private dialog = document.createElement('dialog');
  private tracker = document.createElement('aside');
  private target: number | null = null;
  private identity = '';
  private checkedAt = 0;
  private movementButton: HTMLButtonElement | null = null;
  private recommended: number | null = null;
  private previousFocus: HTMLElement | null = null;
  constructor(private game: GameState, private focusNode: (node: BoardNode) => void, private preview: (id: number) => void) {
    this.dialog.id = 'worldNavigatorDialog'; this.dialog.className = 'world-navigator-dialog';
    this.dialog.setAttribute('role', 'dialog'); this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', 'worldNavigatorTitle');
    this.dialog.innerHTML = `<header><div><span class="adventure-eyebrow">YOUR NEXT DESTINATION</span><h2 id="worldNavigatorTitle">ค้นหาและปักหมุดจุดหมาย</h2></div><button type="button" class="pixel-btn" data-nav-close>✕ ปิด</button></header><p>ค้นหาชื่อสถานที่ ภูมิภาค หรือบริการ แล้วปักหมุดเพื่อช่วยวางแผนการเดิน</p><div class="world-navigator-search"><label>ค้นหาสถานที่<input type="search" id="worldLocationSearch" placeholder="โรงเตี๊ยม · ร้านอาวุธ · forest" autocomplete="off"></label><label>ประเภท<select id="worldLocationType"><option value="all">สถานที่สำคัญทั้งหมด</option><option value="services">บริการและร้านค้า</option><option value="towns">เมือง</option><option value="treasure">สมบัติ</option><option value="bosses">บอสและดันเจี้ยน</option></select></label></div><p id="worldLocationCount" class="navigation-muted" role="status"></p><div id="worldLocationResults" class="world-location-results"></div><footer><span>ระยะตามถนน · ต้องเดินตามแต้มเต๋าจริง</span><button type="button" class="pixel-btn" data-nav-clear>ล้างหมุด</button></footer>`;
    this.dialog.querySelector('[data-nav-close]')!.addEventListener('click', () => this.dialog.close());
    this.dialog.querySelector('[data-nav-clear]')!.addEventListener('click', () => { this.target = null; this.persist(); this.render(); });
    this.dialog.querySelector('input')!.addEventListener('input', () => this.render());
    this.dialog.querySelector('select')!.addEventListener('change', () => this.render());
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-nav-pin]');
      if (!button || button.disabled) return;
      const node = this.game.allNodes.find(n => n.id === Number(button.dataset.navPin));
      if (node) { this.target = node.id; this.persist(); this.dialog.close(); this.focusNode(node); }
    });
    this.dialog.addEventListener('close', () => {
      this.dialog.hidden = true;
      if (this.previousFocus?.isConnected && !this.previousFocus.closest('.hidden, [hidden]')) this.previousFocus.focus();
      else document.querySelector<HTMLElement>('#hudSystemMenu summary')?.focus();
    });
    this.dialog.hidden = true;
    this.tracker.id = 'waypointTracker'; this.tracker.hidden = true;
    this.tracker.innerHTML = '<button type="button" class="waypoint-open" aria-label="เปลี่ยนจุดหมายที่ปักหมุด"><span>จุดหมายของคุณ</span><strong></strong><small></small></button><button type="button" class="waypoint-clear" aria-label="ล้างหมุดจุดหมาย">✕</button>';
    this.tracker.querySelector('.waypoint-open')!.addEventListener('click', () => this.open());
    this.tracker.querySelector('.waypoint-clear')!.addEventListener('click', () => { this.target = null; this.persist(); });
    document.body.append(this.dialog, this.tracker);
    document.getElementById('btnFindDestination')?.addEventListener('click', () => this.open());
  }
  attachMovementAction() {
    this.movementButton = document.createElement('button'); this.movementButton.type = 'button';
    this.movementButton.id = 'btnMoveWaypoint'; this.movementButton.className = 'pixel-btn waypoint-route-button'; this.movementButton.hidden = true;
    this.movementButton.addEventListener('click', () => { if (this.recommended !== null) this.preview(this.recommended); });
    document.querySelector('#movementNavigator .movement-heading')?.after(this.movementButton);
  }
  open() {
    if (!this.game.activePlayer) return;
    this.restore(); this.previousFocus = document.activeElement as HTMLElement | null;
    document.getElementById('worldMapModal')?.classList.add('hidden');
    document.getElementById('worldMapTooltip')?.classList.add('hidden');
    this.dialog.hidden = false; this.render(); this.dialog.showModal(); this.dialog.querySelector('input')?.focus();
  }
  private restore() {
    const player = this.game.activePlayer;
    const identity = `${this.game.world.seed}:${player?.id}`;
    if (identity === this.identity) return;
    this.identity = identity; this.target = null;
    try {
      const saved = JSON.parse(localStorage.getItem('fortuna_waypoint_v1') || 'null');
      const target = saved?.seed === this.game.world.seed ? saved.targets?.[String(player?.id)] : saved?.identity === identity ? saved.target : null;
      if (Number.isInteger(target) && this.game.allNodes.some(n => n.id === target)) this.target = target;
    } catch { /* A damaged local bookmark is safely ignored. */ }
  }
  private persist() {
    try {
      const saved = JSON.parse(localStorage.getItem('fortuna_waypoint_v1') || 'null');
      const targets: Record<string, number | null> = {};
      if (saved?.seed === this.game.world.seed && saved.targets && typeof saved.targets === 'object') {
        for (const player of this.game.players) if (Number.isInteger(saved.targets[String(player.id)])) targets[String(player.id)] = saved.targets[String(player.id)];
      } else if (typeof saved?.identity === 'string' && saved.identity.startsWith(`${this.game.world.seed}:`) && Number.isInteger(saved.target)) {
        targets[saved.identity.split(':')[1]] = saved.target;
      }
      targets[String(this.game.activePlayer.id)] = this.target;
      localStorage.setItem('fortuna_waypoint_v1', JSON.stringify({ seed: this.game.world.seed, targets }));
    } catch { /* Session-only pin still works. */ }
    this.checkedAt = 0;
  }
  private render() {
    const player = this.game.activePlayer; if (!player) return;
    const distances = roadDistances(this.game.allNodes, player.nodeId);
    const query = this.dialog.querySelector('input')!.value;
    const rows = findLocations(this.game.allNodes, query, this.dialog.querySelector('select')!.value, distances);
    this.dialog.querySelector('#worldLocationCount')!.textContent = `พบ ${rows.length} จุดหมาย${rows.length > 60 ? ' · แสดง 60 จุดแรก ลองค้นหาให้เจาะจงขึ้น' : ''}`;
    this.dialog.querySelector('#worldLocationResults')!.innerHTML = rows.length ? rows.slice(0, 60).map(node => {
      const sameScene = dungeonSceneGroup(node.id) === dungeonSceneGroup(player.nodeId);
      const distance = distances.get(node.id);
      return `<article class="world-location-card"${this.target === node.id ? ' data-pinned="true"' : ''}><div><strong>${escapeHtml(node.name)}</strong><span>${escapeHtml(LOCATION_TYPES[node.type] || node.type)} · ${escapeHtml(node.subRegionName || node.realmName)}</span><small>${distance === undefined ? 'อยู่นอกเส้นทางเชื่อมต่อปัจจุบัน' : `${distance} ก้าวตามถนน`}${!sameScene ? ' · อยู่คนละพื้นที่ดันเจี้ยน' : ''}</small></div><button type="button" class="pixel-btn" data-nav-pin="${node.id}" ${!sameScene || distance === undefined ? 'disabled' : ''}>${this.target === node.id ? 'ปักหมุดแล้ว' : 'ปักหมุด'}</button></article>`;
    }).join('') : '<p class="navigation-empty">ไม่พบจุดหมาย ลองค้นหาประเภทบริการหรือชื่อภูมิภาค</p>';
  }
  update(time: number, visible: boolean, canPreview: boolean) {
    if (time - this.checkedAt < 250 && this.checkedAt) return;
    this.checkedAt = time; this.restore();
    const player = this.game.activePlayer, node = this.game.allNodes.find(n => n.id === this.target);
    this.tracker.hidden = !visible || !player || !node;
    if (this.movementButton) this.movementButton.hidden = !node || !canPreview;
    if (!node || !player) { this.recommended = null; return; }
    const remaining = roadDistances(this.game.allNodes, node.id).get(player.nodeId);
    this.tracker.querySelector('strong')!.textContent = node.name;
    this.tracker.querySelector('small')!.textContent = remaining === undefined ? 'อยู่นอกเส้นทางปัจจุบัน' : remaining === 0 ? 'ถึงจุดหมายแล้ว' : `ห่าง ${remaining} ก้าวตามถนน`;
    this.recommended = canPreview ? waypointDestination(this.game.allNodes, node.id, this.game.highlightedNodes) : null;
    if (this.movementButton) {
      this.movementButton.disabled = this.recommended === null;
      this.movementButton.textContent = `◎ ดูปลายทางที่ใกล้หมุด: ${node.name}`;
    }
  }
}
