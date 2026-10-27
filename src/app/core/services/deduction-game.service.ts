import { Injectable, computed, inject, signal } from '@angular/core';
import { DeductionCase, Placement } from '../models/deduction.models';
import { DeductionSolverService } from './deduction-solver.service';

@Injectable({ providedIn: 'root' })
export class DeductionGameService {
  private solver = inject(DeductionSolverService);

  private readonly caseSig = signal<DeductionCase | null>(null);
  private readonly placeSig = signal<Placement>({});
  private readonly selectedSig = signal<string | null>(null);
  private readonly notesModeSig = signal(false);
  private readonly elimSig = signal<Record<string, Set<string>>>({});
  private solutionCache: Placement | null = null;

  readonly currentCase = this.caseSig.asReadonly();
  readonly placement = this.placeSig.asReadonly();
  readonly selected = this.selectedSig.asReadonly();
  readonly notesMode = this.notesModeSig.asReadonly();
  readonly elim = this.elimSig.asReadonly();

  start(c: DeductionCase): void {
    this.caseSig.set(c);
    this.placeSig.set(Object.fromEntries(c.people.map((p) => [p.id, null])));
    this.selectedSig.set(null);
    this.notesModeSig.set(false);
    this.elimSig.set(Object.fromEntries(c.people.map((p) => [p.id, new Set<string>()])));
    this.solutionCache = this.solver.solution(c);
  }

  toggleNotesMode(): void { this.notesModeSig.update((v) => !v); }

  /** Marque/retire « cette personne ne peut pas être ici » (rature logigramme). */
  toggleElim(personId: string, r: number, col: number): void {
    const map = this.elimSig();
    const set = new Set(map[personId] ?? []);
    const key = `${r},${col}`;
    if (set.has(key)) set.delete(key); else set.add(key);
    this.elimSig.set({ ...map, [personId]: set });
  }

  /** Cases raturées pour la personne sélectionnée. */
  eliminatedForSelected(): Set<string> {
    const sel = this.selectedSig();
    return sel ? this.elimSig()[sel] ?? new Set() : new Set();
  }

  /** Personne occupant une case, ou null. */
  occupantAt(r: number, col: number): string | null {
    const place = this.placeSig();
    for (const [id, p] of Object.entries(place))
      if (p && p[0] === r && p[1] === col) return id;
    return null;
  }

  occupiable(r: number, col: number): boolean {
    const c = this.caseSig();
    return !!c && this.solver.occupiable(c, r, col);
  }

  selectPerson(id: string): void {
    this.selectedSig.update((cur) => (cur === id ? null : id));
  }

  /** Clic sur une case : rature (mode notes), pose la personne sélectionnée, ou retire l'occupant. */
  tapCell(r: number, col: number): void {
    const c = this.caseSig();
    if (!c || !this.occupiable(r, col)) return;

    if (this.notesModeSig()) {
      const sel = this.selectedSig();
      if (sel) this.toggleElim(sel, r, col);
      return;
    }

    const occupant = this.occupantAt(r, col);
    const sel = this.selectedSig();

    if (sel) {
      const place = { ...this.placeSig() };
      if (occupant && occupant !== sel) place[occupant] = null; // libère la case
      place[sel] = [r, col];
      this.placeSig.set(place);
      this.selectedSig.set(null);
    } else if (occupant) {
      const place = { ...this.placeSig() };
      place[occupant] = null;
      this.placeSig.set(place);
    }
  }

  /** Place explicitement une personne sur une case (glisser-déposer). */
  placePerson(id: string, r: number, col: number): void {
    const c = this.caseSig();
    if (!c || !this.occupiable(r, col)) return;
    const place = { ...this.placeSig() };
    const occupant = this.occupantAt(r, col);
    if (occupant && occupant !== id) place[occupant] = null;
    place[id] = [r, col];
    this.placeSig.set(place);
    this.selectedSig.set(null);
  }

  removePerson(id: string): void {
    const place = { ...this.placeSig() };
    place[id] = null;
    this.placeSig.set(place);
  }

  reset(): void {
    const c = this.caseSig();
    if (c) {
      this.placeSig.set(Object.fromEntries(c.people.map((p) => [p.id, null])));
      this.elimSig.set(Object.fromEntries(c.people.map((p) => [p.id, new Set<string>()])));
    }
    this.selectedSig.set(null);
  }

  isPlaced = (id: string): boolean => !!this.placeSig()[id];

  /** Personnes en conflit (même ligne ou même colonne qu'une autre). */
  readonly conflicts = computed<Set<string>>(() => {
    const place = this.placeSig();
    const bad = new Set<string>();
    const entries = Object.entries(place).filter(([, p]) => p) as [string, [number, number]][];
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++) {
        const [, a] = entries[i], [, b] = entries[j];
        if (a[0] === b[0] || a[1] === b[1]) { bad.add(entries[i][0]); bad.add(entries[j][0]); }
      }
    return bad;
  });

  readonly allPlaced = computed(() => {
    const c = this.caseSig();
    const place = this.placeSig();
    return !!c && c.people.every((p) => place[p.id]);
  });

  /** Affaire résolue : tout placé, sans conflit, tous les indices satisfaits. */
  readonly solved = computed(() => {
    const c = this.caseSig();
    if (!c || !this.allPlaced() || this.conflicts().size > 0) return false;
    return this.solver.allCluesSatisfied(c, this.placeSig());
  });

  readonly culprit = computed(() => {
    const c = this.caseSig();
    if (!c || !this.solved()) return null;
    const id = this.solver.culprit(c, this.placeSig());
    return c.people.find((p) => p.id === id) ?? null;
  });

  /** Indice : place correctement une personne encore mal placée. */
  hint(): void {
    const c = this.caseSig();
    if (!c || !this.solutionCache) return;
    const sol = this.solutionCache;
    const place = { ...this.placeSig() };
    for (const p of c.people) {
      const want = sol[p.id];
      const cur = place[p.id];
      if (want && (!cur || cur[0] !== want[0] || cur[1] !== want[1])) {
        // libère la case cible si occupée par quelqu'un d'autre
        for (const [id, pp] of Object.entries(place))
          if (pp && pp[0] === want[0] && pp[1] === want[1]) place[id] = null;
        place[p.id] = [want[0], want[1]];
        this.placeSig.set(place);
        this.selectedSig.set(null);
        return;
      }
    }
  }
}
