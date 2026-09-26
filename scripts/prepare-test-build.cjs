// Post-processes the `.test-build` output so Node's ESM loader can run it.
//
// The sources use bundler-style extensionless relative imports (`from './Player'`), which is
// what Vite expects but which Node's ESM resolver rejects. tsc preserves those specifiers,
// so after `tsc -p tsconfig.test.json` this script appends the explicit `.js` extension.
//
// Run automatically by `npm run pretest`.
const fs = require('fs');
const path = require('path');

const BUILD_DIR = '.test-build';

if (!fs.existsSync(BUILD_DIR)) {
  console.error(`${BUILD_DIR} not found - run \`tsc -p tsconfig.test.json\` first.`);
  process.exit(1);
}

let rewritten = 0;
let visited = 0;

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    visited++;

    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(
      /(\bfrom\s*['"])(\.\.?\/[^'"]+?)(['"])/g,
      (match, prefix, specifier, quote) => {
        // Leave anything that already carries an extension alone.
        if (/\.[a-zA-Z0-9]+$/.test(specifier)) return match;
        rewritten++;
        return `${prefix}${specifier}.js${quote}`;
      }
    );
    // Also cover bare `import './x'` side-effect imports.
    const after2 = after.replace(
      /(\bimport\s*['"])(\.\.?\/[^'"]+?)(['"])/g,
      (match, prefix, specifier, quote) => {
        if (/\.[a-zA-Z0-9]+$/.test(specifier)) return match;
        rewritten++;
        return `${prefix}${specifier}.js${quote}`;
      }
    );

    if (after2 !== before) fs.writeFileSync(full, after2, 'utf8');
  }
})(BUILD_DIR);

// Node's ESM loader requires an import attribute for JSON modules, which tsc does not emit
// (Vite resolves JSON imports natively, so only this test build needs the attribute).
let jsonAttributes = 0;
(function addJsonImportAttributes(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      addJsonImportAttributes(full);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;

    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(
      /(\bfrom\s*['"])(\.\.?\/[^'"]+\.json)(['"])(?!\s*with\b)/g,
      (match, prefix, specifier, quote) => {
        jsonAttributes++;
        return `${prefix}${specifier}${quote} with { type: 'json' }`;
      }
    );
    if (after !== before) fs.writeFileSync(full, after, 'utf8');
  }
})(BUILD_DIR);

console.log(
  `prepare-test-build: ${visited} files scanned, ${rewritten} import specifiers resolved, ` +
    `${jsonAttributes} JSON import attributes added`
);
