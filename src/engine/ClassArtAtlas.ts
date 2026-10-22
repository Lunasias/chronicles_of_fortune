import { createArtworkImage } from './ArtworkLoading';
import { isolateAtlasCell } from './AtlasSprites';
import type { CharacterAnimState, IsoDirection } from './PixelSpriteGenerator';
import { JOB_VISUALS } from './JobVisuals';
import { canvasBudget } from './PerformanceBudget';

const DIRECTIONS: IsoDirection[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const CLASSES = new Set(['warrior', 'magician', 'thief', 'cleric', 'spellblade', 'ranger']);
const PROMOTION_RAMPS: Record<string, [[number, number, number], [number, number, number]]> = {
  paladin: [[112, 104, 82], [244, 226, 173]],
  berserker: [[67, 37, 48], [186, 101, 98]],
  archmage: [[41, 56, 95], [122, 184, 190]],
  necromancer: [[28, 56, 55], [101, 164, 130]],
  ninja: [[24, 47, 57], [91, 151, 148]],
  assassin: [[48, 29, 48], [149, 78, 104]],
  high_priest: [[105, 91, 66], [238, 218, 165]],
  saint: [[65, 99, 122], [182, 222, 225]],
  rune_master: [[58, 41, 78], [164, 127, 190]]
};

/** Finds the actual gutters in a delivered atlas, rather than slicing through feet or hats. */
export function atlasRowCuts(data: Uint8ClampedArray, width: number, height: number, rows: number): number[] {
  const counts = new Uint32Array(height);
  for (let y = 0; y < height; y++) for (let x = 8; x < width - 8; x++) {
    if (data[(y * width + x) * 4 + 3] >= 80) counts[y]++;
  }
  const cuts = [0];
  for (let row = 1; row < rows; row++) {
    const expected = height * row / rows, radius = height / rows / 3;
    let best = Math.round(expected), score = Infinity;
    for (let y = Math.max(cuts[cuts.length - 1] + 1, Math.floor(expected - radius)); y < Math.min(height - 1, expected + radius); y++) {
      const candidate = counts[y] * width + Math.abs(y - expected);
      if (candidate < score) { score = candidate; best = y; }
    }
    cuts.push(best);
  }
  return [...cuts, height];
}

export function classPoseRow(state: CharacterAnimState, frame: number, compact = false): number {
  const f = ((Math.floor(frame) % 8) + 8) % 8;
  if (state === 'run') return compact ? [1, 1, 2, 2, 1, 1, 2, 2][f] : [1, 1, 2, 2, 3, 3, 2, 2][f];
  if (state === 'attack' || state === 'strike' || state === 'magic') return compact ? [0, 3, 3, 4, 4, 5, 5, 0][f] : [0, 4, 4, 5, 5, 6, 6, 0][f];
  if (state === 'victory') return 4;
  return 0;
}

export function actionPoseRow(state: CharacterAnimState, frame: number): number {
  if (state === 'magic') return frame % 8 < 3 ? 0 : 1;
  if (state === 'counter') return 2;
  if (state === 'hurt') return 3;
  if (state === 'defeat') return 4;
  return 5;
}

class ClassArtAtlas {
  private atlases = new Map<string, { image: HTMLImageElement; cuts: number[]; ready: boolean }>();
  private frames = canvasBudget<string>(8);

  getFrame(job: string, dir: IsoDirection, state: CharacterAnimState, frame: number, visualClass = job): HTMLCanvasElement | null {
    if (!CLASSES.has(job) || typeof document === 'undefined') return null;
    const supplemental = ['magic', 'counter', 'hurt', 'defeat', 'victory'].includes(state);
    const atlasKey = `${job}_${supplemental ? 'actions' : 'motion'}`;
    let atlas = this.atlases.get(atlasKey);
    if (!atlas) {
      const image = createArtworkImage();
      atlas = { image, cuts: [], ready: false };
      this.atlases.set(atlasKey, atlas);
      const entry = atlas;
      image.onload = () => {
        const scratch = document.createElement('canvas'); scratch.width = image.naturalWidth; scratch.height = image.naturalHeight;
        const ctx = scratch.getContext('2d')!; ctx.drawImage(image, 0, 0);
        entry.cuts = atlasRowCuts(ctx.getImageData(0, 0, scratch.width, scratch.height).data, scratch.width, scratch.height, supplemental || job === 'cleric' ? 6 : 7);
        entry.ready = true;
        window.dispatchEvent(new CustomEvent('class-art-loaded'));
      };
      image.src = `/assets/art-v2/${job}-${supplemental ? 'actions' : 'motion'}-atlas.webp`;
    }
    if (!atlas.ready) return null;
    const row = supplemental ? actionPoseRow(state, frame) : classPoseRow(state, frame, job === 'cleric');
    const col = DIRECTIONS.indexOf(dir);
    const key = `${atlasKey}_${row}_${col}_${visualClass}`;
    const cached = this.frames.get(key);
    if (cached) return cached;
    const image = atlas.image;
    const left = Math.round(col * image.naturalWidth / 8), right = Math.round((col + 1) * image.naturalWidth / 8);
    const top = atlas.cuts[row], bottom = atlas.cuts[row + 1];
    // One uniform scale for every pose in a class. Foot alignment changes translation,
    // never the body's size, so different limb poses cannot breathe in and out in scale.
    const scale = 64 / (image.naturalWidth / 8);
    const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 80;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, left, top, right - left, bottom - top, 8, 0, Math.round((right - left) * scale), Math.min(80, Math.round((bottom - top) * scale)));
    const pixels = ctx.getImageData(0, 0, 80, 80);
    isolateAtlasCell(pixels.data, 80, 80);
    const ramp = PROMOTION_RAMPS[JOB_VISUALS[visualClass]?.style || visualClass];
    if (ramp) for (let i = 0; i < pixels.data.length; i += 4) {
      const [r, g, b] = pixels.data.subarray(i, i + 3);
      if (!pixels.data[i + 3] || b <= r * 1.1 || b <= g || b < 40 || b > 190) continue;
      const t = Math.min(1, Math.max(0, (b - 25) / 145));
      for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.round(ramp[0][c] + (ramp[1][c] - ramp[0][c]) * t);
    }
    let baseY = 0;
    for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) if (pixels.data[(y * 80 + x) * 4 + 3]) baseY = y;
    let sumX = 0, count = 0;
    for (let y = Math.max(0, baseY - 3); y <= baseY; y++) for (let x = 0; x < 80; x++) {
      if (pixels.data[(y * 80 + x) * 4 + 3]) { sumX += x; count++; }
    }
    ctx.putImageData(pixels, 0, 0);
    const settled = document.createElement('canvas'); settled.width = 80; settled.height = 80;
    const out = settled.getContext('2d')!; out.imageSmoothingEnabled = false;
    out.drawImage(canvas, 40 - Math.round(sumX / Math.max(1, count)), 68 - baseY);
    if (this.frames.size >= 768) this.frames.delete(this.frames.keys().next().value!);
    this.frames.set(key, settled);
    return settled;
  }
}
export const classArtAtlas = new ClassArtAtlas();
