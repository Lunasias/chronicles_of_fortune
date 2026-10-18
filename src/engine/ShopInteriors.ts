import { createArtworkImage } from './ArtworkLoading';

export const SHOP_INTERIOR_KEYS = ['shop_item', 'shop_weapon', 'shop_magic', 'shop_forge'] as const;
type ShopInterior = typeof SHOP_INTERIOR_KEYS[number];
const images = new Map<ShopInterior, HTMLImageElement>();

export function drawShopInterior(canvas: HTMLCanvasElement, kind: string) {
  const key = SHOP_INTERIOR_KEYS.includes(kind as ShopInterior) ? kind as ShopInterior : 'shop_item';
  let image = images.get(key);
  if (!image) {
    image = createArtworkImage();
    images.set(key, image);
    image.src = `/assets/art-v2/shop-interiors-v1/${key}.png`;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#17263b';ctx.fillRect(0,0,canvas.width,canvas.height);
  if (image.complete && image.naturalWidth) ctx.drawImage(image,0,0,canvas.width,canvas.height);
}
