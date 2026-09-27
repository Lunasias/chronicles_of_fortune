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
    baseHp: 90,
    baseMp: 25,
    atk: 14,
    def: 12,
    mag: 4,
    spd: 8,
    luk: 6,
    skillName: 'ดาบยักษ์ผ่าปฐพี (Colossal Blade)',
    skillCost: 10,
    skillDesc: 'เสกดาบยักษ์ผ่าปฐพีลงมาฟันสับศัตรู พื้นดินแตกกระจาย สร้างความเสียหายมหาศาล'
  },
  magician: {
    name: 'จอมเวท (Magician)',
    avatar: '🔮',
    color: '#a855f7',
    baseHp: 70,
    baseMp: 70,
    atk: 6,
    def: 7,
    mag: 16,
    spd: 10,
    luk: 8,
    skillName: 'เอ็กซ์โพลชั่น (Explosion)',
    skillCost: 18,
    skillDesc: 'สละ 20% HP เพื่อปลดปล่อยมหาเวทระเบิดทำลายล้าง 40% ของ Max HP เป้าหมาย!'
  },
  thief: {
    name: 'จอมโจร (Thief)',
    avatar: '🗡️',
    color: '#10b981',
    baseHp: 75,
    baseMp: 35,
    atk: 11,
    def: 8,
    mag: 6,
    spd: 14,
    luk: 14,
    skillName: 'ห้าร่างเงาลวงสังหาร (5-Shadow Clone)',
    skillCost: 12,
    skillDesc: 'แยกร่างเงา 5 ร่างรุมฟันจากทุกทิศทางด้วยความเร็วแสง และฉกเงินสดศัตรู'
  },
  cleric: {
    name: 'นักบวช (Cleric)',
    avatar: '✨',
    color: '#f59e0b',
    baseHp: 80,
    baseMp: 55,
    atk: 9,
    def: 10,
    mag: 13,
    spd: 9,
    luk: 9,
    skillName: 'ทัณฑ์กางเขนศักดิ์สิทธิ์ (Holy Cross Judgment)',
    skillCost: 16,
    skillDesc: 'เสกกางเขนแสงยักษ์ปักลงมาจากฟากฟ้า สร้างความเสียหายศักดิ์สิทธิ์และฟื้นฟูเลือด'
  },
  spellblade: {
    name: 'จอมดาบเวท (Spellblade)',
    avatar: '⚔️✨',
    color: '#ec4899',
    baseHp: 85,
    baseMp: 45,
    atk: 13,
    def: 10,
    mag: 11,
    spd: 10,
    luk: 7,
    skillName: 'คลื่นดาบสายฟ้าสะบั้นพิภพ (Lightning Slicer)',
    skillCost: 14,
    skillDesc: 'ปล่อยคลื่นดาบสายฟ้าแนวนอนผ่าผืนพิภพ กวาดล้างศัตรูด้วยพลังดาบเวท'
  }
};

export interface JobPromotionData {
  tier2Key: string;
  name: string;
  avatar: string;
  color: string;
  desc: string;
  statBonus: { hp: number; mp: number; atk: number; def: number; mag: number; spd: number; luk: number };
  skillName: string;
  skillCost: number;
  skillDesc: string;
}

export const JOB_PROMOTIONS: Record<string, JobPromotionData[]> = {
  warrior: [
    {
      tier2Key: 'paladin',
      name: 'พาลาดินศักดิ์สิทธิ์ (Paladin)',
      avatar: '🛡️✨',
      color: '#f59e0b',
      desc: 'อัศวินผู้ได้รับพรอันศักดิ์สิทธิ์ มีพลังป้องกันและเลือดมหาศาล',
      statBonus: { hp: 50, mp: 20, atk: 4, def: 8, mag: 4, spd: 2, luk: 4 },
      skillName: 'หัตถ์ศักดิ์สิทธิ์คุ้มครองพิภพ (Divine Aegis)',
      skillCost: 14,
      skillDesc: 'กางบาเรียศักดิ์สิทธิ์ ลดทอนดาเมจที่ได้รับและฟื้นฟูพลังชีวิตอย่างต่อเนื่อง'
    },
    {
      tier2Key: 'berserker',
      name: 'เบอร์เซิร์กเกอร์ (Berserker)',
      avatar: '🪓🩸',
      color: '#dc2626',
      desc: 'นักรบผู้บ้าคลั่ง ยิ่งเจ็บปวดยิ่งทวีพลังโจมตีอย่างรุนแรง',
      statBonus: { hp: 35, mp: 10, atk: 12, def: 2, mag: 0, spd: 6, luk: 2 },
      skillName: 'คลั่งโลหิตผ่าสวรรค์ (Blood Frenzy)',
      skillCost: 15,
      skillDesc: 'สละ 15% HP เพื่อฟาดฟันศัตรูด้วยพลังทำลายล้าง 250% ของ ATK'
    }
  ],
  magician: [
    {
      tier2Key: 'archmage',
      name: 'มหาจอมเวท (Archmage)',
      avatar: '🔮🌟',
      color: '#c084fc',
      desc: 'ปรมาจารย์แห่งศาสตร์เวทมนตร์ ปลดปล่อยมหาเวทธาตุทำลายล้าง',
      statBonus: { hp: 20, mp: 60, atk: 2, def: 3, mag: 14, spd: 4, luk: 4 },
      skillName: 'มหาอุกกาบาตสิ้นพิภพ (Apocalypse Meteor)',
      skillCost: 24,
      skillDesc: 'เรียกฝนดาวตกมหาเวทเผาผลาญศัตรู สร้างดาเมจมหาศาลและลดเกราะศัตรู'
    },
    {
      tier2Key: 'necromancer',
      name: 'เนโครแมนเซอร์ (Necromancer)',
      avatar: '💀🕯️',
      color: '#059669',
      desc: 'ผู้อัญเชิญวิญญาณแห่งความตาย ควบคุมคำสาปและพลังดูดกลืนชีวิต',
      statBonus: { hp: 30, mp: 40, atk: 4, def: 5, mag: 10, spd: 3, luk: 8 },
      skillName: 'กองทัพวิญญาณกระดูกคืนชีพ (Army of the Damned)',
      skillCost: 20,
      skillDesc: 'สาปแช่งและดูดกลืน HP ของศัตรู 30% มาฟื้นฟูตนเอง'
    }
  ],
  thief: [
    {
      tier2Key: 'ninja',
      name: 'นินจาเงาสังหาร (Ninja)',
      avatar: '🥷🌀',
      color: '#14b8a6',
      desc: 'นักรบแห่งเงามืด ว่องไวไร้ร่องรอยและหลบหลีกยอดเยี่ยม',
      statBonus: { hp: 25, mp: 25, atk: 7, def: 4, mag: 4, spd: 12, luk: 8 },
      skillName: 'ดาวกระจายสังหารไร้เงา (Shadow Shuriken)',
      skillCost: 16,
      skillDesc: 'ขว้างดาวกระจายอาบยาพิษ 6 ดอกติดคริติคอลสูงและทำให้ศัตรูติดพิษ'
    },
    {
      tier2Key: 'assassin',
      name: 'นักฆ่าไร้ร่องรอย (Assassin)',
      avatar: '🗡️☠️',
      color: '#e11d48',
      desc: 'เพชฌฆาตผู้เชี่ยวชาญการโจมตีจุดตาย ปลิดชีพเป้าหมายในพริบตา',
      statBonus: { hp: 20, mp: 20, atk: 11, def: 3, mag: 2, spd: 9, luk: 11 },
      skillName: 'มรณภาพในพริบตา (Death Mark)',
      skillCost: 18,
      skillDesc: 'เล็งจุดตายศัตรู มีโอกาสสูงมากที่จะเกิดคริติคอล 3 เท่าและปล้นทอง 20%'
    }
  ],
  cleric: [
    {
      tier2Key: 'high_priest',
      name: 'มหาสมณะ (High Priest)',
      avatar: '⛪✨',
      color: '#fbbf24',
      desc: 'ผู้รับใช้สวรรค์สูงสุด พลังรักษาอันศักดิ์สิทธิ์และเกราะเทวา',
      statBonus: { hp: 35, mp: 50, atk: 3, def: 8, mag: 10, spd: 3, luk: 6 },
      skillName: 'แสงทิพย์ชำระบาปสากล (Universal Radiance)',
      skillCost: 20,
      skillDesc: 'ปลดปล่อยแสงศักดิ์สิทธิ์ ฟื้นฟู HP เต็มและสร้างดาเมจแสงใส่ศัตรู'
    },
    {
      tier2Key: 'saint',
      name: 'นักบุญหญิง (Saintess)',
      avatar: '🕊️💖',
      color: '#f472b6',
      desc: 'สตรีผู้เปี่ยมด้วยความเมตตาและโชคชะตาแห่งปาฏิหาริย์',
      statBonus: { hp: 40, mp: 45, atk: 4, def: 6, mag: 8, spd: 4, luk: 12 },
      skillName: 'พรสวรรค์ปกปักชะตากรรม (Miracle Grace)',
      skillCost: 18,
      skillDesc: 'มอบพรปาฏิหาริย์ ฟื้นฟู HP/MP 50% และเพิ่มโอกาสหลบหลีกสูงสุด'
    }
  ],
  spellblade: [
    {
      tier2Key: 'rune_master',
      name: 'ปรมาจารย์อักขระมนตรา (Rune Master)',
      avatar: '⚔️🔮',
      color: '#f43f5e',
      desc: 'ผู้ผสานดาบและเวทมนตร์เข้าสู่อักขระรูนโบราณ ทรงพลังทั้งกายภาพและเวท',
      statBonus: { hp: 40, mp: 40, atk: 9, def: 6, mag: 9, spd: 7, luk: 6 },
      skillName: 'ระบำดาบสิบมนตรา (Ten-Rune Blade Dance)',
      skillCost: 20,
      skillDesc: 'ร่ายอักขระรูนดาบ 10 เล่มพุ่งฟันกวาดล้างทั้งทางกายภาพและเวทมนตร์'
    }
  ]
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
  poison_dart: {
    id: 'poison_dart',
    name: 'ลูกดอกพิษ (Poison Dart)',
    icon: '☠️',
    mpCost: 16,
    desc: 'ยิงลูกดอกพิษร้ายแรงใส่เป้าหมาย ติดสถานะ Poison 4 เทิร์น เสียเลือดเรื่อย ๆ',
    requiresTarget: true
  },
  frost_freeze: {
    id: 'frost_freeze',
    name: 'พายุเยือกแข็ง (Frost Freeze)',
    icon: '❄️',
    mpCost: 22,
    desc: 'ร่ายพายุหิมะแช่แข็งเป้าหมาย ติดสถานะ Freeze 2 เทิร์น ทอยเต๋าได้แค่ 1 แต้ม!',
    requiresTarget: true
  },
  flash_blind: {
    id: 'flash_blind',
    name: 'หมอกบอดตา (Flash Blind)',
    icon: '👁️',
    mpCost: 18,
    desc: 'สาดแสงจ้าใส่เป้าหมาย ตาบอด 3 เทิร์น โจมตีพลาด 40% ในการต่อสู้',
    requiresTarget: true
  },
  assassin_hit: {
    id: 'assassin_hit',
    name: 'สัญญาจ้างนักฆ่า (Assassin Contract)',
    icon: '🥷',
    mpCost: 35,
    desc: 'ส่งมือสังหารรับจ้างบุกจู่โจมเป้าหมาย ชิงเงิน 35% และส่งกลับรักษาตัวที่บ้าน/ปราสาท!',
    requiresTarget: true
  },
  dark_calamity: {
    id: 'dark_calamity',
    name: 'มหาภัยพิบัติแห่งความมืด (Demonic Calamity)',
    icon: '☄️',
    mpCost: 40,
    desc: 'พลังเฉพาะจอมมาร! ทำลายปราการเมืองของคู่แข่ง 2 เมือง ปลดปล่อยมอนสเตอร์ยึดคืน!',
    requiresTarget: false
  },
  dark_plague: {
    id: 'dark_plague',
    name: 'หมอกมรณะกลืนวิญญาณ (Plague Cloud)',
    icon: '🌪️',
    mpCost: 45,
    desc: 'พลังเฉพาะจอมมาร! ปล่อยหมอกคำสาปและพิษร้ายแรงใส่คู่แข่งทุกคนบนกระดาน!',
    requiresTarget: false
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
  /** Key into companions.json, which resolves the 64x64 model. Stable across saves. */
  spriteKey?: string;
  name: string;
  title: string;
  avatar: string;
  role: 'striker' | 'healer' | 'guardian' | 'mage' | 'slime';
  skillName: string;
  skillDesc: string;
  affinity: number;
  dialogue: string;
  color?: string;
  bonusDesc?: string;
  contractTurnsRemaining?: number;
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
    shield: EquipmentItem | null;
    armor: EquipmentItem | null;
    accessory: EquipmentItem | null;
  } = {
    weapon: null,
    shield: null,
    armor: null,
    accessory: null
  };

  public inventory: EquipmentItem[] = [];
  public fieldSpells: string[] = [];
  public rustTurns: number = 0;
  public poisonTurns: number = 0;
  public freezeTurns: number = 0;
  public blindTurns: number = 0;
  public curseTurns: number = 0;

  public getStatusAilments(): Array<{ type: 'rust' | 'poison' | 'freeze' | 'blind' | 'curse' | 'polymorph' | 'cursed_box'; name: string; icon: string; turns: number }> {
    const list: Array<{ type: 'rust' | 'poison' | 'freeze' | 'blind' | 'curse' | 'polymorph' | 'cursed_box'; name: string; icon: string; turns: number }> = [];
    if (this.polymorphTurns > 0) list.push({ type: 'polymorph', name: `สาปกลายร่าง (${this.polymorphType === 'mole' ? 'ตัวตุ่น' : 'หมู'})`, icon: this.polymorphType === 'mole' ? '🦔' : '🐷', turns: this.polymorphTurns });
    if (this.cursedBoxTurns > 0) list.push({ type: 'cursed_box', name: 'กล่องระเบิดต้องสาป (Ticking Box)', icon: '📦💥', turns: this.cursedBoxTurns });
    if (this.rustTurns > 0) list.push({ type: 'rust', name: 'สนิมกัดกร่อน (Rust)', icon: '🛡️', turns: this.rustTurns });
    if (this.poisonTurns > 0) list.push({ type: 'poison', name: 'พิษร้ายแรง (Poison)', icon: '☠️', turns: this.poisonTurns });
    if (this.freezeTurns > 0) list.push({ type: 'freeze', name: 'แช่แข็ง (Freeze)', icon: '❄️', turns: this.freezeTurns });
    if (this.blindTurns > 0) list.push({ type: 'blind', name: 'ตาบอด (Blind)', icon: '👁️', turns: this.blindTurns });
    if (this.curseTurns > 0) list.push({ type: 'curse', name: 'คำสาปมรณะ (Doom Curse)', icon: '💀', turns: this.curseTurns });
    return list;
  }

  public cleanseAilments(): void {
    this.rustTurns = 0;
    this.poisonTurns = 0;
    this.freezeTurns = 0;
    this.blindTurns = 0;
    this.curseTurns = 0;
    this.polymorphTurns = 0;
    this.polymorphType = null;
    this.cursedBoxTurns = 0;
  }

  public hasSetBonus(setName: string): boolean {
    const equipped = Object.values(this.equipment).filter(e => e && e.setName === setName);
    return equipped.length >= 2;
  }

  public getActivePassives(): string[] {
    const passives: string[] = [];
    Object.values(this.equipment).forEach(eq => {
      if (eq && eq.passive && !passives.includes(eq.passive)) {
        passives.push(eq.passive);
      }
    });
    return passives;
  }

  // Active Food & Adventurer Guild Quest
  public foodBuff: FoodBuff | null = null;
  public activeGuildQuest: GuildQuest | null = null;
  public guildRank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' = 'F';
  public completedQuestsCount = 0;

  // The Darkling Form
  public isDarkling = false;
  public darklingTurnsLeft = 0;
  public backupNormalStats: { maxHp: number; atk: number; def: number; mag: number; spd: number } | null = null;
  public darklingSpecialization: 'destroyer' | 'reaper' | 'tormentor' | null = null;

  // Humiliating Prank System
  public prank: PrankState = {
    hasGraffiti: false,
    turnsRemaining: 0
  };

  // EX Burst Limit Break Gauge (0 to 100)
  public burstGauge: number = 0;

  // Passive Relics
  public relics: string[] = [];

  // Blacksmith Forging & Runes
  public weaponUpgradeLevel: number = 0; // +1 to +9
  public weaponRune: 'fire' | 'ice' | 'thunder' | 'poison' | null = null;

  // Polymorph & Cursed Delivery Box Pranks
  public polymorphTurns: number = 0;
  public polymorphType: 'pig' | 'mole' | null = null;
  public mockeryTitle: string = '';
  public cursedBoxTurns: number = 0;

  // Home & Companion Housing System
  public homeNodeId: number | null = null;
  public companion: CompanionData | null = null;

  // Tier 2 Job Promotion & AI Personality
  public originalClassKey: string;
  public isPromoted: boolean = false;
  public aiPersonality: 'balanced' | 'economist' | 'hunter' | 'tactician' = 'balanced';

  // Match Summary & Hall of Fame Statistics
  public matchStats = {
    monstersKilled: 0,
    pvpWins: 0,
    goldEarnedTotal: 300,
    townsCapturedTotal: 0,
    pranksGiven: 0,
    pranksReceived: 0
  };

  // Color & Info
  public color: string;
  public className: string;
  public avatar: string;
  public skillName: string;

  constructor(id: number, name: string, classKey: string, isAI = false, startNodeId = 0, skinVariant = 0) {
    this.id = id;
    this.name = name;
    this.classKey = classKey;
    this.originalClassKey = classKey;
    this.isAI = isAI;
    this.skinVariant = skinVariant;

    if (isAI) {
      const personalities: Array<'balanced' | 'economist' | 'hunter' | 'tactician'> = ['balanced', 'economist', 'hunter', 'tactician'];
      this.aiPersonality = personalities[id % personalities.length];
    }

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
    let name = this.name;
    if (this.prank.hasGraffiti && this.prank.sillyName) {
      name = this.prank.sillyName;
    }
    if (this.mockeryTitle) {
      return `[${this.mockeryTitle}] ${name}`;
    }
    return name;
  }

  getTotalStat(stat: 'atk' | 'def' | 'mag' | 'spd' | 'luk'): number {
    if (this.polymorphTurns > 0) {
      return 1; // Turned into a helpless pig or mole!
    }
    let val = this[stat] || 0;
    if (this.isDarkling) {
      val = Math.floor(val * 2.5);
    }
    Object.values(this.equipment).forEach(item => {
      if (item && item[stat]) val += item[stat]!;
    });
    // Blacksmith Weapon Forging (+3 ATK, +1 SPD per level)
    if (this.weaponUpgradeLevel > 0) {
      if (stat === 'atk') val += this.weaponUpgradeLevel * 3;
      if (stat === 'spd') val += this.weaponUpgradeLevel;
    }
    // Active Isekai Food Buff
    if (this.foodBuff) {
      if (stat === 'atk' && this.foodBuff.atkBoost) val += this.foodBuff.atkBoost;
      if (stat === 'def' && this.foodBuff.defBoost) val += this.foodBuff.defBoost;
      if (stat === 'mag' && this.foodBuff.magBoost) val += this.foodBuff.magBoost;
      if (stat === 'spd' && this.foodBuff.spdBoost) val += this.foodBuff.spdBoost;
      if (stat === 'luk' && this.foodBuff.lukBoost) val += this.foodBuff.lukBoost;
    }
    // Berserker Fang relic (+40% ATK when HP < 35%)
    if (stat === 'atk' && this.relics.includes('berserker_fang') && this.hp < this.maxHp * 0.35) {
      val = Math.round(val * 1.4);
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

    // AI automatically promotes upon reaching Level 10
    if (this.isAI && this.canPromote()) {
      const available = this.getAvailablePromotions();
      if (available.length > 0) {
        // Choose based on personality
        const choice = (this.aiPersonality === 'hunter' || this.aiPersonality === 'economist') && available.length > 1
          ? available[1].tier2Key
          : available[0].tier2Key;
        this.promote(choice);
      }
    }

    return { hpGain, mpGain, atkGain, defGain, magGain };
  }

  canPromote(): boolean {
    return this.level >= 10 && !this.isPromoted && !this.isDarkling;
  }

  getAvailablePromotions(): JobPromotionData[] {
    const baseKey = this.originalClassKey || this.classKey;
    return JOB_PROMOTIONS[baseKey] || [];
  }

  promote(tier2Key: string): boolean {
    const promos = this.getAvailablePromotions();
    const target = promos.find(p => p.tier2Key === tier2Key);
    if (!target) return false;

    this.isPromoted = true;
    this.classKey = target.tier2Key;
    this.className = target.name;
    this.avatar = target.avatar;
    this.color = target.color;
    this.skillName = target.skillName;

    // Apply permanent promotion stat bonuses
    this.maxHp += target.statBonus.hp;
    this.hp = this.maxHp;
    this.maxMp += target.statBonus.mp;
    this.mp = this.maxMp;
    this.atk += target.statBonus.atk;
    this.def += target.statBonus.def;
    this.mag += target.statBonus.mag;
    this.spd += target.statBonus.spd;
    this.luk += target.statBonus.luk;

    return true;
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

    let poisonDamage = 0;
    if (this.poisonTurns > 0) {
      this.poisonTurns--;
      poisonDamage = Math.max(3, Math.round(this.maxHp * 0.06));
      this.hp = Math.max(1, this.hp - poisonDamage);
    }

    if (this.freezeTurns > 0) this.freezeTurns--;
    if (this.blindTurns > 0) this.blindTurns--;

    if (this.polymorphTurns > 0) {
      this.polymorphTurns--;
      if (this.polymorphTurns === 0) {
        this.polymorphType = null;
      }
    }

    let cursedBoxExploded = false;
    let cursedBoxDamage = 0;
    if (this.cursedBoxTurns > 0) {
      this.cursedBoxTurns--;
      if (this.cursedBoxTurns === 0) {
        cursedBoxExploded = true;
        cursedBoxDamage = Math.max(25, Math.floor(this.maxHp * 0.35));
        this.hp = Math.max(1, this.hp - cursedBoxDamage);
        const goldLost = Math.floor(this.gold * 0.25);
        this.gold -= goldLost;
      }
    }

    let curseTriggered = false;
    if (this.curseTurns > 0) {
      this.curseTurns--;
      if (this.curseTurns === 0) {
        curseTriggered = true;
        this.hp = 1;
      }
    }

    let hpHealed = 0;
    // Holy Set Bonus: 8% Max HP regen per turn
    if (this.hasSetBonus('holy_set') && this.hp < this.maxHp) {
      const heal = Math.round(this.maxHp * 0.08);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      hpHealed += heal;
    }

    // Companion Healer Passive
    if (this.companion && this.companion.role === 'healer' && this.hp < this.maxHp) {
      const heal = Math.round(this.maxHp * 0.05);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      hpHealed += heal;
    }

    let mpHealed = 0;
    // Companion Mage Passive
    if (this.companion && this.companion.role === 'mage' && this.mp < this.maxMp) {
      const mana = 5;
      this.mp = Math.min(this.maxMp, this.mp + mana);
      mpHealed += mana;
    }

    // Tick down mercenary companion contract (จำกัดสัญญา 3 เทิร์นจากกิลด์)
    let companionDeparted: string | undefined = undefined;
    if (this.companion && this.companion.contractTurnsRemaining !== undefined) {
      this.companion.contractTurnsRemaining--;
      if (this.companion.contractTurnsRemaining <= 0) {
        companionDeparted = this.companion.name;
        this.companion = null;
      }
    }

    return {
      companionDeparted,
      poisonDamage: poisonDamage > 0 ? poisonDamage : undefined,
      curseTriggered: curseTriggered ? true : undefined,
      hpHealed: hpHealed > 0 ? hpHealed : undefined,
      mpHealed: mpHealed > 0 ? mpHealed : undefined
    };
  }

  tickTurnEffects() {
    return this.tickTurn();
  }
}
