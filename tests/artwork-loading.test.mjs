import './_browser-stubs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichEnvironmentPixels } from '../.test-build/engine/VibrantPalette.js';

test('environment palette increases chroma without changing alpha, transparent pixels or neutral white',()=>{
  const pixels=new Uint8ClampedArray([70,120,55,255, 200,80,140,128, 4,5,6,0, 255,255,255,255]);
  enrichEnvironmentPixels(pixels);
  assert.ok(pixels[1]-pixels[2]>65);assert.ok(pixels[1]>=120);
  assert.ok(pixels[4]-pixels[5]>120);assert.equal(pixels[7],128);
  assert.deepEqual(Array.from(pixels.slice(8,12)),[4,5,6,0]);
  assert.deepEqual(Array.from(pixels.slice(12)),[255,255,255,255]);
});

test('art loading waits for every image and two repaints, including failed requests',async()=>{
  const oldImage=globalThis.Image,oldDocument=globalThis.document,oldRAF=globalThis.requestAnimationFrame;
  const images=[],raf=[],progress={},button={addEventListener(){},hidden:true},heading={},paragraph={};let overlay;
  globalThis.Image=class{constructor(){this.events={};images.push(this);}addEventListener(type,fn){this.events[type]=fn;}};
  globalThis.document={body:{appendChild(e){overlay=e;}},createElement(){return{hidden:false,setAttribute(){},querySelector(s){return s==='button'?button:s==='h2'?heading:s==='p'?paragraph:progress;}};}};
  globalThis.requestAnimationFrame=fn=>raf.push(fn);
  try{
    const {createArtworkImage}=await import('../.test-build/engine/ArtworkLoading.js');
    createArtworkImage();createArtworkImage();assert.equal(overlay.hidden,false);assert.equal(progress.max,2);
    images[0].events.load();while(raf.length)raf.shift()();assert.equal(overlay.hidden,false);
    images[1].events.load();assert.equal(overlay.hidden,false);
    raf.shift()();assert.equal(overlay.hidden,false);raf.shift()();assert.equal(overlay.hidden,true);
    createArtworkImage();images[2].events.error();while(raf.length)raf.shift()();
    assert.equal(overlay.hidden,false);assert.equal(button.hidden,false);assert.match(heading.textContent,/ไม่สำเร็จ/);
  }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;globalThis.requestAnimationFrame=oldRAF;}
});

test('the HTML illustration stays up through boot and is reused for later map artwork', async () => {
  const oldImage=globalThis.Image,oldDocument=globalThis.document,oldRAF=globalThis.requestAnimationFrame;
  const images=[],raf=[],progress={},button={addEventListener(){},hidden:true},heading={},paragraph={};
  const overlay={isConnected:true,hidden:false,setAttribute(){},querySelector(s){return s==='button'?button:s==='h2'?heading:s==='p'?paragraph:progress;}};
  let appended=0;
  globalThis.Image=class{constructor(){this.events={};images.push(this);}addEventListener(type,fn){this.events[type]=fn;}};
  globalThis.document={getElementById(){return overlay;},body:{appendChild(){appended++;}}};
  globalThis.requestAnimationFrame=fn=>raf.push(fn);
  try {
    const {createArtworkImage,completeArtworkBoot}=await import('../.test-build/engine/ArtworkLoading.js?boot-cover');
    createArtworkImage();images[0].events.load();while(raf.length)raf.shift()();
    assert.equal(overlay.hidden,false,'an atlas completing must not dismiss the boot cover');
    completeArtworkBoot();raf.shift()();assert.equal(overlay.hidden,false);raf.shift()();
    assert.equal(overlay.hidden,true);assert.equal(appended,0,'the HTML cover is reused without duplication');
    createArtworkImage();assert.equal(overlay.hidden,false,'a later biome load restores the illustrated cover');
    images[1].events.load();while(raf.length)raf.shift()();assert.equal(overlay.hidden,true);
  } finally {globalThis.Image=oldImage;globalThis.document=oldDocument;globalThis.requestAnimationFrame=oldRAF;}
});
