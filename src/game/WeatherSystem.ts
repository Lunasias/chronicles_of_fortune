export type WeatherType = 'clear' | 'blizzard' | 'sandstorm' | 'blood_moon';

export interface WeatherInfo {
  type: WeatherType;
  name: string;
  icon: string;
  desc: string;
  themeColor: string;
  daysRemaining: number;
}

export class WeatherSystem {
  public currentWeather: WeatherInfo = {
    type: 'clear',
    name: 'ท้องฟ้าแจ่มใส (Clear Sky)',
    icon: '☀️',
    desc: 'สภาพอากาศสงบ เหมาะแก่การเดินทางและผจญภัย',
    themeColor: '#38bdf8',
    daysRemaining: 4
  };

  // Atmospheric Particles
  private snowParticles: Array<{ x: number; y: number; speed: number; size: number }> = [];
  private sandParticles: Array<{ x: number; y: number; speedX: number; speedY: number; size: number }> = [];

  constructor() {
    this.initParticles();
  }

  private initParticles() {
    for (let i = 0; i < 70; i++) {
      this.snowParticles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        speed: 1.2 + Math.random() * 2.2,
        size: 1.5 + Math.random() * 2.5
      });
      this.sandParticles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        speedX: 3.5 + Math.random() * 3.5,
        speedY: (Math.random() - 0.4) * 1.5,
        size: 1.2 + Math.random() * 2.0
      });
    }
  }

  // Update weather every day tick
  public advanceDay(dayCounter: number): { changed: boolean; newWeather: WeatherInfo } {
    this.currentWeather.daysRemaining--;
    if (this.currentWeather.daysRemaining <= 0) {
      // Cycle or choose new weather
      const options: WeatherType[] = ['clear', 'blizzard', 'sandstorm', 'blood_moon'];
      const nextType = options[Math.floor(Math.random() * options.length)];
      this.setWeather(nextType, 3 + Math.floor(Math.random() * 3));
      return { changed: true, newWeather: this.currentWeather };
    }
    return { changed: false, newWeather: this.currentWeather };
  }

  public setWeather(type: WeatherType, days = 4): WeatherInfo {
    switch (type) {
      case 'blizzard':
        this.currentWeather = {
          type: 'blizzard',
          name: 'พายุหิมะโหมกระหน่ำ (Frost Blizzard)',
          icon: '❄️',
          desc: 'หิมะตกหนักในแถบยอดเขาน้ำแข็ง (Frostpeak) ลดระยะการก้าวเดินลง 1 ก้าว!',
          themeColor: '#93c5fd',
          daysRemaining: days
        };
        break;
      case 'sandstorm':
        this.currentWeather = {
          type: 'sandstorm',
          name: 'พายุทรายทะเลทราย (Sunfire Sandstorm)',
          icon: '🏜️',
          desc: 'กระแสลมทรายร้อนระอุในแดนทะเลทราย บดบังทัศนวิสัยและกระตุ้นการเผาไหม้!',
          themeColor: '#fbbf24',
          daysRemaining: days
        };
        break;
      case 'blood_moon':
        this.currentWeather = {
          type: 'blood_moon',
          name: 'จันทราสีเลือด (Blood Moon)',
          icon: '🩸🌑',
          desc: 'มอนสเตอร์ทุกตัวคลุ้มคลั่ง พลังเพิ่มขึ้น 30% แต่ให้ทองและ EXP สองเท่า!',
          themeColor: '#f87171',
          daysRemaining: days
        };
        break;
      case 'clear':
      default:
        this.currentWeather = {
          type: 'clear',
          name: 'ท้องฟ้าแจ่มใส (Clear Sky)',
          icon: '☀️',
          desc: 'สภาพอากาศสงบ ลมพัดสบาย เหมาะแก่การเดินทาง',
          themeColor: '#38bdf8',
          daysRemaining: days
        };
        break;
    }
    return this.currentWeather;
  }

  // Movement dice penalty for harsh weather
  public getMovementDiceModifier(biome: string): number {
    if (this.currentWeather.type === 'blizzard' && (biome === 'snow' || biome === 'frostpeak')) {
      return -1;
    }
    return 0;
  }

  // Monster multipliers under Blood Moon
  public getMonsterModifiers(): { statMultiplier: number; rewardMultiplier: number } {
    if (this.currentWeather.type === 'blood_moon') {
      return { statMultiplier: 1.30, rewardMultiplier: 2.0 };
    }
    return { statMultiplier: 1.0, rewardMultiplier: 1.0 };
  }

  // Draw lightweight atmospheric overlay onto Canvas
  public drawWeatherOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
    if (this.currentWeather.type === 'clear') return;

    ctx.save();

    if (this.currentWeather.type === 'blizzard') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      this.snowParticles.forEach(p => {
        p.y += p.speed;
        p.x += Math.sin(time * 0.003 + p.y * 0.01) * 0.6;
        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      // Soft cool ambient tint
      ctx.fillStyle = 'rgba(186, 230, 253, 0.04)';
      ctx.fillRect(0, 0, width, height);
    } else if (this.currentWeather.type === 'sandstorm') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
      this.sandParticles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x > width) {
          p.x = -10;
          p.y = Math.random() * height;
        }
        ctx.fillRect(p.x, p.y, p.size * 2, p.size);
      });
      // Warm desert tint
      ctx.fillStyle = 'rgba(251, 191, 36, 0.05)';
      ctx.fillRect(0, 0, width, height);
    } else if (this.currentWeather.type === 'blood_moon') {
      // Crimson vignette glow
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.2,
        width / 2, height / 2, width * 0.7
      );
      grad.addColorStop(0, 'rgba(220, 38, 38, 0.02)');
      grad.addColorStop(1, 'rgba(153, 27, 27, 0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
}

export const weatherSystem = new WeatherSystem();
