import { Player, FoodBuff, GuildQuest } from './Player';
import { BoardNode } from './BoardMap';
import { audio } from '../engine/AudioSynthesizer';
import { royalDecreeSystem } from './RoyalDecreeSystem';

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
      name: 'เนื้อหมูป่าย่างซี่โครงมังกรเพลิง (Dragon & Boar Ribs)',
      desc: 'ซี่โครงย่างไฟเวทมนตร์กลิ่นหอมกรุ่น ได้รับบัฟ +5 ATK นาน 3 เทิร์น',
      cost: 30,
      icon: '🍖',
      buff: {
        name: 'พลังมังกรเพลิง',
        icon: '🍖',
        turnsRemaining: 3,
        atkBoost: 5
      }
    },
    {
      id: 'mana_soup',
      name: 'สตูสมุนไพรเอลฟ์กับขนมปังมานา (Elven Herbal Stew)',
      desc: 'สตูป่าเอลฟ์กลิ่นหอมละมุน ได้รับ +5 MAG และฟื้นฟู 15 MP ต่อเทิร์น นาน 3 เทิร์น',
      cost: 30,
      icon: '🍲',
      buff: {
        name: 'จิตวิญญาณเอลฟ์',
        icon: '🍲',
        turnsRemaining: 3,
        magBoost: 5,
        mpRegen: 15
      }
    },
    {
      id: 'dwarf_stout',
      name: 'เบียร์ดำคนแคระกับแซลมอนรมควัน (Dwarven Iron Stout)',
      desc: 'เบียร์หมักยอดเขาหิมะกับปลาย่าง ได้รับ +5 DEF และ +4 LUK นาน 3 เทิร์น',
      cost: 25,
      icon: '🍺',
      buff: {
        name: 'กายาเหล็กคนแคระ',
        icon: '🍺',
        turnsRemaining: 3,
        defBoost: 5,
        lukBoost: 4
      }
    },
    {
      id: 'adventurer_sandwich',
      name: 'แซนด์วิชพรานป่าน้ำผึ้งป่า (Ranger Honey Bacon Roll)',
      desc: 'เสบียงเดินป่าสูตรเร่งด่วน ได้รับ +4 SPD นาน 3 เทิร์น และฟื้นฟู 30 HP ทันที',
      cost: 20,
      icon: '🥪',
      buff: {
        name: 'ความว่องไวพรานป่า',
        icon: '🥪',
        turnsRemaining: 3,
        spdBoost: 4
      }
    }
  ];

  public rumors: string[] = [
    'คุณตานักผจญภัยเล่าว่า เคยเห็นก็อบลินทองคำแบกถุงเงินวิ่งผ่านเนินทรายซันไฟร์!',
    'เหล่านักบวชแห่งวิหารศักดิ์สิทธิ์กระซิบว่า ทัพหน้าของจอมมารกำลังเตรียมยกทัพบุกยึดหัวเมือง!',
    'ปลาที่อ่าวปะการังช่วงนี้ชุมมาก มีคนเพิ่งตกได้หีบสมบัติโบราณใต้ท้องทะเลลึก!',
    'เมื่อราตรีมาเยือน สัตว์อสูรจะดุร้ายขึ้นเป็นทวีคูณ ควรพักผ่อนที่โรงเตี๊ยมก่อนมืดค่ำ!',
    'นักผจญภัยที่ทำเควสต์กิลด์สำเร็จจะได้รับตราเกียรติยศและเงินรางวัลตอบแทนจากพระราชา!'
  ];

  // Rest at Inn (25G)
  public restAtInn(player: Player): { success: boolean; message: string } {
    const cost = 25;
    if (player.gold < cost) {
      return { success: false, message: 'ทองไม่พอสำหรับค่าห้องพักแสนอบอุ่น! (ต้องการ 25G)' };
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
      message: `🛌 ${player.displayName} หลับสบายบนเตียงขนนกนุ่ม! HP และ MP ฟื้นฟูจนเต็มเปี่ยม พร้อมลบล้างสถานะผิดปกติทั้งหมด!`
    };
  }

  // Order food & dine
  public orderFood(player: Player, mealId: string): { success: boolean; message: string } {
    const meal = this.meals.find(m => m.id === mealId);
    if (!meal) return { success: false, message: 'เมนูนี้ไม่ได้อยู่ในรายการอาหาร!' };

    if (player.gold < meal.cost) {
      return { success: false, message: `ทองไม่พอสำหรับสั่ง ${meal.name}! (ต้องการ ${meal.cost}G)` };
    }

    player.gold -= meal.cost;
    player.foodBuff = { ...meal.buff };

    if (meal.id === 'adventurer_sandwich') {
      player.hp = Math.min(player.maxHp, player.hp + 30);
    }

    audio.levelUp();
    return {
      success: true,
      message: `🍽️ ${player.displayName} ลิ้มรส ${meal.name}! ได้รับบัฟ "${meal.buff.name}" (${meal.desc})!`
    };
  }

  // Generate Guild Quests suitable for player's current rank
  public getAvailableGuildQuests(player: Player): GuildQuest[] {
    const quests: GuildQuest[] = [
      {
        id: 'q_exterminate_1',
        title: 'กวาดล้างสไลม์และก็อบลิน',
        rank: 'F',
        desc: 'กำจัดมอนสเตอร์ในป่า 1 ตัวตามเส้นทางผจญภัย',
        targetType: 'monster',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 100,
        rewardXp: 50
      },
      {
        id: 'q_patrol_town',
        title: 'พิทักษ์เมืองจากอสูร',
        rank: 'E',
        desc: 'ปลดปล่อยหรือปกป้องเมืองที่ถูกยึดครอง 1 แห่ง',
        targetType: 'town',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 220,
        rewardXp: 90
      },
      {
        id: 'q_monster_hunt_2',
        title: 'กวาดล้างภัยคุกคามในป่าลึก',
        rank: 'D',
        desc: 'เอาชนะมอนสเตอร์ในป่า 2 ตัวในการต่อสู้',
        targetType: 'monster',
        currentProgress: 0,
        targetCount: 2,
        rewardGold: 320,
        rewardXp: 140
      },
      {
        id: 'q_boss_bounty',
        title: 'หมายจับแม่ทัพเงาแห่งจอมมาร',
        rank: 'A',
        desc: 'ปราบจอมราชันมังกร หรือแม่ทัพจอมมารมหันตภัย',
        targetType: 'boss',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 850,
        rewardXp: 400
      },
      {
        id: 'q_apex_world_boss',
        title: '👑 ค่าหัวมังกรบรรพกาล โอโรโบรอส (Apex World Boss)',
        rank: 'S',
        desc: 'กำจัดมังกรบรรพกาล หรือบอสระดับสูงสุดแห่งมิติเพื่อเกียรติยศสูงสุด',
        targetType: 'boss',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: 1500,
        rewardXp: 800
      }
    ];

    if (royalDecreeSystem.activeWantedBounty) {
      const wb = royalDecreeSystem.activeWantedBounty;
      quests.unshift({
        id: 'q_wanted_pvp',
        title: `💀 หมายจับกิลด์: ล่าจอมมาร [${wb.targetPlayerName}]!`,
        rank: 'S',
        desc: `${wb.reason} สังหารเพื่อรับค่าหัวหลวง ${wb.rewardGold}G!`,
        targetType: 'boss',
        currentProgress: 0,
        targetCount: 1,
        rewardGold: wb.rewardGold,
        rewardXp: 600
      });
    }

    return quests;
  }

  // Accept a quest
  public acceptQuest(player: Player, quest: GuildQuest): { success: boolean; message: string } {
    player.activeGuildQuest = { ...quest };
    audio.fanfare();
    return {
      success: true,
      message: `📜 รับเควสต์กิลด์: [${quest.title}] เรียบร้อยแล้ว! ทำสำเร็จจะได้รับรางวัล ${quest.rewardGold}G และ ${quest.rewardXp} XP!`
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

      const rewardMsg = `🎉 เควสต์กิลด์สำเร็จ! ${player.displayName} บรรลุเควสต์ [${q.title}]! (+${q.rewardGold}G, +${q.rewardXp} XP, แรงค์กิลด์เลื่อนเป็น: ${player.guildRank})!`;
      player.activeGuildQuest = null;
      audio.levelUp();
      return { completed: true, message: rewardMsg };
    }

    return { completed: false };
  }

  // Fishing Minigame
  public executeFishing(player: Player, accuracy?: 'perfect' | 'great' | 'miss'): FishingResult {
    audio.reelSplash();

    if (accuracy === 'perfect') {
      if (Math.random() < 0.5) {
        const gold = 260 + Math.floor(Math.random() * 80);
        player.gold += gold;
        player.maxHp += 10;
        player.hp = Math.min(player.maxHp, player.hp + 20);
        return {
          title: '✨ มังกรเกล็ดทองคำแห่งแม่น้ำโบราณ! (PERFECT CATCH)',
          desc: `จังหวะดึงสายเบ็ดสมบูรณ์แบบ! คุณดึงปลามังกรทองในตำนานขึ้นมา พลังชีวิตสูงสุด +10 Max HP และขายเกล็ดมังกรได้ +${gold}G!`,
          icon: '🐉',
          type: 'gold',
          goldAmount: gold
        };
      } else {
        const gold = 200 + Math.floor(Math.random() * 60);
        player.gold += gold;
        player.inventory.push({
          id: 'pot_hp_super',
          name: 'น้ำทิพย์ชุบชีวิต (Elixir of Life)',
          type: 'potion',
          cost: 65,
          desc: 'ฟื้นฟู 100 HP ทันที',
          icon: '🧪'
        });
        return {
          title: '💎 หีบศิลาจารึกสมบัติราชวงศ์! (PERFECT CATCH)',
          desc: `วัดคันเบ็ดแม่นยำไร้ที่ติ! ดึงหีบศิลาประดับอัญมณีขึ้นจากก้นธารน้ำ ได้รับทองคำ +${gold}G และน้ำทิพย์ชุบชีวิต 1 ขวด!`,
          icon: '🎁',
          type: 'item',
          goldAmount: gold
        };
      }
    } else if (accuracy === 'great') {
      if (Math.random() < 0.5) {
        const gold = 100 + Math.floor(Math.random() * 50);
        player.gold += gold;
        return {
          title: 'ปลาคาร์ปทองคำนำโชค! (GREAT CATCH)',
          desc: `วัดเบ็ดได้จังหวะดีเยี่ยม! ปลาคาร์ปสีทองกระโดดขึ้นเหนือน้ำ พ่อค้ารับซื้อทันที +${gold}G!`,
          icon: '✨',
          type: 'gold',
          goldAmount: gold
        };
      } else {
        const heal = 60;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        return {
          title: 'ปลาเทราต์สายรุ้งประกายแสง! (GREAT CATCH)',
          desc: `คุณตกได้ปลาเทราต์ตัวอ้วนสมบูรณ์! ย่างไฟกินสดๆ ริมธารน้ำ ฟื้นฟูพลังชีวิต (+${heal} HP)`,
          icon: '🐟',
          type: 'heal',
          healAmount: heal
        };
      }
    } else if (accuracy === 'miss') {
      if (Math.random() < 0.6) {
        const gold = 5;
        player.gold += gold;
        return {
          title: 'รองเท้าบูทหนังเก่าขาดรุ่งริ่ง... (MISS)',
          desc: `ดึงสายเบ็ดเร็วหรือช้าเกินไป! สิ่งที่ติดขึ้นมาคือรองเท้าบูทเปียกโชก ขายให้ร้านรับซื้อของเก่าได้เพียง +${gold}G`,
          icon: '👢',
          type: 'gold',
          goldAmount: gold
        };
      } else {
        return {
          title: 'สาวคราเคนแม่น้ำจอมดุร้าย! (DANGER)',
          desc: `กระตุกสายเบ็ดผิดจังหวะจนทำให้สัตว์ร้ายใต้ผิวน้ำตื่นตระหนก! สาวคราเคนหนวดปลาหมึกยักษ์โผล่มาจู่โจม!`,
          icon: '🐙',
          type: 'combat',
          monsterName: 'River Kraken Maiden'
        };
      }
    }

    const roll = Math.random();
    if (roll < 0.35) {
      const heal = 45;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      return {
        title: 'ปลาเทราต์สายรุ้งประกายแสง!',
        desc: `คุณตกได้ปลาเทราต์ตัวอ้วนสมบูรณ์! ย่างไฟกินสดๆ ริมแม่น้ำ ฟื้นฟูพลังชีวิต (+${heal} HP)`,
        icon: '🐟',
        type: 'heal',
        healAmount: heal
      };
    } else if (roll < 0.65) {
      const gold = 75 + Math.floor(Math.random() * 85);
      player.gold += gold;
      return {
        title: 'ปลาคาร์ปทองคำนำโชค!',
        desc: `ปลาคาร์ปสีทองประกายระยิบระยับ! พ่อค้าในเมืองขอรับซื้อทันทีด้วยราคาสูงถึง ${gold}G!`,
        icon: '✨',
        type: 'gold',
        goldAmount: gold
      };
    } else if (roll < 0.88) {
      const gold = 100 + Math.floor(Math.random() * 100);
      player.gold += gold;
      player.inventory.push({
        id: 'pot_hp_super',
        name: 'น้ำทิพย์ชุบชีวิต (Elixir of Life)',
        type: 'potion',
        cost: 65,
        desc: 'ฟื้นฟู 100 HP ทันที',
        icon: '🧪'
      });
      return {
        title: 'หีบสมบัติเหล็กโบราณใต้บาดาล!',
        desc: `เบ็ดของคุณเกี่ยวติดหีบสมบัติโบราณขึ้นมา! เมื่อเปิดออกพบทองคำ ${gold}G และน้ำทิพย์ชุบชีวิต 1 ขวด!`,
        icon: '🎁',
        type: 'item',
        goldAmount: gold
      };
    } else {
      return {
        title: 'สาวคราเคนแม่น้ำจอมดุร้าย!',
        desc: `ผิวน้ำหมุนวนเป็นคลื่นยักษ์! สาวคราเคนหนวดปลาหมึกยักษ์โผล่ขึ้นมาจู่โจมเบ็ดของคุณ! เตรียมพร้อมสู้ศึก!`,
        icon: '🐙',
        type: 'combat',
        monsterName: 'River Kraken Maiden'
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
        narration: `💸 ${player.displayName} โยนถุงเงิน ${bribe}G ให้พวกโจร หัวหน้าโจรหัวเราะอย่างพอใจแล้วยอมเปิดทางให้ผ่านไปอย่างปลอดภัย`
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
          narration: `✨ กลอุบายเวทมนตร์แยบยล! ${player.displayName} ร่ายภาพลวงตามังกรยักษ์ข่มขวัญ! พวกโจรตกใจกรีดร้องวิ่งหนีเตลิด ทำถุงทองตกไว้ ${loot}G!`
        };
      } else {
        player.hp = Math.max(10, player.hp - 20);
        audio.hurt();
        return {
          outcome: 'battle',
          narration: `💥 หัวหน้าโจรจับไต๋ได้! มีดบินพุ่งเฉียดไหล่ของคุณ (-20 HP) ก่อนที่พวกมันจะชักดาบกรูเข้ามาสู้รบ!`
        };
      }
    }

    // Fight
    audio.click();
    return {
      outcome: 'battle',
      narration: `⚔️ "ชักดาบออกมา เจ้าพวกโจรหน้าโง่!" ${player.displayName} พุ่งเข้าประจันหน้ากับหัวหน้ากองโจรการัค!`
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
        title: 'แสงศักดิ์สิทธิ์แห่งเทพธิดาลูมินา',
        message: 'เทพธิดาแห่งแสงสว่างยิ้มต้อนรับและประสาทพร ฟื้นฟู HP และ MP จนเต็มเปี่ยม!',
        icon: '✨'
      };
    } else if (roll < 0.75) {
      player.gainXP(120);
      return {
        title: 'พรแห่งปัญญาญาณเทพธิดา',
        message: 'แสงศักดิ์สิทธิ์ชำระล้างดวงวิญญาณ ได้รับค่าประสบการณ์นักผจญภัย +120 XP!',
        icon: '📖'
      };
    } else {
      player.atk += 1;
      player.def += 1;
      player.mag += 1;
      return {
        title: 'การตื่นรู้แห่งพลังดวงดารา',
        message: 'ออร่าแห่งสรวงสวรรค์ซึมซาบเข้าสู่ร่างกายอย่างถาวร! (+1 ATK, +1 DEF, +1 MAG ถาวร)!',
        icon: '🌟'
      };
    }
  }

  // Guild Fortune Casino Mini-Game
  public playCasino(player: Player, bet = 50): {
    outcome: 'jackpot' | 'win_gold' | 'win_spell' | 'win_buff' | 'lose' | 'prank';
    title: string;
    message: string;
    goldChange: number;
    icon: string;
  } {
    if (player.gold < bet) {
      return {
        outcome: 'lose',
        title: 'ทองไม่เพียงพอ',
        message: `เจ้ามีทองไม่พอสำหรับเดิมพัน (${bet}G)!`,
        goldChange: 0,
        icon: '⚠️'
      };
    }

    player.gold -= bet;
    const roll = Math.random();

    if (roll < 0.12) {
      // 12% Jackpot: 6x bet!
      const prize = bet * 6;
      player.gold += prize;
      player.matchStats.goldEarnedTotal += prize;
      audio.jackpotFanfare();
      return {
        outcome: 'jackpot',
        title: '💥 มหาแจ็กพอตแตกกระจาย! 💥',
        message: `ดวงมหาเศรษฐีจุติ! วงล้อหยุดที่ช่องแจ็กพอตราชา รับรางวัลมหาศาล +${prize}G!`,
        goldChange: prize - bet,
        icon: '👑'
      };
    } else if (roll < 0.40) {
      // 28% Double Gold: 2x bet
      const prize = bet * 2;
      player.gold += prize;
      player.matchStats.goldEarnedTotal += prize;
      audio.coin();
      return {
        outcome: 'win_gold',
        title: '🎉 ชนะรางวัลเหรียญทอง!',
        message: `วงล้อหยุดที่ถุงทองคำ รับเงินรางวัล 2 เท่า +${prize}G!`,
        goldChange: prize - bet,
        icon: '💰'
      };
    } else if (roll < 0.60) {
      // 20% Magic Spell
      const spells = ['zap', 'swap', 'holy_sanctuary', 'tax_audit', 'curse_rust'];
      const wonSpell = spells[Math.floor(Math.random() * spells.length)];
      if (!player.fieldSpells.includes(wonSpell)) {
        player.fieldSpells.push(wonSpell);
      }
      audio.chestOpen();
      return {
        outcome: 'win_spell',
        title: '✨ ได้รับคัมภีร์เวทมนตร์!',
        message: `วงล้อหยุดที่คัมภีร์เวทมนตร์โบราณ! ได้รับคาถา ${wonSpell.toUpperCase()} เข้าสู่คลังเวท!`,
        goldChange: -bet,
        icon: '📜'
      };
    } else if (roll < 0.76) {
      // 16% Food Buff
      player.foodBuff = {
        name: 'สเต๊กนำโชคกาสิโน',
        icon: '🥩',
        turnsRemaining: 3,
        atkBoost: 4,
        lukBoost: 6
      };
      audio.levelUpFanfare();
      return {
        outcome: 'win_buff',
        title: '🍖 รางวัลอาหารนำโชค!',
        message: `ได้รับสเต๊กนำโชคกาสิโนกลิ่นหอมกรุ่น! (+4 ATK, +6 LUK นาน 3 เทิร์น)!`,
        goldChange: -bet,
        icon: '🍖'
      };
    } else if (roll < 0.90) {
      // 14% Lose
      audio.defeat();
      return {
        outcome: 'lose',
        title: '💀 แต้มบอด! เสียเดิมพัน',
        message: `วงล้อหยุดที่กระดูกหัวกะโหลก! เจ้ามือหัวเราะร่าและริบเงินเดิมพัน ${bet}G ของคุณไป!`,
        goldChange: -bet,
        icon: '💀'
      };
    } else {
      // 10% Prank smoke bomb
      player.prank = {
        hasGraffiti: true,
        turnsRemaining: 3,
        sillyName: 'ผีพนันหน้าเปื้อน'
      };
      audio.hurt();
      return {
        outcome: 'prank',
        title: '🤪 ระเบิดสีตลกโป๊งชึ่ง!',
        message: `วงล้อหมุนแรงจนกลไกดีดระเบิดเขม่าควันใส่หน้า! ได้รับฉายา "ผีพนันหน้าเปื้อน" นาน 3 เทิร์น!`,
        goldChange: -bet,
        icon: '💣'
      };
    }
  }
}

export const isekaiEventManager = new IsekaiEventManager();
