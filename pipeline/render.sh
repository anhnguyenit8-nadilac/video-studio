#!/usr/bin/env bash
# Usage: pipeline/render.sh <brief.json> [slug-output-dir]
# Brief -> project -> check -> render MP4.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRIEF="$1"
PROJ="${2:-}"
export HYPERFRAMES_BROWSER_PATH="${HYPERFRAMES_BROWSER_PATH:-/usr/bin/google-chrome}"
HF="npx -y hyperframes@0.9.40"

INFO=$(node "$ROOT/pipeline/build.mjs" "$BRIEF" ${PROJ:+"$PROJ"})
DIR=$(node -e 'console.log(JSON.parse(process.argv[1]).outDir)' "$INFO")
echo "Project: $DIR"
cd "$DIR"
mkdir -p .hyperframes
$HF check --json > .hyperframes/last-check.json 2>/dev/null || true
node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(!d.ok){console.error("check thất bại, xem .hyperframes/last-check.json"); process.exit(1)} console.log("check: ok")' "$DIR/.hyperframes/last-check.json"
$HF render --output "$DIR.mp4" 2>/dev/null
echo "MP4: $DIR.mp4"
