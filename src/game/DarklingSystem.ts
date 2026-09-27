import { Player } from './Player';
import { BoardNode } from './BoardMap';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';

export class DarklingSystem {
  // Check if player qualifies for Darkling transformation
  canTransform(player: Player, allPlayers: Player[], allNodes: BoardNode[]): boolean {
    if (player.isDarkling) return false;
    if (allPlayers.length < 2) return false;

    // Player must be strictly in last place and trailing the leader by at least 400G
    const sorted = [...allPlayers].sort((a, b) => b.getNetWorth(allNodes) - a.getNetWorth(allNodes));
    const leaderWorth = sorted[0].getNetWorth(allNodes);
    const playerWorth = player.getNetWorth(allNodes);

    // Prevent turn 1 Darkling when all players are tied with starter gold
    if (leaderWorth === playerWorth || leaderWorth - playerWorth < 400) {
      return false;
    }

    const isLastPlace = sorted[sorted.length - 1].id === player.id;
    return isLastPlace;
  }

  // Execute the Demonic Pact with Overlord Rico
  acceptPact(darklingPlayer: Player, allNodes: BoardNode[], spec: 'destroyer' | 'reaper' | 'tormentor' = 'destroyer') {
    // Sacrifice everything
    darklingPlayer.gold = 0;
    darklingPlayer.inventory = [];

    // Relinquish all owned towns back to neutral
    darklingPlayer.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.townData) {
        node.townData.ownerId = null;
        node.townData.isOccupiedByMonster = true;
      }
    });
    darklingPlayer.townDeeds = [];
    darklingPlayer.townsControlled = 0;

    // Set specialization
    darklingPlayer.darklingSpecialization = spec;

    // Transform into The Darkling
    darklingPlayer.becomeDarkling();

    // Grant apocalyptic Darkling spells according to specialization
    if (spec === 'reaper') {
      darklingPlayer.fieldSpells = ['dark_calamity', 'swap', 'assassin_hit'];
      darklingPlayer.atk += 15;
    } else if (spec === 'tormentor') {
      darklingPlayer.fieldSpells = ['dark_plague', 'curse_rust', 'poison_dart'];
      darklingPlayer.mag += 15;
    } else {
      darklingPlayer.fieldSpells = ['dark_calamity', 'dark_plague', 'swap'];
      darklingPlayer.maxHp += 100;
      darklingPlayer.hp += 100;
    }

    // Issue Royal Wanted Bounty for Darkling hunter rewards
    royalDecreeSystem.issueWantedBounty(
      darklingPlayer,
      3500,
      `กลายร่างเป็น Darkling (${spec.toUpperCase()}) ผู้ทำลายล้างอาณาจักร! สังหารเพื่อรับค่าหัวหลวง!`
    );

    audio.darklingRoar();
    audio.playBgm('darkling');
  }

  // Holy Exorcism at Church: donate gold to cleanse Darkling
  performExorcism(sponsorPlayer: Player, darklingPlayer: Player): { success: boolean; turnsReduced: number; message: string } {
    if (!darklingPlayer.isDarkling || darklingPlayer.darklingTurnsLeft <= 0) {
      return { success: false, turnsReduced: 0, message: 'ไม่มีจอมมาร Darkling ในอาณาจักรขณะนี้!' };
    }

    const cost = 250;
    if (sponsorPlayer.gold < cost) {
      return { success: false, turnsReduced: 0, message: `ต้องการเงินบริจาค ${cost}G เพื่อทำพิธีกรรมศักดิ์สิทธิ์!` };
    }

    sponsorPlayer.gold -= cost;
    const reduced = Math.min(2, darklingPlayer.darklingTurnsLeft);
    darklingPlayer.darklingTurnsLeft -= reduced;

    audio.relicChime();

    if (darklingPlayer.darklingTurnsLeft <= 0) {
      darklingPlayer.revertDarkling();
      audio.jackpotFanfare();
      return {
        success: true,
        turnsReduced: reduced,
        message: `🕊️ มหาปาฏิหาริย์แห่งแสง! พิธีขับไล่ของ ${sponsorPlayer.displayName} ชำระล้างจิตมารสำเร็จ! ${darklingPlayer.name} คืนร่างสู่ปกติแล้ว!`
      };
    }

    return {
      success: true,
      turnsReduced: reduced,
      message: `✨ พิธีกรรมศักดิ์สิทธิ์สัมฤทธิผล! พลังมารของ ${darklingPlayer.name} ลดทอนลง ${reduced} เทิร์น! (เหลืออีก ${darklingPlayer.darklingTurnsLeft} เทิร์น)`
    };
  }

  // Calamity 1: Summon Monsters to re-occupy opponents' towns
  castSummonInvaders(darklingPlayer: Player, allNodes: BoardNode[], allPlayers: Player[]): string {
    let townsOccupied = 0;
    allNodes.forEach(node => {
      if (node.type === 'town' && node.townData && node.townData.ownerId !== null) {
        const victim = allPlayers.find(p => p.id === node.townData!.ownerId);
        if (victim && victim.id !== darklingPlayer.id) {
          node.townData.isOccupiedByMonster = true;
          townsOccupied++;
        }
      }
    });

    audio.darklingRoar();
    return `😈 DARKLING CALAMITY! Fierce monsters invaded ${townsOccupied} towns, stripping them from rivals!`;
  }

  // Calamity 2: Plague of Pestilence (strips gold and damages rivals)
  castGlobalPlague(darklingPlayer: Player, allPlayers: Player[]): string {
    let totalPlundered = 0;
    allPlayers.forEach(p => {
      if (p.id !== darklingPlayer.id) {
        const stolen = Math.floor(p.gold * 0.4);
        p.gold -= stolen;
        p.hp = Math.max(10, Math.floor(p.hp * 0.7));
        totalPlundered += stolen;
      }
    });

    darklingPlayer.gold += totalPlundered;
    audio.darklingRoar();
    return `💀 GLOBAL PLAGUE! All rivals lost 30% HP and forfeited a combined ${totalPlundered}G to the Darkling!`;
  }

  // Calamity 3: Demon Warp to richest rival
  castDemonWarp(darklingPlayer: Player, allPlayers: Player[], allNodes: BoardNode[]): { message: string; targetNodeId: number } {
    const sorted = [...allPlayers].filter(p => p.id !== darklingPlayer.id).sort((a, b) => b.getNetWorth(allNodes) - a.getNetWorth(allNodes));
    const targetPlayer = sorted[0];

    if (!targetPlayer) {
      return { message: 'No rivals to target!', targetNodeId: darklingPlayer.nodeId };
    }

    // Warp to adjacent or same node
    darklingPlayer.nodeId = targetPlayer.nodeId;
    const node = allNodes.find(n => n.id === targetPlayer.nodeId) || allNodes[0];
    darklingPlayer.gridX = node.gx;
    darklingPlayer.gridY = node.gy;
    darklingPlayer.gridZ = node.gz;

    audio.darklingRoar();
    return {
      message: `⚡ DEMON WARP! The Darkling teleported right beside ${targetPlayer.name} to hunt them down!`,
      targetNodeId: node.id
    };
  }
}

export const darklingSystem = new DarklingSystem();
