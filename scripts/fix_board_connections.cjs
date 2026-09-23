const fs = require('fs');

const content = fs.readFileSync('src/game/BoardMap.ts', 'utf8');
const startIdx = content.indexOf('export const DOKAPON_NODES: BoardNode[] = [');
const endIdx = content.lastIndexOf('];');
const arrayStr = content.substring(startIdx + 'export const DOKAPON_NODES: BoardNode[] = '.length, endIdx + 1);
const nodes = JSON.parse(arrayStr);
const nodeMap = new Map();
nodes.forEach(n => nodeMap.set(n.id, n));

const cleanAdj = new Map();
nodes.forEach(n => cleanAdj.set(n.id, new Set()));

// Filter edges: keep road edges within 5.5 units
for (const node of nodes) {
  for (const nId of node.neighbors) {
    const target = nodeMap.get(nId);
    if (!target) continue;
    const dist = Math.hypot(target.gx - node.gx, target.gy - node.gy);
    if (dist <= 5.5) {
      cleanAdj.get(node.id).add(nId);
      cleanAdj.get(nId).add(node.id);
    }
  }
}

function getComponents() {
  const visited = new Set();
  const components = [];
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const comp = [];
    const q = [node.id];
    visited.add(node.id);
    while (q.length > 0) {
      const curr = q.shift();
      comp.push(curr);
      for (const next of cleanAdj.get(curr)) {
        if (!visited.has(next)) {
          visited.add(next);
          q.push(next);
        }
      }
    }
    components.push(comp);
  }
  return components;
}

let comps = getComponents();
console.log('Components before bridges:', comps.length);

// Connect each realm to the main world via the closest gateway bridge pair
while (comps.length > 1) {
  comps.sort((a, b) => b.length - a.length);
  const mainComp = comps[0];
  const mainSet = new Set(mainComp);

  let bestDist = Infinity;
  let bestPair = null;
  let bestCompIdx = -1;

  for (let cIdx = 1; cIdx < comps.length; cIdx++) {
    const comp = comps[cIdx];
    for (const idA of comp) {
      const nodeA = nodeMap.get(idA);
      for (const idB of mainSet) {
        const nodeB = nodeMap.get(idB);
        const dist = Math.hypot(nodeA.gx - nodeB.gx, nodeA.gy - nodeB.gy);
        if (dist < bestDist) {
          bestDist = dist;
          bestPair = [idA, idB];
          bestCompIdx = cIdx;
        }
      }
    }
  }

  if (bestPair) {
    const nodeA = nodeMap.get(bestPair[0]);
    const nodeB = nodeMap.get(bestPair[1]);
    console.log(`Connecting ${nodeA.realmName} (${nodeA.name} #${nodeA.id}) <--> ${nodeB.realmName} (${nodeB.name} #${nodeB.id}) [Bridge dist: ${bestDist.toFixed(1)}]`);
    cleanAdj.get(bestPair[0]).add(bestPair[1]);
    cleanAdj.get(bestPair[1]).add(bestPair[0]);
    // Mark bridge
    nodeA.isGrandBridge = true;
    nodeB.isGrandBridge = true;
  }
  comps = getComponents();
}

console.log('\nAll realms connected! Single unified graph of 312 nodes.');

// Update nodes with clean neighbors
for (const node of nodes) {
  node.neighbors = Array.from(cleanAdj.get(node.id)).sort((a, b) => a - b);
}

// Check degree stats
const degrees = nodes.map(n => n.neighbors.length);
const degCounts = {};
degrees.forEach(d => degCounts[d] = (degCounts[d] || 0) + 1);
console.log('Final Degree counts:', degCounts);
console.log('Average degree:', (degrees.reduce((a, b) => a + b, 0) / degrees.length).toFixed(2));

// Save updated BoardMap.ts
const updatedArrayStr = JSON.stringify(nodes, null, 2);
const newContent = content.substring(0, startIdx + 'export const DOKAPON_NODES: BoardNode[] = '.length) +
                   updatedArrayStr + ';\n';
fs.writeFileSync('src/game/BoardMap.ts', newContent, 'utf8');
console.log('Successfully updated src/game/BoardMap.ts with clean tactical road graph!');
