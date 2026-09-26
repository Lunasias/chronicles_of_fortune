// One-shot sweep that removes the modern-glass utility tokens from the UI.
//
// The pixel-UI stylesheet in index.html replaces the old chrome, but the markup still asks for
// the old look directly: `rounded-lg` on every panel, `backdrop-blur-md` on every overlay,
// `shadow-2xl` on every card, `transition-all duration-300` on every state change, gradient
// backgrounds and gradient stat bars, and `hover:scale-105` transforms. Those are Tailwind
// utilities, not the project's own classes, so replacing the stylesheet alone changes nothing.
//
// The rewrite is restricted to class-bearing strings. A naive whole-file replace also hits prose:
// bare `transition` and `shadow` are real Tailwind utilities but also ordinary English words, and
// an ISOMETRIC painter's comments say "a pixel-art transition rather than a razor line" and
// "groundShadow". Scoping to class attributes is what makes this safe.
//
// Written in Node rather than as a shell round-trip because index.html and several UI sources
// contain Thai text, and a PowerShell Get-Content | Set-Content round-trip re-encodes them and
// destroys every non-ASCII character in the file.
//
// Usage: node scripts/strip_glass_ui.cjs [--write]
const fs = require('fs');
const path = require('path');

const write = process.argv.includes('--write');

/** Whole class tokens to delete outright. */
const STRIP = [
  // square corners
  'rounded-2xl', 'rounded-xl', 'rounded-lg', 'rounded-md', 'rounded-sm', 'rounded-full', 'rounded-none',
  'rounded-t-2xl', 'rounded-b-2xl', 'rounded-t-xl', 'rounded-b-xl', 'rounded-l-xl', 'rounded-r-xl',
  'rounded-t-lg', 'rounded-b-lg', 'rounded-l-lg', 'rounded-r-lg',
  'rounded-t-md', 'rounded-b-md', 'rounded-l-md', 'rounded-r-md',
  'rounded-tl-lg', 'rounded-tr-lg', 'rounded-bl-lg', 'rounded-br-lg',
  'rounded-tl-xl', 'rounded-tr-xl', 'rounded-bl-xl', 'rounded-br-xl',
  'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br',
  'rounded-t', 'rounded-b', 'rounded-l', 'rounded-r', 'rounded',
  // unblurred panels
  'backdrop-blur-xs', 'backdrop-blur-sm', 'backdrop-blur-md', 'backdrop-blur-lg',
  'backdrop-blur-xl', 'backdrop-blur-2xl', 'backdrop-blur',
  // the pixel classes draw their own hard shadow
  'shadow-2xl', 'shadow-xl', 'shadow-lg', 'shadow-md', 'shadow-sm', 'shadow-inner', 'shadow-none',
  'drop-shadow-2xl', 'drop-shadow-xl', 'drop-shadow-lg', 'drop-shadow-md',
  'drop-shadow-sm', 'drop-shadow',
  // instant state changes
  'transition-all', 'transition-colors', 'transition-transform', 'transition-opacity',
  'transition-shadow', 'transition',
  'duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300',
  'duration-500', 'duration-700', 'duration-1000',
  'ease-in-out', 'ease-out', 'ease-in', 'ease-linear',
  // blur filters
  'blur-sm', 'blur-md', 'blur-lg', 'blur-xl', 'blur-2xl',
  // gradient backgrounds; the panel's own flat fill takes over
  'bg-gradient-to-r', 'bg-gradient-to-b', 'bg-gradient-to-t', 'bg-gradient-to-l',
  'bg-gradient-to-br', 'bg-gradient-to-bl', 'bg-gradient-to-tr', 'bg-gradient-to-tl',
  // transforms that scale or lift by fractional pixels
  'hover:scale-105', 'hover:scale-110', 'hover:scale-95', 'hover:scale-100',
  'active:scale-95', 'active:scale-105', 'active:scale-100',
  'group-hover:scale-105', 'group-hover:scale-110',
  'scale-95', 'scale-100', 'scale-105', 'scale-110', 'scale-125',
  'hover:-translate-y-1', 'hover:-translate-y-2', 'hover:-translate-y-0.5',
  'hover:translate-y-1', 'active:translate-y-1'
];

/** Gradient stop tokens: `from-red-600`, `via-slate-900/95`, `to-transparent`. */
const COLOUR =
  '(?:transparent|current|black|white|inherit|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3})';
const STOP = new RegExp(`\\b(?:from|via|to)-${COLOUR}(?:\\/\\d{1,3})?`, 'g');

/**
 * Literal upgrades onto the new pixel components.
 *
 * These are exact substrings of the project's own class lists, applied longest first so a short
 * pattern cannot eat part of a longer one. They exist because the pixel components are shared but
 * the markup that should use them is spelled out inline in forty-odd places; a blanket strip
 * cannot tell a stat-bar track from any other bordered box.
 */
const REPLACEMENTS = [
  // Panel and section headers become the pixel header band. The border-bottom is removed at the
  // same time, because pixel-head draws its own hard hairline.
  ['bg-slate-950/80 border-b border-slate-700/80', 'pixel-head'],
  ['border-b border-slate-800', 'pixel-head'],

  // Stat-bar tracks: a bordered, inset-shadowed box becomes the sunken pixel-bar well.
  ['w-20 sm:w-28 bg-slate-950 h-2.5 sm:h-3 border border-slate-700 overflow-hidden relative', 'pixel-bar w-20 sm:w-28 h-2.5 sm:h-3 overflow-hidden relative'],
  ['w-14 sm:w-20 bg-slate-950 h-2.5 sm:h-3 border border-slate-700 overflow-hidden relative', 'pixel-bar w-14 sm:w-20 h-2.5 sm:h-3 overflow-hidden relative'],
  ['w-full bg-slate-950 h-2.5 sm:h-3 border border-slate-700 overflow-hidden relative', 'pixel-bar w-full h-2.5 sm:h-3 overflow-hidden relative'],
  ['w-full bg-slate-950 h-2 sm:h-2.5 border border-slate-700 overflow-hidden relative', 'pixel-bar w-full h-2 sm:h-2.5 overflow-hidden relative'],
  ['w-full bg-slate-900 h-3 border border-slate-700 overflow-hidden', 'pixel-bar w-full h-3 overflow-hidden'],
  ['w-full bg-slate-950 h-2.5 overflow-hidden', 'pixel-bar w-full h-2.5 overflow-hidden'],

  // Bare close buttons become the square pixel close control.
  ['ml-1 text-slate-400 hover:text-white text-xs', 'pixel-close ml-1 w-5 h-5 text-xs'],
  ['text-slate-400 hover:text-white text-xs px-1', 'pixel-close w-5 h-5 text-xs px-1'],
  ['text-slate-400 hover:text-white text-xs', 'pixel-close w-5 h-5 text-xs'],

  // Dismiss buttons already reusing pixel-btn only need the red variant, not a raw background.
  ['pixel-btn px-2 py-1 text-xs text-rose-300 bg-red-950/80 border-red-800', 'pixel-btn pixel-btn-red px-2 py-1 text-xs'],
  ['pixel-btn px-2.5 py-1 text-xs text-rose-300 bg-red-950/80 border-red-800', 'pixel-btn pixel-btn-red px-2.5 py-1 text-xs']
];

/**
 * Stat bars: a gradient fill becomes a flat fill plus the segmented `pixel-bar-fill` overlay.
 * `h-full` and the inline width stay, because the element already sits inside its track.
 */
const BAR =
  /bg-gradient-to-r\s+from-([a-z]+)-\d{2,3}\s+to-[a-z]+-\d{2,3}\s+h-full(?:\s+transition-all)?(?:\s+duration-\d+)?/g;

/**
 * Applies `fn` to the inside of every class-bearing string.
 *
 * Handles `class="..."`, `className="..."`, `class='...'`, `className='...'`,
 * `` class={`...`} `` and `` className={`...`} ``. A backtick body is scanned with `${...}` depth
 * tracking, because a template literal may contain a nested string with a quote in it.
 */
function mapClassStrings(text, fn) {
  let out = '';
  let i = 0;
  const open = /\b(?:class|className)\s*=\s*/g;
  let m;
  while ((m = open.exec(text)) !== null) {
    let quoteAt = m.index + m[0].length;
    let braceClose = -1;
    if (text[quoteAt] === '{') {
      // `{` ... quote ... `}`: skip the whitespace to the quote inside the braces.
      braceClose = text.indexOf('}', quoteAt);
      quoteAt++;
      while (/\s/.test(text[quoteAt])) quoteAt++;
    }
    const quote = text[quoteAt];
    if (quote !== '"' && quote !== "'" && quote !== '`') continue;

    let j = quoteAt + 1;
    if (quote === '`') {
      let depth = 0;
      while (j < text.length) {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text[j] === '$' && text[j + 1] === '{') {
          depth++;
          j += 2;
          continue;
        }
        if (text[j] === '}' && depth > 0) {
          depth--;
          j++;
          continue;
        }
        if (text[j] === '`' && depth === 0) break;
        j++;
      }
    } else {
      while (j < text.length && text[j] !== quote) {
        if (text[j] === '\\') j++;
        j++;
      }
    }
    if (j >= text.length) break;

    const end = braceClose >= 0 ? Math.max(j + 1, braceClose + 1) : j + 1;
    out += text.slice(i, quoteAt + 1) + fn(text.slice(quoteAt + 1, j)) + text.slice(j, end);
    i = end;
    open.lastIndex = end;
  }
  out += text.slice(i);
  return out;
}

const FILES = ['index.html'];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.ts')) FILES.push(p);
  }
})('src');

let totalBars = 0;
let totalStops = 0;
const report = [];

for (const file of FILES) {
  const original = fs.readFileSync(file, 'utf8');
  let text = original;
  let bars = 0;
  let stops = 0;

  // Literal component upgrades first: they match whole known class lists, so they must run before
  // the token strip takes the border/shadow utilities out from underneath them.
  let replacements = 0;
  for (const [find, replace] of REPLACEMENTS) {
    const parts = text.split(find);
    if (parts.length > 1) {
      replacements += parts.length - 1;
      text = parts.join(replace);
    }
  }

  const mapped = mapClassStrings(text, body => {
    // Bars first: the pattern consumes `bg-gradient-to-r` and the stops, so it has to run before
    // the generic strip would leave the stops orphaned.
    let out = body.replace(BAR, (_m, colour) => {
      bars++;
      return `pixel-bar-fill bg-${colour}-600 h-full`;
    });
    for (const t of STRIP) {
      const pattern = new RegExp(`(^|\\s)${t.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')}(?=\\s|$)`, 'g');
      out = out.replace(pattern, '$1');
    }
    stops += (out.match(STOP) || []).length;
    out = out.replace(STOP, '');
    return out.replace(/\s+/g, ' ').trim();
  });
  text = mapped;

  // A header class that used to carry an opacity modifier (`border-b border-slate-800/60`) can
  // come out as `pixel-head/60`, which is not a class at all. Normalise it.
  text = text.replace(/\bpixel-(head|well|chip|close|bar|tab|row|divider)\/\d+\b/g, 'pixel-$1');

  // A stripped token inside a classList call would leave an empty string argument, and
  // `classList.add('a', '')` throws. Drop the empty argument and the comma that joined it.
  text = text.replace(/classList\.(add|remove|toggle)\(([^)]*)\)/g, (_m, method, args) => {
    const kept = args
      .split(',')
      .map(a => a.trim())
      .filter(a => a && a !== "''" && a !== '""' && a !== '``');
    return `classList.${method}(${kept.join(', ')})`;
  });

  // Guard: a stripped token must never leave an empty argument in a classList call, which throws.
  for (const m of text.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    if (/''|""|``/.test(m[1]) || /,\s*\)/.test(m[1]) || /\(\s*\)/.test(m[0])) {
      throw new Error(`${file}: stripping left an empty token in classList(${m[1]})`);
    }
  }

  if (text !== original) {
    if (write) fs.writeFileSync(file, text, 'utf8');
    report.push(`${file}: ${bars} bars, ${stops} gradient stops, ${replacements} component upgrades`);
  }
  totalBars += bars;
  totalStops += stops;
}

for (const line of report) console.log('  ' + line);
console.log(
  `${write ? 'rewrote' : 'would rewrite'} ${report.length} files; ${totalBars} bars, ${totalStops} gradient stops`
);
if (!write) console.log('dry run - pass --write to apply');
