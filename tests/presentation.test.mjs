import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { PRESENTATION_SHEETS, PROMOTION_ROWS, ambientFrame, companionActionFrame, promotionPose, presentationCuts } from '../.test-build/engine/PresentationArt.js';
import { JOB_VISUALS } from '../.test-build/engine/JobVisuals.js';
import { combatMotion } from '../.test-build/engine/CombatMotion.js';
import { actionHint, combatStatusLabels } from '../.test-build/ui/BattlePresentation.js';
import { equipmentComparison } from '../.test-build/ui/EquipmentComparison.js';
import { BattleEffects } from '../.test-build/engine/BattleEffects.js';
const { decodePNG } = createRequire(import.meta.url)('../scripts/lib/png.cjs');

test('generated presentation art has recorded provenance, transparent backgrounds and every runtime cell occupied', () => {
  const manifest = JSON.parse(fs.readFileSync('public/assets/presentation-v1/manifest.json', 'utf8'));
  assert.equal(manifest.assets.length, Object.keys(PRESENTATION_SHEETS).length);
  let frames = 0;
  for (const asset of manifest.assets) {
    const path = `public/assets/presentation-v1/${asset.name}`;
    const bytes = fs.readFileSync(path);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    const { width, height, pixels } = decodePNG(path);
    assert.equal(width, asset.width); assert.equal(height, asset.height);
    const spec = PRESENTATION_SHEETS[asset.name.replace('.png', '')];
    assert.equal(spec.columns, asset.columns); assert.equal(spec.rows, asset.rows);
    let transparent = 0;
    for(let i=3;i<pixels.length;i+=4) if(pixels[i]===0) transparent++;
    assert.ok(transparent > width * height * .12, asset.name);
    for(let row=0;row<spec.rows;row++) for(let col=0;col<spec.columns;col++) {
      let occupied=0;
      for(let y=Math.round(row*height/spec.rows);y<Math.round((row+1)*height/spec.rows);y++) for(let x=Math.round(col*width/spec.columns);x<Math.round((col+1)*width/spec.columns);x++) if(pixels[(y*width+x)*4+3]>80) occupied++;
      assert.ok(occupied>20, `${asset.name} cell ${col},${row}`);
    }
    frames += spec.columns * spec.rows;
  }
  assert.equal(frames, 225);
  assert.equal(Object.keys(JOB_VISUALS).length, 18);
  for(const identity of Object.values(JOB_VISUALS)) assert.ok(PROMOTION_ROWS.includes(identity.style));
});

test('animation phases preserve preparation, release and recovery; reduced motion stays fixed', () => {
  assert.equal(promotionPose('strike',1),1); assert.equal(promotionPose('strike',3),2); assert.equal(promotionPose('strike',7),3);
  assert.equal(promotionPose('idle',99),0);
  assert.deepEqual([0,.3,.8].map(p=>companionActionFrame(p,false)),[0,1,2]);
  assert.equal(companionActionFrame(.05,true),1);
  assert.equal(ambientFrame(5000,12,true),0);
  assert.equal(ambientFrame(5000,12,false),ambientFrame(5000,12,false));
  assert.notEqual(ambientFrame(0,1,false),ambientFrame(0,2,false));
  assert.ok(combatMotion('phantom_shinobi','attack').windup < combatMotion('warlord','attack').windup);
  assert.equal(combatMotion('grand_arcanist','skill').ranged,true);
  assert.equal(combatMotion('rune_sovereign','skill').ranged,false);
  assert.equal(combatMotion('dragon_princess_ignis','skill').ranged,true);
});

test('uneven generated atlas gutters are found before slicing through a neighbouring head', () => {
  const width=24,height=60,pixels=new Uint8ClampedArray(width*height*4);
  for(const [start,end] of [[1,16],[19,36],[40,59]]) for(let y=start;y<end;y++) for(let x=1;x<23;x++) pixels[(y*width+x)*4+3]=255;
  const cuts=presentationCuts(pixels,width,height,3);
  assert.equal(cuts.length,4); assert.equal(cuts[0],0); assert.equal(cuts[3],60);
  assert.ok(cuts[1]>=16&&cuts[1]<=18); assert.ok(cuts[2]>=36&&cuts[2]<=39);
});

test('command resource hints use actual actor cost and visible reasons for blocked actions', () => {
  const actor={name:'Mage',classKey:'magician',mp:17,hp:50,maxHp:70};
  assert.equal(actionHint(actor,'skill').blocked,true);
  assert.equal(actionHint(actor,'skill').cost,18);
  assert.match(actionHint(actor,'skill').text,/MP ไม่พอ/);
  assert.equal(actionHint(actor,'magic').blocked,false);
  assert.match(actionHint({...actor,mp:40},'skill',true).text,/ใช้แล้ว/);
  assert.match(actionHint({...actor,skillUsed:true,mp:40},'skill').text,/ใช้แล้ว/);
  assert.deepEqual(combatStatusLabels({...actor,burnTurns:2,isWet:true,barrierHp:3.2}),['เผาไหม้ 2','เปียก','เกราะเวท 4']);
});

test('equipment comparison shows gains and losses against the same slot without mutating equipment', () => {
  const player={equipment:{weapon:{name:'<old sword>',atk:10,spd:4}}};
  const item={name:'Heavy sword',type:'weapon',atk:15,spd:1};
  const before=JSON.stringify(player);
  const html=equipmentComparison(player,item);
  assert.match(html,/ATK \+5/); assert.match(html,/SPD -3/);
  assert.match(html,/&lt;old sword&gt;/); assert.doesNotMatch(html,/<old sword>/);
  assert.equal(JSON.stringify(player),before);
  assert.equal(equipmentComparison(player,{type:'potion'}),'');
});

test('contact feedback rejects invalid coordinates without changing an existing effect', () => {
  const fx=new BattleEffects(); fx.impact('critical',200,120);
  assert.equal(fx.active.length,1); assert.equal(fx.active[0].impactStyle,'critical');
  const before=JSON.stringify(fx.active);
  fx.impact('ward',NaN,120); assert.equal(JSON.stringify(fx.active),before);
  for(let i=0;i<34;i++) fx.update();
  assert.equal(fx.active.length,0);
});
