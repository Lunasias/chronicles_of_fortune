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

Both model exporters are **not** historical: they are re-run whenever the painters change, and
their output is committed. `npm run gen:art` runs both.

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

`IsometricBuildingPainter.ts` and `IsometricFoliagePainter.ts` share one set of primitives
(`IsoSurface`, `faceTones`, `isoBox`, `isoPlinth`, `isoGableRoof`, `puff`, `trunk`, `stroke`),
so the board's buildings and trees are lit and shaded by the same code rather than by two
similar-looking copies. Both are pure buffer painters with no DOM dependency, which is what lets
the exporters run them in Node.

- **One light source, top-left.** In 2:1 dimetric projection that means top face brightest,
  left face mid, right face darkest. Each material gets a `faceTones()` ramp built from
  *multiplicative* HSL lightness with a hue shift toward blue in shadow, so a pale plaster wall
  and a dark slate roof both separate without one washing out.
- **Valley corners.** A concave inner corner takes a fourth tone 10–15% darker than the darkest
  face. Reusing the lit tone in an inner corner is the single most common giveaway of amateur
  isometric art, so `IsoColors.valley` exists for exactly this and is used everywhere.
- **`floor` and `terrace` tones.** A wide horizontal slab at the bottom of a model reflects
  skylight, so painting it with the darkest tone makes the whole sprite read as lit from below.
  These two tones keep courtyards and plinths from inverting the model's light direction.
- **Selective outlining.** `IsoSurface.outline()` closes the silhouette with a tinted dark line
  derived from each rim pixel's own hue - never pure black - with a lighter inner line on the
  lit top-left edges.
- **Silhouette first.** Every structure and species has to be identifiable as a flat shape: a
  battlemented citadel, a gabled cottage with its chimney, a conical snow-laden pine, a flat
  mushroom cap, a bare forked thorn, a hanging willow fringe.
- **Deterministic noise, not `Math.random`.** Foliage rims are broken up by an integer hash so
  the runtime sprite and the exported PNG agree byte-for-byte.

`tests/buildings.test.mjs` and `tests/foliage.test.mjs` re-paint every model and compare it
against the committed PNG, then check that each one is shaded, lit from the left, distinct from
the others, and seated on its tile. The light test is a left-half vs right-half luminance
comparison rather than a quadrant comparison, because a building stacks different materials
vertically and a vertical split would measure the palette instead of the light.

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
| `lib/contact_sheet.cjs` | Shared contact-sheet builder and per-model PNG exporter used by both `generate_building_sprites.cjs` and `generate_foliage_sprites.cjs`, so the two review sheets cannot drift apart in layout or backdrop. |
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
