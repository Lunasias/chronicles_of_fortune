export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity?: number;
}

export interface SlashArc {
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
  width: number;
  alpha: number;
  decay: number;
}

export interface GroundCrack {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  decay: number;
  points: Array<{ x: number; y: number }>;
}

export interface RunicRing {
  x: number;
  y: number;
  radius: number;
  color: string;
  angle: number;
  alpha: number;
  decay: number;
  isNested?: boolean;
}

export interface SkillCutscene {
  skillName: string;
  casterX: number;
  casterY: number;
  targetX: number;
  targetY: number;
  classKey: string;
  isDarkling: boolean;
  totalDuration: number;
  elapsed: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  shadowColor: string;
}

export class CombatVFXEngine {
  public particles: Particle[] = [];
  public slashArcs: SlashArc[] = [];
  public groundCracks: GroundCrack[] = [];
  public runicRings: RunicRing[] = [];
  public floatingTexts: FloatingText[] = [];

  public hitstopTimer = 0;
  public screenShakeAmount = 0;
  public screenShakeX = 0;
  public screenShakeY = 0;

  // Monster hit stagger reaction
  public monsterStaggerX = 0;
  public monsterStaggerY = 0;
  public monsterFlashAlpha = 0;
  public monsterFlashColor = '#ef4444';

  // Hero hit stagger reaction
  public heroStaggerX = 0;
  public heroFlashAlpha = 0;

  // Cinematic Skill Cutscene System
  public activeCutscene: SkillCutscene | null = null;
  public cutsceneDimAlpha = 0;

  // Anime Action Speed Lines
  public speedLinesAlpha = 0;
  public speedLinesColor = '#ffffff';
  public speedLinesTimer = 0;

  constructor() {}

  triggerHitstop(frames = 4) {
    this.hitstopTimer = frames;
  }

  triggerScreenShake(intensity = 14) {
    this.screenShakeAmount = intensity;
  }

  triggerSpeedLines(color = '#ffffff', durationFrames = 18) {
    this.speedLinesColor = color;
    this.speedLinesAlpha = 1.0;
    this.speedLinesTimer = durationFrames;
  }

  spawnFloatingCombatText(
    x: number,
    y: number,
    text: string,
    type: 'normal' | 'crit' | 'magic' | 'counter' | 'heal' | 'miss' = 'normal'
  ) {
    let color = '#fef08a';
    let shadowColor = '#ca8a04';
    let size = 18;
    let vy = -3.8;
    let vx = (Math.random() - 0.5) * 1.5;

    if (type === 'crit') {
      color = '#ef4444';
      shadowColor = '#7f1d1d';
      size = 24;
      vy = -5.2;
      this.triggerHitstop(5);
    } else if (type === 'magic') {
      color = '#c084fc';
      shadowColor = '#581c87';
      size = 20;
      vy = -4.2;
    } else if (type === 'counter') {
      color = '#38bdf8';
      shadowColor = '#0369a1';
      size = 22;
      vy = -4.8;
      this.triggerHitstop(6);
    } else if (type === 'heal') {
      color = '#4ade80';
      shadowColor = '#15803d';
      size = 20;
      vy = -3.5;
    } else if (type === 'miss') {
      color = '#94a3b8';
      shadowColor = '#334155';
      size = 16;
      vy = -2.5;
    }

    this.floatingTexts.push({
      x,
      y,
      vx,
      vy,
      text,
      color,
      size,
      alpha: 1.0,
      decay: 0.022,
      gravity: 0.12,
      shadowColor
    });
  }

  // =========================================================================
  // 1. ATTACK: DIAGONAL ISOMETRIC SLASH & BLOOD/SPARK BURST
  // =========================================================================
  spawnAttackHit(monsterX: number, monsterY: number, isRightToLeft = false) {
    this.triggerScreenShake(10);

    // Diagonal blade arc sliced along isometric perspective
    this.slashArcs.push({
      x: monsterX,
      y: monsterY,
      radius: 52,
      startAngle: isRightToLeft ? Math.PI * 0.85 : -Math.PI * 0.35,
      endAngle: isRightToLeft ? -Math.PI * 0.15 : Math.PI * 0.65,
      color: '#e11d48', // Blood red slash
      width: 7,
      alpha: 1.0,
      decay: 0.05
    });

    // Dark fantasy blood droplets & fiery sparks
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        x: monsterX,
        y: monsterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? '#ef4444' : '#fde047',
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.04,
        gravity: 0.18
      });
    }

    // Monster reaction
    this.monsterStaggerX = 18;
    this.monsterFlashAlpha = 0.9;
    this.monsterFlashColor = '#ef4444';
  }

  // =========================================================================
  // 2. STRIKE: 2.5D ISOMETRIC CRATER & SPLINTERING BONE DEBRIS
  // =========================================================================
  spawnStrikeHit(monsterX: number, monsterY: number) {
    this.triggerScreenShake(26);

    // 2.5D Flat Isometric Fracture Crater
    const crackPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
      const rx = 38 + Math.random() * 25;
      const ry = (38 + Math.random() * 25) * 0.48; // Isometric 2:1 ratio
      crackPoints.push({
        x: monsterX + Math.cos(angle) * rx,
        y: monsterY + 36 + Math.sin(angle) * ry
      });
    }

    this.groundCracks.push({
      x: monsterX,
      y: monsterY + 36,
      radius: 48,
      alpha: 1.0,
      decay: 0.018,
      points: crackPoints
    });

    // High velocity rock debris and black smoke particles
    for (let i = 0; i < 42; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() * Math.PI - Math.PI * 0.5);
      const speed = 5 + Math.random() * 11;
      this.particles.push({
        x: monsterX + (Math.random() * 24 - 12),
        y: monsterY + 28,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? '#dc2626' : '#1e293b',
        size: 4 + Math.random() * 6,
        alpha: 1.0,
        decay: 0.025,
        gravity: 0.4
      });
    }

    // Heavy monster recoil
    this.monsterStaggerX = 28;
    this.monsterStaggerY = -12;
    this.monsterFlashAlpha = 1.0;
    this.monsterFlashColor = '#f59e0b';
  }

  // =========================================================================
  // 3. MAGIC: FLAT ISOMETRIC RUNIC PENTAGRAM & VOID EXPLOSION
  // =========================================================================
  spawnMagicHit(monsterX: number, monsterY: number, isHeal = false) {
    this.triggerScreenShake(isHeal ? 5 : 18);

    // Nested 2.5D Isometric Runic Ring
    this.runicRings.push({
      x: monsterX,
      y: monsterY + 32,
      radius: 46,
      color: isHeal ? '#22c55e' : '#a855f7',
      angle: 0,
      alpha: 1.0,
      decay: 0.022,
      isNested: true
    });

    // Swirling magical void souls
    const pCount = isHeal ? 24 : 45;
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.particles.push({
        x: monsterX,
        y: monsterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isHeal ? 2.5 : 0),
        color: isHeal ? '#86efac' : Math.random() > 0.5 ? '#c084fc' : '#38bdf8',
        size: 3.5 + Math.random() * 4.5,
        alpha: 1.0,
        decay: 0.03,
        gravity: isHeal ? -0.12 : 0.04
      });
    }

    if (!isHeal) {
      this.monsterStaggerX = 20;
      this.monsterFlashAlpha = 0.95;
      this.monsterFlashColor = '#c084fc';
    }
  }

  // =========================================================================
  // 4. COUNTER: PARRY DIAMOND SPARK & REVERSE CROSS-SLASH
  // =========================================================================
  spawnCounterHit(clashX: number, clashY: number, attackerX: number, attackerY: number) {
    this.triggerScreenShake(20);

    // Parry sparks
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      this.particles.push({
        x: clashX,
        y: clashY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#facc15',
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.04
      });
    }

    // Lethal reverse dual slash
    this.slashArcs.push({
      x: attackerX,
      y: attackerY,
      radius: 56,
      startAngle: -Math.PI * 0.8,
      endAngle: Math.PI * 0.25,
      color: '#e11d48',
      width: 8,
      alpha: 1.0,
      decay: 0.035
    });

    this.heroStaggerX = -24;
    this.heroFlashAlpha = 0.95;
  }

  // =========================================================================
  // 4b. MONSTER-TO-PLAYER ATTACK: CLAWS, DARK SPELLS, HELLFIRE WAVE & BLOOD
  // =========================================================================
  spawnMonsterAttack(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    monsterName: string,
    atkType: string = 'attack'
  ) {
    this.triggerScreenShake(20);

    // Monster lunges forward towards the player along diagonal SW
    this.monsterStaggerX = -36;
    this.monsterStaggerY = 18;

    const lowerName = monsterName.toLowerCase();
    const isBoss = lowerName.includes('dragon') || lowerName.includes('boss') || lowerName.includes('ignis') || lowerName.includes('wyrm');
    const isMagic = atkType === 'magic' || lowerName.includes('lich') || lowerName.includes('ghost') || lowerName.includes('witch');

    if (isBoss) {
      // Abyssal Dragon Hellfire Eruption on Player
      const crackPoints: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        crackPoints.push({
          x: targetX + Math.cos(angle) * (35 + Math.random() * 20),
          y: targetY + 28 + Math.sin(angle) * (18 + Math.random() * 10)
        });
      }
      this.groundCracks.push({
        x: targetX,
        y: targetY + 28,
        radius: 42,
        alpha: 1.0,
        decay: 0.02,
        points: crackPoints
      });

      for (let i = 0; i < 36; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        this.particles.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
          size: 4 + Math.random() * 5,
          alpha: 1.0,
          decay: 0.035,
          gravity: 0.12
        });
      }
    } else if (isMagic) {
      // Necrotic / Void Curse Ring under Player
      this.runicRings.push({
        x: targetX,
        y: targetY + 24,
        radius: 46,
        color: '#a855f7',
        angle: 0,
        alpha: 1.0,
        decay: 0.02,
        isNested: true
      });
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 7;
        this.particles.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: '#c084fc',
          size: 3 + Math.random() * 4,
          alpha: 1.0,
          decay: 0.03,
          gravity: -0.08
        });
      }
    } else {
      // Savage Beast Claw / Bone Blade Dual Arc on Player
      this.slashArcs.push({
        x: targetX,
        y: targetY - 8,
        radius: 54,
        startAngle: Math.PI * 0.8,
        endAngle: -Math.PI * 0.2,
        color: '#dc2626',
        width: 7,
        alpha: 1.0,
        decay: 0.04
      });
      this.slashArcs.push({
        x: targetX + 10,
        y: targetY - 16,
        radius: 46,
        startAngle: Math.PI * 0.75,
        endAngle: -Math.PI * 0.25,
        color: '#f87171',
        width: 5,
        alpha: 1.0,
        decay: 0.045
      });
      for (let i = 0; i < 26; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        this.particles.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: '#ef4444',
          size: 3 + Math.random() * 4,
          alpha: 1.0,
          decay: 0.04,
          gravity: 0.16
        });
      }
    }

    // Player stagger & red damage flash
    this.heroStaggerX = -24;
    this.heroFlashAlpha = 0.95;
  }

  // =========================================================================
  // 5. CINEMATIC DARK FANTASY ISOMETRIC SKILL CUTSCENE
  // =========================================================================
  triggerSkillCutscene(
    skillName: string,
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number,
    classKey = 'warrior',
    isDarkling = false
  ) {
    this.activeCutscene = {
      skillName,
      casterX,
      casterY,
      targetX,
      targetY,
      classKey,
      isDarkling,
      totalDuration: 75,
      elapsed: 0
    };

    this.triggerScreenShake(24);

    // 2.5D Isometric Summoning Ring beneath caster
    this.runicRings.push({
      x: casterX,
      y: casterY + 30,
      radius: 50,
      color: isDarkling ? '#f43f5e' : classKey === 'magician' ? '#a855f7' : classKey === 'thief' ? '#10b981' : classKey === 'cleric' ? '#f59e0b' : '#ef4444',
      angle: 0,
      alpha: 1.0,
      decay: 0.015,
      isNested: true
    });

    // 2.5D Target Runic Ring beneath target
    this.runicRings.push({
      x: targetX,
      y: targetY + 30,
      radius: 55,
      color: '#ef4444',
      angle: 0,
      alpha: 1.0,
      decay: 0.015,
      isNested: true
    });

    // Class-specific Dark Fantasy FX
    if (classKey === 'warrior' || isDarkling) {
      // Leaping blood cleave
      this.spawnStrikeHit(targetX, targetY);
      this.slashArcs.push({
        x: targetX,
        y: targetY - 10,
        radius: 65,
        startAngle: -Math.PI * 0.7,
        endAngle: Math.PI * 0.4,
        color: '#be123c',
        width: 10,
        alpha: 1.0,
        decay: 0.025
      });
    } else if (classKey === 'magician') {
      // Eldritch Void Cataclysm
      this.spawnMagicHit(targetX, targetY);
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: targetX + (Math.random() * 40 - 20),
          y: targetY - 60 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 6,
          vy: 4 + Math.random() * 6,
          color: Math.random() > 0.5 ? '#c084fc' : '#7e22ce',
          size: 4 + Math.random() * 5,
          alpha: 1.0,
          decay: 0.025
        });
      }
    } else if (classKey === 'thief') {
      // Shadow Step Assassination
      this.slashArcs.push({
        x: targetX,
        y: targetY,
        radius: 55,
        startAngle: -Math.PI * 0.4,
        endAngle: Math.PI * 0.6,
        color: '#10b981',
        width: 7,
        alpha: 1.0,
        decay: 0.03
      });
      this.slashArcs.push({
        x: targetX,
        y: targetY,
        radius: 55,
        startAngle: Math.PI * 0.6,
        endAngle: -Math.PI * 0.4,
        color: '#e11d48',
        width: 7,
        alpha: 1.0,
        decay: 0.03
      });
    } else if (classKey === 'cleric') {
      // Judgement of the Eclipse
      this.spawnMagicHit(targetX, targetY, false);
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          x: targetX + (Math.random() * 30 - 15),
          y: targetY - 90,
          vx: (Math.random() - 0.5) * 2,
          vy: 6 + Math.random() * 8,
          color: Math.random() > 0.5 ? '#fde047' : '#ffffff',
          size: 3 + Math.random() * 4,
          alpha: 1.0,
          decay: 0.03
        });
      }
    }
  }

  update() {
    // 0. Hitstop micro-pause
    if (this.hitstopTimer > 0) {
      this.hitstopTimer--;
      return;
    }

    // 1. Screen Shake dampening
    if (this.screenShakeAmount > 0) {
      this.screenShakeX = (Math.random() * 2 - 1) * this.screenShakeAmount;
      this.screenShakeY = (Math.random() * 2 - 1) * this.screenShakeAmount;
      this.screenShakeAmount *= 0.85;
      if (this.screenShakeAmount < 0.5) {
        this.screenShakeAmount = 0;
        this.screenShakeX = 0;
        this.screenShakeY = 0;
      }
    }

    // 2. Monster Stagger recovery
    this.monsterStaggerX *= 0.82;
    this.monsterStaggerY *= 0.82;
    this.monsterFlashAlpha *= 0.88;

    // 3. Hero Stagger recovery
    this.heroStaggerX *= 0.82;
    this.heroFlashAlpha *= 0.88;

    // 4. Update Speed Lines
    if (this.speedLinesTimer > 0) {
      this.speedLinesTimer--;
      this.speedLinesAlpha = this.speedLinesTimer / 18;
    } else {
      this.speedLinesAlpha = 0;
    }

    // 5. Update Cutscene
    if (this.activeCutscene) {
      this.activeCutscene.elapsed++;
      this.cutsceneDimAlpha = Math.sin((this.activeCutscene.elapsed / this.activeCutscene.totalDuration) * Math.PI) * 0.75;
      if (this.activeCutscene.elapsed >= this.activeCutscene.totalDuration) {
        this.activeCutscene = null;
        this.cutsceneDimAlpha = 0;
      }
    }

    // 5. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 6. Update Slash Arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.alpha -= arc.decay;
      if (arc.alpha <= 0) {
        this.slashArcs.splice(i, 1);
      }
    }

    // 7. Update Ground Cracks
    for (let i = this.groundCracks.length - 1; i >= 0; i--) {
      const c = this.groundCracks[i];
      c.alpha -= c.decay;
      if (c.alpha <= 0) {
        this.groundCracks.splice(i, 1);
      }
    }

    // 8. Update Runic Rings
    for (let i = this.runicRings.length - 1; i >= 0; i--) {
      const r = this.runicRings[i];
      r.angle += 0.05;
      r.alpha -= r.decay;
      if (r.alpha <= 0) {
        this.runicRings.splice(i, 1);
      }
    }

    // 9. Update Floating Combat Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.x += ft.vx;
      ft.y += ft.vy;
      ft.vy += ft.gravity;
      ft.alpha -= ft.decay;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, arenaWidth: number = 800, arenaHeight: number = 450) {
    // 0. Cinematic Vignette Dimming during Skill Cutscene
    if (this.cutsceneDimAlpha > 0) {
      ctx.save();
      const vignette = ctx.createRadialGradient(
        arenaWidth * 0.5,
        arenaHeight * 0.5,
        arenaWidth * 0.2,
        arenaWidth * 0.5,
        arenaHeight * 0.5,
        arenaWidth * 0.7
      );
      vignette.addColorStop(0, `rgba(0, 0, 0, ${this.cutsceneDimAlpha * 0.3})`);
      vignette.addColorStop(1, `rgba(15, 2, 8, ${this.cutsceneDimAlpha * 0.85})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, arenaWidth, arenaHeight);

      // Gothic Skill Title Banner
      if (this.activeCutscene) {
        ctx.font = 'bold 20px Silkscreen';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 18;
        ctx.fillText(`⚡ ${this.activeCutscene.skillName.toUpperCase()} ⚡`, arenaWidth * 0.5, 60);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    // 1. Draw 2.5D Isometric Ground Cracks
    this.groundCracks.forEach(c => {
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${c.alpha})`;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#b91c1c';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      c.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    // 2. Draw 2.5D Flat Isometric Runic Summoning Arrays
    this.runicRings.forEach(r => {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(1, 0.48); // True 2.5D Isometric Ground Plane!

      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 3;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 16;

      // Outer Runic Ring
      ctx.beginPath();
      ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Pentagram / Hex lines
      if (r.isNested) {
        ctx.beginPath();
        ctx.arc(0, 0, r.radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.rotate(r.angle);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (i / 5) * Math.PI * 2;
          const a2 = ((i + 2) / 5) * Math.PI * 2;
          ctx.moveTo(Math.cos(a1) * r.radius * 0.65, Math.sin(a1) * r.radius * 0.65);
          ctx.lineTo(Math.cos(a2) * r.radius * 0.65, Math.sin(a2) * r.radius * 0.65);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    });

    // 3. Draw Diagonal Slash Arcs
    this.slashArcs.forEach(arc => {
      ctx.save();
      ctx.strokeStyle = arc.color;
      ctx.globalAlpha = arc.alpha;
      ctx.lineWidth = arc.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = arc.color;
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.arc(arc.x, arc.y, arc.radius, arc.startAngle, arc.endAngle);
      ctx.stroke();
      ctx.restore();
    });

    // 4. Draw Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5. Draw Bouncing Floating Combat Numbers & Text
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = `bold ${ft.size}px Silkscreen, monospace`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, ft.alpha);
      // Dark outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(ft.text, ft.x, ft.y);
      // Colored core with glow
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.shadowColor;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // 6. Action Speed Lines (Anime Dynamic Slash Overlay)
    this.renderSpeedLines(ctx, arenaWidth, arenaHeight);
  }

  private renderSpeedLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.speedLinesAlpha <= 0.01) return;
    ctx.save();
    ctx.strokeStyle = this.speedLinesColor;
    ctx.globalAlpha = Math.min(1.0, this.speedLinesAlpha * 0.85);
    ctx.lineWidth = 2.2;
    const scx = w * 0.5;
    const scy = h * 0.5;
    const lineCount = 32;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2 + Math.sin(i * 99) * 0.04;
      const innerR = Math.min(w, h) * 0.32 + (i % 4) * 18;
      const outerR = Math.max(w, h) * 0.82;
      ctx.beginPath();
      ctx.moveTo(scx + Math.cos(angle) * innerR, scy + Math.sin(angle) * innerR);
      ctx.lineTo(scx + Math.cos(angle) * outerR, scy + Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export const combatVFX = new CombatVFXEngine();
