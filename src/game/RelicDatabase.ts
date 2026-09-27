export interface RelicItem {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  rarity: 'rare' | 'epic' | 'legendary';
  desc: string;
  color: string;
  cost?: number;
}

export const RELIC_CATALOG: Record<string, RelicItem> = {
  thief_band: {
    id: 'thief_band',
    name: 'แหวนหัวขโมย',
    nameEn: "Thief's Band",
    icon: '💍🥷',
    rarity: 'rare',
    desc: 'ลดค่าผ่านทางเมื่อเดินตกเมืองของคู่แข่งลง 50%',
    color: '#10b981',
    cost: 1200
  },
  windstrider_horseshoe: {
    id: 'windstrider_horseshoe',
    name: 'เกือกม้าวายุ',
    nameEn: 'Windstrider Horseshoe',
    icon: '🐎💨',
    rarity: 'rare',
    desc: 'แต้มลูกเต๋าในการเดินทุกครั้งจะไม่มีทางต่ำกว่า 3 แต้ม',
    color: '#38bdf8',
    cost: 1500
  },
  phoenix_amulet: {
    id: 'phoenix_amulet',
    name: 'เครื่องรางวิหคเพลิง',
    nameEn: 'Phoenix Amulet',
    icon: '🪶🔥',
    rarity: 'legendary',
    desc: 'ฟื้นคืนชีพทันที 1 ครั้งเมื่อพ่ายแพ้ในการต่อสู้ (ฟื้นฟู 50% HP)',
    color: '#f97316',
    cost: 3500
  },
  banker_ledger: {
    id: 'banker_ledger',
    name: 'สมุดบัญชีทองคำ',
    nameEn: "Banker's Ledger",
    icon: '📜💰',
    rarity: 'epic',
    desc: 'รับดอกเบี้ยเงินฝาก 5% ของทองคำทั้งหมดในกระเป๋าทุกสัปดาห์',
    color: '#eab308',
    cost: 2200
  },
  berserker_fang: {
    id: 'berserker_fang',
    name: 'เขี้ยวคลั่งโลหิต',
    nameEn: 'Berserker Fang',
    icon: '🦷🩸',
    rarity: 'epic',
    desc: 'เมื่อ HP ต่ำกว่า 35% พลังโจมตี ATK เพิ่มขึ้น 40%',
    color: '#ef4444',
    cost: 2000
  },
  dragon_heart: {
    id: 'dragon_heart',
    name: 'หัวใจมังกรบรรพกาล',
    nameEn: 'Dragon Heart',
    icon: '❤️‍🔥🐉',
    rarity: 'legendary',
    desc: 'Max HP +30 และมีภูมิคุ้มกันสถานะไฟไหม้ (Burn) และเยือกแข็ง (Freeze)',
    color: '#dc2626',
    cost: 4000
  },
  midas_touch: {
    id: 'midas_touch',
    name: 'ถุงมือไมดาส',
    nameEn: 'Midas Gauntlet',
    icon: '🧤✨',
    rarity: 'rare',
    desc: 'ได้รับทองคำเพิ่มขึ้น 30% จากการสังหารมอนสเตอร์และชนะการดวล PvP',
    color: '#fbbf24',
    cost: 1800
  },
  aegis_crest: {
    id: 'aegis_crest',
    name: 'ตราศักดิ์สิทธิ์อีจิส',
    nameEn: 'Aegis Crest',
    icon: '🛡️✨',
    rarity: 'epic',
    desc: 'เริ่มต้นการต่อสู้ทุกครั้งด้วยเกราะแสงดูดซับดาเมจ 25 หน่วยแรก',
    color: '#a855f7',
    cost: 2400
  }
};
