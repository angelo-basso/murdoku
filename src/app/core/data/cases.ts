import { MurdokuCase } from '../models/murdoku.models';

/**
 * Catalogue des affaires. Chaque affaire fournit le thème d'enquête ;
 * la grille (indices + solution) est générée à la volée par le moteur Sudoku.
 * Le suspect d'id = valeur de la solution dans `culpritCell` est le coupable.
 */
export const CASES: MurdokuCase[] = [
  {
    id: 'manoir-4',
    title: 'Le mystère du petit salon',
    size: 4,
    difficulty: 'facile',
    victim: 'Sir Reginald',
    location: 'le petit salon du manoir',
    intro:
      "Sir Reginald a été retrouvé sans vie près de la cheminée. Quatre invités étaient présents. Reconstituez le plan de table pour démasquer le coupable.",
    suspects: [
      { id: 1, name: 'Le Majordome', emoji: '🤵', motive: 'un héritage promis puis retiré' },
      { id: 2, name: 'La Comtesse', emoji: '👑', motive: 'une dette de jeu impossible à rembourser' },
      { id: 3, name: 'Le Docteur', emoji: '🩺', motive: 'un secret médical compromettant' },
      { id: 4, name: 'La Cuisinière', emoji: '🍳', motive: 'un renvoi humiliant la veille' },
    ],
    culpritCell: { row: 0, col: 3 },
  },
  {
    id: 'express-6',
    title: "Crime à bord de l'Express",
    size: 6,
    difficulty: 'moyen',
    victim: 'Monsieur Lambert',
    location: 'le wagon-restaurant',
    intro:
      "Le train file dans la nuit. Monsieur Lambert s'effondre entre deux gares. Six passagers, six alibis à vérifier. À vous de rétablir la vérité.",
    suspects: [
      { id: 1, name: 'Le Diplomate', emoji: '🎩', motive: 'un chantage qui menaçait sa carrière' },
      { id: 2, name: "L'Actrice", emoji: '🎭', motive: 'des lettres compromettantes' },
      { id: 3, name: 'Le Contrôleur', emoji: '🚂', motive: 'un vol découvert par la victime' },
      { id: 4, name: 'La Veuve', emoji: '🖤', motive: 'une vengeance longtemps mûrie' },
      { id: 5, name: "L'Antiquaire", emoji: '🏺', motive: 'un faux vendu à prix d\'or' },
      { id: 6, name: 'Le Journaliste', emoji: '📰', motive: 'un scoop qu\'il voulait enterrer' },
    ],
    culpritCell: { row: 2, col: 4 },
  },
  {
    id: 'gala-9',
    title: 'Meurtre au gala de charité',
    size: 9,
    difficulty: 'difficile',
    victim: 'La mécène Éléonore',
    location: 'la grande galerie',
    intro:
      "Sous les lustres du gala, Éléonore s'écroule au milieu de la valse. Neuf personnalités l'entouraient. Une seule a commis l'irréparable. Résolvez la grille pour la confondre.",
    suspects: [
      { id: 1, name: 'Le Banquier', emoji: '💼', motive: 'un détournement sur le point d\'éclater' },
      { id: 2, name: 'La Chanteuse', emoji: '🎤', motive: 'une rivalité dévorante' },
      { id: 3, name: 'Le Peintre', emoji: '🎨', motive: 'une œuvre volée' },
      { id: 4, name: "L'Héritier", emoji: '🧳', motive: 'un testament à faire disparaître' },
      { id: 5, name: 'La Sénatrice', emoji: '⚖️', motive: 'un scandale politique imminent' },
      { id: 6, name: 'Le Chef étoilé', emoji: '👨‍🍳', motive: 'une recette et un honneur bafoués' },
      { id: 7, name: 'La Photographe', emoji: '📷', motive: 'un cliché qui valait une fortune' },
      { id: 8, name: 'Le Collectionneur', emoji: '🗝️', motive: 'une relique promise puis reprise' },
      { id: 9, name: "L'Astronome", emoji: '🔭', motive: 'une découverte qu\'on lui a volée' },
    ],
    culpritCell: { row: 4, col: 4 },
  },
];

export function findCase(id: string): MurdokuCase | undefined {
  return CASES.find((c) => c.id === id);
}
