# ⚔️ Chronicles of Fortune (บันทึกแห่งโชคชะตา)

A 2.5D Isometric RPG Board Game inspired by **Dokapon Kingdom** featuring **Brown Dust 2** style HD Chibi Pixel Art, tactical combat dioramas, and competitive party mechanics.

Single-player board campaign against up to 3 AI rivals (local hot-seat play is also supported).

![Dokapon Kingdom x Brown Dust 2 Style](https://raw.githubusercontent.com/Lunasias/chronicles_of_fortune/main/public/favicon.ico)

---

## 🌟 Key Features

### 1. 🎲 Dokapon Kingdom Inspired Gameplay
- **Board Movement**: Roll spinners/dice, navigate branching crossroad paths, and capture towns.
- **Simultaneous Combat Mindgames**:
  - **Attacker**: `Attack` (Basic Phys) | `Strike` (Pierces Def) | `Magic` (Elemental) | `Skill` (Class Specialty)
  - **Defender**: `Defend` (Halves Attack) | `Counter` (Punishes Strike) | `Magic Guard` (Blocks Spells) | `Give Up` (Surrender)
- **Town & Economics System**: Liberate monster-infested settlements, collect local taxes, and invest in infrastructure.
- **PvP Revenge & Humiliation**:
  - Rob loser's gold, steal weapons/armor, take town deeds, or scribble hilarious graffiti on their face with the interactive canvas.
- **The Darkling Pact**:
  - Lagging behind? Make a demonic pact with Overlord Rico! Sacrifice your belongings for 3-dice rolls, 3x stats, and cast global calamities.
- **Royal Weekly Report**: Weekly net worth ceremonies hosted by the King.

### 2. 🎨 Brown Dust 2 Style Visual Overhaul
- **Enchanted Mushroom Forest Diorama**:
  - Giant Fly Agaric red polka-dot mushrooms, sapphire blue, yellow, and glowing purple caps.
  - Diagonal **Prismatic Rainbow God-Ray Beam** with screen blend refraction and floating fireflies/spores.
- **3x3 Tactical Isometric Battle Grids**:
  - Tactical 3x3 grids for player and enemy teams with signature white corner bracket markers `[ ]` on each diamond tile.
  - 3D diorama earthen platform slabs with layered rock cliffs and dangling hanging vines.
- **Elemental Slime Spirits**:
  - Flame Slime (fiery hair, burning aura), Frost Slime (crystal spikes), Sun Slime (floral wreath), Blossom Slime (cherry blossoms), and Gold King Slime.
- **Party Formation & Combat Queue**:
  - 4-member party line-up facing NE (Hero, Ranger/Archer, Priestess, Mage).
  - Brown Dust 2 style side turn queues with HP numbers and "BATTLE START >>" pill button.
- **64×64 Isometric Map Models**:
  - **13 structures** — capital citadel, blacksmith, arcane spire, cathedral, general goods, tavern,
    guild hall, fishing pier, isekai shrine, dark gate, treasure vault, wonder chest and cottages.
  - **5 tree species × 4 silhouettes** — ancient dark oak, snow-laden frost pine, bioluminescent
    gloomspore, ember-lit ash thorn and weeping blood willow.
  - Every model is painted from a plain RGBA buffer by
    `src/engine/IsometricBuildingPainter.ts` and `src/engine/IsometricFoliagePainter.ts`, so the
    same art is drawn at runtime *and* exportable as a PNG. Nothing is a scaled-down vector
    shape: each model is a true 64×64 pixel-art sprite blitted 1:1.
  - All of them obey one light source (top-left): top face brightest, left face mid, right face
    darkest, plus a `valley` tone 10–15% darker than the darkest face for concave corners, and a
    colour-shifted sel-out outline that is never pure black. `npm test` measures the light
    direction on every single model.
- **Pixel-art World Floor**:
  - **15 biomes × flat/cliff × day/night = 60 floor tiles**, painted by
    `src/engine/IsometricTerrainPainter.ts` and exported to `public/assets/terrain/`.
  - A horizontal face has no wall normal, so its light direction comes from bevelled edges plus a
    4×4 Bayer ordered dither that thins the lit tone from the west and thickens the shaded tone
    toward the east. A gradient would band across 312 repeated tiles; a flat fill would read as a
    colour swatch.
  - **Floor clutter** — boulders, grass tufts, wildflower patches, shrubs and magic crystals, in
    5 types × 15 biomes × 4 shapes × 3 sizes × day/night — is painted by
    `src/engine/IsometricPropPainter.ts` and blitted from a canvas cache instead of being redrawn
    with a dozen path calls per prop per frame.
- **Pixel-art Sky, Weather and the Cloud Sea**:
  - The sky is **18 discrete colour bands**, not a gradient, joined by a 4×4 ordered dither. It is
    a 64px tile that wraps seamlessly and stretches to any viewport, so a full-height sky costs one
    small canvas per time of day.
  - Suns and the crescent moon are painted discs inside five ordered-dither halo rings, and the
    clouds are baked sprites at three fixed sizes — nothing in the background is ever rescaled.
  - **The cloud sea under the map**: three world-space rows drawn below the continent's lowest
    tile, so the board reads as a floating island in the sky rather than as a map printed on a wall.
- **Pixel-art UI**:
  - Every panel, button, bar, tab and scrollbar is built from integer-stepped shading — a 2px ink
    outline, a 2px accent ring, a 2px inset bevel and a hard 4px drop shadow with no blur radius —
    with no `border-radius`, no `backdrop-filter` and no eased transitions anywhere.
  - Stat bars are sunken wells with 6px-segmented fills, so a half-full bar reads as a count rather
    than as a smooth length. Buttons press by exactly 3px and their shadow shrinks by the same 3px.
  - `npm run check:css` fails the build if any glass utility (`rounded-lg`, `backdrop-blur`,
    `shadow-2xl`, `bg-gradient-to-…`) reappears in the built markup.

### 3. 🗺️ The World
A hand-authored continent of **312 spaces** across **6 realms** and 15 sub-regions, including **41 towns** to liberate and tax, plus shops, taverns, guilds, churches, vaults, fishing spots, boss lairs and a Darkling gate.

### 4. 💖 Companions
**27 recruitable companions**, each with its own **64×64 pixel-art model**, drawn from the
monster girls you spare in battle, the guild's hired mercenaries, and story events. A
companion can be summoned once per battle for a powerful assist, and the emergency assist
can save a hero from a killing blow. Every companion's model is generated from a single
data file, so adding one is a JSON entry plus `npm run gen:companions`.

The models follow one light source (top-left) applied through a light map, five-stage
hue-shifted ramps per material, and selective outlining, so the shading reads at a glance
instead of looking flat. Each character's silhouette is built from its own name — the
kitsune miko carries nine tails and a gohei wand, the gunner a top hat and a gatling gun,
the mummy queen a nemes headdress and wrapped bandages. The art recipe also supports
per-character effects: the Slime Princess wields an acid-gel rapier whose blade grades
emerald to sapphire, surrounded by four bursting high-pressure acid bubbles
(`bladeGradient` and `bubbleBurst` in her recipe). `npm test` verifies that every companion
has a shaded, uniquely-lit, non-duplicate model.

### 5. ⚖️ Scaling Enemies
Monster stats are authored as the balance point for a **level-1 hero** and then scaled at
battle time to whoever is actually attacking. A tier-1 encounter stays a short skirmish and
a tier-4 encounter stays lethal, whether the hero is level 1 or level 30 — no more
one-shotting a region you have out-levelled, and no more walking into a fight you cannot
lose. The scouting tooltip reports the fight it will actually be, in rounds.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js v22 or higher** (the test suite uses `node --test` glob patterns)
- npm

### Installation
```bash
git clone https://github.com/Lunasias/chronicles_of_fortune.git
cd chronicles_of_fortune
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to start your adventure!

### Building for Production
```bash
npm run build
npm run preview
```

---

## 🧪 Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run typecheck` | Strict TypeScript check, no emit |
| `npm run build` | Type check + production bundle (incl. compiled Tailwind CSS) |
| `npm test` | Unit tests for board-data integrity, HTML escaping, save/load, enemy scaling, facing, and the 64×64 companion / structure / tree models |
| `npm run check:css` | Verifies every utility class used by the app is in the compiled stylesheet |
| `npm run gen:companions` | Regenerates the 64×64 companion models from `src/game/companions.json` |
| `npm run gen:buildings` | Regenerates the 13 structure models into `public/assets/buildings/` and the review sheet `.building-sheet.png` |
| `npm run gen:foliage` | Regenerates the 20 tree models into `public/assets/foliage/` and the review sheet `.foliage-sheet.png` |
| `npm run gen:terrain` | Regenerates the 60 floor tiles into `public/assets/terrain/` and the review sheet `.terrain-sheet.png` |
| `npm run gen:props` | Writes the floor-clutter review sheets (`.prop-sheet.png`, `.prop-variants-sheet.png`); props are runtime-only, so no per-model PNGs |
| `npm run gen:sky` | Regenerates the 4 skies, 4 suns and the moon into `public/assets/sky/`, plus the cloud and celestial review sheets |
| `npm run gen:art` | All of the above art generators |
| `npm run verify` | Everything CI runs: typecheck → build → test → CSS coverage |

**Always run `npm run verify` before pushing.** CI runs the same command.

### Reviewing art without an image viewer

`scripts/lib/preview_companion.cjs` renders any folder of same-sized sprites as ASCII, which is
how the models are checked in a terminal:

```bash
node scripts/lib/preview_companion.cjs --dir=public/assets/buildings --full
node scripts/lib/preview_companion.cjs --dir=public/assets/terrain --full
```

The `--dir` mode is generic — it reads whatever PNGs it finds, so it works for structures, trees
and floor tiles as well as companions. The `.building-sheet.png`, `.foliage-sheet.png`,
`.terrain-sheet.png`, `.prop-sheet.png`, `.sky-sheet.png` and `.cloud-sheet.png` files written by
the generators are the enlarged contact sheets for review; all of them are gitignored because they
are derived from the committed per-model PNGs.

### Project layout
```
src/
  engine/   Canvas renderers: isometric board, terrain, characters, VFX, audio
  game/     Rules and state: board data, combat, economy, events, save/load
  ui/       DOM and canvas UI layers
  util/     Small shared helpers (HTML escaping)
  styles/   Tailwind entry point
reference/  Artist source art for scripts/generate_all_sprites.cjs.
            Deliberately NOT under public/ so it is not shipped to production.
scripts/    Manual one-off dev tooling - see scripts/README.md
tests/      node:test suites (compiled from src by npm run pretest)
```

---

## 🛠️ Tech Stack
- **Framework**: Vite + Vanilla TypeScript (strict)
- **Rendering Engine**: HTML5 Canvas (Procedural Pseudo-3D Volumetric Pixel Art & 2.5D Isometric Diorama)
- **Audio**: Web Audio API Procedural Synthesizer (Retro 8-bit/16-bit sound effects & melodies)
- **Styling**: Tailwind CSS compiled at build time (no CDN) + custom Dokapon pixel UI classes
- **Tests**: `node:test` (no test-runner dependency)

### Notes for maintainers
- `src/game/BoardMap.ts` is both the level data **and** the pristine baseline for a new
  game. Runtime board state (town ownership, town levels, built homes) lives on a deep
  clone created by `GameState.resetBoard()`; never mutate the module constant directly.
- A hero's `nodeId` is authoritative for where it is, not `gridX/gridY/gridZ`. The grid
  coordinates are interpolated during a walk, and `executeSingleStep` commits `nodeId` to the
  destination at the start of the step, so the two disagree mid-animation. `SaveManager`
  re-derives the coordinates from the node in both directions for exactly this reason.
- Two nodes can share a tile and differ only in elevation (a cliff or bridge). Stepping
  between them has no on-screen bearing, so `calculateIsoDirection` takes the current facing
  as a fallback instead of inventing a direction.
- Board and sprite data are generated/edited by the scripts in `scripts/`. Two of them
  rewrite tracked source - they are dry-run by default and require `--write`.
- Hero names and prank nicknames are user input. Escape them with `escapeHtml()` from
  `src/util/Html.ts` (or use `textContent`) before putting them in `innerHTML`.
- `src/game/companions.json` is the single source of truth for companions: names, skill text
  and the art recipe for the 64×64 model. `CompanionDatabase.ts` reads it at runtime and
  `scripts/generate_companion_sprites.cjs` reads it to draw the PNGs, so a companion cannot
  exist without a model. `npm test` enforces that.
- Enemy stats authored in `BoardMap` and the encounter tables are the **level-1 reference**,
  not the numbers a hero fights. `src/game/BalanceSystem.ts` scales them to the actual
  attacker; always build a `Combatant` through `scaleMonster()` so the fight matches what the
  scouting tooltip promised.
- `src/engine/IsometricBuildingPainter.ts` and `src/engine/IsometricFoliagePainter.ts` are pure
  buffer painters: they must not import anything that touches the DOM, because
  `scripts/generate_building_sprites.cjs` / `generate_foliage_sprites.cjs` compile and run them
  off-line. The matching `Isometric*Renderer.ts` classes are the only DOM-facing part, and they
  only convert a painted buffer into a cached canvas.
- Those two painters are the single source of truth for map art. `tests/buildings.test.mjs` and
  `tests/foliage.test.mjs` re-paint every model and compare it byte-for-byte against the
  committed PNG, so editing a painter without re-running `npm run gen:art` fails the suite
  rather than silently leaving stale images on disk.
- Sprite anchors are exact. A structure's footprint diamond is centred at sprite `(32, 48)` and a
  tree's root collar at `(32, 54)`, so they are blitted at `(px - 32, py - 48)` and
  `(px + 20, py - 48)`. Changing `BUILDING_BASE_Y` or `FOLIAGE_BASE_Y` moves every model on the
  board, and `npm test` asserts the base still lands inside the seating band.
- The event feed (`#gameEventFeedWindow`) must stay readable behind a modal. `ShopUI` and
  `TownUI` call `syncFeedPanelClass()` from `src/util/PanelFocus.ts` whenever they open or close,
  which toggles `body.panel-open`; the CSS in `index.html` then raises the feed above the modal
  on wide screens and docks it to the top edge on narrow ones. Add any new full-screen panel to
  `FEED_PANELS` there instead of hard-coding z-index classes in the markup.
- The whole UI is built from component classes in the inline `<style>` in `index.html`
  (`pixel-box`, `pixel-btn`, `pixel-bar`, `pixel-head`, `pixel-well`, `pixel-chip`, `pixel-close`,
  `pixel-tab`, `pixel-row`, `command-card`). They are defined there rather than in a Tailwind
  layer so `npm run check:css` can see them. Do not reintroduce `border-radius`,
  `backdrop-filter`, blurred `box-shadow` or eased `transition` in the chrome — `check:css` fails
  the build if a glass utility reaches the built markup, because one rounded blurred panel is
  enough to make the entire UI read as a modern glass card again.
- Colour variants are written as two-class selectors (`.pixel-btn.pixel-btn-gold`) on purpose.
  A bare class ties with a Tailwind utility on the same element and lets source order decide the
  winner.
- **Never round-trip a source file through a PowerShell `Get-Content | Set-Content` pipeline.**
  `index.html` and several UI sources contain Thai text, and that pipeline re-encodes the whole
  file and replaces every non-ASCII character — silently, with a build that still succeeds but a
  UI full of mojibake. Use the file tools, or a Node script, as
  `scripts/apply_pixel_ui_style.cjs` and `scripts/strip_glass_ui.cjs` do.

---

## 📜 License
MIT License - see [LICENSE](LICENSE).
