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

export class DungeonSystem {
  private returnNodes: Record<number, number> = {};

  ensureDungeonLoaded(game: GameState): void {
    if (!game.allNodes.some(n => n.id === 1000)) {
      game.allNodes.push(...DUNGEON_CATACOMBS_NODES);
    }
  }

  isInDungeon(nodeId: number): boolean {
    return nodeId >= 1000 && nodeId <= 1006;
  }

  enterDungeon(player: Player, game: GameState): void {
    this.ensureDungeonLoaded(game);
    this.returnNodes[player.id] = player.nodeId;

    player.nodeId = 1000;
    player.prevNodeId = null;
    const startNode = game.allNodes.find(n => n.id === 1000)!;
    player.gridX = startNode.gx;
    player.gridY = startNode.gy;
    player.gridZ = startNode.gz;

    audio.darklingRoar();
    audio.playBiomeBgm('abyss');
    game.addLog(
      `🌀 ${player.displayName} ดำดิ่งสู่ 'สุสานโบราณใต้พิภพ' (Catacombs of Fortuna) เพื่อค้นหามหาสมบัติที่สาบสูญ!`,
      'battle'
    );
  }

  exitDungeon(player: Player, game: GameState): void {
    const returnId = this.returnNodes[player.id] ?? 0;
    delete this.returnNodes[player.id];

    const targetNode = game.allNodes.find(n => n.id === returnId) || game.allNodes[0];
    player.nodeId = targetNode.id;
    player.prevNodeId = null;
    player.gridX = targetNode.gx;
    player.gridY = targetNode.gy;
    player.gridZ = targetNode.gz;

    // Rewards for completing the crawl
    const bonusGold = 1200;
    const bonusXp = 250;
    player.gold += bonusGold;
    player.matchStats.goldEarnedTotal += bonusGold;
    player.gainXP(bonusXp);

    audio.jackpotFanfare();
    audio.playBiomeBgm(targetNode.biome || targetNode.realmId);
    game.addLog(
      `✨ ผู้พิชิตสุสาน! ${player.displayName} ทะลวงประตูมิติมืดกลับสู่ผืนพิภพสำเร็จ! ได้รับทอง +${bonusGold}G และ +${bonusXp} XP!`,
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
}

export const dungeonSystem = new DungeonSystem();
