import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BoardSize,
  Cell,
  GameState,
  MurdokuCase,
  Suspect,
} from '../models/murdoku.models';
import { SudokuService } from './sudoku.service';
import { StorageService } from './storage.service';

/**
 * Service de partie : détient l'état actif (signals), applique les règles
 * du jeu et fait le pont entre le moteur Sudoku et le thème d'enquête.
 */
@Injectable({ providedIn: 'root' })
export class MurdokuService {
  private sudoku = inject(SudokuService);
  private storage = inject(StorageService);

  private readonly stateSig = signal<GameState | null>(null);
  private readonly caseSig = signal<MurdokuCase | null>(null);
  private readonly selectedSig = signal<Cell | null>(null);
  private readonly notesModeSig = signal(false);

  readonly state = this.stateSig.asReadonly();
  readonly currentCase = this.caseSig.asReadonly();
  readonly selected = this.selectedSig.asReadonly();
  readonly notesMode = this.notesModeSig.asReadonly();

  /** Nombre de cases restant à remplir. */
  readonly remaining = computed(() => {
    const s = this.stateSig();
    if (!s) return 0;
    let n = 0;
    for (const row of s.current) for (const v of row) if (v === 0) n++;
    return n;
  });

  /** Décompte de chaque suspect déjà placé (pour désactiver le pavé). */
  readonly counts = computed<Record<number, number>>(() => {
    const s = this.stateSig();
    const res: Record<number, number> = {};
    if (!s) return res;
    for (let v = 1; v <= s.size; v++) res[v] = 0;
    for (const row of s.current) for (const v of row) if (v > 0) res[v]++;
    return res;
  });

  /** Le coupable révélé une fois la grille résolue. */
  readonly culprit = computed<Suspect | null>(() => {
    const s = this.stateSig();
    const c = this.caseSig();
    if (!s || !c) return null;
    const { row, col } = c.culpritCell;
    const id = s.solution[row][col];
    return c.suspects.find((x) => x.id === id) ?? null;
  });

  /** Démarre (ou reprend) une partie pour une affaire donnée. */
  async start(mCase: MurdokuCase, forceNew = false): Promise<void> {
    this.caseSig.set(mCase);
    this.selectedSig.set(null);
    this.notesModeSig.set(false);

    if (!forceNew) {
      const saved = await this.storage.loadGame(mCase.id);
      if (saved && saved.size === mCase.size) {
        this.stateSig.set(saved);
        return;
      }
    }

    const { solution, puzzle } = this.sudoku.generate(
      mCase.size,
      mCase.difficulty,
    );
    const size = mCase.size;
    const state: GameState = {
      caseId: mCase.id,
      size,
      given: this.sudoku.cloneGrid(puzzle),
      solution,
      current: this.sudoku.cloneGrid(puzzle),
      notes: this.emptyNotes(size),
      elapsedMs: 0,
      mistakes: 0,
      hintsUsed: 0,
      completed: false,
    };
    this.stateSig.set(state);
    await this.persist();
  }

  isGiven(row: number, col: number): boolean {
    const s = this.stateSig();
    return !!s && s.given[row][col] !== 0;
  }

  select(row: number, col: number): void {
    this.selectedSig.set({ row, col });
  }

  toggleNotesMode(): void {
    this.notesModeSig.update((v) => !v);
  }

  /** Place un suspect (ou une note) dans la case sélectionnée. */
  input(value: number): void {
    const s = this.stateSig();
    const sel = this.selectedSig();
    if (!s || !sel || s.completed) return;
    const { row, col } = sel;
    if (this.isGiven(row, col)) return;

    if (this.notesModeSig()) {
      const notes = s.notes[row][col];
      const idx = notes.indexOf(value);
      const nextNotes = idx >= 0 ? notes.filter((n) => n !== value) : [...notes, value].sort((a, b) => a - b);
      this.updateNotes(row, col, nextNotes);
      return;
    }

    const current = this.cloneCurrent(s);
    // Un même symbole re-cliqué efface la case.
    current[row][col] = current[row][col] === value ? 0 : value;

    let mistakes = s.mistakes;
    if (current[row][col] !== 0 && current[row][col] !== s.solution[row][col]) {
      mistakes++;
    }

    const notes = this.cloneNotes(s);
    notes[row][col] = [];

    const next: GameState = { ...s, current, notes, mistakes };
    next.completed = this.sudoku.isComplete(current, s.size);
    this.stateSig.set(next);
    void this.afterChange(next);
  }

  /** Efface la case sélectionnée. */
  erase(): void {
    const s = this.stateSig();
    const sel = this.selectedSig();
    if (!s || !sel || s.completed) return;
    const { row, col } = sel;
    if (this.isGiven(row, col)) return;
    const current = this.cloneCurrent(s);
    current[row][col] = 0;
    const notes = this.cloneNotes(s);
    notes[row][col] = [];
    this.stateSig.set({ ...s, current, notes });
    void this.persist();
  }

  /** Indice : révèle la bonne valeur dans la case sélectionnée. */
  hint(): void {
    const s = this.stateSig();
    const sel = this.selectedSig();
    if (!s || s.completed) return;
    const target = sel && !this.isGiven(sel.row, sel.col) ? sel : this.firstEmpty(s);
    if (!target) return;
    const { row, col } = target;
    const current = this.cloneCurrent(s);
    current[row][col] = s.solution[row][col];
    const notes = this.cloneNotes(s);
    notes[row][col] = [];
    const next: GameState = {
      ...s,
      current,
      notes,
      hintsUsed: s.hintsUsed + 1,
    };
    next.completed = this.sudoku.isComplete(current, s.size);
    this.selectedSig.set(target);
    this.stateSig.set(next);
    void this.afterChange(next);
  }

  tick(ms: number): void {
    const s = this.stateSig();
    if (!s || s.completed) return;
    this.stateSig.set({ ...s, elapsedMs: s.elapsedMs + ms });
  }

  hasConflict(row: number, col: number): boolean {
    const s = this.stateSig();
    if (!s) return false;
    return this.sudoku.conflicts(s.current, s.size, row, col);
  }

  async persist(): Promise<void> {
    const s = this.stateSig();
    if (s) await this.storage.saveGame(s);
  }

  private async afterChange(next: GameState): Promise<void> {
    await this.storage.saveGame(next);
    if (next.completed) await this.storage.markSolved(next.caseId);
  }

  private firstEmpty(s: GameState): Cell | null {
    for (let r = 0; r < s.size; r++) {
      for (let c = 0; c < s.size; c++) {
        if (s.current[r][c] === 0) return { row: r, col: c };
      }
    }
    return null;
  }

  private updateNotes(row: number, col: number, value: number[]): void {
    const s = this.stateSig();
    if (!s) return;
    const notes = this.cloneNotes(s);
    notes[row][col] = value;
    const next = { ...s, notes };
    this.stateSig.set(next);
    void this.storage.saveGame(next);
  }

  private cloneCurrent(s: GameState): number[][] {
    return s.current.map((row) => [...row]);
  }

  private cloneNotes(s: GameState): number[][][] {
    return s.notes.map((row) => row.map((cell) => [...cell]));
  }

  private emptyNotes(size: BoardSize): number[][][] {
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => [] as number[]),
    );
  }
}
