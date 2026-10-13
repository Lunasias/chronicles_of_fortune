import { BoardNode } from './BoardMap';
import { Player } from './Player';
import { audio } from '../engine/AudioSynthesizer';

export interface CalamityEvent {
  id: string;
  type: 'demon_incursion' | 'monster_stampede' | 'golden_goblin' | 'world_boss';
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

    // 4. Week 5 (Day 28+): Apex Ancient Dragon Ouroboros (World Boss Raid)
    if (dayCounter >= 28 && !this.triggeredCalamityIds.has('world_boss_ouroboros_1')) {
      this.triggeredCalamityIds.add('world_boss_ouroboros_1');
      return this.triggerApexDragonBoss(allNodes);
    }

    // 5. Endless/Late-Game Calamity Cycles (Every 7 days starting from Day 35)
    if (dayCounter >= 35 && dayCounter % 7 === 0 && !this.activeCalamity) {
      const cycleKey = `calamity_cycle_day_${dayCounter}`;
      if (!this.triggeredCalamityIds.has(cycleKey)) {
        this.triggeredCalamityIds.add(cycleKey);
        return this.triggerLateGameRotationalCalamity(dayCounter, weekCounter, allNodes);
      }
    }

    return null;
  }

  public isCalamityActive(): boolean {
    return this.activeCalamity !== null;
  }

  public clearActiveCalamity(): void {
    this.activeCalamity = null;
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
      headline: '⚠️ มหันตภัยระดับโลก: ขุนพลปีศาจมาลาคอร์ เข้าปิดล้อม ' + targetTown.name + '!',
      loreDescription: `ท้องฟ้าแปรเปลี่ยนเป็นสีเลือดฉาน! ขุนพลเอกแห่งจอมมาร 'มาลาคอร์' นำทัพอสูรจากอเวจีเข้าปิดล้อม ${targetTown.name}! กษัตริย์ริโก้ประกาศตั้งค่าหัว 800G และเกียรติยศสูงสุดแก่ฮีโร่ผู้ปลดปล่อยเมืองสำเร็จ!`,
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
        t.townData.monsterName = 'ฝูงอสูรคลั่งบีฮีมอธ';
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
      headline: '🚨 วิกฤตการณ์ทวีป: ฝูงสัตว์อสูรคลั่งบุกถล่ม 3 หัวเมือง!',
      loreDescription: `การอพยพอย่างบ้าคลั่งของสัตว์อสูรจากดินแดนภูเขาไฟเนเธอร์ ได้บุกเข้าโจมตีอาณาจักร! เมือง ${affectedNames.join(', ')} กำลังตกอยู่ใต้การปิดล้อมอย่างหนัก! กษัตริย์ริโก้ประกาศมอบเงินรางวัลสองเท่าแก่ผู้ปลดปล่อยเมืองในช่วงวิกฤตนี้!`,
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
      headline: '✨ เทศกาลแห่งความมั่งคั่ง: กองคาราวานก็อบลินทองคำท่องทวีป!',
      loreDescription: `มีผู้พบเห็นกองคาราวานก็อบลินทองคำผู้ร่ำรวยเดินทางข้ามทั้ง 4 ดินแดน! นักผจญภัยที่เดินตกช่องว่างจะมีโอกาสพบสมบัติเหรียญทองระยิบระยับ!`,
      bannerIcon: '💰',
      affectedTownNames: ['ทุกทวีปทั่วโลก'],
      bountyReward: 350
    };

    this.activeCalamity = calamity;
    this.calamityHistory.push(calamity.headline);
    audio.fanfare();
    return calamity;
  }

  // World Boss Apex Ancient Dragon Emergence
  public triggerApexDragonBoss(allNodes: BoardNode[]): CalamityEvent {
    // Target a castle/town or central node
    const candidateNodes = allNodes.filter(n => n.type === 'town' && (n.realmId === 'sunfire' || n.realmId === 'solaria'));
    const targetNode = candidateNodes[Math.floor(Math.random() * candidateNodes.length)] || allNodes[0];

    if (targetNode.townData) {
      targetNode.townData.isOccupiedByMonster = true;
      targetNode.townData.monsterName = 'มังกรบรรพกาล โอโรโบรอส (Apex World Boss)';
      targetNode.townData.monsterHp = 380;
      targetNode.townData.monsterMaxHp = 380;
      targetNode.townData.monsterAtk = 36;
      targetNode.townData.monsterDef = 24;
    }

    const calamity: CalamityEvent = {
      id: 'world_boss_ouroboros_1',
      type: 'world_boss',
      headline: `👑 มหันตภัยโลก: มังกรบรรพกาล 'โอโรโบรอส' ยึดครอง ${targetNode.name}!`,
      loreDescription: `ฟากฟ้ามืดมิดด้วยปีกเพลิงของมังกรบรรพกาล โอโรโบรอส (World Boss Apex)! อสูรยักษ์ได้ร่อนลงยึดครอง ${targetNode.name} อย่างเบ็ดเสร็จ! กษัตริย์ริโก้ประกาศค่าหัว 1,500G และเครื่องบรรณาการล้ำค่าแด่ผู้พิชิต!`,
      bannerIcon: '🐉',
      affectedTownNames: [targetNode.name],
      bountyReward: 1500
    };

    this.activeCalamity = calamity;
    this.calamityHistory.push(calamity.headline);
    audio.limitBreak();
    audio.playBgm('boss');
    return calamity;
  }

  // Rotational Late-game Calamities scaling with weekCounter
  private triggerLateGameRotationalCalamity(
    dayCounter: number,
    weekCounter: number,
    allNodes: BoardNode[]
  ): CalamityEvent {
    const scaleFactor = 1 + Math.min(2.5, (weekCounter - 4) * 0.2);
    const candidateTypes: Array<'demon_incursion' | 'monster_stampede' | 'golden_goblin' | 'world_boss'> = [
      'demon_incursion',
      'monster_stampede',
      'golden_goblin',
      'world_boss'
    ];
    const pickedType = candidateTypes[Math.floor(Math.random() * candidateTypes.length)];

    if (pickedType === 'golden_goblin') {
      const reward = Math.round(450 * scaleFactor);
      const calamity: CalamityEvent = {
        id: `late_golden_goblin_day_${dayCounter}`,
        type: 'golden_goblin',
        headline: `✨ เทศกาลมหาสมบัติ: กองทัพก็อบลินจักรพรรดิท่องทวีป (สัปดาห์ที่ ${weekCounter})!`,
        loreDescription: `กองคาราวานก็อบลินทองคำระดับจักรพรรดิได้หลั่งไหลเข้าสู่อาณาจักร! ทุกย่างก้าวบนช่องว่างแฝงไปด้วยขุมทรัพย์ทองคำมหาศาล!`,
        bannerIcon: '👑💰',
        affectedTownNames: ['ทุกทวีปทั่วโลก'],
        bountyReward: reward
      };
      this.activeCalamity = calamity;
      this.calamityHistory.push(calamity.headline);
      audio.fanfare();
      return calamity;
    }

    if (pickedType === 'monster_stampede') {
      const candidateTowns = allNodes.filter(n => n.type === 'town');
      const shuffled = [...candidateTowns].sort(() => Math.random() - 0.5);
      const besiegedTowns = shuffled.slice(0, 3);
      const hp = Math.round(150 * scaleFactor);
      const atk = Math.round(20 * scaleFactor);
      const def = Math.round(14 * scaleFactor);
      const reward = Math.round(750 * scaleFactor);

      besiegedTowns.forEach(t => {
        if (t.townData) {
          t.townData.isOccupiedByMonster = true;
          t.townData.monsterName = 'ฝูงคิเมร่ากลายพันธุ์คลั่ง';
          t.townData.monsterHp = hp;
          t.townData.monsterMaxHp = hp;
          t.townData.monsterAtk = atk;
          t.townData.monsterDef = def;
        }
      });

      const affectedNames = besiegedTowns.map(t => t.name);
      const calamity: CalamityEvent = {
        id: `late_stampede_day_${dayCounter}`,
        type: 'monster_stampede',
        headline: `🚨 ภัยพิบัติใหญ่: ฝูงคิเมร่ากลายพันธุ์ปิดล้อม 3 เมือง (สัปดาห์ที่ ${weekCounter})!`,
        loreDescription: `ฝูงคิเมร่าโบราณจากรอยแยกมิติเข้าปิดล้อม ${affectedNames.join(', ')}! กษัตริย์ริโก้ทรงตั้งรางวัลนำจับพิเศษ ${reward}G!`,
        bannerIcon: '🦁🔥',
        affectedTownNames: affectedNames,
        bountyReward: reward
      };
      this.activeCalamity = calamity;
      this.calamityHistory.push(calamity.headline);
      audio.playBgm('battle');
      return calamity;
    }

    if (pickedType === 'demon_incursion') {
      const candidateTowns = allNodes.filter(n => n.type === 'town');
      const targetTown = candidateTowns[Math.floor(Math.random() * candidateTowns.length)] || allNodes[4];
      const hp = Math.round(260 * scaleFactor);
      const atk = Math.round(28 * scaleFactor);
      const def = Math.round(18 * scaleFactor);
      const reward = Math.round(1000 * scaleFactor);

      if (targetTown.townData) {
        targetTown.townData.isOccupiedByMonster = true;
        targetTown.townData.monsterName = 'แม่ทัพอเวจี อาซาเซล';
        targetTown.townData.monsterHp = hp;
        targetTown.townData.monsterMaxHp = hp;
        targetTown.townData.monsterAtk = atk;
        targetTown.townData.monsterDef = def;
      }

      const calamity: CalamityEvent = {
        id: `late_demon_day_${dayCounter}`,
        type: 'demon_incursion',
        headline: `👹 กองทัพอเวจีบุก! แม่ทัพอาซาเซล ยึดครอง ${targetTown.name}!`,
        loreDescription: `ม่านหมอกสีดำทมิฬปกคลุม ${targetTown.name}! แม่ทัพอเวจีอาซาเซลเข้ายึดครองหัวเมือง! ปลดปล่อยเมืองเพื่อรับรางวัล ${reward}G!`,
        bannerIcon: '👿⚔️',
        affectedTownNames: [targetTown.name],
        bountyReward: reward
      };
      this.activeCalamity = calamity;
      this.calamityHistory.push(calamity.headline);
      audio.playBgm('boss');
      return calamity;
    }

    // Default: World Boss Titan
    const candidateNodes = allNodes.filter(n => n.type === 'town');
    const targetNode = candidateNodes[Math.floor(Math.random() * candidateNodes.length)] || allNodes[0];
    const hp = Math.round(440 * scaleFactor);
    const atk = Math.round(40 * scaleFactor);
    const def = Math.round(28 * scaleFactor);
    const reward = Math.round(1800 * scaleFactor);

    if (targetNode.townData) {
      targetNode.townData.isOccupiedByMonster = true;
      targetNode.townData.monsterName = 'ไททันโกเลมบรรพกาล อิลลิเธียม';
      targetNode.townData.monsterHp = hp;
      targetNode.townData.monsterMaxHp = hp;
      targetNode.townData.monsterAtk = atk;
      targetNode.townData.monsterDef = def;
    }

    const calamity: CalamityEvent = {
      id: `late_titan_day_${dayCounter}`,
      type: 'world_boss',
      headline: `👑 บอสโลกจุติ: ไททันบรรพกาล 'อิลลิเธียม' บดขยี้ ${targetNode.name}!`,
      loreDescription: `ผืนพิภพสั่นสะเทือนระดับแผ่นดินไหว! ไททันบรรพกาลอิลลิเธียมตื่นขึ้นและเข้ายึดครอง ${targetNode.name}! รางวัลมหาศาล ${reward}G รอคอยผู้กล้า!`,
      bannerIcon: '🗿⚡',
      affectedTownNames: [targetNode.name],
      bountyReward: reward
    };
    this.activeCalamity = calamity;
    this.calamityHistory.push(calamity.headline);
    audio.limitBreak();
    audio.playBgm('boss');
    return calamity;
  }
}

export const worldCalamitySystem = new WorldCalamitySystem();
