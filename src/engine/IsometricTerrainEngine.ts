import { BoardNode, BiomeType, RealmId } from '../game/BoardMap';
import { TimeOfDay } from '../game/EcosystemSystem';

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

            // 3-wide road embankment buffer (ox, oy in -1 to +1)
            for (let ox = -1; ox <= 1; ox++) {
              for (let oy = -1; oy <= 1; oy++) {
                addCell(midGx + ox, midGy + oy, midGz, curBiome, curRealm);
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

      // Check neighbor presence for 3D cliff edges
      const hasSouth = !tempTileMap.has(`${cell.gx + 1},${cell.gy + 1}`);
      const hasEast = !tempTileMap.has(`${cell.gx + 1},${cell.gy}`);
      const hasWest = !tempTileMap.has(`${cell.gx},${cell.gy + 1}`);
      const hasNorth = !tempTileMap.has(`${cell.gx - 1},${cell.gy - 1}`);

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
  // RENDER TERRAIN CONTINENT GROUND MESH
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
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const cliffHeight = 18;

    // Zero-lag Frustum Query using Spatial Grid Buckets (~150-300 visible tiles only)
    const visibleTiles = this.getVisibleTiles(minX, maxX, minY, maxY);

    for (let i = 0; i < visibleTiles.length; i++) {
      this.drawTerrainTile(ctx, visibleTiles[i], hw, hh, cliffHeight, time, timeOfDay);
    }
  }

  // Draw an individual 3D isometric terrain block with biome textures, living ocean shore, and cliff drops
  private drawTerrainTile(
    ctx: CanvasRenderingContext2D,
    tile: TerrainTile,
    hw: number,
    hh: number,
    cliffHeight: number,
    time: number,
    timeOfDay: TimeOfDay
  ) {
    const cx = tile.x;
    const cy = tile.y;

    const colors = this.getBiomeColors(tile.biome, timeOfDay);

    // 0. Living ocean shoreline foam & waves around perimeter cliffs
    if (tile.isEdge) {
      const wave = Math.sin(time * 0.003 + tile.gx * 1.8 + tile.gy * 1.2) * 2.8;
      ctx.save();
      // Translucent turquoise/deep ocean body
      ctx.fillStyle = timeOfDay === 'NIGHT' ? 'rgba(8, 47, 73, 0.35)' : 'rgba(14, 165, 233, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + cliffHeight + 11 + wave, hw + 14, hh + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Frothy white shoreline wave crest
      ctx.strokeStyle = timeOfDay === 'NIGHT' ? 'rgba(186, 230, 253, 0.35)' : 'rgba(240, 249, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy + cliffHeight + 11 + wave, hw + 10, hh + 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 1. 3D Cliff Faces (rendered on exposed edges)
    if (tile.hasSouthCliff || tile.hasWestCliff || tile.hasEastCliff) {
      // Left 3D Face
      ctx.fillStyle = colors.cliffLeft;
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx, cy + hh + cliffHeight);
      ctx.lineTo(cx - hw, cy + cliffHeight);
      ctx.closePath();
      ctx.fill();

      // Right 3D Face
      ctx.fillStyle = colors.cliffRight;
      ctx.beginPath();
      ctx.moveTo(cx, cy + hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx + hw, cy + cliffHeight);
      ctx.lineTo(cx, cy + hh + cliffHeight);
      ctx.closePath();
      ctx.fill();

      // Cliff base shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy + cliffHeight);
      ctx.lineTo(cx, cy + hh + cliffHeight);
      ctx.lineTo(cx + hw, cy + cliffHeight);
      ctx.lineTo(cx, cy + hh + cliffHeight + 6);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Isometric Diamond Top Face
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // 3. Biome-Specific Ground Surface Details
    this.drawBiomeSurfaceDetails(ctx, cx, cy, hw, hh, tile.biome, time, colors);

    // 4. Subtle Border Contour
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  // Get color palette for each biome adapted for day/night
  private getBiomeColors(biome: BiomeType, timeOfDay: TimeOfDay): {
    top: string;
    accent: string;
    cliffLeft: string;
    cliffRight: string;
    border: string;
  } {
    const isNight = timeOfDay === 'NIGHT';

    switch (biome) {
      case 'grass':
        // Solaria rolling green grasslands
        return {
          top: isNight ? '#144322' : '#22c55e',
          accent: isNight ? '#166534' : '#4ade80',
          cliffLeft: isNight ? '#1c1917' : '#573318',
          cliffRight: isNight ? '#292524' : '#78350f',
          border: isNight ? '#166534' : '#15803d'
        };

      case 'forest':
        // Deep mossy Gloomwood forest
        return {
          top: isNight ? '#0b2b18' : '#15803d',
          accent: isNight ? '#14532d' : '#22c55e',
          cliffLeft: isNight ? '#111827' : '#3d2514',
          cliffRight: isNight ? '#1f2937' : '#573318',
          border: isNight ? '#14532d' : '#166534'
        };

      case 'snow':
        // Frostpeak glacial tundra & snowy crags
        return {
          top: isNight ? '#1e293b' : '#f1f5f9',
          accent: isNight ? '#38bdf8' : '#e0f2fe',
          cliffLeft: isNight ? '#090d16' : '#64748b',
          cliffRight: isNight ? '#0f172a' : '#94a3b8',
          border: isNight ? '#38bdf8' : '#cbd5e1'
        };

      case 'desert':
        // Sunfire golden sand dunes
        return {
          top: isNight ? '#3f2512' : '#f59e0b',
          accent: isNight ? '#78350f' : '#fef08a',
          cliffLeft: isNight ? '#261205' : '#78350f',
          cliffRight: isNight ? '#451a03' : '#9a3412',
          border: isNight ? '#78350f' : '#d97706'
        };

      case 'volcano':
        // Sunfire scorched basalt & glowing magma cracks
        return {
          top: isNight ? '#18181b' : '#27272a',
          accent: '#ea580c',
          cliffLeft: '#09090b',
          cliffRight: '#18181b',
          border: '#450a0a'
        };

      case 'cavern':
        // Subterranean slate & mineral stone
        return {
          top: isNight ? '#0f172a' : '#334155',
          accent: isNight ? '#38bdf8' : '#64748b',
          cliffLeft: '#090d16',
          cliffRight: '#1e293b',
          border: '#1e293b'
        };

      case 'coral':
        // Shallow turquoise reef waters
        return {
          top: isNight ? '#083344' : '#06b6d4',
          accent: isNight ? '#0e7490' : '#67e8f9',
          cliffLeft: '#042f2e',
          cliffRight: '#0d9488',
          border: '#0891b2'
        };

      case 'abyss':
      default:
        // Cursed void obsidian with arcane violet veins
        return {
          top: isNight ? '#150624' : '#2e1065',
          accent: '#c084fc',
          cliffLeft: '#090214',
          cliffRight: '#180527',
          border: '#581c87'
        };
    }
  }

  // Draw natural surface texture lines / speckles on top face
  private drawBiomeSurfaceDetails(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    biome: BiomeType,
    time: number,
    colors: ReturnType<IsometricTerrainEngine['getBiomeColors']>
  ) {
    ctx.save();

    if (biome === 'grass' || biome === 'forest') {
      // Grass blade speckles & earth specks
      ctx.fillStyle = colors.accent;
      ctx.fillRect(cx - 14, cy - 6, 4, 2);
      ctx.fillRect(cx + 10, cy + 4, 5, 2);
      ctx.fillRect(cx - 4, cy + 8, 4, 2);
      ctx.fillRect(cx + 18, cy - 8, 3, 2);
    } else if (biome === 'snow') {
      // Snowdrift ripple highlights & ice sparkle
      ctx.fillStyle = colors.accent;
      ctx.fillRect(cx - 18, cy - 4, 8, 2);
      ctx.fillRect(cx + 6, cy + 6, 10, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 2, cy - 8, 2, 2);
      ctx.fillRect(cx + 14, cy - 2, 2, 2);
    } else if (biome === 'desert') {
      // Wind-blown sand ripples
      ctx.fillStyle = colors.accent;
      ctx.fillRect(cx - 20, cy - 4, 12, 1.5);
      ctx.fillRect(cx - 6, cy + 4, 16, 1.5);
      ctx.fillRect(cx + 8, cy - 8, 10, 1.5);
    } else if (biome === 'volcano') {
      // Glowing magma fissures
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 4);
      ctx.lineTo(cx - 4, cy + 2);
      ctx.lineTo(cx + 12, cy - 2);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 4, cy + 1, 3, 2);
    } else if (biome === 'abyss') {
      // Pulsing arcane rune veins
      const pulse = 0.5 + Math.sin(time * 0.003) * 0.3;
      ctx.strokeStyle = `rgba(192, 132, 252, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.lineTo(cx, cy - 6);
      ctx.lineTo(cx + 14, cy + 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // RENDER ENVIRONMENTAL CLUTTER PROPS (Rocks, Grass Tufts, Flowers, Shrubs)
  // =========================================================================
  public drawEnvironmentProp(
    ctx: CanvasRenderingContext2D,
    prop: EnvironmentProp,
    time: number
  ) {
    ctx.save();
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

    ctx.restore();
  }

  // 1. ROCKS & BOULDERS (หิน)
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

  // 2. GRASS TUFTS (กอหญ้า 3D พิกเซล)
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

  // 3. WILDFLOWER PATCHES (แปลงดอกไม้ป่า)
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

  // 4. SHRUBS & BUSHES (พุ่มไม้)
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

  // 5. MAGICAL CRYSTALS (คริสตัลน้ำแข็งหรืออเวจี)
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
