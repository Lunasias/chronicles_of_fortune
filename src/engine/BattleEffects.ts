import { actorScaleForViewport } from './ArtDirection';
import { combatArtFrame, combatArtProfile, generatedCombatArt } from './GeneratedCombatArt';
import type { MagicElement } from './MagicArt';
export type BattleEffectKind = MagicElement | 'slash' | 'smash' | 'parry' | 'guard' | 'heal' | 'summon' | 'nova' | 'beam' | 'evade';
export interface BattleEffect {
  kind:BattleEffectKind; x:number; y:number; fromX:number; fromY:number;
  age:number; duration:number; power:number; color?:string; delay:number; artId:string;
}
/** Playback of generated raster animation only. The source images provide every visible effect pixel. */
export class BattleEffects {
  public active:BattleEffect[]=[];
  emit(kind:BattleEffectKind,x:number,y:number,options:Partial<Pick<BattleEffect,'fromX'|'fromY'|'power'|'color'|'delay'|'artId'>>={}) {
    if(![x,y,options.fromX??x,options.fromY??y].every(Number.isFinite))return;
    this.active.push({kind,x,y,fromX:x,fromY:y,age:0,duration:kind==='slash'?32:kind==='evade'?30:64,power:1,delay:0,artId:'common_'+kind,...options});
    if(this.active.length>40)this.active.splice(0,this.active.length-40);
  }
  update(){for(const effect of this.active)effect.age++;this.active=this.active.filter(e=>e.age<e.duration+e.delay);}
  clear(){this.active.length=0;}
  render(ctx:CanvasRenderingContext2D,w:number,h:number,reduced=false,balanced=false){
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.imageSmoothingEnabled=false;
    // Secondary accents remain below the primary art in a bounded stack during multi-hit bursts.
    for(const e of this.active.slice(balanced?-8:-14)){
      const age=e.age-e.delay;if(age<0)continue;
      const frame=combatArtFrame(age,e.duration,reduced),image=generatedCombatArt.frame(e.artId,frame);if(!image)continue;
      const profile=combatArtProfile(e.artId),base=actorScaleForViewport(w,h);
      const foot=e.y+(e.kind==='summon'||e.kind==='heal'?0:36);
      // Whole-pixel sizing also keeps the top of tall wings/columns inside the arena.
      const fit=Math.max(1,Math.floor(foot/profile.footY));
      const scale=Math.max(1,Math.min(fit,base+1,e.power>=1.4?base+1:e.power<.8?base-1:base));
      const size=128*scale;
      ctx.globalAlpha=Math.max(0,Math.min(1,age/Math.max(1,reduced?8:3), (e.duration-age)/Math.max(1,reduced?18:7)));
      const dx=Math.round(e.x-size/2),dy=Math.round(foot-profile.footY*scale);
      if(e.kind==='beam'&&e.fromX>e.x){ctx.save();ctx.translate(Math.round(e.x)*2,0);ctx.scale(-1,1);ctx.drawImage(image,dx,dy,size,size);ctx.restore();}
      else ctx.drawImage(image,dx,dy,size,size);
    }
    ctx.restore();
  }
}
