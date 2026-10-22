import { chooseJourney } from './JourneyUI';
import { GameState } from '../game/GameState';
import { BoardNode } from '../game/BoardMap';
import { townManager } from '../game/TownManager';
import { audio } from '../engine/AudioSynthesizer';
import { syncFeedPanelClass } from '../util/PanelFocus';
import { drawSettlementScenery, refreshSettlementOnLoad } from '../engine/SettlementScenery';

export class TownUI {
  private game: GameState;
  private currentTown: BoardNode | null = null;
  private onTownLeaveCallback?: () => void;
  private onInitiateRobCallback?: (townNode: BoardNode) => void;

  constructor(game: GameState) {
    this.game = game;
    this.bindButtons();
    refreshSettlementOnLoad('townDioramaCanvas', 'townModal', () => {
      if (!this.currentTown) return;
      const owner = this.game.players.find(p => p.id === this.currentTown?.townData?.ownerId);
      this.renderTownPlazaDiorama(document.getElementById('townDioramaCanvas') as HTMLCanvasElement,
        this.currentTown.name, this.currentTown.townData?.level || 1, owner?.color || null);
    });
  }

  private bindButtons() {
    document.getElementById('btnTownInn')?.addEventListener('click', () => this.handleInn());
    document.getElementById('btnTownInvest')?.addEventListener('click', () => this.handleInvest());
    document.getElementById('btnTownCollect')?.addEventListener('click', () => this.handleCollect());
    document.getElementById('btnTownRob')?.addEventListener('click', () => this.handleRob());
    document.getElementById('btnTownTakeover')?.addEventListener('click', () => this.handleTakeover());
    document.getElementById('btnLeaveTown')?.addEventListener('click', () => this.handleLeave());
  }

  open(
    townNode: BoardNode,
    onLeave: () => void,
    onInitiateRob: (townNode: BoardNode) => void
  ) {
    audio.playBgm('town');
    this.currentTown = townNode;
    this.onTownLeaveCallback = onLeave;
    this.onInitiateRobCallback = onInitiateRob;

    const modal = document.getElementById('townModal')!;
    const p = this.game.activePlayer;

    const townLvl = townNode.townData?.level || 1;
    const spec = townNode.townData?.specialization;
    const specTag = spec === 'trade_port' ? ' [⚓ ท่าเรือการค้า]' : spec === 'fortress' ? ' [🛡️ ป้อมปราการเหล็ก]' : spec === 'mining' ? ' [⛏️ เหมืองอัญมณี]' : '';
    const tierTitle = townLvl >= 3 ? '🏰 มหานครป้อมปราการ' : townLvl >= 2 ? '🛡️ เมืองป้อมปราการ' : '🏘️ หมู่บ้านชนบท';
    document.getElementById('townName')!.innerText = `${townNode.name}${specTag}`;
    document.getElementById('townBiome')!.innerText = `แคว้น${townNode.biome.toUpperCase()} • ${tierTitle} (เลเวล ${townLvl})`;

    const ownerId = townNode.townData?.ownerId;
    const owner = this.game.players.find(pl => pl.id === ownerId);

    const ownerText = document.getElementById('townOwnerText')!;
    const investCostText = document.getElementById('townInvestCostText')!;

    if (owner) {
      ownerText.innerText = `${owner.displayName} (${owner.className})`;
      ownerText.style.color = owner.color;

      // If rival owned, collect toll automatically upon entering
      if (owner.id !== p.id) {
        const isTradeRoute = townManager.isTownInTradeRoute(townNode, owner, this.game.allNodes);
        const flags = this.game.world.memory(p.id).flags;
        const key = 'toll_' + townNode.id;
        const toll = flags[key] === this.game.dayCounter ? 0 : Math.min(p.gold, townManager.calculateToll(townNode, p, this.game.allNodes, owner));
        flags[key] = this.game.dayCounter;
        p.gold -= toll;
        owner.gold += toll;
        this.game.addLog(`🪙 ${p.displayName} จ่ายค่าผ่านทาง ${toll}G ให้แก่เจ้าของเมือง ${owner.displayName}!${isTradeRoute ? ' (🌐 เส้นทางการค้าคูณ 1.5 เท่า!)' : ''}${p.relics.includes('thief_band') ? ' (💍 แหวนหัวขโมยลดค่าผ่านทาง 50%!)' : ''}`, 'gold');
        audio.coinClink();
      } else {
        // Owner visits own town: Town Milestone Regeneration Perk!
        if (townLvl >= 2) {
          const flags = this.game.world.memory(p.id).flags;
          const visitKey = 'rested_' + townNode.id;
          const healAmount = flags[visitKey] === this.game.dayCounter ? 0 : townLvl >= 3 ? 16 : 8;
          flags[visitKey] = this.game.dayCounter;
          const oldHp = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + healAmount);
          if (p.hp > oldHp) {
            this.game.addLog(`💖 ชาวเมือง ${townNode.name} ออกมาต้อนรับท่านเจ้าเมือง! ฟื้นฟู +${p.hp - oldHp} HP (โบนัสเมืองเลเวล ${townLvl})`, 'level');
          }
        }
      }
    } else {
      ownerText.innerText = 'เป็นกลาง (ยังไม่มีเจ้าของ)';
      ownerText.style.color = '#86efac';
    }

    const isOwner = owner?.id === p.id;
    const isRival = !!owner && !isOwner;

    const btnInvest = document.getElementById('btnTownInvest');
    const btnCollect = document.getElementById('btnTownCollect');
    const btnRob = document.getElementById('btnTownRob');
    const btnTakeover = document.getElementById('btnTownTakeover');

    if (isOwner) {
      btnInvest?.classList.remove('hidden');
      btnCollect?.classList.remove('hidden');
      btnRob?.classList.add('hidden');
      btnTakeover?.classList.add('hidden');
    } else if (isRival) {
      btnInvest?.classList.add('hidden');
      btnCollect?.classList.add('hidden');
      btnRob?.classList.remove('hidden');
      btnTakeover?.classList.remove('hidden');
      const isTradeRoute = owner ? townManager.isTownInTradeRoute(townNode, owner, this.game.allNodes) : false;
      const takeoverCost = owner ? townManager.takeoverCost(townNode, owner, this.game.allNodes) : 0;
      const takeoverText = document.getElementById('townTakeoverCostText');
      if (takeoverText) takeoverText.innerText = `ฮุบซื้อกรรมสิทธิ์ (${takeoverCost}G)${isTradeRoute ? ' [เส้นทางการค้า x3]' : ''}`;
    } else {
      btnInvest?.classList.add('hidden');
      btnCollect?.classList.add('hidden');
      btnRob?.classList.add('hidden');
      btnTakeover?.classList.add('hidden');
    }

    const investCost = 200 * (townNode.townData?.level || 1);
    investCostText.innerText = `ลงทุน ${investCost}G (อัปเกรด)`;
    this.refreshTownStatusUI();
    this.renderProjects(townNode, isOwner);

    // Render 2.5D Isometric Town Plaza Diorama
    const canvas = document.getElementById('townDioramaCanvas') as HTMLCanvasElement;
    if (canvas) {
      const ownerColor = owner?.color || null;
      this.renderTownPlazaDiorama(canvas, townNode.name, townNode.townData?.level || 1, ownerColor);
    }

    modal.classList.remove('hidden');
    syncFeedPanelClass();

    // AI automatic action
    if (p.isAI) {
      const speed = this.game.gameSpeed || 1;
      setTimeout(() => {
        if (p.hp < p.maxHp * 0.6 && p.gold >= 30) {
          this.handleInn();
        }
        const remainingDays = (this.game.world.matchConfig?.days ?? (this.game.gameMode === 'blitz' ? this.game.blitzDayLimit : 42)) - this.game.dayCounter + 1;
        if (owner?.id === p.id && p.gold >= investCost && remainingDays > 4) {
          this.handleInvest();
        }
        if (owner?.id === p.id && townNode.townData && !townNode.townData.project && remainingDays > 8) {
          const project = p.hp < p.maxHp * .6 ? 'sanctuary' : 'market';
          if (p.gold >= townManager.projectCost(project) + 100) townManager.developTown(townNode, p, project);
        }
        setTimeout(() => this.handleLeave(), Math.max(100, Math.round(600 / speed)));
      }, Math.max(100, Math.round(800 / speed)));
    }
  }

  private handleInn() {
    const p = this.game.activePlayer;
    const isOwner = this.currentTown?.townData?.ownerId === p.id;
    const cost = isOwner ? 0 : 30;

    if (p.gold < cost) {
      this.game.addLog(`${p.displayName} มีทองไม่พอสำหรับค่าโรงแรมพักผ่อน!`);
      return;
    }

    p.gold -= cost;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    p.rustTurns = 0;
    if (p.prank.hasGraffiti) {
      p.prank.hasGraffiti = false;
      p.prank.turnsRemaining = 0;
    }
    audio.levelUp();
    this.game.addLog(`🛏️ ${p.displayName} พักผ่อนที่โรงแรม! ฟื้นฟู HP และ MP เต็มเปี่ยม พร้อมลบล้างสถานะผิดปกติ!`);
    this.refreshTownStatusUI();
  }

  private renderProjects(node: BoardNode, isOwner: boolean) {
    let section = document.getElementById('townProjects');
    if (!section) { section = document.createElement('section'); section.id = 'townProjects'; section.className = 'town-projects'; document.getElementById('btnTownInvest')?.parentElement?.append(section); }
    const project = node.townData?.project;
    section.hidden = !isOwner && !project;
    const names = { market: 'ตลาดชุมชน', sanctuary: 'สวนแห่งการเยียวยา', watchtower: 'หอเฝ้าระวัง' };
    section.innerHTML = project ? `<p>โครงการเมือง: ${names[project]}</p>` : `<p>พัฒนาเมืองเลเวล 2 · เลือกได้หนึ่งโครงการ</p>${(['market', 'sanctuary', 'watchtower'] as const).map(id => `<button type="button" class="pixel-btn" data-town-project="${id}" ${!isOwner || (node.townData?.level || 1) < 2 || this.game.activePlayer.gold < townManager.projectCost(id) ? 'disabled' : ''}>${names[id]} · ${townManager.projectCost(id)}G · ${{ market: 'ภาษี +15G ต่อเทิร์น', sanctuary: 'ฟื้น HP 3 / MP 2 ทุกเทิร์น', watchtower: 'ค่าฮุบซื้อเมืองเพิ่ม 30%' }[id]}</button>`).join('')}`;
    section.querySelectorAll<HTMLButtonElement>('[data-town-project]').forEach(button => button.addEventListener('click', () => {
      if (townManager.developTown(node, this.game.activePlayer, button.dataset.townProject as keyof typeof names)) { this.game.addLog(`พัฒนาเมือง ${node.name}: ${names[button.dataset.townProject as keyof typeof names]}`, 'level'); this.open(node, this.onTownLeaveCallback!, this.onInitiateRobCallback!); }
    }));
  }

  private handleInvest() {
    if (!this.currentTown) return;
    const p = this.game.activePlayer;

    const res = townManager.investInTown(this.currentTown, p);
    if (res.success) {
      this.game.addLog(`📈 ${p.displayName} ลงทุนพัฒนาเมือง ${this.currentTown.name}! อัปเกรดเป็น ${res.tierName} (เลเวล ${res.newLevel})!`, 'level');
      if (res.newLevel >= 3 && !this.currentTown.townData?.specialization && p.gold >= 200) {
        const town = this.currentTown;
        chooseJourney(p, 'เลือกบทบาทเมือง', 'ใช้ 200G เพื่อกำหนดบทบาทถาวรของเมืองนี้', [
          ...(['trade_port', 'fortress', 'mining'] as const).map((spec, i) => ({ label: ['เมืองการค้า', 'ป้อมปราการ', 'เมืองเหมือง'][i], detail: ['รายได้และค่าผ่านทาง +50%', 'กองกำลังรักษาเมืองแข็งแกร่งขึ้น 40%', 'รายได้เพิ่ม 25G ต่อเทิร์น'][i], score: p.aiPersonality === 'economist' && i === 2 ? 10 : 4 - i, run: () => { townManager.setSpecialization(town, p, spec); this.game.addLog('กำหนดบทบาทเมือง ' + town.name + ': ' + spec, 'level'); if (!p.isAI) this.open(town, this.onTownLeaveCallback!, this.onInitiateRobCallback!); } })),
          { label: 'ตัดสินใจภายหลัง', detail: 'ลงทุนครั้งต่อไปเพื่อเลือกอีกครั้ง', score: 0, run: () => {} }
        ]);
      } else if (!p.isAI) this.open(this.currentTown, this.onTownLeaveCallback!, this.onInitiateRobCallback!);
    } else {
      this.game.addLog(`ไม่สามารถลงทุนได้ (ต้องเป็นเจ้าของเมืองและมีเงินทองเพียงพอ)`);
    }
  }

  private handleCollect() {
    if (!this.currentTown?.townData) return;
    const p = this.game.activePlayer;

    if (this.currentTown.townData.ownerId === p.id) {
      const flags = this.game.world.memory(p.id).flags;
      const key = 'collected_' + this.currentTown.id;
      if (flags[key] === this.game.dayCounter) { this.game.addLog('เก็บภาษีเมืองนี้แล้วในวันนี้'); return; }
      flags[key] = this.game.dayCounter;
      const tax = Math.min(60, this.currentTown.townData.taxYield);
      p.gold += tax; p.matchStats.goldEarnedTotal += tax;
      audio.coinClink();
      this.game.addLog(`🪙 เก็บภาษีฉุกเฉินได้ ${tax}G จากเมือง ${this.currentTown.name}!`, 'gold');
      this.refreshTownStatusUI();
    } else {
      this.game.addLog(`ท่านไม่ได้เป็นเจ้าของดินแดนนี้!`);
    }
  }

  private handleRob() {
    if (!this.currentTown) return;
    document.getElementById('townModal')?.classList.add('hidden');
    syncFeedPanelClass();
    if (this.onInitiateRobCallback) {
      this.onInitiateRobCallback(this.currentTown);
    }
  }

  private handleTakeover() {
    if (!this.currentTown?.townData) return;
    const p = this.game.activePlayer;
    const ownerId = this.currentTown.townData.ownerId;
    const owner = this.game.players.find(pl => pl.id === ownerId);
    if (!owner || owner.id === p.id) return;

    const res = townManager.hostileTakeover(this.currentTown, p, owner, this.game.allNodes);
    this.game.addLog(res.message, res.success ? 'gold' : 'info');
    if (res.success) {
      this.open(this.currentTown, this.onTownLeaveCallback!, this.onInitiateRobCallback!);
    }
  }

  public close() {
    this.handleLeave();
  }

  private refreshTownStatusUI() {
    if (!this.currentTown) return;
    const p = this.game.activePlayer;
    const taxYield = this.currentTown.townData?.taxYield || 0;
    const collectedToday = this.game.world.memory(p.id).flags['collected_' + this.currentTown.id] === this.game.dayCounter;
    let taxEl = document.getElementById('townTaxDisplay');
    if (!taxEl) {
      const ownerContainer = document.getElementById('townOwnerText')?.parentElement?.parentElement;
      if (ownerContainer) {
        taxEl = document.createElement('div');
        taxEl.id = 'townTaxDisplay';
        taxEl.className = 'text-xs text-amber-300 font-bold mt-1';
        ownerContainer.appendChild(taxEl);
      }
    }
    if (taxEl) {
      taxEl.innerText = `ภาษีเมือง: ${taxYield}G/สัปดาห์ • เงินสดของคุณ: ${p.gold}G${collectedToday ? ' (เก็บภาษีฉุกเฉินแล้ววันนี้)' : ''}`;
    }
    const btnCollect = document.getElementById('btnTownCollect') as HTMLButtonElement | null;
    if (btnCollect) {
      btnCollect.disabled = collectedToday;
    }
    (window as any).__gameApp?.hud?.update();
  }

  private handleLeave() {
    audio.click();
    audio.restoreWorldBgm();
    document.getElementById('townModal')?.classList.add('hidden');
    syncFeedPanelClass();
    this.currentTown = null;
    if (this.onTownLeaveCallback) {
      this.onTownLeaveCallback();
    }
  }

  // =========================================================================
  // PROCEDURAL 2.5D ISOMETRIC TOWN PLAZA DIORAMA
  // =========================================================================
  private renderTownPlazaDiorama(
    canvas: HTMLCanvasElement,
    townName: string,
    townLevel: number,
    ownerColor: string | null
  ) {
    drawSettlementScenery(canvas, 'town', ownerColor);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#142b36'; ctx.fillRect(10, 8, 250, 23);
    ctx.fillStyle = '#e9d7ad'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(townName + ' · LV ' + townLevel, 18, 24);
  }
}
