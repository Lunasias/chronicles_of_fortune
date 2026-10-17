# Graphics polish — 2026-10-17

Implemented the ten findings from the visual review. Beauty remains a visual judgment;
automated checks protect rendering and gameplay behavior rather than certify aesthetics.

| Finding | Delivered change |
|---|---|
| Flat, empty battle scene | Shared floor, irregular earth lip, worn approach, large quiet patches, rear scenery and foreground props; 3× actors on large displays |
| Outdoor-looking dungeons | Separate seven-node scene for each dungeon; masonry room, pillars and torchlight; no sky, neighboring island, cloud sea, shoreline waves or outdoor trees |
| Background style mismatch | Coarse 4/8-pixel angular ridge clusters replace smooth-looking one-pixel sine hills; restrained time-of-day colors |
| Repeating floor texture | Sparse, displaced crystal clusters; quieter specular tips; regenerated canonical terrain PNGs; broad arena patches interrupt tiling |
| Identical tree arrangements | Trees reduced or removed by biome; stone ruins, industrial pipes, desert/ice rocks, grass and landmark variations |
| Detached, dark shadows | Smaller, lighter actor shadows; reduced team ring; building contact shadows moved to the foundation |
| Similar promoted jobs | Native outer garments across eighteen jobs: capes, spiked shoulders, scarves, wings, mitre, headdress, scythe and rune accents; tier pairs differ in geometry |
| Small text / truncated skill names | Short stable action label plus Thai skill subtitle, full accessible name and tooltip; larger command/narration text; adaptive command grid with compact narration |
| Shop perspective mismatch | One interior view with shelves, weapons/books/potions, forge, host and counter; exterior miniature removed from shops |
| Background/VFX stealing focus | Smaller sun/moon, less bobbing; fewer, thinner and fainter speed lines kept at the screen edges |

## Validation

- `npm run verify`: typecheck, production build, 177 passing tests and compiled CSS checks.
- Regression covers scene isolation, switching focus between surface and dungeon, dungeon
  return/save/load, native integer scenery and distinct promotion tier silhouettes.
- Browser inspection: forest/steampunk battle, crystal cavern at 390×844, 1920×960 wide battle,
  actual mobile magic command, frost dungeon, eighteen-job gallery, weapon shop and PvP handover.
- PvP privacy shield remains a full-screen overlay; command styling now targets named dock/row
  elements, avoiding the dynamic last-child collision found during review.
- Temporary browser viewport overrides were reset after testing. No physical-phone performance
  benchmark or production deployment confirmation is implied.
- Reused original character animation sheets with authored native garment layers. This pass
  does not replace every promotion with an independent full animation atlas.

## Screenshots

- `polish-battle.png`: wide battlefield and command dock.
- `polish-mobile.png`: portrait crystal cavern and readable skill subtitle.
- `polish-shop.png`: integrated shop interior after the host atlas loads.
- `polish-dungeon.png`: isolated dungeon room without outdoor scenery.
