import { IsoDirection, CharacterAnimState } from './PixelSpriteGenerator';

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
  // PUBLIC ENTRY POINT: Get Cached or Rendered Custom 2.5D Isometric Monster Girl
  // =========================================================================
  public getMonsterSprite(
    monsterName: string,
    dir: IsoDirection = 'SW',
    animState: CharacterAnimState = 'idle',
    frame: number = 0
  ): HTMLCanvasElement {
    const normAnim: 'idle' | 'attack' | 'hurt' =
      animState === 'attack' || animState === 'strike'
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

    // Animation offsets
    let bob = Math.sin((f / 8) * Math.PI * 2) * 2.2;
    let lungeX = 0;
    let lungeY = 0;

    if (normAnim === 'attack') {
      const lunges = [0, 8, 18, 26, 14, 4, 0, 0];
      const l = lunges[f];
      lungeX = -l * 0.9;
      lungeY = l * 0.45;
      bob = -2;
    } else if (normAnim === 'hurt') {
      lungeX = 14;
      lungeY = -7;
      bob = -5;
    }

    const cx = 70 + lungeX;
    const cy = 70 + lungeY + bob;

    // Route to specialized Fantasy Monster Girl Archetypes
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
      // Default: Cute Goblin Girl
      this.renderGoblinGirl(ctx, cx, cy, f, animState);
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

  /**
   * Helper to draw delicate feminine anime facial features for monster girls
   */
  private drawMonsterGirlFace(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    skinColor: string,
    eyeColor: string,
    hasFangs = false
  ) {
    // Jaw & Chin
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 6);
    ctx.lineTo(cx + 7, cy - 6);
    ctx.quadraticCurveTo(cx + 7, cy + 3, cx + 1, cy + 7);
    ctx.quadraticCurveTo(cx - 5, cy + 3, cx - 7, cy - 6);
    ctx.closePath();
    ctx.fill();

    // Big Anime Eyes with lashes & catchlights
    const leftEyeX = cx - 3;
    const rightEyeX = cx + 3;
    const eyeY = cy - 1;

    ctx.fillStyle = '#020617';
    ctx.fillRect(leftEyeX - 1.5, eyeY - 2, 3.5, 1);
    ctx.fillRect(rightEyeX - 1.5, eyeY - 2, 3.5, 1);

    ctx.fillStyle = eyeColor;
    ctx.fillRect(leftEyeX - 1, eyeY - 1, 2.5, 3);
    ctx.fillRect(rightEyeX - 1, eyeY - 1, 2.5, 3);

    // Eye catchlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftEyeX - 1, eyeY - 1, 1, 1);
    ctx.fillRect(rightEyeX - 1, eyeY - 1, 1, 1);

    // Cheek blush
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(leftEyeX - 2.5, eyeY + 2.5, 2, 1);
    ctx.fillRect(rightEyeX + 1, eyeY + 2.5, 2, 1);

    // Cute fangs or smile
    if (hasFangs) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy + 4, 1, 1.5);
    }
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
    animState: string
  ) {
    const skinTone = '#86efac';
    const skinShadow = '#22c55e';
    const hairColor = '#15803d';

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // Slender legs & leather boots
    const legWiggle = animState === 'idle' ? Math.sin((frame / 8) * Math.PI * 2) * 1.5 : 0;
    ctx.fillStyle = skinTone;
    ctx.fillRect(cx - 5 + legWiggle, cy + 13, 4, 8);
    ctx.fillRect(cx + 2 - legWiggle, cy + 13, 4, 8);

    // Short leather boots
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 6 + legWiggle, cy + 21, 5, 13);
    ctx.fillRect(cx + 1 - legWiggle, cy + 21, 5, 13);

    // Hourglass corset & ragged mini skirt
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#78350f',
      highlight: '#b45309',
      shadow: '#451a03',
      trim: '#facc15'
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
    this.drawMonsterGirlFace(ctx, cx, headY, skinTone, '#f59e0b', true);

    // Messy green twintails
    const hairWave = Math.sin(frame * 0.8) * 2;
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx - 10, headY + 2 + hairWave, 4, 0, Math.PI * 2);
    ctx.arc(cx + 10, headY + 2 - hairWave, 4, 0, Math.PI * 2);
    ctx.fill();

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

    // Slime Maiden Voluptuous Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: mainColor,
      highlight: lightColor,
      shadow: darkColor
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
    this.drawMonsterGirlFace(ctx, cx, headY, lightColor, eyeColor);

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

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // Maid dress skirt
    const skirtWave = animState === 'idle' ? Math.sin((frame / 8) * Math.PI * 2) * 1.5 : 0;
    ctx.fillStyle = dressColor;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 8);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.lineTo(cx + 13 + skirtWave, cy + 32);
    ctx.lineTo(cx - 13 + skirtWave, cy + 32);
    ctx.closePath();
    ctx.fill();

    // White ruffled maid apron
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 9);
    ctx.lineTo(cx + 5, cy + 9);
    ctx.lineTo(cx + 8 + skirtWave, cy + 28);
    ctx.lineTo(cx - 8 + skirtWave, cy + 28);
    ctx.closePath();
    ctx.fill();

    // Hourglass corset torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: dressColor,
      highlight: isPharaoh ? '#fbbf24' : '#312e81',
      shadow: '#0f172a',
      trim: trimColor
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
    this.drawMonsterGirlFace(ctx, cx, headY, boneColor, isPharaoh ? '#eab308' : '#38bdf8');

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
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

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

    // Greaves & Sabatons
    const legWiggle = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 6 + legWiggle, cy + 18, 4.5, 15);
    ctx.fillRect(cx + 1 - legWiggle, cy + 18, 4.5, 15);

    // Contoured dark hourglass cuirass
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#1e1b4b',
      highlight: '#4338ca',
      shadow: '#0f172a',
      trim: '#c084fc'
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
    this.drawMonsterGirlFace(ctx, cx, headY, '#f1f5f9', '#a855f7');

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
    animState: string,
    mName: string
  ) {
    const isPirate = mName.includes('pirate') || mName.includes('corsair');
    const coatColor = isPirate ? '#1e3a8a' : '#78350f';
    const skinTone = '#fed7aa';

    this.drawIsoShadow(ctx, cx, cy + 34, 17, 8);

    // Thigh-high boots
    const legStep = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = skinTone;
    ctx.fillRect(cx - 5 + legStep, cy + 13, 4, 6);
    ctx.fillRect(cx + 1 - legStep, cy + 13, 4, 6);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 5 + legStep, cy + 19, 4.5, 14);
    ctx.fillRect(cx + 1 - legStep, cy + 19, 4.5, 14);

    // Corset blouse
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#ffffff',
      highlight: '#ffffff',
      shadow: '#cbd5e1',
      trim: '#ca8a04'
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
    this.drawMonsterGirlFace(ctx, cx, headY, skinTone, '#0ea5e9');

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
    animState: string,
    mName: string
  ) {
    const isPanther = mName.includes('panther');
    const furColor = isPanther ? '#1e293b' : '#78350f';
    const furLight = isPanther ? '#475569' : '#d97706';
    const skinTone = '#ffedd5';

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

    // Fluffy tail wagging behind
    const tailWag = Math.sin((frame / 6) * Math.PI * 2) * 5;
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10);
    ctx.quadraticCurveTo(cx - 18, cy + 14, cx - 20 + tailWag, cy + 2);
    ctx.quadraticCurveTo(cx - 14, cy + 6, cx - 4, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Slender athletic legs & soft paw boots
    const legStep = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = skinTone;
    ctx.fillRect(cx - 5 + legStep, cy + 13, 4, 7);
    ctx.fillRect(cx + 1 - legStep, cy + 13, 4, 7);
    ctx.fillStyle = furColor;
    ctx.fillRect(cx - 5 + legStep, cy + 20, 4.5, 13);
    ctx.fillRect(cx + 1 - legStep, cy + 20, 4.5, 13);

    // Athletic bikini / leather bustier
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: furColor,
      highlight: furLight,
      shadow: '#0f172a',
      trim: '#facc15'
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
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(cx - 7, headY - 11, 2, 4);
    ctx.fillRect(cx + 5, headY - 11, 2, 4);

    // Face & fangs
    this.drawMonsterGirlFace(ctx, cx, headY, skinTone, isPanther ? '#eab308' : '#38bdf8', true);
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
    animState: string,
    mName: string
  ) {
    const isCrystal = mName.includes('crystal') || mName.includes('lithia') || mName.includes('colossus');
    const mainColor = isCrystal ? '#0284c7' : '#d97706';
    const lightColor = isCrystal ? '#38bdf8' : '#facc15';

    this.drawIsoShadow(ctx, cx, cy + 34, 19, 8);

    // Winding Key on back spinning
    const keyTurn = (frame / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx - 8, cy - 2);
    ctx.rotate(keyTurn);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1.5, -6, 3, 12);
    ctx.fillRect(-6, -1.5, 12, 3);
    ctx.restore();

    // Porcelain Legs & Brass Joints
    const legStep = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 5 + legStep, cy + 13, 4, 12);
    ctx.fillRect(cx + 1 - legStep, cy + 13, 4, 12);
    ctx.fillStyle = mainColor;
    ctx.fillRect(cx - 5 + legStep, cy + 25, 4.5, 8);
    ctx.fillRect(cx + 1 - legStep, cy + 25, 4.5, 8);

    // Hourglass Brass Corset
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: mainColor,
      highlight: lightColor,
      shadow: '#78350f',
      trim: '#ffffff'
    });

    // Porcelain Face & Headgear
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#f8fafc', lightColor);

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
    animState: string
  ) {
    this.drawIsoShadow(ctx, cx, cy + 34, 20, 9);

    // Fluffy fur boots
    const legStep = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(cx - 6 + legStep, cy + 13, 5, 8);
    ctx.fillRect(cx + 1 - legStep, cy + 13, 5, 8);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 7 + legStep, cy + 21, 6.5, 12);
    ctx.fillRect(cx + 0.5 - legStep, cy + 21, 6.5, 12);

    // Fur trimmed hourglass bikini
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#38bdf8',
      highlight: '#e0f2fe',
      shadow: '#0284c7',
      trim: '#ffffff'
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
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, headY, 8, 0, Math.PI * 2);
    ctx.fill();

    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#0284c7', true);

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
    animState: string,
    mName: string
  ) {
    const isIce = mName.includes('frost') || mName.includes('glacia');
    const scaleColor = isIce ? '#0284c7' : '#dc2626';
    const scaleLight = isIce ? '#38bdf8' : '#f87171';

    this.drawIsoShadow(ctx, cx, cy + 34, 19, 8);

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

    // Slender scaled legs
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(cx - 5, cy + 13, 4, 8);
    ctx.fillRect(cx + 1, cy + 13, 4, 8);
    ctx.fillStyle = scaleColor;
    ctx.fillRect(cx - 5, cy + 21, 4.5, 12);
    ctx.fillRect(cx + 1, cy + 21, 4.5, 12);

    // Draconic hourglass scale armor
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: scaleColor,
      highlight: scaleLight,
      shadow: '#450a0a',
      trim: '#facc15'
    });

    // Head, Horns & Eyes
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', scaleLight, true);

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

    this.drawIsoShadow(ctx, cx, cy + 34, 18, 8);

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

    // Taloned Legs
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(cx - 5, cy + 13, 4, 10);
    ctx.fillRect(cx + 1, cy + 13, 4, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 6, cy + 23, 5, 10);
    ctx.fillRect(cx + 0.5, cy + 23, 5, 10);

    // Sensual Hourglass Bodice
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: wingColor,
      highlight: isDemon ? '#a855f7' : '#38bdf8',
      shadow: '#0f172a',
      trim: '#fbbf24'
    });

    // Head, Flowing Hair & Tiara
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', isDemon ? '#ef4444' : '#38bdf8');
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

    // Oceanic Bikini & Hourglass Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#06b6d4',
      highlight: '#67e8f9',
      shadow: '#0e7490',
      trim: '#ffffff'
    });

    // Head, Turquoise Hair & Shell Tiara
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#06b6d4');
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

    // Lioness Tail waving
    const tailWave = Math.sin((frame / 6) * Math.PI * 2) * 4;
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 12);
    ctx.quadraticCurveTo(cx - 18, cy + 16, cx - 18 + tailWave, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Regal Egyptian Dress & Hourglass Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#ffffff',
      highlight: '#ffffff',
      shadow: '#cbd5e1',
      trim: '#facc15'
    });

    // Pharaoh Nemes Headdress (Blue & Gold stripes)
    const headY = cy - 14;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(cx - 10, headY - 8, 20, 14);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 8, headY - 7, 16, 2);
    ctx.fillRect(cx - 8, headY - 3, 16, 2);

    this.drawMonsterGirlFace(ctx, cx, headY, '#fed7aa', '#0ea5e9');
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

    // Vine leaves skirt
    const leafWave = Math.sin((frame / 6) * Math.PI * 2) * 2;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 10);
    ctx.lineTo(cx + 7, cy + 10);
    ctx.lineTo(cx + 12 + leafWave, cy + 30);
    ctx.lineTo(cx - 12 + leafWave, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Floral vine hourglass dress
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#22c55e',
      highlight: '#86efac',
      shadow: '#14532d',
      trim: '#f472b6'
    });

    // Head, Emerald Hair & Blossom Crown
    const headY = cy - 14;
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(cx, headY, 7, 0, Math.PI * 2);
    ctx.fill();

    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#15803d');

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

    // Maiden Torso & Hourglass Corset
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#4338ca',
      highlight: '#818cf8',
      shadow: '#1e1b4b',
      trim: '#c084fc'
    });

    // Dark Elf Face & Violet Hair
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#ede9fe', '#a855f7');
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

    // Velvet Crimson Ballgown Skirt
    const dressWave = Math.sin((frame / 6) * Math.PI * 2) * 2.5;
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 8);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.lineTo(cx + 14 + dressWave, cy + 32);
    ctx.lineTo(cx - 14 + dressWave, cy + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 9);
    ctx.lineTo(cx + 5, cy + 9);
    ctx.lineTo(cx + 10 + dressWave, cy + 30);
    ctx.lineTo(cx - 10 + dressWave, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Hourglass Velvet Corset
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#dc2626',
      highlight: '#f87171',
      shadow: '#450a0a',
      trim: '#fbbf24'
    });

    // Pale Gothic Face, Crimson Eyes & Fangs
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#f8fafc', '#ef4444', true);
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

    // Floating spectral tail wisp instead of legs
    const ghostFloat = Math.sin((frame / 6) * Math.PI * 2) * 4;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10);
    ctx.quadraticCurveTo(cx - 12 + ghostFloat, cy + 22, cx + ghostFloat, cy + 33);
    ctx.quadraticCurveTo(cx + 8, cy + 22, cx + 6, cy + 10);
    ctx.closePath();
    ctx.fill();

    // Ethereal Hourglass Torso
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: 'rgba(224, 242, 254, 0.85)',
      highlight: '#ffffff',
      shadow: '#38bdf8'
    });

    // Spectral Head & Glowing Gaze
    const headY = cy - 14;
    this.drawMonsterGirlFace(ctx, cx, headY, '#f0f9ff', '#0284c7');
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
    animState: string
  ) {
    // Sprawling Royal Shadow with Magma Glow
    this.drawIsoShadow(ctx, cx, cy + 34, 26, 12, 0.75);
    ctx.save();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 32, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

    // Armored Dragon Greaves
    const legStep = animState === 'idle' ? 0 : Math.sin(frame * 0.9) * 4;
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 6 + legStep, cy + 18, 5, 15);
    ctx.fillRect(cx + 1 - legStep, cy + 18, 5, 15);

    // Royal Dragon Cuirass (Hourglass Voluptuous Draconic Bodice)
    this.drawMonsterHourglassBody(ctx, cx, cy, {
      base: '#dc2626',
      highlight: '#f87171',
      shadow: '#450a0a',
      trim: '#facc15'
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
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', '#f59e0b', true);

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
    this.drawMonsterGirlFace(ctx, cx, headY, '#ffedd5', isTengu ? '#dc2626' : '#ec4899', false);

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
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY - 5);
      ctx.lineTo(cx - 8, headY - 12);
      ctx.lineTo(cx - 4, headY - 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.moveTo(cx + 7, headY - 4);
      ctx.lineTo(cx + 10, headY - 14);
      ctx.lineTo(cx + 3, headY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(cx + 6, headY - 5);
      ctx.lineTo(cx + 8, headY - 12);
      ctx.lineTo(cx + 4, headY - 8);
      ctx.closePath();
      ctx.fill();
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
