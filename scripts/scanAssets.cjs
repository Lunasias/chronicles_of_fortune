const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public', 'assets');

function scan(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...scan(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const files = scan(root);
const byCategory = {};

files.forEach(f => {
  const rel = path.relative(root, f);
  const topFolder = rel.split(path.sep)[0];
  if (!byCategory[topFolder]) byCategory[topFolder] = [];
  byCategory[topFolder].push(rel);
});

console.log('Total files:', files.length);
for (const [cat, list] of Object.entries(byCategory)) {
  console.log(`\n=== [${cat}] (${list.length} files) ===`);
  list.slice(0, 8).forEach(item => console.log('  ', item));
  if (list.length > 8) console.log(`   ... and ${list.length - 8} more`);
}
