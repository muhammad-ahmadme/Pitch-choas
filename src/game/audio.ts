class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('pitch_chaos_muted');
      if (saved === 'true') {
        this.muted = true;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    try {
      localStorage.setItem('pitch_chaos_muted', String(mute));
    } catch {
      // Ignore storage access errors
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playJump(jumpIndex: number = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchMult = 1.0 + (Math.min(4, jumpIndex) - 1) * 0.24;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190 * pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(380 * pitchMult, now + 0.09);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playBootStrike(intensity: number = 0.8): void {
    this.playKick(intensity);
  }

  public playGroundPinch(): void {
    this.playBounce(600);
  }

  public playNetRattle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Twine net oscillation simulation
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.15);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playKick(intensity: number = 0.7): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const clamped = Math.max(0.3, Math.min(1.3, intensity));
    const now = ctx.currentTime;

    // 1. Hollow leather ball chamber resonance (body thud)
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(175 + clamped * 40, now);
    body.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    bodyGain.gain.setValueAtTime(0.32 * clamped, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(now);
    body.stop(now + 0.14);

    // 2. Leather-on-boot sharp snap (filtered noise burst)
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(950, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25 * clamped, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  }

  public playOverdriveKick(): void {
    this.playKick(1.3);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const zing = ctx.createOscillator();
    const zingGain = ctx.createGain();
    zing.type = 'triangle';
    zing.frequency.setValueAtTime(280, now);
    zing.frequency.exponentialRampToValueAtTime(1250, now + 0.18);
    zingGain.gain.setValueAtTime(0.18, now);
    zingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    zing.connect(zingGain);
    zingGain.connect(ctx.destination);
    zing.start(now);
    zing.stop(now + 0.22);
  }

  public playPowerup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.04);
      gain.gain.setValueAtTime(0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.15);
    });
  }

  public playBounce(speed: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const intensity = Math.min(1.2, Math.max(0.15, speed / 650));
    if (intensity < 0.2) return;
    const now = ctx.currentTime;

    // Turf muffling + ball compression thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130 + intensity * 40, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
    gain.gain.setValueAtTime(0.18 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playCrossbar(intensity: number = 0.9): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scale = Math.min(1.1, Math.max(0.35, intensity));

    const freqs = [590, 885, 1340];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.97, now + 0.32);
      gain.gain.setValueAtTime((0.14 / (idx + 1)) * scale, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playWhistle(kind: 'kickoff' | 'fulltime'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const triggerBlast = (start: number, dur: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(2680, start);
      osc2.frequency.setValueAtTime(2740, start);

      lfo.frequency.setValueAtTime(38, start);
      lfoGain.gain.setValueAtTime(95, start);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.setValueAtTime(0.085, start + dur - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(start);
      osc2.start(start);
      lfo.start(start);
      osc1.stop(start + dur + 0.02);
      osc2.stop(start + dur + 0.02);
      lfo.stop(start + dur + 0.02);
    };

    if (kind === 'kickoff') {
      triggerBlast(now, 0.24);
    } else {
      triggerBlast(now, 0.16);
      triggerBlast(now + 0.22, 0.16);
      triggerBlast(now + 0.44, 0.42);
    }
  }

  public playGoal(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Authentic stadium goal horn blast + crowd roar
    const horn = ctx.createOscillator();
    const hornGain = ctx.createGain();
    horn.type = 'sawtooth';
    horn.frequency.setValueAtTime(130.81, now); // C3
    horn.frequency.setValueAtTime(196.0, now + 0.15); // G3
    hornGain.gain.setValueAtTime(0.18, now);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    horn.connect(hornGain);
    hornGain.connect(ctx.destination);
    horn.start(now);
    horn.stop(now + 0.9);

    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);

      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(0.001, now + i * 0.045);
      gain.gain.linearRampToValueAtTime(0.065, now + i * 0.045 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + 0.75);
    });

    const bufferSize = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(650, now);
    bandpass.Q.setValueAtTime(0.7, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.22, now + 0.1);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noise.connect(bandpass);
    bandpass.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  }

  public playStadiumAtmosphere(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 2.0);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.001, now + 2.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }
}

export const soundEngine = new SoundEngine();
