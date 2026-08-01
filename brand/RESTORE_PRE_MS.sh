#!/bin/sh
# Restore UI from pre-MS Inteligência snapshot
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="$ROOT/brand/snapshot-pre-ms-inteligencia"
cp "$SNAP/styles.css" "$ROOT/src/styles.css"
cp "$SNAP/app-shell.tsx" "$ROOT/src/components/app-shell.tsx"
cp "$SNAP/__root.tsx" "$ROOT/src/routes/__root.tsx"
cp "$SNAP/home-alerts.tsx" "$ROOT/src/components/caixa/home-alerts.tsx"
cp "$SNAP/rede-dashboard.tsx" "$ROOT/src/components/caixa/rede-dashboard.tsx"
cp "$SNAP/button.tsx" "$ROOT/src/components/ui/button.tsx"
cp "$SNAP/badge.tsx" "$ROOT/src/components/ui/badge.tsx"
cp "$SNAP/card.tsx" "$ROOT/src/components/ui/card.tsx"
echo "Restored pre-MS Inteligência UI from brand/snapshot-pre-ms-inteligencia/"
