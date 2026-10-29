import { Clue, DeductionCase, Difficulty, Person, Placement } from '../models/deduction.models';
import { BLOCKING, FURNITURE, RoomDef, THEMES } from '../data/deduction-themes';
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

const RELATIONAL_ORDER = ['colLeft', 'rowAbove', 'notRoom', 'nextToFurniture', 'furniture', 'room'];
const rank = (c: Clue) => RELATIONAL_ORDER.indexOf(c.t);

export function generate(o: GenOptions): DeductionCase | null {
  const theme = THEMES[o.themeId];
  const def = DIFF[o.difficulty];
  if (!theme || !def) return null;
  const size = o.size ?? def.size;
  if (!theme.layouts[size] || theme.people.length < size) return null;

  // Distribution de l'affaire : `size` personnages tirés parmi les 30 du décor ;
  // le premier tiré est la victime (affiché en tête de la réserve).
  const cast: Person[] = shuffle(rngOf(`${o.seed}|cast`), theme.people).slice(0, size)
    .map((p, i) => (i === 0 ? { ...p, victim: true } : { ...p }));

  for (let salt = 0; salt < 60; salt++) {
    const rnd = rngOf(`${o.seed}|${salt}`);
    const layout = pick(rnd, theme.layouts[size]);
    const rooms = layout.map((row) => row.split(''));
    const roomIds = [...new Set(layout.join(''))];
    if (roomIds.length > theme.rooms.length) return null;
    const defs = shuffle(rnd, theme.rooms);
    const roomDef: Record<string, RoomDef> = {};
    const roomNames: Record<string, string> = {};
    const tints: Record<string, string> = {};
    roomIds.forEach((id, i) => { roomDef[id] = defs[i]; roomNames[id] = defs[i].name; tints[id] = theme.tintPalette[i % theme.tintPalette.length]; });
    const furniture = furnish(rnd, rooms, roomDef);
    const people = cast;
    const kase: DeductionCase = { id: '', title: '', n: size, intro: '', rooms, roomNames, furniture, blocking: BLOCKING, people, clues: [], tints };

    const sol = findSolution(kase, rnd, people);
    if (!sol) continue;
    const victimId = people.find((p) => p.victim)!.id;

    // Indices vrais, en excluant ceux qui livrent directement le coupable.
    let truePool = truthPool(kase, sol.place, rnd, people)
      .filter((c) => !givesAway(c, victimId, sol.killer, sol.vroom, kase));
    truePool = shuffle(rnd, truePool);
    if (def.relationalFirst) truePool.sort((a, b) => rank(a) - rank(b));

    const mustRoom: Clue = { t: 'room', who: victimId, room: sol.vroom, text: '' };
    kase.clues = [mustRoom];
    const sameAs = (a: Placement, b: Placement) => people.every((p) => a[p.id]![0] === b[p.id]![0] && a[p.id]![1] === b[p.id]![1]);
    let ok = true;
    // Solution unique ET aucune « fausse fin » (victime seule, tous les indices respectés).
    const valid = (clues: Clue[]) => solve({ ...kase, clues }, 2).length === 1 && !solve({ ...kase, clues }, 1, true).length;
    for (let guard = 0; guard < 160; guard++) {
      const sols = solve(kase, 2);
      const fake = sols.length === 1 ? solve(kase, 1, true)[0] : undefined;
      if (sols.length === 1 && !fake) break;
      const spurious = fake ?? sols.find((s) => !sameAs(s, sol.place)) ?? sols[0];
      const elim = truePool.find((cl) => !kase.clues.includes(cl) && !clueHolds(kase, cl, spurious));
      if (!elim) { ok = false; break; }
      kase.clues = [...kase.clues, elim];
    }
    if (!ok || !valid(kase.clues)) continue;

    if (def.minimize) {
      for (let i = kase.clues.length - 1; i >= 0; i--) {
        if (kase.clues[i] === mustRoom) continue;
        const without = kase.clues.filter((_, k) => k !== i);
        if (valid(without)) kase.clues = without;
      }
    }
    if (def.extra) {
      const extra = shuffle(rnd, truePool.filter((c) => !kase.clues.includes(c) && (c.t === 'room' || c.t === 'furniture' || c.t === 'nextToFurniture')));
      let added = 0;
      for (const cl of extra) {
        if (added >= def.extra) break;
        if (!isRedundant(kase, cl, kase.clues)) { kase.clues = [...kase.clues, cl]; added++; }
      }
    }
    // Retire les indices qui n'apprennent rien (ex. « pas dans l'open space » quand on sait
    // déjà « dans la salle serveurs ») : les solutions restent identiques.
    for (let changed = true; changed;) {
      changed = false;
      for (const cl of [...kase.clues].reverse()) {
        if (cl === mustRoom) continue;
        const others = kase.clues.filter((x) => x !== cl);
        if (isRedundant(kase, cl, others)) { kase.clues = others; changed = true; break; }
      }
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
    kase.intro = `Placez chaque personne selon les indices ; une seule personne par pièce, sauf le meurtrier, seul avec sa victime.`;
    return kase;
  }
  return null;
}

/**
 * Un indice est inutile si les autres indices sur la (les) même(s) personne(s)
 * l'impliquent déjà : il n'élimine aucune case.
 */
export function isRedundant(kase: DeductionCase, cl: Clue, others: Clue[]): boolean {
  const k = { ...kase, clues: others };
  if (cl.who) return candidates(k, cl.who).every(([r, col]) => clueHolds({ ...kase, clues: [cl] }, cl, { [cl.who!]: [r, col] }));
  if (cl.a && cl.b) {
    const ca = candidates(k, cl.a), cb = candidates(k, cl.b);
    return ca.every(([r1, c1]) => cb.every(([r2, c2]) =>
      r1 === r2 || c1 === c2 || clueHolds(kase, cl, { [cl.a!]: [r1, c1], [cl.b!]: [r2, c2] })));
  }
  return false;
}

/** Indices interdits : ils désigneraient le coupable sans déduction. */
function givesAway(c: Clue, victimId: string, killerId: string, vroom: string, kase: DeductionCase): boolean {
  if ((c.t === 'sameRoom' || c.t === 'notSameRoom') && (c.a === victimId || c.b === victimId)) return true;
  if (c.t === 'room' && c.room === vroom) return true;           // « X était dans la pièce du crime »
  if (c.t === 'notRoom' && c.room === vroom) return true;        // élimination directe des suspects
  if (c.t === 'room' && c.who === victimId) return true;         // déjà donné par l'indice d'ouverture
  if (c.who === killerId && c.t === 'room') return true;
  // Un indice individuel dont toutes les cases possibles sont dans la pièce du crime
  // revient à dire « X était avec la victime » (ex. le seul fourneau est dans la cuisine du crime).
  if (c.who && c.who !== victimId && c.t !== 'room' && c.t !== 'notRoom') {
    const cells = candidates({ ...kase, clues: [c] }, c.who);
    if (cells.length && cells.every(([r, col]) => kase.rooms[r][col] === vroom)) return true;
  }
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
    const usedR = new Set([vc[0], kc[0]]), usedC = new Set([vc[1], kc[1]]), usedRooms = new Set([vroom]);
    // Budget de recherche par tentative : mieux vaut retirer une autre case victime que s'enliser.
    let budget = 20000;
    const assign = (i: number): boolean => {
      if (i === rest.length) return true;
      if (--budget < 0) return false;
      for (const [r, c] of outside) {
        const room = kase.rooms[r][c];
        if (usedR.has(r) || usedC.has(c) || usedRooms.has(room)) continue;
        place[rest[i]] = [r, c]; usedR.add(r); usedC.add(c); usedRooms.add(room);
        if (assign(i + 1)) return true;
        usedR.delete(r); usedC.delete(c); usedRooms.delete(room); delete place[rest[i]];
      }
      return false;
    };
    if (assign(0)) return { place, vroom, killer };
  }
  return null;
}

/**
 * Meuble chaque pièce avec son propre mobilier (pas de lit dans la cuisine) :
 * ~40 % d'assises, ~40 % d'objets bloquants, le reste en sol nu ; au moins une assise par pièce.
 */
function furnish(rnd: () => number, rooms: string[][], roomDef: Record<string, RoomDef>): string[][] {
  const n = rooms.length;
  const furniture = rooms.map((row) => row.map((id) => {
    const d = roomDef[id], x = rnd();
    return x < 0.4 ? pick(rnd, d.seats) : x < 0.8 ? pick(rnd, d.objects) : 'vide';
  }));
  for (const id of Object.keys(roomDef)) {
    const cells: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (rooms[r][c] === id) cells.push([r, c]);
    if (!cells.some(([r, c]) => !FURNITURE[furniture[r][c]]?.block)) {
      const [r, c] = pick(rnd, cells);
      furniture[r][c] = pick(rnd, roomDef[id].seats);
    }
  }
  return furniture;
}

function truthPool(kase: DeductionCase, place: Placement, rnd: () => number, people: Person[]): Clue[] {
  const clues: Clue[] = [];
  const rooms = Object.keys(kase.roomNames);
  for (const p of people) {
    const [r, c] = place[p.id]!;
    const room = kase.rooms[r][c], code = kase.furniture[r][c], t = fType(code), col = fColor(code);
    const isSeat = code !== 'vide' && !!FURNITURE[code] && !FURNITURE[code].block;
    clues.push({ t: 'room', who: p.id, room, text: '' });
    for (const other of shuffle(rnd, rooms.filter((x) => x !== room)).slice(0, 2))
      clues.push({ t: 'notRoom', who: p.id, room: other, text: '' });
    if (isSeat) clues.push({ t: 'furniture', who: p.id, ftype: t, color: col ?? undefined, text: '' });
    for (const [a, b] of shuffle(rnd, neighbors(kase, r, c).filter(([a, b]) => kase.rooms[a][b] === room))) {
      const nt = fType(kase.furniture[a][b]);
      if (FURNITURE[nt]?.block) { clues.push({ t: 'nextToFurniture', who: p.id, ftype: nt, text: '' }); break; }
    }
  }
  const ids = people.map((p) => p.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j], pa = place[a]!, pb = place[b]!;
    if (rnd() < 0.5) clues.push(pa[1] < pb[1] ? { t: 'colLeft', a, b, text: '' } : { t: 'colLeft', a: b, b: a, text: '' });
    if (rnd() < 0.35) clues.push(pa[0] < pb[0] ? { t: 'rowAbove', a, b, text: '' } : { t: 'rowAbove', a: b, b: a, text: '' });
  }
  return clues;
}

function clueText(kase: DeductionCase, clue: Clue): string {
  const nm = (id: string) => kase.people.find((p) => p.id === id)!.name;
  const rn = (room: string) => kase.roomNames[room];
  switch (clue.t) {
    case 'room':
      if (kase.people.find((p) => p.id === clue.who)?.victim) return `Le corps de ${nm(clue.who!)} a été découvert dans « ${rn(clue.room!)} ».`;
      return `${nm(clue.who!)} se trouvait dans « ${rn(clue.room!)} ».`;
    case 'notRoom': return `${nm(clue.who!)} n'était pas dans « ${rn(clue.room!)} ».`;
    case 'furniture': return `${nm(clue.who!)} se trouvait ${FURNITURE[clue.ftype! + (clue.color ? ':' + clue.color : '')].on}.`;
    case 'nextToFurniture': return `${nm(clue.who!)} était juste à côté ${FURNITURE[clue.ftype!].next}.`;
    case 'sameRoom': return `${nm(clue.a!)} et ${nm(clue.b!)} étaient dans la même pièce.`;
    case 'notSameRoom': return `${nm(clue.a!)} et ${nm(clue.b!)} n'étaient pas dans la même pièce.`;
    case 'colLeft': return `${nm(clue.a!)} se trouvait dans une colonne à gauche de ${nm(clue.b!)}.`;
    case 'rowAbove': return `${nm(clue.a!)} se trouvait dans une rangée au-dessus de ${nm(clue.b!)}.`;
  }
  return '';
}
