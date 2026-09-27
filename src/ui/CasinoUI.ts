import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from '../game/RoyalDecreeSystem';

export class CasinoUI {
  private game: GameState;
  private modal: HTMLElement;
  private currentPlayer: Player | null = null;
  private onFinishedCallback?: () => void;

  // High-Low Game State
  private hlBet = 50;
  private hlCurrentCard = 7;
  private hlMultiplier = 1.0;
  private hlStreak = 0;
  private hlActive = false;

  // Roulette Game State
  private rouletteBet = 50;
  private rouletteChosenColor: 'red' | 'blue' | 'gold' | 'skull' = 'red';
  private rouletteSpinning = false;

  // Colosseum Game State
  private colosseumBet = 100;
  private selectedFighter = 0;
  private colosseumBattling = false;

  private fighters = [
    { name: '🔥 ไพโรสไลม์', odds: 2.5, weight: 40 },
    { name: '💀 อัศวินโครงกระดูก', odds: 3.5, weight: 28 },
    { name: '🐺 หมาป่าเหมันต์', odds: 5.0, weight: 20 },
    { name: '👑 ก็อบลินจอมทัพ', odds: 8.0, weight: 12 },
  ];

  constructor(game: GameState) {
    this.game = game;

    let el = document.getElementById('casinoModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'casinoModal';
      el.className = 'hidden fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 pointer-events-auto select-none';
      document.body.appendChild(el);
    }
    this.modal = el;
  }

  open(player: Player, onFinished?: () => void) {
    this.currentPlayer = player;
    this.onFinishedCallback = onFinished;
    audio.playBgm('casino');
    this.render();
    this.modal.classList.remove('hidden');

    // AI bot behavior
    if (player.isAI) {
      setTimeout(() => {
        if (player.gold >= this.hlBet) {
          this.handleHighLowGuess(Math.random() > 0.5);
          setTimeout(() => {
            if (this.hlStreak > 0) {
              this.handleHlCashOut();
            }
            setTimeout(() => this.close(), 1000);
          }, 800);
        } else {
          this.close();
        }
      }, 900);
    }
  }

  close() {
    this.modal.classList.add('hidden');
    audio.playBiomeBgm(this.game.activePlayer.nodeId.toString());
    if (this.onFinishedCallback) {
      const cb = this.onFinishedCallback;
      this.onFinishedCallback = undefined;
      cb();
    }
  }

  private render() {
    if (!this.currentPlayer) return;
    const p = this.currentPlayer;

    this.modal.innerHTML = `
      <div class="pixel-box-gold max-w-[95vw] sm:max-w-xl w-full p-4 sm:p-5 relative flex flex-col max-h-[92vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center border-b border-amber-600/40 pb-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl animate-bounce">🎰</span>
            <div>
              <h2 class="text-sm sm:text-base font-bold text-amber-300">คาสิโนพระราชทานแห่งริโก้ (Rico's Grand Casino)</h2>
              <span class="text-[9px] sm:text-[10px] text-slate-400">เสี่ยงโชค พลิกชะตา หรือหมดตัวในพริบตา!</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span id="casinoPlayerGoldText" class="text-xs text-amber-400 font-bold bg-slate-950 px-2 py-1 border border-amber-600/50">
              🪙 ${p.gold}G
            </span>
            <button id="btnCloseCasino" class="pixel-btn pixel-btn-red px-2.5 py-1 text-xs font-bold">✖ ออก</button>
          </div>
        </div>
        <!-- Festival Banner -->
        ${
          royalDecreeSystem.activeDecree.id === 'ROYAL_CASINO_FESTIVAL'
            ? `<div class="mb-3 px-3 py-1.5 bg-pink-950/80 border border-pink-500/50 text-pink-300 text-xs flex items-center justify-between animate-pulse">
                <span>🎪 เทศกาลคาสิโนราชสำนักทำงานอยู่! เงินรางวัล +50%!</span>
                <span class="font-bold text-yellow-300">✨ x1.5 WIN</span>
              </div>`
            : ''
        }

        <!-- Tab Switcher -->
        <div class="flex gap-1.5 sm:gap-2 mb-3">
          <button id="tabCasinoHighLow" class="pixel-btn pixel-btn-gold px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold flex-1">
            🃏 ไฮ-โลการ์ด
          </button>
          <button id="tabCasinoRoulette" class="pixel-btn px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-slate-300 flex-1">
            🎡 วงล้อดวงดาว
          </button>
          <button id="tabCasinoColosseum" class="pixel-btn px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-slate-300 flex-1">
            ⚔️ โคลอสเซียม
          </button>
        </div>

        <!-- GAME 1: HIGH-LOW CARD GAME -->
        <div id="casinoHighLowPanel" class="flex flex-col gap-3">
          <div class="bg-slate-950/90 border border-slate-800 p-3 sm:p-4 text-center">
            <div class="text-[10px] text-amber-300 uppercase tracking-widest mb-1">ไพ่ปัจจุบัน</div>
            <div id="hlCardDisplay" class="w-20 h-28 mx-auto bg-amber-100 border-4 border-amber-800 flex flex-col items-center justify-center text-slate-950 shadow-lg my-2">
              <span id="hlCardSuit" class="text-lg">♠️</span>
              <span id="hlCardValue" class="text-3xl font-extrabold">${this.cardToLabel(this.hlCurrentCard)}</span>
            </div>
            <div class="text-xs text-slate-300 mt-2">
              ตัวคูณสะสม: <strong id="hlMultiplierText" class="text-amber-400 text-sm">x${this.hlMultiplier.toFixed(1)}</strong>
              (ชนะต่อเนื่อง: <span id="hlStreakText" class="text-emerald-400 font-bold">${this.hlStreak}</span> ครั้ง)
            </div>
            <div id="hlPotText" class="text-sm font-bold text-yellow-300 mt-1">
              เงินรางวัลหากถอนตอนนี้: ${Math.round(this.hlBet * this.hlMultiplier)}G
            </div>
          </div>

          <!-- Controls -->
          <div class="grid grid-cols-2 gap-2">
            <button id="btnHlHigher" class="pixel-btn pixel-btn-green py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
              <span>🔼 สูงกว่า (Higher)</span>
            </button>
            <button id="btnHlLower" class="pixel-btn pixel-btn-red py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
              <span>🔽 ต่ำกว่า (Lower)</span>
            </button>
          </div>

          <div class="flex items-center justify-between bg-slate-900 p-2.5 border border-slate-800 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">เงินเดิมพัน:</span>
              <button class="hl-bet-btn pixel-btn px-2 py-0.5 text-[10px]" data-bet="30">30G</button>
              <button class="hl-bet-btn pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px] text-slate-950 font-bold" data-bet="50">50G</button>
              <button class="hl-bet-btn pixel-btn px-2 py-0.5 text-[10px]" data-bet="100">100G</button>
            </div>
            <button id="btnHlCashOut" class="pixel-btn pixel-btn-gold px-4 py-1.5 text-xs font-bold text-slate-950" ${this.hlStreak === 0 ? 'disabled' : ''}>
              💰 ถอนเงิน (${Math.round(this.hlBet * this.hlMultiplier)}G)
            </button>
          </div>
          <div id="hlMessage" class="text-center text-xs font-bold min-h-[1.25rem] text-amber-300"></div>
        </div>

        <!-- GAME 2: FORTUNA LUCKY ROULETTE -->
        <div id="casinoRoulettePanel" class="hidden flex flex-col gap-3">
          <div class="bg-slate-950/90 border border-slate-800 p-4 text-center">
            <div class="text-[10px] text-amber-300 uppercase tracking-widest mb-1">วงล้อหมุนกงล้อโชค</div>
            <div id="rouletteWheel" class="w-28 h-28 mx-auto rounded-none border-4 border-amber-500 bg-slate-900 flex items-center justify-center my-3 relative overflow-hidden">
              <div id="roulettePointer" class="text-4xl">⭐</div>
            </div>
            <div id="rouletteResultText" class="text-xs text-slate-300 min-h-[1.5rem] font-bold">
              เลือกสีเป้าหมายและกดหมุนวงล้อ!
            </div>
          </div>

          <!-- Color Bets -->
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <button class="roulette-choice-btn pixel-btn pixel-btn-red py-2 font-bold" data-color="red">
              🔴 สีแดง (x2)
            </button>
            <button class="roulette-choice-btn pixel-btn pixel-btn-blue py-2 font-bold" data-color="blue">
              🔵 สีน้ำเงิน (x2)
            </button>
            <button class="roulette-choice-btn pixel-btn pixel-btn-gold py-2 font-bold text-slate-950" data-color="gold">
              ⭐ ดาวทอง (x5)
            </button>
          </div>

          <div class="flex items-center justify-between bg-slate-900 p-2.5 border border-slate-800 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">เงินเดิมพัน:</span>
              <button class="r-bet-btn pixel-btn px-2 py-0.5 text-[10px]" data-bet="30">30G</button>
              <button class="r-bet-btn pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px] text-slate-950 font-bold" data-bet="50">50G</button>
              <button class="r-bet-btn pixel-btn px-2 py-0.5 text-[10px]" data-bet="100">100G</button>
            </div>
            <button id="btnSpinRoulette" class="pixel-btn pixel-btn-gold px-5 py-2 text-xs font-bold text-slate-950">
              🎲 เสี่ยงทายหมุน!
            </button>
          </div>
        </div>

        <!-- GAME 3: MONSTER COLOSSEUM -->
        <div id="casinoColosseumPanel" class="hidden flex flex-col gap-3">
          <div class="bg-slate-950/90 border border-slate-800 p-3 text-center">
            <div class="text-[10px] text-amber-300 uppercase tracking-widest mb-1">สนามประลองอสูรกลาดิเอเตอร์</div>
            <div id="colosseumArenaArena" class="p-3 bg-slate-900 border border-amber-600/40 my-2 text-xs min-h-[5rem] flex items-center justify-center font-bold text-amber-200">
              เลือกมอนสเตอร์นักสู้ที่ท่านเชื่อมั่น แล้วเริ่มการประลอง!
            </div>
          </div>

          <!-- Gladiator Selection Cards -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button class="colosseum-choice-btn pixel-btn pixel-btn-red p-2 flex flex-col text-left font-bold" data-fighter="0">
              <div class="flex justify-between">
                <span>🔥 ไพโรสไลม์</span>
                <span class="text-yellow-300">x2.5</span>
              </div>
              <span class="text-[9px] text-rose-200">HP 120 / ATK 35 • สายถึกสมดุล</span>
            </button>
            <button class="colosseum-choice-btn pixel-btn p-2 flex flex-col text-left font-bold text-slate-300" data-fighter="1">
              <div class="flex justify-between">
                <span>💀 อัศวินโครงกระดูก</span>
                <span class="text-yellow-300">x3.5</span>
              </div>
              <span class="text-[9px] text-slate-400">HP 100 / ATK 45 • ดาบกระดูก</span>
            </button>
            <button class="colosseum-choice-btn pixel-btn p-2 flex flex-col text-left font-bold text-slate-300" data-fighter="2">
              <div class="flex justify-between">
                <span>🐺 หมาป่าเหมันต์</span>
                <span class="text-yellow-300">x5.0</span>
              </div>
              <span class="text-[9px] text-slate-400">HP 80 / ATK 60 • ว่องไวสังหาร</span>
            </button>
            <button class="colosseum-choice-btn pixel-btn p-2 flex flex-col text-left font-bold text-slate-300" data-fighter="3">
              <div class="flex justify-between">
                <span>👑 ก็อบลินจอมทัพ</span>
                <span class="text-yellow-300">x8.0</span>
              </div>
              <span class="text-[9px] text-slate-400">HP 60 / ATK 85 • บ้าคลั่งตัวคูณสูง!</span>
            </button>
          </div>

          <div class="flex items-center justify-between bg-slate-900 p-2.5 border border-slate-800 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">เดิมพัน:</span>
              <button class="c-bet-btn pixel-btn px-2 py-0.5 text-[10px]" data-bet="50">50G</button>
              <button class="c-bet-btn pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px] text-slate-950 font-bold" data-bet="100">100G</button>
              <button class="c-bet-btn pixel-btn px-2 py-0.5 text-[10px]" data-bet="250">250G</button>
            </div>
            <button id="btnStartColosseum" class="pixel-btn pixel-btn-gold px-4 py-2 text-xs font-bold text-slate-950">
              ⚔️ เริ่มเดิมพันประลอง!
            </button>
          </div>
        </div>
      </div>
      </div>
    `;

    this.bindEvents();
  }

  private cardToLabel(val: number): string {
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return val.toString();
  }

  private bindEvents() {
    const p = this.currentPlayer;
    if (!p) return;

    document.getElementById('btnCloseCasino')?.addEventListener('click', () => {
      audio.click();
      this.close();
    });

    // Tab buttons
    const tabHl = document.getElementById('tabCasinoHighLow');
    const tabR = document.getElementById('tabCasinoRoulette');
    const tabCol = document.getElementById('tabCasinoColosseum');
    const panelHl = document.getElementById('casinoHighLowPanel');
    const panelR = document.getElementById('casinoRoulettePanel');
    const panelCol = document.getElementById('casinoColosseumPanel');

    const activateTab = (activeBtn: HTMLElement | null, activePanel: HTMLElement | null) => {
      [tabHl, tabR, tabCol].forEach(b => {
        b?.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold');
        b?.classList.add('text-slate-300');
      });
      [panelHl, panelR, panelCol].forEach(pan => pan?.classList.add('hidden'));

      activeBtn?.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
      activeBtn?.classList.remove('text-slate-300');
      activePanel?.classList.remove('hidden');
    };

    tabHl?.addEventListener('click', () => {
      audio.click();
      activateTab(tabHl, panelHl);
    });

    tabR?.addEventListener('click', () => {
      audio.click();
      activateTab(tabR, panelR);
    });

    tabCol?.addEventListener('click', () => {
      audio.click();
      activateTab(tabCol, panelCol);
    });

    // High-low bet buttons
    document.querySelectorAll('.hl-bet-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        if (this.hlActive && this.hlStreak > 0) return;
        audio.click();
        document.querySelectorAll('.hl-bet-btn').forEach(b => b.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold'));
        const t = e.currentTarget as HTMLElement;
        t.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
        this.hlBet = parseInt(t.dataset.bet || '50', 10);
        this.updateHlDisplay();
      });
    });

    // High / Low guess
    document.getElementById('btnHlHigher')?.addEventListener('click', () => this.handleHighLowGuess(true));
    document.getElementById('btnHlLower')?.addEventListener('click', () => this.handleHighLowGuess(false));

    // Cash out
    document.getElementById('btnHlCashOut')?.addEventListener('click', () => this.handleHlCashOut());

    // Roulette choices
    document.querySelectorAll('.roulette-choice-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        audio.click();
        document.querySelectorAll('.roulette-choice-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'));
        const t = e.currentTarget as HTMLElement;
        t.classList.add('ring-2', 'ring-white');
        this.rouletteChosenColor = (t.dataset.color as any) || 'red';
      });
    });

    // Roulette bet buttons
    document.querySelectorAll('.r-bet-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        audio.click();
        document.querySelectorAll('.r-bet-btn').forEach(b => b.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold'));
        const t = e.currentTarget as HTMLElement;
        t.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
        this.rouletteBet = parseInt(t.dataset.bet || '50', 10);
      });
    });

    // Roulette spin
    document.getElementById('btnSpinRoulette')?.addEventListener('click', () => this.handleSpinRoulette());

    // Colosseum fighter selection
    document.querySelectorAll('.colosseum-choice-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        if (this.colosseumBattling) return;
        audio.click();
        document.querySelectorAll('.colosseum-choice-btn').forEach(b => {
          b.classList.remove('pixel-btn-red');
          b.classList.add('text-slate-300');
        });
        const t = e.currentTarget as HTMLElement;
        t.classList.remove('text-slate-300');
        t.classList.add('pixel-btn-red');
        this.selectedFighter = parseInt(t.dataset.fighter || '0', 10);
      });
    });

    // Colosseum bet buttons
    document.querySelectorAll('.c-bet-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        if (this.colosseumBattling) return;
        audio.click();
        document.querySelectorAll('.c-bet-btn').forEach(b => b.classList.remove('pixel-btn-gold', 'text-slate-950', 'font-bold'));
        const t = e.currentTarget as HTMLElement;
        t.classList.add('pixel-btn-gold', 'text-slate-950', 'font-bold');
        this.colosseumBet = parseInt(t.dataset.bet || '100', 10);
      });
    });

    // Colosseum start brawl
    document.getElementById('btnStartColosseum')?.addEventListener('click', () => this.handleStartColosseum());
  }

  private handleHighLowGuess(guessHigher: boolean) {
    const p = this.currentPlayer;
    if (!p) return;

    if (!this.hlActive) {
      if (p.gold < this.hlBet) {
        audio.hurt();
        this.setHlMessage('❌ เหรียญทองไม่เพียงพอสำหรับการเดิมพัน!');
        return;
      }
      p.gold -= this.hlBet;
      this.hlActive = true;
      this.hlMultiplier = 1.0;
      this.hlStreak = 0;
      audio.coin();
    }

    const nextCard = Math.floor(Math.random() * 13) + 1;
    const isWin = guessHigher ? nextCard >= this.hlCurrentCard : nextCard <= this.hlCurrentCard;
    this.hlCurrentCard = nextCard;

    if (isWin) {
      this.hlStreak++;
      this.hlMultiplier = this.hlStreak === 1 ? 1.8 : this.hlStreak === 2 ? 3.5 : this.hlStreak === 3 ? 7.0 : 15.0;
      audio.levelUp();
      this.setHlMessage(`🎉 ถูกต้อง! ไพ่ออก ${this.cardToLabel(nextCard)}! ทวีคูณ x${this.hlMultiplier.toFixed(1)}!`);
    } else {
      audio.hurt();
      this.setHlMessage(`💀 พลาดเป้า! ไพ่ออก ${this.cardToLabel(nextCard)}! เจ้ามือริบเงินกองกลาง!`);
      this.hlActive = false;
      this.hlMultiplier = 1.0;
      this.hlStreak = 0;
    }

    this.updateHlDisplay();
  }

  private handleHlCashOut() {
    const p = this.currentPlayer;
    if (!p || this.hlStreak === 0) return;

    const festivalMult = royalDecreeSystem.activeDecree.id === 'ROYAL_CASINO_FESTIVAL' ? 1.5 : 1.0;
    const winnings = Math.round(this.hlBet * this.hlMultiplier * festivalMult);
    p.gold += winnings;
    p.matchStats.goldEarnedTotal += winnings;
    audio.jackpotFanfare();
    const festTag = festivalMult > 1 ? ' [โบนัสเทศกาล +50%!]' : '';
    this.setHlMessage(`💰 ยินดีด้วย! คุณถอนกำไรสำเร็จ +${winnings}G!${festTag}`);
    this.game.addLog(`🎰 คาสิโนริโก้! ${p.displayName} คว้าชัย High-Low ชนะรวด ${this.hlStreak} ตา กวาดเงินรางวัล +${winnings}G!${festTag}`, 'level');

    this.hlActive = false;
    this.hlMultiplier = 1.0;
    this.hlStreak = 0;
    this.updateHlDisplay();
  }

  private setHlMessage(msg: string) {
    const el = document.getElementById('hlMessage');
    if (el) el.innerText = msg;
  }

  private updateHlDisplay() {
    const p = this.currentPlayer;
    if (!p) return;

    const valEl = document.getElementById('hlCardValue');
    if (valEl) valEl.innerText = this.cardToLabel(this.hlCurrentCard);

    const mulEl = document.getElementById('hlMultiplierText');
    if (mulEl) mulEl.innerText = `x${this.hlMultiplier.toFixed(1)}`;

    const strEl = document.getElementById('hlStreakText');
    if (strEl) strEl.innerText = `${this.hlStreak}`;

    const potEl = document.getElementById('hlPotText');
    if (potEl) potEl.innerText = `เงินรางวัลหากถอนตอนนี้: ${Math.round(this.hlBet * this.hlMultiplier)}G`;

    const cashBtn = document.getElementById('btnHlCashOut') as HTMLButtonElement | null;
    if (cashBtn) cashBtn.disabled = this.hlStreak === 0;
  }

  private handleSpinRoulette() {
    const p = this.currentPlayer;
    if (!p || this.rouletteSpinning) return;

    if (p.gold < this.rouletteBet) {
      audio.hurt();
      const resEl = document.getElementById('rouletteResultText');
      if (resEl) resEl.innerText = '❌ เหรียญทองไม่พอสำหรับเดิมพัน!';
      return;
    }

    p.gold -= this.rouletteBet;
    this.rouletteSpinning = true;
    audio.coin();

    const pointerEl = document.getElementById('roulettePointer');
    const resEl = document.getElementById('rouletteResultText');
    if (resEl) resEl.innerText = 'กำลังหมุนวงล้อ...';

    // Simulated wheel segments: 45% Red, 45% Blue, 10% Gold
    const rand = Math.random();
    const outcomeColor: 'red' | 'blue' | 'gold' = rand < 0.45 ? 'red' : rand < 0.90 ? 'blue' : 'gold';

    let spins = 0;
    const icons = ['🔴', '🔵', '⭐', '💀'];
    const timer = setInterval(() => {
      audio.click();
      if (pointerEl) pointerEl.innerText = icons[spins % icons.length];
      spins++;

      if (spins > 14) {
        clearInterval(timer);
        this.rouletteSpinning = false;
        const icon = outcomeColor === 'red' ? '🔴' : outcomeColor === 'blue' ? '🔵' : '⭐';
        if (pointerEl) pointerEl.innerText = icon;

        if (this.rouletteChosenColor === outcomeColor) {
          const mult = outcomeColor === 'gold' ? 5 : 2;
          const festivalMult = royalDecreeSystem.activeDecree.id === 'ROYAL_CASINO_FESTIVAL' ? 1.5 : 1.0;
          const payout = Math.round(this.rouletteBet * mult * festivalMult);
          p.gold += payout;
          p.matchStats.goldEarnedTotal += payout;
          audio.jackpotFanfare();
          const festTag = festivalMult > 1 ? ' [โบนัสเทศกาล +50%!]' : '';
          if (resEl) resEl.innerText = `🎉 แจ็กพอตแตก! วงล้อหยุดที่ ${icon}! ได้รับเงินรางวัล x${mult} (+${payout}G)${festTag}!`;
          this.game.addLog(`🎡 คาสิโนริโก้! ${p.displayName} ทายวงล้อถูกคว้าเงินรางวัล +${payout}G!${festTag}`, 'level');
        } else {
          audio.hurt();
          if (resEl) resEl.innerText = `💀 เสียใจด้วย! วงล้อหยุดที่ ${icon}! เจ้ามือกวาดเงินเดิมพัน!`;
        }
      }
    }, 90);
  }

  private updateGoldDisplay() {
    if (!this.currentPlayer) return;
    const goldEl = document.getElementById('casinoPlayerGoldText');
    if (goldEl) goldEl.innerText = `🪙 ${this.currentPlayer.gold}G`;
  }

  private handleStartColosseum() {
    const p = this.currentPlayer;
    if (!p || this.colosseumBattling) return;

    if (p.gold < this.colosseumBet) {
      audio.hurt();
      const arenaEl = document.getElementById('colosseumArenaArena');
      if (arenaEl) arenaEl.innerHTML = '<span class="text-rose-400">❌ เหรียญทองไม่เพียงพอสำหรับการเดิมพันสังเวียนนี้!</span>';
      return;
    }

    p.gold -= this.colosseumBet;
    this.updateGoldDisplay();
    this.colosseumBattling = true;
    audio.anvilStrike();

    const startBtn = document.getElementById('btnStartColosseum') as HTMLButtonElement | null;
    if (startBtn) startBtn.disabled = true;

    const arenaEl = document.getElementById('colosseumArenaArena');
    const chosen = this.fighters[this.selectedFighter];
    if (arenaEl) {
      arenaEl.innerHTML = `<span class="animate-pulse text-amber-300">⚔️ เปิดสังเวียนมรณะ! คุณเดิมพันฝั่ง [${chosen.name}] (${chosen.odds}x)...</span>`;
    }

    // Determine winner based on weights
    const totalWeight = this.fighters.reduce((acc, f) => acc + f.weight, 0);
    const rand = Math.random() * totalWeight;
    let accumulated = 0;
    let winnerIndex = 0;
    for (let i = 0; i < this.fighters.length; i++) {
      accumulated += this.fighters[i].weight;
      if (rand <= accumulated) {
        winnerIndex = i;
        break;
      }
    }

    const winner = this.fighters[winnerIndex];

    // 3-round simulated brawl
    setTimeout(() => {
      audio.anvilStrike();
      if (arenaEl) {
        arenaEl.innerHTML = `<div class="text-rose-300">💥 ยกที่ 1: หมาป่าเหมันต์ กระโจนกัด ไพโรสไลม์! ก็อบลินจอมทัพ ฟาดค้อนสนั่น!</div>`;
      }

      setTimeout(() => {
        audio.anvilStrike();
        if (arenaEl) {
          arenaEl.innerHTML = `<div class="text-yellow-300">⚡ ยกที่ 2: อัศวินโครงกระดูก ใช้เพลงดาบวิญญาณปะทะฝูงอสูรอย่างดุเดือด!</div>`;
        }

        setTimeout(() => {
          this.colosseumBattling = false;
          if (startBtn) startBtn.disabled = false;

          const isWin = winnerIndex === this.selectedFighter;
          if (isWin) {
            const festivalMult = royalDecreeSystem.activeDecree.id === 'ROYAL_CASINO_FESTIVAL' ? 1.5 : 1.0;
            const payout = Math.round(this.colosseumBet * winner.odds * festivalMult);
            p.gold += payout;
            p.matchStats.goldEarnedTotal += payout;
            this.updateGoldDisplay();
            audio.jackpotFanfare();
            const festTag = festivalMult > 1 ? ' [โบนัสเทศกาล +50%!]' : '';
            if (arenaEl) {
              arenaEl.innerHTML = `
                <div class="text-emerald-400 flex flex-col gap-1">
                  <span>🏆 ผู้ชนะคือ: <strong class="text-yellow-300">${winner.name}</strong>!</span>
                  <span>🎉 สายตาเฉียบคม! ท่านได้รับเงินเดิมพัน x${winner.odds} (+${payout}G)${festTag}!</span>
                </div>
              `;
            }
            this.game.addLog(`🏟️ โคลอสเซียมริโก้! ${p.displayName} เดิมพัน ${winner.name} ชนะเลิศ รับเงินรางวัล +${payout}G!${festTag}`, 'level');
          } else {
            audio.hurt();
            if (arenaEl) {
              arenaEl.innerHTML = `
                <div class="text-rose-400 flex flex-col gap-1">
                  <span>🏆 ผู้ชนะคือ: <strong class="text-yellow-300">${winner.name}</strong>!</span>
                  <span>💀 เสียใจด้วย! นักสู้ของคุณพ่ายแพ้ในศึกนี้ เจ้ามือริบเงิน ${this.colosseumBet}G!</span>
                </div>
              `;
            }
          }
        }, 1200);
      }, 1100);
    }, 1000);
  }
}
