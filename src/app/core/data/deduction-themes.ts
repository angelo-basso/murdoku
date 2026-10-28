import { Person } from '../models/deduction.models';

export interface DeductionTheme {
  id: string;
  name: string;
  emoji: string;
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
  /** Personnes (ordonnées, [0] = victime). Au moins 9 pour l'expert 9×9. */
  people: Person[];
}

const LAYOUTS: Record<number, string[][]> = {
  5: [
    ['AABBC', 'AABCC', 'DDBCE', 'DDFEE', 'DFFEE'],
    ['AAABB', 'ACCBB', 'DCCEE', 'DDFFE', 'DDFFE'],
  ],
  6: [
    ['AABBCC', 'AABBCC', 'DDEEFF', 'DDEEFF', 'GGGHHH', 'GGGHHH'],
    ['AABBBC', 'AADBBC', 'DDDECC', 'FFDEEC', 'FFGEEH', 'FGGGHH'],
  ],
  7: [
    ['AABBCCC', 'AABBDCC', 'EEBBDDF', 'EEGGDDF', 'EHGGIDF', 'HHGJIIF', 'HHJJIIF'],
    ['AAABBCC', 'ADDBBCC', 'EDDFFFG', 'EEHHFGG', 'IEHHJJG', 'IIKKJJL', 'IIKKKLL'],
  ],
  8: [
    ['AAABBCCC', 'AAABBCCC', 'DDEEBFFF', 'DDEEGGFF', 'HHEEGGII', 'HHJJJGII', 'KKJJLLLI', 'KKKJLLLI'],
  ],
  9: [
    ['AAABBBCCC', 'AAABBBCCC', 'DDDEEFFGG', 'DDHEEFFGG', 'IIHHEJJGG', 'IIHKKJJLL', 'MMMKKNNLL', 'MMOOONNPP', 'MMOOONNPP'],
  ],
};

const PALETTE_WARM = ['#1b2550', '#3a1c2e', '#241c42', '#20331f', '#2a2250', '#2d2436', '#2a2320', '#143036',
  '#30261a', '#1c3030', '#331a24', '#1f2a40', '#2a2a18', '#22183a', '#13302a', '#38201a'];
const PALETTE_HAUNTED = ['#241233', '#1c2b1c', '#2a1830', '#141d2c', '#31142a', '#1f2630', '#2a1f14', '#102a26',
  '#2b1030', '#182033', '#26132a', '#14261c', '#2c1c12', '#1a1430', '#20282c', '#301a28'];
const PALETTE_OFFICE = ['#1d2a3a', '#23303d', '#1a2b2b', '#2b2a3a', '#1e3330', '#2d2c24', '#22283a', '#1f2f22',
  '#2a2130', '#1c2a40', '#2f2a1e', '#20303a', '#262636', '#183028', '#2c2633', '#22322e'];
const PALETTE_FACTORY = ['#2a2418', '#1f2a2a', '#30261c', '#232a1c', '#2b2020', '#1e2630', '#33281a', '#20251c',
  '#2c241e', '#1c2826', '#2e2a1a', '#242a30', '#30201a', '#1d2a22', '#2a2a2a', '#28221c'];

/** Personnel d'entreprise, partagé par les décors « bureaux » et « usine ». */
const STAFF: Person[] = [
  { id: 'victime', name: 'M. Bernard, le PDG', role: 'la victime', victim: true },
  { id: 'ouvrier', name: "Kevin l'Ouvrier", role: 'ouvrier' },
  { id: 'contremaitre', name: 'Joël le Contremaître', role: 'contremaître' },
  { id: 'ingenieure', name: "Sarah l'Ingénieure", role: 'ingénieure' },
  { id: 'secretaire', name: 'Nadia la Secrétaire', role: 'secrétaire' },
  { id: 'comptable', name: 'Paul le Comptable', role: 'comptable' },
  { id: 'directrice', name: 'Hélène la Directrice', role: 'directrice' },
  { id: 'stagiaire', name: 'Théo le Stagiaire', role: 'stagiaire' },
  { id: 'vigile', name: 'Momo le Vigile', role: 'vigile' },
];

export const CLASSIC_THEME: DeductionTheme = {
  id: 'manoir',
  name: 'Le manoir',
  emoji: '🏰',
  blocking: ['table', 'plante', 'biblio', 'coiffeuse'],
  seatingPool: ['chaise', 'chaise', 'chaise', 'canape', 'lit:bleu', 'lit:rouge', 'lit:vert', 'vide'],
  blockerPool: ['table', 'plante', 'biblio', 'coiffeuse'],
  roomNamePool: ['Chambre bleue', 'Chambre rouge', 'Bureau', 'Cuisine', 'Salon', 'Bibliothèque', 'Atelier', 'Véranda',
    'Cellier', 'Fumoir', 'Grand salon', 'Salle à manger', 'Grenier', 'Cave', 'Lingerie', 'Galerie'],
  tintPalette: PALETTE_WARM,
  layouts: LAYOUTS,
  people: [
    { id: 'victime', name: 'M. Hervé', role: 'la victime', victim: true },
    { id: 'plaquiste', name: 'Hugo le Plaquiste', role: 'plaquiste' },
    { id: 'notaire', name: 'Léa la Notaire', role: 'notaire' },
    { id: 'peintre', name: 'Sofia la Peintre', role: 'peintre' },
    { id: 'jardinier', name: 'Marco le Jardinier', role: 'jardinier' },
    { id: 'libraire', name: 'Inès la Libraire', role: 'libraire' },
    { id: 'medecin', name: 'Dr. Blanche', role: 'médecin' },
    { id: 'cuisinier', name: 'Gaston le Cuisinier', role: 'cuisinier' },
    { id: 'gouvernante', name: 'Maud la Gouvernante', role: 'gouvernante' },
  ],
};

export const HAUNTED_THEME: DeductionTheme = {
  id: 'hante',
  name: 'Le manoir hanté',
  emoji: '🎃',
  blocking: ['chaudron', 'candelabre', 'tombe', 'toile', 'biblio'],
  seatingPool: ['fauteuil', 'fauteuil', 'chaise', 'cercueil', 'vide', 'lit:rouge'],
  blockerPool: ['chaudron', 'candelabre', 'tombe', 'toile', 'biblio'],
  roomNamePool: ['Crypte', 'Donjon', 'Grenier', 'Salle de bal', 'Boudoir', 'Cave', 'Chapelle', 'Serre',
    'Cachot', 'Galerie', 'Ossuaire', 'Tour', 'Mausolée', 'Chambre noire', 'Labyrinthe', 'Salle des glaces'],
  tintPalette: PALETTE_HAUNTED,
  layouts: LAYOUTS,
  people: [
    { id: 'victime', name: 'Alfred le Majordome', role: 'la victime', victim: true },
    { id: 'vampire', name: 'Vlad le Vampire', role: 'vampire' },
    { id: 'sorciere', name: 'Morgane la Sorcière', role: 'sorcière' },
    { id: 'zombie', name: 'Zef le Zombie', role: 'zombie' },
    { id: 'loupgarou', name: 'Rémus le Loup-Garou', role: 'loup-garou' },
    { id: 'momie', name: 'Aménia la Momie', role: 'momie' },
    { id: 'squelette', name: 'Oscar le Squelette', role: 'squelette' },
    { id: 'fantome', name: 'Ophélie le Fantôme', role: 'fantôme' },
    { id: 'epouvantail', name: "Jack l'Épouvantail", role: 'épouvantail' },
  ],
};

export const OFFICE_THEME: DeductionTheme = {
  id: 'bureaux',
  name: 'Les bureaux',
  emoji: '🏢',
  blocking: ['bureau', 'imprimante', 'fontaine', 'plante', 'armoire'],
  seatingPool: ['siege', 'siege', 'siege', 'canape', 'pouf', 'vide'],
  blockerPool: ['bureau', 'bureau', 'imprimante', 'fontaine', 'plante', 'armoire'],
  roomNamePool: ['Open space', 'Salle de réunion', 'Bureau du PDG', 'Cafétéria', 'Accueil', 'Archives', 'Salle serveurs',
    'Reprographie', 'Direction', 'Comptabilité', 'Ressources humaines', 'Terrasse', 'Hall', 'Salle de pause',
    'Studio', 'Bibliothèque'],
  tintPalette: PALETTE_OFFICE,
  layouts: LAYOUTS,
  people: STAFF,
};

export const FACTORY_THEME: DeductionTheme = {
  id: 'usine',
  name: "L'usine",
  emoji: '🏭',
  blocking: ['machine', 'caisses', 'fut', 'chariot'],
  seatingPool: ['tabouret', 'tabouret', 'banc', 'chaise', 'vide', 'vide'],
  blockerPool: ['machine', 'machine', 'caisses', 'fut', 'chariot'],
  roomNamePool: ['Atelier A', 'Atelier B', 'Entrepôt', 'Quai de chargement', 'Chaufferie', 'Vestiaires', 'Bureau du chef',
    'Laboratoire', 'Salle des machines', 'Réfectoire', 'Magasin', 'Contrôle qualité', 'Expédition', 'Fonderie',
    'Local technique', 'Cour'],
  tintPalette: PALETTE_FACTORY,
  layouts: LAYOUTS,
  people: STAFF,
};

export const THEMES: Record<string, DeductionTheme> = {
  [CLASSIC_THEME.id]: CLASSIC_THEME,
  [HAUNTED_THEME.id]: HAUNTED_THEME,
  [OFFICE_THEME.id]: OFFICE_THEME,
  [FACTORY_THEME.id]: FACTORY_THEME,
};
export const THEME_LIST: DeductionTheme[] = [CLASSIC_THEME, HAUNTED_THEME, OFFICE_THEME, FACTORY_THEME];

/** Étiquettes de mobilier pour le texte des indices. */
export const FURN_LABEL: Record<string, string> = {
  lit: 'le lit', chaise: 'une chaise', canape: 'un canapé', fauteuil: 'un fauteuil',
  cercueil: 'un cercueil', table: 'une table', plante: 'une plante', biblio: 'une bibliothèque',
  coiffeuse: 'une coiffeuse', chaudron: 'un chaudron', candelabre: 'un candélabre',
  tombe: 'une tombe', toile: "une toile d'araignée",
  siege: 'un fauteuil de bureau', pouf: 'un pouf', bureau: 'un bureau', imprimante: 'une imprimante',
  fontaine: 'une fontaine à eau', armoire: 'une armoire',
  tabouret: 'un tabouret', banc: 'un banc', machine: 'une machine', caisses: 'des caisses',
  fut: 'un fût', chariot: 'un chariot élévateur',
};
export const NEXT_LABEL: Record<string, string> = {
  lit: "d'un lit", chaise: "d'une chaise", canape: "d'un canapé", fauteuil: "d'un fauteuil",
  cercueil: "d'un cercueil", table: "d'une table", plante: "d'une plante", biblio: "d'une bibliothèque",
  coiffeuse: "d'une coiffeuse", chaudron: "d'un chaudron", candelabre: "d'un candélabre",
  tombe: "d'une tombe", toile: "d'une toile d'araignée",
  siege: "d'un fauteuil de bureau", pouf: "d'un pouf", bureau: "d'un bureau", imprimante: "d'une imprimante",
  fontaine: "d'une fontaine à eau", armoire: "d'une armoire",
  tabouret: "d'un tabouret", banc: "d'un banc", machine: "d'une machine", caisses: 'de caisses',
  fut: "d'un fût", chariot: "d'un chariot élévateur",
};
