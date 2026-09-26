import { BoardNode } from '../game/BoardMap';
import { pixelSprites, IsoDirection, CharacterAnimState } from './PixelSpriteGenerator';
import { worldBackground } from './WorldBackground';
import { Player } from '../game/Player';
import { ecosystemSystem, WeatherType } from '../game/EcosystemSystem';
import { isometricTerrainEngine } from './IsometricTerrainEngine';

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
    edgeColor: string;
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
    const defaultZ = this.getDefaultZoom();
    this.camera.zoom = defaultZ;
    this.camera.targetZoom = defaultZ;
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

    // Initialize 3D isometric continent terrain and environmental props
    isometricTerrainEngine.initTerrain(nodes);

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

          let roadColor = '#78553d';
          let dashColor = '#a8896c';
          let edgeColor = 'rgba(40, 25, 15, 0.35)';

          if (node.biome === 'snow') {
            roadColor = '#526173';
            dashColor = '#94a3b8';
            edgeColor = 'rgba(15, 23, 42, 0.3)';
          } else if (node.biome === 'volcano') {
            roadColor = '#451a1a';
            dashColor = '#7f1d1d';
            edgeColor = 'rgba(20, 5, 5, 0.4)';
          } else if (node.biome === 'desert') {
            roadColor = '#9a5814';
            dashColor = '#ca8a04';
            edgeColor = 'rgba(69, 26, 3, 0.35)';
          } else if (node.biome === 'forest') {
            roadColor = '#543d2b';
            dashColor = '#78553d';
            edgeColor = 'rgba(20, 35, 15, 0.35)';
          } else if (node.biome === 'cavern') {
            roadColor = '#3f3f46';
            dashColor = '#71717a';
            edgeColor = 'rgba(15, 15, 20, 0.35)';
          } else if (node.biome === 'coral') {
            roadColor = '#0e7490';
            dashColor = '#38bdf8';
            edgeColor = 'rgba(8, 51, 68, 0.3)';
          } else if (node.biome === 'abyss') {
            roadColor = '#4c1d95';
            dashColor = '#a855f7';
            edgeColor = 'rgba(24, 5, 39, 0.4)';
          }

          this.roadwaySegments.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            roadColor,
            dashColor,
            edgeColor
          });
        }
      });
    });

    this.hasInitializedBoardCache = true;
  }

  // =========================================================================
  // ISOMETRIC RAYCASTING: Detect which tile was hovered or clicked
  // =========================================================================
  screenToNode(clientX: number, clientY: number, nodes: BoardNode[], priorityIds?: number[]): BoardNode | null {
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

      const isPriority = priorityIds && priorityIds.includes(node.id);
      let effectiveDist = isPriority ? dist * 0.75 : dist;
      let isHit = dist <= 1.45;

      // When node is an active destination, also accept clicks directly on the floating overhead indicator!
      if (isPriority) {
        const hasBuilding = [
          'town', 'shop_item', 'shop_weapon', 'shop_magic', 'church',
          'dark_gate', 'boss', 'vault', 'tavern', 'guild', 'fishing',
          'isekai_event', 'mystery_chest', 'home'
        ].includes(node.type);
        const beaconY = ny - (node.type === 'boss' ? 108 : (hasBuilding ? 92 : 62));
        const dyBeacon = Math.abs(worldY - beaconY);
        const beaconDist = (dx / (hw * 1.2)) + (dyBeacon / 32);
        if (beaconDist <= 1.35) {
          effectiveDist = Math.min(effectiveDist, beaconDist * 0.6);
          isHit = true;
        }
      }

      if (isHit && effectiveDist < minDistance) {
        minDistance = effectiveDist;
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

    // 1. Dynamic Fantasy World Sky & Parallax Horizons (Changes with Day/Night cycle)
    worldBackground.renderSky(ctx, this.camera, w, h, time, ecosystemSystem.timeOfDay);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 2. World Space Atmosphere (Clouds, wildlife & motes per time of day)
    worldBackground.renderAtmosphere(ctx, this.camera, time, ecosystemSystem.timeOfDay);

    const halfW = (w / 2) / this.camera.zoom + 200;
    const halfH = (h / 2) / this.camera.zoom + 200;
    const minX = this.camera.x - halfW;
    const maxX = this.camera.x + halfW;
    const minY = this.camera.y - halfH;
    const maxY = this.camera.y + halfH;

    // 2.5 Continuous 3D Isometric Continent Terrain (Biome-specific earth, cliffs & textures)
    isometricTerrainEngine.renderGround(ctx, minX, maxX, minY, maxY, time, ecosystemSystem.timeOfDay);

    // 2.6 Natural Environmental Clutter (Direct pass, zero sorting overhead)
    isometricTerrainEngine.renderClutter(ctx, minX, maxX, minY, maxY, time);

    // 3. 2.5D Isometric Textured Roadways (O(1) zero-allocation lookup)
    this.renderIsometricRoads(ctx, minX, maxX, minY, maxY);

    // 4. Interactive Breadcrumb Stepping Stones for Previewed Path
    this.renderPathBreadcrumbs(ctx, nodes);

    // 5. Depth-Sorted Entities (Terrain Blocks, Buildings, Props, Characters & Environmental Clutter)
    this.renderDepthSortedWorld(ctx, nodes, players, activePlayer, highlightedNodes, minX, maxX, minY, maxY, time);

    // 6. Running Dust Particles
    this.renderDustPuffs(ctx);

    // 7. Regional Weather Particles & Living Ecosystem
    const activeNode = activePlayer ? nodes.find(n => n.id === activePlayer.nodeId) || nodes[0] : nodes[0];
    const localWeather = ecosystemSystem.getNodeWeather(activeNode);
    this.renderRegionalWeather(ctx, localWeather, time);

    // 8. Night Glows for Town Torches & Player Lanterns (inside world space)
    const lighting = ecosystemSystem.getLightingOverlay();
    if (lighting.isNight) {
      this.renderNightLanternGlows(ctx, nodes, players, minX, maxX, minY, maxY);
    }

    ctx.restore();

    // 9. Day/Night Screen Ambient Tint Overlay
    if (lighting.alpha > 0) {
      ctx.fillStyle = lighting.color;
      ctx.fillRect(0, 0, w, h);
    }

    // 10. Dark Fantasy Gothic Atmospheric Vignette Overlay
    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.max(w, h) * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.65, 'rgba(6, 10, 20, 0.20)');
    vignette.addColorStop(1.0, 'rgba(2, 4, 10, 0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
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

      // Layer 1: Soft natural path edge & worn earth embankment
      ctx.strokeStyle = seg.edgeColor;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      // Layer 2: Main packed dirt/cobblestone trail bed
      ctx.strokeStyle = seg.roadColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      // Layer 3: Weathered flagstone stepping pavers
      ctx.strokeStyle = seg.dashColor;
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'round';
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Layer 4: Worn pathway rut & central stone fissure
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
  }

  private renderPathBreadcrumbs(ctx: CanvasRenderingContext2D, nodes: BoardNode[]) {
    if (this.previewPathNodeIds.length < 2) return;

    // Outer neon glow stroke (zero-lag)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (let idx = 0; idx < this.previewPathNodeIds.length; idx++) {
      const nodeId = this.previewPathNodeIds[idx];
      const p = this.nodeScreenCache.get(nodeId) || (nodes.find(n => n.id === nodeId) ? this.toScreen(nodes.find(n => n.id === nodeId)!.gx, nodes.find(n => n.id === nodeId)!.gy, nodes.find(n => n.id === nodeId)!.gz) : null);
      if (!p) continue;
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Inner bright core beam
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();
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
        node.type === 'vault' ||
        node.type === 'tavern' ||
        node.type === 'guild' ||
        node.type === 'fishing' ||
        node.type === 'isekai_event' ||
        node.type === 'mystery_chest' ||
        node.type === 'home'
      ) {
        renderList.push({
          depth: depth + 40,
          draw: () => {
            const ownerColor = node.townData?.ownerId
              ? players.find(pl => pl.id === node.townData!.ownerId)?.color || null
              : node.homeData?.ownerId
              ? players.find(pl => pl.id === node.homeData!.ownerId)?.color || null
              : null;

            // Soft two-tier ambient occlusion & ground contact shadow
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.beginPath();
            ctx.ellipse(px, py + 16, 42, 16, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(px, py + 14, 34, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            const bld = pixelSprites.getBuildingSprite(node.type, ownerColor);
            // 64x64 model whose base diamond is centred at (32, 48) inside the sprite, so the
            // blit is anchored to seat that base exactly on the node's tile centre.
            ctx.drawImage(bld, px - 32, py - 48, 64, 64);

            // Overhead High-Contrast Badge / Signboard for Every Building
            interface BadgeConfig {
              title: string;
              icon: string;
              borderColor: string;
              textColor: string;
              bgColor: string;
            }

            let badge: BadgeConfig | null = null;

            if (node.type === 'home') {
              const homeOwner = node.homeData?.ownerName || 'ผู้กล้า';
              const labelText = `🏡 บ้านพักของ ${homeOwner}`;
              ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
              const textMetrics = ctx.measureText(labelText);
              const bW = Math.max(80, textMetrics.width + 16);

              ctx.fillStyle = 'rgba(6, 78, 59, 0.94)';
              ctx.beginPath();
              ctx.roundRect(px - bW / 2, py - 68, bW, 16, 4);
              ctx.fill();
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = isHighlighted || isHovered ? 2.0 : 1.2;
              ctx.stroke();

              ctx.fillStyle = '#6ee7b7';
              ctx.textAlign = 'center';
              ctx.fillText(labelText, px, py - 56);
            } else if (node.type === 'town') {
              if (node.townData?.isOccupiedByMonster) {
                const curHp = node.townData.monsterHp;
                const maxHp = node.townData.monsterMaxHp || curHp;
                const hpPct = Math.max(0, Math.min(1, curHp / maxHp));
                const isWeakened = hpPct < 1.0;
                const bounce = Math.sin(Date.now() * 0.005) * 5;
                const monsterName = node.townData.monsterName || 'มอนสเตอร์';
                const labelText = `🆘 มอนสเตอร์บุก! ${monsterName}`;
                ctx.save();
                ctx.translate(0, bounce);

                ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
                const textMetrics = ctx.measureText(labelText);
                const badgeW = Math.max(110, textMetrics.width + 16);

                ctx.fillStyle = 'rgba(127, 29, 29, 0.95)';
                ctx.beginPath();
                ctx.roundRect(px - badgeW / 2, py - 82, badgeW, 28, 5);
                ctx.fill();

                const pulseAlpha = 0.4 + 0.4 * Math.sin(Date.now() * 0.008);
                ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
                ctx.lineWidth = isWeakened ? 2.5 : 1.8;
                ctx.stroke();

                ctx.fillStyle = '#fee2e2';
                ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(labelText, px, py - 68);

                const barW = badgeW - 14;
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px - barW / 2, py - 63, barW, 6);
                ctx.fillStyle = hpPct < 0.35 ? '#ef4444' : '#f59e0b';
                ctx.fillRect(px - barW / 2, py - 63, barW * hpPct, 6);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 7px Silkscreen';
                ctx.fillText(`${curHp}/${maxHp} HP`, px, py - 57);

                ctx.restore();
              } else {
                const townLvl = node.townData?.level || 1;
                const townName = node.name || 'โอ๊คเชียร์';
                const labelText = `🏰 ${townName} (Lv.${townLvl})`;
                ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
                const textMetrics = ctx.measureText(labelText);
                const bW = Math.max(76, textMetrics.width + 16);

                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.beginPath();
                ctx.roundRect(px - bW / 2, py - 68, bW, 16, 4);
                ctx.fill();
                ctx.strokeStyle = isHighlighted ? '#00f0ff' : (ownerColor || '#f59e0b');
                ctx.lineWidth = isHighlighted || isHovered ? 2.0 : 1.2;
                ctx.stroke();

                ctx.fillStyle = isHighlighted ? '#00f0ff' : (ownerColor || '#fde047');
                ctx.textAlign = 'center';
                ctx.fillText(labelText, px, py - 56);
              }
            } else if (node.type === 'shop_weapon') {
              badge = {
                title: 'ร้านอาวุธ',
                icon: '⚔️',
                borderColor: '#f97316',
                textColor: '#fdba74',
                bgColor: 'rgba(20, 12, 5, 0.92)'
              };
            } else if (node.type === 'shop_item') {
              badge = {
                title: 'ร้านไอเทม',
                icon: '🧪',
                borderColor: '#22c55e',
                textColor: '#86efac',
                bgColor: 'rgba(5, 20, 10, 0.92)'
              };
            } else if (node.type === 'shop_magic') {
              badge = {
                title: 'ร้านเวทมนตร์',
                icon: '🔮',
                borderColor: '#a855f7',
                textColor: '#d8b4fe',
                bgColor: 'rgba(25, 10, 35, 0.92)'
              };
            } else if (node.type === 'church') {
              badge = {
                title: 'โบสถ์ศักดิ์สิทธิ์',
                icon: '✨',
                borderColor: '#38bdf8',
                textColor: '#bae6fd',
                bgColor: 'rgba(10, 20, 35, 0.92)'
              };
            } else if (node.type === 'tavern') {
              badge = {
                title: 'โรงเตี๊ยม',
                icon: '🍺',
                borderColor: '#eab308',
                textColor: '#fde047',
                bgColor: 'rgba(30, 20, 5, 0.92)'
              };
            } else if (node.type === 'guild') {
              badge = {
                title: 'กิลด์นักผจญภัย',
                icon: '📜',
                borderColor: '#f59e0b',
                textColor: '#fef08a',
                bgColor: 'rgba(25, 18, 5, 0.92)'
              };
            } else if (node.type === 'fishing') {
              badge = {
                title: 'จุดตกปลา',
                icon: '🎣',
                borderColor: '#06b6d4',
                textColor: '#67e8f9',
                bgColor: 'rgba(5, 20, 30, 0.92)'
              };
            } else if (node.type === 'vault') {
              badge = {
                title: 'คลังสมบัติ',
                icon: '🎁',
                borderColor: '#fbbf24',
                textColor: '#fef08a',
                bgColor: 'rgba(35, 25, 5, 0.92)'
              };
            } else if (node.type === 'boss') {
              const bounce = Math.sin(Date.now() * 0.004) * 6;
              const bossName = node.name || 'บอสประจำภูมิภาค';
              const labelText = `👑 REALM BOSS [${bossName}]`;
              ctx.save();
              ctx.translate(0, bounce);
              ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
              const textMetrics = ctx.measureText(labelText);
              const bW = Math.max(120, textMetrics.width + 20);

              ctx.fillStyle = 'rgba(88, 28, 135, 0.95)';
              ctx.beginPath();
              ctx.roundRect(px - bW / 2, py - 80, bW, 20, 5);
              ctx.fill();

              const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
              ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
              ctx.lineWidth = 2.2;
              ctx.stroke();

              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(labelText, px, py - 66);
              ctx.restore();
            } else if (node.type === 'dark_gate') {
              badge = {
                title: 'ประตูนรก',
                icon: '😈',
                borderColor: '#c084fc',
                textColor: '#e9d5ff',
                bgColor: 'rgba(40, 10, 50, 0.92)'
              };
            } else if (node.type === 'isekai_event') {
              badge = {
                title: 'ศาลเจ้าต่างโลก',
                icon: '⚡',
                borderColor: '#d946ef',
                textColor: '#f5d0fe',
                bgColor: 'rgba(30, 15, 60, 0.92)'
              };
            } else if (node.type === 'mystery_chest') {
              badge = {
                title: 'กล่องสุ่มมหัศจรรย์',
                icon: '🎁',
                borderColor: '#f59e0b',
                textColor: '#fef08a',
                bgColor: 'rgba(50, 30, 5, 0.94)'
              };
            }

            if (badge) {
              const fullText = `${badge.icon} ${badge.title}`;
              ctx.font = 'bold 9px "Kanit", "Prompt", sans-serif';
              const textMetrics = ctx.measureText(fullText);
              const bW = Math.max(70, textMetrics.width + 16);

              ctx.fillStyle = badge.bgColor;
              ctx.beginPath();
              ctx.roundRect(px - bW / 2, py - 68, bW, 16, 4);
              ctx.fill();

              ctx.strokeStyle = isHovered || isHighlighted ? '#00f0ff' : badge.borderColor;
              ctx.lineWidth = isHovered || isHighlighted ? 2.0 : 1.2;
              ctx.stroke();

              ctx.fillStyle = isHovered || isHighlighted ? '#ffffff' : badge.textColor;
              ctx.textAlign = 'center';
              ctx.fillText(fullText, px, py - 56);
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
                : node.biome === 'abyss' || node.biome === 'cavern'
                ? 'gloom_spore'
                : node.biome === 'volcano' || node.biome === 'desert'
                ? 'ash_thorn'
                : node.biome === 'forest'
                ? (node.id % 4 === 0 ? 'gloom_spore' : 'dark_oak')
                : 'dark_oak';
            const tree = pixelSprites.getTreeSprite(treeType, node.id % 4);
            // 1:1 blit of the 64x64 model. The anchor keeps the trunk base on the tile centre
            // at (px + 52, py + 6), the same spot the old 68x88 sprite was resampled into.
            ctx.drawImage(tree, px + 20, py - 48, 64, 64);
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

    // 3. Highlighted Reachable Destinations Overhead Pass (Always on top of terrain & buildings, never obscured!)
    this.renderDestinationOverheadMarkers(ctx, nodes, highlightedNodes, minX, maxX, minY, maxY, time);
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
    const blockHeight = 4;

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
    } else if (node.type === 'tavern') {
      topColor = '#854d0e';
      leftColor = '#713f12';
      rightColor = '#422006';
      icon = '🍺';
    } else if (node.type === 'guild') {
      topColor = '#b45309';
      leftColor = '#92400e';
      rightColor = '#451a03';
      icon = '📜';
    } else if (node.type === 'fishing') {
      topColor = '#0284c7';
      leftColor = '#0369a1';
      rightColor = '#075985';
      icon = '🎣';
    } else if (node.type === 'isekai_event') {
      topColor = '#a855f7';
      leftColor = '#7e22ce';
      rightColor = '#581c87';
      icon = '⚡';
    } else if (node.type === 'mystery_chest') {
      topColor = '#facc15';
      leftColor = '#d97706';
      rightColor = '#b45309';
      icon = '🎁';
    }

    // Dokapon Signature Dark Fantasy Runic Node Seal
    ctx.save();
    // 1. Soft Ground Occlusion Shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 25, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(2, 6, 18, 0.48)';
    ctx.fill();

    // 2. Weathered Iron / Bronze Outer Rim
    ctx.beginPath();
    ctx.ellipse(cx, cy, 23, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#fde047' : isHighlighted ? '#00f0ff' : '#475569';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 3. Inner Gemstone Core
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.95)' : isHighlighted ? 'rgba(0, 240, 255, 0.90)' : topColor;
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#38bdf8' : isHighlighted ? '#00f0ff' : '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Space Type Icon with drop shadow
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy + 0.5);
    ctx.restore();


    // 4. Large Illuminated Ground Target Zone (Reachable Destination Spaces - Surrounds tile floor cleanly)
    if (isHovered || isHighlighted) {
      const ringColor = isHovered ? '#fde047' : '#00f0ff';
      const fillGlow = isHovered ? 'rgba(251, 191, 36, 0.40)' : 'rgba(0, 240, 255, 0.35)';

      ctx.save();
      // 4.1 Large glowing elliptical ground footprint framing the entire tile
      const groundRx = isHovered ? 36 : 30;
      const groundRy = isHovered ? 18 : 15;

      // Soft filled inner ambient light
      ctx.fillStyle = isHovered ? 'rgba(251, 191, 36, 0.22)' : 'rgba(0, 240, 255, 0.16)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, groundRx, groundRy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow aura stroke
      ctx.strokeStyle = fillGlow;
      ctx.lineWidth = isHovered ? 5.5 : 4.0;
      ctx.beginPath();
      ctx.ellipse(cx, cy, groundRx, groundRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sharp primary boundary ring
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = isHovered ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, groundRx, groundRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 4.2 Expanding Active Sonar / Runic Pulse Wave on Ground
      const pulseProg = ((time * 0.0022) + (node.id * 0.18)) % 1;
      const pulseRx = groundRx * (0.85 + pulseProg * 0.65);
      const pulseRy = groundRy * (0.85 + pulseProg * 0.65);
      const pulseAlpha = (1 - pulseProg) * (isHovered ? 0.65 : 0.45);
      ctx.strokeStyle = isHovered ? `rgba(251, 191, 36, ${pulseAlpha})` : `rgba(0, 240, 255, ${pulseAlpha})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(cx, cy, pulseRx, pulseRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 4.3 Sleek High-Tech / Fantasy Corner Targeting Brackets [ ]
      const bw = groundRx + (isHovered ? 7 : 5);
      const bh = groundRy + (isHovered ? 4 : 3);
      const blx = 9;
      const bly = 5;

      ctx.strokeStyle = ringColor;
      ctx.lineWidth = isHovered ? 2.8 : 2.0;

      // West corner bracket
      ctx.beginPath();
      ctx.moveTo(cx - bw + blx, cy - bly);
      ctx.lineTo(cx - bw, cy);
      ctx.lineTo(cx - bw + blx, cy + bly);
      ctx.stroke();

      // East corner bracket
      ctx.beginPath();
      ctx.moveTo(cx + bw - blx, cy - bly);
      ctx.lineTo(cx + bw, cy);
      ctx.lineTo(cx + bw - blx, cy + bly);
      ctx.stroke();

      // North corner bracket
      ctx.beginPath();
      ctx.moveTo(cx - blx, cy - bh + bly);
      ctx.lineTo(cx, cy - bh);
      ctx.lineTo(cx + blx, cy - bh + bly);
      ctx.stroke();

      // South corner bracket
      ctx.beginPath();
      ctx.moveTo(cx - blx, cy + bh - bly);
      ctx.lineTo(cx, cy + bh);
      ctx.lineTo(cx + blx, cy + bh - bly);
      ctx.stroke();

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

  /**
   * Prominent Overhead Destination Indicators & Translucent Pillar Beams
   * Floats safely ABOVE buildings and characters, with zero obstruction to sprites or text badges!
   */
  private renderDestinationOverheadMarkers(
    ctx: CanvasRenderingContext2D,
    nodes: BoardNode[],
    highlightedNodes: number[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    time: number
  ) {
    if (highlightedNodes.length === 0) return;

    for (let i = 0; i < highlightedNodes.length; i++) {
      const nodeId = highlightedNodes[i];
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const pos = this.nodeScreenCache.get(node.id);
      const px = pos ? pos.x : this.toScreen(node.gx, node.gy, node.gz).x;
      const py = pos ? pos.y : this.toScreen(node.gx, node.gy, node.gz).y;

      // View frustum culling
      if (px < minX - 100 || px > maxX + 100 || py < minY - 180 || py > maxY + 180) {
        continue;
      }

      const isHovered = this.hoveredNodeId === node.id;
      const ringColor = isHovered ? '#fde047' : '#00f0ff';
      const glowColor = isHovered ? 'rgba(251, 191, 36, 0.45)' : 'rgba(0, 240, 255, 0.35)';

      // Safe clearance height calculation:
      // Buildings & Badges reach up to py - 80, Realm Bosses reach py - 95, normal nodes reach py - 48
      const hasBuilding = [
        'town', 'shop_item', 'shop_weapon', 'shop_magic', 'church',
        'dark_gate', 'boss', 'vault', 'tavern', 'guild', 'fishing',
        'isekai_event', 'mystery_chest', 'home'
      ].includes(node.type);

      const baseClearance = node.type === 'boss' ? 108 : (hasBuilding ? 92 : 62);
      const bob = Math.sin((time * 0.0055) + (node.id * 0.7)) * 5;
      const pointerY = py - baseClearance + bob;

      ctx.save();

      // 1. Soft Vertical Translucent Light Column (Non-intrusive guide ray)
      const beamW = isHovered ? 26 : 18;
      const grad = ctx.createLinearGradient(px, py, px, pointerY);
      grad.addColorStop(0, isHovered ? 'rgba(251, 191, 36, 0.22)' : 'rgba(0, 240, 255, 0.16)');
      grad.addColorStop(0.7, isHovered ? 'rgba(251, 191, 36, 0.08)' : 'rgba(0, 240, 255, 0.05)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px - beamW * 0.5, py + 8);
      ctx.lineTo(px + beamW * 0.5, py + 8);
      ctx.lineTo(px + beamW * 0.25, pointerY + 12);
      ctx.lineTo(px - beamW * 0.25, pointerY + 12);
      ctx.closePath();
      ctx.fill();

      // 2. High-Visibility 3D Downward Pointer Arrow
      const arrowScale = isHovered ? 1.25 : 1.0;
      const aw = 14 * arrowScale;
      const ah = 22 * arrowScale;
      const tipY = pointerY + 8;

      // 2.1 Drop Shadow for maximum contrast against any terrain/sky
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.beginPath();
      ctx.moveTo(px, tipY + 4);
      ctx.lineTo(px - aw - 3, tipY - ah - 3);
      ctx.lineTo(px, tipY - ah + 3);
      ctx.lineTo(px + aw + 3, tipY - ah - 3);
      ctx.closePath();
      ctx.fill();

      // 2.2 Outer Glow Aura
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = isHovered ? 5.5 : 4.0;
      ctx.beginPath();
      ctx.moveTo(px, tipY);
      ctx.lineTo(px - aw, tipY - ah);
      ctx.lineTo(px, tipY - ah + 5);
      ctx.lineTo(px + aw, tipY - ah);
      ctx.closePath();
      ctx.stroke();

      // 2.3 Left Shaded Facet
      ctx.fillStyle = isHovered ? '#d97706' : '#0284c7';
      ctx.beginPath();
      ctx.moveTo(px, tipY);
      ctx.lineTo(px - aw, tipY - ah);
      ctx.lineTo(px, tipY - ah + 5);
      ctx.closePath();
      ctx.fill();

      // 2.4 Right Highlighted Facet
      ctx.fillStyle = isHovered ? '#fef08a' : '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(px, tipY);
      ctx.lineTo(px, tipY - ah + 5);
      ctx.lineTo(px + aw, tipY - ah);
      ctx.closePath();
      ctx.fill();

      // 2.5 Center Specular Crest & Core Line
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(px, tipY);
      ctx.lineTo(px - aw, tipY - ah);
      ctx.lineTo(px, tipY - ah + 5);
      ctx.lineTo(px + aw, tipY - ah);
      ctx.closePath();
      ctx.stroke();

      // Specular white glimmer at top
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, tipY - ah + 2, 4, 3);

      // 3. Crisp Inner Target Glyph
      ctx.font = `bold ${Math.round(11 * arrowScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHovered ? '#78350f' : '#082f49';
      ctx.fillText('▼', px, tipY - ah * 0.45);

      // 4. Interactive Hover Badge (Only when hovered!)
      if (isHovered) {
        const badgeY = tipY - ah - 16;
        const steps = this.previewPathNodeIds && this.previewPathNodeIds.length > 1
          ? this.previewPathNodeIds.length - 1
          : null;
        const label = steps !== null ? `🎯 เดิน ${steps} ช่อง (คลิก)` : `🎯 เดินมาที่นี่`;
        ctx.font = 'bold 10px "Kanit", "Prompt", sans-serif';
        const txtW = ctx.measureText(label).width;
        const boxW = txtW + 18;
        const boxH = 20;

        // Dark pill background with golden border
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.beginPath();
        ctx.roundRect(px - boxW / 2, badgeY - boxH / 2, boxW, boxH, 10);
        ctx.fill();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px, badgeY);
      }

      ctx.restore();
    }
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
    // 1. Soft Ground Shadow with Ambient Occlusion
    ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.beginPath();
    ctx.ellipse(px, py + 9, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
    ctx.beginPath();
    ctx.ellipse(px, py + 8, 18, 9, 0, 0, Math.PI * 2);
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
      player.prank,
      player.skinVariant
    );
    ctx.drawImage(sprite, px - 57, py - 82, 114, 114);

    // 4. Name Tag
    ctx.fillStyle = '#030712';
    ctx.fillRect(px - 34, py - 92, 68, 16);
    ctx.strokeStyle = player.isDarkling ? '#c084fc' : player.color;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px - 34, py - 92, 68, 16);

    ctx.fillStyle = player.isDarkling ? '#f43f5e' : player.color;
    ctx.font = '8px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText(player.displayName.substring(0, 8), px, py - 80);
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

  private renderNightLanternGlows(
    ctx: CanvasRenderingContext2D,
    nodes: BoardNode[],
    players: Player[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Warm radial torchlight glows on towns, inns, taverns
    const townGlow = this.getTownGlowCanvas();
    nodes.forEach(n => {
      if (
        n.type === 'town' ||
        n.type === 'tavern' ||
        n.type === 'guild' ||
        n.type === 'church' ||
        n.type === 'shop_item' ||
        n.type === 'shop_weapon' ||
        n.type === 'shop_magic'
      ) {
        const p = this.toScreen(n.gx, n.gy, n.gz);
        if (p.x >= minX - 95 && p.x <= maxX + 95 && p.y >= minY - 95 && p.y <= maxY + 95) {
          ctx.drawImage(townGlow, p.x - 95, p.y - 113);
        }
      }
    });

    // Soft warm player lantern glow cast on the ground under feet (deduplicated)
    const playerGlow = this.getPlayerGlowCanvas();
    const renderedTiles = new Set<string>();
    players.forEach(pl => {
      const key = `${pl.gridX},${pl.gridY},${pl.gridZ}`;
      if (renderedTiles.has(key)) return;
      renderedTiles.add(key);

      const p = this.toScreen(pl.gridX, pl.gridY, pl.gridZ);
      if (p.x >= minX - 80 && p.x <= maxX + 80 && p.y >= minY - 80 && p.y <= maxY + 80) {
        ctx.drawImage(playerGlow, p.x - 70, p.y - 62);
      }
    });

    ctx.restore();
  }

  private renderRegionalWeather(ctx: CanvasRenderingContext2D, weather: WeatherType, time: number) {
    if (weather === 'rain') {
      // Slanting rain streaks + water splash ripples
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      this.particles.forEach(p => {
        p.x += p.vx * 1.5;
        p.y += p.vy * 2.5 + 4;
        if (p.y > 1600) p.y = -1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 3, p.y + 12);
      });
      ctx.stroke();
    } else if (weather === 'snow') {
      // Gently fluttering snowflakes
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      this.particles.forEach(p => {
        p.x += Math.sin(time * 0.002 + p.size) * 0.8;
        p.y += p.vy * 0.6 + 0.5;
        if (p.y > 1600) p.y = -1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (weather === 'heatwave') {
      // Golden shimmering sun motes
      this.particles.forEach(p => {
        p.x += p.vx * 0.4;
        p.y -= p.vy * 0.5;
        if (p.y < -1600) p.y = 1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
    } else if (weather === 'miasma') {
      // Purple spore motes & dark crimson embers
      this.particles.forEach((p, idx) => {
        p.x += Math.sin(time * 0.001 + idx) * 0.5;
        p.y -= p.vy * 0.4;
        if (p.y < -1600) p.y = 1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = idx % 2 === 0 ? 'rgba(168, 85, 247, 0.6)' : 'rgba(244, 63, 94, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Clear Skies / Sunny: Gentle golden pollen / leaf motes
      this.particles.forEach(p => {
        p.x += p.vx * 0.5;
        p.y += p.vy * 0.4;
        if (p.y > 1600) p.y = -1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
    }
  }

  private townGlowCanvas: HTMLCanvasElement | null = null;
  private playerGlowCanvas: HTMLCanvasElement | null = null;

  private getTownGlowCanvas(): HTMLCanvasElement {
    if (this.townGlowCanvas) return this.townGlowCanvas;
    const c = document.createElement('canvas');
    c.width = 190;
    c.height = 190;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(95, 95, 6, 95, 95, 95);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.40)');
    grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.18)');
    grad.addColorStop(0.8, 'rgba(217, 119, 6, 0.06)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(95, 95, 95, 0, Math.PI * 2);
    ctx.fill();
    this.townGlowCanvas = c;
    return c;
  }

  private getPlayerGlowCanvas(): HTMLCanvasElement {
    if (this.playerGlowCanvas) return this.playerGlowCanvas;
    const c = document.createElement('canvas');
    c.width = 140;
    c.height = 140;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(70, 70, 4, 70, 70, 70);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.16)');
    grad.addColorStop(0.75, 'rgba(245, 158, 11, 0.05)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(70, 70, 70, 0, Math.PI * 2);
    ctx.fill();
    this.playerGlowCanvas = c;
    return c;
  }

  public getDefaultZoom(): number {
    const w = this.canvas.width || window.innerWidth;
    if (w < 480) return 0.78;
    if (w < 768) return 0.88;
    return 1.0;
  }

  public clampCameraBounds() {
    // Keep camera within playable continental boundaries
    const minX = -3200;
    const maxX = 5400;
    const minY = -200;
    const maxY = 4400;
    this.camera.targetX = Math.max(minX, Math.min(maxX, this.camera.targetX));
    this.camera.targetY = Math.max(minY, Math.min(maxY, this.camera.targetY));
    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(minY, Math.min(maxY, this.camera.y));
    this.camera.zoom = Math.max(0.55, Math.min(1.8, this.camera.zoom));
    this.camera.targetZoom = Math.max(0.55, Math.min(1.8, this.camera.targetZoom));
  }

  centerCameraOn(gx: number, gy: number, gz: number) {
    const p = this.toScreen(gx, gy, gz);
    this.camera.targetX = p.x;
    this.camera.targetY = p.y;
    this.clampCameraBounds();
  }

  // Smooth cinematic camera focus onto player at turn start
  focusOnPlayer(gx: number, gy: number, gz: number) {
    const p = this.toScreen(gx, gy, gz);
    this.camera.targetX = p.x;
    this.camera.targetY = p.y;
    this.clampCameraBounds();
  }

  // Reset to default comfortable fixed tactical board zoom
  resetTacticalZoom() {
    const defaultZ = this.getDefaultZoom();
    this.camera.zoom = defaultZ;
    this.camera.targetZoom = defaultZ;
  }
}

