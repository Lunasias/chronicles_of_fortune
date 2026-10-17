import { CombatVFXEngine } from './engine/CombatVFXEngine';
import { COMBAT_ART_PROFILES, combatArtProfile, generatedCombatArt, resolveCombatArt, type CombatArtOwner } from './engine/GeneratedCombatArt';
import { drawBattleScenery, battleGroundLayout } from './engine/BattleScenery';
import { customIsometricHeroRenderer as heroes } from './engine/CustomIsometricHeroRenderer';
import { customIsometricMonsterRenderer as monsters } from './engine/CustomIsometricMonsterRenderer';
import { companionSprites } from './engine/CompanionSpriteRenderer';
import { actorScaleForViewport } from './engine/ArtDirection';
import { graphicsPreferences } from './ui/GraphicsSettings';
import type { BattleEffectKind } from './engine/BattleEffects';

const canvas=document.querySelector<HTMLCanvasElement>('#effectsCanvas')!,ctx=canvas.getContext('2d')!;
const ownerSelect=document.querySelector<HTMLSelectElement>('#owner')!,select=document.querySelector<HTMLSelectElement>('#effect')!;
const slider=document.querySelector<HTMLInputElement>('#frame')!,play=document.querySelector<HTMLButtonElement>('#play')!;
const status=document.querySelector<HTMLOutputElement>('#status')!,reduced=document.querySelector<HTMLInputElement>('#reduced')!,balanced=document.querySelector<HTMLInputElement>('#balanced')!;
for(const [group,title]of [['job','อาชีพ / ร่างพิเศษ'],['monster','มอนสเตอร์ / บอส'],['companion','เพื่อนร่วมทาง'],['common','เอฟเฟกต์พื้นฐาน']]){
  const options=document.createElement('optgroup');options.label=title;
  for(const p of COMBAT_ART_PROFILES.filter(p=>p.group===group))options.append(new Option(p.name+' · '+p.skill,p.id));ownerSelect.append(options);
}
const choices:Record<string,string>={signature:'ท่าประจำตัว',attack:'โจมตีปกติ',strike:'ชาร์จฟัน',counter:'สวนกลับ',guard:'ป้องกัน',beam:'ลำแสง',summon:'อัญเชิญ',heal:'ฟื้นฟู',nova:'ระเบิดพลัง',evade:'หลบหลีก'};
for(const [value,label]of Object.entries(choices))select.add(new Option(label,value));
let fx=new CombatVFXEngine(),playing=true,frame=0,accumulator=0,previous=performance.now(),revision=0,loading=false;
const ground=battleGroundLayout(canvas.width,canvas.height),x=ground.enemyX,y=ground.enemyY-36;
function owner():CombatArtOwner{
  const p=combatArtProfile(ownerSelect.value);
  return p.group==='job'?{job:p.id}:p.group==='companion'?{companionKey:p.id.replace('companion_','')}:{name:p.name,skill:p.skill};
}
function trigger(){
  fx.reset();fx.setOwner(owner());const kind=select.value,p=combatArtProfile(ownerSelect.value);
  if(kind==='signature')fx.choreography.emit(p.group==='common'?p.id.replace('common_','') as BattleEffectKind:'arcane',x,y,{artId:p.id,power:1.75});
  else if(kind==='attack')fx.spawnAttackHit(x,y);
  else if(kind==='strike')fx.spawnStrikeHit(x,y);
  else if(kind==='counter')fx.spawnCounterHit(x,y,ground.playerX,ground.playerY-36);
  else if(kind==='guard')fx.spawnGuard(x,y);
  else if(kind==='beam')fx.spawnMagicLaserBeam(ground.playerX,ground.playerY-70,x,y);
  else if(kind==='summon')fx.spawnCompanionSummonPortal(x,ground.enemyY);
  else if(kind==='heal')fx.spawnMagicHit(x,ground.enemyY,true);
  else if(kind==='nova')fx.spawnExplosionNova(x,y);
  else fx.choreography.emit('evade',x,y);
}
async function seek(value:number){
  const ticket=++revision;loading=true;frame=value;slider.value=String(value);
  const ids=select.value==='signature'?[ownerSelect.value]:select.value==='attack'||select.value==='strike'?[resolveCombatArt(owner(),'slash')]:select.value==='counter'?[resolveCombatArt(owner(),'slash'),'common_parry']:['common_'+select.value];
  await generatedCombatArt.preload(ids);
  if(ticket!==revision)return;trigger();frame=value;for(let i=0;i<frame;i++)fx.update();slider.value=String(frame);loading=false;accumulator=0;previous=performance.now();
}
ownerSelect.onchange=()=>void seek(0);select.onchange=()=>void seek(0);
slider.oninput=()=>{playing=false;play.textContent='เล่น';void seek(Number(slider.value));};
play.onclick=()=>{playing=!playing;play.textContent=playing?'หยุดภาพ':'เล่น';previous=performance.now();accumulator=0;};
reduced.onchange=()=>{graphicsPreferences.reducedMotion=reduced.checked;void seek(frame);};
balanced.onchange=()=>{graphicsPreferences.quality=balanced.checked?'balanced':'high';void seek(frame);};
void seek(0);
function draw(now:number){
  accumulator+=Math.min(100,now-previous);previous=now;
  if(playing&&!loading)while(accumulator>=1000/60){accumulator-=1000/60;fx.update();frame++;if(frame>140){trigger();frame=0;}slider.value=String(Math.min(110,frame));}else accumulator=0;
  ctx.clearRect(0,0,canvas.width,canvas.height);drawBattleScenery(ctx,canvas.width,canvas.height,'forest',0,'DAY');
  const profile=combatArtProfile(ownerSelect.value),scale=actorScaleForViewport(canvas.width,canvas.height),size=144*scale;
  const hero=profile.group==='monster'?monsters.getMonsterSprite(profile.name,'NE','magic',Math.floor(frame/5)%8):heroes.getHeroSprite(profile.group==='job'?profile.id:'cleric','NE','magic',Math.floor(frame/5)%8);
  const enemy=monsters.getMonsterSprite('Slime Princess Aurelia','SW','hurt',Math.floor(frame/5)%8);
  if(profile.group==='companion'){
    const sprite=companionSprites.getSpriteByKey(profile.id.replace('companion_',''));if(sprite)ctx.drawImage(sprite,ground.playerX-96,ground.playerY-160,192,192);
  }else ctx.drawImage(hero,ground.playerX-size/2,ground.playerY-97*scale,size,size);
  ctx.drawImage(enemy,ground.enemyX-size/2,ground.enemyY-97*scale,size,size);fx.render(ctx,canvas.width,canvas.height);
  status.textContent=loading?'กำลังเตรียมภาพ…':`${Math.min(110,frame)} / 110 · ${profile.group} · PNG ${String(profile.sheet).padStart(2,'0')}`;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
