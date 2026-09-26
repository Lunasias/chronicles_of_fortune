import { TimeOfDay } from '../game/EcosystemSystem';
import { SKY_TILE_W, skyRenderer } from './SkyRenderer';

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

    // 1. BANDED PIXEL SKY PER TIME OF DAY
    this.renderSkyGradient(ctx, screenWidth, screenHeight, timeOfDay, time);

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

  // --- BANDED PIXEL SKY ---
  /**
   * Blits the banded sky strip.
   *
   * The strip is `SKY_TILE_W` wide and tiles horizontally. Every row of it is a single flat
   * colour, so stretching the tile to the viewport width and height cannot blur anything - which
   * is why a full-height sky costs one 64-wide canvas instead of a screen-sized buffer per time
   * of day. `imageSmoothingEnabled` is off anyway, so even the horizontal stretch is nearest
   * neighbour.
   */
  private renderSkyGradient(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    screenHeight: number,
    timeOfDay: TimeOfDay,
    time: number
  ) {
    const sky = skyRenderer.getSky(timeOfDay, screenHeight);
    ctx.imageSmoothingEnabled = false;
    // A slow horizontal drift, rounded to whole pixels so the dither never shimmers.
    const drift = Math.round((time * 0.002) % SKY_TILE_W);
    for (let x = -SKY_TILE_W + drift; x < screenWidth + SKY_TILE_W; x += SKY_TILE_W) {
      ctx.drawImage(sky, x, 0, SKY_TILE_W, screenHeight);
    }
  }

  // --- CELESTIAL BODIES ---

  /**
   * A sun or moon blitted from a painted disc.
   *
   * The halo used to be a `createRadialGradient`; it is now a set of ordered-dither rings inside
   * the sprite, which is how a pixel artist implies a glow. `crescent` draws the moon's disc
   * minus an offset disc.
   */
  private renderCelestial(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    const config = {
      DAWN: { x: 0.72, y: 0.38, r: 40, bob: 6, crescent: false },
      DAY: { x: 0.76, y: 0.24, r: 46, bob: 8, crescent: false },
      DUSK: { x: 0.7, y: 0.62, r: 44, bob: 10, crescent: false },
      NIGHT: { x: 0.76, y: 0.2, r: 34, bob: 5, crescent: true }
    }[timeOfDay as 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT'];

    const bob = Math.round(Math.sin(time * 0.0004) * config.bob);
    const sprite = skyRenderer.getCelestial(config.r, timeOfDay, config.crescent);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      Math.round(w * config.x - sprite.width / 2),
      Math.round(h * config.y - sprite.height / 2) + bob
    );
  }

  private renderDawnSun(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    this.renderCelestial(ctx, w, h, time, 'DAWN');
  }

  private renderDaySun(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    this.renderCelestial(ctx, w, h, time, 'DAY');
  }

  private renderDuskSun(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    this.renderCelestial(ctx, w, h, time, 'DUSK');
  }

  private renderNightMoon(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    this.renderCelestial(ctx, w, h, time, 'NIGHT');
  }

  // --- LUMINOUS NIGHT SYSTEM (Bright, Clear & Enchanting) ---

  /**
   * Aurora bands, stars and shooting stars.
   *
   * The aurora was a rotated linear gradient; it is now discrete bands so it matches the sky.
   * Stars and shooting stars are integer `fillRect` blocks rather than `ctx.arc`, because a
   * one-pixel star is the point.
   */
  private renderNightStarsAndAurora(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    // Aurora: four bands leaning across the upper sky, each a row of integer dashes so the band
    // has a marching, patterned edge instead of a soft gradient end.
    const bands = [
      { y: h * 0.1, amp: 26, color: 'rgba(52, 211, 153, 0.22)', period: 190 },
      { y: h * 0.16, amp: 34, color: 'rgba(56, 189, 248, 0.18)', period: 240 },
      { y: h * 0.22, amp: 22, color: 'rgba(192, 132, 252, 0.16)', period: 300 },
      { y: h * 0.28, amp: 40, color: 'rgba(167, 243, 208, 0.12)', period: 360 }
    ];
    for (const band of bands) {
      ctx.fillStyle = band.color;
      for (let x = 0; x < w; x += 3) {
        const y = band.y + Math.sin((x + time * 0.02) / band.period) * band.amp;
        // Vertical falloff in coarse steps, so the band fades by getting sparser rather than by
        // getting more transparent.
        const rows = 10 + Math.round(Math.sin(x / 90) * 5);
        for (let k = 0; k < rows; k += 2) {
          if ((x / 3 + k) % 3 === 0) continue;
          ctx.fillRect(x, Math.round(y + k), 3, 1);
        }
      }
    }

    this.updateAndRenderShootingStars(ctx, w, h, time);

    for (const s of this.stars) {
      const twinkle = 0.45 + Math.abs(Math.sin(time * s.twinkleSpeed + s.twinkleOffset)) * 0.55;
      ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha * twinkle})`;
      const size = Math.max(1, Math.round(s.size));
      if (s.isDiamond) {
        // A four-pixel plus: the pixel-art idiom for a bright star.
        ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 3, 1);
        ctx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 3);
      } else {
        ctx.fillRect(Math.round(s.x), Math.round(s.y), size, size);
      }
    }
  }

  private renderFadingStars(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    alpha: number
  ) {
    for (const s of this.stars) {
      const twinkle = 0.4 + Math.abs(Math.sin(time * s.twinkleSpeed + s.twinkleOffset)) * 0.6;
      ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha * twinkle * alpha})`;
      const size = Math.max(1, Math.round(s.size));
      ctx.fillRect(Math.round(s.x), Math.round(s.y), size, size);
    }
  }

  private updateAndRenderShootingStars(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number
  ) {
    this.shootingStarTimer++;
    if (this.shootingStarTimer > 260 + Math.random() * 320) {
      this.shootingStarTimer = 0;
      const star = this.shootingStars.find(s => !s.active);
      if (star) {
        star.active = true;
        star.life = 0;
        star.maxLife = 50 + Math.random() * 40;
        star.x = w * (0.15 + Math.random() * 0.6);
        star.y = h * (0.05 + Math.random() * 0.3);
        star.vx = 5 + Math.random() * 4;
        star.vy = 2 + Math.random() * 2;
        star.length = 50 + Math.random() * 60;
      }
    }

    for (const s of this.shootingStars) {
      if (!s.active) continue;
      s.life++;
      s.x += s.vx;
      s.y += s.vy;
      if (s.life >= s.maxLife) {
        s.active = false;
        continue;
      }

      const fade = 1 - s.life / s.maxLife;
      // A staircase tail of integer blocks, tapering as it goes, rather than a gradient stroke.
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const bx = Math.round(s.x - s.vx * (s.length / 12) * t);
        const by = Math.round(s.y - s.vy * (s.length / 12) * t);
        const a = fade * (1 - t) * 0.9;
        ctx.fillStyle = `rgba(226, 232, 240, ${a})`;
        const size = t < 0.25 ? 2 : 1;
        ctx.fillRect(bx, by, size, size);
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
  }

  // --- PARALLAX MOUNTAINS & LANDMARKS ---

  /**
   * Two parallax mountain ridges and a banded valley mist.
   *
   * The ridges kept their authored sine profile but are now drawn one integer column at a time
   * and rounded, so the peaks are stair-stepped instead of a smooth polygon. The rim light used
   * `shadowBlur`, which is a Gaussian blur in a game with no other blur anywhere; it is now a
   * dotted one-pixel line, and the mist is four dithered bands instead of a linear gradient.
   */
  private renderParallaxMountains(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    w: number,
    h: number,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    const horizonY = h * 0.68;

    let layer1Color = 'rgba(79, 70, 229, 0.45)';
    let layer2Color = 'rgba(91, 33, 182, 0.65)';
    let mistColor1 = 'rgba(251, 146, 60, 0.25)';
    let mistColor2 = 'rgba(244, 114, 182, 0.4)';
    let rimLightColor: string | null = null;

    switch (timeOfDay) {
      case 'DAWN':
        layer1Color = 'rgba(99, 102, 241, 0.42)';
        layer2Color = 'rgba(109, 40, 217, 0.62)';
        mistColor1 = 'rgba(251, 146, 60, 0.28)';
        mistColor2 = 'rgba(244, 114, 182, 0.35)';
        break;
      case 'DAY':
        layer1Color = 'rgba(30, 58, 138, 0.38)';
        layer2Color = 'rgba(20, 83, 45, 0.65)';
        mistColor1 = 'rgba(186, 230, 253, 0.22)';
        mistColor2 = 'rgba(224, 242, 254, 0.35)';
        break;
      case 'DUSK':
        layer1Color = 'rgba(76, 29, 149, 0.65)';
        layer2Color = 'rgba(67, 16, 42, 0.78)';
        mistColor1 = 'rgba(234, 88, 12, 0.32)';
        mistColor2 = 'rgba(192, 38, 211, 0.42)';
        rimLightColor = 'rgba(251, 191, 36, 0.55)';
        break;
      case 'NIGHT':
        layer1Color = 'rgba(15, 23, 42, 0.78)';
        layer2Color = 'rgba(10, 18, 36, 0.88)';
        mistColor1 = 'rgba(30, 58, 138, 0.25)';
        mistColor2 = 'rgba(15, 23, 42, 0.55)';
        rimLightColor = 'rgba(147, 197, 253, 0.65)';
        break;
    }

    const ridge = (
      color: string,
      parallax: number,
      baseline: number,
      lift: number,
      freq: { a: number; b: number; phase: number },
      fillToBottom: boolean
    ): number[] => {
      const p = camera.x * parallax;
      const heights: number[] = [];
      ctx.fillStyle = color;
      for (let x = -200; x <= w + 200; x++) {
        const wx = x + p;
        const peak =
          Math.sin(wx * freq.a) * 125 + Math.cos(wx * freq.b + freq.phase) * 60;
        const y = Math.round(baseline - lift - peak);
        heights.push(y);
        // One integer column per screen pixel: a stair-stepped ridge, drawn with fillRect so it
        // cannot antialias.
        ctx.fillRect(x, y, 1, fillToBottom ? h - y : 0);
      }
      return heights;
    };

    // Layer 1: distant peaks, silhouette only.
    const far = ridge(layer1Color, 0.04, horizonY, 150, { a: 0.003, b: 0.008, phase: 0 }, true);

    // Layer 2: mid ridges, filled down to the bottom of the screen.
    const near = ridge(layer2Color, 0.09, horizonY + 30, 70, { a: 0.006, b: 0.014, phase: 1.2 }, true);

    // Rim light along the near ridge: a dotted one-pixel line, so a lit peak reads without a
    // Gaussian blur.
    if (rimLightColor) {
      ctx.fillStyle = rimLightColor;
      for (let x = 0; x < w; x++) {
        const y = near[x + 200];
        if (y === undefined) continue;
        // Denser along the upper edges, sparser down the slopes.
        if (x % 3 === 0 || near[x + 199] !== y || near[x + 201] !== y) ctx.fillRect(x, y, 1, 1);
      }
    }

    // Valley mist: four dithered bands. A gradient here would be the only smooth ramp left in the
    // whole background.
    const mistTop = Math.round(horizonY - 50);
    const mistRows = h - mistTop;
    const bands = [mistColor1, mistColor1, mistColor2, mistColor2];
    for (let i = 0; i < bands.length; i++) {
      const y0 = mistTop + Math.round((mistRows * i) / bands.length);
      const y1 = mistTop + Math.round((mistRows * (i + 1)) / bands.length);
      ctx.fillStyle = bands[i];
      for (let y = y0; y < y1; y++) ctx.fillRect(0, y, w, 1);
    }
    // The deepest band is the fog the continent rises out of.
    ctx.fillStyle = 'rgba(10, 15, 30, 0.7)';
    for (let y = mistTop + Math.round(mistRows * 0.75); y < h; y++) ctx.fillRect(0, y, w, 1);

    // A bright waterline where the mist meets the horizon, so the far ridge does not just stop.
    ctx.fillStyle = mistColor2;
    for (let x = 0; x < w; x += 2) {
      const y = far[x + 200];
      if (y === undefined) continue;
      ctx.fillRect(x, y + 1, 1, 1);
    }
    void time;
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

  /**
   * World-space clouds blitted from painted sprites.
   *
   * The sprite is chosen by size bucket and shape index and blitted 1:1; the old version drew
   * three `ctx.ellipse` calls per cloud per frame, which antialiased and never cached.
   */
  private renderClouds(
    ctx: CanvasRenderingContext2D,
    camera: CameraViewport,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    ctx.imageSmoothingEnabled = false;
    this.clouds.forEach((c, i) => {
      c.x += c.speed;
      if (c.x > 2600) {
        c.x = -2600;
        c.y = -700 + Math.random() * 850;
      }

      const drawX = Math.round(c.x);
      const drawY = Math.round(c.y + Math.sin(time * 0.0008 + c.speed) * 12);
      const sizeIndex = c.width < 220 ? 0 : c.width < 330 ? 1 : 2;
      const sprite = skyRenderer.getCloud('sky', i % 3, sizeIndex, timeOfDay);
      ctx.globalAlpha = Math.min(1, c.opacity + 0.25);
      ctx.drawImage(sprite, drawX - Math.round(sprite.width / 2), drawY - Math.round(sprite.height / 2));
    });
    ctx.globalAlpha = 1;
    void camera;
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

      // A bird is three to five integer blocks: a body and two wings whose flap height is
      // rounded. Drawing it as a polygon - which is what this used to do - antialiases the wing
      // tips of a sprite that is only a few pixels across to begin with.
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      const span = Math.max(2, Math.round(b.size * 1.6));
      const wing = Math.round(Math.sin(b.wingPhase) * b.size);
      ctx.fillRect(bx, by, 2, 1);
      // Left and right wings, mirrored, so a flap reads as a flap rather than a drift.
      for (let i = 1; i <= span; i++) {
        const drop = Math.round((wing * i) / span);
        ctx.fillRect(bx - i, by - drop, 1, 1);
        ctx.fillRect(bx + 1 + i, by - drop, 1, 1);
      }
      // The body sits one pixel below the wing line, so the bird has a direction.
      ctx.fillRect(bx, by + 1, 2, 1);
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
      // A mote is a plus of integer blocks with a brighter centre, not a ctx.arc circle: at this
      // size an antialiased circle is a grey smudge rather than a spark.
      const mx = Math.round(m.x);
      const my = Math.round(m.y);
      const size = Math.max(1, Math.round(m.size));
      for (let i = -size; i <= size; i++) {
        ctx.fillRect(mx + i, my, 1, 1);
        ctx.fillRect(mx, my + i, 1, 1);
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.fillRect(mx, my, 1, 1);
    });
    ctx.restore();
  }

  /**
   * The cloud sea the floating continent rises out of.
   *
   * This is a world-space layer drawn between the sky and the terrain, so it parallaxes with the
   * board instead of sliding past it, and it is drawn BELOW the board's lowest tile so the
   * continent reads as floating rather than as a map printed on a wall. Two rows: a far row of
   * larger, darker clouds higher up, and a near row of brighter ones lower down, which is what
   * gives the layer depth without a fog gradient.
   *
   * `bounds` is the terrain's world-space extent, which the renderer already computes for its
   * frustum culling.
   */
  public renderCloudSea(
    ctx: CanvasRenderingContext2D,
    time: number,
    timeOfDay: TimeOfDay,
    bounds: { minX: number; maxX: number; maxY: number }
  ) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const span = Math.max(600, bounds.maxX - bounds.minX);
    const rows: Array<{ dy: number; alpha: number; sizes: number[]; step: number }> = [
      { dy: 46, alpha: 0.5, sizes: [2, 1, 2, 0], step: 260 },
      { dy: 108, alpha: 0.72, sizes: [1, 2, 0, 1], step: 210 },
      { dy: 178, alpha: 0.9, sizes: [2, 2, 1, 2], step: 250 }
    ];

    rows.forEach((row, rowIndex) => {
      const y = Math.round(bounds.maxY + row.dy);
      // A slow drift, offset per row so the layers do not move as one block.
      const drift = time * (0.012 + rowIndex * 0.008);
      const count = Math.max(4, Math.ceil(span / row.step) + 3);
      ctx.globalAlpha = row.alpha;
      for (let i = 0; i < count; i++) {
        const x = Math.round(bounds.minX - row.step + i * row.step + (drift % row.step));
        const sizeIndex = row.sizes[i % row.sizes.length];
        const variant = (i + rowIndex) % 3;
        const sprite = skyRenderer.getCloud('sea', variant, sizeIndex, timeOfDay);
        // Every other cloud is nudged vertically so the row is not a ruler-straight line.
        const bob = (i % 2 === 0 ? 1 : -1) * 9;
        ctx.drawImage(sprite, x, y + bob - Math.round(sprite.height / 2));
      }
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export const worldBackground = new WorldBackground();
