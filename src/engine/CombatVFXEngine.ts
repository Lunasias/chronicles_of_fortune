import { pixelDisc, pixelEllipse, pixelRing, pixelStroke, pixelGlow, pixelVignette } from './PixelFx';

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

export interface MagicLaserBeam {
  casterX: number;
  casterY: number;
  targetX: number;
  targetY: number;
  color: string;
  width: number;
  alpha: number;
  decay: number;
  rings: number;
}

export interface SummonPortal {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  angle: number;
  pillarHeight: number;
}

export class CombatVFXEngine {
  public particles: Particle[] = [];
  public slashArcs: SlashArc[] = [];
  public groundCracks: GroundCrack[] = [];
  public runicRings: RunicRing[] = [];
  public floatingTexts: FloatingText[] = [];
  public magicLaserBeams: MagicLaserBeam[] = [];
  public summonPortals: SummonPortal[] = [];

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
    const cls = classKey.toLowerCase();
    if (cls === 'warrior' || isDarkling) {
      // Colossal Blade Groundbreak: Massive ground cracks and cleave shockwave
      this.spawnStrikeHit(targetX, targetY);
      this.groundCracks.push({
        x: targetX,
        y: targetY,
        radius: 65,
        alpha: 1.0,
        decay: 0.015,
        points: [
          { x: targetX - 50, y: targetY + 10 },
          { x: targetX - 25, y: targetY - 15 },
          { x: targetX, y: targetY },
          { x: targetX + 30, y: targetY - 20 },
          { x: targetX + 55, y: targetY + 15 }
        ]
      });
      this.slashArcs.push({
        x: targetX,
        y: targetY - 20,
        radius: 80,
        startAngle: -Math.PI * 0.7,
        endAngle: Math.PI * 0.4,
        color: isDarkling ? '#be123c' : '#38bdf8',
        width: 14,
        alpha: 1.0,
        decay: 0.02
      });
      this.triggerScreenShake(28);
    } else if (cls === 'magician') {
      // Megumin Explosion Nova: Catastrophic blast shockwave
      this.spawnExplosionNova(targetX, targetY - 25, '#ef4444');
      this.triggerScreenShake(34);
      this.triggerSpeedLines('#f59e0b', 30);
    } else if (cls === 'thief') {
      // 5-Shadow Clone Strike Arcs
      this.triggerScreenShake(22);
      this.triggerSpeedLines('#10b981', 25);
      for (let i = 0; i < 5; i++) {
        const startAng = (i / 5) * Math.PI * 2;
        this.slashArcs.push({
          x: targetX,
          y: targetY - 15,
          radius: 50 + (i % 2) * 15,
          startAngle: startAng,
          endAngle: startAng + Math.PI * 0.8,
          color: i % 2 === 0 ? '#10b981' : '#ec4899',
          width: 6,
          alpha: 1.0,
          decay: 0.025
        });
      }
    } else if (cls === 'cleric') {
      // Holy Cross Judgment: Divine light pillar from heaven
      this.triggerScreenShake(26);
      this.triggerSpeedLines('#fde047', 28);
      this.spawnMagicHit(targetX, targetY, true);
      this.spawnMagicLaserBeam(targetX, 0, targetX, targetY, '#fde047', 36);
    } else if (cls === 'spellblade' || cls.includes('spell') || cls.includes('ดาบเวท')) {
      // Horizontal Lightning Slicer: Screen-wide lightning slash
      this.triggerScreenShake(30);
      this.triggerSpeedLines('#38bdf8', 30);
      this.spawnStrikeHit(targetX, targetY);
      for (let i = 0; i < 50; i++) {
        this.particles.push({
          x: targetX + (Math.random() - 0.5) * 100,
          y: targetY - 30 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 6,
          color: Math.random() > 0.4 ? '#38bdf8' : '#ec4899',
          size: 3 + Math.random() * 5,
          alpha: 1.0,
          decay: 0.03
        });
      }
    }
  }

  // =========================================================================
  // 6. HIGH-ENERGY RADIANT MAGIC LASER BEAM
  // =========================================================================
  spawnMagicLaserBeam(casterX: number, casterY: number, targetX: number, targetY: number, color = '#c084fc', width = 16) {
    this.triggerScreenShake(18);
    this.triggerSpeedLines(color, 24);

    this.magicLaserBeams.push({
      casterX,
      casterY,
      targetX,
      targetY,
      color,
      width,
      alpha: 1.0,
      decay: 0.04,
      rings: 6
    });

    // Impact explosion particles at target
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? color : '#ffffff',
        size: 3 + Math.random() * 5,
        alpha: 1.0,
        decay: 0.035
      });
    }

    // Target stagger & flash
    this.monsterStaggerX = 20;
    this.monsterFlashAlpha = 0.95;
    this.monsterFlashColor = color;
  }

  // =========================================================================
  // 7. COMPANION WARP SUMMON PORTAL WITH LIGHT PILLAR
  // =========================================================================
  spawnCompanionSummonPortal(x: number, y: number, color = '#ec4899') {
    this.triggerScreenShake(12);
    this.triggerSpeedLines(color, 20);

    this.summonPortals.push({
      x,
      y,
      radius: 48,
      color,
      alpha: 1.0,
      decay: 0.016, // Lasts ~60 frames
      angle: 0,
      pillarHeight: 180
    });

    // Ascending sparkle particles & glowing motes
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: x + (Math.random() * 60 - 30),
        y: y + (Math.random() * 20 - 10),
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2 - Math.random() * 4,
        color: Math.random() > 0.4 ? color : '#fde047',
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.02,
        gravity: -0.05
      });
    }
  }

  // =========================================================================
  // 8. EXPLOSION NOVA SHOCKWAVE
  // =========================================================================
  spawnExplosionNova(x: number, y: number, color = '#f59e0b') {
    this.triggerScreenShake(22);
    this.triggerSpeedLines(color, 25);

    // Shockwave ring
    this.runicRings.push({
      x,
      y,
      radius: 20,
      color,
      alpha: 1.0,
      decay: 0.04,
      angle: 0,
      isNested: true
    });

    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? color : '#fbbf24',
        size: 4 + Math.random() * 5,
        alpha: 1.0,
        decay: 0.03,
        gravity: 0.12
      });
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

    // 10. Update Magic Laser Beams
    for (let i = this.magicLaserBeams.length - 1; i >= 0; i--) {
      const b = this.magicLaserBeams[i];
      b.alpha -= b.decay;
      if (b.alpha <= 0) {
        this.magicLaserBeams.splice(i, 1);
      }
    }

    // 11. Update Summon Portals
    for (let i = this.summonPortals.length - 1; i >= 0; i--) {
      const p = this.summonPortals[i];
      p.angle += 0.06;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.summonPortals.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, arenaWidth: number = 800, arenaHeight: number = 450) {
    // 0. Cinematic Vignette Dimming during Skill Cutscene
    if (this.cutsceneDimAlpha > 0) {
      ctx.save();
      // Banded dimming rather than a radial gradient: the arena is drawn at pixel scale, so a
      // screen-sized gradient would be the only soft ramp in the battle.
      pixelVignette(ctx, arenaWidth, arenaHeight, '#0f0208', 6, Math.min(0.85, this.cutsceneDimAlpha * 0.85));
      ctx.fillStyle = `rgba(0, 0, 0, ${this.cutsceneDimAlpha * 0.3})`;
      ctx.fillRect(0, 0, arenaWidth, arenaHeight);

      // Gothic Skill Title Banner
      if (this.activeCutscene) {
        ctx.font = 'bold 20px Silkscreen';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#e11d48';
        ctx.fillText(`⚡ ${this.activeCutscene.skillName.toUpperCase()} ⚡`, arenaWidth * 0.5, 60);

        this.renderSkillCinematic(ctx, arenaWidth, arenaHeight, this.activeCutscene);
      }
      ctx.restore();
    }

    // 1. Draw 2.5D Isometric Ground Cracks
    this.groundCracks.forEach(c => {
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${c.alpha})`;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#b91c1c';
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

      // Outer Runic Ring
      ctx.beginPath();
      pixelRing(ctx, 0, 0, r.radius, r.radius, ctx.strokeStyle, 1);
      ctx.stroke();

      // Inner Pentagram / Hex lines
      if (r.isNested) {
        ctx.beginPath();
        pixelRing(ctx, 0, 0, r.radius * 0.65, r.radius * 0.65, ctx.strokeStyle, 1);
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

    // 2.5 Draw Summon Portals & Rising Light Pillars
    this.summonPortals.forEach(p => {
      ctx.save();
      // Ground Runic Disc
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.48);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.lineWidth = 4;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      pixelRing(ctx, 0, 0, p.radius, p.radius, ctx.strokeStyle, 1);
      ctx.stroke();

      ctx.beginPath();
      pixelRing(ctx, 0, 0, p.radius * 0.7, p.radius * 0.7, ctx.strokeStyle, 1);
      ctx.stroke();

      // Rotating glyphs
      ctx.save();
      ctx.rotate(p.angle);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * p.radius * 0.7, Math.sin(a) * p.radius * 0.7);
        ctx.lineTo(Math.cos(a) * p.radius, Math.sin(a) * p.radius);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();

      // Rising Light Pillar: stepped bands from the base colour up to white, instead of a
      // three-stop gradient. A beam that fades by getting sparser reads as light; one that fades
      // by interpolating reads as a CSS effect.
      const bands = 8;
      const pillarX = p.x - p.radius * 0.6;
      const pillarW = Math.max(1, Math.round(p.radius * 1.2));
      for (let b = 0; b < bands; b++) {
        const t = b / bands;
        const y = p.y - p.pillarHeight * ((b + 1) / bands);
        const h = Math.max(1, Math.ceil(p.pillarHeight / bands));
        ctx.globalAlpha = p.alpha * 0.75 * (1 - t * 0.65);
        ctx.fillStyle = t < 0.4 ? p.color : '#ffffff';
        ctx.fillRect(Math.round(pillarX), Math.round(y), pillarW, h);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    // 3. Draw Diagonal Slash Arcs
    this.slashArcs.forEach(arc => {
      ctx.save();
      // A swept arc is stepped into integer segments along its own radius, so the blade edge is a
      // pixel staircase rather than a resampled curve, and the whole arc uses one colour instead
      // of a `shadowBlur` halo.
      const sweep = arc.endAngle - arc.startAngle;
      const segments = Math.max(4, Math.round((Math.abs(sweep) * arc.radius) / 3));
      const thickness = Math.max(1, Math.round(arc.width));
      ctx.globalAlpha = arc.alpha;
      ctx.fillStyle = arc.color;
      for (let i = 0; i <= segments; i++) {
        const a = arc.startAngle + (sweep * i) / segments;
        const x = arc.x + Math.cos(a) * arc.radius;
        const y = arc.y + Math.sin(a) * arc.radius;
        ctx.fillRect(Math.round(x - thickness / 2), Math.round(y - thickness / 2), thickness, thickness);
      }
      // A brighter core along the middle of the sweep, which is what a blade edge looks like.
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i <= segments; i += 2) {
        const a = arc.startAngle + (sweep * i) / segments;
        ctx.fillRect(
          Math.round(arc.x + Math.cos(a) * arc.radius),
          Math.round(arc.y + Math.sin(a) * arc.radius),
          1,
          1
        );
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    // 3.5 Draw Magic Laser Beams
    this.magicLaserBeams.forEach(b => {
      ctx.save();
      const dx = b.targetX - b.casterX;
      const dy = b.targetY - b.casterY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      ctx.translate(b.casterX, b.casterY);
      ctx.rotate(angle);

      // Outer Glow
      ctx.globalAlpha = b.alpha * 0.5;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2.2;
      ctx.shadowColor = b.color;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      // Intense Beam Body
      ctx.globalAlpha = b.alpha * 0.9;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      // White-hot core
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = b.width * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      // Spiral Energy Rings
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      const ringSpacing = 35;
      for (let rx = 20; rx < dist - 15; rx += ringSpacing) {
        ctx.beginPath();
        pixelRing(ctx, rx, 0, 8, b.width * 0.75, ctx.strokeStyle, 1);
        ctx.stroke();
      }

      // Muzzle flare
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      pixelDisc(ctx, 0, 0, b.width * 0.8, ctx.fillStyle);
      ctx.fill();

      // Target impact flare
      ctx.fillStyle = b.color;
      ctx.beginPath();
      pixelDisc(ctx, dist, 0, b.width * 1.5, ctx.fillStyle);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      pixelDisc(ctx, dist, 0, b.width * 0.7, ctx.fillStyle);
      ctx.fill();

      ctx.restore();
    });

    // 4. Draw Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      pixelDisc(ctx, p.x, p.y, p.size, ctx.fillStyle);
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

  private renderSkillCinematic(
    ctx: CanvasRenderingContext2D,
    arenaWidth: number,
    arenaHeight: number,
    cut: SkillCutscene
  ) {
    const cls = cut.classKey.toLowerCase();

    if (cls === 'magician') {
      // 1. Megumin Explosion Dome
      const progress = Math.min(1.0, cut.elapsed / 45);
      const maxR = 150;
      const currentR = maxR * Math.sin(progress * Math.PI * 0.5);

      ctx.save();
      // Blinding nuclear flash at impact start
      if (cut.elapsed < 10) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(10 - cut.elapsed) / 10 * 0.8})`;
        ctx.fillRect(0, 0, arenaWidth, arenaHeight);
      }

      // Expanding Fireball Core: concentric stepped discs rather than a five-stop radial
      // gradient. White hot at the centre, through gold and red to nothing, in four hard rings.
      const coreY = cut.targetY - 25;
      const coreRings: Array<[number, string, number]> = [
        [1.0, '#7f1d1d', 0.7],
        [0.78, '#ef4444', 0.85],
        [0.5, '#fef08a', 0.9],
        [0.22, '#ffffff', 0.95]
      ];
      for (const [k, colour, alpha] of coreRings) {
        pixelDisc(ctx, cut.targetX, coreY, Math.max(4, currentR * k), colour, alpha);
      }

      // Shockwave ring: two stepped rings, the outer one dashed so it reads as a wave front.
      pixelRing(ctx, cut.targetX, cut.targetY, currentR * 1.3, currentR * 0.55, '#fef08a', 3, true, cut.elapsed * 0.4);

      ctx.restore();
    } else if (cls === 'cleric') {
      // 2. Giant Radiant Cross descending from heaven
      const progress = Math.min(1.0, cut.elapsed / 22);
      const crossY = cut.targetY - 240 + (progress * 200);

      ctx.save();
      // Holy Light Pillar
      // Holy Light Pillar: a bright core band with two dimmer shoulders, instead of a horizontal
      // gradient. Hard vertical edges are what make it read as a shaft of light.
      ctx.fillStyle = '#fef08a';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(cut.targetX - 30, 0, 60, arenaHeight);
      ctx.globalAlpha = 0.32;
      ctx.fillRect(cut.targetX - 44, 0, 14, arenaHeight);
      ctx.fillRect(cut.targetX + 30, 0, 14, arenaHeight);
      ctx.globalAlpha = 1;

      // Giant Radiant Golden Cross
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#eab308';

      // Vertical beam
      ctx.fillRect(cut.targetX - 12, crossY, 24, 150);
      // Horizontal crossbar
      ctx.fillRect(cut.targetX - 55, crossY + 38, 110, 22);

      // Radiant Holy Halo Rings
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      pixelRing(ctx, cut.targetX, crossY + 49, 36, 36, ctx.strokeStyle, 1);
      ctx.stroke();

      ctx.restore();
    } else if (cls === 'warrior' || cut.isDarkling) {
      // 3. Colossal Phantom Broadsword
      const progress = Math.min(1.0, cut.elapsed / 18);
      const swordAngle = -Math.PI * 0.35 + (progress * Math.PI * 0.45);
      const swordDropY = -120 + progress * (cut.targetY + 80);

      ctx.save();
      ctx.translate(cut.targetX, Math.min(cut.targetY, swordDropY));
      ctx.rotate(swordAngle);

      // Phantom Giant Broadsword Blade
      ctx.fillStyle = cut.isDarkling ? '#be123c' : '#38bdf8';
      ctx.shadowColor = cut.isDarkling ? '#e11d48' : '#60a5fa';

      // Blade (Colossal Titan Size!)
      ctx.beginPath();
      ctx.moveTo(-18, -130);
      ctx.lineTo(18, -130);
      ctx.lineTo(16, 30);
      ctx.lineTo(0, 55); // Tip impaling
      ctx.lineTo(-16, 30);
      ctx.closePath();
      ctx.fill();

      // Crossguard & Hilt
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-35, -135, 70, 14);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -175, 12, 40);

      ctx.restore();
    } else if (cls === 'thief') {
      // 4. 5-Shadow Clones surrounding target
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + (cut.elapsed * 0.05);
        const dist = Math.max(30, 95 - (cut.elapsed * 1.6));
        const cloneX = cut.targetX + Math.cos(angle) * dist;
        const cloneY = cut.targetY + Math.sin(angle) * (dist * 0.5);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
        ctx.shadowColor = '#10b981';

        ctx.beginPath();
        pixelDisc(ctx, cloneX, cloneY - 20, 10, ctx.fillStyle);
        ctx.fill();

        ctx.fillRect(cloneX - 7, cloneY - 10, 14, 20);

        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cloneX, cloneY);
        ctx.lineTo(cut.targetX, cut.targetY);
        ctx.stroke();
      }
      ctx.restore();
    } else if (cls === 'spellblade' || cls.includes('spell') || cls.includes('ดาบเวท')) {
      // 5. Screen-Wide Horizontal Lightning Slicer
      const waveY = cut.targetY - 20;

      ctx.save();
      // Blinding horizontal lightning energy beam across full screen width
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 14 + Math.sin(cut.elapsed * 0.5) * 6;
      ctx.shadowColor = '#ec4899';

      ctx.beginPath();
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= arenaWidth; x += 40) {
        const jitter = (Math.random() - 0.5) * 16;
        ctx.lineTo(x, waveY + jitter);
      }
      ctx.stroke();

      // White core beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, waveY);
      ctx.lineTo(arenaWidth, waveY);
      ctx.stroke();

      // Lightning branches
      for (let k = 0; k < 6; k++) {
        const rx = (cut.elapsed * 55 + k * 140) % arenaWidth;
        ctx.strokeStyle = k % 2 === 0 ? '#ec4899' : '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(rx, waveY);
        ctx.lineTo(rx + (Math.random() - 0.5) * 30, waveY - 45);
        ctx.lineTo(rx + (Math.random() - 0.5) * 50, waveY - 70);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

export const combatVFX = new CombatVFXEngine();
