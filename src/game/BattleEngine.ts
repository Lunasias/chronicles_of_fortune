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

export interface CombatantIntel {
  name: string;
  classOrType: string;
  tendencies: {
    attack: number;
    strike: number;
    magic: number;
    skill: number;
  };
  weakness: string;
  resistance: string;
  recommendedCounter: string;
  tacticalTip: string;
}

export class BattleEngine {
  public attacker: Combatant;
  public defender: Combatant;
  public isPlayerAttacking: boolean;

  static getCombatantIntel(combatant: Combatant): CombatantIntel {
    const name = combatant.name.toLowerCase();
    const classKey = combatant.classKey || (combatant.playerRef?.classKey) || '';

    if (combatant.isBoss) {
      return {
        name: combatant.name,
        classOrType: 'DRACONIC OVERLORD',
        tendencies: { attack: 25, strike: 45, magic: 20, skill: 10 },
        weakness: 'Ice & Holy Spells, Piercing Attacks',
        resistance: 'Fire & Physical Slashes',
        recommendedCounter: '⚡ High Strike Tendency! Ready Counter!',
        tacticalTip: 'The Dragon Overlord favors devastating Strikes. A successful Counter deals catastrophic reverse damage!'
      };
    }

    if (combatant.playerRef) {
      const p = combatant.playerRef;
      if (classKey === 'warrior') {
        return {
          name: p.displayName,
          classOrType: 'WARRIOR JUGGERNAUT',
          tendencies: { attack: 40, strike: 35, magic: 10, skill: 15 },
          weakness: 'Elemental Magic & Armor Piercing',
          resistance: 'Physical Blunt & Defend Stance',
          recommendedCounter: '🔮 Cast Magic to bypass ironclad defense!',
          tacticalTip: 'High physical DEF. Physical attacks do chip damage, but Magic tears right through.'
        };
      } else if (classKey === 'magician') {
        return {
          name: p.displayName,
          classOrType: 'ARCANE EVOKER',
          tendencies: { attack: 15, strike: 15, magic: 50, skill: 20 },
          weakness: 'Physical Rushdown & Critical Strike',
          resistance: 'Magic Spells & Elemental Shields',
          recommendedCounter: '⚔️ Rushdown with physical Attack; avoid Magic!',
          tacticalTip: 'Has deadly offensive magic. Use Magic Guard to block spells, then retaliate with blade.'
        };
      } else if (classKey === 'thief') {
        return {
          name: p.displayName,
          classOrType: 'SHADOW INFILTRATOR',
          tendencies: { attack: 35, strike: 45, magic: 5, skill: 15 },
          weakness: 'Guarded Counter & High DEF',
          resistance: 'High Evasion & Speed',
          recommendedCounter: '🛡️ Counter their aggressive Strike pickpocket!',
          tacticalTip: 'Speed demon who loves stealing gold via Strike. Predict their strike with Counter!'
        };
      } else if (classKey === 'cleric') {
        return {
          name: p.displayName,
          classOrType: 'HOLY CRUSADER',
          tendencies: { attack: 25, strike: 25, magic: 35, skill: 15 },
          weakness: 'Heavy Burst Strike & Darkness',
          resistance: 'Holy Light & Sustained Attrition',
          recommendedCounter: '⚡ Burst them down with Strike before they heal!',
          tacticalTip: 'Holy Smite heals HP while dealing damage. Do not let the duel drag out.'
        };
      }
    }

    // Common Monsters
    if (name.includes('slime')) {
      return {
        name: combatant.name,
        classOrType: 'AMORPHOUS OOZE',
        tendencies: { attack: 55, strike: 20, magic: 20, skill: 5 },
        weakness: 'Blunt Force & Fire',
        resistance: 'Slash Blades',
        recommendedCounter: '⚔️ Standard Attack is safest!',
        tacticalTip: 'Predictable baseline monster. Rarely Counters.'
      };
    } else if (name.includes('goblin') || name.includes('kobold')) {
      return {
        name: combatant.name,
        classOrType: 'WRETCHED SCAVENGER',
        tendencies: { attack: 45, strike: 35, magic: 10, skill: 10 },
        weakness: 'Holy Light & Magic',
        resistance: 'Poisons',
        recommendedCounter: '🛡️ Counter their wild club Strikes!',
        tacticalTip: 'Goblins swing erratically with wild overhead strikes.'
      };
    } else if (name.includes('skeleton')) {
      return {
        name: combatant.name,
        classOrType: 'CRYPT UNDEAD',
        tendencies: { attack: 40, strike: 35, magic: 10, skill: 15 },
        weakness: 'Holy Smite & Crushing Hammers',
        resistance: 'Piercing Arrows & Cold',
        recommendedCounter: '🔮 Magic or Counter against sword swings.',
        tacticalTip: 'Bony frame easily shattered by Holy and Magic.'
      };
    } else if (name.includes('spider') || name.includes('bat')) {
      return {
        name: combatant.name,
        classOrType: 'ABYSSAL BEAST',
        tendencies: { attack: 50, strike: 30, magic: 15, skill: 5 },
        weakness: 'Fire Spells & Wide Slashes',
        resistance: 'Earth & Darkness',
        recommendedCounter: '⚔️ Strong Physical Slash or Magic Fire.',
        tacticalTip: 'Fragile HP. High speed but low defense.'
      };
    } else if (name.includes('wraith') || name.includes('specter')) {
      return {
        name: combatant.name,
        classOrType: 'SPECTRAL APPARITION',
        tendencies: { attack: 15, strike: 15, magic: 60, skill: 10 },
        weakness: 'Holy Magic & Silvered Weapons',
        resistance: 'Immune to Normal Physical Damage',
        recommendedCounter: '🔮 Use Magic or Magic Guard!',
        tacticalTip: 'Phasing through reality. Defend against physical is useless; use Magic Guard!'
      };
    }

    return {
      name: combatant.name,
      classOrType: 'ROVING FOE',
      tendencies: { attack: 45, strike: 30, magic: 15, skill: 10 },
      weakness: 'Adaptive Tactics',
      resistance: 'Standard',
      recommendedCounter: '⚔️ Balanced Stance',
      tacticalTip: 'Observe opponent attack patterns and punish overextensions.'
    };
  }

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
