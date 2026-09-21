import { GameState } from './game/GameState';
import { IsometricRenderer } from './engine/IsometricRenderer';
import { HUD } from './ui/HUD';
import { BattleUI } from './ui/BattleUI';
import { TownUI } from './ui/TownUI';
import { ShopUI } from './ui/ShopUI';
import { PrankUI } from './ui/PrankUI';
import { WeeklyReportUI } from './ui/WeeklyReportUI';
import { HERO_CLASSES, Player, FIELD_SPELLS } from './game/Player';
import { BoardNode } from './game/BoardMap';
import { Combatant } from './game/BattleEngine';
import { townManager } from './game/TownManager';
import { darklingSystem } from './game/DarklingSystem';
import { aiSystem } from './game/AISystem';
import { audio } from './engine/AudioSynthesizer';
import { royalDecreeSystem } from './game/RoyalDecreeSystem';

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

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private hasMovedWhileDragging = false;

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
      if (this.game.phase === 'MOVING' || this.game.phase === 'TITLE') return;

      const hoveredNode = this.renderer.screenToNode(e.clientX, e.clientY, this.game.allNodes);

      if (hoveredNode && this.game.highlightedNodes.includes(hoveredNode.id)) {
        this.renderer.hoveredNodeId = hoveredNode.id;
        this.canvas.style.cursor = 'pointer';

        // Calculate and preview path
        const path = this.game.findPathToTarget(hoveredNode.id);
        this.renderer.previewPathNodeIds = path || [];
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
        this.game.addLog(`No Multi-Spinners in bag! Buy them at Item Shops.`);
        return;
      }
      const spin = spinners[0];
      p.activeSpinnerMultiplier = spin.id === 'spin_3' ? 3 : 2;
      p.inventory.splice(p.inventory.indexOf(spin), 1);
      audio.coin();
      this.game.addLog(`🌀 Used ${spin.name}! Next roll will roll ${p.activeSpinnerMultiplier} dice!`, 'level');
    });

    // Toggle Chiptune BGM
    document.getElementById('btnToggleBgm')?.addEventListener('click', () => {
      const isEnabled = audio.toggleBgm();
      const btn = document.getElementById('btnToggleBgm')!;
      btn.innerText = isEnabled ? '🎵' : '🔇';
      this.game.addLog(isEnabled ? '🎵 Chiptune BGM unmuted.' : '🔇 Chiptune BGM muted.');
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
      this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
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
      this.setZoom(this.renderer.camera.targetZoom + 0.25);
    });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      audio.click();
      this.setZoom(this.renderer.camera.targetZoom - 0.25);
    });

    this.canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
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

    // Chronicle Log toggle
    document.getElementById('btnToggleLog')?.addEventListener('click', () => {
      audio.click();
      this.renderChronicleLog();
      document.getElementById('gameLogDrawer')?.classList.toggle('hidden');
    });
    document.getElementById('btnCloseLog')?.addEventListener('click', () => {
      document.getElementById('gameLogDrawer')?.classList.add('hidden');
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
    this.renderer.camera.targetZoom = Math.max(0.65, Math.min(1.8, val));
    document.getElementById('zoomLabel')!.innerText = `${this.renderer.camera.targetZoom.toFixed(1)}x`;
  }

  private renderRosterSetup(playerCount: number) {
    const container = document.getElementById('playerSetupRoster')!;
    container.innerHTML = '';
    const defaultNames = ['Galahad', 'Lyra', 'Jax', 'Aria'];
    const classKeys = Object.keys(HERO_CLASSES);

    for (let i = 0; i < playerCount; i++) {
      const card = document.createElement('div');
      card.className = 'pixel-box p-2.5 bg-slate-900 border-slate-800 flex flex-col gap-1.5';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-300">PLAYER ${i + 1}</span>
          <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
            <input type="checkbox" class="is-ai-check accent-amber-500" ${i > 0 ? 'checked' : ''}>
            <span>AI Bot</span>
          </label>
        </div>
        <div class="flex gap-2">
          <input type="text" class="player-name-input bg-slate-950 border border-slate-700 text-xs px-2 py-1 rounded text-white flex-1" value="${defaultNames[i]}">
          <select class="player-class-select bg-slate-950 border border-slate-700 text-xs px-2 py-1 rounded text-amber-400">
            ${classKeys
              .map(
                ck =>
                  `<option value="${ck}" ${ck === classKeys[i % 4] ? 'selected' : ''}>${HERO_CLASSES[ck].name} ${HERO_CLASSES[ck].avatar}</option>`
              )
              .join('')}
          </select>
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

    const p = this.game.activePlayer;
    this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
    this.hud.update();

    if (p.isAI) {
      setTimeout(() => this.triggerDiceRoll(), 800);
    }
  }

  private triggerDiceRoll() {
    const totalRoll = this.game.rollMovementDice();

    const diceModal = document.getElementById('diceRollModal')!;
    const diceCube = document.getElementById('diceCube')!;
    const diceResultText = document.getElementById('diceResultText')!;

    diceModal.classList.remove('hidden');
    diceCube.classList.add('dice-rolling');
    diceResultText.innerText = 'ROLLING...';

    let count = 0;
    const interval = setInterval(() => {
      audio.diceRoll();
      diceCube.innerText = `${Math.floor(Math.random() * 6) + 1}`;
      count++;

      if (count > 7) {
        clearInterval(interval);
        diceCube.classList.remove('dice-rolling');
        diceCube.innerText = `${totalRoll}`;
        diceResultText.innerText = `YOU ROLLED A ${totalRoll}!`;
        audio.coin();

        setTimeout(() => {
          diceModal.classList.add('hidden');
          this.game.updateReachableHighlights();

          if (this.game.activePlayer.isAI) {
            // AI automatically picks destination
            const candidates = this.game.highlightedNodes;
            const chosenTarget = candidates[Math.floor(Math.random() * candidates.length)] || candidates[0];
            const path = this.game.findPathToTarget(chosenTarget);
            if (path) {
              this.game.executePath(
                path,
                () => this.onMoveStep(),
                tile => this.handleTileArrival(tile)
              );
            }
          } else {
            this.game.addLog(`👉 CLICK on any glowing destination tile on the map to move there!`, 'level');
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
    this.game.addLog(`${p.displayName} stepped on ${tile.name} (${tile.type.toUpperCase()}).`);

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
        this.game.addLog(`🪙 LUCKY TILE! ${p.displayName} received a fortune blessing (+${bonus}G)!`, 'gold');
        this.advanceTurn();
        break;

      case 'red':
        const penalty = Math.min(p.gold, 35 + Math.floor(Math.random() * 40));
        p.gold -= penalty;
        p.hp = Math.max(10, p.hp - 15);
        audio.hurt();
        this.game.addLog(`💀 HAZARD TILE! ${p.displayName} triggered a spike ambush (-${penalty}G, -15 HP)!`);
        this.advanceTurn();
        break;

      case 'church':
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        audio.levelUp();
        this.game.addLog(`✨ SACRED CATHEDRAL! ${p.displayName} was cleansed and blessed (Full Recovery)!`);
        this.advanceTurn();
        break;

      case 'dark_gate':
        if (darklingSystem.canTransform(p, this.game.players, this.game.allNodes)) {
          document.getElementById('darklingPactModal')?.classList.remove('hidden');
        } else {
          this.game.addLog(`The Altar of Rico remains silent. Only the lowest lord may enter the Dark Pact.`);
        }
        this.advanceTurn();
        break;

      case 'vault':
        const loot = 90 + Math.floor(Math.random() * 110);
        p.gold += loot;
        audio.coin();
        this.game.addLog(`🎁 ANCIENT VAULT! ${p.displayName} pried open the vault and claimed ${loot}G!`, 'gold');
        this.advanceTurn();
        break;

      case 'boss':
        this.initiateBossBattle();
        break;

      case 'empty':
      default:
        this.initiateRandomEncounter(tile);
        break;
    }
  }

  private initiatePvPDuel(challenger: Player, rival: Player) {
    this.game.addLog(`⚔️ PVP COLLISION! ${challenger.displayName} crossed paths with ${rival.displayName}! DOKAPON DUEL!`, 'battle');

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
      if (winner.playerRef?.id === challenger.id) {
        this.prankUI.open(rival, () => this.advanceTurn());
      } else {
        this.prankUI.open(challenger, () => this.advanceTurn());
      }
    });
  }

  private initiateTownLiberationBattle(townNode: BoardNode) {
    const data = townNode.townData!;
    this.game.addLog(`⚔️ ${townNode.name} is besieged by ${data.monsterName}! Fight to liberate it!`, 'battle');

    const monsterCombatant: Combatant = {
      name: data.monsterName,
      hp: data.monsterHp,
      maxHp: data.monsterHp,
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
        this.game.addLog(`👑 TOWN LIBERATED! ${winner.playerRef.displayName} freed ${townNode.name} (+${rewards.goldReward}G, +${rewards.xpReward} XP)!`, 'level');
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
        this.game.addLog(`🏴‍☠️ TOWN CONQUERED! ${winner.playerRef.displayName} crushed the garrison and seized ${townNode.name}!`, 'battle');
      }
      this.advanceTurn();
    });
  }

  private initiateRandomEncounter(tile: BoardNode) {
    const monsterNames = ['Forest Goblin', 'Slime Bloblet', 'Briar Kobold', 'Crypt Skeleton', 'Dune Bandit'];
    const pickedName = monsterNames[Math.floor(Math.random() * monsterNames.length)];

    const monsterCombatant: Combatant = {
      name: pickedName,
      hp: 60 + Math.floor(Math.random() * 35),
      maxHp: 95,
      mp: 20,
      maxMp: 20,
      atk: 12 + Math.floor(Math.random() * 6),
      def: 7 + Math.floor(Math.random() * 5),
      mag: 6,
      spd: 8,
      luk: 5
    };

    this.battleUI.startBattle(monsterCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const goldWon = 40 + Math.floor(Math.random() * 40);
        winner.playerRef.gold += goldWon;
        winner.playerRef.gainXP(50);
        this.game.addLog(`🏆 ${winner.playerRef.displayName} defeated ${pickedName} (+${goldWon}G, +50 XP)!`);
      }
      this.advanceTurn();
    });
  }

  private initiateBossBattle() {
    this.game.addLog(`⚠️ ANCIENT DRAGON OVERLORD DESCENDS! COMBAT OF LEGENDS!`, 'battle');

    const bossCombatant: Combatant = {
      name: 'Dragon King Ignis',
      hp: 380,
      maxHp: 380,
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
        this.game.addLog(`👑 ${winner.playerRef.displayName} SLAYED THE DRAGON OVERLORD! ETERNAL GLORY!`, 'level');
        this.game.phase = 'VICTORY';
        this.triggerVictoryModal(winner.playerRef, 'Slayed Dragon King Ignis');
      } else {
        this.advanceTurn();
      }
    });
  }

  private advanceTurn() {
    this.hud.update();
    this.game.endTurn(() => {
      this.weeklyReportUI.open(() => {
        // Announce King Rico's Royal Decree for the new week!
        this.openRoyalDecreeModal(() => {
          this.game.startTurn();
          this.hud.update();
          if (this.game.activePlayer.isAI) {
            setTimeout(() => this.triggerDiceRoll(), 800);
          }
        });
      });
    });

    if (this.game.activePlayer.isAI && this.game.phase === 'BOARD_TURN') {
      setTimeout(() => this.triggerDiceRoll(), 800);
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
        select.innerHTML = '<option value="">No opponents</option>';
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
            ${canCast ? 'CAST ➔' : 'NO MP'}
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
    document.getElementById('victorySubtitle')!.innerText = `${winner.displayName} reigns supreme!`;
    document.getElementById('victoryStatsSummary')!.innerHTML = `
      <div><strong>VICTORY FEAT:</strong> ${feat}</div>
      <div><strong>FINAL NET WORTH:</strong> ${winner.getNetWorth(this.game.allNodes)} Gold</div>
      <div><strong>TOWNS GOVERNED:</strong> ${winner.townsControlled} Territories</div>
      <div><strong>HERO LEVEL:</strong> Level ${winner.level} (${winner.className})</div>
    `;
    modal.classList.remove('hidden');
  }

  private openInventory() {
    const p = this.game.activePlayer;
    const modal = document.getElementById('inventoryModal')!;
    document.getElementById('invHeroName')!.innerText = `${p.displayName}'s Gear`;
    document.getElementById('invHeroStatsSummary')!.innerText = `LV ${p.level} ${p.className} • ${p.gold}G Cash`;

    document.getElementById('equippedSlotsList')!.innerHTML = `
      <div class="p-1 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
        <span>🗡️ Weapon:</span>
        <span class="font-bold text-amber-300">${p.equipment.weapon?.name || 'None'}</span>
      </div>
      <div class="p-1 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
        <span>🦺 Armor:</span>
        <span class="font-bold text-amber-300">${p.equipment.armor?.name || 'None'}</span>
      </div>
      <div class="p-1 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
        <span>💍 Accessory:</span>
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
          ${item.type === 'potion' || item.type === 'spinner' ? 'USE' : 'EQUIP'}
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
          this.game.addLog(`Laced up ${item.name}! Next roll will roll ${p.activeSpinnerMultiplier} dice!`);
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
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    const sx = w / 36;
    const sy = h / 32;

    // Roads
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    this.game.allNodes.forEach(node => {
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = this.game.allNodes.find(n => n.id === nId);
          if (target) {
            ctx.beginPath();
            ctx.moveTo(node.gx * sx, node.gy * sy);
            ctx.lineTo(target.gx * sx, target.gy * sy);
            ctx.stroke();
          }
        }
      });
    });

    // Nodes
    this.game.allNodes.forEach(node => {
      ctx.fillStyle =
        node.type === 'town'
          ? '#fbbf24'
          : node.type === 'boss'
          ? '#ef4444'
          : node.type === 'dark_gate'
          ? '#c084fc'
          : '#3b82f6';
      ctx.beginPath();
      ctx.arc(node.gx * sx, node.gy * sy, node.type === 'town' ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (node.type === 'town' || node.type === 'boss') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Silkscreen';
        ctx.fillText(node.name, node.gx * sx - 15, node.gy * sy - 6);
      }
    });

    // Players
    this.game.players.forEach(pl => {
      ctx.fillStyle = pl.isDarkling ? '#f43f5e' : pl.color;
      ctx.beginPath();
      ctx.arc(pl.gridX * sx, pl.gridY * sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
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
