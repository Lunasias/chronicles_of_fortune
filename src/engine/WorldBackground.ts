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

interface AmbientRaven {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wingPhase: number;
  size: number;
}

interface DarkMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class WorldBackground {
  private clouds: DistantCloud[] = [];
  private ravens: AmbientRaven[] = [];
  private motes: DarkMote[] = [];

  constructor() {
    this.initClouds();
    this.initRavens();
    this.initMotes();
  }

  private initClouds() {
    for (let i = 0; i < 20; i++) {
      this.clouds.push({
        x: Math.random() * 3200 - 1600,
        y: -650 + Math.random() * 850,
        width: 160 + Math.random() * 260,
        height: 50 + Math.random() * 65,
        speed: 0.12 + Math.random() * 0.28,
        opacity: 0.35 + Math.random() * 0.45,
        scale: 0.8 + Math.random() * 0.6
      });
    }
  }

  private initRavens() {
    for (let i = 0; i < 8; i++) {
      this.ravens.push({
        x: -900 + i * 50 + Math.random() * 40,
        y: -420 + Math.abs(i - 4) * 25,
        vx: 0.9 + Math.random() * 0.3,
        vy: -0.08 + Math.random() * 0.16,
        wingPhase: Math.random() * Math.PI * 2,
        size: 3.5 + Math.random() * 2.0
      });
    }
  }

  private initMotes() {
    for (let i = 0; i < 75; i++) {
      const type = Math.random();
      let color = 'rgba(239, 68, 68, 0.7)'; // Blood red ember
      if (type > 0.6) color = 'rgba(192, 132, 252, 0.75)'; // Abyssal purple soul
      else if (type > 0.35) color = 'rgba(56, 189, 248, 0.65)'; // Spectral cyan wisp
      else if (type > 0.2) color = 'rgba(251, 191, 36, 0.8)'; // Golden spark

      this.motes.push({
        x: Math.random() * 3200 - 1600,
        y: Math.random() * 2200 - 1100,
        vx: -0.3 + Math.random() * 0.6,
        vy: -0.5 - Math.random() * 0.7,
        size: 1.5 + Math.random() * 3.0,
        color,
        life: Math.random() * 220,
        maxLife: 200 + Math.random() * 160
      });
    }
  }

  public renderSky(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    screenWidth: number,
    screenHeight: number,
    time: number
  ) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. DARK FANTASY TWILIGHT SKY GRADIENT (Corrupted Eclipse Sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, screenHeight);
    skyGrad.addColorStop(0, '#090514');     // Abyssal void zenith
    skyGrad.addColorStop(0.3, '#1a0826');    // Cursed dark violet
    skyGrad.addColorStop(0.6, '#380c1d');    // Blood-tinged midnight red
    skyGrad.addColorStop(0.85, '#681525');   // Burning crimson horizon
    skyGrad.addColorStop(1.0, '#1c050a');    // Scorched earth shadow

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 2. THE BLOOD ECLIPSE SUN (Ominous Dark Fantasy Celestial Disc)
    const sunX = screenWidth * 0.72;
    const sunY = screenHeight * 0.22;
    const sunRadius = 46;

    // Glowing Blood Corona & Solar Flares
    const flareGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.8, sunX, sunY, screenWidth * 0.55);
    flareGrad.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
    flareGrad.addColorStop(0.2, 'rgba(239, 68, 68, 0.5)');
    flareGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
    flareGrad.addColorStop(1, 'rgba(15, 5, 29, 0)');

    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // Black Eclipse Core
    ctx.fillStyle = '#05020a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Fiery Burning Rim around Eclipse
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 28;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Subtle ominous God Rays / Dark Light Beams
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = '#f43f5e';
    for (let r = -4; r <= 4; r++) {
      const angle = (r * 0.16) + Math.sin(time * 0.0004) * 0.04;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle + 1.1) * 1800, sunY + Math.sin(angle + 1.1) * 1800);
      ctx.lineTo(sunX + Math.cos(angle + 1.25) * 1800, sunY + Math.sin(angle + 1.25) * 1800);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. PARALLAX CORRUPTED MOUNTAINS & FLOATING MONOLITHS
    this.renderDarkParallaxMountains(ctx, camera, screenWidth, screenHeight, time);

    ctx.restore();
  }

  private renderDarkParallaxMountains(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    w: number,
    h: number,
    time: number
  ) {
    const horizonY = h * 0.68;

    // Layer 1: Distant Jagged Peaks & Ruined Citadels (Parallax factor 0.04)
    const p1 = camera.x * 0.04;
    ctx.fillStyle = 'rgba(28, 10, 36, 0.65)'; // Deep cursed violet silhouette
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

    // Floating Inverted Monoliths & Cursed Chained Keeps
    ctx.fillStyle = 'rgba(20, 6, 28, 0.75)';
    for (let i = 0; i < 5; i++) {
      const islandX = ((i * 380 - p1 * 1.5) % (w + 400)) - 100;
      const islandY = horizonY - 260 - Math.sin(i * 2.3 + time * 0.0007) * 18;
      this.drawDarkMonolith(ctx, islandX, islandY, 80, 70);
    }

    // Layer 2: Mid Jagged Basalt Ridges (Parallax factor 0.09)
    const p2 = camera.x * 0.09;
    ctx.fillStyle = 'rgba(48, 12, 28, 0.75)'; // Blood-tinted obsidian crags
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 30);
    for (let x = -200; x <= w + 200; x += 45) {
      const worldDistX = x + p2;
      const peak =
        Math.sin(worldDistX * 0.006 + 1.2) * 95 +
        Math.cos(worldDistX * 0.014) * 45;
      ctx.lineTo(x, horizonY - 70 - peak);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Horizon Crimson Mist & Ghost Shimmer
    const mistGrad = ctx.createLinearGradient(0, horizonY - 50, 0, h);
    mistGrad.addColorStop(0, 'rgba(159, 18, 57, 0.25)');
    mistGrad.addColorStop(0.4, 'rgba(88, 28, 135, 0.45)');
    mistGrad.addColorStop(0.7, 'rgba(20, 6, 12, 0.75)');
    mistGrad.addColorStop(1, 'rgba(10, 2, 8, 0.9)');

    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, horizonY - 50, w, h - (horizonY - 50));
  }

  private drawDarkMonolith(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ) {
    ctx.save();
    ctx.beginPath();
    // Diamond top
    ctx.ellipse(cx, cy, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed inverted stalactite underside
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.42, cy);
    ctx.lineTo(cx + w * 0.42, cy);
    ctx.lineTo(cx + 4, cy + h);
    ctx.lineTo(cx - 4, cy + h);
    ctx.closePath();
    ctx.fill();

    // Gothic spire / ruin outline on top
    ctx.fillRect(cx - 8, cy - 18, 16, 18);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 18);
    ctx.lineTo(cx, cy - 32);
    ctx.lineTo(cx + 10, cy - 18);
    ctx.closePath();
    ctx.fill();

    // Glowing red soul eye / rune in monolith core
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.35, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public renderAtmosphere(ctx: CanvasRenderingContext2D, camera: CameraViewport, time: number) {
    // 3. DARK FANTASY WORLD SPACE CLOUDS, RAVENS & EMBERS (Inside camera transform)
    this.renderDarkClouds(ctx, camera, time);
    this.renderRavens(ctx, time);
    this.renderEmbers(ctx);
  }

  private renderDarkClouds(ctx: CanvasRenderingContext2D, camera: CameraViewport, time: number) {
    ctx.save();
    this.clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > 2600) {
        c.x = -2600;
        c.y = -700 + Math.random() * 850;
      }

      const drawX = c.x;
      const drawY = c.y + Math.sin(time * 0.0008 + c.speed) * 12;

      // Storm cloud body
      ctx.fillStyle = `rgba(38, 16, 42, ${c.opacity * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(drawX, drawY, c.width * 0.45, c.height * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(drawX - c.width * 0.22, drawY + 8, c.width * 0.3, c.height * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(drawX + c.width * 0.22, drawY + 6, c.width * 0.32, c.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blood-crimson rim lighting under clouds
      ctx.fillStyle = `rgba(159, 18, 57, ${c.opacity * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(drawX, drawY + c.height * 0.2, c.width * 0.36, c.height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  private renderRavens(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.fillStyle = '#0a030f'; // Jet black raven silhouette
    this.ravens.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.wingPhase += 0.16;

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

  private renderEmbers(ctx: CanvasRenderingContext2D) {
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
      ctx.fillStyle = m.color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

export const worldBackground = new WorldBackground();
