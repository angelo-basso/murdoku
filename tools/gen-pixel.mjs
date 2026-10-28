// Générateur d'assets pixel-art (CC0) : portraits de personnages + meubles top-down.
// Pur (aucune dépendance) : écrit des fichiers SVG pixelisés dans src/assets/.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(ROOT + 'src/assets/characters', { recursive: true });
mkdirSync(ROOT + 'src/assets/furniture', { recursive: true });

// --- Émetteur commun : grille (hex|null) -> SVG pixelisé (runs horizontaux) ---
function toSVG(g) {
  const H = g.length, W = g[0].length;
  let rects = '';
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = g[y][x];
      if (!c) { x++; continue; }
      let w = 1;
      while (x + w < W && g[y][x + w] === c) w++;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
      x += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects}</svg>\n`;
}
const grid = (W, H) => Array.from({ length: H }, () => new Array(W).fill(null));
const inb = (g, x, y) => y >= 0 && y < g.length && x >= 0 && x < g[0].length;
const set = (g, x, y, c) => { if (inb(g, x, y) && c) g[y][x] = c; };
const rect = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(g, x + i, y + j, c); };
const ell = (g, cx, cy, rx, ry, c, pred) => { for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1 && (!pred || pred(x, y))) set(g, x, y, c); } };
function outline(g, c) {
  const o = grid(g[0].length, g.length);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inb(g, x + a, y + b) && g[y + b][x + a] && g[y + b][x + a] !== c)) o[y][x] = c;
  }
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (o[y][x] && !g[y][x]) g[y][x] = o[y][x];
}

// ================= PERSONNAGES (40x46) =================
const W = 40, HT = 46, cx = 20, cy = 21, rx = 8, ry = 10;
const C = { out: '#241a2e', white: '#f6f0ea', pupil: '#3a2d33', mouth: '#9c4a46', sk3: '#b87a4f', grey: '#d9d5e0', grey2: '#b4afc2' };

function charBase(g, skin, sh) {
  ell(g, cx, cy, rx, ry, skin);
  ell(g, cx, cy, rx, ry, sh, (x, y) => x > cx + 3 || y > cy + 5);
  rect(g, cx - rx - 1, cy - 1, 2, 4, skin); rect(g, cx + rx - 1, cy - 1, 2, 4, skin);
  rect(g, cx - 3, cy + ry - 2, 6, 5, skin); rect(g, cx + 1, cy + ry - 1, 2, 4, sh);
}
function charFeatures(g, dead) {
  if (dead) {
    for (const ex of [cx - 4, cx + 2]) { set(g, ex, 19, C.pupil); set(g, ex + 2, 19, C.pupil); set(g, ex + 1, 20, C.pupil); set(g, ex, 21, C.pupil); set(g, ex + 2, 21, C.pupil); }
  } else {
    rect(g, cx - 6, 19, 3, 2, C.white); rect(g, cx + 3, 19, 3, 2, C.white);
    set(g, cx - 5, 19, C.pupil); set(g, cx + 4, 19, C.pupil); set(g, cx - 5, 20, C.pupil); set(g, cx + 4, 20, C.pupil);
    rect(g, cx - 6, 17, 3, 1, C.sk3); rect(g, cx + 3, 17, 3, 1, C.sk3);
  }
  set(g, cx, 22, C.sk3); set(g, cx - 1, 23, C.sk3);
  if (dead) rect(g, cx - 2, 26, 5, 1, C.mouth);
  else { rect(g, cx - 2, 25, 5, 1, C.mouth); set(g, cx - 3, 24, C.sk3); set(g, cx + 3, 24, C.sk3); }
}
function charBust(g, col, shade) {
  for (let y = cy + ry + 2; y < HT; y++) { const w = Math.min(W - 6, (y - (cy + ry)) * 3 + 8); rect(g, cx - Math.floor(w / 2), y, w, 1, col); }
  rect(g, cx - 3, cy + ry + 2, 2, 3, shade); rect(g, cx + 2, cy + ry + 2, 2, 3, shade);
}
const hairShort = (g, c, c2) => { ell(g, cx, cy - 2, rx + 1, ry, c, (x, y) => y < cy - 2 || x < cx - rx + 1 || x > cx + rx - 2); ell(g, cx, cy - 3, rx, ry - 2, c2, (x, y) => y < cy - 4); };
const hairLong = (g, c, c2) => { ell(g, cx, cy, rx + 2, ry + 2, c, (x, y) => (x < cx - rx + 1 || x > cx + rx - 2 || y < cy - 3) && y < cy + ry + 2); rect(g, cx - rx - 1, cy, 2, ry + 4, c); rect(g, cx + rx - 1, cy, 2, ry + 4, c); ell(g, cx, cy - 3, rx, ry - 2, c2, (x, y) => y < cy - 4); };
const bun = (g, c, c2) => { hairLong(g, c, c2); rect(g, cx - 2, cy - ry - 2, 4, 3, c); ell(g, cx, cy - ry - 2, 3, 3, c2); };
const beret = (g, hair) => { hairShort(g, hair, hair); ell(g, cx + 1, cy - ry - 1, rx - 1, 3, '#c0392b'); ell(g, cx + 1, cy - ry - 1, rx - 2, 2, '#d6453b'); set(g, cx + 4, cy - ry - 3, '#8e2a22'); };
const strawhat = (g, hair) => { hairShort(g, hair, hair); ell(g, cx, cy - ry + 1, rx + 4, 3, '#d9b45e'); ell(g, cx, cy - ry - 1, rx - 2, 4, '#e9c877'); rect(g, cx - rx - 3, cy - ry + 1, 2 * rx + 6, 1, '#b9933e'); };
const cap = (g, hair, col) => { hairShort(g, hair, hair); ell(g, cx, cy - ry + 2, rx, 4, col); rect(g, cx - rx, cy - ry + 4, 2 * rx + 1, 2, col); rect(g, cx - rx - 3, cy - ry + 5, 5, 1, '#000a'); rect(g, cx - rx - 3, cy - ry + 4, rx + 3, 1, col); };
function glasses(g) { for (const ex of [cx - 7, cx + 2]) { rect(g, ex, 18, 5, 1, C.pupil); rect(g, ex, 21, 5, 1, C.pupil); set(g, ex, 19, C.pupil); set(g, ex, 20, C.pupil); set(g, ex + 4, 19, C.pupil); set(g, ex + 4, 20, C.pupil); } rect(g, cx - 2, 19, 2, 1, C.pupil); }
// --- éléments "monstres" ---
const fangs = (g) => { rect(g, cx - 2, 27, 1, 2, '#fff'); rect(g, cx + 1, 27, 1, 2, '#fff'); };
const widowPeak = (g, c) => { set(g, cx, cy - ry + 2, c); set(g, cx, cy - ry + 3, c); set(g, cx - 1, cy - ry + 3, c); set(g, cx + 1, cy - ry + 3, c); };
function witchHat(g) {
  for (let i = 0; i < 17; i++) { const w = Math.max(1, Math.round((17 - i) * 0.6)); rect(g, cx - Math.floor(w / 2) + Math.round(Math.sin(i / 3) * 2), cy - ry - 1 - i, w, 1, '#1a1420'); }
  ell(g, cx, cy - ry + 1, rx + 5, 2, '#1a1420'); rect(g, cx - 3, cy - ry - 3, 7, 1, '#6c5ce7');
}
function wolfEars(g, fur) {
  for (let i = 0; i < 5; i++) { rect(g, cx - rx - 1 + i, cy - ry - 4 + i, 5 - i, 1, fur); rect(g, cx + rx - 3 + i, cy - ry - i, 5 - i, 1, fur); }
  rect(g, cx + rx - 3, cy - ry - 4, 5, 5, fur); // oreille droite (symétrie simple)
  for (let i = 0; i < 5; i++) rect(g, cx + rx - 1 - i, cy - ry - 4 + i, 5 - i, 1, fur);
}
function skullFace(g) {
  ell(g, cx, cy, rx, ry, '#ece7df');
  ell(g, cx, cy + 4, rx - 2, ry - 4, '#dcd5c8', (x, y) => y > cy + 2);
  ell(g, cx - 4, 20, 3, 3, '#201820'); ell(g, cx + 4, 20, 3, 3, '#201820'); // orbites
  rect(g, cx, 24, 1, 3, '#201820'); set(g, cx - 1, 26, '#201820'); set(g, cx + 1, 26, '#201820'); // nez
  for (let i = -3; i <= 3; i += 2) rect(g, cx + i, 29, 1, 3, '#201820'); // dents
  rect(g, cx - 4, 30, 9, 1, '#cbbfae');
}
function mummyFace(g) {
  charBase(g, '#e8e0cf', '#cfc6b2');
  for (let y = 12; y < 32; y += 3) rect(g, cx - rx, y, 2 * rx, 1, '#b8ad95'); // bandages
  rect(g, cx + 1, 19, 4, 2, '#201820'); set(g, cx + 2, 20, '#6b2b2b'); // un œil visible
  rect(g, cx - 2, 26, 4, 1, '#9c8f76');
}

// --- couvre-chefs & accessoires (personnel, manoir) ---
const hardhat = (g, hair, col, hi) => {
  hairShort(g, hair, hair);
  ell(g, cx, cy - ry + 3, rx + 1, 5, col, (x, y) => y < cy - ry + 5);
  rect(g, cx - rx - 2, cy - ry + 4, 2 * rx + 5, 2, col); rect(g, cx - 1, cy - ry - 2, 2, 6, hi);
};
const toque = (g) => {
  rect(g, cx - rx + 1, cy - ry, 2 * rx - 1, 3, '#f4f4f8');
  ell(g, cx - 4, cy - ry - 3, 4, 4, '#f4f4f8'); ell(g, cx + 4, cy - ry - 3, 4, 4, '#f4f4f8'); ell(g, cx, cy - ry - 5, 5, 5, '#ffffff');
  rect(g, cx - rx + 1, cy - ry + 2, 2 * rx - 1, 1, '#d6d6e0');
};
const maidCap = (g) => { rect(g, cx - 6, cy - ry - 1, 13, 2, '#f4f4f8'); for (let x = cx - 6; x <= cx + 6; x += 2) set(g, x, cy - ry - 2, '#f4f4f8'); };
const tie = (g, col) => { rect(g, cx - 3, 33, 2, 2, '#f2f2f2'); rect(g, cx + 2, 33, 2, 2, '#f2f2f2'); rect(g, cx - 1, 33, 3, 10, col); set(g, cx, 43, col); };
const mustache = (g, col) => { rect(g, cx - 3, 24, 7, 1, col); set(g, cx - 4, 25, col); set(g, cx + 3, 25, col); };
const earrings = (g) => { set(g, cx - rx - 1, cy + 3, '#e6c04a'); set(g, cx + rx, cy + 3, '#e6c04a'); };
const lips = (g) => rect(g, cx - 2, 25, 5, 1, '#c0392b');
const stubble = (g) => { for (let x = cx - 5; x <= cx + 5; x += 2) { set(g, x, 27, '#9a7458'); set(g, x + 1, 28, '#9a7458'); } };
const vestStripes = (g) => { rect(g, cx - 14, 38, 29, 2, '#e8e8e8'); rect(g, cx - 3, 33, 2, 13, '#e8e8e8'); rect(g, cx + 2, 33, 2, 13, '#e8e8e8'); };
const capBack = (g, hair, col) => { hairShort(g, hair, hair); ell(g, cx, cy - ry + 2, rx, 4, col); rect(g, cx - rx, cy - ry + 4, 2 * rx + 1, 2, col); rect(g, cx + rx - 1, cy - ry + 4, 5, 1, col); };
const secCap = (g, hair) => { cap(g, hair, '#1f2a44'); rect(g, cx - 1, cy - ry + 1, 3, 2, '#e6c04a'); };
const bob = (g, c, c2) => { ell(g, cx, cy - 1, rx + 2, ry + 1, c, (x, y) => (x < cx - rx + 2 || x > cx + rx - 3 || y < cy - 4) && y < cy + 5); ell(g, cx, cy - 3, rx, ry - 2, c2, (x, y) => y < cy - 4); };
const ponytail = (g, c, c2) => { hairShort(g, c, c2); rect(g, cx + rx, cy - 3, 3, 11, c); };
const receding = (g, c) => { rect(g, cx - rx, cy - 4, 2, 6, c); rect(g, cx + rx - 1, cy - 4, 2, 6, c); };
function ghostFace(g) {
  ell(g, cx, cy + 6, rx + 5, ry + 10, '#eef2ff', (x, y) => y < HT);
  ell(g, cx, cy + 6, rx + 5, ry + 10, '#cfd6f0', (x, y) => y < HT && x > cx + 6);
  for (let x = cx - rx - 5; x <= cx + rx + 5; x += 4) { g[HT - 1][x] = null; g[HT - 1][x + 1] = null; }
  ell(g, cx - 4, cy, 2, 3, '#1a1430'); ell(g, cx + 4, cy, 2, 3, '#1a1430'); ell(g, cx, cy + 7, 2, 3, '#1a1430');
}
function scarecrowFace(g) {
  charBase(g, '#c9a46a', '#a9844e');
  rect(g, cx - rx, cy + 1, 2 * rx, 1, '#8a6a3a');
  ell(g, cx - 4, 19, 1.6, 1.6, '#1a1420'); ell(g, cx + 4, 19, 1.6, 1.6, '#1a1420');
  rect(g, cx - 4, 25, 9, 1, '#3a2a1a'); for (const dx of [-3, -1, 1, 3]) { set(g, cx + dx, 24, '#3a2a1a'); set(g, cx + dx, 26, '#3a2a1a'); }
  strawhat(g, '#e0c060');
  for (const [x, y] of [[cx - rx - 2, cy + 2], [cx - rx - 3, cy + 4], [cx + rx + 1, cy + 3], [cx + rx + 2, cy + 5]]) rect(g, x, y, 2, 1, '#e0c060');
  rect(g, cx - 14, 37, 29, 1, '#7a2a1a'); rect(g, cx - 14, 41, 29, 1, '#7a2a1a'); rect(g, cx - 5, 33, 1, 13, '#7a2a1a'); rect(g, cx + 5, 33, 1, 13, '#7a2a1a');
}

const CHARS = {
  plaquiste: { skin: ['#f2c79c', '#d99f73'], outfit: ['#3f6ea5', '#2f4f85'], hair: g => cap(g, '#6b4a2e', '#4a4a55') },
  notaire: { skin: ['#e8bd92', '#d99f73'], outfit: ['#8a3f6a', '#6a2f52'], hair: g => bun(g, '#3a2a22', '#4a362b'), acc: glasses },
  peintre: { skin: ['#eec49a', '#d99f73'], outfit: ['#b5612c', '#8a4a22'], hair: g => beret(g, '#2a2320') },
  jardinier: { skin: ['#e3b483', '#b87a4f'], outfit: ['#3fae6a', '#2a8a50'], hair: g => strawhat(g, '#4a3526') },
  libraire: { skin: ['#f0c89c', '#d99f73'], outfit: ['#227d95', '#185e70'], hair: g => hairLong(g, '#7a3b1e', '#9a4e2a') },
  medecin: { skin: ['#edc196', '#cf9b70'], outfit: ['#e8ecf2', '#c4cad6'], hair: g => hairShort(g, '#2a2320', '#3a2f28'), acc: g => { rect(g, cx - 6, 24, 12, 1, '#b9c0cf'); set(g, cx, 28, '#8a93a8'); } },
  victime: { skin: ['#d9b59a', '#b89478'], outfit: ['#444a66', '#2f3348'], hair: g => hairShort(g, C.grey, C.grey2), dead: true },
  // --- manoir hanté ---
  vampire: { skin: ['#dfe3ea', '#b9c0cf'], outfit: ['#5a1020', '#300a14'], hair: g => { hairShort(g, '#141018', '#201826'); widowPeak(g, '#141018'); }, acc: fangs },
  sorciere: { skin: ['#8fc48a', '#6fa06a'], outfit: ['#3a2a52', '#281c3a'], hair: g => { hairLong(g, '#141018', '#201826'); witchHat(g); } },
  zombie: { skin: ['#9bbf86', '#7a9e68'], outfit: ['#55603a', '#3e4628'], hair: g => hairShort(g, '#3a4a2a', '#2a3820'), acc: g => { rect(g, cx - 5, 19, 3, 2, C.white); set(g, cx - 4, 20, C.pupil); set(g, cx + 2, 19, C.pupil); set(g, cx + 4, 21, C.pupil); rect(g, cx + 5, 24, 3, 1, '#5a6b3a'); } },
  loupgarou: { skin: ['#8a6b47', '#6e5436'], outfit: ['#3a342c', '#241f18'], hair: g => { hairShort(g, '#5a452e', '#45351f'); wolfEars(g, '#5a452e'); }, acc: fangs },
  momie: { skin: ['#e8e0cf', '#cfc6b2'], outfit: ['#cfc7b0', '#ab9f84'], custom: mummyFace },
  squelette: { skin: ['#ece7df', '#dcd5c8'], outfit: ['#2a2a33', '#16161c'], custom: skullFace },
  fantome: { skin: ['#eef2ff', '#cfd6f0'], outfit: ['#eef2ff', '#cfd6f0'], custom: ghostFace },
  epouvantail: { skin: ['#c9a46a', '#a9844e'], outfit: ['#b8452a', '#8a321e'], custom: scarecrowFace },
  // --- manoir (compléments pour 8×8 / 9×9) ---
  cuisinier: { skin: ['#efc39a', '#d39c70'], outfit: ['#f0f0f4', '#c8cad4'], hair: g => { hairShort(g, '#4a3526', '#5a4232'); toque(g); }, acc: g => mustache(g, '#4a3526') },
  gouvernante: { skin: ['#e9bf98', '#cf9f78'], outfit: ['#2a2a36', '#1a1a24'], hair: g => { bun(g, '#9a95a8', '#b4afc2'); maidCap(g); }, acc: g => { rect(g, cx - 4, 33, 9, 2, '#f4f4f8'); } },
  // --- personnel d'entreprise (bureaux & usine) ---
  ouvrier: { skin: ['#e3b483', '#c08a5c'], outfit: ['#3d5a8a', '#2b4268'], hair: g => hardhat(g, '#3a2a20', '#f2c230', '#ffe07a'), acc: stubble },
  contremaitre: { skin: ['#e8b98e', '#c9966a'], outfit: ['#f07a1a', '#c45e10'], hair: g => receding(g, '#8a8494'), acc: g => { mustache(g, '#6a6474'); vestStripes(g); } },
  ingenieure: { skin: ['#f0c89c', '#d39f74'], outfit: ['#4a7a6a', '#355a4e'], hair: g => { ponytail(g, '#3a2a22', '#4a362b'); hardhat(g, '#3a2a22', '#f4f4f8', '#ffffff'); }, acc: glasses },
  secretaire: { skin: ['#f2c9a0', '#d8a47a'], outfit: ['#b0406a', '#8a3052'], hair: g => hairLong(g, '#d9b45e', '#e9c877'), acc: g => { lips(g); earrings(g); } },
  comptable: { skin: ['#ecc095', '#cf9b70'], outfit: ['#3a3f52', '#262a38'], hair: g => hairShort(g, '#5a3f2a', '#6b4d35'), acc: g => { glasses(g); tie(g, '#c43f4f'); } },
  directrice: { skin: ['#d9a07a', '#b8805a'], outfit: ['#1f2a44', '#141c30'], hair: g => bob(g, '#1a1420', '#2a2030'), acc: g => { earrings(g); lips(g); rect(g, cx - 3, 33, 2, 2, '#f2f2f2'); rect(g, cx + 2, 33, 2, 2, '#f2f2f2'); } },
  stagiaire: { skin: ['#f2c9a0', '#d8a47a'], outfit: ['#4fa3d4', '#3a82b0'], hair: g => capBack(g, '#6b4a2e', '#c43f4f') },
  vigile: { skin: ['#9a6a48', '#7a5034'], outfit: ['#1f2a44', '#141c30'], hair: g => secCap(g, '#1a1420'), acc: g => { rect(g, cx + 5, 37, 3, 3, '#e6c04a'); } },
};
for (const [id, ch] of Object.entries(CHARS)) {
  const g = grid(W, HT);
  charBust(g, ch.outfit[0], ch.outfit[1]);
  if (ch.custom) ch.custom(g);
  else { charBase(g, ch.skin[0], ch.skin[1]); charFeatures(g, ch.dead); ch.hair(g); if (ch.acc) ch.acc(g); }
  outline(g, C.out);
  writeFileSync(ROOT + `src/assets/characters/${id}.svg`, toSVG(g));
}

// ================= MEUBLES (24x24, vue de dessus) =================
const T = 24;
const WD = '#6b4f3a', WD2 = '#5b4130', WD3 = '#4a3526', OUT = '#2a2033';
const duvet = { bleu: '#4f78c4', rouge: '#c43f4f', vert: '#3fae6a' };

function tile(draw) { const g = grid(T, T); draw(g); outline(g, OUT); return toSVG(g); }
const FURN = {
  'lit:bleu': g => bed(g, 'bleu'), 'lit:rouge': g => bed(g, 'rouge'), 'lit:vert': g => bed(g, 'vert'),
  chaise: chair, canape: sofa, table: tableF, plante: plant, biblio: shelf, coiffeuse: vanity,
  fauteuil: armchair, cercueil: coffin, chaudron: cauldron, candelabre: candelabra, tombe: tombstone, toile: cobweb,
  siege: officeChair, pouf, bureau: desk, imprimante: printer, fontaine: waterCooler, armoire: cabinet,
  tabouret: stool, banc: bench, machine, caisses: crates, fut: barrel, chariot: forklift,
};
function bed(g, col) { rect(g, 4, 2, 16, 20, WD2); rect(g, 6, 3, 12, 18, '#efe7d8'); rect(g, 6, 10, 12, 11, duvet[col]); rect(g, 7, 4, 10, 5, '#ffffff'); rect(g, 6, 14, 12, 1, '#0003'); }
function chair(g) { rect(g, 7, 8, 10, 10, WD); rect(g, 7, 6, 10, 2, WD2); rect(g, 8, 9, 8, 8, '#7d5c42'); }
function sofa(g) { rect(g, 2, 9, 20, 11, '#6c5ce7'); rect(g, 2, 7, 20, 4, '#7d6cf0'); rect(g, 2, 9, 3, 11, '#5f51cb'); rect(g, 19, 9, 3, 11, '#5f51cb'); rect(g, 6, 12, 5, 6, '#7d6cf0'); rect(g, 13, 12, 5, 6, '#7d6cf0'); }
function tableF(g) { ell(g, 12, 12, 8, 8, WD); ell(g, 12, 12, 5, 5, '#7d5c42'); }
function plant(g) { rect(g, 8, 15, 8, 6, '#b4612c'); rect(g, 8, 15, 8, 1, '#c87a3e'); ell(g, 12, 9, 7, 6, '#2f8f4e'); ell(g, 8, 11, 4, 4, '#3aa85e'); ell(g, 16, 11, 4, 4, '#3aa85e'); }
function shelf(g) { rect(g, 4, 3, 16, 18, WD3); for (const y of [4, 10, 16]) { const cols = ['#c43f4f', '#4f78c4', '#e0a84e', '#3fae6a', '#9b5cd6']; let x = 6; for (const c of cols) { rect(g, x, y, 2, 5, c); x += 3; } } }
function vanity(g) { rect(g, 5, 13, 14, 8, WD); ell(g, 12, 7, 6, 7, '#9fb6d6'); ell(g, 12, 7, 4, 5, '#cfe0f0'); }
// --- mobilier hanté ---
function armchair(g) { rect(g, 5, 8, 14, 13, '#5a2740'); rect(g, 5, 6, 14, 4, '#6e3350'); rect(g, 3, 9, 4, 12, '#4a1f33'); rect(g, 17, 9, 4, 12, '#4a1f33'); rect(g, 8, 11, 8, 7, '#6e3350'); }
function coffin(g) { for (let y = 2; y < 22; y++) { const w = y < 8 ? 6 + y : 16 - Math.max(0, (y - 14)); rect(g, 12 - Math.floor(w / 2), y, w, 1, '#4a3526'); } rect(g, 9, 6, 6, 9, '#2a1d14'); rect(g, 11, 8, 2, 5, '#c0a24e'); rect(g, 10, 10, 4, 1, '#c0a24e'); }
function cauldron(g) { ell(g, 12, 13, 8, 7, '#2a2a30'); ell(g, 12, 9, 8, 3, '#1a1a1f'); ell(g, 12, 9, 6, 2, '#5fae5f'); set(g, 9, 6, '#7ec97e'); set(g, 15, 5, '#7ec97e'); rect(g, 6, 19, 12, 2, '#1a1a1f'); }
function candelabra(g) { rect(g, 11, 8, 2, 12, '#c9a24e'); rect(g, 6, 10, 12, 1, '#c9a24e'); rect(g, 6, 8, 2, 3, '#c9a24e'); rect(g, 16, 8, 2, 3, '#c9a24e'); for (const x of [6, 11, 16]) { rect(g, x, 5, 2, 3, '#efe7d8'); set(g, x, 3, '#f5a623'); set(g, x + 1, 4, '#f5d04e'); } rect(g, 8, 20, 8, 1, '#a07d2e'); }
function tombstone(g) { for (let y = 5; y < 20; y++) { const w = y < 9 ? 6 + (y - 5) * 2 : 14; rect(g, 12 - Math.floor(w / 2), y, w, 1, '#8d8f98'); } rect(g, 5, 20, 14, 2, '#5a5c64'); rect(g, 9, 11, 1, 4, '#5a5c64'); rect(g, 9, 11, 4, 1, '#5a5c64'); rect(g, 14, 11, 1, 6, '#5a5c64'); }
function cobweb(g) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 7; rect(g, 1, 1, Math.round(1 + Math.cos(a) * 18), 1, '#b9b9c4'); } for (let r2 = 4; r2 <= 16; r2 += 4) for (let i = 0; i < 9; i++) { const a = i * Math.PI / 16; set(g, 1 + Math.round(Math.cos(a) * r2), 1 + Math.round(Math.sin(a) * r2), '#9a9aa6'); } }

// --- mobilier bureaux ---
function officeChair(g) { ell(g, 12, 18, 7, 2, '#3a3a44'); for (const x of [5, 12, 19]) set(g, x, 20, '#1a1a22'); rect(g, 11, 14, 2, 4, '#3a3a44'); ell(g, 12, 11, 6, 5, '#2c3e60'); ell(g, 12, 11, 4, 3, '#3a5280'); rect(g, 7, 3, 10, 4, '#22324e'); }
function pouf(g) { ell(g, 12, 12, 8, 7, '#2a9d8f'); ell(g, 11, 10, 5, 4, '#3cb8a8'); set(g, 12, 12, '#1d6f65'); }
function desk(g) { rect(g, 2, 5, 20, 14, '#8a6a4a'); rect(g, 2, 17, 20, 2, '#6b4f3a'); rect(g, 8, 6, 8, 6, '#1a1a22'); rect(g, 9, 7, 6, 4, '#4fa3d4'); rect(g, 8, 13, 8, 2, '#cfcfd8'); rect(g, 18, 8, 2, 2, '#f4f4f8'); }
function printer(g) { rect(g, 4, 8, 16, 11, '#d8d8e0'); rect(g, 6, 4, 12, 5, '#f8f8fc'); rect(g, 4, 17, 16, 2, '#a8a8b4'); rect(g, 15, 10, 3, 2, '#4fd47a'); rect(g, 6, 14, 12, 1, '#666670'); }
function waterCooler(g) { rect(g, 7, 12, 10, 9, '#e6e6ee'); rect(g, 7, 19, 10, 2, '#b8b8c4'); ell(g, 12, 7, 5, 6, '#5aa9e6'); ell(g, 11, 6, 2, 3, '#9fd2f5'); rect(g, 11, 14, 2, 2, '#4f78c4'); }
function cabinet(g) { rect(g, 4, 3, 16, 18, '#7d8794'); for (const y of [8, 13]) rect(g, 5, y, 14, 1, '#5a636e'); for (const y of [5, 10, 16]) rect(g, 11, y, 3, 1, '#e6c04a'); }
// --- mobilier usine ---
function stool(g) { for (const [x, y] of [[6, 6], [17, 6], [6, 17], [17, 17]]) rect(g, x, y, 2, 2, '#4a3526'); ell(g, 12, 12, 6, 6, '#8a6a4a'); ell(g, 12, 12, 4, 4, '#a07d58'); }
function bench(g) { rect(g, 2, 7, 20, 10, '#8a6a4a'); for (const y of [9, 12, 15]) rect(g, 2, y, 20, 1, '#6b4f3a'); rect(g, 3, 17, 2, 2, '#4a3526'); rect(g, 19, 17, 2, 2, '#4a3526'); }
function machine(g) { rect(g, 2, 3, 20, 18, '#6b7380'); rect(g, 4, 5, 8, 6, '#3a4048'); rect(g, 5, 6, 6, 1, '#4fd47a'); ell(g, 17, 8, 3, 3, '#e8e8e8'); rect(g, 17, 6, 1, 3, '#c43f4f'); for (let x = 2; x < 22; x += 4) { rect(g, x, 18, 2, 3, '#f2c230'); rect(g, x + 2, 18, 2, 3, '#1a1a22'); } }
function crates(g) { const box = (x, y, s, c, d) => { rect(g, x, y, s, s, c); for (let i = 0; i < s; i++) { set(g, x + i, y + i, d); set(g, x + s - 1 - i, y + i, d); } rect(g, x, y, s, 1, d); rect(g, x, y + s - 1, s, 1, d); }; box(2, 10, 11, '#b58a52', '#8a6438'); box(11, 3, 11, '#c49a60', '#946c42'); }
function barrel(g) { ell(g, 12, 12, 8, 8, '#3f6e8c'); ell(g, 12, 12, 6, 6, '#335a74'); ell(g, 12, 12, 4, 4, '#5a8aa8'); rect(g, 10, 11, 4, 2, '#f2c230'); }
function forklift(g) { rect(g, 7, 1, 2, 7, '#9a9aa6'); rect(g, 15, 1, 2, 7, '#9a9aa6'); rect(g, 5, 7, 14, 14, '#e0a830'); rect(g, 7, 10, 10, 6, '#333340'); for (const [x, y] of [[4, 8], [18, 8], [4, 18], [18, 18]]) rect(g, x, y, 2, 3, '#1a1a22'); }

for (const [key, draw] of Object.entries(FURN)) {
  writeFileSync(ROOT + `src/assets/furniture/${key.replace(':', '-')}.svg`, tile(draw));
}

console.log('Assets pixel générés : ' + Object.keys(CHARS).length + ' personnages, ' + Object.keys(FURN).length + ' meubles.');
