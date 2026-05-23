#!/usr/bin/env bash
# Walk every markdown file under docs/ + repo root + service/package READMEs,
# extract relative links + anchors, verify each target exists.
#
# Skip:
#   - http(s) URLs (no network in CI)
#   - mailto: / tel:
#   - Pure anchors within the same doc (best-effort; we don't parse heading slugs)
#
# Exit 1 on any broken link.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BROKEN=0
TOTAL=0

# Files to scan
mapfile -t FILES < <(find "$ROOT" \
  \( -path "*/node_modules/*" -o -path "*/dist/*" -o -path "*/.git/*" -o -path "*/.turbo/*" -o -path "*/target/*" \) -prune -o \
  -type f -name "*.md" -print)

for f in "${FILES[@]}"; do
  dir="$(dirname "$f")"
  # Extract [text](target) where target doesn't start with http or #
  while IFS= read -r link; do
    # Strip query/anchor from target
    target="${link%%#*}"
    [ -z "$target" ] && continue
    case "$target" in
      http*|mailto:*|tel:*|//*|"") continue ;;
    esac
    TOTAL=$((TOTAL + 1))
    # Resolve relative to the file's directory
    if [[ "$target" == /* ]]; then
      resolved="$ROOT$target"
    else
      resolved="$dir/$target"
    fi
    if [ ! -e "$resolved" ]; then
      echo "BROKEN: $f → $link  (resolved: $resolved)"
      BROKEN=$((BROKEN + 1))
    fi
  done < <(grep -oE '\]\([^)]+\)' "$f" | sed -E 's/^\]\(([^)]+)\)$/\1/' | grep -v -E '^https?:|^mailto:|^tel:|^#')
done

echo "---"
echo "Checked $TOTAL relative links across ${#FILES[@]} markdown files"
if [ "$BROKEN" -gt 0 ]; then
  echo "FAIL: $BROKEN broken link(s)"
  exit 1
fi
echo "PASS"
