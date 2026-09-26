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
// The theme-dependent utilities. Each of these was silently doing nothing until tailwind.config.js
// was given the missing step, so they are the ones worth failing the build over.
//
// `z-35` was on this list until the CRT scanline overlay was removed: it was the only element
// using that step, so Tailwind stopped generating it, and asserting its presence would now assert
// that a removed overlay still exists.
const mustHave = [
  'max-w-\\[95vw\\]',
  'sm\\:text-\\[10px\\]',
  'bg-slate-950\\/90',
  'hover\\:text-white',
  'md\\:grid-cols-2',
  'bg-\\[\\#080d1a\\]',
  'pointer-events-none',
  'z-25',
  'z-45',
  'xs\\:inline'
];
const spotFails = mustHave.filter(sel => !css.includes(sel));
console.log(`spot checks: ${mustHave.length - spotFails.length}/${mustHave.length} present`);
if (spotFails.length) {
  console.error('SPOT FAIL: ' + spotFails.join(', '));
  process.exit(1);
}

// ---------------------------------------------------------------- pixel UI system
// The project's own component classes live in the inline <style> in index.html, which is not part
// of the extracted stylesheet, so this checks the built HTML instead. Without it a Vite change
// that moved or dropped the inline block would leave every panel unstyled and nothing would fail.
const builtHtml = fs.existsSync('dist/index.html') ? fs.readFileSync('dist/index.html', 'utf8') : '';
const pixelClasses = [
  '.pixel-box',
  '.pixel-box-gold',
  '.pixel-btn',
  '.pixel-btn-red',
  '.pixel-bar',
  '.pixel-bar-fill',
  '.pixel-head',
  '.pixel-well',
  '.pixel-chip',
  '.pixel-close',
  '.pixel-tab',
  '.command-card'
];
const pixelFails = pixelClasses.filter(sel => !builtHtml.includes(sel));
console.log(`pixel UI components in dist/index.html: ${pixelClasses.length - pixelFails.length}/${pixelClasses.length}`);
if (pixelFails.length) {
  console.error('PIXEL UI FAIL: ' + pixelFails.join(', '));
  process.exit(1);
}

// The old chrome must not be able to creep back in unnoticed: a single rounded, blurred panel is
// enough to make the whole UI read as a modern glass card again.
const glassUtilities = [
  'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
  'backdrop-blur', 'shadow-2xl', 'shadow-xl', 'bg-gradient-to-'
];
const glassFails = glassUtilities.filter(sel => builtHtml.includes(`class="`) && builtHtml.includes(sel));
if (glassFails.length) {
  console.error('GLASS UI REGRESSION in dist/index.html: ' + glassFails.join(', '));
  process.exit(1);
}
console.log(`no glass chrome in dist/index.html: ${glassUtilities.length}/${glassUtilities.length} clean`);

// ---------------------------------------------------------------- no screen filters
// Nothing may post-process the whole play area again. This one has a history: a full-game "bloom"
// that started as three soft drop-shadows and was later "pixelised" into three ZERO-BLUR ones -
// `drop-shadow(1px 0 0 cyan)` and `drop-shadow(-1px 0 0 magenta)` on the same element is chromatic
// aberration, which fringes every edge of hard-edged pixel art in red and blue and is genuinely
// tiring to look at. The scanline overlay and the screen-blended lens were two more of the same
// kind. A pixel-art scene is meant to be shown as drawn, so all three are asserted absent.
//
// Matched on the CSS property rather than on the bare word, because the stylesheet's own comment
// explaining the removal mentions drop-shadows.
const screenFilterTokens = [
  'filter: drop-shadow',
  'filter:drop-shadow',
  'scanlines',
  'bloom-ambient-lens',
  'game-bloom-filter'
];
const filterFails = screenFilterTokens.filter(sel => builtHtml.includes(sel));
if (filterFails.length) {
  console.error('SCREEN FILTER REGRESSION in dist/index.html: ' + filterFails.join(', '));
  process.exit(1);
}
console.log(`no screen filters in dist/index.html: ${screenFilterTokens.length}/${screenFilterTokens.length} clean`);

console.log('\nOK: compiled stylesheet covers every utility class used by the app.');
