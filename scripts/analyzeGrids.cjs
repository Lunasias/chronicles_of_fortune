const fs = require('fs');
const zlib = require('zlib');

function getPixels(filePath) {
  const buf = fs.readFileSync(filePath);
  let width = buf.readUInt32BE(16);
  let height = buf.readUInt32BE(20);
  let pos = 8;
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idats.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  
  // Unfilter Sub/Up/Average/Paeth or just inspect alpha
  // Since we just want to know which X and Y have alpha > 0, let's reconstruct scanlines
  const bpp = 4;
  const stride = 1 + width * bpp;
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(width);
    const filter = raw[y * stride];
    const prevRowOffset = (y - 1) * stride;
    const currRowOffset = y * stride;
    
    // We can do simple approximate or exact unfiltering for alpha
    for (let x = 0; x < width; x++) {
      const aIdx = currRowOffset + 1 + x * 4 + 3;
      // If raw byte is > 0, there is some content
      row[x] = raw[aIdx] > 10 ? 1 : 0;
    }
    grid.push(row);
  }
  return { width, height, grid };
}

function analyzeGrid(name, { width, height, grid }) {
  console.log(`\n=== Analysis of ${name} (${width}x${height}) ===`);
  // Vertical projection (which columns have pixels)
  const colCounts = new Array(width).fill(0);
  const rowCounts = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x]) {
        colCounts[x]++;
        rowCounts[y]++;
      }
    }
  }

  // Find candidate grid sizes
  const factorsW = [16, 24, 32, 48, 50, 64, 80, 100].filter(f => width % f === 0);
  const factorsH = [16, 24, 32, 48, 64].filter(f => height % f === 0);
  console.log('Factors W:', factorsW.map(f => `${width/f}x${f}px`).join(', '));
  console.log('Factors H:', factorsH.map(f => `${height/f}x${f}px`).join(', '));
}

analyzeGrid('Slime blue', getPixels('public/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime blue.png'));
analyzeGrid('Doggy', getPixels('public/assets/GandalfHardcore Pet companion/GandalfHardcore Pet companion/GandalfHardcore doggy sheet.png'));
analyzeGrid('Fox', getPixels('public/assets/GandalfHardcore Pet companion/GandalfHardcore Pet companion/GandalfHardcore fox.png'));
analyzeGrid('Effects curved', getPixels('public/assets/GandalfHardcore character effects/GandalfHardcore character effects/Character effects curved lines.png'));
analyzeGrid('Effects blood', getPixels('public/assets/GandalfHardcore character effects/GandalfHardcore character effects/Character effects blood.png'));
analyzeGrid('HP bar', getPixels('public/assets/GandalfHardcore Hp bar/GandalfHardcore Hp bar/Hp bar.png'));
