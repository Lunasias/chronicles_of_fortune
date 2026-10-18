import { getWorld } from './WorldState';
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
  public get currentWeather(): WeatherInfo {
    const world = getWorld();
    const weather = world.weather[world.focusRealm];
    const type: WeatherType = weather === 'snow' ? 'blizzard' : weather === 'sandstorm' ? 'sandstorm' : weather === 'blood_moon' ? 'blood_moon' : 'clear';
    const info = { clear: ['ท้องฟ้าแจ่มใส', '☀️', '#38bdf8'], blizzard: ['พายุหิมะ', '❄️', '#93c5fd'], sandstorm: ['พายุทราย', '🏜️', '#fbbf24'], blood_moon: ['จันทราสีเลือด', '🩸', '#f87171'] }[type];
    return { type, name: info[0], icon: info[1], desc: 'สภาพอากาศประจำภูมิภาค', themeColor: info[2], daysRemaining: 1 };
  }

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

  public advanceDay(dayCounter: number) {
    const before = this.currentWeather.type;
    getWorld().advanceRound(dayCounter);
    return { changed: before !== this.currentWeather.type, newWeather: this.currentWeather };
  }
  public setWeather(type: WeatherType, days = 1): WeatherInfo {
    const world = getWorld();
    world.weather[world.focusRealm] = type === 'clear' ? 'sunny' : type === 'blizzard' ? 'snow' : type;
    return this.currentWeather;
  }
  public getMovementDiceModifier(biome: string): number {
    const weather = getWorld().weather[getWorld().focusRealm];
    return weather === 'snow' || weather === 'sandstorm' ? -1 : 0;
  }
  public getMonsterModifiers() {
    return this.currentWeather.type === 'blood_moon' ? { statMultiplier: 1.2, rewardMultiplier: 1.6 } : { statMultiplier: 1, rewardMultiplier: 1 };
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
