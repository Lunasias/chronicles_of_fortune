import { assignTown } from './Rules';
import { getWorld } from './WorldState';
import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';
import { worldCalamitySystem } from './WorldCalamitySystem';

export class TownManager {
  // Liberate town after defeating the monster
  liberateTown(townNode: BoardNode, player: Player, players: Player[] = [player]): { goldReward: number; xpReward: number; bountyReward: number } {
    if (!townNode.townData) return { goldReward: 0, xpReward: 0, bountyReward: 0 };

    townNode.townData.isOccupiedByMonster = false;
    assignTown(townNode, player, players);
    const goldReward = 80 + townNode.townData.level * 25;
    const xpReward = 80 + townNode.townData.level * 30;

    let bountyReward = 0;
    if (royalDecreeSystem.isBountyTown(townNode.id)) {
      bountyReward = royalDecreeSystem.claimBounty(player);
    }

    bountyReward += worldCalamitySystem.claimTown(townNode, player);
    getWorld().threat[townNode.realmId] = Math.max(0, getWorld().threat[townNode.realmId] - 8);

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

    const cost = 200 * townNode.townData.level;
    if (player.gold < cost) return { success: false, newLevel: townNode.townData.level, tierName: 'หมู่บ้านเล็ก' };

    player.gold -= cost;
    townNode.townData.level++;
    townNode.townData.baseValue = Math.floor(townNode.townData.baseValue * 1.2);
    townNode.townData.taxYield = Math.floor(townNode.townData.taxYield * 1.15);

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

  // Check if a town is part of an active Trade Route (player owns >= 3 towns in that realm)
  isTownInTradeRoute(townNode: BoardNode, owner: Player, allNodes: BoardNode[]): boolean {
    if (!townNode.townData || townNode.townData.ownerId !== owner.id) return false;
    const realmId = townNode.realmId;
    const count = owner.townDeeds.reduce((acc, tId) => {
      const node = allNodes.find(n => n.id === tId);
      return (node && node.type === 'town' && node.realmId === realmId) ? acc + 1 : acc;
    }, 0);
    return count >= 3;
  }

  // Get list of realm IDs where player owns 3+ towns
  getActiveTradeRoutes(player: Player, allNodes: BoardNode[]): string[] {
    const realmCounts: Record<string, number> = {};
    player.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.type === 'town') {
        realmCounts[node.realmId] = (realmCounts[node.realmId] || 0) + 1;
      }
    });
    return Object.keys(realmCounts).filter(r => realmCounts[r] >= 3);
  }

  // Calculate toll when rival visits an owned town
  calculateToll(townNode: BoardNode, visitor?: Player, allNodes?: BoardNode[], owner?: Player): number {
    if (!townNode.townData || !townNode.townData.ownerId) return 0;
    const decreeMult = royalDecreeSystem.activeDecree.id === 'ECONOMIC_BOOM' ? 2 : 1;
    const tierMult = 1 + (townNode.townData.level - 1) * 0.1;
    const specMult = townNode.townData.specialization === 'trade_port' ? 1.5 : 1.0;
    const tradeRouteMult = (allNodes && owner && this.isTownInTradeRoute(townNode, owner, allNodes)) ? 1.5 : 1.0;
    let toll = Math.floor((30 + townNode.townData.level * 25) * decreeMult * tierMult * specMult * tradeRouteMult);
    if (visitor && visitor.relics.includes('thief_band')) {
      toll = Math.floor(toll * 0.5);
    }
    return Math.round(toll * (getWorld().modifier?.tollMultiplier ?? 1));
  }

  // Set Town Specialization (Trading Port, Fortress, Mining Town)
  setSpecialization(townNode: BoardNode, player: Player, spec: 'trade_port' | 'fortress' | 'mining'): boolean {
    if (!townNode.townData || townNode.townData.ownerId !== player.id || townNode.townData.level < 3) {
      return false;
    }
    if (townNode.townData.specialization || player.gold < 200) return false;
    player.gold -= 200;
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

  // Hostile takeover: rival player pays 2x (or 3x for trade route) town base value to forcefully buy out ownership
  hostileTakeover(townNode: BoardNode, buyer: Player, currentOwner: Player, allNodes?: BoardNode[]): { success: boolean; cost: number; message: string } {
    if (!townNode.townData || townNode.townData.ownerId !== currentOwner.id) {
      return { success: false, cost: 0, message: 'เมืองนี้ไม่ได้อยู่ในการครอบครองของคู่แข่ง!' };
    }
    const isTradeRoute = allNodes ? this.isTownInTradeRoute(townNode, currentOwner, allNodes) : false;
    const multiplier = isTradeRoute ? 3 : 2;
    const cost = (townNode.townData.baseValue || 200) * multiplier;
    if (buyer.gold < cost) {
      return { success: false, cost, message: `ต้องการทอง ${cost}G เพื่อทำการฮุบกรรมสิทธิ์เมือง!${isTradeRoute ? ' (เมืองนี้อยู่ในเส้นทางการค้า ต้องใช้เงิน 3 เท่า)' : ''}` };
    }
    buyer.gold -= cost;
    currentOwner.gold += Math.floor(cost * 0.75);
    this.transferTownOwnership(townNode, buyer, currentOwner);
    audio.fanfare();
    return {
      success: true,
      cost,
      message: `🏢 ยึดกิจการสำเร็จ! ${buyer.displayName} ทุ่มเงิน ${cost}G ทำการ Hostile Takeover ฮุบเมือง ${townNode.name} จาก ${currentOwner.displayName}!${isTradeRoute ? ' (ทลายเส้นทางการค้าสำเร็จ!)' : ''}`
    };
  }

  // Collect daily turn income from all owned towns
  collectTurnRevenue(player: Player, allNodes: BoardNode[]): number {
    let totalTax = 0;
    const decreeMult = royalDecreeSystem.activeDecree.id === 'ECONOMIC_BOOM' ? 2.0 : 1.0;
    const activeTradeRoutes = this.getActiveTradeRoutes(player, allNodes);

    player.townDeeds.forEach(tId => {
      const node = allNodes.find(n => n.id === tId);
      if (node && node.townData && !node.townData.isOccupiedByMonster) {
        const tierMult = 1 + (node.townData.level - 1) * 0.1;
        let tax = Math.floor(Math.min(55, node.townData.taxYield * 0.5) * decreeMult * tierMult);
        if (node.townData.specialization === 'trade_port') tax = Math.floor(tax * 1.5);
        if (node.townData.specialization === 'mining') tax += 25;
        if (activeTradeRoutes.includes(node.realmId)) {
          tax = Math.floor(tax * 1.30); // 30% Trade Route bonus!
        }
        totalTax += Math.round(tax * (getWorld().modifier?.tollMultiplier ?? 1));
      }
    });

    // Banker's Ledger relic: 5% passive gold interest
    if (player.relics.includes('banker_ledger') && player.gold > 0) {
      const interest = Math.min(50, Math.floor(player.gold * 0.01));
      totalTax += interest;
    }

    if (totalTax > 0) {
      player.gold += totalTax;
      player.matchStats.goldEarnedTotal += totalTax;
    }
    return totalTax;
  }
}

export const townManager = new TownManager();
