import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { companionSprites } from './CompanionSpriteRenderer';
import { pixelDisc } from './PixelFx';
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
  const shop = kind.startsWith('shop_');
  if (shop) {
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = '#45606a'; ctx.fillRect(x, 4, 29, 2);
      ctx.fillStyle = '#1a2c36'; ctx.fillRect(x + 29, 0, 3, 38);
    }
  }
  for (let depth = 0; depth < 5; depth++) for (let x = -96; x < w + 96; x += 96) {
    const tile = isometricTerrainRenderer.getTileSprite('castle', { variant: (depth + x / 96 + 8) % 4 });
    ctx.drawImage(tile, x + (depth % 2) * 48, floor - 28 + depth * 24);
  }
  const building = isometricBuildingRenderer.getBuildingSprite(kind, owner);
  ctx.drawImage(building, Math.round(w * .22) - building.width / 2, floor - (building.width === 96 ? 80 : 48));
  const host = companionSprites.getHostSprite(shop ? kind === 'shop_weapon' ? 'blacksmith' : 'innkeeper' : 'king');
  if (host) ctx.drawImage(host, Math.round(w * .68) - 32, floor - 58);
  if (shop) {
    const x = Math.round(w * .46), width = Math.round(w * .38);
    ctx.fillStyle = '#503b35'; ctx.fillRect(x, floor - 12, width, 21);
    ctx.fillStyle = '#795b46'; ctx.fillRect(x, floor - 12, width, 3);
    ctx.fillStyle = '#c0a46c'; ctx.fillRect(x - 3, floor - 16, width + 6, 4);
    ctx.fillStyle = '#2a3034'; ctx.fillRect(x + 8, floor - 6, width - 16, 2);
    if (kind === 'shop_weapon') {
      ctx.fillStyle = '#b8c7bd'; ctx.fillRect(x + 10, floor - 23, 28, 3);
      ctx.fillStyle = '#d4b271'; ctx.fillRect(x + 31, floor - 26, 3, 9);
    } else if (kind === 'shop_magic') {
      pixelDisc(ctx, x + 20, floor - 22, 6, '#7978a6');
      pixelDisc(ctx, x + 18, floor - 24, 2, '#d4c9eb');
    } else {
      ctx.fillStyle = '#ba6e72'; ctx.fillRect(x + 14, floor - 25, 6, 9);
      ctx.fillStyle = '#bba475'; ctx.fillRect(x + 15, floor - 28, 4, 3);
      ctx.fillStyle = '#80ad95'; ctx.fillRect(x + 26, floor - 23, 6, 7);
    }
  }
}

/** Asset arrivals repaint only a visible vignette, without reopening its game panel. */
export function refreshSettlementOnLoad(canvasId: string, panelId: string, paint: () => void) {
  for (const event of ['world-art-loaded', 'companion-assets-loaded', 'artwork-ready']) window.addEventListener(event, () => {
    const panel = document.getElementById(panelId);
    if (panel && !panel.classList.contains('hidden') && document.getElementById(canvasId)) paint();
  });
}
