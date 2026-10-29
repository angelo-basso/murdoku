import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DeductionCase, Difficulty, Placement } from '../models/deduction.models';

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
  /** Empreinte de la grille : une sauvegarde d'une ancienne version du niveau est ignorée. */
  fp?: string;
}

/** Objets de la boutique. */
export interface Inventory {
  hints: number;
  loupes: number;
}

interface ProgressState {
  /** Niveaux prédéfinis réussis → meilleur temps et meilleure note. */
  done: Record<string, { bestMs: number; at: number; stars?: number }>;
  /** Affaires sur mesure réussies (code → étoiles), comptées une seule fois. */
  custom: Record<string, number>;
  saves: Record<string, SavedGame>;
  /** Dernière partie interrompue (clé de `saves`). */
  last?: string;
  inv: Inventory;
  /** Étoiles dépensées en boutique. */
  spent: number;
  /** Cadres de plateau possédés et cadre actif. */
  frames: string[];
  frame: string;
}

const KEY = 'murdoku:progress:v1';
export const LEVELS_PER_DIFFICULTY = 20;
/** Affaires à réussir dans une difficulté pour ouvrir la suivante. */
export const LEVELS_TO_UNLOCK_NEXT = 5;
export const START_HINTS = 3;
export const DIFF_ORDER: Difficulty[] = ['facile', 'moyen', 'intermediaire', 'difficile', 'expert'];

/** Barème : 3 étoiles sous `three`, 2 étoiles sous `two` (en minutes), sinon 1. */
export const STAR_TIMES: Record<Difficulty, { three: number; two: number }> = {
  facile: { three: 2, two: 4 },
  moyen: { three: 4, two: 8 },
  intermediaire: { three: 6, two: 12 },
  difficile: { three: 10, two: 20 },
  expert: { three: 15, two: 30 },
};

export function starsFor(d: Difficulty, ms: number): number {
  const t = STAR_TIMES[d], min = ms / 60000;
  return min <= t.three ? 3 : min <= t.two ? 2 : 1;
}

/** Article de la boutique. */
export interface ShopItem {
  id: string;
  kind: 'hints' | 'loupes' | 'frame';
  name: string;
  desc: string;
  price: number;
  qty?: number;
  /** Couleur du cadre (kind = 'frame'). */
  color?: string;
}

export const DEFAULT_FRAME = 'or';
export const SHOP: ShopItem[] = [
  { id: 'hint-1', kind: 'hints', qty: 1, price: 3, name: '1 indice', desc: 'Place correctement une personne.' },
  { id: 'hint-5', kind: 'hints', qty: 5, price: 12, name: '5 indices', desc: 'Le lot avantageux.' },
  { id: 'loupe-1', kind: 'loupes', qty: 1, price: 2, name: '1 loupe', desc: 'Signale les personnes mal placées, sans dire où les mettre.' },
  { id: 'loupe-5', kind: 'loupes', qty: 5, price: 8, name: '5 loupes', desc: 'Pour les enquêtes coriaces.' },
  { id: 'or', kind: 'frame', price: 0, color: '#d4af37', name: 'Cadre doré', desc: 'Le cadre classique.' },
  { id: 'argent', kind: 'frame', price: 10, color: '#c8cdd6', name: 'Cadre argent', desc: 'Sobre et élégant.' },
  { id: 'rubis', kind: 'frame', price: 20, color: '#d43a52', name: 'Cadre rubis', desc: 'Couleur du crime.' },
  { id: 'emeraude', kind: 'frame', price: 20, color: '#2fbf71', name: 'Cadre émeraude', desc: 'Pour les enquêteurs chanceux.' },
  { id: 'neon', kind: 'frame', price: 35, color: '#38e1ff', name: 'Cadre néon', desc: 'Polar futuriste.' },
];

const EMPTY: ProgressState = {
  done: {}, custom: {}, saves: {}, inv: { hints: START_HINTS, loupes: 0 }, spent: 0, frames: [DEFAULT_FRAME], frame: DEFAULT_FRAME,
};

const diffOf = (id: string) => id.split('-')[0] as Difficulty;
const indexOf = (id: string) => +id.split('-')[1];
export const levelId = (d: Difficulty, i: number) => `${d}-${String(i).padStart(2, '0')}`;

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly state = signal<ProgressState>(EMPTY);
  private loaded: Promise<void> | null = null;

  readonly done = computed(() => this.state().done);
  readonly inventory = computed(() => this.state().inv);
  readonly frames = computed(() => this.state().frames);
  readonly frame = computed(() => this.state().frame);
  readonly frameColor = computed(() => SHOP.find((s) => s.id === this.state().frame)?.color ?? '#d4af37');
  readonly lastSave = computed(() => {
    const s = this.state();
    return s.last && s.saves[s.last] ? { key: s.last, ...s.saves[s.last] } : null;
  });
  /** Étoiles gagnées (meilleure note de chaque affaire) et solde disponible. */
  readonly earned = computed(() => {
    const s = this.state();
    return Object.values(s.done).reduce((k, d) => k + (d.stars ?? 0), 0) + Object.values(s.custom).reduce((k, v) => k + v, 0);
  });
  readonly balance = computed(() => this.earned() - this.state().spent);

  load(): Promise<void> {
    this.loaded ??= Preferences.get({ key: KEY }).then(({ value }) => {
      if (!value) return;
      try {
        const raw = JSON.parse(value);
        const s: ProgressState = { ...EMPTY, ...raw, inv: { ...EMPTY.inv, ...raw.inv } };
        // Anciennes réussites sans note : calculée depuis le meilleur temps.
        for (const [id, d] of Object.entries(s.done)) d.stars ??= starsFor(diffOf(id), d.bestMs);
        this.state.set(s);
      } catch { /* données corrompues : on repart de zéro */ }
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

  /** Une difficulté s'ouvre après 5 affaires réussies dans la précédente. */
  difficultyUnlocked(d: Difficulty): boolean {
    const i = DIFF_ORDER.indexOf(d);
    return i <= 0 || this.doneCount(DIFF_ORDER[i - 1]) >= LEVELS_TO_UNLOCK_NEXT;
  }

  /** Une affaire s'ouvre quand la précédente (même difficulté) est réussie. */
  levelUnlocked(id: string): boolean {
    const d = diffOf(id), i = indexOf(id);
    if (!this.difficultyUnlocked(d)) return false;
    return i <= 1 || !!this.state().done[levelId(d, i - 1)];
  }

  /** Enregistre une victoire ; renvoie la note et les étoiles nouvellement gagnées. */
  recordWin(caseId: string, elapsedMs: number, kind: 'level' | 'custom' | 'tutorial', difficulty: Difficulty): { stars: number; gained: number } {
    const stars = starsFor(difficulty, elapsedMs);
    let gained = 0;
    this.state.update((s) => {
      const done = { ...s.done }, custom = { ...s.custom };
      if (kind === 'level') {
        const prev = done[caseId];
        gained = Math.max(0, stars - (prev?.stars ?? 0));
        done[caseId] = { bestMs: prev ? Math.min(prev.bestMs, elapsedMs) : elapsedMs, at: Date.now(), stars: Math.max(stars, prev?.stars ?? 0) };
      } else if (kind === 'custom') {
        gained = Math.max(0, stars - (custom[caseId] ?? 0));
        custom[caseId] = Math.max(stars, custom[caseId] ?? 0);
      }
      const saves = { ...s.saves };
      delete saves[caseId];
      return { ...s, done, custom, saves, last: s.last === caseId ? undefined : s.last };
    });
    this.persist();
    return { stars, gained };
  }

  /** Consomme un objet ; false s'il n'en reste plus. */
  use(item: keyof Inventory): boolean {
    if (this.state().inv[item] <= 0) return false;
    this.state.update((s) => ({ ...s, inv: { ...s.inv, [item]: s.inv[item] - 1 } }));
    this.persist();
    return true;
  }

  /** Achète un article contre des étoiles (un cadre déjà possédé est simplement équipé). */
  buy(item: ShopItem): boolean {
    if (item.kind === 'frame' && this.state().frames.includes(item.id)) { this.selectFrame(item.id); return true; }
    if (this.balance() < item.price) return false;
    this.state.update((s) => {
      const next = { ...s, spent: s.spent + item.price };
      if (item.kind === 'frame') return { ...next, frames: [...s.frames, item.id], frame: item.id };
      return { ...next, inv: { ...s.inv, [item.kind]: s.inv[item.kind] + (item.qty ?? 1) } };
    });
    this.persist();
    return true;
  }

  selectFrame(id: string): void {
    if (!this.state().frames.includes(id)) return;
    this.state.update((s) => ({ ...s, frame: id }));
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

/** Empreinte courte d'une affaire (plan, mobilier, indices). */
export function caseFingerprint(c: DeductionCase): string {
  const src = JSON.stringify([c.rooms, c.furniture, c.clues.map((x) => x.text)]);
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) h = Math.imul(h ^ src.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
