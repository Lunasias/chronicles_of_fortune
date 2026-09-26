// Rebuilds the road graph in src/game/BoardMap.ts:
//   * drops any neighbour link longer than 5.5 grid units
//   * connects each disconnected realm to the main landmass with the shortest bridge
//   * rewrites the node array in the canonical formatting used by the file
//
// This script MODIFIES a tracked source file. It is dry-run by default; pass --write to
// apply. Always review `git diff src/game/BoardMap.ts` afterwards.
//
// Usage:
//   node scripts/fix_board_connections.cjs            # dry run, prints the plan
//   node scripts/fix_board_connections.cjs --write    # rewrite BoardMap.ts
const fs = require('fs');

const TARGET = 'src/game/BoardMap.ts';
const ANCHOR = 'export const DOKAPON_NODES: BoardNode[] = ';
const MAX_ROAD_DISTANCE = 5.5;

const write = process.argv.includes('--write');
const content = fs.readFileSync(TARGET, 'utf8');

const startIdx = content.indexOf(ANCHOR);
if (startIdx < 0) throw new Error(`could not find ${ANCHOR} in ${TARGET}`);
const arrStart = content.indexOf('[', startIdx + ANCHOR.length);
let depth = 0;
let arrEnd = -1;
for (let i = arrStart; i < content.length; i++) {
  if (content[i] === '[') depth++;
  else if (content[i] === ']') {
    depth--;
    if (depth === 0) { arrEnd = i; break; }
  }
}
if (arrEnd < 0) throw new Error('could not locate the DOKAPON_NODES array literal');

const nodes = JSON.parse(content.slice(arrStart, arrEnd + 1));
const nodeMap = new Map(nodes.map(n => [n.id, n]));

const cleanAdj = new Map();
nodes.forEach(n => cleanAdj.set(n.id, new Set()));

// Filter edges: keep road edges within MAX_ROAD_DISTANCE units
let droppedEdges = 0;
for (const node of nodes) {
  for (const nId of node.neighbors) {
    const target = nodeMap.get(nId);
    if (!target) { droppedEdges++; continue; }
    const dist = Math.hypot(target.gx - node.gx, target.gy - node.gy);
    if (dist <= MAX_ROAD_DISTANCE) {
      cleanAdj.get(node.id).add(nId);
      cleanAdj.get(nId).add(node.id);
    } else {
      droppedEdges++;
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
        if (!visited.has(next)) { visited.add(next); q.push(next); }
      }
    }
    components.push(comp);
  }
  return components;
}

let comps = getComponents();
console.log(`nodes=${nodes.length} droppedEdges=${droppedEdges} components=${comps.length}`);

const newBridges = [];
while (comps.length > 1) {
  comps.sort((a, b) => b.length - a.length);
  const mainComp = comps[0];
  const mainSet = new Set(mainComp);

  let bestDist = Infinity;
  let bestPair = null;

  for (let cIdx = 1; cIdx < comps.length; cIdx++) {
    for (const idA of comps[cIdx]) {
      const nodeA = nodeMap.get(idA);
      for (const idB of mainSet) {
        const nodeB = nodeMap.get(idB);
        const dist = Math.hypot(nodeA.gx - nodeB.gx, nodeA.gy - nodeB.gy);
        if (dist < bestDist) { bestDist = dist; bestPair = [idA, idB]; }
      }
    }
  }

  if (!bestPair) break;
  const nodeA = nodeMap.get(bestPair[0]);
  const nodeB = nodeMap.get(bestPair[1]);
  console.log(`  bridge: ${nodeA.realmName} "${nodeA.name}" #${nodeA.id} <-> "${nodeB.name}" #${nodeB.id} (dist ${bestDist.toFixed(1)})`);
  newBridges.push([bestPair[0], bestPair[1]]);
  cleanAdj.get(bestPair[0]).add(bestPair[1]);
  cleanAdj.get(bestPair[1]).add(bestPair[0]);
  comps = getComponents();
}

// Mark the newly discovered bridges. Existing isGrandBridge flags are deliberately left
// alone: the graph is already fully connected, so newBridges is normally empty and
// clearing the flags here would silently remove every bridge's custom artwork.
for (const [a, b] of newBridges) {
  nodeMap.get(a).isGrandBridge = true;
  nodeMap.get(b).isGrandBridge = true;
}

for (const node of nodes) {
  node.neighbors = Array.from(cleanAdj.get(node.id)).sort((a, b) => a - b);
}

const degrees = nodes.map(n => n.neighbors.length);
const isolated = nodes.filter(n => n.neighbors.length === 0).map(n => n.id);
console.log(`final components=${getComponents().length} avgDegree=${(degrees.reduce((a, b) => a + b, 0) / degrees.length).toFixed(2)}`);
if (isolated.length) console.log(`WARNING isolated nodes: ${isolated.join(', ')}`);

if (!write) {
  console.log('\nDry run: nothing written. Re-run with --write to apply.');
  process.exit(0);
}

const out = content.slice(0, startIdx) + ANCHOR + JSON.stringify(nodes, null, 2) + ';\n';
fs.writeFileSync(TARGET, out, 'utf8');
console.log(`\nWrote ${TARGET}. Review with: git diff ${TARGET}`);
