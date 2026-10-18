import { pixelRing, pixelStroke } from './PixelFx';
import { resolveCombatArt, generatedCombatArt, type CombatArtOwner } from './GeneratedCombatArt';
import { BattleEffects } from './BattleEffects';
import { magicElementForJob } from './MagicArt';
import { prefersReducedMotion, graphicsPreferences } from '../ui/GraphicsSettings';
import { MAGIC_PALETTES, type MagicElement } from './MagicArt';

/** Fit whole-pixel type, then ellipsize; never stretch finished text to a fractional scale. */
export function fitEffectText(ctx: CanvasRenderingContext2D, text: string, width: number, maxSize: number, family = 'Silkscreen, monospace'): string {
  let size = Math.max(9, Math.floor(maxSize));
  const available = Math.max(12, width);
  ctx.font = `bold ${size}px ${family}`;
  while (size > 9 && ctx.measureText(text).width > available) ctx.font = `bold ${--size}px ${family}`;
  const chars = Array.from(text);
  let fitted = text;
  while (chars.length && ctx.measureText(fitted).width > available) { chars.pop(); fitted = chars.join('') + '…'; }
  return fitted;
}

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
  shape?: 'ember' | 'shard' | 'spark' | 'leaf' | 'cross' | 'wisp';
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

export interface CutInBanner {
  portrait?: HTMLCanvasElement;
  companionPortrait?: HTMLCanvasElement;
  title: string;
  subtitle: string;
  avatar: string;
  color: string;
  companionAvatar?: string;
  companionName?: string;
  durationFrames: number;
  elapsed: number;
}

export class CombatVFXEngine {
  public readonly choreography = new BattleEffects();
  public owner:CombatArtOwner={};
  setOwner(owner:CombatArtOwner){this.owner=owner;}
  preloadOwner(owner:CombatArtOwner){return generatedCombatArt.preload([resolveCombatArt(owner),'common_parry','common_slash','common_summon','common_heal']);}

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

  // Impact Flash (White-hot hitfreeze impact frame)
  public impactFlashAlpha = 0;
  public impactFlashColor = '#ffffff';

  // Brown Dust 2 Style Cut-In Action Banner
  public activeCutInBanner: CutInBanner | null = null;

  constructor() {}

  reset() {
    this.choreography.clear(); this.owner={};
    this.particles.length = this.slashArcs.length = this.groundCracks.length = this.runicRings.length = 0;
    this.floatingTexts.length = this.magicLaserBeams.length = this.summonPortals.length = 0;
    this.activeCutscene = null; this.activeCutInBanner = null;
    this.hitstopTimer = this.screenShakeAmount = this.screenShakeX = this.screenShakeY = 0;
    this.monsterStaggerX = this.monsterStaggerY = this.monsterFlashAlpha = this.heroStaggerX = this.heroFlashAlpha = 0;
    this.cutsceneDimAlpha = this.speedLinesAlpha = this.speedLinesTimer = this.impactFlashAlpha = 0;
  }

  spawnGuard(x: number, y: number, magic = false) {
    this.choreography.emit('guard', x, y, {color: magic ? '#c7afff' : '#84dbef'});
  }


  triggerHitstop(frames = 4) {
    // Keep choreography continuous; impact is communicated by pose, sound and shake.
    this.hitstopTimer = 0;
  }

  triggerScreenShake(intensity = 14) {
    this.screenShakeAmount = prefersReducedMotion() ? 0 : Math.min(18, intensity);
  }

  triggerSpeedLines(color = '#ffffff', durationFrames = 18) {
    this.speedLinesColor = color;
    this.speedLinesAlpha = 1.0;
    this.speedLinesTimer = durationFrames;
  }

  triggerImpactFlash(color = '#ffffff', alpha = 0.85) {
    this.impactFlashColor = color;
    this.impactFlashAlpha = alpha;
  }

  triggerCutInBanner(
    title: string,
    subtitle: string,
    avatar: string,
    color = '#f59e0b',
    companionAvatar?: string,
    companionName?: string,
    durationFrames = 42,
    portrait?: HTMLCanvasElement,
    companionPortrait?: HTMLCanvasElement
  ) {
    this.activeCutInBanner = {
      title,
      subtitle,
      avatar,
      color,
      companionAvatar,
      companionName,
      durationFrames,
      elapsed: 0, portrait, companionPortrait
    };
    this.triggerSpeedLines(color, durationFrames);
    this.triggerScreenShake(10);
    this.triggerHitstop(5);
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
    let displayText = text;

    if (type === 'crit') {
      displayText = `⭐ ${text} (CRIT!)`;
      color = '#fbbf24';
      shadowColor = '#b45309';
      size = 25;
      vy = -5.4;
      this.triggerHitstop(6);
      this.triggerScreenShake(14);
    } else if (type === 'magic') {
      displayText = `🔮 ${text}`;
      color = '#c084fc';
      shadowColor = '#581c87';
      size = 21;
      vy = -4.2;
    } else if (type === 'counter') {
      displayText = `🛡️ PARRY! ${text}`;
      color = '#38bdf8';
      shadowColor = '#0369a1';
      size = 23;
      vy = -4.8;
      this.triggerHitstop(6);
    } else if (type === 'heal') {
      displayText = `💖 +${text}`;
      color = '#4ade80';
      shadowColor = '#15803d';
      size = 20;
      vy = -3.5;
    } else if (type === 'miss') {
      displayText = `💨 MISS`;
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
      text: displayText,
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
    this.choreography.emit('slash', monsterX, monsterY, {fromX: monsterX + (isRightToLeft ? 100 : -100),artId:resolveCombatArt(this.owner,'slash'),power:.7});
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
    this.choreography.emit('smash', monsterX, monsterY, {power: 1.35,artId:resolveCombatArt(this.owner,'smash')});
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
  spawnMagicHit(monsterX: number, monsterY: number, isHeal = false, element: MagicElement = 'arcane') {
    this.choreography.emit(isHeal ? 'heal' : element, monsterX, monsterY, {power: isHeal ? 1 : 1.2,artId:isHeal?'common_heal':resolveCombatArt(this.owner,element)});
    const palette = MAGIC_PALETTES[isHeal ? 'nature' : element];
    this.triggerScreenShake(isHeal ? 5 : 18);

    // Nested 2.5D Isometric Runic Ring
    this.runicRings.push({
      x: monsterX,
      y: monsterY + 32,
      radius: 46,
      color: palette[0],
      angle: 0,
      alpha: 1.0,
      decay: 0.022,
      isNested: true
    });

    // Swirling magical void souls
    const pCount = prefersReducedMotion() ? 10 : isHeal ? 24 : 36;
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.particles.push({
        x: monsterX,
        y: monsterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isHeal || element === 'flame' ? 2.5 : 0),
        color: palette[i % palette.length],
        size: 2 + i % 4,
        shape: isHeal || element === 'nature' ? 'leaf' : element === 'flame' ? 'ember' : element === 'frost' ? 'shard' : element === 'storm' ? 'spark' : element === 'holy' ? 'cross' : 'wisp',
        alpha: 1.0,
        decay: 0.03,
        gravity: isHeal || element === 'flame' ? -0.12 : element === 'frost' ? .15 : 0.04
      });
    }

    if (!isHeal) {
      this.monsterStaggerX = 20;
      this.monsterFlashAlpha = 0.95;
      this.monsterFlashColor = palette[1];
    }
  }

  // =========================================================================
  // 4. COUNTER: PARRY DIAMOND SPARK & REVERSE CROSS-SLASH
  // =========================================================================
  spawnCounterHit(clashX: number, clashY: number, attackerX: number, attackerY: number) {
    this.choreography.emit('parry', clashX, clashY, {power: 1.3});
    this.choreography.emit('slash', attackerX, attackerY, {delay: 8, fromX: clashX,artId:resolveCombatArt(this.owner,'slash')});
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

    this.choreography.emit(isBoss ? 'nova' : isMagic ? 'shadow' : 'slash', targetX, targetY, {power: isBoss ? 1.7 : 1, fromX,artId:resolveCombatArt(this.owner.name?this.owner:{name:monsterName},isMagic?'shadow':'slash')});
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
    const job = classKey.toLowerCase();
    const kind = isDarkling ? 'shadow' : /warrior|knight|fighter|duelist|gladiator/.test(job) ? 'smash' : /thief|rogue/.test(job) ? 'slash' : /magician|mage|sorcer|archmage/.test(job) ? 'nova' : magicElementForJob(job);
    this.choreography.emit(kind, targetX, targetY, {power: 1.75, duration:42, fromX: casterX, fromY: casterY,artId:resolveCombatArt(this.owner.name||this.owner.companionKey||this.owner.job?this.owner:{job:classKey,isDarkling})});
    this.activeCutscene = {
      skillName,
      casterX,
      casterY,
      targetX,
      targetY,
      classKey,
      isDarkling,
      totalDuration: 42,
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

    // The selected owner PNG supplies the whole signature, including its impact and aftermath.
  }

  // =========================================================================
  // 6. HIGH-ENERGY RADIANT MAGIC LASER BEAM
  // =========================================================================
  spawnMagicLaserBeam(casterX: number, casterY: number, targetX: number, targetY: number, color = '#c084fc', width = 16) {
    this.triggerScreenShake(18);
    this.triggerSpeedLines(color, 24);

    this.choreography.emit('beam', targetX, targetY, {fromX: casterX, fromY: casterY, color, power: Math.min(1.5,width/16),artId:this.owner.companionKey?resolveCombatArt(this.owner):'common_beam'});
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
    this.choreography.emit('summon', x, y, {color, power: 1.4});
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
    this.choreography.emit('nova', x, y, {color, power: 1.65});
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
    // Bound accumulated legacy debris as well as the new timeline during multi-hit chains.
    const cap = prefersReducedMotion() ? 120 : graphicsPreferences.quality === 'balanced' ? 280 : 600;
    if (this.floatingTexts.length > 60) this.floatingTexts.splice(0,this.floatingTexts.length-60);
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
    for (const list of [this.slashArcs, this.groundCracks, this.runicRings, this.magicLaserBeams, this.summonPortals]) if (list.length > 40) list.splice(0,list.length-40);

    this.choreography.update();

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

    // 4.1 Update Impact Flash
    if (this.impactFlashAlpha > 0) {
      this.impactFlashAlpha -= 0.20;
      if (this.impactFlashAlpha < 0) this.impactFlashAlpha = 0;
    }

    // 4.2 Update Cut-In Banner
    if (this.activeCutInBanner) {
      this.activeCutInBanner.elapsed++;
      if (this.activeCutInBanner.elapsed >= this.activeCutInBanner.durationFrames) {
        this.activeCutInBanner = null;
      }
    }

    // 5. Update Cutscene
    if (this.activeCutscene) {
      this.activeCutscene.elapsed++;
      this.cutsceneDimAlpha = 0;
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
    // BattleUI owns the action title. No duplicate text or banded frame overlay.
    this.choreography.render(ctx, arenaWidth, arenaHeight, prefersReducedMotion(), graphicsPreferences.quality === 'balanced');

    // 5. Draw Bouncing Floating Combat Numbers & Text
    this.floatingTexts.forEach(ft => {
      ctx.save();
      const text = fitEffectText(ctx, ft.text, arenaWidth - 24, ft.size);
      const half = ctx.measureText(text).width / 2;
      const x = Math.round(Math.max(half + 10, Math.min(arenaWidth - half - 10, ft.x))), y = Math.round(ft.y);
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, ft.alpha);
      // Dark outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, x, y);
      // Colored core with glow
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.shadowColor;
      ctx.fillText(text, x, y);
      ctx.restore();
    });

    // 6. Action Speed Lines (Anime Dynamic Slash Overlay)
    // The PNG attack art supplies speed trails; no generated geometry overlay.

    // 7. Brown Dust 2 Style Cut-In Action Banner
    this.renderCutInBanner(ctx, arenaWidth, arenaHeight);

    // 8. White-Hot Impact Flash Frame
    this.renderImpactFlash(ctx, arenaWidth, arenaHeight);
  }

  private renderCutInBanner(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const banner = this.activeCutInBanner;
    if (!banner) return;

    ctx.save();
    const progress = Math.min(1.0, banner.elapsed / Math.max(1, banner.durationFrames));
    let slideX = 0;
    let alpha = 1.0;
    if (progress < 0.2) {
      const p = progress / 0.2;
      slideX = (1 - p) * -w * 0.4;
      alpha = p;
    } else if (progress > 0.85) {
      const p = (progress - 0.85) / 0.15;
      slideX = p * w * 0.4;
      alpha = 1 - p;
    }

    const bannerY = h * 0.42;
    const bannerH = 76;

    // Dark sleek backdrop with crisp geometric borders
    ctx.globalAlpha = Math.min(1.0, alpha * 0.95);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, bannerY - bannerH / 2, w, bannerH);

    // Top and bottom neon accent rails
    ctx.fillStyle = banner.color || '#f59e0b';
    ctx.fillRect(0, bannerY - bannerH / 2, w, 3);
    ctx.fillRect(0, bannerY + bannerH / 2 - 3, w, 3);

    for (let x = -bannerH; x < w + bannerH; x += 32) {
      const drift = banner.elapsed * 2 % 32;
      pixelStroke(ctx, x + drift + 20, bannerY - bannerH / 2, x + drift - 20, bannerY + bannerH / 2, 10, '#c0c6b6', alpha * .05);
    }
    ctx.globalAlpha = alpha;
    const avatarX = Math.round((w < 600 ? 10 : w * .13) + slideX);
    if (banner.portrait) ctx.drawImage(banner.portrait, 48, 32, 48, 48, avatarX, Math.round(bannerY - 24), 48, 48);
    else pixelRing(ctx, avatarX + 24, Math.round(bannerY), 14, 14, banner.color, 2);
    if (banner.companionPortrait) ctx.drawImage(banner.companionPortrait, avatarX + 52, Math.round(bannerY - 32));
    const textX = avatarX + (banner.companionPortrait ? 124 : 64);
    const available = Math.max(50, w - (w < 600 ? 10 : w * .13) - (banner.companionPortrait ? 124 : 64) - 14);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const title = fitEffectText(ctx, banner.title.toUpperCase(), available, w < 600 ? 15 : 22);
    ctx.fillStyle = '#eee4c8'; ctx.fillText(title, textX, Math.round(bannerY - 13));
    const subtitle = fitEffectText(ctx, banner.subtitle, available, 12, 'Kanit, sans-serif');
    ctx.fillStyle = banner.color || '#dbc48e'; ctx.fillText(subtitle, textX, Math.round(bannerY + 15));

    ctx.restore();
  }

  private renderImpactFlash(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.impactFlashAlpha <= 0.01 || prefersReducedMotion()) return;
    ctx.save();
    ctx.fillStyle = this.impactFlashColor;
    ctx.globalAlpha = Math.min(.18, this.impactFlashAlpha);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

}

export const combatVFX = new CombatVFXEngine();
