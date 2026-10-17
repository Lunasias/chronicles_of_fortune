import { pixelDisc, pixelEllipse, pixelRing } from './PixelFx';
import { MAGIC_PALETTES, type MagicElement } from './MagicArt';

export type BattleEffectKind = MagicElement | 'slash' | 'smash' | 'parry' | 'guard' | 'heal' | 'summon' | 'nova' | 'beam' | 'evade';
export interface BattleEffect {
  kind: BattleEffectKind; x: number; y: number; fromX: number; fromY: number;
  age: number; duration: number; power: number; color?: string; delay: number;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** Square stamps keep thickness consistent for horizontal, vertical and diagonal energy. */
function energyStroke(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, width: number, color: string, alpha: number) {
  const size = Math.max(1, Math.round(width));
  const steps = Math.max(1, Math.ceil(Math.hypot(bx-ax,by-ay) / Math.max(1,size*.3)));
  ctx.fillStyle = color; ctx.globalAlpha = alpha;
  for(let i=0;i<=steps;i++) ctx.fillRect(Math.round(ax+(bx-ax)*i/steps-size/2),Math.round(ay+(by-ay)*i/steps-size/2),size,size);
  ctx.globalAlpha = 1;
}
const noise = (n: number) => { const x = Math.sin(n * 91.73 + 17) * 41731.17; return x - Math.floor(x); };
const paletteFor = (kind: BattleEffectKind): readonly string[] =>
  kind === 'slash' ? ['#276b96','#63dbea','#f1fff2'] :
  kind === 'smash' || kind === 'nova' ? ['#9a314b','#ff9b4a','#fff2ad'] :
  kind === 'guard' || kind === 'parry' ? ['#305983','#84dbef','#fff5bc'] :
  kind === 'heal' ? MAGIC_PALETTES.nature :
  kind === 'summon' || kind === 'beam' || kind === 'evade' ? MAGIC_PALETTES.arcane : MAGIC_PALETTES[kind];

/** Fixed-step choreography. Rendering is read-only and every primitive lands on integer pixels. */
export class BattleEffects {
  public active: BattleEffect[] = [];
  emit(kind: BattleEffectKind, x: number, y: number, options: Partial<Pick<BattleEffect, 'fromX' | 'fromY' | 'power' | 'color' | 'delay'>> = {}) {
    if (![x,y,options.fromX ?? x,options.fromY ?? y].every(Number.isFinite)) return;
    this.active.push({ kind, x, y, fromX: x, fromY: y, age: 0, duration: kind === 'slash' ? 32 : kind === 'evade' ? 30 : 64, power: 1, delay: 0, ...options });
    if (this.active.length > 40) this.active.splice(0, this.active.length - 40);
  }
  update() { for (const effect of this.active) effect.age++; this.active = this.active.filter(e => e.age < e.duration + e.delay); }
  clear() { this.active.length = 0; }
  render(ctx: CanvasRenderingContext2D, w: number, h: number, reduced = false, balanced = false) {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,w,h); ctx.clip(); ctx.imageSmoothingEnabled = false;
    for (const e of this.active) {
      const age = e.age - e.delay; if (age < 0) continue;
      const t = clamp(age / e.duration), charge = clamp(age / 10), release = clamp((age - 8) / 28);
      const fade = Math.min(1, (1 - t) * 3), palette = paletteFor(e.kind);
      const [ink, bright, white] = e.color ? [palette[0], e.color, palette[2]] : palette;
      const power = Math.max(.5, Math.min(2, e.power));
      const radius = Math.min(w * .28, 105 * power), x = e.x, y = e.y;
      const motion = reduced ? .35 : release;
      const groundY = y + (e.kind === 'summon' || e.kind === 'heal' ? 0 : 36);
      const ringR = radius * (.3 + motion * .95);
      // Shared ground response keeps the energy connected to the arena's isometric plane.
      if (e.kind !== 'beam' && e.kind !== 'evade') {
        pixelEllipse(ctx,x,groundY,ringR,ringR*.35,ink,.16*fade);
        ctx.globalAlpha = fade * .75;
        pixelRing(ctx,x,groundY,ringR,ringR*.36,bright,2,true,age*.25);
        pixelRing(ctx,x,groundY,ringR*.74,ringR*.26,white,1);
      }
      const line = (ax: number, ay: number, bx: number, by: number, width = 3, color = bright, alpha = fade) => energyStroke(ctx,ax,ay,bx,by,width,color,alpha);
      const star = (sx: number, sy: number, r: number, color = white, alpha = fade) => {
        line(sx-r,sy,sx+r,sy,2,color,alpha); line(sx,sy-r,sx,sy+r,2,color,alpha);
        pixelDisc(ctx,sx,sy,2,color,alpha);
      };
      const crescent = (cx: number, cy: number, r: number, angle: number, sweep: number, thickness: number) => {
        const count = balanced ? 26 : 44;
        for (let i=0;i<count;i++) {
          const a=angle+sweep*i/count, b=angle+sweep*(i+1)/count;
          const taper=Math.sin(Math.PI*(i+.5)/count);
          line(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.72,cx+Math.cos(b)*r,cy+Math.sin(b)*r*.72,Math.max(1,thickness*taper),bright,fade);
          if(i>count*.2&&i<count*.8) line(cx+Math.cos(a)*(r-3),cy+Math.sin(a)*(r-3)*.72,cx+Math.cos(b)*(r-3),cy+Math.sin(b)*(r-3)*.72,2,white,fade);
        }
      };
      if (e.kind === 'slash' || e.kind === 'smash' || e.kind === 'parry') {
        const r = radius*(.45+motion*.65), angle = e.fromX>x ? 2.5 : -.7;
        crescent(x,y,r,angle,Math.PI*1.35,12*power*(1-t*.6));
        if(e.kind!=='slash') crescent(x,y,r*.8,angle+2.2,Math.PI*1.3,8*power);
        if(e.kind==='smash') for(let i=0;i<8;i++) {
          const a=i*Math.PI/4; line(x,groundY,x+Math.cos(a)*r*1.15,groundY+Math.sin(a)*r*.4,3,ink,fade);
        }
        star(x,y,Math.max(3,28*(1-t)),white);
      } else if(e.kind === 'guard') {
        const r=radius*.7*(.85+charge*.15), points=[[0,-1],[.65,-.55],[.55,.35],[0,.8],[-.55,.35],[-.65,-.55],[0,-1]];
        for(let i=1;i<points.length;i++) {
          const a=points[i-1], b=points[i];
          line(x+a[0]*r,y+a[1]*r,x+b[0]*r,y+b[1]*r,7,ink,fade*.65);
          line(x+a[0]*r,y+a[1]*r,x+b[0]*r,y+b[1]*r,2,white);
        }
        line(x,y-r*.65,x,y+r*.4,3);line(x-r*.3,y-r*.18,x+r*.3,y-r*.18,3);
      } else if(e.kind === 'beam') {
        const width = (9+Math.sin(t*Math.PI)*13)*power;
        line(e.fromX,e.fromY,x,y,width*2,ink,fade*.25);
        line(e.fromX,e.fromY,x,y,width,bright,fade*.8);
        line(e.fromX,e.fromY,x,y,Math.max(2,width*.22),white);
        const count=balanced?4:7;
        for(let i=0;i<count;i++) {
          const p=(i/count+age*.017)%1;
          star(e.fromX+(x-e.fromX)*p,e.fromY+(y-e.fromY)*p,6*power);
        }
      } else if(e.kind === 'storm') {
        for(let bolt=0;bolt<(reduced?1:3);bolt++) {
          let ax=x+(bolt-1)*42, ay=y-radius*1.6;
          for(let j=1;j<=7;j++) {
            const bx=x+(noise(bolt*70+j+Math.floor(age/4))*2-1)*radius*.55*(1-j/8), by=y-radius*1.6+j*radius*1.6/7;
            line(ax,ay,bx,by,8,ink,fade*.45);line(ax,ay,bx,by,4,bright);line(ax,ay,bx,by,1,white);ax=bx;ay=by;
          }
        }
      } else if(e.kind === 'frost') {
        for(let i=0;i<7;i++) {
          const dx=(i-3)*radius*.23, base=groundY+Math.abs(i-3)*3, height=radius*(.45+noise(i)*.65)*charge;
          const rows=Math.max(1,Math.round(height)), half=12*power;
          for(let row=0;row<=rows;row++) {
            const t=row/rows, span=Math.max(1,Math.round(half*t));
            const cx=Math.round(x+dx*.9+(dx*.1)*t), cy=Math.round(base-height+row);
            ctx.globalAlpha=fade;ctx.fillStyle=ink;ctx.fillRect(cx-span,cy,span*2+1,1);
            ctx.fillStyle=bright;ctx.fillRect(cx-span,cy,span,1);
            ctx.fillStyle=white;ctx.fillRect(cx-Math.max(1,Math.round(span*.45)),cy,Math.max(1,Math.round(span*.25)),1);
          }
          star(x+dx*.9,base-height,4);
        }
      } else if(e.kind === 'holy') {
        const height=radius*1.8*charge;
        line(x,groundY,x,groundY-height,34*power,bright,fade*.18);
        line(x,groundY,x,groundY-height,9*power,white,fade*.85);
        line(x-radius*.48,y-radius*.6,x+radius*.48,y-radius*.6,10,bright);
        line(x-radius*.42,y-radius*.6,x+radius*.42,y-radius*.6,3,white);
        crescent(x,y-radius*.8,radius*.6,0,Math.PI*2,3);
        // Feathered rays make a winged crest around the descending judgment pillar.
        for(const side of [-1,1]) for(let i=0;i<(balanced?4:7);i++) {
          const wing=radius*(.42+i*.065)*charge;
          line(x+side*radius*.15,y-radius*.55+i*5,x+side*wing,y-radius*(1.1-i*.11),4,bright,fade*.8);
          star(x+side*wing,y-radius*(1.1-i*.11),3,white,fade*.8);
        }
      } else if(e.kind === 'nature' || e.kind === 'heal') {
        for(let i=0;i<6;i++) {
          const a=i*Math.PI/3+motion*1.8, r=radius*(.3+motion*.55);
          const sx=x+Math.cos(a)*r, sy=groundY-20-Math.sin(t*Math.PI)*radius*.7+Math.sin(a)*r*.35;
          line(x+Math.cos(a)*r*.5,groundY,sx,sy,3,bright,fade*.6);
          star(sx,sy,5+(i%2)*3,e.kind==='heal'?white:bright);
        }
      } else if(e.kind === 'flame' || e.kind === 'nova') {
        const count=reduced?5:balanced?9:13;
        for(let i=0;i<count;i++) {
          const dx=(noise(i+3)-.5)*radius*1.6, rise=radius*(.35+noise(i+60))*(.3+Math.sin(t*Math.PI));
          const base=groundY+noise(i+9)*12, tip=base-rise;
          for(let lobe=0;lobe<6;lobe++) {
            const u=lobe/5, width=(19*(1-u)+3)*power;
            const sx=x+dx*(1-u*.45)+Math.sin(i*2+lobe+age*.08)*width*.3;
            const sy=base-rise*u;
            pixelEllipse(ctx,sx,sy,width,width*1.35,ink,fade*.65);
            pixelEllipse(ctx,sx-2,sy+3,width*.7,width,bright,fade*.95);
            pixelEllipse(ctx,sx-3,sy+7,width*.32,width*.65,white,fade*.9);
          }
          star(x+dx*.55,tip,3,white,fade*.65);
        }
        if(e.kind==='nova') crescent(x,y,radius*(.25+motion),0,Math.PI*2,8);
      } else if(e.kind === 'shadow') {
        for(let i=0;i<5;i++) crescent(x+(i-2)*12,y+(i%2)*9,radius*(.4+motion*.4),i*1.3+motion*3,Math.PI*1.2,8);
        pixelDisc(ctx,x,y,16*charge,ink,fade*.8);
        star(x,y,8,white);
      } else if(e.kind === 'evade') {
        for(let i=0;i<3;i++) crescent(x-(t*radius*.8)+i*20,y,32+i*5,1.7,2,2);
      } else {
        // Arcane and summoning: a rotating seal, orbiting diamonds and rising light shafts.
        for(let i=0;i<8;i++) {
          const a=i*Math.PI/4+(reduced?0:age*.035), r=radius*(.4+charge*.3);
          const sx=x+Math.cos(a)*r, sy=groundY+Math.sin(a)*r*.36;
          const b=a+Math.PI*.75;
          line(sx,sy,x+Math.cos(b)*r,groundY+Math.sin(b)*r*.36,1,bright,fade*.6);
          star(sx,sy,5,white);
          if(e.kind==='summon') line(sx,sy,sx,sy-radius*(.6+noise(i))*(1-t),4,bright,fade*.6);
        }
        if(e.kind==='arcane') {
          crescent(x,y-30,radius*.5,age*.04,Math.PI*2,4);
          for(let i=0;i<4;i++) {
            const a=i*Math.PI/2+(reduced?0:age*.025), sx=x+Math.cos(a)*radius*.7, sy=y-30+Math.sin(a)*radius*.7;
            line(sx,sy-10,sx+7,sy,2,white);line(sx+7,sy,sx,sy+10,2,bright);
            line(sx,sy+10,sx-7,sy,2,bright);line(sx-7,sy,sx,sy-10,2,white);
          }
        }
      }
      // Directional fragments and tapered rays share a fixed seed, so a paused frame never flickers.
      const rays = reduced ? 4 : balanced ? 10 : 18;
      for(let i=0;i<rays;i++) {
        const a=i/rays*Math.PI*2+noise(i)*.3, r=radius*(.2+motion*1.2);
        const sx=x+Math.cos(a)*r, sy=y+Math.sin(a)*r*.7;
        const length=(8+noise(i+41)*20)*(1-t);
        line(sx,sy,sx+Math.cos(a)*length,sy+Math.sin(a)*length,1+i%3,i%3?bright:white,fade*.7);
      }
    }
    ctx.restore();
  }
}
