import { IsoDirection, CharacterAnimState } from './PixelSpriteGenerator';

export interface SpriteSlice {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export class TRPGAssetLoader {
  private entityImg: HTMLImageElement | null = null;
  private tilesImg: HTMLImageElement | null = null;
  private uiImg: HTMLImageElement | null = null;
  private indicatorsImg: HTMLImageElement | null = null;

  public isLoaded = false;
  private onLoadCallbacks: Array<() => void> = [];
  private canvasCache = new Map<string, HTMLCanvasElement>();

  constructor() {
    this.init();
  }

  private init() {
    let toLoad = 4;
    const checkAll = () => {
      toLoad--;
      if (toLoad <= 0) {
        this.isLoaded = true;
        this.onLoadCallbacks.forEach(cb => cb());
        this.onLoadCallbacks = [];
      }
    };

    // 1. Entities (Outlined for ultra-crisp board & battle contrast)
    this.entityImg = new Image();
    this.entityImg.onload = checkAll;
    this.entityImg.onerror = checkAll;
    this.entityImg.src = '/assets/IsometricTRPGAssetPack_OutlinedEntities.png';

    // 2. Isometric Tiles
    this.tilesImg = new Image();
    this.tilesImg.onload = checkAll;
    this.tilesImg.onerror = checkAll;
    this.tilesImg.src = '/assets/Isometric_MedievalFantasy_Tiles.png';

    // 3. UI
    this.uiImg = new Image();
    this.uiImg.onload = checkAll;
    this.uiImg.onerror = checkAll;
    this.uiImg.src = '/assets/IsometricTRPGAssetPack_UI.png';

    // 4. Map Indicators
    this.indicatorsImg = new Image();
    this.indicatorsImg.onload = checkAll;
    this.indicatorsImg.onerror = checkAll;
    this.indicatorsImg.src = '/assets/TRPGIsometricAssetPack_MapIndicators.png';
  }

  public onReady(callback: () => void) {
    if (this.isLoaded) {
      callback();
    } else {
      this.onLoadCallbacks.push(callback);
    }
  }

  // =========================================================================
  // 1. ENTITY SPRITES (Heroes, Monsters, Darklings, Bosses)
  // =========================================================================

  private getRowForEntity(key: string, isAction: boolean): number {
    const k = key.toLowerCase();

    // Heroes & Classes
    if (k.includes('warrior') || k.includes('knight') || k === 'hero' || k === 'player') {
      return isAction ? 1 : 0;
    }
    if (k.includes('cleric') || k.includes('monk') || k.includes('priest')) {
      return isAction ? 3 : 2;
    }
    if (k.includes('ranger') || k.includes('archer') || k.includes('hunter')) {
      return isAction ? 5 : 4;
    }
    if (k.includes('thief') || k.includes('rogue') || k.includes('ninja') || k.includes('assassin')) {
      return isAction ? 7 : 6;
    }
    if (k.includes('mage') || k.includes('wizard') || k.includes('warlock') || k.includes('alchemist')) {
      return isAction ? 7 : 6;
    }

    // Special Forms
    if (k.includes('darkling') || k.includes('shadow')) {
      return isAction ? 17 : 16;
    }
    if (k.includes('demon') || k.includes('overlord') || k.includes('boss') || k.includes('dragon')) {
      return isAction ? 21 : 20;
    }
    if (k.includes('cultist') || k.includes('necromancer')) {
      return isAction ? 19 : 18;
    }

    // Monsters
    if (k.includes('slime')) {
      return isAction ? 27 : 26;
    }
    if (k.includes('spider')) {
      return isAction ? 25 : 24;
    }
    if (k.includes('bat')) {
      return isAction ? 29 : 28;
    }
    if (k.includes('ghost') || k.includes('phantom') || k.includes('wraith')) {
      return isAction ? 31 : 30;
    }
    if (k.includes('skeleton')) {
      return isAction ? 23 : 22;
    }
    if (k.includes('shaman') || k.includes('goblin mage')) {
      return isAction ? 11 : 10;
    }
    if (k.includes('spear') || k.includes('guard')) {
      return isAction ? 13 : 12;
    }
    if (k.includes('goblin archer')) {
      return isAction ? 15 : 14;
    }
    if (k.includes('goblin')) {
      return isAction ? 9 : 8;
    }

    // Default to knight
    return isAction ? 1 : 0;
  }

  private getColForDirection(dir: IsoDirection): number {
    switch (dir) {
      case 'SW': return 0; // Front-Left
      case 'SE': return 1; // Front-Right
      case 'NW': return 2; // Back-Left
      case 'NE': return 3; // Back-Right
      default: return 0;
    }
  }

  /**
   * Returns a pixel-crisp scaled canvas of the TRPG entity sprite
   */
  public getEntitySprite(
    entityKey: string,
    dir: IsoDirection = 'SW',
    animState: CharacterAnimState = 'idle',
    frame: number = 0,
    targetWidth: number = 80,
    targetHeight: number = 85
  ): HTMLCanvasElement {
    const isAction = animState === 'attack' || animState === 'strike' || animState === 'magic' ||
      (animState === 'run' && frame % 2 === 1) ||
      (animState === 'victory' && frame % 2 === 1);

    const row = this.getRowForEntity(entityKey, isAction);
    const col = this.getColForDirection(dir);
    const cacheKey = `entity_${row}_${col}_${targetWidth}_${targetHeight}`;

    if (this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (this.entityImg && this.entityImg.complete && this.entityImg.naturalWidth > 0) {
      const srcW = 16;
      const srcH = 17;
      const sx = col * srcW;
      const sy = row * srcH;

      ctx.drawImage(
        this.entityImg,
        sx, sy, srcW, srcH,
        0, 0, targetWidth, targetHeight
      );
      this.canvasCache.set(cacheKey, canvas);
    }

    return canvas;
  }

  // =========================================================================
  // 2. ISOMETRIC TILES (Grass, Stone, Sand, Lava, Snow, Bridge, etc.)
  // =========================================================================

  public getTileSlice(tileType: string): SpriteSlice {
    const t = tileType.toLowerCase();
    if (t === 'grass' || t === 'plains') {
      return { sx: 16, sy: 0, sw: 16, sh: 17 };
    }
    if (t === 'dirt' || t === 'road') {
      return { sx: 0, sy: 0, sw: 16, sh: 17 };
    }
    if (t === 'stone' || t === 'cobble' || t === 'town') {
      return { sx: 32, sy: 0, sw: 16, sh: 17 };
    }
    if (t === 'sand' || t === 'desert' || t === 'vault') {
      return { sx: 48, sy: 0, sw: 16, sh: 17 };
    }
    if (t === 'water' || t === 'ice_floor') {
      return { sx: 64, sy: 0, sw: 16, sh: 17 };
    }
    if (t === 'snow') {
      return { sx: 0, sy: 35, sw: 16, sh: 16 };
    }
    if (t === 'ice') {
      return { sx: 16, sy: 35, sw: 16, sh: 16 };
    }
    if (t === 'lava' || t === 'magma' || t === 'dark_gate' || t === 'boss') {
      return { sx: 32, sy: 35, sw: 16, sh: 16 };
    }
    if (t === 'autumn') {
      return { sx: 48, sy: 35, sw: 16, sh: 16 };
    }
    if (t === 'swamp' || t === 'poison') {
      return { sx: 64, sy: 35, sw: 16, sh: 16 };
    }
    if (t === 'bridge') {
      return { sx: 128, sy: 123, sw: 16, sh: 13 };
    }
    if (t === 'castle_brick' || t === 'church') {
      return { sx: 32, sy: 137, sw: 16, sh: 16 };
    }

    // Default to grass block
    return { sx: 16, sy: 0, sw: 16, sh: 17 };
  }

  public getTileCanvas(tileType: string, targetWidth: number = 96, targetHeight: number = 102): HTMLCanvasElement {
    const cacheKey = `tile_${tileType}_${targetWidth}_${targetHeight}`;
    if (this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }

    const slice = this.getTileSlice(tileType);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (this.tilesImg && this.tilesImg.complete && this.tilesImg.naturalWidth > 0) {
      ctx.drawImage(
        this.tilesImg,
        slice.sx, slice.sy, slice.sw, slice.sh,
        0, 0, targetWidth, targetHeight
      );
      this.canvasCache.set(cacheKey, canvas);
    }

    return canvas;
  }

  // =========================================================================
  // 3. MAP INDICATORS (Diamonds, Movement Targets, Selection Rings)
  // =========================================================================

  public getIndicatorSlice(key: string): SpriteSlice {
    const k = key.toLowerCase();
    if (k.includes('green')) {
      return { sx: 0, sy: 0, sw: 16, sh: 8 };
    }
    if (k.includes('yellow')) {
      return { sx: 16, sy: 0, sw: 16, sh: 8 };
    }
    if (k.includes('red')) {
      return { sx: 0, sy: 8, sw: 16, sh: 8 };
    }
    if (k.includes('blue') || k.includes('cyan')) {
      return { sx: 16, sy: 8, sw: 16, sh: 8 };
    }
    if (k.includes('ring_cyan') || k.includes('ring_white')) {
      return { sx: 0, sy: 16, sw: 16, sh: 9 };
    }
    if (k.includes('ring_gold') || k.includes('ring_yellow')) {
      return { sx: 16, sy: 16, sw: 16, sh: 9 };
    }

    // Default to blue indicator diamond
    return { sx: 16, sy: 8, sw: 16, sh: 8 };
  }

  public getIndicatorCanvas(key: string, targetWidth: number = 64, targetHeight: number = 32): HTMLCanvasElement {
    const cacheKey = `ind_${key}_${targetWidth}_${targetHeight}`;
    if (this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }

    const slice = this.getIndicatorSlice(key);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (this.indicatorsImg && this.indicatorsImg.complete && this.indicatorsImg.naturalWidth > 0) {
      ctx.drawImage(
        this.indicatorsImg,
        slice.sx, slice.sy, slice.sw, slice.sh,
        0, 0, targetWidth, targetHeight
      );
      this.canvasCache.set(cacheKey, canvas);
    }

    return canvas;
  }

  // =========================================================================
  // 4. ENVIRONMENTAL PROPS (Rocks, Boulders, Pine Trees, Campfire, Crystals)
  // =========================================================================

  public getPropSlice(key: string): SpriteSlice {
    const k = key.toLowerCase();
    if (k === 'rock') return { sx: 128, sy: 0, sw: 16, sh: 17 };
    if (k === 'boulder') return { sx: 144, sy: 0, sw: 16, sh: 17 };
    if (k === 'grass_tuft') return { sx: 160, sy: 0, sw: 16, sh: 17 };
    if (k === 'flower') return { sx: 128, sy: 21, sw: 16, sh: 17 };
    if (k === 'campfire') return { sx: 144, sy: 21, sw: 16, sh: 17 };
    if (k === 'bonfire') return { sx: 160, sy: 21, sw: 16, sh: 17 };
    if (k === 'stump') return { sx: 128, sy: 35, sw: 16, sh: 17 };
    if (k === 'bush') return { sx: 144, sy: 35, sw: 16, sh: 17 };
    if (k === 'crystals') return { sx: 160, sy: 35, sw: 16, sh: 17 };
    if (k === 'pine_tree') return { sx: 160, sy: 56, sw: 16, sh: 29 };
    if (k === 'wood_post') return { sx: 128, sy: 56, sw: 16, sh: 29 };
    if (k === 'vine_post') return { sx: 144, sy: 56, sw: 16, sh: 29 };

    return { sx: 128, sy: 0, sw: 16, sh: 17 };
  }

  public getPropCanvas(key: string, targetWidth: number = 48, targetHeight: number = 51): HTMLCanvasElement {
    const cacheKey = `prop_${key}_${targetWidth}_${targetHeight}`;
    if (this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }

    const slice = this.getPropSlice(key);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (this.tilesImg && this.tilesImg.complete && this.tilesImg.naturalWidth > 0) {
      ctx.drawImage(
        this.tilesImg,
        slice.sx, slice.sy, slice.sw, slice.sh,
        0, 0, targetWidth, targetHeight
      );
      this.canvasCache.set(cacheKey, canvas);
    }

    return canvas;
  }

  // =========================================================================
  // 5. AUTHENTIC 2.5D ISOMETRIC BUILDINGS & LOCATION STRUCTURES
  // Assembled directly from Isometric_MedievalFantasy_Tiles.png & OutlinedEntities.png
  // =========================================================================
  public getLocationStructure(
    type: string,
    ownerColor: string | null = null,
    targetWidth: number = 80,
    targetHeight: number = 80
  ): HTMLCanvasElement {
    const cacheKey = `loc_${type}_${ownerColor || 'none'}_${targetWidth}_${targetHeight}`;
    if (this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (!this.tilesImg || !this.tilesImg.complete || this.tilesImg.naturalWidth === 0) {
      return canvas;
    }

    const img = this.tilesImg;
    const ent = this.entityImg;
    const cx = targetWidth / 2;
    const cy = targetHeight * 0.52;

    if (type === 'town' || type === 'capital') {
      // 1. Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, 34, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Center Castle Foundation (Stone masonry: 16, 136, 16, 17)
      ctx.drawImage(img, 16, 136, 16, 17, cx - 18, cy - 6, 36, 38);

      // 3. Left Watchtower
      ctx.drawImage(img, 16, 136, 16, 17, cx - 32, cy - 16, 20, 36);
      // Left Tower Battlements (112, 136, 16, 17)
      ctx.drawImage(img, 112, 136, 16, 17, cx - 32, cy - 28, 20, 20);

      // 4. Right Watchtower
      ctx.drawImage(img, 16, 136, 16, 17, cx + 12, cy - 16, 20, 36);
      // Right Tower Battlements
      ctx.drawImage(img, 112, 136, 16, 17, cx + 12, cy - 28, 20, 20);

      // 5. Central Ramparts & Battlements
      ctx.drawImage(img, 112, 136, 16, 17, cx - 14, cy - 20, 28, 20);

      // 6. Castle Gate / Portcullis (160, 136, 16, 17)
      ctx.drawImage(img, 160, 136, 16, 17, cx - 10, cy + 8, 20, 20);

      // 7. Flanking Wood Fences (160, 153, 16, 17)
      ctx.drawImage(img, 160, 153, 16, 17, cx - 36, cy + 10, 16, 16);
      ctx.drawImage(img, 160, 153, 16, 17, cx + 20, cy + 10, 16, 16);

      // 8. Owner Flagpole & Heraldry Banner
      ctx.strokeStyle = ownerColor || '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx, cy - 38);
      ctx.stroke();

      ctx.fillStyle = ownerColor || '#f59e0b';
      ctx.fillRect(cx, cy - 38, 14, 9);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 2, cy - 36, 4, 5);
    } else if (type === 'shop_item') {
      // 1. Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Red Brick Shop Walls (32, 136, 16, 17)
      ctx.drawImage(img, 32, 136, 16, 17, cx - 18, cy - 8, 36, 36);

      // 3. Timber Awning / Roof (Wooden bridge planking: 128, 123, 16, 13)
      ctx.drawImage(img, 128, 123, 16, 13, cx - 24, cy - 22, 48, 22);

      // 4. Shopkeeper Counter (Wood post: 128, 56, 16, 29)
      ctx.drawImage(img, 128, 56, 16, 29, cx - 12, cy + 6, 24, 18);

      // 5. Berry Bush & Herb Pot (144, 35, 16, 17)
      ctx.drawImage(img, 144, 35, 16, 17, cx + 14, cy + 4, 18, 18);
      // Red Flower barrel (128, 21, 16, 17)
      ctx.drawImage(img, 128, 21, 16, 17, cx - 28, cy + 8, 16, 16);

      // 6. Potion Badge
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy - 12, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧪', cx, cy - 8);
    } else if (type === 'shop_weapon') {
      // 1. Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dark Stone Armory Workshop (80, 136, 16, 17)
      ctx.drawImage(img, 80, 136, 16, 17, cx - 20, cy - 10, 40, 38);

      // 3. Castle battlements roof
      ctx.drawImage(img, 112, 136, 16, 17, cx - 22, cy - 24, 44, 20);

      // 4. Blazing Forge Hearth (Campfire 144, 21, 16, 17)
      ctx.drawImage(img, 144, 21, 16, 17, cx - 28, cy + 2, 22, 22);

      // 5. Stone Anvil (Boulder: 144, 0, 16, 17)
      ctx.drawImage(img, 144, 0, 16, 17, cx + 10, cy + 6, 20, 20);

      // 6. Sword Badge
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️', cx, cy - 10);
    } else if (type === 'shop_magic') {
      // 1. Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Arcane Sanctuary (80, 136, 16, 17)
      ctx.drawImage(img, 80, 136, 16, 17, cx - 18, cy - 10, 36, 38);

      // 3. Glowing Blue Crystals (160, 35, 16, 17)
      ctx.drawImage(img, 160, 35, 16, 17, cx - 32, cy - 2, 22, 24);
      ctx.drawImage(img, 160, 35, 16, 17, cx + 12, cy - 2, 22, 24);

      // 4. Arcane Spire Top
      ctx.drawImage(img, 160, 56, 16, 29, cx - 10, cy - 36, 20, 32);

      // 5. Magic Badge
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔮', cx, cy - 10);
    } else if (type === 'church') {
      // 1. Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Marble Sanctuary Nave (16, 136, 16, 17)
      ctx.drawImage(img, 16, 136, 16, 17, cx - 18, cy - 10, 36, 38);

      // 3. Church Spire (160, 56, 16, 29)
      ctx.drawImage(img, 160, 56, 16, 29, cx - 10, cy - 38, 20, 34);

      // 4. Holy Cross atop the steeple
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 42);
      ctx.lineTo(cx, cy - 32);
      ctx.moveTo(cx - 4, cy - 38);
      ctx.lineTo(cx + 4, cy - 38);
      ctx.stroke();

      // 5. Stained Glass Window
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy + 4, 6, Math.PI, 0);
      ctx.rect(cx - 6, cy + 4, 12, 10);
      ctx.fill();
    } else if (type === 'dark_gate') {
      // 1. Molten Magma Foundation (32, 35, 16, 16)
      ctx.drawImage(img, 32, 35, 16, 16, cx - 24, cy + 4, 48, 24);

      // 2. Obsidian Pillars (80, 136, 16, 17)
      ctx.drawImage(img, 80, 136, 16, 17, cx - 26, cy - 24, 16, 40);
      ctx.drawImage(img, 80, 136, 16, 17, cx + 10, cy - 24, 16, 40);

      // 3. Obsidian Arch
      ctx.drawImage(img, 112, 136, 16, 17, cx - 22, cy - 34, 44, 20);

      // 4. Dark Portal Eye / Vortex
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 6, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Shadow Sentry (From entities row 16)
      if (ent && ent.complete && ent.naturalWidth > 0) {
        ctx.drawImage(ent, 0, 16 * 17, 16, 17, cx - 12, cy - 2, 24, 26);
      }
    } else if (type === 'boss') {
      // 1. Scorched Caldera Base (32, 35, 16, 16)
      ctx.drawImage(img, 32, 35, 16, 16, cx - 28, cy + 4, 56, 26);

      // 2. Obsidian Fortress Citadel (80, 136, 16, 17)
      ctx.drawImage(img, 80, 136, 16, 17, cx - 22, cy - 14, 44, 40);

      // 3. Flaming Bonfires (160, 21, 16, 17)
      ctx.drawImage(img, 160, 21, 16, 17, cx - 36, cy + 4, 22, 22);
      ctx.drawImage(img, 160, 21, 16, 17, cx + 16, cy + 4, 22, 22);

      // 4. Demon Overlord atop the fortress (From entities row 20)
      if (ent && ent.complete && ent.naturalWidth > 0) {
        ctx.drawImage(ent, 0, 20 * 17, 16, 17, cx - 18, cy - 36, 36, 38);
      }
    } else if (type === 'vault') {
      // 1. Desert Sandstone Base (48, 0, 16, 17)
      ctx.drawImage(img, 48, 0, 16, 17, cx - 22, cy - 4, 44, 34);

      // 2. Sandstone wall (64, 136, 16, 17)
      ctx.drawImage(img, 64, 136, 16, 17, cx - 16, cy - 18, 32, 26);

      // 3. Shimmering Gold Chest
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 10, cy - 2, 20, 14);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 8, cy, 16, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 2, cy + 2, 4, 4);
    }

    this.canvasCache.set(cacheKey, canvas);
    return canvas;
  }

  // =========================================================================
  // 6. INTERACTIVE 2.5D TOWN PLAZA DIORAMA (Rendered in Town Modal)
  // =========================================================================
  public renderTownPlazaDiorama(
    canvas: HTMLCanvasElement,
    townName: string,
    townLevel: number,
    ownerColor: string | null
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Sky & Woodland Night Backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a1526');
    sky.addColorStop(0.5, '#1e293b');
    sky.addColorStop(1, '#0f172a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    if (!this.tilesImg || !this.tilesImg.complete || !this.entityImg || !this.entityImg.complete) {
      return;
    }

    const tiles = this.tilesImg;
    const ent = this.entityImg;

    // 2. Isometric Paved Town Plaza
    const tileW = 54;
    const tileH = 27;
    const startX = w / 2;
    const startY = h * 0.72;

    for (let r = -2; r <= 2; r++) {
      for (let c = -4; c <= 4; c++) {
        const tx = startX + (c - r) * (tileW / 2);
        const ty = startY + (c + r) * (tileH / 2);
        const isRoad = Math.abs(c) <= 1;
        const tileSrc = isRoad ? { sx: 32, sy: 0 } : { sx: 16, sy: 0 };
        ctx.drawImage(tiles, tileSrc.sx, tileSrc.sy, 16, 17, tx - tileW / 2, ty - tileH / 2, tileW, tileW * 1.06);
      }
    }

    // 3. Central Town Castle Citadel
    const castle = this.getLocationStructure('town', ownerColor, 120, 120);
    ctx.drawImage(castle, w * 0.48 - 60, h * 0.12, 120, 120);

    // 4. Left Side: Tavern Inn with Campfire
    ctx.drawImage(tiles, 144, 21, 16, 17, w * 0.18, h * 0.50, 36, 38); // campfire
    // Citizen sitting by campfire (Priest/Monk)
    ctx.drawImage(ent, 0, 2 * 17, 16, 17, w * 0.12, h * 0.40, 34, 36);
    // Pine Tree
    ctx.drawImage(tiles, 160, 56, 16, 29, w * 0.05, h * 0.22, 42, 70);

    // 5. Right Side: Apothecary Merchant & Town Guard
    ctx.drawImage(tiles, 144, 35, 16, 17, w * 0.76, h * 0.52, 34, 36); // berry bush
    // Knight town guard on patrol
    ctx.drawImage(ent, 16, 0, 16, 17, w * 0.82, h * 0.38, 38, 40); // knight facing SE
    // Archer guard
    ctx.drawImage(ent, 0, 4 * 17, 16, 17, w * 0.71, h * 0.35, 34, 36);

    // 6. Town Nameplate Ribbon
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = ownerColor || '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(14, 10, 210, 26, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ownerColor || '#fde047';
    ctx.font = 'bold 9px Silkscreen, sans-serif';
    ctx.fillText(`🏰 ${townName} (LV ${townLevel})`, 22, 26);
  }

  // =========================================================================
  // 7. INTERACTIVE 2.5D SHOP INTERIOR DIORAMA (Rendered in Shop Modal)
  // =========================================================================
  public renderShopInteriorDiorama(canvas: HTMLCanvasElement, shopType: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Cozy Shop Chamber Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#1e293b');
    bg.addColorStop(1, '#0b1120');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (!this.tilesImg || !this.tilesImg.complete || !this.entityImg || !this.entityImg.complete) {
      return;
    }

    const tiles = this.tilesImg;
    const ent = this.entityImg;

    // 2. Floor Tiles
    for (let x = 0; x < w; x += 32) {
      ctx.drawImage(tiles, 32, 0, 16, 17, x, h * 0.52, 32, 34);
    }

    if (shopType === 'shop_weapon') {
      // Ironforge Blacksmith:
      // Left Anvil & Forge Fire
      ctx.drawImage(tiles, 144, 21, 16, 17, 30, h * 0.32, 40, 42);
      // Armorer Knight behind counter
      ctx.drawImage(ent, 0, 1 * 17, 16, 17, w * 0.46, h * 0.15, 48, 51);
      // Racks of Swords & Armor
      ctx.drawImage(tiles, 80, 136, 16, 17, w * 0.78, h * 0.22, 40, 42);
      ctx.drawImage(tiles, 160, 153, 16, 17, w * 0.88, h * 0.32, 36, 38);
    } else if (shopType === 'shop_magic') {
      // Arcane Magic Emporium:
      // Glowing Crystal Spires on sides
      ctx.drawImage(tiles, 160, 35, 16, 17, 35, h * 0.25, 36, 40);
      ctx.drawImage(tiles, 160, 35, 16, 17, w * 0.84, h * 0.25, 36, 40);
      // Hooded Mage behind the arcane altar
      ctx.drawImage(ent, 0, 3 * 17, 16, 17, w * 0.46, h * 0.15, 48, 51);
    } else {
      // General Goods & Apothecary:
      // Herb bush & barrels on left
      ctx.drawImage(tiles, 144, 35, 16, 17, 35, h * 0.32, 36, 38);
      // Friendly Rogue Merchant behind counter
      ctx.drawImage(ent, 0, 6 * 17, 16, 17, w * 0.46, h * 0.15, 48, 51);
      // Flower barrel on right
      ctx.drawImage(tiles, 128, 21, 16, 17, w * 0.82, h * 0.32, 36, 38);
    }

    // Front Wooden Counter Countertop across the middle
    ctx.drawImage(tiles, 128, 123, 16, 13, w * 0.38, h * 0.52, 140, 28);
  }
}

export const trpgAssets = new TRPGAssetLoader();
