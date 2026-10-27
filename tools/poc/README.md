# Prototype — mode déduction « vrai Murdoku »

Ce dossier contient le **prototype du moteur** pour la mécanique authentique de
Murdoku (créé par Manuel Garand, Puzzlewright Press), différente du premier jet
« Sudoku à suspects ».

## Règles implémentées

- Plan découpé en **pièces** ; chaque personne occupe **une case, une seule par
  ligne et par colonne**.
- On peut se tenir sur **lit / chaise / canapé** ; **table / plante /
  bibliothèque / coiffeuse** bloquent la case.
- **Indices** déductifs : pièce, mobilier, « à côté de » (adjacent orthogonal),
  même pièce, ordre gauche/droite ou haut/bas.
- **Coupable** = la personne qui finit **seule avec la victime** dans sa pièce.

## Fichiers

- `case.mjs` — une affaire 6×6 (plan, mobilier, personnes, indices) en données pures.
- `solve.mjs` — solveur générique : liste les candidats, prouve l'unicité de la
  solution et désigne le coupable.

## Lancer

```bash
node tools/poc/solve.mjs
```

Sortie attendue : **1 solution unique** → coupable *Marco le Jardinier*, seul
avec la victime dans la véranda.

Ce prototype sert à valider la mécanique et la direction artistique avant
l'intégration dans l'app Angular (UI de jeu, générateur d'affaires, indices).
