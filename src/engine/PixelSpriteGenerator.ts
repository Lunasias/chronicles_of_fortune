import { trpgAssets } from './TRPGAssetLoader';

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'spinner' | 'potion' | 'spell';
  cost: number;
  atk?: number;
  def?: number;
  mag?: number;
  spd?: number;
  luk?: number;
  desc: string;
  icon: string;
}

export type IsoDirection = 'SE' | 'SW' | 'NE' | 'NW';

export type CharacterAnimState = 'idle' | 'run' | 'attack' | 'strike' | 'magic' | 'counter' | 'hurt' | 'victory';

export interface PrankState {
  hasGraffiti: boolean;
  graffitiType?: 'mustache' | 'spiral' | 'clown' | 'custom';
  customImageData?: string;
  hasAfro?: boolean;
  originalName?: string;
  sillyName?: string;
  turnsRemaining?: number;
}

export class PixelSpriteGenerator {
  private cache = new Map<string, HTMLCanvasElement>();

  private makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }

  // =========================================================================
  // 0. VOLUMETRIC PSEUDO-3D PIXEL ART PRIMITIVES (TROMPE-L'ŒIL SYSTEM)
  // =========================================================================

  private drawVoxelCube(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    topColor: string,
    leftColor: string,
    rightColor: string,
    rimColor?: string
  ) {
    const hw = w / 2;
    const hh = depth * 0.5;

    // Left Face (Shadowed)
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh + h);
    ctx.lineTo(x - hw, y + h);
    ctx.closePath();
    ctx.fill();

    // Right Face (Deep Shadow)
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw, y + h);
    ctx.lineTo(x, y + hh + h);
    ctx.closePath();
    ctx.fill();

    // Top Face (Lit by Zenith light)
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();

    if (rimColor) {
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawVolumetricSphere(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    highlight: string,
    base: string,
    shadow: string,
    specular: string,
    rim?: string
  ) {
    // 1. Deep Shadow Base
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Mid-tone Body
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.12, cy - ry * 0.15, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Zenith Highlight
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.28, cy - ry * 0.32, rx * 0.55, ry * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Specular Gleam
    ctx.fillStyle = specular;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.38, cy - ry * 0.42, rx * 0.24, ry * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Rim Light
    if (rim) {
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, (rx + ry) / 2, Math.PI * 0.1, Math.PI * 0.6);
      ctx.stroke();
    }
  }

  private drawFacetedBlade(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    lightColor: string,
    shadowColor: string,
    edgeColor: string,
    runeColor?: string
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);

    // Light facet
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + nx, y1 + ny);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();

    // Shadow facet
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - nx, y1 - ny);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();

    // Sharp central ridge spine
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Glowing runes
    if (runeColor) {
      ctx.fillStyle = runeColor;
      ctx.shadowColor = runeColor;
      ctx.shadowBlur = 6;
      for (let f = 0.25; f <= 0.75; f += 0.25) {
        ctx.fillRect(x1 + dx * f - 1.5, y1 + dy * f - 1.5, 3, 3);
      }
      ctx.shadowBlur = 0;
    }
  }

  private drawAnatomicalSkull(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    boneColor = '#f1f5f9',
    shadowColor = '#64748b',
    deepHollow = '#020617',
    soulEyeColor = '#06b6d4',
    openMouth = false
  ) {
    const s = scale;

    // 1. Cranium Dome (Volumetric 3D skull cap)
    ctx.fillStyle = boneColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6 * s, 14 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cranium Top Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 3 * s, cy - 10 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Temporal Depressions (Shadows on sides)
    ctx.fillStyle = shadowColor;
    ctx.fillRect(cx - 14 * s, cy - 8 * s, 3 * s, 8 * s);
    ctx.fillRect(cx + 11 * s, cy - 8 * s, 3 * s, 8 * s);

    // 2. Brow Ridge
    ctx.fillStyle = boneColor;
    ctx.fillRect(cx - 12 * s, cy - 4 * s, 24 * s, 4 * s);
    ctx.fillStyle = shadowColor;
    ctx.fillRect(cx - 12 * s, cy, 24 * s, 2 * s);

    // 3. Deep Eye Orbits
    ctx.fillStyle = deepHollow;
    ctx.beginPath();
    ctx.ellipse(cx - 6 * s, cy + 3 * s, 4.5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6 * s, cy + 3 * s, 4.5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Burning Soul Eyes
    if (soulEyeColor) {
      ctx.fillStyle = soulEyeColor;
      ctx.shadowColor = soulEyeColor;
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 7 * s, cy + 2 * s, 3 * s, 3 * s);
      ctx.fillRect(cx + 4 * s, cy + 2 * s, 3 * s, 3 * s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 6 * s, cy + 2.5 * s, 1.5 * s, 1.5 * s);
      ctx.fillRect(cx + 5 * s, cy + 2.5 * s, 1.5 * s, 1.5 * s);
      ctx.shadowBlur = 0;
    }

    // 4. Zygomatic Arches (Cheekbones)
    ctx.fillStyle = boneColor;
    ctx.fillRect(cx - 13 * s, cy + 4 * s, 4 * s, 3 * s);
    ctx.fillRect(cx + 9 * s, cy + 4 * s, 4 * s, 3 * s);

    // 5. Nasal Cavity
    ctx.fillStyle = deepHollow;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 5 * s);
    ctx.lineTo(cx - 2 * s, cy + 9 * s);
    ctx.lineTo(cx + 2 * s, cy + 9 * s);
    ctx.closePath();
    ctx.fill();

    // 6. Maxilla & Upper Teeth
    ctx.fillStyle = boneColor;
    ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 5 * s);
    ctx.fillStyle = '#ffffff';
    for (let t = -6; t <= 5; t += 2.5) {
      ctx.fillRect(cx + t * s, cy + 12 * s, 2 * s, 3 * s);
    }
    ctx.fillStyle = deepHollow;
    for (let t = -4; t <= 4; t += 2.5) {
      ctx.fillRect(cx + t * s, cy + 12 * s, 0.8 * s, 3 * s);
    }

    // 7. Mandible Jawbone
    const jawY = openMouth ? cy + 18 * s : cy + 15 * s;
    ctx.fillStyle = shadowColor;
    ctx.fillRect(cx - 7 * s, jawY, 14 * s, 4 * s);
    ctx.fillStyle = boneColor;
    ctx.fillRect(cx - 5 * s, jawY + 1 * s, 10 * s, 3 * s);
    ctx.fillStyle = '#ffffff';
    for (let t = -4; t <= 3; t += 2.5) {
      ctx.fillRect(cx + t * s, jawY, 1.8 * s, 2 * s);
    }
  }

  private drawGoblinHead(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    skinColor = '#15803d',
    shadowColor = '#14532d',
    highlightColor = '#22c55e'
  ) {
    const s = scale;

    // 1. Pointed Goblin Ears (Long, angled back and up with 3D depth)
    // Left ear
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * s, cy - 2 * s);
    ctx.lineTo(cx - 28 * s, cy - 12 * s);
    ctx.lineTo(cx - 12 * s, cy + 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(cx - 11 * s, cy - 1 * s);
    ctx.lineTo(cx - 25 * s, cy - 10 * s);
    ctx.lineTo(cx - 12 * s, cy + 2 * s);
    ctx.closePath();
    ctx.fill();
    // Gold earring hoop
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5 * s;
    ctx.strokeRect(cx - 24 * s, cy - 9 * s, 3 * s, 3 * s);

    // Right ear
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(cx + 10 * s, cy - 2 * s);
    ctx.lineTo(cx + 28 * s, cy - 12 * s);
    ctx.lineTo(cx + 12 * s, cy + 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(cx + 11 * s, cy - 1 * s);
    ctx.lineTo(cx + 25 * s, cy - 10 * s);
    ctx.lineTo(cx + 12 * s, cy + 2 * s);
    ctx.closePath();
    ctx.fill();

    // 2. Head Dome
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4 * s, 11 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = highlightColor;
    ctx.fillRect(cx - 4 * s, cy - 11 * s, 8 * s, 4 * s);

    // 3. Leather Bandit Cowl/Headband
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 11 * s, cy - 10 * s, 22 * s, 5 * s);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 2 * s, cy - 9 * s, 4 * s, 3 * s);

    // 4. Fierce Golden Feline Eyes with Vertical Slit Pupils
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 6;
    ctx.fillRect(cx - 8 * s, cy - 2 * s, 5 * s, 3.5 * s);
    ctx.fillRect(cx + 3 * s, cy - 2 * s, 5 * s, 3.5 * s);
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 6 * s, cy - 2 * s, 1.5 * s, 3.5 * s);
    ctx.fillRect(cx + 5 * s, cy - 2 * s, 1.5 * s, 3.5 * s);
    ctx.shadowBlur = 0;

    // 5. Prominent Hooked Goblin Nose
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 3 * s, cy + 1 * s, 6 * s, 6 * s);
    ctx.fillStyle = shadowColor;
    ctx.fillRect(cx - 4 * s, cy + 5 * s, 8 * s, 2 * s);
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 2.5 * s, cy + 5.5 * s, 2 * s, 1.5 * s);
    ctx.fillRect(cx + 0.5 * s, cy + 5.5 * s, 2 * s, 1.5 * s);

    // 6. Snarling Mouth with Protruding Lower White Tusks
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 7 * s, cy + 8 * s, 14 * s, 4 * s);
    // Pointed lower tusks jutting up
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 6 * s, cy + 6 * s, 2.5 * s, 4 * s);
    ctx.fillRect(cx + 3.5 * s, cy + 6 * s, 2.5 * s, 4 * s);
    // Smaller upper teeth
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 3 * s, cy + 8 * s, 1.8 * s, 2 * s);
    ctx.fillRect(cx + 1 * s, cy + 8 * s, 1.8 * s, 2 * s);
  }

  private drawAbyssalWyrmHead(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number
  ) {
    const s = scale;
    // Chitinous Obsidian Dragon Crest
    ctx.fillStyle = '#0f051d';
    ctx.fillRect(cx - 16 * s, cy - 22 * s, 32 * s, 18 * s);
    // Twin Obsidian Horns
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(cx - 14 * s, cy - 14 * s);
    ctx.lineTo(cx - 26 * s, cy - 32 * s);
    ctx.lineTo(cx - 8 * s, cy - 18 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 14 * s, cy - 14 * s);
    ctx.lineTo(cx + 26 * s, cy - 32 * s);
    ctx.lineTo(cx + 8 * s, cy - 18 * s);
    ctx.closePath();
    ctx.fill();

    // Circular concentric maw (The Abyss Maw)
    ctx.fillStyle = '#2e1065';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#090114';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing violet abyssal vortex in throat
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer Ring of Sharp Inward-Curving Teeth
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tx = cx + Math.cos(angle) * (15 * s);
      const ty = cy + Math.sin(angle) * (13 * s);
      ctx.fillRect(tx - 1.5 * s, ty - 1.5 * s, 3 * s, 3 * s);
    }
    // Inner Ring of Teeth
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const tx = cx + Math.cos(angle) * (9 * s);
      const ty = cy + Math.sin(angle) * (7.5 * s);
      ctx.fillRect(tx - 1 * s, ty - 1 * s, 2 * s, 2 * s);
    }

    // Glowing violet sensory eyes on sides
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - 15 * s, cy - 12 * s, 4 * s, 4 * s);
    ctx.fillRect(cx + 11 * s, cy - 12 * s, 4 * s, 4 * s);
    ctx.shadowBlur = 0;
  }

  // =========================================================================
  // 1. TRUE 2.5D ISOMETRIC DARK FANTASY HEROES (96x96 HD)
  // =========================================================================
  getHeroSprite(
    classKey: string,
    dir: IsoDirection = 'SE',
    animState: CharacterAnimState = 'idle',
    frame: number = 0,
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null } = {},
    isDarkling: boolean = false,
    prank?: PrankState
  ): HTMLCanvasElement {
    const prankKey = prank?.hasGraffiti ? `${prank.graffitiType || 'c'}_${prank.hasAfro ? 'afro' : 'na'}` : 'none';
    const key = `dark_iso_${classKey}_${dir}_${animState}_${frame % 6}_${equipment.weapon?.id || 'nw'}_${equipment.armor?.id || 'na'}_${isDarkling ? 'dark' : 'norm'}_${prankKey}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.makeCanvas(96, 96);

    // Animation displacement
    let bob = 0;
    let stepX = 0;
    let stepY = 0;
    let lean = 0;

    if (animState === 'idle') {
      bob = Math.sin((frame % 6) * (Math.PI / 3)) * 2;
    } else if (animState === 'run') {
      const stride = [0, -4, -2, 0, 4, 2];
      const bobs = [-3, 0, -4, -3, 0, -4];
      const s = stride[frame % 6];
      bob = bobs[frame % 6];
      // Diagonal isometric stride
      if (dir === 'NE') {
        stepX = s * 0.8;
        stepY = -s * 0.4;
      } else if (dir === 'SW') {
        stepX = -s * 0.8;
        stepY = s * 0.4;
      } else if (dir === 'SE') {
        stepX = s * 0.8;
        stepY = s * 0.4;
      } else {
        stepX = -s * 0.8;
        stepY = -s * 0.4;
      }
      lean = dir === 'SE' || dir === 'NE' ? 2 : -2;
    } else if (animState === 'attack') {
      const lunge = [0, 10, 20, 6][frame % 4];
      if (dir === 'NE') {
        stepX = lunge * 0.9;
        stepY = -lunge * 0.5;
      } else {
        stepX = -lunge * 0.9;
        stepY = lunge * 0.5;
      }
      bob = 1;
    } else if (animState === 'strike') {
      const jumps = [0, -22, -30, 4];
      bob = jumps[frame % 4];
    } else if (animState === 'magic') {
      bob = -6 + Math.sin(frame * 0.8) * 4;
    } else if (animState === 'hurt') {
      stepX = dir === 'NE' ? -12 : 12;
      stepY = dir === 'NE' ? 6 : -6;
      bob = -4;
    }

    if (trpgAssets.isLoaded) {
      const entityKey = isDarkling ? 'darkling' : classKey;
      const entitySprite = trpgAssets.getEntitySprite(entityKey, dir, animState, frame, 96, 96);
      ctx.drawImage(entitySprite, stepX, bob + stepY);
    } else if (isDarkling) {
      this.renderDarklingSprite(ctx, dir, animState, bob, stepX, lean, frame);
    } else {
      this.renderDarkFantasyHero(ctx, classKey, dir, animState, bob, stepX, stepY, lean, frame, equipment);
    }

    if (prank?.hasGraffiti && !isDarkling) {
      this.renderPrankOverlay(ctx, dir, bob, prank);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  private renderDarkFantasyHero(
    ctx: CanvasRenderingContext2D,
    classKey: string,
    dir: IsoDirection,
    animState: CharacterAnimState,
    bob: number,
    stepX: number,
    stepY: number,
    lean: number,
    frame: number,
    equipment: { weapon?: EquipmentItem | null; armor?: EquipmentItem | null }
  ) {
    const isFacingFront = dir === 'SE' || dir === 'SW';
    const isFacingRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + stepX + lean;
    const cy = 48 + stepY + bob;

    // Dark Fantasy Color Palettes (Multi-tone Ramps for 3D Shading)
    let skinBase = '#fcd34d';
    let hairBase = '#334155';
    let armorTop = '#475569';
    let armorLeft = '#334155';
    let armorRight = '#1e293b';
    let capeColor = '#881337'; // Blood velvet cape

    if (classKey === 'magician') {
      skinBase = '#f1f5f9';
      hairBase = '#c084fc';
      armorTop = '#581c87';
      armorLeft = '#3b0764';
      armorRight = '#1e0538';
      capeColor = '#4a044e';
    } else if (classKey === 'thief') {
      skinBase = '#fde68a';
      hairBase = '#1e293b';
      armorTop = '#1e293b';
      armorLeft = '#0f172a';
      armorRight = '#020617';
      capeColor = '#14532d';
    } else if (classKey === 'cleric') {
      skinBase = '#fef08a';
      hairBase = '#e2e8f0';
      armorTop = '#78350f';
      armorLeft = '#451a03';
      armorRight = '#1c0a02';
      capeColor = '#a16207';
    }

    if (equipment.armor?.id === 'eq_plate') {
      armorTop = '#64748b';
      armorLeft = '#475569';
      armorRight = '#1e293b';
    }

    // 1. 2.5D Isometric Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Flowing Cape (Back)
    if (isFacingFront) {
      const capeWave = Math.sin((frame % 6) * 1.2) * 5;
      ctx.fillStyle = '#0f051d';
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 8);
      ctx.lineTo(cx + 12, cy - 8);
      ctx.lineTo(cx + 18 + capeWave, cy + 28);
      ctx.lineTo(cx - 18 + capeWave, cy + 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = capeColor;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 6);
      ctx.lineTo(cx + 10, cy - 6);
      ctx.lineTo(cx + 14 + capeWave, cy + 26);
      ctx.lineTo(cx - 14 + capeWave, cy + 26);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Legs & Iron Greaves in Diagonal Stride
    ctx.fillStyle = armorRight;
    const legSpread = animState === 'run' ? Math.sin(frame * 1.2) * 6 : 0;
    ctx.fillRect(cx - 8 + legSpread, cy + 16, 6, 16);
    ctx.fillRect(cx + 2 - legSpread, cy + 16, 6, 16);
    // Greave Rim Light
    ctx.fillStyle = armorTop;
    ctx.fillRect(cx - 8 + legSpread, cy + 16, 2, 16);
    ctx.fillRect(cx + 2 - legSpread, cy + 16, 2, 16);

    // 4. Volumetric 3D Armor Torso (Voxel Cube)
    this.drawVoxelCube(ctx, cx, cy + 2, 22, 20, 10, armorTop, armorLeft, armorRight, '#94a3b8');

    // Spiked Pauldrons (Left & Right Shoulder Plates in 3D)
    this.drawVoxelCube(ctx, cx - 14, cy - 4, 10, 10, 8, armorTop, armorLeft, armorRight);
    this.drawVoxelCube(ctx, cx + 14, cy - 4, 10, 10, 8, armorTop, armorLeft, armorRight);
    // Shoulder Spikes
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 8);
    ctx.lineTo(cx - 22, cy - 14);
    ctx.lineTo(cx - 12, cy - 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 16, cy - 8);
    ctx.lineTo(cx + 22, cy - 14);
    ctx.lineTo(cx + 12, cy - 10);
    ctx.closePath();
    ctx.fill();

    // 5. Head & 3D Helmet / Hood
    ctx.fillStyle = skinBase;
    ctx.fillRect(cx - 8, cy - 24, 16, 16);

    if (classKey === 'magician') {
      // Pointed Arcane Wizard Hat with Gold Buckle
      ctx.fillStyle = '#1e0b36';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 22, 16, 6, 0, 0, Math.PI * 2); // Wide brim
      ctx.fill();
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 24);
      ctx.lineTo(cx - 2, cy - 44); // Pointed tip
      ctx.lineTo(cx + 12, cy - 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#facc15'; // Gold hat band
      ctx.fillRect(cx - 8, cy - 26, 18, 3);
      // Glowing purple eyes peering from cowl shadow
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.fillRect(isFacingRight ? cx + 1 : cx - 6, cy - 18, 4, 3);
      ctx.fillRect(isFacingRight ? cx + 7 : cx, cy - 18, 4, 3);
      ctx.shadowBlur = 0;
    } else if (classKey === 'thief') {
      // Shadow Assassin Mask & Bandit Cowl
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 10, cy - 26, 20, 18);
      ctx.fillStyle = '#be123c'; // Crimson neck scarf
      ctx.fillRect(cx - 9, cy - 12, 18, 6);
      // Sharp glowing amber eyes
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 6;
      ctx.fillRect(isFacingRight ? cx + 1 : cx - 6, cy - 18, 4, 3);
      ctx.fillRect(isFacingRight ? cx + 7 : cx, cy - 18, 4, 3);
      ctx.shadowBlur = 0;
    } else if (classKey === 'warrior') {
      // 3D Winged Iron Greathelm with Brass Rivets & Crimson Plume
      this.drawVoxelCube(ctx, cx, cy - 22, 18, 14, 10, '#64748b', '#475569', '#1e293b', '#94a3b8');
      // Visor Eye Slit
      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - 7, cy - 18, 14, 3);
      // Crimson feather plume
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 30);
      ctx.lineTo(cx, cy - 42);
      ctx.lineTo(cx + 6, cy - 30);
      ctx.closePath();
      ctx.fill();
    } else {
      // Cleric: Inquisitor Mitre with Golden Cross
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 9, cy - 28, 18, 14);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 1, cy - 36, 4, 16); // Golden Cross
      ctx.fillRect(cx - 6, cy - 30, 14, 4);
    }

    // 6. 3D Weapons in Isometric Grip
    ctx.save();
    if (classKey === 'warrior') {
      // 3D Faceted Steel Claymore
      if (isFacingRight) {
        this.drawFacetedBlade(ctx, cx + 10, cy + 8, cx + 32, cy - 26, 6, '#f8fafc', '#64748b', '#ffffff', '#38bdf8');
      } else {
        this.drawFacetedBlade(ctx, cx - 10, cy + 8, cx - 32, cy - 26, 6, '#f8fafc', '#64748b', '#ffffff', '#38bdf8');
      }
    } else if (classKey === 'magician') {
      // Arcane Bone Staff with Glowing Crystal Orb
      const staffX = isFacingRight ? cx + 16 : cx - 16;
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(staffX, cy + 20);
      ctx.lineTo(staffX, cy - 24);
      ctx.stroke();
      // 3D Volumetric Magic Orb
      this.drawVolumetricSphere(ctx, staffX, cy - 28, 8, 8, '#e9d5ff', '#c084fc', '#581c87', '#ffffff', '#f472b6');
    } else if (classKey === 'thief') {
      // Dual Poisoned Daggers with 3D Facets
      this.drawFacetedBlade(ctx, cx - 14, cy + 8, cx - 28, cy + 18, 4, '#e2e8f0', '#64748b', '#ffffff');
      this.drawFacetedBlade(ctx, cx + 14, cy + 8, cx + 28, cy + 18, 4, '#e2e8f0', '#64748b', '#ffffff');
      // Glowing green poison droplets
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 6;
      ctx.fillRect(cx - 29, cy + 19, 3, 4);
      ctx.fillRect(cx + 27, cy + 19, 3, 4);
      ctx.shadowBlur = 0;
    } else {
      // Cleric: 3D Heavy Iron Warhammer with Faceted Head
      const maceX = cx + 14;
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(maceX - 4, cy + 16);
      ctx.lineTo(maceX + 12, cy - 14);
      ctx.stroke();
      this.drawVoxelCube(ctx, maceX + 14, cy - 16, 12, 10, 8, '#94a3b8', '#64748b', '#334155');
    }
    ctx.restore();
  }

  private renderDarklingSprite(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    animState: CharacterAnimState,
    bob: number,
    stepX: number,
    lean: number,
    frame: number
  ) {
    const isFacingRight = dir === 'SE' || dir === 'NE';
    const cx = 48 + stepX + lean;
    const cy = 48 + bob;

    // 2.5D Isometric Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 36, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Massive Spiked Demonic Wings with 3D Ribs
    const wingFlap = Math.sin(frame * 0.8) * 6;
    ctx.fillStyle = '#1c050a';
    this.drawTriangle(ctx, cx - 26, cy - 18 + wingFlap, 44, 46);
    this.drawTriangle(ctx, cx + 26, cy - 18 + wingFlap, 44, 46);

    ctx.fillStyle = '#881337';
    this.drawTriangle(ctx, cx - 24, cy - 14 + wingFlap, 36, 38);
    this.drawTriangle(ctx, cx + 24, cy - 14 + wingFlap, 36, 38);

    // 3D Demonic Body
    this.drawVolumetricSphere(ctx, cx, cy + 6, 16, 20, '#4c0519', '#1c050a', '#050102', '#f43f5e');

    // Glowing Magma Fissures
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - 7, cy + 2, 14, 3);
    ctx.fillRect(cx - 4, cy + 9, 8, 3);
    ctx.shadowBlur = 0;

    // Demon Head & Sweeping Obsidian Horns
    this.drawVolumetricSphere(ctx, cx, cy - 18, 11, 11, '#3b0764', '#180527', '#090112', '#a855f7');

    // Obsidian Horns
    ctx.fillStyle = '#0a0305';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 24);
    ctx.quadraticCurveTo(cx - 20, cy - 38, cx - 18, cy - 44);
    ctx.quadraticCurveTo(cx - 10, cy - 34, cx - 4, cy - 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 24);
    ctx.quadraticCurveTo(cx + 20, cy - 38, cx + 18, cy - 44);
    ctx.quadraticCurveTo(cx + 10, cy - 34, cx + 4, cy - 26);
    ctx.closePath();
    ctx.fill();

    // Burning Hellfire Eyes
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.fillRect(isFacingRight ? cx : cx - 6, cy - 18, 4, 4);
    ctx.fillRect(isFacingRight ? cx + 5 : cx - 1, cy - 18, 4, 4);
    ctx.shadowBlur = 0;
  }

  private renderPrankOverlay(
    ctx: CanvasRenderingContext2D,
    dir: IsoDirection,
    bob: number,
    prank: PrankState
  ) {
    const cx = 48;
    const cy = 48 + bob;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 4, cy - 16, 8, 3);
  }

  // =========================================================================
  // 2. TRUE 2.5D ISOMETRIC DARK FANTASY MONSTERS (PSEUDO-3D VOLUMETRIC PIXEL ART)
  // =========================================================================
  getMonsterSprite(
    monsterKey: string,
    dir: IsoDirection = 'SW',
    animState: string = 'idle',
    frame: number = 0
  ): HTMLCanvasElement {
    const key = `dark_iso_mon_v3_${monsterKey}_${dir}_${animState}_${frame % 6}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.makeCanvas(140, 140);

    // Dynamic animation offsets along 2.5D diagonal
    let bob = Math.sin((frame % 6) * 1.0) * 3;
    let lungeX = 0;
    let lungeY = 0;

    if (animState === 'attack') {
      const dist = [0, 20, 38, 14][frame % 4];
      if (dir === 'SW') {
        lungeX = -dist * 0.9;
        lungeY = dist * 0.45;
      } else {
        lungeX = dist * 0.9;
        lungeY = -dist * 0.45;
      }
      bob = 2;
    } else if (animState === 'hurt') {
      lungeX = dir === 'SW' ? 16 : -16;
      lungeY = dir === 'SW' ? -8 : 8;
      bob = -6;
    }

    const cx = 70 + lungeX;
    const cy = 68 + lungeY + bob;

    if (trpgAssets.isLoaded) {
      const entitySprite = trpgAssets.getEntitySprite(
        monsterKey,
        dir,
        animState as CharacterAnimState,
        frame,
        130,
        138
      );
      ctx.drawImage(entitySprite, cx - 65, cy - 65);
      this.cache.set(key, canvas);
      return canvas;
    }

    // 1. 2.5D Ground Drop Shadow with Depth Blur
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(cx, 115, 42, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // =======================================================================
    // MONSTER ARCHETYPES (100% RECOGNIZABLE & HIGH-DETAIL PSEUDO-3D)
    // =======================================================================

    if (
      monsterKey.includes('Slime') ||
      monsterKey.includes('Spirit') ||
      monsterKey.includes('Elemental') ||
      monsterKey.includes('Flame') ||
      monsterKey.includes('Frost') ||
      monsterKey.includes('Sun') ||
      monsterKey.includes('Blossom') ||
      monsterKey.includes('Ooze')
    ) {
      // ---------------------------------------------------------------------
      // 1. BROWN DUST 2 ELEMENTAL SLIME SPIRITS (Flame, Frost, Sun, Blossom, Gold)
      // ---------------------------------------------------------------------
      let element: 'flame' | 'ice' | 'sun' | 'blossom' | 'gold' = 'flame';
      if (monsterKey.includes('Frost') || monsterKey.includes('Ice') || monsterKey.includes('Blue')) element = 'ice';
      else if (monsterKey.includes('Sun') || monsterKey.includes('Volt') || monsterKey.includes('Light') || monsterKey.includes('Yellow')) element = 'sun';
      else if (monsterKey.includes('Blossom') || monsterKey.includes('Plant') || monsterKey.includes('Leaf') || monsterKey.includes('Green')) element = 'blossom';
      else if (monsterKey.includes('Gold') || monsterKey.includes('King')) element = 'gold';
      else if (monsterKey.includes('Blood') || monsterKey.includes('Flame') || monsterKey.includes('Fire') || monsterKey.includes('Red')) element = 'flame';

      const bd2Slime = this.getBrownDust2Slime(element, frame, dir);
      ctx.drawImage(bd2Slime, cx - 65, cy - 60, 130, 130);
    } else if (monsterKey.includes('Skeleton') || monsterKey.includes('Revenant') || monsterKey.includes('Undead')) {
      // ---------------------------------------------------------------------
      // 2. CRYPT REVENANT (Undead Skeletal Knight with Horned Greathelm & Zweihander)
      // ---------------------------------------------------------------------
      // Tattered Shadow Cape Billowing in Wind
      const capeWave = Math.sin(frame * 1.2) * 6;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 10);
      ctx.lineTo(cx + 18, cy - 10);
      ctx.lineTo(cx + 28 + capeWave, cy + 38);
      ctx.lineTo(cx - 22 + capeWave, cy + 38);
      ctx.closePath();
      ctx.fill();

      // Skeletal Legs & Iron Greaves in Isometric Combat Stance
      ctx.fillStyle = '#1e293b'; // Left Greave
      ctx.fillRect(cx - 14, cy + 24, 8, 20);
      ctx.fillStyle = '#0f172a'; // Right Greave
      ctx.fillRect(cx + 4, cy + 22, 8, 20);
      ctx.fillStyle = '#cbd5e1'; // Bony foot phalanges
      ctx.fillRect(cx - 16, cy + 42, 10, 4);
      ctx.fillRect(cx + 2, cy + 40, 10, 4);

      // Anatomical 3D Skeletal Ribcage & Spine
      ctx.fillStyle = '#020617'; // Inner body cavity
      ctx.fillRect(cx - 12, cy - 2, 24, 26);
      // Curved 3D Ribs
      ctx.fillStyle = '#f1f5f9';
      for (let r = 0; r < 4; r++) {
        const ry = cy + r * 6;
        // Left rib
        ctx.fillRect(cx - 11, ry, 9, 3);
        // Right rib
        ctx.fillRect(cx + 2, ry, 9, 3);
      }
      // Central Sternum & Spine
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 2, cy - 2, 4, 26);

      // Black Iron Cuirass Harness Remains
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 14, cy - 4, 28, 4);
      ctx.fillStyle = '#facc15'; // Brass belt buckle
      ctx.fillRect(cx - 3, cy + 20, 6, 6);

      // Spiked Iron Pauldrons (Shoulder Armor with 3D Bevel)
      // Left Pauldron
      this.drawVoxelCube(ctx, cx - 18, cy - 8, 14, 12, 10, '#475569', '#334155', '#1e293b', '#64748b');
      // Left Pauldron Spike
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy - 14);
      ctx.lineTo(cx - 34, cy - 24);
      ctx.lineTo(cx - 16, cy - 18);
      ctx.closePath();
      ctx.fill();

      // Right Pauldron
      this.drawVoxelCube(ctx, cx + 18, cy - 8, 14, 12, 10, '#475569', '#334155', '#1e293b', '#64748b');

      // 3D Skull with Menacing Jaw & Glowing Cyan Soul Eyes
      this.drawAnatomicalSkull(ctx, cx, cy - 18, 0.95, '#f8fafc', '#64748b', '#020617', '#06b6d4', animState === 'attack');

      // Horned Dark Iron Sallet Helmet
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 30, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Helmet Horns
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 30);
      ctx.lineTo(cx - 26, cy - 44);
      ctx.lineTo(cx - 6, cy - 34);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy - 30);
      ctx.lineTo(cx + 26, cy - 44);
      ctx.lineTo(cx + 6, cy - 34);
      ctx.closePath();
      ctx.fill();

      // GIANT 3D ZWEIHANDER EXECUTIONER GREATSWORD
      if (animState === 'attack') {
        // Slashing downward diagonally towards SW
        this.drawFacetedBlade(ctx, cx - 8, cy + 4, cx - 62, cy + 42, 8, '#f1f5f9', '#64748b', '#ffffff', '#06b6d4');
        // Slashing motion arc
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx - 20, cy + 15, 45, -0.2, Math.PI * 0.7);
        ctx.stroke();
      } else {
        // Held upright in ready 2.5D stance
        this.drawFacetedBlade(ctx, cx + 16, cy + 18, cx + 46, cy - 38, 7, '#f1f5f9', '#64748b', '#ffffff', '#06b6d4');
        // Crossguard & Skull Pommel
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx + 10, cy + 14, 16, 5);
        ctx.fillStyle = '#f8fafc'; // Skull medallion
        ctx.fillRect(cx + 15, cy + 13, 6, 6);
      }
    } else if (monsterKey.includes('Goblin') || monsterKey.includes('Kobold') || monsterKey.includes('Stalker')) {
      // ---------------------------------------------------------------------
      // 3. CARRION STALKER (Predatory Shadow Goblin with Dual Poison Daggers)
      // ---------------------------------------------------------------------
      // Low-crouched Predatory Goblin Legs
      ctx.fillStyle = '#14532d'; // Muscular green legs
      ctx.fillRect(cx - 18, cy + 14, 10, 16);
      ctx.fillRect(cx + 8, cy + 14, 10, 16);
      // Wrapped ankle cloth
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 20, cy + 24, 12, 6);
      ctx.fillRect(cx + 6, cy + 24, 12, 6);
      // Clawed goblin feet
      ctx.fillStyle = '#15803d';
      ctx.fillRect(cx - 22, cy + 30, 14, 5);
      ctx.fillRect(cx + 6, cy + 30, 14, 5);

      // Hunched Muscular Goblin Torso & Studded Leather Vest
      ctx.fillStyle = '#1e293b'; // Dark studded vest
      ctx.fillRect(cx - 13, cy - 4, 26, 22);
      ctx.fillStyle = '#451a03'; // Leather inner
      ctx.fillRect(cx - 9, cy - 2, 18, 18);
      // Brass Studs (3D Metallic rivets)
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 6, cy + 2, 2.5, 2.5);
      ctx.fillRect(cx + 4, cy + 2, 2.5, 2.5);
      ctx.fillRect(cx - 6, cy + 10, 2.5, 2.5);
      ctx.fillRect(cx + 4, cy + 10, 2.5, 2.5);

      // Distinct 3D Goblin Head (Pointed ears, gold earrings, feline eyes, tusks!)
      this.drawGoblinHead(ctx, cx, cy - 14, 1.15, '#16a34a', '#14532d', '#4ade80');

      // DUAL JAGGED SERRATED BONE DAGGERS WITH DRIPPING GREEN POISON
      if (animState === 'attack') {
        // Scissor thrust along SW diagonal!
        this.drawFacetedBlade(ctx, cx - 12, cy + 8, cx - 52, cy + 16, 5, '#e2e8f0', '#94a3b8', '#ffffff');
        this.drawFacetedBlade(ctx, cx - 12, cy + 16, cx - 48, cy + 32, 5, '#e2e8f0', '#94a3b8', '#ffffff');
        // Neon green poison drips
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 8;
        ctx.fillRect(cx - 54, cy + 16, 6, 6);
        ctx.fillRect(cx - 50, cy + 34, 6, 6);
        ctx.shadowBlur = 0;
      } else {
        // Reverse-grip ready stance
        this.drawFacetedBlade(ctx, cx - 16, cy + 8, cx - 34, cy + 24, 4.5, '#e2e8f0', '#94a3b8', '#ffffff');
        this.drawFacetedBlade(ctx, cx + 16, cy + 8, cx + 34, cy + 24, 4.5, '#e2e8f0', '#94a3b8', '#ffffff');
        // Dripping glowing green poison droplets
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 6;
        ctx.fillRect(cx - 35, cy + 25, 4, 5);
        ctx.fillRect(cx + 33, cy + 25, 4, 5);
        ctx.shadowBlur = 0;
      }
    } else if (monsterKey.includes('Lich') || monsterKey.includes('Ghost') || monsterKey.includes('Witch')) {
      // ---------------------------------------------------------------------
      // 4. CRYPT ARCH-LICH (Levitating Sorcerer with Golden Crown & Necrotic Orb)
      // ---------------------------------------------------------------------
      const floatY = Math.sin((frame % 6) * 1.0) * 5;
      const ly = cy + floatY;

      // Flowing Multi-Tiered Velvet Robes (Trompe-l'œil 3D depth)
      ctx.fillStyle = '#0f051d'; // Dark back robe
      ctx.beginPath();
      ctx.moveTo(cx - 16, ly - 20);
      ctx.lineTo(cx + 16, ly - 20);
      ctx.lineTo(cx + 34, ly + 46);
      ctx.lineTo(cx - 34, ly + 46);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2e1065'; // Purple velvet mantle front
      ctx.beginPath();
      ctx.moveTo(cx - 14, ly - 18);
      ctx.lineTo(cx + 14, ly - 18);
      ctx.lineTo(cx + 26, ly + 42);
      ctx.lineTo(cx - 26, ly + 42);
      ctx.closePath();
      ctx.fill();

      // Gold embroidered hem
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, ly - 14);
      ctx.lineTo(cx, ly + 42);
      ctx.stroke();

      // Spectral soul flames dissolving at the bottom of the robe
      ctx.fillStyle = '#a855f7';
      for (let i = -3; i <= 3; i++) {
        const flH = 6 + Math.sin(frame * 1.5 + i) * 4;
        ctx.fillRect(cx + i * 8 - 3, ly + 44, 6, flH);
      }

      // Cowl & Withered Skull with Crown
      ctx.fillStyle = '#1e0b36'; // Velvet hood
      ctx.beginPath();
      ctx.ellipse(cx, ly - 24, 18, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020617'; // Inner shadow
      ctx.beginPath();
      ctx.ellipse(cx, ly - 22, 13, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Skull inside hood with glowing emerald soul eyes
      this.drawAnatomicalSkull(ctx, cx, ly - 24, 0.78, '#cbd5e1', '#475569', '#020617', '#10b981', false);

      // Golden Horned Necrotic Crown
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 14, ly - 36, 28, 6);
      ctx.beginPath();
      ctx.moveTo(cx - 14, ly - 36);
      ctx.lineTo(cx - 10, ly - 46);
      ctx.lineTo(cx - 6, ly - 36);
      ctx.lineTo(cx, ly - 50); // Spire
      ctx.lineTo(cx + 6, ly - 36);
      ctx.lineTo(cx + 10, ly - 46);
      ctx.lineTo(cx + 14, ly - 36);
      ctx.closePath();
      ctx.fill();
      // Crown Rubies
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.fillRect(cx - 1.5, ly - 42, 3, 3);
      ctx.fillRect(cx - 11, ly - 38, 2.5, 2.5);
      ctx.fillRect(cx + 9, ly - 38, 2.5, 2.5);
      ctx.shadowBlur = 0;

      // Ancient Bone Staff & Floating Necrotic Soul Orb
      const staffX = cx + 32;
      const staffY = ly - 10;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(staffX, staffY + 45);
      ctx.lineTo(staffX, staffY - 25);
      ctx.stroke();

      // Bone staff skull headpiece
      this.drawAnatomicalSkull(ctx, staffX, staffY - 26, 0.45, '#e2e8f0', '#64748b', '#020617', '#ef4444', true);

      // Levitating Necrotic Soul Orb (3D Volumetric Sphere!)
      const orbY = staffY - 44 + Math.sin(frame * 1.5) * 4;
      this.drawVolumetricSphere(ctx, staffX, orbY, 12, 12, '#e9d5ff', '#c084fc', '#581c87', '#ffffff', '#f472b6');

      // Orbiting dark soul particles
      for (let p = 0; p < 4; p++) {
        const ang = (frame * 0.8 + p * (Math.PI / 2)) % (Math.PI * 2);
        const px = staffX + Math.cos(ang) * 18;
        const py = orbY + Math.sin(ang) * 8;
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      ctx.shadowBlur = 0;
    } else if (monsterKey.includes('Drake') || monsterKey.includes('Dragon') || monsterKey.includes('Wyrm')) {
      // ---------------------------------------------------------------------
      // 5. ABYSSAL WYRM (Coiled Armored Void Serpent with Concentric Teeth Ring)
      // ---------------------------------------------------------------------
      // Overlapping 3D Segmented Chitinous Carapace Body
      for (let s = 6; s >= 0; s--) {
        const ang = (s / 6) * Math.PI * 1.2 - 0.2;
        const bx = cx + Math.cos(ang) * 32 - 10;
        const by = cy + 24 + Math.sin(ang) * 16 - s * 3;
        const bRad = 16 - s * 1.2;

        // 3D Carapace Plate
        this.drawVolumetricSphere(ctx, bx, by, bRad, bRad * 0.75, '#c084fc', '#581c87', '#1e0538', '#f3e8ff');

        // Spinal Bone Spikes
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(bx - 3, by - bRad * 0.7);
        ctx.lineTo(bx, by - bRad * 1.4);
        ctx.lineTo(bx + 3, by - bRad * 0.7);
        ctx.closePath();
        ctx.fill();
      }

      // Gaping Circular Maw with Concentric Teeth & Glowing Abyss Throat
      this.drawAbyssalWyrmHead(ctx, cx - 18, cy - 6, 1.15);
    } else {
      // ---------------------------------------------------------------------
      // 6. DEFAULT / BLOODSTONE BEHEMOTH (3D Gargoyle Stone Golem)
      // ---------------------------------------------------------------------
      this.drawVoxelCube(ctx, cx, cy, 54, 48, 28, '#475569', '#334155', '#1e293b', '#64748b');
      // Glowing Magma Fissures
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 18, cy - 6, 36, 4);
      ctx.fillRect(cx - 12, cy + 12, 24, 4);
      ctx.shadowBlur = 0;
      // Burning Eyes
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 14, cy - 14, 6, 6);
      ctx.fillRect(cx + 8, cy - 14, 6, 6);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // =========================================================================
  // 3. COLOSSAL DRAGON OVERLORD IGNIS (240x240 VOLUMETRIC PSEUDO-3D BOSS)
  // =========================================================================
  getDragonOverlordSprite(frame: number = 0): HTMLCanvasElement {
    const key = `dark_iso_dragon_overlord_v3_${frame % 4}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.makeCanvas(240, 240);

    if (trpgAssets.isLoaded) {
      const boss = trpgAssets.getEntitySprite('demon', 'SW', 'idle', frame, 220, 234);
      ctx.drawImage(boss, 10, 3);
      this.cache.set(key, canvas);
      return canvas;
    }

    const cx = 120;
    const cy = 125;
    const wingFlap = [0, -10, -18, -8][frame % 4];

    // 1. Massive 3D Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.ellipse(cx, 210, 95, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Colossal 3D Leathery Bat Wings with Bone Struts
    // Left Wing (Shadow side)
    ctx.fillStyle = '#260408';
    ctx.beginPath();
    ctx.moveTo(cx - 35, cy - 20);
    ctx.lineTo(cx - 105, cy - 85 + wingFlap);
    ctx.lineTo(cx - 115, cy - 20 + wingFlap);
    ctx.lineTo(cx - 95, cy + 20 + wingFlap * 0.5);
    ctx.lineTo(cx - 45, cy + 10);
    ctx.closePath();
    ctx.fill();

    // Left Wing Membrane Folds
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy - 18);
    ctx.lineTo(cx - 100, cy - 78 + wingFlap);
    ctx.lineTo(cx - 108, cy - 22 + wingFlap);
    ctx.lineTo(cx - 88, cy + 14 + wingFlap * 0.5);
    ctx.lineTo(cx - 44, cy + 8);
    ctx.closePath();
    ctx.fill();

    // Left Wing Bone Struts
    ctx.strokeStyle = '#0f0204';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 10);
    ctx.lineTo(cx - 105, cy - 85 + wingFlap);
    ctx.moveTo(cx - 70, cy - 50 + wingFlap * 0.7);
    ctx.lineTo(cx - 115, cy - 20 + wingFlap);
    ctx.stroke();

    // Right Wing (Facing Front-Right in 2.5D Isometric perspective)
    ctx.fillStyle = '#260408';
    ctx.beginPath();
    ctx.moveTo(cx + 35, cy - 20);
    ctx.lineTo(cx + 105, cy - 85 + wingFlap);
    ctx.lineTo(cx + 115, cy - 20 + wingFlap);
    ctx.lineTo(cx + 95, cy + 20 + wingFlap * 0.5);
    ctx.lineTo(cx + 45, cy + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(cx + 36, cy - 18);
    ctx.lineTo(cx + 100, cy - 78 + wingFlap);
    ctx.lineTo(cx + 108, cy - 22 + wingFlap);
    ctx.lineTo(cx + 88, cy + 14 + wingFlap * 0.5);
    ctx.lineTo(cx + 44, cy + 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0f0204';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - 10);
    ctx.lineTo(cx + 105, cy - 85 + wingFlap);
    ctx.moveTo(cx + 70, cy - 50 + wingFlap * 0.7);
    ctx.lineTo(cx + 115, cy - 20 + wingFlap);
    ctx.stroke();

    // 3. Spiked Serpentine Tail curling on the ground
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy + 45);
    ctx.bezierCurveTo(cx + 85, cy + 60, cx + 95, cy + 85, cx + 55, cy + 95);
    ctx.lineTo(cx + 45, cy + 90);
    ctx.bezierCurveTo(cx + 80, cy + 75, cx + 70, cy + 55, cx + 15, cy + 45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f0204';
    ctx.fillRect(cx + 65, cy + 80, 8, 12);
    ctx.fillRect(cx + 78, cy + 68, 8, 10);

    // 4. Muscular Dragon Body & Scaled Torso (3D Volumetric)
    this.drawVolumetricSphere(ctx, cx, cy + 22, 42, 46, '#7f1d1d', '#450a0a', '#1c0307', '#f87171');

    // Segmented Magma Underbelly Plates (Pulsing fiery fissures)
    for (let p = 0; p < 4; p++) {
      const py = cy + 5 + p * 14;
      const pw = 28 - p * 3;
      ctx.fillStyle = '#0f0204';
      ctx.fillRect(cx - pw / 2 - 2, py - 1, pw + 4, 11);
      ctx.fillStyle = p % 2 === 0 ? '#ea580c' : '#f97316';
      ctx.fillRect(cx - pw / 2, py, pw, 9);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - pw / 4, py + 2, pw / 2, 4);
    }

    // 5. Muscular Forelegs with Razor Dragon Talons
    ctx.fillStyle = '#260408';
    ctx.fillRect(cx - 46, cy + 40, 22, 38);
    ctx.fillRect(cx + 24, cy + 40, 22, 38);
    ctx.fillStyle = '#f8fafc';
    for (let c = -2; c <= 0; c++) {
      ctx.fillRect(cx - 44 + c * 6, cy + 74, 5, 10);
      ctx.fillRect(cx + 28 + c * 6, cy + 74, 5, 10);
    }

    // 6. Fierce Dragon Head & Sweeping Obsidian Horns
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 35, 26, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sweeping Obsidian Horns with 3D Ridges
    ctx.fillStyle = '#0f0204';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 42);
    ctx.quadraticCurveTo(cx - 46, cy - 65, cx - 42, cy - 90);
    ctx.quadraticCurveTo(cx - 28, cy - 62, cx - 6, cy - 45);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 42);
    ctx.quadraticCurveTo(cx + 46, cy - 65, cx + 42, cy - 90);
    ctx.quadraticCurveTo(cx + 28, cy - 62, cx + 6, cy - 45);
    ctx.closePath();
    ctx.fill();
    // Horn Fiery Tips
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cx - 43, cy - 90, 4, 10);
    ctx.fillRect(cx + 39, cy - 90, 4, 10);

    // Dragon Snout & Upper Jaw
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 18, cy - 32, 36, 22);
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(cx - 14, cy - 28, 28, 16);

    // Burning Molten Eyes
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    ctx.fillRect(cx - 18, cy - 36, 9, 6);
    ctx.fillRect(cx + 9, cy - 36, 9, 6);
    ctx.fillStyle = '#020617'; // Vertical Slit Pupils
    ctx.fillRect(cx - 14, cy - 36, 2, 6);
    ctx.fillRect(cx + 13, cy - 36, 2, 6);
    ctx.shadowBlur = 0;

    // Open Dragon Maw with Razor Fangs & Fire Glow
    ctx.fillStyle = '#0f0204';
    ctx.fillRect(cx - 16, cy - 10, 32, 12);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cx - 12, cy - 8, 24, 8);
    ctx.fillStyle = '#f8fafc';
    for (let t = -14; t <= 10; t += 6) {
      ctx.fillRect(cx + t, cy - 10, 3, 4);
      ctx.fillRect(cx + t + 2, cy - 2, 3, 4);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // =========================================================================
  // 3b. BROWN DUST 2 ENCHANTED SCENERY & MUSHROOM DIORAMA PROPS
  // =========================================================================
  getGiantMushroom(
    color: 'red' | 'blue' | 'yellow' | 'purple' = 'red',
    width = 160,
    height = 140
  ): HTMLCanvasElement {
    const key = `bd2_mushroom_${color}_${width}_${height}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.makeCanvas(width, height);
    const cx = width / 2;
    const cy = height * 0.44;

    // 1. Thick Textured Mushroom Stalk
    const stalkBaseY = height * 0.94;
    const stalkTopY = cy + 10;

    // Drop shadow under mushroom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, stalkBaseY, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stalk body
    ctx.fillStyle = '#f5f5f4'; // Cream stalk
    ctx.beginPath();
    ctx.moveTo(cx - 18, stalkTopY);
    ctx.bezierCurveTo(cx - 22, (stalkTopY + stalkBaseY) / 2, cx - 28, stalkBaseY - 10, cx - 22, stalkBaseY);
    ctx.lineTo(cx + 22, stalkBaseY);
    ctx.bezierCurveTo(cx + 28, stalkBaseY - 10, cx + 22, (stalkTopY + stalkBaseY) / 2, cx + 18, stalkTopY);
    ctx.closePath();
    ctx.fill();

    // Stalk shadow gradient & texture lines
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.moveTo(cx + 6, stalkTopY);
    ctx.bezierCurveTo(cx + 12, (stalkTopY + stalkBaseY) / 2, cx + 20, stalkBaseY - 10, cx + 22, stalkBaseY);
    ctx.lineTo(cx - 5, stalkBaseY);
    ctx.bezierCurveTo(cx + 5, stalkBaseY - 10, cx + 4, (stalkTopY + stalkBaseY) / 2, cx + 4, stalkTopY);
    ctx.closePath();
    ctx.fill();

    // Gills underneath the cap
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.ellipse(cx, stalkTopY, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, stalkTopY);
      ctx.lineTo(cx + i * 4.5, stalkTopY + 12);
      ctx.stroke();
    }

    // 2. Large Volumetric Cap with 3D Lighting
    let capMain = '#dc2626';
    let capDark = '#991b1b';
    let capLight = '#f87171';
    let capHighlight = '#fca5a5';
    let spotColor = '#fef2f2';

    if (color === 'blue') {
      capMain = '#0284c7';
      capDark = '#0369a1';
      capLight = '#38bdf8';
      capHighlight = '#bae6fd';
      spotColor = '#f0f9ff';
    } else if (color === 'yellow') {
      capMain = '#d97706';
      capDark = '#92400e';
      capLight = '#f59e0b';
      capHighlight = '#fef08a';
      spotColor = '#fefce8';
    } else if (color === 'purple') {
      capMain = '#7c3aed';
      capDark = '#5b21b6';
      capLight = '#a78bfa';
      capHighlight = '#ddd6fe';
      spotColor = '#f5f3ff';
    }

    // Main Cap Dome
    ctx.fillStyle = capDark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 68, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = capMain;
    ctx.beginPath();
    ctx.arc(cx, cy, 66, Math.PI * 0.95, Math.PI * 2.05);
    ctx.quadraticCurveTo(cx, cy + 32, cx - 66, cy + 6);
    ctx.closePath();
    ctx.fill();

    // Top-Left Sunlight Highlight Layer
    ctx.fillStyle = capLight;
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy - 14, 46, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = capHighlight;
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy - 20, 24, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 3. Iconic Polka-Dot Spots (Fly Agaric style from Brown Dust 2 screenshot!)
    ctx.fillStyle = spotColor;
    const spots = [
      { x: cx - 36, y: cy - 10, r: 8 },
      { x: cx - 18, y: cy - 24, r: 10 },
      { x: cx + 12, y: cy - 22, r: 9 },
      { x: cx + 32, y: cy - 12, r: 7 },
      { x: cx - 2, y: cy - 4, r: 11 },
      { x: cx - 44, y: cy + 10, r: 6 },
      { x: cx + 22, y: cy + 6, r: 8 },
      { x: cx + 46, y: cy + 4, r: 6 },
      { x: cx, y: cy + 14, r: 7 }
    ];
    spots.forEach(sp => {
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.75, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    this.cache.set(key, canvas);
    return canvas;
  }

  // =========================================================================
  // 3c. BROWN DUST 2 ELEMENTAL SLIME SPIRITS
  // =========================================================================
  getBrownDust2Slime(
    element: 'flame' | 'ice' | 'sun' | 'blossom' | 'gold' = 'flame',
    frame: number = 0,
    dir: IsoDirection = 'SW'
  ): HTMLCanvasElement {
    const key = `bd2_slime_${element}_${dir}_${frame % 6}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.makeCanvas(130, 130);
    const cx = 65;
    const cy = 65;
    const bounce = Math.sin(frame * 1.2) * 3;

    // 1. Soft Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, 106, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Glowing Elemental Energy Foot Aura (Exact match for Brown Dust 2 screenshot!)
    let auraColor = '#f59e0b';
    if (element === 'flame') auraColor = '#ef4444';
    else if (element === 'ice') auraColor = '#38bdf8';
    else if (element === 'sun') auraColor = '#eab308';
    else if (element === 'blossom') auraColor = '#84cc16';
    else if (element === 'gold') auraColor = '#fbbf24';

    ctx.save();
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + frame * 0.1;
      const r = 28 + (i % 2 === 0 ? 7 : -3) + Math.sin(frame * 2 + i) * 2;
      const ax = cx + Math.cos(angle) * r;
      const ay = 104 + Math.sin(angle) * (r * 0.45);
      if (i === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 3. Cute Bouncy Slime Body (3D Spherical Shading)
    const sy = cy + bounce;
    let bodyColor = '#f97316';
    let bodyLight = '#fdba74';
    let bodyDark = '#c2410c';

    if (element === 'ice') {
      bodyColor = '#0ea5e9';
      bodyLight = '#7dd3fc';
      bodyDark = '#0369a1';
    } else if (element === 'sun') {
      bodyColor = '#eab308';
      bodyLight = '#fef08a';
      bodyDark = '#a16207';
    } else if (element === 'blossom') {
      bodyColor = '#84cc16';
      bodyLight = '#bef264';
      bodyDark = '#4d7c0f';
    } else if (element === 'gold') {
      bodyColor = '#f59e0b';
      bodyLight = '#fde68a';
      bodyDark = '#b45309';
    }

    // Volumetric teardrop/sphere body
    this.drawVolumetricSphere(ctx, cx, sy + 14, 30, 26, bodyLight, bodyColor, bodyDark, '#ffffff');

    // 4. Distinct Elemental Headpieces & Hair
    if (element === 'flame') {
      // Fiery Spiked Hair Tips (Burning flame peaks)
      ctx.fillStyle = '#ef4444';
      for (let f = -2; f <= 2; f++) {
        const peakX = cx + f * 10;
        const peakY = sy - 14 - Math.abs(f) * 3 + Math.sin(frame * 1.5 + f) * 4;
        ctx.beginPath();
        ctx.moveTo(peakX - 6, sy);
        ctx.quadraticCurveTo(peakX - 2, sy - 10, peakX, peakY);
        ctx.quadraticCurveTo(peakX + 2, sy - 10, peakX + 6, sy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#fde047'; // Inner flame core
      ctx.beginPath();
      ctx.moveTo(cx - 8, sy - 2);
      ctx.lineTo(cx, sy - 16 + Math.sin(frame * 1.5) * 3);
      ctx.lineTo(cx + 8, sy - 2);
      ctx.closePath();
      ctx.fill();
    } else if (element === 'ice') {
      // Translucent Ice Crystal Spikes
      ctx.fillStyle = '#bae6fd';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      for (let s = -2; s <= 2; s++) {
        const sx = cx + s * 11;
        const syTip = sy - 20 - (2 - Math.abs(s)) * 6;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy - 2);
        ctx.lineTo(sx, syTip);
        ctx.lineTo(sx + 6, sy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (element === 'sun') {
      // Floral Garland / Buttercup Wreath Crown
      ctx.fillStyle = '#15803d'; // Green leaf vine
      ctx.beginPath();
      ctx.ellipse(cx, sy - 6, 26, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Yellow Buttercup Flowers
      ctx.fillStyle = '#fde047';
      for (let fl = -3; fl <= 3; fl++) {
        const fx = cx + fl * 8;
        const fy = sy - 6 + Math.sin(fl) * 2;
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.fillRect(fx - 1, fy - 1, 2, 2);
        ctx.fillStyle = '#fde047';
      }
    } else if (element === 'blossom') {
      // Pink Cherry Blossom Flowers
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(cx - 10, sy - 8, 7, 0, Math.PI * 2);
      ctx.arc(cx + 10, sy - 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdf2f8';
      ctx.beginPath();
      ctx.arc(cx - 10, sy - 8, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 10, sy - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Golden Royal Crown
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx - 15, sy - 6);
      ctx.lineTo(cx - 12, sy - 24);
      ctx.lineTo(cx - 6, sy - 14);
      ctx.lineTo(cx, sy - 28);
      ctx.lineTo(cx + 6, sy - 14);
      ctx.lineTo(cx + 12, sy - 24);
      ctx.lineTo(cx + 15, sy - 6);
      ctx.closePath();
      ctx.fill();
      // Red Ruby
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 2, sy - 16, 4, 4);
    }

    // 5. Adorable Expressive Anime Face
    // Big sparkly eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(cx - 10, sy + 12, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 10, sy + 12, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // White eye glints (Anime sparkle)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 11, sy + 10, 2, 2);
    ctx.fillRect(cx + 9, sy + 10, 2, 2);

    // Sweet smile
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, sy + 16, 4.5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Rosy Pink Blushing Cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx - 15, sy + 16, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 15, sy + 16, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    this.cache.set(key, canvas);
    return canvas;
  }

  // =========================================================================
  // 4. COMPACT DARK FANTASY ISOMETRIC ARCHITECTURE (FITS NEATLY ON TILE!)
  // =========================================================================
  getBuildingSprite(type: string, ownerColor: string | null = null): HTMLCanvasElement {
    const key = `dark_bld_compact_${type}_${ownerColor || 'none'}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    // Compact 80x80 canvas to NEVER block adjacent tiles or roads!
    const { canvas, ctx } = this.makeCanvas(80, 80);
    const cx = 40;
    const cy = 40;

    if (type === 'town' || type === 'capital') {
      // Gothic Dark Castle Citadel with fortified portcullis & owner banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 22, cy - 10, 44, 42);

      // Battlements
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(cx - 22 + i * 12, cy - 18, 8, 8);
      }

      // Corner Watchtowers
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 26, cy - 22, 10, 54);
      ctx.fillRect(cx + 16, cy - 22, 10, 54);

      // Pointed Roofs on Towers
      ctx.fillStyle = '#881337';
      this.drawTriangle(ctx, cx - 21, cy - 30, 14, 16);
      this.drawTriangle(ctx, cx + 21, cy - 30, 14, 16);

      // Portcullis Gate
      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - 7, cy + 12, 14, 20);

      // Owner Crest / Flag on Center Mast
      ctx.strokeStyle = ownerColor || '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy - 36);
      ctx.stroke();

      ctx.fillStyle = ownerColor || '#fbbf24';
      ctx.fillRect(cx, cy - 36, 12, 8);
    } else if (type === 'shop_item') {
      // Dark Alchemist Apothecary Tent
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 18, cy + 2, 36, 28);
      ctx.fillStyle = '#15803d';
      this.drawTriangle(ctx, cx, cy - 16, 44, 24);

      // Glowing Potion Kettle
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy + 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === 'shop_weapon') {
      // Netherforge Blacksmith
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 18, cy, 36, 30);
      ctx.fillStyle = '#991b1b';
      this.drawTriangle(ctx, cx, cy - 18, 42, 22);

      // Chimney & Molten Sparks
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + 10, cy - 28, 8, 16);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(cx + 11, cy - 32, 6, 4);
    } else if (type === 'shop_magic') {
      // Arcane Observatory Spire
      ctx.fillStyle = '#2e1065';
      ctx.fillRect(cx - 14, cy - 4, 28, 34);
      ctx.fillStyle = '#581c87';
      this.drawTriangle(ctx, cx, cy - 26, 36, 26);

      // Floating Void Crystal on Spire Peak
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      this.drawDiamond(ctx, cx, cy - 32, 10, 14);
      ctx.shadowBlur = 0;
    } else if (type === 'church') {
      // Desecrated Gothic Cathedral with Rose Window
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 18, cy - 2, 36, 32);
      ctx.fillStyle = '#1e293b';
      this.drawTriangle(ctx, cx, cy - 22, 40, 24);

      // Gothic Rose Window
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 6, 0, Math.PI * 2);
      ctx.fill();

      // Cross
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 1.5, cy - 32, 3, 12);
      ctx.fillRect(cx - 5, cy - 28, 10, 3);
    } else if (type === 'dark_gate') {
      // Abyssal Portal to Rico's Dark Throne
      ctx.fillStyle = '#090514';
      ctx.fillRect(cx - 20, cy - 10, 40, 40);

      // Horned Pillars
      ctx.fillStyle = '#581c87';
      this.drawTriangle(ctx, cx - 18, cy - 26, 12, 28);
      this.drawTriangle(ctx, cx + 18, cy - 26, 12, 28);

      // Swirling Purple Abyss Vortex
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === 'boss') {
      // Dragon Skull Fortress
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(cx - 22, cy - 8, 44, 38);
      ctx.fillStyle = '#7f1d1d';
      this.drawTriangle(ctx, cx, cy - 26, 48, 24);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(cx - 6, cy + 8, 12, 22);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  // =========================================================================
  // 5. CLEAN DARK FANTASY ISOMETRIC TERRAIN SLABS
  // =========================================================================
  getTerrainBlock(
    biome: string,
    seed: number = 0,
    width = 96,
    height = 64
  ): HTMLCanvasElement {
    const key = `dark_iso_terrain_${biome}_${seed % 2}_${width}_${height}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const { canvas, ctx } = this.makeCanvas(width, height);
    const hw = width / 2;
    const hh = 24; // Isometric 2:1 ratio (48h / 96w)
    const blockHeight = 18;

    let topColor = '#1e293b';
    let leftColor = '#0f172a';
    let rightColor = '#020617';
    let rimColor = '#334155';

    if (biome === 'snow') {
      topColor = '#1e293b'; // Black Ice
      leftColor = '#0f172a';
      rightColor = '#030712';
      rimColor = '#38bdf8';
    } else if (biome === 'volcano') {
      topColor = '#1f0709'; // Magma Basalt
      leftColor = '#120304';
      rightColor = '#050102';
      rimColor = '#ef4444';
    } else if (biome === 'desert') {
      topColor = '#451a03'; // Blighted Sandstone
      leftColor = '#290e02';
      rightColor = '#170701';
      rimColor = '#78350f';
    } else if (biome === 'forest') {
      topColor = '#064e3b'; // Gloomwood Moss
      leftColor = '#022c22';
      rightColor = '#011a14';
      rimColor = '#059669';
    } else if (biome === 'cavern') {
      topColor = '#1e1b4b'; // Netherforge Ore
      leftColor = '#0f0d24';
      rightColor = '#050410';
      rimColor = '#3b0764';
    } else if (biome === 'coral') {
      topColor = '#083344'; // Drowned Reef
      leftColor = '#041c26';
      rightColor = '#010f14';
      rimColor = '#0891b2';
    } else if (biome === 'abyss') {
      topColor = '#2e1065'; // Void Bone Slab
      leftColor = '#180527';
      rightColor = '#090112';
      rimColor = '#9333ea';
    }

    // Left shaded wall
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(hw, hh * 2);
    ctx.lineTo(hw, hh * 2 + blockHeight);
    ctx.lineTo(0, hh + blockHeight);
    ctx.closePath();
    ctx.fill();

    // Right shaded wall
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(hw, hh * 2);
    ctx.lineTo(width, hh);
    ctx.lineTo(width, hh + blockHeight);
    ctx.lineTo(hw, hh * 2 + blockHeight);
    ctx.closePath();
    ctx.fill();

    // Top Rhombus Face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(width, hh);
    ctx.lineTo(hw, hh * 2);
    ctx.lineTo(0, hh);
    ctx.closePath();
    ctx.fill();

    // Subtle stone rim
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    this.cache.set(key, canvas);
    return canvas;
  }

  // Helper primitives
  private drawTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy + h / 2);
    ctx.closePath();
    ctx.fill();
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    ctx.fill();
  }

  getTreeSprite(type: string = 'oak', wind: number = 0): HTMLCanvasElement {
    const key = `dark_tree_${type}_${Math.floor(wind)}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    if (trpgAssets.isLoaded) {
      const propKey = type === 'snow_pine' ? 'pine_tree' : type === 'magic' ? 'crystals' : 'bush';
      const prop = trpgAssets.getPropCanvas(propKey, 64, 80);
      this.cache.set(key, prop);
      return prop;
    }

    const { canvas, ctx } = this.makeCanvas(64, 80);
    const wx = Math.sin(wind) * 3;

    ctx.fillStyle = '#0f172a'; // Deadwood trunk
    ctx.fillRect(29, 38, 6, 38);

    if (type === 'snow_pine') {
      ctx.fillStyle = '#1e293b';
      this.drawTriangle(ctx, 32 + wx * 0.4, 18, 32, 28);
      this.drawTriangle(ctx, 32 + wx * 0.7, 34, 42, 32);
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(22, 34, 20, 3);
    } else if (type === 'magic') {
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.arc(32 + wx, 28, 22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(32 + wx, 28, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    this.cache.set(key, canvas);
    return canvas;
  }
}

export const pixelSprites = new PixelSpriteGenerator();
