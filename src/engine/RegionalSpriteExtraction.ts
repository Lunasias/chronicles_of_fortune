/** Complete objects can cross a generated sheet's nominal grid lines. Segment
 * the entire sheet before cropping so a canopy, roof or root is never cut there. */
export interface RegionalSpritePixels {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export function splitRegionalAtlas(
  data: Uint8ClampedArray, width: number, height: number, columns = 6, rows = 4
): Array<RegionalSpritePixels | null> {
  const count = columns * rows;
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  const owners = [-1];
  let nextLabel = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || data[start * 4 + 3] < 80) continue;
    const label = ++nextLabel, votes = new Uint32Array(count);
    let tail = 1; queue[0] = start; labels[start] = label;
    for (let head = 0; head < tail; head++) {
      const pixel = queue[head], x = pixel % width, y = Math.floor(pixel / width);
      votes[Math.min(rows - 1, Math.floor(y * rows / height)) * columns + Math.min(columns - 1, Math.floor(x * columns / width))]++;
      // Eight-way contact keeps diagonal branches and thin roof ornaments attached.
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((!dx && !dy) || nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighbor = ny * width + nx;
        if (!labels[neighbor] && data[neighbor * 4 + 3] >= 80) {
          labels[neighbor] = label; queue[tail++] = neighbor;
        }
      }
    }
    let owner = 0;
    for (let cell = 1; cell < count; cell++) if (votes[cell] > votes[owner]) owner = cell;
    owners.push(owner);
  }

  // Preserve soft edge pixels from the generated image without allowing those
  // nearly transparent pixels to connect two neighboring solid objects.
  let tail = 0;
  for (let i = 0; i < labels.length; i++) if (labels[i]) queue[tail++] = i;
  for (let head = 0; head < tail; head++) {
    const pixel = queue[head], x = pixel % width, y = Math.floor(pixel / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((!dx && !dy) || nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighbor = ny * width + nx;
      if (!labels[neighbor] && data[neighbor * 4 + 3] > 0) {
        labels[neighbor] = labels[pixel]; queue[tail++] = neighbor;
      }
    }
  }

  const bounds = Array.from({ length: count }, () => ({ left: width, top: height, right: -1, bottom: -1 }));
  for (let i = 0; i < labels.length; i++) {
    if (!labels[i] || data[i * 4 + 3] < 16) continue;
    const box = bounds[owners[labels[i]]], x = i % width, y = Math.floor(i / width);
    box.left = Math.min(box.left, x); box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y);
  }
  return bounds.map((box, cell) => {
    if (box.right < box.left) return null;
    // Two source pixels retain the antialiased outline; the destination adds
    // another four native pixels of transparent room around the complete art.
    const left = Math.max(0, box.left - 2), top = Math.max(0, box.top - 2);
    const right = Math.min(width - 1, box.right + 2), bottom = Math.min(height - 1, box.bottom + 2);
    const w = right - left + 1, h = bottom - top + 1, pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const source = (top + y) * width + left + x;
      if (labels[source] && owners[labels[source]] === cell) {
        const from = source * 4, to = (y * w + x) * 4;
        pixels[to] = data[from]; pixels[to + 1] = data[from + 1];
        pixels[to + 2] = data[from + 2]; pixels[to + 3] = data[from + 3];
      }
    }
    return { width: w, height: h, pixels };
  });
}

/** A proportional fit, with a stable root/foundation and a transparent gutter. */
export function regionalSpriteFit(width: number, height: number, size = 128, padding = 4, maxScale = Infinity) {
  const scale = Math.min(maxScale, (size - padding * 2) / Math.max(1, width), (size - padding * 2) / Math.max(1, height));
  const drawWidth = Math.max(1, Math.round(width * scale)), drawHeight = Math.max(1, Math.round(height * scale));
  return { x: Math.round((size - drawWidth) / 2), y: size - padding - drawHeight, width: drawWidth, height: drawHeight, footY: size - padding - 1 };
}
