import type { BoardNode, RealmId } from './BoardMap';
import type { Player } from './Player';
import { getWorld, REALMS } from './WorldState';

export interface CalamityEvent {
  id: string; type: 'demon_incursion' | 'monster_stampede' | 'golden_goblin' | 'world_boss';
  headline: string; loreDescription: string; bannerIcon: string; affectedTownNames: string[];
  bountyReward: number; affectedTownIds?: number[]; remainingTownIds?: number[];
  startedDay?: number; expiresDay?: number; realm?: RealmId;
}
export class WorldCalamitySystem {
  get activeCalamity(): CalamityEvent | null { return getWorld().calamity; }
  set activeCalamity(value: CalamityEvent | null) { getWorld().calamity = value; }
  get calamityHistory(): string[] { return getWorld().calamityHistory; }
  set calamityHistory(value: string[]) { getWorld().calamityHistory = value; }
  reset(): void { getWorld().calamity = null; getWorld().calamityHistory = []; }
  isCalamityActive(): boolean { return !!this.activeCalamity; }
  clearActiveCalamity(): void { this.activeCalamity = null; }
  checkCalamityTriggers(day: number, week: number, nodes: BoardNode[], players: Player[]): CalamityEvent | null {
    const world = getWorld();
    if (this.activeCalamity) {
      if (day <= (this.activeCalamity.expiresDay ?? day + 1)) return null;
      const expired = this.activeCalamity;
      world.calamityHistory.push('สิ้นสุดวิกฤต: ' + expired.headline);
      this.clearActiveCalamity();
      world.memory(0).flags.nextCrisisDay = day + 3;
    }
    if (day < 6 || day < (world.memory(0).flags.nextCrisisDay ?? 6)) return null;
    if (world.memory(0).flags.checkedCrisisDay === day) return null;
    world.memory(0).flags.checkedCrisisDay = day;
    const realm = [...REALMS].sort((a, b) => world.threat[b] - world.threat[a])[0];
    if (world.threat[realm] < 35) return null;
    const type = world.pick<CalamityEvent['type']>(world.threat[realm] >= 70 ? ['world_boss', 'monster_stampede'] : ['demon_incursion', 'golden_goblin']);
    return this.trigger(type, realm, day, week, nodes);
  }
  triggerApexDragonBoss(nodes: BoardNode[]): CalamityEvent {
    return this.trigger('world_boss', 'solaria', getWorld().day, Math.ceil(getWorld().day / 7), nodes);
  }
  private trigger(type: CalamityEvent['type'], realm: RealmId, day: number, week: number, nodes: BoardNode[]): CalamityEvent {
    const world = getWorld();
    const candidates = nodes.filter(n => n.type === 'town' && n.realmId === realm && !n.townData?.isOccupiedByMonster);
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(world.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const targets = shuffled.slice(0, type === 'monster_stampede' ? 3 : type === 'golden_goblin' ? 0 : 1);
    if (!targets.length && type !== 'golden_goblin') type = 'golden_goblin';
    const power = 1 + Math.min(0.8, (week - 1) * 0.08);
    for (const node of targets) {
      const td = node.townData!;
      td.isOccupiedByMonster = true;
      td.monsterName = type === 'world_boss' ? 'Apex Dragon Ouroboros' : type === 'monster_stampede' ? 'Rampaging Chimera' : 'Demon General Malakor';
      td.monsterHp = td.monsterMaxHp = Math.round((type === 'world_boss' ? 400 : 170) * power);
      td.monsterAtk = Math.round((type === 'world_boss' ? 32 : 20) * power); td.monsterDef = Math.round(15 * power);
    }
    const caravan = type === 'golden_goblin';
    if (caravan) world.memory(0).flags.caravanUntil = day + 5;
    const title = caravan ? 'คาราวานก็อบลินทองคำ' : type === 'world_boss' ? 'มังกรบรรพกาลบุกเมือง' : type === 'monster_stampede' ? 'ฝูงอสูรอพยพ' : 'กองทัพปีศาจปิดล้อม';
    const calamity: CalamityEvent = {
      id: type + '_' + day, type, realm, startedDay: day, expiresDay: day + 5,
      headline: title + ' • ' + realm,
      loreDescription: caravan ? 'พบรอยคาราวานบนเส้นทางธรรมชาติได้จนถึงวันที่ ' + (day + 5) : 'ปลดปล่อย ' + targets.map(n => n.name).join(', ') + ' ภายในวันที่ ' + (day + 5) + ' รับค่าหัวแยกแต่ละเมือง',
      bannerIcon: caravan ? '💰' : '⚔️', affectedTownNames: targets.map(n => n.name),
      affectedTownIds: targets.map(n => n.id), remainingTownIds: targets.map(n => n.id), bountyReward: caravan ? 140 : type === 'world_boss' ? 650 : 250
    };
    this.activeCalamity = calamity; world.calamityHistory.push(calamity.headline); return calamity;
  }
  claimTown(node: BoardNode, player: Player): number {
    const event = this.activeCalamity;
    if (!event?.remainingTownIds?.includes(node.id)) return 0;
    event.remainingTownIds = event.remainingTownIds.filter(id => id !== node.id);
    player.gold += event.bountyReward;
    if (!event.remainingTownIds.length) {
      if (event.realm) getWorld().threat[event.realm] = Math.max(0, getWorld().threat[event.realm] - 40);
      getWorld().memory(0).flags.nextCrisisDay = getWorld().day + 4;
      this.clearActiveCalamity();
    }
    return event.bountyReward;
  }
}
export const worldCalamitySystem = new WorldCalamitySystem();
