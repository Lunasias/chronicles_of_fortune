import { EquipmentItem, IsoDirection, CharacterAnimState, PrankState } from './PixelSpriteGenerator';

// =============================================================================
// ASSET CONFIGURATION & 8-DIRECTIONAL MAPPING FOR HIGH-RES SPRITES
// =============================================================================

const CLASS_ASSET_FOLDERS: Record<string, string> = {
  warrior: 'A_female_warrior_knight',
  spellblade: 'A_female_magic_swordsman_with',
  magician: 'A_fair-skinned_sorceress_with_long',
  thief: 'A_fair-skinned_female_assassin_wearing',
  cleric: 'A_young_priestess_with_blonde',
  ranger: 'A_fair-skinned_female_assassin_wearing'
};

const DIR_FILE_MAP: Record<IsoDirection, string> = {
  S: 'south.png',
  SE: 'south-east.png',
  E: 'east.png',
  NE: 'north-east.png',
  N: 'north.png',
  NW: 'north-west.png',
  W: 'west.png',
  SW: 'south-west.png'
};

// Unit direction vectors for 2:1 Isometric Board and Battle Movement
const ISO_DIR_VECTORS: Record<IsoDirection, { x: number; y: number }> = {
  SE: { x: 0.85, y: 0.42 },
  SW: { x: -0.85, y: 0.42 },
  NE: { x: 0.85, y: -0.42 },
  NW: { x: -0.85, y: -0.42 },
  S: { x: 0, y: 0.85 },
  N: { x: 0, y: -0.85 },
  E: { x: 1.0, y: 0 },
  W: { x: -1.0, y: 0 }
};

export class CustomIsometricHeroRenderer {
  private cache = new Map<string, HTMLCanvasElement>();
  private imageStore = new Map<string, HTMLImageElement>();
  private loadedCount = 0;
  private totalToLoad = 0;

  constructor() {
    this.preloadAllClassSprites();
  }

  // =========================================================================
  // PRELOAD & ASSET STORAGE
  // =========================================================================
  private preloadAllClassSprites() {
    const directions: IsoDirection[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
    const uniqueFolders = Array.from(new Set(Object.values(CLASS_ASSET_FOLDERS)));
    const animatedFolders = uniqueFolders;

    this.totalToLoad = uniqueFolders.length * directions.length + animatedFolders.length * directions.length * 8;

    for (const folder of uniqueFolders) {
      for (const dir of directions) {
        const fileName = DIR_FILE_MAP[dir];
        const key = `${folder}_${dir}`;
        const img = new Image();
        const src = `/assets/${folder}/Idle/rotations/${fileName}`;

        img.onload = () => {
          this.loadedCount++;
          // Clear cache on new asset availability to immediately re-render live sprites
          this.cache.clear();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hero-assets-loaded'));
          }
        };
        img.onerror = () => {
          console.warn(`[HeroRenderer] Failed to load sprite: ${src}`);
        };
        img.src = src;
        this.imageStore.set(key, img);

        // Preload multi-frame animations for classes with run/attack sheets
        if (animatedFolders.includes(folder)) {
          const baseName = fileName.replace('.png', '');
          for (let f = 0; f < 4; f++) {
            // Run state frame
            const runKey = `${folder}_run_${dir}_${f}`;
            const runImg = new Image();
            runImg.onload = () => {
              this.loadedCount++;
              this.cache.clear();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hero-assets-loaded'));
              }
            };
            runImg.src = `/assets/${folder}/Run/rotations/${baseName}_${f}.png`;
            this.imageStore.set(runKey, runImg);

            // Attack state frame
            const atkKey = `${folder}_attack_${dir}_${f}`;
            const atkImg = new Image();
            atkImg.onload = () => {
              this.loadedCount++;
              this.cache.clear();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hero-assets-loaded'));
              }
            };
            atkImg.src = `/assets/${folder}/Attack/rotations/${baseName}_${f}.png`;
            this.imageStore.set(atkKey, atkImg);
          }
        }
      }
    }
  }

  private getImage(
    folder: string,
    dir: IsoDirection,
    animState: CharacterAnimState = 'idle',
    frame: number = 0
  ): HTMLImageElement | null {
    if (animState === 'run') {
      const f = frame % 4;
      const runKey = `${folder}_run_${dir}_${f}`;
      const img = this.imageStore.get(runKey);
      if (img && img.complete && img.naturalWidth > 0) {
        return img;
      }
    } else if (animState === 'attack' || animState === 'strike' || animState === 'magic') {
      const f = frame % 4;
      const atkKey = `${folder}_attack_${dir}_${f}`;
      const img = this.imageStore.get(atkKey);
      if (img && img.complete && img.naturalWidth > 0) {
        return img;
      }
    }

    const key = `${folder}_${dir}`;
    const img = this.imageStore.get(key);
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }

  private makeCanvas(w = 144, h = 144): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // =========================================================================
  // PUBLIC ENTRY POINT: Get Cached or Rendered Custom 2.5D Isometric Heroine
  // =========================================================================
  public getHeroSprite(
    classKey: string,
    dir: IsoDirection = 'SE',
    animState: CharacterAnimState = 'idle',
    frame: number = 0,
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null } = {},
    isDarkling: boolean = false,
    prank?: PrankState,
    skinVariant: number = 0
  ): HTMLCanvasElement {
    const weaponId = equipment.weapon?.id || 'default';
    const armorId = equipment.armor?.id || 'default';
    const prankKey = prank?.hasGraffiti
      ? `${prank.graffitiType || 'c'}_${prank.hasAfro ? 'afro' : 'na'}`
      : prank?.hasAfro
      ? 'afro'
      : 'none';

    const f = frame % 8;
    const normClass = this.normalizeClassKey(classKey);
    const cacheKey = `iso_hero_${isDarkling ? 'darkling_' : ''}${normClass}_s${skinVariant}_${dir}_${animState}_${f}_${weaponId}_${armorId}_${prankKey}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(144, 144);

    ctx.save();
    // High-resolution supersampling scale from 96-grid to 144-canvas (1.5x)
    ctx.scale(1.5, 1.5);

    // Dynamic Animation Calculations
    const anim = this.computeAnimation(normClass, dir, animState, f);

    // Character center coordinates in 96x96 virtual space
    const cx = 48 + anim.stepX;
    const cy = 48 + anim.stepY + anim.bob + anim.jumpY;

    // 1. DYNAMIC GROUND SHADOW (Anchored to ground plane at cy + 25)
    this.drawGroundShadow(ctx, cx, 48 + anim.stepY + 25, anim);

    // 2. PRE-SPRITE VISUAL EFFECTS (Back auras, magic circles, shockwaves)
    this.renderPreSpriteFX(ctx, cx, cy, normClass, dir, animState, f, anim, isDarkling);

    // 3. MAIN 8-DIRECTIONAL SPRITE WITH TRANSFORM & SKIN TINTS
    this.renderHeroineSprite(ctx, cx, cy, normClass, dir, animState, f, anim, skinVariant, isDarkling);

    // 4. POST-SPRITE VISUAL EFFECTS (Slash arcs, spells, parry sparks, victory stars)
    this.renderPostSpriteFX(ctx, cx, cy, normClass, dir, animState, f, anim, isDarkling);

    // 5. PRANK OVERLAYS (Graffiti, clown nose, afro)
    if (prank && (prank.hasGraffiti || prank.hasAfro) && !isDarkling) {
      this.renderPrankOverlays(ctx, cx, cy, dir, prank);
    }

    ctx.restore();

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  public normalizeClassKey(rawKey: string): string {
    const k = (rawKey || '').toLowerCase();
    if (k.includes('spellblade') || k.includes('spell') || k.includes('ดาบเวท') || k.includes('magic_sword')) return 'spellblade';
    if (k.includes('warrior') || k.includes('knight') || k.includes('hero') || k === 'player') return 'warrior';
    if (k.includes('magician') || k.includes('mage') || k.includes('wizard') || k.includes('warlock') || k.includes('จอมเวท') || k.includes('witch') || k.includes('แม่มด')) return 'magician';
    if (k.includes('cleric') || k.includes('priest') || k.includes('monk') || k.includes('นักบวช')) return 'cleric';
    if (k.includes('thief') || k.includes('rogue') || k.includes('ninja') || k.includes('assassin') || k.includes('โจร')) return 'thief';
    if (k.includes('ranger') || k.includes('archer') || k.includes('hunter')) return 'thief';
    return 'warrior';
  }

  // =========================================================================
  // DYNAMIC ANIMATION ENGINE (Physics, Vector Strides, Leaps, Recoils)
  // =========================================================================
  private computeAnimation(
    _cls: string,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number
  ) {
    const vec = ISO_DIR_VECTORS[dir] || { x: 0, y: 0 };
    let bob = 0;
    let stepX = 0;
    let stepY = 0;
    let jumpY = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;
    let leanAngle = 0;
    let shadowScale = 1.0;
    let isHurt = false;
    let slashProgress = 0;

    switch (animState) {
      case 'idle': {
        // Natural gentle sinusoidal breathing
        bob = Math.sin((frame / 8) * Math.PI * 2) * 1.5;
        scaleY = 1.0 + Math.sin((frame / 8) * Math.PI * 2) * 0.02;
        shadowScale = 1.0 - (bob / 16);
        break;
      }

      case 'run': {
        // Dynamic 2:1 isometric strides
        const cycle = frame % 6;
        const strides = [0, -3.5, -1.8, 0, 3.5, 1.8];
        const bobs = [-2.2, 0, -2.8, -2.2, 0, -2.8];
        const s = strides[cycle];
        bob = bobs[cycle];

        stepX = s * vec.x * 1.1;
        stepY = s * vec.y * 1.1;

        // Lean forward in movement direction
        if (dir === 'SE' || dir === 'E' || dir === 'NE') leanAngle = 0.08;
        else if (dir === 'SW' || dir === 'W' || dir === 'NW') leanAngle = -0.08;

        // Footfall squash and stretch
        if (cycle === 1 || cycle === 4) {
          scaleX = 1.04;
          scaleY = 0.96;
        } else {
          scaleX = 0.97;
          scaleY = 1.03;
        }
        shadowScale = 0.95 + Math.abs(s) * 0.03;
        break;
      }

      case 'attack': {
        // Explosive forward strike dash with recovery
        const lunges = [0, 8, 18, 22, 12, 4, 1, 0];
        const l = lunges[frame % 8];
        stepX = l * vec.x;
        stepY = l * vec.y;
        bob = -2;
        slashProgress = Math.min(1.0, (frame % 8) / 4);

        if (frame % 8 >= 2 && frame % 8 <= 4) {
          scaleX = 1.08;
          scaleY = 0.95;
        }
        break;
      }

      case 'strike': {
        // Dokapon Heavy Critical Plunge Leap
        const leaps = [2, -14, -28, -34, -18, 0, 0, 0];
        jumpY = leaps[frame % 8];
        slashProgress = Math.min(1.0, (frame % 8) / 5);

        if (frame % 8 === 0) {
          // Crouch charge
          scaleX = 1.1;
          scaleY = 0.9;
        } else if (frame % 8 >= 1 && frame % 8 <= 4) {
          // Aerial flight
          scaleX = 0.92;
          scaleY = 1.1;
          shadowScale = 0.55;
        } else if (frame % 8 === 5) {
          // Impact squash
          scaleX = 1.18;
          scaleY = 0.85;
          shadowScale = 1.35;
        }
        break;
      }

      case 'magic': {
        // Hovering levitation with ethereal wave
        bob = -6 + Math.sin(frame * 0.8) * 2.2;
        scaleY = 1.02;
        shadowScale = 0.75;
        break;
      }

      case 'counter': {
        // Quick defensive backstep & parry brace
        stepX = -vec.x * 6;
        stepY = -vec.y * 6;
        bob = 2;
        scaleX = 0.96;
        scaleY = 1.04;
        break;
      }

      case 'hurt': {
        // Stagger knockback recoil & vibration
        isHurt = true;
        stepX = -vec.x * 10;
        stepY = -vec.y * 10;
        bob = 1;
        leanAngle = dir === 'SE' || dir === 'E' || dir === 'NE' ? -0.15 : 0.15;
        scaleX = 0.95;
        scaleY = 1.05;
        break;
      }

      case 'victory': {
        // Joyful double bounce hop
        const hop = Math.abs(Math.sin(frame * 0.9)) * 8;
        bob = -hop;
        scaleX = hop > 2 ? 0.94 : 1.06;
        scaleY = hop > 2 ? 1.06 : 0.94;
        shadowScale = 1.0 - (hop / 16);
        break;
      }
    }

    return {
      bob,
      stepX,
      stepY,
      jumpY,
      scaleX,
      scaleY,
      leanAngle,
      shadowScale,
      isHurt,
      slashProgress
    };
  }

  // =========================================================================
  // GROUND CONTACT OCCLUSION SHADOW
  // =========================================================================
  private drawGroundShadow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    anim: ReturnType<typeof this.computeAnimation>
  ) {
    const rx = 18 * anim.shadowScale;
    const ry = 8 * anim.shadowScale;

    // Soft ambient outer occlusion
    ctx.fillStyle = 'rgba(3, 7, 18, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sharp inner core ground shadow
    ctx.fillStyle = 'rgba(3, 7, 18, 0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // PRE-SPRITE VISUAL EFFECTS (Drawn behind character)
  // =========================================================================
  private renderPreSpriteFX(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cls: string,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    _anim: ReturnType<typeof this.computeAnimation>,
    isDarkling: boolean
  ) {
    // 1. Darkling Demonic Void Flame Aura
    if (isDarkling) {
      ctx.save();
      const pulse = Math.sin(frame * 0.8) * 3;
      ctx.fillStyle = 'rgba(88, 28, 135, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 24 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Shadow tentacles floating behind
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + frame * 0.2;
        const tx = cx + Math.cos(ang) * (20 + pulse);
        const ty = cy - 8 + Math.sin(ang) * (14 + pulse);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.quadraticCurveTo(cx + Math.cos(ang) * 10, cy - 14, tx, ty);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Thief / Assassin: Subtle Shadow Footstep Motes
    if (cls === 'thief') {
      ctx.save();
      const wave = Math.sin(frame * 0.6) * 2;
      ctx.fillStyle = 'rgba(147, 51, 234, 0.35)';
      ctx.beginPath();
      ctx.arc(cx - 8 + wave, cy + 18, 2, 0, Math.PI * 2);
      ctx.arc(cx + 8 - wave, cy + 19, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Magician: Orbiting Spirit Wisps (3 glowing energy spheres)
    if (cls === 'magician') {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const orbitAngle = frame * 0.18 + (i * Math.PI * 2) / 3;
        const wx = cx + Math.cos(orbitAngle) * 20;
        const wy = cy - 8 + Math.sin(orbitAngle) * 9;

        // Soft ethereal glow
        ctx.fillStyle = i === 0 ? 'rgba(56, 189, 248, 0.4)' : i === 1 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(244, 114, 182, 0.4)';
        ctx.beginPath();
        ctx.arc(wx, wy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(wx, wy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Magic State: Glowing Rotating Runic Circle on Ground
    if (animState === 'magic') {
      ctx.save();
      const circleY = 48 + 24;
      const rot = frame * 0.12;

      ctx.strokeStyle = cls === 'magician' ? '#a855f7' : cls === 'cleric' ? '#fbbf24' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, circleY, 22, 11, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Runic radial spokes
      for (let s = 0; s < 6; s++) {
        const ang = rot + (s * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(cx, circleY);
        ctx.lineTo(cx + Math.cos(ang) * 22, circleY + Math.sin(ang) * 11);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Strike State: Downward Plunge Ground Shockwave
    if (animState === 'strike' && frame % 8 >= 5) {
      ctx.save();
      const shockProgress = (frame % 8 - 4) / 3;
      const r = 26 * shockProgress;
      ctx.strokeStyle = `rgba(251, 191, 36, ${1.0 - shockProgress})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, 48 + 25, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Spellblade: Feathered Wings Gentle Breathing Glow (Warrior has NO wings!)
    if (cls === 'spellblade') {
      const isBack = dir === 'N' || dir === 'NE' || dir === 'NW';
      if (isBack) {
        ctx.save();
        const wingPulse = Math.sin(frame * 0.8) * 2;
        ctx.fillStyle = 'rgba(224, 242, 254, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx - 14, cy - 14, 12, 18 + wingPulse, -0.2, 0, Math.PI * 2);
        ctx.ellipse(cx + 14, cy - 14, 12, 18 + wingPulse, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (cls === 'warrior') {
      // Heavy Steel Pauldrons Metallic Glint (No Wings!)
      ctx.save();
      const glint = (Math.sin(frame * 1.2) + 1) * 0.5;
      ctx.fillStyle = `rgba(251, 191, 36, ${0.25 * glint})`;
      ctx.beginPath();
      ctx.arc(cx - 12, cy - 8, 4, 0, Math.PI * 2);
      ctx.arc(cx + 12, cy - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // MAIN HEROINE SPRITE RENDERING WITH PALETTE / FILTER MODES
  // =========================================================================
  private renderHeroineSprite(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cls: string,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    anim: ReturnType<typeof this.computeAnimation>,
    skinVariant: number,
    isDarkling: boolean
  ) {
    const folder = CLASS_ASSET_FOLDERS[cls] || CLASS_ASSET_FOLDERS['warrior'];
    const img = this.getImage(folder, dir, animState, frame);

    ctx.save();
    ctx.translate(cx, cy);

    // Apply directional lean and squash/stretch physics
    if (anim.leanAngle !== 0) {
      ctx.rotate(anim.leanAngle);
    }
    ctx.scale(anim.scaleX, anim.scaleY);

    // Apply Palette Filter / Tints
    this.applySkinFilter(ctx, skinVariant, isDarkling, anim.isHurt);

    if (img) {
      // Crisp 48x48 pixel art hero sprite drawn centered:
      // Character feet touch the ground plane at y = cy + 25
      const drawW = 48;
      const drawH = 48;
      const drawX = -24;
      const drawY = -23;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Aesthetic fallback mannequin silhouette while asset is loading
      this.drawLoadingSilhouette(ctx, cls);
    }

    ctx.restore();
  }

  private applySkinFilter(
    ctx: CanvasRenderingContext2D,
    skinVariant: number,
    isDarkling: boolean,
    isHurt: boolean
  ) {
    if (isHurt) {
      // Crimson damage hit flash
      ctx.filter = 'brightness(1.4) saturate(5) hue-rotate(-50deg) sepia(0.8)';
      return;
    }

    if (isDarkling) {
      // Demonic purple void fire filter
      ctx.filter = 'contrast(1.25) brightness(0.9) hue-rotate(240deg) saturate(1.8)';
      return;
    }

    switch (skinVariant) {
      case 1:
        // Variant 1: Shadow Knight / Night Assassin / Dark Inquisitor
        ctx.filter = 'contrast(1.2) brightness(0.82) hue-rotate(215deg) saturate(1.1)';
        break;
      case 2:
        // Variant 2: Golden Paladin / Glacial Frost / Celestial Seraph
        ctx.filter = 'brightness(1.08) saturate(1.35) sepia(0.2) hue-rotate(25deg)';
        break;
      case 3:
        // Variant 3: Crimson Sovereign / Plague Necro / Phantom
        ctx.filter = 'contrast(1.18) brightness(0.92) hue-rotate(330deg) saturate(1.5)';
        break;
      default:
        // Variant 0: Natural pristine original sprite artwork
        ctx.filter = 'none';
        break;
    }
  }

  private drawLoadingSilhouette(ctx: CanvasRenderingContext2D, cls: string) {
    const color = cls === 'warrior' ? '#3b82f6' : cls === 'magician' ? '#a855f7' : cls === 'thief' ? '#10b981' : '#f59e0b';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -12, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-8, -4, 16, 24, 4);
    ctx.fill();
  }

  // =========================================================================
  // POST-SPRITE VISUAL EFFECTS (Drawn in front of character)
  // =========================================================================
  private renderPostSpriteFX(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cls: string,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    anim: ReturnType<typeof this.computeAnimation>,
    isDarkling: boolean
  ) {
    const vec = ISO_DIR_VECTORS[dir] || { x: 0, y: 0 };

    // 1. Attack / Strike / Magic Combat State: 8-Directional Slashing Arc & Blade Gleam
    const attackAngle = Math.atan2(vec.y * 1.6, vec.x);

    if (animState === 'attack' && frame % 8 >= 1 && frame % 8 <= 5) {
      ctx.save();
      const slashColor = cls === 'warrior' ? '#38bdf8' : cls === 'spellblade' ? '#ec4899' : cls === 'thief' ? '#f43f5e' : cls === 'magician' ? '#c084fc' : '#fbbf24';
      const arcCenterX = cx + vec.x * 18;
      const arcCenterY = cy + vec.y * 18 - 8;

      // 8-Directional Rotating Blade Arc
      ctx.strokeStyle = slashColor;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, 20, attackAngle - Math.PI * 0.55, attackAngle + Math.PI * 0.55);
      ctx.stroke();

      // Slashing light core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, 19, attackAngle - Math.PI * 0.45, attackAngle + Math.PI * 0.45);
      ctx.stroke();

      // Impact spark motes along 8-directional attack angle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(arcCenterX + Math.cos(attackAngle) * 16, arcCenterY + Math.sin(attackAngle) * 16, 3, 3);
      ctx.fillStyle = slashColor;
      ctx.fillRect(arcCenterX + Math.cos(attackAngle - 0.4) * 14, arcCenterY + Math.sin(attackAngle - 0.4) * 14, 2, 2);
      ctx.fillRect(arcCenterX + Math.cos(attackAngle + 0.4) * 14, arcCenterY + Math.sin(attackAngle + 0.4) * 14, 2, 2);

      // Spellblade Lightning Bolts in 8 directions
      if (cls === 'spellblade') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(arcCenterX, arcCenterY);
        ctx.lineTo(arcCenterX + Math.cos(attackAngle) * 12 + 4, arcCenterY + Math.sin(attackAngle) * 12 - 4);
        ctx.lineTo(arcCenterX + Math.cos(attackAngle) * 24, arcCenterY + Math.sin(attackAngle) * 24);
        ctx.stroke();
      }

      // Thief Dual Poison Blade Slit in 8 directions
      if (cls === 'thief') {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        const perp = attackAngle + Math.PI * 0.5;
        ctx.beginPath();
        ctx.moveTo(arcCenterX + Math.cos(perp) * 10, arcCenterY + Math.sin(perp) * 10);
        ctx.lineTo(arcCenterX - Math.cos(perp) * 10 + Math.cos(attackAngle) * 12, arcCenterY - Math.sin(perp) * 10 + Math.sin(attackAngle) * 12);
        ctx.stroke();
      }

      ctx.restore();
    } else if (animState === 'strike' && frame % 8 >= 3 && frame % 8 <= 6) {
      // 8-Directional Heavy Crushing Strike
      ctx.save();
      const arcCenterX = cx + vec.x * 20;
      const arcCenterY = cy + vec.y * 20 - 8;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, 26, attackAngle - Math.PI * 0.65, attackAngle + Math.PI * 0.65);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, 25, attackAngle - Math.PI * 0.5, attackAngle + Math.PI * 0.5);
      ctx.stroke();

      // Shockwave wedge
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.moveTo(arcCenterX, arcCenterY);
      ctx.arc(arcCenterX, arcCenterY, 32, attackAngle - 0.5, attackAngle + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (animState === 'magic' && frame % 8 >= 2 && frame % 8 <= 6) {
      // 8-Directional Magic Beam & Arcane Blast
      ctx.save();
      const beamColor = cls === 'cleric' ? '#fde047' : '#c084fc';
      const originX = cx + vec.x * 14;
      const originY = cy + vec.y * 14 - 10;
      const targetX = originX + Math.cos(attackAngle) * 36;
      const targetY = originY + Math.sin(attackAngle) * 36;

      ctx.strokeStyle = beamColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Mystic rune circle at tip
      ctx.strokeStyle = beamColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Counter State: Hexagonal Parry Barrier Shield
    if (animState === 'counter') {
      ctx.save();
      const shieldX = cx + vec.x * 12;
      const shieldY = cy - 8;
      const pulse = Math.sin(frame * 0.9) * 2;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const hx = shieldX + Math.cos(ang) * (14 + pulse);
        const hy = shieldY + Math.sin(ang) * (14 + pulse);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Metallic glint star
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(shieldX - 1, shieldY - 5, 2, 10);
      ctx.fillRect(shieldX - 5, shieldY - 1, 10, 2);
      ctx.restore();
    }

    // 3. Victory State: Celebratory Golden Stars & Radiant Shimmer
    if (animState === 'victory') {
      ctx.save();
      const stars = [
        { dx: -14, dy: -28, rot: frame * 0.3 },
        { dx: 14, dy: -32, rot: -frame * 0.3 },
        { dx: 0, dy: -38, rot: frame * 0.4 }
      ];

      for (const st of stars) {
        ctx.save();
        ctx.translate(cx + st.dx, cy + st.dy + anim.bob);
        ctx.rotate(st.rot);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-1.5, -5, 3, 10);
        ctx.fillRect(-5, -1.5, 10, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
      ctx.restore();
    }

    // 4. Cleric: Sacred Holy Sparkles ascending upward
    if (cls === 'cleric' && animState === 'idle') {
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const py = cy + 12 - ((frame * 2 + i * 16) % 36);
        const px = cx - 8 + (i * 16) + Math.sin(frame * 0.5 + i) * 3;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.fillRect(px, py, 1.5, 1.5);
      }
      ctx.restore();
    }

    // 5. Darkling Red Glowing Eyes in combat
    if (isDarkling) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 2, cy - 14, 1.5, 1.5);
      ctx.fillRect(cx + 2, cy - 14, 1.5, 1.5);
      ctx.restore();
    }
  }

  // =========================================================================
  // PRANK OVERLAYS (Graffiti, mustache, swirl eyes, silly afro)
  // =========================================================================
  private renderPrankOverlays(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    dir: IsoDirection,
    prank: PrankState
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const headY = cy - 12;

    if (prank.hasAfro) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, headY - 8, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    if (prank.hasGraffiti && isFront) {
      ctx.save();
      if (prank.graffitiType === 'mustache') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx - 3, headY + 3, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 3, headY + 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (prank.graffitiType === 'clown') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, headY + 1.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - 5, headY - 3, 4, 4);
        ctx.strokeRect(cx + 1, headY - 3, 4, 4);
      }
      ctx.restore();
    }
  }
}

export const customIsometricHeroRenderer = new CustomIsometricHeroRenderer();
