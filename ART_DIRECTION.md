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

| # | Goal | Status |
|---|---|---|
| 1 | Shared art direction and asset conventions | In progress |
| 2 | Crisp rendering and consistent pixel grid | In progress |
| 3 | Distinct playable class silhouettes | Pending |
| 4 | Visible promotion, equipment, skins, Darkling | Pending |
| 5 | Cohesive monsters, bosses and companions | Pending |
| 6 | Complete directional animation states and timing | Pending |
| 7 | Natural terrain and legible board routes | Pending |
| 8 | Regional identity and landmarks | Pending |
| 9 | Terrain transitions and clustered nature | Pending |
| 10 | Distinct settlements and structures | Pending |
| 11 | Biome-matched tactical battle scenes | Pending |
| 12 | Cohesive elemental combat effects | Pending |
| 13 | Sky, lighting, weather and ambience | Pending |
| 14 | HUD and all panel layouts | Pending |
| 15 | Pixel UI components, icons and typography | Pending |
| 16 | Unobtrusive labels and map information | Pending |
| 17 | Title, setup, reports, victory and transitions | In progress |
| 18 | Responsive controls and graphics settings | Pending |
| 19 | Reviewable reference scene and asset gallery | Pending |
| 20 | Visual QA and automated regression checks | Pending |

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
