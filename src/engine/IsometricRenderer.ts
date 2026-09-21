import { BoardNode } from '../game/BoardMap';
import { pixelSprites, IsoDirection, CharacterAnimState } from './PixelSpriteGenerator';
import { worldBackground } from './WorldBackground';
import { Player } from '../game/Player';

export interface Camera2D {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  zoom: number;
  targetZoom: number;
}

export class IsometricRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public tileWidth = 96;
  public tileHeight = 48;
  public elevationStep = 24;

  public camera: Camera2D = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    zoom: 1.0,
    targetZoom: 1.0
  };

  // Hover & Destination Selection
  public hoveredNodeId: number | null = null;
  public previewPathNodeIds: number[] = [];

  // Precomputed Static Board Cache for 60 FPS zero-allocation performance
  private nodeScreenCache = new Map<number, { x: number; y: number; depth: number }>();
  private roadwaySegments: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    roadColor: string;
    dashColor: string;
  }> = [];
  public hasInitializedBoardCache = false;
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }> = [];
  private dustPuffs: Array<{
    x: number;
    y: number;
    size: number;
    alpha: number;
  }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.initParticles();
  }

  private initParticles() {
    for (let i = 0; i < 110; i++) {
      this.particles.push({
        x: Math.random() * 3200 - 1600,
        y: Math.random() * 3200 - 1600,
        vx: -0.5 + Math.random() * 1.0,
        vy: 0.4 + Math.random() * 0.9,
        color: Math.random() > 0.5 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.3)',
        size: 2 + Math.random() * 3
      });
    }
  }

  // Convert isometric grid coordinates to screen pixel coordinates
  toScreen(gx: number, gy: number, gz: number): { x: number; y: number } {
    const x = (gx - gy) * (this.tileWidth / 2);
    const y = (gx + gy) * (this.tileHeight / 2) - gz * this.elevationStep;
    return { x, y };
  }

  // Initialize static board caches once to eliminate all runtime allocations
  public initBoardCache(nodes: BoardNode[]) {
    this.nodeScreenCache.clear();
    this.roadwaySegments = [];

    const nodeMap = new Map<number, BoardNode>();
    nodes.forEach(n => {
      nodeMap.set(n.id, n);
      const p = this.toScreen(n.gx, n.gy, n.gz);
      const depth = (n.gx + n.gy) * 1000 + n.gz * 100;
      this.nodeScreenCache.set(n.id, { x: p.x, y: p.y, depth });
    });

    nodes.forEach(node => {
      const p1 = this.nodeScreenCache.get(node.id)!;
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = nodeMap.get(nId);
          if (!target) return;
          const p2 = this.nodeScreenCache.get(nId)!;

          let roadColor = '#1e293b';
          if (node.biome === 'snow') roadColor = '#1e293b';
          else if (node.biome === 'volcano') roadColor = '#450a0a';
          else if (node.biome === 'desert') roadColor = '#451a03';
          else if (node.biome === 'forest') roadColor = '#052e16';
          else if (node.biome === 'cavern') roadColor = '#0f172a';
          else if (node.biome === 'coral') roadColor = '#083344';
          else if (node.biome === 'abyss') roadColor = '#2e1065';

          const dashColor = node.biome === 'volcano' ? '#f97316' : node.biome === 'abyss' ? '#a855f7' : '#94a3b8';
          this.roadwaySegments.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            roadColor,
            dashColor
          });
        }
      });
    });

    this.hasInitializedBoardCache = true;
  }

  // =========================================================================
  // ISOMETRIC RAYCASTING: Detect which tile was hovered or clicked
  // =========================================================================
  screenToNode(clientX: number, clientY: number, nodes: BoardNode[]): BoardNode | null {
    if (!this.hasInitializedBoardCache) {
      this.initBoardCache(nodes);
    }

    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    const worldX = (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
    const worldY = (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y;

    let closestNode: BoardNode | null = null;
    let minDistance = 99999;
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = this.nodeScreenCache.get(node.id);
      const nx = pos ? pos.x : (node.gx - node.gy) * hw;
      const ny = pos ? pos.y : (node.gx + node.gy) * hh - node.gz * this.elevationStep;

      const dx = Math.abs(worldX - nx);
      const dy = Math.abs(worldY - ny);
      const dist = dx / hw + dy / hh;

      if (dist <= 1.2 && dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    }

    return closestNode;
  }

  spawnFootstepDust(gx: number, gy: number, gz: number) {
    const p = this.toScreen(gx, gy, gz);
    this.dustPuffs.push({
      x: p.x + (Math.random() * 10 - 5),
      y: p.y + 10 + (Math.random() * 6 - 3),
      size: 4 + Math.random() * 4,
      alpha: 0.8
    });
  }

  render(
    nodes: BoardNode[],
    players: Player[],
    activePlayer: Player | null,
    highlightedNodes: number[] = [],
    previewPath: number[] = [],
    time: number = 0
  ) {
    if (!this.hasInitializedBoardCache) {
      this.initBoardCache(nodes);
    }

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.previewPathNodeIds = previewPath;

    // Fast, responsive 60 FPS camera interpolation
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.16;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.16;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.16;

    ctx.clearRect(0, 0, w, h);

    // 1. Dynamic Fantasy World Sky & Parallax Horizons
    worldBackground.renderSky(ctx, this.camera, w, h, time);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 2. World Space Atmosphere
    worldBackground.renderAtmosphere(ctx, this.camera, time);

    const halfW = (w / 2) / this.camera.zoom + 200;
    const halfH = (h / 2) / this.camera.zoom + 200;
    const minX = this.camera.x - halfW;
    const maxX = this.camera.x + halfW;
    const minY = this.camera.y - halfH;
    const maxY = this.camera.y + halfH;

    // 3. 2.5D Isometric Textured Roadways (O(1) zero-allocation lookup)
    this.renderIsometricRoads(ctx, minX, maxX, minY, maxY);

    // 4. Interactive Breadcrumb Stepping Stones for Previewed Path
    this.renderPathBreadcrumbs(ctx, nodes);

    // 5. Depth-Sorted Entities (Terrain Blocks, Buildings, Props, Characters)
    this.renderDepthSortedWorld(ctx, nodes, players, activePlayer, highlightedNodes, minX, maxX, minY, maxY, time);

    // 6. Running Dust Particles
    this.renderDustPuffs(ctx);

    // 7. Weather & Light Flares
    this.renderWeatherParticles(ctx);

    ctx.restore();
  }

  private renderIsometricRoads(
    ctx: CanvasRenderingContext2D,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ) {
    for (let i = 0; i < this.roadwaySegments.length; i++) {
      const seg = this.roadwaySegments[i];

      // View frustum culling
      if (
        Math.max(seg.x1, seg.x2) < minX ||
        Math.min(seg.x1, seg.x2) > maxX ||
        Math.max(seg.y1, seg.y2) < minY ||
        Math.min(seg.y1, seg.y2) > maxY
      ) {
        continue;
      }

      // Deep Road Trench Shadow
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1 + 14);
      ctx.lineTo(seg.x2, seg.y2 + 14);
      ctx.stroke();

      // Textured Cobblestone Body
      ctx.strokeStyle = seg.roadColor;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1 + 10);
      ctx.lineTo(seg.x2, seg.y2 + 10);
      ctx.stroke();

      // Paved center line flagstones
      ctx.strokeStyle = seg.dashColor;
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 12]);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1 + 10);
      ctx.lineTo(seg.x2, seg.y2 + 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private renderPathBreadcrumbs(ctx: CanvasRenderingContext2D, nodes: BoardNode[]) {
    if (this.previewPathNodeIds.length < 2) return;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    for (let idx = 0; idx < this.previewPathNodeIds.length; idx++) {
      const nodeId = this.previewPathNodeIds[idx];
      const p = this.nodeScreenCache.get(nodeId) || (nodes.find(n => n.id === nodeId) ? this.toScreen(nodes.find(n => n.id === nodeId)!.gx, nodes.find(n => n.id === nodeId)!.gy, nodes.find(n => n.id === nodeId)!.gz) : null);
      if (!p) continue;
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private renderDepthSortedWorld(
    ctx: CanvasRenderingContext2D,
    nodes: BoardNode[],
    players: Player[],
    activePlayer: Player | null,
    highlightedNodes: number[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    time: number
  ) {
    interface Renderable {
      depth: number;
      draw: () => void;
    }

    const renderList: Renderable[] = [];

    // 1. Add Isometric Blocks & Props within viewport
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos = this.nodeScreenCache.get(node.id);
      const px = pos ? pos.x : this.toScreen(node.gx, node.gy, node.gz).x;
      const py = pos ? pos.y : this.toScreen(node.gx, node.gy, node.gz).y;

      // View frustum culling
      if (px < minX - 120 || px > maxX + 120 || py < minY - 150 || py > maxY + 150) {
        continue;
      }

      const isHighlighted = highlightedNodes.includes(node.id);
      const isHovered = this.hoveredNodeId === node.id;
      const depth = pos ? pos.depth : (node.gx + node.gy) * 1000 + node.gz * 100;

      renderList.push({
        depth,
        draw: () => {
          this.drawIsometricBlock(ctx, px, py, node, isHighlighted, isHovered, time);
        }
      });

      // Buildings
      if (
        node.type === 'town' ||
        node.type === 'shop_item' ||
        node.type === 'shop_weapon' ||
        node.type === 'shop_magic' ||
        node.type === 'church' ||
        node.type === 'dark_gate' ||
        node.type === 'boss' ||
        node.type === 'vault'
      ) {
        renderList.push({
          depth: depth + 40,
          draw: () => {
            const ownerColor = node.townData?.ownerId
              ? players.find(pl => pl.id === node.townData!.ownerId)?.color || null
              : null;

            const bld = pixelSprites.getBuildingSprite(node.type, ownerColor);
            ctx.drawImage(bld, px - 48, py - 74, 96, 96);

            // Town crest & monster last-hit indicator
            if (node.type === 'town') {
              if (node.townData?.isOccupiedByMonster) {
                const curHp = node.townData.monsterHp;
                const maxHp = node.townData.monsterMaxHp || curHp;
                const hpPct = Math.max(0, Math.min(1, curHp / maxHp));
                const isWeakened = hpPct < 1.0;
                const badgeW = isWeakened ? 84 : 64;

                ctx.fillStyle = isWeakened ? 'rgba(69, 10, 10, 0.95)' : 'rgba(15, 23, 42, 0.9)';
                ctx.beginPath();
                ctx.roundRect(px - badgeW / 2, py - 80, badgeW, isWeakened ? 26 : 15, 4);
                ctx.fill();
                ctx.strokeStyle = isWeakened ? '#ef4444' : '#f59e0b';
                ctx.lineWidth = isWeakened ? 2.0 : 1.2;
                ctx.stroke();

                ctx.fillStyle = isWeakened ? '#fca5a5' : '#fbbf24';
                ctx.font = '7px Silkscreen';
                ctx.textAlign = 'center';
                ctx.fillText(isWeakened ? `💀 LAST HIT!` : `👾 MONSTER`, px, py - (isWeakened ? 70 : 69));

                if (isWeakened) {
                  const barW = badgeW - 12;
                  ctx.fillStyle = '#0f172a';
                  ctx.fillRect(px - barW / 2, py - 66, barW, 4);
                  ctx.fillStyle = hpPct < 0.35 ? '#ef4444' : '#f59e0b';
                  ctx.fillRect(px - barW / 2, py - 66, barW * hpPct, 4);

                  ctx.fillStyle = '#ffffff';
                  ctx.font = '6px Silkscreen';
                  ctx.fillText(`${curHp}/${maxHp}`, px, py - 58);
                }
              } else {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.beginPath();
                ctx.roundRect(px - 14, py - 74, 28, 14, 4);
                ctx.fill();
                ctx.strokeStyle = ownerColor || '#64748b';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = ownerColor || '#f8fafc';
                ctx.font = '8px Silkscreen';
                ctx.textAlign = 'center';
                ctx.fillText(`★${node.townData?.level || 1}`, px, py - 64);
              }

              // Full Town Banner ONLY appears when hovered or highlighted
              if (isHovered || isHighlighted) {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
                ctx.beginPath();
                ctx.roundRect(px - 52, py - 96, 104, 18, 4);
                ctx.fill();
                ctx.strokeStyle = isHighlighted ? '#00f0ff' : (ownerColor || '#f59e0b');
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = isHighlighted ? '#00f0ff' : (ownerColor || '#f59e0b');
                ctx.font = '8px Silkscreen';
                ctx.textAlign = 'center';
                ctx.fillText(`${node.name} (LV ${node.townData?.level || 1})`, px, py - 84);
              }
            } else if (node.type === 'boss') {
              ctx.fillStyle = 'rgba(69, 10, 10, 0.95)';
              ctx.beginPath();
              ctx.roundRect(px - 45, py - 82, 90, 16, 4);
              ctx.fill();
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = '#fca5a5';
              ctx.font = '7px Silkscreen';
              ctx.textAlign = 'center';
              ctx.fillText(`👑 DRAGON OVERLORD`, px, py - 71);
            }
          }
        });
      }

      // Foliage / Tree Props
      if (node.id % 2 === 0) {
        renderList.push({
          depth: depth + 20,
          draw: () => {
            const treeType =
              node.biome === 'snow'
                ? 'frost_pine'
                : node.biome === 'forest' || node.biome === 'abyss'
                ? 'gloom_spore'
                : node.biome === 'volcano' || node.biome === 'desert' || node.biome === 'cavern'
                ? 'ash_thorn'
                : 'blood_willow';
            const tree = pixelSprites.getTreeSprite(treeType, node.id % 4);
            ctx.drawImage(tree, px + 20, py - 68, 64, 84);
          }
        });
      }

      // Dark Fantasy Biome Props
      if (node.id % 3 === 0) {
        renderList.push({
          depth: depth + 15,
          draw: () => {
            this.drawDarkFantasyBiomeProp(ctx, px - 38, py - 42, node.biome, node.id, time);
          }
        });
      }
    }

    // 2. Add Animated Players
    players.forEach(player => {
      const p = this.toScreen(player.gridX, player.gridY, player.gridZ);

      renderList.push({
        depth: (player.gridX + player.gridY) * 1000 + player.gridZ * 100 + 80,
        draw: () => {
          this.drawPlayerCharacter(ctx, p.x, p.y, player, player === activePlayer, time);
        }
      });
    });

    // Sort by isometric depth
    renderList.sort((a, b) => a.depth - b.depth);
    renderList.forEach(item => item.draw());
  }

  // Draw 3D Isometric Tile Block with Authentic Isometric Tiles & Dokapon Node Plates
  private drawIsometricBlock(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    node: BoardNode,
    isHighlighted: boolean,
    isHovered: boolean,
    time: number
  ) {
    const hw = this.tileWidth / 2;
    const hh = this.tileHeight / 2;
    const blockHeight = 22;

    // Palette per space type
    let topColor = '#334155';
    let leftColor = '#1e293b';
    let rightColor = '#0f172a';
    let icon = '📍';

    if (node.type === 'town') {
      topColor = '#78350f';
      leftColor = '#451a03';
      rightColor = '#290e02';
      icon = '🏰';
    } else if (node.type === 'blue') {
      topColor = '#1d4ed8';
      leftColor = '#1e3a8a';
      rightColor = '#172554';
      icon = '🪙';
    } else if (node.type === 'red') {
      topColor = '#b91c1c';
      leftColor = '#7f1d1d';
      rightColor = '#450a0a';
      icon = '💀';
    } else if (node.type === 'shop_item') {
      topColor = '#15803d';
      leftColor = '#14532d';
      rightColor = '#052e16';
      icon = '🧪';
    } else if (node.type === 'shop_weapon') {
      topColor = '#c2410c';
      leftColor = '#9a3412';
      rightColor = '#431407';
      icon = '⚔️';
    } else if (node.type === 'shop_magic') {
      topColor = '#7e22ce';
      leftColor = '#581c87';
      rightColor = '#3b0764';
      icon = '🔮';
    } else if (node.type === 'church') {
      topColor = '#cbd5e1';
      leftColor = '#94a3b8';
      rightColor = '#64748b';
      icon = '✨';
    } else if (node.type === 'dark_gate') {
      topColor = '#4a044e';
      leftColor = '#2e1065';
      rightColor = '#180527';
      icon = '😈';
    } else if (node.type === 'vault') {
      topColor = '#d97706';
      leftColor = '#b45309';
      rightColor = '#78350f';
      icon = '🎁';
    } else if (node.type === 'boss') {
      topColor = '#450a0a';
      leftColor = '#200505';
      rightColor = '#100202';
      icon = '🐉';
    }

    // 0. 3D Cliff Pedestal for elevated spaces (gz > 0)
    if (node.gz > 0) {
      const drop = node.gz * this.elevationStep;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx, cy + hh + drop);
      ctx.lineTo(cx - hw, cy + drop);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(cx, cy + hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx + hw, cy + drop);
      ctx.lineTo(cx, cy + hh + drop);
      ctx.closePath();
      ctx.fill();
    }

    // 1. Draw Authentic 2.5D Isometric Terrain Slab
    const isoTerrain = pixelSprites.getTerrainBlock(node.biome, node.id, this.tileWidth, 64);
    ctx.drawImage(isoTerrain, cx - hw, cy - hh, this.tileWidth, 64);

    // 2. Dokapon Signature Node Medallion Plate in Center
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 22, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.95)' : isHighlighted ? 'rgba(0, 240, 255, 0.90)' : topColor;
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#38bdf8' : isHighlighted ? '#00f0ff' : '#f8fafc';
    ctx.lineWidth = isHovered ? 2.5 : isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    // 3. Space Type Icon
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy + 1);
    ctx.restore();

    // 4. Outer Diamond Border Highlight / Hover (Reachable Destination Spaces - Bright Cyan!)
    if (isHovered || isHighlighted) {
      const ringColor = isHovered ? '#fde047' : '#00f0ff';
      const fillGlow = isHovered ? 'rgba(251, 191, 36, 0.35)' : 'rgba(0, 240, 255, 0.40)';

      // Glowing pulsing tile footprint
      ctx.fillStyle = fillGlow;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.fill();

      // Sharp glowing border
      ctx.save();
      ctx.strokeStyle = ringColor;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = isHovered ? 3.5 : 3.0;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Floating Diamond Beacon above tile
      const floatY = Math.sin(time * 0.006) * 4;
      const beaconY = cy - hh - 18 + floatY;
      ctx.save();
      ctx.fillStyle = ringColor;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx, beaconY - 8);
      ctx.lineTo(cx + 6, beaconY);
      ctx.lineTo(cx, beaconY + 8);
      ctx.lineTo(cx - 6, beaconY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
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

  private drawDarkFantasyBiomeProp(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    biome: string,
    seed: number,
    time: number
  ) {
    ctx.save();
    if (biome === 'forest') {
      // Weeping Gloomwood: Gnarled black root with bioluminescent violet mushroom
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(px - 3, py - 18, 6, 20);
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(px, py - 20, 8, 0, Math.PI, true);
      ctx.fill();
      // Pixel mushroom cap spots
      ctx.fillStyle = '#f0abfc';
      ctx.fillRect(px - 4, py - 24, 2, 2);
      ctx.fillRect(px + 2, py - 23, 2, 2);
    } else if (biome === 'volcano') {
      // Brimstone Caldera: Obsidian chimney with glowing magma embers
      ctx.fillStyle = '#1c0407';
      ctx.fillRect(px - 6, py - 22, 12, 24);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(px - 4, py - 24, 8, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 2, py - 23, 4, 2);
    } else if (biome === 'snow') {
      // Frostbitten Crypts: Ice spire with frozen blue soul
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px - 4, py - 20, 8, 22);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(px, py - 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px - 2, py - 26, 3, 3);
    } else if (biome === 'desert') {
      // Blighted Dunes: Weathered sandstone tombstone / obelisk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px - 5, py - 26, 10, 28);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(px - 2, py - 22, 4, 18);
    } else if (biome === 'cavern') {
      // Netherforge / Catacombs: Black iron lantern on spike
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 2, py - 24, 4, 26);
      ctx.fillRect(px - 7, py - 26, 14, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px - 4, py - 22, 8, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 2, py - 20, 4, 4);
    } else if (biome === 'abyss') {
      // The Void: Levitating dark void crystal
      ctx.fillStyle = '#3b0764';
      this.drawDiamond(ctx, px, py - 24, 14, 22);
      ctx.fillStyle = '#c084fc';
      this.drawDiamond(ctx, px, py - 24, 8, 12);
    } else {
      // Ashen Kingdom: Ruined gothic headstone
      ctx.fillStyle = '#334155';
      ctx.fillRect(px - 6, py - 18, 12, 20);
      ctx.beginPath();
      ctx.arc(px, py - 18, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(px - 1, py - 16, 2, 10);
      ctx.fillRect(px - 4, py - 13, 8, 2);
    }
    ctx.restore();
  }

  private drawPlayerCharacter(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    player: Player,
    isActive: boolean,
    time: number
  ) {
    // 1. Soft Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(px, py + 8, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Active Player Halo
    if (isActive) {
      const pulse = Math.sin(time * 0.006) * 3;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 24 + pulse, 12 + pulse * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. 2.5D Isometric Dark Fantasy Hero Sprite
    const animState: CharacterAnimState = player.walkFrame > 0 ? 'run' : 'idle';
    const frame = player.walkFrame > 0 ? player.walkFrame : Math.floor(time * 0.003);

    const sprite = pixelSprites.getHeroSprite(
      player.classKey,
      player.facing,
      animState,
      frame,
      player.equipment,
      player.isDarkling,
      player.prank
    );
    ctx.drawImage(sprite, px - 48, py - 68, 96, 96);

    // 4. Name Tag
    ctx.fillStyle = '#030712';
    ctx.fillRect(px - 34, py - 78, 68, 16);
    ctx.strokeStyle = player.isDarkling ? '#c084fc' : player.color;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px - 34, py - 78, 68, 16);

    ctx.fillStyle = player.isDarkling ? '#f43f5e' : player.color;
    ctx.font = '8px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText(player.displayName.substring(0, 8), px, py - 66);
  }

  private renderDustPuffs(ctx: CanvasRenderingContext2D) {
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const d = this.dustPuffs[i];
      ctx.fillStyle = `rgba(203, 213, 225, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();

      d.size += 0.3;
      d.alpha -= 0.04;
      if (d.alpha <= 0) {
        this.dustPuffs.splice(i, 1);
      }
    }
  }

  private renderWeatherParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > 1600) p.y = -1600;
      if (p.x > 1600) p.x = -1600;
      if (p.x < -1600) p.x = 1600;

      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
  }

  centerCameraOn(gx: number, gy: number, gz: number) {
    const p = this.toScreen(gx, gy, gz);
    this.camera.targetX = p.x;
    this.camera.targetY = p.y;
  }

  // Smooth cinematic camera focus and zoom onto player at turn start
  focusOnPlayer(gx: number, gy: number, gz: number, zoom = 1.22) {
    const p = this.toScreen(gx, gy, gz);
    this.camera.targetX = p.x;
    this.camera.targetY = p.y;
    this.camera.targetZoom = zoom;
  }

  // Reset to default comfortable tactical board zoom
  resetTacticalZoom(targetZoom = 1.0) {
    this.camera.targetZoom = targetZoom;
  }
}
