import { GameState } from '../game/GameState';
import { EquipmentItem } from '../engine/PixelSpriteGenerator';
import { audio } from '../engine/AudioSynthesizer';
import { trpgAssets } from '../engine/TRPGAssetLoader';

export const SHOP_CATALOG: EquipmentItem[] = [
  // Consumables & Multi-Spinners
  { id: 'spin_2', name: '2-Spinner', type: 'spinner', cost: 60, desc: 'Roll 2 Dice on next turn!', icon: '🎲' },
  { id: 'spin_3', name: '3-Spinner', type: 'spinner', cost: 120, desc: 'Roll 3 Dice on next turn!', icon: '🌀' },
  { id: 'pot_hp', name: 'Life Potion', type: 'potion', cost: 35, desc: 'Restores 50 HP', icon: '🧪' },
  { id: 'pot_elixir', name: 'Full Elixir', type: 'potion', cost: 110, desc: 'Full restoration of HP & MP', icon: '🏺' },
  { id: 'item_key', name: 'Magic Key', type: 'potion', cost: 75, desc: 'Unlocks ancient locked vaults', icon: '🗝️' },

  // Weapons & Armor
  { id: 'eq_sword', name: 'Tempered Broadsword', type: 'weapon', cost: 130, atk: 8, desc: 'Sharp steel blade (+8 ATK)', icon: '⚔️' },
  { id: 'eq_axe', name: 'Battle Axe', type: 'weapon', cost: 170, atk: 14, spd: -2, desc: 'Crushing cleave (+14 ATK, -2 SPD)', icon: '🪓' },
  { id: 'eq_daggers', name: 'Shadow Daggers', type: 'weapon', cost: 140, atk: 6, spd: 6, desc: 'Agile dual blades (+6 ATK, +6 SPD)', icon: '🗡️' },
  { id: 'eq_plate', name: 'Iron Cuirass', type: 'armor', cost: 130, def: 10, desc: 'Solid forged steel (+10 DEF)', icon: '🦺' },
  { id: 'eq_robe', name: 'Astral Robe', type: 'armor', cost: 140, def: 5, mag: 9, desc: 'Weaves mana shield (+5 DEF, +9 MAG)', icon: '👘' },
  { id: 'eq_ring', name: 'Fortune Band', type: 'accessory', cost: 160, luk: 10, desc: 'Favored by Lady Luck (+10 LUK)', icon: '💍' },

  // Field Magic Spells
  { id: 'spell_zap', name: 'Field Zap', type: 'spell', cost: 80, desc: 'Cast lightning across the map dealing 35 dmg to a rival', icon: '⚡' },
  { id: 'spell_swap', name: 'Warp Swap', type: 'spell', cost: 110, desc: 'Instantly swap positions with the furthest rival', icon: '🌀' }
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

    if (type === 'shop_weapon') title.innerText = 'IRONFORGE WEAPONS & ARMOR';
    else if (type === 'shop_magic') title.innerText = 'ARCANE MAGIC EMPORIUM';
    else title.innerText = 'CONTINENTAL GOODS & SPINNERS';

    // Render 2.5D Isometric Shop Interior Diorama
    const canvas = document.getElementById('shopDioramaCanvas') as HTMLCanvasElement;
    if (canvas) {
      trpgAssets.renderShopInteriorDiorama(canvas, type);
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
            this.game.addLog(`AI ${p.displayName} bought a 2-Spinner!`, 'gold');
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
            <span>BUY</span>
            <span>${item.cost}G</span>
          </button>
        `;

        row.querySelector('button')!.onclick = () => {
          if (p.gold < item.cost) {
            this.game.addLog(`${p.displayName} cannot afford ${item.name}!`);
            return;
          }
          if (p.inventory.length >= 12) {
            this.game.addLog(`Satchel full! Cannot hold more items.`);
            return;
          }
          p.gold -= item.cost;
          p.inventory.push({ ...item });
          audio.coin();
          this.game.addLog(`🛒 ${p.displayName} purchased ${item.name}!`, 'gold');
          this.renderList('buy');
        };

        container.appendChild(row);
      });
    } else {
      // Sell
      if (p.inventory.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 text-center py-6">Your satchel is empty.</div>`;
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
              <div class="text-[9px] text-slate-400">Sell: ${sellVal}G</div>
            </div>
          </div>
          <button class="pixel-btn px-3 py-1 text-xs text-amber-400 font-bold">
            SELL (+${sellVal}G)
          </button>
        `;

        row.querySelector('button')!.onclick = () => {
          p.gold += sellVal;
          p.inventory.splice(idx, 1);
          audio.coin();
          this.game.addLog(`Sold ${item.name} for ${sellVal}G!`, 'gold');
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
}
