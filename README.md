# Huis Clos — enquêtes logiques

Un meurtre a été commis. Placez chaque suspect sur le plan de la maison d'après les indices,
et démasquez le coupable : le seul à partager la pièce de la victime.

- une personne par **ligne**, par **colonne** et par **pièce** (sauf la victime et son meurtrier) ;
- jamais sur un meuble bloquant ; tous les **indices** doivent être respectés ;
- 100 affaires sur 5 difficultés (5×5 à 9×9), toutes à solution unique, plus un générateur infini ;
- 4 décors, 120 personnages pixel-art, étoiles, énergie, boutique, thème clair/sombre,
  musiques générées, jouable au lecteur d'écran.

**Télécharger l'appli Android** : https://github.com/angelo-basso/murdoku/releases/latest

## Stack

Angular 18 (standalone, signals) · Ionic 8 · Capacitor 6 (Android) · moteur de jeu en
TypeScript pur (`src/app/core/engine/`, testable sous Node).

## Développer

```bash
npm install
npm start                # http://localhost:4200
npm run check:engine     # valide le générateur (unicité, coupable non révélé, temps)
npm run levels           # régénère les 100 affaires (src/app/core/data/levels.data.ts)
node tools/gen-pixel.mjs # régénère personnages et meubles pixel-art
```

## Structure

```
src/app/
  core/engine/    solveur et générateur d'affaires (sans Angular)
  core/data/      décors, distributions de personnages, affaires
  core/services/  partie, progression (étoiles, énergie, boutique), réglages, audio
  pages/          menu, affaires classiques, sur mesure, partie, boutique, réglages, règles
tools/            génération des assets et des niveaux
docs/             publication, politique de confidentialité, fiche du store
```

## Versions et publication

Voir [docs/RELEASE.md](docs/RELEASE.md) : un tag `vX.Y.Z` (ou *Actions › Release › Run workflow*)
publie un APK et un AAB signés dans une Release GitHub. L'action *Build Android APK* produit un
APK de test.

## Version web (Docker)

```bash
docker compose up -d --build                     # http://localhost:8080
# ou l'image publiée par la CI :
docker run -d -p 8080:80 --name huis-clos --restart unless-stopped ghcr.io/angelo-basso/huis-clos:latest
```

## Licence

Code et assets pixel-art créés pour le projet.
