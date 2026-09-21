# ⚔️ Chronicles of Fortune (บันทึกแห่งโชคชะตา)

A 2.5D Isometric RPG Board Game inspired by **Dokapon Kingdom** featuring **Brown Dust 2** style HD Chibi Pixel Art, tactical combat dioramas, and competitive party mechanics.

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

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/Lunasias/chronicles_of_fortune.git

# Navigate into project directory
cd chronicles_of_fortune

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to start your adventure!

### Building for Production
```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack
- **Framework**: Vite + Vanilla TypeScript
- **Rendering Engine**: HTML5 Canvas (Procedural Pseudo-3D Volumetric Pixel Art & 2.5D Isometric Diorama)
- **Audio**: Web Audio API Procedural Synthesizer (Retro 8-bit/16-bit sound effects & melodies)
- **Styling**: Tailwind CSS + Custom Dokapon Pixel UI

---

## 📜 License
MIT License
