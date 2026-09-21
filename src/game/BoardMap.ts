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
  | 'boss';

export type BiomeType = 'grass' | 'forest' | 'snow' | 'desert' | 'volcano' | 'cavern' | 'coral' | 'abyss';

export interface TownData {
  name: string;
  level: number; // 1 to 5 (Hamlet, Village, Town, Citadel, Metropolis)
  baseValue: number;
  taxYield: number;
  ownerId: number | null;
  isOccupiedByMonster: boolean;
  monsterName: string;
  monsterHp: number;
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
}

// =========================================================================================
// MASSIVE DOKAPON CONTINENT: 155 INTERCONNECTED NODES ACROSS 8 GEOGRAPHICAL PROVINCES
// =========================================================================================
export const DOKAPON_NODES: BoardNode[] = [
  // ===================== PROVINCE 1: ROYAL CROWN PLAINS (Nodes 0-21, Elev: 0-1) =====================
  {
    id: 0,
    gx: 4,
    gy: 4,
    gz: 0,
    type: 'town',
    name: 'Oakshire Capital',
    biome: 'grass',
    neighbors: [1, 21, 146],
    townData: {
      name: 'Oakshire Capital',
      level: 1,
      baseValue: 450,
      taxYield: 50,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Royal Slime King',
      monsterHp: 60,
      monsterAtk: 11,
      monsterDef: 5
    }
  },
  { id: 1, gx: 6, gy: 4, gz: 0, type: 'blue', name: 'Riverway Spring', biome: 'grass', neighbors: [0, 2] },
  { id: 2, gx: 8, gy: 4, gz: 0, type: 'shop_item', name: 'Crown Bazaar', biome: 'grass', neighbors: [1, 3] },
  { id: 3, gx: 10, gy: 4, gz: 1, type: 'empty', name: 'Windmill Meadow', biome: 'grass', neighbors: [2, 4] },
  {
    id: 4,
    gx: 12,
    gy: 4,
    gz: 1,
    type: 'town',
    name: 'Lakeview Keep',
    biome: 'grass',
    neighbors: [3, 5, 22],
    townData: {
      name: 'Lakeview Keep',
      level: 1,
      baseValue: 480,
      taxYield: 55,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Lake Goblin Chief',
      monsterHp: 65,
      monsterAtk: 12,
      monsterDef: 6
    }
  },
  { id: 5, gx: 14, gy: 4, gz: 1, type: 'church', name: 'St. Claire Cathedral', biome: 'grass', neighbors: [4, 6] },
  { id: 6, gx: 16, gy: 4, gz: 1, type: 'red', name: 'Highway Ambush', biome: 'grass', neighbors: [5, 7] },
  { id: 7, gx: 18, gy: 4, gz: 1, type: 'blue', name: 'Sunlit Clearing', biome: 'grass', neighbors: [6, 8] },
  { id: 8, gx: 18, gy: 6, gz: 1, type: 'empty', name: 'Estuary Bridge', biome: 'grass', neighbors: [7, 9] },
  { id: 9, gx: 16, gy: 6, gz: 1, type: 'shop_weapon', name: 'Plains Armory', biome: 'grass', neighbors: [8, 10] },
  {
    id: 10,
    gx: 14,
    gy: 6,
    gz: 1,
    type: 'town',
    name: 'Riverdale Borough',
    biome: 'grass',
    neighbors: [9, 11],
    townData: {
      name: 'Riverdale Borough',
      level: 1,
      baseValue: 500,
      taxYield: 60,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'River Harpy',
      monsterHp: 70,
      monsterAtk: 13,
      monsterDef: 7
    }
  },
  { id: 11, gx: 12, gy: 6, gz: 1, type: 'blue', name: 'Clover Field', biome: 'grass', neighbors: [10, 12] },
  { id: 12, gx: 10, gy: 6, gz: 1, type: 'empty', name: 'Royal Crossroad', biome: 'grass', neighbors: [11, 13, 86] },
  { id: 13, gx: 8, gy: 6, gz: 0, type: 'vault', name: 'Crown Treasury Vault', biome: 'grass', neighbors: [12, 14] },
  { id: 14, gx: 6, gy: 6, gz: 0, type: 'shop_magic', name: 'Plains Mystic Tent', biome: 'grass', neighbors: [13, 15] },
  { id: 15, gx: 4, gy: 6, gz: 0, type: 'red', name: 'Briar Trench', biome: 'grass', neighbors: [14, 16] },
  {
    id: 16,
    gx: 4,
    gy: 8,
    gz: 0,
    type: 'town',
    name: "King's Crossing",
    biome: 'grass',
    neighbors: [15, 17, 129],
    townData: {
      name: "King's Crossing",
      level: 1,
      baseValue: 520,
      taxYield: 65,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Highway Marauder',
      monsterHp: 75,
      monsterAtk: 14,
      monsterDef: 7
    }
  },
  { id: 17, gx: 6, gy: 8, gz: 0, type: 'empty', name: 'Greenway Trail', biome: 'grass', neighbors: [16, 18] },
  { id: 18, gx: 8, gy: 8, gz: 0, type: 'church', name: 'Village Chapel', biome: 'grass', neighbors: [17, 19] },
  { id: 19, gx: 10, gy: 8, gz: 0, type: 'blue', name: 'Orchard Spring', biome: 'grass', neighbors: [18, 20] },
  { id: 20, gx: 6, gy: 5, gz: 0, type: 'empty', name: 'Pasture Hill', biome: 'grass', neighbors: [19, 21] },
  { id: 21, gx: 4, gy: 5, gz: 0, type: 'empty', name: 'Capital Southgate', biome: 'grass', neighbors: [20, 0] },

  // ===================== PROVINCE 2: WHISPERING EMERALD CANOPY (Nodes 22-42, Elev: 1-2) =====================
  { id: 22, gx: 14, gy: 2, gz: 1, type: 'empty', name: 'Canopy Entrance', biome: 'forest', neighbors: [4, 23] },
  { id: 23, gx: 16, gy: 2, gz: 1, type: 'shop_item', name: 'Forest Provisioner', biome: 'forest', neighbors: [22, 24] },
  { id: 24, gx: 18, gy: 2, gz: 1, type: 'blue', name: 'Fairy Glen', biome: 'forest', neighbors: [23, 25] },
  {
    id: 25,
    gx: 20,
    gy: 2,
    gz: 2,
    type: 'town',
    name: 'Sylva Village',
    biome: 'forest',
    neighbors: [24, 26, 65],
    townData: {
      name: 'Sylva Village',
      level: 1,
      baseValue: 550,
      taxYield: 70,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Briar Kobold Shaman',
      monsterHp: 80,
      monsterAtk: 15,
      monsterDef: 8
    }
  },
  { id: 26, gx: 22, gy: 2, gz: 2, type: 'red', name: 'Witch Mire', biome: 'forest', neighbors: [25, 27] },
  { id: 27, gx: 22, gy: 4, gz: 2, type: 'empty', name: 'Mossy Incline', biome: 'forest', neighbors: [26, 28] },
  { id: 28, gx: 20, gy: 4, gz: 2, type: 'shop_magic', name: 'Arcane Treehouse', biome: 'forest', neighbors: [27, 29] },
  { id: 29, gx: 18, gy: 4, gz: 2, type: 'church', name: 'Druidic Monolith', biome: 'forest', neighbors: [28, 30] },
  {
    id: 30,
    gx: 20,
    gy: 6,
    gz: 2,
    type: 'town',
    name: 'Deepwood Haven',
    biome: 'forest',
    neighbors: [29, 31],
    townData: {
      name: 'Deepwood Haven',
      level: 1,
      baseValue: 580,
      taxYield: 72,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Shadow Panther',
      monsterHp: 85,
      monsterAtk: 16,
      monsterDef: 8
    }
  },
  { id: 31, gx: 22, gy: 6, gz: 2, type: 'blue', name: 'Glowing Flora', biome: 'forest', neighbors: [30, 32] },
  { id: 32, gx: 24, gy: 6, gz: 2, type: 'empty', name: 'Canopy Walkway', biome: 'forest', neighbors: [31, 33] },
  { id: 33, gx: 24, gy: 8, gz: 2, type: 'vault', name: 'Elven Spire Vault', biome: 'forest', neighbors: [32, 34] },
  { id: 34, gx: 22, gy: 8, gz: 2, type: 'shop_weapon', name: 'Woodsman Bowyer', biome: 'forest', neighbors: [33, 35] },
  { id: 35, gx: 20, gy: 8, gz: 2, type: 'empty', name: 'Bramble Path', biome: 'forest', neighbors: [34, 36] },
  {
    id: 36,
    gx: 18,
    gy: 8,
    gz: 2,
    type: 'town',
    name: 'Willowbrook Outpost',
    biome: 'forest',
    neighbors: [35, 37],
    townData: {
      name: 'Willowbrook Outpost',
      level: 1,
      baseValue: 600,
      taxYield: 75,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Great Ent Guardian',
      monsterHp: 95,
      monsterAtk: 17,
      monsterDef: 11
    }
  },
  { id: 37, gx: 18, gy: 10, gz: 2, type: 'red', name: 'Poison Spore Bog', biome: 'forest', neighbors: [36, 38] },
  { id: 38, gx: 20, gy: 10, gz: 2, type: 'blue', name: 'Sacred Pool', biome: 'forest', neighbors: [37, 39] },
  { id: 39, gx: 22, gy: 10, gz: 2, type: 'empty', name: 'Ancient Hollow', biome: 'forest', neighbors: [38, 40] },
  { id: 40, gx: 22, gy: 12, gz: 2, type: 'church', name: 'Moon Temple', biome: 'forest', neighbors: [39, 41] },
  {
    id: 41,
    gx: 20,
    gy: 12,
    gz: 2,
    type: 'town',
    name: 'Elderwood Spire',
    biome: 'forest',
    neighbors: [40, 42, 43],
    townData: {
      name: 'Elderwood Spire',
      level: 1,
      baseValue: 620,
      taxYield: 78,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Ancient Chimera',
      monsterHp: 100,
      monsterAtk: 18,
      monsterDef: 10
    }
  },
  { id: 42, gx: 18, gy: 12, gz: 2, type: 'vault', name: 'Mystic Sylvan Cache', biome: 'forest', neighbors: [41, 22] },

  // ===================== PROVINCE 3: FROSTVEIL GLACIERS & PEAKS (Nodes 43-64, Elev: 2-5) =====================
  { id: 43, gx: 20, gy: 14, gz: 3, type: 'empty', name: 'Frostfall Incline', biome: 'snow', neighbors: [41, 44] },
  { id: 44, gx: 22, gy: 14, gz: 3, type: 'blue', name: 'Glacial Springs', biome: 'snow', neighbors: [43, 45] },
  { id: 45, gx: 24, gy: 14, gz: 3, type: 'shop_item', name: 'Alpine Outpost', biome: 'snow', neighbors: [44, 46] },
  { id: 46, gx: 26, gy: 14, gz: 4, type: 'red', name: 'Blizzard Ridge', biome: 'snow', neighbors: [45, 47] },
  {
    id: 47,
    gx: 28,
    gy: 14,
    gz: 4,
    type: 'town',
    name: 'Glacier Citadel',
    biome: 'snow',
    neighbors: [46, 48],
    townData: {
      name: 'Glacier Citadel',
      level: 1,
      baseValue: 650,
      taxYield: 80,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Frost Wyrm',
      monsterHp: 110,
      monsterAtk: 19,
      monsterDef: 12
    }
  },
  { id: 48, gx: 28, gy: 16, gz: 4, type: 'church', name: 'Hermit Peak Altar', biome: 'snow', neighbors: [47, 49] },
  { id: 49, gx: 26, gy: 16, gz: 4, type: 'vault', name: 'Icebound Chest', biome: 'snow', neighbors: [48, 50] },
  { id: 50, gx: 24, gy: 16, gz: 4, type: 'empty', name: 'High Crag', biome: 'snow', neighbors: [49, 51] },
  { id: 51, gx: 22, gy: 16, gz: 4, type: 'shop_weapon', name: 'Nordic Smithy', biome: 'snow', neighbors: [50, 52] },
  {
    id: 52,
    gx: 20,
    gy: 16,
    gz: 5,
    type: 'town',
    name: 'Highpeak Sanctuary',
    biome: 'snow',
    neighbors: [51, 53],
    townData: {
      name: 'Highpeak Sanctuary',
      level: 1,
      baseValue: 700,
      taxYield: 85,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Yeti Chieftain',
      monsterHp: 120,
      monsterAtk: 20,
      monsterDef: 14
    }
  },
  { id: 53, gx: 18, gy: 16, gz: 5, type: 'blue', name: 'Aurora Pool', biome: 'snow', neighbors: [52, 54] },
  { id: 54, gx: 16, gy: 16, gz: 4, type: 'empty', name: 'Avalanche Pass', biome: 'snow', neighbors: [53, 55] },
  { id: 55, gx: 16, gy: 18, gz: 4, type: 'red', name: 'Frozen Chasm', biome: 'snow', neighbors: [54, 56] },
  { id: 56, gx: 18, gy: 18, gz: 4, type: 'shop_magic', name: 'Frost Rune Hut', biome: 'snow', neighbors: [55, 57] },
  { id: 57, gx: 20, gy: 18, gz: 4, type: 'empty', name: 'Snowy Steps', biome: 'snow', neighbors: [56, 58] },
  {
    id: 58,
    gx: 22,
    gy: 18,
    gz: 4,
    type: 'town',
    name: 'Frostfall Castle',
    biome: 'snow',
    neighbors: [57, 59],
    townData: {
      name: 'Frostfall Castle',
      level: 1,
      baseValue: 720,
      taxYield: 88,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Ice Colossus',
      monsterHp: 130,
      monsterAtk: 21,
      monsterDef: 15
    }
  },
  { id: 59, gx: 24, gy: 18, gz: 4, type: 'vault', name: 'Glacial Vault', biome: 'snow', neighbors: [58, 60] },
  { id: 60, gx: 26, gy: 18, gz: 3, type: 'blue', name: 'Crystal Geyser', biome: 'snow', neighbors: [59, 61] },
  { id: 61, gx: 26, gy: 20, gz: 3, type: 'church', name: 'St. Nicholas Abbey', biome: 'snow', neighbors: [60, 62] },
  { id: 62, gx: 24, gy: 20, gz: 3, type: 'red', name: 'Icefall Cliff', biome: 'snow', neighbors: [61, 63] },
  {
    id: 63,
    gx: 22,
    gy: 20,
    gz: 3,
    type: 'town',
    name: 'Icebound Bastion',
    biome: 'snow',
    neighbors: [62, 64, 107],
    townData: {
      name: 'Icebound Bastion',
      level: 1,
      baseValue: 750,
      taxYield: 90,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Ancient Frost Dragon',
      monsterHp: 140,
      monsterAtk: 22,
      monsterDef: 16
    }
  },
  { id: 64, gx: 20, gy: 20, gz: 3, type: 'empty', name: 'Glacier Causeway', biome: 'snow', neighbors: [63, 43] },

  // ===================== PROVINCE 4: SUNFIRE DESERT & GOLDEN RUINS (Nodes 65-85, Elev: 0-1) =====================
  { id: 65, gx: 24, gy: 2, gz: 1, type: 'empty', name: 'Dune Gate', biome: 'desert', neighbors: [25, 66] },
  { id: 66, gx: 26, gy: 2, gz: 1, type: 'blue', name: 'Mirage Oasis', biome: 'desert', neighbors: [65, 67] },
  { id: 67, gx: 28, gy: 2, gz: 0, type: 'shop_item', name: 'Nomad Bazaar', biome: 'desert', neighbors: [66, 68] },
  {
    id: 68,
    gx: 30,
    gy: 2,
    gz: 0,
    type: 'town',
    name: 'Duneport Haven',
    biome: 'desert',
    neighbors: [67, 69],
    townData: {
      name: 'Duneport Haven',
      level: 1,
      baseValue: 600,
      taxYield: 75,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Desert Bandit Warlord',
      monsterHp: 95,
      monsterAtk: 17,
      monsterDef: 9
    }
  },
  { id: 69, gx: 32, gy: 2, gz: 0, type: 'red', name: 'Scorpion Pit', biome: 'desert', neighbors: [68, 70] },
  { id: 70, gx: 32, gy: 4, gz: 0, type: 'empty', name: 'Sunken Road', biome: 'desert', neighbors: [69, 71] },
  { id: 71, gx: 30, gy: 4, gz: 0, type: 'shop_weapon', name: 'Scimitar Smith', biome: 'desert', neighbors: [70, 72] },
  { id: 72, gx: 28, gy: 4, gz: 0, type: 'blue', name: 'Palm Springs', biome: 'desert', neighbors: [71, 73] },
  { id: 73, gx: 26, gy: 4, gz: 0, type: 'church', name: 'Solar Sun Temple', biome: 'desert', neighbors: [72, 74] },
  {
    id: 74,
    gx: 26,
    gy: 6,
    gz: 1,
    type: 'town',
    name: 'Mirage Citadel',
    biome: 'desert',
    neighbors: [73, 75],
    townData: {
      name: 'Mirage Citadel',
      level: 1,
      baseValue: 640,
      taxYield: 80,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Sandstone Sphinx',
      monsterHp: 110,
      monsterAtk: 19,
      monsterDef: 12
    }
  },
  { id: 75, gx: 28, gy: 6, gz: 1, type: 'vault', name: 'Pyramid Golden Vault', biome: 'desert', neighbors: [74, 76] },
  { id: 76, gx: 30, gy: 6, gz: 1, type: 'empty', name: 'Canyon Passage', biome: 'desert', neighbors: [75, 77] },
  { id: 77, gx: 32, gy: 6, gz: 1, type: 'red', name: 'Sandstorm Maw', biome: 'desert', neighbors: [76, 78] },
  { id: 78, gx: 32, gy: 8, gz: 0, type: 'shop_magic', name: 'Pyramid Hieroglyph Spire', biome: 'desert', neighbors: [77, 79] },
  { id: 79, gx: 30, gy: 8, gz: 0, type: 'blue', name: 'Emerald Oasis', biome: 'desert', neighbors: [78, 80] },
  {
    id: 80,
    gx: 28,
    gy: 8,
    gz: 0,
    type: 'town',
    name: 'Oasis Bastion',
    biome: 'desert',
    neighbors: [79, 81],
    townData: {
      name: 'Oasis Bastion',
      level: 1,
      baseValue: 680,
      taxYield: 85,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Sand Dune Behemoth',
      monsterHp: 120,
      monsterAtk: 20,
      monsterDef: 13
    }
  },
  { id: 81, gx: 26, gy: 8, gz: 0, type: 'empty', name: 'Sunfire Trail', biome: 'desert', neighbors: [80, 82] },
  { id: 82, gx: 26, gy: 10, gz: 0, type: 'church', name: 'Dune Sanctuary', biome: 'desert', neighbors: [81, 83] },
  { id: 83, gx: 28, gy: 10, gz: 0, type: 'vault', name: 'Pharaoh Vault', biome: 'desert', neighbors: [82, 84] },
  { id: 84, gx: 30, gy: 10, gz: 0, type: 'red', name: 'Cactus Labyrinth', biome: 'desert', neighbors: [83, 85] },
  { id: 85, gx: 30, gy: 12, gz: 0, type: 'empty', name: 'Desert Perimeter', biome: 'desert', neighbors: [84, 65] },

  // ===================== PROVINCE 5: IRONCRAG DWARVEN MINES (Nodes 86-106, Elev: 1-3) =====================
  { id: 86, gx: 10, gy: 8, gz: 1, type: 'empty', name: 'Cavern Mouth', biome: 'cavern', neighbors: [12, 87] },
  { id: 87, gx: 10, gy: 10, gz: 1, type: 'blue', name: 'Glowstone Spring', biome: 'cavern', neighbors: [86, 88] },
  { id: 88, gx: 12, gy: 10, gz: 2, type: 'shop_item', name: 'Mining Provisioner', biome: 'cavern', neighbors: [87, 89] },
  {
    id: 89,
    gx: 14,
    gy: 10,
    gz: 2,
    type: 'town',
    name: 'Ironcrag Citadel',
    biome: 'cavern',
    neighbors: [88, 90],
    townData: {
      name: 'Ironcrag Citadel',
      level: 1,
      baseValue: 700,
      taxYield: 85,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Dwarven Automaton',
      monsterHp: 125,
      monsterAtk: 21,
      monsterDef: 16
    }
  },
  { id: 90, gx: 14, gy: 12, gz: 2, type: 'red', name: 'Chasm Collapse', biome: 'cavern', neighbors: [89, 91] },
  { id: 91, gx: 12, gy: 12, gz: 2, type: 'shop_weapon', name: 'Deep Anvil Armory', biome: 'cavern', neighbors: [90, 92] },
  { id: 92, gx: 10, gy: 12, gz: 2, type: 'church', name: 'Underground Shinto', biome: 'cavern', neighbors: [91, 93] },
  { id: 93, gx: 8, gy: 12, gz: 2, type: 'blue', name: 'Mithril Spring', biome: 'cavern', neighbors: [92, 94] },
  { id: 94, gx: 8, gy: 14, gz: 2, type: 'empty', name: 'Minecart Rail Bridge', biome: 'cavern', neighbors: [93, 95] },
  {
    id: 95,
    gx: 10,
    gy: 14,
    gz: 2,
    type: 'town',
    name: 'Forgepost Hold',
    biome: 'cavern',
    neighbors: [94, 96],
    townData: {
      name: 'Forgepost Hold',
      level: 1,
      baseValue: 740,
      taxYield: 90,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Cavern Behemoth',
      monsterHp: 135,
      monsterAtk: 22,
      monsterDef: 15
    }
  },
  { id: 96, gx: 12, gy: 14, gz: 2, type: 'vault', name: 'Deep Ore Vault', biome: 'cavern', neighbors: [95, 97] },
  { id: 97, gx: 14, gy: 14, gz: 2, type: 'empty', name: 'Obsidian Rail', biome: 'cavern', neighbors: [96, 98] },
  { id: 98, gx: 14, gy: 16, gz: 2, type: 'shop_magic', name: 'Runic Cavern Altar', biome: 'cavern', neighbors: [97, 99] },
  { id: 99, gx: 12, gy: 16, gz: 2, type: 'red', name: 'Geothermal Vent', biome: 'cavern', neighbors: [98, 100] },
  { id: 100, gx: 10, gy: 16, gz: 3, type: 'blue', name: 'Crystal Cascade', biome: 'cavern', neighbors: [99, 101] },
  {
    id: 101,
    gx: 8,
    gy: 16,
    gz: 3,
    type: 'town',
    name: 'Mithril Gate Citadel',
    biome: 'cavern',
    neighbors: [100, 102],
    townData: {
      name: 'Mithril Gate Citadel',
      level: 1,
      baseValue: 780,
      taxYield: 95,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Obsidian Dreadnought',
      monsterHp: 145,
      monsterAtk: 24,
      monsterDef: 18
    }
  },
  { id: 102, gx: 6, gy: 16, gz: 3, type: 'church', name: 'Forge God Shrine', biome: 'cavern', neighbors: [101, 103] },
  { id: 103, gx: 6, gy: 14, gz: 2, type: 'empty', name: 'Dwarven Tunnel', biome: 'cavern', neighbors: [102, 104] },
  { id: 104, gx: 6, gy: 12, gz: 2, type: 'vault', name: 'Ancient Dwarf Cache', biome: 'cavern', neighbors: [103, 105] },
  { id: 105, gx: 6, gy: 10, gz: 1, type: 'empty', name: 'Underground Steps', biome: 'cavern', neighbors: [104, 106] },
  { id: 106, gx: 8, gy: 10, gz: 1, type: 'blue', name: 'Crystal Echo Cave', biome: 'cavern', neighbors: [105, 86] },

  // ===================== PROVINCE 6: BRIMSTONE CALDERA & DRAGON PEAKS (Nodes 107-128, Elev: 3-5) =====================
  { id: 107, gx: 22, gy: 22, gz: 3, type: 'empty', name: 'Magma Causeway', biome: 'volcano', neighbors: [63, 108] },
  { id: 108, gx: 24, gy: 22, gz: 3, type: 'red', name: 'Lava Falls', biome: 'volcano', neighbors: [107, 109] },
  { id: 109, gx: 26, gy: 22, gz: 3, type: 'shop_item', name: 'Brimstone Outpost', biome: 'volcano', neighbors: [108, 110] },
  { id: 110, gx: 28, gy: 22, gz: 4, type: 'blue', name: 'Ashen Spring', biome: 'volcano', neighbors: [109, 111] },
  {
    id: 111,
    gx: 30,
    gy: 22,
    gz: 4,
    type: 'town',
    name: 'Brimstone Bastion',
    biome: 'volcano',
    neighbors: [110, 112],
    townData: {
      name: 'Brimstone Bastion',
      level: 1,
      baseValue: 800,
      taxYield: 100,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Fire Wyrm Elder',
      monsterHp: 150,
      monsterAtk: 25,
      monsterDef: 16
    }
  },
  { id: 112, gx: 32, gy: 22, gz: 4, type: 'red', name: 'Magma River Crossing', biome: 'volcano', neighbors: [111, 113] },
  { id: 113, gx: 32, gy: 24, gz: 4, type: 'shop_weapon', name: 'Hellfire Forge', biome: 'volcano', neighbors: [112, 114] },
  { id: 114, gx: 30, gy: 24, gz: 4, type: 'vault', name: 'Molten Core Vault', biome: 'volcano', neighbors: [113, 115] },
  { id: 115, gx: 28, gy: 24, gz: 4, type: 'church', name: 'Dragon Horn Shrine', biome: 'volcano', neighbors: [114, 116] },
  { id: 116, gx: 26, gy: 24, gz: 4, type: 'empty', name: 'Cinder Incline', biome: 'volcano', neighbors: [115, 117] },
  {
    id: 117,
    gx: 24,
    gy: 24,
    gz: 4,
    type: 'town',
    name: 'Caldera Fortress',
    biome: 'volcano',
    neighbors: [116, 118],
    townData: {
      name: 'Caldera Fortress',
      level: 1,
      baseValue: 850,
      taxYield: 110,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Magma Colossus',
      monsterHp: 165,
      monsterAtk: 26,
      monsterDef: 18
    }
  },
  { id: 118, gx: 22, gy: 24, gz: 4, type: 'blue', name: 'Sulfur Basin', biome: 'volcano', neighbors: [117, 119] },
  { id: 119, gx: 22, gy: 26, gz: 4, type: 'red', name: 'Volcanic Fissure', biome: 'volcano', neighbors: [118, 120] },
  { id: 120, gx: 24, gy: 26, gz: 4, type: 'shop_magic', name: 'Hellfire Arcana', biome: 'volcano', neighbors: [119, 121] },
  { id: 121, gx: 26, gy: 26, gz: 4, type: 'empty', name: 'Smoldering Bridge', biome: 'volcano', neighbors: [120, 122] },
  { id: 122, gx: 28, gy: 26, gz: 4, type: 'vault', name: 'Dragon Hoard Vault', biome: 'volcano', neighbors: [121, 123] },
  {
    id: 123,
    gx: 30,
    gy: 26,
    gz: 5,
    type: 'town',
    name: 'Obsidian Citadel',
    biome: 'volcano',
    neighbors: [122, 124],
    townData: {
      name: 'Obsidian Citadel',
      level: 1,
      baseValue: 900,
      taxYield: 120,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Infernal Archdemon',
      monsterHp: 180,
      monsterAtk: 27,
      monsterDef: 19
    }
  },
  { id: 124, gx: 32, gy: 26, gz: 5, type: 'church', name: 'Altar of Fire', biome: 'volcano', neighbors: [123, 125] },
  { id: 125, gx: 32, gy: 28, gz: 5, type: 'red', name: 'Dragon Horn Crest', biome: 'volcano', neighbors: [124, 126] },
  { id: 126, gx: 30, gy: 28, gz: 5, type: 'blue', name: 'Ignis Geyser', biome: 'volcano', neighbors: [125, 127] },
  { id: 127, gx: 28, gy: 28, gz: 5, type: 'empty', name: 'Apex Ascent', biome: 'volcano', neighbors: [126, 128] },
  {
    id: 128,
    gx: 26,
    gy: 28,
    gz: 5,
    type: 'boss',
    name: 'Dragon King Ignis Keep',
    biome: 'volcano',
    neighbors: [127, 107]
  },

  // ===================== PROVINCE 7: CORAL COAST & PIRATE ARCHIPELAGO (Nodes 129-145, Elev: 0-1) =====================
  { id: 129, gx: 4, gy: 10, gz: 0, type: 'empty', name: 'Tidepool Causeway', biome: 'coral', neighbors: [16, 130] },
  { id: 130, gx: 6, gy: 10, gz: 0, type: 'blue', name: 'Pearl Shell Beach', biome: 'coral', neighbors: [129, 131] },
  { id: 131, gx: 8, gy: 10, gz: 0, type: 'shop_item', name: 'Harbor Bazaar', biome: 'coral', neighbors: [130, 132] },
  {
    id: 132,
    gx: 10,
    gy: 10,
    gz: 0,
    type: 'town',
    name: 'Coral Bay Port',
    biome: 'coral',
    neighbors: [131, 133],
    townData: {
      name: 'Coral Bay Port',
      level: 1,
      baseValue: 620,
      taxYield: 75,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Pirate Captain Bloodhook',
      monsterHp: 100,
      monsterAtk: 18,
      monsterDef: 11
    }
  },
  { id: 133, gx: 12, gy: 10, gz: 0, type: 'red', name: 'Reef Spikes', biome: 'coral', neighbors: [132, 134] },
  { id: 134, gx: 12, gy: 12, gz: 0, type: 'empty', name: 'Sea Bridge Pier', biome: 'coral', neighbors: [133, 135] },
  { id: 135, gx: 10, gy: 12, gz: 0, type: 'shop_weapon', name: 'Cutlass Forge', biome: 'coral', neighbors: [134, 136] },
  { id: 136, gx: 8, gy: 12, gz: 0, type: 'blue', name: 'Lagoon Waters', biome: 'coral', neighbors: [135, 137] },
  { id: 137, gx: 6, gy: 12, gz: 0, type: 'church', name: 'Sea Nymph Shrine', biome: 'coral', neighbors: [136, 138] },
  {
    id: 138,
    gx: 4,
    gy: 12,
    gz: 0,
    type: 'town',
    name: 'Siren Rock Citadel',
    biome: 'coral',
    neighbors: [137, 139],
    townData: {
      name: 'Siren Rock Citadel',
      level: 1,
      baseValue: 660,
      taxYield: 80,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Abyssal Siren Queen',
      monsterHp: 115,
      monsterAtk: 19,
      monsterDef: 12
    }
  },
  { id: 139, gx: 4, gy: 14, gz: 0, type: 'vault', name: 'Sunken Ship Treasure', biome: 'coral', neighbors: [138, 140] },
  { id: 140, gx: 6, gy: 14, gz: 0, type: 'empty', name: 'Coral Walkway', biome: 'coral', neighbors: [139, 141] },
  { id: 141, gx: 8, gy: 14, gz: 0, type: 'shop_magic', name: 'Tide Arcana Hut', biome: 'coral', neighbors: [140, 142] },
  { id: 142, gx: 10, gy: 14, gz: 0, type: 'blue', name: 'Bioluminescent Pool', biome: 'coral', neighbors: [141, 143] },
  { id: 143, gx: 12, gy: 14, gz: 0, type: 'red', name: 'Kraken Whirlpool', biome: 'coral', neighbors: [142, 144] },
  {
    id: 144,
    gx: 12,
    gy: 16,
    gz: 0,
    type: 'town',
    name: 'Kraken Point Haven',
    biome: 'coral',
    neighbors: [143, 145],
    townData: {
      name: 'Kraken Point Haven',
      level: 1,
      baseValue: 700,
      taxYield: 85,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Lesser Kraken',
      monsterHp: 130,
      monsterAtk: 21,
      monsterDef: 14
    }
  },
  { id: 145, gx: 4, gy: 16, gz: 0, type: 'empty', name: 'Shoal Highway', biome: 'coral', neighbors: [144, 129] },

  // ===================== PROVINCE 8: ABYSS DIMENSION & RICO'S DARK THRONE (Nodes 146-154, Elev: 0-2) =====================
  { id: 146, gx: 2, gy: 4, gz: 0, type: 'empty', name: 'Void Fissure Entrance', biome: 'abyss', neighbors: [0, 147] },
  { id: 147, gx: 2, gy: 6, gz: 1, type: 'blue', name: 'Soul Crystal Well', biome: 'abyss', neighbors: [146, 148] },
  {
    id: 148,
    gx: 2,
    gy: 8,
    gz: 1,
    type: 'town',
    name: 'Nether Watch Citadel',
    biome: 'abyss',
    neighbors: [147, 149],
    townData: {
      name: 'Nether Watch Citadel',
      level: 1,
      baseValue: 800,
      taxYield: 95,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Nether Knight Commander',
      monsterHp: 155,
      monsterAtk: 25,
      monsterDef: 17
    }
  },
  { id: 149, gx: 2, gy: 10, gz: 2, type: 'shop_item', name: 'Underworld Merchant', biome: 'abyss', neighbors: [148, 150] },
  { id: 150, gx: 2, gy: 12, gz: 2, type: 'dark_gate', name: 'Altar of Rico (Darkling Throne)', biome: 'abyss', neighbors: [149, 151] },
  { id: 151, gx: 2, gy: 14, gz: 1, type: 'red', name: 'Abyssal Trap', biome: 'abyss', neighbors: [150, 152] },
  { id: 152, gx: 2, gy: 16, gz: 1, type: 'church', name: 'Nether Shrine', biome: 'abyss', neighbors: [151, 153] },
  {
    id: 153,
    gx: 2,
    gy: 18,
    gz: 1,
    type: 'town',
    name: 'Void Gate Citadel',
    biome: 'abyss',
    neighbors: [152, 154],
    townData: {
      name: 'Void Gate Citadel',
      level: 1,
      baseValue: 850,
      taxYield: 100,
      ownerId: null,
      isOccupiedByMonster: true,
      monsterName: 'Void Warden Behemoth',
      monsterHp: 170,
      monsterAtk: 26,
      monsterDef: 18
    }
  },
  { id: 154, gx: 2, gy: 20, gz: 0, type: 'vault', name: 'Rico Secret Vault', biome: 'abyss', neighbors: [153, 146] }
];
