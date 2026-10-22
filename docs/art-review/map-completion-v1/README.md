# Map artwork completion — 2026-10-22

The map now displays complete trees, buildings, cliffs and bridges. The original
world sheets were drawn across their nominal 6×4 cell boundaries, while the game
cropped each cell separately. The fix segments each complete object across the
whole sheet, preserves its proportions, fits a transparent gutter, and anchors
its roots or foundation to the ground. Scenery culling includes visible canopies
whose roots are just outside the viewport.

## New generated artwork

Five original images were generated for this project with the built-in
`image_gen` tool on 2026-10-22, then packaged into 26 runtime images:

- Eighteen complete trees and natural landmarks, one for each surface/dungeon
  theme, under `public/assets/map-completion-v1/*-nature_large.png`.
- Six replacements for objects that were joined together in their original
  sheets: Abyss capital/tavern, volcanic dungeon landmark/travel gate, and volcanic
  capital/bridge. Separate image files prevent these objects sharing a crop.
- `public/assets/generated/world-loading-v1.webp`: an illustrated floating
  kingdom, shown during HTML boot and subsequent map-art loading. Progress,
  loading status and retry remain real accessible HTML controls.
- `public/assets/generated/fortune-ui-frame-v1.webp`: brass, oak-leaf and jade
  ornament used as a nine-slice border around prominent dialogs and the loading
  card. Thai text and controls remain separate from the image.

The 24 map exports are transparent 256×256 PNGs with at least 12 pixels of room
around each subject. Runtime sprites fit proportionally into 128×128 canvases
with their own four-pixel gutter. Existing artwork remains at its original paths;
the replacement manifest explicitly selects only these 24 new files.

## Provenance and regeneration

- Exact prompts: [prompts.json](../../../public/assets/map-completion-v1/prompts.json).
- Source sheets and illustrations: `public/assets/map-completion-v1/sources/`.
- Export inventory, source filenames and SHA-256 hashes:
  `public/assets/map-completion-v1/manifest.json`.
- Original source-sheet audit: [source-audit.json](source-audit.json).
- New artwork overview: [new-art-contact-sheet.png](new-art-contact-sheet.png).

To repackage the retained source images, make `sharp` available through Node's
normal package resolution (or `NODE_PATH`), then run:

```powershell
npm run pretest
node scripts/package-map-completion.cjs
```

The script uses the same whole-object extraction as the game. It does not call
an image API. The built-in generated originals remain retained separately.

## Verification

`npm run verify` passes: TypeScript, production build, all 279 automated tests,
and CSS coverage. Regression tests cover canopy/root recovery across cell
boundaries, preserving nearby objects, proportional fitting, ground anchors,
and illustrated loading through initial boot and later image requests.

Browser evidence is in [browser-qa.json](browser-qa.json), with screenshots in
this directory. `scripts/verify-map-completion.cjs` checks actual runtime art for
all 432 theme/role combinations, desktop and mobile loading, several world
biomes, inventory and the normal title/setup/new-game flow. Make `playwright`
available through Node package resolution and run it with the local Vite server.
