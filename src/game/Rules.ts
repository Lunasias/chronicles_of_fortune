import type { BoardNode } from './BoardMap';
import type { Player } from './Player';
import { WorldState } from './WorldState';
import { royalDecreeSystem } from './RoyalDecreeSystem';

export const RULES = {
  goldGoal: 12000, townGoal: 8, campaignDays: 42, blitzDays: 20, raidDays: 30,
  expeditionChest: 180, expeditionClear: 350, homeCost: 300,
  eventCooldown: 5, permanentRewardLimit: 1
};

export function encounterChance(node: BoardNode, world: WorldState): number {
  if (node.type === 'town') return node.townData?.isOccupiedByMonster ? 100 : 0;
  if (node.type === 'boss') {
    const run = world.expeditions[world.focusPlayerId];
    if (node.id >= 1000 && run?.guardians.includes(run.depth)) return 0;
    return world.mode !== 'endless_spire' && world.defeatedBosses.includes(node.id) ? 0 : 100;
  }
  if (!['empty', 'red', 'isekai_event'].includes(node.type)) return 0;
  let chance = node.type === 'red' ? 65 : node.type === 'empty' ? 25 : 15;
  if (world.timeOfDay === 'NIGHT') chance += 10;
  if (world.weatherAt(node) === 'blood_moon') chance += 15;
  chance += Math.floor(world.threat[node.realmId] / 10);
  return Math.min(90, chance);
}

export function monsterRewards(tier: number, world: WorldState, node: BoardNode, boss = false, player?: Player): { gold: number; xp: number } {
  const base = [0, 45, 85, 150, 240, 350, 500][Math.min(6, Math.max(1, tier))];
  const weather = world.weatherAt(node) === 'blood_moon' ? 1.6 : 1;
  const decreeId = typeof (royalDecreeSystem.activeDecree as any) === 'string'
    ? (royalDecreeSystem.activeDecree as unknown as string)
    : royalDecreeSystem.activeDecree?.id;
  const isBloodMoonDecree = decreeId === 'BLOOD_MOON';
  const xpDecreeMult = isBloodMoonDecree && (!node || node.type === 'red') ? 2.5 : (decreeId === 'ROYAL_FESTIVAL_HUNT' ? 2.0 : 1);
  const goldDecreeMult = decreeId === 'ROYAL_FESTIVAL_HUNT' ? 2.0 : 1;
  const midasMult = player?.relics?.includes('midas_touch') ? 1.3 : 1;
  const pace = world.matchConfig?.rewardRate ?? 1;
  return {
    gold: Math.round(base * weather * (boss ? 1.6 : 1) * goldDecreeMult * midasMult * pace),
    xp: Math.round(base * weather * (boss ? 2 : 1.2) * xpDecreeMult * pace)
  };
}
export const monsterReward = monsterRewards;

/** All ownership changes use this transaction, including liberation after an invasion. */
export function assignTown(node: BoardNode, owner: Player, players: Player[]): void {
  if (!node.townData) return;
  for (const player of players) {
    player.townDeeds = player.townDeeds.filter(id => id !== node.id);
    if (player.id === owner.id) player.townDeeds.push(node.id);
    player.townsControlled = player.townDeeds.length;
  }
  node.townData.ownerId = owner.id;
}
