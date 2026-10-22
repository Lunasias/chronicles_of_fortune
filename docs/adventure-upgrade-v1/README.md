# Adventure experience update — 2026-10-22

This update improves decisions, discoverability, responsiveness and save reliability.
It also includes the [complete map-art update](../art-review/map-completion-v1/README.md)
with 24 generated replacement sprites, illustrated loading and brass/jade UI artwork.

## Choosing a destination

The travel dock now lists the destinations reachable on the current dice roll.
Filter by services, towns, treasure, combat or no random battle; sort by route order,
estimated danger or step count. Cards retain their original map IDs and indices.
Selecting a card previews the path and camera position. Travel starts only when the
player explicitly confirms. Dock arrows, keyboard and controller respect the same
filtered list.

Each preview shows HP/MP, place benefits and an opening combat estimate based on
the real damage formulas, current equipment, weather and available MP. Low-health
players receive a nearby-rest suggestion when a reachable service is available.
PvP occupants are excluded from the no-battle filter. Estimates do not predict
critical hits, skill choices, defence or a guaranteed outcome.

## Journal and help

Open **สมุดนักผจญภัย** from the system menu or press **?**. The title menu also
provides the guide before starting a campaign. The journal shows the current
mode's objective, progress, remaining days, net-worth standings and nearest
reachable service types. Service buttons focus the map; the road distance is
planning information, not permission to stop short of a dice roll.

Combat and control tabs explain the actual command relationships, route controls,
touch controls and saving. An optional dismissible first-days hint introduces the
turn flow. The guide keeps keyboard focus inside, restores focus on close, and
prevents keyboard/controller actions reaching the board or battle beneath it.

## Saving and recovery

Automatic saves now use slot **0**; explicit manual saves use the selected slot.
The title Continue action chooses the most recent compatible save rather than
always preferring slot 1. Imports validate the entire candidate before replacing
the running game or persistent save. A rejected import leaves both intact.

Each slot keeps its previous good copy. A corrupt or missing primary can recover
from it, while unsupported save versions remain protected. Metadata is derived
from real save contents. Storage/quota errors are reported, and exported save
codes remain suitable for transfer to another device. The v2 format and existing
slot keys remain compatible.

## Rendering and application shell

Roster buttons retain their DOM identity, focus and handlers; inspectors resolve
the latest multiplayer player object. Avatar drawing and quest markup update
only when their contents change. The minimap reuses board geometry while player
markers track walking. Winding-road stamp coordinates are prepared once instead
of recalculating trigonometry and temporary objects for every rendered stamp.

The service worker tolerates missing optional assets and caches the production
shell with bounded bundle/image caches. Development modules, private responses,
errors, remote resources and bulk source-art sheets are excluded. Cache cleanup
only touches this game's caches. This is a resilient shell cache, not a promise
of complete offline gameplay artwork. The app now has valid installation icons.

## Verification

`npm run verify` passes TypeScript, production compilation, all **313 automated
tests** and CSS coverage. New regressions cover journal goals, route safety/filtering,
finite MP, save corruption/quota/import rejection, HUD invalidation and worker
install/offline/cache behaviour. The existing gameplay, dungeon and multiplayer
suites remain part of verification.

Browser evidence is captured separately for desktop, portrait and landscape.
All **33 browser checks** pass with no JavaScript or network errors. They cover
real dice rolls, card previews, explicit travel and arrival, filtered keyboard
navigation, guide focus and input isolation, save/export/import and latest-save
continuation. See [browser-qa.json](browser-qa.json) and screenshots in this directory, plus the
map update's 432-sprite audit. Browser checks exercise the documented gameplay
flows; multiplayer rules also retain their automated regression coverage.
