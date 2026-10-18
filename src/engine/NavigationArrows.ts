import { createArtworkImage } from './ArtworkLoading';

export interface NavigationPoint { id: number; x: number; y: number }
export interface DirectionGuide extends NavigationPoint { sector: number; count: number }
export function markerClearance(type: string): number {
  return type === 'boss' ? 108 : ['capital','town','shop_item','shop_weapon','shop_magic','church','dark_gate','vault','tavern','guild','fishing','isekai_event','mystery_chest','home'].includes(type) ? 92 : 62;
}
/** Screen-space directions match the actual projected map, including elevation. */
export function offscreenDirectionGuides(hero: {x:number;y:number}, targets: NavigationPoint[], width:number, height:number): DirectionGuide[] {
  const top = width < 768 ? Math.min(210, height * .3) : Math.min(125, height * .24);
  const bottom = height - 100;
  const center = {x:Math.max(82,Math.min(width-82,hero.x)),y:Math.max(top+76,Math.min(bottom-100,hero.y-32))};
  const groups = new Map<number,{target:NavigationPoint;count:number;distance:number}>();
  for (const target of targets) {
    if (![target.x,target.y].every(Number.isFinite)) continue;
    const behindMinimap = width >= 768 && target.x > width-176 && target.y < 330;
    if (!behindMinimap && target.x >= 32 && target.x <= width-32 && target.y >= top && target.y <= bottom) continue;
    const dx=target.x-hero.x,dy=target.y-hero.y;
    const sector=((Math.round(Math.atan2(dy,dx)/(Math.PI/4))+2)%8+8)%8;
    const distance=Math.hypot(dx,dy),existing=groups.get(sector);
    if (!existing) groups.set(sector,{target,count:1,distance});
    else {existing.count++;if(distance<existing.distance){existing.target=target;existing.distance=distance;}}
  }
  return [...groups.entries()].sort(([a],[b])=>a-b).map(([sector,group])=>{
    const angle=sector*Math.PI/4-Math.PI/2;
    return {id:group.target.id,sector,count:group.count,x:Math.round(center.x+Math.cos(angle)*70),y:Math.round(center.y+Math.sin(angle)*62)};
  });
}

class NavigationArrows {
  private image: HTMLImageElement | null = null;
  private ready = false;
  private frames = new Map<number,HTMLCanvasElement>();
  frame(index: number): HTMLCanvasElement | null {
    if (!this.image) {
      this.image=createArtworkImage();
      this.image.onload=()=>{this.ready=true;};
      this.image.src='/assets/art-v2/navigation-arrows-v1.png';
    }
    if (!this.ready) return null;
    const cached=this.frames.get(index);if(cached)return cached;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
    const left=Math.round(index%3*this.image.naturalWidth/3),top=Math.round(Math.floor(index/3)*this.image.naturalHeight/3);
    const right=Math.round((index%3+1)*this.image.naturalWidth/3),bottom=Math.round((Math.floor(index/3)+1)*this.image.naturalHeight/3);
    ctx.drawImage(this.image,left,top,right-left,bottom-top,0,0,64,64);
    this.frames.set(index,canvas);return canvas;
  }
}
export const navigationArrows=new NavigationArrows();
