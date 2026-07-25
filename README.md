# 🔍 Murdoku

**Murdoku** est un jeu de réflexion mobile qui mêle **Sudoku** et **enquête policière**.

Chaque niveau est une **affaire criminelle** : la grille de Sudoku ne contient
pas des chiffres mais des **suspects** (icônes). En remplissant correctement la
grille selon les règles classiques du Sudoku, la case marquée d'une **loupe 🔍**
révèle l'identité du **coupable**.

- 🧩 Grilles **4×4**, **6×6** et **9×9** (difficulté facile → difficile)
- 🕵️ Un scénario, une victime et des suspects avec leurs mobiles pour chaque affaire
- ✏️ Mode notes (annotations au crayon), indices, détection d'erreurs
- ⏱️ Chronomètre, comptage des erreurs et des indices
- 💾 Progression sauvegardée automatiquement (reprise de partie)

## Stack technique

- [Angular 18](https://angular.dev) (composants *standalone*, *signals*)
- [Ionic 8](https://ionicframework.com) pour l'UI mobile
- [Capacitor 6](https://capacitorjs.com) pour l'empaquetage **iOS / Android**
- Cible **Web + iOS + Android** à partir d'une seule base de code

## Démarrer en local

```bash
npm install
npm start            # http://localhost:4200 (web)
```

## Build de production (web)

```bash
npm run build        # génère le dossier ./www
```

## Empaqueter en application mobile

```bash
# 1) Build web
npm run build

# 2) Ajouter les plateformes natives (une seule fois)
npx cap add android
npx cap add ios

# 3) Synchroniser le web vers le natif puis ouvrir l'IDE
npx cap sync
npm run cap:android   # ouvre Android Studio
npm run cap:ios       # ouvre Xcode (macOS requis)
```

## Structure du projet

```
src/app/
  core/
    models/       # types du domaine (affaire, état de partie…)
    services/     # moteur Sudoku, logique de jeu, stockage
    data/         # catalogue des affaires (scénarios + suspects)
  components/
    board/        # plateau de jeu
    suspect-pad/  # pavé de sélection des suspects
  pages/
    home/         # liste des affaires
    game/         # écran de jeu + révélation du coupable
```

## Comment jouer

1. Choisissez une **affaire** sur l'écran d'accueil.
2. Remplissez la grille : chaque **suspect** doit apparaître une seule fois par
   ligne, par colonne et par région — comme au Sudoku.
3. Utilisez le **mode notes** pour marquer les hypothèses, et les **indices** si
   vous êtes bloqué·e.
4. Une fois la grille résolue, la case 🔍 démasque le **coupable** !

## Licence

MIT
