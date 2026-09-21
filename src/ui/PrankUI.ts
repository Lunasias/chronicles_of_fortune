import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { audio } from '../engine/AudioSynthesizer';
import { townManager } from '../game/TownManager';

export class PrankUI {
  private game: GameState;
  private currentVictim: Player | null = null;
  private onFinishedCallback?: () => void;
  private selectedPrankType: 'mustache' | 'spiral' | 'clown' = 'mustache';

  constructor(game: GameState) {
    this.game = game;
    this.bindButtons();
  }

  private bindButtons() {
    document.getElementById('btnSpoilsGold')?.addEventListener('click', () => this.handleStealGold());
    document.getElementById('btnSpoilsEquip')?.addEventListener('click', () => this.handleStealEquip());
    document.getElementById('btnSpoilsTown')?.addEventListener('click', () => this.handleStealTown());
    document.getElementById('btnSpoilsPrank')?.addEventListener('click', () => this.handleOpenPrankSubmenu());

    // Prank buttons
    document.getElementById('btnApplyMustache')?.addEventListener('click', () => {
      audio.click();
      this.selectedPrankType = 'mustache';
      (document.getElementById('inputPrankName') as HTMLInputElement).value = 'Mustachio';
    });
    document.getElementById('btnApplySwirl')?.addEventListener('click', () => {
      audio.click();
      this.selectedPrankType = 'spiral';
      (document.getElementById('inputPrankName') as HTMLInputElement).value = 'Dizzy Loser';
    });
    document.getElementById('btnConfirmPrank')?.addEventListener('click', () => this.handleConfirmPrank());
  }

  open(victim: Player, onFinished: () => void) {
    this.currentVictim = victim;
    this.onFinishedCallback = onFinished;

    const modal = document.getElementById('pvpSpoilsModal')!;
    document.getElementById('pvpDefeatedPlayerDesc')!.innerText = `You crushed ${victim.name}! Choose your spoils of war or exact sweet humiliating revenge:`;
    document.getElementById('spoilsGoldAmount')!.innerText = `Take ${victim.gold}G`;

    document.getElementById('prankCanvasContainer')?.classList.add('hidden');
    modal.classList.remove('hidden');

    // AI bot choice
    const p = this.game.activePlayer;
    if (p.isAI) {
      setTimeout(() => {
        if (victim.townDeeds.length > 0) {
          this.handleStealTown();
        } else if (victim.gold > 100) {
          this.handleStealGold();
        } else {
          this.selectedPrankType = 'mustache';
          (document.getElementById('inputPrankName') as HTMLInputElement).value = 'Poophead';
          this.handleConfirmPrank();
        }
      }, 900);
    }
  }

  private handleStealGold() {
    if (!this.currentVictim) return;
    const p = this.game.activePlayer;
    const amount = this.currentVictim.gold;

    this.currentVictim.gold = 0;
    p.gold += amount;
    audio.coin();
    this.game.addLog(`💰 ${p.displayName} robbed all ${amount}G from ${this.currentVictim.name}!`, 'gold');

    this.close();
  }

  private handleStealEquip() {
    if (!this.currentVictim) return;
    const p = this.game.activePlayer;
    const v = this.currentVictim;

    if (v.equipment.weapon) {
      const stolen = v.equipment.weapon;
      v.equipment.weapon = null;
      p.inventory.push(stolen);
      this.game.addLog(`⚔️ ${p.displayName} stripped ${v.name}'s weapon (${stolen.name})!`, 'battle');
    } else if (v.equipment.armor) {
      const stolen = v.equipment.armor;
      v.equipment.armor = null;
      p.inventory.push(stolen);
      this.game.addLog(`🦺 ${p.displayName} stripped ${v.name}'s armor (${stolen.name})!`, 'battle');
    } else {
      this.game.addLog(`${v.name} had no equipment to steal; took 50G instead.`);
      const taken = Math.min(v.gold, 50);
      v.gold -= taken;
      p.gold += taken;
    }

    this.close();
  }

  private handleStealTown() {
    if (!this.currentVictim) return;
    const p = this.game.activePlayer;
    const v = this.currentVictim;

    if (v.townDeeds.length > 0) {
      const stolenTownId = v.townDeeds[0];
      const townNode = this.game.allNodes.find(n => n.id === stolenTownId);
      if (townNode) {
        townManager.transferTownOwnership(townNode, p, v);
        this.game.addLog(`🚩 ${p.displayName} seized ownership of ${townNode.name} from ${v.name}!`, 'level');
      }
    } else {
      this.game.addLog(`${v.name} owns no territories! Robbed 60G instead.`);
      const taken = Math.min(v.gold, 60);
      v.gold -= taken;
      p.gold += taken;
    }

    this.close();
  }

  private handleOpenPrankSubmenu() {
    audio.click();
    document.getElementById('prankCanvasContainer')?.classList.remove('hidden');
    (document.getElementById('inputPrankName') as HTMLInputElement).value = 'Poophead';
  }

  private handleConfirmPrank() {
    if (!this.currentVictim) return;
    const p = this.game.activePlayer;
    const sillyName = (document.getElementById('inputPrankName') as HTMLInputElement).value.trim() || 'Dummy';

    this.currentVictim.applyPrank(this.selectedPrankType, sillyName, 14);
    audio.fanfare();
    this.game.addLog(`🎨 PRANK APPLIED! ${p.displayName} scribbled on ${this.currentVictim.name}'s face and renamed them "${sillyName}" for 2 weeks!`, 'darkling');

    this.close();
  }

  private close() {
    document.getElementById('pvpSpoilsModal')?.classList.add('hidden');
    this.currentVictim = null;
    if (this.onFinishedCallback) {
      this.onFinishedCallback();
    }
  }
}
