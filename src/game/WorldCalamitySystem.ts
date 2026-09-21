import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';

export interface CalamityEvent {
  id: string;
  type: 'demon_incursion' | 'monster_stampede' | 'golden_goblin';
  headline: string;
  loreDescription: string;
  bannerIcon: string;
  affectedTownNames: string[];
  bountyReward: number;
}

export class WorldCalamitySystem {
  public activeCalamity: CalamityEvent | null = null;
  public calamityHistory: string[] = [];
  private triggeredCalamityIds = new Set<string>();

  // Check whether a calamity should trigger as turns and weeks advance
  public checkCalamityTriggers(
    dayCounter: number,
    weekCounter: number,
    allNodes: BoardNode[],
    players: Player[]
  ): CalamityEvent | null {
    // 1. Week 2 (Day 8-14) or Day 8: Demon General Incursion (จอมมารบุกหมู่บ้าน)
    if (dayCounter >= 8 && !this.triggeredCalamityIds.has('demon_incursion_1')) {
      this.triggeredCalamityIds.add('demon_incursion_1');
      return this.triggerDemonIncursion(allNodes);
    }

    // 2. Week 3 (Day 15-21) or Day 15: Wild Monster Stampede (ฝูงมอนสเตอร์บุกเมือง)
    if (dayCounter >= 15 && !this.triggeredCalamityIds.has('monster_stampede_1')) {
      this.triggeredCalamityIds.add('monster_stampede_1');
      return this.triggerMonsterStampede(allNodes);
    }

    // 3. Week 4 (Day 22+): Golden Goblin Migration
    if (dayCounter >= 22 && !this.triggeredCalamityIds.has('golden_goblin_1')) {
      this.triggeredCalamityIds.add('golden_goblin_1');
      return this.triggerGoldenGoblinMigration();
    }

    return null;
  }

  // Demon Lord Vanguard Incursion
  private triggerDemonIncursion(allNodes: BoardNode[]): CalamityEvent {
    // Target a major town in Solaria or Frostpeak
    const candidateTowns = allNodes.filter(n => n.type === 'town' && (n.realmId === 'solaria' || n.realmId === 'frostpeak'));
    const targetTown = candidateTowns[Math.floor(Math.random() * candidateTowns.length)] || allNodes[4];

    if (targetTown.townData) {
      targetTown.townData.isOccupiedByMonster = true;
      targetTown.townData.monsterName = 'Demon General Malakor';
      targetTown.townData.monsterHp = 220;
      targetTown.townData.monsterMaxHp = 220;
      targetTown.townData.monsterAtk = 24;
      targetTown.townData.monsterDef = 16;
    }

    const calamity: CalamityEvent = {
      id: 'demon_incursion_1',
      type: 'demon_incursion',
      headline: '⚠️ GRAND CALAMITY: DEMON GENERAL MALAKOR BESIEGES ' + targetTown.name.toUpperCase() + '!',
      loreDescription: `The sky bleeds crimson! The Overlord's dreaded commander, Demon General Malakor, has descended upon ${targetTown.name} with an abyssal legion! King Rico offers a royal bounty of 800G and eternal honor to whichever hero liberates the settlement!`,
      bannerIcon: '👹',
      affectedTownNames: [targetTown.name],
      bountyReward: 800
    };

    this.activeCalamity = calamity;
    this.calamityHistory.push(calamity.headline);
    audio.playBgm('boss');
    return calamity;
  }

  // Monster Horde Stampede
  private triggerMonsterStampede(allNodes: BoardNode[]): CalamityEvent {
    // 2 to 3 towns suddenly besieged by feral beasts!
    const candidateTowns = allNodes.filter(n => n.type === 'town');
    const shuffled = [...candidateTowns].sort(() => Math.random() - 0.5);
    const besiegedTowns = shuffled.slice(0, 3);

    besiegedTowns.forEach(t => {
      if (t.townData) {
        t.townData.isOccupiedByMonster = true;
        t.townData.monsterName = 'Feral Behemoth Pack';
        t.townData.monsterHp = 130;
        t.townData.monsterMaxHp = 130;
        t.townData.monsterAtk = 18;
        t.townData.monsterDef = 12;
      }
    });

    const affectedNames = besiegedTowns.map(t => t.name);

    const calamity: CalamityEvent = {
      id: 'monster_stampede_1',
      type: 'monster_stampede',
      headline: '🚨 CONTINENTAL CRISIS: WILD MONSTER STAMPEDE ASSAULTS 3 TOWNS!',
      loreDescription: `A ferocious migration of wild beasts from the Brimstone Wastes has swarmed across the realm! ${affectedNames.join(', ')} are currently under heavy siege! King Rico declares Double Gold Rewards for all towns liberated during this crisis!`,
      bannerIcon: '🐺',
      affectedTownNames: affectedNames,
      bountyReward: 600
    };

    this.activeCalamity = calamity;
    this.calamityHistory.push(calamity.headline);
    audio.playBgm('battle');
    return calamity;
  }

  // Golden Goblin Migration
  private triggerGoldenGoblinMigration(): CalamityEvent {
    const calamity: CalamityEvent = {
      id: 'golden_goblin_1',
      type: 'golden_goblin',
      headline: '✨ GOLDEN BOOM: GOLDEN GOBLIN CARAVAN ROAMS THE CONTINENT!',
      loreDescription: `A nomadic caravan of wealthy Golden Goblins has been sighted traveling through all four realms! Any adventurer who lands on an empty space will discover shimmering gold treasures!`,
      bannerIcon: '💰',
      affectedTownNames: ['All Realms'],
      bountyReward: 350
    };

    this.activeCalamity = calamity;
    this.calamityHistory.push(calamity.headline);
    audio.fanfare();
    return calamity;
  }
}

export const worldCalamitySystem = new WorldCalamitySystem();
