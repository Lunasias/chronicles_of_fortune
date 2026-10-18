import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { offscreenDirectionGuides, markerClearance, canShowMovementNavigation } from '../.test-build/engine/NavigationArrows.js';
const {decodePNG}=createRequire(import.meta.url)('../scripts/lib/png.cjs');

test('navigation is private to the local human choosing a move and disappears during travel',()=>{
  assert.equal(canShowMovementNavigation('CHOOSING_PATH',24,false,true),true);
  for(const phase of ['MOVING','BOARD_TURN','ROLLING','TILE_EVENT','TITLE']) {
    assert.equal(canShowMovementNavigation(phase,24,false,true),false);
  }
  assert.equal(canShowMovementNavigation('CHOOSING_PATH',24,false,false),false);
  assert.equal(canShowMovementNavigation('CHOOSING_PATH',24,true,true),false);
  assert.equal(canShowMovementNavigation('CHOOSING_PATH',0,false,true),false);
});

test('offscreen destinations map to all eight generated arrow directions and stay near the hero',()=>{
  const hero={x:640,y:400};
  const targets=Array.from({length:8},(_,sector)=>({id:sector,x:640+Math.cos(sector*Math.PI/4-Math.PI/2)*3000,y:400+Math.sin(sector*Math.PI/4-Math.PI/2)*3000}));
  const guides=offscreenDirectionGuides(hero,targets,1280,800);
  assert.deepEqual(guides.map(g=>g.sector),[0,1,2,3,4,5,6,7]);
  for(const g of guides){assert.equal(g.id,g.sector);assert.equal(g.count,1);assert.ok(g.x>=0&&g.x<=1280&&g.y>=0&&g.y<=800);assert.ok(Math.hypot(g.x-hero.x,g.y-hero.y)<115);}
});
test('visible markers need no compass and many far destinations in one direction share a count and nearest camera target',()=>{
  const guides=offscreenDirectionGuides({x:200,y:400},[{id:1,x:250,y:380},{id:2,x:2000,y:400},{id:3,x:3000,y:400}],800,700);
  assert.equal(guides.length,1);assert.equal(guides[0].sector,2);assert.equal(guides[0].id,2);assert.equal(guides[0].count,2);
  assert.equal(offscreenDirectionGuides({x:200,y:400},[],800,700).length,0);
});
test('panned-offscreen actors and narrow phone screens keep direction buttons in reach',()=>{
  for(const [width,height]of [[390,844],[844,390],[320,568]]){
    const guides=offscreenDirectionGuides({x:-400,y:1000},[{id:5,x:3000,y:-1000}],width,height);
    assert.equal(guides.length,1);assert.ok(guides[0].x>=24&&guides[0].x<=width-24);assert.ok(guides[0].y>=24&&guides[0].y<=height-70);
  }
  assert.ok(markerClearance('town')>markerClearance('empty'));
});
test('generated navigation PNG has real transparency and a visible icon in every atlas cell',()=>{
  const {width,height,pixels}=decodePNG('public/assets/art-v2/navigation-arrows-v1.png');
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    let solid=0,clear=0;
    for(let y=Math.round(row*height/3);y<Math.round((row+1)*height/3);y++)for(let x=Math.round(col*width/3);x<Math.round((col+1)*width/3);x++){
      const a=pixels[(y*width+x)*4+3];if(a>=128)solid++;if(a===0)clear++;
    }
    assert.ok(solid>1000);assert.ok(clear>1000);
  }
});
