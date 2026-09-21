// ===========================================================================
// TERRARIA-STYLE 2.5D ISOMETRIC FOLIAGE & BIOME PROPS RENDERER
// Zero-Allocation Static Caching for 60 FPS Performance & Rich Pixel Art
// ===========================================================================

export class TerrariaIsometricFoliageRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  private makeCanvas(w = 64, h = 84): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // =========================================================================
  // PUBLIC ENTRY POINT: Deterministic Zero-Lag Tree Sprite
  // =========================================================================
  public getTreeSprite(type: string = 'oak', variant: number = 0): HTMLCanvasElement {
    const v = Math.abs(Math.floor(variant)) % 4;
    const cacheKey = `terraria_iso_tree_${type}_v${v}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(64, 84);
    const cx = 32;
    const cy = 46;

    if (type === 'snow_pine') {
      this.renderTerrariaBorealPine(ctx, cx, cy, v);
    } else if (type === 'magic') {
      this.renderTerrariaGloomwoodTree(ctx, cx, cy, v);
    } else {
      this.renderTerrariaVerdantOak(ctx, cx, cy, v);
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  // =========================================================================
  // 1. VERDANT OAK TREE (Terraria Forest Tree with Layered Leaf Clumps & Roots)
  // =========================================================================
  private renderTerrariaVerdantOak(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Flare Roots spreading along 2:1 Isometric Ground
    ctx.fillStyle = '#290e02';
    // Left root (SW)
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 18);
    ctx.lineTo(cx - 14, cy + 28);
    ctx.lineTo(cx - 6, cy + 29);
    ctx.lineTo(cx - 2, cy + 22);
    ctx.closePath();
    ctx.fill();
    // Right root (SE)
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + 18);
    ctx.lineTo(cx + 14, cy + 28);
    ctx.lineTo(cx + 6, cy + 29);
    ctx.lineTo(cx + 2, cy + 22);
    ctx.closePath();
    ctx.fill();

    // 3. Gnarled Trunk with Wood Grain Pixel Shading
    // Shadow Side (Left)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 5, cy + 4, 5, 24);
    ctx.fillStyle = '#290e02';
    ctx.fillRect(cx - 6, cy + 6, 2, 22);
    // Light Side (Right)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx, cy + 4, 5, 24);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx + 3, cy + 6, 2, 20);

    // Knot-hole & Bark Ridges
    ctx.fillStyle = '#1c0a00';
    ctx.fillRect(cx - 2, cy + 12, 3, 4);

    // 4. Layered Cloud-like Foliage Clusters (Terraria-style multi-shade puffs)
    const puffOffsets = [
      { ox: 0, oy: -14, r: 21 },
      { ox: -12, oy: -4, r: 16 },
      { ox: 12, oy: -4, r: 16 },
      { ox: -6, oy: -24, r: 15 },
      { ox: 7, oy: -22, r: 16 },
    ];

    // Slight variance per seed
    if (v === 1) puffOffsets[1].ox -= 2;
    if (v === 2) puffOffsets[2].ox += 2;
    if (v === 3) puffOffsets[0].oy -= 3;

    // Render foliage layers: Deep outline -> Shadow -> Midtone -> Highlight
    // Pass 1: Deep Shadow Base Puffs
    ctx.fillStyle = '#052e16';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r + 2);
    });

    // Pass 2: Base Emerald Shadow
    ctx.fillStyle = '#14532d';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r);
    });

    // Pass 3: Midtone Green
    ctx.fillStyle = '#15803d';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 1, cy + p.oy - 2, p.r - 3);
    });

    // Pass 4: Bright Highlight Puffs (Top-Right illuminated)
    ctx.fillStyle = '#22c55e';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 2, cy + p.oy - 4, p.r - 6);
    });

    // Pass 5: Terraria Sunlit Pixels
    ctx.fillStyle = '#86efac';
    puffOffsets.forEach(p => {
      ctx.fillRect(cx + p.ox + 1, cy + p.oy - p.r + 3, 4, 3);
      ctx.fillRect(cx + p.ox + 4, cy + p.oy - p.r + 5, 3, 2);
    });
  }

  // =========================================================================
  // 2. BOREAL SNOW PINE (Terraria Snowy Boreal Pine with Stepped Needle Tiers)
  // =========================================================================
  private renderTerrariaBorealPine(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow & Snow Bank
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snow base mound
    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 27, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Boreal Darkwood Trunk
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 3, cy + 12, 6, 16);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 3, cy + 12, 3, 16);

    // 3. Stepped 3D Pine Needle Tiers (Bottom to Top)
    const tiers = [
      { y: cy + 12, w: 38, h: 18 },
      { y: cy - 2, w: 32, h: 16 },
      { y: cy - 14, w: 24, h: 14 },
      { y: cy - 24, w: 16, h: 12 },
    ];

    tiers.forEach((tier, idx) => {
      const ty = tier.y;
      const tw = tier.w;
      const th = tier.h;

      // Dark Pine Needle Shadow (Left)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx, ty - th);
      ctx.lineTo(cx - tw / 2, ty);
      ctx.lineTo(cx, ty + 2);
      ctx.closePath();
      ctx.fill();

      // Sunlit Pine Needle (Right)
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(cx, ty - th);
      ctx.lineTo(cx, ty + 2);
      ctx.lineTo(cx + tw / 2, ty);
      ctx.closePath();
      ctx.fill();

      // Jagged needle fringe along bottom
      ctx.fillStyle = '#0f172a';
      for (let s = -tw / 2; s < tw / 2; s += 4) {
        ctx.fillRect(cx + s, ty - 1, 2, 3);
      }

      // Crisp Snow Cap on Tier Top Ridges
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(cx, ty - th);
      ctx.lineTo(cx - tw / 2 + 3, ty - 2);
      ctx.lineTo(cx + tw / 2 - 3, ty - 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 2, ty - th + 2, 4, 3);
      ctx.fillRect(cx - tw / 4, ty - 4, 3, 2);
      ctx.fillRect(cx + tw / 4 - 2, ty - 4, 3, 2);
    });
  }

  // =========================================================================
  // 3. GLOOMWOOD MAGIC TREE (Terraria Arcane Tree with Bioluminescent Spores)
  // =========================================================================
  private renderTerrariaGloomwoodTree(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow & Arcane Glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ethereal Spore Aura under tree
    ctx.fillStyle = 'rgba(192, 132, 252, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Twisted Obsidian-Violet Trunk & Spreading Roots
    ctx.fillStyle = '#1e0845';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 6);
    ctx.quadraticCurveTo(cx - 8, cy + 18, cx - 14, cy + 28);
    ctx.lineTo(cx - 6, cy + 29);
    ctx.quadraticCurveTo(cx - 2, cy + 20, cx, cy + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2e1065';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 6);
    ctx.quadraticCurveTo(cx + 2, cy + 20, cx + 6, cy + 29);
    ctx.lineTo(cx + 14, cy + 28);
    ctx.quadraticCurveTo(cx + 8, cy + 18, cx + 5, cy + 6);
    ctx.closePath();
    ctx.fill();

    // Bioluminescent sap vein on trunk
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 6;
    ctx.fillRect(cx - 1, cy + 12, 2, 10);
    ctx.shadowBlur = 0;

    // 3. Layered Violet/Indigo Foliage Clumps
    const puffOffsets = [
      { ox: 0, oy: -14, r: 20 },
      { ox: -11, oy: -3, r: 15 },
      { ox: 11, oy: -3, r: 15 },
      { ox: -5, oy: -23, r: 14 },
      { ox: 6, oy: -21, r: 15 },
    ];

    // Deep void outline
    ctx.fillStyle = '#0f051d';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r + 2);
    });

    // Dark indigo base
    ctx.fillStyle = '#3b0764';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r);
    });

    // Royal violet midtone
    ctx.fillStyle = '#581c87';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 1, cy + p.oy - 2, p.r - 3);
    });

    // Luminous purple highlight
    ctx.fillStyle = '#7e22ce';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 2, cy + p.oy - 4, p.r - 5);
    });

    // Glowing Arcane Spore Nodes (Terraria Bioluminescence)
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    puffOffsets.forEach(p => {
      ctx.fillRect(cx + p.ox - 2, cy + p.oy - 2, 3, 3);
      ctx.fillRect(cx + p.ox + 4, cy + p.oy - p.r + 6, 2, 2);
    });
    ctx.shadowBlur = 0;
  }

  // =========================================================================
  // HELPER: CLOUD-LIKE LEAF CLUSTER PUFF
  // =========================================================================
  private drawLeafPuff(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.arc(px - radius * 0.4, py + radius * 0.3, radius * 0.7, 0, Math.PI * 2);
    ctx.arc(px + radius * 0.4, py + radius * 0.3, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const terrariaIsometricFoliageRenderer = new TerrariaIsometricFoliageRenderer();
