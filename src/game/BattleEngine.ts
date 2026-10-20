import { getWorld } from './WorldState';
import { Player, HERO_CLASSES, JOB_PROMOTIONS, TIER3_PROMOTIONS } from './Player';
import { audio } from '../engine/AudioSynthesizer';

export type AttackerAction = 'attack' | 'strike' | 'magic' | 'skill' | 'burst';
export type DefenderAction = 'defend' | 'counter' | 'magic_guard' | 'give_up';
export type CombatGridPosition = 'front' | 'mid' | 'back';
export type GridHazardType = 'none' | 'power_rune' | 'poison_pool' | 'spike_trap' | 'sanctuary_rune';
export type CombatElement = 'fire' | 'ice' | 'water' | 'lightning' | 'holy' | 'dark' | 'earth';

export interface Combatant {
  environmentKey?: string;
  element?: CombatElement;
  weaknessElement?: CombatElement;
  resistanceElement?: CombatElement;
  skillUsed?: boolean;
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
  gridPos?: CombatGridPosition;
  avatar?: string;
  isBoss?: boolean;
  isPvP?: boolean;
  playerRef?: Player;
  classKey?: string;
  skillName?: string;
  hasResurrected?: boolean;
  barrierHp?: number;
  isShocked?: boolean;
  burnTurns?: number;
  freezeTurns?: number;
  silenceTurns?: number;
  blindTurns?: number;
  isWet?: boolean;
  conflagrationTurns?: number;
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
  isDodged?: boolean;
  isCritical?: boolean;
  isFleeSuccess?: boolean;
  narration: string;
  isMiss?: boolean;
  vampiricHeal?: number;
  burnDamage?: number;
  goldStolen?: number;
  curseInflicted?: boolean;
  isBurst?: boolean;
  statusInflicted?: string;
  isShatter?: boolean;
  isChainShock?: boolean;
  isConflagration?: boolean;
  knockbackRow?: CombatGridPosition;
  hazardTriggered?: GridHazardType;
  isDuoBurst?: boolean;
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

  static actionCost(actor: Combatant, action: AttackerAction): number {
    if (action === 'magic') return 10;
    if (action !== 'skill') return 0;
    const key = actor.playerRef?.classKey ?? actor.classKey ?? '';
    const promotion = [...Object.values(JOB_PROMOTIONS), ...Object.values(TIER3_PROMOTIONS)].flat().find(p => p.tier2Key === key);
    return promotion?.skillCost ?? HERO_CLASSES[key]?.skillCost ?? 12;
  }

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

  public playerHazards: Record<CombatGridPosition, GridHazardType> = {
    front: 'none',
    mid: 'none',
    back: 'none'
  };
  public enemyHazards: Record<CombatGridPosition, GridHazardType> = {
    front: 'none',
    mid: 'none',
    back: 'none'
  };
  public biome: string = 'grass';

  constructor(combatant1: Combatant, combatant2: Combatant, biome: string = 'grass') {
    this.biome = biome;
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
    if (!this.attacker.gridPos) {
      this.attacker.gridPos = this.getDefaultGridPos(this.attacker);
    }
    if (!this.defender.gridPos) {
      this.defender.gridPos = this.getDefaultGridPos(this.defender);
    }
    if (this.attacker.playerRef?.relics.includes('dragon_heart')) {
      this.attacker.burnTurns = 0;
      this.attacker.freezeTurns = 0;
      this.attacker.playerRef.freezeTurns = 0;
    }
    if (this.defender.playerRef?.relics.includes('dragon_heart')) {
      this.defender.burnTurns = 0;
      this.defender.freezeTurns = 0;
      this.defender.playerRef.freezeTurns = 0;
    }
    this.initTacticalHazards();
  }

  private initTacticalHazards() {
    const environments: Record<string, { front?: GridHazardType; back?: GridHazardType }> = {
      volcano: { front: 'power_rune' }, snow: { back: 'sanctuary_rune' }, abyss: { front: 'poison_pool' },
      waterfall_forest: { back: 'sanctuary_rune' }, fairy_grove: { back: 'sanctuary_rune' },
      crystal_cavern: { front: 'power_rune' }, celestial: { back: 'sanctuary_rune' }, steampunk: { front: 'spike_trap' }
    };
    const field = environments[this.biome];
    if (field?.front) this.playerHazards.front = this.enemyHazards.front = field.front;
    if (field?.back) this.playerHazards.back = this.enemyHazards.back = field.back;
  }

  public getDefaultGridPos(c: Combatant): CombatGridPosition {
    const cls = (c.classKey || c.playerRef?.classKey || '').toLowerCase();
    if (cls === 'warrior' || cls === 'paladin' || cls === 'crusader' || cls === 'dark_knight' || cls === 'berserker' || cls === 'warlord' || c.isBoss) return 'front';
    if (cls === 'magician' || cls === 'archmage' || cls === 'grand_arcanist' || cls === 'necromancer' || cls === 'lich_king' || cls === 'spellblade' || cls === 'rune_master' || cls === 'rune_sovereign' || cls === 'ninja' || cls === 'phantom_shinobi' || cls === 'cleric' || cls === 'high_priest' || cls === 'radiant_archon' || cls === 'saint' || cls === 'seraphic_saint') return 'back';
    return 'mid';
  }

  public setCombatantGridPosition(isAttacker: boolean, pos: CombatGridPosition) {
    if (isAttacker) {
      this.attacker.gridPos = pos;
    } else {
      this.defender.gridPos = pos;
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
    let fallback = false;
    if (atkAction === 'burst' && (!this.attacker.playerRef || this.attacker.playerRef.burstGauge < 100)) { atkAction = 'attack'; fallback = true; }
    const cost = BattleEngine.actionCost(this.attacker, atkAction);
    if ((this.attacker.mp < cost || (atkAction === 'skill' && this.attacker.skillUsed)) && !(this.attacker.freezeTurns || this.attacker.silenceTurns)) {
      atkAction = 'attack'; fallback = true;
    } else if (!(this.attacker.freezeTurns || this.attacker.silenceTurns)) {
      this.attacker.mp = Math.max(0, this.attacker.mp - cost);
      if (atkAction === 'skill') this.attacker.skillUsed = true;
    }
    const rawResult = this.executeRoundLogic(atkAction, defAction);
    if (fallback) rawResult.narration = 'พลังไม่พอหรือใช้ท่าอาชีพแล้ว จึงโจมตีปกติ • ' + rawResult.narration;
    return this.applyPassivesAndSynergies(rawResult);
  }

  private executeRoundLogic(atkAction: AttackerAction, defAction: DefenderAction): RoundResult {
    let damageToDefender = 0;
    let damageToAttacker = 0;
    let isCounterSuccess = false;
    let isStrikeSuccess = false;
    let isMagicBlocked = false;
    let isGiveUp = false;
    let isFleeSuccess = false;
    let isDodged = false;
    let narration = '';

    const a = this.attacker;
    const d = this.defender;
    const aPos = a.gridPos || 'mid';
    const dPos = d.gridPos || 'mid';

    if (a.playerRef?.relics.includes('dragon_heart')) {
      a.freezeTurns = 0;
      a.burnTurns = 0;
      a.playerRef.freezeTurns = 0;
    }
    if (d.playerRef?.relics.includes('dragon_heart')) {
      d.freezeTurns = 0;
      d.burnTurns = 0;
      d.playerRef.freezeTurns = 0;
    }

    // 0. Freeze Check: Frozen unit cannot take any action this round!
    if (a.freezeTurns && a.freezeTurns > 0) {
      a.freezeTurns--;
      audio.miss();
      narration = `❄️ ${a.name} ติดสถานะแช่แข็ง (Freeze)! ร่างกายขยับไม่ได้ จึงไม่สามารถออกแอ็กชันในรอบนี้ได้!`;
      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender: 0,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        isDodged: true,
        narration
      };
    }

    // 0.1 Silence Check: Silenced unit cannot cast magic or skills!
    if (a.silenceTurns && a.silenceTurns > 0 && (atkAction === 'magic' || atkAction === 'skill')) {
      a.silenceTurns--;
      audio.miss();
      narration = `🤐 ${a.name} ติดสถานะใบ้ (Silence)! ไม่สามารถร่ายเวทมนตร์หรือสกิลได้ การร่ายเวทล้มเหลว! (0 ดาเมจ)`;
      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender: 0,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp,
        isDodged: true,
        narration
      };
    }

    // 0.2 Blindness Accuracy Check: 50% miss chance on physical attacks/strikes!
    const isBlind = (a.blindTurns && a.blindTurns > 0) || (a.playerRef && a.playerRef.blindTurns > 0);
    if (isBlind && (atkAction === 'attack' || atkAction === 'strike')) {
      if (a.blindTurns && a.blindTurns > 0) a.blindTurns--;
      if (a.playerRef && a.playerRef.blindTurns > 0) a.playerRef.blindTurns--;
      if (getWorld().random() < 0.50) {
        audio.miss();
        narration = `👁️ ${a.name} ติดสถานะตาบอด (Blind)! การโจมตีฟันวืดพลาดเป้าอย่างสิ้นเชิง! (0 ดาเมจ)`;
        return {
          attackerAction: atkAction,
          defenderAction: defAction,
          damageToDefender: 0,
          damageToAttacker: 0,
          isCounterSuccess,
          isStrikeSuccess,
          isMagicBlocked,
          isGiveUp,
          isDodged: true,
          narration
        };
      }
    }

    // 1. Give Up / Flee Mechanism
    if (defAction === 'give_up') {
      // Case A: Player fighting a Monster/Boss -> Tactical Retreat / Flee Check
      if (!a.playerRef && d.playerRef) {
        const fleeRoll = getWorld().random();
        const fleeChance = Math.min(0.95, Math.max(0.60, 0.80 + (d.spd - a.spd) * 0.03));
        if (fleeRoll < fleeChance) {
          isGiveUp = true;
          isFleeSuccess = true;
          narration = `🏃 ${d.name} ตัดสินใจถอยหนีฉุกเฉินสำเร็จ! หลบหลีกจากการต่อสู้ได้ทันเวลา!`;
          return {
            attackerAction: atkAction,
            defenderAction: defAction,
            damageToDefender: 0,
            damageToAttacker: 0,
            isCounterSuccess,
            isStrikeSuccess,
            isMagicBlocked,
            isGiveUp: true,
            isFleeSuccess: true,
            narration
          };
        } else {
          // Botched Escape! Monster ambushes defender
          const ambushDmg = Math.round(Math.max(12, a.atk * 1.8 - d.def * 0.5));
          d.hp = Math.round(Math.max(0, d.hp - ambushDmg));
          narration = `⚠️ ${d.name} พยายามถอยหนีแต่สะดุดล้ม! ${a.name} พุ่งโจมตีซ้ำสร้างความเสียหาย ${ambushDmg} ดาเมจ!`;
          return {
            attackerAction: atkAction,
            defenderAction: defAction,
            damageToDefender: ambushDmg,
            damageToAttacker: 0,
            isCounterSuccess,
            isStrikeSuccess,
            isMagicBlocked,
            isGiveUp: false,
            isFleeSuccess: false,
            narration
          };
        }
      }

      // Case B: PvP Duel Surrender (Honorable tribute to victor)
      isGiveUp = true;
      narration = `🏳️ ${d.name} ยกธงขาวขอยอมจำนน ยินยอมมอบเครื่องบรรณาการ 30% ของเงินสดเพื่อยุติศึกโดยไม่เสียชีวิต!`;
      return {
        attackerAction: atkAction,
        defenderAction: defAction,
        damageToDefender: 0,
        damageToAttacker: 0,
        isCounterSuccess,
        isStrikeSuccess,
        isMagicBlocked,
        isGiveUp: true,
        narration
      };
    }


    // 2. Resolve Strike vs Counter
    if (atkAction === 'strike' && defAction === 'counter') {
      // Counter Punishes Strike!
      isCounterSuccess = true;
      audio.counterParry();
      const rawCounter = Math.round(d.atk * 2.8 - a.def * 0.4);
      damageToAttacker = Math.round(Math.max(25, rawCounter + Math.floor(getWorld().random() * 8)));

      if (dPos === 'front') {
        damageToAttacker = Math.round(damageToAttacker * 1.15);
      }

      // LUK Critical Hit for Counter
      if (getWorld().random() < Math.min(0.40, (d.luk || 5) * 0.015)) {
        damageToAttacker = Math.round(damageToAttacker * 1.5);
        narration = `💥 สวนกลับคริติคอลขั้นสุดยอด! ${d.name} ปัดป้องดาบของ ${a.name} และสะท้อนดาเมจสังหาร ${damageToAttacker} หน่วย! (ติด Critical!)`;
      } else {
        narration = `💥 สวนกลับสมบูรณ์แบบ! ${d.name} ปัดป้องท่าชาร์จฟันของ ${a.name} และสะท้อนดาเมจสังหาร ${damageToAttacker} หน่วย!`;
      }
      if (dPos === 'front') {
        narration += ' ⚔️[แถวหน้า สวนกลับแรงขึ้น 15%]';
      }

      a.hp = Math.round(Math.max(0, a.hp - damageToAttacker));

      // LUK Miracle Survival for Attacker
      if (a.hp <= 0 && getWorld().random() < Math.min(0.30, (a.luk || 5) * 0.012)) {
        a.hp = 1;
        narration += ` 🍀 ปาฏิหาริย์แห่งโชค! ${a.name} รอดตายหวุดหวิดเหลือ 1 HP!`;
      }

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
      let rawStrike = Math.round(a.atk * 2.6 + Math.floor(getWorld().random() * 12));
      if (aPos === 'front') rawStrike = Math.round(rawStrike * 1.15);
      if (dPos === 'front') rawStrike = Math.round(rawStrike * 1.10);
      else if (dPos === 'mid') rawStrike = Math.round(rawStrike * 0.90);
      else if (dPos === 'back') rawStrike = Math.round(rawStrike * 0.85);

      damageToDefender = Math.round(Math.max(20, rawStrike));

      // LUK Critical Strike
      let isCrit = false;
      if (getWorld().random() < Math.min(0.40, (a.luk || 5) * 0.015)) {
        isCrit = true;
        damageToDefender = Math.round(damageToDefender * 1.5);
      }

      d.hp = Math.round(Math.max(0, d.hp - damageToDefender));

      if (defAction === 'defend') {
        narration = `⚡ ชาร์จฟันทลายการป้องกัน! การฟาดฟันอันรุนแรงของ ${a.name} ทะลวงการตั้งการ์ดของ ${d.name} สร้างดาเมจมหาศาล ${damageToDefender} หน่วย!${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else {
        narration = `⚡ ชาร์จฟันเต็มแรง! ${a.name} ฟาดฟันทำลายบาเรียของ ${d.name} ได้รับดาเมจ ${damageToDefender} หน่วย!${isCrit ? ' 💥 คริติคอล!' : ''}`;
      }

      // LUK Miracle Survival
      if (d.hp <= 0 && getWorld().random() < Math.min(0.30, (d.luk || 5) * 0.012)) {
        d.hp = 1;
        narration += ` 🍀 ปาฏิหาริย์แห่งโชค! ${d.name} รอดตายหวุดหวิดเหลือ 1 HP!`;
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
        isCritical: isCrit,
        narration
      };
    }

    // 4. Resolve Magic vs Magic Guard
    if (atkAction === 'magic' && defAction === 'magic_guard') {
      isMagicBlocked = true;
      audio.magicGuardBlock();
      // Magic guard nullifies spell and reflects minor mana
      narration = `✨ ปัดเวทสำเร็จ! บาเรียมนตราของ ${d.name} (MAG ${d.mag || 5}) สะท้อนเวทมนตร์ของ ${a.name} ออกไปจนหมดสิ้น! (0 ดาเมจ)`;
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
      // Magic penetrates physical armor, but is mitigated by Defender's MAG
      const magMitigation = (d.mag || 5) * 0.85;
      let rawSpell = a.mag * 2.6 + 12 - magMitigation + getWorld().random() * 6;
      if (a.element && a.element === d.weaknessElement) rawSpell *= 1.25;
      if (a.element && a.element === d.resistanceElement) rawSpell *= 0.8;

      // MAG High-Tier Mastery: Elemental burn if MAG >= 20
      let elementalBonus = 0;
      if (a.mag >= 20) {
        elementalBonus = Math.floor(a.mag * 0.35);
        rawSpell += elementalBonus;
      }

      if (aPos === 'back') rawSpell = Math.round(rawSpell * 1.20);
      if (dPos === 'back') rawSpell = Math.round(rawSpell * 1.20);

      let spellDmg = Math.round(Math.max(12, rawSpell));

      // LUK Critical Hit for Magic
      let isCrit = false;
      if (getWorld().random() < Math.min(0.40, (a.luk || 5) * 0.015)) {
        isCrit = true;
        spellDmg = Math.round(spellDmg * 1.5);
      }

      damageToDefender = spellDmg;
      d.hp = Math.round(Math.max(0, d.hp - damageToDefender));

      narration = `🔮 เพลิงเวทมนตร์แผดเผา! การโจมตีเวทของ ${a.name} ทะลุเกราะกายภาพ สร้างความเสียหาย ${damageToDefender} ดาเมจแก่ ${d.name}!${elementalBonus > 0 ? ' (โบนัสธาตุเวทมนตร์ชั้นสูง)' : ''}${isCrit ? ' 💥 คริติคอลมนตรา!' : ''}`;

      // LUK Miracle Survival
      if (d.hp <= 0 && getWorld().random() < Math.min(0.30, (d.luk || 5) * 0.012)) {
        d.hp = 1;
        narration += ` 🍀 ปาฏิหาริย์แห่งโชค! ${d.name} รอดตายหวุดหวิดเหลือ 1 HP!`;
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
        isCritical: isCrit,
        narration
      };
    }

    // 6. Resolve Skill (Differentiated Class Ultimate Abilities)
    if (atkAction === 'skill') {
      audio.magicCast();

      // LUK Critical Hit for Skill
      let isCrit = false;
      if (getWorld().random() < Math.min(0.40, (a.luk || 5) * 0.015)) {
        isCrit = true;
      }

      // Defender DEF mitigation factor: Skills face armor resistance
      const defReduction = Math.max(0, (d.def || 5) * 0.85);
      const magDefReduction = Math.max(0, ((d.def || 5) * 0.4) + ((d.mag || 5) * 0.5));

      const promoKey = (a.classKey || a.playerRef?.classKey || '').toLowerCase();
      const baseCls = (a.playerRef?.originalClassKey || a.classKey || '').toLowerCase();

      // Tier 2 & Tier 3 Promoted Class Ultimate Skills
      if (promoKey === 'paladin') {
        let raw = (a.atk * 1.9 + a.def * 1.0 + a.mag * 1.3 + 14) - defReduction * 0.7;
        if (defAction === 'defend') raw = Math.round(raw * 0.55);
        else if (defAction === 'magic_guard') raw = Math.round(raw * 0.65);
        let dmg = Math.round(Math.max(10, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        const healAmt = Math.round(25 + a.def * 0.8);
        a.hp = Math.min(a.maxHp, a.hp + healAmt);
        a.barrierHp = (a.barrierHp || 0) + 20;
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `🛡️✨ หัตถ์ศักดิ์สิทธิ์คุ้มครองพิภพ (Divine Aegis)! ${a.name} กางบาเรียศักดิ์สิทธิ์ฟาดแสงพิพากษา ${damageToDefender} ดาเมจ และฟื้นฟูเลือด ${healAmt} HP!${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else if (promoKey === 'crusader') {
        let raw = (a.atk * 2.2 + a.def * 1.3 + a.mag * 1.5 + 20) - defReduction * 0.6;
        if (defAction === 'defend') raw = Math.round(raw * 0.55);
        else if (defAction === 'magic_guard') raw = Math.round(raw * 0.65);
        let dmg = Math.round(Math.max(14, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        const healAmt = Math.round(a.maxHp * 0.40);
        a.hp = Math.min(a.maxHp, a.hp + healAmt);
        a.barrierHp = (a.barrierHp || 0) + 35;
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `👑🛡️ มหาปราการเทวาพิทักษ์จักรวาล (Aegis of the Heavens)! ${a.name} ปลดปล่อยแสงเทวทูต ${damageToDefender} ดาเมจ พร้อมฟื้นฟู ${healAmt} HP และสร้างเกราะศักดิ์สิทธิ์!${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else if (promoKey === 'berserker') {
        const hpCost = Math.max(1, Math.floor(a.hp * 0.15));
        a.hp = Math.max(1, a.hp - hpCost);
        let raw = (a.atk * 2.5 + 16) - defReduction * 0.75;
        if (defAction === 'defend') raw = Math.round(raw * 0.50);
        else if (defAction === 'counter') raw = Math.round(raw * 1.25);
        let dmg = Math.round(Math.max(12, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `🪓🩸 คลั่งโลหิตผ่าสวรรค์ (Blood Frenzy)! ${a.name} สละเลือด ${hpCost} HP ฟาดฟันบ้าคลั่งสร้างความเสียหาย ${damageToDefender} ดาเมจ!${isCrit ? ' 💥 คริติคอลคลั่งโลหิต!' : ''}`;
      } else if (promoKey === 'warlord') {
        const hpCost = Math.max(1, Math.floor(a.hp * 0.25));
        a.hp = Math.max(1, a.hp - hpCost);
        let raw = (a.atk * 3.2 + 22) - defReduction * 0.15;
        if (defAction === 'defend') raw = Math.round(raw * 0.65);
        else if (defAction === 'counter') raw = Math.round(raw * 1.3);
        let dmg = Math.round(Math.max(18, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `👑🩸 มหาดาบผ่าพิภพโลหิตเดือด (World Breaker)! ${a.name} สละเลือด ${hpCost} HP ผ่าทะลวงเกราะสร้างความเสียหายมหาศาล ${damageToDefender} ดาเมจ!${isCrit ? ' 💥 มหาคริติคอลราชัน!' : ''}`;
      } else if (promoKey === 'archmage') {
        let raw = (a.mag * 2.8 + 20) - magDefReduction * 0.6;
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.70);
        let dmg = Math.round(Math.max(14, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        d.def = Math.max(1, Math.floor((d.def || 5) * 0.85));
        d.burnTurns = Math.max(d.burnTurns || 0, 2);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `🔮🌟 มหาอุกกาบาตสิ้นพิภพ (Apocalypse Meteor)! ${a.name} เรียกฝนดาวตกถล่ม ${d.name} สร้างความเสียหาย ${damageToDefender} ดาเมจ และหลอมละลายเกราะป้องกัน!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ!)' : ''}${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else if (promoKey === 'grand_arcanist') {
        let raw = (a.mag * 3.5 + 26) - magDefReduction * 0.5;
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.70);
        let dmg = Math.round(Math.max(18, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        const mpDrain = Math.min(d.mp || 0, 25);
        d.mp = Math.max(0, (d.mp || 0) - mpDrain);
        if (d.playerRef) d.playerRef.mp = d.mp;
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `👑🌌 ซูเปอร์โนวาดับดารา (Supernova Cataclysm)! ${a.name} ระเบิดมหาดวงดาวสร้างความเสียหาย ${damageToDefender} ดาเมจ และสลาย MP ศัตรู ${mpDrain} หน่วย!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ!)' : ''}${isCrit ? ' 💥 มหาคริติคอลจักรวาล!' : ''}`;
      } else if (promoKey === 'necromancer') {
        let raw = Math.max(14, Math.floor(d.hp * 0.30) + Math.floor(a.mag * 1.7) - magDefReduction * 0.6);
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.70);
        let dmg = Math.round(Math.max(12, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        const drainedHp = Math.round(damageToDefender * 0.55);
        a.hp = Math.min(a.maxHp, a.hp + drainedHp);
        if (d.playerRef) d.playerRef.curseTurns = Math.max(d.playerRef.curseTurns, 3);
        narration = `💀🕯️ กองทัพวิญญาณกระดูกคืนชีพ (Army of the Damned)! ${a.name} สูบวิญญาณสร้างความเสียหาย ${damageToDefender} ดาเมจ และดูดกลืนชีวิต +${drainedHp} HP!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ!)' : ''}${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else if (promoKey === 'lich_king') {
        let raw = Math.max(20, Math.floor(d.maxHp * 0.35) + Math.floor(a.mag * 2.0) - magDefReduction * 0.5);
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.70);
        let dmg = Math.round(Math.max(16, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        const drainedHp = Math.round(damageToDefender * 0.65);
        a.hp = Math.min(a.maxHp, a.hp + drainedHp);
        a.barrierHp = (a.barrierHp || 0) + Math.round(damageToDefender * 0.40);
        if (d.playerRef) d.playerRef.curseTurns = Math.max(d.playerRef.curseTurns, 4);
        narration = `👑💀 มหาคำสาปกลืนวิญญาณนิรันดร์ (Soul Drain Apocalypse)! ${a.name} สูบพลังชีวิต ${damageToDefender} ดาเมจ ฟื้นฟู +${drainedHp} HP พร้อมสร้างเกราะวิญญาณ!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ!)' : ''}${isCrit ? ' 💥 มหาคริติคอลราชันลิช!' : ''}`;
      } else if (promoKey === 'ninja') {
        let raw = (a.atk * 1.9 + (a.spd || 5) * 1.3 + 12) - defReduction * 0.75;
        if (defAction === 'defend') raw = Math.round(raw * 0.50);
        if (!isCrit && getWorld().random() < 0.25) isCrit = true;
        let dmg = Math.round(Math.max(10, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        if (d.playerRef) d.playerRef.poisonTurns = Math.max(d.playerRef.poisonTurns, 3);
        narration = `🥷🌀 ดาวกระจายสังหารไร้เงา (Shadow Shuriken)! ${a.name} ปาดาวกระจายอาบพิษ 6 ดอก สร้างความเสียหาย ${damageToDefender} ดาเมจ และทำให้ติดพิษ!${defAction === 'defend' ? ' (ป้องกันลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอลเงาสังหาร!' : ''}`;
      } else if (promoKey === 'phantom_shinobi') {
        let raw = (a.atk * 2.2 + (a.spd || 5) * 1.6 + 18) - defReduction * 0.6;
        if (defAction === 'defend') raw = Math.round(raw * 0.55);
        let dmg = Math.round(Math.max(14, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        a.barrierHp = (a.barrierHp || 0) + 25;
        const stolen = d.playerRef ? Math.min(120, Math.floor(d.playerRef.gold * 0.30)) : 80;
        if (d.playerRef && a.playerRef) {
          d.playerRef.gold -= stolen;
          a.playerRef.gold += stolen;
        }
        narration = `👑🌀 หมื่นเงาพายุจักรพรรดิ (Infinite Phantom Gale)! ${a.name} พุ่งฟัน 8 ครั้งซ้อน สร้างความเสียหาย ${damageToDefender} ดาเมจ และฉกทอง ${stolen}G!${isCrit ? ' 💥 คริติคอลชิโนบิ!' : ''}`;
      } else if (promoKey === 'assassin') {
        let raw = (a.atk * 2.2 + (a.luk || 5) * 1.2 + 14) - defReduction * 0.6;
        if (defAction === 'defend') raw = Math.round(raw * 0.50);
        if (!isCrit && getWorld().random() < 0.40) isCrit = true;
        let dmg = Math.round(Math.max(12, raw));
        if (isCrit) dmg = Math.round(dmg * 1.8);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        const stolen = d.playerRef ? Math.min(90, Math.floor(d.playerRef.gold * 0.20)) : 65;
        if (d.playerRef && a.playerRef) {
          d.playerRef.gold -= stolen;
          a.playerRef.gold += stolen;
        }
        narration = `🗡️☠️ มรณภาพในพริบตา (Death Mark)! ${a.name} แทงจุดตายสร้างความเสียหาย ${damageToDefender} ดาเมจ และปล้นทอง ${stolen}G!${isCrit ? ' 💥 คริติคอลจุดตาย!' : ''}`;
      } else if (promoKey === 'shadow_reaper') {
        let raw = (a.atk * 2.6 + (a.luk || 5) * 1.5 + 20) - defReduction * 0.5;
        if (defAction === 'defend') raw = Math.round(raw * 0.55);
        isCrit = true;
        let dmg = Math.round(Math.max(16, raw) * 1.75);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        const stealRatio = d.hp <= 0 ? 0.50 : 0.25;
        const stolen = d.playerRef ? Math.min(200, Math.floor(d.playerRef.gold * stealRatio)) : 100;
        if (d.playerRef && a.playerRef) {
          d.playerRef.gold -= stolen;
          a.playerRef.gold += stolen;
        }
        narration = `👑☠️ เคียวเกี่ยววิญญาณมรณะ (Soul Harvester)! ${a.name} ฟาดเคียวจุดตายสร้างความเสียหายคริติคอล ${damageToDefender} ดาเมจ และชิงทอง ${stolen}G!`;
      } else if (promoKey === 'high_priest') {
        let raw = (a.mag * 2.4 + 18) - magDefReduction * 0.7;
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.65);
        let dmg = Math.round(Math.max(10, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        const healAmt = Math.round(35 + a.mag * 0.9);
        a.hp = Math.min(a.maxHp, a.hp + healAmt);
        a.burnTurns = 0; a.freezeTurns = 0; a.silenceTurns = 0; a.blindTurns = 0;
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `⛪✨ แสงทิพย์ชำระบาปสากล (Universal Radiance)! ${a.name} ปลดปล่อยลำแสงศักดิ์สิทธิ์ ${damageToDefender} ดาเมจ พร้อมฟื้นฟูเลือด ${healAmt} HP และชำระล้างสถานะผิดปกติ!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else if (promoKey === 'radiant_archon') {
        let raw = (a.mag * 2.9 + 24) - magDefReduction * 0.6;
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.65);
        let dmg = Math.round(Math.max(16, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        a.hp = a.maxHp;
        a.mp = Math.min(a.maxMp, a.mp + 20);
        a.burnTurns = 0; a.freezeTurns = 0; a.silenceTurns = 0; a.blindTurns = 0;
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `👑✨ พิพากษาแสงสวรรค์เก้าชั้นฟ้า (Nine Heavens Judgement)! ${a.name} ฟื้นฟูพลังชีวิตเต็ม 100% และยิงลำแสงสุริยันพิฆาต ${damageToDefender} ดาเมจ!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอลสวรรค์!' : ''}`;
      } else if (promoKey === 'saint') {
        let raw = (a.mag * 2.0 + (a.luk || 5) * 1.2 + 15) - magDefReduction * 0.7;
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.65);
        let dmg = Math.round(Math.max(10, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        const healHp = Math.round(a.maxHp * 0.50);
        const healMp = Math.round(a.maxMp * 0.25);
        a.hp = Math.min(a.maxHp, a.hp + healHp);
        a.mp = Math.min(a.maxMp, a.mp + healMp);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `🕊️💖 พรสวรรค์ปกปักชะตากรรม (Miracle Grace)! ${a.name} ร่ายพรปาฏิหาริย์ฟื้นฟู +${healHp} HP / +${healMp} MP และโจมตีศักดิ์สิทธิ์ ${damageToDefender} ดาเมจ!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอล!' : ''}`;
      } else if (promoKey === 'seraphic_saint') {
        let raw = (a.mag * 2.4 + (a.luk || 5) * 1.5 + 20) - magDefReduction * 0.6;
        if (defAction === 'magic_guard') raw = Math.round(raw * 0.35);
        else if (defAction === 'defend') raw = Math.round(raw * 0.65);
        let dmg = Math.round(Math.max(14, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        const healHp = Math.round(a.maxHp * 0.65);
        a.hp = Math.min(a.maxHp, a.hp + healHp);
        a.barrierHp = (a.barrierHp || 0) + 30;
        a.burnTurns = 0; a.freezeTurns = 0; a.silenceTurns = 0; a.blindTurns = 0;
        if (a.playerRef) a.playerRef.cleanseAilments();
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `👑💖 ปาฏิหาริย์ดวงดาราแห่งการฟื้นคืน (Miracle Resurrection)! ${a.name} ฟื้นฟู +${healHp} HP กางเกราะอมตะ และพิพากษาด้วยแสงดารา ${damageToDefender} ดาเมจ!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอลเซราฟ!' : ''}`;
      } else if (promoKey === 'rune_master') {
        let raw = (a.atk * 1.9 + a.mag * 1.9 + 16) - (defReduction * 0.45 + magDefReduction * 0.45);
        if (defAction === 'defend' || defAction === 'magic_guard') raw = Math.round(raw * 0.55);
        let dmg = Math.round(Math.max(12, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        d.isShocked = true;
        d.burnTurns = Math.max(d.burnTurns || 0, 1);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `⚔️🔮 ระบำดาบสิบมนตรา (Ten-Rune Blade Dance)! ${a.name} ร่ายดาบรูน 10 เล่มพุ่งฟันกวาดล้าง สร้างความเสียหาย ${damageToDefender} ดาเมจ!${defAction === 'defend' || defAction === 'magic_guard' ? ' (ป้องกันลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอลรูน!' : ''}`;
      } else if (promoKey === 'rune_sovereign') {
        let raw = (a.atk * 2.3 + a.mag * 2.3 + 22) - (defReduction * 0.35 + magDefReduction * 0.35);
        if (defAction === 'defend' || defAction === 'magic_guard') raw = Math.round(raw * 0.55);
        let dmg = Math.round(Math.max(16, raw));
        if (isCrit) dmg = Math.round(dmg * 1.5);
        d.isShocked = true;
        d.burnTurns = Math.max(d.burnTurns || 0, 2);
        damageToDefender = dmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `👑⚔️ มหาเพลงดาบจักรวาลอักขระ (Omni-Rune Cataclysm)! ${a.name} ผ่ามิติด้วยอักขระรูนจักรวาล สร้างความเสียหาย ${damageToDefender} ดาเมจ!${defAction === 'defend' || defAction === 'magic_guard' ? ' (ป้องกันลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 มหาคริติคอลอักขระ!' : ''}`;
      } else if (baseCls === 'magician') {
        const hpCost = Math.max(1, Math.floor(a.hp * 0.15));
        a.hp = Math.max(1, a.hp - hpCost);
        let rawExplosion = Math.max(15, Math.floor(d.hp * 0.25) + Math.floor(a.mag * 1.6) - magDefReduction * 0.7);
        if (defAction === 'magic_guard') {
          rawExplosion = Math.round(rawExplosion * 0.35);
        } else if (defAction === 'defend') {
          rawExplosion = Math.round(rawExplosion * 0.70);
        }
        let explosionDmg = Math.round(Math.max(10, rawExplosion));
        if (isCrit) explosionDmg = Math.round(explosionDmg * 1.5);
        damageToDefender = explosionDmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `💥 มหาเวทเอ็กซ์โพลชั่น (EXPLOSION)! ${a.name} สละเลือด ${hpCost} HP ร่ายมหาเวทระเบิด สร้างความเสียหาย ${damageToDefender} ดาเมจ!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจมหาศาล!)' : ''}${isCrit ? ' 💥 มหาคริติคอล!' : ''}`;
      } else if (baseCls === 'cleric') {
        let rawHoly = (a.mag * 2.2 + 15) - magDefReduction * 0.8;
        if (defAction === 'magic_guard') {
          rawHoly = Math.round(rawHoly * 0.3);
        } else if (defAction === 'defend') {
          rawHoly = Math.round(rawHoly * 0.65);
        }
        let holyDmg = Math.round(Math.max(8, rawHoly));
        if (isCrit) holyDmg = Math.round(holyDmg * 1.5);
        const healAmt = Math.round(20 + a.mag * 0.6);
        a.hp = Math.min(a.maxHp, a.hp + healAmt);
        damageToDefender = holyDmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `✝️ ทัณฑ์กางเขนศักดิ์สิทธิ์ (Holy Cross Judgment)! เสกกางเขนยักษ์ปักลงมาจากฟากฟ้า สร้างความเสียหายศักดิ์สิทธิ์ ${damageToDefender} ดาเมจ และฟื้นฟูเลือด ${healAmt} HP!${defAction === 'magic_guard' ? ' (โล่เวทลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอลศักดิ์สิทธิ์!' : ''}`;
      } else if (baseCls === 'warrior') {
        let rawCol = (a.atk * 2.4 + 12) - defReduction;
        if (defAction === 'defend') {
          rawCol = Math.round(rawCol * 0.45);
        } else if (defAction === 'counter') {
          rawCol = Math.round(rawCol * 1.2);
        }
        let colBladeDmg = Math.round(Math.max(8, rawCol));
        if (isCrit) colBladeDmg = Math.round(colBladeDmg * 1.5);
        damageToDefender = colBladeDmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `🗡️ ดาบยักษ์ผ่าปฐพี (Colossal Blade Groundbreak)! ${a.name} เสกดาบยักษ์ฟันสับ ${d.name} สร้างความเสียหาย ${damageToDefender} ดาเมจ!${defAction === 'defend' ? ' (ศัตรูตั้งการ์ดแน่นหนา!)' : ''}${isCrit ? ' 💥 คริติคอลสะเทือนฟ้าดิน!' : ''}`;
      } else if (baseCls === 'thief') {
        let rawClone = (a.atk * 1.7 + (a.spd || 5) * 1.1 + 10) - (defReduction * 0.85);
        if (defAction === 'defend') {
          rawClone = Math.round(rawClone * 0.5);
        }
        let cloneDmg = Math.round(Math.max(8, rawClone));
        if (isCrit) cloneDmg = Math.round(cloneDmg * 1.5);
        damageToDefender = cloneDmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        const stolen = Math.min(d.playerRef ? d.playerRef.gold : 60, 60);
        if (d.playerRef && a.playerRef) {
          d.playerRef.gold -= stolen;
          a.playerRef.gold += stolen;
        }
        narration = `👥 ห้าร่างเงาลวงสังหาร (5-Shadow Clone Illusion)! ร่างแยกเงา 5 ร่างพุ่งรุมฟัน สร้างความเสียหาย ${damageToDefender} ดาเมจ และฉกเงิน ${stolen}G!${defAction === 'defend' ? ' (ป้องกันลดทอนการฟัน)' : ''}${isCrit ? ' 💥 คริติคอลเงาสังหาร!' : ''}`;
      } else if (baseCls === 'spellblade' || baseCls.includes('spell') || baseCls.includes('ดาบเวท')) {
        let rawSlicer = (a.atk * 1.6 + a.mag * 1.6 + 12) - (defReduction * 0.5 + magDefReduction * 0.5);
        if (defAction === 'defend' || defAction === 'magic_guard') {
          rawSlicer = Math.round(rawSlicer * 0.55);
        }
        let slicerDmg = Math.round(Math.max(8, rawSlicer));
        if (isCrit) slicerDmg = Math.round(slicerDmg * 1.5);
        damageToDefender = slicerDmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `⚡ คลื่นดาบสายฟ้าสะบั้นพิภพ (Horizontal Lightning Slicer)! ${a.name} ปลดปล่อยคลื่นดาบสายฟ้าแนวนอน สร้างความเสียหาย ${damageToDefender} ดาเมจ!${defAction === 'defend' || defAction === 'magic_guard' ? ' (ป้องกันลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอลสายฟ้าฟาด!' : ''}`;
      } else {
        let rawGen = (a.atk * 2.0 + a.mag * 1.2 + 10) - defReduction;
        if (defAction === 'defend') rawGen = Math.round(rawGen * 0.5);
        let genericDmg = Math.round(Math.max(8, rawGen));
        if (isCrit) genericDmg = Math.round(genericDmg * 1.5);
        damageToDefender = genericDmg;
        d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
        narration = `🌟 ท่าไม้ตาย! ${a.name} ปลดปล่อย ${a.skillName || 'สกิลเฉพาะ'} สร้างความเสียหาย ${damageToDefender} ดาเมจ!${defAction === 'defend' ? ' (ป้องกันลดทอนดาเมจ)' : ''}${isCrit ? ' 💥 คริติคอล!' : ''}`;
      }

      // LUK Miracle Survival
      if (d.hp <= 0 && getWorld().random() < Math.min(0.30, (d.luk || 5) * 0.012)) {
        d.hp = 1;
        narration += ` 🍀 ปาฏิหาริย์แห่งโชค! ${d.name} รอดตายหวุดหวิดเหลือ 1 HP!`;
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
        isCritical: isCrit,
        narration
      };
    }

    // 6.5 Resolve EX Burst Limit Break
    if (atkAction === 'burst') {
      audio.limitBreak();
      const rawBurst = Math.round(a.atk * 3.4 + a.mag * 2.2 + 25);
      let burstDmg = rawBurst;
      if (defAction === 'defend') {
        burstDmg = Math.round(burstDmg * 0.75); // 75% penetrates defend
      }
      damageToDefender = burstDmg;
      d.hp = Math.round(Math.max(0, d.hp - damageToDefender));
      narration = `🔥💥 ปลดปล่อยพลังขีดสุด (LIMIT BREAK EX)! ${a.name} ปลดปล่อยมหาพลังสะเทือนฟ้าดิน ทะลวงการป้องกัน สร้างความเสียหายมหาศาล ${damageToDefender} ดาเมจ! 💥 คริติคอลสูงสุด!`;

      if (d.hp <= 0 && d.playerRef && d.playerRef.relics.includes('phoenix_amulet') && !d.hasResurrected) {
        d.hasResurrected = true;
        d.hp = Math.round(d.maxHp * 0.5);
        narration += ' 🔥🪶 มหาปาฏิหาริย์วิหคเพลิง (Phoenix Amulet)! คืนชีพทันทีด้วย 50% HP!';
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
        isCritical: true,
        isBurst: true,
        narration
      };
    }

    // 7. Resolve Attack
    // Speed Evasion Check (Faster defender can dodge standard attack if not defending)
    if (defAction !== 'defend' && defAction !== 'counter' && (d.spd || 5) > (a.spd || 5)) {
      const evasionChance = Math.min(0.40, ((d.spd || 5) - (a.spd || 5)) * 0.035);
      if (getWorld().random() < evasionChance) {
        narration = `⚡ ความว่องไวเหนือชั้น! ${d.name} (SPD ${d.spd}) เคลื่อนไหวรวดเร็วหลบการโจมตีของ ${a.name} ได้อย่างเฉียดฉิว! (0 ดาเมจ)`;
        return {
          attackerAction: atkAction,
          defenderAction: defAction,
          damageToDefender: 0,
          damageToAttacker: 0,
          isCounterSuccess,
          isStrikeSuccess,
          isMagicBlocked,
          isGiveUp,
          isDodged: true,
          narration
        };
      }
    }

    audio.attackHit();
    const rawAtk = Math.round(a.atk * 2.1 - (d.def || 5) * 0.75);
    let finalDmg = Math.round(Math.max(6, rawAtk + Math.floor(getWorld().random() * 5 - 2)));
    if (aPos === 'front') finalDmg = Math.round(finalDmg * 1.15);
    if (dPos === 'front') finalDmg = Math.round(finalDmg * 1.10);
    else if (dPos === 'mid') finalDmg = Math.round(finalDmg * 0.90);
    else if (dPos === 'back') finalDmg = Math.round(finalDmg * 0.85);

    // LUK Critical Hit for Attack
    let isCrit = false;
    if (getWorld().random() < Math.min(0.40, (a.luk || 5) * 0.015)) {
      isCrit = true;
      finalDmg = Math.round(finalDmg * 1.5);
    }

    // DEF Shield / Guard Scaling (High DEF mitigates even more damage!)
    if (defAction === 'defend') {
      const blockRatio = Math.max(0.18, 0.45 - (d.def || 5) * 0.0035);
      finalDmg = Math.round(Math.max(2, finalDmg * blockRatio));
      narration = `🛡️ ป้องกันสำเร็จ! ${d.name} ยกโล่และเกราะ (DEF ${d.def}) ลดทอนแรงปะทะ รับความเสียหายเพียง ${finalDmg} หน่วย!`;
      if (this.biome === 'waterfall_forest' || this.biome === 'fairy_grove') {
        const naturalHeal = Math.min(25, Math.round((d.maxHp || 100) * 0.08));
        d.hp = Math.min(d.maxHp, d.hp + naturalHeal);
        narration += ` 🌿[พรพฤกษาฟื้นฟู +${naturalHeal} HP]`;
      }
    } else if (defAction === 'counter') {
      // Counter failed! Full damage
      finalDmg = Math.round(finalDmg * 1.25);
      narration = `⚔️ สวนกลับพลาดเป้า! ${d.name} รอสวนกลับท่าชาร์จฟัน แต่โดนการโจมตีธรรมดาของ ${a.name} เต็มๆ ${finalDmg} ดาเมจ!${isCrit ? ' 💥 คริติคอล!' : ''}`;
    } else {
      narration = `⚔️ ${a.name} โจมตีด้วยอาวุธ สร้างความเสียหาย ${finalDmg} ดาเมจแก่ ${d.name}!${isCrit ? ' 💥 คริติคอล!' : ''}`;
    }

    // SPD Agile Double-Strike Check (High SPD heroines can land a bonus follow-up strike!)
    if ((a.spd || 5) - (d.spd || 5) >= 8 && getWorld().random() < 0.28) {
      const doubleStrikeDmg = Math.round(Math.max(4, finalDmg * 0.40));
      finalDmg += doubleStrikeDmg;
      narration += ` ⚡ ความเร็วเหนือชั้น! (SPD ${a.spd}) พุ่งโจมตีต่อเนื่องเบิ้ลดาเมจ +${doubleStrikeDmg} หน่วย!`;
    }

    d.hp = Math.round(Math.max(0, d.hp - finalDmg));
    damageToDefender = finalDmg;

    // LUK Miracle Survival
    if (d.hp <= 0 && getWorld().random() < Math.min(0.30, (d.luk || 5) * 0.012)) {
      d.hp = 1;
      narration += ` 🍀 ปาฏิหาริย์แห่งโชค! ${d.name} รอดตายหวุดหวิดเหลือ 1 HP!`;
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
      isCritical: isCrit,
      narration
    };
  }

  private applyPassivesAndSynergies(result: RoundResult): RoundResult {
    const a = this.attacker;
    const d = this.defender;

    // Guardian companion passive on defender
    if (d.playerRef && d.playerRef.companion && d.playerRef.companion.role === 'guardian' && result.damageToDefender > 0) {
      const reduced = Math.round(result.damageToDefender * 0.88);
      const diff = result.damageToDefender - reduced;
      result.damageToDefender = reduced;
      d.hp = Math.min(d.maxHp, d.hp + diff);
      result.narration += ` 🛡️ [คู่หูผู้พิทักษ์ลดทอน ${diff}]`;
    }

    // Striker companion passive on attacker
    if (a.playerRef && a.playerRef.companion && a.playerRef.companion.role === 'striker' && result.damageToDefender > 0) {
      const bonus = Math.round(result.damageToDefender * 0.12);
      result.damageToDefender += bonus;
      d.hp = Math.max(0, d.hp - bonus);
      result.narration += ` ⚔️ [คู่หูจู่โจมโบนัส +${bonus}]`;
    }

    // Weapon & Equipment Passives
    if (a.playerRef && result.damageToDefender > 0) {
      const passives = a.playerRef.getActivePassives();
      if (passives.includes('vampiric')) {
        const heal = Math.round(result.damageToDefender * 0.20);
        a.hp = Math.min(a.maxHp, a.hp + heal);
        result.narration += ` 🩸 [ดูดเลือด +${heal} HP]`;
      }
      if (passives.includes('burn')) {
        d.burnTurns = 2;
        const burnDmg = Math.round(result.damageToDefender * 0.15);
        d.hp = Math.max(0, d.hp - burnDmg);
        result.damageToDefender += burnDmg;
        result.narration += ` 🔥 [เพลิงแผดเผา +${burnDmg}]`;
      }
      if (passives.includes('gold_steal') && d.playerRef) {
        const stolen = Math.min(120, Math.max(10, Math.round(d.playerRef.gold * 0.08)));
        d.playerRef.gold -= stolen;
        a.playerRef.gold += stolen;
        result.narration += ` 💰 [ขโมยทอง +${stolen}G]`;
      }
      if (passives.includes('curse_strike') && d.playerRef && getWorld().random() < 0.40) {
        d.playerRef.curseTurns = 4;
        result.narration += ` 💀 [ติดคำสาปมรณะ!]`;
      }
    }

    // Elemental Weapon Runes (Fire, Ice, Thunder, Poison)
    if (a.playerRef && a.playerRef.weaponRune && result.damageToDefender > 0) {
      const rune = a.playerRef.weaponRune;
      if (rune === 'fire' && getWorld().random() < 0.50) {
        d.burnTurns = 2;
        const burnDmg = Math.max(8, Math.round(d.maxHp * 0.08));
        d.hp = Math.max(0, d.hp - burnDmg);
        result.damageToDefender += burnDmg;
        result.burnDamage = burnDmg;
        result.narration += ` 🔥 [รูนเพลิงลุกไหม้ +${burnDmg}]`;
      } else if (rune === 'ice' && getWorld().random() < 0.45) {
        d.freezeTurns = 1;
        result.statusInflicted = 'freeze';
        result.narration += ` ❄️ [รูนเหมันต์แช่แข็ง!]`;
      } else if (rune === 'thunder' && getWorld().random() < 0.40) {
        result.statusInflicted = 'shock';
        d.isShocked = true;
        result.narration += ` ⚡ [รูนสายฟ้าช็อตอัมพาต!]`;
      } else if (rune === 'poison' && getWorld().random() < 0.50) {
        result.statusInflicted = 'poison';
        if (d.playerRef) d.playerRef.poisonTurns = 3;
        result.narration += ` ☠️ [รูนพิษแล่นเข้าสู่ร่าง!]`;
      }
    }

    // Counter boost shield passive on defender
    if (d.playerRef && result.isCounterSuccess && result.damageToAttacker > 0) {
      const passives = d.playerRef.getActivePassives();
      if (passives.includes('counter_boost')) {
        const extraCounter = Math.round(result.damageToAttacker * 0.30);
        result.damageToAttacker += extraCounter;
        a.hp = Math.max(0, a.hp - extraCounter);
        result.narration += ` 🪞 [โล่สะท้อน +${extraCounter}]`;
      }
    }

    // Aegis Crest Relic: absorb initial damage
    if (d.playerRef && d.playerRef.relics.includes('aegis_crest') && result.damageToDefender > 0 && d.barrierHp === undefined) {
      d.barrierHp = 25;
      const absorbed = Math.min(result.damageToDefender, 25);
      result.damageToDefender -= absorbed;
      d.hp = Math.min(d.maxHp, d.hp + absorbed);
      result.narration += ` 🛡️✨ [เกราะอีจิสดูดซับ ${absorbed} ดาเมจ]`;
    }

    // Phoenix Amulet Relic: Resurrection check for defender
    if (d.hp <= 0 && d.playerRef && d.playerRef.relics.includes('phoenix_amulet') && !d.hasResurrected) {
      d.hasResurrected = true;
      d.hp = Math.round(d.maxHp * 0.5);
      result.narration += ` 🔥🪶 [ปาฏิหาริย์วิหคเพลิง คืนชีพ 50% HP!]`;
    }

    // Accrue EX Burst Gauge (+15 for attacker, +25 for defender taking damage)
    if (a.playerRef) {
      if (result.isBurst) {
        a.playerRef.burstGauge = 0;
      } else {
        a.playerRef.burstGauge = Math.min(100, a.playerRef.burstGauge + 15);
      }
    }
    if (d.playerRef && result.damageToDefender > 0) {
      d.playerRef.burstGauge = Math.min(100, d.playerRef.burstGauge + 25);
    }

    // Additional status triggers from combat actions
    // =========================================================================
    // 1. ELEMENTAL REACTIONS & SYNERGY
    // =========================================================================
    // A. Shatter: Physical Strike or Attack vs Frozen target -> 2.5x critical damage!
    if ((result.isStrikeSuccess || result.attackerAction === 'attack') && d.freezeTurns && d.freezeTurns > 0 && result.damageToDefender > 0) {
      result.isShatter = true;
      const shatterBonus = Math.round(result.damageToDefender * 1.5);
      result.damageToDefender += shatterBonus;
      d.hp = Math.max(0, d.hp - shatterBonus);
      d.freezeTurns = 0;
      audio.elementalShatter();
      result.narration += ` ❄️💥 [SHATTER! บดขยี้แช่แข็งแตกกระจาย +${shatterBonus} ดาเมจคริติคอล!]`;
    }

    // B. Chain Shock: Magic or Skill vs Shocked / Wet target -> +75% bonus damage!
    if ((result.attackerAction === 'magic' || result.attackerAction === 'skill') && (d.isShocked || d.isWet) && result.damageToDefender > 0) {
      result.isChainShock = true;
      const shockBonus = Math.round(result.damageToDefender * 0.75);
      result.damageToDefender += shockBonus;
      d.hp = Math.max(0, d.hp - shockBonus);
      d.isShocked = false;
      audio.chainLightning();
      result.narration += ` ⚡ [CHAIN SHOCK! สายฟ้าแล่นผ่านร่างเปียกชื้น +${shockBonus} ดาเมจ!]`;
    }

    // C. Conflagration: Magic or Skill vs Burning target -> instant explosion!
    if ((result.attackerAction === 'magic' || result.attackerAction === 'skill') && d.burnTurns && d.burnTurns > 0 && result.damageToDefender > 0) {
      result.isConflagration = true;
      const conflagDmg = Math.max(12, Math.floor(d.maxHp * 0.16));
      result.damageToDefender += conflagDmg;
      d.hp = Math.max(0, d.hp - conflagDmg);
      result.narration += ` 🔥💥 [CONFLAGRATION! เพลิงลุกไหม้ปะทุระเบิด +${conflagDmg} ดาเมจ!]`;
    }

    // =========================================================================
    // 2. KNOCKBACK & 3x3 TACTICAL GRID HAZARDS
    // =========================================================================
    if (result.isStrikeSuccess && result.damageToDefender > 0) {
      const curRow = d.gridPos || 'mid';
      let newRow: CombatGridPosition | null = null;
      if (curRow === 'front') newRow = 'mid';
      else if (curRow === 'mid') newRow = 'back';

      if (newRow) {
        d.gridPos = newRow;
        result.knockbackRow = newRow;
        result.narration += ` 💨 [แรงกระแทกซัดกระเด็นไปแถว ${newRow.toUpperCase()}!]`;

        const defHazards = this.isPlayerAttacking ? this.enemyHazards : this.playerHazards;
        const hz = defHazards[newRow];
        if (hz === 'spike_trap') {
          const trapDmg = 20;
          result.damageToDefender += trapDmg;
          d.hp = Math.max(0, d.hp - trapDmg);
          result.hazardTriggered = 'spike_trap';
          audio.hazardTrigger();
          result.narration += ` 📌 [ชนกับดักหนามเหล็ก +${trapDmg} ดาเมจ!]`;
        } else if (hz === 'poison_pool') {
          const pDmg = 14;
          result.damageToDefender += pDmg;
          d.hp = Math.max(0, d.hp - pDmg);
          if (d.playerRef) d.playerRef.poisonTurns = 3;
          result.hazardTriggered = 'poison_pool';
          audio.hazardTrigger();
          result.narration += ` 🧪 [ตกลงในบ่อพิษ +${pDmg} ดาเมจ!]`;
        }
      }
    }

    // Attacker Tactical Grid Slot Buffs
    const atkHazards = this.isPlayerAttacking ? this.playerHazards : this.enemyHazards;
    const aRow = a.gridPos || 'mid';
    if (atkHazards[aRow] === 'power_rune' && result.damageToDefender > 0) {
      const runeBonus = Math.round(result.damageToDefender * 0.25);
      result.damageToDefender += runeBonus;
      d.hp = Math.max(0, d.hp - runeBonus);
      result.narration += ` ⚡ [ศิลารูนแห่งพลัง +${runeBonus} ดาเมจ]`;
    } else if (atkHazards[aRow] === 'sanctuary_rune' && a.hp < a.maxHp) {
      const heal = 15;
      a.hp = Math.min(a.maxHp, a.hp + heal);
      result.narration += ` ✨ [รูนศักดิ์สิทธิ์ +${heal} HP]`;
    }

    // =========================================================================
    // 3. ADVANCED CLASS MASTERY PERKS (Tier 2 & Tier 3)
    // =========================================================================
    const dCls = (d.classKey || d.playerRef?.classKey || '').toLowerCase();
    const aCls = (a.classKey || a.playerRef?.classKey || '').toLowerCase();

    // Paladin / Crusader: Holy Aegis heal-on-block
    if ((dCls === 'paladin' || dCls === 'crusader' || dCls.includes('paladin') || dCls.includes('crusader')) && result.defenderAction === 'defend') {
      const isTier3 = dCls === 'crusader' || dCls.includes('crusader');
      const heal = isTier3 ? 20 : 12;
      d.hp = Math.min(d.maxHp, d.hp + heal);
      result.narration += ` 🛡️✨ [${isTier3 ? 'แกรนด์ครูเซเดอร์' : 'พาลาดิน'}: พรศักดิ์สิทธิ์ฟื้นฟู +${heal} HP]`;
    }
    // Berserker / Warlord: Blood Frenzy damage bonus when HP is below 50%
    if ((aCls === 'berserker' || aCls === 'warlord' || aCls.includes('berserk') || aCls.includes('warlord')) && a.hp < a.maxHp * 0.5 && result.damageToDefender > 0) {
      const isTier3 = aCls === 'warlord' || aCls.includes('warlord');
      const berserkBonus = Math.round(result.damageToDefender * (isTier3 ? 0.45 : 0.35));
      result.damageToDefender += berserkBonus;
      d.hp = Math.max(0, d.hp - berserkBonus);
      result.narration += ` 🪓🩸 [${isTier3 ? 'วอร์ลอร์ด' : 'เบอร์เซิร์กเกอร์'}: คลั่งโลหิต +${berserkBonus}]`;
    }
    // Archmage / Grand Arcanist: Spell penetration bonus
    if ((aCls === 'archmage' || aCls === 'grand_arcanist' || aCls.includes('archmage') || aCls.includes('arcanist')) && result.attackerAction === 'magic' && result.damageToDefender > 0) {
      const isTier3 = aCls === 'grand_arcanist' || aCls.includes('arcanist');
      const archBonus = Math.round(result.damageToDefender * (isTier3 ? 0.40 : 0.30));
      result.damageToDefender += archBonus;
      d.hp = Math.max(0, d.hp - archBonus);
      result.narration += ` 🔮🌟 [${isTier3 ? 'ปรมาจารย์มหาเวท' : 'มหาจอมเวท'}: ทะลวงมิติ +${archBonus}]`;
    }
    // Necromancer / Lich King: Soul Siphon life drain on damage dealt
    if ((aCls === 'necromancer' || aCls === 'lich_king' || aCls.includes('necro') || aCls.includes('lich')) && result.damageToDefender > 0) {
      const isTier3 = aCls === 'lich_king' || aCls.includes('lich');
      const siphon = Math.max(4, Math.round(result.damageToDefender * (isTier3 ? 0.25 : 0.18)));
      a.hp = Math.min(a.maxHp, a.hp + siphon);
      result.narration += ` 💀🕯️ [${isTier3 ? 'ราชันลิช' : 'เนโครแมนเซอร์'}: สูบวิญญาณ +${siphon} HP]`;
    }
    // Assassin / Shadow Reaper: Critical Strike mastery bonus
    if ((aCls === 'assassin' || aCls === 'shadow_reaper' || aCls.includes('assassin') || aCls.includes('reaper')) && result.isCritical && result.damageToDefender > 0) {
      const isTier3 = aCls === 'shadow_reaper' || aCls.includes('reaper');
      const assassinBonus = Math.round(result.damageToDefender * (isTier3 ? 0.65 : 0.50));
      result.damageToDefender += assassinBonus;
      d.hp = Math.max(0, d.hp - assassinBonus);
      result.narration += ` 🗡️☠️ [${isTier3 ? 'เพชฌฆาตเงา' : 'นักฆ่า'}: เล็งจุดตายสังหาร +${assassinBonus}]`;
    }
    // Ninja / Phantom Shinobi: Shadow Clone evasion chance
    if ((dCls === 'ninja' || dCls === 'phantom_shinobi' || dCls.includes('ninja') || dCls.includes('shinobi')) && (result.attackerAction === 'attack' || result.attackerAction === 'strike') && !result.isCounterSuccess) {
      const isTier3 = dCls === 'phantom_shinobi' || dCls.includes('shinobi');
      if (getWorld().random() < (isTier3 ? 0.28 : 0.22)) {
        result.isDodged = true;
        d.hp = Math.min(d.maxHp, d.hp + result.damageToDefender);
        result.damageToDefender = 0;
        result.narration = `🥷 [${isTier3 ? 'ชิโนบิเงาอนันต์' : 'นินจา'}: สลับท่อนไม้ร่างเงาหลบการโจมตีอย่างไร้รอยขีดข่วน!] (0 ดาเมจ)`;
      }
    }
    // High Priest / Radiant Archon: Divine Resurrection once per battle
    if ((dCls === 'high_priest' || dCls === 'radiant_archon' || dCls.includes('priest') || dCls.includes('archon')) && d.hp <= 0 && !d.hasResurrected) {
      const isTier3 = dCls === 'radiant_archon' || dCls.includes('archon');
      d.hasResurrected = true;
      d.hp = Math.round(d.maxHp * (isTier3 ? 0.50 : 0.35));
      result.narration += ` ⛪✨ [${isTier3 ? 'อัครเทวทูตสุริยัน' : 'มหาสมณะ'}: แสงทิพย์ชุบชีวิต ${isTier3 ? '50%' : '35%'} HP!]`;
    }
    // Saint / Seraphic Saint: Miracle Grace passive regeneration & ward
    if ((dCls === 'saint' || dCls === 'seraphic_saint' || dCls.includes('saint')) && d.hp > 0 && d.hp < d.maxHp) {
      const isTier3 = dCls === 'seraphic_saint' || dCls.includes('seraphic');
      const graceHeal = isTier3 ? 15 : 10;
      d.hp = Math.min(d.maxHp, d.hp + graceHeal);
      result.narration += ` 🕊️💖 [${isTier3 ? 'เซราฟศักดิ์สิทธิ์' : 'นักบุญหญิง'}: พรปาฏิหาริย์ฟื้นฟู +${graceHeal} HP]`;
    }
    if ((aCls === 'saint' || aCls === 'seraphic_saint' || aCls.includes('saint')) && a.hp > 0 && a.hp < a.maxHp) {
      const isTier3 = aCls === 'seraphic_saint' || aCls.includes('seraphic');
      const graceHeal = isTier3 ? 15 : 10;
      a.hp = Math.min(a.maxHp, a.hp + graceHeal);
      result.narration += ` 🕊️💖 [${isTier3 ? 'เซราฟศักดิ์สิทธิ์' : 'นักบุญหญิง'}: พรปาฏิหาริย์ฟื้นฟู +${graceHeal} HP]`;
    }
    // Rune Master / Rune Sovereign: Arcane Blade Resonance bonus damage
    if ((aCls === 'rune_master' || aCls === 'rune_sovereign' || aCls.includes('rune')) && (result.attackerAction === 'attack' || result.attackerAction === 'strike' || result.attackerAction === 'skill') && result.damageToDefender > 0) {
      const isTier3 = aCls === 'rune_sovereign' || aCls.includes('sovereign');
      const runeBonus = Math.max(4, Math.round((a.mag || 5) * (isTier3 ? 0.45 : 0.30)));
      result.damageToDefender += runeBonus;
      d.hp = Math.max(0, d.hp - runeBonus);
      result.narration += ` ⚔️🔮 [${isTier3 ? 'จอมราชันอักขระ' : 'ปรมาจารย์รูน'}: อักขระดาบมนตรา +${runeBonus}]`;
    }

    // =========================================================================
    // 4. COMPANION BOND GAINS & DUO EX BURST
    // =========================================================================
    if (a.playerRef) {
      a.playerRef.gainCompanionBond(4);
    }
    if (result.attackerAction === 'burst' && a.playerRef && a.playerRef.companion && (a.playerRef.companion.bondLevel || 1) >= 3) {
      result.isDuoBurst = true;
      const duoBonus = Math.round(result.damageToDefender * 0.5);
      result.damageToDefender += duoBonus;
      d.hp = Math.max(0, d.hp - duoBonus);
      result.narration += ` 🌟💖 [DUO EX: ${a.playerRef.companion.name} ประสานพลังท่าไม้ตายคู่หู +${duoBonus} ดาเมจ!]`;
    }

    // Additional status triggers from combat actions
    if (result.damageToDefender > 0 && result.attackerAction === 'magic' && getWorld().random() < 0.35) {
      d.silenceTurns = 2;
      result.narration += ` 🤐 [คำสาปเวท ติดสถานะใบ้ 2 เทิร์น!]`;
    }
    if (result.damageToDefender > 0 && result.attackerAction === 'strike' && getWorld().random() < 0.30) {
      d.blindTurns = 2;
      result.narration += ` 👁️ [สะเก็ดประกายแสง ติดสถานะตาบอด 2 เทิร์น!]`;
    }

    // Dragon Heart Relic: Immunity to Burn and Freeze
    if (d.playerRef?.relics.includes('dragon_heart')) {
      d.burnTurns = 0;
      d.freezeTurns = 0;
      d.playerRef.freezeTurns = 0;
      if (result.statusInflicted === 'freeze') result.statusInflicted = undefined;
    }
    if (a.playerRef?.relics.includes('dragon_heart')) {
      a.burnTurns = 0;
      a.freezeTurns = 0;
      a.playerRef.freezeTurns = 0;
    }

    // Burn DoT ticking at end of round
    if (d.burnTurns && d.burnTurns > 0 && d.hp > 0) {
      const dBurn = Math.max(6, Math.round(d.maxHp * 0.10));
      d.hp = Math.max(0, d.hp - dBurn);
      d.burnTurns--;
      result.burnDamage = (result.burnDamage || 0) + dBurn;
      result.damageToDefender += dBurn;
      result.narration += ` 🔥 [ไฟลุกไหม้ ${d.name} -${dBurn} HP!]`;
    }
    if (a.burnTurns && a.burnTurns > 0 && a.hp > 0) {
      const aBurn = Math.max(6, Math.round(a.maxHp * 0.10));
      a.hp = Math.max(0, a.hp - aBurn);
      a.burnTurns--;
      result.damageToAttacker += aBurn;
      result.narration += ` 🔥 [ไฟลุกไหม้ ${a.name} -${aBurn} HP!]`;
    }

    return result;
  }
}
