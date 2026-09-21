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
}

export const worldCalamitySystem = new WorldCalamitySystem();
