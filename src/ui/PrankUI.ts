import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { audio } from '../engine/AudioSynthesizer';
import { townManager } from '../game/TownManager';
import { aiSystem } from '../game/AISystem';

export class PrankUI {
  private game: GameState;
  private currentWinner: Player | null = null;
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
    document.getElementById('btnSpoilsPolymorph')?.addEventListener('click', () => this.handlePolymorph());
    document.getElementById('btnSpoilsCursedBox')?.addEventListener('click', () => this.handleCursedBox());
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

  open(winner: Player, victim: Player, onFinished: () => void) {
    this.currentWinner = winner;
    this.currentVictim = victim;
    this.onFinishedCallback = onFinished;

    const modal = document.getElementById('pvpSpoilsModal')!;
    document.getElementById('pvpDefeatedPlayerDesc')!.innerText = `${winner.displayName} บดขยี้ ${victim.name}! เลือกของรางวัลแห่งชัยชนะ หรือจะลงโทษให้ขายหน้าดี:`;
    document.getElementById('spoilsGoldAmount')!.innerText = `ยึด ${victim.gold}G`;

    document.getElementById('prankCanvasContainer')?.classList.add('hidden');
    modal.classList.remove('hidden');

    // AI bot choice (check if WINNER is AI)
    if (winner.isAI) {
      const speed = this.game.gameSpeed || 1;
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
      }, Math.max(120, Math.round(900 / speed)));
    }
  }

  private handleStealGold() {
    if (!this.currentVictim) return;
    const p = this.currentWinner || this.game.activePlayer;
    const amount = this.currentVictim.gold;

    aiSystem.recordGrudge(this.currentVictim.id, p.id, 25, 'stole gold');
    this.currentVictim.gold = 0;
    p.gold += amount;
    audio.coin();
    this.game.addLog(`💰 ${p.displayName} ปล้น ${amount}G ทั้งหมดจาก ${this.currentVictim.name}!`, 'gold');

    this.close();
  }

  private handleStealEquip() {
    if (!this.currentVictim) return;
    const p = this.currentWinner || this.game.activePlayer;
    const v = this.currentVictim;

    aiSystem.recordGrudge(v.id, p.id, 30, 'stole equipment');
    if (v.equipment.weapon) {
      const stolen = v.equipment.weapon;
      v.equipment.weapon = null;
      p.inventory.push(stolen);
      this.game.addLog(`⚔️ ${p.displayName} ริบอาวุธของ ${v.name} (${stolen.name})!`, 'battle');
    } else if (v.equipment.armor) {
      const stolen = v.equipment.armor;
      v.equipment.armor = null;
      p.inventory.push(stolen);
      this.game.addLog(`🦺 ${p.displayName} ริบชุดเกราะของ ${v.name} (${stolen.name})!`, 'battle');
    } else {
      this.game.addLog(`${v.name} ไม่มีอุปกรณ์ให้ขโมย ยึด 50G แทน`);
      const taken = Math.min(v.gold, 50);
      v.gold -= taken;
      p.gold += taken;
    }

    this.close();
  }

  private handleStealTown() {
    if (!this.currentVictim) return;
    const p = this.currentWinner || this.game.activePlayer;
    const v = this.currentVictim;

    aiSystem.recordGrudge(v.id, p.id, 40, 'stole town');
    if (v.townDeeds.length > 0) {
      const stolenTownId = v.townDeeds[0];
      const townNode = this.game.allNodes.find(n => n.id === stolenTownId);
      if (townNode) {
        townManager.transferTownOwnership(townNode, p, v);
        this.game.addLog(`🚩 ${p.displayName} ยึดการครอบครองเมือง ${townNode.name} จาก ${v.name}!`, 'level');
      }
    } else {
      this.game.addLog(`${v.name} ไม่มีดินแดน! ปล้น 60G แทน`);
      const taken = Math.min(v.gold, 60);
      v.gold -= taken;
      p.gold += taken;
    }

    this.close();
  }

  private handlePolymorph() {
    if (!this.currentVictim) return;
    const p = this.currentWinner || this.game.activePlayer;
    const v = this.currentVictim;

    const pType = Math.random() > 0.5 ? 'pig' : 'mole';
    v.polymorphTurns = 3;
    v.polymorphType = pType;

    aiSystem.recordGrudge(v.id, p.id, 60, 'polymorphed');
    audio.polymorphOink();
    this.game.addLog(
      `🐷 มหาคำสาปกลายร่าง! ${p.displayName} ร่ายมนตร์สาป ${v.name} ให้กลายเป็น${pType === 'pig' ? 'หมูอ้วน' : 'ตัวตุ่น'} 3 เทิร์น! (ทอยเต๋าได้ 1 แต้มและสเตตัสเหลือ 1!)`,
      'darkling'
    );

    this.close();
  }

  private handleCursedBox() {
    if (!this.currentVictim) return;
    const p = this.currentWinner || this.game.activePlayer;
    const v = this.currentVictim;

    v.cursedBoxTurns = 2;

    aiSystem.recordGrudge(v.id, p.id, 45, 'cursed box');
    audio.curseExplosion();
    this.game.addLog(
      `📦💥 พัสดุระเบิดเวลา! ${p.displayName} ยัดกล่องระเบิดต้องสาปลงในกระเป๋าของ ${v.name}! กล่องจะระเบิดภายใน 2 เทิร์น!`,
      'battle'
    );

    this.close();
  }

  private handleOpenPrankSubmenu() {
    audio.click();
    document.getElementById('prankCanvasContainer')?.classList.remove('hidden');
    (document.getElementById('inputPrankName') as HTMLInputElement).value = 'Poophead';
  }

  private handleConfirmPrank() {
    if (!this.currentVictim) return;
    const p = this.currentWinner || this.game.activePlayer;
    // Cap the length in code too: the maxlength attribute is only a UI hint and this
    // value becomes the victim's display name everywhere it is shown.
    const rawName = (document.getElementById('inputPrankName') as HTMLInputElement).value.trim();
    const sillyName = (rawName || 'Dummy').slice(0, 10);

    aiSystem.recordGrudge(this.currentVictim.id, p.id, 50, 'graffiti prank');
    this.currentVictim.applyPrank(this.selectedPrankType, sillyName, 14);
    p.matchStats.pranksGiven++;
    this.currentVictim.matchStats.pranksReceived++;
    audio.fanfare();
    this.game.addLog(`🎨 วาดหน้าสำเร็จ! ${p.displayName} วาดหน้า ${this.currentVictim.name} และเปลี่ยนชื่อเป็น "${sillyName}" เป็นเวลา 2 สัปดาห์!`, 'darkling');

    this.close();
  }

  private close() {
    document.getElementById('pvpSpoilsModal')?.classList.add('hidden');
    this.currentWinner = null;
    this.currentVictim = null;
    if (this.onFinishedCallback) {
      this.onFinishedCallback();
    }
  }
}
