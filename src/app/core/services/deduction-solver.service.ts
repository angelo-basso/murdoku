import { Injectable } from '@angular/core';
import {
  Clue,
  DeductionCase,
  Placement,
} from '../models/deduction.models';

/** Solveur Murdoku (déduction) : preuve d'unicité, coupable, aide. */
@Injectable({ providedIn: 'root' })
export class DeductionSolverService {
  fType(code: string): string { return code.split(':')[0]; }
  fColor(code: string): string | null { return code.split(':')[1] ?? null; }

  occupiable(c: DeductionCase, r: number, col: number): boolean {
    return !c.blocking.includes(this.fType(c.furniture[r][col]));
  }

  private neighbors(c: DeductionCase, r: number, col: number): [number, number][] {
    return ([[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]] as [number, number][])
      .filter(([a, b]) => a >= 0 && a < c.n && b >= 0 && b < c.n);
  }

  private nextToFurniture(c: DeductionCase, r: number, col: number, ftype: string, color?: string): boolean {
    return this.neighbors(c, r, col).some(([a, b]) =>
      this.fType(c.furniture[a][b]) === ftype && (!color || this.fColor(c.furniture[a][b]) === color));
  }

  /** Test d'un indice unaire sur une case candidate. */
  unaryOk(c: DeductionCase, clue: Clue, who: string, r: number, col: number): boolean {
    if (clue.who !== who) return true;
    switch (clue.t) {
      case 'room': return c.rooms[r][col] === clue.room;
      case 'notRoom': return c.rooms[r][col] !== clue.room;
      case 'furniture':
        return this.fType(c.furniture[r][col]) === clue.ftype &&
          (!clue.color || this.fColor(c.furniture[r][col]) === clue.color);
      case 'nextToFurniture':
        return this.nextToFurniture(c, r, col, clue.ftype!, clue.color);
      default: return true;
    }
  }

  /** Test d'un indice binaire sur deux placements. */
  binaryOk(c: DeductionCase, clue: Clue, place: Placement): boolean {
    const a = clue.a ? place[clue.a] : null;
    const b = clue.b ? place[clue.b] : null;
    switch (clue.t) {
      case 'sameRoom':
        if (!a || !b) return true;
        return c.rooms[a[0]][a[1]] === c.rooms[b[0]][b[1]];
      case 'notSameRoom':
        if (!a || !b) return true;
        return c.rooms[a[0]][a[1]] !== c.rooms[b[0]][b[1]];
      case 'colLeft': if (!a || !b) return true; return a[1] < b[1];
      case 'rowAbove': if (!a || !b) return true; return a[0] < b[0];
      default: return true;
    }
  }

  candidates(c: DeductionCase, whoId: string): [number, number][] {
    const unary = c.clues.filter((x) => x.who);
    const out: [number, number][] = [];
    for (let r = 0; r < c.n; r++)
      for (let col = 0; col < c.n; col++)
        if (this.occupiable(c, r, col) && unary.every((cl) => this.unaryOk(c, cl, whoId, r, col)))
          out.push([r, col]);
    return out;
  }

  /** Résout l'affaire (s'arrête à 2 solutions pour tester l'unicité). */
  solve(c: DeductionCase): { solutions: Placement[] } {
    const binary = c.clues.filter((x) => x.a && x.b);
    const ids = c.people.map((p) => p.id);
    const cand: Record<string, [number, number][]> = {};
    for (const id of ids) cand[id] = this.candidates(c, id);
    const order = [...ids].sort((x, y) => cand[x].length - cand[y].length);

    const solutions: Placement[] = [];
    const place: Placement = {};
    const usedR = new Set<number>(), usedC = new Set<number>();

    const rec = (i: number): void => {
      if (solutions.length > 1) return;
      if (i === order.length) { solutions.push({ ...place }); return; }
      const id = order[i];
      for (const [r, col] of cand[id]) {
        if (usedR.has(r) || usedC.has(col)) continue;
        place[id] = [r, col];
        if (binary.every((cl) => this.binaryOk(c, cl, place))) {
          usedR.add(r); usedC.add(col);
          rec(i + 1);
          usedR.delete(r); usedC.delete(col);
        }
        delete place[id];
        if (solutions.length > 1) return;
      }
    };
    rec(0);
    return { solutions };
  }

  /** La solution unique (null si l'affaire est mal posée). */
  solution(c: DeductionCase): Placement | null {
    const { solutions } = this.solve(c);
    return solutions.length === 1 ? solutions[0] : null;
  }

  /** Tous les indices sont-ils satisfaits par un placement complet ? */
  allCluesSatisfied(c: DeductionCase, place: Placement): boolean {
    for (const cl of c.clues) {
      if (cl.who) {
        const p = place[cl.who];
        if (!p) return false;
        if (!this.unaryOk(c, cl, cl.who, p[0], p[1])) return false;
      } else if (!this.binaryOk(c, cl, place)) return false;
    }
    return true;
  }

  /** Le coupable (seul avec la victime), ou null si indéterminé. */
  culprit(c: DeductionCase, place: Placement): string | null {
    const victim = c.people.find((p) => p.victim);
    if (!victim) return null;
    const vp = place[victim.id];
    if (!vp) return null;
    const vroom = c.rooms[vp[0]][vp[1]];
    const others = c.people.filter((p) => {
      const pp = place[p.id];
      return !p.victim && pp && c.rooms[pp[0]][pp[1]] === vroom;
    });
    return others.length === 1 ? others[0].id : null;
  }
}
