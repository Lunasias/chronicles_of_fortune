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
        classOrType: 'จอมราชันมังกร (DRACONIC OVERLORD)',
        tendencies: { attack: 25, strike: 45, magic: 20, skill: 10 },
        weakness: 'เวทมนตร์น้ำแข็ง, เวทศักดิ์สิทธิ์, การแทงทะลุ',
        resistance: 'ธาตุไฟ, การฟันกายภาพทั่วไป',
        recommendedCounter: '⚡ มีแนวโน้มชาร์จฟันสูงมาก! เตรียมสวนกลับ (Counter)!',
        tacticalTip: 'จอมราชันมังกรชอบใช้ท่าชาร์จฟันรุนแรง หากสวนกลับสำเร็จจะสะท้อนความเสียหายมหาศาล!'
      };
    }

    if (combatant.playerRef) {
      const p = combatant.playerRef;
      if (classKey === 'warrior') {
        return {
          name: p.displayName,
          classOrType: 'นักรบเกราะเหล็ก (WARRIOR JUGGERNAUT)',
          tendencies: { attack: 40, strike: 35, magic: 10, skill: 15 },
          weakness: 'เวทมนตร์ธาตุ, การโจมตีทะลวงเกราะ',
          resistance: 'การโจมตีกายภาพ, ท่าตั้งการ์ดป้องกัน',
          recommendedCounter: '🔮 ร่ายเวทมนตร์เพื่อทะลวงพลังป้องกันเหล็กไหล!',
          tacticalTip: 'พลังป้องกันกายภาพสูงมาก การโจมตีธรรมดาทำดาเมจได้น้อย แต่แพ้ทางเวทมนตร์'
        };
      } else if (classKey === 'magician') {
        return {
          name: p.displayName,
          classOrType: 'จอมเวทมนตรา (ARCANE EVOKER)',
          tendencies: { attack: 15, strike: 15, magic: 50, skill: 20 },
          weakness: 'การประชิดฟันกายภาพ, ท่าชาร์จฟัน',
          resistance: 'เวทมนตร์, โล่ธาตุ',
          recommendedCounter: '⚔️ บุกโจมตีกายภาพทันที หลีกเลี่ยงการสู้ด้วยเวท!',
          tacticalTip: 'มีเวทมนตร์โจมตีรุนแรงมาก ใช้ท่าปัดเวท (Magic Guard) เพื่อสกัดกั้น แล้วโจมตีสวนด้วยดาบ'
        };
      } else if (classKey === 'thief') {
        return {
          name: p.displayName,
          classOrType: 'จอมโจรเงาพราย (SHADOW INFILTRATOR)',
          tendencies: { attack: 35, strike: 45, magic: 5, skill: 15 },
          weakness: 'การตั้งรับสวนกลับ, พลังป้องกันสูง',
          resistance: 'ความเร็วสูง, การหลบหลีก',
          recommendedCounter: '🛡️ ตั้งท่าสวนกลับเพื่อดักจับจอมโจรที่ชอบชาร์จฟันขโมยทอง!',
          tacticalTip: 'เน้นความเร็วและชอบชาร์จฟันเพื่อปล้นเงิน คาดเดาจังหวะแล้วใช้สวนกลับ (Counter) ดัดหลัง'
        };
      } else if (classKey === 'cleric') {
        return {
          name: p.displayName,
          classOrType: 'อัศวินผู้พิทักษ์แสง (HOLY CRUSADER)',
          tendencies: { attack: 25, strike: 25, magic: 35, skill: 15 },
          weakness: 'การโจมตีหนักหน่วงรวดเร็ว, พลังความมืด',
          resistance: 'แสงศักดิ์สิทธิ์, การต่อสู้ยืดเยื้อ',
          recommendedCounter: '⚡ รีบเผด็จศึกด้วยชาร์จฟันก่อนที่นักบวชจะฟื้นฟูเลือด!',
          tacticalTip: 'ท่าแสงศักดิ์สิทธิ์สามารถฟื้นเลือดพร้อมสร้างดาเมจ อย่าปล่อยให้การต่อสู้ยืดเยื้อ'
        };
      }
    }

    // Common Monsters
    if (name.includes('slime')) {
      return {
        name: combatant.name,
        classOrType: 'อสูรสไลม์เมือกเหลว',
        tendencies: { attack: 55, strike: 20, magic: 20, skill: 5 },
        weakness: 'การทุบตีด้วยของหนัก, เวทมนตร์ไฟ',
        resistance: 'การฟันด้วยดาบ',
        recommendedCounter: '⚔️ โจมตีธรรมดาเป็นวิธีที่ปลอดภัยที่สุด!',
        tacticalTip: 'มอนสเตอร์พื้นฐาน คาดเดาง่าย แทบไม่เคยใช้ท่าสวนกลับ'
      };
    } else if (name.includes('goblin') || name.includes('kobold')) {
      return {
        name: combatant.name,
        classOrType: 'ก็อบลินคนเถื่อน',
        tendencies: { attack: 45, strike: 35, magic: 10, skill: 10 },
        weakness: 'แสงศักดิ์สิทธิ์, เวทมนตร์',
        resistance: 'พิษ',
        recommendedCounter: '🛡️ สวนกลับท่าทุบกระบองบ้าคลั่งของมัน!',
        tacticalTip: 'ก็อบลินมักเหวี่ยงกระบองเหวี่ยงไปมาด้วยท่าชาร์จฟันอย่างบ้าคลั่ง'
      };
    } else if (name.includes('skeleton')) {
      return {
        name: combatant.name,
        classOrType: 'โครงกระดูกคืนชีพ',
        tendencies: { attack: 40, strike: 35, magic: 10, skill: 15 },
        weakness: 'แสงศักดิ์สิทธิ์, ค้อนทุบกระดูก',
        resistance: 'ลูกศรแทงทะลุ, ความเย็น',
        recommendedCounter: '🔮 ใช้เวทมนตร์หรือสวนกลับการฟันดาบ',
        tacticalTip: 'โครงกระดูกเปราะบางแตกหักง่ายเมื่อโดนค้อนหรือเวทศักดิ์สิทธิ์'
      };
    } else if (name.includes('spider') || name.includes('bat')) {
      return {
        name: combatant.name,
        classOrType: 'อสูรราตรีแห่งความมืด',
        tendencies: { attack: 50, strike: 30, magic: 15, skill: 5 },
        weakness: 'เวทมนตร์ไฟ, ดาบฟันวงกว้าง',
        resistance: 'ธาตุดิน, ความมืด',
        recommendedCounter: '⚔️ ฟันกายภาพหนักๆ หรือใช้เวทไฟ',
        tacticalTip: 'เลือดน้อย เคลื่อนไหวเร็วแต่พลังป้องกันต่ำมาก'
      };
    } else if (name.includes('wraith') || name.includes('specter')) {
      return {
        name: combatant.name,
        classOrType: 'วิญญาณอาฆาตลอยล่อง',
        tendencies: { attack: 15, strike: 15, magic: 60, skill: 10 },
        weakness: 'เวทศักดิ์สิทธิ์, อาวุธเงินบริสุทธิ์',
        resistance: 'ไร้ผลต่อการโจมตีกายภาพธรรมดา',
        recommendedCounter: '🔮 ใช้เวทมนตร์ หรือกดปัดเวท (Magic Guard)!',
        tacticalTip: 'โปร่งใสทะลุกายภาพ การป้องกันธรรมดาไม่ได้ผล ให้ใช้ปัดเวทเท่านั้น!'
      };
    }

    return {
      name: combatant.name,
      classOrType: 'ศัตรูไม่ทราบที่มา',
      tendencies: { attack: 45, strike: 30, magic: 15, skill: 10 },
      weakness: 'กลยุทธ์ยืดหยุ่น',
      resistance: 'ทั่วไป',
      recommendedCounter: '⚔️ ตั้งรับและดูเชิง',
      tacticalTip: 'สังเกตรูปแบบการโจมตีของคู่ต่อสู้ แล้วลงทัณฑ์เมื่อศัตรูเปิดช่องว่าง'
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
      narration = `${d.name} ยกธงขาวขอยอมจำนน!`;
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
      narration = `💥 สวนกลับสมบูรณ์แบบ! ${d.name} ปัดป้องท่าชาร์จฟันของ ${a.name} และสะท้อนดาเมจสังหาร ${damageToAttacker} หน่วย!`;
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
        narration = `⚡ ชาร์จฟันทลายการป้องกัน! การฟาดฟันอันรุนแรงของ ${a.name} ทะลวงการตั้งการ์ดของ ${d.name} สร้างดาเมจมหาศาล ${damageToDefender} หน่วย!`;
      } else {
        narration = `⚡ ชาร์จฟันเต็มแรง! ${a.name} ฟาดฟันทำลายบาเรียของ ${d.name} ได้รับดาเมจ ${damageToDefender} หน่วย!`;
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
      narration = `✨ ปัดเวทสำเร็จ! บาเรียมนตราของ ${d.name} สะท้อนเวทมนตร์ของ ${a.name} ออกไปจนหมดสิ้น! (0 ดาเมจ)`;
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
      narration = `🔮 เพลิงเวทมนตร์แผดเผา! การป้องกันกายภาพไม่สามารถหยุดยั้งเวทของ ${a.name} ได้! ${d.name} ถูกเผาผลาญ ${damageToDefender} ดาเมจ!`;

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
        narration = `🗡️ โจรกรรมฉับไว! ${a.name} สร้างความเสียหาย ${damageToDefender} ดาเมจ และฉกเงิน ${stolen}G จากกระเป๋าของ ${d.name}!`;
      } else if (a.classKey === 'cleric') {
        a.hp = Math.round(Math.min(a.maxHp, a.hp + 25));
        narration = `✨ แสงศักดิ์สิทธิ์พิฆาต! ${a.name} ปลดปล่อยดาเมจแสง ${damageToDefender} หน่วย พร้อมฟื้นฟูเลือดตนเอง 25 HP!`;
      } else {
        narration = `🌟 ท่าไม้ตายคลาส! ${a.name} ปลดปล่อย ${a.skillName || 'สกิล'} สร้างความเสียหาย ${damageToDefender} ดาเมจ!`;
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
      narration = `🛡️ ป้องกันสำเร็จ! ${d.name} ลดทอนแรงปะทะ รับความเสียหายเพียง ${finalDmg} หน่วย`;
    } else if (defAction === 'counter') {
      // Counter failed! Full damage
      finalDmg = Math.round(finalDmg * 1.2);
      narration = `⚔️ สวนกลับพลาดเป้า! ${d.name} รอสวนกลับท่าชาร์จฟัน แต่โดนการโจมตีธรรมดาของ ${a.name} เต็มๆ ${finalDmg} ดาเมจ!`;
    } else {
      narration = `⚔️ ${a.name} โจมตีด้วยอาวุธ สร้างความเสียหาย ${finalDmg} ดาเมจแก่ ${d.name}!`;
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
