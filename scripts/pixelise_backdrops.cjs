// Converts the battle-arena and scene backdrop gradients into hard banded ramps.
//
// Twelve arena backdrops, the shop interior and the town view were each painted as
// `ctx.createLinearGradient(0, 0, 0, h)` plus a full-rect fill. The authored stops are the biome's
// identity and are kept; what changes is that the space between them is quantised into whole bands
// rather than interpolated per pixel.
//
// Only the exact shape
//
//     const NAME = ctx.createLinearGradient(0, 0, 0, H);
//     NAME.addColorStop(A, B);
//     ...
//     ctx.fillStyle = NAME;
//     ctx.fillRect(0, 0, W, H);
//
// is rewritten, contiguously, so nothing that happens between the stops and the fill is disturbed.
// Radial glows are NOT handled: they need a per-site decision about whether the glow is lying on
// the floor (a squashed 2:1 ellipse) or floating, and they are applied through the hard-edged
// `pixelDisc` / `pixelEllipse` helpers already, so only their interior ramp is still smooth.
//
// Dry-run by default. Usage: node scripts/pixelise_backdrops.cjs [--write]
const fs = require('fs');

const write = process.argv.includes('--write');
const FILES = ['src/ui/BattleUI.ts', 'src/ui/ShopUI.ts', 'src/ui/TownUI.ts'];

let total = 0;
const report = [];

for (const file of FILES) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  let converted = 0;

  for (let i = 0; i < lines.length; i++) {
    const decl = lines[i].match(/^(\s*)const (\w+) = ctx\.createLinearGradient\(\s*0\s*,\s*0\s*,\s*0\s*,\s*(\w+)\s*\);\s*$/);
    if (!decl) {
      out.push(lines[i]);
      continue;
    }
    const indent = decl[1];
    const name = decl[2];
    const h = decl[3];

    // Collect the stops, then the fillStyle + fillRect that close the block.
    const stops = [];
    let j = i + 1;
    while (j < lines.length && new RegExp(`^\\s*${name}\\.addColorStop\\(`).test(lines[j])) {
      const sm = lines[j].match(new RegExp(`^\\s*${name}\\.addColorStop\\(\\s*([^,]+),\\s*(.+?)\\s*\\);\\s*$`));
      if (!sm) break;
      stops.push(`[${sm[1].trim()}, ${sm[2].trim()}]`);
      j++;
    }
    while (j < lines.length && lines[j].trim() === '') j++;
    const style = j < lines.length ? lines[j].match(new RegExp(`^\\s*ctx\\.fillStyle\\s*=\\s*${name};\\s*$`)) : null;
    if (stops.length === 0 || !style) {
      out.push(lines[i]);
      continue;
    }
    j++;
    const fill = j < lines.length ? lines[j].match(/^\s*ctx\.fillRect\(\s*0\s*,\s*0\s*,\s*(\w+)\s*,\s*(\w+)\s*\);\s*$/) : null;
    if (!fill) {
      out.push(lines[i]);
      continue;
    }

    const w = fill[1];
    const fh = fill[2];
    out.push(`${indent}// Authored stops kept; the space between them is banded rather than interpolated.`);
    out.push(`${indent}pixelVerticalRamp(ctx, 0, 0, ${w}, ${fh}, [${stops.join(', ')}]);`);
    converted++;
    i = j;
    void h;
  }

  if (write && converted > 0) fs.writeFileSync(file, out.join('\n'), 'utf8');
  report.push(`${file}: ${converted} ramps`);
  total += converted;
}

for (const r of report) console.log('  ' + r);
console.log(`${write ? 'rewrote' : 'would rewrite'} ${total} backdrop ramps`);
if (!write) console.log('dry run - pass --write to apply');
