// Générateur d'affaires Murdoku avec graine (seed) et garantie d'unicité.
import { occupiable, fType, fColor, neighbors, solve, solutionCount, clueHolds, culprit } from './engine.mjs';

// --- RNG déterministe à partir d'une chaîne ---
function xmur3(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rng(seed) { const s = xmur3(String(seed)); return mulberry32(s()); }
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
function shuffle(rnd, arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// --- Thème classique par défaut (plans + mobilier + noms) ---
export const CLASSIC = {
  blocking: ['table', 'plante', 'biblio', 'coiffeuse'],
  seating: ['chaise', 'chaise', 'chaise', 'canape', 'lit:bleu', 'lit:rouge', 'lit:vert', 'vide'],
  blockers: ['table', 'plante', 'biblio', 'coiffeuse'],
  roomNamePool: ['Chambre bleue', 'Chambre rouge', 'Bureau', 'Cuisine', 'Salon', 'Bibliothèque', 'Atelier', 'Véranda', 'Cellier', 'Fumoir'],
  layouts: {
    6: [
      ['AABBCC', 'AABBCC', 'DDEEFF', 'DDEEFF', 'GGGHHH', 'GGGHHH'],
      ['AABBBC', 'AADBBC', 'DDDECC', 'FFDEEC', 'FFGEEH', 'FGGGHH'],
    ],
    5: [['AABBC', 'AABCC', 'DDBCE', 'DDFEE', 'DFFEE']],
    7: [['AABBCCC', 'AABBDCC', 'EEBBDDF', 'EEGGDDF', 'EHGGIDF', 'HHGJIIF', 'HHJJIIF']],
  },
};

const FURN_LABEL = { lit: 'le lit', chaise: 'une chaise', canape: 'un canapé', table: 'une table', plante: 'une plante', biblio: 'une bibliothèque', coiffeuse: 'une coiffeuse' };
const NEXT_LABEL = { lit: "d'un lit", chaise: "d'une chaise", canape: "d'un canapé", table: "d'une table", plante: "d'une plante", biblio: "d'une bibliothèque", coiffeuse: "d'une coiffeuse" };
const litColorLabel = (col) => `le lit au duvet ${col}`;

function clueText(c, clue) {
  const nm = (id) => c.people.find((p) => p.id === id).name;
  const rn = (room) => c.roomNames[room];
  switch (clue.t) {
    case 'room': return `${nm(clue.who)} se trouvait dans « ${rn(clue.room)} ».`;
    case 'notRoom': return `${nm(clue.who)} n'était pas dans « ${rn(clue.room)} ».`;
    case 'furniture': return `${nm(clue.who)} se tenait sur ${clue.color ? litColorLabel(clue.color) : FURN_LABEL[clue.ftype]}.`;
    case 'nextToFurniture': return `${nm(clue.who)} était juste à côté ${NEXT_LABEL[clue.ftype]}${clue.color ? ' (duvet ' + clue.color + ')' : ''}.`;
    case 'sameRoom': return `${nm(clue.a)} et ${nm(clue.b)} étaient dans la même pièce.`;
    case 'notSameRoom': return `${nm(clue.a)} et ${nm(clue.b)} n'étaient pas dans la même pièce.`;
    case 'colLeft': return `${nm(clue.a)} se trouvait dans une colonne à gauche de ${nm(clue.b)}.`;
    case 'rowAbove': return `${nm(clue.a)} se trouvait dans une rangée au-dessus de ${nm(clue.b)}.`;
  }
  return '';
}

function buildFurniture(theme, rnd, rooms, n) {
  const pool = [...theme.seating, ...theme.blockers];
  const F = [];
  for (let r = 0; r < n; r++) { const row = []; for (let col = 0; col < n; col++) row.push(pick(rnd, pool)); F.push(row); }
  return F;
}

// Cherche une solution : victime + exactement 1 suspect dans la pièce de la victime.
function findSolution(skel, rnd, people) {
  const n = skel.n;
  const occ = [];
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (occupiable(skel, r, col)) occ.push([r, col]);
  if (occ.length < n) return null;
  const suspects = people.filter((p) => !p.victim).map((p) => p.id);
  const victimId = people.find((p) => p.victim).id;

  for (let attempt = 0; attempt < 60; attempt++) {
    const vc = pick(rnd, occ);
    const vroom = skel.rooms[vc[0]][vc[1]];
    const killerCells = occ.filter(([r, col]) => skel.rooms[r][col] === vroom && r !== vc[0] && col !== vc[1]);
    if (!killerCells.length) continue;
    const kc = pick(rnd, killerCells);
    // reste : suspects hors pièce victime, lignes/colonnes distinctes
    const outside = shuffle(rnd, occ.filter(([r, col]) => skel.rooms[r][col] !== vroom));
    const rest = suspects.slice(1); // le 1er suspect = tueur
    const place = { [victimId]: vc, [suspects[0]]: kc };
    const usedR = new Set([vc[0], kc[0]]), usedC = new Set([vc[1], kc[1]]);
    const assign = (i) => {
      if (i === rest.length) return true;
      for (const [r, col] of outside) {
        if (usedR.has(r) || usedC.has(col)) continue;
        place[rest[i]] = [r, col]; usedR.add(r); usedC.add(col);
        if (assign(i + 1)) return true;
        usedR.delete(r); usedC.delete(col); delete place[rest[i]];
      }
      return false;
    };
    if (assign(0)) return { place, vroom };
  }
  return null;
}

// Pool d'indices VRAIS pour la solution.
function truePool(skel, sol, rnd, people) {
  const n = skel.n, clues = [];
  const rooms = Object.keys(skel.roomNames);
  for (const p of people) {
    const [r, col] = sol.place[p.id];
    const room = skel.rooms[r][col], code = skel.furniture[r][col], t = fType(code), col2 = fColor(code);
    clues.push({ t: 'room', who: p.id, room });
    const otherRooms = rooms.filter((x) => x !== room);
    if (otherRooms.length) clues.push({ t: 'notRoom', who: p.id, room: pick(rnd, otherRooms) });
    if (['chaise', 'canape', 'lit'].includes(t)) {
      clues.push({ t: 'furniture', who: p.id, ftype: t, color: t === 'lit' ? col2 : undefined });
    }
    for (const [a, b] of neighbors(skel, r, col)) {
      const nt = fType(skel.furniture[a][b]);
      if (['coiffeuse', 'plante', 'table', 'biblio'].includes(nt)) { clues.push({ t: 'nextToFurniture', who: p.id, ftype: nt }); break; }
    }
  }
  // paires
  const ids = people.map((p) => p.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j], pa = sol.place[a], pb = sol.place[b];
    const same = skel.rooms[pa[0]][pa[1]] === skel.rooms[pb[0]][pb[1]];
    if (same) clues.push({ t: 'sameRoom', a, b }); else if (rnd() < 0.5) clues.push({ t: 'notSameRoom', a, b });
    if (rnd() < 0.5) clues.push(pa[1] < pb[1] ? { t: 'colLeft', a, b } : { t: 'colLeft', a: b, b: a });
    if (rnd() < 0.3) clues.push(pa[0] < pb[0] ? { t: 'rowAbove', a, b } : { t: 'rowAbove', a: b, b: a });
  }
  return clues;
}

const DIFF = { facile: { minimize: false, relationalFirst: false, extra: 2 }, moyen: { minimize: true, relationalFirst: false, extra: 0 }, difficile: { minimize: true, relationalFirst: true, extra: 0 } };

export function generateCase(opts) {
  const { size = 6, difficulty = 'moyen', seed, theme = CLASSIC, title } = opts;
  const diff = DIFF[difficulty] ?? DIFF.moyen;

  for (let salt = 0; salt < 40; salt++) {
    const rnd = rng(`${seed}|${salt}`);
    const layout = pick(rnd, theme.layouts[size]);
    const rooms = layout.map((row) => row.split(''));
    const roomIds = [...new Set(layout.join(''))];
    const names = shuffle(rnd, theme.roomNamePool);
    const roomNames = Object.fromEntries(roomIds.map((id, i) => [id, names[i % names.length]]));
    const furniture = buildFurniture(theme, rnd, rooms, size);
    const people = theme.people.map((p) => ({ ...p }));
    const skel = { n: size, rooms, roomNames, furniture, blocking: theme.blocking, people, clues: [] };

    const sol = findSolution(skel, rnd, people);
    if (!sol) continue;

    let pool = truePool(skel, sol, rnd, people);
    // toujours inclure la pièce de la victime (le corps est trouvé là)
    const victimId = people.find((p) => p.victim).id;
    const mustRoom = { t: 'room', who: victimId, room: sol.vroom };
    pool = pool.filter((c) => !(c.t === 'room' && c.who === victimId));
    pool = shuffle(rnd, pool);
    if (diff.relationalFirst) pool.sort((a, b) => rank(a) - rank(b));

    // sélection : à chaque tour, éliminer une solution parasite (solve limité = rapide)
    skel.clues = [mustRoom];
    const target = sol.place;
    const sameAs = (a, b) => people.every((p) => a[p.id][0] === b[p.id][0] && a[p.id][1] === b[p.id][1]);
    let ok = true;
    for (let guard = 0; guard < 80; guard++) {
      const sols = solve(skel, 2);
      if (sols.length === 1) break;
      const spurious = sols.find((s) => !sameAs(s, target)) ?? sols[0];
      const elim = pool.find((cl) => !skel.clues.includes(cl) && !clueHolds(skel, cl, spurious));
      if (!elim) { ok = false; break; }
      skel.clues = [...skel.clues, elim];
    }
    if (!ok || solutionCount(skel, 2) !== 1) continue;

    // minimisation (moyen/difficile)
    if (diff.minimize) {
      for (let i = skel.clues.length - 1; i >= 0; i--) {
        if (skel.clues[i] === mustRoom) continue;
        const without = skel.clues.filter((_, k) => k !== i);
        if (solutionCount({ ...skel, clues: without }, 2) === 1) skel.clues = without;
      }
    }
    // indices "de confort" en facile
    if (diff.extra) {
      const extra = shuffle(rnd, pool.filter((c) => !skel.clues.includes(c) && (c.t === 'room' || c.t === 'furniture' || c.t === 'nextToFurniture')));
      skel.clues = [...skel.clues, ...extra.slice(0, diff.extra)];
    }

    // vérif finale
    const sols = solve(skel, 2);
    if (sols.length !== 1) continue;
    const killer = culprit(skel, sols[0]);
    if (!killer) continue;

    skel.clues = skel.clues.map((c) => ({ ...c, text: clueText(skel, c) }));
    return {
      id: `gen-${size}-${difficulty}-${seed}`, title: title ?? 'Affaire générée', n: size,
      intro: `Affaire générée (graine ${seed}, ${difficulty}). Placez chaque personne selon les indices ; le coupable finit seul avec la victime.`,
      rooms, roomNames, furniture, blocking: theme.blocking, people, clues: skel.clues,
      meta: { seed, size, difficulty, solution: sols[0], killer, clueCount: skel.clues.length },
    };
  }
  return null;
}
function rank(c) { return ['sameRoom', 'notSameRoom', 'colLeft', 'rowAbove', 'notRoom', 'nextToFurniture', 'furniture', 'room'].indexOf(c.t); }

// --- CLI de validation ---
if (process.argv[1] && process.argv[1].endsWith('generate.mjs')) {
  const basePeople = [
    { id: 'victime', name: 'M. Hervé', victim: true }, { id: 'p1', name: 'Hugo' }, { id: 'p2', name: 'Léa' },
    { id: 'p3', name: 'Sofia' }, { id: 'p4', name: 'Marco' }, { id: 'p5', name: 'Inès' }, { id: 'p6', name: 'Theo' },
  ];
  for (const size of [5, 6, 7]) {
    for (const difficulty of ['facile', 'moyen', 'difficile']) {
      let ok = 0, fail = 0, clues = 0, t0 = Date.now();
      const trials = size === 7 ? 40 : 80;
      for (let s = 0; s < trials; s++) {
        const c = generateCase({ size, difficulty, seed: `test-${s}`, theme: { ...CLASSIC, people: basePeople.slice(0, size) } });
        if (c) { ok++; clues += c.meta.clueCount; } else fail++;
      }
      console.log(`taille ${size} / ${difficulty.padEnd(10)} : ${ok}/${ok + fail} uniques, ~${(clues / Math.max(ok,1)).toFixed(1)} indices, ${((Date.now() - t0) / trials).toFixed(0)}ms/affaire`);
    }
  }
}
