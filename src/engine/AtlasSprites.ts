import { enrichEnvironmentPixels } from './VibrantPalette';
/** Isolate a sprite from small detached pieces crossing a generated atlas cell boundary. */
export function isolateAtlasCell(data: Uint8ClampedArray, width: number, height: number): void {
  const visited = new Uint8Array(width * height);
  let largest: number[] = [];
  const solid = (i: number) => data[i * 4 + 3] >= 80;
  for (let i = 0; i < visited.length; i++) {
    if (visited[i] || !solid(i)) continue;
    const component = [i]; visited[i] = 1;
    for (let head = 0; head < component.length; head++) {
      const p = component[head], x = p % width, y = Math.floor(p / width);
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]) {
        if (q >= 0 && !visited[q] && solid(q)) { visited[q] = 1; component.push(q); }
      }
    }
    if (component.length > largest.length) largest = component;
  }
  const keep = new Uint8Array(width * height);
  for (const i of largest) keep[i] = 1;
  for (let i = 0; i < keep.length; i++) {
    if (!keep[i]) data[i * 4 + 3] = 0;
    else data[i * 4 + 3] = 255;
  }
}

export function atlasSprite(image: HTMLImageElement, col: number, row: number, columns: number, rows: number, size: number, enrich: boolean = true): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(col * image.naturalWidth / columns), y = Math.round(row * image.naturalHeight / rows);
  const right = Math.round((col + 1) * image.naturalWidth / columns), bottom = Math.round((row + 1) * image.naturalHeight / rows);
  ctx.drawImage(image, x, y, right - x, bottom - y, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size);
  isolateAtlasCell(pixels.data, size, size);
  if (enrich) enrichEnvironmentPixels(pixels.data);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
