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
| `generate_companion_sprites.cjs` | Draws the 64×64 model for **every** companion listed in `src/game/companions.json` into `public/assets/companions/`. Also deletes models whose companion no longer exists. Run via `npm run gen:companions`. Pass `--contact-sheet` to additionally write `.companion-sheet.png`, a scaled grid of every sprite for review. |

These write into `public/assets/**`. They are historical: the committed assets are already
generated, so re-running them will produce a large diff of binary files. The companion
generator is the exception - it is meant to be re-run whenever a companion is added or its
art recipe changes.

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
| `lib/preview_companion.cjs` | Renders companion sprites as ASCII in the terminal plus a footprint/footprint summary. Defaults to every companion, so a bare run is a quick regression check; `node scripts/lib/preview_companion.cjs ignis` draws one. Useful because the sprites are small enough to review as text. |

## Verifying the board instead

`tests/board.test.mjs` (`npm test`) covers the graph and data invariants that
`fix_board_connections.cjs` was written to repair, and runs in CI. Prefer it over running
the repair scripts.

`tests/companions.test.mjs` likewise asserts that every companion has a 64×64 model on
disk, that no model is a duplicate of another, and that the art vocabulary is one the
generator understands - so `generate_companion_sprites.cjs` only needs running when adding
or restyling a companion.
