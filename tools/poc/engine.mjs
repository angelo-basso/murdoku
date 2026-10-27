// Moteur Murdoku (déduction) — fonctions pures partagées par le solveur et le générateur.
// Un "case" = { n, rooms, furniture, blocking, people, clues }.

export const fType = (code) => code.split(':')[0];
export const fColor = (code) => code.split(':')[1] ?? null;
export const occupiable = (c, r, col) => !c.blocking.includes(fType(c.furniture[r][col]));

export function neighbors(c, r, col) {
  return [[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]]
    .filter(([a, b]) => a >= 0 && a < c.n && b >= 0 && b < c.n);
}
export function nextToFurniture(c, r, col, ftype, color) {
  return neighbors(c, r, col).some(([a, b]) =>
    fType(c.furniture[a][b]) === ftype && (!color || fColor(c.furniture[a][b]) === color));
}
export function unaryOk(c, clue, who, r, col) {
  if (clue.who !== who) return true;
  switch (clue.t) {
    case 'room': return c.rooms[r][col] === clue.room;
    case 'notRoom': return c.rooms[r][col] !== clue.room;
    case 'furniture':
      return fType(c.furniture[r][col]) === clue.ftype && (!clue.color || fColor(c.furniture[r][col]) === clue.color);
    case 'nextToFurniture': return nextToFurniture(c, r, col, clue.ftype, clue.color);
    default: return true;
  }
}
export function binaryOk(c, clue, place) {
  const a = clue.a ? place[clue.a] : null, b = clue.b ? place[clue.b] : null;
  switch (clue.t) {
    case 'sameRoom': if (!a || !b) return true; return c.rooms[a[0]][a[1]] === c.rooms[b[0]][b[1]];
    case 'notSameRoom': if (!a || !b) return true; return c.rooms[a[0]][a[1]] !== c.rooms[b[0]][b[1]];
    case 'colLeft': if (!a || !b) return true; return a[1] < b[1];
    case 'rowAbove': if (!a || !b) return true; return a[0] < b[0];
    default: return true;
  }
}
export function candidates(c, whoId) {
  const unary = c.clues.filter((x) => x.who);
  const out = [];
  for (let r = 0; r < c.n; r++)
    for (let col = 0; col < c.n; col++)
      if (occupiable(c, r, col) && unary.every((cl) => unaryOk(c, cl, whoId, r, col))) out.push([r, col]);
  return out;
}
// Résout en s'arrêtant à `limit` solutions (par défaut 2, pour tester l'unicité).
export function solve(c, limit = 2) {
  const binary = c.clues.filter((x) => x.a && x.b);
  const ids = c.people.map((p) => p.id);
  const cand = {};
  for (const id of ids) cand[id] = candidates(c, id);
  const order = [...ids].sort((x, y) => cand[x].length - cand[y].length);
  const solutions = [], place = {}, usedR = new Set(), usedC = new Set();
  const rec = (i) => {
    if (solutions.length >= limit) return;
    if (i === order.length) { solutions.push({ ...place }); return; }
    for (const [r, col] of cand[order[i]]) {
      if (usedR.has(r) || usedC.has(col)) continue;
      place[order[i]] = [r, col];
      if (binary.every((cl) => binaryOk(c, cl, place))) {
        usedR.add(r); usedC.add(col); rec(i + 1); usedR.delete(r); usedC.delete(col);
      }
      delete place[order[i]];
      if (solutions.length >= limit) return;
    }
  };
  rec(0);
  return solutions;
}
export const solutionCount = (c, limit = 2) => solve(c, limit).length;

// Un indice est-il vérifié par un placement (complet) donné ?
export function clueHolds(c, clue, place) {
  if (clue.who) { const p = place[clue.who]; if (!p) return false; return unaryOk(c, clue, clue.who, p[0], p[1]); }
  return binaryOk(c, clue, place);
}

export function culprit(c, place) {
  const victim = c.people.find((p) => p.victim);
  if (!victim) return null;
  const vp = place[victim.id]; if (!vp) return null;
  const vroom = c.rooms[vp[0]][vp[1]];
  const others = c.people.filter((p) => { const pp = place[p.id]; return !p.victim && pp && c.rooms[pp[0]][pp[1]] === vroom; });
  return others.length === 1 ? others[0].id : null;
}
