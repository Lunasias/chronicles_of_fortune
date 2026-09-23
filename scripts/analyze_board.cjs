const fs = require('fs');

const content = fs.readFileSync('src/game/BoardMap.ts', 'utf8');
const nodeRegex = /\{\s*"id":\s*(\d+),[\s\S]*?"gx":\s*(-?\d+),[\s\S]*?"gy":\s*(-?\d+),[\s\S]*?"neighbors":\s*(\[[^\]]*\])/g;
let m;
const nodes = [];
while ((m = nodeRegex.exec(content)) !== null) {
  nodes.push({ id: parseInt(m[1]), gx: parseInt(m[2]), gy: parseInt(m[3]), neighbors: JSON.parse(m[4]) });
}
console.log('Total nodes parsed:', nodes.length);

let dists = [];
for (let i = 0; i < nodes.length; i++) {
  let minD = 999;
  for (let j = 0; j < nodes.length; j++) {
    if (i === j) continue;
    const d = Math.hypot(nodes[i].gx - nodes[j].gx, nodes[i].gy - nodes[j].gy);
    if (d < minD) minD = d;
  }
  dists.push(minD);
}
console.log('Average nearest-neighbor distance:', (dists.reduce((a,b)=>a+b,0)/dists.length).toFixed(2));
console.log('Max nearest-neighbor distance:', Math.max(...dists));
console.log('Min nearest-neighbor distance:', Math.min(...dists));
