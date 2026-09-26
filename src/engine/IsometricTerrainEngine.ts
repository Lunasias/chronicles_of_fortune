import { BoardNode, BiomeType, RealmId } from '../game/BoardMap';
import { TimeOfDay } from '../game/EcosystemSystem';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { TERRAIN_BLIT_X, TERRAIN_BLIT_Y, TERRAIN_CLIFF_H } from './IsometricTerrainPainter';

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
  public getTileSprite(biome: BiomeType, hasCliffs: boolean, isNight: boolean): HTMLCanvasElement {
    return isometricTerrainRenderer.getTileSprite(biome, { cliffs: hasCliffs, night: isNight });
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
      const sprite = this.getTileSprite(tile.biome, hasCliffs, isNight);
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
    time: number
  ) {
    const props = this.environmentProps;
    const len = props.length;

    for (let i = 0; i < len; i++) {
      const prop = props[i];
      if (prop.x < minX - 32 || prop.x > maxX + 32 || prop.y < minY - 32 || prop.y > maxY + 32) {
        continue;
      }
      this.drawEnvironmentProp(ctx, prop, time);
    }
  }

  // =========================================================================
  // RENDER ENVIRONMENTAL CLUTTER PROPS (Rocks, Grass Tufts, Flowers, Shrubs)
  // =========================================================================
  public drawEnvironmentProp(
    ctx: CanvasRenderingContext2D,
    prop: EnvironmentProp,
    time: number
  ) {
    // Gentle wind sway animation for living vegetation props
    const windSway = (prop.type === 'grass' || prop.type === 'flower' || prop.type === 'shrub')
      ? Math.sin(time * 0.003 + prop.x * 0.05 + prop.y * 0.03) * 2.0
      : 0;

    const px = prop.x + windSway;
    const py = prop.y;

    switch (prop.type) {
      case 'rock':
        this.drawRockProp(ctx, px, py, prop.biome, prop.variant, prop.scale);
        break;

      case 'grass':
        this.drawGrassTuftProp(ctx, px, py, prop.biome, prop.variant, prop.scale);
        break;

      case 'flower':
        this.drawFlowerPatchProp(ctx, px, py, prop.biome, prop.variant, prop.scale);
        break;

      case 'shrub':
        this.drawShrubProp(ctx, px, py, prop.biome, prop.variant, prop.scale);
        break;

      case 'crystal':
        this.drawCrystalProp(ctx, px, py, prop.biome, time, prop.scale);
        break;
    }
  }

  // 1. ROCKS & BOULDERS (เธซเธดเธ)
  private drawRockProp(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    biome: BiomeType,
    variant: number,
    scale: number
  ) {
    const rw = (14 + variant * 3) * scale;
    const rh = (10 + variant * 2) * scale;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(px, py + 2, rw * 0.9, rh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock palette per biome
    let bodyColor = '#475569';
    let lightColor = '#94a3b8';
    let shadowColor = '#1e293b';

    if (biome === 'desert') {
      bodyColor = '#b45309';
      lightColor = '#f59e0b';
      shadowColor = '#78350f';
    } else if (biome === 'volcano') {
      bodyColor = '#18181b';
      lightColor = '#3f3f46';
      shadowColor = '#09090b';
    } else if (biome === 'snow') {
      bodyColor = '#475569';
      lightColor = '#cbd5e1';
      shadowColor = '#1e293b';
    } else if (biome === 'abyss') {
      bodyColor = '#3b0764';
      lightColor = '#7e22ce';
      shadowColor = '#16052b';
    }

    // Shaded Rock Body (Left shadow)
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(px - rw * 0.5, py);
    ctx.lineTo(px - rw * 0.3, py - rh);
    ctx.lineTo(px, py - rh * 1.1);
    ctx.lineTo(px, py + rh * 0.2);
    ctx.lineTo(px - rw * 0.5, py);
    ctx.closePath();
    ctx.fill();

    // Light Rock Body (Right facet)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(px, py - rh * 1.1);
    ctx.lineTo(px + rw * 0.4, py - rh * 0.8);
    ctx.lineTo(px + rw * 0.5, py);
    ctx.lineTo(px, py + rh * 0.2);
    ctx.closePath();
    ctx.fill();

    // Top Crest Highlight
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(px - rw * 0.2, py - rh * 0.9);
    ctx.lineTo(px, py - rh * 1.1);
    ctx.lineTo(px + rw * 0.25, py - rh * 0.85);
    ctx.lineTo(px, py - rh * 0.7);
    ctx.closePath();
    ctx.fill();

    // Moss / Snow cap on rock top
    if (biome === 'grass' || biome === 'forest') {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px - rw * 0.2, py - rh * 1.1, rw * 0.4, 2);
    } else if (biome === 'snow') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(px - rw * 0.25, py - rh * 1.1, rw * 0.5, 2.5);
    }
  }

  // 2. GRASS TUFTS (เธเธญเธซเธเนเธฒ 3D เธเธดเธเน€เธเธฅ)
  private drawGrassTuftProp(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    biome: BiomeType,
    variant: number,
    scale: number
  ) {
    let bladeColor = '#22c55e';
    let tipColor = '#86efac';

    if (biome === 'snow') {
      bladeColor = '#64748b';
      tipColor = '#f8fafc'; // Snow-dusted grass
    } else if (biome === 'desert') {
      bladeColor = '#ca8a04';
      tipColor = '#fef08a'; // Dry savannah grass
    } else if (biome === 'volcano') {
      bladeColor = '#78350f';
      tipColor = '#ea580c'; // Scorched grass
    } else if (biome === 'abyss') {
      bladeColor = '#581c87';
      tipColor = '#c084fc'; // Void tendril
    }

    const bh = (10 + variant * 2) * scale;

    ctx.fillStyle = bladeColor;
    // Blade 1 (Left slant)
    ctx.beginPath();
    ctx.moveTo(px - 6, py);
    ctx.lineTo(px - 10, py - bh);
    ctx.lineTo(px - 4, py);
    ctx.closePath();
    ctx.fill();

    // Blade 2 (Center tall)
    ctx.beginPath();
    ctx.moveTo(px - 3, py);
    ctx.lineTo(px, py - bh * 1.25);
    ctx.lineTo(px + 3, py);
    ctx.closePath();
    ctx.fill();

    // Blade 3 (Right slant)
    ctx.beginPath();
    ctx.moveTo(px + 1, py);
    ctx.lineTo(px + 8, py - bh * 0.9);
    ctx.lineTo(px + 5, py);
    ctx.closePath();
    ctx.fill();

    // Bright tip highlights
    ctx.fillStyle = tipColor;
    ctx.fillRect(px - 10, py - bh, 2, 2);
    ctx.fillRect(px - 1, py - bh * 1.25, 2, 3);
    ctx.fillRect(px + 7, py - bh * 0.9, 2, 2);
  }

  // 3. WILDFLOWER PATCHES (เนเธเธฅเธเธ”เธญเธเนเธกเนเธเนเธฒ)
  private drawFlowerPatchProp(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    biome: BiomeType,
    variant: number,
    scale: number
  ) {
    // Green leaves base
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(px, py, 8 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flower colors
    const colors = [
      '#ef4444', // Red poppy
      '#facc15', // Yellow buttercup
      '#38bdf8', // Bluebell
      '#f472b6'  // Pink rose
    ];
    const flowerColor = colors[variant % colors.length];

    // Flower 1
    ctx.fillStyle = flowerColor;
    ctx.beginPath();
    ctx.arc(px - 4 * scale, py - 5 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 4 * scale, py - 5 * scale, 1.5, 1.5);

    // Flower 2
    ctx.fillStyle = flowerColor;
    ctx.beginPath();
    ctx.arc(px + 4 * scale, py - 3 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Flower 3
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(px, py - 7 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. SHRUBS & BUSHES (เธเธธเนเธกเนเธกเน)
  private drawShrubProp(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    biome: BiomeType,
    variant: number,
    scale: number
  ) {
    const sw = (16 + variant * 3) * scale;
    const sh = (12 + variant * 2) * scale;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 2, sw * 0.8, sh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    let shrubBase = '#166534';
    let shrubMid = '#22c55e';
    let shrubTop = '#4ade80';

    if (biome === 'snow') {
      shrubBase = '#1e293b';
      shrubMid = '#475569';
      shrubTop = '#f8fafc'; // Snow-capped bush
    } else if (biome === 'desert') {
      shrubBase = '#78350f';
      shrubMid = '#b45309';
      shrubTop = '#d97706';
    } else if (biome === 'volcano') {
      shrubBase = '#18181b';
      shrubMid = '#450a0a';
      shrubTop = '#ea580c';
    } else if (biome === 'abyss') {
      shrubBase = '#2e1065';
      shrubMid = '#581c87';
      shrubTop = '#c084fc';
    }

    // Cluster 1 (Left)
    ctx.fillStyle = shrubBase;
    ctx.beginPath();
    ctx.arc(px - sw * 0.25, py - sh * 0.4, sw * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Cluster 2 (Right)
    ctx.beginPath();
    ctx.arc(px + sw * 0.25, py - sh * 0.4, sw * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Cluster 3 (Center High)
    ctx.fillStyle = shrubMid;
    ctx.beginPath();
    ctx.arc(px, py - sh * 0.6, sw * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Top Leaf Highlight
    ctx.fillStyle = shrubTop;
    ctx.fillRect(px - 3, py - sh * 0.8, 6, 3);
    ctx.fillRect(px + sw * 0.15, py - sh * 0.55, 4, 2);
  }

  // 5. MAGICAL CRYSTALS (เธเธฃเธดเธชเธ•เธฑเธฅเธเนเธณเนเธเนเธเธซเธฃเธทเธญเธญเน€เธงเธเธต)
  private drawCrystalProp(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    biome: BiomeType,
    time: number,
    scale: number
  ) {
    const ch = 18 * scale;
    const cw = 7 * scale;

    const isAbyss = biome === 'abyss';
    const mainColor = isAbyss ? '#a855f7' : '#38bdf8';
    const lightColor = isAbyss ? '#e879f9' : '#e0f2fe';
    const darkColor = isAbyss ? '#3b0764' : '#0369a1';

    // Crystal Shaded Left
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(px, py - ch);
    ctx.lineTo(px - cw, py - ch * 0.4);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    // Crystal Bright Right
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(px, py - ch);
    ctx.lineTo(px + cw, py - ch * 0.4);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    // Facet Highlight
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(px, py - ch);
    ctx.lineTo(px + cw * 0.3, py - ch * 0.5);
    ctx.lineTo(px, py - ch * 0.1);
    ctx.closePath();
    ctx.fill();

    // Glow Aura
    const glowAlpha = 0.25 + Math.sin(time * 0.004) * 0.12;
    ctx.fillStyle = isAbyss ? `rgba(168, 85, 247, ${glowAlpha})` : `rgba(56, 189, 248, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py - ch * 0.5, cw * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const isometricTerrainEngine = new IsometricTerrainEngine();
