import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { GameState } from './GameState';
import { Combatant } from './BattleEngine';
import { audio } from '../engine/AudioSynthesizer';

export const DUNGEON_CATACOMBS_NODES: BoardNode[] = [
  {
    id: 1000,
    gx: 140,
    gy: 140,
    gz: -3,
    type: 'church',
    name: 'ประตูทางเข้าสุสานใต้พิภพ (Catacombs Entrance)',
    biome: 'abyss',
    neighbors: [1001],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 1: ประตูปิดตาย',
    weather: 'miasma'
  },
  {
    id: 1001,
    gx: 142,
    gy: 140,
    gz: -3,
    type: 'red',
    name: 'ระเบียงกระดูกต้องคำสาป (Bone Corridor)',
    biome: 'abyss',
    neighbors: [1000, 1002],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 2: ระเบียงอสุรกาย',
    weather: 'miasma'
  },
  {
    id: 1002,
    gx: 142,
    gy: 142,
    gz: -3,
    type: 'mystery_chest',
    name: 'ห้องนิรภัยวิญญาณ (Cursed Vault)',
    biome: 'abyss',
    neighbors: [1001, 1003],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 3: คลังสมบัติโบราณ',
    weather: 'miasma'
  },
  {
    id: 1003,
    gx: 144,
    gy: 142,
    gz: -3,
    type: 'dark_gate',
    name: 'แท่นบูชาเนโครแมนเซอร์ (Necromancer Altar)',
    biome: 'abyss',
    neighbors: [1002, 1004],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 4: แท่นสังเวยมืด',
    weather: 'miasma'
  },
  {
    id: 1004,
    gx: 146,
    gy: 142,
    gz: -3,
    type: 'boss',
    name: 'บัลลังก์ราชันไร้ชีพ (Crypt Lord Sanctum)',
    biome: 'abyss',
    neighbors: [1003, 1005],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 5: บัลลังก์มัลธาซาร์',
    weather: 'miasma'
  },
  {
    id: 1005,
    gx: 146,
    gy: 144,
    gz: -3,
    type: 'vault',
    name: 'มหาสมบัติสุสานหลวง (Forbidden Treasury)',
    biome: 'abyss',
    neighbors: [1004, 1006],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 6: คลังมหาสมบัติ',
    weather: 'miasma'
  },
  {
    id: 1006,
    gx: 148,
    gy: 144,
    gz: -3,
    type: 'blue',
    name: 'ประตูมิติหวนคืนสู่พื้นพิภพ (Surface Rift Portal)',
    biome: 'abyss',
    neighbors: [1005],
    realmId: 'abyss',
    realmName: 'สุสานโบราณใต้พิภพ (Catacombs of Fortuna)',
    subRegionName: 'ชั้นที่ 7: ประตูมิติทางออก',
    weather: 'miasma'
  }
];

export const DUNGEON_VOLCANO_NODES: BoardNode[] = [
  {
    id: 1100,
    gx: 160,
    gy: 140,
    gz: -3,
    type: 'church',
    name: 'ปากปล่องภูเขาไฟมังกร (Volcano Spire Entrance)',
    biome: 'volcano',
    neighbors: [1101],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 1: ปากปล่องลาวา',
    weather: 'heatwave'
  },
  {
    id: 1101,
    gx: 162,
    gy: 140,
    gz: -3,
    type: 'red',
    name: 'ทางเดินหินลาวาเดือด (Boiling Lava Path)',
    biome: 'volcano',
    neighbors: [1100, 1102],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 2: ลาวาเดือดพล่าน',
    weather: 'heatwave'
  },
  {
    id: 1102,
    gx: 162,
    gy: 142,
    gz: -3,
    type: 'mystery_chest',
    name: 'ห้องนิรภัยแมกมา (Magma Vault)',
    biome: 'volcano',
    neighbors: [1101, 1103],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 3: หีบแมกมา',
    weather: 'heatwave'
  },
  {
    id: 1103,
    gx: 164,
    gy: 142,
    gz: -3,
    type: 'dark_gate',
    name: 'แท่นบูชาเพลิงอัคคี (Flame Altar)',
    biome: 'volcano',
    neighbors: [1102, 1104],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 4: แท่นสังเวยเพลิง',
    weather: 'heatwave'
  },
  {
    id: 1104,
    gx: 166,
    gy: 142,
    gz: -3,
    type: 'boss',
    name: 'รังพญามังกรเพลิง (Ancient Drake Roost)',
    biome: 'volcano',
    neighbors: [1103, 1105],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 5: บัลลังก์มังกรอัคคี',
    weather: 'heatwave'
  },
  {
    id: 1105,
    gx: 166,
    gy: 144,
    gz: -3,
    type: 'vault',
    name: 'คลังสมบัติทองคำลาวา (Lava Treasury)',
    biome: 'volcano',
    neighbors: [1104, 1106],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 6: มหาสมบัติเพลิง',
    weather: 'heatwave'
  },
  {
    id: 1106,
    gx: 168,
    gy: 144,
    gz: -3,
    type: 'blue',
    name: 'ประตูมิติหวนคืนภูเขาไฟ (Volcano Rift Portal)',
    biome: 'volcano',
    neighbors: [1105],
    realmId: 'sunfire',
    realmName: 'หอคอยเพลิงโลกันตร์ (Volcanic Spire)',
    subRegionName: 'ชั้นที่ 7: ประตูมิติทางออก',
    weather: 'heatwave'
  }
];

export const DUNGEON_FROZEN_NODES: BoardNode[] = [
  {
    id: 1200,
    gx: 180,
    gy: 140,
    gz: -3,
    type: 'church',
    name: 'ทางเข้าเขาวงกตเยือกแข็ง (Frozen Labyrinth Entrance)',
    biome: 'snow',
    neighbors: [1201],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 1: ปากถ้ำน้ำแข็ง',
    weather: 'snow'
  },
  {
    id: 1201,
    gx: 182,
    gy: 140,
    gz: -3,
    type: 'red',
    name: 'ระเบียงผลึกน้ำแข็งพันปี (Glacial Corridor)',
    biome: 'snow',
    neighbors: [1200, 1202],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 2: ระเบียงผลึกน้ำแข็ง',
    weather: 'snow'
  },
  {
    id: 1202,
    gx: 182,
    gy: 142,
    gz: -3,
    type: 'mystery_chest',
    name: 'ห้องแช่แข็งสมบัติโบราณ (Permafrost Vault)',
    biome: 'snow',
    neighbors: [1201, 1203],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 3: หีบผลึกน้ำแข็ง',
    weather: 'snow'
  },
  {
    id: 1203,
    gx: 184,
    gy: 142,
    gz: -3,
    type: 'dark_gate',
    name: 'แท่นบูชาพายุหิมะ (Blizzard Altar)',
    biome: 'snow',
    neighbors: [1202, 1204],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 4: แท่นบูชาเหมันต์',
    weather: 'snow'
  },
  {
    id: 1204,
    gx: 186,
    gy: 142,
    gz: -3,
    type: 'boss',
    name: 'บัลลังก์เยติบรรพชน (Ancient Yeti Sanctum)',
    biome: 'snow',
    neighbors: [1203, 1205],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 5: บัลลังก์เยติยักษ์',
    weather: 'snow'
  },
  {
    id: 1205,
    gx: 186,
    gy: 144,
    gz: -3,
    type: 'vault',
    name: 'คลังมหาสมบัติผลึกน้ำแข็ง (Frost Gem Treasury)',
    biome: 'snow',
    neighbors: [1204, 1206],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 6: คลังสมบัติเหมันต์',
    weather: 'snow'
  },
  {
    id: 1206,
    gx: 188,
    gy: 144,
    gz: -3,
    type: 'blue',
    name: 'ประตูมิติหวนคืนทุ่งหิมะ (Frost Rift Portal)',
    biome: 'snow',
    neighbors: [1205],
    realmId: 'frostpeak',
    realmName: 'เขาวงกตเหมันต์ (Frozen Labyrinth)',
    subRegionName: 'ชั้นที่ 7: ประตูมิติทางออก',
    weather: 'snow'
  }
];

export class DungeonSystem {
  private returnNodes: Record<number, number> = {};
  public torchMeter: Record<number, number> = {}; // PlayerId -> torch % (0 to 100)

  ensureDungeonLoaded(game: GameState): void {
    if (!game.allNodes.some(n => n.id === 1000)) {
      game.allNodes.push(...DUNGEON_CATACOMBS_NODES);
    }
    if (!game.allNodes.some(n => n.id === 1100)) {
      game.allNodes.push(...DUNGEON_VOLCANO_NODES);
    }
    if (!game.allNodes.some(n => n.id === 1200)) {
      game.allNodes.push(...DUNGEON_FROZEN_NODES);
    }
  }

  isInDungeon(nodeId: number): boolean {
    return (nodeId >= 1000 && nodeId <= 1006) ||
           (nodeId >= 1100 && nodeId <= 1106) ||
           (nodeId >= 1200 && nodeId <= 1206);
  }

  getTorch(playerId: number): number {
    if (this.torchMeter[playerId] === undefined) {
      this.torchMeter[playerId] = 100;
    }
    return this.torchMeter[playerId];
  }

  stepTorch(player: Player): { torchPct: number; isDark: boolean; message?: string } {
    const cur = this.getTorch(player.id);
    const updated = Math.max(0, cur - 15);
    this.torchMeter[player.id] = updated;

    if (updated <= 20) {
      return {
        torchPct: updated,
        isDark: true,
        message: '🕯️ ไฟคบเพลิงริบหรี่มาก! บรรยากาศมืดมิด มอนสเตอร์ดุร้ายขึ้นเป็นสองเท่า แต่สมบัติจะมีค่าสูงสุด!'
      };
    }
    return { torchPct: updated, isDark: false };
  }

  enterDungeon(player: Player, game: GameState, preferredRealm?: string): void {
    this.ensureDungeonLoaded(game);
    this.returnNodes[player.id] = player.nodeId;
    this.torchMeter[player.id] = 100; // Reset torch on entry

    let startId = 1000;
    const r = preferredRealm || game.allNodes.find(n => n.id === player.nodeId)?.realmId;
    if (r === 'sunfire') startId = 1100;
    else if (r === 'frostpeak') startId = 1200;

    player.nodeId = startId;
    player.prevNodeId = null;
    const startNode = game.allNodes.find(n => n.id === startId)!;
    player.gridX = startNode.gx;
    player.gridY = startNode.gy;
    player.gridZ = startNode.gz;

    audio.darklingRoar();
    audio.playBiomeBgm(startNode.biome || 'abyss');
    game.addLog(
      `🌀 ${player.displayName} ดำดิ่งสู่ '${startNode.realmName}' เพื่อค้นหามหาสมบัติที่สาบสูญ! (คบเพลิง 100%)`,
      'battle'
    );
  }

  exitDungeon(player: Player, game: GameState): void {
    const returnId = this.returnNodes[player.id] ?? 0;
    delete this.returnNodes[player.id];
    delete this.torchMeter[player.id];

    const targetNode = game.allNodes.find(n => n.id === returnId) || game.allNodes[0];
    player.nodeId = targetNode.id;
    player.prevNodeId = null;
    player.gridX = targetNode.gx;
    player.gridY = targetNode.gy;
    player.gridZ = targetNode.gz;

    // Rewards for completing the crawl
    const bonusGold = 1500;
    const bonusXp = 350;
    player.gold += bonusGold;
    player.matchStats.goldEarnedTotal += bonusGold;
    player.gainXP(bonusXp);

    audio.jackpotFanfare();
    audio.playBiomeBgm(targetNode.biome || targetNode.realmId);
    game.addLog(
      `✨ ผู้พิชิตดันเจี้ยน! ${player.displayName} ทะลวงประตูมิติมืดกลับสู่ผืนพิภพสำเร็จ! ได้รับทอง +${bonusGold}G และ +${bonusXp} XP!`,
      'level'
    );
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
