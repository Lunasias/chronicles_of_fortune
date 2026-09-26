// Splices the rebuilt pixel-UI stylesheet into index.html.
//
// This is a one-shot migration helper, kept out of the normal build. It exists because index.html
// is UTF-8 with Thai UI text in it, and the obvious shell round-trip (PowerShell Get-Content |
// Set-Content) silently re-encodes it and destroys every non-ASCII character in the file. Node
// reads and writes UTF-8 exactly, so the replacement is byte-safe.
//
// Usage: node scripts/apply_pixel_ui_style.cjs
const fs = require('fs');

const HTML = 'index.html';
const CSS = '.px-style.css';
const START = '/* Dokapon Retro Boxes */';

const html = fs.readFileSync(HTML, 'utf8');
const css = fs.readFileSync(CSS, 'utf8').replace(/\s+$/, '');

const start = html.indexOf(START);
if (start < 0) throw new Error(`start marker not found: ${START}`);
const end = html.indexOf('  </style>', start);
if (end < 0) throw new Error('closing </style> not found after the start marker');

// Everything from the marker to just before </style> is replaced, so the new block keeps the
// same leading indentation context.
const before = html.slice(0, start);
const after = html.slice(end);

if (/[\u0080-\u009f]/.test(before) || /[\u0080-\u009f]/.test(after)) {
  throw new Error('index.html already contains C1 control characters - refusing to write');
}

fs.writeFileSync(HTML, before + css + '\n' + after, 'utf8');
console.log(`replaced ${end - start} chars of UI styles with ${css.length} chars of pixel-UI CSS`);
