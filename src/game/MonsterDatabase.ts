import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { judgeThreat, scaleMonster, tierForNode } from './BalanceSystem';

export interface MonsterProfile {
  name: string;
  title: string;
  realmId: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luk: number;
  skillName: string;
  skillDesc: string;
  lootDrop: string;
  goldReward: number;
  xpReward: number;
  icon: string;
  weakness?: string;
}

export const REALM_MONSTER_ROSTERS: Record<string, MonsterProfile[]> = {
  solaria: [
    {
      name: 'Slime Princess Aurelia',
      title: 'เจ้าหญิงสไลม์วุ้นมรกต',
      realmId: 'solaria',
      level: 2,
      hp: 55,
      maxHp: 55,
      mp: 20,
      maxMp: 20,
      atk: 12,
      def: 6,
      mag: 8,
      spd: 7,
      luk: 6,
      skillName: 'Jelly Acid Splash',
      skillDesc: 'สาดน้ำกรดวุ้นกัดกร่อนเกราะ',
      lootDrop: 'Potion',
      goldReward: 35,
      xpReward: 25,
      icon: '🟢',
      weakness: 'เวทไฟ (Magic)'
    },
    {
      name: 'Goblin Thief Girl Rikka',
      title: 'สาวน้อยก็อบลินจอมซน',
      realmId: 'solaria',
      level: 4,
      hp: 75,
      maxHp: 75,
      mp: 22,
      maxMp: 22,
      atk: 16,
      def: 8,
      mag: 6,
      spd: 12,
      luk: 10,
      skillName: 'Nimble Pocket Pick',
      skillDesc: 'ลอบตวัดมีดสั้นฉกชิงจังหวะ',
      lootDrop: 'Bronze Dagger',
      goldReward: 55,
      xpReward: 40,
      icon: '👺',
      weakness: 'เวทมนตร์ (Magic)'
    },
    {
      name: 'Panther Huntress Kaelia',
      title: 'สาวเสือดาวเงาทมิฬ',
      realmId: 'solaria',
      level: 5,
      hp: 85,
      maxHp: 85,
      mp: 25,
      maxMp: 25,
      atk: 18,
      def: 9,
      mag: 8,
      spd: 15,
      luk: 11,
      skillName: 'Shadow Pounce',
      skillDesc: 'กระโจนตะปบจากเงามืดหลบหลีกยาก',
      lootDrop: 'Speed Elixir',
      goldReward: 70,
      xpReward: 48,
      icon: '🐆',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  emerald: [
    {
      name: 'Catgirl Huntress Mia',
      title: 'แคทเกิร์ลนักล่าลำธารมรกต',
      realmId: 'emerald',
      level: 7,
      hp: 110,
      maxHp: 110,
      mp: 35,
      maxMp: 35,
      atk: 25,
      def: 13,
      mag: 12,
      spd: 18,
      luk: 15,
      skillName: 'Cascade Pounce',
      skillDesc: 'กระโจนตะปบจากม่านน้ำตกฉับไว',
      lootDrop: 'T2 คมดาบมิธริล',
      goldReward: 110,
      xpReward: 75,
      icon: '🐱',
      weakness: 'สวนกลับ (Counter)'
    },
    {
      name: 'Elf Princess Sylphira',
      title: 'เจ้าหญิงไฮเอลฟ์แห่งพงไพร',
      realmId: 'emerald',
      level: 9,
      hp: 140,
      maxHp: 140,
      mp: 60,
      maxMp: 60,
      atk: 28,
      def: 18,
      mag: 32,
      spd: 16,
      luk: 14,
      skillName: 'Sylph Cascade Arrow',
      skillDesc: 'ยิงศรเวทมนตร์สายน้ำทะลวงเกราะ',
      lootDrop: 'T3 ดาบเพลิงลาวา',
      goldReward: 150,
      xpReward: 95,
      icon: '🧝‍♀️',
      weakness: 'ชาร์จฟัน (Strike)'
    },
    {
      name: 'Mermaid Siren Nerida',
      title: 'ไซเรนเงือกสาววังน้ำวน',
      realmId: 'emerald',
      level: 8,
      hp: 125,
      maxHp: 125,
      mp: 45,
      maxMp: 45,
      atk: 24,
      def: 16,
      mag: 28,
      spd: 14,
      luk: 12,
      skillName: 'Siren Deluge Song',
      skillDesc: 'บทเพลงไซเรนสะกดจิตและเรียกน้ำวน',
      lootDrop: 'T2 โล่อัศวินเหล็กกล้า',
      goldReward: 130,
      xpReward: 85,
      icon: '🧜‍♀️',
      weakness: 'เวทสายฟ้า (Magic)'
    },
    {
      name: 'Dryad Nymph Alura',
      title: 'พรายไม้ดรายแอดสาว',
      realmId: 'emerald',
      level: 5,
      hp: 95,
      maxHp: 95,
      mp: 30,
      maxMp: 30,
      atk: 17,
      def: 15,
      mag: 14,
      spd: 6,
      luk: 8,
      skillName: 'Verdant Entangle',
      skillDesc: 'พันธนาการด้วยเถาวัลย์บุปผาโบราณ',
      lootDrop: 'T1 โล่กลมไม้โอ๊ค',
      goldReward: 75,
      xpReward: 52,
      icon: '🌸',
      weakness: 'เวทไฟ (Magic)'
    },
    {
      name: 'Lupine Wolfgirl Fenra',
      title: 'สาวหมาป่าพรานล่าแห่งพงไพร',
      realmId: 'emerald',
      level: 6,
      hp: 105,
      maxHp: 105,
      mp: 25,
      maxMp: 25,
      atk: 22,
      def: 11,
      mag: 7,
      spd: 16,
      luk: 12,
      skillName: 'Lupine Moon Claw',
      skillDesc: 'กรงเล็บจันทร์เสี้ยวฉีกกระชากอย่างว่องไว',
      lootDrop: 'T1 ดาบกว้างเหล็กกล้า',
      goldReward: 90,
      xpReward: 65,
      icon: '🐺',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  frostfall: [
    {
      name: 'Skeletal Maid Charlotte',
      title: 'เมดโครงกระดูกดาบน้ำแข็ง',
      realmId: 'frostfall',
      level: 7,
      hp: 100,
      maxHp: 100,
      mp: 20,
      maxMp: 20,
      atk: 21,
      def: 14,
      mag: 10,
      spd: 10,
      luk: 7,
      skillName: 'Frost Rapier Thrust',
      skillDesc: 'แทงดาบน้ำแข็งเย็นยะเยือกแช่แข็งเป้าหมาย',
      lootDrop: 'Frost Rapier',
      goldReward: 100,
      xpReward: 70,
      icon: '💀',
      weakness: 'ชาร์จฟัน (Strike)'
    },
    {
      name: 'Yeti Maiden Borealia',
      title: 'สาวยักษ์เยติหิมะ',
      realmId: 'frostfall',
      level: 8,
      hp: 135,
      maxHp: 135,
      mp: 25,
      maxMp: 25,
      atk: 26,
      def: 16,
      mag: 8,
      spd: 8,
      luk: 8,
      skillName: 'Glacial Avalanche Slam',
      skillDesc: 'ทุบหิมะผลึกถล่มสะเทือนพสุธา',
      lootDrop: 'Steel Cuirass',
      goldReward: 125,
      xpReward: 85,
      icon: '❄️',
      weakness: 'เวทไฟ (Magic)'
    }
  ],
  sunfire: [
    {
      name: 'Desert Bandit Queen Shani',
      title: 'หัวหน้ากองโจรสาวทะเลทราย',
      realmId: 'sunfire',
      level: 6,
      hp: 95,
      maxHp: 95,
      mp: 20,
      maxMp: 20,
      atk: 22,
      def: 11,
      mag: 8,
      spd: 14,
      luk: 10,
      skillName: 'Mirage Sand Slash',
      skillDesc: 'ตวัดดาบพายุทรายภาพลวงตา',
      lootDrop: 'Desert Scimitar',
      goldReward: 95,
      xpReward: 65,
      icon: '🗡️',
      weakness: 'สวนกลับ (Counter)'
    },
    {
      name: 'Pharaoh Priestess Nefertia',
      title: 'ฟาโรห์สาวสุสานศิลาทราย',
      realmId: 'sunfire',
      level: 7,
      hp: 125,
      maxHp: 125,
      mp: 35,
      maxMp: 35,
      atk: 21,
      def: 17,
      mag: 18,
      spd: 7,
      luk: 9,
      skillName: 'Curse of the Sands',
      skillDesc: 'คำสาปทรายดูดกลืนพลังชีวิต',
      lootDrop: 'Pharaoh Amulet',
      goldReward: 115,
      xpReward: 80,
      icon: '🏺',
      weakness: 'เวทไฟ (Magic)'
    }
  ],
  dwarf: [
    {
      name: 'Clockwork Maid Nicole',
      title: 'หุ่นกลเมดสาวพลังไอน้ำ',
      realmId: 'dwarf',
      level: 8,
      hp: 140,
      maxHp: 140,
      mp: 20,
      maxMp: 20,
      atk: 25,
      def: 22,
      mag: 10,
      spd: 7,
      luk: 6,
      skillName: 'Steam Overdrive',
      skillDesc: 'เร่งไอน้ำอุณหภูมิสูงชาร์จโจมตีทะลวงเกราะ',
      lootDrop: 'Clockwork Mail',
      goldReward: 140,
      xpReward: 95,
      icon: '⚙️',
      weakness: 'เวทมนตร์ (Magic)'
    }
  ],
  lava: [
    {
      name: 'Hellhound Fiend Cerbia',
      title: 'สาวหมานรกเพลิงโลกันตร์',
      realmId: 'lava',
      level: 9,
      hp: 130,
      maxHp: 130,
      mp: 30,
      maxMp: 30,
      atk: 30,
      def: 13,
      mag: 16,
      spd: 17,
      luk: 11,
      skillName: 'Infernal Crunch',
      skillDesc: 'กัดฉีกร่างด้วยเปลวเพลิงนรกเผาผลาญ',
      lootDrop: 'Hellhound Fang',
      goldReward: 160,
      xpReward: 115,
      icon: '🔥',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  coral: [
    {
      name: 'Corsair Siren Captain Morgana',
      title: 'กัปตันโจรสลัดสาวไซเรน',
      realmId: 'coral',
      level: 8,
      hp: 110,
      maxHp: 110,
      mp: 28,
      maxMp: 28,
      atk: 25,
      def: 12,
      mag: 15,
      spd: 15,
      luk: 13,
      skillName: 'Siren Tempest Song',
      skillDesc: 'บทเพลงพายุไซเรนสะกดจิตคู่ต่อสู้',
      lootDrop: 'Corsair Tricorne',
      goldReward: 135,
      xpReward: 88,
      icon: '🧜‍♀️',
      weakness: 'ชาร์จฟัน (Strike)'
    }
  ],
  abyss: [
    {
      name: 'Nether Valkyrie Morrigan',
      title: 'วัลคิรีแห่งความมืดมิด',
      realmId: 'abyss',
      level: 11,
      hp: 165,
      maxHp: 165,
      mp: 35,
      maxMp: 35,
      atk: 34,
      def: 23,
      mag: 22,
      spd: 14,
      luk: 10,
      skillName: 'Void Cleave',
      skillDesc: 'ฟาดดาบผ่ามิติดูดกลืนวิญญาณสู่ห้วงอเวจี',
      lootDrop: 'Abyssal Greatsword',
      goldReward: 230,
      xpReward: 165,
      icon: '🌌',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  celestial: [
    {
      name: 'Celestial Archangel Seraphina',
      title: 'อัครทูตสวรรค์สาวเซราฟินา',
      realmId: 'celestial',
      level: 12,
      hp: 180,
      maxHp: 180,
      mp: 45,
      maxMp: 45,
      atk: 35,
      def: 24,
      mag: 30,
      spd: 16,
      luk: 15,
      skillName: 'Divine Judgement Ray',
      skillDesc: 'ลำแสงพิพากษาศักดิ์สิทธิ์สลายความมืด',
      lootDrop: 'Seraphic Tiara',
      goldReward: 250,
      xpReward: 190,
      icon: '🪽',
      weakness: 'ชาร์จฟัน (Strike)'
    },
    {
      name: 'Sun Valkyrie Aurora',
      title: 'วัลคิรีสุริยันออโรร่า',
      realmId: 'celestial',
      level: 10,
      hp: 150,
      maxHp: 150,
      mp: 35,
      maxMp: 35,
      atk: 31,
      def: 20,
      mag: 24,
      spd: 15,
      luk: 12,
      skillName: 'Radiant Spear',
      skillDesc: 'พุ่งหอกสุริยันทะลวงเกราะศัตรู',
      lootDrop: 'Solar Cuirass',
      goldReward: 200,
      xpReward: 150,
      icon: '☀️',
      weakness: 'เวทมนตร์ (Magic)'
    }
  ],
  fairy_grove: [
    {
      name: 'Pixie Queen Titania',
      title: 'ราชินีภูตพรายทิเทเนีย',
      realmId: 'fairy_grove',
      level: 7,
      hp: 110,
      maxHp: 110,
      mp: 40,
      maxMp: 40,
      atk: 20,
      def: 12,
      mag: 25,
      spd: 17,
      luk: 18,
      skillName: 'Starlight Dream Pollen',
      skillDesc: 'เกสรละอองดาวสะกดนิทราและฟื้นฟูตนเอง',
      lootDrop: 'Pixie Wings Amulet',
      goldReward: 130,
      xpReward: 95,
      icon: '🧚‍♀️',
      weakness: 'โจมตีกายภาพ (Attack)'
    },
    {
      name: 'Kitsune Maiden Tamamo',
      title: 'สาวจิ้งจอกเก้าหางทามาโมะ',
      realmId: 'fairy_grove',
      level: 8,
      hp: 120,
      maxHp: 120,
      mp: 35,
      maxMp: 35,
      atk: 24,
      def: 13,
      mag: 22,
      spd: 16,
      luk: 14,
      skillName: 'Foxfire Blossom',
      skillDesc: 'ระเบิดเพลิงวิญญาณจิ้งจอกเก้าหาง',
      lootDrop: 'Fox Tail Charm',
      goldReward: 145,
      xpReward: 105,
      icon: '🦊',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  crystal_cavern: [
    {
      name: 'Crystal Golem Maiden Prismia',
      title: 'สาวโกเลมผลึกแก้วพริสเมีย',
      realmId: 'crystal_cavern',
      level: 9,
      hp: 155,
      maxHp: 155,
      mp: 25,
      maxMp: 25,
      atk: 27,
      def: 25,
      mag: 16,
      spd: 7,
      luk: 8,
      skillName: 'Prismatic Mirror Beam',
      skillDesc: 'สะท้อนลำแสงผลึกแก้วหลายเฉดสี',
      lootDrop: 'Crystal Heart',
      goldReward: 170,
      xpReward: 120,
      icon: '💎',
      weakness: 'ชาร์จฟัน (Strike)'
    },
    {
      name: 'Arachne Weaver Sylvi',
      title: 'สาวแมงมุมทอใยซิลวี',
      realmId: 'crystal_cavern',
      level: 9,
      hp: 135,
      maxHp: 135,
      mp: 30,
      maxMp: 30,
      atk: 28,
      def: 16,
      mag: 18,
      spd: 15,
      luk: 11,
      skillName: 'Crystal Silk Bind',
      skillDesc: 'ใยไหมผลึกมัดตรึงและฉีดพิษ',
      lootDrop: 'Silken Cloak',
      goldReward: 165,
      xpReward: 115,
      icon: '🕷️',
      weakness: 'เวทไฟ (Magic)'
    }
  ],
  castle: [
    {
      name: 'Royal Guard Paladin Leonora',
      title: 'อัศวินหญิงราชองครักษ์เลโอโนรา',
      realmId: 'castle',
      level: 10,
      hp: 160,
      maxHp: 160,
      mp: 25,
      maxMp: 25,
      atk: 32,
      def: 26,
      mag: 15,
      spd: 11,
      luk: 9,
      skillName: 'Aegis Shield Slam',
      skillDesc: 'กระแทกโล่ทองคำตรึงเป้าหมายให้อยู่นิ่ง',
      lootDrop: 'Royal Guard Shield',
      goldReward: 190,
      xpReward: 140,
      icon: '🛡️',
      weakness: 'เวทมนตร์ (Magic)'
    },
    {
      name: 'Sorceress Duchess Beatrice',
      title: 'ดัชเชสจอมเวทเบียทริซ',
      realmId: 'castle',
      level: 11,
      hp: 130,
      maxHp: 130,
      mp: 50,
      maxMp: 50,
      atk: 22,
      def: 15,
      mag: 33,
      spd: 14,
      luk: 12,
      skillName: 'Arcane Nova Flurry',
      skillDesc: 'ระเบิดคลื่นเวทมนตร์ดาวกระจายล้อมตัว',
      lootDrop: 'Duchess Spellbook',
      goldReward: 210,
      xpReward: 155,
      icon: '🔮',
      weakness: 'ชาร์จฟัน (Strike)'
    }
  ],
  steampunk: [
    {
      name: 'Steampunk Automaton Princess Alice',
      title: 'เจ้าหญิงจักรกลไอน้ำ อลิซ',
      realmId: 'solaria',
      level: 7,
      hp: 120,
      maxHp: 120,
      mp: 25,
      maxMp: 25,
      atk: 22,
      def: 20,
      mag: 14,
      spd: 8,
      luk: 8,
      skillName: 'Overclock Steam Drill',
      skillDesc: 'เร่งรอบสว่านไอน้ำเจาะทะลวงการป้องกัน',
      lootDrop: 'Brass Gear Core',
      goldReward: 120,
      xpReward: 85,
      icon: '⚙️',
      weakness: 'เวทสายฟ้า (Magic)'
    },
    {
      name: 'Steam Gear Gunner Victoria',
      title: 'สาวมือปืนปืนยาวเฟืองจักร วิกตอเรีย',
      realmId: 'solaria',
      level: 6,
      hp: 105,
      maxHp: 105,
      mp: 28,
      maxMp: 28,
      atk: 24,
      def: 12,
      mag: 10,
      spd: 16,
      luk: 14,
      skillName: 'Sniper Vapor Blast',
      skillDesc: 'สไนเปอร์กระสุนไอน้ำแรงดันสูงระยะไกล',
      lootDrop: 'Steampunk Goggles',
      goldReward: 110,
      xpReward: 78,
      icon: '🔫',
      weakness: 'สวนกลับ (Counter)'
    },
    {
      name: 'Clockwork Maid Nicole',
      title: 'หุ่นกลเมดสาวพลังไอน้ำ นิโคล',
      realmId: 'solaria',
      level: 5,
      hp: 95,
      maxHp: 95,
      mp: 20,
      maxMp: 20,
      atk: 18,
      def: 16,
      mag: 8,
      spd: 10,
      luk: 7,
      skillName: 'Mechanical Sweep',
      skillDesc: 'กวาดล้างด้วยไม้กวาดจักรกลไอน้ำ',
      lootDrop: 'Silver Key',
      goldReward: 85,
      xpReward: 60,
      icon: '🧹',
      weakness: 'ชาร์จฟัน (Strike)'
    }
  ],
  sakura_shrine: [
    {
      name: 'Kitsune Shrine Maiden Chiyo',
      title: 'มิโกะจิ้งจอกขาวเก้าหาง ชิโยะ',
      realmId: 'solaria',
      level: 7,
      hp: 115,
      maxHp: 115,
      mp: 40,
      maxMp: 40,
      atk: 18,
      def: 13,
      mag: 26,
      spd: 15,
      luk: 16,
      skillName: 'Foxfire Blossom Burst',
      skillDesc: 'เพลิงจิ้งจอกบุปผาซากุระเผาผลาญวิญญาณ',
      lootDrop: 'Sacred Miko Amulet',
      goldReward: 130,
      xpReward: 90,
      icon: '🦊',
      weakness: 'ชาร์จฟัน (Strike)'
    },
    {
      name: 'Sakura Blossom Tengu Ayame',
      title: 'เทนกุสาวปีกทมิฬแห่งป่าซากุระ อายาเมะ',
      realmId: 'solaria',
      level: 6,
      hp: 110,
      maxHp: 110,
      mp: 30,
      maxMp: 30,
      atk: 22,
      def: 14,
      mag: 18,
      spd: 18,
      luk: 12,
      skillName: 'Kamaitachi Whirlwind',
      skillDesc: 'พายุหมุนเคียวสายลมซากุระฟาดฟัน',
      lootDrop: 'Tengu Feather Fan',
      goldReward: 115,
      xpReward: 80,
      icon: '🪶',
      weakness: 'สวนกลับ (Counter)'
    }
  ]
};

export interface NodeEncounterPreview {
  typeLabel: string;
  encounterChancePercent: number;
  threatLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BOSS';
  threatColor: string;
  threatDescription: string;
  featuredMonster?: MonsterProfile;
  roster: MonsterProfile[];
}

/**
 * Builds the encounter information for a node, scaled to the hero that is looking at it.
 *
 * The authored monster stats are the level-1 reference; the monster a hero actually fights is
 * produced by `scaleMonster`, so the numbers shown while scouting must come from the same
 * place or the tooltip would promise a fight that does not happen.
 */
export function getNodeEncounterPreview(node: BoardNode, player?: Player | null): NodeEncounterPreview {
  const preview = buildNodeEncounterPreview(node);
  if (!player || preview.roster.length === 0) return preview;

  const isBossNode = node.type === 'boss' || node.type === 'dark_gate';
  const tier = tierForNode(node.realmId, node.biome, isBossNode);

  const scaleProfile = (monster: MonsterProfile): MonsterProfile => {
    const scaled = scaleMonster(
      {
        name: monster.name,
        tier,
        isBoss: isBossNode,
        baseHp: monster.maxHp || monster.hp,
        baseAtk: monster.atk,
        baseDef: monster.def,
        baseMag: monster.mag,
        baseSpd: monster.spd,
        baseLuk: monster.luk,
        mp: monster.mp
      },
      player
    );
    return {
      ...monster,
      hp: scaled.hp,
      maxHp: scaled.maxHp,
      mp: scaled.mp,
      maxMp: scaled.maxMp,
      atk: scaled.atk,
      def: scaled.def,
      mag: scaled.mag,
      spd: scaled.spd,
      luk: scaled.luk
    };
  };

  const roster = preview.roster.map(scaleProfile);
  const featuredMonster = preview.featuredMonster ? scaleProfile(preview.featuredMonster) : undefined;

  if (!featuredMonster) return { ...preview, roster };

  // Replace the hand-written threat label with one derived from the scaled fight, so a
  // "HIGH" warning cannot sit next to numbers that are actually trivial.
  const threat = judgeThreat(featuredMonster, player);
  return {
    ...preview,
    roster,
    featuredMonster,
    threatColor: threat.color,
    threatDescription: threat.description,
    threatLevel: isBossNode
      ? 'BOSS'
      : threat.verdict === 'DEADLY' || threat.verdict === 'HARD'
        ? 'HIGH'
        : threat.verdict === 'FAIR'
          ? 'MEDIUM'
          : 'LOW'
  };
}

function buildNodeEncounterPreview(node: BoardNode): NodeEncounterPreview {
  const realmKey = node.realmId || 'solaria';
  const roster = REALM_MONSTER_ROSTERS[node.biome || ''] || REALM_MONSTER_ROSTERS[realmKey] || REALM_MONSTER_ROSTERS.solaria;

  if (node.type === 'town' && node.townData?.isOccupiedByMonster) {
    const td = node.townData;
    const townMonster: MonsterProfile = {
      name: td.monsterName,
      title: 'อสูรยึดครองเมือง',
      realmId: realmKey,
      level: Math.max(3, Math.round(td.monsterAtk / 2.5)),
      hp: td.monsterHp,
      maxHp: td.monsterMaxHp || td.monsterHp,
      mp: 30,
      maxMp: 30,
      atk: td.monsterAtk,
      def: td.monsterDef,
      mag: Math.round(td.monsterAtk * 0.7),
      spd: Math.round(td.monsterDef * 1.1),
      luk: 7,
      skillName: 'Oppressive Strike',
      skillDesc: 'โจมตีกดดันผู้ปลดปล่อยเมือง',
      lootDrop: 'โฉนดเมือง & สิทธิ์เก็บภาษี',
      goldReward: 150 + td.taxYield * 2,
      xpReward: 80 + td.level * 20,
      icon: '👹',
      weakness: 'Strike / Magic'
    };

    return {
      typeLabel: `🏡 ${node.name} (เมืองถูกยึดครอง)`,
      encounterChancePercent: 100,
      threatLevel: 'HIGH',
      threatColor: '#ef4444',
      threatDescription: `เมืองถูก ${td.monsterName} ครอบงำ! โค่นมันเพื่อปลดปล่อยและรับสิทธิ์เก็บภาษี!`,
      featuredMonster: townMonster,
      roster: [townMonster]
    };
  }

  if (node.type === 'boss' || node.type === 'dark_gate') {
    let bossMonster: MonsterProfile;

    if (node.biome === 'sakura_shrine') {
      bossMonster = {
        name: 'Nine-Tailed Matriarch Tamamo',
        title: 'จิ้งจอกเก้าหางบรรพกาล ทามาโมะ',
        realmId: 'celestial',
        level: 16,
        hp: 360,
        maxHp: 360,
        mp: 90,
        maxMp: 90,
        atk: 38,
        def: 26,
        mag: 42,
        spd: 20,
        luk: 18,
        skillName: 'Foxfire Ninefold Bloom',
        skillDesc: 'เพลิงจิ้งจอกเก้าหางผลาญวิญญาณส่องสว่างทั่วท้องนภา',
        lootDrop: 'T5 มงกุฎราชินีผู้พิชิต (+800G)',
        goldReward: 850,
        xpReward: 480,
        icon: '🦊👑',
        weakness: 'ชาร์จฟัน (Strike)'
      };
    } else if (node.biome === 'steampunk') {
      bossMonster = {
        name: 'Clockwork Sovereign Chrono Alice',
        title: 'จักรกลอัจฉริยะกาลเวลา โครโน อลิซ',
        realmId: 'steampunk',
        level: 15,
        hp: 340,
        maxHp: 340,
        mp: 80,
        maxMp: 80,
        atk: 36,
        def: 32,
        mag: 38,
        spd: 18,
        luk: 15,
        skillName: 'Chrono Overdrive Beam',
        skillDesc: 'ลำแสงเร่งเวลาจักรกลไอน้ำยิงทะลวงสนามรบ',
        lootDrop: 'T5 โล่กระจกสะท้อนสวรรค์ (+700G)',
        goldReward: 800,
        xpReward: 450,
        icon: '⚙️👑',
        weakness: 'เวทสายฟ้า (Magic)'
      };
    } else if (node.biome === 'waterfall_forest' || node.realmId === 'emerald') {
      bossMonster = {
        name: 'Water Archon Ondine',
        title: 'เทพธิดาวารีบรรพกาล ออนดีน',
        realmId: 'emerald',
        level: 14,
        hp: 320,
        maxHp: 320,
        mp: 75,
        maxMp: 75,
        atk: 34,
        def: 28,
        mag: 40,
        spd: 16,
        luk: 14,
        skillName: 'Tidal Deluge Torrent',
        skillDesc: 'คลื่นสึนามิมรกตซัดถล่มกลืนกินทั้งสมรภูมิ',
        lootDrop: 'T4 เอ็กซ์คาลิเบอร์ (+650G)',
        goldReward: 750,
        xpReward: 420,
        icon: '🧜‍♀️👑',
        weakness: 'เวทสายฟ้า (Magic)'
      };
    } else if (node.biome === 'snow' || realmKey === 'frostpeak') {
      bossMonster = {
        name: 'Ice Empress Borealia',
        title: 'จักรพรรดินีเหมันต์นิรันดร์ โบเรียเลีย',
        realmId: 'frostpeak',
        level: 13,
        hp: 310,
        maxHp: 310,
        mp: 70,
        maxMp: 70,
        atk: 35,
        def: 27,
        mag: 36,
        spd: 14,
        luk: 12,
        skillName: 'Absolute Zero Freeze',
        skillDesc: 'แช่แข็งผลึกน้ำแข็งแทงทะลุทะลวงหัวใจ',
        lootDrop: 'T4 เสื้อคลุมเทพีมนตรา (+600G)',
        goldReward: 700,
        xpReward: 400,
        icon: '❄️👑',
        weakness: 'เวทไฟ (Magic)'
      };
    } else if (node.biome === 'desert' || realmKey === 'sunfire') {
      bossMonster = {
        name: 'Pharaoh Queen Nefertia',
        title: 'ฟาโรห์หญิงสุริยัน เนเฟอร์เทีย',
        realmId: 'sunfire',
        level: 14,
        hp: 330,
        maxHp: 330,
        mp: 75,
        maxMp: 75,
        atk: 37,
        def: 26,
        mag: 38,
        spd: 16,
        luk: 15,
        skillName: 'Curse of the Sun God',
        skillDesc: 'คำสาปเพลิงสุริยาแผดเผาโลหิตและผืนทราย',
        lootDrop: 'T4 โล่เทพีอีจิส (+650G)',
        goldReward: 750,
        xpReward: 410,
        icon: '🪬👑',
        weakness: 'สวนกลับ (Counter)'
      };
    } else if (node.biome === 'abyss' || node.type === 'dark_gate' || realmKey === 'abyss') {
      bossMonster = {
        name: 'Void Empress Tiamat',
        title: 'ราชินีมังกรแห่งความว่างเปล่า เทียแมต',
        realmId: 'abyss',
        level: 18,
        hp: 420,
        maxHp: 420,
        mp: 100,
        maxMp: 100,
        atk: 48,
        def: 35,
        mag: 45,
        spd: 22,
        luk: 18,
        skillName: 'Void Annihilation Breath',
        skillDesc: 'ลมหายใจดับสูญกลืนกินมิติและวิญญาณคู่ต่อสู้',
        lootDrop: 'T5 ดาบวันสิ้นพิภพ (+1000G)',
        goldReward: 1000,
        xpReward: 600,
        icon: '🐉💜',
        weakness: 'ชาร์จฟัน (Strike)'
      };
    } else if (node.biome === 'grass' || realmKey === 'solaria') {
      bossMonster = {
        name: 'Slime Queen Aurelia',
        title: 'ราชินีสไลม์วุ้นมรกต ออเรเลีย',
        realmId: 'solaria',
        level: 10,
        hp: 250,
        maxHp: 250,
        mp: 50,
        maxMp: 50,
        atk: 28,
        def: 22,
        mag: 25,
        spd: 12,
        luk: 10,
        skillName: 'Royal Acid Nova',
        skillDesc: 'ระเบิดกรดวุ้นมรกตละลายเกราะและพลังป้องกัน',
        lootDrop: 'T3 เกราะเกล็ดมังกรเพลิง (+450G)',
        goldReward: 500,
        xpReward: 300,
        icon: '🟢👑',
        weakness: 'เวทไฟ (Magic)'
      };
    } else {
      bossMonster = {
        name: 'Dragon Princess Ignis',
        title: 'เจ้าหญิงมังกรเพลิงบรรพกาล อิกนิส',
        realmId: 'volcano',
        level: 15,
        hp: 350,
        maxHp: 350,
        mp: 70,
        maxMp: 70,
        atk: 42,
        def: 28,
        mag: 34,
        spd: 16,
        luk: 14,
        skillName: 'Cataclysmic Dragonflare',
        skillDesc: 'เวทเพลิงมังกรบรรพกาลล้างบางทั้งสนามรบ',
        lootDrop: 'T5 ดาบวันสิ้นพิภพ (+600G)',
        goldReward: 850,
        xpReward: 480,
        icon: '🐉👑',
        weakness: 'เดาทางค้อน-กรรไกร-กระดาษ'
      };
    }

    return {
      typeLabel: `💀 ${node.name} [BOSS LAIR]`,
      encounterChancePercent: 100,
      threatLevel: 'BOSS',
      threatColor: '#f43f5e',
      threatDescription: `สมรภูมิชี้ชะตากับ ${bossMonster.title}! เสี่ยงตายขั้นสุดยอด!`,
      featuredMonster: bossMonster,
      roster: [bossMonster]
    };
  }

  if (['capital', 'shop_weapon', 'shop_magic', 'shop_item', 'church', 'tavern', 'guild'].includes(node.type)) {
    return {
      typeLabel: `🛡️ ${node.name} (${getNodeTypeName(node.type)})`,
      encounterChancePercent: 0,
      threatLevel: 'SAFE',
      threatColor: '#10b981',
      threatDescription: 'เขตปลอดการต่อสู้ ปลอดภัย 100% สามารถพักฟื้นหรือซื้ออุปกรณ์ได้',
      roster: []
    };
  }

  if (node.type === 'red') {
    const randomPick = roster[Math.floor(Math.random() * roster.length)];
    return {
      typeLabel: `⚠️ ${node.name} [ช่องเคราะห์กรรม]`,
      encounterChancePercent: 55,
      threatLevel: 'HIGH',
      threatColor: '#ea580c',
      threatDescription: 'ความเสี่ยงสูง! โอกาสเผชิญการลอบโจมตีของมอนสเตอร์หรือคำสาปสูญเสียทรัพย์สิน!',
      featuredMonster: randomPick,
      roster
    };
  }

  const primaryMonster = roster[0];
  return {
    typeLabel: `⚪ ${node.name} (${node.subRegionName || 'ทุ่งหญ้า'})`,
    encounterChancePercent: 35,
    threatLevel: 'MEDIUM',
    threatColor: '#38bdf8',
    threatDescription: 'พื้นที่เดินทางธรรมชาติ มีโอกาส 35% พบสัตว์อสูรสาวประจำภูมิภาค',
    featuredMonster: primaryMonster,
    roster
  };
}

function getNodeTypeName(type: string): string {
  switch (type) {
    case 'capital': return 'ปราสาทราชธานี';
    case 'shop_weapon': return 'ร้านอาวุธ';
    case 'shop_magic': return 'ร้านเวทมนตร์';
    case 'shop_item': return 'ร้านไอเทม';
    case 'church': return 'วิหารศักดิ์สิทธิ์';
    case 'tavern': return 'โรงเตี๊ยม';
    case 'guild': return 'กิลด์นักผจญภัย';
    default: return 'สิ่งก่อสร้าง';
  }
}
