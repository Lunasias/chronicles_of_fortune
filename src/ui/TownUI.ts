import { GameState } from '../game/GameState';
import { BoardNode } from '../game/BoardMap';
import { townManager } from '../game/TownManager';
import { audio } from '../engine/AudioSynthesizer';

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

    document.getElementById('townName')!.innerText = townNode.name;
    document.getElementById('townBiome')!.innerText = `${townNode.biome.toUpperCase()} REALM • LEVEL ${townNode.townData?.level || 1}`;

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

    const success = townManager.investInTown(this.currentTown, p);
    if (success) {
      this.game.addLog(`📈 ${p.displayName} invested in ${this.currentTown.name}! Upgraded to Level ${this.currentTown.townData!.level}!`, 'level');
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
}
