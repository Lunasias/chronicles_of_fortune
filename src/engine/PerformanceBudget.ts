/** LRU budget measures decoded RGBA canvas bytes, rather than just object counts. */
export class CanvasBudget<K> extends Map<K, HTMLCanvasElement> {
  public bytes = 0;
  public evictions = 0;
  constructor(public readonly limit: number) { super(); }
  override get(key: K) { const value = super.get(key); if (value) { super.delete(key); super.set(key, value); } return value; }
  override delete(key: K) { const value = super.get(key); if (value) this.bytes -= value.width * value.height * 4; return super.delete(key); }
  override clear() { super.clear(); this.bytes = 0; }
  override set(key: K, value: HTMLCanvasElement): this {
    this.delete(key);
    const bytes = value.width * value.height * 4;
    if (bytes > this.limit) return this;
    while (this.size && this.bytes + bytes > this.limit) { this.delete(this.keys().next().value!); this.evictions++; }
    super.set(key, value); this.bytes += bytes; return this;
  }
}

export function mobileGraphicsDefault(): boolean {
  return typeof navigator !== 'undefined' && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 || typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

const budgets: CanvasBudget<unknown>[] = [];
export function canvasBudget<K>(megabytes: number): CanvasBudget<K> {
  const cache = new CanvasBudget<K>(megabytes * 1024 * 1024 * (mobileGraphicsDefault() ? .5 : 1));
  budgets.push(cache as CanvasBudget<unknown>); return cache;
}

/** Bounded timings are inspectable by QA without allocating a sample every animation frame. */
export class PerformanceMonitor {
  private samples: number[] = [];
  private frame = 0;
  public frames = 0;
  public record(started: number) {
    this.frames++; if (++this.frame % 10 !== 0) return;
    this.samples.push(performance.now() - started); if (this.samples.length > 180) this.samples.shift();
  }
  public snapshot() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return { frames: this.frames, frameP50: sorted[Math.floor(sorted.length * .5)] || 0, frameP95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] || 0, canvasBytes: budgets.reduce((sum, cache) => sum + cache.bytes, 0), canvasBudget: budgets.reduce((sum, cache) => sum + cache.limit, 0), cacheEvictions: budgets.reduce((sum, cache) => sum + cache.evictions, 0), assetRequests: resources.filter(r => /\.(png|webp|ogg|mp3)(\?|$)/.test(r.name)).length, transferBytes: resources.reduce((sum, r) => sum + r.transferSize, 0) };
  }
}
