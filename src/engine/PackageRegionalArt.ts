// Authoring helper used by scripts/package-regional-delivery.cjs through Vite.
// The production renderer imports only the small delivery atlas/foot manifest.
import { splitRegionalAtlas, regionalSpriteFit } from './RegionalSpriteExtraction';
import completionArt from './map-completion-art.json';

export async function packageGroundMaterials() {
  const image = new Image(); image.src = '/assets/art-v2/world-rebuild-v1/ground-materials.png'; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 384;
  const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const cw = image.naturalWidth / 5, ch = image.naturalHeight / 4;
  for (let index = 0; index < 20; index++) ctx.drawImage(image, Math.round(index % 5 * cw), Math.round(Math.floor(index / 5) * ch), Math.round(cw), Math.round(ch), index % 5 * 96, Math.floor(index / 5) * 96, 96, 96);
  return canvas.toDataURL('image/png').split(',')[1];
}

export async function packageRegionalArt(theme: string, slots: readonly string[]) {
  const load = async (url: string) => { const image = new Image(); image.src = url; await image.decode(); return image; };
  const image = await load(`/assets/art-v2/world-rebuild-v1/${theme}.png`);
  const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight;
  const ctx = source.getContext('2d')!; ctx.drawImage(image, 0, 0);
  const regions = splitRegionalAtlas(ctx.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
  const atlas = document.createElement('canvas'); atlas.width = 768; atlas.height = 512;
  const packed = atlas.getContext('2d')!; packed.imageSmoothingEnabled = false;
  const feet: number[] = [];
  for (let index = 0; index < slots.length; index++) {
    const replacement = (completionArt as Record<string, string>)[`${theme}:${slots[index]}`];
    let region = regions[index], maxScale = 128 / Math.min(source.width / 6, source.height / 4);
    if (replacement) {
      const object = await load(replacement), cut = document.createElement('canvas'); cut.width = object.naturalWidth; cut.height = object.naturalHeight;
      const pixels = cut.getContext('2d')!; pixels.drawImage(object, 0, 0);
      region = splitRegionalAtlas(pixels.getImageData(0, 0, cut.width, cut.height).data, cut.width, cut.height, 1, 1)[0]; maxScale = Infinity;
    }
    feet.push(123); if (!region) continue;
    const cut = document.createElement('canvas'); cut.width = region.width; cut.height = region.height;
    const cutCtx = cut.getContext('2d')!, pixels = cutCtx.createImageData(region.width, region.height); pixels.data.set(region.pixels); cutCtx.putImageData(pixels, 0, 0);
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
    const spriteCtx = sprite.getContext('2d')!; spriteCtx.imageSmoothingEnabled = false;
    const fit = regionalSpriteFit(region.width, region.height, 128, 4, maxScale);
    spriteCtx.drawImage(cut, fit.x, fit.y, fit.width, fit.height);
    const alpha = spriteCtx.getImageData(0, 0, 128, 128).data;
    outer: for (let y = 127; y >= 0; y--) for (let x = 0; x < 128; x++) if (alpha[(y * 128 + x) * 4 + 3] >= 100) { feet[index] = y; break outer; }
    packed.drawImage(sprite, index % 6 * 128, Math.floor(index / 6) * 128);
  }
  return { png: atlas.toDataURL('image/png').split(',')[1], feet };
}
