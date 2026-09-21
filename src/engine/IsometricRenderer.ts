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

  // Weather & Dust Particles
  private particles: Array<{ x: number; y: number; vx: number; vy: number; color: string; size: number }> = [];
  private dustPuffs: Array<{ x: number; y: number; size: number; alpha: number }> = [];

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

  // =========================================================================
  // ISOMETRIC RAYCASTING: Detect which tile was hovered or clicked
  // =========================================================================
  screenToNode(clientX: number, clientY: number, nodes: BoardNode[]): BoardNode | null {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    // Convert from screen viewport to world coordinate
    const worldX = (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
    const worldY = (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y;

    let closestNode: BoardNode | null = null;
    let minDistance = 99999;

    nodes.forEach(node => {
      const p = this.toScreen(node.gx, node.gy, node.gz);
      // Rhombus test
      const dx = Math.abs(worldX - p.x);
      const dy = Math.abs(worldY - p.y);
      const dist = (dx / (this.tileWidth / 2)) + (dy / (this.tileHeight / 2));

      if (dist <= 1.2 && dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    });

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
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.previewPathNodeIds = previewPath;

    // Smooth camera interpolation
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.08;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.08;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;

    ctx.clearRect(0, 0, w, h);

    // 1. Dynamic Fantasy World Sky & Parallax Horizons (No more dark void!)
    worldBackground.renderSky(ctx, this.camera, w, h, time);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 2. World Space Atmosphere (Volumetric Clouds, Birds, Motes)
    worldBackground.renderAtmosphere(ctx, this.camera, time);

    // View frustum boundaries for smooth culling
    const halfW = (w / 2) / this.camera.zoom + 200;
    const halfH = (h / 2) / this.camera.zoom + 200;
    const minX = this.camera.x - halfW;
    const maxX = this.camera.x + halfW;
    const minY = this.camera.y - halfH;
    const maxY = this.camera.y + halfH;

    // Filter visible nodes within viewport
    const visibleNodes = nodes.filter(node => {
      const p = this.toScreen(node.gx, node.gy, node.gz);
      return p.x >= minX - 100 && p.x <= maxX + 100 && p.y >= minY - 150 && p.y <= maxY + 150;
    });

    // 2. 2.5D Isometric Textured Roadways
    this.renderIsometricRoads(ctx, nodes, minX, maxX, minY, maxY);

    // 3. Interactive Breadcrumb Stepping Stones for Previewed Path
    this.renderPathBreadcrumbs(ctx, nodes);

    // 4. Depth-Sorted Entities (Terrain Blocks, Buildings, Props, Characters)
    this.renderDepthSortedWorld(ctx, visibleNodes, players, activePlayer, highlightedNodes, time);

    // 5. Running Dust Particles
    this.renderDustPuffs(ctx);

    // 6. Weather & Light Flares
    this.renderWeatherParticles(ctx);

    ctx.restore();
  }


  private renderIsometricRoads(
    ctx: CanvasRenderingContext2D,
    nodes: BoardNode[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ) {
    nodes.forEach(node => {
      const p1 = this.toScreen(node.gx, node.gy, node.gz);

      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = nodes.find(n => n.id === nId);
          if (!target) return;
          const p2 = this.toScreen(target.gx, target.gy, target.gz);

          // Culling check
          if (
            Math.max(p1.x, p2.x) < minX ||
            Math.min(p1.x, p2.x) > maxX ||
            Math.max(p1.y, p2.y) < minY ||
            Math.min(p1.y, p2.y) > maxY
          ) {
            return;
          }

          // Deep Road Trench Shadow
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 20;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y + 14);
          ctx.lineTo(p2.x, p2.y + 14);
          ctx.stroke();

          // Textured Cobblestone Body with Dark Fantasy Province Tint
          let roadColor = '#1e293b';
          if (node.biome === 'snow') roadColor = '#1e293b'; // Black ice road
          else if (node.biome === 'volcano') roadColor = '#450a0a'; // Scorched obsidian fissure
          else if (node.biome === 'desert') roadColor = '#451a03'; // Blighted sand path
          else if (node.biome === 'forest') roadColor = '#052e16'; // Gloomwood thorn road
          else if (node.biome === 'cavern') roadColor = '#0f172a'; // Deep catacomb iron track
          else if (node.biome === 'coral') roadColor = '#083344'; // Drowned reef abyss road
          else if (node.biome === 'abyss') roadColor = '#2e1065'; // Void bone bridge

          ctx.strokeStyle = roadColor;
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y + 10);
          ctx.lineTo(p2.x, p2.y + 10);
          ctx.stroke();

          // Paved center line flagstones with dark fantasy runic glow
          ctx.strokeStyle = node.biome === 'volcano' ? '#f97316' : node.biome === 'abyss' ? '#a855f7' : '#94a3b8';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 12]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y + 10);
          ctx.lineTo(p2.x, p2.y + 10);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });
  }

  private renderPathBreadcrumbs(ctx: CanvasRenderingContext2D, nodes: BoardNode[]) {
    if (this.previewPathNodeIds.length < 2) return;

    // Glowing cyan / gold stepping beam along chosen path
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    this.previewPathNodeIds.forEach((nodeId, idx) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const p = this.toScreen(node.gx, node.gy, node.gz);
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    ctx.shadowBlur = 0; // Reset
  }

  private renderDepthSortedWorld(
    ctx: CanvasRenderingContext2D,
    nodes: BoardNode[],
    players: Player[],
    activePlayer: Player | null,
    highlightedNodes: number[],
    time: number
  ) {
    interface Renderable {
      depth: number;
      draw: () => void;
    }

    const renderList: Renderable[] = [];

    // 1. Add Isometric Blocks
    nodes.forEach(node => {
      const p = this.toScreen(node.gx, node.gy, node.gz);
      const isHighlighted = highlightedNodes.includes(node.id);
      const isHovered = this.hoveredNodeId === node.id;

      renderList.push({
        depth: (node.gx + node.gy) * 1000 + node.gz * 100,
        draw: () => {
          this.drawIsometricBlock(ctx, p.x, p.y, node, isHighlighted, isHovered, time);
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
        node.type === 'boss'
      ) {
        renderList.push({
          depth: (node.gx + node.gy) * 1000 + node.gz * 100 + 40,
          draw: () => {
            const ownerColor = node.townData?.ownerId
              ? players.find(pl => pl.id === node.townData!.ownerId)?.color || null
              : null;

            const bld = pixelSprites.getBuildingSprite(node.type, ownerColor);
            ctx.drawImage(bld, p.x - 40, p.y - 68, 80, 80);

            // Clean, non-cluttering town crest badge
            if (node.type === 'town') {
              // Compact level star crest
              ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
              ctx.beginPath();
              ctx.roundRect(p.x - 14, p.y - 74, 28, 14, 4);
              ctx.fill();
              ctx.strokeStyle = ownerColor || '#64748b';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              ctx.fillStyle = ownerColor || '#f8fafc';
              ctx.font = '8px Silkscreen';
              ctx.textAlign = 'center';
              ctx.fillText(`★${node.townData?.level || 1}`, p.x, p.y - 64);

              // Full Town Banner ONLY appears when hovered or highlighted (crystal clear map!)
              if (isHovered || isHighlighted) {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
                ctx.beginPath();
                ctx.roundRect(p.x - 52, p.y - 96, 104, 18, 4);
                ctx.fill();
                ctx.strokeStyle = isHighlighted ? '#00f0ff' : (ownerColor || '#f59e0b');
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = isHighlighted ? '#00f0ff' : (ownerColor || '#f59e0b');
                ctx.font = '8px Silkscreen';
                ctx.textAlign = 'center';
                ctx.fillText(`${node.name} (LV ${node.townData?.level || 1})`, p.x, p.y - 84);
              }
            }
          }
        });
      }

      // Swaying Foliage / Tree Props
      if (node.id % 2 === 0) {
        renderList.push({
          depth: (node.gx + node.gy) * 1000 + node.gz * 100 + 20,
          draw: () => {
            const treeType = node.biome === 'snow' ? 'snow_pine' : node.biome === 'forest' ? 'magic' : 'oak';
            const tree = pixelSprites.getTreeSprite(treeType, time * 0.002 + node.id);
            ctx.drawImage(tree, p.x + 32, p.y - 64, 52, 72);
          }
        });
      }

      // Dark Fantasy Biome Atmospheric Props (Totems, Lanterns, Obelisks, Crystals)
      if (node.id % 3 === 0) {
        renderList.push({
          depth: (node.gx + node.gy) * 1000 + node.gz * 100 + 15,
          draw: () => {
            this.drawDarkFantasyBiomeProp(ctx, p.x - 38, p.y - 42, node.biome, node.id, time);
          }
        });
      }
    });

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

    // 1. Draw Authentic Dark Fantasy Isometric Terrain Slab
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

    // 4. Outer Diamond Border Highlight / Hover (Bright Light Blue for Reachable Destination Spaces!)
    if (isHovered || isHighlighted) {
      // Luminous Bright Light Blue overlay across the top diamond face
      ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.35)' : 'rgba(0, 240, 255, 0.40)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.fill();

      // Sharp bright light blue boundary stroke
      ctx.strokeStyle = isHovered ? '#38bdf8' : '#00f0ff';
      ctx.lineWidth = isHovered ? 3.5 : 3.0;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.stroke();

      // Holographic Pulsing Target Ring in bright light blue
      const pulse = Math.sin(time * 0.008) * 4;
      ctx.strokeStyle = isHovered ? 'rgba(56, 189, 248, 0.8)' : 'rgba(0, 240, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(cx, cy, hw + pulse, hh + pulse * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Floating bright light blue diamond indicator beacon with glowing pulse
      ctx.fillStyle = isHovered ? '#38bdf8' : '#00f0ff';
      ctx.shadowColor = isHovered ? '#38bdf8' : '#00f0ff';
      ctx.shadowBlur = 14;
      this.drawDiamond(ctx, cx, cy - hh - 16 + Math.sin(time * 0.006) * 4, 16, 20);
      ctx.shadowBlur = 0;
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
      const glow = Math.sin(time * 0.006 + seed) * 3;
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py - 20, 8 + glow * 0.5, 0, Math.PI, true);
      ctx.fill();
    } else if (biome === 'volcano') {
      // Brimstone Caldera: Obsidian chimney with glowing magma embers
      ctx.fillStyle = '#1c0407';
      ctx.fillRect(px - 6, py - 22, 12, 24);
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillRect(px - 3, py - 24, 6, 4);
    } else if (biome === 'snow') {
      // Frostbitten Crypts: Ice spire with frozen blue soul
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px - 4, py - 20, 8, 22);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py - 24, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome === 'desert') {
      // Blighted Dunes: Weathered sandstone tombstone / obelisk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px - 5, py - 26, 10, 28);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(px - 2, py - 20, 4, 16);
    } else if (biome === 'cavern') {
      // Netherforge / Catacombs: Black iron lantern on spike
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 2, py - 24, 4, 26);
      ctx.fillRect(px - 7, py - 26, 14, 4);
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillRect(px - 4, py - 22, 8, 8);
    } else if (biome === 'abyss') {
      // The Void: Levitating dark void crystal
      const floatY = Math.sin(time * 0.005 + seed) * 6;
      ctx.fillStyle = '#3b0764';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 14;
      this.drawDiamond(ctx, px, py - 26 + floatY, 14, 22);
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
    ctx.drawImage(sprite, px - 40, py - 56, 80, 80);

    // 4. Name Tag
    ctx.fillStyle = '#030712';
    ctx.fillRect(px - 32, py - 68, 64, 15);
    ctx.strokeStyle = player.isDarkling ? '#c084fc' : player.color;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px - 32, py - 68, 64, 15);

    ctx.fillStyle = player.isDarkling ? '#f43f5e' : player.color;
    ctx.font = '8px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText(player.displayName.substring(0, 8), px, py - 57);
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
}
