import { IsoDirection, CharacterAnimState } from './PixelSpriteGenerator';

// Unit direction vectors for 2:1 Isometric Board and Battle Movement
const ISO_DIR_VECTORS: Record<IsoDirection, { x: number; y: number }> = {
  SE: { x: 0.85, y: 0.42 },
  SW: { x: -0.85, y: 0.42 },
  NE: { x: 0.85, y: -0.42 },
  NW: { x: -0.85, y: -0.42 },
  S: { x: 0, y: 0.85 },
  N: { x: 0, y: -0.85 },
  E: { x: 1.0, y: 0 },
  W: { x: -1.0, y: 0 }
};

const DIR_NAME_MAP: Record<IsoDirection, string> = {
  S: 'south',
  SE: 'south-east',
  E: 'east',
  NE: 'north-east',
  N: 'north',
  NW: 'north-west',
  W: 'west',
  SW: 'south-west'
};

export class CustomIsometricMonsterRenderer {
  private cache = new Map<string, HTMLCanvasElement>();
  private monsterImageStore = new Map<string, HTMLImageElement>();
  private currentDir: IsoDirection = 'SW';
  private isBack: boolean = false;

  constructor() {
    this.preloadMonsterImages();
  }

  private preloadMonsterImages() {
    const archetypes = [
      'slime_princess', 'goblin_girl', 'beast_maiden', 'dark_knightress',
      'dragon_princess_ignis', 'sakura_kitsune', 'skeletal_maid', 'yeti_maiden',
      'siren_demoness', 'clockwork_maid', 'bandit_pirate', 'dragon_wyrm',
      'kraken_maiden', 'sphinx_queen', 'dryad_nymph', 'arachne_weaver',
      'vampire_countess', 'ghost_maiden'
    ];
    const directions: IsoDirection[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

    for (const arch of archetypes) {
      // 1. Portrait Preview
      const img = new Image();
      img.src = `/assets/monsters/${arch}.png`;
      img.onload = () => {
        this.cache.clear();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('monster-assets-loaded'));
        }
      };
      this.monsterImageStore.set(arch, img);

      // 2. Preload 8-Directional Idle and Attack Frames referencing the spellblade model
      for (const dir of directions) {
        const dirName = DIR_NAME_MAP[dir];

        // Idle frame
        const idleImg = new Image();
        idleImg.src = `/assets/monsters/${arch}/Idle/rotations/${dirName}.png`;
        idleImg.onload = () => {
          this.cache.clear();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('monster-assets-loaded'));
          }
        };
        this.monsterImageStore.set(`${arch}_idle_${dir}`, idleImg);

        // 4 Attack frames per direction (32 Attack frames per monster)
        for (let f = 0; f < 4; f++) {
          const atkImg = new Image();
          atkImg.src = `/assets/monsters/${arch}/Attack/rotations/${dirName}_${f}.png`;
          atkImg.onload = () => {
            this.cache.clear();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('monster-assets-loaded'));
            }
          };
          this.monsterImageStore.set(`${arch}_attack_${dir}_${f}`, atkImg);
        }
      }
    }
  }

  public getMonsterArchetypeKey(mName: string): string {
    const n = mName.toLowerCase();
    if (n.includes('slime') || n.includes('ooze') || n.includes('jelly')) return 'slime_princess';
    if (n.includes('skeleton') || n.includes('undead') || n.includes('bone') || n.includes('mummy')) return 'skeletal_maid';
    if (n.includes('knight') || n.includes('commander') || n.includes('paladin') || n.includes('valkyrie') || (n.includes('captain') && !n.includes('pirate'))) return 'dark_knightress';
    if (n.includes('marauder') || n.includes('bandit') || n.includes('raider') || n.includes('pirate') || n.includes('thief')) return 'bandit_pirate';
    if (n.includes('panther') || n.includes('wolf') || n.includes('hound') || n.includes('chimera') || n.includes('beast') || n.includes('fenra') || n.includes('kaelia')) return 'beast_maiden';
    if (n.includes('colossus') || n.includes('golem') || n.includes('automaton') || n.includes('dreadnought') || n.includes('behemoth') || n.includes('clockwork')) return 'clockwork_maid';
    if (n.includes('yeti') || n.includes('frost giant') || n.includes('borealia')) return 'yeti_maiden';
    if (n.includes('wyrm')) return 'dragon_wyrm';
    if (n.includes('siren') || n.includes('harpy') || n.includes('demon') || n.includes('archdemon') || n.includes('lilith')) return 'siren_demoness';
    if (n.includes('kraken')) return 'kraken_maiden';
    if (n.includes('sphinx') || n.includes('pharaoh')) return 'sphinx_queen';
    if (n.includes('ent') || n.includes('treant') || n.includes('dryad') || n.includes('nymph') || n.includes('flora')) return 'dryad_nymph';
    if (n.includes('spider') || n.includes('arachnid') || n.includes('weaver') || n.includes('scorpion') || n.includes('arachne') || n.includes('scorpia')) return 'arachne_weaver';
    if (n.includes('bat') || n.includes('vampire') || n.includes('gargoyle')) return 'vampire_countess';
    if (n.includes('ghost') || n.includes('wraith') || n.includes('phantom') || n.includes('specter')) return 'ghost_maiden';
    if (n.includes('tengu') || n.includes('kitsune') || n.includes('chiyo') || n.includes('ayame') || n.includes('sakura') || n.includes('shrine')) return 'sakura_kitsune';
    if (n.includes('dragon') || n.includes('boss') || n.includes('overlord') || n.includes('ignis')) return 'dragon_princess_ignis';
    return 'goblin_girl';
  }

  private makeCanvas(w = 140, h = 140): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // =========================================================================
  // PUBLIC ENTRY POINT: Get Cached or Rendered Custom 2.5D Isometric Monster Girl
  // =========================================================================
  public getMonsterSprite(
    monsterName: string,
    dir: IsoDirection = 'SW',
    animState: CharacterAnimState = 'idle',
    frame: number = 0
  ): HTMLCanvasElement {
    this.currentDir = dir;
    this.isBack = dir === 'N' || dir === 'NE' || dir === 'NW';
    const normAnim: 'idle' | 'attack' | 'strike' | 'magic' | 'hurt' =
      animState === 'strike'
        ? 'strike'
        : animState === 'magic'
        ? 'magic'
        : animState === 'attack'
        ? 'attack'
        : animState === 'hurt'
        ? 'hurt'
        : 'idle';
    const f = frame % 8;
    const cacheKey = `custom_iso_mobfem_${monsterName.toLowerCase()}_${dir}_${normAnim}_${f}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(140, 140);
    const mName = monsterName.toLowerCase();
    const vec = ISO_DIR_VECTORS[dir] || ISO_DIR_VECTORS['SW'];

    // Animation offsets and dynamic physics
    let bob = Math.sin((f / 8) * Math.PI * 2) * 2.2;
    let lungeX = 0;
    let lungeY = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;
    let tilt = 0;

    if (normAnim === 'attack') {
      const lunges = [0, 8, 22, 28, 16, 6, 2, 0];
      const l = lunges[f];
      lungeX = l * vec.x;
      lungeY = l * vec.y;
      bob = -2;
      if (f === 2 || f === 3) {
        scaleX = 1.08;
        scaleY = 0.94;
        tilt = (vec.x >= 0 ? 1 : -1) * 0.08;
      }
    } else if (normAnim === 'strike') {
      const leaps = [2, -12, -26, -30, -14, 0, 0, 0];
      lungeY = leaps[f];
      lungeX = (f >= 1 && f <= 4 ? vec.x * 10 : 0);
      if (f === 0) { scaleX = 1.1; scaleY = 0.9; }
      else if (f >= 1 && f <= 4) { scaleX = 0.92; scaleY = 1.1; }
      else if (f === 5) { scaleX = 1.18; scaleY = 0.85; }
    } else if (normAnim === 'magic') {
      bob = -6 + Math.sin(f * 0.8) * 3;
      scaleY = 1.03;
    } else if (normAnim === 'hurt') {
      lungeX = -vec.x * 12;
      lungeY = -vec.y * 12;
      bob = -5;
    }

    const cx = 70 + lungeX;
    const cy = 70 + lungeY + bob;

    const isFacingEast = dir === 'SE' || dir === 'E' || dir === 'NE';

    // Route to fresh 8-directional animated Monster Model referencing spellblade model
    const archKey = this.getMonsterArchetypeKey(mName);
    let mobImg: HTMLImageElement | undefined;

    if (normAnim === 'attack' || normAnim === 'strike' || normAnim === 'magic') {
      const atkF = f % 4;
      mobImg = this.monsterImageStore.get(`${archKey}_attack_${dir}_${atkF}`);
      if (!mobImg || !mobImg.complete || mobImg.naturalWidth === 0) {
        mobImg = this.monsterImageStore.get(`${archKey}_idle_${dir}`);
      }
    } else {
      mobImg = this.monsterImageStore.get(`${archKey}_idle_${dir}`);
    }

    if (!mobImg || !mobImg.complete || mobImg.naturalWidth === 0) {
      mobImg = this.monsterImageStore.get(archKey);
    }

    if (mobImg && mobImg.complete && mobImg.naturalWidth > 0) {
      // 1. Dynamic 2.5D ground shadow
      this.drawIsoShadow(ctx, cx, cy + 38, 28, 12, 0.45);

      // 2. Render Monster Model with Directional Transform
      ctx.save();
      ctx.translate(cx, cy);
      if (tilt !== 0) ctx.rotate(tilt);
      ctx.scale(scaleX, scaleY);

      // Render 8-directional pixel sprite scaled up crisp to 100x100
      const drawSize = 100;
      ctx.drawImage(mobImg, -drawSize / 2, -drawSize / 2 - 8, drawSize, drawSize);
      ctx.restore();

      // 3. Render 8-Directional Archetype-Specific Combat Attack Animation & VFX
      if (normAnim === 'attack' || normAnim === 'strike' || normAnim === 'magic') {
        this.renderMonsterCombatVFX(ctx, cx, cy, archKey, dir, f, normAnim, this.isBack);
      }
    } else {
      if (isFacingEast) {
        ctx.save();
        ctx.translate(70, 0);
        ctx.scale(-1, 1);
        ctx.translate(-70, 0);
      }

      if (mName.includes('slime') || mName.includes('ooze') || mName.includes('jelly')) {
        let element: 'flame' | 'ice' | 'sun' | 'blossom' | 'gold' = 'flame';
        if (mName.includes('frost') || mName.includes('ice') || mName.includes('blue')) element = 'ice';
        else if (mName.includes('sun') || mName.includes('volt') || mName.includes('yellow')) element = 'sun';
        else if (mName.includes('blossom') || mName.includes('plant') || mName.includes('leaf') || mName.includes('green') || mName.includes('aurelia')) element = 'blossom';
        else if (mName.includes('gold') || mName.includes('king') || mName.includes('queen')) element = 'gold';

        this.renderSlimeGirl(ctx, cx, cy, element, f, animState);
      } else if (mName.includes('skeleton') || mName.includes('undead') || mName.includes('bone') || mName.includes('mummy')) {
        this.renderSkeletalMaid(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('knight') || mName.includes('commander') || mName.includes('paladin') || mName.includes('valkyrie') || (mName.includes('captain') && !mName.includes('pirate'))) {
        this.renderDarkKnightress(ctx, cx, cy, f, animState);
      } else if (mName.includes('marauder') || mName.includes('bandit') || mName.includes('raider') || mName.includes('pirate') || mName.includes('thief')) {
        this.renderBanditPirateLass(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('panther') || mName.includes('wolf') || mName.includes('hound') || mName.includes('chimera') || mName.includes('beast') || mName.includes('fenra') || mName.includes('kaelia')) {
        this.renderBeastMaiden(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('colossus') || mName.includes('golem') || mName.includes('automaton') || mName.includes('dreadnought') || mName.includes('behemoth') || mName.includes('clockwork')) {
        this.renderClockworkOrGolemMaid(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('yeti') || mName.includes('frost giant') || mName.includes('borealia')) {
        this.renderYetiMaiden(ctx, cx, cy, f, animState);
      } else if (mName.includes('wyrm')) {
        this.renderDragonWyrmGirl(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('siren') || mName.includes('harpy') || mName.includes('demon') || mName.includes('archdemon') || mName.includes('lilith')) {
        this.renderSirenDemoness(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('kraken')) {
        this.renderKrakenMaiden(ctx, cx, cy, f, animState);
      } else if (mName.includes('sphinx')) {
        this.renderSphinxQueen(ctx, cx, cy, f, animState);
      } else if (mName.includes('ent') || mName.includes('treant') || mName.includes('dryad') || mName.includes('nymph') || mName.includes('flora')) {
        this.renderDryadNymph(ctx, cx, cy, f, animState);
      } else if (mName.includes('spider') || mName.includes('arachnid') || mName.includes('weaver') || mName.includes('scorpion') || mName.includes('arachne') || mName.includes('scorpia')) {
        this.renderArachneWeaver(ctx, cx, cy, f, animState);
      } else if (mName.includes('bat') || mName.includes('vampire') || mName.includes('gargoyle')) {
        this.renderVampireCountess(ctx, cx, cy, f, animState);
      } else if (mName.includes('ghost') || mName.includes('wraith') || mName.includes('phantom') || mName.includes('specter')) {
        this.renderGhostMaiden(ctx, cx, cy, f, animState);
      } else if (mName.includes('tengu') || mName.includes('kitsune') || mName.includes('chiyo') || mName.includes('ayame') || mName.includes('sakura') || mName.includes('shrine')) {
        this.renderSakuraShrineMaiden(ctx, cx, cy, f, animState, mName);
      } else if (mName.includes('dragon') || mName.includes('boss') || mName.includes('overlord') || mName.includes('ignis')) {
        this.renderDragonPrincessIgnis(ctx, cx, cy, f, animState);
      } else {
        this.renderGoblinGirl(ctx, cx, cy, f, animState);
      }

      if (isFacingEast) {
        ctx.restore();
      }

      if (normAnim === 'attack' || normAnim === 'strike' || normAnim === 'magic') {
        this.renderMonsterCombatVFX(ctx, cx, cy, archKey, dir, f, normAnim, this.isBack);
      }
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  // =========================================================================
  // 8-DIRECTIONAL ARCHETYPE-SPECIFIC COMBAT ATTACK ANIMATIONS (18 ARCHETYPES)
  // =========================================================================
  private renderMonsterCombatVFX(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    archKey: string,
    dir: IsoDirection,
    f: number,
    animState: 'attack' | 'strike' | 'magic',
    isBack: boolean
  ) {
    const vec = ISO_DIR_VECTORS[dir] || ISO_DIR_VECTORS['SW'];
    const atkAngle = Math.atan2(vec.y * 1.6, vec.x);
    const ox = cx + vec.x * 22;
    const oy = cy + vec.y * 22 - 6;

    ctx.save();

    switch (archKey) {
      case 'dark_knightress': {
        // Demonic Abyssal Greatsword 8-directional sweeping crescent blade & dark miasma
        if (f >= 1 && f <= 5) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(cx + vec.x * 12, cy + vec.y * 12 - 8, 34, atkAngle - Math.PI * 0.6, atkAngle + Math.PI * 0.6);
          ctx.stroke();

          // Searing white core
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx + vec.x * 12, cy + vec.y * 12 - 8, 33, atkAngle - Math.PI * 0.5, atkAngle + Math.PI * 0.5);
          ctx.stroke();

          // Demonic void motes
          ctx.fillStyle = '#dc2626';
          for (let i = 0; i < 4; i++) {
            const sparkDist = 20 + i * 8;
            const sparkAngle = atkAngle + (i - 1.5) * 0.35;
            ctx.fillRect(ox + Math.cos(sparkAngle) * sparkDist, oy + Math.sin(sparkAngle) * sparkDist, 3, 3);
          }
        }
        break;
      }

      case 'dragon_princess_ignis': {
        // Blazing Dragon Claws & Infernal Flame Cleave
        if (f >= 1 && f <= 5) {
          const offsets = [-0.25, 0, 0.25];
          const colors = ['#ea580c', '#f59e0b', '#fef08a'];
          offsets.forEach((off, idx) => {
            ctx.strokeStyle = colors[idx];
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(ox, oy, 28 + idx * 5, atkAngle - 0.7 + off, atkAngle + 0.7 + off);
            ctx.stroke();
          });

          ctx.fillStyle = '#fde047';
          for (let i = 0; i < 5; i++) {
            const dist = 24 + i * 6;
            const a = atkAngle + (Math.sin(f + i) * 0.4);
            ctx.fillRect(ox + Math.cos(a) * dist, oy + Math.sin(a) * dist, 3, 3);
          }
        }
        break;
      }

      case 'slime_princess': {
        // Acidic Gel Whip-Blade & Popping Hydro Bubble Barrage
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(ox, oy, 26, atkAngle - 0.8, atkAngle + 0.8);
          ctx.stroke();

          ctx.strokeStyle = '#a7f3d0';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) {
            const bDist = 18 + i * 7;
            const bAngle = atkAngle + (i - 1.5) * 0.3;
            ctx.beginPath();
            ctx.arc(ox + Math.cos(bAngle) * bDist, oy + Math.sin(bAngle) * bDist, 4 + (i % 2) * 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }

      case 'goblin_girl': {
        // Dual Poison Daggers Flurry (X-Cross Slits)
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          const perpAngle = atkAngle + Math.PI * 0.5;

          ctx.beginPath();
          ctx.moveTo(ox - Math.cos(perpAngle) * 16 - Math.cos(atkAngle) * 8, oy - Math.sin(perpAngle) * 16 - Math.sin(atkAngle) * 8);
          ctx.lineTo(ox + Math.cos(perpAngle) * 16 + Math.cos(atkAngle) * 16, oy + Math.sin(perpAngle) * 16 + Math.sin(atkAngle) * 16);
          ctx.stroke();

          ctx.strokeStyle = '#84cc16';
          ctx.beginPath();
          ctx.moveTo(ox + Math.cos(perpAngle) * 16 - Math.cos(atkAngle) * 8, oy + Math.sin(perpAngle) * 16 - Math.sin(atkAngle) * 8);
          ctx.lineTo(ox - Math.cos(perpAngle) * 16 + Math.cos(atkAngle) * 16, oy - Math.sin(perpAngle) * 16 + Math.sin(atkAngle) * 16);
          ctx.stroke();

          ctx.fillStyle = '#d9f99d';
          ctx.fillRect(ox + Math.cos(atkAngle) * 24, oy + Math.sin(atkAngle) * 24, 3, 3);
          ctx.fillRect(ox + Math.cos(atkAngle) * 18 + 5, oy + Math.sin(atkAngle) * 18 - 5, 2, 2);
        }
        break;
      }

      case 'beast_maiden': {
        // Feral Crimson Triple-Claw Rake
        if (f >= 1 && f <= 5) {
          const perpAngle = atkAngle + Math.PI * 0.5;
          for (let i = -1; i <= 1; i++) {
            const shiftX = Math.cos(perpAngle) * i * 7;
            const shiftY = Math.sin(perpAngle) * i * 7;
            ctx.strokeStyle = i === 0 ? '#ffffff' : '#f43f5e';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(ox + shiftX, oy + shiftY, 24, atkAngle - 0.6, atkAngle + 0.6);
            ctx.stroke();
          }
        }
        break;
      }

      case 'sakura_kitsune': {
        // Nine-Tails Fox-Fire Spirit Wisps & Sakura Fan Storm
        if (f >= 1 && f <= 5) {
          for (let i = 0; i < 3; i++) {
            const orbAngle = atkAngle + ((i * Math.PI * 2) / 3) + f * 0.6;
            const orbDist = 18 + (f * 4);
            const px = ox + Math.cos(orbAngle) * orbDist;
            const py = oy + Math.sin(orbAngle) * orbDist;
            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#f472b6';
          for (let p = 0; p < 4; p++) {
            const pDist = 15 + p * 8;
            ctx.fillRect(ox + Math.cos(atkAngle) * pDist + Math.sin(f + p) * 4, oy + Math.sin(atkAngle) * pDist, 3, 2);
          }
        }
        break;
      }

      case 'skeletal_maid': {
        // Cursed Bone Greatscythe Reaping Sweep
        if (f >= 1 && f <= 5) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(ox, oy, 32, atkAngle - Math.PI * 0.7, atkAngle + Math.PI * 0.7);
          ctx.stroke();

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ox, oy, 30, atkAngle - Math.PI * 0.6, atkAngle + Math.PI * 0.6);
          ctx.stroke();

          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.arc(ox + Math.cos(atkAngle) * 36, oy + Math.sin(atkAngle) * 36, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'yeti_maiden': {
        // Glacial Frost Hammer & Sharp Icicle Spire Eruption
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
          ctx.lineWidth = 2.5;

          const tipX = ox + Math.cos(atkAngle) * 36;
          const tipY = oy + Math.sin(atkAngle) * 36;
          const perp = atkAngle + Math.PI * 0.5;
          const b1X = ox - Math.cos(atkAngle) * 6 + Math.cos(perp) * 12;
          const b1Y = oy - Math.sin(atkAngle) * 6 + Math.sin(perp) * 12;
          const b2X = ox - Math.cos(atkAngle) * 6 - Math.cos(perp) * 12;
          const b2Y = oy - Math.sin(atkAngle) * 6 - Math.sin(perp) * 12;

          ctx.beginPath();
          ctx.moveTo(b1X, b1Y);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(b2X, b2Y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tipX - 2, tipY - 2, 4, 4);
        }
        break;
      }

      case 'siren_demoness': {
        // Supersonic Screech Rings & Shadow Bat Shockwave
        if (f >= 1 && f <= 5) {
          for (let r = 1; r <= 3; r++) {
            const ringDist = r * 11;
            const rx = ox + Math.cos(atkAngle) * ringDist;
            const ry = oy + Math.sin(atkAngle) * ringDist;
            ctx.strokeStyle = r === 1 ? '#8b5cf6' : r === 2 ? '#d946ef' : '#38bdf8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(rx, ry, 8 + r * 5, 4 + r * 3, atkAngle, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }

      case 'clockwork_maid': {
        // Dual Spinning Brass Gear Blades & Steam Jet
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ox + Math.cos(atkAngle) * 20, oy + Math.sin(atkAngle) * 20, 14, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#f59e0b';
          for (let g = 0; g < 6; g++) {
            const ga = (g * Math.PI) / 3 + f * 0.8;
            const gx = ox + Math.cos(atkAngle) * 20 + Math.cos(ga) * 16;
            const gy = oy + Math.sin(atkAngle) * 20 + Math.sin(ga) * 16;
            ctx.fillRect(gx - 1.5, gy - 1.5, 3, 3);
          }

          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(cx - vec.x * 12, cy - vec.y * 12, 8 + f * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'bandit_pirate': {
        // Cutlass Cleave & Flintlock Muzzle Flash
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ox, oy, 26, atkAngle - 0.7, atkAngle + 0.7);
          ctx.stroke();

          const flashX = ox + Math.cos(atkAngle) * 26;
          const flashY = oy + Math.sin(atkAngle) * 26;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(flashX - 2, flashY - 7, 4, 14);
          ctx.fillRect(flashX - 7, flashY - 2, 14, 4);
        }
        break;
      }

      case 'dragon_wyrm': {
        // Draconic Fireball Breath & Tail Cleave
        if (f >= 1 && f <= 5) {
          const tipX1 = ox + Math.cos(atkAngle - 0.35) * 36;
          const tipY1 = oy + Math.sin(atkAngle - 0.35) * 36;
          const tipX2 = ox + Math.cos(atkAngle + 0.35) * 36;
          const tipY2 = oy + Math.sin(atkAngle + 0.35) * 36;

          ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(tipX1, tipY1);
          ctx.lineTo(tipX2, tipY2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#fde047';
          ctx.fillRect((tipX1 + tipX2) / 2 - 3, (tipY1 + tipY2) / 2 - 3, 6, 6);
        }
        break;
      }

      case 'kraken_maiden': {
        // Abyssal Tentacle Slam & Ocean Geyser
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ox - vec.x * 10, oy - vec.y * 10);
          ctx.quadraticCurveTo(ox + Math.cos(atkAngle + 0.4) * 24, oy + Math.sin(atkAngle + 0.4) * 24, ox + Math.cos(atkAngle) * 36, oy + Math.sin(atkAngle) * 36);
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          for (let w = 0; w < 4; w++) {
            ctx.beginPath();
            ctx.arc(ox + Math.cos(atkAngle + (w - 1.5) * 0.4) * 32, oy + Math.sin(atkAngle + (w - 1.5) * 0.4) * 32, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'sphinx_queen': {
        // Pharaoh Golden Solar Ray Beam
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(atkAngle) * 44, oy + Math.sin(atkAngle) * 44);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(atkAngle) * 44, oy + Math.sin(atkAngle) * 44);
          ctx.stroke();

          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(ox + Math.cos(atkAngle) * 44, oy + Math.sin(atkAngle) * 44, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'dryad_nymph': {
        // Thorny Briar Vine Whip
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ox - vec.x * 6, oy - vec.y * 6);
          ctx.quadraticCurveTo(ox + Math.sin(f * 2) * 12, oy + Math.cos(f * 2) * 12, ox + Math.cos(atkAngle) * 36, oy + Math.sin(atkAngle) * 36);
          ctx.stroke();

          ctx.fillStyle = '#f43f5e';
          for (let p = 0; p < 3; p++) {
            ctx.fillRect(ox + Math.cos(atkAngle) * (14 + p * 9), oy + Math.sin(atkAngle) * (14 + p * 9) + (p % 2 === 0 ? 4 : -4), 3, 3);
          }
        }
        break;
      }

      case 'arachne_weaver': {
        // Venomous Chitin Spear Stabs & Glowing Web Net
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#9333ea';
          ctx.lineWidth = 3;
          for (let s = -1; s <= 1; s += 2) {
            const perp = atkAngle + Math.PI * 0.5;
            ctx.beginPath();
            ctx.moveTo(ox + Math.cos(perp) * s * 10, oy + Math.sin(perp) * s * 10);
            ctx.lineTo(ox + Math.cos(atkAngle) * 36 + Math.cos(perp) * s * 4, oy + Math.sin(atkAngle) * 36 + Math.sin(perp) * s * 4);
            ctx.stroke();
          }

          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ox + Math.cos(atkAngle) * 32, oy + Math.sin(atkAngle) * 32, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case 'vampire_countess': {
        // Blood Rapier Piercing Thrust & Bat Swarm
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(atkAngle) * 42, oy + Math.sin(atkAngle) * 42);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(atkAngle) * 42, oy + Math.sin(atkAngle) * 42);
          ctx.stroke();

          ctx.fillStyle = '#7f1d1d';
          for (let b = 0; b < 3; b++) {
            const bx = ox + Math.cos(atkAngle) * (18 + b * 10) + Math.sin(f + b) * 5;
            const by = oy + Math.sin(atkAngle) * (18 + b * 10);
            ctx.fillRect(bx - 3, by - 1, 6, 3);
          }
        }
        break;
      }

      case 'ghost_maiden': {
        // Spectral Ectoplasmic Soul Wave & Phantom Claws
        if (f >= 1 && f <= 5) {
          ctx.strokeStyle = '#06b6d4';
          ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ox + Math.cos(atkAngle) * 24, oy + Math.sin(atkAngle) * 24, 16, atkAngle - Math.PI * 0.5, atkAngle + Math.PI * 0.5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ox + Math.cos(atkAngle) * 32, oy + Math.sin(atkAngle) * 32, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // HELPER: 2.5D ISOMETRIC SHADOW
  // =========================================================================
  private drawIsoShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.55) {
    ctx.save();
    ctx.fillStyle = `rgba(2, 6, 23, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Helper to draw delicate feminine anime facial features for monster girls
   */
  private drawMonsterGirlFace(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    skinColor: string,
    eyeColor: string,
    hasFangs = false,
    hairColor = '#a855f7'
  ) {
    if (this.isBack) {
      this.drawMonsterGirlBackHead(ctx, cx, cy, skinColor, hairColor);
      return;
    }

    // 1. Soft Contoured Anime Jawline & Petite Chin
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 6);
    ctx.lineTo(cx + 7, cy - 6);
    ctx.quadraticCurveTo(cx + 7, cy + 3.5, cx + 1, cy + 7.5);
    ctx.quadraticCurveTo(cx - 5, cy + 3.5, cx - 7, cy - 6);
    ctx.closePath();
    ctx.fill();

    // Subtle jawline ambient shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 4);
    ctx.lineTo(cx + 5, cy + 4);
    ctx.lineTo(cx, cy + 7.5);
    ctx.closePath();
    ctx.fill();

    // 2. Big Expressive Anime Eyes with Lashes & Catchlights
    const leftEyeX = cx - 3;
    const rightEyeX = cx + 3;
    const eyeY = cy - 0.8;

    // Dark top eyelashes & outer wing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(leftEyeX - 1.8, eyeY - 2.2, 3.8, 1.3);
    ctx.fillRect(rightEyeX - 1, eyeY - 2.2, 3.8, 1.3);
    ctx.fillRect(leftEyeX - 2.2, eyeY - 1.5, 1, 1);
    ctx.fillRect(rightEyeX + 2.5, eyeY - 1.5, 1, 1);

    // Vibrant Iris
    ctx.fillStyle = eyeColor;
    ctx.fillRect(leftEyeX - 1.2, eyeY - 1, 2.7, 3);
    ctx.fillRect(rightEyeX - 0.5, eyeY - 1, 2.7, 3);

    // Deep pupil center
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(leftEyeX - 0.5, eyeY, 1.3, 1.6);
    ctx.fillRect(rightEyeX + 0.2, eyeY, 1.3, 1.6);

    // Double crisp catchlight sparkles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftEyeX - 1, eyeY - 1, 1, 1);
    ctx.fillRect(leftEyeX + 0.4, eyeY + 1, 0.7, 0.7);
    ctx.fillRect(rightEyeX - 0.3, eyeY - 1, 1, 1);
    ctx.fillRect(rightEyeX + 1.1, eyeY + 1, 0.7, 0.7);

    // 3. Cute Maiden Cheek Blush (Soft pink stickers)
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(leftEyeX - 2.8, eyeY + 2.5, 2.2, 1);
    ctx.fillRect(rightEyeX + 1.2, eyeY + 2.5, 2.2, 1);

    // 4. Petite Nose dot
    ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
    ctx.fillRect(cx, cy + 2.2, 1, 0.8);

    // 5. Cute Smile or Fangs
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(cx - 0.5, cy + 4.5, 2, 0.8);

    if (hasFangs) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 0.8, cy + 4.2, 1, 1.4);
    }

    // 6. Front Framing Locks & Bangs on forehead
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 6);
    ctx.lineTo(cx + 6, cy - 6);
    ctx.lineTo(cx + 3, cy - 2);
    ctx.lineTo(cx, cy - 3.5);
    ctx.lineTo(cx - 4, cy - 2);
    ctx.closePath();
    ctx.fill();

    // Side locks
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 5);
    ctx.lineTo(cx - 8, cy + 5);
    ctx.lineTo(cx - 5, cy + 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 5);
    ctx.lineTo(cx + 8, cy + 5);
    ctx.lineTo(cx + 5, cy + 2);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Helper to draw delicate feminine back of head & hair when facing backwards (N, NE, NW)
   * Guaranteed ZERO front facial features (no eyes, no mouth, no blush!)
   */
  private drawMonsterGirlBackHead(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    skinColor: string,
    hairColor = '#a855f7'
  ) {
    // 1. Back of slender neck / nape (graceful skin connecting cranium to shoulders)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(cx - 3.5, cy + 1);
    ctx.lineTo(cx + 3.5, cy + 1);
    ctx.lineTo(cx + 4.2, cy + 8);
    ctx.lineTo(cx - 4.2, cy + 8);
    ctx.closePath();
    ctx.fill();

    // Soft nape shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(cx - 3, cy + 3.5, 6, 2.5);

    // 2. Full voluminous cranium covered completely with hair
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx, cy - 1.2, 7.8, 0, Math.PI * 2);
    ctx.fill();

    // Curved lower hairline at the nape
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 2);
    ctx.quadraticCurveTo(cx - 7.5, cy + 5, cx - 2, cy + 6.8);
    ctx.quadraticCurveTo(cx, cy + 5.8, cx + 2, cy + 6.8);
    ctx.quadraticCurveTo(cx + 7.5, cy + 5, cx + 7, cy - 2);
    ctx.closePath();
    ctx.fill();

    // Back hair locks falling down over the nape and spine
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 3);
    ctx.lineTo(cx + 5, cy + 3);
    ctx.lineTo(cx + 4, cy + 12);
    ctx.lineTo(cx - 4, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Hair luster / sheen highlight arc across the upper crown
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 5.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  /**
   * Universal Helper to draw long flowing feminine hair for monster girls (Drawn BEHIND body!)
   */
  private drawMonsterFeminineHair(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    hairColor: string,
    hairShadow: string,
    hairHighlight: string,
    frame: number,
    style: 'long' | 'wavy' | 'twintails' | 'wild' = 'long'
  ) {
    const headY = cy - 14;
    const hairSway = Math.sin((frame / 6) * Math.PI * 2) * 2.8;

    if (style === 'twintails') {
      // Twin high-ponytails cascading down each side past the hips
      // Left Ponytail
      ctx.fillStyle = hairShadow;
      ctx.beginPath();
      ctx.moveTo(cx - 7, headY);
      ctx.quadraticCurveTo(cx - 16 + hairSway, headY + 10, cx - 14 + hairSway * 1.3, cy + 22);
      ctx.lineTo(cx - 7 + hairSway * 1.3, cy + 22);
      ctx.quadraticCurveTo(cx - 9 + hairSway, headY + 12, cx - 4, headY + 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY);
      ctx.quadraticCurveTo(cx - 14 + hairSway, headY + 8, cx - 12 + hairSway * 1.2, cy + 20);
      ctx.lineTo(cx - 8 + hairSway * 1.2, cy + 20);
      ctx.quadraticCurveTo(cx - 9 + hairSway, headY + 10, cx - 4, headY + 2);
      ctx.closePath();
      ctx.fill();

      // Right Ponytail
      ctx.fillStyle = hairShadow;
      ctx.beginPath();
      ctx.moveTo(cx + 4, headY + 2);
      ctx.quadraticCurveTo(cx + 9 - hairSway, headY + 12, cx + 7 - hairSway * 1.3, cy + 22);
      ctx.lineTo(cx + 14 - hairSway * 1.3, cy + 22);
      ctx.quadraticCurveTo(cx + 16 - hairSway, headY + 10, cx + 7, headY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(cx + 4, headY + 2);
      ctx.quadraticCurveTo(cx + 9 - hairSway, headY + 10, cx + 8 - hairSway * 1.2, cy + 20);
      ctx.lineTo(cx + 12 - hairSway * 1.2, cy + 20);
      ctx.quadraticCurveTo(cx + 14 - hairSway, headY + 8, cx + 6, headY);
      ctx.closePath();
      ctx.fill();

      // Ponytail hair ties / scrunchies
      ctx.fillStyle = hairHighlight;
      ctx.beginPath();
      ctx.arc(cx - 9, headY + 2, 3, 0, Math.PI * 2);
      ctx.arc(cx + 9, headY + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'wild') {
      // Voluminous, spiky, wild cascading locks
      ctx.fillStyle = hairShadow;
      ctx.beginPath();
      ctx.moveTo(cx - 9, headY);
      ctx.quadraticCurveTo(cx - 18 + hairSway, headY + 10, cx - 15 + hairSway * 1.4, cy + 22);
      ctx.lineTo(cx - 10 + hairSway * 1.4, cy + 24);
      ctx.lineTo(cx - 6 + hairSway * 1.2, cy + 20);
      ctx.lineTo(cx + 2 + hairSway * 1.2, cy + 23);
      ctx.lineTo(cx + 8 + hairSway * 1.2, cy + 19);
      ctx.lineTo(cx + 14 - hairSway * 1.4, cy + 23);
      ctx.quadraticCurveTo(cx + 18 - hairSway, headY + 10, cx + 9, headY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(cx - 7, headY + 2);
      ctx.quadraticCurveTo(cx - 14 + hairSway, headY + 9, cx - 11 + hairSway * 1.2, cy + 19);
      ctx.lineTo(cx + 11 - hairSway * 1.2, cy + 19);
      ctx.quadraticCurveTo(cx + 14 - hairSway, headY + 9, cx + 7, headY + 2);
      ctx.closePath();
      ctx.fill();

      // Flare highlights
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 4, headY);
      ctx.quadraticCurveTo(cx - 9 + hairSway, headY + 9, cx - 7 + hairSway * 1.2, cy + 17);
      ctx.stroke();
    } else {
      // 'long' or 'wavy': Luscious feminine hair curtain cascading down past waist to hips
      const waveWidth = style === 'wavy' ? 14 : 11;
      ctx.fillStyle = hairShadow;
      ctx.beginPath();
      ctx.moveTo(cx - 7, headY + 2);
      ctx.quadraticCurveTo(cx - waveWidth - 2 + hairSway, headY + 11, cx - waveWidth + hairSway * 1.3, cy + 21);
      ctx.lineTo(cx + waveWidth - 2 + hairSway * 1.3, cy + 21);
      ctx.quadraticCurveTo(cx + waveWidth + 2 + hairSway, headY + 11, cx + 7, headY + 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY + 2);
      ctx.quadraticCurveTo(cx - waveWidth + 2 + hairSway, headY + 10, cx - waveWidth + 4 + hairSway * 1.2, cy + 19);
      ctx.lineTo(cx + waveWidth - 4 + hairSway * 1.2, cy + 19);
      ctx.quadraticCurveTo(cx + waveWidth - 2 + hairSway, headY + 10, cx + 6, headY + 2);
      ctx.closePath();
      ctx.fill();

      // Shimmering highlights
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx - 3, headY);
      ctx.quadraticCurveTo(cx - 8 + hairSway, headY + 10, cx - 6 + hairSway * 1.3, cy + 16);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 2, headY + 1);
      ctx.quadraticCurveTo(cx + 6 + hairSway, headY + 10, cx + 5 + hairSway * 1.3, cy + 15);
      ctx.stroke();
    }
  }

  /**
   * Helper to draw slender feminine legs and boots for monster girls
   */
  private drawFeminineMonsterLegs(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    skinColor = '#ffedd5',
    bootColor = '#1e1b4b',
    bootTrim = '#facc15'
  ) {
    if (this.isBack) {
      this.drawFeminineMonsterLegsBack(ctx, cx, cy, skinColor, bootColor, bootTrim);
      return;
    }

    // Thighs
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 5.5, cy + 12, 4.2, 8);
    ctx.fillRect(cx + 1.3, cy + 12, 4.2, 8);

    // Fitted boots / greaves
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5.5, cy + 18);
    ctx.lineTo(cx - 1.5, cy + 18);
    ctx.lineTo(cx - 1.0, cy + 32);
    ctx.lineTo(cx + 1.0, cy + 34); // toe
    ctx.lineTo(cx - 6.0, cy + 34); // heel
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 1.5, cy + 18);
    ctx.lineTo(cx + 5.5, cy + 18);
    ctx.lineTo(cx + 6.0, cy + 32);
    ctx.lineTo(cx + 8.0, cy + 34); // toe
    ctx.lineTo(cx + 1.0, cy + 34); // heel
    ctx.closePath();
    ctx.fill();

    // Boot trim
    ctx.fillStyle = bootTrim;
    ctx.fillRect(cx - 5.5, cy + 18, 4, 1.5);
    ctx.fillRect(cx + 1.5, cy + 18, 4, 1.5);
  }

  /**
   * Helper to draw slender feminine legs and boots from behind
   */
  private drawFeminineMonsterLegsBack(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    skinColor = '#ffedd5',
    bootColor = '#1e1b4b',
    bootTrim = '#facc15'
  ) {
    // Back of Thighs with subtle inner shadow
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 5.5, cy + 12, 4.2, 8);
    ctx.fillRect(cx + 1.3, cy + 12, 4.2, 8);

    // Inner thigh shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(cx - 1.8, cy + 12, 3.6, 6);

    // Fitted Boots / Greaves (Viewed from Behind: prominent heels & back seam)
    ctx.fillStyle = bootColor;
    // Left leg from behind
    ctx.beginPath();
    ctx.moveTo(cx - 5.5, cy + 18);
    ctx.lineTo(cx - 1.5, cy + 18);
    ctx.lineTo(cx - 1.5, cy + 34);
    ctx.lineTo(cx - 5.5, cy + 34);
    ctx.closePath();
    ctx.fill();

    // Right leg from behind
    ctx.beginPath();
    ctx.moveTo(cx + 1.5, cy + 18);
    ctx.lineTo(cx + 5.5, cy + 18);
    ctx.lineTo(cx + 5.5, cy + 34);
    ctx.lineTo(cx + 1.5, cy + 34);
    ctx.closePath();
    ctx.fill();

    // Back vertical boot seam
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(cx - 3.8, cy + 19, 1, 14);
    ctx.fillRect(cx + 3.2, cy + 19, 1, 14);

    // High heel / plate heel block
    ctx.fillStyle = bootTrim;
    ctx.fillRect(cx - 5.5, cy + 32, 2.5, 2.5);
    ctx.fillRect(cx + 3.0, cy + 32, 2.5, 2.5);

    // Boot top cuffs
    ctx.fillRect(cx - 5.5, cy + 18, 4, 1.5);
    ctx.fillRect(cx + 1.5, cy + 18, 4, 1.5);
  }

  /**
   * Helper to draw voluptuous feminine hourglass curves for monster girls
   */
  private drawMonsterHourglassBody(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    colors: {
      base: string;
      highlight: string;
      shadow: string;
      trim?: string;
      exposedMidriff?: boolean;
      skinTone?: string;
      skinShadow?: string;
    }
  ) {
    if (this.isBack) {
      this.drawMonsterHourglassBodyBack(ctx, cx, cy, colors);
      return;
    }

    // Torso silhouette (Bust -> narrow waist -> wider hips)
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 8);
    ctx.lineTo(cx + 7, cy - 8);
    ctx.quadraticCurveTo(cx + 9, cy - 2, cx + 4.5, cy + 3); // narrow waist
    ctx.quadraticCurveTo(cx + 8, cy + 9, cx + 8, cy + 13); // wide hips
    ctx.lineTo(cx - 8, cy + 13);
    ctx.quadraticCurveTo(cx - 8, cy + 9, cx - 4.5, cy + 3);
    ctx.quadraticCurveTo(cx - 9, cy - 2, cx - 7, cy - 8);
    ctx.closePath();
    ctx.fill();

    // Body front tone
    ctx.fillStyle = colors.base;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 7);
    ctx.lineTo(cx + 6, cy - 7);
    ctx.quadraticCurveTo(cx + 7.5, cy - 2, cx + 3.8, cy + 3);
    ctx.quadraticCurveTo(cx + 7, cy + 9, cx + 7, cy + 12);
    ctx.lineTo(cx - 7, cy + 12);
    ctx.quadraticCurveTo(cx - 7, cy + 9, cx - 3.8, cy + 3);
    ctx.quadraticCurveTo(cx - 7.5, cy - 2, cx - 6, cy - 7);
    ctx.closePath();
    ctx.fill();

    // Volumetric bustline
    ctx.fillStyle = colors.highlight;
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 2.5, 3.5, 2.8, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 2.5, 3.5, 2.8, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Cleavage shadow
    ctx.fillStyle = colors.shadow;
    ctx.fillRect(cx - 0.5, cy - 4.5, 1, 4.5);

    // Exposed toned midriff with 11-line abs and cute navel
    if (colors.exposedMidriff !== false) {
      const skin = colors.skinTone || '#ffedd5';
      const skinShadow = colors.skinShadow || '#fca5a5';
      ctx.fillStyle = skin;
      ctx.fillRect(cx - 3.5, cy + 1.5, 7, 5.5);
      // Toned vertical abs definition
      ctx.fillStyle = skinShadow;
      ctx.fillRect(cx - 0.5, cy + 2, 1, 4);
      // Navel indentation
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(cx - 0.5, cy + 5, 1, 1);
    }

    if (colors.trim) {
      ctx.fillStyle = colors.trim;
      ctx.fillRect(cx - 5, cy + 6.5, 10, 1.5);
    }
  }

  /**
   * Helper to draw voluptuous feminine hourglass curves from behind (Back of Bikini Armor)
   */
  private drawMonsterHourglassBodyBack(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    colors: {
      base: string;
      highlight: string;
      shadow: string;
      trim?: string;
      exposedMidriff?: boolean;
      skinTone?: string;
      skinShadow?: string;
    }
  ) {
    const skin = colors.skinTone || '#ffedd5';
    const skinShadow = colors.skinShadow || '#fca5a5';

    // 1. Back Torso Silhouette (Shoulders -> tapered waist -> flaring hips)
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 8);
    ctx.lineTo(cx + 7, cy - 8);
    ctx.quadraticCurveTo(cx + 8.5, cy - 2, cx + 4.2, cy + 3); // narrow waist
    ctx.quadraticCurveTo(cx + 7.8, cy + 9, cx + 7.8, cy + 13); // wide hips
    ctx.lineTo(cx - 7.8, cy + 13);
    ctx.quadraticCurveTo(cx - 7.8, cy + 9, cx - 4.2, cy + 3);
    ctx.quadraticCurveTo(cx - 8.5, cy - 2, cx - 7, cy - 8);
    ctx.closePath();
    ctx.fill();

    // 2. Smooth Back Skin Tone (Exposed back between shoulder blades and waist)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 7);
    ctx.lineTo(cx + 6, cy - 7);
    ctx.quadraticCurveTo(cx + 7, cy - 2, cx + 3.6, cy + 3);
    ctx.quadraticCurveTo(cx + 6.8, cy + 8, cx + 6.8, cy + 12);
    ctx.lineTo(cx - 6.8, cy + 12);
    ctx.quadraticCurveTo(cx - 6.8, cy + 8, cx - 3.6, cy + 3);
    ctx.quadraticCurveTo(cx - 7, cy - 2, cx - 6, cy - 7);
    ctx.closePath();
    ctx.fill();

    // 3. Delicate Shoulder Blades (Scapula contours) & Subtle Spine Groove
    ctx.fillStyle = skinShadow;
    // Left shoulder blade
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, cy - 5);
    ctx.lineTo(cx - 2, cy - 4.5);
    ctx.lineTo(cx - 3.5, cy - 1);
    ctx.closePath();
    ctx.fill();
    // Right shoulder blade
    ctx.beginPath();
    ctx.moveTo(cx + 4.5, cy - 5);
    ctx.lineTo(cx + 2, cy - 4.5);
    ctx.lineTo(cx + 3.5, cy - 1);
    ctx.closePath();
    ctx.fill();
    // Vertical spinal groove
    ctx.fillRect(cx - 0.5, cy - 6, 1, 9);

    // 4. Bikini Armor Back Straps & Metal Buckle/Ring
    // Upper horizontal strap crossing under shoulder blades
    ctx.fillStyle = colors.base;
    ctx.fillRect(cx - 6.5, cy - 1.5, 13, 2.2);

    // Golden / metallic central clasp
    ctx.fillStyle = colors.trim || colors.highlight;
    ctx.fillRect(cx - 1.2, cy - 1.8, 2.4, 2.8);

    // Vertical neck-tie straps rising toward nape
    ctx.strokeStyle = colors.base;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 3.5, cy - 7);
    ctx.lineTo(cx - 1.5, cy - 1.5);
    ctx.moveTo(cx + 3.5, cy - 7);
    ctx.lineTo(cx + 1.5, cy - 1.5);
    ctx.stroke();

    // 5. Bikini Bottom Back & Waistline Belt
    ctx.fillStyle = colors.base;
    // Lower back strap / hip band
    ctx.beginPath();
    ctx.moveTo(cx - 6.5, cy + 7);
    ctx.lineTo(cx + 6.5, cy + 7);
    ctx.lineTo(cx + 6, cy + 12.5);
    ctx.lineTo(cx - 6, cy + 12.5);
    ctx.closePath();
    ctx.fill();

    if (colors.trim) {
      ctx.fillStyle = colors.trim;
      ctx.fillRect(cx - 6, cy + 7, 12, 1.3);
    }

    // Cute lower-back arch shadow
    ctx.fillStyle = skinShadow;
    ctx.fillRect(cx - 1.5, cy + 5.5, 3, 1.2);
  }

  // =========================================================================
  // 1. GOBLIN GIRL: RIKKA (สาวน้อยก็อบลินจอมซน)
  // Green skin, long pointed elf ears, messy emerald twintails, leather corset,
  // jagged scimitar, cute fangs
  // =========================================================================
  private renderGoblinGirl(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    const skinTone = '#86efac';
    const skinShadow = '#22c55e';
    const hairColor = '#15803d';

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Emerald Twintails (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, '#14532d', '#4ade80', frame, 'twintails');

    // 2. Slender feminine legs & leather boots
    this.drawFeminineMonsterLegs(ctx, cx, cy, skinTone, '#78350f', '#facc15');

    // 3. Hourglass tribal leather bikini bra & ragged mini skirt
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#78350f',
      highlight: '#b45309',
      shadow: '#451a03',
      trim: '#facc15',
      exposedMidriff: true,
      skinTone,
      skinShadow
    });

    // Ragged hem skirt
    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx - 8, cy + 11, 16, 3.5);

    // Cute Pointed Goblin Ears
    ctx.fillStyle = skinTone;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 12);
    ctx.lineTo(cx - 20, cy - 16);
    ctx.lineTo(cx - 7, cy - 8);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 12);
    ctx.lineTo(cx + 20, cy - 16);
    ctx.lineTo(cx + 7, cy - 8);
    ctx.closePath();
    ctx.fill();

    // Head & Face
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, skinTone, '#f59e0b', true, hairColor);

    // Scimitar in hand
    ctx.save();
    ctx.translate(cx + 14, cy + 4);
    ctx.rotate(0.3);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-1.5, -16, 3, 16);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-3, 0, 6, 2.5);
    ctx.restore();
  }

  // =========================================================================
  // 2. SLIME PRINCESS / SLIME GIRL: AURELIA (เจ้าหญิงสไลม์สาว)
  // Translucent curved gelatinous body, dripping slime dress, glowing core,
  // floating bubbles, cute crown tiara
  // =========================================================================
  private renderSlimeGirl(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    element: 'flame' | 'ice' | 'sun' | 'blossom' | 'gold',
    frame: number,
    _animState: string
  ) {
    let mainColor = 'rgba(34, 197, 94, 0.85)';
    let lightColor = '#86efac';
    let darkColor = '#15803d';
    let eyeColor = '#16a34a';

    if (element === 'flame') {
      mainColor = 'rgba(239, 68, 68, 0.85)';
      lightColor = '#fca5a5';
      darkColor = '#991b1b';
      eyeColor = '#dc2626';
    } else if (element === 'ice') {
      mainColor = 'rgba(56, 189, 248, 0.85)';
      lightColor = '#bae6fd';
      darkColor = '#0369a1';
      eyeColor = '#0284c7';
    } else if (element === 'sun' || element === 'gold') {
      mainColor = 'rgba(234, 179, 8, 0.85)';
      lightColor = '#fef08a';
      darkColor = '#a16207';
      eyeColor = '#ca8a04';
    }

    this.drawIsoShadow(ctx, cx, cy + 34, 20, 9);

    // 1. Translucent Liquid Hair Cascading behind body
    this.drawMonsterFeminineHair(ctx, cx, cy, mainColor, darkColor, lightColor, frame, 'wavy');

    // Gelatinous translucent lower body puddle/skirt with dynamic ripples
    const jiggle = Math.sin((frame / 6) * Math.PI * 2) * 3;
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 18 + jiggle, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 8);
    ctx.quadraticCurveTo(cx - 16 - jiggle, cy + 20, cx - 14, cy + 30);
    ctx.quadraticCurveTo(cx, cy + 35, cx + 14, cy + 30);
    ctx.quadraticCurveTo(cx + 16 + jiggle, cy + 20, cx + 8, cy + 8);
    ctx.closePath();
    ctx.fill();

    // Slime Maiden Voluptuous Gelatinous Bikini Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: mainColor,
      highlight: lightColor,
      shadow: darkColor,
      trim: '#facc15',
      exposedMidriff: true,
      skinTone: lightColor
    });

    // Glowing Mana Core inside chest
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = lightColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Slime Droplet Hair & cute antenna
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, lightColor, eyeColor, false, lightColor);

    // Glossy Highlight on head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 3, headY - 4, 3, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Golden Slime Crown
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - 5, headY - 6);
    ctx.lineTo(cx - 6, headY - 11);
    ctx.lineTo(cx - 2, headY - 8);
    ctx.lineTo(cx, headY - 12);
    ctx.lineTo(cx + 2, headY - 8);
    ctx.lineTo(cx + 6, headY - 11);
    ctx.lineTo(cx + 5, headY - 6);
    ctx.closePath();
    ctx.fill();

    // Floating micro-bubbles orbiting
    for (let i = 0; i < 3; i++) {
      const angle = (frame / 8) * Math.PI * 2 + (i * Math.PI * 2) / 3;
      const bx = cx + Math.cos(angle) * 14;
      const by = cy + Math.sin(angle) * 8;
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // 3. SKELETAL MAID: CHARLOTTE / PHARAOH PRIESTESS (เมดโครงกระดูก / ฟาโรห์สาว)
  // Gothic maid dress with corseted ribcage waist, silver tiara, ice rapier
  // =========================================================================
  private renderSkeletalMaid(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    mName: string
  ) {
    const isPharaoh = mName.includes('mummy') || mName.includes('pharaoh');
    const dressColor = isPharaoh ? '#d97706' : '#1e1b4b';
    const trimColor = isPharaoh ? '#facc15' : '#f8fafc';
    const boneColor = '#e2e8f0';
    const hairColor = isPharaoh ? '#18181b' : '#cbd5e1';
    const hairShadow = isPharaoh ? '#09090b' : '#64748b';
    const hairHighlight = isPharaoh ? '#facc15' : '#ffffff';

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Silky Maid / Priestess Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, hairShadow, hairHighlight, frame, 'long');

    // 2. Slender feminine legs & high-heeled boots
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#f8fafc', dressColor, trimColor);

    // 3. Maid apron & corset bikini torso
    const skirtWave = animState === 'idle' ? Math.sin((frame / 8) * Math.PI * 2) * 1.5 : 0;
    ctx.fillStyle = dressColor;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 8);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.lineTo(cx + 12 + skirtWave, cy + 24);
    ctx.lineTo(cx - 12 + skirtWave, cy + 24);
    ctx.closePath();
    ctx.fill();

    // White ruffled maid apron
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 9);
    ctx.lineTo(cx + 5, cy + 9);
    ctx.lineTo(cx + 7 + skirtWave, cy + 22);
    ctx.lineTo(cx - 7 + skirtWave, cy + 22);
    ctx.closePath();
    ctx.fill();

    // Hourglass corset torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: dressColor,
      highlight: isPharaoh ? '#fbbf24' : '#312e81',
      shadow: '#0f172a',
      trim: trimColor,
      exposedMidriff: true,
      skinTone: '#f8fafc',
      skinShadow: '#cbd5e1'
    });

    // Bone/Rapier weapon
    ctx.save();
    ctx.translate(cx + 14, cy + 4);
    ctx.rotate(0.2);
    ctx.fillStyle = isPharaoh ? '#f59e0b' : '#38bdf8';
    ctx.fillRect(-1, -18, 2, 20);
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pale head & gothic maid headdress
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, boneColor, isPharaoh ? '#eab308' : '#38bdf8', false, hairColor);

    // Gothic lace maid tiara / Pharaoh headdress
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.arc(cx, headY - 4, 7, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 4. DARK KNIGHTRESS / VALKYRIE: MORRIGAN (อัศวินสาวแห่งความมืด)
  // Obsidian horned winged helm, fitted dark armor, tattered royal cape
  // =========================================================================
  private renderDarkKnightress(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Flowing Midnight Violet Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#4c1d95', '#2e1065', '#a855f7', frame, 'wild');

    // Flowing dark cape
    const capeFlutter = Math.sin((frame / 6) * Math.PI * 2) * 3;
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx + 8, cy - 4);
    ctx.lineTo(cx + 13 + capeFlutter, cy + 28);
    ctx.lineTo(cx - 13 + capeFlutter, cy + 28);
    ctx.closePath();
    ctx.fill();

    // 2. Slender armored greaves & heels
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#ffedd5', '#0f172a', '#c084fc');

    // 3. Contoured dark hourglass plate bikini cuirass
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#1e1b4b',
      highlight: '#4338ca',
      shadow: '#0f172a',
      trim: '#c084fc',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Dark broadsword
    ctx.save();
    ctx.translate(cx + 14, cy + 2);
    ctx.rotate(0.35);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-2, -22, 4, 22);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, 0, 8, 3);
    ctx.restore();

    // Head, Winged Horns & Glowing Violet Gaze
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#a855f7', false, '#4c1d95');

    // Winged Knight Visor / Horns
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY - 4);
    ctx.lineTo(cx - 16, headY - 14);
    ctx.lineTo(cx - 6, headY - 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 6, headY - 4);
    ctx.lineTo(cx + 16, headY - 14);
    ctx.lineTo(cx + 6, headY - 8);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // 5. BANDIT / PIRATE LASS: MORGANA (โจรสลัดสาว / จอมโจรทะเลทราย)
  // Corset blouse, buccaneer boots, bicorne/bandana, curved cutlass
  // =========================================================================
  private renderBanditPirateLass(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string,
    mName: string
  ) {
    const isPirate = mName.includes('pirate') || mName.includes('corsair');
    const coatColor = isPirate ? '#1e3a8a' : '#78350f';
    const skinTone = '#fed7aa';
    const hairColor = '#b91c1c';

    this.drawIsoShadow(ctx, cx, cy + 34, 17, 8);

    // 1. Long Wavy Auburn Pirate Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, '#7f1d1d', '#f87171', frame, 'wavy');

    // 2. Slender buccaneer boots
    this.drawFeminineMonsterLegs(ctx, cx, cy, skinTone, '#1e293b', '#ca8a04');

    // 3. Buccaneer leather buckle bikini bra & bare midriff
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#78350f',
      highlight: '#b45309',
      shadow: '#451a03',
      trim: '#ca8a04',
      exposedMidriff: true,
      skinTone
    });

    // Pirate Coat over shoulders
    ctx.fillStyle = coatColor;
    ctx.fillRect(cx - 9, cy - 6, 3, 16);
    ctx.fillRect(cx + 6, cy - 6, 3, 16);

    // Cutlass
    ctx.save();
    ctx.translate(cx + 14, cy + 4);
    ctx.rotate(0.3);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -6, 12, 0, Math.PI * 0.6);
    ctx.stroke();
    ctx.restore();

    // Head, Pirate Hat / Bandana
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, skinTone, '#0ea5e9', false, hairColor);

    // Pirate Bicorne Hat with Skull/Feather
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - 12, headY - 4);
    ctx.lineTo(cx, headY - 12);
    ctx.lineTo(cx + 12, headY - 4);
    ctx.lineTo(cx, headY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 2, headY - 13, 4, 3);
  }

  // =========================================================================
  // 6. BEASTGIRL / WOLFGIRL: FENRA / KAELIA (สาวน้อยหมาป่า / สาวเสือดาว)
  // Fluffy animal ears, wagging tail, athletic curves, clawed gauntlets
  // =========================================================================
  private renderBeastMaiden(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string,
    mName: string
  ) {
    const isPanther = mName.includes('panther');
    const furColor = isPanther ? '#1e293b' : '#78350f';
    const furLight = isPanther ? '#475569' : '#d97706';
    const skinTone = '#ffedd5';
    const hairColor = isPanther ? '#1e293b' : '#d97706';
    const hairShadow = isPanther ? '#0f172a' : '#78350f';
    const hairHighlight = isPanther ? '#475569' : '#fde047';

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Wild Beast Mane / Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, hairShadow, hairHighlight, frame, 'wild');

    // Fluffy tail wagging behind
    const tailWag = Math.sin((frame / 6) * Math.PI * 2) * 5;
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10);
    ctx.quadraticCurveTo(cx - 18, cy + 14, cx - 20 + tailWag, cy + 2);
    ctx.quadraticCurveTo(cx - 14, cy + 6, cx - 4, cy + 12);
    ctx.closePath();
    ctx.fill();

    // 2. Slender athletic legs & soft paw boots
    this.drawFeminineMonsterLegs(ctx, cx, cy, skinTone, furColor, '#facc15');

    // 3. Athletic fur-lined battle bikini
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: furColor,
      highlight: furLight,
      shadow: '#0f172a',
      trim: '#facc15',
      exposedMidriff: true,
      skinTone
    });

    // Fluffy Animal Ears on Head
    const headY = cy - 14;
    ctx.fillStyle = furColor;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(cx - 6, headY - 4);
    ctx.lineTo(cx - 10, headY - 14);
    ctx.lineTo(cx - 2, headY - 6);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(cx + 6, headY - 4);
    ctx.lineTo(cx + 10, headY - 14);
    ctx.lineTo(cx + 2, headY - 6);
    ctx.closePath();
    ctx.fill();

    // Inner ear pink
    if (!this.isBack) {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(cx - 7, headY - 11, 2, 4);
      ctx.fillRect(cx + 5, headY - 11, 2, 4);
    }

    // Face & fangs
    this.drawMonsterGirlFace(ctx, cx, headY, skinTone, isPanther ? '#eab308' : '#38bdf8', true, hairColor);
  }

  // =========================================================================
  // 7. CLOCKWORK AUTOMATON / CRYSTAL GOLEM MAID: NICOLE (หุ่นกลเมดสาว / โกเลมผลึก)
  // Porcelain clockwork maiden with brass gears, key on back, steam exhaust
  // =========================================================================
  private renderClockworkOrGolemMaid(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string,
    mName: string
  ) {
    const isCrystal = mName.includes('crystal') || mName.includes('lithia') || mName.includes('colossus');
    const mainColor = isCrystal ? '#0284c7' : '#d97706';
    const lightColor = isCrystal ? '#38bdf8' : '#facc15';
    const hairColor = isCrystal ? '#06b6d4' : '#fb7185';
    const hairShadow = isCrystal ? '#0891b2' : '#be123c';
    const hairHighlight = isCrystal ? '#67e8f9' : '#fecdd3';

    this.drawIsoShadow(ctx, cx, cy + 34, 19, 8);

    // 1. Long Clockwork Twintails (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, hairShadow, hairHighlight, frame, 'twintails');

    // Winding Key on back spinning
    const keyTurn = (frame / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx - 8, cy - 2);
    ctx.rotate(keyTurn);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1.5, -6, 3, 12);
    ctx.fillRect(-6, -1.5, 12, 3);
    ctx.restore();

    // 2. Porcelain Legs & Brass Joints
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#f8fafc', mainColor, '#facc15');

    // 3. Hourglass Brass Steampunk Bikini Corset
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: mainColor,
      highlight: lightColor,
      shadow: '#78350f',
      trim: '#ffffff',
      exposedMidriff: true,
      skinTone: '#f8fafc',
      skinShadow: '#cbd5e1'
    });

    // Porcelain Face & Headgear
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#f8fafc', lightColor, false, hairColor);

    // Brass bonnet / crystals
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(cx, headY - 4, 6, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 8. YETI MAIDEN: BOREALIA (สาวยักษ์เยติหิมะ)
  // Fluffy white fur trim bikini, horns, icy blue hair, crystalline mace
  // =========================================================================
  private renderYetiMaiden(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 20, 9);

    // 1. Long Wavy Glacier-Blue Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#38bdf8', '#0284c7', '#e0f2fe', frame, 'wavy');

    // 2. Slender feminine boots with snow trim
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#ffedd5', '#0284c7', '#ffffff');

    // 3. Fur trimmed hourglass bikini bra & bare midriff
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#38bdf8',
      highlight: '#e0f2fe',
      shadow: '#0284c7',
      trim: '#ffffff',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Crystalline ice club in hand
    ctx.save();
    ctx.translate(cx + 16, cy + 2);
    ctx.rotate(0.3);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(-3, -20, 6, 22);
    ctx.restore();

    // Head, Ice Blue Hair & Fluffy Horns
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#0284c7', true, '#38bdf8');

    // Cute Ice Horns
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(cx - 8, headY - 10, 3, 7);
    ctx.fillRect(cx + 5, headY - 10, 3, 7);
  }

  // =========================================================================
  // 9. DRAGON WYRM GIRL (สาวมังกรน้อย)
  // Draconic horns, scaled wings, slender scaled tail, flame breath orb
  // =========================================================================
  private renderDragonWyrmGirl(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string,
    mName: string
  ) {
    const isIce = mName.includes('frost') || mName.includes('glacia');
    const scaleColor = isIce ? '#0284c7' : '#dc2626';
    const scaleLight = isIce ? '#38bdf8' : '#f87171';
    const hairColor = isIce ? '#0284c7' : '#ea580c';
    const hairShadow = isIce ? '#0c4a6e' : '#9a3412';
    const hairHighlight = isIce ? '#7dd3fc' : '#fdba74';

    this.drawIsoShadow(ctx, cx, cy + 34, 19, 8);

    // 1. Long Silky Dragon Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, hairShadow, hairHighlight, frame, 'long');

    // Scaled Tail waving
    const tailWave = Math.sin((frame / 6) * Math.PI * 2) * 5;
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10);
    ctx.quadraticCurveTo(cx - 20, cy + 14, cx - 22 + tailWave, cy);
    ctx.lineTo(cx - 18 + tailWave, cy);
    ctx.closePath();
    ctx.fill();

    // Dragon Wings
    const wingFlap = Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 4);
    ctx.lineTo(cx - 24 + wingFlap, cy - 20);
    ctx.lineTo(cx - 18, cy - 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 4);
    ctx.lineTo(cx + 24 - wingFlap, cy - 20);
    ctx.lineTo(cx + 18, cy - 6);
    ctx.closePath();
    ctx.fill();

    // 2. Slender scaled greaves
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#ffedd5', scaleColor, '#facc15');

    // 3. Draconic hourglass scale bikini armor
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: scaleColor,
      highlight: scaleLight,
      shadow: '#450a0a',
      trim: '#facc15',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Head, Horns & Eyes
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', scaleLight, true, hairColor);

    // Swept-back Dragon Horns
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - 5, headY - 4);
    ctx.lineTo(cx - 14, headY - 14);
    ctx.lineTo(cx - 3, headY - 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 5, headY - 4);
    ctx.lineTo(cx + 14, headY - 14);
    ctx.lineTo(cx + 3, headY - 6);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // 10. SIREN / HARPY / DEMONESS: LILITH (สาวไซเรน / ปีศาจสาวลิลิธ)
  // Feathered/demon wings, taloned slender legs, bewitching curves
  // =========================================================================
  private renderSirenDemoness(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string,
    mName: string
  ) {
    const isDemon = mName.includes('demon') || mName.includes('lilith');
    const wingColor = isDemon ? '#581c87' : '#0284c7';
    const hairColor = isDemon ? '#9333ea' : '#0284c7';
    const hairShadow = isDemon ? '#581c87' : '#0c4a6e';
    const hairHighlight = isDemon ? '#c084fc' : '#38bdf8';

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Voluminous Wavy Hair (Drawn BEHIND body - NO BALDNESS!)
    this.drawMonsterFeminineHair(ctx, cx, cy, hairColor, hairShadow, hairHighlight, frame, 'wavy');

    // Majestic Winged Arms fluttering
    const wingFlap = Math.sin((frame / 6) * Math.PI * 2) * 5;
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 4);
    ctx.lineTo(cx - 26 + wingFlap, cy - 22);
    ctx.lineTo(cx - 20, cy - 6);
    ctx.lineTo(cx - 22, cy + 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 4);
    ctx.lineTo(cx + 26 - wingFlap, cy - 22);
    ctx.lineTo(cx + 20, cy - 6);
    ctx.lineTo(cx + 22, cy + 6);
    ctx.closePath();
    ctx.fill();

    // 2. Slender taloned high-heeled legs
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#ffedd5', wingColor, '#fbbf24');

    // 3. Sensual Hourglass Succubus / Siren Bikini Bodice
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: wingColor,
      highlight: isDemon ? '#a855f7' : '#38bdf8',
      shadow: '#0f172a',
      trim: '#fbbf24',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Head, Tiara & Anime Face
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', isDemon ? '#ef4444' : '#38bdf8', true, hairColor);

    // Cute Demonic Tiara / Siren Pearl Crown
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, headY - 6, 4, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDemon ? '#ef4444' : '#38bdf8';
    ctx.fillRect(cx - 1, headY - 8, 2, 2);
  }

  // =========================================================================
  // 11. KRAKEN MAIDEN: URSULA (สาวคราเคนหนวดปลาหมึก)
  // Graceful tentacles swaying, oceanic bikini, deep sea pearls
  // =========================================================================
  private renderKrakenMaiden(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 22, 9);

    // 1. Long Flowing Deep-Sea Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#0891b2', '#155e75', '#67e8f9', frame, 'wavy');

    // 4 Dynamic Curled Tentacles at Base
    const tentacleWave = Math.sin((frame / 6) * Math.PI * 2) * 4;
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 14);
    ctx.quadraticCurveTo(cx - 24 + tentacleWave, cy + 24, cx - 18, cy + 32);
    ctx.quadraticCurveTo(cx - 12, cy + 26, cx - 4, cy + 16);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 10, cy + 14);
    ctx.quadraticCurveTo(cx + 24 - tentacleWave, cy + 24, cx + 18, cy + 32);
    ctx.quadraticCurveTo(cx + 12, cy + 26, cx + 4, cy + 16);
    ctx.closePath();
    ctx.fill();

    // Oceanic Seashell Bikini & Hourglass Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#06b6d4',
      highlight: '#67e8f9',
      shadow: '#0e7490',
      trim: '#ffffff',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Head, Turquoise Hair & Shell Tiara
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#06b6d4', false, '#0891b2');

    // Shell Pearl Tiara
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, headY - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 12. SPHINX QUEEN: NEFERTIA (ราชินีสฟิงซ์ทะเลทราย)
  // Golden Egyptian headdress, feline ears, lioness tail, regal royal curves
  // =========================================================================
  private renderSphinxQueen(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 20, 9);

    // 1. Long Jet-Black Braided Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#18181b', '#09090b', '#facc15', frame, 'long');

    // Lioness Tail waving
    const tailWave = Math.sin((frame / 6) * Math.PI * 2) * 4;
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 12);
    ctx.quadraticCurveTo(cx - 18, cy + 16, cx - 18 + tailWave, cy + 4);
    ctx.closePath();
    ctx.fill();

    // 2. Slender golden sandals & legs
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#fed7aa', '#d97706', '#facc15');

    // Regal Egyptian Bikini Dress & Hourglass Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#ffffff',
      highlight: '#ffffff',
      shadow: '#cbd5e1',
      trim: '#facc15',
      exposedMidriff: true,
      skinTone: '#fed7aa'
    });

    // Pharaoh Nemes Headdress (Blue & Gold stripes)
    const headY = cy - 14;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(cx - 10, headY - 8, 20, 14);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 8, headY - 7, 16, 2);
    ctx.fillRect(cx - 8, headY - 3, 16, 2);

    this.drawMonsterGirlFace(ctx, cx, headY, '#fed7aa', '#0ea5e9', false, '#18181b');
  }

  // =========================================================================
  // 13. DRYAD NYMPH: ALURA / FLORA (พรายไม้สาวดรายแอด)
  // Blossom flower crown, vine dress hugging curves, floating floral petals
  // =========================================================================
  private renderDryadNymph(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Wavy Emerald Vine Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#16a34a', '#14532d', '#86efac', frame, 'wavy');

    // 2. Slender feminine legs with floral vine garters
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#ffedd5', '#15803d', '#f472b6');

    // Vine leaves skirt
    const leafWave = Math.sin((frame / 6) * Math.PI * 2) * 2;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 10);
    ctx.lineTo(cx + 7, cy + 10);
    ctx.lineTo(cx + 12 + leafWave, cy + 24);
    ctx.lineTo(cx - 12 + leafWave, cy + 24);
    ctx.closePath();
    ctx.fill();

    // Floral vine hourglass bikini dress
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#22c55e',
      highlight: '#86efac',
      shadow: '#14532d',
      trim: '#f472b6',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Head, Emerald Hair & Blossom Crown
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#15803d', false, '#16a34a');

    // Pink Flower Blossom in hair
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(cx + 6, headY - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 14. ARACHNE WEAVER: SYLVI (สาวแมงมุมทอใย)
  // Top half beautiful maiden, bottom half sleek eight-legged crystal spider
  // =========================================================================
  private renderArachneWeaver(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 24, 10);

    // 1. Long Silky Silver-White Spider Silk Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#e2e8f0', '#64748b', '#ffffff', frame, 'long');

    // 8 Articulated Spider Legs
    const legTwitch = Math.sin((frame / 6) * Math.PI * 2) * 3;
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const lx = cx + i * 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14);
      ctx.lineTo(lx, cy + 18 + legTwitch);
      ctx.lineTo(lx + (i > 0 ? 8 : -8), cy + 32);
      ctx.stroke();
    }

    // Spider Abdomen Bulb
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Maiden Torso & Hourglass Spider-Web Lace Bikini Corset
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#4338ca',
      highlight: '#818cf8',
      shadow: '#1e1b4b',
      trim: '#c084fc',
      exposedMidriff: true,
      skinTone: '#ede9fe'
    });

    // Dark Elf Face & Silver-White Silk Hair
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ede9fe', '#a855f7', true, '#e2e8f0');
  }

  // =========================================================================
  // 15. VAMPIRE COUNTESS: CARMILLA (ท่านเคาน์เตสแวมไพร์สาว)
  // Velvet crimson dress, black bat wings, goblet of blood wine, fangs
  // =========================================================================
  private renderVampireCountess(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // 1. Long Wavy Obsidian-Crimson Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#18181b', '#09090b', '#ef4444', frame, 'wavy');

    // 2. Slender gothic high-heeled boots
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#f8fafc', '#450a0a', '#fbbf24');

    // Velvet Crimson Ballgown Skirt
    const dressWave = Math.sin((frame / 6) * Math.PI * 2) * 2.5;
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 8);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.lineTo(cx + 12 + dressWave, cy + 24);
    ctx.lineTo(cx - 12 + dressWave, cy + 24);
    ctx.closePath();
    ctx.fill();

    // Hourglass Velvet Corset Bikini
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#dc2626',
      highlight: '#f87171',
      shadow: '#450a0a',
      trim: '#fbbf24',
      exposedMidriff: true,
      skinTone: '#f8fafc',
      skinShadow: '#cbd5e1'
    });

    // Pale Gothic Face, Crimson Eyes & Fangs
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#f8fafc', '#ef4444', true, '#18181b');
  }

  // =========================================================================
  // 16. GHOST / WRAITH MAIDEN (ภูตสาววิญญาณส่องสว่าง)
  // Spectral floating wisps, translucent ethereal gown, glowing spirit light
  // =========================================================================
  private renderGhostMaiden(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8, 0.35);

    // 1. Long Floating Spectral Cyan Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#38bdf8', '#0284c7', '#e0f2fe', frame, 'wavy');

    // Floating spectral tail wisp instead of legs
    const ghostFloat = Math.sin((frame / 6) * Math.PI * 2) * 4;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10);
    ctx.quadraticCurveTo(cx - 12 + ghostFloat, cy + 22, cx + ghostFloat, cy + 33);
    ctx.quadraticCurveTo(cx + 8, cy + 22, cx + 6, cy + 10);
    ctx.closePath();
    ctx.fill();

    // Ethereal Hourglass Bikini Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: 'rgba(224, 242, 254, 0.85)',
      highlight: '#ffffff',
      shadow: '#38bdf8',
      trim: '#7dd3fc',
      exposedMidriff: true,
      skinTone: '#f0f9ff'
    });

    // Spectral Head & Glowing Gaze
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#f0f9ff', '#0284c7', false, '#38bdf8');
  }

  // =========================================================================
  // 17. DRAGON OVERLORD PRINCESS IGNIS (เจ้าหญิงมังกรเพลิงบรรพกาล อิกนิส)
  // Colossal dragon princess with majestic crimson dragon horns, swept-back
  // draconic wings, slender scaled tail, royal draconic armor & greatsword
  // =========================================================================
  private renderDragonPrincessIgnis(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    _animState: string
  ) {
    // Sprawling Royal Shadow with Magma Glow
    this.drawIsoShadow(ctx, cx, cy + 34, 26, 12, 0.75);
    ctx.save();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 32, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1. Long Wild Flaming Dragon Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#dc2626', '#7f1d1d', '#f97316', frame, 'wild');

    // Colossal Dragon Wings Flapping
    const wingFlap = Math.sin((frame / 6) * Math.PI * 2) * 6;
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx - 36 + wingFlap, cy - 28);
    ctx.lineTo(cx - 26, cy - 8);
    ctx.lineTo(cx - 30, cy + 6);
    ctx.lineTo(cx - 8, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 4);
    ctx.lineTo(cx + 36 - wingFlap, cy - 28);
    ctx.lineTo(cx + 26, cy - 8);
    ctx.lineTo(cx + 30, cy + 6);
    ctx.lineTo(cx + 8, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Slender Dragon Tail waving gracefully
    const tailWave = Math.sin(frame * 0.8) * 5;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 12);
    ctx.quadraticCurveTo(cx - 24, cy + 16, cx - 26 + tailWave, cy - 2);
    ctx.lineTo(cx - 22 + tailWave, cy - 2);
    ctx.closePath();
    ctx.fill();

    // 2. Armored Dragon Greaves
    this.drawFeminineMonsterLegs(ctx, cx, cy, '#ffedd5', '#7f1d1d', '#facc15');

    // 3. Royal Dragon Plate Bikini Cuirass
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#dc2626',
      highlight: '#f87171',
      shadow: '#450a0a',
      trim: '#facc15',
      exposedMidriff: true,
      skinTone: '#ffedd5'
    });

    // Colossal Flaming Greatsword in hand
    ctx.save();
    ctx.translate(cx + 18, cy);
    ctx.rotate(0.35);
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4, -30, 8, 30);
    ctx.strokeRect(-4, -30, 8, 30);
    // Core Flame
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1.5, -26, 3, 22);
    ctx.restore();

    // Head, Crimson Horns & Golden Crown
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#f59e0b', true, '#dc2626');

    // Majestic Curled Dragon Horns
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(cx - 6, headY - 4);
    ctx.quadraticCurveTo(cx - 16, headY - 14, cx - 14, headY - 22);
    ctx.quadraticCurveTo(cx - 9, headY - 14, cx - 2, headY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 6, headY - 4);
    ctx.quadraticCurveTo(cx + 16, headY - 14, cx + 14, headY - 22);
    ctx.quadraticCurveTo(cx + 9, headY - 14, cx + 2, headY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Royal Princess Crown
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 5, headY - 6, 10, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 1, headY - 8, 2, 2);
  }

  // =========================================================================
  // 18. SAKURA SHRINE MAIDEN: CHIYO / AYAME (มิโกะจิ้งจอกเก้าหาง / เทนกุดอกซากุระ)
  // Traditional red & white shrine maiden miko outfit with crop top, exposed tummy,
  // fox ears & bushy tail or feathered tengu wings, paper prayer charms
  // =========================================================================
  private renderSakuraShrineMaiden(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    mName: string
  ) {
    const isTengu = mName.includes('tengu') || mName.includes('ayame');
    this.drawIsoShadow(ctx, cx, cy + 34, 19, 8);

    // 1. Long Silky Sakura Pink Hair (Drawn BEHIND body)
    this.drawMonsterFeminineHair(ctx, cx, cy, '#f472b6', '#db2777', '#fbcfe8', frame, 'long');

    // Animated Fox Tail or Crow Wings
    if (!isTengu) {
      // Golden/White Fox Tail swishing
      const tailSway = Math.sin((frame / 8) * Math.PI * 2) * 5;
      ctx.fillStyle = '#fed7aa';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy + 8);
      ctx.quadraticCurveTo(cx + 22 + tailSway, cy - 2, cx + 18 + tailSway, cy - 14);
      ctx.quadraticCurveTo(cx + 10, cy - 6, cx + 2, cy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // White tail tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 18 + tailSway, cy - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Tengu Black Feather Wings
      const wingFlap = Math.sin((frame / 6) * Math.PI * 2) * 4;
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 4);
      ctx.lineTo(cx - 24 + wingFlap, cy - 18);
      ctx.lineTo(cx - 16, cy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 6, cy - 4);
      ctx.lineTo(cx + 24 - wingFlap, cy - 18);
      ctx.lineTo(cx + 16, cy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Traditional red hakama pleated skirt & legs
    const legStep = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 3;
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(cx - 5 + legStep, cy + 13, 4, 8);
    ctx.fillRect(cx + 1 - legStep, cy + 13, 4, 8);

    // Red Hakama Skirt
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 7);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.lineTo(cx + 9, cy + 22);
    ctx.lineTo(cx - 9, cy + 22);
    ctx.closePath();
    ctx.fill();

    // White sandals (Zori)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 5 + legStep, cy + 26, 4, 3);
    ctx.fillRect(cx + 1 - legStep, cy + 26, 4, 3);

    // Miko White Top with Exposed Midriff
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#ffffff',
      highlight: '#f8fafc',
      shadow: '#cbd5e1',
      trim: '#dc2626',
      exposedMidriff: true,
      skinTone: '#ffedd5',
      skinShadow: '#fca5a5'
    });

    // Red ribbons on sleeves
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 9, cy - 4, 3, 10);
    ctx.fillRect(cx + 6, cy - 4, 3, 10);

    // Gohei Staff or Sacred Fan
    ctx.save();
    ctx.translate(cx + 12, cy + 2);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-1, -16, 2, 22);
    // White paper zigzags (Shide)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -16, 5, 4);
    ctx.fillRect(-2, -12, 5, 4);
    ctx.fillRect(-5, -8, 5, 4);
    ctx.restore();

    // Anime Shrine Maiden Face
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', isTengu ? '#dc2626' : '#ec4899', false, '#f472b6');

    // Kitsune Fox Ears or Tengu Tokin Cap
    if (!isTengu) {
      // Fluffy Fox Ears with pink interior
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.moveTo(cx - 7, headY - 4);
      ctx.lineTo(cx - 10, headY - 14);
      ctx.lineTo(cx - 3, headY - 8);
      ctx.closePath();
      ctx.fill();
      if (!this.isBack) {
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.moveTo(cx - 6, headY - 5);
        ctx.lineTo(cx - 8, headY - 12);
        ctx.lineTo(cx - 4, headY - 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.moveTo(cx + 7, headY - 4);
      ctx.lineTo(cx + 10, headY - 14);
      ctx.lineTo(cx + 3, headY - 8);
      ctx.closePath();
      ctx.fill();
      if (!this.isBack) {
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.moveTo(cx + 6, headY - 5);
        ctx.lineTo(cx + 8, headY - 12);
        ctx.lineTo(cx + 4, headY - 8);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Small black Tengu box hat (Tokin) with red cord
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 3, headY - 9, 6, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 1, headY - 6, 2, 2);
    }

    // Sakura blossoms drifting around
    ctx.fillStyle = 'rgba(244, 114, 182, 0.75)';
    ctx.beginPath();
    ctx.arc(cx - 12 + Math.sin(frame * 0.5) * 3, cy - 8 + Math.cos(frame * 0.5) * 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 14 + Math.cos(frame * 0.5) * 3, cy + 6 + Math.sin(frame * 0.5) * 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const customIsometricMonsterRenderer = new CustomIsometricMonsterRenderer();
