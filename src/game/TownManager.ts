import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';

export class TownManager {
  // Liberate town after defeating the monster
  liberateTown(townNode: BoardNode, player: Player): { goldReward: number; xpReward: number; bountyReward: number } {
    if (!townNode.townData) return { goldReward: 0, xpReward: 0, bountyReward: 0 };

    townNode.townData.isOccupiedByMonster = false;
    townNode.townData.ownerId = player.id;
    player.townDeeds.push(townNode.id);
    player.townsControlled++;

    const goldReward = 150 + townNode.townData.level * 50;
    const xpReward = 80 + townNode.townData.level * 30;

    let bountyReward = 0;
    if (royalDecreeSystem.isBountyTown(townNode.id)) {
      bountyReward = royalDecreeSystem.claimBounty(player);
    }

    player.gold += goldReward;
    player.gainXP(xpReward);
    audio.fanfare();

    return { goldReward, xpReward, bountyReward };
  }

  // Invest in town to upgrade its level (Hamlet -> Fortress -> Citadel)
  investInTown(townNode: BoardNode, player: Player): { success: boolean; newLevel: number; tierName: string } {
    if (!townNode.townData) return { success: false, newLevel: 1, tierName: 'Hamlet' };
    if (townNode.townData.ownerId !== player.id) return { success: false, newLevel: townNode.townData.level, tierName: 'Hamlet' };
    if (townNode.townData.level >= 5) return { success: false, newLevel: townNode.townData.level, tierName: 'Grand Citadel' };

    const cost = 150 * townNode.townData.level;
    if (player.gold < cost) return { success: false, newLevel: townNode.townData.level, tierName: 'Hamlet' };

    player.gold -= cost;
    townNode.townData.level++;
    townNode.townData.baseValue = Math.floor(townNode.townData.baseValue * 1.5);
    townNode.townData.taxYield = Math.floor(townNode.townData.taxYield * 1.4);

    const newLevel = townNode.townData.level;
    let tierName = 'Hamlet';
    if (newLevel === 2) {
      tierName = 'Fortress Town';
      // Gift owner Town Specialty Potion
      player.inventory.push({
        id: 'fortress_tonic',
        name: `${townNode.name} Tonic`,
        type: 'potion',
        cost: 60,
        desc: 'Restores 80 HP & 25 MP',
        icon: '🍷'
      });
    } else if (newLevel >= 3) {
      tierName = 'Grand Citadel';
      // Gift owner Grand 3-Spinner
      player.inventory.push({
        id: 'spin_3',
        name: 'Citadel 3-Spinner',
        type: 'spinner',
        cost: 120,
        desc: 'Roll 3 dice on your next movement turn',
        icon: '🎲'
      });
    }

    audio.levelUp();
    return { success: true, newLevel, tierName };
  }

  // Calculate toll when rival visits an owned town
  calculateToll(townNode: BoardNode): number {
    if (!townNode.townData || !townNode.townData.ownerId) return 0;
    const decreeMult = royalDecreeSystem.activeDecree.id === 'ECONOMIC_BOOM' ? 2 : 1;
    const tierMult = townNode.townData.level >= 3 ? 2.0 : 1.0;
    return Math.floor((30 + townNode.townData.level * 25) * decreeMult * tierMult);
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
    const decreeMult = royalDecreeSystem.activeDecree.id === 'ECONOMIC_BOOM' ? 2.0 : 1.0;

    player.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.townData && !node.townData.isOccupiedByMonster) {
        const tierMult = node.townData.level >= 3 ? 2.0 : node.townData.level >= 2 ? 1.5 : 1.0;
        totalTax += Math.floor(node.townData.taxYield * decreeMult * tierMult);
      }
    });

    if (totalTax > 0) {
      player.gold += totalTax;
    }
    return totalTax;
  }
}

export const townManager = new TownManager();
