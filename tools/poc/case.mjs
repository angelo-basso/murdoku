// Affaire Murdoku 6x6 (prototype) — données pures.
// Plan en pièces, mobilier, personnes, indices. Le solveur (solve.mjs) prouve l'unicité.

export const N = 6;

// Pièces : identifiant par case (plan irrégulier possible).
export const ROOM = [
  ['A', 'A', 'B', 'B', 'C', 'C'],
  ['A', 'A', 'B', 'B', 'C', 'C'],
  ['D', 'D', 'E', 'E', 'F', 'F'],
  ['D', 'D', 'E', 'E', 'F', 'F'],
  ['G', 'G', 'G', 'H', 'H', 'H'],
  ['G', 'G', 'G', 'H', 'H', 'H'],
];

export const ROOM_NAMES = {
  A: 'Chambre bleue', B: 'Chambre rouge', C: 'Bureau',
  D: 'Cuisine', E: 'Salon', F: 'Bibliothèque',
  G: 'Atelier', H: 'Véranda',
};

// Mobilier : "type" ou "type:couleur". On peut se tenir sur lit/chaise/canape ;
// table/plante/biblio/coiffeuse bloquent la case.
export const F = [
  ['lit:bleu', 'coiffeuse', 'lit:rouge', 'coiffeuse', 'chaise',   'biblio'],
  ['chaise',   'plante',    'chaise',    'vide',      'table',    'chaise'],
  ['table',    'chaise',    'canape',    'vide',      'biblio',   'chaise'],
  ['chaise',   'chaise',    'canape',    'table',     'chaise',   'biblio'],
  ['plante',   'chaise',    'vide',      'chaise',    'vide',     'chaise'],
  ['biblio',   'chaise',    'vide',      'vide',      'canape',   'coiffeuse'],
];

export const BLOCKING = new Set(['table', 'plante', 'biblio', 'coiffeuse']);

export const PEOPLE = [
  { id: 'victime',   name: 'M. Hervé',            role: 'la victime', victim: true },
  { id: 'plaquiste', name: 'Hugo le Plaquiste',   role: 'plaquiste' },
  { id: 'notaire',   name: 'Léa la Notaire',      role: 'notaire' },
  { id: 'peintre',   name: 'Sofia la Peintre',    role: 'peintre' },
  { id: 'jardinier', name: 'Marco le Jardinier',  role: 'jardinier' },
  { id: 'libraire',  name: 'Inès la Libraire',    role: 'libraire' },
];

// Indices. Types : room, notRoom, furniture, nextToFurniture,
// sameRoom, notSameRoom, colLeft (a à gauche de b), rowAbove (a au-dessus de b).
export const CLUES = [
  { t: 'furniture', who: 'plaquiste', ftype: 'lit', color: 'bleu',
    text: "Hugo le Plaquiste dormait sur le lit au duvet bleu." },
  { t: 'room', who: 'victime', room: 'H',
    text: "Le corps de M. Hervé a été découvert dans la véranda." },
  { t: 'furniture', who: 'peintre', ftype: 'canape',
    text: "Sofia la Peintre s'était assoupie sur un canapé." },
  { t: 'room', who: 'peintre', room: 'E',
    text: "Sofia la Peintre n'a pas quitté le salon de la soirée." },
  { t: 'room', who: 'notaire', room: 'C',
    text: "Léa la Notaire travaillait dans le bureau." },
  { t: 'nextToFurniture', who: 'libraire', ftype: 'plante',
    text: "Inès la Libraire s'était installée juste à côté d'une plante." },
  { t: 'room', who: 'libraire', room: 'D',
    text: "Inès la Libraire préparait un thé à la cuisine." },
  { t: 'sameRoom', a: 'jardinier', b: 'victime',
    text: "Marco le Jardinier se trouvait dans la même pièce que la victime." },
  { t: 'nextToFurniture', who: 'jardinier', ftype: 'coiffeuse',
    text: "Marco le Jardinier était assis à côté d'une coiffeuse." },
];
