#!/usr/bin/env bash
# Crée la clé de signature Android de Meurtre au carré et l'enregistre dans les secrets GitHub du dépôt.
# À lancer UNE SEULE FOIS, sur ton ordinateur (prérequis : Java/keytool et gh connecté).
# ⚠️ Garde huisclos-release.jks et le mot de passe en lieu sûr : sans eux, impossible de publier
#    une mise à jour de l'appli (Android refuse une mise à jour signée par une autre clé).
set -euo pipefail

KS=huisclos-release.jks
ALIAS=huisclos
REPO=${REPO:-angelo-basso/murdoku}

command -v keytool >/dev/null || { echo "keytool introuvable : installe un JDK (ex. Temurin 17)."; exit 1; }
command -v gh >/dev/null || { echo "gh introuvable : https://cli.github.com"; exit 1; }
[ -e "$KS" ] && { echo "$KS existe déjà : je n'écrase pas une clé existante."; exit 1; }

read -rsp "Mot de passe de la clé (8 caractères min.) : " PASS; echo
read -rsp "Confirmer : " PASS2; echo
[ "$PASS" = "$PASS2" ] && [ ${#PASS} -ge 8 ] || { echo "Mots de passe différents ou trop courts."; exit 1; }

keytool -genkeypair -v -keystore "$KS" -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=Huis Clos, O=straswebngine.fr, C=FR"

base64 < "$KS" | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64 -R "$REPO"
printf '%s' "$PASS" | gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO"
printf '%s' "$PASS" | gh secret set ANDROID_KEY_PASSWORD -R "$REPO"
printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS -R "$REPO"

echo "✅ Clé créée ($KS) et secrets enregistrés dans $REPO."
echo "   Sauvegarde $KS + le mot de passe (gestionnaire de mots de passe, clé USB…)."
