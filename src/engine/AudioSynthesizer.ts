export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {}

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType = 'square', duration: number = 0.1, gainVal: number = 0.12) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
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
