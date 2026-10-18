import { actorScaleForViewport } from './ArtDirection';
import { combatArtFrame, combatArtProfile, generatedCombatArt } from './GeneratedCombatArt';
import type { MagicElement } from './MagicArt';
import { presentationArt, IMPACT_ROWS, type ImpactStyle } from './PresentationArt';
export type BattleEffectKind = MagicElement | 'slash' | 'smash' | 'parry' | 'guard' | 'heal' | 'summon' | 'nova' | 'beam' | 'evade';
export interface BattleEffect {
  kind:BattleEffectKind; x:number; y:number; fromX:number; fromY:number;
  age:number; duration:number; power:number; color?:string; delay:number; artId:string; impactStyle?:ImpactStyle;
}
/** Playback of generated raster animation only. The source images provide every visible effect pixel. */
export class BattleEffects {
  public active:BattleEffect[]=[];
  impact(style: ImpactStyle, x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.emit('smash', x, y, {duration: style === 'heavy' || style === 'critical' ? 34 : 26});
    const effect = this.active[this.active.length - 1];
    if (effect) { effect.impactStyle = style; effect.artId = 'common_smash'; }
  }
  emit(kind:BattleEffectKind,x:number,y:number,options:Partial<Pick<BattleEffect,'fromX'|'fromY'|'power'|'color'|'delay'|'duration'|'artId'>>={}) {
    if(![x,y,options.fromX??x,options.fromY??y].every(Number.isFinite))return;
    this.active.push({kind,x,y,fromX:x,fromY:y,age:0,duration:kind==='slash'?32:kind==='evade'?30:42,power:1,delay:0,artId:'common_'+kind,...options});
    if(this.active.length>40)this.active.splice(0,this.active.length-40);
  }
  update(){for(const effect of this.active)effect.age++;this.active=this.active.filter(e=>e.age<e.duration+e.delay);}
  clear(){this.active.length=0;}
  render(ctx:CanvasRenderingContext2D,w:number,h:number,reduced=false,balanced=false){
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.imageSmoothingEnabled=false;
    // A signature is a complete composition. Suppress other full compositions in
    // the same hit zone instead of piling shields, novas and beams over it.
    const visible = this.active.filter(e => e.age >= e.delay && e.age < e.delay + e.duration)
      .sort((a,b) => (Number(!b.artId.startsWith('common_')) * 10 + b.power) - (Number(!a.artId.startsWith('common_')) * 10 + a.power));
    const painted: BattleEffect[] = [];
    for(const e of visible){
      if (painted.length >= (balanced ? 2 : 4)) break;
      if (painted.some(p => Math.hypot(p.x-e.x,p.y-e.y) < 96 * Math.min(2, actorScaleForViewport(w,h)))) continue;
      const age=e.age-e.delay;if(age<0)continue;
      // Actor anticipation has already finished when contact is emitted. Start
      // these contact sheets at the peak so the damage number and spark agree.
      const frame=e.impactStyle ? reduced ? 3 : Math.min(5, 3 + Math.floor(age / e.duration * 3)) : combatArtFrame(age,e.duration,reduced);
      const image=(e.impactStyle ? presentationArt.cell('impact',frame,IMPACT_ROWS.indexOf(e.impactStyle)) : null) || generatedCombatArt.frame(e.artId,frame);if(!image)continue;
      const profile=combatArtProfile(e.artId),base=actorScaleForViewport(w,h);
      const foot=e.y+(e.kind==='summon'||e.kind==='heal'?0:36);
      const footY=e.impactStyle ? 84 : profile.footY;
      // Whole-pixel sizing also keeps the top of tall wings/columns inside the arena.
      const fit=Math.max(1,Math.floor(foot/footY));
      const scale=Math.max(1,Math.min(fit,2,e.power<.8?base-1:base));
      const size=128*scale;
      ctx.globalAlpha=Math.max(0,Math.min(1,age/Math.max(1,reduced?8:3), (e.duration-age)/Math.max(1,reduced?18:7)));
      const dx=Math.round(e.x-size/2),dy=Math.round(foot-footY*scale);
      if(e.kind==='beam'&&e.fromX>e.x){ctx.save();ctx.translate(Math.round(e.x)*2,0);ctx.scale(-1,1);ctx.drawImage(image,dx,dy,size,size);ctx.restore();}
      else ctx.drawImage(image,dx,dy,size,size);
      painted.push(e);
    }
    ctx.restore();
  }
}
