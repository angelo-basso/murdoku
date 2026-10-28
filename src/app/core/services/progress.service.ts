import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Difficulty, Placement } from '../models/deduction.models';

/** Partie en cours, sauvegardée pour être reprise plus tard. */
export interface SavedGame {
  placement: Placement;
  elim: Record<string, string[]>;
  struck: number[];
  elapsedMs: number;
  savedAt: number;
  title: string;
  /** Route à rouvrir : ['/niveau', id] ou ['/deduction/gen', code]. */
  route: string[];
}

interface ProgressState {
  /** Niveaux prédéfinis réussis → meilleur temps. */
  done: Record<string, { bestMs: number; at: number }>;
  saves: Record<string, SavedGame>;
  /** Dernière partie interrompue (clé de `saves`). */
  last?: string;
}

const KEY = 'murdoku:progress:v1';
export const LEVELS_PER_DIFFICULTY = 20;

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly state = signal<ProgressState>({ done: {}, saves: {} });
  private loaded: Promise<void> | null = null;

  readonly done = computed(() => this.state().done);
  readonly lastSave = computed(() => {
    const s = this.state();
    return s.last && s.saves[s.last] ? { key: s.last, ...s.saves[s.last] } : null;
  });

  load(): Promise<void> {
    this.loaded ??= Preferences.get({ key: KEY }).then(({ value }) => {
      if (!value) return;
      try { this.state.set({ done: {}, saves: {}, ...JSON.parse(value) }); } catch { /* données corrompues : on repart de zéro */ }
    });
    return this.loaded;
  }

  private persist(): void {
    void Preferences.set({ key: KEY, value: JSON.stringify(this.state()) });
  }

  doneCount(d: Difficulty): number {
    return Object.keys(this.state().done).filter((id) => id.startsWith(d + '-')).length;
  }

  /** Le générateur d'une difficulté s'ouvre quand ses 20 niveaux sont réussis. */
  generatorUnlocked(d: Difficulty): boolean {
    return this.doneCount(d) >= LEVELS_PER_DIFFICULTY;
  }

  recordWin(caseId: string, elapsedMs: number, isLevel: boolean): void {
    this.state.update((s) => {
      const done = { ...s.done };
      if (isLevel) {
        const prev = done[caseId];
        done[caseId] = { bestMs: prev ? Math.min(prev.bestMs, elapsedMs) : elapsedMs, at: Date.now() };
      }
      const saves = { ...s.saves };
      delete saves[caseId];
      return { done, saves, last: s.last === caseId ? undefined : s.last };
    });
    this.persist();
  }

  save(caseId: string, game: SavedGame): void {
    this.state.update((s) => ({ ...s, saves: { ...s.saves, [caseId]: game }, last: caseId }));
    this.persist();
  }

  getSave(caseId: string): SavedGame | null {
    return this.state().saves[caseId] ?? null;
  }

  clearSave(caseId: string): void {
    this.state.update((s) => {
      const saves = { ...s.saves };
      delete saves[caseId];
      return { ...s, saves, last: s.last === caseId ? undefined : s.last };
    });
    this.persist();
  }
}

export function formatTime(ms: number): string {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
