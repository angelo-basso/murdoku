import { Clue, DeductionCase, Difficulty, Person, Placement } from '../models/deduction.models';
import { FURN_LABEL, NEXT_LABEL, THEMES } from '../data/deduction-themes';
import { candidates, clueHolds, culprit, fColor, fType, neighbors, occupiable, solve } from './solver';

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  code: string;
  size: number;
  /** Retire les indices superflus (énigme minimale). */
  minimize: boolean;
  /** Indices « de confort » ajoutés après unicité (facile). */
  extra: number;
  /** Privilégie les indices relationnels (plus durs à exploiter). */
  relationalFirst: boolean;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'facile', label: 'Facile', code: 'f', size: 5, minimize: false, extra: 2, relationalFirst: false },
  { id: 'moyen', label: 'Moyen', code: 'm', size: 6, minimize: true, extra: 1, relationalFirst: false },
  { id: 'intermediaire', label: 'Intermédiaire', code: 'i', size: 7, minimize: true, extra: 0, relationalFirst: false },
  { id: 'difficile', label: 'Difficile', code: 'd', size: 8, minimize: true, extra: 0, relationalFirst: true },
  { id: 'expert', label: 'Expert', code: 'e', size: 9, minimize: true, extra: 0, relationalFirst: true },
];
export const DIFF: Record<Difficulty, DifficultyDef> =
  Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d])) as Record<Difficulty, DifficultyDef>;

export interface GenOptions {
  themeId: string;
  difficulty: Difficulty;
  seed: string;
  size?: number;
}

/** Code de partage lisible : <theme>.<taille>.<diff>.<graine> */
export function shareCode(o: { themeId: string; size: number; difficulty: Difficulty; seed: string }): string {
  return `${o.themeId}.${o.size}.${DIFF[o.difficulty].code}.${o.seed}`;
}
export function parseCode(code: string): GenOptions | null {
  const [themeId, size, dc, ...rest] = code.trim().split('.');
  const def = DIFFICULTIES.find((d) => d.code === dc);
  if (!THEMES[themeId] || !def || !rest.length) return null;
  return { themeId, size: +size, difficulty: def.id, seed: rest.join('.') };
}

// --- RNG déterministe ---
function xmur3(str: string) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rngOf = (seed: string) => mulberry32(xmur3(seed)());
const pick = <T>(rnd: () => number, a: T[]): T => a[Math.floor(rnd() * a.length)];
function shuffle<T>(rnd: () => number, a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

const RELATIONAL_ORDER = ['sameRoom', 'notSameRoom', 'colLeft', 'rowAbove', 'notRoom', 'nextToFurniture', 'furniture', 'room'];
const rank = (c: Clue) => RELATIONAL_ORDER.indexOf(c.t);

export function generate(o: GenOptions): DeductionCase | null {
  const theme = THEMES[o.themeId];
  const def = DIFF[o.difficulty];
  if (!theme || !def) return null;
  const size = o.size ?? def.size;
  if (!theme.layouts[size] || theme.people.length < size) return null;
  const seating = new Set(theme.seatingPool.map(fType).filter((t) => t !== 'vide'));
  const blockers = new Set(theme.blockerPool.map(fType));

  for (let salt = 0; salt < 60; salt++) {
    const rnd = rngOf(`${o.seed}|${salt}`);
    const layout = pick(rnd, theme.layouts[size]);
    const rooms = layout.map((row) => row.split(''));
    const roomIds = [...new Set(layout.join(''))];
    const names = shuffle(rnd, theme.roomNamePool);
    const roomNames: Record<string, string> = {};
    const tints: Record<string, string> = {};
    roomIds.forEach((id, i) => { roomNames[id] = names[i % names.length]; tints[id] = theme.tintPalette[i % theme.tintPalette.length]; });
    const pool = [...theme.seatingPool, ...theme.blockerPool];
    const furniture = Array.from({ length: size }, () => Array.from({ length: size }, () => pick(rnd, pool)));
    const people: Person[] = theme.people.slice(0, size).map((p) => ({ ...p }));
    const kase: DeductionCase = { id: '', title: '', n: size, intro: '', rooms, roomNames, furniture, blocking: theme.blocking, people, clues: [], tints };

    const sol = findSolution(kase, rnd, people);
    if (!sol) continue;
    const victimId = people.find((p) => p.victim)!.id;

    // Indices vrais, en excluant ceux qui livrent directement le coupable.
    let truePool = truthPool(kase, sol.place, rnd, people, seating, blockers)
      .filter((c) => !givesAway(c, victimId, sol.killer, sol.vroom));
    truePool = shuffle(rnd, truePool);
    if (def.relationalFirst) truePool.sort((a, b) => rank(a) - rank(b));

    const mustRoom: Clue = { t: 'room', who: victimId, room: sol.vroom, text: '' };
    kase.clues = [mustRoom];
    const sameAs = (a: Placement, b: Placement) => people.every((p) => a[p.id]![0] === b[p.id]![0] && a[p.id]![1] === b[p.id]![1]);
    let ok = true;
    for (let guard = 0; guard < 120; guard++) {
      const sols = solve(kase, 2);
      if (sols.length === 1) break;
      const spurious = sols.find((s) => !sameAs(s, sol.place)) ?? sols[0];
      const elim = truePool.find((cl) => !kase.clues.includes(cl) && !clueHolds(kase, cl, spurious));
      if (!elim) { ok = false; break; }
      kase.clues = [...kase.clues, elim];
    }
    if (!ok || solve(kase, 2).length !== 1) continue;

    if (def.minimize) {
      for (let i = kase.clues.length - 1; i >= 0; i--) {
        if (kase.clues[i] === mustRoom) continue;
        const without = kase.clues.filter((_, k) => k !== i);
        if (solve({ ...kase, clues: without }, 2).length === 1) kase.clues = without;
      }
    }
    if (def.extra) {
      const extra = shuffle(rnd, truePool.filter((c) => !kase.clues.includes(c) && (c.t === 'room' || c.t === 'furniture' || c.t === 'nextToFurniture')));
      kase.clues = [...kase.clues, ...extra.slice(0, def.extra)];
    }

    const sols = solve(kase, 2);
    if (sols.length !== 1 || culprit(kase, sols[0]) !== sol.killer) continue;
    if (culpritIsObvious(kase, victimId, sol.vroom)) continue;

    // Ordre de présentation : la découverte du corps d'abord, puis mélange.
    kase.clues = [mustRoom, ...shuffle(rnd, kase.clues.filter((c) => c !== mustRoom))]
      .map((c) => ({ ...c, text: clueText(kase, c) }));
    kase.id = shareCode({ themeId: o.themeId, size, difficulty: o.difficulty, seed: o.seed });
    kase.share = kase.id;
    kase.title = `${theme.name} · ${def.label}`;
    kase.intro = `Placez chaque personne selon les indices ; le coupable finit seul avec la victime.`;
    return kase;
  }
  return null;
}

/** Indices interdits : ils désigneraient le coupable sans déduction. */
function givesAway(c: Clue, victimId: string, killerId: string, vroom: string): boolean {
  if ((c.t === 'sameRoom' || c.t === 'notSameRoom') && (c.a === victimId || c.b === victimId)) return true;
  if (c.t === 'room' && c.room === vroom) return true;           // « X était dans la pièce du crime »
  if (c.t === 'notRoom' && c.room === vroom) return true;        // élimination directe des suspects
  if (c.t === 'room' && c.who === victimId) return true;         // déjà donné par l'indice d'ouverture
  if (c.who === killerId && c.t === 'room') return true;
  return false;
}

/**
 * Le coupable est « évident » si, avec les seuls indices individuels (sans raisonner
 * sur les lignes/colonnes), au plus un suspect peut encore se trouver dans la pièce du crime.
 */
function culpritIsObvious(kase: DeductionCase, victimId: string, vroom: string): boolean {
  let possible = 0;
  for (const p of kase.people) {
    if (p.id === victimId) continue;
    if (candidates(kase, p.id).some(([r, col]) => kase.rooms[r][col] === vroom)) possible++;
  }
  return possible <= 1 + (kase.n >= 7 ? 1 : 0);
}

function findSolution(kase: DeductionCase, rnd: () => number, people: Person[]): { place: Placement; vroom: string; killer: string } | null {
  const n = kase.n;
  const occ: [number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (occupiable(kase, r, c)) occ.push([r, c]);
  if (occ.length < n) return null;
  const victimId = people.find((p) => p.victim)!.id;
  const suspects = shuffle(rnd, people.filter((p) => !p.victim).map((p) => p.id));
  for (let attempt = 0; attempt < 60; attempt++) {
    const vc = pick(rnd, occ);
    const vroom = kase.rooms[vc[0]][vc[1]];
    const killerCells = occ.filter(([r, c]) => kase.rooms[r][c] === vroom && r !== vc[0] && c !== vc[1]);
    if (!killerCells.length) continue;
    const kc = pick(rnd, killerCells);
    const outside = shuffle(rnd, occ.filter(([r, c]) => kase.rooms[r][c] !== vroom));
    const killer = suspects[0];
    const rest = suspects.slice(1);
    const place: Placement = { [victimId]: vc, [killer]: kc };
    const usedR = new Set([vc[0], kc[0]]), usedC = new Set([vc[1], kc[1]]);
    const assign = (i: number): boolean => {
      if (i === rest.length) return true;
      for (const [r, c] of outside) {
        if (usedR.has(r) || usedC.has(c)) continue;
        place[rest[i]] = [r, c]; usedR.add(r); usedC.add(c);
        if (assign(i + 1)) return true;
        usedR.delete(r); usedC.delete(c); delete place[rest[i]];
      }
      return false;
    };
    if (assign(0)) return { place, vroom, killer };
  }
  return null;
}

function truthPool(kase: DeductionCase, place: Placement, rnd: () => number, people: Person[], seating: Set<string>, blockers: Set<string>): Clue[] {
  const clues: Clue[] = [];
  const rooms = Object.keys(kase.roomNames);
  for (const p of people) {
    const [r, c] = place[p.id]!;
    const room = kase.rooms[r][c], code = kase.furniture[r][c], t = fType(code), col = fColor(code);
    clues.push({ t: 'room', who: p.id, room, text: '' });
    for (const other of shuffle(rnd, rooms.filter((x) => x !== room)).slice(0, 2))
      clues.push({ t: 'notRoom', who: p.id, room: other, text: '' });
    if (seating.has(t)) clues.push({ t: 'furniture', who: p.id, ftype: t, color: t === 'lit' ? (col ?? undefined) : undefined, text: '' });
    for (const [a, b] of shuffle(rnd, neighbors(kase, r, c).filter(([a, b]) => kase.rooms[a][b] === room))) {
      const nt = fType(kase.furniture[a][b]);
      if (blockers.has(nt)) { clues.push({ t: 'nextToFurniture', who: p.id, ftype: nt, text: '' }); break; }
    }
  }
  const ids = people.map((p) => p.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j], pa = place[a]!, pb = place[b]!;
    const same = kase.rooms[pa[0]][pa[1]] === kase.rooms[pb[0]][pb[1]];
    if (same) clues.push({ t: 'sameRoom', a, b, text: '' });
    else if (rnd() < 0.5) clues.push({ t: 'notSameRoom', a, b, text: '' });
    if (rnd() < 0.5) clues.push(pa[1] < pb[1] ? { t: 'colLeft', a, b, text: '' } : { t: 'colLeft', a: b, b: a, text: '' });
    if (rnd() < 0.35) clues.push(pa[0] < pb[0] ? { t: 'rowAbove', a, b, text: '' } : { t: 'rowAbove', a: b, b: a, text: '' });
  }
  return clues;
}

function clueText(kase: DeductionCase, clue: Clue): string {
  const nm = (id: string) => kase.people.find((p) => p.id === id)!.name;
  const rn = (room: string) => kase.roomNames[room];
  switch (clue.t) {
    case 'room': return `${nm(clue.who!)} se trouvait dans « ${rn(clue.room!)} ».`;
    case 'notRoom': return `${nm(clue.who!)} n'était pas dans « ${rn(clue.room!)} ».`;
    case 'furniture': return `${nm(clue.who!)} se tenait sur ${clue.color ? 'le lit au duvet ' + clue.color : FURN_LABEL[clue.ftype!]}.`;
    case 'nextToFurniture': return `${nm(clue.who!)} était juste à côté ${NEXT_LABEL[clue.ftype!]}.`;
    case 'sameRoom': return `${nm(clue.a!)} et ${nm(clue.b!)} étaient dans la même pièce.`;
    case 'notSameRoom': return `${nm(clue.a!)} et ${nm(clue.b!)} n'étaient pas dans la même pièce.`;
    case 'colLeft': return `${nm(clue.a!)} se trouvait dans une colonne à gauche de ${nm(clue.b!)}.`;
    case 'rowAbove': return `${nm(clue.a!)} se trouvait dans une rangée au-dessus de ${nm(clue.b!)}.`;
  }
  return '';
}
