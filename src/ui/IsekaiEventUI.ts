import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { isekaiEventManager } from '../game/IsekaiEventManager';
import { CalamityEvent } from '../game/WorldCalamitySystem';
import { audio } from '../engine/AudioSynthesizer';

export class IsekaiEventUI {
  private game: GameState;

  constructor(game: GameState) {
    this.game = game;
  }

  // =========================================================================
  // 1. TAVERN & INN MODAL (Rest, Feast Dining, Rumors)
  // =========================================================================
  openTavern(player: Player, onLeave: () => void) {
    const modal = document.getElementById('tavernModal');
    if (!modal) {
      onLeave();
      return;
    }

    const titleEl = document.getElementById('tavernPlayerGold');
    if (titleEl) titleEl.innerText = `${player.gold}G`;

    // Render Meals
    const mealList = document.getElementById('tavernMealList');
    if (mealList) {
      mealList.innerHTML = isekaiEventManager.meals
        .map(
          m => `
        <div class="pixel-box p-2.5 bg-slate-900/90 border-slate-700 flex items-center justify-between gap-3 hover:border-amber-400">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${m.icon}</span>
            <div>
              <div class="font-bold text-amber-300 text-xs">${m.name}</div>
              <div class="text-[10px] text-slate-300">${m.desc}</div>
            </div>
          </div>
          <button data-meal-id="${m.id}" class="btn-buy-meal pixel-btn px-3 py-1.5 text-xs text-amber-400 hover:text-white bg-amber-950/60 border border-amber-500 whitespace-nowrap">
            สั่งรับประทาน (${m.cost}G)
          </button>
        </div>
      `
        )
        .join('');

      mealList.querySelectorAll('.btn-buy-meal').forEach(btn => {
        btn.addEventListener('click', e => {
          const mealId = (e.currentTarget as HTMLElement).getAttribute('data-meal-id')!;
          const res = isekaiEventManager.orderFood(player, mealId);
          this.game.addLog(res.message, res.success ? 'level' : 'battle');
          if (res.success) {
            this.showTavernNotice(res.message);
            if (titleEl) titleEl.innerText = `${player.gold}G`;
          } else {
            audio.hurt();
            alert(res.message);
          }
        });
      });
    }

    // Inn Button
    const btnInn = document.getElementById('btnTavernRestInn');
    if (btnInn) {
      btnInn.onclick = () => {
        const res = isekaiEventManager.restAtInn(player);
        this.game.addLog(res.message, res.success ? 'level' : 'battle');
        if (res.success) {
          this.showTavernNotice(res.message);
          if (titleEl) titleEl.innerText = `${player.gold}G`;
        } else {
          audio.hurt();
          alert(res.message);
        }
      };
    }

    // Rumors Button
    const btnRumor = document.getElementById('btnTavernListenRumors');
    if (btnRumor) {
      btnRumor.onclick = () => {
        audio.click();
        const picked = isekaiEventManager.rumors[Math.floor(Math.random() * isekaiEventManager.rumors.length)];
        this.showTavernNotice(`💬 เจ้าของบาร์: "${picked}"`);
        this.game.addLog(`🍺 ข่าวลือในโรงเตี๊ยม: "${picked}"`);
      };
    }

    // Casino Toggle & Spin Buttons
    const btnCasinoToggle = document.getElementById('btnTavernCasino');
    const casinoSection = document.getElementById('tavernCasinoSection');
    const wheelDisplay = document.getElementById('casinoWheelDisplay');
    const btnSpin = document.getElementById('btnSpinCasino');

    if (btnCasinoToggle && casinoSection) {
      btnCasinoToggle.onclick = () => {
        audio.click();
        const isHidden = casinoSection.classList.toggle('hidden');
        if (!isHidden) {
          audio.playBgm('casino');
        } else {
          audio.playBgm('overworld');
        }
      };
    }

    if (btnSpin && wheelDisplay) {
      btnSpin.onclick = () => {
        if (player.gold < 50) {
          audio.hurt();
          wheelDisplay.innerText = '⚠️ ทองไม่พอเดิมพัน (ต้องการ 50G)!';
          return;
        }

        btnSpin.setAttribute('disabled', 'true');
        audio.click();
        wheelDisplay.innerText = '🌀 กำลังหมุนวงล้อเสี่ยงโชค...';

        setTimeout(() => {
          btnSpin.removeAttribute('disabled');
          const res = isekaiEventManager.playCasino(player, 50);
          wheelDisplay.innerHTML = `<span class="text-xl">${res.icon}</span> <span>${res.title}</span>`;
          this.showTavernNotice(`${res.icon} ${res.title}: ${res.message}`);
          if (titleEl) titleEl.innerText = `${player.gold}G`;
          this.game.addLog(`🎰 [กาสิโน] ${res.title} - ${res.message}`, res.outcome === 'jackpot' ? 'level' : res.outcome === 'win_gold' ? 'gold' : 'battle');
          if (res.outcome === 'jackpot') {
            audio.jackpotFanfare();
          } else if (res.outcome === 'win_gold' || res.outcome === 'win_spell' || res.outcome === 'win_buff') {
            audio.coin();
          } else {
            audio.hurt();
          }
        }, 500);
      };
    }

    // Leave Button
    const btnLeave = document.getElementById('btnCloseTavern');
    if (btnLeave) {
      btnLeave.onclick = () => {
        audio.click();
        if (casinoSection && !casinoSection.classList.contains('hidden')) {
          casinoSection.classList.add('hidden');
          audio.playBgm('overworld');
        }
        modal.classList.add('hidden');
        onLeave();
      };
    }

    modal.classList.remove('hidden');

    // Bot AI auto-interact
    if (player.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        if (player.hp < player.maxHp * 0.6 && player.gold >= 25) {
          isekaiEventManager.restAtInn(player);
        } else if (player.gold >= 30 && !player.foodBuff) {
          isekaiEventManager.orderFood(player, 'dragon_steak');
        }
        setTimeout(() => {
          modal.classList.add('hidden');
          onLeave();
        }, Math.max(100, Math.round(900 / speed)));
      }, Math.max(100, Math.round(700 / speed)));
    }
  }

  private showTavernNotice(text: string) {
    const el = document.getElementById('tavernNoticeText');
    if (el) {
      el.innerText = text;
      el.classList.remove('hidden');
    }
  }

  // =========================================================================
  // 2. ADVENTURER'S GUILD MODAL (Quest Board & Ranking)
  // =========================================================================
  openGuild(player: Player, onLeave: () => void) {
    const modal = document.getElementById('guildModal');
    if (!modal) {
      onLeave();
      return;
    }

    document.getElementById('guildPlayerRank')!.innerText = `นักผจญภัย แรงค์ ${player.guildRank}`;
    document.getElementById('guildCompletedCount')!.innerText = `สำเร็จแล้ว ${player.completedQuestsCount} เควสต์`;

    const questList = document.getElementById('guildQuestList');
    if (questList) {
      if (player.activeGuildQuest) {
        const q = player.activeGuildQuest;
        questList.innerHTML = `
          <div class="pixel-box p-3 bg-amber-950/40 border-amber-500 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-amber-300 text-xs">⭐ เควสต์ที่กำลังทำ: [${q.title}]</span>
              <span class="text-[10px] bg-amber-600 text-white font-bold px-1.5 py-0.5">แรงค์ ${q.rank}</span>
            </div>
            <div class="text-[11px] text-slate-200">${q.desc}</div>
            <div class="flex items-center justify-between text-[10px] text-slate-300 mt-1">
              <span>ความคืบหน้า: <strong class="text-amber-400">${q.currentProgress}/${q.targetCount}</strong></span>
              <span>รางวัลตอบแทน: <strong class="text-emerald-400">+${q.rewardGold}G, +${q.rewardXp} XP</strong></span>
            </div>
          </div>
        `;
      } else {
        const available = isekaiEventManager.getAvailableGuildQuests(player);
        questList.innerHTML = available
          .map(
            q => `
          <div class="pixel-box p-2.5 bg-slate-900/90 border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-400">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-amber-300 text-xs">${q.title}</span>
                <span class="text-[9px] bg-slate-800 text-amber-400 font-bold px-1.5 py-0.5">แรงค์ ${q.rank}</span>
              </div>
              <div class="text-[10px] text-slate-300 mt-0.5">${q.desc}</div>
              <div class="text-[9px] text-emerald-400 font-bold mt-0.5">+${q.rewardGold}G • +${q.rewardXp} XP</div>
            </div>
            <button data-quest-id="${q.id}" class="btn-accept-quest pixel-btn px-3.5 py-1.5 text-xs text-amber-300 hover:text-white bg-slate-800 border border-slate-600 whitespace-nowrap font-bold">
              รับเควสต์
            </button>
          </div>
        `
          )
          .join('');

        questList.querySelectorAll('.btn-accept-quest').forEach(btn => {
          btn.addEventListener('click', e => {
            const qId = (e.currentTarget as HTMLElement).getAttribute('data-quest-id')!;
            const chosen = available.find(item => item.id === qId);
            if (chosen) {
              const res = isekaiEventManager.acceptQuest(player, chosen);
              this.game.addLog(res.message, 'level');
              modal.classList.add('hidden');
              onLeave();
            }
          });
        });
      }
    }

    const btnLeave = document.getElementById('btnCloseGuild');
    if (btnLeave) {
      btnLeave.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        onLeave();
      };
    }

    modal.classList.remove('hidden');

    // Bot AI auto-accept
    if (player.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        if (!player.activeGuildQuest) {
          const available = isekaiEventManager.getAvailableGuildQuests(player);
          if (available.length > 0) {
            isekaiEventManager.acceptQuest(player, available[0]);
          }
        }
        setTimeout(() => {
          modal.classList.add('hidden');
          onLeave();
        }, Math.max(100, Math.round(800 / speed)));
      }, Math.max(100, Math.round(700 / speed)));
    }
  }

  // =========================================================================
  // 3. FISHING SPOT MINIGAME
  // =========================================================================
  openFishing(player: Player, onFinished: () => void, onCombat: (monsterName: string) => void) {
    const modal = document.getElementById('fishingModal');
    if (!modal) {
      onFinished();
      return;
    }

    const promptState = document.getElementById('fishingPromptState');
    const reelState = document.getElementById('fishingReelState');
    const resState = document.getElementById('fishingResultState');
    const needleEl = document.getElementById('fishingNeedle');
    const btnCast = document.getElementById('btnCastRod');
    const btnReel = document.getElementById('btnReelRod');

    promptState?.classList.remove('hidden');
    reelState?.classList.add('hidden');
    resState?.classList.add('hidden');

    let animFrame: number | null = null;
    let needlePos = 0;
    let needleDir = 1;
    let isReeling = false;

    const stopNeedleLoop = () => {
      if (animFrame !== null) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      window.removeEventListener('keydown', handleKey);
    };

    const handleReelAction = () => {
      if (isReeling) return;
      isReeling = true;
      stopNeedleLoop();

      // Sweet Spot is 42% - 58%, Good Zone is 28% - 72%
      let accuracy: 'perfect' | 'great' | 'miss' = 'miss';
      if (needlePos >= 40 && needlePos <= 60) {
        accuracy = 'perfect';
        audio.jackpotFanfare();
      } else if (needlePos >= 25 && needlePos <= 75) {
        accuracy = 'great';
        audio.levelUp();
      } else {
        accuracy = 'miss';
        audio.hurt();
      }

      const result = isekaiEventManager.executeFishing(player, accuracy);

      reelState?.classList.add('hidden');
      if (resState) {
        resState.classList.remove('hidden');
        document.getElementById('fishingCatchIcon')!.innerText = result.icon;
        document.getElementById('fishingCatchTitle')!.innerText = result.title;
        document.getElementById('fishingCatchDesc')!.innerText = result.desc;
      }

      this.game.addLog(`🎣 FISHING: ${result.title} (${result.desc})`, result.type === 'combat' ? 'battle' : 'gold');

      const btnContinue = document.getElementById('btnFishingContinue')!;
      btnContinue.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        if (result.type === 'combat' && result.monsterName) {
          onCombat(result.monsterName);
        } else {
          onFinished();
        }
      };
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !reelState?.classList.contains('hidden')) {
        e.preventDefault();
        handleReelAction();
      }
    };

    if (btnCast) {
      btnCast.onclick = () => {
        audio.step();
        promptState?.classList.add('hidden');
        reelState?.classList.remove('hidden');
        needlePos = 5;
        needleDir = 1.6;
        isReeling = false;

        window.addEventListener('keydown', handleKey);

        const animateGauge = () => {
          needlePos += needleDir;
          if (needlePos >= 96) {
            needlePos = 96;
            needleDir = -Math.abs(needleDir);
          } else if (needlePos <= 4) {
            needlePos = 4;
            needleDir = Math.abs(needleDir);
          }

          if (needleEl) {
            needleEl.style.left = `${needlePos}%`;
          }

          if (!isReeling) {
            animFrame = requestAnimationFrame(animateGauge);
          }
        };

        animFrame = requestAnimationFrame(animateGauge);

        if (btnReel) {
          btnReel.onclick = () => handleReelAction();
        }
      };
    }

    modal.classList.remove('hidden');

    // Bot AI auto-fish
    if (player.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        btnCast?.click();
        setTimeout(() => {
          handleReelAction();
          setTimeout(() => {
            document.getElementById('btnFishingContinue')?.click();
          }, Math.max(120, Math.round(1400 / speed)));
        }, Math.max(100, Math.round(850 / speed)));
      }, Math.max(100, Math.round(500 / speed)));
    }
  }

  // =========================================================================
  // 4. BANDIT AMBUSH MODAL (Fight, Bribe, Trick)
  // =========================================================================
  openBanditAmbush(player: Player, onFinished: () => void, onCombat: () => void) {
    const modal = document.getElementById('banditAmbushModal');
    if (!modal) {
      onFinished();
      return;
    }

    const choiceBox = document.getElementById('banditChoicesBox')!;
    const outcomeBox = document.getElementById('banditOutcomeBox')!;
    choiceBox.classList.remove('hidden');
    outcomeBox.classList.add('hidden');

    const handleChoice = (choice: 'fight' | 'bribe' | 'trick') => {
      const res = isekaiEventManager.resolveBanditAmbush(player, choice);
      choiceBox.classList.add('hidden');
      outcomeBox.classList.remove('hidden');

      document.getElementById('banditOutcomeText')!.innerText = res.narration;
      this.game.addLog(res.narration, res.outcome === 'battle' ? 'battle' : 'gold');

      const btnClose = document.getElementById('btnBanditDismiss')!;
      btnClose.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        if (res.outcome === 'battle') {
          onCombat();
        } else {
          onFinished();
        }
      };
    };

    document.getElementById('btnBanditFight')!.onclick = () => handleChoice('fight');
    document.getElementById('btnBanditBribe')!.onclick = () => handleChoice('bribe');
    document.getElementById('btnBanditTrick')!.onclick = () => handleChoice('trick');

    modal.classList.remove('hidden');

    // Bot AI choice
    if (player.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        if (player.hp < 40 && player.gold >= 40) {
          handleChoice('bribe');
        } else if (player.mag >= 10 || player.spd >= 10) {
          handleChoice('trick');
        } else {
          handleChoice('fight');
        }
        setTimeout(() => {
          document.getElementById('btnBanditDismiss')?.click();
        }, Math.max(120, Math.round(1200 / speed)));
      }, Math.max(100, Math.round(800 / speed)));
    }
  }

  // =========================================================================
  // 5. GODDESS SHRINE MODAL
  // =========================================================================
  openShrine(player: Player, onFinished: () => void) {
    const modal = document.getElementById('shrineModal');
    if (!modal) {
      onFinished();
      return;
    }

    const res = isekaiEventManager.visitGoddessShrine(player);
    document.getElementById('shrineIcon')!.innerText = res.icon;
    document.getElementById('shrineTitle')!.innerText = res.title;
    document.getElementById('shrineDesc')!.innerText = res.message;
    this.game.addLog(`✨ GODDESS BLESSING: ${res.title} - ${res.message}`, 'level');

    document.getElementById('btnCloseShrine')!.onclick = () => {
      audio.click();
      modal.classList.add('hidden');
      onFinished();
    };

    modal.classList.remove('hidden');

    if (player.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        document.getElementById('btnCloseShrine')?.click();
      }, Math.max(150, Math.round(1400 / speed)));
    }
  }

  // =========================================================================
  // 6. WORLD CALAMITY ANNOUNCEMENT MODAL
  // =========================================================================
  openCalamityModal(calamity: CalamityEvent, onDismiss: () => void) {
    const modal = document.getElementById('calamityModal');
    if (!modal) {
      onDismiss();
      return;
    }

    document.getElementById('calamityIcon')!.innerText = calamity.bannerIcon;
    document.getElementById('calamityTitle')!.innerText = calamity.headline;
    document.getElementById('calamityDesc')!.innerText = calamity.loreDescription;
    document.getElementById('calamityReward')!.innerText = `เงินรางวัลนำจับจากราชสำนัก: ${calamity.bountyReward}G`;

    document.getElementById('btnDismissCalamity')!.onclick = () => {
      audio.click();
      modal.classList.add('hidden');
      onDismiss();
    };

    modal.classList.remove('hidden');

    // Auto dismiss after 2.5 seconds if AI is active
    if (this.game.activePlayer.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        modal.classList.add('hidden');
        onDismiss();
      }, Math.max(200, Math.round(2500 / speed)));
    }
  }
}
