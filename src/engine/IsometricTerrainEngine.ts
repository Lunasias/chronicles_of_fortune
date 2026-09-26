import { BoardNode, BiomeType, RealmId } from '../game/BoardMap';
import { TimeOfDay } from '../game/EcosystemSystem';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { TERRAIN_BLIT_X, TERRAIN_BLIT_Y, TERRAIN_CLIFF_H, TERRAIN_VARIANTS } from './IsometricTerrainPainter';
import { PROP_BASE_X, PROP_BASE_Y } from './IsometricPropPainter';

export interface TerrainTile {
  gx: number;
  gy: number;
  gz: number;
  x: number;
  y: number;
  depth: number;
  biome: BiomeType;
  realmId: RealmId;
  isEdge: boolean;
  hasSouthCliff: boolean;
  hasEastCliff: boolean;
  hasWestCliff: boolean;
  hasNorthCliff: boolean;
}

export interface EnvironmentProp {
  id: string;
  type: 'rock' | 'grass' | 'flower' | 'shrub' | 'crystal';
  gx: number;
  gy: number;
  gz: number;
  x: number;
  y: number;
  depth: number;
  biome: BiomeType;
  variant: number;
  scale: number;
}

export class IsometricTerrainEngine {
  public tileWidth = 96;
  public tileHeight = 48;
  public elevationStep = 24;

  public terrainTiles: TerrainTile[] = [];
  public environmentProps: EnvironmentProp[] = [];
  private tileGrid = new Map<string, TerrainTile>();
  public isInitialized = false;
  /**
   * World-space extent of the continent, in the board's own pixel coordinates. The background
   * uses it to place the cloud sea beneath the floating island.
   */
  public worldBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  // Spatial Grid Partitioning (Zero-lag Frustum Culling)
  public bucketSize = 400;
  public tileBuckets = new Map<string, TerrainTile[]>();
  public propBuckets = new Map<string, EnvironmentProp[]>();

  public getBucketKey(x: number, y: number): string {
    const bx = Math.floor(x / this.bucketSize);
    const by = Math.floor(y / this.bucketSize);
    return `${bx},${by}`;
  }

  public getVisibleTiles(minX: number, maxX: number, minY: number, maxY: number): TerrainTile[] {
    const minBX = Math.floor((minX - this.tileWidth) / this.bucketSize);
    const maxBX = Math.floor((maxX + this.tileWidth) / this.bucketSize);
    const minBY = Math.floor((minY - this.tileHeight * 2) / this.bucketSize);
    const maxBY = Math.floor((maxY + this.tileHeight * 2) / this.bucketSize);

    const visible: TerrainTile[] = [];
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        const bucket = this.tileBuckets.get(`${bx},${by}`);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            visible.push(bucket[i]);
          }
        }
      }
    }
    visible.sort((a, b) => a.depth - b.depth);
    return visible;
  }

  public getVisibleProps(minX: number, maxX: number, minY: number, maxY: number): EnvironmentProp[] {
    const minBX = Math.floor((minX - 100) / this.bucketSize);
    const maxBX = Math.floor((maxX + 100) / this.bucketSize);
    const minBY = Math.floor((minY - 100) / this.bucketSize);
    const maxBY = Math.floor((maxY + 100) / this.bucketSize);

    const visible: EnvironmentProp[] = [];
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        const bucket = this.propBuckets.get(`${bx},${by}`);
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            visible.push(bucket[i]);
          }
        }
      }
    }
    return visible;
  }

  // Convert isometric grid coordinates to screen pixel coordinates
  public toScreen(gx: number, gy: number, gz: number): { x: number; y: number } {
    const x = (gx - gy) * (this.tileWidth / 2);
    const y = (gx + gy) * (this.tileHeight / 2) - gz * this.elevationStep;
    return { x, y };
  }

  // =========================================================================
  // INITIALIZE TERRAIN & ENVIRONMENT MESH FROM BOARD NODES
  // =========================================================================
  public initTerrain(nodes: BoardNode[]) {
    this.terrainTiles = [];
    this.environmentProps = [];
    this.tileGrid.clear();

    const nodeMap = new Map<number, BoardNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const tempTileMap = new Map<string, { gx: number; gy: number; gz: number; biome: BiomeType; realmId: RealmId }>();

    const addCell = (gx: number, gy: number, gz: number, biome: BiomeType, realmId: RealmId) => {
      const key = `${gx},${gy}`;
      if (!tempTileMap.has(key)) {
        tempTileMap.set(key, { gx, gy, gz, biome, realmId });
      } else {
        // Keep highest elevation if overlap
        const existing = tempTileMap.get(key)!;
        if (gz > existing.gz) {
          existing.gz = gz;
        }
      }
    };

    // 1. Expand terrain around every board node (radius of 2 tiles for solid island ground)
    nodes.forEach(node => {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 3) {
            addCell(node.gx + dx, node.gy + dy, node.gz, node.biome, node.realmId);
          }
        }
      }
    });

    // 2. Expand terrain along roadway connections between neighboring nodes
    nodes.forEach(node => {
      node.neighbors.forEach(neighborId => {
        if (neighborId > node.id) {
          const neighbor = nodeMap.get(neighborId);
          if (!neighbor) return;

          const steps = Math.max(Math.abs(neighbor.gx - node.gx), Math.abs(neighbor.gy - node.gy)) * 2;
          for (let s = 0; s <= steps; s++) {
            const t = steps === 0 ? 0 : s / steps;
            const midGx = Math.round(node.gx + (neighbor.gx - node.gx) * t);
            const midGy = Math.round(node.gy + (neighbor.gy - node.gy) * t);
            const midGz = Math.round(node.gz + (neighbor.gz - node.gz) * t);
            const curBiome = t < 0.5 ? node.biome : neighbor.biome;
            const curRealm = t < 0.5 ? node.realmId : neighbor.realmId;

            // Smooth rounded road embankment buffer (ox, oy)
            for (let ox = -2; ox <= 2; ox++) {
              for (let oy = -2; oy <= 2; oy++) {
                if (Math.abs(ox) + Math.abs(oy) <= 3) {
                  addCell(midGx + ox, midGy + oy, midGz, curBiome, curRealm);
                }
              }
            }
          }
        }
      });
    });

    // 3. Build fast spatial lookup and determine cliff drops on terrain edges
    tempTileMap.forEach((cell, key) => {
      const pos = this.toScreen(cell.gx, cell.gy, cell.gz);
      const depth = (cell.gx + cell.gy) * 1000 + cell.gz * 100;

      // Check neighbor presence OR lower elevation for 3D cliff edges (eliminates see-through holes)
      const isCliffNeeded = (nx: number, ny: number) => {
        const neighbor = tempTileMap.get(`${nx},${ny}`);
        if (!neighbor) return true;
        return neighbor.gz < cell.gz;
      };

      const hasSouth = isCliffNeeded(cell.gx + 1, cell.gy + 1);
      const hasEast = isCliffNeeded(cell.gx + 1, cell.gy);
      const hasWest = isCliffNeeded(cell.gx, cell.gy + 1);
      const hasNorth = isCliffNeeded(cell.gx - 1, cell.gy - 1);

      const tile: TerrainTile = {
        gx: cell.gx,
        gy: cell.gy,
        gz: cell.gz,
        x: pos.x,
        y: pos.y,
        depth,
        biome: cell.biome,
        realmId: cell.realmId,
        isEdge: hasSouth || hasEast || hasWest || hasNorth,
        hasSouthCliff: hasSouth,
        hasEastCliff: hasEast,
        hasWestCliff: hasWest,
        hasNorthCliff: hasNorth
      };

      this.terrainTiles.push(tile);
      this.tileGrid.set(key, tile);
    });

    // Sort terrain tiles by depth for correct 3D overlap
    this.terrainTiles.sort((a, b) => a.depth - b.depth);

    // 4. Generate Environmental Clutter (Rocks, Grass, Wildflowers, Shrubs, Crystals)
    this.generateEnvironmentClutter(nodes);

    // 5. Index into Spatial Grid Buckets for O(visible) zero-lag rendering
    this.tileBuckets.clear();
    for (let i = 0; i < this.terrainTiles.length; i++) {
      const tile = this.terrainTiles[i];
      const key = this.getBucketKey(tile.x, tile.y);
      let list = this.tileBuckets.get(key);
      if (!list) {
        list = [];
        this.tileBuckets.set(key, list);
      }
      list.push(tile);
    }

    this.propBuckets.clear();
    for (let i = 0; i < this.environmentProps.length; i++) {
      const prop = this.environmentProps[i];
      const key = this.getBucketKey(prop.x, prop.y);
      let list = this.propBuckets.get(key);
      if (!list) {
        list = [];
        this.propBuckets.set(key, list);
      }
      list.push(prop);
    }

    // 6. World-space extent of the continent.
    // Computed once here rather than per frame, because the cloud sea under the board and the
    // floating-island shading both need it and both run every frame.
    this.worldBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    if (this.terrainTiles.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const tile of this.terrainTiles) {
        if (tile.x < minX) minX = tile.x;
        if (tile.x > maxX) maxX = tile.x;
        if (tile.y < minY) minY = tile.y;
        if (tile.y > maxY) maxY = tile.y;
      }
      // Half a tile of padding each side, so the outermost cliffs are inside the bounds.
      this.worldBounds = { minX: minX - 48, maxX: maxX + 48, minY: minY - 24, maxY: maxY + 24 };
    }

    this.isInitialized = true;
  }

  // Generate natural environment props (rocks, grass clumps, flowers) on off-road terrain
  private generateEnvironmentClutter(nodes: BoardNode[]) {
    const nodeCoords = new Set(nodes.map(n => `${n.gx},${n.gy}`));

    let propId = 0;
    this.terrainTiles.forEach(tile => {
      const isNodeCenter = nodeCoords.has(`${tile.gx},${tile.gy}`);
      // Don't clutter the exact node center where building/plate/hero stands
      if (isNodeCenter) return;

      // Deterministic pseudo-random seed from grid coordinates
      const seed = Math.sin(tile.gx * 12.9898 + tile.gy * 78.233) * 43758.5453;
      const rand1 = seed - Math.floor(seed);
      const rand2 = (seed * 1.5) - Math.floor(seed * 1.5);
      const rand3 = (seed * 2.3) - Math.floor(seed * 2.3);

      // Rich scattering of natural environment props (38% density on off-node terrain)
      if (rand1 < 0.38) {
        let type: EnvironmentProp['type'] = 'grass';
        if (rand2 < 0.30) {
          type = 'rock'; // Boulders and stones
        } else if (rand2 < 0.55) {
          type = 'flower'; // Flower patches
        } else if (rand2 < 0.78) {
          type = 'shrub'; // Bushes and shrubs
        } else if (rand2 < 0.92 && (tile.biome === 'snow' || tile.biome === 'abyss' || tile.biome === 'cavern')) {
          type = 'crystal'; // Magical ice or void crystal
        }

        // Sub-tile jitter for natural scattering
        const offsetX = (rand2 - 0.5) * 36;
        const offsetY = (rand3 - 0.5) * 18;

        this.environmentProps.push({
          id: `env_prop_${propId++}`,
          type,
          gx: tile.gx,
          gy: tile.gy,
          gz: tile.gz,
          x: tile.x + offsetX,
          y: tile.y + offsetY,
          depth: tile.depth + 15,
          biome: tile.biome,
          variant: Math.floor(rand3 * 4),
          scale: 0.85 + rand1 * 0.35
        });
      }
    });

    // Depth sort environment props
    this.environmentProps.sort((a, b) => a.depth - b.depth);
  }

  // =========================================================================
  // PIXEL-ART TILE SPRITE CACHE (60 FPS Hardware Blitting)
  // =========================================================================
  /**
   * The pixel-art tile sprite.
   *
   * The geometry (96x48 tile, 18px cliffs) lives in `IsometricTerrainPainter`, which paints a
   * plain RGBA buffer with no DOM access so the same art can be exported to PNG and re-painted
   * byte-for-byte in a test. This method is only the biome/cliff/night lookup.
   */
  public getTileSprite(biome: BiomeType, hasCliffs: boolean, isNight: boolean, variant = 0): HTMLCanvasElement {
    return isometricTerrainRenderer.getTileSprite(biome, { cliffs: hasCliffs, night: isNight, variant });
  }

  // =========================================================================
  // RENDER TERRAIN CONTINENT GROUND MESH (Zero-Allocation 60 FPS GPU Blitting)
  // =========================================================================
  public renderGround(
    ctx: CanvasRenderingContext2D,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    const isNight = timeOfDay === 'NIGHT';
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const cliffHeight = TERRAIN_CLIFF_H;
    const bob = Math.round(Math.sin(time * 0.003) * 1.5);

    // Direct iteration over pre-sorted terrainTiles with zero allocations!
    const tiles = this.terrainTiles;
    const len = tiles.length;

    for (let i = 0; i < len; i++) {
      const tile = tiles[i];
      // Frustum culling check
      if (tile.x < minX - 56 || tile.x > maxX + 56 || tile.y < minY - 32 || tile.y > maxY + 60) {
        continue;
      }

      // Shoreline ocean foam waves around perimeter cliffs
      if (tile.isEdge) {
        this.drawShoreWave(ctx, tile.x, tile.y + cliffHeight + 11 + bob, hw, hh, isNight, time);
      }

      // Zero-lag hardware GPU texture blit. The offset is the painter's own geometry, so the
      // rhombus centre lands exactly on the tile's world position.
      const hasCliffs = tile.hasSouthCliff || tile.hasWestCliff || tile.hasEastCliff;
      // Detail variant from the grid position, so neighbouring tiles scatter differently instead
      // of showing the same grass tuft in a perfect grid. The multiplier pair is coprime with the
      // variant count, which spreads the four layouts evenly rather than banding them by row.
      const variant =
        (((tile.gx * 7 + tile.gy * 13) % TERRAIN_VARIANTS) + TERRAIN_VARIANTS) % TERRAIN_VARIANTS;
      const sprite = this.getTileSprite(tile.biome, hasCliffs, isNight, variant);
      ctx.drawImage(sprite, tile.x - TERRAIN_BLIT_X, tile.y - TERRAIN_BLIT_Y);
    }
  }

  /**
   * A 2:1 isometric ring drawn as integer 2x1 blocks.
   *
   * `ctx.ellipse` antialiases, which made the surf the one soft-edged thing on an otherwise
   * hard-edged board. Scanning x and plotting the two arcs per column, rounded to whole pixels,
   * gives the same shape with crisp edges. `phase` scrolls a dash pattern through the ring so the
   * crest reads as advancing surf instead of as a drawn circle.
   */
  private isoRing(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string,
    thickness: number,
    phase: number,
    dashed: boolean
  ): void {
    ctx.fillStyle = color;
    const x0 = Math.round(cx - rx);
    const x1 = Math.round(cx + rx);
    for (let x = x0; x <= x1; x += thickness) {
      const t = (x - cx) / rx;
      if (t < -1 || t > 1) continue;
      if (dashed && (Math.floor((x - x0) / thickness) + Math.round(phase)) % 6 < 2) continue;
      const dy = ry * Math.sqrt(Math.max(0, 1 - t * t));
      ctx.fillRect(x, Math.round(cy - dy), thickness, 1);
      ctx.fillRect(x, Math.round(cy + dy), thickness, 1);
    }
  }

  private drawShoreWave(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    isNight: boolean,
    time: number
  ) {
    // Two quantised halo rings: a wider, fainter one behind a tighter, stronger one. Reading as
    // a falloff without a gradient.
    this.isoRing(ctx, cx, cy, hw + 16, hh + 9, isNight ? 'rgba(8, 47, 73, 0.22)' : 'rgba(14, 165, 233, 0.16)', 2, 0, false);
    this.isoRing(ctx, cx, cy, hw + 11, hh + 6, isNight ? 'rgba(8, 47, 73, 0.34)' : 'rgba(14, 165, 233, 0.26)', 2, 0, false);
    // The surf itself: a dashed crest scrolling outward from the cliff foot.
    this.isoRing(
      ctx,
      cx,
      cy,
      hw + 8,
      hh + 5,
      isNight ? 'rgba(186, 230, 253, 0.42)' : 'rgba(240, 249, 255, 0.62)',
      2,
      (time * 0.02) % 6,
      true
    );
  }

  // =========================================================================
  // RENDER ENVIRONMENTAL CLUTTER (Zero-Sort Ground Pass)
  // =========================================================================
  public renderClutter(
    ctx: CanvasRenderingContext2D,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    const night = timeOfDay === 'NIGHT';
    const props = this.environmentProps;
    const len = props.length;

    for (let i = 0; i < len; i++) {
      const prop = props[i];
      if (prop.x < minX - 32 || prop.x > maxX + 32 || prop.y < minY - 32 || prop.y > maxY + 32) {
        continue;
      }
      this.drawEnvironmentProp(ctx, prop, time, night);
    }
  }

  // =========================================================================
  // RENDER ENVIRONMENTAL CLUTTER PROPS (Rocks, Grass Tufts, Flowers, Shrubs, Crystals)
  // =========================================================================
  /**
   * Blits one piece of floor clutter from the pixel-art cache.
   *
   * The sway is rounded to whole pixels: the sprite is drawn 1:1 with smoothing disabled, so a
   * fractional offset would make the prop shimmer between two pixel grids instead of swaying.
   */
  public drawEnvironmentProp(
    ctx: CanvasRenderingContext2D,
    prop: EnvironmentProp,
    time: number,
    night: boolean
  ) {
    const living = prop.type === 'grass' || prop.type === 'flower' || prop.type === 'shrub';
    const sway = living ? Math.round(Math.sin(time * 0.003 + prop.x * 0.05 + prop.y * 0.03) * 2) : 0;

    const sprite = isometricTerrainRenderer.getPropSprite(prop.type, {
      biome: prop.biome,
      variant: prop.variant,
      size: prop.scale,
      night,
      // The crystal shimmer cycles through four baked frames rather than fading the sprite, so
      // it stays hard-edged like the rest of the art.
      pulse: prop.type === 'crystal' ? Math.floor(time * 0.004 + prop.x * 0.01) : 0
    });
    ctx.drawImage(sprite, prop.x + sway - PROP_BASE_X, prop.y - PROP_BASE_Y);
  }
}

export const isometricTerrainEngine = new IsometricTerrainEngine();
