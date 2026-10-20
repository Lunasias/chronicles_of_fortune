import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { companionSprites } from './CompanionSpriteRenderer';
import { drawShopInterior } from './ShopInteriors';

/** Native-size vignettes share the board's materials and actual settlement models. */
export function drawSettlementScenery(canvas: HTMLCanvasElement, kind: string, owner: string | null = null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height, floor = h - 19;
  ctx.imageSmoothingEnabled = false;
  if (kind.startsWith('shop_')) {
    drawShopInterior(canvas, kind);
    return;
  }
  ctx.fillStyle = '#203641'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2b4650'; ctx.fillRect(0, 30, w, h - 30);
  for (let depth = 0; depth < 5; depth++) for (let x = -96; x < w + 96; x += 96) {
    const tile = isometricTerrainRenderer.getTileSprite('castle', { variant: (depth + x / 96 + 8) % 4 });
    ctx.drawImage(tile, x + (depth % 2) * 48, floor - 28 + depth * 24);
  }
  const building = isometricBuildingRenderer.getBuildingSprite(kind, owner);
  ctx.drawImage(building, Math.round(w * .22) - building.width / 2, floor - (building.width === 96 ? 80 : 48));
  const host = companionSprites.getHostSprite('king');
  if (host) ctx.drawImage(host, Math.round(w * .68) - 32, floor - 58);
}

/** Asset arrivals repaint only a visible vignette, without reopening its game panel. */
export function refreshSettlementOnLoad(canvasId: string, panelId: string, paint: () => void) {
  for (const event of ['world-art-loaded', 'companion-assets-loaded', 'artwork-ready']) window.addEventListener(event, () => {
    const panel = document.getElementById(panelId);
    if (panel && !panel.classList.contains('hidden') && document.getElementById(canvasId)) paint();
  });
}
