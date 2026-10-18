// Read-only by default. The explicit flag records a manifest for newly generated artwork.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decodePNG } = require('./lib/png.cjs');
const root = path.resolve(__dirname, '../public/assets/presentation-v1');
const grids = { 'promotion-2': [4,9], 'promotion-3': [4,9], 'companions-1': [3,9], 'companions-2': [3,9], 'companions-3': [3,9], world: [6,6], impact: [6,6] };
const assets = [];
for (const [name, [columns, rows]] of Object.entries(grids)) {
  const filename = path.join(root, name + '.png');
  const bytes = fs.readFileSync(filename);
  const { width, height, pixels } = decodePNG(filename);
  let transparent = 0, visible = 0;
  for (let i=3;i<pixels.length;i+=4) { if(pixels[i] === 0) transparent++; if(pixels[i] > 80) visible++; }
  if (transparent < width * height * .12) throw new Error(name + ': missing transparent gutters');
  const coverage = [];
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    let count=0;
    for(let y=Math.round(row*height/rows);y<Math.round((row+1)*height/rows);y++) for(let x=Math.round(col*width/columns);x<Math.round((col+1)*width/columns);x++) if(pixels[(y*width+x)*4+3]>80) count++;
    if(count<20) throw new Error(`${name}: empty cell ${col},${row}`);
    coverage.push(count);
  }
  assets.push({name:name+'.png',width,height,columns,rows,frames:columns*rows,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),coverage});
  console.log(`${name}: ${width}x${height}, ${columns*rows} occupied cells, ${Math.round(transparent/width/height*100)}% transparent`);
}
if(process.argv.includes('--write-manifest')) fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({version:1,provider:'OpenAI built-in image generation',generatedOn:'2026-10-18',assets},null,2)+'\n');
