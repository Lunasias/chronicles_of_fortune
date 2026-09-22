import { TimeOfDay } from '../game/EcosystemSystem';

export interface CameraViewport {
  x: number;
  y: number;
  zoom: number;
}

interface DistantCloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  scale: number;
}

interface AmbientCreature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wingPhase: number;
  wingSpeed: number;
  size: number;
  type: 'dove' | 'eagle' | 'raven' | 'bat';
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  phase: number;
}

interface NightStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  isDiamond: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class WorldBackground {
  private clouds: DistantCloud[] = [];
  private creatures: AmbientCreature[] = [];
  private motes: AmbientMote[] = [];
  private stars: NightStar[] = [];
  private shootingStars: ShootingStar[] = [];
  private shootingStarTimer: number = 0;

  constructor() {
    this.initClouds();
    this.initCreatures();
    this.initMotes();
    this.initStars();
    this.initShootingStars();
  }

  private initClouds() {
    this.clouds = [];
    for (let i = 0; i < 22; i++) {
      this.clouds.push({
        x: Math.random() * 3600 - 1800,
        y: -680 + Math.random() * 850,
        width: 170 + Math.random() * 280,
        height: 50 + Math.random() * 70,
        speed: 0.12 + Math.random() * 0.28,
        opacity: 0.38 + Math.random() * 0.42,
        scale: 0.8 + Math.random() * 0.6
      });
    }
  }

  private initCreatures() {
    this.creatures = [];
    for (let i = 0; i < 8; i++) {
      this.creatures.push({
        x: -900 + i * 65 + Math.random() * 40,
        y: -420 + Math.abs(i - 4) * 28,
        vx: 0.85 + Math.random() * 0.35,
        vy: -0.07 + Math.random() * 0.14,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 0.14 + Math.random() * 0.06,
        size: 3.5 + Math.random() * 2.2,
        type: 'eagle'
      });
    }
  }

  private initMotes() {
    this.motes = [];
    for (let i = 0; i < 85; i++) {
      this.motes.push({
        x: Math.random() * 3200 - 1600,
        y: Math.random() * 2200 - 1100,
        vx: -0.35 + Math.random() * 0.7,
        vy: -0.45 - Math.random() * 0.7,
        size: 1.5 + Math.random() * 3.0,
        life: Math.random() * 240,
        maxLife: 200 + Math.random() * 160,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 140; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.78, // upper sky
        size: Math.random() < 0.12 ? 2.4 : Math.random() < 0.35 ? 1.6 : 0.9,
        alpha: 0.35 + Math.random() * 0.6,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        twinkleOffset: Math.random() * Math.PI * 2,
        isDiamond: Math.random() < 0.15
      });
    }
  }

  private initShootingStars() {
    this.shootingStars = [];
    for (let i = 0; i < 3; i++) {
      this.shootingStars.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        length: 0,
        life: 0,
        maxLife: 40,
        active: false
      });
    }
  }

  public renderSky(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    screenWidth: number,
    screenHeight: number,
    time: number,
    timeOfDay: TimeOfDay = 'DAY'
  ) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. SKY GRADIENT PER TIME OF DAY
    this.renderSkyGradient(ctx, screenWidth, screenHeight, timeOfDay);

    // 2. CELESTIAL BODIES, STARS & GOD RAYS
    switch (timeOfDay) {
      case 'DAWN':
        this.renderFadingStars(ctx, screenWidth, screenHeight, time, 0.25);
        this.renderDawnSun(ctx, screenWidth, screenHeight, time);
        break;
      case 'DAY':
        this.renderDaySun(ctx, screenWidth, screenHeight, time);
        break;
      case 'DUSK':
        this.renderDuskSun(ctx, screenWidth, screenHeight, time);
        this.renderFadingStars(ctx, screenWidth, screenHeight, time, 0.35);
        break;
      case 'NIGHT':
        this.renderNightStarsAndAurora(ctx, screenWidth, screenHeight, time);
        this.renderNightMoon(ctx, screenWidth, screenHeight, time);
        break;
    }

    // 3. PARALLAX HORIZON MOUNTAINS & FLOATING LANDMARKS
    this.renderParallaxMountains(ctx, camera, screenWidth, screenHeight, time, timeOfDay);

    ctx.restore();
  }

  private renderSkyGradient(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    screenHeight: number,
    timeOfDay: TimeOfDay
  ) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, screenHeight);

    switch (timeOfDay) {
      case 'DAWN':
        // Soft pastel lavender -> morning rose -> golden dawn horizon
        skyGrad.addColorStop(0, '#1e1b4b');
        skyGrad.addColorStop(0.28, '#4338ca');
        skyGrad.addColorStop(0.55, '#818cf8');
        skyGrad.addColorStop(0.76, '#f472b6');
        skyGrad.addColorStop(0.92, '#fb923c');
        skyGrad.addColorStop(1.0, '#fef08a');
        break;

      case 'DAY':
        // Radiant crystal azure sky -> sunny horizon
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.28, '#0ea5e9');
        skyGrad.addColorStop(0.6, '#38bdf8');
        skyGrad.addColorStop(0.85, '#7dd3fc');
        skyGrad.addColorStop(1.0, '#bae6fd');
        break;

      case 'DUSK':
        // Rich twilight violet -> crimson -> burning orange ember horizon
        skyGrad.addColorStop(0, '#0f172a');
        skyGrad.addColorStop(0.25, '#312e81');
        skyGrad.addColorStop(0.52, '#6b21a8');
        skyGrad.addColorStop(0.74, '#c026d3');
        skyGrad.addColorStop(0.88, '#ea580c');
        skyGrad.addColorStop(1.0, '#fde047');
        break;

      case 'NIGHT':
        // Clear luminous celestial sapphire night - NOT muddy black!
        skyGrad.addColorStop(0, '#030712');   // Deep cosmic void zenith
        skyGrad.addColorStop(0.24, '#09152e'); // Midnight navy
        skyGrad.addColorStop(0.55, '#0f274a'); // Celestial indigo
        skyGrad.addColorStop(0.82, '#173b6a'); // Moonlit sapphire
        skyGrad.addColorStop(1.0, '#1e4b85');  // Ethereal glowing nocturnal horizon
        break;
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
  }

  // --- CELESTIAL BODIES ---

  private renderDawnSun(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    const sunX = w * 0.72;
    const sunY = h * 0.38;
    const sunRadius = 40;

    // Golden morning flare
    const flareGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, w * 0.5);
    flareGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    flareGrad.addColorStop(0.25, 'rgba(251, 146, 60, 0.45)');
    flareGrad.addColorStop(0.6, 'rgba(244, 114, 182, 0.2)');
    flareGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, 0, w, h);

    // Rising Sun Orb
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.6, '#fef08a');
    sunGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Morning Sunbeams
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#fef08a';
    for (let r = -4; r <= 4; r++) {
      const angle = r * 0.18 + Math.sin(time * 0.0005) * 0.03;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle - 1.6) * 1600, sunY + Math.sin(angle - 1.6) * 1600);
      ctx.lineTo(sunX + Math.cos(angle - 1.45) * 1600, sunY + Math.sin(angle - 1.45) * 1600);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private renderDaySun(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    const sunX = w * 0.74;
    const sunY = h * 0.18;
    const sunRadius = 44;

    // Brilliant Solar Corona
    const flareGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.7, sunX, sunY, w * 0.52);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    flareGrad.addColorStop(0.2, 'rgba(254, 240, 138, 0.55)');
    flareGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
    flareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, 0, w, h);

    // Radiant Sun Core
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.7, '#fef9c3');
    sunGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // 8 Solar Flare Prongs
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
    ctx.lineWidth = 2.5;
    const rot = time * 0.0003;
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 4;
      const len = 18 + Math.sin(time * 0.002 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a) * (sunRadius + 4), sunY + Math.sin(a) * (sunRadius + 4));
      ctx.lineTo(sunX + Math.cos(a) * (sunRadius + 4 + len), sunY + Math.sin(a) * (sunRadius + 4 + len));
      ctx.stroke();
    }
    ctx.restore();

    // Clean Golden Sunlight Rays
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#ffffff';
    for (let r = -3; r <= 3; r++) {
      const angle = r * 0.22 + Math.sin(time * 0.0004 + r) * 0.03;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle + 1.2) * 1800, sunY + Math.sin(angle + 1.2) * 1800);
      ctx.lineTo(sunX + Math.cos(angle + 1.34) * 1800, sunY + Math.sin(angle + 1.34) * 1800);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private renderDuskSun(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    const sunX = w * 0.70;
    const sunY = h * 0.44;
    const sunRadius = 50;

    // Fiery Twilight Corona
    const flareGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.6, sunX, sunY, w * 0.55);
    flareGrad.addColorStop(0, 'rgba(251, 146, 60, 0.85)');
    flareGrad.addColorStop(0.25, 'rgba(234, 88, 12, 0.55)');
    flareGrad.addColorStop(0.55, 'rgba(192, 38, 211, 0.28)');
    flareGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm Sinking Sun Orb
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#f97316');
    sunGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Crepuscular Sunset Rays
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fde047';
    for (let r = -4; r <= 4; r++) {
      const angle = r * 0.2 + Math.sin(time * 0.0004) * 0.03;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle - 1.4) * 1700, sunY + Math.sin(angle - 1.4) * 1700);
      ctx.lineTo(sunX + Math.cos(angle - 1.25) * 1700, sunY + Math.sin(angle - 1.25) * 1700);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // --- LUMINOUS NIGHT SYSTEM (Bright, Clear & Enchanting) ---

  private renderNightStarsAndAurora(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    // 1. Soft Cosmic Aurora Ribbon
    ctx.save();
    const auroraGrad = ctx.createLinearGradient(0, 0, w, h * 0.45);
    auroraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
    auroraGrad.addColorStop(0.3, `rgba(56, 189, 248, ${0.08 + Math.sin(time * 0.0008) * 0.03})`);
    auroraGrad.addColorStop(0.65, `rgba(168, 85, 247, ${0.09 + Math.cos(time * 0.0007) * 0.03})`);
    auroraGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = auroraGrad;
    ctx.fillRect(0, 0, w, h * 0.55);
    ctx.restore();

    // 2. Twinkling Stars
    ctx.save();
    this.stars.forEach(s => {
      const sx = s.x * w;
      const sy = s.y * h;
      const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
      const curAlpha = Math.max(0.15, Math.min(1.0, s.alpha + twinkle * 0.35));

      if (s.isDiamond && curAlpha > 0.6) {
        // 4-point sparkle star
        ctx.fillStyle = `rgba(224, 242, 254, ${curAlpha})`;
        const sparkSize = s.size * 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - sparkSize);
        ctx.lineTo(sx + s.size * 0.4, sy);
        ctx.lineTo(sx, sy + sparkSize);
        ctx.lineTo(sx - s.size * 0.4, sy);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx - sparkSize, sy);
        ctx.lineTo(sx, sy + s.size * 0.4);
        ctx.lineTo(sx + sparkSize, sy);
        ctx.lineTo(sx, sy - s.size * 0.4);
        ctx.closePath();
        ctx.fill();
      } else {
        // Round twinkling star
        ctx.fillStyle = `rgba(240, 249, 255, ${curAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();

    // 3. Periodic Shooting Stars (Meteors)
    this.updateAndRenderShootingStars(ctx, w, h, time);
  }

  private updateAndRenderShootingStars(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    this.shootingStarTimer++;
    if (this.shootingStarTimer > 180 && Math.random() < 0.04) {
      this.shootingStarTimer = 0;
      const inactive = this.shootingStars.find(s => !s.active);
      if (inactive) {
        inactive.active = true;
        inactive.x = Math.random() * w * 0.85;
        inactive.y = Math.random() * h * 0.35;
        inactive.vx = 7 + Math.random() * 6;
        inactive.vy = 3 + Math.random() * 4;
        inactive.length = 60 + Math.random() * 50;
        inactive.life = 0;
        inactive.maxLife = 28 + Math.random() * 14;
      }
    }

    ctx.save();
    this.shootingStars.forEach(s => {
      if (!s.active) return;
      s.life++;
      s.x += s.vx;
      s.y += s.vy;

      const progress = s.life / s.maxLife;
      const alpha = Math.sin(progress * Math.PI) * 0.85;

      const tailX = s.x - (s.vx / 10) * s.length;
      const tailY = s.y - (s.vy / 10) * s.length;

      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.7, `rgba(186, 230, 253, ${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      if (s.life >= s.maxLife) {
        s.active = false;
      }
    });
    ctx.restore();
  }

  private renderFadingStars(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    maxAlpha: number
  ) {
    ctx.save();
    this.stars.slice(0, 45).forEach(s => {
      const sx = s.x * w;
      const sy = s.y * h * 0.6;
      const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
      const curAlpha = Math.max(0.05, Math.min(maxAlpha, s.alpha * maxAlpha + twinkle * 0.1));
      ctx.fillStyle = `rgba(255, 255, 255, ${curAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  private renderNightMoon(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    const moonX = w * 0.74;
    const moonY = h * 0.20;
    const moonRadius = 42;

    // 1. Ethereal Moonlit Aura & Halo (Expands soft light into the night)
    const moonHalo = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.8, moonX, moonY, w * 0.48);
    moonHalo.addColorStop(0, 'rgba(224, 242, 254, 0.75)');
    moonHalo.addColorStop(0.18, 'rgba(186, 230, 253, 0.42)');
    moonHalo.addColorStop(0.45, 'rgba(56, 189, 248, 0.16)');
    moonHalo.addColorStop(0.8, 'rgba(99, 102, 241, 0.05)');
    moonHalo.addColorStop(1, 'rgba(3, 7, 18, 0)');
    ctx.fillStyle = moonHalo;
    ctx.fillRect(0, 0, w, h);

    // 2. Luminous Silver Full Moon Core
    const moonGrad = ctx.createRadialGradient(moonX - 10, moonY - 10, 4, moonX, moonY, moonRadius);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.4, '#f1f5f9');
    moonGrad.addColorStop(0.85, '#cbd5e1');
    moonGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Delicate Lunar Maria (Craters / Soft Surface Textures)
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
    ctx.beginPath();
    ctx.ellipse(moonX - 12, moonY - 8, 11, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(moonX + 10, moonY + 12, 14, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(moonX + 4, moonY - 14, 8, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(moonX - 14, moonY + 14, 9, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Brilliant Moon Rim Glow
    ctx.save();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 5. Gentle Moonbeams / Silver Light Shafts
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#bae6fd';
    for (let r = -3; r <= 3; r++) {
      const angle = r * 0.2 + Math.sin(time * 0.0003 + r) * 0.03;
      ctx.beginPath();
      ctx.moveTo(moonX, moonY);
      ctx.lineTo(moonX + Math.cos(angle + 1.2) * 1600, moonY + Math.sin(angle + 1.2) * 1600);
      ctx.lineTo(moonX + Math.cos(angle + 1.32) * 1600, moonY + Math.sin(angle + 1.32) * 1600);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // --- PARALLAX MOUNTAINS & LANDMARKS ---

  private renderParallaxMountains(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    w: number,
    h: number,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    const horizonY = h * 0.68;

    // Palette per time of day
    let layer1Color = 'rgba(79, 70, 229, 0.45)';
    let layer2Color = 'rgba(91, 33, 182, 0.65)';
    let mistColor1 = 'rgba(251, 146, 60, 0.25)';
    let mistColor2 = 'rgba(244, 114, 182, 0.4)';
    let monolithCore = '#fde047';
    let rimLightColor: string | null = null;

    switch (timeOfDay) {
      case 'DAWN':
        layer1Color = 'rgba(99, 102, 241, 0.42)'; // Misty lavender peaks
        layer2Color = 'rgba(109, 40, 217, 0.62)'; // Morning pine ridges
        mistColor1 = 'rgba(251, 146, 60, 0.28)';
        mistColor2 = 'rgba(244, 114, 182, 0.35)';
        monolithCore = '#fde047';
        break;

      case 'DAY':
        layer1Color = 'rgba(30, 58, 138, 0.38)'; // Distant alpine peaks
        layer2Color = 'rgba(20, 83, 45, 0.65)';  // Verdant emerald ridges
        mistColor1 = 'rgba(186, 230, 253, 0.22)';
        mistColor2 = 'rgba(224, 242, 254, 0.35)';
        monolithCore = '#38bdf8';
        break;

      case 'DUSK':
        layer1Color = 'rgba(76, 29, 149, 0.65)'; // Twilight royal peaks
        layer2Color = 'rgba(67, 16, 42, 0.78)';  // Warm obsidian ridges
        mistColor1 = 'rgba(234, 88, 12, 0.32)';
        mistColor2 = 'rgba(192, 38, 211, 0.42)';
        monolithCore = '#f97316';
        rimLightColor = 'rgba(251, 191, 36, 0.55)'; // Amber sunset rim
        break;

      case 'NIGHT':
        // Slate-navy mountain silhouettes with luminous silver moonlight rim lighting!
        layer1Color = 'rgba(15, 23, 42, 0.78)'; // Luminous deep slate
        layer2Color = 'rgba(10, 18, 36, 0.88)'; // Sharp obsidian crags
        mistColor1 = 'rgba(30, 58, 138, 0.25)';
        mistColor2 = 'rgba(15, 23, 42, 0.55)';
        monolithCore = '#38bdf8'; // Glowing cyan mana crystal
        rimLightColor = 'rgba(147, 197, 253, 0.65)'; // Bright silver-blue moonlight rim!
        break;
    }

    // Layer 1: Distant Peaks (Parallax factor 0.04)
    const p1 = camera.x * 0.04;
    ctx.fillStyle = layer1Color;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = -200; x <= w + 200; x += 55) {
      const worldDistX = x + p1;
      const peak =
        Math.sin(worldDistX * 0.003) * 125 +
        Math.cos(worldDistX * 0.008) * 60 +
        Math.sin(worldDistX * 0.018) * 28;
      ctx.lineTo(x, horizonY - 150 - peak);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Floating Sanctuaries & Citadels
    for (let i = 0; i < 5; i++) {
      const islandX = ((i * 380 - p1 * 1.5) % (w + 400)) - 100;
      const islandY = horizonY - 260 - Math.sin(i * 2.3 + time * 0.0007) * 18;
      this.drawSkyIsland(ctx, islandX, islandY, 80, 70, monolithCore, timeOfDay);
    }

    // Layer 2: Mid Crags & Ridges (Parallax factor 0.09)
    const p2 = camera.x * 0.09;
    ctx.fillStyle = layer2Color;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 30);
    const ridgePoints: { x: number; y: number }[] = [];
    for (let x = -200; x <= w + 200; x += 45) {
      const worldDistX = x + p2;
      const peak =
        Math.sin(worldDistX * 0.006 + 1.2) * 95 +
        Math.cos(worldDistX * 0.014) * 45;
      const ry = horizonY - 70 - peak;
      ridgePoints.push({ x, y: ry });
      ctx.lineTo(x, ry);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Moonlight or Sunset Rim Lighting on Ridge Edges (ensures mountains are never lost in darkness)
    if (rimLightColor && ridgePoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = rimLightColor;
      ctx.lineWidth = timeOfDay === 'NIGHT' ? 2.5 : 2.0;
      ctx.shadowColor = rimLightColor;
      ctx.shadowBlur = timeOfDay === 'NIGHT' ? 12 : 6;
      ctx.beginPath();
      ctx.moveTo(ridgePoints[0].x, ridgePoints[0].y);
      for (let i = 1; i < ridgePoints.length; i++) {
        ctx.lineTo(ridgePoints[i].x, ridgePoints[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Layer 3: Horizon Valley Mist & Atmosphere
    const mistGrad = ctx.createLinearGradient(0, horizonY - 50, 0, h);
    mistGrad.addColorStop(0, mistColor1);
    mistGrad.addColorStop(0.5, mistColor2);
    mistGrad.addColorStop(1, 'rgba(10, 15, 30, 0.7)');

    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, horizonY - 50, w, h - (horizonY - 50));
  }

  private drawSkyIsland(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    coreColor: string,
    timeOfDay: TimeOfDay
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = timeOfDay === 'DAY' ? '#1e3a5f' : timeOfDay === 'NIGHT' ? '#0f172a' : '#2d1537';
    ctx.fill();

    // Inverted stalactite underside
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.42, cy);
    ctx.lineTo(cx + w * 0.42, cy);
    ctx.lineTo(cx + 4, cy + h);
    ctx.lineTo(cx - 4, cy + h);
    ctx.closePath();
    ctx.fillStyle = timeOfDay === 'DAY' ? '#172554' : timeOfDay === 'NIGHT' ? '#090d16' : '#1e0828';
    ctx.fill();

    // Spire / Castle Tower on Top
    ctx.fillStyle = timeOfDay === 'DAY' ? '#334155' : '#1e293b';
    ctx.fillRect(cx - 8, cy - 18, 16, 18);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 18);
    ctx.lineTo(cx, cy - 32);
    ctx.lineTo(cx + 10, cy - 18);
    ctx.closePath();
    ctx.fill();

    // Glowing core crystal / beacon
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.35, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (timeOfDay === 'NIGHT') {
      // Moonlight halo on island top
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.45, h * 0.2, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- ATMOSPHERE: CLOUDS, BIRDS & MOTES ---

  public renderAtmosphere(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    time: number,
    timeOfDay: TimeOfDay = 'DAY'
  ) {
    this.renderClouds(ctx, camera, time, timeOfDay);
    this.renderWildlife(ctx, time, timeOfDay);
    this.renderAmbientMotes(ctx, time, timeOfDay);
  }

  private renderClouds(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    ctx.save();
    let bodyColor = 'rgba(255, 255, 255, 0.65)';
    let rimColor = 'rgba(186, 230, 253, 0.35)';

    switch (timeOfDay) {
      case 'DAWN':
        bodyColor = 'rgba(251, 207, 232, 0.55)';
        rimColor = 'rgba(254, 240, 138, 0.45)';
        break;
      case 'DAY':
        bodyColor = 'rgba(255, 255, 255, 0.70)';
        rimColor = 'rgba(186, 230, 253, 0.40)';
        break;
      case 'DUSK':
        bodyColor = 'rgba(192, 132, 252, 0.55)';
        rimColor = 'rgba(251, 146, 60, 0.45)';
        break;
      case 'NIGHT':
        // Translucent moonlit clouds with soft silver rim
        bodyColor = 'rgba(51, 65, 85, 0.45)';
        rimColor = 'rgba(186, 230, 253, 0.42)';
        break;
    }

    this.clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > 2600) {
        c.x = -2600;
        c.y = -700 + Math.random() * 850;
      }

      const drawX = c.x;
      const drawY = c.y + Math.sin(time * 0.0008 + c.speed) * 12;

      // Cloud body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(drawX, drawY, c.width * 0.45, c.height * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(drawX - c.width * 0.22, drawY + 8, c.width * 0.3, c.height * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(drawX + c.width * 0.22, drawY + 6, c.width * 0.32, c.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rim lighting under / around clouds
      ctx.fillStyle = rimColor;
      ctx.beginPath();
      ctx.ellipse(drawX, drawY + c.height * 0.2, c.width * 0.36, c.height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  private renderWildlife(
    ctx: CanvasRenderingContext2D,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    ctx.save();
    let birdColor = '#ffffff';

    switch (timeOfDay) {
      case 'DAWN':
        birdColor = '#fef08a'; // White/golden morning doves
        break;
      case 'DAY':
        birdColor = '#78350f'; // Soaring mountain hawks
        break;
      case 'DUSK':
        birdColor = '#1e1b4b'; // Dusk crows
        break;
      case 'NIGHT':
        birdColor = '#60a5fa'; // Moonlight bats / luminous night owls
        break;
    }

    ctx.fillStyle = birdColor;
    this.creatures.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.wingPhase += b.wingSpeed;

      if (b.x > 2200) {
        b.x = -2200;
        b.y = -620 + Math.random() * 450;
      }

      const wingY = Math.sin(b.wingPhase) * b.size;

      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.size * 1.6, b.y - wingY);
      ctx.lineTo(b.x - b.size * 0.7, b.y);
      ctx.lineTo(b.x + b.size * 1.6, b.y - wingY);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  private renderAmbientMotes(
    ctx: CanvasRenderingContext2D,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    ctx.save();

    this.motes.forEach(m => {
      m.x += m.vx;
      m.y += m.vy;
      m.life++;

      if (m.life >= m.maxLife || m.y < -1300) {
        m.life = 0;
        m.x = Math.random() * 3200 - 1600;
        m.y = 850 + Math.random() * 450;
      }

      const alpha = Math.sin((m.life / m.maxLife) * Math.PI);
      let r = 254, g = 240, b = 138;

      switch (timeOfDay) {
        case 'DAWN':
          // Warm sunrise sparks & dew
          r = 251; g = 191; b = 36;
          break;
        case 'DAY':
          // Golden dandelion seeds & sun motes
          r = 254; g = 240; b = 138;
          break;
        case 'DUSK':
          // Warm embers & evening fireflies
          r = 249; g = 115; b = 22;
          break;
        case 'NIGHT':
          // Luminous cyan mana wisps & magical fireflies
          if (m.phase > Math.PI) {
            r = 56; g = 189; b = 248; // Spectral cyan
          } else {
            r = 167; g = 243; b = 208; // Glowing jade firefly
          }
          break;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

export const worldBackground = new WorldBackground();
