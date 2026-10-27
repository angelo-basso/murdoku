import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Génère les 19 avatars de suspects (médaillon teinté + silhouette blanche).
const OUT = fileURLToPath(new URL('../src/assets/suspects/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// teinte claire / foncée par suspect (distinctes au sein d'une affaire)
const hues = {
  majordome: ['#5b86d6', '#2f4f85'], comtesse: ['#e6b35a', '#b97e23'],
  docteur: ['#35b7a6', '#1b7a6e'], cuisiniere: ['#dd6aa8', '#a23b74'],
  diplomate: ['#7d6cf0', '#4a3aa0'], actrice: ['#ec7a9a', '#b8456a'],
  controleur: ['#46bd77', '#248049'], veuve: ['#9398b8', '#585d82'],
  antiquaire: ['#e8974a', '#b56222'], journaliste: ['#44b4d0', '#227d95'],
  banquier: ['#4f88d6', '#2f5aa0'], chanteuse: ['#de63ad', '#a83b80'],
  peintre: ['#e8964a', '#b56222'], heritier: ['#35b7a6', '#1b7a6e'],
  senatrice: ['#7d6cf0', '#4a3aa0'], chef: ['#ec6a78', '#b8414f'],
  photographe: ['#44b8d0', '#227d95'], collectionneur: ['#e6c04a', '#b5912a'],
  astronome: ['#a96ce0', '#7a3fb0'],
};

const W = '#ffffff';
const D = '#17102b';
const glyphs = {
  majordome: `<path d="M50 50 L31 41 L31 59 Z" fill="${W}"/><path d="M50 50 L69 41 L69 59 Z" fill="${W}"/><rect x="46" y="44" width="8" height="12" rx="2" fill="${W}"/>`,
  comtesse: `<path d="M30 62 L34 41 L43 53 L50 37 L57 53 L66 41 L70 62 Z" fill="${W}"/><rect x="30" y="62" width="40" height="7" rx="2" fill="${W}"/><circle cx="50" cy="37" r="3" fill="${W}"/>`,
  docteur: `<path d="M45 31 h10 v13 h13 v10 h-13 v13 h-10 v-13 h-13 v-10 h13 Z" fill="${W}"/>`,
  cuisiniere: `<path d="M36 55 q-9 -1 -9 -12 a9 9 0 0 1 13 -7 a12 12 0 0 1 20 0 a9 9 0 0 1 13 7 q0 11 -9 12 Z" fill="${W}"/><rect x="36" y="54" width="28" height="14" rx="2" fill="${W}"/>`,
  diplomate: `<rect x="38" y="29" width="24" height="27" rx="2" fill="${W}"/><rect x="29" y="53" width="42" height="7" rx="3" fill="${W}"/><rect x="38" y="47" width="24" height="5" fill="${D}" fill-opacity="0.35"/>`,
  actrice: `<path d="M34 33 h32 v13 a16 19 0 0 1 -32 0 Z" fill="${W}"/><circle cx="43" cy="44" r="3" fill="${D}"/><circle cx="57" cy="44" r="3" fill="${D}"/><path d="M43 54 q7 6 14 0" stroke="${D}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  controleur: `<path d="M29 55 q21 -15 42 0 Z" fill="${W}"/><rect x="27" y="55" width="46" height="7" rx="3" fill="${W}"/><rect x="45" y="44" width="10" height="7" rx="2" fill="${W}"/>`,
  veuve: `<circle cx="50" cy="42" r="10" fill="${W}"/><path d="M32 68 a18 18 0 0 1 36 0 Z" fill="${W}"/><path d="M40 35 q10 -8 20 0" stroke="${W}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  antiquaire: `<path d="M43 31 h14 l-2 7 q11 6 11 18 a16 16 0 0 1 -32 0 q0 -12 11 -18 Z" fill="${W}"/><path d="M41 40 q-8 2 -8 9" stroke="${W}" stroke-width="3" fill="none"/><path d="M59 40 q8 2 8 9" stroke="${W}" stroke-width="3" fill="none"/>`,
  journaliste: `<rect x="31" y="34" width="34" height="32" rx="2" fill="${W}"/><rect x="35" y="38" width="26" height="7" fill="${D}" fill-opacity="0.8"/><rect x="35" y="49" width="12" height="13" fill="${D}" fill-opacity="0.45"/><path d="M50 50 h11 M50 55 h11 M50 60 h11" stroke="${D}" stroke-opacity="0.6" stroke-width="2"/>`,
  banquier: `<rect x="31" y="42" width="38" height="24" rx="3" fill="${W}"/><path d="M42 42 v-5 a2 2 0 0 1 2 -2 h12 a2 2 0 0 1 2 2 v5" fill="none" stroke="${W}" stroke-width="4"/><rect x="31" y="52" width="38" height="3" fill="${D}" fill-opacity="0.3"/>`,
  chanteuse: `<rect x="46" y="31" width="8" height="23" rx="4" fill="${W}"/><path d="M39 49 a11 11 0 0 0 22 0" fill="none" stroke="${W}" stroke-width="4"/><rect x="48" y="60" width="4" height="8" fill="${W}"/><rect x="41" y="68" width="18" height="4" rx="2" fill="${W}"/>`,
  peintre: `<ellipse cx="50" cy="50" rx="21" ry="16" fill="${W}"/><circle cx="59" cy="53" r="4.5" fill="${D}" fill-opacity="0.3"/><circle cx="42" cy="45" r="3" fill="${D}" fill-opacity="0.45"/><circle cx="51" cy="42" r="3" fill="${D}" fill-opacity="0.45"/><circle cx="41" cy="55" r="3" fill="${D}" fill-opacity="0.45"/>`,
  heritier: `<rect x="36" y="36" width="28" height="34" rx="4" fill="${W}"/><rect x="44" y="29" width="12" height="8" rx="3" fill="none" stroke="${W}" stroke-width="3"/><rect x="36" y="48" width="28" height="3" fill="${D}" fill-opacity="0.3"/><rect x="47" y="36" width="6" height="34" fill="${D}" fill-opacity="0.2"/>`,
  senatrice: `<rect x="48" y="31" width="4" height="36" fill="${W}"/><rect x="34" y="37" width="32" height="3" fill="${W}"/><path d="M34 38 l-6 12 h12 Z" fill="${W}"/><path d="M66 38 l-6 12 h12 Z" fill="${W}"/><rect x="40" y="66" width="20" height="4" rx="2" fill="${W}"/>`,
  chef: `<path d="M36 55 q-9 -1 -9 -12 a9 9 0 0 1 13 -7 a12 12 0 0 1 20 0 a9 9 0 0 1 13 7 q0 11 -9 12 Z" fill="${W}"/><rect x="36" y="54" width="28" height="14" rx="2" fill="${W}"/><path d="M50 58 l1.5 3.3 3.5 .3 -2.7 2.3 .8 3.5 -3.1 -1.9 -3.1 1.9 .8 -3.5 -2.7 -2.3 3.5 -.3 Z" fill="${D}" fill-opacity="0.55"/>`,
  photographe: `<rect x="31" y="40" width="38" height="27" rx="4" fill="${W}"/><rect x="42" y="34" width="13" height="7" rx="2" fill="${W}"/><circle cx="50" cy="54" r="9" fill="${D}" fill-opacity="0.3"/><circle cx="50" cy="54" r="5.5" fill="${W}"/><circle cx="62" cy="46" r="2.5" fill="${D}" fill-opacity="0.4"/>`,
  collectionneur: `<circle cx="40" cy="44" r="9" fill="none" stroke="${W}" stroke-width="5"/><rect x="44" y="47" width="26" height="5" fill="${W}"/><rect x="63" y="52" width="5" height="8" fill="${W}"/><rect x="55" y="52" width="4" height="6" fill="${W}"/>`,
  astronome: `<g transform="rotate(-28 50 50)"><rect x="33" y="45" width="34" height="10" rx="3" fill="${W}"/><rect x="63" y="42" width="9" height="16" rx="2" fill="${W}"/><circle cx="33" cy="50" r="5.5" fill="${D}" fill-opacity="0.35"/></g><path d="M50 56 L43 70 M50 56 L57 70" stroke="${W}" stroke-width="3.5" stroke-linecap="round"/>`,
};

function medallion([light, dark], glyph) {
  return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="g" cx="38%" cy="32%" r="78%">
    <stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${dark}"/>
  </radialGradient></defs>
  <circle cx="50" cy="50" r="48" fill="url(#g)"/>
  <path d="M15 34 A48 48 0 0 1 66 9" stroke="#ffffff" stroke-opacity="0.16" stroke-width="6" fill="none" stroke-linecap="round"/>
  ${glyph}
  <circle cx="50" cy="50" r="47" fill="none" stroke="#d4af37" stroke-opacity="0.6" stroke-width="2.5"/>
</svg>
`;
}

let n = 0;
for (const slug of Object.keys(glyphs)) {
  writeFileSync(`${OUT}/${slug}.svg`, medallion(hues[slug], glyphs[slug]));
  n++;
}
console.log(`${n} avatars écrits dans ${OUT}`);
