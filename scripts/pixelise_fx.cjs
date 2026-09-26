// Converts the remaining soft canvas drawing in the board overlays and the combat VFX to
// hard-edged pixel primitives.
//
// Two kinds of site, handled differently:
//
//   * `ctx.shadowBlur = N` is a Gaussian blur. It cannot exist in pixel art - it is the one
//     operation that produces colours no palette contains - so those assignments are deleted
//     outright. The shape they were blurring keeps its own fill.
//
//   * A full-circle `ctx.arc(cx, cy, r, 0, Math.PI * 2)` or a full `ctx.ellipse(cx, cy, rx, ry, 0,
//     0, Math.PI * 2)` inside a beginPath/fill/stroke pipeline is replaced by one immediate
//     `pixelDisc` / `pixelEllipse` / `pixelRing` call. The left-over `beginPath()` and `fill()`
//     become no-ops on an empty path, so the surrounding control flow is untouched - which is
//     what makes the rewrite safe to apply mechanically.
//
// Partial arcs (a half-arc dome, a swept beam) and `create*Gradient` fills are NOT handled here:
// they need per-site judgement about what the shape is for, so they are left alone and listed.
//
// Dry-run by default. Usage: node scripts/pixelise_fx.cjs [--write]
const fs = require('fs');

const write = process.argv.includes('--write');
const FILES = [
  'src/engine/IsometricRenderer.ts',
  'src/engine/CombatVFXEngine.ts',
  'src/ui/BattleUI.ts',
  'src/ui/ShopUI.ts',
  'src/ui/TownUI.ts',
  'src/ui/HUD.ts'
];

/** Splits a call's argument list at top-level commas. */
function splitArgs(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** The nearest `ctx.<prop> = ...;` at or before `before`, searching backwards. */
function nearestAssignment(blockLines, before, prop) {
  for (let k = before; k >= 0; k--) {
    const m = blockLines[k].match(new RegExp(`^\\s*ctx\\.${prop}\\s*=\\s*([\\s\\S]*?);\\s*$`));
    if (m) return m[1].trim();
  }
  return null;
}

const summary = [];

for (const file of FILES) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  let blurRemoved = 0;
  let shapesConverted = 0;
  const skipped = [];
  const conversions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*ctx\.shadowBlur\s*=/.test(line)) {
      blurRemoved++;
      continue;
    }

    const m = line.match(/^(\s*)ctx\.(arc|ellipse)\((.*)\);\s*$/);
    if (!m) {
      out.push(line);
      continue;
    }
    const indent = m[1];
    const kind = m[2];
    const args = splitArgs(m[3]);

    const isFull =
      (kind === 'arc' && args.length === 5 && /Math\.PI\s*\*\s*2/.test(args[4])) ||
      (kind === 'ellipse' && args.length === 7 && /Math\.PI\s*\*\s*2/.test(args[6]));
    if (!isFull) {
      skipped.push(`line ${i + 1}: partial ${kind} (needs per-site judgement)`);
      out.push(line);
      continue;
    }

    const cx = args[0];
    const cy = args[1];
    const rx = args[2];
    const ry = kind === 'arc' ? args[2] : args[3];

    let start = i;
    if (i > 0 && /^\s*ctx\.beginPath\(\);\s*$/.test(lines[i - 1])) start = i - 1;
    let end = i;
    let fillAt = -1;
    let strokeAt = -1;
    // Scan the whole window rather than stopping at the first terminal call: a shape that is both
    // filled and outlined (every node seal is) would otherwise lose its outline, and the empty
    // path's stroke() that replaces it draws nothing.
    for (let j = i + 1; j < Math.min(lines.length, i + 9); j++) {
      if (/^\s*ctx\.beginPath\(\);\s*$/.test(lines[j])) break;
      if (fillAt < 0 && /^\s*ctx\.fill\(\);\s*$/.test(lines[j])) fillAt = j;
      if (strokeAt < 0 && /^\s*ctx\.stroke\(\);\s*$/.test(lines[j])) strokeAt = j;
    }
    if (fillAt >= 0 || strokeAt >= 0) end = Math.max(fillAt, strokeAt);
    if (fillAt < 0 && strokeAt < 0) {
      skipped.push(`line ${i + 1}: no terminal fill/stroke`);
      out.push(line);
      continue;
    }

    const blockLines = lines.slice(start, end + 1);
    const calls = [];
    if (fillAt >= 0) {
      const colour = nearestAssignment(blockLines, fillAt - start, 'fillStyle') || 'ctx.fillStyle';
      calls.push(
        kind === 'arc'
          ? `${indent}pixelDisc(ctx, ${cx}, ${cy}, ${rx}, ${colour});`
          : `${indent}pixelEllipse(ctx, ${cx}, ${cy}, ${rx}, ${ry}, ${colour});`
      );
    }
    if (strokeAt >= 0) {
      const colour = nearestAssignment(blockLines, strokeAt - start, 'strokeStyle') || 'ctx.strokeStyle';
      const width = nearestAssignment(blockLines, strokeAt - start, 'lineWidth');
      const w = width ? `Math.max(1, Math.round(${width}))` : '1';
      calls.push(`${indent}pixelRing(ctx, ${cx}, ${cy}, ${rx}, ${ry}, ${colour}, ${w});`);
    }

    // Drop only the path-pipeline statements; anything else in the block is preserved.
    const kept = blockLines.filter(
      l =>
        l.trim() !== '' &&
        !/^\s*ctx\.(beginPath|fill|stroke|arc|ellipse)\(/.test(l) &&
        !/^\s*ctx\.(fillStyle|strokeStyle|lineWidth)\s*=/.test(l)
    );

    conversions.push(`line ${i + 1}: ${kind} -> ${calls.length} call(s)`);
    out.push(...kept, ...calls);
    shapesConverted++;
  }

  if (write) fs.writeFileSync(file, out.join('\n'), 'utf8');
  summary.push({ file, blurRemoved, shapesConverted, skipped, conversions });
}

for (const s of summary) {
  console.log(`\n${s.file}: ${s.blurRemoved} shadowBlur removed, ${s.shapesConverted} shapes converted`);
  for (const c of s.conversions) console.log(`  ${c}`);
  for (const k of s.skipped) console.log(`  left alone - ${k}`);
}
if (!write) console.log('\ndry run - pass --write to apply');
