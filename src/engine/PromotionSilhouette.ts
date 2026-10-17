import { JOB_VISUALS } from './JobVisuals';

/** Native-pixel outer garments keep promotions recognizable without covering face/weapon art. */
export function drawPromotionSilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, job: string, back: boolean) {
  const p = JOB_VISUALS[job];
  if (!p) return;
  const high = p.tier === 3;
  const box = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h);
  };
  const colors: Record<string, [string, string]> = {
    paladin: ['#3a5967', '#d5c58d'], berserker: ['#673d42', '#bc9674'],
    archmage: ['#4b416a', '#aa9ab9'], necromancer: ['#344e4e', '#b3b89c'],
    ninja: ['#343f56', '#b77570'], assassin: ['#493850', '#a582a8'],
    high_priest: ['#a79a79', '#efe1b9'], saint: ['#a6b6b5', '#e3dfbd'], rune_master: ['#425b69', '#a8d1c4']
  };
  const [shade, trim] = colors[p.style];
  if (p.style === 'ninja') {
    for (let i = 0; i < (high ? 8 : 4); i++) { box(-15 - i * 2, -15 + i, 8, 3, shade); box(11 + i * 2, -13 + i, 8, 3, trim); }
  } else if (p.style === 'berserker') {
    for (const sign of [-1, 1]) {
      box(sign * 15 - 5, -17, 10, high ? 20 : 12, shade);
      for (let i = 0; i < (high ? 4 : 2); i++) box(sign * (18 + i * 3) - 2, -21 + i * 4, 4, 7, trim);
    }
  } else if (p.style === 'saint' && high) {
    for (const sign of [-1, 1]) for (let i = 0; i < 6; i++) {
      box(sign * (13 + i * 3) - 3, -17 + i * 3, 6, 18 - i, '#586c70');
      box(sign * (13 + i * 3) - 2, -18 + i * 3, 4, 14 - i, trim);
    }
  } else {
    const width = high ? 23 : 16;
    for (let row = 0; row < 8; row++) {
      const half = Math.min(width, 10 + row * 2);
      const yy = -12 + row * 4;
      box(-half - 1, yy, half * 2 + 2, 4, '#24313e');
      box(-half, yy, half * 2, 3, shade);
      box(-half, yy, 2, 3, trim); box(half - 2, yy, 2, 3, trim);
      if (back) box(-1, yy, 2, 3, trim);
    }
    if (high && p.style === 'necromancer') {
      for (const sign of [-1, 1]) { box(sign * 18 - 3, -29, 6, 17, trim); box(sign * 22 - 2, -34, 4, 10, trim); }
    } else if (high && p.style === 'assassin') {
      box(25, -34, 2, 54, '#a09a83'); box(11, -36, 18, 3, '#c0c8c0'); box(8, -33, 5, 7, '#7c9799');
    } else if (high && p.style === 'archmage') {
      box(-13, -32, 26, 3, trim); box(-8, -38, 16, 5, shade); box(-3, -45, 6, 7, trim);
    } else if (high && p.style === 'high_priest') {
      box(-9, -33, 18, 5, trim); box(-6, -41, 12, 8, trim); box(-2, -43, 4, 14, '#b69a63');
    } else if (high && p.style === 'paladin') {
      box(-15, -22, 30, 4, trim); box(-18, -27, 6, 11, shade); box(12, -27, 6, 11, shade);
    } else if (high && p.style === 'rune_master') {
      for (const sign of [-1, 1]) { box(sign * 25 - 3, -22, 6, 18, shade); box(sign * 25 - 1, -20, 2, 14, trim); box(sign * 25 - 4, -15, 8, 2, trim); }
    }
  }
}
