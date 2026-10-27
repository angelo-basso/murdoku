// Solveur Murdoku générique + validation d'unicité (prototype).
import { N, ROOM, ROOM_NAMES, F, BLOCKING, PEOPLE, CLUES } from './case.mjs';

const fType = (code) => code.split(':')[0];
const fColor = (code) => code.split(':')[1] ?? null;
const occupiable = (r, c) => !BLOCKING.has(fType(F[r][c]));

const neighbors = (r, c) =>
  [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(
    ([a, b]) => a >= 0 && a < N && b >= 0 && b < N,
  );

const nextToFurniture = (r, c, ftype, color) =>
  neighbors(r, c).some(([a, b]) =>
    fType(F[a][b]) === ftype && (!color || fColor(F[a][b]) === color));

// Clue unaire (dépend d'une seule personne) → test sur une case.
function unaryOk(clue, who, r, c) {
  if (clue.who !== who) return true;
  switch (clue.t) {
    case 'room': return ROOM[r][c] === clue.room;
    case 'notRoom': return ROOM[r][c] !== clue.room;
    case 'furniture':
      return fType(F[r][c]) === clue.ftype && (!clue.color || fColor(F[r][c]) === clue.color);
    case 'nextToFurniture':
      return nextToFurniture(r, c, clue.ftype, clue.color);
    default: return true;
  }
}

// Clue binaire → test sur deux placements.
function binaryOk(clue, place) {
  const a = place[clue.a], b = place[clue.b];
  if (clue.t === 'sameRoom' && clue.a && clue.b) {
    if (!a || !b) return true;
    return ROOM[a[0]][a[1]] === ROOM[b[0]][b[1]];
  }
  if (clue.t === 'notSameRoom' && clue.a && clue.b) {
    if (!a || !b) return true;
    return ROOM[a[0]][a[1]] !== ROOM[b[0]][b[1]];
  }
  if (clue.t === 'colLeft') { if (!a || !b) return true; return a[1] < b[1]; }
  if (clue.t === 'rowAbove') { if (!a || !b) return true; return a[0] < b[0]; }
  return true;
}

const unaryClues = CLUES.filter((c) => c.who);
const binaryClues = CLUES.filter((c) => c.a && c.b);

// Cases candidates par personne (filtrées par les indices unaires).
function candidates(whoId) {
  const out = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (occupiable(r, c) && unaryClues.every((cl) => unaryOk(cl, whoId, r, c)))
        out.push([r, c]);
  return out;
}

function solve() {
  const ids = PEOPLE.map((p) => p.id);
  const cand = Object.fromEntries(ids.map((id) => [id, candidates(id)]));
  // ordre : moins de candidats d'abord (propagation)
  const order = [...ids].sort((a, b) => cand[a].length - cand[b].length);

  const solutions = [];
  const place = {};
  const usedR = new Set(), usedC = new Set();

  (function rec(i) {
    if (solutions.length > 1) return; // on s'arrête dès qu'on sait que ce n'est pas unique
    if (i === order.length) { solutions.push({ ...place }); return; }
    const id = order[i];
    for (const [r, c] of cand[id]) {
      if (usedR.has(r) || usedC.has(c)) continue;
      place[id] = [r, c];
      if (binaryClues.every((cl) => binaryOk(cl, place))) {
        usedR.add(r); usedC.add(c);
        rec(i + 1);
        usedR.delete(r); usedC.delete(c);
      }
      delete place[id];
      if (solutions.length > 1) return;
    }
  })(0);

  return { solutions, cand };
}

function roomOccupants(place) {
  const byRoom = {};
  for (const [id, [r, c]] of Object.entries(place)) {
    const room = ROOM[r][c];
    (byRoom[room] ??= []).push(id);
  }
  return byRoom;
}

// --- Rapport ---
const { solutions, cand } = solve();
console.log('Candidats par personne (après indices unaires) :');
for (const p of PEOPLE) console.log(`  ${p.id.padEnd(10)} ${cand[p.id].length} case(s)`);
console.log(`\nNombre de solutions trouvées : ${solutions.length}${solutions.length > 1 ? ' (≥2, NON unique)' : ''}`);

if (solutions.length === 1) {
  const sol = solutions[0];
  console.log('\nSolution :');
  for (const p of PEOPLE) {
    const [r, c] = sol[p.id];
    console.log(`  ${p.name.padEnd(22)} → (${r},${c})  ${ROOM_NAMES[ROOM[r][c]]}  [${F[r][c]}]`);
  }
  const victim = PEOPLE.find((p) => p.victim);
  const [vr, vc] = sol[victim.id];
  const vroom = ROOM[vr][vc];
  const occ = roomOccupants(sol)[vroom].filter((id) => id !== victim.id);
  console.log(`\nPièce de la victime : ${ROOM_NAMES[vroom]} — occupants (hors victime) : ${occ.join(', ') || 'aucun'}`);
  if (occ.length === 1) {
    const killer = PEOPLE.find((p) => p.id === occ[0]);
    console.log(`\n✅ COUPABLE : ${killer.name} (seul avec la victime dans ${ROOM_NAMES[vroom]}).`);
  } else {
    console.log(`\n❌ La pièce de la victime ne contient pas exactement 1 suspect — affaire mal posée.`);
  }
} else if (solutions.length > 1) {
  console.log('\nDeux solutions distinctes (il faut un indice de plus) :');
  solutions.slice(0, 2).forEach((sol, k) => {
    console.log(` Solution ${k + 1} :`);
    for (const p of PEOPLE) { const [r, c] = sol[p.id]; console.log(`   ${p.id.padEnd(10)} (${r},${c})`); }
  });
} else {
  console.log('\n❌ Aucune solution — indices trop stricts ou contradictoires.');
}
