export type BgmTrack = 'overworld' | 'battle' | 'boss' | 'none';

export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public bgmEnabled: boolean = true;
  public bgmVolume: number = 0.25;
  public sfxVolume: number = 0.35;

  private currentTrack: BgmTrack = 'none';
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private bgmGainNode: GainNode | null = null;

  constructor() {}

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmGainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // =========================================================================
  // VOLUME & TOGGLE CONTROLS
  // =========================================================================
  setBgmVolume(val: number) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.bgmGainNode) {
      this.bgmGainNode.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx.currentTime);
    }
  }

  setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
  }

  toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.ctx && this.bgmGainNode) {
      this.bgmGainNode.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx.currentTime);
    }
    if (this.bgmEnabled && this.currentTrack !== 'none') {
      const tr = this.currentTrack;
      this.stopBgm();
      this.playBgm(tr);
    }
    return this.bgmEnabled;
  }

  // =========================================================================
  // PROCEDURAL MULTI-TRACK CHIPTUNE BGM ENGINE
  // =========================================================================
  playBgm(track: BgmTrack) {
    if (this.currentTrack === track && this.bgmTimer !== null) return;
    this.stopBgm();
    this.currentTrack = track;
    if (track === 'none' || !this.bgmEnabled) return;

    this.init();
    this.bgmStep = 0;

    // Tempo and patterns
    let tempoMs = 170;
    if (track === 'battle') tempoMs = 125;
    if (track === 'boss') tempoMs = 190;

    this.bgmTimer = window.setInterval(() => {
      this.tickBgmSequencer(track);
    }, tempoMs);
  }

  stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentTrack = 'none';
  }

  getCurrentTrack(): BgmTrack {
    return this.currentTrack;
  }

  private tickBgmSequencer(track: BgmTrack) {
    if (!this.ctx || !this.bgmEnabled || !this.bgmGainNode) return;
    const step = this.bgmStep;
    this.bgmStep = (this.bgmStep + 1) % 32;

    if (track === 'overworld') {
      // D Dorian Medieval Adventurous March (32-step loop)
      const bassSeq = [
        73.4, 0, 73.4, 0, 87.3, 0, 98.0, 0,
        73.4, 0, 73.4, 0, 110.0, 0, 98.0, 0,
        73.4, 0, 73.4, 0, 87.3, 0, 98.0, 0,
        65.4, 0, 73.4, 0, 110.0, 0, 73.4, 0
      ];
      const melodySeq = [
        293.7, 0, 329.6, 349.2, 392.0, 0, 440.0, 0,
        392.0, 349.2, 329.6, 0, 293.7, 0, 261.6, 0,
        293.7, 0, 349.2, 0, 440.0, 0, 523.3, 587.3,
        523.3, 0, 440.0, 392.0, 349.2, 329.6, 293.7, 0
      ];

      const bassFreq = bassSeq[step];
      if (bassFreq > 0) this.playSynthedBgmNote(bassFreq, 'triangle', 0.14, 0.18);

      const melFreq = melodySeq[step];
      if (melFreq > 0) this.playSynthedBgmNote(melFreq, 'square', 0.12, 0.12);

      // Light chiptune snare beat on 4 and 12
      if (step % 8 === 4) this.playChiptuneSnare();
      if (step % 8 === 0) this.playChiptuneKick();

    } else if (track === 'battle') {
      // A Minor / Intense High-Speed Gallop
      const bassSeq = [
        55.0, 55.0, 65.4, 55.0, 73.4, 55.0, 82.4, 65.4,
        55.0, 55.0, 65.4, 55.0, 98.0, 82.4, 73.4, 65.4,
        55.0, 55.0, 65.4, 55.0, 73.4, 55.0, 82.4, 65.4,
        110.0, 98.0, 82.4, 73.4, 65.4, 55.0, 49.0, 55.0
      ];
      const leadSeq = [
        220.0, 0, 261.6, 220.0, 329.6, 0, 293.7, 261.6,
        220.0, 0, 261.6, 329.6, 392.0, 0, 440.0, 0,
        392.0, 349.2, 329.6, 293.7, 349.2, 0, 329.6, 0,
        220.0, 261.6, 293.7, 329.6, 261.6, 220.0, 196.0, 220.0
      ];

      const bassFreq = bassSeq[step];
      if (bassFreq > 0) this.playSynthedBgmNote(bassFreq, 'sawtooth', 0.10, 0.22);

      const leadFreq = leadSeq[step];
      if (leadFreq > 0) this.playSynthedBgmNote(leadFreq, 'square', 0.09, 0.15);

      // Energetic battle percussion beat
      if (step % 4 === 0) this.playChiptuneKick();
      if (step % 4 === 2) this.playChiptuneSnare();

    } else if (track === 'boss') {
      // Darkling / Dragon Dread Tritone Tension (Heavy Gothic Synth)
      const bassSeq = [
        36.7, 0, 36.7, 0, 38.9, 0, 36.7, 0,
        43.7, 0, 38.9, 0, 51.9, 0, 49.0, 0,
        36.7, 0, 36.7, 0, 55.0, 0, 51.9, 0,
        38.9, 0, 43.7, 0, 36.7, 0, 32.7, 0
      ];
      const leadSeq = [
        146.8, 0, 155.6, 0, 174.6, 0, 207.7, 0,
        220.0, 0, 207.7, 0, 174.6, 0, 155.6, 0,
        293.7, 0, 311.1, 0, 277.2, 0, 220.0, 0,
        207.7, 0, 174.6, 155.6, 146.8, 0, 130.8, 0
      ];

      const bassFreq = bassSeq[step];
      if (bassFreq > 0) this.playSynthedBgmNote(bassFreq, 'sawtooth', 0.18, 0.25);

      const leadFreq = leadSeq[step];
      if (leadFreq > 0) this.playSynthedBgmNote(leadFreq, 'square', 0.15, 0.18);

      if (step % 8 === 0) this.playChiptuneKick();
      if (step % 8 === 4) this.playChiptuneSnare();
    }
  }

  private playSynthedBgmNote(freq: number, type: OscillatorType, duration: number, gainVal: number) {
    if (!this.ctx || !this.bgmGainNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy catch
    }
  }

  private playChiptuneKick() {
    if (!this.ctx || !this.bgmGainNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  private playChiptuneSnare() {
    if (!this.ctx || !this.bgmGainNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  // =========================================================================
  // SFX SOUND EFFECTS
  // =========================================================================
  playTone(freq: number, type: OscillatorType = 'square', duration: number = 0.1, gainVal: number = 0.12) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal * (this.sfxVolume / 0.35), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy catch
    }
  }

  click() {
    this.playTone(600, 'square', 0.04, 0.08);
  }

  diceRoll() {
    this.playTone(340 + Math.random() * 260, 'triangle', 0.06, 0.09);
  }

  step() {
    this.playTone(220, 'sine', 0.05, 0.07);
  }

  coin() {
    this.playTone(987.77, 'square', 0.08, 0.12);
    setTimeout(() => this.playTone(1318.51, 'square', 0.15, 0.14), 60);
  }

  attackHit() {
    this.playTone(140, 'sawtooth', 0.12, 0.18);
    setTimeout(() => this.playTone(80, 'square', 0.1, 0.14), 25);
  }

  strikeHit() {
    // Powerful heavy critical strike sound
    this.playTone(80, 'sawtooth', 0.25, 0.25);
    setTimeout(() => this.playTone(60, 'square', 0.2, 0.2), 40);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.15, 0.18), 80);
  }

  counterParry() {
    // High pitched parry followed by crushing reverse hit
    this.playTone(1200, 'triangle', 0.08, 0.2);
    setTimeout(() => this.playTone(1500, 'triangle', 0.1, 0.25), 50);
    setTimeout(() => {
      this.playTone(70, 'sawtooth', 0.3, 0.3);
      this.playTone(110, 'square', 0.25, 0.25);
    }, 120);
  }

  magicGuardBlock() {
    // Crystalline barrier deflection
    this.playTone(880, 'sine', 0.1, 0.15);
    setTimeout(() => this.playTone(1174, 'sine', 0.15, 0.18), 70);
    setTimeout(() => this.playTone(1760, 'sine', 0.2, 0.16), 140);
  }

  magicCast() {
    this.playTone(523.25, 'sine', 0.08, 0.14);
    setTimeout(() => this.playTone(659.25, 'sine', 0.09, 0.14), 60);
    setTimeout(() => this.playTone(783.99, 'sine', 0.18, 0.16), 120);
  }

  levelUp() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'square', 0.15, 0.15), i * 90));
  }

  fanfare() {
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => setTimeout(() => this.playTone(n, 'square', 0.2, 0.18), i * 110));
  }

  darklingRoar() {
    // Demonic deep rumble & discordant evil chime
    this.playTone(55, 'sawtooth', 0.6, 0.3);
    setTimeout(() => this.playTone(45, 'sawtooth', 0.8, 0.35), 100);
    setTimeout(() => this.playTone(220, 'square', 0.4, 0.15), 300);
    setTimeout(() => this.playTone(207.65, 'square', 0.6, 0.2), 500); // G# ominous
  }

  hurt() {
    this.playTone(150, 'sawtooth', 0.18, 0.2);
  }
}

export const audio = new AudioSynthesizer();
