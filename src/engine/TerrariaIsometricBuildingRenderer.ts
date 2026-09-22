// ===========================================================================
// TERRARIA-STYLE 2.5D ISOMETRIC BUILDING RENDERER
// True 2:1 Dimetric Isometric Projection with Hand-Crafted Terraria Pixel Art
// ===========================================================================

export class TerrariaIsometricBuildingRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  private makeCanvas(w = 96, h = 96): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  public getBuildingSprite(type: string, ownerColor: string | null = null): HTMLCanvasElement {
    const cacheKey = `terraria_iso_bld_${type}_${ownerColor || 'none'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(96, 96);
    const cx = 48;
    const cy = 56;

    switch (type) {
      case 'town':
      case 'capital':
        this.renderIsometricCastleCitadel(ctx, cx, cy, ownerColor);
        break;
      case 'shop_weapon':
        this.renderIsometricBlacksmithForge(ctx, cx, cy);
        break;
      case 'shop_magic':
        this.renderIsometricArcaneSpire(ctx, cx, cy);
        break;
      case 'church':
        this.renderIsometricGothicCathedral(ctx, cx, cy);
        break;
      case 'shop_item':
        this.renderIsometricGeneralGoods(ctx, cx, cy);
        break;
      case 'tavern':
        this.renderIsometricTavernInn(ctx, cx, cy);
        break;
      case 'guild':
        this.renderIsometricGuildHall(ctx, cx, cy);
        break;
      case 'fishing':
        this.renderIsometricFishingPier(ctx, cx, cy);
        break;
      case 'isekai_event':
        this.renderIsometricIsekaiShrine(ctx, cx, cy);
        break;
      case 'dark_gate':
      case 'boss':
        this.renderIsometricDarkPortal(ctx, cx, cy);
        break;
      case 'vault':
        this.renderIsometricTreasureVault(ctx, cx, cy);
        break;
      case 'mystery_chest':
        this.renderIsometricWonderChest(ctx, cx, cy);
        break;
      case 'home':
        this.renderIsometricCozyHome(ctx, cx, cy, ownerColor);
        break;
      default:
        this.renderIsometricCastleCitadel(ctx, cx, cy, ownerColor);
        break;
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  // -------------------------------------------------------------------------
  // 1. ISOMETRIC CASTLE CITADEL (Fortified Keep with 2.5D Towers & Battlements)
  // -------------------------------------------------------------------------
  private renderIsometricCastleCitadel(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    ownerColor: string | null
  ) {
    const bannerColor = ownerColor || '#38bdf8';
    const bannerAccent = ownerColor || '#7dd3fc';

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 38, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Central Keep - Isometric Walls
    // Left Wall (SW facing - Deep Shadow Stone Bricks)
    this.drawIsoWallLeft(ctx, cx, cy + 14, 28, 32, '#1e293b', '#0f172a', '#334155');
    // Right Wall (SE facing - Sunlit Stone Bricks)
    this.drawIsoWallRight(ctx, cx, cy + 14, 28, 32, '#334155', '#1e293b', '#64748b');

    // 3. Arched Iron Portcullis & Timber Gate (SE Wall)
    this.drawIsoDoorway(ctx, cx + 10, cy + 4, 10, 16, '#020617', '#451a03', '#78350f', '#fbbf24');

    // 4. Crenelated Battlements on Central Keep
    this.drawIsoBattlements(ctx, cx, cy - 18, 28, 28, 8, '#475569', '#334155', '#1e293b');

    // 5. Left Isometric Watchtower (SW Corner)
    const t1x = cx - 22;
    const t1y = cy + 3;
    this.drawIsoTower(ctx, t1x, t1y, 14, 38, '#1e293b', '#0f172a', '#334155', '#020617');

    // 6. Right Isometric Watchtower (SE Corner)
    const t2x = cx + 22;
    const t2y = cy + 3;
    this.drawIsoTower(ctx, t2x, t2y, 14, 38, '#334155', '#1e293b', '#64748b', '#fde047');

    // 7. Castle Banner & Flagpole (Terraria-style wind banner)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 1, cy - 42, 3, 24);
    // Gold finial sphere
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 2, cy - 44, 5, 4);

    // Flowing Flag Banner in Player/Territory Color
    ctx.fillStyle = bannerColor;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 42);
    ctx.lineTo(cx + 20, cy - 38);
    ctx.lineTo(cx + 14, cy - 30);
    ctx.lineTo(cx + 20, cy - 24);
    ctx.lineTo(cx + 2, cy - 28);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = bannerAccent;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Heraldic Crown Sigil on Banner
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx + 6, cy - 36, 4, 3);
  }

  // -------------------------------------------------------------------------
  // 2. ISOMETRIC BLACKSMITH FORGE (Iron & Slate Smithy with Glowing Chimney)
  // -------------------------------------------------------------------------
  private renderIsometricBlacksmithForge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Stone Walls
    // Left Wall (SW - Shadow Stone)
    this.drawIsoWallLeft(ctx, cx, cy + 14, 26, 26, '#1e293b', '#0f172a', '#334155');
    // Right Wall (SE - Warm Forge Light)
    this.drawIsoWallRight(ctx, cx, cy + 14, 26, 26, '#334155', '#1e293b', '#475569');

    // 3. Terracotta Pitched Shingle Roof (Terraria-style layered roof tiles)
    this.drawIsoPitchedRoof(ctx, cx, cy - 12, 30, 30, 16, '#991b1b', '#7f1d1d', '#b91c1c', '#ef4444');

    // 4. Stone Chimney with Molten Embers & Smoke
    const chx = cx - 14;
    const chy = cy - 26;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(chx, chy, 8, 18);
    ctx.fillStyle = '#334155';
    ctx.fillRect(chx - 1, chy - 2, 10, 4);
    // Molten Chimney Glow
    ctx.fillStyle = '#f97316';
    ctx.fillRect(chx + 1, chy - 1, 6, 2);
    // Smoke puffs
    ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.fillRect(chx + 2, chy - 8, 4, 4);
    ctx.fillRect(chx + 4, chy - 14, 6, 5);

    // 5. Open Forge Hearth with Glowing Magma Fire (Right side)
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx + 6, cy + 4, 12, 12);
    // Magma Hearth
    ctx.fillStyle = '#ea580c';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx + 8, cy + 8, 8, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx + 10, cy + 11, 4, 4);
    ctx.shadowBlur = 0;

    // 6. Blacksmith Anvil on Wooden Stump (Foreground SE)
    const ax = cx + 22;
    const ay = cy + 16;
    // Stump
    ctx.fillStyle = '#78350f';
    ctx.fillRect(ax - 5, ay - 2, 10, 8);
    // Steel Anvil
    ctx.fillStyle = '#475569';
    ctx.fillRect(ax - 8, ay - 6, 16, 5);
    ctx.fillStyle = '#94a3b8'; // Horn highlight
    ctx.fillRect(ax - 9, ay - 5, 4, 2);
  }

  // -------------------------------------------------------------------------
  // 3. ISOMETRIC ARCANE SPIRE (Wizard Observatory with Floating Crystals)
  // -------------------------------------------------------------------------
  private renderIsometricArcaneSpire(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Ground Rune Circle & Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 32, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Arcane Rune Ring at base
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 26, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Tower Body (Deep Arcane Slate Octagonal Structure)
    this.drawIsoWallLeft(ctx, cx, cy + 14, 22, 42, '#2e1065', '#1e0845', '#3b0764');
    this.drawIsoWallRight(ctx, cx, cy + 14, 22, 42, '#4c1d95', '#3b0764', '#581c87');

    // 3. Arched Stained Glass Window with Mystic Cyan Light
    this.drawIsoArchedWindow(ctx, cx + 8, cy - 2, 7, 14, '#06b6d4', '#38bdf8', '#00f0ff');

    // 4. Conical Steep Wizard Roof (Purple Slate Tiles)
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 54);
    ctx.lineTo(cx - 16, cy - 28);
    ctx.lineTo(cx, cy - 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7e22ce';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 54);
    ctx.lineTo(cx, cy - 20);
    ctx.lineTo(cx + 16, cy - 28);
    ctx.closePath();
    ctx.fill();

    // Terraria-style Roof Shingle Ridges
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 54);
    ctx.lineTo(cx, cy - 20);
    ctx.stroke();

    // 5. Floating Levitating Mana Crystals Orbiting the Spire Tip
    const crystalColors = ['#38bdf8', '#c084fc', '#f43f5e'];
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const ox = cx + Math.cos(angle) * 16;
      const oy = cy - 52 + Math.sin(angle) * 7;

      ctx.fillStyle = crystalColors[i];
      ctx.shadowColor = crystalColors[i];
      ctx.shadowBlur = 10;
      this.drawPixelDiamond(ctx, ox, oy, 6, 10);
      ctx.shadowBlur = 0;
    }

    // Top Apex Crystal
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    this.drawPixelDiamond(ctx, cx, cy - 60, 7, 12);
    ctx.shadowBlur = 0;
  }

  // -------------------------------------------------------------------------
  // 4. ISOMETRIC GOTHIC CATHEDRAL (Cathedral with Bell Spire & Rose Window)
  // -------------------------------------------------------------------------
  private renderIsometricGothicCathedral(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 38, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main Nave Walls
    this.drawIsoWallLeft(ctx, cx, cy + 14, 26, 32, '#1e293b', '#0f172a', '#334155');
    this.drawIsoWallRight(ctx, cx, cy + 14, 26, 32, '#334155', '#1e293b', '#64748b');

    // 3. High Gothic Gable Roof
    this.drawIsoPitchedRoof(ctx, cx, cy - 18, 30, 30, 18, '#334155', '#1e293b', '#475569', '#94a3b8');

    // 4. Central Spire & Belfry
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 6, cy - 44, 12, 18);
    // Spire Pyramid Roof
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 58);
    ctx.lineTo(cx - 7, cy - 44);
    ctx.lineTo(cx + 7, cy - 44);
    ctx.closePath();
    ctx.fill();

    // Golden Cross on Spire Apex
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 1, cy - 68, 3, 11);
    ctx.fillRect(cx - 4, cy - 65, 9, 3);

    // 5. Glowing Stained-Glass Rose Window (SE Facade)
    const rwx = cx + 11;
    const rwy = cy + 2;
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(rwx, rwy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Cross leading in window
    ctx.fillStyle = '#451a03';
    ctx.fillRect(rwx - 1, rwy - 5, 2, 10);
    ctx.fillRect(rwx - 5, rwy - 1, 10, 2);
    ctx.shadowBlur = 0;

    // 6. Flying Buttresses on SW Wall
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 24, cy + 2, 4, 18);
    ctx.fillRect(cx - 14, cy + 8, 4, 18);
  }

  // -------------------------------------------------------------------------
  // 5. ISOMETRIC GENERAL STORE (Timber Apothecary with Striped Awning)
  // -------------------------------------------------------------------------
  private renderIsometricGeneralGoods(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Half-Timber Medieval House Walls
    this.drawIsoWallLeft(ctx, cx, cy + 14, 26, 26, '#451a03', '#290e02', '#78350f');
    this.drawIsoWallRight(ctx, cx, cy + 14, 26, 26, '#78350f', '#451a03', '#92400e');

    // Timber cross-beams (Terraria wood styling)
    ctx.strokeStyle = '#290e02';
    ctx.lineWidth = 1.5;
    // Diagonal timbers on left wall
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 4);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();

    // 3. Cozy Forest Green Shingle Roof
    this.drawIsoPitchedRoof(ctx, cx, cy - 12, 30, 30, 16, '#14532d', '#052e16', '#166534', '#22c55e');

    // 4. Striped Merchant Awning over Market Stall (SE Wall)
    const awX = cx + 8;
    const awY = cy + 6;
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#dc2626' : '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(awX + s * 4, awY);
      ctx.lineTo(awX + (s + 1) * 4, awY + 2);
      ctx.lineTo(awX + (s + 1) * 4 - 4, awY + 8);
      ctx.lineTo(awX + s * 4 - 4, awY + 6);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Potion Bottles & Barrels in Stall
    ctx.fillStyle = '#ef4444'; // Red potion
    ctx.fillRect(awX - 1, awY + 9, 3, 5);
    ctx.fillStyle = '#38bdf8'; // Mana potion
    ctx.fillRect(awX + 4, awY + 11, 3, 5);
    // Oak Barrel
    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx + 22, cy + 13, 7, 9);
    ctx.strokeStyle = '#451a03';
    ctx.strokeRect(cx + 22, cy + 13, 7, 9);
  }

  // -------------------------------------------------------------------------
  // 6. ISOMETRIC DARK PORTAL (Abyssal Nether Gate with Horned Monoliths)
  // -------------------------------------------------------------------------
  private renderIsometricDarkPortal(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Lava / Abyss Ground Crater & Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 38, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Molten Lava Glow
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Twin Obsidian Demonic Spire Horns (Left & Right)
    // Left Spire
    ctx.fillStyle = '#0f071a';
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 16);
    ctx.lineTo(cx - 16, cy - 38);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Right Spire
    ctx.fillStyle = '#1e0e33';
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy + 8);
    ctx.lineTo(cx + 16, cy - 38);
    ctx.lineTo(cx + 24, cy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Swirling Abyssal Nether Vortex (Portal Opening)
    const portalGrad = ctx.createRadialGradient(cx, cy - 4, 3, cx, cy - 4, 22);
    portalGrad.addColorStop(0, '#ffffff');
    portalGrad.addColorStop(0.3, '#c084fc');
    portalGrad.addColorStop(0.7, '#7e22ce');
    portalGrad.addColorStop(1, '#0f071a');

    ctx.fillStyle = portalGrad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Nether Energy Ring
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Demon Eye Sigil at top of Portal
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - 4, cy - 34, 8, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 1, cy - 33, 2, 3);
    ctx.shadowBlur = 0;
  }

  // -------------------------------------------------------------------------
  // 8. ISOMETRIC TAVERN & INN (Cozy Wooden Lodge with Smoking Chimney & Beer Sign)
  // -------------------------------------------------------------------------
  private renderIsometricTavernInn(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 38, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Warm Wooden Walls
    this.drawIsoWallLeft(ctx, cx, cy + 14, 28, 26, '#713f12', '#451a03', '#854d0e');
    this.drawIsoWallRight(ctx, cx, cy + 14, 28, 26, '#854d0e', '#713f12', '#a16207');

    // 3. Glowing Amber Windows
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 18, cy + 2, 6, 8);
    ctx.fillRect(cx + 12, cy + 2, 6, 8);

    // Window crossframes
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 16, cy + 2, 2, 8);
    ctx.fillRect(cx + 14, cy + 2, 2, 8);

    // 4. Cozy Terracotta Shingle Roof
    this.drawIsoPitchedRoof(ctx, cx, cy - 12, 32, 32, 16, '#991b1b', '#7f1d1d', '#b91c1c', '#f87171');

    // 5. Stone Chimney with Smoke Puffs on Left Side
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 18, cy - 28, 6, 16);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 19, cy - 30, 8, 3);

    // White/Grey Smoke Puffs
    ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
    ctx.beginPath();
    ctx.arc(cx - 15, cy - 36, 4, 0, Math.PI * 2);
    ctx.arc(cx - 12, cy - 43, 6, 0, Math.PI * 2);
    ctx.arc(cx - 8, cy - 51, 8, 0, Math.PI * 2);
    ctx.fill();

    // 6. Hanging Wooden Tavern Signboard
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx + 18, cy + 4, 3, 10);
    ctx.fillRect(cx + 14, cy + 14, 11, 8);
    // Beer mug icon on sign
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx + 17, cy + 16, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 16, cy + 15, 7, 2); // White beer foam
  }

  // -------------------------------------------------------------------------
  // 9. ISOMETRIC ADVENTURER'S GUILD (Grand Stone Hall with Crossed Swords & Quest Board)
  // -------------------------------------------------------------------------
  private renderIsometricGuildHall(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chiseled Granite Walls
    this.drawIsoWallLeft(ctx, cx, cy + 14, 30, 28, '#334155', '#1e293b', '#475569');
    this.drawIsoWallRight(ctx, cx, cy + 14, 30, 28, '#475569', '#334155', '#64748b');

    // 3. Royal Blue Hip Roof
    this.drawIsoPitchedRoof(ctx, cx, cy - 14, 34, 34, 18, '#1e3a8a', '#172554', '#1d4ed8', '#38bdf8');

    // 4. Arched Oak Entrance
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 8, 6, Math.PI, 0);
    ctx.rect(cx + 2, cy + 8, 12, 12);
    ctx.fill();

    // 5. Guild Crest Banner Above Door (Gold & Red with Crossed Swords)
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx + 4, cy - 2, 8, 8);
    ctx.fillStyle = '#facc15';
    // Miniature crossed swords
    ctx.fillRect(cx + 5, cy + 1, 6, 2);
    ctx.fillRect(cx + 7, cy - 1, 2, 6);

    // 6. Wooden Notice / Quest Board Outside
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 20, cy + 10, 2, 12);
    ctx.fillRect(cx - 10, cy + 10, 2, 12);
    ctx.fillRect(cx - 22, cy + 6, 14, 10);
    // Pinned parchment notes
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(cx - 20, cy + 8, 4, 3);
    ctx.fillRect(cx - 14, cy + 8, 4, 4);
    ctx.fillRect(cx - 18, cy + 12, 5, 3);
  }

  // -------------------------------------------------------------------------
  // 10. ISOMETRIC FISHING PIER (Boardwalk on Water with Mooring Post & Rod)
  // -------------------------------------------------------------------------
  private renderIsometricFishingPier(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Water Ripples & Blue Shadow
    ctx.fillStyle = 'rgba(2, 132, 199, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 24, 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Wooden Boardwalk Pilings (Stilts)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 16, cy + 8, 4, 14);
    ctx.fillRect(cx, cy + 12, 4, 14);
    ctx.fillRect(cx + 16, cy + 8, 4, 14);

    // 3. Horizontal Boardwalk Planks
    this.drawIsoTopDiamond(ctx, cx, cy + 8, 34, 18, '#92400e', '#b45309');

    // 4. Mooring Post with Brass Lantern
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx + 14, cy - 2, 4, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx + 15, cy - 6, 3, 5);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx + 14, cy - 7, 5, 2);

    // 5. Fishing Bucket & Tackle Box
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 10, cy + 4, 6, 6);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(cx - 9, cy + 5, 4, 2); // Water inside bucket

    // 6. Angled Fishing Rod Over Water
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 6);
    ctx.lineTo(cx + 2, cy - 14);
    ctx.stroke();

    // Slender fishing line dipping into water
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 14);
    ctx.lineTo(cx + 12, cy + 22);
    ctx.stroke();

    // Tiny red bobber float
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx + 12, cy + 22, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // -------------------------------------------------------------------------
  // 11. ISOMETRIC ISEKAI MYSTERY SHRINE (Runic Obelisk with Celestial Rings)
  // -------------------------------------------------------------------------
  private renderIsometricIsekaiShrine(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Magic Aura Shadow
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Tiered Runic Marble Pedestal
    this.drawIsoTopDiamond(ctx, cx, cy + 14, 30, 16, '#cbd5e1', '#e2e8f0');
    this.drawIsoTopDiamond(ctx, cx, cy + 8, 22, 12, '#e2e8f0', '#f8fafc');

    // 3. Tall Runic Obelisk Pillar
    this.drawIsoWallLeft(ctx, cx, cy + 8, 12, 34, '#94a3b8', '#64748b', '#cbd5e1');
    this.drawIsoWallRight(ctx, cx, cy + 8, 12, 34, '#cbd5e1', '#94a3b8', '#f1f5f9');

    // Glowing Ancient Arcane Runes
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(cx - 4, cy - 4, 2, 4);
    ctx.fillRect(cx - 3, cy - 14, 3, 2);
    ctx.fillRect(cx + 2, cy - 8, 2, 6);
    ctx.fillRect(cx + 3, cy - 18, 3, 3);

    // 4. Floating Celestial Star / Crystal Gem at Apex
    ctx.fillStyle = '#f0abfc';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 36);
    ctx.lineTo(cx + 6, cy - 30);
    ctx.lineTo(cx, cy - 24);
    ctx.lineTo(cx - 6, cy - 30);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Orbiting Celestial Ring
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30, 14, 6, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // -------------------------------------------------------------------------
  // 12. ISOMETRIC TREASURE VAULT (Reinforced Vault with Heavy Steel Dial)
  // -------------------------------------------------------------------------
  private renderIsometricTreasureVault(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Heavy shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vault Stone Base
    this.drawIsoWallLeft(ctx, cx, cy + 12, 26, 24, '#1e293b', '#0f172a', '#475569');
    this.drawIsoWallRight(ctx, cx, cy + 12, 26, 24, '#334155', '#1e293b', '#64748b');
    this.drawIsoTopDiamond(ctx, cx, cy - 12, 26, 26, '#475569', '#64748b');

    // 3. Heavy Circular Vault Door (SE face)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 2, 8, 12, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vault Wheel
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // -------------------------------------------------------------------------
  // 13. ISOMETRIC WONDER CHEST (กล่องสุ่มมหัศจรรย์ Dokapon Wonder Mystery Chest)
  // Radiant rainbow aura, floating golden chest, star sparkles & light beam
  // -------------------------------------------------------------------------
  private renderIsometricWonderChest(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number
  ) {
    // 1. Radiant Sacred Ground Halo
    ctx.save();
    const haloGrad = ctx.createRadialGradient(cx, cy + 12, 4, cx, cy + 12, 34);
    haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
    haloGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.25)');
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Ascending Divine Light Pillar
    const beamGrad = ctx.createLinearGradient(cx, cy + 12, cx, cy - 48);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    beamGrad.addColorStop(0.6, 'rgba(244, 114, 182, 0.20)');
    beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy + 8);
    ctx.lineTo(cx + 16, cy + 8);
    ctx.lineTo(cx + 22, cy - 48);
    ctx.lineTo(cx - 22, cy - 48);
    ctx.closePath();
    ctx.fill();

    // 3. Magic Floating Star Motes
    const sparkles = [
      { x: cx - 18, y: cy - 14, r: 2.5, c: '#fde047' },
      { x: cx + 16, y: cy - 22, r: 3.0, c: '#f472b6' },
      { x: cx - 8, y: cy - 32, r: 2.0, c: '#38bdf8' },
      { x: cx + 12, y: cy - 6, r: 2.2, c: '#4ade80' }
    ];
    sparkles.forEach(s => {
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 4. Floating Isometric Golden Chest Body
    // Chest base box
    const chestBaseY = cy + 6;
    this.drawIsoWallLeft(ctx, cx, chestBaseY, 20, 14, '#b45309', '#78350f', '#d97706');
    this.drawIsoWallRight(ctx, cx, chestBaseY, 20, 14, '#d97706', '#92400e', '#f59e0b');
    this.drawIsoTopDiamond(ctx, cx, chestBaseY - 14, 20, 14, '#f59e0b', '#fbbf24');

    // Golden Trim Bands & Rivets
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 9, chestBaseY - 10, 3, 10);
    ctx.fillRect(cx + 6, chestBaseY - 10, 3, 10);
    ctx.fillRect(cx - 1, chestBaseY - 8, 3, 10);

    // Domed Chest Lid (Arched Top)
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(cx, chestBaseY - 16, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Radiant Royal Gemstone Lock (Glowing Ruby)
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, chestBaseY - 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // =========================================================================
  // GEOMETRIC ISOMETRIC DRAWING PRIMITIVES (2:1 Dimetric Perspective)
  // =========================================================================

  private drawIsoWallLeft(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    baseColor: string,
    shadowColor: string,
    outlineColor: string
  ) {
    const hw = w / 2;
    const hh = w / 4;

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx - hw, cy - hh - h);
    ctx.closePath();
    ctx.fill();

    // Terraria-style Brick Course Lines
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 1;
    const courses = 4;
    for (let c = 1; c < courses; c++) {
      const ch = (h / courses) * c;
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy - hh - ch);
      ctx.lineTo(cx, cy - ch);
      ctx.stroke();
    }

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawIsoWallRight(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    baseColor: string,
    shadowColor: string,
    outlineColor: string
  ) {
    const hw = w / 2;
    const hh = w / 4;

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx + hw, cy - hh - h);
    ctx.lineTo(cx, cy - h);
    ctx.closePath();
    ctx.fill();

    // Terraria-style Brick Course Lines
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 1;
    const courses = 4;
    for (let c = 1; c < courses; c++) {
      const ch = (h / courses) * c;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ch);
      ctx.lineTo(cx + hw, cy - hh - ch);
      ctx.stroke();
    }

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawIsoTopDiamond(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    baseColor: string,
    highlightColor: string
  ) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawIsoPitchedRoof(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    ridgeHeight: number,
    leftShingle: string,
    leftShadow: string,
    rightShingle: string,
    rightHighlight: string
  ) {
    const hw = (w / 2) + 2;
    const hh = (h / 4) + 1;

    // Ridge runs SW to NE
    // Left Roof Slope (Shadowed)
    ctx.fillStyle = leftShingle;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - ridgeHeight);
    ctx.lineTo(cx - hw, cy - hh - ridgeHeight);
    ctx.closePath();
    ctx.fill();

    // Left Slope Shingle Lines
    ctx.strokeStyle = leftShadow;
    ctx.lineWidth = 1;
    for (let s = 1; s <= 3; s++) {
      const sh = (ridgeHeight / 4) * s;
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy - hh - sh);
      ctx.lineTo(cx, cy - sh);
      ctx.stroke();
    }

    // Right Roof Slope (Sunlit)
    ctx.fillStyle = rightShingle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx + hw, cy - hh - ridgeHeight);
    ctx.lineTo(cx, cy - ridgeHeight);
    ctx.closePath();
    ctx.fill();

    // Right Slope Shingle Lines
    ctx.strokeStyle = rightHighlight;
    ctx.lineWidth = 1;
    for (let s = 1; s <= 3; s++) {
      const sh = (ridgeHeight / 4) * s;
      ctx.beginPath();
      ctx.moveTo(cx, cy - sh);
      ctx.lineTo(cx + hw, cy - hh - sh);
      ctx.stroke();
    }

    // Front Gable Triangle
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - ridgeHeight);
    ctx.closePath();
    ctx.fill();
  }

  private drawIsoTower(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    leftColor: string,
    shadowColor: string,
    rightColor: string,
    windowColor: string
  ) {
    const hw = w / 2;
    const hh = w / 4;

    // Left tower face
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx - hw, cy - hh - h);
    ctx.closePath();
    ctx.fill();

    // Right tower face
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + hw, cy - hh);
    ctx.lineTo(cx + hw, cy - hh - h);
    ctx.lineTo(cx, cy - h);
    ctx.closePath();
    ctx.fill();

    // Tower Crenelated Top
    ctx.fillStyle = rightColor;
    ctx.fillRect(cx - hw - 1, cy - h - 6, w + 2, 6);
    ctx.fillStyle = shadowColor;
    ctx.fillRect(cx - 2, cy - h - 6, 4, 3); // Embrasures

    // Tower Arrow-slit Window
    ctx.fillStyle = windowColor;
    ctx.fillRect(cx + 2, cy - h + 14, 2, 6);
  }

  private drawIsoBattlements(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    d: number,
    h: number,
    topColor: string,
    frontColor: string,
    backColor: string
  ) {
    const hw = w / 2;
    const hh = d / 4;

    ctx.fillStyle = frontColor;
    // Front-left parapet
    ctx.fillRect(cx - hw, cy - hh - h, hw, h);
    // Front-right parapet
    ctx.fillStyle = topColor;
    ctx.fillRect(cx, cy - hh - h, hw, h);

    // Notch cutouts
    ctx.fillStyle = backColor;
    ctx.fillRect(cx - hw / 2 - 2, cy - hh - h, 4, 4);
    ctx.fillRect(cx + hw / 2 - 2, cy - hh - h, 4, 4);
  }

  private drawIsoDoorway(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    shadowColor: string,
    woodColor: string,
    beamColor: string,
    knobColor: string
  ) {
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + w, cy - w * 0.5);
    ctx.lineTo(cx + w, cy - w * 0.5 - h);
    ctx.lineTo(cx, cy - h);
    ctx.closePath();
    ctx.fill();

    // Wood planks
    ctx.fillStyle = woodColor;
    ctx.fillRect(cx + 1, cy - h + 2, w - 2, h - 2);

    // Iron Hinges & Handle
    ctx.fillStyle = beamColor;
    ctx.fillRect(cx + 1, cy - h + 4, w - 2, 2);
    ctx.fillRect(cx + 1, cy - 4, w - 2, 2);

    // Brass Knob
    ctx.fillStyle = knobColor;
    ctx.fillRect(cx + 3, cy - h / 2, 2, 2);
  }

  private drawIsoArchedWindow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    glassColor: string,
    lightColor: string,
    glowColor: string
  ) {
    ctx.fillStyle = glassColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
    ctx.fillRect(cx, cy, w, h);
    ctx.fillStyle = lightColor;
    ctx.fillRect(cx + 1, cy + 1, w - 2, h - 2);
    ctx.shadowBlur = 0;
  }

  private drawPixelDiamond(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    ctx.fill();
  }

  // -------------------------------------------------------------------------
  // 13. ISOMETRIC COZY HOME (บ้านพักผ่อนของผู้กล้า)
  // Stone foundation, warm timber walls, smoking chimney, flower window box
  // -------------------------------------------------------------------------
  private renderIsometricCozyHome(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    ownerColor: string | null
  ) {
    const flagColor = ownerColor || '#10b981';

    // 1. Soft Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 36, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Timber & Stone Cottage Walls
    // Left Wall (Shadow side)
    this.drawIsoWallLeft(ctx, cx, cy + 14, 26, 24, '#78350f', '#451a03', '#92400e');
    // Right Wall (Sunlit side)
    this.drawIsoWallRight(ctx, cx, cy + 14, 26, 24, '#b45309', '#78350f', '#d97706');

    // 3. Front Door on SE Wall
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx + 4, cy + 1, 6, 11);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx + 8, cy + 6, 1.5, 1.5); // Brass handle

    // 4. Glowing Window with Flower Box
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 10, cy - 1, 5, 5);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(cx - 11, cy + 4, 7, 2.5); // Flowers

    // 5. Terracotta Pitched Roof
    this.drawIsoPitchedRoof(ctx, cx, cy - 10, 30, 30, 16, '#047857', '#065f46', '#10b981', '#34d399');

    // 6. Brick Fireplace Chimney with Rising Smoke
    const chx = cx - 11;
    const chy = cy - 24;
    ctx.fillStyle = '#475569';
    ctx.fillRect(chx, chy, 7, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(chx - 1, chy, 9, 3);

    // Puffing smoke motes
    ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.beginPath();
    ctx.arc(chx + 3, chy - 5, 3, 0, Math.PI * 2);
    ctx.arc(chx + 6, chy - 11, 4, 0, Math.PI * 2);
    ctx.arc(chx + 10, chy - 18, 5, 0, Math.PI * 2);
    ctx.fill();

    // 7. Player Crest Flag
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx + 6, cy - 32, 2, 16); // Pole
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 32);
    ctx.lineTo(cx + 18, cy - 27);
    ctx.lineTo(cx + 8, cy - 22);
    ctx.closePath();
    ctx.fill();
  }
}

export const terrariaIsometricBuildingRenderer = new TerrariaIsometricBuildingRenderer();
