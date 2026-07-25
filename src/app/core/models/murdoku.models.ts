export type Grid = number[][]; // 0 = case vide

export type Difficulty = 'facile' | 'moyen' | 'difficile';
export type BoardSize = 4 | 6 | 9;

export interface BoxDims {
  rows: number;
  cols: number;
}

/** Un suspect = un symbole de la grille (id de 1..size). */
export interface Suspect {
  id: number;
  name: string;
  emoji: string;
  motive: string;
}

/** Une affaire criminelle = un niveau de Murdoku. */
export interface MurdokuCase {
  id: string;
  title: string;
  size: BoardSize;
  difficulty: Difficulty;
  victim: string;
  location: string;
  intro: string;
  suspects: Suspect[]; // longueur = size
  /** Case dont la résolution démasque le coupable (loupe 🔍). */
  culpritCell: { row: number; col: number };
}

/** Coordonnées d'une case de la grille. */
export interface Cell {
  row: number;
  col: number;
}

/** État jouable d'une partie (sérialisable pour la sauvegarde). */
export interface GameState {
  caseId: string;
  size: BoardSize;
  /** Indices de départ (fixes) — 0 ailleurs. */
  given: Grid;
  /** Solution complète. */
  solution: Grid;
  /** Saisies du joueur (inclut les indices de départ). */
  current: Grid;
  /** Notes / annotations au crayon par case. */
  notes: number[][][];
  elapsedMs: number;
  mistakes: number;
  hintsUsed: number;
  completed: boolean;
}

export const BOX_DIMS: Record<BoardSize, BoxDims> = {
  4: { rows: 2, cols: 2 },
  6: { rows: 2, cols: 3 },
  9: { rows: 3, cols: 3 },
};
