import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { pixelSprites } from '../engine/PixelSpriteGenerator';
import { ecosystemSystem } from '../game/EcosystemSystem';

export class HUD {
  private game: GameState;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private avatarCanvas: HTMLCanvasElement;
  private avatarCtx: CanvasRenderingContext2D;
  public onInspectPlayerCallback?: (player: Player) => void;
  public onFocusNodeCallback?: (node: any) => void;

  constructor(game: GameState) {
    this.game = game;
    this.minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.avatarCanvas = document.getElementById('hudAvatarCanvas') as HTMLCanvasElement;
    this.avatarCtx = this.avatarCanvas.getContext('2d')!;

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
      this.renderAvatar();
    });

    // Make time of day badge interactive for instant testing and cycling
    const timeBadge = document.getElementById('hudTimeOfDayBadge');
    if (timeBadge) {
      timeBadge.classList.add('cursor-pointer', 'hover:opacity-80', 'transition-opacity');
      timeBadge.title = 'คลิกเพื่อสลับช่วงเวลา (ทดสอบ)';
      timeBadge.addEventListener('click', () => {
        ecosystemSystem.advanceTime();
        const tInfo = ecosystemSystem.getTimeDisplay();
        this.game.addLog(`⌛ สลับเวลา: ตอนนี้เป็นเวลา ${tInfo.name.toUpperCase()} ${tInfo.icon}! (${tInfo.desc})`, 'level');
        this.update();
      });
    }
  }

  update() {
    const p = this.game.activePlayer;
    if (!p) return;

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
    if (weatherTextEl) weatherTextEl.innerText = `${activeNode.realmName ? activeNode.realmName.split(' ')[0] : 'SOLARIA'} • ${weatherEffect.icon}`;

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
    const rosterContainer = document.getElementById('hudRosterButtonsContainer');
    if (rosterContainer) {
      rosterContainer.innerHTML = '';
      this.game.players.forEach(pl => {
        const isCurrent = pl.id === p.id;
        const btn = document.createElement('button');
        btn.className = `pixel-btn px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition-transform hover:scale-105 ${
          isCurrent ? 'pixel-btn-gold text-slate-950 ring-1 ring-amber-300' : 'text-slate-200 hover:text-white'
        }`;
        btn.title = `คลิกเพื่อส่องสเตตัสของ ${pl.displayName} (${isCurrent ? 'คุณ' : 'คู่ต่อสู้'})`;
        btn.innerHTML = `
          <span>${pl.avatar}</span>
          <span class="truncate max-w-[65px]">${pl.displayName}</span>
        `;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (this.onInspectPlayerCallback) {
            this.onInspectPlayerCallback(pl);
          }
        });
        rosterContainer.appendChild(btn);
      });
    }

    // Render Avatar
    this.renderAvatar();

    // Render Mini Radar
    this.renderMinimap();

    // Update Quest & Crisis Tracker HUD
    this.updateQuestTracker();
  }

  private updateQuestTracker() {
    const trackerModal = document.getElementById('questTrackerHUD');
    if (!trackerModal) return;
    trackerModal.classList.remove('hidden');

    const listEl = document.getElementById('questTrackerList');
    if (!listEl) return;

    const p = this.game.activePlayer;
    const occupiedTowns = this.game.allNodes.filter(n => n.townData?.isOccupiedByMonster);
    const bossNodes = this.game.allNodes.filter(n => n.type === 'boss');

    let html = '';

    // Active Crisis Towns
    if (occupiedTowns.length > 0) {
      occupiedTowns.forEach(t => {
        html += `
          <div class="pixel-box p-1.5 bg-red-950/70 border-red-700/80 flex items-center justify-between gap-1.5">
            <div class="flex items-center gap-1.5 overflow-hidden">
              <span class="text-sm animate-pulse">🆘</span>
              <div class="overflow-hidden">
                <div class="text-[10px] font-bold text-red-300 truncate">${t.name}</div>
                <div class="text-[8px] text-amber-300 truncate">บอส: ${t.townData?.monsterName || 'มอนสเตอร์'} (${t.townData?.monsterHp} HP)</div>
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
              <div class="text-[10px] font-bold text-amber-200 truncate">${b.name}</div>
              <div class="text-[8px] text-slate-300 truncate">${b.subRegionName || 'บอสประจำภูมิภาค'}</div>
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
              <div class="text-[10px] font-bold text-indigo-200 truncate">[${p.activeGuildQuest.rank}] ${p.activeGuildQuest.title}</div>
              <div class="text-[8px] text-slate-300">ความคืบหน้า: ${p.activeGuildQuest.currentProgress}/${p.activeGuildQuest.targetCount}</div>
            </div>
          </div>
          <span class="text-[8px] bg-indigo-800 text-indigo-200 px-1 py-0.5 rounded font-bold shrink-0">กิลด์</span>
        </div>
      `;
    }

    if (occupiedTowns.length === 0 && bossNodes.length === 0 && !p.activeGuildQuest) {
      html = `<div class="text-slate-400 text-[9px] italic text-center py-2">ดินแดนสงบสุข ไม่มีวิกฤตเร่งด่วนในขณะนี้</div>`;
    }

    listEl.innerHTML = html;

    // Attach click-to-focus camera
    listEl.querySelectorAll('.focus-node-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const nodeId = parseInt((e.currentTarget as HTMLElement).getAttribute('data-node-id') || '0', 10);
        const targetNode = this.game.allNodes.find(n => n.id === nodeId);
        if (targetNode && this.onFocusNodeCallback) {
          this.onFocusNodeCallback(targetNode);
        }
      });
    });
  }

  private renderAvatar() {
    const p = this.game.activePlayer;
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
    this.avatarCtx.drawImage(sprite, -16, -16, 80, 80);
  }

  private renderMinimap() {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / 36;
    const scaleY = h / 32;

    // Draw lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    this.game.allNodes.forEach(node => {
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = this.game.allNodes.find(n => n.id === nId);
          if (target) {
            ctx.beginPath();
            ctx.moveTo(node.gx * scaleX, node.gy * scaleY);
            ctx.lineTo(target.gx * scaleX, target.gy * scaleY);
            ctx.stroke();
          }
        }
      });
    });

    // Draw spaces
    this.game.allNodes.forEach(node => {
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
      ctx.fillRect(node.gx * scaleX - 2, node.gy * scaleY - 2, 4, 4);
    });

    // Draw players
    this.game.players.forEach(pl => {
      ctx.fillStyle = pl.isDarkling ? '#f43f5e' : pl.color;
      ctx.beginPath();
      ctx.arc(pl.gridX * scaleX, pl.gridY * scaleY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
