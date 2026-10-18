import { getWorld } from './WorldState';
import { RULES } from './Rules';
import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { GameState } from './GameState';
import { Combatant } from './BattleEngine';
import { audio } from '../engine/AudioSynthesizer';
import { isDungeonExit, dungeonSceneGroup } from './DungeonLocations';

export const DUNGEON_CATACOMBS_NODES: BoardNode[] = [
  {
    "id": 1000,
    "gx": 140,
    "gy": 140,
    "gz": -3,
    "type": "church",
    "name": "Catacombs · Entrance",
    "biome": "abyss",
    "neighbors": [
      1001,
      1003
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 1",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1001,
    "gx": 143,
    "gy": 140,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 1 · 2",
    "biome": "abyss",
    "neighbors": [
      1000,
      1002
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 1",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1002,
    "gx": 146,
    "gy": 140,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 1 · 3",
    "biome": "abyss",
    "neighbors": [
      1001,
      1005,
      1007
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 1",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1003,
    "gx": 140,
    "gy": 143,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 1 · 4",
    "biome": "abyss",
    "neighbors": [
      1004,
      1000,
      1019
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 1",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1004,
    "gx": 143,
    "gy": 143,
    "gz": -3,
    "type": "blue",
    "name": "Catacombs · Chamber 1 · 5",
    "biome": "abyss",
    "neighbors": [
      1005,
      1003
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 1",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1005,
    "gx": 146,
    "gy": 143,
    "gz": -3,
    "type": "red",
    "name": "Catacombs · Chamber 1 · 6",
    "biome": "abyss",
    "neighbors": [
      1002,
      1004
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 1",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1007,
    "gx": 152,
    "gy": 140,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 2 · 1",
    "biome": "abyss",
    "neighbors": [
      1008,
      1010,
      1002
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 2",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1008,
    "gx": 155,
    "gy": 140,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Catacombs · Chamber 2 · 2",
    "biome": "abyss",
    "neighbors": [
      1007,
      1009
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 2",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1009,
    "gx": 158,
    "gy": 140,
    "gz": -3,
    "type": "blue",
    "name": "Catacombs · Chamber 2 · 3",
    "biome": "abyss",
    "neighbors": [
      1008,
      1012
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 2",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1010,
    "gx": 152,
    "gy": 143,
    "gz": -3,
    "type": "vault",
    "name": "Catacombs · Chamber 2 · 4",
    "biome": "abyss",
    "neighbors": [
      1011,
      1007,
      1013
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 2",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1011,
    "gx": 155,
    "gy": 143,
    "gz": -3,
    "type": "red",
    "name": "Catacombs · Chamber 2 · 5",
    "biome": "abyss",
    "neighbors": [
      1012,
      1010
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 2",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1012,
    "gx": 158,
    "gy": 143,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 2 · 6",
    "biome": "abyss",
    "neighbors": [
      1009,
      1011,
      1015
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 2",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1013,
    "gx": 152,
    "gy": 150,
    "gz": -3,
    "type": "blue",
    "name": "Catacombs · Chamber 3 · 1",
    "biome": "abyss",
    "neighbors": [
      1014,
      1016,
      1010
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 3",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1014,
    "gx": 155,
    "gy": 150,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 3 · 2",
    "biome": "abyss",
    "neighbors": [
      1013,
      1015
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 3",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1015,
    "gx": 158,
    "gy": 150,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Catacombs · Chamber 3 · 3",
    "biome": "abyss",
    "neighbors": [
      1014,
      1018,
      1012
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 3",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1016,
    "gx": 152,
    "gy": 153,
    "gz": -3,
    "type": "red",
    "name": "Catacombs · Chamber 3 · 4",
    "biome": "abyss",
    "neighbors": [
      1017,
      1013,
      1024
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 3",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1017,
    "gx": 155,
    "gy": 153,
    "gz": -3,
    "type": "blue",
    "name": "Catacombs · Chamber 3 · 5",
    "biome": "abyss",
    "neighbors": [
      1018,
      1016
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 3",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1018,
    "gx": 158,
    "gy": 153,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 3 · 6",
    "biome": "abyss",
    "neighbors": [
      1015,
      1017
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 3",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1019,
    "gx": 140,
    "gy": 150,
    "gz": -3,
    "type": "vault",
    "name": "Catacombs · Chamber 4 · 1",
    "biome": "abyss",
    "neighbors": [
      1020,
      1022,
      1003
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 4",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1020,
    "gx": 143,
    "gy": 150,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 4 · 2",
    "biome": "abyss",
    "neighbors": [
      1019,
      1021
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 4",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1021,
    "gx": 146,
    "gy": 150,
    "gz": -3,
    "type": "red",
    "name": "Catacombs · Chamber 4 · 3",
    "biome": "abyss",
    "neighbors": [
      1020,
      1024
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 4",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1022,
    "gx": 140,
    "gy": 153,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Catacombs · Chamber 4 · 4",
    "biome": "abyss",
    "neighbors": [
      1023,
      1019,
      1025
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 4",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1023,
    "gx": 143,
    "gy": 153,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 4 · 5",
    "biome": "abyss",
    "neighbors": [
      1024,
      1022
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 4",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1024,
    "gx": 146,
    "gy": 153,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 4 · 6",
    "biome": "abyss",
    "neighbors": [
      1021,
      1023,
      1016
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 4",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1025,
    "gx": 140,
    "gy": 160,
    "gz": -3,
    "type": "blue",
    "name": "Catacombs · Chamber 5 · 1",
    "biome": "abyss",
    "neighbors": [
      1026,
      1028,
      1022
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 5",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1026,
    "gx": 143,
    "gy": 160,
    "gz": -3,
    "type": "red",
    "name": "Catacombs · Chamber 5 · 2",
    "biome": "abyss",
    "neighbors": [
      1025,
      1027
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 5",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1027,
    "gx": 146,
    "gy": 160,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 5 · 3",
    "biome": "abyss",
    "neighbors": [
      1026,
      1030,
      1031
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 5",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1028,
    "gx": 140,
    "gy": 163,
    "gz": -3,
    "type": "vault",
    "name": "Catacombs · Chamber 5 · 4",
    "biome": "abyss",
    "neighbors": [
      1029,
      1025
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 5",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1029,
    "gx": 143,
    "gy": 163,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Catacombs · Chamber 5 · 5",
    "biome": "abyss",
    "neighbors": [
      1030,
      1028
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 5",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1030,
    "gx": 146,
    "gy": 163,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 5 · 6",
    "biome": "abyss",
    "neighbors": [
      1027,
      1029
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 5",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1031,
    "gx": 152,
    "gy": 160,
    "gz": -3,
    "type": "boss",
    "name": "Catacombs · Guardian Hall",
    "biome": "abyss",
    "neighbors": [
      1032,
      1034,
      1027
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 6",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1032,
    "gx": 155,
    "gy": 160,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 6 · 2",
    "biome": "abyss",
    "neighbors": [
      1031,
      1033
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 6",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1033,
    "gx": 158,
    "gy": 160,
    "gz": -3,
    "type": "blue",
    "name": "Catacombs · Chamber 6 · 3",
    "biome": "abyss",
    "neighbors": [
      1032,
      1006
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 6",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1034,
    "gx": 152,
    "gy": 163,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 6 · 4",
    "biome": "abyss",
    "neighbors": [
      1035,
      1031
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 6",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1035,
    "gx": 155,
    "gy": 163,
    "gz": -3,
    "type": "empty",
    "name": "Catacombs · Chamber 6 · 5",
    "biome": "abyss",
    "neighbors": [
      1006,
      1034
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 6",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  },
  {
    "id": 1006,
    "gx": 158,
    "gy": 163,
    "gz": -3,
    "type": "isekai_event",
    "name": "Catacombs · Surface Exit",
    "biome": "abyss",
    "neighbors": [
      1033,
      1035
    ],
    "realmId": "abyss",
    "realmName": "สุสานมหาวิหารใต้พิภพ",
    "subRegionName": "สุสานมหาวิหารใต้พิภพ · ห้องที่ 6",
    "weather": "miasma",
    "regionKey": "dungeon_catacombs"
  }
];

export const DUNGEON_VOLCANO_NODES: BoardNode[] = [
  {
    "id": 1100,
    "gx": 200,
    "gy": 200,
    "gz": -3,
    "type": "church",
    "name": "Ember Sanctum · Entrance",
    "biome": "volcano",
    "neighbors": [
      1101,
      1103
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 1",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1101,
    "gx": 203,
    "gy": 200,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 1 · 2",
    "biome": "volcano",
    "neighbors": [
      1100,
      1102
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 1",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1102,
    "gx": 206,
    "gy": 200,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 1 · 3",
    "biome": "volcano",
    "neighbors": [
      1101,
      1105,
      1107
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 1",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1103,
    "gx": 200,
    "gy": 203,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 1 · 4",
    "biome": "volcano",
    "neighbors": [
      1104,
      1100,
      1119
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 1",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1104,
    "gx": 203,
    "gy": 203,
    "gz": -3,
    "type": "blue",
    "name": "Ember Sanctum · Chamber 1 · 5",
    "biome": "volcano",
    "neighbors": [
      1105,
      1103
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 1",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1105,
    "gx": 206,
    "gy": 203,
    "gz": -3,
    "type": "red",
    "name": "Ember Sanctum · Chamber 1 · 6",
    "biome": "volcano",
    "neighbors": [
      1102,
      1104
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 1",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1107,
    "gx": 212,
    "gy": 200,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 2 · 1",
    "biome": "volcano",
    "neighbors": [
      1108,
      1110,
      1102
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 2",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1108,
    "gx": 215,
    "gy": 200,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Ember Sanctum · Chamber 2 · 2",
    "biome": "volcano",
    "neighbors": [
      1107,
      1109
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 2",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1109,
    "gx": 218,
    "gy": 200,
    "gz": -3,
    "type": "blue",
    "name": "Ember Sanctum · Chamber 2 · 3",
    "biome": "volcano",
    "neighbors": [
      1108,
      1112
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 2",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1110,
    "gx": 212,
    "gy": 203,
    "gz": -3,
    "type": "vault",
    "name": "Ember Sanctum · Chamber 2 · 4",
    "biome": "volcano",
    "neighbors": [
      1111,
      1107,
      1113
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 2",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1111,
    "gx": 215,
    "gy": 203,
    "gz": -3,
    "type": "red",
    "name": "Ember Sanctum · Chamber 2 · 5",
    "biome": "volcano",
    "neighbors": [
      1112,
      1110
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 2",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1112,
    "gx": 218,
    "gy": 203,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 2 · 6",
    "biome": "volcano",
    "neighbors": [
      1109,
      1111,
      1115
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 2",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1113,
    "gx": 212,
    "gy": 210,
    "gz": -3,
    "type": "blue",
    "name": "Ember Sanctum · Chamber 3 · 1",
    "biome": "volcano",
    "neighbors": [
      1114,
      1116,
      1110
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 3",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1114,
    "gx": 215,
    "gy": 210,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 3 · 2",
    "biome": "volcano",
    "neighbors": [
      1113,
      1115
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 3",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1115,
    "gx": 218,
    "gy": 210,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Ember Sanctum · Chamber 3 · 3",
    "biome": "volcano",
    "neighbors": [
      1114,
      1118,
      1112
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 3",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1116,
    "gx": 212,
    "gy": 213,
    "gz": -3,
    "type": "red",
    "name": "Ember Sanctum · Chamber 3 · 4",
    "biome": "volcano",
    "neighbors": [
      1117,
      1113,
      1124
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 3",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1117,
    "gx": 215,
    "gy": 213,
    "gz": -3,
    "type": "blue",
    "name": "Ember Sanctum · Chamber 3 · 5",
    "biome": "volcano",
    "neighbors": [
      1118,
      1116
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 3",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1118,
    "gx": 218,
    "gy": 213,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 3 · 6",
    "biome": "volcano",
    "neighbors": [
      1115,
      1117
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 3",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1119,
    "gx": 200,
    "gy": 210,
    "gz": -3,
    "type": "vault",
    "name": "Ember Sanctum · Chamber 4 · 1",
    "biome": "volcano",
    "neighbors": [
      1120,
      1122,
      1103
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 4",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1120,
    "gx": 203,
    "gy": 210,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 4 · 2",
    "biome": "volcano",
    "neighbors": [
      1119,
      1121
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 4",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1121,
    "gx": 206,
    "gy": 210,
    "gz": -3,
    "type": "red",
    "name": "Ember Sanctum · Chamber 4 · 3",
    "biome": "volcano",
    "neighbors": [
      1120,
      1124
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 4",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1122,
    "gx": 200,
    "gy": 213,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Ember Sanctum · Chamber 4 · 4",
    "biome": "volcano",
    "neighbors": [
      1123,
      1119,
      1125
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 4",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1123,
    "gx": 203,
    "gy": 213,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 4 · 5",
    "biome": "volcano",
    "neighbors": [
      1124,
      1122
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 4",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1124,
    "gx": 206,
    "gy": 213,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 4 · 6",
    "biome": "volcano",
    "neighbors": [
      1121,
      1123,
      1116
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 4",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1125,
    "gx": 200,
    "gy": 220,
    "gz": -3,
    "type": "blue",
    "name": "Ember Sanctum · Chamber 5 · 1",
    "biome": "volcano",
    "neighbors": [
      1126,
      1128,
      1122
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 5",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1126,
    "gx": 203,
    "gy": 220,
    "gz": -3,
    "type": "red",
    "name": "Ember Sanctum · Chamber 5 · 2",
    "biome": "volcano",
    "neighbors": [
      1125,
      1127
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 5",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1127,
    "gx": 206,
    "gy": 220,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 5 · 3",
    "biome": "volcano",
    "neighbors": [
      1126,
      1130,
      1131
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 5",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1128,
    "gx": 200,
    "gy": 223,
    "gz": -3,
    "type": "vault",
    "name": "Ember Sanctum · Chamber 5 · 4",
    "biome": "volcano",
    "neighbors": [
      1129,
      1125
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 5",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1129,
    "gx": 203,
    "gy": 223,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Ember Sanctum · Chamber 5 · 5",
    "biome": "volcano",
    "neighbors": [
      1130,
      1128
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 5",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1130,
    "gx": 206,
    "gy": 223,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 5 · 6",
    "biome": "volcano",
    "neighbors": [
      1127,
      1129
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 5",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1131,
    "gx": 212,
    "gy": 220,
    "gz": -3,
    "type": "boss",
    "name": "Ember Sanctum · Guardian Hall",
    "biome": "volcano",
    "neighbors": [
      1132,
      1134,
      1127
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 6",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1132,
    "gx": 215,
    "gy": 220,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 6 · 2",
    "biome": "volcano",
    "neighbors": [
      1131,
      1133
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 6",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1133,
    "gx": 218,
    "gy": 220,
    "gz": -3,
    "type": "blue",
    "name": "Ember Sanctum · Chamber 6 · 3",
    "biome": "volcano",
    "neighbors": [
      1132,
      1106
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 6",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1134,
    "gx": 212,
    "gy": 223,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 6 · 4",
    "biome": "volcano",
    "neighbors": [
      1135,
      1131
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 6",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1135,
    "gx": 215,
    "gy": 223,
    "gz": -3,
    "type": "empty",
    "name": "Ember Sanctum · Chamber 6 · 5",
    "biome": "volcano",
    "neighbors": [
      1106,
      1134
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 6",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  },
  {
    "id": 1106,
    "gx": 218,
    "gy": 223,
    "gz": -3,
    "type": "isekai_event",
    "name": "Ember Sanctum · Surface Exit",
    "biome": "volcano",
    "neighbors": [
      1133,
      1135
    ],
    "realmId": "sunfire",
    "realmName": "มหาโรงหลอมอัคคี",
    "subRegionName": "มหาโรงหลอมอัคคี · ห้องที่ 6",
    "weather": "heatwave",
    "regionKey": "dungeon_volcano"
  }
];

export const DUNGEON_FROZEN_NODES: BoardNode[] = [
  {
    "id": 1200,
    "gx": 260,
    "gy": 260,
    "gz": -3,
    "type": "church",
    "name": "Frozen Labyrinth · Entrance",
    "biome": "snow",
    "neighbors": [
      1201,
      1203
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 1",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1201,
    "gx": 263,
    "gy": 260,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 1 · 2",
    "biome": "snow",
    "neighbors": [
      1200,
      1202
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 1",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1202,
    "gx": 266,
    "gy": 260,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 1 · 3",
    "biome": "snow",
    "neighbors": [
      1201,
      1205,
      1207
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 1",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1203,
    "gx": 260,
    "gy": 263,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 1 · 4",
    "biome": "snow",
    "neighbors": [
      1204,
      1200,
      1219
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 1",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1204,
    "gx": 263,
    "gy": 263,
    "gz": -3,
    "type": "blue",
    "name": "Frozen Labyrinth · Chamber 1 · 5",
    "biome": "snow",
    "neighbors": [
      1205,
      1203
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 1",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1205,
    "gx": 266,
    "gy": 263,
    "gz": -3,
    "type": "red",
    "name": "Frozen Labyrinth · Chamber 1 · 6",
    "biome": "snow",
    "neighbors": [
      1202,
      1204
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 1",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1207,
    "gx": 272,
    "gy": 260,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 2 · 1",
    "biome": "snow",
    "neighbors": [
      1208,
      1210,
      1202
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 2",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1208,
    "gx": 275,
    "gy": 260,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Frozen Labyrinth · Chamber 2 · 2",
    "biome": "snow",
    "neighbors": [
      1207,
      1209
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 2",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1209,
    "gx": 278,
    "gy": 260,
    "gz": -3,
    "type": "blue",
    "name": "Frozen Labyrinth · Chamber 2 · 3",
    "biome": "snow",
    "neighbors": [
      1208,
      1212
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 2",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1210,
    "gx": 272,
    "gy": 263,
    "gz": -3,
    "type": "vault",
    "name": "Frozen Labyrinth · Chamber 2 · 4",
    "biome": "snow",
    "neighbors": [
      1211,
      1207,
      1213
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 2",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1211,
    "gx": 275,
    "gy": 263,
    "gz": -3,
    "type": "red",
    "name": "Frozen Labyrinth · Chamber 2 · 5",
    "biome": "snow",
    "neighbors": [
      1212,
      1210
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 2",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1212,
    "gx": 278,
    "gy": 263,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 2 · 6",
    "biome": "snow",
    "neighbors": [
      1209,
      1211,
      1215
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 2",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1213,
    "gx": 272,
    "gy": 270,
    "gz": -3,
    "type": "blue",
    "name": "Frozen Labyrinth · Chamber 3 · 1",
    "biome": "snow",
    "neighbors": [
      1214,
      1216,
      1210
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 3",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1214,
    "gx": 275,
    "gy": 270,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 3 · 2",
    "biome": "snow",
    "neighbors": [
      1213,
      1215
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 3",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1215,
    "gx": 278,
    "gy": 270,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Frozen Labyrinth · Chamber 3 · 3",
    "biome": "snow",
    "neighbors": [
      1214,
      1218,
      1212
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 3",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1216,
    "gx": 272,
    "gy": 273,
    "gz": -3,
    "type": "red",
    "name": "Frozen Labyrinth · Chamber 3 · 4",
    "biome": "snow",
    "neighbors": [
      1217,
      1213,
      1224
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 3",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1217,
    "gx": 275,
    "gy": 273,
    "gz": -3,
    "type": "blue",
    "name": "Frozen Labyrinth · Chamber 3 · 5",
    "biome": "snow",
    "neighbors": [
      1218,
      1216
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 3",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1218,
    "gx": 278,
    "gy": 273,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 3 · 6",
    "biome": "snow",
    "neighbors": [
      1215,
      1217
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 3",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1219,
    "gx": 260,
    "gy": 270,
    "gz": -3,
    "type": "vault",
    "name": "Frozen Labyrinth · Chamber 4 · 1",
    "biome": "snow",
    "neighbors": [
      1220,
      1222,
      1203
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 4",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1220,
    "gx": 263,
    "gy": 270,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 4 · 2",
    "biome": "snow",
    "neighbors": [
      1219,
      1221
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 4",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1221,
    "gx": 266,
    "gy": 270,
    "gz": -3,
    "type": "red",
    "name": "Frozen Labyrinth · Chamber 4 · 3",
    "biome": "snow",
    "neighbors": [
      1220,
      1224
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 4",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1222,
    "gx": 260,
    "gy": 273,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Frozen Labyrinth · Chamber 4 · 4",
    "biome": "snow",
    "neighbors": [
      1223,
      1219,
      1225
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 4",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1223,
    "gx": 263,
    "gy": 273,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 4 · 5",
    "biome": "snow",
    "neighbors": [
      1224,
      1222
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 4",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1224,
    "gx": 266,
    "gy": 273,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 4 · 6",
    "biome": "snow",
    "neighbors": [
      1221,
      1223,
      1216
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 4",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1225,
    "gx": 260,
    "gy": 280,
    "gz": -3,
    "type": "blue",
    "name": "Frozen Labyrinth · Chamber 5 · 1",
    "biome": "snow",
    "neighbors": [
      1226,
      1228,
      1222
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 5",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1226,
    "gx": 263,
    "gy": 280,
    "gz": -3,
    "type": "red",
    "name": "Frozen Labyrinth · Chamber 5 · 2",
    "biome": "snow",
    "neighbors": [
      1225,
      1227
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 5",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1227,
    "gx": 266,
    "gy": 280,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 5 · 3",
    "biome": "snow",
    "neighbors": [
      1226,
      1230,
      1231
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 5",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1228,
    "gx": 260,
    "gy": 283,
    "gz": -3,
    "type": "vault",
    "name": "Frozen Labyrinth · Chamber 5 · 4",
    "biome": "snow",
    "neighbors": [
      1229,
      1225
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 5",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1229,
    "gx": 263,
    "gy": 283,
    "gz": -3,
    "type": "mystery_chest",
    "name": "Frozen Labyrinth · Chamber 5 · 5",
    "biome": "snow",
    "neighbors": [
      1230,
      1228
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 5",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1230,
    "gx": 266,
    "gy": 283,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 5 · 6",
    "biome": "snow",
    "neighbors": [
      1227,
      1229
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 5",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1231,
    "gx": 272,
    "gy": 280,
    "gz": -3,
    "type": "boss",
    "name": "Frozen Labyrinth · Guardian Hall",
    "biome": "snow",
    "neighbors": [
      1232,
      1234,
      1227
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 6",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1232,
    "gx": 275,
    "gy": 280,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 6 · 2",
    "biome": "snow",
    "neighbors": [
      1231,
      1233
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 6",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1233,
    "gx": 278,
    "gy": 280,
    "gz": -3,
    "type": "blue",
    "name": "Frozen Labyrinth · Chamber 6 · 3",
    "biome": "snow",
    "neighbors": [
      1232,
      1206
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 6",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1234,
    "gx": 272,
    "gy": 283,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 6 · 4",
    "biome": "snow",
    "neighbors": [
      1235,
      1231
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 6",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1235,
    "gx": 275,
    "gy": 283,
    "gz": -3,
    "type": "empty",
    "name": "Frozen Labyrinth · Chamber 6 · 5",
    "biome": "snow",
    "neighbors": [
      1206,
      1234
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 6",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  },
  {
    "id": 1206,
    "gx": 278,
    "gy": 283,
    "gz": -3,
    "type": "isekai_event",
    "name": "Frozen Labyrinth · Surface Exit",
    "biome": "snow",
    "neighbors": [
      1233,
      1235
    ],
    "realmId": "frostpeak",
    "realmName": "พระราชวังเขาวงกตเหมันต์",
    "subRegionName": "พระราชวังเขาวงกตเหมันต์ · ห้องที่ 6",
    "weather": "snow",
    "regionKey": "dungeon_ice"
  }
];

export class DungeonSystem {
  reset(): void { getWorld().expeditions = {}; }

  ensureDungeonLoaded(game: GameState): void {
    if (!game.allNodes.some(n => n.id === 1000)) {
      game.allNodes.push(...structuredClone(DUNGEON_CATACOMBS_NODES));
    }
    if (!game.allNodes.some(n => n.id === 1100)) {
      game.allNodes.push(...structuredClone(DUNGEON_VOLCANO_NODES));
    }
    if (!game.allNodes.some(n => n.id === 1200)) {
      game.allNodes.push(...structuredClone(DUNGEON_FROZEN_NODES));
    }
  }

  isInDungeon(nodeId: number): boolean {
    return dungeonSceneGroup(nodeId) !== 0;
  }

  isExitNode(nodeId: number): boolean {
    return isDungeonExit(nodeId);
  }

  getDungeonDepth(playerId: number): number { return getWorld().expeditions[playerId]?.depth ?? 1; }
  getTorch(playerId: number): number { return getWorld().expeditions[playerId]?.torch ?? 100; }
  stepTorch(player: Player): { torchPct: number; isDark: boolean; message?: string } {
    const world = getWorld();
    const run = world.expeditions[player.id] ??= { entrance: dungeonSceneGroup(player.nodeId) || 1000, depth: 1, torch: 100, opened: [], visited: [], guardians: [], claimedFloors: [] };
    const previous = run.torch;
    run.torch = Math.max(0, run.torch - 4);
    const flags = world.memory(player.id).flags;
    if (run.torch <= 20 && flags.spareTorch) { run.torch = Math.min(100, run.torch + 40); flags.spareTorch = 0; }
    return { torchPct: run.torch, isDark: run.torch <= 20, message: previous > 20 && run.torch <= 20 ? 'คบเพลิงใกล้ดับ: ศัตรูพลังเพิ่ม 20% ควรหาทางออกหรือพิชิตผู้พิทักษ์' : undefined };
  }
  recordStep(player: Player, nodeId: number): void {
    this.stepTorch(player);
    const run = getWorld().expeditions[player.id];
    if (!run.visited.includes(nodeId)) run.visited.push(nodeId);
  }
  enterDungeon(player: Player, game: GameState, preferredRealm?: string): void {
    this.ensureDungeonLoaded(game);
    const realm = preferredRealm || game.allNodes.find(n => n.id === player.nodeId)?.realmId;
    const startId = realm === 'sunfire' ? 1100 : realm === 'frostpeak' ? 1200 : 1000;
    player.dungeonReturnNodeId = player.nodeId;
    game.world.expeditions[player.id] = { entrance: startId, depth: 1, torch: 100, opened: [], visited: [startId], guardians: [], claimedFloors: [] };
    this.moveTo(player, game, startId);
    game.addLog('เข้าสู่ดันเจี้ยน: คบเพลิง 100% • เปิดหีบได้ครั้งเดียวต่อชั้น • โบนัสสำเร็จต้องปราบผู้พิทักษ์', 'battle');
  }
  claimChest(player: Player, nodeId: number): number {
    const run = getWorld().expeditions[player.id];
    if (!run) return 0;
    const key = run.depth * 10000 + nodeId;
    if (run.opened.includes(key)) return 0;
    run.opened.push(key);
    const gold = Math.round(RULES.expeditionChest * (1 + (run.depth - 1) * 0.25));
    player.gold += gold; player.matchStats.goldEarnedTotal += gold;
    return gold;
  }
  defeatGuardian(player: Player, nodeId: number): void {
    const run = getWorld().expeditions[player.id];
    if (run && !run.guardians.includes(run.depth)) run.guardians.push(run.depth);
  }
  isGuardianDefeated(player: Player): boolean {
    const run = getWorld().expeditions[player.id];
    return !!run?.guardians.includes(run.depth);
  }
  claimFloor(player: Player): number {
    const run = getWorld().expeditions[player.id];
    if (!run || !run.guardians.includes(run.depth) || run.claimedFloors.includes(run.depth)) return 0;
    run.claimedFloors.push(run.depth);
    const gold = Math.round(RULES.expeditionClear * (1 + (run.depth - 1) * 0.3));
    player.gold += gold; player.matchStats.goldEarnedTotal += gold; player.gainXP(Math.round(120 * (1 + (run.depth - 1) * 0.3)));
    return gold;
  }
  descendDeeper(player: Player, game: GameState): { success: boolean; newDepth: number } {
    const run = game.world.expeditions[player.id];
    if (!run || !run.guardians.includes(run.depth)) return { success: false, newDepth: run?.depth ?? 1 };
    const reward = this.claimFloor(player);
    run.depth++; run.torch = 100; run.visited = [run.entrance];
    this.moveTo(player, game, run.entrance);
    game.addLog('รับโบนัสชั้นก่อน ' + reward + 'G • ลงสู่ชั้น ' + run.depth + ' ศัตรูแข็งแกร่งขึ้น 20%', 'battle');
    return { success: true, newDepth: run.depth };
  }
  exitDungeon(player: Player, game: GameState): void {
    const reward = this.claimFloor(player);
    const target = player.dungeonReturnNodeId ?? 0;
    player.dungeonReturnNodeId = null;
    delete game.world.expeditions[player.id];
    this.moveTo(player, game, target);
    game.addLog('ออกจากดันเจี้ยน • โบนัสพิชิต ' + reward + 'G' + (reward ? '' : ' (ยังไม่พิชิตผู้พิทักษ์หรือรับโบนัสแล้ว)'), 'gold');
  }
  abandon(player: Player): void { delete getWorld().expeditions[player.id]; player.dungeonReturnNodeId = null; }
  private moveTo(player: Player, game: GameState, id: number): void {
    const node = game.allNodes.find(n => n.id === id) || game.allNodes[0];
    player.nodeId = node.id; player.prevNodeId = null;
    player.gridX = node.gx; player.gridY = node.gy; player.gridZ = node.gz;
    game.world.focusRealm = node.realmId;
  }

  getCryptLordBossCombatant(): Combatant {
    return {
      name: 'ราชันไร้ชีพ มัลธาซาร์ (Crypt Lord Malthazar)',
      maxHp: 380,
      hp: 380,
      mp: 100,
      maxMp: 100,
      atk: 36,
      def: 26,
      mag: 34,
      spd: 18,
      luk: 15,
      isBoss: true,
      skillName: 'คำสาปกลืนวิญญาณ (Soul Reap)'
    };
  }

  getFireDrakeBossCombatant(): Combatant {
    return {
      name: 'จอมมังกรอัคคี อิ๊กนีเชียส (Flame Drake Lord)',
      maxHp: 450,
      hp: 450,
      mp: 120,
      maxMp: 120,
      atk: 42,
      def: 28,
      mag: 38,
      spd: 20,
      luk: 18,
      isBoss: true,
      skillName: 'ลมหายใจมังกรสุริยะ (Solar Dragon Breath)'
    };
  }

  getFrostYetiBossCombatant(): Combatant {
    return {
      name: 'พญาเยติเหมันต์ ไครโอส (Glacial Yeti Titan)',
      maxHp: 480,
      hp: 480,
      mp: 80,
      maxMp: 80,
      atk: 44,
      def: 35,
      mag: 24,
      spd: 14,
      luk: 12,
      isBoss: true,
      skillName: 'ทุบผาหิมะถล่ม (Avalanche Slam)'
    };
  }

  getMimicCombatant(): Combatant {
    return {
      name: 'กล่องปีศาจกินคน (Ancient Mimic)',
      maxHp: 260,
      hp: 260,
      mp: 50,
      maxMp: 50,
      atk: 35,
      def: 22,
      mag: 20,
      spd: 16,
      luk: 25,
      skillName: 'เขี้ยวกลืนกินทอง (Gold Crunch)'
    };
  }
}

export const dungeonSystem = new DungeonSystem();
