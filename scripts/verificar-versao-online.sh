#!/usr/bin/env bash
# Diagnóstico somente leitura do frontend publicado. NÃO altera Hosting ou dados.
set -euo pipefail
URL="${1:-https://uselumo.web.app/}"
case "$URL" in
  https://*.web.app/|https://*.firebaseapp.com/) ;;
  *) echo 'Use a URL HTTPS do Firebase terminada em / (ex.: https://uselumo.web.app/)'; exit 2;;
esac
temp="$(mktemp)"
trap 'rm -f "$temp"' EXIT
echo "Consultando ${URL}"
curl --fail --silent --show-error --location -H 'Cache-Control: no-cache' "${URL}?__lumo_versao=20261122" -o "$temp"
echo "Arquivo recebido: $(wc -c < "$temp") bytes"
python3 - "$temp" <<'PY'
from pathlib import Path
import sys, hashlib
s=Path(sys.argv[1]).read_text(encoding="utf-8",errors="replace")
sha=hashlib.sha256(s.encode()).hexdigest()
signature = {
  "beta-reduzida": 'id="mainStage"' in s and 'id="loginStage"' in s,
  "restauracao-v1.7": 'experience-auth.mjs' in s and 'lumo-identity-gate' in s,
  "original-v1.7-sem-login": 'data-action="onboard-skip"' in s and 'experience-auth.mjs' not in s,
}
print("SHA-256 HTML:",sha)
for label,value in signature.items():
    print(f"Marca {label}: {'SIM' if value else 'NAO'}")
for label,marker in {
  "onboarding": 'onboard-skip',
  "5-abas": 'data-to="history"',
  "mascotes": 'mascot-svg',
  "scanner": 'startScanner',
  "modulo-supabase": 'experience-sync.mjs'
}.items():
    print(f"Codigo {label}: {'PRESENTE' if marker in s else 'NAO IDENTIFICADO'}")
if signature["beta-reduzida"]:
    print("RESULTADO: O site ainda mostra a interface reduzida. Verificar site/target do deploy.")
elif signature["restauracao-v1.7"]:
    print("RESULTADO: O site entregou o HTML restaurado de v1.7. Falta integrar a ultima arvore Windows.")
else:
    print("RESULTADO: HTML inesperado. Nao assumir que a versao correta foi publicada.")
PY
