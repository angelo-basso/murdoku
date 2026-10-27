export interface Furniture {
  type: string;
  color?: string;
}

export type Difficulty = 'facile' | 'moyen' | 'difficile';

export interface Person {
  id: string;
  name: string;
  role: string;
  victim?: boolean;
}

export type ClueType =
  | 'room'
  | 'notRoom'
  | 'furniture'
  | 'nextToFurniture'
  | 'sameRoom'
  | 'notSameRoom'
  | 'colLeft'
  | 'rowAbove';

export interface Clue {
  t: ClueType;
  who?: string;
  a?: string;
  b?: string;
  room?: string;
  ftype?: string;
  color?: string;
  text: string;
}

/** Une affaire de déduction (vraies règles Murdoku). */
export interface DeductionCase {
  id: string;
  title: string;
  n: number;
  intro: string;
  /** Pièce (identifiant) par case. */
  rooms: string[][];
  roomNames: Record<string, string>;
  /** Code mobilier par case : "type" ou "type:couleur" ; "vide" = sol. */
  furniture: string[][];
  /** Types de mobilier qui bloquent la case (interdite au placement). */
  blocking: string[];
  people: Person[];
  clues: Clue[];
  /** Teinte de fond par pièce (identifiant → couleur). */
  tints?: Record<string, string>;
  /** Code de partage (thème.taille.difficulté.graine) pour rejouer l'affaire. */
  share?: string;
}

export type Placement = Record<string, [number, number] | null>;
