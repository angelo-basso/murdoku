import { Person } from '../models/deduction.models';
import { CAST_BUREAUX, CAST_HANTE, CAST_MANOIR, CAST_USINE } from './casts';

/** Meuble : un nom = un visuel unique (src/assets/furniture/<clé>.svg), dans tous les décors. */
export interface FurnitureDef {
  /** « se trouvait … » (meubles où l'on peut se tenir). */
  on?: string;
  /** « juste à côté … » */
  next: string;
  /** Bloque la case (on ne peut pas s'y placer). */
  block: boolean;
}

const seat = (on: string, next: string): FurnitureDef => ({ on, next, block: false });
const obj = (next: string): FurnitureDef => ({ next, block: true });

export const FURNITURE: Record<string, FurnitureDef> = {
  // Où l'on peut se tenir
  'lit:bleu': seat('sur le lit au duvet bleu', 'du lit bleu'),
  'lit:rouge': seat('sur le lit au duvet rouge', 'du lit rouge'),
  'lit:vert': seat('sur le lit au duvet vert', 'du lit vert'),
  chaise: seat('sur une chaise', "d'une chaise"),
  fauteuil: seat('dans un fauteuil', "d'un fauteuil"),
  canape: seat('sur un canapé', "d'un canapé"),
  tabouret: seat('sur un tabouret', "d'un tabouret"),
  banc: seat('sur un banc', "d'un banc"),
  pouf: seat('sur un pouf', "d'un pouf"),
  siege: seat('sur une chaise à roulettes', "d'une chaise à roulettes"),
  tapis: seat('sur un tapis', "d'un tapis"),
  baignoire: seat('dans la baignoire', "d'une baignoire"),
  transat: seat('dans un transat', "d'un transat"),
  rocking: seat('dans un rocking-chair', "d'un rocking-chair"),
  cercueil: seat('dans un cercueil', "d'un cercueil"),
  paille: seat('sur une botte de paille', "d'une botte de paille"),
  priedieu: seat('sur un prie-Dieu', "d'un prie-Dieu"),
  trone: seat('sur un trône', "d'un trône"),
  palette: seat('sur une palette', "d'une palette"),
  // Meubles qui bloquent la case
  table: obj("d'une table"),
  plante: obj("d'une plante"),
  biblio: obj("d'une bibliothèque"),
  coiffeuse: obj("d'une coiffeuse"),
  armoire: obj("d'une armoire"),
  fourneau: obj("d'un fourneau"),
  evier: obj("d'un évier"),
  cheminee: obj("d'une cheminée"),
  piano: obj("d'un piano"),
  billard: obj("d'un billard"),
  horloge: obj("d'une horloge"),
  globe: obj("d'un globe"),
  malle: obj("d'une malle"),
  casiervin: obj("d'un casier à bouteilles"),
  lavabo: obj("d'un lavabo"),
  chevalet: obj("d'un chevalet"),
  etabli: obj("d'un établi"),
  statue: obj("d'une statue"),
  autel: obj("d'un autel"),
  chaudron: obj("d'un chaudron"),
  candelabre: obj("d'un candélabre"),
  tombe: obj("d'une tombe"),
  toile: obj("d'une toile d'araignée"),
  ossements: obj("d'un tas d'ossements"),
  miroir: obj("d'un miroir"),
  carnivore: obj("d'une plante carnivore"),
  telescope: obj("d'un télescope"),
  bureau: obj("d'un bureau"),
  imprimante: obj("d'une imprimante"),
  fontaine: obj("d'une fontaine à eau"),
  classeur: obj("d'un classeur à tiroirs"),
  coffre: obj("d'un coffre-fort"),
  serveur: obj("d'une baie de serveurs"),
  distributeur: obj("d'un distributeur"),
  comptoir: obj("d'un comptoir"),
  tableau: obj("d'un tableau blanc"),
  babyfoot: obj("d'un baby-foot"),
  parasol: obj("d'un parasol"),
  machine: obj("d'une machine-outil"),
  caisses: obj('de caisses en bois'),
  fut: obj("d'un fût"),
  chariot: obj("d'un chariot élévateur"),
  chaudiere: obj("d'une chaudière"),
  casier: obj("d'un vestiaire"),
  paillasse: obj("d'une paillasse de labo"),
  four: obj("d'un four"),
  enclume: obj("d'une enclume"),
  transfo: obj("d'un transformateur"),
};
export const BLOCKING: string[] = Object.keys(FURNITURE).filter((k) => FURNITURE[k].block);

/** Pièce : nom + mobilier qui y a sa place. */
export interface RoomDef { name: string; seats: string[]; objects: string[] }
const room = (name: string, seats: string[], objects: string[]): RoomDef => ({ name, seats, objects });

export interface DeductionTheme {
  id: string;
  name: string;
  emoji: string;
  /** Pièces possibles (au moins 16, noms uniques) avec leur mobilier cohérent. */
  rooms: RoomDef[];
  tintPalette: string[];
  /** taille → liste de plans (chaque plan = lignes de lettres de pièces). */
  layouts: Record<number, string[][]>;
  /** Distribution du décor (30 personnes) : chaque affaire en tire une partie et choisit la victime. */
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


export const CLASSIC_THEME: DeductionTheme = {
  id: 'manoir',
  name: 'Le manoir',
  emoji: '🏰',
  rooms: [
    room('Chambre bleue', ['lit:bleu', 'tapis'], ['coiffeuse', 'armoire']),
    room('Chambre rouge', ['lit:rouge', 'fauteuil'], ['coiffeuse', 'armoire']),
    room('Chambre verte', ['lit:vert', 'chaise'], ['armoire', 'plante']),
    room('Cabinet de travail', ['chaise', 'fauteuil'], ['biblio', 'globe']),
    room('Cuisine', ['tabouret', 'chaise'], ['fourneau', 'evier', 'table']),
    room('Salon', ['canape', 'fauteuil', 'tapis'], ['cheminee', 'piano', 'plante']),
    room('Bibliothèque', ['fauteuil', 'chaise'], ['biblio', 'globe']),
    room('Atelier', ['tabouret'], ['chevalet', 'etabli']),
    room('Véranda', ['transat', 'banc'], ['plante']),
    room('Salle à manger', ['chaise'], ['table', 'horloge']),
    room('Grenier', ['rocking', 'chaise'], ['malle']),
    room('Cave', ['tabouret'], ['casiervin']),
    room('Salle de bain', ['baignoire', 'tapis'], ['lavabo', 'plante']),
    room('Salle de billard', ['fauteuil', 'tabouret'], ['billard']),
    room('Fumoir', ['fauteuil', 'canape'], ['cheminee', 'globe']),
    room('Galerie', ['banc'], ['statue', 'plante']),
    room('Chapelle', ['banc', 'priedieu'], ['autel']),
  ],
  tintPalette: PALETTE_WARM,
  layouts: LAYOUTS,
  people: CAST_MANOIR,
};

export const HAUNTED_THEME: DeductionTheme = {
  id: 'hante',
  name: 'Le manoir hanté',
  emoji: '🎃',
  rooms: [
    room('Crypte', ['cercueil'], ['tombe', 'candelabre']),
    room('Donjon', ['paille'], ['toile', 'ossements']),
    room('Grenier', ['rocking'], ['malle', 'toile']),
    room('Salle de bal', ['fauteuil'], ['piano', 'candelabre']),
    room('Boudoir', ['lit:rouge', 'fauteuil'], ['coiffeuse', 'miroir']),
    room('Cave', ['tabouret'], ['casiervin', 'toile']),
    room('Chapelle', ['priedieu', 'banc'], ['autel', 'candelabre']),
    room('Serre', ['banc'], ['carnivore']),
    room('Cachot', ['paille'], ['ossements', 'toile']),
    room('Galerie', ['banc'], ['statue', 'candelabre']),
    room('Ossuaire', ['cercueil'], ['ossements', 'tombe']),
    room('Tour', ['chaise'], ['telescope', 'toile']),
    room('Mausolée', ['cercueil'], ['statue', 'tombe']),
    room('Laboratoire', ['tabouret'], ['chaudron', 'paillasse']),
    room('Salle du trône', ['trone'], ['candelabre', 'statue']),
    room('Salle des glaces', ['fauteuil'], ['miroir']),
    room('Bibliothèque maudite', ['fauteuil'], ['biblio', 'chaudron']),
  ],
  tintPalette: PALETTE_HAUNTED,
  layouts: LAYOUTS,
  people: CAST_HANTE,
};

export const OFFICE_THEME: DeductionTheme = {
  id: 'bureaux',
  name: 'Les bureaux',
  emoji: '🏢',
  rooms: [
    room('Open space', ['siege'], ['bureau', 'plante']),
    room('Salle de réunion', ['siege'], ['table', 'tableau']),
    room('Bureau du PDG', ['fauteuil', 'canape'], ['bureau', 'coffre']),
    room('Cafétéria', ['chaise'], ['table', 'distributeur']),
    room('Accueil', ['canape'], ['comptoir', 'plante']),
    room('Archives', ['tabouret'], ['classeur', 'coffre']),
    room('Salle serveurs', ['siege'], ['serveur']),
    room('Reprographie', ['tabouret'], ['imprimante', 'classeur']),
    room('Comptabilité', ['siege'], ['bureau', 'classeur']),
    room('Ressources humaines', ['siege', 'pouf'], ['bureau', 'plante']),
    room('Terrasse', ['transat'], ['plante', 'parasol']),
    room('Hall', ['banc'], ['plante', 'fontaine']),
    room('Salle de pause', ['pouf', 'canape'], ['fontaine', 'babyfoot']),
    room('Studio graphique', ['siege'], ['bureau', 'chevalet']),
    room('Bibliothèque', ['fauteuil'], ['biblio']),
    room('Direction', ['fauteuil'], ['bureau', 'globe']),
  ],
  tintPalette: PALETTE_OFFICE,
  layouts: LAYOUTS,
  people: CAST_BUREAUX,
};

export const FACTORY_THEME: DeductionTheme = {
  id: 'usine',
  name: "L'usine",
  emoji: '🏭',
  rooms: [
    room('Atelier A', ['tabouret'], ['machine', 'etabli']),
    room('Atelier B', ['tabouret'], ['machine', 'enclume']),
    room('Entrepôt', ['palette'], ['caisses', 'chariot']),
    room('Quai de chargement', ['palette'], ['chariot', 'fut']),
    room('Chaufferie', ['tabouret'], ['chaudiere', 'fut']),
    room('Vestiaires', ['banc'], ['casier']),
    room('Bureau du chef', ['chaise'], ['bureau', 'classeur']),
    room('Laboratoire', ['tabouret'], ['paillasse']),
    room('Salle des machines', ['tabouret'], ['machine', 'transfo']),
    room('Réfectoire', ['banc', 'chaise'], ['table', 'distributeur']),
    room('Magasin', ['chaise'], ['caisses', 'classeur']),
    room('Contrôle qualité', ['tabouret'], ['paillasse', 'etabli']),
    room('Expédition', ['palette'], ['caisses', 'chariot']),
    room('Fonderie', ['tabouret'], ['four', 'enclume']),
    room('Local technique', ['tabouret'], ['transfo', 'chaudiere']),
    room('Cour', ['banc', 'palette'], ['fut']),
  ],
  tintPalette: PALETTE_FACTORY,
  layouts: LAYOUTS,
  people: CAST_USINE,
};

export const THEMES: Record<string, DeductionTheme> = {
  [CLASSIC_THEME.id]: CLASSIC_THEME,
  [HAUNTED_THEME.id]: HAUNTED_THEME,
  [OFFICE_THEME.id]: OFFICE_THEME,
  [FACTORY_THEME.id]: FACTORY_THEME,
};
export const THEME_LIST: DeductionTheme[] = [CLASSIC_THEME, HAUNTED_THEME, OFFICE_THEME, FACTORY_THEME];

/** Nom d'un meuble pour la lecture vocale (« une chaise », « le lit bleu »). */
export function furnName(code: string): string {
  const f = FURNITURE[code];
  if (!f) return 'sol nu';
  return f.next.replace(/^du /, 'le ').replace(/^de /, '').replace(/^d'/, '');
}
