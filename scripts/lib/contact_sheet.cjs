// Builds a scaled contact sheet from a set of painted RGBA surfaces.
//
// Both art exporters (structures and foliage) need the same thing: a single PNG showing every
// model enlarged over a dark backdrop, so the silhouettes and the light direction can be judged
// side by side. Keeping it here means the two sheets cannot drift apart in layout or backdrop.
const fs = require('fs');
const { encodePNG } = require('./png.cjs');

/** Backdrop the models are composited onto. Dark, so a missing outline shows up immediately. */
const BACKDROP = [14, 18, 28];

/**
 * @param {object} options
 * @param {string} options.outFile        Path of the PNG to write.
 * @param {Array<{label: string, surface: {w: number, h: number, data: Uint8ClampedArray}}>} options.cells
 * @param {number} options.scale          Integer magnification.
 * @param {number} options.cols           Columns in the grid.
 * @param {string} options.title          Printed in the console line.
 * @param {string} [options.note]         Optional extra console line.
 * @param {number} [options.cellW]        Fixed cell width; cells are centred in it. Defaults to
 *                                        the first cell's width, in which case every cell must
 *                                        match. Use it for a set whose members differ in size,
 *                                        such as the three cloud size buckets.
 * @param {number} [options.cellH]        Fixed cell height; see `cellW`.
 */
function writeContactSheet({ outFile, cells, scale, cols, title, note, cellW, cellH }) {
  if (cells.length === 0) throw new Error('contact sheet needs at least one cell');

  // Cells may be non-square (an isometric floor tile is 104x82, not 64x64) and may differ in size
  // between buckets, so the grid is laid out from an explicit cell size and each sprite is centred
  // in it.
  const fixed = cellW !== undefined || cellH !== undefined;
  const sw = cellW ?? cells[0].surface.w;
  const sh = cellH ?? cells[0].surface.h;
  if (!fixed) {
    for (const c of cells) {
      if (c.surface.w !== sw || c.surface.h !== sh) {
        throw new Error(
          `${c.label} is ${c.surface.w}x${c.surface.h}, expected ${sw}x${sh} to match the sheet`
        );
      }
    }
  }

  const rows = Math.ceil(cells.length / cols);
  const cellPW = sw * scale;
  const cellPH = sh * scale;
  const w = cellPW * cols;
  const h = cellPH * rows;
  const sheet = Buffer.alloc(w * h * 4);

  cells.forEach((c, i) => {
    const s = c.surface;
    if (s.w > sw || s.h > sh) {
      throw new Error(`${c.label} is ${s.w}x${s.h}, which does not fit the ${sw}x${sh} cell`);
    }
    const ox = (i % cols) * cellPW + Math.floor((sw - s.w) / 2) * scale;
    const oy = Math.floor(i / cols) * cellPH + Math.floor((sh - s.h) / 2) * scale;
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        const si = (y * s.w + x) * 4;
        const a = s.data[si + 3];
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const di = ((oy + y * scale + sy) * w + (ox + x * scale + sx)) * 4;
            sheet[di] = Math.round((s.data[si] * a + BACKDROP[0] * (255 - a)) / 255);
            sheet[di + 1] = Math.round((s.data[si + 1] * a + BACKDROP[1] * (255 - a)) / 255);
            sheet[di + 2] = Math.round((s.data[si + 2] * a + BACKDROP[2] * (255 - a)) / 255);
            sheet[di + 3] = 255;
          }
        }
      }
    }
  });

  fs.writeFileSync(outFile, encodePNG(w, h, sheet));
  console.log(`sheet: ${outFile} (${w}x${h}, scale ${scale}x, ${cells.length} ${title})`);
  if (note) console.log(note);
}

/**
 * Writes every painted model as its own PNG and deletes files for models that no longer exist.
 *
 * @param {object} options
 * @param {string} options.outDir
 * @param {Array<{label: string, surface: {w: number, h: number, data: Uint8ClampedArray}}>} options.cells
 * @param {string} options.noun  Word used in the summary line, e.g. "structure models".
 */
function exportModels({ outDir, cells, noun }) {
  fs.mkdirSync(outDir, { recursive: true });

  for (const c of cells) {
    fs.writeFileSync(
      `${outDir}/${c.label}.png`,
      encodePNG(c.surface.w, c.surface.h, Buffer.from(c.surface.data.buffer))
    );
  }

  const valid = new Set(cells.map(c => `${c.label}.png`));
  for (const existing of fs.readdirSync(outDir)) {
    if (!valid.has(existing)) {
      fs.unlinkSync(`${outDir}/${existing}`);
      console.log(`  removed stale model ${existing}`);
    }
  }

  const { w, h } = cells[0].surface;
  console.log(`exported ${cells.length} ${noun} at ${w}x${h} to ${outDir}`);
  for (const c of cells) console.log(`  ${c.label}`);
}

module.exports = { writeContactSheet, exportModels };
