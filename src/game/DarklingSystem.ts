import { Player } from './Player';
import { BoardNode } from './BoardMap';
import { audio } from '../engine/AudioSynthesizer';

export class DarklingSystem {
  // Check if player qualifies for Darkling transformation
  canTransform(player: Player, allPlayers: Player[], allNodes: BoardNode[]): boolean {
    if (player.isDarkling) return false;
    if (allPlayers.length < 2) return true;

    // Player is in last place by Net Worth
    const sorted = [...allPlayers].sort((a, b) => b.getNetWorth(allNodes) - a.getNetWorth(allNodes));
    const isLastPlace = sorted[sorted.length - 1].id === player.id;
    return isLastPlace;
  }

  // Execute the Demonic Pact with Overlord Rico
  acceptPact(darklingPlayer: Player, allNodes: BoardNode[]) {
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

    // Transform into The Darkling
    darklingPlayer.becomeDarkling();
    audio.darklingRoar();
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
