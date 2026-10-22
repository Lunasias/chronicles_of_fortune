import { createArtworkImage } from './ArtworkLoading';
import { backdropKey, type BackdropKey } from './GeneratedBackdrops';
import { roadField, worldNoise } from './WorldEcology';
import type { BoardNode } from '../game/BoardMap';
import type { TerrainTile } from './IsometricTerrainEngine';
import completionArt from './map-completion-art.json';
import { regionalSpriteFit, splitRegionalAtlas, type RegionalSpritePixels } from './RegionalSpriteExtraction';

export const REGIONAL_SLOTS = ['nature_large','nature_alternate','undergrowth','rocks','town','shop_item','shop_weapon','shop_magic','church','dark_gate','vault','boss','tavern','guild','fishing','isekai_event','mystery_chest','home','capital','bridge','cliff','landmark','wall','stairs'] as const;
export type RegionalSlot = typeof REGIONAL_SLOTS[number];
export interface RegionalScenery { x:number; y:number; depth:number; theme:BackdropKey; slot:RegionalSlot; roadDistance:number }

class RegionalArt {
  private images = new Map<BackdropKey,HTMLImageElement>();
  private replacementImages = new Map<string,HTMLImageElement>();
  private preparedThemes = new Set<BackdropKey>();
  private cache = new Map<string,HTMLCanvasElement>();
  private sprite(source: CanvasImageSource, width: number, height: number, maxScale = Infinity): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const fit = regionalSpriteFit(width, height, 128, 4, maxScale);
    ctx.drawImage(source, fit.x, fit.y, fit.width, fit.height);
    const data = ctx.getImageData(0, 0, 128, 128).data;
    let foot = fit.footY;
    outer: for (let y = 127; y >= 0; y--) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3] >= 100) { foot = y; break outer; }
    canvas.dataset.footY = String(foot);
    return canvas;
  }
  private pixelsSprite(region: RegionalSpritePixels, maxScale = Infinity): HTMLCanvasElement {
    const source = document.createElement('canvas'); source.width = region.width; source.height = region.height;
    const ctx = source.getContext('2d')!, pixels = ctx.createImageData(region.width, region.height);
    pixels.data.set(region.pixels); ctx.putImageData(pixels, 0, 0);
    return this.sprite(source, region.width, region.height, maxScale);
  }
  private prepare(theme: BackdropKey, image: HTMLImageElement) {
    if (this.preparedThemes.has(theme)) return;
    const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight;
    const ctx = source.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const regions = splitRegionalAtlas(ctx.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
    const maxScale = 128 / Math.min(source.width / 6, source.height / 4);
    regions.forEach((region, index) => { if (region) this.cache.set(`${theme}:${REGIONAL_SLOTS[index]}`, this.pixelsSprite(region, maxScale)); });
    this.preparedThemes.add(theme);
  }
  get(theme:BackdropKey,slot:RegionalSlot):HTMLCanvasElement|null {
    const key=`${theme}:${slot}`;
    const replacement=(completionArt as Record<string,string>)[key];
    if(replacement){
      const cached=this.cache.get(`replacement:${key}`);if(cached)return cached;
      let image=this.replacementImages.get(key);
      if(!image){image=createArtworkImage();this.replacementImages.set(key,image);image.src=replacement;}
      if(!image.complete||!image.naturalWidth)return null;
      // A one-object file has no cell boundary to clip its crown, branches or roots.
      const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;
      const ctx=source.getContext('2d')!;ctx.drawImage(image,0,0);
      const region=splitRegionalAtlas(ctx.getImageData(0,0,source.width,source.height).data,source.width,source.height,1,1)[0];
      if(!region)return null;
      const sprite=this.pixelsSprite(region);this.cache.set(`replacement:${key}`,sprite);return sprite;
    }
    let image=this.images.get(theme);
    if(!image){image=createArtworkImage();this.images.set(theme,image);image.src=`/assets/art-v2/world-rebuild-v1/${theme}.png`;}
    if(!image.complete||!image.naturalWidth)return null;
    this.prepare(theme,image);
    return this.cache.get(key)||null;
  }
}
export const regionalArt=new RegionalArt();

export function regionalSlotForNode(node:BoardNode):RegionalSlot|null {
  if(node.routeKind)return 'bridge';
  if(node.id===0)return 'capital';
  return REGIONAL_SLOTS.includes(node.type as RegionalSlot)?node.type as RegionalSlot:null;
}

/** Designed clusters: settled streets near hubs, native wilderness away from trails, room walls underground. */
export function regionalSceneryLayout(tiles:TerrainTile[],nodes:BoardNode[],project:(x:number,y:number,z:number)=>{x:number;y:number}):RegionalScenery[] {
  const result:RegionalScenery[]=[],distance=roadField(nodes,project);
  const anchors=nodes.map(n=>({...project(n.gx,n.gy,n.gz),node:n}));
  const hubs=anchors.filter(a=>['town','guild','tavern'].includes(a.node.type));
  const underground=nodes[0]?.id>=1000;
  const occupied=new Map<string,{x:number;y:number}[]>();
  for(const tile of tiles){
    const x=tile.x,y=tile.y,roadDistance=distance(x,y);
    if(roadDistance<24)continue;
    const r=worldNoise(tile.gx,tile.gy,91),cluster=worldNoise(Math.floor(tile.gx/5),Math.floor(tile.gy/5),92);
    const hub=hubs.some(a=>Math.hypot(a.x-x,a.y-y)<260);
    const lush=['forest','waterfall_forest','fairy_grove','snow','sakura_shrine'].includes(tile.biome);
    if(r>(underground?.67:hub?.58: lush?.75:.62))continue;
    let slot:RegionalSlot;
    const variant=Math.floor(worldNoise(tile.gx,tile.gy,97)*4);
    if(underground)slot=tile.isEdge?(['wall','cliff','landmark','rocks'] as const)[variant]:r<.12?'stairs':r<.24?'cliff':r<.34?'landmark':(['nature_large','nature_alternate','undergrowth','rocks'] as const)[variant];
    else if(tile.isCoast&&r<.30)slot='cliff';
    else if(hub&&r<.12)slot='home';
    else if(hub&&r<.17)slot='landmark';
    else if((lush||['grass','castle','desert','coral'].includes(tile.biome))&&r<.46)slot=r<.23?'nature_large':'nature_alternate';
    else if(r<.12)slot='landmark';
    else if(r<.32)slot='cliff';
    else slot=r<.47?'rocks':'undergrowth';
    const large=!['rocks','undergrowth'].includes(slot);
    if(large&&roadDistance<42)slot='undergrowth';
    const tall=!['rocks','undergrowth'].includes(slot);
    const clearance=tall?64:38;
    if(anchors.some(a=>Math.abs(a.x-x)<(tall?70:36)&&Math.abs(a.y-y)<(tall?38:20)))continue;
    const bx=Math.floor(x/128),by=Math.floor(y/128);let crowded=false;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if((occupied.get(`${bx+dx},${by+dy}`)||[]).some(p=>Math.abs(p.x-x)<clearance&&Math.abs(p.y-y)<clearance*.46))crowded=true;
    if(crowded)continue;
    const key=`${bx},${by}`,list=occupied.get(key)||[];list.push({x,y});occupied.set(key,list);
    const theme=backdropKey(tile.biome,underground?nodes[0].id:0);
    result.push({x,y,depth:tile.depth+25,theme,slot,roadDistance});
  }
  return result;
}
