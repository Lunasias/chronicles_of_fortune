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
    name: 'นักรบ (Warrior)',
    avatar: '🛡️',
    color: '#3b82f6',
    baseHp: 130,
    baseMp: 25,
    atk: 15,
    def: 14,
    mag: 3,
    spd: 7,
    luk: 5,
    skillName: 'กล้ามเนื้อเหล็กไหล (Muscle Guard)',
    skillCost: 10,
    skillDesc: 'เกร็งกล้ามเนื้อดั่งเหล็กไหล เพิ่มพลังป้องกันและฟาดฟันกายภาพแรงขึ้น 1.3 เท่า'
  },
  magician: {
    name: 'จอมเวท (Magician)',
    avatar: '🔮',
    color: '#a855f7',
    baseHp: 85,
    baseMp: 80,
    atk: 5,
    def: 6,
    mag: 19,
    spd: 10,
    luk: 8,
    skillName: 'สูบกลืนมานา (Mana Burn)',
    skillCost: 18,
    skillDesc: 'สูบ 15 MP จากศัตรูพร้อมระเบิดเพลิงเวทมนตร์ทะลวงเกราะ'
  },
  thief: {
    name: 'จอมโจร (Thief)',
    avatar: '🗡️',
    color: '#10b981',
    baseHp: 100,
    baseMp: 40,
    atk: 12,
    def: 8,
    mag: 6,
    spd: 17,
    luk: 16,
    skillName: 'โจรกรรมฉับไว (Pickpocket)',
    skillCost: 12,
    skillDesc: 'โอกาสติดคริติคอลสูงมาก และฉกเงิน 40G จากกระเป๋าของเหยื่อทันที'
  },
  cleric: {
    name: 'นักบวช (Cleric)',
    avatar: '✨',
    color: '#f59e0b',
    baseHp: 110,
    baseMp: 60,
    atk: 9,
    def: 11,
    mag: 13,
    spd: 9,
    luk: 9,
    skillName: 'แสงศักดิ์สิทธิ์พิฆาต (Holy Smite)',
    skillCost: 16,
    skillDesc: 'ลำแสงศักดิ์สิทธิ์สร้างความเสียหายธาตุแสงรุนแรง และฟื้นฟู 25 HP'
  },
  spellblade: {
    name: 'จอมดาบเวท (Spellblade)',
    avatar: '⚔️✨',
    color: '#ec4899',
    baseHp: 115,
    baseMp: 50,
    atk: 14,
    def: 10,
    mag: 12,
    spd: 11,
    luk: 7,
    skillName: 'ดาบมนตราสังหาร (Spell Slash)',
    skillCost: 14,
    skillDesc: 'ผสานพลังเวทลงสู่คมดาบ ฟันทะลวงเกราะและสร้างความเสียหายรุนแรง'
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
    name: 'สายฟ้าฟาด (Thunderbolt)',
    icon: '⚡',
    mpCost: 15,
    desc: 'ฟาดสายฟ้าใส่ผู้เล่นเป้าหมาย สร้างดาเมจ 25 + MAG*1.5',
    requiresTarget: true
  },
  swap: {
    id: 'swap',
    name: 'สลับมิติ (Dimension Swap)',
    icon: '🔄',
    mpCost: 20,
    desc: 'สลับตำแหน่งบนกระดานกับผู้เล่นเป้าหมายในพริบตา',
    requiresTarget: true
  },
  tax_audit: {
    id: 'tax_audit',
    name: 'ตรวจสอบบัญชีหลวง (Royal Audit)',
    icon: '🧲',
    mpCost: 25,
    desc: 'ส่งเจ้าหน้าที่หลวงตรวจสอบ ยึดทอง 25% จากถุงเงินของผู้เล่นเป้าหมาย',
    requiresTarget: true
  },
  curse_rust: {
    id: 'curse_rust',
    name: 'คำสาปสนิมกัดกร่อน (Curse of Rust)',
    icon: '🩸',
    mpCost: 18,
    desc: 'กัดกร่อนอาวุธและชุดเกราะ ลดพลัง ATK และ DEF ของเป้าหมาย 30% นาน 3 เทิร์น',
    requiresTarget: true
  },
  holy_sanctuary: {
    id: 'holy_sanctuary',
    name: 'วิหารศักดิ์สิทธิ์ (Holy Sanctuary)',
    icon: '🕊️',
    mpCost: 30,
    desc: 'อัญเชิญพรแห่งแสง ฟื้นฟู HP เต็มเปี่ยม และลบล้างสถานะผิดปกติทั้งหมด',
    requiresTarget: false
  },
  castle_warp: {
    id: 'castle_warp',
    name: 'ประตูมิติกลับปราสาท (Castle Recall)',
    icon: '🚪',
    mpCost: 10,
    desc: 'เปิดประตูมิติย้ายกลับสู่ปราสาทหลวง (โหนด 0) ทันที',
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

export interface CompanionData {
  id: string;
  name: string;
  title: string;
  avatar: string;
  role: 'striker' | 'healer' | 'guardian' | 'mage';
  skillName: string;
  skillDesc: string;
  affinity: number;
  dialogue: string;
  color?: string;
}

export interface SkinVariantData {
  id: number;
  name: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
}

export const HERO_SKINS: Record<string, SkinVariantData[]> = {
  warrior: [
    { id: 0, name: 'อัศวินเกราะเงิน (Silver Vanguard)', theme: 'classic', primaryColor: '#e2e8f0', secondaryColor: '#dc2626' },
    { id: 1, name: 'อัศวินเงาทมิฬ (Shadow Knight)', theme: 'shadow', primaryColor: '#1e293b', secondaryColor: '#9333ea' },
    { id: 2, name: 'พาลาดินทองคำ (Golden Paladin)', theme: 'gold', primaryColor: '#fbbf24', secondaryColor: '#f8fafc' },
    { id: 3, name: 'ลอร์ดโลหิต (Crimson Sovereign)', theme: 'blood', primaryColor: '#991b1b', secondaryColor: '#18181b' }
  ],
  magician: [
    { id: 0, name: 'จอมเวทมนตรา (Arcane Violet)', theme: 'classic', primaryColor: '#a855f7', secondaryColor: '#ec4899' },
    { id: 1, name: 'เพลิงสุริยา (Solar Pyromancer)', theme: 'fire', primaryColor: '#f97316', secondaryColor: '#ef4444' },
    { id: 2, name: 'เหมันต์เยือกแข็ง (Glacial Frost)', theme: 'frost', primaryColor: '#38bdf8', secondaryColor: '#e0f2fe' },
    { id: 3, name: 'เนโครแมนเซอร์ (Plague Necro)', theme: 'poison', primaryColor: '#10b981', secondaryColor: '#064e3b' }
  ],
  thief: [
    { id: 0, name: 'จอมโจรสายลม (Wind Rogue)', theme: 'classic', primaryColor: '#10b981', secondaryColor: '#065f46' },
    { id: 1, name: 'นักฆ่าเงาราตรี (Night Assassin)', theme: 'shadow', primaryColor: '#0f172a', secondaryColor: '#ef4444' },
    { id: 2, name: 'พ่อค้าเถื่อนทมิฬ (Desert Scoundrel)', theme: 'sand', primaryColor: '#d97706', secondaryColor: '#78350f' },
    { id: 3, name: 'เงามายาปีศาจ (Phantom Shadow)', theme: 'phantom', primaryColor: '#7c3aed', secondaryColor: '#312e81' }
  ],
  cleric: [
    { id: 0, name: 'ผู้พิทักษ์วิหาร (Temple Guardian)', theme: 'classic', primaryColor: '#f8fafc', secondaryColor: '#fbbf24' },
    { id: 1, name: 'บาทหลวงมืด (Dark Inquisitor)', theme: 'dark', primaryColor: '#312e81', secondaryColor: '#a855f7' },
    { id: 2, name: 'นักพรตไพรพฤกษ์ (Nature Hermit)', theme: 'nature', primaryColor: '#15803d', secondaryColor: '#86efac' },
    { id: 3, name: 'เซราฟสรวงสวรรค์ (Celestial Seraph)', theme: 'celestial', primaryColor: '#0284c7', secondaryColor: '#fef08a' }
  ],
  spellblade: [
    { id: 0, name: 'ดาบมนตราคลาสสิก (Mystic Blade)', theme: 'classic', primaryColor: '#ec4899', secondaryColor: '#831843' },
    { id: 1, name: 'คมดาบอัสนี (Storm Spark)', theme: 'lightning', primaryColor: '#38bdf8', secondaryColor: '#facc15' },
    { id: 2, name: 'เพลิงนรกพิฆาต (Inferno Blade)', theme: 'inferno', primaryColor: '#ea580c', secondaryColor: '#7c2d12' },
    { id: 3, name: 'ผลึกเหมันต์ (Frost Shard)', theme: 'frost', primaryColor: '#bae6fd', secondaryColor: '#0284c7' }
  ]
};

export class Player {
  public id: number;
  public name: string;
  public classKey: string;
  public isAI: boolean;
  public skinVariant: number = 0;

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

  // Home & Companion Housing System
  public homeNodeId: number | null = null;
  public companion: CompanionData | null = null;

  // Color & Info
  public color: string;
  public className: string;
  public avatar: string;
  public skillName: string;

  constructor(id: number, name: string, classKey: string, isAI = false, startNodeId = 0, skinVariant = 0) {
    this.id = id;
    this.name = name;
    this.classKey = classKey;
    this.isAI = isAI;
    this.skinVariant = skinVariant;

    const base = HERO_CLASSES[classKey] || HERO_CLASSES['warrior'];
    this.className = base.name;
    const skins = HERO_SKINS[classKey] || HERO_SKINS['warrior'];
    const selectedSkin = skins[skinVariant] || skins[0];
    this.color = selectedSkin ? selectedSkin.primaryColor : base.color;
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
      name: 'น้ำยาฟื้นพลังชีวิต (Life Potion)',
      type: 'potion',
      cost: 35,
      desc: 'ฟื้นฟู 50 HP ทันที',
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
    let leveled = false;
    while (this.xp >= this.xpNeeded) {
      this.levelUp();
      leveled = true;
    }
    return leveled;
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
