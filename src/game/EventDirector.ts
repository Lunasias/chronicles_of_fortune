import { Player, CompanionData } from './Player';
import type { BoardNode, BiomeType } from './BoardMap';
import { createCompanion } from './CompanionDatabase';
import { getWorld, bindWorld, WorldState } from './WorldState';
import { RULES } from './Rules';

export interface FantasyEventOutcome {
  outcomeTitle: string; outcomeText: string; icon: string;
  soundType: 'fanfare' | 'coin' | 'level' | 'hurt' | 'magic';
  goldChange?: number; hpChange?: number; mpChange?: number; companionRecruited?: CompanionData;
}
export interface FantasyChoice {
  text: string; subtext: string; icon: string; cost?: number;
  utility?: (player: Player) => number;
  requires?: (player: Player) => boolean;
  resolve: (player: Player, node: BoardNode) => FantasyEventOutcome;
}
interface Context { player?: Player; node: BoardNode; world: WorldState; }
export interface FantasyEventData {
  id: string; category: string; title: string; subtitle: string; icon: string; badge: string;
  description: string; bannerColor: string; choices: FantasyChoice[];
  weight?: number; cooldown?: number; once?: boolean; condition?: (context: Context) => boolean;
  actionType?: 'open_weapon_shop' | 'open_magic_shop' | 'open_item_shop' | 'open_guild' | 'open_fishing';
}
const outcome = (title: string, text: string, icon = '✨'): FantasyEventOutcome => ({ outcomeTitle: title, outcomeText: text, icon, soundType: 'coin' });
const heal = (player: Player, amount: number): number => {
  const value = Math.min(player.maxHp - player.hp, amount); player.hp += value; return value;
};
const gain = (player: Player, amount: number): void => { player.gold += amount; player.matchStats.goldEarnedTotal += amount; };
const leave = (): FantasyChoice => ({ text: 'เดินทางต่อ', subtext: 'ไม่รับความเสี่ยง ไม่เสียค่าใช้จ่าย', icon: '👣', utility: () => 1, resolve: () => outcome('ออกเดินทาง', 'คุณจดจำสถานที่นี้ไว้ แล้วเดินทางต่ออย่างปลอดภัย') });
const event = (id: string, category: string, title: string, description: string, choices: FantasyChoice[], extra: Partial<FantasyEventData> = {}): FantasyEventData => ({
  id, category, title, description, subtitle: 'บันทึกการเดินทาง', icon: '🧭', badge: 'เรื่องราวระหว่างทาง', bannerColor: '#38bdf8', choices: [...choices, leave()], weight: 1, cooldown: RULES.eventCooldown, ...extra
});

const BIOMES: Record<BiomeType, { place: string; find: string; danger: string; companion?: string }> = {
  grass: { place: 'ทุ่งหญ้า', find: 'สมุนไพรริมทาง', danger: 'ฝูงหมาป่า' },
  forest: { place: 'ป่าลึก', find: 'เห็ดเรืองแสง', danger: 'เถาวัลย์มีชีวิต' },
  waterfall_forest: { place: 'ป่าน้ำตก', find: 'ผลึกหลังม่านน้ำ', danger: 'กระแสน้ำเชี่ยว' },
  snow: { place: 'ยอดเขาหิมะ', find: 'แร่เหมันต์', danger: 'หิมะถล่ม' },
  desert: { place: 'ทะเลทราย', find: 'เหรียญใต้ซากคาราวาน', danger: 'หลุมทรายดูด' },
  volcano: { place: 'ภูเขาไฟ', find: 'ออบซิเดียนอุ่น', danger: 'รอยแยกลาวา' },
  cavern: { place: 'ถ้ำหิน', find: 'แร่เงิน', danger: 'ทางเดินทรุดตัว' },
  coral: { place: 'ชายฝั่งปะการัง', find: 'ไข่มุกน้ำตื้น', danger: 'คลื่นย้อนกลับ' },
  abyss: { place: 'หุบเหว', find: 'เศษศิลาเงา', danger: 'หมอกกลืนวิญญาณ' },
  castle: { place: 'เขตราชธานี', find: 'ตราหลวงสูญหาย', danger: 'สายลับปลอมตัว' },
  fairy_grove: { place: 'ป่าแฟรี่', find: 'ละอองปีกแฟรี่', danger: 'วงแหวนหลงทาง' },
  crystal_cavern: { place: 'ถ้ำคริสตัล', find: 'ผลึกสะท้อนเสียง', danger: 'ผลึกแตกร้าว' },
  celestial: { place: 'แดนสวรรค์', find: 'สะเก็ดดาว', danger: 'สะพานเมฆแตก' },
  steampunk: { place: 'นครเครื่องจักร', find: 'เฟืองโบราณ', danger: 'ท่อไอน้ำระเบิด' },
  sakura_shrine: { place: 'ศาลเจ้าซากุระ', find: 'เครื่องรางหล่นหาย', danger: 'วิญญาณหลอกทาง' }
};

function regionalEvents(): FantasyEventData[] {
  return (Object.entries(BIOMES) as [BiomeType, typeof BIOMES[BiomeType]][]).flatMap(([biome, lore]) => {
    const condition = ({ node }: Context) => node.biome === biome && !['shop_weapon', 'shop_magic', 'shop_item', 'guild', 'church', 'tavern', 'fishing'].includes(node.type);
    return [
      event(`${biome}_forage`, biome, `ร่องรอยใน${lore.place}`, `คุณพบ${lore.find}ใกล้ทางเดิน แต่บริเวณนี้มี${lore.danger} เลือกเก็บเท่าที่ปลอดภัยหรือเสี่ยงเข้าไปลึกกว่าเดิม`, [
        { text: 'เก็บอย่างระมัดระวัง', subtext: 'รับ 30G และฟื้น HP 10', icon: '🌿', utility: p => 5 + (p.maxHp - p.hp) / 10, resolve: p => { gain(p, 30); const h = heal(p, 10); return { ...outcome('เก็บเสบียงสำเร็จ', `คุณเก็บ${lore.find}มาขาย +30G และพักฟื้น ${h} HP`), goldChange: 30, hpChange: h }; } },
        { text: 'สำรวจจุดอันตราย', subtext: 'ใช้ SPD ตรวจสอบ: สำเร็จรับ 95G และ 35 EXP; พลาดเสีย HP 15%', icon: '⛏️', utility: p => p.hp > p.maxHp * 0.65 ? 7 : -5, resolve: p => {
          const success = getWorld().random() < Math.min(0.9, 0.45 + p.getTotalStat('spd') * 0.012);
          if (success) { gain(p, 95); p.gainXP(35); return outcome('ค้นพบแหล่งทรัพยากร', `คุณผ่าน${lore.danger} ได้รับ 95G และ 35 EXP`); }
          const damage = Math.min(p.hp - 1, Math.ceil(p.maxHp * 0.15)); p.hp -= damage; return { ...outcome('ถอยจากอันตราย', `${lore.danger}ทำให้คุณบาดเจ็บ ${damage} HP`, '🩹'), hpChange: -damage, soundType: 'hurt' };
        } }
      ], { condition }),
      event(`${biome}_traveler`, biome, `นักเดินทางหลงทางใน${lore.place}`, `นักเดินทางขอให้ช่วยหาเส้นทางหลบ${lore.danger} หากคุณช่วยไว้ เขาจะกลับมาตอบแทนเมื่อถึงที่หมาย`, [
        { text: 'แบ่งเสบียงและบอกทาง', subtext: 'จ่าย 25G; เปิดเรื่องราวติดตามผลในภายหลัง', icon: '🤝', cost: 25, utility: p => p.gold > 100 ? 8 : -2, resolve: p => { getWorld().memory(p.id).flags[`helped_${biome}`] = getWorld().day; getWorld().threat[getWorld().focusRealm] = Math.max(0, getWorld().threat[getWorld().focusRealm] - 5); return outcome('สัญญาของนักเดินทาง', 'เขารับเสบียงและจดชื่อคุณไว้ คุณอาจได้พบกันอีกครั้ง'); } },
        { text: 'สอนทักษะเอาตัวรอด', subtext: 'รับ 25 EXP และลดภัยประจำพื้นที่ 3', icon: '📖', utility: () => 4, resolve: p => { p.gainXP(25); const w = getWorld(); w.threat[w.focusRealm] = Math.max(0, w.threat[w.focusRealm] - 3); return outcome('ทางเดินปลอดภัยขึ้น', 'นักเดินทางช่วยส่งข่าวอันตรายให้คนอื่น +25 EXP'); } }
      ], { condition, cooldown: 8 }),
      event(`${biome}_return`, biome, `คำสัญญาจาก${lore.place}`, 'นักเดินทางที่คุณเคยช่วยกลับมาพร้อมสินค้าจากปลายทาง เขาจำการช่วยเหลือครั้งนั้นได้', [
        { text: 'รับของตอบแทน', subtext: 'รับ 120G และ 40 EXP; รับได้ครั้งเดียว', icon: '🎁', utility: () => 20, resolve: p => { gain(p, 120); p.gainXP(40); return outcome('มิตรภาพผลิดอก', 'ความช่วยเหลือของคุณทำให้เขากลับบ้านสำเร็จ +120G และ 40 EXP'); } },
        { text: 'ขอให้เขาช่วยชุมชนแทน', subtext: 'ลดภัยประจำพื้นที่ 20 และรับ 70 EXP', icon: '🏘️', utility: () => 10, resolve: p => { const w = getWorld(); w.threat[w.focusRealm] = Math.max(0, w.threat[w.focusRealm] - 20); p.gainXP(70); return outcome('เสบียงถึงชุมชน', 'คาราวานช่วยให้ชาวเมืองตั้งหลักได้ ภัยลดลง 20 และได้รับ 70 EXP'); } }
      ], { condition: c => condition(c) && !!c.player && c.world.memory(c.player.id).flags[`helped_${biome}`] !== undefined && c.world.day >= c.world.memory(c.player.id).flags[`helped_${biome}`] + 2, once: true, weight: 6 })
    ];
  });
}

function contextualEvents(): FantasyEventData[] {
  const outdoors = (c: Context) => c.node.id < 1000 && ['empty', 'red', 'blue', 'isekai_event'].includes(c.node.type);
  return [
    event('rain_rescue', 'weather', 'น้ำป่าตัดเส้นทาง', 'ฝนต่อเนื่องทำให้ทางข้ามถูกน้ำพัด ชาวบ้านกำลังติดอยู่อีกฝั่ง', [
      { text: 'ซื้อเชือกช่วยข้าม', subtext: 'จ่าย 40G รับ 70 EXP และลดภัย 12', icon: '🪢', cost: 40, utility: () => 8, resolve: p => { p.gainXP(70); const w = getWorld(); w.threat[w.focusRealm] = Math.max(0, w.threat[w.focusRealm] - 12); return outcome('ช่วยชาวบ้านสำเร็จ', 'เชือกเส้นใหม่เปิดทางให้ทุกคนข้ามได้ +70 EXP'); } },
      { text: 'รอใต้ชายคา', subtext: 'ฟื้น HP 15% และ MP 8', icon: '☔', utility: p => (p.maxHp - p.hp) / 5, resolve: p => { const h = heal(p, Math.ceil(p.maxHp * 0.15)); p.mp = Math.min(p.maxMp, p.mp + 8); return outcome('พักรอฝน', `คุณฟื้น ${h} HP และ MP สูงสุด 8`); } }
    ], { condition: c => outdoors(c) && c.world.weatherAt(c.node) === 'rain', weight: 4 }),
    event('snow_shelter', 'weather', 'กระท่อมกลางหิมะ', 'ลมหนาวปิดรอยเท้า คุณพบกระท่อมที่ยังมีไฟอุ่น', [
      { text: 'ซื้อฟืนร่วมกองไฟ', subtext: 'จ่าย 30G ฟื้น HP 30% และล้างแช่แข็ง', icon: '🔥', cost: 30, utility: p => (p.maxHp - p.hp) / 3, resolve: p => { const h = heal(p, Math.ceil(p.maxHp * 0.3)); p.freezeTurns = 0; return outcome('ไออุ่นคืนกำลัง', `ฟื้น ${h} HP และล้างแช่แข็ง`); } }
    ], { condition: c => outdoors(c) && c.world.weatherAt(c.node) === 'snow', weight: 4 }),
    event('heat_caravan', 'weather', 'คาราวานขาดน้ำ', 'อากาศร้อนจัดทำให้คาราวานหยุดกลางทาง เจ้าของขอซื้อน้ำสำรอง', [
      { text: 'ช่วยจัดหาน้ำ', subtext: 'ใช้ MP 10 รับ 80G', icon: '💧', utility: p => p.mp >= 10 ? 9 : -10, resolve: p => { if (p.mp < 10) return outcome('พลังเวทไม่พอ', 'ต้องใช้ MP 10 เพื่อเรียกน้ำ'); p.mp -= 10; gain(p, 80); return outcome('คาราวานออกเดินทาง', 'น้ำสะอาดช่วยทั้งกองคาราวาน +80G, -10 MP'); } }
    ], { condition: c => outdoors(c) && ['heatwave', 'sandstorm'].includes(c.world.weatherAt(c.node)), weight: 4 }),
    event('night_market', 'night', 'ตลาดลับใต้แสงจันทร์', 'เมื่อคนส่วนใหญ่หลับ พ่อค้าลึกลับเพิ่งเปิดหีบสินค้า', [
      { text: 'ซื้อคัมภีร์สายฟ้า', subtext: 'จ่าย 80G รับคัมภีร์ zap', icon: '📜', cost: 80, utility: p => p.fieldSpells.includes('zap') ? -1 : 8, resolve: p => { p.fieldSpells.push('zap'); return outcome('คัมภีร์จากตลาดลับ', 'ได้รับคัมภีร์สายฟ้า zap'); } },
      { text: 'ช่วยขนสินค้า', subtext: 'รับ 35G และ 20 EXP', icon: '📦', utility: () => 5, resolve: p => { gain(p, 35); p.gainXP(20); return outcome('งานยามราตรี', 'รับค่าจ้าง 35G และ 20 EXP'); } }
    ], { condition: c => outdoors(c) && c.world.timeOfDay === 'NIGHT', weight: 4 }),
    event('blood_watch', 'weather', 'ยามเฝ้าจันทร์เลือด', 'เสียงสัตว์คลั่งดังใกล้แนวรั้ว ชาวเมืองขอแรงคุณช่วยเฝ้าระวัง', [
      { text: 'เสริมแนวป้องกัน', subtext: 'จ่าย 50G ลดภัย 20 และรับ 80 EXP', icon: '🛡️', cost: 50, utility: () => 10, resolve: p => { p.gainXP(80); const w = getWorld(); w.threat[w.focusRealm] = Math.max(0, w.threat[w.focusRealm] - 20); return outcome('แนวรั้วยังยืนหยัด', 'คุณช่วยให้ชุมชนผ่านคืนนี้ได้ ภัยลดลง 20'); } }
    ], { condition: c => outdoors(c) && c.world.weatherAt(c.node) === 'blood_moon', weight: 6 }),
    event('refugee_camp', 'crisis', 'ค่ายผู้ลี้ภัย', 'ความรุนแรงในภูมิภาคทำให้ผู้คนทิ้งบ้าน เสบียงในค่ายกำลังหมด', [
      { text: 'สมทบเสบียง', subtext: 'จ่าย 60G ลดภัย 25 รับ 100 EXP', icon: '🍞', cost: 60, utility: () => 10, resolve: p => { p.gainXP(100); const w = getWorld(); w.threat[w.focusRealm] = Math.max(0, w.threat[w.focusRealm] - 25); return outcome('ค่ายผู้ลี้ภัยมีความหวัง', 'คาราวานอาหารช่วยให้ผู้คนตั้งหลักได้'); } }
    ], { condition: c => outdoors(c) && c.world.threat[c.node.realmId] >= 40, weight: 5 }),
    event('wounded_scout', 'recovery', 'หน่วยพยาบาลข้างทาง', 'หน่วยสำรวจตั้งจุดพักสำหรับผู้บาดเจ็บจากการเดินทาง', [
      { text: 'รับการปฐมพยาบาล', subtext: 'ฟื้น HP 25% ฟรี', icon: '🩹', utility: p => (p.maxHp - p.hp) / 2, resolve: p => outcome('พันแผลเรียบร้อย', `ฟื้น ${heal(p, Math.ceil(p.maxHp * 0.25))} HP`) }
    ], { condition: c => outdoors(c) && !!c.player && c.player.hp < c.player.maxHp * 0.4, cooldown: 6, weight: 5 }),
    event('golden_tracks', 'crisis', 'รอยล้อคาราวานทองคำ', 'คาราวานก็อบลินทองคำกำลังผ่านภูมิภาค คุณพบห่อเหรียญที่ตกจากรถ', [
      { text: 'เก็บเหรียญและแจ้งเจ้าของ', subtext: 'รับสินน้ำใจ 140G', icon: '💰', utility: () => 15, resolve: p => { gain(p, 140); return outcome('สินน้ำใจจากคาราวาน', 'ก็อบลินขอบคุณที่ช่วยเก็บสินค้า +140G'); } }
    ], { condition: c => outdoors(c) && c.world.memory(0).flags.caravanUntil >= c.world.day, weight: 7 }),
    event('quiet_camp', 'rest', 'ที่พักริมทาง', 'ทางเดินช่วงนี้สงบ คุณมีเวลาทบทวนแผนและดูแลอุปกรณ์', [
      { text: 'พักและดูแลอุปกรณ์', subtext: 'ฟื้น HP 10% และลดสนิม 1 เทิร์น', icon: '⛺', utility: p => 2 + (p.maxHp - p.hp) / 10, resolve: p => { p.rustTurns = Math.max(0, p.rustTurns - 1); return outcome('พร้อมเดินทางต่อ', `ฟื้น ${heal(p, Math.ceil(p.maxHp * 0.1))} HP`); } }
    ], { cooldown: 0, weight: 0.3 })
  ];
}

function landmarkEvents(): FantasyEventData[] {
  const landmarks: { biome: BiomeType; title: string; desc: string; choice: FantasyChoice }[] = [
    { biome: 'grass', title: 'กังหันของชาวนา', desc: 'กังหันเสียก่อนเก็บเกี่ยว ชาวนาขอแรงคุณซ่อมเพื่อให้ส่งเสบียงได้ต่อ', choice: { text: 'ซื้ออะไหล่ซ่อมกังหัน', subtext: 'จ่าย 50G รับรายได้ 20G อีก 4 เทิร์นของตน', icon: '🌾', cost: 50, utility: () => 9, resolve: p => { getWorld().memory(p.id).flags.farmPayments = 4; return outcome('ผลผลิตกลับมาแล้ว', 'ชาวนาจะส่งรายได้ 20G ให้คุณอีก 4 เทิร์น'); } } },
    { biome: 'forest', title: 'สวนสมุนไพรของดรูอิด', desc: 'ดรูอิดขอให้ใช้พลังเวทปลุกเมล็ดพันธุ์แทนการเก็บจนหมดป่า', choice: { text: 'ปลุกเมล็ดพันธุ์', subtext: 'ใช้ MP 10 ล้างพิษและรับ 60 EXP', icon: '🌱', requires: p => p.mp >= 10, utility: p => p.poisonTurns ? 12 : 5, resolve: p => { p.mp -= 10; p.poisonTurns = 0; p.gainXP(60); return outcome('ป่าเติบโตอีกครั้ง', 'ได้รับสมุนไพรล้างพิษและ 60 EXP'); } } },
    { biome: 'waterfall_forest', title: 'สะพานเชือกหลังน้ำตก', desc: 'คนเฝ้าสะพานเสนอเส้นทางลัดให้ผู้ที่ช่วยซ่อมสะพาน', choice: { text: 'ช่วยผูกเชือกใหม่', subtext: 'จ่าย 45G รับสปินเนอร์ 2 ลูกเต๋าสำหรับเทิร์นถัดไป', icon: '🌉', cost: 45, utility: () => 8, resolve: p => { p.activeSpinnerMultiplier = Math.max(2, p.activeSpinnerMultiplier); return outcome('เปิดทางลัด', 'ทอยอย่างน้อย 2 ลูกเต๋าในเทิร์นถัดไป'); } } },
    { biome: 'snow', title: 'ผู้พิทักษ์เตาผิง', desc: 'ถ่านเวทก้อนสุดท้ายช่วยคุ้มครองผู้เดินทางจากอากาศหนาวได้ชั่วคราว', choice: { text: 'รับถ่านเวทอุ่นกาย', subtext: 'จ่าย 35G ยกเว้นผลลดระยะเดินจากอากาศ 3 เทิร์น', icon: '🔥', cost: 35, utility: () => 8, resolve: p => { getWorld().memory(p.id).flags.weatherWard = 3; return outcome('ไออุ่นของภูเขา', 'ภูมิคุ้มกันผลลดระยะเดินจากอากาศ 3 เทิร์น'); } } },
    { biome: 'desert', title: 'บ่อน้ำกลางโอเอซิส', desc: 'น้ำใต้ทรายยังใสสะอาด แม้เส้นทางรอบข้างจะแห้งแล้ง', choice: { text: 'เติมน้ำและพักร่ม', subtext: 'ฟื้น MP เต็มและ HP 20%', icon: '🏝️', utility: p => p.maxMp - p.mp + 5, resolve: p => { p.mp = p.maxMp; return outcome('น้ำแห่งโอเอซิส', `ฟื้น MP เต็มและ ${heal(p, Math.ceil(p.maxHp * 0.2))} HP`); } } },
    { biome: 'volcano', title: 'เตาหลอมออบซิเดียน', desc: 'ช่างตีเหล็กใช้ความร้อนจากลาวาปรับคมอาวุธโดยไม่ต้องใช้เชื้อเพลิง', choice: { text: 'ปรับคมอาวุธ', subtext: 'จ่าย 100G เพิ่มระดับตีบวกอาวุธ 1 ขั้น สูงสุด +9', icon: '⚒️', cost: 100, requires: p => p.weaponUpgradeLevel < 9, utility: () => 12, resolve: p => { p.weaponUpgradeLevel++; return outcome('คมดาบจากลาวา', 'อาวุธตีบวกเป็น +' + p.weaponUpgradeLevel); } } },
    { biome: 'cavern', title: 'แผนที่คนงานเหมือง', desc: 'แผนที่เก่าระบุจุดพักและทางเดินที่ยังมั่นคงในดันเจี้ยน', choice: { text: 'ซื้อชุดสำรวจ', subtext: 'จ่าย 40G รับคบเพลิงสำรอง ใช้อัตโนมัติเมื่อแสงเหลือ 20%', icon: '🕯️', cost: 40, utility: () => 9, resolve: p => { getWorld().memory(p.id).flags.spareTorch = 1; return outcome('เตรียมพร้อมสำรวจ', 'คบเพลิงสำรองจะคืนแสง 40% หนึ่งครั้งในดันเจี้ยน'); } } },
    { biome: 'coral', title: 'ชาวประมงแห่งอ่าวปะการัง', desc: 'ชาวประมงสอนเทคนิคอ่านกระแสน้ำให้คุณ ก่อนแบ่งอุปกรณ์สำรองมาให้', choice: { text: 'ช่วยซ่อมอวน', subtext: 'รับ 50 EXP และเหยื่อพิเศษ ช่วยเพิ่มรางวัลตกปลาครั้งถัดไป 50%', icon: '🪸', utility: () => 7, resolve: p => { p.gainXP(50); getWorld().memory(p.id).flags.specialBait = 1; return outcome('อ่านทางน้ำเป็นแล้ว', 'รับ 50 EXP และเหยื่อพิเศษหนึ่งครั้ง'); } } },
    { biome: 'abyss', title: 'แท่นผนึกเงา', desc: 'เสียงกระซิบจากรอยแยกดังขึ้นทุกวัน คุณสามารถปิดผนึกบางส่วนได้', choice: { text: 'ผนึกรอยแยก', subtext: 'ใช้ MP 15 ลดภัย 30 ล้างคำสาป และรับ 80 EXP', icon: '🕯️', requires: p => p.mp >= 15, utility: () => 12, resolve: p => { p.mp -= 15; p.curseTurns = 0; p.gainXP(80); getWorld().threat.abyss = Math.max(0, getWorld().threat.abyss - 30); return outcome('เสียงกระซิบสงบลง', 'ลดภัยหุบเหว 30 ล้างคำสาป และรับ 80 EXP'); } } },
    { biome: 'castle', title: 'เจ้าหน้าที่คลังหลวง', desc: 'คลังหลวงเปิดรับผู้ช่วยตรวจบัญชี และมีงานสำหรับคนที่ยังไม่มีเมือง', choice: { text: 'ตรวจบัญชีเสบียงหลวง', subtext: 'รับ 70G และ 35 EXP', icon: '📒', utility: () => 8, resolve: p => { gain(p, 70); p.gainXP(35); return outcome('บัญชีตรงกัน', 'รับค่าจ้าง 70G และ 35 EXP'); } } },
    { biome: 'fairy_grove', title: 'วงแหวนแห่งภูตลม', desc: 'ภูตลมติดอยู่ในวงแหวนเวท เธอขอให้คุณช่วยทำลายผนึก', choice: { text: 'ปลดผนึกภูตลม', subtext: 'จ่าย 120G รับคู่หูซิลฟีรา หากยังไม่มีคู่หู', icon: '🧚', cost: 120, requires: p => !p.companion, utility: p => p.companion ? -10 : 15, resolve: p => { p.companion = createCompanion('sylphira'); return { ...outcome('คำมั่นของภูตลม', 'ซิลฟีราร่วมเดินทางกับคุณ'), companionRecruited: p.companion }; } } },
    { biome: 'crystal_cavern', title: 'ผลึกสะสมมนตรา', desc: 'ผลึกตอบสนองต่อจิตใจและค่อย ๆ เติมพลังให้ผู้ที่ยอมฟังเสียงสะท้อน', choice: { text: 'ปรับคลื่นผลึก', subtext: 'ฟื้น MP เต็มและรับบัฟ MAG +4 เป็นเวลา 3 เทิร์น', icon: '💎', utility: p => p.maxMp - p.mp + 8, resolve: p => { p.mp = p.maxMp; p.foodBuff = { name: 'มนตราผลึก', icon: '💎', turnsRemaining: 4, magBoost: 4 }; return outcome('จังหวะมนตราสอดประสาน', 'ฟื้น MP เต็ม และ MAG +4 ในสามเทิร์นถัดไป'); } } },
    { biome: 'celestial', title: 'หอพิทักษ์แสงดาว', desc: 'ผู้ดูแลหอคอยยอมมอบตราเกราะแสงให้ผู้เดินทางที่ช่วยบูรณะแท่นบูชา', choice: { text: 'บูรณะแท่นแสง', subtext: 'จ่าย 180G รับ Relic ตราอีจิส หากยังไม่มี', icon: '🌟', cost: 180, requires: p => !p.relics.includes('aegis_crest'), utility: () => 15, resolve: p => { p.relics.push('aegis_crest'); return outcome('เกราะจากแสงดาว', 'ได้รับตราอีจิส ป้องกันความเสียหาย 25 หน่วยแรกต่อการต่อสู้'); } } },
    { biome: 'steampunk', title: 'โรงงานขดลวดสายฟ้า', desc: 'ช่างเครื่องพร้อมติดตั้งขดลวดเวทบนอาวุธของคุณ', choice: { text: 'ติดตั้งรูนสายฟ้า', subtext: 'จ่าย 140G เปลี่ยนรูนอาวุธเป็น thunder', icon: '⚙️', cost: 140, utility: () => 10, resolve: p => { p.weaponRune = 'thunder'; return outcome('ประกายจากจักรกล', 'อาวุธมีโอกาสทำให้ศัตรูติดช็อกตามผลรูนสายฟ้า'); } } },
    { biome: 'sakura_shrine', title: 'พิธีชำระล้างใต้ซากุระ', desc: 'มิโกะเชื้อเชิญให้คุณแขวนเครื่องรางไว้กับต้นซากุระโบราณ', choice: { text: 'รับเครื่องรางศาลเจ้า', subtext: 'จ่าย 45G ล้างสถานะผิดปกติและรับคัมภีร์ holy_sanctuary', icon: '⛩️', cost: 45, utility: () => 9, resolve: p => { p.cleanseAilments(); p.fieldSpells.push('holy_sanctuary'); return outcome('กลีบดอกไม้พาคำสาปไป', 'ล้างสถานะผิดปกติและได้รับคัมภีร์เขตศักดิ์สิทธิ์'); } } }
  ];
  return landmarks.map(l => event('landmark_' + l.biome, l.biome, l.title, l.desc, [l.choice], { once: true, weight: 3, condition: c => c.node.biome === l.biome && ['empty', 'blue', 'isekai_event'].includes(c.node.type) }));
}

function serviceEvents(): FantasyEventData[] {
  return [
    event('church_sanctuary', 'church', 'วิหารแห่งการพักฟื้น', 'นักบวชเตรียมน้ำมนต์และยาสมุนไพรไว้ให้ผู้เดินทาง', [
      { text: 'รับการรักษา', subtext: 'จ่าย 35G ฟื้น HP/MP เต็ม และล้างสถานะผิดปกติ', icon: '✨', cost: 35, utility: p => (p.maxHp - p.hp) + (p.maxMp - p.mp), resolve: p => { p.hp = p.maxHp; p.mp = p.maxMp; p.cleanseAilments(); return outcome('พรแห่งการรักษา', 'HP/MP เต็มและสถานะผิดปกติถูกชำระ'); } },
      { text: 'ช่วยงานวิหาร', subtext: 'รับ 20 EXP และฟื้น HP 15%', icon: '🕊️', utility: () => 5, resolve: p => { p.gainXP(20); return outcome('พักใจในวิหาร', `รับ 20 EXP และฟื้น ${heal(p, Math.ceil(p.maxHp * 0.15))} HP`); } }
    ]),
    event('tavern_rest', 'tavern', 'โรงเตี๊ยมของนักเดินทาง', 'เสียงดนตรีเบา ๆ และกลิ่นอาหารช่วยให้คุณหายเหนื่อย', [
      { text: 'พักห้องรับรอง', subtext: 'จ่าย 30G ฟื้น HP/MP เต็ม', icon: '🛏️', cost: 30, utility: p => p.maxHp - p.hp + p.maxMp - p.mp, resolve: p => { p.hp = p.maxHp; p.mp = p.maxMp; return outcome('ตื่นพร้อมออกเดินทาง', 'ฟื้น HP และ MP เต็ม'); } },
      { text: 'ฟังข่าวประจำภูมิภาค', subtext: 'รับพยากรณ์อากาศวันถัดไปและระดับภัย', icon: '🗞️', utility: () => 3, resolve: (p, n) => { const w = getWorld(); const names: Record<string, string> = { sunny: 'แจ่มใส', rain: 'ฝน', snow: 'หิมะ', heatwave: 'คลื่นร้อน', sandstorm: 'พายุทราย', blood_moon: 'จันทร์เลือด', miasma: 'หมอกพิษ' }; return outcome('ข่าวจากคาราวาน', `พรุ่งนี้: ${names[w.forecast[n.realmId]]} • ภัยประจำภูมิภาค ${w.threat[n.realmId]}/100`); } }
    ]),
    event('fishing_local', 'fishing', 'ผู้ดูแลท่าน้ำ', 'ผู้ดูแลบอกตำแหน่งน้ำลึกและเตือนให้เตรียมตัวก่อนตกปลา', [
      { text: 'ช่วยซ่อมท่าน้ำ', subtext: 'รับ 20G และ 15 EXP', icon: '🎣', utility: () => 3, resolve: p => { gain(p, 20); p.gainXP(15); return outcome('ท่าน้ำพร้อมใช้งาน', 'รับค่าจ้าง 20G และ 15 EXP'); } }
    ]),
    event('gate_oath', 'dark_gate', 'รอยแยกแห่งชะตา', 'เสียงจากประตูมืดถามว่าคุณพร้อมจ่ายราคาของอำนาจหรือยัง', [
      { text: 'ยึดมั่นในเส้นทางของตน', subtext: 'ฟื้น MP 15', icon: '🕯️', utility: () => 4, resolve: p => { p.mp = Math.min(p.maxMp, p.mp + 15); return outcome('จิตใจมั่นคง', 'ฟื้น MP สูงสุด 15'); } }
    ])
  ];
}

/** Eligibility, weighted selection, choice validation and consequences share one context. */
export class FantasyEventManager {
  public events: FantasyEventData[] = [...regionalEvents(), ...landmarkEvents(), ...contextualEvents(), ...serviceEvents()];
  public getRandomEvent(node: BoardNode, player?: Player, world = getWorld()): FantasyEventData {
    const memory = world.memory(player?.id ?? 0);
    const context: Context = { node, player, world };
    const service = serviceEvents().some(e => e.category === node.type);
    let pool = this.events.filter(e => {
      if (service ? e.category !== node.type : ['church', 'tavern', 'fishing', 'dark_gate'].includes(e.category)) return false;
      if (e.condition && !e.condition(context)) return false;
      if (e.once && memory.flags[`done_${e.id}`]) return false;
      return memory.lastSeen[e.id] === undefined || world.round - memory.lastSeen[e.id] >= (e.cooldown ?? 5);
    });
    if (!pool.length) pool = [this.events.find(e => e.id === 'quiet_camp')!];
    const fresh = pool.filter(e => !memory.recent.slice(-4).includes(e.id));
    if (fresh.length) pool = fresh;
    let roll = world.random() * pool.reduce((sum, e) => sum + (e.weight ?? 1), 0);
    const selected = pool.find(e => (roll -= e.weight ?? 1) <= 0) ?? pool[pool.length - 1];
    let resolved = false;
    const choices = selected.choices.map(choice => ({ ...choice, resolve: (p: Player, n: BoardNode) => {
      if (resolved) return outcome('เหตุการณ์สิ้นสุดแล้ว', 'คุณตัดสินใจเรื่องนี้ไปแล้ว');
      if (choice.cost && p.gold < choice.cost) return outcome('เงินไม่เพียงพอ', `ต้องมี ${choice.cost}G จึงจะเลือกข้อนี้ได้`);
      if (choice.requires && !choice.requires(p)) return outcome('ยังเลือกข้อนี้ไม่ได้', choice.subtext);
      resolved = true;
      const m = world.memory(p.id);
      m.lastSeen[selected.id] = world.round; m.recent.push(selected.id); m.recent = m.recent.slice(-12);
      if (selected.once) m.flags[`done_${selected.id}`] = 1;
      if (choice.cost) p.gold -= choice.cost;
      const previousWorld = getWorld(); bindWorld(world);
      let result: FantasyEventOutcome;
      try { result = choice.resolve(p, n); } finally { bindWorld(previousWorld); }
      p.hp = Math.max(1, Math.min(p.maxHp, p.hp)); p.mp = Math.max(0, Math.min(p.maxMp, p.mp));
      return result;
    } }));
    if (node.type === 'empty' && node.id < 1000 && !node.homeData) choices.push({
      text: `สร้างบ้านพัก (${RULES.homeCost}G)`, subtext: 'ตั้งจุดเกิดใหม่และพักฟื้นส่วนตัว', icon: '🏡', cost: RULES.homeCost,
      utility: p => p.homeNodeId === null && p.gold > RULES.homeCost * 2 ? 12 : -3,
      resolve: (p, n) => {
        if (resolved || p.gold < RULES.homeCost) return outcome('ยังสร้างบ้านไม่ได้', `ต้องมี ${RULES.homeCost}G และเหตุการณ์ยังไม่สิ้นสุด`);
        resolved = true; p.gold -= RULES.homeCost; p.homeNodeId = n.id;
        n.type = 'home'; n.homeData = { ownerId: p.id, ownerName: p.displayName, level: 1, purchasePrice: RULES.homeCost, visitorsCount: 0, tollFee: 20 };
        return outcome('บ้านหลังใหม่', 'คุณมีจุดพักฟื้นและจุดเกิดใหม่ส่วนตัวแล้ว', '🏡');
      }
    });
    return { ...selected, choices };
  }
  chooseForAI(event: FantasyEventData, player: Player): number {
    let best = -Infinity; let index = 0;
    event.choices.forEach((choice, i) => {
      const score = player.gold < (choice.cost ?? 0) || (choice.requires && !choice.requires(player)) ? -Infinity : (choice.utility?.(player) ?? 2);
      if (score > best) { best = score; index = i; }
    });
    return index;
  }
}
export const fantasyEventManager = new FantasyEventManager();
