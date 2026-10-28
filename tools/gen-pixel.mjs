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
const OUT = '#2a2033';
// Bois
const W1 = '#8a6440', W2 = '#6b4f3a', W3 = '#4a3526', W4 = '#a87d52';
// Métal
const M1 = '#9aa3ad', M2 = '#6b7380', M3 = '#3a4048';
const duvet = { bleu: ['#4f78c4', '#3a5d9e'], rouge: ['#c43f4f', '#9c2e3c'], vert: ['#3fae6a', '#2e8a52'] };

function tile(draw) { const g = grid(T, T); draw(g); outline(g, OUT); return toSVG(g); }
const line = (g, x0, y0, x1, y1, c) => {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { set(g, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
};
const legs = (g, xs, y0, y1, c) => { for (const x of xs) rect(g, x, y0, 1, y1 - y0, c); };

// Chaque clé = un visuel unique, reconnaissable à sa silhouette (les cases bloquées sont grisées).
const FURN = {
  // ---------- Où l'on peut se tenir ----------
  'lit:bleu': (g) => bed(g, 'bleu'), 'lit:rouge': (g) => bed(g, 'rouge'), 'lit:vert': (g) => bed(g, 'vert'),
  chaise(g) { // chaise à dossier haut à barreaux
    rect(g, 7, 2, 10, 2, W2); legs(g, [7, 16], 2, 12, W2); for (const x of [9, 11, 13]) rect(g, x, 4, 1, 8, W1);
    rect(g, 6, 12, 12, 3, W1); rect(g, 6, 14, 12, 1, W3); legs(g, [6, 17], 15, 22, W2); legs(g, [8, 15], 15, 21, W3);
  },
  fauteuil(g) { // bergère à oreilles, velours bordeaux
    ell(g, 12, 7, 8, 6, '#7a2e48'); ell(g, 12, 8, 6, 4, '#933a58');
    rect(g, 3, 9, 4, 9, '#6a2840'); rect(g, 17, 9, 4, 9, '#6a2840'); ell(g, 5, 9, 2, 2, '#933a58'); ell(g, 19, 9, 2, 2, '#933a58');
    rect(g, 7, 13, 10, 5, '#a8466a'); rect(g, 3, 18, 18, 2, '#5a2036'); rect(g, 4, 20, 2, 2, W3); rect(g, 18, 20, 2, 2, W3);
  },
  canape(g) { // canapé trois places
    rect(g, 2, 6, 20, 7, '#5d4fc4'); for (const x of [3, 9, 15]) rect(g, x, 7, 6, 5, '#6c5ce7');
    rect(g, 1, 10, 3, 9, '#4a3fa0'); rect(g, 20, 10, 3, 9, '#4a3fa0');
    rect(g, 4, 13, 16, 5, '#7d6cf0'); rect(g, 11, 13, 1, 5, '#5d4fc4'); rect(g, 1, 18, 22, 1, '#3a3080'); rect(g, 2, 19, 2, 2, W3); rect(g, 20, 19, 2, 2, W3);
  },
  tabouret(g) { // tabouret haut à trois pieds
    ell(g, 12, 6, 7, 2, '#c08a4e'); rect(g, 5, 7, 15, 1, W2);
    line(g, 7, 8, 4, 22, W3); line(g, 17, 8, 20, 22, W3); line(g, 12, 8, 12, 21, W2); rect(g, 6, 15, 13, 1, W3);
  },
  banc(g) { // banc public : lattes vertes, pieds en fonte
    for (const y of [5, 8]) rect(g, 1, y, 22, 2, '#3f8a5a'); rect(g, 1, 12, 22, 2, '#4fa06a'); rect(g, 1, 14, 22, 1, '#2e6a44');
    for (const x of [2, 20]) { rect(g, x, 4, 2, 18, '#22252b'); } rect(g, 1, 21, 4, 1, '#22252b'); rect(g, 19, 21, 4, 1, '#22252b');
  },
  pouf(g) { // pouf cylindrique capitonné
    rect(g, 5, 9, 14, 10, '#2a9d8f'); ell(g, 12, 9, 7, 3, '#3cc8b6'); ell(g, 12, 19, 7, 2, '#1d6f65');
    for (const x of [8, 12, 16]) set(g, x, 9, '#1d6f65'); for (const x of [7, 11, 15]) rect(g, x, 11, 1, 7, '#24887c');
  },
  siege(g) { // chaise de bureau à roulettes
    rect(g, 8, 1, 8, 9, '#22324e'); rect(g, 9, 2, 6, 7, '#2f4a78'); rect(g, 11, 10, 2, 2, M3);
    rect(g, 6, 12, 12, 3, '#22324e'); rect(g, 11, 15, 2, 4, M2); line(g, 11, 19, 5, 21, M3); line(g, 12, 19, 18, 21, M3); rect(g, 11, 19, 2, 3, M3);
    for (const x of [4, 11, 18]) rect(g, x, 21, 2, 2, '#111');
  },
  tapis(g) { // tapis d'Orient à franges
    rect(g, 3, 4, 18, 16, '#9c2e3c'); rect(g, 5, 6, 14, 12, '#c9a24e'); rect(g, 7, 8, 10, 8, '#9c2e3c');
    ell(g, 12, 12, 3, 2, '#2f4a78'); for (let x = 3; x < 21; x += 2) { set(g, x, 2, '#efe7d8'); set(g, x, 3, '#efe7d8'); set(g, x, 20, '#efe7d8'); set(g, x, 21, '#efe7d8'); }
  },
  baignoire(g) { // baignoire sur pieds
    rect(g, 2, 9, 20, 8, '#f2f2f6'); ell(g, 12, 9, 10, 2, '#cfe6f5'); rect(g, 3, 9, 18, 1, '#9fcbe6');
    rect(g, 2, 16, 20, 1, '#c8c8d2'); rect(g, 3, 17, 2, 3, '#c9a24e'); rect(g, 19, 17, 2, 3, '#c9a24e');
    rect(g, 19, 3, 2, 6, M1); rect(g, 16, 3, 4, 2, M1);
  },
  transat(g) { // transat rayé
    line(g, 5, 3, 17, 20, W1); line(g, 6, 3, 18, 20, W1); line(g, 4, 20, 13, 9, W2);
    for (let i = 0; i < 6; i++) { const y = 4 + i * 2; rect(g, 6 + i * 2 - 1, y, 6, 2, i % 2 ? '#f2f2f6' : '#3a7bd5'); }
  },
  rocking(g) { // rocking-chair sur patins courbes
    rect(g, 8, 2, 9, 2, '#c08a4e'); legs(g, [8, 16], 2, 12, W1); for (const x of [10, 12, 14]) rect(g, x, 4, 1, 8, '#c08a4e');
    rect(g, 6, 12, 13, 2, '#c08a4e'); legs(g, [7, 17], 14, 19, W2);
    for (let x = 2; x <= 22; x++) { const y = 20 + Math.round(((x - 12) / 10) ** 2 * -2) + 1; set(g, x, y, W3); set(g, x, y + 1, W3); }
  },
  cercueil(g) { // cercueil vu de dessus
    for (let y = 1; y < 23; y++) { const w = y < 7 ? 6 + y * 2 : Math.max(8, 18 - (y - 7)); rect(g, 12 - Math.floor(w / 2), y, w, 1, '#4a3526'); }
    for (let y = 3; y < 21; y++) { const w = y < 7 ? 2 + y * 2 - 4 : Math.max(4, 14 - (y - 7)); rect(g, 12 - Math.floor(w / 2), y, w, 1, '#5e4532'); }
    rect(g, 11, 6, 2, 8, '#c0a24e'); rect(g, 9, 8, 6, 2, '#c0a24e');
  },
  paille(g) { // botte de paille ficelée
    rect(g, 2, 7, 20, 13, '#e0b84e'); rect(g, 2, 7, 20, 2, '#f0d070');
    for (let i = 0; i < 9; i++) line(g, 3 + i * 2, 10, 4 + i * 2, 19, '#c49a30');
    rect(g, 7, 7, 1, 13, '#8a5a2a'); rect(g, 16, 7, 1, 13, '#8a5a2a'); set(g, 1, 9, '#f0d070'); set(g, 22, 12, '#f0d070');
  },
  priedieu(g) { // prie-Dieu : pupitre + coussin rouge
    rect(g, 6, 3, 12, 3, W2); line(g, 6, 6, 9, 14, W1); line(g, 17, 6, 14, 14, W1); rect(g, 9, 6, 6, 8, W1);
    rect(g, 4, 16, 16, 3, '#b0283a'); rect(g, 4, 19, 16, 2, W3); rect(g, 4, 21, 2, 1, W3); rect(g, 18, 21, 2, 1, W3);
  },
  trone(g) { // trône doré
    rect(g, 6, 1, 12, 2, '#e6c04a'); for (const x of [6, 11, 16]) rect(g, x, 0, 2, 1, '#e6c04a');
    rect(g, 6, 3, 12, 10, '#c9a24e'); rect(g, 8, 4, 8, 9, '#a01e32'); rect(g, 3, 11, 4, 6, '#c9a24e'); rect(g, 17, 11, 4, 6, '#c9a24e');
    rect(g, 7, 13, 10, 4, '#c0283e'); rect(g, 4, 17, 16, 3, '#a8862e'); rect(g, 5, 20, 2, 3, '#a8862e'); rect(g, 17, 20, 2, 3, '#a8862e');
  },
  palette(g) { // palette de manutention (bois clair, lattes espacées)
    for (const y of [5, 9, 13]) rect(g, 1, y, 22, 2, '#d9b47e');
    rect(g, 1, 16, 22, 2, '#c49a60'); for (const x of [1, 10, 19]) rect(g, x, 18, 4, 3, '#a07a48'); rect(g, 1, 21, 22, 1, '#c49a60');
    for (const x of [4, 12, 20]) rect(g, x, 5, 1, 11, '#b08a58');
  },

  // ---------- Objets qui bloquent la case ----------
  table(g) { // table ronde vue de dessus, couverts dressés
    ell(g, 12, 12, 10, 10, W1); ell(g, 12, 12, 8, 8, W4); ell(g, 12, 12, 2, 2, '#e6c04a');
    for (const [x, y] of [[12, 5], [12, 19], [5, 12], [19, 12]]) { ell(g, x, y, 2, 2, '#f6f6f6'); set(g, x, y, '#d8d0c0'); }
  },

  plante(g) { // plante verte en pot de terre cuite
    rect(g, 7, 15, 10, 7, '#b4612c'); rect(g, 6, 15, 12, 2, '#c87a3e');
    ell(g, 12, 8, 4, 7, '#2f8f4e'); ell(g, 6, 10, 4, 3, '#3aa85e'); ell(g, 18, 10, 4, 3, '#3aa85e'); ell(g, 9, 4, 2, 3, '#4cc070'); ell(g, 16, 5, 2, 3, '#4cc070');
  },
  biblio(g) { // bibliothèque garnie
    rect(g, 3, 1, 18, 22, W3); for (const y of [3, 10, 17]) { const cols = ['#c43f4f', '#4f78c4', '#e0a84e', '#3fae6a', '#9b5cd6', '#e6e6e6']; let x = 5; for (const c of cols) { rect(g, x, y + (x % 3 === 0 ? 1 : 0), 2, 5 - (x % 3 === 0 ? 1 : 0), c); x += 2 + (x % 2); if (x > 18) break; } rect(g, 4, y + 5, 16, 1, W2); }
  },
  coiffeuse(g) { // commode basse à tiroirs + petit miroir rond + flacons
    ell(g, 12, 6, 5, 5, '#c9a24e'); ell(g, 12, 6, 4, 4, '#bcd6ec'); set(g, 10, 4, '#fff');
    rect(g, 3, 12, 18, 9, W1); rect(g, 3, 12, 18, 1, W4); for (const y of [14, 17]) { rect(g, 4, y, 16, 2, W2); rect(g, 11, y, 2, 1, '#e6c04a'); }
    rect(g, 4, 10, 2, 2, '#e07ab0'); rect(g, 18, 9, 2, 3, '#7ab0e0'); rect(g, 4, 21, 2, 2, W3); rect(g, 18, 21, 2, 2, W3);
  },
  armoire(g) { // grande armoire à deux portes, corniche
    rect(g, 3, 1, 18, 2, W3); rect(g, 4, 3, 16, 18, W2); rect(g, 5, 4, 7, 16, W1); rect(g, 12, 4, 7, 16, W1);
    rect(g, 6, 6, 5, 5, W4); rect(g, 13, 6, 5, 5, W4); rect(g, 11, 12, 1, 2, '#e6c04a'); rect(g, 13, 12, 1, 2, '#e6c04a'); rect(g, 4, 21, 2, 2, W3); rect(g, 18, 21, 2, 2, W3);
  },
  fourneau(g) { // cuisinière en fonte, feux et four
    rect(g, 2, 7, 20, 15, '#2a2a30'); rect(g, 2, 5, 20, 3, M2); for (const x of [6, 17]) { ell(g, x, 6, 3, 1, '#111'); set(g, x, 6, '#e05a2a'); }
    rect(g, 5, 11, 14, 8, '#3a3a44'); rect(g, 7, 13, 10, 4, '#e0a050'); rect(g, 5, 10, 14, 1, M1); rect(g, 18, 1, 2, 4, M2);
  },
  evier(g) { // évier en inox sur meuble bas, robinet
    rect(g, 2, 9, 20, 13, W1); rect(g, 3, 13, 8, 8, W2); rect(g, 13, 13, 8, 8, W2); rect(g, 9, 16, 1, 2, '#e6c04a'); rect(g, 14, 16, 1, 2, '#e6c04a');
    rect(g, 1, 8, 22, 4, M1); rect(g, 5, 9, 12, 2, '#5a8aa8'); rect(g, 10, 3, 2, 6, M2); rect(g, 10, 3, 5, 2, M2); rect(g, 14, 5, 1, 2, '#9fd2f5');
  },
  cheminee(g) { // cheminée en pierre avec feu
    rect(g, 1, 3, 22, 3, '#b8b0a8'); rect(g, 2, 6, 20, 17, '#8d8580'); for (const [x, y] of [[3, 8], [17, 10], [4, 18], [18, 19]]) rect(g, x, y, 3, 2, '#9d958f');
    rect(g, 6, 9, 12, 14, '#1a1414'); ell(g, 12, 19, 4, 4, '#e05a2a'); ell(g, 12, 20, 2, 3, '#f5c04e'); set(g, 10, 15, '#f5a623'); set(g, 14, 16, '#f5a623');
  },
  piano(g) { // piano droit noir, clavier blanc
    rect(g, 2, 2, 20, 12, '#1e1e24'); rect(g, 3, 3, 18, 2, '#33333d'); rect(g, 1, 13, 22, 4, '#1e1e24');
    rect(g, 2, 13, 20, 2, '#f6f6f6'); for (let x = 3; x < 22; x += 2) set(g, x, 13, '#1e1e24'); legs(g, [3, 20], 17, 23, '#1e1e24'); rect(g, 10, 7, 4, 3, '#c9a24e');
  },
  billard(g) { // billard vu de dessus
    rect(g, 1, 3, 22, 18, '#6b3e22'); rect(g, 3, 5, 18, 14, '#1f8a4c');
    for (const [x, y] of [[2, 4], [11, 4], [20, 4], [2, 19], [11, 19], [20, 19]]) rect(g, x, y, 2, 1, '#111');
    set(g, 8, 10, '#f6f6f6'); set(g, 14, 9, '#e0c030'); set(g, 15, 12, '#c43f4f'); set(g, 13, 12, '#111'); line(g, 4, 15, 9, 11, '#e6c88a');
  },
  horloge(g) { // horloge comtoise
    rect(g, 7, 1, 10, 2, W3); rect(g, 7, 3, 10, 9, W2); ell(g, 12, 7, 4, 4, '#f2ece0'); line(g, 12, 7, 12, 4, '#222'); line(g, 12, 7, 14, 8, '#222');
    rect(g, 8, 12, 8, 9, W1); rect(g, 10, 13, 4, 7, '#2a2020'); rect(g, 11, 13, 1, 4, '#c9a24e'); ell(g, 11, 18, 1, 1, '#e6c04a'); rect(g, 6, 21, 12, 2, W3);
  },
  globe(g) { // globe terrestre sur pied
    ell(g, 12, 9, 7, 7, '#3a7bd5'); ell(g, 10, 7, 3, 2, '#3fae6a'); ell(g, 15, 11, 2, 3, '#3fae6a'); set(g, 8, 11, '#3fae6a');
    for (let a = -2; a <= 10; a++) { const t = (a / 8) * Math.PI; set(g, 12 + Math.round(Math.cos(t + 2.4) * 9), 9 + Math.round(Math.sin(t + 2.4) * 9), '#c9a24e'); }
    rect(g, 11, 16, 2, 4, W2); rect(g, 7, 20, 10, 2, W3);
  },
  malle(g) { // malle au trésor bombée
    ell(g, 12, 9, 10, 4, '#7a4a26'); rect(g, 2, 9, 20, 12, '#8a5a2e'); rect(g, 2, 12, 20, 1, '#5a3a1a');
    for (const x of [5, 18]) rect(g, x, 5, 2, 16, M2); rect(g, 10, 11, 4, 4, '#e6c04a'); set(g, 11, 13, '#333');
  },
  casiervin(g) { // casier à bouteilles : culots de bouteilles dans un cadre
    rect(g, 2, 2, 20, 20, W2); rect(g, 3, 3, 18, 18, W3);
    for (const y of [6, 12, 18]) for (const x of [6, 12, 18]) { ell(g, x, y, 2, 2, (x + y) % 12 ? '#2a5a2a' : '#6a1a2a'); set(g, x - 1, y - 1, '#9fd09f'); }
  },

  lavabo(g) { // lavabo sur colonne
    ell(g, 12, 9, 9, 3, '#f2f2f6'); rect(g, 3, 9, 18, 3, '#f2f2f6'); ell(g, 12, 9, 6, 1, '#9fcbe6');
    rect(g, 10, 12, 4, 9, '#e0e0e8'); rect(g, 7, 21, 10, 2, '#c8c8d2'); rect(g, 11, 3, 2, 5, M1); rect(g, 9, 3, 6, 1, M1);
  },
  chevalet(g) { // chevalet de peintre avec toile
    line(g, 12, 1, 4, 23, W1); line(g, 12, 1, 20, 23, W1); line(g, 12, 1, 12, 23, W2);
    rect(g, 5, 4, 14, 11, '#f6f0e4'); ell(g, 9, 9, 3, 3, '#e0a84e'); rect(g, 12, 7, 5, 6, '#4f78c4'); set(g, 8, 12, '#c43f4f'); rect(g, 4, 15, 16, 1, W2);
  },
  etabli(g) { // établi : plateau épais, étau, outils
    rect(g, 1, 10, 22, 4, W4); rect(g, 1, 13, 22, 1, W2); legs(g, [2, 3, 20, 21], 14, 23, W2); rect(g, 2, 19, 20, 1, W2);
    rect(g, 17, 6, 5, 4, M2); rect(g, 19, 4, 1, 2, M3); rect(g, 4, 7, 7, 2, M1); rect(g, 10, 6, 2, 4, W3); rect(g, 4, 2, 1, 6, M3);
  },
  statue(g) { // buste sur colonne de marbre
    ell(g, 12, 5, 4, 4, '#e6e2dc'); rect(g, 7, 9, 10, 3, '#d8d4ce'); rect(g, 8, 12, 8, 1, '#b8b0a8');
    rect(g, 8, 13, 8, 8, '#d0ccc6'); for (const x of [9, 12, 14]) rect(g, x, 13, 1, 8, '#b8b0a8'); rect(g, 6, 21, 12, 2, '#a8a29c');
  },
  autel(g) { // autel : nappe blanche, croix, cierges
    rect(g, 11, 1, 2, 8, '#e6c04a'); rect(g, 8, 3, 8, 2, '#e6c04a'); for (const x of [4, 19]) { rect(g, x, 5, 1, 4, '#f6f0e4'); set(g, x, 4, '#f5a623'); }
    rect(g, 2, 9, 20, 13, '#8d8580'); rect(g, 2, 9, 20, 5, '#f6f6f6'); rect(g, 10, 9, 4, 8, '#b0283a');
  },
  chaudron(g) { // chaudron bouillonnant sur pieds
    ell(g, 12, 13, 9, 7, '#2a2a30'); ell(g, 12, 8, 9, 3, '#1a1a1f'); ell(g, 12, 8, 7, 2, '#5fae5f');
    ell(g, 9, 4, 1, 1, '#7ec97e'); ell(g, 15, 2, 1, 1, '#7ec97e'); set(g, 12, 5, '#9fe09f'); legs(g, [6, 17], 19, 23, '#1a1a1f');
  },
  candelabre(g) { // candélabre à trois branches
    rect(g, 11, 8, 2, 12, '#c9a24e'); rect(g, 5, 11, 14, 1, '#c9a24e'); legs(g, [5, 18], 8, 12, '#c9a24e');
    for (const x of [5, 11, 18]) { rect(g, x, 4, x === 11 ? 2 : 1, 4, '#efe7d8'); set(g, x, 2, '#f5a623'); set(g, x, 3, '#f5d04e'); }
    rect(g, 7, 20, 10, 2, '#a07d2e');
  },
  tombe(g) { // pierre tombale arrondie avec croix
    ell(g, 12, 8, 7, 6, '#8d8f98'); rect(g, 5, 8, 15, 12, '#8d8f98'); rect(g, 11, 6, 2, 9, '#5a5c64'); rect(g, 8, 8, 8, 2, '#5a5c64');
    rect(g, 2, 20, 20, 3, '#4a6a3a'); set(g, 4, 19, '#5a8a4a'); set(g, 19, 19, '#5a8a4a');
  },
  toile(g) { // toile d'araignée + araignée
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); line(g, 0, 0, Math.round(Math.cos(a) * 22), Math.round(Math.sin(a) * 22), '#c9c9d4'); }
    for (const r2 of [6, 11, 16, 21]) for (let i = 0; i <= 12; i++) { const a = (i / 12) * (Math.PI / 2); set(g, Math.round(Math.cos(a) * r2), Math.round(Math.sin(a) * r2), '#9a9aa6'); }
    ell(g, 14, 14, 2, 2, '#1a1a1f'); for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) line(g, 14, 14, 14 + dx, 14 + dy, '#1a1a1f');
  },
  ossements(g) { // tas de crânes et d'os
    line(g, 2, 20, 21, 14, '#e8e2d0'); line(g, 3, 14, 20, 21, '#d8d0bc'); ell(g, 2, 20, 1, 1, '#e8e2d0'); ell(g, 21, 14, 1, 1, '#e8e2d0');
    for (const [x, y] of [[7, 14], [16, 15], [12, 8]]) { ell(g, x, y, 4, 4, '#efe9d8'); rect(g, x - 2, y + 3, 5, 2, '#e0d8c4'); set(g, x - 2, y, '#222'); set(g, x + 1, y, '#222'); set(g, x - 1, y + 2, '#555'); }
  },
  miroir(g) { // psyché : grand miroir sur pied, cadre doré
    rect(g, 6, 1, 12, 18, '#c9a24e'); rect(g, 7, 2, 10, 16, '#a8d4ec'); line(g, 9, 4, 13, 8, '#eaf6fc'); line(g, 9, 6, 11, 8, '#eaf6fc');
    rect(g, 11, 19, 2, 2, '#a8862e'); line(g, 11, 21, 6, 23, '#a8862e'); line(g, 12, 21, 17, 23, '#a8862e');
  },
  carnivore(g) { // plante carnivore aux mâchoires rouges
    rect(g, 8, 17, 8, 6, '#5a2a6a'); rect(g, 7, 17, 10, 1, '#6e3a80'); rect(g, 11, 10, 2, 7, '#3a8a3a');
    ell(g, 12, 7, 8, 4, '#c43f4f'); rect(g, 4, 7, 17, 1, '#2a0a10'); for (let x = 5; x < 20; x += 2) { set(g, x, 6, '#f6f6f6'); set(g, x + 1, 8, '#f6f6f6'); }
    ell(g, 6, 15, 3, 1, '#3aa85e'); ell(g, 18, 14, 3, 1, '#3aa85e');
  },
  telescope(g) { // lunette astronomique en laiton sur trépied
    line(g, 3, 13, 19, 3, '#c9a24e'); line(g, 3, 14, 19, 4, '#c9a24e'); line(g, 4, 15, 20, 5, '#a8862e'); rect(g, 18, 2, 3, 4, '#8a6a2a');
    line(g, 12, 10, 6, 23, W2); line(g, 12, 10, 18, 23, W2); line(g, 12, 10, 12, 23, W3);
  },
  bureau(g) { // bureau avec écran et clavier
    rect(g, 7, 2, 10, 8, '#1a1a22'); rect(g, 8, 3, 8, 6, '#4fa3d4'); rect(g, 11, 10, 2, 2, M3);
    rect(g, 1, 12, 22, 3, '#8a6a4a'); rect(g, 7, 12, 10, 1, '#cfcfd8'); rect(g, 2, 15, 6, 8, '#6b4f3a'); rect(g, 3, 17, 4, 1, '#cfcfd8'); rect(g, 20, 15, 2, 8, '#6b4f3a');
  },
  imprimante(g) { // imprimante, feuille qui sort
    rect(g, 8, 2, 8, 6, '#f8f8fc'); rect(g, 9, 4, 6, 1, '#999'); rect(g, 3, 8, 18, 10, '#d8d8e0'); rect(g, 3, 8, 18, 2, '#ececf2');
    rect(g, 6, 13, 12, 2, '#555560'); rect(g, 16, 10, 3, 1, '#4fd47a'); rect(g, 3, 18, 18, 3, '#a8a8b4');
  },
  fontaine(g) { // fontaine à eau, bonbonne bleue
    ell(g, 12, 5, 5, 5, '#5aa9e6'); ell(g, 11, 4, 2, 2, '#9fd2f5'); rect(g, 10, 9, 4, 2, '#3a7bd5');
    rect(g, 7, 11, 10, 11, '#e6e6ee'); rect(g, 9, 14, 2, 2, '#4f78c4'); rect(g, 13, 14, 2, 2, '#c43f4f'); rect(g, 8, 17, 8, 1, '#b8b8c4');
  },
  classeur(g) { // classeur métallique à 4 tiroirs
    rect(g, 5, 1, 14, 22, '#7d8794'); for (const y of [2, 7, 12, 17]) { rect(g, 6, y, 12, 4, '#949eab'); rect(g, 10, y + 1, 4, 1, '#f2f2f2'); rect(g, 10, y + 3, 4, 1, '#3a4048'); }
  },
  coffre(g) { // coffre-fort vert, cadran
    rect(g, 3, 3, 18, 18, '#2e4a3a'); rect(g, 5, 5, 14, 14, '#3a5e48'); ell(g, 11, 12, 4, 4, '#c9c9d4'); ell(g, 11, 12, 2, 2, '#6b7380');
    set(g, 11, 9, '#222'); rect(g, 16, 10, 2, 5, '#c9c9d4'); rect(g, 4, 21, 3, 2, '#1a2a20'); rect(g, 17, 21, 3, 2, '#1a2a20');
  },
  serveur(g) { // baie de serveurs, voyants
    rect(g, 5, 0, 14, 24, '#16161c'); for (let y = 2; y < 22; y += 3) { rect(g, 6, y, 12, 2, '#2a2a34'); set(g, 7, y, '#4fd47a'); set(g, 9, y, y % 2 ? '#4fa3d4' : '#4fd47a'); set(g, 16, y + 1, '#e0a830'); }
  },
  distributeur(g) { // distributeur de friandises rouge, vitre
    rect(g, 4, 0, 16, 24, '#c0283e'); rect(g, 6, 2, 9, 16, '#bcd6ec');
    for (let y = 3; y < 17; y += 4) for (let x = 7; x < 14; x += 3) rect(g, x, y, 2, 2, ['#e0a830', '#3fae6a', '#6c5ce7', '#f6f6f6'][(x + y) % 4]);
    rect(g, 16, 4, 3, 6, '#2a2a34'); rect(g, 6, 20, 9, 2, '#1a1a22');
  },
  comptoir(g) { // comptoir d'accueil + sonnette
    rect(g, 1, 10, 22, 12, '#3a4a6a'); rect(g, 1, 8, 22, 3, '#d9c4a0'); rect(g, 3, 13, 18, 2, '#e6c04a');
    ell(g, 17, 6, 2, 1, '#c9a24e'); set(g, 17, 4, '#c9a24e'); rect(g, 4, 5, 5, 3, '#f6f6f6');
  },
  tableau(g) { // tableau blanc sur pied, griffonné
    rect(g, 2, 2, 20, 13, '#f6f6fa'); rect(g, 2, 2, 20, 1, M1); rect(g, 2, 14, 20, 1, M1);
    line(g, 4, 6, 9, 5, '#c43f4f'); line(g, 4, 9, 12, 9, '#3a7bd5'); line(g, 14, 11, 19, 5, '#3fae6a');
    line(g, 6, 15, 3, 23, M2); line(g, 17, 15, 20, 23, M2); rect(g, 4, 15, 16, 1, M2);
  },
  babyfoot(g) { // baby-foot vu de dessus
    rect(g, 2, 2, 20, 20, '#4a3526'); rect(g, 4, 4, 16, 16, '#3aa85e'); rect(g, 4, 11, 16, 1, '#f6f6f6');
    for (const [y, c] of [[6, '#c43f4f'], [9, '#3a7bd5'], [14, '#c43f4f'], [17, '#3a7bd5']]) { rect(g, 0, y, 24, 1, M1); for (const x of [8, 12, 16]) set(g, x, y, c); }
  },
  parasol(g) { // parasol rayé rouge et blanc
    for (let y = 1; y < 9; y++) { const w = 4 + y * 2.4 | 0; for (let x = 12 - (w >> 1); x <= 12 + (w >> 1); x++) set(g, x, y, Math.floor((x + 24) / 4) % 2 ? '#c43f4f' : '#f6f6f6'); }
    rect(g, 11, 9, 2, 12, '#d0d0d8'); rect(g, 7, 21, 10, 2, '#555560');
  },
  machine(g) { // machine-outil (tour) jaune et grise
    rect(g, 1, 6, 22, 9, '#e0b030'); rect(g, 3, 8, 6, 5, M3); rect(g, 4, 9, 4, 1, '#4fd47a'); rect(g, 10, 9, 10, 2, M1); ell(g, 11, 10, 2, 3, M2);
    rect(g, 18, 3, 3, 4, '#c43f4f'); rect(g, 2, 15, 20, 2, M3); legs(g, [3, 4, 19, 20], 17, 23, M2);
  },
  caisses(g) { // caisses en bois empilées, entretoises en X
    const box = (x, y, s) => { rect(g, x, y, s, s, '#c49a60'); rect(g, x, y, s, 1, '#8a6438'); rect(g, x, y + s - 1, s, 1, '#8a6438'); rect(g, x, y, 1, s, '#8a6438'); rect(g, x + s - 1, y, 1, s, '#8a6438'); line(g, x, y, x + s - 1, y + s - 1, '#8a6438'); line(g, x + s - 1, y, x, y + s - 1, '#8a6438'); };
    box(1, 12, 11); box(12, 12, 11); box(6, 1, 11);
  },
  fut(g) { // fût métallique bleu, cerclages, pictogramme
    rect(g, 5, 2, 14, 20, '#2f5e8c'); ell(g, 12, 2, 7, 1, '#4a7aa8'); for (const y of [7, 16]) rect(g, 5, y, 14, 1, '#1f3e5c');
    for (let i = 0; i < 4; i++) rect(g, 11 - i, 9 + i, 2 + i * 2, 1, '#f2c230'); set(g, 12, 10, '#111'); set(g, 12, 11, '#111');
  },
  chariot(g) { // chariot élévateur de profil
    rect(g, 3, 1, 2, 18, M2); rect(g, 0, 17, 5, 2, M3); rect(g, 6, 9, 13, 9, '#e0a830'); rect(g, 9, 3, 1, 7, M3); rect(g, 17, 3, 1, 7, M3); rect(g, 9, 3, 9, 1, M3);
    rect(g, 11, 6, 4, 3, '#2a2a34'); ell(g, 9, 19, 3, 3, '#1a1a22'); ell(g, 17, 19, 3, 3, '#1a1a22'); set(g, 9, 19, M1); set(g, 17, 19, M1);
  },
  chaudiere(g) { // chaudière : cuve cuivrée, tuyaux, manomètre
    rect(g, 5, 3, 14, 18, '#b0602a'); ell(g, 12, 3, 7, 2, '#c8783a'); ell(g, 12, 21, 7, 1, '#8a4a20'); for (const y of [7, 15]) rect(g, 5, y, 14, 1, '#8a4a20');
    ell(g, 12, 11, 3, 3, '#f2f2f2'); line(g, 12, 11, 14, 9, '#c43f4f'); rect(g, 19, 6, 4, 2, M2); rect(g, 21, 0, 2, 6, M2); rect(g, 0, 15, 5, 2, M2);
  },
  casier(g) { // vestiaire : trois casiers à aérations
    for (const [i, c] of [[0, '#3a7bd5'], [1, '#2f68b8'], [2, '#3a7bd5']]) { const x = 2 + i * 7; rect(g, x, 1, 6, 22, c); for (const y of [3, 5, 7]) rect(g, x + 1, y, 4, 1, '#1f3e6a'); rect(g, x + 4, 11, 1, 3, '#d0d0d8'); }
  },
  paillasse(g) { // paillasse de laboratoire : verrerie colorée
    rect(g, 1, 13, 22, 3, '#f2f2f6'); rect(g, 2, 16, 20, 7, '#9aa3ad'); rect(g, 11, 17, 2, 5, '#6b7380');
    rect(g, 4, 5, 2, 4, '#cfe6f5'); ell(g, 5, 10, 3, 2, '#5fd07a'); rect(g, 10, 4, 3, 9, '#cfe6f5'); rect(g, 10, 8, 3, 5, '#e05a8a');
    for (const x of [16, 18, 20]) rect(g, x, 6, 1, 7, '#cfe6f5'); set(g, 16, 11, '#f2c230'); set(g, 18, 10, '#4fa3d4'); set(g, 20, 12, '#c43f4f'); rect(g, 15, 12, 7, 1, M2);
  },
  four(g) { // four de fonderie en dôme, cheminée métallique
    rect(g, 15, 0, 3, 6, M3); ell(g, 12, 13, 10, 9, '#8a3a2a'); rect(g, 2, 13, 20, 9, '#8a3a2a'); rect(g, 1, 21, 22, 2, '#5a2a1a');
    for (const [x, y] of [[5, 9], [14, 7], [4, 17], [17, 16], [9, 5]]) rect(g, x, y, 3, 2, '#a04a36');
    rect(g, 8, 14, 8, 7, '#1a0a08'); rect(g, 9, 16, 6, 5, '#f07a2a'); rect(g, 10, 18, 4, 3, '#ffd060');
  },

  enclume(g) { // enclume sur billot
    rect(g, 4, 6, 15, 4, '#4a4e58'); rect(g, 1, 7, 4, 2, '#4a4e58'); rect(g, 8, 10, 7, 3, '#3a3e48'); rect(g, 6, 13, 11, 2, '#4a4e58'); rect(g, 4, 6, 15, 1, '#7a808c');
    rect(g, 5, 15, 13, 8, '#8a5a2e'); for (const x of [8, 13]) rect(g, x, 15, 1, 8, '#6a4220');
  },
  transfo(g) { // transformateur : armoire grise, danger électrique
    rect(g, 3, 2, 18, 20, '#8d969f'); for (const x of [5, 18]) rect(g, x, 4, 1, 16, '#6b7380');
    for (let i = 0; i < 9; i++) rect(g, 12 - i, 6 + i, 1 + i * 2, 1, '#f2c230'); line(g, 13, 8, 11, 11, '#111'); line(g, 11, 11, 13, 11, '#111'); line(g, 13, 11, 11, 14, '#111'); rect(g, 3, 22, 18, 1, '#555560');
  },
};
function bed(g, col) {
  const [c1, c2] = duvet[col];
  rect(g, 3, 1, 18, 4, W2); rect(g, 3, 1, 18, 1, W4); rect(g, 4, 5, 16, 16, '#efe7d8'); rect(g, 5, 5, 6, 4, '#ffffff'); rect(g, 13, 5, 6, 4, '#ffffff');
  rect(g, 4, 10, 16, 11, c1); rect(g, 4, 10, 16, 1, c2); rect(g, 4, 15, 16, 1, c2); rect(g, 3, 21, 18, 2, W2);
}

// Planche contact (vérification visuelle) et fichiers individuels
mkdirSync(ROOT + '.tmp', { recursive: true });
for (const [key, draw] of Object.entries(FURN)) {
  writeFileSync(ROOT + `src/assets/furniture/${key.replace(':', '-')}.svg`, tile(draw));
}
writeFileSync(ROOT + '.tmp/furniture-keys.json', JSON.stringify(Object.keys(FURN)));

console.log('Assets pixel générés : ' + Object.keys(CHARS).length + ' personnages, ' + Object.keys(FURN).length + ' meubles.');
