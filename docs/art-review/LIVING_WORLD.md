# Living fantasy world — 2026-10-17

The board now occupies roughly 15,072 × 6,624 world pixels. The 312 existing destinations,
route links, ownership IDs and dice-step costs remain stable; their geography is expanded
approximately twice along each axis with an integer organic offset. Loading a saved player
reanchors its grid position to the destination ID, as before. Three destinations that previously shared an XY position at different heights were separated by one grid cell; all 312 destinations now retain their own exact ground material and elevation. The meadow kingdom shares the adjoining capital plateau elevation so its destination is not buried below surrounding terrain.

## Environment

- 19,773 terrain cells, 4,538 canopy trees, 9,662 large dressing placements and 12,130 small
  native floor clusters, generated deterministically from the expanded surface map.
- Seven-cell organic land margins replace narrow two-cell node pads. Winding paths connect
  the same destination graph. Walking animation duration accounts for the longer visual step.
- Forests contain canopy, fern/berry understory, fallen logs, mossy outcrops and ruins.
  Waterfall groves include cascade rocks and mountain crags; snow, desert, volcanic,
  coral, celestial, shrine, industrial and cave regions use their own prop families.
- Town/guild/inn surroundings form settlement clusters with cottages, camps, fences,
  wells, markets and lantern signposts. Regional families avoid woodland cottages in
  unsuitable snow/desert/volcanic/cave settlements. These are scenery around existing
  interactable destinations; they do not add new game-rule nodes.
- Tree trunks stay over 42 world pixels from route centerlines; large props stay over 22.
  Node anchors retain clearance. Foreground vegetation/dressing fades around heroes and
  hovered destinations so dense scenery does not hide route selection.
- Spatial buckets cull terrain, floor props, canopy and dressing before rendering; large
  sprites share the world depth-sort with characters. Native cells are cached and reused.

## Matched artwork

Two original OpenAI image-generation outputs were created for this project on 2026-10-17:

- `public/assets/art-v2/world-ground-materials.png`: full-bleed 4×4 material atlas containing
  fifteen biome materials and one worn path material. Native 96×96 samples project into
  the existing 96×48 diamond using nearest samples, preserving alpha, seams and cliffs.
- `public/assets/art-v2/world-details-atlas.png`: transparent 6×4 atlas containing twenty-four
  nature, ruin and settlement sprites. Cells extract to native 96px, with explicit detected
  contact anchors and separate night-tinted caches.

These use detailed clustered pixels compatible with the existing character/building art,
replacing broad flat ground and tiny simple decoration as the main visible environment.
The procedural painters remain loading/error fallbacks. Original generated files are retained
outside the repository; the manifest records delivered source dimensions and SHA-256 hashes.
Common material/dressing atlases load on demand; the new source PNGs total about 7.2 MiB.

World materials and props are also used in battle scenery. The review gallery now includes
the actual continent by biome and all twenty-four dressing sprites. The minimap fits actual
scene bounds instead of assuming a 36×32 map. The road repair utility uses the expanded
coordinate distance limit; Banishment's distance threshold scales with the geography.

## Acceptance

- `npm run verify`: production build, typecheck, 181 tests, CSS coverage pass.
- New tests check continent size/density, road clearance, regional sprites in every atlas
  cell, RGB material decoding, material opacity and cliff/seam preservation, native sampling,
  winding-path endpoints, and minimap bounds for the expanded world and dungeon.
- Existing board reachability, save normalization, dungeon entry/return, promotion, battle,
  terrain, sky, mobile and multiplayer protocol tests remain passing.
- Actual browser play: rolled three, clicked the visible destination, walked the route,
  followed the camera and entered the Aviator Girl Nicole destination event.
- Runtime inspection includes capital, waterfall forest, snow, night lighting and encounter
  scenery. Screenshots are stored beside this document. The development scene is
  `/?art-scene=world&biome=forest` with optional `node`, `job` and `metrics=true`.
- The local browser reported roughly 80–90 rendered frames/second at 1280×720 after loading;
  this is not a physical-device or slow-network benchmark. Cold asset loading still uses
  procedural fallback art until the demand-loaded sheets arrive.

Screenshots: `living-world-capital.png`, `living-world-forest.png`, `living-world-snow.png`,
`living-world-night.png`, and `living-world-battle.png`.
