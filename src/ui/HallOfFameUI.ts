import { Player } from '../game/Player';
import { audio } from '../engine/AudioSynthesizer';
import { escapeHtml } from '../util/Html';

export interface ChampionRecord {
  id: string;
  playerName: string;
  playerClass: string;
  avatar: string;
  date: string;
  netWorth: number;
  gold: number;
  towns: number;
  monstersKilled: number;
  pvpWins: number;
  victoryReason: string;
  isAI: boolean;
}

export interface TrophyRecord {
  id: string;
  title: string;
  icon: string;
  desc: string;
  unlocked: boolean;
  unlockedDate?: string;
}

const DEFAULT_TROPHIES: TrophyRecord[] = [
  {
    id: 'FIRST_CROWN',
    title: 'ราชาผู้พิชิต (Crown of Sovereignty)',
    icon: '👑',
    desc: 'คว้าชัยชนะครองราชบัลลังก์แห่งฟอร์จูน่าสำเร็จ 1 ครั้ง',
    unlocked: false
  },
  {
    id: 'RICH_LORD',
    title: 'มหาเศรษฐีแห่งฟอร์จูน่า (Magnate of Fortuna)',
    icon: '💎',
    desc: 'มีมูลค่าทรัพย์สินสุทธิ (Net Worth) มากกว่า 8,000G ในการแข่งขัน',
    unlocked: false
  },
  {
    id: 'TOWN_CONQUEROR',
    title: 'เจ้าที่ดินรายใหญ่ (Territory Overlord)',
    icon: '🏰',
    desc: 'ครอบครองเมืองพร้อมกันตั้งแต่ 4 เมืองขึ้นไป',
    unlocked: false
  },
  {
    id: 'CASINO_MASTER',
    title: 'เซียนคาสิโนริโก้ (Rico\'s High Roller)',
    icon: '🎰',
    desc: 'กวาดเงินรางวัลจากมินิเกม High-Low หรือ Roulette เกิน 1,000G',
    unlocked: false
  },
  {
    id: 'MONSTER_HUNTER',
    title: 'นักล่าอสูรผู้ไร้ปรานี (Monster Slayer)',
    icon: '⚔️',
    desc: 'กำราบมอนสเตอร์และบอสทั่วทั้งทวีปเกิน 5 ตัวในการแข่งขันเดียว',
    unlocked: false
  },
  {
    id: 'DUNGEON_CRAWLER',
    title: 'ผู้พิชิตสุสานใต้พิภพ (Catacombs Conqueror)',
    icon: '🌀',
    desc: 'บุกตะลุยและเอาชีวิตรอดกลับมาจากสุสานโบราณใต้พิภพ (Catacombs)',
    unlocked: false
  },
  {
    id: 'PRANK_GOD',
    title: 'จอมป่วนแห่งราชสำนัก (Master Prankster)',
    icon: '🎭',
    desc: 'กลั่นแกล้งหรือขโมยของจากคู่แข่งสำเร็จตั้งแต่ 2 ครั้งขึ้นไป',
    unlocked: false
  }
];

export class HallOfFameUI {
  private modal: HTMLElement;
  private champions: ChampionRecord[] = [];
  private trophies: TrophyRecord[] = [];

  constructor() {
    this.loadData();

    let el = document.getElementById('hallOfFameModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hallOfFameModal';
      el.className = 'hidden fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 pointer-events-auto select-none';
      document.body.appendChild(el);
    }
    this.modal = el;
  }

  private loadData(): void {
    try {
      const champRaw = localStorage.getItem('chronicles_champions');
      if (champRaw) {
        this.champions = JSON.parse(champRaw);
      } else {
        // Sample historic champions
        this.champions = [
          {
            id: 'legacy_1',
            playerName: 'Lord Alistair',
            playerClass: 'Warrior',
            avatar: '🛡️',
            date: '2026-09-20',
            netWorth: 14500,
            gold: 4200,
            towns: 8,
            monstersKilled: 12,
            pvpWins: 5,
            victoryReason: 'สังหาร Dragon Princess Ignis',
            isAI: false
          }
        ];
      }

      const trophyRaw = localStorage.getItem('chronicles_trophies');
      if (trophyRaw) {
        const saved: Record<string, { unlocked: boolean; unlockedDate?: string }> = JSON.parse(trophyRaw);
        this.trophies = DEFAULT_TROPHIES.map(t => ({
          ...t,
          unlocked: !!saved[t.id]?.unlocked,
          unlockedDate: saved[t.id]?.unlockedDate
        }));
      } else {
        this.trophies = [...DEFAULT_TROPHIES];
      }
    } catch {
      this.champions = [];
      this.trophies = [...DEFAULT_TROPHIES];
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('chronicles_champions', JSON.stringify(this.champions));
      const trophyState: Record<string, { unlocked: boolean; unlockedDate?: string }> = {};
      this.trophies.forEach(t => {
        trophyState[t.id] = { unlocked: t.unlocked, unlockedDate: t.unlockedDate };
      });
      localStorage.setItem('chronicles_trophies', JSON.stringify(trophyState));
    } catch {
      // Storage unavailable or disabled
    }
  }

  recordVictory(winner: Player, netWorth: number, victoryReason: string): void {
    const today = new Date().toISOString().split('T')[0];
    const rec: ChampionRecord = {
      id: 'champ_' + Date.now(),
      playerName: winner.displayName,
      playerClass: winner.className,
      avatar: winner.classKey === 'warrior' ? '🛡️' : winner.classKey === 'magician' ? '🔮' : winner.classKey === 'thief' ? '🗡️' : winner.classKey === 'cleric' ? '⛪' : '⚔️',
      date: today,
      netWorth,
      gold: winner.gold,
      towns: winner.townsControlled,
      monstersKilled: winner.matchStats.monstersKilled,
      pvpWins: winner.matchStats.pvpWins,
      victoryReason,
      isAI: winner.isAI
    };

    this.champions.unshift(rec);
    if (this.champions.length > 20) this.champions.pop();

    // Check Trophies
    this.unlockTrophy('FIRST_CROWN');
    if (netWorth >= 8000) this.unlockTrophy('RICH_LORD');
    if (winner.townsControlled >= 4) this.unlockTrophy('TOWN_CONQUEROR');
    if (winner.matchStats.monstersKilled >= 5) this.unlockTrophy('MONSTER_HUNTER');
    if (winner.matchStats.pranksGiven >= 2) this.unlockTrophy('PRANK_GOD');

    this.saveData();
  }

  unlockTrophy(trophyId: string): void {
    const t = this.trophies.find(x => x.id === trophyId);
    if (t && !t.unlocked) {
      t.unlocked = true;
      t.unlockedDate = new Date().toISOString().split('T')[0];
      this.saveData();
    }
  }

  open(): void {
    audio.click();
    this.render('champions');
    this.modal.classList.remove('hidden');
  }

  close(): void {
    audio.click();
    this.modal.classList.add('hidden');
  }

  private render(activeTab: 'champions' | 'trophies'): void {
    const unlockedCount = this.trophies.filter(t => t.unlocked).length;

    this.modal.innerHTML = `
      <div class="pixel-box-gold max-w-[95vw] sm:max-w-2xl w-full p-4 sm:p-5 relative flex flex-col max-h-[92vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center pixel-head pb-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl sm:text-2xl animate-bounce">🏛️</span>
            <div>
              <h2 class="text-xs sm:text-sm font-bold text-amber-300">หอเกียรติยศแห่งราชอาณาจักร (Hall of Fame)</h2>
              <p class="text-[9px] sm:text-[10px] text-slate-400">จารึกเกียรติยศแด่ผู้พิชิตและถ้วยรางวัลความสำเร็จตลอดกาล</p>
            </div>
          </div>
          <button id="btnCloseHof" class="pixel-btn pixel-btn-red px-2.5 py-1 text-xs font-bold">✖ ปิด</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex gap-2 mb-3">
          <button id="tabHofChampions" class="pixel-btn ${activeTab === 'champions' ? 'pixel-btn-gold text-slate-950 font-bold' : 'text-slate-300'} px-3 py-1.5 text-xs flex-1">
            🏆 ทำเนียบแชมเปี้ยน (${this.champions.length})
          </button>
          <button id="tabHofTrophies" class="pixel-btn ${activeTab === 'trophies' ? 'pixel-btn-gold text-slate-950 font-bold' : 'text-slate-300'} px-3 py-1.5 text-xs flex-1">
            🎖️ ถ้วยรางวัลแห่งตำนาน (${unlockedCount}/${this.trophies.length})
          </button>
        </div>

        <!-- Content Area -->
        <div id="hofContentPanel" class="flex flex-col gap-2 min-h-[250px] overflow-y-auto max-h-[60vh] pr-1">
          ${activeTab === 'champions' ? this.renderChampionsList() : this.renderTrophiesList()}
        </div>
      </div>
    `;

    document.getElementById('btnCloseHof')?.addEventListener('click', () => this.close());
    document.getElementById('tabHofChampions')?.addEventListener('click', () => {
      audio.click();
      this.render('champions');
    });
    document.getElementById('tabHofTrophies')?.addEventListener('click', () => {
      audio.click();
      this.render('trophies');
    });
  }

  private renderChampionsList(): string {
    if (this.champions.length === 0) {
      return `
        <div class="p-6 text-center text-slate-500 text-xs">
          ยังไม่มีผู้ครอบครองบัลลังก์ในการบันทึก เริ่มเกมใหม่เพื่อจารึกชื่อของคุณ!
        </div>
      `;
    }

    return this.champions.map((c, i) => `
      <div class="p-3 bg-slate-950/90 border ${i === 0 ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'} flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-slate-900 border ${i === 0 ? 'border-amber-400 text-amber-300' : 'border-slate-700 text-slate-300'} flex items-center justify-center font-bold text-sm shrink-0">
            ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-sm">${c.avatar}</span>
              <strong class="text-amber-300 text-xs sm:text-sm">${escapeHtml(c.playerName)}</strong>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">${escapeHtml(c.playerClass)}</span>
              ${c.isAI ? '<span class="text-[8px] px-1 bg-indigo-950 border border-indigo-700 text-indigo-300">BOT</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">
              ${escapeHtml(c.victoryReason)} • ${c.date}
            </div>
          </div>
        </div>

        <div class="flex flex-col items-end shrink-0 text-right">
          <span class="text-emerald-400 font-bold text-xs sm:text-sm">💎 ${c.netWorth.toLocaleString()}G</span>
          <span class="text-[10px] text-slate-400">🏰 ${c.towns} เมือง • ⚔️ ${c.monstersKilled} อสูร</span>
        </div>
      </div>
    `).join('');
  }

  private renderTrophiesList(): string {
    return this.trophies.map(t => `
      <div class="p-3 bg-slate-950/90 border ${t.unlocked ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800 opacity-60'} flex items-center gap-3 text-xs">
        <div class="w-10 h-10 rounded border ${t.unlocked ? 'border-amber-400 bg-amber-500/20 text-2xl' : 'border-slate-700 bg-slate-900 text-xl grayscale'} flex items-center justify-center shrink-0">
          ${t.icon}
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <strong class="${t.unlocked ? 'text-amber-300' : 'text-slate-400'} text-xs font-bold">${t.title}</strong>
            <span class="text-[9px] font-bold ${t.unlocked ? 'text-emerald-400' : 'text-slate-500'}">
              ${t.unlocked ? `ปลดล็อกแล้ว (${t.unlockedDate})` : '🔒 ยังไม่ปลดล็อก'}
            </span>
          </div>
          <p class="text-[10px] text-slate-400 mt-0.5 leading-relaxed">${t.desc}</p>
        </div>
      </div>
    `).join('');
  }
}

export const hallOfFameUI = new HallOfFameUI();
