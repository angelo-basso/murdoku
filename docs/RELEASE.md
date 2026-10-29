# Publier Meurtre au carré

## Une seule fois : la clé de signature

Une version officielle est signée avec **ta** clé. Android n'accepte une mise à jour que si
elle est signée par la même clé : elle doit donc être créée une fois et conservée précieusement.

Sur ton ordinateur (Java et `gh` installés), dans le dossier du projet :

```bash
./tools/create-keystore.sh
```

Le script crée `huisclos-release.jks`, puis enregistre la clé et son mot de passe dans les secrets
du dépôt GitHub (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`). **Sauvegarde le fichier `.jks` et le mot de passe** hors du projet
(il est ignoré par git).

## Publier une version

Depuis GitHub : **Actions › Release › Run workflow**, choisir la branche et saisir la version
(ex. `1.0.1`) : le tag et la Release sont créés automatiquement.

Ou en ligne de commande :

```bash
git tag v1.0.0
git push origin v1.0.0
```

L'action **Release** compile, signe et crée la Release GitHub
« Meurtre au carré 1.0.0 » avec :

- `MeurtreAuCarre-1.0.0.apk` : à installer directement sur un téléphone ; les versions suivantes
  s'installent **par-dessus** (sans désinstaller, la progression est conservée) ;
- `MeurtreAuCarre-1.0.0.aab` : le format exigé par Google Play.

Numérotation : `vMAJEUR.MINEUR.CORRECTIF` (ex. `v1.0.1` pour une correction, `v1.1.0` pour une
nouveauté). Le numéro interne Android (versionCode) en est déduit automatiquement.

Lien de téléchargement permanent de la dernière version :
`https://github.com/angelo-basso/murdoku/releases/latest`

> Le dépôt doit être **public** pour que des personnes sans compte GitHub puissent télécharger
> les Releases. S'il reste privé, seuls les membres du dépôt y ont accès.

## Plus tard : Google Play

1. Créer un compte Google Play Console (25 $ une fois).
2. Mettre l'appli au niveau d'API exigé par Google Play (Android 16 / API 36 depuis le
   31 août 2026) : passage à une version récente de Capacitor.
3. Créer l'appli `fr.straswebngine.meurtreaucarre`, envoyer le `.aab` d'une Release, remplir la fiche
   (textes prêts dans `docs/store-listing.md`) et la politique de confidentialité
   (publiée par GitHub Pages : `site/confidentialite.html`).
4. Activer « Play App Signing » en gardant cette clé comme clé d'importation.

## Site (GitHub Pages)

Le dossier `site/` (présentation, lien de téléchargement, politique de confidentialité) est publié
par l'action *Site (GitHub Pages)* à chaque modification sur `main`.
Prérequis, une seule fois : **Settings › Pages › Source = « GitHub Actions »**.
Adresse : `https://angelo-basso.github.io/<nom-du-dépôt>/`.
