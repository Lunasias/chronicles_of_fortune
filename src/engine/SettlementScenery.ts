import { isometricBuildingRenderer } from './IsometricBuildingRenderer';
import { isometricTerrainRenderer } from './IsometricTerrainRenderer';
import { companionSprites } from './CompanionSpriteRenderer';
import { pixelDisc } from './PixelFx';

/** Native-size vignettes share the board's materials and actual settlement models. */
export function drawSettlementScenery(canvas: HTMLCanvasElement, kind: string, owner: string | null = null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height, floor = h - 19;
  ctx.imageSmoothingEnabled = false;
  if (kind.startsWith('shop_')) {
    drawShopRoom(ctx, w, h, kind);
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

function drawShopRoom(ctx: CanvasRenderingContext2D, w: number, h: number, kind: string) {
  const floor = h - 14, weapon = kind === 'shop_weapon', magic = kind === 'shop_magic';
  ctx.fillStyle = '#192a35'; ctx.fillRect(0, 0, w, h);
  // One interior perspective: wall shelves, shopkeeper and counter, no miniature exterior building.
  for (let y = 6; y < h - 35; y += 22) for (let x = -24; x < w; x += 64) {
    ctx.fillStyle = (x + y) % 3 ? '#30434a' : '#354a50'; ctx.fillRect(x + (y % 44 ? 32 : 0), y, 61, 19);
  }
  ctx.fillStyle = '#39413e'; ctx.fillRect(0, h - 35, w, 35);
  for (let x = 0; x < w; x += 32) { ctx.fillStyle = '#63584a'; ctx.fillRect(x, h - 34, 2, 34); }
  ctx.fillStyle = '#72573f'; ctx.fillRect(0, 0, w, 8); ctx.fillRect(12, 0, 10, h - 25); ctx.fillRect(w - 22, 0, 10, h - 25);
  const shelfX = 40, shelfW = Math.round(w * .42);
  for (const y of [Math.round(h * .35), Math.round(h * .64)]) {
    ctx.fillStyle = '#271f24'; ctx.fillRect(shelfX - 3, y + 4, shelfW + 6, 7);
    ctx.fillStyle = '#997651'; ctx.fillRect(shelfX, y, shelfW, 4);
    for (let i = 0; i < 7; i++) {
      const x = shelfX + 12 + i * Math.round((shelfW - 24) / 7);
      if (weapon) {
        ctx.fillStyle = '#b4c6c2'; ctx.fillRect(x, y - 23, 3, 18); ctx.fillRect(x - 1, y - 20, 1, 14);
        ctx.fillStyle = '#bb9e65'; ctx.fillRect(x - 4, y - 7, 11, 3); ctx.fillStyle = '#684c42'; ctx.fillRect(x, y - 4, 3, 5);
      } else if (magic) {
        ctx.fillStyle = ['#78899e', '#8d6b91', '#9a8c65'][i % 3]; ctx.fillRect(x - 4, y - 19, 12, 18);
        ctx.fillStyle = '#d9c593'; ctx.fillRect(x - 2, y - 16, 2, 13); ctx.fillRect(x + 2, y - 12, 3, 3);
      } else {
        ctx.fillStyle = '#bcae88'; ctx.fillRect(x - 1, y - 19, 5, 5);
        ctx.fillStyle = ['#a66b72', '#6e9d8c', '#7d8faf'][i % 3]; ctx.fillRect(x - 4, y - 14, 11, 12);
        ctx.fillStyle = '#c6d1bf'; ctx.fillRect(x - 2, y - 12, 2, 5);
      }
    }
  }
  if (weapon) {
    const x = Math.round(w * .52);
    ctx.fillStyle = '#473f3f'; ctx.fillRect(x - 18, floor - 48, 36, 42);
    ctx.fillStyle = '#201f27'; ctx.fillRect(x - 11, floor - 36, 22, 26);
    ctx.fillStyle = '#a65e3b'; ctx.fillRect(x - 8, floor - 28, 17, 17);
    ctx.fillStyle = '#e5b46b'; ctx.fillRect(x - 5, floor - 23, 10, 12);
    ctx.fillStyle = '#3f4b50'; ctx.fillRect(x - 16, floor - 49, 32, 5);
  }
  const host = companionSprites.getHostSprite(weapon ? 'blacksmith' : 'innkeeper');
  if (host) ctx.drawImage(host, Math.round(w * .76) - 32, floor - 64);
  const x = Math.round(w * .63), width = Math.round(w * .3);
  ctx.fillStyle = '#3a3030'; ctx.fillRect(x, floor - 16, width, 25);
  ctx.fillStyle = '#72543e'; ctx.fillRect(x + 3, floor - 12, width - 6, 18);
  ctx.fillStyle = '#b39766'; ctx.fillRect(x - 3, floor - 20, width + 6, 5);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#bd9c60'; ctx.fillRect(x + 15 + i * 16, floor - 6, 4, 3); }
  if (magic) { pixelDisc(ctx, x + 18, floor - 29, 8, '#797895'); pixelDisc(ctx, x + 16, floor - 32, 2, '#ded7bc'); }
}

/** Asset arrivals repaint only a visible vignette, without reopening its game panel. */
export function refreshSettlementOnLoad(canvasId: string, panelId: string, paint: () => void) {
  for (const event of ['world-art-loaded', 'companion-assets-loaded']) window.addEventListener(event, () => {
    const panel = document.getElementById(panelId);
    if (panel && !panel.classList.contains('hidden') && document.getElementById(canvasId)) paint();
  });
}
