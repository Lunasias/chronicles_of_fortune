import { createArtworkImage } from './ArtworkLoading';
import { vibrantChannel } from './VibrantPalette';
export const MATERIAL_ORDER = ['grass', 'forest', 'snow', 'desert', 'volcano', 'cavern', 'coral', 'celestial', 'abyss', 'fairy_grove', 'crystal_cavern', 'castle', 'steampunk', 'waterfall_forest', 'sakura_shrine', 'path'];

/** Project a real pixel material onto the same 96×48 diamond used by actors and buildings. */
export function projectGroundMaterial(target: Uint8ClampedArray, source: Uint8ClampedArray, variant: number, night: boolean) {
  const size = 96;
  for (let y = 5; y < 52; y++) for (let x = 5; x < 100; x++) {
    const dx = (x - 52) / 48, dy = (y - 28) / 24;
    if (Math.abs(dx) + Math.abs(dy) >= .96) continue;
    const u = ((Math.floor((dx + dy + 1) * 48) + variant * 23) % size + size) % size;
    const v = ((Math.floor((dy - dx + 1) * 48) + variant * 31) % size + size) % size;
    const from = (v * size + u) * 4, to = (y * 104 + x) * 4;
    if (!target[to + 3]) continue;
    const blend = Math.min(.84, (1 - Math.abs(dx) - Math.abs(dy)) * 7);
    for (let c = 0; c < 3; c++) {
      const lit = vibrantChannel(source[from], source[from + 1], source[from + 2], c) * (night ? [.49, .58, .72][c] : 1);
      target[to + c] = Math.round(target[to + c] * (1 - blend) + lit * blend);
    }
  }
}

export class GroundMaterials {
  private image: HTMLImageElement | null = null;
  private ready = false;
  private cells = new Map<string, Uint8ClampedArray>();
  private pathCanvases = new Map<boolean,HTMLCanvasElement>();
  constructor(private onReady: () => void) {}

  pathPattern(ctx: CanvasRenderingContext2D, night: boolean): CanvasPattern | null {
    if (!this.ready || !this.image) return null;
    let canvas=this.pathCanvases.get(night);
    if(!canvas){
      canvas=document.createElement('canvas');canvas.width=canvas.height=96;
      const out=canvas.getContext('2d')!;out.imageSmoothingEnabled=false;
      const cw=this.image.naturalWidth/4,ch=this.image.naturalHeight/4;
      out.drawImage(this.image,Math.round(cw*3),Math.round(ch*3),Math.round(cw),Math.round(ch),0,0,96,96);
      if(night){out.globalCompositeOperation='multiply';out.fillStyle='#8096ba';out.fillRect(0,0,96,96);}
      this.pathCanvases.set(night,canvas);
    }
    return ctx.createPattern(canvas,'repeat');
  }

  apply(data: Uint8ClampedArray, biome: string, variant: number, night: boolean) {
    if (!this.image) {
      this.image = createArtworkImage();
      this.image.onload = () => { this.ready = true; this.onReady(); window.dispatchEvent(new CustomEvent('world-art-loaded')); };
      this.image.src = '/assets/art-v2/world-ground-materials.png';
    }
    if (!this.ready) return;
    const key = MATERIAL_ORDER.includes(biome) ? biome : 'grass';
    let cell = this.cells.get(key);
    if (!cell) {
      const index = MATERIAL_ORDER.indexOf(key), canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
      const cw = this.image.naturalWidth / 4, ch = this.image.naturalHeight / 4;
      ctx.drawImage(this.image, Math.round(index % 4 * cw), Math.round(Math.floor(index / 4) * ch), Math.round(cw), Math.round(ch), 0, 0, 96, 96);
      cell = ctx.getImageData(0, 0, 96, 96).data; this.cells.set(key, cell);
    }
    projectGroundMaterial(data, cell, variant, night);
  }
}
