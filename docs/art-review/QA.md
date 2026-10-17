# Visual QA — Fortuna art overhaul

Reviewed 2026-10-17 in the local development build. This is a graphics acceptance log,
not a claim that every multiplayer session or every optional game mode has been completed.

## Automated acceptance
- npm run verify: typecheck, production build, 171 tests, compiled stylesheet coverage.
- 651 style classes covered; 12/12 pixel UI components and 10/10 stylesheet spot checks.
- Atlas tests inspect all hero motion/action cells, all monster combat/supplemental action
  cells, all companion/host cells, all structure cells and all nature cells for missing bodies.
- Effect-clock regression confirms identical 60-step durations at 30/60/144/240 Hz and bounds catch-up after suspension.
- Promotion tests cover all eighteen tier-2/tier-3 job mappings. Pose timing protects the
  cleric running cycle from selecting prayer/casting rows.
- Terrain tests cover fifteen biomes, day/night, flat/cliff, every variant, solid top faces,
  upper-left lighting, native bounds and neighbor transitions confined to the tile borders.
- Core spell/summon tests forbid scaled/rotated geometry, require integer pixel rectangles,
  preserve the caller canvas stack and fit long announcements to a narrow phone.
- Existing board, balance, save, multiplayer protocol, mobile display, sky and painter
  regressions remain in the same verification run.

## Runtime checks observed
| Surface | Evidence and result |
|---|---|
| Title / setup | Original title image, readable menu, two/four-player rosters and skin previews; desktop and 390×844 portrait. Configuration labels stack above selects on narrow screens. |
| Board / movement | Started and loaded a two-player game; rolled four; visible destination markers; clicked a destination, walked to Royal Dungeons and entered the actual encounter. |
| Actor pixels | Six bases reviewed in eight directions; idle, run, attack, magic, guard, hurt, victory and defeat views. Heavy attack uses the same authored action sequence and was exercised in battle. |
| Progression | All eighteen promotions reviewed together; skins 0–3 and Darkling reviewed across all six bases; equipment switch previews native shield/armor/accessory/weapon accents. |
| Monsters | All three groups reviewed with idle, casting, recoil and collapsed defeat poses in opposing battle facings; victory source cells inspected; boss dragon and PvP magician scenes reviewed. |
| Companions / NPCs | All twenty-seven full-body companion sprites inspected in the runtime gallery. King portrait inspected in the weekly report; blacksmith/innkeeper in settlement vignettes. Mobile summon button exercised; combat narration confirmed 68 damage and enemy 172/240 HP. |
| Buildings / nature | Sixteen structure types and all five nature families use the versioned atlas; foundation/root anchors and foreground fade checked on the reference scene. Capital, village and home remain visually distinct. |
| Regions | Reference scene reviewed in DAY and NIGHT for grass, forest, snow, desert, volcano, cavern, coral, celestial, abyss, fairy_grove, crystal_cavern, castle, steampunk, waterfall_forest and sakura_shrine. Warm windows remain readable against night ground. |
| Arena / effects | Forest, snow, castle, crystal cavern, volcano boss and shrine PvP scenes inspected. Attack, heavy attack, magic, defense and summon commands exercised. Element preview covers all seven ramps and native particle silhouettes. |
| Panels | HUD, minimap, route markers, inventory, inspect, shops, town vignette, weekly report, victory gazette and graphics settings reviewed. The shared ink/brass/jade components apply across the remaining game panels. |
| Accessibility | Quality, label mode and reduced motion changed through the real settings UI and survived a page reload; restored to high/hover/no override after the check. Native-size mobile portrait and integer actor scaling retain hard pixels. |
| Responsive battle | 390×844 with four main commands plus companion. Command panel scrolls internally. After summon, document scroll remains 0 and the arena stays at top 0. Portrait thumbnails update after asynchronous atlas arrival. |
| Performance | Full board observed around 63–65 rendered frames/second in the local browser at 1280×720 after loading. Frame timing is environment-dependent; narrow/hidden browser overrides reported higher unconstrained rates and are not used as a device-performance claim. |
| Export | Native 1152×720 reference canvas exported to reference-day.png. Gallery offers fit, 1×, 2×, pause/frame stepping and PNG export. |

## Issues found and resolved during review
- Eager loading of hundreds of per-direction files: replaced with demand-loaded atlases and
  requested legacy fallbacks; roster previews wait until setup is opened.
- Incorrect promotion base fallback, cleric run picking casting poses and idle foot bobbing.
- Detached atlas fragments and inconsistent sprite foot/root/foundation anchors.
- Opponent double-mirroring, fractional actor scaling and battle canvas smoothing reset.
- Duplicate neon sprite effects over the new authored action cells.
- Castle ground reading as graph paper; added quiet worn-stone clusters with tiny grout accents.
- Oversaturated celestial night sigils; shared terrain/prop palette now uses a muted ramp.
- Realm-specific nature drifting between board and arena: one shared biome-to-foliage mapping.
- Inspect and companion portraits staying on loading placeholders: repaint after asset arrival.
- Title covering the guide/settings panel; mobile difficulty labels squeezed beside selects.
- Root document scrolling when a low command button gained focus; viewport and arena are fixed,
  with scrolling confined to command/panel interiors.
- Smooth/transformed spell paths and unbalanced summon canvas restore; replaced with native
  strokes/rings and verified the drawing-state stack.
- Long combat announcements running outside narrow screens or behind the battle HUD.

## Scope and practical limits
Promoted jobs share their base motion sheets with material ramps and native silhouette accents.
Equipment adds readable overlays; this delivery does not invent a separate full animation sheet
for every inventory item. Monsters are drawn in two opposing battle facings; heroes have eight
actual source directions. Companion/NPC art is full-body portrait art with runtime entry/summon
motion. Original source PNGs total about 58 MiB and load on demand; performance on physical
low-end phones and slow networks has not been measured. Existing user artwork is preserved.
These contracts are also recorded in ART_DIRECTION.md and the source asset manifest.

## Dungeon visibility regression — 2026-10-17
Fixed surface-only camera bounds clipping dungeon destinations (world Y above 4400),
stale terrain/road caches after late dungeon insertion or board replacement, and the
rift entry button focusing the catacombs even when another dungeon was selected.
Browser checks show the player and ground in catacombs, volcanic spire and frozen labyrinth.
The added regression exercises all three entries, camera clamping, late terrain refresh,
return to the surface and board reset. npm run verify passes all 172 tests.
Screenshot: dungeon-fixed.png. Development fixture: /?art-scene=dungeon&realm=abyss
(or sunfire/frostpeak); fixture saves are disabled.

## Battle ground and dungeon exits — 2026-10-17
Replaced the two raised dueling slabs and floating arena diamond with a continuous,
viewport-filling biome floor. Combat, cutscene and companion effect coordinates now share
one ground layout; scenery roots and landmark foundations sit behind combatants on that plane.
Browser review covered steampunk/castle, a real attack, and the labelled frost exit portal.
All three dungeon end nodes (1006/1106/1206) now trigger surface return. Previously only
1006 was dispatched as an exit. Portals have persistent world labels. The original return
node survives save/load, and loading an in-dungeon save restores dungeon route geometry.
Legacy saves without a stored return node fall back to the capital. Verification: 174 tests,
typecheck, production build and CSS checks pass. Screenshots: battle-ground-fixed.png,
dungeon-exit.png. Fixture exit view: /?art-scene=dungeon&realm=frostpeak&room=exit.

## Ten-point graphics polish — 2026-10-17
See POLISH.md for the implementation and visual evidence for all ten review findings.
Final npm run verify passes 177 tests, production build, typecheck and stylesheet checks.
New screenshots: polish-battle.png, polish-dungeon.png, polish-mobile.png, polish-shop.png.
Browser tests also exercised actual mobile casting and the full-screen PvP handover shield.

## Living fantasy world — 2026-10-17
See LIVING_WORLD.md for expanded geography, density, source artwork and runtime observations.
The full verification run passes 181 tests, production build, typecheck and CSS checks.
New regressions cover all 312 ground anchors, large-world minimap fitting, clear walking
corridors, material projection, opaque RGB decoding, and all 24 new detail sprite cells.
Actual play rolled three, selected a visible destination and entered its NPC event.
