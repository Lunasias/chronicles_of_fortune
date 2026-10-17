import { CombatVFXEngine } from './engine/CombatVFXEngine';
import { drawBattleScenery, battleGroundLayout } from './engine/BattleScenery';
import { customIsometricHeroRenderer as heroes } from './engine/CustomIsometricHeroRenderer';
import { customIsometricMonsterRenderer as monsters } from './engine/CustomIsometricMonsterRenderer';
import { actorScaleForViewport } from './engine/ArtDirection';
import { graphicsPreferences } from './ui/GraphicsSettings';
import type { MagicElement } from './engine/MagicArt';

const canvas = document.querySelector<HTMLCanvasElement>('#effectsCanvas')!, ctx = canvas.getContext('2d')!;
const select = document.querySelector<HTMLSelectElement>('#effect')!, slider = document.querySelector<HTMLInputElement>('#frame')!;
const play = document.querySelector<HTMLButtonElement>('#play')!, status = document.querySelector<HTMLOutputElement>('#status')!;
const reduced = document.querySelector<HTMLInputElement>('#reduced')!, balanced = document.querySelector<HTMLInputElement>('#balanced')!;
const choices: Record<string,string> = {
  attack:'ฟัน / Blade comet', strike:'ชาร์จฟัน / Earth breaker', counter:'สวนกลับ / Cross riposte', guard:'ป้องกัน / Aegis',
  arcane:'เวทอาคม / Astral seal', flame:'ไฟ / Inferno bloom', frost:'น้ำแข็ง / Crystal eruption', storm:'สายฟ้า / Thunderfall', holy:'ศักดิ์สิทธิ์ / Heaven judgment', shadow:'ความมืด / Eclipse blades', nature:'ธรรมชาติ / Verdant spiral', heal:'ฟื้นฟู / Lifebloom',
  warrior:'ท่านักรบ', magician:'ท่าจอมเวท', thief:'ท่าโจร', cleric:'ท่านักบวช', spellblade:'ท่าดาบเวท', ranger:'ท่านักธนู', seraphic_saint:'ท่าอาชีพขั้นสูง: Seraphic Saint', lich_king:'ท่าอาชีพขั้นสูง: Lich King',
  beam:'ลำแสง / Astral lance', summon:'อัญเชิญ / Gate of stars', nova:'ระเบิด / Cataclysm', monster:'มอนสเตอร์โจมตี', boss:'บอส: Hellfire', evade:'หลบหลีก'
};
for(const [value,label] of Object.entries(choices)) select.add(new Option(label,value));
let fx = new CombatVFXEngine(), playing = true, frame = 0, accumulator = 0, previous = performance.now();
const ground = battleGroundLayout(canvas.width,canvas.height), x = ground.enemyX, y = ground.enemyY-50;
function trigger() {
  fx.reset();
  const kind=select.value;
  if(kind==='attack')fx.spawnAttackHit(x,y);
  else if(kind==='strike')fx.spawnStrikeHit(x,y);
  else if(kind==='counter')fx.spawnCounterHit(x,y,ground.playerX,ground.playerY-50);
  else if(kind==='guard')fx.spawnGuard(x,y);
  else if(kind==='heal')fx.spawnMagicHit(x,y,true);
  else if(kind==='beam')fx.spawnMagicLaserBeam(ground.playerX,ground.playerY-70,x,y,'#adbcff',24);
  else if(kind==='summon')fx.spawnCompanionSummonPortal(x,ground.enemyY,'#bf98ff');
  else if(kind==='nova')fx.spawnExplosionNova(x,y);
  else if(kind==='evade')fx.choreography.emit('evade',x,y);
  else if(kind==='monster'||kind==='boss')fx.spawnMonsterAttack(ground.playerX,ground.playerY-50,x,y,kind==='boss'?'Dragon Princess Ignis':'Wolf knight');
  else if(['arcane','flame','frost','storm','holy','shadow','nature'].includes(kind))fx.spawnMagicHit(x,y,false,kind as MagicElement);
  else fx.triggerSkillCutscene(choices[kind],ground.playerX,ground.playerY-70,x,y,kind);
}
function seek(value:number) { trigger(); frame=value; for(let i=0;i<frame;i++)fx.update(); slider.value=String(frame); }
select.onchange=()=>seek(0);
slider.oninput=()=>{playing=false;play.textContent='เล่น';seek(Number(slider.value));};
play.onclick=()=>{playing=!playing;play.textContent=playing?'หยุดภาพ':'เล่น';previous=performance.now();accumulator=0;};
reduced.onchange=()=>{graphicsPreferences.reducedMotion=reduced.checked;seek(frame);};
balanced.onchange=()=>{graphicsPreferences.quality=balanced.checked?'balanced':'high';seek(frame);};
trigger();
function draw(now:number) {
  accumulator+=Math.min(100,now-previous);previous=now;
  if(playing)while(accumulator>=1000/60){accumulator-=1000/60;fx.update();frame++;if(frame>140){trigger();frame=0;}slider.value=String(Math.min(110,frame));}
  else accumulator=0;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBattleScenery(ctx,canvas.width,canvas.height,'forest',0,'DAY');
  const job=['warrior','magician','thief','cleric','spellblade','ranger'].includes(select.value)?select.value:'cleric';
  const hero=heroes.getHeroSprite(job,'NE','magic',Math.floor(frame/5)%8);
  const enemy=monsters.getMonsterSprite('Slime Princess Aurelia','SW','hurt',Math.floor(frame/5)%8);
  const scale=actorScaleForViewport(canvas.width,canvas.height), size=144*scale;
  ctx.drawImage(hero,ground.playerX-size/2,ground.playerY-97*scale,size,size);
  ctx.drawImage(enemy,ground.enemyX-size/2,ground.enemyY-97*scale,size,size);
  fx.render(ctx,canvas.width,canvas.height);
  status.textContent=`${Math.min(110,frame)} / 110 · ${fx.choreography.active.length} layers`;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
