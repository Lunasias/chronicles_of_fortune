// Rebalances monster stats for every monster-occupied town in src/game/BoardMap.ts using
// progressive difficulty tiers per realm.
//
// This script MODIFIES a tracked source file. It is dry-run by default; pass --write to
// apply. Randomness is seeded so the same seed always produces the same stats - the
// original version used bare Math.random(), which made every run different and the
// "rebalanced" result impossible to review or reproduce.
//
// Usage:
//   node scripts/rebalance_town_monsters.cjs                   # dry run, prints the plan
//   node scripts/rebalance_town_monsters.cjs --write           # rewrite BoardMap.ts
//   node scripts/rebalance_town_monsters.cjs --write --seed=42 # pick a different seed
const fs = require('fs');

const TARGET = 'src/game/BoardMap.ts';
const ANCHOR = 'export const DOKAPON_NODES: BoardNode[] = ';

const write = process.argv.includes('--write');
const seedArg = process.argv.find(a => a.startsWith('--seed='));
const seed = seedArg ? Number(seedArg.split('=')[1]) : 1337;
if (!Number.isFinite(seed)) throw new Error('--seed must be a number');

/** mulberry32 - small deterministic PRNG so rebalances are reproducible. */
function makeRng(state) {
  let a = state >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(seed);
const randInt = n => Math.floor(rng() * n);

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

let townCount = 0;
const changes = [];
for (const node of nodes) {
  if (node.townData && node.townData.isOccupiedByMonster) {
    townCount++;
    const realm = node.realmId;
    let baseHp = 90;
    let atk = 14;
    let def = 10;
    if (realm === 'solaria' || realm === 'emerald') {
      baseHp = 85 + randInt(30);
      atk = 13 + randInt(4);
      def = 8 + randInt(3);
    } else if (realm === 'sunfire' || node.biome === 'steampunk' || node.biome === 'sakura_shrine') {
      baseHp = 170 + randInt(50);
      atk = 22 + randInt(6);
      def = 15 + randInt(5);
    } else if (realm === 'frostpeak' || node.biome === 'volcano') {
      baseHp = 290 + randInt(70);
      atk = 34 + randInt(8);
      def = 24 + randInt(6);
    } else if (realm === 'abyss' || realm === 'celestial') {
      baseHp = 460 + randInt(100);
      atk = 48 + randInt(10);
      def = 35 + randInt(8);
    }

    if (node.townData.monsterHp !== baseHp) {
      changes.push(
        `  #${node.id} ${node.townData.name || node.name}: hp ${node.townData.monsterHp} -> ${baseHp}, ` +
        `atk ${node.townData.monsterAtk} -> ${atk}, def ${node.townData.monsterDef} -> ${def}`
      );
    }

    node.townData.monsterHp = baseHp;
    node.townData.monsterMaxHp = baseHp;
    node.townData.monsterAtk = atk;
    node.townData.monsterDef = def;
  }
}

console.log(`seed=${seed} monster-occupied towns=${townCount} stat changes=${changes.length}`);
if (changes.length) console.log(changes.join('\n'));

if (!write) {
  console.log('\nDry run: nothing written. Re-run with --write to apply.');
  process.exit(0);
}

const out = content.slice(0, startIdx) + ANCHOR + JSON.stringify(nodes, null, 2) + ';\n';
fs.writeFileSync(TARGET, out, 'utf8');
console.log(`\nWrote ${TARGET}. Review with: git diff ${TARGET}`);
