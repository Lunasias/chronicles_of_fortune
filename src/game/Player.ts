import { EquipmentItem, IsoDirection, PrankState } from '../engine/PixelSpriteGenerator';
import { BoardNode, DOKAPON_NODES } from './BoardMap';

export interface HeroClassData {
  name: string;
  avatar: string;
  color: string;
  baseHp: number;
  baseMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luk: number;
  skillName: string;
  skillCost: number;
  skillDesc: string;
}

export const HERO_CLASSES: Record<string, HeroClassData> = {
  warrior: {
    name: 'Warrior',
    avatar: '🛡️',
    color: '#3b82f6',
    baseHp: 130,
    baseMp: 25,
    atk: 15,
    def: 14,
    mag: 3,
    spd: 7,
    luk: 5,
    skillName: 'Muscle Guard',
    skillCost: 10,
    skillDesc: 'Hardens body, boosting defense and dealing 1.3x physical damage.'
  },
  magician: {
    name: 'Magician',
    avatar: '🔮',
    color: '#a855f7',
    baseHp: 85,
    baseMp: 80,
    atk: 5,
    def: 6,
    mag: 19,
    spd: 10,
    luk: 8,
    skillName: 'Mana Burn',
    skillCost: 18,
    skillDesc: 'Drains 15 MP from rival and blasts elemental fire bypassing armor.'
  },
  thief: {
    name: 'Thief',
    avatar: '🗡️',
    color: '#10b981',
    baseHp: 100,
    baseMp: 40,
    atk: 12,
    def: 8,
    mag: 6,
    spd: 17,
    luk: 16,
    skillName: 'Pickpocket',
    skillCost: 12,
    skillDesc: 'High critical chance; pilfers 40 Gold directly from the victim.'
  },
  cleric: {
    name: 'Cleric',
    avatar: '✨',
    color: '#f59e0b',
    baseHp: 110,
    baseMp: 60,
    atk: 9,
    def: 11,
    mag: 13,
    spd: 9,
    luk: 9,
    skillName: 'Holy Smite',
    skillCost: 16,
    skillDesc: 'Radiant holy damage and recovers 25 HP.'
  }
};

export interface FieldSpellData {
  id: string;
  name: string;
  icon: string;
  mpCost: number;
  desc: string;
  requiresTarget: boolean;
}

export const FIELD_SPELLS: Record<string, FieldSpellData> = {
  zap: {
    id: 'zap',
    name: 'Thunderbolt',
    icon: '⚡',
    mpCost: 15,
    desc: 'Strikes any target player with lightning, dealing 25 + MAG*1.5 damage.',
    requiresTarget: true
  },
  swap: {
    id: 'swap',
    name: 'Dimension Swap',
    icon: '🔄',
    mpCost: 20,
    desc: 'Instantly swaps board locations with any chosen player.',
    requiresTarget: true
  },
  tax_audit: {
    id: 'tax_audit',
    name: 'Royal Audit',
    icon: '🧲',
    mpCost: 25,
    desc: 'Audits target player, seizing 25% of their gold coin pouch.',
    requiresTarget: true
  },
  curse_rust: {
    id: 'curse_rust',
    name: 'Curse of Rust',
    icon: '🩸',
    mpCost: 18,
    desc: 'Corrodes target player weapons and armor, reducing ATK & DEF by 30% for 3 turns.',
    requiresTarget: true
  },
  holy_sanctuary: {
    id: 'holy_sanctuary',
    name: 'Holy Sanctuary',
    icon: '🕊️',
    mpCost: 30,
    desc: 'Blesses caster, fully recovering HP and curing all negative status.',
    requiresTarget: false
  },
  castle_warp: {
    id: 'castle_warp',
    name: 'Castle Recall',
    icon: '🚪',
    mpCost: 10,
    desc: 'Opens an astral portal teleporting directly back to Dokapon Castle (Tile 0).',
    requiresTarget: false
  }
};

export interface FoodBuff {
  name: string;
  icon: string;
  turnsRemaining: number;
  atkBoost?: number;
  defBoost?: number;
  magBoost?: number;
  spdBoost?: number;
  lukBoost?: number;
  mpRegen?: number;
}

export interface GuildQuest {
  id: string;
  title: string;
  rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  desc: string;
  targetType: 'monster' | 'town' | 'boss';
  currentProgress: number;
  targetCount: number;
  rewardGold: number;
  rewardXp: number;
}

export class Player {
  public id: number;
  public name: string;
  public classKey: string;
  public isAI: boolean;

  public level = 1;
  public xp = 0;
  public xpNeeded = 100;

  public maxHp: number;
  public hp: number;
  public maxMp: number;
  public mp: number;

  public atk: number;
  public def: number;
  public mag: number;
  public spd: number;
  public luk: number;

  public gold = 300;
  public townsControlled = 0;
  public townDeeds: number[] = [];

  // Movement on board
  public nodeId: number;
  public prevNodeId: number | null = null;
  public gridX: number;
  public gridY: number;
  public gridZ: number;
  public facing: IsoDirection = 'SE';
  public walkFrame = 0;

  // Active Item Spinner (e.g. 2-Spinner, 3-Spinner)
  public activeSpinnerMultiplier = 1;

  // Equipment & Inventory
  public equipment: {
    weapon: EquipmentItem | null;
    armor: EquipmentItem | null;
    accessory: EquipmentItem | null;
  } = {
    weapon: null,
    armor: null,
    accessory: null
  };

  public inventory: EquipmentItem[] = [];
  public fieldSpells: string[] = [];
  public rustTurns: number = 0;

  // Active Food & Adventurer Guild Quest
  public foodBuff: FoodBuff | null = null;
  public activeGuildQuest: GuildQuest | null = null;
  public guildRank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' = 'F';
  public completedQuestsCount = 0;

  // The Darkling Form
  public isDarkling = false;
  public darklingTurnsLeft = 0;
  public backupNormalStats: { maxHp: number; atk: number; def: number; mag: number; spd: number } | null = null;

  // Humiliating Prank System
  public prank: PrankState = {
    hasGraffiti: false,
    turnsRemaining: 0
  };

  // Color & Info
  public color: string;
  public className: string;
  public avatar: string;
  public skillName: string;

  constructor(id: number, name: string, classKey: string, isAI = false, startNodeId = 0) {
    this.id = id;
    this.name = name;
    this.classKey = classKey;
    this.isAI = isAI;

    const base = HERO_CLASSES[classKey] || HERO_CLASSES['warrior'];
    this.className = base.name;
    this.color = base.color;
    this.avatar = base.avatar;
    this.skillName = base.skillName;

    this.maxHp = base.baseHp;
    this.hp = base.baseHp;
    this.maxMp = base.baseMp;
    this.mp = base.baseMp;
    this.atk = base.atk;
    this.def = base.def;
    this.mag = base.mag;
    this.spd = base.spd;
    this.luk = base.luk;

    this.nodeId = startNodeId;
    const startNode = DOKAPON_NODES.find(n => n.id === startNodeId) || DOKAPON_NODES[0];
    this.gridX = startNode.gx;
    this.gridY = startNode.gy;
    this.gridZ = startNode.gz;

    // Starting basic bag & field grimoire
    this.inventory.push({
      id: 'pot_hp',
      name: 'Life Potion',
      type: 'potion',
      cost: 35,
      desc: 'Restores 50 HP',
      icon: '🧪'
    });

    // Starter field magic spells
    this.fieldSpells = ['zap', 'swap', 'holy_sanctuary'];
  }

  get displayName(): string {
    if (this.prank.hasGraffiti && this.prank.sillyName) {
      return this.prank.sillyName;
    }
    return this.name;
  }

  getTotalStat(stat: 'atk' | 'def' | 'mag' | 'spd' | 'luk'): number {
    let val = this[stat] || 0;
    if (this.isDarkling) {
      val = Math.floor(val * 2.5);
    }
    Object.values(this.equipment).forEach(item => {
      if (item && item[stat]) val += item[stat]!;
    });
    // Active Isekai Food Buff
    if (this.foodBuff) {
      if (stat === 'atk' && this.foodBuff.atkBoost) val += this.foodBuff.atkBoost;
      if (stat === 'def' && this.foodBuff.defBoost) val += this.foodBuff.defBoost;
      if (stat === 'mag' && this.foodBuff.magBoost) val += this.foodBuff.magBoost;
      if (stat === 'spd' && this.foodBuff.spdBoost) val += this.foodBuff.spdBoost;
      if (stat === 'luk' && this.foodBuff.lukBoost) val += this.foodBuff.lukBoost;
    }
    // Curse of Rust reduces physical attack and defense by 30%
    if (this.rustTurns > 0 && (stat === 'atk' || stat === 'def')) {
      val = Math.max(1, Math.floor(val * 0.7));
    }
    return val;
  }

  // Calculate Dokapon Net Worth (Cash + Equipment Values + Town Asset Values)
  getNetWorth(allNodes: BoardNode[]): number {
    let worth = this.gold;

    // Equipment value
    Object.values(this.equipment).forEach(eq => {
      if (eq) worth += eq.cost;
    });

    // Town deeds value
    this.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.townData) {
        worth += node.townData.baseValue * node.townData.level;
      }
    });

    return worth;
  }

  gainXP(amount: number): boolean {
    this.xp += amount;
    if (this.xp >= this.xpNeeded) {
      this.levelUp();
      return true;
    }
    return false;
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpNeeded;
    this.xpNeeded = Math.floor(this.xpNeeded * 1.5);

    const hpGain = 20 + Math.floor(Math.random() * 8);
    const mpGain = 10 + Math.floor(Math.random() * 6);
    const atkGain = 2 + Math.floor(Math.random() * 3);
    const defGain = 2 + Math.floor(Math.random() * 2);
    const magGain = 2 + Math.floor(Math.random() * 2);

    this.maxHp += hpGain;
    this.hp = this.maxHp;
    this.maxMp += mpGain;
    this.mp = this.maxMp;
    this.atk += atkGain;
    this.def += defGain;
    this.mag += magGain;

    return { hpGain, mpGain, atkGain, defGain, magGain };
  }

  // Transform to The Darkling!
  becomeDarkling() {
    this.isDarkling = true;
    this.darklingTurnsLeft = 14;

    this.backupNormalStats = {
      maxHp: this.maxHp,
      atk: this.atk,
      def: this.def,
      mag: this.mag,
      spd: this.spd
    };

    // Boost stats
    this.maxHp = Math.floor(this.maxHp * 2.5);
    this.hp = this.maxHp;
    this.atk = Math.floor(this.atk * 2.2);
    this.def = Math.floor(this.def * 2.0);
    this.spd = Math.floor(this.spd * 1.8);

    // Darkling rolls 3 dice!
    this.activeSpinnerMultiplier = 3;
  }

  revertDarkling() {
    if (!this.isDarkling) return;
    this.isDarkling = false;
    this.darklingTurnsLeft = 0;
    if (this.backupNormalStats) {
      this.maxHp = this.backupNormalStats.maxHp;
      this.hp = Math.min(this.hp, this.maxHp);
      this.atk = this.backupNormalStats.atk;
      this.def = this.backupNormalStats.def;
      this.mag = this.backupNormalStats.mag;
      this.spd = this.backupNormalStats.spd;
    }
    this.activeSpinnerMultiplier = 1;
  }

  applyPrank(type: 'mustache' | 'spiral' | 'clown', sillyName?: string, duration = 14) {
    this.prank = {
      hasGraffiti: true,
      graffitiType: type,
      originalName: this.name,
      sillyName: sillyName || 'Goofball',
      turnsRemaining: duration
    };
  }

  tickTurn() {
    // Tick down Darkling form
    if (this.isDarkling) {
      this.darklingTurnsLeft--;
      if (this.darklingTurnsLeft <= 0) {
        this.revertDarkling();
      }
    }

    // Tick down prank
    if (this.prank.hasGraffiti && this.prank.turnsRemaining) {
      this.prank.turnsRemaining--;
      if (this.prank.turnsRemaining <= 0) {
        this.prank.hasGraffiti = false;
        this.prank.sillyName = undefined;
      }
    }

    // Tick down rust curse
    if (this.rustTurns > 0) {
      this.rustTurns--;
    }
  }
}
