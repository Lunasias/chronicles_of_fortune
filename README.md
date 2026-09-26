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
| `npm test` | Unit tests for board-data integrity, HTML escaping, save/load, enemy scaling and companion models |
| `npm run check:css` | Verifies every utility class used by the app is in the compiled stylesheet |
| `npm run gen:companions` | Regenerates the 64×64 companion models from `src/game/companions.json` |
| `npm run verify` | Everything CI runs: typecheck → build → test → CSS coverage |

**Always run `npm run verify` before pushing.** CI runs the same command.

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

---

## 📜 License
MIT License - see [LICENSE](LICENSE).
