import { Player } from '../game/Player';
import { GameState } from '../game/GameState';
import { audio } from '../engine/AudioSynthesizer';
import { EquipmentItem } from '../engine/PixelSpriteGenerator';

export interface WonderPrize {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  rarity: 'SSR' | 'SR' | 'R' | 'TRICK';
  apply: (player: Player, game: GameState) => string;
}

export class WonderChestUI {
  private game: GameState;
  private modal: HTMLElement;
  private isSpinning = false;
  private onCompleteCallback?: () => void;

  private prizes: WonderPrize[] = [
    {
      id: 'gold_jackpot',
      name: 'แจ็คพอตสมบัติมหาศาล',
      icon: '💰',
      color: '#f59e0b',
      desc: 'ขุมทองคำโบราณบรรจุเหรียญทองคำบริสุทธิ์นับพัน!',
      rarity: 'SSR',
      apply: (player: Player) => {
        const amount = 1000 + Math.floor(Math.random() * 500);
        player.gold += amount;
        audio.chestOpen();
        return `🎉 แจ็คพอตแตก! ${player.displayName} ได้รับทองคำ ${amount}G เข้ากระเป๋าทันที!`;
      }
    },
    {
      id: 'divine_relic',
      name: 'ศาสตราแห่งทวยเทพ',
      icon: '⚔️',
      color: '#ec4899',
      desc: 'ศาสตราวุธระดับเทพเจ้าตกทอดจากยุคสร้างโลก',
      rarity: 'SSR',
      apply: (player: Player) => {
        const relicPool: EquipmentItem[] = [
          {
            id: 'excalibur_wonder',
            name: 'ดาบศักดิ์สิทธิ์เอ็กซ์คาลิเบอร์',
            type: 'weapon',
            cost: 850,
            atk: 28,
            mag: 10,
            desc: 'ดาบแห่งราชา เปล่งประกายแสงศักดิ์สิทธิ์ฟันทะลวงเกราะ',
            icon: '🗡️✨'
          },
          {
            id: 'aegis_wonder',
            name: 'โล่ศักดิ์สิทธิ์อีจิส',
            type: 'armor',
            cost: 800,
            def: 24,
            mag: 8,
            desc: 'โล่แห่งเทพเจ้า ปัดป้องการโจมตีทุกชนิด',
            icon: '🛡️✨'
          },
          {
            id: 'crown_of_ages',
            name: 'มงกุฎแห่งกาลเวลา',
            type: 'accessory',
            cost: 900,
            atk: 10,
            def: 10,
            mag: 15,
            spd: 12,
            luk: 20,
            desc: 'มงกุฎโบราณที่สถิตพลังแห่งกาลเวลาและโชคลาภ',
            icon: '👑'
          }
        ];
        const relic = relicPool[Math.floor(Math.random() * relicPool.length)];
        player.inventory.push(relic);
        audio.levelUp();
        return `⚔️ มหาศาสตราเทพ! ${player.displayName} ได้รับ [${relic.name}] เก็บลงในกระเป๋า!`;
      }
    },
    {
      id: 'stat_elixir',
      name: 'น้ำทิพย์อมฤตเพิ่มพลังถาวร',
      icon: '🧪',
      color: '#38bdf8',
      desc: 'โอสถทิพย์ของเหล่าทวยเทพ เพิ่มค่าพลังพื้นฐานถาวร',
      rarity: 'SR',
      apply: (player: Player) => {
        const roll = Math.random();
        let statMsg = '';
        if (roll < 0.33) {
          player.atk += 2;
          statMsg = '+2 ATK (พลังโจมตีกายภาพ)';
        } else if (roll < 0.66) {
          player.mag += 2;
          statMsg = '+2 MAG (พลังเวทมนตร์)';
        } else {
          player.maxHp += 15;
          player.hp += 15;
          statMsg = '+15 MAX HP (พลังชีวิตสูงสุด)';
        }
        audio.levelUp();
        return `✨ พลังเอ่อล้น! ${player.displayName} ดื่มน้ำทิพย์อมฤต ได้รับ ${statMsg} ถาวร!`;
      }
    },
    {
      id: 'triple_dice',
      name: 'ลูกเต๋าวิเศษ 3-Spinner',
      icon: '🎲',
      color: '#a855f7',
      desc: 'ลูกเต๋ากลวิเศษ ทอยได้แต้มมหาศาลถึง 3 เท่าในการเดินครั้งเดียว',
      rarity: 'SR',
      apply: (player: Player) => {
        const spinnerItem: EquipmentItem = {
          id: 'spin_3x',
          name: 'วงล้อ 3 สปินเนอร์',
          type: 'spinner',
          cost: 150,
          desc: 'ทอยลูกเต๋า 3 ลูกพร้อมกันในเทิร์นเดียว (สูงสุด 18 แต้ม)',
          icon: '🌀'
        };
        player.inventory.push(spinnerItem);
        player.inventory.push({ ...spinnerItem, id: `spin_3x_${Date.now()}` });
        audio.coin();
        return `🎲 พรแห่งการเคลื่อนย้าย! ${player.displayName} ได้รับ 3-Spinner x2 ชิ้น!`;
      }
    },
    {
      id: 'town_grant',
      name: 'โฉนดเมืองทองคำ',
      icon: '🏰',
      color: '#22c55e',
      desc: 'ได้รับโฉนดครอบครองเมืองหรือเงินชดเชยมหาศาล',
      rarity: 'SSR',
      apply: (player: Player, game: GameState) => {
        const unownedTowns = game.allNodes.filter(n => n.type === 'town' && !n.townData?.ownerId);
        if (unownedTowns.length > 0) {
          const chosen = unownedTowns[Math.floor(Math.random() * unownedTowns.length)];
          if (chosen.townData) {
            chosen.townData.ownerId = player.id;
            chosen.townData.isOccupiedByMonster = false;
            player.townsControlled++;
            if (!player.townDeeds.includes(chosen.id)) {
              player.townDeeds.push(chosen.id);
            }
            audio.levelUp();
            return `👑 พระราชทานรางวัล! ${player.displayName} ได้รับการแต่งตั้งเป็นเจ้าเมือง [${chosen.name}] ทันที!`;
          }
        }
        player.gold += 800;
        audio.chestOpen();
        return `💰 ไม่มีเมืองว่าง! ${player.displayName} ได้รับเงินชดเชยค่าที่ดิน 800G แทน!`;
      }
    },
    {
      id: 'warp_portal',
      name: 'ประตูมิติข้ามแดน',
      icon: '🌀',
      color: '#06b6d4',
      desc: 'เปิดประตูมิติวาร์ปกลับปราสาทหลวงและฟื้นฟูเต็มที่',
      rarity: 'R',
      apply: (player: Player) => {
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        audio.levelUp();
        return `🕊️ การเยียวยาศักดิ์สิทธิ์! ${player.displayName} ได้รับการฟื้นฟู HP & MP เต็ม 100%!`;
      }
    },
    {
      id: 'rico_trick',
      name: 'ตัวตลกริโก้กลั่นแกล้ง',
      icon: '🤡',
      color: '#ef4444',
      desc: 'ตัวตลกริโก้โผล่มาแกล้งวาดหน้าตลกและรีดไถภาษี!',
      rarity: 'TRICK',
      apply: (player: Player) => {
        const tax = Math.min(player.gold, 120);
        player.gold -= tax;
        player.prank = {
          hasGraffiti: true,
          graffitiType: 'clown',
          sillyName: `ตัวตลก${player.name}`,
          turnsRemaining: 3
        };
        audio.hurt();
        return `💀 ตัวตลกริโก้โผล่มาง้างกล่อง! วาดหน้าตัวตลกใส่ ${player.name} และไถเงินไป ${tax}G!`;
      }
    }
  ];

  constructor(game: GameState) {
    this.game = game;
    let el = document.getElementById('wonderChestModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wonderChestModal';
      el.className = 'hidden absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 pointer-events-auto select-none';
      document.body.appendChild(el);
    }
    this.modal = el;
  }

  open(player: Player, onComplete: () => void) {
    this.onCompleteCallback = onComplete;
    this.isSpinning = false;
    this.renderModal(player);
    this.modal.classList.remove('hidden');

    if (player.isAI) {
      setTimeout(() => this.startSpin(player), 900);
    }
  }

  private renderModal(player: Player) {
    this.modal.innerHTML = `
      <div class="pixel-box-gold max-w-lg w-full p-6 text-center relative flex flex-col items-center">
        <!-- Header Banner -->
        <div class="flex items-center gap-2 mb-1">
          <span class="text-3xl animate-bounce">🎁</span>
          <h2 class="text-lg md:text-xl font-bold text-amber-300 tracking-wider">กล่องสุ่มมหัศจรรย์แห่งฟอร์จูน่า</h2>
          <span class="text-3xl animate-bounce">✨</span>
        </div>
        <p class="text-[11px] text-amber-200/80 mb-4">
          ${player.displayName} เหยียบช่องมหัศจรรย์! เสี่ยงทายดวงชะตาเพื่อลุ้นรับมหาขุมทรัพย์ Dokapon!
        </p>

        <!-- Wonder Chest Diorama / Roulette Viewport -->
        <div id="wonderChestViewport" class="w-full bg-slate-950 border-2 border-amber-600/70 p-5 mb-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
          <!-- Ambient Glow Background -->
          <div class="absolute inset-0 pointer-events-none"></div>

          <div id="wonderIconLarge" class="text-6xl mb-2">
            🎁
          </div>
          <div id="wonderCardTitle" class="text-base font-bold text-amber-300 tracking-wide mb-1">
            กล่องสมบัติโบราณ
          </div>
          <div id="wonderCardDesc" class="text-xs text-slate-300 max-w-xs leading-relaxed">
            กดปุ่มด้านล่างเพื่อเปิดกล่องและสุ่มรับชะตากรรมของคุณ!
          </div>
        </div>

        <!-- Action Button -->
        <button id="btnSpinWonderChest" class="pixel-btn pixel-btn-gold px-8 py-3 text-sm font-bold text-slate-950 flex items-center gap-2 tracking-widest">
          <span>🎲</span>
          <span id="btnSpinText">เปิดกล่องสุ่มมหัศจรรย์!</span>
        </button>
      </div>
    `;

    document.getElementById('btnSpinWonderChest')?.addEventListener('click', () => {
      if (this.isSpinning) return;
      this.startSpin(player);
    });
  }

  private startSpin(player: Player) {
    this.isSpinning = true;
    audio.click();

    const btn = document.getElementById('btnSpinWonderChest') as HTMLButtonElement;
    const btnText = document.getElementById('btnSpinText') as HTMLElement;
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'กำลังเปิดกล่องเสี่ยงทาย...';

    const iconEl = document.getElementById('wonderIconLarge')!;
    const titleEl = document.getElementById('wonderCardTitle')!;
    const descEl = document.getElementById('wonderCardDesc')!;

    // Dramatic Roulette Cycling
    let step = 0;
    const totalSteps = 24;
    let delay = 60;

    const chosenPrize = this.prizes[Math.floor(Math.random() * this.prizes.length)];

    const cycle = () => {
      const p = this.prizes[step % this.prizes.length];
      iconEl.innerText = p.icon;
      titleEl.innerText = p.name;
      titleEl.style.color = p.color;
      descEl.innerText = p.desc;
      audio.coin();

      // Shake animation
      iconEl.style.transform = `scale(${1 + (step % 2) * 0.15}) rotate(${(step % 2 === 0 ? -8 : 8)}deg)`;

      step++;
      if (step < totalSteps) {
        delay += 12; // Gradually slow down like a real wheel
        setTimeout(cycle, delay);
      } else {
        // Land on the final chosen prize!
        iconEl.innerText = chosenPrize.icon;
        titleEl.innerText = chosenPrize.name;
        titleEl.style.color = chosenPrize.color;
        iconEl.style.transform = 'scale(1.25) rotate(0deg)';

        const resultLog = chosenPrize.apply(player, this.game);
        descEl.innerText = resultLog;
        this.game.addLog(resultLog, 'gold');

        if (btnText) btnText.innerText = '✔ รับรางวัลเรียบร้อย';

        // Auto-dismiss or allow click
        setTimeout(() => {
          this.close();
        }, player.isAI ? 1800 : 2500);
      }
    };

    cycle();
  }

  private close() {
    this.modal.classList.add('hidden');
    this.isSpinning = false;
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }
}
