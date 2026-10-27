import { Person } from '../models/deduction.models';

export interface DeductionTheme {
  id: string;
  name: string;
  /** Types de mobilier qui bloquent une case. */
  blocking: string[];
  /** Mobilier « assise » (où l'on peut se tenir), inclut 'vide' = sol. */
  seatingPool: string[];
  /** Mobilier bloquant pour le remplissage aléatoire. */
  blockerPool: string[];
  roomNamePool: string[];
  tintPalette: string[];
  /** taille → liste de plans (chaque plan = lignes de lettres de pièces). */
  layouts: Record<number, string[][]>;
  /** Personnes (ordonnées, [0] = victime). */
  people: Person[];
}

const LAYOUTS: Record<number, string[][]> = {
  5: [['AABBC', 'AABCC', 'DDBCE', 'DDFEE', 'DFFEE']],
  6: [
    ['AABBCC', 'AABBCC', 'DDEEFF', 'DDEEFF', 'GGGHHH', 'GGGHHH'],
    ['AABBBC', 'AADBBC', 'DDDECC', 'FFDEEC', 'FFGEEH', 'FGGGHH'],
  ],
  7: [['AABBCCC', 'AABBDCC', 'EEBBDDF', 'EEGGDDF', 'EHGGIDF', 'HHGJIIF', 'HHJJIIF']],
};

export const CLASSIC_THEME: DeductionTheme = {
  id: 'manoir',
  name: 'Le manoir',
  blocking: ['table', 'plante', 'biblio', 'coiffeuse'],
  seatingPool: ['chaise', 'chaise', 'chaise', 'canape', 'lit:bleu', 'lit:rouge', 'lit:vert', 'vide'],
  blockerPool: ['table', 'plante', 'biblio', 'coiffeuse'],
  roomNamePool: ['Chambre bleue', 'Chambre rouge', 'Bureau', 'Cuisine', 'Salon', 'Bibliothèque', 'Atelier', 'Véranda', 'Cellier', 'Fumoir'],
  tintPalette: ['#1b2550', '#3a1c2e', '#241c42', '#20331f', '#2a2250', '#2d2436', '#2a2320', '#143036', '#30261a', '#1c3030'],
  layouts: LAYOUTS,
  people: [
    { id: 'victime', name: 'M. Hervé', role: 'la victime', victim: true },
    { id: 'plaquiste', name: 'Hugo le Plaquiste', role: 'plaquiste' },
    { id: 'notaire', name: 'Léa la Notaire', role: 'notaire' },
    { id: 'peintre', name: 'Sofia la Peintre', role: 'peintre' },
    { id: 'jardinier', name: 'Marco le Jardinier', role: 'jardinier' },
    { id: 'libraire', name: 'Inès la Libraire', role: 'libraire' },
    { id: 'medecin', name: 'Dr. Blanche', role: 'médecin' },
  ],
};

export const HAUNTED_THEME: DeductionTheme = {
  id: 'hante',
  name: 'Le manoir hanté',
  blocking: ['chaudron', 'candelabre', 'tombe', 'toile', 'biblio'],
  seatingPool: ['fauteuil', 'fauteuil', 'chaise', 'cercueil', 'vide', 'lit:rouge'],
  blockerPool: ['chaudron', 'candelabre', 'tombe', 'toile', 'biblio'],
  roomNamePool: ['Crypte', 'Donjon', 'Grenier', 'Salle de bal', 'Boudoir', 'Cave', 'Chapelle', 'Serre', 'Cachot', 'Galerie'],
  tintPalette: ['#241233', '#1c2b1c', '#2a1830', '#141d2c', '#31142a', '#1f2630', '#2a1f14', '#102a26', '#2b1030', '#182033'],
  layouts: LAYOUTS,
  people: [
    { id: 'victime', name: 'Alfred le Majordome', role: 'la victime', victim: true },
    { id: 'vampire', name: 'Vlad le Vampire', role: 'vampire' },
    { id: 'sorciere', name: 'Morgane la Sorcière', role: 'sorcière' },
    { id: 'zombie', name: 'Zef le Zombie', role: 'zombie' },
    { id: 'loupgarou', name: 'Rémus le Loup-Garou', role: 'loup-garou' },
    { id: 'momie', name: 'Aménia la Momie', role: 'momie' },
    { id: 'squelette', name: 'Oscar le Squelette', role: 'squelette' },
  ],
};

export const THEMES: Record<string, DeductionTheme> = {
  [CLASSIC_THEME.id]: CLASSIC_THEME,
  [HAUNTED_THEME.id]: HAUNTED_THEME,
};

/** Étiquettes de mobilier pour le texte des indices. */
export const FURN_LABEL: Record<string, string> = {
  lit: 'le lit', chaise: 'une chaise', canape: 'un canapé', fauteuil: 'un fauteuil',
  cercueil: 'un cercueil', table: 'une table', plante: 'une plante', biblio: 'une bibliothèque',
  coiffeuse: 'une coiffeuse', chaudron: 'un chaudron', candelabre: 'un candélabre',
  tombe: 'une tombe', toile: "une toile d'araignée",
};
export const NEXT_LABEL: Record<string, string> = {
  lit: "d'un lit", chaise: "d'une chaise", canape: "d'un canapé", fauteuil: "d'un fauteuil",
  cercueil: "d'un cercueil", table: "d'une table", plante: "d'une plante", biblio: "d'une bibliothèque",
  coiffeuse: "d'une coiffeuse", chaudron: "d'un chaudron", candelabre: "d'un candélabre",
  tombe: "d'une tombe", toile: "d'une toile d'araignée",
};
