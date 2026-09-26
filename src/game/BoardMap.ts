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
  | 'isekai_event'
  | 'mystery_chest'
  | 'home';

export type BiomeType =
  | 'grass'
  | 'forest'
  | 'waterfall_forest'
  | 'snow'
  | 'desert'
  | 'volcano'
  | 'cavern'
  | 'coral'
  | 'abyss'
  | 'castle'
  | 'fairy_grove'
  | 'crystal_cavern'
  | 'celestial'
  | 'steampunk'
  | 'sakura_shrine';

export type RealmId = 'solaria' | 'frostpeak' | 'sunfire' | 'abyss' | 'celestial' | 'emerald';

export interface TownData {
  name: string;
  level: number;
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

export interface HomeData {
  ownerId: number;
  ownerName: string;
  level: number;
  purchasePrice?: number;
  visitorsCount?: number;
  tollFee?: number;
}

export interface BoardNode {
  id: number;
  gx: number;
  gy: number;
  gz: number;
  type: SpaceType;
  name: string;
  biome: BiomeType;
  neighbors: number[];
  townData?: TownData;
  homeData?: HomeData;
  realmId: RealmId;
  realmName: string;
  subRegionName: string;
  weather: 'sunny' | 'rain' | 'snow' | 'heatwave' | 'miasma';
  isGrandBridge?: boolean;
}

// =========================================================================================
// DOKAPON CONTINENT: 312 NODES ACROSS 6 GRAND MACRO REALMS & 15 SUB-REGIONS
//
// This array is also the pristine baseline for a new game. It must never be mutated
// during play - runtime board state lives on a deep clone produced by
// GameState.resetBoard(). Keep the JSON formatting: scripts/fix_board_connections.cjs and
// scripts/rebalance_town_monsters.cjs rewrite this file in exactly this shape.
//
// Invariant (enforced by tests/board.test.mjs): a node carries `townData` if and only if
// its `type` is 'town', every id 0..N-1 appears exactly once, no two nodes share a
// grid position, neighbor links are symmetric and the graph is fully connected.
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
      199
    ],
    "townData": {
      "name": "Oakshire Capital",
      "level": 1,
      "baseValue": 450,
      "taxYield": 50,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Slime Princess Aurelia",
      "monsterHp": 107,
      "monsterAtk": 16,
      "monsterDef": 9,
      "monsterMaxHp": 107
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
      2
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
      3
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
      4
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
      5
    ],
    "townData": {
      "name": "Lakeview Keep",
      "level": 1,
      "baseValue": 480,
      "taxYield": 55,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Lake Goblin Girl Mizuki",
      "monsterHp": 105,
      "monsterAtk": 13,
      "monsterDef": 10,
      "monsterMaxHp": 105
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
      6
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
      7
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
      155
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
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
      9
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
      10
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
      11
    ],
    "townData": {
      "name": "Riverdale Borough",
      "level": 1,
      "baseValue": 500,
      "taxYield": 60,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "River Harpy Maiden Zephyra",
      "monsterHp": 87,
      "monsterAtk": 14,
      "monsterDef": 8,
      "monsterMaxHp": 87
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
    "type": "mystery_chest",
    "name": "กล่องสุ่มมหัศจรรย์โซลาเรีย",
    "biome": "grass",
    "neighbors": [
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
      11,
      13
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
      13,
      15
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
      17
    ],
    "townData": {
      "name": "King's Crossing",
      "level": 1,
      "baseValue": 520,
      "taxYield": 65,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Highway Bandit Lass Scarlett",
      "monsterHp": 89,
      "monsterAtk": 15,
      "monsterDef": 8,
      "monsterMaxHp": 89
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
      17,
      19
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
      18
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 20,
    "gx": 15,
    "gy": 25,
    "gz": 0,
    "type": "empty",
    "name": "Pasture Hill",
    "biome": "grass",
    "neighbors": [
      21,
      175
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 21,
    "gx": 15,
    "gy": 20,
    "gz": 0,
    "type": "empty",
    "name": "Capital Southgate",
    "biome": "grass",
    "neighbors": [
      0,
      20,
      210
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ทุ่งหญ้าราชธานีโซลาเรีย",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 22,
    "gx": 48,
    "gy": 9,
    "gz": 1,
    "type": "empty",
    "name": "Canopy Entrance",
    "biome": "forest",
    "neighbors": [
      23
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 23,
    "gx": 53,
    "gy": 9,
    "gz": 1,
    "type": "tavern",
    "name": "Fairy Whisper Tavern",
    "biome": "forest",
    "neighbors": [
      22,
      24
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 24,
    "gx": 58,
    "gy": 9,
    "gz": 1,
    "type": "blue",
    "name": "Fairy Glen",
    "biome": "forest",
    "neighbors": [
      23,
      25
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 25,
    "gx": 62,
    "gy": 9,
    "gz": 2,
    "type": "town",
    "name": "Sylva Village",
    "biome": "forest",
    "neighbors": [
      24,
      26
    ],
    "townData": {
      "name": "Sylva Village",
      "level": 1,
      "baseValue": 550,
      "taxYield": 70,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Briar Kobold Witch Maya",
      "monsterHp": 85,
      "monsterAtk": 14,
      "monsterDef": 10,
      "monsterMaxHp": 85
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 26,
    "gx": 67,
    "gy": 9,
    "gz": 2,
    "type": "red",
    "name": "Witch Mire",
    "biome": "forest",
    "neighbors": [
      25,
      27
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 27,
    "gx": 67,
    "gy": 14,
    "gz": 2,
    "type": "guild",
    "name": "Sylph Rangers Guild",
    "biome": "forest",
    "neighbors": [
      26,
      28,
      31
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 28,
    "gx": 62,
    "gy": 14,
    "gz": 2,
    "type": "shop_magic",
    "name": "Arcane Treehouse",
    "biome": "forest",
    "neighbors": [
      27,
      29
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 29,
    "gx": 58,
    "gy": 14,
    "gz": 2,
    "type": "church",
    "name": "Druidic Monolith",
    "biome": "forest",
    "neighbors": [
      28
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 30,
    "gx": 62,
    "gy": 18,
    "gz": 2,
    "type": "fishing",
    "name": "Mystic Pond Fishing Spot",
    "biome": "forest",
    "neighbors": [
      31
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 31,
    "gx": 67,
    "gy": 18,
    "gz": 2,
    "type": "blue",
    "name": "Glowing Flora",
    "biome": "forest",
    "neighbors": [
      27,
      30,
      32
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 32,
    "gx": 72,
    "gy": 18,
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
    "gx": 72,
    "gy": 23,
    "gz": 2,
    "type": "mystery_chest",
    "name": "กล่องสุ่มมหัศจรรย์เอลฟ์",
    "biome": "forest",
    "neighbors": [
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
    "gx": 67,
    "gy": 23,
    "gz": 2,
    "type": "shop_weapon",
    "name": "Woodsman Bowyer",
    "biome": "forest",
    "neighbors": [
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
    "gx": 62,
    "gy": 23,
    "gz": 2,
    "type": "empty",
    "name": "Bramble Path",
    "biome": "forest",
    "neighbors": [
      34,
      36
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 36,
    "gx": 58,
    "gy": 23,
    "gz": 2,
    "type": "isekai_event",
    "name": "Fairy Reincarnation Grove",
    "biome": "forest",
    "neighbors": [
      35,
      37,
      155
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 37,
    "gx": 58,
    "gy": 28,
    "gz": 2,
    "type": "red",
    "name": "Poison Spore Bog",
    "biome": "forest",
    "neighbors": [
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
    "gx": 62,
    "gy": 28,
    "gz": 2,
    "type": "blue",
    "name": "Sacred Pool",
    "biome": "forest",
    "neighbors": [
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
    "gx": 67,
    "gy": 28,
    "gz": 2,
    "type": "empty",
    "name": "Ancient Hollow",
    "biome": "forest",
    "neighbors": [
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
    "gx": 67,
    "gy": 33,
    "gz": 2,
    "type": "church",
    "name": "Moon Temple",
    "biome": "forest",
    "neighbors": [
      39,
      41,
      183
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 41,
    "gx": 62,
    "gy": 33,
    "gz": 2,
    "type": "town",
    "name": "Elderwood Spire",
    "biome": "forest",
    "neighbors": [
      40,
      42
    ],
    "townData": {
      "name": "Elderwood Spire",
      "level": 1,
      "baseValue": 620,
      "taxYield": 78,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Chimera Empress Chimaria",
      "monsterHp": 109,
      "monsterAtk": 16,
      "monsterDef": 9,
      "monsterMaxHp": 109
    },
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": true
  },
  {
    "id": 42,
    "gx": 58,
    "gy": 33,
    "gz": 2,
    "type": "vault",
    "name": "Mystic Sylvan Cache",
    "biome": "forest",
    "neighbors": [
      41,
      168
    ],
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พงไพรมรกตเพรียกหา",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 43,
    "gx": 26,
    "gy": 2,
    "gz": 3,
    "type": "empty",
    "name": "Frostfall Incline",
    "biome": "snow",
    "neighbors": [
      44
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 44,
    "gx": 31,
    "gy": 2,
    "gz": 3,
    "type": "blue",
    "name": "Glacial Springs",
    "biome": "snow",
    "neighbors": [
      43,
      45
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 45,
    "gx": 36,
    "gy": 2,
    "gz": 3,
    "type": "shop_item",
    "name": "Alpine Outpost",
    "biome": "snow",
    "neighbors": [
      44,
      46
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 46,
    "gx": 41,
    "gy": 2,
    "gz": 4,
    "type": "red",
    "name": "Blizzard Ridge",
    "biome": "snow",
    "neighbors": [
      45,
      47
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 47,
    "gx": 45,
    "gy": 2,
    "gz": 4,
    "type": "tavern",
    "name": "Frostbite Hearth Inn",
    "biome": "snow",
    "neighbors": [
      46,
      48
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 48,
    "gx": 45,
    "gy": 6,
    "gz": 4,
    "type": "church",
    "name": "Hermit Peak Altar",
    "biome": "snow",
    "neighbors": [
      47,
      49
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 49,
    "gx": 41,
    "gy": 6,
    "gz": 4,
    "type": "vault",
    "name": "Icebound Chest",
    "biome": "snow",
    "neighbors": [
      48,
      50
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 50,
    "gx": 36,
    "gy": 6,
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
    "gx": 31,
    "gy": 6,
    "gz": 4,
    "type": "guild",
    "name": "Winterguard Hunter Lodge",
    "biome": "snow",
    "neighbors": [
      50,
      52
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 52,
    "gx": 26,
    "gy": 6,
    "gz": 5,
    "type": "town",
    "name": "Highpeak Sanctuary",
    "biome": "snow",
    "neighbors": [
      51,
      53
    ],
    "townData": {
      "name": "Highpeak Sanctuary",
      "level": 1,
      "baseValue": 700,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Yeti Chieftain Maiden Borealia",
      "monsterHp": 291,
      "monsterAtk": 36,
      "monsterDef": 24,
      "monsterMaxHp": 291
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 53,
    "gx": 21,
    "gy": 6,
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
    "gx": 17,
    "gy": 6,
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
    "gx": 17,
    "gy": 11,
    "gz": 4,
    "type": "fishing",
    "name": "Icebreak Fishing Hole",
    "biome": "snow",
    "neighbors": [
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
    "gx": 21,
    "gy": 11,
    "gz": 4,
    "type": "shop_magic",
    "name": "Frost Rune Hut",
    "biome": "snow",
    "neighbors": [
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
    "gx": 26,
    "gy": 11,
    "gz": 4,
    "type": "mystery_chest",
    "name": "กล่องสุ่มมหัศจรรย์ธารน้ำแข็ง",
    "biome": "snow",
    "neighbors": [
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
    "gx": 31,
    "gy": 11,
    "gz": 4,
    "type": "town",
    "name": "Frostfall Castle",
    "biome": "snow",
    "neighbors": [
      57,
      59
    ],
    "townData": {
      "name": "Frostfall Castle",
      "level": 1,
      "baseValue": 720,
      "taxYield": 88,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Glacial Golem Maiden Crystalina",
      "monsterHp": 305,
      "monsterAtk": 35,
      "monsterDef": 24,
      "monsterMaxHp": 305
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 59,
    "gx": 36,
    "gy": 11,
    "gz": 4,
    "type": "vault",
    "name": "Glacial Vault",
    "biome": "snow",
    "neighbors": [
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
    "gx": 41,
    "gy": 11,
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
    "gx": 41,
    "gy": 16,
    "gz": 3,
    "type": "church",
    "name": "St. Nicholas Abbey",
    "biome": "snow",
    "neighbors": [
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
    "gx": 36,
    "gy": 16,
    "gz": 3,
    "type": "red",
    "name": "Icefall Cliff",
    "biome": "snow",
    "neighbors": [
      61,
      63,
      223
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 63,
    "gx": 31,
    "gy": 16,
    "gz": 3,
    "type": "town",
    "name": "Icebound Bastion",
    "biome": "snow",
    "neighbors": [
      62,
      64
    ],
    "townData": {
      "name": "Icebound Bastion",
      "level": 1,
      "baseValue": 750,
      "taxYield": 90,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Ancient Frost Dragoness Saphira",
      "monsterHp": 326,
      "monsterAtk": 41,
      "monsterDef": 24,
      "monsterMaxHp": 326
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 64,
    "gx": 26,
    "gy": 16,
    "gz": 3,
    "type": "empty",
    "name": "Glacier Causeway",
    "biome": "snow",
    "neighbors": [
      63
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "ธารน้ำแข็งเหมันต์นิรันดร์",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 65,
    "gx": 90,
    "gy": 17,
    "gz": 1,
    "type": "empty",
    "name": "Dune Gate",
    "biome": "desert",
    "neighbors": [
      66
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 66,
    "gx": 94,
    "gy": 17,
    "gz": 1,
    "type": "blue",
    "name": "Mirage Oasis",
    "biome": "desert",
    "neighbors": [
      65,
      67
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 67,
    "gx": 99,
    "gy": 17,
    "gz": 0,
    "type": "shop_item",
    "name": "Nomad Bazaar",
    "biome": "desert",
    "neighbors": [
      66,
      68
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 68,
    "gx": 104,
    "gy": 17,
    "gz": 0,
    "type": "town",
    "name": "Duneport Haven",
    "biome": "desert",
    "neighbors": [
      67,
      69
    ],
    "townData": {
      "name": "Duneport Haven",
      "level": 1,
      "baseValue": 600,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Desert Bandit Queen Shani",
      "monsterHp": 194,
      "monsterAtk": 25,
      "monsterDef": 16,
      "monsterMaxHp": 194
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 69,
    "gx": 109,
    "gy": 17,
    "gz": 0,
    "type": "red",
    "name": "Scorpion Pit",
    "biome": "desert",
    "neighbors": [
      68,
      70
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 70,
    "gx": 109,
    "gy": 21,
    "gz": 0,
    "type": "empty",
    "name": "Sunken Road",
    "biome": "desert",
    "neighbors": [
      69,
      71
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 71,
    "gx": 104,
    "gy": 21,
    "gz": 0,
    "type": "tavern",
    "name": "Scorpion Oasis Saloon",
    "biome": "desert",
    "neighbors": [
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
    "gx": 99,
    "gy": 21,
    "gz": 0,
    "type": "blue",
    "name": "Palm Springs",
    "biome": "desert",
    "neighbors": [
      71,
      73
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 73,
    "gx": 94,
    "gy": 21,
    "gz": 0,
    "type": "church",
    "name": "Solar Sun Temple",
    "biome": "desert",
    "neighbors": [
      72,
      74
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 74,
    "gx": 94,
    "gy": 26,
    "gz": 1,
    "type": "town",
    "name": "Mirage Citadel",
    "biome": "desert",
    "neighbors": [
      73,
      75
    ],
    "townData": {
      "name": "Mirage Citadel",
      "level": 1,
      "baseValue": 640,
      "taxYield": 80,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Sandstone Sphinx Queen Nefertia",
      "monsterHp": 211,
      "monsterAtk": 23,
      "monsterDef": 17,
      "monsterMaxHp": 211
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 75,
    "gx": 99,
    "gy": 26,
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
    "gx": 104,
    "gy": 26,
    "gz": 1,
    "type": "empty",
    "name": "Canyon Passage",
    "biome": "desert",
    "neighbors": [
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
    "gx": 109,
    "gy": 26,
    "gz": 1,
    "type": "red",
    "name": "Sandstorm Maw",
    "biome": "desert",
    "neighbors": [
      76,
      78
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 78,
    "gx": 109,
    "gy": 31,
    "gz": 0,
    "type": "shop_magic",
    "name": "Pyramid Hieroglyph Spire",
    "biome": "desert",
    "neighbors": [
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
    "gx": 104,
    "gy": 31,
    "gz": 0,
    "type": "blue",
    "name": "Emerald Oasis",
    "biome": "desert",
    "neighbors": [
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
    "gx": 99,
    "gy": 31,
    "gz": 0,
    "type": "isekai_event",
    "name": "Wandering Isekai Merchant",
    "biome": "desert",
    "neighbors": [
      79,
      81
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": false
  },
  {
    "id": 81,
    "gx": 94,
    "gy": 31,
    "gz": 0,
    "type": "empty",
    "name": "Sunfire Trail",
    "biome": "desert",
    "neighbors": [
      80,
      82,
      134
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 82,
    "gx": 94,
    "gy": 36,
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
    "gx": 99,
    "gy": 36,
    "gz": 0,
    "type": "mystery_chest",
    "name": "กล่องสุ่มมหัศจรรย์ฟาโรห์",
    "biome": "desert",
    "neighbors": [
      82,
      84
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "เนินทรายทองคำสุริยัน",
    "weather": "heatwave",
    "isGrandBridge": true
  },
  {
    "id": 84,
    "gx": 104,
    "gy": 36,
    "gz": 0,
    "type": "red",
    "name": "Cactus Labyrinth",
    "biome": "desert",
    "neighbors": [
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
    "gx": 104,
    "gy": 41,
    "gz": 0,
    "type": "empty",
    "name": "Desert Perimeter",
    "biome": "desert",
    "neighbors": [
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
    "gx": 16,
    "gy": 29,
    "gz": 1,
    "type": "empty",
    "name": "Cavern Mouth",
    "biome": "cavern",
    "neighbors": [
      87
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 87,
    "gx": 16,
    "gy": 34,
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
    "gx": 21,
    "gy": 34,
    "gz": 2,
    "type": "shop_item",
    "name": "Mining Provisioner",
    "biome": "cavern",
    "neighbors": [
      87,
      89
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 89,
    "gx": 26,
    "gy": 34,
    "gz": 2,
    "type": "town",
    "name": "Ironcrag Citadel",
    "biome": "cavern",
    "neighbors": [
      88,
      90
    ],
    "townData": {
      "name": "Ironcrag Citadel",
      "level": 1,
      "baseValue": 700,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Clockwork Maiden Nicole",
      "monsterHp": 328,
      "monsterAtk": 34,
      "monsterDef": 29,
      "monsterMaxHp": 328
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 90,
    "gx": 26,
    "gy": 39,
    "gz": 2,
    "type": "red",
    "name": "Chasm Collapse",
    "biome": "cavern",
    "neighbors": [
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
    "gx": 21,
    "gy": 39,
    "gz": 2,
    "type": "tavern",
    "name": "Dwarven Keg & Barrel",
    "biome": "cavern",
    "neighbors": [
      90,
      92
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 92,
    "gx": 16,
    "gy": 39,
    "gz": 2,
    "type": "church",
    "name": "Underground Shinto",
    "biome": "cavern",
    "neighbors": [
      91,
      93
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 93,
    "gx": 11,
    "gy": 39,
    "gz": 2,
    "type": "blue",
    "name": "Mithril Spring",
    "biome": "cavern",
    "neighbors": [
      92,
      94
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 94,
    "gx": 11,
    "gy": 44,
    "gz": 2,
    "type": "empty",
    "name": "Minecart Rail Bridge",
    "biome": "cavern",
    "neighbors": [
      93,
      95
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 95,
    "gx": 16,
    "gy": 44,
    "gz": 2,
    "type": "guild",
    "name": "Deepdelver Guild Hall",
    "biome": "cavern",
    "neighbors": [
      94,
      96
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 96,
    "gx": 21,
    "gy": 44,
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
    "gx": 26,
    "gy": 44,
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
    "gx": 26,
    "gy": 49,
    "gz": 2,
    "type": "shop_magic",
    "name": "Runic Cavern Altar",
    "biome": "cavern",
    "neighbors": [
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
    "gx": 21,
    "gy": 49,
    "gz": 2,
    "type": "red",
    "name": "Geothermal Vent",
    "biome": "cavern",
    "neighbors": [
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
    "gx": 16,
    "gy": 49,
    "gz": 3,
    "type": "blue",
    "name": "Crystal Cascade",
    "biome": "cavern",
    "neighbors": [
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
    "gx": 11,
    "gy": 49,
    "gz": 3,
    "type": "town",
    "name": "Mithril Gate Citadel",
    "biome": "cavern",
    "neighbors": [
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
      "monsterName": "Obsidian Golem Valkyrie Onyxia",
      "monsterHp": 355,
      "monsterAtk": 35,
      "monsterDef": 24,
      "monsterMaxHp": 355
    },
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 102,
    "gx": 6,
    "gy": 49,
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
    "gx": 6,
    "gy": 44,
    "gz": 2,
    "type": "empty",
    "name": "Dwarven Tunnel",
    "biome": "cavern",
    "neighbors": [
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
    "gx": 6,
    "gy": 39,
    "gz": 2,
    "type": "vault",
    "name": "Ancient Dwarf Cache",
    "biome": "cavern",
    "neighbors": [
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
    "gx": 6,
    "gy": 34,
    "gz": 1,
    "type": "empty",
    "name": "Underground Steps",
    "biome": "cavern",
    "neighbors": [
      104,
      106,
      150
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": true
  },
  {
    "id": 106,
    "gx": 11,
    "gy": 34,
    "gz": 1,
    "type": "blue",
    "name": "Crystal Echo Cave",
    "biome": "cavern",
    "neighbors": [
      105,
      169,
      182
    ],
    "realmId": "frostpeak",
    "realmName": "จักรวรรดิธารน้ำแข็งฟรอสต์พีก",
    "subRegionName": "เตาหลอมศิลาคนแคระ",
    "weather": "snow",
    "isGrandBridge": false
  },
  {
    "id": 107,
    "gx": 10,
    "gy": 53,
    "gz": 3,
    "type": "empty",
    "name": "Magma Causeway",
    "biome": "volcano",
    "neighbors": [
      108
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 108,
    "gx": 15,
    "gy": 53,
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
    "gx": 20,
    "gy": 53,
    "gz": 3,
    "type": "shop_item",
    "name": "Brimstone Outpost",
    "biome": "volcano",
    "neighbors": [
      108,
      110
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 110,
    "gx": 25,
    "gy": 53,
    "gz": 4,
    "type": "blue",
    "name": "Ashen Spring",
    "biome": "volcano",
    "neighbors": [
      98,
      109,
      111
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 111,
    "gx": 29,
    "gy": 53,
    "gz": 4,
    "type": "town",
    "name": "Brimstone Bastion",
    "biome": "volcano",
    "neighbors": [
      110,
      112
    ],
    "townData": {
      "name": "Brimstone Bastion",
      "level": 1,
      "baseValue": 800,
      "taxYield": 100,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Fire Wyrm Matriarch Pyra",
      "monsterHp": 356,
      "monsterAtk": 41,
      "monsterDef": 26,
      "monsterMaxHp": 356
    },
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 112,
    "gx": 34,
    "gy": 53,
    "gz": 4,
    "type": "mystery_chest",
    "name": "กล่องสุ่มมหัศจรรย์ลาวาเนเธอร์",
    "biome": "volcano",
    "neighbors": [
      111,
      113
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 113,
    "gx": 34,
    "gy": 58,
    "gz": 4,
    "type": "shop_weapon",
    "name": "Hellfire Forge",
    "biome": "volcano",
    "neighbors": [
      112,
      114
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 114,
    "gx": 29,
    "gy": 58,
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
    "gx": 25,
    "gy": 58,
    "gz": 4,
    "type": "isekai_event",
    "name": "Ancient Dragon Obelisk",
    "biome": "volcano",
    "neighbors": [
      114,
      116
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 116,
    "gx": 20,
    "gy": 58,
    "gz": 4,
    "type": "empty",
    "name": "Cinder Incline",
    "biome": "volcano",
    "neighbors": [
      115,
      117
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 117,
    "gx": 15,
    "gy": 58,
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
      "monsterName": "Magma Golem Queen Ignitia",
      "monsterHp": 303,
      "monsterAtk": 34,
      "monsterDef": 24,
      "monsterMaxHp": 303
    },
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 118,
    "gx": 10,
    "gy": 58,
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
    "gx": 10,
    "gy": 63,
    "gz": 4,
    "type": "red",
    "name": "Volcanic Fissure",
    "biome": "volcano",
    "neighbors": [
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
    "gx": 15,
    "gy": 63,
    "gz": 4,
    "type": "shop_magic",
    "name": "Hellfire Arcana",
    "biome": "volcano",
    "neighbors": [
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
    "gx": 20,
    "gy": 63,
    "gz": 4,
    "type": "empty",
    "name": "Smoldering Bridge",
    "biome": "volcano",
    "neighbors": [
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
    "gx": 25,
    "gy": 63,
    "gz": 4,
    "type": "vault",
    "name": "Dragon Hoard Vault",
    "biome": "volcano",
    "neighbors": [
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
    "gx": 29,
    "gy": 63,
    "gz": 5,
    "type": "town",
    "name": "Obsidian Citadel",
    "biome": "volcano",
    "neighbors": [
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
      "monsterName": "Infernal Archdemoness Lilith",
      "monsterHp": 334,
      "monsterAtk": 39,
      "monsterDef": 27,
      "monsterMaxHp": 334
    },
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 124,
    "gx": 34,
    "gy": 63,
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
    "gx": 34,
    "gy": 68,
    "gz": 5,
    "type": "red",
    "name": "Dragon Horn Crest",
    "biome": "volcano",
    "neighbors": [
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
    "gx": 29,
    "gy": 68,
    "gz": 5,
    "type": "blue",
    "name": "Ignis Geyser",
    "biome": "volcano",
    "neighbors": [
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
    "gx": 25,
    "gy": 68,
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
    "gx": 20,
    "gy": 68,
    "gz": 5,
    "type": "boss",
    "name": "Dragon King Ignis Keep",
    "biome": "volcano",
    "neighbors": [
      127
    ],
    "realmId": "abyss",
    "realmName": "ปล่องภูเขาไฟมรณะเนเธอร์",
    "subRegionName": "ผาหินลาวาพิโรธ",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 129,
    "gx": 71,
    "gy": 27,
    "gz": 0,
    "type": "empty",
    "name": "Tidepool Causeway",
    "biome": "coral",
    "neighbors": [
      130
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 130,
    "gx": 76,
    "gy": 27,
    "gz": 0,
    "type": "blue",
    "name": "Pearl Shell Beach",
    "biome": "coral",
    "neighbors": [
      129,
      131
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 131,
    "gx": 81,
    "gy": 27,
    "gz": 0,
    "type": "fishing",
    "name": "Lagoon Angler Pier",
    "biome": "coral",
    "neighbors": [
      130,
      132
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 132,
    "gx": 85,
    "gy": 27,
    "gz": 0,
    "type": "town",
    "name": "Coral Bay Port",
    "biome": "coral",
    "neighbors": [
      131,
      133
    ],
    "townData": {
      "name": "Coral Bay Port",
      "level": 1,
      "baseValue": 620,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Corsair Siren Captain Morgana",
      "monsterHp": 187,
      "monsterAtk": 26,
      "monsterDef": 17,
      "monsterMaxHp": 187
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 133,
    "gx": 90,
    "gy": 27,
    "gz": 0,
    "type": "mystery_chest",
    "name": "กล่องสุ่มมหัศจรรย์อ่าวปะการัง",
    "biome": "coral",
    "neighbors": [
      132,
      134
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 134,
    "gx": 90,
    "gy": 31,
    "gz": 0,
    "type": "tavern",
    "name": "The Salty Siren Pub",
    "biome": "coral",
    "neighbors": [
      81,
      133,
      135
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 135,
    "gx": 85,
    "gy": 31,
    "gz": 0,
    "type": "shop_weapon",
    "name": "Cutlass Forge",
    "biome": "coral",
    "neighbors": [
      134,
      136
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 136,
    "gx": 81,
    "gy": 31,
    "gz": 0,
    "type": "blue",
    "name": "Lagoon Waters",
    "biome": "coral",
    "neighbors": [
      135,
      137
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 137,
    "gx": 76,
    "gy": 31,
    "gz": 0,
    "type": "church",
    "name": "Sea Nymph Shrine",
    "biome": "coral",
    "neighbors": [
      136,
      138,
      184
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 138,
    "gx": 71,
    "gy": 31,
    "gz": 0,
    "type": "town",
    "name": "Siren Rock Citadel",
    "biome": "coral",
    "neighbors": [
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
      "monsterName": "Abyssal Siren Empress Lorelei",
      "monsterHp": 192,
      "monsterAtk": 22,
      "monsterDef": 18,
      "monsterMaxHp": 192
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 139,
    "gx": 71,
    "gy": 36,
    "gz": 0,
    "type": "fishing",
    "name": "Deepsea Fishing Jetty",
    "biome": "coral",
    "neighbors": [
      138,
      140,
      145
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 140,
    "gx": 76,
    "gy": 36,
    "gz": 0,
    "type": "empty",
    "name": "Coral Walkway",
    "biome": "coral",
    "neighbors": [
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
    "gx": 81,
    "gy": 36,
    "gz": 0,
    "type": "shop_magic",
    "name": "Tide Arcana Hut",
    "biome": "coral",
    "neighbors": [
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
    "gx": 85,
    "gy": 36,
    "gz": 0,
    "type": "blue",
    "name": "Bioluminescent Pool",
    "biome": "coral",
    "neighbors": [
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
    "gx": 90,
    "gy": 36,
    "gz": 0,
    "type": "red",
    "name": "Kraken Whirlpool",
    "biome": "coral",
    "neighbors": [
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
    "gx": 90,
    "gy": 41,
    "gz": 0,
    "type": "town",
    "name": "Kraken Point Haven",
    "biome": "coral",
    "neighbors": [
      143
    ],
    "townData": {
      "name": "Kraken Point Haven",
      "level": 1,
      "baseValue": 700,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Abyssal Kraken Maiden Ursula",
      "monsterHp": 195,
      "monsterAtk": 27,
      "monsterDef": 17,
      "monsterMaxHp": 195
    },
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 145,
    "gx": 71,
    "gy": 41,
    "gz": 0,
    "type": "empty",
    "name": "Shoal Highway",
    "biome": "coral",
    "neighbors": [
      139
    ],
    "realmId": "sunfire",
    "realmName": "สุลต่านซันไฟร์แดนสุริยัน",
    "subRegionName": "อ่าวปะการังและรังโจรสลัด",
    "weather": "sunny",
    "isGrandBridge": true
  },
  {
    "id": 146,
    "gx": 2,
    "gy": 17,
    "gz": 0,
    "type": "empty",
    "name": "Void Fissure Entrance",
    "biome": "abyss",
    "neighbors": [
      147
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 147,
    "gx": 2,
    "gy": 22,
    "gz": 1,
    "type": "blue",
    "name": "Soul Crystal Well",
    "biome": "abyss",
    "neighbors": [
      146,
      148
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 148,
    "gx": 2,
    "gy": 27,
    "gz": 1,
    "type": "town",
    "name": "Nether Watch Citadel",
    "biome": "abyss",
    "neighbors": [
      147,
      149
    ],
    "townData": {
      "name": "Nether Watch Citadel",
      "level": 1,
      "baseValue": 800,
      "taxYield": 95,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Nether Valkyrie Morrigan",
      "monsterHp": 490,
      "monsterAtk": 52,
      "monsterDef": 40,
      "monsterMaxHp": 490
    },
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 149,
    "gx": 2,
    "gy": 31,
    "gz": 2,
    "type": "shop_item",
    "name": "Underworld Merchant",
    "biome": "abyss",
    "neighbors": [
      148,
      150
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 150,
    "gx": 2,
    "gy": 36,
    "gz": 2,
    "type": "dark_gate",
    "name": "Altar of Rico (Darkling Throne)",
    "biome": "abyss",
    "neighbors": [
      105,
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
    "gx": 2,
    "gy": 41,
    "gz": 1,
    "type": "red",
    "name": "Abyssal Trap",
    "biome": "abyss",
    "neighbors": [
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
    "gx": 2,
    "gy": 46,
    "gz": 1,
    "type": "church",
    "name": "Nether Shrine",
    "biome": "abyss",
    "neighbors": [
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
    "gx": 2,
    "gy": 51,
    "gz": 1,
    "type": "town",
    "name": "Void Gate Citadel",
    "biome": "abyss",
    "neighbors": [
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
      "monsterName": "Void Warden Priestess Nihilia",
      "monsterHp": 540,
      "monsterAtk": 56,
      "monsterDef": 38,
      "monsterMaxHp": 540
    },
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": false
  },
  {
    "id": 154,
    "gx": 2,
    "gy": 55,
    "gz": 0,
    "type": "vault",
    "name": "Rico Secret Vault",
    "biome": "abyss",
    "neighbors": [
      153
    ],
    "realmId": "abyss",
    "realmName": "ห้วงอเวจีแห่งริโก้",
    "subRegionName": "มิติอเวจีแห่งริโก้",
    "weather": "miasma",
    "isGrandBridge": true
  },
  {
    "id": 155,
    "gx": 54,
    "gy": 21,
    "gz": 0,
    "type": "blue",
    "name": "Fairy Blossom Path",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      7,
      36,
      156
    ]
  },
  {
    "id": 156,
    "gx": 50,
    "gy": 19,
    "gz": 0,
    "type": "town",
    "name": "Sylveria Blossom Town",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Sylveria Blossom Town",
      "level": 1,
      "baseValue": 600,
      "taxYield": 65,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Pixie Queen Titania",
      "monsterHp": 98,
      "monsterAtk": 15,
      "monsterDef": 10,
      "monsterMaxHp": 98
    },
    "neighbors": [
      155,
      157,
      163
    ]
  },
  {
    "id": 157,
    "gx": 46,
    "gy": 17,
    "gz": 0,
    "type": "shop_magic",
    "name": "Pixie Dust Emporium",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      156,
      158
    ]
  },
  {
    "id": 158,
    "gx": 42,
    "gy": 15,
    "gz": 0,
    "type": "red",
    "name": "Spore Thicket",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      157,
      159
    ]
  },
  {
    "id": 159,
    "gx": 38,
    "gy": 15,
    "gz": 0,
    "type": "tavern",
    "name": "Dewdrop Inn",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      158,
      160
    ]
  },
  {
    "id": 160,
    "gx": 38,
    "gy": 19,
    "gz": 0,
    "type": "town",
    "name": "Kitsune Shrine Hamlet",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Kitsune Shrine Hamlet",
      "level": 1,
      "baseValue": 650,
      "taxYield": 70,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Kitsune Maiden Tamamo",
      "monsterHp": 89,
      "monsterAtk": 16,
      "monsterDef": 8,
      "monsterMaxHp": 89
    },
    "neighbors": [
      159,
      161
    ]
  },
  {
    "id": 161,
    "gx": 42,
    "gy": 21,
    "gz": 0,
    "type": "church",
    "name": "Fairy Moon Shrine",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      160,
      162
    ]
  },
  {
    "id": 162,
    "gx": 46,
    "gy": 23,
    "gz": 0,
    "type": "mystery_chest",
    "name": "Treant Heart Glade",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      161,
      163
    ]
  },
  {
    "id": 163,
    "gx": 50,
    "gy": 23,
    "gz": 0,
    "type": "blue",
    "name": "Luminescent Meadow",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      156,
      162,
      164
    ]
  },
  {
    "id": 164,
    "gx": 50,
    "gy": 27,
    "gz": 0,
    "type": "isekai_event",
    "name": "Fairy Spring Portal",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      163,
      165
    ]
  },
  {
    "id": 165,
    "gx": 50,
    "gy": 31,
    "gz": 0,
    "type": "shop_item",
    "name": "Floral Herb Shop",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      164,
      166
    ]
  },
  {
    "id": 166,
    "gx": 54,
    "gy": 33,
    "gz": 0,
    "type": "blue",
    "name": "Petal Trail",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      165,
      167
    ]
  },
  {
    "id": 167,
    "gx": 54,
    "gy": 37,
    "gz": 0,
    "type": "vault",
    "name": "Titania Secret Vault",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      166,
      168,
      292
    ]
  },
  {
    "id": 168,
    "gx": 58,
    "gy": 35,
    "gz": 0,
    "type": "red",
    "name": "Bramble Crossing",
    "biome": "fairy_grove",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "ป่ามนตราภูตพราย",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      42,
      167,
      290
    ]
  },
  {
    "id": 169,
    "gx": 11,
    "gy": 30,
    "gz": 1,
    "type": "blue",
    "name": "Glittering Descent",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      106,
      170
    ]
  },
  {
    "id": 170,
    "gx": 11,
    "gy": 26,
    "gz": 1,
    "type": "town",
    "name": "Prism Grotto City",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "townData": {
      "name": "Prism Grotto City",
      "level": 1,
      "baseValue": 700,
      "taxYield": 80,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Crystal Golem Maiden Prismia",
      "monsterHp": 311,
      "monsterAtk": 36,
      "monsterDef": 25,
      "monsterMaxHp": 311
    },
    "neighbors": [
      169,
      171
    ]
  },
  {
    "id": 171,
    "gx": 7,
    "gy": 26,
    "gz": 1,
    "type": "shop_weapon",
    "name": "Crystal Edge Armory",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      170,
      172
    ]
  },
  {
    "id": 172,
    "gx": 7,
    "gy": 22,
    "gz": 1,
    "type": "red",
    "name": "Shard Hazard Pit",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      171,
      173
    ]
  },
  {
    "id": 173,
    "gx": 11,
    "gy": 22,
    "gz": 1,
    "type": "guild",
    "name": "Gem Miner Guild",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      172,
      174
    ]
  },
  {
    "id": 174,
    "gx": 15,
    "gy": 22,
    "gz": 1,
    "type": "town",
    "name": "Amethyst Web Bastion",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "townData": {
      "name": "Amethyst Web Bastion",
      "level": 1,
      "baseValue": 720,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Arachne Weaver Sylvi",
      "monsterHp": 324,
      "monsterAtk": 37,
      "monsterDef": 27,
      "monsterMaxHp": 324
    },
    "neighbors": [
      173,
      175
    ]
  },
  {
    "id": 175,
    "gx": 15,
    "gy": 26,
    "gz": 1,
    "type": "mystery_chest",
    "name": "Geode Crystal Chamber",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": true,
    "neighbors": [
      20,
      174,
      176
    ]
  },
  {
    "id": 176,
    "gx": 15,
    "gy": 30,
    "gz": 1,
    "type": "blue",
    "name": "Stalactite Promenade",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      175,
      177
    ]
  },
  {
    "id": 177,
    "gx": 19,
    "gy": 30,
    "gz": 1,
    "type": "tavern",
    "name": "Subterranean Tavern",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      176,
      178
    ]
  },
  {
    "id": 178,
    "gx": 19,
    "gy": 34,
    "gz": 1,
    "type": "shop_magic",
    "name": "Prismatic Spellshop",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      177,
      179
    ]
  },
  {
    "id": 179,
    "gx": 19,
    "gy": 38,
    "gz": 1,
    "type": "blue",
    "name": "Crystal Luster Way",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      178,
      180
    ]
  },
  {
    "id": 180,
    "gx": 15,
    "gy": 38,
    "gz": 1,
    "type": "vault",
    "name": "Diamond Vein Vault",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      179,
      181
    ]
  },
  {
    "id": 181,
    "gx": 15,
    "gy": 34,
    "gz": 1,
    "type": "red",
    "name": "Echoing Chasm",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      180
    ]
  },
  {
    "id": 182,
    "gx": 11,
    "gy": 38,
    "gz": 1,
    "type": "blue",
    "name": "Cavern Ascent",
    "biome": "crystal_cavern",
    "realmId": "frostpeak",
    "realmName": "มหาเทือกเขาหิมะเยือกแข็ง",
    "subRegionName": "ถ้ำผลึกแก้วประกายรุ้ง",
    "weather": "snow",
    "isGrandBridge": false,
    "neighbors": [
      106
    ]
  },
  {
    "id": 183,
    "gx": 72,
    "gy": 33,
    "gz": 3,
    "type": "blue",
    "name": "Stairway to the Heavens",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      40,
      184
    ]
  },
  {
    "id": 184,
    "gx": 76,
    "gy": 33,
    "gz": 3,
    "type": "blue",
    "name": "Celestial Cloudway",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      137,
      183,
      185
    ]
  },
  {
    "id": 185,
    "gx": 80,
    "gy": 33,
    "gz": 3,
    "type": "town",
    "name": "Seraphim Sanctuary",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Seraphim Sanctuary",
      "level": 1,
      "baseValue": 800,
      "taxYield": 95,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Celestial Archangel Seraphina",
      "monsterHp": 519,
      "monsterAtk": 54,
      "monsterDef": 35,
      "monsterMaxHp": 519
    },
    "neighbors": [
      184,
      186
    ]
  },
  {
    "id": 186,
    "gx": 84,
    "gy": 33,
    "gz": 3,
    "type": "shop_weapon",
    "name": "Holy Aegis Armory",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      185,
      187
    ]
  },
  {
    "id": 187,
    "gx": 88,
    "gy": 33,
    "gz": 3,
    "type": "church",
    "name": "Sacred Sun Cathedral",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      186,
      188
    ]
  },
  {
    "id": 188,
    "gx": 88,
    "gy": 29,
    "gz": 3,
    "type": "town",
    "name": "Sunspire Citadel",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Sunspire Citadel",
      "level": 1,
      "baseValue": 850,
      "taxYield": 100,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Sun Valkyrie Aurora",
      "monsterHp": 476,
      "monsterAtk": 52,
      "monsterDef": 35,
      "monsterMaxHp": 476
    },
    "neighbors": [
      187,
      189
    ]
  },
  {
    "id": 189,
    "gx": 84,
    "gy": 29,
    "gz": 3,
    "type": "shop_magic",
    "name": "Astral Miracle Sanctum",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      188,
      190
    ]
  },
  {
    "id": 190,
    "gx": 80,
    "gy": 29,
    "gz": 3,
    "type": "blue",
    "name": "Halo Plaza",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      189,
      191
    ]
  },
  {
    "id": 191,
    "gx": 80,
    "gy": 25,
    "gz": 3,
    "type": "isekai_event",
    "name": "Astral Warp Fountain",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      190,
      192
    ]
  },
  {
    "id": 192,
    "gx": 84,
    "gy": 25,
    "gz": 3,
    "type": "tavern",
    "name": "Ambrosia Tavern",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      191,
      193
    ]
  },
  {
    "id": 193,
    "gx": 88,
    "gy": 25,
    "gz": 3,
    "type": "red",
    "name": "Solar Flare Crest",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      192,
      194
    ]
  },
  {
    "id": 194,
    "gx": 88,
    "gy": 21,
    "gz": 3,
    "type": "vault",
    "name": "Seraphic Relic Vault",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      193,
      195
    ]
  },
  {
    "id": 195,
    "gx": 84,
    "gy": 21,
    "gz": 3,
    "type": "blue",
    "name": "Golden Dais Walkway",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      194,
      196
    ]
  },
  {
    "id": 196,
    "gx": 80,
    "gy": 21,
    "gz": 3,
    "type": "mystery_chest",
    "name": "Starlight Chest Shrine",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      195,
      197
    ]
  },
  {
    "id": 197,
    "gx": 76,
    "gy": 21,
    "gz": 3,
    "type": "blue",
    "name": "Zephyr Terrace",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      196,
      198
    ]
  },
  {
    "id": 198,
    "gx": 72,
    "gy": 21,
    "gz": 3,
    "type": "blue",
    "name": "Skybridge Descent",
    "biome": "celestial",
    "realmId": "celestial",
    "realmName": "วิหารลอยฟ้าเซเลสเชียล",
    "subRegionName": "สรวงสวรรค์ศักดิ์สิทธิ์",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      197
    ]
  },
  {
    "id": 199,
    "gx": 20,
    "gy": 16,
    "gz": 1,
    "type": "blue",
    "name": "Palace Grand Promenade",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      0,
      200
    ]
  },
  {
    "id": 200,
    "gx": 20,
    "gy": 12,
    "gz": 1,
    "type": "town",
    "name": "Royal Bastion Keep",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Royal Bastion Keep",
      "level": 1,
      "baseValue": 750,
      "taxYield": 90,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Royal Guard Paladin Leonora",
      "monsterHp": 85,
      "monsterAtk": 14,
      "monsterDef": 10,
      "monsterMaxHp": 85
    },
    "neighbors": [
      199,
      201
    ]
  },
  {
    "id": 201,
    "gx": 24,
    "gy": 12,
    "gz": 1,
    "type": "shop_weapon",
    "name": "Royal Armory Foundry",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      200,
      202
    ]
  },
  {
    "id": 202,
    "gx": 24,
    "gy": 16,
    "gz": 1,
    "type": "guild",
    "name": "Grand Knights Academy",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      201,
      203
    ]
  },
  {
    "id": 203,
    "gx": 28,
    "gy": 16,
    "gz": 1,
    "type": "town",
    "name": "High Sorcery Academy",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "High Sorcery Academy",
      "level": 1,
      "baseValue": 780,
      "taxYield": 92,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Sorceress Duchess Beatrice",
      "monsterHp": 107,
      "monsterAtk": 14,
      "monsterDef": 10,
      "monsterMaxHp": 107
    },
    "neighbors": [
      202,
      204
    ]
  },
  {
    "id": 204,
    "gx": 28,
    "gy": 20,
    "gz": 1,
    "type": "shop_magic",
    "name": "Royal Court Arcanum",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      203,
      205
    ]
  },
  {
    "id": 205,
    "gx": 24,
    "gy": 20,
    "gz": 1,
    "type": "vault",
    "name": "Crown Royal Treasury",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      204,
      206
    ]
  },
  {
    "id": 206,
    "gx": 24,
    "gy": 24,
    "gz": 1,
    "type": "tavern",
    "name": "King's Feast Hall",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      205,
      207
    ]
  },
  {
    "id": 207,
    "gx": 20,
    "gy": 24,
    "gz": 1,
    "type": "church",
    "name": "Imperial Royal Chapel",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      206,
      208
    ]
  },
  {
    "id": 208,
    "gx": 16,
    "gy": 24,
    "gz": 1,
    "type": "red",
    "name": "Royal Dungeons",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      207,
      209
    ]
  },
  {
    "id": 209,
    "gx": 16,
    "gy": 20,
    "gz": 1,
    "type": "blue",
    "name": "Courtyard Garden",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      208,
      210
    ]
  },
  {
    "id": 210,
    "gx": 16,
    "gy": 16,
    "gz": 1,
    "type": "mystery_chest",
    "name": "Royal Reliquary",
    "biome": "castle",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "พระราชวังหลวงและลานอัศวิน",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      21,
      209,
      211
    ]
  },
  {
    "id": 211,
    "gx": 20,
    "gy": 18,
    "gz": 1,
    "type": "empty",
    "name": "Gearwheel Gate",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      210,
      212
    ]
  },
  {
    "id": 212,
    "gx": 22,
    "gy": 16,
    "gz": 1,
    "type": "town",
    "name": "Brass Foundry Town",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Brass Foundry Town",
      "level": 2,
      "baseValue": 260,
      "taxYield": 65,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Steam Gear Gunner Victoria",
      "monsterHp": 85,
      "monsterAtk": 13,
      "monsterDef": 10,
      "monsterMaxHp": 85
    },
    "neighbors": [
      211,
      213
    ]
  },
  {
    "id": 213,
    "gx": 24,
    "gy": 18,
    "gz": 1,
    "type": "blue",
    "name": "Steam Boiler Lane",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      212,
      214
    ]
  },
  {
    "id": 214,
    "gx": 26,
    "gy": 16,
    "gz": 1,
    "type": "shop_weapon",
    "name": "Clockwork Emporium",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      213,
      215
    ]
  },
  {
    "id": 215,
    "gx": 26,
    "gy": 14,
    "gz": 1,
    "type": "empty",
    "name": "Piston Plaza",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      214,
      216
    ]
  },
  {
    "id": 216,
    "gx": 26,
    "gy": 12,
    "gz": 1,
    "type": "mystery_chest",
    "name": "Aether Dynamo Tower",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      215,
      217
    ]
  },
  {
    "id": 217,
    "gx": 28,
    "gy": 12,
    "gz": 1,
    "type": "red",
    "name": "Automaton Foundry",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      216,
      218
    ]
  },
  {
    "id": 218,
    "gx": 30,
    "gy": 12,
    "gz": 1,
    "type": "guild",
    "name": "Cogwheel Guildhall",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      217,
      219
    ]
  },
  {
    "id": 219,
    "gx": 32,
    "gy": 12,
    "gz": 1,
    "type": "tavern",
    "name": "Brass Boiler Tavern",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      218,
      220
    ]
  },
  {
    "id": 220,
    "gx": 34,
    "gy": 12,
    "gz": 2,
    "type": "town",
    "name": "Steamforge Borough",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Steamforge Borough",
      "level": 2,
      "baseValue": 300,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Clockwork Automaton Princess Alice",
      "monsterHp": 91,
      "monsterAtk": 14,
      "monsterDef": 8,
      "monsterMaxHp": 91
    },
    "neighbors": [
      219,
      221
    ]
  },
  {
    "id": 221,
    "gx": 34,
    "gy": 14,
    "gz": 2,
    "type": "blue",
    "name": "Pressure Valve Crossing",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      220,
      222
    ]
  },
  {
    "id": 222,
    "gx": 34,
    "gy": 16,
    "gz": 2,
    "type": "empty",
    "name": "Copper Pipe Viaduct",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      221,
      223
    ]
  },
  {
    "id": 223,
    "gx": 36,
    "gy": 16,
    "gz": 2,
    "type": "shop_item",
    "name": "Steam Engine Depot",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      62,
      222,
      224
    ]
  },
  {
    "id": 224,
    "gx": 36,
    "gy": 18,
    "gz": 2,
    "type": "vault",
    "name": "Grand Chronometer Spire",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      223,
      225
    ]
  },
  {
    "id": 225,
    "gx": 34,
    "gy": 18,
    "gz": 2,
    "type": "isekai_event",
    "name": "Automaton Laboratory",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      224,
      226
    ]
  },
  {
    "id": 226,
    "gx": 32,
    "gy": 18,
    "gz": 1,
    "type": "blue",
    "name": "Clockmaker's Square",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      225,
      227
    ]
  },
  {
    "id": 227,
    "gx": 30,
    "gy": 18,
    "gz": 1,
    "type": "red",
    "name": "Boilerworks Bastion",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      226,
      228
    ]
  },
  {
    "id": 228,
    "gx": 30,
    "gy": 20,
    "gz": 1,
    "type": "empty",
    "name": "Overclock Junction",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      227,
      229
    ]
  },
  {
    "id": 229,
    "gx": 30,
    "gy": 22,
    "gz": 1,
    "type": "empty",
    "name": "Skybridge to Sakura Shrine",
    "biome": "steampunk",
    "realmId": "solaria",
    "realmName": "มหาอาณาจักรโซลาเรีย",
    "subRegionName": "มหานครจักรกลไอน้ำและหอนาฬิกาพันปี",
    "weather": "sunny",
    "isGrandBridge": true,
    "neighbors": [
      228,
      230
    ]
  },
  {
    "id": 230,
    "gx": 32,
    "gy": 22,
    "gz": 1,
    "type": "empty",
    "name": "Vermilion Torii Gate",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      229,
      231
    ]
  },
  {
    "id": 231,
    "gx": 34,
    "gy": 22,
    "gz": 1,
    "type": "blue",
    "name": "Cherry Blossom Pathway",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      230,
      232
    ]
  },
  {
    "id": 232,
    "gx": 36,
    "gy": 22,
    "gz": 1,
    "type": "town",
    "name": "Kitsune Village",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Kitsune Village",
      "level": 2,
      "baseValue": 280,
      "taxYield": 70,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Sakura Blossom Tengu Ayame",
      "monsterHp": 215,
      "monsterAtk": 25,
      "monsterDef": 16,
      "monsterMaxHp": 215
    },
    "neighbors": [
      231,
      233
    ]
  },
  {
    "id": 233,
    "gx": 38,
    "gy": 22,
    "gz": 1,
    "type": "church",
    "name": "Petal Pool Shrine",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      232,
      234
    ]
  },
  {
    "id": 234,
    "gx": 40,
    "gy": 22,
    "gz": 2,
    "type": "mystery_chest",
    "name": "Spirit Bell Pavilion",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      233,
      235
    ]
  },
  {
    "id": 235,
    "gx": 40,
    "gy": 24,
    "gz": 2,
    "type": "empty",
    "name": "Sacred Fox Grove",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      234,
      236
    ]
  },
  {
    "id": 236,
    "gx": 40,
    "gy": 26,
    "gz": 2,
    "type": "tavern",
    "name": "Paper Lantern Tea House",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      235,
      237
    ]
  },
  {
    "id": 237,
    "gx": 38,
    "gy": 26,
    "gz": 2,
    "type": "blue",
    "name": "Moonlit Blossom Garden",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      236,
      238
    ]
  },
  {
    "id": 238,
    "gx": 36,
    "gy": 26,
    "gz": 2,
    "type": "shop_magic",
    "name": "Celestial Talisman Shop",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      237,
      239
    ]
  },
  {
    "id": 239,
    "gx": 34,
    "gy": 26,
    "gz": 2,
    "type": "red",
    "name": "Tengu Wind Peak",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      238,
      240
    ]
  },
  {
    "id": 240,
    "gx": 32,
    "gy": 26,
    "gz": 1,
    "type": "fishing",
    "name": "Spiritual Koi Lake",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      239,
      241
    ]
  },
  {
    "id": 241,
    "gx": 32,
    "gy": 28,
    "gz": 2,
    "type": "town",
    "name": "Nine-Tails Sanctum",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Nine-Tails Sanctum",
      "level": 3,
      "baseValue": 350,
      "taxYield": 95,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Kitsune Shrine Maiden Chiyo",
      "monsterHp": 192,
      "monsterAtk": 24,
      "monsterDef": 17,
      "monsterMaxHp": 192
    },
    "neighbors": [
      240,
      242
    ]
  },
  {
    "id": 242,
    "gx": 34,
    "gy": 28,
    "gz": 2,
    "type": "isekai_event",
    "name": "Omikuji Fortune Dais",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      241,
      243
    ]
  },
  {
    "id": 243,
    "gx": 36,
    "gy": 28,
    "gz": 2,
    "type": "empty",
    "name": "Ancestral Torii Stairway",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      242,
      244
    ]
  },
  {
    "id": 244,
    "gx": 38,
    "gy": 28,
    "gz": 2,
    "type": "blue",
    "name": "Falling Petals Bridge",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      243,
      245
    ]
  },
  {
    "id": 245,
    "gx": 40,
    "gy": 28,
    "gz": 2,
    "type": "empty",
    "name": "Cherry Blossom Hot Spring",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      244,
      246
    ]
  },
  {
    "id": 246,
    "gx": 42,
    "gy": 28,
    "gz": 3,
    "type": "vault",
    "name": "Kagura Dance Stage",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      245,
      247
    ]
  },
  {
    "id": 247,
    "gx": 42,
    "gy": 26,
    "gz": 3,
    "type": "blue",
    "name": "Astral Sakura Crest",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      246,
      248
    ]
  },
  {
    "id": 248,
    "gx": 42,
    "gy": 24,
    "gz": 3,
    "type": "mystery_chest",
    "name": "Spiritual Horizon",
    "biome": "sakura_shrine",
    "realmId": "celestial",
    "realmName": "อาณาจักรดวงดาราและสรวงสวรรค์",
    "subRegionName": "ศาลเจ้าจิ้งจอกซากุระพันปี",
    "weather": "sunny",
    "isGrandBridge": false,
    "neighbors": [
      247
    ]
  },
  {
    "id": 249,
    "gx": 44,
    "gy": 30,
    "gz": 2,
    "type": "blue",
    "name": "Emerald Cascade Entrance",
    "biome": "waterfall_forest",
    "neighbors": [
      250
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 250,
    "gx": 44,
    "gy": 32,
    "gz": 2,
    "type": "empty",
    "name": "Turquoise River Shallows",
    "biome": "waterfall_forest",
    "neighbors": [
      249,
      251
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 251,
    "gx": 44,
    "gy": 34,
    "gz": 2,
    "type": "fishing",
    "name": "Cascade Salmon Pool",
    "biome": "waterfall_forest",
    "neighbors": [
      250,
      252
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 252,
    "gx": 44,
    "gy": 36,
    "gz": 2,
    "type": "town",
    "name": "Cascade Mist Town",
    "biome": "waterfall_forest",
    "neighbors": [
      251,
      253
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Cascade Mist Town",
      "level": 1,
      "baseValue": 500,
      "taxYield": 60,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Catgirl Huntress Mia",
      "monsterHp": 95,
      "monsterAtk": 15,
      "monsterDef": 10,
      "monsterMaxHp": 95
    }
  },
  {
    "id": 253,
    "gx": 44,
    "gy": 38,
    "gz": 2,
    "type": "shop_item",
    "name": "Mossy Basalt Bazaar",
    "biome": "waterfall_forest",
    "neighbors": [
      252,
      254,
      295
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 254,
    "gx": 44,
    "gy": 40,
    "gz": 2,
    "type": "red",
    "name": "Slippery Waterfall Bluff",
    "biome": "waterfall_forest",
    "neighbors": [
      253,
      255
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 255,
    "gx": 44,
    "gy": 42,
    "gz": 2,
    "type": "church",
    "name": "Archon Water Sanctuary",
    "biome": "waterfall_forest",
    "neighbors": [
      254,
      256
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 256,
    "gx": 44,
    "gy": 44,
    "gz": 2,
    "type": "blue",
    "name": "Glistening Spring Rapids",
    "biome": "waterfall_forest",
    "neighbors": [
      255,
      257
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 257,
    "gx": 44,
    "gy": 46,
    "gz": 2,
    "type": "empty",
    "name": "Basalt Riverbed",
    "biome": "waterfall_forest",
    "neighbors": [
      256,
      258
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 258,
    "gx": 44,
    "gy": 48,
    "gz": 2,
    "type": "town",
    "name": "High Elf Riverport",
    "biome": "waterfall_forest",
    "neighbors": [
      257,
      259
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "High Elf Riverport",
      "level": 1,
      "baseValue": 550,
      "taxYield": 65,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Dryad Maiden Alura",
      "monsterHp": 102,
      "monsterAtk": 13,
      "monsterDef": 9,
      "monsterMaxHp": 102
    }
  },
  {
    "id": 259,
    "gx": 44,
    "gy": 50,
    "gz": 2,
    "type": "tavern",
    "name": "Roaring Rapids Inn",
    "biome": "waterfall_forest",
    "neighbors": [
      258,
      260
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 260,
    "gx": 44,
    "gy": 52,
    "gz": 2,
    "type": "mystery_chest",
    "name": "Sunken Cascade Chest",
    "biome": "waterfall_forest",
    "neighbors": [
      259,
      261
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 261,
    "gx": 44,
    "gy": 54,
    "gz": 2,
    "type": "blue",
    "name": "Rainbow Mist Drop",
    "biome": "waterfall_forest",
    "neighbors": [
      260,
      262
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 262,
    "gx": 44,
    "gy": 56,
    "gz": 2,
    "type": "home",
    "name": "Emerald Riverfront Villa",
    "biome": "waterfall_forest",
    "neighbors": [
      261,
      263
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false,
    "homeData": {
      "ownerId": 0,
      "ownerName": "ว่างเปล่า (ที่ดินสำหรับสร้างบ้าน)",
      "level": 0
    }
  },
  {
    "id": 263,
    "gx": 44,
    "gy": 58,
    "gz": 2,
    "type": "shop_weapon",
    "name": "Cascade Armory Forge",
    "biome": "waterfall_forest",
    "neighbors": [
      262,
      264
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 264,
    "gx": 44,
    "gy": 60,
    "gz": 2,
    "type": "red",
    "name": "Vortex Whirlpool Abyss",
    "biome": "waterfall_forest",
    "neighbors": [
      263,
      265
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 265,
    "gx": 46,
    "gy": 60,
    "gz": 2,
    "type": "blue",
    "name": "Turquoise Lake Coast",
    "biome": "waterfall_forest",
    "neighbors": [
      264,
      266
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 266,
    "gx": 48,
    "gy": 60,
    "gz": 2,
    "type": "fishing",
    "name": "Great Basin Fishing Docks",
    "biome": "waterfall_forest",
    "neighbors": [
      265,
      267
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 267,
    "gx": 50,
    "gy": 60,
    "gz": 2,
    "type": "town",
    "name": "Mermaid Basin Haven",
    "biome": "waterfall_forest",
    "neighbors": [
      266,
      268
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false,
    "townData": {
      "name": "Mermaid Basin Haven",
      "level": 1,
      "baseValue": 600,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Mermaid Siren Nerida",
      "monsterHp": 112,
      "monsterAtk": 15,
      "monsterDef": 10,
      "monsterMaxHp": 112
    }
  },
  {
    "id": 268,
    "gx": 52,
    "gy": 60,
    "gz": 2,
    "type": "vault",
    "name": "Sunken Pearl Vault",
    "biome": "waterfall_forest",
    "neighbors": [
      267,
      269
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 269,
    "gx": 54,
    "gy": 60,
    "gz": 2,
    "type": "empty",
    "name": "Mossy Pebble Trail",
    "biome": "waterfall_forest",
    "neighbors": [
      268,
      270
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 270,
    "gx": 56,
    "gy": 60,
    "gz": 2,
    "type": "blue",
    "name": "Crystal Cascade Falls",
    "biome": "waterfall_forest",
    "neighbors": [
      269,
      271
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 271,
    "gx": 58,
    "gy": 60,
    "gz": 3,
    "type": "church",
    "name": "Water Nymph Shrine",
    "biome": "waterfall_forest",
    "neighbors": [
      270,
      272
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 272,
    "gx": 60,
    "gy": 60,
    "gz": 3,
    "type": "shop_magic",
    "name": "Arcane Stream Arcanum",
    "biome": "waterfall_forest",
    "neighbors": [
      271,
      273
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 273,
    "gx": 62,
    "gy": 60,
    "gz": 3,
    "type": "red",
    "name": "Rushing Rapids Hazard",
    "biome": "waterfall_forest",
    "neighbors": [
      272,
      274
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 274,
    "gx": 64,
    "gy": 60,
    "gz": 3,
    "type": "town",
    "name": "Sylphira Forest Borough",
    "biome": "waterfall_forest",
    "neighbors": [
      273,
      275
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Sylphira Forest Borough",
      "level": 1,
      "baseValue": 620,
      "taxYield": 80,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Elf Princess Sylphira",
      "monsterHp": 105,
      "monsterAtk": 16,
      "monsterDef": 10,
      "monsterMaxHp": 105
    }
  },
  {
    "id": 275,
    "gx": 66,
    "gy": 60,
    "gz": 3,
    "type": "blue",
    "name": "Emerald Glade Point",
    "biome": "waterfall_forest",
    "neighbors": [
      274,
      276
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 276,
    "gx": 66,
    "gy": 58,
    "gz": 3,
    "type": "empty",
    "name": "Lush Pine Canopy",
    "biome": "waterfall_forest",
    "neighbors": [
      275,
      277
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 277,
    "gx": 66,
    "gy": 56,
    "gz": 3,
    "type": "fishing",
    "name": "Alpine Stream Bend",
    "biome": "waterfall_forest",
    "neighbors": [
      276,
      278
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 278,
    "gx": 66,
    "gy": 54,
    "gz": 3,
    "type": "tavern",
    "name": "High Falls Rest House",
    "biome": "waterfall_forest",
    "neighbors": [
      277,
      279
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 279,
    "gx": 66,
    "gy": 52,
    "gz": 3,
    "type": "boss",
    "name": "Water Archon Lair",
    "biome": "waterfall_forest",
    "neighbors": [
      278,
      280
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 280,
    "gx": 66,
    "gy": 50,
    "gz": 3,
    "type": "blue",
    "name": "Divine Mist Plateau",
    "biome": "waterfall_forest",
    "neighbors": [
      279,
      281
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 281,
    "gx": 66,
    "gy": 48,
    "gz": 3,
    "type": "mystery_chest",
    "name": "Ancient Archon Reliquary",
    "biome": "waterfall_forest",
    "neighbors": [
      280,
      282
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 282,
    "gx": 66,
    "gy": 46,
    "gz": 2,
    "type": "town",
    "name": "Cascadia River Citadel",
    "biome": "waterfall_forest",
    "neighbors": [
      281,
      283
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Cascadia River Citadel",
      "level": 1,
      "baseValue": 680,
      "taxYield": 85,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Naiad Sovereign Ondine",
      "monsterHp": 99,
      "monsterAtk": 15,
      "monsterDef": 8,
      "monsterMaxHp": 99
    }
  },
  {
    "id": 283,
    "gx": 66,
    "gy": 44,
    "gz": 2,
    "type": "red",
    "name": "Flooded Timber Chasm",
    "biome": "waterfall_forest",
    "neighbors": [
      282,
      284
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 284,
    "gx": 66,
    "gy": 42,
    "gz": 2,
    "type": "shop_item",
    "name": "Stream Guild Emporium",
    "biome": "waterfall_forest",
    "neighbors": [
      283,
      285
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 285,
    "gx": 66,
    "gy": 40,
    "gz": 2,
    "type": "blue",
    "name": "Springhead Oasis",
    "biome": "waterfall_forest",
    "neighbors": [
      284,
      286
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 286,
    "gx": 66,
    "gy": 38,
    "gz": 2,
    "type": "empty",
    "name": "Basalt Stepping Stones",
    "biome": "waterfall_forest",
    "neighbors": [
      285,
      287
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 287,
    "gx": 64,
    "gy": 38,
    "gz": 2,
    "type": "guild",
    "name": "Cascade Adventurers Guild",
    "biome": "waterfall_forest",
    "neighbors": [
      286,
      288
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 288,
    "gx": 62,
    "gy": 38,
    "gz": 2,
    "type": "blue",
    "name": "Emerald Dew Trail",
    "biome": "waterfall_forest",
    "neighbors": [
      287,
      289
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 289,
    "gx": 60,
    "gy": 38,
    "gz": 2,
    "type": "town",
    "name": "Verdant River Town",
    "biome": "waterfall_forest",
    "neighbors": [
      288,
      290
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false,
    "townData": {
      "name": "Verdant River Town",
      "level": 1,
      "baseValue": 580,
      "taxYield": 70,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Panther Huntress Kaelia",
      "monsterHp": 113,
      "monsterAtk": 15,
      "monsterDef": 10,
      "monsterMaxHp": 113
    }
  },
  {
    "id": 290,
    "gx": 58,
    "gy": 38,
    "gz": 2,
    "type": "fishing",
    "name": "Crystal Current Shallows",
    "biome": "waterfall_forest",
    "neighbors": [
      168,
      289,
      291
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 291,
    "gx": 56,
    "gy": 38,
    "gz": 2,
    "type": "home",
    "name": "Waterfall View Estate",
    "biome": "waterfall_forest",
    "neighbors": [
      290,
      292
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false,
    "homeData": {
      "ownerId": 0,
      "ownerName": "ว่างเปล่า (ที่ดินสำหรับสร้างบ้าน)",
      "level": 0
    }
  },
  {
    "id": 292,
    "gx": 54,
    "gy": 38,
    "gz": 2,
    "type": "mystery_chest",
    "name": "Sylvan Treasure Cache",
    "biome": "waterfall_forest",
    "neighbors": [
      167,
      291,
      293
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 293,
    "gx": 52,
    "gy": 38,
    "gz": 2,
    "type": "blue",
    "name": "Dewdrop Passage",
    "biome": "waterfall_forest",
    "neighbors": [
      292,
      294
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 294,
    "gx": 50,
    "gy": 38,
    "gz": 2,
    "type": "church",
    "name": "River Chapel of Grace",
    "biome": "waterfall_forest",
    "neighbors": [
      293,
      295
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 295,
    "gx": 48,
    "gy": 38,
    "gz": 2,
    "type": "red",
    "name": "Mossy Cliff Crags",
    "biome": "waterfall_forest",
    "neighbors": [
      253,
      294,
      296
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 296,
    "gx": 46,
    "gy": 38,
    "gz": 2,
    "type": "tavern",
    "name": "Emerald Basin Lodge",
    "biome": "waterfall_forest",
    "neighbors": [
      295,
      297
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 297,
    "gx": 48,
    "gy": 42,
    "gz": 2,
    "type": "empty",
    "name": "Central Stream Islet",
    "biome": "waterfall_forest",
    "neighbors": [
      296,
      298
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 298,
    "gx": 50,
    "gy": 42,
    "gz": 2,
    "type": "fishing",
    "name": "Deep Pool Shallows",
    "biome": "waterfall_forest",
    "neighbors": [
      297,
      299
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 299,
    "gx": 52,
    "gy": 42,
    "gz": 2,
    "type": "town",
    "name": "Lotus Blossom Village",
    "biome": "waterfall_forest",
    "neighbors": [
      298,
      300
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false,
    "townData": {
      "name": "Lotus Blossom Village",
      "level": 1,
      "baseValue": 560,
      "taxYield": 68,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "Lotus Maiden Nelumbo",
      "monsterHp": 89,
      "monsterAtk": 13,
      "monsterDef": 8,
      "monsterMaxHp": 89
    }
  },
  {
    "id": 300,
    "gx": 54,
    "gy": 42,
    "gz": 2,
    "type": "blue",
    "name": "Water Lily Lagoon",
    "biome": "waterfall_forest",
    "neighbors": [
      299,
      301
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 301,
    "gx": 56,
    "gy": 42,
    "gz": 2,
    "type": "shop_weapon",
    "name": "Lotus Smithy",
    "biome": "waterfall_forest",
    "neighbors": [
      300,
      302
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 302,
    "gx": 58,
    "gy": 42,
    "gz": 2,
    "type": "mystery_chest",
    "name": "Submerged Lockbox",
    "biome": "waterfall_forest",
    "neighbors": [
      301,
      303
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 303,
    "gx": 60,
    "gy": 42,
    "gz": 2,
    "type": "blue",
    "name": "Sparkling Brook",
    "biome": "waterfall_forest",
    "neighbors": [
      302,
      304
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 304,
    "gx": 62,
    "gy": 42,
    "gz": 2,
    "type": "town",
    "name": "Emerald Bridge Town",
    "biome": "waterfall_forest",
    "neighbors": [
      303,
      305
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false,
    "townData": {
      "name": "Emerald Bridge Town",
      "level": 1,
      "baseValue": 600,
      "taxYield": 75,
      "ownerId": null,
      "isOccupiedByMonster": true,
      "monsterName": "River Nymph Sabrina",
      "monsterHp": 109,
      "monsterAtk": 13,
      "monsterDef": 9,
      "monsterMaxHp": 109
    }
  },
  {
    "id": 305,
    "gx": 62,
    "gy": 46,
    "gz": 2,
    "type": "fishing",
    "name": "Cascade Brook Docks",
    "biome": "waterfall_forest",
    "neighbors": [
      304,
      306
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 306,
    "gx": 60,
    "gy": 46,
    "gz": 2,
    "type": "blue",
    "name": "Turquoise Ripples",
    "biome": "waterfall_forest",
    "neighbors": [
      305,
      307
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 307,
    "gx": 58,
    "gy": 46,
    "gz": 2,
    "type": "tavern",
    "name": "River Bend Cantina",
    "biome": "waterfall_forest",
    "neighbors": [
      306,
      308
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  },
  {
    "id": 308,
    "gx": 56,
    "gy": 46,
    "gz": 2,
    "type": "church",
    "name": "Sanctuary of Rapids",
    "biome": "waterfall_forest",
    "neighbors": [
      307,
      309
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 309,
    "gx": 54,
    "gy": 46,
    "gz": 2,
    "type": "home",
    "name": "Lotus Haven Manor",
    "biome": "waterfall_forest",
    "neighbors": [
      308,
      310
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false,
    "homeData": {
      "ownerId": 0,
      "ownerName": "ว่างเปล่า (ที่ดินสำหรับสร้างบ้าน)",
      "level": 0
    }
  },
  {
    "id": 310,
    "gx": 52,
    "gy": 46,
    "gz": 2,
    "type": "blue",
    "name": "Emerald Heart Crossing",
    "biome": "waterfall_forest",
    "neighbors": [
      309,
      311
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "sunny",
    "isGrandBridge": false
  },
  {
    "id": 311,
    "gx": 50,
    "gy": 46,
    "gz": 2,
    "type": "empty",
    "name": "Clearwater Shallows",
    "biome": "waterfall_forest",
    "neighbors": [
      310
    ],
    "realmId": "emerald",
    "realmName": "มหาป่าน้ำตกมรกตพันปี",
    "subRegionName": "หุบเขาลำธารมรกตและม่านน้ำตกสวรรค์",
    "weather": "rain",
    "isGrandBridge": false
  }
];
