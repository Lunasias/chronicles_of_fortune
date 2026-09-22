import { IsoDirection } from './PixelSpriteGenerator';

export class CustomIsometricMonsterRenderer {
  private cache = new Map<string, HTMLCanvasElement>();

  private makeCanvas(w = 140, h = 140): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // =========================================================================
  // PUBLIC ENTRY POINT: Get Cached or Rendered Custom 2.5D Isometric Monster
  // =========================================================================
  public getMonsterSprite(
    monsterName: string,
    dir: IsoDirection = 'SW',
    animState: 'idle' | 'attack' | 'hurt' = 'idle',
    frame: number = 0
  ): HTMLCanvasElement {
    const f = frame % 8;
    const cacheKey = `custom_iso_mob_${monsterName.toLowerCase()}_${dir}_${animState}_${f}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.makeCanvas(140, 140);
    const mName = monsterName.toLowerCase();

    // Calculate animation offsets
    let bob = Math.sin((f / 8) * Math.PI * 2) * 2.5;
    let lungeX = 0;
    let lungeY = 0;

    if (animState === 'attack') {
      const lunges = [0, 8, 18, 26, 14, 4, 0, 0];
      const l = lunges[f];
      // Lunging towards bottom-left (player position)
      lungeX = -l * 0.9;
      lungeY = l * 0.45;
      bob = -2;
    } else if (animState === 'hurt') {
      // Recoil knockback towards top-right
      lungeX = 14;
      lungeY = -7;
      bob = -5;
    }

    const cx = 70 + lungeX;
    const cy = 70 + lungeY + bob;

    // Route to specialized 2.5D Isometric Monster Archetypes
    if (mName.includes('slime') || mName.includes('ooze') || mName.includes('jelly')) {
      let element: 'flame' | 'ice' | 'sun' | 'blossom' | 'gold' = 'flame';
      if (mName.includes('frost') || mName.includes('ice') || mName.includes('blue')) element = 'ice';
      else if (mName.includes('sun') || mName.includes('volt') || mName.includes('yellow')) element = 'sun';
      else if (mName.includes('blossom') || mName.includes('plant') || mName.includes('leaf') || mName.includes('green')) element = 'blossom';
      else if (mName.includes('gold') || mName.includes('king')) element = 'gold';

      this.renderIsometricSlime(ctx, cx, cy, element, f, animState);
    } else if (mName.includes('skeleton') || mName.includes('undead') || mName.includes('bone') || mName.includes('mummy')) {
      this.renderIsometricSkeleton(ctx, cx, cy, f, animState);
    } else if (mName.includes('knight') || mName.includes('commander') || mName.includes('paladin') || (mName.includes('captain') && !mName.includes('pirate'))) {
      this.renderIsometricDarkKnight(ctx, cx, cy, f, animState);
    } else if (mName.includes('marauder') || mName.includes('bandit') || mName.includes('raider') || mName.includes('pirate') || mName.includes('thief')) {
      this.renderIsometricMarauder(ctx, cx, cy, f, animState, mName);
    } else if (mName.includes('panther') || mName.includes('wolf') || mName.includes('hound') || mName.includes('chimera') || mName.includes('beast')) {
      this.renderIsometricBeast(ctx, cx, cy, f, animState, mName);
    } else if (mName.includes('colossus') || mName.includes('golem') || mName.includes('automaton') || mName.includes('dreadnought') || mName.includes('behemoth')) {
      this.renderIsometricColossus(ctx, cx, cy, f, animState, mName);
    } else if (mName.includes('yeti') || mName.includes('frost giant')) {
      this.renderIsometricYeti(ctx, cx, cy, f, animState);
    } else if (mName.includes('wyrm')) {
      this.renderIsometricWyrm(ctx, cx, cy, f, animState, mName);
    } else if (mName.includes('siren') || mName.includes('harpy') || mName.includes('demon') || mName.includes('archdemon')) {
      this.renderIsometricSirenDemon(ctx, cx, cy, f, animState, mName);
    } else if (mName.includes('kraken')) {
      this.renderIsometricKraken(ctx, cx, cy, f, animState);
    } else if (mName.includes('sphinx')) {
      this.renderIsometricSphinx(ctx, cx, cy, f, animState);
    } else if (mName.includes('ent') || mName.includes('treant')) {
      this.renderIsometricEnt(ctx, cx, cy, f, animState);
    } else if (mName.includes('spider') || mName.includes('arachnid') || mName.includes('weaver') || mName.includes('scorpion')) {
      this.renderIsometricSpider(ctx, cx, cy, f, animState);
    } else if (mName.includes('bat') || mName.includes('vampire') || mName.includes('gargoyle')) {
      this.renderIsometricBat(ctx, cx, cy, f, animState);
    } else if (mName.includes('ghost') || mName.includes('wraith') || mName.includes('phantom') || mName.includes('specter')) {
      this.renderIsometricGhost(ctx, cx, cy, f, animState);
    } else if (mName.includes('dragon') || mName.includes('boss') || mName.includes('overlord')) {
      this.renderIsometricDragonBoss(ctx, cx, cy, f, animState);
    } else {
      // Default: Kobold / Goblin
      this.renderIsometricGoblin(ctx, cx, cy, f, animState);
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
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

  // =========================================================================
  // 1. KOBOLD / GOBLIN (ก็อบลิน / โคโบลด์)
  // Green/tawny skin, pointed ears, bone/obsidian scimitar, warpaint, leather
  // =========================================================================
  private renderIsometricGoblin(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    const skinBase = '#22c55e';
    const skinShadow = '#15803d';
    const skinDark = '#14532d';
    const leatherBrown = '#78350f';
    const leatherDark = '#451a03';

    // 1. Ground Shadow (2:1 Isometric Oval)
    this.drawIsoShadow(ctx, cx, cy + 42, 24, 11);

    // 2. Legs & Feet
    const legWiggle = animState === 'idle' ? Math.sin((frame / 8) * Math.PI * 2) * 1.5 : 0;
    // Left Leg
    ctx.fillStyle = skinShadow;
    ctx.fillRect(cx - 10 + legWiggle, cy + 24, 7, 16);
    ctx.fillStyle = skinDark;
    ctx.fillRect(cx - 12 + legWiggle, cy + 38, 9, 4); // Clawed foot

    // Right Leg
    ctx.fillStyle = skinBase;
    ctx.fillRect(cx + 4 - legWiggle, cy + 24, 7, 16);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(cx + 2 - legWiggle, cy + 38, 9, 4);

    // 3. Torso (Leather Jerkin & Bone Necklace)
    ctx.fillStyle = leatherDark;
    ctx.fillRect(cx - 12, cy + 4, 24, 22);
    ctx.fillStyle = leatherBrown;
    ctx.fillRect(cx - 10, cy + 6, 20, 18);

    // Crossbody Leather Harness
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(cx - 10, cy + 8, 20, 3);
    // Belt Buckle
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 2, cy + 20, 5, 4);

    // 4. Arms & Weapon (Jagged Bone Scimitar)
    // Left Arm (holding knife forward facing SW towards player)
    const knifeX = cx - 18;
    const knifeY = cy + 14;

    ctx.save();
    ctx.translate(knifeX, knifeY);
    ctx.rotate(animState === 'attack' ? -0.8 : -0.3);
    // Green Arm
    ctx.fillStyle = skinBase;
    ctx.fillRect(-2, -6, 6, 12);
    // Jagged Blade
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -10);
    ctx.lineTo(-24, -4);
    ctx.lineTo(-14, 6);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-12, -4, 8, 4);
    // Blood / Poison on edge
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, -6, 4, 3);
    ctx.restore();

    // 5. Head & Feral Features
    const headY = cy - 14;
    // Green Head
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.arc(cx, headY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.arc(cx - 2, headY - 1, 12, 0, Math.PI * 2);
    ctx.fill();

    // Long Pointed Ears (Isometric Angle)
    // Left Ear
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.moveTo(cx - 10, headY - 2);
    ctx.lineTo(cx - 24, headY - 12);
    ctx.lineTo(cx - 12, headY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f472b6'; // Inner ear pink
    ctx.beginPath();
    ctx.moveTo(cx - 10, headY);
    ctx.lineTo(cx - 19, headY - 8);
    ctx.lineTo(cx - 11, headY + 3);
    ctx.closePath();
    ctx.fill();

    // Right Ear
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.moveTo(cx + 8, headY - 2);
    ctx.lineTo(cx + 22, headY - 12);
    ctx.lineTo(cx + 10, headY + 5);
    ctx.closePath();
    ctx.fill();

    // Glowing Yellow Predatory Eyes (Looking SW at player)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 7, headY - 1, 4, 4);
    ctx.fillRect(cx + 1, headY - 1, 4, 4);
    // Slit Pupils
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 6, headY, 2, 3);
    ctx.fillRect(cx + 2, headY, 2, 3);

    // Sharp Fangs & Snarl
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 5, headY + 6, 10, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, headY + 5, 2, 3); // Fang 1
    ctx.fillRect(cx + 2, headY + 5, 2, 3); // Fang 2
  }

  // =========================================================================
  // 2. ELEMENTAL SLIME SPIRITS (สไลม์ธาตุหลากสี)
  // Transparent 2.5D gelatinous drop, glowing inner mana core, squash & stretch
  // =========================================================================
  private renderIsometricSlime(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    element: 'flame' | 'ice' | 'sun' | 'blossom' | 'gold',
    frame: number,
    animState: string
  ) {
    let mainColor = '#f97316';
    let darkColor = '#c2410c';
    let coreColor = '#ef4444';
    let glowColor = '#ea580c';

    if (element === 'ice') {
      mainColor = '#38bdf8';
      darkColor = '#0284c7';
      coreColor = '#06b6d4';
      glowColor = '#0ea5e9';
    } else if (element === 'sun') {
      mainColor = '#fbbf24';
      darkColor = '#d97706';
      coreColor = '#f59e0b';
      glowColor = '#facc15';
    } else if (element === 'blossom') {
      mainColor = '#4ade80';
      darkColor = '#16a34a';
      coreColor = '#22c55e';
      glowColor = '#86efac';
    } else if (element === 'gold') {
      mainColor = '#fde047';
      darkColor = '#ca8a04';
      coreColor = '#eab308';
      glowColor = '#facc15';
    }

    // Dynamic Squash & Stretch
    const squash = Math.sin((frame / 8) * Math.PI * 2) * 3;
    const rw = 32 + squash;
    const rh = 26 - squash * 0.7;

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 30, rw * 0.9, rh * 0.45);

    // 2. Outer Slime Body (Curved Droplet Dome)
    ctx.save();
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper Tear Droplet
    ctx.beginPath();
    ctx.moveTo(cx - rw + 4, cy + 10);
    ctx.quadraticCurveTo(cx, cy - rh - 12, cx, cy - rh - 18);
    ctx.quadraticCurveTo(cx, cy - rh - 12, cx + rw - 4, cy + 10);
    ctx.closePath();
    ctx.fill();

    // Vibrant Inner Body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy + 10, rw * 0.88, rh * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - rw * 0.8, cy + 8);
    ctx.quadraticCurveTo(cx, cy - rh - 10, cx, cy - rh - 15);
    ctx.quadraticCurveTo(cx, cy - rh - 10, cx + rw * 0.8, cy + 8);
    ctx.closePath();
    ctx.fill();

    // Glowing Inner Mana Core
    ctx.fillStyle = coreColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular Gel Highlight (Upper Left 2:1 highlight)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 4, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 14, cy + 4, 4, 4);

    // Cute Expressive Chibi Eyes
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 10, cy + 8, 4, 5);
    ctx.fillRect(cx + 4, cy + 8, 4, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 9, cy + 9, 2, 2);
    ctx.fillRect(cx + 5, cy + 9, 2, 2);

    // Crown for King Slime
    if (element === 'gold') {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 8, cy - rh - 22, 16, 4);
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - rh - 22);
      ctx.lineTo(cx - 8, cy - rh - 30);
      ctx.lineTo(cx - 4, cy - rh - 24);
      ctx.lineTo(cx, cy - rh - 32);
      ctx.lineTo(cx + 4, cy - rh - 24);
      ctx.lineTo(cx + 8, cy - rh - 30);
      ctx.lineTo(cx + 8, cy - rh - 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 2, cy - rh - 26, 4, 4); // Ruby jewel
    }

    ctx.restore();
  }

  // =========================================================================
  // 3. SKELETON WARRIOR (โครงกระดูกนักรบ)
  // Anatomical skull, glowing red eyes, ribcage, rusty sword and shield
  // =========================================================================
  private renderIsometricSkeleton(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    const boneWhite = '#f1f5f9';
    const boneShade = '#cbd5e1';
    const boneDark = '#64748b';
    const rustIron = '#78350f';

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 40, 22, 10);

    // 2. Bony Legs
    ctx.fillStyle = boneShade;
    ctx.fillRect(cx - 8, cy + 22, 5, 18);
    ctx.fillRect(cx + 3, cy + 22, 5, 18);
    // Bony Phalanges Feet
    ctx.fillStyle = boneWhite;
    ctx.fillRect(cx - 10, cy + 38, 7, 3);
    ctx.fillRect(cx + 1, cy + 38, 7, 3);

    // 3. Spine & Ribcage
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 10, cy + 4, 20, 18);
    ctx.fillStyle = boneWhite;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 9, cy + 5 + i * 5, 8, 3);
      ctx.fillRect(cx + 1, cy + 5 + i * 5, 8, 3);
    }
    // Sternum
    ctx.fillStyle = boneShade;
    ctx.fillRect(cx - 1.5, cy + 4, 3, 18);

    // 4. Cracked Round Shield on Right Arm
    ctx.fillStyle = rustIron;
    ctx.beginPath();
    ctx.arc(cx + 16, cy + 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Rusty Bone Sword in Left Hand (Facing SW towards player)
    const swordX = cx - 16;
    const swordY = cy + 12;
    ctx.save();
    ctx.translate(swordX, swordY);
    ctx.rotate(animState === 'attack' ? -0.7 : -0.25);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -20, 4, 22);
    ctx.fillStyle = rustIron;
    ctx.fillRect(-1, -16, 2, 8); // Rust patch
    ctx.fillStyle = '#334155';
    ctx.fillRect(-5, 2, 10, 3);
    ctx.restore();

    // 6. Skull Head & Glowing Red Eye Sockets
    const headY = cy - 14;
    ctx.fillStyle = boneDark;
    ctx.beginPath();
    ctx.arc(cx, headY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = boneWhite;
    ctx.beginPath();
    ctx.arc(cx - 1, headY - 1, 11, 0, Math.PI * 2);
    ctx.fill();

    // Jawbone with teeth
    ctx.fillStyle = boneShade;
    ctx.fillRect(cx - 6, headY + 5, 12, 5);
    ctx.fillStyle = '#020617';
    for (let t = 0; t < 3; t++) {
      ctx.fillRect(cx - 5 + t * 4, headY + 7, 2, 3);
    }

    // Glowing Red Soul Eyes
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 7, headY, 4, 4);
    ctx.fillRect(cx + 1, headY, 4, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 6, headY + 1, 2, 2);
    ctx.fillRect(cx + 2, headY + 1, 2, 2);
  }

  // =========================================================================
  // 4. DREAD SPIDER (แมงมุมพิษ 8 ขา)
  // Jointed chitin legs, pulsating abdomen, glowing multiple eyes, fangs
  // =========================================================================
  private renderIsometricSpider(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    const chitinDark = '#090514';
    const chitinMid = '#1e1b4b';
    const chitinLight = '#4338ca';
    const poisonGlow = '#22c55e';

    // 1. Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 32, 28, 13);

    // 2. Twitching Jointed Spider Legs (8 Legs in 2.5D Isometric Spacing)
    const legTwitch = Math.sin((frame / 6) * Math.PI * 2) * 2;
    ctx.strokeStyle = chitinLight;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    // Left 4 Legs
    for (let i = 0; i < 4; i++) {
      const ly = cy + 6 + i * 4;
      ctx.beginPath();
      ctx.moveTo(cx - 8, ly);
      ctx.lineTo(cx - 22, ly - 8 + (i % 2 === 0 ? legTwitch : -legTwitch));
      ctx.lineTo(cx - 32, ly + 14);
      ctx.stroke();
    }

    // Right 4 Legs
    for (let i = 0; i < 4; i++) {
      const ly = cy + 6 + i * 4;
      ctx.beginPath();
      ctx.moveTo(cx + 8, ly);
      ctx.lineTo(cx + 22, ly - 8 + (i % 2 === 1 ? legTwitch : -legTwitch));
      ctx.lineTo(cx + 32, ly + 14);
      ctx.stroke();
    }

    // 3. Bulging Abdomen (Back)
    ctx.fillStyle = chitinDark;
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 6, 18, 15, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = chitinMid;
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy - 8, 15, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Runic Skull Marking on Abdomen
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx + 2, cy - 12, 6, 6);

    // 4. Cephalothorax (Front Head)
    ctx.fillStyle = chitinDark;
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy + 8, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Multiple Red Eyes Glowing
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 15, cy + 6, 2, 2);
    ctx.fillRect(cx - 11, cy + 5, 2, 2);
    ctx.fillRect(cx - 15, cy + 10, 2, 2);
    ctx.fillRect(cx - 11, cy + 9, 2, 2);

    // Venom Fangs dripping poison
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 14);
    ctx.lineTo(cx - 22, cy + 22);
    ctx.lineTo(cx - 16, cy + 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = poisonGlow;
    ctx.fillRect(cx - 23, cy + 22, 2, 3); // Poison drop
  }

  // =========================================================================
  // 5. CAVE BAT (ค้างคาวถ้ำ)
  // Flapping leathery wings, fangs, hovering altitude
  // =========================================================================
  private renderIsometricBat(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    const flap = Math.sin((frame / 6) * Math.PI * 2) * 8;
    const hoverY = cy - 10 + Math.sin((frame / 8) * Math.PI * 2) * 4;

    // Ground Shadow on floor below
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8, 0.4);

    // Left Wing
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(cx - 6, hoverY);
    ctx.lineTo(cx - 34, hoverY - 14 + flap);
    ctx.lineTo(cx - 26, hoverY + 6);
    ctx.lineTo(cx - 18, hoverY + 2);
    ctx.lineTo(cx - 6, hoverY + 8);
    ctx.closePath();
    ctx.fill();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 6, hoverY);
    ctx.lineTo(cx + 34, hoverY - 14 - flap);
    ctx.lineTo(cx + 26, hoverY + 6);
    ctx.lineTo(cx + 18, hoverY + 2);
    ctx.lineTo(cx + 6, hoverY + 8);
    ctx.closePath();
    ctx.fill();

    // Bat Body & Head
    ctx.fillStyle = '#0f051d';
    ctx.beginPath();
    ctx.ellipse(cx, hoverY + 4, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed Ears
    ctx.beginPath();
    ctx.moveTo(cx - 6, hoverY - 4);
    ctx.lineTo(cx - 8, hoverY - 12);
    ctx.lineTo(cx - 2, hoverY - 5);
    ctx.moveTo(cx + 6, hoverY - 4);
    ctx.lineTo(cx + 8, hoverY - 12);
    ctx.lineTo(cx + 2, hoverY - 5);
    ctx.closePath();
    ctx.fill();

    // Glowing Eyes & Fangs
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 4, hoverY + 2, 2, 2);
    ctx.fillRect(cx + 2, hoverY + 2, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, hoverY + 7, 1, 2);
    ctx.fillRect(cx + 1, hoverY + 7, 1, 2);
  }

  // =========================================================================
  // 6. GHOST / WRAITH (ภูตผีวิญญาณ)
  // Ethereal floating spectral shroud, glowing soul aura, wisps
  // =========================================================================
  private renderIsometricGhost(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    const float = Math.sin((frame / 8) * Math.PI * 2) * 5;
    const ghostY = cy - 8 + float;

    // Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8, 0.3);

    ctx.save();
    // Spectral Aura
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, ghostY + 8, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flowing Tattered Shroud
    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.arc(cx, ghostY, 14, Math.PI, 0);
    // Tattered tail wisps
    const tailWiggle = Math.sin(frame * 0.9) * 3;
    ctx.lineTo(cx + 14, ghostY + 24);
    ctx.lineTo(cx + 7, ghostY + 18 + tailWiggle);
    ctx.lineTo(cx, ghostY + 26);
    ctx.lineTo(cx - 7, ghostY + 18 - tailWiggle);
    ctx.lineTo(cx - 14, ghostY + 24);
    ctx.closePath();
    ctx.fill();

    // Hollow Soul Eyes & Mouth
    ctx.fillStyle = '#083344';
    ctx.fillRect(cx - 7, ghostY + 2, 4, 6);
    ctx.fillRect(cx + 2, ghostY + 2, 4, 6);
    ctx.beginPath();
    ctx.ellipse(cx - 1, ghostY + 12, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // 7. DRAGON OVERLORD BOSS (มังกรจอมมารบอสใหญ่)
  // Colossal 2.5D isometric dark dragon, bat wings, obsidian horns, magma scales
  // =========================================================================
  public renderIsometricDragonBoss(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    const dragonDark = '#180505';
    const dragonRed = '#7f1d1d';
    const dragonFlame = '#f97316';
    const magmaCore = '#facc15';

    // 1. Enormous Ground Shadow
    this.drawIsoShadow(ctx, cx, cy + 46, 44, 20, 0.75);

    // 2. Colossal Spreading Dragon Wings
    const wingFlap = Math.sin((frame / 6) * Math.PI * 2) * 6;
    ctx.save();
    // Left Wing
    ctx.fillStyle = dragonDark;
    ctx.strokeStyle = dragonFlame;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 48 + wingFlap, cy - 36);
    ctx.lineTo(cx - 36, cy - 14);
    ctx.lineTo(cx - 42, cy + 6);
    ctx.lineTo(cx - 10, cy + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(cx + 48 - wingFlap, cy - 36);
    ctx.lineTo(cx + 36, cy - 14);
    ctx.lineTo(cx + 42, cy + 6);
    ctx.lineTo(cx + 10, cy + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Dragon Claws & Feet
    ctx.fillStyle = dragonDark;
    ctx.fillRect(cx - 16, cy + 24, 12, 22);
    ctx.fillRect(cx + 4, cy + 24, 12, 22);
    // Sharp Talons
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 18, cy + 44, 4, 4);
    ctx.fillRect(cx - 12, cy + 44, 4, 4);
    ctx.fillRect(cx + 6, cy + 44, 4, 4);
    ctx.fillRect(cx + 12, cy + 44, 4, 4);

    // 4. Magma Fissure Dragon Chest
    ctx.fillStyle = dragonDark;
    ctx.fillRect(cx - 18, cy, 36, 26);
    ctx.fillStyle = dragonRed;
    ctx.fillRect(cx - 14, cy + 2, 28, 22);

    // Glowing Magma Core Fissure on Chest
    ctx.save();
    ctx.fillStyle = magmaCore;
    ctx.shadowColor = dragonFlame;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx + 8, cy + 14);
    ctx.lineTo(cx, cy + 22);
    ctx.lineTo(cx - 8, cy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Dragon Head & Curled Obsidian Horns
    const headY = cy - 20;
    ctx.fillStyle = dragonDark;
    ctx.beginPath();
    ctx.ellipse(cx, headY, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curled Horns
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = dragonFlame;
    ctx.lineWidth = 1.5;
    // Left Horn
    ctx.beginPath();
    ctx.moveTo(cx - 8, headY - 6);
    ctx.quadraticCurveTo(cx - 26, headY - 26, cx - 22, headY - 34);
    ctx.quadraticCurveTo(cx - 14, headY - 22, cx - 2, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right Horn
    ctx.beginPath();
    ctx.moveTo(cx + 8, headY - 6);
    ctx.quadraticCurveTo(cx + 26, headY - 26, cx + 22, headY - 34);
    ctx.quadraticCurveTo(cx + 14, headY - 22, cx + 2, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Burning Magma Eyes
    ctx.fillStyle = magmaCore;
    ctx.fillRect(cx - 10, headY - 2, 5, 3);
    ctx.fillRect(cx + 3, headY - 2, 5, 3);

    // Smoke plumes drifting from nostrils
    ctx.fillStyle = 'rgba(251, 146, 60, 0.4)';
    ctx.beginPath();
    ctx.arc(cx - 8, headY + 12, 3, 0, Math.PI * 2);
    ctx.arc(cx + 8, headY + 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 7. MARAUDER / BANDIT / PIRATE (โจรป่า / จอมโจร / โจรสลัด)
  // =========================================================================
  private renderIsometricMarauder(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    name: string
  ) {
    const isPirate = name.includes('pirate');
    const isDune = name.includes('dune') || name.includes('desert');

    this.drawIsoShadow(ctx, cx, cy + 42, 22, 10);

    // Leather Boots
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 10, cy + 26, 8, 14);
    ctx.fillRect(cx + 3, cy + 26, 8, 14);

    // Trousers
    ctx.fillStyle = isPirate ? '#1e293b' : isDune ? '#78350f' : '#334155';
    ctx.fillRect(cx - 12, cy + 12, 11, 16);
    ctx.fillRect(cx + 2, cy + 12, 11, 16);

    // Belt & Buckle
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 13, cy + 8, 26, 5);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 3, cy + 7, 6, 7);

    // Torso / Vest
    ctx.fillStyle = isPirate ? '#991b1b' : isDune ? '#d97706' : '#1e3a5f';
    ctx.fillRect(cx - 12, cy - 8, 24, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 4, cy - 8, 8, 12);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 18, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye Patch & Scars
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 6, cy - 20, 5, 5);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 24);
    ctx.lineTo(cx + 8, cy - 14);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Fierce eye
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx + 2, cy - 20, 3, 3);

    // Bandanna / Pirate Hat
    if (isPirate) {
      // Tricorn Hat
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 22);
      ctx.lineTo(cx + 18, cy - 22);
      ctx.lineTo(cx, cy - 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 3, cy - 27, 6, 4);
    } else {
      // Bandanna
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 11, cy - 28, 22, 9);
      ctx.fillRect(cx + 8, cy - 24, 6, 12);
    }

    // Scimitar / Cutlass
    const slash = animState === 'attack' ? -18 : 0;
    ctx.save();
    ctx.translate(cx - 14, cy + 2 + slash);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, -28);
    ctx.quadraticCurveTo(-14, -34, -18, -26);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-6, -2, 8, 4);
    ctx.restore();
  }

  // =========================================================================
  // 8. DARK KNIGHT / NETHER COMMANDER (อัศวินทมิฬ / ขุนพลไร้พ่าย)
  // =========================================================================
  private renderIsometricDarkKnight(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 42, 26, 12);

    // Torn Cape
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 14);
    ctx.lineTo(cx - 24, cy + 34);
    ctx.lineTo(cx + 20, cy + 32);
    ctx.lineTo(cx + 14, cy - 14);
    ctx.closePath();
    ctx.fill();

    // Blackened Iron Greaves & Sabatons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 12, cy + 18, 9, 22);
    ctx.fillRect(cx + 3, cy + 18, 9, 22);
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 11, cy + 19, 3, 20);
    ctx.fillRect(cx + 4, cy + 19, 3, 20);

    // Heavy Gothic Cuirass
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 15, cy - 12, 30, 30);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cx - 4, cy - 12, 8, 30);

    // Great Pauldrons (Spiked Shoulders)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 8);
    ctx.lineTo(cx - 26, cy - 18);
    ctx.lineTo(cx - 10, cy - 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 15, cy - 8);
    ctx.lineTo(cx + 26, cy - 18);
    ctx.lineTo(cx + 10, cy - 22);
    ctx.closePath();
    ctx.fill();

    // Horned Greathelm
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 11, cy - 32, 22, 22);
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 10, cy - 31, 4, 20);

    // Glowing Crimson Visor T-Slit
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 7, cy - 23, 14, 3);
    ctx.fillRect(cx - 2, cy - 23, 4, 10);

    // Demonic Horns on Helm
    ctx.fillStyle = '#831843';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 28);
    ctx.lineTo(cx - 22, cy - 42);
    ctx.lineTo(cx - 6, cy - 32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 28);
    ctx.lineTo(cx + 22, cy - 42);
    ctx.lineTo(cx + 6, cy - 32);
    ctx.closePath();
    ctx.fill();

    // Massive Two-Handed Executioner Greatsword
    const lunge = animState === 'attack' ? 12 : 0;
    ctx.save();
    ctx.translate(cx + 16, cy - 8 + lunge);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, -38, 8, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(4, -38, 4, 48);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(2, -8, 4, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-6, 2, 20, 5);
    ctx.restore();
  }

  // =========================================================================
  // 9. BEAST / PANTHER / CHIMERA (สัตว์อสูร / พยัคฆ์ทมิฬ / ไคเมร่า)
  // =========================================================================
  private renderIsometricBeast(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    name: string
  ) {
    const isPanther = name.includes('panther');
    const bodyColor = isPanther ? '#0f172a' : '#78350f';
    const accentColor = isPanther ? '#a855f7' : '#f59e0b';

    this.drawIsoShadow(ctx, cx, cy + 38, 32, 14);

    // Quadrupedal Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 26, 14, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 4 Muscular Paws
    ctx.fillRect(cx - 22, cy + 18, 8, 18);
    ctx.fillRect(cx - 10, cy + 20, 8, 16);
    ctx.fillRect(cx + 8, cy + 20, 8, 16);
    ctx.fillRect(cx + 18, cy + 18, 8, 18);

    // Claws
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 24, cy + 34, 10, 3);
    ctx.fillRect(cx + 16, cy + 34, 10, 3);

    // Feline / Beast Head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 2, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spiked Ears
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 10);
    ctx.lineTo(cx - 28, cy - 22);
    ctx.lineTo(cx - 18, cy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 10);
    ctx.lineTo(cx - 10, cy - 22);
    ctx.lineTo(cx - 8, cy - 10);
    ctx.closePath();
    ctx.fill();

    // Glowing Predatory Eyes
    ctx.fillStyle = accentColor;
    ctx.fillRect(cx - 26, cy - 5, 5, 3);
    ctx.fillRect(cx - 16, cy - 5, 5, 3);

    // Sharp White Fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 26, cy + 5, 3, 5);
    ctx.fillRect(cx - 16, cy + 5, 3, 5);

    // Spiked Whipping Tail
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy + 6);
    ctx.quadraticCurveTo(cx + 38, cy - 8, cx + 32, cy - 22);
    ctx.stroke();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(cx + 32, cy - 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // 10. COLOSSUS / GOLEM / AUTOMATON (อสูรยักษ์ศิลา / หุ่นกลทมิฬ)
  // =========================================================================
  private renderIsometricColossus(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    name: string
  ) {
    const isMagma = name.includes('magma') || name.includes('volcano');
    const isIce = name.includes('ice') || name.includes('frost');
    const stoneBase = isMagma ? '#18181b' : isIce ? '#334155' : '#475569';
    const coreGlow = isMagma ? '#ea580c' : isIce ? '#38bdf8' : '#a855f7';

    this.drawIsoShadow(ctx, cx, cy + 44, 34, 16);

    // Massive Stone Pillar Legs
    ctx.fillStyle = stoneBase;
    ctx.fillRect(cx - 22, cy + 16, 16, 26);
    ctx.fillRect(cx + 6, cy + 16, 16, 26);

    // Heavy Torso with Monolithic Bricks
    ctx.fillStyle = stoneBase;
    ctx.fillRect(cx - 26, cy - 18, 52, 36);

    // Massive Boulder Fists & Shoulders
    ctx.fillRect(cx - 38, cy - 14, 16, 32);
    ctx.fillRect(cx + 22, cy - 14, 16, 32);

    // Glowing Power Core on Chest
    ctx.fillStyle = coreGlow;
    ctx.shadowColor = coreGlow;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Magma/Ice Fissure Lines
    ctx.strokeStyle = coreGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 10);
    ctx.lineTo(cx - 4, cy - 2);
    ctx.lineTo(cx - 12, cy + 10);
    ctx.moveTo(cx + 18, cy - 10);
    ctx.lineTo(cx + 4, cy - 2);
    ctx.lineTo(cx + 12, cy + 10);
    ctx.stroke();

    // Monolith Head
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 14, cy - 34, 28, 18);
    ctx.fillStyle = coreGlow;
    ctx.fillRect(cx - 8, cy - 26, 6, 3);
    ctx.fillRect(cx + 2, cy - 26, 6, 3);
  }

  // =========================================================================
  // 11. YETI / FROST GUARDIAN (เยติจอมพลัง / อสูรหิมะขาว)
  // =========================================================================
  private renderIsometricYeti(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 42, 30, 14);

    // Thick White Fur Body
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 26, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shaded Belly Fur
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Massive Yeti Arms with Icy Claws
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 32, cy - 8, 14, 32);
    ctx.fillRect(cx + 18, cy - 8, 14, 32);
    // Cyan Ice Claws
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 34, cy + 22, 16, 5);
    ctx.fillRect(cx + 18, cy + 22, 16, 5);

    // Yeti Head
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 20, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark Face & Glowing Blue Eyes
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 10, cy - 24, 20, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 7, cy - 22, 4, 3);
    ctx.fillRect(cx + 3, cy - 22, 4, 3);

    // White Fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy - 14, 3, 5);
    ctx.fillRect(cx + 3, cy - 14, 3, 5);

    // Curved Ram Horns
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 26);
    ctx.quadraticCurveTo(cx - 28, cy - 40, cx - 22, cy - 14);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 26);
    ctx.quadraticCurveTo(cx + 28, cy - 40, cx + 22, cy - 14);
    ctx.stroke();
  }

  // =========================================================================
  // 12. WYRM / SERPENT DRAGON (พญานาคราช / มังกรเลื้อยเวหา)
  // =========================================================================
  private renderIsometricWyrm(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    name: string
  ) {
    const isFire = name.includes('fire');
    const scaleColor = isFire ? '#dc2626' : '#0284c7';
    const underbelly = isFire ? '#f97316' : '#7dd3fc';

    this.drawIsoShadow(ctx, cx, cy + 40, 32, 14);

    // Coiled Serpentine Body (Tier 1 & 2)
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = underbelly;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rising Coiled Neck
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 18);
    ctx.quadraticCurveTo(cx - 24, cy - 6, cx - 12, cy - 26);
    ctx.lineTo(cx + 8, cy - 24);
    ctx.quadraticCurveTo(cx + 4, cy - 4, cx + 10, cy + 18);
    ctx.closePath();
    ctx.fill();

    // Spiked Dorsal Fins
    ctx.fillStyle = isFire ? '#fde047' : '#e0f2fe';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - 22 + i * 4, cy + 4 - i * 8, 4, 8);
    }

    // Wyrm Head & Jaws
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 28, 16, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Elemental Gullet
    ctx.fillStyle = isFire ? '#fde047' : '#38bdf8';
    ctx.fillRect(cx - 18, cy - 26, 8, 4);

    // Fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 18, cy - 24, 2, 4);
    ctx.fillRect(cx - 14, cy - 24, 2, 4);
  }

  // =========================================================================
  // 13. SIREN / HARPY / DEMON (ไซเรน / ฮาร์ปี้ / จอมปีศาจ)
  // =========================================================================
  private renderIsometricSirenDemon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string,
    name: string
  ) {
    const isDemon = name.includes('demon');
    const skinColor = isDemon ? '#881337' : '#0e7490';
    const wingColor = isDemon ? '#4c0519' : '#0369a1';

    this.drawIsoShadow(ctx, cx, cy + 42, 24, 11);

    // Large Wings
    ctx.fillStyle = wingColor;
    // Left Wing
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 36, cy - 28);
    ctx.lineTo(cx - 24, cy + 14);
    ctx.closePath();
    ctx.fill();
    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 36, cy - 28);
    ctx.lineTo(cx + 24, cy + 14);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head & Horns
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, cy - 18, 9, 0, Math.PI * 2);
    ctx.fill();

    // Horns / Crown
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 24);
    ctx.lineTo(cx - 16, cy - 38);
    ctx.lineTo(cx - 2, cy - 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 24);
    ctx.lineTo(cx + 16, cy - 38);
    ctx.lineTo(cx + 2, cy - 26);
    ctx.closePath();
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = isDemon ? '#fde047' : '#67e8f9';
    ctx.fillRect(cx - 5, cy - 20, 3, 3);
    ctx.fillRect(cx + 2, cy - 20, 3, 3);

    // Dark Trident
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy + 24);
    ctx.lineTo(cx + 14, cy - 32);
    ctx.stroke();
  }

  // =========================================================================
  // 14. KRAKEN / SEA HORROR (คราเคน / อสูรหนวดใต้สมุทร)
  // =========================================================================
  private renderIsometricKraken(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 38, 34, 15);

    // Writhing Tentacles (6 tentacles)
    ctx.fillStyle = '#581c87';
    for (let t = -3; t <= 3; t++) {
      if (t === 0) continue;
      const wave = Math.sin((frame / 8) * Math.PI * 2 + t) * 6;
      ctx.beginPath();
      ctx.moveTo(cx + t * 7, cy + 18);
      ctx.quadraticCurveTo(cx + t * 15 + wave, cy + 6, cx + t * 12, cy - 18);
      ctx.lineTo(cx + t * 7, cy - 14);
      ctx.quadraticCurveTo(cx + t * 10 + wave, cy + 8, cx + t * 4, cy + 20);
      ctx.closePath();
      ctx.fill();

      // Suction Cups
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(cx + t * 11, cy - 6, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + t * 9, cy + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#581c87';
    }

    // Central Kraken Dome & Giant Eye
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Giant Glowing Eye
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy + 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.fillRect(cx - 1.5, cy + 2, 3, 8);
  }

  // =========================================================================
  // 15. SPHINX / SAND GUARDIAN (สฟิงซ์ศิลาทองคำ / ผู้พิทักษ์พีระมิด)
  // =========================================================================
  private renderIsometricSphinx(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 42, 32, 14);

    // Golden Sandstone Body
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 26, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Paws Resting Forward
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 18, cy + 24, 12, 14);
    ctx.fillRect(cx + 6, cy + 24, 12, 14);

    // Golden Wings Spread
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 32, cy - 24);
    ctx.lineTo(cx - 14, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 32, cy - 24);
    ctx.lineTo(cx + 14, cy + 10);
    ctx.closePath();
    ctx.fill();

    // Pharaoh Nemes Headdress & Sphinx Face
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 14, cy - 24, 28, 22);
    // Blue Nemes Stripes
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(cx - 14, cy - 22, 4, 20);
    ctx.fillRect(cx + 10, cy - 22, 4, 20);

    // Glowing Cyan Eyes
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 7, cy - 16, 4, 3);
    ctx.fillRect(cx + 3, cy - 16, 4, 3);
  }

  // =========================================================================
  // 16. ENT / FOREST GUARDIAN (ผู้พิทักษ์พฤกษา / มนุษย์ต้นไม้โบราณ)
  // =========================================================================
  private renderIsometricEnt(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    frame: number,
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 42, 28, 13);

    // Ancient Oak Bark Trunk
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 16, cy - 12, 32, 42);
    ctx.fillStyle = '#290e02';
    ctx.fillRect(cx - 6, cy - 12, 12, 42);

    // Root Feet
    ctx.fillRect(cx - 22, cy + 28, 12, 12);
    ctx.fillRect(cx + 10, cy + 28, 12, 12);

    // Leafy Canopy Crown (Top Foliage)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 22, 14, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy - 22, 14, 0, Math.PI * 2);
    ctx.arc(cx, cy - 32, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 26, 10, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 26, 10, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Emerald Eyes & Mouth
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(cx - 9, cy - 2, 5, 4);
    ctx.fillRect(cx + 4, cy - 2, 5, 4);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(cx - 5, cy + 8, 10, 3);
  }
}

export const customIsometricMonsterRenderer = new CustomIsometricMonsterRenderer();
