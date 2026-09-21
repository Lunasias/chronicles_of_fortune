import { RealmId, BoardNode } from './BoardMap';

export type TimeOfDay = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

export type WeatherType = 'sunny' | 'rain' | 'snow' | 'heatwave' | 'miasma';

export interface WeatherEffect {
  title: string;
  desc: string;
  icon: string;
  magicBonus: number;
  physBonus: number;
  spdModifier: number;
}

export class EcosystemSystem {
  public timeOfDay: TimeOfDay = 'DAY';
  public hourCounter: number = 10; // 0 to 24
  
  // Dynamic weather per realm: each realm has its own living ecosystem!
  public realmWeather: Record<RealmId, WeatherType> = {
    solaria: 'sunny',
    frostpeak: 'snow',
    sunfire: 'heatwave',
    abyss: 'miasma'
  };

  private weatherCycleCount: number = 0;

  constructor() {
    this.timeOfDay = 'DAY';
  }

  // Advance time of day (called each turn or round)
  public advanceTime(): { timeChanged: boolean; newTime: TimeOfDay; weatherChanged: boolean } {
    const prevTime = this.timeOfDay;
    this.hourCounter = (this.hourCounter + 4) % 24;

    if (this.hourCounter >= 5 && this.hourCounter < 10) {
      this.timeOfDay = 'DAWN';
    } else if (this.hourCounter >= 10 && this.hourCounter < 17) {
      this.timeOfDay = 'DAY';
    } else if (this.hourCounter >= 17 && this.hourCounter < 21) {
      this.timeOfDay = 'DUSK';
    } else {
      this.timeOfDay = 'NIGHT';
    }

    const timeChanged = prevTime !== this.timeOfDay;
    let weatherChanged = false;

    // Shift regional weather every few cycles
    this.weatherCycleCount++;
    if (this.weatherCycleCount % 3 === 0) {
      weatherChanged = true;
      // Solaria shifts between pleasant sunshine and refreshing rain
      this.realmWeather.solaria = Math.random() > 0.5 ? 'rain' : 'sunny';
      // Frostpeak shifts between snow flurries and deep snow
      this.realmWeather.frostpeak = 'snow';
      // Sunfire shifts between scorching heatwave and clear desert sky
      this.realmWeather.sunfire = Math.random() > 0.4 ? 'heatwave' : 'sunny';
      // Abyss is eternal miasma
      this.realmWeather.abyss = 'miasma';
    }

    return { timeChanged, newTime: this.timeOfDay, weatherChanged };
  }

  public getNodeWeather(node: BoardNode): WeatherType {
    if (node.realmId && this.realmWeather[node.realmId]) {
      return this.realmWeather[node.realmId];
    }
    return node.weather || 'sunny';
  }

  public getWeatherCombatModifier(weather: WeatherType): WeatherEffect {
    switch (weather) {
      case 'rain':
        return {
          title: 'ฝนตก',
          desc: 'Water & Healing Spells +20% potency, fire spells dampened.',
          icon: '🌧️',
          magicBonus: 3,
          physBonus: 0,
          spdModifier: 0
        };
      case 'snow':
        return {
          title: 'พายุหิมะ',
          desc: 'Freezing winds enhance defense +3, movement chilled.',
          icon: '❄️',
          magicBonus: 1,
          physBonus: -1,
          spdModifier: -1
        };
      case 'heatwave':
        return {
          title: 'คลื่นความร้อน',
          desc: 'Solar heat ignites fighting spirit! Physical ATK +3.',
          icon: '☀️',
          magicBonus: 0,
          physBonus: 3,
          spdModifier: 1
        };
      case 'miasma':
        return {
          title: 'หมอกพิษ',
          desc: 'Demonic essence thick in the air! Darkling & Boss damage +25%.',
          icon: '🔮',
          magicBonus: 4,
          physBonus: 2,
          spdModifier: 0
        };
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
        return { color: 'rgba(251, 146, 60, 0.15)', alpha: 0.15, isNight: false };
      case 'DAY':
        // Crystal clear natural sunlight
        return { color: 'rgba(255, 255, 255, 0.0)', alpha: 0.0, isNight: false };
      case 'DUSK':
        // Rich amber-violet sunset
        return { color: 'rgba(124, 45, 18, 0.25)', alpha: 0.25, isNight: false };
      case 'NIGHT':
        // Deep twilight moonlight indigo with glowing torchlights
        return { color: 'rgba(15, 23, 42, 0.48)', alpha: 0.48, isNight: true };
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
