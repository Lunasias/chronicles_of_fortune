import type { GameState } from '../game/GameState';
import type { Player } from '../game/Player';
import type { BoardNode } from '../game/BoardMap';
import { pixelSprites } from '../engine/PixelSpriteGenerator';
import { ecosystemSystem } from '../game/EcosystemSystem';
import { escapeHtml } from '../util/Html';
import { pixelDisc } from '../engine/PixelFx';
import { mapProjection } from '../engine/MapProjection';
import { dungeonSceneGroup } from '../game/DungeonLocations';

export class HUD {
  private game: GameState;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private avatarCanvas: HTMLCanvasElement;
  private avatarCtx: CanvasRenderingContext2D;
  private avatarKey = '';
  private rosterButtons = new Map<number, { button: HTMLButtonElement; icon: HTMLSpanElement; name: HTMLSpanElement }>();
  private rosterContainer: HTMLElement | null = null;
  private questContainer: HTMLElement | null = null;
  private questMarkup = '';
  private minimapBase: HTMLCanvasElement;
  private minimapBaseCtx: CanvasRenderingContext2D;
  private minimapSource: BoardNode[] | null = null;
  private minimapSourceCount = 0;
  private minimapGroup: number | null = null;
  private minimapGeometry = '';
  private minimapMarkerKey: string | null = null;
  private minimapProject: ((gx: number, gy: number) => { x: number; y: number }) | null = null;
  public onInspectPlayerCallback?: (player: Player) => void;
  public onFocusNodeCallback?: (node: any) => void;

  constructor(game: GameState) {
    this.game = game;
    this.minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.avatarCanvas = document.getElementById('hudAvatarCanvas') as HTMLCanvasElement;
    this.avatarCtx = this.avatarCanvas.getContext('2d')!;
    this.minimapBase = document.createElement('canvas');
    this.minimapBaseCtx = this.minimapBase.getContext('2d')!;

    // Quest Tracker Minimize Toggle
    let isQuestMinimized = false;
    const btnToggleQuest = document.getElementById('btnToggleQuestTracker');
    if (btnToggleQuest) {
      btnToggleQuest.addEventListener('click', () => {
        isQuestMinimized = !isQuestMinimized;
        const list = document.getElementById('questTrackerList');
        const minBtn = document.getElementById('btnMinimizeQuestTracker');
        if (list && minBtn) {
          if (isQuestMinimized) {
            list.classList.add('hidden');
            minBtn.innerText = '▲';
          } else {
            list.classList.remove('hidden');
            minBtn.innerText = '▼';
          }
        }
      });
    }

    // Make active player avatar wrapper clickable to inspect oneself
    const avatarWrapper = document.getElementById('hudPlayerAvatarWrapper');
    if (avatarWrapper) {
      avatarWrapper.addEventListener('click', () => {
        if (this.onInspectPlayerCallback && this.game.activePlayer) {
          this.onInspectPlayerCallback(this.game.activePlayer);
        }
      });
    }

    window.addEventListener('hero-assets-loaded', () => {
      this.avatarKey = '';
      this.renderAvatar();
    });

    const timeBadge = document.getElementById('hudTimeOfDayBadge');
    if (timeBadge) timeBadge.title = 'เวลาเปลี่ยนเมื่อจบหนึ่งรอบผู้เล่น';

  }

  update() {
    const p = this.game.activePlayer;
    if (!p) return;

    let objective = document.getElementById('matchObjectiveText');
    if (!objective) {
      objective = document.createElement('div');
      objective.id = 'matchObjectiveText';
      objective.className = 'text-[9px] text-amber-300 leading-relaxed px-2 py-1 border-b border-slate-800/80';
      const wrapper = document.getElementById('minimapCanvasWrapper') || document.getElementById('minimapBox');
      wrapper?.prepend(objective);
    }
    objective.textContent = this.game.objective + (this.game.world.expeditions[p.id] ? ' • ชั้น ' + this.game.world.expeditions[p.id].depth + ' • คบเพลิง ' + this.game.world.expeditions[p.id].torch + '%' : '');
    // Player info
    const nameEl = document.getElementById('hudPlayerName')!;
    nameEl.innerText = p.displayName;
    nameEl.style.color = p.isDarkling ? '#f43f5e' : p.color;

    document.getElementById('hudPlayerClass')!.innerText = p.isDarkling ? 'จอมมาร' : p.className;
    document.getElementById('hudPlayerLevel')!.innerText = `LV. ${p.level}`;

    // Darkling badge
    const badge = document.getElementById('hudDarklingBadge')!;
    if (p.isDarkling) badge.classList.remove('hidden');
    else badge.classList.add('hidden');

    // Health and Mana Bars
    const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
    const mpPct = Math.max(0, (p.mp / p.maxMp) * 100);
    document.getElementById('hudHPBar')!.style.width = `${hpPct}%`;
    document.getElementById('hudHPText')!.innerText = `${p.hp}/${p.maxHp}`;
    document.getElementById('hudMPBar')!.style.width = `${mpPct}%`;
    document.getElementById('hudMPText')!.innerText = `${p.mp}/${p.maxMp}`;

    // Gold & Net Worth
    document.getElementById('hudPlayerGold')!.innerText = `${p.gold}G`;
    const netWorth = p.getNetWorth(this.game.allNodes);
    document.getElementById('hudPlayerNetWorth')!.innerText = `${netWorth}G`;
    document.getElementById('hudPlayerTowns')!.innerText = `${p.townsControlled} เมือง`;

    document.getElementById('hudDayCount')!.innerText = `${this.game.dayCounter}`;
    document.getElementById('hudWeekCount')!.innerText = `${this.game.weekCounter}`;

    // Day / Night Indicator
    const timeInfo = ecosystemSystem.getTimeDisplay();
    const timeIconEl = document.getElementById('hudTimeIcon');
    const timeTextEl = document.getElementById('hudTimeText');
    if (timeIconEl) timeIconEl.innerText = timeInfo.icon;
    if (timeTextEl) timeTextEl.innerText = timeInfo.name.toUpperCase();

    // Regional Weather Indicator
    const activeNode = this.game.allNodes.find(n => n.id === p.nodeId) || this.game.allNodes[0];
    const localWeather = ecosystemSystem.getNodeWeather(activeNode);
    const weatherEffect = ecosystemSystem.getWeatherCombatModifier(localWeather);
    const weatherIconEl = document.getElementById('hudWeatherIcon');
    const weatherTextEl = document.getElementById('hudWeatherText');
    if (weatherIconEl) weatherIconEl.innerText = weatherEffect.icon;
    if (weatherTextEl) weatherTextEl.title = weatherEffect.desc + (activeNode.id >= 1000 ? ' • สภาพภายในดันเจี้ยน' : ' • พรุ่งนี้: ' + this.game.world.forecast[activeNode.realmId]);
    if (weatherTextEl) weatherTextEl.innerText = `${activeNode.realmName ? activeNode.realmName.split(' ')[0] : 'SOLARIA'} • ${weatherEffect.title || 'แจ่มใส'}`;

    // Food Buff Badge
    const foodBadge = document.getElementById('hudFoodBuffBadge');
    if (foodBadge) {
      if (p.foodBuff && p.foodBuff.turnsRemaining > 0) {
        document.getElementById('hudFoodBuffIcon')!.innerText = p.foodBuff.icon;
        document.getElementById('hudFoodBuffText')!.innerText = `${p.foodBuff.name} (${p.foodBuff.turnsRemaining}T)`;
        foodBadge.classList.remove('hidden');
      } else {
        foodBadge.classList.add('hidden');
      }
    }

    // Guild Quest Badge
    const questBadge = document.getElementById('hudGuildQuestBadge');
    if (questBadge) {
      if (p.activeGuildQuest) {
        document.getElementById('hudGuildQuestText')!.innerText = `[${p.activeGuildQuest.rank}] ${p.activeGuildQuest.title} (${p.activeGuildQuest.currentProgress}/${p.activeGuildQuest.targetCount})`;
        questBadge.classList.remove('hidden');
      } else {
        questBadge.classList.add('hidden');
      }
    }

    // Update Roster Inspect Buttons
    this.updateRoster();

    // Render Avatar
    this.renderAvatar();

    // Render Mini Radar
    this.renderMinimap();

    // Update Quest & Crisis Tracker HUD
    this.updateQuestTracker();
  }

  private updateRoster() {
    const container = document.getElementById('hudRosterButtonsContainer');
    if (!container) return;
    if (this.rosterContainer !== container) { this.rosterButtons.clear(); this.rosterContainer = container; }
    const ids = new Set(this.game.players.map(player => player.id));
    for (const [id, entry] of this.rosterButtons) if (!ids.has(id)) { entry.button.remove(); this.rosterButtons.delete(id); }
    this.game.players.forEach((player, index) => {
      let entry = this.rosterButtons.get(player.id);
      if (!entry) {
        const button = document.createElement('button'), icon = document.createElement('span'), name = document.createElement('span');
        button.type = 'button'; name.className = 'truncate max-w-[65px]'; button.append(icon, name);
        const id = player.id;
        button.addEventListener('click', event => {
          event.stopPropagation();
          // Multiplayer synchronization replaces Player instances; inspect the live one.
          const current = this.game.players.find(candidate => candidate.id === id);
          if (current) this.onInspectPlayerCallback?.(current);
        });
        entry = { button, icon, name }; this.rosterButtons.set(id, entry);
      }
      const current = player.id === this.game.activePlayer.id;
      const className = `pixel-btn px-2 py-1 text-[10px] font-bold flex items-center gap-1 ${current ? 'pixel-btn-gold text-slate-950 ring-1 ring-amber-300' : 'text-slate-200 hover:text-white'}`;
      if (entry.button.className !== className) entry.button.className = className;
      const title = `คลิกเพื่อส่องสเตตัสของ ${player.displayName} (${current ? 'คุณ' : 'คู่ต่อสู้'})`;
      if (entry.button.title !== title) entry.button.title = title;
      entry.button.setAttribute('aria-pressed', String(current));
      if (entry.icon.textContent !== player.avatar) entry.icon.textContent = player.avatar;
      if (entry.name.textContent !== player.displayName) entry.name.textContent = player.displayName;
      // Leave already ordered buttons attached so keyboard focus survives updates.
      if (container.children[index] !== entry.button) container.insertBefore(entry.button, container.children[index] ?? null);
    });
  }

  private updateQuestTracker() {
    const trackerModal = document.getElementById('questTrackerHUD');
    if (!trackerModal) return;

    const listEl = document.getElementById('questTrackerList');
    if (!listEl) return;
    if (this.questContainer !== listEl) {
      this.questContainer = listEl; this.questMarkup = '';
      listEl.addEventListener('click', event => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('.focus-node-btn');
        if (!target || !listEl.contains(target)) return;
        event.stopPropagation();
        const nodeId = Number(target.dataset.nodeId);
        const node = this.game.allNodes.find(candidate => candidate.id === nodeId);
        if (node) this.onFocusNodeCallback?.(node);
      });
    }

    const p = this.game.activePlayer;
    const occupiedTowns = this.game.allNodes.filter(n => n.townData?.isOccupiedByMonster);
    const bossNodes = this.game.allNodes.filter(n => n.type === 'boss' && !this.game.world.defeatedBosses.includes(n.id));

    // Update Top-Bar Crisis Badge without forcing window open
    const badge = document.getElementById('hudCrisisCount');
    if (badge) {
      badge.innerText = `${occupiedTowns.length}`;
      if (occupiedTowns.length === 0) {
        badge.className = 'bg-emerald-500/20 px-1 border border-emerald-500/40 text-emerald-300';
      } else {
        badge.className = 'bg-red-500/20 px-1 border border-red-500/40 text-red-300';
      }
    }

    let html = '';

    // Active Crisis Towns
    if (occupiedTowns.length > 0) {
      occupiedTowns.forEach(t => {
        html += `
          <div class="pixel-box p-1.5 bg-red-950/70 border-red-700/80 flex items-center justify-between gap-1.5">
            <div class="flex items-center gap-1.5 overflow-hidden">
              <span class="text-sm animate-pulse">🆘</span>
              <div class="overflow-hidden">
                <div class="text-[10px] font-bold text-red-300 truncate">${escapeHtml(t.name)}</div>
                <div class="text-[8px] text-amber-300 truncate">บอส: ${escapeHtml(t.townData?.monsterName || 'มอนสเตอร์')} (${t.townData?.monsterHp} HP)</div>
              </div>
            </div>
            <button class="focus-node-btn pixel-btn pixel-btn-gold px-1.5 py-0.5 text-[9px] font-bold text-slate-950 shrink-0" data-node-id="${t.id}" title="เลื่อนกล้องไปยังเมืองนี้">
              🎯 ดู
            </button>
          </div>
        `;
      });
    }

    // Boss Lairs
    bossNodes.forEach(b => {
      html += `
        <div class="pixel-box p-1.5 bg-amber-950/60 border-amber-600/70 flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5 overflow-hidden">
            <span class="text-sm">👑</span>
            <div class="overflow-hidden">
              <div class="text-[10px] font-bold text-amber-200 truncate">${escapeHtml(b.name)}</div>
              <div class="text-[8px] text-slate-300 truncate">${escapeHtml(b.subRegionName || 'บอสประจำภูมิภาค')}</div>
            </div>
          </div>
          <button class="focus-node-btn pixel-btn pixel-btn-blue px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0" data-node-id="${b.id}" title="เลื่อนกล้องไปยังรังบอส">
            🎯 ดู
          </button>
        </div>
      `;
    });

    // Guild Quest
    if (p.activeGuildQuest) {
      html += `
        <div class="pixel-box p-1.5 bg-indigo-950/70 border-indigo-600/70 flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5 overflow-hidden">
            <span class="text-sm">📜</span>
            <div class="overflow-hidden">
              <div class="text-[10px] font-bold text-indigo-200 truncate">[${escapeHtml(p.activeGuildQuest.rank)}] ${escapeHtml(p.activeGuildQuest.title)}</div>
              <div class="text-[8px] text-slate-300">ความคืบหน้า: ${p.activeGuildQuest.currentProgress}/${p.activeGuildQuest.targetCount}</div>
            </div>
          </div>
          <span class="text-[8px] bg-indigo-800 text-indigo-200 px-1 py-0.5 font-bold shrink-0">กิลด์</span>
        </div>
      `;
    }

    if (occupiedTowns.length === 0 && bossNodes.length === 0 && !p.activeGuildQuest) {
      html = `<div class="text-slate-400 text-[9px] italic text-center py-2">ดินแดนสงบสุข ไม่มีวิกฤตเร่งด่วนในขณะนี้</div>`;
    }

    if (this.questMarkup !== html) { listEl.innerHTML = html; this.questMarkup = html; }
  }

  private renderAvatar() {
    const p = this.game.activePlayer;
    if (!p) return;
    const key = JSON.stringify([p.id, p.classKey, p.equipment, p.isDarkling, p.prank, p.skinVariant]);
    if (key === this.avatarKey) return;
    this.avatarKey = key;
    this.avatarCtx.clearRect(0, 0, 48, 48);
    this.avatarCtx.imageSmoothingEnabled = false;

    const sprite = pixelSprites.getHeroSprite(
      p.classKey,
      'SE',
      'idle',
      0,
      p.equipment,
      p.isDarkling,
      p.prank,
      p.skinVariant
    );
    this.avatarCtx.drawImage(sprite, 48, 32, 48, 48, 0, 0, 48, 48);
  }

  /** Cheap per-frame marker update; the board and projection stay cached. */
  public updateMapMarkers() { this.renderMinimap(false); }

  private renderMinimap(checkGeometry = true) {
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const group = dungeonSceneGroup(this.game.activePlayer?.nodeId ?? 0);
    const sourceChanged = this.minimapSource !== this.game.allNodes || this.minimapSourceCount !== this.game.allNodes.length;
    const viewChanged = this.minimapGroup !== group || this.minimapBase.width !== w || this.minimapBase.height !== h;
    if (checkGeometry || sourceChanged || viewChanged || !this.minimapProject) {
      const nodes = this.game.allNodes.filter(n => dungeonSceneGroup(n.id) === group);
      const geometry = `${group}:${w}:${h}|` + nodes.map(node => `${node.id}:${node.gx}:${node.gy}:${node.type}:${node.neighbors.join(',')}`).join('|');
      this.minimapSource = this.game.allNodes; this.minimapSourceCount = this.game.allNodes.length; this.minimapGroup = group;
      if (geometry !== this.minimapGeometry || !this.minimapProject) {
        this.minimapGeometry = geometry; this.minimapMarkerKey = null;
        this.minimapProject = mapProjection(nodes, w, h, 8);
        this.drawMinimapBoard(nodes, w, h);
      }
    }
    const project = this.minimapProject!;
    const markers = this.game.players.filter(player => dungeonSceneGroup(player.nodeId) === group).map(player => {
      const point = project(player.gridX, player.gridY);
      return { id: player.id, ...point, color: player.isDarkling ? '#f43f5e' : player.color };
    });
    const markerKey = markers.map(marker => `${marker.id}:${marker.x}:${marker.y}:${marker.color}`).join('|');
    if (markerKey === this.minimapMarkerKey) return;
    this.minimapMarkerKey = markerKey;
    const ctx = this.minimapCtx;
    ctx.drawImage(this.minimapBase, 0, 0);
    for (const marker of markers) pixelDisc(ctx, marker.x, marker.y, 4, marker.color);
  }

  private drawMinimapBoard(nodes: BoardNode[], w: number, h: number) {
    this.minimapBase.width = w; this.minimapBase.height = h;
    const ctx = this.minimapBaseCtx, project = this.minimapProject!;
    ctx.fillStyle = '#0a0f1d'; ctx.fillRect(0, 0, w, h);
    const byId = new Map(nodes.map(node => [node.id, node]));

    // Draw lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    nodes.forEach(node => {
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = byId.get(nId);
          if (target) {
            ctx.beginPath();
            const a = project(node.gx,node.gy), b = project(target.gx,target.gy);
            ctx.moveTo(a.x,a.y);
            ctx.lineTo(b.x,b.y);
            ctx.stroke();
          }
        }
      });
    });

    // Draw spaces
    nodes.forEach(node => {
      ctx.fillStyle =
        node.type === 'town'
          ? '#fbbf24'
          : node.type === 'boss'
          ? '#ef4444'
          : node.type === 'dark_gate'
          ? '#c084fc'
          : node.type === 'blue'
          ? '#3b82f6'
          : '#64748b';
      const p = project(node.gx,node.gy);
      ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
    });

  }
}
