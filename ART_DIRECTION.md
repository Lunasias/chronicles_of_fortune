# Fortuna — visual production guide

## North star
An inviting, hand-crafted floating kingdom: jade forests, slate roofs, honey-lit windows,
cool violet shadows and confident, readable adventurer silhouettes. A tactical board that
feels like a place, with a restrained brass-and-ink interface.

## Shared rules
- Ground projection: 96 × 48, elevation step 24. Light from upper left.
- World sprites use native integer pixels; no bilinear smoothing, arbitrary rotation or
  fractional squash of finished sprites. Camera coordinates snap at the final draw.
- Art has a tinted dark silhouette, large midtone clusters, sparse warm highlights and
  cooler shaded faces. Quiet ground, readable actors, brightest accents on interactables.
- Feet, roots and foundations use explicit anchors. Animations preserve contact points.
- Portraits may have a different resolution; do not rescale world art through several canvases.
- UI: ink panels, muted brass rules, cream text, jade selection, coral danger. Thai body text
  stays readable. Icons use one pixel grid. Respect reduced motion and smaller viewports.
- Existing user artwork stays in place. Replacement artwork gets a new versioned path.

## Completion register
The goal is the entire overhaul, not just a title illustration. Mark a row complete only
after implementation and visual review at play size.

| # | Goal | Status | Current evidence |
|---|---|---|---|
| 1 | Shared art direction and asset conventions | Complete | This guide; versioned atlas manifest; shared ink/brass/jade palette |
| 2 | Crisp rendering and consistent pixel grid | Complete | PixelScale; native actor canvases; integer battle scaling; exported reference-day.png |
| 3 | Distinct playable class silhouettes | Complete | Six bases; 616 authored direction/pose cells across motion and action sheets |
| 4 | Visible promotion, equipment, skins, Darkling | Complete | Explicit eighteen-job map; material ramps and native regalia; four skin variants; Darkling horns/aura |
| 5 | Cohesive monsters, bosses and companions | Complete | Eighteen monster families; separate casting/defeat/victory sheets; twenty-seven companions and three hosts |
| 6 | Complete directional animation states and timing | Complete | Heroes use eight directions; motion/action states; phased battle timing; monster combat poses face either opponent |
| 7 | Natural terrain and legible board routes | Complete | Quiet connected roads; 96×48 projection; 32px cliffs; subdued fifteen-biome palettes |
| 8 | Regional identity and landmarks | Complete | Fifteen terrain families; regional nature and props; shrine, fishing, town and boss scenery |
| 9 | Terrain transitions and clustered nature | Complete | Neighbor-aware border blending; deterministic groves with road clearance; depth sorting |
| 10 | Distinct settlements and structures | Complete | Sixteen atlas cells; separate capital/village; same models in town and shop vignettes |
| 11 | Biome-matched tactical battle scenes | Complete | Shared terrain/sky/buildings/foliage; forest, snow, volcano and shrine fights inspected |
| 12 | Cohesive elemental combat effects | Complete | Seven palette ramps; distinct leaf, cross, shard, ember, spark and wisp particles; reduced flash |
| 13 | Sky, lighting, weather and ambience | Complete | Authored dawn/day/dusk/night; shared pixel clouds, celestial models, weather and atmosphere controls |
| 14 | HUD and all panel layouts | Complete | Shared panel/button theme; desktop HUD grid; inspect, inventory, shops and reports layouts |
| 15 | Pixel UI components, icons and typography | Complete | Native 8×8 SVG pictograms; accessible DOM text; Thai labels; visible keyboard focus |
| 16 | Unobtrusive labels and map information | Complete | Hover/all labels; compact waystones; occupation flags; active player name; inspect affordances |
| 17 | Title, setup, reports, victory and transitions | Complete | Original title art; responsive roster; king portrait; ink/brass reports; victory gazette |
| 18 | Responsive controls and graphics settings | Complete | 390px battle/inventory checked; integer actor scale; quality/labels/reduced-motion persistence |
| 19 | Reviewable reference scene and asset gallery | Complete | art-review.html; actual runtime renderers; pose/group/biome/time controls; 1×/2× and PNG export |
| 20 | Visual QA and automated regression checks | Complete | Runtime fixtures; atlas occupancy and promotion tests; terrain edge regression; 171 passing tests, production build and docs/art-review/QA.md |

## Acceptance views
Title and 2/4-player setup; initial capital; route selection; every biome in daylight and
night; all class directions; basic/heavy/magic/defend/hurt/victory; PvP and boss fight;
summon; shop, town, inventory, inspect, reports, victory; desktop and narrow phone.
Check feet contact, occlusion, labels, contrast, clipping, animation looping and frame rate.

## Asset provenance
`public/assets/art-v2/kingdom-title.png`: generated specifically for this project with
OpenAI image generation, 2026-10-16. Decorative title art only; interactive board geometry
and game UI remain real runtime elements.

`public/assets/art-v2/kingdom-buildings-atlas.png`: original 4 × 4 atlas generated for this
project, 2026-10-16. Runtime cells are rasterized once at native 96px; upper-left lighting
and one common foundation anchor. The deterministic 64px painters and exports remain the
offline / image-load-error fallback. The two representations are intentionally separate.

## Runtime asset contracts
- Hero output: 144×144, ground at (72,97). Source frame: 80×80, foot (40,68).
- Monster output: 144×144, same ground. Source frame: 112×96, foot (56,80).
- Buildings: native 96×96 with foundation (48,80); procedural 64×64 fallback remains.
- Trees: native 96×96, detected last opaque root row; legacy fallback is 64×64.
- Companions and settlement hosts: native 64×64.
- Terrain: native 104×96; top diamond 96×48 centered at (52,28), exposed cliff depth 32.
- Runtime extracts each generated cell once with nearest-neighbor sampling, removes detached
  neighboring fragments and hardens alpha. Gutter detection protects hats and feet.
- Atlases load only when needed. Hero/source frame caches have explicit caps; fallback PNGs
  load per requested actor. Do not put procedural fallback exports into the source atlas folder.

## Additional asset provenance
All PNGs in `public/assets/art-v2/` are original images generated for this project with OpenAI
image generation (2026-10-16; monster supplemental actions 2026-10-17). Original tool outputs
are retained outside the repository. Source-sheet dimensions vary; the manifest records the
actual dimensions and SHA-256 checksums. The delivered game uses native extracted cells,
not the decorative title illustration, for interactive game geometry.

The twelve hero sheets contain six motion and six action atlases. Monster sheets cover three
groups of six families, each with a four-column combat and supplemental action atlas. The
companion sheet contains twenty-seven collectible characters followed by king/innkeeper/
blacksmith cells. Building and nature atlases contain sixteen and twenty cells respectively.

## Intended reuse and limits
Promotions share the base class animation skeleton, with authored material ramps and pixel
regalia. Equipment uses readable native accents rather than a separate body sheet for every
inventory item. Monsters are battle-facing poses in two opposing facings; heroes retain eight
actual source directions for board movement. NPC hosts and companions have one full-body
portrait with runtime summon/entry motion. Those are separate visual contracts, not promises
of eight-view companion locomotion. Existing game logic and legacy source art remain in place.

## Review entry points
`npm run dev` serves the game and `/art-review.html`. Local development fixtures use
`/?art-scene=battle|boss|pvp|town|shop_weapon|shop_item|shop_magic|inspect|inventory|report|victory`
(one scene value at a time), optional `biome`, `job`, `companion=true` and `metrics=true`.
These routes are guarded by `import.meta.env.DEV`; fixture autosaves and Hall of Fame writes
are suppressed. The FPS meter is development-only and is not a guarantee for every device.
See `docs/art-review/QA.md` for the completed acceptance checks and practical limits.

## Living world — 2026-10-17
The latest world pass is documented in docs/art-review/LIVING_WORLD.md. Original generated
material and dressing atlases dated 2026-10-17 are added to the source manifest (24 images).
Terrain remains 96×48 native projection; detailed biome material samples and depth-sorted
96px scenery now carry the world's visual density. The 312 graph destinations retain their
IDs, dice costs and ownership identity under the expanded geographic layout.

## Generated combat artwork v3

Combat VFX use the original generated transparent PNG atlases under public/assets/combat-v3. All 132 profiles have explicit image ownership; player names inherit their selected job, while monsters and companions resolve by identity and skill. Code only selects, crops and plays the painted frames. Procedural rings, arcs, beams and particle shapes no longer render as battle effect art. Source sheets, prompts, inventory and QA manifest are retained.
