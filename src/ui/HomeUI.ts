import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { BoardNode } from '../game/BoardMap';
import { audio } from '../engine/AudioSynthesizer';

export class HomeUI {
  private game: GameState;

  constructor(game: GameState) {
    this.game = game;
  }

  // Open Home purchase / rest modal
  openHome(node: BoardNode, player: Player, onFinished: () => void, onSkipped?: () => void) {
    const modal = document.getElementById('homeEstateModal');
    if (!modal) {
      if (onSkipped) onSkipped();
      else onFinished();
      return;
    }

    const buySection = document.getElementById('homeBuySection')!;
    const manageSection = document.getElementById('homeManageSection')!;
    const visitorSection = document.getElementById('homeVisitorSection')!;

    buySection.classList.add('hidden');
    manageSection.classList.add('hidden');
    visitorSection.classList.add('hidden');

    // Case 1: Empty node -> Buy plot for Home
    if (node.type === 'empty' || !node.homeData) {
      buySection.classList.remove('hidden');

      const cost = 150;
      const costEl = document.getElementById('homePlotCost')!;
      costEl.innerText = `${cost}G`;

      const playerGoldEl = document.getElementById('homePlayerGold')!;
      playerGoldEl.innerText = `${player.gold}G`;

      const btnBuy = document.getElementById('btnBuyHomePlot')!;
      const btnSkip = document.getElementById('btnSkipHomePlot')!;

      btnBuy.onclick = () => {
        if (player.gold < cost) {
          audio.hurt();
          alert('ทองไม่พอสำหรับซื้อที่ดิน! (ต้องการ 150G)');
          return;
        }

        player.gold -= cost;
        node.type = 'home';
        node.name = `บ้านพักของ ${player.displayName}`;
        node.homeData = {
          ownerId: player.id,
          ownerName: player.displayName,
          level: 1
        };
        player.homeNodeId = node.id;

        audio.fanfare();
        this.game.addLog(`🏡 ${player.displayName} ซื้อที่ดินและสร้าง [บ้านพักส่วนตัว] สำเร็จ! (-${cost}G) กลายเป็นจุดเกิดใหม่ (Respawn Point) และที่พักคู่หู!`, 'gold');

        modal.classList.add('hidden');
        onFinished();
      };

      btnSkip.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        if (onSkipped) {
          onSkipped();
        } else {
          onFinished();
        }
      };

      // AI auto buy if rich
      if (player.isAI) {
        setTimeout(() => {
          if (player.gold >= cost + 100 && player.homeNodeId === null) {
            btnBuy.click();
          } else {
            btnSkip.click();
          }
        }, 800);
      }
    }
    // Case 2: Player's own Home -> Rest & Companion
    else if (node.homeData.ownerId === player.id) {
      manageSection.classList.remove('hidden');

      const titleEl = document.getElementById('homeOwnerTitle')!;
      titleEl.innerText = `🏡 ยินดีต้อนรับกลับบ้าน, ${player.displayName}!`;

      const companionBox = document.getElementById('homeCompanionBox')!;
      if (player.companion) {
        companionBox.classList.remove('hidden');
        document.getElementById('homeCompanionAvatar')!.innerText = player.companion.avatar;
        document.getElementById('homeCompanionName')!.innerText = player.companion.name;
        document.getElementById('homeCompanionDesc')!.innerText = player.companion.skillDesc;
        document.getElementById('homeCompanionSpeech')!.innerText = `"${player.companion.dialogue}"`;
      } else {
        companionBox.classList.add('hidden');
      }

      // Rest for free
      const btnRest = document.getElementById('btnHomeRest')!;
      btnRest.onclick = () => {
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.rustTurns = 0;
        audio.fanfare();
        this.game.addLog(`🛌 ${player.displayName} พักผ่อนที่บ้านพักส่วนตัว ฟื้นฟู HP และ MP จนเต็มเปี่ยมฟรี!`, 'level');
        modal.classList.add('hidden');
        onFinished();
      };

      const btnLeave = document.getElementById('btnHomeLeave')!;
      btnLeave.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        onFinished();
      };

      if (player.isAI) {
        setTimeout(() => btnRest.click(), 700);
      }
    }
    // Case 3: Other player's Home -> Polite visit fee
    else {
      visitorSection.classList.remove('hidden');

      const ownerNameEl = document.getElementById('homeVisitorOwnerName')!;
      ownerNameEl.innerText = node.homeData.ownerName;

      const fee = 25;
      const actualFee = Math.min(player.gold, fee);
      player.gold -= actualFee;

      const owner = this.game.players.find(p => p.id === node.homeData?.ownerId);
      if (owner) owner.gold += actualFee;

      audio.coin();
      this.game.addLog(`🏡 แวะผ่านบ้านพักของ ${node.homeData.ownerName}! จ่ายค่าธรรมเนียมเยี่ยมชม ${actualFee}G`, 'gold');

      const btnDismiss = document.getElementById('btnHomeVisitorDismiss')!;
      btnDismiss.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        onFinished();
      };

      if (player.isAI) {
        setTimeout(() => btnDismiss.click(), 600);
      }
    }

    modal.classList.remove('hidden');
  }
}
