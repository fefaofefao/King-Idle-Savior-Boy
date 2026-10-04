/**
 * Efeitos sonoros procedurais (estilo sfxr) com Web Audio. Nenhum arquivo de áudio.
 */
export type SfxName = 'tap' | 'crit' | 'coin' | 'death' | 'boss' | 'buy' | 'levelUp' | 'magic' | 'chest' | 'armor' | 'weak' | 'spot';

interface Tone {
  type: OscillatorType;
  from: number;
  to: number;
  dur: number;
  vol: number;
  delay?: number;
  noise?: boolean;
}

const SOUNDS: Record<SfxName, Tone[]> = {
  tap: [
    { type: 'square', from: 520, to: 180, dur: 0.07, vol: 0.18 },
    { type: 'sine', from: 0, to: 0, dur: 0.05, vol: 0.12, noise: true },
  ],
  crit: [
    { type: 'sawtooth', from: 900, to: 120, dur: 0.16, vol: 0.2 },
    { type: 'sine', from: 0, to: 0, dur: 0.12, vol: 0.2, noise: true },
  ],
  coin: [
    { type: 'square', from: 990, to: 990, dur: 0.05, vol: 0.1 },
    { type: 'square', from: 1320, to: 1320, dur: 0.12, vol: 0.1, delay: 0.05 },
  ],
  death: [
    { type: 'triangle', from: 300, to: 60, dur: 0.3, vol: 0.25 },
    { type: 'sine', from: 0, to: 0, dur: 0.25, vol: 0.15, noise: true },
  ],
  boss: [
    { type: 'sawtooth', from: 110, to: 90, dur: 0.5, vol: 0.2 },
    { type: 'sawtooth', from: 165, to: 130, dur: 0.5, vol: 0.12, delay: 0.1 },
  ],
  buy: [
    { type: 'triangle', from: 660, to: 660, dur: 0.06, vol: 0.18 },
    { type: 'triangle', from: 880, to: 880, dur: 0.09, vol: 0.18, delay: 0.06 },
  ],
  levelUp: [
    { type: 'square', from: 523, to: 523, dur: 0.08, vol: 0.12 },
    { type: 'square', from: 659, to: 659, dur: 0.08, vol: 0.12, delay: 0.08 },
    { type: 'square', from: 784, to: 784, dur: 0.08, vol: 0.12, delay: 0.16 },
    { type: 'square', from: 1047, to: 1047, dur: 0.18, vol: 0.12, delay: 0.24 },
  ],
  magic: [{ type: 'sine', from: 400, to: 1400, dur: 0.18, vol: 0.1 }],
  /** Golpe em armadura: metálico. */
  armor: [
    { type: 'square', from: 1400, to: 1100, dur: 0.05, vol: 0.09 },
    { type: 'triangle', from: 2200, to: 1800, dur: 0.12, vol: 0.07, delay: 0.01 },
  ],
  /** Ponto Fraco acertado: impacto forte + brilho. */
  weak: [
    { type: 'sawtooth', from: 220, to: 60, dur: 0.22, vol: 0.22 },
    { type: 'sine', from: 0, to: 0, dur: 0.18, vol: 0.2, noise: true },
    { type: 'triangle', from: 1200, to: 2400, dur: 0.2, vol: 0.12, delay: 0.05 },
  ],
  /** Ponto Fraco apareceu. */
  spot: [{ type: 'sine', from: 900, to: 1500, dur: 0.09, vol: 0.07 }],
  chest: [
    { type: 'triangle', from: 700, to: 1400, dur: 0.12, vol: 0.15 },
    { type: 'triangle', from: 1050, to: 2100, dur: 0.16, vol: 0.12, delay: 0.1 },
  ],
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer = 0;
  private lastPlay: Partial<Record<SfxName, number>> = {};
  soundOn = true;
  musicOn = false;
  sfxVolume = 0.8;
  musicVolume = 0.4;

  /** Precisa ser chamado num gesto do usuário (política de autoplay). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.musicOn) this.startMusic();
  }

  applyVolumes(): void {
    if (this.sfxGain) this.sfxGain.gain.value = this.soundOn ? this.sfxVolume : 0;
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this.musicVolume * 0.5 : 0;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }
  resume(): void {
    void this.ctx?.resume();
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.soundOn || this.ctx.state !== 'running') return;
    // Evita "metralhadora" do mesmo som.
    const now = this.ctx.currentTime;
    if ((this.lastPlay[name] ?? -1) > now - 0.035) return;
    this.lastPlay[name] = now;
    const pitch = 0.94 + Math.random() * 0.12;
    for (const tone of SOUNDS[name]) this.playTone(tone, pitch, this.sfxGain!);
  }

  private playTone(tone: Tone, pitch: number, out: AudioNode): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (tone.delay ?? 0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(tone.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    g.connect(out);
    let src: AudioScheduledSourceNode;
    if (tone.noise) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1200;
      n.connect(f);
      f.connect(g);
      src = n;
    } else {
      const o = ctx.createOscillator();
      o.type = tone.type;
      o.frequency.setValueAtTime(tone.from * pitch, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to * pitch), t0 + tone.dur);
      o.connect(g);
      src = o;
    }
    src.start(t0);
    src.stop(t0 + tone.dur + 0.02);
  }

  // ---------- Música: loop simples gerado por código ----------
  setMusic(on: boolean): void {
    this.musicOn = on;
    this.applyVolumes();
    if (on) this.startMusic();
    else this.stopMusic();
  }

  private startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    // Progressão I–vi–IV–V em Dó, arpejada.
    const chords = [
      [261.6, 329.6, 392.0],
      [220.0, 261.6, 329.6],
      [174.6, 220.0, 261.6],
      [196.0, 246.9, 293.7],
    ];
    let step = 0;
    const tick = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const chord = chords[Math.floor(step / 8) % chords.length];
      const note = chord[step % 3] * (step % 8 >= 4 ? 2 : 1);
      this.playTone({ type: 'triangle', from: note, to: note, dur: 0.28, vol: 0.06 }, 1, this.musicGain!);
      if (step % 8 === 0) {
        this.playTone({ type: 'sine', from: chord[0] / 2, to: chord[0] / 2, dur: 1.2, vol: 0.08 }, 1, this.musicGain!);
      }
      step++;
    };
    this.musicTimer = window.setInterval(tick, 300);
  }

  private stopMusic(): void {
    clearInterval(this.musicTimer);
    this.musicTimer = 0;
  }
}

export const sfx = new Sfx();
