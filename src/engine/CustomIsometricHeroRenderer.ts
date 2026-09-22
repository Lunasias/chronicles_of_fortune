import { EquipmentItem, IsoDirection, CharacterAnimState, PrankState } from './PixelSpriteGenerator';

export class CustomIsometricHeroRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

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
    const cacheKey = `custom_iso_fem_${isDarkling ? 'darkling' : classKey}_s${skinVariant}_${dir}_${animState}_${f}_${weaponId}_${armorId}_${prankKey}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(144, 144);

    ctx.save();
    // High-resolution supersampling scale from 96-grid to 144-canvas (1.5x)
    ctx.scale(1.5, 1.5);

    // 8-Directional Isometric Horizontal Transform:
    // If facing West ('SW', 'W', 'NW'), mirror horizontally around center x = 48!
    // This turns the ENTIRE body, legs, boots, arms, weapons, face and hair to face LEFT.
    const isFacingWest = dir === 'SW' || dir === 'W' || dir === 'NW';
    if (isFacingWest) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
      ctx.translate(-48, 0);
    }

    // Direction mapping for internal class renderers (rendered as East-facing, then mirrored)
    const effectiveDir: IsoDirection = isFacingWest
      ? (dir === 'SW' ? 'SE' : (dir === 'W' ? 'E' : (dir === 'NW' ? 'NE' : 'SE')))
      : dir;

    // Calculate dynamic animation offsets
    const animOffsets = this.getAnimationOffsets(effectiveDir, animState, f);

    // Render the custom 2.5D Isometric Character
    if (isDarkling) {
      this.renderDarkling(ctx, effectiveDir, animState, f, animOffsets);
    } else {
      const normalizedClass = this.normalizeClassKey(classKey);
      switch (normalizedClass) {
        case 'warrior':
          this.renderWarrior(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
        case 'magician':
          this.renderMagician(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
        case 'cleric':
          this.renderCleric(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
        case 'thief':
          this.renderThief(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
        case 'ranger':
          this.renderRanger(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
        case 'spellblade':
          this.renderSpellblade(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
        default:
          this.renderWarrior(ctx, effectiveDir, animState, f, animOffsets, equipment, skinVariant);
          break;
      }
    }

    // Render Prank overlays if applicable
    if (prank && (prank.hasGraffiti || prank.hasAfro) && !isDarkling) {
      this.renderPrankOverlays(ctx, effectiveDir, animOffsets, prank);
    }

    ctx.restore();

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  private normalizeClassKey(rawKey: string): string {
    const k = rawKey.toLowerCase();
    if (k.includes('spellblade') || k.includes('spell') || k.includes('ดาบเวท') || k.includes('magic_sword')) return 'spellblade';
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

    if (animState === 'idle') {
      bob = Math.sin((frame / 8) * Math.PI * 2) * 1.5;
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
      } else if (dir === 'NW') {
        stepX = -s * 0.8;
        stepY = -s * 0.4;
        lean = -1.5;
      } else if (dir === 'S') {
        stepX = 0;
        stepY = s * 0.8;
        lean = 0;
      } else if (dir === 'N') {
        stepX = 0;
        stepY = -s * 0.8;
        lean = 0;
      } else if (dir === 'E') {
        stepX = s * 1.0;
        stepY = 0;
        lean = 1.8;
      } else { // 'W'
        stepX = -s * 1.0;
        stepY = 0;
        lean = -1.8;
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
      } else if (dir === 'NW') {
        stepX = -l * 0.9;
        stepY = -l * 0.45;
      } else if (dir === 'S') {
        stepX = 0;
        stepY = l * 1.0;
      } else if (dir === 'N') {
        stepX = 0;
        stepY = -l * 1.0;
      } else if (dir === 'E') {
        stepX = l * 1.1;
        stepY = 0;
      } else { // 'W'
        stepX = -l * 1.1;
        stepY = 0;
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
      stepX = dir === 'SE' || dir === 'NE' || dir === 'E' ? -5 : (dir === 'SW' || dir === 'NW' || dir === 'W' ? 5 : 0);
      stepY = dir === 'S' ? -4 : (dir === 'N' ? 4 : 0);
      bob = 2;
    } else if (animState === 'hurt') {
      stepX = dir === 'SE' || dir === 'NE' || dir === 'E' ? -10 : (dir === 'SW' || dir === 'NW' || dir === 'W' ? 10 : 0);
      stepY = dir === 'SE' || dir === 'SW' || dir === 'S' ? -6 : 6;
      bob = -4;
    } else if (animState === 'victory') {
      const victoryJumps = [0, -8, -14, -6, 0, -4, 0, 0];
      bob = victoryJumps[frame % 8];
    }

    return { bob, stepX, stepY, lean, slashProgress, jumpY };
  }

  // =========================================================================
  // HELPER RENDERING PRIMITIVES FOR SEMI-REALISTIC FEMALE PIXEL ART
  // =========================================================================

  private drawIsoShadow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number = 18,
    ry: number = 9,
    alpha: number = 0.55
  ) {
    // AAA Two-layer depth ambient occlusion
    // 1. Soft outer ground contact shadow
    ctx.fillStyle = `rgba(3, 7, 18, ${alpha * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Focused direct contact occlusion
    ctx.fillStyle = `rgba(3, 7, 18, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Semi-Realistic Anime Female Side-Profile Face (for 'E' and 'W' 8-directional rendering)
   */
  private drawAnimeProfileFace(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isFacingEast: boolean,
    skinTone: string,
    eyeColor: string,
    blushColor = '#f472b6'
  ) {
    const dirSign = isFacingEast ? 1 : -1;

    // Profile jawline & forehead contour
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.moveTo(cx - dirSign * 4, cy - 6);
    ctx.lineTo(cx + dirSign * 4, cy - 6); // Forehead
    ctx.lineTo(cx + dirSign * 5.5, cy); // Pert anime nose tip
    ctx.lineTo(cx + dirSign * 4.5, cy + 2); // Philtrum
    ctx.lineTo(cx + dirSign * 4.8, cy + 3.5); // Cute lips
    ctx.lineTo(cx + dirSign * 3.5, cy + 6.5); // Petite chin
    ctx.quadraticCurveTo(cx, cy + 6, cx - dirSign * 3, cy + 3); // Jawline
    ctx.closePath();
    ctx.fill();

    // Subtle jawline ambient shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - dirSign * 2, cy + 3);
    ctx.lineTo(cx + dirSign * 3.5, cy + 6.5);
    ctx.lineTo(cx, cy + 7);
    ctx.closePath();
    ctx.fill();

    // Expressive Profile Anime Eye
    const eyeX = cx + dirSign * 1.5;
    const eyeY = cy - 1;

    // Eyelash contour pointing forward
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(eyeX - (isFacingEast ? 1 : 2.5), eyeY - 2, 3.5, 1.2);
    ctx.fillRect(eyeX + dirSign * 1.5, eyeY - 2.8, 1.2, 1.2);

    // Iris
    ctx.fillStyle = eyeColor;
    ctx.fillRect(eyeX - (isFacingEast ? 0.5 : 1.5), eyeY - 1, 2.2, 3);

    // Catchlight sparkle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeX + dirSign * 0.2, eyeY - 1, 1, 1);

    // Soft maiden blush on profile cheek
    ctx.fillStyle = blushColor;
    ctx.fillRect(eyeX - dirSign * 1.5, eyeY + 2.5, 2.5, 1);

    // Cute pink lips highlight
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(cx + dirSign * 4.2, cy + 3.2, 1.2, 0.8);

    // Petite ear on side of head
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(cx - dirSign * 3, cy + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
    ctx.fillRect(cx - dirSign * 3, cy + 1, 1, 1);
  }

  /**
   * Furry Beastgirl Fluffy Tail (Swinging behind back based on direction & frame)
   */
  private drawFurryBeastgirlTail(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    dir: IsoDirection,
    frame: number,
    beastType: 'cat' | 'fox' | 'wolf' | 'bunny' | 'horns',
    tailColor: string,
    tipColor = '#ffffff'
  ) {
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const isBack = dir === 'NE' || dir === 'NW' || dir === 'N';
    const dirSign = isRight ? 1 : -1;
    const sway = Math.sin((frame / 6) * Math.PI * 2) * 3.5;
    const tailBaseX = cx - (isBack ? 0 : dirSign * 3);
    const tailBaseY = cy + 4;

    ctx.save();
    if (beastType === 'bunny') {
      const hop = Math.abs(Math.sin(frame * 0.8)) * 1.5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(tailBaseX, tailBaseY + 2 - hop, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = tailColor;
      ctx.beginPath();
      ctx.arc(tailBaseX, tailBaseY + 1 - hop, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tailBaseX + (isRight ? -1 : 1), tailBaseY - hop, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (beastType === 'fox') {
      const tailTipX = tailBaseX - dirSign * 16 + sway;
      const tailTipY = tailBaseY - 10 + Math.cos(frame * 0.8) * 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.moveTo(tailBaseX, tailBaseY + 2);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 18 + sway, tailBaseY - 4, tailTipX, tailTipY + 2);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 8, tailBaseY + 7, tailBaseX, tailBaseY + 2);
      ctx.fill();

      ctx.fillStyle = tailColor;
      ctx.beginPath();
      ctx.moveTo(tailBaseX, tailBaseY);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 20 + sway, tailBaseY - 6, tailTipX, tailTipY);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 8, tailBaseY + 6, tailBaseX, tailBaseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.arc(tailTipX, tailTipY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (beastType === 'wolf') {
      const tailTipX = tailBaseX - dirSign * 13 + sway * 0.8;
      const tailTipY = tailBaseY + 2;

      ctx.fillStyle = tailColor;
      ctx.beginPath();
      ctx.moveTo(tailBaseX, tailBaseY);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 15 + sway, tailBaseY + 6, tailTipX, tailTipY);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 5, tailBaseY - 4, tailBaseX, tailBaseY);
      ctx.closePath();
      ctx.fill();
    } else if (beastType === 'horns') {
      const tailTipX = tailBaseX - dirSign * 14 + sway;
      const tailTipY = tailBaseY - 5;

      ctx.strokeStyle = tailColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tailBaseX, tailBaseY);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 10, tailBaseY + 8, tailTipX, tailTipY);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(tailTipX, tailTipY - 3);
      ctx.lineTo(tailTipX - dirSign * 4, tailTipY);
      ctx.lineTo(tailTipX, tailTipY + 3);
      ctx.lineTo(tailTipX + dirSign * 2, tailTipY);
      ctx.closePath();
      ctx.fill();
    } else {
      const tailTipX = tailBaseX - dirSign * 12 + sway;
      const tailTipY = tailBaseY - 8 + Math.cos(frame * 0.7) * 2;

      ctx.strokeStyle = tailColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailBaseX, tailBaseY);
      ctx.quadraticCurveTo(tailBaseX - dirSign * 14 + sway, tailBaseY + 4, tailTipX, tailTipY);
      ctx.stroke();

      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.arc(tailTipX, tailTipY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Furry Beastgirl Animated Ears on top of head
   */
  private drawFurryBeastgirlEars(
    ctx: CanvasRenderingContext2D,
    cx: number,
    headY: number,
    dir: IsoDirection,
    frame: number,
    beastType: 'cat' | 'fox' | 'wolf' | 'bunny' | 'horns',
    earColor: string,
    innerColor = '#fda4af'
  ) {
    const isProfile = dir === 'E' || dir === 'W';
    const isBack = dir === 'NE' || dir === 'NW' || dir === 'N';
    const dirSign = (dir === 'SE' || dir === 'NE' || dir === 'E') ? 1 : -1;
    const twitch = Math.sin((frame + 2) * 1.4) * 0.8;

    ctx.save();
    if (beastType === 'bunny') {
      if (isProfile) {
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.ellipse(cx - dirSign * 1, headY - 14, 3, 7, dirSign * 0.15 + twitch * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.ellipse(cx - dirSign * 1, headY - 14, 1.5, 5, dirSign * 0.15 + twitch * 0.05, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.ellipse(cx - 4, headY - 14, 3, 7, -0.15 + twitch * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 4, headY - 14, 3, 7, 0.15 - twitch * 0.05, 0, Math.PI * 2);
        ctx.fill();

        if (!isBack) {
          ctx.fillStyle = innerColor;
          ctx.beginPath();
          ctx.ellipse(cx - 4, headY - 14, 1.5, 5, -0.15 + twitch * 0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 4, headY - 14, 1.5, 5, 0.15 - twitch * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (beastType === 'horns') {
      ctx.fillStyle = '#1e1b4b';
      if (isProfile) {
        ctx.beginPath();
        ctx.moveTo(cx + dirSign * 1, headY - 4);
        ctx.quadraticCurveTo(cx - dirSign * 8, headY - 14, cx - dirSign * 4, headY - 18);
        ctx.quadraticCurveTo(cx - dirSign * 5, headY - 12, cx + dirSign * 2, headY - 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(cx - dirSign * 3, headY - 14, 1.5, 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - 4, headY - 4);
        ctx.quadraticCurveTo(cx - 12, headY - 12, cx - 8, headY - 17);
        ctx.quadraticCurveTo(cx - 8, headY - 10, cx - 2, headY - 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 4, headY - 4);
        ctx.quadraticCurveTo(cx + 12, headY - 12, cx + 8, headY - 17);
        ctx.quadraticCurveTo(cx + 8, headY - 10, cx + 2, headY - 6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const earHeight = beastType === 'fox' ? 8 : (beastType === 'wolf' ? 7 : 6);
      const isFox = beastType === 'fox';

      if (isProfile) {
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.moveTo(cx - dirSign * 4, headY - 4);
        ctx.lineTo(cx - dirSign * 1 + twitch, headY - 4 - earHeight);
        ctx.lineTo(cx + dirSign * 2, headY - 4);
        ctx.closePath();
        ctx.fill();

        if (isFox) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(cx - dirSign * 2, headY - 4 - earHeight + 3);
          ctx.lineTo(cx - dirSign * 1 + twitch, headY - 4 - earHeight);
          ctx.lineTo(cx, headY - 4 - earHeight + 3);
          ctx.closePath();
          ctx.fill();
        }

        if (!isBack) {
          ctx.fillStyle = innerColor;
          ctx.beginPath();
          ctx.moveTo(cx - dirSign * 3, headY - 4);
          ctx.lineTo(cx - dirSign * 1 + twitch, headY - 4 - (earHeight - 2));
          ctx.lineTo(cx + dirSign * 1, headY - 4);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.moveTo(cx - 7, headY - 4);
        ctx.lineTo(cx - 5 + twitch, headY - 4 - earHeight);
        ctx.lineTo(cx - 2, headY - 5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 2, headY - 5);
        ctx.lineTo(cx + 5 - twitch, headY - 4 - earHeight);
        ctx.lineTo(cx + 7, headY - 4);
        ctx.closePath();
        ctx.fill();

        if (isFox) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 6 + twitch, headY - 4 - earHeight, 2, 2.5);
          ctx.fillRect(cx + 4 - twitch, headY - 4 - earHeight, 2, 2.5);
        }

        if (!isBack) {
          ctx.fillStyle = innerColor;
          ctx.beginPath();
          ctx.moveTo(cx - 6, headY - 4);
          ctx.lineTo(cx - 5 + twitch, headY - 4 - (earHeight - 2));
          ctx.lineTo(cx - 3, headY - 5);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(cx + 3, headY - 5);
          ctx.lineTo(cx + 5 - twitch, headY - 4 - (earHeight - 2));
          ctx.lineTo(cx + 6, headY - 4);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /**
   * Semi-Realistic Anime Female Face with soft chin, expressive eyes & catchlights
   */
  private drawAnimeFemaleFace(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isRight: boolean,
    skinTone: string,
    eyeColor: string,
    blushColor = '#fb7185'
  ) {
    // Soft contoured petite anime chin & jawline
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 6);
    ctx.lineTo(cx + 6, cy - 6);
    ctx.quadraticCurveTo(cx + 6.2, cy + 3.5, cx + (isRight ? 1.5 : -1.5), cy + 7.2);
    ctx.quadraticCurveTo(cx - (isRight ? 1.5 : -1.5), cy + 3.5, cx - 6, cy - 6);
    ctx.closePath();
    ctx.fill();

    // Soft chin/jawline ambient depth shadow
    ctx.fillStyle = 'rgba(180, 83, 9, 0.14)';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 4.5);
    ctx.lineTo(cx + 5, cy + 4.5);
    ctx.lineTo(cx, cy + 7.5);
    ctx.closePath();
    ctx.fill();

    // Expressive Large Anime Eyes with lush lashes & double sparkles
    const leftEyeX = cx - (isRight ? 1.5 : 4.5);
    const rightEyeX = cx + (isRight ? 2.5 : -0.5);
    const eyeY = cy - 0.8;

    // Eyelash Wing (Dark anime lash line)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 2, eyeY - 2.2);
    ctx.lineTo(leftEyeX + 2, eyeY - 2.2);
    ctx.lineTo(leftEyeX + 2.5, eyeY - 1.2);
    ctx.lineTo(leftEyeX - 1.5, eyeY - 1.2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(rightEyeX - 1, eyeY - 2.2);
    ctx.lineTo(rightEyeX + 3, eyeY - 2.2);
    ctx.lineTo(rightEyeX + 3.5, eyeY - 1.2);
    ctx.lineTo(rightEyeX - 0.5, eyeY - 1.2);
    ctx.closePath();
    ctx.fill();

    // Iris (Gleaming vibrant anime color with gradient depth)
    ctx.fillStyle = eyeColor;
    ctx.fillRect(leftEyeX - 1.2, eyeY - 1.2, 2.6, 3.2);
    ctx.fillRect(rightEyeX - 0.2, eyeY - 1.2, 2.6, 3.2);

    // Deep Pupil
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(leftEyeX - 0.6, eyeY - 0.5, 1.4, 1.6);
    ctx.fillRect(rightEyeX + 0.4, eyeY - 0.5, 1.4, 1.6);

    // Double Catchlight Highlights (Anime Sparkle: Primary large + Secondary petite)
    ctx.fillStyle = '#ffffff';
    // Primary catchlight (top-left of pupil)
    ctx.fillRect(leftEyeX - 1.0, eyeY - 1.0, 1.1, 1.1);
    ctx.fillRect(rightEyeX, eyeY - 1.0, 1.1, 1.1);
    // Secondary catchlight (bottom-right twinkle)
    ctx.fillRect(leftEyeX + 0.5, eyeY + 0.8, 0.7, 0.7);
    ctx.fillRect(rightEyeX + 1.5, eyeY + 0.8, 0.7, 0.7);

    // Soft Rosy Anime Maiden Cheek Blush
    ctx.fillStyle = blushColor;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(leftEyeX - 1.2, eyeY + 3.0, 2.2, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rightEyeX + 1.8, eyeY + 3.0, 2.2, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Small Cute Anime Nose & Sweet Lips
    ctx.fillStyle = 'rgba(180, 83, 9, 0.45)';
    ctx.fillRect(cx + (isRight ? 0.4 : -0.4), cy + 2.2, 0.8, 0.8);
    // Sweet smiling anime mouth
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx, cy + 4.6, 1.4, 0.1, Math.PI - 0.1);
    ctx.stroke();
    // Gloss highlight on lip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 0.3, cy + 4.8, 0.7, 0.6);
  }

  /**
   * Hourglass Curvature Torso with bustline, slim waist, and hip contour
   */
  private drawFeminineHourglassTorso(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isRight: boolean,
    colors: { base: string; highlight: string; shadow: string; trim?: string },
    exposedMidriff = false,
    skinTone = '#ffedd5'
  ) {
    if (exposedMidriff) {
      // 1. Crop-top bustier / bra-armor with cleavage
      ctx.fillStyle = colors.shadow;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 8);
      ctx.lineTo(cx + 6, cy - 8);
      ctx.quadraticCurveTo(cx + 7, cy - 2, cx + 4.5, cy + 2);
      ctx.lineTo(cx - 4.5, cy + 2);
      ctx.quadraticCurveTo(cx - 7, cy - 2, cx - 6, cy - 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.base;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 7);
      ctx.lineTo(cx + 5, cy - 7);
      ctx.quadraticCurveTo(cx + 6, cy - 2, cx + 4, cy + 1);
      ctx.lineTo(cx - 4, cy + 1);
      ctx.quadraticCurveTo(cx - 6, cy - 2, cx - 5, cy - 7);
      ctx.closePath();
      ctx.fill();

      // Volumetric Bust Curves with cleavage
      ctx.fillStyle = colors.highlight;
      ctx.beginPath();
      ctx.ellipse(cx - 2.8, cy - 2.5, 3.2, 2.6, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 2.8, cy - 2.5, 3.2, 2.6, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.shadow;
      ctx.fillRect(cx - 0.5, cy - 4.5, 1, 4);

      // Gold/color trim on bustier underbust
      if (colors.trim) {
        ctx.fillStyle = colors.trim;
        ctx.fillRect(cx - 4.5, cy + 1, 9, 1.2);
      }

      // 2. EXPOSED TONED MIDRIFF (ชุดโชว์หน้าท้อง เอวเอส สะดือชัดเจน)
      // Soft feminine skin fill for bare tummy
      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 2);
      ctx.lineTo(cx + 4, cy + 2);
      ctx.quadraticCurveTo(cx + 6, cy + 6, cx + 5.5, cy + 8);
      ctx.lineTo(cx - 5.5, cy + 8);
      ctx.quadraticCurveTo(cx - 6, cy + 6, cx - 4, cy + 2);
      ctx.closePath();
      ctx.fill();

      // Subtle abdominal midline contour (11-line abs)
      ctx.fillStyle = 'rgba(180, 83, 9, 0.18)';
      ctx.fillRect(cx - 0.4, cy + 2.5, 0.8, 4);
      ctx.fillRect(cx - 4.5, cy + 3.5, 1, 3);
      ctx.fillRect(cx + 3.5, cy + 3.5, 1, 3);

      // Cute feminine navel with depth shadow & highlight
      ctx.fillStyle = '#b45309';
      ctx.fillRect(cx - 0.6, cy + 6.2, 1.2, 1.2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(cx - 0.3, cy + 5.8, 0.6, 0.6);

      // 3. Low-Rise Belt & Shorts/Skirt
      ctx.fillStyle = colors.shadow;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 8);
      ctx.lineTo(cx + 6, cy + 8);
      ctx.lineTo(cx + 6.5, cy + 12);
      ctx.lineTo(cx - 6.5, cy + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.base;
      ctx.fillRect(cx - 5.5, cy + 8.5, 11, 3);

      if (colors.trim) {
        ctx.fillStyle = colors.trim;
        ctx.fillRect(cx - 6, cy + 8, 12, 1.5);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(cx - 1.5, cy + 7.5, 3, 2.5);
      }
      return;
    }

    // 1. Breastplate / Bodice with distinct curved bustline
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 8);
    ctx.lineTo(cx + 6, cy - 8);
    ctx.quadraticCurveTo(cx + 8, cy - 2, cx + 4, cy + 3); // tapered waist
    ctx.quadraticCurveTo(cx + 7, cy + 8, cx + 7, cy + 12); // flaring hips
    ctx.lineTo(cx - 7, cy + 12);
    ctx.quadraticCurveTo(cx - 7, cy + 8, cx - 4, cy + 3); // tapered waist
    ctx.quadraticCurveTo(cx - 8, cy - 2, cx - 6, cy - 8);
    ctx.closePath();
    ctx.fill();

    // 2. Light Midtone Front Fill
    ctx.fillStyle = colors.base;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 7);
    ctx.lineTo(cx + 5, cy - 7);
    ctx.quadraticCurveTo(cx + 7, cy - 2, cx + 3.5, cy + 3);
    ctx.quadraticCurveTo(cx + 6, cy + 8, cx + 6, cy + 11);
    ctx.lineTo(cx - 6, cy + 11);
    ctx.quadraticCurveTo(cx - 6, cy + 8, cx - 3.5, cy + 3);
    ctx.quadraticCurveTo(cx - 7, cy - 2, cx - 5, cy - 7);
    ctx.closePath();
    ctx.fill();

    // 3. Volumetric Bust Curves (Dual subtle globes catching highlight)
    ctx.fillStyle = colors.highlight;
    // Left bust curve
    ctx.beginPath();
    ctx.ellipse(cx - 2.8, cy - 2.5, 3.2, 2.6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Right bust curve
    ctx.beginPath();
    ctx.ellipse(cx + 2.8, cy - 2.5, 3.2, 2.6, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Cleavage shadow groove between bust
    ctx.fillStyle = colors.shadow;
    ctx.fillRect(cx - 0.5, cy - 4.5, 1, 4);

    // Slim corset waist shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 2);
    ctx.lineTo(cx + 4, cy + 2);
    ctx.lineTo(cx + 5, cy + 6);
    ctx.lineTo(cx - 5, cy + 6);
    ctx.closePath();
    ctx.fill();

    // Decorative corset trim or filigree
    if (colors.trim) {
      ctx.fillStyle = colors.trim;
      ctx.fillRect(cx - 4, cy + 6, 8, 1.5);
      ctx.fillRect(cx - 0.75, cy + 2, 1.5, 6);
    }
  }

  /**
   * Slender Feminine Legs & Boots with graceful thigh and calf contours
   */
  private drawFeminineLegs(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isRight: boolean,
    step: number,
    skinColor: string,
    bootColors: { base: string; highlight: string; shadow: string }
  ) {
    const leftX = cx - 4 + (isRight ? -step : step);
    const rightX = cx + 4 + (isRight ? step : -step);

    // Thighs (Soft feminine skin tone or tights)
    ctx.fillStyle = skinColor;
    ctx.fillRect(leftX - 2.5, cy + 12, 4.5, 6);
    ctx.fillRect(rightX - 2, cy + 12, 4.5, 6);

    // Left Boot (Fitted high-heeled sabaton/riding boot)
    ctx.fillStyle = bootColors.shadow;
    ctx.beginPath();
    ctx.moveTo(leftX - 2.5, cy + 17);
    ctx.lineTo(leftX + 2, cy + 17);
    ctx.lineTo(leftX + 2.5, cy + 30);
    ctx.lineTo(leftX + 4.5, cy + 34); // Toe tip
    ctx.lineTo(leftX - 3, cy + 34); // Heel base
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = bootColors.base;
    ctx.fillRect(leftX - 2, cy + 18, 3.5, 12);
    ctx.fillStyle = bootColors.highlight;
    ctx.fillRect(leftX - 1.5, cy + 18, 1.5, 12);

    // Right Boot
    ctx.fillStyle = bootColors.base;
    ctx.beginPath();
    ctx.moveTo(rightX - 2, cy + 17);
    ctx.lineTo(rightX + 2.5, cy + 17);
    ctx.lineTo(rightX + 3, cy + 30);
    ctx.lineTo(rightX + 5, cy + 34);
    ctx.lineTo(rightX - 2.5, cy + 34);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = bootColors.highlight;
    ctx.fillRect(rightX - 1, cy + 18, 2, 12);

    // Gold/silver boot cuff trim
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(leftX - 2.5, cy + 17, 5, 1.5);
    ctx.fillRect(rightX - 2, cy + 17, 5, 1.5);
  }

  /**
   * Articulated feminine arms with graceful hands, sleeves/gauntlets, and dynamic combat stances:
   * - 'magic': One arm raised high casting energy sparks, other holding focal point
   * - 'attack' / 'strike': Weapon arm thrust/slashed forward dynamically with shoulder rotation
   * - 'counter': Both arms raised bracing shield / parrying in guard stance
   * - 'idle' / 'run': Natural feminine resting/swaying arm pose
   */
  private drawFeminineArms(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isRight: boolean,
    animState: CharacterAnimState,
    skinTone: string,
    sleeveColor?: string,
    gauntletColor?: string
  ) {
    ctx.save();
    const leftArmX = cx - 7;
    const rightArmX = cx + 7;
    const shoulderY = cy - 4;

    if (animState === 'magic') {
      // Casting pose: Main arm raised high, other hand channeling energy
      const castingArmX = isRight ? cx + 9 : cx - 9;
      const offArmX = isRight ? cx - 8 : cx + 8;

      // Off-hand bent forward channeling
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.fillRect(offArmX - 1.5, shoulderY, 3, 7);
      ctx.fillStyle = skinTone;
      ctx.fillRect(offArmX - (isRight ? 3 : -1), shoulderY + 6, 3, 3); // hand

      // Casting arm raised up
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.beginPath();
      ctx.moveTo(castingArmX - 1.5, shoulderY);
      ctx.lineTo(castingArmX + 1.5, shoulderY);
      ctx.lineTo(castingArmX + (isRight ? 4 : -4), shoulderY - 8);
      ctx.lineTo(castingArmX + (isRight ? 2 : -2), shoulderY - 8);
      ctx.closePath();
      ctx.fill();

      // Hand reaching upward
      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.arc(castingArmX + (isRight ? 3 : -3), shoulderY - 9, 2, 0, Math.PI * 2);
      ctx.fill();

      // Glowing magical spark at fingertips
      ctx.fillStyle = '#fde047';
      ctx.fillRect(castingArmX + (isRight ? 2 : -4), shoulderY - 12, 2, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(castingArmX + (isRight ? 3 : -3), shoulderY - 11, 1, 1);
    } else if (animState === 'attack' || animState === 'strike') {
      // Dynamic slash / thrust forward
      const leadX = isRight ? cx + 11 : cx - 11;
      const rearX = isRight ? cx - 8 : cx + 8;

      // Rear arm balancing back
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.beginPath();
      ctx.moveTo(rearX, shoulderY);
      ctx.lineTo(rearX - (isRight ? 4 : -4), shoulderY + 6);
      ctx.lineTo(rearX - (isRight ? 6 : -6), shoulderY + 5);
      ctx.lineTo(rearX, shoulderY - 1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = skinTone;
      ctx.fillRect(rearX - (isRight ? 6 : -4), shoulderY + 5, 2.5, 2.5);

      // Lead attacking arm lunging forward
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.beginPath();
      ctx.moveTo(leadX - (isRight ? 4 : -4), shoulderY - 2);
      ctx.lineTo(leadX + (isRight ? 4 : -4), shoulderY + 2);
      ctx.lineTo(leadX + (isRight ? 3 : -3), shoulderY + 4);
      ctx.lineTo(leadX - (isRight ? 5 : -5), shoulderY);
      ctx.closePath();
      ctx.fill();

      if (gauntletColor) {
        ctx.fillStyle = gauntletColor;
        ctx.fillRect(leadX + (isRight ? 1 : -3), shoulderY + 1, 3, 3);
      }
      ctx.fillStyle = skinTone;
      ctx.fillRect(leadX + (isRight ? 3 : -5), shoulderY + 2, 2.5, 2.5);
    } else if (animState === 'counter') {
      // Defensive guard / shield brace
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.fillRect(leftArmX, shoulderY, 3, 6);
      ctx.fillRect(rightArmX - 3, shoulderY, 3, 6);
      ctx.fillRect(cx - 5, shoulderY + 5, 10, 2.5);
      if (gauntletColor) {
        ctx.fillStyle = gauntletColor;
        ctx.fillRect(cx - 4, shoulderY + 4, 8, 2);
      }
      ctx.fillStyle = skinTone;
      ctx.fillRect(cx - 2, shoulderY + 4, 4, 2);
    } else {
      // Natural idle/run swaying arms
      const armSway = animState === 'run' ? Math.sin(Date.now() * 0.01) * 3 : 0;
      // Left arm
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.fillRect(leftArmX - 1, shoulderY, 2.5, 9 + armSway);
      if (gauntletColor) {
        ctx.fillStyle = gauntletColor;
        ctx.fillRect(leftArmX - 1.5, shoulderY + 6, 3, 3);
      }
      ctx.fillStyle = skinTone;
      ctx.fillRect(leftArmX - 1, shoulderY + 9 + armSway, 2, 2);

      // Right arm
      ctx.fillStyle = sleeveColor || skinTone;
      ctx.fillRect(rightArmX - 1.5, shoulderY, 2.5, 9 - armSway);
      if (gauntletColor) {
        ctx.fillStyle = gauntletColor;
        ctx.fillRect(rightArmX - 1.5, shoulderY + 6, 3, 3);
      }
      ctx.fillStyle = skinTone;
      ctx.fillRect(rightArmX - 1, shoulderY + 9 - armSway, 2, 2);
    }
    ctx.restore();
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
    } else if (dir === 'NW') {
      ctx.arc(cx - 10, cy - 14, 30, Math.PI * 0.85, Math.PI * 1.65);
    } else if (dir === 'S') {
      ctx.arc(cx, cy + 6, 30, -Math.PI * 0.1, Math.PI * 1.1);
    } else if (dir === 'N') {
      ctx.arc(cx, cy - 16, 30, Math.PI * 0.9, Math.PI * 2.1);
    } else if (dir === 'E') {
      ctx.arc(cx + 12, cy - 4, 30, -Math.PI * 0.4, Math.PI * 0.4);
    } else { // 'W'
      ctx.arc(cx - 12, cy - 4, 30, Math.PI * 0.6, Math.PI * 1.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // 1. WARRIOR MAIDEN: VALERIA (อัศวินสาว วาเลเรีย)
  // Radiant golden hair ponytail, form-fitting silver plate armor, royal blue cape,
  // winged visor tiara, engraved broadsword & heater shield
  // =========================================================================
  private renderWarrior(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    _equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null },
    skinVariant: number = 0
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Palette variants
    let steelHighlight = '#f8fafc';
    let steelBase = '#cbd5e1';
    let steelShadow = '#475569';
    let steelDeep = '#1e293b';
    let goldTrim = '#fbbf24';
    let capeColor = '#2563eb';
    let capeShadow = '#1d4ed8';
    let hairColor = '#facc15';
    let hairShadow = '#ca8a04';
    const skinTone = '#ffedd5';

    if (skinVariant === 1) {
      // Crimson Rose Knight
      steelBase = '#991b1b';
      steelHighlight = '#f87171';
      steelShadow = '#450a0a';
      goldTrim = '#fbbf24';
      capeColor = '#18181b';
      capeShadow = '#09090b';
      hairColor = '#f8fafc';
      hairShadow = '#94a3b8';
    } else if (skinVariant === 2) {
      // Dark Valkyrie
      steelBase = '#334155';
      steelHighlight = '#94a3b8';
      steelShadow = '#0f172a';
      goldTrim = '#c084fc';
      capeColor = '#7e22ce';
      capeShadow = '#4c1d95';
      hairColor = '#38bdf8';
      hairShadow = '#0284c7';
    }

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1.5 Furry Beastgirl Fluffy Tail (Swinging gracefully behind)
    const warriorBeast = skinVariant === 1 ? 'fox' : (skinVariant === 2 ? 'horns' : 'wolf');
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, warriorBeast, hairColor, '#ffffff');

    // 2. Flowing Cape (Back of body)
    const capeWave = Math.sin((frame / 6) * Math.PI * 2) * 3.5;
    ctx.fillStyle = capeShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 4);
    ctx.lineTo(cx + 7, cy - 4);
    ctx.lineTo(cx + (isRight ? 14 : 7) + capeWave, cy + 28);
    ctx.lineTo(cx - (isRight ? 7 : 14) + capeWave, cy + 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = capeColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 3);
    ctx.lineTo(cx + 5, cy - 3);
    ctx.lineTo(cx + (isRight ? 11 : 5) + capeWave, cy + 26);
    ctx.lineTo(cx - (isRight ? 5 : 11) + capeWave, cy + 26);
    ctx.closePath();
    ctx.fill();

    // 3. Slender Legs & Sabatons
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 5 : 0;
    this.drawFeminineLegs(ctx, cx, cy, isRight, legStep, skinTone, {
      base: steelBase,
      highlight: steelHighlight,
      shadow: steelShadow
    });

    // 4. Form-Fitting Cuirass & Faulds (Hourglass Armor)
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: steelBase,
      highlight: steelHighlight,
      shadow: steelShadow,
      trim: goldTrim
    });

    // Armored Pauldrons (Left & Right)
    ctx.fillStyle = steelShadow;
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = steelBase;
    ctx.beginPath();
    ctx.arc(cx + 9, cy - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - 10, cy - 7, 3, 2);
    ctx.fillRect(cx + 7, cy - 7, 3, 2);

    // 4.5 Articulated Feminine Arms
    this.drawFeminineArms(ctx, cx, cy, isRight, animState, skinTone, steelBase, goldTrim);

    // 5. Shield in Offhand
    const shieldX = isRight ? cx - 12 : cx + 12;
    const shieldY = cy + 4;
    ctx.save();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(shieldX - 6, shieldY - 8);
    ctx.lineTo(shieldX + 6, shieldY - 8);
    ctx.lineTo(shieldX + 6, shieldY + 3);
    ctx.lineTo(shieldX, shieldY + 11);
    ctx.lineTo(shieldX - 6, shieldY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Golden Maiden Fleur emblem
    ctx.fillStyle = goldTrim;
    ctx.fillRect(shieldX - 1, shieldY - 5, 2, 10);
    ctx.fillRect(shieldX - 4, cy + 2, 8, 2);
    ctx.restore();

    // 6. Broadsword in Mainhand
    const weaponX = isRight ? cx + 14 : cx - 14;
    const weaponY = cy + 2;
    const isAttacking = animState === 'attack' || animState === 'strike';

    ctx.save();
    ctx.translate(weaponX, weaponY);
    if (isAttacking) {
      ctx.rotate((isRight ? 1 : -1) * (0.8 + offsets.slashProgress * 1.5));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -26, 4, 24);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -26, 2, 24);
      ctx.fillStyle = goldTrim;
      ctx.fillRect(-5, -2, 11, 3);
    } else {
      ctx.rotate(isRight ? 0.35 : -0.35);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -20, 3.5, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -20, 1.5, 18);
      ctx.fillStyle = goldTrim;
      ctx.fillRect(-4, -2, 9, 2.5);
    }
    ctx.restore();

    // 7. Head, Face & Gorgeous Golden Hair
    const headY = cy - 14;

    // Hair Back / Ponytail (swaying dynamically)
    const hairSway = Math.sin((frame / 6) * Math.PI * 2) * 3;
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.moveTo(cx, headY - 4);
    ctx.quadraticCurveTo(cx - 10, headY - 12, cx - 14 + hairSway, headY + 2);
    ctx.lineTo(cx - 8 + hairSway, headY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx, headY - 5);
    ctx.quadraticCurveTo(cx - 7, headY - 11, cx - 11 + hairSway, headY + 1);
    ctx.lineTo(cx - 7 + hairSway, headY + 4);
    ctx.closePath();
    ctx.fill();

    // Face
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', skinTone, '#2563eb');
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, skinTone, '#2563eb');
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, headY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hair Bangs & Side locks framing face
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY - 4);
    ctx.lineTo(cx + 6, headY - 4);
    ctx.lineTo(cx + (isRight ? 4 : 2), headY);
    ctx.lineTo(cx + (isRight ? 0 : -2), headY - 2);
    ctx.lineTo(cx - 6, headY);
    ctx.closePath();
    ctx.fill();

    // Golden Tiara / Winged Headband
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - 5, headY - 5, 10, 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 1, headY - 6, 2, 2); // Gem

    // Furry Beastgirl Ears (Alert animated wolf/fox ears)
    this.drawFurryBeastgirlEars(ctx, cx, headY, dir, frame, warriorBeast, hairColor, '#fda4af');

    // Attack Slash
    if (isAttacking) {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#60a5fa');
    }
  }

  // =========================================================================
  // 2. SORCERESS: LYRA (จอมเวทสาว ไลรา)
  // Indigo starry robe with corseted bodice, thigh slit skirt, purple wavy twintails,
  // wizard hat, levitating arcane crystal staff
  // =========================================================================
  private renderMagician(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    _equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null },
    skinVariant: number = 0
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    let robeLight = '#c084fc';
    let robeBase = '#9333ea';
    let robeShadow = '#581c87';
    let hairColor = '#e879f9';
    let hairShadow = '#a21caf';
    let crystalColor = '#38bdf8';
    const skinTone = '#ffedd5';

    if (skinVariant === 1) {
      // Crimson Flame Sorceress
      robeLight = '#f87171';
      robeBase = '#dc2626';
      robeShadow = '#7f1d1d';
      hairColor = '#fb923c';
      hairShadow = '#c2410c';
      crystalColor = '#facc15';
    } else if (skinVariant === 2) {
      // Astral Frost Sorceress
      robeLight = '#bae6fd';
      robeBase = '#0284c7';
      robeShadow = '#0c4a6e';
      hairColor = '#f0f9ff';
      hairShadow = '#7dd3fc';
      crystalColor = '#a855f7';
    }

    // 1. Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 17, 8);

    // 1.5 Furry Beastgirl Fluffy Tail (Swinging gracefully behind)
    const mageBeast = skinVariant === 1 ? 'cat' : (skinVariant === 2 ? 'horns' : 'fox');
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, mageBeast, hairColor, '#ffffff');

    // 2. Skirt with Side Thigh Slit
    const robeSway = animState === 'run' ? Math.sin(frame * 1.1) * 3 : Math.sin(frame * 0.5) * 1.5;
    ctx.fillStyle = robeShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10);
    ctx.lineTo(cx + 6, cy + 10);
    ctx.lineTo(cx + 12 + robeSway, cy + 32);
    ctx.lineTo(cx - 12 + robeSway, cy + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = robeBase;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 11);
    ctx.lineTo(cx + 5, cy + 11);
    ctx.lineTo(cx + 10 + robeSway, cy + 30);
    ctx.lineTo(cx - 10 + robeSway, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Thigh peeking through dress slit
    ctx.fillStyle = skinTone;
    ctx.fillRect(cx - (isRight ? 1 : 4), cy + 14, 3, 10);
    // Dark high heel boot peeking out
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(cx - (isRight ? 2 : 5), cy + 24, 4, 8);

    // Gold Runic hem
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 10 + robeSway, cy + 28, 20, 2);

    // 3. Corseted Hourglass Bodice with Exposed Midriff
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: robeBase,
      highlight: robeLight,
      shadow: robeShadow,
      trim: '#facc15'
    }, true, skinTone);

    // 3.5 Articulated Feminine Arms
    this.drawFeminineArms(ctx, cx, cy, isRight, animState, skinTone, robeBase);

    // 4. Staff with Levitating Arcane Crystal & Orbital Rings
    const staffX = isRight ? cx + 15 : cx - 15;
    const staffY = cy + 2;
    ctx.save();
    // Ornate Golden Relic Shaft
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(staffX, staffY + 26);
    ctx.lineTo(staffX, staffY - 14);
    ctx.stroke();

    // Golden Caduceus Crown Finial
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(staffX, staffY - 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Floating pulsing crystal
    const crystalHover = Math.sin((frame / 8) * Math.PI * 2) * 3;
    const crystalY = staffY - 25 + crystalHover;
    ctx.fillStyle = crystalColor;
    ctx.shadowColor = crystalColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(staffX, crystalY - 8);
    ctx.lineTo(staffX + 5.5, crystalY);
    ctx.lineTo(staffX, crystalY + 8);
    ctx.lineTo(staffX - 5.5, crystalY);
    ctx.closePath();
    ctx.fill();

    // Orbiting Planetary Arcane Rings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(staffX, crystalY, 8, 3, 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 5. Head, Long Flowing Wavy Hair & Grand Archmage Hat
    const headY = cy - 14;

    // Long cascading wavy hair locks billowing behind shoulders (NO puffs)
    const hairWave = Math.sin((frame / 6) * Math.PI * 2) * 2.8;
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, headY);
    ctx.quadraticCurveTo(cx - 12 + hairWave, headY + 8, cx - 10 + hairWave * 1.3, cy + 18);
    ctx.lineTo(cx + 7 + hairWave * 1.3, cy + 18);
    ctx.quadraticCurveTo(cx + 10 + hairWave, headY + 8, cx + 6, headY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY);
    ctx.quadraticCurveTo(cx - 9 + hairWave, headY + 8, cx - 7 + hairWave * 1.2, cy + 16);
    ctx.lineTo(cx + 5 + hairWave * 1.2, cy + 16);
    ctx.quadraticCurveTo(cx + 8 + hairWave, headY + 8, cx + 5, headY);
    ctx.closePath();
    ctx.fill();

    // Face
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', skinTone, '#a855f7');
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, skinTone, '#a855f7');
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, headY, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Furry Beastgirl Ears (Fox/Cat ears peeking below witch hat)
    this.drawFurryBeastgirlEars(ctx, cx, headY, dir, frame, mageBeast, hairColor, '#fda4af');

    // Grand Archmage Witch Hat with Curved Tip & Celestial Star Buckle
    const hatTilt = isRight ? 2.5 : -2.5;
    // Outer wide undulating brim with gold edge
    ctx.fillStyle = robeShadow;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 3, 14, 5.5, hatTilt * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = robeBase;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 4, 12.5, 4.5, hatTilt * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Gold trim around hat brim
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 4, 13, 5, hatTilt * 0.05, 0, Math.PI * 2);
    ctx.stroke();

    // Curving conical crown
    ctx.fillStyle = robeBase;
    ctx.beginPath();
    ctx.moveTo(cx - 7, headY - 5);
    ctx.lineTo(cx + 7, headY - 5);
    ctx.quadraticCurveTo(cx + hatTilt * 3, headY - 19, cx - hatTilt * 6, headY - 27);
    ctx.closePath();
    ctx.fill();

    // Gold Hat Band with Celestial Star
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 5, headY - 7, 10, 2.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, headY - 8, 2, 4);
    ctx.fillRect(cx - 2, headY - 7, 4, 2);

    // Magic Circle when casting
    if (animState === 'magic') {
      ctx.save();
      ctx.strokeStyle = crystalColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = crystalColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 34, 22, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // =========================================================================
  // 3. PRIESTESS: ARIA (นักบวชสาว อาเรีย)
  // Angelic white & gold holy habit, floating golden halo, gentle emerald eyes,
  // golden war mace, divine radiant light
  // =========================================================================
  private renderCleric(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    _equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null },
    skinVariant: number = 0
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    let whiteBright = '#ffffff';
    let whiteBase = '#f1f5f9';
    let whiteShadow = '#cbd5e1';
    let goldPrimary = '#fbbf24';
    let hairColor = '#fde68a';
    const skinTone = '#fef08a';

    if (skinVariant === 1) {
      // Twilight Saintess
      whiteBright = '#e0e7ff';
      whiteBase = '#818cf8';
      whiteShadow = '#4338ca';
      goldPrimary = '#c084fc';
      hairColor = '#fbcfe8';
    }

    // 1. Ground Shadow & Divine Glow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 9);

    // 1.5 Furry Beastgirl Fluffy Tail (Bunny cottontail / Holy cat tail)
    const clericBeast = skinVariant === 1 ? 'cat' : (skinVariant === 2 ? 'fox' : 'bunny');
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, clericBeast, hairColor, '#ffffff');
    ctx.save();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. White Pleated Robe Skirt
    const robeSway = animState === 'run' ? Math.sin(frame * 1.1) * 3 : 0;
    ctx.fillStyle = whiteShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 10);
    ctx.lineTo(cx + 7, cy + 10);
    ctx.lineTo(cx + 12 + robeSway, cy + 32);
    ctx.lineTo(cx - 12 + robeSway, cy + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = whiteBright;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 11);
    ctx.lineTo(cx + 6, cy + 11);
    ctx.lineTo(cx + 10 + robeSway, cy + 30);
    ctx.lineTo(cx - 10 + robeSway, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Gold hem and scapular stole
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(cx - 11 + robeSway, cy + 28, 22, 2.5);
    ctx.fillRect(cx - 2, cy + 8, 4, 18);

    // 3. Fitted White Bodice & Gold Cross Pectoral
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: whiteBright,
      highlight: '#ffffff',
      shadow: whiteShadow,
      trim: goldPrimary
    });

    // 3.5 Articulated Feminine Arms
    this.drawFeminineArms(ctx, cx, cy, isRight, animState, skinTone, whiteBright, goldPrimary);

    // 4. Golden War Mace
    const maceX = isRight ? cx + 14 : cx - 14;
    const maceY = cy + 4;
    ctx.save();
    ctx.translate(maceX, maceY);
    ctx.rotate(isRight ? 0.25 : -0.25);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1.5, -12, 3, 20);
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(-4, -18, 8, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -16, 2, 3);
    ctx.restore();

    // 5. Head, Face, Braided Hair & Habit Cowl
    const headY = cy - 14;

    // Face
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', skinTone, '#10b981');
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, skinTone, '#10b981');
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, headY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Furry Beastgirl Ears (Bunny / Cat ears)
    this.drawFurryBeastgirlEars(ctx, cx, headY, dir, frame, clericBeast, hairColor, '#fda4af');

    // Nun Habit / Veiled Cowl framing head gracefully
    ctx.fillStyle = whiteShadow;
    ctx.beginPath();
    ctx.arc(cx, headY, 8, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    ctx.fillStyle = whiteBright;
    ctx.beginPath();
    ctx.arc(cx, headY - 1, 7.5, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    // Golden Circlet with Cross on forehead
    ctx.fillStyle = goldPrimary;
    ctx.fillRect(cx - 5, headY - 3, 10, 2);
    ctx.fillRect(cx - 1, headY - 5, 2, 4);

    // Golden Halo floating radiantly above
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 11, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // 4. ROGUE / ASSASSIN: JAXINE (จอมโจรสาว แจ็กซีน)
  // Sleek black & emerald leather stealth suit, slim corset, thigh-high boots,
  // dual venom daggers, flowing raven twintails, rogue eye mask
  // =========================================================================
  private renderThief(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    _equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null },
    skinVariant: number = 0
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    let suitBase = '#1e293b';
    let suitLight = '#334155';
    let suitShadow = '#0f172a';
    let poisonGreen = '#22c55e';
    let hairColor = '#0f172a';
    const skinTone = '#ffedd5';

    if (skinVariant === 1) {
      // Crimson Shadow Assassin
      suitBase = '#450a0a';
      suitLight = '#7f1d1d';
      suitShadow = '#1c0505';
      poisonGreen = '#ef4444';
      hairColor = '#7f1d1d';
    }

    // 1. Agile Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 15, 7.5);

    // 1.5 Furry Beastgirl Fluffy Tail (Cat / Shadow Wolf tail)
    const thiefBeast = skinVariant === 1 ? 'wolf' : (skinVariant === 2 ? 'fox' : 'cat');
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, thiefBeast, hairColor, '#ffffff');

    // 2. Slender Legs in Sleek Leather Tights & Thigh-High Boots
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 6 : 0;
    this.drawFeminineLegs(ctx, cx, cy, isRight, legStep, skinTone, {
      base: suitBase,
      highlight: suitLight,
      shadow: suitShadow
    });

    // Thigh Holster Strap for throwing knives
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - (isRight ? 4 : -2), cy + 15, 4, 1.5);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - (isRight ? 3 : -1), cy + 14, 1.5, 3);

    // 3. Contoured Hourglass Leather Bodice with Exposed Midriff
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: suitBase,
      highlight: suitLight,
      shadow: suitShadow,
      trim: '#ca8a04'
    }, true, skinTone);

    // 3.5 Articulated Feminine Arms
    this.drawFeminineArms(ctx, cx, cy, isRight, animState, skinTone, suitBase, poisonGreen);

    // 4. Dual Venom Daggers
    const dagger1X = cx - 12;
    const dagger2X = cx + 12;
    const daggerY = cy + 6;

    // Left Dagger
    ctx.save();
    ctx.translate(dagger1X, daggerY);
    ctx.rotate(-0.4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1.5, -11, 3, 11);
    ctx.fillStyle = poisonGreen;
    ctx.fillRect(0, -11, 1.5, 11);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-2.5, 0, 5, 2);
    ctx.restore();

    // Right Dagger
    ctx.save();
    ctx.translate(dagger2X, daggerY);
    ctx.rotate(0.4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1.5, -11, 3, 11);
    ctx.fillStyle = poisonGreen;
    ctx.fillRect(0, -11, 1.5, 11);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-2.5, 0, 5, 2);
    ctx.restore();

    // 5. Head, Flowing Layered Raven Hair & Assassin Cowl
    const headY = cy - 14;

    // Flowing layered raven hair locks billowing behind
    const hairWave = Math.sin((frame / 6) * Math.PI * 2) * 3;
    ctx.fillStyle = suitShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY);
    ctx.quadraticCurveTo(cx - 12 + hairWave, headY + 8, cx - 10 + hairWave * 1.3, cy + 18);
    ctx.lineTo(cx + 6 + hairWave * 1.3, cy + 18);
    ctx.quadraticCurveTo(cx + 10 + hairWave, headY + 8, cx + 5, headY);
    ctx.closePath();
    ctx.fill();

    // Face (Expressive Golden Cat Anime Eyes, NO black bar covering eyes!)
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', skinTone, '#f59e0b');
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, skinTone, '#f59e0b');
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, headY, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Framing side bangs
    ctx.fillStyle = suitShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 5, headY - 4);
    ctx.lineTo(cx - 7, headY + 4);
    ctx.lineTo(cx - 4, headY - 1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 5, headY - 4);
    ctx.lineTo(cx + 7, headY + 4);
    ctx.lineTo(cx + 4, headY - 1);
    ctx.closePath();
    ctx.fill();

    // Furry Beastgirl Ears (Neko / Fox stealth ears)
    this.drawFurryBeastgirlEars(ctx, cx, headY, dir, frame, thiefBeast, hairColor, '#fda4af');

    // Stylish Sleek Assassin Hood / Cowl draped gracefully around collar
    ctx.fillStyle = suitShadow;
    ctx.beginPath();
    ctx.arc(cx, headY - 4, 7.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();

    if (animState === 'attack' || animState === 'strike') {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#22c55e');
    }
  }

  // =========================================================================
  // 5. RANGER / HUNTRESS: ELOWEN (พรานสาว เอโลเวน)
  // Woodland green corseted tunic, leather thigh boots, auburn side braid,
  // feathered archer beret, recurve longbow & arrow quiver
  // =========================================================================
  private renderRanger(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    _equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null },
    skinVariant: number = 0
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    let greenBase = '#15803d';
    let greenLight = '#22c55e';
    let greenShadow = '#14532d';
    let hairColor = '#c2410c';
    let featherColor = '#ef4444';
    const skinTone = '#ffedd5';

    if (skinVariant === 1) {
      // Arctic Huntress
      greenBase = '#0284c7';
      greenLight = '#38bdf8';
      greenShadow = '#0c4a6e';
      hairColor = '#f8fafc';
      featherColor = '#38bdf8';
    }

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 16, 8);

    // 1.5 Furry Beastgirl Fluffy Tail (Forest Fox / Bunny tail)
    const rangerBeast = skinVariant === 1 ? 'bunny' : (skinVariant === 2 ? 'cat' : 'fox');
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, rangerBeast, hairColor, '#ffffff');

    // 2. Quiver on Back (Visible from back or side)
    if (!isFront) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 7, cy - 8, 4, 14);
      // Feathered arrow fletchings
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 8, cy - 12, 2, 4);
      ctx.fillRect(cx - 6, cy - 13, 2, 5);
    }

    // 3. Slender Legs in Leather Riding Boots
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 5 : 0;
    this.drawFeminineLegs(ctx, cx, cy, isRight, legStep, skinTone, {
      base: '#78350f',
      highlight: '#b45309',
      shadow: '#451a03'
    });

    // 4. Woodland Hourglass Corseted Tunic with Exposed Midriff
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: greenBase,
      highlight: greenLight,
      shadow: greenShadow,
      trim: '#ca8a04'
    }, true, skinTone);

    // 4.5 Articulated Feminine Arms
    this.drawFeminineArms(ctx, cx, cy, isRight, animState, skinTone, greenBase, '#78350f');

    // 5. Recurve Longbow
    const bowX = isRight ? cx + 14 : cx - 14;
    const bowY = cy + 4;
    ctx.save();
    ctx.translate(bowX, bowY);
    ctx.rotate(isRight ? 0.3 : -0.3);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    // Bowstring
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(-Math.PI * 0.45) * 18, Math.sin(-Math.PI * 0.45) * 18);
    ctx.lineTo(Math.cos(Math.PI * 0.45) * 18, Math.sin(Math.PI * 0.45) * 18);
    ctx.stroke();
    ctx.restore();

    // 6. Head, Long Auburn Braid & Feathered Cap
    const headY = cy - 14;

    // Flowing side braid
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx - (isRight ? 7 : -7), headY + 4, 3, 0, Math.PI * 2);
    ctx.arc(cx - (isRight ? 8 : -8), headY + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Face
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', skinTone, '#15803d');
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, skinTone, '#15803d');
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, headY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Furry Beastgirl Ears (Forest Fox / Bunny alert ears)
    this.drawFurryBeastgirlEars(ctx, cx, headY, dir, frame, rangerBeast, hairColor, '#fda4af');

    // Archer Beret / Cap with Feather
    ctx.fillStyle = greenShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, headY - 2);
    ctx.lineTo(cx + 7, headY - 2);
    ctx.lineTo(cx + 9, headY - 8);
    ctx.lineTo(cx - 5, headY - 7);
    ctx.closePath();
    ctx.fill();

    // Pheasant Feather
    ctx.fillStyle = featherColor;
    ctx.beginPath();
    ctx.moveTo(cx - 3, headY - 7);
    ctx.quadraticCurveTo(cx - 8, headY - 16, cx - 12, headY - 17);
    ctx.lineTo(cx - 6, headY - 10);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // 6. DARKLING QUEEN: RICO (ราชินีมารริโก้ ร่างมืด)
  // Voluptuous demonic queen silhouette, obsidian curled horns, bat demon wings,
  // glowing crimson eyes, obsidian spiky corset, giant void flame blade
  // =========================================================================
  private renderDarkling(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number }
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    const voidBlack = '#030712';
    const voidPurple = '#581c87';
    const voidGlow = '#a855f7';
    const crimsonEye = '#ef4444';
    const paleDemonSkin = '#ede9fe';

    // 1. Sprawling Cursed Void Aura & Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 22, 10, 0.75);
    ctx.save();
    ctx.fillStyle = 'rgba(88, 28, 135, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 28, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1.5 Demonic Spade Tail (Swaying behind)
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, 'horns', voidPurple, '#ef4444');

    // 2. Demoness Wings (Sensual fluttering bat wings)
    const wingFlap = Math.sin((frame / 6) * Math.PI * 2) * 4;
    ctx.save();
    ctx.fillStyle = voidBlack;
    ctx.strokeStyle = voidGlow;
    ctx.lineWidth = 1.2;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 4);
    ctx.lineTo(cx - 26 + wingFlap, cy - 22);
    ctx.lineTo(cx - 20, cy - 8);
    ctx.lineTo(cx - 24, cy + 2);
    ctx.lineTo(cx - 5, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 4);
    ctx.lineTo(cx + 26 - wingFlap, cy - 22);
    ctx.lineTo(cx + 20, cy - 8);
    ctx.lineTo(cx + 24, cy + 2);
    ctx.lineTo(cx + 5, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Legs in Obsidian High-Heeled Greaves
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 5 : 0;
    this.drawFeminineLegs(ctx, cx, cy, isRight, legStep, paleDemonSkin, {
      base: voidPurple,
      highlight: voidGlow,
      shadow: voidBlack
    });

    // 4. Voluptuous Spiked Demonic Corset
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: voidPurple,
      highlight: voidGlow,
      shadow: voidBlack,
      trim: crimsonEye
    });

    // 5. Giant Cursed Void Greatsword
    const weaponX = isRight ? cx + 16 : cx - 16;
    const weaponY = cy;
    ctx.save();
    ctx.translate(weaponX, weaponY);
    ctx.rotate(isRight ? 0.35 : -0.35);
    ctx.fillStyle = voidBlack;
    ctx.strokeStyle = voidGlow;
    ctx.lineWidth = 1.2;
    ctx.fillRect(-3.5, -28, 7, 26);
    ctx.strokeRect(-3.5, -28, 7, 26);
    ctx.fillStyle = crimsonEye;
    ctx.fillRect(-1, -24, 2, 18);
    ctx.restore();

    // 6. Head, Long Violet Hair & Curled Horns
    const headY = cy - 14;

    // Cascading dark purple locks
    ctx.fillStyle = '#2e1065';
    ctx.beginPath();
    ctx.arc(cx - 8, headY + 4, 4, 0, Math.PI * 2);
    ctx.arc(cx + 8, headY + 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Face
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', paleDemonSkin, crimsonEye, '#f43f5e');
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, paleDemonSkin, crimsonEye, '#f43f5e');
    } else {
      ctx.fillStyle = voidPurple;
      ctx.beginPath();
      ctx.arc(cx, headY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Demonic Obsidian Horns
    ctx.fillStyle = voidBlack;
    ctx.strokeStyle = voidGlow;
    ctx.lineWidth = 1.0;

    // Left Horn
    ctx.beginPath();
    ctx.moveTo(cx - 5, headY - 3);
    ctx.quadraticCurveTo(cx - 14, headY - 12, cx - 12, headY - 20);
    ctx.quadraticCurveTo(cx - 8, headY - 14, cx - 2, headY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(cx + 5, headY - 3);
    ctx.quadraticCurveTo(cx + 14, headY - 12, cx + 14, headY - 20);
    ctx.quadraticCurveTo(cx + 8, headY - 14, cx + 2, headY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (animState === 'attack' || animState === 'strike') {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#a855f7');
    }
  }

  // =========================================================================
  // 6. SPELLBLADE HEROINE: VALERIA (จอมดาบเวทสาวผมขาว วาเลเรีย)
  // Flowing long silky pure white hair past hips (NO buns / NO pigtails),
  // seductive battle bikini armor with gold trim & push-up cleavage gem,
  // exposed toned midriff with cute navel, glowing runic lightning katana, and 8-dir rendering
  // =========================================================================
  private renderSpellblade(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    frame: number,
    offsets: { bob: number; stepX: number; stepY: number; lean: number; slashProgress: number; jumpY: number },
    _equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null },
    skinVariant: number = 0
  ) {
    const isFront = dir === 'SE' || dir === 'SW' || dir === 'S';
    const isProfile = dir === 'E' || dir === 'W';
    const isRight = dir === 'SE' || dir === 'NE' || dir === 'E';
    const isBack = dir === 'NE' || dir === 'NW' || dir === 'N';
    const cx = 48 + offsets.stepX + offsets.lean;
    const cy = 48 + offsets.stepY + offsets.bob;

    // Pure Snow-White Hair Palette (Silky, Shimmering, Gorgeous)
    let hairHighlight = '#ffffff';
    let hairBase = '#f8fafc';
    let hairShadow = '#cbd5e1';

    // Battle Bikini Armor Palette (Metallic Silver + Royal Gold Trim + Cerulean Lightning Gem)
    let armorPlateBase = '#e2e8f0';
    let armorPlateLight = '#ffffff';
    let armorPlateShadow = '#64748b';
    let goldTrim = '#f59e0b';
    let auraColor = '#38bdf8';
    let eyeColor = '#0284c7';
    const skinTone = '#ffedd5';

    if (skinVariant === 1) {
      // Midnight Eclipse variant: White hair with obsidian/azure armor
      armorPlateBase = '#1e293b';
      armorPlateLight = '#475569';
      armorPlateShadow = '#0f172a';
      goldTrim = '#38bdf8';
      auraColor = '#818cf8';
      eyeColor = '#38bdf8';
    }

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1.5 Furry Beastgirl Fluffy White Fox Tail (Swaying gracefully behind back)
    this.drawFurryBeastgirlTail(ctx, cx, cy, dir, frame, 'fox', hairBase, '#ffffff');

    // 2. LONG FLOWING PURE WHITE HAIR (BACKGROUND LAYER - NO BUNS, NO PIGTAILS!)
    // Silky white hair cascades from the crown all the way down past her waist and thighs
    const headY = cy - 14;
    const hairSway = Math.sin((frame / 6) * Math.PI * 2) * 3.0;

    // Hair shadow back-curtain
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, headY + 2);
    ctx.quadraticCurveTo(cx - 13 + hairSway, headY + 12, cx - 11 + hairSway * 1.5, cy + 20);
    ctx.lineTo(cx + 8 + hairSway * 1.5, cy + 20);
    ctx.quadraticCurveTo(cx + 12 + hairSway, headY + 12, cx + 7, headY + 2);
    ctx.closePath();
    ctx.fill();

    // Hair base back-curtain
    ctx.fillStyle = hairBase;
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY + 2);
    ctx.quadraticCurveTo(cx - 10 + hairSway, headY + 10, cx - 8 + hairSway * 1.5, cy + 18);
    ctx.lineTo(cx + 6 + hairSway * 1.5, cy + 18);
    ctx.quadraticCurveTo(cx + 9 + hairSway, headY + 10, cx + 6, headY + 2);
    ctx.closePath();
    ctx.fill();

    // Shimmering platinum white highlights along flowing hair strands
    ctx.strokeStyle = hairHighlight;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 3, headY);
    ctx.quadraticCurveTo(cx - 7 + hairSway, headY + 10, cx - 5 + hairSway * 1.5, cy + 16);
    ctx.moveTo(cx + 2, headY);
    ctx.quadraticCurveTo(cx + 5 + hairSway, headY + 10, cx + 4 + hairSway * 1.5, cy + 16);
    ctx.stroke();

    // 3. Battle Bikini Armor Loincloth / Fluttering Azure Hip Ribbon
    const clothWave = Math.sin((frame / 6) * Math.PI * 2) * 3.5;
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 12);
    ctx.lineTo(cx + 4, cy + 12);
    ctx.lineTo(cx + (isRight ? 8 : 3) + clothWave, cy + 28);
    ctx.lineTo(cx - (isRight ? 3 : 8) + clothWave, cy + 28);
    ctx.closePath();
    ctx.fill();

    // 4. Slender Toned Legs with Armored Thigh-High Sabatons
    const legStep = animState === 'run' ? Math.sin((frame / 6) * Math.PI * 2) * 5 : 0;
    this.drawFeminineLegs(ctx, cx, cy, isRight, legStep, skinTone, {
      base: armorPlateBase,
      highlight: armorPlateLight,
      shadow: armorPlateShadow
    });

    // 5. ALLURING BATTLE BIKINI ARMOR (Exposed Toned Midriff with Cute Navel & Push-up Cleavage)
    this.drawFeminineHourglassTorso(ctx, cx, cy, isRight, {
      base: armorPlateBase,
      highlight: armorPlateLight,
      shadow: armorPlateShadow,
      trim: goldTrim
    }, true, skinTone);

    // Glowing Arcane Cerulean Core Jewel on Bikini Cleavage
    ctx.fillStyle = auraColor;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy - 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5.5 Articulated Feminine Arms with Silver Gauntlets & Gold Vambraces
    this.drawFeminineArms(ctx, cx, cy, isRight, animState, skinTone, undefined, armorPlateBase);

    // 6. Masterwork Runic Lightning Katana / Spellblade
    const swordX = isRight ? cx + 14 : cx - 14;
    const swordY = cy + 2;
    ctx.save();
    ctx.translate(swordX, swordY);
    ctx.rotate(isRight ? 0.35 : -0.35);

    // Crackling Electric Lightning Aura along blade
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4.5;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // Electric sparks branching off the katana
    const sparkOffset = Math.sin(frame * 1.5) * 4;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(sparkOffset, -14);
    ctx.lineTo(0, -10);
    ctx.stroke();

    // White Metallic Blade Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // Gold Guard & Ribbon Hilt
    ctx.fillStyle = goldTrim;
    ctx.fillRect(-3.5, 10, 7, 2.5);
    ctx.fillStyle = auraColor;
    ctx.fillRect(-1.5, 12.5, 3, 8);
    ctx.restore();

    // 7. Head, Front Face & Flowing Framing White Locks
    // Cute Anime Face with 8-Directional Support
    if (isProfile) {
      this.drawAnimeProfileFace(ctx, cx, headY, dir === 'E', skinTone, eyeColor);
    } else if (isFront) {
      this.drawAnimeFemaleFace(ctx, cx, headY, isRight, skinTone, eyeColor);
    } else {
      // Rear View: Luscious pure white hair in back
      ctx.fillStyle = hairBase;
      ctx.beginPath();
      ctx.arc(cx, headY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hairHighlight;
      ctx.beginPath();
      ctx.arc(cx, headY - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front framing locks & side bangs falling gracefully over chest
    if (!isBack) {
      ctx.fillStyle = hairBase;
      // Left front framing lock
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY - 3);
      ctx.quadraticCurveTo(cx - 8, headY + 5, cx - 6 + hairSway * 0.5, headY + 13);
      ctx.lineTo(cx - 4 + hairSway * 0.5, headY + 13);
      ctx.quadraticCurveTo(cx - 5, headY + 4, cx - 4, headY - 2);
      ctx.closePath();
      ctx.fill();

      // Right front framing lock
      ctx.beginPath();
      ctx.moveTo(cx + 6, headY - 3);
      ctx.quadraticCurveTo(cx + 8, headY + 5, cx + 6 + hairSway * 0.5, headY + 13);
      ctx.lineTo(cx + 4 + hairSway * 0.5, headY + 13);
      ctx.quadraticCurveTo(cx + 5, headY + 4, cx + 4, headY - 2);
      ctx.closePath();
      ctx.fill();

      // Delicate forehead fringe & bangs
      ctx.fillStyle = hairHighlight;
      ctx.beginPath();
      ctx.moveTo(cx - 5, headY - 6);
      ctx.lineTo(cx + 5, headY - 6);
      ctx.lineTo(cx + 3, headY - 3);
      ctx.lineTo(cx - 1, headY - 4);
      ctx.lineTo(cx - 4, headY - 3);
      ctx.closePath();
      ctx.fill();
    }

    // Elegant Golden Hair Ornament
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - (isRight ? 6 : -4), headY - 6, 3, 2.5);
    ctx.fillStyle = auraColor;
    ctx.fillRect(cx - (isRight ? 5 : -3), headY - 5, 1.5, 1.5);

    // Fluffy White Fox Ears with soft pink inner
    this.drawFurryBeastgirlEars(ctx, cx, headY, dir, frame, 'fox', hairBase, '#fda4af');

    // Attack slash
    if (animState === 'attack' || animState === 'strike') {
      this.drawDiagonalSlashArc(ctx, cx, cy, dir, '#38bdf8');
    }
  }

  // =========================================================================
  // PRANK OVERLAYS
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
    const headY = cy - 14;

    if (prank.hasAfro) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, headY - 6, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    if (prank.hasGraffiti && isFront) {
      if (prank.graffitiType === 'mustache') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx - 3, headY + 5, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 3, headY + 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (prank.graffitiType === 'clown') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, headY + 3.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - 5, headY - 1, 4, 4);
        ctx.strokeRect(cx + 1, headY - 1, 4, 4);
      }
    }
  }
}

export const customIsometricHeroRenderer = new CustomIsometricHeroRenderer();
