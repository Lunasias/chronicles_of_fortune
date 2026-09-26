# scripts/

Development-only tooling. **Nothing here runs as part of `npm run build` or `npm run dev`** —
these are manual one-shot utilities that were used while generating the board and sprite
data. They are kept for reproducibility.

## ⚠️ Scripts that modify tracked source files

Both of these rewrite `src/game/BoardMap.ts` in place. They **default to a dry run** and
only apply changes with `--write`. Always review `git diff src/game/BoardMap.ts` afterwards.

| Script | Purpose | Usage |
| --- | --- | --- |
| `fix_board_connections.cjs` | Drops road links longer than 5.5 grid units, reconnects any disconnected realm with the shortest bridge, and rewrites the node array in canonical JSON formatting. | `node scripts/fix_board_connections.cjs [--write]` |
| `rebalance_town_monsters.cjs` | Re-rolls monster HP/ATK/DEF for every monster-occupied town using per-realm difficulty tiers. Seeded so results are reproducible. | `node scripts/rebalance_town_monsters.cjs [--write] [--seed=1337]` |

> As of the current data set both scripts are effectively no-ops:
> `fix_board_connections` reports `components=1 droppedEdges=0`, and the board already
> satisfies the invariant enforced by `tests/board.test.mjs`.

## ⚠️ Scripts that regenerate art assets

| Script | Purpose |
| --- | --- |
| `generate_all_sprites.cjs` | Generates the 8-directional idle/run/attack sprite sheets for all 18 monster archetypes and the hero classes into `public/assets/`. Overwrites existing PNGs. |
| `upgrade_all_sprites_to_64.cjs` | Re-encodes existing sprite PNGs to the 64×64 HD standard. Overwrites existing PNGs. |
| `generate_companion_sprites.cjs` | Draws the 64×64 model for **every** companion listed in `src/game/companions.json` into `public/assets/companions/`. Also deletes models whose companion no longer exists. Run via `npm run gen:companions`. Options: `--contact-sheet` writes a scaled grid of every sprite; `--scale=N` sets its zoom (1–8); `--only=<key>` limits it to one companion and writes `.companion-showcase-<key>.png`, which is how a single large image is produced for review. |
| `generate_building_sprites.cjs` | Exports the 13 isometric 64×64 structure models into `public/assets/buildings/`. Run via `npm run gen:buildings`. Options: `--sheet` writes `.building-sheet.png`; `--scale=N` sets its zoom (1–8). |
| `generate_foliage_sprites.cjs` | Exports the 5 tree species × 4 silhouettes into `public/assets/foliage/`. Run via `npm run gen:foliage`. Options: `--sheet` writes `.foliage-sheet.png`; `--scale=N` sets its zoom. |
| `generate_terrain_sprites.cjs` | Exports the 15 biomes × flat/cliff × day/night floor tiles into `public/assets/terrain/`. Run via `npm run gen:terrain`. Options: `--sheet` writes `.terrain-sheet.png`; `--scale=N` sets its zoom. |
| `generate_prop_sprites.cjs` | Writes `.prop-sheet.png` (every prop type × biome × day/night) and `.prop-variants-sheet.png` (every shape × size). Run via `npm run gen:props`. Writes no per-model PNGs: props are runtime-only, so a golden file would protect nothing. |
| `generate_sky_sprites.cjs` | Exports the 4 sky strips, 4 suns and the moon into `public/assets/sky/`, plus `.sky-sheet.png`, `.celestial-sheet.png` and `.cloud-sheet.png`. Run via `npm run gen:sky`. |

All four exporters are meant to be re-run whenever a painter changes, and their output is
committed. `npm run gen:art` runs all of them.

### One-shot UI migration scripts

These have already been applied. They are kept because they document exactly what changed and
because the encoding hazard below is worth a worked example.

| Script | Purpose |
| --- | --- |
| `apply_pixel_ui_style.cjs` | Replaces the old glass chrome block in the inline `<style>` in `index.html` with the pixel-UI system. Refuses to write if the file already contains C1 control characters. |
| `strip_glass_ui.cjs` | Sweeps the modern-glass utility tokens out of the markup and onto the pixel components. Dry-run by default; `--write` applies. Scoped to class-bearing strings, because a whole-file replace also hits prose — bare `transition` and `shadow` are real Tailwind utilities *and* ordinary English words. |

> ⚠️ **PowerShell `Get-Content | Set-Content` will destroy every non-ASCII character in a file.**
> `index.html` and several UI sources contain Thai text; that pipeline re-encodes them, the build
> still succeeds, and the UI comes out full of mojibake. Both scripts above are written in Node
> for exactly this reason. A repo-wide scan for C1 control characters (U+0080–U+009F) is a quick
> way to confirm nothing has been mangled.

### Companion model technique

The companion generator is a small pixel-art renderer rather than a shape stamper:

- **One light source, top-left.** A light map derived from each sprite's own silhouette
  decides a stage per pixel: upper/left rims catch the light, lower/right rims fall into deep
  shadow, and the interior follows a curved vertical gradient so the face (high in a tall
  bounding box) is not darkened. This avoids pillow shading, where a uniform dark rim leaves
  the light direction unreadable.
- **Five-stage ramps per material**, built by hue shifting: shadows rotate toward blue and
  gain saturation, highlights move toward warm and desaturate. Lightness moves
  multiplicatively so a pastel hair colour and a near-black outfit both separate properly;
  metal and gems get hard, specular contrast while cloth and fur stay matte.
- **Selective outlining.** A dark tinted line only where the sprite meets the background on
  the shaded side, a lighter tinted line on the lit side - never pure black, which detaches a
  sprite from the diorama behind it.
- **Detail layer.** Eyes, jewellery sparkles and hair shine are drawn after shading so they
  stay crisp instead of being dimmed by the light map.
- **Silhouette first.** Ears, horns, wings, tails, hats and weapons are part of the outline,
  because a 64×64 character has to be identifiable as a solid black shape.

`tests/companions.test.mjs` enforces the outcome: every model must be shaded (a minimum
number of distinct colours), lit from the top-left (upper-left half measurably brighter than
the lower-right), and unique. `scripts/lib/preview_companion.cjs` renders sprites as ASCII so
they can be reviewed without an image viewer - `--full` gives a 1:1 view with a pixel ruler.

### Structure and foliage model technique

`IsometricBuildingPainter.ts`, `IsometricFoliagePainter.ts`, `IsometricTerrainPainter.ts`,
`IsometricPropPainter.ts` and `SkyPainter.ts` share one set of primitives (`IsoSurface`,
`faceTones`, `toneRamp`, `rockLevels`, `isoBox`, `isoPlinth`, `isoGableRoof`, `puff`, `trunk`,
`stroke`), so the whole world is lit and shaded by the same code rather than by five
similar-looking copies. All of them are pure buffer painters with no DOM dependency, which is what
lets the exporters run them in Node.

- **One light source, top-left.** In 2:1 dimetric projection that means top face brightest,
  left face mid, right face darkest. Each material gets a `faceTones()` ramp built from
  *multiplicative* HSL lightness with a hue shift toward blue in shadow, so a pale plaster wall
  and a dark slate roof both separate without one washing out.
- **Absolute-lightness ramps where a relative one collapses.** `shift()` floors lightness at 6%,
  so for volcanic obsidian (#09090b) the two darkest steps of a ramp both clamp to the floor and
  land on the same colour — which silently deletes a tone. `toneRamp()` and `rockLevels()` space a
  ramp by absolute lightness instead, and cap saturation because near-black colours report a
  misleadingly high HSL saturation and would otherwise come out vivid purple.
- **Valley corners.** A concave inner corner takes a fourth tone 10–15% darker than the darkest
  face. Reusing the lit tone in an inner corner is the single most common giveaway of amateur
  isometric art, so `IsoColors.valley` exists for exactly this and is used everywhere.
- **`floor` and `terrace` tones.** A wide horizontal slab at the bottom of a model reflects
  skylight, so painting it with the darkest tone makes the whole sprite read as lit from below.
  These two tones keep courtyards and plinths from inverting the model's light direction.
- **Bevels on a horizontal face.** A floor tile has no wall normal, so its light direction comes
  from bevelled west/east edges plus a 4×4 Bayer ordered dither. Bevelling only the upper edges
  lights the tile from the north vertex, which contradicts every wall and roof standing on it.
- **Shade a mass, not its parts.** A one-pixel grass blade has no surface to shade, so
  blade-by-blade shading leaves a tuft with no readable light direction at all. Vegetation,
  flower rosettes and crystal clusters are all shaded positionally across the whole clump.
- **Ordered dithers, not gradients or blurs.** Sky bands, cloud rims and glow halos are all
  dithered; every gradient and every `shadowBlur` in the old background was removed.
- **Deterministic noise, not `Math.random`.** Rims and scatter are broken up by an integer hash so
  the runtime sprite and the exported PNG agree byte-for-byte.
- **Discrete size buckets.** The prop and cloud generators pick a continuous scale; smoothly
  scaling a pixel-art sprite either blurs it or gives uneven pixel sizes, so it is quantised onto
  a few baked sizes.

`tests/buildings.test.mjs`, `tests/foliage.test.mjs`, `tests/terrain.test.mjs`, `tests/props.test.mjs`
and `tests/sky.test.mjs` re-paint every model and check that each one is shaded, lit from the left
and distinct. The buildings, foliage, terrain and sky suites additionally compare against the
committed PNG byte-for-byte, which makes drift between the code and the exported images
impossible. The light test is a left-half vs right-half luminance comparison rather than a
quadrant comparison, because a building stacks different materials vertically and a vertical split
would measure the palette instead of the light.

These write into `public/assets/**`, and the output is committed - re-running them after an art
change is expected to produce a binary diff.

## Read-only inspection scripts

Safe to run at any time; they only print.

| Script | Purpose |
| --- | --- |
| `analyze_board.cjs` | Prints board node/realm/town counts. |
| `analyzeGrids.cjs` | Inspects sprite-sheet grid layout. |
| `analyzePngs.cjs` | Reports PNG dimensions and formats. |
| `inspectSprites.cjs` | Lists sprite frames per animation state. |
| `scanAssets.cjs` | Scans the asset tree for files. |

## Build/test helpers

| Script | Purpose |
| --- | --- |
| `check-css-coverage.cjs` | Verifies every utility class used by the app exists in the compiled Tailwind stylesheet. Run via `npm run check:css` after a build. |
| `prepare-test-build.cjs` | Run automatically by `npm run pretest`. The sources use bundler-style extensionless relative imports, which Node's ESM resolver rejects, so this appends explicit `.js` extensions to the compiled output in `.test-build/` and adds the `with { type: 'json' }` attribute that JSON imports need. Without it, only leaf modules could be unit tested. |
| `lib/png.cjs` | Shared PNG encode/decode helpers used by the sprite generators. Extracted from `generate_all_sprites.cjs`. |
| `lib/contact_sheet.cjs` | Shared contact-sheet builder and per-model PNG exporter used by every art exporter, so the review sheets cannot drift apart in layout or backdrop. `cellW`/`cellH` give a fixed cell with each sprite centred in it, which is what lets the three cloud size buckets share one grid. |
| `lib/preview_companion.cjs` | Renders companion sprites as ASCII in the terminal plus a footprint summary. Defaults to every companion, so a bare run is a quick regression check; `node scripts/lib/preview_companion.cjs ignis` draws one. `--dir=<path>` works on any folder of same-sized PNGs, which is how the structure and tree models are reviewed. |

## Verifying the board instead

`tests/board.test.mjs` (`npm test`) covers the graph and data invariants that
`fix_board_connections.cjs` was written to repair, and runs in CI. Prefer it over running
the repair scripts.

`tests/companions.test.mjs` likewise asserts that every companion has a 64×64 model on
disk, that no model is a duplicate of another, and that the art vocabulary is one the
generator understands - so `generate_companion_sprites.cjs` only needs running when adding
or restyling a companion.

`tests/buildings.test.mjs` and `tests/foliage.test.mjs` do the same for the map art, and are
stricter: they re-paint every model and diff it against the committed PNG byte-for-byte. If one
of them fails with `... is stale - re-run npm run gen:buildings`, the painter and the exported
image have gone out of sync; regenerating is the fix, not editing the test.
