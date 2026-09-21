export type SpaceType =
  | 'town'
  | 'empty'
  | 'blue'
  | 'red'
  | 'shop_item'
  | 'shop_weapon'
  | 'shop_magic'
  | 'church'
  | 'dark_gate'
  | 'vault'
  | 'boss'
  | 'tavern'
  | 'guild'
  | 'fishing'
  | 'isekai_event';

export type BiomeType = 'grass' | 'forest' | 'snow' | 'desert' | 'volcano' | 'cavern' | 'coral' | 'abyss';

export type RealmId = 'solaria' | 'frostpeak' | 'sunfire' | 'abyss';

export interface TownData {
  name: string;
  level: number; // 1 to 5 (Hamlet, Village, Town, Citadel, Metropolis)
  baseValue: number;
  taxYield: number;
  ownerId: number | null;
  isOccupiedByMonster: boolean;
  monsterName: string;
  monsterHp: number;
  monsterMaxHp?: number;
  monsterAtk: number;
  monsterDef: number;
}

export interface BoardNode {
  id: number;
  gx: number;
  gy: number;
  gz: number; // Elevation (0 to 5)
  type: SpaceType;
  name: string;
  biome: BiomeType;
  neighbors: number[];
  townData?: TownData;
  realmId: RealmId;
  realmName: string;
  subRegionName: string;
  weather: 'sunny' | 'rain' | 'snow' | 'heatwave' | 'miasma';
  isGrandBridge?: boolean;
}

// =========================================================================================
// MASSIVE DOKAPON CONTINENT: 155 NODES ACROSS 4 GRAND MACRO REALMS & 8 SUB-REGIONS
// =========================================================================================
export const DOKAPON_NODES: BoardNode[] = [
  {
    "id": 0,
    "gx": 20,
    "gy": 20,
    "gz": 0,
    "type": "town",
    "name": "Oakshire Capital",
    "biome": "grass",
    "neighbors": [
      1,
      21,
      146
    ],
    "townData": {
      "name": "Oakshire Capital",
      "level": 1,
      "baseValue": 450,
      "taxYield": 50,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Royal Slime King",
      "monsterHp": 60,
      "monsterAtk": 11,
      "monsterDef": 5
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 1,
    "gx": 25,
    "gy": 20,
    "gz": 0,
    "type": "fishing",
    "name": "Riverway Fishing Pier",
    "biome": "grass",
    "neighbors": [
      0,
      2,
      15
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 2,
    "gx": 30,
    "gy": 20,
    "gz": 0,
    "type": "shop_item",
    "name": "Crown Bazaar",
    "biome": "grass",
    "neighbors": [
      1,
      3,
      18,
      131
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 3,
    "gx": 34,
    "gy": 20,
    "gz": 1,
    "type": "tavern",
    "name": "The Prancing Boar Tavern",
    "biome": "grass",
    "neighbors": [
      2,
      4,
      19
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 4,
    "gx": 39,
    "gy": 20,
    "gz": 1,
    "type": "town",
    "name": "Lakeview Keep",
    "biome": "grass",
    "neighbors": [
      3,
      5,
      20,
      22
    ],
    "townData": {
      "name": "Lakeview Keep",
      "level": 1,
      "baseValue": 480,
      "taxYield": 55,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Lake Goblin Chief",
      "monsterHp": 65,
      "monsterAtk": 12,
      "monsterDef": 6
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 5,
    "gx": 44,
    "gy": 20,
    "gz": 1,
    "type": "church",
    "name": "St. Claire Cathedral",
    "biome": "grass",
    "neighbors": [
      4,
      6,
      17
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 6,
    "gx": 49,
    "gy": 20,
    "gz": 1,
    "type": "red",
    "name": "Highway Ambush",
    "biome": "grass",
    "neighbors": [
      5,
      7,
      14
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 7,
    "gx": 54,
    "gy": 20,
    "gz": 1,
    "type": "guild",
    "name": "Solaria Guild Central",
    "biome": "grass",
    "neighbors": [
      6,
      8,
      13
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 8,
    "gx": 54,
    "gy": 25,
    "gz": 1,
    "type": "fishing",
    "name": "Estuary Angler Docks",
    "biome": "grass",
    "neighbors": [
      7,
      9,
      12,
      30
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 9,
    "gx": 49,
    "gy": 25,
    "gz": 1,
    "type": "shop_weapon",
    "name": "Plains Armory",
    "biome": "grass",
    "neighbors": [
      8,
      10,
      11
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 10,
    "gx": 44,
    "gy": 25,
    "gz": 1,
    "type": "town",
    "name": "Riverdale Borough",
    "biome": "grass",
    "neighbors": [
      9,
      11,
      45
    ],
    "townData": {
      "name": "Riverdale Borough",
      "level": 1,
      "baseValue": 500,
      "taxYield": 60,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "River Harpy",
      "monsterHp": 70,
      "monsterAtk": 13,
      "monsterDef": 7
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 11,
    "gx": 39,
    "gy": 25,
    "gz": 1,
    "type": "blue",
    "name": "Clover Field",
    "biome": "grass",
    "neighbors": [
      9,
      10,
      12
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 12,
    "gx": 34,
    "gy": 25,
    "gz": 1,
    "type": "empty",
    "name": "Royal Crossroad",
    "biome": "grass",
    "neighbors": [
      8,
      11,
      13,
      43,
      86
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 13,
    "gx": 30,
    "gy": 25,
    "gz": 0,
    "type": "isekai_event",
    "name": "Goddess Lumina Shrine",
    "biome": "grass",
    "neighbors": [
      7,
      12,
      14
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 14,
    "gx": 25,
    "gy": 25,
    "gz": 0,
    "type": "shop_magic",
    "name": "Plains Mystic Tent",
    "biome": "grass",
    "neighbors": [
      6,
      13,
      15,
      90
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 15,
    "gx": 20,
    "gy": 25,
    "gz": 0,
    "type": "red",
    "name": "Briar Trench",
    "biome": "grass",
    "neighbors": [
      1,
      14,
      16
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 16,
    "gx": 20,
    "gy": 30,
    "gz": 0,
    "type": "town",
    "name": "King's Crossing",
    "biome": "grass",
    "neighbors": [
      15,
      17,
      129
    ],
    "townData": {
      "name": "King's Crossing",
      "level": 1,
      "baseValue": 520,
      "taxYield": 65,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Highway Marauder",
      "monsterHp": 75,
      "monsterAtk": 14,
      "monsterDef": 7
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 17,
    "gx": 25,
    "gy": 30,
    "gz": 0,
    "type": "empty",
    "name": "Greenway Trail",
    "biome": "grass",
    "neighbors": [
      5,
      16,
      18
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 18,
    "gx": 30,
    "gy": 30,
    "gz": 0,
    "type": "church",
    "name": "Village Chapel",
    "biome": "grass",
    "neighbors": [
      2,
      17,
      19,
      40
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 19,
    "gx": 34,
    "gy": 30,
    "gz": 0,
    "type": "blue",
    "name": "Orchard Spring",
    "biome": "grass",
    "neighbors": [
      3,
      18,
      20
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 20,
    "gx": 25,
    "gy": 22,
    "gz": 0,
    "type": "empty",
    "name": "Pasture Hill",
    "biome": "grass",
    "neighbors": [
      4,
      19,
      21
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 21,
    "gx": 20,
    "gy": 22,
    "gz": 0,
    "type": "empty",
    "name": "Capital Southgate",
    "biome": "grass",
    "neighbors": [
      0,
      20
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 22,
    "gx": 40,
    "gy": 20,
    "gz": 1,
    "type": "empty",
    "name": "Canopy Entrance",
    "biome": "forest",
    "neighbors": [
      4,
      23,
      42
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 23,
    "gx": 45,
    "gy": 20,
    "gz": 1,
    "type": "tavern",
    "name": "Fairy Whisper Tavern",
    "biome": "forest",
    "neighbors": [
      22,
      24,
      41
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 24,
    "gx": 50,
    "gy": 20,
    "gz": 1,
    "type": "blue",
    "name": "Fairy Glen",
    "biome": "forest",
    "neighbors": [
      23,
      25,
      40
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 25,
    "gx": 54,
    "gy": 20,
    "gz": 2,
    "type": "town",
    "name": "Sylva Village",
    "biome": "forest",
    "neighbors": [
      24,
      26,
      39,
      65
    ],
    "townData": {
      "name": "Sylva Village",
      "level": 1,
      "baseValue": 550,
      "taxYield": 70,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Briar Kobold Shaman",
      "monsterHp": 80,
      "monsterAtk": 15,
      "monsterDef": 8
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 26,
    "gx": 59,
    "gy": 20,
    "gz": 2,
    "type": "red",
    "name": "Witch Mire",
    "biome": "forest",
    "neighbors": [
      25,
      27,
      38
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 27,
    "gx": 59,
    "gy": 25,
    "gz": 2,
    "type": "guild",
    "name": "Sylph Rangers Guild",
    "biome": "forest",
    "neighbors": [
      26,
      28,
      37
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 28,
    "gx": 54,
    "gy": 25,
    "gz": 2,
    "type": "shop_magic",
    "name": "Arcane Treehouse",
    "biome": "forest",
    "neighbors": [
      27,
      29,
      36
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 29,
    "gx": 50,
    "gy": 25,
    "gz": 2,
    "type": "church",
    "name": "Druidic Monolith",
    "biome": "forest",
    "neighbors": [
      28,
      30,
      33
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 30,
    "gx": 54,
    "gy": 29,
    "gz": 2,
    "type": "fishing",
    "name": "Mystic Pond Fishing Spot",
    "biome": "forest",
    "neighbors": [
      8,
      29,
      31,
      34
    ],
    "townData": {
      "name": "Deepwood Haven",
      "level": 1,
      "baseValue": 580,
      "taxYield": 72,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Shadow Panther",
      "monsterHp": 85,
      "monsterAtk": 16,
      "monsterDef": 8
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 31,
    "gx": 59,
    "gy": 29,
    "gz": 2,
    "type": "blue",
    "name": "Glowing Flora",
    "biome": "forest",
    "neighbors": [
      30,
      32
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 32,
    "gx": 64,
    "gy": 29,
    "gz": 2,
    "type": "empty",
    "name": "Canopy Walkway",
    "biome": "forest",
    "neighbors": [
      31,
      33
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 33,
    "gx": 64,
    "gy": 34,
    "gz": 2,
    "type": "vault",
    "name": "Elven Spire Vault",
    "biome": "forest",
    "neighbors": [
      29,
      32,
      34
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 34,
    "gx": 59,
    "gy": 34,
    "gz": 2,
    "type": "shop_weapon",
    "name": "Woodsman Bowyer",
    "biome": "forest",
    "neighbors": [
      30,
      33,
      35
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 35,
    "gx": 54,
    "gy": 34,
    "gz": 2,
    "type": "empty",
    "name": "Bramble Path",
    "biome": "forest",
    "neighbors": [
      34,
      36,
      71
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 36,
    "gx": 50,
    "gy": 34,
    "gz": 2,
    "type": "isekai_event",
    "name": "Fairy Reincarnation Grove",
    "biome": "forest",
    "neighbors": [
      28,
      35,
      37
    ],
    "townData": {
      "name": "Willowbrook Outpost",
      "level": 1,
      "baseValue": 600,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Great Ent Guardian",
      "monsterHp": 95,
      "monsterAtk": 17,
      "monsterDef": 11
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 37,
    "gx": 50,
    "gy": 39,
    "gz": 2,
    "type": "red",
    "name": "Poison Spore Bog",
    "biome": "forest",
    "neighbors": [
      27,
      36,
      38
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 38,
    "gx": 54,
    "gy": 39,
    "gz": 2,
    "type": "blue",
    "name": "Sacred Pool",
    "biome": "forest",
    "neighbors": [
      26,
      37,
      39
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 39,
    "gx": 59,
    "gy": 39,
    "gz": 2,
    "type": "empty",
    "name": "Ancient Hollow",
    "biome": "forest",
    "neighbors": [
      25,
      38,
      40
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 40,
    "gx": 59,
    "gy": 44,
    "gz": 2,
    "type": "church",
    "name": "Moon Temple",
    "biome": "forest",
    "neighbors": [
      18,
      24,
      39,
      41
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 41,
    "gx": 54,
    "gy": 44,
    "gz": 2,
    "type": "town",
    "name": "Elderwood Spire",
    "biome": "forest",
    "neighbors": [
      23,
      40,
      42,
      43
    ],
    "townData": {
      "name": "Elderwood Spire",
      "level": 1,
      "baseValue": 620,
      "taxYield": 78,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Ancient Chimera",
      "monsterHp": 100,
      "monsterAtk": 18,
      "monsterDef": 10
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 42,
    "gx": 50,
    "gy": 44,
    "gz": 2,
    "type": "vault",
    "name": "Mystic Sylvan Cache",
    "biome": "forest",
    "neighbors": [
      22,
      41
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 43,
    "gx": 20,
    "gy": 43,
    "gz": 3,
    "type": "empty",
    "name": "Frostfall Incline",
    "biome": "snow",
    "neighbors": [
      12,
      41,
      44,
      64
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 44,
    "gx": 25,
    "gy": 43,
    "gz": 3,
    "type": "blue",
    "name": "Glacial Springs",
    "biome": "snow",
    "neighbors": [
      43,
      45,
      62
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 45,
    "gx": 30,
    "gy": 43,
    "gz": 3,
    "type": "shop_item",
    "name": "Alpine Outpost",
    "biome": "snow",
    "neighbors": [
      10,
      44,
      46,
      61
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 46,
    "gx": 35,
    "gy": 43,
    "gz": 4,
    "type": "red",
    "name": "Blizzard Ridge",
    "biome": "snow",
    "neighbors": [
      45,
      47,
      63
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 47,
    "gx": 39,
    "gy": 43,
    "gz": 4,
    "type": "tavern",
    "name": "Frostbite Hearth Inn",
    "biome": "snow",
    "neighbors": [
      46,
      48,
      59
    ],
    "townData": {
      "name": "Glacier Citadel",
      "level": 1,
      "baseValue": 650,
      "taxYield": 80,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Frost Wyrm",
      "monsterHp": 110,
      "monsterAtk": 19,
      "monsterDef": 12
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 48,
    "gx": 39,
    "gy": 47,
    "gz": 4,
    "type": "church",
    "name": "Hermit Peak Altar",
    "biome": "snow",
    "neighbors": [
      47,
      49,
      58
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 49,
    "gx": 35,
    "gy": 47,
    "gz": 4,
    "type": "vault",
    "name": "Icebound Chest",
    "biome": "snow",
    "neighbors": [
      48,
      50,
      57
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 50,
    "gx": 30,
    "gy": 47,
    "gz": 4,
    "type": "empty",
    "name": "High Crag",
    "biome": "snow",
    "neighbors": [
      49,
      51
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 51,
    "gx": 25,
    "gy": 47,
    "gz": 4,
    "type": "guild",
    "name": "Winterguard Hunter Lodge",
    "biome": "snow",
    "neighbors": [
      50,
      52,
      55
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 52,
    "gx": 20,
    "gy": 47,
    "gz": 5,
    "type": "town",
    "name": "Highpeak Sanctuary",
    "biome": "snow",
    "neighbors": [
      51,
      53,
      56
    ],
    "townData": {
      "name": "Highpeak Sanctuary",
      "level": 1,
      "baseValue": 700,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Yeti Chieftain",
      "monsterHp": 120,
      "monsterAtk": 20,
      "monsterDef": 14
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 53,
    "gx": 15,
    "gy": 47,
    "gz": 5,
    "type": "blue",
    "name": "Aurora Pool",
    "biome": "snow",
    "neighbors": [
      52,
      54
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 54,
    "gx": 11,
    "gy": 47,
    "gz": 4,
    "type": "empty",
    "name": "Avalanche Pass",
    "biome": "snow",
    "neighbors": [
      53,
      55
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 55,
    "gx": 11,
    "gy": 52,
    "gz": 4,
    "type": "fishing",
    "name": "Icebreak Fishing Hole",
    "biome": "snow",
    "neighbors": [
      51,
      54,
      56
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 56,
    "gx": 15,
    "gy": 52,
    "gz": 4,
    "type": "shop_magic",
    "name": "Frost Rune Hut",
    "biome": "snow",
    "neighbors": [
      52,
      55,
      57
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 57,
    "gx": 20,
    "gy": 52,
    "gz": 4,
    "type": "empty",
    "name": "Snowy Steps",
    "biome": "snow",
    "neighbors": [
      49,
      56,
      58
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 58,
    "gx": 25,
    "gy": 52,
    "gz": 4,
    "type": "town",
    "name": "Frostfall Castle",
    "biome": "snow",
    "neighbors": [
      48,
      57,
      59,
      115
    ],
    "townData": {
      "name": "Frostfall Castle",
      "level": 1,
      "baseValue": 720,
      "taxYield": 88,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Ice Colossus",
      "monsterHp": 130,
      "monsterAtk": 21,
      "monsterDef": 15
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 59,
    "gx": 30,
    "gy": 52,
    "gz": 4,
    "type": "vault",
    "name": "Glacial Vault",
    "biome": "snow",
    "neighbors": [
      47,
      58,
      60
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 60,
    "gx": 35,
    "gy": 52,
    "gz": 3,
    "type": "blue",
    "name": "Crystal Geyser",
    "biome": "snow",
    "neighbors": [
      59,
      61
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 61,
    "gx": 35,
    "gy": 57,
    "gz": 3,
    "type": "church",
    "name": "St. Nicholas Abbey",
    "biome": "snow",
    "neighbors": [
      45,
      60,
      62
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 62,
    "gx": 30,
    "gy": 57,
    "gz": 3,
    "type": "red",
    "name": "Icefall Cliff",
    "biome": "snow",
    "neighbors": [
      44,
      61,
      63
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 63,
    "gx": 25,
    "gy": 57,
    "gz": 3,
    "type": "town",
    "name": "Icebound Bastion",
    "biome": "snow",
    "neighbors": [
      46,
      62,
      64,
      107
    ],
    "townData": {
      "name": "Icebound Bastion",
      "level": 1,
      "baseValue": 750,
      "taxYield": 90,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Ancient Frost Dragon",
      "monsterHp": 140,
      "monsterAtk": 22,
      "monsterDef": 16
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 64,
    "gx": 20,
    "gy": 57,
    "gz": 3,
    "type": "empty",
    "name": "Glacier Causeway",
    "biome": "snow",
    "neighbors": [
      43,
      63,
      154
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 65,
    "gx": 84,
    "gy": 31,
    "gz": 1,
    "type": "empty",
    "name": "Dune Gate",
    "biome": "desert",
    "neighbors": [
      25,
      66,
      85
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 66,
    "gx": 88,
    "gy": 31,
    "gz": 1,
    "type": "blue",
    "name": "Mirage Oasis",
    "biome": "desert",
    "neighbors": [
      65,
      67,
      84
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 67,
    "gx": 93,
    "gy": 31,
    "gz": 0,
    "type": "shop_item",
    "name": "Nomad Bazaar",
    "biome": "desert",
    "neighbors": [
      66,
      68,
      83
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 68,
    "gx": 98,
    "gy": 31,
    "gz": 0,
    "type": "town",
    "name": "Duneport Haven",
    "biome": "desert",
    "neighbors": [
      67,
      69,
      81
    ],
    "townData": {
      "name": "Duneport Haven",
      "level": 1,
      "baseValue": 600,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Desert Bandit Warlord",
      "monsterHp": 95,
      "monsterAtk": 17,
      "monsterDef": 9
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 69,
    "gx": 103,
    "gy": 31,
    "gz": 0,
    "type": "red",
    "name": "Scorpion Pit",
    "biome": "desert",
    "neighbors": [
      68,
      70,
      79
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 70,
    "gx": 103,
    "gy": 35,
    "gz": 0,
    "type": "empty",
    "name": "Sunken Road",
    "biome": "desert",
    "neighbors": [
      69,
      71,
      80
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 71,
    "gx": 98,
    "gy": 35,
    "gz": 0,
    "type": "tavern",
    "name": "Scorpion Oasis Saloon",
    "biome": "desert",
    "neighbors": [
      35,
      70,
      72
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 72,
    "gx": 93,
    "gy": 35,
    "gz": 0,
    "type": "blue",
    "name": "Palm Springs",
    "biome": "desert",
    "neighbors": [
      71,
      73,
      76
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 73,
    "gx": 88,
    "gy": 35,
    "gz": 0,
    "type": "church",
    "name": "Solar Sun Temple",
    "biome": "desert",
    "neighbors": [
      72,
      74,
      77
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 74,
    "gx": 88,
    "gy": 40,
    "gz": 1,
    "type": "town",
    "name": "Mirage Citadel",
    "biome": "desert",
    "neighbors": [
      73,
      75,
      78
    ],
    "townData": {
      "name": "Mirage Citadel",
      "level": 1,
      "baseValue": 640,
      "taxYield": 80,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Sandstone Sphinx",
      "monsterHp": 110,
      "monsterAtk": 19,
      "monsterDef": 12
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 75,
    "gx": 93,
    "gy": 40,
    "gz": 1,
    "type": "guild",
    "name": "Dune Mercenary Guild",
    "biome": "desert",
    "neighbors": [
      74,
      76
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 76,
    "gx": 98,
    "gy": 40,
    "gz": 1,
    "type": "empty",
    "name": "Canyon Passage",
    "biome": "desert",
    "neighbors": [
      72,
      75,
      77
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 77,
    "gx": 103,
    "gy": 40,
    "gz": 1,
    "type": "red",
    "name": "Sandstorm Maw",
    "biome": "desert",
    "neighbors": [
      73,
      76,
      78,
      138
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 78,
    "gx": 103,
    "gy": 45,
    "gz": 0,
    "type": "shop_magic",
    "name": "Pyramid Hieroglyph Spire",
    "biome": "desert",
    "neighbors": [
      74,
      77,
      79
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 79,
    "gx": 98,
    "gy": 45,
    "gz": 0,
    "type": "blue",
    "name": "Emerald Oasis",
    "biome": "desert",
    "neighbors": [
      69,
      78,
      80
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 80,
    "gx": 93,
    "gy": 45,
    "gz": 0,
    "type": "isekai_event",
    "name": "Wandering Isekai Merchant",
    "biome": "desert",
    "neighbors": [
      70,
      79,
      81
    ],
    "townData": {
      "name": "Oasis Bastion",
      "level": 1,
      "baseValue": 680,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Sand Dune Behemoth",
      "monsterHp": 120,
      "monsterAtk": 20,
      "monsterDef": 13
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 81,
    "gx": 88,
    "gy": 45,
    "gz": 0,
    "type": "empty",
    "name": "Sunfire Trail",
    "biome": "desert",
    "neighbors": [
      68,
      80,
      82
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 82,
    "gx": 88,
    "gy": 50,
    "gz": 0,
    "type": "church",
    "name": "Dune Sanctuary",
    "biome": "desert",
    "neighbors": [
      81,
      83
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 83,
    "gx": 93,
    "gy": 50,
    "gz": 0,
    "type": "vault",
    "name": "Pharaoh Vault",
    "biome": "desert",
    "neighbors": [
      67,
      82,
      84,
      143
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 84,
    "gx": 98,
    "gy": 50,
    "gz": 0,
    "type": "red",
    "name": "Cactus Labyrinth",
    "biome": "desert",
    "neighbors": [
      66,
      83,
      85
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 85,
    "gx": 98,
    "gy": 55,
    "gz": 0,
    "type": "empty",
    "name": "Desert Perimeter",
    "biome": "desert",
    "neighbors": [
      65,
      84
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 86,
    "gx": 9,
    "gy": 33,
    "gz": 1,
    "type": "empty",
    "name": "Cavern Mouth",
    "biome": "cavern",
    "neighbors": [
      12,
      87,
      106
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 87,
    "gx": 9,
    "gy": 38,
    "gz": 1,
    "type": "blue",
    "name": "Glowstone Spring",
    "biome": "cavern",
    "neighbors": [
      86,
      88
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 88,
    "gx": 14,
    "gy": 38,
    "gz": 2,
    "type": "shop_item",
    "name": "Mining Provisioner",
    "biome": "cavern",
    "neighbors": [
      87,
      89,
      104
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 89,
    "gx": 19,
    "gy": 38,
    "gz": 2,
    "type": "town",
    "name": "Ironcrag Citadel",
    "biome": "cavern",
    "neighbors": [
      88,
      90,
      103
    ],
    "townData": {
      "name": "Ironcrag Citadel",
      "level": 1,
      "baseValue": 700,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Dwarven Automaton",
      "monsterHp": 125,
      "monsterAtk": 21,
      "monsterDef": 16
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 90,
    "gx": 19,
    "gy": 43,
    "gz": 2,
    "type": "red",
    "name": "Chasm Collapse",
    "biome": "cavern",
    "neighbors": [
      14,
      89,
      91
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 91,
    "gx": 14,
    "gy": 43,
    "gz": 2,
    "type": "tavern",
    "name": "Dwarven Keg & Barrel",
    "biome": "cavern",
    "neighbors": [
      90,
      92,
      101
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 92,
    "gx": 9,
    "gy": 43,
    "gz": 2,
    "type": "church",
    "name": "Underground Shinto",
    "biome": "cavern",
    "neighbors": [
      91,
      93,
      100
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 93,
    "gx": 4,
    "gy": 43,
    "gz": 2,
    "type": "blue",
    "name": "Mithril Spring",
    "biome": "cavern",
    "neighbors": [
      92,
      94,
      105
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 94,
    "gx": 4,
    "gy": 48,
    "gz": 2,
    "type": "empty",
    "name": "Minecart Rail Bridge",
    "biome": "cavern",
    "neighbors": [
      93,
      95,
      98
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 95,
    "gx": 9,
    "gy": 48,
    "gz": 2,
    "type": "guild",
    "name": "Deepdelver Guild Hall",
    "biome": "cavern",
    "neighbors": [
      94,
      96,
      99
    ],
    "townData": {
      "name": "Forgepost Hold",
      "level": 1,
      "baseValue": 740,
      "taxYield": 90,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Cavern Behemoth",
      "monsterHp": 135,
      "monsterAtk": 22,
      "monsterDef": 15
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 96,
    "gx": 14,
    "gy": 48,
    "gz": 2,
    "type": "vault",
    "name": "Deep Ore Vault",
    "biome": "cavern",
    "neighbors": [
      95,
      97
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 97,
    "gx": 19,
    "gy": 48,
    "gz": 2,
    "type": "empty",
    "name": "Obsidian Rail",
    "biome": "cavern",
    "neighbors": [
      96,
      98
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 98,
    "gx": 19,
    "gy": 53,
    "gz": 2,
    "type": "shop_magic",
    "name": "Runic Cavern Altar",
    "biome": "cavern",
    "neighbors": [
      94,
      97,
      99,
      110
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 99,
    "gx": 14,
    "gy": 53,
    "gz": 2,
    "type": "red",
    "name": "Geothermal Vent",
    "biome": "cavern",
    "neighbors": [
      95,
      98,
      100
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 100,
    "gx": 9,
    "gy": 53,
    "gz": 3,
    "type": "blue",
    "name": "Crystal Cascade",
    "biome": "cavern",
    "neighbors": [
      92,
      99,
      101
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 101,
    "gx": 4,
    "gy": 53,
    "gz": 3,
    "type": "town",
    "name": "Mithril Gate Citadel",
    "biome": "cavern",
    "neighbors": [
      91,
      100,
      102
    ],
    "townData": {
      "name": "Mithril Gate Citadel",
      "level": 1,
      "baseValue": 780,
      "taxYield": 95,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Obsidian Dreadnought",
      "monsterHp": 145,
      "monsterAtk": 24,
      "monsterDef": 18
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 102,
    "gx": -1,
    "gy": 53,
    "gz": 3,
    "type": "church",
    "name": "Forge God Shrine",
    "biome": "cavern",
    "neighbors": [
      101,
      103
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 103,
    "gx": -1,
    "gy": 48,
    "gz": 2,
    "type": "empty",
    "name": "Dwarven Tunnel",
    "biome": "cavern",
    "neighbors": [
      89,
      102,
      104
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 104,
    "gx": -1,
    "gy": 43,
    "gz": 2,
    "type": "vault",
    "name": "Ancient Dwarf Cache",
    "biome": "cavern",
    "neighbors": [
      88,
      103,
      105
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 105,
    "gx": -1,
    "gy": 38,
    "gz": 1,
    "type": "empty",
    "name": "Underground Steps",
    "biome": "cavern",
    "neighbors": [
      93,
      104,
      106
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 106,
    "gx": 4,
    "gy": 38,
    "gz": 1,
    "type": "blue",
    "name": "Crystal Echo Cave",
    "biome": "cavern",
    "neighbors": [
      86,
      105
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 107,
    "gx": 41,
    "gy": 72,
    "gz": 3,
    "type": "empty",
    "name": "Magma Causeway",
    "biome": "volcano",
    "neighbors": [
      63,
      108,
      128
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 108,
    "gx": 46,
    "gy": 72,
    "gz": 3,
    "type": "red",
    "name": "Lava Falls",
    "biome": "volcano",
    "neighbors": [
      107,
      109
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 109,
    "gx": 51,
    "gy": 72,
    "gz": 3,
    "type": "shop_item",
    "name": "Brimstone Outpost",
    "biome": "volcano",
    "neighbors": [
      108,
      110,
      125
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 110,
    "gx": 56,
    "gy": 72,
    "gz": 4,
    "type": "blue",
    "name": "Ashen Spring",
    "biome": "volcano",
    "neighbors": [
      98,
      109,
      111,
      126
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 111,
    "gx": 60,
    "gy": 72,
    "gz": 4,
    "type": "town",
    "name": "Brimstone Bastion",
    "biome": "volcano",
    "neighbors": [
      110,
      112,
      123
    ],
    "townData": {
      "name": "Brimstone Bastion",
      "level": 1,
      "baseValue": 800,
      "taxYield": 100,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Fire Wyrm Elder",
      "monsterHp": 150,
      "monsterAtk": 25,
      "monsterDef": 16
    },
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 112,
    "gx": 65,
    "gy": 72,
    "gz": 4,
    "type": "red",
    "name": "Magma River Crossing",
    "biome": "volcano",
    "neighbors": [
      111,
      113,
      122
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 113,
    "gx": 65,
    "gy": 77,
    "gz": 4,
    "type": "shop_weapon",
    "name": "Hellfire Forge",
    "biome": "volcano",
    "neighbors": [
      112,
      114,
      121
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 114,
    "gx": 60,
    "gy": 77,
    "gz": 4,
    "type": "vault",
    "name": "Molten Core Vault",
    "biome": "volcano",
    "neighbors": [
      113,
      115
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 115,
    "gx": 56,
    "gy": 77,
    "gz": 4,
    "type": "isekai_event",
    "name": "Ancient Dragon Obelisk",
    "biome": "volcano",
    "neighbors": [
      58,
      114,
      116,
      119
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 116,
    "gx": 51,
    "gy": 77,
    "gz": 4,
    "type": "empty",
    "name": "Cinder Incline",
    "biome": "volcano",
    "neighbors": [
      115,
      117,
      120
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 117,
    "gx": 46,
    "gy": 77,
    "gz": 4,
    "type": "town",
    "name": "Caldera Fortress",
    "biome": "volcano",
    "neighbors": [
      116,
      118
    ],
    "townData": {
      "name": "Caldera Fortress",
      "level": 1,
      "baseValue": 850,
      "taxYield": 110,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Magma Colossus",
      "monsterHp": 165,
      "monsterAtk": 26,
      "monsterDef": 18
    },
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 118,
    "gx": 41,
    "gy": 77,
    "gz": 4,
    "type": "blue",
    "name": "Sulfur Basin",
    "biome": "volcano",
    "neighbors": [
      117,
      119
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 119,
    "gx": 41,
    "gy": 82,
    "gz": 4,
    "type": "red",
    "name": "Volcanic Fissure",
    "biome": "volcano",
    "neighbors": [
      115,
      118,
      120
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 120,
    "gx": 46,
    "gy": 82,
    "gz": 4,
    "type": "shop_magic",
    "name": "Hellfire Arcana",
    "biome": "volcano",
    "neighbors": [
      116,
      119,
      121
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 121,
    "gx": 51,
    "gy": 82,
    "gz": 4,
    "type": "empty",
    "name": "Smoldering Bridge",
    "biome": "volcano",
    "neighbors": [
      113,
      120,
      122
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 122,
    "gx": 56,
    "gy": 82,
    "gz": 4,
    "type": "vault",
    "name": "Dragon Hoard Vault",
    "biome": "volcano",
    "neighbors": [
      112,
      121,
      123
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 123,
    "gx": 60,
    "gy": 82,
    "gz": 5,
    "type": "town",
    "name": "Obsidian Citadel",
    "biome": "volcano",
    "neighbors": [
      111,
      122,
      124
    ],
    "townData": {
      "name": "Obsidian Citadel",
      "level": 1,
      "baseValue": 900,
      "taxYield": 120,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Infernal Archdemon",
      "monsterHp": 180,
      "monsterAtk": 27,
      "monsterDef": 19
    },
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 124,
    "gx": 65,
    "gy": 82,
    "gz": 5,
    "type": "church",
    "name": "Altar of Fire",
    "biome": "volcano",
    "neighbors": [
      123,
      125
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 125,
    "gx": 65,
    "gy": 87,
    "gz": 5,
    "type": "red",
    "name": "Dragon Horn Crest",
    "biome": "volcano",
    "neighbors": [
      109,
      124,
      126
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 126,
    "gx": 60,
    "gy": 87,
    "gz": 5,
    "type": "blue",
    "name": "Ignis Geyser",
    "biome": "volcano",
    "neighbors": [
      110,
      125,
      127
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 127,
    "gx": 56,
    "gy": 87,
    "gz": 5,
    "type": "empty",
    "name": "Apex Ascent",
    "biome": "volcano",
    "neighbors": [
      126,
      128
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 128,
    "gx": 51,
    "gy": 87,
    "gz": 5,
    "type": "boss",
    "name": "Dragon King Ignis Keep",
    "biome": "volcano",
    "neighbors": [
      107,
      127,
      150
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 129,
    "gx": 10,
    "gy": 31,
    "gz": 0,
    "type": "empty",
    "name": "Tidepool Causeway",
    "biome": "coral",
    "neighbors": [
      16,
      130,
      145
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 130,
    "gx": 15,
    "gy": 31,
    "gz": 0,
    "type": "blue",
    "name": "Pearl Shell Beach",
    "biome": "coral",
    "neighbors": [
      129,
      131,
      144
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 131,
    "gx": 20,
    "gy": 31,
    "gz": 0,
    "type": "fishing",
    "name": "Lagoon Angler Pier",
    "biome": "coral",
    "neighbors": [
      2,
      130,
      132,
      143
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 132,
    "gx": 24,
    "gy": 31,
    "gz": 0,
    "type": "town",
    "name": "Coral Bay Port",
    "biome": "coral",
    "neighbors": [
      131,
      133,
      142
    ],
    "townData": {
      "name": "Coral Bay Port",
      "level": 1,
      "baseValue": 620,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Pirate Captain Bloodhook",
      "monsterHp": 100,
      "monsterAtk": 18,
      "monsterDef": 11
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 133,
    "gx": 29,
    "gy": 31,
    "gz": 0,
    "type": "red",
    "name": "Reef Spikes",
    "biome": "coral",
    "neighbors": [
      132,
      134,
      141
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 134,
    "gx": 29,
    "gy": 35,
    "gz": 0,
    "type": "tavern",
    "name": "The Salty Siren Pub",
    "biome": "coral",
    "neighbors": [
      133,
      135,
      140
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 135,
    "gx": 24,
    "gy": 35,
    "gz": 0,
    "type": "shop_weapon",
    "name": "Cutlass Forge",
    "biome": "coral",
    "neighbors": [
      134,
      136,
      139
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 136,
    "gx": 20,
    "gy": 35,
    "gz": 0,
    "type": "blue",
    "name": "Lagoon Waters",
    "biome": "coral",
    "neighbors": [
      135,
      137,
      138
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 137,
    "gx": 15,
    "gy": 35,
    "gz": 0,
    "type": "church",
    "name": "Sea Nymph Shrine",
    "biome": "coral",
    "neighbors": [
      136,
      138
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 138,
    "gx": 10,
    "gy": 35,
    "gz": 0,
    "type": "town",
    "name": "Siren Rock Citadel",
    "biome": "coral",
    "neighbors": [
      77,
      136,
      137,
      139
    ],
    "townData": {
      "name": "Siren Rock Citadel",
      "level": 1,
      "baseValue": 660,
      "taxYield": 80,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Abyssal Siren Queen",
      "monsterHp": 115,
      "monsterAtk": 19,
      "monsterDef": 12
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 139,
    "gx": 10,
    "gy": 40,
    "gz": 0,
    "type": "fishing",
    "name": "Deepsea Fishing Jetty",
    "biome": "coral",
    "neighbors": [
      135,
      138,
      140
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 140,
    "gx": 15,
    "gy": 40,
    "gz": 0,
    "type": "empty",
    "name": "Coral Walkway",
    "biome": "coral",
    "neighbors": [
      134,
      139,
      141
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 141,
    "gx": 20,
    "gy": 40,
    "gz": 0,
    "type": "shop_magic",
    "name": "Tide Arcana Hut",
    "biome": "coral",
    "neighbors": [
      133,
      140,
      142
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 142,
    "gx": 24,
    "gy": 40,
    "gz": 0,
    "type": "blue",
    "name": "Bioluminescent Pool",
    "biome": "coral",
    "neighbors": [
      132,
      141,
      143
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 143,
    "gx": 29,
    "gy": 40,
    "gz": 0,
    "type": "red",
    "name": "Kraken Whirlpool",
    "biome": "coral",
    "neighbors": [
      83,
      131,
      142,
      144
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 144,
    "gx": 29,
    "gy": 45,
    "gz": 0,
    "type": "town",
    "name": "Kraken Point Haven",
    "biome": "coral",
    "neighbors": [
      130,
      143,
      145
    ],
    "townData": {
      "name": "Kraken Point Haven",
      "level": 1,
      "baseValue": 700,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Lesser Kraken",
      "monsterHp": 130,
      "monsterAtk": 21,
      "monsterDef": 14
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 145,
    "gx": 10,
    "gy": 45,
    "gz": 0,
    "type": "empty",
    "name": "Shoal Highway",
    "biome": "coral",
    "neighbors": [
      129,
      144
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 146,
    "gx": 0,
    "gy": 20,
    "gz": 0,
    "type": "empty",
    "name": "Void Fissure Entrance",
    "biome": "abyss",
    "neighbors": [
      0,
      147,
      150,
      154
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 147,
    "gx": 0,
    "gy": 25,
    "gz": 1,
    "type": "blue",
    "name": "Soul Crystal Well",
    "biome": "abyss",
    "neighbors": [
      146,
      148,
      153
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 148,
    "gx": 0,
    "gy": 30,
    "gz": 1,
    "type": "town",
    "name": "Nether Watch Citadel",
    "biome": "abyss",
    "neighbors": [
      147,
      149,
      152
    ],
    "townData": {
      "name": "Nether Watch Citadel",
      "level": 1,
      "baseValue": 800,
      "taxYield": 95,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Nether Knight Commander",
      "monsterHp": 155,
      "monsterAtk": 25,
      "monsterDef": 17
    },
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 149,
    "gx": 0,
    "gy": 34,
    "gz": 2,
    "type": "shop_item",
    "name": "Underworld Merchant",
    "biome": "abyss",
    "neighbors": [
      148,
      150,
      151
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 150,
    "gx": 0,
    "gy": 39,
    "gz": 2,
    "type": "dark_gate",
    "name": "Altar of Rico (Darkling Throne)",
    "biome": "abyss",
    "neighbors": [
      128,
      146,
      149,
      151
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 151,
    "gx": 0,
    "gy": 44,
    "gz": 1,
    "type": "red",
    "name": "Abyssal Trap",
    "biome": "abyss",
    "neighbors": [
      149,
      150,
      152
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 152,
    "gx": 0,
    "gy": 49,
    "gz": 1,
    "type": "church",
    "name": "Nether Shrine",
    "biome": "abyss",
    "neighbors": [
      148,
      151,
      153
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 153,
    "gx": 0,
    "gy": 54,
    "gz": 1,
    "type": "town",
    "name": "Void Gate Citadel",
    "biome": "abyss",
    "neighbors": [
      147,
      152,
      154
    ],
    "townData": {
      "name": "Void Gate Citadel",
      "level": 1,
      "baseValue": 850,
      "taxYield": 100,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Void Warden Behemoth",
      "monsterHp": 170,
      "monsterAtk": 26,
      "monsterDef": 18
    },
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 154,
    "gx": 0,
    "gy": 58,
    "gz": 0,
    "type": "vault",
    "name": "Rico Secret Vault",
    "biome": "abyss",
    "neighbors": [
      64,
      146,
      153
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": true
  }
];
