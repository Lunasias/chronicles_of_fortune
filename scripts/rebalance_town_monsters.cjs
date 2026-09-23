const fs = require('fs');

const content = fs.readFileSync('src/game/BoardMap.ts', 'utf8');
const startIdx = content.indexOf('export const DOKAPON_NODES: BoardNode[] = [');
const endIdx = content.lastIndexOf('];');
const arrayStr = content.substring(startIdx + 'export const DOKAPON_NODES: BoardNode[] = '.length, endIdx + 1);
const nodes = JSON.parse(arrayStr);

let townCount = 0;
for (const node of nodes) {
  if (node.townData && node.townData.isOccupiedByMonster) {
    townCount++;
    const realm = node.realmId;
    let baseHp = 90, atk = 14, def = 10;
    if (realm === 'solaria' || realm === 'emerald') {
      baseHp = 85 + Math.floor(Math.random() * 30);
      atk = 13 + Math.floor(Math.random() * 4);
      def = 8 + Math.floor(Math.random() * 3);
    } else if (realm === 'sunfire' || node.biome === 'steampunk' || node.biome === 'sakura_shrine') {
      baseHp = 170 + Math.floor(Math.random() * 50);
      atk = 22 + Math.floor(Math.random() * 6);
      def = 15 + Math.floor(Math.random() * 5);
    } else if (realm === 'frostpeak' || node.biome === 'volcano') {
      baseHp = 290 + Math.floor(Math.random() * 70);
      atk = 34 + Math.floor(Math.random() * 8);
      def = 24 + Math.floor(Math.random() * 6);
    } else if (realm === 'abyss' || realm === 'celestial') {
      baseHp = 460 + Math.floor(Math.random() * 100);
      atk = 48 + Math.floor(Math.random() * 10);
      def = 35 + Math.floor(Math.random() * 8);
    }

    node.townData.monsterHp = baseHp;
    node.townData.monsterMaxHp = baseHp;
    node.townData.monsterAtk = atk;
    node.townData.monsterDef = def;
  }
}

console.log(`Rebalanced ${townCount} towns across all realms with progressive difficulty!`);
const updatedArrayStr = JSON.stringify(nodes, null, 2);
const newContent = content.substring(0, startIdx + 'export const DOKAPON_NODES: BoardNode[] = '.length) +
                   updatedArrayStr + ';\n';
fs.writeFileSync('src/game/BoardMap.ts', newContent, 'utf8');
console.log('BoardMap.ts updated successfully!');
