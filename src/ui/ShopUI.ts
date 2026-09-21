import { GameState } from '../game/GameState';
import { EquipmentItem, pixelSprites } from '../engine/PixelSpriteGenerator';
import { audio } from '../engine/AudioSynthesizer';

export const SHOP_CATALOG: EquipmentItem[] = [
  // Consumables & Multi-Spinners
  { id: 'spin_2', name: 'สปินเนอร์ 2 ลูกเต๋า (2-Spinner)', type: 'spinner', cost: 60, desc: 'ทอยลูกเต๋า 2 ลูกในเทิร์นถัดไป!', icon: '🎲' },
  { id: 'spin_3', name: 'สปินเนอร์ 3 ลูกเต๋า (3-Spinner)', type: 'spinner', cost: 120, desc: 'ทอยลูกเต๋า 3 ลูกในเทิร์นถัดไป!', icon: '🌀' },
  { id: 'pot_hp', name: 'น้ำยาฟื้นพลังชีวิต (Life Potion)', type: 'potion', cost: 35, desc: 'ฟื้นฟู 50 HP ทันที', icon: '🧪' },
  { id: 'pot_elixir', name: 'น้ำทิพย์ฟื้นฟูสมบูรณ์ (Full Elixir)', type: 'potion', cost: 110, desc: 'ฟื้นฟู HP & MP จนเต็มเปี่ยม', icon: '🏺' },
  { id: 'item_key', name: 'กุญแจเวทมนตร์ (Magic Key)', type: 'potion', cost: 75, desc: 'ปลดล็อกหีบสมบัติและห้องนิรภัยโบราณ', icon: '🗝️' },

  // Weapons & Armor
  { id: 'eq_sword', name: 'ดาบกว้างเหล็กกล้า (Broadsword)', type: 'weapon', cost: 130, atk: 8, desc: 'คมดาบกล้าแกร่ง (+8 ATK)', icon: '⚔️' },
  { id: 'eq_axe', name: 'ขวานศึกจอมพลัง (Battle Axe)', type: 'weapon', cost: 170, atk: 14, spd: -2, desc: 'ขวานหนักหน่วง (+14 ATK, -2 SPD)', icon: '🪓' },
  { id: 'eq_daggers', name: 'มีดสั้นเงามรณะ (Shadow Daggers)', type: 'weapon', cost: 140, atk: 6, spd: 6, desc: 'มีดคู่จอมว่องไว (+6 ATK, +6 SPD)', icon: '🗡️' },
  { id: 'eq_plate', name: 'เกราะอกเหล็กกล้า (Iron Cuirass)', type: 'armor', cost: 130, def: 10, desc: 'เกราะเหล็กแข็งแกร่ง (+10 DEF)', icon: '🦺' },
  { id: 'eq_robe', name: 'เสื้อคลุมดารา (Astral Robe)', type: 'armor', cost: 140, def: 5, mag: 9, desc: 'ถักทอด้วยม่านมานา (+5 DEF, +9 MAG)', icon: '👘' },
  { id: 'eq_ring', name: 'แหวนแห่งโชคลาภ (Fortune Band)', type: 'accessory', cost: 160, luk: 10, desc: 'เทพีแห่งโชคประทานพร (+10 LUK)', icon: '💍' },

  // Field Magic Spells
  { id: 'spell_zap', name: 'สายฟ้าฟาด (Field Zap)', type: 'spell', cost: 80, desc: 'ฟาดสายฟ้าสร้างความเสียหาย 35 ดาเมจใส่คู่แข่ง', icon: '⚡' },
  { id: 'spell_swap', name: 'สลับมิติ (Warp Swap)', type: 'spell', cost: 110, desc: 'สลับตำแหน่งบนกระดานกับคู่แข่งทันที', icon: '🌀' }
];

export class ShopUI {
  private game: GameState;
  private currentType: string = 'item';
  private onLeaveCallback?: () => void;

  constructor(game: GameState) {
    this.game = game;
    this.bindButtons();
  }

  private bindButtons() {
    document.getElementById('btnCloseShop')?.addEventListener('click', () => this.handleLeave());
    document.getElementById('btnShopTabBuy')?.addEventListener('click', () => {
      audio.click();
      this.renderList('buy');
    });
    document.getElementById('btnShopTabSell')?.addEventListener('click', () => {
      audio.click();
      this.renderList('sell');
    });
  }

  open(type: string, onLeave: () => void) {
    this.currentType = type;
    this.onLeaveCallback = onLeave;

    const modal = document.getElementById('shopModal')!;
    const title = document.getElementById('shopTitle')!;

    if (type === 'shop_weapon') title.innerText = '⚔️ คลังสรรพาวุธและชุดเกราะไอรอนฟอร์จ';
    else if (type === 'shop_magic') title.innerText = '🔮 หอประมูลเวทมนตร์และคัมภีร์โบราณ';
    else title.innerText = '🏪 ร้านค้าเบ็ดเตล็ดและสปินเนอร์นำโชค';

    // Render 2.5D Isometric Shop Interior Diorama
    const canvas = document.getElementById('shopDioramaCanvas') as HTMLCanvasElement;
    if (canvas) {
      this.renderShopInteriorDiorama(canvas, type);
    }

    this.renderList('buy');
    modal.classList.remove('hidden');

    // AI bot behavior
    if (this.game.activePlayer.isAI) {
      setTimeout(() => {
        const p = this.game.activePlayer;
        if (p.gold >= 60 && !p.inventory.some(i => i.id === 'spin_2')) {
          const spin = SHOP_CATALOG.find(i => i.id === 'spin_2');
          if (spin && p.gold >= spin.cost) {
            p.gold -= spin.cost;
            p.inventory.push({ ...spin });
            this.game.addLog(`AI ${p.displayName} ซื้อ 2-Spinner!`, 'gold');
          }
        }
        setTimeout(() => this.handleLeave(), 600);
      }, 700);
    }
  }

  private renderList(mode: 'buy' | 'sell') {
    const p = this.game.activePlayer;
    document.getElementById('shopPlayerGold')!.innerText = `${p.gold}G`;
    const container = document.getElementById('shopItemList')!;
    container.innerHTML = '';

    if (mode === 'buy') {
      let filtered = SHOP_CATALOG;
      if (this.currentType === 'shop_weapon') {
        filtered = SHOP_CATALOG.filter(i => i.type === 'weapon' || i.type === 'armor' || i.type === 'accessory');
      } else if (this.currentType === 'shop_magic') {
        filtered = SHOP_CATALOG.filter(i => i.type === 'spell');
      } else {
        filtered = SHOP_CATALOG.filter(i => i.type === 'spinner' || i.type === 'potion');
      }

      filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'pixel-box p-2.5 bg-slate-900 border-slate-800 flex items-center justify-between';
        row.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">${item.icon}</span>
            <div>
              <div class="text-xs font-bold text-amber-300">${item.name}</div>
              <div class="text-[9px] text-slate-400">${item.desc}</div>
            </div>
          </div>
          <button class="pixel-btn pixel-btn-gold px-3 py-1 text-xs font-bold text-slate-950 flex items-center gap-1">
            <span>ซื้อ</span>
            <span>${item.cost}G</span>
          </button>
        `;

        row.querySelector('button')!.onclick = () => {
          if (p.gold < item.cost) {
            this.game.addLog(`${p.displayName} มีเงินทองไม่พอซื้อ ${item.name}!`);
            return;
          }
          if (p.inventory.length >= 12) {
            this.game.addLog(`กระเป๋าสัมภาระเต็มแล้ว! ไม่สามารถบรรจุไอเทมเพิ่มได้ (สูงสุด 12 ช่อง)`);
            return;
          }
          p.gold -= item.cost;
          p.inventory.push({ ...item });
          audio.coin();
          this.game.addLog(`🛒 ${p.displayName} ซื้อ ${item.name} สำเร็จ!`, 'gold');
          this.renderList('buy');
        };

        container.appendChild(row);
      });
    } else {
      // Sell
      if (p.inventory.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 text-center py-6">กระเป๋าสัมภาระของคุณว่างเปล่า</div>`;
        return;
      }

      p.inventory.forEach((item, idx) => {
        const sellVal = Math.floor(item.cost * 0.6) || 20;
        const row = document.createElement('div');
        row.className = 'pixel-box p-2 bg-slate-900 border-slate-800 flex items-center justify-between';
        row.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${item.icon}</span>
            <div>
              <div class="text-xs font-bold text-blue-300">${item.name}</div>
              <div class="text-[9px] text-slate-400">ขาย: ${sellVal}G</div>
            </div>
          </div>
          <button class="pixel-btn px-3 py-1 text-xs text-amber-400 font-bold">
            ขาย (+${sellVal}G)
          </button>
        `;

        row.querySelector('button')!.onclick = () => {
          p.gold += sellVal;
          p.inventory.splice(idx, 1);
          audio.coin();
          this.game.addLog(`ขาย ${item.name} ได้เงิน ${sellVal}G!`, 'gold');
          this.renderList('sell');
        };

        container.appendChild(row);
      });
    }
  }

  private handleLeave() {
    audio.click();
    document.getElementById('shopModal')?.classList.add('hidden');
    if (this.onLeaveCallback) {
      this.onLeaveCallback();
    }
  }

  // =========================================================================
  // PROCEDURAL 2.5D ISOMETRIC SHOP INTERIOR DIORAMA
  // =========================================================================
  private renderShopInteriorDiorama(canvas: HTMLCanvasElement, shopType: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Cozy Shop Chamber Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#0b1120');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 2. 2.5D Isometric Flagstone Floor
    const tw = 48;
    const th = 24;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 12; col++) {
        const cx = (col - row) * (tw / 2) + w * 0.35;
        const cy = (col + row) * (th / 2) + 30;

        ctx.fillStyle = (row + col) % 2 === 0 ? '#334155' : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(cx, cy - th / 2);
        ctx.lineTo(cx + tw / 2, cy);
        ctx.lineTo(cx, cy + th / 2);
        ctx.lineTo(cx - tw / 2, cy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 3. Wooden Shop Counter
    const counterX = w * 0.28;
    const counterY = h * 0.52;
    const counterW = w * 0.44;
    const counterH = 26;

    ctx.fillStyle = '#78350f'; // Warm oak
    ctx.fillRect(counterX, counterY, counterW, counterH);
    ctx.fillStyle = '#b45309'; // Countertop highlight
    ctx.fillRect(counterX - 4, counterY - 4, counterW + 8, 6);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(counterX - 4, counterY - 4, counterW + 8, counterH + 4);

    // 4. Shopkeeper (Hero sprite) behind counter
    const merchantClass = shopType === 'shop_magic' ? 'magician' : shopType === 'shop_weapon' ? 'warrior' : 'thief';
    const merchant = pixelSprites.getHeroSprite(merchantClass, 'SW', 'idle', 0);
    ctx.drawImage(merchant, w * 0.45, h * 0.12, 70, 70);

    // 5. Thematic Items on Counter / Shelves
    if (shopType === 'shop_weapon') {
      // Iron anvil on the left
      ctx.fillStyle = '#475569';
      ctx.fillRect(w * 0.12, h * 0.42, 32, 22);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(w * 0.10, h * 0.38, 36, 6);

      // Weapons displayed on counter
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(counterX + 16, counterY - 2, 24, 3);
      ctx.fillRect(counterX + 50, counterY - 2, 28, 3);
    } else if (shopType === 'shop_magic') {
      // Arcane glowing orbs on counter
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(counterX + 22, counterY - 2, 6, 0, Math.PI * 2);
      ctx.arc(counterX + counterW - 22, counterY - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Potions & gold pouch on counter
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(counterX + 16, counterY - 8, 8, 10);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(counterX + 30, counterY - 8, 8, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(counterX + counterW - 20, counterY - 4, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
