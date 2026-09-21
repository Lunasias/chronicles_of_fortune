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
    }

    this.canvasCache.set(cacheKey, canvas);
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
    }

    this.canvasCache.set(cacheKey, canvas);
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
    }

    this.canvasCache.set(cacheKey, canvas);
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
    }

    this.canvasCache.set(cacheKey, canvas);
    return canvas;
  }
}

export const trpgAssets = new TRPGAssetLoader();
