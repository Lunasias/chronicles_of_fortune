import { BoardNode } from './BoardMap';

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
      name: 'Royal Slime Bloblet',
      title: 'สไลม์วุ้นหลวง',
      realmId: 'solaria',
      level: 2,
      hp: 55,
      maxHp: 55,
      mp: 20,
      maxMp: 20,
      atk: 12,
      def: 6,
      mag: 6,
      spd: 7,
      luk: 6,
      skillName: 'Acid Splash',
      skillDesc: 'สาดน้ำกรดกัดกร่อนเกราะ',
      lootDrop: 'Potion',
      goldReward: 35,
      xpReward: 25,
      icon: '🟢',
      weakness: 'เวทไฟ (Magic)'
    },
    {
      name: 'Forest Goblin Marauder',
      title: 'ก็อบลินโจรไพร',
      realmId: 'solaria',
      level: 4,
      hp: 75,
      maxHp: 75,
      mp: 22,
      maxMp: 22,
      atk: 16,
      def: 8,
      mag: 6,
      spd: 8,
      luk: 7,
      skillName: 'Club Bash',
      skillDesc: 'ทุบกระบองหนามทำให้มึนงง',
      lootDrop: 'Bronze Sword',
      goldReward: 55,
      xpReward: 40,
      icon: '👺',
      weakness: 'เวทมนตร์ (Magic)'
    },
    {
      name: 'Shadow Panther',
      title: 'เสือดำเงาทมิฬ',
      realmId: 'solaria',
      level: 5,
      hp: 85,
      maxHp: 85,
      mp: 25,
      maxMp: 25,
      atk: 18,
      def: 9,
      mag: 8,
      spd: 14,
      luk: 11,
      skillName: 'Pounce Ambush',
      skillDesc: 'กระโจนตะปบหลบหลีกยาก',
      lootDrop: 'Speed Elixir',
      goldReward: 70,
      xpReward: 48,
      icon: '🐆',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  emerald: [
    {
      name: 'Treant Sapling',
      title: 'ภูตพฤกษาหนุ่ม',
      realmId: 'emerald',
      level: 5,
      hp: 95,
      maxHp: 95,
      mp: 30,
      maxMp: 30,
      atk: 17,
      def: 15,
      mag: 10,
      spd: 5,
      luk: 5,
      skillName: 'Root Entangle',
      skillDesc: 'พันธนาการด้วยรากไม้โบราณ',
      lootDrop: 'Iron Buckler',
      goldReward: 75,
      xpReward: 52,
      icon: '🌲',
      weakness: 'เวทไฟ (Magic)'
    },
    {
      name: 'Werewolf Stalker',
      title: 'มนุษย์หมาป่าพรานล่า',
      realmId: 'emerald',
      level: 6,
      hp: 105,
      maxHp: 105,
      mp: 25,
      maxMp: 25,
      atk: 22,
      def: 11,
      mag: 7,
      spd: 15,
      luk: 10,
      skillName: 'Bloodlust Rend',
      skillDesc: 'กรงเล็บกระหายเลือดฉีกเนื้อ',
      lootDrop: 'Steel Broadsword',
      goldReward: 90,
      xpReward: 65,
      icon: '🐺',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  frostfall: [
    {
      name: 'Frost Skeleton Soldier',
      title: 'พลดาบโครงกระดูกน้ำแข็ง',
      realmId: 'frostfall',
      level: 7,
      hp: 100,
      maxHp: 100,
      mp: 20,
      maxMp: 20,
      atk: 21,
      def: 14,
      mag: 8,
      spd: 9,
      luk: 6,
      skillName: 'Frostbite Slash',
      skillDesc: 'ฟันดาบเย็นยะเยือกแช่แข็งเป้าหมาย',
      lootDrop: 'Frost Broadsword',
      goldReward: 100,
      xpReward: 70,
      icon: '💀',
      weakness: 'ชาร์จฟัน (Strike)'
    },
    {
      name: 'Glacial Yeti Scout',
      title: 'เยติลาดตระเวนหิมะ',
      realmId: 'frostfall',
      level: 8,
      hp: 135,
      maxHp: 135,
      mp: 25,
      maxMp: 25,
      atk: 26,
      def: 16,
      mag: 7,
      spd: 7,
      luk: 8,
      skillName: 'Avalanche Slam',
      skillDesc: 'ทุบหิมะถล่มสะเทือนพสุธา',
      lootDrop: 'Steel Cuirass',
      goldReward: 125,
      xpReward: 85,
      icon: '🦍',
      weakness: 'เวทไฟ (Magic)'
    }
  ],
  sunfire: [

    {
      name: 'Dune Bandit Raider',
      title: 'กองโจรทะเลทราย',
      realmId: 'sunfire',
      level: 6,
      hp: 95,
      maxHp: 95,
      mp: 20,
      maxMp: 20,
      atk: 22,
      def: 11,
      mag: 6,
      spd: 13,
      luk: 9,
      skillName: 'Blinding Sand Toss',
      skillDesc: 'ปาทรายบดบังสมาธิคู่ต่อสู้',
      lootDrop: 'Scimitar',
      goldReward: 95,
      xpReward: 65,
      icon: '🗡️',
      weakness: 'สวนกลับ (Counter)'
    },
    {
      name: 'Sandstone Mummy',
      title: 'มัมมี่สุสานศิลาทราย',
      realmId: 'sunfire',
      level: 7,
      hp: 125,
      maxHp: 125,
      mp: 35,
      maxMp: 35,
      atk: 21,
      def: 17,
      mag: 15,
      spd: 6,
      luk: 8,
      skillName: 'Curse of Dust',
      skillDesc: 'คำสาปทรายดูดพลังชีวิต',
      lootDrop: 'Pharaoh Amulet',
      goldReward: 115,
      xpReward: 80,
      icon: '🧟',
      weakness: 'เวทไฟ (Magic)'
    }
  ],
  dwarf: [
    {
      name: 'Rogue Automaton',
      title: 'หุ่นกลจักรกลทรยศ',
      realmId: 'dwarf',
      level: 8,
      hp: 140,
      maxHp: 140,
      mp: 20,
      maxMp: 20,
      atk: 25,
      def: 22,
      mag: 8,
      spd: 6,
      luk: 6,
      skillName: 'Steam Overdrive',
      skillDesc: 'เร่งไอน้ำอุณหภูมิสูงชาร์จโจมตี',
      lootDrop: 'Dwarven Mail',
      goldReward: 140,
      xpReward: 95,
      icon: '⚙️',
      weakness: 'เวทมนตร์ (Magic)'
    }
  ],
  lava: [
    {
      name: 'Hellhound Berserker',
      title: 'หมานรกเพลิงโลกันตร์',
      realmId: 'lava',
      level: 9,
      hp: 130,
      maxHp: 130,
      mp: 30,
      maxMp: 30,
      atk: 30,
      def: 13,
      mag: 14,
      spd: 16,
      luk: 11,
      skillName: 'Infernal Crunch',
      skillDesc: 'กัดฉีกร่างด้วยเปลวเพลิงนรก',
      lootDrop: 'Demon Fang',
      goldReward: 160,
      xpReward: 115,
      icon: '🐕‍🦺',
      weakness: 'สวนกลับ (Counter)'
    }
  ],
  coral: [
    {
      name: 'Pirate Corsair',
      title: 'กัปตันโจรสลัดเลื่องชื่อ',
      realmId: 'coral',
      level: 8,
      hp: 110,
      maxHp: 110,
      mp: 25,
      maxMp: 25,
      atk: 25,
      def: 12,
      mag: 8,
      spd: 14,
      luk: 12,
      skillName: 'Cutlass Flurry',
      skillDesc: 'ดาบโค้งคู่กระหน่ำฟันรวดเร็ว',
      lootDrop: 'Pirate Hat',
      goldReward: 135,
      xpReward: 88,
      icon: '🏴‍☠️',
      weakness: 'ชาร์จฟัน (Strike)'
    }
  ],
  abyss: [
    {
      name: 'Nether Shadow Knight',
      title: 'อัศวินเงามืดนรกานต์',
      realmId: 'abyss',
      level: 11,
      hp: 165,
      maxHp: 165,
      mp: 35,
      maxMp: 35,
      atk: 34,
      def: 23,
      mag: 20,
      spd: 13,
      luk: 9,
      skillName: 'Void Cleave',
      skillDesc: 'ฟาดดาบผ่ามิติดูดกลืนวิญญาณ',
      lootDrop: 'Abyssal Greatsword',
      goldReward: 230,
      xpReward: 165,
      icon: '🗡️',
      weakness: 'สวนกลับ (Counter)'
    }
  ]
};

export function getNodeEncounterPreview(node: BoardNode): {
  typeLabel: string;
  encounterChancePercent: number;
  threatLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'BOSS';
  threatColor: string;
  threatDescription: string;
  featuredMonster?: MonsterProfile;
  roster: MonsterProfile[];
} {
  const realmKey = node.realmId || 'solaria';
  const roster = REALM_MONSTER_ROSTERS[realmKey] || REALM_MONSTER_ROSTERS.solaria;

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
    const bossMonster: MonsterProfile = {
      name: node.type === 'dark_gate' ? 'Altar of Rico (Darkling)' : 'Ancient Dragon Ignis',
      title: 'จอมอสูรราชาแห่งแผ่นดิน',
      realmId: realmKey,
      level: 15,
      hp: 300,
      maxHp: 300,
      mp: 60,
      maxMp: 60,
      atk: 40,
      def: 28,
      mag: 32,
      spd: 15,
      luk: 12,
      skillName: 'Cataclysmic Extinction',
      skillDesc: 'เวทเพลิงมรณะล้างบางทั้งสนามรบ',
      lootDrop: 'มงกุฎแห่งชัยชนะ (+500G)',
      goldReward: 600,
      xpReward: 350,
      icon: '👑',
      weakness: 'เดาทางค้อน-กรรไกร-กระดาษ'
    };

    return {
      typeLabel: `💀 ${node.name} [BOSS LAIR]`,
      encounterChancePercent: 100,
      threatLevel: 'BOSS',
      threatColor: '#f43f5e',
      threatDescription: 'สมรภูมิชี้ชะตากับจอมอสูรสูงสุด! เสี่ยงตายขั้นสุดยอด!',
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
    threatDescription: 'พื้นที่เดินทางธรรมชาติ มีโอกาส 35% พบสัตว์อสูรประจำภูมิภาค',
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

