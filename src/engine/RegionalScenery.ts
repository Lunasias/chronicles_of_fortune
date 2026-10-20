import { createArtworkImage } from './ArtworkLoading';
import { backdropKey, type BackdropKey } from './GeneratedBackdrops';
import { roadField, worldNoise } from './WorldEcology';
import type { BoardNode } from '../game/BoardMap';
import type { TerrainTile } from './IsometricTerrainEngine';

export const REGIONAL_SLOTS = ['nature_large','nature_alternate','undergrowth','rocks','town','shop_item','shop_weapon','shop_magic','church','dark_gate','vault','boss','tavern','guild','fishing','isekai_event','mystery_chest','home','capital','bridge','cliff','landmark','wall','stairs'] as const;
export type RegionalSlot = typeof REGIONAL_SLOTS[number];
export interface RegionalScenery { x:number; y:number; depth:number; theme:BackdropKey; slot:RegionalSlot; roadDistance:number }

class RegionalArt {
  private images = new Map<BackdropKey,HTMLImageElement>();
  private cache = new Map<string,HTMLCanvasElement>();
  get(theme:BackdropKey,slot:RegionalSlot):HTMLCanvasElement|null {
    let image=this.images.get(theme);
    if(!image){image=createArtworkImage();this.images.set(theme,image);image.src=`/assets/art-v2/world-rebuild-v1/${theme}.png`;}
    if(!image.complete||!image.naturalWidth)return null;
    const key=`${theme}:${slot}`;const cached=this.cache.get(key);if(cached)return cached;
    const index=REGIONAL_SLOTS.indexOf(slot),canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
    const left=Math.round(index%6*image.naturalWidth/6),top=Math.round(Math.floor(index/6)*image.naturalHeight/4);
    const right=Math.round((index%6+1)*image.naturalWidth/6),bottom=Math.round((Math.floor(index/6)+1)*image.naturalHeight/4);
    ctx.drawImage(image,left,top,right-left,bottom-top,0,0,128,128);
    const pixels=ctx.getImageData(0,0,128,128).data;let foot=112;
    outer:for(let y=127;y>=0;y--)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>=100){foot=y;break outer;}
    canvas.dataset.footY=String(foot);this.cache.set(key,canvas);return canvas;
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
