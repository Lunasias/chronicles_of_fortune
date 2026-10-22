import type { GameState } from '../game/GameState';
import { getNodeEncounterPreview } from '../game/MonsterDatabase';
import { createPlayerCombatant, prepareCombatant } from '../game/CombatRules';
import { movementRoutes } from '../game/Movement';
import { escapeHtml } from '../util/Html';
import { buildRouteInsight, cycleRouteDestination, filterRouteDestinations, recommendRouteDestination, ROUTE_FILTERS, type RouteDestinationInsight, type RouteFilter, type RouteSort } from './RouteInsights';

/** Read-only route planning. Only the confirm callback starts walking. */
export class MovementUI {
  private panel = document.createElement('section');
  private key = '';
  private nextSnapshotAt = 0;
  private title: HTMLElement;
  private detail: HTMLElement;
  private status: HTMLElement;
  private advice: HTMLElement;
  private health: HTMLElement;
  private confirm: HTMLButtonElement;
  private list: HTMLElement;
  private options: HTMLDetailsElement;
  private recommendation: HTMLButtonElement;
  private destinations: RouteDestinationInsight[] = [];
  private filtered: RouteDestinationInsight[] = [];
  private filter: RouteFilter = 'all';
  private sort: RouteSort = 'route';
  private selectedId: number | null = null;
  private wasVisible = false;

  constructor(onCycle: (direction: number) => void, onConfirm: () => void, onCenter: () => void, private onSelect?: (nodeId: number) => void) {
    this.panel.id = 'movementNavigator'; this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'วางแผนและเลือกเส้นทางเดิน');
    this.panel.innerHTML = `
      <div class="movement-heading"><strong>วางแผนเส้นทาง</strong><span id="movementStatus"></span><span id="movementHealth" class="movement-health"></span></div>
      <div class="movement-filters" role="group" aria-label="กรองจุดหมาย">${ROUTE_FILTERS.map(filter => `<button type="button" class="pixel-btn" data-route-filter="${filter.id}" aria-pressed="${filter.id === 'all'}">${filter.label} <span>0</span></button>`).join('')}</div>
      <button type="button" id="movementRecommendation" class="movement-recommendation" hidden></button>
      <details class="movement-options"><summary id="movementListStatus">ดูจุดหมายทั้งหมด</summary>
        <div class="movement-list-toolbar"><label>เรียงตาม <select id="movementSort" aria-label="เรียงจุดหมาย"><option value="route">ลำดับบนแผนที่</option><option value="risk">ความเสี่ยงต่ำก่อน</option><option value="steps">จำนวนก้าว</option></select></label><span>แตะเพื่อดูเส้นทางก่อนยืนยัน</span></div>
        <div id="movementDestinations" class="movement-list" role="group" aria-label="จุดหมายที่เดินถึง"></div>
      </details>
      <div id="movementDestination" role="status" aria-live="polite" aria-atomic="true"><strong id="movementTitle"></strong><p id="movementDetail"></p><p id="movementAdvice" class="movement-advice"></p></div>
      <div class="movement-actions">
        <button type="button" id="btnMovePrevious" class="pixel-btn" aria-label="ปลายทางก่อนหน้าในรายการ">← ก่อนหน้า</button>
        <button type="button" id="btnMoveNext" class="pixel-btn" aria-label="ปลายทางถัดไปในรายการ">ถัดไป →</button>
        <button type="button" id="btnMoveConfirm" class="pixel-btn pixel-btn-gold">ยืนยันเดินไปที่นี่</button>
        <button type="button" id="btnMoveCenter" class="pixel-btn" aria-label="กลับไปดูตัวละคร">◎ ตัวละคร</button>
      </div>
      <p class="movement-help">เลือกจุดหมายเพื่อดูทางก่อน · Enter ยืนยันเดิน · F ดูตัวละคร · ค่าต่อสู้เป็นประมาณการ ไม่รวมคริติคอล สกิลและการป้องกัน</p>`;
    document.body.appendChild(this.panel);
    this.title = this.panel.querySelector('#movementTitle')!; this.detail = this.panel.querySelector('#movementDetail')!;
    this.status = this.panel.querySelector('#movementStatus')!; this.advice = this.panel.querySelector('#movementAdvice')!;
    this.health = this.panel.querySelector('#movementHealth')!; this.confirm = this.panel.querySelector('#btnMoveConfirm')!;
    this.list = this.panel.querySelector('#movementDestinations')!; this.options = this.panel.querySelector('details')!;
    this.recommendation = this.panel.querySelector('#movementRecommendation')!;
    const cycle = (direction: number) => {
      if (!this.onSelect) return onCycle(direction);
      const next = this.nextDestination(direction);
      if (next !== null) this.onSelect(next);
    };
    this.panel.querySelector('#btnMovePrevious')!.addEventListener('click', () => cycle(-1));
    this.panel.querySelector('#btnMoveNext')!.addEventListener('click', () => cycle(1));
    this.confirm.addEventListener('click', onConfirm);
    this.panel.querySelector('#btnMoveCenter')!.addEventListener('click', onCenter);
    this.panel.querySelectorAll<HTMLButtonElement>('[data-route-filter]').forEach(button => button.addEventListener('click', () => {
      this.filter = button.dataset.routeFilter as RouteFilter; this.options.open = true; this.renderList(); this.measure();
    }));
    this.panel.querySelector<HTMLSelectElement>('#movementSort')!.addEventListener('change', event => { this.sort = (event.target as HTMLSelectElement).value as RouteSort; this.renderList(); this.measure(); });
    this.list.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-route-node]');
      const id = Number(button?.dataset.routeNode);
      if (button && this.destinations.some(destination => destination.id === id)) this.onSelect?.(id);
    });
    this.recommendation.addEventListener('click', () => { const id = Number(this.recommendation.dataset.nodeId); if (this.destinations.some(destination => destination.id === id)) this.onSelect?.(id); });
    this.options.addEventListener('toggle', () => this.measure());
  }

  private measure() {
    if (this.panel.hidden) return;
    document.body.style.setProperty('--movement-clearance', `${Math.max(0, Math.round(window.innerHeight - this.panel.getBoundingClientRect().top + 8))}px`);
  }

  /** Keyboard, controller and dock arrows share the same visible filter scope. */
  public nextDestination(direction: number): number | null {
    return cycleRouteDestination(this.filtered, this.selectedId, direction);
  }

  private renderList() {
    this.filtered = filterRouteDestinations(this.destinations, this.filter, this.sort);
    this.panel.querySelectorAll<HTMLButtonElement>('[data-route-filter]').forEach(button => {
      const filter = button.dataset.routeFilter as RouteFilter;
      const count = this.destinations.filter(destination => destination.categories.includes(filter)).length;
      button.setAttribute('aria-pressed', String(filter === this.filter)); button.querySelector('span')!.textContent = String(count);
      button.disabled = count === 0;
    });
    this.panel.querySelector('#movementListStatus')!.textContent = `ดูจุดหมาย ${this.filtered.length}/${this.destinations.length} แห่ง${this.selectedId !== null && !this.filtered.some(destination => destination.id === this.selectedId) ? ' · จุดที่เลือกอยู่นอกตัวกรอง' : ''}`;
    const scroll = this.list.scrollTop;
    const focusedId = this.list.contains(document.activeElement) ? (document.activeElement as HTMLElement)?.dataset.routeNode : undefined;
    this.list.innerHTML = this.filtered.length ? this.filtered.map(destination => `<button type="button" class="movement-card" data-route-node="${destination.id}" data-risk="${destination.advice.risk}" aria-pressed="${destination.id === this.selectedId}" ${this.onSelect ? '' : 'disabled'}>
      <strong>${destination.originalIndex + 1}. ${escapeHtml(destination.name)}</strong><span>${escapeHtml(destination.benefit)}</span>
      <span class="movement-card-meta">${destination.steps} ก้าว · ${destination.rivalName ? `อาจดวล ${escapeHtml(destination.rivalName)}` : `ปะทะ ${destination.encounterChance}%`} · ${escapeHtml(destination.advice.label)}</span></button>`).join('') : '<p class="movement-empty">ไม่มีจุดหมายประเภทนี้ในระยะเดินครั้งนี้</p>';
    this.list.scrollTop = scroll;
    if (focusedId) this.list.querySelector<HTMLButtonElement>(`[data-route-node="${focusedId}"]`)?.focus({ preventScroll: true });
    for (const id of ['#btnMovePrevious', '#btnMoveNext']) (this.panel.querySelector(id) as HTMLButtonElement).disabled = this.onSelect ? !this.filtered.length : !this.destinations.length;
  }

  update(game: GameState, selectedId: number | null, visible: boolean) {
    this.panel.hidden = !visible; document.body.classList.toggle('movement-open', visible);
    if (!visible) { this.key = ''; this.wasVisible = false; this.nextSnapshotAt = 0; return; }
    // Selection stays immediate; background combat/status snapshots do not need
    // JSON serialization and a layout read at the animation-frame rate.
    const now = performance.now();
    if (this.wasVisible && selectedId === this.selectedId && now < this.nextSnapshotAt) return;
    this.nextSnapshotAt = now + 120;
    if (!this.wasVisible) { this.filter = 'all'; this.options.open = window.innerWidth > 900; this.wasVisible = true; }
    this.measure();
    const player = game.activePlayer, world = game.world;
    const reachable = new Set(game.highlightedNodes);
    const nodes = game.allNodes.filter(node => reachable.has(node.id));
    const key = [player.id, player.nodeId, game.remainingMoves, selectedId, player.hp, player.maxHp, player.mp, player.classKey, player.hasFlexibleMovement, player.freezeTurns, player.blindTurns,
      ...(['atk', 'def', 'mag', 'spd', 'luk'] as const).map(stat => player.getTotalStat(stat)), world.day, world.hour, world.spireFloor, world.modifier?.id,
      JSON.stringify(world.weather), JSON.stringify(world.threat), JSON.stringify(world.expeditions[player.id]), JSON.stringify(world.bossHealth), world.claimedTreasures.join(','), world.defeatedBosses.join(','),
      game.highlightedNodes.join(','), nodes.map(node => `${node.id}:${node.name}:${JSON.stringify(node.townData)}:${JSON.stringify(node.homeData)}`).join('|'),
      game.players.map(other => `${other.id}:${other.nodeId}:${other.hp}:${other.mp}:${other.displayName}:${(['atk', 'def', 'mag', 'spd', 'luk'] as const).map(stat => other.getTotalStat(stat)).join(',')}`).join('|')].join(':');
    if (key === this.key) return;
    this.key = key; this.selectedId = selectedId;
    const routes = movementRoutes(game.allNodes, player.nodeId, game.remainingMoves, !!player.hasFlexibleMovement);
    // Combat preparation can clear freeze for a relic. Scout a shallow player
    // snapshot so opening this planner never applies that gameplay effect.
    const scoutingPlayer = Object.assign(Object.create(Object.getPrototypeOf(player)), player) as typeof player;
    this.destinations = game.highlightedNodes.flatMap((id, originalIndex) => {
      const node = nodes.find(candidate => candidate.id === id), path = routes.get(id);
      if (!node || !path) return [];
      const rival = game.gameMode === 'coop_raid' ? undefined : game.players.find(other => other.id !== player.id && other.nodeId === node.id && other.hp > 0);
      const scoutingRival = rival ? Object.assign(Object.create(Object.getPrototypeOf(rival)), rival) as typeof rival : undefined;
      return [buildRouteInsight(node, getNodeEncounterPreview(node, scoutingPlayer), prepareCombatant(createPlayerCombatant(scoutingPlayer), node, world), {
        playerId: player.id, originalIndex, steps: path.length - 1, rivalName: rival?.displayName,
        rival: scoutingRival ? prepareCombatant(createPlayerCombatant(scoutingRival, true), node, world, true) : undefined,
        treasureClaimed: world.claimedTreasures.includes(node.id),
      })];
    });
    this.renderList();
    this.status.textContent = `${game.remainingMoves} ก้าว · ${this.destinations.length} ปลายทาง`;
    this.health.textContent = `HP ${player.hp}/${player.maxHp} · MP ${player.mp}`;
    const suggestion = recommendRouteDestination(this.destinations, player.hp, player.maxHp);
    this.recommendation.hidden = !suggestion || !this.onSelect;
    if (suggestion) { this.recommendation.dataset.nodeId = String(suggestion.id); this.recommendation.textContent = `${suggestion.reason} → ${this.destinations.find(destination => destination.id === suggestion.id)!.name}`; }
    const selected = this.destinations.find(destination => destination.id === selectedId), node = nodes.find(candidate => candidate.id === selectedId);
    this.confirm.disabled = !selected;
    if (!selected || !node) {
      this.title.textContent = 'เลือกจุดหมายบนแผนที่หรือจากรายการ';
      this.detail.textContent = player.hasFlexibleMovement ? `ผลึกอิสระ: หยุดได้ตั้งแต่ 1 ถึง ${game.remainingMoves} ก้าว` : `เดินครบ ${game.remainingMoves} ก้าว · ออกเดินได้ทั้งสองทิศทาง`;
      this.advice.textContent = 'การกรองและดูข้อมูลยังไม่เริ่มเดิน กดยืนยันเมื่อพร้อม'; this.advice.dataset.risk = 'none'; return;
    }
    this.title.textContent = `${selected.originalIndex + 1}/${game.highlightedNodes.length} · ${selected.name}`;
    this.detail.textContent = `${selected.steps} ก้าว · ${node.subRegionName || node.realmName} · ${selected.benefit}`;
    this.advice.dataset.risk = selected.advice.risk;
    this.advice.textContent = selected.rivalName
      ? `พบ ${selected.rivalName} · อาจดวล PvP · ${selected.advice.label}`
      : `โอกาสปะทะ ${selected.encounterChance}% · ${selected.advice.label}${selected.advice.incomingDamage ? ` · ศัตรูโจมตีแรงราว ${selected.advice.incomingDamage} HP` : ''}`;
    if (selected.advice.incomingDamage) this.advice.textContent += ` — ${selected.advice.description}`;
    this.measure();
  }
}
