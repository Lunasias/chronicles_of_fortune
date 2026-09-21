import { GameState } from '../game/GameState';
import { BoardNode } from '../game/BoardMap';
import { townManager } from '../game/TownManager';
import { audio } from '../engine/AudioSynthesizer';
import { pixelSprites } from '../engine/PixelSpriteGenerator';

export class TownUI {
  private game: GameState;
  private currentTown: BoardNode | null = null;
  private onTownLeaveCallback?: () => void;
  private onInitiateRobCallback?: (townNode: BoardNode) => void;

  constructor(game: GameState) {
    this.game = game;
    this.bindButtons();
  }

  private bindButtons() {
    document.getElementById('btnTownInn')?.addEventListener('click', () => this.handleInn());
    document.getElementById('btnTownInvest')?.addEventListener('click', () => this.handleInvest());
    document.getElementById('btnTownCollect')?.addEventListener('click', () => this.handleCollect());
    document.getElementById('btnTownRob')?.addEventListener('click', () => this.handleRob());
    document.getElementById('btnLeaveTown')?.addEventListener('click', () => this.handleLeave());
  }

  open(
    townNode: BoardNode,
    onLeave: () => void,
    onInitiateRob: (townNode: BoardNode) => void
  ) {
    this.currentTown = townNode;
    this.onTownLeaveCallback = onLeave;
    this.onInitiateRobCallback = onInitiateRob;

    const modal = document.getElementById('townModal')!;
    const p = this.game.activePlayer;

    const townLvl = townNode.townData?.level || 1;
    const tierTitle = townLvl >= 3 ? '🏰 GRAND CITADEL' : townLvl >= 2 ? '🛡️ FORTRESS TOWN' : '🏘️ HAMLET';
    document.getElementById('townName')!.innerText = townNode.name;
    document.getElementById('townBiome')!.innerText = `${townNode.biome.toUpperCase()} REALM • ${tierTitle} (LEVEL ${townLvl})`;

    const ownerId = townNode.townData?.ownerId;
    const owner = this.game.players.find(pl => pl.id === ownerId);

    const ownerText = document.getElementById('townOwnerText')!;
    const investCostText = document.getElementById('townInvestCostText')!;

    if (owner) {
      ownerText.innerText = `${owner.displayName} (${owner.className})`;
      ownerText.style.color = owner.color;

      // If rival owned, collect toll automatically upon entering
      if (owner.id !== p.id) {
        const toll = townManager.calculateToll(townNode);
        p.gold = Math.max(0, p.gold - toll);
        owner.gold += toll;
        this.game.addLog(`🪙 ${p.displayName} paid ${toll}G toll tax to town owner ${owner.displayName}!`, 'gold');
        audio.coin();
      }
    } else {
      ownerText.innerText = 'Neutral (Unclaimed)';
      ownerText.style.color = '#86efac';
    }

    const investCost = 150 * (townNode.townData?.level || 1);
    investCostText.innerText = `Invest ${investCost}G (Upgrade)`;

    // Render 2.5D Isometric Town Plaza Diorama
    const canvas = document.getElementById('townDioramaCanvas') as HTMLCanvasElement;
    if (canvas) {
      const ownerColor = owner?.color || null;
      this.renderTownPlazaDiorama(canvas, townNode.name, townNode.townData?.level || 1, ownerColor);
    }

    modal.classList.remove('hidden');

    // AI automatic action
    if (p.isAI) {
      setTimeout(() => {
        if (p.hp < p.maxHp * 0.6 && p.gold >= 30) {
          this.handleInn();
        }
        if (owner?.id === p.id && p.gold >= investCost) {
          this.handleInvest();
        }
        setTimeout(() => this.handleLeave(), 600);
      }, 800);
    }
  }

  private handleInn() {
    const p = this.game.activePlayer;
    const isOwner = this.currentTown?.townData?.ownerId === p.id;
    const cost = isOwner ? 0 : 30;

    if (p.gold < cost) {
      this.game.addLog(`${p.displayName} doesn't have enough coin for the Inn!`);
      return;
    }

    p.gold -= cost;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    audio.levelUp();
    this.game.addLog(`🛏️ ${p.displayName} rested at the Inn! HP & MP fully restored!`);
  }

  private handleInvest() {
    if (!this.currentTown) return;
    const p = this.game.activePlayer;

    const res = townManager.investInTown(this.currentTown, p);
    if (res.success) {
      this.game.addLog(`📈 ${p.displayName} invested in ${this.currentTown.name}! Upgraded to ${res.tierName} (Level ${res.newLevel})!`, 'level');
      this.open(this.currentTown, this.onTownLeaveCallback!, this.onInitiateRobCallback!);
    } else {
      this.game.addLog(`Cannot invest in this town (Must be owner with sufficient funds).`);
    }
  }

  private handleCollect() {
    if (!this.currentTown?.townData) return;
    const p = this.game.activePlayer;

    if (this.currentTown.townData.ownerId === p.id) {
      const tax = this.currentTown.townData.taxYield;
      p.gold += tax;
      audio.coin();
      this.game.addLog(`🪙 Collected ${tax}G emergency tax from ${this.currentTown.name}!`, 'gold');
    } else {
      this.game.addLog(`You do not own this territory!`);
    }
  }

  private handleRob() {
    if (!this.currentTown) return;
    document.getElementById('townModal')?.classList.add('hidden');
    if (this.onInitiateRobCallback) {
      this.onInitiateRobCallback(this.currentTown);
    }
  }

  private handleLeave() {
    audio.click();
    document.getElementById('townModal')?.classList.add('hidden');
    this.currentTown = null;
    if (this.onTownLeaveCallback) {
      this.onTownLeaveCallback();
    }
  }

  // =========================================================================
  // PROCEDURAL 2.5D ISOMETRIC TOWN PLAZA DIORAMA
  // =========================================================================
  private renderTownPlazaDiorama(
    canvas: HTMLCanvasElement,
    townName: string,
    townLevel: number,
    ownerColor: string | null
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Sky & Atmospheric Backdrop Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060a14');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. 2.5D Isometric Flagstone Ground Paving
    const tw = 48;
    const th = 24;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 12; col++) {
        const cx = (col - row) * (tw / 2) + w * 0.35;
        const cy = (col + row) * (th / 2) + 20;

        ctx.fillStyle = (row + col) % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.beginPath();
        ctx.moveTo(cx, cy - th / 2);
        ctx.lineTo(cx + tw / 2, cy);
        ctx.lineTo(cx, cy + th / 2);
        ctx.lineTo(cx - tw / 2, cy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 3. Central Town Citadel Fortress
    const citadel = pixelSprites.getBuildingSprite('town', ownerColor);
    ctx.drawImage(citadel, w * 0.44 - 40, h * 0.48 - 40, 80, 80);

    // 4. City Watch Guard (Hero sprite)
    const guard = pixelSprites.getHeroSprite('warrior', 'SE', 'idle', 0);
    ctx.drawImage(guard, w * 0.22, h * 0.35, 60, 60);

    // 5. Merchant Traveler (Hero sprite)
    const merchant = pixelSprites.getHeroSprite('thief', 'SW', 'idle', 0);
    ctx.drawImage(merchant, w * 0.72, h * 0.35, 60, 60);

    // 6. Town Nameplate Ribbon
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = ownerColor || '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(14, 10, 220, 26, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ownerColor || '#fde047';
    ctx.font = 'bold 9px Silkscreen, sans-serif';
    ctx.fillText(`🏰 ${townName} (LV ${townLevel})`, 22, 26);
  }
}
