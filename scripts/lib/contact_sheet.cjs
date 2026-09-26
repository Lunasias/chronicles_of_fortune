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
 */
function writeContactSheet({ outFile, cells, scale, cols, title, note }) {
  if (cells.length === 0) throw new Error('contact sheet needs at least one cell');

  const size = cells[0].surface.w;
  const rows = Math.ceil(cells.length / cols);
  const cell = size * scale;
  const w = cell * cols;
  const h = cell * rows;
  const sheet = Buffer.alloc(w * h * 4);

  cells.forEach((c, i) => {
    const s = c.surface;
    if (s.w !== size || s.h !== size) {
      throw new Error(`${c.label} is ${s.w}x${s.h}, expected ${size}x${size} to match the sheet`);
    }
    const ox = (i % cols) * cell;
    const oy = Math.floor(i / cols) * cell;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const si = (y * size + x) * 4;
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
