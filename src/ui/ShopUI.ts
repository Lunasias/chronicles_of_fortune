import { GameState } from '../game/GameState';
import { EquipmentItem, pixelSprites } from '../engine/PixelSpriteGenerator';
import { audio } from '../engine/AudioSynthesizer';
import { syncFeedPanelClass } from '../util/PanelFocus';
import {pixelDisc, pixelVerticalRamp } from '../engine/PixelFx';

export const SHOP_CATALOG: EquipmentItem[] = [
  // Multi-Spinners (Tiers 1-5)
  { id: 'spin_2', name: 'สปินเนอร์ 2 ลูกเต๋า (2-Spinner)', type: 'spinner', cost: 150, desc: 'ทอยลูกเต๋า 2 ลูกในการเดินเทิร์นถัดไป!', icon: '🎲' },
  { id: 'spin_3', name: 'สปินเนอร์ 3 ลูกเต๋า (3-Spinner)', type: 'spinner', cost: 350, desc: 'ทอยลูกเต๋า 3 ลูกในการเดินเทิร์นถัดไป!', icon: '🌀' },
  { id: 'spin_4', name: 'สปินเนอร์ 4 ลูกเต๋า (4-Spinner)', type: 'spinner', cost: 750, desc: 'ทอยลูกเต๋า 4 ลูก พุ่งทะยานระยะไกล!', icon: '🌪️' },
  { id: 'spin_5', name: 'สปินเนอร์ 5 ลูกเต๋า (5-Spinner)', type: 'spinner', cost: 1500, desc: 'ทอยลูกเต๋า 5 ลูก สูงสุดข้ามทวีป!', icon: '🚀' },

  // Potions & Permanent Stat Draughts
  { id: 'pot_hp', name: 'น้ำยาฟื้นพลังชีวิต (Life Potion)', type: 'potion', cost: 80, desc: 'ฟื้นฟู 60 HP ทันที', icon: '🧪' },
  { id: 'pot_elixir', name: 'น้ำทิพย์ฟื้นฟูสมบูรณ์ (Full Elixir)', type: 'potion', cost: 350, desc: 'ฟื้นฟู HP & MP จนเต็มเปี่ยม 100%', icon: '🏺' },
  { id: 'pot_str', name: 'น้ำยาพลังกายยักษ์ (STR Elixir)', type: 'potion', cost: 650, desc: 'เพิ่มพลังกายภาพ +3 ATK อย่างถาวร!', icon: '💪' },
  { id: 'pot_def', name: 'น้ำยาเกราะเหล็กไหล (DEF Elixir)', type: 'potion', cost: 650, desc: 'เพิ่มพลังป้องกัน +3 DEF อย่างถาวร!', icon: '🛡️' },
  { id: 'pot_mag', name: 'น้ำยาปัญญามนต์ (MAG Elixir)', type: 'potion', cost: 650, desc: 'เพิ่มพลังเวทมนตร์ +3 MAG อย่างถาวร!', icon: '🔮' },
  { id: 'pot_spd', name: 'น้ำยาวายุติดปีก (SPD Elixir)', type: 'potion', cost: 650, desc: 'เพิ่มความเร็ว +3 SPD อย่างถาวร!', icon: '👟' },
  { id: 'pot_luk', name: 'น้ำยาเทพีนำโชค (LUK Elixir)', type: 'potion', cost: 650, desc: 'เพิ่มโชคชะตา +3 LUK อย่างถาวร!', icon: '🍀' },
  { id: 'item_bomb', name: 'ระเบิดไดนาไมต์สนามรบ (Field Bomb)', type: 'potion', cost: 250, desc: 'ขว้างใส่ศัตรู/ผู้เล่นใกล้เคียง สร้าง 40 ดาเมจ', icon: '💣' },
  { id: 'item_dispel', name: 'เครื่องรางแก้คำสาป (Dispel Charm)', type: 'potion', cost: 180, desc: 'ลบล้างคำสาปสนิมและสถานะผิดปกติทั้งหมด', icon: '🫙' },
  { id: 'item_recall', name: 'คัมภีร์วาร์ปปราสาท (Castle Recall)', type: 'potion', cost: 220, desc: 'เปิดมิติวาร์ปกลับสู่ปราสาทหลวงทันที', icon: '🚪' },
  { id: 'item_key', name: 'กุญแจเวทมนตร์ (Magic Key)', type: 'potion', cost: 200, desc: 'ปลดล็อกหีบสมบัติและห้องนิรภัยโบราณ', icon: '🗝️' },

  // Weapons (Tiers 1–5: Progressive Scaled Costs)
  { id: 'wpn_broadsword', name: 'T1 ดาบกว้างเหล็กกล้า (Broadsword)', type: 'weapon', cost: 320, atk: 8, desc: 'คมดาบกล้าแกร่งเบื้องต้น (+8 ATK)', icon: '⚔️' },
  { id: 'wpn_mithril_edge', name: 'T2 คมดาบมิธริล (Mithril Edge)', type: 'weapon', cost: 1200, atk: 15, spd: 3, desc: 'ดาบเบาและคมกริบ (+15 ATK, +3 SPD)', icon: '🗡️' },
  { id: 'wpn_flame_brand', name: 'T3 ดาบเพลิงลาวา (Flame Brand)', type: 'weapon', cost: 4200, atk: 26, mag: 6, desc: 'ดาบอาบเปลวเพลิงบริสุทธิ์ (+26 ATK, +6 MAG)', icon: '🔥⚔️' },
  { id: 'wpn_excalibur', name: 'T4 เอ็กซ์คาลิเบอร์ (Excalibur)', type: 'weapon', cost: 12500, atk: 42, def: 10, mag: 10, desc: 'ดาบเทวะศักดิ์สิทธิ์ (+42 ATK, +10 DEF, +10 MAG)', icon: '🌟⚔️' },
  { id: 'wpn_ragnarok', name: 'T5 ดาบวันสิ้นพิภพ (Ragnarok Blade)', type: 'weapon', cost: 32000, atk: 65, spd: 15, luk: 15, desc: 'ดาบโบราณสะท้านภพ (+65 ATK, +15 SPD, +15 LUK)', icon: '👑⚔️' },

  // Shields (Tiers 1–5: Progressive Scaled Costs)
  { id: 'shd_buckler', name: 'T1 โล่กลมไม้โอ๊ค (Round Buckler)', type: 'shield', cost: 260, def: 6, desc: 'โล่ป้องกันเบื้องต้น (+6 DEF)', icon: '🛡️' },
  { id: 'shd_knight', name: 'T2 โล่อัศวินเหล็กกล้า (Knight Shield)', type: 'shield', cost: 980, def: 14, atk: 3, desc: 'โล่ปะทะกระแทกศัตรู (+14 DEF, +3 ATK)', icon: '🛡️⚔️' },
  { id: 'shd_dragon_scale', name: 'T3 โล่เกล็ดมังกร (Dragon Shield)', type: 'shield', cost: 3600, def: 24, mag: 6, desc: 'เกล็ดมังกรต้านเพลิงและเวทมนตร์ (+24 DEF, +6 MAG)', icon: '🐉🛡️' },
  { id: 'shd_aegis', name: 'T4 โล่เทพีอีจิส (Aegis Holy Guard)', type: 'shield', cost: 10800, def: 38, mag: 12, luk: 8, desc: 'โล่เทวาพิทักษ์กาย (+38 DEF, +12 MAG, +8 LUK)', icon: '✨🛡️' },
  { id: 'shd_divine_mirror', name: 'T5 โล่กระจกสะท้อนสวรรค์ (Mirror Shield)', type: 'shield', cost: 28000, def: 55, mag: 18, spd: 8, desc: 'โล่กระจกสะท้อนเวทมนตร์ (+55 DEF, +18 MAG, +8 SPD)', icon: '🪞🛡️' },

  // Armor (Tiers 1–5: Progressive Scaled Costs)
  { id: 'arm_iron_cuirass', name: 'T1 เกราะอกเหล็กกล้า (Iron Cuirass)', type: 'armor', cost: 280, def: 8, desc: 'เกราะเหล็กเนื้อแน่น (+8 DEF)', icon: '🦺' },
  { id: 'arm_mithril_chain', name: 'T2 เสื้อโซ่ถักมิธริล (Mithril Mail)', type: 'armor', cost: 1100, def: 18, spd: 4, desc: 'โซ่ถักน้ำหนักเบาคล่องตัว (+18 DEF, +4 SPD)', icon: '⛓️' },
  { id: 'arm_dragon_scale', name: 'T3 เกราะเกล็ดมังกรเพลิง (Dragon Armor)', type: 'armor', cost: 3900, def: 30, atk: 6, desc: 'เกราะเกล็ดหลอมลาวา (+30 DEF, +6 ATK)', icon: '🐲🦺' },
  { id: 'arm_goddess_robe', name: 'T4 เสื้อคลุมเทพีมนตรา (Goddess Robe)', type: 'armor', cost: 11500, def: 42, mag: 16, luk: 10, desc: 'ผ้าไหมสวรรค์ทอด้วยมานา (+42 DEF, +16 MAG, +10 LUK)', icon: '👘✨' },
  { id: 'arm_valkyrie_plate', name: 'T5 เกราะวัลคิรีไร้พ่าย (Valkyrie Plate)', type: 'armor', cost: 30000, def: 60, atk: 12, spd: 12, desc: 'เกราะทองคำขาวแห่งวัลคิรี (+60 DEF, +12 ATK, +12 SPD)', icon: '👑🦺' },

  // Accessories (Tiers 1–5: Progressive Scaled Costs)
  { id: 'acc_fortune_band', name: 'T1 แหวนโชคลาภ (Fortune Band)', type: 'accessory', cost: 300, luk: 8, desc: 'แหวนเพิ่มดวงชะตา (+8 LUK)', icon: '💍' },
  { id: 'acc_swift_wing', name: 'T2 ตราปีกวายุ (Swift Wing Amulet)', type: 'accessory', cost: 1050, spd: 10, luk: 5, desc: 'จี้เร่งความเร็วการเดินทาง (+10 SPD, +5 LUK)', icon: '🪶' },
  { id: 'acc_berserk_belt', name: 'T3 เข็มขัดเบอร์เซิร์กเกอร์ (Berserk Belt)', type: 'accessory', cost: 3800, atk: 12, def: 8, desc: 'ปลุกสัญชาตญาณนักรบ (+12 ATK, +8 DEF)', icon: '🥋' },
  { id: 'acc_archmage_ring', name: 'T4 ตราประจำจอมเวท (Archmage Crest)', type: 'accessory', cost: 11000, mag: 22, spd: 10, desc: 'ตราสัญลักษณ์มหาจอมเวท (+22 MAG, +10 SPD)', icon: '🔮' },
  { id: 'acc_heroine_crown', name: 'T5 มงกุฎราชินีผู้พิชิต (Sovereign Crown)', type: 'accessory', cost: 35000, atk: 15, def: 15, mag: 15, spd: 15, luk: 20, desc: 'มงกุฎเกียรติยศเพิ่มสเตตัสทุกค่า (+15 ALL, +20 LUK)', icon: '👑' },

  // Field Magic Spells
  { id: 'spell_zap', name: 'สายฟ้าฟาด (Field Zap)', type: 'spell', cost: 220, desc: 'ฟาดสายฟ้าสร้างความเสียหาย 35 ดาเมจใส่คู่แข่ง', icon: '⚡' },
  { id: 'spell_swap', name: 'สลับมิติ (Warp Swap)', type: 'spell', cost: 380, desc: 'สลับตำแหน่งบนกระดานกับคู่แข่งทันที', icon: '🌀' },
  { id: 'spell_curse', name: 'คำสาปสนิม (Curse of Rust)', type: 'spell', cost: 450, desc: 'ลดพลัง ATK และ DEF ของเป้าหมาย 30% นาน 3 เทิร์น', icon: '🩸' },
  { id: 'spell_audit', name: 'ตรวจสอบบัญชีหลวง (Royal Audit)', type: 'spell', cost: 550, desc: 'ยึดเงิน 25% จากถุงเงินของผู้เล่นเป้าหมาย', icon: '🧲' },
  { id: 'spell_sanctuary', name: 'วิหารศักดิ์สิทธิ์ (Holy Sanctuary)', type: 'spell', cost: 600, desc: 'ฟื้นฟู HP เต็มเปี่ยม และลบล้างสถานะผิดปกติทั้งหมด', icon: '🕊️' },
  { id: 'spell_recall', name: 'วาร์ปกลับปราสาท (Castle Recall)', type: 'spell', cost: 300, desc: 'ย้ายตำแหน่งกลับสู่ปราสาทหลวงทันที', icon: '🚪' }
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
    // Keep the live event feed readable next to the shop panel.
    syncFeedPanelClass();

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
        filtered = SHOP_CATALOG.filter(i => i.type === 'weapon' || i.type === 'shield' || i.type === 'armor' || i.type === 'accessory');
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
    syncFeedPanelClass();
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
    // Authored stops kept; the space between them is banded rather than interpolated.
    pixelVerticalRamp(ctx, 0, 0, w, h, [[0, '#090d16'], [0.5, '#1e293b'], [1, '#0b1120']]);

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
      ctx.beginPath();
      pixelDisc(ctx, counterX + 22, counterY - 2, 6, ctx.fillStyle);
      pixelDisc(ctx, counterX + counterW - 22, counterY - 2, 6, ctx.fillStyle);
      ctx.fill();
    } else {
      // Potions & gold pouch on counter
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(counterX + 16, counterY - 8, 8, 10);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(counterX + 30, counterY - 8, 8, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      pixelDisc(ctx, counterX + counterW - 20, counterY - 4, 7, ctx.fillStyle);
      ctx.fill();
    }
  }
}
