import { BoardNode } from '../game/BoardMap';
import { pixelSprites, IsoDirection, CharacterAnimState } from './PixelSpriteGenerator';
import { worldBackground } from './WorldBackground';
import { Player } from '../game/Player';
import { ecosystemSystem, WeatherType } from '../game/EcosystemSystem';
import { isometricTerrainEngine } from './IsometricTerrainEngine';
import { pixelDisc, pixelEllipse, pixelGlow, pixelRing, pixelStroke } from './PixelFx';
import { defaultZoomFor, snapWorld, snapZoom } from './PixelScale';
import { audio } from './AudioSynthesizer';
import { graphicsPreferences, prefersReducedMotion } from '../ui/GraphicsSettings';
import { foliageForBiome } from './BiomeArt';

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
  private cachedNodes: BoardNode[] | null = null;
  private cachedNodeCount = 0;
  private cameraBounds = { minX: -3200, maxX: 5400, minY: -200, maxY: 4400 };
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
  private depthRenderList: Array<{ depth: number; draw: () => void }> = [];

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
    if (nodes.length) {
      const points = [...this.nodeScreenCache.values()];
      this.cameraBounds = {
        minX: Math.min(...points.map(p => p.x)) - 480,
        maxX: Math.max(...points.map(p => p.x)) + 480,
        minY: Math.min(...points.map(p => p.y)) - 360,
        maxY: Math.max(...points.map(p => p.y)) + 360
      };
    }
    this.cachedNodes = nodes;
    this.cachedNodeCount = nodes.length;

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
    if (!this.hasInitializedBoardCache || this.cachedNodes !== nodes || this.cachedNodeCount !== nodes.length) {
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
      y: p.y + 2 + (Math.random() * 4 - 2),
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
    if (!this.hasInitializedBoardCache || this.cachedNodes !== nodes || this.cachedNodeCount !== nodes.length) {
      this.initBoardCache(nodes);
      if (activePlayer) {
        const firstFocus = this.toScreen(activePlayer.gridX, activePlayer.gridY, activePlayer.gridZ);
        this.camera.x = this.camera.targetX = firstFocus.x;
        this.camera.y = this.camera.targetY = firstFocus.y;
      }
    }

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.previewPathNodeIds = previewPath;

    // Fast, responsive 60 FPS camera interpolation.
    //
    // The zoom is snapped to a scale at which every world pixel maps to a WHOLE number of device
    // pixels, and the camera is snapped so world blits land on whole device pixels. Without both
    // of these the board is resampled unevenly: some source pixels become two device pixels and
    // their neighbours become one, the grid stops being regular, and a hard-edged pixel-art scene
    // shimmers and crawls while the camera moves. With a regular micro-pattern on the floor it is
    // worse still - uneven sampling of a regular grid produces moire, which is the large
    // slow-moving interference that reads as "the pixels are making me dizzy".
    this.camera.targetZoom = this.snapZoom(this.camera.targetZoom);
    if (prefersReducedMotion()) {
      this.camera.x = this.camera.targetX;
      this.camera.y = this.camera.targetY;
    }
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.16;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.16;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.16;

    // Draw with the snapped zoom, not the interpolated one, so the scale on screen is always an
    // even one. The interpolation still drives the transition; it just resolves to even scales.
    // The camera is snapped for the same reason: a world blit at a fractional screen position is
    // resampled onto an irregular grid even when the scale itself is even.
    const zoom = this.snapZoom(this.camera.zoom);
    this.camera.zoom = zoom;
    const camX = snapWorld(this.camera.x, zoom);
    const camY = snapWorld(this.camera.y, zoom);

    ctx.clearRect(0, 0, w, h);

    // 1. Dynamic Fantasy World Sky & Parallax Horizons (Changes with Day/Night cycle)
    worldBackground.renderSky(ctx, this.camera, w, h, prefersReducedMotion() ? 0 : time, ecosystemSystem.timeOfDay);

    ctx.save();
    ctx.translate(Math.round(w / 2), Math.round(h / 2));
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    // 2. World Space Atmosphere (Clouds, wildlife & motes per time of day)
    if (graphicsPreferences.quality === 'high' && !prefersReducedMotion()) {
      worldBackground.renderAtmosphere(ctx, this.camera, time, ecosystemSystem.timeOfDay);
    }

    // 2.4 The cloud sea the floating continent rises out of. Drawn in world space below the
    // board's lowest tile, so the map reads as an island in the sky rather than as a flat
    // continent.
    if (isometricTerrainEngine.isInitialized) {
      worldBackground.renderCloudSea(ctx, prefersReducedMotion() ? 0 : time, ecosystemSystem.timeOfDay, isometricTerrainEngine.worldBounds);
    }

    const halfW = (w / 2) / this.camera.zoom + 200;
    const halfH = (h / 2) / this.camera.zoom + 200;
    const minX = this.camera.x - halfW;
    const maxX = this.camera.x + halfW;
    const minY = this.camera.y - halfH;
    const maxY = this.camera.y + halfH;

    // 2.5 Continuous 3D Isometric Continent Terrain (Biome-specific earth, cliffs & textures)
    isometricTerrainEngine.renderGround(ctx, minX, maxX, minY, maxY, time, ecosystemSystem.timeOfDay);

    // 2.6 Natural Environmental Clutter (Direct pass, zero sorting overhead)
    isometricTerrainEngine.renderClutter(ctx, minX, maxX, minY, maxY, time, ecosystemSystem.timeOfDay);

    // 3. 2.5D Isometric Textured Roadways (O(1) zero-allocation lookup)
    this.renderIsometricRoads(ctx, minX, maxX, minY, maxY);

    // 4. Interactive Breadcrumb Stepping Stones for Previewed Path (disabled per user request)
    // this.renderPathBreadcrumbs(ctx, nodes);

    // 5. Depth-Sorted Entities (Terrain Blocks, Buildings, Props, Characters & Environmental Clutter)
    this.renderDepthSortedWorld(ctx, nodes, players, activePlayer, highlightedNodes, minX, maxX, minY, maxY, time);

    // 6. Running Dust Particles
    this.renderDustPuffs(ctx);

    // 7. Regional Weather Particles & Living Ecosystem
    const activeNode = activePlayer ? nodes.find(n => n.id === activePlayer.nodeId) || nodes[0] : nodes[0];
    const localWeather = ecosystemSystem.getNodeWeather(activeNode);
    if (graphicsPreferences.quality === 'high' && !prefersReducedMotion()) {
      this.renderRegionalWeather(ctx, localWeather, time, activeNode?.biome);
    }

    // 8. Night Glows for Town Torches & Player Lanterns (inside world space)
    const lighting = ecosystemSystem.getLightingOverlay();
    if (lighting.isNight) {
      this.renderNightLanternGlows(ctx, nodes, players, minX, maxX, minY, maxY, time);
    }

    ctx.restore();

    // 9. Day/Night Screen Ambient Tint Overlay
    if (lighting.alpha > 0) {
      ctx.fillStyle = lighting.color;
      ctx.fillRect(0, 0, w, h);
    }

    // 10. Atmospheric Volumetric Sunbeams (God Rays) during Dawn & Dusk
    this.renderAtmosphericLightShafts(ctx, w, h, ecosystemSystem.timeOfDay);

    // 11. Squid Ink Sabotage Overlay
    if (activePlayer && activePlayer.squidInkTurns > 0) {
      this.renderSquidInkOverlay(ctx, w, h);
    }
  }


  private renderIsometricRoads(
    ctx: CanvasRenderingContext2D,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ) {
    // Native-pixel earth paths with irregular cobbles; no antialiased rails or centre stripe.
    for (const seg of this.roadwaySegments) {
      if (Math.max(seg.x1, seg.x2) < minX - 30 || Math.min(seg.x1, seg.x2) > maxX + 30 ||
          Math.max(seg.y1, seg.y2) < minY - 30 || Math.min(seg.y1, seg.y2) > maxY + 30) continue;
      const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
      // Finish each entire layer before the next, so stamp shadows never cut
      // vertical seams through the preceding stone (the old fence-like pattern).
      for (const layer of [{ color: '#394339', w: 18, h: 8 }, { color: seg.roadColor, w: 16, h: 6 }]) {
        ctx.fillStyle = layer.color;
        for (let i = 0; i <= steps; i++) {
          const x = Math.round(seg.x1 + dx * i / steps), y = Math.round(seg.y1 + dy * i / steps);
          ctx.fillRect(x - layer.w / 2, y - 3, layer.w, layer.h);
        }
      }
      for (let i = 2; i < steps - 1; i += 5) {
        const x = Math.round(seg.x1 + dx * i / steps), y = Math.round(seg.y1 + dy * i / steps);
        const j = (i % 3) - 1;
        ctx.fillStyle = '#655c49'; ctx.fillRect(x - 3 + j, y - 1, 5, 3);
        ctx.fillStyle = '#b1a084'; ctx.fillRect(x - 3 + j, y - 2, 4, 2);
      }
    }
  }

  private renderPathBreadcrumbs(ctx: CanvasRenderingContext2D, nodes: BoardNode[]) {
    // Disabled moving / bouncing path line per user request ("ไม่เอาเส้นทางเดินขยับๆ")
    return;
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
    const renderList = this.depthRenderList;
    renderList.length = 0;
    const focus = activePlayer ? this.toScreen(activePlayer.gridX, activePlayer.gridY, activePlayer.gridZ) : null;
    for (const grove of isometricTerrainEngine.groves) {
      if (grove.x < minX - 64 || grove.x > maxX + 64 || grove.y < minY - 64 || grove.y > maxY + 64) continue;
      renderList.push({ depth: grove.depth, draw: () => {
        const tree = pixelSprites.getTreeSprite(grove.species, grove.variant);
        ctx.save();
        if (focus && grove.y > focus.y + 4 && grove.y - focus.y < tree.height - 12 && Math.abs(grove.x - focus.x) < tree.width / 2 + 12) ctx.globalAlpha = .35;
        ctx.drawImage(tree, grove.x - tree.width / 2, grove.y - Number(tree.dataset.footY || 54));
        ctx.restore();
      } });
    }

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
      const hasBuilding =
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
        node.type === 'home';

      if (hasBuilding) {
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
            pixelEllipse(ctx, px, py + 16, 42, 16, ctx.fillStyle);
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            pixelEllipse(ctx, px, py + 14, 34, 12, ctx.fillStyle);
            ctx.fill();
            ctx.restore();

            const bld = pixelSprites.getBuildingSprite(node.id === 0 ? 'capital' : node.type, ownerColor);
            // 64x64 model whose base diamond is centred at (32, 48) inside the sprite, so the
            // blit is anchored to seat that base exactly on the node's tile centre.
            ctx.drawImage(bld, px - bld.width / 2, py - (bld.width === 96 ? 80 : 48));

            // Full names and health belong to the hovered location. Quiet map markers
            // keep the town's silhouette readable while still showing occupation.
            if (!isHovered && graphicsPreferences.labels !== 'all') {
              if (node.townData?.isOccupiedByMonster) {
                ctx.fillStyle = '#293b42'; ctx.fillRect(px + 21, py - 34, 2, 15);
                ctx.fillStyle = '#b46b68'; ctx.fillRect(px + 23, py - 34, 7, 5);
                ctx.fillStyle = '#dfb5a0'; ctx.fillRect(px + 23, py - 34, 5, 1);
              }
              return;
            }

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

      // Foliage / Tree Props (Only on open path nodes, never clipping through buildings)
      if (node.id % 2 === 0 && !hasBuilding && foliageForBiome(node.biome)) {
        renderList.push({
          depth: depth + 20,
          draw: () => {
            const treeType = foliageForBiome(node.biome)!;
            const tree = pixelSprites.getTreeSprite(treeType, node.id % 4);
            // Ambient ground contact shadow at trunk base
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            pixelEllipse(ctx, px + 52, py + 8, 14, 7, ctx.fillStyle);
            ctx.fill();

            // 1:1 blit of the 64x64 model. The anchor keeps the trunk base on the tile centre
            // at (px + 52, py + 6), the same spot the old 68x88 sprite was resampled into.
            ctx.drawImage(tree, px + 52 - tree.width / 2, py + 6 - Number(tree.dataset.footY || 54));
          }
        });
      }

      // Dark Fantasy Biome Props (Only on open path nodes)
      if (node.id % 3 === 0 && !hasBuilding) {
        renderList.push({
          depth: depth + 15,
          draw: () => {
            this.drawDarkFantasyBiomeProp(ctx, px - 38, py - 42, node.biome, node.id, time);
          }
        });
      }
    }

    // Actors and scenery share a depth pass, so walking behind a tree reads as depth.
    players.forEach(player => {
      const p = this.toScreen(player.gridX, player.gridY, player.gridZ);
      if (p.x < minX - 120 || p.x > maxX + 120 || p.y < minY - 150 || p.y > maxY + 150) {
        return;
      }
      renderList.push({
        depth: (player.gridX + player.gridY) * 1000 + player.gridZ * 100 + (player === activePlayer ? 80 : 50),
        draw: () => this.drawPlayerCharacter(ctx, p.x, p.y, player, player === activePlayer, time)
      });
    });
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
    cx = Math.round(cx); cy = Math.round(cy);
    const built = !['empty', 'blue', 'red'].includes(node.type);
    // Buildings already carry foundations. Open spaces get a small inset waystone.
    if (!built) {
      pixelEllipse(ctx, cx, cy + 2, 15, 7, '#303f3c');
      pixelEllipse(ctx, cx, cy, 14, 6, '#8a9275');
      pixelEllipse(ctx, cx, cy - 1, 12, 5, node.type === 'blue' ? '#496d81' : node.type === 'red' ? '#8b5858' : '#626f67');
      this.drawNodeSigil(ctx, cx, cy - 1, node.type, '', isHovered, isHighlighted);
    }
    if (isHovered || isHighlighted) {
      const color = isHovered ? '#f1d89b' : '#9ed5bf';
      pixelRing(ctx, cx, cy, built ? 32 : 20, built ? 16 : 10, color, 1);
      for (const side of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.fillRect(cx + side * 35 - 2, cy - 1, 5, 2);
        ctx.fillRect(cx - 1, cy + side * 18 - 2, 2, 5);
      }
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
   * Stylized Handcrafted Dark Fantasy Sigils for Board Nodes
   * Replaces raw OS font emojis with crisp, consistent 2.5D pixel-art emblems.
   */
  private drawNodeSigil(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    type: string,
    fallbackIcon: string,
    isHovered: boolean,
    isHighlighted: boolean
  ) {
    ctx.save();
    switch (type) {
      case 'blue': { // Golden Imperial Coin
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        pixelEllipse(ctx, cx, cy, 7, 4.5, '#f59e0b');
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(cx - 2, cy - 2, 4, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, cy - 1, 2, 1);
        break;
      }
      case 'red': { // Demonic Crimson Horns / Skull Sigil
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(cx - 2, cy - 1);
        ctx.lineTo(cx + 2, cy - 1);
        ctx.lineTo(cx + 4, cy - 4);
        ctx.lineTo(cx + 3, cy + 3);
        ctx.lineTo(cx - 3, cy + 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(cx - 2, cy, 1.5, 1.5);
        ctx.fillRect(cx + 0.5, cy, 1.5, 1.5);
        break;
      }
      case 'town': { // Bastion Keep Parapet & Gate
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 5, cy - 3, 10, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx - 3, cy - 3, 2, 2);
        ctx.fillRect(cx + 1, cy - 3, 2, 2);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(cx - 2, cy + 1, 4, 2);
        break;
      }
      case 'church': { // Holy Divine Sunburst Cross
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1.5, cy - 5, 3, 9);
        ctx.fillRect(cx - 4, cy - 3, 8, 3);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx - 0.5, cy - 2, 1, 1);
        break;
      }
      case 'shop_weapon': { // Crossed Steel Broadswords
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(cx + 4, cy + 3);
        ctx.moveTo(cx + 4, cy - 4);
        ctx.lineTo(cx - 4, cy + 3);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }
      case 'shop_item': { // Apothecary Potion Flask
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        pixelEllipse(ctx, cx, cy + 1, 4, 3, '#4ade80');
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx - 1.5, cy - 4, 3, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 1, cy - 1, 1, 1);
        break;
      }
      case 'shop_magic': { // Arcane Swirling Crystal Orb
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        pixelEllipse(ctx, cx, cy, 5, 3.5, '#c084fc');
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 1, 2, 1);
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(cx + 1, cy, 1, 1);
        break;
      }
      case 'tavern': { // Foaming Amber Tankard
        ctx.fillStyle = '#d97706';
        ctx.fillRect(cx - 3, cy - 2, 6, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, cy - 4, 6, 2);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 3, cy - 1, 2, 3);
        break;
      }
      case 'vault':
      case 'mystery_chest': { // Gilded Iron Treasure Chest
        ctx.fillStyle = '#d97706';
        ctx.fillRect(cx - 4, cy - 3, 8, 6);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 4, cy - 1, 8, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, cy, 2, 2);
        break;
      }
      case 'dark_gate': { // Abyssal Void Rift
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        pixelEllipse(ctx, cx, cy, 6, 4, '#a855f7');
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        pixelEllipse(ctx, cx, cy, 3, 2, '#0f172a');
        ctx.fill();
        break;
      }
      case 'boss': { // Draconic Fiend Crown
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 4);
        ctx.lineTo(cx - 2, cy + 3);
        ctx.lineTo(cx, cy - 1);
        ctx.lineTo(cx + 2, cy + 3);
        ctx.lineTo(cx + 5, cy - 4);
        ctx.lineTo(cx, cy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 0.5, cy, 1, 1);
        break;
      }
      case 'guild': { // Quest Parchment Scroll
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 4, cy - 3, 8, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        break;
      }
      case 'fishing': { // Azure Lake Ripple & Leaping Fish
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 2, cy - 2, 4, 2);
        break;
      }
      case 'isekai_event': { // Celestial Lightning Rune
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(cx + 1, cy - 5);
        ctx.lineTo(cx - 3, cy - 1);
        ctx.lineTo(cx, cy - 1);
        ctx.lineTo(cx - 1, cy + 5);
        ctx.lineTo(cx + 3, cy + 1);
        ctx.lineTo(cx, cy + 1);
        ctx.closePath();
        ctx.fill();
        break;
      }
      default: {
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fallbackIcon, cx, cy + 0.5);
        break;
      }
    }
    ctx.restore();
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
      // Continuous vertical bobbing animation so destination arrows glide up and down smoothly
      const bobSpeed = isHovered ? 0.007 : 0.005;
      const bobAmp = isHovered ? 9 : 7;
      const bob = Math.sin(time * bobSpeed + node.id * 0.35) * bobAmp;
      const pointerY = py - baseClearance + bob;

      ctx.save();

      // 1. Stepped Translucent Light Column (Non-intrusive guide ray)
      // Bands of decreasing alpha instead of a vertical gradient: the beam has to fade, and a
      // gradient across a beam is the same soft ramp this whole pass exists to remove.
      const beamW = isHovered ? 26 : 18;
      const beamTop = pointerY + 12;
      const beamBottom = py;
      const beamBands = 7;
      for (let b = 0; b < beamBands; b++) {
        const t = b / beamBands;
        const y0 = beamBottom + (beamTop - beamBottom) * t;
        const y1 = beamBottom + (beamTop - beamBottom) * ((b + 1) / beamBands);
        const halfW = beamW * 0.5 * (1 - t * 0.5);
        ctx.globalAlpha = (isHovered ? 0.22 : 0.16) * (1 - t) * (1 - t);
        ctx.fillStyle = isHovered ? '#fbbf24' : '#00f0ff';
        for (let y = Math.round(Math.min(y0, y1)); y < Math.round(Math.max(y0, y1)); y++) {
          ctx.fillRect(Math.round(px - halfW), y, Math.max(1, Math.round(halfW * 2)), 1);
        }
      }
      ctx.globalAlpha = 1;

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
      // A half-arc dome, drawn as integer rows so the cap has a staircase rim.
      for (let dy = 8; dy >= 0; dy--) {
        const w = Math.floor(Math.sqrt(Math.max(0, 64 - dy * dy)));
        ctx.fillRect(px - w, py - 20 - (8 - dy), w * 2 + 1, 1);
      }
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
      pixelDisc(ctx, px, py - 24, 5, ctx.fillStyle);
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
      // A rounded headstone top, as integer rows rather than a ctx.arc.
      for (let dy = 6; dy >= 0; dy--) {
        const w = Math.floor(Math.sqrt(Math.max(0, 36 - dy * dy)));
        ctx.fillRect(px - w, py - 18 - (6 - dy), w * 2 + 1, 1);
      }
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
    // 1. Soft Ground Shadow with Ambient Occlusion (Anchored firmly on the tile top plate)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
    ctx.beginPath();
    pixelEllipse(ctx, px, py + 1, 24, 12, ctx.fillStyle);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
    ctx.beginPath();
    pixelEllipse(ctx, px, py, 18, 9, ctx.fillStyle);
    ctx.fill();

    // 2. Active Player Halo (Elevated to tile surface)
    if (isActive) {
      const pulse = Math.sin(time * 0.006) * 3;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pixelRing(ctx, px, py, 24 + pulse, 12 + pulse * 0.5, ctx.strokeStyle, 1);
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
    // Draw sprite elevated so the character stands on the tile surface, never sunken into the floor
    ctx.drawImage(sprite, Math.round(px) - 72, Math.round(py) - 97);

    if (!isActive) return;

    // 4. Name Tag (Elevated above hero's head)
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
      pixelDisc(ctx, d.x, d.y, d.size, ctx.fillStyle);
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
    maxY: number,
    time: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Warm radial torchlight glows on towns, inns, taverns with subtle organic flicker
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
          const flicker = 0.94 + Math.sin(time * 0.007 + n.id * 1.5) * 0.08;
          const gw = 190 * flicker;
          const gh = 190 * flicker;
          ctx.drawImage(townGlow, p.x - gw / 2, p.y - 113 * flicker, gw, gh);
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
        ctx.drawImage(playerGlow, p.x - 70, p.y - 70);
      }
    });

    ctx.restore();
  }

  /**
   * Volumetric Sunbeams (God Rays) across Day, Dawn & Dusk for breathtaking atmospheric mood.
   */
  private renderAtmosphericLightShafts(ctx: CanvasRenderingContext2D, w: number, h: number, timeOfDay: string) {
    if (timeOfDay === 'NIGHT') return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const isDawn = timeOfDay === 'DAWN';
    const isDay = timeOfDay === 'DAY';
    const rayColor = isDawn
      ? 'rgba(253, 224, 71, 0.038)'
      : isDay
      ? 'rgba(254, 240, 138, 0.022)'
      : 'rgba(251, 146, 60, 0.045)';
    const numRays = 4;
    const rayWidth = w * 0.16;
    const angle = isDawn ? 0.38 : isDay ? 0.28 : -0.38;

    ctx.translate(w / 2, 0);
    ctx.rotate(angle);
    ctx.fillStyle = rayColor;
    for (let i = -numRays; i <= numRays; i += 2) {
      const rx = i * rayWidth * 1.35;
      ctx.fillRect(rx, -h * 0.4, rayWidth, h * 2.2);
    }
    ctx.restore();
  }

  private renderRegionalWeather(ctx: CanvasRenderingContext2D, weather: WeatherType, time: number, activeBiome?: string) {
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

        pixelStroke(ctx, p.x, p.y, p.x - 3, p.y + 12, 1, '#8db6bd', .55);
      });
      ctx.stroke();

      // Occasional gentle atmospheric sheet-lightning flash on storm
      if (Math.random() < 0.003) {
        ctx.fillStyle = 'rgba(224, 242, 254, 0.12)';
        ctx.fillRect(-1600, -1600, 3200, 3200);
        audio.thunderClap();
      }
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
        pixelDisc(ctx, p.x, p.y, p.size * 0.7, ctx.fillStyle);
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
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.size)), Math.max(1, Math.round(p.size)));
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
        pixelDisc(ctx, p.x, p.y, p.size * 0.8, ctx.fillStyle);
        ctx.fill();
      });
    } else if (weather === 'blood_moon') {
      // Crimson embers & blood moon mist
      this.particles.forEach((p, idx) => {
        p.x += Math.sin(time * 0.002 + idx) * 0.9;
        p.y -= p.vy * 0.5 + 0.3;
        if (p.y < -1600) p.y = 1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = idx % 2 === 0 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(185, 28, 28, 0.65)';
        ctx.beginPath();
        pixelDisc(ctx, p.x, p.y, p.size * 1.1, ctx.fillStyle);
        ctx.fill();
      });
    } else if (activeBiome === 'volcano') {
      // Rising Volcanic Cinder Embers
      this.particles.forEach((p, idx) => {
        p.x += Math.sin(time * 0.003 + idx) * 0.7;
        p.y -= p.vy * 0.8 + 1.2;
        if (p.y < -1600) p.y = 1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = idx % 3 === 0 ? '#ef4444' : idx % 3 === 1 ? '#f97316' : '#fbbf24';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.size * 0.9)), Math.max(1, Math.round(p.size * 0.9)));
      });
    } else if (activeBiome === 'sakura_shrine') {
      // Drifting Sakura Petals
      this.particles.forEach((p, idx) => {
        p.x += Math.sin(time * 0.002 + idx) * 1.2 + 0.8;
        p.y += p.vy * 0.5 + 0.6;
        if (p.y > 1600) p.y = -1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = idx % 2 === 0 ? '#f472b6' : '#fb7185';
        ctx.beginPath();
        pixelDisc(ctx, p.x, p.y, p.size * 0.85, ctx.fillStyle);
        ctx.fill();
      });
    } else if (activeBiome === 'crystal_cavern' || activeBiome === 'fairy_grove') {
      // Shimmering Mana Sparkles
      this.particles.forEach((p, idx) => {
        p.x += Math.cos(time * 0.002 + idx) * 0.6;
        p.y += Math.sin(time * 0.002 + idx) * 0.6;
        if (p.y > 1600) p.y = -1600;
        if (p.x > 1600) p.x = -1600;
        if (p.x < -1600) p.x = 1600;

        ctx.fillStyle = idx % 2 === 0 ? '#38bdf8' : '#c084fc';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.size * 0.75)), Math.max(1, Math.round(p.size * 0.75)));
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
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.size)), Math.max(1, Math.round(p.size)));
      });
    }
  }

  private townGlowCanvas: HTMLCanvasElement | null = null;
  private playerGlowCanvas: HTMLCanvasElement | null = null;

  /**
   * The town and player light pools, as stepped ring glows.
   *
   * These were cached `createRadialGradient` discs. A gradient disc is a soft ramp painted across
   * the ground, which is the same mistake the floor tiles had; a set of discrete rings with
   * stepped alpha reads as light and keeps the colour count bounded.
   */
  private getTownGlowCanvas(): HTMLCanvasElement {
    if (this.townGlowCanvas) return this.townGlowCanvas;
    const c = document.createElement('canvas');
    c.width = 190;
    c.height = 190;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    pixelGlow(ctx, 95, 95, 95, '#fbbf24', 0.42, 6);
    pixelDisc(ctx, 95, 95, 26, '#f59e0b', 0.16);
    this.townGlowCanvas = c;
    return c;
  }

  private getPlayerGlowCanvas(): HTMLCanvasElement {
    if (this.playerGlowCanvas) return this.playerGlowCanvas;
    const c = document.createElement('canvas');
    c.width = 140;
    c.height = 140;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    pixelGlow(ctx, 70, 70, 70, '#fef08a', 0.34, 5);
    pixelDisc(ctx, 70, 70, 18, '#fbbf24', 0.14);
    this.playerGlowCanvas = c;
    return c;
  }

  /**
   * The nearest zoom at which every world pixel lands on a whole number of screen pixels.
   *
   * The unit is the canvas's own pixel, which is a CSS pixel because the canvases are sized in CSS
   * pixels and scaled by the browser - see `initCanvasResize` for why they are not sized in device
   * pixels. The rule itself lives in `PixelScale` so it can be tested without a canvas.
   */
  public snapZoom(zoom: number): number {
    return snapZoom(zoom);
  }

  public getDefaultZoom(): number {
    return defaultZoomFor(typeof window === 'undefined' ? 1280 : window.innerWidth);
  }

  public clampCameraBounds() {
    // Dungeon islands live beyond the surface continent's original fixed bounds.
    const { minX, maxX, minY, maxY } = this.cameraBounds;
    this.camera.targetX = Math.max(minX, Math.min(maxX, this.camera.targetX));
    this.camera.targetY = Math.max(minY, Math.min(maxY, this.camera.targetY));
    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(minY, Math.min(maxY, this.camera.y));
    // Snapped rather than merely clamped, so a wheel or pinch zoom cannot land between the even
    // scales and bring the irregular pixel grid back.
    this.camera.zoom = this.snapZoom(Math.max(0.25, Math.min(3, this.camera.zoom)));
    this.camera.targetZoom = this.snapZoom(Math.max(0.25, Math.min(3, this.camera.targetZoom)));
  }

  centerCameraOn(gx: number, gy: number, gz: number) {
    const p = this.toScreen(gx, gy, gz);
    // A teleport can precede the next render/cache rebuild. Keep its actual destination reachable.
    this.cameraBounds.minX = Math.min(this.cameraBounds.minX, p.x - 480);
    this.cameraBounds.maxX = Math.max(this.cameraBounds.maxX, p.x + 480);
    this.cameraBounds.minY = Math.min(this.cameraBounds.minY, p.y - 360);
    this.cameraBounds.maxY = Math.max(this.cameraBounds.maxY, p.y + 360);
    this.camera.targetX = p.x;
    this.camera.targetY = p.y;
    this.clampCameraBounds();
  }

  // Smooth cinematic camera focus onto player at turn start
  focusOnPlayer(gx: number, gy: number, gz: number) {
    this.centerCameraOn(gx, gy, gz);
  }

  // Smooth analog panning from gamepad or keys
  panCamera(dx: number, dy: number) {
    this.camera.targetX += dx;
    this.camera.targetY += dy;
    this.clampCameraBounds();
  }

  private renderSquidInkOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    const blobs = [
      { x: w * 0.25, y: h * 0.35, r: Math.min(w, h) * 0.28 },
      { x: w * 0.70, y: h * 0.60, r: Math.min(w, h) * 0.32 },
      { x: w * 0.50, y: h * 0.50, r: Math.min(w, h) * 0.20 },
      { x: w * 0.82, y: h * 0.22, r: Math.min(w, h) * 0.18 },
      { x: w * 0.15, y: h * 0.75, r: Math.min(w, h) * 0.22 },
    ];
    blobs.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px Silkscreen, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦑 หมึกปลาหมึกบดบังวิสัยทัศน์! (SQUID INK BLIND)', w / 2, 40);
    ctx.restore();
  }
}


