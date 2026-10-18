import "./_browser-stubs.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {BACKDROP_KEYS,backdropKey,backdropCover} from "../.test-build/engine/GeneratedBackdrops.js";

test("every board biome and dungeon has unique generated production backdrop artwork",()=>{
  const source=fs.readFileSync("src/game/BoardMap.ts","utf8").split("export type BiomeType =")[1].split(";")[0];
  const biomes=[...source.matchAll(/\x27([^\x27]+)\x27/g)].map(m=>m[1]);
  for(const biome of biomes) assert.equal(backdropKey(biome),biome);
  const manifest=JSON.parse(fs.readFileSync("docs/art-review/backdrops-v1.json","utf8"));
  assert.deepEqual(manifest.assets.map(a=>a.id),[...BACKDROP_KEYS]);
  const hashes=new Set();
  for(const asset of manifest.assets){
    const png=fs.readFileSync(asset.asset);
    assert.equal(png.subarray(1,4).toString(),"PNG");
    assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
    hashes.add(createHash("sha256").update(png).digest("hex"));
  }
  assert.equal(hashes.size,18);
});

test("dungeon node identity overrides surface biome including all three exits",()=>{
  for(const [start,key] of [[1000,"dungeon_catacombs"],[1100,"dungeon_volcano"],[1200,"dungeon_ice"]]){
    for(let id=start;id<=start+6;id++)assert.equal(backdropKey("grass",id),key);
  }
  assert.equal(backdropKey("unknown"),"grass");
  assert.equal(backdropKey("snow",999),"snow");
});

test("backdrop cover preserves aspect ratio and never exposes blank viewport edges",()=>{
  for(const [w,h]of [[1920,1080],[1280,720],[390,844],[844,390]]){
    const crop=backdropCover(1536,1024,w,h);
    assert.ok(crop.sx>=0&&crop.sy>=0&&crop.sx+crop.sw<=1536&&crop.sy+crop.sh<=1024);
    assert.ok(Math.abs(crop.sw/crop.sh-w/h)<.01);
  }
});
