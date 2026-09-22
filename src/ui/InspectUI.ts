import { Player } from '../game/Player';
import { GameState } from '../game/GameState';
import { BoardNode } from '../game/BoardMap';
import { audio } from '../engine/AudioSynthesizer';
import { pixelSprites } from '../engine/PixelSpriteGenerator';
import { getNodeEncounterPreview, MonsterProfile } from '../game/MonsterDatabase';

export class InspectUI {
  private game: GameState;
  private inspectModal: HTMLElement;
  private duelScoutModal: HTMLElement;
  private monsterScoutModal: HTMLElement;
  private destinationTooltip: HTMLElement;

  constructor(game: GameState) {
    this.game = game;

    // 1. Universal Inspect Modal
    let insEl = document.getElementById('characterInspectModal');
    if (!insEl) {
      insEl = document.createElement('div');
      insEl.id = 'characterInspectModal';
      insEl.className = 'hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none';
      document.body.appendChild(insEl);
    }
    this.inspectModal = insEl;

    // 2. Pre-Combat Duel Scouting Modal
    let duelEl = document.getElementById('preCombatDuelScoutModal');
    if (!duelEl) {
      duelEl = document.createElement('div');
      duelEl.id = 'preCombatDuelScoutModal';
      duelEl.className = 'hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none';
      document.body.appendChild(duelEl);
    }
    this.duelScoutModal = duelEl;

    // 3. Pre-Combat Monster Scouting Modal
    let monEl = document.getElementById('preCombatMonsterScoutModal');
    if (!monEl) {
      monEl = document.createElement('div');
      monEl.id = 'preCombatMonsterScoutModal';
      monEl.className = 'hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none';
      document.body.appendChild(monEl);
    }
    this.monsterScoutModal = monEl;

    // 4. Floating Tactical Move Preview Tooltip
    let tipEl = document.getElementById('moveTargetPreviewTooltip');
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.id = 'moveTargetPreviewTooltip';
      tipEl.className = 'hidden fixed z-40 pointer-events-none transition-opacity duration-150 select-none';
      document.body.appendChild(tipEl);
    }
    this.destinationTooltip = tipEl;
  }


  // =========================================================================
  // 1. UNIVERSAL CHARACTER INSPECTION (ดูสเตตัสตัวเองและเพื่อนร่วมทางได้ตลอดเวลา)
  // =========================================================================
  openInspect(player: Player) {
    audio.click();
    this.renderInspectModal(player);
    this.inspectModal.classList.remove('hidden');
  }

  private renderInspectModal(player: Player) {
    const netWorth = player.getNetWorth(this.game.allNodes);
    const ownedTownNames = player.townDeeds.map(id => {
      const node = this.game.allNodes.find(n => n.id === id);
      return node ? `${node.name} (Lv.${node.townData?.level || 1})` : `เมือง #${id}`;
    });

    const weaponDesc = player.equipment.weapon
      ? `${player.equipment.weapon.icon} ${player.equipment.weapon.name} (+${player.equipment.weapon.atk || 0} ATK)`
      : '🗡️ กำปั้นเปล่า (ไม่มีอาวุธ)';
    const armorDesc = player.equipment.armor
      ? `${player.equipment.armor.icon} ${player.equipment.armor.name} (+${player.equipment.armor.def || 0} DEF)`
      : '🛡️ เสื้อผ้าธรรมดา (ไม่มีเกราะ)';
    const accDesc = player.equipment.accessory
      ? `${player.equipment.accessory.icon} ${player.equipment.accessory.name}`
      : '💍 ไม่มีเครื่องประดับ';

    const totalAtk = player.getTotalStat('atk');
    const totalDef = player.getTotalStat('def');
    const totalMag = player.getTotalStat('mag');
    const totalSpd = player.getTotalStat('spd');
    const totalLuk = player.getTotalStat('luk');

    const bonusAtk = totalAtk - player.atk;
    const bonusDef = totalDef - player.def;
    const bonusMag = totalMag - player.mag;
    const bonusSpd = totalSpd - player.spd;
    const bonusLuk = totalLuk - player.luk;

    this.inspectModal.innerHTML = `
      <div class="pixel-box-gold max-w-xl w-full p-5 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b-2 border-amber-600/40 pb-3 mb-3">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 bg-slate-950 border-2 border-amber-500 rounded-lg flex items-center justify-center overflow-hidden shadow-inner relative">
              <canvas id="inspectAvatarCanvas" width="48" height="48" class="image-pixelated"></canvas>
              ${player.isDarkling ? '<span class="absolute top-0 right-0 text-[8px] bg-purple-700 text-white font-bold px-1 rounded-bl">จอมมาร</span>' : ''}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-amber-300 tracking-wider">${player.displayName}</h2>
                <span class="text-[10px] bg-slate-800 text-amber-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                  ${player.isDarkling ? 'จอมมารแห่งความมืด' : player.className}
                </span>
                <span class="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-700">
                  LV. ${player.level}
                </span>
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">
                ท่าไม้ตายประจำตัว: <span class="text-amber-300 font-bold">${player.skillName}</span>
              </p>
            </div>
          </div>
          <button id="btnCloseInspectModal" class="pixel-btn px-3 py-1.5 text-xs text-slate-300 hover:text-white font-bold">
            ✖ ปิด
          </button>
        </div>

        <!-- Health & Mana Bars -->
        <div class="grid grid-cols-2 gap-3 mb-3 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
          <div>
            <div class="flex justify-between text-[10px] font-bold text-rose-300 mb-1">
              <span>พลังชีวิต (HP)</span>
              <span>${player.hp} / ${player.maxHp}</span>
            </div>
            <div class="w-full bg-slate-900 h-3 rounded border border-slate-700 overflow-hidden">
              <div class="bg-gradient-to-r from-red-600 to-rose-400 h-full" style="width: ${Math.max(0, (player.hp / player.maxHp) * 100)}%;"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-[10px] font-bold text-sky-300 mb-1">
              <span>พลังเวทมนตร์ (MP)</span>
              <span>${player.mp} / ${player.maxMp}</span>
            </div>
            <div class="w-full bg-slate-900 h-3 rounded border border-slate-700 overflow-hidden">
              <div class="bg-gradient-to-r from-blue-600 to-cyan-400 h-full" style="width: ${Math.max(0, (player.mp / player.maxMp) * 100)}%;"></div>
            </div>
          </div>
        </div>

        <!-- Combat Attributes 6-Grid (Total Stats + Bonus) -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3 text-center">
          <div class="bg-slate-950/90 border border-slate-800 p-2 rounded flex flex-col items-center">
            <span class="text-[9px] text-slate-400 uppercase font-bold">⚔️ ATK</span>
            <span class="text-sm font-bold text-amber-300">${totalAtk}</span>
            <span class="text-[8px] text-slate-400">${bonusAtk > 0 ? `(${player.atk}+${bonusAtk})` : 'โจมตีกายภาพ'}</span>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 p-2 rounded flex flex-col items-center">
            <span class="text-[9px] text-slate-400 uppercase font-bold">🛡️ DEF</span>
            <span class="text-sm font-bold text-blue-300">${totalDef}</span>
            <span class="text-[8px] text-slate-400">${bonusDef > 0 ? `(${player.def}+${bonusDef})` : 'พลังป้องกัน'}</span>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 p-2 rounded flex flex-col items-center">
            <span class="text-[9px] text-slate-400 uppercase font-bold">🔮 MAG</span>
            <span class="text-sm font-bold text-purple-300">${totalMag}</span>
            <span class="text-[8px] text-slate-400">${bonusMag > 0 ? `(${player.mag}+${bonusMag})` : 'พลังเวทมนตร์'}</span>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 p-2 rounded flex flex-col items-center">
            <span class="text-[9px] text-slate-400 uppercase font-bold">⚡ SPD</span>
            <span class="text-sm font-bold text-yellow-300">${totalSpd}</span>
            <span class="text-[8px] text-slate-400">${bonusSpd > 0 ? `(${player.spd}+${bonusSpd})` : 'ความเร็วออกท่า'}</span>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 p-2 rounded flex flex-col items-center">
            <span class="text-[9px] text-slate-400 uppercase font-bold">🍀 LUK</span>
            <span class="text-sm font-bold text-emerald-300">${totalLuk}</span>
            <span class="text-[8px] text-slate-400">${bonusLuk > 0 ? `(${player.luk}+${bonusLuk})` : 'โชค & คริติคอล'}</span>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 p-2 rounded flex flex-col items-center">
            <span class="text-[9px] text-slate-400 uppercase font-bold">💎 ทรัพย์สิน</span>
            <span class="text-sm font-bold text-amber-400">${netWorth}G</span>
            <span class="text-[8px] text-slate-500">เงิน + เมือง + อาวุธ</span>
          </div>
        </div>

        <!-- Equipment & Assets -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
          <!-- Equipment -->
          <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5">
            <span class="text-[10px] text-amber-300 font-bold border-b border-slate-800 pb-1 flex items-center gap-1">
              <span>🎒</span> อุปกรณ์สวมใส่ในตัว
            </span>
            <div class="text-[11px] text-slate-200">
              <strong class="text-slate-400">อาวุธ:</strong> ${weaponDesc}
            </div>
            <div class="text-[11px] text-slate-200">
              <strong class="text-slate-400">ชุดเกราะ:</strong> ${armorDesc}
            </div>
            <div class="text-[11px] text-slate-200">
              <strong class="text-slate-400">ประดับ:</strong> ${accDesc}
            </div>
          </div>

          <!-- Controlled Territories -->
          <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5">
            <span class="text-[10px] text-emerald-300 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
              <span class="flex items-center gap-1"><span>🚩</span> เมืองในอาณัติ (${player.townsControlled})</span>
              <span class="text-amber-400 font-bold">เงินสด: ${player.gold}G</span>
            </span>
            <div class="text-[10px] text-slate-300 overflow-y-auto max-h-20 leading-relaxed">
              ${ownedTownNames.length > 0 ? ownedTownNames.join(', ') : 'ยังไม่มีเมืองในครอบครอง'}
            </div>
          </div>
        </div>

        <!-- Magic & Guild Status -->
        <div class="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg flex flex-wrap justify-between items-center text-[10px] text-slate-300">
          <div>
            <strong class="text-purple-300">เวทมนตร์บนแผนที่:</strong>
            ${player.fieldSpells.length > 0 ? player.fieldSpells.join(', ') : 'ไม่มีมนตรา'}
          </div>
          ${player.foodBuff ? `<div><strong class="text-amber-300">บัฟอาหาร:</strong> ${player.foodBuff.name} (${player.foodBuff.turnsRemaining}T)</div>` : ''}
          ${player.activeGuildQuest ? `<div><strong class="text-indigo-300">เควสต์กิลด์:</strong> [${player.activeGuildQuest.rank}] ${player.activeGuildQuest.title}</div>` : ''}
        </div>
      </div>
    `;

    // Render Avatar Canvas
    const canvas = document.getElementById('inspectAvatarCanvas') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 48, 48);
      ctx.imageSmoothingEnabled = false;
      const sprite = pixelSprites.getHeroSprite(
        player.classKey,
        'SE',
        'idle',
        0,
        player.equipment,
        player.isDarkling,
        player.prank,
        player.skinVariant
      );
      ctx.drawImage(sprite, -16, -16, 80, 80);
    }

    document.getElementById('btnCloseInspectModal')?.addEventListener('click', () => {
      audio.click();
      this.inspectModal.classList.add('hidden');
    });
  }

  // =========================================================================
  // 2. PRE-COMBAT DUEL SCOUTING & CONFIRM PANEL
  // (ส่องข้อมูลคู่ต่อสู้เทียบกับตัวเราก่อนตัดสินใจก้าวเดินไปสู้)
  // =========================================================================
  openDuelScouting(
    attacker: Player,
    defender: Player,
    tileName: string,
    onConfirm: () => void,
    onCancel: () => void
  ) {
    audio.click();
    this.renderDuelScoutModal(attacker, defender, tileName, onConfirm, onCancel);
    this.duelScoutModal.classList.remove('hidden');
  }

  private renderDuelScoutModal(
    attacker: Player,
    defender: Player,
    tileName: string,
    onConfirm: () => void,
    onCancel: () => void
  ) {
    const aAtk = attacker.getTotalStat('atk');
    const aDef = attacker.getTotalStat('def');
    const aMag = attacker.getTotalStat('mag');
    const aSpd = attacker.getTotalStat('spd');

    const dAtk = defender.getTotalStat('atk');
    const dDef = defender.getTotalStat('def');
    const dMag = defender.getTotalStat('mag');
    const dSpd = defender.getTotalStat('spd');

    // Matchup damage estimations using total equipped stats
    const estAtkPPhys = Math.max(8, aAtk - Math.floor(dDef * 0.6));
    const estAtkPStrike = Math.max(18, Math.floor(aAtk * 2.0 - dDef * 0.3));
    const estAtkPMagic = Math.max(10, Math.floor(aMag * 1.8 - dMag * 0.6));

    const estDefPPhys = Math.max(8, dAtk - Math.floor(aDef * 0.6));
    const estDefPCounter = Math.max(20, Math.floor(dAtk * 2.2));

    // Tactical match intelligence advice
    let adviceText = '';
    let adviceColor = '#38bdf8';

    if (dDef >= aAtk) {
      adviceText = '🛡️ ข้อแนะนำ: คู่ต่อสู้มีพลังป้องกันกายภาพสูงมาก! การโจมตีธรรมดาอาจทำดาเมจได้น้อย แนะนำให้ใช้เวทมนตร์ (Magic) ทะลวงเกราะ!';
      adviceColor = '#f59e0b';
    } else if (dMag > aMag + 6) {
      adviceText = '🔮 คำเตือน: คู่ต่อสู้มีพลังเวทมนตร์สูงลิ่ว! พึงระวังการโดนยิงเวทสวนกลับ เตรียมใช้บาเรียเวท (Magic Guard) หากตั้งรับ!';
      adviceColor = '#c084fc';
    } else if (estAtkPStrike >= defender.hp) {
      adviceText = '⚔️ โอกาสทอง: ท่าฟันชาร์จ Strike ของคุณมีพลังทำลายเพียงพอที่จะสังหารคู่ต่อสู้ได้ในคอมโบเดียว! แต่พึงระวังว่าศัตรูอาจเลือก Counter!';
      adviceColor = '#4ade80';
    } else if (aSpd > dSpd) {
      adviceText = '⚡ ความได้เปรียบ: คุณมีความเร็วสูงกว่าคู่ต่อสู้ (+15% โอกาสหลบหลีกการโจมตี)';
      adviceColor = '#38bdf8';
    } else {
      adviceText = '⚔️ การต่อสู้อยู่ในเกณฑ์สูสี คาดเดาใจคู่ต่อสู้ในระบบค้อน-กรรไกร-กระดาษให้แม่นยำ!';
      adviceColor = '#cbd5e1';
    }

    this.duelScoutModal.innerHTML = `
      <div class="pixel-box-gold max-w-2xl w-full p-4 md:p-5 shadow-2xl relative flex flex-col max-h-[92vh] overflow-y-auto bg-slate-950/95 border-2 border-rose-500/80">
        <!-- Header -->
        <div class="border-b border-rose-800/60 pb-2.5 mb-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-rose-300 tracking-wider">
              ⚔️ ส่องข้อมูลคู่ต่อสู้ & ยืนยันการท้าดวล (PvP Duel Intelligence)
            </h2>
            <span class="text-2xl animate-pulse">⚔️</span>
          </div>
          <p class="text-[10px] text-slate-300 mt-0.5">
            ช่องปลายทาง <strong class="text-amber-300">[${tileName}]</strong> ที่คุณเลือกมีผู้เล่นอื่นยืนอยู่! วิเคราะห์สเตตัสก่อนตัดสินใจเดินไปปะทะ
          </p>
        </div>

        <!-- Side-by-Side Comparison -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <!-- Attacker (YOU) -->
          <div class="pixel-box p-3 bg-slate-900/95 border-blue-500/70 flex flex-col gap-2">
            <div class="flex justify-between items-center border-b border-blue-900/60 pb-1.5">
              <span class="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>${attacker.displayName} (ฝ่ายคุณ)</span>
              </span>
              <span class="text-[10px] bg-blue-950 text-cyan-200 px-2 py-0.5 rounded font-bold">
                LV. ${attacker.level}
              </span>
            </div>

            <!-- Health & Mana -->
            <div class="space-y-1">
              <div class="flex justify-between text-[10px] text-slate-300 font-semibold">
                <span>HP: ${attacker.hp}/${attacker.maxHp}</span>
                <span>MP: ${attacker.mp}/${attacker.maxMp}</span>
              </div>
              <div class="w-full bg-slate-950 h-2.5 rounded overflow-hidden">
                <div class="bg-gradient-to-r from-red-600 to-rose-400 h-full" style="width: ${Math.max(0, (attacker.hp / attacker.maxHp) * 100)}%;"></div>
              </div>
            </div>

            <!-- Combat Attributes -->
            <div class="grid grid-cols-5 gap-1 text-center bg-slate-950/80 p-1.5 rounded text-[10px]">
              <div><strong class="text-amber-400 block">${aAtk}</strong><span class="text-[8px] text-slate-400">ATK</span></div>
              <div><strong class="text-blue-400 block">${aDef}</strong><span class="text-[8px] text-slate-400">DEF</span></div>
              <div><strong class="text-purple-400 block">${aMag}</strong><span class="text-[8px] text-slate-400">MAG</span></div>
              <div><strong class="text-yellow-400 block">${aSpd}</strong><span class="text-[8px] text-slate-400">SPD</span></div>
              <div><strong class="text-emerald-400 block">${attacker.gold}G</strong><span class="text-[8px] text-slate-400">ทอง</span></div>
            </div>

            <!-- Gear -->
            <div class="text-[10px] text-slate-300 space-y-0.5">
              <div><strong>อาวุธ:</strong> ${attacker.equipment.weapon ? attacker.equipment.weapon.name : 'กำปั้นเปล่า'}</div>
              <div><strong>โล่/เกราะ:</strong> ${attacker.equipment.armor ? attacker.equipment.armor.name : 'ไม่มี'}</div>
              <div><strong>สกิล:</strong> <span class="text-cyan-300 font-bold">${attacker.skillName}</span></div>
            </div>
          </div>

          <!-- Defender (RIVAL) -->
          <div class="pixel-box p-3 bg-slate-900/95 border-rose-500/70 flex flex-col gap-2">
            <div class="flex justify-between items-center border-b border-rose-900/60 pb-1.5">
              <span class="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <span>⚔️</span>
                <span>${defender.displayName} (คู่ต่อสู้)</span>
              </span>
              <span class="text-[10px] bg-rose-950 text-rose-200 px-2 py-0.5 rounded font-bold">
                LV. ${defender.level}
              </span>
            </div>

            <!-- Health & Mana -->
            <div class="space-y-1">
              <div class="flex justify-between text-[10px] text-slate-300 font-semibold">
                <span>HP: ${defender.hp}/${defender.maxHp}</span>
                <span>MP: ${defender.mp}/${defender.maxMp}</span>
              </div>
              <div class="w-full bg-slate-950 h-2.5 rounded overflow-hidden">
                <div class="bg-gradient-to-r from-red-600 to-rose-400 h-full" style="width: ${Math.max(0, (defender.hp / defender.maxHp) * 100)}%;"></div>
              </div>
            </div>

            <!-- Combat Attributes -->
            <div class="grid grid-cols-5 gap-1 text-center bg-slate-950/80 p-1.5 rounded text-[10px]">
              <div><strong class="text-amber-400 block">${dAtk}</strong><span class="text-[8px] text-slate-400">ATK</span></div>
              <div><strong class="text-blue-400 block">${dDef}</strong><span class="text-[8px] text-slate-400">DEF</span></div>
              <div><strong class="text-purple-400 block">${dMag}</strong><span class="text-[8px] text-slate-400">MAG</span></div>
              <div><strong class="text-yellow-400 block">${dSpd}</strong><span class="text-[8px] text-slate-400">SPD</span></div>
              <div><strong class="text-emerald-400 block">${defender.gold}G</strong><span class="text-[8px] text-slate-400">ทอง</span></div>
            </div>

            <!-- Gear -->
            <div class="text-[10px] text-slate-300 space-y-0.5">
              <div><strong>อาวุธ:</strong> ${defender.equipment.weapon ? defender.equipment.weapon.name : 'กำปั้นเปล่า'}</div>
              <div><strong>โล่/เกราะ:</strong> ${defender.equipment.armor ? defender.equipment.armor.name : 'ไม่มี'}</div>
              <div><strong>สกิล:</strong> <span class="text-rose-300 font-bold">${defender.skillName}</span></div>
            </div>
          </div>
        </div>

        <!-- Damage Estimations Bar -->
        <div class="bg-slate-950/90 border border-slate-800 p-3 rounded-lg mb-3">
          <div class="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span>📊</span> ประมาณการผลการต่อสู้ (Combat Projection)
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-300">
            <div class="bg-slate-900 p-2 rounded border border-slate-800">
              <span class="text-slate-400 block">ดาเมจฟันธรรมดา (Attack):</span>
              <strong class="text-amber-300 text-xs">~${estAtkPPhys} HP</strong>
            </div>
            <div class="bg-slate-900 p-2 rounded border border-slate-800">
              <span class="text-slate-400 block">ดาเมจฟันทะลวง (Strike):</span>
              <strong class="text-rose-400 text-xs">~${estAtkPStrike} HP</strong>
            </div>
            <div class="bg-slate-900 p-2 rounded border border-slate-800">
              <span class="text-slate-400 block">ดาเมจเวทมนตร์ (Magic):</span>
              <strong class="text-purple-300 text-xs">~${estAtkPMagic} HP</strong>
            </div>
          </div>

          <!-- Tactical Advice Callout -->
          <div class="mt-2.5 p-2 bg-amber-950/40 border border-amber-500/40 rounded text-[11px] leading-relaxed" style="color: ${adviceColor};">
            ${adviceText}
          </div>
        </div>

        <!-- Action Choice Buttons -->
        <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button id="btnCancelDuel" class="pixel-btn px-5 py-2.5 text-xs text-slate-300 hover:text-white font-bold">
            ❌ ยกเลิก / เลือกทางอื่น
          </button>
          <button id="btnConfirmDuel" class="pixel-btn pixel-btn-red px-6 py-2.5 text-xs font-bold text-white flex items-center gap-2 shadow-lg">
            <span>⚔️</span>
            <span>ยืนยันเดินไปท้าดวล!</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnConfirmDuel')?.addEventListener('click', () => {
      audio.click();
      this.duelScoutModal.classList.add('hidden');
      onConfirm();
    });

    document.getElementById('btnCancelDuel')?.addEventListener('click', () => {
      audio.click();
      this.duelScoutModal.classList.add('hidden');
      onCancel();
    });
  }
  // =========================================================================
  // 3. MOVE TARGET SELECTION: MONSTER ENCOUNTER & STAT PREVIEW TOOLTIP
  // =========================================================================
  showMoveDestinationPreview(node: BoardNode, activePlayer: Player, screenX: number, screenY: number) {
    const preview = getNodeEncounterPreview(node);
    const m = preview.featuredMonster;

    let statComparisonHtml = '';
    if (m) {
      const atkAdvantage = activePlayer.atk >= m.def;
      const spdAdvantage = activePlayer.spd >= m.spd;

      statComparisonHtml = `
        <div class="bg-slate-950/95 border border-amber-500/40 rounded p-2 mt-1.5 space-y-1">
          <div class="flex items-center justify-between border-b border-slate-800 pb-1">
            <span class="font-bold text-amber-300 text-[11px] flex items-center gap-1">
              <span>${m.icon}</span>
              <span>${m.name}</span>
            </span>
            <span class="text-[9px] bg-rose-950/80 text-rose-300 px-1 rounded font-bold border border-rose-800/60">
              LV.${m.level}
            </span>
          </div>

          <div class="flex justify-between text-[9px] font-bold text-slate-300">
            <span>HP: ${m.hp}/${m.maxHp}</span>
            <span class="${spdAdvantage ? 'text-emerald-300' : 'text-yellow-300'}">SPD: ${m.spd}</span>
          </div>

          <div class="grid grid-cols-4 gap-1 text-center text-[9px] bg-slate-900/80 p-1 rounded">
            <div><span class="text-slate-400 block text-[8px]">ATK</span><strong class="${atkAdvantage ? 'text-amber-400' : 'text-rose-400'}">${m.atk}</strong></div>
            <div><span class="text-slate-400 block text-[8px]">DEF</span><strong class="text-blue-400">${m.def}</strong></div>
            <div><span class="text-slate-400 block text-[8px]">MAG</span><strong class="text-purple-400">${m.mag}</strong></div>
            <div><span class="text-slate-400 block text-[8px]">SPD</span><strong class="${spdAdvantage ? 'text-emerald-400' : 'text-yellow-400'}">${m.spd}</strong></div>
          </div>

          <div class="text-[9px] text-slate-300 space-y-0.5 pt-0.5 border-t border-slate-800/80">
            <div><strong class="text-purple-300">⚡ ท่า:</strong> ${m.skillName}</div>
            <div><strong class="text-amber-300">🎁 ดรอป:</strong> ${m.lootDrop} (+${m.goldReward}G)</div>
            ${m.weakness ? `<div><strong class="text-cyan-300">🎯 จุดอ่อน:</strong> ${m.weakness}</div>` : ''}
          </div>

          <div class="text-[8px] rounded px-1 py-0.5 font-bold ${spdAdvantage ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'}">
            ${spdAdvantage ? '⚡ ความเร็วของคุณเหนือกว่า! (+15% อัตราหลบหลีก)' : '⚠️ อสูรตัวนี้เร็วกว่าคุณ! พึงระวังการโจมตี'}
          </div>
        </div>
      `;
    }

    this.destinationTooltip.innerHTML = `
      <div class="pixel-box-gold w-64 p-2.5 shadow-2xl bg-slate-950/95 border-2 border-amber-500/80 backdrop-blur-md text-left">
        <div class="flex items-center justify-between border-b border-amber-600/40 pb-1 mb-1">
          <div>
            <h4 class="text-xs font-bold text-amber-200 leading-tight">${preview.typeLabel}</h4>
            <span class="text-[8px] text-slate-400">${node.subRegionName || 'ราชอาณาจักร'}</span>
          </div>
          <span class="text-[8px] font-bold px-1.5 py-0.5 rounded border" style="color: ${preview.threatColor}; border-color: ${preview.threatColor}; background: rgba(0,0,0,0.5);">
            ${preview.threatLevel}
          </span>
        </div>

        <div class="flex items-center justify-between text-[9px] bg-slate-900/90 px-1.5 py-0.5 rounded mb-1 border border-slate-800">
          <span class="text-slate-300">โอกาสปะทะอสูร:</span>
          <strong class="font-bold" style="color: ${preview.threatColor};">${preview.encounterChancePercent}%</strong>
        </div>

        <p class="text-[9px] text-slate-300 leading-tight">
          ${preview.threatDescription}
        </p>

        ${statComparisonHtml}

        <div class="mt-1.5 pt-1 border-t border-slate-800 text-[8px] text-slate-400 flex items-center justify-between">
          <span>💡 คลิกช่องเพื่อยืนยันการเดิน</span>
          <span class="text-amber-400 font-bold">Dokapon</span>
        </div>
      </div>
    `;

    const tipW = 270;
    const tipH = 260;
    const pad = 14;
    let posX = screenX + pad;
    let posY = screenY + pad;

    if (posX + tipW > window.innerWidth) posX = screenX - tipW - pad;
    if (posY + tipH > window.innerHeight) posY = window.innerHeight - tipH - pad;
    if (posX < 8) posX = 8;
    if (posY < 8) posY = 8;

    this.destinationTooltip.style.left = `${posX}px`;
    this.destinationTooltip.style.top = `${posY}px`;
    this.destinationTooltip.classList.remove('hidden');
  }

  hideMoveDestinationPreview() {
    this.destinationTooltip.classList.add('hidden');
  }
  // =========================================================================
  // 4. PRE-BATTLE TACTICAL SCOUTING FOR MONSTERS & BOSSES
  // =========================================================================
  openMonsterScouting(
    monster: MonsterProfile,
    node: BoardNode,
    player: Player,
    onConfirm: () => void,
    onCancel: () => void
  ) {
    audio.click();
    this.hideMoveDestinationPreview();

    const estAtkPPhys = Math.max(8, player.atk - Math.floor(monster.def * 0.6));
    const estAtkPStrike = Math.max(18, Math.floor(player.atk * 2.2));
    const estAtkPMagic = Math.max(10, Math.floor(player.mag * 1.8 - monster.mag * 0.5));
    const estMonsterPhys = Math.max(6, monster.atk - Math.floor(player.def * 0.6));

    this.monsterScoutModal.innerHTML = `
      <div class="pixel-box-gold max-w-lg w-full p-4 shadow-2xl relative flex flex-col max-h-[92vh] overflow-y-auto bg-slate-950/95 border-2 border-rose-500/80">
        <div class="border-b border-rose-800/60 pb-2 mb-2 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-rose-300 flex items-center gap-1.5">
              <span>👹</span> ส่องข้อมูลอสูร & ยืนยันการเข้าปะทะ
            </h2>
            <p class="text-[10px] text-slate-300">[${node.name}] มีอสูร <strong class="text-rose-300">${monster.name}</strong> คุ้มกันอยู่!</p>
          </div>
          <span class="text-2xl">${monster.icon}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="pixel-box p-2.5 bg-slate-900/95 border-blue-500/70 text-[10px]">
            <div class="flex justify-between font-bold text-cyan-300 border-b border-slate-800 pb-1 mb-1">
              <span>🛡️ ${player.displayName}</span><span>LV.${player.level}</span>
            </div>
            <div>HP: ${player.hp}/${player.maxHp} | MP: ${player.mp}/${player.maxMp}</div>
            <div class="grid grid-cols-4 gap-1 text-center bg-slate-950 p-1 rounded mt-1">
              <div><strong class="text-amber-400 block">${player.atk}</strong><span>ATK</span></div>
              <div><strong class="text-blue-400 block">${player.def}</strong><span>DEF</span></div>
              <div><strong class="text-purple-400 block">${player.mag}</strong><span>MAG</span></div>
              <div><strong class="text-yellow-400 block">${player.spd}</strong><span>SPD</span></div>
            </div>
          </div>

          <div class="pixel-box p-2.5 bg-slate-900/95 border-rose-500/70 text-[10px]">
            <div class="flex justify-between font-bold text-rose-300 border-b border-slate-800 pb-1 mb-1">
              <span>${monster.icon} ${monster.name}</span><span>LV.${monster.level}</span>
            </div>
            <div>HP: ${monster.hp}/${monster.maxHp} | MP: ${monster.mp}/${monster.maxMp}</div>
            <div class="grid grid-cols-4 gap-1 text-center bg-slate-950 p-1 rounded mt-1">
              <div><strong class="text-amber-400 block">${monster.atk}</strong><span>ATK</span></div>
              <div><strong class="text-blue-400 block">${monster.def}</strong><span>DEF</span></div>
              <div><strong class="text-purple-400 block">${monster.mag}</strong><span>MAG</span></div>
              <div><strong class="text-yellow-400 block">${monster.spd}</strong><span>SPD</span></div>
            </div>
          </div>
        </div>

        <div class="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] space-y-1 mb-3">
          <div class="font-bold text-amber-300">📊 คาดการณ์ดาเมจ: กายภาพ ~${estAtkPPhys} | ชาร์จฟัน ~${estAtkPStrike} | เวทมนตร์ ~${estAtkPMagic}</div>
          <div class="text-slate-300">ท่าพิเศษ: <strong class="text-rose-300">${monster.skillName}</strong> (${monster.skillDesc})</div>
          <div class="text-amber-300">🎯 จุดอ่อน: ${monster.weakness || 'ชาร์จฟันทะลวง'} | ดาเมจสวนกลับ: ~${estMonsterPhys} HP</div>
        </div>

        <div class="flex justify-between gap-3 pt-2 border-t border-slate-800">
          <button id="btnCancelMonsterScout" class="pixel-btn px-4 py-2 text-xs text-slate-300 hover:text-white font-bold">❌ ยกเลิก</button>
          <button id="btnConfirmMonsterScout" class="pixel-btn pixel-btn-red px-5 py-2 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg"><span>⚔️ ยืนยันเข้าปะทะ!</span></button>
        </div>
      </div>
    `;

    document.getElementById('btnConfirmMonsterScout')?.addEventListener('click', () => {
      audio.click();
      this.monsterScoutModal.classList.add('hidden');
      onConfirm();
    });

    document.getElementById('btnCancelMonsterScout')?.addEventListener('click', () => {
      audio.click();
      this.monsterScoutModal.classList.add('hidden');
      onCancel();
    });

    this.monsterScoutModal.classList.remove('hidden');
  }


}
