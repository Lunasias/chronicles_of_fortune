import { EquipmentItem, IsoDirection, CharacterAnimState, PrankState } from './PixelSpriteGenerator';

export class CustomIsometricHeroRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  private makeCanvas(w = 96, h = 96): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // =========================================================================
  // PUBLIC ENTRY POINT: Get Cached or Rendered Custom 2.5D Isometric Hero
  // =========================================================================
  public getHeroSprite(
    classKey: string,
    dir: IsoDirection = 'SE',
    animState: CharacterAnimState = 'idle',
    frame: number = 0,
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null } = {},
    isDarkling: boolean = false,
    prank?: PrankState
  ): HTMLCanvasElement {
    const weaponId = equipment.weapon?.id || 'default';
    const armorId = equipment.armor?.id || 'default';
    const prankKey = prank?.hasGraffiti
      ? `${prank.graffitiType || 'c'}_${prank.hasAfro ? 'afro' : 'na'}`
      : prank?.hasAfro
      ? 'afro'
      : 'none';

    const f = frame % 8;
    const cacheKey = `custom_iso_${isDarkling ? 'darkling' : classKey}_${dir}_${animState}_${f}_${weaponId}_${armorId}_${prankKey}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(96, 96);

    // Calculate dynamic animation offsets
    const animOffsets = this.getAnimationOffsets(dir, animState, f);

    // Render the custom 2.5D Isometric Character
    if (isDarkling) {
      this.renderDarkling(ctx, dir, animState, f, animOffsets);
    } else {
      const normalizedClass = this.normalizeClassKey(classKey);
      switch (normalizedClass) {
        case 'warrior':
          this.renderWarrior(ctx, dir, animState, f, animOffsets, equipment);
          break;
        case 'magician':
          this.renderMagician(ctx, dir, animState, f, animOffsets, equipment);
          break;
        case 'cleric':
          this.renderCleric(ctx, dir, animState, f, animOffsets, equipment);
          break;
        case 'thief':
          this.renderThief(ctx, dir, animState, f, animOffsets, equipment);
          break;
        case 'ranger':
          this.renderRanger(ctx, dir, animState, f, animOffsets, equipment);
          break;
        default:
          this.renderWarrior(ctx, dir, animState, f, animOffsets, equipment);
          break;
      }
    }

    // Render Prank overlays if applicable
    if (prank && (prank.hasGraffiti || prank.hasAfro) && !isDarkling) {
      this.renderPrankOverlays(ctx, dir, animOffsets, prank);
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  private normalizeClassKey(rawKey: string): string {
    const k = rawKey.toLowerCase();
    if (k.includes('warrior') || k.includes('knight') || k.includes('hero') || k === 'player') return 'warrior';
    if (k.includes('magician') || k.includes('mage') || k.includes('wizard') || k.includes('warlock')) return 'magician';
    if (k.includes('cleric') || k.includes('priest') || k.includes('monk')) return 'cleric';
    if (k.includes('thief') || k.includes('rogue') || k.includes('ninja') || k.includes('assassin')) return 'thief';
    if (k.includes('ranger') || k.includes('archer') || k.includes('hunter')) return 'ranger';
    return 'warrior';
  }

  // =========================================================================
  // ANIMATION DISPLACEMENT LOGIC (2:1 Isometric Vector Offsets)
  // =========================================================================
  private getAnimationOffsets(
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number
  ) {
    let bob = 0;
    let stepX = 0;
    let stepY = 0;
    let lean = 0;
    let slashProgress = 0;
    let jumpY = 0;

    // 2:1 Isometric movement vector multipliers
    // SE: +X, +Y/2
    // SW: -X, +Y/2
    // NE: +X, -Y/2
    // NW: -X, -Y/2

    if (animState === 'idle') {
      bob = Math.sin((frame / 8) * Math.PI * 2) * 1.6;
    } else if (animState === 'run') {
      const cycle = frame % 6;
      const strides = [0, -3.5, -1.8, 0, 3.5, 1.8];
      const bobs = [-2.2, 0, -2.8, -2.2, 0, -2.8];
      const s = strides[cycle];
      bob = bobs[cycle];

      if (dir === 'SE') {
        stepX = s * 0.8;
        stepY = s * 0.4;
        lean = 1.5;
      } else if (dir === 'SW') {
        stepX = -s * 0.8;
        stepY = s * 0.4;
        lean = -1.5;
      } else if (dir === 'NE') {
        stepX = s * 0.8;
        stepY = -s * 0.4;
        lean = 1.5;
      } else {
        stepX = -s * 0.8;
        stepY = -s * 0.4;
        lean = -1.5;
      }
    } else if (animState === 'attack') {
      const lunges = [0, 8, 16, 22, 12, 4, 0, 0];
      const l = lunges[frame % 8];
      slashProgress = Math.min(1.0, (frame % 8) / 4);

      if (dir === 'SE') {
        stepX = l * 0.9;
        stepY = l * 0.45;
      } else if (dir === 'SW') {
        stepX = -l * 0.9;
        stepY = l * 0.45;
      } else if (dir === 'NE') {
        stepX = l * 0.9;
        stepY = -l * 0.45;
      } else {
        stepX = -l * 0.9;
        stepY = -l * 0.45;
      }
      bob = -2;
    } else if (animState === 'strike') {
      const leap = [0, -14, -28, -34, -18, 2, 0, 0];
      jumpY = leap[frame % 8];
      slashProgress = Math.min(1.0, (frame % 8) / 5);
      bob = jumpY;
    } else if (animState === 'magic') {
      bob = -4 + Math.sin(frame * 0.9) * 2.5;
    } else if (animState === 'counter') {
      stepX = dir === 'SE' || dir === 'NE' ? -5 : 5;
      bob = 2;
    } else if (animState === 'hurt') {
      stepX = dir === 'SE' || dir === 'NE' ? -10 : 10;
      stepY = dir === 'SE' || dir === 'SW' ? -6 : 6;
      bob = -4;
    } else if (animState === 'victory') {
      const victoryJumps = [0, -8, -14, -6, 0, -4, 0, 0];
      bob = victoryJumps[frame % 8];
    }

    return { bob, stepX, stepY, lean, slashProgress, jumpY };
  }

  // =========================================================================
  // HELPER RENDERING PRIMITIVES FOR 2.5D ISOMETRIC PIXEL ART
  // =========================================================================

  private drawIsoShadow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number = 18,
    ry: number = 9,
    alpha: number = 0.55
  ) {
    ctx.fillStyle = `rgba(3, 7, 18, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawIsoPrism(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    depth: number,
    topColor: string,
    leftColor: string,
    rightColor: string,
    outlineColor?: string
  ) {
    const hw = w / 2;
    const hh = h / 2;

    // Left face
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh + depth);
    ctx.lineTo(cx - hw, cy + depth);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy + depth);
    ctx.lineTo(cx, cy + hh + depth);
    ctx.closePath();
    ctx.fill();

    // Top diamond face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    if (outlineColor) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawDiagonalSlashArc(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    dir: IsoDirection,
    color: string = '#38bdf8'
  ) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    if (dir === 'SE') {
      ctx.arc(cx + 8, cy - 4, 30, -Math.PI * 0.25, Math.PI * 0.45);
    } else if (dir === 'SW') {
      ctx.arc(cx - 8, cy - 4, 30, Math.PI * 0.55, Math.PI * 1.25);
    } else if (dir === 'NE') {
      ctx.arc(cx + 10, cy - 14, 30, -Math.PI * 0.65, Math.PI * 0.15);
    } else {
      ctx.arc(cx - 10, cy - 14, 30, Math.PI * 0.85, Math.PI * 1.65);
    }
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // 1. WARRIOR / KNIGHT (นักรบ / อัศวิน)
  // Heavy visor helm, red crest plume, steel plate cuirass, shield, broadsword
  // =========================================================================
  private renderWarrior(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null }
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const isRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette
    const steelLight = '#e2e8f0';
    const steelMid = '#94a3b8';
    const steelDark = '#475569';
    const steelShadow = '#1e293b';
    const goldTrim = '#fbbf24';
    const plumeRed = '#dc2626';
    const plumeDark = '#991b1b';
    const capeCrimson = '#b91c1c';
    const capeShadow = '#7f1d1d';
    const leatherBrown = '#78350f';

    // 1. Ground Shadow (2:1 Isometric Oval)
    this.drawIsoShadow(ctx, cx, cy + 34, 20, 9);

    // 2. Flowing Cape (Drawn behind body when facing front, or in front when facing back)
    if (isFront) {
      const capeFlutter = Math.sin((frame / 6) * Math.PI * 2) * 4;
      ctx.fillStyle = capeShadow;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 4);
      ctx.lineTo(cx + 10, cy - 4);
      ctx.lineTo(cx + (isRight ? 16 : 8) + capeFlutter, cy + 28);
      ctx.lineTo(cx - (isRight ? 8 : 16) + capeFlutter, cy + 28);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = capeCrimson;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 2);
      ctx.lineTo(cx + 8, cy - 2);
      ctx.lineTo(cx + (isRight ? 13 : 6) + capeFlutter, cy + 26);
      ctx.lineTo(cx - (isRight ? 6 : 13) + capeFlutter, cy + 26);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Legs & Steel Sabatons (Boots)
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 5 : 0;
    // Left Leg
    this.drawIsoPrism(ctx, cx - 6 + (isRight ? -legStep : legStep), cy + 22, 7, 7, 10, steelMid, steelDark, steelShadow);
    // Right Leg
    this.drawIsoPrism(ctx, cx + 6 + (isRight ? legStep : -legStep), cy + 22, 7, 7, 10, steelLight, steelMid, steelDark);

    // 4. Armored Torso (Curved Steel Cuirass & Faulds)
    this.drawIsoPrism(ctx, cx, cy + 4, 18, 14, 15, steelLight, steelMid, steelDark, '#0f172a');
    // Gold Trim Inlay on Chest
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - 3, cy + 4, 6, 2);
    ctx.fillRect(cx - 1, cy + 1, 2, 8);

    // 5. Shoulder Pauldrons (Left & Right)
    // Left Pauldron (In shadow when facing right)
    this.drawIsoPrism(ctx, cx - 11, cy - 2, 9, 8, 7, steelMid, steelDark, steelShadow);
    // Right Pauldron (Key light)
    this.drawIsoPrism(ctx, cx + 11, cy - 2, 9, 8, 7, steelLight, steelMid, steelDark);
    // Gold trim on pauldrons
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - 11, cy - 3, 4, 2);
    ctx.fillRect(cx + 9, cy - 3, 4, 2);

    // 6. Shield (Held in off-hand: left hand if facing right, right hand if facing left)
    const shieldX = isRight ? cx - 13 : cx + 13;
    const shieldY = cy + 4;
    ctx.save();
    // Heater Shield Base
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(shieldX - 7, shieldY - 9);
    ctx.lineTo(shieldX + 7, shieldY - 9);
    ctx.lineTo(shieldX + 7, shieldY + 3);
    ctx.lineTo(shieldX, shieldY + 13);
    ctx.lineTo(shieldX - 7, shieldY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Golden Cross Emblem on Shield
    ctx.fillStyle = goldTrim;
    ctx.fillRect(shieldX - 2, shieldY - 6, 4, 14);
    ctx.fillRect(shieldX - 5, shieldY - 3, 10, 3);
    ctx.restore();

    // 7. Weapon (Broadsword in main hand)
    const weaponX = isRight ? cx + 15 : cx - 15;
    const weaponY = cy + 2;
    const isAttacking = animState === 'attack' || animState === 'strike';

    ctx.save();
    if (isAttacking) {
      // Weapon swung dynamically forward
      ctx.translate(weaponX, weaponY);
      ctx.rotate((isRight ? 1 : -1) * (0.8 + offsets.slashProgress * 1.5));
      // Blade
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -26, 5, 24);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -26, 2, 24);
      // Crossguard & Hilt
      ctx.fillStyle = goldTrim;
      ctx.fillRect(-6, -2, 13, 3);
      ctx.fillStyle = leatherBrown;
      ctx.fillRect(-1, 1, 3, 6);
      ctx.fillStyle = goldTrim;
      ctx.beginPath();
      ctx.arc(0, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Weapon resting ready in combat grip
      const weaponAngle = isFront ? (isRight ? 0.35 : -0.35) : (isRight ? -0.35 : 0.35);
      ctx.translate(weaponX, weaponY);
      ctx.rotate(weaponAngle);
      // Blade
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -22, 4, 20);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -22, 2, 20);
      // Crossguard
      ctx.fillStyle = goldTrim;
      ctx.fillRect(-5, -2, 10, 3);
      // Grip & Pommel
      ctx.fillStyle = leatherBrown;
      ctx.fillRect(-1, 1, 2, 5);
      ctx.fillStyle = goldTrim;
      ctx.fillRect(-1.5, 6, 3, 2);
    }
    ctx.restore();

    // 8. Head & Knight Helmet
    const headY = cy - 16;
    // Visor Helmet Prism
    this.drawIsoPrism(ctx, cx, headY, 16, 14, 13, steelLight, steelMid, steelDark, '#0f172a');

    // Helmet Front / Back details
    if (isFront) {
      // Golden Crown / Brow Ridge
      ctx.fillStyle = goldTrim;
      ctx.fillRect(cx - 6, headY - 1, 12, 3);

      // Dark T-Slit Visor (Breathable Knight Sallet)
      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - (isRight ? 4 : 5), headY + 3, 9, 3);
      // Piercing eyes gleaming inside visor
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(cx - (isRight ? 2 : 3), headY + 4, 2, 1.5);
      ctx.fillRect(cx + (isRight ? 2 : 1), headY + 4, 2, 1.5);
    } else {
      // Back of helmet: Neck guard lames (articulated plates)
      ctx.fillStyle = steelDark;
      ctx.fillRect(cx - 6, headY + 3, 12, 2);
      ctx.fillStyle = steelShadow;
      ctx.fillRect(cx - 5, headY + 6, 10, 2);
    }

    // 9. Majestic Feathered Plume on Helmet Crest (Flowing in wind)
    const plumeWave = Math.sin((frame / 6) * Math.PI * 2) * 3;
    ctx.fillStyle = plumeDark;
    ctx.beginPath();
    ctx.moveTo(cx, headY - 8);
    ctx.quadraticCurveTo(cx - 8, headY - 20, cx - 14 + plumeWave, headY - 18);
    ctx.lineTo(cx - 8 + plumeWave, headY - 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = plumeRed;
    ctx.beginPath();
    ctx.moveTo(cx, headY - 8);
    ctx.quadraticCurveTo(cx - 5, headY - 18, cx - 11 + plumeWave, headY - 16);
    ctx.lineTo(cx - 5 + plumeWave, headY - 11);
    ctx.closePath();
    ctx.fill();

    // Plume mount socket (Gold)
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - 2, headY - 9, 4, 3);

    // 10. Attack Slash Arc Effect
    if (isAttacking) {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#60a5fa');
    }
  }

  // =========================================================================
  // 2. MAGICIAN / MAGE (จอมเวท)
  // Pointed star wizard hat, rune robes, crooked staff with hovering mana orb
  // =========================================================================
  private renderMagician(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null }
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const isRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette
    const robeVioletLight = '#a855f7';
    const robeVioletMid = '#7e22ce';
    const robeVioletDark = '#581c87';
    const robeShadow = '#2e1065';
    const goldRune = '#facc15';
    const crystalCyan = '#38bdf8';
    const woodStaff = '#5c2c16';
    const skinTone = '#fde68a';

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 9);

    // 2. Starry Robe Hem (Lower Skirt)
    const robeSway = animState === 'run' ? Math.sin(frame * 1.1) * 3 : Math.sin(frame * 0.5) * 1.5;
    ctx.fillStyle = robeShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 12);
    ctx.lineTo(cx + 10, cy + 12);
    ctx.lineTo(cx + 14 + robeSway, cy + 32);
    ctx.lineTo(cx - 14 + robeSway, cy + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = robeVioletMid;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 13);
    ctx.lineTo(cx + 8, cy + 13);
    ctx.lineTo(cx + 11 + robeSway, cy + 30);
    ctx.lineTo(cx - 11 + robeSway, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Gold Runic Hem Border
    ctx.fillStyle = goldRune;
    ctx.fillRect(cx - 12 + robeSway, cy + 28, 24, 2);

    // 3. Torso Robe
    this.drawIsoPrism(ctx, cx, cy + 4, 16, 12, 12, robeVioletLight, robeVioletMid, robeVioletDark);

    // Robe Mantle / Cowl
    ctx.fillStyle = robeVioletDark;
    ctx.fillRect(cx - 9, cy - 2, 18, 4);
    ctx.fillStyle = goldRune;
    ctx.fillRect(cx - 2, cy - 1, 4, 8); // Gold sash

    // 4. Hands & Face
    const headY = cy - 16;
    if (isFront) {
      // Cute Anime Chibi Face
      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.arc(cx, headY + 3, 7, 0, Math.PI * 2);
      ctx.fill();

      // Big expressive anime eyes
      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(cx - (isRight ? 1 : 4), headY + 1, 2.5, 3.5);
      ctx.fillRect(cx + (isRight ? 3 : 0), headY + 1, 2.5, 3.5);
      // Eye catch reflection (White shine)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - (isRight ? 1 : 4), headY + 1, 1, 1);
      ctx.fillRect(cx + (isRight ? 3 : 0), headY + 1, 1, 1);
      // Soft blush
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(cx - (isRight ? 2 : 5), headY + 5, 2, 1);
      ctx.fillRect(cx + (isRight ? 3 : 0), headY + 5, 2, 1);
    } else {
      // Back of head (Purple hair cascade)
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(cx, headY + 3, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Pointed Wizard Hat with Gold Buckle
    const hatTilt = isRight ? 2 : -2;
    // Wide Brim
    ctx.fillStyle = robeVioletDark;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 1, 14, 6, hatTilt * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = robeVioletMid;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 2, 12, 5, hatTilt * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Gold Hat Band
    ctx.fillStyle = goldRune;
    ctx.fillRect(cx - 6, headY - 6, 12, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, headY - 6, 4, 3); // Buckle center

    // Pointed Cone
    ctx.fillStyle = robeVioletMid;
    ctx.beginPath();
    ctx.moveTo(cx - 7, headY - 6);
    ctx.lineTo(cx + 7, headY - 6);
    ctx.quadraticCurveTo(cx + hatTilt * 3, headY - 20, cx - hatTilt * 5, headY - 28);
    ctx.closePath();
    ctx.fill();

    // Shadow on cone side
    ctx.fillStyle = robeVioletDark;
    ctx.beginPath();
    ctx.moveTo(cx + 2, headY - 6);
    ctx.lineTo(cx + 7, headY - 6);
    ctx.quadraticCurveTo(cx + hatTilt * 3, headY - 20, cx - hatTilt * 5, headY - 28);
    ctx.closePath();
    ctx.fill();

    // 6. Arcane Staff with Levitating Elemental Mana Crystal
    const staffX = isRight ? cx + 16 : cx - 16;
    const staffY = cy + 2;

    ctx.save();
    // Wooden Shaft
    ctx.strokeStyle = woodStaff;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(staffX, staffY + 26);
    ctx.lineTo(staffX, staffY - 18);
    ctx.stroke();

    // Twisted Wood Head
    ctx.fillStyle = woodStaff;
    ctx.beginPath();
    ctx.arc(staffX - 3, staffY - 20, 4, 0, Math.PI * 2);
    ctx.arc(staffX + 3, staffY - 20, 4, 0, Math.PI * 2);
    ctx.fill();

    // Floating Mana Crystal (Pulses and hovers dynamically)
    const floatY = Math.sin((frame / 8) * Math.PI * 2) * 3;
    const crystalCenterY = staffY - 26 + floatY;

    // Outer Arcane Glow
    ctx.shadowColor = crystalCyan;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(staffX, crystalCenterY - 9);
    ctx.lineTo(staffX + 6, crystalCenterY);
    ctx.lineTo(staffX, crystalCenterY + 9);
    ctx.lineTo(staffX - 6, crystalCenterY);
    ctx.closePath();
    ctx.fill();

    // Inner Radiant Core
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(staffX, crystalCenterY - 5);
    ctx.lineTo(staffX + 3, crystalCenterY);
    ctx.lineTo(staffX, crystalCenterY + 5);
    ctx.lineTo(staffX - 3, crystalCenterY);
    ctx.closePath();
    ctx.fill();

    // Sparkle motes orbiting the staff head
    for (let i = 0; i < 3; i++) {
      const angle = (frame / 8) * Math.PI * 2 + (i * Math.PI * 2) / 3;
      const sparkX = staffX + Math.cos(angle) * 11;
      const sparkY = crystalCenterY + Math.sin(angle) * 6;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sparkX - 1, sparkY - 1, 2, 2);
    }
    ctx.restore();

    // 7. Casting / Magic Action Visuals
    if (animState === 'magic') {
      // Rotating Runic Circle at Base
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 34, 24, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // =========================================================================
  // 3. CLERIC / PRIEST (นักบวช / ผู้เยียวยา)
  // White & gold robes, holy cross, golden war mace, divine radiant aura
  // =========================================================================
  private renderCleric(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null }
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const isRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette
    const whiteBright = '#ffffff';
    const whiteShade = '#e2e8f0';
    const whiteDark = '#94a3b8';
    const goldPrimary = '#fbbf24';
    const goldDark = '#d97706';
    const skinTone = '#fef08a';

    // 1. Ground Shadow with Holy Aura Glow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 9);
    ctx.save();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.20)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. White Clerical Vestment (Dress / Robe)
    const robeSway = animState === 'run' ? Math.sin(frame * 1.1) * 3 : 0;
    ctx.fillStyle = whiteDark;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 12);
    ctx.lineTo(cx + 9, cy + 12);
    ctx.lineTo(cx + 13 + robeSway, cy + 32);
    ctx.lineTo(cx - 13 + robeSway, cy + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = whiteBright;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 13);
    ctx.lineTo(cx + 8, cy + 13);
    ctx.lineTo(cx + 10 + robeSway, cy + 30);
    ctx.lineTo(cx - 10 + robeSway, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Gold Trim on Hem
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(cx - 11 + robeSway, cy + 28, 22, 2.5);

    // 3. Torso
    this.drawIsoPrism(ctx, cx, cy + 4, 16, 12, 12, whiteBright, whiteShade, whiteDark);
    // Gold Scapular / Stole hanging down center
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(cx - 2, cy + 1, 4, 14);

    // Golden Cross Pectoral
    ctx.fillStyle = goldDark;
    ctx.fillRect(cx - 3, cy + 5, 6, 2);
    ctx.fillRect(cx - 1, cy + 3, 2, 7);

    // 4. Head, Face & Clerical Cowl
    const headY = cy - 16;
    if (isFront) {
      // Face
      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.arc(cx, headY + 3, 7, 0, Math.PI * 2);
      ctx.fill();

      // Gentle eyes
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(cx - (isRight ? 1 : 4), headY + 2, 2.5, 3);
      ctx.fillRect(cx + (isRight ? 3 : 0), headY + 2, 2.5, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - (isRight ? 1 : 4), headY + 2, 1, 1);
      ctx.fillRect(cx + (isRight ? 3 : 0), headY + 2, 1, 1);
    }

    // Clerical Cowl / Habit (Covers sides and back of head)
    ctx.fillStyle = whiteShade;
    ctx.beginPath();
    ctx.arc(cx, headY + 1, 9, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    ctx.fillStyle = whiteBright;
    ctx.beginPath();
    ctx.arc(cx, headY - 1, 8, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Gold Circlet on forehead
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(cx - 6, headY - 1, 12, 2);
    ctx.fillRect(cx - 1, headY - 3, 2, 4); // Little cross at forehead center

    // 5. Golden Flanged War Mace in hand
    const maceX = isRight ? cx + 15 : cx - 15;
    const maceY = cy + 4;

    ctx.save();
    ctx.translate(maceX, maceY);
    ctx.rotate(isRight ? 0.25 : -0.25);
    // Shaft
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1.5, -14, 3, 22);
    // Golden Head (Flanges)
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(-5, -20, 10, 8);
    ctx.fillStyle = goldDark;
    ctx.fillRect(-3, -22, 6, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -18, 2, 4); // Highlight
    ctx.restore();

    // 6. Divine Halo floating above head
    ctx.save();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 12, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // 4. THIEF / ROGUE (จอมโจร / นักฆ่า)
  // Shadow assassin cowl, face bandana, dual venom daggers, nimble leather
  // =========================================================================
  private renderThief(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null }
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const isRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette
    const leatherDark = '#0f172a';
    const leatherMid = '#1e293b';
    const leatherLight = '#334155';
    const poisonGreen = '#22c55e';
    const skinTone = '#fed7aa';

    // 1. Ground Shadow (Slimmer, faster agile shadow)
    this.drawIsoShadow(ctx, cx, cy + 34, 16, 8);

    // 2. Agile Legs (Leather trousers & silent boots)
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 6 : 0;
    this.drawIsoPrism(ctx, cx - 5 + (isRight ? -legStep : legStep), cy + 22, 6, 6, 11, leatherLight, leatherMid, leatherDark);
    this.drawIsoPrism(ctx, cx + 5 + (isRight ? legStep : -legStep), cy + 22, 6, 6, 11, leatherLight, leatherMid, leatherDark);

    // 3. Torso (Studded Leather Jerkin)
    this.drawIsoPrism(ctx, cx, cy + 4, 16, 12, 13, leatherLight, leatherMid, leatherDark, '#020617');
    // Utility belt & pouches
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 7, cy + 12, 14, 2.5);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(cx - (isRight ? 2 : 4), cy + 12, 3, 2.5); // Belt buckle
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx + (isRight ? 3 : -6), cy + 12, 3, 4); // Pouch

    // 4. Dual Venom Daggers
    const dagger1X = cx - 13;
    const dagger2X = cx + 13;
    const daggerY = cy + 8;

    // Left Dagger
    ctx.save();
    ctx.translate(dagger1X, daggerY);
    ctx.rotate(-0.4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-1.5, -12, 3, 12);
    ctx.fillStyle = poisonGreen;
    ctx.fillRect(0, -12, 1.5, 12); // Poison edge
    ctx.fillStyle = '#475569';
    ctx.fillRect(-3, 0, 6, 2);
    ctx.restore();

    // Right Dagger
    ctx.save();
    ctx.translate(dagger2X, daggerY);
    ctx.rotate(0.4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-1.5, -12, 3, 12);
    ctx.fillStyle = poisonGreen;
    ctx.fillRect(0, -12, 1.5, 12); // Poison edge
    ctx.fillStyle = '#475569';
    ctx.fillRect(-3, 0, 6, 2);
    ctx.restore();

    // 5. Head, Assassin Cowl & Face Mask
    const headY = cy - 16;
    // Hood Shadow
    ctx.fillStyle = leatherDark;
    ctx.beginPath();
    ctx.arc(cx, headY + 1, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = leatherMid;
    ctx.beginPath();
    ctx.arc(cx, headY, 8, 0, Math.PI * 2);
    ctx.fill();

    if (isFront) {
      // Narrow Eye Slits
      ctx.fillStyle = skinTone;
      ctx.fillRect(cx - (isRight ? 3 : 5), headY, 8, 3);
      // Sharp piercing eyes
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - (isRight ? 2 : 4), headY + 1, 2, 1.5);
      ctx.fillRect(cx + (isRight ? 1 : -1), headY + 1, 2, 1.5);

      // Black Cloth Face Bandana Mask
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY + 3);
      ctx.lineTo(cx + 6, headY + 3);
      ctx.lineTo(cx, headY + 9);
      ctx.closePath();
      ctx.fill();
    }

    if (animState === 'attack' || animState === 'strike') {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#22c55e');
    }
  }

  // =========================================================================
  // 5. RANGER / ARCHER (นายพราน / พลธนู)
  // Woodland cap with feather, recurve longbow, quiver on back
  // =========================================================================
  private renderRanger(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null }
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const isRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette
    const forestGreen = '#15803d';
    const forestDark = '#14532d';
    const leatherBrown = '#78350f';
    const featherRed = '#ef4444';
    const skinTone = '#fed7aa';

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 9);

    // 2. Quiver on Back (Visible from behind or sides)
    if (!isFront) {
      ctx.fillStyle = leatherBrown;
      ctx.fillRect(cx - 7, cy - 6, 5, 16);
      // Arrows in quiver
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 8, cy - 10, 2, 4);
      ctx.fillRect(cx - 6, cy - 11, 2, 5);
      ctx.fillRect(cx - 4, cy - 10, 2, 4);
    }

    // 3. Legs
    this.drawIsoPrism(ctx, cx - 5, cy + 22, 6, 6, 10, forestGreen, forestDark, '#052e16');
    this.drawIsoPrism(ctx, cx + 5, cy + 22, 6, 6, 10, forestGreen, forestDark, '#052e16');

    // 4. Torso (Leather tunic & green jacket)
    this.drawIsoPrism(ctx, cx, cy + 4, 16, 12, 13, forestGreen, forestDark, '#052e16');
    // Leather chest strap
    ctx.fillStyle = leatherBrown;
    ctx.fillRect(cx - 7, cy + 2, 14, 2);

    // 5. Recurve Longbow
    const bowX = isRight ? cx + 15 : cx - 15;
    const bowY = cy + 4;
    ctx.save();
    ctx.translate(bowX, bowY);
    ctx.rotate(isRight ? 0.3 : -0.3);
    // Curved Bow Stave
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    // Bowstring
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(-Math.PI * 0.45) * 18, Math.sin(-Math.PI * 0.45) * 18);
    ctx.lineTo(Math.cos(Math.PI * 0.45) * 18, Math.sin(Math.PI * 0.45) * 18);
    ctx.stroke();
    ctx.restore();

    // 6. Head & Woodland Archer Cap
    const headY = cy - 16;
    if (isFront) {
      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.arc(cx, headY + 3, 7, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#166534';
      ctx.fillRect(cx - (isRight ? 1 : 4), headY + 2, 2.5, 3);
      ctx.fillRect(cx + (isRight ? 3 : 0), headY + 2, 2.5, 3);
    }

    // Robin Hood / Archer Cap with red feather
    ctx.fillStyle = forestDark;
    ctx.beginPath();
    ctx.moveTo(cx - 8, headY - 1);
    ctx.lineTo(cx + 8, headY - 1);
    ctx.lineTo(cx + 10, headY - 8);
    ctx.lineTo(cx - 6, headY - 7);
    ctx.closePath();
    ctx.fill();

    // Cap Brim
    ctx.fillStyle = forestGreen;
    ctx.fillRect(cx - 7, headY - 2, 14, 2.5);

    // Pheasant Feather
    ctx.fillStyle = featherRed;
    ctx.beginPath();
    ctx.moveTo(cx - 4, headY - 7);
    ctx.quadraticCurveTo(cx - 10, headY - 16, cx - 14, headY - 18);
    ctx.lineTo(cx - 7, headY - 11);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // 6. DARKLING (ร่างมาร ดาร์กลิง)
  // Curled demon horns, glowing crimson eyes, void wings, dark flame greatsword
  // =========================================================================
  private renderDarkling(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number }
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const isRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette
    const voidBlack = '#030712';
    const voidPurple = '#581c87';
    const voidGlow = '#a855f7';
    const crimsonEye = '#ef4444';

    // 1. Sprawling Shadow with Cursed Purple Aura
    this.drawIsoShadow(ctx, cx, cy + 34, 24, 11, 0.75);
    ctx.save();
    ctx.fillStyle = 'rgba(88, 28, 135, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Demon Bat Wings (Fluttering & Expanding)
    const wingFlap = Math.sin((frame / 6) * Math.PI * 2) * 5;
    ctx.save();
    ctx.fillStyle = voidBlack;
    ctx.strokeStyle = voidPurple;
    ctx.lineWidth = 1.5;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 4);
    ctx.lineTo(cx - 28 + wingFlap, cy - 24);
    ctx.lineTo(cx - 22, cy - 10);
    ctx.lineTo(cx - 26, cy + 2);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 4);
    ctx.lineTo(cx + 28 - wingFlap, cy - 24);
    ctx.lineTo(cx + 22, cy - 10);
    ctx.lineTo(cx + 26, cy + 2);
    ctx.lineTo(cx + 6, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Legs
    this.drawIsoPrism(ctx, cx - 6, cy + 22, 8, 8, 11, voidPurple, '#3b0764', voidBlack);
    this.drawIsoPrism(ctx, cx + 6, cy + 22, 8, 8, 11, voidPurple, '#3b0764', voidBlack);

    // 4. Dark Spiked Cuirass Torso
    this.drawIsoPrism(ctx, cx, cy + 4, 20, 14, 15, voidPurple, '#3b0764', voidBlack, '#a855f7');
    // Glowing Core Runes on Chest
    ctx.fillStyle = voidGlow;
    ctx.shadowColor = voidGlow;
    ctx.shadowBlur = 10;
    ctx.fillRect(cx - 2, cy + 4, 4, 8);
    ctx.shadowBlur = 0;

    // 5. Colossal Cursed Blade (Giant two-handed greatsword with purple aura)
    const weaponX = isRight ? cx + 18 : cx - 18;
    const weaponY = cy;
    ctx.save();
    ctx.translate(weaponX, weaponY);
    ctx.rotate(isRight ? 0.35 : -0.35);

    // Dark Blade
    ctx.fillStyle = voidBlack;
    ctx.strokeStyle = voidGlow;
    ctx.lineWidth = 1.2;
    ctx.fillRect(-4, -30, 8, 28);
    ctx.strokeRect(-4, -30, 8, 28);

    // Dripping Cursed Flames
    ctx.fillStyle = crimsonEye;
    ctx.fillRect(-1, -26, 2, 20);
    ctx.restore();

    // 6. Demon Head & Curled Obsidian Horns
    const headY = cy - 16;
    this.drawIsoPrism(ctx, cx, headY, 16, 14, 13, voidPurple, '#3b0764', voidBlack);

    // Menacing Curved Horns
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = voidGlow;
    ctx.lineWidth = 1.2;

    // Left Horn
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY - 4);
    ctx.quadraticCurveTo(cx - 16, headY - 14, cx - 14, headY - 24);
    ctx.quadraticCurveTo(cx - 10, headY - 18, cx - 2, headY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(cx + 6, headY - 4);
    ctx.quadraticCurveTo(cx + 16, headY - 14, cx + 14, headY - 24);
    ctx.quadraticCurveTo(cx + 10, headY - 18, cx + 2, headY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Burning Crimson Eye Slits
    if (isFront) {
      ctx.fillStyle = crimsonEye;
      ctx.shadowColor = crimsonEye;
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - (isRight ? 2 : 4), headY + 3, 3, 2);
      ctx.fillRect(cx + (isRight ? 2 : 0), headY + 3, 3, 2);
      ctx.shadowBlur = 0;
    }

    if (animState === 'attack' || animState === 'strike') {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#a855f7');
    }
  }

  // =========================================================================
  // PRANK OVERLAYS (Mustaches, Afro, Face Paint)
  // =========================================================================
  private renderPrankOverlays(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    offsets: { bob: number; stepX: number; stepY: number; lean: number },
    prank: PrankState
  ) {
    const isFront = dir === 'SE' || dir === 'SW';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;
    const headY = cy - 16;

    // 1. Giant Disco Afro
    if (prank.hasAfro) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, headY - 6, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Face Graffiti (only visible from front)
    if (prank.hasGraffiti && isFront) {
      if (prank.graffitiType === 'mustache') {
        // Curly mustache
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx - 3, headY + 6, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 3, headY + 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (prank.graffitiType === 'clown') {
        // Red nose and clown smile
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, headY + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spiral glasses
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - 5, headY + 1, 4, 4);
        ctx.strokeRect(cx + 1, headY + 1, 4, 4);
      }
    }
  }
}

export const customIsometricHeroRenderer = new CustomIsometricHeroRenderer();
