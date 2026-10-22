import type { GameState } from '../game/GameState';
import type { BoardNode } from '../game/BoardMap';
import { TALENTS, canLearnTalent, learnTalent, talentPoints } from '../game/TalentTree';
import { STORYLINES, storyProgress } from '../game/CampaignStories';
import { escapeHtml } from '../util/Html';

export class CampaignWorkshop {
  private dialog = document.createElement('dialog');
  private tab: 'build' | 'chronicle' = 'build';
  constructor(private game: GameState, private canManage: () => boolean, private onChange: () => void, private focusNode: (node: BoardNode) => void) {
    this.dialog.id = 'campaignWorkshop'; this.dialog.className = 'campaign-workshop'; this.dialog.setAttribute('aria-labelledby', 'workshopTitle');
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-workshop-close]')) { this.dialog.close(); return; }
      const tab = target.closest<HTMLButtonElement>('[data-workshop-tab]');
      if (tab) { this.tab = tab.dataset.workshopTab as typeof this.tab; this.render(); return; }
      const talent = target.closest<HTMLButtonElement>('[data-learn-talent]');
      if (talent && this.canManage() && learnTalent(this.game.activePlayer, talent.dataset.learnTalent!)) { this.game.addLog('เรียนรู้พรสวรรค์: ' + TALENTS.find(t => t.id === talent.dataset.learnTalent)!.name, 'level'); this.onChange(); this.render(); }
      const moment = target.closest<HTMLButtonElement>('[data-replay-node]');
      if (moment) { const node = this.game.allNodes.find(n => n.id === Number(moment.dataset.replayNode)); if (node) { this.dialog.close(); this.focusNode(node); } }
    });
    document.body.append(this.dialog);
    const anchor = document.getElementById('btnRoyalContracts');
    for (const [id, label, tab] of [['btnTalentTree', '✦ พรสวรรค์และบิลด์', 'build'], ['btnCampaignChronicle', '✎ เรื่องราวและสรุปแมตช์', 'chronicle']] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.id = id; button.className = 'pixel-btn'; button.textContent = label;
      button.addEventListener('click', () => this.open(tab)); anchor?.after(button);
    }
  }
  open(tab: 'build' | 'chronicle' = 'build') { if (!this.game.players.length) return; this.tab = tab; this.render(); if (!this.dialog.open) this.dialog.showModal(); }
  private render() {
    const p = this.game.activePlayer;
    this.dialog.innerHTML = `<header><div><small>THE FORTUNA CHRONICLE</small><h2 id="workshopTitle">${this.tab === 'build' ? 'พรสวรรค์และบิลด์' : 'เรื่องราวและสรุปแมตช์'}</h2></div><button type="button" class="pixel-btn" data-workshop-close>✕ ปิด</button></header><nav><button type="button" class="pixel-btn" data-workshop-tab="build" aria-pressed="${this.tab === 'build'}">พรสวรรค์</button><button type="button" class="pixel-btn" data-workshop-tab="chronicle" aria-pressed="${this.tab === 'chronicle'}">บันทึกการเดินทาง</button></nav><div class="workshop-content">${this.tab === 'build' ? `<p>${escapeHtml(p.displayName)} · แต้มคงเหลือ ${talentPoints(p)} · ได้ 1 แต้มทุก 2 เลเวล สูงสุด 4 แต้ม</p><p>แต่ละวิถีเลือกพรขั้นสูงได้หนึ่งทาง ผสมได้หลายวิถี การเลือกเป็นส่วนหนึ่งของตัวละคร</p><div class="talent-grid">${['blade', 'arcane', 'warden'].map(branch => `<section>${TALENTS.filter(t => t.branch === branch).map(t => `<button type="button" class="talent-choice" data-learn-talent="${t.id}" aria-pressed="${p.talents.includes(t.id)}" ${!this.canManage() || !canLearnTalent(p, t.id) ? 'disabled' : ''}><strong>${p.talents.includes(t.id) ? '✓ ' : ''}${t.name}</strong><span>${t.detail}</span><small>${t.requires ? `ต้องมี ${TALENTS.find(root => root.id === t.requires)!.name} · เลือกทางนี้หรืออีกทาง` : 'พื้นฐานของวิถี'}</small></button>`).join('')}</section>`).join('')}</div>${!this.canManage() ? '<p>เรียนรู้ได้ในเทิร์นของคุณก่อนทอยเต๋า</p>' : ''}` : this.chronicle()}</div>`;
  }
  private chronicle(): string {
    const game = this.game, p = game.activePlayer;
    const ranking = [...game.players].sort((a, b) => b.getNetWorth(game.allNodes) - a.getNetWorth(game.allNodes) || a.id - b.id);
    return `<p>${escapeHtml(game.world.result?.reason || game.objective)}</p><ol class="chronicle-standings">${ranking.map(hero => `<li><strong>${escapeHtml(hero.displayName)}</strong><span>${hero.getNetWorth(game.allNodes)}G · Lv.${hero.level} · ${hero.townsControlled} เมือง · ชนะมอนสเตอร์ ${hero.matchStats.monstersKilled}</span></li>`).join('')}</ol><h3>ผู้คนที่คุณได้พบ</h3>${STORYLINES.map(story => { const ledger = game.world.storylines[p.id]?.[story.id]; return `<article class="story-card"><strong>${story.name}</strong><p>${ledger?.stage === 2 ? 'บทส่งท้าย: เส้นทางกลับมาปลอดภัย ทุกคนยังจดจำความช่วยเหลือของคุณ' : ledger?.stage === 1 ? `${story.intro} · ${storyProgress(game, p, story.id)}/${story.goal}` : `พบได้ที่${story.type === 'guild' ? 'กิลด์' : story.type === 'church' ? 'วิหาร' : 'โรงเตี๊ยม'}ระหว่างการเดินทาง`}</p><small>ความสัมพันธ์ ${ledger?.relationship || 0}${ledger?.path ? ` · ${ledger.path === 'help' ? 'เส้นทางช่วยเหลือ' : 'เส้นทางผู้รับจ้าง'}` : ''}</small></article>`; }).join('')}<h3>ย้อนดูจุดหมายแต่ละเทิร์น</h3><p>แตะบันทึกเพื่อย้อนมองตำแหน่งบนแมพ ความคืบหน้าปัจจุบันยังคงเดิม</p><div class="chronicle-timeline">${game.world.matchHistory.length ? [...game.world.matchHistory].reverse().map(moment => `<button type="button" class="pixel-btn" data-replay-node="${moment.nodeId}">วันที่ ${moment.day} · ${escapeHtml(game.players.find(hero => hero.id === moment.playerId)?.name || '')} · ${escapeHtml(game.allNodes.find(n => n.id === moment.nodeId)?.name || `#${moment.nodeId}`)}<span>${moment.gold}G · HP ${moment.hp} · Lv.${moment.level} · ${moment.towns} เมือง</span></button>`).join('') : '<p>บันทึกแรกจะปรากฏเมื่อจบเทิร์น</p>'}</div>`;
  }
}
