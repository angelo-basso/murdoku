import { Injectable, effect, inject } from '@angular/core';
import { SettingsService } from './settings.service';

/** Ambiances disponibles : le menu et chaque décor. */
export type MusicId = 'menu' | 'manoir' | 'hante' | 'bureaux' | 'usine';
export type Sfx = 'select' | 'place' | 'remove' | 'error' | 'note' | 'hint' | 'win';

/**
 * Bande-son d'une ambiance, jouée en boucle. Tout est synthétisé avec Web Audio
 * (aucun fichier audio à télécharger, rien à licencier).
 */
interface Song {
  bpm: number;
  /** Accords (notes MIDI), un par mesure. */
  chords: number[][];
  lead: OscillatorType;
  /** Durée de résonance de la mélodie (s). */
  leadDecay: number;
  pad: OscillatorType;
  /** Probabilité de jouer une note de mélodie sur chaque croche. */
  density: number;
  /** Swing (0 = binaire). */
  swing: number;
  perc: 'none' | 'tick' | 'metal' | 'heart';
  vibrato: number;
}

const SONGS: Record<MusicId, Song> = {
  // Clavecin baroque en ré mineur, solennel
  menu: { bpm: 72, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], lead: 'sawtooth', leadDecay: 0.35, pad: 'triangle', density: 0.55, swing: 0, perc: 'none', vibrato: 0 },
  manoir: { bpm: 84, chords: [[50, 53, 57], [55, 58, 62], [45, 49, 52], [50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52], [45, 49, 52]], lead: 'sawtooth', leadDecay: 0.3, pad: 'triangle', density: 0.7, swing: 0, perc: 'tick', vibrato: 0 },
  // Thérémine et orgue, accords diminués
  hante: { bpm: 56, chords: [[45, 48, 51], [44, 47, 50], [46, 49, 52], [41, 44, 47]], lead: 'sine', leadDecay: 1.1, pad: 'sawtooth', density: 0.35, swing: 0, perc: 'heart', vibrato: 6 },
  // Piano électrique, accords de septième, léger swing
  bureaux: { bpm: 92, chords: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55]], lead: 'triangle', leadDecay: 0.6, pad: 'sine', density: 0.5, swing: 0.18, perc: 'tick', vibrato: 0 },
  // Pulsation mécanique, frappes métalliques
  usine: { bpm: 100, chords: [[40, 43, 47], [40, 43, 47], [38, 41, 45], [36, 40, 43]], lead: 'square', leadDecay: 0.18, pad: 'sawtooth', density: 0.45, swing: 0, perc: 'metal', vibrato: 0 },
};

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

@Injectable({ providedIn: 'root' })
export class AudioService {
  private settings = inject(SettingsService);
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private current: MusicId | null = null;
  private wanted: MusicId | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private seed = 1;

  constructor() {
    // Les navigateurs n'autorisent le son qu'après un geste de l'utilisateur.
    const unlock = () => { this.ensure(); void this.ctx?.resume(); this.sync(); };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume();
    });
    effect(() => {
      const s = this.settings.settings();
      if (this.musicBus) this.musicBus.gain.value = s.music ? (s.musicVolume / 100) * 0.35 : 0;
      if (this.sfxBus) this.sfxBus.gain.value = (s.sfxVolume / 100) * 0.6;
      this.sync();
    });
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    const s = this.settings.settings();
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = s.music ? (s.musicVolume / 100) * 0.35 : 0;
    this.musicBus.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = (s.sfxVolume / 100) * 0.6;
    this.sfxBus.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  /** Choisit l'ambiance de l'écran courant. */
  playMusic(id: MusicId): void { this.wanted = id; this.sync(); }

  private sync(): void {
    const on = this.settings.settings().music && !!this.ctx && !!this.wanted;
    if (!on) { this.stopLoop(); return; }
    if (this.current === this.wanted && this.timer) return;
    this.stopLoop();
    this.current = this.wanted;
    this.step = 0;
    this.seed = 7;
    this.nextTime = this.ctx!.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  private stopLoop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  private rnd(): number { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  /** Planifie les croches à venir (fenêtre glissante de 0,3 s). */
  private schedule(): void {
    const ctx = this.ctx, song = this.current && SONGS[this.current];
    if (!ctx || !song || ctx.state !== 'running') return;
    const eighth = 60 / song.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.3) {
      const bar = Math.floor(this.step / 8) % song.chords.length, pos = this.step % 8;
      const chord = song.chords[bar];
      const t = this.nextTime + (pos % 2 ? song.swing * eighth : 0);
      if (pos === 0) {
        this.pad(chord, t, eighth * 8, song.pad);
        this.tone(hz(chord[0] - 12), t, eighth * 3.5, 'triangle', 0.22, this.musicBus!);
      }
      if (pos === 4) this.tone(hz(chord[0] - 12), t, eighth * 3, 'triangle', 0.16, this.musicBus!);
      if (this.rnd() < song.density) {
        const n = chord[Math.floor(this.rnd() * chord.length)] + (this.rnd() < 0.5 ? 12 : 24);
        this.tone(hz(n), t, song.leadDecay, song.lead, song.lead === 'sine' ? 0.12 : 0.06, this.musicBus!, song.vibrato);
      }
      this.percussion(song.perc, pos, t);
      this.nextTime += eighth;
      this.step++;
    }
  }

  private percussion(kind: Song['perc'], pos: number, t: number): void {
    if (kind === 'tick' && pos % 2 === 0) this.hit(t, 6000, 0.03, 0.04, this.musicBus!);
    if (kind === 'metal' && (pos === 0 || pos === 3 || pos === 6)) this.hit(t, pos === 0 ? 300 : 3200, pos === 0 ? 0.2 : 0.08, pos === 0 ? 0.25 : 0.1, this.musicBus!);
    if (kind === 'heart' && (pos === 0 || pos === 1)) this.tone(55, t, 0.25, 'sine', pos ? 0.18 : 0.25, this.musicBus!);
  }

  private pad(chord: number[], t: number, dur: number, type: OscillatorType): void {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur);
    lp.connect(g); g.connect(this.musicBus!);
    for (const n of chord) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(n); o.detune.value = (this.rnd() - 0.5) * 12;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, bus: AudioNode, vibrato = 0, endFreq?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = vibrato; lg.gain.value = freq * 0.012;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = type === 'sine' ? 8000 : 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private hit(t: number, freq: number, dur: number, vol: number, bus: AudioNode, type: BiquadFilterType = 'bandpass'): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  /** Effet sonore (respecte le réglage « effets sonores »). */
  play(s: Sfx): void {
    if (!this.settings.settings().sfx) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01, bus = this.sfxBus!;
    switch (s) {
      case 'select': this.tone(990, t, 0.06, 'sine', 0.25, bus); break;
      case 'place': this.hit(t, 900, 0.09, 0.6, bus); this.tone(220, t, 0.12, 'sine', 0.35, bus); break;
      case 'remove': this.tone(520, t, 0.14, 'triangle', 0.3, bus, 0, 300); break;
      case 'note': this.hit(t, 4500, 0.08, 0.25, bus, 'highpass'); break;
      case 'error': this.tone(185, t, 0.22, 'square', 0.18, bus); this.tone(196, t, 0.22, 'square', 0.18, bus); break;
      case 'hint': [72, 76, 79].forEach((n, i) => this.tone(hz(n + 12), t + i * 0.07, 0.25, 'sine', 0.2, bus)); break;
      case 'win': [60, 64, 67, 72, 76].forEach((n, i) => this.tone(hz(n + 12), t + i * 0.11, 0.6, 'triangle', 0.3, bus)); this.hit(t + 0.55, 7000, 0.6, 0.15, bus, 'highpass'); break;
    }
  }
}
