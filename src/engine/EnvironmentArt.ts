/** Coarse, authored pixel clusters used to connect detailed sprites to their environment. */
export function drawPixelRidge(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, offset = 0, layer = 0) {
  ctx.fillStyle = color;
  const peaks = [19, 12, 4, 9, 18, 25, 16, 7, 0, 8, 22, 17, 11, 21, 28, 19];
  for (let x = -16; x < w + 16; x += 8) {
    const u = ((x + offset + layer * 97) / 72 % peaks.length + peaks.length) % peaks.length;
    const i = Math.floor(u), t = u - i;
    const ridge = peaks[i] * (1 - t) + peaks[(i + 1) % peaks.length] * t;
    const y = Math.round((h * .54 + ridge * 4 + layer * 65) / 4) * 4;
    ctx.fillRect(x, y, 8, Math.max(0, h - y));
  }
}

export function drawDungeonRoom(ctx: CanvasRenderingContext2D, w: number, h: number, biome: string) {
  const ice = biome === 'snow', fire = biome === 'volcano';
  const ink = ice ? '#1d303e' : fire ? '#241d27' : '#171f2e';
  const stone = ice ? '#355165' : fire ? '#433238' : '#2a3545';
  const light = ice ? '#7398ac' : fire ? '#b36549' : '#516378';
  const wallH = Math.round(h * .42 / 8) * 8;
  ctx.fillStyle = ink; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < wallH; y += 32) for (let x = -48; x < w + 48; x += 96) {
    const xx = x + (y % 64 ? 48 : 0), variant = Math.abs((x / 48 + y / 16) % 3);
    ctx.fillStyle = stone; ctx.fillRect(xx + 2, y + 2, 92, 28);
    ctx.fillStyle = light; ctx.globalAlpha = .16 + variant * .04; ctx.fillRect(xx + 4, y + 3, 86, 2); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = stone; ctx.fillRect(0, wallH, w, 12);
  ctx.fillStyle = light; ctx.fillRect(0, wallH, w, 3);
  for (let x = 60; x < w; x += 240) {
    ctx.fillStyle = ink; ctx.fillRect(x - 14, 0, 36, wallH + 16);
    ctx.fillStyle = stone; ctx.fillRect(x - 10, 0, 25, wallH + 10);
    ctx.fillStyle = light; ctx.fillRect(x - 10, 0, 3, wallH + 8);
    ctx.fillStyle = '#1b202b'; ctx.fillRect(x - 12, wallH - 30, 32, 7);
    ctx.fillStyle = '#9d7858'; ctx.fillRect(x + 1, wallH - 89, 6, 23);
    ctx.fillStyle = ice ? '#76c7d2' : '#dd9e56'; ctx.fillRect(x - 2, wallH - 100, 12, 14);
    ctx.fillStyle = ice ? '#c5e8df' : '#f1d5a0'; ctx.fillRect(x + 1, wallH - 104, 6, 13);
  }
  for (let y = wallH + 18; y < h; y += 48) for (let x = 0; x < w; x += 96) {
    ctx.fillStyle = stone; ctx.globalAlpha = .22;
    ctx.fillRect(x + (y % 96 ? 40 : 0), y, 68, 2); ctx.fillRect(x + 64, y, 2, 16);
  }
  ctx.globalAlpha = 1;
}

export function drawGroundClusters(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number, top: string, accent: string) {
  // Larger patches break repetition; the middle remains quiet for combat readability.
  ctx.fillStyle = top; ctx.globalAlpha = .7;
  for (let i = 0; i < 23; i++) {
    const x = (i * 197 + 43) % Math.max(1, w), y = horizon + 20 + (i * 83) % Math.max(1, h - horizon - 20);
    const width = 40 + i % 4 * 24;
    for (let row = 0; row < 5; row++) ctx.fillRect(x - width / 2 + row * 4, y + row * 4, width - row * 8, 4);
  }
  ctx.globalAlpha = 1;
  // Irregular earth lip instead of a ruler-straight cut between sky and floor.
  for (let x = 0; x < w; x += 12) {
    const rise = [2, 4, 2, 6, 4, 2, 0][Math.floor(x / 12) % 7];
    ctx.fillStyle = top; ctx.fillRect(x, horizon - rise, 12, rise + 3);
    if (x % 60 === 0) { ctx.fillStyle = accent; ctx.globalAlpha = .25; ctx.fillRect(x + 2, horizon + 3, 9, 2); ctx.globalAlpha = 1; }
  }
}

export function drawRegionalProps(ctx: CanvasRenderingContext2D, w: number, horizon: number, biome: string) {
  const metal = biome === 'steampunk', masonry = ['castle', 'sakura_shrine', 'celestial'].includes(biome);
  const sand = biome === 'desert', ice = biome === 'snow';
  for (let i = 0; i < 6; i++) {
    const x = Math.round(w * (i < 3 ? .06 + i * .055 : .83 + (i - 3) * .055));
    const y = horizon + 24 + (i % 3) * 12;
    if (metal) {
      ctx.fillStyle = '#393d40'; ctx.fillRect(x, y - 65, 15, 65);
      ctx.fillStyle = '#8d775b'; ctx.fillRect(x + 2, y - 63, 4, 61);
      ctx.fillRect(x - 5, y - 52, 25, 5); ctx.fillRect(x - 5, y - 20, 25, 5);
      ctx.fillStyle = '#b29c6d'; ctx.fillRect(x + 2, y - 50, 3, 3);
    } else if (masonry) {
      ctx.fillStyle = '#34414a'; ctx.fillRect(x - 10, y - 44, 26, 44);
      ctx.fillStyle = '#71817f'; ctx.fillRect(x - 12, y - 48, 30, 7); ctx.fillRect(x - 14, y - 4, 34, 6);
      ctx.fillStyle = '#a1aa93'; ctx.fillRect(x - 9, y - 39, 3, 31);
    } else {
      ctx.fillStyle = ice ? '#849b9e' : sand ? '#a39070' : '#465453';
      ctx.fillRect(x - 13, y - 12, 28, 12); ctx.fillRect(x - 8, y - 20, 18, 10);
      ctx.fillStyle = ice ? '#d0dcd3' : sand ? '#c7b28a' : '#78847a'; ctx.fillRect(x - 8, y - 19, 12, 4);
      if (!ice && !sand) {
        ctx.fillStyle = biome === 'volcano' ? '#b57248' : '#7b9065';
        ctx.fillRect(x + 19, y - 6, 3, 8); ctx.fillRect(x + 23, y - 9, 2, 11);
      }
    }
  }
}
