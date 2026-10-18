import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import png from '../scripts/lib/png.cjs';
import { DOKAPON_NODES } from '../.test-build/game/BoardMap.js';
import { IsometricTerrainEngine } from '../.test-build/engine/IsometricTerrainEngine.js';
import { projectGroundMaterial, MATERIAL_ORDER } from '../.test-build/engine/GroundMaterials.js';
import { WORLD_DETAIL_NAMES } from '../.test-build/engine/WorldDetails.js';
import { roadPoint, roadField } from '../.test-build/engine/WorldEcology.js';
import { paintTerrainTile } from '../.test-build/engine/IsometricTerrainPainter.js';
import { mapProjection } from '../.test-build/engine/MapProjection.js';

test('large continent contains dense deterministic scenery with clear walking corridors', () => {
  const e = new IsometricTerrainEngine(); e.initTerrain(DOKAPON_NODES);
  assert.ok(e.worldBounds.maxX-e.worldBounds.minX > 10000);
  assert.ok(e.terrainTiles.length > 8000);
  assert.ok(e.regionalScenery.length > 1500);
  assert.equal(e.groves.length,0,'retired generic foliage must not be mixed into regional artwork');
  assert.ok(e.regionalScenery.every(p => p.roadDistance >= 24));
  const road = roadField(DOKAPON_NODES,(x,y,z)=>e.toScreen(x,y,z));
  assert.ok(e.regionalScenery.every(p => road(p.x,p.y)>=24));
  const visible = e.getVisibleRegionalScenery(-500,500,1500,2200);
  assert.ok(visible.length < e.regionalScenery.length/3);
  assert.ok(e.regionalScenery.some(p=>p.slot==='home'));
  assert.ok(e.regionalScenery.some(p=>p.theme==='waterfall_forest'));
  for(const node of DOKAPON_NODES){
    const floor=e.terrainTiles.find(t=>t.gx===node.gx&&t.gy===node.gy);
    assert.equal(floor?.gz,node.gz,`destination ${node.id} must stand on its own ground`);
    assert.equal(floor?.biome,node.biome,`destination ${node.id} must keep its regional material`);
  }
});

test('new material sheet is opaque RGB and every detail atlas cell contains isolated artwork', () => {
  const material = png.decodePNG('public/assets/art-v2/world-rebuild-v1/ground-materials.png');
  assert.equal(MATERIAL_ORDER.length,20);
  for (let i=3;i<material.pixels.length;i+=4) assert.equal(material.pixels[i],255);
  const details = png.decodePNG('public/assets/art-v2/world-details-atlas.png');
  assert.equal(WORLD_DETAIL_NAMES.length,24);
  for (let cell=0;cell<24;cell++) {
    let count=0,clear=0;
    for (let y=0;y<256;y++) for(let x=0;x<256;x++) {
      const alpha=details.pixels[((Math.floor(cell/6)*256+y)*details.width+(cell%6*256+x))*4+3];
      if(alpha>=80)count++;else clear++;
    }
    assert.ok(count>2500,WORLD_DETAIL_NAMES[cell]); assert.ok(clear>2500,WORLD_DETAIL_NAMES[cell]);
  }
});

test('ground material projection preserves alpha, seams and cliffs, and shades night pixels', () => {
  const source = new Uint8ClampedArray(96*96*4);
  for(let i=0;i<96*96;i++){source[i*4]=i%96+90;source[i*4+1]=Math.floor(i/96)+80;source[i*4+2]=110;source[i*4+3]=255;}
  const base=paintTerrainTile('grass',{cliffs:true}).data;
  const day=base.slice(),night=base.slice(),variant=base.slice();
  projectGroundMaterial(day,source,0,false);projectGroundMaterial(night,source,0,true);projectGroundMaterial(variant,source,2,false);
  for(let y=0;y<96;y++)for(let x=0;x<104;x++){
    const i=(y*104+x)*4; assert.equal(day[i+3],base[i+3]);
    if(y>=52||Math.abs((x-52)/48)+Math.abs((y-28)/24)>=.96) assert.deepEqual(day.slice(i,i+4),base.slice(i,i+4));
  }
  assert.notDeepEqual(day,base);assert.notDeepEqual(day,variant);
  const center=(28*104+52)*4;assert.ok(night[center]<day[center]);
});

test('winding paths keep exact endpoints and minimap fits expanded world and dungeon coordinates', () => {
  assert.deepEqual(roadPoint(10,20,200,100,0),{x:10,y:20});assert.deepEqual(roadPoint(10,20,200,100,1),{x:210,y:120});
  for(const points of [DOKAPON_NODES,[{gx:180,gy:140},{gx:188,gy:144}]]) {
    const project=mapProjection(points,132,132);
    for(const point of points){const p=project(point.gx,point.gy);assert.ok(p.x>=7&&p.x<=125&&p.y>=7&&p.y<=125);}
  }
});
