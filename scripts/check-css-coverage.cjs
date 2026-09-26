// Guards the build-time Tailwind migration: every utility class used by the app must have
// a rule in the compiled stylesheet. Run after `npm run build`.
//
// This exists because the project used the Tailwind Play CDN, which compiled whatever it
// saw in the DOM at runtime. A build-time scan is equivalent only as long as every utility
// is written as a complete literal in a scanned file - this script proves that it is.
const fs = require('fs');
const path = require('path');

const ASSETS = 'dist/assets';

if (!fs.existsSync(ASSETS)) {
  console.error('dist/assets not found - run `npm run build` first.');
  process.exit(1);
}

const cssFile = fs.readdirSync(ASSETS).find(f => f.endsWith('.css'));
if (!cssFile) {
  console.error('no compiled stylesheet in dist/assets - run `npm run build` first.');
  process.exit(1);
}
const css = fs.readFileSync(path.join(ASSETS, cssFile), 'utf8');
console.log(`stylesheet: dist/assets/${cssFile} (${(css.length / 1024).toFixed(1)} kB)`);

// ---------------------------------------------------------------- gather sources
const sources = ['index.html'];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.ts')) sources.push(p);
  }
})('src');

/**
 * Returns the tokens a class-bearing string actually styles. Interpolations are stripped
 * first, because `${isFirst ? 'a' : 'b'}` contributes a JS identifier that is not a class.
 */
function styleTokens(value) {
  return value
    .replace(/\$\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const styleClasses = new Set();
/** Classes referenced only as JS selectors need no CSS rule. */
const selectorClasses = new Set();

for (const f of sources) {
  const text = fs.readFileSync(f, 'utf8');

  for (const m of text.matchAll(/(?:class|className)\s*=\s*["'`]([^"'`]*)["'`]/g)) {
    styleTokens(m[1]).forEach(t => styleClasses.add(t));
  }
  for (const m of text.matchAll(/className\s*\+=\s*["'`]([^"'`]*)["'`]/g)) {
    styleTokens(m[1]).forEach(t => styleClasses.add(t));
  }
  for (const m of text.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) {
      styleTokens(q[1]).forEach(t => styleClasses.add(t));
    }
  }
  // class="..." written inside a TS template literal (may contain ${...})
  for (const m of text.matchAll(/class="([^"]*)"/g)) {
    styleTokens(m[1]).forEach(t => styleClasses.add(t));
  }
  for (const m of text.matchAll(/querySelector(?:All)?\(\s*["'`]\.([^"'`]+)["'`]/g)) {
    styleTokens(m[1]).forEach(t => selectorClasses.add(t));
  }
}

// ---------------------------------------------------------------- classify
const isUsableSelector = t =>
  /^[a-z]/.test(t) &&
  /^[a-z0-9:_\-[\]/.%#!]+$/.test(t) &&
  t.length < 60;

// Component classes defined by the project itself in the inline <style> in index.html.
const inlineStyle = fs.readFileSync('index.html', 'utf8').split('</style>')[0];
const isCustomClass = t => inlineStyle.includes(`.${t}`) || selectorClasses.has(t);

const candidates = [...styleClasses].filter(isUsableSelector);

const missing = [];
const skipped = [];
for (const t of candidates) {
  const pattern =
    '\\.' +
    t
      .split('')
      .map(ch => (/[a-zA-Z0-9-]/.test(ch) ? ch : '\\\\?' + ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')))
      .join('');
  if (new RegExp(pattern).test(css)) continue;
  if (isCustomClass(t)) skipped.push(t);
  else missing.push(t);
}

console.log(`style classes checked: ${candidates.length}`);
console.log(`covered by custom inline CSS / JS-only selectors: ${skipped.length}`);

if (missing.length) {
  console.error(`\nMISSING from compiled stylesheet (${missing.length}):`);
  console.error(missing.sort().join('\n'));
  console.error('\nEither the class is misspelled, or it is built dynamically and therefore');
  console.error('invisible to the content scanner. Add it to tailwind.config.js safelist.');
  process.exit(1);
}

// ---------------------------------------------------------------- hard spot checks
const mustHave = [
  'max-w-\\[95vw\\]',
  'sm\\:text-\\[10px\\]',
  'bg-slate-950\\/90',
  'hover\\:text-white',
  'md\\:grid-cols-2',
  'bg-\\[\\#080d1a\\]',
  'pointer-events-none',
  'z-25',
  'z-35',
  'z-45',
  'backdrop-blur-xs',
  'xs\\:inline'
];
const spotFails = mustHave.filter(sel => !css.includes(sel));
console.log(`spot checks: ${mustHave.length - spotFails.length}/${mustHave.length} present`);
if (spotFails.length) {
  console.error('SPOT FAIL: ' + spotFails.join(', '));
  process.exit(1);
}

console.log('\nOK: compiled stylesheet covers every utility class used by the app.');
