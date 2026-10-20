// Original Fortuna score and foley. No recordings, remote services or licensed samples.
// Deterministic PCM assets; regenerate with `npm run gen:audio`.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const RATE = 22050;
const ROOT = 'public/audio/v2';
fs.mkdirSync(ROOT, { recursive: true });
let seed = 20261020;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const tau = Math.PI * 2;
const assets = [];
function buffer(seconds) { return [new Float32Array(Math.round(seconds * RATE)), new Float32Array(Math.round(seconds * RATE))]; }
function add(out, at, duration, signal, volume = 1, pan = 0, loop = false) {
  const start = Math.round(at * RATE), frames = Math.round(duration * RATE);
  const left = Math.sqrt((1 - pan) / 2), right = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < frames; i++) {
    let index = start + i;
    if (loop) index %= out[0].length;
    else if (index >= out[0].length) break;
    const t = i / RATE, x = signal(t, i / frames) * volume;
    out[0][index] += x * left; out[1][index] += x * right;
  }
}
function instrument(kind, frequency, duration) {
  return (t, p) => {
    const phase = tau * frequency * t;
    const attack = Math.min(1, t / .012);
    const release = Math.min(1, (duration - t) / .09);
    if (kind === 'lute') return attack * Math.exp(-t * 7) * (Math.sin(phase) + .32 * Math.sin(phase * 2) + .15 * Math.sin(phase * 3));
    if (kind === 'bell') return attack * Math.exp(-t * 4) * (Math.sin(phase) + .28 * Math.sin(phase * 2.76) * Math.exp(-t * 8));
    if (kind === 'bass') return attack * release * (Math.sin(phase) + .15 * Math.sin(phase * 2));
    if (kind === 'strings') return attack * release * Math.sin(Math.PI * p) * (Math.sin(phase + .012 * Math.sin(tau * 4 * t)) + .18 * Math.sin(phase * 3));
    return attack * release * (Math.sin(phase + .025 * Math.sin(tau * 5 * t)) + .12 * Math.sin(phase * 2));
  };
}
function write(name, out, kind, loop = false, metadata = {}) {
  let peak = 0;
  for (const channel of out) for (const x of channel) peak = Math.max(peak, Math.abs(x));
  const gain = .78 / Math.max(peak, .001);
  const frames = out[0].length;
  // Bring the first/last samples to the same midpoint, avoiding a loop-boundary click.
  for (const channel of out) {
    if (loop) {
      const midpoint = (channel[0] + channel[frames - 1]) / 2;
      for (let i = 0; i < 64; i++) {
        const amount = i / 64;
        channel[i] = midpoint * (1 - amount) + channel[i] * amount;
        channel[frames - 1 - i] = midpoint * (1 - amount) + channel[frames - 1 - i] * amount;
      }
    } else for (let i = 0; i < Math.min(256, frames / 2); i++) {
      channel[i] *= i / 256; channel[frames - i - 1] *= i / 256;
    }
  }
  const bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  let sum = 0;
  for (let i = 0; i < frames; i++) for (let c = 0; c < 2; c++) {
    const sample = Math.max(-1, Math.min(1, out[c][i] * gain));
    sum += sample * sample;
    bytes.writeInt16LE(Math.round(sample * 32767), 44 + i * 4 + c * 2);
  }
  fs.writeFileSync(path.join(ROOT, `${name}.wav`), bytes);
  assets.push({ id: name, file: `${name}.wav`, kind, loop, duration: frames / RATE, sampleRate: RATE, channels: 2,
    rms: Math.sqrt(sum / (frames * 2)), sha256: crypto.createHash('sha256').update(bytes).digest('hex'), ...metadata });
}
const scores = {
  title: [84, 62, 'flute', [0, 4, 5, 3], [7, 9, 12, 11, 9, 7, 4, 2]],
  overworld: [104, 62, 'lute', [0, 5, 3, 4], [0, 4, 7, 9, 7, 4, 2, 4]],
  battle: [144, 57, 'flute', [0, 5, 3, 6], [0, 7, 3, 7, 10, 7, 5, 3]],
  boss: [120, 50, 'strings', [0, 1, 5, 4], [0, 1, 7, 8, 7, 5, 3, 1]],
  darkling: [88, 45, 'strings', [0, 1, 3, 1], [0, 1, 3, 7, 6, 3, 1, 0]],
  casino: [128, 60, 'bell', [0, 4, 7, 5], [0, 4, 7, 11, 9, 7, 4, 2]],
  frostpeak: [88, 65, 'bell', [0, 5, 7, 3], [12, 7, 4, 9, 7, 4, 2, 0]],
  abyss: [72, 48, 'flute', [0, 3, 1, 5], [0, 3, 7, 10, 8, 7, 3, 1]],
  sunfire: [116, 57, 'lute', [0, 1, 5, 4], [0, 1, 4, 7, 8, 7, 4, 1]],
  town: [96, 60, 'lute', [0, 5, 7, 0], [4, 7, 9, 7, 4, 2, 0, 2]],
};
for (const [name, [bpm, key, lead, chords, melody]] of Object.entries(scores)) {
  const beat = 60 / bpm, duration = beat * 32, out = buffer(duration);
  const minor = ['battle', 'boss', 'darkling', 'abyss', 'sunfire'].includes(name);
  for (let bar = 0; bar < 8; bar++) {
    const root = key + chords[bar % 4], at = bar * beat * 4;
    for (const [n, offset] of [0, minor ? 3 : 4, 7].entries()) {
      add(out, at, beat * 4.6, instrument('strings', hz(root + offset), beat * 4.6), .10, n * .55 - .55, true);
    }
    for (let step = 0; step < 8; step++) {
      const when = at + step * beat / 2;
      const note = key + 12 + melody[(step + (bar % 2) * 2) % 8] + (bar >= 4 && step === 6 ? 12 : 0);
      if (step !== 7 || bar % 2 === 0) add(out, when, beat * 1.1, instrument(lead, hz(note), beat * 1.1), .26, .18, true);
      add(out, when, beat * .8, instrument('lute', hz(root + [0, 7, 12, minor ? 15 : 16][step % 4]), beat * .8), .12, -.35, true);
      if (step % 2 === 0) add(out, when, beat * .85, instrument('bass', hz(root - 12), beat * .85), .3, 0, true);
      if (['battle', 'boss', 'casino', 'sunfire', 'overworld'].includes(name)) {
        if (step % 4 === 0) add(out, when, .22, t => Math.sin(tau * (50 * t + 1.6 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 22), .35, 0, true);
        if (step % 4 === 2) add(out, when, .13, t => (random() * 2 - 1) * Math.exp(-t * 35), .12, -.15, true);
      }
    }
  }
  // Quiet rhythmic echo, with the tail wrapped into the start of the loop.
  const dry = out.map(c => c.slice());
  const delay = Math.round(beat * .75 * RATE);
  for (let i = 0; i < out[0].length; i++) for (let c = 0; c < 2; c++) out[c][(i + delay) % out[c].length] += dry[1 - c][i] * .17;
  write(`music-${name}`, out, 'music', true, { bpm, bars: 8 });
}
for (const name of ['forest', 'wind', 'rain', 'cave', 'fire', 'water']) {
  const out = buffer(8); let smooth = 0;
  for (let i = 0; i < out[0].length; i++) {
    const t = i / RATE, noise = random() * 2 - 1;
    smooth = .97 * smooth + .03 * noise;
    let x = smooth * (1 + .35 * Math.sin(tau * t / 8));
    if (name === 'rain') x += noise * .12;
    if (name === 'fire') x += (random() > .998 ? noise * .7 : 0);
    if (name === 'cave') x += .03 * Math.sin(tau * 55 * t) + .015 * Math.sin(tau * 83 * t);
    if (name === 'water') x += .055 * Math.sin(tau * 180 * t + 3 * Math.sin(tau * .5 * t));
    out[0][i] = x; out[1][i] = x * .85 + smooth * .15;
  }
  if (name === 'forest') for (let i = 0; i < 8; i++) add(out, i + .2, .18, (t,p) => Math.sin(tau * (1500 * t + 160 * t * t)) * Math.sin(Math.PI * p) ** 2, .09, random() * 1.5 - .75);
  write(`ambience-${name}`, out, 'ambience', true);
}
const effects = {
  click: ['wood', 600, .07], diceRoll: ['rattle', 310, .18], step: ['wood', 150, .09], coin: ['bell', 988, .42],
  attackHit: ['impact', 120, .26], strikeHit: ['impact', 65, .48], counterParry: ['metal', 1250, .50],
  magicGuardBlock: ['chime', 880, .55], magicCast: ['rise', 440, .65], levelUp: ['up', 523, .85],
  fanfare: ['up', 392, 1.2], darklingRoar: ['growl', 75, .9], hurt: ['impact', 180, .25],
  skillCast: ['rise', 330, .8], magicHit: ['chime', 740, .45], defendBlock: ['metal', 420, .28],
  miss: ['swoosh', 700, .22], giveUpDefeat: ['down', 392, .9], victory: ['up', 523, 1.8], defeat: ['down', 330, 1.5],
  chestOpen: ['chime', 660, .95], fieldSpellCast: ['rise', 587, .85], levelUpFanfare: ['up', 440, 1.4],
  jackpotFanfare: ['up', 660, 1.7], classPromoteJingle: ['up', 587, 1.6], voiceFight: ['horn', 196, .55],
  voiceCritical: ['horn', 392, .65], voiceSurrender: ['down', 294, .65], voiceBankrupt: ['down', 196, .9],
  limitBreak: ['rise', 220, 1.2], polymorphOink: ['wobble', 280, .5], anvilStrike: ['metal', 925, .65],
  reelSplash: ['splash', 587, .65], relicChime: ['chime', 784, 1.1], curseExplosion: ['growl', 90, .75],
  elementalShatter: ['metal', 1864, .5], chainLightning: ['electric', 600, .4], hazardTrigger: ['rattle', 180, .35],
  speechBlip: ['wood', 480, .035], coinClink: ['bell', 1318, .28], burstReady: ['chime', 1047, .85],
  tradeRouteFanfare: ['up', 494, 1.1], thunderClap: ['thunder', 50, 2.4], turnStart: ['chime', 523, .5],
  menuOpen: ['wood', 720, .12], menuClose: ['wood', 400, .1], chestTick: ['wood', 900, .05],
};
for (const [name, [kind, f, duration]] of Object.entries(effects)) {
  const out = buffer(duration);
  if (['up', 'down', 'chime'].includes(kind)) {
    const notes = kind === 'down' ? [7, 3, 0, -5] : [0, 4, 7, 12];
    notes.forEach((n,i) => { const length = duration * .6; add(out, i * duration * .12, length, instrument(kind === 'chime' ? 'bell' : 'flute', f * 2 ** (n/12), length), .4, i * .3 - .45); });
  } else add(out, 0, duration, (t,p) => {
    const env = Math.sin(Math.PI * Math.min(1, p * 10)) * Math.exp(-p * 4);
    const decay = Math.min(1,t/.004) * (1-p) ** 2;
    const sine = Math.sin(tau * f * t);
    if (kind === 'wood') return (sine + .35 * Math.sin(tau*f*1.48*t)) * Math.exp(-t*75) * Math.min(1,t/.002);
    if (kind === 'bell' || kind === 'metal') return (sine + .45*Math.sin(tau*f*2.76*t) + .2*Math.sin(tau*f*4.1*t)) * decay * Math.exp(-p*3);
    if (kind === 'rise') return Math.sin(tau*(f*t + f*t*t*2)) * Math.sin(Math.PI*p) * .6 + (random()*2-1)*.08*decay;
    if (kind === 'impact') return (Math.sin(tau*(f*t+2*(1-Math.exp(-t*25)))) + (random()*2-1)*.6) * decay * Math.exp(-p*7);
    if (kind === 'horn') return (sine+.3*Math.sin(tau*f*2*t)+.12*Math.sin(tau*f*3*t)) * Math.sin(Math.PI*p);
    if (kind === 'growl') return (Math.sin(tau*f*t + 6*Math.sin(tau*27*t))*.7 + (random()*2-1)*.4)*decay;
    if (kind === 'electric') return Math.sin(tau*f*t + 8*Math.sin(tau*70*t)) * decay;
    if (kind === 'wobble') return Math.sin(tau*f*t + 3*Math.sin(tau*12*t)) * Math.sin(Math.PI*p);
    if (kind === 'rattle') return (random()*2-1) * decay * (.2+.8*Math.sin(tau*22*t)**8);
    if (kind === 'thunder') return ((random()*2-1)*.3 + Math.sin(tau*45*t)*.4) * decay;
    return (random()*2-1) * Math.sin(Math.PI*p) ** 2 * (kind === 'splash' ? .5 : .3);
  });
  write(`sfx-${name}`, out, 'sfx');
}
fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify({ version: 2, generator: 'scripts/generate-audio.cjs', seed: 20261020,
  license: 'Original procedurally composed and synthesized assets for Chronicles of Fortune; no third-party samples.', assets }, null, 2) + '\n');
console.log(`Generated ${assets.length} original audio assets (${(assets.reduce((n,a)=>n+fs.statSync(path.join(ROOT,a.file)).size,0)/1048576).toFixed(1)} MiB).`);
