import { DeductionCase } from '../models/deduction.models';
import { BLOCKING } from './deduction-themes';

/** Affaire 6×6 « Le manoir » (identique au prototype prouvé unique). */
export const MANOIR_6: DeductionCase = {
  id: 'manoir-6',
  title: 'Le manoir de la colline',
  n: 6,
  intro:
    "M. Hervé a été retrouvé sans vie dans le manoir. Six personnes y passaient la soirée. Placez chacune d'elles (une par ligne, par colonne et par pièce) grâce aux indices. Seul le coupable partageait la pièce de la victime.",
  rooms: [
    ['A', 'A', 'B', 'B', 'C', 'C'],
    ['A', 'A', 'B', 'B', 'C', 'C'],
    ['D', 'D', 'E', 'E', 'F', 'F'],
    ['D', 'D', 'E', 'E', 'F', 'F'],
    ['G', 'G', 'G', 'H', 'H', 'H'],
    ['G', 'G', 'G', 'H', 'H', 'H'],
  ],
  roomNames: {
    A: 'Chambre bleue', B: 'Chambre rouge', C: 'Cabinet de travail',
    D: 'Cuisine', E: 'Salon', F: 'Bibliothèque',
    G: 'Atelier', H: 'Véranda',
  },
  furniture: [
    ['lit:bleu', 'coiffeuse', 'lit:rouge', 'coiffeuse', 'chaise', 'biblio'],
    ['tapis', 'armoire', 'fauteuil', 'vide', 'globe', 'fauteuil'],
    ['table', 'chaise', 'canape', 'tapis', 'biblio', 'chaise'],
    ['tabouret', 'evier', 'canape', 'cheminee', 'fauteuil', 'biblio'],
    ['chevalet', 'tabouret', 'vide', 'transat', 'plante', 'banc'],
    ['etabli', 'tabouret', 'vide', 'vide', 'banc', 'plante'],
  ],
  blocking: BLOCKING,
  people: [
    { id: 'victime', name: 'M. Hervé', role: 'la victime', victim: true },
    { id: 'plaquiste', name: 'Hugo le Plaquiste', role: 'plaquiste' },
    { id: 'notaire', name: 'Léa la Notaire', role: 'notaire' },
    { id: 'peintre', name: 'Sofia la Peintre', role: 'peintre' },
    { id: 'jardinier', name: 'Marco le Jardinier', role: 'jardinier' },
    { id: 'libraire', name: 'Inès la Libraire', role: 'libraire' },
  ],
  clues: [
    { t: 'room', who: 'victime', room: 'H', text: "Le corps de M. Hervé a été découvert dans la véranda." },
    { t: 'furniture', who: 'victime', ftype: 'transat', text: "M. Hervé gisait dans un transat." },
    { t: 'furniture', who: 'plaquiste', ftype: 'lit', color: 'bleu', text: "Hugo le Plaquiste dormait sur le lit au duvet bleu." },
    { t: 'room', who: 'notaire', room: 'C', text: "Léa la Notaire travaillait dans le cabinet de travail." },
    { t: 'room', who: 'libraire', room: 'D', text: "Inès la Libraire préparait un thé à la cuisine." },
    { t: 'nextToFurniture', who: 'libraire', ftype: 'table', text: "Inès la Libraire s'était installée juste à côté d'une table." },
    { t: 'rowAbove', a: 'peintre', b: 'jardinier', text: "Sofia la Peintre se trouvait dans une rangée au-dessus de Marco le Jardinier." },
    { t: 'colLeft', a: 'peintre', b: 'jardinier', text: "Sofia la Peintre se trouvait dans une colonne à gauche de Marco le Jardinier." },
  ],
};

export const DEDUCTION_CASES: DeductionCase[] = [MANOIR_6];

export function findDeductionCase(id: string): DeductionCase | undefined {
  return DEDUCTION_CASES.find((c) => c.id === id);
}
