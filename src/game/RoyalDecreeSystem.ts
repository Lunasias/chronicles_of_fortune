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
    title: 'พระราชโองการ: ค่าหัวสัตว์อสูรหลวง',
    icon: '👑⚔️',
    themeColor: '#eab308',
    headline: 'กษัตริย์ริโก้ทรงประกาศระดมพลและตั้งค่าหัวอสูรเร่งด่วน!',
    description: 'อสูรร้ายมหึมาเข้าปิดล้อมหัวเมืองชายแดน! องค์ราชาจะพระราชทานเงินรางวัล 3,500G และเกียรติยศชั้นขุนนางแก่นักผจญภัยที่ปลดปล่อยเมืองสำเร็จ!',
    perkSummary: 'ปลดปล่อยเมืองเป้าหมายรับทอง +3,500G และเกียรติยศหลวง!',
    bountyTownId: 12,
    bountyRewardGold: 3500
  },
  {
    id: 'ECONOMIC_BOOM',
    title: 'พระราชโองการ: ยุคทองแห่งเศรษฐกิจ',
    icon: '💰📈',
    themeColor: '#22c55e',
    headline: 'อาณาจักรเข้าสู่ช่วงเวลาการค้าเฟื่องฟูสูงสุด!',
    description: 'เส้นทางการค้าคึกคักและมีพ่อค้าต่างแดนหลั่งไหลเข้ามา ภาษีเมืองและค่าผ่านทางของทุกเมืองจะเพิ่มเป็น 2 เท่าตลอดสัปดาห์!',
    perkSummary: 'รายได้ภาษีและค่าผ่านทางของทุกเมืองเพิ่มขึ้น 100%!'
  },
  {
    id: 'BLOOD_MOON',
    title: 'พระราชโองการ: ปรากฏการณ์จันทราสีเลือด',
    icon: '🩸🌑',
    themeColor: '#ef4444',
    headline: 'ดวงจันทร์สีเลือดสาดแสงลางร้ายเหนือผืนแผ่นดิน!',
    description: 'ม่านมิติแห่งความมืดบางลง มอนสเตอร์ในช่องสีแดงจะกลายเป็นอสูรชั้นสูง มอบค่าประสบการณ์ EXP 2.5 เท่า และดรอปหีบสมบัติหายากแน่นอน!',
    perkSummary: 'มอนสเตอร์ในช่องสีแดงให้ EXP 2.5 เท่า และดรอปสมบัติล้ำค่า!'
  },
  {
    id: 'TAX_HOLIDAY',
    title: 'พระราชโองการ: เงินขวัญถุงพระราชทาน',
    icon: '🪙✨',
    themeColor: '#38bdf8',
    headline: 'กษัตริย์ริโก้ทรงพระราชทานเงินอุดหนุนแก่นักผจญภัย!',
    description: 'เพื่อเฉลิมฉลองความเจริญรุ่งเรือง คลังหลวงได้แจกจ่ายเหรียญทอง 250G เข้ากระเป๋าของนักผจญภัยทุกคนทันที!',
    perkSummary: 'นักผจญภัยทุกคนได้รับเงินพระราชทาน 250G ทันที!'
  },
  {
    id: 'SHADY_PEDDLER',
    title: 'พระราชโองการ: พ่อค้าลึกลับพเนจร',
    icon: '🧙‍♂️🎒',
    themeColor: '#a855f7',
    headline: 'พ่อค้าคลุมผ้าลึกลับเดินทางมาเยือนกระดานผจญภัย!',
    description: 'มีข่าวลือเรื่องนักเดินทางลึกลับพกพาสปินเนอร์เวทมนตร์และคัมภีร์ต้องห้าม ค้นหาช่องไอเทมหายากเพื่อรับไอเทมมหัศจรรย์!',
    perkSummary: 'ร้านค้าและหีบสมบัติมีโอกาสพบ 3-Spinner และคัมภีร์เวทขั้นสูง!'
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
