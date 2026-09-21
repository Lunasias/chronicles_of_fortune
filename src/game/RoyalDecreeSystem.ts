import { Player } from './Player';
import { BoardNode } from './BoardMap';
import { audio } from '../engine/AudioSynthesizer';

export interface RoyalDecree {
  id: string;
  title: string;
  icon: string;
  themeColor: string;
  headline: string;
  description: string;
  perkSummary: string;
  bountyTownId?: number;
  bountyRewardGold?: number;
}

export const ROYAL_DECREES: RoyalDecree[] = [
  {
    id: 'ROYAL_BOUNTY',
    title: 'THE KING\'S MONSTER BOUNTY',
    icon: '👑⚔️',
    themeColor: '#eab308',
    headline: 'King Rico decrees an emergency royal bounty!',
    description: 'A terrifying Dire Abomination has besieged an outer province! The King will award a grand bounty of 3,500G and royal honors to the adventurer who liberates the town!',
    perkSummary: 'Liberating the target town awards +3,500 Gold & Royal Honors!',
    bountyTownId: 12,
    bountyRewardGold: 3500
  },
  {
    id: 'ECONOMIC_BOOM',
    title: 'ROYAL ECONOMIC PROSPERITY',
    icon: '💰📈',
    themeColor: '#22c55e',
    headline: 'Dokapon Kingdom enters a golden economic boom!',
    description: 'Bustling trade routes and high mercantile traffic have enriched the provinces. All governed town taxes and tolls are DOUBLED throughout the entire week!',
    perkSummary: 'All town tax revenues & toll collections are increased by 100%!'
  },
  {
    id: 'BLOOD_MOON',
    title: 'THE CRIMSON BLOOD MOON',
    icon: '🩸🌑',
    themeColor: '#ef4444',
    headline: 'An ominous blood moon rises over the realm!',
    description: 'The celestial veil thins and dark creatures emerge from the abyss. Monsters encountered on Red spaces become fierce champions, yielding 2.5x EXP and guaranteed rare drops!',
    perkSummary: 'Monsters on Red tiles grant 2.5x EXP & rare treasure chests!'
  },
  {
    id: 'TAX_HOLIDAY',
    title: 'ROYAL CROWN STIMULUS',
    icon: '🪙✨',
    themeColor: '#38bdf8',
    headline: 'King Rico announces a royal treasury stimulus!',
    description: 'In celebration of the kingdom\'s prosperity, the royal treasury dispenses 250 Gold Coins directly into the coin pouches of all active adventurers!',
    perkSummary: 'Every adventurer immediately receives a 250G royal grant!'
  },
  {
    id: 'SHADY_PEDDLER',
    title: 'THE WANDERING SHADY MERCHANT',
    icon: '🧙‍♂️🎒',
    themeColor: '#a855f7',
    headline: 'A mysterious cloaked peddler visits the board!',
    description: 'Rumors spread of a hooded traveler carrying forbidden arcane spinners and forbidden dark grimoire scrolls. Seek out rare item spaces for miraculous relics!',
    perkSummary: 'Item shops & treasure chests stock rare 3-Spinners & Arcane Grimoires!'
  }
];

export class RoyalDecreeSystem {
  public activeDecree: RoyalDecree = ROYAL_DECREES[0];
  public bountyClaimed = false;

  generateWeeklyDecree(weekNumber: number, allNodes: BoardNode[], players: Player[]): RoyalDecree {
    // Pick decree rotation or random
    const idx = (weekNumber - 1) % ROYAL_DECREES.length;
    const base = ROYAL_DECREES[idx];

    // Pick a random town for bounty
    const towns = allNodes.filter(n => n.type === 'town');
    const targetTown = towns.length > 0 ? towns[Math.floor(Math.random() * towns.length)] : null;

    this.activeDecree = {
      ...base,
      bountyTownId: targetTown ? targetTown.id : 12,
      bountyRewardGold: 3000 + weekNumber * 500
    };
    this.bountyClaimed = false;

    // Apply immediate effects
    if (this.activeDecree.id === 'TAX_HOLIDAY') {
      players.forEach(p => {
        p.gold += 250;
      });
      audio.coin();
    }

    audio.fanfare();
    return this.activeDecree;
  }

  isBountyTown(nodeId: number): boolean {
    return (
      this.activeDecree.id === 'ROYAL_BOUNTY' &&
      !this.bountyClaimed &&
      this.activeDecree.bountyTownId === nodeId
    );
  }

  claimBounty(hero: Player): number {
    if (this.bountyClaimed) return 0;
    this.bountyClaimed = true;
    const reward = this.activeDecree.bountyRewardGold || 3500;
    hero.gold += reward;
    audio.fanfare();
    return reward;
  }
}

export const royalDecreeSystem = new RoyalDecreeSystem();
