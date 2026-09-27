import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';
import { worldCalamitySystem } from './WorldCalamitySystem';

export class TownManager {
  // Liberate town after defeating the monster
  liberateTown(townNode: BoardNode, player: Player): { goldReward: number; xpReward: number; bountyReward: number } {
    if (!townNode.townData) return { goldReward: 0, xpReward: 0, bountyReward: 0 };

    townNode.townData.isOccupiedByMonster = false;
    townNode.townData.ownerId = player.id;
    if (!player.townDeeds.includes(townNode.id)) {
      player.townDeeds.push(townNode.id);
    }
    player.townsControlled = player.townDeeds.length;
    const goldReward = 150 + townNode.townData.level * 50;
    const xpReward = 80 + townNode.townData.level * 30;

    let bountyReward = 0;
    if (royalDecreeSystem.isBountyTown(townNode.id)) {
      bountyReward = royalDecreeSystem.claimBounty(player);
    }

    if (worldCalamitySystem.activeCalamity && worldCalamitySystem.activeCalamity.affectedTownNames.includes(townNode.name)) {
      const calBounty = worldCalamitySystem.activeCalamity.bountyReward;
      bountyReward += calBounty;
      worldCalamitySystem.activeCalamity = null;
    }

    player.matchStats.townsCapturedTotal++;
    player.matchStats.goldEarnedTotal += (goldReward + bountyReward);

    player.gold += goldReward;
    player.gainXP(xpReward);
    audio.fanfare();

    return { goldReward, xpReward, bountyReward };
  }

  // Invest in town to upgrade its level (Hamlet -> Fortress -> Citadel)
  investInTown(townNode: BoardNode, player: Player): { success: boolean; newLevel: number; tierName: string } {
    if (!townNode.townData) return { success: false, newLevel: 1, tierName: 'หมู่บ้านเล็ก' };
    if (townNode.townData.ownerId !== player.id) return { success: false, newLevel: townNode.townData.level, tierName: 'หมู่บ้านเล็ก' };
    if (townNode.townData.level >= 5) return { success: false, newLevel: townNode.townData.level, tierName: 'มหานคร' };

    const cost = 150 * townNode.townData.level;
    if (player.gold < cost) return { success: false, newLevel: townNode.townData.level, tierName: 'หมู่บ้านเล็ก' };

    player.gold -= cost;
    townNode.townData.level++;
    townNode.townData.baseValue = Math.floor(townNode.townData.baseValue * 1.5);
    townNode.townData.taxYield = Math.floor(townNode.townData.taxYield * 1.4);

    const newLevel = townNode.townData.level;
    let tierName = 'หมู่บ้านเล็ก';
    if (newLevel === 2) {
      tierName = 'เมือง';
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
      tierName = 'ป้อมปราการ';
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
  calculateToll(townNode: BoardNode, visitor?: Player): number {
    if (!townNode.townData || !townNode.townData.ownerId) return 0;
    const decreeMult = royalDecreeSystem.activeDecree.id === 'ECONOMIC_BOOM' ? 2 : 1;
    const tierMult = townNode.townData.level >= 3 ? 2.0 : 1.0;
    const specMult = townNode.townData.specialization === 'trade_port' ? 1.5 : 1.0;
    let toll = Math.floor((30 + townNode.townData.level * 25) * decreeMult * tierMult * specMult);
    if (visitor && visitor.relics.includes('thief_band')) {
      toll = Math.floor(toll * 0.5);
    }
    return toll;
  }

  // Set Town Specialization (Trading Port, Fortress, Mining Town)
  setSpecialization(townNode: BoardNode, player: Player, spec: 'trade_port' | 'fortress' | 'mining'): boolean {
    if (!townNode.townData || townNode.townData.ownerId !== player.id || townNode.townData.level < 3) {
      return false;
    }
    townNode.townData.specialization = spec;
    audio.levelUp();
    return true;
  }

  // Hostile takeover: rival claims ownership of an existing player's town
  transferTownOwnership(townNode: BoardNode, newOwner: Player, previousOwner: Player | null) {
    if (!townNode.townData) return;

    if (previousOwner) {
      previousOwner.townDeeds = previousOwner.townDeeds.filter(id => id !== townNode.id);
      previousOwner.townsControlled = previousOwner.townDeeds.length;
    }

    townNode.townData.ownerId = newOwner.id;
    if (!newOwner.townDeeds.includes(townNode.id)) {
      newOwner.townDeeds.push(townNode.id);
    }
    newOwner.townsControlled = newOwner.townDeeds.length;
  }

  // Collect daily turn income from all owned towns
  collectTurnRevenue(player: Player, allNodes: BoardNode[]): number {
    let totalTax = 0;
    const decreeMult = royalDecreeSystem.activeDecree.id === 'ECONOMIC_BOOM' ? 2.0 : 1.0;

    player.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.townData && !node.townData.isOccupiedByMonster) {
        const tierMult = node.townData.level >= 3 ? 2.0 : node.townData.level >= 2 ? 1.5 : 1.0;
        let tax = Math.floor(node.townData.taxYield * decreeMult * tierMult);
        if (node.townData.specialization === 'trade_port') tax = Math.floor(tax * 1.5);
        if (node.townData.specialization === 'mining') tax += 100;
        totalTax += tax;
      }
    });

    // Banker's Ledger relic: 5% passive gold interest
    if (player.relics.includes('banker_ledger') && player.gold > 0) {
      const interest = Math.floor(player.gold * 0.05);
      totalTax += interest;
    }

    if (totalTax > 0) {
      player.gold += totalTax;
    }
    return totalTax;
  }
}

export const townManager = new TownManager();
