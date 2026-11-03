#!/usr/bin/env bash
# Gelişim'in saf modüllerindeki console.assert denetimlerini koşar.
# Modüller geçici bir klasöre CommonJS olarak derlenir, geliştirme modunda yüklenir;
# herhangi bir "Assertion failed" ya da yükleme hatası 1 ile çıkar.
# Kullanım: bash scripts/check-gelisim.sh [modül...]   (varsayılan: hepsi)
set -u
cd "$(dirname "$0")/.."
MODULES=("$@")
[ ${#MODULES[@]} -eq 0 ] && MODULES=(combat-stats equipment combat room castle)
OUT="$(mktemp -d)"; command -v cygpath >/dev/null && OUT="$(cygpath -m "$OUT")"
trap 'rm -rf "$OUT"' EXIT
FILES=()
for m in "${MODULES[@]}"; do [ -f "lib/$m.ts" ] && FILES+=("lib/$m.ts") || { echo "EKSİK: lib/$m.ts"; exit 1; }; done
npx tsc "${FILES[@]}" --outDir "$OUT" --module commonjs --target es2022 --skipLibCheck --esModuleInterop >"$OUT/tsc.log" 2>&1 || { cat "$OUT/tsc.log"; exit 1; }
echo '{"type":"commonjs"}' > "$OUT/package.json"
fail=0
for m in "${MODULES[@]}"; do
  res="$(NODE_ENV=development node -e "require('$OUT/$m.js')" 2>&1)"
  code=$?
  if [ $code -ne 0 ] || grep -q "Assertion failed" <<<"$res"; then echo "FAIL $m"; echo "$res" | head -20; fail=1; else echo "ok   $m"; fi
done
exit $fail
