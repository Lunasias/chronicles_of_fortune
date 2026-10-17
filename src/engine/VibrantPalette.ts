/** Grade cached environment textures, preserving their exact pixel grid. */
export function vibrantChannel(r: number, g: number, b: number, channel: number): number {
  const luma = r * .2126 + g * .7152 + b * .0722;
  return Math.max(0, Math.min(255, Math.round((luma + ([r, g, b][channel] - luma) * 1.28) * 1.06)));
}
export function enrichEnvironmentPixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (let c = 0; c < 3; c++) data[i + c] = vibrantChannel(r, g, b, c);
  }
}
