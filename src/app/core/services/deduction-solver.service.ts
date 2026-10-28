import { Injectable } from '@angular/core';
import { Clue, DeductionCase, Placement } from '../models/deduction.models';
import * as E from '../engine/solver';

/** Façade injectable du moteur pur (core/engine/solver). */
@Injectable({ providedIn: 'root' })
export class DeductionSolverService {
  fType = E.fType;
  fColor = E.fColor;
  occupiable(c: DeductionCase, r: number, col: number): boolean { return E.occupiable(c, r, col); }
  unaryOk(c: DeductionCase, clue: Clue, who: string, r: number, col: number): boolean { return E.unaryOk(c, clue, who, r, col); }
  binaryOk(c: DeductionCase, clue: Clue, place: Placement): boolean { return E.binaryOk(c, clue, place); }
  clueHolds(c: DeductionCase, clue: Clue, place: Placement): boolean { return E.clueHolds(c, clue, place); }
  neighborCells(c: DeductionCase, r: number, col: number): [number, number][] { return E.neighbors(c, r, col); }
  candidates(c: DeductionCase, who: string): [number, number][] { return E.candidates(c, who); }
  solve(c: DeductionCase): { solutions: Placement[] } { return { solutions: E.solve(c, 2) }; }
  solution(c: DeductionCase): Placement | null { const s = E.solve(c, 2); return s.length === 1 ? s[0] : null; }
  allCluesSatisfied(c: DeductionCase, place: Placement): boolean { return E.allCluesSatisfied(c, place); }
  roomViolations(c: DeductionCase, place: Placement): Set<string> { return E.roomViolations(c, place); }
  culprit(c: DeductionCase, place: Placement): string | null { return E.culprit(c, place); }
}
