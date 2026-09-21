import { Player, FoodBuff, GuildQuest } from './Player';
import { BoardNode } from './BoardMap';
import { audio } from '../engine/AudioSynthesizer';

export interface TavernMeal {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  buff: FoodBuff;
}

export interface FishingResult {
  title: string;
  desc: string;
  icon: string;
  type: 'heal' | 'gold' | 'item' | 'combat';
  healAmount?: number;
  goldAmount?: number;
  monsterName?: string;
}

export class IsekaiEventManager {
  public meals: TavernMeal[] = [
    {
      id: 'dragon_steak',
      name: 'Wild Boar & Dragon Ribs',
      desc: 'Sizzling flame-roasted ribs. Grants +5 ATK for 3 turns.',
      cost: 30,
      icon: '🍖',
      buff: {
        name: 'Dragon Vigour',
        icon: '🍖',
        turnsRemaining: 3,
        atkBoost: 5
      }
    },
    {
      id: 'mana_soup',
      name: 'Elven Herbal Stew & Mana Brioche',
      desc: 'Fragrant woodland stew. Grants +5 MAG and regenerates 15 MP per turn for 3 turns.',
      cost: 30,
      icon: '🍲',
      buff: {
        name: 'Elven Clarity',
        icon: '🍲',
        turnsRemaining: 3,
        magBoost: 5,
        mpRegen: 15
      }
    },
    {
      id: 'dwarf_stout',
      name: 'Dwarven Iron Stout & Smoked Salmon',
      desc: 'Thick mountain ale and hearty fish. Grants +5 DEF and +4 LUK for 3 turns.',
      cost: 25,
      icon: '🍺',
      buff: {
        name: 'Dwarven Fortitude',
        icon: '🍺',
        turnsRemaining: 3,
        defBoost: 5,
        lukBoost: 4
      }
    },
    {
      id: 'adventurer_sandwich',
      name: 'Ranger Honey Bacon Roll',
      desc: 'Quick trail ration. Grants +4 SPD for 3 turns and immediately restores 30 HP.',
      cost: 20,
      icon: '🥪',
      buff: {
        name: 'Ranger Swiftness',
        icon: '🥪',
        turnsRemaining: 3,
        spdBoost: 4
      }
    }
  ];

  public rumors: string[] = [
    'Old Hans swears he saw a Golden Goblin carrying sacks of doubloons across the Sunfire Desert!',
    'The priests at St. Claire Cathedral whisper that a Demon Vanguard is preparing to besiege the northern towns!',
    'The fish at Coral Bay are biting fiercely today—someone pulled up an ancient iron treasure chest yesterday!',
    'When night falls, monsters in the wild strike with fierce ferocity. Always rest at an Inn before dark!',
    'Adventurers who complete Guild Bounties earn shiny medals and permanent status in King Rico\'s court!'
  ];

  // Rest at Inn (25G)
  public restAtInn(player: Player): { success: boolean; message: string } {
    const cost = 25;
    if (player.gold < cost) {
      return { success: false, message: 'Not enough gold for a cozy room! (Needs 25G)' };
    }
    player.gold -= cost;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.rustTurns = 0;
    if (player.prank.hasGraffiti) {
      player.prank.hasGraffiti = false;
      player.prank.turnsRemaining = 0;
    }
    audio.fanfare();
    return {
      success: true,
      message: `🛌 ${player.displayName} slept soundly on a feather bed! HP and MP fully restored, and all status ailments washed away!`
    };
  }

  // Order food & dine
  public orderFood(player: Player, mealId: string): { success: boolean; message: string } {
    const meal = this.meals.find(m => m.id === mealId);
    if (!meal) return { success: false, message: 'Dish not on the menu!' };

    if (player.gold < meal.cost) {
      return { success: false, message: `Not enough gold for ${meal.name}! (Needs ${meal.cost}G)` };
    }

    player.gold -= meal.cost;
    player.foodBuff = { ...meal.buff };

    if (meal.id === 'adventurer_sandwich') {
      player.hp = Math.min(player.maxHp, player.hp + 30);
    }

    audio.levelUp();
    return {
      success: true,
      message: `🍽️ ${player.displayName} savored ${meal.name}! Gained "${meal.buff.name}" buff (${meal.desc})!`
    };
  }

  // Generate Guild Quests suitable for player's current rank
  public getAvailableGuildQuests(player: Player): GuildQuest[] {
    const rank = player.guildRank;
    const quests: GuildQuest[] = [
      {
        id: 'q_exterminate_1',
        title: 'Slime & Goblin Cleaning',
        rank: 'F',
        desc: 'Defeat 1 wild monster on the open road.',
        targetType: 'monster',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 100,
        rewardXp: 50
      },
      {
        id: 'q_patrol_town',
        title: 'Town Defense Watch',
        rank: 'E',
        desc: 'Liberate or defend any besieged town.',
        targetType: 'town',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 220,
        rewardXp: 90
      },
      {
        id: 'q_monster_hunt_2',
        title: 'Wilderness Pest Eradication',
        rank: 'D',
        desc: 'Defeat 2 wild monsters in battle.',
        targetType: 'monster',
        currentProgress: 0,
        targetCount: 2,
        rewardGold: 320,
        rewardXp: 140
      },
      {
        id: 'q_boss_bounty',
        title: 'Overlord Vanguard Bounty',
        rank: 'A',
        desc: 'Vanquish the Dragon King or a Calamity Demon General.',
        targetType: 'boss',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 850,
        rewardXp: 400
      }
    ];

    return quests;
  }

  // Accept a quest
  public acceptQuest(player: Player, quest: GuildQuest): { success: boolean; message: string } {
    player.activeGuildQuest = { ...quest };
    audio.fanfare();
    return {
      success: true,
      message: `📜 Accepted Guild Quest: [${quest.title}]! Complete it to claim ${quest.rewardGold}G and ${quest.rewardXp} XP!`
    };
  }

  // Progress quest (called on monster kill, town liberate, etc.)
  public onGameAction(player: Player, actionType: 'monster' | 'town' | 'boss'): { completed: boolean; message?: string } {
    const q = player.activeGuildQuest;
    if (!q || q.targetType !== actionType) return { completed: false };

    q.currentProgress++;
    if (q.currentProgress >= q.targetCount) {
      player.gold += q.rewardGold;
      player.gainXP(q.rewardXp);
      player.completedQuestsCount++;
      
      // Check for Guild Rank Up
      if (player.completedQuestsCount >= 5) player.guildRank = 'S';
      else if (player.completedQuestsCount >= 4) player.guildRank = 'A';
      else if (player.completedQuestsCount >= 3) player.guildRank = 'B';
      else if (player.completedQuestsCount >= 2) player.guildRank = 'C';
      else if (player.completedQuestsCount >= 1) player.guildRank = 'D';

      const rewardMsg = `🎉 GUILD QUEST COMPLETE! ${player.displayName} fulfilled [${q.title}]! (+${q.rewardGold}G, +${q.rewardXp} XP, Guild Rank: ${player.guildRank})!`;
      player.activeGuildQuest = null;
      audio.levelUp();
      return { completed: true, message: rewardMsg };
    }

    return { completed: false };
  }

  // Fishing Minigame
  public executeFishing(player: Player): FishingResult {
    const roll = Math.random();
    audio.coin();

    if (roll < 0.35) {
      const heal = 45;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      return {
        title: 'Glittering River Trout!',
        desc: `You reeled in a fat, delicious Rainbow Trout! You cooked it immediately over campfire embers (+${heal} HP).`,
        icon: '🐟',
        type: 'heal',
        healAmount: heal
      };
    } else if (roll < 0.65) {
      const gold = 75 + Math.floor(Math.random() * 85);
      player.gold += gold;
      return {
        title: 'Golden Sun Carp!',
        desc: `Incredible catch! A shimmering Golden Carp shines in your hands. Local merchants eagerly paid ${gold}G for it!`,
        icon: '✨',
        type: 'gold',
        goldAmount: gold
      };
    } else if (roll < 0.88) {
      const gold = 100 + Math.floor(Math.random() * 100);
      player.gold += gold;
      player.inventory.push({
        id: 'pot_hp_super',
        name: 'Elixir of Life',
        type: 'potion',
        cost: 65,
        desc: 'Restores 100 HP',
        icon: '🧪'
      });
      return {
        title: 'Barnacle-Encrusted Treasure Chest!',
        desc: `Your fishing line hooked a heavy iron chest buried in river silt! Pried open to find ${gold}G and a rare Elixir of Life!`,
        icon: '🎁',
        type: 'item',
        goldAmount: gold
      };
    } else {
      return {
        title: 'Aggressive River Kraken!',
        desc: `The waters churn into a foaming vortex! A ferocious River Behemoth lunges at your fishing hook! Prepare for battle!`,
        icon: '🐙',
        type: 'combat',
        monsterName: 'River Kraken'
      };
    }
  }

  // Bandit Ambush Resolution
  public resolveBanditAmbush(player: Player, choice: 'fight' | 'bribe' | 'trick'): {
    outcome: 'battle' | 'paid' | 'fled' | 'robbed';
    narration: string;
    goldChange?: number;
  } {
    if (choice === 'bribe') {
      const bribe = Math.min(player.gold, 40);
      player.gold -= bribe;
      audio.coin();
      return {
        outcome: 'paid',
        goldChange: -bribe,
        narration: `💸 ${player.displayName} tossed a purse of ${bribe}G to the bandits. The bandit chief chuckled greedily and let you pass unscathed.`
      };
    }

    if (choice === 'trick') {
      const statCheck = Math.max(player.getTotalStat('mag'), player.getTotalStat('spd'), player.getTotalStat('luk'));
      const success = statCheck >= 12 || Math.random() > 0.4;
      if (success) {
        const loot = 60 + Math.floor(Math.random() * 60);
        player.gold += loot;
        audio.fanfare();
        return {
          outcome: 'robbed',
          goldChange: loot,
          narration: `✨ GENIUS TRICKERY! ${player.displayName} cast an intimidating illusion spell! The bandits shrieked in terror and fled, dropping ${loot}G of stolen loot!`
        };
      } else {
        player.hp = Math.max(10, player.hp - 20);
        audio.hurt();
        return {
          outcome: 'battle',
          narration: `💥 The bandit chief saw through your bluff! A throwing knife grazed your shoulder (-20 HP) before drawing steel for combat!`
        };
      }
    }

    // Fight
    audio.click();
    return {
      outcome: 'battle',
      narration: `⚔️ "Draw your steel, scum!" ${player.displayName} charged into combat against Bandit Leader Garak!`
    };
  }

  // Goddess Lumina Shrine Event
  public visitGoddessShrine(player: Player): { title: string; message: string; icon: string } {
    audio.fanfare();
    const roll = Math.random();
    if (roll < 0.4) {
      player.mp = player.maxMp;
      player.hp = player.maxHp;
      return {
        title: 'Divine Radiance of Lumina',
        message: 'The celestial goddess smiles warmly upon your reincarnation journey. Full HP and MP restored!',
        icon: '✨'
      };
    } else if (roll < 0.75) {
      player.gainXP(120);
      return {
        title: 'Goddess\'s Wisdom Blessing',
        message: 'Sacred light enriches your soul! Gained +120 Adventurer XP!',
        icon: '📖'
      };
    } else {
      player.atk += 1;
      player.def += 1;
      player.mag += 1;
      return {
        title: 'Celestial Stat Attunement',
        message: 'A heavenly aura permanently infuses your body! (+1 ATK, +1 DEF, +1 MAG permanently)!',
        icon: '🌟'
      };
    }
  }
}

export const isekaiEventManager = new IsekaiEventManager();
