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
  { id: 'item_crystal_step', name: 'ผลึกย่างก้าวอิสระ (Free Step Crystal)', type: 'potion', cost: 220, desc: 'หยุดเดินที่ช่องใดก็ได้ตามเส้นทาง ไม่จำเป็นต้องตรงกับแต้มเต๋า 1 เทิร์น', icon: '💎' },
  { id: 'item_bomb', name: 'ระเบิดไดนาไมต์สนามรบ (Field Bomb)', type: 'potion', cost: 250, desc: 'ขว้างใส่ศัตรู/ผู้เล่นใกล้เคียง สร้าง 40 ดาเมจ', icon: '💣' },
  { id: 'item_dispel', name: 'เครื่องรางแก้คำสาป (Dispel Charm)', type: 'potion', cost: 180, desc: 'ลบล้างคำสาปสนิมและสถานะผิดปกติทั้งหมด', icon: '🫙' },
  { id: 'item_recall', name: 'คัมภีร์วาร์ปปราสาท (Castle Recall)', type: 'potion', cost: 220, desc: 'เปิดมิติวาร์ปกลับสู่ปราสาทหลวงทันที', icon: '🚪' },
  { id: 'item_key', name: 'กุญแจเวทมนตร์ (Magic Key)', type: 'potion', cost: 200, desc: 'ปลดล็อกหีบสมบัติและห้องนิรภัยโบราณ', icon: '🗝️' },
  { id: 'item_trap', name: 'กับดักหลุมพราง (Pitfall Trap)', type: 'potion', cost: 240, desc: 'วางกับดักขุดหลุมบนช่องปัจจุบัน ใครเดินเหยียบจะเสีย 30 HP และแต้มเดินครึ่งหนึ่ง!', icon: '🕳️' },
  { id: 'item_warp_mirror', name: 'กระจกสลับตำแหน่ง (Warp Mirror)', type: 'potion', cost: 380, desc: 'สลับตำแหน่งบนกระดานกับคู่แข่งที่มีมูลค่าสุทธิสูงสุดทันที!', icon: '🪞' },
  { id: 'item_lure_whistle', name: 'นกหวีดล่อมอนสเตอร์ (Monster Whistle)', type: 'potion', cost: 320, desc: 'เป่านกหวีดเรียกล่าอสูรเข้าจู่โจมคู่แข่งใกล้เคียง สร้าง 35 ดาเมจและตาบอด 3 เทิร์น!', icon: '📯' },
  { id: 'item_town_seal', name: 'ตราประทับหลวงยึดภาษี (Royal Town Seal)', type: 'potion', cost: 450, desc: 'ใช้อำนาจหลวงขูดรีดภาษี 300G จากเมืองของผู้นำอันดับ 1 เข้ากระเป๋าตนเอง!', icon: '📜' },
  { id: 'item_smoke_bomb', name: 'ระเบิดควันนินจา (Ninja Smoke Bomb)', type: 'potion', cost: 160, desc: 'ปาระเบิดควันพรางตัว รับสถานะล่องหนแคล้วคลาดจากการปะทะ!', icon: '💨' },

  // Weapons (Tiers 1–5: Progressive Scaled Costs)
  { id: 'wpn_broadsword', name: 'T1 ดาบกว้างเหล็กกล้า (Broadsword)', type: 'weapon', cost: 320, atk: 8, desc: 'คมดาบกล้าแกร่งเบื้องต้น (+8 ATK)', icon: '⚔️' },
  { id: 'wpn_mithril_edge', name: 'T2 คมดาบมิธริล (Mithril Edge)', type: 'weapon', cost: 1200, atk: 15, spd: 3, passive: 'gold_steal', desc: 'ดาบเบาและคมกริบ (+15 ATK, +3 SPD) • ขโมยเงิน 8% เมื่อโจมตี', icon: '🗡️' },
  { id: 'wpn_flame_brand', name: 'T3 ดาบเพลิงลาวา (Flame Brand)', type: 'weapon', cost: 4200, atk: 26, mag: 6, passive: 'burn', desc: 'ดาบอาบเปลวเพลิงบริสุทธิ์ (+26 ATK, +6 MAG) • เผาศัตรูเพิ่ม 15% ดาเมจ', icon: '🔥⚔️' },
  { id: 'wpn_excalibur', name: 'T4 เอ็กซ์คาลิเบอร์ (Excalibur)', type: 'weapon', cost: 12500, atk: 42, def: 10, mag: 10, passive: 'vampiric', setName: 'holy_set', desc: 'ดาบเทวะศักดิ์สิทธิ์ (+42 ATK, +10 DEF, +10 MAG) • ดูดเลือด 20% [เซ็ตศักดิ์สิทธิ์]', icon: '🌟⚔️' },
  { id: 'wpn_ragnarok', name: 'T5 ดาบวันสิ้นพิภพ (Ragnarok Blade)', type: 'weapon', cost: 32000, atk: 65, spd: 15, luk: 15, passive: 'curse_strike', desc: 'ดาบโบราณสะท้านภพ (+65 ATK, +15 SPD, +15 LUK) • ติดคำสาปมรณะแก่ศัตรู', icon: '👑⚔️' },

  // Shields (Tiers 1–5: Progressive Scaled Costs)
  { id: 'shd_buckler', name: 'T1 โล่กลมไม้โอ๊ค (Round Buckler)', type: 'shield', cost: 260, def: 6, desc: 'โล่ป้องกันเบื้องต้น (+6 DEF)', icon: '🛡️' },
  { id: 'shd_knight', name: 'T2 โล่อัศวินเหล็กกล้า (Knight Shield)', type: 'shield', cost: 980, def: 14, atk: 3, desc: 'โล่ปะทะกระแทกศัตรู (+14 DEF, +3 ATK)', icon: '🛡️⚔️' },
  { id: 'shd_dragon_scale', name: 'T3 โล่เกล็ดมังกร (Dragon Shield)', type: 'shield', cost: 3600, def: 24, mag: 6, desc: 'เกล็ดมังกรต้านเพลิงและเวทมนตร์ (+24 DEF, +6 MAG)', icon: '🐉🛡️' },
  { id: 'shd_aegis', name: 'T4 โล่เทพีอีจิส (Aegis Holy Guard)', type: 'shield', cost: 10800, def: 38, mag: 12, luk: 8, passive: 'hp_regen', setName: 'holy_set', desc: 'โล่เทวาพิทักษ์กาย (+38 DEF, +12 MAG, +8 LUK) • [เซ็ตศักดิ์สิทธิ์: รีเจน HP]', icon: '✨🛡️' },
  { id: 'shd_divine_mirror', name: 'T5 โล่กระจกสะท้อนสวรรค์ (Mirror Shield)', type: 'shield', cost: 28000, def: 55, mag: 18, spd: 8, passive: 'counter_boost', desc: 'โล่กระจกสะท้อนเวทมนตร์ (+55 DEF, +18 MAG, +8 SPD) • สวนกลับแรงขึ้น 30%', icon: '🪞🛡️' },

  // Armor (Tiers 1–5: Progressive Scaled Costs)
  { id: 'arm_iron_cuirass', name: 'T1 เกราะอกเหล็กกล้า (Iron Cuirass)', type: 'armor', cost: 280, def: 8, desc: 'เกราะเหล็กเนื้อแน่น (+8 DEF)', icon: '🦺' },
  { id: 'arm_mithril_chain', name: 'T2 เสื้อโซ่ถักมิธริล (Mithril Mail)', type: 'armor', cost: 1100, def: 18, spd: 4, desc: 'โซ่ถักน้ำหนักเบาคล่องตัว (+18 DEF, +4 SPD)', icon: '⛓️' },
  { id: 'arm_dragon_scale', name: 'T3 เกราะเกล็ดมังกรเพลิง (Dragon Armor)', type: 'armor', cost: 3900, def: 30, atk: 6, desc: 'เกราะเกล็ดหลอมลาวา (+30 DEF, +6 ATK)', icon: '🐲🦺' },
  { id: 'arm_goddess_robe', name: 'T4 เสื้อคลุมเทพีมนตรา (Goddess Robe)', type: 'armor', cost: 11500, def: 42, mag: 16, luk: 10, passive: 'mp_regen', setName: 'holy_set', desc: 'ผ้าไหมสวรรค์ทอด้วยมานา (+42 DEF, +16 MAG, +10 LUK) • [เซ็ตศักดิ์สิทธิ์]', icon: '👘✨' },
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
  { id: 'spell_poison_dart', name: 'ลูกดอกพิษ (Poison Dart)', type: 'spell', cost: 340, desc: 'ยิงพิษใส่เป้าหมาย ติดสถานะ Poison 4 เทิร์น เสียเลือดเรื่อย ๆ', icon: '☠️' },
  { id: 'spell_blizzard', name: 'พายุเยือกแข็ง (Frost Freeze)', type: 'spell', cost: 420, desc: 'แช่แข็งคู่แข่ง ติดสถานะ Freeze 2 เทิร์น ทอยเต๋าได้แค่ 1 แต้ม!', icon: '❄️' },
  { id: 'spell_blind', name: 'หมอกบอดตา (Flash Blind)', type: 'spell', cost: 360, desc: 'สาดแสงจ้าใส่เป้าหมาย ตาบอด 3 เทิร์น โจมตีพลาด 40% ในการต่อสู้', icon: '👁️' },
  { id: 'spell_assassin_hit', name: 'สัญญาจ้างนักฆ่า (Assassin Contract)', type: 'spell', cost: 750, desc: 'ส่งนักฆ่าลอบโจมตีผู้เล่นอันดับ 1 ชิงเงิน 35% และส่งกลับบ้าน!', icon: '🥷' },
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
    document.getElementById('btnShopTabForge')?.addEventListener('click', () => {
      audio.click();
      this.renderList('forge');
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

  private renderList(mode: 'buy' | 'sell' | 'forge') {
    const p = this.game.activePlayer;
    document.getElementById('shopPlayerGold')!.innerText = `${p.gold}G`;
    const container = document.getElementById('shopItemList')!;
    container.innerHTML = '';

    // Tab button visual styles
    const tabBuy = document.getElementById('btnShopTabBuy');
    const tabSell = document.getElementById('btnShopTabSell');
    const tabForge = document.getElementById('btnShopTabForge');
    if (tabBuy && tabSell && tabForge) {
      tabBuy.className = mode === 'buy' ? 'pixel-btn pixel-btn-gold px-3.5 py-1 text-xs font-bold text-slate-950' : 'pixel-btn px-3.5 py-1 text-xs text-slate-300';
      tabSell.className = mode === 'sell' ? 'pixel-btn pixel-btn-gold px-3.5 py-1 text-xs font-bold text-slate-950' : 'pixel-btn px-3.5 py-1 text-xs text-slate-300';
      tabForge.className = mode === 'forge' ? 'pixel-btn pixel-btn-red px-3.5 py-1 text-xs font-bold text-white' : 'pixel-btn px-3.5 py-1 text-xs text-slate-300';
    }

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
    } else if (mode === 'sell') {
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
    } else if (mode === 'forge') {
      // Forge & Enchant
      const wpn = p.equipment.weapon;
      const wpnName = wpn ? wpn.name : 'หมัดเปล่า (Bare Fists)';
      const forgeCost = 250 * (p.weaponUpgradeLevel + 1);
      const isMaxForge = p.weaponUpgradeLevel >= 9;

      const runeLabels: Record<string, { name: string; icon: string; desc: string }> = {
        fire: { name: 'เพลิงกัลป์', icon: '🔥', desc: 'เผาผลาญศัตรู (Burn DOT)' },
        ice: { name: 'เหมันต์นิรันดร์', icon: '❄️', desc: 'ขัดขวางท่าเคาน์เตอร์ (Freeze)' },
        thunder: { name: 'สายฟ้าสวรรค์', icon: '⚡', desc: 'ช็อตอัมพาต (Shock Paralysis)' },
        poison: { name: 'พิษมรณะ', icon: '☠️', desc: 'กัดกร่อนต่อเนื่อง (Poison DOT)' }
      };

      const forgeBox = document.createElement('div');
      forgeBox.className = 'pixel-box p-3 bg-slate-900 border-amber-600/50 flex flex-col gap-3';
      forgeBox.innerHTML = `
        <div class="border-b border-slate-800 pb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${wpn?.icon || '👊'}</span>
            <div>
              <div class="text-xs font-bold text-amber-300">${wpnName} <span class="text-rose-400 font-bold">+${p.weaponUpgradeLevel}</span></div>
              <div class="text-[9px] text-slate-400">โบนัสจากการตีบวก: +${p.weaponUpgradeLevel * 3} ATK, +${p.weaponUpgradeLevel} SPD</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-slate-400">รูนปัจจุบัน:</div>
            <div class="text-xs font-bold text-cyan-300">${p.weaponRune ? `${runeLabels[p.weaponRune]?.icon} ${runeLabels[p.weaponRune]?.name}` : 'ยังไม่ได้สลัก'}</div>
          </div>
        </div>

        <!-- Reinforce Button -->
        <div class="flex items-center justify-between bg-slate-950 p-2.5 border border-slate-800">
          <div>
            <div class="text-xs font-bold text-white">ตีบวกเพิ่มความแกร่ง (+1)</div>
            <div class="text-[9px] text-slate-400">${isMaxForge ? 'ถึงระดับสูงสุดแล้ว (+9)' : `เพิ่ม +3 ATK และ +1 SPD (ค่าบริการ ${forgeCost}G)`}</div>
          </div>
          <button id="btnDoForge" class="pixel-btn ${isMaxForge ? 'opacity-50 cursor-not-allowed' : 'pixel-btn-gold'} px-3 py-1 text-xs font-bold text-slate-950" ${isMaxForge ? 'disabled' : ''}>
            ${isMaxForge ? 'MAX (+9)' : `ตีบวก (${forgeCost}G)`}
          </button>
        </div>

        <!-- Rune Enchantment Section -->
        <div>
          <div class="text-xs font-bold text-amber-300 mb-1.5">🔮 สลักอักขระรูนธาตุ (Enchantment: 450G)</div>
          <div class="grid grid-cols-2 gap-2">
            <button id="btnRuneFire" class="pixel-btn pixel-btn-red p-2 text-left flex flex-col text-white">
              <span class="text-xs font-bold">🔥 รูนเพลิง (Fire)</span>
              <span class="text-[9px] text-rose-200">เผาไหม้เสียเลือดทุกเทิร์น</span>
            </button>
            <button id="btnRuneIce" class="pixel-btn pixel-btn-blue p-2 text-left flex flex-col text-white">
              <span class="text-xs font-bold">❄️ รูนเหมันต์ (Ice)</span>
              <span class="text-[9px] text-cyan-200">แช่แข็ง ขัดขวางท่าสวนกลับ</span>
            </button>
            <button id="btnRuneThunder" class="pixel-btn pixel-btn-gold p-2 text-left flex flex-col text-slate-950">
              <span class="text-xs font-bold">⚡ รูนสายฟ้า (Thunder)</span>
              <span class="text-[9px] text-amber-950">โอกาสช็อตทำให้ศัตรูเสียเทิร์น</span>
            </button>
            <button id="btnRunePoison" class="pixel-btn pixel-btn-green p-2 text-left flex flex-col text-white">
              <span class="text-xs font-bold">☠️ รูนพิษ (Poison)</span>
              <span class="text-[9px] text-emerald-200">ติดพิษลดเลือดรวดเร็ว</span>
            </button>
          </div>
        </div>
      `;

      forgeBox.querySelector('#btnDoForge')?.addEventListener('click', () => {
        if (p.weaponUpgradeLevel >= 9) return;
        if (p.gold < forgeCost) {
          this.game.addLog(`ช่างตีเหล็ก: "เจ้ามีทองไม่พอตีบวก! ต้องการ ${forgeCost}G"`);
          return;
        }
        p.gold -= forgeCost;
        p.weaponUpgradeLevel++;
        audio.anvilStrike();
        this.game.addLog(`🔨 ไอรอนฟอร์จ: ${p.displayName} ตีบวก ${wpnName} เป็นระดับ +${p.weaponUpgradeLevel} สำเร็จ! (+3 ATK, +1 SPD)`, 'level');
        this.renderList('forge');
      });

      const applyRune = (rune: 'fire' | 'ice' | 'thunder' | 'poison', runeName: string) => {
        const cost = 450;
        if (p.gold < cost) {
          this.game.addLog(`จอมอาคม: "เจ้ามีทองไม่พอสลักรูน! ต้องการ ${cost}G"`);
          return;
        }
        p.gold -= cost;
        p.weaponRune = rune;
        audio.anvilStrike();
        audio.relicChime();
        this.game.addLog(`✨ สลักรูนสำเร็จ! อาวุธของ ${p.displayName} อาบพลัง [${runeName}] พร้อมแผดเผาศัตรูในสนามรบ!`, 'level');
        this.renderList('forge');
      };

      forgeBox.querySelector('#btnRuneFire')?.addEventListener('click', () => applyRune('fire', 'เพลิงกัลป์'));
      forgeBox.querySelector('#btnRuneIce')?.addEventListener('click', () => applyRune('ice', 'เหมันต์นิรันดร์'));
      forgeBox.querySelector('#btnRuneThunder')?.addEventListener('click', () => applyRune('thunder', 'สายฟ้าสวรรค์'));
      forgeBox.querySelector('#btnRunePoison')?.addEventListener('click', () => applyRune('poison', 'พิษมรณะ'));

      container.appendChild(forgeBox);
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
