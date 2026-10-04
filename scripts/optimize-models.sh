#!/usr/bin/env bash
# Otimização OPCIONAL dos modelos (compressão meshopt, sem alterar a aparência).
# Uso: npm run optimize-models
# Os originais ficam em public/models/.original/ (fora do build).
set -euo pipefail
cd "$(dirname "$0")/.."

shopt -s globstar nullglob
files=(public/models/**/*.glb)
if [ ${#files[@]} -eq 0 ]; then
  echo "Nenhum .glb em public/models — extraia assets_kaykit.zip primeiro."
  exit 0
fi

for f in "${files[@]}"; do
  case "$f" in *"/.original/"*) continue ;; esac
  backup="public/models/.original/${f#public/models/}"
  mkdir -p "$(dirname "$backup")"
  [ -f "$backup" ] || cp "$f" "$backup"
  before=$(stat -c%s "$backup")
  # Sem simplificar geometria nem reamostrar animações agressivamente: só meshopt + dedupe.
  npx --yes @gltf-transform/cli@4 meshopt "$backup" "$f" --level medium >/dev/null
  after=$(stat -c%s "$f")
  echo "$f: $((before / 1024)) KB -> $((after / 1024)) KB"
done
