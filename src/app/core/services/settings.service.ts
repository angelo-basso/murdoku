import { Injectable, effect, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/** Apparence : suit le téléphone (sombre si le téléphone n'indique rien), ou forcée. */
export type ThemeChoice = 'system' | 'dark' | 'light';

export interface Settings {
  theme: ThemeChoice;
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
  /** Glisser-déposer des personnages ; désactivé, on place en touchant (et on fait défiler librement). */
  dragDrop: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sfx: true, sfxVolume: 70,
  music: true, musicVolume: 40,
  haptics: true, hapticError: true,
  announce: true, reduceMotion: false,
  dragDrop: true,
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
    // Le thème du téléphone peut changer pendant que l'appli est ouverte.
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystemChange = () => this.applyTheme(this.state().theme);
    prefersLight?.addEventListener?.('change', onSystemChange);
    prefersDark?.addEventListener?.('change', onSystemChange);
    effect(() => {
      const s = this.state();
      this.applyTheme(s.theme);
      document.body.classList.toggle('reduce-motion', s.reduceMotion);
      if (this.loaded) void Preferences.set({ key: KEY, value: JSON.stringify(s) });
    });
  }

  /** Thème réellement affiché. « system » : clair seulement si le téléphone le demande explicitement. */
  resolvedTheme(choice: ThemeChoice): 'dark' | 'light' {
    if (choice !== 'system') return choice;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private applyTheme(choice: ThemeChoice): void {
    const light = this.resolvedTheme(choice) === 'light';
    document.body.classList.toggle('theme-light', light);
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#ede5d6' : '#1f1638');
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.state.update((s) => ({ ...s, [key]: value }));
  }

  reset(): void { this.state.set(DEFAULT_SETTINGS); }
}
