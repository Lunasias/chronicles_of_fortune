import { RealmId, BoardNode } from './BoardMap';
import { getWorld, WorldWeather } from './WorldState';

export type TimeOfDay = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

export type WeatherType = WorldWeather;

export interface WeatherEffect {
  title: string;
  desc: string;
  icon: string;
  magicBonus: number;
  physBonus: number;
  spdModifier: number;
}

export class EcosystemSystem {
  get timeOfDay(): TimeOfDay { return getWorld().timeOfDay; }
  set timeOfDay(value: TimeOfDay) { getWorld().hour = { DAWN: 8, DAY: 14, DUSK: 20, NIGHT: 2 }[value]; }
  get hourCounter(): number { return getWorld().hour; }
  set hourCounter(value: number) { getWorld().hour = value; }
  get realmWeather(): Record<RealmId, WeatherType> { return getWorld().weather; }
  // Only the round controller advances time; UI callers receive a read-only snapshot.
  public advanceTime() { return { timeChanged: false, newTime: this.timeOfDay, weatherChanged: false }; }
  public getNodeWeather(node: BoardNode): WeatherType { return getWorld().weatherAt(node); }

  public getWeatherCombatModifier(weather: WeatherType): WeatherEffect {
    switch (weather) {
      case 'rain':
        return {
          title: 'ฝนตก',
          desc: 'ฝน: พลังเวท +15% และเริ่มต่อสู้ในสภาพเปียก',
          icon: '🌧️',
          magicBonus: 3,
          physBonus: 0,
          spdModifier: 0
        };
      case 'snow':
        return {
          title: 'พายุหิมะ',
          desc: 'หิมะ: พลังป้องกัน +10% ความเร็ว -10% และระยะเดิน -1',
          icon: '❄️',
          magicBonus: 1,
          physBonus: -1,
          spdModifier: -1
        };
      case 'heatwave':
        return {
          title: 'คลื่นความร้อน',
          desc: 'คลื่นร้อน: พลังโจมตีกายภาพ +10%',
          icon: '☀️',
          magicBonus: 0,
          physBonus: 3,
          spdModifier: 1
        };
      case 'miasma':
        return {
          title: 'หมอกพิษ',
          desc: 'หมอกพิษ: พลังเวท +10%',
          icon: '🔮',
          magicBonus: 4,
          physBonus: 2,
          spdModifier: 0
        };
      case 'blood_moon':
        return {
          title: 'จันทราสีเลือด',
          desc: 'จันทร์เลือด: ศัตรูพลังโจมตี +20% ทองและ EXP +60%',
          icon: '🩸🌑',
          magicBonus: 6,
          physBonus: 6,
          spdModifier: 2
        };
      case 'sandstorm':
        return { title: 'พายุทราย', desc: 'พายุทราย: ความเร็ว -15% และระยะเดิน -1', icon: '🏜️', magicBonus: 0, physBonus: 0, spdModifier: -1 };
      case 'sunny':
      default:
        return {
          title: 'แจ่มใส',
          desc: 'Ideal adventuring weather. Balanced conditions.',
          icon: '🌤️',
          magicBonus: 0,
          physBonus: 0,
          spdModifier: 0
        };
    }
  }

  // Get ambient screen overlay color & alpha for canvas rendering
  public getLightingOverlay(): { color: string; alpha: number; isNight: boolean } {
    switch (this.timeOfDay) {
      case 'DAWN':
        // Soft pink-gold morning haze
        return { color: 'rgba(251, 146, 60, 0.08)', alpha: 0.08, isNight: false };
      case 'DAY':
        // Crystal clear natural sunlight
        return { color: 'rgba(255, 255, 255, 0.0)', alpha: 0.0, isNight: false };
      case 'DUSK':
        // Rich warm amber-violet sunset
        return { color: 'rgba(180, 83, 9, 0.14)', alpha: 0.14, isNight: false };
      case 'NIGHT':
        // Luminous moonlight navy (brightened for comfortable visibility and enchanted night atmosphere)
        return { color: 'rgba(15, 23, 42, 0.18)', alpha: 0.18, isNight: true };
    }
  }

  public getTimeDisplay(): { icon: string; name: string; desc: string } {
    switch (this.timeOfDay) {
      case 'DAWN':
        return { icon: '🌅', name: 'รุ่งอรุณ', desc: 'Guild quests updated' };
      case 'DAY':
        return { icon: '☀️', name: 'เที่ยง', desc: 'Bustling markets' };
      case 'DUSK':
        return { icon: '🌇', name: 'พลบค่ำ', desc: 'Taverns opening' };
      case 'NIGHT':
        return { icon: '🌙', name: 'กลางคืน', desc: 'Monsters prowling' };
    }
  }
}

export const ecosystemSystem = new EcosystemSystem();
