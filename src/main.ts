import { GameState } from './game/GameState';
import { IsometricRenderer } from './engine/IsometricRenderer';
import { HUD } from './ui/HUD';
import { BattleUI } from './ui/BattleUI';
import { TownUI } from './ui/TownUI';
import { ShopUI, SHOP_CATALOG } from './ui/ShopUI';
import { PrankUI } from './ui/PrankUI';
import { WeeklyReportUI } from './ui/WeeklyReportUI';
import { IsekaiEventUI } from './ui/IsekaiEventUI';
import { HERO_CLASSES, HERO_SKINS, Player, FIELD_SPELLS } from './game/Player';
import { EquipmentItem, pixelSprites } from './engine/PixelSpriteGenerator';
import { BoardNode } from './game/BoardMap';
import { Combatant } from './game/BattleEngine';
import { townManager } from './game/TownManager';
import { darklingSystem } from './game/DarklingSystem';
import { aiSystem } from './game/AISystem';
import { audio } from './engine/AudioSynthesizer';
import { royalDecreeSystem } from './game/RoyalDecreeSystem';
import { isekaiEventManager } from './game/IsekaiEventManager';
import { worldCalamitySystem } from './game/WorldCalamitySystem';
import { ecosystemSystem } from './game/EcosystemSystem';

import { WonderChestUI } from './ui/WonderChestUI';
import { InspectUI } from './ui/InspectUI';
import { HomeUI } from './ui/HomeUI';
import { FantasyEventUI } from './ui/FantasyEventUI';
import { getNodeEncounterPreview } from './game/MonsterDatabase';
import { SaveManager } from './game/SaveManager';


class DokaponApp {
  private canvas: HTMLCanvasElement;
  private renderer: IsometricRenderer;
  private game: GameState;
  private hud: HUD;
  private battleUI: BattleUI;
  private townUI: TownUI;
  private shopUI: ShopUI;
  private prankUI: PrankUI;
  private weeklyReportUI: WeeklyReportUI;
  private isekaiEventUI: IsekaiEventUI;
  private wonderChestUI: WonderChestUI;
  private inspectUI: InspectUI;
  private homeUI: HomeUI;
  private fantasyEventUI: FantasyEventUI;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialDownX = 0;
  private initialDownY = 0;
  private hasMovedWhileDragging = false;
  private bossCurrentHp = 380;
  private bossMaxHp = 380;
  private worldMapFilter: string = 'all';
  private mapTransform = { minGx: 0, minGy: 0, scale: 1, offsetX: 0, offsetY: 0 };

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new IsometricRenderer(this.canvas);
    this.game = new GameState();

    this.hud = new HUD(this.game);
    this.battleUI = new BattleUI(this.game);
    this.townUI = new TownUI(this.game);
    this.shopUI = new ShopUI(this.game);
    this.prankUI = new PrankUI(this.game);
    this.weeklyReportUI = new WeeklyReportUI(this.game);
    this.isekaiEventUI = new IsekaiEventUI(this.game);
    this.wonderChestUI = new WonderChestUI(this.game);
    this.inspectUI = new InspectUI(this.game);
    this.homeUI = new HomeUI(this.game);
    this.fantasyEventUI = new FantasyEventUI(this.game);

    this.hud.onInspectPlayerCallback = (pl) => {
      this.inspectUI.openInspect(pl);
    };

    this.hud.onFocusNodeCallback = (node) => {
      this.renderer.centerCameraOn(node.gx, node.gy, node.gz);
      this.renderer.hoveredNodeId = node.id;
      audio.click();
    };

    this.initCanvasResize();
    this.bindDOMEvents();
    this.bindInteractiveTileSelection();
    this.renderRosterSetup(3);
    this.updateTitleSaveStatus();
  }

  private initCanvasResize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.renderer.ctx.imageSmoothingEnabled = false;

      const bCanvas = document.getElementById('battleCanvas') as HTMLCanvasElement;
      if (bCanvas && bCanvas.parentElement) {
        bCanvas.width = bCanvas.parentElement.clientWidth || 800;
        bCanvas.height = bCanvas.parentElement.clientHeight || 450;
      }

      const wCanvas = document.getElementById('worldMapCanvas') as HTMLCanvasElement;
      if (wCanvas && wCanvas.parentElement) {
        wCanvas.width = wCanvas.parentElement.clientWidth || 800;
        wCanvas.height = wCanvas.parentElement.clientHeight || 500;
      }
    };

    window.addEventListener('resize', resize);
    resize();
  }

  // =========================================================================
  // INTERACTIVE CLICK-TO-MOVE TILE SELECTION ON THE 2.5D BOARD
  // =========================================================================
  private bindInteractiveTileSelection() {
    // Mouse hover over 2.5D isometric tiles
    this.canvas.addEventListener('mousemove', e => {
      if (this.isDragging || this.game.phase === 'MOVING' || this.game.phase === 'TITLE') {
        this.inspectUI.hideMoveDestinationPreview();
        return;
      }

      const hoveredNode = this.renderer.screenToNode(e.clientX, e.clientY, this.game.allNodes, this.game.highlightedNodes);

      if (hoveredNode && this.game.highlightedNodes.includes(hoveredNode.id)) {
        this.renderer.hoveredNodeId = hoveredNode.id;
        this.canvas.style.cursor = 'pointer';

        // Monster Encounter & Stat Preview Tooltip
        this.inspectUI.showMoveDestinationPreview(hoveredNode, this.game.activePlayer, e.clientX, e.clientY);

        // Calculate and preview path
        let path = this.game.findPathToTarget(hoveredNode.id);
        if (!path || path.length <= 1) {
          path = [this.game.activePlayer.nodeId, hoveredNode.id];
        }
        this.renderer.previewPathNodeIds = path || [];

        // Turn hero dynamically to face path direction
        if (path && path.length > 1) {
          const nextNode = this.game.allNodes.find(n => n.id === path[1]);
          if (nextNode) {
            const p = this.game.activePlayer;
            p.facing = this.game.calculateIsoDirection(nextNode.gx - p.gridX, nextNode.gy - p.gridY);
          }
        }
      } else {
        this.renderer.hoveredNodeId = null;
        this.renderer.previewPathNodeIds = [];
        this.inspectUI.hideMoveDestinationPreview();
        this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
      }
    });

    // Click on destination tile to move
    this.canvas.addEventListener('click', e => {
      // Don't trigger if user was panning/dragging the camera
      if (this.hasMovedWhileDragging) {
        this.hasMovedWhileDragging = false;
        return;
      }

      if (this.game.remainingMoves <= 0 || this.game.phase === 'MOVING') return;

      const clickedNode = this.renderer.screenToNode(e.clientX, e.clientY, this.game.allNodes, this.game.highlightedNodes);
      if (clickedNode && this.game.highlightedNodes.includes(clickedNode.id)) {
        let path = this.game.findPathToTarget(clickedNode.id);
        if (!path || path.length <= 1) {
          path = [this.game.activePlayer.nodeId, clickedNode.id];
        }
        if (path && path.length > 1) {
          this.inspectUI.hideMoveDestinationPreview();

          // Pre-combat scouting check: if a rival player is standing on this tile, scout them first!
          const rival = this.game.players.find(
            pl => pl.id !== this.game.activePlayer.id && pl.nodeId === clickedNode.id && pl.hp > 0
          );

          if (rival && !this.game.activePlayer.isAI) {
            this.inspectUI.openDuelScouting(
              this.game.activePlayer,
              rival,
              clickedNode.name,
              () => {
                // Confirmed move to battle rival!
                audio.coin();
                this.renderer.hoveredNodeId = null;
                this.renderer.previewPathNodeIds = [];
                this.game.executePath(
                  path,
                  () => this.onMoveStep(),
                  tile => this.handleTileArrival(tile)
                );
              },
              () => {
                // Cancelled, pick another move
              }
            );
            return;
          }

          // Pre-combat monster scouting check: if node is town occupied by monster or boss lair!
          const preview = getNodeEncounterPreview(clickedNode);
          if (
            preview.featuredMonster &&
            (clickedNode.townData?.isOccupiedByMonster || clickedNode.type === 'boss') &&
            !this.game.activePlayer.isAI
          ) {
            this.inspectUI.openMonsterScouting(
              preview.featuredMonster,
              clickedNode,
              this.game.activePlayer,
              () => {
                audio.coin();
                this.renderer.hoveredNodeId = null;
                this.renderer.previewPathNodeIds = [];
                this.game.executePath(
                  path,
                  () => this.onMoveStep(),
                  tile => this.handleTileArrival(tile)
                );
              },
              () => {
                // Cancelled, pick another route
              }
            );
            return;
          }

          audio.coin();
          this.renderer.hoveredNodeId = null;
          this.renderer.previewPathNodeIds = [];

          // Execute full path chosen by player!
          this.game.executePath(
            path,
            () => this.onMoveStep(),
            tile => this.handleTileArrival(tile)
          );
        }
      }
    });
  }

  private bindDOMEvents() {

    // Title Screen Start
    document.getElementById('btnStartAdventure')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('titleButtonsBlock')?.classList.add('hidden');
      document.getElementById('playerSetupBlock')?.classList.remove('hidden');
    });

    document.getElementById('btnBackToMenu')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('playerSetupBlock')?.classList.add('hidden');
      document.getElementById('titleButtonsBlock')?.classList.remove('hidden');
      this.updateTitleSaveStatus();
    });

    // Title Screen Load Game
    document.getElementById('btnTitleLoadGame')?.addEventListener('click', () => {
      audio.click();
      this.loadGameProgress();
    });

    // Party size buttons
    document.querySelectorAll('.player-count-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        audio.click();
        document.querySelectorAll('.player-count-btn').forEach(b => {
          b.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold');
          b.classList.add('text-slate-300');
        });
        const target = e.currentTarget as HTMLElement;
        target.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
        target.classList.remove('text-slate-300');
        const count = parseInt(target.getAttribute('data-count') || '3');
        this.renderRosterSetup(count);
      });
    });

    // Begin Game
    document.getElementById('btnBeginGame')?.addEventListener('click', () => {
      audio.fanfare();
      this.startGame();
    });

    // Roll Dice button
    document.getElementById('btnRollDice')?.addEventListener('click', () => {
      if (this.game.phase === 'BOARD_TURN' && !this.game.activePlayer.isAI) {
        this.triggerDiceRoll();
      }
    });

    // Multi-Spinner usage
    document.getElementById('btnUseSpinner')?.addEventListener('click', () => {
      audio.click();
      const p = this.game.activePlayer;
      const spinners = p.inventory.filter(i => i.type === 'spinner');
      if (spinners.length === 0) {
        this.game.addLog(`ไม่มี Multi-Spinners ในกระเป๋า! ซื้อได้ที่ร้านค้า`);
        return;
      }
      const spin = spinners[0];
      p.activeSpinnerMultiplier = spin.id === 'spin_3' ? 3 : 2;
      p.inventory.splice(p.inventory.indexOf(spin), 1);
      audio.coin();
      this.game.addLog(`🌀 ใช้ ${spin.name}! การทอยครั้งหน้าจะใช้ลูกเต๋า ${p.activeSpinnerMultiplier} ลูก!`, 'level');
    });

    // Toggle Chiptune BGM
    document.getElementById('btnToggleBgm')?.addEventListener('click', () => {
      const isEnabled = audio.toggleBgm();
      const btn = document.getElementById('btnToggleBgm')!;
      btn.innerText = isEnabled ? '🎵' : '🔇';
      this.game.addLog(isEnabled ? '🎵 เปิดเสียง BGM' : '🔇 ปิดเสียง BGM');
    });

    // Field Magic / Darkling Calamity button
    document.getElementById('btnFieldMagic')?.addEventListener('click', () => {
      audio.click();
      const p = this.game.activePlayer;
      if (p.isDarkling) {
        document.getElementById('darklingSpellsModal')?.classList.remove('hidden');
      } else {
        this.openFieldMagicModal();
      }
    });

    document.getElementById('btnCloseFieldMagic')?.addEventListener('click', () => {
      document.getElementById('fieldMagicModal')?.classList.add('hidden');
    });

    // Darkling Calamities
    document.getElementById('btnCalamityInvade')?.addEventListener('click', () => {
      const msg = darklingSystem.castSummonInvaders(this.game.activePlayer, this.game.allNodes, this.game.players);
      this.game.addLog(msg, 'darkling');
      document.getElementById('darklingSpellsModal')?.classList.add('hidden');
    });
    document.getElementById('btnCalamityPlague')?.addEventListener('click', () => {
      const msg = darklingSystem.castGlobalPlague(this.game.activePlayer, this.game.players);
      this.game.addLog(msg, 'darkling');
      document.getElementById('darklingSpellsModal')?.classList.add('hidden');
    });
    document.getElementById('btnCalamityWarp')?.addEventListener('click', () => {
      const res = darklingSystem.castDemonWarp(this.game.activePlayer, this.game.players, this.game.allNodes);
      this.game.addLog(res.message, 'darkling');
      document.getElementById('darklingSpellsModal')?.classList.add('hidden');
      this.renderer.centerCameraOn(this.game.activePlayer.gridX, this.game.activePlayer.gridY, this.game.activePlayer.gridZ);
    });
    document.getElementById('btnCloseDarklingSpells')?.addEventListener('click', () => {
      document.getElementById('darklingSpellsModal')?.classList.add('hidden');
    });

    // Center on Hero
    document.getElementById('btnCenterCam')?.addEventListener('click', () => {
      audio.click();
      const p = this.game.activePlayer;
      this.renderer.focusOnPlayer(p.gridX, p.gridY, p.gridZ);
    });


    // World Map Atlas
    document.getElementById('btnWorldMap')?.addEventListener('click', () => {
      audio.click();
      this.openWorldMapAtlas();
    });
    document.getElementById('btnCloseWorldMap')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('worldMapModal')?.classList.add('hidden');
      document.getElementById('worldMapTooltip')?.classList.add('hidden');
    });

    // Inspect Hero Button
    document.getElementById('btnInspectHero')?.addEventListener('click', () => {
      audio.click();
      this.inspectUI.openInspect(this.game.activePlayer);
    });

    this.bindWorldMapEvents();

    // Canvas Panning (Drag) with smooth continental clamping
    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.hasMovedWhileDragging = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialDownX = e.clientX;
      this.initialDownY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (this.isDragging) {
        const totalDist = Math.hypot(e.clientX - this.initialDownX, e.clientY - this.initialDownY);
        if (totalDist > 8) {
          this.hasMovedWhileDragging = true;
        }
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.renderer.camera.x -= dx;
        this.renderer.camera.y -= dy;
        this.renderer.camera.targetX = this.renderer.camera.x;
        this.renderer.camera.targetY = this.renderer.camera.y;
        this.renderer.clampCameraBounds();
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
      }
    });
    window.addEventListener('mouseup', e => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
      const totalDist = Math.hypot(e.clientX - this.initialDownX, e.clientY - this.initialDownY);
      if (totalDist <= 8) {
        this.hasMovedWhileDragging = false;
      }
    });

    // Inventory button

    document.getElementById('btnInventory')?.addEventListener('click', () => {
      audio.click();
      this.openInventory();
    });
    document.getElementById('btnCloseInventory')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('inventoryModal')?.classList.add('hidden');
    });

    // Chronicle Log & Live Event Feed toggle (Middle-Left of Screen)
    let isEventFeedMinimized = false;
    document.getElementById('btnToggleEventFeed')?.addEventListener('click', () => {
      audio.click();
      const list = document.getElementById('gameEventFeedList');
      const btnMin = document.getElementById('btnMinimizeEventFeed');
      if (!list || !btnMin) return;
      isEventFeedMinimized = !isEventFeedMinimized;
      if (isEventFeedMinimized) {
        list.classList.add('hidden');
        btnMin.innerText = '▲';
      } else {
        list.classList.remove('hidden');
        btnMin.innerText = '▼';
      }
    });

    document.getElementById('btnToggleLog')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('gameEventFeedWindow')?.classList.toggle('hidden');
    });

    // Settings & Rules
    document.getElementById('btnSettings')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('settingsModal')?.classList.remove('hidden');
    });
    document.getElementById('btnHowToPlay')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('settingsModal')?.classList.remove('hidden');
    });
    document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
      document.getElementById('settingsModal')?.classList.add('hidden');
    });
    document.getElementById('btnConfirmSettings')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('settingsModal')?.classList.add('hidden');
    });

    // In-game Save & Load Handlers
    document.getElementById('btnSaveGame')?.addEventListener('click', () => {
      this.saveGameProgress(true);
    });
    document.getElementById('btnSettingsSave')?.addEventListener('click', () => {
      this.saveGameProgress(true);
    });
    document.getElementById('btnSettingsLoad')?.addEventListener('click', () => {
      this.loadGameProgress();
    });
    document.getElementById('btnSettingsResetSave')?.addEventListener('click', () => {
      this.resetSavedGame();
    });

    // Audio & scanline settings
    document.getElementById('checkSound')?.addEventListener('change', e => {
      audio.enabled = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('checkScanlines')?.addEventListener('change', e => {
      document.getElementById('scanlineOverlay')!.style.display = (e.target as HTMLInputElement).checked
        ? 'block'
        : 'none';
    });

    // Play again
    document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
      location.reload();
    });
  }

  private renderRosterSetup(playerCount: number) {

    const container = document.getElementById('playerSetupRoster')!;
    container.innerHTML = '';
    const defaultNames = ['Valeria', 'Lyra', 'Jaxine', 'Aria'];
    const classKeys = Object.keys(HERO_CLASSES);

    for (let i = 0; i < playerCount; i++) {
      const card = document.createElement('div');
      card.className = 'player-setup-card pixel-box p-3 bg-slate-900 border-slate-700 flex flex-col gap-2 shadow';
      card.dataset.playerIndex = `${i}`;
      card.dataset.skinVariant = '0';

      const initialClass = classKeys[i % classKeys.length];

      card.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚔️</span>
            <span>PLAYER ${i + 1}</span>
          </span>
          <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer hover:text-amber-300">
            <input type="checkbox" class="is-ai-check accent-amber-500 cursor-pointer" ${i > 0 ? 'checked' : ''}>
            <span>AI Bot</span>
          </label>
        </div>
        <div class="flex gap-3 items-center">
          <!-- Live Preview Avatar -->
          <div class="w-14 h-14 bg-slate-950 border-2 border-amber-600/60 rounded flex items-center justify-center relative overflow-hidden shadow-inner flex-shrink-0">
            <canvas class="roster-preview-canvas w-12 h-12 image-pixelated"></canvas>
          </div>
          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ชื่อ (Name)</span>
              <input type="text" maxlength="12" class="player-name-input bg-slate-950 border border-slate-700 text-xs px-2 py-1.5 rounded text-white w-full min-w-0 outline-none focus:border-amber-400" value="${defaultNames[i] || `Hero ${i + 1}`}">
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">อาชีพ (Class)</span>
              <select class="player-class-select bg-slate-950 border border-slate-700 text-xs px-2 py-1.5 rounded text-amber-400 w-full min-w-0 outline-none cursor-pointer">
                ${classKeys
                  .map(
                    ck =>
                      `<option value="${ck}" ${ck === initialClass ? 'selected' : ''}>${HERO_CLASSES[ck].name} ${HERO_CLASSES[ck].avatar}</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>
        </div>
        <!-- Appearance / Skin Customization Selector -->
        <div class="flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800">
          <span class="text-[9px] text-slate-400 font-bold flex items-center gap-1">
            <span>🎨</span>
            <span>รูปลักษณ์:</span>
          </span>
          <div class="flex items-center gap-1.5">
            <button type="button" class="btn-prev-skin pixel-btn px-2 py-0.5 text-xs text-amber-300 font-bold" title="สกินก่อนหน้า">◀</button>
            <span class="skin-name-label text-[10px] text-amber-300 font-semibold min-w-[130px] max-w-[160px] text-center truncate"></span>
            <button type="button" class="btn-next-skin pixel-btn px-2 py-0.5 text-xs text-amber-300 font-bold" title="สกินถัดไป">▶</button>
          </div>
        </div>
      `;
      container.appendChild(card);

      const classSelect = card.querySelector('.player-class-select') as HTMLSelectElement;
      const skinLabel = card.querySelector('.skin-name-label') as HTMLElement;
      const btnPrev = card.querySelector('.btn-prev-skin') as HTMLButtonElement;
      const btnNext = card.querySelector('.btn-next-skin') as HTMLButtonElement;
      const previewCanvas = card.querySelector('.roster-preview-canvas') as HTMLCanvasElement;
      previewCanvas.width = 48;
      previewCanvas.height = 48;
      const pCtx = previewCanvas.getContext('2d')!;

      const updateSkinDisplay = () => {
        const ck = classSelect.value;
        const skins = HERO_SKINS[ck] || HERO_SKINS['warrior'] || [];
        let variant = parseInt(card.dataset.skinVariant || '0', 10);
        if (variant >= skins.length) variant = 0;
        if (variant < 0) variant = skins.length - 1;
        card.dataset.skinVariant = `${variant}`;

        const currentSkin = skins[variant] || { name: 'ค่าเริ่มต้น' };
        skinLabel.innerText = currentSkin.name;

        // Render live preview
        pCtx.clearRect(0, 0, 48, 48);
        pCtx.imageSmoothingEnabled = false;
        const sprite = pixelSprites.getHeroSprite(ck, 'SE', 'idle', 0, {}, false, undefined, variant);
        pCtx.drawImage(sprite, -24, -24, 96, 96);
      };

      classSelect.addEventListener('change', () => {
        card.dataset.skinVariant = '0';
        updateSkinDisplay();
      });

      btnPrev.addEventListener('click', () => {
        audio.click();
        const ck = classSelect.value;
        const skins = HERO_SKINS[ck] || HERO_SKINS['warrior'] || [];
        let variant = parseInt(card.dataset.skinVariant || '0', 10);
        variant = (variant - 1 + skins.length) % skins.length;
        card.dataset.skinVariant = `${variant}`;
        updateSkinDisplay();
      });

      btnNext.addEventListener('click', () => {
        audio.click();
        const ck = classSelect.value;
        const skins = HERO_SKINS[ck] || HERO_SKINS['warrior'] || [];
        let variant = parseInt(card.dataset.skinVariant || '0', 10);
        variant = (variant + 1) % skins.length;
        card.dataset.skinVariant = `${variant}`;
        updateSkinDisplay();
      });

      updateSkinDisplay();
    }
  }

  private startGame() {
    const cards = document.querySelectorAll('.player-setup-card') as NodeListOf<HTMLElement>;
    const nameInputs = document.querySelectorAll('.player-name-input') as NodeListOf<HTMLInputElement>;
    const classSelects = document.querySelectorAll('.player-class-select') as NodeListOf<HTMLSelectElement>;
    const aiChecks = document.querySelectorAll('.is-ai-check') as NodeListOf<HTMLInputElement>;
    const winGoal = (document.getElementById('selectWinGoal') as HTMLSelectElement).value;

    const defaultHeroines = ['Valeria', 'Lyra', 'Jaxine', 'Aria'];
    const partyConfig = Array.from(nameInputs).map((input, idx) => ({
      name: input.value.trim() || defaultHeroines[idx] || `Heroine ${idx + 1}`,
      classKey: classSelects[idx].value,
      isAI: aiChecks[idx].checked,
      skinVariant: parseInt(cards[idx]?.dataset.skinVariant || '0', 10)
    }));

    this.game.initGame(partyConfig, winGoal);

    document.getElementById('titleScreen')?.classList.add('hidden');
    document.getElementById('topHUD')?.classList.remove('hidden');
    document.getElementById('bottomBar')?.classList.remove('hidden');
    document.getElementById('gameEventFeedWindow')?.classList.remove('hidden');

    this.onTurnStarted();

    if (this.game.activePlayer.isAI) {
      setTimeout(() => this.triggerDiceRoll(), 1200);
    }
  }

  private triggerDiceRoll() {
    const totalRoll = this.game.rollMovementDice();

    const diceModal = document.getElementById('diceRollModal')!;
    const diceCube = document.getElementById('diceCube')!;
    const diceResultText = document.getElementById('diceResultText')!;

    diceModal.classList.remove('hidden');
    diceCube.classList.add('dice-rolling');
    diceResultText.innerText = 'กำลังทอย...';

    let count = 0;
    const interval = setInterval(() => {
      audio.diceRoll();
      diceCube.innerText = `${Math.floor(Math.random() * 6) + 1}`;
      count++;

      if (count > 7) {
        clearInterval(interval);
        diceCube.classList.remove('dice-rolling');
        diceCube.innerText = `${totalRoll}`;
        diceResultText.innerText = `คุณทอยได้ ${totalRoll}!`;
        audio.coin();

        setTimeout(() => {
          diceModal.classList.add('hidden');
          this.game.updateReachableHighlights();

          if (this.game.activePlayer.isAI) {
            // AI intelligently picks best destination (last-hit towns, PvP, shops)
            const chosenTarget = aiSystem.chooseRoute(
              this.game.highlightedNodes,
              this.game.activePlayer,
              this.game.allNodes,
              this.game.players
            );
            const path = this.game.findPathToTarget(chosenTarget);
            if (path) {
              this.game.executePath(
                path,
                () => this.onMoveStep(),
                tile => this.handleTileArrival(tile)
              );
            }
          } else {
            this.game.addLog(`👉 คลิกที่จุดหมายปลายทางที่สว่างบนแผนที่เพื่อเดินไปที่นั่น!`, 'level');
          }
        }, 800);
      }
    }, 70);
  }

  private onMoveStep() {
    const p = this.game.activePlayer;
    this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
    this.renderer.spawnFootstepDust(p.gridX, p.gridY, p.gridZ);
    this.hud.update();
  }

  private handleTileArrival(tile: BoardNode) {
    const p = this.game.activePlayer;
    this.game.addLog(`${p.displayName} เหยียบ ${tile.name} (${tile.type.toUpperCase()})`);

    // 1. Check for PvP Collision!
    const rival = this.game.players.find(other => other.id !== p.id && other.nodeId === p.nodeId);
    if (rival) {
      this.initiatePvPDuel(p, rival);
      return;
    }

    // 2. Execute Tile Events
    switch (tile.type) {
      case 'town':
        if (tile.townData?.isOccupiedByMonster) {
          this.initiateTownLiberationBattle(tile);
        } else {
          this.townUI.open(
            tile,
            () => this.advanceTurn(),
            robbedTown => this.initiateTownRobberyBattle(robbedTown)
          );
        }
        break;

      case 'shop_item':
      case 'shop_weapon':
      case 'shop_magic':
        this.shopUI.open(tile.type, () => this.advanceTurn());
        break;

      case 'home':
        this.homeUI.openHome(tile, p, () => this.advanceTurn());
        break;

      case 'blue':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'red':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'church':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'dark_gate':
        if (darklingSystem.canTransform(p, this.game.players, this.game.allNodes)) {
          document.getElementById('darklingPactModal')?.classList.remove('hidden');
        } else {
          this.game.addLog(`แท่นบูชาแห่ง Rico ยังคงเงียบงัน มีเพียงลอร์ดผู้ต่ำต้อยที่สุดเท่านั้นที่สามารถทำสัญญามืดได้`);
        }
        this.advanceTurn();
        break;

      case 'mystery_chest':
        this.wonderChestUI.open(p, () => this.advanceTurn());
        break;

      case 'vault':
        const loot = 90 + Math.floor(Math.random() * 110);
        p.gold += loot;
        audio.chestOpen();
        this.game.addLog(`🎁 ห้องนิรภัยโบราณ! ${p.displayName} งัดห้องนิรภัยและได้เงิน ${loot}G!`, 'gold');
        this.advanceTurn();
        break;

      case 'boss':
        if (!p.companion && Math.random() < 0.50) {
          this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        } else {
          this.initiateBossBattle();
        }
        break;

      case 'tavern':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'guild':
        this.isekaiEventUI.openGuild(p, () => this.advanceTurn());
        break;

      case 'fishing':
        this.isekaiEventUI.openFishing(
          p,
          () => this.advanceTurn(),
          monsterName => this.initiateFishCombat(monsterName)
        );
        break;

      case 'isekai_event':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'empty':
      default:
        if (tile.homeData) {
          this.homeUI.openHome(tile, p, () => this.advanceTurn());
        } else if (p.homeNodeId === null && p.gold >= 150) {
          this.homeUI.openHome(
            tile,
            p,
            () => this.advanceTurn(),
            () => {
              // If skipped buying plot, resolve empty tile event
              this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
            }
          );
        } else if (Math.random() < 0.70) {
          this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        } else {
          this.initiateRandomEncounter(tile);
        }
        break;
    }
  }

  private initiatePvPDuel(challenger: Player, rival: Player) {
    this.game.addLog(`⚔️ ปะทะ PVP! ${challenger.displayName} เผชิญหน้ากับ ${rival.displayName}! DOKAPON DUEL!`, 'battle');

    const rivalCombatant: Combatant = {
      name: rival.displayName,
      hp: rival.hp,
      maxHp: rival.maxHp,
      mp: rival.mp,
      maxMp: rival.maxMp,
      atk: rival.getTotalStat('atk'),
      def: rival.getTotalStat('def'),
      mag: rival.getTotalStat('mag'),
      spd: rival.getTotalStat('spd'),
      luk: rival.getTotalStat('luk'),
      isPvP: true,
      playerRef: rival,
      classKey: rival.classKey,
      skillName: rival.skillName
    };

    this.battleUI.startBattle(rivalCombatant, (winner, loser) => {
      const loserPlayer = (winner.playerRef?.id === challenger.id) ? rival : challenger;
      const winnerPlayer = (winner.playerRef?.id === challenger.id) ? challenger : rival;

      // Check if loser surrendered peacefully (HP > 0)
      if (loserPlayer.hp > 0) {
        const tributeGold = Math.floor(loserPlayer.gold * 0.30);
        loserPlayer.gold -= tributeGold;
        winnerPlayer.gold += tributeGold;
        this.game.addLog(`🏳️ ยอมจำนนอย่างมีเกียรติ! ${loserPlayer.displayName} มอบเงินบรรณาการ ${tributeGold}G ให้แก่ ${winnerPlayer.displayName} ยุติศึกโดยไม่ต้องเข้าโรงพยาบาล!`, 'battle');
        this.advanceTurn();
        return;
      }

      // Respawn knocked-out player at personal Home (if owned) or Dokapon Castle
      this.respawnPlayer(loserPlayer, winnerPlayer.displayName, 0);

      this.prankUI.open(winnerPlayer, loserPlayer, () => this.advanceTurn());
    });
  }

  private respawnPlayer(player: Player, causeName: string, lostGold: number) {
    if (player.homeNodeId !== null) {
      const homeNode = this.game.allNodes.find(n => n.id === player.homeNodeId);
      if (homeNode) {
        player.nodeId = homeNode.id;
        player.gridX = homeNode.gx;
        player.gridY = homeNode.gy;
        player.gridZ = homeNode.gz;
        player.hp = player.maxHp; // Safe haven Home provides 100% full recovery!
        player.mp = player.maxMp;
        this.game.addLog(
          `🏡 จุดเกิดใหม่บ้านพัก! ${player.displayName} พ่ายแพ้ต่อ ${causeName} (สูญเสีย ${lostGold}G) แต่วาร์ปกลับมารักษาตัวที่บ้านพักส่วนตัวอันอบอุ่นจนฟื้นฟูเต็ม 100%!`,
          'battle'
        );
        return;
      }
    }

    const castleNode = this.game.allNodes.find(n => n.id === 0) || this.game.allNodes[0];
    player.nodeId = castleNode.id;
    player.gridX = castleNode.gx;
    player.gridY = castleNode.gy;
    player.gridZ = castleNode.gz;
    player.hp = Math.max(1, Math.floor(player.maxHp * 0.5));
    this.game.addLog(
      `🚑 ${player.displayName} ถูก ${causeName} ปราบลง เสียเงินสด ${lostGold}G และถูกส่งกลับไปรักษาตัวที่ Dokapon Castle! (ฟื้นฟู 50%)`,
      'battle'
    );
  }


  private awardMonsterLoot(
    player: Player,
    monsterName: string,
    isTownBoss = false,
    isCalamityBoss = false
  ): { gold: number; xp: number; droppedItem?: EquipmentItem } {
    let gold = 45 + Math.floor(Math.random() * 45);
    let xp = 50 + Math.floor(Math.random() * 30);
    let dropChance = 0.40;

    if (isCalamityBoss) {
      gold = 400 + Math.floor(Math.random() * 250);
      xp = 350;
      dropChance = 1.0;
    } else if (isTownBoss) {
      gold = 150 + Math.floor(Math.random() * 120);
      xp = 120;
      dropChance = 0.75;
    }

    player.gold += gold;
    player.gainXP(xp);

    let droppedItem: EquipmentItem | undefined = undefined;
    if (Math.random() < dropChance && SHOP_CATALOG.length > 0) {
      const availableLoot = isTownBoss || isCalamityBoss
        ? SHOP_CATALOG.filter(it => it.type === 'weapon' || it.type === 'armor' || it.type === 'accessory' || it.id === 'pot_elixir' || it.type === 'spell')
        : SHOP_CATALOG;

      const picked = availableLoot[Math.floor(Math.random() * availableLoot.length)];
      if (picked) {
        droppedItem = { ...picked };
        if (picked.type === 'spell') {
          player.fieldSpells.push(picked.id);
        } else {
          if (player.inventory.length < 12) {
            player.inventory.push(droppedItem);
          } else {
            player.gold += Math.floor(picked.cost * 0.8);
          }
        }
      }
    }

    return { gold, xp, droppedItem };
  }

  private initiateTownLiberationBattle(townNode: BoardNode) {
    const data = townNode.townData!;
    this.game.addLog(`⚔️ ${townNode.name} ถูกยึดครองโดย ${data.monsterName}! ต่อสู้เพื่อปลดปล่อยเมือง!`, 'battle');

    const monsterCombatant: Combatant = {
      name: data.monsterName,
      hp: data.monsterHp,
      maxHp: data.monsterMaxHp || data.monsterHp,
      mp: 30,
      maxMp: 30,
      atk: data.monsterAtk,
      def: data.monsterDef,
      mag: 8,
      spd: 8,
      luk: 6
    };

    this.battleUI.startBattle(monsterCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const rewards = townManager.liberateTown(townNode, winner.playerRef);
        const loot = this.awardMonsterLoot(winner.playerRef, data.monsterName, true, false);
        this.game.addLog(`👑 ปลดปล่อยเมืองสำเร็จ! ${winner.playerRef.displayName} ปลดปล่อย ${townNode.name} (+${rewards.goldReward + loot.gold}G, +${rewards.xpReward + loot.xp} XP)!`, 'level');
        if (loot.droppedItem) {
          this.game.addLog(`🎁 ปลดปล่อยเมืองสำเร็จ! ได้รับรางวัลพิเศษ: "${loot.droppedItem.name}" ${loot.droppedItem.icon}!`, 'level');
        }
        isekaiEventManager.onGameAction(winner.playerRef, 'town');
      } else {
        // Monster survived! Persist remaining HP for last-hit opportunity
        data.monsterHp = Math.max(1, Math.ceil(winner.hp));
        this.game.addLog(`💀 โอกาสลาสช็อต! ${data.monsterName} รอดตายโดยเหลือ ${data.monsterHp}/${monsterCombatant.maxHp} HP! ใครๆ ก็ขโมยคิลได้!`, 'battle');

        if (loser.playerRef) {
          if (loser.hp <= 0) {
            // Player knocked out by town monster!
            const lostGold = Math.floor(loser.playerRef.gold * 0.35);
            loser.playerRef.gold -= lostGold;
            this.respawnPlayer(loser.playerRef, data.monsterName, lostGold);
          } else {
            // Player retreated / fled!
            const bribeGold = Math.floor(loser.playerRef.gold * 0.10);
            loser.playerRef.gold -= bribeGold;
            this.game.addLog(`🏃 ${loser.playerRef.displayName} ล่าถอยออกมาจาก ${townNode.name} ได้ทันเวลา! (เสียเงินล่ออสูร -${bribeGold}G)`, 'battle');
          }
        }
      }
      this.advanceTurn();
    });

  }

  private initiateTownRobberyBattle(townNode: BoardNode) {
    const guardCombatant: Combatant = {
      name: 'Town Captain',
      hp: 95,
      maxHp: 95,
      mp: 20,
      maxMp: 20,
      atk: 18,
      def: 13,
      mag: 5,
      spd: 9,
      luk: 7
    };

    this.battleUI.startBattle(guardCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const previousOwner = this.game.players.find(p => p.id === townNode.townData?.ownerId) || null;
        townManager.transferTownOwnership(townNode, winner.playerRef, previousOwner);
        this.game.addLog(`🏴‍☠️ ยึดเมืองสำเร็จ! ${winner.playerRef.displayName} ทำลายกองกำลังป้อมปราการและยึด ${townNode.name}!`, 'battle');
      }
      this.advanceTurn();
    });
  }

  private initiateRandomEncounter(tile: BoardNode) {
    // Biome-specific authentic monster rosters
    const biomeMonsters: Record<string, string[]> = {
      solaria: ['Forest Goblin Marauder', 'Briar Kobold', 'Royal Slime Bloblet', 'Meadow Wolf', 'Shadow Panther'],
      frostpeak: ['Frost Skeleton Soldier', 'Glacial Yeti Scout', 'Ice Wyrmling', 'Ice Golem', 'Frost Crypt Bat'],
      sunfire: ['Dune Bandit Raider', 'Sandstone Mummy', 'Brimstone Fire Imp', 'Magma Scorpion', 'Obsidian Automaton'],
      abyss: ['Nether Shadow Knight', 'Chaos Slime', 'Abyssal Siren', 'Lesser Kraken', 'Void Bat'],
      steampunk: ['Steampunk Automaton Princess Alice', 'Steam Gear Gunner Victoria', 'Clockwork Maid Nicole'],
      sakura_shrine: ['Kitsune Shrine Maiden Chiyo', 'Sakura Blossom Tengu Ayame', 'Dryad Nymph Alura']
    };

    const roster = biomeMonsters[tile.biome || ''] || biomeMonsters[tile.realmId] || ['Forest Goblin Marauder', 'Royal Slime Bloblet', 'Briar Kobold'];
    const pickedName = roster[Math.floor(Math.random() * roster.length)];

    const monsterCombatant: Combatant = {
      name: pickedName,
      hp: 65 + Math.floor(Math.random() * 40),
      maxHp: 105,
      mp: 25,
      maxMp: 25,
      atk: 13 + Math.floor(Math.random() * 7),
      def: 8 + Math.floor(Math.random() * 6),
      mag: 8,
      spd: 9,
      luk: 6
    };

    this.battleUI.startBattle(monsterCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const loot = this.awardMonsterLoot(winner.playerRef, pickedName, false, false);
        this.game.addLog(`🏆 ${winner.playerRef.displayName} โค่น ${pickedName} (+${loot.gold}G, +${loot.xp} EXP)!`);
        if (loot.droppedItem) {
          this.game.addLog(`🎁 มอนสเตอร์ทำไอเทมตก! ได้รับ "${loot.droppedItem.name}" ${loot.droppedItem.icon}!`, 'level');
        }
        isekaiEventManager.onGameAction(winner.playerRef, 'monster');
      } else if (loser.playerRef) {
        if (loser.hp <= 0) {
          // Player knocked out by wild monster!
          const lostGold = Math.floor(loser.playerRef.gold * 0.35);
          loser.playerRef.gold -= lostGold;
          this.respawnPlayer(loser.playerRef, pickedName, lostGold);
        } else {
          // Player fled successfully!
          const bribeGold = Math.floor(loser.playerRef.gold * 0.10);
          loser.playerRef.gold -= bribeGold;
          this.game.addLog(`🏃 ${loser.playerRef.displayName} หลบหนีจาก ${pickedName} สำเร็จ! (โยนเงินล่อเบี่ยงเบนความสนใจ -${bribeGold}G)`, 'battle');
        }
      }
      this.advanceTurn();
    });

  }

  private initiateFishCombat(monsterName: string) {
    const krakenCombatant: Combatant = {
      name: monsterName,
      hp: 115,
      maxHp: 115,
      mp: 40,
      maxMp: 40,
      atk: 17,
      def: 11,
      mag: 12,
      spd: 10,
      luk: 6
    };

    this.battleUI.startBattle(krakenCombatant, (winner, loser) => {
      if (winner.playerRef) {
        winner.playerRef.gold += 120;
        winner.playerRef.gainXP(80);
        isekaiEventManager.onGameAction(winner.playerRef, 'monster');
        this.game.addLog(`🏆 ${winner.playerRef.displayName} โค่น ${monsterName} (+120G, +80 EXP)!`);
      } else if (loser.playerRef) {
        const lostGold = Math.floor(loser.playerRef.gold * 0.25);
        loser.playerRef.gold -= lostGold;
        this.respawnPlayer(loser.playerRef, monsterName, lostGold);
      }
      this.advanceTurn();
    });
  }

  private initiateBanditCombat() {
    const banditCombatant: Combatant = {
      name: 'Bandit Chief Garak',
      hp: 125,
      maxHp: 125,
      mp: 30,
      maxMp: 30,
      atk: 19,
      def: 12,
      mag: 8,
      spd: 12,
      luk: 8
    };

    this.battleUI.startBattle(banditCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const stolenGold = 160 + Math.floor(Math.random() * 80);
        winner.playerRef.gold += stolenGold;
        winner.playerRef.gainXP(90);
        isekaiEventManager.onGameAction(winner.playerRef, 'monster');
        this.game.addLog(`🏆 ${winner.playerRef.displayName} โค่น Bandit Chief Garak และยึด ${stolenGold}G (+90 EXP)!`);
      } else if (loser.playerRef) {
        const lostGold = Math.floor(loser.playerRef.gold * 0.35);
        loser.playerRef.gold -= lostGold;
        this.respawnPlayer(loser.playerRef, 'Bandit Chief Garak', lostGold);
      }
      this.advanceTurn();
    });
  }

  private initiateBossBattle() {
    this.game.addLog(`⚠️ มังกรโบราณผู้ยิ่งใหญ่จุติลงมา! การต่อสู้แห่งตำนาน! (HP: ${this.bossCurrentHp}/${this.bossMaxHp})`, 'battle');

    const bossCombatant: Combatant = {
      name: 'Dragon Princess Ignis',
      hp: this.bossCurrentHp,
      maxHp: this.bossMaxHp,
      mp: 80,
      maxMp: 80,
      atk: 29,
      def: 18,
      mag: 18,
      spd: 12,
      luk: 10,
      isBoss: true
    };

    this.battleUI.startBattle(bossCombatant, (winner, loser) => {
      if (winner.playerRef) {
        this.bossCurrentHp = 0;
        isekaiEventManager.onGameAction(winner.playerRef, 'boss');
        this.game.addLog(`👑 ${winner.playerRef.displayName} สังหารเจ้าหญิงมังกรเพลิงบรรพกาล! ความรุ่งโรจน์นิรันดร์!`, 'level');
        this.game.phase = 'VICTORY';
        this.triggerVictoryModal(winner.playerRef, 'สังหาร Dragon Princess Ignis');
      } else {
        // Dragon survived! Persist remaining boss HP
        this.bossCurrentHp = Math.max(1, Math.ceil(winner.hp));
        this.game.addLog(`🐉 Dragon Princess Ignis รอดตายโดยเหลือ ${this.bossCurrentHp}/${this.bossMaxHp} HP! ผู้ท้าชิงคนต่อไปสามารถปิดฉากได้!`, 'battle');
        if (loser.playerRef) {
          const lostGold = Math.floor(loser.playerRef.gold * 0.40);
          loser.playerRef.gold -= lostGold;
          this.respawnPlayer(loser.playerRef, 'Dragon Princess Ignis', lostGold);
        }
        this.advanceTurn();
      }
    });
  }

  private advanceTurn() {
    // 1. Process active Food Buff expiration
    const curP = this.game.activePlayer;
    if (curP.foodBuff) {
      curP.foodBuff.turnsRemaining--;
      if (curP.foodBuff.turnsRemaining <= 0) {
        this.game.addLog(`🍽️ บัฟอาหาร "${curP.foodBuff.name}" ของ ${curP.displayName} หมดฤทธิ์แล้ว`);
        curP.foodBuff = null;
      }
    }

    // 2. Advance Living Day / Night Cycle & Ecosystem
    const timeRes = ecosystemSystem.advanceTime();
    if (timeRes.timeChanged) {
      const tInfo = ecosystemSystem.getTimeDisplay();
      this.game.addLog(`⌛ เวลาผ่านไป: ตอนนี้เป็นเวลา ${tInfo.name.toUpperCase()} ${tInfo.icon}! (${tInfo.desc})`, 'level');
    }
    if (timeRes.weatherChanged) {
      this.game.addLog(`🌦️ สภาพอากาศในทวีปเปลี่ยนแปลง: เมฆและลมพัดผ่านทั้งสี่ดินแดน!`);
    }

    this.hud.update();

    // 3. Check for Grand World Calamity triggers
    const calamity = worldCalamitySystem.checkCalamityTriggers(
      this.game.dayCounter,
      this.game.weekCounter,
      this.game.allNodes,
      this.game.players
    );
    if (calamity) {
      this.game.addLog(calamity.headline, 'battle');
      this.isekaiEventUI.openCalamityModal(calamity, () => {
        this.finishAdvanceTurn();
      });
      return;
    }

    this.finishAdvanceTurn();
  }

  private finishAdvanceTurn() {
    this.game.endTurn(() => {
      this.weeklyReportUI.open(() => {
        // Announce King Rico's Royal Decree for the new week!
        this.openRoyalDecreeModal(() => {
          this.game.startTurn();
          this.onTurnStarted();
          if (this.game.activePlayer.isAI) {
            setTimeout(() => this.triggerDiceRoll(), 1200);
          }
        });
      });
    });

    if (this.game.phase === 'BOARD_TURN') {
      this.onTurnStarted();
      if (this.game.activePlayer.isAI) {
        setTimeout(() => this.triggerDiceRoll(), 1200);
      }
    }
  }

  private turnBannerTimeout: any = null;

  private onTurnStarted() {
    const p = this.game.activePlayer;
    // 1. Smoothly center camera on active player without jarring zoom jumps
    this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
    this.hud.update();

    // 2. Display Turn Start Banner
    const banner = document.getElementById('turnStartBanner');
    const titleEl = document.getElementById('turnBannerTitle');
    const subEl = document.getElementById('turnBannerSubtitle');
    const iconEl = document.getElementById('turnBannerIcon');
    if (!banner || !titleEl) return;

    if (this.turnBannerTimeout) clearTimeout(this.turnBannerTimeout);

    if (p.isAI) {
      if (iconEl) iconEl.innerText = '🤖';
      titleEl.innerText = `${p.displayName.toUpperCase()}'S TURN`;
      if (subEl) subEl.innerText = 'AI Bot กำลังวางแผน...';
    } else {
      if (iconEl) iconEl.innerText = p.isDarkling ? '😈' : '⚔️';
      titleEl.innerText = p.isDarkling ? 'เทิร์นของจอมมาร!' : 'เทิร์นของคุณ!';
      if (subEl) subEl.innerText = `${p.displayName} - ทอยลูกเต๋า หรือ ร่ายเวท!`;
    }

    banner.classList.remove('hidden');
    requestAnimationFrame(() => {
      banner.classList.remove('opacity-0', 'scale-95');
      banner.classList.add('opacity-100', 'scale-100');
    });

    this.turnBannerTimeout = setTimeout(() => {
      banner.classList.remove('opacity-100', 'scale-100');
      banner.classList.add('opacity-0', 'scale-95');
      setTimeout(() => banner.classList.add('hidden'), 350);
    }, 1500);

    // Auto-save game state at turn start
    this.saveGameProgress(false);
  }

  private updateTitleSaveStatus() {
    const meta = SaveManager.getSaveMetadata();
    const btnLoad = document.getElementById('btnTitleLoadGame') as HTMLButtonElement | null;
    const metaEl = document.getElementById('titleLoadGameMeta');
    if (!btnLoad) return;
    if (meta) {
      btnLoad.classList.remove('opacity-50', 'cursor-not-allowed');
      btnLoad.classList.add('hover:border-amber-400');
      if (metaEl) {
        metaEl.innerText = `${meta.activeHeroName} (${meta.activeHeroClass} Lv.${meta.activeHeroLevel}) • วันที่ ${meta.day} สัปดาห์ ${meta.week}`;
      }
    } else {
      btnLoad.classList.add('opacity-50');
      if (metaEl) {
        metaEl.innerText = 'ยังไม่มีข้อมูลบันทึก';
      }
    }
  }

  private saveGameProgress(showToast = true) {
    if (this.game.players.length === 0 || this.game.phase === 'TITLE') return;
    const success = SaveManager.save(this.game, {
      currentHp: this.bossCurrentHp,
      maxHp: this.bossMaxHp
    });
    const statusEl = document.getElementById('settingsSaveStatusText');
    if (success) {
      if (showToast) {
        audio.coin();
        this.game.addLog(`💾 บันทึกความคืบหน้าสำเร็จ! (วันที่ ${this.game.dayCounter}, สัปดาห์ที่ ${this.game.weekCounter})`, 'level');
      }
      if (statusEl) {
        statusEl.innerText = `✅ บันทึกสำเร็จล่าสุด: ${new Date().toLocaleTimeString('th-TH')}`;
        statusEl.style.color = '#34d399';
      }
      this.updateTitleSaveStatus();
    } else {
      if (statusEl) {
        statusEl.innerText = '❌ เกิดข้อผิดพลาดในการบันทึก';
        statusEl.style.color = '#f87171';
      }
    }
  }

  private loadGameProgress() {
    if (!SaveManager.hasSave()) {
      audio.hurt();
      alert('ยังไม่มีข้อมูลบันทึกความคืบหน้า');
      return;
    }
    const res = SaveManager.load(this.game);
    if (res.success) {
      if (res.bossState) {
        this.bossCurrentHp = res.bossState.currentHp;
        this.bossMaxHp = res.bossState.maxHp;
      }
      audio.fanfare();
      document.getElementById('titleScreen')?.classList.add('hidden');
      document.getElementById('settingsModal')?.classList.add('hidden');
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');
      document.getElementById('gameEventFeedWindow')?.classList.remove('hidden');

      this.onTurnStarted();
      this.hud.update();
      this.updateTitleSaveStatus();
    } else {
      audio.hurt();
      alert('ไม่สามารถโหลดข้อมูลบันทึกได้');
    }
  }

  private resetSavedGame() {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลเซฟเกมทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      SaveManager.clear();
      audio.hurt();
      const statusEl = document.getElementById('settingsSaveStatusText');
      if (statusEl) {
        statusEl.innerText = '🗑️ ลบข้อมูลเซฟเรียบร้อยแล้ว';
        statusEl.style.color = '#cbd5e1';
      }
      this.updateTitleSaveStatus();
      this.game.addLog('🗑️ ลบข้อมูลเซฟเกมเรียบร้อยแล้ว', 'info');
    }
  }

  private openRoyalDecreeModal(onClose?: () => void) {
    const decree = royalDecreeSystem.activeDecree;
    const modal = document.getElementById('royalDecreeModal');
    if (!modal) {
      if (onClose) onClose();
      return;
    }

    const iconEl = document.getElementById('decreeIcon');
    if (iconEl) iconEl.innerText = decree.icon;
    const titleEl = document.getElementById('decreeTitle');
    if (titleEl) titleEl.innerText = decree.title;
    const headEl = document.getElementById('decreeHeadline');
    if (headEl) headEl.innerText = decree.headline;
    const descEl = document.getElementById('decreeDescription');
    if (descEl) descEl.innerText = decree.description;
    const perkEl = document.getElementById('decreePerk');
    if (perkEl) perkEl.innerText = decree.perkSummary;

    modal.classList.remove('hidden');

    const btn = document.getElementById('btnAcknowledgeDecree');
    const handleAck = () => {
      audio.click();
      modal.classList.add('hidden');
      btn?.removeEventListener('click', handleAck);
      if (onClose) onClose();
    };
    btn?.addEventListener('click', handleAck);
  }

  private openFieldMagicModal() {
    const p = this.game.activePlayer;
    const modal = document.getElementById('fieldMagicModal');
    if (!modal) return;

    // Populate target select with other players
    const select = document.getElementById('fieldSpellTargetSelect') as HTMLSelectElement;
    if (select) {
      select.innerHTML = '';
      const opponents = this.game.players.filter(pl => pl.id !== p.id);
      if (opponents.length === 0) {
        select.innerHTML = '<option value="">ไม่มีคู่แข่ง</option>';
      } else {
        opponents.forEach(op => {
          const opt = document.createElement('option');
          opt.value = `${op.id}`;
          opt.innerText = `${op.displayName} (${op.className}) • ${op.gold}G • ${op.hp}/${op.maxHp} HP`;
          select.appendChild(opt);
        });
      }
    }

    // Populate spell cards
    const listEl = document.getElementById('fieldSpellList')!;
    listEl.innerHTML = '';

    p.fieldSpells.forEach(spellKey => {
      const spell = FIELD_SPELLS[spellKey];
      if (!spell) return;

      const canCast = p.mp >= spell.mpCost;
      const card = document.createElement('div');
      card.className = `pixel-box p-2.5 flex flex-col justify-between ${
        canCast ? 'bg-slate-900 border-purple-500/60 hover:bg-slate-800 cursor-pointer' : 'bg-slate-950/80 border-slate-800 opacity-50'
      }`;

      card.innerHTML = `
        <div class="flex items-start justify-between mb-1">
          <div class="flex items-center gap-1.5">
            <span class="text-xl">${spell.icon}</span>
            <div>
              <span class="text-xs font-bold text-amber-300 block">${spell.name}</span>
              <span class="text-[9px] text-purple-300 font-bold">${spell.mpCost} MP</span>
            </div>
          </div>
          <button class="pixel-btn ${canCast ? 'pixel-btn-purple' : 'bg-slate-800'} px-2 py-0.5 text-[10px] text-white">
            ${canCast ? 'ร่าย ➔' : 'MP ไม่พอ'}
          </button>
        </div>
        <p class="text-[9px] text-slate-300 leading-snug mt-1">${spell.desc}</p>
      `;

      if (canCast) {
        card.addEventListener('click', () => {
          const targetId = spell.requiresTarget && select ? parseInt(select.value) : undefined;
          const res = this.game.castFieldSpell(p, spell.id, targetId);
          const resEl = document.getElementById('fieldSpellResultMsg')!;
          resEl.innerText = res.message;
          resEl.classList.remove('hidden');
          resEl.style.color = res.success ? '#4ade80' : '#f87171';

          this.hud.update();
          if (res.success) {
            this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
            setTimeout(() => {
              modal.classList.add('hidden');
              resEl.classList.add('hidden');
            }, 1200);
          }
        });
      }

      listEl.appendChild(card);
    });

    modal.classList.remove('hidden');
  }

  private triggerVictoryModal(winner: Player, feat: string) {
    audio.fanfare();
    const modal = document.getElementById('victoryModal')!;
    document.getElementById('victorySubtitle')!.innerText = `${winner.displayName} ยิ่งใหญ่ที่สุด!`;
    document.getElementById('victoryStatsSummary')!.innerHTML = `
      <div><strong>ผลงานแห่งชัยชนะ:</strong> ${feat}</div>
      <div><strong>มูลค่าสุทธิสุดท้าย:</strong> ${winner.getNetWorth(this.game.allNodes)} Gold</div>
      <div><strong>เมืองที่ปกครอง:</strong> ${winner.townsControlled} Territories</div>
      <div><strong>เลเวลวีรบุรุษ:</strong> Level ${winner.level} (${winner.className})</div>
    `;
    modal.classList.remove('hidden');
  }

  private openInventory() {
    const p = this.game.activePlayer;
    const modal = document.getElementById('inventoryModal')!;
    document.getElementById('invHeroName')!.innerText = `${p.displayName} • จัดการสัมภาระ`;
    document.getElementById('invHeroStatsSummary')!.innerText = `LV ${p.level} ${p.className} • ${p.gold}G เงิน`;

    // Render Equipped Slots (Weapon, Shield, Armor, Accessory) with Unequip [ถอด] buttons
    const slots = [
      { key: 'weapon' as const, label: '🗡️ อาวุธ', icon: '⚔️' },
      { key: 'shield' as const, label: '🛡️ โล่', icon: '🛡️' },
      { key: 'armor' as const, label: '🦺 เกราะ', icon: '🦺' },
      { key: 'accessory' as const, label: '💍 เครื่องประดับ', icon: '💍' }
    ];

    document.getElementById('equippedSlotsList')!.innerHTML = slots.map(s => {
      const eq = p.equipment[s.key];
      return `
        <div class="p-1.5 bg-slate-950 rounded border border-slate-800 flex justify-between items-center text-xs">
          <div class="flex items-center gap-1.5">
            <span>${s.label}:</span>
            <span class="font-bold ${eq ? 'text-amber-300' : 'text-slate-500'}">${eq ? eq.name : 'ไม่มี'}</span>
          </div>
          ${eq ? `<button class="unequip-btn pixel-btn px-2 py-0.5 text-[9px] bg-slate-800 hover:bg-red-800 text-slate-300 hover:text-white" data-slot="${s.key}">ถอด</button>` : ''}
        </div>
      `;
    }).join('');

    // Unequip handlers
    document.getElementById('equippedSlotsList')!.querySelectorAll('.unequip-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const slot = (e.currentTarget as HTMLElement).getAttribute('data-slot') as 'weapon' | 'shield' | 'armor' | 'accessory';
        const eq = p.equipment[slot];
        if (eq && p.inventory.length < 12) {
          p.equipment[slot] = null;
          p.inventory.push(eq);
          audio.click();
          this.game.addLog(`ถอด ${eq.name} เก็บเข้ากระเป๋า`);
          this.openInventory();
          this.hud.update();
        } else if (p.inventory.length >= 12) {
          this.game.addLog(`กระเป๋าเต็ม! ไม่สามารถถอดอุปกรณ์ได้`);
        }
      });
    });

    document.getElementById('statBreakdownList')!.innerHTML = `
      <div class="flex justify-between"><span>ATK:</span> <strong class="text-white">${p.getTotalStat('atk')}</strong></div>
      <div class="flex justify-between"><span>DEF:</span> <strong class="text-white">${p.getTotalStat('def')}</strong></div>
      <div class="flex justify-between"><span>MAG:</span> <strong class="text-white">${p.getTotalStat('mag')}</strong></div>
      <div class="flex justify-between"><span>SPD:</span> <strong class="text-white">${p.getTotalStat('spd')}</strong></div>
      <div class="flex justify-between"><span>LUK:</span> <strong class="text-white">${p.getTotalStat('luk')}</strong></div>
    `;

    document.getElementById('invCapacityCount')!.innerText = `${p.inventory.length}/12 ช่อง`;
    const bagList = document.getElementById('satchelItemsList')!;
    bagList.innerHTML = '';

    p.inventory.forEach((item, idx) => {
      const isEquip = item.type === 'weapon' || item.type === 'shield' || item.type === 'armor' || item.type === 'accessory';
      const row = document.createElement('div');
      row.className = 'pixel-box p-2 bg-slate-950 border-slate-800 flex justify-between items-center';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xl">${item.icon}</span>
          <div>
            <div class="text-xs text-amber-200 font-bold">${item.name}</div>
            <div class="text-[9px] text-slate-400">${item.desc}</div>
          </div>
        </div>
        <button class="pixel-btn ${isEquip ? 'pixel-btn-gold text-slate-950' : 'pixel-btn-blue text-white'} px-2.5 py-1 text-[10px] font-bold">
          ${isEquip ? 'สวมใส่' : 'ใช้'}
        </button>
      `;

      row.querySelector('button')!.onclick = () => {
        if (item.type === 'potion') {
          if (item.id === 'pot_hp') {
            p.hp = Math.min(p.maxHp, p.hp + 60);
            audio.magicCast();
            this.game.addLog(`🧪 ${p.displayName} ดื่ม Life Potion (+60 HP)!`);
          } else if (item.id === 'pot_elixir' || item.id === 'pot_phoenix_down') {
            p.hp = p.maxHp;
            p.mp = p.maxMp;
            audio.levelUp();
            this.game.addLog(`🏺 ${p.displayName} ดื่ม Full Elixir! ฟื้นฟู HP/MP จนเต็มเปี่ยม!`, 'level');
          } else if (item.id === 'pot_str') {
            p.atk += 3;
            audio.levelUp();
            this.game.addLog(`💪 ${p.displayName} ดื่ม STR Elixir (+3 ATK ถาวร)!`, 'level');
          } else if (item.id === 'pot_def') {
            p.def += 3;
            audio.levelUp();
            this.game.addLog(`🛡️ ${p.displayName} ดื่ม DEF Elixir (+3 DEF ถาวร)!`, 'level');
          } else if (item.id === 'pot_mag') {
            p.mag += 3;
            audio.levelUp();
            this.game.addLog(`🔮 ${p.displayName} ดื่ม MAG Elixir (+3 MAG ถาวร)!`, 'level');
          } else if (item.id === 'pot_spd') {
            p.spd += 3;
            audio.levelUp();
            this.game.addLog(`👟 ${p.displayName} ดื่ม SPD Elixir (+3 SPD ถาวร)!`, 'level');
          } else if (item.id === 'pot_luk') {
            p.luk += 3;
            audio.levelUp();
            this.game.addLog(`🍀 ${p.displayName} ดื่ม LUK Elixir (+3 LUK ถาวร)!`, 'level');
          } else if (item.id === 'item_dispel') {
            p.rustTurns = 0;
            audio.magicCast();
            this.game.addLog(`🫙 ${p.displayName} ใช้ Dispel Charm ลบล้างสถานะคำสาปสนิมหมดสิ้น!`, 'level');
          } else if (item.id === 'item_bomb') {
            // Field Bomb: damage nearest rival or active player
            audio.strikeHit();
            const rival = this.game.players.find(o => o.id !== p.id && o.hp > 0);
            if (rival) {
              rival.hp = Math.max(10, rival.hp - 40);
              this.game.addLog(`💣 ${p.displayName} ปาระเบิดใส่ ${rival.displayName} (-40 HP)!`, 'battle');
            } else {
              this.game.addLog(`💣 ${p.displayName} จุดระเบิดไดนาไมต์ก้องกังวาน!`);
            }
          } else if (item.id === 'item_recall') {
            // Warp Recall to Castle (Node 0)
            p.nodeId = 0;
            const startNode = this.game.allNodes.find(n => n.id === 0) || this.game.allNodes[0];
            p.gridX = startNode.gx;
            p.gridY = startNode.gy;
            p.gridZ = startNode.gz;
            audio.magicCast();
            this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
            this.game.addLog(`🚪 ${p.displayName} ใช้วาร์ปกลับสู่ปราสาทหลวงทันที!`, 'level');
          } else {
            p.hp = Math.min(p.maxHp, p.hp + 50);
            audio.magicCast();
          }
          p.inventory.splice(idx, 1);
          this.openInventory();
          this.hud.update();
        } else if (item.type === 'spinner') {
          if (item.id === 'spin_5') p.activeSpinnerMultiplier = 5;
          else if (item.id === 'spin_4') p.activeSpinnerMultiplier = 4;
          else if (item.id === 'spin_3') p.activeSpinnerMultiplier = 3;
          else p.activeSpinnerMultiplier = 2;
          p.inventory.splice(idx, 1);
          audio.coin();
          this.game.addLog(`🌀 สวมใส่ ${item.name}! การทอยครั้งหน้าจะใช้ลูกเต๋า ${p.activeSpinnerMultiplier} ลูก!`, 'level');
          this.openInventory();
        } else if (isEquip) {
          const slot = item.type as 'weapon' | 'shield' | 'armor' | 'accessory';
          const old = p.equipment[slot];
          p.equipment[slot] = item;
          p.inventory.splice(idx, 1);
          if (old) p.inventory.push(old);
          audio.click();
          this.game.addLog(`⚔️ สวมใส่ ${item.name} เข้าช่อง ${slot.toUpperCase()} เรียบร้อย!`);
          this.openInventory();
          this.hud.update();
        }
      };

      bagList.appendChild(row);
    });

    modal.classList.remove('hidden');
  }

  private openWorldMapAtlas() {
    const modal = document.getElementById('worldMapModal')!;
    modal.classList.remove('hidden');

    const canvas = document.getElementById('worldMapCanvas') as HTMLCanvasElement;
    if (canvas.parentElement) {
      canvas.width = canvas.parentElement.clientWidth || 800;
      canvas.height = canvas.parentElement.clientHeight || 500;
    }
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    // Tactical parchment / atlas backdrop
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.7, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Compute bounding box of all nodes
    let minGx = Infinity, maxGx = -Infinity;
    let minGy = Infinity, maxGy = -Infinity;
    this.game.allNodes.forEach(node => {
      if (node.gx < minGx) minGx = node.gx;
      if (node.gx > maxGx) maxGx = node.gx;
      if (node.gy < minGy) minGy = node.gy;
      if (node.gy > maxGy) maxGy = node.gy;
    });

    const paddingX = 60;
    const paddingY = 50;
    const rangeX = (maxGx - minGx) || 1;
    const rangeY = (maxGy - minGy) || 1;
    const scale = Math.min((w - paddingX * 2) / rangeX, (h - paddingY * 2 - 35) / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - 35 - rangeY * scale) / 2 + 10;

    // Cache transform for hover/click coordinate detection
    this.mapTransform = { minGx, minGy, scale, offsetX, offsetY };

    const toMapX = (gx: number) => offsetX + (gx - minGx) * scale;
    const toMapY = (gy: number) => offsetY + (gy - minGy) * scale;

    const matchesFilter = (node: BoardNode): boolean => {
      if (this.worldMapFilter === 'all') return true;
      if (this.worldMapFilter === 'town') return node.type === 'town';
      if (this.worldMapFilter === 'shop') return node.type.startsWith('shop');
      if (this.worldMapFilter === 'boss') return node.type === 'boss' || node.type === 'dark_gate';
      if (this.worldMapFilter === 'chest') return node.type === 'mystery_chest' || node.type === 'vault';
      if (this.worldMapFilter === 'player') {
        return this.game.players.some(pl => pl.nodeId === node.id || node.townData?.ownerId === pl.id);
      }
      return true;
    };

    // 1. Draw Realm Territory Backdrop Halos
    const realms: Record<string, { color: string; label: string; minX: number; maxX: number; minY: number; maxY: number }> = {
      solaria: { color: 'rgba(34, 197, 94, 0.12)', label: 'มหาอาณาจักรโซลาเรีย (Solaria)', minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      frostpeak: { color: 'rgba(56, 189, 248, 0.12)', label: 'อาณาจักรเยือกแข็งฟรอสต์พีค (Frostpeak)', minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      sunfire: { color: 'rgba(249, 115, 22, 0.12)', label: 'ดินแดนทะเลทรายและภูเขาไฟซันไฟร์ (Sunfire)', minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      abyss: { color: 'rgba(168, 85, 247, 0.14)', label: 'ห้วงอเวจีแห่งริโก้ (The Abyss)', minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    };

    this.game.allNodes.forEach(n => {
      const r = realms[n.realmId];
      if (r) {
        const mx = toMapX(n.gx);
        const my = toMapY(n.gy);
        if (mx < r.minX) r.minX = mx;
        if (mx > r.maxX) r.maxX = mx;
        if (my < r.minY) r.minY = my;
        if (my > r.maxY) r.maxY = my;
      }
    });

    Object.values(realms).forEach(r => {
      if (r.minX < Infinity) {
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.roundRect(r.minX - 25, r.minY - 25, (r.maxX - r.minX) + 50, (r.maxY - r.minY) + 50, 16);
        ctx.fill();

        ctx.fillStyle = r.color.replace('0.12', '0.6').replace('0.14', '0.7');
        ctx.font = '10px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.label, (r.minX + r.maxX) / 2, r.minY - 10);
      }
    });

    // 2. Draw Roads with Styled Lines
    this.game.allNodes.forEach(node => {
      const x1 = toMapX(node.gx);
      const y1 = toMapY(node.gy);
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = this.game.allNodes.find(n => n.id === nId);
          if (target) {
            const x2 = toMapX(target.gx);
            const y2 = toMapY(target.gy);
            const bothMatch = matchesFilter(node) && matchesFilter(target);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            if (this.worldMapFilter === 'all' || bothMatch) {
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 2.0;
            } else {
              ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
              ctx.lineWidth = 1.0;
            }
            ctx.stroke();
          }
        }
      });
    });

    // 3. Draw Nodes with Clear Iconic Symbols
    this.game.allNodes.forEach(node => {
      const nx = toMapX(node.gx);
      const ny = toMapY(node.gy);
      const isMatch = matchesFilter(node);

      if (!isMatch) {
        // Dimmed node when filter is active
        ctx.save();
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      let nodeColor = '#64748b';
      let radius = 3.8;

      if (node.type === 'town') {
        if (node.townData?.isOccupiedByMonster) {
          nodeColor = '#ef4444'; // monster red
        } else if (node.townData?.ownerId) {
          nodeColor = '#22c55e'; // player green
        } else {
          nodeColor = '#f59e0b'; // neutral gold
        }
        radius = 7.0;
      } else if (node.type === 'mystery_chest') {
        nodeColor = '#fbbf24';
        radius = 6.5;
      } else if (node.type === 'vault') {
        nodeColor = '#facc15';
        radius = 5.5;
      } else if (node.type === 'shop_weapon') {
        nodeColor = '#f97316';
        radius = 5.0;
      } else if (node.type === 'shop_item') {
        nodeColor = '#10b981';
        radius = 5.0;
      } else if (node.type === 'shop_magic') {
        nodeColor = '#a855f7';
        radius = 5.0;
      } else if (node.type === 'church') {
        nodeColor = '#f8fafc';
        radius = 5.0;
      } else if (node.type === 'tavern') {
        nodeColor = '#eab308';
        radius = 5.0;
      } else if (node.type === 'guild') {
        nodeColor = '#38bdf8';
        radius = 5.0;
      } else if (node.type === 'boss') {
        nodeColor = '#ef4444';
        radius = 7.5;
      } else if (node.type === 'dark_gate') {
        nodeColor = '#c084fc';
        radius = 7.5;
      } else if (node.type === 'blue') {
        nodeColor = '#3b82f6';
      } else if (node.type === 'red') {
        nodeColor = '#dc2626';
      }

      // Outer glow for special tiles
      if (node.type === 'mystery_chest') {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (node.type === 'town') {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (node.type === 'boss') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Labels
      if (node.type === 'town') {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8.5px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🏰 ${node.name}`, nx, ny - 9);
      } else if (node.type === 'mystery_chest') {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 8.5px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎁 ${node.name}`, nx, ny - 9);
      } else if (node.type === 'boss') {
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 8.5px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`💀 ${node.name}`, nx, ny - 9);
      } else if (node.type === 'dark_gate') {
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 8.5px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`😈 ${node.name}`, nx, ny - 9);
      }
    });

    // 4. Draw Players with Pulsing Halos and Labels
    this.game.players.forEach(pl => {
      const px = toMapX(pl.gridX);
      const py = toMapY(pl.gridY);

      // Pulsing halo
      ctx.strokeStyle = pl.isDarkling ? '#f43f5e' : '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.stroke();

      // Player circle
      ctx.fillStyle = pl.isDarkling ? '#f43f5e' : pl.color;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Name banner
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(px - 28, py + 9, 56, 13, 3);
      ctx.fill();
      ctx.fillStyle = pl.color;
      ctx.font = 'bold 8px Silkscreen, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pl.displayName, px, py + 18);
    });

    // 5. Legend at Bottom
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(15, h - 30, w - 30, 24, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px Kanit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏰 เมือง  |  🎁 กล่องสุ่ม  |  ⚔️ ร้านอาวุธ  |  🧪 ร้านไอเทม  |  🔮 ร้านเวท  |  ✨ โบสถ์  |  🍺 โรงเตี๊ยม  |  📜 กิลด์  |  💀 บอส  |  💰 ห้องนิรภัย', w / 2, h - 14);
  }

  private bindWorldMapEvents() {
    const canvas = document.getElementById('worldMapCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Filter Buttons
    document.querySelectorAll('.world-map-filter-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        audio.click();
        document.querySelectorAll('.world-map-filter-btn').forEach(b => {
          b.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        const target = e.currentTarget as HTMLElement;
        target.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
        target.classList.remove('bg-slate-800', 'text-slate-300');
        this.worldMapFilter = target.getAttribute('data-filter') || 'all';
        this.openWorldMapAtlas();
      });
    });

    const tooltip = document.getElementById('worldMapTooltip');

    // Mouse Move on World Map for Interactive Tooltip
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hoveredPlayer = this.findMapPlayerAtPoint(mx, my);
      if (hoveredPlayer && tooltip) {
        tooltip.innerHTML = `
          <div class="font-bold text-amber-300 flex items-center gap-1">
            <span>${hoveredPlayer.isDarkling ? '😈' : '🛡️'}</span>
            <span>${hoveredPlayer.displayName} (${hoveredPlayer.className})</span>
          </div>
          <div class="text-[10px] text-slate-300">
            HP: <span class="text-rose-300 font-bold">${hoveredPlayer.hp}/${hoveredPlayer.maxHp}</span> | 
            ทอง: <span class="text-amber-300 font-bold">${hoveredPlayer.gold}G</span>
          </div>
          <div class="text-[9px] text-emerald-400 mt-0.5">
            มูลค่าสุทธิ: ${hoveredPlayer.getNetWorth(this.game.allNodes)}G • เมือง: ${hoveredPlayer.townsControlled} แห่ง
          </div>
          <div class="text-[8px] text-cyan-400 mt-1 italic">🖱️ คลิกเพื่อหมุนกล้องไปหาตัวละครนี้</div>
        `;
        tooltip.style.left = `${e.clientX + 14}px`;
        tooltip.style.top = `${e.clientY + 14}px`;
        tooltip.classList.remove('hidden');
        canvas.style.cursor = 'pointer';
        return;
      }

      const hoveredNode = this.findMapNodeAtPoint(mx, my);
      if (hoveredNode && tooltip) {
        let typeLabel = 'ช่องทางเดินทั่วไป';
        let badgeColor = 'text-slate-300';
        if (hoveredNode.type === 'town') {
          typeLabel = hoveredNode.townData?.isOccupiedByMonster
            ? `🏰 เมืองถูกมอนสเตอร์ (${hoveredNode.townData.monsterName}) ยึดครอง!`
            : hoveredNode.townData?.ownerId
            ? `🏰 เมืองในครอบครอง (เลเวล ${hoveredNode.townData.level})`
            : '🏰 เมืองอิสระ (เข้าพิชิตเพื่อรับภาษี)';
          badgeColor = 'text-amber-300 font-bold';
        } else if (hoveredNode.type === 'mystery_chest') {
          typeLabel = '🎁 กล่องสุ่มมหัศจรรย์ Dokapon (รูเล็ตต์เสี่ยงโชคสุดแรร์!)';
          badgeColor = 'text-amber-400 font-bold';
        } else if (hoveredNode.type === 'vault') {
          typeLabel = '💰 ห้องนิรภัยโบราณ (ชิงสมบัติทองคำ)';
          badgeColor = 'text-yellow-300 font-bold';
        } else if (hoveredNode.type === 'shop_weapon') {
          typeLabel = '⚔️ ร้านอาวุธและชุดเกราะ';
          badgeColor = 'text-orange-400 font-bold';
        } else if (hoveredNode.type === 'shop_item') {
          typeLabel = '🧪 ร้านยาวิเศษและ Multi-Spinner';
          badgeColor = 'text-emerald-400 font-bold';
        } else if (hoveredNode.type === 'shop_magic') {
          typeLabel = '🔮 ร้านเวทมนตร์และคัมภีร์สนาม';
          badgeColor = 'text-purple-400 font-bold';
        } else if (hoveredNode.type === 'church') {
          typeLabel = '✨ วิหารศักดิ์สิทธิ์ (ฟื้นฟู HP/MP และลบล้างคำสาป)';
          badgeColor = 'text-sky-300 font-bold';
        } else if (hoveredNode.type === 'tavern') {
          typeLabel = '🍺 โรงเตี๊ยมคนพเนจร (จ้างทหารรับจ้าง/ฟังข่าว)';
          badgeColor = 'text-yellow-400 font-bold';
        } else if (hoveredNode.type === 'guild') {
          typeLabel = '📜 กิลด์นักผจญภัย (รับเควสต์ชิงเงินรางวัล)';
          badgeColor = 'text-blue-400 font-bold';
        } else if (hoveredNode.type === 'boss') {
          typeLabel = '💀 แท่นบูชาบอสใหญ่ประจำอาณาจักร!';
          badgeColor = 'text-rose-500 font-bold';
        } else if (hoveredNode.type === 'dark_gate') {
          typeLabel = '😈 ประตูแห่งความมืด (ทำสัญญา Rico กลายร่างเป็น Darkling)';
          badgeColor = 'text-purple-500 font-bold';
        } else if (hoveredNode.type === 'blue') {
          typeLabel = '🪙 ช่องโชคดี (รับเหรียญทองฟรี)';
          badgeColor = 'text-cyan-300';
        } else if (hoveredNode.type === 'red') {
          typeLabel = '💀 ช่องอันตราย (กับดักหนามและปีศาจร้าย)';
          badgeColor = 'text-rose-400';
        }

        tooltip.innerHTML = `
          <div class="font-bold text-amber-200">${hoveredNode.name}</div>
          <div class="text-[10px] ${badgeColor} mt-0.5">${typeLabel}</div>
          <div class="text-[9px] text-slate-400 mt-1">ไบโอม: ${hoveredNode.biome} • อาณาจักร: ${hoveredNode.realmId}</div>
          <div class="text-[8px] text-cyan-400 mt-1 italic">🖱️ คลิกเพื่อหมุนกล้องไปดูจุดนี้บนแผนที่</div>
        `;
        tooltip.style.left = `${e.clientX + 14}px`;
        tooltip.style.top = `${e.clientY + 14}px`;
        tooltip.classList.remove('hidden');
        canvas.style.cursor = 'pointer';
      } else if (tooltip) {
        tooltip.classList.add('hidden');
        canvas.style.cursor = 'default';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.add('hidden');
    });

    // Click on World Map to Center Camera
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const clickedPlayer = this.findMapPlayerAtPoint(mx, my);
      if (clickedPlayer) {
        audio.click();
        if (tooltip) tooltip.classList.add('hidden');
        document.getElementById('worldMapModal')?.classList.add('hidden');
        this.renderer.centerCameraOn(clickedPlayer.gridX, clickedPlayer.gridY, clickedPlayer.gridZ);
        this.game.addLog(`🗺️ ย้ายมุมมองกล้องไปยัง ${clickedPlayer.displayName}`);
        return;
      }

      const clickedNode = this.findMapNodeAtPoint(mx, my);
      if (clickedNode) {
        audio.click();
        if (tooltip) tooltip.classList.add('hidden');
        document.getElementById('worldMapModal')?.classList.add('hidden');
        this.renderer.centerCameraOn(clickedNode.gx, clickedNode.gy, clickedNode.gz);
        this.game.addLog(`🗺️ ย้ายมุมมองกล้องไปยัง ${clickedNode.name}`);
      }
    });
  }

  private findMapNodeAtPoint(mx: number, my: number): BoardNode | undefined {
    const { minGx, minGy, scale, offsetX, offsetY } = this.mapTransform;
    let closestNode: BoardNode | undefined;
    let minDist = 16;

    for (const node of this.game.allNodes) {
      const nx = offsetX + (node.gx - minGx) * scale;
      const ny = offsetY + (node.gy - minGy) * scale;
      const dist = Math.hypot(mx - nx, my - ny);
      if (dist < minDist) {
        minDist = dist;
        closestNode = node;
      }
    }
    return closestNode;
  }

  private findMapPlayerAtPoint(mx: number, my: number): Player | undefined {
    const { minGx, minGy, scale, offsetX, offsetY } = this.mapTransform;
    let closestPlayer: Player | undefined;
    let minDist = 18;

    for (const pl of this.game.players) {
      const px = offsetX + (pl.gridX - minGx) * scale;
      const py = offsetY + (pl.gridY - minGy) * scale;
      const dist = Math.hypot(mx - px, my - py);
      if (dist < minDist) {
        minDist = dist;
        closestPlayer = pl;
      }
    }
    return closestPlayer;
  }

  private renderChronicleLog() {
    const list = document.getElementById('logMessagesList')!;
    list.innerHTML = '';
    this.game.logs.forEach(item => {
      const row = document.createElement('div');
      row.className = 'py-0.5 border-b border-slate-800/60';
      if (item.type === 'gold') row.innerHTML = `<span class="text-amber-400">🪙 ${item.text}</span>`;
      else if (item.type === 'battle') row.innerHTML = `<span class="text-red-400">⚔️ ${item.text}</span>`;
      else if (item.type === 'darkling') row.innerHTML = `<span class="text-purple-400">😈 ${item.text}</span>`;
      else if (item.type === 'level') row.innerHTML = `<span class="text-emerald-400">⭐ ${item.text}</span>`;
      else row.innerHTML = `<span class="text-slate-300">• ${item.text}</span>`;
      list.appendChild(row);
    });
  }

  public loop(time: number) {
    if (this.game.phase !== 'TITLE') {
      // Render 2.5D Isometric World Viewport
      this.renderer.render(
        this.game.allNodes,
        this.game.players,
        this.game.activePlayer,
        this.game.highlightedNodes,
        this.renderer.previewPathNodeIds,
        time
      );

      // Render Battle Arena if active
      if (this.game.activeBattle) {
        this.battleUI.renderArena(time);
      }
    }

    requestAnimationFrame(t => this.loop(t));
  }
}

// Start Application on Load
window.addEventListener('load', () => {
  const app = new DokaponApp();
  app.loop(0);
});
