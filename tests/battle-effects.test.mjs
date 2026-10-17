import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEffects } from '../.test-build/engine/BattleEffects.js';
import { CombatVFXEngine } from '../.test-build/engine/CombatVFXEngine.js';
import { graphicsPreferences } from '../.test-build/ui/GraphicsSettings.js';

const kinds=['slash','smash','parry','guard','arcane','flame','frost','storm','shadow','holy','nature','heal','summon','nova','beam','evade'];
function recorder(){let depth=0,blocks=[];const ctx=new Proxy({}, {get(t,k){
  if(k==='save')return()=>depth++;
  if(k==='restore')return()=>{assert.ok(depth>0);depth--;};
  if(k==='fillRect')return(...v)=>{assert.ok(v.every(Number.isInteger));assert.ok(v.every(Number.isFinite));blocks.push([t.fillStyle,...v]);};
  if(['rotate','scale','transform','createRadialGradient','createLinearGradient'].includes(k))return()=>assert.fail(`unexpected soft/scaled geometry ${k}`);
  return t[k]??(()=>{});
},set(t,k,v){if(k==='globalAlpha')assert.ok(v>=0&&v<=1);t[k]=v;return true;}});return{ctx,get blocks(){return blocks},get depth(){return depth}};}

test('all sixteen effect families have distinct, deterministic integer geometry and balanced canvas state',()=>{
  const signatures=new Set();
  for(const kind of kinds){const fx=new BattleEffects();fx.emit(kind,280.2,210.8,{fromX:70,fromY:260,power:1.4});for(let i=0;i<24;i++)fx.update();
    const before=JSON.stringify(fx.active),a=recorder(),b=recorder();fx.render(a.ctx,390,550);fx.render(b.ctx,390,550);
    assert.equal(JSON.stringify(fx.active),before,'render does not advance time');assert.deepEqual(a.blocks,b.blocks,'paused frame is stable');assert.equal(a.depth,0);assert.ok(a.blocks.length>30,kind);signatures.add(JSON.stringify(a.blocks));
    const reduced=recorder();fx.render(reduced.ctx,390,550,true,true);assert.equal(reduced.depth,0);assert.ok(reduced.blocks.length<a.blocks.length,`${kind} reduced motion lowers geometry`);
  }
  assert.equal(signatures.size,kinds.length,'element identities differ beyond a shared ring');
});

test('effect lifecycle delays release, bounds chains, expires and clears without a wall-clock timer',()=>{
  const fx=new BattleEffects();fx.emit('holy',200,200,{delay:10});const a=recorder();fx.render(a.ctx,800,450);assert.equal(a.blocks.length,0);
  for(let i=0;i<12;i++)fx.update();const b=recorder();fx.render(b.ctx,800,450);assert.ok(b.blocks.length>0);
  for(let i=0;i<150;i++)fx.emit('nova',200,200);assert.equal(fx.active.length,40);
  fx.emit('nova',NaN,200);assert.equal(fx.active.length,40);
  for(let i=0;i<150;i++)fx.update();assert.equal(fx.active.length,0);fx.emit('heal',200,200);fx.clear();assert.equal(fx.active.length,0);
});

test('real combat entry points route physical, elemental, boss, promoted skill and summon choreography',()=>{
  const fx=new CombatVFXEngine();fx.spawnAttackHit(200,200);fx.spawnStrikeHit(200,200);fx.spawnCounterHit(200,200,100,200);fx.spawnGuard(200,200,true);
  for(const element of ['arcane','flame','frost','storm','shadow','holy','nature'])fx.spawnMagicHit(200,200,false,element);
  fx.spawnMagicHit(200,200,true);fx.spawnMonsterAttack(0,0,200,200,'Dragon Princess Ignis');fx.spawnCompanionSummonPortal(200,200);fx.spawnMagicLaserBeam(100,100,200,200);fx.spawnExplosionNova(200,200);
  const seen=new Set(fx.choreography.active.map(e=>e.kind));for(const kind of kinds.filter(k=>k!=='evade'))assert.ok(seen.has(kind),kind);
  for(const [job,kind] of [['seraphic_saint','holy'],['lich_king','shadow'],['rune_sovereign','storm'],['ranger','nature'],['warlord','flame'],['warrior','smash']]){
    fx.reset();fx.triggerSkillCutscene(job,100,200,300,200,job);assert.ok(fx.choreography.active.some(e=>e.kind===kind&&e.delay===10),job);
  }
  fx.reset();assert.equal(fx.choreography.active.length,0);assert.equal(fx.particles.length,0);assert.equal(fx.activeCutscene,null);
});

test('fixed update bounds accumulated debris, obeys hitstop and suppresses shake for reduced motion',()=>{
  const fx=new CombatVFXEngine();for(let i=0;i<30;i++)fx.spawnExplosionNova(200,200);fx.update();assert.ok(fx.particles.length<=600);
  fx.reset();fx.spawnAttackHit(200,200);fx.triggerHitstop(2);fx.update();assert.equal(fx.choreography.active[0].age,0);fx.update();fx.update();assert.equal(fx.choreography.active[0].age,1);
  graphicsPreferences.reducedMotion=true;try{fx.triggerScreenShake(30);assert.equal(fx.screenShakeAmount,0);}finally{graphicsPreferences.reducedMotion=false;}
  for(let i=0;i<220;i++)fx.update();assert.equal(fx.choreography.active.length,0);assert.equal(fx.particles.length,0);
});
