import { GameState } from './game/GameState';
import { IsometricRenderer } from './engine/IsometricRenderer';
import { HUD } from './ui/HUD';
import { BattleUI } from './ui/BattleUI';
import { TownUI } from './ui/TownUI';
import { ShopUI, SHOP_CATALOG } from './ui/ShopUI';
import { PrankUI } from './ui/PrankUI';
import { WeeklyReportUI } from './ui/WeeklyReportUI';
import { IsekaiEventUI } from './ui/IsekaiEventUI';
import { HERO_CLASSES, Player, FIELD_SPELLS } from './game/Player';
import { EquipmentItem } from './engine/PixelSpriteGenerator';
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

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private hasMovedWhileDragging = false;
  private bossCurrentHp = 380;
  private bossMaxHp = 380;

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

    this.initCanvasResize();
    this.bindDOMEvents();
    this.bindInteractiveTileSelection();
    this.renderRosterSetup(3);
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
      if (this.isDragging || this.game.phase === 'MOVING' || this.game.phase === 'TITLE') return;

      const hoveredNode = this.renderer.screenToNode(e.clientX, e.clientY, this.game.allNodes);

      if (hoveredNode && this.game.highlightedNodes.includes(hoveredNode.id)) {
        this.renderer.hoveredNodeId = hoveredNode.id;
        this.canvas.style.cursor = 'pointer';

        // Calculate and preview path
        const path = this.game.findPathToTarget(hoveredNode.id);
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

      const clickedNode = this.renderer.screenToNode(e.clientX, e.clientY, this.game.allNodes);
      if (clickedNode && this.game.highlightedNodes.includes(clickedNode.id)) {
        const path = this.game.findPathToTarget(clickedNode.id);
        if (path && path.length > 1) {
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

    // Center & Zoom on Hero
    document.getElementById('btnCenterCam')?.addEventListener('click', () => {
      audio.click();
      const p = this.game.activePlayer;
      this.renderer.focusOnPlayer(p.gridX, p.gridY, p.gridZ, 1.25);
    });

    // World Map Atlas
    document.getElementById('btnWorldMap')?.addEventListener('click', () => {
      audio.click();
      this.openWorldMapAtlas();
    });
    document.getElementById('btnCloseWorldMap')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('worldMapModal')?.classList.add('hidden');
    });

    // Zoom Controls
    document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      audio.click();
      this.setZoom(this.renderer.camera.targetZoom + 0.15);
    });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      audio.click();
      this.setZoom(this.renderer.camera.targetZoom - 0.15);
    });

    this.canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.10 : -0.10;
        this.setZoom(this.renderer.camera.targetZoom + delta);
      },
      { passive: false }
    );

    // Canvas Panning (Drag)
    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.hasMovedWhileDragging = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (this.isDragging) {
        const dx = (e.clientX - this.dragStartX) / this.renderer.camera.zoom;
        const dy = (e.clientY - this.dragStartY) / this.renderer.camera.zoom;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.hasMovedWhileDragging = true;
        }
        this.renderer.camera.x -= dx;
        this.renderer.camera.y -= dy;
        this.renderer.camera.targetX = this.renderer.camera.x;
        this.renderer.camera.targetY = this.renderer.camera.y;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
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

  private setZoom(val: number) {
    this.renderer.camera.targetZoom = Math.max(0.95, Math.min(1.40, val));
    document.getElementById('zoomLabel')!.innerText = `${this.renderer.camera.targetZoom.toFixed(1)}x`;
  }

  private renderRosterSetup(playerCount: number) {
    const container = document.getElementById('playerSetupRoster')!;
    container.innerHTML = '';
    const defaultNames = ['Galahad', 'Lyra', 'Jax', 'Aria'];
    const classKeys = Object.keys(HERO_CLASSES);

    for (let i = 0; i < playerCount; i++) {
      const card = document.createElement('div');
      card.className = 'pixel-box p-3 bg-slate-900 border-slate-700 flex flex-col gap-2 shadow';
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="flex flex-col gap-1 min-w-0">
            <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Name</span>
            <input type="text" maxlength="12" class="player-name-input bg-slate-950 border border-slate-700 text-xs px-2 py-1.5 rounded text-white w-full min-w-0 outline-none focus:border-amber-400" value="${defaultNames[i]}">
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Class</span>
            <select class="player-class-select bg-slate-950 border border-slate-700 text-xs px-2 py-1.5 rounded text-amber-400 w-full min-w-0 outline-none cursor-pointer">
              ${classKeys
                .map(
                  ck =>
                    `<option value="${ck}" ${ck === classKeys[i % 4] ? 'selected' : ''}>${HERO_CLASSES[ck].name} ${HERO_CLASSES[ck].avatar}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
      `;
      container.appendChild(card);
    }
  }

  private startGame() {
    const nameInputs = document.querySelectorAll('.player-name-input') as NodeListOf<HTMLInputElement>;
    const classSelects = document.querySelectorAll('.player-class-select') as NodeListOf<HTMLSelectElement>;
    const aiChecks = document.querySelectorAll('.is-ai-check') as NodeListOf<HTMLInputElement>;
    const winGoal = (document.getElementById('selectWinGoal') as HTMLSelectElement).value;

    const partyConfig = Array.from(nameInputs).map((input, idx) => ({
      name: input.value.trim() || `Hero ${idx + 1}`,
      classKey: classSelects[idx].value,
      isAI: aiChecks[idx].checked
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
    // Smoothly ease camera zoom out to comfortable tactical viewing level
    this.renderer.resetTacticalZoom(1.05);

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

      case 'blue':
        const bonus = 45 + Math.floor(Math.random() * 60);
        p.gold += bonus;
        audio.coin();
        this.game.addLog(`🪙 ช่องโชคดี! ${p.displayName} ได้รับพรแห่งโชคลาภ (+${bonus}G)!`, 'gold');
        this.advanceTurn();
        break;

      case 'red':
        const penalty = Math.min(p.gold, 35 + Math.floor(Math.random() * 40));
        p.gold -= penalty;
        p.hp = Math.max(10, p.hp - 15);
        audio.hurt();
        this.game.addLog(`💀 ช่องอันตราย! ${p.displayName} โดนกับดักหนาม (-${penalty}G, -15 HP)!`);
        this.advanceTurn();
        break;

      case 'church':
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        audio.levelUp();
        this.game.addLog(`✨ วิหารศักดิ์สิทธิ์! ${p.displayName} ได้รับการชำระล้างและรับพร (ฟื้นฟูเต็มที่)!`);
        this.advanceTurn();
        break;

      case 'dark_gate':
        if (darklingSystem.canTransform(p, this.game.players, this.game.allNodes)) {
          document.getElementById('darklingPactModal')?.classList.remove('hidden');
        } else {
          this.game.addLog(`แท่นบูชาแห่ง Rico ยังคงเงียบงัน มีเพียงลอร์ดผู้ต่ำต้อยที่สุดเท่านั้นที่สามารถทำสัญญามืดได้`);
        }
        this.advanceTurn();
        break;

      case 'vault':
        const loot = 90 + Math.floor(Math.random() * 110);
        p.gold += loot;
        audio.chestOpen();
        this.game.addLog(`🎁 ห้องนิรภัยโบราณ! ${p.displayName} งัดห้องนิรภัยและได้เงิน ${loot}G!`, 'gold');
        this.advanceTurn();
        break;

      case 'boss':
        this.initiateBossBattle();
        break;

      case 'tavern':
        this.isekaiEventUI.openTavern(p, () => this.advanceTurn());
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
        this.isekaiEventUI.openShrine(p, () => this.advanceTurn());
        break;

      case 'empty':
      default:
        // 25% chance of Highway Bandit Ambush on open roads!
        if (Math.random() < 0.25) {
          this.isekaiEventUI.openBanditAmbush(
            p,
            () => this.advanceTurn(),
            () => this.initiateBanditCombat()
          );
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

      // Dokapon Kingdom rule: Send defeated player back to Dokapon Castle (node 0) with 1 HP
      const castleNode = this.game.allNodes.find(n => n.id === 0) || this.game.allNodes[0];
      loserPlayer.nodeId = castleNode.id;
      loserPlayer.gridX = castleNode.gx;
      loserPlayer.gridY = castleNode.gy;
      loserPlayer.gridZ = castleNode.gz;
      loserPlayer.hp = 1;
      this.game.addLog(`🚑 ${loserPlayer.displayName} ถูกน็อคและถูกพากลับไปที่ Dokapon Castle!`, 'battle');

      this.prankUI.open(winnerPlayer, loserPlayer, () => this.advanceTurn());
    });
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
      abyss: ['Nether Shadow Knight', 'Chaos Slime', 'Abyssal Siren', 'Lesser Kraken', 'Void Bat']
    };

    const roster = biomeMonsters[tile.realmId] || ['Forest Goblin Marauder', 'Royal Slime Bloblet', 'Briar Kobold'];
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
      }
      this.advanceTurn();
    });
  }

  private initiateBossBattle() {
    this.game.addLog(`⚠️ มังกรโบราณผู้ยิ่งใหญ่จุติลงมา! การต่อสู้แห่งตำนาน! (HP: ${this.bossCurrentHp}/${this.bossMaxHp})`, 'battle');

    const bossCombatant: Combatant = {
      name: 'Dragon King Ignis',
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
        this.game.addLog(`👑 ${winner.playerRef.displayName} สังหารมังกรผู้ยิ่งใหญ่! ความรุ่งโรจน์นิรันดร์!`, 'level');
        this.game.phase = 'VICTORY';
        this.triggerVictoryModal(winner.playerRef, 'สังหาร Dragon King Ignis');
      } else {
        // Dragon survived! Persist remaining boss HP
        this.bossCurrentHp = Math.max(1, Math.ceil(winner.hp));
        this.game.addLog(`🐉 Dragon King Ignis รอดตายโดยเหลือ ${this.bossCurrentHp}/${this.bossMaxHp} HP! ผู้ท้าชิงคนต่อไปสามารถปิดฉากเขาได้!`, 'battle');
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
    // 1. Smoothly center camera and zoom in onto active player
    this.renderer.focusOnPlayer(p.gridX, p.gridY, p.gridZ, 1.25);
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
    document.getElementById('invHeroName')!.innerText = `${p.displayName}อุปกรณ์`;
    document.getElementById('invHeroStatsSummary')!.innerText = `LV ${p.level} ${p.className} • ${p.gold}G เงิน`;

    document.getElementById('equippedSlotsList')!.innerHTML = `
      <div class="p-1 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
        <span>🗡️ อาวุธ:</span>
        <span class="font-bold text-amber-300">${p.equipment.weapon?.name || 'ไม่มี'}</span>
      </div>
      <div class="p-1 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
        <span>🦺 เกราะ:</span>
        <span class="font-bold text-amber-300">${p.equipment.armor?.name || 'ไม่มี'}</span>
      </div>
      <div class="p-1 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
        <span>💍 เครื่องประดับ:</span>
        <span class="font-bold text-amber-300">${p.equipment.accessory?.name || 'None'}</span>
      </div>
    `;

    document.getElementById('statBreakdownList')!.innerHTML = `
      <div class="flex justify-between"><span>ATK:</span> <strong class="text-white">${p.getTotalStat('atk')}</strong></div>
      <div class="flex justify-between"><span>DEF:</span> <strong class="text-white">${p.getTotalStat('def')}</strong></div>
      <div class="flex justify-between"><span>MAG:</span> <strong class="text-white">${p.getTotalStat('mag')}</strong></div>
      <div class="flex justify-between"><span>SPD:</span> <strong class="text-white">${p.getTotalStat('spd')}</strong></div>
      <div class="flex justify-between"><span>LUK:</span> <strong class="text-white">${p.getTotalStat('luk')}</strong></div>
    `;

    document.getElementById('invCapacityCount')!.innerText = `${p.inventory.length}/12 Items`;
    const bagList = document.getElementById('satchelItemsList')!;
    bagList.innerHTML = '';

    p.inventory.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'pixel-box p-2 bg-slate-950 border-slate-800 flex justify-between items-center';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span>${item.icon}</span>
          <div>
            <div class="text-xs text-amber-200 font-bold">${item.name}</div>
            <div class="text-[9px] text-slate-400">${item.desc}</div>
          </div>
        </div>
        <button class="pixel-btn pixel-btn-blue px-2.5 py-1 text-[10px] font-bold text-white">
          ${item.type === 'potion' || item.type === 'spinner' ? 'ใช้' : 'ใส่'}
        </button>
      `;

      row.querySelector('button')!.onclick = () => {
        if (item.type === 'potion') {
          if (item.id === 'pot_hp') p.hp = Math.min(p.maxHp, p.hp + 50);
          else if (item.id === 'pot_elixir') {
            p.hp = p.maxHp;
            p.mp = p.maxMp;
          }
          audio.magicCast();
          p.inventory.splice(idx, 1);
          this.openInventory();
          this.hud.update();
        } else if (item.type === 'spinner') {
          p.activeSpinnerMultiplier = item.id === 'spin_3' ? 3 : 2;
          p.inventory.splice(idx, 1);
          audio.coin();
          this.game.addLog(`สวมใส่ ${item.name}! การทอยครั้งหน้าจะใช้ลูกเต๋า ${p.activeSpinnerMultiplier} ลูก!`);
          this.openInventory();
        } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
          const slot = item.type;
          const old = p.equipment[slot];
          p.equipment[slot] = item;
          p.inventory.splice(idx, 1);
          if (old) p.inventory.push(old);
          audio.click();
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

    const paddingX = 55;
    const paddingY = 45;
    const rangeX = (maxGx - minGx) || 1;
    const rangeY = (maxGy - minGy) || 1;
    const scale = Math.min((w - paddingX * 2) / rangeX, (h - paddingY * 2 - 30) / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - 30 - rangeY * scale) / 2 + 10;

    const toMapX = (gx: number) => offsetX + (gx - minGx) * scale;
    const toMapY = (gy: number) => offsetY + (gy - minGy) * scale;

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

    // 2. Draw Roads with Clean Styled Lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    this.game.allNodes.forEach(node => {
      const x1 = toMapX(node.gx);
      const y1 = toMapY(node.gy);
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = this.game.allNodes.find(n => n.id === nId);
          if (target) {
            const x2 = toMapX(target.gx);
            const y2 = toMapY(target.gy);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      });
    });

    // 3. Draw Nodes with Clear Iconic Symbols
    this.game.allNodes.forEach(node => {
      const nx = toMapX(node.gx);
      const ny = toMapY(node.gy);

      let nodeColor = '#64748b';
      let radius = 3.5;

      if (node.type === 'town') {
        nodeColor = node.townData?.ownerId ? '#22c55e' : '#f59e0b';
        radius = 6.5;
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
        radius = 7.0;
      } else if (node.type === 'dark_gate') {
        nodeColor = '#c084fc';
        radius = 7.0;
      } else if (node.type === 'blue') {
        nodeColor = '#3b82f6';
      } else if (node.type === 'red') {
        nodeColor = '#dc2626';
      }

      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // For towns and boss nodes, draw label
      if (node.type === 'town') {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8.5px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🏰 ${node.name}`, nx, ny - 9);
      } else if (node.type === 'boss') {
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 8.5px Kanit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`💀 ${node.name}`, nx, ny - 9);
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
    ctx.fillText('🏰 เมือง  |  ⚔️ อาวุธ  |  🧪 ไอเทม  |  🔮 เวท  |  ✨ โบสถ์  |  🍺 โรงเตี๊ยม  |  📜 กิลด์  |  💀 บอส  |  🪙 ช่องทอง  |  🔴 ช่องมอนสเตอร์', w / 2, h - 14);
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
