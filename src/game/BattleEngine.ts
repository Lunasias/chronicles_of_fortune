import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';

export type AttackerAction = 'attack' | 'strike' | 'magic' | 'skill';
export type DefenderAction = 'defend' | 'counter' | 'magic_guard' | 'give_up';

export interface Combatant {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luk: number;
  isBoss?: boolean;
  isPvP?: boolean;
  playerRef?: Player;
  classKey?: string;
  skillName?: string;
}

export interface RoundResult {
  attackerAction: AttackerAction;
  defenderAction: DefenderAction;
  damageToDefender: number;
  damageToAttacker: number;
  isCounterSuccess: boolean;
  isStrikeSuccess: boolean;
  isMagicBlocked: boolean;
  isGiveUp: boolean;
  narration: string;
}

export class BattleEngine {
  public attacker: Combatant;
  public defender: Combatant;
  public isPlayerAttacking: boolean;

  constructor(combatant1: Combatant, combatant2: Combatant) {
    // Determine initiative by Speed stat
    if (combatant1.spd >= combatant2.spd) {
      this.attacker = combatant1;
      this.defender = combatant2;
      this.isPlayerAttacking = true;
    } else {
      this.attacker = combatant2;
      this.defender = combatant1;
      this.isPlayerAttacking = false;
    }
  }

  // Swap turns between attacker and defender for next round
  swapTurns() {
    const temp = this.attacker;
    this.attacker = this.defender;
    this.defender = temp;
    this.isPlayerAttacking = !this.isPlayerAttacking;
  }

  // Resolve Dokapon Rock-Paper-Scissors Mindgame
  resolveRound(atkAction: AttackerAction, defAction: DefenderAction): RoundResult {
    let damageToDefender = 0;
    let damageToAttacker = 0;
    let isCounterSuccess = false;
    let isStrikeSuccess = false;
    let isMagicBlocked = false;
    let isGiveUp = false;
    let narration = '';

    const a = this.attacker;
    const d = this.defender;

    // 1. Give Up
    if (defAction === 'give_up') {
      isGiveUp = true;
      narration = `${d.name} raised the white flag and surrendered!`;
      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender: 0,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        narration
      };
    }

    // 2. Resolve Strike vs Counter
    if (atkAction === 'strike' && defAction === 'counter') {
      // Counter Punishes Strike!
      isCounterSuccess = true;
      audio.counterParry();
      const rawCounter = Math.round(d.atk * 2.8 - a.def * 0.4);
      damageToAttacker = Math.round(Math.max(25, rawCounter + Math.floor(Math.random() * 8)));
      a.hp = Math.round(Math.max(0, a.hp - damageToAttacker));
      narration = `💥 PERFECT COUNTER! ${d.name} parried ${a.name}'s Strike and crushed them for ${damageToAttacker} reverse damage!`;
      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender: 0,
        damageToAttacker,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        narration
      };
    }

    // 3. Resolve Strike vs Defend / Magic Guard
    if (atkAction === 'strike') {
      isStrikeSuccess = true;
      audio.strikeHit();
      // Strike ignores defense!
      const rawStrike = Math.round(a.atk * 2.6 + Math.floor(Math.random() * 12));
      damageToDefender = Math.round(Math.max(20, rawStrike));
      d.hp = Math.round(Math.max(0, d.hp - damageToDefender));

      if (defAction === 'defend') {
        narration = `⚡ STRIKE SHATTERS DEFENSE! ${a.name}'s overhead strike pierced ${d.name}'s guard for ${damageToDefender} devastating damage!`;
      } else {
        narration = `⚡ DIRECT STRIKE! ${a.name} obliterated ${d.name}'s barrier for ${damageToDefender} damage!`;
      }

      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        narration
      };
    }

    // 4. Resolve Magic vs Magic Guard
    if (atkAction === 'magic' && defAction === 'magic_guard') {
      isMagicBlocked = true;
      audio.magicGuardBlock();
      // Magic guard nullifies spell
      narration = `✨ MAGIC GUARD! ${d.name}'s mystic barrier completely reflected ${a.name}'s spell! (0 Damage)`;
      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender: 0,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        narration
      };
    }

    // 5. Resolve Magic vs Defend / Counter
    if (atkAction === 'magic') {
      audio.magicCast();
      const spellDmg = Math.round(a.mag * 2.8 + 12 + Math.random() * 6);
      damageToDefender = Math.round(Math.max(15, spellDmg));
      d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
      narration = `🔮 ARCANE INFERNO! Physical defense couldn't stop ${a.name}'s magic! ${d.name} burned for ${damageToDefender} damage!`;

      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        narration
      };
    }

    // 6. Resolve Skill
    if (atkAction === 'skill') {
      audio.magicCast();
      const skillDmg = Math.round(a.atk * 1.8 + a.mag * 1.2);
      damageToDefender = Math.round(Math.max(12, skillDmg));
      d.hp = Math.round(Math.max(0, d.hp - damageToDefender));

      if (a.classKey === 'thief' && a.playerRef && d.playerRef) {
        const stolen = Math.min(d.playerRef.gold, 50);
        d.playerRef.gold -= stolen;
        a.playerRef.gold += stolen;
        narration = `🗡️ PICKPOCKET! ${a.name} dealt ${damageToDefender} damage and stole ${stolen}G from ${d.name}!`;
      } else if (a.classKey === 'cleric') {
        a.hp = Math.round(Math.min(a.maxHp, a.hp + 25));
        narration = `✨ HOLY SMITE! ${a.name} struck for ${damageToDefender} damage and restored 25 HP!`;
      } else {
        narration = `🌟 CLASS SKILL! ${a.name} unleashed ${a.skillName || 'Skill'} dealing ${damageToDefender} damage!`;
      }

      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        narration
      };
    }

    // 7. Resolve Attack
    audio.attackHit();
    const rawAtk = Math.round(a.atk * 2 - d.def * 0.7);
    let finalDmg = Math.round(Math.max(6, rawAtk + Math.floor(Math.random() * 5 - 2)));

    if (defAction === 'defend') {
      finalDmg = Math.round(Math.max(3, finalDmg * 0.45));
      narration = `🛡️ DEFEND BLOCKS! ${d.name} cushioned the blow, taking only ${finalDmg} damage.`;
    } else if (defAction === 'counter') {
      // Counter failed! Full damage
      finalDmg = Math.round(finalDmg * 1.2);
      narration = `⚔️ COUNTER WHIFFED! ${d.name} anticipated a Strike, but took a direct Attack for ${finalDmg} damage!`;
    } else {
      narration = `⚔️ ${a.name} struck with standard weapon dealing ${finalDmg} damage to ${d.name}!`;
    }

    d.hp = Math.round(Math.max(0, d.hp - finalDmg));
    damageToDefender = finalDmg;

    return {
      attackerAction: atkAction,
      defenderAction: defAction,
      damageToDefender,
      damageToAttacker: 0,
      isCounterSuccess,
      isStrikeSuccess,
      isMagicBlocked,
      isGiveUp,
      narration
    };
  }
}
