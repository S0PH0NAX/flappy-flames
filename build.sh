#!/bin/bash
# Bundles index.html + src/style.css + src/js/*.js into one self-contained
# khaleesi0900-bundle.html (for GitHub Pages / PWABuilder).
# Zero dependencies: stock macOS bash + sed. Run: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

IN=index.html
OUT=khaleesi0900-bundle.html
TMP="$OUT.tmp"

: > "$TMP"
while IFS= read -r line || [ -n "$line" ]; do
  if [[ "$line" =~ \<link\ rel=\"stylesheet\"\ href=\"(src/[^\"]+\.css)\"\> ]]; then
    css="${BASH_REMATCH[1]}"
    [ -f "$css" ] || { echo "Missing $css" >&2; exit 1; }
    {
      echo "  <style>"
      # CSS lives in src/, so ../assets/ must become assets/ once inlined at the root.
      sed 's#\.\./assets/#assets/#g' "$css"
      echo "  </style>"
    } >> "$TMP"
  elif [[ "$line" =~ \<script\ src=\"(src/js/[^\"]+\.js)\"\>\</script\> ]]; then
    js="${BASH_REMATCH[1]}"
    [ -f "$js" ] || { echo "Missing $js" >&2; exit 1; }
    if grep -qi '</script' "$js"; then echo "$js contains </script; cannot inline safely" >&2; exit 1; fi
    {
      echo "<script>"
      cat "$js"
      echo "</script>"
    } >> "$TMP"
  else
    printf '%s\n' "$line" >> "$TMP"
  fi
done < "$IN"

mv "$TMP" "$OUT"
echo "Built $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
