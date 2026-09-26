// Adds a per-tile detail variant to the terrain painter.
//
// Every floor tile used to paint the identical scatter at the identical position, so a field of
// two hundred tiles showed the same grass tuft in a perfect grid - the stamped-pattern look.
// Threading a small offset table through `drawSurface` breaks that grid with four layouts instead
// of one, and the offset also seeds the noise so the organic parts differ too.
//
// Written in Node rather than in a shell because the file contains no non-ASCII text but the
// replacement is a scoped multi-line rewrite, which is safer to express as an explicit range.
//
// Usage: node scripts/add_terrain_variants.cjs
const fs = require('fs');

const FILE = 'src/engine/IsometricTerrainPainter.ts';
const src = fs.readFileSync(FILE, 'utf8');

if (src.includes('DETAIL_OFFSETS')) {
  console.log('already applied');
  process.exit(0);
}

// 1. The variant table, inserted before the surface-detail section.
const anchor = "/** A 4-point star: the pixel-art idiom for a sparkle, and legible at board zoom. */";
const table = `/**
 * How many detail layouts each biome has.
 *
 * The renderer picks one from the tile's grid position, so neighbouring tiles differ instead of
 * repeating. Four is enough to break the grid at board zoom and keeps the sprite cache small.
 */
export const TERRAIN_VARIANTS = 4;

/**
 * Per-variant detail offset and noise seed.
 *
 * Offsets stay inside about a third of the tile so the scatter never piles up on one edge, and
 * each variant gets its own noise seed so the ragged parts differ as well as the positions.
 */
const DETAIL_OFFSETS: Array<[number, number, number]> = [
  [0, 0, 0],
  [-9, 5, 31],
  [8, -4, 67],
  [-5, -9, 113]
];

${anchor}`;
if (!src.includes(anchor)) throw new Error('detail section anchor not found');
let out = src.replace(anchor, table);

// 2. drawSurface takes the offset and rebases its own centre.
const sig =
  'function drawSurface(s: IsoSurface, biome: BiomeType, t: TerrainTones, night: boolean, seed: number): void {\n  const glowStrength = night ? 0.72 : 0.42;';
const newSig =
  'function drawSurface(\n' +
  '  s: IsoSurface,\n' +
  '  biome: BiomeType,\n' +
  '  t: TerrainTones,\n' +
  '  night: boolean,\n' +
  '  seed: number,\n' +
  '  dx: number,\n' +
  '  dy: number\n' +
  '): void {\n' +
  '  // The whole detail layout is written around the tile centre, so shifting the centre shifts\n' +
  '  // every cluster, tuft, ripple and vein at once.\n' +
  '  const CX = TERRAIN_CX + dx;\n' +
  '  const CY = TERRAIN_CY + dy;\n' +
  '  const glowStrength = night ? 0.72 : 0.42;';
if (!out.includes(sig)) throw new Error('drawSurface signature not found');
out = out.replace(sig, newSig);

// 3. Rebase every reference inside drawSurface only, so drawTopFace and drawCliffs keep the
//    real tile centre.
const start = out.indexOf(newSig);
const end = out.indexOf('\n// ---------------------------------------------------------------------------\n// entry point', start);
if (start < 0 || end < 0) throw new Error('could not bound drawSurface');
const body = out.slice(start, end);
const rebased = body.split('TERRAIN_CX').join('CX').split('TERRAIN_CY').join('CY');
out = out.slice(0, start) + rebased + out.slice(end);

// 4. paintTerrainTile selects the variant.
const paint =
  'export function paintTerrainTile(biome: string, options: TerrainPaintOptions = {}, seed = 0): IsoSurface {\n' +
  '  const kind = resolveBiome(biome);\n' +
  '  const night = options.night === true;\n' +
  '  const t = tonesFor(terrainPalette(kind, night));\n' +
  '  const s = new IsoSurface(TERRAIN_SPRITE_W, TERRAIN_SPRITE_H);\n\n' +
  '  if (options.cliffs) drawCliffs(s, t, seed);\n' +
  '  drawTopFace(s, t, seed);\n' +
  '  drawSurface(s, kind, t, night, seed);\n' +
  '  drawContour(s, t);\n' +
  '  return s;\n' +
  '}';
const newPaint =
  'export function paintTerrainTile(biome: string, options: TerrainPaintOptions = {}): IsoSurface {\n' +
  '  const kind = resolveBiome(biome);\n' +
  '  const night = options.night === true;\n' +
  '  const t = tonesFor(terrainPalette(kind, night));\n' +
  '  const s = new IsoSurface(TERRAIN_SPRITE_W, TERRAIN_SPRITE_H);\n' +
  '  const v = Math.abs(Math.floor(options.variant ?? 0)) % TERRAIN_VARIANTS;\n' +
  '  const [dx, dy, seed] = DETAIL_OFFSETS[v];\n\n' +
  '  if (options.cliffs) drawCliffs(s, t, seed);\n' +
  '  drawTopFace(s, t);\n' +
  '  drawSurface(s, kind, t, night, seed, dx, dy);\n' +
  '  drawContour(s, t);\n' +
  '  return s;\n' +
  '}';
if (!out.includes(paint)) throw new Error('paintTerrainTile body not found');
out = out.replace(paint, newPaint);

// 5. The options interface gains the variant.
const iface = 'export interface TerrainPaintOptions {\n  /** Draw the two exposed cliff faces. False for a tile hemmed in by neighbours. */\n  cliffs?: boolean;\n  night?: boolean;\n}';
const newIface =
  'export interface TerrainPaintOptions {\n' +
  '  /** Draw the two exposed cliff faces. False for a tile hemmed in by neighbours. */\n' +
  '  cliffs?: boolean;\n' +
  '  night?: boolean;\n' +
  '  /**\n' +
  '   * Which detail layout to scatter, 0..TERRAIN_VARIANTS-1. The renderer derives it from the\n' +
  '   * tile\'s grid position so neighbouring tiles differ; painting a whole biome with variant 0 is\n' +
  '   * what produced the stamped-pattern look.\n' +
  '   */\n' +
  '  variant?: number;\n' +
  '}';
if (!out.includes(iface)) throw new Error('TerrainPaintOptions not found');
out = out.replace(iface, newIface);

fs.writeFileSync(FILE, out, 'utf8');
console.log('terrain detail variants applied');
