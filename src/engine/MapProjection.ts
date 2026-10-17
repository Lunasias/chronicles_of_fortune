/** Fit arbitrarily large continents or an isolated dungeon into a HUD map. */
export function mapProjection(points: readonly { gx: number; gy: number }[], width: number, height: number, padding = 8) {
  const minX = points.length ? Math.min(...points.map(p => p.gx)) : 0, minY = points.length ? Math.min(...points.map(p => p.gy)) : 0;
  const maxX = Math.max(...points.map(p => p.gx), minX + 1), maxY = Math.max(...points.map(p => p.gy), minY + 1);
  const scale = Math.max(.01, Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY)));
  const ox = (width - (maxX - minX) * scale) / 2, oy = (height - (maxY - minY) * scale) / 2;
  return (gx: number, gy: number) => ({ x: Math.round(ox + (gx - minX) * scale), y: Math.round(oy + (gy - minY) * scale) });
}
