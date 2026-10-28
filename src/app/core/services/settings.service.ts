import { Injectable, effect, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface Settings {
  /** Effets sonores (pose, erreur, victoire…). */
  sfx: boolean;
  sfxVolume: number; // 0–100
  /** Bande-son d'ambiance, une par décor. */
  music: boolean;
  musicVolume: number; // 0–100
  /** Vibrations à la pose et à la victoire. */
  haptics: boolean;
  /** Vibration distincte quand un coup crée une erreur. */
  hapticError: boolean;
  /** Annonces détaillées pour les lecteurs d'écran (TalkBack, VoiceOver). */
  announce: boolean;
  /** Supprime les animations (confettis, pulsations…). */
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sfx: true, sfxVolume: 70,
  music: true, musicVolume: 40,
  haptics: true, hapticError: true,
  announce: true, reduceMotion: false,
};

const KEY = 'murdoku:settings:v1';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly state = signal<Settings>(DEFAULT_SETTINGS);
  readonly settings = this.state.asReadonly();
  private loaded = false;

  constructor() {
    void Preferences.get({ key: KEY }).then(({ value }) => {
      if (value) try { this.state.set({ ...DEFAULT_SETTINGS, ...JSON.parse(value) }); } catch { /* valeurs par défaut */ }
      this.loaded = true;
    });
    effect(() => {
      const s = this.state();
      document.body.classList.toggle('reduce-motion', s.reduceMotion);
      if (this.loaded) void Preferences.set({ key: KEY, value: JSON.stringify(s) });
    });
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.state.update((s) => ({ ...s, [key]: value }));
  }

  reset(): void { this.state.set(DEFAULT_SETTINGS); }
}
