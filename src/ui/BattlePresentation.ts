import { BattleEngine, type Combatant, type AttackerAction } from '../game/BattleEngine';
import { escapeHtml } from '../util/Html';

export function actionHint(actor: Combatant, action: AttackerAction, skillUsed = false): { cost: number; blocked: boolean; text: string } {
  const cost = BattleEngine.actionCost(actor, action);
  if (action === 'skill' && (skillUsed || actor.skillUsed)) return { cost, blocked: true, text: 'ใช้แล้วในศึกนี้' };
  if (actor.mp < cost) return { cost, blocked: true, text: `MP ไม่พอ · ต้องการ ${cost}` };
  return { cost, blocked: false, text: action === 'skill' ? `${cost} MP · 1 ครั้ง/ศึก` : cost ? `${cost} MP` : 'ไม่ใช้ MP' };
}

export function combatStatusLabels(actor: Combatant): string[] {
  const labels: string[] = [];
  if (actor.burnTurns) labels.push(`เผาไหม้ ${actor.burnTurns}`);
  if (actor.freezeTurns) labels.push(`แช่แข็ง ${actor.freezeTurns}`);
  if (actor.silenceTurns) labels.push(`ใบ้ ${actor.silenceTurns}`);
  if (actor.blindTurns) labels.push(`ตาบอด ${actor.blindTurns}`);
  if (actor.isShocked) labels.push('ช็อต');
  if (actor.isWet) labels.push('เปียก');
  if (actor.conflagrationTurns) labels.push(`เพลิงคลอก ${actor.conflagrationTurns}`);
  if (actor.barrierHp && actor.barrierHp > 0) labels.push(`เกราะเวท ${Math.ceil(actor.barrierHp)}`);
  return labels;
}

export function updateBattlePresentation(battle: BattleEngine, skillUsed: boolean): void {
  for (const [id, action] of [['btnCmdAttack', 'attack'], ['btnCmdStrike', 'strike'], ['btnCmdMagic', 'magic'], ['btnCmdSkill', 'skill']] as const) {
    const button = document.getElementById(id) as HTMLButtonElement | null;
    if (!button) continue;
    const hint = actionHint(battle.attacker, action, skillUsed);
    let detail = button.querySelector<HTMLElement>('.command-resource');
    if (!detail) { detail = document.createElement('span'); detail.className = 'command-resource'; button.append(detail); }
    detail.textContent = hint.text;
    button.dataset.availability = hint.blocked ? 'blocked' : 'ready';
    button.disabled = hint.blocked;
    button.setAttribute('aria-disabled', String(hint.blocked));
    button.title = action === 'skill' ? `${battle.attacker.skillName ?? 'ท่าอาชีพ'} · ${hint.text}` : hint.text;
  }
  const player = battle.isPlayerAttacking ? battle.attacker : battle.defender;
  const enemy = battle.isPlayerAttacking ? battle.defender : battle.attacker;
  for (const [id, actor] of [['battlePlayerName', player], ['battleEnemyName', enemy]] as const) {
    const name = document.getElementById(id);
    if (!name?.parentElement) continue;
    name.parentElement.classList.add('combat-identity');
    let rack = name.parentElement.querySelector<HTMLElement>('.combat-status-rack');
    if (!rack) { rack = document.createElement('div'); rack.className = 'combat-status-rack'; name.parentElement.append(rack); }
    rack.innerHTML = combatStatusLabels(actor).map(label => `<span class="combat-status-chip">${escapeHtml(label)}</span>`).join('');
    rack.hidden = !rack.childElementCount;
    const hpBar = document.getElementById(id === 'battlePlayerName' ? 'battlePlayerHP' : 'battleEnemyHP');
    hpBar?.setAttribute('data-low', String(actor.hp / Math.max(1, actor.maxHp) <= .25));
  }
}
