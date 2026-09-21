import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';

export class TownManager {
  // Liberate town after defeating the monster
  liberateTown(townNode: BoardNode, player: Player): { goldReward: number; xpReward: number } {
    if (!townNode.townData) return { goldReward: 0, xpReward: 0 };

    townNode.townData.isOccupiedByMonster = false;
    townNode.townData.ownerId = player.id;
    player.townDeeds.push(townNode.id);
    player.townsControlled++;

    const goldReward = 150 + townNode.townData.level * 50;
    const xpReward = 80 + townNode.townData.level * 30;

    player.gold += goldReward;
    player.gainXP(xpReward);
    audio.fanfare();

    return { goldReward, xpReward };
  }

  // Invest in town to upgrade its level
  investInTown(townNode: BoardNode, player: Player): boolean {
    if (!townNode.townData) return false;
    if (townNode.townData.ownerId !== player.id) return false;
    if (townNode.townData.level >= 5) return false;

    const cost = 150 * townNode.townData.level;
    if (player.gold < cost) return false;

    player.gold -= cost;
    townNode.townData.level++;
    townNode.townData.baseValue = Math.floor(townNode.townData.baseValue * 1.5);
    townNode.townData.taxYield = Math.floor(townNode.townData.taxYield * 1.4);

    audio.levelUp();
    return true;
  }

  // Calculate toll when rival visits an owned town
  calculateToll(townNode: BoardNode): number {
    if (!townNode.townData || !townNode.townData.ownerId) return 0;
    return 30 + townNode.townData.level * 25;
  }

  // Hostile takeover: rival claims ownership of an existing player's town
  transferTownOwnership(townNode: BoardNode, newOwner: Player, previousOwner: Player | null) {
    if (!townNode.townData) return;

    if (previousOwner) {
      previousOwner.townDeeds = previousOwner.townDeeds.filter(id => id !== townNode.id);
      previousOwner.townsControlled = Math.max(0, previousOwner.townsControlled - 1);
    }

    townNode.townData.ownerId = newOwner.id;
    if (!newOwner.townDeeds.includes(townNode.id)) {
      newOwner.townDeeds.push(townNode.id);
      newOwner.townsControlled++;
    }
  }

  // Collect daily turn income from all owned towns
  collectTurnRevenue(player: Player, allNodes: BoardNode[]): number {
    let totalTax = 0;
    player.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.townData && !node.townData.isOccupiedByMonster) {
        totalTax += node.townData.taxYield;
      }
    });

    if (totalTax > 0) {
      player.gold += totalTax;
    }
    return totalTax;
  }
}

export const townManager = new TownManager();
