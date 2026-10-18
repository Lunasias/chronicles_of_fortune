import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import png from '../scripts/lib/png.cjs';
import {DOKAPON_NODES} from '../.test-build/game/BoardMap.js';
import {DUNGEON_CATACOMBS_NODES,DUNGEON_VOLCANO_NODES,DUNGEON_FROZEN_NODES,DungeonSystem} from '../.test-build/game/DungeonSystem.js';
import {BACKDROP_KEYS} from '../.test-build/engine/GeneratedBackdrops.js';
import {REGIONAL_SLOTS,regionalSlotForNode} from '../.test-build/engine/RegionalScenery.js';
import {IsometricTerrainEngine} from '../.test-build/engine/IsometricTerrainEngine.js';

test('all 15 regions have towns, services, optional treasure and real step-by-step interregional crossings',()=>{
  assert.ok(DOKAPON_NODES.length>=750&&DOKAPON_NODES.length<1000);
  for(const biome of BACKDROP_KEYS.slice(0,15)){
    const region=DOKAPON_NODES.filter(n=>n.regionKey===biome&&!n.routeKind);
    assert.equal(region.length,48);
    for(const type of ['town','shop_item','shop_weapon','shop_magic','church','guild','dark_gate','boss','vault'])assert.ok(region.some(n=>n.type===type),`${biome}: ${type}`);
    assert.ok(region.some(n=>n.neighbors.length>=3),`${biome} needs route choices`);
  }
  const crossings=DOKAPON_NODES.filter(n=>n.routeKind);
  assert.ok(crossings.length>30);
  for(const node of crossings){assert.equal(node.type,'empty');assert.equal(node.neighbors.length,2);assert.equal(node.townData,undefined);assert.equal(node.homeData,undefined);assert.equal(regionalSlotForNode(node),'bridge');}
});

test('each dungeon has six connected rooms, loops, a guardian and a reachable surface exit',()=>{
  const system=new DungeonSystem();
  for(const nodes of [DUNGEON_CATACOMBS_NODES,DUNGEON_VOLCANO_NODES,DUNGEON_FROZEN_NODES]){
    assert.equal(nodes.length,36);assert.equal(new Set(nodes.map(n=>n.subRegionName)).size,6);
    const ids=new Set(nodes.map(n=>n.id)),seen=new Set([nodes[0].id]),queue=[nodes[0]];
    while(queue.length)for(const id of queue.shift().neighbors){assert.ok(ids.has(id));if(!seen.has(id)){seen.add(id);queue.push(nodes.find(n=>n.id===id));}}
    assert.equal(seen.size,36);assert.ok(nodes.some(n=>n.type==='boss'));assert.ok(nodes.some(n=>system.isExitNode(n.id)));
    assert.ok(nodes.every(n=>system.isInDungeon(n.id)));assert.ok(nodes.reduce((n,a)=>n+a.neighbors.length,0)/2>35,'rooms must provide alternate routes');
    const engine=new IsometricTerrainEngine();engine.initTerrain(nodes);
    assert.ok(engine.regionalScenery.length>30,'dungeon needs surrounding room artwork');
    assert.ok(engine.regionalScenery.every(p=>p.theme.startsWith('dungeon_')));
    assert.ok(engine.regionalScenery.some(p=>p.slot==='wall'||p.slot==='cliff'));
  }
});

test('regional artwork has 432 occupied transparent cells, unique sheets and a corresponding building role for every service',()=>{
  const manifest=JSON.parse(fs.readFileSync('docs/art-review/world-rebuild-v1/prompts.json','utf8'));
  assert.deepEqual(manifest.assets.map(a=>a.id),[...BACKDROP_KEYS]);assert.equal(REGIONAL_SLOTS.length,24);
  const hashes=new Set();
  for(const asset of manifest.assets){
    const bytes=fs.readFileSync(asset.asset);hashes.add(createHash('sha256').update(bytes).digest('hex'));
    const {width,height,pixels}=png.decodePNG(asset.asset);
    assert.equal(width,1536);assert.equal(height,1024);
    for(let cell=0;cell<24;cell++){
      let solid=0,clear=0;
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        const alpha=pixels[((Math.floor(cell/6)*256+y)*width+cell%6*256+x)*4+3];
        if(alpha>=100)solid++;if(alpha===0)clear++;
      }
      assert.ok(solid>1000,`${asset.id}/${REGIONAL_SLOTS[cell]} must contain its own artwork`);
      assert.ok(clear>1500,`${asset.id}/${REGIONAL_SLOTS[cell]} must have transparent margins`);
    }
  }
  assert.equal(hashes.size,18);
  for(const node of DOKAPON_NODES.filter(n=>!['empty','blue','red'].includes(n.type)))assert.ok(regionalSlotForNode(node),`${node.type} must have purpose-built art`);
});

test('expanded dungeons give enough torch time for exploration and still reach darkness',()=>{
  const system=new DungeonSystem(),player={id:1};
  for(let step=1;step<=25;step++){
    const torch=system.stepTorch(player);
    assert.equal(torch.torchPct,Math.max(0,100-step*4));
    assert.equal(torch.isDark,step>=20);
  }
});
