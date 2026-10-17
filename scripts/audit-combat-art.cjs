const fs=require('node:fs'),crypto=require('node:crypto');const {decodePNG}=require('./lib/png.cjs');
const plan=JSON.parse(fs.readFileSync('docs/art-review/combat-v3/plan.json','utf8'));const assets=[];
for(const sheet of plan){const path='public/assets/combat-v3/'+sheet.file,raw=fs.readFileSync(path),image=decodePNG(path),{width,height,pixels}=image;
  if(width%6||height%4)throw Error('Invalid grid '+path);
  let clear=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)clear++;
  const frames=[];const cw=width/6,ch=height/4;
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){
    let solid=0;const hash=crypto.createHash('sha256');
    for(let y=0;y<ch;y++){const start=((row*ch+y)*width+col*cw)*4,scan=pixels.subarray(start,start+cw*4);hash.update(scan);for(let i=3;i<scan.length;i+=4)if(scan[i]>=80)solid++;}
    if(solid<50)throw Error('Empty cell '+path+' '+row+','+col);
    frames.push({row,col,solid,sha256:hash.digest('hex')});
  }
  assets.push({file:sheet.file,width,height,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),clearRatio:clear/(width*height),frames});
}
const manifest={version:3,source:'Built-in image_gen; original transparent generated PNGs, no code-painted effect art',columns:6,rows:4,profiles:132,frames:792,assets};
fs.writeFileSync('public/assets/combat-v3/manifest.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({sheets:assets.length,frames:assets.reduce((sum,a)=>sum+a.frames.length,0),MiB:assets.reduce((sum,a)=>sum+a.bytes,0)/1048576,minClear:Math.min(...assets.map(a=>a.clearRatio)),maxClear:Math.max(...assets.map(a=>a.clearRatio))}));
