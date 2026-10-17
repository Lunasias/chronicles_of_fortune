import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BattleEffects } from '../.test-build/engine/BattleEffects.js';
import { CombatVFXEngine } from '../.test-build/engine/CombatVFXEngine.js';
import { COMBAT_ART_PROFILES, resolveCombatArt, combatArtFrame, GeneratedCombatArt, generatedCombatArt } from '../.test-build/engine/GeneratedCombatArt.js';
import { graphicsPreferences } from '../.test-build/ui/GraphicsSettings.js';
import { HERO_CLASSES, JOB_PROMOTIONS, TIER3_PROMOTIONS } from '../.test-build/game/Player.js';
import { REALM_MONSTER_ROSTERS } from '../.test-build/game/MonsterDatabase.js';
import { DOKAPON_NODES } from '../.test-build/game/BoardMap.js';
import { listCompanionProfiles } from '../.test-build/game/CompanionDatabase.js';

const kinds=['slash','smash','parry','guard','arcane','flame','frost','storm','shadow','holy','nature','heal','summon','nova','beam','evade'];
function recorder(){let depth=0,draws=[];const ctx=new Proxy({}, {get(t,k){
  if(k==='save')return()=>depth++;
  if(k==='restore')return()=>{assert.ok(depth>0);depth--;};
  if(k==='drawImage')return(image,...v)=>{assert.ok(v.every(Number.isInteger));draws.push([image,...v]);};
  if(['fillRect','arc','ellipse','createRadialGradient','createLinearGradient'].includes(k))return()=>assert.fail(`effect art must be PNG pixels, not ${k}`);
  return t[k]??(()=>{});
},set(t,k,v){if(k==='globalAlpha')assert.ok(v>=0&&v<=1);t[k]=v;return true;}});return{ctx,get draws(){return draws},get depth(){return depth}};}
function withFrames(run){const original=generatedCombatArt.frame;generatedCombatArt.frame=(id,frame)=>({id,frame});try{return run();}finally{generatedCombatArt.frame=original;}}

test('every effect family plays generated frames only, stays deterministic and balances canvas state',()=>withFrames(()=>{
  for(const kind of kinds){const fx=new BattleEffects();fx.emit(kind,280.2,210.8,{fromX:70,fromY:260,power:1.4});for(let i=0;i<24;i++)fx.update();
    const before=JSON.stringify(fx.active),a=recorder(),b=recorder();fx.render(a.ctx,390,550);fx.render(b.ctx,390,550);
    assert.equal(JSON.stringify(fx.active),before);assert.deepEqual(a.draws,b.draws);assert.equal(a.depth,0);assert.equal(a.draws.length,1);assert.equal(a.draws[0][0].id,'common_'+kind);
    const reduced=recorder();fx.render(reduced.ctx,390,550,true,true);assert.equal(reduced.draws[0][0].frame,3);assert.equal(reduced.depth,0);
  }
}));

test('effect lifecycle delays release, bounds chains, expires and clears without a wall-clock timer',()=>withFrames(()=>{
  const fx=new BattleEffects();fx.emit('holy',200,200,{delay:10});const a=recorder();fx.render(a.ctx,800,450);assert.equal(a.draws.length,0);
  for(let i=0;i<12;i++)fx.update();const b=recorder();fx.render(b.ctx,800,450);assert.equal(b.draws.length,1);
  for(let i=0;i<150;i++)fx.emit('nova',200,200);assert.equal(fx.active.length,40);
  fx.emit('nova',NaN,200);assert.equal(fx.active.length,40);
  const high=recorder(),balanced=recorder();fx.render(high.ctx,800,450);fx.render(balanced.ctx,800,450,false,true);assert.equal(high.draws.length,14);assert.equal(balanced.draws.length,8);
  for(let i=0;i<150;i++)fx.update();assert.equal(fx.active.length,0);fx.emit('heal',200,200);fx.clear();assert.equal(fx.active.length,0);
}));

test('real combat entry points route physical, elemental, boss, promoted skill and summon image assets',()=>{
  const fx=new CombatVFXEngine();fx.spawnAttackHit(200,200);fx.spawnStrikeHit(200,200);fx.spawnCounterHit(200,200,100,200);fx.spawnGuard(200,200,true);
  for(const element of ['arcane','flame','frost','storm','shadow','holy','nature'])fx.spawnMagicHit(200,200,false,element);
  fx.spawnMagicHit(200,200,true);fx.spawnMonsterAttack(0,0,200,200,'Dragon Princess Ignis');fx.spawnCompanionSummonPortal(200,200);fx.spawnMagicLaserBeam(100,100,200,200);fx.spawnExplosionNova(200,200);
  const seen=new Set(fx.choreography.active.map(e=>e.kind));for(const kind of kinds.filter(k=>k!=='evade'))assert.ok(seen.has(kind),kind);
  for(const job of ['seraphic_saint','lich_king','rune_sovereign','ranger','warlord','warrior']){fx.reset();fx.triggerSkillCutscene(job,100,200,300,200,job);assert.ok(fx.choreography.active.some(e=>e.artId===job&&e.delay===10),job);}
  fx.reset();fx.setOwner({name:'Steam Gear Gunner Victoria',skill:'Sniper Vapor Blast'});fx.spawnMagicHit(200,200);assert.ok(fx.choreography.active.some(e=>e.artId.startsWith('monster_steam_gear_gunner_victoria')));
  fx.reset();fx.setOwner({companionKey:'pudding'});fx.triggerSkillCutscene('Gelatin Shield Blast',100,200,300,200,'mage');assert.ok(fx.choreography.active.some(e=>e.artId==='companion_pudding'));
  fx.reset();assert.equal(fx.choreography.active.length,0);assert.equal(fx.particles.length,0);assert.equal(fx.activeCutscene,null);
});

test('fixed update bounds debris, obeys hitstop and suppresses shake for reduced motion',()=>{
  const fx=new CombatVFXEngine();for(let i=0;i<30;i++)fx.spawnExplosionNova(200,200);fx.update();assert.ok(fx.particles.length<=600);
  fx.reset();fx.spawnAttackHit(200,200);fx.triggerHitstop(2);fx.update();assert.equal(fx.choreography.active[0].age,0);fx.update();fx.update();assert.equal(fx.choreography.active[0].age,1);
  graphicsPreferences.reducedMotion=true;try{fx.triggerScreenShake(30);assert.equal(fx.screenShakeAmount,0);}finally{graphicsPreferences.reducedMotion=false;}
  for(let i=0;i<220;i++)fx.update();assert.equal(fx.choreography.active.length,0);assert.equal(fx.particles.length,0);
});

test('all playable jobs, realm monsters, occupied towns and companions have explicit owner art',()=>{
  const jobs=[...Object.keys(HERO_CLASSES),...Object.values(JOB_PROMOTIONS).flat().map(p=>p.tier2Key),...Object.values(TIER3_PROMOTIONS).flat().map(p=>p.tier2Key)];
  for(const job of jobs)assert.equal(resolveCombatArt({job}),job);
  for(const m of Object.values(REALM_MONSTER_ROSTERS).flat())assert.equal(COMBAT_ART_PROFILES.find(p=>p.id===resolveCombatArt({name:m.name,skill:m.skillName})).group,'monster',m.name);
  for(const n of DOKAPON_NODES.filter(n=>n.townData))assert.equal(COMBAT_ART_PROFILES.find(p=>p.id===resolveCombatArt({name:n.townData.monsterName})).group,'monster',n.townData.monsterName);
  for(const c of listCompanionProfiles())assert.equal(resolveCombatArt({companionKey:c.key}),'companion_'+c.key);
  assert.equal(new Set(COMBAT_ART_PROFILES.map(p=>p.id)).size,132);
  assert.notEqual(resolveCombatArt({name:'Clockwork Maid Nicole',skill:'Steam Overdrive'}),resolveCombatArt({name:'Clockwork Maid Nicole',skill:'Mechanical Sweep'}));
});

test('all 33 delivered generated PNGs match provenance and contain 792 distinct nonempty source frames',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/assets/combat-v3/manifest.json','utf8'));assert.equal(manifest.assets.length,33);assert.equal(manifest.frames,792);
  const hashes=new Set();for(const asset of manifest.assets){assert.ok(asset.clearRatio>.1);assert.equal(asset.width%6,0);assert.equal(asset.height%4,0);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/assets/combat-v3/'+asset.file)).digest('hex'),asset.sha256);
    for(const f of asset.frames){assert.ok(f.solid>50);hashes.add(f.sha256);}
  }assert.equal(hashes.size,792);
});

test('frame timing advances through six painted frames and reduced motion holds a readable peak',()=>{
  assert.deepEqual([0,6,14,24,40,56].map(age=>combatArtFrame(age,64)),[0,1,2,3,4,5]);
  assert.equal(combatArtFrame(1,64,true),3);assert.equal(combatArtFrame(56,64,true),3);
});

test('atlas extraction copies source pixels without stripping disconnected particles and bounds decoded caches',async()=>{
  const oldImage=globalThis.Image,oldDocument=globalThis.document,copies=[];
  globalThis.Image=class{naturalWidth=1536;naturalHeight=1024;set src(value){this.value=value;this.onload();}};
  globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(...args){copies.push(args)},imageSmoothingEnabled:true};}};}};
  try{const art=new GeneratedCombatArt();for(const p of COMBAT_ART_PROFILES){await art.preload([p.id]);for(let f=0;f<6;f++)assert.ok(art.frame(p.id,f));}
    assert.ok(art.sheets.size<=8);assert.ok(art.frames.size<=144);assert.equal(copies.length,792);assert.ok(copies.every(c=>c[3]===256&&c[4]===256&&c[7]===128&&c[8]===128));
  }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
