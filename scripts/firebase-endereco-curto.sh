#!/usr/bin/env bash
# Firebase Hosting adicional do Lumo. Nao toca no site padrao lumo-515518.
set -euo pipefail
PROJECT="lumo-515518"
ACTION="${1:-}"
SITE="${2:-uselumo}"
TARGET="lumo-curto"

if [[ ! "$SITE" =~ ^[a-z][a-z0-9-]{0,29}$ || "$SITE" == *- ]]; then
  echo "ID invalido. Use apenas letras minusculas, numeros e hifens, ate 30 caracteres."
  exit 2
fi
if [[ "$ACTION" != "reservar" && "$ACTION" != "publicar" ]]; then
  echo "Uso: bash scripts/firebase-endereco-curto.sh reservar uselumo"
  echo "     bash scripts/firebase-endereco-curto.sh publicar uselumo"
  exit 2
fi
command -v firebase >/dev/null || { echo "Firebase CLI nao encontrada. Execute no Google Cloud Shell."; exit 2; }
if [[ "$ACTION" == "reservar" ]]; then
  echo "Verificando site ${SITE} no projeto ${PROJECT}..."
  if firebase hosting:sites:get "$SITE" --project "$PROJECT" >/dev/null 2>&1; then
    echo "Site ${SITE} ja pertence a este projeto."
  else
    echo "Solicitando a criacao do site ${SITE} (identificador permanente, sujeito a disponibilidade global)."
    firebase hosting:sites:create "$SITE" --project "$PROJECT"
  fi
  firebase hosting:sites:get "$SITE" --project "$PROJECT"
  echo "Endereco reservado, ainda nao publicado: https://${SITE}.web.app"
  exit 0
fi
if [[ ! -f firebase.json || ! -d web ]]; then
  echo "Execute este script na raiz do repositorio Lumo, onde existem firebase.json e web/."
  exit 2
fi
if ! firebase hosting:sites:get "$SITE" --project "$PROJECT" >/dev/null 2>&1; then
  echo "Este site nao esta cadastrado neste projeto. Primeiro execute: bash scripts/firebase-endereco-curto.sh reservar $SITE"
  exit 1
fi
CONFIG=".firebase-hosting-curto.generated.json"
if [[ -e "$CONFIG" ]]; then
  echo "Configuracao temporaria ja existe: $CONFIG. Verifique-a e remova-a manualmente antes de continuar."
  exit 2
fi
trap 'rm -f "$CONFIG"' EXIT
firebase target:apply hosting "$TARGET" "$SITE" --project "$PROJECT"
node - "$CONFIG" "$TARGET" <<'NODE'
const fs = require('node:fs');
const [output, target] = process.argv.slice(2);
const original = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
if (!original.hosting || Array.isArray(original.hosting) || original.hosting.public !== 'web') {
  throw new Error('Config original inesperada; abortando para proteger o site padrao.');
}
original.hosting = {...original.hosting, target};
delete original.hosting.site;
fs.writeFileSync(output, JSON.stringify(original, null, 2) + '\n');
NODE
echo "Verificando testes da branch antes de publicar..."
npm run check
echo "Publicando EXCLUSIVAMENTE no site adicional ${SITE}; site padrao ${PROJECT} nao sera modificado."
firebase deploy --config "$CONFIG" --only "hosting:${TARGET}" --project "$PROJECT"
echo "Endereco publico do novo site: https://${SITE}.web.app"
echo "IMPORTANTE: cadastre esta URL exata em Supabase Auth > URL Configuration > Redirect URLs."
