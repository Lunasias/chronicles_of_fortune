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
    } else if (mName.includes('skeleton') || mName.includes('undead') || mName.includes('bone')) {
      this.renderIsometricSkeleton(ctx, cx, cy, f, animState);
    } else if (mName.includes('spider') || mName.includes('arachnid') || mName.includes('weaver')) {
      this.renderIsometricSpider(ctx, cx, cy, f, animState);
    } else if (mName.includes('bat') || mName.includes('vampire') || mName.includes('gargoyle')) {
      this.renderIsometricBat(ctx, cx, cy, f, animState);
    } else if (mName.includes('ghost') || mName.includes('wraith') || mName.includes('phantom') || mName.includes('specter')) {
      this.renderIsometricGhost(ctx, cx, cy, f, animState);
    } else if (mName.includes('dragon') || mName.includes('boss') || mName.includes('overlord') || mName.includes('demon')) {
      this.renderIsometricDragonBoss(ctx, cx, cy, f, animState);
    } else {
      // Default: Kobold / Goblin / Forest Beast
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
}

export const customIsometricMonsterRenderer = new CustomIsometricMonsterRenderer();
