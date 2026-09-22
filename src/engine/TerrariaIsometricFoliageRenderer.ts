// ===========================================================================
// TERRARIA-STYLE 2.5D ISOMETRIC DARK FANTASY FOLIAGE & BIOME PROPS
// High-Fidelity Pixel Shading with Zero-Allocation Static Caching
// ===========================================================================

export class TerrariaIsometricFoliageRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  private makeCanvas(w = 68, h = 88): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
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
  public getTreeSprite(type: string = 'dark_oak', variant: number = 0): HTMLCanvasElement {
    const v = Math.abs(Math.floor(variant)) % 4;
    const cacheKey = `terraria_dark_tree_${type}_v${v}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(68, 88);
    const cx = 34;
    const cy = 48;

    if (type === 'frost_pine' || type === 'snow_pine') {
      this.renderTerrariaFrostCryptPine(ctx, cx, cy, v);
    } else if (type === 'gloom_spore' || type === 'magic') {
      this.renderTerrariaGloomsporeTree(ctx, cx, cy, v);
    } else if (type === 'ash_thorn') {
      this.renderTerrariaAshThornTree(ctx, cx, cy, v);
    } else if (type === 'blood_willow') {
      this.renderTerrariaBloodWillow(ctx, cx, cy, v);
    } else {
      // Default: Ancient Dark Oak (Solaria Grasslands & High-Detail Dark Fantasy)
      this.renderAncientDarkOak(ctx, cx, cy, v);
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  // =========================================================================
  // 1. CRIMSON BLOODWILLOW (Dark Fantasy Blight-Wood with Weeping Thorns)
  // =========================================================================
  private renderTerrariaBloodWillow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow with Dark Red Aura
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(80, 10, 10, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 29, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Clawed Thorn Roots clutching the earth
    ctx.fillStyle = '#140305';
    // Left root
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 18);
    ctx.lineTo(cx - 15, cy + 28);
    ctx.lineTo(cx - 7, cy + 30);
    ctx.lineTo(cx - 2, cy + 22);
    ctx.closePath();
    ctx.fill();
    // Right root
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + 18);
    ctx.lineTo(cx + 15, cy + 28);
    ctx.lineTo(cx + 7, cy + 30);
    ctx.lineTo(cx + 2, cy + 22);
    ctx.closePath();
    ctx.fill();

    // 3. Gnarled, Charred Trunk with Blood Bark Ridges
    // Dark charred wood (Left Shadow)
    ctx.fillStyle = '#1a0608';
    ctx.fillRect(cx - 6, cy + 4, 6, 24);
    ctx.fillStyle = '#0f0304';
    ctx.fillRect(cx - 7, cy + 6, 2, 22);

    // Weathered Dark Crimson Bark (Right Light)
    ctx.fillStyle = '#2d0a0f';
    ctx.fillRect(cx, cy + 4, 6, 24);
    ctx.fillStyle = '#450f16';
    ctx.fillRect(cx + 3, cy + 6, 2, 20);

    // Pulsing Corrupted Blood Rune Fissure in trunk
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 2, cy + 12, 3, 7);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - 1, cy + 14, 2, 3);

    // 4. Layered Terraria Foliage Clusters (Deep Wine / Blood Carmine)
    const puffOffsets = [
      { ox: 0, oy: -14, r: 21 },
      { ox: -13, oy: -4, r: 16 },
      { ox: 13, oy: -4, r: 16 },
      { ox: -7, oy: -24, r: 15 },
      { ox: 7, oy: -22, r: 16 },
    ];

    if (v === 1) puffOffsets[1].ox -= 2;
    if (v === 2) puffOffsets[2].ox += 2;
    if (v === 3) puffOffsets[0].oy -= 3;

    // Pass 1: Blight Void Outline
    ctx.fillStyle = '#0d0204';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r + 2);
    });

    // Pass 2: Deep Carmine Shadow
    ctx.fillStyle = '#2b060a';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r);
    });

    // Pass 3: Blood Crimson Midtone
    ctx.fillStyle = '#4f0d14';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 1, cy + p.oy - 2, p.r - 3);
    });

    // Pass 4: Weathered Sanguine Edges
    ctx.fillStyle = '#771520';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 2, cy + p.oy - 4, p.r - 5);
    });

    // Pass 5: Ember Pixel Highlights (Subtle Dark Fantasy)
    ctx.fillStyle = '#991b1b';
    puffOffsets.forEach(p => {
      ctx.fillRect(cx + p.ox + 1, cy + p.oy - p.r + 3, 4, 3);
      ctx.fillRect(cx + p.ox + 4, cy + p.oy - p.r + 6, 3, 2);
    });

    // 5. Weeping Thorny Tendrils dripping downwards
    ctx.fillStyle = '#4f0d14';
    // Tendril 1
    ctx.fillRect(cx - 14, cy + 6, 2, 10);
    ctx.fillRect(cx - 15, cy + 12, 1, 3);
    // Tendril 2
    ctx.fillRect(cx - 6, cy + 10, 2, 14);
    ctx.fillRect(cx - 5, cy + 18, 1, 4);
    // Tendril 3
    ctx.fillRect(cx + 8, cy + 8, 2, 12);
    ctx.fillRect(cx + 9, cy + 14, 1, 3);
    // Tendril 4
    ctx.fillRect(cx + 15, cy + 6, 2, 9);

    // Dark ember tips at end of tendrils
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 6, cy + 24, 2, 2);
    ctx.fillRect(cx + 8, cy + 20, 2, 2);
  }

  // =========================================================================
  // 2. ELDRITCH GLOOM-SPORE TREE (Abyssal Bioluminescent Spores & Violet Caps)
  // =========================================================================
  private renderTerrariaGloomsporeTree(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow & Arcane Spore Glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Twisted Obsidian-Bone Trunk & Spreading Roots
    ctx.fillStyle = '#16052b';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 6);
    ctx.quadraticCurveTo(cx - 8, cy + 18, cx - 15, cy + 28);
    ctx.lineTo(cx - 7, cy + 29);
    ctx.quadraticCurveTo(cx - 2, cy + 20, cx, cy + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#260c44';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 6);
    ctx.quadraticCurveTo(cx + 2, cy + 20, cx + 7, cy + 29);
    ctx.lineTo(cx + 15, cy + 28);
    ctx.quadraticCurveTo(cx + 8, cy + 18, cx + 5, cy + 6);
    ctx.closePath();
    ctx.fill();

    // Luminous Spore Bracket Mushrooms growing on the trunk
    // Mushroom 1 (Left)
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(cx - 8, cy + 14, 5, 2);
    ctx.fillStyle = '#f0abfc';
    ctx.fillRect(cx - 7, cy + 13, 3, 1);

    // Mushroom 2 (Right)
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx + 4, cy + 20, 5, 2);
    ctx.fillStyle = '#e879f9';
    ctx.fillRect(cx + 5, cy + 19, 3, 1);

    // 3. Layered Violet / Void Foliage Clumps
    const puffOffsets = [
      { ox: 0, oy: -14, r: 20 },
      { ox: -12, oy: -3, r: 15 },
      { ox: 12, oy: -3, r: 15 },
      { ox: -6, oy: -23, r: 14 },
      { ox: 6, oy: -21, r: 15 },
    ];

    // Deep void outline
    ctx.fillStyle = '#090214';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r + 2);
    });

    // Dark indigo base
    ctx.fillStyle = '#2e1065';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox, cy + p.oy, p.r);
    });

    // Royal violet midtone
    ctx.fillStyle = '#581c87';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 1, cy + p.oy - 2, p.r - 3);
    });

    // Arcane purple highlight
    ctx.fillStyle = '#7e22ce';
    puffOffsets.forEach(p => {
      this.drawLeafPuff(ctx, cx + p.ox + 2, cy + p.oy - 4, p.r - 5);
    });

    // Glowing Bioluminescent Eldritch Spore Nodes
    ctx.fillStyle = '#e879f9';
    puffOffsets.forEach(p => {
      ctx.fillRect(cx + p.ox - 2, cy + p.oy - 2, 3, 3);
      ctx.fillRect(cx + p.ox + 4, cy + p.oy - p.r + 5, 2, 2);
    });

    // Floating Spore Motes descending into the dark
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(cx - 14, cy - 8, 2, 2);
    ctx.fillRect(cx + 16, cy - 6, 2, 2);
    ctx.fillRect(cx - 8, cy + 10, 2, 2);
    ctx.fillRect(cx + 10, cy + 12, 2, 2);
  }

  // =========================================================================
  // 3. FROST-CRYPT SOUL PINE (Spectral Soul-Ice with Sharp Crystalline Icicles)
  // =========================================================================
  private renderTerrariaFrostCryptPine(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow & Soul-Frost Bank
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chilling Spectral Frost Aura under tree
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Obsidian-Slate Trunk
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx - 4, cy + 12, 8, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 1, cy + 12, 4, 16);

    // Frost cracks along trunk
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 2, cy + 16, 2, 6);

    // 3. Stepped 3D Spectral Ice Needle Tiers (Bottom to Top)
    const tiers = [
      { y: cy + 12, w: 40, h: 18 },
      { y: cy - 2, w: 34, h: 16 },
      { y: cy - 14, w: 26, h: 14 },
      { y: cy - 25, w: 18, h: 12 },
    ];

    tiers.forEach((tier) => {
      const ty = tier.y;
      const tw = tier.w;
      const th = tier.h;

      // Dark Soul Abyss Shadow (Left)
      ctx.fillStyle = '#031024';
      ctx.beginPath();
      ctx.moveTo(cx, ty - th);
      ctx.lineTo(cx - tw / 2, ty);
      ctx.lineTo(cx, ty + 2);
      ctx.closePath();
      ctx.fill();

      // Spectral Soul-Cyan Needle Face (Right)
      ctx.fillStyle = '#075985';
      ctx.beginPath();
      ctx.moveTo(cx, ty - th);
      ctx.lineTo(cx, ty + 2);
      ctx.lineTo(cx + tw / 2, ty);
      ctx.closePath();
      ctx.fill();

      // Sharp icicle needle fringes along bottom
      ctx.fillStyle = '#0369a1';
      for (let s = -tw / 2; s < tw / 2; s += 4) {
        ctx.fillRect(cx + s, ty - 1, 2, 4);
      }

      // Spectral Cyan Frost Crest on Ridges
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx, ty - th);
      ctx.lineTo(cx - tw / 2 + 3, ty - 2);
      ctx.lineTo(cx + tw / 2 - 3, ty - 2);
      ctx.closePath();
      ctx.fill();

      // Piercing White Soul-Ice Glints
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(cx - 2, ty - th + 2, 4, 3);
      ctx.fillRect(cx - tw / 4, ty - 4, 3, 2);
      ctx.fillRect(cx + tw / 4 - 2, ty - 4, 3, 2);
    });
  }

  // =========================================================================
  // 4. PETRIFIED SKELETAL ASHWOOD (Charcoal Bones with Smoldering Magma Fissures)
  // =========================================================================
  private renderTerrariaAshThornTree(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow & Ash Mound
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Bare Skeletal Claw Branches (Dead Ashen Tree)
    ctx.fillStyle = '#18181b';
    // Main Trunk
    ctx.fillRect(cx - 4, cy - 10, 8, 38);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(cx, cy - 10, 4, 38);

    // Claw Branch Left (Reaching upwards like bony claws)
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 2);
    ctx.lineTo(cx - 18, cy - 14);
    ctx.lineTo(cx - 14, cy - 18);
    ctx.lineTo(cx - 1, cy - 4);
    ctx.closePath();
    ctx.fill();

    // Sub-claw branch left
    ctx.fillRect(cx - 20, cy - 22, 3, 10);
    ctx.fillRect(cx - 14, cy - 26, 3, 10);

    // Claw Branch Right
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 2);
    ctx.lineTo(cx + 18, cy - 18);
    ctx.lineTo(cx + 14, cy - 22);
    ctx.lineTo(cx + 1, cy - 8);
    ctx.closePath();
    ctx.fill();

    // Sub-claw branch right
    ctx.fillRect(cx + 18, cy - 26, 3, 10);
    ctx.fillRect(cx + 12, cy - 30, 3, 10);

    // Top jagged crown spikes
    ctx.fillRect(cx - 3, cy - 24, 3, 15);
    ctx.fillRect(cx + 1, cy - 20, 3, 12);

    // Smoldering Magma Cracks along the charred bone-wood
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 1, cy + 4, 2, 8);
    ctx.fillRect(cx - 8, cy - 6, 6, 2);
    ctx.fillRect(cx + 4, cy - 8, 6, 2);

    ctx.fillStyle = '#f97316';
    ctx.fillRect(cx - 1, cy + 6, 2, 3);
    ctx.fillRect(cx + 6, cy - 8, 3, 2);

    // Floating Ember Sparks
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 12, cy - 28, 2, 2);
    ctx.fillRect(cx + 14, cy - 32, 2, 2);
    ctx.fillRect(cx + 4, cy - 22, 2, 2);
  }

  // =========================================================================
  // 5. ANCIENT DARK OAK (Gothic / Dark Fantasy Gnarled Ancient Tree)
  // Deep charcoal/moss-covered bark, layered olive & emerald canopy, hanging moss
  // =========================================================================
  private renderAncientDarkOak(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    v: number
  ) {
    // 1. Isometric Ground Shadow with deep woodland ambient occlusion
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 30, 15, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 29, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thick Gnarled Charcoal-Bark Oak Trunk & Creeping Roots
    ctx.fillStyle = '#141210'; // Deep obsidian-bark shadow
    // Left root
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 16);
    ctx.lineTo(cx - 18, cy + 28);
    ctx.lineTo(cx - 11, cy + 30);
    ctx.lineTo(cx - 3, cy + 22);
    ctx.closePath();
    ctx.fill();

    // Right root
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy + 16);
    ctx.lineTo(cx + 17, cy + 28);
    ctx.lineTo(cx + 10, cy + 30);
    ctx.lineTo(cx + 2, cy + 22);
    ctx.closePath();
    ctx.fill();

    // Central ancient trunk (dark aged oak wood)
    ctx.fillStyle = '#1c1917'; // Left shadow side
    ctx.fillRect(cx - 7, cy + 2, 7, 26);
    ctx.fillStyle = '#292524'; // Right midtone side
    ctx.fillRect(cx, cy + 2, 7, 26);

    // Weathered bark striations & moss growth
    ctx.fillStyle = '#44403c';
    ctx.fillRect(cx + 3, cy + 5, 2, 18);
    ctx.fillRect(cx - 4, cy + 10, 2, 12);

    // Deep forest moss patches on trunk
    ctx.fillStyle = '#14532d';
    ctx.fillRect(cx - 6, cy + 14, 3, 8);
    ctx.fillStyle = '#166534';
    ctx.fillRect(cx - 5, cy + 16, 2, 4);
    ctx.fillRect(cx + 1, cy + 20, 3, 3);

    // Ancient twisting branches reaching out
    ctx.fillStyle = '#1c1917';
    // Left major bough
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 4);
    ctx.lineTo(cx - 18, cy - 8);
    ctx.lineTo(cx - 14, cy - 11);
    ctx.lineTo(cx - 1, cy - 1);
    ctx.closePath();
    ctx.fill();

    // Right major bough
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy + 2);
    ctx.lineTo(cx + 19, cy - 10);
    ctx.lineTo(cx + 15, cy - 13);
    ctx.lineTo(cx - 1, cy - 3);
    ctx.closePath();
    ctx.fill();

    // 3. Dense, Layered Dark Fantasy Foliage Canopy
    const puffOffsets = [
      { ox: 0, oy: -15, rx: 22, ry: 17 },
      { ox: -15, oy: -6, rx: 17, ry: 14 },
      { ox: 15, oy: -7, rx: 18, ry: 15 },
      { ox: -8, oy: -26, rx: 16, ry: 13 },
      { ox: 9, oy: -25, rx: 17, ry: 14 },
      { ox: 0, oy: -32, rx: 14, ry: 11 },
    ];

    if (v === 1) {
      puffOffsets[1].ox -= 3;
      puffOffsets[3].oy -= 2;
    } else if (v === 2) {
      puffOffsets[2].ox += 3;
      puffOffsets[4].oy -= 2;
    } else if (v === 3) {
      puffOffsets[0].ry += 2;
      puffOffsets[5].oy -= 3;
    }

    // Pass 1: Deep shadow silhouette (Abyssal forest border)
    ctx.fillStyle = '#051b0d';
    puffOffsets.forEach(p => {
      this.drawLeafCluster(ctx, cx + p.ox, cy + p.oy, p.rx + 2, p.ry + 2);
    });

    // Pass 2: Base Dark Woodland Evergreen
    ctx.fillStyle = '#0f2915';
    puffOffsets.forEach(p => {
      this.drawLeafCluster(ctx, cx + p.ox, cy + p.oy, p.rx, p.ry);
    });

    // Pass 3: Rich Deep Olive-Emerald Midtone
    ctx.fillStyle = '#164e2a';
    puffOffsets.forEach(p => {
      this.drawLeafCluster(ctx, cx + p.ox + 1, cy + p.oy - 2, p.rx - 3, p.ry - 3);
    });

    // Pass 4: Weathered Forest Sage Highlights
    ctx.fillStyle = '#226938';
    puffOffsets.forEach(p => {
      this.drawLeafCluster(ctx, cx + p.ox + 2, cy + p.oy - 4, p.rx - 6, p.ry - 5);
    });

    // Pass 5: Subtle Autumn Moss & Amber Sunlit Leaf Pixels
    ctx.fillStyle = '#3f7c46';
    puffOffsets.forEach(p => {
      ctx.fillRect(cx + p.ox + 2, cy + p.oy - p.ry + 4, 4, 3);
      ctx.fillRect(cx + p.ox + 6, cy + p.oy - p.ry + 7, 3, 2);
    });
    ctx.fillStyle = '#847337'; // Amber acorn / golden autumn leaf fleck
    ctx.fillRect(cx - 6, cy - 22, 2, 2);
    ctx.fillRect(cx + 8, cy - 18, 2, 2);
    ctx.fillRect(cx + 14, cy - 8, 2, 2);

    // 4. Weeping Ivy & Spanish Moss tendrils hanging from lower boughs
    ctx.fillStyle = '#14532d';
    // Left hanging moss
    ctx.fillRect(cx - 16, cy + 4, 2, 9);
    ctx.fillRect(cx - 15, cy + 9, 1, 4);
    // Center hanging moss
    ctx.fillRect(cx - 5, cy + 6, 2, 11);
    ctx.fillRect(cx - 4, cy + 13, 1, 3);
    // Right hanging moss
    ctx.fillRect(cx + 11, cy + 4, 2, 8);
    ctx.fillRect(cx + 12, cy + 9, 1, 4);
    ctx.fillRect(cx + 17, cy + 2, 2, 7);

    // Light tips on ivy
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(cx - 16, cy + 13, 1, 2);
    ctx.fillRect(cx - 5, cy + 17, 1, 2);
    ctx.fillRect(cx + 11, cy + 12, 1, 2);
  }

  // =========================================================================
  // HELPER: ORGANIC LEAF CLUSTER (ELLIPTICAL)
  // =========================================================================
  private drawLeafCluster(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    rx: number,
    ry: number
  ) {
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    ctx.ellipse(px - rx * 0.35, py + ry * 0.25, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2);
    ctx.ellipse(px + rx * 0.35, py + ry * 0.25, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
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
