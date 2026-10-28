import { Clue, DeductionCase, Placement } from '../models/deduction.models';

/** Moteur Murdoku (déduction) — fonctions pures, sans Angular. */

export const fType = (code: string): string => code.split(':')[0];
export const fColor = (code: string): string | null => code.split(':')[1] ?? null;

export function occupiable(c: DeductionCase, r: number, col: number): boolean {
  return !c.blocking.includes(fType(c.furniture[r][col]));
}

export function neighbors(c: DeductionCase, r: number, col: number): [number, number][] {
  return ([[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]] as [number, number][])
    .filter(([a, b]) => a >= 0 && a < c.n && b >= 0 && b < c.n);
}

export function nextToFurniture(c: DeductionCase, r: number, col: number, ftype: string, color?: string): boolean {
  return neighbors(c, r, col).some(([a, b]) =>
    fType(c.furniture[a][b]) === ftype && (!color || fColor(c.furniture[a][b]) === color));
}

/** Indice portant sur une seule personne, testé sur une case candidate. */
export function unaryOk(c: DeductionCase, clue: Clue, who: string, r: number, col: number): boolean {
  if (clue.who !== who) return true;
  switch (clue.t) {
    case 'room': return c.rooms[r][col] === clue.room;
    case 'notRoom': return c.rooms[r][col] !== clue.room;
    case 'furniture':
      return fType(c.furniture[r][col]) === clue.ftype && (!clue.color || fColor(c.furniture[r][col]) === clue.color);
    case 'nextToFurniture': return nextToFurniture(c, r, col, clue.ftype!, clue.color);
    default: return true;
  }
}

/** Indice portant sur deux personnes (vrai tant que l'une n'est pas placée). */
export function binaryOk(c: DeductionCase, clue: Clue, place: Placement): boolean {
  const a = clue.a ? place[clue.a] : null;
  const b = clue.b ? place[clue.b] : null;
  if (!a || !b) return true;
  switch (clue.t) {
    case 'sameRoom': return c.rooms[a[0]][a[1]] === c.rooms[b[0]][b[1]];
    case 'notSameRoom': return c.rooms[a[0]][a[1]] !== c.rooms[b[0]][b[1]];
    case 'colLeft': return a[1] < b[1];
    case 'rowAbove': return a[0] < b[0];
    default: return true;
  }
}

export function clueHolds(c: DeductionCase, clue: Clue, place: Placement): boolean {
  if (clue.who) {
    const p = place[clue.who];
    return !!p && unaryOk(c, clue, clue.who, p[0], p[1]);
  }
  return binaryOk(c, clue, place);
}

/** Cases possibles pour une personne d'après les seuls indices qui la concernent. */
export function candidates(c: DeductionCase, whoId: string): [number, number][] {
  const unary = c.clues.filter((x) => x.who === whoId);
  const out: [number, number][] = [];
  for (let r = 0; r < c.n; r++)
    for (let col = 0; col < c.n; col++)
      if (occupiable(c, r, col) && unary.every((cl) => unaryOk(c, cl, whoId, r, col))) out.push([r, col]);
  return out;
}

/** Énumère les solutions (une personne par ligne et par colonne), en s'arrêtant à `limit`. */
export function solve(c: DeductionCase, limit = 2): Placement[] {
  const ids = c.people.map((p) => p.id);
  const cand: Record<string, [number, number][]> = {};
  for (const id of ids) cand[id] = candidates(c, id);
  // Indices binaires indexés par personne, pour ne tester que ceux qui la concernent.
  const binOf: Record<string, Clue[]> = Object.fromEntries(ids.map((id) => [id, []]));
  for (const cl of c.clues) if (cl.a && cl.b) { binOf[cl.a].push(cl); binOf[cl.b].push(cl); }

  const solutions: Placement[] = [];
  const place: Placement = {};
  const usedR = new Array<boolean>(c.n).fill(false), usedC = new Array<boolean>(c.n).fill(false);
  const free = new Set(ids);

  const fits = (id: string, r: number, col: number): boolean => {
    if (usedR[r] || usedC[col]) return false;
    place[id] = [r, col];
    const ok = binOf[id].every((cl) => binaryOk(c, cl, place));
    delete place[id];
    return ok;
  };

  const rec = (): void => {
    if (solutions.length >= limit) return;
    if (!free.size) { solutions.push({ ...place }); return; }
    // Personne la plus contrainte d'abord (MRV) ; abandon dès qu'une n'a plus de case.
    let best: string | null = null;
    let bestOpts: [number, number][] = [];
    for (const id of free) {
      const opts = cand[id].filter(([r, col]) => fits(id, r, col));
      if (!opts.length) return;
      if (!best || opts.length < bestOpts.length) { best = id; bestOpts = opts; if (opts.length === 1) break; }
    }
    const id = best!;
    free.delete(id);
    for (const [r, col] of bestOpts) {
      place[id] = [r, col]; usedR[r] = true; usedC[col] = true;
      rec();
      usedR[r] = false; usedC[col] = false; delete place[id];
      if (solutions.length >= limit) break;
    }
    free.add(id);
  };
  rec();
  return solutions;
}

export function allCluesSatisfied(c: DeductionCase, place: Placement): boolean {
  return c.clues.every((cl) => clueHolds(c, cl, place) && (!cl.a || (!!place[cl.a] && !!place[cl.b!])));
}

/** Le coupable : la seule personne qui partage la pièce de la victime. */
export function culprit(c: DeductionCase, place: Placement): string | null {
  const victim = c.people.find((p) => p.victim);
  const vp = victim && place[victim.id];
  if (!vp) return null;
  const vroom = c.rooms[vp[0]][vp[1]];
  const others = c.people.filter((p) => {
    const pp = place[p.id];
    return !p.victim && !!pp && c.rooms[pp[0]][pp[1]] === vroom;
  });
  return others.length === 1 ? others[0].id : null;
}
