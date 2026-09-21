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
        <div class="pixel-box p-2.5 bg-slate-900/90 border-slate-700 flex items-center justify-between gap-3 hover:border-amber-400 transition-colors">
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

    // Leave Button
    const btnLeave = document.getElementById('btnCloseTavern');
    if (btnLeave) {
      btnLeave.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        onLeave();
      };
    }

    modal.classList.remove('hidden');

    // Bot AI auto-interact
    if (player.isAI) {
      setTimeout(() => {
        if (player.hp < player.maxHp * 0.6 && player.gold >= 25) {
          isekaiEventManager.restAtInn(player);
        } else if (player.gold >= 30 && !player.foodBuff) {
          isekaiEventManager.orderFood(player, 'dragon_steak');
        }
        setTimeout(() => {
          modal.classList.add('hidden');
          onLeave();
        }, 900);
      }, 700);
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
              <span class="text-[10px] bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded">แรงค์ ${q.rank}</span>
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
          <div class="pixel-box p-2.5 bg-slate-900/90 border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-400 transition-colors">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-amber-300 text-xs">${q.title}</span>
                <span class="text-[9px] bg-slate-800 text-amber-400 font-bold px-1.5 py-0.5 rounded">แรงค์ ${q.rank}</span>
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
        }, 800);
      }, 700);
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

    document.getElementById('fishingPromptState')?.classList.remove('hidden');
    document.getElementById('fishingResultState')?.classList.add('hidden');

    const btnCast = document.getElementById('btnCastRod');
    if (btnCast) {
      btnCast.onclick = () => {
        audio.step();
        btnCast.setAttribute('disabled', 'true');

        setTimeout(() => {
          btnCast.removeAttribute('disabled');
          const result = isekaiEventManager.executeFishing(player);

          document.getElementById('fishingPromptState')?.classList.add('hidden');
          const resState = document.getElementById('fishingResultState')!;
          resState.classList.remove('hidden');

          document.getElementById('fishingCatchIcon')!.innerText = result.icon;
          document.getElementById('fishingCatchTitle')!.innerText = result.title;
          document.getElementById('fishingCatchDesc')!.innerText = result.desc;

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
        }, 800);
      };
    }

    modal.classList.remove('hidden');

    // Bot AI auto-fish
    if (player.isAI) {
      setTimeout(() => {
        btnCast?.click();
        setTimeout(() => {
          document.getElementById('btnFishingContinue')?.click();
        }, 1600);
      }, 600);
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
        }, 1200);
      }, 800);
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
      setTimeout(() => {
        document.getElementById('btnCloseShrine')?.click();
      }, 1400);
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

    // Auto dismiss after 3 seconds if AI is active
    if (this.game.activePlayer.isAI) {
      setTimeout(() => {
        modal.classList.add('hidden');
        onDismiss();
      }, 2500);
    }
  }
}
