import rawProfiles from './combat-art.json';
export interface CombatArtProfile { id:string; group:string; name:string; skill:string; sheet:number; row:number; footY:number }
export interface CombatArtOwner { job?:string; name?:string; skill?:string; companionKey?:string; isDarkling?:boolean }
export const COMBAT_ART_PROFILES: readonly CombatArtProfile[] = rawProfiles;
const byId = new Map(COMBAT_ART_PROFILES.map(p=>[p.id,p]));
export function resolveCombatArt(owner:CombatArtOwner = {}, action='skill'):string {
  if(owner.companionKey && byId.has('companion_'+owner.companionKey))return 'companion_'+owner.companionKey;
  if(owner.isDarkling)return 'darkling';
  if(owner.job && byId.has(owner.job))return owner.job;
  if(owner.name){
    const profiles=COMBAT_ART_PROFILES.filter(p=>p.group==='monster'&&p.name===owner.name);
    const match=profiles.find(p=>p.skill===owner.skill)||profiles[0];if(match)return match.id;
    const companion=COMBAT_ART_PROFILES.find(p=>p.group==='companion'&&p.name===owner.name);if(companion)return companion.id;
  }
  const common='common_'+action;return byId.has(common)?common:'common_arcane';
}
export function combatArtProfile(id:string):CombatArtProfile {return byId.get(id)||byId.get('common_arcane')!;}
export function combatArtFrame(age:number,duration:number,reduced=false):number {
  if(reduced)return 3;
  const t=Math.max(0,Math.min(.999,age/Math.max(1,duration)));
  return t<.08?0:t<.2?1:t<.34?2:t<.59?3:t<.78?4:5;
}
interface Sheet {image:HTMLImageElement; ready:boolean; promise:Promise<boolean>}
/** Only copies generated PNG pixels. No procedural effect, recolor, alpha stripping or island removal. */
export class GeneratedCombatArt {
  private sheets=new Map<number,Sheet>();
  private frames=new Map<string,HTMLCanvasElement>();
  private ensure(index:number):Sheet {
    const existing=this.sheets.get(index);if(existing){this.sheets.delete(index);this.sheets.set(index,existing);return existing;}
    const image=new Image();let resolve!:(ok:boolean)=>void;
    const entry:Sheet={image,ready:false,promise:new Promise(ok=>{resolve=ok;})};
    this.sheets.set(index,entry);
    const timeout=setTimeout(()=>resolve(false),12000);
    image.onload=()=>{clearTimeout(timeout);entry.ready=true;resolve(true);if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('combat-art-loaded'));};
    image.onerror=()=>{clearTimeout(timeout);resolve(false);this.sheets.delete(index);};
    image.src=`/assets/combat-v3/combat-${String(index).padStart(2,'0')}.png`;
    // Keep the most recent eight source atlases; extracted 128px frames have a separate bounded LRU.
    if(this.sheets.size>8)for(const [key,value]of this.sheets){if(key!==index&&value.ready){this.sheets.delete(key);break;}}
    return entry;
  }
  preload(ids:readonly string[]):Promise<boolean[]> {return Promise.all([...new Set(ids.map(id=>combatArtProfile(id).sheet))].map(index=>this.ensure(index).promise));}
  frame(id:string,frame:number):HTMLCanvasElement|null {
    const key=id+':'+frame, cached=this.frames.get(key);if(cached){this.frames.delete(key);this.frames.set(key,cached);return cached;}
    const profile=combatArtProfile(id),source=this.ensure(profile.sheet);if(!source.ready)return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
    const cw=source.image.naturalWidth/6,ch=source.image.naturalHeight/4;
    ctx.drawImage(source.image,Math.round(frame*cw),Math.round(profile.row*ch),Math.round(cw),Math.round(ch),0,0,128,128);
    this.frames.set(key,canvas);if(this.frames.size>144)this.frames.delete(this.frames.keys().next().value!);
    return canvas;
  }
}
export const generatedCombatArt=new GeneratedCombatArt();
