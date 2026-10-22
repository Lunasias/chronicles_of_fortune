import { encounterChance, monsterRewards, RULES } from './game/Rules';
import { chooseJourney, offerWeeklyDraft } from './ui/JourneyUI';
import './styles/tailwind.css';
import './styles/art-direction.css';
import './styles/interface.css';
import './styles/responsive-hud.css';
import { installInterface } from './ui/Interface';
import { installAudioSettings } from './ui/AudioSettings';
import { installPixelIcons } from './ui/PixelIcons';
import { installGraphicsSettings } from './ui/GraphicsSettings';
import { equipmentComparison } from './ui/EquipmentComparison';
import { installInventoryTools } from './ui/InventoryTools';
import { JOB_VISUALS } from './engine/JobVisuals';
import { GameState } from './game/GameState';
import { IsometricRenderer } from './engine/IsometricRenderer';
import { canAcceptTurnPacket, acceptNetworkMovement, applyNetworkState, RemoteMovementPlayback } from './engine/MultiplayerSync';
import { canShowMovementNavigation } from './engine/NavigationArrows';
import { HUD } from './ui/HUD';
import { MovementUI } from './ui/MovementUI';
import { BattleUI } from './ui/BattleUI';
import { TownUI } from './ui/TownUI';
import { ShopUI, SHOP_CATALOG } from './ui/ShopUI';
import { PrankUI } from './ui/PrankUI';
import { WeeklyReportUI } from './ui/WeeklyReportUI';
import { IsekaiEventUI } from './ui/IsekaiEventUI';
import { HERO_CLASSES, HERO_SKINS, Player, FIELD_SPELLS, TIER3_PROMOTIONS } from './game/Player';
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
import { CasinoUI } from './ui/CasinoUI';
import { dungeonSystem } from './game/DungeonSystem';
import { hallOfFameUI } from './ui/HallOfFameUI';
import { multiplayerRoomUI, MultiplayerStartOptions } from './ui/MultiplayerRoomUI';
import { networkRoomManager, NetworkPacket, ActiveMPSession, getOrCreateClientSessionId } from './engine/NetworkRoomManager';
import { getNodeEncounterPreview } from './game/MonsterDatabase';
import { scaleMonster, tierForNode } from './game/BalanceSystem';
import type { ThreatTier } from './game/BalanceSystem';
import { SaveManager } from './game/SaveManager';
import { escapeHtml } from './util/Html';
import { triggerHaptic } from './util/haptics';
import { companionKeyForDefeatedMonster, createCompanion, getCompanionProfile } from './game/CompanionDatabase';
import { GamepadController } from './engine/GamepadController';
import { mobileDisplayManager } from './ui/MobileDisplayManager';
import { completeArtworkBoot } from './engine/ArtworkLoading';
import { AdventureGuide } from './ui/AdventureGuide';
import './styles/adventure.css';
import './styles/kingdom.css';
import { gameDialogs } from './ui/GameDialogs';
import { withDialogControls } from './ui/DialogControls';
import { WorldNavigator } from './ui/WorldNavigator';
import { installCampaignLauncher } from './ui/CampaignLauncher';
import { startRoyalContract, claimRoyalContract, abandonRoyalContract, royalContractViews, recordRoyalBossVictory } from './game/RoyalContracts';

class DokaponApp {
  private visualReviewActive = false;
  private visualReviewMeter: HTMLElement | null = null;
  private visualReviewSamples = 0;
  private visualReviewSampleAt = 0;
  private canvas: HTMLCanvasElement;
  private renderer: IsometricRenderer;
  private remoteMovement = new RemoteMovementPlayback();
  private game: GameState;
  private hud: HUD;
  private movementUI: MovementUI;
  private adventureGuide: AdventureGuide;
  private worldNavigator: WorldNavigator;
  private selectedMoveNodeId: number | null = null;
  private battleUI: BattleUI;
  private gamepadController!: GamepadController;
  private townUI: TownUI;
  private shopUI: ShopUI;
  private prankUI: PrankUI;
  private weeklyReportUI: WeeklyReportUI;
  private isekaiEventUI: IsekaiEventUI;
  private wonderChestUI: WonderChestUI;
  private inspectUI: InspectUI;
  private homeUI: HomeUI;
  private fantasyEventUI: FantasyEventUI;
  private casinoUI: CasinoUI;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialDownX = 0;
  private initialDownY = 0;
  private hasMovedWhileDragging = false;
  private touchStartTime = 0;
  private isPinching = false;
  private initialPinchDist = 0;
  private initialPinchZoom = 1.0;
  private bossCurrentHp = 950;
  private bossMaxHp = 950;
  private worldMapFilter: string = 'all';
  private mapTransform = { minGx: 0, minGy: 0, scale: 1, offsetX: 0, offsetY: 0 };
  /** Per-card skin refresh callbacks for the currently rendered roster. */
  private rosterSkinUpdaters: Array<() => void> = [];
  private rosterAssetsListenerBound = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new IsometricRenderer(this.canvas);
    this.game = new GameState();

    this.hud = new HUD(this.game);
    this.worldNavigator = new WorldNavigator(this.game, node => {
      this.renderer.centerCameraOn(node.gx, node.gy, node.gz); this.renderer.hoveredNodeId = node.id;
    }, id => this.previewMoveDestination(id));
    this.movementUI = new MovementUI(
      direction => this.cycleHighlightedNode(direction),
      () => this.confirmMoveDestination(),
      () => this.centerOnHero(),
      id => this.previewMoveDestination(id)
    );
    this.adventureGuide = new AdventureGuide(this.game, node => {
      this.renderer.centerCameraOn(node.gx, node.gy, node.gz);
      this.renderer.hoveredNodeId = node.id;
    }, (action, id) => this.handleRoyalContract(action, id), () => this.game.phase === 'BOARD_TURN' && this.isMyTurn() && !this.game.activePlayer?.isAI);
    this.worldNavigator.attachMovementAction();
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
    this.casinoUI = new CasinoUI(this.game);

    dungeonSystem.ensureDungeonLoaded(this.game);
    (window as any).__gameApp = this;
    (window as any).__battleUI = this.battleUI;

    document.getElementById('btnTitleHallOfFame')?.addEventListener('click', () => {
      hallOfFameUI.open();
    });
    multiplayerRoomUI.setStartGameCallback(opts => this.startMultiplayerGame(opts));
    document.getElementById('btnTitleMultiplayerRoom')?.addEventListener('click', () => {
      multiplayerRoomUI.open(opts => {
        this.startMultiplayerGame(opts);
      });
    });
    document.getElementById('btnViewHallOfFameFromVictory')?.addEventListener('click', () => {
      hallOfFameUI.open();
    });

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
    installCampaignLauncher(this.game);
    this.bindInteractiveTileSelection();
    this.updateTitleSaveStatus();
    this.initGamepadController();
    this.bindNetworkListeners();
    this.checkPendingMultiplayerRejoin();

    window.addEventListener('beforeunload', () => {
      if (networkRoomManager.isInRoom()) {
        const snap = SaveManager.serializeGameState(this.game, {
          currentHp: this.bossCurrentHp,
          maxHp: this.bossMaxHp
        });
        networkRoomManager.saveSessionSnapshot(snap);
      }
    });
  }

  public isMyTurn(): boolean {
    if (!networkRoomManager.isInRoom()) return true;
    if (this.game.activePlayer.isAI) return false;
    return this.game.activePlayerIdx === networkRoomManager.getLocalPlayerIndex();
  }

  private ownsActiveTurn(): boolean {
    return !networkRoomManager.isInRoom() || this.isMyTurn() || (networkRoomManager.isHost() && this.game.activePlayer.isAI);
  }

  private isTurnPacket(pkt: NetworkPacket): boolean {
    return canAcceptTurnPacket(this.game, networkRoomManager.getRoomInfo(), pkt);
  }

  private canShowMovementNavigation(): boolean {
    return !!this.game.activePlayer && canShowMovementNavigation(this.game.phase, this.game.remainingMoves, this.game.activePlayer.isAI, this.isMyTurn())
      && !Array.from(document.querySelectorAll('[role="dialog"], #diceRollModal')).some(panel => !panel.closest('.hidden, [hidden]'));
  }

  private startMultiplayerGame(opts: MultiplayerStartOptions) {
    this.remoteMovement.cancel();
    this.renderer.camera.targetZoom = this.renderer.getDefaultZoom();
    if (opts.saveData) {
      const me = networkRoomManager.getRoomInfo()?.connectedPeers.find(p => p.id === networkRoomManager.getMyPeerId());
      if (me?.playerIndex !== undefined) networkRoomManager.setLocalPlayerIndex(me.playerIndex);
      SaveManager.applySaveData(this.game, opts.saveData, false);
      this.game.gameMode = (opts.gameMode as any) || 'standard';
      this.game.aiDifficulty = opts.aiDifficulty || 'tactical';
      networkRoomManager.setStatus('playing');
      networkRoomManager.saveSessionSnapshot(opts.saveData);
    } else {
      this.game.gameMode = (opts.gameMode as any) || 'standard';
      this.game.initGame(opts.partyConfig, opts.winGoal || 'networth');
      this.game.gameMode = (opts.gameMode as any) || 'standard';
      this.game.aiDifficulty = opts.aiDifficulty || 'tactical';
      networkRoomManager.setLocalPlayerIndex(0);
      networkRoomManager.setStatus('playing');

      const initialSave = SaveManager.serializeGameState(this.game, {
        currentHp: this.bossCurrentHp,
        maxHp: this.bossMaxHp
      });
      networkRoomManager.saveSessionSnapshot(initialSave);

      networkRoomManager.broadcast({
        packetId: `start_${Date.now()}`,
        type: 'START_GAME',
        roomCode: networkRoomManager.getRoomCode()!,
        senderId: 'host',
        senderName: this.game.players[0]?.displayName || 'Host',
        payload: {
          partyConfig: opts.partyConfig,
          gameMode: opts.gameMode,
          winGoal: opts.winGoal,
          aiDifficulty: opts.aiDifficulty,
          saveData: initialSave
        },
        timestamp: Date.now()
      });
    }

    document.getElementById('titleScreen')?.classList.add('hidden');
    document.getElementById('topHUD')?.classList.remove('hidden');
    document.getElementById('bottomBar')?.classList.remove('hidden');

    this.updateMultiplayerHudBadge();
    this.onTurnStarted();

    if (this.game.activePlayer.isAI) {
      this.handleAITurnStart();
    }
  }

  private bindNetworkListeners() {
    networkRoomManager.onPacket(pkt => {
      if (pkt.type === 'DICE_ROLL') {
        if (!this.isTurnPacket(pkt) || !['BOARD_TURN', 'DICE_ROLLING'].includes(this.game.phase)) return;
        const roll = pkt.payload?.totalRoll;
        if (!Number.isInteger(roll) || roll < 1 || roll > 32) return;
        this.game.remainingMoves = roll;
        this.game.phase = 'CHOOSING_PATH';
        this.game.updateReachableHighlights(); this.hud.update();
      } else if (pkt.type === 'MOVE_PATH') {
        const path = acceptNetworkMovement(this.game, networkRoomManager.getRoomInfo(), pkt);
        if (!path) return;
        this.remoteMovement.play(this.game, path, () => {
          const p = this.game.activePlayer;
          this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
          this.hud.update();
        }, pkt.payload.gameSpeed);
      } else if (pkt.type === 'BATTLE_VIEW') {
        if (!this.isTurnPacket(pkt)) return;
        this.remoteMovement.cancel();
        this.battleUI.receiveBattleView(pkt);
      } else if (pkt.type === 'SYNC_STATE') {
        if (!this.isTurnPacket(pkt) || !pkt.payload?.state) return;
        const previousPlayer = this.game.activePlayerIdx;
        const result = applyNetworkState(this.game, pkt.payload);
        if (!result.success) return;
        this.remoteMovement.cancel();
        this.battleUI.closeSpectatorView();
        const p = this.game.activePlayer;
        this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
        if (result.bossState) { this.bossCurrentHp = result.bossState.currentHp; this.bossMaxHp = result.bossState.maxHp; }
        networkRoomManager.saveSessionSnapshot(pkt.payload.state); this.hud.update();
        if (previousPlayer !== this.game.activePlayerIdx || this.game.phase === 'BOARD_TURN') {
          this.onTurnStarted();
          if (this.game.activePlayer.isAI) this.handleAITurnStart();
        }
      } else if (pkt.type === 'REJOIN_ROOM') {
        if (networkRoomManager.isHost() && networkRoomManager.getRoomInfo()?.status === 'playing') {
          const targetPlayerIndex = networkRoomManager.getRoomInfo()?.connectedPeers.find(p => p.id === pkt.senderId)?.playerIndex;
          // A transport reconnect must not overwrite a still-running turn. A refreshed
          // turn owner instead resumes a shared board checkpoint on every machine.
          this.battleUI.resendRemotePrompt(targetPlayerIndex!);
          if (targetPlayerIndex === this.game.activePlayerIdx && !pkt.payload?.previousPeerId) return;
          const restartTurn = targetPlayerIndex === this.game.activePlayerIdx;
          if (restartTurn) {
            this.game.phase = 'BOARD_TURN'; this.game.remainingMoves = 0; this.game.highlightedNodes = [];
          }
          const currentSave = SaveManager.serializeGameState(this.game, {
            currentHp: this.bossCurrentHp,
            maxHp: this.bossMaxHp
          });
          networkRoomManager.broadcast({
            packetId: `rejoin_ack_${Date.now()}`,
            type: 'REJOIN_ACK',
            roomCode: networkRoomManager.getRoomCode()!,
            senderId: 'host',
            senderName: this.game.players[0]?.displayName || 'Host',
            payload: {
              saveData: currentSave,
              restartTurn,
              playerIndex: targetPlayerIndex,
              clientSessionId: pkt.payload?.clientSessionId,
              peerId: pkt.senderId,
              gameMode: this.game.gameMode,
              winGoal: this.game.winGoal,
              aiDifficulty: this.game.aiDifficulty
            },
            timestamp: Date.now()
          });
          if (restartTurn) this.onTurnStarted();
        }
      } else if (pkt.type === 'REJOIN_ACK') {
        if (!networkRoomManager.isHost() && pkt.payload?.saveData) {
          const mySessionId = getOrCreateClientSessionId();
          const isTarget = pkt.payload.clientSessionId === mySessionId || pkt.payload.peerId === networkRoomManager.getMyPeerId();
          if (isTarget || pkt.payload.restartTurn) {
            this.remoteMovement.cancel();
            if (pkt.payload.restartTurn) document.getElementById('journeyDecision')?.classList.add('hidden');
            if (isTarget && typeof pkt.payload.playerIndex === 'number') {
              networkRoomManager.setLocalPlayerIndex(pkt.payload.playerIndex);
            }
            networkRoomManager.setStatus('playing');
            SaveManager.applySaveData(this.game, pkt.payload.saveData, false);
            if (pkt.payload.gameMode) this.game.gameMode = pkt.payload.gameMode;
            if (pkt.payload.aiDifficulty) this.game.aiDifficulty = pkt.payload.aiDifficulty;
            networkRoomManager.saveSessionSnapshot(pkt.payload.saveData);

            document.getElementById('titleScreen')?.classList.add('hidden');
            document.getElementById('topHUD')?.classList.remove('hidden');
            document.getElementById('bottomBar')?.classList.remove('hidden');
            this.onTurnStarted();
            this.hud.update();
            this.updateMultiplayerHudBadge();
            this.game.addLog(`⚡ เชื่อมต่อกลับเข้าห้องสำเร็จแล้ว! (Reconnected)`, 'info');
          }
        }
      } else if (pkt.type === 'PEER_RECONNECTED') {
        const reconnectedName = pkt.payload?.peer?.name || pkt.senderName;
        this.game.addLog(`🌐 ผู้เล่น [${reconnectedName}] เชื่อมต่อกลับเข้ามาแล้ว!`, 'info');
        this.updateMultiplayerHudBadge();
        this.battleUI.resendRemotePrompt(pkt.payload?.peer?.playerIndex);
      } else if (pkt.type === 'BATTLE_PROMPT') {
        this.battleUI.receiveBattlePrompt(pkt);
      } else if (pkt.type === 'BATTLE_ACTION') {
        this.battleUI.receiveRemoteBattlePacket(pkt);
      } else if (pkt.type === 'CHAT_MSG') {
        this.game.addLog(`💬 [${pkt.senderName}]: ${pkt.payload?.text || ''}`, 'info');
      }
    });

    networkRoomManager.onStateChange(() => {
      if (!networkRoomManager.isInRoom()) { this.remoteMovement.cancel(); this.battleUI.closeSpectatorView(); }
      this.updateMultiplayerHudBadge();
    });
  }

  private updateMultiplayerHudBadge() {
    let badge = document.getElementById('hudMultiplayerBadge');
    if (!networkRoomManager.isInRoom()) {
      if (badge) badge.classList.add('hidden');
      return;
    }

    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'hudMultiplayerBadge';
      badge.className = 'multiplayer-turn-chip';
      badge.title = 'คลิกเพื่อดูห้องและแชทเล่นหลายคน';
      badge.addEventListener('click', () => {
        multiplayerRoomUI.open();
      });
      document.querySelector('#hudHeroCard .hero-card-details')?.appendChild(badge);
    }

    badge.classList.remove('hidden');
    const myIdx = networkRoomManager.getLocalPlayerIndex();
    const isMe = this.game.activePlayerIdx === myIdx;
    badge.dataset.myTurn = String(isMe);
    badge.setAttribute('aria-label', `${networkRoomManager.getRoomCode()} · ${isMe ? 'ตาคุณ' : `ตาของ ${this.game.activePlayer?.displayName || `P${this.game.activePlayerIdx + 1}`}`} · เปิดห้องและแชท`);
    badge.innerHTML = `
      <span class="multiplayer-room-code">${escapeHtml(networkRoomManager.getRoomCode() || '')}</span>
      <span class="multiplayer-turn-label">${isMe ? 'ตาคุณ' : `ตาของ P${this.game.activePlayerIdx + 1}`}</span>
    `;
  }

  private syncMultiplayerState(authorityPlayerIdx = this.game.activePlayerIdx) {
    if (!networkRoomManager.isInRoom()) return;
    const authority = this.game.players[authorityPlayerIdx];
    if (!(authority?.isAI ? networkRoomManager.isHost() : authorityPlayerIdx === networkRoomManager.getLocalPlayerIndex())) return;

    const snapshot = SaveManager.serializeGameState(this.game, {
      currentHp: this.bossCurrentHp,
      maxHp: this.bossMaxHp
    });
    networkRoomManager.saveSessionSnapshot(snapshot);
    networkRoomManager.broadcast({
      packetId: `sync_${Date.now()}`,
      type: 'SYNC_STATE',
      roomCode: networkRoomManager.getRoomCode()!,
      senderId: networkRoomManager.getMyPeerId(),
      senderName: this.game.activePlayer.displayName,
      payload: { state: snapshot, playerIdx: authorityPlayerIdx, phase: this.game.phase, remainingMoves: this.game.remainingMoves },
      timestamp: Date.now()
    });
  }

  private checkPendingMultiplayerRejoin() {
    const session = networkRoomManager.getActiveSession();
    if (!session || !session.roomCode) return;

    const modal = document.getElementById('mpRejoinModal');
    if (!modal) return;

    const codeEl = document.getElementById('mpRejoinRoomCode');
    if (codeEl) codeEl.textContent = session.roomCode;
    const roleEl = document.getElementById('mpRejoinRole');
    if (roleEl) roleEl.textContent = session.isHost ? 'หัวหน้าห้อง (Host)' : `ผู้เล่น (P${(session.playerIndex ?? 0) + 1})`;
    const statusEl = document.getElementById('mpRejoinStatus');
    if (statusEl) statusEl.textContent = session.status === 'playing' ? 'กำลังเล่น (In Game)' : 'ในล็อบบี้ (Lobby)';
    const timeEl = document.getElementById('mpRejoinTime');
    if (timeEl) timeEl.textContent = new Date(session.lastActiveTime).toLocaleTimeString();

    modal.classList.remove('hidden');

    const btnConfirm = document.getElementById('btnConfirmRejoinMP');
    const btnAbandon = document.getElementById('btnAbandonRejoinMP');

    const cleanup = () => {
      modal.classList.add('hidden');
    };

    btnConfirm?.replaceWith(btnConfirm.cloneNode(true));
    btnAbandon?.replaceWith(btnAbandon.cloneNode(true));

    const newBtnConfirm = document.getElementById('btnConfirmRejoinMP');
    const newBtnAbandon = document.getElementById('btnAbandonRejoinMP');

    newBtnConfirm?.addEventListener('click', async () => {
      cleanup();
      audio.click();
      await this.executeRejoin(session);
    });

    newBtnAbandon?.addEventListener('click', () => {
      cleanup();
      audio.click();
      networkRoomManager.clearSession();
    });
  }

  private async executeRejoin(session: ActiveMPSession) {
    if (session.status === 'lobby') {
      if (session.isHost) {
        networkRoomManager.createRoom(session.playerName, session.classKey, session.skinVariant, session.roomCode);
        networkRoomManager.restoreRoster(session);
      } else networkRoomManager.rejoinRoom(session);
      multiplayerRoomUI.open();
      return;
    }
    if (session.isHost) {
      networkRoomManager.createRoom(
        session.playerName || 'Host',
        session.classKey || 'warrior',
        session.skinVariant || 0,
        session.roomCode
      );
      networkRoomManager.restoreRoster(session);
      networkRoomManager.setStatus('playing');

      if (session.saveDataSnapshot) {
        SaveManager.applySaveData(this.game, session.saveDataSnapshot, false);
        if (session.gameMode) this.game.gameMode = session.gameMode as any;
      }

      document.getElementById('titleScreen')?.classList.add('hidden');
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');

      this.onTurnStarted();
      this.hud.update();
      this.updateMultiplayerHudBadge();
      this.game.addLog(`⚡ คุณกลับเข้าห้องในฐานะ Host เรียบร้อยแล้ว!`, 'info');
      this.syncMultiplayerState();
      if (this.game.activePlayer.isAI) this.handleAITurnStart();
    } else {
      const success = networkRoomManager.rejoinRoom(session);
      // Guest rejoin: restore board visuals immediately from snapshot
      if (session.saveDataSnapshot) {
        SaveManager.applySaveData(this.game, session.saveDataSnapshot, false);
        if (session.gameMode) this.game.gameMode = session.gameMode as any;
        document.getElementById('titleScreen')?.classList.add('hidden');
        document.getElementById('topHUD')?.classList.remove('hidden');
        document.getElementById('bottomBar')?.classList.remove('hidden');
        this.onTurnStarted();
        this.hud.update();
        this.updateMultiplayerHudBadge();
      }

      if (success) {
        this.game.addLog(`🔄 กำลังเชื่อมต่อกลับเข้าห้อง ${session.roomCode}...`, 'info');
      } else {
        this.game.addLog(`⚠️ ไม่สามารถเชื่อมต่อกลับเข้าห้องได้`, 'info');
      }
    }
  }

  private handleAITurnStart() {
    if (!this.game.activePlayer.isAI) return;
    if (networkRoomManager.isInRoom() && !networkRoomManager.isHost()) {
      return;
    }
    const ai = this.game.activePlayer;
    if (!ai.isDarkling && this.game.world.random() < 0.25) {
      const trapDecision = aiSystem.chooseTrapPlacement(ai, this.game.allNodes, this.game.players, this.game.placedTraps);
      if (trapDecision) {
        ai.gold -= 60;
        this.game.placedTraps.push({
          nodeId: trapDecision.nodeId,
          ownerId: ai.id,
          damage: Math.round(ai.atk * 1.5),
          type: trapDecision.type
        });
        this.game.addLog(`🕵️ ${ai.displayName} แอบวางกับดัก (${trapDecision.type.toUpperCase()}) บนกระดาน!`, 'battle');
      }
    }
    const totalRoll = this.game.rollMovementDice();
    this.syncMultiplayerState();
    if (networkRoomManager.isInRoom()) {
      networkRoomManager.broadcast({
        packetId: `dice_ai_${Date.now()}`,
        type: 'DICE_ROLL',
        roomCode: networkRoomManager.getRoomCode()!,
        senderId: 'host',
        senderName: ai.displayName,
        payload: { playerIdx: this.game.activePlayerIdx, totalRoll },
        timestamp: Date.now()
      });
    }
    setTimeout(() => this.triggerDiceRoll(totalRoll), Math.max(150, Math.round(1200 / (this.game.gameSpeed || 1))));
  }

  private selectNodeToMove(targetNode: BoardNode) {
    if (!this.canShowMovementNavigation()) return;
    if (!this.game.highlightedNodes.includes(targetNode.id)) return;

    const path = this.game.findPathToTarget(targetNode.id);
    if (!path || path.length <= 1) return;

    this.inspectUI.hideMoveDestinationPreview();

    // Pre-combat scouting check: if a rival player is standing on this tile, scout them first!
    const rival = this.game.players.find(
      pl => pl.id !== this.game.activePlayer.id && pl.nodeId === targetNode.id && pl.hp > 0
    );

    if (rival && !this.game.activePlayer.isAI) {
      this.inspectUI.openDuelScouting(
        this.game.activePlayer,
        rival,
        targetNode.name,
        () => {
          audio.coin();
          this.renderer.hoveredNodeId = null;
          this.renderer.previewPathNodeIds = [];
          if (networkRoomManager.isInRoom()) {
            networkRoomManager.broadcast({
              packetId: `move_${Date.now()}`,
              type: 'MOVE_PATH',
              roomCode: networkRoomManager.getRoomCode()!,
              senderId: networkRoomManager.getMyPeerId(),
              senderName: this.game.activePlayer.displayName,
              payload: { playerIdx: this.game.activePlayerIdx, path, remainingMoves: this.game.remainingMoves, gameSpeed: this.game.gameSpeed },
              timestamp: Date.now()
            });
          }
          this.game.executePath(
            path,
            () => this.onMoveStep(),
            tile => this.handleTileArrival(tile)
          );
        },
        () => {}
      );
      return;
    }

    // Pre-combat monster scouting check: if node is town occupied by monster or boss lair!
    const preview = getNodeEncounterPreview(targetNode, this.game.activePlayer);
    if (
      preview.featuredMonster &&
      (targetNode.townData?.isOccupiedByMonster || targetNode.type === 'boss') &&
      !this.game.activePlayer.isAI
    ) {
      this.inspectUI.openMonsterScouting(
        preview.featuredMonster,
        targetNode,
        this.game.activePlayer,
        () => {
          audio.coin();
          this.renderer.hoveredNodeId = null;
          this.renderer.previewPathNodeIds = [];
          if (networkRoomManager.isInRoom()) {
            networkRoomManager.broadcast({
              packetId: `move_${Date.now()}`,
              type: 'MOVE_PATH',
              roomCode: networkRoomManager.getRoomCode()!,
              senderId: networkRoomManager.getMyPeerId(),
              senderName: this.game.activePlayer.displayName,
              payload: { playerIdx: this.game.activePlayerIdx, path, remainingMoves: this.game.remainingMoves, gameSpeed: this.game.gameSpeed },
              timestamp: Date.now()
            });
          }
          this.game.executePath(
            path,
            () => this.onMoveStep(),
            tile => this.handleTileArrival(tile)
          );
        },
        () => {}
      );
      return;
    }

    audio.coin();
    this.renderer.hoveredNodeId = null;
    this.renderer.previewPathNodeIds = [];

    if (networkRoomManager.isInRoom()) {
      networkRoomManager.broadcast({
        packetId: `move_${Date.now()}`,
        type: 'MOVE_PATH',
        roomCode: networkRoomManager.getRoomCode()!,
        senderId: networkRoomManager.getMyPeerId(),
        senderName: this.game.activePlayer.displayName,
        payload: { playerIdx: this.game.activePlayerIdx, path, remainingMoves: this.game.remainingMoves, gameSpeed: this.game.gameSpeed },
        timestamp: Date.now()
      });
    }

    // Execute full path chosen by player!
    this.game.executePath(
      path,
      () => this.onMoveStep(),
      tile => this.handleTileArrival(tile)
    );
  }

  // =========================================================================
  // INTERACTIVE CLICK / TAP-TO-MOVE TILE SELECTION ON THE 2.5D BOARD
  // =========================================================================
  private handleCanvasSelectAt(clientX: number, clientY: number) {
    if (!this.canShowMovementNavigation()) return;

    const directionId = this.renderer.navigationTargetAt(clientX, clientY);
    if (directionId !== null && this.game.highlightedNodes.includes(directionId)) {
      const target = this.game.allNodes.find(n => n.id === directionId);
      if (target) {
        this.renderer.centerCameraOn(target.gx, target.gy, target.gz);
        this.renderer.hoveredNodeId = target.id;
        this.selectedMoveNodeId = target.id;
      }
      return;
    }
    const clickedNode = this.renderer.screenToNode(clientX, clientY, this.game.allNodes, this.game.highlightedNodes);
    if (clickedNode && this.game.highlightedNodes.includes(clickedNode.id)) {
      this.selectNodeToMove(clickedNode);
    }
  }

  // =========================================================================
  // WEB GAMEPAD CONTROLLER INTEGRATION
  // =========================================================================
  private initGamepadController() {
    this.gamepadController = new GamepadController(withDialogControls({
      onPan: (dx, dy) => {
        if (!this.game.activeBattle && !this.adventureGuide.isOpen) {
          this.renderer.panCamera(dx, dy);
        }
      },
      onZoom: (delta) => {
        if (!this.game.activeBattle && !this.adventureGuide.isOpen) {
          this.stepCameraZoom(delta > 0 ? 1 : -1);
          this.renderer.clampCameraBounds();
        }
      },
      onConfirm: () => {
        if (this.adventureGuide.isOpen) {
          if (document.activeElement instanceof HTMLButtonElement) document.activeElement.click();
          return;
        }
        if (this.game.activeBattle) {
          const isAtk = this.game.activeBattle.isPlayerAttacking;
          if (isAtk) {
            document.getElementById('btnCmdAttack')?.click();
          } else {
            document.getElementById('btnCmdDefend')?.click();
          }
        } else {
          if (this.canShowMovementNavigation()) {
            this.confirmMoveDestination();
            return;
          }
          // On board: Roll dice / spinner if waiting for roll
          const rollBtn = document.getElementById('btnRollDice');
          const spinnerBtn = document.getElementById('btnUseSpinner');
          if (rollBtn && !rollBtn.classList.contains('hidden') && !rollBtn.hasAttribute('disabled')) {
            rollBtn.click();
            return;
          }
          if (spinnerBtn && !spinnerBtn.classList.contains('hidden') && !spinnerBtn.hasAttribute('disabled')) {
            spinnerBtn.click();
            return;
          }
          // If node preview is active, move to hovered node
          if (this.renderer.hoveredNodeId !== null && this.game.highlightedNodes.includes(this.renderer.hoveredNodeId)) {
            const targetNode = this.game.allNodes.find(n => n.id === this.renderer.hoveredNodeId);
            if (targetNode) this.selectNodeToMove(targetNode);
          }
        }
      },
      onCancel: () => {
        if (this.adventureGuide.isOpen) { this.adventureGuide.close(); return; }
        if (this.game.activeBattle) {
          const isAtk = this.game.activeBattle.isPlayerAttacking;
          if (isAtk) {
            document.getElementById('btnCmdGiveUp')?.click();
          } else {
            document.getElementById('btnCmdCounter')?.click();
          }
        } else {
          const modals = [
            'worldMapModal',
            'inventoryModal',
            // modalBag consolidated into inventoryModal
            'settingsModal',
            'shopModal',
            'townModal',
            'hallOfFameModal',
            'inspectModal'
          ];
          for (const mId of modals) {
            const el = document.getElementById(mId);
            if (el && !el.classList.contains('hidden')) {
              if (mId === 'shopModal') { this.shopUI.close(); return; }
              if (mId === 'townModal') { this.townUI.close(); return; }
              if (mId === 'inventoryModal') { document.getElementById('btnCloseInventory')?.click(); return; }
              el.classList.add('hidden');
              audio.click();
              return;
            }
          }
        }
      },
      onSecondary: () => {
        if (this.adventureGuide.isOpen) return;
        if (this.game.activeBattle) {
          const isAtk = this.game.activeBattle.isPlayerAttacking;
          if (isAtk) {
            document.getElementById('btnCmdStrike')?.click();
          } else {
            document.getElementById('btnCmdMagicGuard')?.click();
          }
        } else {
          document.getElementById('btnInventory')?.click();
        }
      },
      onSpecial: () => {
        if (this.adventureGuide.isOpen) return;
        if (this.game.activeBattle) {
          const burstBtn = document.getElementById('btnCmdBurst');
          if (burstBtn && !burstBtn.classList.contains('hidden') && !burstBtn.hasAttribute('disabled')) {
            burstBtn.click();
          } else {
            document.getElementById('btnCmdMagic')?.click();
          }
        } else {
          const modal = document.getElementById('worldMapModal');
          if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            document.getElementById('worldMapTooltip')?.classList.add('hidden');
          } else {
            this.openWorldMapAtlas();
          }
        }
      },
      onSelect: () => {
        if (this.adventureGuide.isOpen) return;
        document.getElementById('btnInspectHero')?.click();
      },
      onStart: () => {
        if (this.adventureGuide.isOpen) return;
        document.getElementById('btnSettings')?.click();
      },
      onDpadLeft: () => this.adventureGuide.isOpen ? this.adventureGuide.moveFocus(-1) : this.cycleHighlightedNode(-1),
      onDpadRight: () => this.adventureGuide.isOpen ? this.adventureGuide.moveFocus(1) : this.cycleHighlightedNode(1),
      onDpadUp: () => this.adventureGuide.isOpen ? this.adventureGuide.moveFocus(-1) : this.cycleHighlightedNode(-1),
      onDpadDown: () => this.adventureGuide.isOpen ? this.adventureGuide.moveFocus(1) : this.cycleHighlightedNode(1)
    }));
  }

  private stepCameraZoom(direction: 1 | -1) {
    const steps = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const current = this.renderer.camera.targetZoom;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const diff = Math.abs(steps[i] - current);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    const nextIdx = Math.max(0, Math.min(steps.length - 1, closestIdx + direction));
    this.renderer.camera.targetZoom = steps[nextIdx];
    this.renderer.camera.zoom = steps[nextIdx];
    this.renderer.clampCameraBounds();
  }

  private confirmMoveDestination() {
    if (!this.canShowMovementNavigation()) return;
    const node = this.game.allNodes.find(n => n.id === this.selectedMoveNodeId);
    if (node) this.selectNodeToMove(node);
  }

  private centerOnHero() {
    const p = this.game.activePlayer;
    if (p) this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
  }

  private cycleHighlightedNode(direction: number) {
    if (!this.canShowMovementNavigation()) return;
    const targetId = this.movementUI.nextDestination(direction);
    if (targetId !== null) this.previewMoveDestination(targetId);
  }

  private previewMoveDestination(targetId: number) {
    if (!this.canShowMovementNavigation() || !this.game.highlightedNodes.includes(targetId)) return;
    const path = this.game.findPathToTarget(targetId);
    if (!path) return;
    const targetNode = this.game.allNodes.find(n => n.id === targetId);
    if (targetNode) {
      this.renderer.hoveredNodeId = targetId;
      this.selectedMoveNodeId = targetId;
      const next = path && this.game.allNodes.find(n => n.id === path[1]);
      if (next) {
        const p = this.game.activePlayer;
        p.facing = this.game.calculateIsoDirection(next.gx - p.gridX, next.gy - p.gridY, p.facing);
      }
      this.renderer.centerCameraOn(targetNode.gx, targetNode.gy, targetNode.gz);
      audio.click();
    }
  }


  private initCanvasResize() {
    /**
     * Every canvas is sized in CSS pixels and scaled by the browser.
     *
     * An earlier attempt sized them in device pixels instead, to force one canvas pixel onto one
     * device pixel. That is right on a display scale of 100% or 200% and wrong on 125% or 250%: the
     * canvas backing store would be a whole multiple of the CSS box while the display is not, so
     * the browser rescales by a fractional ratio anyway, and the canvas no longer lines up with the
     * viewport. At CSS sizing the upscale is a fixed pattern rather than a moving one, and a fixed
     * pattern on irregular art is not something the eye reads as shimmer.
     *
     * What actually removed the discomfort was two other changes: the floor's regular 4x4 dither
     * became irregular grain (a regular micro-pattern sampled at a fractional scale is moire), and
     * the camera zoom is now snapped so every world pixel lands on a whole number of pixels.
     * On a display set to a fractional scale, setting it to 100% removes the browser's fractional
     * upscale entirely and is the one remaining improvement available outside the game.
     */
    const sizeToParent = (el: HTMLCanvasElement | null, fallbackW: number, fallbackH: number) => {
      if (!el) return;
      const parent = el.parentElement;
      el.width = Math.max(1, parent?.clientWidth || fallbackW);
      el.height = Math.max(1, parent?.clientHeight || fallbackH);
      const ctx = el.getContext('2d');
      if (ctx) ctx.imageSmoothingEnabled = false;
    };

    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.renderer.ctx.imageSmoothingEnabled = false;
      this.renderer.clampCameraBounds();

      sizeToParent(document.getElementById('battleCanvas') as HTMLCanvasElement, 800, 450);
      sizeToParent(document.getElementById('worldMapCanvas') as HTMLCanvasElement, 800, 500);

      this.checkOrientationHint();
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => {
      setTimeout(resize, 200);
    });
    resize();
  }

  private checkOrientationHint() {
    mobileDisplayManager.updateBodyClasses();
    mobileDisplayManager.checkAutoPrompt();
  }


  private bindInteractiveTileSelection() {
    // Mouse hover over 2.5D isometric tiles
    this.canvas.addEventListener('mousemove', e => {
      if (this.isDragging || !this.canShowMovementNavigation()) {
        this.renderer.hoveredNodeId = null;
        this.canvas.style.cursor = 'default';
        this.inspectUI.hideMoveDestinationPreview();
        return;
      }

      if (this.renderer.navigationTargetAt(e.clientX,e.clientY) !== null) {
        this.canvas.style.cursor='pointer';
        this.inspectUI.hideMoveDestinationPreview();
        return;
      }
      const hoveredNode = this.renderer.screenToNode(e.clientX, e.clientY, this.game.allNodes, this.game.highlightedNodes);

      if (hoveredNode && this.game.highlightedNodes.includes(hoveredNode.id)) {
        this.renderer.hoveredNodeId = hoveredNode.id;
        this.canvas.style.cursor = 'pointer';

        // Calculate and preview path
        const path = this.game.findPathToTarget(hoveredNode.id);
        this.selectedMoveNodeId = hoveredNode.id;
        // Do not render moving/bouncing neon path line per user request ("ไม่เอาเส้นทางเดินขยับๆ")
        this.renderer.previewPathNodeIds = [];

        const steps = path && path.length > 1 ? path.length - 1 : undefined;

        // Monster Encounter & Stat Preview Tooltip
        this.inspectUI.showMoveDestinationPreview(
          hoveredNode,
          this.game.activePlayer,
          e.clientX,
          e.clientY,
          steps,
          this.game.remainingMoves
        );

        // Turn hero dynamically to face path direction
        if (path && path.length > 1) {
          const nextNode = this.game.allNodes.find(n => n.id === path[1]);
          if (nextNode) {
            const p = this.game.activePlayer;
            p.facing = this.game.calculateIsoDirection(nextNode.gx - p.gridX, nextNode.gy - p.gridY, p.facing);
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
      this.handleCanvasSelectAt(e.clientX, e.clientY);
    });
  }

  private bindDOMEvents() {

    // Title Screen Start
    document.getElementById('btnStartAdventure')?.addEventListener('click', () => {
      audio.click();
      if (!document.querySelector('#playerSetupRoster .player-setup-card')) this.renderRosterSetup(3);
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
      const slot = Number(document.getElementById('btnTitleLoadGame')?.dataset.saveSlot);
      if (Number.isInteger(slot) && slot >= 0 && slot <= 3) this.loadGameProgress(slot);
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

    // Game Mode selection (Standard vs Blitz 20 Days)
    document.querySelectorAll('.game-mode-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        audio.click();
        document.querySelectorAll('.game-mode-btn').forEach(b => {
          b.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold');
          b.classList.add('text-amber-300');
        });
        const target = e.currentTarget as HTMLElement;
        target.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
        target.classList.remove('text-amber-300');
        const mode = target.getAttribute('data-mode') as 'standard' | 'blitz' | 'coop_raid' | 'endless_spire' | 'roguelike_draft';
        this.game.gameMode = mode;
      });
    });

    // House Rules Darkling toggle
    document.getElementById('checkAllowDarkling')?.addEventListener('change', e => {
      const checkbox = e.target as HTMLInputElement;
      this.game.allowDarkling = checkbox.checked;
    });

    // Begin Game
    document.getElementById('btnBeginGame')?.addEventListener('click', () => {
      audio.fanfare();
      this.startGame();
    });

    // Roll Dice button
    document.getElementById('btnRollDice')?.addEventListener('click', () => {
      if (this.game.phase === 'BOARD_TURN' && !this.game.activePlayer.isAI) {
        if (!this.isMyTurn()) {
          this.game.addLog(`⏳ ยังไม่ใช่เทิร์นของคุณ! กำลังรอ ${this.game.activePlayer.displayName} ทอยลูกเต๋า...`);
          return;
        }
        const totalRoll = this.game.rollMovementDice();
        this.syncMultiplayerState();
        if (networkRoomManager.isInRoom()) {
          networkRoomManager.broadcast({
            packetId: `dice_${Date.now()}`,
            type: 'DICE_ROLL',
            roomCode: networkRoomManager.getRoomCode()!,
            senderId: networkRoomManager.getMyPeerId(),
            senderName: this.game.activePlayer.displayName,
            payload: { playerIdx: this.game.activePlayerIdx, totalRoll },
            timestamp: Date.now()
          });
        }
        this.triggerDiceRoll(totalRoll);
      }
    });

    // Multi-Spinner usage
    document.getElementById('btnUseSpinner')?.addEventListener('click', () => {
      if (networkRoomManager.isInRoom() && !this.isMyTurn()) {
        this.game.addLog(`⏳ ยังไม่ใช่เทิร์นของคุณ!`);
        return;
      }
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
      this.syncMultiplayerState();
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
      if (networkRoomManager.isInRoom() && !this.isMyTurn()) {
        this.game.addLog(`⏳ ยังไม่ใช่เทิร์นของคุณ!`);
        return;
      }
      audio.click();
      const p = this.game.activePlayer;
      if (p.isDarkling) {
        if ((darklingSystem as any).calamityUsedThisTurn) {
          this.game.addLog(`⏳ ใช้พลังภัยพิบัติจอมมารไปแล้วในเทิร์นนี้!`, 'darkling');
          return;
        }
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
      if (!this.ownsActiveTurn()) return;
      if ((darklingSystem as any).calamityUsedThisTurn) return;
      (darklingSystem as any).calamityUsedThisTurn = true;
      const msg = darklingSystem.castSummonInvaders(this.game.activePlayer, this.game.allNodes, this.game.players);
      this.game.addLog(msg, 'darkling');
      document.getElementById('darklingSpellsModal')?.classList.add('hidden');
      this.syncMultiplayerState();
    });
    document.getElementById('btnCalamityPlague')?.addEventListener('click', () => {
      if (!this.ownsActiveTurn()) return;
      if ((darklingSystem as any).calamityUsedThisTurn) return;
      (darklingSystem as any).calamityUsedThisTurn = true;
      const msg = darklingSystem.castGlobalPlague(this.game.activePlayer, this.game.players);
      this.game.addLog(msg, 'darkling');
      document.getElementById('darklingSpellsModal')?.classList.add('hidden');
      this.syncMultiplayerState();
    });
    document.getElementById('btnCalamityWarp')?.addEventListener('click', () => {
      if (!this.ownsActiveTurn()) return;
      if ((darklingSystem as any).calamityUsedThisTurn) return;
      (darklingSystem as any).calamityUsedThisTurn = true;
      const res = darklingSystem.castDemonWarp(this.game.activePlayer, this.game.players, this.game.allNodes);
      this.game.addLog(res.message, 'darkling');
      this.syncMultiplayerState();
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

    // Mouse Wheel Zoom
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.stepCameraZoom(e.deltaY < 0 ? 1 : -1);
      // discrete zoom handled by stepCameraZoom
      this.renderer.camera.zoom = this.renderer.camera.targetZoom;
      this.renderer.clampCameraBounds();
    }, { passive: false });

    // Touch events for Mobile & Tablet: 1-finger Pan, Tap-to-move, 2-finger Pinch Zoom
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.isDragging = true;
        this.isPinching = false;
        this.hasMovedWhileDragging = false;
        this.dragStartX = t.clientX;
        this.dragStartY = t.clientY;
        this.initialDownX = t.clientX;
        this.initialDownY = t.clientY;
        this.touchStartTime = Date.now();
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.isPinching = true;
        this.hasMovedWhileDragging = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        this.initialPinchZoom = this.renderer.camera.zoom;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && this.isPinching) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (this.initialPinchDist > 0) {
          const ratio = dist / this.initialPinchDist;
          this.renderer.camera.zoom = Math.max(0.55, Math.min(1.8, this.initialPinchZoom * ratio));
          this.renderer.camera.targetZoom = this.renderer.camera.zoom;
          this.renderer.clampCameraBounds();
        }
      } else if (e.touches.length === 1 && this.isDragging) {
        e.preventDefault();
        const t = e.touches[0];
        const totalDist = Math.hypot(t.clientX - this.initialDownX, t.clientY - this.initialDownY);
        if (totalDist > 10) {
          this.hasMovedWhileDragging = true;
        }
        const dx = t.clientX - this.dragStartX;
        const dy = t.clientY - this.dragStartY;
        this.renderer.camera.x -= dx;
        this.renderer.camera.y -= dy;
        this.renderer.camera.targetX = this.renderer.camera.x;
        this.renderer.camera.targetY = this.renderer.camera.y;
        this.renderer.clampCameraBounds();
        this.dragStartX = t.clientX;
        this.dragStartY = t.clientY;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      if (this.isPinching && e.touches.length < 2) {
        this.isPinching = false;
      }
      if (this.isDragging) {
        this.isDragging = false;
        const elapsed = Date.now() - this.touchStartTime;
        // Quick tap without significant dragging moves to node
        if (!this.hasMovedWhileDragging && elapsed < 450) {
          this.handleCanvasSelectAt(this.initialDownX, this.initialDownY);
        }
        this.hasMovedWhileDragging = false;
      }
    });

    this.canvas.addEventListener('touchcancel', () => {
      this.isDragging = false;
      this.isPinching = false;
      this.hasMovedWhileDragging = false;
    });

    // Minimap collapse toggle on mobile
    document.getElementById('btnToggleMinimap')?.addEventListener('click', () => {
      audio.click();
      const wrap = document.getElementById('minimapCanvasWrapper');
      const btn = document.getElementById('btnToggleMinimap');
      if (!wrap || !btn) return;
      if (window.matchMedia('(max-width: 1024px), (max-height: 600px)').matches) {
        wrap.classList.toggle('mobile-expanded');
        btn.innerText = wrap.classList.contains('mobile-expanded') ? '▲' : '▼';
      }
    });

    // Click on radar minimap opens full Bird's-Eye Atlas
    document.getElementById('minimapCanvas')?.addEventListener('click', () => {
      audio.click();
      this.openWorldMapAtlas();
    });

    // Keyboard shortcut 'M' toggles full Bird's-Eye Atlas, Space rolls dice
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (this.game.phase === 'TITLE') return;
      // Enter/Space retain native button activation; direction keys work after clicking the dock.
      if (target?.closest('button, summary') && (e.key === 'Enter' || e.key === ' ')) return;
      const blockingDialog = Array.from(document.querySelectorAll('[role="dialog"], #diceRollModal')).some(panel => !panel.closest('.hidden, [hidden]'));
      const mapModal = document.getElementById('worldMapModal');
      const mapIsOpen = !!mapModal && !mapModal.classList.contains('hidden');
      if (blockingDialog && !(mapIsOpen && e.key.toLowerCase() === 'm')) return;

      if (this.canShowMovementNavigation()) {
        const key = e.key.toLowerCase();
        if (['arrowleft', 'arrowup', 'a', 'w', 'arrowright', 'arrowdown', 'd', 's', 'enter', 'f'].includes(key)) {
          e.preventDefault();
          if (e.repeat) return;
          if (key === 'enter') this.confirmMoveDestination();
          else if (key === 'f') this.centerOnHero();
          else this.cycleHighlightedNode(['arrowleft', 'arrowup', 'a', 'w'].includes(key) ? -1 : 1);
          return;
        }
      }

      if (e.key === ' ' || e.code === 'Space') {
        const rollBtn = document.getElementById('btnRollDice');
        if (!e.repeat && this.game.phase === 'BOARD_TURN' && this.isMyTurn() && !this.game.activePlayer.isAI && rollBtn && !rollBtn.hasAttribute('disabled') && !rollBtn.closest('.hidden, [hidden]') && !rollBtn.classList.contains('pointer-events-none')) {
          e.preventDefault();
          rollBtn.click();
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        const modal = document.getElementById('worldMapModal');
        if (modal) {
          if (modal.classList.contains('hidden')) {
            audio.click();
            this.openWorldMapAtlas();
          } else {
            audio.click();
            modal.classList.add('hidden');
            document.getElementById('worldMapTooltip')?.classList.add('hidden');
          }
        }
      }


    });

    // Mobile Orientation Hint Dismissal
    document.getElementById('btnCloseOrientationHint')?.addEventListener('click', () => {
      sessionStorage.setItem('dismissed_orientation_hint', 'true');
      document.getElementById('orientationHintToast')?.classList.add('hidden');
    });

    // Auto-minimize side event feed & quest tracker on small screens (<= 768px)
    if (window.innerWidth <= 768) {
      document.getElementById('gameEventFeedWindow')?.classList.add('hidden');
      document.getElementById('questTrackerHUD')?.classList.add('hidden');
      const feedList = document.getElementById('gameEventFeedList');
      const feedBtn = document.getElementById('btnMinimizeEventFeed');
      if (feedList && feedBtn) {
        feedList.classList.add('hidden');
        feedBtn.innerText = '▲';
      }
      const questList = document.getElementById('questTrackerList');
      const questBtn = document.getElementById('btnMinimizeQuestTracker');
      if (questList && questBtn) {
        questList.classList.add('hidden');
        questBtn.innerText = '▲';
      }
    }

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

    document.getElementById('btnToggleLogHistory')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('gameEventFeedWindow')?.classList.toggle('hidden');
    });

    document.getElementById('btnToggleCrisisTracker')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('questTrackerHUD')?.classList.toggle('hidden');
    });

    document.getElementById('btnMinimizeQuestTracker')?.addEventListener('click', () => {
      audio.click();
      document.getElementById('questTrackerHUD')?.classList.add('hidden');
    });

    // Game Speed Toggle Button
    document.getElementById('btnGameSpeed')?.addEventListener('click', () => {
      audio.click();
      const speeds = [1, 1.5, 2, 3];
      const curIdx = speeds.indexOf(this.game.gameSpeed);
      const nextSpeed = speeds[(curIdx + 1) % speeds.length];
      this.game.gameSpeed = nextSpeed;
      const speedText = document.getElementById('btnGameSpeedText');
      if (speedText) speedText.innerText = `${nextSpeed}x`;
      this.game.addLog(`⚡ ปรับความเร็วเกม: ${nextSpeed}x`, 'level');
    });

    const updateSlotDisplay = () => {
      const slot = this.getSelectedSaveSlot();
      const meta = SaveManager.getSaveMetadata(slot);
      const statusEl = document.getElementById('settingsSaveStatusText');
      const slotLabel = slot === 0 ? 'Auto-Save' : `ช่อง ${slot}`;
      if (statusEl) {
        if (meta) {
          statusEl.innerText = `${slotLabel}: ${meta.activeHeroName} (Lv.${meta.activeHeroLevel}) • ${meta.dateStr}`;
          statusEl.style.color = '#38bdf8';
        } else {
          statusEl.innerText = `${slotLabel}: ยังไม่มีข้อมูลบันทึก`;
          statusEl.style.color = '#94a3b8';
        }
      }
    };

    document.getElementById('selectSaveSlot')?.addEventListener('change', () => {
      audio.click();
      updateSlotDisplay();
    });

    // Settings & Rules
    document.getElementById('btnSettings')?.addEventListener('click', () => {
      audio.click();
      updateSlotDisplay();
      document.getElementById('settingsModal')?.classList.remove('hidden');
    });
    document.getElementById('btnHowToPlay')?.addEventListener('click', () => {
      audio.click();
      this.adventureGuide.open();
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

    // Save Data Export & Import Handlers
    document.getElementById('btnSettingsExport')?.addEventListener('click', async () => {
      audio.click();
      const slot = this.getSelectedSaveSlot();
      const code = SaveManager.exportSaveData(slot);
      if (code) {
        await gameDialogs.code('สำรองความคืบหน้า', `รหัสเซฟ ${slot === 0 ? 'อัตโนมัติ' : `ช่อง ${slot}`} · คัดลอกเก็บไว้หรือนำเข้าบนอุปกรณ์อื่น`, code);
      } else {
        audio.hurt();
        await gameDialogs.message('ยังไม่มีบันทึก', `ยังไม่มีข้อมูลบันทึกในช่อง ${slot === 0 ? 'อัตโนมัติ' : slot}`);
      }
    });

    document.getElementById('btnSettingsImport')?.addEventListener('click', async () => {
      audio.click();
      const slot = this.getSelectedSaveSlot();
      const code = await gameDialogs.text('นำเข้าความคืบหน้า', `วางรหัสบันทึกเพื่อนำเข้าสู่ช่อง ${slot === 0 ? 'อัตโนมัติ' : slot} ข้อมูลที่ใช้ไม่ได้จะไม่ทับเซฟเดิม`);
      if (code && code.trim()) {
        const res = SaveManager.importSaveData(this.game, code.trim(), slot);
        if (res.success) {
          if (res.bossState) { this.bossCurrentHp = res.bossState.currentHp; this.bossMaxHp = res.bossState.maxHp; }
          audio.fanfare();
          document.getElementById('titleScreen')?.classList.add('hidden');
          document.getElementById('settingsModal')?.classList.add('hidden');
          document.getElementById('topHUD')?.classList.remove('hidden');
          document.getElementById('bottomBar')?.classList.remove('hidden');

          this.onTurnStarted();
          this.hud.update();
          this.updateTitleSaveStatus();
          await gameDialogs.message('กลับสู่การผจญภัย', `นำเข้าข้อมูลช่อง ${slot === 0 ? 'อัตโนมัติ' : slot} เรียบร้อยแล้ว`);
        } else {
          audio.hurt();
          await gameDialogs.message('นำเข้าไม่สำเร็จ', res.error || 'รหัสบันทึกไม่ถูกต้อง');
        }
      }
    });

    // Play again
    document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
      location.reload();
    });
  }

  private renderRosterSetup(playerCount: number) {

    const container = document.getElementById('playerSetupRoster')!;
    container.innerHTML = '';
    this.rosterSkinUpdaters = [];
    const defaultNames = ['Valeria', 'Lyra', 'Jaxine', 'Aria'];
    const classKeys = Object.keys(HERO_CLASSES);

    for (let i = 0; i < playerCount; i++) {
      const card = document.createElement('div');
      card.className = 'player-setup-card pixel-box p-3 bg-slate-900 border-slate-700 flex flex-col gap-2 shadow';
      card.dataset.playerIndex = `${i}`;
      card.dataset.skinVariant = '0';

      const initialClass = classKeys[i % classKeys.length];

      card.innerHTML = `
        <div class="flex items-center justify-between pixel-head pb-1.5">
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
          <div class="w-14 h-14 bg-slate-950 border-2 border-amber-600/60 flex items-center justify-center relative overflow-hidden flex-shrink-0">
            <canvas class="roster-preview-canvas w-12 h-12 image-pixelated"></canvas>
          </div>
          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ชื่อ (Name)</span>
              <input type="text" maxlength="12" class="player-name-input bg-slate-950 border border-slate-700 text-xs px-2 py-1.5 text-white w-full min-w-0 outline-none focus:border-amber-400" value="${defaultNames[i] || `Hero ${i + 1}`}">
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">อาชีพ (Class)</span>
              <select class="player-class-select bg-slate-950 border border-slate-700 text-xs px-2 py-1.5 text-amber-400 w-full min-w-0 outline-none cursor-pointer">
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
        <div class="flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 border border-slate-800">
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
        pCtx.drawImage(sprite, 48, 32, 48, 48, 0, 0, 48, 48);
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
      this.rosterSkinUpdaters.push(updateSkinDisplay);
    }

    // Sprites arrive asynchronously, so previews need one refresh once the sheet set has
    // settled. This listener is registered once for the whole app lifetime: adding it
    // inside the card loop leaked one listener per card on every roster re-render, and
    // each leaked listener redrew a preview that no longer existed.
    if (!this.rosterAssetsListenerBound) {
      this.rosterAssetsListenerBound = true;
      window.addEventListener('hero-assets-loaded', () => {
        this.rosterSkinUpdaters.forEach(refresh => refresh());
      });
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

    const allowDarklingCheck = document.getElementById('checkAllowDarkling') as HTMLInputElement | null;
    if (allowDarklingCheck) {
      this.game.allowDarkling = allowDarklingCheck.checked;
    }

    const aiDifficultySelect = document.getElementById('selectAIDifficulty') as HTMLSelectElement | null;
    if (aiDifficultySelect) {
      this.game.aiDifficulty = aiDifficultySelect.value as 'casual' | 'tactical' | 'ruthless';
    }

    document.getElementById('titleScreen')?.classList.add('hidden');
    document.getElementById('topHUD')?.classList.remove('hidden');
    document.getElementById('bottomBar')?.classList.remove('hidden');

    this.onTurnStarted();

    if (this.game.activePlayer.isAI) {
      this.handleAITurnStart();
    }
  }

  private triggerDiceRoll(presetRoll?: number) {
    triggerHaptic('medium');
    const totalRoll = presetRoll !== undefined ? presetRoll : this.game.rollMovementDice();
    this.game.remainingMoves = totalRoll;
    this.game.phase = 'CHOOSING_PATH';

    const diceModal = document.getElementById('diceRollModal')!;
    const diceCube = document.getElementById('diceCube')!;
    const diceResultText = document.getElementById('diceResultText')!;

    diceModal.classList.remove('hidden');
    diceCube.classList.add('dice-rolling');
    diceResultText.innerText = 'กำลังทอย...';

    let count = 0;
    const speed = this.game.gameSpeed || 1;
    const rollInterval = Math.max(20, Math.round(70 / speed));
    const interval = setInterval(() => {
      audio.diceRoll();
      diceCube.innerText = `${Math.floor(Math.random() * 6) + 1}`;
      count++;

      if (count > 7) {
        clearInterval(interval);
        triggerHaptic('selection');
        diceCube.classList.remove('dice-rolling');
        diceCube.innerText = `${totalRoll}`;
        const isFlex = !!this.game.activePlayer.hasFlexibleMovement;
        diceResultText.innerText = isFlex
          ? `คุณทอยได้ ${totalRoll}! (ผลึกอิสระ: เลือกเดินได้ 1 - ${totalRoll} ช่อง)`
          : `คุณทอยได้ ${totalRoll}! (เดินตรง ${totalRoll} ช่อง)`;
        audio.coin();

        setTimeout(() => {
          diceModal.classList.add('hidden');
          this.game.updateReachableHighlights();

          if (this.game.activePlayer.isAI && this.ownsActiveTurn()) {
            // AI intelligently picks best destination (last-hit towns, PvP, shops)
            const chosenTarget = aiSystem.chooseRoute(
              this.game.highlightedNodes,
              this.game.activePlayer,
              this.game.allNodes,
              this.game.players,
              this.game.aiDifficulty
            );
            let path = this.game.findPathToTarget(chosenTarget);
            if (!path && this.game.highlightedNodes.length > 0) {
              for (const altNodeId of this.game.highlightedNodes) {
                path = this.game.findPathToTarget(altNodeId);
                if (path) break;
              }
            }
            if (path && path.length > 1) {
              if (networkRoomManager.isInRoom() && networkRoomManager.isHost()) {
                networkRoomManager.broadcast({
                  packetId: `move_ai_${Date.now()}`,
                  type: 'MOVE_PATH',
                  roomCode: networkRoomManager.getRoomCode()!,
                  senderId: 'host',
                  senderName: this.game.activePlayer.displayName,
                  payload: { playerIdx: this.game.activePlayerIdx, path, remainingMoves: this.game.remainingMoves, gameSpeed: this.game.gameSpeed },
                  timestamp: Date.now()
                });
              }
              this.game.executePath(
                path,
                () => this.onMoveStep(),
                tile => this.handleTileArrival(tile)
              );
            } else {
              // Safety fallback: if no path found, end turn or arrive at current tile!
              this.game.remainingMoves = 0;
              this.game.highlightedNodes = [];
              const here = this.game.allNodes.find(n => n.id === this.game.activePlayer.nodeId) || this.game.allNodes[0];
              this.handleTileArrival(here);
            }
          } else {
            const isFlexMove = !!this.game.activePlayer.hasFlexibleMovement;
            this.game.addLog(
              isFlexMove
                ? `👉 ทอยได้ ${totalRoll}! (ใช้ผลึกย่างก้าวอิสระ) คลิกเลือกช่องปลายทางบนแผนที่ (1 ถึง ${totalRoll} ก้าว)`
                : `👉 ทอยได้ ${totalRoll}! คลิกเลือกช่องปลายทางบนแผนที่ (ต้องก้าวตรงตามแต้ม ${totalRoll} ก้าว)`,
              'level'
            );
          }
        }, Math.max(150, Math.round(800 / speed)));
      }
    }, rollInterval);
  }


  private onMoveStep() {
    triggerHaptic('light');
    const p = this.game.activePlayer;
    this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
    this.renderer.spawnFootstepDust(p.gridX, p.gridY, p.gridZ);
    this.hud.update();
  }

  private handleTileArrival(tile: BoardNode) {
    if (!this.ownsActiveTurn()) return;
    triggerHaptic('selection');
    const p = this.game.activePlayer;
    this.game.addLog(`${p.displayName} เหยียบ ${tile.name} (${tile.type.toUpperCase()})`);

    // Transition score and weather ambience together after arriving in a region.
    if (!p.isDarkling && this.game.phase !== 'BATTLE') {
      audio.playBiomeBgm(tile.biome || tile.realmId);
      audio.setEnvironment(tile.biome || tile.realmId, ecosystemSystem.getNodeWeather(tile));
    }

    // 0. Check for Triggered Field Trap!
    const trapIndex = this.game.placedTraps.findIndex(t => t.nodeId === tile.id);
    if (trapIndex !== -1) {
      const trap = this.game.placedTraps[trapIndex];
      if (trap.ownerId !== p.id) {
        this.game.placedTraps.splice(trapIndex, 1);
        const owner = this.game.players.find(pl => pl.id === trap.ownerId);
        const ownerName = owner ? owner.displayName : 'ใครบางคน';
        audio.hurt();

        const trapType = trap.type || 'damage';
        if (trapType === 'greed') {
          const goldStolen = Math.min(p.gold, Math.max(40, Math.floor(p.gold * 0.25)));
          p.gold -= goldStolen;
          if (owner) owner.gold += goldStolen;
          this.game.addLog(`💣 กับดักชิงทรัพย์! ${p.displayName} เหยียบกับดักของ ${ownerName} สูญเสียทอง ${goldStolen}G!`, 'gold');
        } else if (trapType === 'rust') {
          p.rustTurns = 3;
          this.game.addLog(`🛡️ กับดักสนิม! ${p.displayName} เหยียบกับดักของ ${ownerName} อุปกรณ์เป็นสนิม 3 เทิร์น!`, 'battle');
        } else {
          const dmg = trap.damage || Math.round(p.maxHp * 0.20);
          p.hp = Math.max(1, p.hp - dmg);
          this.game.addLog(`💥 กับดักระเบิด! ${p.displayName} เหยียบกับดักของ ${ownerName} เสียพลังชีวิต ${dmg} HP!`, 'battle');
        }
      }
    }

    // 1. Check for PvP Collision!
    const rival = this.game.gameMode === 'coop_raid' ? undefined : this.game.players.find(other => other.id !== p.id && other.nodeId === p.nodeId);
    if (rival) {
      this.initiatePvPDuel(p, rival);
      return;
    }

    this.game.world.focusRealm = tile.realmId;
    if (dungeonSystem.isExitNode(tile.id)) {
      dungeonSystem.exitDungeon(p, this.game);
      this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
      hallOfFameUI.unlockTrophy('DUNGEON_CRAWLER');
      this.advanceTurn();
      return;
    }
    if (['empty', 'isekai_event'].includes(tile.type) && this.game.world.random() * 100 < encounterChance(tile, this.game.world)) {
      this.initiateRandomEncounter(tile); return;
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
        if (dungeonSystem.isExitNode(tile.id)) {
          dungeonSystem.exitDungeon(p, this.game);
          this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
          hallOfFameUI.unlockTrophy('DUNGEON_CRAWLER');
          this.advanceTurn();
        } else {
          this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        }
        break;

      case 'red':
        if (this.game.world.random() * 100 < encounterChance(tile, this.game.world)) {
          this.initiateRandomEncounter(tile);
        } else {
          this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        }
        break;

      case 'church':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'dark_gate':
        if (p.isDarkling) {
          // Void Rift Shortcut for Darkling
          const destinations = this.game.allNodes.filter(n => n.type === 'town' && n.realmId !== tile.realmId && n.id < 1000);
          const targetNode = this.game.world.pick(destinations.length ? destinations : this.game.allNodes);
          p.nodeId = targetNode.id;
          p.gridX = targetNode.gx;
          p.gridY = targetNode.gy;
          p.gridZ = targetNode.gz;
          audio.darklingRoar();
          this.game.addLog(`🌀 VOID RIFT SHORTCUT! จอมมาร ${p.displayName} ฉีกมิติผ่านรอยแยก Void Rift วาร์ปทะลวงสู่ [${targetNode.name}]!`, 'darkling');
          this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);
          this.advanceTurn();
          break;
        }
        if (this.game.allowDarkling && this.game.gameMode !== 'coop_raid' && darklingSystem.canTransform(p, this.game.players, this.game.allNodes)) {
          chooseJourney(p, 'สัญญาแห่งประตูมืด', 'เสียเงิน สิ่งของและเมืองที่ถืออยู่ แลกอำนาจจอมมารชั่วคราว', [
            ...(['destroyer', 'reaper', 'tormentor'] as const).map((spec, index) => ({ label: ['ผู้ทำลาย', 'ผู้เก็บเกี่ยว', 'ผู้ทรมาน'][index], detail: 'รับพลัง Darkling สาย ' + spec, score: 5 - index, run: () => { darklingSystem.acceptPact(p, this.game.allNodes, spec); this.advanceTurn(); } })),
            { label: 'ปฏิเสธสัญญา', detail: 'เดินทางต่อด้วยพลังของตน', score: 2, run: () => this.advanceTurn() }
          ]);
        } else this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'mystery_chest':
        this.wonderChestUI.open(p, () => this.advanceTurn());
        break;

      case 'vault':
        if (dungeonSystem.isInDungeon(tile.id)) {
          const vaultGold = dungeonSystem.claimChest(p, tile.id);
          this.game.addLog(vaultGold ? 'เปิดหีบสมบัติ +' + vaultGold + 'G' : 'หีบนี้ถูกเปิดแล้วในชั้นนี้', 'gold');
          this.advanceTurn();
        } else {
          this.promptDungeonRift(p, tile);
        }
        break;

      case 'boss':
        if (dungeonSystem.isInDungeon(tile.id)) {
          if (dungeonSystem.isGuardianDefeated(p)) this.offerDungeonContinuation(p);
          else this.initiateCryptLordBattle(p);
        } else if (this.game.world.defeatedBosses.includes(tile.id) && this.game.gameMode !== 'endless_spire') {
          this.game.addLog('ผู้พิทักษ์แห่งสถานที่นี้ถูกปราบแล้ว'); this.advanceTurn();
        } else this.initiateBossBattle(tile);
        break;

      case 'tavern':
        chooseJourney(p, 'โรงเตี๊ยม', 'เลือกพักฟื้น ฟังข่าว หรือเสี่ยงโชค', [
          { label: 'สั่งอาหารและซื้อข่าวลือ', detail: 'รับประทานอาหารเพิ่มบัฟ หรือซื้อเบาะแสลับ', score: p.gold >= 60 ? 6 : 2, run: () => this.isekaiEventUI.openTavern(p, () => this.advanceTurn()) },
          { label: 'พักและฟังข่าว', detail: 'รักษาตัวและรับพยากรณ์อากาศ', score: p.hp < p.maxHp * 0.6 ? 10 : 3, run: () => this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn()) },
          { label: 'โต๊ะเสี่ยงโชค', detail: 'ใช้เงินเดิมพัน', score: 1, run: () => this.casinoUI.open(p, () => this.advanceTurn()) },
          { label: 'เดินทางต่อ', detail: 'จบเทิร์น', score: 2, run: () => this.advanceTurn() }
        ]);
        break;

      case 'guild':
        this.isekaiEventUI.openGuild(p, () => this.advanceTurn());
        break;

      case 'fishing':
        this.isekaiEventUI.openFishing(p, () => this.advanceTurn(), monsterName => this.initiateFishCombat(monsterName));
        break;

      case 'isekai_event':
        this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
        break;

      case 'empty':
      default:
        if (tile.homeData) {
          this.homeUI.openHome(tile, p, () => this.advanceTurn());
        } else {
          // Open contextual fantasy event (guaranteeing Choice 4: Buy House for 150G on unowned empty tiles)
          this.fantasyEventUI.openEvent(p, tile, () => this.advanceTurn());
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
      winnerPlayer.matchStats.pvpWins++;

      // Check if loser was wanted by the Royal Court!
      const bounty = royalDecreeSystem.claimWantedBounty(winnerPlayer, loserPlayer);
      const quest = isekaiEventManager.onGameAction(winnerPlayer, 'boss', { targetPlayerId: loserPlayer.id });
      if (quest.message) this.game.addLog(quest.message, 'level');
      if (bounty > 0) {
        this.game.addLog(
          `👑 ค่าหัวหลวงถูกพิชิต! ${winnerPlayer.displayName} สยบผู้ต้องหา ${loserPlayer.displayName} และรับเงินรางวัลนำจับ ${bounty}G!`,
          'level'
        );
      }

      // Check if loser surrendered peacefully (HP > 0)
      if (loserPlayer.hp > 0) {
        const tributeGold = Math.floor(loserPlayer.gold * 0.30);
        loserPlayer.gold -= tributeGold;
        winnerPlayer.gold += tributeGold;
        winnerPlayer.matchStats.goldEarnedTotal += tributeGold;
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
    dungeonSystem.abandon(player);
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
    isCalamityBoss = false,
    tier = 1
  ): { gold: number; xp: number; droppedItem?: EquipmentItem } {
    const node = this.game.allNodes.find(n => n.id === player.nodeId)!;
    let { gold, xp } = monsterRewards(tier, this.game.world, node, isTownBoss || isCalamityBoss, player);
    let dropChance = isCalamityBoss ? 0.8 : isTownBoss ? 0.5 : Math.min(0.45, 0.2 + tier * 0.04);
    if (royalDecreeSystem.activeDecree.id === 'BLOOD_MOON' && node?.type === 'red') {
      dropChance = 1.0;
    }

    player.gold += gold;
    player.matchStats.goldEarnedTotal += gold;
    player.matchStats.monstersKilled++;
    const leveledUp = player.gainXP(xp);
    if (leveledUp) {
      audio.levelUpFanfare();
      if (player.canPromote()) {
        this.game.addLog(`✨ ${player.name} สามารถเปลี่ยนคลาสระดับสูง (Tier 2) ได้แล้วที่หน้าต่างสถานะ!`, 'level');
      }
    }

    let droppedItem: EquipmentItem | undefined = undefined;
    if (this.game.world.random() < dropChance && SHOP_CATALOG.length > 0) {
      // Filter loot catalog by progressive tier threshold so early monsters don't drop endgame gear!
      let availableLoot = SHOP_CATALOG;
      if (tier === 1 && !isTownBoss && !isCalamityBoss) {
        availableLoot = SHOP_CATALOG.filter(it => (it.cost || 0) <= 400);
      } else if (tier === 2 && !isTownBoss && !isCalamityBoss) {
        availableLoot = SHOP_CATALOG.filter(it => (it.cost || 0) <= 1500);
      } else if (tier === 3 && !isTownBoss && !isCalamityBoss) {
        availableLoot = SHOP_CATALOG.filter(it => (it.cost || 0) <= 2500);
      } else if (isTownBoss || isCalamityBoss) {
        availableLoot = SHOP_CATALOG.filter(it => it.type === 'weapon' || it.type === 'shield' || it.type === 'armor' || it.type === 'accessory' || it.id === 'pot_elixir' || it.type === 'spell');
      }

      if (availableLoot.length === 0) availableLoot = SHOP_CATALOG;
      const picked = availableLoot[Math.floor(this.game.world.random() * availableLoot.length)];
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

  private checkPostCombatCompanionRecruitment(winner: Player, defeatedName: string) {
    const recruitChance = 0.28 + Math.min(0.25, winner.getTotalStat('luk') * 0.015);
    if (this.game.world.random() > recruitChance) return;

    // The companion roster lives in companions.json so that every entry also has a 64x64
    // model generated from the same data (see scripts/generate_companion_sprites.cjs).
    const profile = getCompanionProfile(companionKeyForDefeatedMonster(defeatedName));

    const hadMercenary = winner.companion && winner.companion.contractTurnsRemaining !== undefined;
    if (winner.companion && !hadMercenary) {
      winner.atk += 2;
      winner.def += 2;
      winner.mag += 2;
      this.game.addLog(`💖 ${defeatedName} ซาบซึ้งในความเมตตาของคุณ! มอบพรศักดิ์สิทธิ์เพิ่มพลัง +2 All Stats ถาวร!`, 'level');
      return;
    }

    winner.companion = createCompanion(profile.key);

    audio.fanfare();
    this.game.addLog(
      `💖 โชคชะตาผูกพัน! หลังพ่ายแพ้ ${defeatedName} ประทับใจในเสน่ห์และความกล้าหาญของคุณ! ขอร่วมเดินทางเคียงข้างเป็นคู่หูถาวร! [${profile.name}] (${profile.skillDesc})!`,
      'level'
    );
  }

  private initiateTownLiberationBattle(townNode: BoardNode) {
    const data = townNode.townData!;
    const calamityBoss = worldCalamitySystem.activeCalamity?.type === 'world_boss' && !!worldCalamitySystem.activeCalamity.remainingTownIds?.includes(townNode.id);
    this.game.addLog(`⚔️ ${townNode.name} ถูกยึดครองโดย ${data.monsterName}! ต่อสู้เพื่อปลดปล่อยเมือง!`, 'battle');

    const authoredMaxHp = data.monsterMaxHp || data.monsterHp;
    const profile = getNodeEncounterPreview(townNode, this.game.activePlayer).featuredMonster!;
    const monsterCombatant: Combatant = { ...profile, isBoss: true };

    this.battleUI.startBattle(monsterCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const rewards = townManager.liberateTown(townNode, winner.playerRef, this.game.players);
        const loot = this.awardMonsterLoot(winner.playerRef, data.monsterName, true, false);
        this.game.addLog(`👑 ปลดปล่อยเมืองสำเร็จ! ${winner.playerRef.displayName} ปลดปล่อย ${townNode.name} (+${rewards.goldReward + loot.gold}G, +${rewards.xpReward + loot.xp} XP)!`, 'level');
        if (loot.droppedItem) {
          this.game.addLog(`🎁 ปลดปล่อยเมืองสำเร็จ! ได้รับรางวัลพิเศษ: "${loot.droppedItem.name}" ${loot.droppedItem.icon}!`, 'level');
        }
        this.progressQuest(winner.playerRef, 'town', townNode, data.monsterName);
        if (calamityBoss) this.progressQuest(winner.playerRef, 'boss', townNode, data.monsterName);
        this.checkPostCombatCompanionRecruitment(winner.playerRef, data.monsterName);
      } else {
        // Monster survived! Persist the remaining HP back onto the authored scale so the
        // stored value stays a stable reference for the next, differently-levelled attacker.
        const survivedRatio = monsterCombatant.maxHp > 0 ? winner.hp / monsterCombatant.maxHp : 0;
        data.monsterHp = Math.max(1, Math.round(authoredMaxHp * survivedRatio));
        this.game.addLog(`💀 โอกาสลาสช็อต! ${data.monsterName} รอดตายโดยเหลือ ${data.monsterHp}/${authoredMaxHp} HP! ใครๆ ก็ขโมยคิลได้!`, 'battle');

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
    const guardCombatant: Combatant = scaleMonster(
      {
        name: 'Town Captain',
        tier: tierForNode(townNode.realmId, townNode.biome),
        baseHp: 95,
        baseAtk: 18,
        baseDef: 13,
        baseMag: 5,
        baseSpd: 9,
        baseLuk: 7,
        mp: 20,
        skillName: 'Garrison Counterattack'
      },
      this.game.activePlayer
    );

    if (townNode.townData?.specialization === 'fortress') { guardCombatant.hp = guardCombatant.maxHp = Math.round(guardCombatant.maxHp * 1.4); guardCombatant.atk = Math.round(guardCombatant.atk * 1.4); guardCombatant.def = Math.round(guardCombatant.def * 1.4); }
    this.battleUI.startBattle(guardCombatant, (winner, loser) => {
      if (winner.playerRef) {
        winner.playerRef.matchStats.monstersKilled++;
        const previousOwner = this.game.players.find(p => p.id === townNode.townData?.ownerId) || null;
        townManager.transferTownOwnership(townNode, winner.playerRef, previousOwner);
        this.game.addLog(`🏴‍☠️ ยึดเมืองสำเร็จ! ${winner.playerRef.displayName} ทำลายกองกำลังป้อมปราการและยึด ${townNode.name}!`, 'battle');
      }
      this.advanceTurn();
    });
  }

  private initiateRandomEncounter(tile: BoardNode) {
    const preview = getNodeEncounterPreview(tile, this.game.activePlayer);
    if (!preview.roster.length) { this.advanceTurn(); return; }
    const profile = this.game.world.pick(preview.roster);
    const pickedName = profile.name;
    const tier = tierForNode(tile.realmId, tile.biome);
    const monsterCombatant: Combatant = { ...profile, isBoss: false };

    this.battleUI.startBattle(monsterCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const loot = this.awardMonsterLoot(winner.playerRef, pickedName, false, false, tier);
        this.game.addLog(`🏆 ${winner.playerRef.displayName} โค่น [T${tier}] ${pickedName} (+${loot.gold}G, +${loot.xp} EXP)!`);
        if (loot.droppedItem) {
          this.game.addLog(`🎁 มอนสเตอร์ทำไอเทมตก! ได้รับ "${loot.droppedItem.name}" ${loot.droppedItem.icon}!`, 'level');
        }
        this.progressQuest(winner.playerRef, 'monster', this.game.allNodes.find(n => n.id === winner.playerRef!.nodeId), loser.name);
        this.checkPostCombatCompanionRecruitment(winner.playerRef, pickedName);
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
    const krakenCombatant: Combatant = scaleMonster(
      {
        name: monsterName,
        tier: 2,
        baseHp: 115,
        baseAtk: 17,
        baseDef: 11,
        baseMag: 12,
        baseSpd: 10,
        baseLuk: 6,
        mp: 40,
        skillName: 'Tidal Crush'
      },
      this.game.activePlayer
    );

    this.battleUI.startBattle(krakenCombatant, (winner, loser) => {
      if (winner.playerRef) {
        winner.playerRef.gold += 120;
        winner.playerRef.matchStats.goldEarnedTotal += 120;
        winner.playerRef.matchStats.monstersKilled++;
        const leveledUp = winner.playerRef.gainXP(80);
        if (leveledUp) {
          audio.levelUpFanfare();
          if (winner.playerRef.canPromote()) {
            this.game.addLog(`✨ ${winner.playerRef.name} สามารถเปลี่ยนคลาสระดับสูง (Tier 2) ได้แล้วที่หน้าต่างสถานะ!`, 'level');
          }
        }
        this.progressQuest(winner.playerRef, 'monster', this.game.allNodes.find(n => n.id === winner.playerRef!.nodeId), loser.name);
        this.game.addLog(`🏆 ${winner.playerRef.displayName} โค่น ${monsterName} (+120G, +80 EXP)!`);
        this.checkPostCombatCompanionRecruitment(winner.playerRef, monsterName);
      } else if (loser.playerRef) {
        const lostGold = Math.floor(loser.playerRef.gold * 0.25);
        loser.playerRef.gold -= lostGold;
        this.respawnPlayer(loser.playerRef, monsterName, lostGold);
      }
      this.advanceTurn();
    });
  }

  private initiateBanditCombat() {
    const banditCombatant: Combatant = scaleMonster(
      {
        name: 'Bandit Chief Garak',
        tier: 3,
        baseHp: 125,
        baseAtk: 19,
        baseDef: 12,
        baseMag: 8,
        baseSpd: 12,
        baseLuk: 8,
        mp: 30,
        skillName: 'Ambush Volley'
      },
      this.game.activePlayer
    );

    this.battleUI.startBattle(banditCombatant, (winner, loser) => {
      if (winner.playerRef) {
        const stolenGold = 160 + Math.floor(this.game.world.random() * 80);
        winner.playerRef.gold += stolenGold;
        winner.playerRef.matchStats.goldEarnedTotal += stolenGold;
        winner.playerRef.matchStats.monstersKilled++;
        const leveledUp = winner.playerRef.gainXP(90);
        if (leveledUp) {
          audio.levelUpFanfare();
          if (winner.playerRef.canPromote()) {
            this.game.addLog(`✨ ${winner.playerRef.name} สามารถเปลี่ยนคลาสระดับสูง (Tier 2) ได้แล้วที่หน้าต่างสถานะ!`, 'level');
          }
        }
        this.progressQuest(winner.playerRef, 'monster', this.game.allNodes.find(n => n.id === winner.playerRef!.nodeId), loser.name);
        this.game.addLog(`🏆 ${winner.playerRef.displayName} โค่น Bandit Chief Garak และยึด ${stolenGold}G (+90 EXP)!`);
        this.checkPostCombatCompanionRecruitment(winner.playerRef, 'Bandit Chief Garak');
      } else if (loser.playerRef) {
        const lostGold = Math.floor(loser.playerRef.gold * 0.35);
        loser.playerRef.gold -= lostGold;
        this.respawnPlayer(loser.playerRef, 'Bandit Chief Garak', lostGold);
      }
      this.advanceTurn();
    });
  }

  private initiateBossBattle(node = this.game.allNodes.find(n => n.id === this.game.activePlayer.nodeId)!) {
    const profile = getNodeEncounterPreview(node, this.game.activePlayer).featuredMonster;
    if (!profile) { this.advanceTurn(); return; }
    const boss: Combatant = { ...profile, isBoss: true };
    this.game.addLog('ผู้พิทักษ์: ' + boss.name + ' • HP ' + boss.hp + '/' + boss.maxHp, 'battle');
    this.battleUI.startBattle(boss, (winner, loser) => {
      if (winner.playerRef) {
        if (!this.game.world.defeatedBosses.includes(node.id)) this.game.world.defeatedBosses.push(node.id);
        this.game.world.bossKillers[node.id] = winner.playerRef.id;
        delete this.game.world.bossHealth[node.id];
        this.awardMonsterLoot(winner.playerRef, boss.name, false, true, tierForNode(node.realmId, node.biome));
        this.game.world.threat[node.realmId] = Math.max(0, this.game.world.threat[node.realmId] - 25);
        this.progressQuest(winner.playerRef, 'boss', node, boss.name);
        this.checkPostCombatCompanionRecruitment(winner.playerRef, boss.name);
        if (this.game.gameMode === 'endless_spire') this.game.world.spireFloor++;
        this.game.addLog('พิชิต ' + boss.name + ' สำเร็จ • ' + this.game.objective, 'level');
      } else {
        this.game.world.bossHealth[node.id] = Math.max(0.01, winner.hp / boss.maxHp);
        if (loser.playerRef && loser.hp <= 0) {
          const lost = Math.floor(loser.playerRef.gold * 0.25); loser.playerRef.gold -= lost;
          this.respawnPlayer(loser.playerRef, boss.name, lost);
        }
      }
      this.advanceTurn();
    });
  }

  private promptDungeonRift(player: Player, node: BoardNode) {
    if (player.isAI) {
      if (player.hp > player.maxHp * 0.5 && this.game.world.random() < 0.6) {
        dungeonSystem.enterDungeon(player, this.game);
        this.advanceTurn();
      } else {
        this.fantasyEventUI.openEvent(player, node, () => this.advanceTurn());
      }
      return;
    }

    let riftModal = document.getElementById('dungeonRiftModal');
    if (!riftModal) {
      riftModal = document.createElement('div');
      riftModal.id = 'dungeonRiftModal';
      riftModal.className = 'fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 pointer-events-auto select-none';
      document.body.appendChild(riftModal);
    }

    riftModal.innerHTML = `
      <div class="pixel-box-gold max-w-[95vw] sm:max-w-md w-full p-4 sm:p-5 text-center">
        <div class="text-3xl mb-2 animate-bounce">🌀💀🌀</div>
        <h3 class="text-sm font-bold text-amber-300 mb-1">รอยแยกมิติมืดโบราณ (Dungeon Rift)</h3>
        <p class="text-xs text-purple-300 font-semibold mb-2">สุสานโบราณใต้พิภพแห่งฟอร์จูน่า (The Catacombs)</p>
        <p class="text-[10px] text-slate-300 mb-4 leading-relaxed">
          หมอกเวทมนตร์พวยพุ่งขึ้นมาจากใต้พื้นพิภพ กลิ่นอายของซากอารยธรรมโบราณและมหาสมบัติที่สาบสูญกำลังเรียกร้องหาผู้กล้า!<br>
          คำเตือน: อสุรกายใต้พิภพดุร้ายและมีราชันไร้ชีพคอยพิทักษ์บัลลังก์!
        </p>
        <div class="flex gap-2 justify-center">
          <button id="btnEnterDungeonRift" class="pixel-btn pixel-btn-gold px-4 py-2 text-xs font-bold text-slate-950 flex-1">
            บุกตะลุยสุสาน!
          </button>
          <button id="btnSkipDungeonRift" class="pixel-btn px-4 py-2 text-xs text-slate-300 hover:text-white flex-1">
            สำรวจพื้นผิวต่อ
          </button>
        </div>
      </div>
    `;

    riftModal.classList.remove('hidden');

    document.getElementById('btnEnterDungeonRift')?.addEventListener('click', () => {
      audio.click();
      riftModal?.classList.add('hidden');
      dungeonSystem.enterDungeon(player, this.game);
      const startNode = this.game.allNodes.find(n => n.id === player.nodeId);
      if (startNode) {
        this.renderer.centerCameraOn(startNode.gx, startNode.gy, startNode.gz);
      }
      this.advanceTurn();
    });

    document.getElementById('btnSkipDungeonRift')?.addEventListener('click', () => {
      audio.click();
      riftModal?.classList.add('hidden');
      this.fantasyEventUI.openEvent(player, node, () => this.advanceTurn());
    });
  }

  private initiateCryptLordBattle(player: Player) {
    const node = this.game.allNodes.find(n => n.id === player.nodeId)!;
    const seed: Combatant = { ...getNodeEncounterPreview(node, player).featuredMonster!, isBoss: true };
    this.battleUI.startBattle(seed, (winner, loser) => {
      if (winner.playerRef) {
        dungeonSystem.defeatGuardian(player, node.id);
        this.awardMonsterLoot(player, seed.name, false, true, tierForNode(node.realmId, node.biome));
        this.progressQuest(player, 'boss', node, seed.name);
        this.offerDungeonContinuation(player);
      } else {
        if (loser.playerRef && loser.hp <= 0) { const lost = Math.floor(player.gold * 0.25); player.gold -= lost; this.respawnPlayer(player, seed.name, lost); }
        this.advanceTurn();
      }
    });
  }

  private offerDungeonContinuation(player: Player) {
    chooseJourney(player, 'พิชิตผู้พิทักษ์แล้ว', 'รับโบนัสชั้นนี้ แล้วเลือกเส้นทางถัดไป', [
      { label: 'ลงชั้นต่อไป', detail: 'รับโบนัส • เติมคบเพลิง • ศัตรูแข็งแกร่งขึ้น 20%', score: player.hp > player.maxHp * 0.7 ? 8 : 0, run: () => { dungeonSystem.descendDeeper(player, this.game); this.advanceTurn(); } },
      { label: 'กลับสู่พื้นผิว', detail: 'รับโบนัสและออกจากดันเจี้ยน', score: 5, run: () => { dungeonSystem.exitDungeon(player, this.game); this.advanceTurn(); } },
      { label: 'สำรวจชั้นนี้ต่อ', detail: 'เปิดหีบที่เหลือก่อนตัดสินใจ', score: 1, run: () => this.advanceTurn() }
    ]);
  }

  private progressQuest(player: Player, action: 'monster' | 'town' | 'boss', node?: BoardNode, monsterName?: string) {
    if (action === 'boss') recordRoyalBossVictory(this.game, player);
    const result = isekaiEventManager.onGameAction(player, action, { node, monsterName });
    if (result.message) this.game.addLog(result.message, 'level');
  }

  private async handleRoyalContract(action: string, id?: string): Promise<string> {
    const player = this.game.activePlayer;
    if (!player || player.isAI || !this.isMyTurn()) return 'รับและส่งภารกิจได้ในเทิร์นของตัวเอง';
    if (action === 'abandon' && !await gameDialogs.confirm('ยกเลิกราชภารกิจ', 'ความคืบหน้าของงานปัจจุบันจะถูกยกเลิก คุณสามารถรับงานใหม่ได้ทันที')) return 'ยังคงทำภารกิจเดิม';
    const result = action === 'claim' ? claimRoyalContract(this.game, player)
      : action === 'abandon' ? abandonRoyalContract(this.game, player) : startRoyalContract(this.game, player, id || '');
    if (!result.success) return result.error || 'ยังทำรายการนี้ไม่ได้';
    const message = action === 'claim' ? `ส่งราชภารกิจ รับ ${result.gold}G และ ${result.xp} XP${result.leveledUp ? ' · เลเวลเพิ่มขึ้น!' : ''}`
      : action === 'abandon' ? 'ยกเลิกงานแล้ว พร้อมรับภารกิจใหม่' : 'รับราชภารกิจแล้ว ความคืบหน้าเริ่มนับตั้งแต่ตอนนี้';
    this.game.addLog(`${player.displayName}: ${message}`, action === 'claim' ? 'gold' : 'info');
    this.hud.update(); this.saveGameProgress(false); this.syncMultiplayerState();
    if (this.game.world.result) { this.adventureGuide.close(); this.showMatchResult(); }
    else if (action === 'claim') audio.fanfare(); else audio.click();
    return message;
  }

  private advanceTurn() {
    if (!this.ownsActiveTurn()) return;
    this.game.checkWinConditions();
    if (this.showMatchResult()) { this.syncMultiplayerState(); return; }
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
    const authorityPlayerIdx = this.game.activePlayerIdx;
    this.game.endTurn(() => {
      this.weeklyReportUI.open(() => {
        // Announce King Rico's Royal Decree for the new week!
        this.openRoyalDecreeModal(() => {
          // Auto-Save at the start of each new week!
          const saved = !this.visualReviewActive && SaveManager.autoSave(this.game, {
            currentHp: this.bossCurrentHp,
            maxHp: this.bossMaxHp
          });
          if (!this.visualReviewActive) this.game.addLog(saved ? `💾 บันทึกอัตโนมัติ (สัปดาห์ที่ ${this.game.weekCounter}) เรียบร้อย` : 'บันทึกอัตโนมัติไม่สำเร็จ กรุณาตรวจพื้นที่เก็บข้อมูลและสำรองรหัสเซฟ', 'info');
          this.updateTitleSaveStatus();

          this.game.startTurn();
          this.syncMultiplayerState(authorityPlayerIdx);
          this.onTurnStarted();
          if (this.game.activePlayer.isAI) {
            this.handleAITurnStart();
          }
        });
      });
    });

    if (this.showMatchResult()) { this.syncMultiplayerState(authorityPlayerIdx); return; }
    if (this.game.phase === 'BOARD_TURN') {
      this.syncMultiplayerState(authorityPlayerIdx);
      this.onTurnStarted();
      if (this.game.activePlayer.isAI) {
        this.handleAITurnStart();
      }
    }
  }

  private turnBannerTimeout: any = null;

  private onTurnStarted() {
    if (this.showMatchResult()) return;
    const p = this.game.activePlayer;
    if (p.isAI && this.ownsActiveTurn() && this.game.phase === 'BOARD_TURN') {
      const contracts = royalContractViews(this.game, p);
      if (contracts.some(contract => contract.ready)) {
        const reward = claimRoyalContract(this.game, p);
        if (reward.success) this.game.addLog(`${p.displayName} ส่งราชภารกิจ รับ ${reward.gold}G และ ${reward.xp} XP`, 'gold');
      }
      if (!this.game.world.royalContracts[p.id]?.active) {
        const next = royalContractViews(this.game, p).find(contract => !contract.locked && !contract.completed);
        if (next) startRoyalContract(this.game, p, next.id);
      }
    }
    if (this.game.world.result) { this.syncMultiplayerState(); this.showMatchResult(); return; }
    const audioNode = this.game.allNodes.find(node => node.id === p.nodeId);
    if (p.isDarkling) audio.playBgm('darkling');
    else if (audioNode) {
      audio.playBiomeBgm(audioNode.biome || audioNode.realmId);
      audio.setEnvironment(audioNode.biome || audioNode.realmId, ecosystemSystem.getNodeWeather(audioNode));
    }
    if (!p.isAI) audio.turnStart();
    (darklingSystem as any).calamityUsedThisTurn = false;
    if (this.ownsActiveTurn()) offerWeeklyDraft(this.game);
    // 1. Smoothly center camera on active player without jarring zoom jumps
    this.renderer.centerCameraOn(p.gridX, p.gridY, p.gridZ);

    this.hud.update();
    this.updateMultiplayerHudBadge();

    // 2. Display Turn Start Banner
    const banner = document.getElementById('turnStartBanner');
    if (networkRoomManager.isInRoom()) {
      banner?.classList.add('hidden');
    }
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
      if (networkRoomManager.isInRoom()) {
        const isMe = this.isMyTurn();
        if (iconEl) iconEl.innerText = isMe ? (p.isDarkling ? '😈' : '⚔️') : '⏳';
        titleEl.innerText = isMe
          ? (p.isDarkling ? 'เทิร์นของจอมมาร (คุณ)!' : 'เทิร์นของคุณ!')
          : `เทิร์นของ ${p.displayName}`;
        if (subEl) subEl.innerText = isMe
          ? `${p.displayName} - ทอยลูกเต๋า หรือ ร่ายเวท!`
          : `กำลังรอ ${p.displayName} เล่น...`;
      } else {
        if (iconEl) iconEl.innerText = p.isDarkling ? '😈' : '⚔️';
        titleEl.innerText = p.isDarkling ? 'เทิร์นของจอมมาร!' : 'เทิร์นของคุณ!';
        if (subEl) subEl.innerText = `${p.displayName} - ทอยลูกเต๋า หรือ ร่ายเวท!`;
      }
    }

    // Toggle button states based on turn ownership in multiplayer
    const rollBtn = document.getElementById('btnRollDice');
    const spinnerBtn = document.getElementById('btnUseSpinner');
    const magicBtn = document.getElementById('btnFieldMagic');
    const waitingForTurn = networkRoomManager.isInRoom() && !this.isMyTurn();
    for (const button of [rollBtn, spinnerBtn, magicBtn]) button?.toggleAttribute('disabled', waitingForTurn);
    rollBtn?.setAttribute('title', waitingForTurn ? `รอเทิร์นของ ${p.displayName}` : 'ทอยลูกเต๋าเพื่อเดิน');
    if (networkRoomManager.isInRoom()) {
      if (this.isMyTurn()) {
        if (rollBtn) {
          rollBtn.classList.remove('opacity-50', 'pointer-events-none');
          rollBtn.innerHTML = '<span>🎲</span><span>ทอยลูกเต๋า (Roll)</span>';
        }
        if (spinnerBtn) spinnerBtn.classList.remove('opacity-50', 'pointer-events-none');
        if (magicBtn) magicBtn.classList.remove('opacity-50', 'pointer-events-none');
      } else {
        if (rollBtn) {
          rollBtn.classList.add('opacity-50', 'pointer-events-none');
          rollBtn.innerHTML = `<span>⏳</span><span>รอเทิร์น P${this.game.activePlayerIdx + 1}</span>`;
        }
        if (spinnerBtn) spinnerBtn.classList.add('opacity-50', 'pointer-events-none');
        if (magicBtn) magicBtn.classList.add('opacity-50', 'pointer-events-none');
      }
    } else {
      if (rollBtn) {
        rollBtn.classList.remove('opacity-50', 'pointer-events-none');
        rollBtn.innerHTML = '<span>🎲</span><span>ทอยลูกเต๋า (Roll)</span>';
      }
      if (spinnerBtn) spinnerBtn.classList.remove('opacity-50', 'pointer-events-none');
      if (magicBtn) magicBtn.classList.remove('opacity-50', 'pointer-events-none');
    }

    if (!networkRoomManager.isInRoom()) banner.classList.remove('hidden');
    requestAnimationFrame(() => {
      banner.classList.remove('opacity-0');
      banner.classList.add('opacity-100');
    });

    this.turnBannerTimeout = setTimeout(() => {
      banner.classList.remove('opacity-100');
      banner.classList.add('opacity-0');
      setTimeout(() => banner.classList.add('hidden'), 350);
    }, 1500);

    // Auto-save game state at turn start
    this.saveGameProgress(false);
  }

  private getSelectedSaveSlot(): number {
    const sel = document.getElementById('selectSaveSlot') as HTMLSelectElement | null;
    const slot = Number(sel?.value ?? 1);
    return Number.isInteger(slot) && slot >= 0 && slot <= 3 ? slot : 1;
  }

  private updateTitleSaveStatus() {
    const metas = SaveManager.getSlotMetas();
    const btnLoad = document.getElementById('btnTitleLoadGame') as HTMLButtonElement | null;
    const metaEl = document.getElementById('titleLoadGameMeta');
    if (!btnLoad) return;

    const activeEntry = metas.filter(entry => entry.meta?.saveVersion === 2)
      .sort((a, b) => (b.meta?.savedAt ?? 0) - (a.meta?.savedAt ?? 0))[0];
    btnLoad.dataset.saveSlot = activeEntry ? String(activeEntry.slot) : '';
    btnLoad.disabled = !activeEntry;

    if (activeEntry && activeEntry.meta) {
      btnLoad.classList.remove('opacity-50', 'cursor-not-allowed');
      btnLoad.classList.add('hover:border-amber-400');
      if (metaEl) {
        metaEl.innerText = `[ช่อง ${activeEntry.slot}] ${activeEntry.meta.activeHeroName} (${activeEntry.meta.activeHeroClass} Lv.${activeEntry.meta.activeHeroLevel}) • วันที่ ${activeEntry.meta.day} สัปดาห์ ${activeEntry.meta.week}`;
      }
    } else {
      btnLoad.classList.add('opacity-50');
      if (metaEl) {
        metaEl.innerText = 'ยังไม่มีข้อมูลบันทึก';
      }
    }
  }

  private saveGameProgress(showToast = true) {
    if (this.visualReviewActive) return;
    if (this.game.players.length === 0 || this.game.phase === 'TITLE') return;
    const slot = showToast ? this.getSelectedSaveSlot() : 0;
    const result = SaveManager.saveWithResult(this.game, {
      currentHp: this.bossCurrentHp,
      maxHp: this.bossMaxHp
    }, slot);
    const statusEl = document.getElementById('settingsSaveStatusText');
    if (result.success) {
      if (showToast) {
        audio.coin();
        this.game.addLog(`💾 บันทึกความคืบหน้าช่อง ${slot} สำเร็จ! (วันที่ ${this.game.dayCounter}, สัปดาห์ที่ ${this.game.weekCounter})`, 'level');
      }
      if (statusEl) {
        statusEl.innerText = result.warning || `✅ [${slot === 0 ? 'อัตโนมัติ' : `ช่อง ${slot}`}] บันทึกสำเร็จล่าสุด: ${new Date().toLocaleTimeString('th-TH')}`;
        statusEl.style.color = '#34d399';
      }
      this.updateTitleSaveStatus();
    } else {
      if (statusEl) {
        statusEl.innerText = result.error || `เกิดข้อผิดพลาดในการบันทึกช่อง ${slot}`;
        statusEl.style.color = '#f87171';
      }
      if (showToast) this.game.addLog(result.error || 'บันทึกไม่สำเร็จ กรุณาส่งออกรหัสเซฟเพื่อสำรองข้อมูล', 'info');
    }
  }

  private async loadGameProgress(requestedSlot?: number) {
    let slot = requestedSlot ?? this.getSelectedSaveSlot();
    if (!SaveManager.hasSave(slot) && requestedSlot === undefined) {
      const firstAvailable = [1, 2, 3].find(s => SaveManager.hasSave(s));
      if (firstAvailable) {
        slot = firstAvailable;
        const sel = document.getElementById('selectSaveSlot') as HTMLSelectElement | null;
        if (sel) sel.value = `${slot}`;
      }
    }

    if (!SaveManager.hasSave(slot)) {
      audio.hurt();
      await gameDialogs.message('ยังไม่มีบันทึก', `ยังไม่มีข้อมูลบันทึกความคืบหน้าในช่อง ${slot}`);
      return;
    }
    const res = SaveManager.load(this.game, slot);
    if (res.success) {
      if (res.bossState) {
        this.bossCurrentHp = res.bossState.currentHp;
        this.bossMaxHp = res.bossState.maxHp;
      }
      audio.fanfare();
      if (res.recoveredFromBackup) this.game.addLog('กู้คืนความคืบหน้าจากสำเนาบันทึกก่อนหน้าเรียบร้อยแล้ว', 'info');
      document.getElementById('titleScreen')?.classList.add('hidden');
      document.getElementById('settingsModal')?.classList.add('hidden');
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');

      this.onTurnStarted();
      this.hud.update();
      this.updateTitleSaveStatus();
    } else {
      audio.hurt();
      await gameDialogs.message('โหลดบันทึกไม่สำเร็จ', res.error || 'ไม่สามารถโหลดข้อมูลบันทึกได้');
    }
  }

  private async resetSavedGame() {
    const slot = this.getSelectedSaveSlot();
    if (await gameDialogs.confirm('ลบช่องบันทึกนี้หรือไม่', `ลบเซฟ ${slot === 0 ? 'อัตโนมัติ' : `ช่อง ${slot}`} และสำเนาสำรองของช่องนี้ ช่องอื่นจะยังอยู่`, true)) {
      SaveManager.clear(slot);
      audio.hurt();
      const statusEl = document.getElementById('settingsSaveStatusText');
      if (statusEl) {
        statusEl.innerText = `🗑️ ลบข้อมูลเซฟช่อง ${slot} เรียบร้อยแล้ว`;
        statusEl.style.color = '#cbd5e1';
      }
      this.updateTitleSaveStatus();
      this.game.addLog(`🗑️ ลบข้อมูลเซฟเกมช่อง ${slot} เรียบร้อยแล้ว`, 'info');
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
      card.className = `pixel-box p-2.5 flex flex-col justify-between ${ canCast ? 'bg-slate-900 border-purple-500/60 hover:bg-slate-800 cursor-pointer' : 'bg-slate-950/80 border-slate-800 opacity-50' }`;

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
          if (!this.ownsActiveTurn()) return;
          const res = this.game.castFieldSpell(p, spell.id, targetId);
          this.syncMultiplayerState();
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

  private showMatchResult(): boolean {
    const result = this.game.world.result;
    if (!result) return false;
    const modal = document.getElementById('victoryModal');
    if (modal && !modal.classList.contains('hidden')) return true;
    const winner = this.game.players.find(p => p.id === result.winnerId) || this.game.players[0];
    this.triggerVictoryModal(winner, result.reason);
    if (result.teamVictory !== undefined) {
      document.getElementById('victorySubtitle')!.textContent = result.teamVictory ? 'ทีมผู้กล้าพิชิตภารกิจสำเร็จ' : 'ภารกิจไม่สำเร็จ';
      const gazette = document.getElementById('victoryGazetteContainer');
      if (gazette) gazette.textContent = result.reason;
    }
    return true;
  }

  private triggerVictoryModal(winner: Player, feat: string) {
    audio.fanfare();
    const modal = document.getElementById('victoryModal')!;
    document.getElementById('victorySubtitle')!.innerText = `${winner.displayName} ยิ่งใหญ่ที่สุด!`;
    const s = winner.matchStats;
    const netWorth = winner.getNetWorth(this.game.allNodes);

    // Save record to Hall of Fame & check trophies
    if (!this.visualReviewActive && this.game.world.result?.teamVictory !== false) hallOfFameUI.recordVictory(winner, netWorth, feat);

    // Render The Fortuna Gazette Newspaper
    const gazetteEl = document.getElementById('victoryGazetteContainer');
    if (gazetteEl) {
      const losers = this.game.players.filter(pl => pl.id !== winner.id);
      const loserGossip = losers.map(loser => {
        if (loser.gold < 100) return `📰 <strong>${escapeHtml(loser.displayName)}</strong>: ถังแตกหมดเนื้อหมดตัว! มีผู้พบเห็นกำลังไปสมัครเป็นเด็กล้างจานที่โรงเตี๊ยม`;
        if (loser.townsControlled === 0) return `📰 <strong>${escapeHtml(loser.displayName)}</strong>: ไร้ที่ซุกหัวนอน! สูญเสียหัวเมืองทั้งหมดจนต้องกลับไปนอนเต็นท์ริมหาด`;
        if (loser.matchStats.pranksReceived > 0) return `📰 <strong>${escapeHtml(loser.displayName)}</strong>: อับอายขายหน้า! โดนคู่แข่งกลั่นแกล้งจนหน้าเลอะหมึกยังล้างไม่ออก`;
        return `📰 <strong>${escapeHtml(loser.displayName)}</strong>: ยอมจำนนต่ออำนาจบารมี และประกาศถวายความจงรักภักดีต่อราชันองค์ใหม่`;
      }).join('<br>');

      gazetteEl.innerHTML = `
        <div class="p-3.5 bg-amber-100 text-slate-900 border-2 border-amber-900 text-left">
          <div class="border-b-2 border-amber-900 pb-1.5 mb-2 text-center">
            <div class="text-[9px] uppercase tracking-widest text-amber-950 font-bold">★ THE FORTUNA GAZETTE • หนังสือพิมพ์ราชสำนักฉบับพิเศษ ★</div>
            <h2 class="text-xs sm:text-sm font-black text-slate-950 tracking-tight leading-tight mt-0.5">
              👑 มหาปาฏิหาริย์! ${escapeHtml(winner.displayName)} ประกาศศักดาครองราชบัลลังก์ฟอร์จูน่า!
            </h2>
            <div class="text-[8px] text-amber-900 mt-0.5">ฉบับประจำปีศักราชแห่งริโก้ • ยอดพิมพ์ 1,000,000 ฉบับทั่วแผ่นดิน</div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-800 leading-relaxed mb-2">
            <div class="border-r sm:border-slate-300 pr-1">
              <strong class="text-amber-900">【บทสรรเสริญพระเกียรติคุณ】</strong><br>
              ${escapeHtml(winner.displayName)} จอมยุทธ์ชนชั้น ${escapeHtml(winner.className)} สร้างตำนานสะท้านปฐพีด้วยการ ${escapeHtml(feat)} กวาดมูลค่าทรัพย์สินสุทธิสูงถึง <strong>${netWorth.toLocaleString()}G</strong> พร้อมทั้งปกครองอาณาเขตกว่า <strong>${winner.townsControlled} หัวเมือง</strong>!
            </div>
            <div>
              <strong class="text-amber-900">【คอลัมน์ซุบซิบชะตากรรมคู่แข่ง】</strong><br>
              ${loserGossip || 'ไม่มีคู่แข่งรอดชีวิตมาให้สัมภาษณ์'}
            </div>
          </div>

          <div class="pt-1.5 border-t border-amber-900/40 flex justify-between items-center text-[8px] text-amber-950">
            <span>👑 ประทับตราครั่งหลวงโดย: กษัตริย์ริโก้ (King Rico)</span>
            <span class="font-bold text-red-700 border border-red-700 px-1 py-0.5">VERIFIED SOVEREIGN</span>
          </div>
        </div>
      `;
    }

    document.getElementById('victoryStatsSummary')!.innerHTML = `
      <div><strong>ผลงานแห่งชัยชนะ:</strong> ${feat}</div>
      <div><strong>มูลค่าสุทธิสุดท้าย:</strong> ${netWorth} Gold</div>
      <div><strong>เมืองที่ปกครอง:</strong> ${winner.townsControlled} Territories</div>
      <div><strong>เลเวลวีรบุรุษ:</strong> Level ${winner.level} (${winner.className})</div>
      <div class="mt-2 pt-2 border-t border-slate-700 text-amber-300 font-bold">🏛️ สถิติตลอดแมตช์ (Match Statistics):</div>
      <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-300 mt-1">
        <div>⚔️ สัตว์ประหลาดที่กำจัด: <span class="text-white font-bold">${s.monstersKilled}</span></div>
        <div>🏆 ชนะการดวล PvP: <span class="text-white font-bold">${s.pvpWins}</span></div>
        <div>💰 ทองที่หาได้ทั้งหมด: <span class="text-white font-bold">${s.goldEarnedTotal}G</span></div>
        <div>🏰 ยึดครองเมืองสะสม: <span class="text-white font-bold">${s.townsCapturedTotal}</span></div>
        <div>🎭 แกล้งผู้เล่นอื่น: <span class="text-white font-bold">${s.pranksGiven} ครั้ง</span></div>
      </div>
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
        <div class="p-1.5 bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
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

    const totalAtk = p.getTotalStat('atk');
    const totalDef = p.getTotalStat('def');
    const totalMag = p.getTotalStat('mag');
    const totalSpd = p.getTotalStat('spd');
    const totalLuk = p.getTotalStat('luk');

    const bAtk = totalAtk - p.atk;
    const bDef = totalDef - p.def;
    const bMag = totalMag - p.mag;
    const bSpd = totalSpd - p.spd;
    const bLuk = totalLuk - p.luk;

    document.getElementById('statBreakdownList')!.innerHTML = `
      <div class="flex justify-between items-center text-xs"><span>ATK:</span> <strong class="text-amber-300 font-bold">${totalAtk} ${bAtk > 0 ? `<span class="text-[10px] text-emerald-400 font-normal">(${p.atk}+${bAtk})</span>` : ''}</strong></div>
      <div class="flex justify-between items-center text-xs"><span>DEF:</span> <strong class="text-blue-300 font-bold">${totalDef} ${bDef > 0 ? `<span class="text-[10px] text-emerald-400 font-normal">(${p.def}+${bDef})</span>` : ''}</strong></div>
      <div class="flex justify-between items-center text-xs"><span>MAG:</span> <strong class="text-purple-300 font-bold">${totalMag} ${bMag > 0 ? `<span class="text-[10px] text-emerald-400 font-normal">(${p.mag}+${bMag})</span>` : ''}</strong></div>
      <div class="flex justify-between items-center text-xs"><span>SPD:</span> <strong class="text-yellow-300 font-bold">${totalSpd} ${bSpd > 0 ? `<span class="text-[10px] text-emerald-400 font-normal">(${p.spd}+${bSpd})</span>` : ''}</strong></div>
      <div class="flex justify-between items-center text-xs"><span>LUK:</span> <strong class="text-emerald-300 font-bold">${totalLuk} ${bLuk > 0 ? `<span class="text-[10px] text-emerald-400 font-normal">(${p.luk}+${bLuk})</span>` : ''}</strong></div>
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
          } else if (item.id === 'item_crystal_step') {
            p.hasFlexibleMovement = true;
            audio.magicCast();
            this.game.addLog(`💎 ${p.displayName} ใช้ผลึกย่างก้าวอิสระ! สามารถเลือกหยุดเดินที่ช่องใดก็ได้ตามเส้นทางในเทิร์นนี้!`, 'level');
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

      const comparison = equipmentComparison(p, item);
      if (comparison) row.insertAdjacentHTML('beforeend', comparison);
      row.classList.add('inventory-item-card');
      row.dataset.category = isEquip ? 'equipment' : 'supplies';
      bagList.appendChild(row);
    });

    for (let slot = p.inventory.length; slot < 12; slot++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'inventory-empty-slot';
      emptySlot.setAttribute('aria-hidden', 'true');
      emptySlot.textContent = `ช่องว่าง ${String(slot + 1).padStart(2, '0')}`;
      bagList.appendChild(emptySlot);
    }
    installInventoryTools(bagList);

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
            <span>${escapeHtml(hoveredPlayer.displayName)} (${escapeHtml(hoveredPlayer.className)})</span>
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
          <div class="font-bold text-amber-200">${escapeHtml(hoveredNode.name)}</div>
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

    // Click or Touch Tap on World Map to Center Camera
    const handleMapSelect = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

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
    };

    canvas.addEventListener('click', e => {
      handleMapSelect(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchend', e => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        handleMapSelect(t.clientX, t.clientY);
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
      row.className = 'py-0.5 pixel-row';

      // textContent instead of innerHTML: log lines embed hero names and prank
      // nicknames, which come from free-text input.
      const span = document.createElement('span');
      if (item.type === 'gold') {
        span.className = 'text-amber-400';
        span.textContent = `🪙 ${item.text}`;
      } else if (item.type === 'battle') {
        span.className = 'text-red-400';
        span.textContent = `⚔️ ${item.text}`;
      } else if (item.type === 'darkling') {
        span.className = 'text-purple-400';
        span.textContent = `😈 ${item.text}`;
      } else if (item.type === 'level') {
        span.className = 'text-emerald-400';
        span.textContent = `⭐ ${item.text}`;
      } else {
        span.className = 'text-slate-300';
        span.textContent = `• ${item.text}`;
      }

      row.appendChild(span);
      list.appendChild(row);
    });
  }

  /** Local visual fixture: no save import, network session, rewards or turn advancement. */
  public startVisualReview() {
    const query = new URLSearchParams(window.location.search);
    const scene = query.get('art-scene');
    if (!import.meta.env.DEV || !scene || !['world', 'dungeon', 'battle', 'boss', 'pvp', 'report', 'victory', 'town', 'shop_weapon', 'shop_item', 'shop_magic', 'inspect', 'inventory', 'fantasy_guild', 'event', 'draft', 'expedition_choice', 'chest', 'scout'].includes(scene)) return;
    const requestedClass = query.get('job') || 'warrior';
    const classKey = Object.hasOwn(HERO_CLASSES, requestedClass) ? requestedClass : JOB_VISUALS[requestedClass]?.base || 'warrior';
    this.visualReviewActive = true;
    if (query.get('metrics') === 'true') {
      this.visualReviewMeter = document.createElement('output');
      this.visualReviewMeter.id = 'visualReviewMetrics';
      this.visualReviewMeter.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;padding:6px;background:#142330;color:#eee2c8;font:12px monospace;pointer-events:none';
      this.visualReviewMeter.textContent = 'ART REVIEW · measuring…';
      document.body.append(this.visualReviewMeter);
      this.visualReviewSampleAt = performance.now();
    }
    const party = [{ name: 'Valeria', classKey, isAI: false }];
    if (['pvp', 'report', 'victory'].includes(scene)) party.push({ name: 'Lyra', classKey: 'magician', isAI: false });
    if (scene === 'draft') this.game.gameMode = 'roguelike_draft';
    this.game.initGame(party);
    if (query.get('gear') === 'equipped') {
      const hero = this.game.activePlayer;
      Object.assign(hero, { level: 4, atk: 12, def: 19, mag: 22, spd: 10, luk: 10, hp: 146, maxHp: 146, mp: 91, maxMp: 91 });
      hero.equipment.weapon = { id: 'review-blade', name: 'T5 ดาบวันสิ้นพิภพ', type: 'weapon', cost: 850, atk: 65, mag: 8, spd: 15, luk: 15, icon: '⚔️', desc: 'อุปกรณ์สำหรับตรวจสอบค่าสถานะ' };
      hero.equipment.shield = { id: 'review-shield', name: 'โล่ศักดิ์สิทธิ์', type: 'shield', cost: 800, def: 24, icon: '🛡️', desc: 'อุปกรณ์สำหรับตรวจสอบค่าสถานะ' };
    }
    if (scene === 'inventory') this.game.activePlayer.inventory.push(...SHOP_CATALOG.filter(item => item.type === 'weapon' || item.type === 'armor').slice(0, 3).map(item => ({ ...item })));
    if (JOB_VISUALS[requestedClass]) {
      const hero = this.game.activePlayer;
      hero.level = 20;
      const first = JOB_VISUALS[requestedClass].tier === 2 ? requestedClass : Object.entries(TIER3_PROMOTIONS).find(([, entries]) => entries.some(entry => entry.tier2Key === requestedClass))?.[0];
      if (first) hero.promote(first);
      if (JOB_VISUALS[requestedClass].tier === 3) hero.promote(requestedClass);
    }
    if (query.get('companion') === 'true') this.game.activePlayer.companion = createCompanion('pudding');
    const requestedBiome = query.get('biome') || 'forest';
    const node = this.game.allNodes.find(n => n.id === Number(query.get('node') ?? NaN)) || this.game.allNodes.find(n => n.biome === requestedBiome) || this.game.allNodes[0];
    this.game.activePlayer.nodeId = node.id;
    document.getElementById('titleScreen')?.classList.add('hidden');
    if (scene === 'scout') {
      const target = this.game.allNodes.find(n => n.type === 'town' && n.townData?.isOccupiedByMonster && n.biome === requestedBiome)
        || this.game.allNodes.find(n => n.type === 'town' && n.townData?.isOccupiedByMonster) || node;
      const hero = this.game.activePlayer;
      Object.assign(hero, { nodeId: target.id, gridX: target.gx, gridY: target.gy, gridZ: target.gz });
      const weather = query.get('weather');
      if (weather === 'sunny' || weather === 'snow' || weather === 'rain') this.game.world.weather[target.realmId] = weather;
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');
      this.renderer.centerCameraOn(target.gx, target.gy, target.gz);
      this.hud.update();
      const monster = getNodeEncounterPreview(target, hero).featuredMonster;
      if (monster) this.inspectUI.openMonsterScouting(monster, target, hero,
        () => this.battleUI.startBattle(monster, () => {}), () => this.inspectUI.openInspect(hero));
      return;
    }
    if (scene === 'chest') {
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');
      Object.assign(this.game.activePlayer, { gridX: node.gx, gridY: node.gy, gridZ: node.gz });
      this.renderer.centerCameraOn(node.gx, node.gy, node.gz);
      this.hud.update();
      this.wonderChestUI.open(this.game.activePlayer, () => {});
      return;
    }
    if (['event', 'draft', 'expedition_choice'].includes(scene)) {
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');
      const hero = this.game.activePlayer;
      const eventNode = this.game.allNodes.find(n => n.biome === requestedBiome && n.type === 'empty') || node;
      Object.assign(hero, { nodeId: eventNode.id, gridX: eventNode.gx, gridY: eventNode.gy, gridZ: eventNode.gz });
      this.game.world.weather[eventNode.realmId] = 'rain'; this.game.world.focusRealm = eventNode.realmId;
      this.renderer.centerCameraOn(hero.gridX, hero.gridY, hero.gridZ); this.hud.update();
      if (scene === 'draft') offerWeeklyDraft(this.game);
      else if (scene === 'event') this.fantasyEventUI.openEvent(hero, eventNode, () => this.advanceTurn());
      else { dungeonSystem.enterDungeon(hero, this.game); dungeonSystem.defeatGuardian(hero, hero.nodeId); this.offerDungeonContinuation(hero); }
      return;
    }
    if (scene === 'world') {
      Object.assign(this.game.activePlayer, {gridX:node.gx,gridY:node.gy,gridZ:node.gz});
      document.getElementById('topHUD')?.classList.remove('hidden');
      document.getElementById('bottomBar')?.classList.remove('hidden');
      this.renderer.centerCameraOn(node.gx,node.gy,node.gz);
      const reviewRoll = Number(query.get('roll'));
      if (Number.isInteger(reviewRoll) && reviewRoll > 0 && reviewRoll <= 36) {
        this.game.remainingMoves = reviewRoll;
        this.game.phase = 'CHOOSING_PATH';
        this.game.updateReachableHighlights();
      }
      this.hud.update();
      return;
    }
    if (scene === 'dungeon') {
      // Build the surface first, then use the real late-loading teleport path.
      this.renderer.initBoardCache(this.game.allNodes);
      dungeonSystem.enterDungeon(this.game.activePlayer, this.game, query.get('realm') || 'abyss');
      const player = this.game.activePlayer;
      if (query.get('dungeon-room') === 'exit') {
        const exit = this.game.allNodes.find(n => n.id === player.nodeId + 6)!;
        Object.assign(player, { nodeId: exit.id, gridX: exit.gx, gridY: exit.gy, gridZ: exit.gz });
      }
      this.renderer.centerCameraOn(player.gridX, player.gridY, player.gridZ);
      this.hud.update();
      return;
    }
    const finish = () => { this.game.phase = 'TITLE'; this.visualReviewActive = false; this.visualReviewMeter?.remove(); this.visualReviewMeter = null; document.getElementById('titleScreen')?.classList.remove('hidden'); };
    if (!['battle', 'boss', 'pvp'].includes(scene)) {
      this.hud.update();
      if (scene === 'fantasy_guild') this.isekaiEventUI.openGuild(this.game.activePlayer, finish);
      else if (scene === 'town') this.townUI.open(this.game.allNodes.find(n => n.type === 'town')!, finish, () => {});
      else if (scene.startsWith('shop_')) this.shopUI.open(scene, finish);
      else if (scene === 'inspect') this.inspectUI.openInspect(this.game.activePlayer);
      else if (scene === 'report') this.weeklyReportUI.open(finish);
      else if (scene === 'victory') this.triggerVictoryModal(this.game.activePlayer, 'นำความสงบกลับคืนสู่อาณาจักร');
      else this.openInventory();
      return;
    }
    this.battleUI.startBattle({
      name: scene === 'boss' ? 'Dragon Princess Ignis' : scene === 'pvp' ? 'Lyra' : 'Slime Princess Aurelia',
      hp: 240, maxHp: 240, mp: 60, maxMp: 60,
      atk: 9, def: 8, mag: 10, spd: 6, luk: 5,
      isBoss: scene === 'boss', isPvP: scene === 'pvp',
      ...(scene === 'pvp' ? { playerRef: this.game.players[1], classKey: 'magician' } : {})
    }, finish);
  }

  public loop(time: number) {
    if (this.visualReviewActive && this.visualReviewMeter) {
      this.visualReviewSamples++;
      const now = performance.now(), elapsed = now - this.visualReviewSampleAt;
      if (elapsed >= 1500) {
        this.visualReviewMeter.textContent = `ART REVIEW · ${Math.round(this.visualReviewSamples * 1000 / elapsed)} FPS · ${this.canvas.width} × ${this.canvas.height}`;
        this.visualReviewSamples = 0; this.visualReviewSampleAt = now;
      }
    }
    this.gamepadController?.update();
    this.adventureGuide.update(time, !this.visualReviewActive && this.game.phase !== 'TITLE' && this.isMyTurn());
    if (this.game.phase !== 'CHOOSING_PATH') this.selectedMoveNodeId = null;
    const showMovement = this.canShowMovementNavigation();
    this.movementUI.update(this.game, this.selectedMoveNodeId, showMovement);
    this.worldNavigator.update(time, this.game.phase !== 'TITLE' && !this.game.activeBattle && !this.adventureGuide.isOpen, showMovement);

    if (this.game.phase !== 'TITLE') {
      if (this.game.activeBattle) {
        this.battleUI.syncSpectatorView(time);
        // Render Battle Arena when active (bypasses heavy overworld rendering)
        this.battleUI.renderArena(time);
      } else {
        this.hud.updateMapMarkers();
        // Render 2.5D Isometric World Viewport
        this.renderer.render(
          this.game.allNodes,
          this.game.players,
          this.game.activePlayer,
          showMovement ? this.game.highlightedNodes : [],
          showMovement ? this.renderer.previewPathNodeIds : [],
          time
        );
      }
    }

    requestAnimationFrame(t => this.loop(t));
  }
}

// Start Application on Load
function startApp() {
  installPixelIcons();
  installInterface();
  installAudioSettings();
  installGraphicsSettings();
  const app = new DokaponApp();
  app.startVisualReview();
  if (!document.getElementById('titleScreen')?.classList.contains('hidden')) audio.playBgm('title');
  app.loop(0);
  completeArtworkBoot();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('load', startApp);
} else {
  startApp();
}
