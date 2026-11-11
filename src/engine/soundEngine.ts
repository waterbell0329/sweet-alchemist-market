// All sound effects are synthesized live with the Web Audio API — no audio files.
// Every call is wrapped so that a blocked or missing AudioContext never breaks the game.

export type SoundName =
  | 'click'
  | 'beep'
  | 'siren'
  | 'drumroll'
  | 'win'
  | 'loss'
  | 'fanfare'
  | 'jackpot'
  | 'bankrupt'
  | 'news'
  | 'marketClosed'
  | 'awards'
  | 'alert';

export type AudioStatus = 'locked' | 'ready' | 'unsupported';

const MASTER_VOLUME = 0.32;
const MAX_VOICES = 24;

type Listener = (s: AudioStatus) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private voices = 0;
  private listeners = new Set<Listener>();
  private drumStop: (() => void) | null = null;

  get status(): AudioStatus {
    const Ctor = typeof window !== 'undefined' ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
    if (!Ctor) return 'unsupported';
    return this.ctx && this.ctx.state === 'running' ? 'ready' : 'locked';
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const s = this.status;
    this.listeners.forEach((l) => l(s));
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stopDrumroll();
  }

  /** Must be called from a user gesture (first click / key press). */
  unlock() {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!this.ctx) {
        this.ctx = new Ctor();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 10;
        comp.ratio.value = 8;
        comp.attack.value = 0.003;
        comp.release.value = 0.2;
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        this.ctx.onstatechange = () => this.emit();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().then(() => this.emit()).catch(() => this.emit());
      this.emit();
    } catch {
      /* audio is optional */
    }
  }

  private ready(): AudioContext | null {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return null;
    if (this.voices >= MAX_VOICES) return null;
    return this.ctx;
  }

  private tone(
    freq: number,
    at: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; to?: number; attack?: number; filter?: number } = {},
  ) {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const { type = 'square', gain = 0.3, to, attack = 0.005, filter } = opts;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.master);
    this.voices++;
    osc.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      try {
        g.disconnect();
      } catch {
        /* noop */
      }
    };
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(at: number, dur: number, gain = 0.25, filterFreq = 1800, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + at;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; // texture only, not game logic
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    this.voices++;
    src.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
    };
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private notes(seq: [number, number, number][], opts: { type?: OscillatorType; gain?: number; filter?: number } = {}) {
    for (const [f, at, d] of seq) this.tone(f, at, d, opts);
  }

  stopDrumroll() {
    this.drumStop?.();
    this.drumStop = null;
  }

  play(name: SoundName) {
    try {
      this.playInner(name);
    } catch {
      /* never let audio break the game */
    }
  }

  private playInner(name: SoundName) {
    if (!this.ready()) return;
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G4 = 392, A5 = 880;
    switch (name) {
      case 'click':
        this.tone(1200, 0, 0.04, { gain: 0.12 });
        break;
      case 'beep':
        this.tone(1000, 0, 0.14, { type: 'sine', gain: 0.4 });
        break;
      case 'alert':
        this.notes([[880, 0, 0.12], [1175, 0.13, 0.18]], { type: 'square', gain: 0.22 });
        break;
      case 'siren':
        for (let i = 0; i < 3; i++) {
          this.tone(520, i * 0.5, 0.25, { type: 'sawtooth', to: 1040, gain: 0.18, filter: 2400 });
          this.tone(1040, i * 0.5 + 0.25, 0.25, { type: 'sawtooth', to: 520, gain: 0.18, filter: 2400 });
        }
        break;
      case 'drumroll': {
        this.stopDrumroll();
        const ctx = this.ready();
        if (!ctx) return;
        let i = 0;
        let stopped = false;
        const tick = () => {
          if (stopped || i > 60) return;
          const gain = 0.08 + Math.min(0.22, i * 0.004);
          this.noise(0, 0.05, gain, 900 + (i % 2) * 300);
          i++;
          window.setTimeout(tick, 42);
        };
        tick();
        this.drumStop = () => {
          stopped = true;
        };
        break;
      }
      case 'win':
        this.notes([[C5, 0, 0.12], [E5, 0.1, 0.12], [G5, 0.2, 0.25]], { type: 'square', gain: 0.22 });
        this.noise(0.05, 0.2, 0.06, 6000, 'highpass');
        break;
      case 'loss':
        this.notes([[440, 0, 0.18], [349, 0.18, 0.3]], { type: 'triangle', gain: 0.35 });
        break;
      case 'fanfare':
        this.notes([[C5, 0, 0.14], [E5, 0.14, 0.14], [G5, 0.28, 0.14], [C6, 0.42, 0.5]], { type: 'sawtooth', gain: 0.2, filter: 3200 });
        this.notes([[G4, 0.42, 0.5], [E5, 0.42, 0.5]], { type: 'square', gain: 0.1 });
        break;
      case 'jackpot':
        this.notes(
          [[C5, 0, 0.1], [E5, 0.1, 0.1], [G5, 0.2, 0.1], [C6, 0.3, 0.1], [E6, 0.4, 0.1], [G5, 0.55, 0.1], [C6, 0.65, 0.1], [E6, 0.75, 0.8]],
          { type: 'sawtooth', gain: 0.18, filter: 4000 },
        );
        this.notes([[C5, 0.75, 0.8], [G5, 0.75, 0.8]], { type: 'square', gain: 0.1 });
        for (let i = 0; i < 8; i++) this.tone(2000 + i * 180, 0.8 + i * 0.07, 0.08, { type: 'sine', gain: 0.12 });
        break;
      case 'bankrupt':
        this.tone(420, 0, 0.9, { type: 'sawtooth', to: 60, gain: 0.3, filter: 1600 });
        this.noise(0, 0.6, 0.25, 300, 'lowpass');
        this.tone(110, 0.5, 0.5, { type: 'square', gain: 0.18, to: 55 });
        break;
      case 'news':
        for (let i = 0; i < 3; i++) this.notes([[A5, i * 0.32, 0.12], [660, i * 0.32 + 0.14, 0.14]], { type: 'square', gain: 0.18 });
        break;
      case 'marketClosed':
        [784, 659, 523, 392].forEach((f, i) => {
          this.tone(f, i * 0.32, 0.9, { type: 'sine', gain: 0.35 });
          this.tone(f * 2.01, i * 0.32, 0.5, { type: 'sine', gain: 0.08 });
        });
        break;
      case 'awards':
        this.notes([[G4, 0, 0.16], [C5, 0.16, 0.16], [E5, 0.32, 0.16], [G5, 0.48, 0.16], [E5, 0.64, 0.12], [G5, 0.76, 0.7]], {
          type: 'sawtooth',
          gain: 0.18,
          filter: 3000,
        });
        this.notes([[C5, 0.76, 0.7], [E5, 0.76, 0.7]], { type: 'triangle', gain: 0.16 });
        break;
    }
  }
}

export const sound = new SoundEngine();
