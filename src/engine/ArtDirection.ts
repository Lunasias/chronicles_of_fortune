/** Shared world-pixel contract. Actors stand at this point in their roomy FX canvases. */
export const ACTOR_SIZE = 144;
export const ACTOR_FOOT_X = 72;
export const ACTOR_FOOT_Y = 97;

export type GraphicsQuality = 'high' | 'balanced';
export interface GraphicsPreferences {
  quality: GraphicsQuality;
  reducedMotion: boolean;
  labels: 'hover' | 'all';
}
export function normalizeGraphicsPreferences(value: unknown): GraphicsPreferences {
  const source = value && typeof value === 'object' ? value as Partial<GraphicsPreferences> : {};
  return {
    quality: source.quality === 'balanced' ? 'balanced' : 'high',
    reducedMotion: source.reducedMotion === true,
    labels: source.labels === 'all' ? 'all' : 'hover'
  };
}

export function animationPoseIndex(state: string, frame: number): number {
  const beat = ((Math.floor(Number.isFinite(frame) ? frame : 0) % 8) + 8) % 8;
  const sequence = ['attack', 'strike', 'magic'].includes(state)
    ? [0, 0, 1, 2, 2, 3, 3, 3] : [0, 0, 1, 1, 2, 2, 3, 3];
  return sequence[beat];
}

export function actorScaleForViewport(width: number, height: number): number {
  return width >= 760 && height >= 360 ? 2 : 1;
}
