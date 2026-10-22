import { createArtworkImage } from './ArtworkLoading';
import { JOB_VISUALS } from './JobVisuals';
import type { CharacterAnimState } from './PixelSpriteGenerator';
import { allCompanionKeys } from '../game/CompanionDatabase';
import { isolateAtlasCell } from './AtlasSprites';
import { canvasBudget } from './PerformanceBudget';

/** Delivered sheets can have slightly uneven gutters. Cut through transparency,
 * rather than assuming that every requested cell size was returned verbatim. */
export function presentationCuts(pixels: Uint8ClampedArray, width: number, height: number, count: number, horizontal = false): number[] {
  const length = horizontal ? width : height, span = horizontal ? height : width;
  const counts = new Uint32Array(length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 80) counts[horizontal ? x : y]++;
  const cuts = [0];
  for (let cell = 1; cell < count; cell++) {
    const expected = length * cell / count, radius = length / count / 3;
    let best = Math.round(expected), bestScore = Infinity;
    for (let i = Math.max(cuts[cuts.length - 1] + 1, Math.floor(expected - radius)); i < Math.min(length, expected + radius); i++) {
      const score = counts[i] * span + Math.abs(i - expected);
      if (score < bestScore) { bestScore = score; best = i; }
    }
    cuts.push(best);
  }
  return [...cuts, length];
}

export const PROMOTION_ROWS = ['paladin', 'berserker', 'archmage', 'necromancer', 'ninja', 'assassin', 'high_priest', 'saint', 'rune_master'] as const;
export const IMPACT_ROWS = ['normal', 'heavy', 'critical', 'block', 'counter', 'ward'] as const;
export type ImpactStyle = typeof IMPACT_ROWS[number];
export type PresentationSheet = 'promotion-2' | 'promotion-3' | 'companions-1' | 'companions-2' | 'companions-3' | 'world' | 'impact';
export const PRESENTATION_SHEETS: Record<PresentationSheet, { columns: number; rows: number }> = {
  'promotion-2': { columns: 4, rows: 9 }, 'promotion-3': { columns: 4, rows: 9 },
  'companions-1': { columns: 3, rows: 9 }, 'companions-2': { columns: 3, rows: 9 }, 'companions-3': { columns: 3, rows: 9 },
  world: { columns: 6, rows: 6 }, impact: { columns: 6, rows: 6 }
};

export function promotionPose(state: CharacterAnimState, frame: number): number {
  const f = Math.max(0, Math.floor(frame)) % 8;
  if (state === 'attack' || state === 'strike' || state === 'magic') return f < 2 ? 1 : f < 6 ? 2 : 3;
  return 0;
}
export function companionActionFrame(progress: number, reduced: boolean): number {
  return reduced ? 1 : progress < .24 ? 0 : progress < .7 ? 1 : 2;
}
export function ambientFrame(time: number, seed: number, reduced: boolean): number {
  return reduced ? 0 : Math.floor(Math.max(0, time) / 160 + Math.abs(seed) * 1.7) % 6;
}

/** Versioned generated artwork. Cell extraction never recolours or resynthesizes it. */
export class PresentationArt {
  private sources = new Map<PresentationSheet, { image: HTMLImageElement; ready: boolean; promise: Promise<boolean>; rows: number[]; columns: number[]; unit: number }>();
  private frames = canvasBudget<string>(8);

  preload(sheet: PresentationSheet): Promise<boolean> {
    const found = this.sources.get(sheet);
    if (found) return found.promise;
    if (typeof document === 'undefined') return Promise.resolve(false);
    const image = createArtworkImage();
    let finish!: (ok: boolean) => void;
    const entry = { image, ready: false, promise: new Promise<boolean>(resolve => { finish = resolve; }), rows: [] as number[], columns: [] as number[], unit: 0 };
    this.sources.set(sheet, entry);
    const timeout = setTimeout(() => finish(false), 12000);
    image.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const spec = PRESENTATION_SHEETS[sheet];
      entry.rows = presentationCuts(pixels, canvas.width, canvas.height, spec.rows);
      entry.columns = presentationCuts(pixels, canvas.width, canvas.height, spec.columns, true);
      entry.unit = Math.max(...entry.rows.slice(1).map((cut, i) => cut - entry.rows[i]), ...entry.columns.slice(1).map((cut, i) => cut - entry.columns[i]));
      entry.ready = true; finish(true);
    };
    image.onerror = () => { clearTimeout(timeout); finish(false); };
    image.src = `/assets/presentation-v1/${sheet}.png`;
    return entry.promise;
  }

  cell(sheet: PresentationSheet, column: number, row: number, size = 128, actor = false, flip = false): HTMLCanvasElement | null {
    const spec = PRESENTATION_SHEETS[sheet];
    if (column < 0 || column >= spec.columns || row < 0 || row >= spec.rows) return null;
    const key = `${sheet}:${column}:${row}:${size}:${actor}:${flip}`;
    const cached = this.frames.get(key);
    if (cached) { this.frames.delete(key); this.frames.set(key, cached); return cached; }
    void this.preload(sheet);
    const source = this.sources.get(sheet);
    if (!source?.ready) return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const { image } = source;
    const x = source.columns[column], y = source.rows[row];
    const cw = source.columns[column + 1] - x, ch = source.rows[row + 1] - y;
    if (flip) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    // The 144px battle output shares the existing actor foot at (72,97).
    const drawSize = actor ? 104 : size;
    // A shared source scale prevents bodies changing size between animation cells.
    const scale = drawSize / source.unit;
    const dw = Math.round(cw * scale), dh = Math.round(ch * scale);
    ctx.drawImage(image, x, y, cw, ch, Math.round((size - dw) / 2), actor ? 101 - dh : size - dh, dw, dh);
    if (sheet.startsWith('companions')) {
      const pixels = ctx.getImageData(0,0,size,size);
      isolateAtlasCell(pixels.data,size,size); ctx.putImageData(pixels,0,0);
    }
    let output = canvas;
    if (actor || sheet.startsWith('companions')) {
      const pixels = ctx.getImageData(0,0,size,size).data;
      let foot = 0;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (pixels[(y * size + x) * 4 + 3] >= 80) foot = y;
      output = document.createElement('canvas'); output.width = output.height = size;
      const settled = output.getContext('2d')!; settled.imageSmoothingEnabled = false;
      settled.drawImage(canvas, 0, (actor ? 97 : 54) - foot);
    }
    if (this.frames.size >= 240) this.frames.delete(this.frames.keys().next().value!);
    this.frames.set(key, output);
    return output;
  }

  promoted(job: string, state: CharacterAnimState, frame: number, flip = false): HTMLCanvasElement | null {
    const identity = JOB_VISUALS[job];
    if (!identity) return null;
    const row = PROMOTION_ROWS.indexOf(identity.style as typeof PROMOTION_ROWS[number]);
    const pose = state === 'hurt' || state === 'defeat' ? 3 : promotionPose(state, frame);
    return row < 0 ? null : this.cell(identity.tier === 3 ? 'promotion-3' : 'promotion-2', pose, row, 144, true, flip);
  }

  companion(key: string, progress: number, reduced: boolean): HTMLCanvasElement | null {
    const index = allCompanionKeys().indexOf(key);
    if (index < 0) return null;
    return this.cell(`companions-${Math.floor(index / 9) + 1}` as PresentationSheet, companionActionFrame(progress, reduced), index % 9, 64);
  }
}
export const presentationArt = new PresentationArt();
